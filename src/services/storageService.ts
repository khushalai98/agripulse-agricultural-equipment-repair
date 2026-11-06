import {
  Machine,
  RepairRequest,
  RepairStatus,
  UrgencyType,
  InputMethod,
  OutboxAction,
  SyncStatus,
  AIDiagnosisResult,
  MachinePassportRecord,
  PricingBreakdown,
  FinalPriceAdjustment,
  ComplaintChannel,
} from "@/types";
import {
  normalizeMachineMaintenance,
  completeMachineService,
  createNewMachine,
  RegisterMachineParams,
} from "@/services/preventiveMaintenanceService";
import { enqueueSyncOperation, processSyncQueue } from "@/services/syncQueueService";

const MACHINES_STORAGE_KEY = "agripulse_machines_v1";
const REPAIRS_STORAGE_KEY = "agripulse_repairs_v1";
const OUTBOX_STORAGE_KEY = "agripulse_outbox_v1";

// In-memory concurrency lock to prevent duplicate simultaneous sync operations
let isSyncInProgress = false;

const getDaysOffset = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

export const initialMachines: Machine[] = [
  {
    id: "tractor",
    name: "Mahindra 575 DI Tractor",
    nameHi: "महिंद्रा 575 DI ट्रैक्टर",
    type: "ट्रैक्टर",
    icon: "🚜",
    imageUrl: "/assets/images/mahindra-575-di.png",
    status: "active",
    statusText: "चालू स्थिति में",
    lastService: "45 दिन पहले",
    nextService: "45 दिन बाद",
    operatingHours: "580 घंटे",
    serviceHistory: "4 बार नियमित सर्विस (इंजन ऑयल, फिल्टर, ब्रेक)",
    previousRepairs: "हाइड्रोलिक नोजल व पाइप बदला गया",
    partsReplaced: "हाइड्रोलिक होस पाइप, ऑयल सील",
    lastServiceDate: getDaysOffset(-45),
    nextServiceDate: getDaysOffset(45),
    serviceIntervalDays: 90,
    maintenanceItems: ["इंजन ऑयल", "हाइड्रोलिक ऑयल", "एयर फ़िल्टर", "डीजल फ़िल्टर", "ब्रेक जांच"],
    maintenanceStatus: "upcoming",
  },
  {
    id: "sprayer",
    name: "Sprayer",
    nameHi: "स्प्रेयर",
    type: "स्प्रेयर",
    icon: "🎒",
    imageUrl: "/assets/images/sprayer.png",
    status: "issue",
    statusText: "मरम्मत की जरूरत",
    lastService: "75 दिन पहले",
    nextService: "सर्विस बाकी है",
    operatingHours: "120 घंटे",
    serviceHistory: "2 बार नियमित सर्विस की गई",
    previousRepairs: "नोजल की सफाई और प्रेशर चेक",
    partsReplaced: "स्प्रे नोजल, रबर वाशर",
    // P2G Maintenance: Overdue (Test B)
    lastServiceDate: getDaysOffset(-75),
    nextServiceDate: getDaysOffset(-15),
    serviceIntervalDays: 60,
    maintenanceItems: ["नोज़ल", "पाइप", "पंप", "लीकेज", "फ़िल्टर"],
    maintenanceStatus: "overdue",
  },
  {
    id: "water_pump",
    name: "Water Pump",
    nameHi: "वाटर पंप",
    type: "वाटर पंप",
    icon: "💧",
    imageUrl: "/assets/images/water-pump.png",
    status: "active",
    statusText: "चालू स्थिति में",
    lastService: "20 दिन पहले",
    nextService: "70 दिन बाद",
    operatingHours: "340 घंटे",
    serviceHistory: "3 बार ऑयल व सील चेक",
    previousRepairs: "इंपेलर की सफाई",
    partsReplaced: "वॉटर सील, बेयरिंग",
    // P2G Maintenance: Upcoming
    lastServiceDate: getDaysOffset(-20),
    nextServiceDate: getDaysOffset(70),
    serviceIntervalDays: 90,
    maintenanceItems: ["पंप", "पाइप", "सील", "इंजन", "फ़िल्टर"],
    maintenanceStatus: "upcoming",
  },
  {
    id: "power_tiller",
    name: "Power Tiller",
    nameHi: "पावर टिलर",
    type: "पावर टिलर",
    icon: "🚜",
    imageUrl: "/assets/images/power-tiller.png",
    status: "service_soon",
    statusText: "अगली सर्विस जल्द",
    lastService: "82 दिन पहले",
    nextService: "8 दिन में",
    operatingHours: "210 घंटे",
    serviceHistory: "इंजन सर्विस व ब्लेड जांच",
    previousRepairs: "क्लच वायर बदला गया",
    partsReplaced: "एयर फ़िल्टर, इंजन ऑयल",
    // P2G Maintenance: Due soon (Test C)
    lastServiceDate: getDaysOffset(-82),
    nextServiceDate: getDaysOffset(8),
    serviceIntervalDays: 90,
    maintenanceItems: ["इंजन ऑयल", "ब्लेड", "बेल्ट", "एयर फ़िल्टर", "क्लच"],
    maintenanceStatus: "due",
  },
];

