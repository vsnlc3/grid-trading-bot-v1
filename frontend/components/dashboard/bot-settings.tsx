"use client"

import * as React from "react"
import { Info, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { gridInterval } from "@/lib/mock-data"
import type { BotConfig } from "@/lib/types"
import { useBotStore } from "./bot-store"

type FormState = Record<keyof Omit<BotConfig, "symbol">, string>

function toForm(config: BotConfig): FormState {
  return {
    lowerPrice: String(config.lowerPrice),
    upperPrice: String(config.upperPrice),
    gridCount: String(config.gridCount),
    orderAmount: String(config.orderAmount),
    initialQuoteBalance: String(config.initialQuoteBalance),
    feeRate: String(config.feeRate),
    slippageRate: String(config.slippageRate),
  }
}

function validate(form: FormState): { errors: Partial<Record<keyof FormState, string>>; parsed?: Omit<BotConfig, "symbol"> } {
  const lowerPrice = Number(form.lowerPrice)
  const upperPrice = Number(form.upperPrice)
  const gridCount = Number(form.gridCount)
  const orderAmount = Number(form.orderAmount)
  const initialQuoteBalance = Number(form.initialQuoteBalance)
  const feeRate = Number(form.feeRate)
  const slippageRate = Number(form.slippageRate)

  const errors: Partial<Record<keyof FormState, string>> = {}
  if (!(lowerPrice > 0)) errors.lowerPrice = "Must be greater than 0"
  if (!(upperPrice > 0)) errors.upperPrice = "Must be greater than 0"
  if (lowerPrice > 0 && upperPrice > 0 && upperPrice <= lowerPrice) errors.upperPrice = "Must be above lower price"
  if (!Number.isInteger(gridCount) || gridCount < 2 || gridCount > 100) errors.gridCount = "2 – 100 grids"
  if (!(orderAmount > 0)) errors.orderAmount = "Must be greater than 0"
  if (!(initialQuoteBalance > 0)) errors.initialQuoteBalance = "Must be greater than 0"
  if (!(feeRate >= 0) || feeRate > 0.01) errors.feeRate = "0 – 0.01"
  if (!(slippageRate >= 0) || slippageRate > 0.01) errors.slippageRate = "0 – 0.01"

  if (Object.keys(errors).length > 0) return { errors }
  return {
    errors,
    parsed: { lowerPrice, upperPrice, gridCount, orderAmount, initialQuoteBalance, feeRate, slippageRate },
  }
}

export function BotSettings() {
  const { config, configEditable, botStatus, positions, symbol, dispatch } = useBotStore()
  const [form, setForm] = React.useState<FormState>(() => toForm(config))
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({})

  // Re-sync the form whenever the applied config changes (e.g. symbol switch, reset).
  React.useEffect(() => {
    setForm(toForm(config))
    setErrors({})
  }, [config])

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const dirty = React.useMemo(() => JSON.stringify(form) !== JSON.stringify(toForm(config)), [form, config])

  const previewInterval = React.useMemo(() => {
    const lo = Number(form.lowerPrice)
    const hi = Number(form.upperPrice)
    const gc = Number(form.gridCount)
    if (hi > lo && gc >= 2) return (hi - lo) / gc
    return gridInterval(config)
  }, [form, config])

  const apply = () => {
    const { errors: errs, parsed } = validate(form)
    if (!parsed) {
      setErrors(errs)
      toast.error("Invalid settings", { description: "Please fix the highlighted fields." })
      return
    }
    setErrors({})
    dispatch({ type: "UPDATE_CONFIG", config: { symbol, ...parsed } })
    toast.success("Settings applied", { description: "Grid rebuilt with the new parameters." })
  }

  const reset = () => {
    dispatch({ type: "RESET_CONFIG" })
    toast.info("Settings reset to defaults")
  }

  const lockReason =
    botStatus !== "STOPPED"
      ? "Stop the bot to edit settings."
      : positions.length > 0
        ? "Close all open positions to edit settings."
        : null

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label="Bot settings">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Bot Settings</h2>
        <span className="font-mono text-[11px] text-muted-foreground">{symbol.replace("/", " / ")}</span>
      </div>

      {lockReason && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>{lockReason}</span>
        </div>
      )}

      <fieldset disabled={!configEditable} className="space-y-3 disabled:opacity-70">
        <div className="grid grid-cols-2 gap-3">
          <Field id="lowerPrice" label="Lower Price" value={form.lowerPrice} onChange={set("lowerPrice")} error={errors.lowerPrice} step="0.0001" />
          <Field id="upperPrice" label="Upper Price" value={form.upperPrice} onChange={set("upperPrice")} error={errors.upperPrice} step="0.0001" />
          <Field id="gridCount" label="Grid Count" value={form.gridCount} onChange={set("gridCount")} error={errors.gridCount} step="1" />
          <Field id="orderAmount" label="Order Amount" value={form.orderAmount} onChange={set("orderAmount")} error={errors.orderAmount} step="1" />
          <Field id="initialQuoteBalance" label="Initial Balance" value={form.initialQuoteBalance} onChange={set("initialQuoteBalance")} error={errors.initialQuoteBalance} step="100" />
          <Field id="feeRate" label="Fee Rate" value={form.feeRate} onChange={set("feeRate")} error={errors.feeRate} step="0.0001" />
          <Field id="slippageRate" label="Slippage" value={form.slippageRate} onChange={set("slippageRate")} error={errors.slippageRate} step="0.0001" />
          <div className="flex flex-col justify-end">
            <span className="mb-1 text-[10px] tracking-wider text-muted-foreground uppercase">Grid Interval</span>
            <div className="flex h-8 items-center rounded-lg border border-border bg-muted/30 px-2.5 font-mono text-sm tabular-nums text-muted-foreground">
              {previewInterval.toFixed(4)}
            </div>
          </div>
        </div>
      </fieldset>

      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={apply} disabled={!configEditable || !dirty}>
          <Save />
          Apply
        </Button>
        <Button variant="outline" onClick={reset} disabled={!configEditable}>
          <RotateCcw />
          Reset
        </Button>
      </div>
    </section>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  step,
}: {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  step?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-[10px] tracking-wider text-muted-foreground uppercase">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        className={cn("h-8 font-mono text-sm tabular-nums", error && "border-destructive")}
      />
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  )
}
