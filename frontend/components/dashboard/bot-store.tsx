"use client"

import * as React from "react"
import {
  buildGridLevels,
  computePortfolio,
  DEFAULT_CONFIG,
  generateCandles,
  getSymbolMeta,
  gridInterval,
  INITIAL_BALANCE,
  INITIAL_POSITIONS,
  INITIAL_REALIZED_PNL,
  INITIAL_TRADES,
} from "@/lib/mock-data"
import type {
  BotConfig,
  BotStatus,
  BottomTab,
  Candle,
  ConnectionStatus,
  PaperBalance,
  Position,
  SymbolId,
  Timeframe,
  Trade,
} from "@/lib/types"

interface State {
  loading: boolean
  symbol: SymbolId
  timeframe: Timeframe
  botStatus: BotStatus
  connection: ConnectionStatus
  config: BotConfig
  bottomTab: BottomTab
  candles: Candle[]
  currentPrice: number
  priceDir: "up" | "down" | null
  positions: Position[]
  trades: Trade[]
  balance: PaperBalance
  realizedPnl: number
}

type Action =
  | { type: "INIT_DONE" }
  | { type: "TICK" }
  | { type: "SET_SYMBOL"; symbol: SymbolId }
  | { type: "SET_TIMEFRAME"; timeframe: Timeframe }
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | { type: "UPDATE_CONFIG"; config: BotConfig }
  | { type: "RESET_CONFIG" }
  | { type: "SET_TAB"; tab: BottomTab }

function round(value: number, precision: number): number {
  const f = 10 ** precision
  return Math.round(value * f) / f
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function freshScenario(config: BotConfig): {
  positions: Position[]
  trades: Trade[]
  balance: PaperBalance
  realizedPnl: number
} {
  return {
    positions: [],
    trades: [],
    balance: { quote: config.initialQuoteBalance, base: 0 },
    realizedPnl: 0,
  }
}

function initialState(): State {
  return {
    loading: true,
    symbol: DEFAULT_CONFIG.symbol,
    timeframe: "5m",
    botStatus: "RUNNING",
    connection: "LIVE",
    config: DEFAULT_CONFIG,
    bottomTab: "positions",
    candles: generateCandles(DEFAULT_CONFIG.symbol, "5m"),
    currentPrice: getSymbolMeta(DEFAULT_CONFIG.symbol).referencePrice,
    priceDir: null,
    positions: INITIAL_POSITIONS,
    trades: INITIAL_TRADES,
    balance: INITIAL_BALANCE,
    realizedPnl: INITIAL_REALIZED_PNL,
  }
}

function updateLastCandle(candles: Candle[], price: number): Candle[] {
  if (candles.length === 0) return candles
  const next = candles.slice()
  const last = { ...next[next.length - 1] }
  last.close = price
  last.high = Math.max(last.high, price)
  last.low = Math.min(last.low, price)
  next[next.length - 1] = last
  return next
}

function tick(state: State): State {
  const meta = getSymbolMeta(state.symbol)
  const prev = state.currentPrice
  const volatility = meta.referencePrice * 0.0018

  // random walk with light mean reversion toward the grid range midpoint
  const mid = (state.config.lowerPrice + state.config.upperPrice) / 2
  let price = prev + (Math.random() - 0.5) * volatility * 2
  price += (mid - price) * 0.015
  // keep the price within a sensible band around the grid
  const floor = state.config.lowerPrice * 0.97
  const ceil = state.config.upperPrice * 1.03
  price = Math.min(ceil, Math.max(floor, price))
  price = round(price, meta.pricePrecision)

  const priceDir: "up" | "down" | null =
    price > prev ? "up" : price < prev ? "down" : state.priceDir
  const candles = updateLastCandle(state.candles, price)

  let next: State = { ...state, currentPrice: price, priceDir, candles }

  // Paper trading only executes while RUNNING and on the bot's configured symbol.
  if (state.botStatus !== "RUNNING" || state.symbol !== state.config.symbol) {
    return next
  }

  const interval = gridInterval(state.config)
  const openGridIds = new Set(state.positions.map((p) => p.gridId))

  // SELL: an open position whose sell target was crossed upward this tick.
  const sellPos = state.positions.find((p) => prev < p.sellTarget && price >= p.sellTarget)
  if (sellPos) {
    const execPrice = round(sellPos.sellTarget * (1 - state.config.slippageRate), meta.pricePrecision)
    const gross = execPrice * sellPos.quantity
    const fee = round(gross * state.config.feeRate, 2)
    const pnl = round((execPrice - sellPos.buyPrice) * sellPos.quantity - fee, 2)
    const trade: Trade = {
      id: makeId("t"),
      timestamp: Date.now(),
      symbol: state.symbol,
      side: "SELL",
      gridPrice: sellPos.gridPrice,
      executionPrice: execPrice,
      quantity: sellPos.quantity,
      fee,
      pnl,
    }
    next = {
      ...next,
      positions: state.positions.filter((p) => p.id !== sellPos.id),
      trades: [trade, ...state.trades].slice(0, 80),
      balance: {
        quote: round(state.balance.quote + gross - fee, 4),
        base: round(state.balance.base - sellPos.quantity, 6),
      },
      realizedPnl: round(state.realizedPnl + pnl, 2),
    }
    return next
  }

  // BUY: a READY interior grid line crossed downward this tick.
  const levels = buildGridLevels(state.config, openGridIds)
  const buyLevel = levels.find(
    (l) =>
      l.index >= 1 &&
      l.index <= state.config.gridCount - 1 &&
      l.state === "READY" &&
      prev > l.price &&
      price <= l.price,
  )
  if (buyLevel && state.balance.quote >= state.config.orderAmount) {
    const buyPrice = round(buyLevel.price * (1 + state.config.slippageRate), meta.pricePrecision)
    const quantity = round(state.config.orderAmount / buyPrice, 6)
    const fee = round(state.config.orderAmount * state.config.feeRate, 2)
    const sellTarget = round(buyLevel.price + interval, meta.pricePrecision)
    const trade: Trade = {
      id: makeId("t"),
      timestamp: Date.now(),
      symbol: state.symbol,
      side: "BUY",
      gridPrice: buyLevel.price,
      executionPrice: buyPrice,
      quantity,
      fee,
    }
    const position: Position = {
      id: makeId("pos"),
      gridId: buyLevel.index,
      symbol: state.symbol,
      gridPrice: buyLevel.price,
      buyPrice,
      quantity,
      sellTarget,
      openedAt: Date.now(),
    }
    next = {
      ...next,
      positions: [...state.positions, position],
      trades: [trade, ...state.trades].slice(0, 80),
      balance: {
        quote: round(state.balance.quote - state.config.orderAmount - fee, 4),
        base: round(state.balance.base + quantity, 6),
      },
    }
    return next
  }

  return next
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT_DONE":
      return { ...state, loading: false }
    case "TICK":
      return tick(state)
    case "SET_TAB":
      return { ...state, bottomTab: action.tab }
    case "SET_TIMEFRAME":
      return {
        ...state,
        timeframe: action.timeframe,
        candles: updateLastCandle(generateCandles(state.symbol, action.timeframe), state.currentPrice),
      }
    case "SET_SYMBOL": {
      if (action.symbol === state.symbol) return state
      const meta = getSymbolMeta(action.symbol)
      const config: BotConfig = {
        ...state.config,
        symbol: action.symbol,
        lowerPrice: round(meta.referencePrice * 0.86, meta.pricePrecision),
        upperPrice: round(meta.referencePrice * 1.14, meta.pricePrecision),
      }
      return {
        ...state,
        symbol: action.symbol,
        config,
        candles: generateCandles(action.symbol, state.timeframe),
        currentPrice: meta.referencePrice,
        priceDir: null,
        ...freshScenario(config),
      }
    }
    case "START":
      return state.botStatus === "STOPPED" ? { ...state, botStatus: "RUNNING" } : state
    case "PAUSE":
      return state.botStatus === "RUNNING" ? { ...state, botStatus: "PAUSED" } : state
    case "RESUME":
      return state.botStatus === "PAUSED" ? { ...state, botStatus: "RUNNING" } : state
    case "STOP":
      return state.botStatus === "STOPPED" ? state : { ...state, botStatus: "STOPPED" }
    case "UPDATE_CONFIG": {
      // Editing settings is only allowed while STOPPED with no open positions.
      if (state.botStatus !== "STOPPED" || state.positions.length > 0) return state
      const symbolChanged = action.config.symbol !== state.symbol
      const meta = getSymbolMeta(action.config.symbol)
      return {
        ...state,
        config: action.config,
        symbol: action.config.symbol,
        candles: symbolChanged
          ? generateCandles(action.config.symbol, state.timeframe)
          : updateLastCandle(state.candles, symbolChanged ? meta.referencePrice : state.currentPrice),
        currentPrice: symbolChanged ? meta.referencePrice : state.currentPrice,
        ...freshScenario(action.config),
      }
    }
    case "RESET_CONFIG": {
      if (state.botStatus !== "STOPPED" || state.positions.length > 0) return state
      return {
        ...state,
        config: DEFAULT_CONFIG,
        symbol: DEFAULT_CONFIG.symbol,
        candles: generateCandles(DEFAULT_CONFIG.symbol, state.timeframe),
        currentPrice: getSymbolMeta(DEFAULT_CONFIG.symbol).referencePrice,
        ...freshScenario(DEFAULT_CONFIG),
      }
    }
    default:
      return state
  }
}