export function broadcastRepairUpdate(repair: RepairRequest): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("agripulse:repair_updated", { detail: repair }));
  } catch {}
  try {
    const bc = new BroadcastChannel("agripulse_channel");
    bc.postMessage({ type: "REPAIR_UPDATED", payload: repair });
    bc.close();
  } catch {}
}

export const DEMO_WATERPUMP_REPAIR: RepairRequest = {
  id: "rep-demo-waterpump-patil",
  farmerId: "farmer-ramesh-patil",
  farmerName: "Ramesh Patil",
  farmerPhone: "9876543210",
  machineId: "water_pump",
  machineNameHi: "Water Pump (वाटर पंप)",
  machineIcon: "💧",
  problemDescription: "Pump is running but water is not coming (पंप चल रहा है लेकिन पानी नहीं आ रहा है)",
  inputMethod: "voice",
  urgency: "today",
  status: "technician_assigned",
  statusTextHi: "मैकेनिक नियुक्त हुआ",
  technicianWorkflowStatus: "assigned",
  technicianId: "tech-005",
  assignedTechnicianName: "Mahesh Verma",
  assignedTechnicianNameHi: "महेश वर्मा",
  assignedTechnicianPhoto: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%2315803d'/><circle cx='50' cy='38' r='18' fill='%23fed7aa'/><path d='M20 86 c0 -18 14 -28 30 -28 s30 10 30 28 Z' fill='%23fed7aa'/><path d='M35 28 h30 v-6 c0 -4 -6 -8 -15 -8 s-15 4 -15 8 Z' fill='%230f172a'/><circle cx='43' cy='36' r='2.5' fill='%230f172a'/><circle cx='57' cy='36' r='2.5' fill='%230f172a'/><path d='M44 45 q6 5 12 0' stroke='%230f172a' stroke-width='2' fill='none'/></svg>",
  assignedTechnicianRating: 4.7,
  assignedTechnicianDistance: "3.2 किमी दूर",
  assignedTechnicianBadge: "verified",
  assignedAt: new Date(Date.now() - 1800000).toISOString(),
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  verificationStatus: "pending",
  syncStatus: "synced",
  approxDistanceText: "3.2 किमी दूर",
  routeUrl: "https://www.google.com/maps/dir/?api=1&destination=26.7991,80.8986",
  farmerLocation: {
    latitude: 26.7991,
    longitude: 80.8986,
    village: "शाहपुर",
    district: "लखनऊ, उत्तर प्रदेश",
  },
  diagnosis: {
    id: "diag-waterpump-prime-01",
    possibleProblem: "प्राइमिंग फेलियर (Air Lock) या वाटर सील/इंपेलर लीकेज",
    confidence: "92% (उच्च)",
    confidenceValue: 92,
    reasons: [
      "पंप मोटर घूम रही है मगर सक्शन पाइप में एयर लॉक होने से वैक्यूम नहीं बन रहा।",
      "सक्शन फुट वाल्व जाम हो सकता है या मैकेनिकल सील से हवा खींच रहा है।"
    ],
    safeAction: "पंप को तुरंत बंद करें। बिना पानी के मोटर ज्यादा देर न चलाएं।",
    urgencyLevel: "high",
    urgencyText: "जरूरी",
    urgencyColor: "bg-amber-100 text-amber-800 border-amber-300",
    disclaimer: "AI की संभावित जांच • भौतिक निरीक्षण आवश्यक है",
    matchedRule: "waterpump_dry_run_diagnosis",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    whenToCallMechanic: "सक्शन लाइन चेक करने व प्राइमिंग दुरुस्त करने हेतु प्रमाणित मैकेनिक से संपर्क करें।",
  },
  recommendedParts: ["Mechanical Water Seal", "Foot Valve Washer", "Priming Plug"],
};

