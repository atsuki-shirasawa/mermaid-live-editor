import type { Sample } from "./types";

// ---- サンプル図 ----
export const SAMPLES: Sample[] = [
  {
    label: "Flowchart",
    code: `flowchart TD
  A[開始] --> B{条件}
  B -->|はい| C[処理 1]
  B -->|いいえ| D[処理 2]
  C --> E[終了]
  D --> E`,
  },
  {
    label: "Sequence",
    code: `sequenceDiagram
  participant U as ユーザー
  participant S as サーバー
  U->>S: リクエスト
  S-->>U: レスポンス`,
  },
  {
    label: "Class",
    code: `classDiagram
  class Animal {
    +String name
    +eat()
  }
  class Dog {
    +bark()
  }
  Animal <|-- Dog`,
  },
  {
    label: "State",
    code: `stateDiagram-v2
  [*] --> 待機
  待機 --> 実行中: 開始
  実行中 --> 完了: 終了
  完了 --> [*]`,
  },
  {
    label: "ER",
    code: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string name
    string email
  }`,
  },
  {
    label: "Gantt",
    code: `gantt
  title プロジェクト計画
  dateFormat YYYY-MM-DD
  section 設計
  要件定義 :a1, 2024-01-01, 7d
  基本設計 :after a1, 5d`,
  },
  {
    label: "Pie",
    code: `pie title 利用ブラウザ
  "Chrome" : 60
  "Safari" : 25
  "Firefox" : 15`,
  },
  {
    label: "Mindmap",
    code: `mindmap
  root((Mermaid))
    図の種類
      フローチャート
      シーケンス
    出力
      SVG
      PNG`,
  },
  {
    label: "Git",
    code: `gitGraph
  commit
  branch develop
  commit
  checkout main
  merge develop`,
  },
  {
    label: "C4",
    code: `C4Context
  title システム構成図
  Person(user, "ユーザー")
  System(app, "Web アプリ")
  Rel(user, app, "利用する")`,
  },
  {
    label: "Timeline",
    code: `timeline
  title 沿革
  2020 : 創業
  2022 : サービス開始
  2024 : 海外展開`,
  },
  {
    label: "Journey",
    code: `journey
  title 買い物体験
  section 来店
    入店: 5: 客
    商品選択: 3: 客
  section 会計
    支払い: 4: 客`,
  },
  {
    label: "Quadrant",
    code: `quadrantChart
  title 優先度マトリクス
  x-axis 低い --> 高い
  y-axis 低い --> 高い
  "施策 A": [0.3, 0.6]
  "施策 B": [0.7, 0.8]`,
  },
];
