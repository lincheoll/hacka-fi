import { HackathonStatus } from "@/types/global";

export interface AuditLogEntry {
  id: string;
  hackathonId: string;
  action: "STATUS_CHANGE" | "MANUAL_OVERRIDE" | "AUTOMATIC_TRANSITION";
  fromStatus?: HackathonStatus;
  toStatus: HackathonStatus;
  reason: string;
  triggeredBy: "SYSTEM" | "ORGANIZER" | "ADMIN";
  userAddress?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  hackathonId?: string;
  action?: "STATUS_CHANGE" | "MANUAL_OVERRIDE" | "AUTOMATIC_TRANSITION";
  triggeredBy?: "SYSTEM" | "ORGANIZER" | "ADMIN";
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit logger for tracking all hackathon status changes
 */
export class AuditLogger {
  private static readonly API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  /**
   * Log a status change event
   */
  static async logStatusChange(
    entry: Omit<AuditLogEntry, "id" | "timestamp">,
  ): Promise<void> {
    try {
      await this.saveLogEntry(entry);

      // Also log to console for development
      console.log("Audit Log:", {
        hackathonId: entry.hackathonId,
        action: entry.action,
        statusChange: entry.fromStatus
          ? `${entry.fromStatus} → ${entry.toStatus}`
          : entry.toStatus,
        reason: entry.reason,
        triggeredBy: entry.triggeredBy,
        userAddress: entry.userAddress,
      });
    } catch (error) {
      console.error("Failed to log audit entry:", error);
      // In production, you might want to send this to a monitoring service
    }
  }

  /**
   * Log automatic status transition
   */
  static async logAutomaticTransition(
    hackathonId: string,
    fromStatus: HackathonStatus,
    toStatus: HackathonStatus,
    reason: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.logStatusChange({
      hackathonId,
      action: "AUTOMATIC_TRANSITION",
      fromStatus,
      toStatus,
      reason,
      triggeredBy: "SYSTEM",
      metadata,
    });
  }

  /**
   * Log manual status override by organizer
   */
  static async logManualOverride(
    hackathonId: string,
    fromStatus: HackathonStatus,
    toStatus: HackathonStatus,
    reason: string,
    userAddress: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logStatusChange({
      hackathonId,
      action: "MANUAL_OVERRIDE",
      fromStatus,
      toStatus,
      reason,
      triggeredBy: "ORGANIZER",
      userAddress,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log admin intervention
   */
  static async logAdminIntervention(
    hackathonId: string,
    fromStatus: HackathonStatus,
    toStatus: HackathonStatus,
    reason: string,
    adminAddress: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.logStatusChange({
      hackathonId,
      action: "MANUAL_OVERRIDE",
      fromStatus,
      toStatus,
      reason,
      triggeredBy: "ADMIN",
      userAddress: adminAddress,
      metadata,
    });
  }

  /**
   * Retrieve audit logs with filtering
   */
  static async getLogs(filter: AuditLogFilter = {}): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await this.queryLogs(filter);
      return response;
    } catch (error) {
      console.error("Failed to retrieve audit logs:", error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get audit trail for a specific hackathon
   */
  static async getHackathonAuditTrail(
    hackathonId: string,
  ): Promise<AuditLogEntry[]> {
    try {
      const response = await fetch(
        `${this.API_BASE_URL}/audit/hackathons/${hackathonId}/trail`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch audit trail: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to retrieve hackathon audit trail:", error);
      return [];
    }
  }

  /**
   * Get status change summary for a hackathon
   */
  static async getStatusChangeSummary(hackathonId: string): Promise<{
    totalChanges: number;
    automaticChanges: number;
    manualChanges: number;
    lastChange?: AuditLogEntry;
    timeline: Array<{
      status: HackathonStatus;
      timestamp: string;
      triggeredBy: string;
      reason: string;
    }>;
  }> {
    try {
      const response = await fetch(
        `${this.API_BASE_URL}/audit/hackathons/${hackathonId}/summary`,
      );
      if (!response.ok) {
        throw new Error(
          `Failed to fetch status summary: ${response.statusText}`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to retrieve status change summary:", error);
      return {
        totalChanges: 0,
        automaticChanges: 0,
        manualChanges: 0,
        timeline: [],
      };
    }
  }

  /**
   * Private method to save log entry to backend
   */
  private static async saveLogEntry(
    entry: Omit<AuditLogEntry, "id" | "timestamp">,
  ): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/audit/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        throw new Error(`Failed to save audit log: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to save audit entry:", error);
      throw error;
    }
  }

  /**
   * Private method to query logs from backend
   */
  private static async queryLogs(filter: AuditLogFilter): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const params = new URLSearchParams();

      if (filter.hackathonId) params.append("hackathonId", filter.hackathonId);
      if (filter.action) params.append("action", filter.action);
      if (filter.triggeredBy) params.append("triggeredBy", filter.triggeredBy);
      if (filter.fromDate) params.append("fromDate", filter.fromDate);
      if (filter.toDate) params.append("toDate", filter.toDate);
      if (filter.limit) params.append("limit", filter.limit.toString());
      if (filter.offset) params.append("offset", filter.offset.toString());

      const response = await fetch(`${this.API_BASE_URL}/audit/logs?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to query audit logs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to query audit logs:", error);
      throw error;
    }
  }
}

/**
 * Helper function to format audit log for display
 */
export function formatAuditLogEntry(entry: AuditLogEntry): string {
  const statusChange = entry.fromStatus
    ? `${entry.fromStatus} → ${entry.toStatus}`
    : entry.toStatus;

  const user = entry.userAddress
    ? `${entry.userAddress.slice(0, 6)}...${entry.userAddress.slice(-4)}`
    : entry.triggeredBy;

  return `${statusChange} by ${user}: ${entry.reason}`;
}

/**
 * Export audit logs to CSV format
 */
export function exportAuditLogsToCSV(logs: AuditLogEntry[]): string {
  const headers = [
    "Timestamp",
    "Hackathon ID",
    "Action",
    "From Status",
    "To Status",
    "Reason",
    "Triggered By",
    "User Address",
    "IP Address",
  ];

  const csvContent = [
    headers.join(","),
    ...logs.map((log) =>
      [
        log.timestamp,
        log.hackathonId,
        log.action,
        log.fromStatus || "",
        log.toStatus,
        `"${log.reason}"`, // Quote reason to handle commas
        log.triggeredBy,
        log.userAddress || "",
        log.ipAddress || "",
      ].join(","),
    ),
  ].join("\n");

  return csvContent;
}
