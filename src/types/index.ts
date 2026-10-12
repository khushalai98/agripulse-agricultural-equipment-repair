export type MachineStatus = "active" | "issue" | "service_soon";

export type MaintenanceStatus = "upcoming" | "due" | "overdue";

export interface ServiceEvent {
  id: string;
  date: string;
  type: "service" | "repair";
  titleHi: string;
  notes?: string;
  itemsChecked?: string[];
  performedBy?: string;
}

export interface Machine {
  id: string;
  name: string;
  nameHi: string;
  type: string;
  icon: string;
  imageUrl?: string;
  status: MachineStatus;
  statusText: string;
  lastService: string;
  nextService: string;
  operatingHours: string;
  serviceHistory: string;
  previousRepairs: string;
  partsReplaced: string;
  // P2G Step 2: Preventive Maintenance
  lastServiceDate?: string;
  nextServiceDate?: string;
  serviceIntervalDays?: number;
  maintenanceItems?: string[];
  maintenanceStatus?: MaintenanceStatus;
  serviceEvents?: ServiceEvent[];
}

export type UrgencyType = "today" | "within_2_3_days" | "not_urgent" | "later";
export type FarmerRequiredTime = "today" | "within_2_3_days" | "not_urgent";
export type ProblemSeverity = "critical" | "high" | "medium" | "low";
export type CalculatedUrgency = "emergency" | "urgent" | "normal";

export interface CriticalFarmWindowResult {
  urgency: CalculatedUrgency;
  urgencyLabelHi: string;
  score: number;
  reason: string;
  recommendedResponseTime: string;
  safetyMessage?: string;
}

export type TechnicianWorkflowStatus =
  | "available"
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "repairing"
  | "completed";

export const TECHNICIAN_STATUS_LABELS_HI: Record<TechnicianWorkflowStatus, string> = {
  available: "उपलब्ध",
  assigned: "मैकेनिक नियुक्त हो गया है",
  on_the_way: "मैकेनिक रास्ते में है",
  arrived: "मैकेनिक पहुँच गया है",
  repairing: "मरम्मत चल रही है",
  completed: "मरम्मत पूरी हुई",
};

export type RepairStatus =
  | "reported"
  | "finding_mechanic"
  | "technician_assigned"
  | "mechanic_assigned"
  | "on_the_way"
  | "arrived"
  | "repairing"
  | "mechanic_accepted"
  | "repair_in_progress"
  | "verification"
  | "verification_pending"
  | "re_repair_required"
  | "completed";

// ─── P2E & P2K: Job Card Types ──────────────────────────────────────────────

export type JobCardStatus =
  | "मैकेनिक नियुक्त हो गया है"
  | "मैकेनिक रास्ते में है"
  | "मैकेनिक पहुँच गया है"
  | "मरम्मत चल रही है"
  | "मरम्मत पूरी हुई"
  | "मैकेनिक को भेजा गया"
  | "मैकेनिक ने काम स्वीकार किया"
  | "मरम्मत शुरू हो गई"
  | "verification_pending"
  | "दोबारा मरम्मत की जरूरत";

// ─── P2F: Spare Part Types ───────────────────────────────────────────────────

/** Technician's decision on a recommended part */
export type PartDecision = "needed" | "not_needed" | "pending";

/** Technician's per-part selection saved to job card */
export interface PartSelection {
  partId: string;
  partNameHi: string;
  decision: PartDecision;
}

export type ComplaintChannel = "APP" | "PHONE" | "ASSISTED" | "WHATSAPP";

