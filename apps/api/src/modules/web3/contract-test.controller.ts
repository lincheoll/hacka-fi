import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { HackathonContractService } from './hackathon-contract.service';
import { PrizePoolContractService } from './prize-pool-contract.service';
import { Public } from '../auth/decorators';

@ApiTags('Contracts')
@Controller('contracts')
export class ContractTestController {
  constructor(
    private readonly hackathonContractService: HackathonContractService,
    private readonly prizePoolContractService: PrizePoolContractService,
  ) {}

  @Public()
  @Get('hackathon/current-id')
  @ApiOperation({
    summary: 'Get current hackathon ID',
    description: 'Retrieve the current hackathon ID from the smart contract',
  })
  @ApiResponse({
    status: 200,
    description: 'Current hackathon ID retrieved successfully',
    schema: {
      example: {
        currentId: '1',
      },
    },
  })
  async getCurrentHackathonId() {
    const currentId =
      await this.hackathonContractService.getCurrentHackathonId();
    return {
      currentId: currentId.toString(),
    };
  }

  @Public()
  @Get('hackathon/:id/info')
  @ApiOperation({
    summary: 'Get hackathon information',
    description: 'Retrieve detailed information about a specific hackathon',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Hackathon information retrieved successfully',
  })
  async getHackathonInfo(@Param('id') id: string) {
    const hackathonId = BigInt(id);
    const info =
      await this.hackathonContractService.getHackathonInfo(hackathonId);

    return {
      id: hackathonId.toString(),
      title: info.title,
      description: info.description,
      organizer: info.organizer,
      registrationDeadline: info.registrationDeadline.toString(),
      submissionDeadline: info.submissionDeadline.toString(),
      votingDeadline: info.votingDeadline.toString(),
      status: info.status,
      participantCount: info.participantCount.toString(),
      judgeCount: info.judgeCount.toString(),
    };
  }

  @Public()
  @Get('hackathon/:id/participants')
  @ApiOperation({
    summary: 'Get hackathon participants',
    description: 'Retrieve list of participants for a specific hackathon',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Participants list retrieved successfully',
  })
  async getHackathonParticipants(@Param('id') id: string) {
    const hackathonId = BigInt(id);
    const participants =
      await this.hackathonContractService.getParticipants(hackathonId);

    return {
      hackathonId: hackathonId.toString(),
      participants,
      count: participants.length,
    };
  }

  @Public()
  @Get('hackathon/:id/participant/:address')
  @ApiOperation({
    summary: 'Get participant information',
    description: 'Retrieve detailed information about a specific participant',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: '1',
  })
  @ApiParam({
    name: 'address',
    description: 'Participant wallet address',
    example: '0x1234567890123456789012345678901234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Participant information retrieved successfully',
  })
  async getParticipantInfo(
    @Param('id') id: string,
    @Param('address') address: string,
  ) {
    const hackathonId = BigInt(id);
    const participantInfo =
      await this.hackathonContractService.getParticipantInfo(
        hackathonId,
        address as `0x${string}`,
      );
    const participantScores =
      await this.hackathonContractService.getParticipantScores(
        hackathonId,
        address as `0x${string}`,
      );

    return {
      hackathonId: hackathonId.toString(),
      participant: address,
      info: {
        submissionUrl: participantInfo.submissionUrl,
        registrationTime: participantInfo.registrationTime.toString(),
        hasSubmitted: participantInfo.hasSubmitted,
      },
      scores: {
        totalScore: participantScores.totalScore.toString(),
        voteCount: participantScores.voteCount.toString(),
        averageScore: participantScores.averageScore.toString(),
      },
    };
  }

  @Public()
  @Get('hackathon/:id/leaderboard')
  @ApiOperation({
    summary: 'Get hackathon leaderboard',
    description: 'Retrieve sorted leaderboard for a specific hackathon',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
  })
  async getHackathonLeaderboard(@Param('id') id: string) {
    const hackathonId = BigInt(id);
    const leaderboard =
      await this.hackathonContractService.getLeaderboard(hackathonId);

    return {
      hackathonId: hackathonId.toString(),
      leaderboard: leaderboard.sortedParticipants.map((participant, index) => ({
        rank: index + 1,
        participant,
        averageScore: leaderboard.averageScores[index]?.toString() || '0',
      })),
    };
  }

