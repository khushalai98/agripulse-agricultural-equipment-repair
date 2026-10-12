/**
 * navigationHistory.ts
 * Unified Navigation & History Architecture for YANTRIQ (AgriPulse).
 * 
 * Supports:
 * - Real browser & in-app back navigation stack using HTML5 History API.
 * - Modal & overlay interception (Back closes modals first before navigating).
 * - Safe parent fallback for deep links and empty history.
 * - Strict role-based isolation (Farmer vs Technician).
 * - Zero unneeded reloads or API refetches.
 */

export type NavigationRole = "farmer" | "technician";

export type FarmerScreenType =
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

export interface FarmerSubState {
  machineId?: string;
  breakdownStep?: 1 | 2 | 3 | 4;
  breakdownMachineId?: string;
  sahayakStep?: "init" | "voice" | "photo" | "urgency" | "ready";
  diagnosisOrigin?: "breakdown" | "sahayak";
  activeJobCardRepairId?: string;
  repairId?: string;
  selectedTab?: string;
  fromScreen?: FarmerScreenType;
  modal?: string | null;
}

export interface FarmerNavSnapshot {
  role: "farmer";
  screen: FarmerScreenType;
  subState?: FarmerSubState;
  title?: string;
  timestamp: number;
}

export type TechnicianTabType = "home" | "requests" | "repairs" | "profile";

export interface TechnicianNavSnapshot {
  role: "technician";
  activeTab: TechnicianTabType;
  repairsSubTab?: "active" | "completed";
  selectedJobCardId?: string | null;
  viewingRequestId?: string | null;
  fromView?: "requests" | "repairs" | "home" | "viewing_request";
  modal?: string | null;
  title?: string;
  timestamp: number;
}

export type AppNavSnapshot = FarmerNavSnapshot | TechnicianNavSnapshot;

// In-memory stack tracking
const farmerHistoryStack: FarmerNavSnapshot[] = [];
const technicianHistoryStack: TechnicianNavSnapshot[] = [];

// Registered modal close callbacks (LIFO stack)
interface ModalRegistration {
  id: string;
  closeFn: () => void;
}
const activeModalStack: ModalRegistration[] = [];

/**
 * Register an active modal or overlay so pressing Back dismisses it first.
 */
export function registerOpenModal(id: string, closeFn: () => void): () => void {
  // Remove duplicate if already present
  const existingIdx = activeModalStack.findIndex((m) => m.id === id);
  if (existingIdx !== -1) {
    activeModalStack.splice(existingIdx, 1);
  }
  activeModalStack.push({ id, closeFn });

  return () => {
    unregisterModal(id);
  };
}

/**
 * Unregister a modal when dismissed by its own close button or action.
 */
export function unregisterModal(id: string): void {
  const idx = activeModalStack.findIndex((m) => m.id === id);
  if (idx !== -1) {
    activeModalStack.splice(idx, 1);
  }
}

/**
 * Check if any modal is currently open.
 */
export function hasOpenModals(): boolean {
  return activeModalStack.length > 0;
}

/**
 * Close the topmost open modal. Returns true if a modal was closed.
 */
export function closeTopModal(): boolean {
  if (activeModalStack.length > 0) {
    const top = activeModalStack.pop();
    if (top) {
      try {
        top.closeFn();
      } catch (err) {
        console.warn("[NavigationHistory] Error closing modal:", err);
      }
      return true;
    }
  }
  return false;
}

/**
 * Clear all registered modals (e.g. on role switch or logout).
 */
export function clearAllModals(): void {
  activeModalStack.length = 0;
}

// ─── FARMER NAVIGATION HELPERS ───────────────────────────────────────────────

export function getFarmerHistoryDepth(): number {
  return farmerHistoryStack.length;
}

export function getCurrentFarmerSnapshot(): FarmerNavSnapshot | null {
  return farmerHistoryStack.length > 0
    ? farmerHistoryStack[farmerHistoryStack.length - 1]
    : null;
}

export function pushFarmerHistory(snapshot: Omit<FarmerNavSnapshot, "timestamp">): void {
  const fullSnapshot: FarmerNavSnapshot = {
    ...snapshot,
    timestamp: Date.now(),
  };

  // Avoid redundant adjacent entries
  const current = getCurrentFarmerSnapshot();
  if (
    current &&
    current.screen === fullSnapshot.screen &&
    JSON.stringify(current.subState || {}) === JSON.stringify(fullSnapshot.subState || {})
  ) {
    // Replace state in browser history instead of duplicating
    if (typeof window !== "undefined") {
      try {
        window.history.replaceState(fullSnapshot, fullSnapshot.title || "");
      } catch {}
    }
    farmerHistoryStack[farmerHistoryStack.length - 1] = fullSnapshot;
    return;
  }

  farmerHistoryStack.push(fullSnapshot);
  if (typeof window !== "undefined") {
    try {
      window.history.pushState(fullSnapshot, fullSnapshot.title || "");
    } catch {}
  }
}

export function replaceFarmerHistory(snapshot: Omit<FarmerNavSnapshot, "timestamp">): void {
  const fullSnapshot: FarmerNavSnapshot = {
    ...snapshot,
    timestamp: Date.now(),
  };

  if (farmerHistoryStack.length > 0) {
    farmerHistoryStack[farmerHistoryStack.length - 1] = fullSnapshot;
  } else {
    farmerHistoryStack.push(fullSnapshot);
  }

  if (typeof window !== "undefined") {
    try {
      window.history.replaceState(fullSnapshot, fullSnapshot.title || "");
    } catch {}
  }
}

export function popFarmerHistory(): FarmerNavSnapshot | null {
  if (farmerHistoryStack.length > 1) {
    farmerHistoryStack.pop(); // Remove current
    return farmerHistoryStack[farmerHistoryStack.length - 1] || null;
  }
  return null;
}

