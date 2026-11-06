/** Supabase-backed authentication helpers for the YANTRIQ client. */

export type UserRole = "farmer" | "technician" | "FARMER" | "TECHNICIAN";

export function isTechnicianRole(role?: string): boolean {
  return role?.trim().toLowerCase() === "technician" || role?.trim().toLowerCase() === "tech";
}

export function isFarmerRole(role?: string): boolean {
  return role?.trim().toLowerCase() === "farmer";
}

export function normalizeRole(role?: string): "farmer" | "technician" {
  return isTechnicianRole(role) ? "technician" : "farmer";
}

export interface UserAddress {
  villageOrCity: string;
  district: string;
  state: string;
  pinCode?: string;
}

export interface RegistrationInput {
  name: string;
  phone?: string;
  address?: UserAddress;
}

export interface AuthUser {
  id: string;
  email?: string;
  phone: string;
  role: UserRole;
  name: string;
  nameHi: string;
  villageOrArea?: string;
  address?: UserAddress;
  isNewUser: boolean;
  avatarIcon?: string;
  rating?: number;
  skills?: string[];
  serviceArea?: string;
  available?: boolean;
  machinesLinked?: string[];
  location?: { latitude: number; longitude: number; village?: string; district?: string; state?: string };
  createdAt?: string;
  updatedAt?: string;
}

/** UI profile snapshot only; Supabase session credentials are kept in HttpOnly cookies. */
export interface AuthSession {
  user: AuthUser;
  createdAt: string;
  expiresAt: string;
}

export interface OtpRequestResult {
  success: boolean;
  messageHi: string;
  messageEn: string;
  phone: string;
  role: UserRole;
  expiresInSeconds?: number;
  isExistingUser: boolean;
  error?: string;
  retryAfterSeconds?: number;
  diagnostics?: OtpRequestDiagnostics;
}

export interface OtpRequestDiagnostics {
  local?: { code?: string; message?: string };
  msg91?: { httpStatus?: number; type?: string; code?: string; message?: string };
}

export interface OtpVerifyResult {
  success: boolean;
  session?: AuthSession;
  messageHi: string;
  messageEn: string;
  isNewUser?: boolean;
  error?: string;
}

export function isValidIndianMobileNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

export function cleanPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length === 12 && cleaned.startsWith("91") ? cleaned.slice(2) : cleaned;
}

function isValidEmail(email: string): boolean {
  return email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function localizedError(error: string | undefined, fallbackHi: string, fallbackEn: string) {
  if (error === "resend_too_soon") return { hi: "कृपया OTP दोबारा भेजने से पहले कुछ सेकंड प्रतीक्षा करें।", en: "Please wait before requesting another code." };
  if (error === "otp_expired") return { hi: "OTP की समय सीमा समाप्त हो गई है। कृपया नया OTP मंगाएं।", en: "The code expired. Please request a new one." };
  if (error === "invalid_email") return { hi: "कृपया मान्य ईमेल पता दर्ज करें।", en: "Enter a valid email address." };
  return { hi: fallbackHi, en: fallbackEn };
}

function sanitizeDiagnosticMessage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const sanitized = value
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?\b/g, "[redacted-token]")
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/gi, "[redacted-key]")
    .replace(/(["']?(?:authkey|access[-_ ]?token|tokenauth|token|authorization|cookie|set-cookie|otp|reqid|req_id|email|secret)["']?\s*[:=]\s*["']?)[^,"'\s}]+/gi, "$1[redacted]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b\+?\d[\d .()-]{7,}\d\b/g, "[redacted-number]")
    .replace(/\b[a-f0-9]{24,}\b/gi, "[redacted-id]")
    .replace(/\b\d{4,8}\b/g, "[redacted-number]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 300)
    .trim();
  return sanitized || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOtpDiagnostics(value: unknown): OtpRequestDiagnostics | undefined {
  if (!isRecord(value)) return undefined;

  const diagnostics: OtpRequestDiagnostics = {};
  if (isRecord(value.local)) {
    const code = typeof value.local.code === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(value.local.code)
      ? value.local.code
      : undefined;
    const message = sanitizeDiagnosticMessage(value.local.message);
    if (code || message) diagnostics.local = { code, message };
  }
  if (isRecord(value.msg91)) {
    const status = typeof value.msg91.httpStatus === "number" && Number.isInteger(value.msg91.httpStatus)
      && value.msg91.httpStatus >= 100 && value.msg91.httpStatus <= 599
      ? value.msg91.httpStatus
      : undefined;
    const type = typeof value.msg91.type === "string" && /^[a-zA-Z0-9_-]{1,32}$/.test(value.msg91.type)
      ? value.msg91.type
      : undefined;
    const code = (typeof value.msg91.code === "string" || typeof value.msg91.code === "number")
      && /^[a-zA-Z0-9_-]{1,32}$/.test(String(value.msg91.code))
      ? String(value.msg91.code)
      : undefined;
    const message = sanitizeDiagnosticMessage(value.msg91.message);
    if (status || type || code || message) diagnostics.msg91 = { httpStatus: status, type, code, message };
  }

  return diagnostics.local || diagnostics.msg91 ? diagnostics : undefined;
}

export async function requestOtp(email: string): Promise<OtpRequestResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return { success: false, phone: normalizedEmail, role: "farmer", isExistingUser: false, error: "invalid_email", messageHi: "कृपया मान्य ईमेल पता दर्ज करें।", messageEn: "Enter a valid email address." };
  }
  try {
    const response = await fetch("/api/auth/otp", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", email: normalizedEmail }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      const copy = localizedError(data.error, "ईमेल पर OTP भेजा नहीं जा सका। कृपया पुनः प्रयास करें।", "Could not send the email code. Please try again.");
      return { success: false, phone: normalizedEmail, role: "farmer", isExistingUser: false, error: data.error || "otp_send_failed", retryAfterSeconds: data.retryAfterSeconds, diagnostics: readOtpDiagnostics(data.diagnostics), messageHi: copy.hi, messageEn: copy.en };
    }
    return { success: true, phone: normalizedEmail, role: "farmer", isExistingUser: false, expiresInSeconds: data.expiresInSeconds, messageHi: `OTP ${normalizedEmail} पर भेजा गया है।`, messageEn: `A verification code was sent to ${normalizedEmail}.` };
  } catch {
    return { success: false, phone: normalizedEmail, role: "farmer", isExistingUser: false, error: "network_error", messageHi: "नेटवर्क त्रुटि: कृपया इंटरनेट कनेक्शन जांचें।", messageEn: "Network error. Please check your connection." };
  }
}

