import type {
  BotConfig,
  BotId,
  BotStatus,
  Candle,
  ConnectionStatus,
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

// --- Initial paper-trading scenarios for multiple independent mock bots ---

const HOUR = 60 * 60 * 1000
const INITIAL_NOW = Date.now()

export const INITIAL_POSITIONS: Position[] = [
  {
    id: "pos-1",
    gridId: 2,
    symbol: "HYPE/USDC",
    gridPrice: 48,
    buyPrice: 47.982,
    buyFee: 0.02,
    quantity: 2.0842,
    sellTarget: 49.5,
    openedAt: INITIAL_NOW - 2.1 * HOUR,
  },
  {
    id: "pos-2",
    gridId: 3,
    symbol: "HYPE/USDC",
    gridPrice: 49.5,
    buyPrice: 49.472,
    buyFee: 0.02,
    quantity: 2.0213,
    sellTarget: 51,
    openedAt: INITIAL_NOW - 1.5 * HOUR,
  },
  {
    id: "pos-3",
    gridId: 4,
    symbol: "HYPE/USDC",
    gridPrice: 51,
    buyPrice: 50.981,
    buyFee: 0.02,
    quantity: 1.9615,
    sellTarget: 52.5,
    openedAt: INITIAL_NOW - 0.4 * HOUR,
  },
]

// Trades are newest first for the table, but their timestamps form a coherent
// sequence: the first three BUY/SELL pairs are closed and the last three BUYs
// correspond to the three open positions above.
export const INITIAL_TRADES: Trade[] = [
  { id: "t-9", timestamp: INITIAL_NOW - 0.4 * HOUR, symbol: "HYPE/USDC", side: "BUY", gridPrice: 51, executionPrice: 50.981, quantity: 1.9615, fee: 0.02 },
  { id: "t-8", timestamp: INITIAL_NOW - 1.5 * HOUR, symbol: "HYPE/USDC", side: "BUY", gridPrice: 49.5, executionPrice: 49.472, quantity: 2.0213, fee: 0.02 },
  { id: "t-7", timestamp: INITIAL_NOW - 2.1 * HOUR, symbol: "HYPE/USDC", side: "BUY", gridPrice: 48, executionPrice: 47.982, quantity: 2.0842, fee: 0.02 },
  { id: "t-6", timestamp: INITIAL_NOW - 2.8 * HOUR, symbol: "HYPE/USDC", side: "SELL", gridPrice: 51, executionPrice: 51.027, quantity: 2.0213, fee: 0.02, pnl: 3.10 },
  { id: "t-5", timestamp: INITIAL_NOW - 3.6 * HOUR, symbol: "HYPE/USDC", side: "BUY", gridPrice: 49.5, executionPrice: 49.472, quantity: 2.0213, fee: 0.02 },
  { id: "t-4", timestamp: INITIAL_NOW - 4.2 * HOUR, symbol: "HYPE/USDC", side: "SELL", gridPrice: 49.5, executionPrice: 49.523, quantity: 2.0842, fee: 0.02, pnl: 3.17 },
  { id: "t-3", timestamp: INITIAL_NOW - 4.8 * HOUR, symbol: "HYPE/USDC", side: "BUY", gridPrice: 48, executionPrice: 47.982, quantity: 2.0842, fee: 0.02 },
  { id: "t-2", timestamp: INITIAL_NOW - 5.6 * HOUR, symbol: "HYPE/USDC", side: "SELL", gridPrice: 48, executionPrice: 48.019, quantity: 2.1516, fee: 0.02, pnl: 3.28 },
  { id: "t-1", timestamp: INITIAL_NOW - 6.2 * HOUR, symbol: "HYPE/USDC", side: "BUY", gridPrice: 46.5, executionPrice: 46.478, quantity: 2.1516, fee: 0.02 },
]

function chronologicalTrades(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => a.timestamp - b.timestamp)
}

