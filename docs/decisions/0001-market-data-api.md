# 0001 Market Data APIの選定

## Status

Accepted

## Date

2026-09-20

---

## 1. Context

Grid Trading Bot v1では、実際の暗号資産市場からリアルタイムのMarket Dataを取得し、
Grid Trading戦略の判定およびPaper Tradingに利用する。

v1では実際の注文は行わないため、
注文APIではなくMarket Data APIのみを利用する。

本プロジェクトでは特定の暗号資産だけを対象とせず、
複数のSpot銘柄に対してGrid Tradingを検証できる構成を目指す。

対象銘柄の例：

```text
BTC
ETH
SOL
HYPE
その他HyperliquidでMarket Dataを取得可能なSpot銘柄
```

HYPEは検証対象として利用可能な銘柄の一つとするが、
本プロジェクトの主要対象として固定しない。

本資料では、Grid Trading Bot v1で使用するMarket Data APIを選定する。

候補は以下とする。

- Hyperliquid API
- Binance Spot Market Data API

Market Dataの具体的なStream選択については、
`0002-market-data-stream.md` で別途決定する。

---

## 2. Requirements

`requirements.md` から、Market Data APIに求める要件を以下とする。

### 必須要件

- 暗号資産のリアルタイム価格を取得できる
- WebSocketによるリアルタイムデータ取得に対応している
- Spot Market Dataを取得できる
- Tradeデータを取得できる
- ローソク足データを取得できる
- Volumeを取得できる
- 1分足を取得できる
- 5分足を取得できる
- 15分足を取得できる
- Paper Trading用途で利用できる
- Market Data取得のために注文権限を必要としない
- 複数の暗号資産を対象にできる

### 重視する要件

- リアルタイム処理との相性が良い
- Grid Tradingの検証に必要なデータが揃っている
- API仕様が公開されている
- Market Data取得と実注文を分離できる
- BTC等の主要銘柄を扱える
- HYPE等のHyperliquid上の銘柄も選択肢に含められる

---

## 3. Candidate 1: Hyperliquid API

### 3.1 概要

HyperliquidはREST APIおよびWebSocket APIを提供している。

PerpetualsだけでなくSpot Market Dataにも対応している。

Grid Trading Bot v1ではPerpetualsではなく、
Spot Market Dataのみを利用する。

v1では以下は利用しない。

```text
Perpetual Trading
Leverage
Short
Funding
Real Order
```

基本構成は以下とする。

```text
Hyperliquid Spot Market Data
        ↓
Grid Strategy
        ↓
Paper Trading
```

---

### 3.2 対象銘柄

対象銘柄は特定の暗号資産に固定しない。

HyperliquidでMarket Dataを取得可能なSpot銘柄から、
Bot設定時に対象Symbolを選択できる構成を想定する。

例：

```text
BTC
ETH
SOL
HYPE
```

HYPEについてもHyperliquid上のSpot Market Dataを取得できるため、
Grid Tradingの検証対象として利用できる。

ただし、HYPE専用Botとはしない。

---

### 3.3 Base Asset / Quote Asset

Botでは取引ペアを以下の2つの資産として扱う。

```text
Base Asset
Quote Asset
```

例：

```text
HYPE / USDC

Base Asset  = HYPE
Quote Asset = USDC
```

Paper Tradingでは、

```text
Quote Balance
Base Balance
```

を仮想残高として管理する。

例：

```text
Quote Balance
10,000 USDC

Base Balance
0 HYPE
```

対象銘柄によってBase Assetは変更される。

---

### 3.4 Spot Symbolの扱い

Hyperliquid APIでは、
Spot Marketのcoin指定にHyperliquid固有の識別方式が存在する。

一部のSpot Pairでは以下のような内部識別子を使用する。

```text
@index
```

アプリケーション側でHyperliquidの内部識別子を直接扱わない。

Spot Metadataを取得し、

```text
Application Symbol
        ↓
Spot Metadata
        ↓
Hyperliquid coin identifier
```

という変換を行う。

例えばアプリケーション内部では、

```text
HYPE/USDC
BTC/USDC
```

のような分かりやすいSymbolを使用する。

Hyperliquid固有のSymbol解決処理は
`MarketDataAdapter` 内部に閉じ込める。

GridStrategyはHyperliquid固有の識別方式に依存しない。

---

### 3.5 WebSocket

HyperliquidはWebSocketによるMarket Data配信を提供している。

利用可能な主なSubscriptionには以下がある。

```text
allMids
trades
candle
l2Book
bbo
activeAssetCtx
```

Grid Trading Bot v1では、
この中から用途ごとに必要なStreamを利用する。

具体的にどのStreamを採用するかは、

```text
0002-market-data-stream.md
```

で決定する。

---

### 3.6 Trades

`trades` Subscriptionを利用すると、
リアルタイムのTradeデータを受信できる。

