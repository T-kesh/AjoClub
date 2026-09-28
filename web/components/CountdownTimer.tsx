"use client";
import { useEffect, useState } from "react";

function formatDuration(secs: number): string {
  if (secs <= 0) return "Ended";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function CountdownTimer({ cycleEnd }: { cycleEnd: bigint }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Number(cycleEnd) - Math.floor(Date.now() / 1000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(Math.max(0, Number(cycleEnd) - Math.floor(Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [cycleEnd]);

  return (
    <span className={remaining === 0 ? "text-red-500 font-bold" : "text-yellow-600 font-semibold"}>
      {formatDuration(remaining)}
    </span>
  );
}
