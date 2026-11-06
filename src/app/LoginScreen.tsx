"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  PhoneCall,
  Languages,
  Check,
  CheckCircle2,
  Mic,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Headphones,
  Lock,
  AlertCircle,
  RotateCw,
  UserPlus,
  X,
  Sparkles,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  UserRole,
  AuthSession,
  requestOtp,
  resendOtp,
  verifyOtp,
  registerNewTechnician,
  cleanPhoneNumber,
  isValidIndianMobileNumber,
  RegistrationInput,
  OtpRequestDiagnostics,
} from "@/services/authService";
import { LanguageCode, t, SUPPORTED_LANGUAGES } from "@/i18n";
import VoiceHelpAssistant from "@/components/VoiceHelpAssistant";
import { VoiceHelpScreenContext, VoiceAssistantStatus } from "@/types/voiceAssistant";

interface LoginScreenProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onLoginSuccess: (session: AuthSession) => void;
  onBackToWelcome?: () => void;
}

export default function LoginScreen({
  currentLanguage,
  onLanguageChange,
  onLoginSuccess,
  onBackToWelcome,
}: LoginScreenProps) {
  const [email, setEmail] = useState<string>("");
  // Step 1: Account type state (Strictly "farmer" or "technician")
  const [selectedRole, setSelectedRole] = useState<UserRole>("farmer");

  // Mode: "register" (पंजीकरण) vs "login" (लॉगिन)
  const [authMode, setAuthMode] = useState<"register" | "login">("register");

  // Step 2: Registration Fields (Never pre-fill or assume user information)
  const [fullName, setFullName] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [villageOrCity, setVillageOrCity] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [stateName, setStateName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");

  // Technician-Specific Profile Fields
  const [techSelectedSkills, setTechSelectedSkills] = useState<string[]>([]);
  const [techServiceArea, setTechServiceArea] = useState<string>("");
  const [techAvailable, setTechAvailable] = useState<boolean>(true);

  // Available skills list for Technician
  const AVAILABLE_SKILLS = [
    { id: "Tractor", labelHi: "🚜 ट्रैक्टर (Tractor)" },
    { id: "Pump", labelHi: "💧 वाटर पंप (Pump)" },
    { id: "Engine", labelHi: "⚙️ इंजन (Engine)" },
    { id: "Sprayer", labelHi: "🌿 स्प्रेयर (Sprayer)" },
    { id: "Mechanical", labelHi: "🔧 मैकेनिकल (Mechanical)" },
    { id: "Electrical", labelHi: "⚡ इलेक्ट्रिकल (Electrical)" },
    { id: "Harvester", labelHi: "🌾 हार्वेस्टर (Harvester)" },
  ];

  // Phone input voice listening
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);

  // Step 3: OTP flow states
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", ""]);
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Feedback, Alerts & Errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState<boolean>(true);
  const [otpDiagnostics, setOtpDiagnostics] = useState<OtpRequestDiagnostics | undefined>();

  // Audio assistance banner & speech synthesis
  const [showAudioBanner, setShowAudioBanner] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Voice-Only AI Help Assistant state ("बोलकर मदद लें")
  const [showVoiceHelp, setShowVoiceHelp] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceAssistantStatus>("idle");

  // Modals & Popups
  const [showLangModal, setShowLangModal] = useState<boolean>(false);
  const [showTechSignupModal, setShowTechSignupModal] = useState<boolean>(false);
  const [activeInfoModal, setActiveInfoModal] = useState<"verification" | "security" | null>(null);

  // Legacy Technician Modal states (if opened)
  const [techName, setTechName] = useState<string>("");
  const [techPhone, setTechPhone] = useState<string>("");
  const [techExperience, setTechExperience] = useState<number>(5);
  const [techArea, setTechArea] = useState<string>("नागपुर ग्रामीण - ब्लॉक 1");

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend countdown timer effect
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Audio guidance voice synthesis
  const handleToggleAudio = () => {
    setShowAudioBanner((prev) => !prev);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      const instructionText =
        selectedRole === "farmer"
          ? "नमस्ते! आप किसान हैं या मिस्त्री? नीचे अपना कार्ड चुनें और अपना दस अंकों का फोन नंबर भरें।"
          : "नमस्ते मिस्त्री भाई! अपना दस अंकों का फोन नंबर भरें और ओटीपी प्राप्त करें।";

      const utterance = new SpeechSynthesisUtterance(instructionText);
      utterance.lang = "hi-IN";
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Voice input recognition for phone number
  const handleVoiceInput = () => {
    setErrorMessage(null);

    // If Web Speech API is available
    if (
      typeof window !== "undefined" &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    ) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRec();
        recognition.lang = "hi-IN";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsVoiceListening(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          setIsVoiceListening(false);
          const transcript = event.results[0][0].transcript;
          const digits = transcript.replace(/\D/g, "");
          if (digits.length >= 10) {
            setMobileNumber(digits.slice(0, 10));
            setInfoMessage(`🎙️ आवाज़ पहचानी गई: ${digits.slice(0, 10)}`);
          } else {
            setErrorMessage("आवाज़ स्पष्ट नहीं सुनाई दी। कृपया 10 अंकों का मोबाइल नंबर बोलें या टाइप करें।");
          }
        };

        recognition.onerror = () => {
          setIsVoiceListening(false);
          setErrorMessage("आवाज़ पहचान में समस्या आई। कृपया मोबाइल नंबर टाइप करें।");
        };

        recognition.onend = () => {
          setIsVoiceListening(false);
        };

        recognition.start();
        return;
      } catch {
        setIsVoiceListening(false);
      }
    }

    setErrorMessage("माइक उपलब्ध नहीं है। कृपया मोबाइल नंबर टाइप करें।");
  };

  // Handle Send OTP
  const handleSendOtp = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setOtpDiagnostics(undefined);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage("कृपया मान्य ईमेल पता दर्ज करें।");
      return;
    }

    // Self-service accounts are always farmers. Technician access must be
    // provisioned through an authorized process, never from this form.
    if (authMode === "register" && selectedRole === "technician") {
      setErrorMessage("टेक्नीशियन खाता सक्रिय करने के लिए प्रशासनिक अनुमति आवश्यक है।");
      return;
    }

    // Validate registration fields if in registration mode
    if (authMode === "register") {
      if (!fullName.trim()) {
        setErrorMessage("कृपया अपना पूरा नाम दर्ज करें।");
        return;
      }
      if (!villageOrCity.trim()) {
        setErrorMessage("कृपया अपना पता (गाँव या शहर) दर्ज करें।");
        return;
      }
      // Auto-fill district and state if omitted
      if (!district.trim()) {
        setDistrict(villageOrCity.trim());
      }
      if (!stateName.trim()) {
        setStateName("महाराष्ट्र");
      }
      if (selectedRole === "technician" && techSelectedSkills.length === 0) {
        setTechSelectedSkills(["Tractor", "Mechanical"]);
      }
    }

    if (authMode === "register") {
      const cleaned = cleanPhoneNumber(mobileNumber);
      if (!isValidIndianMobileNumber(cleaned)) {
        setErrorMessage("कृपया मान्य 10 अंकों का संपर्क मोबाइल नंबर दर्ज करें।");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await requestOtp(email.trim());
      setIsSubmitting(false);

      if (res.success) {
        setOtpSent(true);
        setIsExistingUser(res.isExistingUser);
        setResendCountdown(10);
        setInfoMessage(res.messageHi);
        // Pre-fill first digit focus
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setErrorMessage(res.messageHi || "OTP भेजने में समस्या आई। कृपया पुनः प्रयास करें।");
        setOtpDiagnostics(res.diagnostics);
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage("नेटवर्क त्रुटि: कृपया इंटरनेट कनेक्शन जांचें या थोड़ी देर बाद प्रयास करें।");
    }
  };

  const handleResendOtp = async () => {
    setErrorMessage(null);
    setOtpDiagnostics(undefined);
    setIsSubmitting(true);
    const res = await resendOtp();
    setIsSubmitting(false);
    if (res.success) {
      setResendCountdown(10);
      setInfoMessage(res.messageHi);
    } else {
      setErrorMessage(res.messageHi || "OTP दोबारा भेजने में समस्या आई।");
      setOtpDiagnostics(res.diagnostics);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    setErrorMessage(null);
    const char = value.slice(-1).replace(/\D/g, "");
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    if (char && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP Keydown (Backspace navigation)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Paste handler for OTP
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasteData) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < pasteData.length; i++) {
        newDigits[i] = pasteData[i];
      }
      setOtpDigits(newDigits);
      const nextFocus = Math.min(pasteData.length, 3);
      otpInputRefs.current[nextFocus]?.focus();
    }
  };

  // Handle Verify OTP and Complete Login
  const handleVerifyAndLogin = async () => {
    setErrorMessage(null);
    const fullOtp = otpDigits.join("");

    if (fullOtp.length !== 4) {
      setErrorMessage("कृपया 4 अंकों का पूरा OTP दर्ज करें।");
      return;
    }

    setIsSubmitting(true);
    try {
      const registrationDetails: RegistrationInput | undefined =
        authMode === "register"
          ? {
              name: fullName.trim() || (selectedRole === "farmer" ? "किसान साथी" : "टेक्नीशियन मित्र"),
              phone: cleanPhoneNumber(mobileNumber),
              address: {
                villageOrCity: villageOrCity.trim() || "नागपुर",
                district: district.trim() || villageOrCity.trim() || "नागपुर",
                state: stateName.trim() || "महाराष्ट्र",
                pinCode: pinCode.trim() || undefined,
              },
            }
          : undefined;

      const res = await verifyOtp(email.trim(), selectedRole, fullOtp, registrationDetails, authMode);
      setIsSubmitting(false);

      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setErrorMessage(res.messageHi || "गलत OTP दर्ज किया गया है। कृपया पुनः प्रयास करें।");
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage("नेटवर्क त्रुटि: कृपया इंटरनेट कनेक्शन जांचें या थोड़ी देर बाद प्रयास करें।");
    }
  };

  // Handle New Technician Registration
  const handleSubmitTechSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleaned = cleanPhoneNumber(techPhone || mobileNumber);
    if (!isValidIndianMobileNumber(cleaned)) {
      setErrorMessage("कृपया टेक्नीशियन का मान्य 10 अंकों का फोन नंबर भरें।");
      return;
    }

    setIsSubmitting(true);
    try {
      // Keep the technician onboarding UI, but do not grant the role from a
      // public signup form. The API returns an authorization-required result.
      const res = await registerNewTechnician();
      setIsSubmitting(false);

      if (res.success && res.session) {
        setShowTechSignupModal(false);
        onLoginSuccess(res.session);
      } else {
        setErrorMessage(res.messageHi || "पंजीकरण में समस्या आई।");
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage("नेटवर्क त्रुटि: कृपया कनेक्शन जांचें।");
    }
  };

  const currentStep = otpSent
    ? "otp_verification"
    : authMode === "register" && (fullName.trim() !== "" || villageOrCity.trim() !== "")
    ? "details_input"
    : "role_selection";

  const voiceHelpContext: VoiceHelpScreenContext = {
    currentPage: "login_registration",
    selectedRole,
    authMode,
    currentStep,
    language: currentLanguage,
    hasError: !!errorMessage,
    errorMessage,
    infoMessage,
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#0f172a] flex flex-col font-sans selection:bg-[#dcfce7] pb-24">
      {/* ================= TOP APP BAR ================= */}
      <header className="bg-white/95 backdrop-blur-xs w-full border-b border-[#e2e8f0] sticky top-0 z-40 shadow-2xs">
        <div className="flex justify-between items-center w-full px-3 sm:px-4 h-15 sm:h-16 max-w-4xl mx-auto">
          {/* Leading Brand Identity */}
          <div className="flex items-center gap-2">
            {onBackToWelcome && (
              <button
                type="button"
                onClick={onBackToWelcome}
                className="p-1.5 -ml-1 text-[#475569] hover:text-[#165420] hover:bg-[#ecf8ee] rounded-lg transition-colors cursor-pointer"
                title="शुरुआती स्क्रीन पर वापस जाएं / Back to Welcome"
                aria-label="वापस जाएं"
              >
                <ArrowLeft className="w-5 h-5 text-[#165420]" />
              </button>
            )}
            <span className="text-2xl filter drop-shadow-2xs">🌾</span>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-[#165420] tracking-tight leading-tight">
                YANTRIQ
              </span>
              <span className="text-[11px] font-semibold text-[#475569] -mt-0.5 hidden xs:inline">
                कृषि उपकरण रिपेयर सेवा
              </span>
            </div>
          </div>

          {/* Action Items: 🗣️✨ AI Assistant & Language Selector */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Dedicated AI Voice Assistant Button (🗣️✨) */}
            <button
              id="voiceHelpTriggerBtn"
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                  setShowAudioBanner(false);
                }
                setShowVoiceHelp((prev) => !prev);
              }}
              className={`h-10 sm:h-11 px-3 sm:px-3.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer select-none active:scale-95 ${
                voiceStatus === "listening"
                  ? "bg-[#dcfce7] border-[#165420] text-[#165420] shadow-xs"
                  : voiceStatus === "speaking"
                  ? "bg-[#ecfdf5] border-emerald-600 text-emerald-900 shadow-xs"
                  : "bg-[#ecf8ee] border-[#bbf0bf] text-[#165420] hover:bg-[#e2f5e3]"
              }`}
              title={voiceStatus === "listening" ? "सुन रहा हूँ..." : "बोलकर AI मदद लें"}
              aria-label="बोलकर AI मदद लें"
            >
              {voiceStatus === "listening" ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[#165420]">सुन रहा हूँ...</span>
                </>
              ) : voiceStatus === "processing" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#165420] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[#165420]">सोच रहा हूँ...</span>
                </>
              ) : voiceStatus === "speaking" ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-700 animate-bounce shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-emerald-900">जवाब...</span>
                </>
              ) : (
                <>
                  <span className="text-base sm:text-lg leading-none select-none">🗣️✨</span>
                  <span className="text-xs sm:text-sm font-bold text-[#165420]">AI</span>
                </>
              )}
            </button>

            {/* Language Selector Trigger */}
            <button
              type="button"
              onClick={() => setShowLangModal(true)}
              className="h-10 sm:h-11 flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-[#165420] text-white text-xs sm:text-sm font-semibold border border-[#165420] active:scale-95 transition-all hover:bg-[#124219] cursor-pointer"
              title="भाषा चुनें / Select Language"
            >
              <Languages className="w-4 h-4 flex-shrink-0" />
              <span>
                {SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage)?.nativeName || "हिंदी"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= VOICE-ONLY AI HELP ASSISTANT ================= */}
      <VoiceHelpAssistant
        isOpen={showVoiceHelp}
        onClose={() => {
          setShowVoiceHelp(false);
          setVoiceStatus("idle");
        }}
        onStatusChange={setVoiceStatus}
        context={voiceHelpContext}
      />

      {/* ================= AUDIO ANNOUNCEMENT BANNER ================= */}
      {showAudioBanner && (
        <div
          id="audioAnnouncementBanner"
          className="bg-[#ecfdf5] text-[#065f46] px-4 py-2.5 border-b border-[#a7f3d0] w-full transition-all"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <span className="text-xl">📢</span>
              <p>
                <strong>निर्देश:</strong> आप किसान हैं या मिस्त्री? नीचे अपना कार्ड चुनें और अपना 10 अंकों का फोन नंबर भरें।
              </p>
            </div>
            <button
              onClick={() => {
                setShowAudioBanner(false);
                if (typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                }
              }}
              className="p-1 rounded-md hover:bg-[#d1fae5] text-[#065f46] cursor-pointer"
              aria-label="बंद करें"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= MAIN ONE-PAGE CONTENT ================= */}
      <main className="flex-grow w-full max-w-md mx-auto px-4 py-5 space-y-4">
        {/* STEP 1 HEADER: आप कौन हैं? */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#165420] tracking-tight">
            आप कौन हैं?
          </h1>
          <p className="text-sm sm:text-base font-semibold text-[#475569]">
            कृपया अपना खाता प्रकार चुनें
          </p>
        </div>

        {/* STEP 1: ACCOUNT TYPE SELECTOR (2 CARDS ON ONE PAGE) */}
        <div
          className="grid grid-cols-2 gap-3"
          role="radiogroup"
          aria-label="खाता प्रकार"
        >
          {/* Card 1: 🚜 किसान (Farmer) */}
          <div
            id="cardFarmer"
            role="radio"
            tabIndex={0}
            aria-checked={selectedRole === "farmer"}
            onClick={() => {
              setSelectedRole("farmer");
              setErrorMessage(null);
            }}
            className={`cursor-pointer p-3.5 sm:p-4 rounded-xl flex flex-col justify-between min-h-[150px] select-none transition-all active:scale-[0.99] ${
              selectedRole === "farmer"
                ? "border-2 border-[#165420] bg-[#f0f9f1] shadow-xs ring-1 ring-[#165420]/20"
                : "border-2 border-[#e2e8f0] bg-white hover:bg-[#f8faf8] hover:border-[#cbd5e1]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl sm:text-4xl">🚜</span>
              <span
                id="checkFarmer"
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  selectedRole === "farmer"
                    ? "bg-[#165420] text-white"
                    : "border-2 border-[#94a3b8] bg-white text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <h3 className="text-lg font-bold text-[#0f172a]">किसान</h3>
                <span className="text-xs text-[#64748b] font-medium">(Farmer)</span>
              </div>
              <p className="text-xs text-[#475569] font-medium mt-1 leading-snug line-clamp-2">
                अपनी मशीन की समस्या बताएं और मरम्मत पाएं
              </p>
            </div>
          </div>

          {/* Card 2: 🔧 टेक्नीशियन (Technician) */}
          <div
            id="cardTech"
            role="radio"
            tabIndex={0}
            aria-checked={selectedRole === "technician"}
            onClick={() => {
              setSelectedRole("technician");
              setErrorMessage(null);
            }}
            className={`cursor-pointer p-3.5 sm:p-4 rounded-xl flex flex-col justify-between min-h-[150px] select-none transition-all active:scale-[0.99] ${
              selectedRole === "technician"
                ? "border-2 border-[#165420] bg-[#f0f9f1] shadow-xs ring-1 ring-[#165420]/20"
                : "border-2 border-[#e2e8f0] bg-white hover:bg-[#f8faf8] hover:border-[#cbd5e1]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl sm:text-4xl">🔧</span>
              <span
                id="checkTech"
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  selectedRole === "technician"
                    ? "bg-[#165420] text-white"
                    : "border-2 border-[#94a3b8] bg-white text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <h3 className="text-lg font-bold text-[#0f172a]">टेक्नीशियन</h3>
                <span className="text-xs text-[#64748b] font-medium">(Technician)</span>
              </div>
              <p className="text-xs text-[#475569] font-medium mt-1 leading-snug line-clamp-2">
                किसानों की मशीनों की मरम्मत करें
              </p>
            </div>
          </div>
        </div>

        {/* STEP 2: REGISTRATION DETAILS & LOGIN FORM CARD */}
        <div className="bg-white border border-[#cbd5e1] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          {/* Mode Switch Toggle: New Registration vs Existing User Login */}
          <div className="flex bg-[#f1f5f1] p-1 rounded-xl border border-[#e2e8f0]">
            <button
              type="button"
              id="modeRegisterBtn"
              onClick={() => {
                setAuthMode("register");
                setErrorMessage(null);
              }}
              className={`flex-1 h-10 flex items-center justify-center gap-1.5 text-center text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                authMode === "register"
                  ? "bg-[#165420] text-white shadow-xs"
                  : "text-[#475569] hover:text-[#0f172a]"
              }`}
            >
              <span>📝</span>
              <span>नया रजिस्ट्रेशन</span>
            </button>
            <button
              type="button"
              id="modeLoginBtn"
              onClick={() => {
                setAuthMode("login");
                setErrorMessage(null);
              }}
              className={`flex-1 h-10 flex items-center justify-center gap-1.5 text-center text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                authMode === "login"
                  ? "bg-[#165420] text-white shadow-xs"
                  : "text-[#475569] hover:text-[#0f172a]"
              }`}
            >
              <span>🔑</span>
              <span>लॉगिन करें</span>
            </button>
          </div>

          {/* Selected Role Indicator Badge */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-[#165420] font-semibold text-xs sm:text-sm bg-[#ecfdf5] px-3 py-1.5 rounded-lg border border-[#a7f3d0]">
              <CheckCircle2 className="w-4 h-4 text-[#165420] flex-shrink-0" />
              <span id="selectedRoleText">
                {selectedRole === "farmer" ? "🚜 किसान खाता" : "🔧 टेक्नीशियन खाता"} (
                {authMode === "register" ? "नया रजिस्ट्रेशन" : "लॉगिन"})
              </span>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-start gap-2.5 text-red-900 text-sm font-semibold shadow-xs animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {process.env.NODE_ENV !== "production" && otpDiagnostics && (
            <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
              <strong>Development diagnostics:</strong>{" "}
              {[
                otpDiagnostics.local?.code && `Local ${otpDiagnostics.local.code}`,
                otpDiagnostics.msg91?.httpStatus && `MSG91 HTTP ${otpDiagnostics.msg91.httpStatus}`,
                otpDiagnostics.msg91?.type && `type ${otpDiagnostics.msg91.type}`,
                otpDiagnostics.msg91?.code && `code ${otpDiagnostics.msg91.code}`,
                otpDiagnostics.msg91?.message || otpDiagnostics.local?.message,
              ].filter(Boolean).join(" · ")}
            </div>
          )}

          {/* Info / Success Message Alert */}
          {infoMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-2.5 text-emerald-950 text-sm font-semibold shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{infoMessage}</div>
            </div>
          )}

          {/* STEP 2 FIELDS: FULL NAME (REGISTRATION ONLY) */}
          {authMode === "register" && (
            <div>
              <label
                htmlFor="fullNameInput"
                className="block text-sm font-bold text-[#0f172a] mb-1.5"
              >
                <span>पूरा नाम</span>{" "}
                <span className="font-normal text-xs text-[#64748b]">(Full Name)</span>{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                id="fullNameInput"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={otpSent}
                placeholder="अपना पूरा नाम दर्ज करें"
                className={`w-full h-12 px-3.5 bg-white border text-base font-medium rounded-xl text-[#0f172a] focus:outline-none placeholder:text-[#94a3b8] placeholder:font-normal transition-all ${
                  otpSent
                    ? "bg-slate-100 border-[#cbd5e1] cursor-not-allowed"
                    : "border-[#cbd5e1] focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15"
                }`}
              />
            </div>
          )}

          {/* Email is the verified login identifier; phone remains an unverified profile contact. */}
          <div>
            <label htmlFor="emailInput" className="block text-sm font-bold text-[#0f172a] mb-1.5">
              <span>ईमेल पता</span> <span className="font-normal text-xs text-[#64748b]">(Email)</span> <span className="text-red-500">*</span>
            </label>
            <input
              id="emailInput"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMessage(null); }}
              disabled={otpSent}
              placeholder="name@example.com"
              className="w-full h-12 px-3.5 bg-white border border-[#cbd5e1] text-base font-medium rounded-xl text-[#0f172a] focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15 focus:outline-none"
            />
          </div>

          {/* MOBILE NUMBER INPUT (PROFILE CONTACT, REGISTRATION ONLY) */}
          {authMode === "register" && (
          <div>
            <label
              htmlFor="mobileInput"
              className="block text-sm font-bold text-[#0f172a] mb-1.5"
            >
              <span>मोबाइल नंबर</span>{" "}
              <span className="font-normal text-xs text-[#64748b]">(Mobile Number)</span>{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              {/* Country Code Prefix */}
              <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none text-[#0f172a] font-bold text-base border-r border-[#cbd5e1] pr-2.5">
                <span className="text-lg">🇮🇳</span>
                <span>+91</span>
              </div>

              {/* Input Element */}
              <input
                id="mobileInput"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobileNumber}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "");
                  setMobileNumber(cleaned);
                  setErrorMessage(null);
                }}
                disabled={otpSent}
                placeholder="10 अंकों का नंबर"
                className={`w-full h-12 pl-24 pr-12 bg-white border text-base sm:text-lg font-bold rounded-xl text-[#0f172a] tracking-wider focus:outline-none placeholder:text-[#94a3b8] placeholder:font-normal placeholder:tracking-normal transition-all ${
                  otpSent
                    ? "bg-slate-100 border-[#cbd5e1] cursor-not-allowed"
                    : "border-[#cbd5e1] focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15"
                }`}
              />

              {/* Mic / Voice Input Trigger */}
              {!otpSent && (
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  title="बोलकर नंबर भरें"
                  aria-label="बोलकर नंबर भरें"
                  className={`absolute right-1.5 w-9 h-9 flex items-center justify-center rounded-lg border border-[#cbd5e1] active:scale-95 transition-all cursor-pointer ${
                    isVoiceListening
                      ? "bg-red-500 text-white animate-pulse border-red-500"
                      : "bg-[#f1f5f1] text-[#165420] hover:bg-[#e2f0e2]"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>
            {!otpSent && (
              <p className="text-xs text-[#64748b] font-medium mt-1.5 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[#165420] flex-shrink-0" />
                <span>मोबाइल संपर्क जानकारी है, इसका सत्यापन नहीं किया जाता।</span>
              </p>
            )}
          </div>
          )}

          {/* STEP 2 FIELDS: ADDRESS (REGISTRATION ONLY) */}
          {authMode === "register" && (
            <div className="space-y-3 pt-1">
              <label className="block text-sm font-bold text-[#0f172a]">
                <span>पता</span>{" "}
                <span className="font-normal text-xs text-[#64748b]">(Address Details)</span>{" "}
                <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="villageInput" className="block text-xs font-semibold text-[#334155] mb-1">
                    <span>गाँव / शहर</span>{" "}
                    <span className="font-normal text-[11px] text-[#64748b]">(Village/City)</span>{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="villageInput"
                    type="text"
                    value={villageOrCity}
                    onChange={(e) => setVillageOrCity(e.target.value)}
                    disabled={otpSent}
                    placeholder="जैसे: नागपुर"
                    className="w-full h-12 px-3 bg-white border border-[#cbd5e1] text-sm font-medium rounded-xl text-[#0f172a] focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15 focus:outline-none disabled:bg-slate-100 placeholder:text-[#94a3b8] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="districtInput" className="block text-xs font-semibold text-[#334155] mb-1">
                    <span>ज़िला</span>{" "}
                    <span className="font-normal text-[11px] text-[#64748b]">(District)</span>{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="districtInput"
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    disabled={otpSent}
                    placeholder="जैसे: नागपुर"
                    className="w-full h-12 px-3 bg-white border border-[#cbd5e1] text-sm font-medium rounded-xl text-[#0f172a] focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15 focus:outline-none disabled:bg-slate-100 placeholder:text-[#94a3b8] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="stateInput" className="block text-xs font-semibold text-[#334155] mb-1">
                    <span>राज्य</span>{" "}
                    <span className="font-normal text-[11px] text-[#64748b]">(State)</span>{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="stateInput"
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    disabled={otpSent}
                    placeholder="जैसे: महाराष्ट्र"
                    className="w-full h-12 px-3 bg-white border border-[#cbd5e1] text-sm font-medium rounded-xl text-[#0f172a] focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15 focus:outline-none disabled:bg-slate-100 placeholder:text-[#94a3b8] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="pinCodeInput" className="block text-xs font-semibold text-[#334155] mb-1">
                    <span>पिन कोड</span>{" "}
                    <span className="font-normal text-[11px] text-[#64748b]">(PIN Code)</span>
                  </label>
                  <input
                    id="pinCodeInput"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                    disabled={otpSent}
                    placeholder="जैसे: 440001"
                    className="w-full h-12 px-3 bg-white border border-[#cbd5e1] text-sm font-medium rounded-xl text-[#0f172a] focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15 focus:outline-none disabled:bg-slate-100 placeholder:text-[#94a3b8] transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TECHNICIAN SPECIFIC PROFILE FIELDS (REGISTRATION ONLY) */}
          {authMode === "register" && selectedRole === "technician" && (
            <div className="space-y-3 pt-2 border-t border-[#e2e8f0]">
              <div>
                <label className="block text-sm font-bold text-[#0f172a] mb-1.5">
                  <span>उपकरण कौशल</span>{" "}
                  <span className="font-normal text-xs text-[#64748b]">(Machine Skills)</span>{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_SKILLS.map((skill) => {
                    const isSelected = techSelectedSkills.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setTechSelectedSkills((prev) => prev.filter((s) => s !== skill.id));
                          } else {
                            setTechSelectedSkills((prev) => [...prev, skill.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#165420] text-white border-[#165420]"
                            : "bg-[#f8fafc] text-[#334155] border-[#cbd5e1] hover:bg-[#f1f5f9]"
                        }`}
                      >
                        {skill.labelHi}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="serviceAreaInput" className="block text-xs font-semibold text-[#334155] mb-1">
                  <span>सेवा क्षेत्र</span>{" "}
                  <span className="font-normal text-[11px] text-[#64748b]">(Service Area)</span>
                </label>
                <input
                  id="serviceAreaInput"
                  type="text"
                  value={techServiceArea}
                  onChange={(e) => setTechServiceArea(e.target.value)}
                  disabled={otpSent}
                  placeholder="जैसे: नागपुर व आसपास (15 किमी)"
                  className="w-full h-12 px-3.5 bg-white border border-[#cbd5e1] text-sm font-medium rounded-xl text-[#0f172a] focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15 focus:outline-none disabled:bg-slate-100 placeholder:text-[#94a3b8] transition-all"
                />
              </div>

              <div className="flex items-center justify-between bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
                <span className="text-xs font-semibold text-[#334155]">
                  उपलब्धता स्थिति <span className="font-normal text-[11px] text-[#64748b]">(Availability):</span>
                </span>
                <button
                  type="button"
                  onClick={() => setTechAvailable(!techAvailable)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    techAvailable
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-red-50 border-red-300 text-red-800"
                  }`}
                >
                  {techAvailable ? "🟢 उपलब्ध (Available)" : "🔴 व्यस्त (Busy)"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SEND OTP BUTTON (WHEN OTP NOT YET SENT) */}
          {!otpSent && (
            <button
              id="sendOtpBtn"
              type="button"
              disabled={isSubmitting}
              onClick={handleSendOtp}
              className="w-full h-12 sm:h-13 bg-[#165420] text-white font-bold text-base sm:text-lg rounded-xl flex items-center justify-center gap-2 hover:bg-[#124219] active:scale-[0.99] transition-all shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-5 h-5 animate-spin" />
                  <span>OTP भेजा जा रहा है...</span>
                </>
              ) : (
                <>
                  <span>OTP भेजें</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
          )}

          {/* ================= OTP VERIFICATION SECTION (REVEALED UPON SEND) ================= */}
          {otpSent && (
            <div
              id="otpVerificationBlock"
              className="bg-[#f0fdf4] border border-[#a7f3d0] rounded-xl p-4 space-y-3.5 transition-all"
            >
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[#165420]">
                <span>
                  OTP भेजा गया: {email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpDigits(["", "", "", ""]);
                    setEmail("");
                    setErrorMessage(null);
                  }}
                  className="text-xs text-[#165420] underline font-bold hover:text-black cursor-pointer"
                >
                  ईमेल बदलें
                </button>
              </div>

              {/* Four digit email OTP */}
              <div>
                <label className="block text-sm font-bold text-[#0f172a] mb-1.5">
                  <span>4 अंकों का OTP दर्ज करें:</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otpDigit-${idx}`}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-full h-12 sm:h-13 text-center text-xl sm:text-2xl font-bold rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] focus:border-2 focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/20 focus:outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Resend Helper */}
              <div className="flex items-center justify-between text-xs sm:text-sm flex-wrap gap-2">
                <button
                  type="button"
                  disabled={resendCountdown > 0 || isSubmitting}
                  onClick={handleResendOtp}
                  className="font-bold text-[#165420] underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
                >
                  {resendCountdown > 0
                    ? `दोबारा भेजें (${resendCountdown}s)`
                    : "OTP दोबारा भेजें"}
                </button>
              </div>

              {/* Submit Login Button */}
              <button
                id="verifyOtpBtn"
                type="button"
                disabled={isSubmitting}
                onClick={handleVerifyAndLogin}
                className="w-full h-12 sm:h-13 bg-[#165420] text-white font-bold text-base sm:text-lg rounded-xl flex items-center justify-center gap-2 hover:bg-[#124219] active:scale-[0.99] transition-all shadow-sm cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-5 h-5 animate-spin" />
                    <span>सत्यापित हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {selectedRole === "farmer"
                        ? "🚜 किसान पोर्टल में प्रवेश करें"
                        : "🔧 टेक्नीशियन पोर्टल में प्रवेश करें"}
                    </span>
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Trust & Helpline Indicators */}
        <div className="space-y-2 text-center pt-2 pb-4">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#64748b] font-medium">
            <Lock className="w-3.5 h-3.5 text-[#165420]" />
            <span>100% सुरक्षित एवं सरकारी कृषि मानकों के अनुरूप</span>
          </div>

          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f1f5f1] text-[#334155] text-xs sm:text-sm font-medium border border-[#e2e8f0]">
            <Headphones className="w-4 h-4 text-[#165420]" />
            <span>टोल-फ्री किसान हेल्पलाइन:</span>
            <a
              href="tel:18001204567"
              className="text-[#165420] font-bold hover:underline"
            >
              1800 120 4567
            </a>
          </div>
        </div>
      </main>

      {/* ================= BOTTOM DOCKED BAR ================= */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 w-full z-40 bg-white/95 backdrop-blur-xs border-t border-[#e2e8f0]"
      >
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2 px-3 py-2">
          {/* Item 1: टोल-फ्री मदद */}
          <a
            href="tel:18001204567"
            className="flex flex-col items-center justify-center bg-[#eef8ee] text-[#165420] border border-[#c6e6c6] rounded-xl py-1.5 px-2 active:scale-95 transition-all hover:bg-[#e2f3e2]"
          >
            <PhoneCall className="w-4 h-4" />
            <span className="text-[11px] font-bold mt-0.5">टोल-फ्री मदद</span>
          </a>

          {/* Item 2: सत्यापन जानकारी */}
          <button
            type="button"
            onClick={() => setActiveInfoModal("verification")}
            className="flex flex-col items-center justify-center text-[#475569] hover:bg-[#f8fafc] border border-transparent hover:border-[#e2e8f0] rounded-xl py-1.5 px-2 active:scale-95 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#165420]" />
            <span className="text-[11px] font-semibold mt-0.5">सत्यापन</span>
          </button>

          {/* Item 3: सुरक्षा जानकारी */}
          <button
            type="button"
            onClick={() => setActiveInfoModal("security")}
            className="flex flex-col items-center justify-center text-[#475569] hover:bg-[#f8fafc] border border-transparent hover:border-[#e2e8f0] rounded-xl py-1.5 px-2 active:scale-95 transition-all cursor-pointer"
          >
            <Lock className="w-4 h-4 text-[#165420]" />
            <span className="text-[11px] font-semibold mt-0.5">सुरक्षा</span>
          </button>
        </div>
      </nav>

      {/* ================= MODAL: LANGUAGE SELECTOR ================= */}
      {showLangModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#0f172a] flex items-center gap-2">
                <Languages className="w-5 h-5 text-[#165420]" />
                <span>भाषा चुनें / Select Language</span>
              </h3>
              <button
                onClick={() => setShowLangModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="बंद करें"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    onLanguageChange(lang.code);
                    setShowLangModal(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left font-bold text-sm transition-all cursor-pointer ${
                    currentLanguage === lang.code
                      ? "border-[#165420] bg-[#eaf5eb] text-[#165420] shadow-xs"
                      : "border-slate-200 hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="text-sm font-bold text-[#0f172a]">{lang.nativeName}</div>
                  <div className="text-xs text-slate-500 font-medium">{lang.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TECHNICIAN REGISTRATION ================= */}
      {showTechSignupModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-slate-200 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-[#165420] uppercase tracking-wide">
                  मिस्त्री पार्टनर पंजीकरण
                </span>
                <h3 className="text-lg font-bold text-[#0f172a]">
                  नया टेक्नीशियन खाता बनाएं
                </h3>
              </div>
              <button
                onClick={() => setShowTechSignupModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="बंद करें"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTechSignup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  आपका पूरा नाम (Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="जैसे: रमेश कुमार"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  मोबाइल नंबर (Mobile) *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 font-bold text-sm">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98765 01234"
                    value={techPhone || mobileNumber}
                    onChange={(e) => setTechPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-11 pl-12 pr-3 border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  कार्य अनुभव (Experience Years)
                </label>
                <select
                  value={techExperience}
                  onChange={(e) => setTechExperience(Number(e.target.value))}
                  className="w-full h-11 px-3 border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15 focus:outline-none bg-white"
                >
                  <option value={1}>1 वर्ष</option>
                  <option value={3}>3 वर्ष</option>
                  <option value={5}>5+ वर्ष</option>
                  <option value={10}>10+ वर्ष (वरिष्ठ मैकेनिक)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  कार्य क्षेत्र / ब्लॉक (Service Area)
                </label>
                <input
                  type="text"
                  placeholder="जैसे: नागपुर ग्रामीण / लखनऊ ब्लॉक"
                  value={techArea}
                  onChange={(e) => setTechArea(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-[#165420] focus:ring-2 focus:ring-[#165420]/15 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1.5">
                  किन मशीनों के विशेषज्ञ हैं?
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  {[
                    { key: "Tractor", label: "🚜 ट्रैक्टर (Tractor)" },
                    { key: "Sprayer", label: "🎒 स्प्रेयर (Sprayer)" },
                    { key: "Water Pump", label: "💧 वाटर पंप (Pump)" },
                    { key: "Engine", label: "⚙️ इंजन (Engine)" },
                  ].map((skill) => {
                    const isChecked = techSelectedSkills.includes(skill.key);
                    return (
                      <button
                        key={skill.key}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setTechSelectedSkills(
                              techSelectedSkills.filter((s) => s !== skill.key)
                            );
                          } else {
                            setTechSelectedSkills([...techSelectedSkills, skill.key]);
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isChecked
                            ? "border-[#165420] bg-[#eaf5eb] text-[#165420]"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {skill.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 mt-2 bg-[#165420] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-[#124219] cursor-pointer shadow-xs active:scale-[0.99] transition-all"
              >
                {isSubmitting ? "पंजीकरण हो रहा है..." : "पंजीकरण पूरा करें व लॉगिन करें ➔"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TRUST / VERIFICATION / SECURITY ================= */}
      {activeInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-[#0f172a] flex items-center gap-2">
                {activeInfoModal === "verification" ? (
                  <>
                    <ShieldCheck className="w-5 h-5 text-[#165420]" />
                    <span>सत्यापन विवरण</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 text-[#165420]" />
                    <span>सुरक्षा व गोपनीयता</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setActiveInfoModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="बंद करें"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
              {activeInfoModal === "verification"
                ? "YANTRIQ के सभी मिस्त्री राज्य कृषि कौशल मिशन एवं NAMI द्वारा प्रशिक्षित एवं पूर्व-सत्यापित हैं। हर मैकेनिक की रेटिंग और सेवा इतिहास पारदर्शी रूप से देखा जा सकता है।"
                : "आपकी व्यक्तिगत जानकारी, खेत का पता और उपकरण का विवरण 100% सुरक्षित है। YANTRIQ डेटा किसी भी तीसरे पक्ष के साथ साझा नहीं किया जाता है।"}
            </p>

            <button
              type="button"
              onClick={() => setActiveInfoModal(null)}
              className="w-full py-2.5 bg-[#165420] hover:bg-[#124219] text-white font-bold rounded-xl text-sm cursor-pointer shadow-xs active:scale-[0.99] transition-all"
            >
              समझ गया
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
