"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { Timeframe } from "@/lib/types"
import { getSymbolMeta } from "@/lib/mock-data"
import { useBotStore } from "./bot-store"
import { PriceChart } from "./price-chart"

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m"]

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {swatch}
      {label}
    </span>
  )
}

export function ChartPanel() {
  const { symbol, timeframe, candles, currentPrice, gridLevels, trades, loading, dispatch } = useBotStore()
  const meta = getSymbolMeta(symbol)

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card" aria-label="Trading chart">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-sm font-semibold tracking-wide">{symbol.replace("/", " / ")}</h2>
          <div className="hidden items-center gap-3 md:flex">
            <LegendItem swatch={<span className="text-positive">▲</span>} label="Buy fill" />
            <LegendItem swatch={<span className="text-negative">▼</span>} label="Sell fill" />
            <LegendItem
              swatch={<span className="inline-block h-0 w-4 border-t border-dotted border-positive" />}
              label="Grid"
            />
            <LegendItem
              swatch={<span className="inline-block h-0 w-4 border-t border-dashed border-warning" />}
              label="Bounds"
            />
          </div>
        </div>

        <div
          className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5"
          role="group"
          aria-label="Timeframe"
        >
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => dispatch({ type: "SET_TIMEFRAME", timeframe: tf })}
              aria-pressed={timeframe === tf}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                timeframe === tf
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-2">
        {loading ? (
          <div className="flex h-full flex-col gap-2 p-2">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <PriceChart
            candles={candles}
            currentPrice={currentPrice}
            precision={meta.pricePrecision}
            symbol={symbol}
            timeframe={timeframe}
            gridLevels={gridLevels}
            trades={trades}
          />
        )}
      </div>
    </section>
  )
}
