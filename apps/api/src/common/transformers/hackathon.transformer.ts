import { Injectable } from '@nestjs/common';
import {
  HackathonResponseDto,
  ParticipantResponseDto,
  HackathonFeeInfoDto,
} from '../../modules/hackathon/dto/hackathon-response.dto';
import {
  HackathonWithCounts,
  HackathonWithParticipants,
} from '../types/prisma-base.types';

import { Hackathon } from '@prisma/client';

/**
 * Transformer class to convert Prisma models to API DTOs
 * This replaces manual mapping and ensures type consistency
 */
@Injectable()
export class HackathonTransformer {
  /**
   * Convert Prisma hackathon with counts to response DTO
   */
  toResponseDto(hackathon: HackathonWithCounts): HackathonResponseDto {
    return {
      id: hackathon.id,
      title: hackathon.title,
      description: hackathon.description,
      registrationDeadline: hackathon.registrationDeadline.toISOString(),
      submissionDeadline: hackathon.submissionDeadline.toISOString(),
      votingDeadline: hackathon.votingDeadline.toISOString(),
      status: hackathon.status,
      contractAddress: hackathon.contractAddress ?? null,
      organizerAddress: hackathon.organizerAddress,
      participantCount: hackathon._count?.participants || 0,
      createdAt: hackathon.createdAt.toISOString(),
      updatedAt: hackathon.updatedAt.toISOString(),
    };
  }

  /**
   * Convert Prisma hackathon with counts to response DTO including fee information
   */
  toResponseDtoWithFeeInfo(
    hackathon: HackathonWithCounts,
    feeInfo?: HackathonFeeInfoDto,
  ): HackathonResponseDto {
    const baseDto = this.toResponseDto(hackathon);

    if (feeInfo) {
      baseDto.feeInfo = feeInfo;
    }

    return baseDto;
  }

  /**
   * Convert Prisma hackathon with participants to response DTO
   */
  toResponseDtoWithParticipants(
    hackathon: HackathonWithParticipants,
  ): HackathonResponseDto {
    const baseDto = this.toResponseDto(hackathon);

    if (hackathon.participants) {
      baseDto.participants = hackathon.participants.map((participant) => ({
        id: participant.id,
        walletAddress: participant.walletAddress,
        submissionUrl: participant.submissionUrl || undefined,
        entryFee: participant.entryFee || undefined,
        rank: participant.rank || undefined,
        prizeAmount: participant.prizeAmount || undefined,
        createdAt: participant.createdAt.toISOString(),
      }));
    }

    return baseDto;
  }

  /**
   * Convert Prisma hackathon with participants to response DTO including fee information
   */
  toResponseDtoWithParticipantsAndFeeInfo(
    hackathon: HackathonWithParticipants,
    feeInfo?: HackathonFeeInfoDto,
  ): HackathonResponseDto {
    const baseDto = this.toResponseDtoWithFeeInfo(hackathon, feeInfo);

    if (hackathon.participants) {
      baseDto.participants = hackathon.participants.map((participant) => ({
        id: participant.id,
        walletAddress: participant.walletAddress,
        submissionUrl: participant.submissionUrl || undefined,
        entryFee: participant.entryFee || undefined,
        rank: participant.rank || undefined,
        prizeAmount: participant.prizeAmount || undefined,
        createdAt: participant.createdAt.toISOString(),
      }));
    }

    return baseDto;
  }

  /**
   * Convert array of hackathons to response DTOs
   */
  toResponseDtoArray(
    hackathons: HackathonWithCounts[],
  ): HackathonResponseDto[] {
    return hackathons.map((hackathon) => this.toResponseDto(hackathon));
  }
}
