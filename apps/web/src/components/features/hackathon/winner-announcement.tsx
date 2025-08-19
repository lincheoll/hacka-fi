"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Star,
  Share2,
  Twitter,
  Check,
  PartyPopper,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { WinnerResult } from "@/types/api";

interface WinnerAnnouncementProps {
  winners: WinnerResult[];
  hackathonTitle: string;
  hackathonId: string;
  totalPrizePool: string;
  currency?: string;
  showAnimation?: boolean;
  onAnimationComplete?: () => void;
}

export function WinnerAnnouncement({
  winners,
  hackathonTitle,
  hackathonId,
  totalPrizePool,
  currency = "KAIA",
  showAnimation = false,
  onAnimationComplete,
}: WinnerAnnouncementProps) {
  const [currentWinnerIndex, setCurrentWinnerIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatAmount = (amount: string | null | undefined) => {
    if (!amount || amount === "0") return "0";

    const num = parseFloat(amount);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toFixed(2);
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return "🏅";
    }
  };

  const getRankText = (rank: number) => {
    switch (rank) {
      case 1:
        return "CHAMPION";
      case 2:
        return "RUNNER-UP";
      case 3:
        return "THIRD PLACE";
      default:
        return `${rank}TH PLACE`;
    }
  };

  const sortedWinners = [...winners].sort((a, b) => a.rank - b.rank);

  useEffect(() => {
    if (showAnimation && sortedWinners.length > 0) {
      setShowConfetti(true);

      // Auto-advance through winners
      if (currentWinnerIndex < sortedWinners.length - 1) {
        const timer = setTimeout(() => {
          setCurrentWinnerIndex((prev) => prev + 1);
        }, 3000); // Show each winner for 3 seconds

        return () => clearTimeout(timer);
      } else if (onAnimationComplete) {
        // Animation complete
        const timer = setTimeout(onAnimationComplete, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [
    currentWinnerIndex,
    sortedWinners.length,
    showAnimation,
    onAnimationComplete,
  ]);

  const handleShareWinner = async (winner: WinnerResult) => {
    const shareText = `🎉 ${getRankEmoji(winner.rank)} ${getRankText(winner.rank)} winner announced for "${hackathonTitle}" hackathon! 
    
Winner: ${winner.walletAddress}
Score: ${winner.averageScore.toFixed(1)}/10
${winner.prizeAmount && winner.prizeAmount !== "0" ? `Prize: ${formatAmount(winner.prizeAmount)} ${currency}` : ""}

#hackathon #blockchain #web3`;

    const shareUrl = `${window.location.origin}/hackathons/${hackathonId}/results`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${hackathonTitle} Winner Announcement`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        setCopied(true);
        toast.success("Winner announcement copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Share failed:", error);
      toast.error("Failed to share winner announcement");
    }
  };

  const handleShareOnTwitter = (winner: WinnerResult) => {
    const tweetText = `🎉 ${getRankEmoji(winner.rank)} Winner announced for "${hackathonTitle}" hackathon!

🏆 ${getRankText(winner.rank)}: ${winner.walletAddress}
⭐ Score: ${winner.averageScore.toFixed(1)}/10
${winner.prizeAmount && winner.prizeAmount !== "0" ? `💰 Prize: ${formatAmount(winner.prizeAmount)} ${currency}` : ""}

#hackathon #blockchain #web3`;

    const shareUrl = `${window.location.origin}/hackathons/${hackathonId}/results`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;

    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  if (winners.length === 0) {
    return null;
  }

  if (showAnimation) {
    const currentWinner = sortedWinners[currentWinnerIndex];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWinner.participantId}
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: -50 }}
            transition={{
              type: "spring",
              damping: 15,
              stiffness: 300,
              duration: 0.8,
            }}
            className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center relative overflow-hidden"
          >
            {/* Confetti Animation */}
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      y: -20,
                      x: Math.random() * 300 - 150,
                      rotate: 0,
                      opacity: 1,
                    }}
                    animate={{
                      y: 400,
                      x: Math.random() * 300 - 150,
                      rotate: 360,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 3,
                      delay: Math.random() * 2,
                      repeat: Infinity,
                      repeatDelay: Math.random() * 3,
                    }}
                    className="absolute w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"
                  />
                ))}
              </div>
            )}

            <div className="relative z-10 space-y-6">
              {/* Rank Icon */}
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-8xl"
              >
                {getRankEmoji(currentWinner.rank)}
              </motion.div>

              {/* Winner Announcement */}
              <div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl font-bold text-gray-800 mb-2"
                >
                  {getRankText(currentWinner.rank)}
                </motion.h2>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="text-lg font-mono bg-gray-100 rounded-lg py-2 px-4"
                >
                  {currentWinner.walletAddress.slice(0, 8)}...
                  {currentWinner.walletAddress.slice(-6)}
                </motion.div>
              </div>

              {/* Score */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 }}
                className="flex items-center justify-center gap-2"
              >
                <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold">
                  {currentWinner.averageScore.toFixed(1)}/10
                </span>
              </motion.div>

              {/* Prize */}
              {currentWinner.prizeAmount &&
                currentWinner.prizeAmount !== "0" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.1 }}
                    className="text-xl font-bold text-green-600"
                  >
                    🏆 {formatAmount(currentWinner.prizeAmount)} {currency}
                  </motion.div>
                )}

              {/* Progress Indicator */}
              <div className="flex justify-center space-x-2">
                {sortedWinners.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index <= currentWinnerIndex
                        ? "bg-yellow-400"
                        : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Announcement Header */}
      <Card className="bg-gradient-to-r from-yellow-50 via-white to-amber-50 border-yellow-200">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-4xl mb-4">
            <PartyPopper />
            <Trophy className="h-10 w-10 text-yellow-600" />
            <PartyPopper />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent mb-2">
            Winners Announced!
          </h2>
          <p className="text-gray-600 text-lg">
            Congratulations to all participants in &quot;{hackathonTitle}&quot;
          </p>
          {totalPrizePool !== "0" && (
            <Badge variant="outline" className="mt-3 text-lg px-4 py-2">
              Total Prize Pool: {formatAmount(totalPrizePool)} {currency}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Individual Winner Cards */}
      <div className="space-y-4">
        {sortedWinners.map((winner, index) => (
          <motion.div
            key={winner.participantId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
          >
            <Card
              className={`${
                winner.rank === 1
                  ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300"
                  : winner.rank === 2
                    ? "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300"
                    : winner.rank === 3
                      ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300"
                      : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{getRankEmoji(winner.rank)}</div>
                    <div>
                      <div className="text-xl font-bold">
                        {getRankText(winner.rank)}
                      </div>
                      <div className="font-mono text-lg">
                        {winner.walletAddress.slice(0, 8)}...
                        {winner.walletAddress.slice(-6)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">
                          {winner.averageScore.toFixed(1)}/10
                        </span>
                        {winner.prizeAmount && winner.prizeAmount !== "0" && (
                          <>
                            <span className="text-gray-500">•</span>
                            <span className="font-semibold text-green-600">
                              {formatAmount(winner.prizeAmount)} {currency}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareWinner(winner)}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <Share2 className="h-4 w-4 mr-1" />
                      )}
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareOnTwitter(winner)}
                      className="text-blue-500 border-blue-200 hover:bg-blue-50"
                    >
                      <Twitter className="h-4 w-4 mr-1" />
                      Tweet
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
