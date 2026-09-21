export function formatPrice(value: number, precision = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
}

export function formatUsd(value: number, precision = 2): string {
  return `$${formatPrice(value, precision)}`
}

export function formatSignedUsd(value: number, precision = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : ""
  return `${sign}$${formatPrice(Math.abs(value), precision)}`
}

export function formatSignedPercent(value: number, precision = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : ""
  return `${sign}${Math.abs(value).toFixed(precision)}%`
}

export function formatQty(value: number, precision = 4): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

export function signClass(value: number): string {
  if (value > 0) return "text-positive"
  if (value < 0) return "text-negative"
  return "text-muted-foreground"
}
