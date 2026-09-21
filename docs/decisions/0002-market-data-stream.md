# 0002 Market Data Streamの選定

## Status

Accepted

## Date

2026-09-20

---

## 1. Context

`0001-market-data-api.md` において、
Grid Trading Bot v1のMarket Data Providerとして
Hyperliquid APIを採用した。

本資料では、Hyperliquidが提供するMarket Dataのうち、
Grid Trading Bot v1でどのデータをどの用途に利用するかを決定する。

主な用途は以下とする。

```text
Grid判定
Current Price
Price History
Candlestick
Volume
```

Hyperliquidでは複数種類のWebSocket Subscriptionが提供されている。

主な候補：

```text
trades
allMids
bbo
candle
l2Book
```

これらを比較し、
v1で利用するMarket Data Streamを決定する。

---

## 2. Requirements

Market Data Streamには以下を求める。

### Grid判定

- リアルタイムの価格変動を取得できる
- Gridラインを跨いだことを検知できる
- 可能な限り実際の市場取引に近い価格を使用できる
- 時系列順にPriceEventを生成できる

### Current Price

- BotがGrid判定に使用している価格と整合する
- Web画面で最新価格として表示できる

### Price History

- 価格推移を表示できる
- 1分足を取得できる
- 5分足を取得できる
- 15分足を取得できる

### Volume

- ローソク足単位のVolumeを取得できる

---

## 3. Candidate: trades

### 3.1 概要

`trades` Subscriptionは、
対象Marketで実際に成立したTradeをリアルタイムで受信する。

Subscription例：

```json
{
  "method": "subscribe",
  "subscription": {
    "type": "trades",
    "coin": "<coin>"
  }
}
```

Tradeには以下の情報が含まれる。

```text
coin
side
price
size
timestamp
trade id
```

---

### 3.2 Grid判定との相性

Grid Tradingでは、

```text
Previous Price
Current Price
```

を比較してGridラインを跨いだことを判定する。

例えば、

```text
Previous Price = 101
Current Price  = 99
Grid Price     = 100
```

の場合、

```text
101 > 100
かつ
99 <= 100
```

となるためBUY条件が成立する。

`trades` は実際に成立したTrade Priceを順次取得できるため、
このGrid通過判定との相性が良い。

---

### 3.3 Current Price

Web画面に表示するCurrent Priceについても、

```text
最後に受信したTrade Price
```

を使用する。

これにより、

```text
Botが判断に使っている価格
```

と、

```text
画面に表示されている価格
```

を一致させる。

---

### 3.4 注意点

Tradeイベントは配列として受信する場合があるため、
MarketDataAdapterでは各Tradeを個別のPriceEventへ変換する。

例：

```text
WsTrade[]
↓
Trade
Trade
Trade
↓
PriceEvent
PriceEvent
PriceEvent
```

Trade IDおよびTimestampを利用し、
必要に応じて重複イベントを防止できる設計とする。

具体的な重複排除方式については
`architecture.md` で定義する。

---

## 4. Candidate: allMids

### 4.1 概要

`allMids` は、
複数MarketのMid Priceをまとめて取得するSubscriptionである。

データ形式：

```text
coin -> mid price
```

多数の銘柄の現在価格を効率よく取得する用途に適している。

---

### 4.2 Grid判定との比較

Mid Priceは実際に成立したTrade Priceとは異なる。

Grid Bot v1では、

```text
実際に市場でTradeが成立した価格
```

をGrid判定の基準としたい。

そのため、

```text
allMids
```

ではなく、

```text
trades
```

をGrid判定に採用する。

---

### 4.3 v1での扱い

v1では使用しない。

多数銘柄の一覧画面などを実装する場合には、
利用を再検討できる。

---

## 5. Candidate: bbo

### 5.1 概要

`bbo` はBest Bid / Best Offerを取得するSubscriptionである。

取得できる情報：

```text
Best Bid
Best Ask
```

