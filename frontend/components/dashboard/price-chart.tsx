"use client"

import * as React from "react"
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts"
import { TIMEFRAME_SECONDS } from "@/lib/mock-data"
import type { Candle, GridLevel, SymbolId, Timeframe, Trade } from "@/lib/types"

const COLORS = {
  up: "#2ebd85",
  down: "#e5484d",
  upFill: "rgba(46,189,133,0.4)",
  downFill: "rgba(229,72,77,0.4)",
  current: "#2bc6d6",
  gridBuy: "rgba(46,189,133,0.35)",
  gridBuyOpen: "rgba(46,189,133,0.9)",
  gridSell: "rgba(229,72,77,0.35)",
  boundary: "rgba(229,165,58,0.6)",
  text: "#8b93a7",
  grid: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
}

function snapTime(ms: number, candles: Candle[], step: number): UTCTimestamp {
  const sec = Math.floor(ms / 1000)
  const first = candles[0]?.time ?? sec
  const last = candles[candles.length - 1]?.time ?? sec
  const snapped = Math.round(sec / step) * step
  return Math.min(last, Math.max(first, snapped)) as UTCTimestamp
}

function buildMarkers(trades: Trade[], symbol: SymbolId, candles: Candle[], step: number): SeriesMarker<Time>[] {
  return trades
    .filter((t) => t.symbol === symbol)
    .map((t) => ({
      time: snapTime(t.timestamp, candles, step),
      position: t.side === "BUY" ? ("belowBar" as const) : ("aboveBar" as const),
      color: t.side === "BUY" ? COLORS.up : COLORS.down,
      shape: t.side === "BUY" ? ("arrowUp" as const) : ("arrowDown" as const),
      text: t.side === "BUY" ? "B" : "S",
    }))
    .sort((a, b) => (a.time as number) - (b.time as number))
}

export function PriceChart({
  candles,
  currentPrice,
  precision,
  symbol,
  timeframe,
  gridLevels,
  trades,
  currentPriceRef,
}: {
  candles: Candle[]
  currentPrice: number
  precision: number
  symbol: SymbolId
  timeframe: Timeframe
  gridLevels: GridLevel[]
  trades: Trade[]
  currentPriceRef?: never
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const chartRef = React.useRef<IChartApi | null>(null)
  const candleSeriesRef = React.useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = React.useRef<ISeriesApi<"Histogram"> | null>(null)
  const markersRef = React.useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  const priceLinesRef = React.useRef<IPriceLine[]>([])
  const currentLineRef = React.useRef<IPriceLine | null>(null)

  // keep latest values available inside the one-time mount effect
  const latest = React.useRef({ candles, currentPrice, precision, symbol, timeframe, gridLevels, trades })
  latest.current = { candles, currentPrice, precision, symbol, timeframe, gridLevels, trades }

  // Mount: create chart + series once.
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: COLORS.text,
        fontFamily: "var(--font-mono), monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: COLORS.text, width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#2a2f3a" },
        horzLine: { color: COLORS.text, width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#2a2f3a" },
      },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: { borderColor: COLORS.border, timeVisible: true, secondsVisible: false },
      width: container.clientWidth,
      height: container.clientHeight,
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderVisible: false,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
      priceFormat: { type: "price", precision: latest.current.precision, minMove: 10 ** -latest.current.precision },
    })
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    })
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries
    const markers = createSeriesMarkers(candleSeries, [])
    markersRef.current = markers

    const { candles: c, symbol: sym, timeframe: tf } = latest.current
    const step = TIMEFRAME_SECONDS[tf]
    candleSeries.setData(c.map((k) => ({ time: k.time as UTCTimestamp, open: k.open, high: k.high, low: k.low, close: k.close })))
    volumeSeries.setData(
      c.map((k) => ({ time: k.time as UTCTimestamp, value: k.volume, color: k.close >= k.open ? COLORS.upFill : COLORS.downFill })),
    )
    markers.setMarkers(buildMarkers(latest.current.trades, sym, c, step))
    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      markersRef.current = null
      priceLinesRef.current = []
      currentLineRef.current = null
    }
  }, [])

  // Reload full history when symbol or timeframe changes.
  React.useEffect(() => {
    const candleSeries = candleSeriesRef.current
    const volumeSeries = volumeSeriesRef.current
    const chart = chartRef.current
    if (!candleSeries || !volumeSeries || !chart) return
    candleSeries.applyOptions({ priceFormat: { type: "price", precision, minMove: 10 ** -precision } })
    candleSeries.setData(
      candles.map((k) => ({ time: k.time as UTCTimestamp, open: k.open, high: k.high, low: k.low, close: k.close })),
    )
    volumeSeries.setData(
      candles.map((k) => ({
        time: k.time as UTCTimestamp,
        value: k.volume,
        color: k.close >= k.open ? COLORS.upFill : COLORS.downFill,
      })),
    )
    chart.timeScale().fitContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe])

  // Live update of the last candle as the price ticks.
  React.useEffect(() => {
    const candleSeries = candleSeriesRef.current
    if (!candleSeries || candles.length === 0) return
    const last = candles[candles.length - 1]
    candleSeries.update({
      time: last.time as UTCTimestamp,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
    })
  }, [currentPrice, candles])

  // Current price line.
  React.useEffect(() => {
    const candleSeries = candleSeriesRef.current
    if (!candleSeries) return
    if (currentLineRef.current) {
      candleSeries.removePriceLine(currentLineRef.current)
    }
    currentLineRef.current = candleSeries.createPriceLine({
      price: currentPrice,
      color: COLORS.current,
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "Price",
    })
  }, [currentPrice])

  // Grid lines: rebuilt when the grid config or open/ready states change.
  const gridSignature = gridLevels.map((l) => `${l.price}:${l.state}`).join("|")
  React.useEffect(() => {
    const candleSeries = candleSeriesRef.current
    if (!candleSeries) return
    priceLinesRef.current.forEach((l) => candleSeries.removePriceLine(l))
    priceLinesRef.current = gridLevels.map((level) => {
      const isBoundary = level.index === 0 || level.index === gridLevels.length - 1
      const isOpen = level.state === "OPEN"
      const color = isBoundary
        ? COLORS.boundary
        : level.price < currentPrice
          ? isOpen
            ? COLORS.gridBuyOpen
            : COLORS.gridBuy
          : COLORS.gridSell
      return candleSeries.createPriceLine({
        price: level.price,
        color,
        lineWidth: 1,
        lineStyle: isBoundary ? LineStyle.Dashed : isOpen ? LineStyle.Solid : LineStyle.Dotted,
        axisLabelVisible: isBoundary || isOpen,
        title: isBoundary ? (level.index === 0 ? "Lower" : "Upper") : isOpen ? "◆" : "",
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSignature])

  // Markers from executed trades.
  React.useEffect(() => {
    if (!markersRef.current) return
    markersRef.current.setMarkers(buildMarkers(trades, symbol, candles, TIMEFRAME_SECONDS[timeframe]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades, symbol])

  return <div ref={containerRef} className="h-full w-full" aria-label="Price chart with grid lines and trade markers" role="img" />
}
