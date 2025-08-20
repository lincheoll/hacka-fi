"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Coins,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  Square,
  Eye,
  Download,
  MoreHorizontal,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  AlertCircle,
  Settings,
  History,
  FileText,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React from "react";

// Types for our distribution system
interface DistributionJob {
  hackathonId: string;
  hackathonTitle: string;
  totalPrizePool: string;
  scheduledAt: string;
  status: "SCHEDULED" | "PROCESSING" | "COMPLETED" | "FAILED";
  retryCount: number;
  lastError?: string;
}

interface DistributionHistory {
  id: number;
  hackathonId: string;
  hackathonTitle: string;
  recipientAddress: string;
  position: number;
  amount: string;
  percentage: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  txHash?: string;
  executedAt?: string;
  createdAt: string;
}

interface SystemHealth {
  emergencyStop: boolean;
  activeDistributions: number;
  pendingTransactions: number;
  failedTransactions: number;
  systemLoad: {
    distributionJobsInQueue: number;
    transactionsBeingMonitored: number;
  };
  alerts: Array<{
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    timestamp: string;
  }>;
}

interface TransactionDetails {
  hash: string;
  status: "pending" | "confirmed" | "failed" | "timeout";
  blockNumber?: number;
  gasUsed?: string;
  confirmations: number;
  error?: string;
}

interface PrizeDistributionDashboardProps {
  hackathonId?: string;
  isAdmin?: boolean;
}

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

const getDistributionJobs = async (): Promise<DistributionJob[]> => {
  try {
    const result = await apiCall("/emergency-controls/distribution-jobs");
    return result.data?.activeJobs || [];
  } catch (error) {
    console.error("Error fetching distribution jobs:", error);
    return [];
  }
};

const getDistributionHistory = async (): Promise<DistributionHistory[]> => {
  try {
    const result = await apiCall("/distribution-history");
    return result.data?.distributions || [];
  } catch (error) {
    console.error("Error fetching distribution history:", error);
    return [];
  }
};

const getSystemHealth = async (): Promise<SystemHealth> => {
  try {
    const result = await apiCall("/emergency-controls/system-health");
    return result.data;
  } catch (error) {
    console.error("Error fetching system health:", error);
    return {
      emergencyStop: false,
      activeDistributions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
      systemLoad: {
        distributionJobsInQueue: 0,
        transactionsBeingMonitored: 0,
      },
      alerts: [],
    };
  }
};

const getTransactionDetails = async (
  txHash: string,
): Promise<TransactionDetails> => {
  try {
    const result = await apiCall(`/transaction-monitor/transaction/${txHash}`);
    return result.data;
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    return {
      hash: txHash,
      status: "pending",
      confirmations: 0,
    };
  }
};