export async function resendOtp(): Promise<OtpRequestResult> {
  try {
    const response = await fetch("/api/auth/otp", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend" }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      const copy = localizedError(data.error, "OTP दोबारा भेजा नहीं जा सका।", "Could not resend the verification code.");
      return { success: false, phone: "", role: "farmer", isExistingUser: false, error: data.error || "otp_resend_failed", retryAfterSeconds: data.retryAfterSeconds, messageHi: copy.hi, messageEn: copy.en };
    }
    return { success: true, phone: "", role: "farmer", isExistingUser: false, expiresInSeconds: data.expiresInSeconds, messageHi: "OTP दोबारा भेज दिया गया है।", messageEn: "The verification code was resent." };
  } catch {
    return { success: false, phone: "", role: "farmer", isExistingUser: false, error: "network_error", messageHi: "नेटवर्क त्रुटि: कृपया इंटरनेट कनेक्शन जांचें।", messageEn: "Network error. Please try again." };
  }
}

export async function verifyOtp(
  _email: string,
  _role: UserRole,
  enteredOtp: string,
  registrationDetails?: RegistrationInput,
  mode: "register" | "login" = "register"
): Promise<OtpVerifyResult> {
  const otp = enteredOtp.replace(/\D/g, "");
  if (!/^\d{4}$/.test(otp)) {
    return { success: false, error: "invalid_format", messageHi: "कृपया 4 अंकों का OTP दर्ज करें।", messageEn: "Enter the 4-digit verification code." };
  }
  try {
    const response = await fetch("/api/auth/otp", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", otp, mode, registrationDetails }),
    });
    const data = await response.json();
    if (!response.ok || !data.success || !data.session?.user) {
      const copy = localizedError(data.error, "OTP सत्यापन विफल हुआ। कृपया कोड जांचें और पुनः प्रयास करें।", "Verification failed. Check the code and try again.");
      return { success: false, error: data.error || "verification_failed", messageHi: copy.hi, messageEn: copy.en };
    }
    return { success: true, session: data.session, isNewUser: data.isNewUser === true, messageHi: `नमस्ते, ${data.session.user.name} 👋`, messageEn: "Login successful." };
  } catch {
    return { success: false, error: "network_error", messageHi: "नेटवर्क त्रुटि: कृपया इंटरनेट कनेक्शन जांचें।", messageEn: "Network error. Please try again." };
  }
}

export async function fetchCurrentAuthProfile(): Promise<{ success: boolean; user?: AuthUser; role?: string; error?: string }> {
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json();
    return response.ok && data.success
      ? { success: true, user: data.user, role: data.role || data.user?.role }
      : { success: false, error: response.status === 401 ? "http_401" : `http_${response.status}` };
  } catch {
    return { success: false, error: "network_error" };
  }
}

/** There is no local-storage session fallback; the authenticated session is HttpOnly-cookie based. */
export function getStoredSession(): AuthSession | null {
  return null;
}

export async function clearStoredSession(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    // The UI still leaves the authenticated area; the server cookie expires independently.
  }
  try {
    localStorage.removeItem("agripulse_auth_session_v1");
    localStorage.removeItem("agripulse_active_otp_v1");
    localStorage.removeItem("agripulse_registered_users_v1");
  } catch {
    // Storage may be unavailable.
  }
}

export async function registerNewTechnician(): Promise<OtpVerifyResult> {
  return { success: false, error: "technician_role_not_self_assignable", messageHi: "टेक्नीशियन खाते केवल अधिकृत प्रक्रिया से बनाए जाते हैं।", messageEn: "Technician accounts require an authorized role assignment." };
}

export async function verifyBackendAuthorization(_token: string, expectedRole: UserRole): Promise<{ authorized: boolean; message?: string }> {
  const result = await fetchCurrentAuthProfile();
  return { authorized: result.success && !!result.role && normalizeRole(result.role) === normalizeRole(expectedRole), message: result.success ? undefined : result.error };
}
