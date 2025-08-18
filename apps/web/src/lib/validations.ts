import { z } from "zod";

// Hackathon creation form validation schema
export const createHackathonSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title must not exceed 100 characters"),

    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(1000, "Description must not exceed 1000 characters"),

    registrationDeadline: z.string().refine((date) => {
      const deadline = new Date(date);
      const now = new Date();
      return deadline > now;
    }, "Registration deadline must be in the future"),

    submissionDeadline: z.string().refine((date) => {
      const deadline = new Date(date);
      const now = new Date();
      return deadline > now;
    }, "Submission deadline must be in the future"),

    votingDeadline: z.string().refine((date) => {
      const deadline = new Date(date);
      const now = new Date();
      return deadline > now;
    }, "Voting deadline must be in the future"),

    prizeAmount: z
      .string()
      .optional()
      .refine((value) => {
        if (!value) return true;
        const amount = parseFloat(value);
        return !isNaN(amount) && amount >= 0;
      }, "Prize amount must be a valid positive number"),

    entryFee: z
      .string()
      .optional()
      .refine((value) => {
        if (!value) return true;
        const fee = parseFloat(value);
        return !isNaN(fee) && fee >= 0;
      }, "Entry fee must be a valid positive number"),

    maxParticipants: z
      .string()
      .optional()
      .refine((value) => {
        if (!value) return true;
        const max = parseInt(value);
        return !isNaN(max) && max > 0;
      }, "Maximum participants must be a positive number"),
  })
  .refine(
    (data) => {
      // Registration deadline must be before submission deadline
      const regDeadline = new Date(data.registrationDeadline);
      const subDeadline = new Date(data.submissionDeadline);
      return regDeadline < subDeadline;
    },
    {
      message: "Registration deadline must be before submission deadline",
      path: ["submissionDeadline"],
    },
  )
  .refine(
    (data) => {
      // Submission deadline must be before voting deadline
      const subDeadline = new Date(data.submissionDeadline);
      const voteDeadline = new Date(data.votingDeadline);
      return subDeadline < voteDeadline;
    },
    {
      message: "Submission deadline must be before voting deadline",
      path: ["votingDeadline"],
    },
  );

export type CreateHackathonFormData = z.infer<typeof createHackathonSchema>;

// Participant registration validation schema
export const participantRegistrationSchema = z.object({
  hackathonId: z.string().min(1, "Hackathon ID is required"),
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address format"),
  entryFeeSignature: z.string().optional(), // For entry fee payment verification
});

export type ParticipantRegistrationFormData = z.infer<
  typeof participantRegistrationSchema
>;

// Submission URL validation schema
export const submissionUpdateSchema = z.object({
  submissionUrl: z
    .string()
    .url("Must be a valid URL")
    .refine((url) => {
      // Allow GitHub, GitLab, demo sites, and other common project hosting
      const validDomains = [
        "github.com",
        "gitlab.com",
        "bitbucket.org",
        "vercel.app",
        "netlify.app",
        "heroku.com",
        "replit.com",
        "codesandbox.io",
        "stackblitz.com",
        "youtube.com",
        "youtu.be",
        "vimeo.com",
        "devpost.com",
      ];

      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // Check if it's a valid domain or subdomain of allowed domains
        return (
          validDomains.some(
            (domain) => hostname === domain || hostname.endsWith("." + domain),
          ) ||
          hostname.includes("github.io") ||
          hostname.includes("pages.dev")
        );
      } catch {
        return false;
      }
    }, "Submission must be from a recognized platform (GitHub, GitLab, Vercel, etc.)"),
});

export type SubmissionUpdateFormData = z.infer<typeof submissionUpdateSchema>;

// Combined participant submission schema (registration + submission)
export const participantSubmissionSchema = z.object({
  submissionUrl: submissionUpdateSchema.shape.submissionUrl,
  teamMembers: z
    .array(z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"))
    .optional(),
  projectDescription: z
    .string()
    .min(50, "Project description must be at least 50 characters")
    .max(500, "Project description must not exceed 500 characters")
    .optional(),
});

export type ParticipantSubmissionFormData = z.infer<
  typeof participantSubmissionSchema
>;

// Vote submission validation schema
export const voteSubmissionSchema = z.object({
  participantAddress: z.string().min(1, "Participant address is required"),

  score: z
    .number()
    .min(1, "Score must be at least 1")
    .max(10, "Score must not exceed 10"),

  comment: z
    .string()
    .max(500, "Comment must not exceed 500 characters")
    .optional(),
});

export type VoteSubmissionFormData = z.infer<typeof voteSubmissionSchema>;

// User profile update validation schema
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must not exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens",
    )
    .optional(),

  bio: z.string().max(500, "Bio must not exceed 500 characters").optional(),

  email: z.string().email("Please enter a valid email address").optional(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// File upload validation schema
export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024,
      "File size must be less than 5MB",
    )
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "File must be a JPEG, PNG, or WebP image",
    ),
});

export type FileUploadFormData = z.infer<typeof fileUploadSchema>;

// Image upload with optional URL validation
export const imageUploadSchema = z.object({
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  imageFile: z
    .instanceof(File)
    .optional()
    .refine((file) => {
      if (!file) return true;
      return file.size <= 5 * 1024 * 1024;
    }, "File size must be less than 5MB")
    .refine((file) => {
      if (!file) return true;
      return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    }, "File must be a JPEG, PNG, or WebP image"),
});

export type ImageUploadFormData = z.infer<typeof imageUploadSchema>;

// Avatar upload schema (smaller size limit)
export const avatarUploadSchema = z.object({
  avatarFile: z
    .instanceof(File)
    .optional()
    .refine((file) => {
      if (!file) return true;
      return file.size <= 2 * 1024 * 1024;
    }, "Avatar file size must be less than 2MB")
    .refine((file) => {
      if (!file) return true;
      return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    }, "Avatar must be a JPEG, PNG, or WebP image"),
});

export type AvatarUploadFormData = z.infer<typeof avatarUploadSchema>;