export interface JobCard {
  jobId: string;
  repairRequestId: string;
  /** Hindi machine name */
  machine: string;
  machineIcon: string;
  /** Farmer's problem description */
  problem: string;
  /** AI diagnosis text */
  diagnosis: string;
  /** Calculated urgency level */
  urgency: string;
  /** Safety message if applicable */
  safetyMessage?: string;
  /** Technician details */
  technicianId: string;
  technicianNameHi: string;
  technicianPhone: string;
  technicianSkillHi: string;
  technicianDistanceKm: number;
  technicianRating: number;
  /** ISO timestamp of job card creation */
  createdAt: string;
  status: JobCardStatus;
  // ─── P2F: Spare Parts ─────────────────────────────────────────────────
  /** IDs of recommended spare parts */
  recommendedPartIds?: string[];
  /** matchedRule that generated recommendations */
  recommendationRule?: string;
  /** Technician's part decisions — saved locally */
  partSelections?: PartSelection[];
  // ─── P2F Step 2: Verification details ──────────────────────────────────
  verificationStatus?: "pending" | "passed" | "failed";
  verificationTime?: string;
  verificationNote?: string;
  verificationAttempt?: number;
  // ─── P2K Step 2 & P2L: Location, Dispatch & ID Consistency fields ─────────
  farmerId?: string;
  jobCardId?: string;
  verificationId?: string;
  farmerLocationText?: string;
  visualEvidence?: string;
  photoDataUrl?: string;
  technicianWorkflowStatus?: TechnicianWorkflowStatus;
  assignedAt?: string;
  onTheWayAt?: string;
  arrivedAt?: string;
  repairStartedAt?: string;
  repairCompletedAt?: string;
  assignedTechnicianName?: string;
  assignedTechnicianNameHi?: string;
  assignedTechnicianPhoto?: string;
  assignedTechnicianRating?: number;
  assignedTechnicianDistance?: string;
  assignedTechnicianBadge?: TechnicianVerificationBadge;
  routeUrl?: string;
  approxDistanceText?: string;
  // ─── P2O Step 2: Transparent Pricing ────────────────────────────────────
  estimatedCost?: PricingBreakdown;
  finalCost?: PricingBreakdown;
  priceAdjustment?: FinalPriceAdjustment;
  // ─── P2O Step 3: Technician Training & Certification ────────────────────
  technicianVerificationStatus?: TechnicianVerificationBadge;
  technicianExperienceYears?: number;
  // ─── P2O Step 4: Service Centre & Service Mode ──────────────────────────
  serviceMode?: ServiceMode;
  serviceCentreId?: string;
  serviceCentreNameHi?: string;
  serviceCentreType?: ServiceCentreType;
  serviceCentreAddress?: string;
  // ─── P2P Step 1: Feature Phone & Assisted Channel ───────────────────────
  channel?: ComplaintChannel;
  callerPhoneNumber?: string;
  // ─── P2Q: Human Override for Diagnosis ──────────────────────────────────
  technicianOverrideDiagnosis?: string;
}

export interface MachinePassportRecord {
  repairDate: string;
  diagnosis: string;
  technician: string;
  partsUsed: string[];
  repairResult: string;
  verificationResult: string;
  verificationId?: string;
  // ─── P2O Step 2: Transparent Pricing in Service History ─────────────────
  finalCost?: number;
  costBreakdown?: PricingBreakdown;
  // ─── P2Q: Recovery Engine & Passport Reference Fields ───────────────────
  problemDescription?: string;
  estimatedCost?: number;
  serviceCentreNameHi?: string;
  maintenanceRecommendation?: string;
  technicianOverrideDiagnosis?: string;
  // ─── Job-Ready Verification Fields ──────────────────────────────────────
  machineId?: string;
  repairId?: string;
  technicianId?: string;
  repairDetails?: string;
  jobOperation?: string;
  jobReadyStatus?: string;
  score?: number;
  verificationEvidence?: string[];
  farmerConfirmation?: boolean;
  timestamp?: string;
}

export type InputMethod = "voice" | "photo" | "video" | "text";

export type SyncStatus = "pending" | "synced";

export interface OutboxAction<T = unknown> {
  id: string;
  type: string;
  createdAt: string;
  payload: T;
  syncStatus: SyncStatus;
}

export type DiagnosisUrgency = "high" | "medium" | "low";

export type PhotoAnalysisSeverity = "low" | "medium" | "high";

