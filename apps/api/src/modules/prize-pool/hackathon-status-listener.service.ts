import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AutomatedDistributionService } from './automated-distribution.service';
import { HackathonStatus } from '@prisma/client';

export interface HackathonStatusChangeEvent {
  hackathonId: string;
  oldStatus: HackathonStatus;
  newStatus: HackathonStatus;
  triggeredBy: 'SYSTEM' | 'ORGANIZER' | 'ADMIN';
  userAddress?: string;
  timestamp: Date;
}

@Injectable()
export class HackathonStatusListenerService implements OnModuleInit {
  private readonly logger = new Logger(HackathonStatusListenerService.name);

  constructor(
    private readonly automatedDistributionService: AutomatedDistributionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.logger.log('Hackathon status listener service initialized');
  }

  /**
   * Listen for hackathon status changes and trigger distribution when completed
   */
  @OnEvent('hackathon.status.changed')
  async handleStatusChange(event: HackathonStatusChangeEvent) {
    this.logger.log(
      `Hackathon ${event.hackathonId} status changed: ${event.oldStatus} -> ${event.newStatus}`,
    );

    // If hackathon just completed, schedule distribution
    if (
      event.newStatus === HackathonStatus.COMPLETED &&
      event.oldStatus !== HackathonStatus.COMPLETED
    ) {
      this.logger.log(
        `Hackathon ${event.hackathonId} completed, scheduling prize distribution`,
      );

      try {
        await this.automatedDistributionService.scheduleDistribution(
          event.hackathonId,
        );

        this.logger.log(
          `Distribution scheduled for hackathon ${event.hackathonId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to schedule distribution for hackathon ${event.hackathonId}:`,
          error,
        );
      }
    }
  }

  /**
   * Emit hackathon status change event
   */
  emitStatusChange(event: HackathonStatusChangeEvent) {
    this.eventEmitter.emit('hackathon.status.changed', event);
  }
}