Best Bid / Askが変化した場合に更新される。

---

### 5.2 利用可能な用途

以下のような用途では有効である。

```text
Spread確認
Bid / Ask表示
Market Orderの約定価格推定
より現実的なSlippage計算
```

---

### 5.3 v1での扱い

v1ではSlippageを設定値としてPaper Tradingへ適用する。

そのため、

```text
Bid / Ask
```

から実際のSpreadを計算する必要はない。

v1では使用しない。

---

## 6. Candidate: l2Book

### 6.1 概要

`l2Book` はOrder Bookデータを取得するSubscriptionである。

以下の情報を取得できる。

```text
Bid Price
Bid Size

Ask Price
Ask Size

Order Count
```

複数価格レベルの板情報を取得できる。

---

### 6.2 利用可能な用途

以下のような高度なPaper Tradingでは有効である。

```text
Market Impact
Liquidity
Order Book Depth
Slippage推定
Large Order Simulation
```

---

### 6.3 v1での扱い

Grid Trading Bot v1では、

```text
固定Slippage
```

を使用する。

Order Bookを利用した約定シミュレーションは行わない。

そのため `l2Book` は使用しない。

---

## 7. Candidate: candle

### 7.1 概要

`candle` Subscriptionを利用すると、
指定した時間足のローソク足データを取得できる。

Subscription例：

```json
{
  "method": "subscribe",
  "subscription": {
    "type": "candle",
    "coin": "<coin>",
    "interval": "5m"
  }
}
```

v1で利用する時間足：

```text
1m
5m
15m
```

---

### 7.2 Candle Data

Candleには以下の情報が含まれる。

```text
Open Timestamp
Close Timestamp

Open
High
Low
Close

Volume
Trade Count
```

そのため、

```text
Price History
Candlestick
Volume
```

を表示する用途に適している。

---

### 7.3 Grid判定には使用しない

Candleには一定期間の価格変動が集約される。

例えば1分足の場合、

```text
Open
High
Low
Close
```

は確認できるが、

その1分間に、

```text
100
↓
98
↓
101
```

と動いたのか、

```text
100
↑
101
↓
98
```

と動いたのかを正確に判別できない。

Grid Tradingでは価格がGridを跨いだ順序が重要である。

そのため、

```text
candle
```

はGrid判定には使用しない。

Grid判定には `trades` を使用する。

---

## 8. Historical Candle

Web画面を開いた直後からPrice Historyを表示するため、
WebSocketの `candle` だけではなくREST APIの

```text
candleSnapshot
```

を使用する。

基本的な流れ：

```text
画面表示
↓
REST candleSnapshot
↓
過去のCandle取得
↓
Chart初期表示
↓
WebSocket candle
↓
リアルタイム更新
```

---

### 8.1 取得時間足

以下の時間足を利用する。

```text
1m
5m
15m
```

---

### 8.2 取得可能件数

Hyperliquidでは、
直近最大5000本のCandleを取得できる。

v1ではバックテストを行わないため、
チャート表示用途として十分と判断する。

---

### 8.3 Historical Candleの利用範囲

`candleSnapshot` から取得した過去Candleは、
主にチャートの初期表示および価格推移の確認に使用する。

過去Candleを利用して、
Bot停止中のGrid TradingやPaper Tradingを遡って実行することはしない。

Paper Tradingの売買判定は、

```text
Bot Status = RUNNING
かつ
Backend Process = Running
```

の期間にリアルタイムで受信した `trades` のみを対象とする。

したがって用途を以下のように分離する。

```text
Historical Candle
→ 過去チャート表示

Realtime trades
→ Grid判定 / Paper Trading
```

Botが停止していた期間に価格がGridを通過していた場合でも、
後から売買を復元したり仮想約定させたりしない。

---

### 8.4 Historical Candleの表示可能期間

`candleSnapshot` で取得可能なCandleは直近最大5000本となる。

