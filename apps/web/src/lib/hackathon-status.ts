import { HackathonStatus, type Hackathon } from "@/types/global";

/**
 * Hackathon status transition utilities
 */

export interface StatusTransition {
  from: HackathonStatus;
  to: HackathonStatus;
  condition: (hackathon: Hackathon) => boolean;
  reason: string;
}

export interface StatusInfo {
  status: HackathonStatus;
  label: string;
  description: string;
  color: "gray" | "blue" | "green" | "yellow" | "red" | "purple";
  allowsRegistration: boolean;
  allowsSubmission: boolean;
  allowsVoting: boolean;
  isCompleted: boolean;
}

/**
 * Status information mapping
 */
export const STATUS_INFO: Record<HackathonStatus, StatusInfo> = {
  [HackathonStatus.DRAFT]: {
    status: HackathonStatus.DRAFT,
    label: "Draft",
    description: "Hackathon is being prepared",
    color: "gray",
    allowsRegistration: false,
    allowsSubmission: false,
    allowsVoting: false,
    isCompleted: false,
  },
  [HackathonStatus.REGISTRATION_OPEN]: {
    status: HackathonStatus.REGISTRATION_OPEN,
    label: "Registration Open",
    description: "Participants can register",
    color: "blue",
    allowsRegistration: true,
    allowsSubmission: false,
    allowsVoting: false,
    isCompleted: false,
  },
  [HackathonStatus.REGISTRATION_CLOSED]: {
    status: HackathonStatus.REGISTRATION_CLOSED,
    label: "Registration Closed",
    description: "Registration has ended, waiting for submissions",
    color: "yellow",
    allowsRegistration: false,
    allowsSubmission: false,
    allowsVoting: false,
    isCompleted: false,
  },
  [HackathonStatus.SUBMISSION_OPEN]: {
    status: HackathonStatus.SUBMISSION_OPEN,
    label: "Submission Open",
    description: "Participants can submit their projects",
    color: "green",
    allowsRegistration: false,
    allowsSubmission: true,
    allowsVoting: false,
    isCompleted: false,
  },
  [HackathonStatus.SUBMISSION_CLOSED]: {
    status: HackathonStatus.SUBMISSION_CLOSED,
    label: "Submission Closed",
    description: "Submissions have ended, waiting for voting",
    color: "yellow",
    allowsRegistration: false,
    allowsSubmission: false,
    allowsVoting: false,
    isCompleted: false,
  },
  [HackathonStatus.VOTING_OPEN]: {
    status: HackathonStatus.VOTING_OPEN,
    label: "Voting Open",
    description: "Judges can vote on submissions",
    color: "purple",
    allowsRegistration: false,
    allowsSubmission: false,
    allowsVoting: true,
    isCompleted: false,
  },
  [HackathonStatus.VOTING_CLOSED]: {
    status: HackathonStatus.VOTING_CLOSED,
    label: "Voting Closed",
    description: "Voting has ended, results being calculated",
    color: "yellow",
    allowsRegistration: false,
    allowsSubmission: false,
    allowsVoting: false,
    isCompleted: false,
  },
  [HackathonStatus.COMPLETED]: {
    status: HackathonStatus.COMPLETED,
    label: "Completed",
    description: "Hackathon has ended and winners announced",
    color: "red",
    allowsRegistration: false,
    allowsSubmission: false,
    allowsVoting: false,
    isCompleted: true,
  },
};

/**
 * Automatic status transition rules based on timeline
 */
export const STATUS_TRANSITIONS: StatusTransition[] = [
  {
    from: HackathonStatus.DRAFT,
    to: HackathonStatus.REGISTRATION_OPEN,
    condition: () => true, // Manual transition by organizer
    reason: "Hackathon published by organizer",
  },
  {
    from: HackathonStatus.REGISTRATION_OPEN,
    to: HackathonStatus.REGISTRATION_CLOSED,
    condition: (hackathon) =>
      new Date() > new Date(hackathon.registrationDeadline),
    reason: "Registration deadline passed",
  },
  {
    from: HackathonStatus.REGISTRATION_CLOSED,
    to: HackathonStatus.SUBMISSION_OPEN,
    condition: () => true, // Can be automatic or manual
    reason: "Submission phase started",
  },
  {
    from: HackathonStatus.SUBMISSION_OPEN,
    to: HackathonStatus.SUBMISSION_CLOSED,
    condition: (hackathon) =>
      new Date() > new Date(hackathon.submissionDeadline),
    reason: "Submission deadline passed",
  },
  {
    from: HackathonStatus.SUBMISSION_CLOSED,
    to: HackathonStatus.VOTING_OPEN,
    condition: () => true, // Manual transition to allow organizer preparation
    reason: "Voting phase started by organizer",
  },
  {
    from: HackathonStatus.VOTING_OPEN,
    to: HackathonStatus.VOTING_CLOSED,
    condition: (hackathon) => new Date() > new Date(hackathon.votingDeadline),
    reason: "Voting deadline passed",
  },
  {
    from: HackathonStatus.VOTING_CLOSED,
    to: HackathonStatus.COMPLETED,
    condition: () => true, // Manual transition after results calculation
    reason: "Results calculated and winners announced",
  },
];

