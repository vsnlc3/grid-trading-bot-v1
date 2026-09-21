# Grid Trading Bot 要件定義書 v0.1

## 1. システム概要

暗号資産のリアルタイム価格を取得し、設定したGrid Trading戦略に従って売買判断を行う。

MVPでは実際の取引所への注文は行わず、仮想資金を使用した **Paper Trading** のみ実施する。

目的は、実際の市場データを使用してGrid Tradingを実行し、

- どの価格で売買が発生したか
- 現在どのポジションを保有しているか
- どの程度の損益が発生しているか

を検証できるシステムを構築することである。

---

## 2. MVPの対象範囲

MVPでは以下を実装する。

| 機能 | MVP |
| --- | --- |
| リアルタイム価格取得 | ○ |
| Grid戦略 | ○ |
| Paper Trading | ○ |
| 仮想残高管理 | ○ |
| 未決済ポジション管理 | ○ |
| 約定履歴管理 | ○ |
| 損益計算 | ○ |
| Bot開始・一時停止・停止 | ○ |
| Web画面で状態確認 | ○ |
| 価格推移の確認 | ○ |
| Grid位置の確認 | ○ |
| BUY / SELL約定位置の確認 | ○ |
| 実資金での取引 | × |
| バックテスト | × |
| AIによる戦略最適化 | × |
| レバレッジ | × |
| Short | × |
| 複数戦略 | × |
| 複数取引所同時稼働 | × |

---

## 2.1 複数Bot

v1では、複数のGrid Botを同時に稼働できるものとする。

基本単位は以下とする。

```text
1 Bot = 1 Symbol = 1 Paper Account
```

各Botは独立して以下を保持する。

```text
Bot Status
Bot Config
Paper Account
Positions
Trades
PnL
Previous Price
```

Paper AccountはBot間で共有しない。
複数Botが同時にRUNNINGとなることを許可する。

DashboardのSelectorは既存BotのSymbolを書き換える操作ではなく、
表示対象Botを切り替える操作とする。

例：

```text
HYPE/USDC Bot
BTC/USDC Bot
ETH/USDC Bot
```

表示対象を切り替えても、非表示のBotのStatus、Balance、Position、Trade、
PnLは保持され、RUNNING中のBotはバックグラウンドで動作を継続する。
v1ではBotの作成・削除UIは対象外とする。

---

## 3. Grid Trading仕様

### 3.1 基本戦略

MVPでは **Long Only Grid Trading** を採用する。

基本動作は以下とする。

```text
価格下落
↓
Gridライン通過
↓
仮想BUY
↓
価格上昇
↓
1つ上のGridライン通過
↓
仮想SELL
↓
利益確定
```

空売りは行わない。

---

### 3.2 Grid設定

Bot作成時に以下を指定できる。

| 項目 | 内容 |
| --- | --- |
| Symbol | BTC/USDC等 |
| Initial Quote Balance / Initial Capital | 初期Paper AccountのQuote残高 |
| Grid Lower Price | Grid下限 |
| Grid Upper Price | Grid上限 |
| Grid Count | Grid分割数 |
| Order Amount | 1回あたりの購入額 |
| Trading Fee | 仮想手数料率 |
| Slippage | 仮想スリッページ率 |

Application側のSymbol表記は、以下のような`BASE/QUOTE`形式を基本とする。

```text
BTC/USDC
ETH/USDC
SOL/USDC
HYPE/USDC
```

Initial CapitalおよびOrder AmountはQuote Asset単位とする。

例：

```text
BTC/USDCの場合

Quote Asset = USDC
Base Asset  = BTC
```

Initial Quote Balance（Initial Capital）は、Botの初期Paper Accountを作成する際の初期値とする。
Botが一度稼働を開始した後は、既存のQuote BalanceやPnLの基準を書き換える目的で編集できない。
既存BotではInitial Quote Balanceを読み取り専用として扱う。

Returnの基準となるInitial Portfolio ValueはBot作成時に確定し、Botの稼働中に変化しない。
Grid設定や現在の残高を変更しても、Initial Portfolio Valueは再計算しない。

Grid間隔は以下の式で算出する。

```text
Grid Interval
=
(Upper Price - Lower Price) / Grid Count
```

Grid Countは **Gridの分割数** を意味する。