export type DetectionClass =
  | "smoke"
  | "oil_leak"
  | "fuel_leak"
  | "damaged_part"
  | "loose_part"
  | "electrical_damage"
  | "overheating_sign";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface YOLODetection {
  label: DetectionClass;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface VisionResult {
  detected: boolean;
  detections: YOLODetection[];
  imageQuality: "good" | "poor";
}

export interface PhotoAnalysisResult {
  detectedIssue: string;
  confidence: number;
  evidence: string[];
  severity?: PhotoAnalysisSeverity;
  isClear: boolean;
  unclearReason?: string;
  annotatedArea?: string;
  actionHint?: string;
  rawDetails?: string;
  // P2I Step 2 YOLO Vision fields:
  detected?: boolean;
  imageQuality?: "good" | "poor";
  visionResult?: VisionResult;
  friendlyLabelHi?: string;
  confidenceLevelHi?: string;
  safetyWarning?: string | null;
}

export type DiagnosisSufficiencyStatus = "sufficient" | "insufficient" | "unsafe_to_diagnose";
export type DiagnosisNextAction =
  | "SELF_CHECK"
  | "GET_MECHANIC"
  | "NEED_MORE_INFORMATION"
  | "STOP_MACHINE"
  | "GENERAL_GUIDANCE";

export interface DiagnosisConversationMessage {
  role: "farmer" | "assistant";
  content: string;
}

export interface GeminiStructuredDiagnosis {
  status: DiagnosisSufficiencyStatus;
  machine: string;
  problem: string;
  problem_category: string;
  severity: "safe" | "caution" | "danger" | "unknown";
  possible_causes: string[];
  self_check_allowed: boolean;
  immediate_actions: string[];
  should_stop_machine: boolean;
  mechanic_required: boolean;
  next_action: DiagnosisNextAction;
  question: string;
  message: string;
  // Farmer-Friendly Natural Structured Fields
  explanation?: string;
  steps?: string[];
  avoid?: string[];
  when_to_call_mechanic?: string;
  urgency?: "low" | "medium" | "high" | "critical" | string;
  urgency_explanation?: string;
  voice_summary?: string;
}

export interface StructuredAIDiagnosisResponse {
  diagnosis: string;
  confidence: number;
  reasons: string[];
  recommendedAction: string;
  severity: "critical" | "high" | "medium" | "low";
  safetyWarning: string | null;
  // Intelligent diagnosis extensions
  sufficiencyStatus?: DiagnosisSufficiencyStatus;
  machineIdentified?: string;
  problemCategory?: string;
  selfCheckAllowed?: boolean;
  immediateActions?: string[];
  shouldStopMachine?: boolean;
  mechanicRequired?: boolean;
  nextAction?: DiagnosisNextAction;
  question?: string;
  farmerMessage?: string;
  // Farmer-Friendly Natural Structured Fields
  farmerProblem?: string;
  farmerExplanation?: string;
  farmerSteps?: string[];
  farmerAvoid?: string[];
  whenToCallMechanic?: string;
  urgencyExplanation?: string;
  voiceSummary?: string;
}

export interface AIDiagnosisResult {
  id: string;
  possibleProblem: string;
  confidence: string;
  confidenceValue: number;
  reasons: string[];
  safeAction: string;
  urgencyLevel: DiagnosisUrgency;
  urgencyText: string;
  urgencyColor: string;
  disclaimer: string;
  matchedRule: string;
  timestamp: string;
  photoAnalysis?: PhotoAnalysisResult;
  severity?: ProblemSeverity;
  // P2I Step 1: Real AI Integration & Fallback metadata
  safetyWarning?: string | null;
  isFallback?: boolean;
  fallbackNote?: string | null;
  provider?: "cloud_ai" | "local_engine";
  // Intelligent Step-by-Step Gemini Diagnosis Workflow
  sufficiencyStatus?: DiagnosisSufficiencyStatus;
  machineIdentified?: string;
  problemCategory?: string;
  selfCheckAllowed?: boolean;
  immediateActions?: string[];
  shouldStopMachine?: boolean;
  mechanicRequired?: boolean;
  nextAction?: DiagnosisNextAction;
  question?: string;
  farmerMessage?: string;
  conversationHistory?: DiagnosisConversationMessage[];
  // Farmer-Friendly Natural Structured Fields
  farmerProblem?: string;
  farmerExplanation?: string;
  farmerSteps?: string[];
  farmerAvoid?: string[];
  whenToCallMechanic?: string;
  urgencyExplanation?: string;
  voiceSummary?: string;
}

export interface RepairRequest {
  id: string;
  machineId: string;
  machineNameHi: string;
  machineIcon: string;
  problemDescription: string;
  inputMethod: InputMethod;
  mediaFileName?: string;
  photoDataUrl?: string;
  urgency: UrgencyType;
  status: RepairStatus;
  statusTextHi: string;
  createdAt: string;
  verificationStatus: "pending" | "passed" | "failed" | "verified" | "unverified";
  syncStatus: SyncStatus;
  isOfflineCreated?: boolean;
  diagnosis?: AIDiagnosisResult;
  severity?: ProblemSeverity;
  calculatedUrgency?: CalculatedUrgency;
  requiredBy?: FarmerRequiredTime;
  safetyMessage?: string;
  // P2F: Spare part recommendations attached to repair request
  recommendedParts?: string[];
  selectedParts?: PartSelection[];
  partAvailability?: Record<string, boolean>;
  // P2F Step 2: Verification details & Machine Passport preparation
  verificationTime?: string;
  verificationNote?: string;
  verificationAttempt?: number;
  passportData?: MachinePassportRecord;
  // ─── P2K Step 2 & P2L: Technician Dispatch, Location & ID Consistency ────
  farmerId?: string;
  technicianId?: string;
  jobCardId?: string;
  verificationId?: string;
  assignedAt?: string;
  selectedTechnician?: any;
  technicianWorkflowStatus?: TechnicianWorkflowStatus;
  approxDistanceText?: string;
  routeUrl?: string;
  farmerLocation?: {
    latitude: number;
    longitude: number;
    locationSource?: string;
    locationUpdatedAt?: string;
    accuracy?: number;
    village?: string;
    district?: string;
  };
  // ─── P2O Step 2: Transparent Pricing ────────────────────────────────────
  estimatedCost?: PricingBreakdown;
  finalCost?: PricingBreakdown;
  priceAdjustment?: FinalPriceAdjustment;
  // ─── P2O Step 3: Technician Training & Certification ────────────────────
  technicianVerificationStatus?: TechnicianVerificationBadge;
  technicianExperienceYears?: number;
  // ─── P2O Step 4: Service Centre & Service Mode ──────────────────────────
  serviceMode?: ServiceMode;
  serviceCentreId?: string;
  serviceCentreNameHi?: string;
  serviceCentreType?: ServiceCentreType;
  serviceCentreAddress?: string;
  // ─── P2P Step 1: Feature Phone & Assisted Channel ───────────────────────
  channel?: ComplaintChannel;
  callerPhoneNumber?: string;
  assistedOperatorId?: string;
  assistedOperatorNameHi?: string;
  // ─── Technician Repair Request Workflow fields ─────────────────────────
  farmerName?: string;
  farmerPhone?: string;
  requiredTools?: string[];
  technicianMessageToFarmer?: string;
  rejectionReason?: string;
  isSimulatedDemo?: boolean;
  // ─── Simulated Technician Tracking & Display Flow ─────────────────────────
  onTheWayAt?: string;
  arrivedAt?: string;
  repairStartedAt?: string;
  repairCompletedAt?: string;
  assignedTechnicianName?: string;
  assignedTechnicianNameHi?: string;
  assignedTechnicianPhoto?: string;
  assignedTechnicianRating?: number;
  assignedTechnicianDistance?: string;
  assignedTechnicianBadge?: string;
}

// ─── P2O Step 2: Transparent Pricing Interfaces ─────────────────────────────

export interface PricingBreakdown {
  diagnosticFee: number;
  labourFee: number;
  partsEstimate: number;
  travelFee: number;
  discount: number;
  total: number;
  currency: string;
  isDemoPricing: boolean;
  pricingTier?: string;
  discountReason?: string;
}

export type PriceChangeReason =
  | "अतिरिक्त पार्ट खराब मिला"
  | "अतिरिक्त श्रम आवश्यक"
  | "मूल पार्ट उपलब्ध नहीं"
  | "अन्य";

export interface FinalPriceAdjustment {
  estimatedTotal: number;
  revisedTotal: number;
  difference: number;
  reason: PriceChangeReason;
  customReasonNote?: string;
  adjustedAt: string;
  adjustedByTechnicianId?: string;
}

// ─── P2O Step 3: Technician Training & Certification Types ───────────────────

export type CertificationStatus = "verified" | "pending" | "expired";
export type TrainingStatus = "Completed" | "In Progress" | "Expired";
export type TechnicianVerificationBadge = "verified" | "pending" | "expired";

export interface TechnicianCertification {
  id: string;
  certificationName: string;
  category: string;
  issuingOrganization: string;
  certificationLevel: "Basic" | "Advanced" | "Master";
  issueDate: string;
  expiryDate?: string;
  verificationStatus: CertificationStatus;
  isDemoRecord: boolean;
  certificateNumber?: string;
}

export interface TechnicianTrainingRecord {
  id: string;
  trainingTitle: string;
  category: string;
  completionDate: string;
  trainingProvider: string;
  status: TrainingStatus;
  isDemoRecord: boolean;
}

// ─── P2O Step 4: Local Service Centre / FPO Network Types ───────────────────

export type ServiceCentreType =
  | "Local Workshop"
  | "FPO"
  | "Cooperative"
  | "Entrepreneur-operated Centre"
  | "Authorized/Partner Service Centre";

export type ServiceCentreVerificationStatus = "verified" | "pending" | "unverified";

export type ServiceMode = "doorstep" | "workshop";

export interface ServiceCentreStockedPart {
  partId: string;
  partNameHi: string;
  inStock: boolean;
  quantity?: number;
  availabilityStatus: "उपलब्ध (In Stock)" | "सीमित स्टॉक (Limited)" | "ऑर्डर पर (On Order)";
}

export interface ServiceCentreAffiliatedTechnician {
  technicianId: string;
  role: "employed" | "affiliate" | "on_call_partner";
  assignedDate: string;
  isActive: boolean;
}

export interface ServiceCentreEquipmentCapability {
  category: string;
  supportedBrands: string[];
  serviceTypesOffered: ("minor_repair" | "major_overhaul" | "periodic_service" | "diagnostics")[];
}

export interface FPODetails {
  fpoName: string;
  cinOrRegNo: string;
  memberFarmerCount: number;
  affiliatedVillages: string[];
  customHiringCentreAvailable: boolean;
  subsidizedPricingForMembers: boolean;
  memberDiscountPercentage: number;
}

export interface CooperativeDetails {
  societyName: string;
  registrationDistrict: string;
  pacsAffiliated: boolean;
}

export interface ServiceCentre {
  id: string;
  name: string;
  nameHi: string;
  centreType: ServiceCentreType;
  operatingOrgName?: string;
  operatingOrgType?: "FPO" | "Cooperative" | "Entrepreneur" | "Private Workshop" | "Govt_Custom_Hiring_Centre";
  location: {
    lat: number;
    lng: number;
    addressHi: string;
    district: string;
  };
  distanceKm?: number;
  serviceAreaKm: number;
  equipmentCategories: string[];
  technicalCapabilities: string[];
  associatedTechnicianIds: string[];
  stockedParts: ServiceCentreStockedPart[];
  operatingStatus: "Open" | "Closed" | "Busy";
  phone: string;
  managerNameHi?: string;
  verificationStatus: ServiceCentreVerificationStatus;
  isDemoRecord: boolean;
  notesHi?: string;
  // Deep FPO / Cooperative & Network Relationships
  technicianAffiliations?: ServiceCentreAffiliatedTechnician[];
  supportedEquipmentDetails?: ServiceCentreEquipmentCapability[];
  fpoDetails?: FPODetails;
  cooperativeDetails?: CooperativeDetails;
  sparePartSupplierId?: string;
}

// ─── P2J Step 1: Backend & Cloud Sync Types ─────────────────────────────────

export type SyncEntityType =
  | "farmer_profile"
  | "machine"
  | "repair_request"
  | "job_card"
  | "spare_parts_selection"
  | "repair_verification"
  | "machine_passport"
  | "maintenance_record"
  | "job_readiness_record";

export type SyncOperationType = "create" | "update" | "delete";

export type SyncOperationStatus = "pending" | "syncing" | "synced" | "failed";

export interface SyncOperation {
  operationId: string;
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  payload: any;
  createdAt: string;
  retryCount: number;
  syncStatus: SyncOperationStatus;
  lastAttemptAt?: string;
  errorMessage?: string;
  isConflict?: boolean;
}

export interface SyncBatchResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  results: Array<{
    operationId: string;
    success: boolean;
    error?: string;
    serverTimestamp?: string;
  }>;
}