/**
 * Get the current status information
 */
export function getStatusInfo(status: HackathonStatus): StatusInfo {
  return STATUS_INFO[status];
}

/**
 * Determine if a status transition should occur automatically
 */
export function getNextAutomaticStatus(hackathon: Hackathon): {
  newStatus: HackathonStatus | null;
  reason: string | null;
} {
  // Find applicable transition
  const transition = STATUS_TRANSITIONS.find(
    (t) => t.from === hackathon.status && t.condition(hackathon),
  );

  if (transition) {
    return {
      newStatus: transition.to,
      reason: transition.reason,
    };
  }

  return { newStatus: null, reason: null };
}

/**
 * Get all possible next statuses for manual transition
 */
export function getPossibleNextStatuses(
  status: HackathonStatus,
): HackathonStatus[] {
  return STATUS_TRANSITIONS.filter((t) => t.from === status).map((t) => t.to);
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  from: HackathonStatus,
  to: HackathonStatus,
): boolean {
  return STATUS_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/**
 * Get time remaining until next deadline
 */
export function getTimeRemaining(hackathon: Hackathon): {
  deadline: Date | null;
  timeRemaining: number | null;
  label: string | null;
  isPastDeadline: boolean;
} {
  const now = new Date().getTime();
  const status = hackathon.status;

  let deadline: Date | null = null;
  let label: string | null = null;

  switch (status) {
    case HackathonStatus.REGISTRATION_OPEN:
      deadline = new Date(hackathon.registrationDeadline);
      label = "Registration ends";
      break;
    case HackathonStatus.SUBMISSION_OPEN:
      deadline = new Date(hackathon.submissionDeadline);
      label = "Submission ends";
      break;
    case HackathonStatus.VOTING_OPEN:
      deadline = new Date(hackathon.votingDeadline);
      label = "Voting ends";
      break;
    default:
      return {
        deadline: null,
        timeRemaining: null,
        label: null,
        isPastDeadline: false,
      };
  }

  const timeRemaining = deadline.getTime() - now;
  const isPastDeadline = timeRemaining <= 0;

  return {
    deadline,
    timeRemaining: isPastDeadline ? 0 : timeRemaining,
    label,
    isPastDeadline,
  };
}

/**
 * Format time remaining as human-readable string
 */
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return "Deadline passed";

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Check if an action is allowed based on current status
 */
export function isActionAllowed(
  hackathon: Hackathon,
  action: "register" | "submit" | "vote",
): { allowed: boolean; reason?: string } {
  const statusInfo = getStatusInfo(hackathon.status);
  const timeRemaining = getTimeRemaining(hackathon);

  switch (action) {
    case "register":
      if (!statusInfo.allowsRegistration) {
        return { allowed: false, reason: "Registration is not open" };
      }
      if (timeRemaining.isPastDeadline) {
        return { allowed: false, reason: "Registration deadline has passed" };
      }
      return { allowed: true };

    case "submit":
      if (!statusInfo.allowsSubmission) {
        return { allowed: false, reason: "Submission is not open" };
      }
      if (timeRemaining.isPastDeadline) {
        return { allowed: false, reason: "Submission deadline has passed" };
      }
      return { allowed: true };

    case "vote":
      if (!statusInfo.allowsVoting) {
        return { allowed: false, reason: "Voting is not open" };
      }
      if (timeRemaining.isPastDeadline) {
        return { allowed: false, reason: "Voting deadline has passed" };
      }
      return { allowed: true };

    default:
      return { allowed: false, reason: "Unknown action" };
  }
}
