"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { formatEther } from "viem";

interface WalletConnectProps {
  className?: string;
}

export function WalletConnect({ className }: WalletConnectProps) {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connectors, connect, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const { data: balanceData } = useBalance({
    address: address,
    chainId: baseSepolia.id,
    query: { enabled: !!address },
  });

  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectingConnectorId, setConnectingConnectorId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close modal when successfully connected
  useEffect(() => {
    if (isConnected) {
      setModalOpen(false);
      setConnectingConnectorId(null);
    }
  }, [isConnected]);

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  type WalletConnector = (typeof connectors)[number];

  function handleConnect(connectorId: string) {
    setConnectingConnectorId(connectorId);
    const targetConnector =
      connectors.find((c: WalletConnector) => c.id === connectorId) ||
      connectors.find((c: WalletConnector) => c.id.toLowerCase().includes(connectorId.toLowerCase()));

    if (targetConnector) {
      connect({ connector: targetConnector });
    }
  }

  // Identify connectors
  const metaMaskConnector =
    connectors.find((c: WalletConnector) => c.id === "metaMask") ||
    connectors.find((c: WalletConnector) => c.id === "metaMaskSDK") ||
    connectors.find((c: WalletConnector) => c.id === "injected");

  const baseConnector =
    connectors.find((c: WalletConnector) => c.id === "coinbaseWalletSDK") ||
    connectors.find((c: WalletConnector) => c.id.toLowerCase().includes("coinbase"));

  const isMetaMaskAvailable =
    typeof window !== "undefined" && Boolean((window as unknown as { ethereum?: { isMetaMask?: boolean } }).ethereum?.isMetaMask);

  const isWrongChain = isConnected && chainId !== baseSepolia.id;

  const formattedBalance = balanceData
    ? `${parseFloat(formatEther(balanceData.value)).toFixed(3)} ${balanceData.symbol}`
    : null;

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* ── NOT CONNECTED: Open Wallet Modal Button ── */}
      {!isConnected ? (
        <>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary !px-4 !py-2.5 !text-sm !rounded-2xl flex items-center gap-2 shadow-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <WalletIcon className="w-4 h-4" />
            <span>Connect Wallet</span>
          </button>

          {/* Modal Overlay via Portal */}
          {modalOpen &&
            mounted &&
            createPortal(
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={() => setModalOpen(false)}
              >
                <div
                  className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0B2F28] border border-slate-200 dark:border-[#164738] p-6 shadow-2xl transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#164738]">
                    <div>
                      <h2 className="text-lg font-bold text-[#0B3D2E] dark:text-white">
                        Connect a Wallet
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Select your preferred wallet for Base Sepolia
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-emerald-950/60 transition-colors"
                    >
                      <CloseIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Wallet Options */}
                  <div className="flex flex-col gap-3 mt-5">
                    {/* MetaMask Option */}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleConnect(metaMaskConnector?.id ?? "metaMask")}
                      className="group flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-[#164738] bg-slate-50/70 dark:bg-[#08221D] hover:bg-orange-50/60 dark:hover:bg-[#0D382E] hover:border-orange-200 dark:hover:border-emerald-600/50 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/50 flex items-center justify-center flex-shrink-0">
                          <MetaMaskFoxIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#0B3D2E] dark:text-white">
                              MetaMask
                            </span>
                            {isMetaMaskAvailable && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                Detected
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Browser extension or mobile
                          </span>
                        </div>
                      </div>
                      {isPending && connectingConnectorId === metaMaskConnector?.id ? (
                        <Spinner className="w-5 h-5 text-orange-500" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      )}
                    </button>

                    {/* Base / Coinbase Option */}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleConnect(baseConnector?.id ?? "coinbaseWalletSDK")}
                      className="group flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-[#164738] bg-slate-50/70 dark:bg-[#08221D] hover:bg-blue-50/60 dark:hover:bg-[#0D382E] hover:border-blue-200 dark:hover:border-emerald-600/50 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center flex-shrink-0">
                          <BaseLogoIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#0B3D2E] dark:text-white">
                              Base / Coinbase
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                              Base Native
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Smart Wallet or browser extension
                          </span>
                        </div>
                      </div>
                      {isPending && connectingConnectorId === baseConnector?.id ? (
                        <Spinner className="w-5 h-5 text-blue-500" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      )}
                    </button>
                  </div>

                  {/* Error Banner if any */}
                  {connectError && (
                    <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300">
                      {connectError.message.includes("User rejected")
                        ? "Connection request was cancelled."
                        : connectError.message.slice(0, 100)}
                    </div>
                  )}

                  {/* Footer Note */}
                  <p className="mt-5 text-center text-[11px] text-slate-400 dark:text-slate-500">
                    By connecting, you agree to interact with the AjoClub smart contracts on Base Sepolia.
                  </p>
                </div>
              </div>,
              document.body
            )}
        </>
      ) : isWrongChain ? (
        /* ── WRONG CHAIN BUTTON ── */
        <button
          type="button"
          disabled={isSwitching}
          onClick={() => switchChain({ chainId: baseSepolia.id })}
          className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <WarningIcon className="w-4 h-4" />
          <span>{isSwitching ? "Switching..." : "Switch to Base Sepolia"}</span>
        </button>
      ) : (
        /* ── CONNECTED: Account Button & Dropdown ── */
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-[#164738] bg-white dark:bg-[#0B2F28] hover:border-emerald-400 dark:hover:border-emerald-500 transition-all shadow-sm"
          >
            {/* Status dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>

            {/* Address */}
            <span className="font-mono text-xs sm:text-sm font-semibold text-[#0B3D2E] dark:text-white">
              {shortAddress}
            </span>

            {/* Balance Badge */}
            {formattedBalance && (
              <span className="hidden sm:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#071F17] text-slate-600 dark:text-emerald-300">
                {formattedBalance}
              </span>
            )}

            <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Account Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-3xl bg-white dark:bg-[#0B2F28] border border-slate-200 dark:border-[#164738] shadow-2xl p-3 z-50 animate-fade-in">
              {/* Account Info Card */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#08221D] border border-slate-100 dark:border-[#164738] mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Connected Wallet
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    Base Sepolia
                  </span>
                </div>
                <div className="mt-2 font-mono text-xs text-slate-700 dark:text-slate-200 break-all select-all">
                  {address}
                </div>
                {activeConnector && (
                  <div className="mt-1 text-[11px] text-slate-400">
                    via {activeConnector.name}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1">
                {/* Copy Address */}
                <button
                  type="button"
                  onClick={copyAddress}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0D382E] transition-colors w-full text-left"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied to clipboard!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-4 h-4 text-slate-400" />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>

                {/* View on Basescan */}
                <a
                  href={`https://sepolia.basescan.org/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0D382E] transition-colors"
                >
                  <ExternalLinkIcon className="w-4 h-4 text-slate-400" />
                  <span>View on Basescan</span>
                </a>

                <div className="my-1 border-t border-slate-100 dark:border-[#164738]" />

                {/* Disconnect */}
                <button
                  type="button"
                  onClick={() => {
                    disconnect();
                    setDropdownOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors w-full text-left"
                >
                  <DisconnectIcon className="w-4 h-4 text-red-500" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WalletConnect;

// ── Icons ────────────────────────────────────────────────────────────────────

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function MetaMaskFoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 318.6 318.6" fill="none">
      <polygon fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round" points="274.1 35.5 174.6 109.4 193 65.8" />
      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="44.4 35.5 143.1 110.1 125.6 65.8" />
      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="238.3 206.8 211.8 247.4 268.5 263 284.8 207.7" />
      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="33.9 207.7 50.1 263 106.8 247.4 80.3 206.8" />
      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="103.6 138.2 87.8 162.1 144.1 164.6 142.1 104.1" />
      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="214.9 138.2 175.9 103.4 174.6 164.6 230.8 162.1" />
      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="106.8 247.4 140.6 230.9 111.4 208.1" />
      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="177.9 230.9 211.8 247.4 207.1 208.1" />
      <polygon fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" points="211.8 247.4 177.9 230.9 180.6 253 180.3 262.3" />
      <polygon fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" points="106.8 247.4 138.3 262.3 138.1 253 140.6 230.9" />
      <polygon fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" points="138.8 193.5 110.6 185.2 130.5 176.1" />
      <polygon fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" points="179.7 193.5 188 176.1 208 185.2" />
      <polygon fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" points="106.8 247.4 111.6 206.8 80.3 207.7" />
      <polygon fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" points="207 206.8 211.8 247.4 238.3 207.7" />
      <polygon fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" points="230.8 162.1 174.6 164.6 179.8 193.5 188.1 176.1 208.1 185.2" />
      <polygon fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" points="110.6 185.2 130.6 176.1 138.8 193.5 144.1 164.6 87.8 162.1" />
      <polygon fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" points="87.8 162.1 111.4 208.1 110.6 185.2" />
      <polygon fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" points="208.1 185.2 207.1 208.1 230.8 162.1" />
      <polygon fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" points="144.1 164.6 138.8 193.5 145.4 227.6 146.9 182.7" />
      <polygon fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" points="174.6 164.6 171.9 182.6 173.1 227.6 179.8 193.5" />
      <polygon fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" points="179.8 193.5 173.1 227.6 177.9 230.9 207.1 208.1 208.1 185.2" />
      <polygon fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" points="110.6 185.2 111.4 208.1 140.6 230.9 145.4 227.6 138.8 193.5" />
      <polygon fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round" points="180.3 262.3 180.6 253 178.1 250.8 140.4 250.8 138.1 253 138.3 262.3 106.8 247.4 117.8 256.4 140.1 271.9 178.4 271.9 200.8 256.4 211.8 247.4" />
      <polygon fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round" points="177.9 230.9 173.1 227.6 145.4 227.6 140.6 230.9 138.1 253 140.4 250.8 178.1 250.8 180.6 253" />
      <polygon fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round" points="278.3 114.2 286.8 73.4 274.1 35.5 177.9 106.9 214.9 138.2 267.2 153.5 278.8 140 274.1 136.4 279.7 131.5 273.7 126.9 279.7 122.2" />
      <polygon fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round" points="31.8 73.4 40.3 114.2 38.9 122.2 44.9 126.9 38.9 131.5 44.5 136.4 39.8 140 51.3 153.5 103.6 138.2 140.6 106.9 44.4 35.5" />
      <polygon fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" points="267.2 153.5 214.9 138.2 230.8 162.1 207.1 208.1 238.3 207.7 284.8 207.7" />
      <polygon fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" points="103.6 138.2 51.3 153.5 33.9 207.7 80.3 207.7 111.4 208.1 87.8 162.1" />
      <polygon fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" points="174.6 164.6 177.9 106.9 193 65.8 274.1 35.5 230.8 162.1" />
      <polygon fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" points="140.6 106.9 144.1 164.6 87.8 162.1 44.4 35.5 125.6 65.8" />
    </svg>
  );
}

function BaseLogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 115 115" fill="none">
      <circle cx="57.5" cy="57.5" r="57.5" fill="#0052FF" />
      <path
        d="M57.5 95C78.2107 95 95 78.2107 95 57.5C95 36.7893 78.2107 20 57.5 20C37.3821 20 20.9419 35.8456 20.0381 55.7327H68.8093V59.2673H20.0381C20.9419 79.1544 37.3821 95 57.5 95Z"
        fill="white"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function DisconnectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ""}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