// ─── P2P Step 1: Feature Phone & Telephony Types ────────────────────────────

export interface SMSNotification {
  id: string;
  recipientPhone: string;
  messageTextHi: string;
  eventType: "complaint_created" | "technician_assigned" | "technician_arriving" | "repair_completed" | "repair_verified" | "status_inquiry";
  sentAt: string;
  deliveryStatus: "simulated_sent" | "delivered" | "failed";
  complaintId?: string;
  isDemoSimulation: boolean;
}

// ─── P2O Step 5: Scalable & Sustainable Business Model Types ─────────────────

export type MaintenancePackageTier = "basic" | "standard" | "comprehensive";

export interface MaintenancePackage {
  id: string;
  tier: MaintenancePackageTier;
  titleHi: string;
  subtitleHi: string;
  descriptionHi: string;
  machineTypes: string[];
  price: number;
  originalPrice: number;
  discountNoteHi?: string;
  includedServicesHi: string[];
  includedConsumablesHi: string[];
  validityDays: number;
  isDemoPackage: boolean;
}

export interface BusinessModelConfig {
  technicianLabourSharePercent: number; // e.g. 85%
  technicianTravelSharePercent: number; // 100%
  serviceCentreLabourSharePercent: number; // e.g. 80%
  serviceCentrePartsSharePercent: number; // e.g. 95%
  platformFacilitationFeePercent: number; // e.g. 10%
  isConfigurable: boolean;
}

