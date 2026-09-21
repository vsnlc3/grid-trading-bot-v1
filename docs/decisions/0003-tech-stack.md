# 0003 Tech Stackの選定

## Status

Accepted

## Date

2026-09-20

---

## 1. Context

Grid Trading Bot v1では、以下の機能を実装する。

```text
Hyperliquid Market Data取得
リアルタイムGrid判定
Paper Trading
Position管理
Trade履歴
PnL計算
Candlestick / Volume表示
Bot Start / Pause / Stop
```

`0001-market-data-api.md` では、
Market Data ProviderとしてHyperliquid APIを採用した。

`0002-market-data-stream.md` では、

```text
Grid判定
→ Hyperliquid WebSocket trades

Current Price
→ Latest Trade Price

Candlestick
→ Hyperliquid WebSocket candle

Historical Candle
→ Hyperliquid REST candleSnapshot
```

を採用した。

本資料では、これらを実装するための
Frontend、Backend、Database、Realtime通信、
Chart、Testing、Container環境などの技術スタックを決定する。

---

## 2. Basic Policy

本プロジェクトでは、
新しい技術を大量に導入すること自体を目的としない。

既に利用経験のある、

```text
Next.js
Spring Boot
MySQL
Docker Compose
```

を基盤として利用する。

その上で、本プロジェクト特有の、

```text
WebSocket Market Data
Grid Strategy
Paper Execution
Realtime UI
Financial Calculation
```

に実装・学習の重点を置く。

前プロジェクトで利用した技術を再利用することで、
インフラや基本的なWebアプリ構成の学習コストを抑え、
Grid Trading Bot本体の設計・実装に集中する。

---

# 3. Decision Summary

Grid Trading Bot v1では以下を採用する。

| Category | Technology |
| --- | --- |
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Server State | TanStack Query |
| Client State | Zustand |
| Form | React Hook Form + Zod |
| Chart | TradingView Lightweight Charts |
| Backend | Java 21 + Spring Boot |
| Persistence | Spring Data JPA + Hibernate |
| Database | MySQL |
| Migration | Flyway |
| Market Data | Hyperliquid REST / WebSocket |
| Hyperliquid → Backend | WebSocket |
| Frontend → Backend | REST API |
| Backend → Frontend | SSE |
| Backend Test | JUnit 5 + Mockito |
| Container | Docker |
| Local Runtime | Docker Compose |
| Production Runtime | Docker Compose |
| Deployment Target | 未確定 |
| Authentication | v1では実装しない |
| CI/CD | GitHub Actionsを段階的に導入 |

---

# 4. Frontend

## 4.1 Framework

Frontendには、

```text
Next.js
TypeScript
```

を採用する。

理由：

- ReactベースでUIを構築できる
- TypeScriptによる型安全性を確保できる
- API連携との相性が良い
- 前プロジェクトで利用経験がある
- Dashboard形式のWebアプリを構築しやすい

Grid Trading Botでは、
SEOやコンテンツ配信よりもDashboard UIが中心となる。

そのため、Frontendの主な役割は以下とする。

```text
Bot設定
Bot状態表示
Current Price表示
PnL表示
Position表示
Trade履歴表示
Candlestick表示
Grid Line表示
BUY / SELL Marker表示
```

---

## 4.2 UI

UIには以下を採用する。

```text
Tailwind CSS
shadcn/ui
```

Tailwind CSSを基本的なStylingに利用し、
Button、Dialog、Form、TableなどのUI Componentには
shadcn/uiを利用する。

Grid Trading Dashboardでは、
Dark Themeを基本とする。

---

# 5. Frontend State Management

Frontendでは状態の種類によって
管理方法を分離する。

---

## 5.1 Server State

Server Stateには、

```text
TanStack Query
```

を採用する。

対象：

```text
Bot Config
Bot Status
Paper Account
Positions
Trades
PnL
Historical Candle
```

REST APIから取得するデータは、
基本的にTanStack Queryで管理する。

