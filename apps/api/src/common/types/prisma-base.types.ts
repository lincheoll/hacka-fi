import { Prisma } from '@prisma/client';

/**
 * Prisma-based type definitions for consistent API responses
 * These types represent data as it comes from the database
 */

export type HackathonWithCounts = Prisma.HackathonGetPayload<{
  include: {
    _count: {
      select: {
        participants: true;
      };
    };
  };
}>;

export type HackathonWithParticipants = Prisma.HackathonGetPayload<{
  include: {
    _count: {
      select: {
        participants: true;
      };
    };
    participants: {
      select: {
        id: true;
        walletAddress: true;
        submissionUrl: true;
        entryFee: true;
        rank: true;
        prizeAmount: true;
        createdAt: true;
      };
    };
  };
}>;

export type ParticipantWithRelations = Prisma.ParticipantGetPayload<{
  include: {
    user: {
      select: {
        walletAddress: true;
        username: true;
        avatarUrl: true;
      };
    };
    hackathon: {
      select: {
        id: true;
        title: true;
        status: true;
      };
    };
  };
}>;

export type JudgeWithRelations = Prisma.HackathonJudgeGetPayload<{
  include: {
    judge: {
      select: {
        walletAddress: true;
        username: true;
        bio: true;
        avatarUrl: true;
      };
    };
  };
}>;

export type VoteWithRelations = Prisma.VoteGetPayload<{
  include: {
    participant: {
      select: {
        id: true;
        walletAddress: true;
        submissionUrl: true;
      };
    };
    judge: {
      select: {
        walletAddress: true;
        username: true;
      };
    };
  };
}>;