そのため、APIから直接取得できる期間は時間足によって異なる。

目安：

| Interval | 5000本分の期間 |
| --- | --- |
| 1m | 約3.5日 |
| 5m | 約17日 |
| 15m | 約52日 |

これを超える長期間の価格履歴が必要な場合は、
アプリケーション側でMarket Dataを継続的に保存する方式を検討する。

v1では長期間のHistorical Data保持は必須要件としない。

---

## 9. Comparison

| Stream | Grid判定 | Current Price | Chart | Volume | v1 |
| --- | --- | --- | --- | --- | --- |
| trades | ◎ | ◎ | △ | △ | 採用 |
| allMids | △ | ○ | × | × | 不採用 |
| bbo | △ | ○ | × | × | 不採用 |
| candle | × | △ | ◎ | ◎ | 採用 |
| l2Book | △ | △ | × | × | 不採用 |

---

## 10. Decision

Grid Trading Bot v1では、
Market Dataを用途別に以下のように利用する。

### Grid判定

```text
WebSocket
trades
```

を使用する。

```text
trades
↓
MarketDataAdapter
↓
PriceEvent
↓
GridStrategy
```

---

### Current Price

最後に受信した `trades` のTrade Priceを使用する。

```text
Latest Trade Price
↓
Current Price
```

GridStrategyが判断に使用する価格と、
管理画面に表示する価格を一致させる。

---

### Candlestick

```text
WebSocket
candle
```

を使用する。

対象時間足：

```text
1m
5m
15m
```

---

### Volume

`candle` のVolumeを使用する。

---

### Historical Price

```text
REST
candleSnapshot
```

を使用する。

画面初期表示時にHistorical Candleを取得し、
その後WebSocketの `candle` で更新する。

Historical Priceはチャート表示用途とし、
過去のPaper Tradingを復元する用途には使用しない。

---

## 11. Data Flow

Market Dataの全体構成は以下とする。

```text
Hyperliquid
│
├─ WebSocket: trades
│       │
│       ↓
│   MarketDataAdapter
│       │
│       ↓
│   PriceEvent
│       │
│       ├─ GridStrategy
│       │
│       └─ Current Price
│
├─ WebSocket: candle
│       │
│       ↓
│   CandleEvent
│       │
│       ├─ Candlestick
│       └─ Volume
│
└─ REST: candleSnapshot
        │
        ↓
    Historical Candle
        │
        ↓
    Chart Initial Data
```

Strategy DataとVisualization Dataは分離する。

```text
Strategy Data
→ trades

Visualization Data
→ candle / candleSnapshot
```

---

## 12. WebSocket Subscription

1つのMarketを監視する場合、
最低限以下をSubscriptionする。

```text
trades

candle 1m
candle 5m
candle 15m
```

1銘柄あたり、

```text
4 subscriptions
```

となる。

複数銘柄を監視する場合は、
対象SymbolごとにSubscriptionを行う。

HyperliquidのWebSocket Subscription上限を超えないよう管理する。

---

## 13. WebSocket切断

Hyperliquid WebSocketは、
サーバー側またはネットワーク要因により切断される可能性がある。

そのためアプリケーションは以下に対応する。

```text
Connection
↓
Disconnect Detection
↓
Reconnect
↓
Re-Subscribe
```

切断中に発生したTradeについて、
後からPaper Tradingの売買として遡及実行しない。

再接続後の最初のTrade Priceを基準価格として扱い、
そこからリアルタイムのGrid判定を再開する。

具体的な接続管理については、

```text
architecture.md
```

で詳細を定義する。

---

## 14. Separation of Responsibilities

Market Data API固有のデータ構造は、
`MarketDataAdapter` 内部に閉じ込める。

GridStrategyはHyperliquidのWsTradeを直接扱わない。

例：

```text
Hyperliquid WsTrade

{
  coin
  side
  px
  sz
  time
  tid
}

↓
HyperliquidMarketDataAdapter
↓

PriceEvent

{
  symbol
  price
  timestamp
}

↓
GridStrategy
```

