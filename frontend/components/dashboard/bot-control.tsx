"use client"

import * as React from "react"
import { Pause, Play, Square, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useBotStore } from "./bot-store"
import { BotStatusBadge } from "./status-badges"

export function BotControl() {
  const { botStatus, positions, trades, dispatch } = useBotStore()
  const [stopOpen, setStopOpen] = React.useState(false)

  const start = () => {
    dispatch({ type: "START" })
    toast.success("Bot started", { description: "Grid orders are now active (paper)." })
  }
  const pause = () => {
    dispatch({ type: "PAUSE" })
    toast.info("Bot paused", { description: "No new orders will fill until resumed." })
  }
  const resume = () => {
    dispatch({ type: "RESUME" })
    toast.success("Bot resumed")
  }
  const confirmStop = () => {
    dispatch({ type: "STOP" })
    setStopOpen(false)
    toast.warning("Bot stopped", { description: "Grid deactivated. Open positions are retained." })
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label="Bot controls">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Bot Control</h2>
        <BotStatusBadge status={botStatus} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {botStatus === "STOPPED" && (
          <Button size="lg" className="col-span-2" onClick={start}>
            <Play />
            Start Bot
          </Button>
        )}
        {botStatus === "RUNNING" && (
          <Button size="lg" variant="secondary" onClick={pause}>
            <Pause />
            Pause
          </Button>
        )}
        {botStatus === "PAUSED" && (
          <Button size="lg" onClick={resume}>
            <Play />
            Resume
          </Button>
        )}
        {botStatus !== "STOPPED" && (
          <Button size="lg" variant="destructive" onClick={() => setStopOpen(true)}>
            <Square />
            Stop
          </Button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Open" value={String(positions.length)} />
        <Stat label="Fills" value={String(trades.length)} />
        <Stat
          label="State"
          value={botStatus === "RUNNING" ? "Active" : botStatus === "PAUSED" ? "Idle" : "Off"}
          valueClass={cn(
            botStatus === "RUNNING" && "text-positive",
            botStatus === "PAUSED" && "text-warning",
          )}
        />
      </dl>

      <Dialog open={stopOpen} onOpenChange={setStopOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex size-9 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
            <DialogTitle>Stop the bot?</DialogTitle>
            <DialogDescription>
              This deactivates the grid and cancels resting orders. Your {positions.length} open position
              {positions.length === 1 ? "" : "s"} will remain open and are not liquidated. This is a paper-trading
              simulation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={confirmStop}>
              <Square />
              Stop Bot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 py-2">
      <dt className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className={cn("font-mono text-sm font-semibold tabular-nums", valueClass)}>{value}</dd>
    </div>
  )
}
