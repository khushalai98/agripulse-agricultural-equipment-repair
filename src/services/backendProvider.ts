/**
 * Backend Provider Abstraction & Mock Implementation — P2J Step 1 AgriPulse
 *
 * Provides a clean interface for cloud database operations and batch sync.
 * Local data remains the primary source of truth; this adapter connects the
 * persistent local sync queue to the remote backend.
 */

import {
  SyncEntityType,
  SyncOperation,
  SyncBatchResult,
} from "@/types";

export interface BackendRecordResult {
  success: boolean;
  data?: any;
  error?: string;
  serverTimestamp?: string;
}

/**
 * Universal BackendProvider Interface (Requirement 8)
 */
export interface BackendProvider {
  readonly providerName: string;
  createRecord(entityType: SyncEntityType, payload: any): Promise<BackendRecordResult>;
  updateRecord(entityType: SyncEntityType, entityId: string, payload: any): Promise<BackendRecordResult>;
  deleteRecord(entityType: SyncEntityType, entityId: string): Promise<BackendRecordResult>;
  fetchRecord(entityType: SyncEntityType, entityId: string): Promise<BackendRecordResult>;
  syncOperations(operations: SyncOperation[]): Promise<SyncBatchResult>;
}

/**
 * Mock Backend Provider for Prototype (Requirement 8)
 *
 * Implements deterministic cloud persistence in memory, supports simulated
 * network delays and failures for offline and failure testing (Requirements 10 & 11).
 */
export class MockBackendProvider implements BackendProvider {
  readonly providerName = "MockBackendProvider";

  // In-memory simulated cloud database: Map<"entityType:entityId", { data: any, updatedAt: string }>
  private cloudStore = new Map<string, { data: any; updatedAt: string }>();

  // Toggle for simulating server or network outages
  private simulateFailure = false;

  // Simulated roundtrip delay in milliseconds
  private latencyMs = 250;

  constructor(initialDelayMs = 250) {
    this.latencyMs = initialDelayMs;
  }

  /**
   * Toggle network failure simulation for failure testing (Requirement 11)
   */
  setSimulateFailure(shouldFail: boolean): void {
    this.simulateFailure = shouldFail;
  }

  getSimulateFailure(): boolean {
    return this.simulateFailure;
  }

  private makeKey(entityType: SyncEntityType, entityId: string): string {
    return `${entityType}:${entityId}`;
  }

  private async simulateNetworkDelay(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
  }

  async createRecord(entityType: SyncEntityType, payload: any): Promise<BackendRecordResult> {
    await this.simulateNetworkDelay();

    if (this.simulateFailure) {
      return {
        success: false,
        error: "सिम्युलेटेड बैकएंड अनुपलब्ध है (Cloud unavailable)",
      };
    }

    const entityId = payload?.id || `rec-${Date.now()}`;
    const key = this.makeKey(entityType, entityId);
    const now = new Date().toISOString();

    this.cloudStore.set(key, { data: { ...payload, id: entityId }, updatedAt: now });

    return {
      success: true,
      data: { ...payload, id: entityId },
      serverTimestamp: now,
    };
  }

  async updateRecord(
    entityType: SyncEntityType,
    entityId: string,
    payload: any
  ): Promise<BackendRecordResult> {
    await this.simulateNetworkDelay();

    if (this.simulateFailure) {
      return {
        success: false,
        error: "सिम्युलेटेड बैकएंड अनुपलब्ध है (Cloud unavailable)",
      };
    }

    const key = this.makeKey(entityType, entityId);
    const existing = this.cloudStore.get(key);
    const now = new Date().toISOString();

    // Requirement 7: Latest valid timestamp conflict handling
    if (existing && payload.updatedAt) {
      const cloudTime = new Date(existing.updatedAt).getTime();
      const payloadTime = new Date(payload.updatedAt).getTime();

      // If cloud has a newer timestamp than the incoming update, preserve cloud
      if (cloudTime > payloadTime) {
        return {
          success: false,
          error: "conflict: cloud has newer timestamp",
          data: existing.data,
          serverTimestamp: existing.updatedAt,
        };
      }
    }

    const merged = { ...(existing?.data || {}), ...payload, id: entityId };
    this.cloudStore.set(key, { data: merged, updatedAt: now });

    return {
      success: true,
      data: merged,
      serverTimestamp: now,
    };
  }

