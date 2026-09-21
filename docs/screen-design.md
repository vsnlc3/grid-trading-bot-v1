# Grid Trading Bot Screen Requirements

## 1. Purpose

Grid Trading Bot v1のDashboard UI要件を定義する。

画面レイアウト、カード配置、Sidebar、Table列、Spacingなどの視覚的な詳細はFrontend実装をSource of Truthとする。
一方、Grid Tradingの業務ルール、Bot State、Paper Trading、PnL計算、残高管理は
`docs/requirements.md`をSource of Truthとする。

## 2. Design Principles

```text
Desktop-first
Dark Theme
Chart-first
Trading Dashboard
Minimal
Dense but Readable
```

実際のExchange画面ほど情報量を増やさず、Grid Tradingの検証に必要な情報へ集中する。

## 3. Dashboard

v1ではDashboardを中心とする。

Dashboardから、選択中のBotについて以下を確認・操作できること。

```text
Bot Selector
Current Price
Bot Status
Connection Status
Chart
Grid
Paper Account
Portfolio / PnL
Open Positions
Trade History
Bot Control
Bot Settings
```

複数Botを同時に稼働できる。DashboardのBot Selectorは既存BotのSymbolを変更する操作ではなく、
表示対象Botを切り替える操作とする。

例：

```text
HYPE/USDC Bot
BTC/USDC Bot
ETH/USDC Bot
```

Botを切り替えても、各BotのStatus、Config、Paper Account、Position、Trade、PnLは保持される。
非表示のBotがRUNNINGの場合、そのBotは画面の選択状態にかかわらず動作を継続する。

Botの作成・削除UIはv1の対象外とする。

## 4. Header

Headerには、選択中Botについて以下を表示する。

```text
Bot Selector
Current Price
Price Update Indicator
Bot Status
Market Data Connection Status
PAPER TRADING
```

Bot StatusとConnection Statusは別々に表示する。

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

Current Priceは、選択中BotがGrid判定に使用している価格を表示する。

## 5. Chart

ChartをDashboardの主役とする。

最低限、以下を表示する。

```text
Candlestick
Volume
Current Price Line
Upper / Lower Price
Grid Lines
BUY Marker
SELL Marker
```

Chart LibraryはTradingView Lightweight Chartsを使用する。

Timeframeは以下を提供する。

```text
1m
5m
15m
```

Defaultは5mとする。Timeframe変更時はCandle、Volume、BUY / SELL Markerを
選択中Timeframeに合わせて更新する。

BUY / SELL Markerは、Botが実行したPaper Tradingのみを表示する。
Historical Market TradeはMarkerとして表示しない。

## 6. Bot Control

選択中Botに対して以下の操作を提供する。

```text
Start
Pause
Resume
Stop
```

Bot Statusに応じて利用可能な操作を切り替える。

```text
RUNNING  -> Pause / Stop
PAUSED   -> Resume / Stop
STOPPED  -> Start
```

PAUSED中もMarket Data、Current Price、Chartは更新するが、BUY / SELLは発生させない。
STOPPEDにしてもPaper Account、Position、Trade、PnLは削除せず、未決済ポジションも自動決済しない。

## 7. Bot Settings

Bot Settingsでは選択中Botの以下を確認する。Initial Quote Balanceは既存Botでは読み取り専用とし、
その他のGrid設定は要件を満たす場合に編集できる。

```text
Lower Price
Upper Price
Grid Count
Order Amount
Initial Quote Balance
Fee Rate
Slippage Rate
```

Grid設定の変更は、以下を満たす場合のみ可能とする。

```text
Bot Status = STOPPED
Open Position Count = 0
```

BotのSymbolはBot固有の設定であり、DashboardのBot Selectorで別Botへ切り替える。
Selector操作によってBotの設定やPaper Accountをリセットしてはならない。

Initial Quote Balanceは初期Paper Account作成時の値であり、
既存Botでは読み取り専用とする。稼働開始後に残高やPnLの基準を書き換えてはならない。

## 8. Portfolio and Paper Account

選択中Botについて以下を確認できること。

```text
Portfolio Value
Total PnL
Realized PnL
Unrealized PnL
Return
Quote Balance
Base Balance
```

Paper AccountはReal Walletと誤認されないよう、PAPER TRADINGまたはPaper Accountであることを明示する。

PnL計算は`docs/requirements.md`の仕様に従う。

## 9. Positions and Trade History

選択中Botの以下を確認できること。

```text
Open Positions
Trade History
```

同じ領域でTab切替できる。DefaultはOpen Positionsとする。

BUY / SELL、Grid、Execution Price、Quantity、Fee、PnLなど、Grid Tradingの検証に必要な情報を確認できること。

## 10. Loading, Empty, and Error

Backend接続前のPrototypeでも、以下の状態を表現できる構成とする。

```text
Loading
No open positions
No trades yet
No configured bot
Market data unavailable
Invalid bot configuration
```

表示方法はSkeleton、Empty State、Inline Message、Toast、Connection Statusなどを用途に応じて使い分ける。

## 11. Prototype Scope

Prototypeでは固定のMock BotとMock Market Dataを使用する。

```text
HYPE/USDC Bot
BTC/USDC Bot
ETH/USDC Bot
SOL/USDC Bot
```

Mockでも、BotごとのStatus、Config、Paper Account、Position、Trade、PnL、Previous Priceは独立して扱う。

Backend、Database、Authentication、Hyperliquid API、SSEはPrototypeの対象外とする。
実データ接続はBackend実装時に追加する。

## 12. Out of Scope

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
Admin Screen
User Management
Bot Create / Delete UI
```
