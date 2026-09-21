"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatPrice, formatQty, formatSignedPercent, formatSignedUsd, signClass } from "@/lib/format"
import { getSymbolMeta } from "@/lib/mock-data"
import { useBotStore } from "./bot-store"

function ageLabel(openedAt: number): string {
  const mins = Math.max(0, Math.round((Date.now() - openedAt) / 60000))
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

export function OpenPositionsTable() {
  const { positions, symbol, currentPrice } = useBotStore()
  const meta = getSymbolMeta(symbol)
  const rows = positions.filter((p) => p.symbol === symbol).sort((a, b) => a.gridPrice - b.gridPrice)

  if (rows.length === 0) {
    return (
      <div className="grid h-full min-h-40 place-items-center p-6 text-center">
        <div className="text-sm text-muted-foreground">
          No open positions.
          <p className="mt-1 text-xs">Positions appear here when the grid fills a buy order.</p>
        </div>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Grid</TableHead>
          <TableHead className="text-right">Grid Price</TableHead>
          <TableHead className="text-right">Buy Price</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Sell Target</TableHead>
          <TableHead className="text-right">Current</TableHead>
          <TableHead className="text-right">Unrealized PnL</TableHead>
          <TableHead className="text-right">Age</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => {
          const pnl = (currentPrice - p.buyPrice) * p.quantity - p.buyFee
          const pnlPct = ((currentPrice - p.buyPrice) / p.buyPrice) * 100
          return (
            <TableRow key={p.id} className="font-mono tabular-nums">
              <TableCell className="font-sans">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-positive" aria-hidden />#{p.gridId}
                </span>
              </TableCell>
              <TableCell className="text-right">{formatPrice(p.gridPrice, meta.pricePrecision)}</TableCell>
              <TableCell className="text-right">{formatPrice(p.buyPrice, meta.pricePrecision)}</TableCell>
              <TableCell className="text-right">{formatQty(p.quantity, meta.qtyPrecision)}</TableCell>
              <TableCell className="text-right text-negative">{formatPrice(p.sellTarget, meta.pricePrecision)}</TableCell>
              <TableCell className="text-right">{formatPrice(currentPrice, meta.pricePrecision)}</TableCell>
              <TableCell className={cn("text-right font-semibold", signClass(pnl))}>
                {formatSignedUsd(pnl)}
                <span className="ml-1 text-xs opacity-80">{formatSignedPercent(pnlPct)}</span>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">{ageLabel(p.openedAt)}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
