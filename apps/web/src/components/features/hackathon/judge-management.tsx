"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Users,
  AlertCircle,
  Check,
  UserCheck,
  Calendar,
} from "lucide-react";
import { fetchJudges, addJudge, removeJudge } from "@/lib/api-functions";
import type { Hackathon } from "@/types/global";
import type { AddJudgeRequest, RemoveJudgeRequest } from "@/types/api";

interface JudgeManagementProps {
  hackathon: Hackathon;
  isOrganizer: boolean;
}

export function JudgeManagement({
  hackathon,
  isOrganizer,
}: JudgeManagementProps) {
  const queryClient = useQueryClient();
  const [newJudgeAddress, setNewJudgeAddress] = useState("");
  const [newJudgeNote, setNewJudgeNote] = useState("");
  const [isAddingJudge, setIsAddingJudge] = useState(false);

  // Fetch judges
  const {
    data: judgeData,
    isLoading: isLoadingJudges,
    error: judgesError,
  } = useQuery({
    queryKey: ["judges", hackathon.id],
    queryFn: () => fetchJudges(hackathon.id),
    enabled: !!hackathon.id,
  });

  // Add judge mutation
  const addJudgeMutation = useMutation({
    mutationFn: (data: AddJudgeRequest) => addJudge(hackathon.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["judges", hackathon.id] });
      setNewJudgeAddress("");
      setNewJudgeNote("");
      setIsAddingJudge(false);
    },
    onError: (error) => {
      console.error("Failed to add judge:", error);
    },
  });

  // Remove judge mutation
  const removeJudgeMutation = useMutation({
    mutationFn: (data: RemoveJudgeRequest) => removeJudge(hackathon.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["judges", hackathon.id] });
    },
    onError: (error) => {
      console.error("Failed to remove judge:", error);
    },
  });

  const handleAddJudge = async () => {
    if (!newJudgeAddress.trim()) {
      alert("Please enter a judge wallet address");
      return;
    }

    // Basic wallet address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(newJudgeAddress.trim())) {
      alert("Please enter a valid wallet address");
      return;
    }

    try {
      await addJudgeMutation.mutateAsync({
        judgeAddress: newJudgeAddress.trim(),
        note: newJudgeNote.trim() || undefined,
      });
    } catch (error: any) {
      alert(error?.message || "Failed to add judge. Please try again.");
    }
  };

  const handleRemoveJudge = async (judgeAddress: string) => {
    if (!confirm("Are you sure you want to remove this judge?")) {
      return;
    }

    try {
      await removeJudgeMutation.mutateAsync({ judgeAddress });
    } catch (error: any) {
      alert(error?.message || "Failed to remove judge. Please try again.");
    }
  };

  // Check if judges can be modified
  const canModifyJudges =
    isOrganizer &&
    hackathon.status !== "VOTING_OPEN" &&
    hackathon.status !== "VOTING_CLOSED" &&
    hackathon.status !== "COMPLETED";

  if (!isOrganizer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Judges
          </CardTitle>
          <CardDescription>Approved judges for this hackathon</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingJudges ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse h-16 bg-gray-200 rounded"
                ></div>
              ))}
            </div>
          ) : judgeData && judgeData.judges.length > 0 ? (
            <div className="space-y-3">
              {judgeData.judges.map((judge) => (
                <div
                  key={judge.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {judge.judgeAddress.slice(0, 6)}...
                      {judge.judgeAddress.slice(-4)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Added: {new Date(judge.addedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-blue-600 border-blue-600"
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Judge
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No judges assigned yet
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Judge Management
        </CardTitle>
        <CardDescription>
          Manage judges who can vote on hackathon submissions
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Info */}
        {!canModifyJudges && (
          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-yellow-700">
              {hackathon.status === "VOTING_OPEN" &&
                "Judges cannot be modified during voting."}
              {hackathon.status === "VOTING_CLOSED" &&
                "Judges cannot be modified after voting has closed."}
              {hackathon.status === "COMPLETED" &&
                "This hackathon has been completed."}
            </AlertDescription>
          </Alert>
        )}

        {/* Add Judge Form */}
        {canModifyJudges && (
          <div className="space-y-4 p-4 border border-dashed border-gray-300 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Add New Judge</h3>
              {!isAddingJudge && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingJudge(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Judge
                </Button>
              )}
            </div>

            {isAddingJudge && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="judgeAddress">Wallet Address</Label>
                  <Input
                    id="judgeAddress"
                    type="text"
                    placeholder="0x..."
                    value={newJudgeAddress}
                    onChange={(e) => setNewJudgeAddress(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="judgeNote">Note (Optional)</Label>
                  <Textarea
                    id="judgeNote"
                    placeholder="Add a note about this judge..."
                    value={newJudgeNote}
                    onChange={(e) => setNewJudgeNote(e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleAddJudge}
                    disabled={
                      addJudgeMutation.isPending || !newJudgeAddress.trim()
                    }
                    size="sm"
                  >
                    {addJudgeMutation.isPending ? "Adding..." : "Add Judge"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingJudge(false);
                      setNewJudgeAddress("");
                      setNewJudgeNote("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Current Judges */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Current Judges</h3>
            {judgeData && (
              <Badge variant="outline">
                {judgeData.count} {judgeData.count === 1 ? "Judge" : "Judges"}
              </Badge>
            )}
          </div>

          {isLoadingJudges ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse h-16 bg-gray-200 rounded"
                ></div>
              ))}
            </div>
          ) : judgesError ? (
            <Alert className="border-red-500 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-700">
                Failed to load judges. Please try again.
              </AlertDescription>
            </Alert>
          ) : judgeData && judgeData.judges.length > 0 ? (
            <div className="space-y-3">
              {judgeData.judges.map((judge) => (
                <div
                  key={judge.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {judge.judgeAddress.slice(0, 6)}...
                      {judge.judgeAddress.slice(-4)}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      Added: {new Date(judge.addedAt).toLocaleDateString()}
                    </div>
                    {judge.judge?.username && (
                      <div className="text-sm text-gray-600 mt-1">
                        Username: {judge.judge.username}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-blue-600 border-blue-600"
                    >
                      <UserCheck className="h-3 w-3 mr-1" />
                      Judge
                    </Badge>

                    {canModifyJudges && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveJudge(judge.judgeAddress)}
                        disabled={removeJudgeMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No judges assigned yet</p>
              {canModifyJudges && (
                <p className="text-sm mt-1">
                  Add judges to enable voting on submissions
                </p>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        {canModifyJudges && (
          <Alert className="border-blue-500 bg-blue-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-blue-700">
              <strong>Instructions:</strong> Add trusted wallet addresses as
              judges. Judges will be able to vote on participant submissions
              during the voting phase. You cannot modify judges once voting has
              started.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
