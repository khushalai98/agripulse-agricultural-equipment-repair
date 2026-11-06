"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench,
  ClipboardList,
  CheckCircle2,
  Navigation,
  MapPin,
  Camera,
  ShieldAlert,
  Award,
  DollarSign,
  Phone,
  Clock,
  ChevronRight,
  AlertCircle,
  Plus,
  Star,
  Check,
  X,
  Sparkles,
  ArrowLeft,
  UserCheck,
  Send,
  Info,
  Home,
  User,
} from "lucide-react";
import TechnicianProfileScreen from "./TechnicianProfileScreen";
import {
  JobCard,
  RepairRequest,
  PartSelection,
  TechnicianWorkflowStatus,
  PriceChangeReason,
  PricingBreakdown,
  TECHNICIAN_STATUS_LABELS_HI,
} from "@/types";
import { AuthSession } from "@/services/authService";
import {
  getJobCardByRepairId,
  getLatestJobCard,
  createJobCard,
  updateTechnicianWorkflowStatus,
  updatePartSelection,
  updateJobCardPricing,
} from "@/services/jobCardService";
import {
  calculateEstimatedPricing,
  calculatePartsCost,
  formatCurrencyHi,
  PRICE_CHANGE_REASONS,
} from "@/services/pricingService";
import { calculateTechnicianSettlement } from "@/services/businessModelService";
import {
  updateRepairStatus,
  ensureSimulatedDemoRequest,
  createSimulatedDemoRepair,
  seedRameshPatilDemoRepair,
} from "@/services/storageService";
import { getSparePartById, SparePart } from "@/services/sparePartData";
import { haversineDistanceKm } from "@/services/locationService";
import { LanguageCode } from "@/i18n";
import {
  pushTechnicianHistory,
  replaceTechnicianHistory,
  getTechnicianHistoryDepth,
  getTechnicianParentView,
  hasOpenModals,
  closeTopModal,
  registerOpenModal,
} from "@/services/navigationHistory";

interface TechnicianDashboardProps {
  session: AuthSession;
  repairs: RepairRequest[];
  currentLanguage: LanguageCode;
  onRefreshData: () => void;
  onLogout: () => void;
}