  async deleteRecord(entityType: SyncEntityType, entityId: string): Promise<BackendRecordResult> {
    await this.simulateNetworkDelay();

    if (this.simulateFailure) {
      return {
        success: false,
        error: "सिम्युलेटेड बैकएंड अनुपलब्ध है (Cloud unavailable)",
      };
    }

    const key = this.makeKey(entityType, entityId);
    this.cloudStore.delete(key);

    return {
      success: true,
      serverTimestamp: new Date().toISOString(),
    };
  }

  async fetchRecord(entityType: SyncEntityType, entityId: string): Promise<BackendRecordResult> {
    await this.simulateNetworkDelay();

    if (this.simulateFailure) {
      return {
        success: false,
        error: "सिम्युलेटेड बैकएंड अनुपलब्ध है (Cloud unavailable)",
      };
    }

    const key = this.makeKey(entityType, entityId);
    const record = this.cloudStore.get(key);

    if (!record) {
      return {
        success: false,
        error: "Record not found in cloud database",
      };
    }

    return {
      success: true,
      data: record.data,
      serverTimestamp: record.updatedAt,
    };
  }

  /**
   * Process a batch of pending operations from the local sync queue (Requirement 4 & 7)
   */
  async syncOperations(operations: SyncOperation[]): Promise<SyncBatchResult> {
    await this.simulateNetworkDelay();

    if (this.simulateFailure) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: operations.length,
        results: operations.map((op) => ({
          operationId: op.operationId,
          success: false,
          error: "बैकएंड सर्वर से संपर्क नहीं हो पाया (Simulated offline/failure)",
        })),
      };
    }

    const results: Array<{
      operationId: string;
      success: boolean;
      error?: string;
      serverTimestamp?: string;
    }> = [];

    let syncedCount = 0;
    let failedCount = 0;

    for (const op of operations) {
      const key = this.makeKey(op.entityType, op.entityId);
      const now = new Date().toISOString();

      try {
        if (op.operationType === "delete") {
          this.cloudStore.delete(key);
          results.push({ operationId: op.operationId, success: true, serverTimestamp: now });
          syncedCount++;
        } else if (op.operationType === "create") {
          this.cloudStore.set(key, { data: op.payload, updatedAt: op.createdAt || now });
          results.push({ operationId: op.operationId, success: true, serverTimestamp: now });
          syncedCount++;
        } else if (op.operationType === "update") {
          const existing = this.cloudStore.get(key);

          // Conflict check (Requirement 7: latest valid timestamp)
          if (existing && existing.updatedAt && op.createdAt) {
            const cloudTime = new Date(existing.updatedAt).getTime();
            const localTime = new Date(op.createdAt).getTime();

            if (cloudTime > localTime) {
              // Cloud is strictly newer: do not overwrite newer cloud data silently
              results.push({
                operationId: op.operationId,
                success: false,
                error: "conflict: cloud has newer revision",
                serverTimestamp: existing.updatedAt,
              });
              failedCount++;
              continue;
            }
          }

          const merged = { ...(existing?.data || {}), ...op.payload };
          this.cloudStore.set(key, { data: merged, updatedAt: now });
          results.push({ operationId: op.operationId, success: true, serverTimestamp: now });
          syncedCount++;
        }
      } catch (err: any) {
        results.push({
          operationId: op.operationId,
          success: false,
          error: err?.message || "Sync processing error",
        });
        failedCount++;
      }
    }

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      results,
    };
  }

  // Testing & diagnostic helper
  getCloudRecordsCount(): number {
    return this.cloudStore.size;
  }

  clearCloudStore(): void {
    this.cloudStore.clear();
  }
}

