import type {
  BotConfig,
  Candle,
  GridLevel,
  PaperBalance,
  Portfolio,
  Position,
  SymbolId,
  SymbolMeta,
  Timeframe,
  Trade,
} from "./types"

export const SYMBOLS: SymbolMeta[] = [
  { id: "HYPE/USDC", base: "HYPE", quote: "USDC", pricePrecision: 4, qtyPrecision: 4, referencePrice: 52.48 },
  { id: "BTC/USDC", base: "BTC", quote: "USDC", pricePrecision: 2, qtyPrecision: 5, referencePrice: 67250 },
  { id: "ETH/USDC", base: "ETH", quote: "USDC", pricePrecision: 2, qtyPrecision: 4, referencePrice: 3285 },
  { id: "SOL/USDC", base: "SOL", quote: "USDC", pricePrecision: 3, qtyPrecision: 3, referencePrice: 187.4 },
]

export function getSymbolMeta(id: SymbolId): SymbolMeta {
  return SYMBOLS.find((s) => s.id === id) ?? SYMBOLS[0]
}

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
}

/** Deterministic PRNG so mock candles stay stable across re-renders. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFor(symbol: SymbolId, timeframe: Timeframe): number {
  const str = `${symbol}-${timeframe}`
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0
  return h >>> 0
}

const CANDLE_COUNT = 200

/**
 * Generates a stable mock candle history ending at the symbol reference price.
 * Uses a seeded random walk so the same symbol/timeframe always produces the
 * same series (avoids flicker on re-render).
 */
export function generateCandles(symbol: SymbolId, timeframe: Timeframe): Candle[] {
  const meta = getSymbolMeta(symbol)
  const rand = mulberry32(seedFor(symbol, timeframe))
  const step = TIMEFRAME_SECONDS[timeframe]
  const now = Math.floor(Date.now() / 1000)
  const start = Math.floor(now / step) * step - CANDLE_COUNT * step

  const vol = meta.referencePrice * 0.004
  const candles: Candle[] = []
  // Start below reference and drift back toward it so the last close ~= reference.
  let price = meta.referencePrice * (0.9 + rand() * 0.06)

  for (let i = 0; i < CANDLE_COUNT; i++) {
    const time = start + i * step
    const drift = (meta.referencePrice - price) * 0.02
    const noise = (rand() - 0.5) * vol * 2
    const open = price
    let close = open + drift + noise
    if (close <= 0) close = open
    const wick = Math.abs(noise) * (0.4 + rand())
    const high = Math.max(open, close) + wick * rand()
    const low = Math.min(open, close) - wick * rand()
    const volume = Math.round((0.6 + rand() * 1.4) * baseVolume(meta.referencePrice))
    candles.push({
      time,
      open: round(open, meta.pricePrecision),
      high: round(high, meta.pricePrecision),
      low: round(low, meta.pricePrecision),
      close: round(close, meta.pricePrecision),
      volume,
    })
    price = close
  }

  // Pin the final close exactly to the reference price for a clean current price.
  const last = candles[candles.length - 1]
  last.close = meta.referencePrice
  last.high = Math.max(last.high, meta.referencePrice)
  last.low = Math.min(last.low, meta.referencePrice)

  return candles
}

function baseVolume(reference: number): number {
  if (reference > 10000) return 8
  if (reference > 1000) return 120
  if (reference > 100) return 900
  return 4200
}

function round(value: number, precision: number): number {
  const f = 10 ** precision
  return Math.round(value * f) / f
}

export const DEFAULT_CONFIG: BotConfig = {
  symbol: "HYPE/USDC",
  lowerPrice: 45,
  upperPrice: 60,
  gridCount: 10,
  orderAmount: 100,
  initialQuoteBalance: 10000,
  feeRate: 0.0002,
  slippageRate: 0.0005,
}

/** Grid levels = gridCount + 1 evenly spaced lines between lower and upper. */
export function buildGridLevels(config: BotConfig, openGridIds: Set<number> = new Set()): GridLevel[] {
  const interval = (config.upperPrice - config.lowerPrice) / config.gridCount
  const levels: GridLevel[] = []
  for (let i = 0; i <= config.gridCount; i++) {
    const price = config.lowerPrice + interval * i
    levels.push({
      index: i,
      price: round(price, 6),
      state: openGridIds.has(i) ? "OPEN" : "READY",
    })
  }
  return levels
}

