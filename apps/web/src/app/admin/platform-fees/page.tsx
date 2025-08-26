"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  History,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

interface PlatformFeeInfo {
  currentFeeRate: number;
  feeRecipient: string;
  lastUpdated?: string;
}

interface PlatformFeeHistoryItem {
  id: number;
  oldFeeRate: number;
  newFeeRate: number;
  changedBy: string;
  reason?: string;
  createdAt: string;
}

interface FeeCollectionItem {
  id: number;
  hackathonId: string;
  prizePoolId: number;
  feeAmount: string;
  feeAmountFormatted: string;
  feeRate: number;
  tokenAddress?: string;
  recipientAddress: string;
  txHash: string;
  blockNumber?: number;
  status: string;
  collectedAt: string;
  confirmedAt?: string;
}

export default function PlatformFeesAdminPage() {
  const { address: walletAddress, isConnected } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // Form states
  const [newFeeRate, setNewFeeRate] = useState<string>("");
  const [feeRateReason, setFeeRateReason] = useState<string>("");
  const [newRecipient, setNewRecipient] = useState<string>("");
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [isUpdatingRecipient, setIsUpdatingRecipient] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch platform fee info
  const { data: feeInfo, isLoading: isLoadingFeeInfo } = useQuery({
    queryKey: ["platformFeeInfo"],
    queryFn: () => apiClient.platformFee.getFeeInfo(),
    enabled: mounted,
  });

  // Fetch fee history
  const { data: feeHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["platformFeeHistory"],
    queryFn: () => apiClient.platformFee.getFeeHistory(100),
    enabled: mounted && isConnected,
  });

  // Fetch fee collections
  const { data: feeCollections, isLoading: isLoadingCollections } = useQuery({
    queryKey: ["platformFeeCollections"],
    queryFn: () => apiClient.platformFee.getFeeCollections(undefined, 100),
    enabled: mounted && isConnected,
  });

  // Mutations
  const updateFeeRateMutation = useMutation({
    mutationFn: (data: { feeRate: number; reason?: string }) =>
      apiClient.platformFee.setPlatformFeeRate(data),
    onSuccess: (data) => {
      toast({
        title: "Fee Rate Updated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["platformFeeInfo"] });
      queryClient.invalidateQueries({ queryKey: ["platformFeeHistory"] });
      setNewFeeRate("");
      setFeeRateReason("");
      setIsUpdatingRate(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update fee rate",
        variant: "destructive",
      });
      setIsUpdatingRate(false);
    },
  });

  const updateRecipientMutation = useMutation({
    mutationFn: (data: { recipient: string }) =>
      apiClient.platformFee.setPlatformFeeRecipient(data),
    onSuccess: (data) => {
      toast({
        title: "Recipient Updated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["platformFeeInfo"] });
      queryClient.invalidateQueries({ queryKey: ["platformFeeHistory"] });
      setNewRecipient("");
      setIsUpdatingRecipient(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update fee recipient",
        variant: "destructive",
      });
      setIsUpdatingRecipient(false);
    },
  });

  const handleUpdateFeeRate = async () => {
    const rate = parseFloat(newFeeRate);
    if (isNaN(rate) || rate < 0 || rate > 50) {
      toast({
        title: "Invalid Fee Rate",
        description: "Fee rate must be between 0 and 50%",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingRate(true);
    updateFeeRateMutation.mutate({
      feeRate: Math.round(rate * 100), // Convert to basis points
      reason: feeRateReason || undefined,
    });
  };

  const handleUpdateRecipient = async () => {
    if (!newRecipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid wallet address",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingRecipient(true);
    updateRecipientMutation.mutate({ recipient: newRecipient });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const formatFeeRate = (basisPoints: number) => {
    return `${(basisPoints / 100).toFixed(2)}%`;
  };

  const formatTokenAmount = (amount: string) => {
    const value = parseFloat(amount) / Math.pow(10, 18);
    return `${value.toFixed(4)} KAIA`;
  };

  const shortAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!mounted) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="w-1/2 h-8 bg-gray-200 rounded"></div>
        <div className="w-1/4 h-4 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Alert className="border-yellow-500 bg-yellow-50">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription className="text-yellow-700">
          Please connect your wallet to access the admin dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Platform Fee Management
        </h1>
        <p className="text-gray-600">
          Configure platform fees and monitor fee collections across all
          hackathons
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Collections
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Current Fee Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Current Fee Rate
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingFeeInfo
                    ? "..."
                    : formatFeeRate(feeInfo?.currentFeeRate || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied to new hackathons
                </p>
              </CardContent>
            </Card>

            {/* Fee Recipient */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Fee Recipient
                </CardTitle>
                <Settings className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingFeeInfo
                    ? "..."
                    : shortAddress(feeInfo?.feeRecipient || "")}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current fee recipient address
                </p>
              </CardContent>
            </Card>

            {/* Total Collections */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Total Collections
                </CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingCollections
                    ? "..."
                    : feeCollections
                        ?.reduce(
                          (sum, item) => sum + parseFloat(item.feeAmount),
                          0,
                        )
                        .toFixed(4) || "0"}{" "}
                  KAIA
                </div>
                <p className="text-xs text-muted-foreground">
                  From {feeCollections?.length || 0} hackathons
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest fee collections and rate changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCollections || isLoadingHistory ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-4 bg-gray-200 rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Recent collections */}
                  {feeCollections?.slice(0, 3).map((collection) => (
                    <div
                      key={collection.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <div className="font-medium">
                          Hackathon #{collection.hackathonId}
                        </div>
                        <div className="text-sm text-gray-500">
                          Collected{" "}
                          {collection.feeAmountFormatted ||
                            formatTokenAmount(collection.feeAmount)}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-600"
                      >
                        {collection.status || "Collected"}
                      </Badge>
                    </div>
                  ))}

                  {/* Recent rate changes */}
                  {feeHistory?.slice(0, 2).map((change) => (
                    <div
                      key={change.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <div className="font-medium">
                          Rate changed from {formatFeeRate(change.oldFeeRate)}{" "}
                          to {formatFeeRate(change.newFeeRate)}
                        </div>
                        <div className="text-sm text-gray-500">
                          By {shortAddress(change.changedBy)}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-blue-600 border-blue-600"
                      >
                        Rate Change
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Update Fee Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Update Fee Rate</CardTitle>
                <CardDescription>
                  Change the platform fee rate for new hackathons (0-50%)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="feeRate">Fee Rate (%)</Label>
                  <Input
                    id="feeRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="50"
                    value={newFeeRate}
                    onChange={(e) => setNewFeeRate(e.target.value)}
                    placeholder={
                      feeInfo ? formatFeeRate(feeInfo.currentFeeRate) : "2.5"
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    value={feeRateReason}
                    onChange={(e) => setFeeRateReason(e.target.value)}
                    placeholder="Reason for changing the fee rate..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleUpdateFeeRate}
                  disabled={!newFeeRate || isUpdatingRate}
                  className="w-full"
                >
                  {isUpdatingRate ? "Updating..." : "Update Fee Rate"}
                </Button>
              </CardContent>
            </Card>

            {/* Update Fee Recipient */}
            <Card>
              <CardHeader>
                <CardTitle>Update Fee Recipient</CardTitle>
                <CardDescription>
                  Change the wallet address that receives platform fees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="recipient">Recipient Address</Label>
                  <Input
                    id="recipient"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    placeholder={feeInfo?.feeRecipient || "0x..."}
                  />
                </div>
                {feeInfo && (
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-sm font-medium">
                      Current Recipient:
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {feeInfo.feeRecipient}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(feeInfo.feeRecipient)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleUpdateRecipient}
                  disabled={!newRecipient || isUpdatingRecipient}
                  className="w-full"
                >
                  {isUpdatingRecipient ? "Updating..." : "Update Recipient"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Fee Rate Change History</CardTitle>
              <CardDescription>
                Complete history of platform fee rate changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-gray-200 rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : feeHistory && feeHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Old Rate</TableHead>
                      <TableHead>New Rate</TableHead>
                      <TableHead>Updated By</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeHistory.map((change) => (
                      <TableRow key={change.id}>
                        <TableCell>
                          {new Date(change.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {formatFeeRate(change.oldFeeRate)}
                        </TableCell>
                        <TableCell>
                          {formatFeeRate(change.newFeeRate)}
                        </TableCell>
                        <TableCell>{shortAddress(change.changedBy)}</TableCell>
                        <TableCell>{change.reason || "—"}</TableCell>
                        <TableCell>
                          <div className="text-gray-500 text-sm">
                            From blockchain
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No fee rate changes recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections">
          <Card>
            <CardHeader>
              <CardTitle>Fee Collection Records</CardTitle>
              <CardDescription>
                Platform fees collected from completed hackathons
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCollections ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-gray-200 rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : feeCollections && feeCollections.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Hackathon</TableHead>
                      <TableHead>Prize Pool</TableHead>
                      <TableHead>Fee Rate</TableHead>
                      <TableHead>Fee Collected</TableHead>
                      <TableHead>Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeCollections.map((collection) => (
                      <TableRow key={collection.id}>
                        <TableCell>
                          {new Date(
                            collection.collectedAt,
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          Hackathon #{collection.hackathonId}
                        </TableCell>
                        <TableCell>N/A</TableCell>
                        <TableCell>
                          {formatFeeRate(collection.feeRate)}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {collection.feeAmountFormatted ||
                            formatTokenAmount(collection.feeAmount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {shortAddress(collection.txHash)}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(collection.txHash)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No fee collections recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
