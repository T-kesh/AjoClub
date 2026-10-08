export const PRESET_CLUB_ICONS = [
  { emoji: "🫙", label: "Jar (Ajo)" },
  { emoji: "🌱", label: "Seedling (Growth)" },
  { emoji: "💎", label: "Diamond (Wealth)" },
  { emoji: "🚀", label: "Rocket (Speed)" },
  { emoji: "💰", label: "Money Bag" },
  { emoji: "🛡️", label: "Shield (Security)" },
  { emoji: "⚡", label: "Lightning (Power)" },
  { emoji: "🤝", label: "Handshake (Trust)" },
  { emoji: "🎯", label: "Target (Goal)" },
  { emoji: "🌴", label: "Palm (Diaspora)" },
  { emoji: "🦁", label: "Lion (Courage)" },
  { emoji: "🔥", label: "Fire (Streak)" },
  { emoji: "👑", label: "Crown (Premier)" },
  { emoji: "🌟", label: "Star (Excellence)" },
  { emoji: "🌍", label: "Globe (Global)" },
  { emoji: "🍀", label: "Clover (Luck)" },
] as const;

export const DEFAULT_FALLBACK_ICONS = ["🫙", "🌱", "💎", "💰", "⚡", "🤝", "🎯", "🌴"] as const;

/**
 * Extracts a leading emoji icon from a circle name if present,
 * or derives a consistent fallback icon based on clubId.
 */
export function parseClubName(rawName: string | undefined, clubId?: bigint | number) {
  if (!rawName) {
    const idx = clubId !== undefined ? Math.abs(Number(clubId)) % DEFAULT_FALLBACK_ICONS.length : 0;
    return { icon: DEFAULT_FALLBACK_ICONS[idx], cleanName: "Unnamed Circle" };
  }

  // Matches leading emoji / pictograph characters (including compound emojis)
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])\s*/u;
  const match = rawName.match(emojiRegex);

  if (match) {
    return {
      icon: match[1],
      cleanName: rawName.replace(emojiRegex, "").trim(),
    };
  }

  const idx = clubId !== undefined ? Math.abs(Number(clubId)) % DEFAULT_FALLBACK_ICONS.length : 0;
  return {
    icon: DEFAULT_FALLBACK_ICONS[idx],
    cleanName: rawName,
  };
}
