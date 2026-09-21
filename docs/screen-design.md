# Screen Design

## 1. Purpose

Grid Trading Bot v1の画面構成、表示情報、ユーザー操作、
リアルタイム更新対象を定義する。

本システムでは、
Grid Tradingの状態とMarket Dataを1画面で把握できる
Dashboard形式のUIを採用する。

v1では画面数を増やしすぎず、
主要機能をDashboardへ集約する。

---

## 2. Design Concept

UIの基本方針は以下とする。

```text
Dark Theme

Chart First

Trading Dashboard

Realtime Status

Minimal

Dense but Readable
```

一般的な暗号資産取引画面を参考にしつつ、
実際のExchange画面ほど情報量を増やさない。

Grid Trading Botの検証に必要な情報へ集中する。

主役は、

```text
Candlestick Chart
+
Grid Lines
+
BUY / SELL
```

とする。

---

## 3. Main Screen

v1では基本的に以下の1画面を使用する。

```text
/dashboard
```

Dashboardでは以下を確認・操作できる。

```text
Market

Bot Status

Current Price

Chart

Grid

Paper Account

PnL

Open Positions

Trade History

Bot Configuration

Bot Control
```

---

## 4. Overall Layout

Desktopでは以下の構成を基本とする。

```text
┌──────────────────────────────────────────────────────────────┐
│ Header                                                       │
│ Symbol | Current Price | Bot Status | Connection Status      │
├───────────────────────────────────────────┬──────────────────┤
│                                           │                  │
│                                           │ Bot Control      │
│                                           │                  │
│             Candlestick Chart             │ Bot Settings     │
│                                           │                  │
│             + Volume                      │                  │
│             + Grid Lines                  │                  │
│             + BUY / SELL                  │                  │
│                                           │                  │
├───────────────────────────────────────────┴──────────────────┤
│ Portfolio / PnL Summary                                     │
├──────────────────────────────────────────────────────────────┤
│ Open Positions | Trade History                              │
└──────────────────────────────────────────────────────────────┘
```

Chartを最も大きな領域として扱う。

---

# 5. Header

HeaderにはMarketおよびBotの現在状態を表示する。

表示項目：

```text
Symbol

Current Price

Price Update Indicator

Bot Status

Market Data Connection Status
```

例：

```text
HYPE / USDC

$52.48

RUNNING

● LIVE
```

Bot Status：

```text
RUNNING
PAUSED
STOPPED
```

Connection Status：

```text
LIVE
RECONNECTING
DISCONNECTED
```

Bot StatusとMarket Connection Statusは別々に表示する。

---

# 6. Symbol Selector

Headerから対象Symbolを選択できる。

例：

```text
HYPE / USDC
BTC / USDC
ETH / USDC
SOL / USDC
```

v1ではSelect / Combobox形式とする。

Symbol変更時は、

```text
Current Price
Chart
Volume
Historical Candle
```

を選択Symbolに切り替える。

BotがRUNNINGの場合のSymbol変更可否については、
Bot Configの制約に従う。

---

# 7. Current Price

Current Priceには、
BackendがGrid判定に使用しているLatest Trade Priceを表示する。

表示例：

```text
$52.4812
```

価格更新時に、
過度にならない軽いVisual Feedbackを入れてもよい。

例：

```text
price flash
```

ただしGridStrategyへ届く全Tradeごとに
Frontend全体を再描画する必要はない。

---

# 8. Main Chart

Main Chartには、

```text
Candlestick

Volume

Current Price

Upper Price

Lower Price

Grid Lines

BUY Marker

SELL Marker
```

を表示する。

Chart Libraryは、

```text
TradingView Lightweight Charts
```

を使用する。

---

# 9. Timeframe

Chart上部にTimeframe Selectorを配置する。

```text
1m
5m
15m
```

Default：

```text
5m
```

選択したTimeframeに応じて、
Historical CandleおよびRealtime Candleを切り替える。

---

# 10. Candlestick

Historical Candleは、

```text
Hyperliquid candleSnapshot
```

から取得する。

Realtime Candleは、

```text
Hyperliquid WebSocket candle
```

から更新する。

Bot開始前のHistorical Candleも表示する。

ただしBot開始前には
Paper TradingのBUY / SELL Markerは存在しない。

---

# 11. Volume

Candlestick Chart下部にVolumeを表示する。

Chart全体を圧迫しすぎない高さとする。

Volumeは選択TimeframeのCandle Volumeを使用する。

---

# 12. Current Price Line

最新価格を水平線としてChart上に表示する。

右端にPrice Labelを表示する。

例：

```text
52.4812
```

Grid Lineとは視覚的に区別する。

---

# 13. Grid Lines

Bot Configから生成されたGrid Levelを
Chart上に水平線として表示する。

例：

```text
Upper Price

──────── Grid 5

──────── Grid 4

──────── Grid 3

──────── Grid 2

──────── Grid 1

Lower Price
```

Upper / Lower Priceは
Grid Rangeの境界として認識できる表示にする。

---