/**
 * Fallback parent screen for farmer routes when history is empty or on deep links.
 */
export function getFarmerParentScreen(
  currentScreen: FarmerScreenType,
  subState?: FarmerSubState
): { screen: FarmerScreenType; subState?: FarmerSubState } {
  // If subState specified a known parent or origin, respect it
  if (subState?.fromScreen) {
    return { screen: subState.fromScreen };
  }

  switch (currentScreen) {
    case "machine_detail":
      return { screen: "machines" };

    case "breakdown":
      if (subState?.breakdownStep && subState.breakdownStep > 1) {
        return {
          screen: "breakdown",
          subState: {
            ...subState,
            breakdownStep: (subState.breakdownStep - 1) as 1 | 2 | 3 | 4,
          },
        };
      }
      return { screen: "home" };

    case "breakdown_success":
      return { screen: "repair" };

    case "diagnosis":
      if (subState?.diagnosisOrigin === "sahayak") {
        return { screen: "sahayak", subState: { sahayakStep: "init" } };
      }
      return {
        screen: "breakdown",
        subState: {
          breakdownStep: 2,
          breakdownMachineId: subState?.breakdownMachineId || "tractor",
        },
      };

    case "technician_match":
      if (subState?.fromScreen) {
        return { screen: subState.fromScreen };
      }
      return { screen: "diagnosis" };

    case "technician_job_card":
      return { screen: "repair" };

    case "repair_verification":
      return { screen: subState?.activeJobCardRepairId ? "technician_job_card" : "repair" };

    case "job_ready_verification":
      return { screen: "repair_verification" };

    case "nearby_mechanics":
      return { screen: "technician_match" };

    case "recovery_engine":
      return { screen: "technician_match" };

    case "sahayak":
      return { screen: "home" };

    case "kisan_help":
      return { screen: "home" };

    case "profile":
      return { screen: "home" };

    case "machines":
      return { screen: "home" };

    case "repair":
      return { screen: "home" };

    case "service":
      return { screen: "home" };

    default:
      return { screen: "home" };
  }
}

// ─── TECHNICIAN NAVIGATION HELPERS ───────────────────────────────────────────

export function getTechnicianHistoryDepth(): number {
  return technicianHistoryStack.length;
}

export function getCurrentTechnicianSnapshot(): TechnicianNavSnapshot | null {
  return technicianHistoryStack.length > 0
    ? technicianHistoryStack[technicianHistoryStack.length - 1]
    : null;
}

export function pushTechnicianHistory(snapshot: Omit<TechnicianNavSnapshot, "timestamp">): void {
  const fullSnapshot: TechnicianNavSnapshot = {
    ...snapshot,
    timestamp: Date.now(),
  };

  const current = getCurrentTechnicianSnapshot();
  if (
    current &&
    current.activeTab === fullSnapshot.activeTab &&
    current.selectedJobCardId === fullSnapshot.selectedJobCardId &&
    current.viewingRequestId === fullSnapshot.viewingRequestId &&
    current.repairsSubTab === fullSnapshot.repairsSubTab
  ) {
    if (typeof window !== "undefined") {
      try {
        window.history.replaceState(fullSnapshot, fullSnapshot.title || "");
      } catch {}
    }
    technicianHistoryStack[technicianHistoryStack.length - 1] = fullSnapshot;
    return;
  }

  technicianHistoryStack.push(fullSnapshot);
  if (typeof window !== "undefined") {
    try {
      window.history.pushState(fullSnapshot, fullSnapshot.title || "");
    } catch {}
  }
}

export function replaceTechnicianHistory(snapshot: Omit<TechnicianNavSnapshot, "timestamp">): void {
  const fullSnapshot: TechnicianNavSnapshot = {
    ...snapshot,
    timestamp: Date.now(),
  };

  if (technicianHistoryStack.length > 0) {
    technicianHistoryStack[technicianHistoryStack.length - 1] = fullSnapshot;
  } else {
    technicianHistoryStack.push(fullSnapshot);
  }

  if (typeof window !== "undefined") {
    try {
      window.history.replaceState(fullSnapshot, fullSnapshot.title || "");
    } catch {}
  }
}

export function popTechnicianHistory(): TechnicianNavSnapshot | null {
  if (technicianHistoryStack.length > 1) {
    technicianHistoryStack.pop();
    return technicianHistoryStack[technicianHistoryStack.length - 1] || null;
  }
  return null;
}

/**
 * Fallback parent view for technician routes.
 */
export function getTechnicianParentView(
  current: TechnicianNavSnapshot
): Partial<TechnicianNavSnapshot> {
  // If viewing a digital job card
  if (current.selectedJobCardId) {
    // If was opened from Request Details modal, return to Request Details
    if (current.fromView === "viewing_request" && current.viewingRequestId) {
      return {
        selectedJobCardId: null,
        viewingRequestId: current.viewingRequestId,
        activeTab: current.activeTab,
      };
    }
    // Otherwise return to repairs list
    return {
      selectedJobCardId: null,
      activeTab: "repairs",
      repairsSubTab: current.repairsSubTab || "active",
    };
  }

  // If viewing Request Details modal
  if (current.viewingRequestId) {
    return {
      viewingRequestId: null,
      activeTab: "requests",
    };
  }

  // If on non-home tab
  if (current.activeTab !== "home") {
    return {
      activeTab: "home",
    };
  }

  return { activeTab: "home" };
}

/**
 * Reset stacks (called on user logout or role switch).
 */
export function resetNavigationHistory(): void {
  farmerHistoryStack.length = 0;
  technicianHistoryStack.length = 0;
  activeModalStack.length = 0;
}
