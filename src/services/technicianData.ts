/**
 * Technician Data & Profiles — AgriPulse Production & Presentation Directory
 *
 * Provides realistic Indian agricultural technician profiles across verified skills,
 * certifications, live coordinates, and equipment expertise.
 * Distances are calculated via Haversine geolocation from farmer coordinates.
 */

import type {
  TechnicianCertification,
  TechnicianTrainingRecord,
  TechnicianVerificationBadge,
} from "../types/index.ts";

export type TechnicianSkill =
  | "Tractor"
  | "Sprayer"
  | "Water Pump"
  | "Power Tiller"
  | "Harvester"
  | "Planter"
  | "Weeder"
  | "Rotavator"
  | "Motor"
  | "Engine"
  | "Electrical"
  | "Hydraulic"
  | "Mechanical";

export interface Technician {
  id: string;
  name: string;
  nameHi: string;
  phone: string;
  skills: TechnicianSkill[];
  available: boolean;
  distanceKm: number;
  rating: number; // 1.0 – 5.0
  completedJobs: number;
  activeJobs?: number;
  primaryExpertise?: string;
  primaryExpertiseHi?: string;
  latitude?: number;
  longitude?: number;
  serviceAreaKm?: number;
  locationUpdatedAt?: string;

  // Technician Training & Certification Profile
  experienceYears?: number;
  serviceArea?: string;
  equipmentCategories?: string[];
  technicalSkills?: string[];
  selfDeclaredSkills?: string[];
  certifications?: TechnicianCertification[];
  trainingRecords?: TechnicianTrainingRecord[];
  verificationStatus?: TechnicianVerificationBadge;

  // Local Service Centre / FPO Connection
  serviceCentreId?: string;
  employmentType?: "centre_technician" | "associated" | "independent";
  providesDoorstepService?: boolean;
  avatarUrl?: string;
}

const FARMER_CENTER = { lat: 26.8467, lng: 80.9462 };

