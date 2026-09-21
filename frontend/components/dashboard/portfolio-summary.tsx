"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatSignedPercent, formatSignedUsd, formatUsd, signClass } from "@/lib/format"
import { useBotStore } from "./bot-store"

export function PortfolioSummary() {
  const { portfolio, loading } = useBotStore()

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label="Portfolio summary">
      <h2 className="mb-3 text-sm font-semibold">Portfolio</h2>

      <div className="mb-3">
        <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Portfolio Value</span>
        {loading ? (
          <Skeleton className="mt-1 h-8 w-40" />
        ) : (
          <div className="font-mono text-2xl font-bold tabular-nums">{formatUsd(portfolio.portfolioValue)}</div>
        )}
      </div>

      <div className="mb-4">
        <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Total PnL</span>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-32" />
        ) : (
          <div className={cn("flex items-baseline gap-2 font-mono font-semibold tabular-nums", signClass(portfolio.totalPnl))}>
            <span className="text-xl">{formatSignedUsd(portfolio.totalPnl)}</span>
            <span className="text-sm">{formatSignedPercent(portfolio.returnPct)}</span>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Metric label="Realized PnL" value={portfolio.realizedPnl} loading={loading} />
        <Metric label="Unrealized PnL" value={portfolio.unrealizedPnl} loading={loading} />
      </dl>
    </section>
  )
}

function Metric({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2.5">
      <dt className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</dt>
      {loading ? (
        <Skeleton className="mt-1 h-5 w-20" />
      ) : (
        <dd className={cn("font-mono text-sm font-semibold tabular-nums", signClass(value))}>
          {formatSignedUsd(value)}
        </dd>
      )}
    </div>
  )
}