そのため、上下限を含むGridラインの本数は以下となる。

```text
Grid Line Count
=
Grid Count + 1
```

例：

```text
Grid Lower Price = 90,000
Grid Upper Price = 100,000
Grid Count       = 10

Grid Interval    = 1,000
Grid Line Count  = 11
```

生成されるGridは以下となる。

```text
90,000
91,000
92,000
...
99,000
100,000
```

Lower PriceからUpper PriceまでGrid Lineを生成する。

Upper PriceはGrid Rangeの上限であり、SELL Targetとして利用できる。
ただし、Upper Priceには1つ上のGrid Lineが存在しないため、Upper Priceで新規BUYは発生させない。

BUY対象となるGridは、1つ上のGrid LineをSELL Targetとして持てるGridのみとする。
したがって、Grid Countが10の場合、Grid Lineは11本生成されるが、
新規BUY対象はLower PriceからUpper Priceの1つ下のGrid Lineまでとなる。

---

### 3.3 Grid範囲

Grid Tradingは設定された以下の価格範囲内で動作する。

```text
Grid Lower Price
〜
Grid Upper Price
```

価格がGrid範囲外にある場合、新規BUYは発生させない。

Upper Priceでは新規BUYを発生させない。Upper PriceはGrid Rangeの上限および
SELL Targetとしてのみ利用する。

---

### 3.4 Gridの再利用

一度BUYおよびSELLが完了したGridは、再びBUY可能な状態に戻す。

例：

```text
99,000 BUY
↓
100,000 SELL
↓
決済完了
↓
価格が再び99,000を下方向に通過
↓
99,000 BUY
```

同じGridを繰り返し利用できるものとする。

ただし、同一Gridに未決済ポジションが存在している間は、そのGridで新たなBUYを発生させない。

```text
99,000 BUY
↓
未決済
↓
再び99,000を通過
↓
新規BUYしない
```

SELLが完了した後、そのGridは再度BUY可能になる。

---

## 4. Paper Trading仕様

Paper Tradingでは実際の資金・暗号資産を使用しない。

システム内部に仮想資産を保持する。

```text
Quote Balance

例:
10,000 USDC


Base Balance

例:
0 BTC
```

すべてのBUY / SELLはシステム内部で仮想約定として処理する。

---

### 4.1 BUY

リアルタイム価格が下方向にGridラインを通過した場合、BUY条件が成立したものとする。

例：

```text
Grid

100,000
99,000
98,000
97,000
```

価格推移：

```text
100,200
↓
99,800
↓
98,900
```

99,000のGridラインを下方向に通過したためBUY条件が成立する。

```text
BUY Trigger

Grid Price = 99,000
```

実際の仮想約定価格にはSlippageを反映する。

購入後、そのポジションに対応するSELL価格を1つ上のGridに設定する。

```text
BUY Grid 99,000
↓
SELL Target Grid 100,000
```

BUY時には以下を更新する。

```text
Quote Balance
Base Balance
Position
Trade History
Grid Status
```

---

### 4.2 SELL

価格が対象ポジションのSELL Gridを上方向に通過した場合、SELL条件が成立したものとする。

例：

```text
BUY Grid         = 99,000
SELL Target Grid = 100,000
```

価格が100,000を上方向に通過した場合、仮想SELLを実行する。

SELL時には以下を更新する。

```text
Quote Balance
Base Balance
Position
Realized PnL
Trade History
Grid Status
```

売却されたポジションは決済済みとして扱う。

SELL完了後、対応するBUY Gridは再びBUY可能な状態に戻す。

---

### 4.3 Order Amount

Order Amountは1回のBUYで使用するQuote Assetの注文金額とする。

例：

```text
Order Amount = 100 USDC
```

購入数量は以下を基準として算出する。

```text
Quantity
=
Order Amount / Buy Execution Price
```

Trading FeeはOrder Amountとは別に計算する。

BUY時に必要なQuote Balanceは、以下を満たす場合のみBUYを実行する。

```text
Quote Balance >= Order Amount + BUY Fee
```

不足している場合、そのBUYはSkipする。

---

### 4.4 手数料

仮想売買には設定されたTrading Feeを適用する。

Trading FeeはBUYおよびSELLのそれぞれに発生する。

BUY手数料：

