# Documentation

Grid Trading Bot v1 の設計資料を管理する。

## Documents

| File | Role |
| --- | --- |
| requirements.md | システムの要件、対象範囲、Grid TradingおよびPaper Tradingの仕様を定義する |
| architecture.md | システム全体の構成、コンポーネント間の責務と関係を定義する |
| database-design.md | データベースのテーブル、カラム、リレーションを定義する |
| api-design.md | Backendが提供するAPIのエンドポイントおよび入出力を定義する |
| screen-design.md | Web管理画面の構成、表示項目、UI仕様を定義する |

## Architecture Decision Records

設計・技術選定に関する意思決定は `decisions/` に記録する。

| File | Role |
| --- | --- |
| decisions/0001-market-data-api.md | 使用するMarket Data APIを選定する |
| decisions/0002-market-data-stream.md | Grid判定に使用するリアルタイムデータストリームを選定する |
| decisions/0003-tech-stack.md | Frontend、Backend、Database等の技術スタックを選定する |

## Document Flow

以下の順番で設計を進める。

requirements.md
↓
decisions/0001-market-data-api.md
↓
decisions/0002-market-data-stream.md
↓
decisions/0003-tech-stack.md
↓
architecture.md
↓
database-design.md
↓
api-design.md
↓
screen-design.md