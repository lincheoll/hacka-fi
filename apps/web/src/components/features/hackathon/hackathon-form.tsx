"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import {
  createHackathonSchema,
  type CreateHackathonFormData,
} from "@/lib/validations";
import { createHackathon, uploadImage } from "@/lib/api-functions";
import { ImageUpload } from "@/components/common/image-upload";
import type { Hackathon } from "@/types/global";

interface HackathonFormProps {
  onSuccess?: (hackathon: Hackathon) => void;
  onCancel?: () => void;
}

export function HackathonForm({ onSuccess, onCancel }: HackathonFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateHackathonFormData>({
    resolver: zodResolver(createHackathonSchema),
  });

  const createHackathonMutation = useMutation({
    mutationFn: createHackathon,
    onSuccess: (data) => {
      setSubmitSuccess("Hackathon created successfully!");
      setSubmitError(null);
      reset();
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      setSubmitError(error.message || "Failed to create hackathon");
      setSubmitSuccess(null);
    },
  });

  const onSubmit = async (data: CreateHackathonFormData) => {
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      // First, create the hackathon
      const apiData = {
        title: data.title,
        description: data.description,
        registrationDeadline: data.registrationDeadline,
        submissionDeadline: data.submissionDeadline,
        votingDeadline: data.votingDeadline,
        prizeAmount: data.prizeAmount
          ? parseFloat(data.prizeAmount)
          : undefined,
        entryFee: data.entryFee ? parseFloat(data.entryFee) : undefined,
        maxParticipants: data.maxParticipants
          ? parseInt(data.maxParticipants, 10)
          : undefined,
      };

      const hackathon = await createHackathonMutation.mutateAsync(apiData);

      // If there's a cover image, upload it
      if (coverImage && hackathon.id) {
        try {
          await uploadImage({
            file: coverImage,
            type: "hackathon-cover",
            entityId: hackathon.id,
            width: 800,
            height: 400,
            quality: 80,
          });
        } catch (imageError) {
          console.warn("Failed to upload cover image:", imageError);
          // Don't fail the whole process if image upload fails
        }
      }

      return hackathon;
    } catch (error) {
      throw error;
    }
  };

  const formatDateTimeLocal = (date: Date) => {
    return date.toISOString().slice(0, 16);
  };

  // Set default dates (1 week from now for registration, 2 weeks for submission, 3 weeks for voting)
  const getDefaultDates = () => {
    const now = new Date();
    const regDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const subDeadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const voteDeadline = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

    return {
      registration: formatDateTimeLocal(regDeadline),
      submission: formatDateTimeLocal(subDeadline),
      voting: formatDateTimeLocal(voteDeadline),
    };
  };

  const defaultDates = getDefaultDates();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Create New Hackathon
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Alert Messages */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {submitSuccess && (
            <Alert className="text-green-700 border-green-500">
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>{submitSuccess}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Hackathon Title *</Label>
              <Input
                id="title"
                placeholder="Enter hackathon title"
                {...register("title")}
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your hackathon, its goals, and requirements"
                rows={4}
                {...register("description")}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image (Optional)</Label>
              <ImageUpload
                value={coverImagePreview || undefined}
                onChange={(file, preview) => {
                  setCoverImage(file);
                  setCoverImagePreview(preview || null);
                }}
                placeholder="Upload a cover image for your hackathon"
                width={800}
                variant="rectangle"
                maxSize={5 * 1024 * 1024} // 5MB
              />
              <p className="text-xs text-gray-500">
                Recommended: 800x400px, JPEG/PNG/WebP format, max 5MB
              </p>
            </div>
          </div>

          {/* Deadlines */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="registrationDeadline">
                Registration Deadline *
              </Label>
              <Input
                id="registrationDeadline"
                type="datetime-local"
                defaultValue={defaultDates.registration}
                {...register("registrationDeadline")}
                className={errors.registrationDeadline ? "border-red-500" : ""}
              />
              {errors.registrationDeadline && (
                <p className="text-sm text-red-500">
                  {errors.registrationDeadline.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="submissionDeadline">Submission Deadline *</Label>
              <Input
                id="submissionDeadline"
                type="datetime-local"
                defaultValue={defaultDates.submission}
                {...register("submissionDeadline")}
                className={errors.submissionDeadline ? "border-red-500" : ""}
              />
              {errors.submissionDeadline && (
                <p className="text-sm text-red-500">
                  {errors.submissionDeadline.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="votingDeadline">Voting Deadline *</Label>
              <Input
                id="votingDeadline"
                type="datetime-local"
                defaultValue={defaultDates.voting}
                {...register("votingDeadline")}
                className={errors.votingDeadline ? "border-red-500" : ""}
              />
              {errors.votingDeadline && (
                <p className="text-sm text-red-500">
                  {errors.votingDeadline.message}
                </p>
              )}
            </div>
          </div>

          {/* Optional Settings */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="prizeAmount">Prize Amount (KAIA)</Label>
              <Input
                id="prizeAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...register("prizeAmount")}
                className={errors.prizeAmount ? "border-red-500" : ""}
              />
              {errors.prizeAmount && (
                <p className="text-sm text-red-500">
                  {errors.prizeAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryFee">Entry Fee (KAIA)</Label>
              <Input
                id="entryFee"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...register("entryFee")}
                className={errors.entryFee ? "border-red-500" : ""}
              />
              {errors.entryFee && (
                <p className="text-sm text-red-500">
                  {errors.entryFee.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                min="1"
                placeholder="Unlimited"
                {...register("maxParticipants")}
                className={errors.maxParticipants ? "border-red-500" : ""}
              />
              {errors.maxParticipants && (
                <p className="text-sm text-red-500">
                  {errors.maxParticipants.message}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
            )}

            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Hackathon"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