export interface TechnicianSettlement {
  technicianId: string;
  technicianNameHi: string;
  totalJobs: number;
  grossLabour: number;
  travelReimbursement: number;
  platformFeeDeducted: number;
  netPayableToTechnician: number;
  settlementStatus: "pending" | "settled";
}

export interface ServiceCentreSettlement {
  serviceCentreId: string;
  serviceCentreNameHi: string;
  totalJobs: number;
  partsRevenue: number;
  workshopLabourRevenue: number;
  diagnosticsRevenue: number;
  maintenancePackageRevenue: number;
  platformFeeDeducted: number;
  netPayableToCentre: number;
}

export interface PlatformBusinessSummary {
  totalJobsCompleted: number;
  grossServiceVolume: number;
  technicianPayouts: number;
  serviceCentrePayouts: number;
  sparePartsVolume: number;
  maintenancePackageVolume: number;
  platformRevenue: number;
  averageFarmerSavings: number;
  isSimulatedMetrics: boolean;
}

// ─── P2Q: AgriPulse Recovery Engine Types ───────────────────────────────────

export type RecoveryStatus =
  | "machine_down"
  | "recovery_planning"
  | "arranging_technician_parts"
  | "repair_in_progress"
  | "farm_ready";

export type RecoveryOptionType = "fastest" | "nearest_centre" | "lowest_cost";