```text
BUY Fee
=
Buy Execution Price
× Quantity
× Trading Fee Rate
```

SELL手数料：

```text
SELL Fee
=
Sell Execution Price
× Quantity
× Trading Fee Rate
```

---

### 4.5 スリッページ

Slippageは仮想約定価格に直接反映する。

BUYの場合は不利な方向に価格を上昇させる。

```text
Buy Execution Price
=
Buy Grid Price
× (1 + Slippage Rate)
```

SELLの場合は不利な方向に価格を低下させる。

```text
Sell Execution Price
=
Sell Target Grid Price
× (1 - Slippage Rate)
```

例：

```text
Slippage = 0.1%
```

内部計算では以下として扱う。

```text
0.001
```

スリッページによる影響はExecution Priceに含まれるため、損益計算時に別途スリッページコストを差し引かない。

---

## 5. リアルタイム価格取得

取引所が提供するMarket Data APIを利用して暗号資産のリアルタイム価格を取得する。

MVPでは市場データの取得のみを行い、注文用APIは使用しない。

価格取得部分と売買戦略は分離する。

```text
Exchange
   ↓
MarketDataAdapter
   ↓
PriceEvent
   ↓
GridStrategy
```

PriceEventは最低限以下のデータを持つ。

```text
symbol
price
timestamp
```

例：

```json
{
  "symbol": "BTC/USDC",
  "price": 100250.52,
  "timestamp": "2026-09-19T10:00:00Z"
}
```

GridStrategyはPriceEventを受け取り、Gridラインを通過したか判定する。

---

## 6. Grid通過判定

### 6.1 基本判定

単純に「現在価格がGrid価格以下または以上」で判定するのではなく、直前価格と現在価格を比較してGridを跨いだことを判定する。

BUY判定：

```text
Previous Price > Grid Price

かつ

Current Price <= Grid Price
```

SELL判定：

```text
Previous Price < Sell Grid Price

かつ

Current Price >= Sell Grid Price
```

これにより、同一価格帯に滞在している間に同じGridで複数回約定することを防止する。

Bot起動後、最初に取得した価格はPrevious Priceの初期値として使用する。

最初の価格取得時には売買を発生させない。

---

### 6.2 複数Gridを跨いだ場合

1回の価格更新で複数のGridラインを跨ぐ場合がある。

例：

```text
Previous Price = 100,500
Current Price  = 97,500
```

Grid：

```text
100,000
99,000
98,000
97,000
```

この場合、

```text
100,000
99,000
98,000
```

の複数Gridを下方向に跨いでいる。

BUY条件を満たしている有効なGridについて、それぞれ個別にBUY判定を行う。

下降時は、価格の高いGridから低いGridの順に処理する。

```text
100,000
↓
99,000
↓
98,000
```

上昇時に複数のSELL Gridを跨いだ場合も同様に、それぞれ個別にSELL判定を行う。

上昇時は、価格の低いGridから高いGridの順に処理する。

ただし以下の場合はBUYを行わない。

```text
対象Gridに未決済ポジションが存在する

または

Quote Balanceが不足している
```

---

## 7. Bot状態管理

Botは以下の状態を持つ。

```text
STOPPED
RUNNING
PAUSED
```

---

### 7.1 RUNNING

リアルタイム価格を監視し、Grid判定およびPaper Tradingを実行する。

---

### 7.2 PAUSED

リアルタイム価格の取得および状態確認は継続する。

ただし、BUY / SELLは発生させない。

PAUSED中もPrevious Priceは最新価格に更新する。

そのため、PAUSED中に発生したGrid通過について、RUNNINGへ復帰した際に遡って売買を実行しない。

---

### 7.3 STOPPED

Grid Trading処理を停止する。

STOPPEDにしても、既存の仮想残高、ポジション、売買履歴は削除しない。

未決済ポジションも自動決済しない。

Botを再開した場合、再開後最初の価格をPrevious Priceとして初期化し、その時点では売買を発生させない。

---

### 7.4 Grid設定変更

Grid設定の変更はSTOPPED状態の場合のみ可能とする。

また、未決済ポジションが存在する場合はGrid設定を変更できないものとする。

```text
Bot Status = STOPPED

かつ

Open Position Count = 0
```

の場合のみGrid設定を変更できる。

---

## 8. 仮想残高管理