# 14. Grid State

必要に応じてGrid Lineの状態を視覚的に区別する。

Grid State：

```text
READY

OPEN
```

OPENは、
そのGridに対応するOpen Positionが存在している状態を表す。

ただしUIを複雑化させる場合は、
v1では全Gridを同じ形式で表示してもよい。

---

# 15. BUY / SELL Marker

Paper Tradingで実際に発生したTradeを
Chart上にMarkerとして表示する。

```text
BUY
SELL
```

BUY Marker：

```text
Trade Timestamp
Buy Execution Price
```

SELL Marker：

```text
Trade Timestamp
Sell Execution Price
```

MarkerはHistorical Market Tradeではなく、
本Botが実行したPaper Tradingのみを表示する。

---

# 16. Bot Control Panel

DesktopではChart右側にBot Control Panelを配置する。

主な表示・操作：

```text
Status

Start

Pause

Resume

Stop

Bot Settings
```

Bot Statusに応じて
利用可能なButtonを切り替える。

---

# 17. RUNNING State

RUNNINGの場合：

```text
Pause

Stop
```

を操作可能とする。

設定値編集は原則不可とする。

Botが動作していることが
一目で分かる表示とする。

---

# 18. PAUSED State

PAUSEDの場合：

```text
Resume

Stop
```

を操作可能とする。

PAUSED中もCurrent PriceとChartは更新する。

Paper Tradingは停止する。

---

# 19. STOPPED State

STOPPEDの場合：

```text
Start
```

を操作可能とする。

以下の条件を満たす場合、
Bot Configを編集可能とする。

```text
Bot Status = STOPPED

AND

Open Position Count = 0
```

---

# 20. Bot Settings

Bot設定項目：

```text
Symbol

Lower Price

Upper Price

Grid Count

Order Amount

Initial Quote Balance

Fee Rate

Slippage Rate
```

Grid Countは、

```text
Grid Interval Count
```

を意味する。

Grid Line Count：

```text
Grid Count + 1
```

---

# 21. Bot Settings Form

Formには、

```text
React Hook Form

Zod
```

を利用する。

入力Validation：

```text
Lower Price > 0

Upper Price > Lower Price

Grid Count > 0

Order Amount > 0

Initial Quote Balance > 0

Fee Rate >= 0

Slippage Rate >= 0
```

Server Side Validationも別途実施する。

---

# 22. Grid Preview

Bot Settingsを編集している際、
可能であればGrid Previewを表示する。

例：

```text
Lower
50

Upper
60

Grid Count
5

↓

Grid Interval
2

Grid Lines

50
52
54
56
58
60
```

v1で実装コストが高い場合は必須としない。

---

# 23. Portfolio Summary

Chart下部にPortfolio Summaryを表示する。

主要項目：

```text
Portfolio Value

Total PnL

Realized PnL

Unrealized PnL

Return
```

Card形式を基本とする。

例：

```text
Portfolio
$10,284.20

Total PnL
+$284.20

Realized
+$192.00

Unrealized
+$92.20

Return
+2.84%
```

---

# 24. Paper Account

Paper Tradingの仮想残高を表示する。

```text
Quote Balance

Base Balance
```

例：

```text
USDC
8,450.00

HYPE
34.5000
```

Real Wallet Balanceと誤認されないよう、

```text
Paper Account
```

であることを明確に表示する。

---

# 25. Open Positions

Open PositionをTableで表示する。

Columns：

```text
Symbol

Grid Price

Buy Execution Price

Quantity

Sell Target

Unrealized PnL

Opened At
```

必要に応じて、

```text
Position ID
Grid ID
```

は画面上では省略してよい。

---

# 26. Trade History

Paper Tradingで発生したTrade履歴を表示する。

Columns：

```text
Timestamp

Symbol

Side

Grid Price

Execution Price

Quantity

Fee

PnL
```

Side：

```text
BUY

SELL
```

BUYの場合はPnLを空欄または `-` としてよい。

SELL時にRealized PnLを表示する。

---

# 27. Bottom Panel

Open PositionsとTrade Historyは、
同じ領域でTab切り替えとする。

```text
[ Open Positions ] [ Trade History ]
```

Default：

```text
Open Positions
```

これにより画面の縦方向への肥大化を抑える。

---

# 28. Trade Detail

v1ではTrade Detail専用Pageを作らない。

必要に応じてTable Row選択時に
Dialog / Sheetを表示できる。

ただしMVP必須ではない。

---

# 29. Realtime Update

Realtimeで更新する主な項目：

```text
Current Price

Bot Status

Market Connection Status

Candlestick

Volume

Portfolio Value

Unrealized PnL

Total PnL

Paper Balance

Open Positions

Trade History
```

BUY / SELL発生時には、
Chart MarkerおよびTableを更新する。

---

# 30. SSE Connection

FrontendはBackendのSSEへ接続する。

SSE切断時には、

```text
RECONNECTING
```

などの状態を表示する。

再接続後は、
REST APIからCurrent Stateを再取得する想定とする。

