"use client"

import { cn } from "@/lib/utils"
import { formatPrice, formatQty } from "@/lib/format"
import { getSymbolMeta, gridInterval } from "@/lib/mock-data"
import { useBotStore } from "./bot-store"

export function PaperAccount() {
  const { symbol, balance, config, currentPrice, gridLevels } = useBotStore()
  const meta = getSymbolMeta(symbol)
  const interval = gridInterval(config)

  const range = config.upperPrice - config.lowerPrice
  const clamped = Math.min(config.upperPrice, Math.max(config.lowerPrice, currentPrice))
  const pricePct = range > 0 ? ((clamped - config.lowerPrice) / range) * 100 : 50
  const inRange = currentPrice >= config.lowerPrice && currentPrice <= config.upperPrice

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label="Paper account and grid range">
      <h2 className="mb-3 text-sm font-semibold">Paper Account</h2>

      <dl className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border bg-muted/30 p-2.5">
          <dt className="text-[10px] tracking-wider text-muted-foreground uppercase">{meta.quote} Balance</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums">{formatPrice(balance.quote, 2)}</dd>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-2.5">
          <dt className="text-[10px] tracking-wider text-muted-foreground uppercase">{meta.base} Balance</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums">{formatQty(balance.base, meta.qtyPrecision)}</dd>
        </div>
      </dl>

      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Grid Range</span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
            inRange ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative",
          )}
        >
          {inRange ? "IN RANGE" : "OUT OF RANGE"}
        </span>
      </div>

      <div className="relative mt-3 mb-2 h-2 rounded-full bg-muted" role="img" aria-label="Current price position within the grid range">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-positive/25 via-primary/15 to-negative/25" />
        {gridLevels.map((l) => {
          const pct = range > 0 ? ((l.price - config.lowerPrice) / range) * 100 : 0
          return (
            <span
              key={l.index}
              className={cn(
                "absolute top-1/2 h-2.5 w-px -translate-y-1/2",
                l.state === "OPEN" ? "bg-positive" : "bg-border",
              )}
              style={{ left: `${pct}%` }}
              aria-hidden
            />
          )
        })}
        <span
          className="absolute top-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow"
          style={{ left: `${pricePct}%` }}
          aria-hidden
        />
      </div>

      <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
        <span>{formatPrice(config.lowerPrice, meta.pricePrecision)}</span>
        <span className="text-foreground">{formatPrice(currentPrice, meta.pricePrecision)}</span>
        <span>{formatPrice(config.upperPrice, meta.pricePrecision)}</span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs">
        <Row label="Grid Count" value={String(config.gridCount)} />
        <Row label="Interval" value={formatPrice(interval, meta.pricePrecision)} />
        <Row label="Order Size" value={`${formatPrice(config.orderAmount, 2)} ${meta.quote}`} />
        <Row label="Fee Rate" value={`${(config.feeRate * 100).toFixed(3)}%`} />
      </dl>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium tabular-nums">{value}</dd>
    </div>
  )
}