Frontend側でServer Stateを独自に複製して
管理することは避ける。

---

## 5.2 Client State

Client Stateには、

```text
Zustand
```

を採用する。

対象例：

```text
Selected Symbol
Selected Timeframe
Chart UI State
Dialog State
Temporary UI Preference
```

Server上のデータそのものはZustandへ保存せず、
UI固有の状態を中心に管理する。

---

# 6. Form

Bot設定フォームには、

```text
React Hook Form
+
Zod
```

を採用する。

設定項目例：

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

FrontendではZodによって入力値を検証する。

ただしFrontendのValidationだけを信頼せず、
Backendでも必ずServer Side Validationを行う。

---

# 7. Chart

Chart Libraryには、

```text
TradingView Lightweight Charts
```

を採用する。

npm package：

```text
lightweight-charts
```

主な表示対象：

```text
Candlestick
Volume
Current Price
Grid Lines
BUY Marker
SELL Marker
```

時間足：

```text
1m
5m
15m
```

---

## 7.1 Chart Data

Historical Chartは、

```text
Hyperliquid REST
candleSnapshot
```

から取得する。

リアルタイム更新は、

```text
Hyperliquid WebSocket
candle
```

をBackend経由でFrontendへ配信する。

基本構成：

```text
REST candleSnapshot
↓
Historical Candle
↓
Chart Initial Display

WebSocket candle
↓
Backend
↓
Frontend
↓
Chart Realtime Update
```

---

# 8. Backend

Backendには、

```text
Java 21
Spring Boot
```

を採用する。

主な責務：

```text
Hyperliquid Market Data接続
MarketDataAdapter
GridStrategy
PaperExecutionEngine
Bot State管理
Position管理
Trade管理
PnL計算
Database Access
REST API
SSE配信
```

FrontendはGrid Tradingロジックを持たない。

Grid Tradingに関するBusiness Logicは
Backendに集約する。

---

# 9. Backend Architecture

Backendでは、
基本的にLayered Architectureを採用する。

基本構成：

```text
Controller
↓
Service
↓
Repository
```

ただしGrid TradingのDomain Logicについては、
単純にServiceへすべて集約せず、
責務ごとにComponentを分離する。

想定Component：

```text
HyperliquidMarketDataAdapter

GridStrategy

PaperExecutionEngine

PositionService

TradeService

PnLService

BotService
```

構成イメージ：

```text
Hyperliquid
     │
     ↓
HyperliquidMarketDataAdapter
     │
     ↓
PriceEvent
     │
     ↓
GridStrategy
     │
     ↓
PaperExecutionEngine
     │
     ├─ Position
     ├─ Trade
     ├─ Paper Account
     └─ PnL
```

Hyperliquid固有のAPI仕様を
GridStrategyへ直接持ち込まない。

---

# 10. Persistence

Persistence Layerには、

```text
Spring Data JPA
Hibernate
```

を採用する。

主なEntity：

```text
Bot
GridLevel
PaperAccount
Position
Trade
PriceSnapshot
```

Repository Layerを通してMySQLへアクセスする。

---

# 11. Database

Databaseには、

```text
MySQL
```

を採用する。

前プロジェクトでもMySQLを利用しており、
本プロジェクトの要件を満たす。

v1では、

```text
Transaction
Index
Foreign Key
Unique Constraint
Validation
Relation
```

を適切に設計する。

Grid Trading Bot v1の規模では、
PostgreSQLなど他のRDBMSを導入する明確な必要性はない。

そのため、
新しいDatabaseを採用することよりも、
Grid Tradingロジックの実装を優先する。

---

# 12. Database Migration

Database Migrationには、

```text
Flyway
```

を採用する。

Schema変更はMigration Fileとして管理する。

例：

```text
V1__create_bots.sql
V2__create_grid_levels.sql
V3__create_paper_accounts.sql
V4__create_positions.sql
V5__create_trades.sql
```

JPA EntityだけにSchema管理を依存しない。

Production環境では、

```text
ddl-auto=create
```

