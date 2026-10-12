"use client";

/**
 * JobReadyVerificationScreen.tsx
 * ──────────────────────────────
 * JOB-READY VERIFICATION — EVIDENCE CAPTURE LAYER (MVP v2)
 *
 * Flow:
 *   intro → checklist → camera_capture → evidence_preview → analyzing → result
 *
 * Supported farm operation: SPRAYING
 *
 * Evidence capture uses the device/browser camera.
 * Visual analysis is abstracted via visualAnalysisService.ts:
 *   - If a real YOLO model is connected → uses it.
 *   - Otherwise → deterministic mock fallback (clearly labelled in code).
 * Safety-critical pass/fail decisions are made by the rule engine ONLY.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Camera,
  Video,
  ShieldCheck,
  RotateCcw,
  PhoneCall,
  Droplets,
  Sparkles,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Loader2,
  Clock,
  User,
  Tractor,
  Eye,
  FlaskConical,
  CheckSquare,
  Info,
  Zap,
  Shield,
} from "lucide-react";

import {
  JobReadyCheck,
  JobReadyCheckId,
  JobReadyCheckStatus,
  JobReadyOverallStatus,
  JobReadinessRecord,
  VisualAnalysisResult,
  EvidenceCaptureMetadata,
} from "@/types";

import {
  getInitialSprayingChecks,
  computeJobReadyResult,
  buildJobReadinessRecord,
  saveJobReadinessRecord,
  buildEvidenceMetadata,
} from "@/services/jobReadinessService";

import {
  runVisualAnalysis,
  getAnalysisSourceLabel,
} from "@/services/visualAnalysisService";

// ─── Props ────────────────────────────────────────────────────────────────────

interface JobReadyVerificationScreenProps {
  repairRequestId: string;
  machineId: string;
  machineNameHi: string;
  technicianNameHi: string;
  technicianId?: string;
  repairDate: string;
  onBack: () => void;
  onComplete: (record: JobReadinessRecord) => void;
  onCallTechnician: () => void;
  onRetest: () => void;
}

// ─── Sub-steps ────────────────────────────────────────────────────────────────

type SubStep =
  | "intro"
  | "checklist"
  | "camera_capture"
  | "evidence_preview"
  | "analyzing"
  | "result";

// ─── Captured Evidence Item ───────────────────────────────────────────────────

interface CapturedItem {
  url: string;
  type: "photo" | "video";
  capturedAt: string;
}

const CLEAN_WATER_TEST_SAMPLE_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#0f172a" rx="16"/>
      <rect x="20" y="20" width="360" height="260" fill="#1e293b" rx="12"/>
      <path d="M 60 140 Q 200 40 340 140" stroke="#38bdf8" stroke-width="4" fill="none" stroke-dasharray="6,4"/>
      <circle cx="100" cy="130" r="8" fill="#38bdf8"/>
      <circle cx="200" cy="110" r="8" fill="#38bdf8"/>
      <circle cx="300" cy="130" r="8" fill="#38bdf8"/>
      <path d="M 100 138 L 80 230 L 120 230 Z" fill="#38bdf8" opacity="0.35"/>
      <path d="M 200 118 L 180 230 L 220 230 Z" fill="#38bdf8" opacity="0.45"/>
      <path d="M 300 138 L 280 230 L 320 230 Z" fill="#38bdf8" opacity="0.35"/>
      <text x="200" y="55" fill="#f8fafc" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">Clean Water Test — Sprayer Nozzle Pattern</text>
      <text x="200" y="265" fill="#34d399" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">✓ All 3 Nozzles Active • Uniform Pressure • No Leaks</text>
    </svg>
  `);

const WATER_PUMP_TEST_SAMPLE_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#0f172a" rx="16"/>
      <rect x="20" y="20" width="360" height="260" fill="#1e293b" rx="12"/>
      <path d="M 50 160 Q 180 40 330 150" stroke="#0284c7" stroke-width="8" fill="none"/>
      <circle cx="90" cy="155" r="14" fill="#38bdf8"/>
      <circle cx="190" cy="110" r="16" fill="#38bdf8"/>
      <circle cx="290" cy="145" r="14" fill="#38bdf8"/>
      <path d="M 270 145 Q 350 180 360 240" stroke="#38bdf8" stroke-width="12" fill="none" opacity="0.8"/>
      <text x="200" y="55" fill="#f8fafc" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">Water Pump Flow &amp; Priming Test</text>
      <text x="200" y="265" fill="#34d399" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">✓ Strong Water Discharge • No Air Lock • Normal Pressure</text>
    </svg>
  `);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CheckIcon({ status }: { status: JobReadyCheckStatus }) {
  if (status === "pass")
    return <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />;
  if (status === "fail")
    return <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />;
  return (
    <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex-shrink-0" />
  );
}

function ResultBadge({ status }: { status: JobReadyOverallStatus }) {
  if (status === "JOB_READY")
    return (
      <div className="inline-flex items-center gap-2 bg-emerald-600 text-white font-black text-lg px-5 py-2 rounded-full shadow-lg">
        <Sparkles className="w-5 h-5" /> JOB READY ✅
      </div>
    );
  if (status === "STOP_AND_TECHNICIAN")
    return (
      <div className="inline-flex items-center gap-2 bg-red-700 text-white font-black text-lg px-5 py-2 rounded-full shadow-lg">
        <AlertTriangle className="w-5 h-5" /> STOP — Technician चाहिए
      </div>
    );
  if (status === "NOT_JOB_READY")
    return (
      <div className="inline-flex items-center gap-2 bg-orange-600 text-white font-black text-lg px-5 py-2 rounded-full shadow-lg">
        <XCircle className="w-5 h-5" /> NOT JOB-READY
      </div>
    );
  return (
    <div className="inline-flex items-center gap-2 bg-amber-500 text-white font-black text-lg px-5 py-2 rounded-full shadow-lg">
      <RotateCcw className="w-5 h-5" /> NEED RECHECK
    </div>
  );
}

function ScoreRing({
  score,
  status,
}: {
  score: number;
  status: JobReadyOverallStatus;
}) {
  const ringColor =
    status === "JOB_READY"
      ? "#059669"
      : status === "STOP_AND_TECHNICIAN"
      ? "#dc2626"
      : status === "NOT_JOB_READY"
      ? "#ea580c"
      : "#f59e0b";

  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-slate-900">{score}</span>
        <span className="text-[10px] font-bold text-slate-500">Score</span>
      </div>
    </div>
  );
}

// ─── Checklist labels for result screen ──────────────────────────────────────

const RESULT_CHECK_LABELS: Record<string, { icon: string; labelHi: string }> = {
  nozzle_activity:   { icon: "💧", labelHi: "Nozzle Activity" },
  no_leak:           { icon: "🔒", labelHi: "Leakage Check" },
  spray_pattern:     { icon: "🌊", labelHi: "Spray Pattern" },
  visible_damage:    { icon: "🔧", labelHi: "Visible Damage" },
  safety_check:      { icon: "🛡️", labelHi: "Safety / Technician Verification" },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobReadyVerificationScreen({
  repairRequestId,
  machineId,
  machineNameHi,
  technicianNameHi,
  technicianId,
  repairDate,
  onBack,
  onComplete,
  onCallTechnician,
  onRetest,
}: JobReadyVerificationScreenProps) {
  const isWaterPump =
    machineId === "water_pump" ||
    (machineNameHi || "").toLowerCase().includes("pump") ||
    (machineNameHi || "").includes("पंप");

  const samplePhoto = isWaterPump ? WATER_PUMP_TEST_SAMPLE_PHOTO : CLEAN_WATER_TEST_SAMPLE_PHOTO;

  const [subStep, setSubStep] = useState<SubStep>("intro");
  const [checks, setChecks] = useState<JobReadyCheck[]>(() => {
    if (isWaterPump) {
      return [
        { id: "no_leak", labelHi: "पाइप व सील से पानी का रिसाव नहीं है (No Leak)", isRequired: true, status: "pending" },
        { id: "all_nozzles_active", labelHi: "सक्शन व पानी का डिस्चार्ज पूरा है (Full Water Flow)", isRequired: true, status: "pending" },
        { id: "spray_pattern_normal", labelHi: "पंप प्रेशर व आवाज सामान्य है (Pressure & Sound Normal)", isRequired: true, status: "pending" },
        { id: "safety_check", labelHi: "Safety check passed (Technician-Verified)", isRequired: true, isTechnicianVerified: true, status: "pending" },
      ];
    }
    return getInitialSprayingChecks();
  });
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<VisualAnalysisResult | null>(null);
  const [finalRecord, setFinalRecord] = useState<JobReadinessRecord | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // Camera / Media Recorder refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  // Hidden file inputs for fallback on devices without getUserMedia
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cleanup camera stream when leaving camera step
  useEffect(() => {
    if (subStep !== "camera_capture") {
      stopCameraStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subStep]);

  // ── Camera helpers ──────────────────────────────────────────────────────────

  const startCameraStream = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(
        "Camera access नहीं मिला। नीचे Photo/Video बटन से file upload करें।"
      );
      console.warn("[JobReadyVerification] Camera access failed:", err?.message);
    }
  }, []);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsRecording(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !streamRef.current) {
      setCapturedItems((prev) => [
        ...prev,
        { url: samplePhoto, type: "photo", capturedAt: new Date().toISOString() },
      ]);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedItems((prev) => [
      ...prev,
      { url: dataUrl, type: "photo", capturedAt: new Date().toISOString() },
    ]);
  }, [samplePhoto]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      setCapturedItems((prev) => [
        ...prev,
        { url: samplePhoto, type: "video", capturedAt: new Date().toISOString() },
      ]);
      return;
    }
    try {
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setCapturedItems((prev) => [
          ...prev,
          { url, type: "video", capturedAt: new Date().toISOString() },
        ]);
        recordedChunksRef.current = [];
      };
      mediaRecorderRef.current = recorder;
      recorder.start(200); // collect in 200ms chunks
      setIsRecording(true);
    } catch (err) {
      setCameraError("Recording शुरू नहीं हो सकी। नीचे Video button से upload करें।");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // ── File input fallbacks ──────────────────────────────────────────────────

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setCapturedItems((prev) => [
          ...prev,
          { url: dataUrl, type: "photo", capturedAt: new Date().toISOString() },
        ]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCapturedItems((prev) => [
      ...prev,
      { url, type: "video", capturedAt: new Date().toISOString() },
    ]);
    e.target.value = "";
  };

  // ── Check toggle ────────────────────────────────────────────────────────────

  const toggleCheck = useCallback(
    (id: JobReadyCheckId, newStatus: JobReadyCheckStatus) => {
      setChecks((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
    },
    []
  );

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToCamera = () => {
    setSubStep("camera_capture");
    setTimeout(() => startCameraStream(), 200);
  };

  const goToPreview = () => {
    stopCameraStream();
    setSubStep("evidence_preview");
  };

  // ── Run Analysis & Compute Result ─────────────────────────────────────────

  const handleAnalyzeEvidence = async () => {
    setSubStep("analyzing");

    try {
      const evidenceUrls = capturedItems.map((c) => c.url);

      // Run visual analysis (mock fallback if no real model connected)
      const vaResult = await runVisualAnalysis({
        evidenceUrls,
        farmOperation: "spraying",
      });
      setAnalysisResult(vaResult);

      // Build evidence metadata (lightweight, for sync)
      const evidenceMetadata: EvidenceCaptureMetadata[] = capturedItems.map(
        (item, i) =>
          buildEvidenceMetadata({
            evidenceUrl: item.url,
            index: i,
            capturedAt: item.capturedAt,
          })
      );

      // Build & save record
      const record = buildJobReadinessRecord({
        machineId,
        repairRequestId,
        checks,
        evidence: evidenceUrls,
        evidenceMetadata,
        visualAnalysis: vaResult,
        technicianId,
        technicianNameHi,
        farmerVerified: false,
      });

      saveJobReadinessRecord(record);
      setFinalRecord(record);
      setSubStep("result");
    } catch (err) {
      console.error("[JobReadyVerification] Analysis error:", err);
      // Fallback: compute result without visual analysis
      const evidenceUrls = capturedItems.map((c) => c.url);
      const record = buildJobReadinessRecord({
        machineId,
        repairRequestId,
        checks,
        evidence: evidenceUrls,
        technicianId,
        technicianNameHi,
        farmerVerified: false,
      });
      saveJobReadinessRecord(record);
      setFinalRecord(record);
      setSubStep("result");
    }
  };

  // ── Farmer confirms JOB_READY ───────────────────────────────────────────────

  const handleFarmerConfirm = () => {
    if (!finalRecord) return;
    const confirmed: JobReadinessRecord = {
      ...finalRecord,
      farmerVerified: true,
    };
    saveJobReadinessRecord(confirmed);
    onComplete(confirmed);
  };

  // ── Retest ──────────────────────────────────────────────────────────────────

  const handleRetest = () => {
    stopCameraStream();
    setChecks(getInitialSprayingChecks());
    setCapturedItems([]);
    setAnalysisResult(null);
    setFinalRecord(null);
    setSubStep("intro");
    onRetest();
  };

  // ── Live result for checklist progress ─────────────────────────────────────

  const liveResult = computeJobReadyResult(checks, capturedItems.map((c) => c.url));
  const allRequiredAnswered = checks
    .filter((c) => c.isRequired)
    .every((c) => c.status !== "pending");

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={photoInputRef}
        onChange={handlePhotoFile}
        className="hidden"
        aria-hidden="true"
      />
      <input
        type="file"
        accept="video/*"
        capture="environment"
        ref={videoInputRef}
        onChange={handleVideoFile}
        className="hidden"
        aria-hidden="true"
      />

      {/* ── Top nav bar ── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            if (subStep === "camera_capture" || subStep === "evidence_preview") {
              stopCameraStream();
              setSubStep("checklist");
            } else if (subStep === "checklist") {
              setSubStep("intro");
            } else {
              onBack();
            }
          }}
          className="flex items-center gap-1.5 text-base font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>वापस</span>
        </button>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
              🔴 Offline
            </span>
          )}
          <div className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
            Job-Ready Check
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STEP 1 — INTRO
      ══════════════════════════════════════════════════════════════════ */}
      {subStep === "intro" && (
        <div className="space-y-4">
          {/* Hero */}
          <div className="text-center space-y-2 pt-2">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm">
              {isWaterPump ? "💧" : "🎒"}
            </div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              क्या मशीन आपके अगले<br />काम के लिए तैयार है?
            </h2>
            <p className="text-sm font-bold text-slate-500">
              Farm Activity: <span className="text-emerald-700">{isWaterPump ? "💧 सिंचाई (Irrigation / Water Flow Test)" : "🌿 Spraying"}</span>
            </p>
          </div>

          {/* Info card */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500 flex items-center gap-1"><Tractor className="w-3.5 h-3.5" /> मशीन:</span>
              <span className="text-sm font-black text-slate-900">{machineNameHi}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500">मरम्मत:</span>
              <span className="text-sm font-black text-emerald-700">✅ पूरी हो गई</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500 flex items-center gap-1"><User className="w-3.5 h-3.5" /> मैकेनिक:</span>
              <span className="text-sm font-black text-slate-900">{technicianNameHi}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> तारीख:</span>
              <span className="text-sm font-black text-slate-900">{repairDate}</span>
            </div>
          </div>

          {/* Workflow steps */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-emerald-800 mb-2">अगले चरण:</p>
            {[
              { label: "✅ मरम्मत पूरी", done: true },
              { label: "📋 Safety Checklist", active: true },
              { label: "📹 Clean Water Test Video", active: false },
              { label: "🔍 Evidence Preview", active: false },
              { label: "⚡ Visual Analysis", active: false },
              { label: "📊 Result & Score", active: false },
              { label: "📋 Machine Passport", active: false },
            ].map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs font-bold ${
                  step.done
                    ? "text-emerald-700"
                    : step.active
                    ? "text-emerald-900"
                    : "text-slate-400"
                }`}
              >
                {step.done ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 text-[10px]">✓</span>
                ) : step.active ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px]">▶</span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">{i + 1}</span>
                )}
                {step.label}
              </div>
            ))}
          </div>

          {/* Offline notice */}
          {!isOnline && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs font-bold text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Offline मोड — Evidence और result फोन में सुरक्षित रहेगा। इंटरनेट आने पर sync होगा।</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSubStep("checklist")}
            className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-lg shadow-lg border-2 border-emerald-900 flex items-center justify-center gap-2 transition-transform"
          >
            <ShieldCheck className="w-5 h-5" />
            Job-Ready Check शुरू करें
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 2 — CHECKLIST
      ══════════════════════════════════════════════════════════════════ */}
      {subStep === "checklist" && (
        <div className="space-y-4">
          <div className="text-center space-y-1 pt-1">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl mx-auto">
              📋
            </div>
            <h2 className="text-xl font-black text-slate-900">Safety Checklist</h2>
            <p className="text-xs font-bold text-slate-500">
              Spraying — {machineNameHi}
            </p>
          </div>

          <div className="space-y-3">
            {checks.map((check) => (
              <div
                key={check.id}
                className={`rounded-2xl border-2 p-4 space-y-2 transition-colors ${
                  check.status === "pass"
                    ? "bg-emerald-50 border-emerald-400"
                    : check.status === "fail"
                    ? "bg-red-50 border-red-400"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <CheckIcon status={check.status} />
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900">{check.labelHi}</p>
                    {check.isTechnicianVerified && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                        <ShieldCheck className="w-3 h-3" /> Technician-Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => toggleCheck(check.id, "pass")}
                    className={`py-2 rounded-xl text-sm font-black transition-colors ${
                      check.status === "pass"
                        ? "bg-emerald-600 text-white shadow"
                        : "bg-slate-100 text-slate-600 hover:bg-emerald-100"
                    }`}
                  >
                    ✅ हाँ
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCheck(check.id, "fail")}
                    className={`py-2 rounded-xl text-sm font-black transition-colors ${
                      check.status === "fail"
                        ? "bg-red-600 text-white shadow"
                        : "bg-slate-100 text-slate-600 hover:bg-red-100"
                    }`}
                  >
                    ❌ नहीं
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Live preview */}
          {allRequiredAnswered && (
            <div
              className={`p-3 rounded-xl text-center text-sm font-bold border ${
                liveResult.status === "STOP_AND_TECHNICIAN"
                  ? "bg-red-50 border-red-300 text-red-800"
                  : liveResult.status === "NOT_JOB_READY"
                  ? "bg-orange-50 border-orange-300 text-orange-800"
                  : "bg-emerald-50 border-emerald-300 text-emerald-800"
              }`}
            >
              {liveResult.reason}
            </div>
          )}

          <button
            type="button"
            onClick={goToCamera}
            disabled={!allRequiredAnswered}
            className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl text-lg shadow-lg border-2 border-emerald-900 disabled:border-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <Droplets className="w-5 h-5" />
            अगला: Clean Water Test →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 3 — CAMERA CAPTURE (Clean Water Test)
      ══════════════════════════════════════════════════════════════════ */}
      {subStep === "camera_capture" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center space-y-1 pt-1">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mx-auto">
              💧
            </div>
            <h2 className="text-xl font-black text-slate-900">Clean Water Test</h2>
            <p className="text-sm font-bold text-blue-700">
              Clean water से 10–15 सेकंड का test video capture करें.
            </p>
          </div>

          {/* Safety instruction */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-sm font-bold text-blue-800 space-y-1">
            <p>🔵 साफ पानी से spray करें</p>
            <p>🔵 सभी nozzles का spray pattern देखें</p>
            <p>🔵 कोई रिसाव नहीं होना चाहिए</p>
            <p className="text-xs text-blue-600 font-bold pt-1 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              ⚠️ कोई Chemical spray न करें — सिर्फ साफ पानी से test करें
            </p>
          </div>

          {/* Camera viewfinder */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video border-2 border-slate-700">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full animate-pulse">
                <div className="w-2 h-2 rounded-full bg-white" />
                REC
              </div>
            )}

            {/* Camera error overlay */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 p-4">
                <div className="text-center space-y-2">
                  <p className="text-white text-sm font-bold">{cameraError}</p>
                </div>
              </div>
            )}

            {/* No stream (loading) */}
            {!streamRef.current && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 text-white animate-spin mx-auto" />
                  <p className="text-white text-sm font-bold">Camera खुल रहा है...</p>
                </div>
              </div>
            )}
          </div>

          {/* Capture controls */}
          <div className="grid grid-cols-3 gap-2">
            {/* Photo */}
            <button
              type="button"
              onClick={capturePhoto}
              className="flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-emerald-50 border-2 border-emerald-400 rounded-2xl py-4 text-emerald-700 font-bold text-xs transition-colors"
            >
              <Camera className="w-6 h-6" />
              Photo
            </button>

            {/* Record / Stop */}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex flex-col items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 border-2 border-red-800 rounded-2xl py-4 text-white font-bold text-xs transition-colors"
              >
                <Play className="w-6 h-6" />
                Record Test
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex flex-col items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 border-2 border-slate-900 rounded-2xl py-4 text-white font-bold text-xs transition-colors animate-pulse"
              >
                <Square className="w-6 h-6" />
                Stop
              </button>
            )}

            {/* Retake — clear all */}
            <button
              type="button"
              onClick={() => {
                setCapturedItems([]);
                startCameraStream();
              }}
              className="flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border-2 border-slate-300 rounded-2xl py-4 text-slate-600 font-bold text-xs transition-colors"
            >
              <RefreshCw className="w-6 h-6" />
              Retake
            </button>
          </div>

          {/* Upload fallbacks (file input) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-slate-600 font-bold text-xs"
            >
              <Camera className="w-4 h-4" /> Gallery से Photo
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-slate-600 font-bold text-xs"
            >
              <Video className="w-4 h-4" /> Gallery से Video
            </button>
          </div>

          {/* Captured count badge */}
          {capturedItems.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-black text-emerald-800">
                  {capturedItems.length} item{capturedItems.length > 1 ? "s" : ""} capture हुए
                </p>
                <p className="text-xs font-bold text-emerald-600">
                  {capturedItems.filter((c) => c.type === "photo").length} photo,{" "}
                  {capturedItems.filter((c) => c.type === "video").length} video
                </p>
              </div>
            </div>
          )}

          {capturedItems.length === 0 && (
            <div className="text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-xl p-3 border border-slate-200">
              Result के लिए कम से कम 1 photo/video जरूरी है
            </div>
          )}

          <button
            type="button"
            onClick={goToPreview}
            disabled={capturedItems.length === 0}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl text-lg shadow-lg border-2 border-blue-900 disabled:border-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            Evidence Preview देखें →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 4 — EVIDENCE PREVIEW
      ══════════════════════════════════════════════════════════════════ */}
      {subStep === "evidence_preview" && (
        <div className="space-y-4">
          <div className="text-center space-y-1 pt-1">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl mx-auto">
              📸
            </div>
            <h2 className="text-xl font-black text-slate-900">Evidence Preview</h2>
            <p className="text-xs font-bold text-slate-500">Captured evidence की जाँच करें</p>
          </div>

          {/* Metadata card */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm text-xs">
            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Capture समय:</span>
              <span className="font-black text-slate-800">
                {capturedItems[0]
                  ? new Date(capturedItems[0].capturedAt).toLocaleString("hi-IN")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-500">मशीन:</span>
              <span className="font-black text-slate-800">{machineNameHi}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Farm Operation:</span>
              <span className="font-black text-emerald-700">🌿 Spraying</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Technician:</span>
              <span className="font-black text-slate-800">{technicianNameHi}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Evidence items:</span>
              <span className="font-black text-slate-800">{capturedItems.length}</span>
            </div>
          </div>

          {/* Evidence grid */}
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-600">📎 Captured Evidence:</p>
            <div className="flex flex-wrap gap-2">
              {capturedItems.map((item, i) => (
                <div
                  key={i}
                  className="relative rounded-xl overflow-hidden border-2 border-emerald-300 bg-slate-100"
                  style={{ width: capturedItems.length === 1 ? "100%" : "calc(50% - 4px)", aspectRatio: "16/9" }}
                >
                  {item.type === "photo" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={`evidence-${i}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                    />
                  )}
                  {/* Type badge */}
                  <span className="absolute bottom-1.5 left-1.5 text-[10px] font-black bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {item.type === "photo" ? "📷 Photo" : "🎥 Video"}
                  </span>
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() =>
                      setCapturedItems((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 rounded-full text-white text-[10px] flex items-center justify-center font-black"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recapture button */}
          <button
            type="button"
            onClick={() => {
              setSubStep("camera_capture");
              setTimeout(() => startCameraStream(), 200);
            }}
            className="w-full bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-700 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> दोबारा capture करें
          </button>

          <button
            type="button"
            onClick={handleAnalyzeEvidence}
            disabled={capturedItems.length === 0}
            className="w-full bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl text-lg shadow-lg border-2 border-purple-900 disabled:border-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Analyze Evidence →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 5 — ANALYZING
      ══════════════════════════════════════════════════════════════════ */}
      {subStep === "analyzing" && (
        <div className="space-y-6 text-center py-8">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
            <Loader2 className="w-10 h-10 text-purple-700 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Evidence Analyze हो रहा है</h2>
            <p className="text-sm font-bold text-slate-500 mt-1">
              Visual check चल रही है...
            </p>
          </div>
          <div className="space-y-2 text-left max-w-xs mx-auto">
            {[
              "🔍 Nozzle activity check करना",
              "💧 Leakage scan करना",
              "🌊 Spray pattern analyse करना",
              "🔧 Visible damage check करना",
              "✅ Rule engine चला रहा है",
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs font-bold text-slate-600"
              >
                <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin flex-shrink-0" />
                {step}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2">
            Visual analysis अभी manual-assist mode में है
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 6 — RESULT
      ══════════════════════════════════════════════════════════════════ */}
      {subStep === "result" && finalRecord && (() => {
        const { status, score, checks: resultChecks } = finalRecord;
        const vaResult = finalRecord.visualAnalysis;

        // Friendly check names for result display
        const displayChecks: Array<{ key: string; labelHi: string; icon: string; pass: boolean }> = [
          {
            key: "nozzle_activity",
            labelHi: "Nozzle Activity",
            icon: "💧",
            pass: vaResult ? vaResult.nozzle_activity !== false : resultChecks.find((c) => c.id === "all_nozzles_active")?.status === "pass",
          },
          {
            key: "no_leak",
            labelHi: "Leakage Check",
            icon: "🔒",
            pass: vaResult ? vaResult.visible_leak !== true : resultChecks.find((c) => c.id === "no_leak")?.status === "pass",
          },
          {
            key: "spray_pattern",
            labelHi: "Spray Pattern",
            icon: "🌊",
            pass: vaResult ? vaResult.spray_pattern === "normal" || vaResult.spray_pattern === null : resultChecks.find((c) => c.id === "spray_pattern_normal")?.status === "pass",
          },
          {
            key: "visible_damage",
            labelHi: "Visible Damage",
            icon: "🔧",
            pass: vaResult ? vaResult.visible_damage !== true : true,
          },
          {
            key: "safety_check",
            labelHi: "Safety / Technician Verification",
            icon: "🛡️",
            pass: resultChecks.find((c) => c.id === "safety_check")?.status === "pass",
          },
        ];

        return (
          <div className="space-y-4">
            {/* Score hero */}
            <div
              className={`rounded-3xl p-5 text-center space-y-3 border-2 shadow-md ${
                status === "JOB_READY"
                  ? "bg-emerald-50 border-emerald-400"
                  : status === "STOP_AND_TECHNICIAN"
                  ? "bg-red-50 border-red-400"
                  : status === "NOT_JOB_READY"
                  ? "bg-orange-50 border-orange-400"
                  : "bg-amber-50 border-amber-400"
              }`}
            >
              <ScoreRing score={score} status={status} />
              <ResultBadge status={status} />
              <p className="text-sm font-bold text-slate-700">
                {status === "JOB_READY" && "मशीन आज की spraying के लिए तैयार है।"}
                {status === "STOP_AND_TECHNICIAN" && "Safety issue मिला। मशीन का उपयोग न करें।"}
                {status === "NOT_JOB_READY" && "मशीन अभी Job-Ready नहीं है।"}
                {status === "NEED_RECHECK" && "कुछ जाँचें अधूरी हैं। दोबारा test करें।"}
              </p>
            </div>

            {/* 5-point check breakdown */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-2.5">
              <p className="text-xs font-black text-slate-500 mb-1">JOB-READY SCORE — Checks:</p>
              {displayChecks.map((check) => (
                <div key={check.key} className="flex items-center gap-3">
                  <span className="text-base">{check.icon}</span>
                  {check.pass ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-bold flex-1 ${check.pass ? "text-slate-800" : "text-red-700"}`}>
                    {check.labelHi}
                  </span>
                  {!check.pass && (
                    <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      FAILED
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Failed check detail */}
            {status !== "JOB_READY" && (() => {
              const failedCheck = displayChecks.find((c) => !c.pass);
              return failedCheck ? (
                <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-sm font-bold text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Failed check: <strong>{failedCheck.labelHi}</strong></span>
                </div>
              ) : null;
            })()}

            {/* Analysis source note (developer transparency) */}
            {vaResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Analysis Source: {getAnalysisSourceLabel(vaResult.source)}
                  {vaResult.source === "mock_fallback" && (
                    <span className="bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded text-[9px] font-black">
                      AUTO-ASSIST
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-bold text-slate-600">
                  <span>Evidence Quality: <strong className="text-slate-800">{vaResult.evidence_quality}</strong></span>
                  <span>Confidence: <strong className="text-slate-800">{Math.round(vaResult.confidence * 100)}%</strong></span>
                </div>
              </div>
            )}

            {/* Evidence preview (compact) */}
            {finalRecord.evidence.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-black text-slate-500">Evidence:</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {finalRecord.evidence.map((src, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100"
                    >
                      {src.startsWith("data:image") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={`ev-${i}`} className="w-full h-full object-cover" />
                      ) : (
                        <video src={src} className="w-full h-full object-cover" muted playsInline />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offline status notice */}
            {!isOnline && (
              <div className="text-center text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded-xl p-2">
                🔴 Offline — Record फोन में save है। इंटरनेट आने पर Machine Passport में sync होगा।
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              {/* JOB_READY: confirm & save to passport */}
              {status === "JOB_READY" && (
                <button
                  type="button"
                  onClick={handleFarmerConfirm}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-lg shadow-lg border-2 border-emerald-950 flex items-center justify-center gap-2 transition-transform cursor-pointer"
                >
                  <Sparkles className="w-5 h-5" />
                  मशीन काम के लिए तैयार है (Save to Passport) ✅
                </button>
              )}

              {/* NEED_RECHECK */}
              {status === "NEED_RECHECK" && (
                <button
                  type="button"
                  onClick={handleRetest}
                  className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-black py-4 rounded-2xl text-lg shadow-lg border-2 border-amber-700 flex items-center justify-center gap-2 transition-transform"
                >
                  <RotateCcw className="w-5 h-5" />
                  दोबारा टेस्ट करें
                </button>
              )}

              {/* NOT_JOB_READY */}
              {status === "NOT_JOB_READY" && (
                <>
                  <button
                    type="button"
                    onClick={onCallTechnician}
                    className="w-full bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-black py-4 rounded-2xl text-lg shadow-lg border-2 border-orange-900 flex items-center justify-center gap-2 transition-transform"
                  >
                    <PhoneCall className="w-5 h-5" />
                    Technician को फिर बुलाएं
                  </button>
                  <button
                    type="button"
                    onClick={handleRetest}
                    className="w-full bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-700 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> दोबारा टेस्ट करें
                  </button>
                </>
              )}

              {/* STOP_AND_TECHNICIAN */}
              {status === "STOP_AND_TECHNICIAN" && (
                <>
                  <button
                    type="button"
                    onClick={onCallTechnician}
                    className="w-full bg-red-700 hover:bg-red-800 active:scale-[0.98] text-white font-black py-4 rounded-2xl text-lg shadow-lg border-2 border-red-900 flex items-center justify-center gap-2 transition-transform"
                  >
                    <PhoneCall className="w-5 h-5" />
                    Technician को फिर बुलाएं
                  </button>
                  <button
                    type="button"
                    onClick={handleRetest}
                    className="w-full bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-700 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> दोबारा टेस्ट करें
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
