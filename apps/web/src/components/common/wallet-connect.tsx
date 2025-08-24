"use client";

import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNetworkName, isSupportedChain } from "@/lib/web3";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Check, User } from "lucide-react";

export function WalletConnect() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until client-side hydration is complete
  if (!mounted) {
    return (
      <Button variant="outline" disabled>
        Connect Wallet
      </Button>
    );
  }

  return <WalletConnectInner isOpen={isOpen} setIsOpen={setIsOpen} />;
}

function WalletConnectInner({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const {
    isAuthenticated,
    isLoading,
    authenticate,
    logout,
    needsAuthentication,
  } = useAuth();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <Card className="border-primary/20">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 text-sm">
              {isAuthenticated ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <User className="w-4 h-4 text-gray-500" />
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{formatAddress(address)}</span>
                  {isAuthenticated && (
                    <span className="text-xs font-medium text-green-600">
                      Authenticated
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs ${isSupportedChain(chainId) ? "text-green-600" : "text-red-600"}`}
                >
                  {getNetworkName(chainId)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {needsAuthentication ? (
          <Button
            variant="default"
            size="sm"
            onClick={authenticate}
            disabled={isLoading}
          >
            {isLoading ? "Signing..." : "Sign In"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logout();
              disconnect();
            }}
          >
            Logout
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button onClick={() => setIsOpen(!isOpen)} disabled={isPending}>
        {isPending ? "Connecting..." : "Connect Wallet"}
      </Button>

      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 min-w-[200px] z-50">
          <CardHeader>
            <CardTitle className="text-sm">Connect Wallet</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="space-y-2">
              {connectors.map((connector) => (
                <Button
                  key={connector.uid}
                  variant="ghost"
                  size="sm"
                  className="justify-start w-full"
                  onClick={() => {
                    connect({ connector });
                    setIsOpen(false);
                  }}
                  disabled={isPending}
                >
                  {connector.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