のような自動Schema再生成を利用しない。

Database SchemaをVersion管理できる構成とする。

---

# 13. Market Data Communication

Hyperliquidとのリアルタイム通信には、

```text
WebSocket
```

を利用する。

利用Stream：

```text
trades

candle 1m
candle 5m
candle 15m
```

構成：

```text
Hyperliquid
     │
     │ WebSocket
     ↓
Spring Boot
     │
     ├─ MarketDataAdapter
     ├─ GridStrategy
     └─ Candle Processing
```

Hyperliquid REST APIは、
主にHistorical Candleの取得に利用する。

---

# 14. Frontend / Backend Communication

FrontendとBackendの通信は、
用途によってRESTとSSEを使い分ける。

---

## 14.1 Frontend → Backend

FrontendからBackendへの操作には、

```text
REST API
```

を利用する。

例：

```text
Create Bot
Update Bot Config
Start Bot
Pause Bot
Stop Bot
Get Bot
Get Positions
Get Trades
Get Historical Candle
```

通常のRequest / Response形式で十分な処理については、
WebSocketを利用しない。

---

## 14.2 Backend → Frontend

BackendからFrontendへのリアルタイム更新には、

```text
Server-Sent Events
SSE
```

を採用する。

配信候補：

```text
Current Price
Bot Status
PnL
Position Update
BUY Event
SELL Event
Candle Update
```

本システムではリアルタイム通信の多くが、

```text
Server
↓
Browser
```

の一方向通信となる。

そのため、
Frontendとの通信にFull Duplex WebSocketを導入するよりも、
SSEを利用する方が構成を単純化できる。

---

## 14.3 Communication Overview

全体のRealtime Communicationは以下とする。

```text
Hyperliquid
     │
     │ WebSocket
     ↓
Spring Boot
     │
     ├─ GridStrategy
     ├─ PaperExecutionEngine
     ├─ MySQL
     │
     │ SSE
     ↓
Next.js
```

Frontendからの操作：

```text
Next.js
   │
   │ REST
   ↓
Spring Boot
```

---

# 15. UI Event Frequency

Hyperliquidの `trades` を、
そのまますべてFrontendへ転送することはしない。

`trades` はGridStrategy内部では
リアルタイムに処理する。

一方、Frontendへ表示するCurrent Priceなどについては、
必要に応じて更新頻度を制御する。

例：

```text
Hyperliquid trades
↓
Backend
↓
GridStrategy
→ 全Tradeを処理

Frontend Current Price
→ UI表示に適した頻度で配信
```

これにより、
Grid判定の精度を維持しながら、
不要なUI更新を抑える。

具体的なThrottle / Update Intervalは
`architecture.md` で決定する。

---

# 16. Testing

Backend Testには、

```text
JUnit 5
Mockito
```

を採用する。

特に以下を重点的にUnit Testする。

```text
Grid Cross Detection

BUY判定

SELL判定

Multiple Grid Crossing

Open Position判定

Balance不足

Fee計算

Slippage計算

Realized PnL

Unrealized PnL

PAUSED時の動作

STOPPED時の動作

Previous Price初期化
```

GridStrategyおよびPaperExecutionEngineは、
外部APIやDatabaseへの依存を可能な限り分離し、
Unit Testしやすい設計とする。

---

# 17. Authentication

Grid Trading Bot v1では、

```text
Authentication
```

を必須機能としない。

前プロジェクトでは、

```text
Google OAuth
Spring Security
```

を採用したが、
本プロジェクトの主要目的は以下である。

```text
Market Data
Grid Strategy
Paper Trading
Realtime Processing
Visualization
```

そのため、
v1ではAuthentication実装による開発範囲の拡大を避ける。

外部公開が必要になった場合は、
Spring Securityなどを利用したAuthenticationを
別途検討する。

---

# 18. Docker

LocalおよびProduction Runtimeには、

```text
Docker
Docker Compose
```

を採用する。

基本Container：

```text
frontend
backend
mysql
```

構成：

