// components/VerifiedBadge.tsx

import { BadgeCheck } from "lucide-react";

interface VerifiedBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

export default function VerifiedBadge({ size = "sm", className = "" }: VerifiedBadgeProps) {
  const isSmall = size === "sm";
  return (
    <span
      className={`inline-flex items-center gap-1 ${isSmall ? "text-[11px]" : "text-xs"} font-semibold text-gold ${className}`}
      title="Verified organizer"
    >
      <BadgeCheck className={isSmall ? "w-3.5 h-3.5" : "w-4 h-4"} />
      Verified
    </span>
  );
}