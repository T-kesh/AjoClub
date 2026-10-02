"use client";

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink,
  WalletDropdownBasename,
} from "@coinbase/onchainkit/wallet";
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from "@coinbase/onchainkit/identity";

interface WalletConnectProps {
  className?: string;
}

export function WalletConnect({ className }: WalletConnectProps) {
  return (
    <div className={`flex items-center ${className ?? ""}`}>
      <Wallet>
        <ConnectWallet
          text="Connect Wallet"
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-xl px-3.5 py-2 transition-all shadow-sm flex items-center gap-2"
        >
          <Avatar className="h-5 w-5 rounded-full" />
          <Name className="font-semibold text-white" />
        </ConnectWallet>
        <WalletDropdown className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl rounded-2xl p-2 z-50 min-w-[240px]">
          <Identity className="px-3 py-2 flex flex-col gap-1 border-b border-gray-100 dark:border-gray-800" hasCopyAddressOnClick>
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7 rounded-full" />
              <div className="flex flex-col">
                <Name className="font-bold text-sm text-gray-900 dark:text-gray-100" />
                <Address className="text-xs text-gray-500 dark:text-gray-400 font-mono" />
              </div>
            </div>
            <EthBalance className="text-xs text-gray-600 dark:text-gray-300 mt-1" />
          </Identity>
          <WalletDropdownBasename />
          <WalletDropdownLink
            icon="wallet"
            href="https://keys.coinbase.com"
          >
            Smart Wallet Portal
          </WalletDropdownLink>
          <WalletDropdownDisconnect className="hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-medium rounded-xl text-sm" />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}