export function PrizeDistributionDashboard({
  hackathonId,
  isAdmin = false,
}: PrizeDistributionDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [distributionJobs, setDistributionJobs] = useState<DistributionJob[]>(
    [],
  );
  const [distributionHistory, setDistributionHistory] = useState<
    DistributionHistory[]
  >([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(
    null,
  );
  const [transactionDetails, setTransactionDetails] =
    useState<TransactionDetails | null>(null);
  const { toast } = useToast();

  // Load all data
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [jobs, history, health] = await Promise.all([
        getDistributionJobs(),
        getDistributionHistory(),
        getSystemHealth(),
      ]);

      setDistributionJobs(jobs);
      setDistributionHistory(history);
      setSystemHealth(health);
    } catch (error) {
      toast({
        title: "Failed to Load Dashboard",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load transaction details
  const loadTransactionDetails = useCallback(
    async (txHash: string) => {
      try {
        const details = await getTransactionDetails(txHash);
        setTransactionDetails(details);
      } catch (error) {
        toast({
          title: "Failed to Load Transaction",
          description:
            error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
    toast({
      title: "Dashboard Refreshed",
      description: "All data has been updated",
    });
  };

  // Emergency stop functions (admin only)
  const handleEmergencyStop = async () => {
    if (!isAdmin) return;

    try {
      await apiCall("/emergency-controls/emergency-stop", {
        method: "POST",
        body: JSON.stringify({
          reason: "Emergency stop activated from dashboard",
        }),
      });
      toast({
        title: "Emergency Stop Activated",
        description: "All distribution activities have been halted",
        variant: "destructive",
      });
      await loadDashboardData();
    } catch (error) {
      toast({
        title: "Failed to Activate Emergency Stop",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleManualDistribution = async (hackathonId: string) => {
    if (!isAdmin) return;

    try {
      await apiCall("/emergency-controls/manual-distribution", {
        method: "POST",
        body: JSON.stringify({
          hackathonId,
          reason: "Manual trigger from dashboard",
        }),
      });
      toast({
        title: "Manual Distribution Triggered",
        description: `Distribution started for hackathon ${hackathonId}`,
      });
      await loadDashboardData();
    } catch (error) {
      toast({
        title: "Failed to Trigger Distribution",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Utility functions
  const formatEthAmount = (weiAmount: string): string => {
    const eth = parseFloat(weiAmount) / 1e18;
    return `${eth.toFixed(4)} ETH`;
  };

  const formatTimeAgo = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "PROCESSING":
      case "PENDING":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "FAILED":
      case "CANCELLED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "PROCESSING":
      case "PENDING":
        return "secondary";
      case "FAILED":
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "high":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "medium":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  if (isLoading && !systemHealth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Prize Distribution Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading dashboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Prize Distribution Dashboard
                {systemHealth?.emergencyStop && (
                  <Badge variant="destructive" className="ml-2">
                    EMERGENCY STOP ACTIVE
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Monitor and manage automated prize distributions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                      Admin
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={handleEmergencyStop}
                      className="text-red-600"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Emergency Stop
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Export Reports
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Shield className="w-4 h-4 mr-2" />
                      System Health
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* System Health Alerts */}
      {systemHealth?.alerts && systemHealth.alerts.length > 0 && (
        <div className="space-y-2">
          {systemHealth.alerts.map((alert, index) => (
            <Alert
              key={index}
              variant={
                alert.severity === "critical" ? "destructive" : "default"
              }
            >
              {getAlertIcon(alert.severity)}
              <AlertDescription className="flex items-center justify-between">
                <span>{alert.message}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(alert.timestamp)}
                </span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-8 h-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {systemHealth?.activeDistributions || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Distributions
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {systemHealth?.pendingTransactions || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pending Transactions
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-8 h-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {
                        distributionHistory.filter(
                          (h) => h.status === "COMPLETED",
                        ).length
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Successful Distributions
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="w-8 h-8 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {systemHealth?.failedTransactions || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Failed Transactions
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {distributionHistory.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <div>
                        <div className="font-medium">{item.hackathonTitle}</div>
                        <div className="text-sm text-muted-foreground">
                          Position {item.position} •{" "}
                          {formatEthAmount(item.amount)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {item.status}
                      </Badge>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatTimeAgo(item.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Jobs Tab */}
        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Active Distribution Jobs
              </CardTitle>
              <CardDescription>
                Currently running and scheduled distribution jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {distributionJobs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No active distribution jobs
                </div>
              ) : (
                <div className="space-y-4">
                  {distributionJobs.map((job) => (
                    <div
                      key={job.hackathonId}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">
                            {job.hackathonTitle}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>
                              Prize Pool: {formatEthAmount(job.totalPrizePool)}
                            </span>
                            <span>
                              Scheduled: {formatTimeAgo(job.scheduledAt)}
                            </span>
                            {job.retryCount > 0 && (
                              <span className="text-yellow-600">
                                Retries: {job.retryCount}
                              </span>
                            )}
                          </div>
                          {job.lastError && (
                            <div className="mt-1 text-sm text-red-600">
                              Error: {job.lastError}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(job.status)}>
                            {job.status}
                          </Badge>
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleManualDistribution(job.hackathonId)
                                  }
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Manual Trigger
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Square className="w-4 h-4 mr-2" />
                                  Cancel Job
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Distribution History
              </CardTitle>
              <CardDescription>
                Complete history of prize distributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hackathon</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributionHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.hackathonTitle}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.recipientAddress.slice(0, 6)}...
                        {item.recipientAddress.slice(-4)}
                      </TableCell>
                      <TableCell>#{item.position}</TableCell>
                      <TableCell>{formatEthAmount(item.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.txHash ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTransaction(item.txHash!);
                                  loadTransactionDetails(item.txHash!);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Transaction Details</DialogTitle>
                                <DialogDescription>
                                  Blockchain transaction information
                                </DialogDescription>
                              </DialogHeader>
                              {transactionDetails && (
                                <div className="space-y-3">
                                  <div>
                                    <div className="font-medium">Hash</div>
                                    <div className="font-mono text-sm break-all">
                                      {transactionDetails.hash}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Status</div>
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(transactionDetails.status)}
                                      {transactionDetails.status}
                                    </div>
                                  </div>
                                  {transactionDetails.blockNumber && (
                                    <div>
                                      <div className="font-medium">
                                        Block Number
                                      </div>
                                      <div>
                                        {transactionDetails.blockNumber}
                                      </div>
                                    </div>
                                  )}
                                  {transactionDetails.gasUsed && (
                                    <div>
                                      <div className="font-medium">
                                        Gas Used
                                      </div>
                                      <div>
                                        {parseInt(
                                          transactionDetails.gasUsed,
                                        ).toLocaleString()}
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-medium">
                                      Confirmations
                                    </div>
                                    <div>
                                      {transactionDetails.confirmations}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatTimeAgo(item.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Emergency Stop</span>
                    <Badge
                      variant={
                        systemHealth?.emergencyStop ? "destructive" : "default"
                      }
                    >
                      {systemHealth?.emergencyStop ? "ACTIVE" : "NORMAL"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Distribution Jobs in Queue</span>
                    <span className="font-mono">
                      {systemHealth?.systemLoad.distributionJobsInQueue || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Transactions Being Monitored</span>
                    <span className="font-mono">
                      {systemHealth?.systemLoad.transactionsBeingMonitored || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Success Rate</span>
                      <span>
                        {distributionHistory.length > 0
                          ? Math.round(
                              (distributionHistory.filter(
                                (h) => h.status === "COMPLETED",
                              ).length /
                                distributionHistory.length) *
                                100,
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        distributionHistory.length > 0
                          ? (distributionHistory.filter(
                              (h) => h.status === "COMPLETED",
                            ).length /
                              distributionHistory.length) *
                            100
                          : 0
                      }
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>System Load</span>
                      <span>
                        {Math.min(
                          ((systemHealth?.systemLoad.distributionJobsInQueue ||
                            0) /
                            10) *
                            100,
                          100,
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        ((systemHealth?.systemLoad.distributionJobsInQueue ||
                          0) /
                          10) *
                          100,
                        100,
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 overflow-y-auto max-h-64">
                {distributionHistory.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-muted-foreground">
                      {formatTimeAgo(item.createdAt)}
                    </span>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        item.status === "COMPLETED"
                          ? "bg-green-500"
                          : item.status === "FAILED"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                      }`}
                    />
                    <span>
                      {item.status === "COMPLETED"
                        ? "Distribution completed"
                        : item.status === "FAILED"
                          ? "Distribution failed"
                          : "Distribution pending"}{" "}
                      for {item.hackathonTitle} - Position #{item.position}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
