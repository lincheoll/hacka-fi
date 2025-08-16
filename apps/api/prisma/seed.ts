import { PrismaClient, HackathonStatus, AchievementType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create sample users
  const users = await Promise.all([
    prisma.userProfile.upsert({
      where: { walletAddress: '0x1234567890123456789012345678901234567890' },
      update: {},
      create: {
        walletAddress: '0x1234567890123456789012345678901234567890',
        username: 'alice_dev',
        bio: 'Full-stack developer passionate about Web3',
        avatarUrl: 'https://avatar.iran.liara.run/public/1',
      },
    }),
    prisma.userProfile.upsert({
      where: { walletAddress: '0x2345678901234567890123456789012345678901' },
      update: {},
      create: {
        walletAddress: '0x2345678901234567890123456789012345678901',
        username: 'bob_blockchain',
        bio: 'Blockchain enthusiast and smart contract developer',
        avatarUrl: 'https://avatar.iran.liara.run/public/2',
      },
    }),
    prisma.userProfile.upsert({
      where: { walletAddress: '0x3456789012345678901234567890123456789012' },
      update: {},
      create: {
        walletAddress: '0x3456789012345678901234567890123456789012',
        username: 'charlie_ui',
        bio: 'UI/UX designer with a love for clean interfaces',
        avatarUrl: 'https://avatar.iran.liara.run/public/3',
      },
    }),
    prisma.userProfile.upsert({
      where: { walletAddress: '0x4567890123456789012345678901234567890123' },
      update: {},
      create: {
        walletAddress: '0x4567890123456789012345678901234567890123',
        username: 'diana_judge',
        bio: 'Experienced judge and mentor in the hackathon community',
        avatarUrl: 'https://avatar.iran.liara.run/public/4',
      },
    }),
    prisma.userProfile.upsert({
      where: { walletAddress: '0x5678901234567890123456789012345678901234' },
      update: {},
      create: {
        walletAddress: '0x5678901234567890123456789012345678901234',
        username: 'eve_creator',
        bio: 'Hackathon organizer and community builder',
        avatarUrl: 'https://avatar.iran.liara.run/public/5',
      },
    }),
  ]);

  console.log('Created users:', users.length);

  // Create sample hackathons
  const hackathons = await Promise.all([
    prisma.hackathon.upsert({
      where: { id: 1 },
      update: {},
      create: {
        title: 'DeFi Innovation Challenge',
        description:
          'Build the next generation of decentralized finance applications on Kaia blockchain',
        deadline: new Date('2024-12-31T23:59:59Z'),
        status: HackathonStatus.ACTIVE,
        lotteryPercentage: 10,
        contractAddress: '0xabcd1234567890abcd1234567890abcd12345678',
        creatorAddress: users[4].walletAddress, // eve_creator
      },
    }),
    prisma.hackathon.upsert({
      where: { id: 2 },
      update: {},
      create: {
        title: 'NFT Marketplace Revolution',
        description:
          'Create innovative NFT marketplaces with unique features and user experiences',
        deadline: new Date('2024-11-30T23:59:59Z'),
        status: HackathonStatus.VOTING,
        lotteryPercentage: 15,
        contractAddress: '0xefgh5678901234efgh5678901234efgh56789012',
        creatorAddress: users[4].walletAddress, // eve_creator
      },
    }),
    prisma.hackathon.upsert({
      where: { id: 3 },
      update: {},
      create: {
        title: 'GameFi Revolution',
        description:
          'Develop engaging blockchain games that combine DeFi mechanics with fun gameplay',
        deadline: new Date('2025-01-15T23:59:59Z'),
        status: HackathonStatus.UPCOMING,
        lotteryPercentage: 5,
        creatorAddress: users[4].walletAddress, // eve_creator
      },
    }),
  ]);

  console.log('Created hackathons:', hackathons.length);

  // Create participants for active hackathon
  const participants = await Promise.all([
    prisma.participant.upsert({
      where: {
        hackathonId_walletAddress: {
          hackathonId: 1,
          walletAddress: users[0].walletAddress,
        },
      },
      update: {},
      create: {
        hackathonId: 1,
        walletAddress: users[0].walletAddress,
        submissionUrl: 'https://github.com/alice/defi-innovation',
        entryFee: '1000000000000000000', // 1 ETH in wei
      },
    }),
    prisma.participant.upsert({
      where: {
        hackathonId_walletAddress: {
          hackathonId: 1,
          walletAddress: users[1].walletAddress,
        },
      },
      update: {},
      create: {
        hackathonId: 1,
        walletAddress: users[1].walletAddress,
        submissionUrl: 'https://github.com/bob/blockchain-defi',
        entryFee: '1000000000000000000', // 1 ETH in wei
      },
    }),
    prisma.participant.upsert({
      where: {
        hackathonId_walletAddress: {
          hackathonId: 1,
          walletAddress: users[2].walletAddress,
        },
      },
      update: {},
      create: {
        hackathonId: 1,
        walletAddress: users[2].walletAddress,
        submissionUrl: 'https://github.com/charlie/ui-defi-app',
        entryFee: '1000000000000000000', // 1 ETH in wei
      },
    }),
  ]);

  console.log('Created participants:', participants.length);

  // Create participants for completed hackathon with results
  const completedParticipants = await Promise.all([
    prisma.participant.upsert({
      where: {
        hackathonId_walletAddress: {
          hackathonId: 2,
          walletAddress: users[0].walletAddress,
        },
      },
      update: {},
      create: {
        hackathonId: 2,
        walletAddress: users[0].walletAddress,
        submissionUrl: 'https://github.com/alice/nft-marketplace',
        entryFee: '500000000000000000', // 0.5 ETH in wei
        rank: 1,
        prizeAmount: '5000000000000000000', // 5 ETH prize
      },
    }),
    prisma.participant.upsert({
      where: {
        hackathonId_walletAddress: {
          hackathonId: 2,
          walletAddress: users[1].walletAddress,
        },
      },
      update: {},
      create: {
        hackathonId: 2,
        walletAddress: users[1].walletAddress,
        submissionUrl: 'https://github.com/bob/nft-platform',
        entryFee: '500000000000000000', // 0.5 ETH in wei
        rank: 2,
        prizeAmount: '3000000000000000000', // 3 ETH prize
      },
    }),
  ]);

  console.log(
    'Created completed hackathon participants:',
    completedParticipants.length,
  );

  // Create sample votes
  const votes = await Promise.all([
    prisma.vote.upsert({
      where: {
        hackathonId_judgeAddress_participantId: {
          hackathonId: 2,
          judgeAddress: users[3].walletAddress, // diana_judge
          participantId: completedParticipants[0].id,
        },
      },
      update: {},
      create: {
        hackathonId: 2,
        judgeAddress: users[3].walletAddress, // diana_judge
        participantId: completedParticipants[0].id,
        score: 95,
      },
    }),
    prisma.vote.upsert({
      where: {
        hackathonId_judgeAddress_participantId: {
          hackathonId: 2,
          judgeAddress: users[3].walletAddress, // diana_judge
          participantId: completedParticipants[1].id,
        },
      },
      update: {},
      create: {
        hackathonId: 2,
        judgeAddress: users[3].walletAddress, // diana_judge
        participantId: completedParticipants[1].id,
        score: 88,
      },
    }),
  ]);

  console.log('Created votes:', votes.length);

  // Create results for completed hackathon
  const result = await prisma.result.upsert({
    where: { hackathonId: 2 },
    update: {},
    create: {
      hackathonId: 2,
      winners: JSON.stringify([
        {
          rank: 1,
          walletAddress: users[0].walletAddress,
          username: users[0].username,
          prizeAmount: '5000000000000000000',
        },
        {
          rank: 2,
          walletAddress: users[1].walletAddress,
          username: users[1].username,
          prizeAmount: '3000000000000000000',
        },
      ]),
      totalPrizePool: '8000000000000000000', // 8 ETH total
      distributionTxHash:
        '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
  });

  console.log('Created result:', result.id);

  // Create user achievements
  const achievements = await Promise.all([
    prisma.userAchievement.upsert({
      where: { id: 1 },
      update: {},
      create: {
        userAddress: users[0].walletAddress,
        achievementType: AchievementType.WINNER,
        hackathonId: 2,
        rank: 1,
        prizeAmount: '5000000000000000000',
      },
    }),
    prisma.userAchievement.upsert({
      where: { id: 2 },
      update: {},
      create: {
        userAddress: users[1].walletAddress,
        achievementType: AchievementType.RUNNER_UP,
        hackathonId: 2,
        rank: 2,
        prizeAmount: '3000000000000000000',
      },
    }),
    prisma.userAchievement.upsert({
      where: { id: 3 },
      update: {},
      create: {
        userAddress: users[4].walletAddress,
        achievementType: AchievementType.CREATOR,
        hackathonId: 1,
      },
    }),
    prisma.userAchievement.upsert({
      where: { id: 4 },
      update: {},
      create: {
        userAddress: users[4].walletAddress,
        achievementType: AchievementType.CREATOR,
        hackathonId: 2,
      },
    }),
    prisma.userAchievement.upsert({
      where: { id: 5 },
      update: {},
      create: {
        userAddress: users[3].walletAddress,
        achievementType: AchievementType.JUDGE,
        hackathonId: 2,
      },
    }),
  ]);

  console.log('Created achievements:', achievements.length);

  console.log('Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
