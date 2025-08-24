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
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Eye,
  Users,
  Trophy,
  DollarSign,
  Activity,
  RefreshCw,
  Calendar,
  Hash,
  ArrowRight,
} from "lucide-react";
import React from "react";
import { toast } from "sonner";

// Types for distribution status
interface PrizePoolInfo {
  id: number;
  totalAmount: string;
  isDeposited: boolean;
  isDistributed: boolean;
  distributionTxHash?: string;
  createdAt: string;
}

interface WinnerInfo {
  position: number;
  participantAddress: string;
  participantName?: string;
  amount: string;
  percentage: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  txHash?: string;
  executedAt?: string;
  error?: string;
}

interface DistributionStatusInfo {
  hackathonId: string;
  hackathonTitle: string;
  status:
    | "DRAFT"
    | "PUBLISHED"
    | "REGISTRATION_OPEN"
    | "SUBMISSION_OPEN"
    | "SUBMISSION_CLOSED"
    | "VOTING_OPEN"
    | "VOTING_CLOSED"
    | "COMPLETED";
  prizePool: PrizePoolInfo | null;
  winners: WinnerInfo[];
  distributionProgress: {
    totalWinners: number;
    distributedWinners: number;
    pendingWinners: number;
    failedWinners: number;
    progressPercentage: number;
  };
  nextAction?: {
    action: string;
    description: string;
    estimatedTime?: string;
  };
  transactionHistory: Array<{
    txHash: string;
    status: "PENDING" | "COMPLETED" | "FAILED";
    submittedAt: string;
    confirmedAt?: string;
    gasUsed?: string;
    retryCount: number;
  }>;
}

interface DistributionStatusProps {
  hackathonId: string;
  showDetailed?: boolean;
  refreshInterval?: number;
}

// Mock API function - replace with actual API call
const getDistributionStatus = (
  hackathonId: string,
): Promise<DistributionStatusInfo> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        hackathonId,
        hackathonTitle: "DeFi Innovation Challenge 2024",
        status: "COMPLETED",
        prizePool: {
          id: 1,
          totalAmount: "10000000000000000000", // 10 ETH
          isDeposited: true,
          isDistributed: true,
          distributionTxHash: "0xabc123def456...",
          createdAt: new Date().toISOString(),
        },
        winners: [
          {
            position: 1,
            participantAddress: "0x742d35Cc3C0532925a3b8F474A738B2a3f7B6D75",
            participantName: "Team Alpha",
            amount: "5000000000000000000", // 5 ETH
            percentage: 5000, // 50%
            status: "COMPLETED",
            txHash: "0xabc123def456...",
            executedAt: new Date().toISOString(),
          },
          {
            position: 2,
            participantAddress: "0x8ba1f109551bD432803012645Hac136c",
            participantName: "Team Beta",
            amount: "3000000000000000000", // 3 ETH
            percentage: 3000, // 30%
            status: "COMPLETED",
            txHash: "0xdef456ghi789...",
            executedAt: new Date().toISOString(),
          },
          {
            position: 3,
            participantAddress: "0x9df8f0d7b847c8e6a5d2f3e1c4b5a6f7e8d9c0b1",
            participantName: "Team Gamma",
            amount: "2000000000000000000", // 2 ETH
            percentage: 2000, // 20%
            status: "COMPLETED",
            txHash: "0xghi789jkl012...",
            executedAt: new Date().toISOString(),
          },
        ],
        distributionProgress: {
          totalWinners: 3,
          distributedWinners: 3,
          pendingWinners: 0,
          failedWinners: 0,
          progressPercentage: 100,
        },
        transactionHistory: [
          {
            txHash: "0xabc123def456...",
            status: "COMPLETED",
            submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            confirmedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
            gasUsed: "150000",
            retryCount: 0,
          },
        ],
      });
    }, 1000);
  });
};

