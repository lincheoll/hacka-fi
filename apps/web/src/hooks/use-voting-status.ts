import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { fetchJudges, fetchVotingResults } from "@/lib/api-functions";

export function useVotingStatus(hackathonId: string) {
  const { address: walletAddress, isConnected } = useAccount();

  // Fetch judges to check if current user is a judge
  const { data: judges, isLoading: isLoadingJudges } = useQuery({
    queryKey: ["judges", hackathonId],
    queryFn: () => fetchJudges(hackathonId),
    enabled: !!hackathonId && !!walletAddress && isConnected,
  });

  // Fetch voting results to check voting status
  const { data: votingResults, isLoading: isLoadingResults } = useQuery({
    queryKey: ["voting-results", hackathonId],
    queryFn: () => fetchVotingResults(hackathonId),
    enabled: !!hackathonId && !!walletAddress && isConnected,
  });

  // Check if current user is a judge
  const isJudge = judges?.judges?.some(
    (judge) =>
      judge.judgeAddress.toLowerCase() === walletAddress?.toLowerCase(),
  );

  // Get current user's votes
  const myVotes =
    votingResults?.participants?.reduce(
      (acc, participant) => {
        const myVote = participant.votes?.find(
          (vote) =>
            vote.judgeAddress.toLowerCase() === walletAddress?.toLowerCase(),
        );
        if (myVote) {
          acc[participant.participantId] = myVote;
        }
        return acc;
      },
      {} as Record<number, any>,
    ) || {};

  // Calculate voting progress
  const totalParticipantsWithSubmissions =
    votingResults?.participants?.filter((p) => p.submissionUrl).length || 0;

  const votedCount = Object.keys(myVotes).length;
  const votingProgress =
    totalParticipantsWithSubmissions > 0
      ? (votedCount / totalParticipantsWithSubmissions) * 100
      : 0;

  const hasVoted = votedCount > 0;
  const hasCompletedVoting =
    votedCount === totalParticipantsWithSubmissions &&
    totalParticipantsWithSubmissions > 0;

  return {
    isJudge,
    hasVoted,
    hasCompletedVoting,
    votedCount,
    totalParticipantsWithSubmissions,
    votingProgress,
    myVotes,
    judges,
    votingResults,
    isLoading: isLoadingJudges || isLoadingResults,
  };
}
