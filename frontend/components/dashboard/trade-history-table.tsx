"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatPrice, formatQty, formatSignedUsd, formatTime, signClass } from "@/lib/format"
import { getSymbolMeta } from "@/lib/mock-data"
import { useBotStore } from "./bot-store"

export function TradeHistoryTable() {
  const { trades, symbol } = useBotStore()
  const meta = getSymbolMeta(symbol)
  const rows = trades.filter((t) => t.symbol === symbol)

  if (rows.length === 0) {
    return (
      <div className="grid h-full min-h-40 place-items-center p-6 text-center">
        <div className="text-sm text-muted-foreground">
          No trades yet.
          <p className="mt-1 text-xs">Filled grid orders will be logged here.</p>
        </div>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Time</TableHead>
          <TableHead>Side</TableHead>
          <TableHead className="text-right">Grid Price</TableHead>
          <TableHead className="text-right">Exec Price</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Fee</TableHead>
          <TableHead className="text-right">Realized PnL</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.id} className="font-mono tabular-nums">
            <TableCell className="text-muted-foreground">{formatTime(t.timestamp)}</TableCell>
            <TableCell className="font-sans">
              <span
                className={cn(
                  "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold",
                  t.side === "BUY" ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative",
                )}
              >
                {t.side}
              </span>
            </TableCell>
            <TableCell className="text-right">{formatPrice(t.gridPrice, meta.pricePrecision)}</TableCell>
            <TableCell className="text-right">{formatPrice(t.executionPrice, meta.pricePrecision)}</TableCell>
            <TableCell className="text-right">{formatQty(t.quantity, meta.qtyPrecision)}</TableCell>
            <TableCell className="text-right text-muted-foreground">{formatPrice(t.fee, 2)}</TableCell>
            <TableCell className={cn("text-right font-semibold", t.pnl != null ? signClass(t.pnl) : "text-muted-foreground")}>
              {t.pnl != null ? formatSignedUsd(t.pnl) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
