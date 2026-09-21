"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { MOCK_BOTS, getSymbolMeta } from "@/lib/mock-data"
import type { BotId } from "@/lib/types"
import { useBotStore } from "./bot-store"
import { CurrentPrice } from "./current-price"
import { BotStatusBadge, ConnectionBadge, PaperTradingBadge } from "./status-badges"

function displaySymbol(id: string) {
  return id.replace("/", " / ")
}

function displayBot(id: string) {
  const bot = MOCK_BOTS.find((candidate) => candidate.id === id)
  return bot ? `${displaySymbol(bot.config.symbol)} Bot` : id
}

export function DashboardHeader() {
  const { activeBotId, symbol, currentPrice, priceDir, botStatus, connection, loading, dispatch } =
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
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Bot</span>
            <Select
              value={activeBotId}
              onValueChange={(v) => dispatch({ type: "SET_ACTIVE_BOT", botId: v as BotId })}
            >
              <SelectTrigger className="h-9 min-w-[170px] font-semibold" aria-label="Select active bot">
                <SelectValue>{(v: string) => displayBot(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MOCK_BOTS.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id}>
                    {displaySymbol(bot.config.symbol)} Bot
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
