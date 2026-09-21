"use client"

import * as React from "react"
import {
  buildGridLevels,
  computePortfolio,
  configForSymbol,
  generateCandles,
  getSymbolMeta,
  gridInterval,
  MOCK_BOTS,
} from "@/lib/mock-data"
import type {
  BotConfig,
  BotId,
  BotStatus,
  Candle,
  ConnectionStatus,
  PaperBalance,
  Position,
  SymbolId,
  Timeframe,
  Trade,
} from "@/lib/types"

type CandleMap = Record<Timeframe, Candle[]>

interface MockBotState {
  id: BotId
  botStatus: BotStatus
  connection: ConnectionStatus
  config: BotConfig
  candles: CandleMap
  currentPrice: number
  previousPrice: number | null
  priceDir: "up" | "down" | null
  positions: Position[]
  trades: Trade[]
  balance: PaperBalance
  realizedPnl: number
}

interface State {
  loading: boolean
  activeBotId: BotId
  timeframe: Timeframe
  bots: Record<BotId, MockBotState>
}

type Action =
  | { type: "INIT_DONE" }
  | { type: "TICK" }
  | { type: "SET_ACTIVE_BOT"; botId: BotId }
  | { type: "SET_TIMEFRAME"; timeframe: Timeframe }
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | { type: "UPDATE_CONFIG"; config: BotConfig }
  | { type: "RESET_CONFIG" }

