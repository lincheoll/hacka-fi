'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Upload, 
  Vote, 
  Clock, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { type Hackathon } from '@/types/global';
import { useDeadlineEnforcement } from '@/hooks/use-hackathon-actions';
import { formatTimeRemaining } from '@/lib/hackathon-status';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  hackathon: Hackathon;
  userAddress?: string;
  isRegistered?: boolean;
  hasSubmitted?: boolean;
  hasVoted?: boolean;
  isJudge?: boolean;
  onRegister?: () => Promise<void>;
  onSubmit?: () => Promise<void>;
  onVote?: () => Promise<void>;
  className?: string;
}

export function ActionButtons({
  hackathon,
  userAddress,
  isRegistered = false,
  hasSubmitted = false,
  hasVoted = false,
  isJudge = false,
  onRegister,
  onSubmit,
  onVote,
  className,
}: ActionButtonsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const actions = useDeadlineEnforcement(hackathon);

  const handleAction = async (actionType: string, actionFn?: () => Promise<void>) => {
    if (!actionFn) return;
    
    setIsLoading(actionType);
    try {
      await actionFn();
    } catch (error) {
      console.error(`${actionType} failed:`, error);
    } finally {
      setIsLoading(null);
    }
  };

  const ActionButton = ({ 
    action, 
    onClick, 
    icon: Icon, 
    children, 
    variant = 'default',
    disabled = false 
  }: {
    action: string;
    onClick?: () => Promise<void>;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    variant?: 'default' | 'outline' | 'destructive';
    disabled?: boolean;
  }) => (
    <Button
      variant={variant}
      onClick={() => handleAction(action, onClick)}
      disabled={disabled || isLoading === action}
      className="flex items-center gap-2"
    >
      <Icon className="h-4 w-4" />
      {isLoading === action ? 'Processing...' : children}
    </Button>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Status and Timeline Info */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-sm">
          {actions.statusInfo.label}
        </Badge>
        
        {actions.timeData.label && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>
              {actions.timeData.label}: {' '}
              {actions.timeData.timeRemaining !== null ? 
                formatTimeRemaining(actions.timeData.timeRemaining) : 
                'Deadline passed'
              }
            </span>
          </div>
        )}
      </div>

      {/* Registration Section */}
      {actions.canRegister.allowed && !isRegistered && userAddress && (
        <div className="space-y-2">
          <ActionButton
            action="register"
            onClick={onRegister}
            icon={UserPlus}
            variant="default"
          >
            Register for Hackathon
          </ActionButton>
          
          {actions.timeData.timeRemaining && actions.timeData.timeRemaining < 24 * 60 * 60 * 1000 && (
            <Alert className="border-orange-500 bg-orange-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Registration closes in less than 24 hours!
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Registration Blocked */}
      {!actions.canRegister.allowed && !isRegistered && userAddress && (
        <Alert className="border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {actions.getBlockedActionMessage('register')}
          </AlertDescription>
        </Alert>
      )}

      {/* Submission Section */}
      {isRegistered && (
        <div className="space-y-2">
          {actions.canSubmit.allowed && !hasSubmitted && (
            <>
              <ActionButton
                action="submit"
                onClick={onSubmit}
                icon={Upload}
                variant="default"
              >
                Submit Project
              </ActionButton>
              
              {actions.timeData.timeRemaining && actions.timeData.timeRemaining < 24 * 60 * 60 * 1000 && (
                <Alert className="border-orange-500 bg-orange-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Submission deadline is in less than 24 hours!
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {actions.canSubmit.allowed && hasSubmitted && (
            <div className="space-y-2">
              <ActionButton
                action="update-submission"
                onClick={onSubmit}
                icon={Upload}
                variant="outline"
              >
                Update Submission
              </ActionButton>
              <div className="text-sm text-green-600">
                ✓ Project submitted successfully
              </div>
            </div>
          )}

          {!actions.canSubmit.allowed && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {actions.getBlockedActionMessage('submit')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Voting Section - Only for Judges */}
      {isJudge && actions.canVote.allowed && (
        <div className="space-y-2">
          <ActionButton
            action="vote"
            onClick={onVote}
            icon={Vote}
            variant={hasVoted ? "outline" : "default"}
          >
            {hasVoted ? 'Update Votes' : 'Judge Projects'}
          </ActionButton>
          
          {hasVoted && (
            <div className="text-sm text-green-600">
              ✓ You have cast votes on this hackathon
            </div>
          )}
          
          {actions.timeData.timeRemaining && actions.timeData.timeRemaining < 24 * 60 * 60 * 1000 && (
            <Alert className="border-orange-500 bg-orange-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Voting closes in less than 24 hours!
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Judge Access Notice */}
      {isJudge && !actions.canVote.allowed && actions.statusInfo.status === 'VOTING_OPEN' && (
        <Alert className="border-blue-500 bg-blue-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are a judge for this hackathon. Voting will be available when the voting period starts.
          </AlertDescription>
        </Alert>
      )}

      {/* Voting Blocked for Non-Judges */}
      {!isJudge && actions.canVote.allowed && actions.statusInfo.status === 'VOTING_OPEN' && (
        <Alert className="border-gray-500 bg-gray-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Voting is currently open. Only approved judges can vote on hackathon submissions.
          </AlertDescription>
        </Alert>
      )}

      {/* Completed State */}
      {actions.statusInfo.isCompleted && (
        <div className="space-y-2">
          <Alert className="border-green-500 bg-green-50">
            <AlertDescription>
              This hackathon has been completed. View the results to see winners!
            </AlertDescription>
          </Alert>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = `/hackathons/${hackathon.id}/results`}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Results
          </Button>
        </div>
      )}

      {/* No Wallet Connected */}
      {!userAddress && (
        <Alert className="border-blue-500 bg-blue-50">
          <AlertDescription>
            Connect your wallet to participate in this hackathon
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}