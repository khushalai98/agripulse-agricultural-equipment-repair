"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import SyncDebugPanel from "./SyncDebugPanel";
import {
  Mic,
  Camera,
  Video,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Calendar,
  PhoneCall,
  Clock,
  ArrowLeft,
  ChevronRight,
  Bot,
  WifiOff,
  Wifi,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  MapPin,
  Star,
  UserCheck,
  ClipboardList,
  RotateCcw,
  Award,
  CheckSquare,
  Square,
  Plus,
  Bell,
  Navigation,
  Volume2,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  User,
  Home,
  Tractor,
  CalendarDays,
  FileText,
  Globe,
  Loader2,
} from "lucide-react";
import {
  Machine,
  RepairRequest,
  UrgencyType,
  InputMethod,
  AIDiagnosisResult,
  DiagnosisConversationMessage,
  JobCard,
  PartSelection,
  MachinePassportRecord,
  PhotoAnalysisResult,
  PricingBreakdown,
  PriceChangeReason,
  FinalPriceAdjustment,
  TechnicianCertification,
  TechnicianTrainingRecord,
  TechnicianVerificationBadge,
} from "@/types";
import {
  getMachines,
  getRepairRequests,
  createRepairRequest,
  syncPendingOutbox,
  getPendingComplaintsCount,
  updateRepairStatus,
  recordRepairVerification,
  reopenRepairForReRepair,
  registerNewMachine,
  markMachineServiceCompleted,
  initialMachines,
  initialRepairs,
  resetDemoData,
  seedRameshPatilDemoRepair,
} from "@/services/storageService";
import {
  formatServiceDateHi,
  getMaintenanceStatusDisplay,
  getDefaultMaintenanceItems,
  getDefaultServiceInterval,
  calculateNextServiceDate,
  calculateMaintenanceStatus,
} from "@/services/preventiveMaintenanceService";
import { runDemoAIDiagnosis } from "@/services/diagnosisService";
import { requestAIDiagnosis } from "@/services/aiAssistantService";
import { analyzeMachinePhoto } from "@/services/photoAnalysisService";
import { matchTechnician, TechnicianMatchResult, skillLabelHi, MatchedTechnicianItem } from "@/services/technicianMatchingService";
import {
  createJobCard,
  getJobCardByRepairId,
  updateJobCardStatus,
  updateTechnicianWorkflowStatus,
  updatePartSelection,
  getLatestJobCard,
  jobCardStatusToRepairStatusTextHi,
  completeJobCardRepair,
  recordJobCardVerification,
  reopenJobCardForReRepair,
  updateJobCardPricing,
} from "@/services/jobCardService";
import {
  calculateEstimatedPricing,
  calculateFinalPricing,
  calculatePartsCost,
  formatCurrencyHi,
  PRICE_CHANGE_REASONS,
  getMachineRate,
} from "@/services/pricingService";
import { Technician, mockTechnicians } from "@/services/technicianData";
import {
  getTechnicians,
  getTechnicianById,
  submitTechnicianCertification,
  addSelfDeclaredSkill,
  getVerificationBadgeDisplay,
  isCertificationExpired,
  deriveTechnicianVerificationStatus,
} from "@/services/certificationService";
import {
  FarmerLocation,
  getDefaultFarmerLocation,
  calculateTechnicianDistance,
  getRouteUrl,
  getSafeFarmerLocationText,
  formatApproxDistance,
} from "@/services/locationService";
import { TechnicianWorkflowStatus, TECHNICIAN_STATUS_LABELS_HI } from "@/types";
import { recommendSpareParts, SparePartRecommendationResult } from "@/services/sparePartRecommendationService";
import { SparePart, getSparePartById } from "@/services/sparePartData";
import { getPendingSyncCount, getSyncQueue, resetSyncQueue } from "@/services/syncQueueService";
import SyncManager from "@/services/syncManager";
import { MockBackendProvider, setBackendProvider, getBackendProvider } from "@/services/backendProvider";
import { DEMO_OIL_LEAK_PHOTO_DATA_URL, PRIMARY_DEMO_SCENARIO } from "@/services/demoData";
import dynamic from "next/dynamic";
import LoginScreen from "./LoginScreen";
import WelcomeScreen from "./WelcomeScreen";
import TechnicianDashboard from "./TechnicianDashboard";
import ProfileScreen from "./ProfileScreen";
import VoiceHelpAssistant from "@/components/VoiceHelpAssistant";
import KisanHelpScreen from "@/components/KisanHelpScreen";
import JobReadyVerificationScreen from "@/components/JobReadyVerificationScreen";
import { VoiceAssistantStatus } from "@/types/voiceAssistant";
import { JobReadinessRecord } from "@/types";
import {
  getJobReadinessForRepair,
  saveJobReadinessRecord,
} from "@/services/jobReadinessService";
import {
  AuthSession,
  UserRole,
  getStoredSession,
  clearStoredSession,
  isTechnicianRole,
  isFarmerRole,
  fetchCurrentAuthProfile,
} from "@/services/authService";

// P2K Step 1: Dynamically import map component (client-only; Leaflet uses window)
const NearbyMechanicsMap = dynamic(() => import("./NearbyMechanicsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20 text-slate-500">
      <span className="text-base font-bold">नक्शा लोड हो रहा है...</span>
    </div>
  ),
});


// P2Q & P2P: Recovery Engine, Telephony & Assisted Access imports
import {
  RecoveryPlan,
  RecoveryOption,
  SMSNotification,
  ComplaintChannel,
  ServiceCentre,
  MaintenancePackage,
} from "@/types";
import {
  generateRecoveryPlan,
  getFeaturePhoneRecoverySummary,
  contributeToMachinePassport,
} from "@/services/recoveryEngineService";
import {
  processIVRInput,
  lookupCallerIdentity,
  getSMSNotificationHistory,
  dispatchSimulatedSMS,
  IVRStepState,
} from "@/services/telephonyProvider";
import { createAssistedRepair } from "@/services/assistedAccessService";
import {
  getServiceCentres,
  getServiceCentreById,
  getCentreTypeLabelHi,
  getServiceCentreVerificationBadge,
} from "@/services/serviceCentreService";
import {
  DEMO_MAINTENANCE_PACKAGES,
  getPlatformBusinessSummary,
  calculateTechnicianSettlement,
  calculateServiceCentreSettlement,
} from "@/services/businessModelService";
import {
  t,
  SUPPORTED_LANGUAGES,
  LanguageCode,
  getStoredLanguage,
  setStoredLanguage,
  hasChosenLanguage,
  isRTL,
  getSpeechRecognitionCode,
  localizeDiagnosisProblem,
} from "@/i18n";
import { getLocalizedSMSTemplate } from "@/services/telephonyProvider";

type ScreenType =
  | "home"
  | "machines"
  | "machine_detail"
  | "breakdown"
  | "breakdown_success"
  | "diagnosis"
  | "repair"
  | "service"
  | "sahayak"
  | "technician_match"
  | "technician_job_card"
  | "repair_verification"
  | "job_ready_verification"
  | "nearby_mechanics"
  | "recovery_engine"
  | "profile"
  | "kisan_help";

type SyncState = "idle" | "syncing" | "synced";

const MACHINE_IMAGE_MAP: Record<string, string> = {
  tractor: "/assets/images/mahindra-575-di.png",
  sprayer: "/assets/images/sprayer.png",
  water_pump: "/assets/images/water-pump.png",
  power_tiller: "/assets/images/power-tiller.png",
};

export default function AgriPulseApp() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("home");

  // Flow: App launch par hamesha First Welcome Screen show ho -> "शुरू करें" -> Login/Registration Page
  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(true);

  const prevScreenRef = useRef<ScreenType>(currentScreen);
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.screen) {
        prevScreenRef.current = e.state.screen;
        setCurrentScreen(e.state.screen);
      } else {
        prevScreenRef.current = "home";
        setCurrentScreen("home");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && currentScreen !== prevScreenRef.current) {
      window.history.pushState({ screen: currentScreen }, "");
      prevScreenRef.current = currentScreen;
    }
  }, [currentScreen]);

  const handleWelcomeGetStarted = () => {
    setShowWelcomeScreen(false);
  };

  // Voice AI Assistant with 1000 Q&A Knowledge Base
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState<boolean>(false);
  const [voiceAssistantStatus, setVoiceAssistantStatus] = useState<VoiceAssistantStatus>("idle");

  // Authenticated user session (Farmer vs Technician)
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    if (typeof window !== "undefined") {
      return getStoredSession();
    }
    return null;
  });

  const handleLogout = () => {
    clearStoredSession();
    setAuthSession(null);
    setShowWelcomeScreen(true);
    setCurrentScreen("home");
  };

  // P2-AUTH: Active session validation against backend (/api/auth/me) on mount & refresh
  useEffect(() => {
    if (authSession?.token) {
      fetchCurrentAuthProfile(authSession.token)
        .then((res) => {
          if (res.success && res.user) {
            setAuthSession((prev) => {
              if (!prev) return null;
              const backendRole: UserRole = isTechnicianRole(res.role || res.user?.role || prev.user.role)
                ? "technician"
                : "farmer";
              const updatedSession: AuthSession = {
                ...prev,
                user: {
                  ...prev.user,
                  ...res.user,
                  role: backendRole,
                },
              };
              try {
                localStorage.setItem("agripulse_auth_session_v1", JSON.stringify(updatedSession));
              } catch {}
              return updatedSession;
            });
          } else if (res.error === "http_401") {
            clearStoredSession();
            setAuthSession(null);
          }
        })
        .catch(() => {
          // Offline-first: maintain stored session when network is unreachable
        });
    }
  }, []);

  // Multilingual System State (Section 1 & 2)
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("agripulse_preferred_lang_v1");
        if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
          return stored as LanguageCode;
        }
      } catch {
        // ignore
      }
    }
    return "hi";
  });
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState<boolean>(false);
  const [showMoreLanguages, setShowMoreLanguages] = useState<boolean>(false);

  // Network connectivity and sync state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  // P2J Step 1: Sync debug panel (dev/test helper)
  const [showSyncDebug, setShowSyncDebug] = useState<boolean>(false);
  const [syncDebugLog, setSyncDebugLog] = useState<string[]>([]);
  const [isSimulatingFailure, setIsSimulatingFailure] = useState<boolean>(false);
  const [syncQueueSnapshot, setSyncQueueSnapshot] = useState<ReturnType<typeof getSyncQueue>>([]);

  // Persistent dynamic states
  const [machines, setMachines] = useState<Machine[]>(initialMachines);
  const [repairs, setRepairs] = useState<RepairRequest[]>(initialRepairs);
  const [selectedMachine, setSelectedMachine] = useState<Machine>(initialMachines[0]);

  // Breakdown guided flow state (Step 1 -> 2 -> 3 -> 4)
  const [breakdownStep, setBreakdownStep] = useState<1 | 2 | 3 | 4>(1);
  const [breakdownMachineId, setBreakdownMachineId] = useState<string>("tractor");
  const [breakdownInputMethod, setBreakdownInputMethod] = useState<InputMethod>("voice");
  const [breakdownMediaName, setBreakdownMediaName] = useState<string>("");
  const [breakdownDescription, setBreakdownDescription] = useState<string>("");
  const [breakdownUrgency, setBreakdownUrgency] = useState<UrgencyType>("today");
  const [lastSubmittedRepair, setLastSubmittedRepair] = useState<RepairRequest | null>(null);

  // Phase 2C: Voice Recording & Speech Recognition State
  const [isVoiceRecording, setIsVoiceRecording] = useState<boolean>(false);
  const [voiceStatusText, setVoiceStatusText] = useState<string>("");
  const [speechUnsupportedMessage, setSpeechUnsupportedMessage] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Phase 2C: Photo Capture, Compressed DataURL Preview & Validation
  const [breakdownPhotoPreview, setBreakdownPhotoPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Phase P2I Step 2: YOLO Vision & Photo Analysis State
  const [photoVisionResult, setPhotoVisionResult] = useState<PhotoAnalysisResult | null>(null);
  const [isPhotoAnalyzing, setIsPhotoAnalyzing] = useState<boolean>(false);

  // Hidden file inputs for photo & video
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Kisan Sahayak assistant state (Phase 2C Voice & Photo)
  const [sahayakStep, setSahayakStep] = useState<
    "init" | "voice" | "photo" | "urgency" | "ready"
  >("init");
  const [sahayakChoice, setSahayakChoice] = useState<"voice" | "photo" | "machine" | null>(null);
  const [sahayakUrgency, setSahayakUrgency] = useState<UrgencyType | null>(null);
  const [sahayakVoiceActive, setSahayakVoiceActive] = useState<boolean>(false);
  const [sahayakDescription, setSahayakDescription] = useState<string>("");
  const [sahayakPhoto, setSahayakPhoto] = useState<string | null>(null);
  const [sahayakSpeechUnsupported, setSahayakSpeechUnsupported] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sahayakRecognitionRef = useRef<any>(null);
  const sahayakExplicitStopRef = useRef<boolean>(false);
  const sahayakPhotoInputRef = useRef<HTMLInputElement>(null);

  // Phase 2D-A: AI Diagnosis Foundation State
  const [currentDiagnosis, setCurrentDiagnosis] = useState<AIDiagnosisResult | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [showDiagnosisDetails, setShowDiagnosisDetails] = useState<boolean>(false);
  const [diagnosisOrigin, setDiagnosisOrigin] = useState<"breakdown" | "sahayak">("breakdown");
  const [diagnosisConversationHistory, setDiagnosisConversationHistory] = useState<DiagnosisConversationMessage[]>([]);
  const [followUpAnswerText, setFollowUpAnswerText] = useState<string>("");

  // Phase P2E: Technician Matching State
  const [techMatchResult, setTechMatchResult] = useState<TechnicianMatchResult | null>(null);
  const [isFindingTech, setIsFindingTech] = useState<boolean>(false);
  const [selectedAlternativeIdx, setSelectedAlternativeIdx] = useState<number | null>(null);
  const [currentJobCard, setCurrentJobCard] = useState<JobCard | null>(null);
  const [activeJobCardRepairId, setActiveJobCardRepairId] = useState<string | null>(null);

  // P2K Step 1 & 2: Map & Dispatch State
  const [mapPreselectedTech, setMapPreselectedTech] = useState<Technician | null>(null);
  const [farmerLocation, setFarmerLocation] = useState<FarmerLocation | null>(null);
  const [isAssigningTechnician, setIsAssigningTechnician] = useState<boolean>(false);

  // ─── JOB-READY VERIFICATION STATE ────────────────────────────────────────
  const [currentJobReadinessRecord, setCurrentJobReadinessRecord] =
    useState<JobReadinessRecord | null>(null);


  // P2M Step 1: Farmer-Friendly Voice, Sahayak, and Input states
  const [voiceRecordedComplete, setVoiceRecordedComplete] = useState<boolean>(false);
  const [activeProblemMode, setActiveProblemMode] = useState<"photo" | "voice" | "text">("voice");
  const [sahayakQuestionAnswer, setSahayakQuestionAnswer] = useState<{
    question: string;
    answer: string;
  } | null>(null);
  const [sahayakInputMode, setSahayakInputMode] = useState<"voice" | "text">("voice");
  const [sahayakCustomText, setSahayakCustomText] = useState<string>("");

  const playAudioText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getSpeechRecognitionCode(currentLanguage);
        window.speechSynthesis.speak(utterance);
      } catch {
        // Safe fallback if TTS unsupported
      }
    }
  };

  // Farmer Voice UX State for AI Diagnosis (Web Speech API)
  const [diagnosisVoiceState, setDiagnosisVoiceState] = useState<"idle" | "speaking" | "paused" | "blocked">("idle");
  const lastSpokenDiagIdRef = useRef<string | null>(null);

  const getDiagnosisVoiceScript = useCallback((diag: AIDiagnosisResult | null): string => {
    if (!diag) return "";
    if (diag.voiceSummary && diag.voiceSummary.trim().length > 0) {
      return diag.voiceSummary;
    }
    const isEn = currentLanguage === "en";
    const prob = diag.farmerProblem || localizeDiagnosisProblem(diag.possibleProblem, currentLanguage);
    const steps = (diag.farmerSteps && diag.farmerSteps.length > 0)
      ? diag.farmerSteps.join(" ")
      : (diag.immediateActions && diag.immediateActions.length > 0)
      ? diag.immediateActions.join(" ")
      : "";
    const avoid = (diag.farmerAvoid && diag.farmerAvoid.length > 0)
      ? (isEn ? `Important: ${diag.farmerAvoid.join(" ")}` : `ध्यान रखें: ${diag.farmerAvoid.join(" ")}`)
      : "";
    const mech = diag.whenToCallMechanic || "";

    if (isEn) {
      return `Farmer friend, ${prob}. ${avoid} ${steps} ${mech}`.trim();
    }
    return `किसान जी, ${prob}। ${avoid} ${steps} ${mech}`.trim();
  }, [currentLanguage]);

  const speakDiagnosisVoice = useCallback((customText?: string, userTriggered: boolean = false) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setDiagnosisVoiceState("blocked");
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const scriptToSpeak = customText || getDiagnosisVoiceScript(currentDiagnosis);
      if (!scriptToSpeak) return;

      const utterance = new SpeechSynthesisUtterance(scriptToSpeak);
      const speechCode = getSpeechRecognitionCode(currentLanguage) || (currentLanguage === "en" ? "en-IN" : "hi-IN");
      utterance.lang = speechCode;
      utterance.rate = 0.92; // Natural, clear pace for farmers
      utterance.pitch = 1.0;

      // Select localized voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const exactVoice = voices.find((v) => v.lang === speechCode || v.lang.replace("_", "-") === speechCode);
        const langVoice = voices.find((v) => v.lang.startsWith(currentLanguage));
        const indianVoice = voices.find((v) => v.lang.includes("IN"));
        if (exactVoice) {
          utterance.voice = exactVoice;
        } else if (langVoice) {
          utterance.voice = langVoice;
        } else if (indianVoice) {
          utterance.voice = indianVoice;
        }
      }

      utterance.onstart = () => {
        setDiagnosisVoiceState("speaking");
      };

      utterance.onpause = () => {
        setDiagnosisVoiceState("paused");
      };

      utterance.onresume = () => {
        setDiagnosisVoiceState("speaking");
      };

      utterance.onend = () => {
        setDiagnosisVoiceState("idle");
      };

      utterance.onerror = (e) => {
        if (e.error === "canceled" || e.error === "interrupted") {
          setDiagnosisVoiceState("idle");
        } else {
          setDiagnosisVoiceState(userTriggered ? "idle" : "blocked");
        }
      };

      window.speechSynthesis.speak(utterance);

      // Check if browser autoplay restriction prevented speech
      if (!userTriggered) {
        setTimeout(() => {
          if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            setDiagnosisVoiceState((prev) => (prev === "speaking" ? prev : "blocked"));
          }
        }, 500);
      }
    } catch {
      setDiagnosisVoiceState("blocked");
    }
  }, [currentDiagnosis, currentLanguage, getDiagnosisVoiceScript]);

  const pauseDiagnosisVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.pause();
        setDiagnosisVoiceState("paused");
      } catch {
        // Safe fallback
      }
    }
  };

  const resumeDiagnosisVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.resume();
        setDiagnosisVoiceState("speaking");
      } catch {
        speakDiagnosisVoice(undefined, true);
      }
    }
  };

  const stopDiagnosisVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        setDiagnosisVoiceState("idle");
      } catch {
        // Safe fallback
      }
    }
  };

  const replayDiagnosisVoice = () => {
    speakDiagnosisVoice(undefined, true);
  };

  // Automatically start speaking the result once after the diagnosis is ready
  useEffect(() => {
    if (
      currentScreen === "diagnosis" &&
      !isDiagnosing &&
      currentDiagnosis &&
      lastSpokenDiagIdRef.current !== currentDiagnosis.id
    ) {
      lastSpokenDiagIdRef.current = currentDiagnosis.id;
      const timer = setTimeout(() => {
        speakDiagnosisVoice(undefined, false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, isDiagnosing, currentDiagnosis, speakDiagnosisVoice]);

  // Clean up speech synthesis when leaving diagnosis screen or unmounting
  useEffect(() => {
    if (currentScreen !== "diagnosis") {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setDiagnosisVoiceState("idle");
    }
  }, [currentScreen]);

  const handleSelectLanguage = (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    setStoredLanguage(lang);
    setIsLanguageModalOpen(false);
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    setFeedbackMessage(
      lang === "en" ? "✓ Language changed to English" :
      lang === "mr" ? "✓ भाषा मराठीमध्ये बदलली" :
      lang === "te" ? "✓ భాష తెలుగుగా మార్చబడింది" :
      lang === "pa" ? "✓ ਭਾਸ਼ਾ ਪੰਜਾਬੀ ਵਿੱਚ ਬਦਲ ਗਈ" :
      lang === "gu" ? "✓ ભાષા ગુજરાતીમાં બદલાઈ" :
      lang === "ta" ? "✓ மொழி தமிழில் மாற்றப்பட்டது" :
      lang === "ur" ? "✓ زبان تبدیل ہو گئی" :
      `✓ भाषा: ${langObj?.nativeName || lang}`
    );
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Phase P2F: Spare Part Recommendation State
  const [currentPartRecommendation, setCurrentPartRecommendation] =
    useState<SparePartRecommendationResult | null>(null);

  // P2O Step 2: Transparent Pricing State
  const [priceAdjustmentReason, setPriceAdjustmentReason] =
    useState<PriceChangeReason>("अतिरिक्त श्रम आवश्यक");
  const [customPriceNote, setCustomPriceNote] = useState<string>("");
  const [techLabourFeeOverride, setTechLabourFeeOverride] = useState<number | null>(null);
  const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);

  // P2Q: Human Override for Diagnosis (Technician Inspection)
  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState<boolean>(false);
  const [techOverrideDiagnosisInput, setTechOverrideDiagnosisInput] = useState<string>("");

  // P2O Step 3: Technician Training & Certification State
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState<boolean>(false);
  const [activeModalTech, setActiveModalTech] = useState<Technician | null>(null);
  const [newCertName, setNewCertName] = useState<string>("");
  const [newCertCategory, setNewCertCategory] = useState<string>("Tractor");
  const [newCertOrg, setNewCertOrg] = useState<string>("");
  const [newCertExpiry, setNewCertExpiry] = useState<string>("");
  const [newSelfSkill, setNewSelfSkill] = useState<string>("");
  const [isSubmittingCert, setIsSubmittingCert] = useState<boolean>(false);

  // ─── P2Q & P2P: Recovery Engine, Telephony & Assisted Access State ────────
  const [activeRecoveryPlan, setActiveRecoveryPlan] = useState<RecoveryPlan | null>(null);
  const [selectedRecoveryOption, setSelectedRecoveryOption] = useState<RecoveryOption | null>(null);
  const [isFeaturePhoneModalOpen, setIsFeaturePhoneModalOpen] = useState<boolean>(false);
  const [ivrState, setIvrState] = useState<IVRStepState>({
    step: "main_menu",
    callerPhone: "9876543210",
    audioPromptHi: "YANTRIQ किसान हेल्पलाइन में आपका स्वागत है। मशीन मरम्मत के लिए 1 दबाएं, शिकायत की स्थिति जानने के लिए 2 दबाएं, मैकेनिक से सीधे बात करने के लिए 3 दबाएं।",
    options: [
      { key: "1", labelHi: "मशीन मरम्मत", actionTextHi: "1: मशीन मरम्मत" },
      { key: "2", labelHi: "शिकायत स्थिति", actionTextHi: "2: स्थिति जांचें" },
      { key: "3", labelHi: "मैकेनिक संपर्क", actionTextHi: "3: मैकेनिक संपर्क" },
    ],
  });
  const [isSmsDrawerOpen, setIsSmsDrawerOpen] = useState<boolean>(false);
  const [isAssistedModalOpen, setIsAssistedModalOpen] = useState<boolean>(false);
  const [assistedFarmerName, setAssistedFarmerName] = useState<string>("रामेश्वर पाटिल");
  const [assistedFarmerPhone, setAssistedFarmerPhone] = useState<string>("9823001122");
  const [assistedMachineId, setAssistedMachineId] = useState<string>("tractor");
  const [assistedProblemText, setAssistedProblemText] = useState<string>("हाइड्रोलिक लिफ्ट ऊपर नहीं उठ रही");
  const [isServiceCentreModalOpen, setIsServiceCentreModalOpen] = useState<boolean>(false);
  const [selectedServiceCentreModal, setSelectedServiceCentreModal] = useState<ServiceCentre | null>(null);
  const [isBusinessSummaryModalOpen, setIsBusinessSummaryModalOpen] = useState<boolean>(false);

  // Farmer feedback toast
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Phase P2G Step 2: Preventive Maintenance & Service Reminder State
  const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState<boolean>(false);
  const [newMachineType, setNewMachineType] = useState<string>("tractor");
  const [newMachineName, setNewMachineName] = useState<string>("");
  const [checkedChecklistItems, setCheckedChecklistItems] = useState<Record<string, boolean>>({});

  const handleToggleChecklistItem = (item: string) => {
    setCheckedChecklistItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handleCompleteService = (machineId: string) => {
    const updated = markMachineServiceCompleted(machineId);
    if (updated) {
      setSelectedMachine(updated);
      refreshData();
      setCheckedChecklistItems({});
      setFeedbackMessage("✅ सर्विस पूरी हो गई! अगली सर्विस की तारीख अपडेट हो गई।");
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  const handleRegisterMachineSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let defaultHi = "नया महिंद्रा ट्रैक्टर";
    let defaultEn = "Tractor";
    if (newMachineType === "sprayer") {
      defaultHi = "नया स्प्रेयर";
      defaultEn = "Sprayer";
    } else if (newMachineType === "water_pump") {
      defaultHi = "नया वाटर पंप";
      defaultEn = "Water Pump";
    } else if (newMachineType === "power_tiller") {
      defaultHi = "नया पावर टिलर";
      defaultEn = "Power Tiller";
    }

    const finalName = newMachineName.trim() || defaultHi;
    const newMachine = registerNewMachine({
      name: defaultEn,
      nameHi: finalName,
      type: newMachineType,
    });

    refreshData();
    setIsAddMachineModalOpen(false);
    setNewMachineName("");
    setSelectedMachine(newMachine);
    setCheckedChecklistItems({});
    setCurrentScreen("machine_detail");
    setFeedbackMessage(`✅ नई मशीन (${newMachine.nameHi}) सफलतापूर्वक जोड़ी गई! अगली सर्विस तय की गई।`);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Sync state helper
  const refreshData = () => {
    try {
      const storedMachines = getMachines();
      const storedRepairs = getRepairRequests();
      setMachines(storedMachines);
      setRepairs(storedRepairs);
    } catch {
      // Safe fallback
    }
  };

  // P2N: Demo reset function for judges / presenters / clean testing
  const handleResetDemo = () => {
    resetDemoData();
    refreshData();
    setCurrentJobCard(null);
    setLastSubmittedRepair(null);
    setBreakdownDescription("");
    setBreakdownMediaName("");
    setBreakdownPhotoPreview(null);
    setValidationError(null);
    setSpeechUnsupportedMessage(null);
    setIsVoiceRecording(false);
    setVoiceRecordedComplete(false);
    setPhotoVisionResult(null);
    setCurrentDiagnosis(null);
    setBreakdownStep(1);
    setSelectedMachine(initialMachines[0]);
    setCurrentScreen("home");
    setFeedbackMessage("✅ सिस्टम डेटा रीसेट सफल — प्रारंभिक स्थिति लोड की गई");
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Trigger automatic sync for pending complaints & cloud sync queue (P2J Step 1)
  const triggerAutoSync = async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;
    const pendingCount = getPendingComplaintsCount() + getPendingSyncCount();
    if (pendingCount === 0) return;

    // Show "इंटरनेट मिल गया। डेटा भेजा जा रहा है।"
    setSyncState("syncing");

    try {
      const result = await syncPendingOutbox();
      const syncResult = await SyncManager.runSync(true);
      refreshData();
      setSyncQueueSnapshot(getSyncQueue());

      if (result.success && syncResult.success) {
        setSyncState("synced");
        setTimeout(() => setSyncState("idle"), 3500);
      } else {
        setSyncState("idle");
      }
    } catch {
      // On failure: do NOT delete local data. Keep everything pending for retry.
      setSyncState("idle");
    }
  };

  // 1. Initial Load, Native Online/Offline Detection & Auto-Sync
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        triggerAutoSync();
      };

      const handleOffline = () => {
        setIsOnline(false);
        setSyncState("idle");
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Hackathon live demo reactive listeners: storage, custom event & broadcast channel
      const handleStorageUpdate = (e: StorageEvent) => {
        if (!e.key || e.key.includes("agripulse_repairs") || e.key.includes("agripulse_job_cards") || e.key.includes("agripulse_machines")) {
          refreshData();
        }
      };
      window.addEventListener("storage", handleStorageUpdate);

      const handleCustomRepairUpdate = () => {
        refreshData();
      };
      window.addEventListener("agripulse:repair_updated", handleCustomRepairUpdate);

      let broadcastChan: BroadcastChannel | null = null;
      try {
        if (typeof BroadcastChannel !== "undefined") {
          broadcastChan = new BroadcastChannel("agripulse_channel");
          broadcastChan.onmessage = () => {
            refreshData();
          };
        }
      } catch {
        // BroadcastChannel fallback
      }

      // Fast sync interval so the farmer never needs to manually refresh during technician status changes
      const liveSyncTimer = setInterval(() => {
        refreshData();
      }, 1500);

      // Load initial local data
      refreshData();

      // Multilingual: Load saved language or prompt first-launch selection modal
      const savedLang = getStoredLanguage();
      setCurrentLanguage(savedLang);
      if (!hasChosenLanguage()) {
        setIsLanguageModalOpen(true);
      }

      // Check for pending complaints on mount if online
      if (navigator.onLine) {
        triggerAutoSync();
      }

      // Auto-retry periodic timer every 20 seconds — watches BOTH complaint outbox and cloud sync queue
      const retryTimer = setInterval(() => {
        if (navigator.onLine && (getPendingComplaintsCount() + getPendingSyncCount()) > 0) {
          triggerAutoSync();
        }
      }, 20000);

      // P2J Step 1: Also init SyncManager auto-sync (handles "online" event internally)
      const cleanupSyncManager = SyncManager.initAutoSync();
      // Initial queue snapshot for debug panel
      setSyncQueueSnapshot(getSyncQueue());

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("storage", handleStorageUpdate);
        window.removeEventListener("agripulse:repair_updated", handleCustomRepairUpdate);
        if (broadcastChan) {
          try {
            broadcastChan.close();
          } catch {}
        }
        clearInterval(liveSyncTimer);
        clearInterval(retryTimer);
        cleanupSyncManager();
      };
    }
  }, []);

  // Navigate to Machine Details
  const handleOpenMachineDetail = (machine: Machine) => {
    const all = getMachines();
    const fresh = all.find((m) => m.id === machine.id) || machine;
    setSelectedMachine(fresh);
    setCheckedChecklistItems({});
    setCurrentScreen("machine_detail");
  };

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
      if (sahayakRecognitionRef.current) {
        try {
          sahayakRecognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Phase 2C: Speech Recognition Start Handler
  const startVoiceRecording = () => {
    setValidationError(null);
    setSpeechUnsupportedMessage(null);

    if (typeof window === "undefined") return;

    // Check browser speech recognition API support
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: any;
      webkitSpeechRecognition?: any;
    };
    const SpeechRecognitionClass =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechUnsupportedMessage(
        "आवाज़ की सुविधा इस फोन में उपलब्ध नहीं है। कृपया समस्या लिखें।"
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Safe fallback
        }
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = getSpeechRecognitionCode(currentLanguage);
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsVoiceRecording(true);
        setVoiceRecordedComplete(false);
        setVoiceStatusText("🎤 सुन रहे हैं...");
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setBreakdownDescription(transcript);
          setBreakdownInputMethod("voice");
        }
      };

      recognition.onerror = (event: any) => {
        setIsVoiceRecording(false);
        setVoiceStatusText("");
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSpeechUnsupportedMessage(
            "माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया समस्या लिखें।"
          );
        } else {
          setSpeechUnsupportedMessage(
            "आवाज़ की सुविधा इस फोन में उपलब्ध नहीं है। कृपया समस्या लिखें।"
          );
        }
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
        setVoiceStatusText("");
        setVoiceRecordedComplete(true);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsVoiceRecording(false);
      setSpeechUnsupportedMessage(
        "आवाज़ की सुविधा इस फोन में उपलब्ध नहीं है। कृपया समस्या लिखें।"
      );
    }
  };

  // Phase 2C: Speech Recognition Stop Handler
  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Safe fallback
      }
    }
    setIsVoiceRecording(false);
    setVoiceStatusText("");
    setVoiceRecordedComplete(true);
  };

  // Intelligent Step-by-Step Diagnosis: Follow-up voice recording for AI questions
  const startFollowUpVoiceRecording = () => {
    if (typeof window === "undefined") return;
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: any;
      webkitSpeechRecognition?: any;
    };
    const SpeechRecognitionClass =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechUnsupportedMessage(
        currentLanguage === "en"
          ? "Voice input not supported on this browser. Please type."
          : "आवाज़ की सुविधा इस फोन में उपलब्ध नहीं है। कृपया लिखकर बताएं।"
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Safe fallback
        }
      }
      const recognition = new SpeechRecognitionClass();
      recognition.lang = getSpeechRecognitionCode(currentLanguage);
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsVoiceRecording(true);
        setVoiceStatusText("🎤 उत्तर सुन रहे हैं...");
      };
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setFollowUpAnswerText(transcript);
        }
      };
      recognition.onerror = () => {
        setIsVoiceRecording(false);
        setVoiceStatusText("");
      };
      recognition.onend = () => {
        setIsVoiceRecording(false);
        setVoiceStatusText("");
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsVoiceRecording(false);
      setVoiceStatusText("");
    }
  };

  // Intelligent Step-by-Step Diagnosis: Submit answer to follow-up question
  const handleAnswerDiagnosisQuestion = async (
    answerText: string,
    newPhotoBase64?: string
  ) => {
    if (!answerText.trim() && !newPhotoBase64) return;

    const existingHistory: DiagnosisConversationMessage[] = [
      ...diagnosisConversationHistory,
    ];
    if (currentDiagnosis?.question) {
      existingHistory.push({
        role: "assistant",
        content: currentDiagnosis.question,
      });
    }
    existingHistory.push({
      role: "farmer",
      content: answerText.trim() || (newPhotoBase64 ? "मशीन की नई साफ फोटो संलग्न की है" : ""),
    });
    setDiagnosisConversationHistory(existingHistory);

    setIsDiagnosing(true);

    const machine =
      diagnosisOrigin === "breakdown"
        ? machines.find((m) => m.id === breakdownMachineId) || machines[0]
        : machines.find((m) => m.id === "tractor") || machines[0];

    const activePhoto =
      newPhotoBase64 ||
      (diagnosisOrigin === "breakdown" ? breakdownPhotoPreview : sahayakPhoto);

    const combinedComplaint = `${breakdownDescription || sahayakDescription} | उत्तर: ${answerText.trim()}`;

    const diag = await requestAIDiagnosis(
      {
        machine,
        problemDescription: combinedComplaint,
        hasPhoto: !!activePhoto,
        photoAnalysis: currentDiagnosis?.photoAnalysis,
        urgency: breakdownUrgency || sahayakUrgency || "today",
        language: currentLanguage,
        imageBase64: activePhoto || null,
        conversationHistory: existingHistory,
      },
      isOnline
    );

    setCurrentDiagnosis(diag);
    setFollowUpAnswerText("");
    setTimeout(() => {
      setIsDiagnosing(false);
    }, 1200);
  };

  // P2M Step 1: Sahayak Quick Prompts Handler
  const handleSahayakAskPrompt = (promptText: string) => {
    let answerText = "";
    const lower = promptText.toLowerCase();

    if (lower.includes("कहाँ तक") || lower.includes("मरम्मत")) {
      const activeRep = repairs.find(
        (r) => r.status !== "completed"
      ) || latestRepair;
      if (activeRep && activeRep.status !== "completed") {
        answerText = `${activeRep.machineNameHi}: वर्तमान स्थिति - ${activeRep.statusTextHi}। आपके नजदीकी मैकेनिक को सूचना दी गई है।`;
      } else {
        answerText = "आपकी किसी भी मशीन में अभी कोई मरम्मत बाकी नहीं है। आपकी सभी मशीनें ठीक से काम कर रही हैं।";
      }
    } else if (lower.includes("सर्विस") || lower.includes("अगली")) {
      const overdueM = machines.find((m) => m.maintenanceStatus === "overdue");
      const dueM = machines.find((m) => m.maintenanceStatus === "due");
      const nextM = overdueM || dueM || machines[0];
      if (overdueM) {
        answerText = `🔔 सर्विस का समय आ गया है: ${overdueM.nameHi} (तय तारीख: ${formatServiceDateHi(overdueM.nextServiceDate)})। कृपया जल्द सर्विस कराएं।`;
      } else if (dueM) {
        answerText = `🔔 सर्विस का समय आ गया है: ${dueM.nameHi} की अगली सर्विस ${formatServiceDateHi(dueM.nextServiceDate)} को तय है।`;
      } else if (nextM) {
        answerText = `${nextM.nameHi}: अगली सर्विस ${formatServiceDateHi(nextM.nextServiceDate)} को है।`;
      } else {
        answerText = "आपकी सभी मशीनों का सर्विस रिकॉर्ड अद्यतन है।";
      }
    } else if (lower.includes("क्या समस्या") || lower.includes("समस्या थी")) {
      const lastRep = repairs[0];
      if (lastRep) {
        answerText = `${lastRep.machineNameHi} में समस्या: ${lastRep.diagnosis?.possibleProblem || lastRep.problemDescription}।`;
      } else {
        answerText = "आपकी मशीनों में कोई बड़ी समस्या नहीं पाई गई है।";
      }
    } else if (lower.includes("क्या करना चाहिए") || lower.includes("सलाह")) {
      answerText = "यदि मशीन में धुआं, असामान्य आवाज या लीकेज हो, तो इंजन तुरंत बंद कर दें। मैकेनिक के आने तक खुद कोई भारी पुर्जा न खोलें।";
    } else {
      answerText = `किसान जी, आपकी बात नोट कर ली गई है: "${promptText}"। आप सीधे "मशीन में समस्या है" दबाकर मैकेनिक बुला सकते हैं।`;
    }

    setSahayakQuestionAnswer({
      question: promptText,
      answer: answerText,
    });
  };

  // Start breakdown reporting
  const handleStartBreakdown = (machineId?: string) => {
    setBreakdownMachineId(machineId || "tractor");
    setBreakdownStep(1);
    setBreakdownDescription("");
    setBreakdownMediaName("");
    setBreakdownPhotoPreview(null);
    setValidationError(null);
    setSpeechUnsupportedMessage(null);
    setIsVoiceRecording(false);
    setVoiceRecordedComplete(false);
    setActiveProblemMode("voice");
    setVoiceStatusText("");
    setBreakdownInputMethod("voice");
    setPhotoVisionResult(null);
    setCurrentDiagnosis(null);
    setBreakdownUrgency("today");
    setCurrentScreen("breakdown");
  };

  // Phase P2I Step 2: Trigger Vision Analysis (YOLO-compatible / Mock)
  const runPhotoVisionAnalysis = async (imageDataUrl: string, fileName?: string) => {
    setIsPhotoAnalyzing(true);
    setPhotoVisionResult(null);
    try {
      const machine = machines.find((m) => m.id === breakdownMachineId) || machines[0];
      const result = await analyzeMachinePhoto({
        image: imageDataUrl,
        machineType: machine?.type || machine?.nameHi || "मशीन",
        complaintText: breakdownDescription.trim(),
        fileName: fileName || breakdownMediaName || "मशीन_फोटो.jpg",
      });
      setPhotoVisionResult(result);
    } catch {
      // Offline fallback: never crash!
      setPhotoVisionResult({
        isClear: false,
        detectedIssue: "फोटो से समस्या स्पष्ट नहीं हो पाई।",
        confidence: 0,
        evidence: ["फोटो से समस्या स्पष्ट नहीं हो पाई।"],
        actionHint: "आप बोलकर या लिखकर समस्या बता सकते हैं।",
        rawDetails: "Vision Provider Offline / Fallback",
        visionResult: {
          detected: false,
          detections: [],
          imageQuality: "good",
        },
      });
    } finally {
      setIsPhotoAnalyzing(false);
    }
  };

  // Phase 2C & P2I Step 2: Photo capture & Canvas compression (safe for localStorage)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setBreakdownMediaName(file.name || "मशीन_फोटो.jpg");
    setPhotoVisionResult(null);

    // Read and compress image using HTML5 Canvas (<60KB)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 640;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
            setBreakdownPhotoPreview(compressedDataUrl);
            if (!breakdownDescription.trim()) {
              setBreakdownInputMethod("photo");
            }
            // Trigger Vision Analysis (P2I Step 2)
            runPhotoVisionAnalysis(compressedDataUrl, file.name);
          }
        } catch {
          // Fallback to raw data url if canvas drawing fails
          if (typeof event.target?.result === "string") {
            const rawUrl = event.target.result;
            setBreakdownPhotoPreview(rawUrl);
            runPhotoVisionAnalysis(rawUrl, file.name);
          }
        }
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so farmer can re-take or re-pick if desired
    e.target.value = "";
  };

  // Remove attached photo
  const handleRemovePhoto = () => {
    setBreakdownPhotoPreview(null);
    setBreakdownMediaName("");
    setPhotoVisionResult(null);
    setIsPhotoAnalyzing(false);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  // Step 2 Validation and Navigation -> AI Diagnosis (Phase 2D-A & P2I Step 2)
  const handleStep2Next = () => {
    const hasText = breakdownDescription.trim().length > 0;
    const hasPhoto = !!breakdownPhotoPreview;

    if (!hasText && !hasPhoto) {
      setValidationError("कृपया बोलकर बताएं, फोटो लें, या समस्या लिखें।");
      return;
    }

    // Requirement 8: If image quality is poor and no text description, prompt farmer
    if (hasPhoto && photoVisionResult?.imageQuality === "poor" && !hasText) {
      setValidationError("फोटो साफ नहीं है। एक और फोटो लें।");
      return;
    }

    setValidationError(null);
    if (hasText && hasPhoto) {
      setBreakdownInputMethod("voice");
    } else if (hasPhoto) {
      setBreakdownInputMethod("photo");
    } else {
      setBreakdownInputMethod("voice");
    }

    // Launch AI Diagnosis Screen
    setDiagnosisOrigin("breakdown");
    setIsDiagnosing(true);
    setShowDiagnosisDetails(false);
    setCurrentScreen("diagnosis");

    const machine = machines.find((m) => m.id === breakdownMachineId) || machines[0];

    // Phase 2D-B & P2I Step 2: Photo Analysis Pipeline
    (async () => {
      let photoResult = photoVisionResult || undefined;
      if (hasPhoto && breakdownPhotoPreview && !photoResult) {
        photoResult = await analyzeMachinePhoto({
          image: breakdownPhotoPreview,
          machineType: machine.type || machine.nameHi,
          complaintText: breakdownDescription.trim(),
          fileName: breakdownMediaName || "photo.jpg",
        });
        setPhotoVisionResult(photoResult);
      }

      const initialHistory: DiagnosisConversationMessage[] = [
        {
          role: "farmer",
          content:
            breakdownDescription.trim() ||
            (hasPhoto ? "मशीन की फोटो संलग्न है" : "मशीन में समस्या है"),
        },
      ];
      setDiagnosisConversationHistory(initialHistory);

      const diag = await requestAIDiagnosis(
        {
          machine,
          problemDescription: breakdownDescription.trim(),
          hasPhoto,
          photoAnalysis: photoResult,
          urgency: breakdownUrgency,
          // Gemini integration: pass selected language for localized response
          language: currentLanguage,
          // Gemini Vision: pass photo securely to the server-side Gemini route
          imageBase64: hasPhoto ? breakdownPhotoPreview : null,
          conversationHistory: initialHistory,
        },
        isOnline
      );
      setCurrentDiagnosis(diag);

      // Realistic progress animation timing (1.2s)
      setTimeout(() => {
        setIsDiagnosing(false);
      }, 1200);
    })();
  };

  // Handle Video capture/select
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBreakdownInputMethod("video");
      setBreakdownMediaName(file.name || "वीडियो रिकॉर्ड हुआ");
      setBreakdownStep(3);
    }
  };

  // Submit breakdown flow (Supports Offline Mode, Voice, Photo & Typed Complaints, AI Diagnosis)
  const handleBreakdownSubmit = () => {
    try {
      const description =
        breakdownDescription.trim() ||
        (breakdownPhotoPreview
          ? "फोटो के माध्यम से मशीन की समस्या भेजी गई"
          : "मशीन में समस्या आ रही है");

      const method: InputMethod =
        breakdownPhotoPreview && breakdownDescription.trim()
          ? "voice"
          : breakdownPhotoPreview
          ? "photo"
          : "voice";

      const machineObj = machines.find((m) => m.id === breakdownMachineId);
      const estCost = calculateEstimatedPricing({
        machineId: breakdownMachineId,
        machineType: machineObj?.type || machineObj?.nameHi,
        recommendedPartIds: currentPartRecommendation?.recommendations.map((r) => r.part.id),
      });

      const newRepair = createRepairRequest({
        farmerId: authSession?.user?.id || "farmer-001",
        machineId: breakdownMachineId,
        problemDescription: description,
        inputMethod: method,
        mediaFileName: breakdownMediaName || (breakdownPhotoPreview ? "मशीन_फोटो.jpg" : undefined),
        photoDataUrl: breakdownPhotoPreview || undefined,
        urgency: breakdownUrgency,
        isOffline: !isOnline,
        diagnosis: currentDiagnosis || undefined,
        estimatedCost: estCost,
        farmerLocation: farmerLocation || (authSession?.user?.location ? {
          latitude: authSession.user.location.latitude,
          longitude: authSession.user.location.longitude,
          locationSource: "gps",
          locationUpdatedAt: new Date().toISOString(),
          village: authSession.user.villageOrArea || "शाहपुर, लखनऊ",
        } : undefined),
      });

      refreshData();
      setLastSubmittedRepair(newRepair);
      // Reset breakdown wizard state so subsequent flows start fresh
      setBreakdownDescription("");
      setBreakdownMediaName("");
      setBreakdownPhotoPreview(null);
      setValidationError(null);
      setSpeechUnsupportedMessage(null);
      setIsVoiceRecording(false);
      setVoiceRecordedComplete(false);
      setPhotoVisionResult(null);
      setCurrentDiagnosis(null);
      setBreakdownStep(1);
      // P2E: Always go to technician match screen (works with local mock data even offline)
      handleFindTechnician(newRepair);
    } catch {
      setFeedbackMessage("अभी जानकारी नहीं मिल पाई। कृपया थोड़ी देर बाद कोशिश करें।");
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  // Phase 2C: Kisan Sahayak continuous voice recording
  const startSahayakVoice = () => {
    setSahayakSpeechUnsupported(null);
    sahayakExplicitStopRef.current = false;

    if (typeof window === "undefined") return;

    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: any;
      webkitSpeechRecognition?: any;
    };
    const SpeechRecognitionClass =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSahayakSpeechUnsupported(
        "आवाज़ की सुविधा इस फोन में उपलब्ध नहीं है। कृपया समस्या लिखें।"
      );
      setSahayakVoiceActive(false);
      return;
    }

    try {
      if (sahayakRecognitionRef.current) {
        try {
          sahayakRecognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = getSpeechRecognitionCode(currentLanguage);
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setSahayakVoiceActive(true);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        if (fullTranscript.trim()) {
          setSahayakDescription(fullTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech") {
          return;
        }
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSahayakSpeechUnsupported("माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया समस्या लिखें।");
          setSahayakVoiceActive(false);
        } else {
          setSahayakVoiceActive(false);
        }
      };

      recognition.onend = () => {
        // If the browser ends due to silence but farmer has not clicked stop,
        // keep text safe and re-engage if step is still voice
        if (!sahayakExplicitStopRef.current && sahayakStep === "voice") {
          try {
            recognition.start();
            return;
          } catch {
            setSahayakVoiceActive(false);
          }
        } else {
          setSahayakVoiceActive(false);
        }
      };

      sahayakRecognitionRef.current = recognition;
      recognition.start();
      setSahayakVoiceActive(true);
    } catch {
      setSahayakVoiceActive(false);
      setSahayakSpeechUnsupported(
        "आवाज़ की सुविधा इस फोन में उपलब्ध नहीं है। कृपया समस्या लिखें।"
      );
    }
  };

  const stopSahayakVoice = () => {
    sahayakExplicitStopRef.current = true;
    if (sahayakRecognitionRef.current) {
      try {
        sahayakRecognitionRef.current.stop();
      } catch {}
    }
    setSahayakVoiceActive(false);
  };

  // Sahayak choices handler
  const handleSahayakSelectOption = (choice: "voice" | "photo" | "machine") => {
    setSahayakChoice(choice);
    if (choice === "voice") {
      setSahayakStep("voice");
      startSahayakVoice();
    } else if (choice === "photo") {
      setSahayakStep("photo");
      setTimeout(() => {
        sahayakPhotoInputRef.current?.click();
      }, 150);
    } else {
      handleStartBreakdown();
    }
  };

  // Sahayak photo capture with canvas compression
  const handleSahayakPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 640;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", 0.7);
            setSahayakPhoto(compressed);
          }
        } catch {
          if (typeof event.target?.result === "string") {
            setSahayakPhoto(event.target.result);
          }
        }
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSahayakSelectUrgency = (urgency: UrgencyType) => {
    setSahayakUrgency(urgency);
    setSahayakStep("ready");
  };

  // Phase 2D-A: Sahayak Proceed to AI Diagnosis
  const handleSahayakProceedToDiagnosis = () => {
    stopSahayakVoice();
    const hasText = sahayakDescription.trim().length > 0;
    const hasPhoto = !!sahayakPhoto;

    if (!hasText && !hasPhoto) {
      setSahayakSpeechUnsupported("कृपया पहले बोलकर बताएं या फोटो लें।");
      return;
    }

    setDiagnosisOrigin("sahayak");
    setIsDiagnosing(true);
    setShowDiagnosisDetails(false);
    setCurrentScreen("diagnosis");

    const machineId =
      sahayakDescription.toLowerCase().includes("ट्रैक्टर") ||
      sahayakDescription.toLowerCase().includes("tractor")
        ? "tractor"
        : "sprayer";
    const machine = machines.find((m) => m.id === machineId) || machines[0];

    // Phase 2D-B: Photo Analysis Pipeline
    (async () => {
      let photoResult = undefined;
      if (hasPhoto && sahayakPhoto) {
        photoResult = await analyzeMachinePhoto({
          image: sahayakPhoto,
          machineType: machine.type || machine.nameHi,
          complaintText: sahayakDescription.trim(),
        });
      }

      const initialHistory: DiagnosisConversationMessage[] = [
        {
          role: "farmer",
          content:
            sahayakDescription.trim() ||
            (hasPhoto ? "मशीन की फोटो संलग्न है" : "मशीन में समस्या है"),
        },
      ];
      setDiagnosisConversationHistory(initialHistory);

      const diag = await requestAIDiagnosis(
        {
          machine,
          problemDescription: sahayakDescription.trim(),
          hasPhoto,
          photoAnalysis: photoResult,
          urgency: sahayakUrgency || "today",
          // Gemini integration: pass selected language for localized response
          language: currentLanguage,
          // Gemini Vision: pass photo securely to the server-side Gemini route
          imageBase64: hasPhoto && sahayakPhoto ? sahayakPhoto : null,
          conversationHistory: initialHistory,
        },
        isOnline
      );
      setCurrentDiagnosis(diag);

      setTimeout(() => {
        setIsDiagnosing(false);
      }, 1200);
    })();
  };

  // Phase 2D-A: "मैकेनिक बुलाएं" Action connects to the repair workflow
  const handleContinueToRepair = () => {
    if (diagnosisOrigin === "breakdown") {
      setCurrentScreen("breakdown");
      if (currentDiagnosis?.urgencyLevel === "high") {
        setBreakdownUrgency("today");
      }
      setBreakdownStep(3); // Urgency selection
    } else {
      setCurrentScreen("sahayak");
      if (currentDiagnosis?.urgencyLevel === "high") {
        setSahayakUrgency("today");
      }
      setSahayakStep("urgency");
    }
  };

  // Phase 2D-A: Back navigation from diagnosis screen
  const handleBackFromDiagnosis = () => {
    stopDiagnosisVoice();
    if (diagnosisOrigin === "breakdown") {
      setCurrentScreen("breakdown");
      setBreakdownStep(2);
    } else {
      setCurrentScreen("sahayak");
      setSahayakStep(
        sahayakChoice === "photo"
          ? "photo"
          : sahayakChoice === "voice"
          ? "voice"
          : "init"
      );
    }
  };

  const handleSahayakCallMechanic = () => {
    try {
      const description =
        sahayakDescription.trim() ||
        (sahayakPhoto
          ? "फोटो के माध्यम से मशीन की समस्या भेजी गई"
          : "किसान सहायक के माध्यम से मरम्मत का अनुरोध दर्ज हुआ");

      const method: InputMethod =
        sahayakPhoto && sahayakDescription.trim()
          ? "voice"
          : sahayakPhoto
          ? "photo"
          : "voice";

      const machineId =
        sahayakDescription.toLowerCase().includes("ट्रैक्टर") ||
        sahayakDescription.toLowerCase().includes("tractor")
          ? "tractor"
          : "sprayer";

      const newRepair = createRepairRequest({
        farmerId: authSession?.user?.id || "farmer-001",
        machineId,
        problemDescription: description,
        inputMethod: method,
        mediaFileName: sahayakPhoto ? "मशीन_फोटो.jpg" : undefined,
        photoDataUrl: sahayakPhoto || undefined,
        urgency: sahayakUrgency || "today",
        isOffline: !isOnline,
        diagnosis: currentDiagnosis || undefined,
        farmerLocation: farmerLocation || (authSession?.user?.location ? {
          latitude: authSession.user.location.latitude,
          longitude: authSession.user.location.longitude,
          locationSource: "gps",
          locationUpdatedAt: new Date().toISOString(),
          village: authSession.user.villageOrArea || "शाहपुर, लखनऊ",
        } : undefined),
      });

      refreshData();
      setLastSubmittedRepair(newRepair);
      setSahayakStep("init");
      setSahayakChoice(null);
      setSahayakUrgency(null);
      setSahayakDescription("");
      setSahayakPhoto(null);
      setSahayakVoiceActive(false);
      // P2E: Go to technician match screen
      handleFindTechnician(newRepair);
    } catch {
      setFeedbackMessage("अभी जानकारी नहीं मिल पाई। कृपया थोड़ी देर बाद कोशिश करें।");
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };


  // After sahayak or breakdown submit — find technician
  // (Called inside handleBreakdownSubmit and handleSahayakCallMechanic after repair is created)

  // ─── P2E: Technician Matching Handlers ───────────────────────────────────

  /**
   * Called after a repair request is created.
   * Launches the technician-finding animation, then shows the result.
   */
  const handleFindTechnician = (repair: RepairRequest) => {
    setIsFindingTech(true);
    setSelectedAlternativeIdx(null);
    setActiveJobCardRepairId(repair.id);
    setCurrentScreen("technician_match");

    // Determine urgency for matching
    const urgency = repair.calculatedUrgency || null;

    // Simulate finding delay (1.5s)
    setTimeout(() => {
      const result = matchTechnician({
        machineType: repair.machineNameHi || "",
        problemCategory: repair.diagnosis?.matchedRule,
        urgency,
        farmerLocation,
      });
      setTechMatchResult(result);
      setIsFindingTech(false);
    }, 1500);
  };

  /**
   * Returns the currently shown technician:
   * either the recommended one or an alternative the farmer selected.
   */
  const getDisplayedTechnician = (): import("@/services/technicianData").Technician | null => {
    if (!techMatchResult) return null;
    if (selectedAlternativeIdx !== null) {
      return techMatchResult.alternatives[selectedAlternativeIdx] || techMatchResult.recommended;
    }
    return techMatchResult.recommended;
  };

  /**
   * P2K Step 2: Farmer selects a technician.
   * Idempotent & protected against duplicate rapid clicks / retries.
   *
   * Creates/updates repair request:
   * - repairRequestId
   * - technicianId
   * - machineId
   * - farmerId
   * - diagnosis
   * - urgency
   * - selectedTechnician
   * - assignedAt
   * - status: "technician_assigned"
   * - statusTextHi: "मैकेनिक नियुक्त हो गया है"
   */
  const handleSelectTechnician = (tech: Technician) => {
    // 1. Duplicate click protection (idempotency guard)
    if (isAssigningTechnician) return;
    setIsAssigningTechnician(true);

    try {
      const repair =
        repairs.find((r) => r.id === activeJobCardRepairId) ||
        lastSubmittedRepair;

      if (!tech || !repair) {
        setFeedbackMessage("अभी जानकारी नहीं मिल पाई। कृपया थोड़ी देर बाद कोशिश करें।");
        setTimeout(() => setFeedbackMessage(null), 2500);
        setIsAssigningTechnician(false);
        return;
      }

      // Calculate approximate distance without exposing raw lat/lng
      const distResult = calculateTechnicianDistance(tech, farmerLocation);
      const routeUrl = getRouteUrl(farmerLocation, tech);
      const safeFarmerLocText = getSafeFarmerLocationText(farmerLocation);

      const diagnosisText = repair.diagnosis?.possibleProblem || "AI जाँच उपलब्ध नहीं";
      const urgencyLabel =
        repair.calculatedUrgency === "emergency"
          ? "🔴 तुरंत मदद चाहिए"
          : repair.calculatedUrgency === "urgent"
          ? "🟠 जल्द मरम्मत करें"
          : "🟢 सामान्य मरम्मत";

      // P2F: Run part recommendations before creating job card
      const partResult = recommendSpareParts({
        machineType: repair.machineNameHi || "",
        matchedRule: repair.diagnosis?.matchedRule,
        problemDescription: repair.problemDescription,
      });
      setCurrentPartRecommendation(partResult);
      const recommendedPartIds = partResult.recommendations.map((r) => r.part.id);

      // P2O Step 2: Calculate transparent pricing estimate
      const estimatedCost = repair.estimatedCost || calculateEstimatedPricing({
        machineId: repair.machineId,
        machineType: repair.machineNameHi,
        distanceKm: distResult.distanceKm,
        recommendedPartIds,
      });

      // P2K Step 2: Create/update Job Card idempotently
      const jobCard = createJobCard({
        repairRequestId: repair.id,
        machine: repair.machineNameHi,
        machineIcon: repair.machineIcon,
        problem: repair.problemDescription,
        diagnosis: diagnosisText,
        urgency: urgencyLabel,
        safetyMessage: repair.safetyMessage,
        technicianId: tech.id,
        technicianNameHi: tech.nameHi,
        technicianPhone: tech.phone,
        technicianSkillHi: skillLabelHi(techMatchResult?.requiredSkill || null),
        technicianDistanceKm: distResult.distanceKm,
        technicianRating: tech.rating,
        recommendedPartIds,
        recommendationRule: partResult.triggeredBy,
        farmerId: repair.farmerId || "farmer-001",
        farmerLocationText: safeFarmerLocText,
        visualEvidence:
          repair.diagnosis?.photoAnalysis?.detectedIssue ||
          repair.diagnosis?.photoAnalysis?.evidence?.join(", "),
        photoDataUrl: repair.photoDataUrl,
        technicianWorkflowStatus: "assigned",
        assignedAt: new Date().toISOString(),
        routeUrl: routeUrl || undefined,
        approxDistanceText: distResult.displayText,
        estimatedCost,
        technicianVerificationStatus: tech.verificationStatus,
        technicianExperienceYears: tech.experienceYears,
      });

      // P2F: Part availability map
      const partAvailability: Record<string, boolean> = {};
      partResult.recommendations.forEach((r) => {
        partAvailability[r.part.id] = r.part.available;
      });

      // Update repair status with technician assignment:
      // status: "technician_assigned"
      // statusTextHi: "मैकेनिक नियुक्त हो गया है"
      updateRepairStatus(repair.id, {
        status: "technician_assigned",
        statusTextHi: "मैकेनिक नियुक्त हो गया है",
        technicianWorkflowStatus: "assigned",
        technicianId: tech.id,
        jobCardId: jobCard.jobId,
        farmerId: repair.farmerId || "farmer-001",
        selectedTechnician: tech,
        assignedAt: new Date().toISOString(),
        approxDistanceText: distResult.displayText,
        routeUrl: routeUrl || undefined,
        recommendedParts: recommendedPartIds,
        partAvailability,
        estimatedCost,
        technicianVerificationStatus: tech.verificationStatus,
      });
      refreshData();

      setCurrentJobCard(jobCard);
      setCurrentScreen("technician_job_card");
    } finally {
      setTimeout(() => setIsAssigningTechnician(false), 800);
    }
  };

  /**
   * Farmer confirms the currently highlighted technician.
   */
  const handleConfirmTechnician = () => {
    const tech = getDisplayedTechnician();
    if (tech) {
      handleSelectTechnician(tech);
    }
  };

  /**
   * P2K Step 2: Advance technician status through the 5 stages:
   * 1. assigned   -> "मैकेनिक नियुक्त हो गया है"
   * 2. on_the_way -> "मैकेनिक रास्ते में है"
   * 3. arrived    -> "मैकेनिक पहुँच गया है"
   * 4. repairing  -> "मरम्मत चल रही है"
   * 5. completed  -> "मरम्मत पूरी हुई"
   */
  const handleAdvanceTechnicianStatus = (nextStatus: TechnicianWorkflowStatus) => {
    if (!currentJobCard) return;

    const statusMap: Record<
      TechnicianWorkflowStatus,
      { statusTextHi: string; repairStatus: import("@/types").RepairStatus }
    > = {
      available: { statusTextHi: "उपलब्ध", repairStatus: "technician_assigned" },
      assigned: { statusTextHi: "मैकेनिक नियुक्त हो गया है", repairStatus: "technician_assigned" },
      on_the_way: { statusTextHi: "मैकेनिक रास्ते में है", repairStatus: "on_the_way" },
      arrived: { statusTextHi: "मैकेनिक पहुँच गया है", repairStatus: "arrived" },
      repairing: { statusTextHi: "मरम्मत चल रही है", repairStatus: "repairing" },
      completed: { statusTextHi: "मरम्मत पूरी हुई", repairStatus: "verification_pending" },
    };

    const target = statusMap[nextStatus];
    const updated = updateTechnicianWorkflowStatus(currentJobCard.jobId, nextStatus);
    if (updated) {
      setCurrentJobCard(updated);
      updateRepairStatus(updated.repairRequestId, {
        status: target.repairStatus,
        statusTextHi: target.statusTextHi,
        technicianWorkflowStatus: nextStatus,
      });
      refreshData();
    }
  };

  /**
   * Technician accepts the job (backward compatibility wrapper).
   */
  const handleTechnicianAccept = () => {
    handleAdvanceTechnicianStatus("on_the_way");
  };

  /**
   * Technician starts the repair (backward compatibility wrapper).
   */
  const handleTechnicianStart = () => {
    handleAdvanceTechnicianStatus("repairing");
  };

  /**
   * P2F: Technician marks a part as needed or not needed.
   * Persists to localStorage via updatePartSelection and syncs to repair record.
   */
  const handlePartDecision = (
    partId: string,
    partNameHi: string,
    decision: "needed" | "not_needed"
  ) => {
    if (!currentJobCard) return;
    const selection: PartSelection = { partId, partNameHi, decision };
    const updated = updatePartSelection(currentJobCard.jobId, selection);
    if (updated) {
      setCurrentJobCard(updated);
      updateRepairStatus(updated.repairRequestId, {
        selectedParts: updated.partSelections,
      });
    }
  };

  /**
   * P2F: Helper to get a technician's current decision for a part.
   */
  const getPartDecision = (partId: string): "needed" | "not_needed" | "pending" => {
    if (!currentJobCard?.partSelections) return "pending";
    const sel = currentJobCard.partSelections.find((s) => s.partId === partId);
    return sel ? sel.decision : "pending";
  };

  /**
   * P2F Step 2: Technician completes repair — moves status to verification_pending.
   * Does NOT mark job as finally completed yet.
   */
  const handleTechnicianCompleteRepair = () => {
    if (!currentJobCard) return;
    const updated = completeJobCardRepair(currentJobCard.jobId);
    if (updated) {
      setCurrentJobCard(updated);
      updateRepairStatus(updated.repairRequestId, {
        status: "verification_pending",
        statusTextHi: "मशीन की जाँच बाकी है",
        verificationStatus: "pending",
        verificationAttempt: updated.verificationAttempt || 1,
      });
      refreshData();
    }
  };

  /**
   * P2F Step 2: Machine verification choice: passed (हाँ, मशीन सही है) or failed (नहीं, समस्या अभी है).
   */
  const handleVerificationChoice = (passed: boolean) => {
    if (!currentJobCard) return;

    // Resolve parts used from technician selections
    const partsUsed = (currentJobCard.partSelections || [])
      .filter((s) => s.decision === "needed")
      .map((s) => s.partNameHi);

    const activeRepair = repairs.find((r) => r.id === currentJobCard.repairRequestId);
    const verificationId = activeRepair?.verificationId || `verif-${currentJobCard.repairRequestId}-${Date.now()}`;

    const finalPricing = currentJobCard.finalCost || currentJobCard.estimatedCost || calculateEstimatedPricing({
      machineType: currentJobCard.machine,
      partSelections: currentJobCard.partSelections,
      distanceKm: currentJobCard.technicianDistanceKm,
    });

    const passportContrib = activeRecoveryPlan
      ? contributeToMachinePassport({
          plan: activeRecoveryPlan,
          jobCard: currentJobCard,
          finalCost: finalPricing.total,
        })
      : {
          recoverySummaryHi: `मरम्मत ${currentJobCard.technicianNameHi} द्वारा पूर्ण।`,
          preventiveAdviceHi: "अगली सामान्य सर्विस 90 दिन बाद अनुशंसित है।",
        };

    const passportData: MachinePassportRecord = {
      repairDate: new Date().toLocaleDateString("hi-IN"),
      diagnosis: currentJobCard.technicianOverrideDiagnosis || activeRepair?.diagnosis?.possibleProblem || currentJobCard.diagnosis,
      technician: currentJobCard.technicianNameHi,
      partsUsed: partsUsed.length > 0 ? partsUsed : ["कोई नया पार्ट नहीं लगा"],
      repairResult: passed ? "सफलतापूर्वक मरम्मत हुई" : "जाँच में समस्या पाई गई",
      verificationResult: passed ? "मशीन सही पाई गई (Passed)" : "जाँच असफल (Failed)",
      verificationId,
      finalCost: finalPricing.total,
      costBreakdown: finalPricing,
      problemDescription: currentJobCard.problem,
      estimatedCost: currentJobCard.estimatedCost?.total,
      serviceCentreNameHi: currentJobCard.serviceCentreNameHi,
      maintenanceRecommendation: passportContrib.preventiveAdviceHi,
      technicianOverrideDiagnosis: currentJobCard.technicianOverrideDiagnosis,
    };

    const updatedCard = recordJobCardVerification(currentJobCard.jobId, passed, undefined, verificationId);
    if (updatedCard) {
      setCurrentJobCard(updatedCard);
    }

    recordRepairVerification(currentJobCard.repairRequestId, passed, passportData);
    refreshData();
  };

  /**
   * P2O Step 2: Save transparent price adjustment with mandatory reason
   */
  const handleSavePriceAdjustment = () => {
    if (!currentJobCard) return;

    const est = currentJobCard.estimatedCost || calculateEstimatedPricing({
      machineType: currentJobCard.machine,
      distanceKm: currentJobCard.technicianDistanceKm,
      partSelections: currentJobCard.partSelections,
    });

    const partsCost = calculatePartsCost({ partSelections: currentJobCard.partSelections });
    const labourFee = techLabourFeeOverride !== null ? Math.max(0, techLabourFeeOverride) : (currentJobCard.finalCost?.labourFee ?? est.labourFee);

    const { finalPricing, priceAdjustment } = calculateFinalPricing({
      estimatedPricing: est,
      revisedLabourFee: labourFee,
      revisedPartsCost: partsCost,
      reason: priceAdjustmentReason,
      customReasonNote: customPriceNote.trim() || undefined,
      technicianId: currentJobCard.technicianId,
    });

    const updated = updateJobCardPricing(currentJobCard.jobId, {
      finalCost: finalPricing,
      priceAdjustment,
    });

    if (updated) {
      setCurrentJobCard(updated);
      updateRepairStatus(updated.repairRequestId, {
        finalCost: finalPricing,
        priceAdjustment,
      });
      refreshData();
      setIsEditingPrice(false);
      setFeedbackMessage("✓ पारदर्शी बिलिंग व लागत संशोधन सुरक्षित किया गया");
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  /**
   * P2Q: Save technician physical inspection diagnosis override (Human Override)
   */
  const handleSaveDiagnosisOverride = () => {
    if (!currentJobCard || !techOverrideDiagnosisInput.trim()) return;
    const updatedDiagnosis = techOverrideDiagnosisInput.trim();
    const updated = {
      ...currentJobCard,
      technicianOverrideDiagnosis: updatedDiagnosis,
      diagnosis: updatedDiagnosis,
    };
    setCurrentJobCard(updated);
    updateRepairStatus(updated.repairRequestId, {
      diagnosis: {
        id: `override-${Date.now()}`,
        possibleProblem: updatedDiagnosis,
        confidence: "उच्च (मैकेनिक द्वारा प्रत्यक्ष पुष्टि)",
        confidenceValue: 100,
        reasons: ["मैकेनिक द्वारा प्रत्यक्ष भौतिक निरीक्षण के बाद वास्तविक खराबी की पुष्टि हुई।"],
        safeAction: "मैकेनिक द्वारा सुझाई गई प्रक्रिया का पालन करें।",
        urgencyLevel: "medium",
        urgencyText: "सत्यापित",
        urgencyColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
        disclaimer: "यह मैकेनिक द्वारा प्रत्यक्ष भौतिक निरीक्षण के बाद सत्यापित निदान है।",
        matchedRule: "technician_override",
        timestamp: new Date().toISOString(),
      },
    });
    setIsEditingDiagnosis(false);
    setFeedbackMessage("✓ मैकेनिक द्वारा वास्तविक खराबी का विवरण अपडेट किया गया");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  /**
   * P2O Step 3: Open technician credentials & training modal
   */
  const handleOpenCredentialsModal = (tech: Technician) => {
    const freshTech = getTechnicianById(tech.id) || tech;
    setActiveModalTech(freshTech);
    setIsCredentialsModalOpen(true);
    setNewCertName("");
    setNewCertOrg("");
    setNewCertExpiry("");
    setNewSelfSkill("");
    setIsSubmittingCert(false);
  };

  /**
   * P2O Step 3: Submit new certification for verification review.
   * SECURITY: Status is set to 'pending'. Self-verification is strictly disallowed.
   */
  const handleSubmitNewCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalTech || !newCertName.trim() || !newCertOrg.trim()) return;

    const submitted = submitTechnicianCertification(activeModalTech.id, {
      certificationName: newCertName.trim(),
      category: newCertCategory,
      issuingOrganization: newCertOrg.trim(),
      certificationLevel: "Advanced",
      issueDate: new Date().toISOString().slice(0, 10),
      expiryDate: newCertExpiry.trim() || undefined,
    });

    if (submitted) {
      const updatedTech = getTechnicianById(activeModalTech.id);
      if (updatedTech) setActiveModalTech(updatedTech);
      refreshData();
      setIsSubmittingCert(false);
      setFeedbackMessage("✓ नया प्रमाणन सत्यापन समीक्षा के लिए जमा किया गया (समीक्षाधीन)");
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  /**
   * P2O Step 3: Add self-declared skill, recorded separately from verified skills.
   */
  const handleAddSelfSkill = () => {
    if (!activeModalTech || !newSelfSkill.trim()) return;
    addSelfDeclaredSkill(activeModalTech.id, newSelfSkill.trim());
    const updatedTech = getTechnicianById(activeModalTech.id);
    if (updatedTech) setActiveModalTech(updatedTech);
    setNewSelfSkill("");
    setFeedbackMessage("✓ नया कौशल (स्वयं घोषित) जोड़ा गया");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  /**
   * P2F Step 2: Re-repair trigger when verification fails.
   * Increments attempt count and links back to original repair & job card.
   */
  const handleReRepair = () => {
    if (!currentJobCard) return;
    const updatedCard = reopenJobCardForReRepair(currentJobCard.jobId);
    if (updatedCard) {
      setCurrentJobCard(updatedCard);
    }
    reopenRepairForReRepair(currentJobCard.repairRequestId);
    refreshData();
  };

  // ─── P2Q: Recovery Engine Handlers ───────────────────────────────────────

  /**
   * Launch Recovery Engine from any diagnosis or complaint.
   */
  const handleLaunchRecoveryEngine = (customMachine?: Machine, customProblem?: string) => {
    const targetMachine = customMachine || currentBreakdownMachine || machines[0];
    const problem = customProblem || breakdownDescription || sahayakDescription || "मशीन में खराबी";

    const isCritical =
      breakdownUrgency === "today" ||
      sahayakUrgency === "today" ||
      currentDiagnosis?.urgencyLevel === "high" ||
      problem.toLowerCase().includes("बुवाई") ||
      problem.toLowerCase().includes("कटाई");

    const plan = generateRecoveryPlan({
      machine: targetMachine,
      problemDescription: problem,
      diagnosis: currentDiagnosis || null,
      urgency: isCritical ? "emergency" : "urgent",
      farmerLocation,
      isOnline,
      requiredByTimeText: isCritical ? "कल बुवाई शुरू" : "सामान्य",
      isCriticalFarmWindow: isCritical,
    });

    setActiveRecoveryPlan(plan);
    setSelectedRecoveryOption(plan.recoveryOptions[0] || null);
    setCurrentScreen("recovery_engine");
  };

  /**
   * Confirm selected Recovery Option (Fastest, Nearest Centre, or Lower Cost).
   */
  const handleConfirmRecoveryOption = (option: RecoveryOption) => {
    if (!activeRecoveryPlan) return;
    setIsAssigningTechnician(true);

    try {
      const activeRepair = lastSubmittedRepair || latestRepair;
      const repairId = activeRepair?.id || `repair-${Date.now()}`;

      // 1. Resolve technician
      const tech = option.technicianId
        ? getTechnicianById(option.technicianId) || mockTechnicians.find((t) => t.id === option.technicianId) || mockTechnicians[0]
        : mockTechnicians[0];

      // 2. Resolve service centre if workshop mode
      const centre = option.serviceCentreId ? getServiceCentreById(option.serviceCentreId) : undefined;

      // 3. Create or update Job Card
      const jobCard = createJobCard({
        repairRequestId: repairId,
        machine: activeRecoveryPlan.machineNameHi,
        machineIcon: activeRecoveryPlan.machineIcon,
        problem: activeRecoveryPlan.problemSummaryHi,
        diagnosis: currentDiagnosis?.possibleProblem || activeRecoveryPlan.problemSummaryHi,
        urgency: activeRecoveryPlan.urgencyLevel,
        safetyMessage: activeRecoveryPlan.safetyWarning || undefined,
        technicianId: tech.id,
        technicianNameHi: tech.nameHi,
        technicianPhone: tech.phone,
        technicianSkillHi: tech.skills[0] || "मैकेनिक",
        technicianDistanceKm: option.distanceKm,
        technicianRating: tech.rating,
        technicianVerificationStatus: tech.verificationStatus,
        technicianExperienceYears: tech.experienceYears,
        farmerLocationText: getSafeFarmerLocationText(farmerLocation),
        approxDistanceText: option.distanceText,
        estimatedCost: option.pricing,
        serviceMode: option.serviceMode,
        serviceCentreId: centre?.id,
        serviceCentreNameHi: centre?.nameHi,
        serviceCentreType: centre?.centreType,
        serviceCentreAddress: centre?.location.addressHi,
      });

      // 4. Update Repair Request status
      if (activeRepair) {
        updateRepairStatus(activeRepair.id, {
          status: "technician_assigned",
          statusTextHi: option.serviceMode === "workshop" ? "सर्विस सेंटर पर बुकिंग पुष्टीकृत" : "मैकेनिक नियुक्त हो गया है",
          technicianId: tech.id,
          jobCardId: jobCard.jobId,
          serviceMode: option.serviceMode,
          serviceCentreId: centre?.id,
          serviceCentreNameHi: centre?.nameHi,
          estimatedCost: option.pricing,
        });
      }

      // 5. Dispatch SMS alert
      const smsText = `YANTRIQ: ${activeRecoveryPlan.machineNameHi} रिकवरी योजना पुष्टीकृत (${option.badgeHi})। प्रदाता: ${option.providerNameHi}। अनुमान: ₹${option.pricing.total}। सहायता: 1800-AGRI-HELP`;
      dispatchSimulatedSMS({
        recipientPhone: "9876543210",
        messageTextHi: smsText,
        eventType: "technician_assigned",
        complaintId: repairId,
      });

      refreshData();
      setCurrentJobCard(jobCard);
      setCurrentScreen("technician_job_card");
      setFeedbackMessage(`✓ रिकवरी विकल्प पुष्टीकृत: ${option.badgeHi}`);
      setTimeout(() => setFeedbackMessage(null), 3000);
    } finally {
      setTimeout(() => setIsAssigningTechnician(false), 600);
    }
  };

  /**
   * P2P: Feature-phone IVR Keypad simulator handler
   */
  const handleKeypadPress = (digit: string) => {
    const result = processIVRInput(ivrState, digit);
    setIvrState(result.nextState);
    if (result.createdRepair) {
      refreshData();
      setLastSubmittedRepair(result.createdRepair);
      setFeedbackMessage("✓ फीचर फोन कॉल से शिकायत दर्ज हुई (SMS भेजा गया)");
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  /**
   * P2P: Assisted Access desk submit handler
   */
  const handleAssistedSubmit = () => {
    if (!assistedFarmerPhone || !assistedProblemText) return;
    const res = createAssistedRepair({
      operatorId: "op-nagpur-fpo",
      operatorNameHi: "सुनील पाटिल (ऑपरेटर)",
      operatorOrgNameHi: "नागपुर किसान उत्पादक कंपनी (FPO)",
      farmerName: assistedFarmerName,
      farmerPhone: assistedFarmerPhone,
      machineId: assistedMachineId,
      problemDescription: assistedProblemText,
      urgency: "today",
      isCriticalFarmWindow: true,
    });
    refreshData();
    setLastSubmittedRepair(res.repair);
    setActiveRecoveryPlan(res.recoveryPlan);
    setSelectedRecoveryOption(res.recoveryPlan.recoveryOptions[0]);
    setIsAssistedModalOpen(false);
    setCurrentScreen("recovery_engine");
    setFeedbackMessage("✓ FPO सहायक डेस्क द्वारा शिकायत दर्ज: रिकवरी योजना तैयार");
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Active bottom navigation helper
  const getActiveTab = () => {
    if (
      currentScreen === "home" ||
      currentScreen === "sahayak" ||
      currentScreen === "diagnosis" ||
      currentScreen === "breakdown"
    ) {
      return "home";
    }
    if (currentScreen === "machines" || currentScreen === "machine_detail") return "machines";
    if (
      currentScreen === "repair" ||
      currentScreen === "breakdown_success" ||
      currentScreen === "technician_match" ||
      currentScreen === "nearby_mechanics" ||
      currentScreen === "technician_job_card" ||
      currentScreen === "repair_verification" ||
      currentScreen === "job_ready_verification"
    ) return "repair";
    if (currentScreen === "service") return "service";
    if (currentScreen === "profile") return "profile";
    return "home";
  };

  // Dynamic calculations for Home & Repair screens
  const activeRepairs = repairs.filter((r) => r.status !== "completed");
  const latestRepair = activeRepairs[0] || (repairs.length > 0 ? repairs[0] : null);
  const currentBreakdownMachine =
    machines.find((m) => m.id === breakdownMachineId) || machines[0];
  // 1a. App launch starting flow: Show First Welcome Screen before Login/Registration
  if (!authSession && showWelcomeScreen) {
    return (
      <WelcomeScreen
        currentLanguage={currentLanguage}
        onLanguageChange={(lang) => {
          setCurrentLanguage(lang);
          setStoredLanguage(lang);
        }}
        onGetStarted={handleWelcomeGetStarted}
      />
    );
  }

  // 1b. If not authenticated, render LoginScreen (after "शुरू करें" is clicked)
  if (!authSession) {
    return (
      <LoginScreen
        currentLanguage={currentLanguage}
        onLanguageChange={(lang) => {
          setCurrentLanguage(lang);
          setStoredLanguage(lang);
        }}
        onBackToWelcome={() => setShowWelcomeScreen(true)}
        onLoginSuccess={(session) => {
          setAuthSession(session);
          if (isTechnicianRole(session.user.role)) {
            setCurrentScreen("home");
          }
        }}
      />
    );
  }

  // 2. If authenticated as Technician, render TechnicianDashboard (Strict role separation)
  if (isTechnicianRole(authSession.user.role)) {
    return (
      <TechnicianDashboard
        session={authSession}
        repairs={repairs}
        currentLanguage={currentLanguage}
        onRefreshData={refreshData}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div
      dir={isRTL(currentLanguage) ? "rtl" : "ltr"}
      className={`flex flex-col min-h-screen bg-[#FAF8F5] text-slate-900 pb-28 select-none ${
        isRTL(currentLanguage) ? "font-serif text-right" : "text-left"
      }`}
    >
      {/* Hidden native media pickers */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={photoInputRef}
        onChange={handlePhotoSelect}
        className="hidden"
        aria-hidden="true"
      />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={sahayakPhotoInputRef}
        onChange={handleSahayakPhotoSelect}
        className="hidden"
        aria-hidden="true"
      />
      <input
        type="file"
        accept="video/*"
        ref={videoInputRef}
        onChange={handleVideoSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* ================= HEADER ================= */}
      {currentScreen !== "profile" && (() => {
        const getScreenHeaderInfo = (): { title: string; subtitle?: string; icon?: string } => {
          switch (currentScreen) {
            case "machines":
              return {
                title: t("machines.title", currentLanguage),
                subtitle: currentLanguage === "en" ? "All your machines" : "आपकी सभी मशीनें",
                icon: "🚜",
              };
            case "machine_detail":
              return {
                title: selectedMachine?.nameHi || (currentLanguage === "en" ? "Machine Details" : "मशीन विवरण"),
                subtitle: currentLanguage === "en" ? "Passport & Service History" : "पासपोर्ट व सर्विस रिकॉर्ड",
                icon: selectedMachine?.icon || "🚜",
              };
            case "breakdown":
              return {
                title: t("complaint.title", currentLanguage),
                subtitle: currentLanguage === "en" ? `Step ${breakdownStep} of 4` : `चरण ${breakdownStep} / 4`,
                icon: "🔧",
              };
            case "breakdown_success":
              return {
                title: currentLanguage === "en" ? "Booking Confirmed" : "बुकिंग सफल",
                subtitle: currentLanguage === "en" ? "Finding nearest mechanic" : "मैकेनिक खोजा जा रहा है",
                icon: "✅",
              };
            case "diagnosis":
              return {
                title: currentLanguage === "en" ? "AI Diagnosis" : "AI मशीन जांच",
                subtitle: currentLanguage === "en" ? "Problem & Solution" : "समस्या पहचान व समाधान",
                icon: "🤖",
              };
            case "repair":
              return {
                title: t("repair.title", currentLanguage),
                subtitle: currentLanguage === "en" ? "Live Tracking & History" : "लाइव स्थिति व ट्रैकिंग",
                icon: "📋",
              };
            case "service":
              return {
                title: t("preventive.title", currentLanguage),
                subtitle: currentLanguage === "en" ? "Care & Reminders" : "नियमित देखभाल व अलर्ट",
                icon: "📅",
              };
            case "sahayak":
              return {
                title: t("sahayak.title", currentLanguage),
                subtitle: currentLanguage === "en" ? "Voice & Photo Help" : "आवाज़ व फ़ोटो से सवाल पूछें",
                icon: "🤖",
              };
            case "technician_match":
              return {
                title: currentLanguage === "en" ? "Technician Matching" : "मैकेनिक मिलान",
                subtitle: currentLanguage === "en" ? "Verified Local Technicians" : "उपलब्ध प्रमाणित मैकेनिक",
                icon: "🔍",
              };
            case "technician_job_card":
              return {
                title: currentLanguage === "en" ? "Digital Job Card" : "डिजिटल जॉब कार्ड",
                subtitle: currentLanguage === "en" ? "Parts & Repair Details" : "पुर्जे, काम व बिल विवरण",
                icon: "📝",
              };
            case "repair_verification":
              return {
                title: currentLanguage === "en" ? "Repair Verification" : "मरम्मत सत्यापन",
                subtitle: currentLanguage === "en" ? "OTP & Final Approval" : "OTP व अंतिम अनुमोदन",
                icon: "🔐",
              };
            case "job_ready_verification":
              return {
                title: currentLanguage === "en" ? "Job-Ready Check" : "Job-Ready जाँच",
                subtitle: currentLanguage === "en" ? "Spraying Readiness Verification" : "स्प्रेयर उपयोग की तैयारी जाँच",
                icon: "🎒",
              };
            case "nearby_mechanics":
              return {
                title: currentLanguage === "en" ? "Nearby Mechanics" : "नजदीकी मैकेनिक",
                subtitle: currentLanguage === "en" ? "Certified Technicians" : "आपके क्षेत्र के प्रमाणित मैकेनिक",
                icon: "📍",
              };
            case "recovery_engine":
              return {
                title: currentLanguage === "en" ? "Downtime Recovery" : "डाउनटाइम रिकवरी",
                subtitle: currentLanguage === "en" ? "Equipment & Support" : "बैकअप मशीन व सहायता",
                icon: "⚡",
              };
            case "kisan_help":
              return {
                title: currentLanguage === "en" ? "Farmer Help" : "किसान हेल्प",
                subtitle: currentLanguage === "en" ? "Ask anything by voice" : "किसी भी समस्या के बारे में बोलकर पूछें",
                icon: "🗣️✨",
              };
            default:
              return {
                title: "YANTRIQ",
                subtitle: currentLanguage === "en" ? "Agricultural Equipment Repair" : "कृषि उपकरण रिपेयर सेवा",
                icon: "🌾",
              };
          }
        };

        const handleHeaderBack = () => {
          if (currentScreen === "diagnosis") {
            handleBackFromDiagnosis();
          } else if (currentScreen === "machine_detail") {
            setCurrentScreen("machines");
          } else if (currentScreen === "breakdown" && breakdownStep > 1) {
            setBreakdownStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
          } else if (
            currentScreen === "sahayak" &&
            (sahayakStep === "voice" || sahayakStep === "photo")
          ) {
            stopSahayakVoice();
            setSahayakStep("init");
          } else if (
            currentScreen === "job_ready_verification" ||
            currentScreen === "repair_verification"
          ) {
            setCurrentScreen("repair");
          } else {
            setCurrentScreen("home");
          }
        };

        const headerInfo = getScreenHeaderInfo();

        return (
          <header className="bg-emerald-800 text-white px-3 sm:px-4 py-2 sm:py-2.5 border-b border-emerald-900 sticky top-0 z-40 shadow-xs">
            <div className="max-w-4xl mx-auto">
              {/* PRIMARY HEADER ROW: [Back/Logo] [Title/Subtitle] on Left | [AI] [Language] [Profile] on Right */}
              <div className="flex items-center justify-between gap-2 min-h-[36px]">
                {/* Left Area */}
                {currentScreen === "home" ? (
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span className="text-xl sm:text-2xl filter drop-shadow-2xs select-none shrink-0">🌾</span>
                    <div className="min-w-0">
                      <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                        YANTRIQ
                      </h1>
                      <p className="text-[11px] text-emerald-200/90 font-medium truncate hidden sm:block leading-tight">
                        {currentLanguage === "en" ? "Agricultural Equipment Repair" : "कृषि उपकरण रिपेयर सेवा"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={handleHeaderBack}
                      className="h-9 w-9 rounded-xl bg-emerald-900/90 hover:bg-emerald-900 border border-emerald-700/80 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
                      aria-label={t("common.back", currentLanguage)}
                      title={t("common.back", currentLanguage)}
                    >
                      <ArrowLeft className={`w-4 h-4 ${isRTL(currentLanguage) ? "rotate-180" : ""}`} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {headerInfo.icon && (
                          <span className="text-sm shrink-0 select-none">{headerInfo.icon}</span>
                        )}
                        <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight truncate">
                          {headerInfo.title}
                        </h1>
                      </div>
                      {headerInfo.subtitle && (
                        <p className="text-[11px] text-emerald-200/90 font-medium truncate leading-tight mt-0.5">
                          {headerInfo.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Right Area: Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* 🗣️✨ Voice AI Assistant Header Button */}
                  <button
                    type="button"
                    id="header-voice-ai-btn"
                    onClick={() => setIsVoiceAssistantOpen((prev) => !prev)}
                    title={voiceAssistantStatus === "listening" ? "सुन रहा हूँ..." : "बोलकर AI मदद लें / Ask by Voice"}
                    className={`h-9 px-2.5 sm:px-3 rounded-xl border border-emerald-700/80 bg-emerald-900/90 hover:bg-emerald-900 text-emerald-50 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 ${
                      voiceAssistantStatus === "listening"
                        ? "ring-1 ring-emerald-400 bg-emerald-800 text-white"
                        : voiceAssistantStatus === "speaking"
                        ? "ring-1 ring-emerald-400 bg-emerald-800 text-white"
                        : voiceAssistantStatus === "processing"
                        ? "ring-1 ring-emerald-400 bg-emerald-800 text-white"
                        : ""
                    }`}
                    aria-label="बोलकर AI मदद लें"
                  >
                    {voiceAssistantStatus === "listening" ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shrink-0" />
                        <span className="text-xs font-bold text-emerald-200">सुन रहा हूँ...</span>
                      </>
                    ) : voiceAssistantStatus === "processing" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300 shrink-0" />
                        <span className="text-xs font-bold text-emerald-200">सोच रहा हूँ...</span>
                      </>
                    ) : voiceAssistantStatus === "speaking" ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-300 animate-bounce shrink-0" />
                        <span className="text-xs font-bold text-emerald-200">जवाब...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm leading-none select-none">🗣️✨</span>
                        <span className="hidden xs:inline">AI</span>
                      </>
                    )}
                  </button>

                  {/* Language Selector */}
                  <button
                    type="button"
                    id="header-language-switcher-btn"
                    onClick={() => setIsLanguageModalOpen(true)}
                    title="अपनी भाषा चुनें / Choose Language"
                    className="h-9 px-2.5 sm:px-3 rounded-xl border border-emerald-700/80 bg-emerald-900/90 hover:bg-emerald-900 text-emerald-50 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                    aria-label="भाषा चुनें"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span className="max-w-[72px] sm:max-w-none truncate">
                      {SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage)?.nativeName || "English"}
                    </span>
                  </button>

                  {/* Profile Button - Cleanly displayed on Home Screen, hidden on sub-screens to prevent mobile squeeze */}
                  {currentScreen === "home" && (
                    <button
                      type="button"
                      id="header-profile-btn"
                      onClick={() => setCurrentScreen("profile")}
                      title={currentLanguage === "en" ? "Profile" : "प्रोफ़ाइल"}
                      className="h-9 px-2.5 sm:px-3 rounded-xl border border-emerald-700/80 bg-emerald-900/90 hover:bg-emerald-900 text-emerald-50 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                      aria-label={currentLanguage === "en" ? "Profile" : "प्रोफ़ाइल"}
                    >
                      <User className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span className="hidden sm:inline">{currentLanguage === "en" ? "Profile" : "प्रोफ़ाइल"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SECONDARY GREETING & STATUS ROW: Only shown on Home screen to save vertical space on sub-screens */}
              {currentScreen === "home" && (
                <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-emerald-700/60 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-100 truncate min-w-0">
                    <span className="text-sm shrink-0">🚜</span>
                    <span className="truncate">
                      नमस्ते, {authSession.user.nameHi || authSession.user.name} 👋
                    </span>
                  </div>

                  {/* Security / Sync Status Indicator */}
                  <div className="shrink-0 flex items-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border shadow-2xs ${
                        syncState === "syncing"
                          ? "bg-blue-100 text-blue-900 border-blue-300 animate-pulse"
                          : !isOnline
                          ? "bg-amber-100 text-amber-950 border-amber-300"
                          : "bg-emerald-900/80 text-emerald-100 border-emerald-600/70"
                      }`}
                      title="डेटा सुरक्षा स्थिति"
                    >
                      <span className="text-xs">
                        {syncState === "syncing"
                          ? "🔄"
                          : !isOnline
                          ? "📴"
                          : "🟢"}
                      </span>
                      <span>
                        {syncState === "syncing"
                          ? t("common.syncingNotice", currentLanguage)
                          : !isOnline
                          ? t("common.offlineNotice", currentLanguage)
                          : t("common.dataSafeNotice", currentLanguage)}
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </header>
        );
      })()}

      {/* ================= OFFLINE / ONLINE INDICATOR BANNERS (Section 14) ================= */}
      {/* 1. Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-100 border-b-2 border-amber-400 px-4 py-2.5 text-center text-amber-950 font-black text-base flex items-center justify-center gap-2 shadow-sm" role="status" aria-live="polite">
          <span className="text-xl">📴</span>
          <span>{t("common.offlineNotice", currentLanguage)}</span>
        </div>
      )}

      {/* 2. Syncing Banner */}
      {isOnline && syncState === "syncing" && (
        <div className="bg-blue-600 border-b-2 border-blue-800 px-4 py-2.5 text-center text-white font-black text-base flex items-center justify-center gap-2 shadow-md animate-pulse" role="status" aria-live="polite">
          <span className="text-xl animate-spin">🔄</span>
          <span>{t("common.syncingNotice", currentLanguage)}</span>
        </div>
      )}

      {/* 3. Sync Successful Banner */}
      {isOnline && syncState === "synced" && (
        <div className="bg-emerald-600 border-b-2 border-emerald-800 px-4 py-2.5 text-center text-white font-black text-base flex items-center justify-center gap-2 shadow-md" role="status" aria-live="polite">
          <span className="text-xl">🟢</span>
          <span>{t("common.dataSafeNotice", currentLanguage)}</span>
        </div>
      )}

      {/* Farmer Feedback Toast */}
      {feedbackMessage && (
        <div className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto bg-amber-800 text-white p-4 rounded-2xl font-black text-center text-lg shadow-2xl border-2 border-white animate-bounce flex items-center justify-center gap-2">
          <AlertCircle className="w-6 h-6 text-amber-300 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}



      {/* ================= MULTILINGUAL: FIRST-LAUNCH & SETTINGS LANGUAGE SELECTION MODAL ================= */}
      {isLanguageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 border-4 border-emerald-600 shadow-2xl">
            {/* Modal Header */}
            <div className="text-center space-y-1.5 pb-2 border-b border-slate-200">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-100 border-2 border-emerald-400 text-2xl sm:text-3xl shadow-inner">
                🌾
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                YANTRIQ
              </h2>
              <div className="text-xl sm:text-2xl font-black text-emerald-800">
                Choose Your Language
              </div>
              <div className="text-base sm:text-lg font-extrabold text-amber-700">
                अपनी भाषा चुनें
              </div>
              <p className="text-xs font-bold text-slate-500 max-w-sm mx-auto">
                पूरी किसान स्क्रीन और वॉयस सिस्टम आपकी चुनी हुई भाषा में काम करेंगे। (Full farmer UI & voice interaction adapt to your choice.)
              </p>
            </div>

            {/* Primary 8 Languages */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {SUPPORTED_LANGUAGES.slice(0, 8).map((lang) => {
                const isSelected = currentLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`p-3.5 rounded-2xl border-3 text-left transition-all active:scale-95 flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-600 ring-3 ring-emerald-300 shadow-md"
                        : "bg-slate-50 hover:bg-emerald-50/50 border-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-slate-900">{lang.nativeName}</span>
                      {isSelected && <span className="text-emerald-700 font-black text-base">✓</span>}
                    </div>
                    <div className="text-xs font-bold text-slate-500 mt-1 flex items-center justify-between">
                      <span>{lang.name}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                        {lang.script}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* More Languages Accordion Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowMoreLanguages(!showMoreLanguages)}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 font-extrabold text-sm flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>🌐</span>
                  <span>More Languages & Regional Dialects / और भाषाएं</span>
                </span>
                <span>{showMoreLanguages ? "▲" : "▼"}</span>
              </button>

              {showMoreLanguages && (
                <div className="grid grid-cols-2 gap-2.5 mt-2.5 animate-fadeIn">
                  {SUPPORTED_LANGUAGES.slice(8).map((lang) => {
                    const isSelected = currentLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleSelectLanguage(lang.code)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all active:scale-95 flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-300 shadow-md"
                            : "bg-slate-50 hover:bg-emerald-50/50 border-slate-200 hover:border-emerald-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-black text-slate-900">{lang.nativeName}</span>
                          {isSelected && <span className="text-emerald-700 font-black text-sm">✓</span>}
                        </div>
                        <div className="text-xs font-bold text-slate-500 mt-1 flex items-center justify-between">
                          <span>{lang.name}</span>
                          {lang.isRTL && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                              RTL
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Regional Dialects and Voice Fallback Honesty Notice */}
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-[11px] font-bold text-amber-950 flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <span>
                <strong>क्षेत्रीय बोली व वॉयस सहायता:</strong> हरियाणवी व राजस्थानी/मारवाड़ी जैसी बोलियों में वॉयस पहचान निकटतम समर्थित भाषा (हिन्दी) के माध्यम से सुगम बनाई गई है। यदि किसी बोली में विशिष्ट अनुवाद उपलब्ध न हो, तो सहज क्षेत्रीय फॉलबैक लागू रहता है।
              </span>
            </div>

            {/* Close button if user already has a chosen language */}
            {hasChosenLanguage() && (
              <button
                type="button"
                onClick={() => setIsLanguageModalOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm cursor-pointer"
              >
                {t("common.close", currentLanguage)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= P2O STEP 3: TECHNICIAN CREDENTIALS & TRAINING MODAL ================= */}
      {isCredentialsModalOpen && activeModalTech && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3.5 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 border-4 border-emerald-600 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-2xl">
                  👨‍🔧
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{activeModalTech.nameHi}</h3>
                  <div className="text-xs font-bold text-slate-500">
                    {activeModalTech.phone} • {activeModalTech.serviceArea || (currentLanguage === "en" ? "Rural Service Area" : "ग्रामीण सेवा क्षेत्र")}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCredentialsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-2xl p-1"
                aria-label={currentLanguage === "en" ? "Close" : "बंद करें"}
              >
                ✕
              </button>
            </div>

            {/* Verification Status Badge Header */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border-2 bg-slate-50">
              <div>
                <span className="text-xs font-bold text-slate-500 block">
                  {currentLanguage === "en" ? "Verification Status:" : "सत्यापन स्थिति (Status):"}
                </span>
                <span className="text-base font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                  {activeModalTech.verificationStatus === "verified"
                    ? (currentLanguage === "en" ? "🟢 Verified Mechanic" : "🟢 प्रमाणित मैकेनिक (Verified)")
                    : activeModalTech.verificationStatus === "expired"
                    ? (currentLanguage === "en" ? "🔴 Expired / Renewal Required" : "🔴 प्रमाणन समाप्त / नवीनीकरण आवश्यक")
                    : (currentLanguage === "en" ? "🟡 Under Verification" : "🟡 सत्यापन प्रक्रियाधीन (Under Verification)")}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500 block">
                  {currentLanguage === "en" ? "Work Experience:" : "कार्य अनुभव:"}
                </span>
                <span className="text-base font-black text-slate-900">
                  {activeModalTech.experienceYears
                    ? `${activeModalTech.experienceYears} ${currentLanguage === "en" ? "yrs" : "वर्ष"}`
                    : (currentLanguage === "en" ? "3+ yrs" : "3+ वर्ष")}
                </span>
              </div>
            </div>

            {/* Service Verification Notice */}
            <div className="text-[11px] font-bold text-emerald-950 bg-emerald-50 p-2.5 rounded-xl border border-emerald-300 leading-snug">
              🛡️ <strong>{currentLanguage === "en" ? "Service Verification:" : "सेवा सत्यापन सूचना:"}</strong>{" "}
              {currentLanguage === "en"
                ? "Technician credentials and certifications are verified according to YANTRIQ service standards."
                : "तकनीशियन की योग्यता और प्रमाणपत्र यांत्रिक सेवा मानकों के अनुसार सत्यापित किए गए हैं।"}
            </div>

            {/* Section 1: Equipment Categories */}
            <div className="space-y-1.5">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                {currentLanguage === "en" ? "🚜 Equipment Categories:" : "🚜 प्रमाणित उपकरण श्रेणियां (Equipment Categories):"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(activeModalTech.equipmentCategories || activeModalTech.skills).map((eq, i) => (
                  <span
                    key={i}
                    className="bg-emerald-50 text-emerald-950 font-bold px-2.5 py-1 rounded-xl text-xs border border-emerald-300"
                  >
                    ✓ {eq}
                  </span>
                ))}
              </div>
            </div>

            {/* Section 2: Technical Skills (Separating Verified vs Self-Declared — Rule 13) */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                {currentLanguage === "en" ? "⚙️ Technical Skills:" : "⚙️ तकनीकी दक्षता व कौशल (Technical Skills):"}
              </span>
              <div className="space-y-1.5">
                {/* Verified Technical Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {(activeModalTech.technicalSkills || ["Mechanical", "Hydraulic"]).map((sk, i) => (
                    <span
                      key={i}
                      className="bg-blue-50 text-blue-950 font-bold px-2.5 py-1 rounded-xl text-xs border border-blue-300 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                      <span>{sk} {currentLanguage === "en" ? "(Verified)" : "(प्रमाणित)"}</span>
                    </span>
                  ))}
                  {/* Self-Declared Skills */}
                  {(activeModalTech.selfDeclaredSkills || []).map((sk, i) => (
                    <span
                      key={i}
                      className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-xl text-xs border border-slate-300"
                    >
                      ℹ️ {sk} {currentLanguage === "en" ? "(Self-declared)" : "(स्वयं घोषित)"}
                    </span>
                  ))}
                </div>

                {/* Quick Add Self-Declared Skill */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newSelfSkill}
                    onChange={(e) => setNewSelfSkill(e.target.value)}
                    placeholder={currentLanguage === "en" ? "Add skill (e.g. Welding)" : "कौशल जोड़ें (जैसे: वेल्डिंग)"}
                    className="flex-1 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSelfSkill}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-3 py-1.5 rounded-xl text-xs"
                  >
                    {currentLanguage === "en" ? "+ Add" : "+ जोड़ें"}
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: Certifications Portfolio (Rule 3, 5, 9) */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                  {currentLanguage === "en" ? "📜 Certifications Portfolio:" : "📜 प्रमाणन पोर्टफोलियो (Certifications):"}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {activeModalTech.certifications?.length || 0} {currentLanguage === "en" ? "records" : "रिकॉर्ड"}
                </span>
              </div>

              {(!activeModalTech.certifications || activeModalTech.certifications.length === 0) ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-bold text-center">
                  {currentLanguage === "en"
                    ? "No formal certificates recorded yet (Self-declared experience)"
                    : "अभी कोई औपचारिक प्रमाण पत्र दर्ज नहीं है (स्वयं घोषित अनुभव)"}
                </div>
              ) : (
                <div className="space-y-2">
                  {activeModalTech.certifications.map((cert) => {
                    const expired = isCertificationExpired(cert) || cert.verificationStatus === "expired";

                    return (
                      <div
                        key={cert.id}
                        className={`p-3 rounded-2xl border-2 space-y-1 text-xs ${
                          expired
                            ? "bg-red-50 border-red-300"
                            : cert.verificationStatus === "verified"
                            ? "bg-emerald-50 border-emerald-300"
                            : "bg-amber-50 border-amber-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-black text-slate-900 text-sm">
                              {cert.certificationName}
                            </div>
                            <div className="text-[11px] font-bold text-slate-600">
                              {currentLanguage === "en" ? "Organization:" : "संस्था:"} {cert.issuingOrganization}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full font-black text-[10px] shrink-0 border ${
                              expired
                                ? "bg-red-200 text-red-950 border-red-400"
                                : cert.verificationStatus === "verified"
                                ? "bg-emerald-200 text-emerald-950 border-emerald-400"
                                : "bg-amber-200 text-amber-950 border-amber-400"
                            }`}
                          >
                            {expired
                              ? (currentLanguage === "en" ? "🔴 Expired" : "🔴 समाप्त (Expired)")
                              : cert.verificationStatus === "verified"
                              ? (currentLanguage === "en" ? "🟢 Verified" : "🟢 सत्यापित (Verified)")
                              : (currentLanguage === "en" ? "🟡 Pending" : "🟡 समीक्षाधीन (Pending)")}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-slate-700 pt-1 border-t border-slate-200/60">
                          <span>
                            {currentLanguage === "en" ? "Level:" : "स्तर:"} {cert.certificationLevel} • {currentLanguage === "en" ? "Category:" : "श्रेणी:"} {cert.category}
                          </span>
                          <span>
                            {cert.expiryDate ? (
                              expired ? (
                                <strong className="text-red-700">
                                  {currentLanguage === "en" ? `Expired: ${cert.expiryDate} (Renewal required)` : `समाप्त: ${cert.expiryDate} (नवीनीकरण आवश्यक)`}
                                </strong>
                              ) : (
                                `${currentLanguage === "en" ? "Valid till:" : "वैधता:"} ${cert.expiryDate}`
                              )
                            ) : (
                              currentLanguage === "en" ? "Lifetime Validity" : "आजीवन वैध"
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 4: Training Records (Rule 4) */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                {currentLanguage === "en" ? "🎓 Training Records:" : "🎓 पूर्ण व प्रगतिरत प्रशिक्षण (Training):"}
              </span>
              {(!activeModalTech.trainingRecords || activeModalTech.trainingRecords.length === 0) ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-bold text-center">
                  {currentLanguage === "en" ? "No training records logged" : "कोई प्रशिक्षण रिकॉर्ड दर्ज नहीं है"}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeModalTech.trainingRecords.map((tr) => (
                    <div
                      key={tr.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-black text-slate-900">{tr.trainingTitle}</div>
                        <div className="text-[11px] text-slate-500 font-bold">
                          {currentLanguage === "en" ? "Provider:" : "प्रदाता:"} {tr.trainingProvider} ({tr.completionDate})
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          tr.status === "Completed"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                            : tr.status === "In Progress"
                            ? "bg-blue-100 text-blue-900 border-blue-300"
                            : "bg-red-100 text-red-900 border-red-300"
                        }`}
                      >
                        {tr.status === "Completed"
                          ? (currentLanguage === "en" ? "✓ Completed" : "✓ पूर्ण (Completed)")
                          : tr.status === "In Progress"
                          ? (currentLanguage === "en" ? "In Progress" : "प्रगति पर (In Progress)")
                          : (currentLanguage === "en" ? "Expired" : "समाप्त (Expired)")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 5: Submit New Certification Form (Rule 8 & 13) */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              {!isSubmittingCert ? (
                <button
                  type="button"
                  onClick={() => setIsSubmittingCert(true)}
                  className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-black rounded-xl text-xs border border-emerald-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>
                    {currentLanguage === "en"
                      ? "+ Submit New Certificate for Verification"
                      : "+ नया प्रमाणन सत्यापन के लिए जमा करें (Submit Certificate)"}
                  </span>
                </button>
              ) : (
                <form onSubmit={handleSubmitNewCertificate} className="bg-slate-50 p-3.5 rounded-2xl border-2 border-emerald-400 space-y-2.5">
                  <div className="text-xs font-black text-slate-900 border-b pb-1">
                    {currentLanguage === "en" ? "Submit New Certificate (For Review):" : "नया प्रमाण पत्र सबमिट करें (समीक्षा हेतु):"}
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                      {currentLanguage === "en" ? "Certification Name:" : "प्रमाणन का नाम:"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newCertName}
                      onChange={(e) => setNewCertName(e.target.value)}
                      placeholder={currentLanguage === "en" ? "e.g., Combine Harvester Hydraulics" : "जैसे: कंबाइन हार्वेस्टर हाइड्रॉलिक्स"}
                      className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                        {currentLanguage === "en" ? "Equipment Category:" : "उपकरण श्रेणी:"}
                      </label>
                      <select
                        value={newCertCategory}
                        onChange={(e) => setNewCertCategory(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none"
                      >
                        <option value="Tractor">Tractor</option>
                        <option value="Sprayer">Sprayer</option>
                        <option value="Water Pump">Water Pump</option>
                        <option value="Power Tiller">Power Tiller</option>
                        <option value="Harvester">Harvester</option>
                        <option value="Hydraulic">Hydraulic</option>
                        <option value="Electrical">Electrical</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                        {currentLanguage === "en" ? "Issuing Organization:" : "जारीकर्ता संस्था:"}
                      </label>
                      <input
                        type="text"
                        required
                        value={newCertOrg}
                        onChange={(e) => setNewCertOrg(e.target.value)}
                        placeholder={currentLanguage === "en" ? "e.g., NAMI Training Institute" : "जैसे: NAMI ट्रेनिंग संस्थान"}
                        className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                      {currentLanguage === "en" ? "Expiry Date (if applicable):" : "समाप्ति तिथि (यदि लागू हो):"}
                    </label>
                    <input
                      type="date"
                      value={newCertExpiry}
                      onChange={(e) => setNewCertExpiry(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-black py-2 rounded-xl text-xs shadow-sm"
                    >
                      {currentLanguage === "en" ? "✓ Submit for Review (Pending)" : "✓ समीक्षा हेतु जमा करें (Pending)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSubmittingCert(false)}
                      className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                    >
                      {currentLanguage === "en" ? "Cancel" : "रद्द करें"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsCredentialsModalOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-3 rounded-2xl text-sm transition-colors"
            >
              {currentLanguage === "en" ? "Close" : "बंद करें (Close)"}
            </button>
          </div>
        </div>
      )}

      {/* ================= P2P: FEATURE PHONE / IVR SIMULATOR MODAL ================= */}
      {isFeaturePhoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3.5 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl max-w-sm w-full p-5 space-y-4 border-4 border-blue-500 shadow-2xl text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📞</span>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {currentLanguage === "en" ? "YANTRIQ Phone Service (IVR)" : "YANTRIQ फोन सेवा (IVR)"}
                  </h3>
                  <p className="text-[11px] font-bold text-blue-300">
                    {currentLanguage === "en" ? "Toll-Free: 1800-AGRI-HELP" : "टोल-फ्री: 1800-AGRI-HELP"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFeaturePhoneModalOpen(false)}
                className="text-slate-400 hover:text-white font-black text-2xl p-1"
                aria-label={currentLanguage === "en" ? "End Call" : "कॉल समाप्त करें"}
              >
                ✕
              </button>
            </div>

            {/* Kisan Call Center (IVR) Notice */}
            <div className="text-[11px] font-bold text-blue-200 bg-blue-950/60 p-2.5 rounded-xl border border-blue-500/50 leading-snug">
              📞 <strong>{currentLanguage === "en" ? "Kisan Helpline (IVR):" : "किसान हेल्पलाइन (IVR):"}</strong>{" "}
              {currentLanguage === "en"
                ? "Farmers without smartphones can register complaints into the central repair system via this IVR."
                : "बिना स्मार्टफोन वाला किसान भी सामान्य फोन से इस IVR के जरिए उसी केंद्रीय मरम्मत प्रणाली में शिकायत दर्ज कर सकता है।"}
            </div>

            {/* IVR Voice Output Screen */}
            <div className="bg-slate-950 p-4 rounded-2xl border-2 border-blue-600/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  {currentLanguage === "en" ? "Call connected..." : "कॉल चालू है..."}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {currentLanguage === "en" ? "Caller:" : "कॉलर:"} {ivrState.callerPhone}
                </span>
              </div>
              <p className="text-sm font-bold text-amber-100 bg-slate-900/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
                🔊 &quot;{ivrState.audioPromptHi}&quot;
              </p>
              {ivrState.statusMessageHi && (
                <div className="text-xs font-black text-emerald-300 bg-emerald-950/70 p-2 rounded-lg border border-emerald-600/50">
                  {ivrState.statusMessageHi}
                </div>
              )}
            </div>

            {/* DTMF Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {[
                { key: "1", sub: currentLanguage === "en" ? "Repair" : "शिकायत" },
                { key: "2", sub: currentLanguage === "en" ? "Status" : "स्थिति" },
                { key: "3", sub: currentLanguage === "en" ? "Mechanic" : "मैकेनिक" },
                { key: "4", sub: currentLanguage === "en" ? "Service" : "सर्विस" },
                { key: "5", sub: "JKL" },
                { key: "6", sub: "MNO" },
                { key: "7", sub: "PQRS" },
                { key: "8", sub: "TUV" },
                { key: "9", sub: currentLanguage === "en" ? "Menu" : "मेनू" },
                { key: "*", sub: currentLanguage === "en" ? "Cancel" : "रद्द" },
                { key: "0", sub: currentLanguage === "en" ? "Operator" : "ऑपरेटर" },
                { key: "#", sub: currentLanguage === "en" ? "Confirm" : "पुष्टि" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleKeypadPress(item.key)}
                  className="bg-slate-800 hover:bg-blue-600 active:bg-blue-700 text-white rounded-2xl py-3 flex flex-col items-center justify-center border border-slate-700 transition-all active:scale-95 shadow-sm"
                >
                  <span className="text-xl font-black">{item.key}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{item.sub}</span>
                </button>
              ))}
            </div>

            {/* End Call / Reset */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIvrState({
                    step: "main_menu",
                    callerPhone: "9876543210",
                    audioPromptHi: "YANTRIQ किसान हेल्पलाइन में आपका स्वागत है। मशीन मरम्मत के लिए 1 दबाएं, शिकायत की स्थिति जानने के लिए 2 दबाएं, मैकेनिक से सीधे बात करने के लिए 3 दबाएं।",
                    options: [
                      { key: "1", labelHi: "मशीन मरम्मत", actionTextHi: "1: मशीन मरम्मत" },
                      { key: "2", labelHi: "शिकायत स्थिति", actionTextHi: "2: स्थिति जांचें" },
                      { key: "3", labelHi: "मैकेनिक संपर्क", actionTextHi: "3: मैकेनिक संपर्क" },
                    ],
                  });
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs border border-slate-700"
              >
                {currentLanguage === "en" ? "🔄 Restart Call" : "🔄 दोबारा कॉल शुरू करें"}
              </button>
              <button
                type="button"
                onClick={() => setIsFeaturePhoneModalOpen(false)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl text-xs shadow-md"
              >
                {currentLanguage === "en" ? "🔴 End Call" : "🔴 कॉल समाप्त करें"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= P2P: ASSISTED ACCESS / FPO DESK MODAL ================= */}
      {isAssistedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-3.5 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 border-4 border-amber-500 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl p-2 bg-amber-100 rounded-2xl">🌾</span>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {currentLanguage === "en" ? "FPO / Assisted Access Desk" : "FPO / सहायक सेवा डेस्क"}
                  </h3>
                  <div className="text-xs font-bold text-slate-500">
                    {currentLanguage === "en" ? "Operator: Sunil Patil • Nagpur Farmer FPO Center" : "ऑपरेटर: सुनील पाटिल • नागपुर किसान FPO केंद्र"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssistedModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-2xl p-1"
                aria-label={currentLanguage === "en" ? "Close" : "बंद करें"}
              >
                ✕
              </button>
            </div>

            {/* Info notice */}
            <div className="text-xs font-bold text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 leading-snug">
              {currentLanguage === "en"
                ? "ℹ️ Operators log complaints reported by farmers over the phone or in person. These connect directly to the recovery engine."
                : "ℹ️ किसान द्वारा फोन या केंद्र पर आकर बताई गई समस्या को ऑपरेटर यहाँ दर्ज करता है। यह शिकायत सीधे मुख्य रिकवरी इंजन से जुड़ेगी।"}
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  {currentLanguage === "en" ? "Farmer Name:" : "किसान का नाम:"}
                </label>
                <input
                  type="text"
                  value={assistedFarmerName}
                  onChange={(e) => setAssistedFarmerName(e.target.value)}
                  className="w-full border-2 border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  {currentLanguage === "en" ? "Farmer Phone Number (SMS alerts sent here):" : "किसान का फोन नंबर (SMS इसी पर जाएगा):"}
                </label>
                <input
                  type="text"
                  value={assistedFarmerPhone}
                  onChange={(e) => setAssistedFarmerPhone(e.target.value)}
                  className="w-full border-2 border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  {currentLanguage === "en" ? "Select Machine:" : "मशीन चुनें:"}
                </label>
                <select
                  value={assistedMachineId}
                  onChange={(e) => setAssistedMachineId(e.target.value)}
                  className="w-full border-2 border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.icon} {currentLanguage === "en" ? m.name : m.nameHi} ({m.type || m.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  {currentLanguage === "en" ? "Machine Problem (Details):" : "मशीन में समस्या (विवरण):"}
                </label>
                <textarea
                  rows={3}
                  value={assistedProblemText}
                  onChange={(e) => setAssistedProblemText(e.target.value)}
                  className="w-full border-2 border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="bg-red-50 border border-red-300 rounded-xl p-2.5 flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span className="text-xs font-black text-red-950">
                  {currentLanguage === "en" ? "Emergency: Sowing starts tomorrow (Critical agricultural period)" : "आपातकालीन: कल बुवाई का दिन है (महत्वपूर्ण कृषि काल)"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleAssistedSubmit}
                className="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-black py-3 px-4 rounded-xl text-base shadow-md border-2 border-amber-700 transition-all"
              >
                {currentLanguage === "en" ? "✓ Log Complaint & Create Recovery Plan" : "✓ शिकायत दर्ज करें व रिकवरी योजना बनाएं"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= P2P: SIMULATED SMS NOTIFICATION LOG DRAWER ================= */}
      {isSmsDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3.5 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-y-auto p-5 space-y-4 border-4 border-slate-700 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl p-1.5 bg-slate-100 rounded-2xl">📱</span>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {currentLanguage === "en" ? "SMS Message History" : "SMS संदेश इतिहास"}
                  </h3>
                  <div className="text-xs font-bold text-slate-500">
                    {currentLanguage === "en" ? "Alerts and confirmation messages sent to farmer" : "किसान को भेजे गए अलर्ट व पुष्टि संदेश"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSmsDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-2xl p-1"
                aria-label={currentLanguage === "en" ? "Close" : "बंद करें"}
              >
                ✕
              </button>
            </div>

            {/* SMS Service Notice */}
            <div className="text-[11px] font-bold text-slate-700 bg-slate-100 p-2.5 rounded-xl border border-slate-300 leading-snug">
              📱 <strong>{currentLanguage === "en" ? "SMS Alert Records:" : "एसएमएस सेवा रिकॉर्ड:"}</strong>{" "}
              {currentLanguage === "en"
                ? "Official repair notifications dispatched to registered farmer and technician mobile numbers."
                : "किसान और मैकेनिक के पंजीकृत नंबरों पर भेजे गए आधिकारिक मरम्मत अलर्ट।"}
            </div>

            {/* SMS List */}
            {(() => {
              const smsList = getSMSNotificationHistory();
              if (smsList.length === 0) {
                return (
                  <div className="text-center py-8 text-slate-500 space-y-2">
                    <span className="text-3xl sm:text-4xl block">📭</span>
                    <p className="text-sm font-bold">
                      {currentLanguage === "en" ? "No SMS messages sent yet." : "अभी तक कोई SMS संदेश नहीं भेजा गया है।"}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {smsList.map((sms) => (
                    <div
                      key={sms.id}
                      className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-800">
                          {currentLanguage === "en" ? "Recipient:" : "प्राप्तकर्ता:"} {sms.recipientPhone}
                        </span>
                        <span className="text-slate-500 font-bold">
                          {new Date(sms.sentAt).toLocaleTimeString(currentLanguage === "en" ? "en-IN" : "hi-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed font-mono">
                        {sms.messageTextHi}
                      </p>
                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="text-emerald-700 font-bold">
                          {currentLanguage === "en" ? "✓ Status: Successfully Sent (Simulated)" : "✓ स्थिति: सफलतापूर्वक भेजा गया (सिम्युलेटेड)"}
                        </span>
                        <span className="text-slate-400 uppercase">{sms.eventType}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setIsSmsDrawerOpen(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-2xl text-sm"
            >
              {currentLanguage === "en" ? "Close" : "बंद करें (Close)"}
            </button>
          </div>
        </div>
      )}

      {/* ================= PROFILE SCREEN ================= */}
      {currentScreen === "profile" && authSession?.user && (
        <ProfileScreen
          user={authSession.user}
          currentLanguage={currentLanguage}
          onBack={() => setCurrentScreen("home")}
          onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
          onLogout={handleLogout}
          onNavigateToRepairs={() => setCurrentScreen("repair")}
          onNavigateToMachines={() => setCurrentScreen("machines")}
          onNavigateToServiceHistory={() => setCurrentScreen("service")}
          onOpenHelp={() => setCurrentScreen("sahayak")}
        />
      )}

      {/* ================= MAIN CONTENT ================= */}
      {currentScreen !== "profile" && (
        <main className="flex-1 p-4 max-w-md mx-auto w-full">
        {/* ================= 1. HOME SCREEN (COMPACT & INTUITIVE) ================= */}
        {currentScreen === "home" && (
          <div className="space-y-3 animate-fadeIn">
            {/* 1. GREETING (COMPACT) */}
            <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5 leading-snug">
                  <span>{currentLanguage === "en" ? "Hello," : "नमस्ते,"}</span>
                  <span className="capitalize">{authSession.user.nameHi || authSession.user.name}</span>
                  <span className="select-none">👋</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-tight">
                  {currentLanguage === "en" ? "How is your machine today?" : "आज आपकी मशीन कैसी है?"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>{currentLanguage === "en" ? "Active" : "सक्रिय"}</span>
              </span>
            </div>

            {/* 2. किसान हेल्प (COMPACT BAR) */}
            <div
              id="home-kisan-help-tab"
              onClick={() => setCurrentScreen("kisan_help")}
              className="w-full bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-xl px-3.5 py-2.5 shadow-xs border border-emerald-900/60 cursor-pointer hover:shadow-md transition-all flex items-center justify-between group active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl p-1.5 bg-white/15 rounded-lg shrink-0 select-none">
                  🗣️✨
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                    {currentLanguage === "en" ? "Farmer Help" : "किसान हेल्प"}
                  </h3>
                  <p className="text-xs text-emerald-100 font-medium truncate mt-0.5">
                    {currentLanguage === "en" ? "Ask questions by voice" : "बोलकर सवाल पूछें"}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-white text-emerald-900 px-3 py-1.5 rounded-lg shrink-0 shadow-2xs group-hover:bg-emerald-50 transition-colors flex items-center gap-1">
                <span>{currentLanguage === "en" ? "Ask" : "पूछें"}</span>
                <span>→</span>
              </span>
            </div>

            {/* 3. QUICK ACTIONS (COMPACT 2x2 TILES) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Tile 1: 🔧 समस्या रिपोर्ट करें */}
              <button
                type="button"
                id="home-report-breakdown-tile"
                onClick={() => handleStartBreakdown()}
                className="bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white rounded-xl p-2.5 shadow-2xs border border-emerald-800 transition-all flex items-center gap-2.5 text-left cursor-pointer min-h-[52px]"
              >
                <span className="w-8 h-8 rounded-lg bg-emerald-800/80 flex items-center justify-center text-lg shrink-0">
                  🔧
                </span>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold block leading-tight text-white truncate">
                    {currentLanguage === "en" ? "Report Problem" : "समस्या रिपोर्ट करें"}
                  </span>
                  <span className="text-[10px] text-emerald-100 font-medium block truncate">
                    {currentLanguage === "en" ? "Book repair" : "मैकेनिक बुलाएं"}
                  </span>
                </div>
              </button>

              {/* Tile 2: 📞 फोन से मदद */}
              <button
                type="button"
                id="home-open-ivr-tile"
                onClick={() => setIsFeaturePhoneModalOpen(true)}
                className="bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 rounded-xl p-2.5 shadow-2xs border border-slate-200 transition-all flex items-center gap-2.5 text-left cursor-pointer min-h-[52px]"
              >
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0">
                  📞
                </span>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold block leading-tight text-slate-900 truncate">
                    {currentLanguage === "en" ? "Phone Help" : "फोन से मदद"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block truncate">
                    {currentLanguage === "en" ? "IVR Helpline" : "टोल-फ्री सहायता"}
                  </span>
                </div>
              </button>

              {/* Tile 3: 🛠️ स्पेयर पार्ट्स */}
              <button
                type="button"
                id="home-open-assisted-tile"
                onClick={() => setIsAssistedModalOpen(true)}
                className="bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 rounded-xl p-2.5 shadow-2xs border border-slate-200 transition-all flex items-center gap-2.5 text-left cursor-pointer min-h-[52px]"
              >
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0">
                  🛠️
                </span>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold block leading-tight text-slate-900 truncate">
                    {currentLanguage === "en" ? "Spare Parts" : "स्पेयर पार्ट्स"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block truncate">
                    {currentLanguage === "en" ? "Assisted Desk" : "पुर्जे सहायता"}
                  </span>
                </div>
              </button>

              {/* Tile 4: 🛡️ मशीन सुरक्षा */}
              <button
                type="button"
                id="home-open-recovery-tile"
                onClick={() => handleLaunchRecoveryEngine(machines[0], currentLanguage === "en" ? "Machine safety and emergency support" : "मशीन सुरक्षा और आपातकालीन सहायता")}
                className="bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 rounded-xl p-2.5 shadow-2xs border border-slate-200 transition-all flex items-center gap-2.5 text-left cursor-pointer min-h-[52px]"
              >
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0">
                  🛡️
                </span>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold block leading-tight text-slate-900 truncate">
                    {currentLanguage === "en" ? "Machine Safety" : "मशीन सुरक्षा"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block truncate">
                    {currentLanguage === "en" ? "Downtime Care" : "बैकअप सुरक्षा"}
                  </span>
                </div>
              </button>
            </div>

            {/* 4. मेरी मशीनें (COMPACT 2-COLUMN CATALOGUE) */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-base select-none">🚜</span>
                  <h2 className="text-sm font-bold text-slate-900">
                    {t("dashboard.myMachines", currentLanguage)}
                  </h2>
                </div>
                <button
                  type="button"
                  id="home-view-all-machines-btn"
                  onClick={() => setCurrentScreen("machines")}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer shrink-0"
                >
                  {currentLanguage === "en" ? "View All →" : "सभी देखें →"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {machines.map((machine) => {
                  const machineImage = machine.imageUrl || MACHINE_IMAGE_MAP[machine.id];
                  const isHealthy = machine.maintenanceStatus !== "overdue" && machine.maintenanceStatus !== "due";
                  return (
                    <button
                      key={machine.id}
                      type="button"
                      onClick={() => handleOpenMachineDetail(machine)}
                      className="p-2 bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 rounded-lg flex items-center justify-between gap-1.5 transition-colors text-left cursor-pointer group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-10 h-10 p-0.5 bg-white rounded-md border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {machineImage ? (
                            <img
                              src={machineImage}
                              alt={currentLanguage === "en" ? machine.name : machine.nameHi}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = "none";
                                const fallback = target.parentElement?.querySelector(".fallback-icon") as HTMLElement;
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <span
                            className="fallback-icon text-xl items-center justify-center"
                            style={{ display: machineImage ? "none" : "flex" }}
                          >
                            {machine.icon}
                          </span>
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-emerald-800 transition-colors">
                            {currentLanguage === "en" ? machine.name : machine.nameHi}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              machine.maintenanceStatus === "overdue"
                                ? "bg-red-500"
                                : machine.maintenanceStatus === "due"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`} />
                            <span className="truncate">
                              {machine.statusText || (isHealthy ? (currentLanguage === "en" ? "Ready" : "चालू") : (currentLanguage === "en" ? "Service" : "सर्विस बाकी"))}
                            </span>
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400 group-hover:text-emerald-700 text-xs font-bold shrink-0">
                        →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. REPAIR & SERVICE COMBINED COMPACT SECTION */}
            {(() => {
              const overdueM = machines.find((m) => m.maintenanceStatus === "overdue");
              const dueM = machines.find((m) => m.maintenanceStatus === "due");
              const firstUpcoming = machines.find((m) => m.maintenanceStatus === "upcoming") || machines[0];
              const displayM = overdueM || dueM || firstUpcoming;

              return (
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
                  {/* Row 1: मेरी मरम्मत (Active Repair or Status) */}
                  <div
                    onClick={() => setCurrentScreen("repair")}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center text-sm shrink-0">
                        🔧
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {currentLanguage === "en" ? "My Repairs" : "मेरी मरम्मत"}
                          </span>
                          {activeRepairs.length > 0 ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              {activeRepairs[0].status === "repairing" || activeRepairs[0].status === "repair_in_progress"
                                ? (currentLanguage === "en" ? "In Progress" : "मरम्मत जारी")
                                : (currentLanguage === "en" ? "Assigned" : "टेक्नीशियन नियुक्त")}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {currentLanguage === "en" ? "All Clear" : "कोई समस्या नहीं"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {activeRepairs.length > 0
                            ? `${activeRepairs[0].machineNameHi} की मरम्मत जारी है • रिपोर्ट ✓ टेक्नीशियन ✓`
                            : (currentLanguage === "en" ? "No active repairs underway" : "वर्तमान में कोई मरम्मत लंबित नहीं है")}
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-400 group-hover:text-emerald-700 text-xs font-bold shrink-0">
                      →
                    </span>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* Row 2: अगली सर्विस (Upcoming / Due Service) */}
                  <div
                    onClick={() => setCurrentScreen("service")}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-center text-sm shrink-0">
                        📅
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {currentLanguage === "en" ? "Next Service" : "अगली सर्विस"}
                          </span>
                          {overdueM ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800">
                              {currentLanguage === "en" ? "Overdue" : "समय बीता"}
                            </span>
                          ) : dueM ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              {currentLanguage === "en" ? "Due Soon" : "जल्द बाकी"}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              {currentLanguage === "en" ? "Upcoming" : "नियमित"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {displayM
                            ? `${displayM.nameHi || displayM.name} — ${formatServiceDateHi(displayM.nextServiceDate)}`
                            : (currentLanguage === "en" ? "All machines up to date" : "सभी मशीनें ठीक हैं")}
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-400 group-hover:text-emerald-700 text-xs font-bold shrink-0">
                      →
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* P2J Step 1: Sync Debug Panel (Unobtrusive) */}
        {currentScreen === "home" && (
          <div className="pt-2">
            <details className="text-xs text-slate-400 group">
              <summary className="cursor-pointer py-1 text-center font-bold text-slate-400 hover:text-slate-600">
                तकनीकी जानकारी (जाँच के लिए)
              </summary>
              <div className="pt-2">
                <SyncDebugPanel isOnline={isOnline} onRefresh={refreshData} />
              </div>
            </details>
          </div>
        )}

        {/* ================= 2. MY MACHINES SCREEN ================= */}
        {currentScreen === "machines" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🚜</span> {t("machines.title", currentLanguage)}
              </h2>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                {t("common.total", currentLanguage)}: {machines.length}
              </span>
            </div>

            {/* + नई मशीन जोड़ें Button */}
            <button
              onClick={() => {
                setNewMachineType("tractor");
                setNewMachineName(currentLanguage === "en" ? "New Mahindra 575 Tractor" : "नया महिंद्रा 575 ट्रैक्टर");
                setIsAddMachineModalOpen(true);
              }}
              className="w-full bg-emerald-700 hover:bg-emerald-800 transition-colors text-white font-semibold py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ {t("machines.addMachineBtn", currentLanguage)}</span>
            </button>

            {/* Add Machine Modal / Panel */}
            {isAddMachineModalOpen && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>🚜</span> {currentLanguage === "en" ? "Register New Machine" : "नई मशीन पंजीकरण"}
                  </h3>
                  <button
                    onClick={() => setIsAddMachineModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 rounded-md cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t("machines.selectType", currentLanguage)}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: "tractor", label: currentLanguage === "en" ? "Tractor" : "ट्रैक्टर", icon: "🚜", interval: currentLanguage === "en" ? "90 days" : "90 दिन" },
                      { type: "sprayer", label: currentLanguage === "en" ? "Sprayer" : "स्प्रेयर", icon: "🎒", interval: currentLanguage === "en" ? "60 days" : "60 दिन" },
                      { type: "water_pump", label: currentLanguage === "en" ? "Water Pump" : "वाटर पंप", icon: "💧", interval: currentLanguage === "en" ? "90 days" : "90 दिन" },
                      { type: "power_tiller", label: currentLanguage === "en" ? "Power Tiller" : "पावर टिलर", icon: "🚜", interval: currentLanguage === "en" ? "90 days" : "90 दिन" },
                    ].map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => {
                          setNewMachineType(opt.type);
                          setNewMachineName(currentLanguage === "en" ? `New ${opt.label}` : `नया ${opt.label}`);
                        }}
                        className={`p-2.5 rounded-lg border text-left font-medium transition-colors cursor-pointer ${
                          newMachineType === opt.type
                            ? "bg-emerald-50 text-emerald-900 border-emerald-600"
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-xl mb-0.5">{opt.icon}</div>
                        <div className="text-sm font-semibold">{opt.label}</div>
                        <div className={`text-[11px] ${newMachineType === opt.type ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
                          {currentLanguage === "en" ? "Service" : "सर्विस"}: {opt.interval}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t("machines.machineName", currentLanguage)}
                  </label>
                  <input
                    type="text"
                    value={newMachineName}
                    onChange={(e) => setNewMachineName(e.target.value)}
                    placeholder={currentLanguage === "en" ? "e.g. Mahindra 575 Tractor" : "जैसे: महिंद्रा 575 ट्रैक्टर"}
                    className="w-full p-2.5 rounded-md border border-slate-300 font-medium text-sm text-slate-900 bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddMachineModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-md text-sm transition-colors cursor-pointer border border-slate-200"
                  >
                    {t("common.cancel", currentLanguage)}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegisterMachineSubmit()}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-md text-sm transition-colors cursor-pointer shadow-2xs"
                  >
                    ✓ {t("machines.addMachineBtn", currentLanguage)}
                  </button>
                </div>
              </div>
            )}

            {/* Machines List or Empty State */}
            {machines.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3 shadow-2xs">
                <span className="text-4xl block">🚜</span>
                <h3 className="text-base font-bold text-slate-900">
                  {currentLanguage === "en" ? "No machines registered yet" : "अभी कोई मशीन नहीं जुड़ी है"}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {currentLanguage === "en"
                    ? "Add your tractor, sprayer, or pump to track maintenance and book repairs."
                    : "सर्विस ट्रैक करने और त्वरित मरम्मत के लिए अपनी मशीन जोड़ें।"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewMachineType("tractor");
                    setNewMachineName(currentLanguage === "en" ? "New Mahindra 575 Tractor" : "नया महिंद्रा 575 ट्रैक्टर");
                    setIsAddMachineModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ {currentLanguage === "en" ? "Add Machine" : "मशीन जोड़ें"}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {machines.map((machine) => {
                  const machineImage = machine.imageUrl || MACHINE_IMAGE_MAP[machine.id];

                  // Actual backend status derivation
                  let statusText = "ठीक है";
                  let statusDot = "●";
                  let statusClass = "text-emerald-700 bg-emerald-50 border-emerald-200";

                  if (machine.status === "issue") {
                    statusText = "मरम्मत चल रही है";
                    statusDot = "🔧";
                    statusClass = "text-red-700 bg-red-50 border-red-200";
                  } else if (machine.status === "service_soon" || machine.maintenanceStatus === "due" || machine.maintenanceStatus === "overdue") {
                    statusText = "सर्विस जरूरी है";
                    statusDot = "⚠";
                    statusClass = "text-amber-700 bg-amber-50 border-amber-200";
                  }

                  const localizedStatus = currentLanguage === "en"
                    ? (machine.status === "issue" ? "Repair in progress" : machine.status === "service_soon" ? "Service required" : "Operational")
                    : statusText;

                  return (
                    <button
                      key={machine.id}
                      type="button"
                      onClick={() => handleOpenMachineDetail(machine)}
                      className="w-full bg-white hover:bg-slate-50/90 active:bg-slate-100 border border-slate-200 hover:border-emerald-300 rounded-xl p-3 shadow-2xs transition-all text-left cursor-pointer group flex flex-col gap-2.5"
                    >
                      {/* [ MACHINE IMAGE ] */}
                      <div className="w-full h-36 sm:h-40 bg-slate-50/70 rounded-lg p-2.5 flex items-center justify-center border border-slate-100 overflow-hidden relative">
                        {machineImage ? (
                          <img
                            src={machineImage}
                            alt={currentLanguage === "en" ? machine.name : machine.nameHi}
                            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = "none";
                              const fallback = target.parentElement?.querySelector(".fallback-icon") as HTMLElement;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <span
                          className="fallback-icon text-4xl items-center justify-center text-slate-400"
                          style={{ display: machineImage ? "none" : "flex" }}
                        >
                          {machine.icon}
                        </span>
                      </div>

                      {/* Machine Name & Status */}
                      <div className="flex items-center justify-between gap-3 px-1">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                            {currentLanguage === "en" ? machine.name : machine.nameHi}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold">
                            <span className="text-slate-500 font-medium">
                              {currentLanguage === "en" ? "Status:" : "स्थिति:"}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${statusClass}`}>
                              <span>{statusDot}</span>
                              <span>{localizedStatus}</span>
                            </span>
                          </div>
                        </div>

                        <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-700 text-slate-600 group-hover:text-white flex items-center justify-center text-sm font-bold transition-all shrink-0">
                          →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= 3. MACHINE DETAILS SCREEN (MACHINE PASSPORT) ================= */}
        {currentScreen === "machine_detail" && (
          <div className="space-y-4">
            {/* Reminder Alert Banner */}
            {selectedMachine.maintenanceStatus === "overdue" && (
              <div className="bg-red-50 border border-red-200 text-red-900 p-3 rounded-lg font-semibold text-xs flex items-center gap-2.5">
                <span className="text-base shrink-0">⚠️</span>
                <span>{currentLanguage === "en" ? "Service is overdue for this machine." : "इस मशीन की सर्विस बाकी है।"}</span>
              </div>
            )}
            {selectedMachine.maintenanceStatus === "due" && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg font-semibold text-xs flex items-center gap-2.5">
                <span className="text-base shrink-0">🔔</span>
                <span>{currentLanguage === "en" ? "Service is due soon for this machine." : "इस मशीन की सर्विस जल्द करनी है।"}</span>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 p-1 bg-emerald-50 rounded-md border border-emerald-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {selectedMachine.imageUrl || MACHINE_IMAGE_MAP[selectedMachine.id] ? (
                    <img
                      src={selectedMachine.imageUrl || MACHINE_IMAGE_MAP[selectedMachine.id]}
                      alt={currentLanguage === "en" ? selectedMachine.name : selectedMachine.nameHi}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        const fallback = target.parentElement?.querySelector(".fallback-icon") as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <span
                    className="fallback-icon text-2xl items-center justify-center"
                    style={{ display: (selectedMachine.imageUrl || MACHINE_IMAGE_MAP[selectedMachine.id]) ? "none" : "flex" }}
                  >
                    {selectedMachine.icon}
                  </span>
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {currentLanguage === "en" ? selectedMachine.name : selectedMachine.nameHi}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {selectedMachine.name} • {selectedMachine.type}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">{currentLanguage === "en" ? "Machine Status:" : "मशीन स्थिति:"}</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-md ${
                    selectedMachine.status === "issue"
                      ? "bg-amber-50 text-amber-900 border border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {selectedMachine.status === "issue" ? t("machines.attentionNeeded", currentLanguage) : t("machines.operational", currentLanguage)}
                </span>
              </div>

              {/* P2G STEP 2: "🔧 अगली सर्विस" Card */}
              {(() => {
                const statusDisp = getMaintenanceStatusDisplay(selectedMachine.maintenanceStatus || "upcoming");
                const checklistItems =
                  selectedMachine.maintenanceItems && selectedMachine.maintenanceItems.length > 0
                    ? selectedMachine.maintenanceItems
                    : getDefaultMaintenanceItems(selectedMachine.type || selectedMachine.name);

                return (
                  <div
                    className={`rounded-lg border p-4 space-y-3.5 ${
                      selectedMachine.maintenanceStatus === "overdue"
                        ? "bg-red-50/50 border-red-200"
                        : selectedMachine.maintenanceStatus === "due"
                        ? "bg-amber-50/50 border-amber-200"
                        : "bg-slate-50/50 border-slate-200"
                    }`}
                  >
                    {/* Header: अगली सर्विस & Reminder */}
                    <div className="flex items-center justify-between border-b pb-2.5 border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">📅</span>
                        <span className="text-sm font-bold text-slate-900">
                          {selectedMachine.maintenanceStatus === "overdue" || selectedMachine.maintenanceStatus === "due"
                            ? (currentLanguage === "en" ? "Service Is Due" : "सर्विस का समय आ गया है")
                            : t("passport.nextMaintenance", currentLanguage)}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusDisp.badgeClass}`}>
                        {currentLanguage === "en" ? (selectedMachine.maintenanceStatus === "overdue" ? "🔴 Overdue" : selectedMachine.maintenanceStatus === "due" ? "🟠 Due" : "🟢 Upcoming") : statusDisp.fullTagHi}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="p-3 bg-white rounded-md border border-slate-200 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-700" />
                        <span className="font-semibold text-slate-800">
                          {t("passport.nextMaintenance", currentLanguage)}: {currentLanguage === "en" ? selectedMachine.nextServiceDate : formatServiceDateHi(selectedMachine.nextServiceDate)}
                        </span>
                      </div>
                    </div>

                    {/* Maintenance Checklist */}
                    <div className="bg-white rounded-md p-3.5 border border-slate-200 space-y-2">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>📋</span>
                        <span>{currentLanguage === "en" ? "What to check during service?" : "सर्विस में क्या देखें?"}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {currentLanguage === "en" ? "Check off each item when inspected:" : "जाँच पूरी होने पर टिक करें:"}
                      </p>

                      <div className="space-y-1.5 pt-0.5">
                        {checklistItems.map((item) => {
                          const isChecked = !!checkedChecklistItems[item];
                          return (
                            <div
                              key={item}
                              onClick={() => handleToggleChecklistItem(item)}
                              className={`cursor-pointer p-2.5 rounded-md border flex items-center gap-2.5 transition-colors text-xs ${
                                isChecked
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold"
                                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span>{item}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Service Completed Button */}
                    <button
                      onClick={() => handleCompleteService(selectedMachine.id)}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 transition-colors text-white font-semibold py-2.5 px-4 rounded-md text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{currentLanguage === "en" ? "Mark Service as Completed" : "सर्विस पूरी हो गई"}</span>
                    </button>
                  </div>
                );
              })()}

              {/* SECTION 11: मेरी मशीन की जानकारी (Machine Passport) */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-2xs">
                <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📖</span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {t("machines.machinePassport", currentLanguage)}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    {currentLanguage === "en" ? "Verified Records" : "सुरक्षित रिकॉर्ड"}
                  </span>
                </div>

                {/* 1. पिछली मरम्मत */}
                <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>🔧</span>
                    <span>{t("passport.previousRepairs", currentLanguage)}</span>
                  </div>
                  {(() => {
                    const completedMachineRepairs = repairs.filter(
                      (r) => r.machineId === selectedMachine.id && r.status === "completed"
                    );

                    if (completedMachineRepairs.length > 0) {
                      return (
                        <div className="space-y-1.5">
                          {completedMachineRepairs.map((rep) => {
                            const dateStr =
                              rep.passportData?.repairDate ||
                              (rep.verificationTime
                                ? new Date(rep.verificationTime).toLocaleDateString(currentLanguage === "en" ? "en-IN" : "hi-IN")
                                : new Date(rep.createdAt).toLocaleDateString(currentLanguage === "en" ? "en-IN" : "hi-IN"));
                            const diagStr =
                              rep.passportData?.diagnosis ||
                              rep.diagnosis?.possibleProblem ||
                              (currentLanguage === "en" ? "General Inspection" : "सामान्य जाँच");
                            const techStr =
                              rep.passportData?.technician ||
                              (currentLanguage === "en" ? rep.selectedTechnician?.name : rep.selectedTechnician?.nameHi) ||
                              (currentLanguage === "en" ? "Certified Mechanic" : "प्रमाणित मैकेनिक");

                            return (
                              <div
                                key={rep.id}
                                className="p-2.5 bg-white rounded-md border border-slate-200 text-xs space-y-1"
                              >
                                <div className="flex justify-between font-semibold text-slate-900">
                                  <span>{rep.problemDescription}</span>
                                  <span className="text-[11px] text-slate-500">📅 {dateStr}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-100 flex-wrap gap-1">
                                  <span className="text-slate-600 font-medium">
                                    {currentLanguage === "en" ? "Check" : "जाँच"}: {diagStr} • {t("recovery.technician", currentLanguage)}: {techStr}
                                    {rep.passportData?.serviceCentreNameHi && ` (${rep.passportData.serviceCentreNameHi})`}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {rep.passportData?.estimatedCost && (
                                      <span className="text-[11px] text-slate-500 font-medium">
                                        {currentLanguage === "en" ? "Estimate:" : "अनुमान:"} {formatCurrencyHi(rep.passportData.estimatedCost)}
                                      </span>
                                    )}
                                    {(rep.passportData?.finalCost || rep.finalCost?.total || rep.estimatedCost?.total) && (
                                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                        {t("pricing.finalCost", currentLanguage)}: {formatCurrencyHi(rep.passportData?.finalCost || rep.finalCost?.total || rep.estimatedCost?.total)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {rep.passportData?.maintenanceRecommendation && (
                                  <div className="text-[11px] font-medium text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200 mt-1">
                                    💡 {currentLanguage === "en" ? "Preventive Advice:" : "निवारक सलाह:"} {rep.passportData.maintenanceRecommendation}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return (
                      <div className="text-xs font-medium text-slate-600">
                        {selectedMachine.previousRepairs || (currentLanguage === "en" ? "No major repairs recorded" : "कोई बड़ी मरम्मत दर्ज नहीं")}
                      </div>
                    );
                  })()}
                </div>

                {/* 2. बदले गए पार्ट */}
                <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>⚙️</span>
                    <span>{t("machines.partsReplaced", currentLanguage)}</span>
                  </div>
                  {(() => {
                    const completedMachineRepairs = repairs.filter(
                      (r) => r.machineId === selectedMachine.id && r.status === "completed"
                    );
                    const dynamicParts = completedMachineRepairs.flatMap((r) => {
                      if (r.passportData?.partsUsed && r.passportData.partsUsed.length > 0) {
                        return r.passportData.partsUsed;
                      }
                      if (r.selectedParts && r.selectedParts.length > 0) {
                        return r.selectedParts
                          .filter((p) => p.decision === "needed")
                          .map((p) => currentLanguage === "en" ? ((p as any).partName || p.partNameHi) : p.partNameHi);
                      }
                      return [];
                    });

                    if (dynamicParts.length > 0) {
                      const allParts = [
                        ...dynamicParts,
                        ...(selectedMachine.partsReplaced
                          ? selectedMachine.partsReplaced.split(",").map((s) => s.trim())
                          : []),
                      ];
                      const uniqueParts = Array.from(new Set(allParts));
                      return (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {uniqueParts.map((part, idx) => (
                            <span
                              key={idx}
                              className="bg-white text-slate-800 font-medium px-2 py-0.5 rounded text-xs border border-slate-200"
                            >
                              ⚙️ {part}
                            </span>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div className="text-xs font-medium text-slate-600">
                        {selectedMachine.partsReplaced || (currentLanguage === "en" ? "No parts replaced yet" : "कोई नया पार्ट नहीं बदला गया")}
                      </div>
                    );
                  })()}
                </div>

                {/* 3. कुल सेवा रिकॉर्ड */}
                <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>📋</span>
                    <span>{t("passport.serviceHistoryTotal", currentLanguage)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-md border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">{currentLanguage === "en" ? "Total Usage:" : "कुल संचालन:"}</span>
                      <span className="text-xs font-bold text-slate-900">
                        {currentLanguage === "en"
                          ? `${selectedMachine.operatingHours.replace("घंटे", "").trim()} hrs`
                          : selectedMachine.operatingHours.includes("घंटे")
                          ? selectedMachine.operatingHours
                          : `${selectedMachine.operatingHours} घंटे`}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-md border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">{currentLanguage === "en" ? "Last Service:" : "पिछली सर्विस:"}</span>
                      <span className="text-xs font-bold text-slate-900">
                        {currentLanguage === "en" ? (selectedMachine.lastServiceDate || selectedMachine.lastService) : (formatServiceDateHi(selectedMachine.lastServiceDate) || selectedMachine.lastService)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Job-Ready Verification Records */}
                {(() => {
                  const { getJobReadinessForRepair } = require("@/services/jobReadinessService") as typeof import("@/services/jobReadinessService");
                  return null;
                })()}
                {/* JRV Records Display */}
                {(() => {
                  try {
                    const raw = typeof window !== "undefined" ? localStorage.getItem("agripulse_job_readiness_v1") : null;
                    const allJrv: Array<{id:string;machineId:string;repairRequestId:string;operation:string;status:string;score:number;farmerVerified:boolean;createdAt:string;technicianNameHi?:string;evidence?:string[];evidenceMetadata?:Array<{mediaType:string}>;visualAnalysis?:{source:string;evidence_quality:string}}> = raw ? JSON.parse(raw) : [];
                    const machineJrv = allJrv
                      .filter((r) => r.machineId === selectedMachine.id)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 3);
                    if (machineJrv.length === 0) return null;
                    return (
                      <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200 space-y-2">
                        <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <span>🎒</span>
                          <span>Job-Ready Verification History</span>
                        </div>
                        <div className="space-y-2">
                          {machineJrv.map((jrv, idx) => {
                            const statusEmoji = jrv.status === "JOB_READY" ? "✅" : jrv.status === "NOT_JOB_READY" ? "❌" : jrv.status === "STOP_AND_TECHNICIAN" ? "🛑" : "⚠️";
                            const statusLabel = jrv.status === "JOB_READY" ? "JOB READY" : jrv.status === "NOT_JOB_READY" ? "NOT JOB-READY" : jrv.status === "STOP_AND_TECHNICIAN" ? "STOP" : "NEED RECHECK";
                            const evidenceCount = jrv.evidenceMetadata?.length ?? jrv.evidence?.length ?? 0;
                            const isLatest = idx === 0;
                            return (
                              <div key={jrv.id} className={`p-2.5 rounded-md border text-xs space-y-1.5 ${isLatest ? "bg-white border-emerald-300 shadow-sm" : "bg-emerald-50/50 border-emerald-100"}`}>
                                <div className="flex justify-between items-center">
                                  <span className={`font-black ${jrv.status === "JOB_READY" ? "text-emerald-800" : jrv.status === "NOT_JOB_READY" ? "text-orange-700" : jrv.status === "STOP_AND_TECHNICIAN" ? "text-red-700" : "text-amber-700"}`}>
                                    {statusEmoji} {statusLabel}
                                  </span>
                                  <span className="text-slate-500 font-bold">Score: {jrv.score}/100</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-500">
                                  <span>🌿 {jrv.operation}</span>
                                  <span>{new Date(jrv.createdAt).toLocaleDateString("hi-IN")}</span>
                                </div>
                                {jrv.technicianNameHi && (
                                  <div className="text-[11px] text-slate-600 font-medium">👨‍🔧 {jrv.technicianNameHi}</div>
                                )}
                                {evidenceCount > 0 && (
                                  <div className="text-[11px] text-blue-700 font-medium">📸 {evidenceCount} evidence captured</div>
                                )}
                                {jrv.visualAnalysis && (
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    🔍 {jrv.visualAnalysis.source === "mock_fallback" ? "Manual-Assist" : jrv.visualAnalysis.source === "local_yolo" ? "Local Vision" : "Cloud Vision"} | Quality: {jrv.visualAnalysis.evidence_quality}
                                  </div>
                                )}
                                <div className="flex gap-1.5 flex-wrap">
                                  {jrv.farmerVerified && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                      👨‍🌾 Farmer Confirmed
                                    </span>
                                  )}
                                  {isLatest && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                      Latest
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  } catch { return null; }
                })()}

                {/* 4. अगली सर्विस */}
                <div className="p-3 bg-emerald-50/70 rounded-md border border-emerald-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] font-medium text-emerald-800 block">{t("passport.nextMaintenance", currentLanguage)}:</span>
                    <span className="text-sm font-bold text-emerald-950">
                      {currentLanguage === "en" ? selectedMachine.nextServiceDate : formatServiceDateHi(selectedMachine.nextServiceDate)}
                    </span>
                  </div>
                  <span className="text-lg">📅</span>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => handleStartBreakdown(selectedMachine.id)}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <Wrench className="w-4 h-4" />
                  <span>{t("dashboard.reportBreakdown", currentLanguage)} - {t("dashboard.callMechanic", currentLanguage)}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. REPORT BREAKDOWN SCREEN ================= */}
        {currentScreen === "breakdown" && (
          <div className="space-y-3.5">
            {/* Header with Step Indicator */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-emerald-700" />
                  <span>{t("complaint.title", currentLanguage)}</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {currentLanguage === "en" ? `Step ${breakdownStep} of 4` : `चरण ${breakdownStep} / 4`}
                </p>
              </div>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                {currentLanguage === "en" ? `Step ${breakdownStep}` : `चरण ${breakdownStep}`}
              </span>
            </div>

            {/* STEP 1: कौन-सी मशीन खराब है? */}
            {breakdownStep === 1 && (
              <div className="space-y-3.5">
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-base font-bold text-slate-900">
                      {currentLanguage === "en" ? "Which machine has a problem?" : "कौन-सी मशीन खराब है?"}
                    </label>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {currentLanguage === "en" ? "Select your machine to continue:" : "मरम्मत के लिए अपनी मशीन चुनें:"}
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {machines.map((machine) => (
                      <button
                        key={machine.id}
                        type="button"
                        onClick={() => {
                          setBreakdownMachineId(machine.id);
                          setBreakdownStep(2);
                        }}
                        className={`w-full p-3 rounded-lg border flex items-center justify-between transition-colors cursor-pointer ${
                          breakdownMachineId === machine.id
                            ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-semibold"
                            : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-11 h-11 p-1 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {machine.imageUrl || MACHINE_IMAGE_MAP[machine.id] ? (
                              <img
                                src={machine.imageUrl || MACHINE_IMAGE_MAP[machine.id]}
                                alt={currentLanguage === "en" ? machine.name : machine.nameHi}
                                className="w-full h-full object-contain"
                                loading="eager"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.style.display = "none";
                                  const fallback = target.parentElement?.querySelector(".fallback-icon") as HTMLElement;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <span
                              className="fallback-icon text-2xl items-center justify-center"
                              style={{ display: (machine.imageUrl || MACHINE_IMAGE_MAP[machine.id]) ? "none" : "flex" }}
                            >
                              {machine.icon}
                            </span>
                          </span>
                          <span className="text-base font-bold text-slate-900">
                            {currentLanguage === "en" ? machine.name : machine.nameHi}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                          {currentLanguage === "en" ? "Select ➔" : "चुनें ➔"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: समस्या बताएं (Voice, Photo, Text Capture) */}
            {breakdownStep === 2 && (
              <div className="space-y-3.5">
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <label className="block text-base font-bold text-slate-900">
                        {currentLanguage === "en" ? "Report Machine Problem" : "मशीन में समस्या बताएं"}
                      </label>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {currentLanguage === "en" ? "Selected Machine: " : "चयनित उपकरण: "}
                        <span className="text-slate-900 font-semibold">
                          {currentLanguage === "en" ? currentBreakdownMachine.name : currentBreakdownMachine.nameHi} {currentBreakdownMachine.icon}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* SECTION 3: 3 OBVIOUS CHOICES (फोटो लें, बोलकर बताएं, लिखकर बताएं) */}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-600 block mb-1.5">
                      {currentLanguage === "en" ? "Choose how to report problem:" : "समस्या बताने का तरीका चुनें:"}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Option 1: Photo */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProblemMode("photo");
                          if (!breakdownPhotoPreview) photoInputRef.current?.click();
                        }}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-colors text-center cursor-pointer ${
                          activeProblemMode === "photo" || breakdownPhotoPreview
                            ? "bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold"
                            : "bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                        }`}
                      >
                        <Camera className="w-5 h-5" />
                        <span className="text-xs font-semibold leading-tight">
                          {currentLanguage === "en" ? "Take Photo" : "फोटो लें"}
                        </span>
                      </button>

                      {/* Option 2: Voice */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProblemMode("voice");
                          if (!isVoiceRecording && !breakdownDescription.trim()) startVoiceRecording();
                        }}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-colors text-center cursor-pointer ${
                          activeProblemMode === "voice" || isVoiceRecording
                            ? "bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold"
                            : "bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                        }`}
                      >
                        <Mic className="w-5 h-5" />
                        <span className="text-xs font-semibold leading-tight">
                          {currentLanguage === "en" ? "Voice Note" : "बोलकर बताएं"}
                        </span>
                      </button>

                      {/* Option 3: Type Text */}
                      <button
                        type="button"
                        onClick={() => setActiveProblemMode("text")}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-colors text-center cursor-pointer ${
                          activeProblemMode === "text"
                            ? "bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold"
                            : "bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                        }`}
                      >
                        <FileText className="w-5 h-5" />
                        <span className="text-xs font-semibold leading-tight">
                          {currentLanguage === "en" ? "Type Text" : "लिखकर बताएं"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* SECTION 4: VOICE MODE */}
                  {activeProblemMode === "voice" && (
                    <div className="space-y-2.5 pt-1">
                      <div className="text-xs font-semibold text-slate-600">
                        {currentLanguage === "en" ? "Speak machine problem" : "मशीन की समस्या बोलकर बताएं"}
                      </div>

                      {/* Recording state */}
                      {isVoiceRecording ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center space-y-2.5">
                          <div className="flex items-center justify-center gap-2 text-base font-bold text-red-900">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                            <span>{currentLanguage === "en" ? "Recording audio..." : "रिकॉर्ड हो रहा है..."}</span>
                          </div>
                          <p className="text-xs font-medium text-red-700">
                            {currentLanguage === "en" ? "Speak clearly. Press button below when done:" : "मुंह से साफ बोलें। बोलने के बाद नीचे बटन दबाएं:"}
                          </p>
                          <button
                            type="button"
                            onClick={stopVoiceRecording}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-md text-sm transition-colors cursor-pointer"
                          >
                            {currentLanguage === "en" ? "Done Speaking" : "बोलना पूरा हुआ (Done)"}
                          </button>
                        </div>
                      ) : voiceRecordedComplete && breakdownDescription.trim() ? (
                        /* Recording completed */
                        <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-emerald-900">
                              {currentLanguage === "en" ? "Voice Note Recorded" : "आवाज रिकॉर्ड हो गई है"}
                            </div>
                          </div>

                          <div className="p-3 bg-white rounded-md border border-slate-200 text-sm font-medium text-slate-900">
                            &quot;{breakdownDescription}&quot;
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            {/* Play */}
                            <button
                              type="button"
                              onClick={() => playAudioText(breakdownDescription)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>▶</span>
                              <span>{currentLanguage === "en" ? "Play" : "सुनें"}</span>
                            </button>

                            {/* Record Again */}
                            <button
                              type="button"
                              onClick={() => {
                                setBreakdownDescription("");
                                setVoiceRecordedComplete(false);
                                startVoiceRecording();
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>↺</span>
                              <span>{currentLanguage === "en" ? "Record Again" : "फिर से रिकॉर्ड करें"}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={startVoiceRecording}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg p-3.5 text-left transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md bg-emerald-800 flex items-center justify-center text-white shrink-0">
                              <Mic className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">
                                {currentLanguage === "en" ? "Tap to Speak Problem" : "दबाएं और बोलकर समस्या बताएं"}
                              </div>
                              <div className="text-xs text-emerald-100 font-normal">
                                {currentLanguage === "en" ? "Speak in Hindi or your local language" : "हिन्दी या अपनी क्षेत्रीय भाषा में बोलें"}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-semibold bg-emerald-800 text-emerald-100 px-2 py-1 rounded-md">
                            Mic
                          </span>
                        </button>
                      )}

                      {/* Live Demo Quick Phrase Helper */}
                      <button
                        type="button"
                        onClick={() => {
                          setBreakdownDescription(PRIMARY_DEMO_SCENARIO.voiceComplaint);
                          setVoiceRecordedComplete(true);
                          if (validationError) setValidationError(null);
                        }}
                        className="w-full text-left text-sm font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 p-3 rounded-xl border border-amber-300 transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <span>💡</span>
                          <span>{currentLanguage === "en" ? "Suggested complaint: " : "सुझावित समस्या: "}<strong>&quot;{PRIMARY_DEMO_SCENARIO.voiceComplaint}&quot;</strong></span>
                        </span>
                        <span className="text-amber-700 font-black">{currentLanguage === "en" ? "Tap ➔" : "टैप करें ➔"}</span>
                      </button>

                      {/* Fallback when Speech API is unavailable */}
                      {speechUnsupportedMessage && (
                        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-2">
                          <div className="text-base font-bold text-amber-950 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                            <span>{speechUnsupportedMessage}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setBreakdownDescription(PRIMARY_DEMO_SCENARIO.voiceComplaint);
                              setVoiceRecordedComplete(true);
                              setSpeechUnsupportedMessage(null);
                              if (validationError) setValidationError(null);
                            }}
                            className="w-full text-left text-sm font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 p-2.5 rounded-xl border border-amber-300 transition-colors"
                          >
                            {currentLanguage === "en" ? "💡 Add suggested phrase: " : "💡 त्वरित वाक्य जोड़ें: "}
                            <span className="underline">
                              &quot;{PRIMARY_DEMO_SCENARIO.voiceComplaint}&quot;
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 5: PHOTO MODE */}
                  {activeProblemMode === "photo" && (
                    <div className="space-y-3 pt-1">
                      <div className="text-lg font-black text-slate-900">
                        {currentLanguage === "en" ? "Take a clear photo of the problem area" : "समस्या वाली जगह की साफ फोटो लें"}
                      </div>

                      {!breakdownPhotoPreview ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            className="w-full bg-blue-50 hover:bg-blue-100 border-4 border-blue-500 rounded-2xl p-5 flex items-center gap-4 text-left shadow-md transition-all active:scale-[0.98]"
                          >
                            <span className="text-3xl sm:text-4xl p-2 sm:p-3 bg-blue-500 text-white rounded-2xl">
                              📷
                            </span>
                            <div>
                              <div className="text-2xl font-black text-blue-950">
                                {currentLanguage === "en" ? "Take Photo" : "फोटो खींचें"}
                              </div>
                              <div className="text-sm font-bold text-blue-800 mt-0.5">
                                {currentLanguage === "en" ? "Open camera and take a clear photo of the damaged part" : "कैमरा खोलकर समस्या वाली जगह की साफ फोटो लें"}
                              </div>
                            </div>
                          </button>

                          {/* Live Demo Photo Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setBreakdownPhotoPreview(DEMO_OIL_LEAK_PHOTO_DATA_URL);
                              setBreakdownMediaName(PRIMARY_DEMO_SCENARIO.photoFileName);
                              runPhotoVisionAnalysis(DEMO_OIL_LEAK_PHOTO_DATA_URL, PRIMARY_DEMO_SCENARIO.photoFileName);
                              if (validationError) setValidationError(null);
                            }}
                            className="w-full bg-blue-100 hover:bg-blue-200 border-2 border-blue-400 text-blue-950 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-between transition-colors shadow-xs"
                          >
                            <span className="flex items-center gap-2">
                              <span>🚜</span>
                              <span>{currentLanguage === "en" ? "Attach machine photo (Tractor oil leak)" : "मशीन की फोटो जोड़ें (ट्रैक्टर ऑयल रिसाव)"}</span>
                            </span>
                            <span className="text-blue-800 font-black">{currentLanguage === "en" ? "Load ➔" : "लोड करें ➔"}</span>
                          </button>
                        </div>
                      ) : (
                        /* PHOTO PREVIEW CARD */
                        <div className="p-4 bg-emerald-50 border-3 border-emerald-400 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-black text-emerald-950 flex items-center gap-1.5">
                              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                              {currentLanguage === "en" ? "Machine photo attached" : "मशीन की फोटो जुड़ गई"}
                            </span>
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="text-sm font-black text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-xl border border-red-300 transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{currentLanguage === "en" ? "Remove Photo" : "फोटो हटाएं"}</span>
                            </button>
                          </div>

                          {/* Image Preview with Bounding Box Overlay */}
                          <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 shadow-sm max-h-56 bg-black flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={breakdownPhotoPreview}
                              alt={currentLanguage === "en" ? "Machine photo" : "मशीन की फोटो"}
                              className="w-full h-auto max-h-56 object-contain"
                            />

                            {!isPhotoAnalyzing &&
                              photoVisionResult?.detected &&
                              photoVisionResult.imageQuality === "good" &&
                              photoVisionResult.visionResult?.detections?.[0]?.boundingBox && (
                                <div
                                  style={{
                                    left: `${Math.max(4, Math.min(92, photoVisionResult.visionResult.detections[0].boundingBox.x * 100))}%`,
                                    top: `${Math.max(4, Math.min(92, photoVisionResult.visionResult.detections[0].boundingBox.y * 100))}%`,
                                    width: `${Math.max(12, Math.min(90, photoVisionResult.visionResult.detections[0].boundingBox.width * 100))}%`,
                                    height: `${Math.max(12, Math.min(90, photoVisionResult.visionResult.detections[0].boundingBox.height * 100))}%`,
                                  }}
                                  className="absolute border-2 border-dashed border-amber-400 bg-amber-400/20 rounded pointer-events-none transition-all flex flex-col justify-start p-1"
                                >
                                  <span className="inline-block bg-amber-500 text-amber-950 font-black text-[10px] px-1 py-0.5 rounded shadow self-start">
                                    {currentLanguage === "en" ? "Inspection Area" : (photoVisionResult.friendlyLabelHi || "जाँच क्षेत्र")}
                                  </span>
                                </div>
                              )}
                          </div>

                          {/* 1. Loading: फोटो की जाँच हो रही है... */}
                          {isPhotoAnalyzing && (
                            <div className="p-3 bg-blue-50 border-2 border-blue-400 rounded-xl flex items-center gap-3 text-blue-950 animate-pulse">
                              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                              <span className="font-black text-base">
                                {currentLanguage === "en" ? "Analyzing photo..." : "फोटो की जाँच हो रही है..."}
                              </span>
                            </div>
                          )}

                          {/* 2. Poor Quality Image Warning (Section 5) */}
                          {!isPhotoAnalyzing && photoVisionResult?.imageQuality === "poor" && (
                            <div className="p-4 bg-amber-50 border-3 border-amber-400 rounded-2xl space-y-3">
                              <div className="flex items-start gap-2 text-amber-950 font-black text-lg">
                                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                                <span>{currentLanguage === "en" ? "Photo is not clear. Please take another photo." : "फोटो साफ नहीं है। एक और फोटो लें।"}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => photoInputRef.current?.click()}
                                  className="py-3 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-base shadow-sm transition-colors flex items-center justify-center gap-2"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  <span>{currentLanguage === "en" ? "Retake Photo" : "फिर से फोटो लें"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleStep2Next}
                                  className="py-3 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-base shadow-sm transition-colors flex items-center justify-center gap-2"
                                >
                                  <span>{currentLanguage === "en" ? "Continue ➔" : "आगे बढ़ें ➔"}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Buttons: "फिर से फोटो लें" & "आगे बढ़ें" */}
                          {!isPhotoAnalyzing && photoVisionResult?.imageQuality !== "poor" && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="py-3 text-center text-base font-black text-blue-900 bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors"
                              >
                                {currentLanguage === "en" ? "Retake Photo" : "फिर से फोटो लें"}
                              </button>
                              <button
                                type="button"
                                onClick={handleStep2Next}
                                className="py-3 text-center text-base font-black text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors shadow-sm"
                              >
                                {currentLanguage === "en" ? "Continue ➔" : "आगे बढ़ें ➔"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 3: TEXT DESCRIPTION (AVAILABLE IN ALL MODES) */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-base font-black text-slate-800">
                      {currentLanguage === "en" ? "Problem Description (Spoken or Typed):" : "समस्या का विवरण (बोला या लिखा हुआ):"}
                    </label>
                    <textarea
                      rows={3}
                      value={breakdownDescription}
                      onChange={(e) => {
                        setBreakdownDescription(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder={currentLanguage === "en" ? "Your spoken or typed problem will appear here... (e.g. Tractor not starting, smoke coming out)" : "आपकी बोली या लिखी बात यहाँ दिखेगी... (जैसे: ट्रैक्टर स्टार्ट नहीं हो रहा है, धुआं निकल रहा है)"}
                      className="w-full p-3 rounded-md border border-slate-300 text-sm font-medium text-slate-900 bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Validation Error Message */}
                  {validationError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-red-800 font-semibold text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}
                </div>

                {/* Back / Next Navigation */}
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isVoiceRecording) stopVoiceRecording();
                      setBreakdownStep(1);
                    }}
                    className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{currentLanguage === "en" ? "Change Machine" : "मशीन बदलें"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isVoiceRecording) stopVoiceRecording();
                      handleStep2Next();
                    }}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-md text-xs text-center transition-colors cursor-pointer"
                  >
                    {currentLanguage === "en" ? "Continue ➔" : "आगे बढ़ें ➔"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: आज मशीन की जरूरत है? */}
            {breakdownStep === 3 && (
              <div className="space-y-3.5">
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                  <div>
                    <label className="block text-base font-bold text-slate-900">
                      {currentLanguage === "en" ? "Is machine needed today?" : "आज मशीन की जरूरत है?"}
                    </label>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {currentLanguage === "en" ? "Specify work urgency for technician dispatch:" : "काम की आवश्यकता बताएं:"}
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {/* Yes, needed today */}
                    <button
                      type="button"
                      onClick={() => {
                        setBreakdownUrgency("today");
                        setBreakdownStep(4);
                      }}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-600 rounded-lg p-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer"
                    >
                      <span className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                        ✓
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {currentLanguage === "en" ? "Yes, needed today" : "हाँ, आज काम है (जरूरी)"}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          {currentLanguage === "en" ? "Mechanic will be dispatched urgently" : "मैकेनिक को जल्द से जल्द भेजा जाएगा"}
                        </div>
                      </div>
                    </button>

                    {/* No, can wait */}
                    <button
                      type="button"
                      onClick={() => {
                        setBreakdownUrgency("later");
                        setBreakdownStep(4);
                      }}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer"
                    >
                      <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                        ⏱
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {currentLanguage === "en" ? "No, can wait" : "नहीं, बाद में भी चलेगा"}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          {currentLanguage === "en" ? "Normal schedule repair" : "सामान्य समय पर मरम्मत होगी"}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setBreakdownStep(2)}
                  className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{currentLanguage === "en" ? "← Previous Question" : "← पिछला सवाल"}</span>
                </button>
              </div>
            )}

            {/* STEP 4: मदद चाहिए (Final Verification) */}
            {breakdownStep === 4 && (
              <div className="space-y-3.5">
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-2xs">
                  <div className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                    {currentLanguage === "en" ? "Review Your Information" : "दर्ज जानकारी की समीक्षा"}
                  </div>

                  <div className="space-y-2.5 text-base">
                    <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-slate-600">{currentLanguage === "en" ? "Broken Machine:" : "खराब मशीन:"}</span>
                      <span className="font-black text-slate-900 text-lg">
                        {currentBreakdownMachine.icon} {currentLanguage === "en" ? currentBreakdownMachine.name : currentBreakdownMachine.nameHi}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-slate-600">{currentLanguage === "en" ? "Reporting Method:" : "समस्या का तरीका:"}</span>
                      <span className="font-black text-slate-900">
                        {breakdownPhotoPreview && breakdownDescription.trim()
                          ? (currentLanguage === "en" ? "🎙️ Voice + 📷 Photo" : "🎙️ बोलकर + 📷 फोटो")
                          : breakdownPhotoPreview
                          ? (currentLanguage === "en" ? "📷 Photo" : "📷 फोटो")
                          : (currentLanguage === "en" ? "🎙️ Voice / Text" : "🎙️ बोलकर / लिखकर")}
                      </span>
                    </div>

                    {breakdownDescription && (
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="font-bold text-slate-600 block text-xs">{currentLanguage === "en" ? "Description:" : "विवरण:"}</span>
                        <span className="font-black text-slate-900 text-lg">
                          {breakdownDescription}
                        </span>
                      </div>
                    )}

                    {breakdownPhotoPreview && (
                      <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-600 block text-xs">
                            {currentLanguage === "en" ? "Attached Photo:" : "संलग्न फोटो:"}
                          </span>
                          <span className="font-bold text-emerald-800 text-sm">
                            {currentLanguage === "en" ? "✓ Photo is saved" : "✓ फोटो सुरक्षित है"}
                          </span>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={breakdownPhotoPreview}
                          alt={currentLanguage === "en" ? "Machine photo preview" : "मशीन फोटो पूर्वावलोकन"}
                          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl border border-slate-300 shadow-sm"
                        />
                      </div>
                    )}

                    <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-slate-600">{currentLanguage === "en" ? "Urgency:" : "काम की जरूरत:"}</span>
                      <span className="font-black text-emerald-800">
                        {breakdownUrgency === "today"
                          ? (currentLanguage === "en" ? "🟢 Yes, needed today" : "🟢 हाँ, आज काम है")
                          : (currentLanguage === "en" ? "⚪ Can wait" : "⚪ बाद में चलेगा")}
                      </span>
                    </div>

                    {/* Phase 2D-A: AI Diagnosis preview in verification */}
                    {currentDiagnosis && (
                      <div className="p-3.5 bg-emerald-50 rounded-2xl border-2 border-emerald-400 space-y-1">
                        <div className="flex items-center justify-between text-xs font-black text-emerald-900">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-4 h-4 text-emerald-700" />
                            {currentLanguage === "en" ? "AI Probable Diagnosis:" : "AI संभावित समस्या:"}
                          </span>
                          <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                            {currentLanguage === "en" ? `Confidence: ${currentDiagnosis.confidence}` : `विश्वास: ${currentDiagnosis.confidence}`}
                          </span>
                        </div>
                        <div className="text-base font-black text-slate-900">
                          {localizeDiagnosisProblem(currentDiagnosis.possibleProblem, currentLanguage)}
                        </div>
                        <div className="text-xs font-bold text-slate-600">
                          {currentDiagnosis.urgencyText}
                        </div>
                      </div>
                    )}

                    {/* Network state info */}
                    <div
                      className={`p-3 rounded-xl border flex items-center gap-2 ${
                        isOnline
                          ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                          : "bg-amber-50 border-amber-300 text-amber-950"
                      }`}
                    >
                      {isOnline ? (
                        <Wifi className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-amber-700 flex-shrink-0" />
                      )}
                      <span className="text-sm font-bold">
                        {isOnline
                          ? (currentLanguage === "en" ? "Internet is ON - Details will be dispatched immediately" : "इंटरनेट चालू है - जानकारी तुरंत मैकेनिक को भेजी जाएगी")
                          : (currentLanguage === "en" ? "Internet is OFF - Complaint and photo saved locally on phone" : "इंटरनेट बंद है - आपकी शिकायत और फोटो फोन में सुरक्षित रहेगी")}
                      </span>
                    </div>

                    {/* P2O Step 2: Transparent Pricing Estimate Card */}
                    {(() => {
                      const estPricing = calculateEstimatedPricing({
                        machineId: breakdownMachineId,
                        machineType: currentBreakdownMachine.type || currentBreakdownMachine.nameHi,
                        recommendedPartIds: currentPartRecommendation?.recommendations.map((r) => r.part.id),
                      });

                      return (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-3 border-amber-400 rounded-2xl p-4 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">💰</span>
                              <span className="text-lg font-black text-amber-950">
                                {t("pricing.estimatedTotal", currentLanguage)}
                              </span>
                            </div>
                            <span className="text-[11px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                              {currentLanguage === "en" ? "Transparent Rates" : "पारदर्शी दर"}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between items-center text-slate-700 font-bold">
                              <span>{t("pricing.diagnosticFee", currentLanguage)}:</span>
                              <span className="font-black text-slate-900">{formatCurrencyHi(estPricing.diagnosticFee)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-700 font-bold">
                              <span>{t("pricing.labourFee", currentLanguage)}:</span>
                              <span className="font-black text-slate-900">{formatCurrencyHi(estPricing.labourFee)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-700 font-bold">
                              <span>{t("pricing.partsEstimate", currentLanguage)}:</span>
                              <span className="font-black text-slate-900">{formatCurrencyHi(estPricing.partsEstimate)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-700 font-bold">
                              <span>{t("pricing.travelFee", currentLanguage)}:</span>
                              <span className="font-black text-slate-900">{formatCurrencyHi(estPricing.travelFee)}</span>
                            </div>
                            {estPricing.discount > 0 && (
                              <div className="flex justify-between items-center text-emerald-700 font-bold">
                                <span>{t("pricing.discount", currentLanguage)}:</span>
                                <span className="font-black text-emerald-800">-{formatCurrencyHi(estPricing.discount)}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t-2 border-dashed border-amber-300 flex justify-between items-center">
                            <div>
                              <span className="text-xs font-bold text-amber-900 block">{currentLanguage === "en" ? "Total Estimated Cost" : "कुल अनुमानित खर्च"}</span>
                              <span className="text-2xl font-black text-amber-950">
                                {formatCurrencyHi(estPricing.total)}
                              </span>
                            </div>
                            <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                              {currentLanguage === "en" ? "✓ No Hidden Charges" : "✓ नो हिडन चार्ज"}
                            </span>
                          </div>

                          <div className="text-[11px] font-bold text-amber-900/90 bg-amber-100/70 p-2.5 rounded-xl border border-amber-200 leading-snug">
                            {currentLanguage === "en" ? "⚠️ This is an estimate. Final cost may vary upon physical inspection." : "⚠️ यह अनुमान है। मशीन की जांच के बाद अंतिम कीमत बदल सकती है।"}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Primary Button */}
                  <button
                    type="button"
                    onClick={handleBreakdownSubmit}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg py-3 px-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>{currentLanguage === "en" ? "Confirm Service Request" : "सेवा की पुष्टि करें (मदद चाहिए)"}</span>
                    <span>➔</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setBreakdownStep(3)}
                  className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{currentLanguage === "en" ? "← Previous Question" : "← पिछला सवाल"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= SUCCESS SCREEN (AWARE OF OFFLINE / ONLINE) ================= */}
        {currentScreen === "breakdown_success" && lastSubmittedRepair && (
          <div className="space-y-4">
            <div
              className={`border-3 rounded-3xl p-6 text-center space-y-4 shadow-sm ${
                lastSubmittedRepair.isOfflineCreated
                  ? "bg-amber-50 border-amber-400"
                  : "bg-emerald-50 border-emerald-400"
              }`}
            >
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto text-2xl sm:text-3xl font-black shadow-md text-white ${
                  lastSubmittedRepair.isOfflineCreated ? "bg-amber-600" : "bg-emerald-600"
                }`}
              >
                {lastSubmittedRepair.isOfflineCreated ? "📴" : "✓"}
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {lastSubmittedRepair.isOfflineCreated
                    ? (currentLanguage === "en" ? "Your complaint is saved on phone." : "आपकी शिकायत फोन में सुरक्षित है।")
                    : (currentLanguage === "en" ? "Your repair request has been received." : "आपकी मरम्मत की जानकारी मिल गई है।")}
                </h2>
                <p className="text-base font-bold text-slate-700 mt-1">
                  {lastSubmittedRepair.isOfflineCreated
                    ? (currentLanguage === "en" ? "Details will be sent as soon as internet is available." : "इंटरनेट मिलते ही जानकारी भेज दी जाएगी।")
                    : (currentLanguage === "en" ? "Repair request has been registered." : "मरम्मत की शिकायत दर्ज हो गई है।")}
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 text-left space-y-2.5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <span className="text-2xl sm:text-3xl p-1 bg-slate-100 rounded-lg">
                    {lastSubmittedRepair.machineIcon}
                  </span>
                  <div>
                    <div className="text-lg font-black text-slate-900">
                      {currentLanguage === "en"
                        ? (machines.find((m) => m.id === lastSubmittedRepair.machineId)?.name || lastSubmittedRepair.machineNameHi)
                        : lastSubmittedRepair.machineNameHi}
                    </div>
                    <div className="text-xs font-bold text-slate-500">
                      {currentLanguage === "en" ? `Complaint ID: ${lastSubmittedRepair.id}` : `शिकायत संख्या: ${lastSubmittedRepair.id}`}
                    </div>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="font-bold text-slate-600">{currentLanguage === "en" ? "Problem: " : "समस्या: "}</span>
                  <span className="font-black text-slate-900">{lastSubmittedRepair.problemDescription}</span>
                </div>

                {lastSubmittedRepair.photoDataUrl && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 block">{currentLanguage === "en" ? "Attached Photo:" : "संलग्न फोटो:"}</span>
                      <span className="text-sm font-black text-emerald-800">{currentLanguage === "en" ? "📷 Photo saved" : "📷 फोटो सुरक्षित है"}</span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lastSubmittedRepair.photoDataUrl}
                      alt={currentLanguage === "en" ? "Attached photo" : "संलग्न फोटो"}
                      className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-slate-300 shadow-sm"
                    />
                  </div>
                )}

                <div className="text-sm">
                  <span className="font-bold text-slate-600">{currentLanguage === "en" ? "Urgency: " : "प्राथमिकता: "}</span>
                  <span className="font-black text-emerald-800">
                    {lastSubmittedRepair.urgency === "today"
                      ? (currentLanguage === "en" ? "Urgent today" : "आज जरूरी काम है")
                      : (currentLanguage === "en" ? "Normal" : "सामान्य")}
                  </span>
                </div>

                {/* Phase 2D-A: AI Diagnosis preview in Success Screen */}
                {lastSubmittedRepair.diagnosis && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 space-y-1">
                    <div className="flex items-center justify-between text-xs font-black text-emerald-900">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                        {currentLanguage === "en" ? "AI Probable Diagnosis:" : "AI संभावित समस्या:"}
                      </span>
                      <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-[11px]">
                        {currentLanguage === "en" ? `Confidence: ${lastSubmittedRepair.diagnosis.confidence}` : `विश्वास: ${lastSubmittedRepair.diagnosis.confidence}`}
                      </span>
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {localizeDiagnosisProblem(lastSubmittedRepair.diagnosis.possibleProblem, currentLanguage)}
                    </div>
                    <div className="text-xs font-bold text-slate-600">
                      {lastSubmittedRepair.diagnosis.urgencyText}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-900">{currentLanguage === "en" ? "Current Status:" : "वर्तमान स्थिति:"}</span>
                  <span className="text-sm font-black text-amber-950">
                    {currentLanguage === "en" ? ((lastSubmittedRepair as any).statusTextEn || lastSubmittedRepair.statusTextHi || lastSubmittedRepair.status) : lastSubmittedRepair.statusTextHi}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setCurrentScreen("repair")}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>{currentLanguage === "en" ? "View My Repair" : "मेरी मरम्मत देखें"}</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 4B. AI DIAGNOSIS SCREEN (Phase 2D-A) ================= */}
        {currentScreen === "diagnosis" && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 bg-slate-50 rounded-md border border-slate-200">
                    {machines.find((m) => m.id === breakdownMachineId)?.icon || "🚜"}
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {machines.find((m) => m.id === breakdownMachineId)?.[currentLanguage === "en" ? "name" : "nameHi"] || (currentLanguage === "en" ? "Machine" : "मशीन")}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {machines.find((m) => m.id === breakdownMachineId)?.name} • {machines.find((m) => m.id === breakdownMachineId)?.type}
                    </p>
                  </div>
                </div>
                <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200">
                  {currentLanguage === "en" ? "Diagnostic Assessment" : "प्रारंभिक तकनीकी जाँच"}
                </span>
              </div>
            </div>

            {/* 1. Progress indicator: "मशीन की जाँच हो रही है..." */}
            {isDiagnosing ? (
              <div className="bg-white border border-slate-200 rounded-lg p-6 text-center space-y-4 shadow-2xs">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xl mx-auto">
                  🔍
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {currentLanguage === "en" ? "Inspecting machine..." : "मशीन की जाँच हो रही है..."}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentLanguage === "en" ? "Analyzing problem and machine status" : "आपकी समस्या एवं मशीन की स्थिति की जाँच की जा रही है"}
                  </p>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div className="bg-emerald-700 h-full rounded-full w-4/5 animate-pulse transition-all duration-700"></div>
                </div>

                <div className="text-xs text-slate-500">
                  {currentLanguage === "en" ? "Data is safe • Instant on-device diagnosis" : "डेटा सुरक्षित है • फोन में ही त्वरित जाँच"}
                </div>
              </div>
            ) : currentDiagnosis && (
              /* 2. Structured Diagnostic Assessment Report */
              <div className="space-y-3.5">
                {/* Safety Warning (restrained alert callout) */}
                {currentDiagnosis.safetyWarning && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-950 p-3.5 rounded-lg text-sm font-semibold flex items-start gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">⚠️</span>
                    <span>{currentDiagnosis.safetyWarning}</span>
                  </div>
                )}

                {/* Main Diagnostic Report Card */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-2xs divide-y divide-slate-100 overflow-hidden">
                  {/* Top: Header & Priority */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {currentLanguage === "en" ? "AI-Assisted Assessment" : "तकनीकी जाँच रिपोर्ट"}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">
                        {currentLanguage === "en" ? "Preliminary service evaluation" : "प्रारंभिक सेवा मूल्यांकन"}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                        breakdownUrgency === "today" || currentDiagnosis.urgencyLevel === "high"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : currentDiagnosis.urgencyLevel === "medium"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {breakdownUrgency === "today" || currentDiagnosis.urgencyLevel === "high"
                        ? (currentLanguage === "en" ? "High Priority" : "अति आवश्यक")
                        : currentDiagnosis.urgencyLevel === "medium"
                        ? (currentLanguage === "en" ? "Prompt Attention" : "जल्दी दिखाएं")
                        : (currentLanguage === "en" ? "Normal" : "सामान्य")}
                    </span>
                  </div>

                  {/* Clean Voice Controls Bar */}
                  <div className="p-3 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Volume2 className="w-4 h-4 text-slate-600 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {currentLanguage === "en" ? "Voice Explanation" : "आवाज में सुनें"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {diagnosisVoiceState === "speaking"
                            ? (currentLanguage === "en" ? "Playing audio..." : "ऑडियो चल रहा है...")
                            : (currentLanguage === "en" ? "Listen to spoken assessment" : "जाँच रिपोर्ट बोलकर सुनें")}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(diagnosisVoiceState === "blocked" || diagnosisVoiceState === "idle") && (
                        <button
                          type="button"
                          onClick={() => speakDiagnosisVoice(undefined, true)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-1.5 px-3 rounded-md text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{currentLanguage === "en" ? "Listen" : "सुनें"}</span>
                        </button>
                      )}
                      {diagnosisVoiceState === "speaking" && (
                        <>
                          <button
                            type="button"
                            onClick={pauseDiagnosisVoice}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 px-2.5 rounded-md text-xs transition-colors cursor-pointer"
                          >
                            ⏸
                          </button>
                          <button
                            type="button"
                            onClick={stopDiagnosisVoice}
                            className="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-1.5 px-2.5 rounded-md text-xs transition-colors cursor-pointer"
                          >
                            ⏹
                          </button>
                        </>
                      )}
                      {diagnosisVoiceState === "paused" && (
                        <>
                          <button
                            type="button"
                            onClick={resumeDiagnosisVoice}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-1.5 px-2.5 rounded-md text-xs transition-colors cursor-pointer"
                          >
                            ▶
                          </button>
                          <button
                            type="button"
                            onClick={stopDiagnosisVoice}
                            className="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-1.5 px-2.5 rounded-md text-xs transition-colors cursor-pointer"
                          >
                            ⏹
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={replayDiagnosisVoice}
                        className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold py-1.5 px-2 rounded-md text-xs transition-colors cursor-pointer"
                        title={t("diagnosis.replayVoiceBtn", currentLanguage)}
                      >
                        ↺
                      </button>
                    </div>
                  </div>

                  {/* Photo Analysis Evidence */}
                  {(breakdownPhotoPreview || sahayakPhoto || currentDiagnosis.photoAnalysis) && (
                    <div className="p-4 space-y-1 bg-slate-50/50">
                      <div className="text-xs font-semibold text-slate-500 uppercase">
                        {currentLanguage === "en" ? "Photo Evidence Analysis" : "फोटो साक्ष्य विश्लेषण"}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {currentDiagnosis.photoAnalysis?.isClear
                          ? (currentLanguage === "en" ? `Detection: ${currentDiagnosis.photoAnalysis.detectedIssue}` : `पहचान: ${currentDiagnosis.photoAnalysis.detectedIssue}`)
                          : (currentLanguage === "en" ? "Issue not clear from photo. Mechanic physical inspection needed." : "फोटो से समस्या साफ़ नहीं दिख रही है। मैकेनिक की जाँच ज़रूरी है।")}
                      </div>
                    </div>
                  )}

                  {/* Section 1: Problem */}
                  <div className="p-4 space-y-1">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {currentLanguage === "en" ? "Problem" : "पहचानी गई समस्या"}
                    </div>
                    <div className="text-base font-bold text-slate-900 leading-snug">
                      {currentDiagnosis.farmerProblem || localizeDiagnosisProblem(currentDiagnosis.possibleProblem, currentLanguage)}
                    </div>
                    {currentDiagnosis.farmerExplanation && (
                      <p className="text-xs text-slate-600 mt-1">
                        {currentDiagnosis.farmerExplanation}
                      </p>
                    )}
                  </div>

                  {/* Section 2: Possible Cause & Confidence */}
                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {currentLanguage === "en" ? "Possible Cause" : "संभावित कारण"}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {currentLanguage === "en" ? `Confidence: ${currentDiagnosis.confidence}` : `विश्वास: ${currentDiagnosis.confidence}`}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      {currentDiagnosis.possibleProblem}
                    </div>
                    {currentDiagnosis.reasons && currentDiagnosis.reasons.length > 0 && (
                      <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-600 pt-1">
                        {currentDiagnosis.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Section 3: Recommended Action (What to do now) */}
                  <div className="p-4 space-y-2">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("diagnosis.whatToDoNow", currentLanguage)}
                    </div>
                    <div className="space-y-1.5 pt-0.5">
                      {(currentDiagnosis.farmerSteps && currentDiagnosis.farmerSteps.length > 0
                        ? currentDiagnosis.farmerSteps
                        : (currentDiagnosis.immediateActions && currentDiagnosis.immediateActions.length > 0)
                        ? currentDiagnosis.immediateActions
                        : [currentDiagnosis.safeAction]
                      ).map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs font-medium text-slate-800">
                          <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 text-[10px] font-bold border border-slate-300 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 4: What Not to Do */}
                  <div className="p-4 space-y-1.5">
                    <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                      {t("diagnosis.whatNotToDo", currentLanguage)}
                    </div>
                    <div className="space-y-1">
                      {(currentDiagnosis.farmerAvoid && currentDiagnosis.farmerAvoid.length > 0
                        ? currentDiagnosis.farmerAvoid
                        : [
                            currentLanguage === "en"
                              ? "Do not repeatedly try to start the machine."
                              : "मशीन को बार-बार स्टार्ट करने की कोशिश न करें।"
                          ]
                      ).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs font-medium text-rose-950">
                          <span className="text-rose-600 font-bold leading-none mt-0.5 shrink-0">✕</span>
                          <span className="leading-snug">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 5: Technician Required Assessment */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {currentLanguage === "en" ? "Technician Required" : "मैकेनिक की आवश्यकता"}
                      </div>
                      <div className="text-xs text-slate-600 font-medium mt-0.5">
                        {currentDiagnosis.whenToCallMechanic || (
                          currentLanguage === "en"
                            ? "Professional repair recommended for field safety."
                            : "खेत में सुरक्षा के लिए पेशेवर मरम्मत की सलाह दी जाती है।"
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md shrink-0">
                      {currentLanguage === "en" ? "Yes (Recommended)" : "हाँ (अनुशंसित)"}
                    </span>
                  </div>

                  {/* Multi-turn AI Follow-up Question Card */}
                  {(currentDiagnosis.nextAction === "NEED_MORE_INFORMATION" ||
                    (currentDiagnosis.question &&
                      currentDiagnosis.question.trim().length > 0)) && (
                    <div className="bg-emerald-50 border-3 border-emerald-500 rounded-2xl p-4 space-y-3 shadow-md">
                      <div className="flex items-center gap-2 text-emerald-950 font-black text-lg">
                        <span className="text-2xl">❓</span>
                        <span>
                          {currentLanguage === "en"
                            ? "AI Question — Please answer to complete diagnosis:"
                            : "जाँच पूरी करने के लिए एक सवाल का जवाब दें:"}
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border-2 border-emerald-300 text-lg font-black text-slate-900 leading-snug">
                        {currentDiagnosis.question}
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={followUpAnswerText}
                            onChange={(e) => setFollowUpAnswerText(e.target.value)}
                            placeholder={
                              currentLanguage === "en"
                                ? "Speak or type your answer..."
                                : "बोलकर या लिखकर उत्तर दें..."
                            }
                            className="flex-1 p-3 rounded-xl border-2 border-slate-300 text-base font-bold text-slate-900 bg-white focus:outline-none focus:border-emerald-600 shadow-inner"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && followUpAnswerText.trim()) {
                                handleAnswerDiagnosisQuestion(followUpAnswerText);
                              }
                            }}
                          />
                          {/* Speak button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isVoiceRecording) {
                                stopVoiceRecording();
                              } else {
                                startFollowUpVoiceRecording();
                              }
                            }}
                            className={`px-4 py-3 rounded-xl border-2 font-black text-xl transition-all shadow-sm ${
                              isVoiceRecording
                                ? "bg-red-600 text-white border-red-700 animate-pulse"
                                : "bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200"
                            }`}
                            title={currentLanguage === "en" ? "Voice answer" : "बोलकर बताएं"}
                          >
                            🎤
                          </button>
                          {/* Photo button */}
                          <label
                            className="cursor-pointer px-4 py-3 rounded-xl border-2 bg-blue-100 border-blue-400 text-blue-950 hover:bg-blue-200 font-black text-xl flex items-center justify-center transition-all shadow-sm"
                            title={currentLanguage === "en" ? "Take fresh photo" : "साफ फोटो लें"}
                          >
                            📷
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const b64 = ev.target?.result as string;
                                    handleAnswerDiagnosisQuestion(
                                      followUpAnswerText ||
                                        (currentLanguage === "en"
                                          ? "New clear photo attached"
                                          : "मशीन की नई साफ फोटो संलग्न की"),
                                      b64
                                    );
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>

                        {/* Submit answer button */}
                        <button
                          type="button"
                          disabled={!followUpAnswerText.trim()}
                          onClick={() => handleAnswerDiagnosisQuestion(followUpAnswerText)}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 px-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
                        >
                          <span>⚡</span>
                          <span>
                            {currentLanguage === "en"
                              ? "Send Answer & Continue Diagnosis ➔"
                              : "उत्तर भेजें और पुनः जाँच करें ➔"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fallback Note if offline or fallback */}
                  {currentDiagnosis.fallbackNote && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 text-center">
                      {currentDiagnosis.fallbackNote}
                    </div>
                  )}

                  {/* Small Disclaimer */}
                  <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 text-center">
                    <p className="text-sm font-black text-slate-800 flex items-center justify-center gap-1.5">
                      <span>⚠️</span>
                      <span>{currentLanguage === "en" ? "⚠️ Final confirmation will be done by the mechanic." : "⚠️ अंतिम पुष्टि मैकेनिक करेगा।"}</span>
                    </p>
                  </div>

                  {/* 7. Expandable "जानकारी देखें" Section */}
                  {showDiagnosisDetails && (
                    <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 space-y-3 pt-3">
                      <div className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span>📋</span>
                        <span>{currentLanguage === "en" ? "Machine History & Evidence Details" : "मशीन इतिहास एवं साक्ष्य विवरण"}</span>
                      </div>
                      <div className="space-y-2 text-sm font-bold text-slate-700">
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{currentLanguage === "en" ? "Machine Model / Type:" : "मशीन मॉडल / प्रकार:"}</span>
                          <span className="text-slate-900 font-black">
                            {machines.find((m) => m.id === breakdownMachineId)?.name} (
                            {machines.find((m) => m.id === breakdownMachineId)?.type})
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{currentLanguage === "en" ? "Last Service:" : "पिछली सर्विस:"}</span>
                          <span className="text-slate-900 font-black">
                            {machines.find((m) => m.id === breakdownMachineId)?.lastService}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{currentLanguage === "en" ? "Total Hours:" : "कुल संचालन:"}</span>
                          <span className="text-slate-900 font-black">
                            {machines.find((m) => m.id === breakdownMachineId)?.operatingHours}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{currentLanguage === "en" ? "Current Status:" : "वर्तमान स्थिति:"}</span>
                          <span className="text-emerald-700 font-black">
                            {machines.find((m) => m.id === breakdownMachineId)?.statusText}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">{currentLanguage === "en" ? "Previous Repairs:" : "पूर्व मरम्मत:"}</span>
                          <span className="text-slate-800 font-bold">
                            {machines.find((m) => m.id === breakdownMachineId)?.previousRepairs}
                          </span>
                        </div>
                        {/* Farmer's complaint preview */}
                        {(breakdownDescription || sahayakDescription) && (
                          <div className="pt-1">
                            <span className="text-xs text-slate-500 block mb-0.5">{currentLanguage === "en" ? "Farmer's Complaint:" : "किसान की शिकायत:"}</span>
                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold">
                              &quot;{breakdownDescription || sahayakDescription}&quot;
                            </div>
                          </div>
                        )}
                        {/* Photo Preview if attached */}
                        {(breakdownPhotoPreview || sahayakPhoto) && (
                          <div className="pt-1 space-y-2">
                            <span className="text-xs text-slate-500 block">{currentLanguage === "en" ? "Attached Photo Evidence:" : "संलग्न फोटो साक्ष्य:"}</span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={breakdownPhotoPreview || sahayakPhoto || ""}
                              alt={currentLanguage === "en" ? "Photo Evidence" : "फोटो साक्ष्य"}
                              className="w-28 h-28 object-cover rounded-xl border-2 border-emerald-500 shadow-sm"
                            />
                            {currentDiagnosis.photoAnalysis && (
                              <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-1 mt-2">
                                <span className="text-xs font-black text-blue-900 block">
                                  {currentLanguage === "en" ? "Photo Analysis Details:" : "फोटो विश्लेषण विवरण:"}
                                </span>
                                <div className="text-sm font-black text-slate-900">
                                  {currentDiagnosis.photoAnalysis.detectedIssue}
                                </div>
                                <div className="text-xs font-bold text-slate-600">
                                  {currentDiagnosis.photoAnalysis.evidence.join(" • ")}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 7. Action Buttons */}
                  <div className="space-y-2 pt-1">
                    {/* Primary Button: View Recovery Plan */}
                    <button
                      type="button"
                      id="launch-recovery-engine-diag-btn"
                      onClick={() => handleLaunchRecoveryEngine()}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                    >
                      <span>⚡</span>
                      <span>{currentLanguage === "en" ? "View Machine Recovery Plan ➔" : "मशीन रिकवरी योजना देखें ➔"}</span>
                    </button>

                    {/* Secondary Button: Mechanic list */}
                    <button
                      type="button"
                      onClick={handleContinueToRepair}
                      className="w-full bg-white hover:bg-slate-50 text-slate-800 font-semibold py-2.5 px-4 rounded-lg text-xs border border-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Wrench className="w-4 h-4 text-emerald-700" />
                      <span>{currentLanguage === "en" ? "Go to Mechanics List Directly" : "सीधे मैकेनिक सूची में जाएं"}</span>
                    </button>

                    {/* Button 3: Details toggle */}
                    <button
                      type="button"
                      onClick={() => setShowDiagnosisDetails(!showDiagnosisDetails)}
                      className="w-full bg-white hover:bg-slate-50 text-slate-600 font-medium py-2 px-3 rounded-lg text-xs border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{showDiagnosisDetails ? (currentLanguage === "en" ? "▲ Hide Technical Details" : "▲ तकनीकी विवरण छुपाएं") : (currentLanguage === "en" ? "ℹ️ Machine History & Evidence Details" : "ℹ️ साक्ष्य एवं मशीन विवरण")}</span>
                    </button>
                  </div>
                </div>

                {/* Back navigation */}
                <button
                  type="button"
                  onClick={handleBackFromDiagnosis}
                  className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{currentLanguage === "en" ? "← Change Issue / Go Back" : "← समस्या बदलें / वापस जाएं"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= 5. KISAN SAHAYAK (किसान सहायक) SCREEN ================= */}
        {currentScreen === "sahayak" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border-3 border-amber-400 rounded-3xl p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl p-2 sm:p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm">
                  🤖
                </span>
                <div>
                  <h2 className="text-2xl font-black text-amber-950">
                    {currentLanguage === "en" ? "Farmer Assistant" : "किसान सहायक"}
                  </h2>
                  <p className="text-base font-bold text-amber-900">
                    {currentLanguage === "en" ? "Ask anything about your machine" : "अपनी मशीन के बारे में कुछ भी पूछें"}
                  </p>
                </div>
              </div>
            </div>

            {/* Answer Display Card if question asked */}
            {sahayakQuestionAnswer && (
              <div className="bg-emerald-50 border-3 border-emerald-500 rounded-3xl p-5 space-y-3 shadow-md">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <span className="text-xs font-black text-emerald-900 uppercase tracking-wide truncate max-w-[220px]">
                    {currentLanguage === "en" ? "Question: " : "सवाल: "}{sahayakQuestionAnswer.question}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSahayakQuestionAnswer(null);
                      if (typeof window !== "undefined" && "speechSynthesis" in window) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className="text-xs font-black text-slate-500 hover:text-slate-800 bg-emerald-100 px-2 py-0.5 rounded-lg"
                  >
                    {currentLanguage === "en" ? "✕ Close" : "✕ बंद करें"}
                  </button>
                </div>
                <div className="text-xl font-black text-slate-900 leading-snug">
                  {sahayakQuestionAnswer.answer}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => playAudioText(sahayakQuestionAnswer.answer)}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-black py-3 px-4 rounded-xl text-base flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98]"
                  >
                    <span>{currentLanguage === "en" ? "▶️ Listen" : "▶️ बोलकर सुनें"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSahayakQuestionAnswer(null);
                      if (typeof window !== "undefined" && "speechSynthesis" in window) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className="bg-white text-slate-700 font-black py-3 px-4 rounded-xl text-base border border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    {currentLanguage === "en" ? "🔄 New Question" : "🔄 नया सवाल"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Suggested Prompts & Input Modes */}
            {sahayakStep === "init" && (
              <div className="space-y-4">
                {/* 1. Two Large Asking Modes: 🎤 बोलकर पूछें & ⌨️ लिखकर पूछें */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSahayakInputMode("voice");
                      handleSahayakSelectOption("voice");
                    }}
                    className="bg-white hover:bg-amber-50 active:scale-[0.98] border-3 border-amber-400 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center gap-1.5 text-center transition-all"
                  >
                    <span className="text-2xl sm:text-3xl">🎤</span>
                    <span className="text-lg font-black text-slate-900">{currentLanguage === "en" ? "Ask by Voice" : "बोलकर पूछें"}</span>
                    <span className="text-xs font-bold text-amber-900">{currentLanguage === "en" ? "Speak clearly" : "मुंह से बोलें"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSahayakInputMode("text");
                    }}
                    className={`bg-white hover:bg-blue-50 active:scale-[0.98] border-3 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
                      sahayakInputMode === "text" ? "border-blue-600 bg-blue-50" : "border-blue-400"
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl">⌨️</span>
                    <span className="text-lg font-black text-slate-900">{currentLanguage === "en" ? "Type Question" : "लिखकर पूछें"}</span>
                    <span className="text-xs font-bold text-blue-900">{currentLanguage === "en" ? "Ask by typing" : "टाइप करके पूछें"}</span>
                  </button>
                </div>

                {/* If Text Mode active, show input box */}
                {sahayakInputMode === "text" && (
                  <div className="bg-white border-2 border-blue-400 rounded-2xl p-4 space-y-2 shadow-sm">
                    <label className="block text-sm font-black text-slate-800">
                      {currentLanguage === "en" ? "Write your question here:" : "अपना सवाल यहाँ लिखें:"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={sahayakCustomText}
                        onChange={(e) => setSahayakCustomText(e.target.value)}
                        placeholder={currentLanguage === "en" ? "e.g.: When is next service?..." : "जैसे: अगली सर्विस कब है?..."}
                        className="flex-1 p-3.5 rounded-xl border-2 border-slate-300 text-base font-bold text-slate-900 focus:outline-none focus:border-blue-600 bg-slate-50"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && sahayakCustomText.trim()) {
                            handleSahayakAskPrompt(sahayakCustomText.trim());
                            setSahayakCustomText("");
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (sahayakCustomText.trim()) {
                            handleSahayakAskPrompt(sahayakCustomText.trim());
                            setSahayakCustomText("");
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 rounded-xl text-base shadow-sm transition-colors"
                      >
                        {currentLanguage === "en" ? "Ask ➔" : "पूछें ➔"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Four Farmer-Friendly Suggested Prompts */}
                <div className="bg-white border-3 border-slate-200 rounded-3xl p-4 shadow-sm space-y-2.5">
                  <div className="text-base font-black text-slate-800 flex items-center gap-2">
                    <span>💡</span>
                    <span>{currentLanguage === "en" ? "Direct Questions (Tap to ask):" : "सीधे पूछें (टैप करें):"}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSahayakAskPrompt(currentLanguage === "en" ? "What is my repair status?" : "मेरी मशीन की मरम्मत कहाँ तक पहुँची?")}
                      className="w-full text-left p-3.5 bg-slate-50 hover:bg-amber-50 active:scale-[0.98] rounded-2xl border-2 border-slate-200 hover:border-amber-400 text-base font-black text-slate-900 flex items-center justify-between transition-all"
                    >
                      <span>{currentLanguage === "en" ? "🚜 Where has my machine repair reached?" : "🚜 मेरी मशीन की मरम्मत कहाँ तक पहुँची?"}</span>
                      <span className="text-slate-400">➔</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSahayakAskPrompt(currentLanguage === "en" ? "When is next service?" : "अगली सर्विस कब है?")}
                      className="w-full text-left p-3.5 bg-slate-50 hover:bg-emerald-50 active:scale-[0.98] rounded-2xl border-2 border-slate-200 hover:border-emerald-400 text-base font-black text-slate-900 flex items-center justify-between transition-all"
                    >
                      <span>{currentLanguage === "en" ? "📅 When is the next service?" : "📅 अगली सर्विस कब है?"}</span>
                      <span className="text-slate-400">➔</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSahayakAskPrompt(currentLanguage === "en" ? "What was the problem with my machine?" : "मेरी मशीन में क्या समस्या थी?")}
                      className="w-full text-left p-3.5 bg-slate-50 hover:bg-blue-50 active:scale-[0.98] rounded-2xl border-2 border-slate-200 hover:border-blue-400 text-base font-black text-slate-900 flex items-center justify-between transition-all"
                    >
                      <span>{currentLanguage === "en" ? "🔍 What was the issue with my machine?" : "🔍 मेरी मशीन में क्या समस्या थी?"}</span>
                      <span className="text-slate-400">➔</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSahayakAskPrompt(currentLanguage === "en" ? "What should I do right now?" : "अभी मुझे क्या करना चाहिए?")}
                      className="w-full text-left p-3.5 bg-slate-50 hover:bg-red-50 active:scale-[0.98] rounded-2xl border-2 border-slate-200 hover:border-red-400 text-base font-black text-slate-900 flex items-center justify-between transition-all"
                    >
                      <span>{currentLanguage === "en" ? "🛡️ What should I do right now?" : "🛡️ अभी मुझे क्या करना चाहिए?"}</span>
                      <span className="text-slate-400">➔</span>
                    </button>
                  </div>
                </div>

                {/* 3. Primary Action: मशीन में समस्या है */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleStartBreakdown()}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-emerald-950 flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98]"
                  >
                    <Wrench className="w-6 h-6 text-amber-300" />
                    <span>{currentLanguage === "en" ? "🔧 Problem in Machine - Call Mechanic" : "🔧 मशीन में समस्या है - मैकेनिक बुलाएं"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSahayakSelectOption("photo")}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-950 font-black py-3 px-4 rounded-2xl text-base border-2 border-blue-300 flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>{currentLanguage === "en" ? "📷 Send Machine Photo" : "📷 मशीन की फोटो भेजें"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step: VOICE RECORDING (Problem 1 Fix) */}
            {sahayakStep === "voice" && (
              <div className="space-y-4">
                <div className="bg-white border-3 border-amber-400 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <span>🎙️</span>
                      <span>{currentLanguage === "en" ? "Speak your problem" : "बोलकर समस्या बताएं"}</span>
                    </span>
                    {sahayakVoiceActive && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                        </span>
                        {currentLanguage === "en" ? "Mic active" : "माइक चालू है"}
                      </span>
                    )}
                  </div>

                  {/* Active Recording Box or Start Button */}
                  {sahayakVoiceActive ? (
                    <div className="bg-red-50 border-3 border-red-500 rounded-2xl p-5 text-center space-y-3">
                      <div className="flex items-center justify-center gap-2 text-2xl font-black text-red-950 animate-pulse">
                        <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 animate-bounce" />
                        <span>{currentLanguage === "en" ? "🎤 Listening..." : "🎤 सुन रहे हैं..."}</span>
                      </div>
                      <p className="text-sm font-bold text-red-900">
                        {currentLanguage === "en" ? "Speak your problem clearly. When done speaking, press the red button below." : "मुंह से अपनी समस्या बोलें। जब बोलना पूरा हो जाए, नीचे लाल बटन दबाएं।"}
                      </p>

                      {/* Prominent STOP Button */}
                      <button
                        type="button"
                        onClick={stopSahayakVoice}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-red-800 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                      >
                        <span>⏹️</span>
                        <span>{currentLanguage === "en" ? "Stop Speaking" : "बोलना बंद करें"}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={startSahayakVoice}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 px-4 rounded-2xl text-xl shadow-md border-2 border-amber-700 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                      >
                        <span>🎤</span>
                        <span>
                          {sahayakDescription ? (currentLanguage === "en" ? "Speak more / Re-record" : "और बोलें / दोबारा बोलें") : (currentLanguage === "en" ? "Start Speaking" : "बोलना शुरू करें")}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Speech Unsupported or Permission Fallback */}
                  {sahayakSpeechUnsupported && (
                    <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-2">
                      <div className="text-base font-bold text-amber-950 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                        <span>{sahayakSpeechUnsupported}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSahayakDescription(
                            currentLanguage === "en" ? "Smoke is coming out of my tractor and engine is overheating." : "मेरे ट्रैक्टर से धुआं निकल रहा है और इंजन गरम हो रहा है।"
                          );
                          setSahayakSpeechUnsupported(null);
                        }}
                        className="w-full text-left text-sm font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 p-2.5 rounded-xl border border-amber-300 transition-colors"
                      >
                        {currentLanguage === "en" ? "💡 Add suggested sentence: " : "💡 त्वरित वाक्य जोड़ें: "}
                        <span className="underline">
                          &quot;{currentLanguage === "en" ? "Smoke is coming out of my tractor and engine is overheating." : "मेरे ट्रैक्टर से धुआं निकल रहा है और इंजन गरम हो रहा है।"}&quot;
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Captured Speech Display in Large Textarea */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-base font-black text-slate-800">
                      {currentLanguage === "en" ? "Your spoken problem:" : "आपकी बोली हुई समस्या:"}
                    </label>
                    <textarea
                      rows={4}
                      value={sahayakDescription}
                      onChange={(e) => setSahayakDescription(e.target.value)}
                      placeholder={currentLanguage === "en" ? "Your spoken words will appear here... (e.g.: Smoke coming from tractor and engine is overheating)" : "आपकी बोली हुई बात यहाँ दिखेगी... (जैसे: मेरे ट्रैक्टर से धुआं निकल रहा है और इंजन गरम हो रहा है)"}
                      className="w-full p-4 rounded-2xl border-3 border-slate-300 text-xl font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Navigation Buttons for Voice Step */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      stopSahayakVoice();
                      setSahayakStep("init");
                    }}
                    className="flex-1 py-4 text-lg font-black text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>{t("common.back", currentLanguage)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSahayakProceedToDiagnosis}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-black py-4 px-4 rounded-2xl text-xl text-center shadow-md transition-colors"
                  >
                    {currentLanguage === "en" ? "Proceed ➔" : "आगे बढ़ें ➔"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: PHOTO CAPTURE & PREVIEW (Problem 2 Fix) */}
            {sahayakStep === "photo" && (
              <div className="space-y-4">
                <div className="bg-white border-3 border-blue-400 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <span>📷</span>
                      <span>{currentLanguage === "en" ? "Machine Photo" : "मशीन की फोटो"}</span>
                    </span>
                  </div>

                  {!sahayakPhoto ? (
                    <div className="space-y-3 text-center p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                      <span className="text-4xl sm:text-5xl block">📷</span>
                      <div className="text-xl font-black text-blue-950">
                        {currentLanguage === "en" ? "Take Photo of Damaged Part" : "खराब भाग की फोटो लें"}
                      </div>
                      <p className="text-sm font-bold text-blue-900">
                        {currentLanguage === "en" ? "Open camera to capture or select from gallery" : "कैमरा खोलकर फोटो खींचें या फोन की गैलरी से चुनें"}
                      </p>
                      <button
                        type="button"
                        onClick={() => sahayakPhotoInputRef.current?.click()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-4 rounded-2xl text-xl shadow-md transition-colors flex items-center justify-center gap-2"
                      >
                        <span>📷</span>
                        <span>{currentLanguage === "en" ? "Open Camera / Select Photo" : "कैमरा खोलें / फोटो चुनें"}</span>
                      </button>
                    </div>
                  ) : (
                    /* PHOTO PREVIEW CARD */
                    <div className="p-4 bg-emerald-50 border-3 border-emerald-400 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                          {currentLanguage === "en" ? "Photo securely attached" : "फोटो सुरक्षित रूप से जुड़ गई"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSahayakPhoto(null);
                            if (sahayakPhotoInputRef.current) {
                              sahayakPhotoInputRef.current.value = "";
                            }
                          }}
                          className="text-sm font-black text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-xl border border-red-300 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{currentLanguage === "en" ? "Remove Photo" : "फोटो हटाएं"}</span>
                        </button>
                      </div>

                      <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 shadow-sm max-h-60 bg-black flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sahayakPhoto}
                          alt={currentLanguage === "en" ? "Machine photo" : "मशीन की फोटो"}
                          className="w-full h-auto max-h-60 object-contain"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => sahayakPhotoInputRef.current?.click()}
                        className="w-full py-3 text-center text-base font-black text-blue-900 bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <span>📷</span>
                        <span>{currentLanguage === "en" ? "Change Photo" : "फोटो बदलें"}</span>
                      </button>
                    </div>
                  )}

                  {/* Optional short description */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-sm font-bold text-slate-700">
                      {currentLanguage === "en" ? "Add notes if desired (optional):" : "कुछ लिखना चाहें तो यहाँ लिखें (वैकल्पिक):"}
                    </label>
                    <input
                      type="text"
                      value={sahayakDescription}
                      onChange={(e) => setSahayakDescription(e.target.value)}
                      placeholder={currentLanguage === "en" ? "e.g.: Machine not starting..." : "जैसे: स्टार्ट नहीं हो रहा है..."}
                      className="w-full p-3.5 rounded-xl border-2 border-slate-300 text-base font-bold text-slate-900 focus:outline-none focus:border-emerald-600 bg-slate-50"
                    />
                  </div>
                </div>

                {/* Navigation Buttons for Photo Step */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSahayakStep("init")}
                    className="flex-1 py-4 text-lg font-black text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>{t("common.back", currentLanguage)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSahayakProceedToDiagnosis}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-black py-4 px-4 rounded-2xl text-xl text-center shadow-md transition-colors"
                  >
                    {currentLanguage === "en" ? "Proceed ➔" : "आगे बढ़ें ➔"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: ASK URGENCY */}
            {sahayakStep === "urgency" && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border-3 border-emerald-400 rounded-3xl p-5 shadow-sm">
                  <p className="text-xl font-black text-emerald-950 leading-relaxed">
                    {currentLanguage === "en" ? (
                      <>&quot;Understood, Farmer friend.<br />I will help you diagnose the machine problem.&quot;</>
                    ) : (
                      <>&quot;ठीक है किसान जी।<br />मैं आपकी मशीन की समस्या समझने में मदद करता हूँ।&quot;</>
                    )}
                  </p>
                </div>

                <div className="bg-white border-3 border-slate-300 rounded-3xl p-5 space-y-3 shadow-sm">
                  <div className="text-2xl font-black text-slate-900">
                    {currentLanguage === "en" ? "Is the machine needed today?" : "क्या आज मशीन की जरूरत है?"}
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* 🟢 हाँ, आज काम है */}
                    <button
                      type="button"
                      onClick={() => handleSahayakSelectUrgency("today")}
                      className="w-full bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] border-3 border-emerald-600 rounded-2xl p-4 flex items-center gap-3 text-left transition-all"
                    >
                      <span className="text-2xl sm:text-3xl">🟢</span>
                      <div>
                        <div className="text-2xl font-black text-emerald-950">
                          {currentLanguage === "en" ? "Yes, needed today" : "हाँ, आज काम है"}
                        </div>
                        <div className="text-sm font-bold text-emerald-900">
                          {currentLanguage === "en" ? "Urgent farm work is stalled" : "खेत में जरूरी काम रुका है"}
                        </div>
                      </div>
                    </button>

                    {/* ⚪ नहीं, बाद में भी चलेगा */}
                    <button
                      type="button"
                      onClick={() => handleSahayakSelectUrgency("later")}
                      className="w-full bg-slate-50 hover:bg-slate-100 active:scale-[0.98] border-3 border-slate-400 rounded-2xl p-4 flex items-center gap-3 text-left transition-all"
                    >
                      <span className="text-2xl sm:text-3xl">⚪</span>
                      <div>
                        <div className="text-2xl font-black text-slate-900">
                          {currentLanguage === "en" ? "No, later is fine" : "नहीं, बाद में भी चलेगा"}
                        </div>
                        <div className="text-sm font-bold text-slate-600">
                          {currentLanguage === "en" ? "Tomorrow or day after is okay" : "कल या परसों भी ठीक रहेगा"}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSahayakStep(sahayakChoice === "photo" ? "photo" : "voice")}
                  className="w-full py-3 text-base font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>{currentLanguage === "en" ? "← Previous question" : "← पिछला सवाल"}</span>
                </button>
              </div>
            )}

            {/* Step: FINAL CONFIRMATION & CALL MECHANIC */}
            {sahayakStep === "ready" && (
              <div className="space-y-4">
                {sahayakUrgency === "today" ? (
                  <div className="bg-emerald-50 border-3 border-emerald-500 rounded-3xl p-5 shadow-sm">
                    <p className="text-2xl font-black text-emerald-950 leading-relaxed">
                      {currentLanguage === "en" ? <>&quot;Understood. We will prioritize your repair.&quot;</> : <>&quot;ठीक है। आपकी मरम्मत को जल्दी करने की कोशिश करेंगे।&quot;</>}
                    </p>
                    <p className="text-sm font-bold text-emerald-900 mt-2">
                      {currentLanguage === "en" ? "Nearby mechanic will be notified immediately." : "नजदीकी मैकेनिक को सूचना भेजी जाएगी।"}
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50 border-3 border-slate-400 rounded-3xl p-5 shadow-sm">
                    <p className="text-2xl font-black text-slate-900 leading-relaxed">
                      {currentLanguage === "en" ? <>&quot;Understood. We will schedule regular assistance.&quot;</> : <>&quot;ठीक है। हम सामान्य तरीके से आपकी मदद करेंगे।&quot;</>}
                    </p>
                    <p className="text-sm font-bold text-slate-700 mt-2">
                      {currentLanguage === "en" ? "Mechanic will contact you at a convenient time." : "सुविधाजनक समय पर मैकेनिक से संपर्क होगा।"}
                    </p>
                  </div>
                )}

                {/* Summary Card */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <div className="text-sm">
                    <span className="font-bold text-slate-600">{currentLanguage === "en" ? "Reporting mode: " : "समस्या का तरीका: "}</span>
                    <span className="font-black text-slate-900">
                      {sahayakChoice === "voice"
                        ? (currentLanguage === "en" ? "🎙️ Reported by voice" : "🎙️ बोलकर बताई गई")
                        : (currentLanguage === "en" ? "📷 Photo attached" : "📷 फोटो भेजी गई")}
                    </span>
                  </div>

                  {sahayakDescription && (
                    <div className="text-sm">
                      <span className="font-bold text-slate-600">{currentLanguage === "en" ? "Description: " : "विवरण: "}</span>
                      <span className="font-black text-slate-900 text-base">
                        {sahayakDescription}
                      </span>
                    </div>
                  )}

                  {sahayakPhoto && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-600 block">{currentLanguage === "en" ? "Attached Photo:" : "संलग्न फोटो:"}</span>
                        <span className="text-sm font-bold text-emerald-800">{currentLanguage === "en" ? "✓ Photo secured" : "✓ फोटो सुरक्षित है"}</span>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sahayakPhoto}
                        alt={currentLanguage === "en" ? "Machine photo" : "मशीन फोटो"}
                        className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-slate-300 shadow-sm"
                      />
                    </div>
                  )}

                  {/* Phase 2D-A: AI Diagnosis preview in Sahayak ready */}
                  {currentDiagnosis && (
                    <div className="p-3 bg-emerald-50 rounded-xl border-2 border-emerald-300 space-y-1">
                      <div className="flex items-center justify-between text-xs font-black text-emerald-900">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                          {currentLanguage === "en" ? "AI Probable Diagnosis:" : "AI संभावित समस्या:"}
                        </span>
                        <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-[11px]">
                          {currentDiagnosis.confidence}
                        </span>
                      </div>
                      <div className="text-base font-black text-slate-900">
                        {localizeDiagnosisProblem(currentDiagnosis.possibleProblem, currentLanguage)}
                      </div>
                      <div className="text-xs font-bold text-slate-600">
                        {currentDiagnosis.urgencyText}
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Buttons */}
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleLaunchRecoveryEngine()}
                    className="w-full bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white rounded-3xl p-5 text-2xl font-black shadow-xl border-4 border-emerald-950 flex items-center justify-center gap-3 transition-transform active:scale-[0.98] ring-4 ring-emerald-200"
                  >
                    <span className="text-2xl sm:text-3xl">⚡</span>
                    <span>{currentLanguage === "en" ? "View Machine Recovery Plan ➔" : "मशीन रिकवरी योजना देखें ➔"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSahayakCallMechanic}
                    className="w-full bg-white hover:bg-slate-50 text-emerald-950 rounded-2xl p-3.5 text-lg font-black border-2 border-emerald-600 flex items-center justify-center gap-2.5 transition-transform"
                  >
                    <Wrench className="w-5 h-5 text-emerald-700" />
                    <span>{currentLanguage === "en" ? "Find Mechanic Directly" : "सीधे मैकेनिक खोजें"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= 6. MY REPAIR SCREEN (WITH PENDING OFFLINE BADGE) ================= */}
        {currentScreen === "repair" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🔧</span> {t("repair.title", currentLanguage)}
              </h2>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                  latestRepair && latestRepair.status !== "completed"
                    ? latestRepair.syncStatus === "pending"
                      ? "bg-amber-50 text-amber-900 border-amber-200"
                      : "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {latestRepair && latestRepair.status !== "completed"
                  ? latestRepair.syncStatus === "pending"
                    ? (currentLanguage === "en" ? "Saved on phone (Offline)" : "फ़ोन में सुरक्षित (ऑफ़लाइन)")
                    : (currentLanguage === "en" ? "In Progress" : "प्रगति पर है")
                  : (currentLanguage === "en" ? "No Active Work" : "कोई काम नहीं")}
              </span>
            </div>

            {/* Presenter Hackathon Simulation Quick-Control Bar */}
            {latestRepair && (
              <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-3 space-y-2 text-xs shadow-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm">⚡</span>
                    <span>हैकथॉन डेमो सिमुलेशन: रमेश पाटिल (वाटर पंप)</span>
                  </span>
                  <span className="bg-amber-200 text-amber-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                    1-क्लिक स्टेज बदलाव
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      updateRepairStatus(latestRepair.id, "on_the_way");
                      refreshData();
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold border transition-colors ${
                      latestRepair.status === "on_the_way" || latestRepair.status === "mechanic_accepted"
                        ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                        : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    1. रास्ते में 🛵
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateRepairStatus(latestRepair.id, "arrived");
                      refreshData();
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold border transition-colors ${
                      latestRepair.status === "arrived"
                        ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                        : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    2. पहुँच गया 📍
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateRepairStatus(latestRepair.id, "repair_in_progress");
                      refreshData();
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold border transition-colors ${
                      latestRepair.status === "repair_in_progress"
                        ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                        : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    3. मरम्मत शुरू 🔧
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateRepairStatus(latestRepair.id, "verification_pending");
                      refreshData();
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold border transition-colors ${
                      latestRepair.status === "verification_pending"
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                        : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    4. मरम्मत पूरी ⚙️
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-amber-200 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      seedRameshPatilDemoRepair();
                      refreshData();
                      setFeedbackMessage("💧 रमेश पाटिल (वाटर पंप) डेमो रीसेट सफल!");
                      setTimeout(() => setFeedbackMessage(null), 3000);
                    }}
                    className="text-amber-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>डेमो रीसेट करें (वाटर पंप)</span>
                  </button>
                  <span className="text-slate-600 font-medium">
                    वर्तमान स्थिति: <b className="text-slate-900 font-bold">{latestRepair.status}</b>
                  </span>
                </div>
              </div>
            )}

            {/* EMPTY STATE */}
            {!latestRepair ? (
              <div className="bg-white border border-slate-200 rounded-lg p-6 text-center space-y-3 shadow-2xs">
                <span className="text-3xl block">🚜</span>
                <h3 className="text-base font-bold text-slate-800">
                  {currentLanguage === "en" ? "No active repairs right now." : "अभी कोई मरम्मत नहीं है।"}
                </h3>
                <p className="text-xs text-slate-600">
                  {currentLanguage === "en" ? "All your machines are in working condition." : "आपकी सभी मशीनें चालू स्थिति में हैं।"}
                </p>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleStartBreakdown()}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-md text-sm transition-colors cursor-pointer shadow-2xs"
                  >
                    {currentLanguage === "en" ? "Machine broken? Call mechanic" : "मशीन खराब है? मैकेनिक बुलाएं"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      seedRameshPatilDemoRepair();
                      refreshData();
                      setFeedbackMessage("💧 रमेश पाटिल (वाटर पंप) डेमो लोड किया गया");
                      setTimeout(() => setFeedbackMessage(null), 3000);
                    }}
                    className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold py-2 px-3 rounded-md text-xs border border-amber-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>⚡</span>
                    <span>हैकथॉन डेमो लोड करें: रमेश पाटिल (वाटर पंप)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* DYNAMIC REPAIR CARD */
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-2xl shrink-0">
                      {latestRepair.machineIcon}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {currentLanguage === "en" ? (machines.find((m) => m.id === latestRepair.machineId)?.name || (latestRepair as any).machineName || latestRepair.machineNameHi) : latestRepair.machineNameHi}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                        {currentLanguage === "en" ? "Complaint ID: " : "शिकायत संख्या: "}{latestRepair.id}
                      </p>
                    </div>
                  </div>
                  <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded-md border border-slate-200">
                    {currentLanguage === "en" ? "Repair Complaint" : "मरम्मत की शिकायत"}
                  </span>
                </div>

                {/* Status Message Highlight */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-slate-600 font-semibold text-xs mb-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                    </span>
                    {currentLanguage === "en" ? "Current Status" : "वर्तमान स्थिति"}
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {currentLanguage === "en"
                      ? (latestRepair.status === "completed"
                          ? "Repair Completed"
                          : latestRepair.status === "repair_in_progress"
                          ? "Repair In Progress"
                          : latestRepair.status === "verification_pending"
                          ? "Verification Pending"
                          : latestRepair.status === "re_repair_required"
                          ? "Re-Repair Required"
                          : "Technician Assigned")
                      : latestRepair.statusTextHi}
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {latestRepair.syncStatus === "pending"
                      ? (currentLanguage === "en" ? "Details will be sent to mechanic once online" : "इंटरनेट मिलते ही जानकारी मैकेनिक तक पहुँचा दी जाएगी")
                      : (currentLanguage === "en" ? "Notice sent to your nearby mechanic" : "आपके नजदीकी मैकेनिक को सूचना भेजी जा चुकी है")}
                  </p>
                </div>

                {/* Attached AI Diagnosis if present */}
                {latestRepair.diagnosis && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                        {currentLanguage === "en" ? "Diagnostic Assessment" : "प्रारंभिक जाँच रिपोर्ट"}
                      </span>
                      <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                        {latestRepair.diagnosis.confidence} {currentLanguage === "en" ? "confidence" : "विश्वसनीयता"}
                      </span>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">{currentLanguage === "en" ? "Probable Issue:" : "संभावित समस्या:"}</div>
                      <div className="text-sm font-bold text-slate-900">
                        {localizeDiagnosisProblem(latestRepair.diagnosis.possibleProblem, currentLanguage)}
                      </div>
                    </div>
                    <div className="pt-1 border-t border-slate-200 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">{currentLanguage === "en" ? "Advice: " : "सलाह: "}</span>
                      {currentLanguage === "en" ? "Keep machine turned off until technician arrives." : latestRepair.diagnosis.safeAction}
                    </div>
                  </div>
                )}

                {/* Attached Photo Evidence if present */}
                {latestRepair.photoDataUrl && (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={latestRepair.photoDataUrl}
                        alt={currentLanguage === "en" ? "Machine photo" : "मशीन की फोटो"}
                        className="w-12 h-12 object-cover rounded-md border border-slate-300"
                      />
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">{currentLanguage === "en" ? "Photo Evidence" : "मशीन की फोटो"}</div>
                        <div className="text-xs font-semibold text-slate-800">{currentLanguage === "en" ? "📷 Photo secured" : "📷 फोटो सुरक्षित है"}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transparent Pricing Breakdown */}
                {(() => {
                  const pricing = latestRepair.finalCost || latestRepair.estimatedCost;
                  if (!pricing) return null;

                  return (
                    <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">💰</span>
                          <span className="text-xs font-bold text-slate-900">
                            {latestRepair.finalCost
                              ? (currentLanguage === "en" ? "Final Repair Cost" : "अंतिम मरम्मत लागत")
                              : (currentLanguage === "en" ? "Estimated Repair Cost" : "अनुमानित मरम्मत लागत")}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {latestRepair.finalCost
                            ? (currentLanguage === "en" ? "Confirmed Bill" : "पुष्टीकृत बिल")
                            : (currentLanguage === "en" ? "Standard Rate" : "प्रमाणित दर")}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>{currentLanguage === "en" ? "Diagnostic Fee:" : "जांच शुल्क:"}</span>
                          <span className="font-semibold text-slate-900">{formatCurrencyHi(pricing.diagnosticFee)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>{currentLanguage === "en" ? "Labour Fee:" : "मजदूरी:"}</span>
                          <span className="font-semibold text-slate-900">{formatCurrencyHi(pricing.labourFee)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>{currentLanguage === "en" ? "Spare Parts:" : "स्पेयर पार्ट्स:"}</span>
                          <span className="font-semibold text-slate-900">{formatCurrencyHi(pricing.partsEstimate)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>{currentLanguage === "en" ? "Travel Fee:" : "विजिट शुल्क:"}</span>
                          <span className="font-semibold text-slate-900">{formatCurrencyHi(pricing.travelFee)}</span>
                        </div>
                        {pricing.discount > 0 && (
                          <div className="flex justify-between items-center text-emerald-700">
                            <span>{currentLanguage === "en" ? "Discount:" : "छूट:"}</span>
                            <span className="font-semibold text-emerald-800">-{formatCurrencyHi(pricing.discount)}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[11px] text-slate-500 block">
                            {latestRepair.finalCost
                              ? (currentLanguage === "en" ? "Total Payable Amount" : "कुल देय राशि")
                              : (currentLanguage === "en" ? "Total Estimated Amount" : "कुल अनुमानित राशि")}
                          </span>
                          <span className="text-base font-bold text-slate-900">
                            {formatCurrencyHi(pricing.total)}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {currentLanguage === "en" ? "Standard Pricing" : "पारदर्शी दर"}
                        </span>
                      </div>

                      {/* Explicit Price Adjustment notice if cost changed */}
                      {latestRepair.priceAdjustment && (
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 space-y-1 text-xs">
                          <div className="font-semibold text-amber-950 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>{currentLanguage === "en" ? "Price Modification Notice:" : "लागत में बदलाव की सूचना:"}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 text-center">
                            <div className="bg-white p-1 rounded border border-amber-200">
                              <span className="text-[10px] text-slate-500 block">{currentLanguage === "en" ? "Estimated" : "अनुमानित"}</span>
                              <span className="font-medium text-slate-900">{formatCurrencyHi(latestRepair.priceAdjustment.estimatedTotal)}</span>
                            </div>
                            <div className="bg-white p-1 rounded border border-amber-200">
                              <span className="text-[10px] text-slate-500 block">{currentLanguage === "en" ? "Revised" : "संशोधित"}</span>
                              <span className="text-slate-900 font-bold">{formatCurrencyHi(latestRepair.priceAdjustment.revisedTotal)}</span>
                            </div>
                            <div className="bg-white p-1 rounded border border-amber-200">
                              <span className="text-[10px] text-slate-500 block">{currentLanguage === "en" ? "Diff" : "अंतर"}</span>
                              <span className={latestRepair.priceAdjustment.difference > 0 ? "text-amber-800 font-bold" : "text-emerald-700 font-bold"}>
                                {latestRepair.priceAdjustment.difference >= 0 ? "+" : ""}
                                {formatCurrencyHi(latestRepair.priceAdjustment.difference)}
                              </span>
                            </div>
                          </div>
                          <div className="text-[11px] text-amber-900 pt-0.5 font-medium">
                            {currentLanguage === "en" ? "Reason: " : "कारण: "}<span className="font-semibold">{latestRepair.priceAdjustment.reason}</span>
                            {latestRepair.priceAdjustment.customReasonNote && ` (${latestRepair.priceAdjustment.customReasonNote})`}
                          </div>
                        </div>
                      )}

                      {!latestRepair.finalCost && (
                        <div className="text-[11px] text-slate-500 font-medium pt-1">
                          {currentLanguage === "en"
                            ? "Note: Final pricing may change after physical inspection of machine."
                            : "नोट: मशीन की भौतिक जांच के बाद अंतिम कीमत संशोधित हो सकती है।"}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Assigned Technician Preview */}
                {(() => {
                  const jobCard = getJobCardByRepairId(latestRepair.id);
                  const assignedTech = (latestRepair.technicianId ? getTechnicianById(latestRepair.technicianId) : null)
                    || (jobCard?.technicianId ? getTechnicianById(jobCard.technicianId) : null)
                    || getTechnicianById("tech-005");
                  
                  const techName = latestRepair.assignedTechnicianNameHi || jobCard?.technicianNameHi || assignedTech?.nameHi || "महेश वर्मा";
                  const techNameEn = latestRepair.assignedTechnicianName || assignedTech?.name || "Mahesh Verma";
                  const techAvatar = latestRepair.assignedTechnicianPhoto || assignedTech?.avatarUrl;
                  const techRating = latestRepair.assignedTechnicianRating || assignedTech?.rating || 4.7;
                  const techDistance = latestRepair.assignedTechnicianDistance || "3.2 किमी दूर (सिम्युलेटेड)";
                  const vBadge = latestRepair.assignedTechnicianBadge || (currentLanguage === "en" ? "✓ Verified Mechanic" : "✓ प्रमाणित मैकेनिक");
                  const techSkills = assignedTech ? assignedTech.skills.join(", ") : (currentLanguage === "en" ? "Water Pump & Tractor Expert" : "वाटर पंप व ट्रैक्टर विशेषज्ञ");

                  // Visible if assigned or in active tracking flow
                  const isAssigned = latestRepair.status !== "reported";
                  if (!isAssigned) return null;

                  return (
                    <div className="bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 border-2 border-emerald-200 rounded-2xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                        <span className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="text-sm">👨‍🔧</span>
                          <span>{currentLanguage === "en" ? "Assigned Technician" : "नियुक्त मैकेनिक"}</span>
                        </span>
                        <span className="bg-emerald-100 text-emerald-900 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
                          <span>✓</span>
                          <span>{vBadge}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="relative shrink-0">
                          {techAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={techAvatar}
                              alt={techName}
                              className="w-16 h-16 rounded-full border-2 border-emerald-600 object-cover shadow-sm bg-white"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-emerald-700 text-white flex items-center justify-center text-3xl font-bold shadow-sm">
                              👨‍🔧
                            </div>
                          )}
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-xs">
                            ✓
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-black text-slate-900 text-base leading-tight truncate">
                              {currentLanguage === "en" ? techNameEn : techName}
                            </h4>
                            <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-xs font-black border border-amber-200 shrink-0">
                              <span>⭐</span>
                              <span>{techRating}</span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 font-semibold truncate mt-0.5">
                            {techSkills}
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-700">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
                              <span>📍</span>
                              <span>{techDistance}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              (सिम्युलेटेड)
                            </span>
                          </div>
                        </div>
                      </div>

                      {assignedTech && (
                        <button
                          type="button"
                          onClick={() => handleOpenCredentialsModal(assignedTech)}
                          className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-2 px-3 rounded-xl border border-slate-300 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>{currentLanguage === "en" ? "View Mechanic Certifications & Training" : "मैकेनिक का प्रमाणन व प्रशिक्षण देखें"}</span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* 6-STAGE PROGRESS TIMELINE */}
                {(() => {
                  const formatTs = (ts?: string) => {
                    if (!ts) return null;
                    try {
                      const d = new Date(ts);
                      return isNaN(d.getTime()) ? null : d.toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" });
                    } catch {
                      return null;
                    }
                  };

                  const stages = [
                    {
                      id: 1,
                      labelHi: "मैकेनिक नियुक्त हुआ",
                      labelEn: "Mechanic Assigned",
                      icon: "👨‍🔧",
                      isDone: ["on_the_way", "mechanic_accepted", "arrived", "repair_in_progress", "verification_pending", "completed", "re_repair_required"].includes(latestRepair.status),
                      isActive: ["finding_mechanic", "mechanic_assigned", "reported"].includes(latestRepair.status),
                      timestamp: formatTs(latestRepair.createdAt),
                      detailHi: "मैकेनिक असाइन हुआ",
                    },
                    {
                      id: 2,
                      labelHi: "मैकेनिक रास्ते में है",
                      labelEn: "Mechanic On The Way",
                      icon: "🛵",
                      isDone: ["arrived", "repair_in_progress", "verification_pending", "completed", "re_repair_required"].includes(latestRepair.status),
                      isActive: latestRepair.status === "on_the_way" || latestRepair.status === "mechanic_accepted",
                      timestamp: formatTs(latestRepair.onTheWayAt),
                      detailHi: "मैकेनिक लोकेशन की ओर रवाना हुआ",
                    },
                    {
                      id: 3,
                      labelHi: "मैकेनिक पहुँच गया",
                      labelEn: "Mechanic Arrived",
                      icon: "📍",
                      isDone: ["repair_in_progress", "verification_pending", "completed", "re_repair_required"].includes(latestRepair.status),
                      isActive: latestRepair.status === "arrived",
                      timestamp: formatTs(latestRepair.arrivedAt),
                      detailHi: "खेत / कार्यस्थल पर उपस्थित",
                    },
                    {
                      id: 4,
                      labelHi: "मरम्मत शुरू हुई",
                      labelEn: "Repair Started",
                      icon: "🔧",
                      isDone: ["verification_pending", "completed", "re_repair_required"].includes(latestRepair.status),
                      isActive: latestRepair.status === "repair_in_progress",
                      timestamp: formatTs(latestRepair.repairStartedAt),
                      detailHi: "मशीन के पुर्जों पर कार्य प्रगति पर",
                    },
                    {
                      id: 5,
                      labelHi: "मरम्मत पूरी हुई",
                      labelEn: "Repair Completed",
                      icon: "⚙️",
                      isDone: ["verification_pending", "completed", "re_repair_required"].includes(latestRepair.status),
                      isActive: false,
                      timestamp: formatTs(latestRepair.repairCompletedAt),
                      detailHi: "मैकेनिक द्वारा कार्य संपन्न",
                    },
                    {
                      id: 6,
                      labelHi: "मशीन की जाँच बाकी है",
                      labelEn: "Machine Verification Pending",
                      icon: "🔍",
                      isDone: latestRepair.status === "completed",
                      isActive: latestRepair.status === "verification_pending",
                      isAlert: latestRepair.status === "re_repair_required",
                      timestamp: latestRepair.status === "completed" ? "जाँच सफल" : latestRepair.status === "re_repair_required" ? "जाँच असफल" : null,
                      detailHi: latestRepair.status === "completed" ? "मशीन तैयार (Job-Ready)" : latestRepair.status === "re_repair_required" ? "पुनः मरम्मत जरूरी" : "चलाकर जाँच करें",
                    },
                  ];

                  return (
                    <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                          <span>⏱️</span>
                          <span>{currentLanguage === "en" ? "Repair Progress Timeline" : "मरम्मत प्रगति टाइमलाइन"}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {currentLanguage === "en" ? "Step-by-step update" : "चरणबद्ध विवरण"}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {stages.map((stage, idx) => {
                          const isLast = idx === stages.length - 1;

                          return (
                            <div key={stage.id} className="relative flex items-start gap-3">
                              {/* Connector vertical line */}
                              {!isLast && (
                                <div
                                  className={`absolute left-4 top-8 -bottom-3 w-0.5 transition-colors ${
                                    stage.isDone ? "bg-emerald-600" : "bg-slate-200"
                                  }`}
                                />
                              )}

                              {/* Stage Icon Circle */}
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 transition-all ${
                                  stage.isAlert
                                    ? "bg-red-600 text-white shadow-xs"
                                    : stage.isActive
                                    ? "bg-amber-500 text-white ring-4 ring-amber-200 shadow-sm animate-pulse"
                                    : stage.isDone
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-white border-2 border-slate-300 text-slate-400"
                                }`}
                              >
                                {stage.isAlert ? "✕" : stage.isDone ? "✓" : stage.icon}
                              </div>

                              {/* Stage Content Card */}
                              <div
                                className={`flex-1 rounded-xl p-2.5 transition-all ${
                                  stage.isAlert
                                    ? "bg-red-50 border border-red-300"
                                    : stage.isActive
                                    ? "bg-amber-50/90 border-2 border-amber-400 shadow-xs"
                                    : stage.isDone
                                    ? "bg-white border border-slate-200"
                                    : "bg-slate-100/60 border border-slate-200/60 opacity-70"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm select-none">{stage.icon}</span>
                                    <span
                                      className={`font-black truncate ${
                                        stage.isAlert
                                          ? "text-red-900 text-xs sm:text-sm"
                                          : stage.isActive
                                          ? "text-amber-950 text-xs sm:text-sm"
                                          : stage.isDone
                                          ? "text-slate-900 text-xs"
                                          : "text-slate-500 text-xs"
                                      }`}
                                    >
                                      {currentLanguage === "en" ? stage.labelEn : stage.labelHi}
                                    </span>
                                  </div>

                                  {/* Status badge / timestamp */}
                                  <div className="shrink-0 text-right">
                                    {stage.isActive ? (
                                      <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                                        ⚡ चालू है
                                      </span>
                                    ) : stage.isAlert ? (
                                      <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                        समस्या
                                      </span>
                                    ) : stage.isDone ? (
                                      <span className="text-emerald-700 text-[11px] font-bold flex items-center gap-0.5">
                                        <span>✓</span>
                                        <span>{stage.timestamp || "पूर्ण"}</span>
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[10px] font-medium">
                                        प्रतीक्षित
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-0.5">
                                  <span>{stage.detailHi}</span>
                                  {stage.timestamp && stage.isActive && (
                                    <span className="text-amber-800 font-bold">{stage.timestamp}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* STAGE 6 ACTION BANNER: Verification Pending (Job-Ready Verification Flow) */}
                {latestRepair.status === "verification_pending" && (
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl p-4 shadow-md border-2 border-emerald-900 space-y-3 animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <span className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-3xl shrink-0">
                        💧
                      </span>
                      <div className="space-y-0.5">
                        <div className="inline-flex items-center gap-1 bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <span>⚠️</span>
                          <span>चरण 6: मशीन की जाँच बाकी है</span>
                        </div>
                        <h4 className="text-base font-black text-white leading-tight">
                          {currentLanguage === "en" ? "Repair Complete! Inspect the machine now" : "मरम्मत पूरी हुई! मशीन चलाकर जाँच करें"}
                        </h4>
                        <p className="text-xs text-emerald-100 leading-snug">
                          {currentLanguage === "en"
                            ? "Test water pump discharge, pressure and ensure zero leakages before certifying as Job-Ready."
                            : "पंप चालू करके देखें कि पानी पूरी धार से आ रहा है या नहीं। जाँच के बाद ही मशीन को तैयार माना जाएगा।"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const card = getJobCardByRepairId(latestRepair.id) || currentJobCard;
                        if (card) setCurrentJobCard(card);
                        setCurrentScreen("job_ready_verification");
                      }}
                      className="w-full bg-white hover:bg-emerald-50 active:scale-[0.98] text-emerald-950 font-black py-3.5 px-4 rounded-xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-200"
                    >
                      <span className="text-lg">🎒</span>
                      <span>{currentLanguage === "en" ? "Start Job-Ready Verification" : "मशीन की जाँच शुरू करें (Job-Ready Verification)"}</span>
                      <span>➔</span>
                    </button>
                  </div>
                )}

                {/* Re-repair Required Action Banner */}
                {latestRepair.status === "re_repair_required" && (
                  <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl space-y-2.5 text-center shadow-xs">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center text-xl mx-auto shadow-sm">
                      ✕
                    </div>
                    <div className="text-base font-extrabold text-red-950">
                      {currentLanguage === "en" ? "Issue not resolved — Re-repair is required." : "समस्या अभी ठीक नहीं हुई है — दोबारा मरम्मत की जरूरत है।"}
                    </div>
                    <p className="text-xs text-red-800">
                      {currentLanguage === "en" ? "Recall technician for free re-inspection and repair." : "मैकेनिक को तुरंत वापस बुलाएं। दोबारा जाँच की जाएगी।"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const card = getJobCardByRepairId(latestRepair.id) || currentJobCard;
                        if (card) setCurrentJobCard(card);
                        handleReRepair();
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-transform cursor-pointer shadow-sm"
                    >
                      <RotateCcw className="w-4 h-4 text-white" />
                      <span>{currentLanguage === "en" ? "Request Re-Repair" : "मैकेनिक को दोबारा बुलाएं"}</span>
                    </button>
                  </div>
                )}

                {/* Completed Celebration Banner */}
                {latestRepair.status === "completed" && (
                  <div className="p-4.5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl space-y-3 text-center shadow-xs">
                    <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl mx-auto shadow-sm">
                      ✓
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-base font-black text-emerald-950">
                        {currentLanguage === "en" ? "Machine is JOB-READY & Certified!" : "मशीन जाँच में पास — काम के लिए तैयार (JOB READY)"}
                      </div>
                      <p className="text-xs text-emerald-800">
                        {currentLanguage === "en"
                          ? "Verification record saved into Machine Passport."
                          : "जाँच का संपूर्ण विवरण मशीन पासपोर्ट में दर्ज हो चुका है।"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const m = machines.find((mach) => mach.id === latestRepair.machineId) || selectedMachine || machines[0];
                          setSelectedMachine(m);
                          setCurrentScreen("machine_detail");
                        }}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <span>📖</span>
                        <span>{currentLanguage === "en" ? "Machine Passport" : "मशीन पासपोर्ट देखें"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen("machines")}
                        className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold py-2.5 px-3 rounded-xl text-xs border border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>🚜</span>
                        <span>{currentLanguage === "en" ? "My Machines" : "मेरी मशीनें"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* View Digital Job Card button if available */}
                {getJobCardByRepairId(latestRepair.id) && (
                  <button
                    type="button"
                    onClick={() => {
                      const card = getJobCardByRepairId(latestRepair.id);
                      if (card) setCurrentJobCard(card);
                      setCurrentScreen("technician_job_card");
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ClipboardList className="w-4 h-4 text-slate-600" />
                    <span>{currentLanguage === "en" ? "View Digital Job Card" : "डिजिटल जॉब कार्ड देखें"}</span>
                  </button>
                )}

                {/* Direct Helpline Assistance */}
                <div className="pt-1">
                  <a
                    href="tel:1800000000"
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 py-2.5 px-4 rounded-md flex items-center justify-center gap-2 font-semibold text-xs transition-colors"
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-700" />
                    <span>{currentLanguage === "en" ? "Call Helpline Directly" : "सीधे हेल्पलाइन पर बात करें"}</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= 7. SERVICE TAB SCREEN ================= */}
        {currentScreen === "service" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📅</span> {currentLanguage === "en" ? "Next Service Schedule" : "अगली सर्विस सारणी"}
              </h2>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                {currentLanguage === "en" ? `Total: ${machines.length} Machines` : `कुल: ${machines.length} मशीनें`}
              </span>
            </div>

            <div className="space-y-3">
              {machines.map((machine) => {
                const statusDisp = getMaintenanceStatusDisplay(machine.maintenanceStatus || "upcoming");
                const checklist =
                  machine.maintenanceItems && machine.maintenanceItems.length > 0
                    ? machine.maintenanceItems
                    : getDefaultMaintenanceItems(machine.type || machine.name);

                return (
                  <div
                    key={`srv-screen-${machine.id}`}
                    className={`bg-white border rounded-lg p-4 shadow-2xs space-y-3 transition-colors ${
                      machine.maintenanceStatus === "overdue"
                        ? "border-red-300"
                        : machine.maintenanceStatus === "due"
                        ? "border-amber-300"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Header: Machine & Tag */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-11 h-11 p-1 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {machine.imageUrl || MACHINE_IMAGE_MAP[machine.id] ? (
                            <img
                              src={machine.imageUrl || MACHINE_IMAGE_MAP[machine.id]}
                              alt={currentLanguage === "en" ? machine.name : machine.nameHi}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-2xl">{machine.icon}</span>
                          )}
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            {currentLanguage === "en" ? machine.name : machine.nameHi}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-500 uppercase">{machine.name}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 ${statusDisp.badgeClass}`}>
                        {currentLanguage === "en"
                          ? (machine.maintenanceStatus === "overdue"
                              ? "🔴 Overdue"
                              : machine.maintenanceStatus === "due"
                              ? "🟠 Due Now"
                              : "🟢 Healthy")
                          : statusDisp.fullTagHi}
                      </span>
                    </div>

                    {/* Reminder message if due or overdue */}
                    {statusDisp.reminderMessageHi && (
                      <div
                        className={`p-2.5 rounded-md border text-xs font-semibold flex items-center gap-2 ${
                          machine.maintenanceStatus === "overdue"
                            ? "bg-red-50 text-red-900 border-red-200"
                            : "bg-amber-50 text-amber-900 border-amber-200"
                        }`}
                      >
                        <span>
                          {currentLanguage === "en"
                            ? (machine.maintenanceStatus === "overdue"
                                ? "Service Overdue! Immediate inspection recommended."
                                : "Service Due Soon. Schedule inspection.")
                            : statusDisp.reminderMessageHi}
                        </span>
                      </div>
                    )}

                    {/* Next service date info */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex justify-between items-center text-xs">
                      <div>
                        <div className="text-[11px] font-medium text-slate-500">
                          {currentLanguage === "en" ? "Service Date:" : "सर्विस की तारीख:"}
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {formatServiceDateHi(machine.nextServiceDate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-medium text-slate-500">
                          {currentLanguage === "en" ? "Interval:" : "अंतराल:"}
                        </div>
                        <div className="text-xs font-semibold text-slate-800">
                          {currentLanguage === "en" ? `Every ${machine.serviceIntervalDays || 90} days` : `हर ${machine.serviceIntervalDays || 90} दिन`}
                        </div>
                      </div>
                    </div>

                    {/* Checklist preview */}
                    <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                      <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                        <span>📋</span>
                        <span>{currentLanguage === "en" ? "Key Inspection Points:" : "मुख्य जाँच बिंदु:"}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {checklist.slice(0, 5).map((item) => (
                          <span
                            key={item}
                            className="bg-white border border-slate-200 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded"
                          >
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleOpenMachineDetail(machine)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 px-3 rounded-md text-xs border border-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>{currentLanguage === "en" ? "View Checklist" : "जाँच सूची देखें"}</span>
                        <span>➔</span>
                      </button>
                      <button
                        onClick={() => handleCompleteService(machine.id)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 px-3 rounded-md text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{currentLanguage === "en" ? "Service Done" : "सर्विस पूरी हुई"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= P2K: NEARBY MECHANICS MAP SCREEN ================= */}
        {currentScreen === "nearby_mechanics" && (
          <NearbyMechanicsMap
            technicians={getTechnicians()}
            isOnline={isOnline}
            initialFarmerLocation={farmerLocation}
            onLocationChange={(loc) => setFarmerLocation(loc)}
            onSelectTechnician={(tech) => handleSelectTechnician(tech)}
            onClose={() => setCurrentScreen("technician_match")}
          />
        )}

        {/* ================= P2Q & P2R: RECOVERY ENGINE SCREEN ================= */}
        {currentScreen === "recovery_engine" && activeRecoveryPlan && (
          <div className="space-y-4">
            {/* Header with Back button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentScreen(currentDiagnosis ? "diagnosis" : "home")}
                className="flex items-center gap-1.5 text-base font-bold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t("common.back", currentLanguage)}</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-300">
                  {currentLanguage === "en" ? "⚡ Recovery Engine" : "⚡ रिकवरी इंजन"}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {currentLanguage === "en" ? "Decision Assistance" : "निर्णय सहायता"}
                </span>
              </div>
            </div>

            {/* Offline Honesty Alert */}
            {activeRecoveryPlan.isOffline && (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-3 flex items-center gap-2.5 text-xs font-bold text-amber-950">
                <span className="text-xl">📦</span>
                <span>
                  {currentLanguage === "en" ? (
                    <><strong>Cached Information (Offline Mode):</strong> Live availability is offline. Estimated options shown from local memory.</>
                  ) : (
                    <><strong>कैश्ड जानकारी (ऑफलाइन मोड):</strong> लाइव उपलब्धता अनुपलब्ध है। स्थानीय मेमोरी से अनुमानित विकल्प प्रदर्शित किए गए हैं।</>
                  )}
                </span>
              </div>
            )}

            {/* Machine & Problem Banner */}
            <div className="bg-white border-3 border-emerald-500 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl sm:text-4xl p-2 sm:p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                    {activeRecoveryPlan.machineIcon}
                  </span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {currentLanguage === "en"
                        ? (machines.find(m => m.id === activeRecoveryPlan.machineId)?.name || activeRecoveryPlan.machineNameHi)
                        : activeRecoveryPlan.machineNameHi}
                    </h2>
                    <p className="text-xs font-bold text-slate-500">
                      {currentLanguage === "en" ? "Machine ID: " : "मशीन आईडी: "}{activeRecoveryPlan.machineId}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black px-3 py-1.5 rounded-full border bg-amber-100 text-amber-950 border-amber-300">
                  {activeRecoveryPlan.recoveryStatus === "recovery_planning"
                    ? (currentLanguage === "en" ? "🟠 Recovery Plan Ready" : "🟠 रिकवरी योजना तैयार")
                    : (currentLanguage === "en" ? "🔴 Machine Down" : "🔴 मशीन बंद (खराबी)")}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block">
                  {currentLanguage === "en" ? "Complaint / Issue:" : "शिकायत / समस्या:"}
                </span>
                <span className="text-base font-black text-slate-900">
                  {localizeDiagnosisProblem(activeRecoveryPlan.problemSummaryHi, currentLanguage)}
                </span>
              </div>
            </div>

            {/* Critical Farm Window Urgency Banner */}
            {activeRecoveryPlan.isCriticalFarmWindow && (
              <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-3xl p-4.5 shadow-lg border-3 border-red-950 flex items-start gap-3">
                <span className="text-2xl sm:text-3xl shrink-0 mt-0.5">🌾</span>
                <div className="space-y-1">
                  <div className="text-lg font-black tracking-wide">
                    {currentLanguage === "en"
                      ? "⚠️ Critical Farming Period — Rapid Recovery Prioritized"
                      : (activeRecoveryPlan.criticalWindowTextHi || "⚠️ महत्वपूर्ण कृषि काल — तत्काल मरम्मत प्राथमिकता")}
                  </div>
                  <p className="text-xs font-bold text-amber-100 leading-relaxed">
                    {currentLanguage === "en"
                      ? "Fastest solution is prioritized so field work (sowing/harvest) is not delayed."
                      : "खेत का काम (बुवाई/कटाई) प्रभावित न हो, इसके लिए सबसे त्वरित समाधान को सर्वोच्च प्राथमिकता दी गई है।"}
                  </p>
                </div>
              </div>
            )}

            {/* Safety Hazard Warning if applicable */}
            {activeRecoveryPlan.safetyWarning && (
              <div className="bg-red-50 border-3 border-red-500 rounded-3xl p-4 flex items-start gap-3 shadow-md">
                <ShieldAlert className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-base font-black text-red-950">
                    {currentLanguage === "en" ? `Safety Warning: ${activeRecoveryPlan.safetyWarning}` : `सुरक्षा चेतावनी: ${activeRecoveryPlan.safetyWarning}`}
                  </div>
                  <p className="text-xs font-bold text-red-800">
                    {currentLanguage === "en"
                      ? "Do not attempt to start machine. Keep engine stopped until technician arrives."
                      : "मशीन चालू करने का प्रयास न करें। मैकेनिक के आने तक इंजन बंद रखें।"}
                  </p>
                </div>
              </div>
            )}

            {/* AI Diagnosis Honesty Card */}
            <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-3xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  {currentLanguage === "en" ? "AI Probable Diagnosis Analysis" : "AI संभावित समस्या विश्लेषण"}
                </span>
                <span className="bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
                  {currentLanguage === "en"
                    ? `Confidence: ${activeRecoveryPlan.aiConfidence === "high" ? "High" : activeRecoveryPlan.aiConfidence === "medium" ? "Medium" : "Low (Inspection Required)"}`
                    : `विश्वास स्तर: ${activeRecoveryPlan.aiConfidence === "high" ? "उच्च" : activeRecoveryPlan.aiConfidence === "medium" ? "मध्यम" : "निम्न (जांच आवश्यक)"}`}
                </span>
              </div>
              <div className="text-lg font-black text-slate-900">
                {currentLanguage === "en" ? "Probable Issue: " : "संभावित समस्या: "}{localizeDiagnosisProblem(activeRecoveryPlan.problemSummaryHi, currentLanguage)}
              </div>
              <div className="text-xs font-bold text-slate-700">
                {currentLanguage === "en" ? "Advice: " : "सलाह: "}{currentLanguage === "en" ? "Inspect hydraulic lines, check fluid level, and keep engine turned off." : activeRecoveryPlan.confidenceAdviceHi}
              </div>
              <div className="text-[11px] font-bold text-emerald-900 bg-emerald-100/70 p-2 rounded-xl border border-emerald-200">
                {currentLanguage === "en"
                  ? "ℹ️ Preliminary assessment. Technical confirmation only upon physical technician inspection."
                  : "ℹ️ यह प्रारंभिक आकलन है। तकनीकी पुष्टि मैकेनिक द्वारा प्रत्यक्ष निरीक्षण के बाद ही होगी।"}
              </div>
            </div>

            {/* Bottlenecks and Machine History Alerts */}
            {activeRecoveryPlan.partsBottleneckDetected && activeRecoveryPlan.partsBottleneckAdviceHi && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 flex items-center gap-2.5 text-xs font-bold text-amber-950">
                <span className="text-xl">🔧</span>
                <span>
                  {currentLanguage === "en" ? "Spare Parts Status: In stock at nearest hub" : `स्पेयर पार्ट्स स्थिति: ${activeRecoveryPlan.partsBottleneckAdviceHi}`}
                </span>
              </div>
            )}

            {activeRecoveryPlan.previousIssueNoticeHi && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-3 flex items-center gap-2.5 text-xs font-bold text-blue-950">
                <span className="text-xl">📜</span>
                <span>
                  {currentLanguage === "en" ? "Machine History: Past service recorded in Passport" : `मशीन इतिहास: ${activeRecoveryPlan.previousIssueNoticeHi}`}
                </span>
              </div>
            )}

            {/* Practical Recovery Options (Selectable Cards) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>🎯</span>
                  <span>{currentLanguage === "en" ? `Available Recovery Options (${activeRecoveryPlan.recoveryOptions.length})` : `उपलब्ध रिकवरी विकल्प (${activeRecoveryPlan.recoveryOptions.length})`}</span>
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {currentLanguage === "en" ? "Select convenient option" : "सुविधाजनक विकल्प चुनें"}
                </span>
              </div>

              {activeRecoveryPlan.recoveryOptions.map((opt) => {
                const isSelected = selectedRecoveryOption?.id === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedRecoveryOption(opt)}
                    className={`rounded-3xl p-5 border-3 transition-all cursor-pointer space-y-3.5 shadow-sm ${
                      isSelected
                        ? "bg-white border-emerald-600 ring-4 ring-emerald-100 shadow-md"
                        : "bg-white border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {/* Badge & Radio */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full border ${
                          opt.type === "fastest"
                            ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                            : opt.type === "nearest_centre"
                            ? "bg-blue-100 text-blue-950 border-blue-300"
                            : "bg-amber-100 text-amber-950 border-amber-300"
                        }`}
                      >
                        {opt.type === "fastest" && "⚡ "}
                        {opt.type === "nearest_centre" && "🏪 "}
                        {opt.type === "lowest_cost" && "💰 "}
                        {currentLanguage === "en"
                          ? (opt.type === "fastest" ? "Fastest Recovery" : opt.type === "nearest_centre" ? "Nearest Workshop" : "Lowest Cost")
                          : opt.badgeHi}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">
                          {currentLanguage === "en" ? `Approx ${opt.estimatedServiceTimeHours} hrs` : `लगभग ${opt.estimatedServiceTimeHours} घंटे`}
                        </span>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <span className="text-xs font-black">✓</span>}
                        </div>
                      </div>
                    </div>

                    {/* Title & Service Provider */}
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        {currentLanguage === "en" ? (opt.providerNameHi.replace("मैकेनिक", "Mechanic").replace("वर्कशॉप", "Workshop")) : opt.providerNameHi}
                      </h3>
                      <div className="text-sm font-bold text-slate-700 mt-0.5">
                        {opt.serviceMode === "doorstep"
                          ? (currentLanguage === "en" ? "🏠 Doorstep Service" : "🏠 घर पर सेवा (Doorstep)")
                          : (currentLanguage === "en" ? "🏢 Workshop Visit (Service Centre)" : "🏢 वर्कशॉप पर ले जाएं (Service Centre)")} • {currentLanguage === "en" ? (opt.providerTypeHi.includes("मैकेनिक") ? "Mobile Mechanic" : "Authorized Workshop") : opt.providerTypeHi}
                      </div>
                      <div className="text-xs font-bold text-slate-500 mt-0.5">
                        {currentLanguage === "en" ? `Distance: ${opt.distanceText} • Time: ${opt.estimatedServiceTimeHours} hrs` : `दूरी: ${opt.distanceText} • अनुमानित समय: ${opt.estimatedServiceTimeTextHi}`}
                        {activeRecoveryPlan.isOffline && (
                          <span className="ml-2 text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                            {currentLanguage === "en" ? "⚠️ Live status offline (Cached)" : "⚠️ लाइव उपलब्धता अनुपलब्ध (कैश्ड)"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Parts & Capability Details */}
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs font-bold text-slate-700 space-y-1">
                      <div>
                        🔧 <span className="text-slate-500">{currentLanguage === "en" ? "Spare Parts: " : "स्पेयर पार्ट्स: "}</span>
                        <span className="text-slate-900 font-black">
                          {opt.partsAvailable ? (currentLanguage === "en" ? "Parts In Stock" : "पार्ट्स उपलब्ध (In Stock)") : (currentLanguage === "en" ? "Need to Order" : "मंगवाना पड़ेगा")}
                        </span>
                      </div>
                      <div>
                        ℹ️ <span className="text-slate-500">{currentLanguage === "en" ? "Practical Details: " : "व्यावहारिक विवरण: "}</span>
                        <span>{currentLanguage === "en" ? (opt.type === "fastest" ? "Quickest resolution to prevent downtime." : "Standard authorized repair protocol.") : opt.reasonHi}</span>
                      </div>
                      {opt.prosHi && opt.prosHi.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {opt.prosHi.map((pro, idx) => (
                            <span key={idx} className="bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded text-[11px] font-bold">
                              ✓ {currentLanguage === "en" ? (pro.includes("त्वरित") ? "Rapid" : pro.includes("घर") ? "Doorstep" : pro.includes("प्रमाणित") ? "Certified" : "Low Cost") : pro}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Transparent Price Row */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-500 block">
                          {currentLanguage === "en" ? "Estimated Total Cost:" : "अनुमानित कुल लागत:"}
                        </span>
                        <span className="text-2xl font-black text-slate-900">
                          ₹{opt.pricing.total}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-slate-600 block">
                          {currentLanguage === "en" ? `Inspection: ₹${opt.pricing.diagnosticFee} + Labour: ₹${opt.pricing.labourFee}` : `जाँच: ₹${opt.pricing.diagnosticFee} + मजदूरी: ₹${opt.pricing.labourFee}`}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 block">
                          {currentLanguage === "en" ? `Parts: ₹${opt.pricing.partsEstimate} + Travel: ₹${opt.pricing.travelFee}` : `पार्ट्स: ₹${opt.pricing.partsEstimate} + यात्रा: ₹${opt.pricing.travelFee}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Confirm Selected Recovery Option Button */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={!selectedRecoveryOption || isAssigningTechnician}
                onClick={() => selectedRecoveryOption && handleConfirmRecoveryOption(selectedRecoveryOption)}
                className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-50 text-white font-black py-4 px-4 rounded-3xl text-xl shadow-xl border-3 border-emerald-950 flex items-center justify-center gap-3 transition-transform"
              >
                <CheckCircle2 className="w-6 h-6 text-amber-300" />
                <span>
                  {isAssigningTechnician
                    ? (currentLanguage === "en" ? "Booking in progress..." : "बुकिंग की जा रही है...")
                    : (currentLanguage === "en" ? "✓ Confirm Plan (Create Job Card)" : `✓ ${selectedRecoveryOption?.badgeHi || "योजना"} पुष्टीकृत करें (जॉब कार्ड बनाएं)`)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentScreen("technician_match")}
                className="w-full bg-white hover:bg-slate-50 text-slate-800 font-black py-3 px-4 rounded-2xl text-base border-2 border-slate-300 flex items-center justify-center gap-2 transition-colors"
              >
                <span>{currentLanguage === "en" ? "👨‍🔧 View All Available Mechanics" : "👨‍🔧 सभी उपलब्ध मैकेनिक सूची देखें"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= P2E & P2K: TECHNICIAN MATCH SCREEN ================= */}
        {currentScreen === "technician_match" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>👨‍🔧</span> {currentLanguage === "en" ? "Nearby Mechanics" : "पास के मैकेनिक"}
              </h2>
              {lastSubmittedRepair && (
                <span className="text-xs font-medium text-slate-500">
                  {lastSubmittedRepair.machineIcon} {currentLanguage === "en" ? (machines.find((m) => m.id === lastSubmittedRepair.machineId)?.name || (lastSubmittedRepair as any).machineName || lastSubmittedRepair.machineNameHi) : lastSubmittedRepair.machineNameHi}
                </span>
              )}
            </div>

            {/* P2K Section 10: Mandatory Safety Warning for Hazardous Conditions */}
            {(() => {
              const rep =
                repairs.find((r) => r.id === activeJobCardRepairId) ||
                lastSubmittedRepair;
              if (rep?.safetyMessage) {
                return (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-red-950">
                        {rep.safetyMessage}
                      </div>
                      <p className="text-[11px] text-red-800">
                        {currentLanguage === "en"
                          ? "Safety Warning: Keep machine stopped immediately in case of fire, smoke, leakage or overheating. Do not attempt to start."
                          : "सुरक्षा चेतावनी: आग, धुआं, लीकेज या ओवरहीटिंग के समय मशीन तुरंत बंद रखें। मशीन चालू करने का प्रयास न करें।"}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Map shortcut button */}
            <button
              type="button"
              id="open-map-screen-btn"
              onClick={() => setCurrentScreen("nearby_mechanics")}
              className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>{currentLanguage === "en" ? "🗺️ View Nearby Mechanics on Map" : "🗺️ पास के मैकेनिक नक्शे पर देखें"}</span>
            </button>

            {/* LOADING STATE */}
            {isFindingTech ? (
              <div className="bg-white border border-slate-200 rounded-lg p-6 text-center space-y-4 shadow-2xs">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl mx-auto">
                  👨‍🔧
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {currentLanguage === "en" ? "Finding mechanic for you..." : "आपके लिए मैकेनिक ढूंढ रहे हैं..."}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {currentLanguage === "en"
                      ? "Checking skills, availability, distance, and workload"
                      : "हुनर, उपलब्धता, दूरी और कार्यभार की जाँच की जा रही है"}
                  </p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div
                    className="bg-emerald-600 h-full rounded-full animate-pulse"
                    style={{ width: "70%" }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {currentLanguage === "en" ? "⚡ Local data search — no internet needed" : "⚡ स्थानीय डेटा से खोज — इंटरनेट की जरूरत नहीं"}
                </p>
              </div>
            ) : techMatchResult ? (
              <div className="space-y-3">
                {/* Offline notice */}
                {!isOnline && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
                    <WifiOff className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-amber-950">
                      {currentLanguage === "en"
                        ? "Mechanic data saved locally on phone. Will sync when online."
                        : "मैकेनिक की जानकारी फोन में सुरक्षित है। इंटरनेट आने पर सिंक की जाएगी।"}
                    </p>
                  </div>
                )}

                {/* Match reason banner */}
                {techMatchResult.recommended ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-950">
                        {currentLanguage === "en" ? "Mechanic Matched ✓" : "मैकेनिक मिल गया ✓"}
                      </div>
                      <div className="text-[11px] text-emerald-900 font-medium">
                        {currentLanguage === "en" ? "Nearest verified expert is ready to assist." : techMatchResult.reasonHi}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-950">
                      {currentLanguage === "en" ? "Searching nearby area for available technicians..." : techMatchResult.reasonHi}
                    </p>
                  </div>
                )}

                {/* Mechanic list */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    {currentLanguage === "en" ? "Available Technicians" : "उपलब्ध मैकेनिक सूची"}
                  </div>

                  {techMatchResult.matchedTechnicians.map((item, idx) => {
                    const tech = item.technician;
                    const routeUrl = getRouteUrl(farmerLocation, tech);

                    return (
                      <div
                        key={tech.id}
                        id={`technician-card-${tech.id}`}
                        className={`rounded-lg p-4 border bg-white transition-colors space-y-3 shadow-2xs ${
                          idx === 0 && tech.available
                            ? "border-emerald-600"
                            : "border-slate-200"
                        }`}
                      >
                        {/* Header: Name & Availability */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                              👨‍🔧
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">
                                {currentLanguage === "en" ? tech.name : tech.nameHi}
                              </h3>
                              {idx === 0 && tech.available && (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  {currentLanguage === "en" ? "Recommended Match" : "सर्वोत्तम सुझाव"}
                                </span>
                              )}
                            </div>
                          </div>

                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${
                              tech.available
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {tech.available
                              ? (currentLanguage === "en" ? "🟢 Available" : "🟢 उपलब्ध")
                              : (currentLanguage === "en" ? "🔴 Busy" : "🔴 व्यस्त")}
                          </span>
                        </div>

                        {/* Details: Machine Experience & Distance */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 border border-slate-200 rounded-md p-2 flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-emerald-700 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-[10px] text-slate-500 font-medium">
                                {currentLanguage === "en" ? "Experience" : "अनुभव"}
                              </div>
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {currentLanguage === "en" ? tech.skills.join(", ") : item.expertiseLabel}
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-md p-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-[10px] text-slate-500 font-medium">
                                {currentLanguage === "en" ? "Distance" : "दूरी"}
                              </div>
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {item.approxDistanceText}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Certification & Trust */}
                        <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-500 font-medium">
                              {currentLanguage === "en" ? "Certification:" : "प्रमाणन:"}
                            </span>
                            <span
                              className={`font-semibold px-2 py-0.5 rounded text-[11px] border ${
                                tech.verificationStatus === "verified"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : tech.verificationStatus === "expired"
                                  ? "bg-red-50 text-red-800 border-red-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {tech.verificationStatus === "verified"
                                ? (currentLanguage === "en" ? "Verified" : "प्रमाणित")
                                : tech.verificationStatus === "expired"
                                ? (currentLanguage === "en" ? "Renewal Req." : "नवीनीकरण जरूरी")
                                : (currentLanguage === "en" ? "Pending" : "प्रक्रियाधीन")}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200">
                            <span className="text-slate-500 font-medium">
                              {currentLanguage === "en" ? "Experience:" : "कार्य अनुभव:"}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {tech.experienceYears ? `${tech.experienceYears} ${currentLanguage === "en" ? "years" : "वर्ष"}` : (currentLanguage === "en" ? "3+ years" : "3+ वर्ष")}
                            </span>
                          </div>

                          {/* Button to view certificate portfolio */}
                          <button
                            type="button"
                            onClick={() => handleOpenCredentialsModal(tech)}
                            className="w-full mt-1 py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded border border-slate-200 text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Award className="w-3 h-3 text-amber-600" />
                            <span>{currentLanguage === "en" ? "View Certifications" : "प्रमाणन व प्रशिक्षण रिकॉर्ड देखें"}</span>
                          </button>
                        </div>

                        {/* Route link if available */}
                        {routeUrl && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => window.open(routeUrl, "_blank")}
                              className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-medium text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>{currentLanguage === "en" ? "View Route" : "रास्ता देखें"}</span>
                            </button>
                          </div>
                        )}

                        {/* Primary Button: "मैकेनिक चुनें" */}
                        <button
                          type="button"
                          id={`select-tech-btn-${tech.id}`}
                          onClick={() => handleSelectTechnician(tech)}
                          disabled={!tech.available || isAssigningTechnician}
                          className={`w-full font-semibold py-2.5 px-4 rounded-md text-sm shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                            tech.available && !isAssigningTechnician
                              ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          }`}
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>
                            {isAssigningTechnician
                              ? (currentLanguage === "en" ? "Assigning..." : "नियुक्त हो रहा है...")
                              : tech.available
                              ? (currentLanguage === "en" ? "Select Mechanic" : "मैकेनिक चुनें")
                              : (currentLanguage === "en" ? "Currently Busy" : "अभी व्यस्त हैं")}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* View my repair link */}
                <button
                  type="button"
                  onClick={() => setCurrentScreen("repair")}
                  className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>{currentLanguage === "en" ? "View My Repair ➔" : "मेरी मरम्मत देखें ➔"}</span>
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* ================= P2E & P2K: TECHNICIAN JOB CARD SCREEN ================= */}
        {currentScreen === "technician_job_card" && currentJobCard && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-700" />
                <span>{currentLanguage === "en" ? "Job Card & Status" : "जॉब कार्ड व स्थिति"}</span>
              </h2>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{currentJobCard.jobId}</span>
            </div>

            {/* Technician Status Stepper */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                {currentLanguage === "en" ? "Mechanic Tracking Status:" : "मैकेनिक ट्रैकिंग स्थिति:"}
              </div>

              {/* Status Display Text */}
              <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>
                  {currentJobCard.status === "मैकेनिक को भेजा गया" ||
                  currentJobCard.technicianWorkflowStatus === "assigned"
                    ? (currentLanguage === "en" ? "Mechanic has been assigned" : "मैकेनिक नियुक्त हो गया है")
                    : currentJobCard.status === "मैकेनिक रास्ते में है" ||
                      currentJobCard.technicianWorkflowStatus === "on_the_way"
                    ? (currentLanguage === "en" ? "Mechanic is on the way" : "मैकेनिक रास्ते में है")
                    : currentJobCard.status === "मैकेनिक पहुँच गया है" ||
                      currentJobCard.technicianWorkflowStatus === "arrived"
                    ? (currentLanguage === "en" ? "Mechanic has arrived" : "मैकेनिक पहुँच गया है")
                    : currentJobCard.status === "मरम्मत चल रही है" ||
                      currentJobCard.status === "मरम्मत शुरू हो गई" ||
                      currentJobCard.technicianWorkflowStatus === "repairing"
                    ? (currentLanguage === "en" ? "Repair is in progress" : "मरम्मत चल रही है")
                    : currentJobCard.status === "मरम्मत पूरी हुई" ||
                      currentJobCard.technicianWorkflowStatus === "completed"
                    ? (currentLanguage === "en" ? "Repair completed" : "मरम्मत पूरी हुई")
                    : currentJobCard.status}
                </span>
              </div>

              {/* Visual 5-Stage Stepper */}
              {(() => {
                const stages: Array<{
                  key: TechnicianWorkflowStatus;
                  label: string;
                }> = [
                  { key: "assigned", label: currentLanguage === "en" ? "Assigned" : "नियुक्त" },
                  { key: "on_the_way", label: currentLanguage === "en" ? "On The Way" : "रास्ते में" },
                  { key: "arrived", label: currentLanguage === "en" ? "Arrived" : "पहुँच गए" },
                  { key: "repairing", label: currentLanguage === "en" ? "Repairing" : "मरम्मत" },
                  { key: "completed", label: currentLanguage === "en" ? "Completed" : "पूरी हुई" },
                ];

                const currentStageKey: TechnicianWorkflowStatus =
                  currentJobCard.technicianWorkflowStatus ||
                  (currentJobCard.status === "मैकेनिक रास्ते में है"
                    ? "on_the_way"
                    : currentJobCard.status === "मैकेनिक पहुँच गया है"
                    ? "arrived"
                    : currentJobCard.status === "मरम्मत शुरू हो गई" ||
                      currentJobCard.status === "मरम्मत चल रही है"
                    ? "repairing"
                    : currentJobCard.status === "मरम्मत पूरी हुई"
                    ? "completed"
                    : "assigned");

                const currentStageIdx = stages.findIndex(
                  (s) => s.key === currentStageKey
                );

                return (
                  <div className="grid grid-cols-5 gap-1 pt-2 border-t border-slate-100">
                    {stages.map((stage, idx) => {
                      const isPast = idx < currentStageIdx;
                      const isCurrent = idx === currentStageIdx;

                      return (
                        <div key={stage.key} className="text-center space-y-1">
                          <div
                            className={`w-full h-1.5 rounded-full ${
                              isPast
                                ? "bg-emerald-600"
                                : isCurrent
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-slate-200"
                            }`}
                          />
                          <span
                            className={`text-[10px] font-semibold block truncate ${
                              isCurrent
                                ? "text-emerald-800"
                                : isPast
                                ? "text-slate-700"
                                : "text-slate-400"
                            }`}
                          >
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Mandatory Safety Warning for Hazardous Condition */}
            {currentJobCard.safetyMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-red-950">
                    {currentJobCard.safetyMessage}
                  </div>
                  <p className="text-[11px] text-red-800">
                    {currentLanguage === "en"
                      ? "Safety Instructions: In case of fire, smoke, leakage, or overheating, keep machine shut off immediately. Do not start until mechanic arrives."
                      : "सुरक्षा निर्देश: आग, धुआं, लीकेज या ओवरहीटिंग के समय मशीन को तुरंत बंद रखें। मैकेनिक के आने तक इसे चालू न करें।"}
                  </p>
                </div>
              </div>
            )}

            {/* Job Card details container */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-2xs">
              <div className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>{currentLanguage === "en" ? "Job Card Details" : "जॉब कार्ड विवरण"}</span>
                <span className="text-xs font-bold text-slate-500">
                  {new Date(currentJobCard.createdAt).toLocaleDateString(currentLanguage === "en" ? "en-IN" : "hi-IN")}
                </span>
              </div>

              {/* Machine name/type */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-3xl sm:text-4xl p-2 bg-white rounded-xl shadow-sm">
                  {currentJobCard.machineIcon}
                </span>
                <div>
                  <div className="text-xl font-black text-slate-900">
                    {currentJobCard.machine}
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    {currentLanguage === "en" ? "Machine Name / Type" : "मशीन का नाम / प्रकार"}
                  </div>
                </div>
              </div>

              {/* Farmer Complaint / Problem */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500 mb-1">
                  {currentLanguage === "en" ? "Farmer Complaint:" : "किसान की शिकायत:"}
                </div>
                <div className="text-base font-black text-slate-900">
                  {localizeDiagnosisProblem(currentJobCard.problem, currentLanguage)}
                </div>
              </div>

              {/* Visual Evidence (Photo analysis & thumbnail) */}
              {(currentJobCard.visualEvidence || currentJobCard.photoDataUrl) && (
                <div className="p-3 bg-indigo-50 border-2 border-indigo-200 rounded-xl space-y-2">
                  <div className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-700" />
                    <span>{currentLanguage === "en" ? "Photo Evidence (Visual Evidence):" : "फोटो साक्ष्य (Visual Evidence):"}</span>
                  </div>
                  {currentJobCard.visualEvidence && (
                    <div className="text-sm font-bold text-indigo-950">
                      {currentJobCard.visualEvidence}
                    </div>
                  )}
                  {currentJobCard.photoDataUrl && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-indigo-300 shadow-sm mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentJobCard.photoDataUrl}
                        alt="Visual Evidence"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* AI Diagnosis & Human Override */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {currentJobCard.technicianOverrideDiagnosis
                        ? (currentLanguage === "en" ? "Actual Diagnosis (Verified by Mechanic):" : "वास्तविक निदान (मैकेनिक द्वारा सत्यापित):")
                        : (currentLanguage === "en" ? "Probable AI Diagnosis:" : "संभावित AI निदान:")}
                    </span>
                  </div>
                  {currentJobCard.technicianOverrideDiagnosis && (
                    <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      ✓ {currentLanguage === "en" ? "Verified" : "सत्यापित"}
                    </span>
                  )}
                </div>

                <div className="text-base font-black text-slate-900">
                  {localizeDiagnosisProblem(currentJobCard.diagnosis, currentLanguage)}
                </div>

                {!isEditingDiagnosis ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTechOverrideDiagnosisInput(currentJobCard.diagnosis);
                      setIsEditingDiagnosis(true);
                    }}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-xs"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>
                      {currentLanguage === "en"
                        ? "✏️ Revise actual issue after physical inspection (Human Override)"
                        : "✏️ भौतिक निरीक्षण के बाद वास्तविक खराबी संशोधित करें (Human Override)"}
                    </span>
                  </button>
                ) : (
                  <div className="space-y-2 pt-1 border-t border-emerald-200">
                    <label className="text-xs font-bold text-slate-700 block">
                      {currentLanguage === "en" ? "Actual confirmed issue after inspection:" : "निरीक्षण के बाद पुष्टि की गई वास्तविक समस्या:"}
                    </label>
                    <input
                      type="text"
                      value={techOverrideDiagnosisInput}
                      onChange={(e) => setTechOverrideDiagnosisInput(e.target.value)}
                      placeholder={currentLanguage === "en" ? "e.g., Fuel line blockage confirmed / hydraulic valve leakage" : "जैसे: फ्यूल सिस्टम में रुकावट की पुष्टि / हाइड्रोलिक वाल्व लीकेज"}
                      className="w-full text-sm font-bold text-slate-900 p-2.5 rounded-xl border-2 border-emerald-400 bg-white"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveDiagnosisOverride}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        {currentLanguage === "en" ? "✓ Update Diagnosis" : "✓ निदान अपडेट करें"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingDiagnosis(false)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-lg"
                      >
                        {currentLanguage === "en" ? "Cancel" : "रद्द करें"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Urgency */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-600">
                  {currentLanguage === "en" ? "Priority:" : "प्राथमिकता:"}
                </span>
                <span className="text-base font-black text-slate-900">
                  {currentJobCard.urgency === "emergency"
                    ? (currentLanguage === "en" ? "Emergency" : "आपातकालीन")
                    : currentJobCard.urgency === "today"
                    ? (currentLanguage === "en" ? "Today" : "आज ही")
                    : (currentLanguage === "en" ? "Standard" : "सामान्य")}
                </span>
              </div>

              {/* Farmer Location available for technician (safe, no personal info exposed) */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-amber-800">
                    {currentLanguage === "en" ? "Work Location (Farmer's Location):" : "कार्य स्थल (किसान की लोकेशन):"}
                  </div>
                  <div className="text-sm font-black text-amber-950">
                    {currentJobCard.farmerLocationText || (currentLanguage === "en" ? "Rural farm area (Approximate location)" : "लखनऊ ग्रामीण कृषि क्षेत्र (अनुमानित स्थान)")}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                    {currentLanguage === "en" ? "(Exact private address protected for security)" : "(सुरक्षा कारणों से निजी पता गुप्त रखा गया है)"}
                  </div>
                </div>
              </div>
            </div>

            {/* P2K Section 7: Technician Card with Route / Directions */}
            <div className="bg-emerald-50 border-3 border-emerald-500 rounded-3xl p-5 space-y-4 shadow-sm">
              <div className="text-base font-black text-emerald-900 border-b border-emerald-200 pb-2 flex items-center justify-between">
                <span>{currentLanguage === "en" ? "Mechanic Details" : "मैकेनिक विवरण"}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-200 px-2.5 py-0.5 rounded-full">
                  {currentLanguage === "en" ? "Assigned" : "नियुक्त"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-200 flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-inner">
                  👨‍🔧
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900">
                    {currentJobCard.technicianNameHi}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm font-bold text-emerald-800">
                      🔧 {currentJobCard.technicianSkillHi}
                    </span>
                    <span className="text-sm font-bold text-slate-700 bg-white/70 px-2 py-0.5 rounded">
                      📍 {currentJobCard.approxDistanceText || (currentLanguage === "en" ? `${currentJobCard.technicianDistanceKm} km` : `${currentJobCard.technicianDistanceKm} किमी`)}
                    </span>
                    <span className="text-sm font-bold text-amber-800">
                      ⭐ {currentJobCard.technicianRating}
                    </span>
                  </div>

                  {/* P2O Step 3: Technician Verification & Trust Badge */}
                  {(() => {
                    const assignedTech = getTechnicianById(currentJobCard.technicianId) || mockTechnicians.find((t) => t.id === currentJobCard.technicianId);
                    const vStatus = assignedTech?.verificationStatus || currentJobCard.technicianVerificationStatus || "verified";

                    return (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                              vStatus === "verified"
                                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                : vStatus === "expired"
                                ? "bg-red-100 text-red-900 border-red-300"
                                : "bg-amber-100 text-amber-900 border-amber-300"
                            }`}
                          >
                            {vStatus === "verified"
                              ? (currentLanguage === "en" ? "🟢 Verified Mechanic" : "🟢 प्रमाणित मैकेनिक (Verified)")
                              : vStatus === "expired"
                              ? (currentLanguage === "en" ? "🔴 Expired (Renewal Required)" : "🔴 प्रमाणन समाप्त (Renewal Required)")
                              : (currentLanguage === "en" ? "🟡 Pending Verification" : "🟡 सत्यापन प्रक्रियाधीन (Pending)")}
                          </span>
                          {(assignedTech?.experienceYears || currentJobCard.technicianExperienceYears) && (
                            <span className="text-xs font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                              {currentLanguage === "en" ? "Experience:" : "अनुभव:"} {assignedTech?.experienceYears || currentJobCard.technicianExperienceYears} {currentLanguage === "en" ? "yrs" : "वर्ष"}
                            </span>
                          )}
                        </div>

                        {assignedTech && (
                          <button
                            type="button"
                            onClick={() => handleOpenCredentialsModal(assignedTech)}
                            className="w-full bg-white hover:bg-emerald-100/70 text-emerald-950 font-black py-2 px-3 rounded-xl border border-emerald-300 text-xs flex items-center justify-center gap-2 shadow-sm transition-colors mt-1"
                          >
                            <Award className="w-4 h-4 text-emerald-700" />
                            <span>
                              {currentLanguage === "en" ? "View Credentials & Training Details" : "प्रमाणन, हुनर व प्रशिक्षण विवरण देखें"}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* P2K Section 7: "रास्ता देखें" Route Button */}
              {currentJobCard.routeUrl ? (
                <button
                  type="button"
                  id="job-card-route-btn"
                  onClick={() => window.open(currentJobCard.routeUrl, "_blank")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 px-4 rounded-2xl text-base shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                >
                  <Navigation className="w-5 h-5 text-amber-300" />
                  <span>{currentLanguage === "en" ? "View Directions (Route)" : "रास्ता देखें (दिशा-निर्देश)"}</span>
                </button>
              ) : (
                <div className="text-xs font-bold text-slate-600 bg-white/80 rounded-xl p-2.5 text-center border border-emerald-200">
                  📍 {currentLanguage === "en" ? `Mechanic Distance: ${currentJobCard.approxDistanceText || "Approx. 3.8 km away"}` : `मैकेनिक की दूरी: ${currentJobCard.approxDistanceText || "लगभग 3.8 km दूर"}`}
                </div>
              )}
            </div>

            {/* P2K Section 6: Technician Workflow Status Progression Buttons */}
            <div className="bg-white border-3 border-slate-300 rounded-3xl p-5 space-y-3 shadow-sm">
              <div className="text-base font-black text-slate-700 border-b border-slate-100 pb-2">
                {currentLanguage === "en" ? "Action — Update Status" : "कार्यवाही — स्थिति अपडेट करें"}
              </div>
              <p className="text-xs font-bold text-slate-500">
                {currentLanguage === "en" ? "Live Repair Workflow Progress" : "मरम्मत कार्य की वर्तमान स्थिति"}
              </p>

              {/* Status = assigned -> Move to on_the_way */}
              {(currentJobCard.status === "मैकेनिक को भेजा गया" ||
                currentJobCard.status === "मैकेनिक नियुक्त हो गया है" ||
                currentJobCard.technicianWorkflowStatus === "assigned") && (
                <button
                  type="button"
                  id="tech-action-on-the-way-btn"
                  onClick={() => handleAdvanceTechnicianStatus("on_the_way")}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-emerald-950 flex items-center justify-center gap-2 transition-transform"
                >
                  <Navigation className="w-6 h-6 text-amber-300" />
                  <span>{currentLanguage === "en" ? "Mechanic On The Way ➔" : "मैकेनिक रास्ते में निकला ➔"}</span>
                </button>
              )}

              {/* Status = on_the_way -> Move to arrived */}
              {(currentJobCard.status === "मैकेनिक रास्ते में है" ||
                currentJobCard.technicianWorkflowStatus === "on_the_way") && (
                <button
                  type="button"
                  id="tech-action-arrived-btn"
                  onClick={() => handleAdvanceTechnicianStatus("arrived")}
                  className="w-full bg-indigo-700 hover:bg-indigo-800 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-indigo-950 flex items-center justify-center gap-2 transition-transform"
                >
                  <MapPin className="w-6 h-6 text-amber-300" />
                  <span>{currentLanguage === "en" ? "Mechanic Arrived ➔" : "मैकेनिक पहुँच गया ➔"}</span>
                </button>
              )}

              {/* Status = arrived -> Move to repairing */}
              {(currentJobCard.status === "मैकेनिक पहुँच गया है" ||
                currentJobCard.technicianWorkflowStatus === "arrived") && (
                <button
                  type="button"
                  id="tech-action-repairing-btn"
                  onClick={() => handleAdvanceTechnicianStatus("repairing")}
                  className="w-full bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-blue-950 flex items-center justify-center gap-2 transition-transform"
                >
                  <Wrench className="w-6 h-6 text-amber-300" />
                  <span>{currentLanguage === "en" ? "Start Repair ➔" : "मरम्मत शुरू करें ➔"}</span>
                </button>
              )}

              {/* Status = repairing -> Move to completed */}
              {(currentJobCard.status === "मरम्मत चल रही है" ||
                currentJobCard.status === "मरम्मत शुरू हो गई" ||
                currentJobCard.technicianWorkflowStatus === "repairing") && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-4 text-center">
                    <div className="text-xl font-black text-blue-950">
                      🔧 {currentLanguage === "en" ? "Repair in progress..." : "मरम्मत चल रही है..."}
                    </div>
                    <div className="text-sm font-bold text-blue-800 mt-1">
                      {currentJobCard.verificationAttempt &&
                      currentJobCard.verificationAttempt > 1
                        ? (currentLanguage === "en" ? `Re-repair (Attempt #${currentJobCard.verificationAttempt}) in progress.` : `दोबारा मरम्मत (प्रयास #${currentJobCard.verificationAttempt}) प्रगति पर है।`)
                        : (currentLanguage === "en" ? "Farmer has been notified." : "किसान को सूचित किया गया है।")}
                    </div>
                  </div>

                  <button
                    type="button"
                    id="tech-action-completed-btn"
                    onClick={() => handleAdvanceTechnicianStatus("completed")}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-emerald-950 flex items-center justify-center gap-2 transition-transform"
                  >
                    <CheckCircle2 className="w-6 h-6 text-amber-300" />
                    <span>{currentLanguage === "en" ? "Repair Completed ➔" : "मरम्मत पूरी हुई ➔"}</span>
                  </button>
                </div>
              )}

              {/* Verification Pending */}
              {currentJobCard.status === "verification_pending" && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-center space-y-1">
                    <div className="text-lg font-black text-amber-950">
                      {currentLanguage === "en" ? "Repair completed. Please inspect the machine now." : "मरम्मत पूरी हो गई है। अब मशीन की जाँच करें।"}
                    </div>
                    <div className="text-sm font-bold text-amber-800">
                      {currentLanguage === "en" ? "Inspection pending — ensure machine works properly." : "जाँच बाकी है — सुनिश्चित करें कि मशीन सही काम कर रही है।"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentScreen("repair_verification")}
                    className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-amber-700 flex items-center justify-center gap-2 transition-transform"
                  >
                    <span>{currentLanguage === "en" ? "Inspect Machine" : "मशीन की जाँच करें"}</span>
                    <span>➔</span>
                  </button>
                </div>
              )}

              {/* Re-repair required */}
              {currentJobCard.status === "दोबारा मरम्मत की जरूरत" && (
                <div className="space-y-3">
                  <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 text-center space-y-1">
                    <div className="text-lg font-black text-red-950">
                      {currentLanguage === "en" ? "Problem is not yet resolved." : "समस्या अभी ठीक नहीं हुई है।"}
                    </div>
                    <div className="text-sm font-bold text-red-800">
                      {currentLanguage === "en" ? "Send mechanic for re-inspection." : "मैकेनिक को दोबारा जाँच के लिए भेजें।"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleReRepair}
                    className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-red-950 flex items-center justify-center gap-2 transition-transform"
                  >
                    <RotateCcw className="w-6 h-6 text-white" />
                    <span>{currentLanguage === "en" ? "Request Re-repair" : "दोबारा मरम्मत कराएं"}</span>
                  </button>
                </div>
              )}

              {/* Finally Completed (Verification Passed) */}
              {currentJobCard.status === "मरम्मत पूरी हुई" && (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 text-center space-y-1">
                    <div className="text-lg font-black text-emerald-950">
                      {currentLanguage === "en" ? "Machine repair successfully completed." : "मशीन की मरम्मत सफलतापूर्वक पूरी हो गई।"}
                    </div>
                    <div className="text-sm font-bold text-emerald-800">
                      {currentLanguage === "en" ? "Machine found fully functional in inspection." : "जाँच में मशीन पूरी तरह सही पाई गई है।"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentScreen("machines")}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-emerald-950 flex items-center justify-center gap-2 transition-transform"
                  >
                    <span>{t("nav.machines", currentLanguage)}</span>
                    <span>➔</span>
                  </button>
                </div>
              )}
            </div>

            {/* ═══ P2F: SPARE PARTS SECTION ═══ */}
            {(() => {
              // Resolve part list: from currentJobCard.recommendedPartIds (persisted)
              // or fall back to current in-session recommendation
              const partIds = currentJobCard.recommendedPartIds && currentJobCard.recommendedPartIds.length > 0
                ? currentJobCard.recommendedPartIds
                : currentPartRecommendation?.recommendations.map((r) => r.part.id) || [];

              if (partIds.length === 0) return null;

              // Resolve full part objects
              const parts = partIds
                .map((id) => getSparePartById(id))
                .filter((p): p is SparePart => p !== null);

              // Summary text
              const summaryHi = currentPartRecommendation?.summaryHi
                || `${parts.length} संभावित पार्ट पहचाने गए हैं।`;

              return (
                <>
                  {/* FARMER VIEW — simplified availability */}
                  <div className="bg-white border-3 border-amber-300 rounded-3xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className="text-xl">🔧</span>
                      <span className="text-base font-black text-slate-800">
                        {currentLanguage === "en" ? "Probable Spare Parts" : "संभावित पार्ट"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-amber-900 bg-amber-50 rounded-xl p-2.5 border border-amber-200">
                      {currentLanguage === "en" ? `${parts.length} potential parts identified.` : summaryHi}
                    </p>

                    <div className="space-y-2">
                      {parts.map((part) => (
                        <div
                          key={part.id}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                            part.available
                              ? "bg-emerald-50 border-emerald-300"
                              : "bg-red-50 border-red-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">🔧</span>
                            <span className="text-base font-black text-slate-900">{part.nameHi}</span>
                          </div>
                          <span
                            className={`text-xs font-black px-2.5 py-1.5 rounded-xl ${
                              part.available
                                ? "bg-emerald-200 text-emerald-900"
                                : "bg-red-200 text-red-900"
                            }`}
                          >
                            {part.available
                              ? (currentLanguage === "en" ? "Available for mechanic" : "मैकेनिक के लिए उपलब्ध")
                              : (currentLanguage === "en" ? "Currently unavailable" : "अभी उपलब्ध नहीं है")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TECHNICIAN PART SELECTION */}
                  <div className="bg-slate-50 border-3 border-slate-300 rounded-3xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <ClipboardList className="w-5 h-5 text-slate-600" />
                      <span className="text-base font-black text-slate-800">
                        {currentLanguage === "en" ? "Mechanic — Select Parts" : "मैकेनिक — पार्ट चुनें"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {currentLanguage === "en" ? "Select verified replacement parts below" : "नीचे आवश्यक स्पेयर पार्ट्स का चयन करें"}
                    </p>

                    <div className="space-y-2.5">
                      {parts.map((part) => {
                        const decision = getPartDecision(part.id);
                        return (
                          <div
                            key={part.id}
                            className={`rounded-2xl border-2 p-3.5 space-y-2.5 ${
                              decision === "needed"
                                ? "bg-emerald-50 border-emerald-400"
                                : decision === "not_needed"
                                ? "bg-slate-100 border-slate-300"
                                : "bg-white border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-base font-black text-slate-900">{part.nameHi}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-bold text-slate-500">{part.partCode}</span>
                                  {part.available ? (
                                    <span className="text-xs font-bold text-emerald-700">
                                      {currentLanguage === "en" ? `• In Stock: ${part.quantity}` : `• स्टॉक: ${part.quantity}`}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold text-red-700">
                                      {currentLanguage === "en" ? "• Unavailable" : "• उपलब्ध नहीं"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {decision === "needed" && (
                                <span className="text-xs font-black bg-emerald-200 text-emerald-900 px-2 py-1 rounded-lg">
                                  ✓ {currentLanguage === "en" ? "Needed" : "चाहिए"}
                                </span>
                              )}
                              {decision === "not_needed" && (
                                <span className="text-xs font-black bg-slate-300 text-slate-700 px-2 py-1 rounded-lg">
                                  ✕ {currentLanguage === "en" ? "Not Needed" : "जरूरत नहीं"}
                                </span>
                              )}
                            </div>

                            {/* Decision buttons — show if pending or allow change */}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handlePartDecision(part.id, part.nameHi, "needed")}
                                className={`flex-1 py-2.5 text-sm font-black rounded-xl border-2 transition-all active:scale-[0.98] ${
                                  decision === "needed"
                                    ? "bg-emerald-600 border-emerald-700 text-white"
                                    : "bg-white border-emerald-400 text-emerald-800 hover:bg-emerald-50"
                                }`}
                              >
                                {currentLanguage === "en" ? "✓ Part Needed" : "✓ पार्ट चाहिए"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePartDecision(part.id, part.nameHi, "not_needed")}
                                className={`flex-1 py-2.5 text-sm font-black rounded-xl border-2 transition-all active:scale-[0.98] ${
                                  decision === "not_needed"
                                    ? "bg-slate-500 border-slate-600 text-white"
                                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {currentLanguage === "en" ? "✕ Not Needed" : "✕ जरूरत नहीं"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* P2O Step 2: Technician Transparent Billing & Price Adjustment Section */}
            {(() => {
              const est = currentJobCard.estimatedCost || calculateEstimatedPricing({
                machineType: currentJobCard.machine,
                distanceKm: currentJobCard.technicianDistanceKm,
                partSelections: currentJobCard.partSelections,
              });

              const currentPartsCost = calculatePartsCost({
                partSelections: currentJobCard.partSelections,
              });

              const activeLabour = techLabourFeeOverride !== null
                ? Math.max(0, techLabourFeeOverride)
                : (currentJobCard.finalCost?.labourFee ?? est.labourFee);

              const currentTotal = est.diagnosticFee + activeLabour + currentPartsCost + est.travelFee - est.discount;
              const effectiveFinalTotal = currentJobCard.finalCost?.total ?? currentTotal;
              const hasDiff = currentJobCard.priceAdjustment || (effectiveFinalTotal !== est.total);

              return (
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💰</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {currentLanguage === "en" ? "Transparent Billing Breakdown" : "पारदर्शी बिलिंग विवरण (Billing)"}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {currentLanguage === "en" ? "Standard authorized rates" : "बिना कारण कोई अतिरिक्त शुल्क नहीं"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {currentLanguage === "en" ? "Certified Rate" : "प्रमाणित दर"}
                    </span>
                  </div>

                  {/* 5 Cost Elements breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>{currentLanguage === "en" ? "Diagnostic Fee:" : "जांच शुल्क (Diagnostic Fee):"}</span>
                      <span className="font-semibold text-slate-900">{formatCurrencyHi(est.diagnosticFee)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>{currentLanguage === "en" ? "Labour Fee:" : "मजदूरी शुल्क (Labour Fee):"}</span>
                      <span className="font-semibold text-slate-900">{formatCurrencyHi(activeLabour)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>{currentLanguage === "en" ? "Spare Parts Cost:" : "स्पेयर पार्ट्स (Parts Cost):"}</span>
                      <span className="font-semibold text-slate-900">{formatCurrencyHi(currentPartsCost)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>{currentLanguage === "en" ? "Travel Fee:" : "घर पर आने का शुल्क (Travel Fee):"}</span>
                      <span className="font-semibold text-slate-900">{formatCurrencyHi(est.travelFee)}</span>
                    </div>
                    {est.discount > 0 && (
                      <div className="flex justify-between items-center text-emerald-700">
                        <span>{currentLanguage === "en" ? "Discount / Subsidy:" : "छूट / सब्सिडी (Discount):"}</span>
                        <span className="font-semibold text-emerald-800">-{formatCurrencyHi(est.discount)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-xs text-slate-900">
                        {currentLanguage === "en" ? "Final Total Repair Cost:" : "अंतिम कुल मरम्मत राशि:"}
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        {formatCurrencyHi(effectiveFinalTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Difference display if final differs from estimate */}
                  {hasDiff && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 space-y-1.5 text-xs">
                      <div className="font-semibold text-amber-950 flex items-center gap-1 text-xs">
                        <span>⚠️</span>
                        <span>{currentLanguage === "en" ? "Cost Adjustment Details:" : "लागत संशोधन विवरण (Cost Difference):"}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-white p-1.5 rounded border border-amber-200">
                          <span className="text-[10px] text-slate-500 block">
                            {currentLanguage === "en" ? "Estimated Cost" : "अनुमानित लागत"}
                          </span>
                          <span className="font-semibold text-slate-900 text-xs">{formatCurrencyHi(est.total)}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded border border-amber-200">
                          <span className="text-[10px] text-slate-500 block">
                            {currentLanguage === "en" ? "Adjusted Cost" : "संशोधित लागत"}
                          </span>
                          <span className="font-semibold text-amber-950 text-xs">
                            {formatCurrencyHi(effectiveFinalTotal)}
                          </span>
                        </div>
                        <div className="bg-white p-1.5 rounded border border-amber-200">
                          <span className="text-[10px] text-slate-500 block">
                            {currentLanguage === "en" ? "Difference" : "अंतर"}
                          </span>
                          <span className={`font-semibold text-xs ${(effectiveFinalTotal - est.total) > 0 ? "text-amber-800" : "text-emerald-700"}`}>
                            {(effectiveFinalTotal - est.total) >= 0 ? "+" : ""}
                            {formatCurrencyHi(effectiveFinalTotal - est.total)}
                          </span>
                        </div>
                      </div>

                      {/* Display recorded reason if already saved */}
                      {currentJobCard.priceAdjustment && (
                        <div className="pt-0.5 text-[11px] text-amber-900 flex items-center justify-between">
                          <span>{currentLanguage === "en" ? "Reason:" : "कारण:"} {currentJobCard.priceAdjustment.reason}</span>
                          <span className="text-[10px] text-amber-800">
                            {new Date(currentJobCard.priceAdjustment.adjustedAt).toLocaleTimeString(currentLanguage === "en" ? "en-IN" : "hi-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price adjustment controls */}
                  <div className="space-y-2 pt-1">
                    {!isEditingPrice ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTechLabourFeeOverride(currentJobCard.finalCost?.labourFee ?? est.labourFee);
                          setIsEditingPrice(true);
                        }}
                        className="w-full bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-3 rounded-md border border-slate-200 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>{currentLanguage === "en" ? "Revise Cost / Labour (With Reason)" : "लागत / मजदूरी संशोधित करें (कारण के साथ)"}</span>
                      </button>
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-2 text-xs">
                        <div className="font-semibold text-slate-900 border-b border-slate-200 pb-1.5">
                          {currentLanguage === "en" ? "Cost Adjustment Form (Post-Inspection):" : "लागत संशोधन प्रपत्र (मशीन जांच उपरांत):"}
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-600 block mb-1">
                            {currentLanguage === "en" ? "Revised Labour Fee:" : "संशोधित मजदूरी शुल्क (Labour Fee):"}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={techLabourFeeOverride ?? est.labourFee}
                              onChange={(e) => setTechLabourFeeOverride(Math.max(0, parseInt(e.target.value) || 0))}
                              className="flex-1 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-600 block mb-1">
                            {currentLanguage === "en" ? "Mandatory Adjustment Reason:" : "संशोधन का अनिवार्य कारण (Mandatory Reason):"}
                          </label>
                          <select
                            value={priceAdjustmentReason}
                            onChange={(e) => setPriceAdjustmentReason(e.target.value as PriceChangeReason)}
                            className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:border-emerald-600"
                          >
                            {PRICE_CHANGE_REASONS.map((reason) => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                        </div>

                        {priceAdjustmentReason === "अन्य" && (
                          <div>
                            <label className="text-[11px] font-medium text-slate-600 block mb-1">
                              {currentLanguage === "en" ? "Enter explanation for reason:" : "कारण का विवरण लिखें:"}
                            </label>
                            <input
                              type="text"
                              value={customPriceNote}
                              onChange={(e) => setCustomPriceNote(e.target.value)}
                              placeholder={currentLanguage === "en" ? "e.g., Additional wiring replaced" : "जैसे: अतिरिक्त वायरिंग बदली गई"}
                              className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
                            />
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleSavePriceAdjustment}
                            className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            {currentLanguage === "en" ? "✓ Save Adjustment" : "✓ संशोधन सुरक्षित करें"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingPrice(false)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-md text-xs border border-slate-200 cursor-pointer"
                          >
                            {currentLanguage === "en" ? "Cancel" : "रद्द करें"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Navigate to repair timeline */}
            <button
              type="button"
              onClick={() => setCurrentScreen("repair")}
              className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{t("nav.repairs", currentLanguage)}</span>
              <span>➔</span>
            </button>
          </div>
        )}

        {/* ================= P2F STEP 2: MACHINE VERIFICATION SCREEN ================= */}
        {currentScreen === "repair_verification" && (() => {
          const activeCard = currentJobCard || (latestRepair ? getJobCardByRepairId(latestRepair.id) : getLatestJobCard());

          return (
            <div className="space-y-4">
              {/* Top Navigation */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentScreen(activeCard ? "technician_job_card" : "repair")}
                  className="flex items-center gap-1.5 text-base font-bold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>{t("common.back", currentLanguage)}</span>
                </button>
                <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {activeCard
                    ? (currentLanguage === "en" ? `Verification Attempt #${activeCard.verificationAttempt || 1}` : `जाँच प्रयास #${activeCard.verificationAttempt || 1}`)
                    : (currentLanguage === "en" ? "Verification Attempt #1" : "जाँच प्रयास #1")}
                </div>
              </div>

              {/* Title & Core Question */}
              <div className="text-center space-y-1 py-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mx-auto shadow-sm">
                  🔍
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  {t("verification.title", currentLanguage)}
                </h2>
                <p className="text-xl font-black text-amber-900 bg-amber-50 rounded-xl py-3 px-4 border-2 border-amber-300">
                  {t("verification.isMachineWorking", currentLanguage)}
                </p>
              </div>

              {/* Context Summary Card */}
              {activeCard && (
                <div className="bg-white border-3 border-slate-300 rounded-3xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl p-2 bg-slate-100 rounded-xl">{activeCard.machineIcon}</span>
                    <div>
                      <div className="text-xl font-black text-slate-900">{activeCard.machine}</div>
                      <div className="text-sm font-bold text-slate-500">
                        {t("recovery.technician", currentLanguage)}: {activeCard.technicianNameHi}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 mb-0.5">{t("complaint.title", currentLanguage)}:</div>
                    <div className="text-sm font-black text-slate-900">
                      {localizeDiagnosisProblem(activeCard.problem, currentLanguage)}
                    </div>
                  </div>

                  {activeCard.diagnosis && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="text-xs font-bold text-emerald-700 mb-0.5 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> {t("diagnosis.title", currentLanguage)}:
                      </div>
                      <div className="text-sm font-black text-slate-900">
                        {localizeDiagnosisProblem(activeCard.diagnosis, currentLanguage)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Offline indicator */}
              {!isOnline && (
                <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center gap-2">
                  <WifiOff className="w-5 h-5 text-amber-800 flex-shrink-0" />
                  <span className="text-sm font-bold text-amber-950">
                    {t("common.offlineNotice", currentLanguage)}
                  </span>
                </div>
              )}

              {/* 1. INITIAL / PENDING VERIFICATION STATE — TWO LARGE CHOICES */}
              {(!activeCard?.verificationStatus || activeCard.verificationStatus === "pending") && (
                <div className="space-y-4 pt-1">
                  <div className="text-center p-3 bg-slate-50 rounded-2xl border-2 border-slate-200 text-sm font-bold text-slate-600">
                    {t("verification.testInstructions", currentLanguage)}
                  </div>

                  <div className="grid grid-cols-1 gap-3.5">
                    {/* OPTION 1: PASS (GREEN) */}
                    <button
                      type="button"
                      onClick={() => handleVerificationChoice(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black py-5 px-6 rounded-3xl text-2xl shadow-lg border-3 border-emerald-950 flex items-center justify-center gap-3 transition-transform cursor-pointer"
                    >
                      <span className="text-2xl sm:text-3xl">✅</span>
                      <span>{t("verification.machineFixed", currentLanguage)}</span>
                    </button>

                    {/* OPTION 2: FAIL (RED) */}
                    <button
                      type="button"
                      onClick={() => handleVerificationChoice(false)}
                      className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black py-5 px-6 rounded-3xl text-2xl shadow-lg border-3 border-red-950 flex items-center justify-center gap-3 transition-transform cursor-pointer"
                    >
                      <span className="text-2xl sm:text-3xl">❌</span>
                      <span>{t("verification.issueRemains", currentLanguage)}</span>
                    </button>

                    {/* OPTION 3: REAL EVIDENCE JOB-READY VERIFICATION */}
                    <button
                      type="button"
                      onClick={() => setCurrentScreen("job_ready_verification")}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-black py-4 px-5 rounded-2xl text-xl shadow-lg border-2 border-emerald-950 flex items-center justify-center gap-2 transition-transform cursor-pointer"
                    >
                      <span>🎒</span>
                      <span>{currentLanguage === "en" ? "Start Job-Ready Check (Clean Water Test)" : "Job-Ready Check शुरू करें (Clean Water Test)"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. VERIFICATION PASSED VIEW */}
              {activeCard?.verificationStatus === "passed" && (
                <div className="bg-emerald-50 border-3 border-emerald-500 rounded-3xl p-6 space-y-4 shadow-sm animate-in fade-in">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center text-3xl sm:text-4xl mx-auto shadow-md">
                      ✓
                    </div>
                    <h3 className="text-2xl font-black text-emerald-950">
                      {currentLanguage === "en" ? "Machine repair successfully completed." : "मशीन की मरम्मत सफलतापूर्वक पूरी हो गई।"}
                    </h3>
                    <p className="text-sm font-bold text-emerald-800">
                      {currentLanguage === "en" ? "Machine found fully functional in inspection." : "जाँच में मशीन पूरी तरह सही पाई गई है।"}
                    </p>
                  </div>

                  {/* Summary of completed repair */}
                  <div className="bg-white rounded-2xl p-4 border border-emerald-200 space-y-2.5">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-sm font-bold text-slate-500">
                        {currentLanguage === "en" ? "Machine Name:" : "मशीन का नाम:"}
                      </span>
                      <span className="text-base font-black text-slate-900">{activeCard.machine}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-sm font-bold text-slate-500">
                        {currentLanguage === "en" ? "Problem:" : "समस्या:"}
                      </span>
                      <span className="text-base font-black text-slate-900">
                        {localizeDiagnosisProblem(activeCard.problem, currentLanguage)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-sm font-bold text-slate-500">
                        {currentLanguage === "en" ? "AI Initial Inspection:" : "AI प्रारंभिक जाँच:"}
                      </span>
                      <span className="text-base font-black text-slate-900">
                        {localizeDiagnosisProblem(activeCard.diagnosis, currentLanguage)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-sm font-bold text-slate-500">
                        {currentLanguage === "en" ? "Mechanic:" : "मैकेनिक:"}
                      </span>
                      <span className="text-base font-black text-slate-900">{activeCard.technicianNameHi}</span>
                    </div>
                    <div className="py-1 border-b border-slate-100">
                      <span className="text-sm font-bold text-slate-500">
                        {currentLanguage === "en" ? "Parts Used:" : "इस्तेमाल हुए पार्ट:"}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {(() => {
                          const partsUsed = (activeCard.partSelections || [])
                            .filter((s) => s.decision === "needed")
                            .map((s) => s.partNameHi);
                          if (partsUsed.length === 0) {
                            return (
                              <span className="text-sm font-bold text-slate-700">
                                {currentLanguage === "en" ? "No new parts used" : "कोई नया पार्ट नहीं लगा"}
                              </span>
                            );
                          }
                          return partsUsed.map((name, i) => (
                            <span key={i} className="text-xs font-black bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-300">
                              🔧 {name}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm font-bold text-slate-500">
                        {currentLanguage === "en" ? "Completion Date:" : "पूर्ण होने की तारीख:"}
                      </span>
                      <span className="text-base font-black text-slate-900">
                        {activeCard.verificationTime
                          ? new Date(activeCard.verificationTime).toLocaleDateString(currentLanguage === "en" ? "en-IN" : "hi-IN")
                          : new Date().toLocaleDateString(currentLanguage === "en" ? "en-IN" : "hi-IN")}
                      </span>
                    </div>
                  </div>

                  {!isOnline && (
                    <div className="text-center text-xs font-black text-slate-500">
                      {currentLanguage === "en" ? "🔒 Verification result saved locally on device." : "🔒 जाँच का परिणाम फोन में सुरक्षित है।"}
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    {/* ── NEW: Job-Ready Verification CTA ── */}
                    {(() => {
                      const repairId = activeCard?.repairRequestId || latestRepair?.id || "";
                      const existingJrv = repairId ? getJobReadinessForRepair(repairId) : null;
                      if (existingJrv?.farmerVerified) {
                        // Already completed — show badge and go to machines
                        return (
                          <div className="space-y-2">
                            <div className="p-3 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-center">
                              <p className="text-sm font-black text-emerald-800">
                                ✅ Job-Ready Verification पूरी हो गई
                              </p>
                              <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                Score: {existingJrv.score}/100 — {existingJrv.status}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCurrentScreen("machines")}
                              className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-emerald-950 flex items-center justify-center gap-2 transition-transform"
                            >
                              <span>{t("nav.machines", currentLanguage)}</span>
                              <span>➔</span>
                            </button>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentScreen("job_ready_verification");
                            }}
                            className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-emerald-950 flex items-center justify-center gap-2 transition-transform"
                          >
                            <span>🎒</span>
                            <span>Job-Ready Check शुरू करें</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentScreen("machines")}
                            className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl text-sm border-2 border-slate-300 flex items-center justify-center gap-2"
                          >
                            <span>{t("nav.machines", currentLanguage)}</span>
                          </button>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => setCurrentScreen("repair")}
                      className="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-sm border border-slate-200 flex items-center justify-center gap-2"
                    >
                      <span>{t("nav.repairs", currentLanguage)}</span>
                    </button>
                  </div>
                </div>
              )}


              {/* 3. VERIFICATION FAILED VIEW */}
              {activeCard?.verificationStatus === "failed" && (
                <div className="bg-red-50 border-3 border-red-500 rounded-3xl p-6 space-y-4 shadow-sm animate-in fade-in">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 text-white flex items-center justify-center text-3xl sm:text-4xl mx-auto shadow-md">
                      ✕
                    </div>
                    <h3 className="text-2xl font-black text-red-950">
                      {currentLanguage === "en" ? "Problem Still Persists" : "समस्या अभी है"}
                    </h3>
                    <p className="text-xl font-black text-red-900 bg-red-100 py-3 px-4 rounded-2xl border border-red-300">
                      {currentLanguage === "en" ? "We will arrange assistance again." : "हम दोबारा मदद की व्यवस्था करेंगे।"}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-red-200 space-y-2 text-center">
                    <div className="text-base font-black text-slate-900">
                      {currentLanguage === "en"
                        ? `Verification Attempt #${activeCard.verificationAttempt || 1} — Issue Remains`
                        : `जाँच प्रयास #${activeCard.verificationAttempt || 1} — समस्या बाकी है`}
                    </div>
                    <div className="text-sm font-bold text-slate-600">
                      {currentLanguage === "en"
                        ? "Original repair record is safely preserved. Attempt count will increment on re-repair."
                        : "मूल मरम्मत रिकॉर्ड सुरक्षित रखा गया है। दोबारा मरम्मत कराने पर प्रयास संख्या बढ़ जाएगी।"}
                    </div>
                  </div>

                  {!isOnline && (
                    <div className="text-center text-xs font-black text-slate-500">
                      {currentLanguage === "en" ? "🔒 Verification result saved locally on device." : "🔒 जाँच का परिणाम फोन में सुरक्षित है।"}
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleReRepair}
                      className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-xl shadow-lg border-2 border-red-950 flex items-center justify-center gap-2 transition-transform"
                    >
                      <RotateCcw className="w-6 h-6 text-white" />
                      <span>{currentLanguage === "en" ? "Recall Mechanic" : "मैकेनिक को दोबारा बुलाएं"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentScreen("repair")}
                      className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold py-3 px-4 rounded-xl text-base border-2 border-slate-300 flex items-center justify-center gap-2"
                    >
                      <span>{t("nav.repairs", currentLanguage)}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ================= JOB-READY VERIFICATION SCREEN ================= */}
        {currentScreen === "job_ready_verification" && (() => {
          const activeCard = currentJobCard || (latestRepair ? getJobCardByRepairId(latestRepair.id) : getLatestJobCard());
          const repairForJrv = latestRepair || repairs[0] || null;
          const machineForJrv = machines.find((m) => m.id === repairForJrv?.machineId) || selectedMachine || machines[0];
          const repairDateStr = activeCard?.verificationTime
            ? new Date(activeCard.verificationTime).toLocaleDateString("hi-IN")
            : new Date().toLocaleDateString("hi-IN");

          return (
            <JobReadyVerificationScreen
              repairRequestId={repairForJrv?.id || activeCard?.repairRequestId || "demo-repair"}
              machineId={machineForJrv?.id || "sprayer"}
              machineNameHi={activeCard?.machine || machineForJrv?.nameHi || "sprayer"}
              technicianNameHi={activeCard?.technicianNameHi || "Mechanic"}
              technicianId={activeCard?.technicianId}
              repairDate={repairDateStr}
              onBack={() => setCurrentScreen("repair")}
              onComplete={(record) => {
                setCurrentJobReadinessRecord(record);
                const machineId = machineForJrv?.id || record.machineId || "sprayer";
                const repairId = repairForJrv?.id || activeCard?.repairRequestId || record.repairRequestId || `repair-${Date.now()}`;
                const techId = record.technicianId || activeCard?.technicianId || "tech-rajesh";
                const techName = record.technicianNameHi || activeCard?.technicianNameHi || "राजेश वर्मा (प्रमाणित मैकेनिक)";

                const partsList = (activeCard?.partSelections || [])
                  .filter((s) => s.decision === "needed")
                  .map((s) => s.partNameHi);

                const finalPricing = activeCard?.finalCost || activeCard?.estimatedCost || calculateEstimatedPricing({
                  machineType: activeCard?.machine || machineForJrv?.nameHi || "स्प्रेयर",
                  partSelections: activeCard?.partSelections,
                  distanceKm: activeCard?.technicianDistanceKm || 3.2,
                });

                const passportData: MachinePassportRecord = {
                  repairDate: repairDateStr,
                  diagnosis: activeCard?.technicianOverrideDiagnosis || activeCard?.diagnosis || repairForJrv?.diagnosis?.possibleProblem || "स्प्रेयर मरम्मत एवं जाँच",
                  technician: techName,
                  partsUsed: partsList.length > 0 ? partsList : ["कोई नया पार्ट नहीं लगा"],
                  repairResult: "सफलतापूर्वक मरम्मत हुई",
                  verificationResult: `मशीन सही पाई गई (Job-Ready: ${record.status}, Score: ${record.score}/100)`,
                  verificationId: record.id,
                  finalCost: finalPricing.total,
                  costBreakdown: finalPricing,
                  problemDescription: activeCard?.problem || repairForJrv?.problemDescription || "स्प्रेयर रिसाव एवं नोजल रुकावट",
                  estimatedCost: activeCard?.estimatedCost?.total,
                  serviceCentreNameHi: activeCard?.serviceCentreNameHi,
                  maintenanceRecommendation: "Clean Water Test पास। अगली सामान्य सर्विस 90 दिन बाद अनुशंसित है।",
                  machineId,
                  repairId,
                  technicianId: techId,
                  repairDetails: `Job-Ready Verification: ${record.operation} (${record.status}, Score: ${record.score}/100)`,
                  jobOperation: record.operation,
                  jobReadyStatus: record.status,
                  score: record.score,
                  verificationEvidence: record.evidence,
                  farmerConfirmation: record.farmerVerified,
                  timestamp: record.createdAt,
                };

                if (activeCard) {
                  const updatedCard = recordJobCardVerification(activeCard.jobId, true, undefined, record.id);
                  if (updatedCard) setCurrentJobCard(updatedCard);
                }

                recordRepairVerification(repairId, true, passportData, `Job-Ready Verification पास: स्कोर ${record.score}/100`, record.id);

                const updatedMachines = machines.map((m) => {
                  if (m.id === machineId) {
                    const jrvEntry = `${repairDateStr}: Job-Ready (${record.operation}) Score:${record.score}/100 [${record.status}] किसान द्वारा सत्यापित`;
                    return {
                      ...m,
                      status: "active" as const,
                      statusText: "सक्रिय",
                      lastService: repairDateStr,
                      lastServiceDate: new Date().toISOString(),
                      serviceHistory: `${m.serviceHistory || ""}; ${jrvEntry}`,
                    };
                  }
                  return m;
                });
                try { localStorage.setItem("agripulse_machines_v1", JSON.stringify(updatedMachines)); } catch {}
                refreshData();
                setFeedbackMessage(
                  currentLanguage === "en"
                    ? "Job-Ready Verification complete! Record saved to Machine Passport."
                    : "Job-Ready Verification सफल! मशीन पासपोर्ट में रिकॉर्ड सुरक्षित हुआ।"
                );
                setTimeout(() => setFeedbackMessage(null), 4000);
                const freshMachine = updatedMachines.find((m) => m.id === machineId) || machineForJrv;
                if (freshMachine) setSelectedMachine(freshMachine);
                setCurrentScreen("machine_detail");
              }}
              onCallTechnician={() => {
                if (repairForJrv) {
                  const card = getJobCardByRepairId(repairForJrv.id) || currentJobCard;
                  if (card) setCurrentJobCard(card);
                }
                setCurrentScreen("repair_verification");
              }}
              onRetest={() => { /* Component handles internal reset */ }}
            />
          );
        })()}
        {/* ================= 15. DEDICATED “किसान हेल्प” VOICE AI SCREEN ================= */}
        {currentScreen === "kisan_help" && (
          <KisanHelpScreen
            currentLanguage={currentLanguage}
            onBack={() => setCurrentScreen("home")}
          />
        )}

      </main>
      )}

      {/* ================= BOTTOM NAVIGATION ================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 py-1.5 flex justify-center shadow-xs">
        <div className="w-full max-w-md grid grid-cols-4 px-2">
          {/* Home */}
          <button
            onClick={() => setCurrentScreen("home")}
            className={`py-1.5 px-1 flex flex-col items-center justify-center transition-colors cursor-pointer ${
              getActiveTab() === "home"
                ? "text-emerald-700 font-bold"
                : "text-slate-500 font-medium hover:text-slate-700"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[11px] mt-1">{t("nav.home", currentLanguage)}</span>
          </button>

          {/* Machines */}
          <button
            onClick={() => setCurrentScreen("machines")}
            className={`py-1.5 px-1 flex flex-col items-center justify-center transition-colors cursor-pointer ${
              getActiveTab() === "machines"
                ? "text-emerald-700 font-bold"
                : "text-slate-500 font-medium hover:text-slate-700"
            }`}
          >
            <Tractor className="w-5 h-5" />
            <span className="text-[11px] mt-1">{t("nav.machines", currentLanguage)}</span>
          </button>

          {/* Repairs */}
          <button
            onClick={() => setCurrentScreen("repair")}
            className={`py-1.5 px-1 flex flex-col items-center justify-center transition-colors cursor-pointer ${
              getActiveTab() === "repair"
                ? "text-emerald-700 font-bold"
                : "text-slate-500 font-medium hover:text-slate-700"
            }`}
          >
            <Wrench className="w-5 h-5" />
            <span className="text-[11px] mt-1">{t("nav.repairs", currentLanguage)}</span>
          </button>

          {/* Service */}
          <button
            onClick={() => setCurrentScreen("service")}
            className={`py-1.5 px-1 flex flex-col items-center justify-center transition-colors cursor-pointer ${
              getActiveTab() === "service"
                ? "text-emerald-700 font-bold"
                : "text-slate-500 font-medium hover:text-slate-700"
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="text-[11px] mt-1">{t("nav.service", currentLanguage)}</span>
          </button>
        </div>
      </nav>

      {/* 🗣️✨ Voice AI Assistant Modal with 1000 Q&A Knowledge Base */}
      <VoiceHelpAssistant
        isOpen={isVoiceAssistantOpen}
        onClose={() => {
          setIsVoiceAssistantOpen(false);
          setVoiceAssistantStatus("idle");
        }}
        onStatusChange={setVoiceAssistantStatus}
        context={{
          currentPage: currentScreen,
          selectedRole: authSession?.user?.role || "farmer",
          language: currentLanguage,
        }}
        onRequestBreakdown={() => {
          setIsVoiceAssistantOpen(false);
          handleStartBreakdown();
        }}
      />
    </div>
  );
}