  @Public()
  @Get('hackathon/:id/voting-stats')
  @ApiOperation({
    summary: 'Get voting statistics',
    description: 'Retrieve voting statistics for a specific hackathon',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Voting statistics retrieved successfully',
  })
  async getVotingStats(@Param('id') id: string) {
    const hackathonId = BigInt(id);
    const stats =
      await this.hackathonContractService.getVotingStats(hackathonId);

    return {
      hackathonId: hackathonId.toString(),
      totalVotes: stats.totalVotes.toString(),
      totalJudges: stats.totalJudges.toString(),
      judgesWhoVoted: stats.judgesWhoVoted.toString(),
      isVotingComplete: stats.isVotingComplete,
      votingProgress: `${stats.judgesWhoVoted}/${stats.totalJudges}`,
    };
  }

  @Public()
  @Get('hackathon/:id/winners')
  @ApiOperation({
    summary: 'Get hackathon winners',
    description: 'Retrieve winners for a completed hackathon',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Winners retrieved successfully',
  })
  async getHackathonWinners(@Param('id') id: string) {
    const hackathonId = BigInt(id);
    const winners = await this.hackathonContractService.getWinners(hackathonId);

    return {
      hackathonId: hackathonId.toString(),
      winners: {
        firstPlace: winners.firstPlace,
        secondPlace: winners.secondPlace,
        thirdPlace: winners.thirdPlace,
      },
    };
  }

  @Public()
  @Get('prize-pool/:id')
  @ApiOperation({
    summary: 'Get prize pool information',
    description: 'Retrieve prize pool information for a specific hackathon',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Prize pool information retrieved successfully',
  })
  async getPrizePool(@Param('id') id: string) {
    const hackathonId = BigInt(id);
    const prizePool =
      await this.prizePoolContractService.getPrizePool(hackathonId);
    const distribution =
      await this.prizePoolContractService.getPrizeDistribution(hackathonId);

    return {
      hackathonId: hackathonId.toString(),
      prizePool: {
        totalAmount: prizePool.totalAmount.toString(),
        isDistributed: prizePool.isDistributed,
        firstPlace: prizePool.firstPlace.toString(),
        secondPlace: prizePool.secondPlace.toString(),
        thirdPlace: prizePool.thirdPlace.toString(),
      },
      distribution: distribution
        ? {
            firstPlace: distribution.firstPlace,
            secondPlace: distribution.secondPlace,
            thirdPlace: distribution.thirdPlace,
            firstPrize: distribution.firstPrize.toString(),
            secondPrize: distribution.secondPrize.toString(),
            thirdPrize: distribution.thirdPrize.toString(),
            timestamp: distribution.timestamp.toString(),
          }
        : null,
    };
  }

  @Public()
  @Get('prize-pool/contract-balance')
  @ApiOperation({
    summary: 'Get contract balance',
    description: 'Retrieve the total balance of the prize pool contract',
  })
  @ApiResponse({
    status: 200,
    description: 'Contract balance retrieved successfully',
  })
  async getContractBalance() {
    const balance = await this.prizePoolContractService.getContractBalance();

    return {
      balance: balance.toString(),
      balanceInKaia: (Number(balance) / 1e18).toFixed(6),
    };
  }

  @Public()
  @Get('hackathon/:id/judge-check')
  @ApiOperation({
    summary: 'Check if address is a judge',
    description: 'Check if a specific address is a judge for a hackathon',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: '1',
  })
  @ApiQuery({
    name: 'address',
    description: 'Address to check',
    example: '0x1234567890123456789012345678901234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Judge status checked successfully',
  })
  async checkJudgeStatus(
    @Param('id') id: string,
    @Query('address') address: string,
  ) {
    const hackathonId = BigInt(id);
    const isJudge = await this.hackathonContractService.isJudge(
      hackathonId,
      address as `0x${string}`,
    );

    return {
      hackathonId: hackathonId.toString(),
      address,
      isJudge,
    };
  }
}
