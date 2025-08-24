"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  submissionUpdateSchema,
  type SubmissionUpdateFormData,
} from "@/lib/validations";
import { updateSubmission } from "@/lib/api-functions";
import type { Participant, Hackathon } from "@/types/global";

interface SubmissionTrackerProps {
  participant: Participant;
  hackathon: Hackathon;
  onSubmissionUpdate?: (participant: Participant) => void;
}

export function SubmissionTracker({
  participant,
  hackathon,
  onSubmissionUpdate,
}: SubmissionTrackerProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [projectDescription, setProjectDescription] = useState("");

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionUpdateFormData>({
    resolver: zodResolver(submissionUpdateSchema),
    defaultValues: {
      submissionUrl: participant.submissionUrl || "",
    },
  });

  const submissionMutation = useMutation({
    mutationFn: (data: {
      submissionUrl: string;
      projectDescription?: string;
    }) =>
      updateSubmission(participant.id, {
        submissionUrl: data.submissionUrl,
        projectDescription: data.projectDescription,
      }),
    onSuccess: (updatedParticipant) => {
      setSubmitSuccess("Submission updated successfully!");
      setSubmitError(null);

      // Update the query cache
      queryClient.invalidateQueries({
        queryKey: ["participant-status", hackathon.id, participant.walletAddress],
      });

      onSubmissionUpdate?.(updatedParticipant);
    },
    onError: (error: Error) => {
      setSubmitError(error.message || "Failed to update submission");
      setSubmitSuccess(null);
    },
  });

  const handleSubmissionUpdate = async (data: SubmissionUpdateFormData) => {
    await submissionMutation.mutateAsync({
      submissionUrl: data.submissionUrl,
      projectDescription: projectDescription || undefined,
    });
  };

  // Check if submission deadline has passed
  const submissionDeadline = new Date(hackathon.submissionDeadline);
  const now = new Date();
  const isSubmissionOpen = now < submissionDeadline;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Submission</CardTitle>
        <CardDescription>
          {isSubmissionOpen
            ? `Submit your project before ${submissionDeadline.toLocaleDateString()} at ${submissionDeadline.toLocaleTimeString()}`
            : "Submission deadline has passed"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isSubmissionOpen && (
          <Alert className="mb-4">
            <AlertDescription>
              ⏰ Submission deadline has passed. You can no longer update your
              submission.
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={handleSubmit(handleSubmissionUpdate)}
          className="space-y-4"
        >
          {/* Submission URL */}
          <div className="space-y-2">
            <Label htmlFor="submissionUrl">
              Project URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="submissionUrl"
              type="url"
              placeholder="https://github.com/username/project or https://your-demo.vercel.app"
              disabled={
                !isSubmissionOpen ||
                isSubmitting ||
                submissionMutation.isPending
              }
              {...register("submissionUrl")}
            />
            {errors.submissionUrl && (
              <p className="text-sm text-red-600">
                {errors.submissionUrl.message}
              </p>
            )}
            <p className="text-sm text-gray-600">
              Submit your GitHub repository, live demo, or project showcase URL
            </p>
          </div>

          {/* Project Description */}
          <div className="space-y-2">
            <Label htmlFor="projectDescription">
              Project Description (Optional)
            </Label>
            <Textarea
              id="projectDescription"
              placeholder="Brief description of your project, technologies used, and key features..."
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              disabled={
                !isSubmissionOpen ||
                isSubmitting ||
                submissionMutation.isPending
              }
              rows={4}
              maxLength={500}
            />
            <p className="text-sm text-gray-600">
              {projectDescription.length}/500 characters
            </p>
          </div>

          {/* Current Submission Status */}
          {participant.submissionUrl && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Current Submission:</h4>
              <a
                href={participant.submissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm break-all"
              >
                {participant.submissionUrl}
              </a>
              <p className="text-xs text-gray-500 mt-1">
                Submitted on:{" "}
                {new Date(participant.registeredAt).toLocaleDateString()}
              </p>
            </div>
          )}

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
            disabled={
              !isSubmissionOpen || isSubmitting || submissionMutation.isPending
            }
            className="w-full"
          >
            {isSubmitting || submissionMutation.isPending ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Updating Submission...
              </>
            ) : participant.submissionUrl ? (
              "Update Submission"
            ) : (
              "Submit Project"
            )}
          </Button>

          {/* Submission Guidelines */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Submission Guidelines:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Submit your GitHub repository or live demo URL</li>
              <li>• Make sure your project is publicly accessible</li>
              <li>• Include a README with setup instructions</li>
              <li>
                • Accepted platforms: GitHub, GitLab, Vercel, Netlify, and more
              </li>
              <li>• You can update your submission until the deadline</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