export default function TechnicianDashboard({
  session,
  repairs,
  currentLanguage,
  onRefreshData,
  onLogout,
}: TechnicianDashboardProps) {
  // Navigation tabs within Technician Interface
  const [activeTab, setActiveTab] = useState<"home" | "requests" | "repairs" | "profile">("home");
  const [repairsSubTab, setRepairsSubTab] = useState<"active" | "completed">("active");
  const [contactedRepairs, setContactedRepairs] = useState<Record<string, boolean>>({});
  const [completingRepairId, setCompletingRepairId] = useState<string | null>(null);

  // Selected active job card for deep inspection
  const [selectedJobCardId, setSelectedJobCardId] = useState<string | null>(null);

  // Availability toggle
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  // Price adjustment state
  const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);
  const [techLabourFeeOverride, setTechLabourFeeOverride] = useState<number | null>(null);
  const [priceAdjustmentReason, setPriceAdjustmentReason] = useState<PriceChangeReason>("अतिरिक्त पार्ट खराब मिला");
  const [customPriceNote, setCustomPriceNote] = useState<string>("");

  // Skills list state
  const [skills, setSkills] = useState<string[]>(
    session.user.skills && session.user.skills.length > 0
      ? session.user.skills
      : ["Tractor", "Mechanical", "Engine", "Hydraulic"]
  );
  const [newSkillInput, setNewSkillInput] = useState<string>("");
  const [showAddSkill, setShowAddSkill] = useState<boolean>(false);

  // Helper to compute live distance text from stored technician coordinates
  const getTechnicianDistanceText = (req: RepairRequest) => {
    if (req.farmerLocation?.latitude && req.farmerLocation?.longitude) {
      const techLat = session.user.location?.latitude || (session.user as any).latitude;
      const techLng = session.user.location?.longitude || (session.user as any).longitude;
      if (techLat && techLng) {
        const dist = haversineDistanceKm(techLat, techLng, req.farmerLocation.latitude, req.farmerLocation.longitude);
        return `${dist.toFixed(1)} किमी दूर`;
      }
    }
    return req.approxDistanceText || "3.2 किमी दूर";
  };

  // Filter incoming repair requests relevant to this technician:
  // 1. Matches technician's skills / equipment categories OR was assigned to/recommended for this technician
  // 2. Not rejected by this technician
  // 3. Status is waiting for mechanic
  const incomingRepairs = repairs.filter((r) => {
    if (r.status === "completed") return false;
    if (r.technicianId && r.technicianId !== session.user.id) return false;
    if (r.rejectionReason === `rejected_by_${session.user.id}`) return false;

    const isPendingAssignment =
      r.status === "finding_mechanic" || r.status === "reported" || !r.technicianId;
    if (!isPendingAssignment) return false;

    // Direct assignment / targeted match
    if (r.technicianId === session.user.id || (r as any).targetTechnicianId === session.user.id) {
      return true;
    }

    // Equipment & skill match against technician's profile
    const techSkills = (session.user.skills && session.user.skills.length > 0)
      ? session.user.skills
      : skills;

    const machineStr = (r.machineNameHi || r.machineId || "").toLowerCase();
    const problemDesc = (r.problemDescription || "").toLowerCase();
    const diagDesc = (r.diagnosis?.possibleProblem || "").toLowerCase();

    return techSkills.some((s) => {
      const sLower = s.toLowerCase();
      if (sLower === "tractor" || sLower === "ट्रैक्टर") {
        return machineStr.includes("tractor") || machineStr.includes("ट्रैक्टर");
      }
      if (sLower === "sprayer" || sLower === "स्प्रेयर") {
        return machineStr.includes("sprayer") || machineStr.includes("स्प्रेयर");
      }
      if (sLower === "power tiller" || sLower === "पावर टिलर" || sLower === "tiller") {
        return machineStr.includes("tiller") || machineStr.includes("टिलर");
      }
      if (sLower === "water pump" || sLower === "वाटर पंप" || sLower === "pump") {
        return machineStr.includes("pump") || machineStr.includes("पंप");
      }
      if (sLower === "engine" || sLower === "इंजन") {
        return (
          problemDesc.includes("engine") ||
          problemDesc.includes("इंजन") ||
          problemDesc.includes("start") ||
          problemDesc.includes("स्टार्ट") ||
          diagDesc.includes("engine") ||
          diagDesc.includes("start")
        );
      }
      if (sLower === "electrical" || sLower === "इलेक्ट्रिकल") {
        return (
          problemDesc.includes("motor") ||
          problemDesc.includes("मोटर") ||
          problemDesc.includes("wiring") ||
          problemDesc.includes("बैटरी") ||
          diagDesc.includes("electrical")
        );
      }
      if (sLower === "hydraulic" || sLower === "हाइड्रोलिक") {
        return (
          problemDesc.includes("hydraulic") ||
          problemDesc.includes("हाइड्रोलिक") ||
          diagDesc.includes("hydraulic")
        );
      }
      return false;
    });
  });

  // Filter active ongoing repairs assigned to this technician
  const activeRepairs = repairs.filter(
    (r) =>
      r.status !== "completed" &&
      (r.technicianId === session.user.id || (r.status !== "finding_mechanic" && r.status !== "reported" && r.technicianId))
  );

  const completedRepairs = repairs.filter((r) => r.status === "completed" || r.status === "verification_pending");
  const assignedRepairs = activeRepairs;

  // Realistic technician workflow modal states
  const [viewingRequest, setViewingRequest] = useState<RepairRequest | null>(null);
  const [isConfirmingAccept, setIsConfirmingAccept] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>("काम उपलब्ध नहीं");
  const [customRejectReason, setCustomRejectReason] = useState<string>("");

  // Parts & Tools Requirement Wizard
  const [isPartsToolsWizardOpen, setIsPartsToolsWizardOpen] = useState<boolean>(false);
  const [acceptedRepair, setAcceptedRepair] = useState<RepairRequest | null>(null);
  const [includeSpareParts, setIncludeSpareParts] = useState<boolean>(true);
  const [includeTools, setIncludeTools] = useState<boolean>(true);
  const [needFarmerInfo, setNeedFarmerInfo] = useState<boolean>(false);
  const [selectedPartsList, setSelectedPartsList] = useState<string[]>(["Starter", "Battery"]);
  const [customPartInput, setCustomPartInput] = useState<string>("");
  const [selectedToolsList, setSelectedToolsList] = useState<string[]>(["मल्टीमीटर", "रिंच सेट"]);
  const [technicianMessageToFarmer, setTechnicianMessageToFarmer] = useState<string>("");

  // Trip confirmation state
  const [isTripConfirmationOpen, setIsTripConfirmationOpen] = useState<boolean>(false);

  // Complete repair modal state
  const [isCompletingModalOpen, setIsCompletingModalOpen] = useState<boolean>(false);
  const [completionNotes, setCompletionNotes] = useState<string>("स्टार्टर रिले व बैटरी कनेक्शन दुरुस्त किए गए। मशीन सुचारू रूप से स्टार्ट हो रही है।");
  const [completionLabourFee, setCompletionLabourFee] = useState<number>(450);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Flag to avoid duplicate history pushes when popstate is handling back navigation
  const isPoppingTechRef = React.useRef<boolean>(false);

  // Initialize and register popstate for Technician navigation history (Strict Role Isolation)
  useEffect(() => {
    if (typeof window !== "undefined") {
      replaceTechnicianHistory({
        role: "technician",
        activeTab: "home",
        repairsSubTab,
      });
    }

    const handlePopState = (e: PopStateEvent) => {
      if (!e.state || e.state.role !== "technician") {
        return;
      }

      isPoppingTechRef.current = true;

      // Close open sub-modals
      setIsRejecting(false);
      setIsConfirmingAccept(false);
      setIsTripConfirmationOpen(false);
      setIsCompletingModalOpen(false);
      setIsPartsToolsWizardOpen(false);
      setShowAddSkill(false);
      setIsEditingPrice(false);
      setCompletingRepairId(null);

      // Restore activeTab
      if (e.state.activeTab) {
        setActiveTab(e.state.activeTab);
      }
      if (e.state.repairsSubTab) {
        setRepairsSubTab(e.state.repairsSubTab);
      }

      // Restore selectedJobCardId
      setSelectedJobCardId(e.state.selectedJobCardId || null);

      // Restore viewingRequest
      if (e.state.viewingRequestId) {
        const found = repairs.find((r) => r.id === e.state.viewingRequestId);
        setViewingRequest(found || null);
      } else {
        setViewingRequest(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [repairs]);

  // Tab switcher with history integration
  const switchTab = React.useCallback((tab: "home" | "requests" | "repairs" | "profile") => {
    setActiveTab(tab);
    setSelectedJobCardId(null);
    if (!isPoppingTechRef.current) {
      pushTechnicianHistory({
        role: "technician",
        activeTab: tab,
        repairsSubTab,
      });
    }
    isPoppingTechRef.current = false;
  }, [repairsSubTab]);

  // Open Request Details modal with history integration
  const handleOpenRequestDetails = React.useCallback((req: RepairRequest) => {
    setViewingRequest(req);
    registerOpenModal("tech_viewing_request", () => setViewingRequest(null));
    pushTechnicianHistory({
      role: "technician",
      activeTab,
      repairsSubTab,
      viewingRequestId: req.id,
    });
  }, [activeTab, repairsSubTab]);

  // Open Digital Job Card with history integration
  const handleOpenJobCard = React.useCallback((jobCardId: string, fromView?: "viewing_request" | "repairs") => {
    setSelectedJobCardId(jobCardId);
    pushTechnicianHistory({
      role: "technician",
      activeTab: "repairs",
      repairsSubTab: "active",
      selectedJobCardId: jobCardId,
      viewingRequestId: viewingRequest?.id || null,
      fromView: fromView || (viewingRequest ? "viewing_request" : "repairs"),
    });
  }, [viewingRequest]);

  // Unified Back navigation for Technician interface
  const handleTechBack = React.useCallback(() => {
    // 1. Check if any overlay / modal is open (Requirement 7)
    if (hasOpenModals()) {
      closeTopModal();
      return;
    }

    if (isRejecting) {
      setIsRejecting(false);
      return;
    }
    if (isConfirmingAccept) {
      setIsConfirmingAccept(false);
      return;
    }
    if (isTripConfirmationOpen) {
      setIsTripConfirmationOpen(false);
      return;
    }
    if (isCompletingModalOpen) {
      setIsCompletingModalOpen(false);
      return;
    }
    if (isPartsToolsWizardOpen) {
      setIsPartsToolsWizardOpen(false);
      return;
    }
    if (showAddSkill) {
      setShowAddSkill(false);
      return;
    }
    if (isEditingPrice) {
      setIsEditingPrice(false);
      return;
    }
    if (completingRepairId) {
      setCompletingRepairId(null);
      return;
    }

    // 2. Real navigation history pop
    if (getTechnicianHistoryDepth() > 1 && typeof window !== "undefined") {
      isPoppingTechRef.current = true;
      window.history.back();
      return;
    }

    // 3. Fallback to appropriate parent view if history is exhausted (Requirement 8)
    const parent = getTechnicianParentView({
      role: "technician",
      activeTab,
      repairsSubTab,
      selectedJobCardId,
      viewingRequestId: viewingRequest?.id || null,
      timestamp: Date.now(),
    });

    if (parent.selectedJobCardId !== undefined) {
      setSelectedJobCardId(parent.selectedJobCardId);
    }
    if (parent.viewingRequestId !== undefined) {
      if (parent.viewingRequestId) {
        const found = repairs.find((r) => r.id === parent.viewingRequestId);
        setViewingRequest(found || null);
      } else {
        setViewingRequest(null);
      }
    }
    if (parent.activeTab) {
      setActiveTab(parent.activeTab);
    }
    if (parent.repairsSubTab) {
      setRepairsSubTab(parent.repairsSubTab);
    }
  }, [
    isRejecting,
    isConfirmingAccept,
    isTripConfirmationOpen,
    isCompletingModalOpen,
    isPartsToolsWizardOpen,
    showAddSkill,
    isEditingPrice,
    completingRepairId,
    activeTab,
    repairsSubTab,
    selectedJobCardId,
    viewingRequest,
    repairs,
  ]);

  // Seed simulated demo request on mount
  useEffect(() => {
    ensureSimulatedDemoRequest();
    onRefreshData();
  }, []);

  // Active JobCard if one is selected
  const activeJobCard: JobCard | null = selectedJobCardId
    ? getJobCardByRepairId(selectedJobCardId) ||
    (getLatestJobCard()?.jobId === selectedJobCardId ? getLatestJobCard() : null)
    : null;

  // Handle Accept Confirmation
  const handleConfirmAccept = async () => {
    if (!viewingRequest) return;

    try {
      // Concurrency check via backend API
      const res = await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "accept",
          repairId: viewingRequest.id,
          technicianId: session.user.id,
          technicianName: session.user.nameHi || session.user.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.error === "already_assigned") {
          alert(`सूचना: यह मरम्मत अनुरोध पहले ही ${data.assignedTo || "अन्य मैकेनिक"} द्वारा स्वीकार कर लिया गया है।`);
          setViewingRequest(null);
          setIsConfirmingAccept(false);
          onRefreshData();
          return;
        }
      }
    } catch {
      // Safe offline fallback
    }

    const farmerLat = viewingRequest.farmerLocation?.latitude || 26.8467;
    const farmerLng = viewingRequest.farmerLocation?.longitude || 80.9462;
    const realRouteUrl = viewingRequest.routeUrl || `https://www.google.com/maps/dir/?api=1&destination=${farmerLat},${farmerLng}`;

    const updated = updateRepairStatus(viewingRequest.id, {
      technicianId: session.user.id,
      selectedTechnician: session.user,
      technicianWorkflowStatus: "assigned",
      status: "technician_assigned",
      statusTextHi: "मैकेनिक नियुक्त हो गया है",
      assignedAt: new Date().toISOString(),
    });

    createJobCard({
      repairRequestId: viewingRequest.id,
      machine: viewingRequest.machineNameHi || "Tractor",
      machineIcon: viewingRequest.machineIcon || "🚜",
      problem: viewingRequest.problemDescription,
      diagnosis: viewingRequest.diagnosis?.possibleProblem || "Starting system में समस्या हो सकती है.",
      urgency: viewingRequest.urgency === "today" ? "आज ही" : "सामान्य",
      safetyMessage: viewingRequest.diagnosis?.safeAction,
      technicianId: session.user.id,
      technicianNameHi: session.user.nameHi || session.user.name || "प्रमाणित मिस्त्री",
      technicianPhone: session.user.phone || "9834567890",
      technicianSkillHi: skills[0] || "Tractor",
      technicianDistanceKm: 3.2,
      technicianRating: 4.8,
      farmerId: viewingRequest.farmerId || "farmer-pawan-01",
      farmerLocationText: `${viewingRequest.farmerLocation?.village || "शाहपुर"}, ${viewingRequest.farmerLocation?.district || "लखनऊ"}`,
      technicianWorkflowStatus: "assigned",
      routeUrl: realRouteUrl,
      approxDistanceText: getTechnicianDistanceText(viewingRequest),
    });

    setAcceptedRepair(updated || viewingRequest);
    setIsConfirmingAccept(false);
    setViewingRequest(null);
    onRefreshData();
    showToast("✓ अनुरोध स्वीकार किया गया! 'मेरी मरम्मत' में स्थानांतरित किया गया।");
    setActiveTab("repairs");
    setRepairsSubTab("active");
  };

  // Handle Call Farmer
  const handleCallFarmer = async (repair: RepairRequest) => {
    setContactedRepairs((prev) => ({ ...prev, [repair.id]: true }));
    try {
      await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "contact_farmer",
          repairId: repair.id,
        }),
      });
    } catch {}
    showToast(`📞 किसान ${repair.farmerName || ""} से संपर्क दर्ज किया गया।`);
  };

  // Handle View Route with real GPS coordinates
  const handleViewRoute = async (repair: RepairRequest) => {
    const lat = repair.farmerLocation?.latitude || 26.8467;
    const lng = repair.farmerLocation?.longitude || 80.9462;
    const mapUrl = repair.routeUrl || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    if (repair.status === "technician_assigned" || repair.technicianWorkflowStatus === "assigned") {
      try {
        await fetch("/api/technician/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "start_travel",
            repairId: repair.id,
          }),
        });
      } catch {}

      const card = getJobCardByRepairId(repair.id) || getLatestJobCard();
      if (card) {
        updateTechnicianWorkflowStatus(card.jobId, "on_the_way");
      }

      updateRepairStatus(repair.id, {
        status: "on_the_way",
        statusTextHi: "मैकेनिक रास्ते में है",
        technicianWorkflowStatus: "on_the_way",
      });

      onRefreshData();
      showToast("📍 यात्रा प्रारंभ! किसान को सूचना भेजी गई।");
    }

    window.open(mapUrl, "_blank", "noopener,noreferrer");
  };

  // Handle Start Repair
  const handleStartRepair = async (repair: RepairRequest) => {
    try {
      await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start_repair",
          repairId: repair.id,
        }),
      });
    } catch {}

    const card = getJobCardByRepairId(repair.id) || getLatestJobCard();
    if (card) {
      updateTechnicianWorkflowStatus(card.jobId, "repairing");
    }

    updateRepairStatus(repair.id, {
      status: "repairing",
      statusTextHi: "मरम्मत चल रही है",
      technicianWorkflowStatus: "repairing",
    });

    onRefreshData();
    showToast("⚙️ मरम्मत कार्य प्रारंभ किया गया!");
  };

  // 5 Status progress stages helper
  const getRepairProgressStages = (repair: RepairRequest, isContacted: boolean) => {
    const status = repair.technicianWorkflowStatus || repair.status;
    const isTravelStarted =
      status === "on_the_way" ||
      status === "arrived" ||
      status === "repairing" ||
      status === "completed" ||
      status === "verification_pending";
    const isArrivedOrBeyond =
      status === "arrived" ||
      status === "repairing" ||
      status === "completed" ||
      status === "verification_pending";
    const isRepairingOrBeyond =
      status === "repairing" ||
      status === "completed" ||
      status === "verification_pending";
    const isCompleted =
      status === "completed" || status === "verification_pending";

    const stage1Done = true;
    const stage2Done = isContacted || isTravelStarted;
    const stage3Done = isArrivedOrBeyond;
    const stage4Done = isRepairingOrBeyond;
    const stage5Done = isCompleted;

    let currentStage = 1;
    if (!stage2Done) currentStage = 2;
    else if (!stage3Done) currentStage = 3;
    else if (!stage4Done) currentStage = 4;
    else if (!stage5Done) currentStage = 5;
    else currentStage = 5;

    return [
      { id: 1, label: "अनुरोध स्वीकार किया", done: stage1Done, current: false },
      { id: 2, label: "किसान से संपर्क", done: stage2Done, current: currentStage === 2 },
      { id: 3, label: "किसान के स्थान पर जाना", done: stage3Done, current: currentStage === 3 },
      { id: 4, label: "मरम्मत शुरू", done: stage4Done, current: currentStage === 4 },
      { id: 5, label: "मरम्मत पूरी", done: stage5Done, current: currentStage === 5 },
    ];
  };

  // Handle Reject Confirmation
  const handleConfirmReject = async () => {
    if (!viewingRequest) return;
    const finalReason = selectedRejectReason === "अन्य कारण" && customRejectReason.trim()
      ? customRejectReason.trim()
      : selectedRejectReason;

    try {
      await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reject",
          repairId: viewingRequest.id,
          technicianId: session.user.id,
          reason: finalReason,
        }),
      });
    } catch {
      // safe fallback
    }

    updateRepairStatus(viewingRequest.id, {
      rejectionReason: `rejected_by_${session.user.id}`,
    });

    setIsRejecting(false);
    setViewingRequest(null);
    onRefreshData();
    showToast("अनुरोध अस्वीकार दर्ज किया गया।");
  };

  // Handle Parts & Tools Proceed
  const handleSavePartsAndProceed = async () => {
    if (!acceptedRepair) return;
    const finalParts = includeSpareParts ? selectedPartsList : [];
    const finalTools = includeTools ? selectedToolsList : [];
    const msg = needFarmerInfo ? technicianMessageToFarmer.trim() : undefined;

    try {
      await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_parts",
          repairId: acceptedRepair.id,
          parts: finalParts,
          tools: finalTools,
          messageToFarmer: msg,
        }),
      });
    } catch {}

    updateRepairStatus(acceptedRepair.id, {
      recommendedParts: finalParts,
      requiredTools: finalTools,
      technicianMessageToFarmer: msg,
    });

    setIsPartsToolsWizardOpen(false);
    setIsTripConfirmationOpen(true);
    onRefreshData();
  };

  // Handle Start Trip
  const handleStartTrip = async () => {
    if (!acceptedRepair) return;

    try {
      await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start_travel",
          repairId: acceptedRepair.id,
        }),
      });
    } catch {}

    const card = getJobCardByRepairId(acceptedRepair.id) || getLatestJobCard();
    if (card) {
      updateTechnicianWorkflowStatus(card.jobId, "on_the_way");
    }

    updateRepairStatus(acceptedRepair.id, {
      status: "on_the_way",
      statusTextHi: "मैकेनिक रास्ते में है",
      technicianWorkflowStatus: "on_the_way",
    });

    setIsTripConfirmationOpen(false);
    setSelectedJobCardId(card ? card.jobId : acceptedRepair.id);
    onRefreshData();
    showToast("🚜 यात्रा शुरू हुई! किसान को सूचना भेज दी गई है।");
  };

  // Handle Complete Repair Submission
  const handleConfirmCompletion = async () => {
    const targetRepairId = completingRepairId || (activeJobCard ? activeJobCard.repairRequestId : selectedJobCardId);
    if (!targetRepairId) return;

    try {
      await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "complete",
          repairId: targetRepairId,
          notes: completionNotes,
          finalCost: completionLabourFee,
        }),
      });
    } catch {}

    const card = getJobCardByRepairId(targetRepairId);
    if (card) {
      updateTechnicianWorkflowStatus(card.jobId, "completed");
    }

    const feeNumber = typeof completionLabourFee === "number" ? completionLabourFee : 450;
    const finalPricingBreakdown: PricingBreakdown = {
      diagnosticFee: 150,
      labourFee: feeNumber - 150 > 0 ? feeNumber - 150 : feeNumber,
      partsEstimate: 0,
      travelFee: 0,
      discount: 0,
      total: feeNumber,
      currency: "₹",
      isDemoPricing: false,
    };

    updateRepairStatus(targetRepairId, {
      status: "verification_pending",
      statusTextHi: "मरम्मत पूरी हुई — जाँच बाकी",
      technicianWorkflowStatus: "completed",
      verificationTime: new Date().toISOString(),
      finalCost: finalPricingBreakdown,
      verificationNote: completionNotes,
    });

    setIsCompletingModalOpen(false);
    setCompletingRepairId(null);
    setSelectedJobCardId(null);
    setRepairsSubTab("completed");
    onRefreshData();
    showToast("✓ मरम्मत पूरी हुई! किसान को पुष्टि व बिल भेजा गया।");
  };

  // Handle stage transition in job card
  const handleAdvanceStatus = (nextStatus: TechnicianWorkflowStatus) => {
    if (!activeJobCard) return;

    const statusMap: Record<
      TechnicianWorkflowStatus,
      { statusTextHi: string; repairStatus: RepairRequest["status"] }
    > = {
      available: { statusTextHi: "उपलब्ध", repairStatus: "technician_assigned" },
      assigned: { statusTextHi: "मैकेनिक नियुक्त हुआ", repairStatus: "technician_assigned" },
      on_the_way: { statusTextHi: "मैकेनिक रास्ते में है", repairStatus: "on_the_way" },
      arrived: { statusTextHi: "मैकेनिक पहुँच गया", repairStatus: "arrived" },
      repairing: { statusTextHi: "मरम्मत शुरू हुई", repairStatus: "repairing" },
      completed: { statusTextHi: "मरम्मत पूरी हुई — जाँच बाकी", repairStatus: "verification_pending" },
    };

    const target = statusMap[nextStatus];
    const updated = updateTechnicianWorkflowStatus(activeJobCard.jobId, nextStatus);
    if (updated) {
      const nowIso = new Date().toISOString();
      const timestampUpdates: Partial<RepairRequest> = {
        status: target.repairStatus,
        statusTextHi: target.statusTextHi,
        technicianWorkflowStatus: nextStatus,
      };
      if (nextStatus === "on_the_way") timestampUpdates.onTheWayAt = nowIso;
      if (nextStatus === "arrived") timestampUpdates.arrivedAt = nowIso;
      if (nextStatus === "repairing") timestampUpdates.repairStartedAt = nowIso;
      if (nextStatus === "completed") timestampUpdates.repairCompletedAt = nowIso;

      updateRepairStatus(updated.repairRequestId, timestampUpdates);
      onRefreshData();
    }
  };

  // State to prevent duplicate submissions
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Dedicated single-click workflow advancement handler (Technician Flow)
  const handleStepWorkflowStatus = async (
    repair: RepairRequest,
    nextStatus: "assigned" | "on_the_way" | "arrived" | "repairing" | "completed"
  ) => {
    if (isUpdatingStatus) return;

    // Validate sequential progression: assigned -> on_the_way -> arrived -> repairing -> completed
    const currentStatus = repair.technicianWorkflowStatus || (
      repair.status === "on_the_way" ? "on_the_way" :
      repair.status === "arrived" ? "arrived" :
      (repair.status === "repairing" || repair.status === "repair_in_progress") ? "repairing" :
      (repair.status === "verification_pending" || repair.status === "completed") ? "completed" : "assigned"
    );

    const allowedTransitions: Record<string, string[]> = {
      assigned: ["on_the_way"],
      on_the_way: ["arrived"],
      arrived: ["repairing"],
      repairing: ["completed"],
      completed: [],
    };

    if (allowedTransitions[currentStatus] && !allowedTransitions[currentStatus].includes(nextStatus)) {
      showToast("⚠️ अमान्य बदलाव: अगला क्रमवार चरण चुनें।");
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const nowIso = new Date().toISOString();
      const updates: Partial<RepairRequest> = {
        technicianWorkflowStatus: nextStatus,
      };

      let toastMsg = "";

      if (nextStatus === "assigned") {
        updates.status = "technician_assigned";
        updates.statusTextHi = "मैकेनिक नियुक्त हुआ";
        updates.assignedAt = nowIso;
        toastMsg = "✓ स्थिति: मैकेनिक नियुक्त हुआ";
      } else if (nextStatus === "on_the_way") {
        updates.status = "on_the_way";
        updates.statusTextHi = "मैकेनिक रास्ते में है";
        updates.onTheWayAt = nowIso;
        toastMsg = "🛵 रास्ते में निकला! किसान को सूचना भेजी गई।";
      } else if (nextStatus === "arrived") {
        updates.status = "arrived";
        updates.statusTextHi = "मैकेनिक पहुँच गया";
        updates.arrivedAt = nowIso;
        toastMsg = "📍 किसान के स्थान पर पहुँचे!";
      } else if (nextStatus === "repairing") {
        updates.status = "repairing";
        updates.statusTextHi = "मरम्मत शुरू हुई";
        updates.repairStartedAt = nowIso;
        toastMsg = "⚙️ मरम्मत कार्य प्रारंभ हुआ!";
      } else if (nextStatus === "completed") {
        updates.status = "verification_pending";
        updates.statusTextHi = "मरम्मत पूरी हुई — जाँच बाकी";
        updates.repairCompletedAt = nowIso;
        toastMsg = "🛠️ मरम्मत पूरी हुई! अब किसान मशीन की जाँच (Job-Ready) करेंगे।";
      }

      // Also sync job card if available
      const card = getJobCardByRepairId(repair.id) || getLatestJobCard();
      if (card) {
        updateTechnicianWorkflowStatus(card.jobId, nextStatus);
      }

      updateRepairStatus(repair.id, updates);
      onRefreshData();
      showToast(toastMsg);
    } catch {
      showToast("स्थिति अपडेट करने में समस्या आई");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle spare parts requirement decision
  const handlePartDecision = (
    partId: string,
    partNameHi: string,
    decision: "needed" | "not_needed"
  ) => {
    if (!activeJobCard) return;
    const selection: PartSelection = { partId, partNameHi, decision };
    const updated = updatePartSelection(activeJobCard.jobId, selection);
    if (updated) {
      updateRepairStatus(updated.repairRequestId, {
        selectedParts: updated.partSelections,
      });
      onRefreshData();
    }
  };

  // Save cost adjustment
  const handleSavePriceAdjustment = () => {
    if (!activeJobCard || techLabourFeeOverride === null) return;
    const est = activeJobCard.estimatedCost || calculateEstimatedPricing({
      machineType: activeJobCard.machine,
      distanceKm: activeJobCard.technicianDistanceKm,
      partSelections: activeJobCard.partSelections,
    });

    const partsCost = calculatePartsCost({
      partSelections: activeJobCard.partSelections,
    });

    const finalTotal = est.diagnosticFee + techLabourFeeOverride + partsCost + est.travelFee - est.discount;

    const finalCost = {
      diagnosticFee: est.diagnosticFee,
      labourFee: techLabourFeeOverride,
      partsEstimate: partsCost,
      travelFee: est.travelFee,
      discount: est.discount,
      total: finalTotal,
      currency: "INR",
      isDemoPricing: true,
    };

    const priceAdjustment = {
      estimatedTotal: est.total,
      revisedTotal: finalTotal,
      difference: finalTotal - est.total,
      reason: priceAdjustmentReason,
      customReasonNote: customPriceNote || undefined,
      adjustedAt: new Date().toISOString(),
      adjustedByTechnicianId: session.user.id,
    };

    const updated = updateJobCardPricing(activeJobCard.jobId, {
      finalCost,
      priceAdjustment,
    });
    if (updated) {
      updateRepairStatus(updated.repairRequestId, {
        priceAdjustment,
      });
      setIsEditingPrice(false);
      onRefreshData();
    }
  };

  // Add skill
  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    if (!skills.includes(newSkillInput.trim())) {
      setSkills([...skills, newSkillInput.trim()]);
    }
    setNewSkillInput("");
    setShowAddSkill(false);
  };

  // Compute mock settlement totals
  const totalSettlement = repairs.reduce((acc) => {
    return acc + 850;
  }, 4250);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 pb-28">
      {/* ================= TECHNICIAN HEADER ================= */}
      {activeTab !== "profile" && (
        <header className="bg-slate-900 text-white px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-800 shadow-sm sticky top-0 z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            {/* Left: Back Arrow (when in subview) & Real Technician Name */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              {(activeTab !== "home" || selectedJobCardId || viewingRequest) && (
                <button
                  type="button"
                  id="tech-header-back-btn"
                  onClick={handleTechBack}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
                  aria-label="वापस"
                  title="वापस जाएं"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <span className="p-2 bg-slate-800 rounded-lg border border-slate-700/80 text-emerald-400 shrink-0">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-white truncate leading-tight tracking-tight">
                  नमस्ते, {session.user.nameHi || session.user.name || "टेक्नीशियन साथी"}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate mt-0.5">
                  {session.user.villageOrArea || "नागपुर ग्रामीण"} • +91 {session.user.phone}
                </p>
              </div>
            </div>

            {/* Right: Only the Availability Toggle (Connected to backend state) */}
            <button
              type="button"
              id="tech-header-availability-btn"
              onClick={() => setIsAvailable((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0 select-none ${isAvailable
                  ? "bg-emerald-950/90 border-emerald-600 text-emerald-300 hover:bg-emerald-900 active:scale-95"
                  : "bg-rose-950/90 border-rose-700 text-rose-300 hover:bg-rose-900 active:scale-95"
                }`}
              title="उपलब्धता बदलें"
            >
              <span>{isAvailable ? "🟢" : "🔴"}</span>
              <span>{isAvailable ? "उपलब्ध" : "व्यस्त"}</span>
            </button>
          </div>
        </header>
      )}

      {/* ================= PROFILE VIEW OR DASHBOARD MAIN ================= */}
      {activeTab === "profile" ? (
        <TechnicianProfileScreen
          session={session}
          repairs={repairs}
          skills={skills}
          isAvailable={isAvailable}
          onToggleAvailability={() => setIsAvailable((prev) => !prev)}
          onNavigateTab={(tab, target) => {
            if (tab === "jobs" || tab === "home") {
              setActiveTab("home");
            } else if (tab === "requests") {
              setActiveTab("requests");
            } else if (tab === "repairs") {
              setActiveTab("repairs");
              setRepairsSubTab("active");
            } else if (tab === "profile") {
              setActiveTab("profile");
            } else {
              setActiveTab("home");
            }
            setSelectedJobCardId(null);
            if (target) {
              setTimeout(() => {
                const el = document.getElementById(target);
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }
          }}
          onAddSkill={(skill) => {
            if (!skills.includes(skill)) {
              setSkills([...skills, skill]);
            }
          }}
          currentLanguage={currentLanguage}
          onLogout={onLogout}
          onBack={handleTechBack}
        />
      ) : (
        <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* KPI Summary Cards — Interactive & Connected */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          <button
            type="button"
            onClick={() => {
              setActiveTab("requests");
              setSelectedJobCardId(null);
            }}
            className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer text-left block w-full shadow-2xs ${
              activeTab === "requests"
                ? "bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/30"
                : "bg-white border-slate-200/90 hover:border-amber-300"
            }`}
          >
            <span className="text-[11px] sm:text-xs font-bold text-amber-800 block">नए अनुरोध</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 block">
              {incomingRepairs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("repairs");
              setRepairsSubTab("active");
              setSelectedJobCardId(null);
            }}
            className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer text-left block w-full shadow-2xs ${
              activeTab === "repairs" && repairsSubTab === "active"
                ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/30"
                : "bg-white border-slate-200/90 hover:border-emerald-300"
            }`}
          >
            <span className="text-[11px] sm:text-xs font-bold text-emerald-800 block">चल रहे काम</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5 block">
              {activeRepairs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("repairs");
              setRepairsSubTab("completed");
              setSelectedJobCardId(null);
            }}
            className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer text-left block w-full shadow-2xs ${
              activeTab === "repairs" && repairsSubTab === "completed"
                ? "bg-slate-100 border-slate-400 ring-2 ring-slate-400/30"
                : "bg-white border-slate-200/90 hover:border-slate-300"
            }`}
          >
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 block">पूरे किए गए काम</span>
            <span className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5 block">
              {completedRepairs.length}
            </span>
          </button>
        </div>

        {/* ================= TAB: HOME (डैशबोर्ड होम) ================= */}
        {activeTab === "home" && (
          <div className="space-y-4">
            {/* Urgent incoming banner if available */}
            {incomingRepairs.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    !
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-amber-950">
                      {incomingRepairs.length} नया मरम्मत अनुरोध प्राप्त हुआ है
                    </div>
                    <div className="text-[11px] text-amber-900 truncate">
                      {incomingRepairs[0].farmerName || "किसान"} • {incomingRepairs[0].machineNameHi || "Tractor"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => switchTab("requests")}
                  className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer transition-colors shadow-2xs"
                >
                  अनुरोध देखें ➔
                </button>
              </div>
            )}

            {/* Quick list of incoming requests */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>प्रासंगिक अनुरोध</span>
                </h2>
                <button
                  type="button"
                  onClick={() => switchTab("requests")}
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>सभी देखें ({incomingRepairs.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {incomingRepairs.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center border border-slate-200/90 shadow-2xs space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">कोई नया अनुरोध लंबित नहीं है</p>
                </div>
              ) : (
                incomingRepairs.slice(0, 2).map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-xl p-4 border border-slate-200/90 hover:border-emerald-300 transition-all shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex-shrink-0">
                          {req.machineIcon || "🚜"}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                            {req.farmerName || "किसान"}
                          </h3>
                          <div className="text-xs font-bold text-emerald-800">
                            {req.machineNameHi || "Tractor"}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span>📍 {getTechnicianDistanceText(req)}</span>
                            <span>•</span>
                            <span>{req.farmerLocation?.village || "शाहपुर"}, {req.farmerLocation?.district || "लखनऊ"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                          req.urgency === "today"
                            ? "bg-amber-50 text-amber-900 border-amber-300"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}>
                          {req.urgency === "today" ? "⚠️ आज ही" : "सामान्य"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{req.createdAt ? new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "अभी"}</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 text-xs text-slate-700 space-y-1.5">
                      <div>
                        <span className="text-slate-500 font-medium block text-[11px]">समस्या (Problem):</span>
                        <span className="text-slate-900 font-bold text-xs sm:text-sm">
                          {req.problemDescription}
                        </span>
                      </div>
                      {req.diagnosis?.possibleProblem && (
                        <div className="pt-1.5 border-t border-slate-200/70 text-[11px]">
                          <span className="font-bold text-emerald-800">AI की संभावित जांच: </span>
                          <span className="text-slate-700 font-medium">{req.diagnosis.possibleProblem}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenRequestDetails(req)}
                        className="bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                      >
                        <span>अनुरोध देखें</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick list of active repairs if any */}
            {activeRepairs.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-emerald-700" />
                    <span>सक्रिय मरम्मत</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => switchTab("repairs")}
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>मेरी मरम्मत देखें ➔</span>
                  </button>
                </div>

                {activeRepairs.slice(0, 1).map((repair) => {
                  const stages = getRepairProgressStages(repair, !!contactedRepairs[repair.id]);
                  return (
                    <div
                      key={repair.id}
                      className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex-shrink-0">
                            {repair.machineIcon || "🚜"}
                          </span>
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">
                              {repair.farmerName || "किसान"} • {repair.machineNameHi || "मशीन"}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              📍 {getTechnicianDistanceText(repair)} • {repair.farmerLocation?.village || "स्थान उपलब्ध"}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {repair.statusTextHi || "स्वीकृत"}
                        </span>
                      </div>

                      {/* 5-Stage Stepper */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          प्रगति स्थिति:
                        </div>
                        <div className="space-y-1">
                          {stages.map((st) => (
                            <div key={st.id} className="flex items-center gap-2 text-xs">
                              {st.done ? (
                                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                  ✓
                                </span>
                              ) : st.current ? (
                                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 animate-pulse">
                                  ●
                                </span>
                              ) : (
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center font-bold text-[9px] shrink-0">
                                  ○
                                </span>
                              )}
                              <span className={st.done ? "font-semibold text-slate-800" : st.current ? "font-bold text-amber-800" : "text-slate-400"}>
                                {st.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleViewRoute(repair)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                        >
                          <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                          <span>📍 रास्ता देखें</span>
                        </button>
                        <a
                          href={`tel:${repair.farmerPhone || "9876543210"}`}
                          onClick={() => handleCallFarmer(repair)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 text-center"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-700" />
                          <span>📞 किसान से संपर्क</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Zero Commission Settlement Card */}
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 border border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  शून्य कमीशन मॉडल
                </span>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-700">
                  YANTRIQ
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                YANTRIQ पर मरम्मत शुल्क का 100% भुगतान सीधा आपके बैंक खाते में जाता है। कोई मध्यस्थ या छिपे हुए शुल्क नहीं।
              </p>
            </div>
          </div>
        )}

        {/* ================= TAB: REQUESTS (मरम्मत अनुरोध) ================= */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  मरम्मत अनुरोध
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  आपके कौशल और कार्यक्षेत्र के अनुसार प्रासंगिक अनुरोध
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-300">
                {incomingRepairs.length} नए अनुरोध
              </span>
            </div>

            {incomingRepairs.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-dashed border-slate-200 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">
                  फिलहाल कोई नया मरम्मत अनुरोध लंबित नहीं है
                </h3>
                <p className="text-xs text-slate-500">
                  नए अनुरोध आने पर आपको तुरंत यहाँ सूचना मिलेगी।
                </p>
              </div>
            ) : (
              incomingRepairs.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-xl p-4 border border-slate-200/90 hover:border-emerald-300 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex-shrink-0">
                        {req.machineIcon || "🚜"}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                          {req.farmerName || "किसान"}
                        </h3>
                        <div className="text-xs font-bold text-emerald-800">
                          {req.machineNameHi || "Tractor"}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span>📍 {getTechnicianDistanceText(req)}</span>
                          <span>•</span>
                          <span>{req.farmerLocation?.village || "शाहपुर"}, {req.farmerLocation?.district || "लखनऊ"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                        req.urgency === "today"
                          ? "bg-amber-50 text-amber-900 border-amber-300"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}>
                        {req.urgency === "today" ? "⚠️ आज ही" : "सामान्य"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{req.createdAt ? new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "अभी"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 text-xs text-slate-700 space-y-1.5">
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">समस्या (Problem):</span>
                      <span className="text-slate-900 font-bold text-xs sm:text-sm">
                        {req.problemDescription}
                      </span>
                    </div>
                    {req.diagnosis?.possibleProblem && (
                      <div className="pt-1.5 border-t border-slate-200/70 text-[11px]">
                        <span className="font-bold text-emerald-800">AI की संभावित जांच: </span>
                        <span className="text-slate-700 font-medium">{req.diagnosis.possibleProblem}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-slate-600 font-medium">
                      स्थिति: <span className="font-bold text-amber-800">{req.statusTextHi || "नया अनुरोध"}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRequestDetails(req)}
                      className="bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                    >
                      <span>अनुरोध देखें</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= TAB: REPAIRS (मेरी मरम्मत) ================= */}
        {activeTab === "repairs" && (
          <div className="space-y-4">
            {/* Header and Sub-Tabs (only when not inspecting a single job card) */}
            {(!selectedJobCardId || !activeJobCard) && (
              <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      मेरी मरम्मत
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      स्वीकृत और पूर्ण किए गए मरम्मत कार्य
                    </p>
                  </div>
                </div>

                {/* Sub-tabs: चल रही हैं | पूरी हुई */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setRepairsSubTab("active")}
                    className={`py-2 px-3 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      repairsSubTab === "active"
                        ? "bg-white text-emerald-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>चल रही हैं</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      repairsSubTab === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}>
                      {activeRepairs.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRepairsSubTab("completed")}
                    className={`py-2 px-3 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      repairsSubTab === "completed"
                        ? "bg-white text-emerald-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>पूरी हुई</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      repairsSubTab === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}>
                      {completedRepairs.length}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* If deep inside a Job Card */}
            {selectedJobCardId && activeJobCard ? (
              <div className="space-y-4">
                {/* Back button */}
                <button
                  type="button"
                  onClick={handleTechBack}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-md border border-slate-300 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>वापस जाएं</span>
                </button>

                {/* Stepper Status Banner */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      कार्य प्रगति स्थिति (Workflow Status):
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {activeJobCard.jobId}
                    </span>
                  </div>

                  <div className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <span>
                      {activeJobCard.technicianWorkflowStatus === "assigned"
                        ? "मैकेनिक नियुक्त हो गया है"
                        : activeJobCard.technicianWorkflowStatus === "on_the_way"
                          ? "मैकेनिक रास्ते में है"
                          : activeJobCard.technicianWorkflowStatus === "arrived"
                            ? "मैकेनिक मौके पर पहुँच गया है"
                            : activeJobCard.technicianWorkflowStatus === "repairing"
                              ? "मरम्मत प्रगति पर है"
                              : "मरम्मत पूर्ण हो चुकी है"}
                    </span>
                  </div>

                  {/* 5 Stages visual dots */}
                  {(() => {
                    const stages: Array<{
                      key: TechnicianWorkflowStatus;
                      label: string;
                    }> = [
                        { key: "assigned", label: "नियुक्त" },
                        { key: "on_the_way", label: "रास्ते में" },
                        { key: "arrived", label: "पहुँच गए" },
                        { key: "repairing", label: "मरम्मत" },
                        { key: "completed", label: "पूर्ण" },
                      ];

                    const currentIdx = stages.findIndex(
                      (s) => s.key === (activeJobCard.technicianWorkflowStatus || "assigned")
                    );

                    return (
                      <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-100">
                        {stages.map((stage, idx) => (
                          <div key={stage.key} className="text-center space-y-1">
                            <div
                              className={`w-full h-1.5 rounded-full ${idx <= currentIdx
                                  ? "bg-emerald-600"
                                  : "bg-slate-200"
                                }`}
                            />
                            <span
                              className={`text-[11px] block truncate ${idx === currentIdx
                                  ? "font-bold text-emerald-800"
                                  : idx < currentIdx
                                    ? "font-medium text-slate-700"
                                    : "font-medium text-slate-400"
                                }`}
                            >
                              {stage.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Workflow Transition Action Buttons */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    स्थिति अपडेट करें (Update Status)
                  </h3>

                  {(!activeJobCard.technicianWorkflowStatus ||
                    activeJobCard.technicianWorkflowStatus === "assigned") && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceStatus("on_the_way")}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>रास्ते में हूँ ➔</span>
                      </button>
                    )}

                  {activeJobCard.technicianWorkflowStatus === "on_the_way" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus("arrived")}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>पहुँच गया ➔</span>
                    </button>
                  )}

                  {activeJobCard.technicianWorkflowStatus === "arrived" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus("repairing")}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>मरम्मत शुरू करें ➔</span>
                    </button>
                  )}

                  {activeJobCard.technicianWorkflowStatus === "repairing" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus("completed")}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>मरम्मत पूरी हुई ✓</span>
                    </button>
                  )}

                  {activeJobCard.technicianWorkflowStatus === "completed" && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-center text-amber-950 font-bold text-xs space-y-1">
                      <div>✓ मरम्मत पूरी हो चुकी है</div>
                      <div className="text-[11px] text-amber-800 font-normal">
                        किसान द्वारा मशीन की जाँच की प्रतीक्षा है (Verification Pending)
                      </div>
                    </div>
                  )}
                </div>

                {/* Job Card Details */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>उपकरण व किसान विवरण</span>
                    <a
                      href="tel:9876543210"
                      className="text-xs bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>किसान को कॉल करें</span>
                    </a>
                  </h3>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                    <span className="text-2xl p-1.5 bg-white rounded-md border border-slate-200 shadow-xs">
                      {activeJobCard.machineIcon || "🚜"}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {activeJobCard.machine}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        समस्या: {activeJobCard.problem}
                      </div>
                    </div>
                  </div>

                  {/* Visual Evidence / Photo */}
                  {(activeJobCard.visualEvidence || activeJobCard.photoDataUrl) && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        <span>किसान द्वारा भेजी गई फोटो (Visual Evidence):</span>
                      </div>
                      {activeJobCard.visualEvidence && (
                        <p className="text-xs text-slate-600 font-medium">
                          {activeJobCard.visualEvidence}
                        </p>
                      )}
                      {activeJobCard.photoDataUrl && (
                        <img
                          src={activeJobCard.photoDataUrl}
                          alt="Evidence"
                          className="w-full max-h-48 object-cover rounded-md border border-slate-200"
                        />
                      )}
                    </div>
                  )}

                  {/* Safety Warning */}
                  {activeJobCard.safetyMessage && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2 text-rose-900 text-xs font-medium">
                      <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>{activeJobCard.safetyMessage}</div>
                    </div>
                  )}
                </div>

                {/* Spare Parts Selection */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-slate-600" />
                      <span>स्पेयर पार्ट्स चयन (Parts Selection)</span>
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">आवश्यकता बताएं</span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { id: "part-01", nameHi: "हाइड्रोलिक होस पाइप", partCode: "HYD-575-01", price: 650 },
                      { id: "part-02", nameHi: "ऑयल सील रिंग सेट", partCode: "SEAL-RING-02", price: 280 },
                      { id: "part-03", nameHi: "डीजल फिल्टर कार्ट्रिज", partCode: "DSL-FILT-03", price: 320 },
                    ].map((part) => {
                      const cur = activeJobCard.partSelections?.find((p) => p.partId === part.id);
                      return (
                        <div
                          key={part.id}
                          className={`p-2.5 rounded-md border flex items-center justify-between flex-wrap gap-2 ${cur?.decision === "needed"
                              ? "bg-emerald-50 border-emerald-300"
                              : cur?.decision === "not_needed"
                                ? "bg-slate-50 border-slate-200 opacity-60"
                                : "bg-white border-slate-200"
                            }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900">{part.nameHi}</div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {part.partCode} • ₹{part.price}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handlePartDecision(part.id, part.nameHi, "needed")}
                              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${cur?.decision === "needed"
                                  ? "bg-emerald-700 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                              ✓ चाहिए
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePartDecision(part.id, part.nameHi, "not_needed")}
                              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${cur?.decision === "not_needed"
                                  ? "bg-slate-600 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                              ✕ नहीं चाहिए
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Transparent Billing & Cost Revision */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>पारदर्शी बिलिंग व लागत संशोधन</span>
                    </h3>
                    <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      प्रमाणित दर
                    </span>
                  </div>

                  {!isEditingPrice ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingPrice(true)}
                      className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold py-2 px-3 rounded-md border border-slate-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>लागत / मजदूरी संशोधित करें (कारण के साथ)</span>
                    </button>
                  ) : (
                    <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200 space-y-3 shadow-xs">
                      <div className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                        लागत संशोधन प्रपत्र:
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">
                          संशोधित मजदूरी शुल्क (₹):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={techLabourFeeOverride ?? 400}
                          onChange={(e) => setTechLabourFeeOverride(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">
                          संशोधन का अनिवार्य कारण:
                        </label>
                        <select
                          value={priceAdjustmentReason}
                          onChange={(e) => setPriceAdjustmentReason(e.target.value as PriceChangeReason)}
                          className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 bg-white"
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
                          <label className="text-xs font-medium text-slate-600 block mb-1">
                            विवरण:
                          </label>
                          <input
                            type="text"
                            value={customPriceNote}
                            onChange={(e) => setCustomPriceNote(e.target.value)}
                            placeholder="जैसे: अतिरिक्त वायरिंग बदली गई"
                            className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 bg-white"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSavePriceAdjustment}
                          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 rounded-md text-xs cursor-pointer transition-colors"
                        >
                          ✓ संशोधन सुरक्षित करें
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingPrice(false)}
                          className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-md text-xs cursor-pointer transition-colors"
                        >
                          रद्द करें
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : repairsSubTab === "active" ? (
              /* Active repairs list */
              <div className="space-y-3">
                {activeRepairs.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center border border-dashed border-slate-200 space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        कोई सक्रिय मरम्मत कार्य नहीं चल रहा है
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        नए अनुरोध को स्वीकार कर यहाँ से काम शुरू करें।
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("requests")}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-2xs"
                    >
                      अनुरोध देखें ➔
                    </button>
                  </div>
                ) : (
                  <>
                    {/* ⚡ HACKATHON DEMO SIMULATION CONTROLLER BANNER */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-3.5 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">🎯</span>
                          <span>हैकथॉन डेमो कंट्रोल: रमेश पाटिल (वाटर पंप)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            seedRameshPatilDemoRepair();
                            onRefreshData();
                            showToast("✓ डेमो अनुरोध रीसेट: रमेश पाटिल (वाटर पंप)");
                          }}
                          className="text-[11px] bg-amber-200 hover:bg-amber-300 active:scale-95 text-amber-950 font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all border border-amber-300"
                        >
                          डेमो लोड / रीसेट
                        </button>
                      </div>
                      <p className="text-[11px] text-amber-800 font-medium">
                        प्रेजेंटर 1-क्लिक से स्थिति आगे बढ़ा सकते हैं:
                      </p>
                      <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const target = repairs.find((r) => r.id === "rep-demo-waterpump-patil") || activeRepairs[0];
                            if (target) handleStepWorkflowStatus(target, "assigned");
                          }}
                          className="text-[10px] sm:text-[11px] bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 py-1.5 px-1 rounded-lg font-bold text-center cursor-pointer shadow-2xs"
                        >
                          1. नियुक्त
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const target = repairs.find((r) => r.id === "rep-demo-waterpump-patil") || activeRepairs[0];
                            if (target) handleStepWorkflowStatus(target, "on_the_way");
                          }}
                          className="text-[10px] sm:text-[11px] bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 py-1.5 px-1 rounded-lg font-bold text-center cursor-pointer shadow-2xs"
                        >
                          2. रास्ते में
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const target = repairs.find((r) => r.id === "rep-demo-waterpump-patil") || activeRepairs[0];
                            if (target) handleStepWorkflowStatus(target, "arrived");
                          }}
                          className="text-[10px] sm:text-[11px] bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 py-1.5 px-1 rounded-lg font-bold text-center cursor-pointer shadow-2xs"
                        >
                          3. पहुँच गया
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const target = repairs.find((r) => r.id === "rep-demo-waterpump-patil") || activeRepairs[0];
                            if (target) handleStepWorkflowStatus(target, "repairing");
                          }}
                          className="text-[10px] sm:text-[11px] bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 py-1.5 px-1 rounded-lg font-bold text-center cursor-pointer shadow-2xs"
                        >
                          4. मरम्मत शुरू
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const target = repairs.find((r) => r.id === "rep-demo-waterpump-patil") || activeRepairs[0];
                            if (target) handleStepWorkflowStatus(target, "completed");
                          }}
                          className="text-[10px] sm:text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white py-1.5 px-1 rounded-lg font-bold text-center cursor-pointer shadow-2xs"
                        >
                          5. मरम्मत पूरी
                        </button>
                      </div>
                    </div>

                    {activeRepairs.map((repair) => {
                      const card = getJobCardByRepairId(repair.id) || getLatestJobCard();
                      const stages = getRepairProgressStages(repair, !!contactedRepairs[repair.id]);
                      const wfStatus: TechnicianWorkflowStatus =
                        repair.technicianWorkflowStatus ||
                        (repair.status === "on_the_way"
                          ? "on_the_way"
                          : repair.status === "arrived"
                          ? "arrived"
                          : repair.status === "repairing" || repair.status === "repair_in_progress"
                          ? "repairing"
                          : repair.status === "verification_pending" || repair.status === "completed"
                          ? "completed"
                          : "assigned");

                      return (
                        <div
                          key={repair.id}
                          className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3"
                        >
                          {/* Farmer & Machine info */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex-shrink-0">
                                {repair.machineIcon || "🚜"}
                              </span>
                              <div>
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                                  {repair.farmerName || "किसान"}
                                </h3>
                                <div className="text-xs font-bold text-emerald-800">
                                  {repair.machineNameHi || "Tractor"}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span>📍 {getTechnicianDistanceText(repair)}</span>
                                  <span>•</span>
                                  <span>{repair.farmerLocation?.village || "शाहपुर"}, {repair.farmerLocation?.district || "लखनऊ"}</span>
                                </div>
                              </div>
                            </div>

                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {repair.statusTextHi || "स्वीकृत"}
                            </span>
                          </div>

                          {/* Problem info */}
                          <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 text-xs text-slate-700 space-y-1">
                            <span className="text-slate-500 font-medium block text-[11px]">समस्या (Problem):</span>
                            <span className="text-slate-900 font-bold text-xs sm:text-sm">
                              {repair.problemDescription}
                            </span>
                          </div>

                          {/* 5-Stage Stepper Status Progress */}
                          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              <span>कार्य प्रगति स्थिति</span>
                              <span className="text-emerald-800 font-extrabold">{repair.statusTextHi}</span>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              {stages.map((st) => (
                                <div key={st.id} className="flex items-center gap-2.5 text-xs">
                                  {st.done ? (
                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                      ✓
                                    </span>
                                  ) : st.current ? (
                                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 animate-pulse">
                                      ●
                                    </span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                                      ○
                                    </span>
                                  )}
                                  <span className={st.done ? "font-semibold text-slate-800" : st.current ? "font-bold text-amber-800" : "text-slate-400"}>
                                    {st.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* TECHNICIAN PRIMARY WORKFLOW ACTION (ONE BUTTON AT A TIME) */}
                          <div className="space-y-2 pt-1">
                            {wfStatus === "assigned" && (
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => handleStepWorkflowStatus(repair, "on_the_way")}
                                className="w-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                              >
                                <Navigation className="w-4 h-4 text-white" />
                                <span>रास्ते में हूँ ➔</span>
                              </button>
                            )}

                            {wfStatus === "on_the_way" && (
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => handleStepWorkflowStatus(repair, "arrived")}
                                className="w-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                              >
                                <MapPin className="w-4 h-4 text-white" />
                                <span>पहुँच गया ➔</span>
                              </button>
                            )}

                            {wfStatus === "arrived" && (
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => handleStepWorkflowStatus(repair, "repairing")}
                                className="w-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                              >
                                <Wrench className="w-4 h-4 text-white" />
                                <span>मरम्मत शुरू करें ➔</span>
                              </button>
                            )}

                            {wfStatus === "repairing" && (
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => handleStepWorkflowStatus(repair, "completed")}
                                className="w-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                              >
                                <CheckCircle2 className="w-4 h-4 text-white" />
                                <span>मरम्मत पूरी हुई ✓</span>
                              </button>
                            )}

                            {(wfStatus === "completed" || repair.status === "verification_pending") && (
                              <div className="w-full p-3 bg-amber-50 border border-amber-300 rounded-xl text-center space-y-1">
                                <div className="text-xs font-bold text-amber-950 flex items-center justify-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>मरम्मत पूरी हो चुकी है</span>
                                </div>
                                <p className="text-[11px] text-amber-800 font-medium">
                                  किसान द्वारा मशीन की जाँच की प्रतीक्षा है (Verification Pending)
                                </p>
                              </div>
                            )}

                            {/* Secondary Actions: Route & Call */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              {/* 📍 रास्ता देखें */}
                              <button
                                type="button"
                                onClick={() => handleViewRoute(repair)}
                                className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                              >
                                <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                                <span>📍 रास्ता देखें</span>
                              </button>

                              {/* 📞 किसान से संपर्क करें */}
                              <a
                                href={`tel:${repair.farmerPhone || "9876543210"}`}
                                onClick={() => handleCallFarmer(repair)}
                                className="bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-900 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 shadow-2xs text-center"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-700" />
                                <span>📞 संपर्क</span>
                              </a>
                            </div>

                            {/* View Job card details */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedJobCardId(card ? card.jobId : repair.id);
                              }}
                              className="w-full text-center text-xs text-slate-500 hover:text-emerald-700 font-medium py-1 cursor-pointer"
                            >
                              विस्तृत जॉब कार्ड / पार्ट्स देखें ➔
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ) : (
              /* Completed repairs list */
              <div className="space-y-3">
                {completedRepairs.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center border border-dashed border-slate-200 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-800">
                      अभी तक कोई मरम्मत पूरी नहीं हुई है
                    </h3>
                    <p className="text-xs text-slate-500">
                      पूर्ण किए गए कार्य यहाँ दर्ज होंगे।
                    </p>
                  </div>
                ) : (
                  completedRepairs.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                            {r.machineIcon || "🚜"}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{r.farmerName || "किसान"}</h4>
                            <p className="text-xs font-semibold text-emerald-800">{r.machineNameHi || "Tractor"}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ पूर्ण
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 font-medium">
                        {r.problemDescription}
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-medium">
                        <span>📍 {r.farmerLocation?.village || "शाहपुर"}, {r.farmerLocation?.district || "लखनऊ"}</span>
                        <span className="font-bold text-slate-800">
                          शुल्क: ₹{typeof r.finalCost === "object" && r.finalCost !== null ? (r.finalCost as any).total : (r.finalCost || 450)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

      </main>
      )}

      {/* ================= BOTTOM NAVIGATION FOR TECHNICIAN ================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 py-1.5 shadow-sm flex justify-center">
        <div className="w-full max-w-md grid grid-cols-4 px-2">
          {/* 🏠 Home */}
          <button
            type="button"
            id="technician-nav-home-btn"
            onClick={() => {
              switchTab("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer ${
              activeTab === "home"
                ? "text-emerald-700 font-bold bg-emerald-50"
                : "text-slate-600 font-medium hover:text-slate-900"
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">{currentLanguage === "en" ? "Home" : "होम"}</span>
          </button>

          {/* 🔔 Requests */}
          <button
            type="button"
            id="technician-nav-requests-btn"
            onClick={() => {
              switchTab("requests");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer relative ${
              activeTab === "requests"
                ? "text-emerald-700 font-bold bg-emerald-50"
                : "text-slate-600 font-medium hover:text-slate-900"
            }`}
          >
            <div className="relative">
              <AlertCircle className="w-5 h-5 mb-0.5 text-amber-600" />
              {incomingRepairs.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {incomingRepairs.length}
                </span>
              )}
            </div>
            <span className="text-[11px]">{currentLanguage === "en" ? "Requests" : "अनुरोध"}</span>
          </button>

          {/* 🔧 Repairs */}
          <button
            type="button"
            id="technician-nav-repairs-btn"
            onClick={() => {
              switchTab("repairs");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer relative ${
              activeTab === "repairs"
                ? "text-emerald-700 font-bold bg-emerald-50"
                : "text-slate-600 font-medium hover:text-slate-900"
            }`}
          >
            <div className="relative">
              <ClipboardList className="w-5 h-5 mb-0.5 text-emerald-700" />
              {activeRepairs.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {activeRepairs.length}
                </span>
              )}
            </div>
            <span className="text-[11px]">{currentLanguage === "en" ? "Repairs" : "मरम्मत"}</span>
          </button>

          {/* 👤 Profile */}
          <button
            type="button"
            id="technician-nav-profile-btn"
            onClick={() => {
              switchTab("profile");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "text-emerald-700 font-bold bg-emerald-50"
                : "text-slate-600 font-medium hover:text-slate-900"
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">{currentLanguage === "en" ? "Profile" : "प्रोफाइल"}</span>
          </button>
        </div>
      </nav>
      {/* ================= MODAL 1: REQUEST DETAILS MODAL ================= */}
      {viewingRequest && !isConfirmingAccept && !isRejecting && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-lg w-full overflow-hidden border border-slate-200 shadow-xl">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">मरम्मत अनुरोध विवरण</h3>
              </div>
              <button
                type="button"
                onClick={handleTechBack}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto text-xs sm:text-sm divide-y divide-slate-100">
              {/* 1. Problem Information */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  समस्या विवरण (Problem)
                </span>
                <div className="text-base font-bold text-slate-900">
                  &quot;{viewingRequest.problemDescription}&quot;
                </div>
              </div>

              {/* 2. Machine & Urgency */}
              <div className="pt-3.5 space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  उपकरण एवं प्राथमिकता (Machine & Urgency)
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-1.5 bg-slate-100 rounded-md border border-slate-200">
                      {viewingRequest.machineIcon || "🚜"}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {viewingRequest.machineNameHi || "Tractor"}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {viewingRequest.machineId || "Mach-01"}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {viewingRequest.urgency === "today" ? "⚠️ अति आवश्यक (आज ही)" : "सामान्य समय"}
                  </span>
                </div>
              </div>

              {/* Photo/Voice Complaint Section if available */}
              {(viewingRequest.photoDataUrl || viewingRequest.inputMethod === "voice" || viewingRequest.inputMethod === "photo" || viewingRequest.mediaFileName) && (
                <div className="pt-3.5 space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    शिकायत प्रमाण (Photo / Voice Complaint)
                  </span>
                  {viewingRequest.photoDataUrl ? (
                    <div className="rounded-md overflow-hidden border border-slate-200">
                      <img
                        src={viewingRequest.photoDataUrl}
                        alt="शिकायत की फोटो"
                        className="w-full max-h-48 object-cover"
                      />
                    </div>
                  ) : viewingRequest.inputMethod === "voice" ? (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900 font-medium flex items-center gap-2">
                      <span className="text-base">🎙️</span>
                      <span>ऑडियो वॉइस शिकायत दर्ज की गई (AI द्वारा विश्लेषण किया गया)</span>
                    </div>
                  ) : (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 font-medium flex items-center gap-2">
                      <span className="text-base">📷</span>
                      <span>फोटो शिकायत संलग्न है</span>
                    </div>
                  )}
                </div>
              )}

              {/* 3. AI Potential Assessment */}
              <div className="pt-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    <span>AI की संभावित जांच</span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    विश्वसनीयता: {viewingRequest.diagnosis?.confidence || "89%"}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900">
                  {viewingRequest.diagnosis?.possibleProblem || "Starting system में समस्या हो सकती है."}
                </div>

                <p className="text-[11px] text-slate-500 font-medium">
                  (यह AI की संभावित जांच है। अंतिम पुष्टि मौके पर जांच करके करें।)
                </p>

                {viewingRequest.diagnosis?.reasons && viewingRequest.diagnosis.reasons.length > 0 && (
                  <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-600">
                    {viewingRequest.diagnosis.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}

                {viewingRequest.diagnosis?.safeAction && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-md text-xs text-amber-900 font-medium flex items-start gap-1.5 mt-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{viewingRequest.diagnosis.safeAction}</span>
                  </div>
                )}
              </div>

              {/* 4. Location & Farmer */}
              <div className="pt-3.5 space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  स्थान एवं किसान (Location & Distance)
                </span>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {viewingRequest.farmerName || "Pawan Gupta"}
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      📍 {viewingRequest.farmerLocation?.village || "शाहपुर, लखनऊ"} ({viewingRequest.approxDistanceText || "3.2 किमी दूर"})
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500">संपर्क</div>
                    <div className="font-semibold text-slate-800">
                      +91 {viewingRequest.farmerPhone || "9876543210"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Required Skill & Parts */}
              <div className="pt-3.5 space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  आवश्यक कौशल व पार्ट्स (Skill & Parts)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    🔧 Tractor Mechanical
                  </span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    ⚙️ Fuel Filter / Starter Motor
                  </span>
                </div>
              </div>

              {/* 6. Estimated Billing */}
              <div className="pt-3.5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  अनुमानित शुल्क (Estimated Labor & Visit)
                </span>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span>विजिट व मानक जांच शुल्क:</span>
                  <span className="font-bold text-slate-900 text-sm">₹400</span>
                </div>
              </div>

              {/* 7. Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  className="w-full py-2.5 px-4 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  अभी उपलब्ध नहीं
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAccept}
                  className="w-full py-2.5 px-4 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
                >
                  अनुरोध स्वीकार करें
                </button>
              </div>

              {/* Optional: View Digital Job Card if already created */}
              {getJobCardByRepairId(viewingRequest.id) && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const card = getJobCardByRepairId(viewingRequest.id);
                      if (card) {
                        handleOpenJobCard(card.jobId, "viewing_request");
                      }
                    }}
                    className="w-full py-2 px-3 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
                  >
                    <ClipboardList className="w-4 h-4 text-emerald-700" />
                    <span>डिजिटल जॉब कार्ड देखें</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: REJECT REASON MODAL ================= */}
      {viewingRequest && isRejecting && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">अस्वीकार करने का कारण चुनें</h3>
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs sm:text-sm">
              <p className="text-xs text-slate-600 font-medium">
                कृपया कारण बताएं ताकि किसान को दूसरा नजदीकी मैकेनिक भेजा जा सके:
              </p>

              {[
                "काम उपलब्ध नहीं",
                "यह मशीन/समस्या मेरी skill से बाहर है",
                "बहुत दूर है",
                "अन्य कारण",
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer font-medium text-xs ${
                    selectedRejectReason === reason
                      ? "bg-amber-50 border-amber-400 text-slate-900"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    value={reason}
                    checked={selectedRejectReason === reason}
                    onChange={(e) => setSelectedRejectReason(e.target.value)}
                    className="accent-emerald-700 w-4 h-4"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              {selectedRejectReason === "अन्य कारण" && (
                <input
                  type="text"
                  placeholder="कारण लिखें..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 text-xs font-medium"
                />
              )}

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="w-full py-2.5 px-4 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  वापस जाएं
                </button>

                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="w-full py-2.5 px-4 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  अस्वीकार दर्ज करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: ACCEPT CONFIRMATION STEP ================= */}
      {viewingRequest && isConfirmingAccept && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">मरम्मत अनुरोध स्वीकार करें</h3>
              <button
                type="button"
                onClick={() => setIsConfirmingAccept(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">किसान:</span>
                  <span className="font-bold text-slate-900">{viewingRequest.farmerName || "Pawan Gupta"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">मशीन:</span>
                  <span className="font-bold text-slate-900">{viewingRequest.machineNameHi || "Tractor"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">समस्या:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">{viewingRequest.problemDescription}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmingAccept(false)}
                  className="w-full py-2.5 px-4 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  वापस जाएं
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAccept}
                  className="w-full py-2.5 px-4 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  पुष्टि करें व स्वीकार करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: PARTS / TOOLS PREPARATION WIZARD ================= */}
      {isPartsToolsWizardOpen && acceptedRepair && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-lg w-full overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">आवश्यक सामान व तैयारी (Parts & Tools)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPartsToolsWizardOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs sm:text-sm">
              {/* Category options */}
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-md border border-slate-200 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeSpareParts}
                    onChange={(e) => setIncludeSpareParts(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span>स्पेयर पार्ट्स (Spare Parts)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-md border border-slate-200 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeTools}
                    onChange={(e) => setIncludeTools(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span>औजार किट (Tools Kit)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-md border border-slate-200 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={needFarmerInfo}
                    onChange={(e) => setNeedFarmerInfo(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span>किसान से पहले जानकारी लेनी है</span>
                </label>
              </div>

              {/* Spare parts sub-section */}
              {includeSpareParts && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-md space-y-2">
                  <div className="font-semibold text-slate-900 text-xs">कौन-से parts चाहिए?</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {["Starter", "Battery", "Belt", "Filter", "Other"].map((part) => {
                      const isSel = selectedPartsList.includes(part);
                      return (
                        <button
                          key={part}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setSelectedPartsList(selectedPartsList.filter((p) => p !== part));
                            } else {
                              setSelectedPartsList([...selectedPartsList, part]);
                            }
                          }}
                          className={`p-2 rounded-md border text-left font-medium flex items-center justify-between cursor-pointer transition-colors ${
                            isSel
                              ? "bg-emerald-700 text-white border-emerald-800"
                              : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span>{part}</span>
                          {isSel && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom part adder */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="दूसरा part लिखें..."
                      value={customPartInput}
                      onChange={(e) => setCustomPartInput(e.target.value)}
                      className="flex-1 bg-white p-2 rounded-md border border-slate-300 text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customPartInput.trim() && !selectedPartsList.includes(customPartInput.trim())) {
                          setSelectedPartsList([...selectedPartsList, customPartInput.trim()]);
                          setCustomPartInput("");
                        }
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                    >
                      + जोड़ें
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    * आवश्यकतानुसार बदलाव कर सकते हैं।
                  </p>
                </div>
              )}

              {/* Farmer Question sub-section */}
              {needFarmerInfo && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-md space-y-2">
                  <div className="font-semibold text-slate-900 text-xs">किसान से कुछ और पूछना है?</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTechnicianMessageToFarmer("क्या tractor में battery की light आ रही है?")}
                      className="text-[11px] bg-white border border-slate-300 text-slate-700 px-2 py-0.5 rounded-md font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      + &quot;क्या battery light आ रही है?&quot;
                    </button>
                    <button
                      type="button"
                      onClick={() => setTechnicianMessageToFarmer("क्या सेल्फ दबाने पर क्लिक-क्लिक आवाज आ रही है?")}
                      className="text-[11px] bg-white border border-slate-300 text-slate-700 px-2 py-0.5 rounded-md font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      + &quot;क्या क्लिक-क्लिक आवाज है?&quot;
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="संदेश लिखें..."
                    value={technicianMessageToFarmer}
                    onChange={(e) => setTechnicianMessageToFarmer(e.target.value)}
                    className="w-full bg-white p-2 rounded-md border border-slate-300 text-xs font-medium"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleSavePartsAndProceed}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-md text-xs shadow-xs cursor-pointer transition-colors"
              >
                आगे बढ़ें (तैयारी पूरी) ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: FINAL TRIP CONFIRMATION ================= */}
      {isTripConfirmationOpen && acceptedRepair && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">मरम्मत हेतु प्रस्थान</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTripConfirmationOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-md space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">किसान:</span>
                  <span className="font-bold text-slate-900">{acceptedRepair.farmerName || "Pawan Gupta"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">मशीन:</span>
                  <span className="font-bold text-slate-900">{acceptedRepair.machineNameHi || "Tractor"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">समस्या:</span>
                  <span className="font-bold text-slate-900">{acceptedRepair.problemDescription}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">आवश्यक सामग्री:</span>
                  <span className="font-bold text-emerald-800">{selectedPartsList.join(", ") || "कोई पार्ट नहीं"}</span>
                </div>
                {technicianMessageToFarmer && (
                  <div className="pt-1 text-[11px] text-slate-700 font-medium">
                    संदेश: &quot;{technicianMessageToFarmer}&quot;
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-amber-50 rounded-md border border-amber-200 text-xs font-medium text-amber-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  किसान का स्थान: <strong>{acceptedRepair.farmerLocation?.village || "शाहपुर"}, {acceptedRepair.farmerLocation?.district || "लखनऊ"}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartTrip}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-md text-xs shadow-xs cursor-pointer transition-colors"
              >
                मरम्मत के लिए निकलें ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 6: COMPLETE REPAIR MODAL ================= */}
      {isCompletingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">मरम्मत पूर्ण चिह्नित करें</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCompletingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  कार्य का विवरण (Work Performed):
                </label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 font-medium text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  उपयोग किए गए स्पेयर पार्ट्स:
                </label>
                <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 font-medium text-xs text-slate-800">
                  {selectedPartsList.join(", ") || "कोई नया पार्ट नहीं लगा"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  अंतिम मरम्मत शुल्क (Final Labour Fee):
                </label>
                <input
                  type="number"
                  value={completionLabourFee}
                  onChange={(e) => setCompletionLabourFee(Number(e.target.value))}
                  className="w-full p-2 rounded-md border border-slate-300 font-bold text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompletingModalOpen(false)}
                  className="bg-white border border-slate-300 hover:bg-slate-50 py-2.5 rounded-md text-xs font-medium text-slate-700 cursor-pointer transition-colors"
                >
                  रद्द करें
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCompletion}
                  className="bg-emerald-700 hover:bg-emerald-800 py-2.5 rounded-md text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
                >
                  मरम्मत पूरी हुई ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating feedback toast */}
      {feedbackToast && (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto bg-slate-900 text-white px-4 py-2.5 rounded-md font-medium text-center text-xs shadow-lg border border-slate-800 animate-fadeIn">
          {feedbackToast}
        </div>
      )}
    </div>
  );
}