Tradeデータには以下のような情報が含まれる。

```text
coin
side
price
size
timestamp
trade id
```

Grid判定用のPriceEventを生成する候補として利用できる。

---

### 3.7 Candle

`candle` Subscriptionを利用すると、
ローソク足データを取得できる。

Grid Trading Bot v1で必要となる、

```text
1m
5m
15m
```

の時間足を利用できる。

Candleには以下のような情報が含まれる。

```text
Open
High
Low
Close
Volume
Trade Count
Timestamp
```

そのため、

```text
Price History
Volume
```

の確認にも利用できる。

---

### 3.8 Historical Candle

REST APIから過去のCandleデータを取得できる。

主な指定情報：

```text
coin
interval
startTime
endTime
```

取得可能な履歴には上限が存在する。

ただし、Grid Trading Bot v1ではバックテストを対象外としているため、
管理画面で直近の価格推移を確認する用途では問題ないと判断する。

---

### 3.9 Order Book

Hyperliquidでは以下のようなMarket Dataも取得できる。

```text
l2Book
bbo
```

これらをGrid Trading Bot v1で利用するかについては、
Market Data Stream選定時に判断する。

本ADRでは使用を確定しない。

---

### 3.10 Authentication

公開Market Dataの取得では、
実際の注文を行うための秘密鍵や取引権限を必要としない。

v1では以下を使用しない。

```text
Private Key
Trading Wallet
Real Account Balance
Order Permission
```

そのため、

```text
Public Market Data
        ↓
Grid Strategy
        ↓
Paper Trading
```

という構成にできる。

これはPaper Trading専用という
`requirements.md` の安全方針と一致する。

---

### 3.11 Rate Limit

Hyperliquid APIにはRESTおよびWebSocketの利用制限が存在する。

Grid Trading Bot v1では、
単一または少数のSpot Marketを監視する想定であるため、
通常の利用範囲では十分な余裕があると判断する。

リアルタイムMarket Dataの取得は、
REST PollingではなくWebSocketを基本とする。

---

## 4. Candidate 2: Binance Spot Market Data API

### 4.1 概要

Binance Spot APIもGrid Trading Botの構築に必要な
Market Dataを提供している。

以下のようなデータを取得できる。

```text
Trade
Aggregate Trade
Ticker
Candlestick
Order Book
Volume
```

WebSocketにも対応しており、
Spot Grid BotのMarket Data Providerとして有力な選択肢である。

---

### 4.2 Binanceの利点

Binanceには以下の利点がある。

```text
APIドキュメントが充実している
利用例が多い
一般的なCEX形式で理解しやすい
Spot Marketの銘柄数が多い
Grid Botの実装事例が多い
```

BTC、ETH、SOLなどの主要な暗号資産を対象とする場合、
Binanceは有力なMarket Data Providerである。

---

### 4.3 Binanceの制約

本プロジェクトでは、
主要銘柄だけではなくHYPEのような銘柄も
Grid Tradingの検証対象に含められることを重視する。

Binance Spotで利用できない銘柄については、
Binance Spot Market Data APIからMarket Dataを取得できない。

そのため、検証対象銘柄の選択肢という点では
Hyperliquidを採用するメリットがある。

---

## 5. Comparison

| 項目 | Hyperliquid | Binance Spot |
| --- | --- | --- |
| WebSocket | ○ | ○ |
| リアルタイムTrade | ○ | ○ |
| Candlestick | ○ | ○ |
| Volume | ○ | ○ |
| 1m / 5m / 15m | ○ | ○ |
| REST Market Data | ○ | ○ |
| Public Market Data | ○ | ○ |
| Spot Market | ○ | ○ |
| BTC等の主要銘柄 | ○ | ○ |
| HYPE等Hyperliquid上の銘柄 | ○ | △ |
| APIの一般性 | Hyperliquid固有仕様あり | 高い |
| Symbolの扱いやすさ | 独自識別子あり | 比較的単純 |
| Grid Bot実装例 | 少ない | 多い |
| Hyperliquid市場との親和性 | 高い | 低い |
| 対象市場の特徴 | Hyperliquid Spot | Binance Spot |

---

## 6. Decision

Grid Trading Bot v1では、

**Hyperliquid APIをMarket Data Providerとして採用する。**

対象銘柄は特定の暗号資産に固定しない。

HyperliquidでMarket Dataを取得可能なSpot銘柄から、
Bot設定時に対象Symbolを選択できる構成とする。

例：

```text
BTC
ETH
SOL
HYPE
```

HYPEは検証対象として利用可能な銘柄の一つとする。

---

## 7. Reasons

### 7.1 Grid Tradingに必要なMarket Dataを取得できる

Hyperliquid APIから、

```text
Realtime Trade
Candle
Volume
Order Book
Best Bid / Offer
Mid Price
```