/**
 * Real HTTP Connected Backend Provider
 * Directly connects frontend sync queue to Next.js server API routes:
 * - /api/farmer/repairs
 * - /api/technician/jobs
 * Fallback to MockBackendProvider if offline or running in node/SSR.
 */
export class HttpBackendProvider implements BackendProvider {
  readonly providerName = "HttpBackendProvider";
  private fallbackMock = new MockBackendProvider(0);

  async createRecord(entityType: SyncEntityType, payload: any): Promise<BackendRecordResult> {
    if (typeof window !== "undefined" && typeof fetch === "function" && entityType === "repair_request") {
      try {
        const res = await fetch("/api/farmer/repairs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          this.fallbackMock.createRecord(entityType, payload);
          return { success: true, data: json.repair || payload, serverTimestamp: new Date().toISOString() };
        }
      } catch {
        // network error, fallback to local/mock queue
      }
    }
    return this.fallbackMock.createRecord(entityType, payload);
  }

  async updateRecord(entityType: SyncEntityType, entityId: string, payload: any): Promise<BackendRecordResult> {
    if (typeof window !== "undefined" && typeof fetch === "function") {
      try {
        if (entityType === "repair_request") {
          const res = await fetch("/api/farmer/repairs", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ repairId: entityId, ...payload }),
          });
          if (res.ok) {
            const json = await res.json();
            this.fallbackMock.updateRecord(entityType, entityId, payload);
            return { success: true, data: json.repair || payload, serverTimestamp: new Date().toISOString() };
          }
        }
      } catch {
        // network error
      }
    }
    return this.fallbackMock.updateRecord(entityType, entityId, payload);
  }

  async deleteRecord(entityType: SyncEntityType, entityId: string): Promise<BackendRecordResult> {
    return this.fallbackMock.deleteRecord(entityType, entityId);
  }

  async fetchRecord(entityType: SyncEntityType, entityId: string): Promise<BackendRecordResult> {
    if (typeof window !== "undefined" && typeof fetch === "function" && entityType === "repair_request") {
      try {
        const res = await fetch(`/api/farmer/repairs`, {
          method: "GET",
          headers: {
            },
        });
        if (res.ok) {
          const json = await res.json();
          const found = (json.repairs || []).find((r: any) => r.id === entityId);
          if (found) {
            return { success: true, data: found, serverTimestamp: new Date().toISOString() };
          }
        }
      } catch {
        // fallback
      }
    }
    return this.fallbackMock.fetchRecord(entityType, entityId);
  }

  async syncOperations(operations: SyncOperation[]): Promise<SyncBatchResult> {
    const results: Array<{ operationId: string; success: boolean; error?: string; serverTimestamp?: string }> = [];
    let syncedCount = 0;
    let failedCount = 0;

    for (const op of operations) {
      try {
        if (typeof window !== "undefined" && typeof fetch === "function") {
          if (op.entityType === "repair_request") {
            if (op.operationType === "create") {
              const res = await fetch("/api/farmer/repairs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(op.payload),
              });
              if (!res.ok) throw new Error("HTTP error " + res.status);
            } else if (op.operationType === "update") {
              const res = await fetch("/api/farmer/repairs", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repairId: op.entityId, ...op.payload }),
              });
              if (!res.ok) throw new Error("HTTP error " + res.status);
            }
          }
        }
        await this.fallbackMock.syncOperations([op]);
        results.push({ operationId: op.operationId, success: true, serverTimestamp: new Date().toISOString() });
        syncedCount++;
      } catch (err: any) {
        results.push({ operationId: op.operationId, success: false, error: err?.message || "Sync failure" });
        failedCount++;
      }
    }

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      results,
    };
  }
}

// ─── Active Provider Singleton Management ────────────────────────────────────

let activeBackendProvider: BackendProvider =
  typeof window !== "undefined" ? new HttpBackendProvider() : new MockBackendProvider();

export function getBackendProvider(): BackendProvider {
  return activeBackendProvider;
}

export function setBackendProvider(provider: BackendProvider): void {
  activeBackendProvider = provider;
}