function round(value: number, precision: number): number {
  const f = 10 ** precision
  return Math.round(value * f) / f
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function freshScenario(config: BotConfig): Pick<MockBotState, "positions" | "trades" | "balance" | "realizedPnl"> {
  return {
    positions: [],
    trades: [],
    balance: { quote: config.initialQuoteBalance, base: 0 },
    realizedPnl: 0,
  }
}

function makeCandleMap(symbol: SymbolId): CandleMap {
  return {
    "1m": generateCandles(symbol, "1m"),
    "5m": generateCandles(symbol, "5m"),
    "15m": generateCandles(symbol, "15m"),
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

function updateCandleMap(candles: CandleMap, price: number): CandleMap {
  return {
    "1m": updateLastCandle(candles["1m"], price),
    "5m": updateLastCandle(candles["5m"], price),
    "15m": updateLastCandle(candles["15m"], price),
  }
}

function makeBotState(definition: (typeof MOCK_BOTS)[number]): MockBotState {
  return {
    id: definition.id,
    botStatus: definition.status,
    connection: definition.connection,
    config: definition.config,
    candles: makeCandleMap(definition.config.symbol),
    currentPrice: definition.currentPrice,
    previousPrice: definition.currentPrice,
    priceDir: null,
    positions: definition.positions,
    trades: definition.trades,
    balance: definition.balance,
    realizedPnl: definition.realizedPnl,
  }
}

function initialState(): State {
  const bots = Object.fromEntries(MOCK_BOTS.map((definition) => [definition.id, makeBotState(definition)])) as Record<
    BotId,
    MockBotState
  >

  return {
    loading: true,
    activeBotId: "bot-hype",
    timeframe: "5m",
    bots,
  }
}

function fillSell(bot: MockBotState, position: Position): MockBotState {
  const meta = getSymbolMeta(bot.config.symbol)
  const execPrice = round(position.sellTarget * (1 - bot.config.slippageRate), meta.pricePrecision)
  const gross = execPrice * position.quantity
  const fee = round(gross * bot.config.feeRate, 2)
  const pnl = round(
    (execPrice - position.buyPrice) * position.quantity - position.buyFee - fee,
    2,
  )
  const trade: Trade = {
    id: makeId("t"),
    timestamp: Date.now(),
    symbol: bot.config.symbol,
    side: "SELL",
    gridPrice: position.sellTarget,
    executionPrice: execPrice,
    quantity: position.quantity,
    fee,
    pnl,
  }

  return {
    ...bot,
    positions: bot.positions.filter((candidate) => candidate.id !== position.id),
    trades: [trade, ...bot.trades].slice(0, 80),
    balance: {
      quote: round(bot.balance.quote + gross - fee, 4),
      base: round(bot.balance.base - position.quantity, 6),
    },
    realizedPnl: round(bot.realizedPnl + pnl, 2),
  }
}

function fillBuy(bot: MockBotState, level: ReturnType<typeof buildGridLevels>[number]): MockBotState {
  const meta = getSymbolMeta(bot.config.symbol)
  const interval = gridInterval(bot.config)
  const buyPrice = round(level.price * (1 + bot.config.slippageRate), meta.pricePrecision)
  const quantity = round(bot.config.orderAmount / buyPrice, 6)
  const fee = round(bot.config.orderAmount * bot.config.feeRate, 2)
  const trade: Trade = {
    id: makeId("t"),
    timestamp: Date.now(),
    symbol: bot.config.symbol,
    side: "BUY",
    gridPrice: level.price,
    executionPrice: buyPrice,
    quantity,
    fee,
  }
  const position: Position = {
    id: makeId("pos"),
    gridId: level.index,
    symbol: bot.config.symbol,
    gridPrice: level.price,
    buyPrice,
    buyFee: fee,
    quantity,
    sellTarget: round(level.price + interval, meta.pricePrecision),
    openedAt: Date.now(),
  }

  return {
    ...bot,
    positions: [...bot.positions, position],
    trades: [trade, ...bot.trades].slice(0, 80),
    balance: {
      quote: round(bot.balance.quote - bot.config.orderAmount - fee, 4),
      base: round(bot.balance.base + quantity, 6),
    },
  }
}

function tickBot(bot: MockBotState): MockBotState {
  const meta = getSymbolMeta(bot.config.symbol)
  const previousMarketPrice = bot.currentPrice
  const volatility = meta.referencePrice * 0.0018

  // Random walk with light mean reversion toward this bot's own grid range.
  const mid = (bot.config.lowerPrice + bot.config.upperPrice) / 2
  let price = previousMarketPrice + (Math.random() - 0.5) * volatility * 2
  price += (mid - price) * 0.015
  const floor = bot.config.lowerPrice * 0.97
  const ceil = bot.config.upperPrice * 1.03
  price = round(Math.min(ceil, Math.max(floor, price)), meta.pricePrecision)

  const priceDir: "up" | "down" | null =
    price > previousMarketPrice ? "up" : price < previousMarketPrice ? "down" : bot.priceDir
  const updated: MockBotState = {
    ...bot,
    currentPrice: price,
    previousPrice: price,
    priceDir,
    candles: updateCandleMap(bot.candles, price),
  }

  // The first update after START only establishes Previous Price.
  if (bot.previousPrice === null || bot.botStatus !== "RUNNING") return updated

  let next = updated
  const previousPrice = bot.previousPrice

  if (price > previousPrice) {
    const sellPositions = bot.positions
      .filter((position) => previousPrice < position.sellTarget && price >= position.sellTarget)
      .sort((a, b) => a.sellTarget - b.sellTarget)

    for (const position of sellPositions) {
      if (next.positions.some((candidate) => candidate.id === position.id)) {
        next = fillSell(next, position)
      }
    }
  } else if (price < previousPrice) {
    const levels = buildGridLevels(next.config, new Set(next.positions.map((position) => position.gridId)))
      .filter(
        (level) =>
          level.index >= 1 &&
          level.index <= next.config.gridCount - 1 &&
          level.state === "READY" &&
          previousPrice > level.price &&
          price <= level.price,
      )
      .sort((a, b) => b.price - a.price)

    for (const level of levels) {
      const estimatedFee = round(next.config.orderAmount * next.config.feeRate, 2)
      if (next.balance.quote < next.config.orderAmount + estimatedFee) break
      if (!next.positions.some((position) => position.gridId === level.index)) {
        next = fillBuy(next, level)
      }
    }
  }

  return next
}

function updateActiveBot(state: State, update: (bot: MockBotState) => MockBotState): State {
  const activeBot = state.bots[state.activeBotId]
  return {
    ...state,
    bots: { ...state.bots, [state.activeBotId]: update(activeBot) },
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT_DONE":
      return { ...state, loading: false }
    case "TICK":
      return {
        ...state,
        bots: Object.fromEntries(
          Object.entries(state.bots).map(([id, bot]) => [id, tickBot(bot)]),
        ) as Record<BotId, MockBotState>,
      }
    case "SET_ACTIVE_BOT":
      return action.botId === state.activeBotId ? state : { ...state, activeBotId: action.botId }
    case "SET_TIMEFRAME":
      return { ...state, timeframe: action.timeframe }
    case "START":
      return updateActiveBot(state, (bot) =>
        bot.botStatus === "STOPPED"
          ? { ...bot, botStatus: "RUNNING", previousPrice: null, priceDir: null }
          : bot,
      )
    case "PAUSE":
      return updateActiveBot(state, (bot) =>
        bot.botStatus === "RUNNING" ? { ...bot, botStatus: "PAUSED" } : bot,
      )
    case "RESUME":
      return updateActiveBot(state, (bot) =>
        bot.botStatus === "PAUSED" ? { ...bot, botStatus: "RUNNING" } : bot,
      )
    case "STOP":
      return updateActiveBot(state, (bot) =>
        bot.botStatus === "STOPPED" ? bot : { ...bot, botStatus: "STOPPED" },
      )
    case "UPDATE_CONFIG":
      return updateActiveBot(state, (bot) => {
        if (bot.botStatus !== "STOPPED" || bot.positions.length > 0) return bot
        const config = { ...action.config, symbol: bot.config.symbol }
        const currentPrice = getSymbolMeta(config.symbol).referencePrice
        return {
          ...bot,
          config,
          currentPrice,
          previousPrice: currentPrice,
          priceDir: null,
          candles: makeCandleMap(bot.config.symbol),
          ...freshScenario(config),
        }
      })
    case "RESET_CONFIG":
      return updateActiveBot(state, (bot) => {
        if (bot.botStatus !== "STOPPED" || bot.positions.length > 0) return bot
        const config = configForSymbol(bot.config.symbol)
        const currentPrice = getSymbolMeta(config.symbol).referencePrice
        return {
          ...bot,
          config,
          currentPrice,
          previousPrice: currentPrice,
          priceDir: null,
          candles: makeCandleMap(config.symbol),
          ...freshScenario(config),
        }
      })
    default:
      return state
  }
}

interface BotStore extends State {
  botStatus: BotStatus
  connection: ConnectionStatus
  config: BotConfig
  symbol: SymbolId
  candles: Candle[]
  currentPrice: number
  priceDir: "up" | "down" | null
  positions: Position[]
  trades: Trade[]
  balance: PaperBalance
  realizedPnl: number
  configEditable: boolean
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
    const bot = state.bots[state.activeBotId]
    const openGridIds = new Set(bot.positions.map((position) => position.gridId))
    return {
      ...state,
      botStatus: bot.botStatus,
      connection: bot.connection,
      config: bot.config,
      symbol: bot.config.symbol,
      candles: bot.candles[state.timeframe],
      currentPrice: bot.currentPrice,
      priceDir: bot.priceDir,
      positions: bot.positions,
      trades: bot.trades,
      balance: bot.balance,
      realizedPnl: bot.realizedPnl,
      configEditable: bot.botStatus === "STOPPED" && bot.positions.length === 0,
      gridLevels: buildGridLevels(bot.config, openGridIds),
      portfolio: computePortfolio(
        bot.balance,
        bot.positions,
        bot.realizedPnl,
        bot.currentPrice,
        bot.config.initialQuoteBalance,
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
