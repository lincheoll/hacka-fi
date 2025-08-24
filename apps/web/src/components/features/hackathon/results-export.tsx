"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger
// } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  FileText,
  Table,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { exportResults } from "@/lib/api-functions";
import { toast } from "sonner";

interface ResultsExportProps {
  hackathonId: string;
  hackathonTitle: string;
  isCompleted?: boolean;
}

export function ResultsExport({
  hackathonId,
  hackathonTitle,
  isCompleted = false,
}: ResultsExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExport = async (format: "json" | "csv") => {
    if (!isCompleted) {
      toast.error(
        "Results can only be exported after the hackathon is completed",
      );
      return;
    }

    setIsExporting(true);
    setExportFormat(format);

    try {
      const result = await exportResults(hackathonId, format);

      if (format === "json") {
        // Create and download JSON file
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `hackathon-${hackathonId}-results.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("JSON results exported successfully!");
      } else {
        // Create and download CSV file
        const headers = result.headers || [];
        const rows = (result.data as Record<string, unknown>[]) || [];

        let csvContent = headers.join(",") + "\\n";
        rows.forEach((row: Record<string, unknown>) => {
          const values = headers.map((header) => {
            const value = row[header];
            // Escape commas and quotes in CSV values
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || "";
          });
          csvContent += values.join(",") + "\\n";
        });

        const csvBlob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(csvBlob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `hackathon-${hackathonId}-results.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("CSV results exported successfully!");
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export results. Please try again.");
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/hackathons/${hackathonId}/results`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Results link copied to clipboard!");

      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      toast.error("Failed to copy link");
    }
  };

  const handleShareResults = () => {
    const shareUrl = `${window.location.origin}/hackathons/${hackathonId}/results`;
    const shareText = `Check out the results for "${hackathonTitle}" hackathon!`;

    if (navigator.share) {
      navigator
        .share({
          title: `${hackathonTitle} Results`,
          text: shareText,
          url: shareUrl,
        })
        .catch(console.error);
    } else {
      // Fallback to copying the link
      handleCopyLink();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export & Share Results
        </CardTitle>
        <CardDescription>
          Download detailed results or share the results page with others
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isCompleted && (
          <Alert>
            <AlertDescription>
              Results can only be exported after the hackathon voting period
              ends and winners are determined.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Export Section */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-medium">
              <FileText className="w-4 h-4" />
              Download Data
            </h4>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="justify-start w-full"
                onClick={() => handleExport("json")}
                disabled={!isCompleted || isExporting}
              >
                {isExporting && exportFormat === "json" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Export as JSON
                <Badge variant="secondary" className="ml-auto">
                  Detailed
                </Badge>
              </Button>

              <Button
                variant="outline"
                className="justify-start w-full"
                onClick={() => handleExport("csv")}
                disabled={!isCompleted || isExporting}
              >
                {isExporting && exportFormat === "csv" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Table className="w-4 h-4 mr-2" />
                )}
                Export as CSV
                <Badge variant="secondary" className="ml-auto">
                  Summary
                </Badge>
              </Button>
            </div>

            <div className="space-y-1 text-xs text-gray-600">
              <p>
                <strong>JSON:</strong> Complete data with votes, comments, and
                metrics
              </p>
              <p>
                <strong>CSV:</strong> Participant results table for spreadsheet
                analysis
              </p>
            </div>
          </div>

          {/* Share Section */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-medium">
              <Share2 className="w-4 h-4" />
              Share Results
            </h4>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="justify-start w-full"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Copy Results Link
              </Button>

              <Button
                variant="outline"
                className="justify-start w-full"
                onClick={handleShareResults}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Results
              </Button>

              <Button
                variant="outline"
                className="justify-start w-full"
                asChild
              >
                <a
                  href={`/hackathons/${hackathonId}/results`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
            </div>

            <div className="text-xs text-gray-600">
              Share the results page publicly to showcase winners and rankings
            </div>
          </div>
        </div>

        {/* Export Information */}
        <div className="pt-4 mt-6 border-t">
          <h5 className="mb-2 text-sm font-medium">Export Information</h5>
          <div className="space-y-1 text-xs text-gray-600">
            <p>
              • Exported files include participant rankings, scores, and prize
              distribution
            </p>
            <p>
              • JSON format includes detailed voting data and judge comments
            </p>
            <p>• CSV format is optimized for spreadsheet analysis</p>
            <p>• All exports include hackathon metadata and timestamp</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
