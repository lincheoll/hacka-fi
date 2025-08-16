"use client";

import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNetworkName, isSupportedChain } from "@/lib/web3";
import { useState } from "react";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [isOpen, setIsOpen] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <Card className="border-primary/20">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex flex-col">
                <span className="font-medium">{formatAddress(address)}</span>
                <span
                  className={`text-xs ${isSupportedChain(chainId) ? "text-green-600" : "text-red-600"}`}
                >
                  {getNetworkName(chainId)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          Disconnect
        </Button>
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
                  className="w-full justify-start"
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
