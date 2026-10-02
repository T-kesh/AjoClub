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
          className="btn-primary !px-4 !py-2.5 !text-sm !rounded-2xl flex items-center gap-2 shadow-sm"
        >
          <Avatar className="h-5 w-5 rounded-full" />
          <Name className="font-semibold text-white" />
        </ConnectWallet>
        <WalletDropdown className="bg-white dark:bg-[#0B2F28] border border-slate-200 dark:border-[#164738] shadow-2xl rounded-3xl p-3 z-50 min-w-[250px]">
          <Identity className="px-3 py-2 flex flex-col gap-1 border-b border-slate-100 dark:border-[#164738]" hasCopyAddressOnClick>
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700" />
              <div className="flex flex-col text-left">
                <Name className="font-bold text-sm text-[#0B3D2E] dark:text-white" />
                <Address className="text-xs text-slate-500 dark:text-slate-400 font-mono" />
              </div>
            </div>
            <EthBalance className="text-xs text-slate-600 dark:text-emerald-300 font-medium mt-1" />
          </Identity>
          <WalletDropdownBasename />
          <WalletDropdownLink
            icon="wallet"
            href="https://keys.coinbase.com"
          >
            Smart Wallet Portal
          </WalletDropdownLink>
          <WalletDropdownDisconnect className="hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold rounded-2xl text-sm" />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}

export default WalletConnect;