これにより、
GridStrategyをHyperliquid固有のAPI仕様から分離する。

---

## 15. PriceEvent

Grid判定用の共通イベントは最低限以下を持つ。

```text
symbol
price
timestamp
```

例：

```json
{
  "symbol": "HYPE/USDC",
  "price": 92.45,
  "timestamp": 1789900000000
}
```

Trade IDなどHyperliquid固有またはMarket Data管理用の情報を
PriceEventへ含めるかについては、
`architecture.md` で決定する。

---

## 16. CandleEvent

チャート用イベントは最低限以下を持つ。

```text
symbol
interval
openTime
closeTime
open
high
low
close
volume
tradeCount
```

例：

```json
{
  "symbol": "HYPE/USDC",
  "interval": "5m",
  "openTime": 1789900000000,
  "closeTime": 1789900299999,
  "open": 92.1,
  "high": 92.8,
  "low": 91.9,
  "close": 92.45,
  "volume": 15230.5,
  "tradeCount": 418
}
```

Hyperliquid固有のCandle形式から、
アプリケーション共通のCandleEventへ変換する。

---

## 17. Not Adopted in v1

以下のStreamはv1では使用しない。

### allMids

```text
Reason:
Grid判定ではActual Trade Priceを使用するため
```

### bbo

```text
Reason:
Bid / Askを利用した約定シミュレーションを行わないため
```

### l2Book

```text
Reason:
Order Bookを利用したLiquidity / Slippage計算を行わないため
```

必要になった場合は別途ADRを追加して再検討する。

---

## 18. Consequences

本Decisionにより、
GridStrategyは、

```text
Trade Price
```

を基準としてGridを判定する。

一方、

```text
Candlestick
Volume
```

については `candle` を使用する。

そのため、

```text
Strategy Data
```

と、

```text
Visualization Data
```

を明確に分離できる。

構成は以下となる。

```text
Strategy

trades
↓
PriceEvent
↓
GridStrategy


Visualization

candleSnapshot
+
candle
↓
CandleEvent
↓
Chart
```

また、Botの稼働期間とチャート表示期間は一致する必要がない。

```text
価格チャート
→ candleSnapshotによりBot起動前まで遡って表示可能

Paper Trading
→ BotがRUNNINGだった期間のみ
```

---

## 19. Out of Scope

本ADRでは以下を決定しない。

```text
WebSocketライブラリ
Frontendへのリアルタイム配信方式
WebSocket再接続の具体的な実装
Trade重複排除の具体的な実装

Market Dataの永続化方式
Price Snapshotの保存間隔
長期Historical Dataの保存方式

Database
Backend Framework
Frontend Framework
Chart Library
```

これらは、

```text
0003-tech-stack.md
architecture.md
database-design.md
```

で決定する。

---

## 20. Decision Summary

Grid Trading Bot v1では以下を採用する。

```text
Grid判定
→ WebSocket trades

Current Price
→ Latest Trade Price

Candlestick
→ WebSocket candle

Volume
→ WebSocket candle

Chart Initial History
→ REST candleSnapshot

Timeframes
→ 1m / 5m / 15m
```

Historical Candle：

```text
最大5000本

1m
→ 約3.5日

5m
→ 約17日

15m
→ 約52日
```

Historical Candleは、

```text
チャート表示
```

に使用する。

以下には使用しない。

```text
過去のGrid判定
過去のPaper Trading
停止期間中の仮想売買の復元
```

採用しないStream：

```text
allMids
bbo
l2Book
```

---

## 21. References

調査にはHyperliquid公式ドキュメントを利用した。

- Hyperliquid Docs - WebSocket
- Hyperliquid Docs - WebSocket Subscriptions
- Hyperliquid Docs - Info Endpoint
- Hyperliquid Docs - Rate Limits and User Limits