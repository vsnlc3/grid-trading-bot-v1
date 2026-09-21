"use client"

import { Lock } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SYMBOLS, getSymbolMeta } from "@/lib/mock-data"
import type { SymbolId } from "@/lib/types"
import { useBotStore } from "./bot-store"
import { CurrentPrice } from "./current-price"
import { BotStatusBadge, ConnectionBadge, PaperTradingBadge } from "./status-badges"

function displaySymbol(id: string) {
  return id.replace("/", " / ")
}

export function DashboardHeader() {
  const { symbol, currentPrice, priceDir, botStatus, connection, symbolChangeable, loading, dispatch } =
    useBotStore()
  const meta = getSymbolMeta(symbol)

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border bg-card/40 px-4 py-3 md:px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-primary/15 font-mono text-sm font-bold text-primary">
            G
          </div>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-semibold">Grid Bot</span>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase">Dashboard</span>
          </div>
        </div>

        <div className="h-8 w-px bg-border" aria-hidden />

        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Symbol</span>
            <Select
              value={symbol}
              onValueChange={(v) => dispatch({ type: "SET_SYMBOL", symbol: v as SymbolId })}
              disabled={!symbolChangeable}
            >
              <SelectTrigger className="h-9 min-w-[150px] font-semibold" aria-label="Select trading symbol">
                {symbolChangeable ? null : <Lock className="size-3 text-muted-foreground" aria-hidden />}
                <SelectValue>{(v: string) => displaySymbol(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SYMBOLS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {displaySymbol(s.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Current Price</span>
            {loading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <CurrentPrice price={currentPrice} precision={meta.pricePrecision} dir={priceDir} size="lg" />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Bot</span>
          <BotStatusBadge status={botStatus} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Market Data</span>
          <ConnectionBadge status={connection} />
        </div>
        <div className="h-8 w-px bg-border" aria-hidden />
        <PaperTradingBadge />
      </div>
    </header>
  )
}
