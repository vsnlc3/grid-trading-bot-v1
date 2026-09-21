"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useBotStore } from "./bot-store"
import { OpenPositionsTable } from "./open-positions-table"
import { TradeHistoryTable } from "./trade-history-table"

function CountBadge({ n }: { n: number }) {
  return (
    <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground group-data-active:bg-primary/15 group-data-active:text-primary">
      {n}
    </span>
  )
}

export function BottomPanel() {
  const { positions, trades, symbol } = useBotStore()
  const [tab, setTab] = React.useState("positions")

  const openCount = positions.filter((p) => p.symbol === symbol).length
  const tradeCount = trades.filter((t) => t.symbol === symbol).length

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card" aria-label="Positions and trade history">
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="border-b border-border px-3 py-2">
          <TabsList>
            <TabsTrigger value="positions" className="group px-3">
              Open Positions
              <CountBadge n={openCount} />
            </TabsTrigger>
            <TabsTrigger value="history" className="group px-3">
              Trade History
              <CountBadge n={tradeCount} />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="positions" className="min-h-0">
          <ScrollArea className="h-[240px]">
            <OpenPositionsTable />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="history" className="min-h-0">
          <ScrollArea className="h-[240px]">
            <TradeHistoryTable />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </section>
  )
}
