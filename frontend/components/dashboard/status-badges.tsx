import { cn } from "@/lib/utils"
import type { BotStatus, ConnectionStatus } from "@/lib/types"

export function BotStatusBadge({ status, className }: { status: BotStatus; className?: string }) {
  const map: Record<BotStatus, { label: string; dot: string; text: string; ring: string }> = {
    RUNNING: {
      label: "RUNNING",
      dot: "bg-positive animate-pulse",
      text: "text-positive",
      ring: "border-positive/30 bg-positive/10",
    },
    PAUSED: {
      label: "PAUSED",
      dot: "bg-warning",
      text: "text-warning",
      ring: "border-warning/30 bg-warning/10",
    },
    STOPPED: {
      label: "STOPPED",
      dot: "bg-muted-foreground",
      text: "text-muted-foreground",
      ring: "border-border bg-muted/40",
    },
  }
  const s = map[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold tracking-wide",
        s.ring,
        s.text,
        className,
      )}
      role="status"
      aria-label={`Bot status: ${s.label}`}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </span>
  )
}

export function ConnectionBadge({
  status,
  className,
}: {
  status: ConnectionStatus
  className?: string
}) {
  const map: Record<ConnectionStatus, { label: string; dot: string; text: string }> = {
    LIVE: { label: "LIVE", dot: "bg-positive animate-pulse", text: "text-positive" },
    RECONNECTING: { label: "RECONNECTING", dot: "bg-warning animate-pulse", text: "text-warning" },
    DISCONNECTED: { label: "DISCONNECTED", dot: "bg-negative", text: "text-negative" },
  }
  const s = map[status]
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide", s.text, className)}
      role="status"
      aria-label={`Market data connection: ${s.label}`}
    >
      <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </span>
  )
}

export function PaperTradingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-bold tracking-widest text-warning uppercase",
        className,
      )}
      aria-label="This dashboard is in paper trading mode. No real funds are used."
    >
      Paper Trading
    </span>
  )
}
