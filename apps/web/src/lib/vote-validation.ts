import type { Hackathon, Participant } from "@/types/global";
import type { Judge } from "@/types/api";

export interface VoteValidationError {
  field?: string;
  message: string;
  code: string;
  severity: "error" | "warning" | "info";
}

export interface VoteValidationResult {
  isValid: boolean;
  errors: VoteValidationError[];
  warnings: VoteValidationError[];
}

export interface VoteValidationContext {
  hackathon: Hackathon;
  judges: Judge[];
  participants: Participant[];
  currentUserAddress: string;
  participantId: string;
  score: number;
  comment?: string;
}

/**
 * Client-side vote validation
 */
export class VoteValidator {
  /**
   * Validate vote submission on the frontend
   */
  static validateVote(context: VoteValidationContext): VoteValidationResult {
    const errors: VoteValidationError[] = [];
    const warnings: VoteValidationError[] = [];

    // 1. Validate hackathon status
    const statusErrors = this.validateHackathonStatus(context.hackathon);
    errors.push(...statusErrors);

    // 2. Validate voting period
    const periodErrors = this.validateVotingPeriod(context.hackathon);
    errors.push(...periodErrors);

    // 3. Validate judge authorization
    const judgeErrors = this.validateJudgeAuthorization(
      context.judges,
      context.currentUserAddress,
    );
    errors.push(...judgeErrors);

    // 4. Validate participant
    const participantErrors = this.validateParticipant(
      context.participants,
      context.participantId,
    );
    errors.push(...participantErrors);

    // 5. Validate vote data
    const voteDataErrors = this.validateVoteData(
      context.score,
      context.comment,
    );
    errors.push(...voteDataErrors.errors);
    warnings.push(...voteDataErrors.warnings);

    // 6. Validate business rules
    const businessRuleErrors = this.validateBusinessRules(context);
    errors.push(...businessRuleErrors.errors);
    warnings.push(...businessRuleErrors.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Quick validation for real-time feedback
   */
  static quickValidateScore(score: number): VoteValidationError | null {
    if (score < 1 || score > 10) {
      return {
        field: "score",
        message: "Score must be between 1 and 10",
        code: "INVALID_SCORE_RANGE",
        severity: "error",
      };
    }
    return null;
  }

  /**
   * Quick validation for comment
   */
  static quickValidateComment(comment: string): VoteValidationError | null {
    if (comment.length > 1000) {
      return {
        field: "comment",
        message: "Comment must not exceed 1000 characters",
        code: "COMMENT_TOO_LONG",
        severity: "error",
      };
    }

    // Check for potentially inappropriate content
    const suspiciousPatterns = /\\b(spam|scam|fake|cheat)\\b/i;
    if (suspiciousPatterns.test(comment)) {
      return {
        field: "comment",
        message: "Comment may contain inappropriate content. Please review.",
        code: "POTENTIALLY_INAPPROPRIATE",
        severity: "warning",
      };
    }

    return null;
  }

  /**
   * Validate hackathon status
   */
  private static validateHackathonStatus(
    hackathon: Hackathon,
  ): VoteValidationError[] {
    const errors: VoteValidationError[] = [];

    if (hackathon.status !== "VOTING_OPEN") {
      errors.push({
        message: `Voting is not open. Current status: ${hackathon.status}`,
        code: "INVALID_HACKATHON_STATUS",
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Validate voting period timing
   */
  private static validateVotingPeriod(
    hackathon: Hackathon,
  ): VoteValidationError[] {
    const errors: VoteValidationError[] = [];
    const now = new Date();

    // Check if voting has started
    const submissionDeadline = new Date(hackathon.submissionDeadline);
    if (now < submissionDeadline) {
      const timeUntilStart = submissionDeadline.getTime() - now.getTime();
      const hoursUntilStart = Math.ceil(timeUntilStart / (1000 * 60 * 60));

      errors.push({
        message: `Voting has not started yet. Voting begins in ${hoursUntilStart} hours.`,
        code: "VOTING_NOT_STARTED",
        severity: "error",
      });
    }

    // Check if voting deadline has passed
    const votingDeadline = new Date(hackathon.votingDeadline);
    if (now > votingDeadline) {
      const timeSinceEnd = now.getTime() - votingDeadline.getTime();
      const hoursSinceEnd = Math.floor(timeSinceEnd / (1000 * 60 * 60));

      errors.push({
        message: `Voting deadline passed ${hoursSinceEnd} hours ago.`,
        code: "VOTING_DEADLINE_PASSED",
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Validate judge authorization
   */
  private static validateJudgeAuthorization(
    judges: Judge[],
    currentUserAddress: string,
  ): VoteValidationError[] {
    const errors: VoteValidationError[] = [];

    const isJudge = judges.some(
      (judge) =>
        judge.judgeAddress.toLowerCase() === currentUserAddress.toLowerCase(),
    );

    if (!isJudge) {
      errors.push({
        message: "You are not authorized to vote in this hackathon.",
        code: "JUDGE_NOT_AUTHORIZED",
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Validate participant exists and has submission
   */
  private static validateParticipant(
    participants: Participant[],
    participantId: string,
  ): VoteValidationError[] {
    const errors: VoteValidationError[] = [];

    const participant = participants.find((p) => p.id === participantId);

    if (!participant) {
      errors.push({
        message: "Participant not found.",
        code: "PARTICIPANT_NOT_FOUND",
        severity: "error",
      });
      return errors;
    }

    if (!participant.submissionUrl) {
      errors.push({
        message: "Cannot vote for participant without submission.",
        code: "NO_SUBMISSION",
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Validate vote data (score and comment)
   */
  private static validateVoteData(
    score: number,
    comment?: string,
  ): { errors: VoteValidationError[]; warnings: VoteValidationError[] } {
    const errors: VoteValidationError[] = [];
    const warnings: VoteValidationError[] = [];

    // Score validation
    const scoreError = this.quickValidateScore(score);
    if (scoreError) {
      errors.push(scoreError);
    }

    // Comment validation
    if (comment) {
      const commentError = this.quickValidateComment(comment);
      if (commentError) {
        if (commentError.severity === "error") {
          errors.push(commentError);
        } else {
          warnings.push(commentError);
        }
      }
    }

    // Additional validations
    if (score === 1) {
      warnings.push({
        field: "score",
        message:
          "Very low score. Please consider providing constructive feedback.",
        code: "LOW_SCORE_WARNING",
        severity: "warning",
      });
    }

    if (score === 10) {
      warnings.push({
        field: "score",
        message:
          "Perfect score. Make sure this reflects truly exceptional work.",
        code: "PERFECT_SCORE_WARNING",
        severity: "warning",
      });
    }

    if (!comment || comment.trim().length < 10) {
      warnings.push({
        field: "comment",
        message:
          "Consider adding constructive feedback to help the participant.",
        code: "NO_FEEDBACK_WARNING",
        severity: "info",
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate business rules
   */
  private static validateBusinessRules(context: VoteValidationContext): {
    errors: VoteValidationError[];
    warnings: VoteValidationError[];
  } {
    const errors: VoteValidationError[] = [];
    const warnings: VoteValidationError[] = [];

    // Check if judge is voting for their own submission
    const participant = context.participants.find(
      (p) => p.id === context.participantId,
    );

    if (
      participant &&
      participant.userAddress.toLowerCase() ===
        context.currentUserAddress.toLowerCase()
    ) {
      errors.push({
        message: "You cannot vote for your own submission.",
        code: "SELF_VOTING_PROHIBITED",
        severity: "error",
      });
    }

    return { errors, warnings };
  }

  /**
   * Get user-friendly error message
   */
  static getErrorMessage(error: VoteValidationError): string {
    return error.message;
  }

  /**
   * Get color class for error severity
   */
  static getErrorColorClass(severity: VoteValidationError["severity"]): string {
    switch (severity) {
      case "error":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  }

  /**
   * Get icon for error severity
   */
  static getErrorIcon(severity: VoteValidationError["severity"]): string {
    switch (severity) {
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📋";
    }
  }
}

/**
 * Hook for vote validation in React components
 */
export function useVoteValidation() {
  const validateVote = (context: VoteValidationContext) => {
    return VoteValidator.validateVote(context);
  };

  const quickValidateScore = (score: number) => {
    return VoteValidator.quickValidateScore(score);
  };

  const quickValidateComment = (comment: string) => {
    return VoteValidator.quickValidateComment(comment);
  };

  return {
    validateVote,
    quickValidateScore,
    quickValidateComment,
    getErrorMessage: VoteValidator.getErrorMessage,
    getErrorColorClass: VoteValidator.getErrorColorClass,
    getErrorIcon: VoteValidator.getErrorIcon,
  };
}

/**
 * Real-time validation for form inputs
 */
export function getRealtimeValidation(score: number, comment: string) {
  const scoreError = VoteValidator.quickValidateScore(score);
  const commentError = comment
    ? VoteValidator.quickValidateComment(comment)
    : null;

  return {
    scoreError,
    commentError,
    hasErrors: !!(
      scoreError ||
      (commentError && commentError.severity === "error")
    ),
    hasWarnings: !!(commentError && commentError.severity === "warning"),
  };
}
