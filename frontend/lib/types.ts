export type SymbolId = "HYPE/USDC" | "BTC/USDC" | "ETH/USDC" | "SOL/USDC"

export type BotId = "bot-hype" | "bot-btc" | "bot-eth" | "bot-sol"

export type Timeframe = "1m" | "5m" | "15m"

export type BotStatus = "RUNNING" | "PAUSED" | "STOPPED"

export type ConnectionStatus = "LIVE" | "RECONNECTING" | "DISCONNECTED"

export type Side = "BUY" | "SELL"

export type BottomTab = "positions" | "history"

export interface SymbolMeta {
  id: SymbolId
  base: string
  quote: string
  /** decimal places used to display the price */
  pricePrecision: number
  /** decimal places used to display the base asset quantity */
  qtyPrecision: number
  /** reference (starting) price used to seed mock candles */
  referencePrice: number
}

export interface Candle {
  /** unix time in seconds */
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface BotConfig {
  symbol: SymbolId
  lowerPrice: number
  upperPrice: number
  gridCount: number
  orderAmount: number
  initialQuoteBalance: number
  feeRate: number
  slippageRate: number
}

export interface GridLevel {
  index: number
  price: number
  /** READY = no open position for this level, OPEN = position currently open */
  state: "READY" | "OPEN"
}

export interface Position {
  id: string
  gridId: number
  symbol: SymbolId
  gridPrice: number
  buyPrice: number
  buyFee: number
  quantity: number
  sellTarget: number
  openedAt: number
}

export interface Trade {
  id: string
  timestamp: number
  symbol: SymbolId
  side: Side
  gridPrice: number
  executionPrice: number
  quantity: number
  fee: number
  /** realized pnl, present on SELL trades only */
  pnl?: number
}

export interface Portfolio {
  portfolioValue: number
  totalPnl: number
  realizedPnl: number
  unrealizedPnl: number
  returnPct: number
}

export interface PaperBalance {
  quote: number
  base: number
}
