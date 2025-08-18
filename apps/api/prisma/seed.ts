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
        username: 'charlie_crypto',
        bio: 'DeFi researcher and protocol designer',
        avatarUrl: 'https://avatar.iran.liara.run/public/3',
      },
    }),
  ]);

  console.log('✅ Created users:', users.length);

  // Create sample hackathons with new schema structure
  const hackathons = [
    {
      title: 'DeFi Innovation Challenge 2024',
      description: 'Build innovative DeFi solutions on Kaia network. Focus on lending, borrowing, yield farming, and novel financial instruments.',
      organizerAddress: '0x1234567890123456789012345678901234567890',
      registrationDeadline: new Date('2024-12-15T23:59:59Z'),
      submissionDeadline: new Date('2024-12-30T23:59:59Z'),
      votingDeadline: new Date('2025-01-15T23:59:59Z'),
      status: HackathonStatus.REGISTRATION_OPEN,
      prizeAmount: '10000',
      entryFee: '50',
      maxParticipants: 100,
      coverImageUrl: 'https://picsum.photos/800/400?random=1',
    },
    {
      title: 'NFT Marketplace Revolution',
      description: 'Create the next generation NFT marketplace with advanced features like fractional ownership, lending, and cross-chain compatibility.',
      organizerAddress: '0x2345678901234567890123456789012345678901',
      registrationDeadline: new Date('2024-11-30T23:59:59Z'),
      submissionDeadline: new Date('2024-12-20T23:59:59Z'),
      votingDeadline: new Date('2025-01-05T23:59:59Z'),
      status: HackathonStatus.SUBMISSION_OPEN,
      prizeAmount: '7500',
      maxParticipants: 50,
      coverImageUrl: 'https://picsum.photos/800/400?random=2',
    },
    {
      title: 'AI x Blockchain Integration',
      description: 'Explore the intersection of AI and blockchain technology. Build applications that leverage both AI and decentralized systems.',
      organizerAddress: '0x3456789012345678901234567890123456789012',
      registrationDeadline: new Date('2024-10-15T23:59:59Z'),
      submissionDeadline: new Date('2024-11-15T23:59:59Z'),
      votingDeadline: new Date('2024-12-01T23:59:59Z'),
      status: HackathonStatus.VOTING_OPEN,
      prizeAmount: '15000',
      entryFee: '100',
      maxParticipants: 75,
      coverImageUrl: 'https://picsum.photos/800/400?random=3',
    },
  ];

  const createdHackathons = [];
  for (const hackathonData of hackathons) {
    const hackathon = await prisma.hackathon.create({
      data: hackathonData,
    });
    createdHackathons.push(hackathon);
  }

  console.log('✅ Created hackathons:', createdHackathons.length);

  // Create sample participants
  const participants = await Promise.all([
    // Participants for first hackathon
    prisma.participant.create({
      data: {
        hackathonId: createdHackathons[0].id,
        walletAddress: '0x2345678901234567890123456789012345678901',
        submissionUrl: 'https://github.com/bob/defi-innovation',
        entryFee: '50',
      },
    }),
    prisma.participant.create({
      data: {
        hackathonId: createdHackathons[0].id,
        walletAddress: '0x3456789012345678901234567890123456789012',
        submissionUrl: 'https://github.com/charlie/yield-optimizer',
        entryFee: '50',
      },
    }),
    // Participants for second hackathon
    prisma.participant.create({
      data: {
        hackathonId: createdHackathons[1].id,
        walletAddress: '0x1234567890123456789012345678901234567890',
        submissionUrl: 'https://github.com/alice/nft-marketplace-v2',
      },
    }),
    prisma.participant.create({
      data: {
        hackathonId: createdHackathons[1].id,
        walletAddress: '0x3456789012345678901234567890123456789012',
        submissionUrl: 'https://github.com/charlie/fractional-nfts',
      },
    }),
    // Participants for third hackathon
    prisma.participant.create({
      data: {
        hackathonId: createdHackathons[2].id,
        walletAddress: '0x1234567890123456789012345678901234567890',
        submissionUrl: 'https://github.com/alice/ai-blockchain-oracle',
        entryFee: '100',
      },
    }),
    prisma.participant.create({
      data: {
        hackathonId: createdHackathons[2].id,
        walletAddress: '0x2345678901234567890123456789012345678901',
        submissionUrl: 'https://github.com/bob/decentralized-ml',
        entryFee: '100',
      },
    }),
  ]);

  console.log('✅ Created participants:', participants.length);

  // Create sample votes for voting-stage hackathon
  const votes = await Promise.all([
    prisma.vote.create({
      data: {
        hackathonId: createdHackathons[2].id,
        judgeAddress: '0x1234567890123456789012345678901234567890',
        participantId: participants[4].id, // alice's AI project
        score: 9,
      },
    }),
    prisma.vote.create({
      data: {
        hackathonId: createdHackathons[2].id,
        judgeAddress: '0x1234567890123456789012345678901234567890',
        participantId: participants[5].id, // bob's ML project
        score: 8,
      },
    }),
    prisma.vote.create({
      data: {
        hackathonId: createdHackathons[2].id,
        judgeAddress: '0x2345678901234567890123456789012345678901',
        participantId: participants[4].id, // alice's AI project
        score: 8,
      },
    }),
    prisma.vote.create({
      data: {
        hackathonId: createdHackathons[2].id,
        judgeAddress: '0x2345678901234567890123456789012345678901',
        participantId: participants[5].id, // bob's ML project
        score: 9,
      },
    }),
  ]);

  console.log('✅ Created votes:', votes.length);

  // Create sample achievements
  const achievements = await Promise.all([
    prisma.userAchievement.create({
      data: {
        userAddress: '0x1234567890123456789012345678901234567890',
        achievementType: AchievementType.PARTICIPANT,
        hackathonId: createdHackathons[0].id,
      },
    }),
    prisma.userAchievement.create({
      data: {
        userAddress: '0x2345678901234567890123456789012345678901',
        achievementType: AchievementType.CREATOR,
        hackathonId: createdHackathons[1].id,
      },
    }),
    prisma.userAchievement.create({
      data: {
        userAddress: '0x3456789012345678901234567890123456789012',
        achievementType: AchievementType.PARTICIPANT,
        hackathonId: createdHackathons[2].id,
      },
    }),
  ]);

  console.log('✅ Created achievements:', achievements.length);

  console.log('🎉 Database seed completed successfully!');
  console.log(`
  Summary:
  - Users: ${users.length}
  - Hackathons: ${createdHackathons.length}
  - Participants: ${participants.length}
  - Votes: ${votes.length}
  - Achievements: ${achievements.length}
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });