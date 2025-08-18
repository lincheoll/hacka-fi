import { HackathonStatus } from "@/types/global";

export interface AuditLogEntry {
  id: string;
  hackathonId: string;
  action: "status_change" | "manual_override" | "automatic_transition";
  fromStatus?: HackathonStatus;
  toStatus: HackathonStatus;
  reason: string;
  triggeredBy: "system" | "organizer" | "admin";
  userAddress?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  hackathonId?: string;
  action?: string;
  triggeredBy?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit logger for tracking all hackathon status changes
 */
export class AuditLogger {
  /**
   * Log a status change event
   */
  static async logStatusChange(
    entry: Omit<AuditLogEntry, "id" | "timestamp">,
  ): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      id: generateLogId(),
      timestamp: new Date().toISOString(),
    };

    try {
      // TODO: Implement actual database logging
      await this.saveLogEntry(logEntry);

      // Also log to console for development
      console.log("Audit Log:", {
        hackathonId: logEntry.hackathonId,
        action: logEntry.action,
        statusChange: logEntry.fromStatus
          ? `${logEntry.fromStatus} → ${logEntry.toStatus}`
          : logEntry.toStatus,
        reason: logEntry.reason,
        triggeredBy: logEntry.triggeredBy,
        userAddress: logEntry.userAddress,
        timestamp: logEntry.timestamp,
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
      action: "automatic_transition",
      fromStatus,
      toStatus,
      reason,
      triggeredBy: "system",
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
      action: "manual_override",
      fromStatus,
      toStatus,
      reason,
      triggeredBy: "organizer",
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
      action: "manual_override",
      fromStatus,
      toStatus,
      reason,
      triggeredBy: "admin",
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
      // TODO: Implement actual database query
      const { logs, total } = await this.queryLogs(filter);

      return {
        logs,
        total,
        hasMore: (filter.offset || 0) + logs.length < total,
      };
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
    const { logs } = await this.getLogs({
      hackathonId,
      limit: 100, // Get all entries for the hackathon
    });

    return logs.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
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
    const logs = await this.getHackathonAuditTrail(hackathonId);

    const automaticChanges = logs.filter(
      (log) => log.triggeredBy === "system",
    ).length;
    const manualChanges = logs.filter(
      (log) => log.triggeredBy !== "system",
    ).length;

    const timeline = logs.map((log) => ({
      status: log.toStatus,
      timestamp: log.timestamp,
      triggeredBy: log.triggeredBy,
      reason: log.reason,
    }));

    return {
      totalChanges: logs.length,
      automaticChanges,
      manualChanges,
      lastChange: logs[logs.length - 1],
      timeline,
    };
  }

  /**
   * Private method to save log entry (implement with your database)
   * TODO: This should be moved to NestJS backend and use actual database
   */
  private static async saveLogEntry(entry: AuditLogEntry): Promise<void> {
    // TODO: MOVE TO NESTJS BACKEND
    // This is a temporary mock implementation
    // Real implementation should be in apps/api/src/audit/audit-logger.service.ts

    console.warn("MOCK: Audit log not saved to database:", entry);
    // For now, we'll just store in memory (not persistent)
  }

  /**
   * Private method to query logs (implement with your database)
   * TODO: This should be moved to NestJS backend and use actual database
   */
  private static async queryLogs(): Promise<{
    logs: AuditLogEntry[];
    total: number;
  }> {
    // TODO: MOVE TO NESTJS BACKEND
    // This is a temporary mock implementation
    console.warn("MOCK: Audit logs not queried from database");

    return {
      logs: [], // Return actual logs from database
      total: 0,
    };
  }
}

/**
 * Generate unique log ID
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