export const initialRepairs: RepairRequest[] = [
  // Primary Demo: Ramesh Patil (Water Pump — Pump running but water not coming)
  DEMO_WATERPUMP_REPAIR,
  // Request A: Tractor — Engine not starting (High Urgency)
  {
    id: "rep-pawan-tractor-01",
    farmerId: "farmer-001",
    farmerName: "Pawan Gupta",
    farmerPhone: "9876543210",
    machineId: "tractor",
    machineNameHi: "Tractor (महिंद्रा ट्रैक्टर)",
    machineIcon: "🚜",
    problemDescription: "Tractor start नहीं हो रहा है, सेल्फ क्रैंक नहीं करता",
    inputMethod: "voice",
    urgency: "today",
    status: "finding_mechanic",
    statusTextHi: "मैकेनिक खोज रहे हैं",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    verificationStatus: "pending",
    syncStatus: "synced",
    approxDistanceText: "4.8 किमी दूर",
    routeUrl: "https://www.google.com/maps/dir/?api=1&destination=26.8467,80.9462",
    farmerLocation: {
      latitude: 26.8467,
      longitude: 80.9462,
      village: "शाहपुर",
      district: "लखनऊ, उत्तर प्रदेश",
    },
    diagnosis: {
      id: "diag-tractor-starter-01",
      possibleProblem: "Starting system व बैटरी वोल्टेज में खराबी की संभावना",
      confidence: "89% (उच्च)",
      confidenceValue: 89,
      reasons: [
        "सेल्फ स्टार्टर मोटर या सोलनॉइड स्विच में खराबी हो सकती है।",
        "बैटरी वोल्टेज पर्याप्त न होने पर स्टार्टर क्रैंक नहीं करता।",
        "इग्निशन रिले या मुख्य टर्मिनल में वायरिंग ढीली हो सकती है।"
      ],
      safeAction: "मशीन तुरंत बंद रखें। बैटरी टर्मिनल चेक करें और मैकेनिक का इंतजार करें।",
      urgencyLevel: "high",
      urgencyText: "जरूरी",
      urgencyColor: "bg-amber-100 text-amber-800 border-amber-300",
      disclaimer: "AI की संभावित जांच • भौतिक निरीक्षण आवश्यक है",
      matchedRule: "starter_system_diagnosis",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      whenToCallMechanic: "यदि बैटरी टर्मिनल साफ होने पर भी क्रैंक न हो, तो तुरंत प्रमाणित मैकेनिक को बुलाएं।",
    },
    recommendedParts: ["Starter Motor", "Battery Cable"],
  },
  // Request B: Power Tiller — Abnormal noise & vibration (Medium Urgency)
  {
    id: "rep-ramlal-tiller-02",
    farmerId: "farmer-002",
    farmerName: "Ramlal Yadav",
    farmerPhone: "9812345671",
    machineId: "power_tiller",
    machineNameHi: "Power Tiller (पावर टिलर)",
    machineIcon: "🚜",
    problemDescription: "पावर टिलर से असामान्य तेज आवाज और अत्यधिक कंपन आ रहा है",
    inputMethod: "text",
    urgency: "within_2_3_days",
    status: "finding_mechanic",
    statusTextHi: "मैकेनिक खोज रहे हैं",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    verificationStatus: "pending",
    syncStatus: "synced",
    approxDistanceText: "7.4 किमी दूर",
    routeUrl: "https://www.google.com/maps/dir/?api=1&destination=26.9200,80.8600",
    farmerLocation: {
      latitude: 26.9200,
      longitude: 80.8600,
      village: "माल",
      district: "मलिहाबाद, लखनऊ",
    },
    diagnosis: {
      id: "diag-tiller-noise-02",
      possibleProblem: "ट्रांसमिशन रोटरी गियरबॉक्स या इंजन माउंटिंग में ढीलापन",
      confidence: "84% (मध्यम)",
      confidenceValue: 84,
      reasons: [
        "टिलर रोटरी गियरबॉक्स में बेयरिंग खराब होने से आवाज आती है।",
        "इंजन फाउंडेशन बोल्ट ढीले होने से अत्यधिक कंपन होता है।"
      ],
      safeAction: "टिलर का आरपीएम कम रखें और भारी जुताई तुरंत रोक दें।",
      urgencyLevel: "medium",
      urgencyText: "मध्यम",
      urgencyColor: "bg-blue-100 text-blue-800 border-blue-300",
      disclaimer: "AI की संभावित जांच • भौतिक निरीक्षण आवश्यक है",
      matchedRule: "transmission_vibration_diagnosis",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      whenToCallMechanic: "गियरबॉक्स से लगातार आवाज आने पर तेल जांचें व मैकेनिक से परीक्षण कराएं।",
    },
    recommendedParts: ["Gearbox Bearing", "Mounting Bolts"],
  },
  // Request C: Sprayer — Pressure problem & nozzle leak (High Urgency)
  {
    id: "rep-kishore-sprayer-03",
    farmerId: "farmer-003",
    farmerName: "Kishore Verma",
    farmerPhone: "9823456712",
    machineId: "sprayer",
    machineNameHi: "Power Sprayer (स्प्रेयर)",
    machineIcon: "🎒",
    problemDescription: "स्प्रेयर में प्रेशर नहीं बन रहा है और नोजल से रिसाव हो रहा है",
    inputMethod: "photo",
    urgency: "today",
    status: "finding_mechanic",
    statusTextHi: "मैकेनिक खोज रहे हैं",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    verificationStatus: "pending",
    syncStatus: "synced",
    approxDistanceText: "5.6 किमी दूर",
    routeUrl: "https://www.google.com/maps/dir/?api=1&destination=26.6800,80.9800",
    farmerLocation: {
      latitude: 26.6800,
      longitude: 80.9800,
      village: "मोहनलालगंज",
      district: "लखनऊ, उत्तर प्रदेश",
    },
    diagnosis: {
      id: "diag-sprayer-pressure-03",
      possibleProblem: "प्रेशर रेगुलेटर वाल्व या पंप पिस्टन सील खराब होने की संभावना",
      confidence: "91% (उच्च)",
      confidenceValue: 91,
      reasons: [
        "प्रेशर वाल्व में कचरा आने से दबाव स्थिर नहीं रहता।",
        "पंप की रबर ओ-रिंग घिस जाने से नोजल में लीकेज होती है।"
      ],
      safeAction: "केमिकल स्प्रे तुरंत रोकें और साफ पानी से नोजल धोएं।",
      urgencyLevel: "high",
      urgencyText: "जरूरी",
      urgencyColor: "bg-amber-100 text-amber-800 border-amber-300",
      disclaimer: "AI की संभावित जांच • भौतिक निरीक्षण आवश्यक है",
      matchedRule: "sprayer_pressure_diagnosis",
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      whenToCallMechanic: "दबाव न बनने की स्थिति में सील और वाल्व बदलवाने हेतु मैकेनिक से संपर्क करें।",
    },
    recommendedParts: ["Pressure Valve", "Nozzle O-Ring"],
  },
  // Request D: Water Pump — Motor not running, only humming (Medium Urgency)
  {
    id: "rep-haripal-pump-04",
    farmerId: "farmer-004",
    farmerName: "Haripal Singh",
    farmerPhone: "9834567123",
    machineId: "water_pump",
    machineNameHi: "Water Pump (वाटर पंप)",
    machineIcon: "💧",
    problemDescription: "मोटर चालू नहीं हो रही है, स्टार्टर से सिर्फ हमिंग की आवाज आती है",
    inputMethod: "text",
    urgency: "within_2_3_days",
    status: "finding_mechanic",
    statusTextHi: "मैकेनिक खोज रहे हैं",
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    verificationStatus: "pending",
    syncStatus: "synced",
    approxDistanceText: "6.8 किमी दूर",
    routeUrl: "https://www.google.com/maps/dir/?api=1&destination=27.0100,80.9100",
    farmerLocation: {
      latitude: 27.0100,
      longitude: 80.9100,
      village: "बक्शी का तालाब",
      district: "लखनऊ, उत्तर प्रदेश",
    },
    diagnosis: {
      id: "diag-pump-motor-04",
      possibleProblem: "स्टार्टर कैपेसिटर या मोटर वाइंडिंग में फाल्ट",
      confidence: "86% (उच्च)",
      confidenceValue: 86,
      reasons: [
        "सिंगल फेज कैपेसिटर वीक होने से मोटर स्टार्ट टॉर्क नहीं ले पाती।",
        "इंपेलर में मिट्टी या कचरा फंसने से रोटर जाम हो सकता है।"
      ],
      safeAction: "पावर सप्लाई तुरंत बंद करें ताकि मोटर वाइंडिंग न जले।",
      urgencyLevel: "medium",
      urgencyText: "मध्यम",
      urgencyColor: "bg-blue-100 text-blue-800 border-blue-300",
      disclaimer: "AI की संभावित जांच • भौतिक निरीक्षण आवश्यक है",
      matchedRule: "pump_motor_diagnosis",
      timestamp: new Date(Date.now() - 14400000).toISOString(),
      whenToCallMechanic: "कैपेसिटर और वाइंडिंग रेजिस्टेंस जांच हेतु प्रमाणित इलेक्ट्रीशियन/मैकेनिक बुलाएं।",
    },
    recommendedParts: ["Running Capacitor", "Suction Washer"],
  },
];

