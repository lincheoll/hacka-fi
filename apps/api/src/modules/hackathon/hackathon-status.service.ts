import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HackathonStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { HackathonService } from './hackathon.service';
import { AuditLoggerService } from '../audit/audit-logger.service';

interface StatusTransition {
  from: HackathonStatus;
  to: HackathonStatus;
  condition: (hackathon: any) => boolean;
  reason: string;
}

@Injectable()
export class HackathonStatusService {
  private readonly logger = new Logger(HackathonStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hackathonService: HackathonService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  /**
   * Automatic status transition rules based on timeline
   */
  private readonly statusTransitions: StatusTransition[] = [
    {
      from: HackathonStatus.REGISTRATION_OPEN,
      to: HackathonStatus.REGISTRATION_CLOSED,
      condition: (hackathon) => new Date() > new Date(hackathon.registrationDeadline),
      reason: 'Registration deadline passed',
    },
    {
      from: HackathonStatus.SUBMISSION_OPEN,
      to: HackathonStatus.SUBMISSION_CLOSED,
      condition: (hackathon) => new Date() > new Date(hackathon.submissionDeadline),
      reason: 'Submission deadline passed',
    },
    {
      from: HackathonStatus.VOTING_OPEN,
      to: HackathonStatus.VOTING_CLOSED,
      condition: (hackathon) => new Date() > new Date(hackathon.votingDeadline),
      reason: 'Voting deadline passed',
    },
  ];

  /**
   * Run every minute to check for status updates
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndUpdateStatuses() {
    this.logger.log('Running automatic status update check...');
    
    try {
      const activeHackathons = await this.findActiveHackathons();
      
      if (activeHackathons.length === 0) {
        this.logger.log('No active hackathons found for status checking');
        return;
      }

      let updatedCount = 0;
      
      for (const hackathon of activeHackathons) {
        const result = await this.checkAndUpdateSingleHackathon(hackathon);
        if (result.updated) {
          updatedCount++;
        }
      }

      this.logger.log(
        `Status check completed. Processed ${activeHackathons.length} hackathons, updated ${updatedCount}`,
      );
    } catch (error) {
      this.logger.error('Failed to run status update check:', error);
    }
  }

  /**
   * Check and update a single hackathon's status
   */
  async checkAndUpdateSingleHackathon(hackathon: any): Promise<{
    updated: boolean;
    newStatus?: HackathonStatus;
    reason?: string;
  }> {
    try {
      const { newStatus, reason } = this.getNextAutomaticStatus(hackathon);
      
      if (newStatus && reason) {
        await this.updateHackathonStatus(hackathon.id, newStatus, reason, 'system');
        
        this.logger.log(
          `Updated hackathon ${hackathon.id}: ${hackathon.status} → ${newStatus} (${reason})`,
        );
        
        return { updated: true, newStatus, reason };
      }

      return { updated: false };
    } catch (error) {
      this.logger.error(`Failed to update hackathon ${hackathon.id}:`, error);
      return { updated: false };
    }
  }

  /**
   * Determine if a status transition should occur automatically
   */
  private getNextAutomaticStatus(hackathon: any): {
    newStatus: HackathonStatus | null;
    reason: string | null;
  } {
    // Find applicable transition
    const transition = this.statusTransitions.find(
      (t) => t.from === hackathon.status && t.condition(hackathon),
    );

    if (transition) {
      return {
        newStatus: transition.to,
        reason: transition.reason,
      };
    }

    return { newStatus: null, reason: null };
  }

  /**
   * Update hackathon status with logging
   */
  async updateHackathonStatus(
    hackathonId: string,
    newStatus: HackathonStatus,
    reason: string,
    triggeredBy: 'system' | 'organizer' | 'admin',
    userAddress?: string,
  ): Promise<void> {
    // Start transaction to ensure data consistency
    await this.prisma.$transaction(async (tx) => {
      // Get current hackathon
      const hackathon = await tx.hackathon.findUnique({
        where: { id: hackathonId },
      });

      if (!hackathon) {
        throw new Error(`Hackathon ${hackathonId} not found`);
      }

      // Update hackathon status
      await tx.hackathon.update({
        where: { id: hackathonId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      // Log the status change using audit service
      await this.auditLogger.logStatusChange({
        hackathonId,
        action: triggeredBy === 'system' ? 'AUTOMATIC_TRANSITION' : 'MANUAL_OVERRIDE',
        fromStatus: hackathon.status as any,
        toStatus: newStatus as any,
        reason,
        triggeredBy: triggeredBy.toUpperCase() as any,
        userAddress: userAddress ?? null,
      });
    });
  }

  /**
   * Find hackathons that are actively running (not completed or draft)
   */
  async findActiveHackathons() {
    return await this.prisma.hackathon.findMany({
      where: {
        status: {
          in: [
            HackathonStatus.REGISTRATION_OPEN,
            HackathonStatus.SUBMISSION_OPEN,
            HackathonStatus.VOTING_OPEN,
          ],
        },
      },
      select: {
        id: true,
        status: true,
        registrationDeadline: true,
        submissionDeadline: true,
        votingDeadline: true,
      },
    });
  }

  /**
   * Manual status update (for organizers/admins)
   */
  async manualStatusUpdate(
    hackathonId: string,
    newStatus: HackathonStatus,
    reason: string,
    userAddress: string,
    isAdmin = false,
  ): Promise<void> {
    // Validate transition is allowed
    if (!this.isValidManualTransition(hackathonId, newStatus)) {
      throw new Error(`Invalid status transition to ${newStatus}`);
    }

    await this.updateHackathonStatus(
      hackathonId,
      newStatus,
      reason,
      isAdmin ? 'admin' : 'organizer',
      userAddress,
    );

    this.logger.log(
      `Manual status update: hackathon ${hackathonId} → ${newStatus} by ${userAddress}`,
    );
  }

  /**
   * Check if manual status transition is valid
   */
  private async isValidManualTransition(
    hackathonId: string,
    newStatus: HackathonStatus,
  ): Promise<boolean> {
    // Get current hackathon
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      return false;
    }

    // Define valid manual transitions
    const validTransitions: Record<HackathonStatus, HackathonStatus[]> = {
      [HackathonStatus.DRAFT]: [HackathonStatus.REGISTRATION_OPEN],
      [HackathonStatus.REGISTRATION_OPEN]: [
        HackathonStatus.REGISTRATION_CLOSED,
        HackathonStatus.SUBMISSION_OPEN,
      ],
      [HackathonStatus.REGISTRATION_CLOSED]: [HackathonStatus.SUBMISSION_OPEN],
      [HackathonStatus.SUBMISSION_OPEN]: [HackathonStatus.SUBMISSION_CLOSED],
      [HackathonStatus.SUBMISSION_CLOSED]: [HackathonStatus.VOTING_OPEN],
      [HackathonStatus.VOTING_OPEN]: [HackathonStatus.VOTING_CLOSED],
      [HackathonStatus.VOTING_CLOSED]: [HackathonStatus.COMPLETED],
      [HackathonStatus.COMPLETED]: [], // No transitions from completed
    };

    const allowedTransitions = validTransitions[hackathon.status as HackathonStatus] || [];
    return allowedTransitions.includes(newStatus);
  }


  /**
   * Get hackathon status summary for debugging
   */
  async getStatusSummary() {
    const statusCounts = await this.prisma.hackathon.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const activeHackathons = await this.findActiveHackathons();
    
    return {
      statusCounts: statusCounts.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<string, number>,
      ),
      activeHackathonsCount: activeHackathons.length,
      activeHackathons: activeHackathons.map((h) => ({
        id: h.id,
        status: h.status,
        nextCheck: this.getNextAutomaticStatus(h),
      })),
    };
  }
}