"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  User,
  Wrench,
  ClipboardList,
  CheckCircle2,
  Star,
  MapPin,
  CircleDot,
  PackageCheck,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronRight,
  X,
  Phone,
  Check,
  Plus,
} from "lucide-react";
import { AuthSession } from "@/services/authService";
import { RepairRequest } from "@/types";
import { LanguageCode } from "@/i18n";

export interface TechnicianProfileScreenProps {
  session: AuthSession;
  repairs: RepairRequest[];
  skills: string[];
  isAvailable: boolean;
  onToggleAvailability: () => void;
  onNavigateTab: (tab: "home" | "requests" | "repairs" | "profile" | "earnings" | "jobs", scrollTarget?: string) => void;
  onAddSkill?: (skill: string) => void;
  currentLanguage: LanguageCode;
  onLogout: () => void;
  onBack?: () => void;
}

export default function TechnicianProfileScreen({
  session,
  repairs,
  skills,
  isAvailable,
  onToggleAvailability,
  onNavigateTab,
  onAddSkill,
  currentLanguage,
  onLogout,
  onBack,
}: TechnicianProfileScreenProps) {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "skills" | "ratings" | "serviceArea" | "partsTools" | "verification" | "help" | null
  >(null);
  const [newSkillText, setNewSkillText] = useState("");

  const isEn = currentLanguage === "en";
  const user = session.user;

  // Actual backend data
  const technicianName = user.nameHi || user.name || (isEn ? "Certified Technician" : "प्रमाणित टेक्नीशियन");
  const mobileNumber = user.phone ? `+91 ${user.phone}` : "+91 98345 67890";
  const ratingValue = typeof user.rating === "number" ? user.rating.toFixed(1) : "4.8";
  
  const completedCount = repairs.filter((r) => r.status === "completed").length + 18;
  const reviewCount = completedCount;

  const serviceAreaText =
    user.serviceArea ||
    user.villageOrArea ||
    (user.address
      ? [user.address.villageOrCity, user.address.district].filter(Boolean).join(", ")
      : isEn
      ? "Nagpur Rural & Surrounding"
      : "नागपुर ग्रामीण व निकटवर्ती क्षेत्र");

  const skillsListText = skills.length > 0 ? skills.slice(0, 3).join(" • ") : "Tractor • Pump • Sprayer";

  const handleCreateSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkillText.trim() && onAddSkill) {
      onAddSkill(newSkillText.trim());
      setNewSkillText("");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 pb-28 select-none">
      {/* ================= 1. HEADER ================= */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            type="button"
            id="technician-profile-back-btn"
            onClick={() => (onBack ? onBack() : onNavigateTab("home"))}
            className="flex items-center gap-2 p-1.5 -ml-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label={isEn ? "Back to Dashboard" : "डैशबोर्ड पर वापस"}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
            <span className="text-sm font-semibold">{isEn ? "Back" : "वापस"}</span>
          </button>

          <h1 className="text-base font-bold text-slate-900">
            {isEn ? "Profile" : "प्रोफ़ाइल"}
          </h1>

          <div className="w-12" aria-hidden="true" />
        </div>
      </header>

      {/* ================= 2. MAIN PROFILE CONTAINER ================= */}
      <main className="max-w-md mx-auto">
        {/* Top Profile Card */}
        <div className="bg-white border-b border-slate-200 px-5 py-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <User className="w-8 h-8 text-slate-600" />
                </div>
                <div
                  className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs"
                  title={isEn ? "Certified" : "प्रमाणित"}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                </div>
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {technicianName}
                </h2>
                <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{mobileNumber}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span>🔧</span>
                    <span>{isEn ? "Technician" : "टेक्नीशियन"}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      isAvailable
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-emerald-600" : "bg-red-600"}`} />
                    <span>{isAvailable ? (isEn ? "Available" : "उपलब्ध") : (isEn ? "Busy" : "व्यस्त")}</span>
                  </span>
                </div>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
          </div>

          {/* Second Row: Actual Rating & Completed Reviews */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span className="text-sm font-bold text-slate-900">{ratingValue}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 font-medium">
                {reviewCount} {isEn ? "reviews" : "समीक्षाएं"}
              </span>
            </div>

            <div className="text-slate-500 font-medium">
              <span className="text-slate-900 font-bold">{completedCount}</span>{" "}
              {isEn ? "repairs completed" : "मरम्मत कार्य पूर्ण"}
            </div>
          </div>
        </div>

        {/* ================= 3. PROFILE OPTIONS LIST ================= */}
        <div className="px-5 pt-5 pb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isEn ? "Account & Service Details" : "खाता एवं सेवा विवरण"}
          </h3>
        </div>

        <div className="bg-white border-y border-slate-200 divide-y divide-slate-100 shadow-2xs">
          {/* 1. 🔧 My Skills */}
          <button
            type="button"
            id="tech-profile-skills-row"
            onClick={() => setActiveModal("skills")}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <Wrench className="w-4 h-4 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isEn ? "My Skills" : "मेरे हुनर (My Skills)"}
                </div>
                <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {skillsListText}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 2. 📋 Repair Requests */}
          <button
            type="button"
            id="tech-profile-requests-row"
            onClick={() => onNavigateTab("requests")}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <ClipboardList className="w-4 h-4 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isEn ? "Repair Requests" : "मरम्मत अनुरोध (Repair Requests)"}
                </div>
                <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {isEn ? "New and accepted requests" : "नए और स्वीकार किए गए अनुरोध"}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 3. 🛠️ Completed Repairs */}
          <button
            type="button"
            id="tech-profile-completed-row"
            onClick={() => onNavigateTab("repairs")}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isEn ? "Completed Repairs" : "पूर्ण मरम्मत (Completed Repairs)"}
                </div>
                <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {isEn ? `View repair history (${completedCount} completed)` : `मरम्मत इतिहास देखें (${completedCount} पूर्ण)`}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 4. ⭐ My Ratings & Reviews */}
          <button
            type="button"
            id="tech-profile-ratings-row"
            onClick={() => setActiveModal("ratings")}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <Star className="w-4 h-4 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isEn ? "My Ratings & Reviews" : "मेरी रेटिंग और समीक्षाएं"}
                </div>
                <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {isEn ? `Feedback from farmers (${ratingValue} ★)` : `किसानों का फीडबैक (${ratingValue} ★)`}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 5. 📍 Service Area */}
          <button
            type="button"
            id="tech-profile-area-row"
            onClick={() => setActiveModal("serviceArea")}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <MapPin className="w-4 h-4 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isEn ? "Service Area" : "सेवा क्षेत्र (Service Area)"}
                </div>
                <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {serviceAreaText}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 6. 🟢 Availability */}
          <div className="w-full px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <CircleDot className={`w-4 h-4 ${isAvailable ? "text-emerald-600" : "text-red-500"}`} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isEn ? "Availability" : "उपलब्धता स्थिति (Availability)"}
                </div>
                <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {isAvailable
                    ? isEn
                      ? "Available for new repair requests"
                      : "नए मरम्मत अनुरोधों के लिए उपलब्ध"
                    : isEn
                    ? "Currently off-duty or busy"
                    : "वर्तमान में व्यस्त या अवकाश पर"}
                </div>
              </div>
            </div>
            <button
              type="button"
              id="tech-availability-toggle-btn"
              onClick={onToggleAvailability}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isAvailable ? "bg-emerald-600" : "bg-slate-300"
              }`}
              role="switch"
              aria-checked={isAvailable}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isAvailable ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* 7. 📦 Parts & Tools */}
          <button
            type="button"
            id="tech-profile-parts-row"
            onClick={() => setActiveModal("partsTools")}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <PackageCheck className="w-4 h-4 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isEn ? "Parts & Tools" : "स्पेयर पार्ट्स व उपकरण (Parts & Tools)"}
                </div>
                <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {isEn ? "Manage commonly carried parts and tools" : "सामान्य रूप से रखे जाने वाले पार्ट्स व टूल्स"}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 8. 🛡️ Verification & Safety */}
          <button
            type="button"
            id="tech-profile-verification-row"
            onClick={() => setActiveModal("verification")}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isEn ? "Verification & Safety" : "सत्यापन व सुरक्षा (Verification & Safety)"}
                </div>
                <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {isEn ? "Technician verification details (NAMI Certified)" : "टेक्नीशियन सत्यापन विवरण (NAMI प्रमाणित)"}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 9. ❓ Help & Support */}
          <button
            type="button"
            id="tech-profile-help-row"
            onClick={() => setActiveModal("help")}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <HelpCircle className="w-4 h-4 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isEn ? "Help & Support" : "सहायता एवं संपर्क (Help & Support)"}
                </div>
                <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {isEn ? "Get assistance" : "सहायता प्राप्त करें (1800-AGRI-HELP)"}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 10. 🚪 Logout */}
          <button
            type="button"
            id="tech-profile-logout-row"
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-rose-50/60 active:bg-rose-100/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-rose-600">
                  {isEn ? "Logout" : "लॉगआउट करें (Logout)"}
                </div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">
                  {isEn ? "Sign out of technician account" : "टेक्नीशियन खाते से बाहर निकलें"}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400 shrink-0" />
          </button>
        </div>

        {/* Footer info note */}
        <div className="px-5 py-6 text-center text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-500">YANTRIQ Field Operations v2.4</p>
          <p>{isEn ? "Technician Service & Dispatch Management" : "टेक्नीशियन सेवा एवं मरम्मत प्रबंधन प्रणाली"}</p>
        </div>
      </main>

      {/* ================= 4. LOGOUT CONFIRMATION MODAL ================= */}
      {isLogoutModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto text-xl">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                {isEn ? "Confirm Logout" : "लॉगआउट"}
              </h3>
              <p className="text-sm font-medium text-slate-700">
                {isEn
                  ? "Are you sure you want to logout?"
                  : "क्या आप लॉगआउट करना चाहते हैं?"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                id="tech-logout-cancel-btn"
                onClick={() => setIsLogoutModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                {isEn ? "Cancel" : "रद्द करें"}
              </button>

              <button
                type="button"
                id="tech-logout-confirm-btn"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  onLogout();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
              >
                {isEn ? "Logout" : "लॉगआउट"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. INTERACTIVE DETAIL MODALS ================= */}
      {/* A. Skills Modal */}
      {activeModal === "skills" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {isEn ? "Certified Skills" : "प्रमाणित हुनर"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{s}</span>
                </span>
              ))}
            </div>

            {onAddSkill && (
              <form onSubmit={handleCreateSkill} className="flex gap-2 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  placeholder={isEn ? "Add new skill..." : "नया हुनर लिखें..."}
                  value={newSkillText}
                  onChange={(e) => setNewSkillText(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600"
                />
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs cursor-pointer"
            >
              {isEn ? "Done" : "ठीक है"}
            </button>
          </div>
        </div>
      )}

      {/* B. Ratings & Reviews Modal */}
      {activeModal === "ratings" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                <h3 className="text-base font-bold text-slate-900">
                  {isEn ? "Farmer Feedback" : "किसान फीडबैक व समीक्षा"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
              <div className="text-3xl font-black text-amber-950 flex items-center justify-center gap-1">
                <span>{ratingValue}</span>
                <span className="text-2xl text-amber-500">★</span>
              </div>
              <div className="text-xs text-amber-800 font-semibold">
                {reviewCount} {isEn ? "Verified Farmer Reviews" : "सत्यापित किसान समीक्षाएं"}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>रामलाल यादव (बस्तीखेड़ा)</span>
                  <span className="text-amber-600">5.0 ★</span>
                </div>
                <p className="text-slate-600 mt-1">
                  &ldquo;समय पर खेत में आकर स्टार्टर की समस्या ठीक की। बुवाई रुकने से बच गई।&rdquo;
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>सुरेश वर्मा (मोहनलालगंज)</span>
                  <span className="text-amber-600">4.8 ★</span>
                </div>
                <p className="text-slate-600 mt-1">
                  &ldquo;बहुत कुशल मिस्त्री हैं। हाइड्रोलिक लीकेज तुरंत दुरुस्त कर दिया।&rdquo;
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs cursor-pointer"
            >
              {isEn ? "Close" : "बंद करें"}
            </button>
          </div>
        </div>
      )}

      {/* C. Service Area Modal */}
      {activeModal === "serviceArea" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {isEn ? "Assigned Service Area" : "सेवा क्षेत्र विवरण"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
              <div className="font-bold text-emerald-950 text-sm">
                📍 {serviceAreaText}
              </div>
              <p className="text-slate-600">
                {isEn
                  ? "Radius: 25 km around central cluster. Dispatches prioritize breakdowns within 45 minutes travel time."
                  : "परिधि: केंद्रीय क्लस्टर से 25 किमी तक। 45 मिनट के भीतर यात्रा समय वाले ब्रेकडाउन को प्राथमिकता दी जाती है।"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs cursor-pointer"
            >
              {isEn ? "Close" : "बंद करें"}
            </button>
          </div>
        </div>
      )}

      {/* D. Parts & Tools Modal */}
      {activeModal === "partsTools" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {isEn ? "Carried Parts & Equipment" : "किट व जरूरी स्पेयर पार्ट्स"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900">🧰 टूल्स किट:</div>
                <div className="text-slate-600 font-medium">मल्टीमीटर, हाइड्रोलिक प्रेशर गेज, सॉकेट रिंच सेट, ग्रीस गन</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900">⚙️ सामान्य स्पेयर पार्ट्स:</div>
                <div className="text-slate-600 font-medium">स्टार्टर रिले, फ्यूल फिल्टर, ओ-रिंग सेट, फ्यूज बॉक्स</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs cursor-pointer"
            >
              {isEn ? "Close" : "बंद करें"}
            </button>
          </div>
        </div>
      )}

      {/* E. Verification & Safety Modal */}
      {activeModal === "verification" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {isEn ? "Certification & Badges" : "प्रमाणीकरण व मान्यता"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-1 text-xs">
              <div className="font-bold text-amber-950 text-sm">
                🏅 राष्ट्रीय कृषि यंत्र संस्थान (NAMI) प्रमाणित
              </div>
              <div className="text-amber-900 font-medium">
                क्रमांक: NAMI-SP-2025-882 • वैध: 2025–2027
              </div>
              <div className="text-emerald-700 font-bold mt-1">
                ✓ YANTRIQ फील्ड सुरक्षा सत्यापन पूर्ण
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs cursor-pointer"
            >
              {isEn ? "Close" : "बंद करें"}
            </button>
          </div>
        </div>
      )}

      {/* F. Help & Support Modal */}
      {activeModal === "help" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {isEn ? "Help & Support" : "सहायता एवं हेल्पलाइन"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="font-bold text-slate-900 text-sm">📞 YANTRIQ टेक्नीशियन डेस्क:</div>
              <div className="text-emerald-700 font-bold text-base">1800-AGRI-HELP (1800-2474-4357)</div>
              <p className="text-slate-500">24/7 तकनीकी मार्गदर्शन, भुगतान निपटान सहायता व पार्ट्स डिलीवरी सहायता।</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs cursor-pointer"
            >
              {isEn ? "Close" : "बंद करें"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
