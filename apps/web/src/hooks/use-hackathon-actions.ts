'use client';

import { useMemo } from 'react';
import { type Hackathon } from '@/types/global';
import { isActionAllowed, getStatusInfo, getTimeRemaining } from '@/lib/hackathon-status';

export interface ActionState {
  allowed: boolean;
  reason?: string;
  timeRemaining?: number;
  deadline?: Date;
}

export interface HackathonActions {
  canRegister: ActionState;
  canSubmit: ActionState;
  canVote: ActionState;
  statusInfo: ReturnType<typeof getStatusInfo>;
  timeData: ReturnType<typeof getTimeRemaining>;
}

/**
 * Hook to determine what actions are currently allowed for a hackathon
 */
export function useHackathonActions(hackathon: Hackathon): HackathonActions {
  return useMemo(() => {
    const statusInfo = getStatusInfo(hackathon.status);
    const timeData = getTimeRemaining(hackathon);

    const canRegister = isActionAllowed(hackathon, 'register');
    const canSubmit = isActionAllowed(hackathon, 'submit');
    const canVote = isActionAllowed(hackathon, 'vote');

    // Add time information to action states
    const enrichActionState = (actionState: ReturnType<typeof isActionAllowed>): ActionState => ({
      ...actionState,
      timeRemaining: timeData.timeRemaining || undefined,
      deadline: timeData.deadline || undefined,
    });

    return {
      canRegister: enrichActionState(canRegister),
      canSubmit: enrichActionState(canSubmit),
      canVote: enrichActionState(canVote),
      statusInfo,
      timeData,
    };
  }, [hackathon]);
}

/**
 * Hook for deadline enforcement with real-time updates
 */
export function useDeadlineEnforcement(hackathon: Hackathon) {
  const actions = useHackathonActions(hackathon);

  // Helper function to check if any deadline has passed
  const hasDeadlinePassed = useMemo(() => {
    return actions.timeData.isPastDeadline;
  }, [actions.timeData.isPastDeadline]);

  // Helper function to get appropriate error message for blocked actions
  const getBlockedActionMessage = (action: 'register' | 'submit' | 'vote'): string => {
    const actionState = actions[`can${action.charAt(0).toUpperCase() + action.slice(1)}` as keyof HackathonActions] as ActionState;
    
    if (actionState.reason) {
      return actionState.reason;
    }

    return `${action.charAt(0).toUpperCase() + action.slice(1)} is not available at this time`;
  };

  return {
    ...actions,
    hasDeadlinePassed,
    getBlockedActionMessage,
  };
}