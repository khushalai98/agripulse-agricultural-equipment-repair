"use client";

import React, { useEffect, useState } from "react";
import { AuthSession, RegistrationInput, requestOtp, resendOtp, verifyOtp } from "@/services/authService";
import type { OtpRequestDiagnostics } from "@/services/authService";
import { LanguageCode, SUPPORTED_LANGUAGES } from "@/i18n";

interface LoginScreenProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onLoginSuccess: (session: AuthSession) => void;
  onBackToWelcome?: () => void;
}

function formatOtpDiagnostics(diagnostics: OtpRequestDiagnostics): string {
  const details: string[] = [];
  if (diagnostics.local?.code) details.push(`Local code: ${diagnostics.local.code}`);
  if (diagnostics.msg91?.httpStatus) details.push(`MSG91 HTTP ${diagnostics.msg91.httpStatus}`);
  if (diagnostics.msg91?.type) details.push(`type: ${diagnostics.msg91.type}`);
  if (diagnostics.msg91?.code) details.push(`code: ${diagnostics.msg91.code}`);
  if (diagnostics.msg91?.message) details.push(diagnostics.msg91.message);
  else if (diagnostics.local?.message) details.push(diagnostics.local.message);
  return details.join(" · ");
}

export default function LoginScreen({ currentLanguage, onLanguageChange, onLoginSuccess, onBackToWelcome }: LoginScreenProps) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [villageOrCity, setVillageOrCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [otpDiagnostic, setOtpDiagnostic] = useState("");
  const [message, setMessage] = useState("");
  const showAuthDiagnostics = process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (!resendIn) return;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const send = async () => {
    setError(""); setMessage(""); setOtpDiagnostic("");
    if (mode === "register" && (!name.trim() || !phone.trim() || !villageOrCity.trim() || !district.trim() || !state.trim() || !/^\d{6}$/.test(pinCode))) {
      setError("कृपया नाम, मोबाइल नंबर और पूरा पता भरें। PIN कोड 6 अंकों का होना चाहिए।"); return;
    }
    setBusy(true);
    const result = await requestOtp(email);
    setBusy(false);
    if (!result.success) {
      setError(result.messageHi);
      if (showAuthDiagnostics && result.diagnostics) setOtpDiagnostic(formatOtpDiagnostics(result.diagnostics));
      setResendIn(result.retryAfterSeconds || 0);
      return;
    }
    setOtpSent(true); setResendIn(10); setMessage(result.messageHi);
  };

  const resend = async () => {
    setBusy(true); setError("");
    const result = await resendOtp();
    setBusy(false);
    if (!result.success) { setError(result.messageHi); setResendIn(result.retryAfterSeconds || 0); return; }
    setResendIn(10); setMessage(result.messageHi);
  };

  const verify = async () => {
    setBusy(true); setError("");
    const details: RegistrationInput | undefined = mode === "register" ? {
      name: name.trim(), phone: phone.replace(/\D/g, ""),
      address: { villageOrCity: villageOrCity.trim(), district: district.trim(), state: state.trim(), pinCode },
    } : undefined;
    const result = await verifyOtp(email, "farmer", otp, details, mode);
    setBusy(false);
    if (!result.success || !result.session) { setError(result.messageHi || "OTP सत्यापन विफल हुआ।"); return; }
    onLoginSuccess(result.session);
  };

  return <main className="min-h-screen bg-[#f4f7f2] px-4 py-8 text-slate-900">
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {onBackToWelcome && <button className="mb-4 text-sm font-semibold text-green-800" onClick={onBackToWelcome}>← वापस जाएँ</button>}
      <div className="mb-5 flex items-center justify-between">
        <div><h1 className="text-2xl font-extrabold text-green-900">YANTRIQ</h1><p className="text-sm text-slate-600">किसान खाता</p></div>
        <select aria-label="Language" value={currentLanguage} onChange={(e) => onLanguageChange(e.target.value as LanguageCode)} className="rounded-lg border p-2 text-sm">
          {SUPPORTED_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.nativeName}</option>)}
        </select>
      </div>
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        {(["register", "login"] as const).map((item) => <button key={item} type="button" onClick={() => { setMode(item); setError(""); }} className={`rounded-lg p-2 text-sm font-bold ${mode === item ? "bg-green-800 text-white" : "text-slate-600"}`}>{item === "register" ? "नया खाता" : "लॉगिन"}</button>)}
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
      {showAuthDiagnostics && otpDiagnostic && <p role="status" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950"><strong>Development diagnostics:</strong> {otpDiagnostic}</p>}
      {message && <p role="status" className="mb-3 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-900">{message}</p>}
      {!otpSent ? <div className="space-y-3">
        {mode === "register" && <>
          <input required aria-label="पूरा नाम" placeholder="पूरा नाम" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border p-3" />
          <input required aria-label="मोबाइल नंबर" placeholder="मोबाइल नंबर (वैकल्पिक संपर्क)" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border p-3" />
          <p className="-mt-2 text-xs text-slate-500">मोबाइल नंबर सत्यापित नहीं किया जाता।</p>
          <input required aria-label="गाँव या शहर" placeholder="गाँव / शहर" value={villageOrCity} onChange={(e) => setVillageOrCity(e.target.value)} className="w-full rounded-xl border p-3" />
          <div className="grid grid-cols-2 gap-3"><input required aria-label="ज़िला" placeholder="ज़िला" value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full rounded-xl border p-3" /><input required aria-label="राज्य" placeholder="राज्य" value={state} onChange={(e) => setState(e.target.value)} className="w-full rounded-xl border p-3" /></div>
          <input required aria-label="PIN कोड" placeholder="PIN कोड" inputMode="numeric" maxLength={6} value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))} className="w-full rounded-xl border p-3" />
        </>}
        <label className="block text-sm font-semibold">ईमेल पता<input required type="email" autoComplete="email" disabled={otpSent} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="mt-1 w-full rounded-xl border p-3" /></label>
        <button type="button" disabled={busy} onClick={send} className="w-full rounded-xl bg-green-800 p-3 font-bold text-white disabled:opacity-60">{busy ? "कृपया प्रतीक्षा करें…" : "ईमेल OTP भेजें"}</button>
      </div> : <div className="space-y-3">
        <p className="text-sm text-slate-700">4 अंकों का OTP <strong>{email}</strong> पर भेजा गया है।</p>
        <input aria-label="4 अंकों का OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-full rounded-xl border p-3 text-center text-2xl tracking-[0.5em]" />
        <button type="button" disabled={busy || otp.length !== 4} onClick={verify} className="w-full rounded-xl bg-green-800 p-3 font-bold text-white disabled:opacity-60">{busy ? "सत्यापित हो रहा है…" : "OTP सत्यापित करें"}</button>
        <button type="button" disabled={busy || resendIn > 0} onClick={resend} className="w-full p-2 text-sm font-semibold text-green-900 disabled:text-slate-400">{resendIn ? `दोबारा भेजें (${resendIn}s)` : "OTP दोबारा भेजें"}</button>
        <button type="button" disabled={busy} onClick={() => { setOtpSent(false); setOtp(""); setMessage(""); }} className="w-full p-2 text-sm text-slate-600">ईमेल बदलें</button>
      </div>}
    </section>
  </main>;
}