export function gridInterval(config: BotConfig): number {
  return (config.upperPrice - config.lowerPrice) / config.gridCount
}

// --- Initial paper-trading scenario for the default HYPE bot (RUNNING) ---

const HOUR = 60 * 60 * 1000

export const INITIAL_POSITIONS: Position[] = [
  {
    id: "pos-1",
    gridId: 2,
    symbol: "HYPE/USDC",
    gridPrice: 48,
    buyPrice: 47.982,
    quantity: 2.0842,
    sellTarget: 49.5,
    openedAt: Date.now() - 5.4 * HOUR,
  },
  {
    id: "pos-2",
    gridId: 3,
    symbol: "HYPE/USDC",
    gridPrice: 49.5,
    buyPrice: 49.472,
    quantity: 2.0213,
    sellTarget: 51,
    openedAt: Date.now() - 3.1 * HOUR,
  },
  {
    id: "pos-3",
    gridId: 4,
    symbol: "HYPE/USDC",
    gridPrice: 51,
    buyPrice: 50.981,
    quantity: 1.9615,
    sellTarget: 52.5,
    openedAt: Date.now() - 1.2 * HOUR,
  },
]

export const INITIAL_TRADES: Trade[] = [
  { id: "t-1", timestamp: Date.now() - 6.2 * HOUR, symbol: "HYPE/USDC", side: "BUY", gridPrice: 46.5, executionPrice: 46.478, quantity: 2.1516, fee: 0.02 },
  { id: "t-2", timestamp: Date.now() - 5.4 * HOUR, symbol: "HYPE/USDC", side: "BUY", gridPrice: 48, executionPrice: 47.982, quantity: 2.0842, fee: 0.02 },
  { id: "t-3", timestamp: Date.now() - 4.6 * HOUR, symbol: "HYPE/USDC", side: "SELL", gridPrice: 48, executionPrice: 48.019, quantity: 2.1516, fee: 0.02, pnl: 3.29 },
  { id: "t-4", timestamp: Date.now() - 3.1 * HOUR, symbol: "HYPE/USDC", side: "BUY", gridPrice: 49.5, executionPrice: 49.472, quantity: 2.0213, fee: 0.02 },
  { id: "t-5", timestamp: Date.now() - 2.3 * HOUR, symbol: "HYPE/USDC", side: "SELL", gridPrice: 49.5, executionPrice: 49.523, quantity: 2.0842, fee: 0.02, pnl: 3.13 },
  { id: "t-6", timestamp: Date.now() - 1.2 * HOUR, symbol: "HYPE/USDC", side: "BUY", gridPrice: 51, executionPrice: 50.981, quantity: 1.9615, fee: 0.02 },
  { id: "t-7", timestamp: Date.now() - 0.4 * HOUR, symbol: "HYPE/USDC", side: "SELL", gridPrice: 51, executionPrice: 51.027, quantity: 1.9615, fee: 0.02, pnl: 4.02 },
]

export const INITIAL_BALANCE: PaperBalance = {
  quote: 8450,
  base: 34.5,
}

/** Recompute portfolio metrics from balances, open positions and realized pnl. */
export function computePortfolio(
  balance: PaperBalance,
  positions: Position[],
  realizedPnl: number,
  currentPrice: number,
  initialQuoteBalance: number,
): Portfolio {
  const unrealizedPnl = positions.reduce(
    (sum, p) => sum + (currentPrice - p.buyPrice) * p.quantity,
    0,
  )
  const portfolioValue = balance.quote + balance.base * currentPrice
  const totalPnl = realizedPnl + unrealizedPnl
  const returnPct = (totalPnl / initialQuoteBalance) * 100
  return {
    portfolioValue,
    totalPnl,
    realizedPnl,
    unrealizedPnl,
    returnPct,
  }
}

export const INITIAL_REALIZED_PNL = INITIAL_TRADES.reduce((s, t) => s + (t.pnl ?? 0), 0)
