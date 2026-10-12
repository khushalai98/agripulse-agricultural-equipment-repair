/**
 * Demo Data & Realistic Presentation Scenarios — P2M Step 2 AgriPulse
 *
 * Provides realistic, clean seed data for hackathon demonstrations:
 * - 3 Farmers (Lucknow agricultural district)
 * - Multiple machines (Tractor, Sprayer, Water Pump, Power Tiller)
 * - Equipment skills, spare parts, and service histories
 * - Single end-to-end realistic demo flow:
 *   "मेरे ट्रैक्टर से तेल लीक हो रहा है और मुझे कल खेत में काम करना है।"
 */

import { Machine } from "@/types";

export interface DemoFarmer {
  id: string;
  name: string;
  nameHi: string;
  phone: string;
  villageHi: string;
  districtHi: string;
  primaryCropHi: string;
  machineIds: string[];
}

export const DEMO_FARMERS: DemoFarmer[] = [
  {
    id: "farmer-ramesh-patil",
    name: "Ramesh Patil",
    nameHi: "रमेश पाटिल",
    phone: "9876543210",
    villageHi: "शाहपुर",
    districtHi: "लखनऊ, उत्तर प्रदेश",
    primaryCropHi: "गेहूं और धान",
    machineIds: ["water_pump", "tractor"],
  },
  {
    id: "farmer-001",
    name: "Ramlal Yadav",
    nameHi: "रामलाल यादव",
    phone: "9876543211",
    villageHi: "बस्तीखेड़ा",
    districtHi: "लखनऊ, उत्तर प्रदेश",
    primaryCropHi: "गेहूं और सरसों",
    machineIds: ["tractor", "sprayer"],
  },
  {
    id: "farmer-002",
    name: "Suresh Verma",
    nameHi: "सुरेश वर्मा",
    phone: "9812345670",
    villageHi: "मोहनलालगंज",
    districtHi: "लखनऊ, उत्तर प्रदेश",
    primaryCropHi: "धान और गन्ना",
    machineIds: ["water_pump", "power_tiller"],
  },
  {
    id: "farmer-003",
    name: "Haripal Singh",
    nameHi: "हरिपाल सिंह",
    phone: "9823456781",
    villageHi: "मलिहाबाद",
    districtHi: "लखनऊ, उत्तर प्रदेश",
    primaryCropHi: "आम का बाग व दलहन",
    machineIds: ["tractor", "sprayer"],
  },
];

const getDaysOffset = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

/**
 * Clean demo machines list with Tractor as the primary demo machine
 */
export const DEMO_MACHINES: Machine[] = [
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
    serviceHistory: "4 बार नियमित सर्विस (इंजन ऑयल, फिल्टर, ब्रेक समायोजन)",
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
    name: "Agricultural Sprayer",
    nameHi: "कृषि स्प्रेयर",
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
    lastServiceDate: getDaysOffset(-75),
    nextServiceDate: getDaysOffset(-15),
    serviceIntervalDays: 60,
    maintenanceItems: ["नोज़ल", "पाइप", "पंप", "लीकेज", "फ़िल्टर"],
    maintenanceStatus: "overdue",
  },
  {
    id: "water_pump",
    name: "Diesel Water Pump",
    nameHi: "डीजल वाटर पंप",
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
    lastServiceDate: getDaysOffset(-82),
    nextServiceDate: getDaysOffset(8),
    serviceIntervalDays: 90,
    maintenanceItems: ["इंजन ऑयल", "ब्लेड", "बेल्ट", "एयर फ़िल्टर", "क्लच"],
    maintenanceStatus: "due",
  },
];

/**
 * Ultra-compact 120x90 valid Base64 JPEG data URL representing a tractor engine oil leak photo.
 * This guarantees the presenter never gets stuck on laptops without camera permissions.
 */
export const DEMO_OIL_LEAK_PHOTO_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#2d3748" rx="16"/>
      <rect x="60" y="80" width="280" height="140" fill="#4a5568" rx="12"/>
      <circle cx="140" cy="150" r="35" fill="#718096"/>
      <path d="M 230 110 L 290 110 L 270 170 L 230 170 Z" fill="#2b6cb0"/>
      <!-- Oil drip simulation -->
      <path d="M 180 170 C 180 170 165 195 165 210 C 165 220 175 228 185 228 C 195 228 205 220 205 210 C 205 195 180 170 180 170 Z" fill="#d69e2e"/>
      <ellipse cx="185" cy="235" rx="35" ry="12" fill="#b7791f" opacity="0.8"/>
      <!-- Labels -->
      <text x="200" y="45" fill="#f7fafc" font-size="18" font-weight="bold" text-anchor="middle" font-family="sans-serif">महिंद्रा ट्रैक्टर — इंजन ऑयल सम्प</text>
      <text x="185" y="270" fill="#ecc94b" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">⚠️ तेल रिसाव (Oil Leakage)</text>
    </svg>
  `);

export interface DemoScenarioDetails {
  id: string;
  nameHi: string;
  farmer: DemoFarmer;
  machine: Machine;
  voiceComplaint: string;
  photoFileName: string;
  photoDataUrl: string;
  urgencyReason: string;
  expectedRule: string;
  expectedProblemHi: string;
  expectedTechnicianNameHi: string;
  expectedTechnicianId: string;
  expectedTechnicianDistance: string;
  expectedSparePartNameHi: string;
}

/**
 * P2M Step 2 Master Demo Scenario:
 * Farmer Ramlal Yadav has a Mahindra 575 DI Tractor leaking oil before tomorrow's field work.
 */
export const PRIMARY_DEMO_SCENARIO: DemoScenarioDetails = {
  id: "scenario-tractor-oil-leak",
  nameHi: "ट्रैक्टर ऑयल रिसाव शिकायत",
  farmer: DEMO_FARMERS[0],
  machine: DEMO_MACHINES[0],
  voiceComplaint: "मेरे ट्रैक्टर से तेल लीक हो रहा है और मुझे कल खेत में काम करना है।",
  photoFileName: "tractor_oil_leak.jpg",
  photoDataUrl: DEMO_OIL_LEAK_PHOTO_DATA_URL,
  urgencyReason: "कल खेत में जरूरी काम होना है, इसलिए आज मरम्मत बहुत जरूरी है।",
  expectedRule: "fluid_leakage",
  expectedProblemHi: "इंजन व हाइड्रोलिक ऑयल रिसाव (Fluid Leakage)",
  expectedTechnicianNameHi: "अजय पटेल",
  expectedTechnicianId: "tech-005",
  expectedTechnicianDistance: "लगभग 3.2 km दूर",
  expectedSparePartNameHi: "हाइड्रोलिक होस पाइप / ऑयल सील",
};