function calculateBalance(trades: Trade[], initialQuoteBalance: number): PaperBalance {
  let quote = initialQuoteBalance
  let base = 0
  for (const trade of chronologicalTrades(trades)) {
    if (trade.side === "BUY") {
      quote -= trade.executionPrice * trade.quantity + trade.fee
      base += trade.quantity
    } else {
      quote += trade.executionPrice * trade.quantity - trade.fee
      base -= trade.quantity
    }
  }
  return { quote: round(quote, 4), base: round(base, 6) }
}

function calculateRealizedPnl(trades: Trade[]): number {
  const openBuys: Trade[] = []
  let realized = 0
  for (const trade of chronologicalTrades(trades)) {
    if (trade.side === "BUY") {
      openBuys.push(trade)
      continue
    }
    const buy = openBuys.shift()
    if (!buy) continue
    realized += (trade.executionPrice - buy.executionPrice) * trade.quantity - buy.fee - trade.fee
  }
  return round(realized, 2)
}

export const INITIAL_BALANCE: PaperBalance = calculateBalance(INITIAL_TRADES, DEFAULT_CONFIG.initialQuoteBalance)
export const INITIAL_REALIZED_PNL = calculateRealizedPnl(INITIAL_TRADES)

export function configForSymbol(symbol: SymbolId): BotConfig {
  const meta = getSymbolMeta(symbol)
  return {
    ...DEFAULT_CONFIG,
    symbol,
    lowerPrice: round(meta.referencePrice * 0.86, meta.pricePrecision),
    upperPrice: round(meta.referencePrice * 1.14, meta.pricePrecision),
  }
}

export interface MockBotDefinition {
  id: BotId
  config: BotConfig
  status: BotStatus
  connection: ConnectionStatus
  currentPrice: number
  positions: Position[]
  trades: Trade[]
  balance: PaperBalance
  realizedPnl: number
}

export const MOCK_BOTS: MockBotDefinition[] = [
  {
    id: "bot-hype",
    config: DEFAULT_CONFIG,
    status: "RUNNING",
    connection: "LIVE",
    currentPrice: 52.48,
    positions: INITIAL_POSITIONS,
    trades: INITIAL_TRADES,
    balance: INITIAL_BALANCE,
    realizedPnl: INITIAL_REALIZED_PNL,
  },
  {
    id: "bot-btc",
    config: configForSymbol("BTC/USDC"),
    status: "RUNNING",
    connection: "LIVE",
    currentPrice: getSymbolMeta("BTC/USDC").referencePrice,
    positions: [],
    trades: [],
    balance: { quote: configForSymbol("BTC/USDC").initialQuoteBalance, base: 0 },
    realizedPnl: 0,
  },
  {
    id: "bot-eth",
    config: configForSymbol("ETH/USDC"),
    status: "STOPPED",
    connection: "LIVE",
    currentPrice: getSymbolMeta("ETH/USDC").referencePrice,
    positions: [],
    trades: [],
    balance: { quote: configForSymbol("ETH/USDC").initialQuoteBalance, base: 0 },
    realizedPnl: 0,
  },
  {
    id: "bot-sol",
    config: configForSymbol("SOL/USDC"),
    status: "STOPPED",
    connection: "LIVE",
    currentPrice: getSymbolMeta("SOL/USDC").referencePrice,
    positions: [],
    trades: [],
    balance: { quote: configForSymbol("SOL/USDC").initialQuoteBalance, base: 0 },
    realizedPnl: 0,
  },
]

/** Recompute portfolio metrics from balances, open positions and realized pnl. */
export function computePortfolio(
  balance: PaperBalance,
  positions: Position[],
  realizedPnl: number,
  currentPrice: number,
  initialPortfolioValue: number,
): Portfolio {
  const unrealizedPnl = positions.reduce(
    (sum, p) => sum + (currentPrice - p.buyPrice) * p.quantity - p.buyFee,
    0,
  )
  const portfolioValue = balance.quote + balance.base * currentPrice
  const totalPnl = realizedPnl + unrealizedPnl
  const returnPct = initialPortfolioValue > 0
    ? ((portfolioValue - initialPortfolioValue) / initialPortfolioValue) * 100
    : 0
  return {
    portfolioValue,
    totalPnl,
    realizedPnl,
    unrealizedPnl,
    returnPct,
  }
}
