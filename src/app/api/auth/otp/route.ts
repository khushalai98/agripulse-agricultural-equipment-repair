import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient, type User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const STATE_COOKIE = "yantriq_msg91_email_otp";
const OTP_TTL_SECONDS = 15 * 60;
const RESEND_SECONDS = 10;
const MSG91_WIDGET_API = "https://control.msg91.com/api/v5/widget";

interface Msg91Diagnostic {
  httpStatus: number;
  type: string;
  code: string;
  message: string;
  body: string;
}

class Msg91RequestError extends Error {
  constructor(readonly diagnostic: Msg91Diagnostic) {
    super("MSG91 rejected the request.");
  }
}

class LocalAuthError extends Error {
  constructor(readonly code: string, message: string, readonly provider?: Msg91Diagnostic) {
    super(message);
  }
}

interface OtpState {
  email: string;
  reqId: string;
  expiresAt: number;
  lastSentAt: number;
}

interface ProfileInput {
  name?: unknown;
  phone?: unknown;
  address?: {
    villageOrCity?: unknown;
    district?: unknown;
    state?: unknown;
    pinCode?: unknown;
  };
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function requiredConfig() {
  const authKey = process.env.MSG91_AUTH_KEY;
  const widgetId = process.env.MSG91_WIDGET_ID;
  if (!authKey || !widgetId) {
    throw new Error("MSG91 authentication configuration is missing.");
  }
  return { authKey, widgetId };
}

function requiredSupabaseConfig(config: ReturnType<typeof requiredConfig>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !serviceRoleKey) {
    throw new Error("Supabase authentication configuration is missing.");
  }
  return { ...config, url, publishableKey, serviceRoleKey };
}

function sanitizeDiagnosticText(value: unknown, authKey: string): string {
  if (typeof value !== "string") return "";
  return value
    .replaceAll(authKey, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?\b/g, "[redacted-token]")
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/g, "[redacted-key]")
    .replace(/["']?(access[-_ ]?token|token[-_ ]?auth|auth[-_ ]?token|token|authkey|authorization|cookie|otp|reqid|req_id|api[-_ ]?key|secret)["']?\s*[:=]\s*["']?[^,"'\s}]+["']?/gi, "$1=[redacted]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\b[a-f0-9]{24,}\b/gi, "[redacted-id]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b\d{4,8}\b/g, "[redacted-number]")
    .slice(0, 500);
}

function makeMsg91Diagnostic(
  httpStatus: number,
  data: Record<string, unknown> | null,
  rawBody: string,
  authKey: string,
  redactPossibleReqId = false
): Msg91Diagnostic {
  const type = typeof data?.type === "string" ? data.type.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) : "unknown";
  const code = typeof data?.code === "string" || typeof data?.code === "number"
    ? String(data.code).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)
    : "unknown";
  const rawMessage = data?.error ?? data?.description ?? data?.message;
  const message = redactPossibleReqId && typeof rawMessage === "string"
    ? "Successful Widget message omitted because it may contain reqId."
    : sanitizeDiagnosticText(rawMessage, authKey) || "No provider message returned.";
  // Include only non-secret diagnostic fields; do not echo reqId, OTP, tokens, or arbitrary fields.
  const body = data
    ? JSON.stringify({
        ...(type !== "unknown" ? { type } : {}),
        ...(code !== "unknown" ? { code } : {}),
        ...(typeof data.hasError === "boolean" ? { hasError: data.hasError } : {}),
        ...(rawMessage !== undefined ? { message } : {}),
      })
    : JSON.stringify({ response: sanitizeDiagnosticText(rawBody, authKey) || "Unreadable or empty response body." });
  return { httpStatus, type, code, message, body: body.slice(0, 1200) };
}

