"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  X,
  Plus,
  Save,
  ArrowLeft,
  Camera,
  AlertCircle,
  Check,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserProfileEditProps {
  address: string;
  onSave?: () => void;
  onCancel?: () => void;
}

interface ProfileData {
  walletAddress: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  twitterHandle?: string;
  githubHandle?: string;
  discordHandle?: string;
  website?: string;
  skills: string[];
}

export function UserProfileEdit({
  address,
  onSave,
  onCancel,
}: UserProfileEditProps) {
  const [profile, setProfile] = useState<ProfileData>({
    walletAddress: address,
    skills: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, [address]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user/profile/${address}`);
      const data = await response.json();

      if (data.success) {
        setProfile(data.data);
      } else {
        // If profile doesn't exist, start with default values
        setProfile({
          walletAddress: address,
          skills: [],
        });
      }
    } catch (err) {
      setError("Failed to load profile");
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setError("Avatar file must be less than 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Avatar must be an image file");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addSkill = () => {
    const skill = newSkill.trim();
    if (skill && !profile.skills.includes(skill)) {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, skill],
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const validateForm = (): boolean => {
    if (profile.username && profile.username.length < 3) {
      setError("Username must be at least 3 characters long");
      return false;
    }

    if (profile.username && profile.username.length > 30) {
      setError("Username must be less than 30 characters");
      return false;
    }

    if (profile.bio && profile.bio.length > 500) {
      setError("Bio must be less than 500 characters");
      return false;
    }

    if (profile.website && !isValidUrl(profile.website)) {
      setError("Please enter a valid website URL");
      return false;
    }

    return true;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;

    const formData = new FormData();
    formData.append("avatar", avatarFile);

    try {
      const response = await fetch("/api/user/upload-avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        return data.data.avatarUrl;
      } else {
        throw new Error(data.message || "Failed to upload avatar");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      throw err;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError(null);

    try {
      let avatarUrl = profile.avatarUrl;

      // Upload new avatar if selected
      if (avatarFile) {
        avatarUrl = (await uploadAvatar()) || "";
      }

      const profileData = {
        ...profile,
        avatarUrl,
      };

      const response = await fetch("/api/user/profile/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onSave?.();
        }, 2000);
      } else {
        setError(data.message || "Failed to save profile");
      }
    } catch (err) {
      setError("Failed to save profile");
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl p-6 mx-auto">
        <div className="space-y-4 animate-pulse">
          <div className="w-1/3 h-8 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl p-6 mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Profile updated successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border-2 border-gray-300 border-dashed">
              <AvatarImage
                src={avatarPreview || profile.avatarUrl}
                alt="Profile Avatar"
              />
              <AvatarFallback className="text-lg bg-gray-100">
                {profile.username?.[0]?.toUpperCase() ||
                  profile.walletAddress.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mb-2"
              >
                <Camera className="w-4 h-4 mr-2" />
                {profile.avatarUrl ? "Change Avatar" : "Upload Avatar"}
              </Button>
              <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={profile.username || ""}
              onChange={(e) => handleInputChange("username", e.target.value)}
              placeholder="Enter your username"
              maxLength={30}
            />
            <p className="text-sm text-gray-500">
              {profile.username?.length || 0}/30 characters
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio || ""}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={500}
            />
            <p className="text-sm text-gray-500">
              {profile.bio?.length || 0}/500 characters
            </p>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Social Links</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter Handle</Label>
                <Input
                  id="twitter"
                  value={profile.twitterHandle || ""}
                  onChange={(e) =>
                    handleInputChange("twitterHandle", e.target.value)
                  }
                  placeholder="username"
                  className="pl-8"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="github">GitHub Handle</Label>
                <Input
                  id="github"
                  value={profile.githubHandle || ""}
                  onChange={(e) =>
                    handleInputChange("githubHandle", e.target.value)
                  }
                  placeholder="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discord">Discord Handle</Label>
                <Input
                  id="discord"
                  value={profile.discordHandle || ""}
                  onChange={(e) =>
                    handleInputChange("discordHandle", e.target.value)
                  }
                  placeholder="username#1234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={profile.website || ""}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Skills</h3>

            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill"
                onKeyPress={(e) => e.key === "Enter" && addSkill()}
              />
              <Button type="button" onClick={addSkill} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="pr-1">
                    {skill}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-4 h-4 p-0 ml-2 hover:bg-transparent"
                      onClick={() => removeSkill(skill)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Wallet Address (Read-only) */}
          <div className="space-y-2">
            <Label>Wallet Address</Label>
            <Input
              value={profile.walletAddress}
              readOnly
              className="cursor-not-allowed bg-gray-50"
            />
            <p className="text-sm text-gray-500">
              Your wallet address cannot be changed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
