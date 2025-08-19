import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditAction, TriggerType, HackathonStatus } from '@prisma/client';

export interface AuditLogEntry {
  hackathonId: string;
  action: AuditAction;
  fromStatus?: HackathonStatus | null;
  toStatus: HackathonStatus;
  reason: string;
  triggeredBy: TriggerType;
  userAddress?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
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

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a status change event
   */
  async logStatusChange(entry: AuditLogEntry): Promise<void> {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          hackathonId: entry.hackathonId,
          action: entry.action,
          fromStatus: entry.fromStatus ?? null,
          toStatus: entry.toStatus,
          reason: entry.reason,
          triggeredBy: entry.triggeredBy,
          userAddress: entry.userAddress ?? null,
          metadata: entry.metadata as any,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });

      this.logger.log('Audit log created:', {
        id: auditLog.id,
        hackathonId: entry.hackathonId,
        action: entry.action,
        statusChange: entry.fromStatus
          ? `${entry.fromStatus} → ${entry.toStatus}`
          : entry.toStatus,
        triggeredBy: entry.triggeredBy,
        userAddress: entry.userAddress,
      });
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Don't throw - logging should not break the main operation
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
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logStatusChange({
      hackathonId,
      action: AuditAction.AUTOMATIC_TRANSITION,
      fromStatus,
      toStatus,
      reason,
      triggeredBy: TriggerType.SYSTEM,
      metadata: metadata ?? null,
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
  ): Promise<void> {
    await this.logStatusChange({
      hackathonId,
      action: AuditAction.MANUAL_OVERRIDE,
      fromStatus,
      toStatus,
      reason,
      triggeredBy: TriggerType.ORGANIZER,
      userAddress,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
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
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logStatusChange({
      hackathonId,
      action: AuditAction.MANUAL_OVERRIDE,
      fromStatus,
      toStatus,
      reason,
      triggeredBy: TriggerType.ADMIN,
      userAddress: adminAddress,
      metadata: metadata ?? null,
    });
  }

  /**
   * Retrieve audit logs with filtering
   */
  async getLogs(filter: AuditLogFilter = {}): Promise<{
    logs: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const whereClause: any = {};

      if (filter.hackathonId) {
        whereClause.hackathonId = filter.hackathonId;
      }

      if (filter.action) {
        whereClause.action = filter.action;
      }

      if (filter.triggeredBy) {
        whereClause.triggeredBy = filter.triggeredBy;
      }

      if (filter.fromDate || filter.toDate) {
        whereClause.createdAt = {};
        if (filter.fromDate) {
          whereClause.createdAt.gte = filter.fromDate;
        }
        if (filter.toDate) {
          whereClause.createdAt.lte = filter.toDate;
        }
      }

      const limit = filter.limit || 50;
      const offset = filter.offset || 0;

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: whereClause,
          include: {
            hackathon: {
              select: {
                title: true,
              },
            },
            user: {
              select: {
                username: true,
                walletAddress: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: offset,
        }),
        this.prisma.auditLog.count({
          where: whereClause,
        }),
      ]);

      // Parse metadata JSON
      const enrichedLogs = logs.map((log) => ({
        ...log,
        metadata: log.metadata as any,
      }));

      return {
        logs: enrichedLogs,
        total,
        hasMore: offset + logs.length < total,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve audit logs:', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get audit trail for a specific hackathon
   */
  async getHackathonAuditTrail(hackathonId: string): Promise<any[]> {
    const { logs } = await this.getLogs({
      hackathonId,
      limit: 100, // Get all entries for the hackathon
    });

    return logs.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  /**
   * Get status change summary for a hackathon
   */
  async getStatusChangeSummary(hackathonId: string): Promise<{
    totalChanges: number;
    automaticChanges: number;
    manualChanges: number;
    lastChange?: any;
    timeline: Array<{
      status: HackathonStatus;
      timestamp: string;
      triggeredBy: TriggerType;
      reason: string;
    }>;
  }> {
    try {
      const logs = await this.getHackathonAuditTrail(hackathonId);

      const automaticChanges = logs.filter(
        (log) => log.triggeredBy === TriggerType.SYSTEM,
      ).length;

      const manualChanges = logs.filter(
        (log) => log.triggeredBy !== TriggerType.SYSTEM,
      ).length;

      const timeline = logs.map((log) => ({
        status: log.toStatus,
        timestamp: log.createdAt,
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
    } catch (error) {
      this.logger.error('Failed to get status change summary:', error);
      return {
        totalChanges: 0,
        automaticChanges: 0,
        manualChanges: 0,
        timeline: [],
      };
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByTrigger: Record<string, number>;
    recentActivity: any[];
  }> {
    try {
      const [totalLogs, logsByAction, logsByTrigger, recentActivity] =
        await Promise.all([
          this.prisma.auditLog.count(),
          this.prisma.auditLog.groupBy({
            by: ['action'],
            _count: { action: true },
          }),
          this.prisma.auditLog.groupBy({
            by: ['triggeredBy'],
            _count: { triggeredBy: true },
          }),
          this.prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              hackathon: { select: { title: true } },
              user: { select: { username: true } },
            },
          }),
        ]);

      return {
        totalLogs,
        logsByAction: logsByAction.reduce(
          (acc, item) => {
            acc[item.action] = item._count.action;
            return acc;
          },
          {} as Record<string, number>,
        ),
        logsByTrigger: logsByTrigger.reduce(
          (acc, item) => {
            acc[item.triggeredBy] = item._count.triggeredBy;
            return acc;
          },
          {} as Record<string, number>,
        ),
        recentActivity,
      };
    } catch (error) {
      this.logger.error('Failed to get audit statistics:', error);
      return {
        totalLogs: 0,
        logsByAction: {},
        logsByTrigger: {},
        recentActivity: [],
      };
    }
  }

  /**
   * Delete old audit logs (for maintenance)
   */
  async cleanupOldLogs(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(
        `Cleaned up ${result.count} audit logs older than ${olderThanDays} days`,
      );

      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup old audit logs:', error);
      return 0;
    }
  }
}