export interface RecoveryOption {
  id: string;
  type: RecoveryOptionType;
  badgeHi: string;
  serviceMode: "doorstep" | "workshop";
  providerNameHi: string;
  providerTypeHi: string;
  technicianId?: string;
  serviceCentreId?: string;
  distanceKm: number;
  distanceText: string;
  estimatedServiceTimeHours: number;
  estimatedServiceTimeTextHi: string;
  pricing: PricingBreakdown;
  reasonHi: string;
  partsAvailable: boolean;
  isAvailable: boolean;
  prosHi: string[];
}

export interface RecoveryPlan {
  machineId: string;
  machineNameHi: string;
  machineIcon: string;
  problemSummaryHi: string;
  recoveryStatus: RecoveryStatus;
  urgencyLevel: string;
  isCriticalFarmWindow: boolean;
  criticalWindowTextHi?: string;
  aiConfidence: "high" | "medium" | "low" | "uncertain";
  confidenceAdviceHi: string;
  safetyWarning?: string | null;
  partsBottleneckDetected: boolean;
  partsBottleneckAdviceHi?: string;
  previousIssueNoticeHi?: string;
  recoveryOptions: RecoveryOption[];
  selectedOptionId?: string;
  isOffline: boolean;
  generatedAt: string;
}

// ─── P3: WhatsApp Support Backend Integration Types ─────────────────────────

export type WhatsAppMessageType = "text" | "image" | "audio" | "interactive";