export const mockTechnicians: Technician[] = [
  {
    id: "tech-001",
    name: "Ramesh Kumar",
    nameHi: "रमेश कुमार",
    phone: "9876543211",
    skills: ["Sprayer", "Power Tiller", "Engine", "Mechanical"],
    primaryExpertise: "Sprayer Specialist",
    primaryExpertiseHi: "स्प्रेयर विशेषज्ञ",
    available: true,
    distanceKm: 2.4,
    rating: 4.8,
    completedJobs: 83,
    activeJobs: 0,
    latitude: 26.8628, // 2.4 km from Farmer Center via Haversine
    longitude: 80.9623,
    serviceAreaKm: 12,
    locationUpdatedAt: "2026-09-28T06:00:00.000Z",

    experienceYears: 6,
    serviceArea: "लखनऊ पूर्व व चिनहट क्षेत्र (12 किमी)",
    equipmentCategories: ["स्प्रेयर", "पावर टिलर", "इंजन"],
    technicalSkills: ["Mechanical", "Sprayer Calibration", "Engine Tuning"],
    verificationStatus: "verified",
    certifications: [
      {
        id: "cert-001",
        certificationName: "National Agritech Sprayer Systems Certification",
        category: "Sprayer",
        issuingOrganization: "National Agricultural Machinery Institute (NAMI)",
        certificationLevel: "Advanced",
        issueDate: "2025-02-15",
        expiryDate: "2027-02-15",
        verificationStatus: "verified",
        certificateNumber: "NAMI-SP-2025-882",
        isDemoRecord: false,
      },
    ],
    trainingRecords: [
      {
        id: "train-001",
        trainingTitle: "High-Pressure Sprayer Nozzle & Flow Maintenance",
        category: "Sprayer",
        completionDate: "2025-01-20",
        trainingProvider: "State Krishi Skill Mission",
        status: "Completed",
        isDemoRecord: false,
      },
    ],
  },
  {
    id: "tech-007",
    name: "Suresh Patil",
    nameHi: "सुरेश पाटिल",
    phone: "9856789012",
    skills: ["Tractor", "Rotavator", "Engine", "Mechanical", "Hydraulic"],
    primaryExpertise: "Tractor Specialist",
    primaryExpertiseHi: "ट्रैक्टर विशेषज्ञ",
    available: true,
    distanceKm: 4.8,
    rating: 4.9,
    completedJobs: 95,
    activeJobs: 0,
    latitude: 26.8789, // 4.8 km from Farmer Center via Haversine
    longitude: 80.9784,
    serviceAreaKm: 15,
    locationUpdatedAt: "2026-09-28T08:00:00.000Z",
    experienceYears: 8,
    serviceArea: "लखनऊ ग्रामीण व बीकेटी क्षेत्र (15 किमी)",
    equipmentCategories: ["ट्रैक्टर", "रोटावेटर", "इंजन"],
    technicalSkills: ["Tractor Overhaul", "Hydraulic Pumps", "Diesel Engine"],
    verificationStatus: "verified",
    certifications: [
      {
        id: "cert-007",
        certificationName: "Master Tractor & Implements Mechanic Certification",
        category: "Tractor",
        issuingOrganization: "Central Farm Machinery Training & Testing Institute",
        certificationLevel: "Master",
        issueDate: "2024-05-10",
        expiryDate: "2027-05-10",
        verificationStatus: "verified",
        certificateNumber: "CFMTI-TR-2024-501",
        isDemoRecord: false,
      },
    ],
    trainingRecords: [
      {
        id: "train-007",
        trainingTitle: "Advanced Tractor Hydraulics & Rotavator Alignment",
        category: "Hydraulic",
        completionDate: "2024-04-10",
        trainingProvider: "State Farm Engineering Institute",
        status: "Completed",
        isDemoRecord: false,
      },
    ],
  },
  {
    id: "tech-005",
    name: "Mahesh Verma",
    nameHi: "महेश वर्मा",
    phone: "9834567890",
    skills: ["Water Pump", "Sprayer", "Motor", "Engine", "Electrical"],
    primaryExpertise: "Pump & Irrigation Specialist",
    primaryExpertiseHi: "पंप व सिंचाई उपकरण विशेषज्ञ",
    available: true,
    distanceKm: 3.2,
    rating: 4.7,
    completedJobs: 72,
    activeJobs: 0,
    avatarUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%2315803d'/><circle cx='50' cy='38' r='18' fill='%23fed7aa'/><path d='M20 86 c0 -18 14 -28 30 -28 s30 10 30 28 Z' fill='%23fed7aa'/><path d='M35 28 h30 v-6 c0 -4 -6 -8 -15 -8 s-15 4 -15 8 Z' fill='%230f172a'/><circle cx='43' cy='36' r='2.5' fill='%230f172a'/><circle cx='57' cy='36' r='2.5' fill='%230f172a'/><path d='M44 45 q6 5 12 0' stroke='%230f172a' stroke-width='2' fill='none'/></svg>",
    latitude: 26.7991, // 3.2 km from Farmer Center via Haversine
    longitude: 80.8986,
    serviceAreaKm: 15,
    locationUpdatedAt: "2026-09-28T06:15:00.000Z",

    experienceYears: 5,
    serviceArea: "सरोजिनी नगर व मोहनलालगंज (15 किमी)",
    equipmentCategories: ["वाटर पंप", "स्प्रेयर", "मोटर", "इंजन"],
    technicalSkills: ["Electrical", "Motor Rewinding", "Pump Alignment"],
    verificationStatus: "verified",
    certifications: [
      {
        id: "cert-005",
        certificationName: "Agricultural Water Pump Repair & Irrigation Safety",
        category: "Water Pump",
        issuingOrganization: "Agritech Skill Council of India",
        certificationLevel: "Advanced",
        issueDate: "2024-10-10",
        expiryDate: "2027-10-10",
        verificationStatus: "verified",
        certificateNumber: "ASCI-WP-2024-419",
        isDemoRecord: false,
      },
    ],
    trainingRecords: [
      {
        id: "train-005",
        trainingTitle: "Solar & Diesel Pump Troubleshooting & Submersible Motors",
        category: "Electrical",
        completionDate: "2025-03-05",
        trainingProvider: "Renewable Agri-Power Institute",
        status: "Completed",
        isDemoRecord: false,
      },
    ],
  },
  {
    id: "tech-003",
    name: "Mohan Singh",
    nameHi: "मोहन सिंह",
    phone: "9812345678",
    skills: ["Tractor", "Power Tiller", "Engine", "Hydraulic", "Harvester"],
    primaryExpertise: "Tractor & Harvester Specialist",
    primaryExpertiseHi: "ट्रैक्टर व हार्वेस्टर विशेषज्ञ",
    available: false,
    distanceKm: 3.5,
    rating: 4.9,
    completedJobs: 142,
    activeJobs: 3,
    latitude: FARMER_CENTER.lat + 0.0120,
    longitude: FARMER_CENTER.lng - 0.0240,
    serviceAreaKm: 15,
    locationUpdatedAt: "2026-09-28T07:00:00.000Z",

    experienceYears: 9,
    serviceArea: "मलिहाबाद व काकोरी क्षेत्र (15 किमी)",
    equipmentCategories: ["ट्रैक्टर", "कंबाइन हार्वेस्टर", "पावर टिलर"],
    technicalSkills: ["Hydraulic", "Mechanical", "Engine Overhaul", "Transmission"],
    verificationStatus: "verified",
    certifications: [
      {
        id: "cert-003a",
        certificationName: "Master Tractor Mechanic Certification",
        category: "Tractor",
        issuingOrganization: "Central Farm Machinery Training Institute",
        certificationLevel: "Master",
        issueDate: "2024-04-12",
        expiryDate: "2027-04-12",
        verificationStatus: "verified",
        certificateNumber: "CFMTI-TR-2024-091",
        isDemoRecord: false,
      },
      {
        id: "cert-003b",
        certificationName: "Heavy Agricultural Hydraulics Specialist",
        category: "Hydraulic",
        issuingOrganization: "National Farm Equipment Council",
        certificationLevel: "Advanced",
        issueDate: "2025-06-18",
        expiryDate: "2028-06-18",
        verificationStatus: "verified",
        certificateNumber: "NFEC-HY-2025-331",
        isDemoRecord: false,
      },
    ],
    trainingRecords: [
      {
        id: "train-003",
        trainingTitle: "Multi-Cylinder Turbo Diesel Diagnostics",
        category: "Engine",
        completionDate: "2024-03-25",
        trainingProvider: "Tractor Tech Academy",
        status: "Completed",
        isDemoRecord: false,
      },
    ],
  },
  {
    id: "tech-002",
    name: "Suresh Yadav",
    nameHi: "सुरेश यादव",
    phone: "9876501234",
    skills: ["Water Pump", "Engine", "Electrical"],
    primaryExpertise: "Water Pump Specialist",
    primaryExpertiseHi: "वाटर पंप विशेषज्ञ",
    available: true,
    distanceKm: 5.2,
    rating: 4.5,
    completedJobs: 61,
    activeJobs: 0,
    latitude: FARMER_CENTER.lat - 0.0250,
    longitude: FARMER_CENTER.lng + 0.0420,
    serviceAreaKm: 15,
    locationUpdatedAt: "2026-09-28T06:30:00.000Z",

    experienceYears: 4,
    serviceArea: "गोसाईंगंज व मोहनलालगंज (15 किमी)",
    equipmentCategories: ["वाटर पंप", "डीजल पंप", "सोलर पंप"],
    technicalSkills: ["Electrical", "Motor Rewinding", "Pump Alignment"],
    verificationStatus: "verified",
    certifications: [
      {
        id: "cert-002",
        certificationName: "Agricultural Water Pump Repair & Safety",
        category: "Water Pump",
        issuingOrganization: "Agritech Skill Council of India",
        certificationLevel: "Advanced",
        issueDate: "2024-10-10",
        expiryDate: "2027-10-10",
        verificationStatus: "verified",
        certificateNumber: "ASCI-WP-2024-419",
        isDemoRecord: false,
      },
    ],
    trainingRecords: [
      {
        id: "train-002",
        trainingTitle: "Solar & Diesel Pump Troubleshooting",
        category: "Electrical",
        completionDate: "2026-03-05",
        trainingProvider: "Renewable Agri-Power Institute",
        status: "Completed",
        isDemoRecord: false,
      },
    ],
  },
  {
    id: "tech-004",
    name: "Deepak Verma",
    nameHi: "दीपक वर्मा",
    phone: "9823456789",
    skills: ["Electrical", "Sprayer", "Water Pump"],
    primaryExpertise: "Electrical Specialist",
    primaryExpertiseHi: "इलेक्ट्रिकल विशेषज्ञ",
    available: true,
    distanceKm: 6.5,
    rating: 4.3,
    completedJobs: 39,
    activeJobs: 0,
    latitude: FARMER_CENTER.lat + 0.0380,
    longitude: FARMER_CENTER.lng + 0.0500,
    serviceAreaKm: 20,
    locationUpdatedAt: "2026-09-28T05:45:00.000Z",

    experienceYears: 3,
    serviceArea: "इटौंजा व बीकेटी क्षेत्र (20 किमी)",
    equipmentCategories: ["इलेक्ट्रिकल", "वाटर पंप", "स्प्रेयर"],
    technicalSkills: ["Electrical", "Wiring", "Relays"],
    verificationStatus: "verified",
    certifications: [
      {
        id: "cert-004",
        certificationName: "Farm Equipment Electrification Certificate",
        category: "Electrical",
        issuingOrganization: "Regional Skill Center",
        certificationLevel: "Basic",
        issueDate: "2025-08-15",
        expiryDate: "2028-08-15",
        verificationStatus: "verified",
        certificateNumber: "RSC-EL-2025-105",
        isDemoRecord: false,
      },
    ],
    trainingRecords: [
      {
        id: "train-004",
        trainingTitle: "Sensor & Starter Motor Troubleshooting",
        category: "Electrical",
        completionDate: "2025-09-01",
        trainingProvider: "National Rural Skill Mission",
        status: "Completed",
        isDemoRecord: false,
      },
    ],
  },
  {
    id: "tech-006",
    name: "Vijay Sharma",
    nameHi: "विजय शर्मा",
    phone: "9845678901",
    skills: ["Water Pump", "Power Tiller", "Planter", "Weeder"],
    primaryExpertise: "Tiller & Weeder Specialist",
    primaryExpertiseHi: "टिलर व वीडर विशेषज्ञ",
    available: false,
    distanceKm: 4.2,
    rating: 4.4,
    completedJobs: 42,
    activeJobs: 1,
    latitude: FARMER_CENTER.lat - 0.0250,
    longitude: FARMER_CENTER.lng - 0.0340,
    serviceAreaKm: 12,
    locationUpdatedAt: "2026-09-28T07:30:00.000Z",

    experienceYears: 4,
    serviceArea: "काकोरी ग्रामीण (12 किमी)",
    equipmentCategories: ["वाटर पंप", "पावर टिलर", "पावर वीडर"],
    technicalSkills: ["Mechanical", "Implement Setting"],
    selfDeclaredSkills: ["Water Pump", "Power Tiller", "Weeder"],
    verificationStatus: "verified",
    certifications: [
      {
        id: "cert-006",
        certificationName: "Agricultural Machinery Operations & Repair",
        category: "Power Tiller",
        issuingOrganization: "State Farm Engineering Institute",
        certificationLevel: "Basic",
        issueDate: "2024-11-05",
        expiryDate: "2027-11-05",
        verificationStatus: "verified",
        certificateNumber: "SFEI-PT-2024-812",
        isDemoRecord: false,
      },
    ],
    trainingRecords: [
      {
        id: "train-006",
        trainingTitle: "Basic Power Tiller Implement Operations",
        category: "Mechanical",
        completionDate: "2025-09-10",
        trainingProvider: "Krishi Vigyan Kendra",
        status: "Completed",
        isDemoRecord: false,
      },
    ],
  },
];