function signState(state: OtpState, authKey: string): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signature = createHmac("sha256", authKey).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function readState(req: NextRequest, authKey: string): OtpState | null {
  const value = req.cookies.get(STATE_COOKIE)?.value;
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = value.slice(0, separator);
  const suppliedSignature = Buffer.from(value.slice(separator + 1));
  const expectedSignature = Buffer.from(createHmac("sha256", authKey).update(payload).digest("base64url"));
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OtpState;
    if (
      !normalizeEmail(parsed.email) ||
      typeof parsed.reqId !== "string" ||
      parsed.reqId.length < 1 ||
      parsed.reqId.length > 2048 ||
      !Number.isFinite(parsed.expiresAt) ||
      !Number.isFinite(parsed.lastSentAt) ||
      parsed.expiresAt <= Date.now()
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function msg91Post(
  path: string,
  authKey: string,
  body: Record<string, string>,
  authKeyPlacement: "header" | "body" = "header"
): Promise<Record<string, unknown> & { _httpStatus: number }> {
  const requestBody = authKeyPlacement === "body" ? { ...body, authkey: authKey } : body;
  const response = await fetch(`${MSG91_WIDGET_API}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authKeyPlacement === "header" ? { authkey: authKey } : {}),
    },
    body: JSON.stringify(requestBody),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  const rawBody = await response.text();
  let result: unknown;
  try {
    result = JSON.parse(rawBody);
  } catch {
    throw new Msg91RequestError(makeMsg91Diagnostic(response.status, null, rawBody, authKey));
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Msg91RequestError(makeMsg91Diagnostic(response.status, null, rawBody, authKey));
  }
  const data = result as Record<string, unknown>;
  if (!response.ok || data.type !== "success" || data.hasError === true || data.code === 201 || data.code === "201") {
    throw new Msg91RequestError(makeMsg91Diagnostic(response.status, data, rawBody, authKey));
  }
  return { ...data, _httpStatus: response.status };
}

function setStateCookie(response: NextResponse, value: string, maxAge: number) {
  response.cookies.set(STATE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function createAdminClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string): Promise<User | null> {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Supabase user lookup failed.");
    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Supabase user lookup exceeded its safety bound.");
}

async function mapAuthenticatedProfile(
  req: NextRequest,
  config: ReturnType<typeof requiredSupabaseConfig>,
  email: string,
  isSignup: boolean,
  registration: ProfileInput | undefined,
  cookieChanges: Array<{ name: string; value: string; options?: any }>
) {
  const admin = createAdminClient(config.url, config.serviceRoleKey);
  let user = await findUserByEmail(admin, email);
  let created = false;
  const safeName = typeof registration?.name === "string" ? registration.name.trim().slice(0, 120) : "";
  const rawPhone = typeof registration?.phone === "string" ? registration.phone.replace(/\D/g, "") : "";
  const phone = rawPhone.length === 12 && rawPhone.startsWith("91") ? rawPhone.slice(2) : rawPhone;
  if (phone && !/^[6-9]\d{9}$/.test(phone)) throw new Error("Invalid profile details.");
  const address = registration?.address;
  const profileFields = {
    full_name: safeName || null,
    phone: phone || null,
    village_city: typeof address?.villageOrCity === "string" ? address.villageOrCity.trim().slice(0, 120) || null : null,
    district: typeof address?.district === "string" ? address.district.trim().slice(0, 120) || null : null,
    state: typeof address?.state === "string" ? address.state.trim().slice(0, 120) || null : null,
    pin_code: typeof address?.pinCode === "string" ? address.pinCode.replace(/\D/g, "").slice(0, 6) || null : null,
  };

  if (!user) {
    if (!isSignup || !safeName || !phone || !profileFields.village_city || !profileFields.district || !profileFields.state || !/^\d{6}$/.test(profileFields.pin_code || "")) {
      throw new Error("Complete farmer registration details are required.");
    }
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: profileFields.full_name, phone: profileFields.phone },
    });
    if (error || !data.user) {
      user = await findUserByEmail(admin, email);
      if (!user) throw new Error("Supabase user creation failed.");
    } else {
      user = data.user;
      created = true;
    }
  }
  if (!user.email_confirmed_at) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
    if (error || !data.user) throw new Error("Supabase email confirmation failed.");
    user = data.user;
  }

  const { data: existingProfile, error: profileReadError } = await admin
    .from("profiles")
    .select("id, role, full_name, phone, village_city, district, state, pin_code")
    .eq("id", user.id)
    .maybeSingle();
  if (profileReadError) throw new Error("Supabase profile lookup failed.");
  if (created) {
    const { error } = await admin.from("profiles").upsert(
      { id: user.id, role: "farmer", ...profileFields },
      { onConflict: "id" }
    );
    if (error) throw new Error("Supabase profile creation failed.");
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) throw new Error("Supabase sign-in token generation failed.");

  const sessionClient = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet) { cookieChanges.push(...cookiesToSet); },
    },
  });
  const { data: authData, error: sessionError } = await sessionClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (sessionError || !authData.session || !authData.user || authData.user.id !== user.id) {
    throw new Error("Supabase session exchange failed.");
  }

  const { data: profile, error: sessionProfileError } = await sessionClient
    .from("profiles")
    .select("id, role, full_name, phone, village_city, district, state, pin_code")
    .eq("id", authData.user.id)
    .single();
  if (sessionProfileError || !profile) throw new Error("Authenticated profile lookup failed.");

  const role = profile.role === "technician" ? "technician" : "farmer";
  const name = profile.full_name || email;
  const userProfile = {
    id: profile.id,
    email: authData.user.email || email,
    phone: profile.phone || "",
    role,
    name,
    nameHi: name,
    isNewUser: created,
    address: {
      villageOrCity: profile.village_city || "",
      district: profile.district || "",
      state: profile.state || "",
      pinCode: profile.pin_code || undefined,
    },
    villageOrArea: [profile.village_city, profile.district].filter(Boolean).join(", "),
  };
  return {
    token: "",
    user: userProfile,
    createdAt: new Date().toISOString(),
    expiresAt: new Date((authData.session.expires_at || Math.floor(Date.now() / 1000 + 3600)) * 1000).toISOString(),
    isNewUser: created,
    requestedSignup: isSignup,
  };
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
  }

  let config: ReturnType<typeof requiredConfig>;
  try {
    config = requiredConfig();
  } catch {
    return NextResponse.json({ success: false, error: "auth_not_configured" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "send") {
      const email = normalizeEmail(body?.email);
      if (!email) return NextResponse.json({ success: false, error: "invalid_email" }, { status: 400 });
      const response = await msg91Post("sendOtp", config.authKey, { widgetId: config.widgetId, identifier: email });
      const reqId = typeof response.message === "string" ? response.message : typeof response.reqId === "string" ? response.reqId : "";
      if (!reqId || reqId.length > 2048) {
        const diagnostic = makeMsg91Diagnostic(
          Number(response._httpStatus) || 0,
          response,
          JSON.stringify(response),
          config.authKey,
          true
        );
        throw new LocalAuthError("reqid_missing", "The successful MSG91 response did not include a usable reqId.", diagnostic);
      }
      const state: OtpState = { email, reqId, expiresAt: Date.now() + OTP_TTL_SECONDS * 1000, lastSentAt: Date.now() };
      const result = NextResponse.json({
        success: true,
        expiresInSeconds: OTP_TTL_SECONDS,
        resendAfterSeconds: RESEND_SECONDS,
        provider: { httpStatus: response._httpStatus, type: response.type },
      });
      setStateCookie(result, signState(state, config.authKey), OTP_TTL_SECONDS);
      return result;
    }

    if (action === "resend") {
      const state = readState(req, config.authKey);
      if (!state) return NextResponse.json({ success: false, error: "otp_expired" }, { status: 400 });
      const waitSeconds = Math.max(0, Math.ceil((state.lastSentAt + RESEND_SECONDS * 1000 - Date.now()) / 1000));
      if (waitSeconds > 0) return NextResponse.json({ success: false, error: "resend_too_soon", retryAfterSeconds: waitSeconds }, { status: 429 });
      await msg91Post("retryOtp", config.authKey, { widgetId: config.widgetId, reqId: state.reqId });
      const updated = { ...state, lastSentAt: Date.now() };
      const result = NextResponse.json({ success: true, resendAfterSeconds: RESEND_SECONDS, expiresInSeconds: Math.max(0, Math.floor((state.expiresAt - Date.now()) / 1000)) });
      setStateCookie(result, signState(updated, config.authKey), Math.max(1, Math.floor((state.expiresAt - Date.now()) / 1000)));
      return result;
    }

    if (action === "verify") {
      const state = readState(req, config.authKey);
      if (!state) return NextResponse.json({ success: false, error: "otp_expired" }, { status: 400 });
      const otp = typeof body?.otp === "string" ? body.otp : "";
      if (!/^\d{4}$/.test(otp)) return NextResponse.json({ success: false, error: "invalid_otp" }, { status: 400 });

      const verification = await msg91Post("verifyOtp", config.authKey, { widgetId: config.widgetId, reqId: state.reqId, otp });
      const accessToken = typeof verification.message === "string" ? verification.message : "";
      if (!accessToken || accessToken.length > 20000) return NextResponse.json({ success: false, error: "otp_verification_failed" }, { status: 401 });
      const verified = await msg91Post("verifyAccessToken", config.authKey, { "access-token": accessToken }, "body");
      const verifiedEmail = normalizeEmail(verified.message);
      if (!verifiedEmail || verifiedEmail !== state.email) {
        return NextResponse.json({ success: false, error: "verified_email_mismatch" }, { status: 401 });
      }

      const cookieChanges: Array<{ name: string; value: string; options?: any }> = [];
      const supabaseConfig = requiredSupabaseConfig(config);
      const session = await mapAuthenticatedProfile(
        req,
        supabaseConfig,
        verifiedEmail,
        body?.mode === "register",
        body?.registrationDetails as ProfileInput | undefined,
        cookieChanges
      );
      const result = NextResponse.json({ success: true, session, isNewUser: session.isNewUser });
      for (const cookie of cookieChanges) result.cookies.set(cookie.name, cookie.value, cookie.options);
      clearStateCookie(result);
      return result;
    }

    return NextResponse.json({ success: false, error: "invalid_action" }, { status: 400 });
  } catch (error) {
    const diagnosticsEnabled = process.env.NODE_ENV !== "production";
    if (error instanceof Msg91RequestError) {
      return NextResponse.json({
        success: false,
        error: "msg91_request_failed",
        ...(diagnosticsEnabled ? {
          diagnostics: {
            local: { code: "msg91_rejected", message: "MSG91 rejected the request; see sanitized provider details." },
            msg91: error.diagnostic,
          },
        } : {}),
      }, { status: 502 });
    }
    const localCode = error instanceof LocalAuthError ? error.code : "authentication_failed";
    const localMessage = error instanceof Error ? sanitizeDiagnosticText(error.message, config.authKey) : "Unexpected authentication error.";
    const msg91Summary = error instanceof LocalAuthError ? error.provider : undefined;
    return NextResponse.json({
      success: false,
      error: localCode === "authentication_failed" ? "authentication_failed" : localCode,
      ...(diagnosticsEnabled ? {
        diagnostics: {
          local: { code: localCode, message: localMessage || "No local error message." },
          ...(msg91Summary ? { msg91: msg91Summary } : {}),
        },
      } : {}),
    }, { status: 502 });
  }
}