// Helper to safely access localStorage (client-side only)
function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/**
 * Load all machines from local storage or fallback to defaults.
 * Automatically normalizes maintenance dates and statuses.
 */
export function getMachines(): Machine[] {
  if (!isStorageAvailable()) return initialMachines.map((m) => normalizeMachineMaintenance(m));
  try {
    const raw = localStorage.getItem(MACHINES_STORAGE_KEY);
    if (!raw) {
      const normalizedInit = initialMachines.map((m) => normalizeMachineMaintenance(m));
      localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(normalizedInit));
      return normalizedInit;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((m: Machine) => normalizeMachineMaintenance(m));
    }
    return initialMachines.map((m) => normalizeMachineMaintenance(m));
  } catch {
    return initialMachines.map((m) => normalizeMachineMaintenance(m));
  }
}

/**
 * Save machines array to local storage
 */
export function saveMachines(machines: Machine[]): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(machines));
  } catch {
    // Fail silently in browser
  }
}

/**
 * P2G Step 2: Register a new machine with automatic maintenance schedule.
 */
export function registerNewMachine(params: RegisterMachineParams): Machine {
  const newMachine = createNewMachine(params);
  if (isStorageAvailable()) {
    try {
      const current = getMachines();
      const updated = [newMachine, ...current];
      saveMachines(updated);

      // P2J Step 1: Enqueue machine creation to persistent sync queue
      enqueueSyncOperation({
        entityType: "machine",
        entityId: newMachine.id,
        operationType: "create",
        payload: newMachine,
      });
    } catch {
      // Fail silently
    }
  }
  return newMachine;
}

