import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditAction, TriggerType, HackathonStatus, Prisma } from '@prisma/client';

export interface AuditLogEntry {
  id: string;
  hackathonId: string;
  action: AuditAction;
  fromStatus?: HackathonStatus;
  toStatus: HackathonStatus;
  reason: string;
  triggeredBy: TriggerType;
  userAddress?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  hackathonId?: string;
  action?: AuditAction;
  triggeredBy?: TriggerType;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface CreateAuditLogDto {
  hackathonId: string;
  action: AuditAction;
  fromStatus?: HackathonStatus;
  toStatus: HackathonStatus;
  reason: string;
  triggeredBy: TriggerType;
  userAddress?: string;
  metadata?: Record<string, unknown> | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a status change event
   */
  async logStatusChange(dto: CreateAuditLogDto): Promise<AuditLogEntry> {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          hackathonId: dto.hackathonId,
          action: dto.action,
          fromStatus: dto.fromStatus ?? null,
          toStatus: dto.toStatus,
          reason: dto.reason,
          triggeredBy: dto.triggeredBy,
          userAddress: dto.userAddress ?? null,
          metadata: dto.metadata as any,
          ipAddress: dto.ipAddress ?? null,
          userAgent: dto.userAgent ?? null,
        },
      });

      this.logger.log(
        `Audit log created: ${dto.action} for hackathon ${dto.hackathonId}`,
        {
          auditLogId: auditLog.id,
          statusChange: dto.fromStatus
            ? `${dto.fromStatus} → ${dto.toStatus}`
            : dto.toStatus,
          triggeredBy: dto.triggeredBy,
          userAddress: dto.userAddress,
        },
      );

      return this.mapToAuditLogEntry(auditLog);
    } catch (error) {
      this.logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : String(error),
        dto,
      });
      throw error;
    }
  }

  /**
   * Log automatic status transition
   */
  async logAutomaticTransition(
    hackathonId: string,
    fromStatus: HackathonStatus,
    toStatus: HackathonStatus,
    reason: string,
    metadata?: Record<string, unknown>,
  ): Promise<AuditLogEntry> {
    return this.logStatusChange({
      hackathonId,
      action: AuditAction.AUTOMATIC_TRANSITION,
      fromStatus,
      toStatus,
      reason,
      triggeredBy: TriggerType.SYSTEM,
      metadata: metadata || undefined,
    });
  }

  /**
   * Log manual status override by organizer
   */
  async logManualOverride(
    hackathonId: string,
    fromStatus: HackathonStatus,
    toStatus: HackathonStatus,
    reason: string,
    userAddress: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditLogEntry> {
    return this.logStatusChange({
      hackathonId,
      action: AuditAction.MANUAL_OVERRIDE,
      fromStatus,
      toStatus,
      reason,
      triggeredBy: TriggerType.ORGANIZER,
      userAddress,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });
  }

  /**
   * Log admin intervention
   */
  async logAdminIntervention(
    hackathonId: string,
    fromStatus: HackathonStatus,
    toStatus: HackathonStatus,
    reason: string,
    adminAddress: string,
    metadata?: Record<string, unknown>,
  ): Promise<AuditLogEntry> {
    return this.logStatusChange({
      hackathonId,
      action: AuditAction.MANUAL_OVERRIDE,
      fromStatus,
      toStatus,
      reason,
      triggeredBy: TriggerType.ADMIN,
      userAddress: adminAddress,
      metadata: metadata || undefined,
    });
  }

  /**
   * Retrieve audit logs with filtering
   */
  async getLogs(filter: AuditLogFilter = {}): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        hackathonId,
        action,
        triggeredBy,
        fromDate,
        toDate,
        limit = 50,
        offset = 0,
      } = filter;

      // Build where clause
      const where: Prisma.AuditLogWhereInput = {};

      if (hackathonId) {
        where.hackathonId = hackathonId;
      }

      if (action) {
        where.action = action;
      }

      if (triggeredBy) {
        where.triggeredBy = triggeredBy;
      }

      if (fromDate || toDate) {
        where.timestamp = {};
        if (fromDate) {
          where.timestamp.gte = fromDate;
        }
        if (toDate) {
          where.timestamp.lte = toDate;
        }
      }

      // Get total count
      const total = await this.prisma.auditLog.count({ where });

      // Get paginated results
      const auditLogs = await this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        include: {
          hackathon: {
            select: {
              title: true,
              organizerAddress: true,
            },
          },
          user: {
            select: {
              username: true,
              walletAddress: true,
            },
          },
        },
      });

      const logs = auditLogs.map((log) => this.mapToAuditLogEntry(log));

      return {
        logs,
        total,
        hasMore: offset + logs.length < total,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve audit logs', {
        error: error instanceof Error ? error.message : String(error),
        filter,
      });
      throw error;
    }
  }

  /**
   * Get audit trail for a specific hackathon
   */
  async getHackathonAuditTrail(hackathonId: string): Promise<AuditLogEntry[]> {
    const { logs } = await this.getLogs({
      hackathonId,
      limit: 100, // Get all entries for the hackathon
    });

    return logs.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  /**
   * Get status change summary for a hackathon
   */
  async getStatusChangeSummary(hackathonId: string): Promise<{
    totalChanges: number;
    automaticChanges: number;
    manualChanges: number;
    lastChange?: AuditLogEntry;
    timeline: Array<{
      status: HackathonStatus;
      timestamp: Date;
      triggeredBy: TriggerType;
      reason: string;
    }>;
  }> {
    const logs = await this.getHackathonAuditTrail(hackathonId);

    const automaticChanges = logs.filter(
      (log) => log.triggeredBy === TriggerType.SYSTEM,
    ).length;

    const manualChanges = logs.filter(
      (log) => log.triggeredBy !== TriggerType.SYSTEM,
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
   * Export audit logs to CSV format
   */
  async exportAuditLogsToCSV(filter: AuditLogFilter = {}): Promise<string> {
    const { logs } = await this.getLogs({
      ...filter,
      limit: 10000, // Large limit for export
    });

    const headers = [
      'Timestamp',
      'Hackathon ID',
      'Action',
      'From Status',
      'To Status',
      'Reason',
      'Triggered By',
      'User Address',
      'IP Address',
    ];

    const csvContent = [
      headers.join(','),
      ...logs.map((log) =>
        [
          log.timestamp.toISOString(),
          log.hackathonId,
          log.action,
          log.fromStatus || '',
          log.toStatus,
          `"${log.reason}"`, // Quote reason to handle commas
          log.triggeredBy,
          log.userAddress || '',
          log.ipAddress || '',
        ].join(','),
      ),
    ].join('\n');

    return csvContent;
  }

  /**
   * Map database model to service interface
   */
  private mapToAuditLogEntry(log: any): AuditLogEntry {
    return {
      id: log.id,
      hackathonId: log.hackathonId,
      action: log.action,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      reason: log.reason,
      triggeredBy: log.triggeredBy,
      userAddress: log.userAddress,
      metadata: log.metadata as Record<string, unknown>,
      timestamp: log.timestamp,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
    };
  }
}