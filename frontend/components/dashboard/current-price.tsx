"use client"

import * as React from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/format"

export function CurrentPrice({
  price,
  precision,
  dir,
  size = "md",
}: {
  price: number
  precision: number
  dir: "up" | "down" | null
  size?: "md" | "lg"
}) {
  const [flash, setFlash] = React.useState<"flash-up" | "flash-down" | "">("")
  const prevRef = React.useRef(price)

  React.useEffect(() => {
    if (price === prevRef.current) return
    const cls = price > prevRef.current ? "flash-up" : "flash-down"
    prevRef.current = price
    setFlash(cls)
    const t = setTimeout(() => setFlash(""), 500)
    return () => clearTimeout(t)
  }, [price])

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 font-mono font-semibold tabular-nums transition-colors",
        size === "lg" ? "text-2xl" : "text-lg",
        dir === "up" ? "text-positive" : dir === "down" ? "text-negative" : "text-foreground",
        flash,
      )}
      aria-live="polite"
    >
      {dir === "up" ? (
        <ArrowUpRight className="size-4 shrink-0" aria-hidden />
      ) : dir === "down" ? (
        <ArrowDownRight className="size-4 shrink-0" aria-hidden />
      ) : null}
      <span>
        <span className="text-muted-foreground">$</span>
        {formatPrice(price, precision)}
      </span>
    </span>
  )
}