export interface WhatsAppIncomingMessage {
  from: string; // E.164 phone number, e.g. "919876543210"
  id: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: { body: string };
  image?: { id: string; mime_type?: string; caption?: string; url?: string; sha256?: string; base64?: string };
  audio?: { id: string; mime_type?: string; voice?: boolean; url?: string };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

export interface WhatsAppOutgoingMessage {
  to: string;
  type: "text" | "interactive";
  text?: { body: string };
  interactive?: {
    type: "button" | "list";
    header?: { type: "text"; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      buttons?: Array<{ type: "reply"; reply: { id: string; title: string } }>;
      button?: string;
      sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
    };
  };
}

export interface WhatsAppSession {
  phoneNumber: string;
  farmerName?: string;
  language: string;
  state: "idle" | "awaiting_photo" | "confirming_booking" | "in_diagnosis";
  conversationContext: Array<{ role: "farmer" | "assistant"; content: string }>;
  activeRepairRequestId?: string;
  lastActive: string;
}

// ─── P3: Spare Parts Network & Multi-Supplier Types ─────────────────────────

export type SupplierType = "oem_distributor" | "local_retailer" | "fpo_depot" | "authorized_dealer";

export interface Supplier {
  id: string;
  name: string;
  nameHi: string;
  supplierType: SupplierType;
  contactPhone: string;
  email?: string;
  location: {
    lat: number;
    lng: number;
    addressHi: string;
    district: string;
    state: string;
    pincode: string;
  };
  distanceKm?: number;
  rating: number;
  verifiedStatus: "verified" | "pending";
  deliveryAvailable: boolean;
  deliveryRadiusKm: number;
  operatingStatus: "open" | "closed";
  notesHi?: string;
}

export interface SparePartStockItem {
  supplierId: string;
  partId: string;
  inStock: boolean;
  quantity: number;
  unitPrice: number;
  wholesalePrice?: number;
  leadTimeHours: number;
  lastUpdated: string;
}

export interface SparePartCompatibilityRule {
  partId: string;
  machineType: string;
  machineModel?: string;
  engineModel?: string;
  notes?: string;
}

export interface NearbySupplierMatch {
  supplier: Supplier;
  distanceKm: number;
  distanceText: string;
  partAvailability: Array<{
    partId: string;
    partNameHi: string;
    partNameEn: string;
    inStock: boolean;
    quantity: number;
    unitPrice: number;
    leadTimeHours: number;
  }>;
  allRequestedPartsInStock: boolean;
  totalPartsCost: number;
  deliveryAvailable: boolean;
  estimatedDeliveryHours: number;
}

// ─── P3: Technician Training & Certification Architecture Types ─────────────

export interface TrainingModule {
  id: string;
  title: string;
  titleHi: string;
  descriptionHi: string;
  category: string;
  equipmentCategory: string;
  durationHours: number;
  passingScore: number;
  topicsHi: string[];
  certificationAwardedId?: string;
}

export interface TechnicianTrainingEnrollment {
  id: string;
  technicianId: string;
  moduleId: string;
  status: "enrolled" | "in_progress" | "completed" | "failed";
  enrolledAt: string;
  completedAt?: string;
  scorePercentage?: number;
  certificateAwardedNumber?: string;
}

export interface TechnicianSkillProfile {
  technicianId: string;
  verifiedSkills: Array<{
    skill: string;
    verifiedLevel: "basic" | "intermediate" | "master";
    verifiedAt: string;
  }>;
  authorizedEquipmentCategories: string[];
}

// ─── P3: Business & Multi-Party Revenue Breakdown Types ─────────────────────

export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";
export type PaymentMethod = "upi" | "cash_on_delivery" | "fpo_credit" | "netbanking";

export interface PaymentTransactionBreakdown {
  diagnosticFee: number;
  labourCharge: number;
  partsCost: number;
  travelCharge: number;
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  netFarmerPayable: number;
  // Transparent multi-party splits:
  technicianLabourShare: number;
  technicianTravelShare: number;
  technicianTotalPayout: number;
  supplierPartsShare: number;
  supplierTotalPayout: number;
  serviceCentreCommission: number;
  platformLabourFee: number;
  platformPartsFee: number;
  platformTotalRevenue: number;
}

export interface PaymentTransaction {
  id: string;
  repairRequestId: string;
  jobCardId?: string;
  farmerId: string;
  farmerPhone: string;
  serviceCentreId?: string;
  technicianId?: string;
  supplierId?: string;
  breakdown: PaymentTransactionBreakdown;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  gatewayReference?: string;
  externalTransactionId?: string;
  upiVpa?: string;
  initiatedAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  notes?: string;
}

export interface SupplierSettlement {
  supplierId: string;
  supplierNameHi: string;
  totalOrders: number;
  grossPartsBilled: number;
  platformPartsFeeDeducted: number;
  netPayableToSupplier: number;
  settlementStatus: "pending" | "settled";
}

// ─── JOB-READY VERIFICATION TYPES ───────────────────────────────────────────

export type FarmOperation = "spraying";

export type JobReadyCheckId =
  | "no_leak"
  | "all_nozzles_active"
  | "spray_pattern_normal"
  | "safety_check"
  | "visual_analysis";

export type JobReadyCheckStatus = "pass" | "fail" | "pending";

export type JobReadyOverallStatus =
  | "JOB_READY"
  | "NOT_JOB_READY"
  | "STOP_AND_TECHNICIAN"
  | "NEED_RECHECK";

export interface JobReadyCheck {
  id: JobReadyCheckId;
  labelHi: string;
  status: JobReadyCheckStatus;
  isTechnicianVerified?: boolean;
  isRequired: boolean;
}

// ─── VISUAL ANALYSIS / YOLO ABSTRACTION LAYER ────────────────────────────────

/**
 * Source of the visual analysis.
 * - "mock_fallback": No real model connected. Deterministic safe result used.
 * - "local_yolo":    Real local YOLO/CV model produced this result.
 * - "cloud_vision": Cloud-based CV API produced this result.
 */
export type VisualAnalysisSource = "mock_fallback" | "local_yolo" | "cloud_vision";

/**
 * Structured result from the visual analysis layer.
 * All boolean fields use explicit true/false/null:
 *   - null  = could not determine (evidence_quality insufficient)
 *   - true  = detected
 *   - false = not detected
 */
export interface VisualAnalysisResult {
  /** Which engine produced this result */
  source: VisualAnalysisSource;