interface BotStore extends State {
  configEditable: boolean
  symbolChangeable: boolean
  gridLevels: ReturnType<typeof buildGridLevels>
  portfolio: ReturnType<typeof computePortfolio>
  dispatch: React.Dispatch<Action>
}

const BotStoreContext = React.createContext<BotStore | null>(null)

export function BotStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, undefined, initialState)

  React.useEffect(() => {
    const t = setTimeout(() => dispatch({ type: "INIT_DONE" }), 750)
    return () => clearTimeout(t)
  }, [])

  React.useEffect(() => {
    if (state.loading) return
    const id = setInterval(() => dispatch({ type: "TICK" }), 1400)
    return () => clearInterval(id)
  }, [state.loading])

  const value = React.useMemo<BotStore>(() => {
    const openGridIds = new Set(state.positions.map((p) => p.gridId))
    return {
      ...state,
      configEditable: state.botStatus === "STOPPED" && state.positions.length === 0,
      symbolChangeable: state.botStatus === "STOPPED",
      gridLevels: buildGridLevels(state.config, openGridIds),
      portfolio: computePortfolio(
        state.balance,
        state.positions,
        state.realizedPnl,
        state.currentPrice,
        state.config.initialQuoteBalance,
      ),
      dispatch,
    }
  }, [state])

  return <BotStoreContext.Provider value={value}>{children}</BotStoreContext.Provider>
}

export function useBotStore(): BotStore {
  const ctx = React.useContext(BotStoreContext)
  if (!ctx) throw new Error("useBotStore must be used within BotStoreProvider")
  return ctx
}
