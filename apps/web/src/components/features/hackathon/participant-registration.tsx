'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAccount, useSignMessage } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { participantRegistrationSchema, type ParticipantRegistrationFormData } from '@/lib/validations';
import { registerParticipant, fetchParticipantStatus } from '@/lib/api-functions';
import type { Hackathon, Participant } from '@/types/global';

interface ParticipantRegistrationProps {
  hackathon: Hackathon;
  onRegistrationSuccess?: (participant: Participant) => void;
}

export function ParticipantRegistration({ 
  hackathon, 
  onRegistrationSuccess 
}: ParticipantRegistrationProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  
  const { address: walletAddress, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const {
    handleSubmit,
    formState: { isSubmitting },
    setValue,
    reset,
  } = useForm<ParticipantRegistrationFormData>({
    resolver: zodResolver(participantRegistrationSchema),
  });

  // Check if user is already registered
  const { data: participantStatus, isLoading: isCheckingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['participant-status', hackathon.id, walletAddress],
    queryFn: () => walletAddress ? fetchParticipantStatus(hackathon.id, walletAddress) : null,
    enabled: !!walletAddress && isConnected,
  });

  // Set form values when wallet connects
  useEffect(() => {
    if (walletAddress) {
      setValue('hackathonId', hackathon.id);
      setValue('walletAddress', walletAddress);
    }
  }, [walletAddress, hackathon.id, setValue]);

  const registrationMutation = useMutation({
    mutationFn: registerParticipant,
    onSuccess: (participant) => {
      setSubmitSuccess('Successfully registered for hackathon!');
      setSubmitError(null);
      reset();
      refetchStatus();
      onRegistrationSuccess?.(participant);
    },
    onError: (error: Error) => {
      setSubmitError(error.message || 'Failed to register for hackathon');
      setSubmitSuccess(null);
    },
  });

  const handleRegistration = async (data: ParticipantRegistrationFormData) => {
    if (!walletAddress || !isConnected) {
      setSubmitError('Please connect your wallet first');
      return;
    }

    try {
      // Check if entry fee is required
      const entryFeeRequired = hackathon.entryFee && parseFloat(hackathon.entryFee) > 0;
      let entryFeeSignature: string | undefined;

      if (entryFeeRequired) {
        // Create message for entry fee payment
        const message = `Pay entry fee of ${hackathon.entryFee} KAIA for hackathon: ${hackathon.title}`;
        entryFeeSignature = await signMessageAsync({ message });
      }

      await registrationMutation.mutateAsync({
        ...data,
        entryFeeSignature,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Registration failed');
    }
  };

  // Show different states based on wallet connection and registration status
  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Register for Hackathon</CardTitle>
          <CardDescription>
            Connect your wallet to register for this hackathon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please connect your wallet to register for this hackathon.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isCheckingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Register for Hackathon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="ml-2">Checking registration status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (participantStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration Status</CardTitle>
          <CardDescription>
            You are already registered for this hackathon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              ✅ You are registered for this hackathon! 
              {participantStatus.submissionUrl ? (
                <span className="block mt-1">
                  Submission: <a 
                    href={participantStatus.submissionUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {participantStatus.submissionUrl}
                  </a>
                </span>
              ) : (
                <span className="block mt-1 text-gray-600">
                  No submission yet - you can submit your project before the deadline.
                </span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check if registration is still open
  const registrationDeadline = new Date(hackathon.registrationDeadline);
  const now = new Date();
  const isRegistrationOpen = now < registrationDeadline;

  if (!isRegistrationOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration Closed</CardTitle>
          <CardDescription>
            Registration for this hackathon has ended
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Registration closed on {registrationDeadline.toLocaleDateString()}. 
              You can no longer register for this hackathon.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register for Hackathon</CardTitle>
        <CardDescription>
          Join this hackathon and submit your project before the deadline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleRegistration)} className="space-y-4">
          {/* Entry Fee Information */}
          {hackathon.entryFee && parseFloat(hackathon.entryFee) > 0 && (
            <Alert>
              <AlertDescription>
                <strong>Entry Fee Required:</strong> {hackathon.entryFee} KAIA
                <br />
                <span className="text-sm text-gray-600">
                  You will be prompted to sign a message to verify entry fee payment.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Registration Information */}
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Wallet Address:</strong> {walletAddress}
            </div>
            <div className="text-sm">
              <strong>Registration Deadline:</strong> {registrationDeadline.toLocaleDateString()} at {registrationDeadline.toLocaleTimeString()}
            </div>
            <div className="text-sm">
              <strong>Submission Deadline:</strong> {new Date(hackathon.submissionDeadline).toLocaleDateString()} at {new Date(hackathon.submissionDeadline).toLocaleTimeString()}
            </div>
          </div>

          {/* Error and Success Messages */}
          {submitError && (
            <Alert className="border-red-500 bg-red-50">
              <AlertDescription className="text-red-700">
                {submitError}
              </AlertDescription>
            </Alert>
          )}

          {submitSuccess && (
            <Alert className="border-green-500 bg-green-50">
              <AlertDescription className="text-green-700">
                {submitSuccess}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isSubmitting || registrationMutation.isPending}
            className="w-full"
          >
            {isSubmitting || registrationMutation.isPending ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Registering...
              </>
            ) : (
              'Register for Hackathon'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}