などのMarket Dataを取得できる。

Grid Trading Bot v1の要件を満たしている。

---

### 7.2 複数のSpot銘柄を対象にできる

対象銘柄をHYPEなど特定の暗号資産に固定せず、
複数のSpot銘柄をGrid Tradingの検証対象にできる。

これにより、

```text
BTC
ETH
SOL
HYPE
その他利用可能なSpot銘柄
```

など、異なる値動きを持つ銘柄を使って
Grid Tradingを検証できる。

---

### 7.3 HYPE等も選択肢に含められる

BTCなどの主要銘柄だけではなく、
HYPEのようなHyperliquid上の銘柄も検証対象として選択できる。

HYPEを主要対象に固定するわけではないが、
検証対象の幅を広げられる点を評価する。

---

### 7.4 プロジェクトとして特徴を持たせられる

BinanceではGrid Bot自体が既存機能として提供されており、
Grid Trading Botの実装例も多い。

本プロジェクトでは、

```text
Hyperliquid Market Data
+
Grid Strategy
+
Paper Trading
```

という構成を採用し、
Grid Tradingの仕組みや戦略検証そのものを実装する。

---

### 7.5 v1の既存要件を維持できる

HyperliquidはPerpetuals市場でも利用されているが、
v1ではSpot Market Dataのみを利用する。

そのため、

```text
Long Only
Shortなし
Leverageなし
Paper Tradingのみ
実注文なし
```

という`requirements.md`の方針を維持できる。

---

### 7.6 Public Market Dataのみで構築できる

実注文を行わないため、
秘密鍵や取引権限を持つAPI Keyを利用する必要がない。

以下の構成にできる。

```text
Hyperliquid Market Data
        ↓
MarketDataAdapter
        ↓
GridStrategy
        ↓
PaperExecutionEngine
```

Market Data取得と実注文を明確に分離できる。

---

### 7.7 API固有仕様をAdapterに閉じ込められる

HyperliquidではSpot Symbolなどに独自仕様が存在する。

ただし、

```text
HyperliquidMarketDataAdapter
```

を設けることで、

```text
Hyperliquid API
        ↓
HyperliquidMarketDataAdapter
        ↓
共通PriceEvent
        ↓
GridStrategy
```

という構成にできる。

GridStrategyやPaperExecutionEngineを
Hyperliquid固有仕様から分離できる。

---

## 8. Consequences

Hyperliquid APIを採用することで、
以下への対応が必要となる。

### 8.1 Spot Symbolの解決

HyperliquidのSpot Marketでは独自の内部識別子が存在する。

そのため、Spot Metadataを利用して、

```text
Application Symbol
↓
Hyperliquid Symbol
```

を変換する処理が必要になる。

---

### 8.2 WebSocket接続管理

リアルタイムMarket DataはWebSocketを利用する。

そのため、以下を考慮する必要がある。

```text
接続
切断検知
再接続
再Subscription
重複イベント対策
```

具体的な設計は `architecture.md` で定義する。

---

### 8.3 Historical Candleの制限

APIから取得できるHistorical Candleには上限が存在する。

v1ではバックテストを対象外としているため、
この制限は許容する。

大量のHistorical Dataが必要になった場合は、
別途データ収集方式を検討する。

---

### 8.4 Hyperliquid固有仕様への依存

Market Data取得部分では、
Hyperliquid固有のAPI仕様を扱う必要がある。

そのため、この依存をMarketDataAdapter内部に限定する。

以下のコンポーネントはHyperliquid APIへ直接依存させない。

```text
GridStrategy
PaperExecutionEngine
Position Management
PnL Calculation
```

---

## 9. Alternatives

### Binance Spot Market Data API

Binanceは以下の点で有力である。

```text
APIの一般性
情報量
実装例
主要銘柄の豊富さ
Spot APIの分かりやすさ
```

一般的なGrid Trading Botを構築するだけであれば、
Binanceを採用する合理性は高い。

一方、本プロジェクトでは
Hyperliquid上のSpot銘柄も含めて検証対象を選択できることを評価し、
Hyperliquid APIを採用する。

---

## 10. Out of Scope

本ADRでは以下を決定しない。

```text
Grid判定に使用するWebSocket Subscription
チャート表示に使用するMarket Data
PriceEventの具体的な構造
保存するMarket Dataの詳細

Frontend技術
Backend技術
Database
Chart Library
```

これらは後続資料で決定する。

次の設計判断は、

```text
0002-market-data-stream.md
```

とする。

---

## 11. References

調査には以下の公式資料を利用した。

### Hyperliquid

- Hyperliquid Docs - Info Endpoint
- Hyperliquid Docs - WebSocket Subscriptions
- Hyperliquid Docs - Rate Limits and User Limits

### Binance

- Binance Spot API Documentation
- Binance Spot WebSocket Streams
- Binance HYPE information page