/**
 * P2G Step 2: Mark a machine's preventive service as completed.
 * Recalculates nextServiceDate, resets status to 'upcoming',
 * records service event in machine history.
 */
export function markMachineServiceCompleted(machineId: string): Machine | null {
  if (!isStorageAvailable()) return null;
  try {
    const machines = getMachines();
    const idx = machines.findIndex((m) => m.id === machineId);
    if (idx === -1) return null;
    const updated = completeMachineService(machines[idx]);
    machines[idx] = updated;
    saveMachines(machines);

    // P2J Step 1: Enqueue maintenance record update
    enqueueSyncOperation({
      entityType: "maintenance_record",
      entityId: `${machineId}-svc-${Date.now()}`,
      operationType: "create",
      payload: {
        machineId,
        lastServiceDate: updated.lastServiceDate,
        nextServiceDate: updated.nextServiceDate,
        maintenanceStatus: updated.maintenanceStatus,
        completedAt: new Date().toISOString(),
      },
    });

    return updated;
  } catch {
    return null;
  }
}

/**
 * Get machine by ID
 */
export function getMachineById(id: string): Machine | undefined {
  const machines = getMachines();
  return machines.find((m) => m.id === id);
}

/**
 * Load all repair requests, ensuring unique IDs (deduplication)
 */
let inMemoryRepairs: RepairRequest[] = [...initialRepairs];

