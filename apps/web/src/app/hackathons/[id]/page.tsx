'use client';
export const dynamic = 'force-dynamic';

import { use, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useVotingStatus } from '@/hooks/use-voting-status';
import { Header } from "@/components/layout/header";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ParticipantRegistration } from '@/components/features/hackathon/participant-registration';
import { SubmissionTracker } from '@/components/features/hackathon/submission-tracker';
import { HackathonCoverImage } from '@/components/common/optimized-image';
import { HackathonStatusBadge } from '@/components/features/hackathon/hackathon-status-badge';
import { HackathonCountdown } from '@/components/features/hackathon/hackathon-countdown';
import { StatusManagement } from '@/components/features/hackathon/status-management';
import { ActionButtons } from '@/components/features/hackathon/action-buttons';
import { JudgeManagement } from '@/components/features/hackathon/judge-management';
import { WinnerManagement } from '@/components/features/hackathon/winner-management';
import { 
  fetchHackathon, 
  fetchParticipantStatus, 
  fetchHackathonParticipants,
  participateInHackathon,
  updateHackathonStatus,
} from '@/lib/api-functions';

interface HackathonDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function HackathonDetailPage({
  params,
}: HackathonDetailPageProps) {
  const { id } = use(params);
  const { address: walletAddress, isConnected } = useAccount();
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
    enabled: !!id,
  });

  // Fetch participant status
  const { 
    data: participantStatus, 
    isLoading: isLoadingParticipant 
  } = useQuery({
    queryKey: ['participant-status', id, walletAddress],
    queryFn: () => walletAddress ? fetchParticipantStatus(id, walletAddress) : null,
    enabled: !!id && !!walletAddress && isConnected && mounted,
  });

  // Fetch all participants for display
  const { 
    data: participants, 
    isLoading: isLoadingParticipants 
  } = useQuery({
    queryKey: ['hackathon-participants', id],
    queryFn: () => fetchHackathonParticipants(id),
    enabled: !!id,
  });

  // Get voting status for current user
  const { isJudge, hasVoted, hasCompletedVoting } = useVotingStatus(id);

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

  if (isLoadingHackathon) {
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

  // Check if current user is the organizer
  const isOrganizer = walletAddress?.toLowerCase() === hackathon.organizerAddress.toLowerCase();

  // Real API action handlers
  const handleRegister = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet');
      return;
    }
    
    try {
      await participateInHackathon(hackathon.id);
      // Refetch participant status after successful registration
      window.location.reload(); // Simple reload for now
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. Please try again.');
    }
  };

  const handleSubmit = async () => {
    console.log('Submit project');
    // TODO: Implement submission API call
    // This would typically open a modal for submission URL input
  };

  const handleVote = async () => {
    // Redirect to voting page
    window.location.href = `/hackathons/${id}/voting`;
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!walletAddress) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const result = await updateHackathonStatus(
        hackathon.id,
        newStatus,
        'Manual status change by organizer',
        { updatedBy: walletAddress }
      );
      
      console.log('Status updated successfully:', result);
      
      // Refetch hackathon data to get updated status
      window.location.reload(); // Simple reload for now
    } catch (error) {
      console.error('Status update failed:', error);
      alert('Status update failed. Please try again.');
    }
  };

  // Status monitoring is now handled by NestJS backend cron job
  // No client-side monitoring needed - status changes happen automatically on server

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Cover Image */}
        <div className="mb-8">
          <HackathonCoverImage
            src={hackathon.coverImageUrl}
            alt={hackathon.title}
            className="w-full max-w-4xl mx-auto"
          />
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {hackathon.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Organized by {hackathon.organizerAddress.slice(0, 6)}...{hackathon.organizerAddress.slice(-4)}
              </p>
            </div>
            <HackathonStatusBadge status={hackathon.status} size="lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Hackathon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {hackathon.description}
                </p>
              </CardContent>
            </Card>

            {/* Registration / Submission Section */}
            <div id="register">
              {isConnected && !isLoadingParticipant && (
                <>
                  {participantStatus ? (
                    <SubmissionTracker 
                      participant={participantStatus}
                      hackathon={hackathon}
                    />
                  ) : (
                    <ParticipantRegistration 
                      hackathon={hackathon}
                    />
                  )}
                </>
              )}
            </div>

            {/* Participants List */}
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
                <CardDescription>
                  {participants?.length || 0} participants registered
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingParticipants ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : participants && participants.length > 0 ? (
                  <div className="space-y-3">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium text-sm">
                            {participant.userAddress.slice(0, 6)}...{participant.userAddress.slice(-4)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Registered: {new Date(participant.registeredAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {participant.submissionUrl ? (
                            <>
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Submitted
                              </Badge>
                              <a 
                                href={participant.submissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs"
                              >
                                View Project
                              </a>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-gray-600">
                              No Submission
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No participants yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status and Countdown */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <HackathonCountdown hackathon={hackathon} />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <ActionButtons
              hackathon={hackathon}
              userAddress={walletAddress}
              isRegistered={!!participantStatus}
              hasSubmitted={!!participantStatus?.submissionUrl}
              hasVoted={hasVoted}
              isJudge={isJudge}
              onRegister={handleRegister}
              onSubmit={handleSubmit}
              onVote={handleVote}
            />

            {/* Status Management (for organizers) */}
            {isOrganizer && (
              <StatusManagement
                hackathon={hackathon}
                isOrganizer={isOrganizer}
                onStatusUpdate={handleStatusUpdate}
              />
            )}

            {/* Judge Management (for organizers) */}
            <JudgeManagement
              hackathon={hackathon}
              isOrganizer={isOrganizer}
            />

            {/* Winner Management - Show for completed hackathons */}
            {(hackathon.status === 'COMPLETED' || hackathon.status === 'VOTING_CLOSED') && (
              <WinnerManagement
                hackathonId={hackathon.id}
                isOrganizer={isOrganizer}
                hackathonStatus={hackathon.status}
              />
            )}

            {/* Timeline Details */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="font-medium text-sm">Registration Deadline</div>
                  <div className="text-sm text-gray-600">
                    {new Date(hackathon.registrationDeadline).toLocaleDateString()} at{' '}
                    {new Date(hackathon.registrationDeadline).toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-sm">Submission Deadline</div>
                  <div className="text-sm text-gray-600">
                    {new Date(hackathon.submissionDeadline).toLocaleDateString()} at{' '}
                    {new Date(hackathon.submissionDeadline).toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-sm">Voting Deadline</div>
                  <div className="text-sm text-gray-600">
                    {new Date(hackathon.votingDeadline).toLocaleDateString()} at{' '}
                    {new Date(hackathon.votingDeadline).toLocaleTimeString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prize & Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hackathon.prizeAmount && (
                  <div>
                    <div className="font-medium text-sm">Prize Pool</div>
                    <div className="text-lg font-bold text-green-600">
                      {hackathon.prizeAmount} KAIA
                    </div>
                  </div>
                )}
                {hackathon.entryFee && (
                  <div>
                    <div className="font-medium text-sm">Entry Fee</div>
                    <div className="text-sm text-gray-600">
                      {hackathon.entryFee} KAIA
                    </div>
                  </div>
                )}
                {hackathon.maxParticipants && (
                  <div>
                    <div className="font-medium text-sm">Max Participants</div>
                    <div className="text-sm text-gray-600">
                      {participants?.length || 0} / {hackathon.maxParticipants}
                    </div>
                  </div>
                )}
                <div>
                  <div className="font-medium text-sm">Created</div>
                  <div className="text-sm text-gray-600">
                    {new Date(hackathon.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
