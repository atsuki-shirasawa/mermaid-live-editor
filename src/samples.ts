import type { Sample } from "./types";

// ---- サンプル図 ----
// 実務でありがちなシナリオを題材にしたダミー。中身は架空のもの。
export const SAMPLES: Sample[] = [
  {
    label: "Flowchart",
    code: `flowchart TD
  A[ログイン要求] --> B{認証情報は有効か}
  B -->|有効| C[セッション発行]
  B -->|無効| D[エラー表示]
  C --> E{2要素認証が必要か}
  E -->|必要| F[ワンタイムコード検証]
  E -->|不要| G[ダッシュボード表示]
  F --> G
  D --> A`,
  },
  {
    label: "Sequence",
    code: `sequenceDiagram
  participant C as クライアント
  participant API as APIゲートウェイ
  participant Auth as 認証サービス
  participant DB as 決済DB
  C->>API: 決済リクエスト
  API->>Auth: アクセストークン検証
  Auth-->>API: 検証OK
  API->>DB: 決済記録を保存
  DB-->>API: 保存完了
  API-->>C: 決済成功 (200)`,
  },
  {
    label: "Class",
    code: `classDiagram
  class Order {
    +String orderId
    +Date createdAt
    +OrderStatus status
    +total() int
  }
  class Customer {
    +String customerId
    +String name
  }
  class OrderItem {
    +String productId
    +int quantity
    +int unitPrice
  }
  Customer "1" --> "*" Order : 注文する
  Order "1" *-- "*" OrderItem : 含む`,
  },
  {
    label: "State",
    code: `stateDiagram-v2
  [*] --> 受付済
  受付済 --> 支払待ち: 注文確定
  支払待ち --> 出荷準備: 入金確認
  支払待ち --> キャンセル: 期限切れ
  出荷準備 --> 出荷済: 発送
  出荷済 --> 配達完了: 受領
  配達完了 --> [*]
  キャンセル --> [*]`,
  },
  {
    label: "ER",
    code: `erDiagram
  CUSTOMER ||--o{ ORDER : "注文する"
  ORDER ||--|{ ORDER_ITEM : "含む"
  PRODUCT ||--o{ ORDER_ITEM : "対象"
  CUSTOMER {
    int id PK
    string name
    string email
  }
  ORDER {
    int id PK
    int customer_id FK
    datetime ordered_at
    string status
  }
  ORDER_ITEM {
    int order_id FK
    int product_id FK
    int quantity
  }
  PRODUCT {
    int id PK
    string name
    int price
  }`,
  },
  {
    label: "Gantt",
    code: `gantt
  title リリース計画 v2.0
  dateFormat YYYY-MM-DD
  section 要件・設計
    要件定義       :done, a1, 2025-04-01, 7d
    基本設計       :active, a2, after a1, 5d
  section 開発
    API 実装       :a3, after a2, 10d
    フロント実装   :a4, after a2, 12d
  section 検証・公開
    結合テスト     :a5, after a4, 5d
    リリース       :milestone, after a5, 0d`,
  },
  {
    label: "Pie",
    code: `pie title カテゴリ別売上構成比
  "家電" : 42
  "食品" : 28
  "衣料" : 18
  "その他" : 12`,
  },
  {
    label: "Mindmap",
    code: `mindmap
  root((決済リニューアル))
    要件
      多通貨対応
      分割払い
    技術
      API 刷新
      PCI DSS 準拠
    リスク
      移行コスト
      ダウンタイム`,
  },
  {
    label: "Git",
    code: `gitGraph
  commit id: "init"
  branch develop
  checkout develop
  commit id: "feat: 検索"
  branch feature/login
  commit id: "feat: ログイン"
  checkout develop
  merge feature/login
  checkout main
  merge develop tag: "v1.0.0"`,
  },
  {
    label: "C4",
    code: `C4Context
  title 受注システム コンテキスト図
  Person(customer, "顧客", "Web から注文する")
  System(shop, "EC サイト", "注文受付・管理")
  System_Ext(payment, "決済ゲートウェイ", "外部決済")
  System_Ext(warehouse, "倉庫管理システム", "在庫・出荷")
  Rel(customer, shop, "注文する")
  Rel(shop, payment, "決済を依頼", "HTTPS")
  Rel(shop, warehouse, "出荷を指示")`,
  },
  {
    label: "Timeline",
    code: `timeline
  title プロダクトロードマップ 2025
  Q1 : MVP リリース : ユーザー認証
  Q2 : 決済対応 : モバイル最適化
  Q3 : 多言語化
  Q4 : 分析ダッシュボード`,
  },
  {
    label: "Journey",
    code: `journey
  title 新規ユーザーのオンボーディング
  section 登録
    サイト訪問: 4: 訪問者
    アカウント作成: 3: 訪問者
    メール認証: 2: 訪問者
  section 利用開始
    初期設定: 3: ユーザー
    初回操作: 5: ユーザー`,
  },
  {
    label: "Quadrant",
    code: `quadrantChart
  title 施策の優先度（インパクト × 実装コスト）
  x-axis 低コスト --> 高コスト
  y-axis 低インパクト --> 高インパクト
  quadrant-1 すぐ着手
  quadrant-2 計画的に
  quadrant-3 見送り
  quadrant-4 余力で対応
  "検索改善": [0.3, 0.8]
  "決済刷新": [0.8, 0.9]
  "UI 微調整": [0.2, 0.3]
  "レポート機能": [0.6, 0.5]`,
  },
];
