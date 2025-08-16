"use client";

import { create } from "zustand";
import type { Address } from "viem";
import type { WalletInfo, TransactionStatus } from "@/types/web3";

interface Web3State {
  wallet: WalletInfo;
  isConnecting: boolean;
  transaction: TransactionStatus;
  setWallet: (wallet: WalletInfo) => void;
  setConnecting: (isConnecting: boolean) => void;
  setTransaction: (transaction: TransactionStatus) => void;
  disconnect: () => void;
}

export const useWeb3Store = create<Web3State>((set) => ({
  wallet: {
    address: "0x" as Address,
    isConnected: false,
    chainId: undefined,
  },
  isConnecting: false,
  transaction: {
    status: "idle",
  },

  setWallet: (wallet: WalletInfo) => {
    set({ wallet });
  },

  setConnecting: (isConnecting: boolean) => {
    set({ isConnecting });
  },

  setTransaction: (transaction: TransactionStatus) => {
    set({ transaction });
  },

  disconnect: () => {
    set({
      wallet: {
        address: "0x" as Address,
        isConnected: false,
        chainId: undefined,
      },
      isConnecting: false,
      transaction: { status: "idle" },
    });
  },
}));