export function DistributionStatus({
  hackathonId,
  showDetailed = false,
  refreshInterval = 30000,
}: DistributionStatusProps) {
  const [distributionInfo, setDistributionInfo] =
    useState<DistributionStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load distribution status
  const loadDistributionStatus = useCallback(async () => {
    if (!isRefreshing) setIsLoading(true);

    try {
      const info = await getDistributionStatus(hackathonId);
      setDistributionInfo(info);
    } catch (error) {
      toast.error("Failed to Load Distribution Status", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hackathonId, isRefreshing]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDistributionStatus();
  };

  // Utility functions
  const formatEthAmount = (weiAmount: string): string => {
    const eth = parseFloat(weiAmount) / 1e18;
    return `${eth.toFixed(4)} ETH`;
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
      case "PENDING":
        return "secondary";
      case "FAILED":
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getDistributionStatusMessage = () => {
    if (!distributionInfo) return "";

    const { status, prizePool, distributionProgress } = distributionInfo;

    if (status === "COMPLETED" && prizePool?.isDistributed) {
      return "Prize distribution completed successfully";
    } else if (status === "COMPLETED" && prizePool?.isDeposited) {
      return "Hackathon completed, prize distribution in progress";
    } else if (status === "VOTING_CLOSED") {
      return "Voting ended, results being finalized";
    } else if (status === "VOTING_OPEN") {
      return "Voting in progress";
    } else if (prizePool?.isDeposited) {
      return "Prize pool deposited, awaiting hackathon completion";
    } else {
      return "Prize pool not yet deposited";
    }
  };

  // Load data on mount
  useEffect(() => {
    loadDistributionStatus();
  }, [loadDistributionStatus]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        setIsRefreshing(true);
        loadDistributionStatus();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadDistributionStatus, refreshInterval]);

  if (isLoading && !distributionInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Prize Distribution Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading distribution status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!distributionInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Prize Distribution Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Unable to load distribution status for this hackathon.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Prize Distribution Status
              </CardTitle>
              <CardDescription>
                {getDistributionStatusMessage()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(distributionInfo.status)}>
                {distributionInfo.status}
              </Badge>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="ghost"
                size="sm"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Prize Pool Information */}
          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 text-center border rounded-lg">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">
                {distributionInfo.prizePool
                  ? formatEthAmount(distributionInfo.prizePool.totalAmount)
                  : "Not Set"}
              </div>
              <div className="text-sm text-gray-500">Total Prize Pool</div>
            </div>

            <div className="p-4 text-center border rounded-lg">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">
                {distributionInfo.distributionProgress.totalWinners}
              </div>
              <div className="text-sm text-gray-500">Winners</div>
            </div>

            <div className="p-4 text-center border rounded-lg">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">
                {distributionInfo.distributionProgress.distributedWinners}
              </div>
              <div className="text-sm text-gray-500">Distributed</div>
            </div>

            <div className="p-4 text-center border rounded-lg">
              <Activity className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">
                {Math.round(
                  distributionInfo.distributionProgress.progressPercentage,
                )}
                %
              </div>
              <div className="text-sm text-gray-500">Progress</div>
            </div>
          </div>

          {/* Distribution Progress */}
          {distributionInfo.distributionProgress.totalWinners > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Distribution Progress
                </span>
                <span className="text-sm text-gray-500">
                  {distributionInfo.distributionProgress.distributedWinners} of{" "}
                  {distributionInfo.distributionProgress.totalWinners} completed
                </span>
              </div>
              <Progress
                value={distributionInfo.distributionProgress.progressPercentage}
              />

              {distributionInfo.distributionProgress.failedWinners > 0 && (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>
                    {distributionInfo.distributionProgress.failedWinners}{" "}
                    distribution(s) failed and may need manual intervention.
                  </AlertDescription>
                </Alert>
              )}

              {distributionInfo.distributionProgress.pendingWinners > 0 && (
                <Alert>
                  <Clock className="w-4 h-4" />
                  <AlertDescription>
                    {distributionInfo.distributionProgress.pendingWinners}{" "}
                    distribution(s) are currently pending confirmation.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Next Action */}
          {distributionInfo.nextAction && (
            <Alert className="mt-4">
              <ArrowRight className="w-4 h-4" />
              <AlertDescription>
                <div className="font-medium">
                  {distributionInfo.nextAction.action}
                </div>
                <div className="text-sm">
                  {distributionInfo.nextAction.description}
                </div>
                {distributionInfo.nextAction.estimatedTime && (
                  <div className="mt-1 text-xs text-gray-500">
                    Estimated time: {distributionInfo.nextAction.estimatedTime}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Winners List */}
      {distributionInfo.winners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Prize Winners
            </CardTitle>
            <CardDescription>
              Prize distribution details for each winner
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distributionInfo.winners.map((winner) => (
                <div key={winner.position} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 font-bold text-yellow-800 bg-yellow-100 rounded-full">
                        #{winner.position}
                      </div>
                      <div>
                        <div className="font-medium">
                          {winner.participantName ||
                            formatAddress(winner.participantAddress)}
                        </div>
                        <div className="font-mono text-sm text-gray-500">
                          {formatAddress(winner.participantAddress)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {formatEthAmount(winner.amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(winner.percentage / 100).toFixed(1)}% of prize pool
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(winner.status)}
                      <Badge variant={getStatusBadgeVariant(winner.status)}>
                        {winner.status}
                      </Badge>
                      {winner.error && (
                        <span className="text-sm text-red-600">
                          Error: {winner.error}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {winner.executedAt && (
                        <span className="text-sm text-gray-500">
                          {formatTimeAgo(winner.executedAt)}
                        </span>
                      )}
                      {winner.txHash && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Transaction Details</DialogTitle>
                              <DialogDescription>
                                Prize distribution transaction for position #
                                {winner.position}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                              <div>
                                <div className="font-medium">
                                  Transaction Hash
                                </div>
                                <div className="p-2 font-mono text-sm break-all bg-gray-100 rounded">
                                  {winner.txHash}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium">Amount</div>
                                <div>{formatEthAmount(winner.amount)}</div>
                              </div>
                              <div>
                                <div className="font-medium">Recipient</div>
                                <div className="font-mono text-sm">
                                  {winner.participantAddress}
                                </div>
                              </div>
                              {winner.executedAt && (
                                <div>
                                  <div className="font-medium">Executed At</div>
                                  <div>
                                    {new Date(
                                      winner.executedAt,
                                    ).toLocaleString()}
                                  </div>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                className="w-full"
                                asChild
                              >
                                <a
                                  href={`https://etherscan.io/tx/${winner.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View on Etherscan
                                </a>
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Information (Optional) */}
      {showDetailed && distributionInfo.transactionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              Blockchain transaction details for this distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Hash</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Confirmed</TableHead>
                  <TableHead>Gas Used</TableHead>
                  <TableHead>Retries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distributionInfo.transactionHistory.map((tx, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {formatAddress(tx.txHash)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(tx.status)}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatTimeAgo(tx.submittedAt)}</TableCell>
                    <TableCell>
                      {tx.confirmedAt ? formatTimeAgo(tx.confirmedAt) : "-"}
                    </TableCell>
                    <TableCell>
                      {tx.gasUsed ? parseInt(tx.gasUsed).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>
                      {tx.retryCount > 0 ? (
                        <Badge variant="secondary">{tx.retryCount}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