/**
 * Maps machine type strings (from machineNameHi / type fields) to skill tags.
 */
export const machineTypeToSkillMap: Record<string, TechnicianSkill> = {
  "स्प्रेयर": "Sprayer",
  sprayer: "Sprayer",
  "वाटर पंप": "Water Pump",
  "water pump": "Water Pump",
  "डीजल पंप": "Water Pump",
  pump: "Water Pump",
  "पंप": "Water Pump",
  "पावर टिलर": "Power Tiller",
  "power tiller": "Power Tiller",
  tiller: "Power Tiller",
  "टिलर": "Power Tiller",
  "ट्रैक्टर": "Tractor",
  tractor: "Tractor",
  "हार्वेस्टर": "Harvester",
  harvester: "Harvester",
  "कंबाइन हार्वेस्टर": "Harvester",
  "प्लांटर": "Planter",
  planter: "Planter",
  "सीड प्लांटर": "Planter",
  "वीडर": "Weeder",
  weeder: "Weeder",
  "पावर वीडर": "Weeder",
  "रोटावेटर": "Rotavator",
  rotavator: "Rotavator",
  "मोटर": "Motor",
  motor: "Motor",
  engine: "Engine",
  "इंजन": "Engine",
  electrical: "Electrical",
  "इलेक्ट्रिकल": "Electrical",
  hydraulic: "Hydraulic",
  "हाइड्रोलिक": "Hydraulic",
  mechanical: "Mechanical",
  "मैकेनिकल": "Mechanical",
};

/**
 * Maps diagnosis matchedRule / problem category to a secondary skill hint.
 */
export const problemCategoryToSkillHint: Record<string, TechnicianSkill> = {
  smoke_overheating: "Engine",
  fluid_leakage: "Hydraulic",
  visible_damage: "Mechanical",
  loose_broken_component: "Mechanical",
  starting_issue: "Electrical",
  unusual_sound: "Mechanical",
  pump_issue: "Water Pump",
  electrical: "Electrical",
  hydraulic_issue: "Hydraulic",
  general_fallback: "Mechanical",
};