```text
Docker Compose

├─ frontend
│   └─ Next.js
│
├─ backend
│   └─ Spring Boot
│
└─ mysql
    └─ MySQL
```

MySQL DataはDocker Volumeへ保存する。

---

# 19. Network

Container間通信には
Docker Networkを利用する。

例：

```text
Frontend Server
↓
backend:8080

Backend
↓
mysql:3306
```

ブラウザから、

```text
backend:8080
mysql:3306
```

へ直接アクセスする構成にはしない。

Production環境で外部公開する場合は、
Reverse ProxyまたはFrontend経由で
Backendへアクセスする構成とする。

---

# 20. Environment Variables

環境依存値は、

```text
.env
```

から注入する。

例：

```text
MYSQL_DATABASE
MYSQL_USER
MYSQL_PASSWORD

SPRING_DATASOURCE_URL

HYPERLIQUID_API_URL
HYPERLIQUID_WS_URL

FRONTEND_URL
```

SecretやPasswordを
Git RepositoryへCommitしない。

Templateとして、

```text
.env.example
```

をRepositoryへ配置する。

---

# 21. Deployment

Deployment Targetは、
本ADRでは確定しない。

Application自体は、

```text
Docker Compose
```

で実行可能な構成とする。

候補：

```text
Self-hosted Mini PC

AWS Lightsail

その他Linux Server
```

現時点では、

```text
Local Development
↓
Docker Compose
```

による完成を優先する。

24時間運用が必要になった段階で、
Deployment Targetを決定する。

Deployment Target固有の設計を
Application Coreへ持ち込まない。

---

## 21.1 Self-hosted Mini PC

将来的な候補として、
自宅のMini PC上でDocker Composeを
24時間稼働させる構成を検討する。

想定用途：

```text
Market Data Collection

Paper Trading

Long Running Bot

MySQL Data Storage
```

ただし、
Mini PC本体やNetwork構成の選定は
v1のApplication設計とは分離する。

---

## 21.2 AWS Lightsail

AWS LightsailもDeployment候補として残す。

前プロジェクトで利用経験があるため、
必要になった場合には再利用できる。

ただし本プロジェクトでは
Lightsailを前提条件とはしない。

---

# 22. Reverse Proxy

Reverse Proxyについては
Deployment Target確定後に決定する。

候補：

```text
Caddy
Nginx
Cloudflare Tunnel
Tailscale
```

v1のApplication実装段階では、
特定のReverse Proxyへ依存させない。

---

# 23. CI/CD

CI/CDには、

```text
GitHub Actions
```

を段階的に導入する。

最初から自動Deployまで実装しない。

導入順：

```text
1. Backend Test
2. Frontend Test / Lint
3. Docker Image Build
4. Container Registry
5. Deployment Automation
```

まずは、

```text
Pull Request / Push
↓
Test
↓
Build
```

までを自動化することを目標とする。

Deployment Target確定後に、
自動Deploy方式を検討する。

---

# 24. Logging

BackendではLoggingを実装する。

主な対象：

```text
Application Start / Stop

Hyperliquid WebSocket Connection

Hyperliquid WebSocket Disconnect

Reconnect

Bot Start

Bot Pause

Bot Stop

BUY

SELL

Position Open

Position Close

Unexpected Error
```

大量のTrade EventをすべてINFO Logへ出力しない。

必要に応じて、

```text
DEBUG
INFO
WARN
ERROR
```

を使い分ける。

---

# 25. Error Handling

Backend APIでは、
共通的なException Handlingを実装する。

想定：

```text
Validation Error

Bot State Error

Insufficient Balance

Position Error

Market Data Error

Database Error

Unexpected Error
```

Frontendでは、
API Errorを適切に表示する。

必要に応じてToast通知を利用する。

---

# 26. Development Environment

基本開発環境：

```text
Frontend
Next.js
TypeScript
pnpm

Backend
Java 21
Spring Boot

Database
MySQL

Runtime
Docker Compose
```

Frontend Package Managerには、
前プロジェクトと同様に、