  /** Whether active spray from nozzles was detected */
  nozzle_activity: boolean | null;

  /** Whether a visible liquid leak was detected */
  visible_leak: boolean | null;

  /** Whether spray pattern appeared normal / uniform */
  spray_pattern: "normal" | "irregular" | "absent" | null;

  /** Whether physical damage was visible on machine body/fittings */
  visible_damage: boolean | null;

  /**
   * Quality of the submitted evidence.
   * - "good"         : clear, well-lit, sufficient
   * - "low_light"    : dark or blurry but still usable
   * - "insufficient" : too dark, out of focus or too short to analyse
   */
  evidence_quality: "good" | "low_light" | "insufficient";

  /** Confidence score 0-1 (1.0 for mock, model-specific otherwise) */
  confidence: number;

  /** ISO timestamp when analysis ran */
  analyzedAt: string;

  /** Human-readable note — NOT shown as final verdict to farmer */
  internalNote?: string;
}

/** Lightweight evidence metadata stored in the sync outbox */
export interface EvidenceCaptureMetadata {
  /** Unique capture session id */
  captureId: string;
  /** ISO timestamp of capture */
  capturedAt: string;
  /** "photo" | "video" */
  mediaType: "photo" | "video";
  /** Size in bytes (approximate) */
  sizeBytes?: number;
  /** Reference key — NOT the raw base64 data (kept out of sync payload) */
  localKey: string;
}

export interface JobReadinessRecord {
  id: string;
  machineId: string;
  repairRequestId: string;
  operation: FarmOperation;
  status: JobReadyOverallStatus;
  score: number;
  checks: JobReadyCheck[];
  /** Raw evidence data urls / object URLs — kept local, not synced in full */
  evidence: string[];
  /** Lightweight metadata for each piece of evidence — safe to sync */
  evidenceMetadata?: EvidenceCaptureMetadata[];
  /** Visual analysis result if evidence was analysed */
  visualAnalysis?: VisualAnalysisResult;
  technicianId?: string;
  technicianNameHi?: string;
  farmerVerified: boolean;
  createdAt: string;
}