画面上でRealtime Dataが正常かどうかを
認識できるようにする。

---

# 31. Loading State

初期表示中はSkeletonを利用する。

対象：

```text
Chart

PnL Summary

Open Positions

Trade History

Bot Config
```

大量のSpinner表示は避ける。

---

# 32. Empty State

Positionが存在しない場合：

```text
No open positions
```

Tradeが存在しない場合：

```text
No trades yet
```

Bot未作成の場合：

```text
Configure your grid bot to get started
```

などのEmpty Stateを表示する。

---

# 33. Error State

主なError：

```text
Market Data unavailable

Backend unavailable

Failed to load historical candles

Failed to start bot

Invalid bot configuration
```

Error発生時は、

```text
Toast

Inline Message

Connection Status
```

を用途に応じて利用する。

---

# 34. Confirmation Dialog

以下の操作では必要に応じてConfirmationを表示する。

```text
Stop Bot

Bot Config Reset
```

Pauseについては
Confirmationなしでもよい。

---

# 35. Paper Trading Label

ユーザーがReal Tradingと誤認しないよう、
画面上に明確に、

```text
PAPER TRADING
```

を表示する。

HeaderまたはBot Control Panelに
Badgeとして常時表示する。

---

# 36. Color Usage

Dark Themeを基本とする。

色の役割：

```text
Positive
→ Green系

Negative
→ Red系

BUY
→ Green系

SELL
→ Red系

Neutral
→ Gray系

Warning
→ Yellow / Orange系
```

ただし彩度を高くしすぎず、
Chartが主役になるようにする。

---

# 37. Visual Priority

画面上の情報優先度は以下とする。

```text
1. Chart

2. Current Price / Bot Status

3. Bot Control

4. PnL

5. Positions

6. Trade History

7. Secondary Information
```

同じ情報を複数箇所へ
過剰に重複表示しない。

---

# 38. Responsive Design

Desktopを主要対象とする。

想定：

```text
1440px以上
→ Full Dashboard

1024px程度
→ Right Panel縮小

Mobile
→ Monitoring中心
```

v1ではDesktop操作を優先する。

MobileではChart、Bot Status、PnLなどの
確認を優先し、
複雑なGrid設定操作はDesktop中心でもよい。

---

# 39. Desktop Target

主な開発Target：

```text
1440 × 900

1920 × 1080
```

Chartが十分な高さを確保できるようにする。

---

# 40. Accessibility

最低限以下に対応する。

```text
Button Label

Form Label

Keyboard Focus

Colorだけに依存しないStatus表示

Readable Contrast
```

例えば、

```text
Green Dotのみ
```

ではなく、

```text
● LIVE
```

のように文字でも状態を表示する。

---

# 41. v0 Prototype Scope

v0ではBackendとの実通信を実装しない。

Dummy / Mock Dataを使用して、
UIとInteractionを確認する。

v0で作成する対象：

```text
Dashboard

Header

Symbol Selector

Current Price

Status Badge

Chart Area

Volume Area

Grid Lines

BUY / SELL Marker

Bot Control Panel

Bot Settings Form

Portfolio Summary

Paper Balance

Open Positions Table

Trade History Table

Loading State

Empty State
```

実際のHyperliquid API接続は、
Backend実装時に行う。

---

# 42. v0 Dummy Data

Prototypeでは、
以下のようなDummy Dataを使用してよい。

```text
Symbol
HYPE / USDC

Current Price
52.48

Bot Status
RUNNING

Connection
LIVE

Lower Price
45

Upper Price
60

Grid Count
10

Order Amount
100 USDC

Quote Balance
8,450 USDC

Base Balance
34.5 HYPE

Portfolio Value
10,284.20 USDC

Total PnL
+284.20 USDC

Return
+2.84%
```

Chart DataはMock Candleを利用する。

---

# 43. Out of Scope

v1 Screen Designでは以下を対象外とする。

```text
Real Trading

Deposit / Withdrawal

Wallet Connection

Order Book

Depth Chart

Leverage

Short Position

Funding Rate

Backtesting UI

AI Optimization

Multiple Strategy Dashboard

Advanced Analytics

Admin Screen

User Management
```

---

# 44. Screen Summary

Grid Trading Bot v1では、
1画面のDashboardを中心とする。

```text
Header

├─ Symbol
├─ Current Price
├─ Bot Status
├─ Connection Status
└─ PAPER TRADING

Main

├─ Candlestick Chart
│  ├─ Volume
│  ├─ Current Price
│  ├─ Grid Lines
│  └─ BUY / SELL Marker
│
└─ Bot Control Panel
   ├─ Start / Pause / Resume / Stop
   └─ Bot Settings

Summary

├─ Portfolio Value
├─ Total PnL
├─ Realized PnL
├─ Unrealized PnL
├─ Return
├─ Quote Balance
└─ Base Balance

Bottom

├─ Open Positions
└─ Trade History
```

Grid Tradingの状態と結果を、
Dashboardを開くだけで把握できるUIを目指す。