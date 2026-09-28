"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { AJO_CLUB_ADDRESS, AJO_CLUB_ABI, tokenDecimals } from "@/lib/contract";
import { sendPaymentReminder, scheduleReminder } from "@/lib/notifications";

export function usePaymentReminder(clubId: bigint) {
  const { address } = useAccount();
  const [notified, setNotified] = useState(false);

  const { data: club } = useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "getClub",
    args: [clubId],
  });

  const { data: paymentStatus } = useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "getMemberPaymentStatus",
    args: [clubId],
  });

  useEffect(() => {
    if (!address || !club || !paymentStatus || notified) return;

    // Destructure all 10 fields returned by getClub
    const [name, token, contribution, , , , , cycleEnd, status] = club;
    const [memberAddresses, paid] = paymentStatus;

    // Check if user is a member
    const memberIndex = memberAddresses.findIndex((addr: string) => addr.toLowerCase() === address.toLowerCase());
    if (memberIndex === -1) return;

    // Check if club is active (status 1 = ACTIVE)
    if (Number(status) !== 1) return;

    // Check if user hasn't paid this cycle
    if (paid[memberIndex]) return;

    const now = Math.floor(Date.now() / 1000);
    const cycleEndTime = Number(cycleEnd);
    const hoursUntilEnd = (cycleEndTime - now) / 3600;

    const decimals = tokenDecimals(token);
    const amount = (Number(contribution) / Math.pow(10, decimals)).toString();

    // If payment due within 48 hours
    if (hoursUntilEnd > 0 && hoursUntilEnd <= 48) {
      sendPaymentReminder(name, Math.ceil(hoursUntilEnd), amount, token);
      setNotified(true);
    }

    // Schedule reminder for 2 hours before cycle end
    scheduleReminder(cycleEndTime * 1000, name, amount, token);
  }, [address, club, paymentStatus, notified]);

  return { notified };
}