```text
pnpm
```

を使用する。

---

# 27. Alternatives

## PostgreSQL

Database候補として検討できるが、
v1ではMySQLで必要な要件を満たせる。

新しいDatabaseを導入するよりも、
Grid Trading Bot固有の実装を優先するため採用しない。

---

## WebSocket for Frontend

BackendからFrontendへの通信にも
WebSocketを利用する方式を検討できる。

しかしv1では、

```text
Frontend → Backend
REST

Backend → Frontend
Realtime Push
```

という通信が中心であり、
Frontend向けリアルタイム通信は一方向性が強い。

そのためSSEを採用する。

---

## Google OAuth

前プロジェクトでは採用したが、
Grid Trading Bot v1では主要機能ではないため採用しない。

---

## AWS Lightsail固定

前プロジェクトではLightsailへDeployしたが、
本プロジェクトでは24時間稼働用に
Self-hosted Mini PCなども候補となる。

そのためDeployment Targetは固定しない。

---

# 28. Consequences

本Decisionにより、
前プロジェクトで利用経験のある、

```text
Next.js
Spring Boot
MySQL
Docker Compose
```

を継続利用できる。

一方、本プロジェクトでは新たに、

```text
Hyperliquid WebSocket

Realtime Market Data

SSE

Grid Strategy

Paper Execution

Flyway

Trading Chart

Algorithm Unit Test
```

を実践する。

そのため、
既存技術の再利用と新しい技術要素の学習を両立できる。

---

# 29. Out of Scope

本ADRでは以下を決定しない。

```text
Deployment Targetの最終決定

Mini PCの機種

Server OS

Domain

DNS

Reverse Proxy

HTTPS構成

External Access方式

Backup方式

Monitoring Tool

Container Registry

具体的なCI/CD Workflow

API Endpoint詳細

Database Schema詳細

Class Structure詳細

SSE Event Schema

Frontend Screen Layout
```

これらは後続設計またはDeployment時に決定する。

---

# 30. Architecture Overview

最終的な基本構成は以下とする。

```text
                  Hyperliquid
                       │
                       │ WebSocket / REST
                       ↓
              ┌─────────────────┐
              │   Spring Boot   │
              │                 │
              │ Market Adapter  │
              │ Grid Strategy   │
              │ Paper Engine    │
              │ Position / PnL  │
              └────────┬────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ↓                 ↓
            MySQL              SSE
                                 │
                                 ↓
                         ┌──────────────┐
                         │   Next.js    │
                         │              │
                         │ Dashboard    │
                         │ Chart        │
                         │ Bot Control  │
                         └──────┬───────┘
                                │
                                │ REST
                                ↓
                          Spring Boot
```

Container Runtime：

```text
Docker Compose

├─ frontend
├─ backend
└─ mysql
```

Deployment Target：

```text
未確定

Candidate:
- Self-hosted Mini PC
- AWS Lightsail
- Other Linux Server
```

---

# 31. Decision Summary

Grid Trading Bot v1では、

```text
Frontend
→ Next.js + TypeScript

UI
→ Tailwind CSS + shadcn/ui

Server State
→ TanStack Query

Client State
→ Zustand

Form
→ React Hook Form + Zod

Chart
→ TradingView Lightweight Charts

Backend
→ Java 21 + Spring Boot

Persistence
→ Spring Data JPA + Hibernate

Database
→ MySQL

Migration
→ Flyway

Hyperliquid → Backend
→ WebSocket

Frontend → Backend
→ REST

Backend → Frontend
→ SSE

Testing
→ JUnit 5 + Mockito

Runtime
→ Docker Compose

Deployment Target
→ 未確定

Authentication
→ v1では実装しない

CI/CD
→ GitHub Actionsを段階的に導入
```

を採用する。

本プロジェクトでは、
Infrastructureを過度に複雑化せず、

```text
Realtime Market Data
Grid Strategy
Paper Trading
Realtime Visualization
```

の設計・実装を中心とする。