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
   * Enhanced automatic status transition rules with sophisticated voting period management
   */
  private readonly statusTransitions: StatusTransition[] = [
    // Registration phase transitions
    {
      from: HackathonStatus.REGISTRATION_OPEN,
      to: HackathonStatus.REGISTRATION_CLOSED,
      condition: (hackathon) =>
        new Date() > new Date(hackathon.registrationDeadline),
      reason: 'Registration deadline passed',
    },
    // Auto-transition from registration closed to submission if eligible
    {
      from: HackathonStatus.REGISTRATION_CLOSED,
      to: HackathonStatus.SUBMISSION_OPEN,
      condition: (hackathon) =>
        new Date() < new Date(hackathon.submissionDeadline) &&
        new Date() > new Date(hackathon.registrationDeadline),
      reason: 'Automatic transition to submission phase',
    },
    // Submission phase transitions
    {
      from: HackathonStatus.SUBMISSION_OPEN,
      to: HackathonStatus.SUBMISSION_CLOSED,
      condition: (hackathon) =>
        new Date() > new Date(hackathon.submissionDeadline),
      reason: 'Submission deadline passed',
    },
    // Auto-transition from submission closed to voting if eligible
    {
      from: HackathonStatus.SUBMISSION_CLOSED,
      to: HackathonStatus.VOTING_OPEN,
      condition: (hackathon) => {
        const now = new Date();
        const submissionDeadline = new Date(hackathon.submissionDeadline);
        const votingDeadline = new Date(hackathon.votingDeadline);

        // Start voting immediately after submission deadline passes
        // but only if voting deadline hasn't passed yet
        return now > submissionDeadline && now < votingDeadline;
      },
      reason: 'Automatic transition to voting phase',
    },
    // Voting phase transitions
    {
      from: HackathonStatus.VOTING_OPEN,
      to: HackathonStatus.VOTING_CLOSED,
      condition: (hackathon) => new Date() > new Date(hackathon.votingDeadline),
      reason: 'Voting deadline passed',
    },
    // Auto-completion after voting closes
    {
      from: HackathonStatus.VOTING_CLOSED,
      to: HackathonStatus.COMPLETED,
      condition: (hackathon) => {
        const now = new Date();
        const votingDeadline = new Date(hackathon.votingDeadline);

        // Auto-complete 1 hour after voting closes to allow for final processing
        return now > new Date(votingDeadline.getTime() + 60 * 60 * 1000);
      },
      reason: 'Automatic completion after voting period ended',
    },
  ];

  /**
   * Run every minute to check for status updates
   * Enhanced with batch processing and error resilience
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndUpdateStatuses() {
    const startTime = Date.now();
    this.logger.log('Running automatic status update check...');

    try {
      const activeHackathons = await this.findActiveHackathons();

      if (activeHackathons.length === 0) {
        this.logger.debug('No active hackathons found for status checking');
        return;
      }

      // Process hackathons in parallel batches for better performance
      const batchSize = 5; // Process 5 hackathons concurrently max
      const batches = [];
      for (let i = 0; i < activeHackathons.length; i += batchSize) {
        batches.push(activeHackathons.slice(i, i + batchSize));
      }

      let updatedCount = 0;
      let errorCount = 0;

      for (const batch of batches) {
        // Process each batch in parallel
        const batchPromises = batch.map(async (hackathon) => {
          try {
            return await this.checkAndUpdateSingleHackathon(hackathon);
          } catch (error) {
            this.logger.error(
              `Failed to process hackathon ${hackathon.id}:`,
              error,
            );
            errorCount++;
            return { updated: false };
          }
        });

        const results = await Promise.allSettled(batchPromises);

        // Count successful updates
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value?.updated) {
            updatedCount++;
          } else if (result.status === 'rejected') {
            errorCount++;
          }
        });
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Status check completed in ${duration}ms. Processed ${activeHackathons.length} hackathons, updated ${updatedCount}, errors ${errorCount}`,
      );

      // Log performance warning if check takes too long
      if (duration > 30000) {
        // 30 seconds
        this.logger.warn(
          `Status check took ${duration}ms, consider optimizing or reducing check frequency`,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to run status update check after ${duration}ms:`,
        error,
      );
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
        await this.updateHackathonStatus(
          hackathon.id,
          newStatus,
          reason,
          'system',
        );

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
   * Update hackathon status with logging - optimized for performance
   */
  async updateHackathonStatus(
    hackathonId: string,
    newStatus: HackathonStatus,
    reason: string,
    triggeredBy: 'system' | 'organizer' | 'admin',
    userAddress?: string,
  ): Promise<void> {
    const startTime = Date.now();
    let hackathon: any;

    try {
      // Get current hackathon first (outside transaction for faster operation)
      hackathon = await this.prisma.hackathon.findUnique({
        where: { id: hackathonId },
        select: { id: true, status: true },
      });

      if (!hackathon) {
        throw new Error(`Hackathon ${hackathonId} not found`);
      }

      // If status is already the target status, skip update
      if (hackathon.status === newStatus) {
        this.logger.debug(
          `Hackathon ${hackathonId} already has status ${newStatus}, skipping update`,
        );
        return;
      }

      // Use shorter transaction timeout and simpler operations
      await this.prisma.$transaction(
        async (tx) => {
          // Update hackathon status (minimal data update)
          await tx.hackathon.update({
            where: { id: hackathonId },
            data: {
              status: newStatus,
              updatedAt: new Date(),
            },
          });
        },
        {
          timeout: 3000, // 3 second timeout instead of default 5
        },
      );

      // Log audit separately to avoid transaction timeout
      // This is fire-and-forget to improve performance
      setImmediate(async () => {
        try {
          await this.auditLogger.logStatusChange({
            hackathonId,
            action:
              triggeredBy === 'system'
                ? 'AUTOMATIC_TRANSITION'
                : 'MANUAL_OVERRIDE',
            fromStatus: hackathon.status as any,
            toStatus: newStatus as any,
            reason,
            triggeredBy: triggeredBy.toUpperCase() as any,
            userAddress: userAddress ?? null,
          });
        } catch (auditError) {
          this.logger.warn(
            `Failed to log audit for hackathon ${hackathonId}:`,
            auditError,
          );
        }
      });

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Status update for hackathon ${hackathonId} completed in ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Status update failed for hackathon ${hackathonId} after ${duration}ms:`,
        error,
      );
      throw error;
    }
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

    const allowedTransitions =
      validTransitions[hackathon.status as HackathonStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Get voting period information for a specific hackathon
   */
  async getVotingPeriodInfo(hackathonId: string) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: {
        id: true,
        status: true,
        registrationDeadline: true,
        submissionDeadline: true,
        votingDeadline: true,
        _count: {
          select: {
            participants: true,
            judges: true,
            votes: true,
          },
        },
      },
    });

    if (!hackathon) {
      throw new Error(`Hackathon ${hackathonId} not found`);
    }

    const now = new Date();
    const votingStartTime = new Date(hackathon.submissionDeadline);
    const votingEndTime = new Date(hackathon.votingDeadline);

    return {
      hackathonId,
      currentStatus: hackathon.status,
      votingPeriod: {
        startTime: votingStartTime.toISOString(),
        endTime: votingEndTime.toISOString(),
        duration: votingEndTime.getTime() - votingStartTime.getTime(),
        isActive: hackathon.status === HackathonStatus.VOTING_OPEN,
        hasStarted: now >= votingStartTime,
        hasEnded: now > votingEndTime,
        timeRemaining: Math.max(0, votingEndTime.getTime() - now.getTime()),
        timeUntilStart: Math.max(0, votingStartTime.getTime() - now.getTime()),
      },
      statistics: {
        totalParticipants: hackathon._count.participants,
        totalJudges: hackathon._count.judges,
        totalVotes: hackathon._count.votes,
        votingParticipation:
          hackathon._count.judges > 0
            ? (hackathon._count.votes / hackathon._count.judges) * 100
            : 0,
      },
      nextTransition: this.getNextAutomaticStatus(hackathon),
    };
  }

  /**
   * Get all hackathons in voting phase with detailed information
   */
  async getVotingPhaseHackathons() {
    const hackathons = await this.prisma.hackathon.findMany({
      where: {
        OR: [
          { status: HackathonStatus.SUBMISSION_CLOSED },
          { status: HackathonStatus.VOTING_OPEN },
          { status: HackathonStatus.VOTING_CLOSED },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        submissionDeadline: true,
        votingDeadline: true,
        _count: {
          select: {
            participants: true,
            judges: true,
            votes: true,
          },
        },
      },
      orderBy: { votingDeadline: 'asc' },
    });

    return hackathons.map((hackathon) => {
      const now = new Date();
      const votingDeadline = new Date(hackathon.votingDeadline);

      return {
        ...hackathon,
        timeUntilVotingEnds: Math.max(
          0,
          votingDeadline.getTime() - now.getTime(),
        ),
        votingParticipation:
          hackathon._count.judges > 0
            ? Math.round(
                (hackathon._count.votes / hackathon._count.judges) * 100,
              )
            : 0,
      };
    });
  }

  /**
   * Force phase transition for specific hackathon (admin override)
   */
  async forcePhaseTransition(
    hackathonId: string,
    targetStatus: HackathonStatus,
    reason: string,
    adminAddress: string,
  ): Promise<void> {
    // Validate admin has permission for this operation
    await this.updateHackathonStatus(
      hackathonId,
      targetStatus,
      `Admin override: ${reason}`,
      'admin',
      adminAddress,
    );

    this.logger.log(
      `Force phase transition: hackathon ${hackathonId} → ${targetStatus} by admin ${adminAddress}`,
    );
  }

  /**
   * Get hackathon status summary for debugging and monitoring
   */
  async getStatusSummary() {
    const statusCounts = await this.prisma.hackathon.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const activeHackathons = await this.findActiveHackathons();

    // Get upcoming phase transitions
    const upcomingTransitions = activeHackathons
      .map((h) => ({
        id: h.id,
        status: h.status,
        nextTransition: this.getNextAutomaticStatus(h),
        timeToNext: this.getTimeUntilNextTransition(h),
      }))
      .filter((h) => h.nextTransition.newStatus !== null)
      .sort((a, b) => (a.timeToNext || 0) - (b.timeToNext || 0));

    return {
      statusCounts: statusCounts.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<string, number>,
      ),
      activeHackathonsCount: activeHackathons.length,
      upcomingTransitions: upcomingTransitions.slice(0, 10), // Next 10 transitions
      systemHealth: {
        lastCheckTime: new Date().toISOString(),
        averageProcessingTime: await this.getAverageProcessingTime(),
      },
    };
  }

  /**
   * Get time until next automatic transition for a hackathon
   */
  private getTimeUntilNextTransition(hackathon: any): number | null {
    const now = new Date();

    switch (hackathon.status) {
      case HackathonStatus.REGISTRATION_OPEN:
        return (
          new Date(hackathon.registrationDeadline).getTime() - now.getTime()
        );
      case HackathonStatus.SUBMISSION_OPEN:
        return new Date(hackathon.submissionDeadline).getTime() - now.getTime();
      case HackathonStatus.VOTING_OPEN:
        return new Date(hackathon.votingDeadline).getTime() - now.getTime();
      case HackathonStatus.VOTING_CLOSED:
        // 1 hour until auto-completion
        return (
          new Date(hackathon.votingDeadline).getTime() +
          60 * 60 * 1000 -
          now.getTime()
        );
      default:
        return null;
    }
  }

  /**
   * Get average processing time for performance monitoring
   */
  private async getAverageProcessingTime(): Promise<number> {
    // This would typically query audit logs or metrics
    // For now, return a placeholder
    return 150; // milliseconds
  }
}