export function getRepairRequests(): RepairRequest[] {
  if (!isStorageAvailable()) return inMemoryRepairs;
  try {
    const raw = localStorage.getItem(REPAIRS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(initialRepairs));
      return initialRepairs;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // If legacy demo ID only, re-seed with realistic requests
      if (parsed.length === 1 && parsed[0]?.id === "rep-demo-pawan-tractor") {
        localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(initialRepairs));
        return initialRepairs;
      }
      // Deduplicate by id to guarantee integrity and prevent overwriting
      const seen = new Set<string>();
      return parsed
        .filter((r: RepairRequest) => r.id !== "rep-demo-pawan-tractor")
        .filter((r: RepairRequest) => {
          if (!r.id || seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
    }
    return initialRepairs;
  } catch {
    return initialRepairs;
  }
}

/**
 * Get count of complaints still waiting to be synced
 */
export function getPendingComplaintsCount(): number {
  const repairs = getRepairRequests();
  return repairs.filter((r) => r.syncStatus === "pending").length;
}

/**
 * Get latest active repair request
 */
export function getActiveRepair(): RepairRequest | null {
  const repairs = getRepairRequests();
  const active = repairs.find((r) => r.status !== "completed");
  return active || (repairs.length > 0 ? repairs[0] : null);
}

/**
 * Load local outbox actions
 */
export function getOutbox(): OutboxAction[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Add an action to the local outbox, preventing duplicate entries with the same ID
 */
export function addToOutbox(
  action: Omit<OutboxAction, "id" | "createdAt"> & { id?: string }
): OutboxAction {
  const newAction: OutboxAction = {
    id: action.id || `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: action.type,
    createdAt: new Date().toISOString(),
    payload: action.payload,
    syncStatus: action.syncStatus,
  };

  if (isStorageAvailable()) {
    try {
      const current = getOutbox();
      // Deduplication: do not add if an action with this id already exists
      if (!current.some((item) => item.id === newAction.id)) {
        const updated = [newAction, ...current];
        localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // Fail silently
    }
  }

  return newAction;
}

/**
 * Process automatic synchronization of pending complaints from the local queue.
 *
 * Rules:
 * 1. Simulates realistic network delay (800ms).
 * 2. Deduplicates complaints using a processed ID set and in-flight sync lock.
 * 3. Never deletes complaints on failure; keeps them as pending.
 * 4. Only marks as "synced" upon successful processing.
 */
export async function syncPendingOutbox(): Promise<{
  success: boolean;
  syncedCount: number;
  error?: string;
}> {
  if (!isStorageAvailable()) {
    return { success: true, syncedCount: 0 };
  }

  // Prevent duplicate concurrent sync runs
  if (isSyncInProgress) {
    return { success: false, syncedCount: 0, error: "Sync already in progress" };
  }

  isSyncInProgress = true;

  try {
    const outbox = getOutbox();
    const pendingActions = outbox.filter((item) => item.syncStatus === "pending");

    if (pendingActions.length === 0) {
      isSyncInProgress = false;
      return { success: true, syncedCount: 0 };
    }

    // Simulate reliable upload processing delay
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Deduplication tracking: process each unique complaint ID exactly once
    const processedComplaintIds = new Set<string>();

    const updatedOutbox = outbox.map((item) => {
      if (item.syncStatus === "pending") {
        const complaint = item.payload as RepairRequest;
        if (complaint && complaint.id) {
          processedComplaintIds.add(complaint.id);
        }
        return { ...item, syncStatus: "synced" as SyncStatus };
      }
      return item;
    });

    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(updatedOutbox));

    // Update corresponding local repair requests
    const repairs = getRepairRequests();
    const updatedRepairs = repairs.map((repair) => {
      if (repair.syncStatus === "pending" || processedComplaintIds.has(repair.id)) {
        return {
          ...repair,
          syncStatus: "synced" as SyncStatus,
          statusTextHi: "मैकेनिक खोज रहे हैं",
        };
      }
      return repair;
    });

    // Ensure deduplication in repairs list
    const seen = new Set<string>();
    const deduplicatedRepairs = updatedRepairs.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(deduplicatedRepairs));

    // P2J Step 1: Process persistent sync queue to backend provider
    await processSyncQueue({ force: true }).catch(() => null);

    isSyncInProgress = false;
    return { success: true, syncedCount: processedComplaintIds.size };
  } catch {
    // If sync fails, do NOT delete local complaints. Leave them pending for retry.
    isSyncInProgress = false;
    return { success: false, syncedCount: 0, error: "Sync failed, kept in local queue" };
  }
}

/**
 * Create and persist a new repair request with unique ID and offline queueing
 */
export function createRepairRequest(params: {
  machineId: string;
  problemDescription: string;
  inputMethod: InputMethod;
  mediaFileName?: string;
  photoDataUrl?: string;
  urgency: UrgencyType;
  isOffline?: boolean;
  diagnosis?: AIDiagnosisResult;
  farmerId?: string;
  estimatedCost?: PricingBreakdown;
  farmerLocation?: RepairRequest["farmerLocation"];
  channel?: ComplaintChannel;
  callerPhoneNumber?: string;
  farmerPhone?: string;
  farmerName?: string;
}): RepairRequest {
  const machines = getMachines();
  const machine = machines.find((m) => m.id === params.machineId) || machines[0];
  const isOffline = !!params.isOffline;
  const syncStatus: SyncStatus = isOffline ? "pending" : "synced";

  // Generate robust, unique complaint ID
  const uniqueId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const newRepair: RepairRequest = {
    id: uniqueId,
    farmerId: params.farmerId || "farmer-001",
    machineId: machine.id,
    machineNameHi: machine.nameHi,
    machineIcon: machine.icon,
    problemDescription: params.problemDescription || "मशीन में समस्या आ रही है",
    inputMethod: params.inputMethod,
    mediaFileName: params.mediaFileName,
    photoDataUrl: params.photoDataUrl,
    urgency: params.urgency,
    status: "finding_mechanic",
    statusTextHi: isOffline
      ? "फोन में सुरक्षित (इंटरनेट की प्रतीक्षा)"
      : "मैकेनिक खोज रहे हैं",
    createdAt: new Date().toISOString(),
    verificationStatus: "pending",
    syncStatus,
    isOfflineCreated: isOffline,
    diagnosis: params.diagnosis,
    estimatedCost: params.estimatedCost,
    farmerLocation: params.farmerLocation,
    channel: params.channel,
    callerPhoneNumber: params.callerPhoneNumber,
    farmerPhone: params.farmerPhone,
    farmerName: params.farmerName,
  };

  if (isStorageAvailable()) {
    try {
      // 1. Save to repair requests list (with duplicate check)
      const repairs = getRepairRequests();
      if (!repairs.some((r) => r.id === newRepair.id)) {
        const updatedRepairs = [newRepair, ...repairs];
        localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(updatedRepairs));
      }
      inMemoryRepairs = [newRepair, ...inMemoryRepairs];

      // 2. Add to outbox queue
      addToOutbox({
        id: `action-${newRepair.id}`,
        type: "CREATE_REPAIR",
        payload: newRepair,
        syncStatus,
      });

      // P2J Step 1: Enqueue to persistent sync queue
      enqueueSyncOperation({
        entityType: "repair_request",
        entityId: newRepair.id,
        operationType: "create",
        payload: newRepair,
      });

      // 3. Connect to backend API: Asynchronously sync with /api/farmer/repairs
      if (typeof window !== "undefined" && typeof fetch === "function") {
        fetch("/api/farmer/repairs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newRepair),
        }).catch(() => {
          // offline queue already handles retry through syncQueueService
        });
      }

      // 4. Update machine status to 'issue'
      const updatedMachines = machines.map((m) => {
        if (m.id === machine.id) {
          return {
            ...m,
            status: "issue" as const,
            statusText: "मरम्मत की जरूरत",
          };
        }
        return m;
      });
      saveMachines(updatedMachines);
    } catch {
      // Fail safely
    }
  } else {
    inMemoryRepairs = [newRepair, ...inMemoryRepairs];
  }

  return newRepair;
}

/**
 * Update an existing repair request's status, parts, or other fields.
 * Used for technician updates (P2E) and spare part attachments (P2F).
 */
export function updateRepairStatus(
  repairId: string,
  updates: Partial<RepairRequest> | RepairStatus
): RepairRequest | null {
  const patch: Partial<RepairRequest> =
    typeof updates === "string" ? { status: updates } : updates;

  const memIdx = inMemoryRepairs.findIndex((r) => r.id === repairId);
  if (memIdx !== -1) {
    inMemoryRepairs[memIdx] = { ...inMemoryRepairs[memIdx], ...patch };
  }

  if (!isStorageAvailable()) {
    return memIdx !== -1 ? inMemoryRepairs[memIdx] : null;
  }
  try {
    const repairs = getRepairRequests();
    const idx = repairs.findIndex((r) => r.id === repairId);
    if (idx === -1) {
      return memIdx !== -1 ? inMemoryRepairs[memIdx] : null;
    }
    const updated = { ...repairs[idx], ...patch };
    repairs[idx] = updated;
    localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(repairs));
    if (memIdx !== -1) {
      inMemoryRepairs[memIdx] = updated;
    }

    // P2J Step 1: Enqueue update to sync queue
    enqueueSyncOperation({
      entityType: "repair_request",
      entityId: repairId,
      operationType: "update",
      payload: { ...patch, updatedAt: new Date().toISOString() },
    });

    broadcastRepairUpdate(updated);

    return updated;
  } catch {
    return memIdx !== -1 ? inMemoryRepairs[memIdx] : null;
  }
}

/**
 * P2F: Attach recommended parts, selections, and availability to repair request.
 */
export function updateRepairParts(
  repairId: string,
  data: {
    recommendedParts?: string[];
    selectedParts?: RepairRequest["selectedParts"];
    partAvailability?: Record<string, boolean>;
  }
): RepairRequest | null {
  return updateRepairStatus(repairId, data);
}

/**
 * P2F Step 2: Record machine verification result on RepairRequest.
 * If passed, sets status to 'completed' and marks machine as active in local inventory.
 * If failed, sets status to 're_repair_required'.
 */
export function recordRepairVerification(
  repairId: string,
  passed: boolean,
  passportData?: MachinePassportRecord,
  note?: string,
  verificationIdParam?: string
): RepairRequest | null {
  try {
    const repairs = getRepairRequests();
    const idx = repairs.findIndex((r) => r.id === repairId);
    const memIdx = inMemoryRepairs.findIndex((r) => r.id === repairId);

    const repair = idx !== -1 ? repairs[idx] : (memIdx !== -1 ? inMemoryRepairs[memIdx] : null);
    if (!repair) return null;

    const verificationId =
      verificationIdParam ||
      passportData?.verificationId ||
      repair.verificationId ||
      `verif-${repairId}-${Date.now()}`;
    const finalizedPassportData: MachinePassportRecord | undefined = passportData
      ? { ...passportData, verificationId }
      : repair.passportData
      ? { ...repair.passportData, verificationId }
      : undefined;

    const updated: RepairRequest = {
      ...repair,
      verificationId,
      status: passed ? "completed" : "re_repair_required",
      statusTextHi: passed ? "मशीन सही चल रही है" : "दोबारा जाँच की जरूरत है",
      verificationStatus: passed ? "passed" : "failed",
      verificationTime: new Date().toISOString(),
      verificationNote: note,
      passportData: finalizedPassportData,
    };

    if (memIdx !== -1) {
      inMemoryRepairs[memIdx] = updated;
    }

    if (!isStorageAvailable()) {
      broadcastRepairUpdate(updated);
      return updated;
    }

    if (idx !== -1) {
      repairs[idx] = updated;
      localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(repairs));
    }

    // P2J Step 1: Enqueue repair verification operation
    enqueueSyncOperation({
      entityType: "repair_verification",
      entityId: verificationId,
      operationType: "create",
      payload: {
        verificationId,
        repairId,
        passed,
        verificationStatus: passed ? "passed" : "failed",
        note,
        passportData: finalizedPassportData,
        verificationTime: updated.verificationTime,
      },
    });

    // If passed, update machine status back to 'active'
    if (passed) {
      const machines = getMachines();
      const updatedMachines = machines.map((m) => {
        if (m.id === repair.machineId) {
          const costStr = finalizedPassportData?.finalCost
            ? ` [लागत: ₹${finalizedPassportData.finalCost.toLocaleString("hi-IN")}]`
            : "";
          return {
            ...m,
            status: "active" as const,
            statusText: "सक्रिय",
            lastService: new Date().toLocaleDateString("hi-IN"),
            serviceHistory: `${m.serviceHistory || ""}; ${new Date().toLocaleDateString("hi-IN")}: ${repair.problemDescription} (सफलतापूर्वक ठीक किया गया${costStr})`,
          };
        }
        return m;
      });
      saveMachines(updatedMachines);
    }

    broadcastRepairUpdate(updated);
    return updated;
  } catch {
    return null;
  }
}

/**
 * P2F Step 2: Reopen repair request for a re-repair attempt.
 * Increments verificationAttempt and resets status to 'repair_in_progress'.
 */
export function reopenRepairForReRepair(repairId: string): RepairRequest | null {
  if (!isStorageAvailable()) return null;
  try {
    const repairs = getRepairRequests();
    const idx = repairs.findIndex((r) => r.id === repairId);
    if (idx === -1) return null;

    const repair = repairs[idx];
    const nextAttempt = (repair.verificationAttempt || 1) + 1;
    const updated: RepairRequest = {
      ...repair,
      status: "repair_in_progress",
      statusTextHi: "दोबारा मरम्मत शुरू हो गई",
      verificationStatus: "pending",
      verificationAttempt: nextAttempt,
      verificationTime: undefined,
    };
    repairs[idx] = updated;
    localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(repairs));
    broadcastRepairUpdate(updated);
    return updated;
  } catch {
    return null;
  }
}

/**
 * Reset all application storage to the clean initial demo state.
 * Clears repair requests, outbox, sync queues, and resets machines to initial state.
 */
export function resetDemoData(): void {
  if (!isStorageAvailable()) return;
  try {
    const normalizedInit = initialMachines.map((m) => normalizeMachineMaintenance(m));
    localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(normalizedInit));
    localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(initialRepairs));
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([]));
    localStorage.removeItem("agripulse_sync_queue_v1");
    localStorage.removeItem("agripulse_job_cards_v1");
    broadcastRepairUpdate(DEMO_WATERPUMP_REPAIR);
  } catch {
    // Fail silently
  }
}

/**
 * Retrieve or create the primary realistic repair request for technician presentation.
 * Farmer: Ramesh Patil | Machine: Water Pump | Problem: Pump is running but water is not coming
 * Technician: Mahesh Verma
 */
export function createSimulatedDemoRepair(): RepairRequest {
  return {
    id: "rep-pawan-tractor-01",
    farmerId: "farmer-001",
    farmerName: "Pawan Gupta",
    farmerPhone: "9876543210",
    machineId: "tractor",
    machineNameHi: "Tractor (महिंद्रा ट्रैक्टर)",
    machineIcon: "🚜",
    problemDescription: "Tractor start नहीं हो रहा",
    inputMethod: "voice",
    urgency: "today",
    status: "finding_mechanic",
    statusTextHi: "मैकेनिक खोज रहे हैं",
    createdAt: new Date().toISOString(),
    verificationStatus: "pending",
    syncStatus: "synced",
    approxDistanceText: "4.8 किमी दूर",
    routeUrl: "https://www.google.com/maps/dir/?api=1&destination=26.8467,80.9462",
    farmerLocation: {
      latitude: 26.8467,
      longitude: 80.9462,
      village: "शाहपुर",
      district: "लखनऊ, उत्तर प्रदेश",
    },
    diagnosis: {
      id: "diag-tractor-starter-01",
      possibleProblem: "Starting system में समस्या हो सकती है.",
      confidence: "89% (उच्च)",
      confidenceValue: 89,
      reasons: ["सेल्फ स्टार्टर मोटर या सोलनॉइड स्विच में खराबी हो सकती है।"],
      safeAction: "मशीन बंद रखें",
      urgencyLevel: "high",
      urgencyText: "जरूरी",
      urgencyColor: "bg-amber-100 text-amber-800",
      disclaimer: "AI जांच",
      matchedRule: "starter_system",
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Explicitly seed or reset the Ramesh Patil Water Pump Demo Repair.
 */
export function seedRameshPatilDemoRepair(): RepairRequest {
  if (isStorageAvailable()) {
    try {
      const repairs = getRepairRequests();
      const existingIdx = repairs.findIndex((r) => r.id === DEMO_WATERPUMP_REPAIR.id);
      if (existingIdx >= 0) {
        repairs[existingIdx] = { ...DEMO_WATERPUMP_REPAIR };
      } else {
        repairs.unshift({ ...DEMO_WATERPUMP_REPAIR });
      }
      localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(repairs));
      broadcastRepairUpdate(DEMO_WATERPUMP_REPAIR);
      return repairs[0];
    } catch {}
  }
  return DEMO_WATERPUMP_REPAIR;
}

/**
 * Ensure the realistic presentation repair requests are seeded and available.
 */
export function ensureSimulatedDemoRequest(): RepairRequest {
  const repairs = getRepairRequests();
  const demoFound = repairs.find((r) => r.id === DEMO_WATERPUMP_REPAIR.id);
  if (demoFound) {
    return demoFound;
  }

  if (isStorageAvailable()) {
    try {
      const updated = [DEMO_WATERPUMP_REPAIR, ...repairs];
      localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(updated));
      broadcastRepairUpdate(DEMO_WATERPUMP_REPAIR);
      return DEMO_WATERPUMP_REPAIR;
    } catch {
      // safe fallback
    }
  }
  return DEMO_WATERPUMP_REPAIR;
}