各Botは、他のBotと共有しない独立したPaper Accountを持つ。

各Paper Accountは以下の仮想残高を管理する。

```text
Quote Balance
Base Balance
```

例：

```text
Quote Balance
10,000 USDC

Base Balance
0.02 BTC
```

BUY時はQuote Balanceを減少させ、Base Balanceを増加させる。

BUY時：

```text
Quote Balance
- Order Amount
- BUY Fee
```

```text
Base Balance
+ Quantity
```

SELL時はBase Balanceを減少させ、Quote Balanceを増加させる。

SELL時：

```text
Base Balance
- Quantity
```

```text
Quote Balance
+ (Sell Execution Price × Quantity)
- SELL Fee
```

仮想残高を超えるBUYは実行しない。

---

## 9. ポジション管理

BUYが発生した場合、該当Botの未決済ポジションとして管理する。

最低限以下の情報を保持する。

```text
Position ID
Symbol
Buy Grid Price
Buy Execution Price
Quantity
Sell Target Price
Grid ID
Opened At
Closed At
Status
```

Statusは最低限以下を持つ。

```text
OPEN
CLOSED
```

BUY時はOPENとする。

SELL完了後はCLOSEDとする。

同一Gridについて同時に複数のOPENポジションは保持しない。

---

## 10. 売買履歴

すべての仮想約定を該当Bot単位の履歴として保存する。

最低限以下を保持する。

```text
Timestamp
Symbol
Side
Grid Price
Execution Price
Quantity
Fee
PnL
Grid ID
Position ID
```

Sideは以下とする。

```text
BUY
SELL
```

BUY時のPnLは確定していないため、確定損益は記録しない。

SELL時には、その取引によって確定したPnLを記録する。

---

## 11. 損益計算

最低限以下の損益を計算する。

---

### 11.1 Realized PnL

決済済みポジションによる確定損益。

```text
Realized PnL
=
(Sell Execution Price - Buy Execution Price)
× Quantity
- BUY Fee
- SELL Fee
```

SlippageはExecution Priceにすでに反映されているため、別途差し引かない。

---

### 11.2 Unrealized PnL

未決済ポジションの含み損益。

基本計算は以下とする。

```text
Unrealized PnL
=
(Current Price - Buy Execution Price)
× Quantity
- BUY Fee
```

MVPでは未決済状態のため、将来SELL時に発生する手数料はUnrealized PnLには含めない。

---

### 11.3 Total PnL

```text
Total PnL
=
Realized PnL
+
Unrealized PnL
```

---

### 11.4 Portfolio Value

```text
Portfolio Value
=
Quote Balance
+
Base Balance × Current Price
```

---

### 11.5 Return %

初期仮想資金に対する現在の損益率を計算する。

```text
Return %
=
(Current Portfolio Value - Initial Portfolio Value)
/
Initial Portfolio Value
× 100
```

---

## 12. 管理画面

Web管理画面からBotの状態およびPaper Tradingの結果を確認できるようにする。

最低限、以下を確認できること。

```text
Bot Status

Symbol
Current Price

Grid Lower Price
Grid Upper Price
Grid Count

Initial Quote Balance
Quote Balance
Base Balance
Portfolio Value

Realized PnL
Unrealized PnL
Total PnL
Return %

Price History

Grid Positions
BUY Positions
SELL Positions

Open Positions
Grid Status
Trade History
```

また、管理画面から以下の操作を実行できること。

```text
Bot Start
Bot Pause
Bot Stop
```

Dashboardでは複数Botの表示対象を切り替えて、各Botの状態と結果を確認できること。
SelectorによってBotのSymbol、Paper Account、Position、Tradeを別Botのものへ
リセットしてはならない。

具体的なレイアウト、デザイン、チャート形式、表示方法については別途画面設計で定義する。

---

## 13. データ保存

最低限以下の情報を永続化する。

```text
bots
grid_levels
paper_accounts
positions
trades
```

### bots

Botの設定および状態を保存する。

---

### grid_levels

各Gridの価格および状態を保存する。

最低限、以下の状態を管理できるものとする。

```text
READY
OPEN
```

READY：

```text
BUY可能
```

OPEN：

```text
対象Gridに未決済ポジションが存在する
```

SELL完了後はREADYへ戻す。

---

### paper_accounts

