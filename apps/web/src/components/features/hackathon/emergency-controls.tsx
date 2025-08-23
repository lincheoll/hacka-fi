"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Shield,
  Square,
  Play,
  RefreshCw,
  Settings,
  XCircle,
  CheckCircle,
  Clock,
  Terminal,
  FileText,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React from "react";

// Types for emergency controls
interface EmergencyStopStatus {
  active: boolean;
  reasons: Array<{ admin: string; reason: string }>;
}

interface ManualDistributionRequest {
  hackathonId: string;
  reason: string;
  bypassChecks: boolean;
}

interface StatusOverrideRequest {
  hackathonId: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
  bypassValidation: boolean;
}

interface DistributionCancellationRequest {
  hackathonId: string;
  reason: string;
  refundPrizePool: boolean;
}

interface ForceRetryRequest {
  hackathonId: string;
  customGasPrice?: string;
  customGasLimit?: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  hackathonId: string;
  adminAddress: string;
  reason: string;
  details?: Record<string, any>;
}

interface EmergencyControlsProps {
  isAdmin: boolean;
}

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3010";

// Helper function for API calls with auth
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(typeof window !== "undefined" &&
        localStorage.getItem("authToken") && {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

const getEmergencyStopStatus = async (): Promise<EmergencyStopStatus> => {
  try {
    const result = await apiCall("/emergency-controls/emergency-stop/status");
    return result.data;
  } catch (error) {
    console.error("Error fetching emergency stop status:", error);
    return { active: false, reasons: [] };
  }
};

const activateEmergencyStop = async (reason: string): Promise<void> => {
  await apiCall("/emergency-controls/emergency-stop", {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
};

const deactivateEmergencyStop = async (): Promise<void> => {
  await apiCall("/emergency-controls/emergency-stop/deactivate", {
    method: "POST",
  });
};

const triggerManualDistribution = async (
  request: ManualDistributionRequest,
): Promise<void> => {
  await apiCall("/emergency-controls/manual-distribution", {
    method: "POST",
    body: JSON.stringify(request),
  });
};

const overrideHackathonStatus = async (
  request: StatusOverrideRequest,
): Promise<void> => {
  await apiCall("/emergency-controls/override-status", {
    method: "POST",
    body: JSON.stringify(request),
  });
};

const cancelDistribution = async (
  request: DistributionCancellationRequest,
): Promise<void> => {
  await apiCall("/emergency-controls/cancel-distribution", {
    method: "POST",
    body: JSON.stringify(request),
  });
};

const forceRetryDistribution = async (
  request: ForceRetryRequest,
): Promise<void> => {
  await apiCall("/emergency-controls/force-retry", {
    method: "POST",
    body: JSON.stringify(request),
  });
};

const getAuditTrail = async (): Promise<AuditEntry[]> => {
  try {
    const result = await apiCall("/emergency-controls/audit-trail");
    return result.data?.auditEntries || [];
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    return [];
  }
};

export function EmergencyControls({ isAdmin }: EmergencyControlsProps) {
  const [activeTab, setActiveTab] = useState("emergency");
  const [emergencyStopStatus, setEmergencyStopStatus] =
    useState<EmergencyStopStatus | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [emergencyReason, setEmergencyReason] = useState("");
  const [manualDistributionForm, setManualDistributionForm] =
    useState<ManualDistributionRequest>({
      hackathonId: "",
      reason: "",
      bypassChecks: false,
    });
  const [statusOverrideForm, setStatusOverrideForm] =
    useState<StatusOverrideRequest>({
      hackathonId: "",
      fromStatus: "",
      toStatus: "",
      reason: "",
      bypassValidation: false,
    });
  const [cancellationForm, setCancellationForm] =
    useState<DistributionCancellationRequest>({
      hackathonId: "",
      reason: "",
      refundPrizePool: false,
    });
  const [retryForm, setRetryForm] = useState<ForceRetryRequest>({
    hackathonId: "",
    customGasPrice: "",
    customGasLimit: "",
  });

  const { toast } = useToast();

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stopStatus, audit] = await Promise.all([
        getEmergencyStopStatus(),
        getAuditTrail(),
      ]);
      setEmergencyStopStatus(stopStatus);
      setAuditTrail(audit);
    } catch (error) {
      toast({
        title: "Failed to Load Data",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Emergency stop handlers
  const handleActivateEmergencyStop = async () => {
    if (!emergencyReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the emergency stop",
        variant: "destructive",
      });
      return;
    }

    try {
      await activateEmergencyStop(emergencyReason);
      toast({
        title: "Emergency Stop Activated",
        description: "All distribution activities have been halted",
        variant: "destructive",
      });
      setEmergencyReason("");
      await loadData();
    } catch (error) {
      toast({
        title: "Failed to Activate Emergency Stop",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDeactivateEmergencyStop = async () => {
    try {
      await deactivateEmergencyStop();
      toast({
        title: "Emergency Stop Deactivated",
        description: "Normal operations have been resumed",
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Failed to Deactivate Emergency Stop",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Manual distribution handler
  const handleManualDistribution = async () => {
    if (!manualDistributionForm.hackathonId || !manualDistributionForm.reason) {
      toast({
        title: "Form Incomplete",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await triggerManualDistribution(manualDistributionForm);
      toast({
        title: "Manual Distribution Triggered",
        description: `Distribution started for hackathon ${manualDistributionForm.hackathonId}`,
      });
      setManualDistributionForm({
        hackathonId: "",
        reason: "",
        bypassChecks: false,
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Failed to Trigger Distribution",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Status override handler
  const handleStatusOverride = async () => {
    if (
      !statusOverrideForm.hackathonId ||
      !statusOverrideForm.fromStatus ||
      !statusOverrideForm.toStatus ||
      !statusOverrideForm.reason
    ) {
      toast({
        title: "Form Incomplete",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await overrideHackathonStatus(statusOverrideForm);
      toast({
        title: "Status Override Complete",
        description: `Hackathon status changed to ${statusOverrideForm.toStatus}`,
      });
      setStatusOverrideForm({
        hackathonId: "",
        fromStatus: "",
        toStatus: "",
        reason: "",
        bypassValidation: false,
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Failed to Override Status",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Distribution cancellation handler
  const handleCancelDistribution = async () => {
    if (!cancellationForm.hackathonId || !cancellationForm.reason) {
      toast({
        title: "Form Incomplete",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await cancelDistribution(cancellationForm);
      toast({
        title: "Distribution Cancelled",
        description: `Distribution cancelled for hackathon ${cancellationForm.hackathonId}`,
        variant: "destructive",
      });
      setCancellationForm({
        hackathonId: "",
        reason: "",
        refundPrizePool: false,
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Failed to Cancel Distribution",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Force retry handler
  const handleForceRetry = async () => {
    if (!retryForm.hackathonId) {
      toast({
        title: "Form Incomplete",
        description: "Please provide a hackathon ID",
        variant: "destructive",
      });
      return;
    }

    try {
      await forceRetryDistribution(retryForm);
      toast({
        title: "Force Retry Initiated",
        description: `Retry started for hackathon ${retryForm.hackathonId}`,
      });
      setRetryForm({ hackathonId: "", customGasPrice: "", customGasLimit: "" });
      await loadData();
    } catch (error) {
      toast({
        title: "Failed to Force Retry",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Utility functions
  const formatTimeAgo = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  // Load data on mount
  React.useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, loadData]);

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Emergency Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              You don&apos;t have permission to access emergency controls.
              Administrator privileges required.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !emergencyStopStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Emergency Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading emergency controls...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Emergency Controls
                {emergencyStopStatus?.active && (
                  <Badge variant="destructive" className="ml-2">
                    EMERGENCY STOP ACTIVE
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Administrative controls for the automated distribution system
              </CardDescription>
            </div>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Emergency Stop Alert */}
      {emergencyStopStatus?.active && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">Emergency Stop is Active</div>
              <div>
                All automated distribution activities are currently halted.
              </div>
              {emergencyStopStatus.reasons.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Reasons:</div>
                  {emergencyStopStatus.reasons.map((reason, index) => (
                    <div key={index} className="text-sm">
                      • {reason.reason} (by {reason.admin.slice(0, 6)}...
                      {reason.admin.slice(-4)})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Controls */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
          <TabsTrigger value="manual">Manual Control</TabsTrigger>
          <TabsTrigger value="override">System Override</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* Emergency Tab */}
        <TabsContent value="emergency" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Emergency Stop */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Square className="w-5 h-5" />
                  Emergency Stop
                </CardTitle>
                <CardDescription>
                  Immediately halt all distribution activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="emergency-reason">Reason (Required)</Label>
                  <Textarea
                    id="emergency-reason"
                    placeholder="Describe the reason for the emergency stop..."
                    value={emergencyReason}
                    onChange={(e) => setEmergencyReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  {!emergencyStopStatus?.active ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="flex-1">
                          <Square className="w-4 h-4 mr-2" />
                          Activate Emergency Stop
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Emergency Stop</DialogTitle>
                          <DialogDescription>
                            This will immediately halt all automated
                            distribution activities. Are you sure you want to
                            proceed?
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button
                            variant="destructive"
                            onClick={handleActivateEmergencyStop}
                          >
                            Activate Emergency Stop
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button
                      variant="default"
                      onClick={handleDeactivateEmergencyStop}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume Operations
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Force Retry */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" />
                  Force Retry Distribution
                </CardTitle>
                <CardDescription>
                  Retry a failed distribution with custom parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="retry-hackathon-id">Hackathon ID</Label>
                  <Input
                    id="retry-hackathon-id"
                    placeholder="Enter hackathon ID"
                    value={retryForm.hackathonId}
                    onChange={(e) =>
                      setRetryForm({
                        ...retryForm,
                        hackathonId: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="retry-gas-price">
                    Custom Gas Price (Gwei)
                  </Label>
                  <Input
                    id="retry-gas-price"
                    placeholder="e.g., 25"
                    value={retryForm.customGasPrice}
                    onChange={(e) =>
                      setRetryForm({
                        ...retryForm,
                        customGasPrice: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="retry-gas-limit">Custom Gas Limit</Label>
                  <Input
                    id="retry-gas-limit"
                    placeholder="e.g., 300000"
                    value={retryForm.customGasLimit}
                    onChange={(e) =>
                      setRetryForm({
                        ...retryForm,
                        customGasLimit: e.target.value,
                      })
                    }
                  />
                </div>
                <Button onClick={handleForceRetry} className="w-full">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Force Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Manual Control Tab */}
        <TabsContent value="manual" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Manual Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Manual Distribution Trigger
                </CardTitle>
                <CardDescription>
                  Manually trigger distribution for a specific hackathon
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="manual-hackathon-id">Hackathon ID</Label>
                  <Input
                    id="manual-hackathon-id"
                    placeholder="Enter hackathon ID"
                    value={manualDistributionForm.hackathonId}
                    onChange={(e) =>
                      setManualDistributionForm({
                        ...manualDistributionForm,
                        hackathonId: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="manual-reason">Reason</Label>
                  <Textarea
                    id="manual-reason"
                    placeholder="Why is manual intervention required?"
                    value={manualDistributionForm.reason}
                    onChange={(e) =>
                      setManualDistributionForm({
                        ...manualDistributionForm,
                        reason: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bypass-checks"
                    checked={manualDistributionForm.bypassChecks}
                    onCheckedChange={(checked) =>
                      setManualDistributionForm({
                        ...manualDistributionForm,
                        bypassChecks: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="bypass-checks">
                    Bypass validation checks
                  </Label>
                </div>
                <Button onClick={handleManualDistribution} className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Trigger Distribution
                </Button>
              </CardContent>
            </Card>

            {/* Cancel Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Cancel Distribution
                </CardTitle>
                <CardDescription>
                  Cancel an ongoing distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cancel-hackathon-id">Hackathon ID</Label>
                  <Input
                    id="cancel-hackathon-id"
                    placeholder="Enter hackathon ID"
                    value={cancellationForm.hackathonId}
                    onChange={(e) =>
                      setCancellationForm({
                        ...cancellationForm,
                        hackathonId: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cancel-reason">Reason</Label>
                  <Textarea
                    id="cancel-reason"
                    placeholder="Why is this distribution being cancelled?"
                    value={cancellationForm.reason}
                    onChange={(e) =>
                      setCancellationForm({
                        ...cancellationForm,
                        reason: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="refund-prize-pool"
                    checked={cancellationForm.refundPrizePool}
                    onCheckedChange={(checked) =>
                      setCancellationForm({
                        ...cancellationForm,
                        refundPrizePool: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="refund-prize-pool">Refund prize pool</Label>
                </div>
                <Button
                  onClick={handleCancelDistribution}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Distribution
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Override Tab */}
        <TabsContent value="override" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Status Override
              </CardTitle>
              <CardDescription>
                Manually override hackathon status (use with extreme caution)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Status overrides can break the
                  normal flow of hackathons. Only use this feature if you
                  understand the consequences.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div>
                  <Label htmlFor="override-hackathon-id">Hackathon ID</Label>
                  <Input
                    id="override-hackathon-id"
                    placeholder="Enter hackathon ID"
                    value={statusOverrideForm.hackathonId}
                    onChange={(e) =>
                      setStatusOverrideForm({
                        ...statusOverrideForm,
                        hackathonId: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="from-status">From Status</Label>
                  <Select
                    value={statusOverrideForm.fromStatus}
                    onValueChange={(value) =>
                      setStatusOverrideForm({
                        ...statusOverrideForm,
                        fromStatus: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select current status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                      <SelectItem value="REGISTRATION_OPEN">
                        REGISTRATION_OPEN
                      </SelectItem>
                      <SelectItem value="SUBMISSION_OPEN">
                        SUBMISSION_OPEN
                      </SelectItem>
                      <SelectItem value="SUBMISSION_CLOSED">
                        SUBMISSION_CLOSED
                      </SelectItem>
                      <SelectItem value="VOTING_OPEN">VOTING_OPEN</SelectItem>
                      <SelectItem value="VOTING_CLOSED">
                        VOTING_CLOSED
                      </SelectItem>
                      <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="to-status">To Status</Label>
                  <Select
                    value={statusOverrideForm.toStatus}
                    onValueChange={(value) =>
                      setStatusOverrideForm({
                        ...statusOverrideForm,
                        toStatus: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                      <SelectItem value="REGISTRATION_OPEN">
                        REGISTRATION_OPEN
                      </SelectItem>
                      <SelectItem value="SUBMISSION_OPEN">
                        SUBMISSION_OPEN
                      </SelectItem>
                      <SelectItem value="SUBMISSION_CLOSED">
                        SUBMISSION_CLOSED
                      </SelectItem>
                      <SelectItem value="VOTING_OPEN">VOTING_OPEN</SelectItem>
                      <SelectItem value="VOTING_CLOSED">
                        VOTING_CLOSED
                      </SelectItem>
                      <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="override-reason">Reason</Label>
                <Textarea
                  id="override-reason"
                  placeholder="Explain why this status override is necessary..."
                  value={statusOverrideForm.reason}
                  onChange={(e) =>
                    setStatusOverrideForm({
                      ...statusOverrideForm,
                      reason: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bypass-validation"
                  checked={statusOverrideForm.bypassValidation}
                  onCheckedChange={(checked) =>
                    setStatusOverrideForm({
                      ...statusOverrideForm,
                      bypassValidation: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="bypass-validation">
                  Bypass status validation
                </Label>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    Override Status
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Status Override</DialogTitle>
                    <DialogDescription>
                      You are about to override the status of hackathon{" "}
                      {statusOverrideForm.hackathonId}
                      from {statusOverrideForm.fromStatus} to{" "}
                      {statusOverrideForm.toStatus}. This action cannot be
                      undone easily.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button
                      variant="destructive"
                      onClick={handleStatusOverride}
                    >
                      Confirm Override
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Emergency Control Audit Trail
              </CardTitle>
              <CardDescription>
                History of all emergency control actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditTrail.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No emergency control actions recorded
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditTrail.map((entry) => (
                      <div key={entry.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{entry.action}</span>
                            <Badge variant="outline">{entry.hackathonId}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatTimeAgo(entry.timestamp)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          <div>
                            <strong>Admin:</strong> {entry.adminAddress}
                          </div>
                          <div>
                            <strong>Reason:</strong> {entry.reason}
                          </div>
                          {entry.details && (
                            <div>
                              <strong>Details:</strong>{" "}
                              {JSON.stringify(entry.details)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
