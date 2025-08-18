// Query keys for TanStack Query
// Following the pattern: [domain, ...details]

export const queryKeys = {
  // Hackathons
  hackathons: (filters?: {
    status?: string;
    search?: string;
    creator?: string;
  }) => ["hackathons", filters] as const,
  hackathon: (id: string) => ["hackathons", id] as const,
  hackathonParticipants: (id: string) =>
    ["hackathons", id, "participants"] as const,
  hackathonVotes: (id: string) => ["hackathons", id, "votes"] as const,

  // Users
  userProfile: (address: string) => ["users", address] as const,
  userHackathons: (address: string) =>
    ["users", address, "hackathons"] as const,
  userAchievements: (address: string) =>
    ["users", address, "achievements"] as const,

  // Voting
  votes: (hackathonId: string) => ["votes", hackathonId] as const,
  judgeVotes: (hackathonId: string, judgeAddress: string) =>
    ["votes", hackathonId, judgeAddress] as const,

  // Auth
  authProfile: () => ["auth", "profile"] as const,
} as const;