仮想資産残高を保存する。

---

### positions

未決済および決済済みポジションを保存する。

---

### trades

BUY / SELLの約定履歴を保存する。

---

### price_snapshots

`price_snapshots`はv1の必須永続化対象ではない。

長期的な独自価格履歴が必要になった場合に、将来導入できるものとする。

---

## 14. 価格データ保存

Grid判定にはリアルタイムの価格データを利用する。

Historical ChartはHyperliquidの`candleSnapshot`を利用し、
Realtime ChartはHyperliquid WebSocketの`candle`を利用する。

v1では長期間の独自Historical Data保存を必須としない。
取得したすべてのRealtime TickをDBへ保存しない。

Grid Strategyは`price_snapshots`に依存せず、Grid判定にはRealtimeのPrice Eventを利用する。

長期価格履歴が必要になった場合の`price_snapshots`導入方法や保存間隔は、
将来の実装設計で決定する。

---

## 15. 安全仕様

MVPはPaper Trading専用とする。

以下は使用しない。

```text
取引所の注文API

取引権限を持つAPI Key

実資金

実際の暗号資産残高
```

Execution EngineはPaper Trading用のみとする。

```text
ExecutionEngine
└─ PaperExecutionEngine
```

実際の注文処理は実装しない。

これにより、Botの誤動作によって実資金の注文が発生することを防止する。

---

## 16. MVPの完成条件

以下がすべて確認できればMVP完成とする。

1. 暗号資産のリアルタイム価格を取得できる
2. Grid設定を登録できる
3. Grid Countを分割数としてGridを生成できる
4. 指定された範囲にGridラインを生成できる
5. 価格がGridを下方向に跨いだことを検知できる
6. Grid通過時に仮想BUYが発生する
7. BUYに対応するSELL価格を設定できる
8. 価格がSELL Gridを上方向に跨いだことを検知できる
9. SELL Grid到達時に仮想SELLが発生する
10. SELL完了後、同じGridで再びBUYできる
11. 同一Gridに未決済ポジションがある場合、重複BUYが発生しない
12. 1回の価格更新で複数Gridを跨いだ場合、それぞれを正しく処理できる
13. Trading FeeをBUY / SELLそれぞれに反映できる
14. Slippageを仮想約定価格に反映できる
15. 仮想残高が正しく更新される
16. 仮想残高を超えるBUYが発生しない
17. 未決済ポジションを管理できる
18. 決済済みポジションを管理できる
19. 売買履歴を保存できる
20. Realized PnLを計算できる
21. Unrealized PnLを計算できる
22. Total PnLを計算できる
23. Portfolio Valueを計算できる
24. Return %を計算できる
25. Botを開始できる
26. Botを一時停止できる
27. Botを停止できる
28. PAUSED中に発生したGrid通過を後から遡って約定しない
29. STOPPED時に未決済ポジションが自動決済されない
30. 未決済ポジションが存在する場合、Grid設定を変更できない
31. Web画面からBotの状態を確認できる
32. 価格推移を確認できる
33. Grid位置を確認できる
34. BUY / SELLの約定位置を確認できる
35. 未決済ポジションを確認できる
36. 売買履歴を確認できる
37. 実注文が一切発生しない
38. 複数Botを同時にRUNNINGにできる
39. 1 Botが1 Symbolを持つ
40. Botごとに独立したPaper Accountを保持できる
41. BotごとにPosition、Trade、PnL、Previous Priceを管理できる
42. DashboardのSelectorで表示対象Botを切り替えられる
43. 非表示のRUNNING Botが動作を継続できる

---

## 17. MVPの基本方針

最初のバージョンでは、

**「利益を最大化するBot」ではなく、「Grid Trading戦略を正しく検証できるBot」を作る。**

Grid幅や売買パラメータの最適化は行わない。

まずは、

```text
リアルタイム価格取得
↓
Grid判定
↓
Paper Trading
↓
ポジション管理
↓
損益計算
↓
結果確認
```

という一連の処理を正確に実行できることを優先する。

また、売買結果だけではなく、

- どのGridで売買したか
- どのポジションが未決済か
- どの売買によって利益・損失が発生したか

を確認できることを重視する。

画面の具体的なデザインやUI仕様については、本要件定義書とは分離し、別途画面設計書として定義する。
