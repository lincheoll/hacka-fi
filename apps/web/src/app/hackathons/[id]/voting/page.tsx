'use client';
export const dynamic = 'force-dynamic';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Star, MessageSquare, Check, AlertCircle } from 'lucide-react';
import { 
  fetchHackathon, 
  fetchJudges, 
  fetchHackathonParticipants,
  fetchVotingResults,
  castVote
} from '@/lib/api-functions';
import { HackathonStatusBadge } from '@/components/features/hackathon/hackathon-status-badge';
import type { CastVoteRequest } from '@/types/api';

interface VotingPageProps {
  params: Promise<{ id: string }>;
}

export default function VotingPage({ params }: VotingPageProps) {
  const { id } = use(params);
  const { address: walletAddress, isConnected } = useAccount();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch hackathon details
  const { 
    data: hackathon, 
    isLoading: isLoadingHackathon,
    error: hackathonError 
  } = useQuery({
    queryKey: ['hackathon', id],
    queryFn: () => fetchHackathon(id),
    enabled: !!id && mounted,
  });

  // Fetch judges to verify current user is a judge
  const { 
    data: judges,
    isLoading: isLoadingJudges 
  } = useQuery({
    queryKey: ['judges', id],
    queryFn: () => fetchJudges(id),
    enabled: !!id && !!walletAddress && mounted,
  });

  // Fetch participants for voting
  const { 
    data: participants,
    isLoading: isLoadingParticipants 
  } = useQuery({
    queryKey: ['hackathon-participants', id],
    queryFn: () => fetchHackathonParticipants(id),
    enabled: !!id && mounted,
  });

  // Fetch voting results to check current votes
  const { 
    data: votingResults,
    isLoading: isLoadingResults 
  } = useQuery({
    queryKey: ['voting-results', id],
    queryFn: () => fetchVotingResults(id),
    enabled: !!id && mounted,
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: ({ participantId, score, comment }: CastVoteRequest) =>
      castVote(id, { participantId, score, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voting-results', id] });
      // Show success message
    },
    onError: (error) => {
      console.error('Vote submission failed:', error);
      // Show error message
    },
  });

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-yellow-700">
              Please connect your wallet to access the voting interface.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (isLoadingHackathon || isLoadingJudges) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (hackathonError || !hackathon) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert className="border-red-500 bg-red-50">
            <AlertDescription className="text-red-700">
              {hackathonError?.message || 'Hackathon not found'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Check if current user is a judge
  const isJudge = judges?.judges?.some(
    judge => judge.judgeAddress.toLowerCase() === walletAddress?.toLowerCase()
  );

  if (!isJudge) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert className="border-red-500 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              You are not authorized to vote in this hackathon. Only approved judges can access the voting interface.
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Check if voting is open
  const canVote = hackathon.status === 'VOTING_OPEN' && new Date() <= new Date(hackathon.votingDeadline);

  if (!canVote) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-yellow-700">
              Voting is not currently open for this hackathon. 
              {hackathon.status !== 'VOTING_OPEN' ? ' Hackathon is not in voting phase.' : ''}
              {new Date() > new Date(hackathon.votingDeadline) ? ' Voting deadline has passed.' : ''}
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Get current user's votes
  const myVotes = votingResults?.participants?.reduce((acc, participant) => {
    const myVote = participant.votes?.find(
      vote => vote.judgeAddress.toLowerCase() === walletAddress?.toLowerCase()
    );
    if (myVote) {
      acc[participant.participantId] = myVote;
    }
    return acc;
  }, {} as Record<number, any>) || {};

  const handleVoteSubmit = async (participantId: number, score: number, comment: string) => {
    try {
      await voteMutation.mutateAsync({ participantId, score, comment: comment || undefined });
    } catch (error) {
      console.error('Failed to submit vote:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Hackathon
          </Button>
          
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Judge Voting Dashboard
              </h1>
              <h2 className="text-xl text-gray-700 dark:text-gray-300 mb-2">
                {hackathon.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Vote on participant submissions (1-10 scale)
              </p>
            </div>
            <HackathonStatusBadge status={hackathon.status} size="lg" />
          </div>

          <Alert className="border-blue-500 bg-blue-50">
            <MessageSquare className="h-4 w-4" />
            <AlertDescription className="text-blue-700">
              <strong>Voting Instructions:</strong> Rate each participant on a scale of 1-10 based on their submission. 
              You can optionally add comments with your feedback. Votes can be updated until the voting deadline.
            </AlertDescription>
          </Alert>
        </div>

        {/* Voting Statistics */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Voting Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Object.keys(myVotes).length}
                  </div>
                  <div className="text-sm text-gray-600">Your Votes Cast</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {participants?.filter(p => p.submissionUrl)?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Projects Submitted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {judges?.count || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Judges</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Participants Voting List */}
        <div className="space-y-6">
          {isLoadingParticipants ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : participants && participants.length > 0 ? (
            participants
              .filter(participant => participant.submissionUrl) // Only show participants with submissions
              .map((participant) => (
                <VotingCard
                  key={participant.id}
                  participant={participant}
                  currentVote={myVotes[participant.id]}
                  onVoteSubmit={handleVoteSubmit}
                  isSubmitting={voteMutation.isPending}
                />
              ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No participants with submissions found.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Voting Deadline */}
        <div className="mt-8">
          <Alert className="border-orange-500 bg-orange-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-orange-700">
              <strong>Voting Deadline:</strong> {' '}
              {new Date(hackathon.votingDeadline).toLocaleDateString()} at{' '}
              {new Date(hackathon.votingDeadline).toLocaleTimeString()}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

// Voting Card Component
interface VotingCardProps {
  participant: any;
  currentVote?: any;
  onVoteSubmit: (participantId: number, score: number, comment: string) => Promise<void>;
  isSubmitting: boolean;
}

function VotingCard({ participant, currentVote, onVoteSubmit, isSubmitting }: VotingCardProps) {
  const [selectedScore, setSelectedScore] = useState<number>(currentVote?.score || 0);
  const [comment, setComment] = useState<string>(currentVote?.comment || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async () => {
    if (selectedScore === 0) {
      alert('Please select a score');
      return;
    }
    
    try {
      await onVoteSubmit(participant.id, selectedScore, comment);
      // Show success feedback
    } catch (error) {
      alert('Failed to submit vote. Please try again.');
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">
              {participant.userAddress.slice(0, 6)}...{participant.userAddress.slice(-4)}
            </CardTitle>
            <CardDescription>
              Registered: {new Date(participant.registeredAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {currentVote && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Check className="h-3 w-3 mr-1" />
                Voted
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Vote'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {participant.submissionUrl && (
        <CardContent>
          <div className="mb-4">
            <a
              href={participant.submissionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:underline"
            >
              View Project Submission
              <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
            </a>
          </div>

          {isExpanded && (
            <div className="space-y-6 border-t pt-6">
              {/* Score Selection */}
              <div>
                <Label className="text-base font-medium">Score (1-10)</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[...Array(10)].map((_, i) => (
                    <Button
                      key={i + 1}
                      variant={selectedScore === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedScore(i + 1)}
                      className="w-10 h-10"
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                {selectedScore > 0 && (
                  <div className="flex items-center mt-2 text-sm text-gray-600">
                    <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                    Selected Score: {selectedScore}/10
                  </div>
                )}
              </div>

              {/* Comment */}
              <div>
                <Label htmlFor="comment" className="text-base font-medium">
                  Comment (Optional)
                </Label>
                <Textarea
                  id="comment"
                  placeholder="Share your feedback about this submission..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSubmit}
                  disabled={selectedScore === 0 || isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  {isSubmitting ? 'Submitting...' : currentVote ? 'Update Vote' : 'Submit Vote'}
                </Button>
                
                {currentVote && (
                  <div className="text-sm text-gray-500">
                    Last voted: {new Date(currentVote.updatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}