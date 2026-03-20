# rocketLH (飛天火龍) - 系統架構設計文件 (System Design)

> 依據 `proposal.md` 與 `docs/mockups/` UI 原型設計，進行完整的系統架構規劃。
>
> 本遊戲作為 `game-lobby` Monorepo 中的 App 模組（`apps/rocketLH/`），透過大廳統一閘道提供服務。

---

## 目錄

1. [系統總覽](#1-系統總覽)
2. [Monorepo 專案結構](#2-monorepo-專案結構)
3. [前端架構設計](#3-前端架構設計)
4. [後端架構設計](#4-後端架構設計)
5. [API 規格定義](#5-api-規格定義)
6. [資料模型設計](#6-資料模型設計)
7. [核心演算法模組](#7-核心演算法模組)
8. [Provably Fair 機制設計](#8-provably-fair-機制設計)
9. [安全性設計](#9-安全性設計)
10. [測試策略](#10-測試策略)
11. [大廳錢包整合](#11-大廳錢包整合)
12. [部署架構](#12-部署架構)

---

## 1. 系統總覽

### 1.1 設計目標

| 目標 | 說明 |
|------|------|
| **公平透明** | Provably Fair 機制，玩家可自行驗證每局墜毀點 |
| **精確 RTP** | 六段式 RTP (94/95/96/97/98/99%) 數學保證 |
| **多策略投注** | 四押注面板 (Panel A-D) 支援獨立下注與逃跑策略 |
| **即時體驗** | WebSocket 推送即時倍數，火龍飛行動畫流暢 |
| **可調變異數** | 五級 Volatility (LV.1-LV.5) 影響倍數分配曲線 |
| **安全可靠** | 後端權威驗證，防止竄改與重放攻擊 |
| **可維護性** | Monorepo + TypeScript 全端型別安全 |

### 1.2 整合規格

| 項目 | 規範 |
|------|------|
| **前端 Base URL** | `/rocketLH/`（透過 Port 3001 閘道代理） |
| **行動端 Mobile Route** | `/rocketLH/m/`（強制載入 Mobile Pro UI） |
| **後端 API** | 透過 Port 3002 閘道代理至 `/rocketLH/` 路徑 |
| **WebSocket** | 即時倍數廣播，與 HTTP REST 共用 Port |
| **PWA** | 支援獨立 Manifest 定義與離線支援（`vite-plugin-pwa`） |
| **錢包整合** | 透過大廳 Wallet API Client 進行餘額操作（存/取款、結算） |

### 1.3 技術選型

| 層級 | 技術 | 選型理由 |
|------|------|----------|
| 前端框架 | Vite + React 18 + TypeScript | 極速 HMR、豐富生態系 |
| 樣式方案 | TailwindCSS + CSS Variables | 高品質 Premium UI，快速開發 |
| 即時通訊 | WebSocket (ws) | 倍數即時推送，低延遲 |
| 後端框架 | Node.js + Express + TypeScript | 輕量、成熟、易於擴展 |
| 資料庫 | PostgreSQL | ACID 保證，適合金融交易場景 |
| Session 暫存 | In-Memory Map (可升級 Redis) | Phase 1 簡化部署，未來可水平擴展 |
| Monorepo 工具 | pnpm workspaces | 高效磁碟使用，原生支援 |
| 測試 | Vitest (前後端共用) | 與 Vite 生態整合，速度快 |

### 1.4 系統架構總覽圖

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Game UI      │  │ State Manager│  │ Provably Fair        │  │
│  │ (Dragon Anim)  │  │  (React Ctx) │  │ Verifier (SHA-256)   │  │
│  ├───────────────┤  └──────┬───────┘  └──────────────────────┘  │
│  │ Panel A│B│C│D │         │                                     │
│  └───────┬───────┘         │                                     │
│          └────────┬────────┘                                     │
│                   │ HTTP REST + WebSocket                        │
└───────────────────┼─────────────────────────────────────────────┘
                    │
┌───────────────────┼─────────────────────────────────────────────┐
│                   │           Backend (Node.js)                  │
│  ┌────────────────▼─────────────────┐                           │
│  │         API Router               │                           │
│  │  POST /game/bet                  │                           │
│  │  POST /game/cashout              │                           │
│  │  GET  /game/verify               │                           │
│  │  GET  /game/history              │                           │
│  ├──────────────────────────────────┤                           │
│  │     WebSocket Server             │                           │
│  │  → multiplier broadcast          │                           │
│  │  → round state transitions       │                           │
│  └────────────────┬─────────────────┘                           │
│                   │                                              │
│  ┌────────────────▼─────────────────┐                           │
│  │         Crash Engine             │                           │
│  │  ┌────────────┐ ┌─────────────┐  │                           │
│  │  │ RTP Module │ │ Provably    │  │                           │
│  │  │ (6 levels) │ │   Fair      │  │                           │
│  │  └────────────┘ └─────────────┘  │                           │
│  │  ┌────────────┐ ┌─────────────┐  │                           │
│  │  │ Volatility │ │  Session    │  │                           │
│  │  │ (5 levels) │ │  Store      │  │                           │
│  │  └────────────┘ └─────────────┘  │                           │
│  └────────────────┬─────────────────┘                           │
│                   │                                              │
│  ┌────────────────▼─────────────────┐                           │
│  │        DB Access Layer           │                           │
│  └────────────────┬─────────────────┘                           │
└───────────────────┼─────────────────────────────────────────────┘
                    │
┌───────────────────┼─────────────────────────────────────────────┐
│                   ▼        PostgreSQL                            │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ │
│  │rocketlh_bet_records│ │rocketlh_settlements│ │rocketlh_crash_logs │ │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo 專案結構

```
game-lobby/apps/rocketLH/           # 作為 game-lobby Monorepo 的子模組
├── package.json                    # Workspace 設定
├── tsconfig.base.json              # 共用 TypeScript 設定
├── .env.example                    # 環境變數範本
│
├── packages/
│   ├── shared/                     # 前後端共用模組
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/              # 共用型別定義
│   │       │   ├── game.ts         # RoundState, PanelBet, CrashResult, etc.
│   │       │   └── api.ts          # Request/Response DTOs
│   │       ├── constants.ts        # RTP_OPTIONS, VOLATILITY_LEVELS, PANEL_IDS, etc.
│   │       └── fairness.ts         # SHA-256 Hash 驗證工具
│   │
│   ├── server/                     # 後端服務
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # Express + WebSocket 啟動入口
│   │       ├── config/
│   │       │   └── index.ts        # 環境變數 & RTP/Volatility 設定載入
│   │       ├── routes/
│   │       │   └── game.ts         # /game/* HTTP 路由
│   │       ├── ws/
│   │       │   └── multiplier.ts   # WebSocket 倍數廣播服務
│   │       ├── engine/
│   │       │   ├── CrashEngine.ts  # 遊戲核心引擎 (Class)
│   │       │   ├── RoundManager.ts # 回合生命週期管理 (計時器 + 狀態機)
│   │       │   ├── SessionStore.ts # 回合狀態暫存
│   │       │   ├── ProvablyFair.ts # Seed 生成 & 墜毀點計算
│   │       │   └── CrashMath.ts    # RTP + Volatility 數學模型
│   │       ├── services/
│   │       │   └── lobby-client.ts # 大廳錢包橋接 (getBalance/settle/closeSession)
│   │       ├── db/
│   │       │   ├── connection.ts   # PostgreSQL 連線
│   │       │   ├── models/         # 資料表 Model (rocketlh_ 前綴)
│   │       │   │   ├── BetRecord.ts
│   │       │   │   ├── Settlement.ts
│   │       │   │   └── CrashLog.ts
│   │       │   └── migrations/     # DB Migration 腳本
│   │       └── middleware/
│   │           ├── errorHandler.ts
│   │           └── validation.ts   # 請求參數驗證
│   │
│   └── client/                     # 前端應用
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts          # base: '/rocketLH/'
│       ├── index.html
│       └── src/
│           ├── main.tsx            # React 入口
│           ├── App.tsx             # 頂層路由 & Layout
│           ├── styles/
│           │   ├── variables.css   # CSS Variables (色票/主題)
│           │   └── global.css      # 全域 Reset & 基礎樣式 (TailwindCSS)
│           ├── components/
│           │   ├── RocketAnimation/    # SVG 火箭飛行主動畫區
│           │   │   └── RocketSprite.tsx  # 高精度 SVG 火箭元件（Falcon 9 + 卡通風格）
│           │   ├── MultiplierDisplay/  # 即時倍率顯示 (大字體, 右上角定位)
│           │   ├── BetPanel/           # 單一押注面板元件
│           │   ├── PanelGrid/          # 四面板排列容器 (2x2)
│           │   ├── CountdownTimer/     # 下注倒數計時器
│           │   ├── CashoutOverlay/     # 結算成功彈窗 (金色 Glassmorphism)
│           │   ├── CrashedOverlay/     # 墜毀彈窗 (紅色爆炸)
│           │   ├── HistoryBar/         # 最近十局倍數歷史
│           │   ├── JackpotBar/         # 頂部累積大獎顯示（已隱藏）
│           │   └── FairnessPanel/      # Provably Fair 驗證面板（已隱藏）
│           ├── hooks/
│           │   ├── useGame.ts          # 遊戲邏輯 Custom Hook
│           │   ├── useWebSocket.ts     # WebSocket 連線管理
│           │   └── useApi.ts           # HTTP API 呼叫封裝
│           ├── context/
│           │   └── GameContext.tsx      # 全域遊戲狀態 Context
│           ├── services/
│           │   ├── api.ts              # HTTP Client (fetch wrapper)
│           │   └── ws.ts               # WebSocket Client
│           └── utils/
│               └── fairness.ts         # 前端 Seed 驗算
│
├── docs/
│   ├── system-design.md                # 本文件
│   └── mockups/                        # UI 原型圖
│       ├── desktop/
│       │   ├── initial.png             # 等待下注畫面
│       │   ├── start.png               # 飛行中畫面
│       │   ├── bomb.png                # 墜毀畫面
│       │   └── cashout.png             # 兌現成功畫面
│       └── mobile/
│           ├── initial.png
│           ├── start.png
│           ├── bomb.png
│           └── cashout.png
│
└── scripts/
    ├── simulate-rtp.ts                 # RTP 模擬投注腳本
    └── seed-db.ts                      # 測試資料填充
```

---

## 3. 前端架構設計

### 3.1 回合狀態機 (Round State Machine)

依據 Mockup 畫面，遊戲以**回合制**運作，每局存在 4 個主要階段：

```
              ┌──────────────┐
              │   WAITING    │  ← 等待畫面 (initial)
              │ (Countdown)  │     倒數計時至下注開始
              └──────┬───────┘
                     │ [倒數結束]
                     ▼
              ┌──────────────┐
              │   BETTING    │  ← 下注階段
              │ (Place Bets) │     玩家可在 Panel A-D 下注
              └──────┬───────┘     倒數結束自動進入飛行
                     │ [下注截止]
                     ▼
              ┌──────────────┐
       ┌─────│   FLYING     │  ← 飛行中 (start)
       │     │ (Multiplier↑) │     倍數即時增長
       │     └──┬─────┬──┘      玩家可隨時逃跑
       │        │     │
       │ [逃跑] │     │ [墜毀!]
       │        │     ▼
       │        │  ┌──────────────┐
       │        │  │  CRASHED     │  ← 墜毀 (bomb)
       │        │  │ (Game Over)  │     未逃跑面板下注歸零
       │        │  └──────┬───────┘     公開 Server Seed
       │        │         │
       │        ▼         │
       │  ┌──────────────┐│
       └─▶│  SETTLED     ││  ← 結算完成 (cashout)
          │ (Results)    │◄┘     顯示各面板盈虧
          └──────┬───────┘
                 │ [延遲後]
                 ▼
          回到 WAITING (新回合)
```

### 3.2 元件樹 (Component Tree)

依據 Mockup 分析，桌面版採用上下佈局，頂部為動畫區，下方為 2x2 面板矩陣：

```
<App>
  └── <GameContext.Provider>
        ├── <TopBar />                     // 頂部導航列
        │     ├── Logo ("RocketLH")
        │     ├── <MuteButton />            // 靜音/取消靜音按鈕
        │     └── <JackpotBar />            // JACKPOT 累積金額（已隱藏）
        │
        ├── <RocketAnimation />            // 主動畫區（SVG 火箭 + 星空背景 + 流星特效）
        │     ├── <MultiplierDisplay />     // 即時倍率大字 — 定位於右上角
        │     ├── <CountdownTimer />        // 等待/下注倒數 (e.g. "00:20")
        │     └── <NoMoreBetBanner />       // 最後 1 秒紅色 "NO MORE BET" 提示
        │
        ├── <PanelGrid>                    // 四面板容器（桌面 2x2，手機垂直堆疊）
        │     ├── <CashoutOverlay />        // 定位 PanelGrid 內 (absolute)，pointer-events-none，2 秒消失
        │     ├── <CrashedOverlay />        // 定位 PanelGrid 內 (absolute)，紅色 Glassmorphism 彈窗
        │     │                              // 顯示 "ROCKET CRASH!" + 墜毀倍數 + 損失面板數
        │     ├── <BalanceBar />            // "Balance" 顯示（白色金額）+ REBET 金色按鈕
        │     ├── <BetPanel panelId="A" /> // 獨立下注面板
        │     ├── <BetPanel panelId="B" />
        │     ├── <BetPanel panelId="C" />
        │     └── <BetPanel panelId="D" />
        │
        ├── <HistoryBar />                 // 最近十局墜毀倍數歷史（使用倍數顏色系統）
        │
        └── <FairnessPanel />              // Provably Fair 驗證折疊面板（已隱藏）

BetPanel 內部結構:
  <BetPanel>
    ├── (無面板標題 — 完全移除，無結果時不渲染 header row)
    ├── 單行佈局：Bet Amount Input (左 50%) + Auto Cashout (右 50%)
    │     ├── Bet Amount: ± 按鈕, 步進 10, 初始 $100
    │     └── Auto Cashout: 紫色 toggle (啟用=亮紫, 關閉=淡紫)
    │           ├── ± 按鈕調整倍率, 預設 2.0x
    │           └── FLYING 以外均可調整（含 bet_placed 後）
    ├── Action Button:
    │     WAITING/BETTING       → "BET" (金色)
    │     FLYING (已下注)        → "CASHOUT $xxx" (綠色)
    │     FLYING (未下注)        → 灰色停用
    │     CRASHED (未逃跑)       → "LOST" (紅色)
    │     SETTLED (已逃跑)       → 顯示盈利金額 (綠色)
    │     CRASHED/SETTLED (共通) → "WAITING FOR NEXT ROUND" 提示
    └── Potential Win 顯示 (目前倍率 × 下注金額)

REBET 功能:
  - BalanceBar 內的金色按鈕
  - 依據上局押注，自動下注所有面板（依序發送，300ms 間隔）

手機版 (@media max-width: 768px)：
  - "ROCKETLH" Logo 置頂居中
  - 動畫區壓縮高度，動畫位移使用 vw 單位（響應式）
  - 四面板垂直堆疊（單列滾動）
  - 面板 padding 壓縮, gap 縮小, 字體縮小
  - Overlay 元素壓縮，定位在 PanelGrid 內
```

### 3.3 遊戲狀態管理 (GameContext)

使用 React Context + `useReducer` 管理全域遊戲狀態：

```typescript
// packages/shared/src/types/game.ts

/** 回合階段 */
type RoundPhase = 'WAITING' | 'BETTING' | 'FLYING' | 'CRASHED' | 'SETTLED';

/** 面板 ID */
type PanelId = 'A' | 'B' | 'C' | 'D';

/** 單一面板的投注狀態 */
type PanelStatus = 'idle' | 'bet_placed' | 'cashed_out' | 'lost';

interface PanelState {
  panelId: PanelId;
  status: PanelStatus;
  betAmount: number;              // 下注金額（初始 $100，步進 10）
  autoCashout: number | null;     // 自動逃跑倍率（null = 手動）
  cashoutMultiplier: number | null; // 實際逃跑倍率
  payout: number;                 // 獎金
}

/** 全域遊戲狀態 */
interface GameState {
  // 回合狀態
  roundPhase: RoundPhase;
  sessionId: string | null;
  countdown: number;              // 倒數秒數

  // 即時倍數
  currentMultiplier: number;      // 目前倍率 (1.00x → ...)
  crashMultiplier: number | null; // 墜毀倍率（僅 CRASHED 後有值）

  // 四面板狀態
  panels: Record<PanelId, PanelState>;

  // 玩家資訊
  balance: number;

  // Provably Fair
  serverSeedHash: string | null;  // 回合開始時收到的 Hash
  serverSeed: string | null;      // 回合結束後公開的 Seed

  // 歷史
  history: { sessionId: string; crashMultiplier: number }[];
}

type GameAction =
  // 回合生命週期
  | { type: 'ROUND_WAITING'; countdown: number }
  | { type: 'ROUND_BETTING'; sessionId: string; serverSeedHash: string }
  | { type: 'ROUND_FLYING' }
  | { type: 'ROUND_CRASHED'; crashMultiplier: number; serverSeed: string }
  | { type: 'ROUND_SETTLED' }

  // 倍數更新
  | { type: 'MULTIPLIER_UPDATE'; multiplier: number }

  // 面板操作
  | { type: 'SET_BET_AMOUNT'; panelId: PanelId; amount: number }
  | { type: 'SET_AUTO_CASHOUT'; panelId: PanelId; multiplier: number | null }
  | { type: 'BET_PLACED'; panelId: PanelId }
  | { type: 'CASHOUT_SUCCESS'; panelId: PanelId; multiplier: number; payout: number }
  | { type: 'PANEL_LOST'; panelId: PanelId }

  // 餘額
  | { type: 'UPDATE_BALANCE'; balance: number }

  // 重置
  | { type: 'RESET_PANELS' };
```

### 3.4 WebSocket 訊息格式

前端透過 WebSocket 與後端進行雙向通訊。每個 WS 連線自動分配 `playerId`。

```typescript
// Server → Client 訊息
type ServerMessage =
  | { event: 'registered'; data: { playerId: string; balance: number } }
  | { event: 'round_waiting'; data: { countdown: number } }
  | { event: 'round_betting'; data: { sessionId: string; serverSeedHash: string; countdown: number } }
  | { event: 'countdown_tick'; data: { phase: 'WAITING' | 'BETTING'; remaining: number } }
  | { event: 'round_flying'; data: {} }
  | { event: 'multiplier_update'; data: { multiplier: number; elapsed: number } }
  | { event: 'round_crashed'; data: { crashMultiplier: number; serverSeed: string } }
  | { event: 'round_settled'; data: { sessionId: string } }
  | { event: 'bet_confirmed'; data: { panelId: PanelId; betAmount: number; autoCashout: number | null } }
  | { event: 'cashout_success'; data: { panelId: PanelId; multiplier: number; payout: number } }
  | { event: 'auto_cashout_triggered'; data: { panelId: PanelId; multiplier: number; payout: number } }
  | { event: 'history_update'; data: { recent: { sessionId: string; crashMultiplier: number }[] } }
  | { event: 'error'; data: { code: string; message: string } };

// Client → Server 訊息
type ClientMessage =
  | { action: 'register' }
  | { action: 'place_bet'; data: { panelId: PanelId; betAmount: number; autoCashout?: number } }
  | { action: 'cashout'; data: { panelId: PanelId; sessionId: string } }
  | { action: 'update_auto_cashout'; data: { panelId: PanelId; autoCashout: number | null } };
```

**備註：**
- Server 在 WAITING 和 BETTING 階段每秒廣播 `countdown_tick`
- Client 透過 `register` 註冊連線，Server 回傳 `registered` 與 `playerId`
- `update_auto_cashout` 在 FLYING 以外的階段均可使用（含 `bet_placed` 後）

### 3.5 UI 設計規範 (Design Tokens)

依據 Mockup 的深紫色星空 + 金橘火焰風格：

```css
/* packages/client/src/styles/variables.css */

:root {
  /* 色票 — 深紫太空主題 */
  --color-bg-primary: #0b0d1a;          /* 深色太空背景 */
  --color-bg-secondary: #141833;        /* 面板背景 */
  --color-bg-panel: rgba(20, 24, 51, 0.85); /* 面板半透明底 */
  --color-accent-gold: #f5a623;         /* 金橘色 (CTA/下注按鈕) */
  --color-accent-orange: #ff6b35;       /* 火焰橘 (火龍尾焰) */
  --color-accent-purple: #7c3aed;       /* 星際紫 (裝飾/光暈) */
  --color-accent-green: #22c55e;        /* 逃跑成功 (Cashout) */
  --color-accent-red: #ef4444;          /* 墜毀/失敗 (CRASHED) */
  --color-text-primary: #ffffff;
  --color-text-secondary: #94a3b8;
  --color-text-gold: #fbbf24;           /* 金色文字 (倍率/金額) */

  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-blur: 16px;

  /* 圓角 */
  --radius-panel: 16px;                 /* 面板圓角 */
  --radius-button: 12px;               /* 按鈕圓角 */
  --radius-input: 8px;                 /* 輸入框圓角 */

  /* 動畫區域高度 */
  --rocket-area-height: clamp(200px, 49vh, 585px);            /* 電腦版 */
  /* 手機版覆寫: --rocket-area-height: clamp(180px, 35vh, 300px); */

  /* 動畫 */
  --anim-rocket-flight: 18s;            /* 火箭飛行動畫時長 (linear) */
  --anim-multiplier-bounce: 200ms;      /* 倍率跳動 */
  --anim-crash-explosion: 2000ms;       /* 墜毀動畫總時長 (閃光300ms + 翻轉 + 墜落) */
  --anim-cashout-celebration: 600ms;    /* 逃跑成功慶祝 */

  /* 倍數顏色系統 */
  --color-multiplier-low: #22c55e;      /* < 2x 綠色 */
  --color-multiplier-mid: #fbbf24;      /* 2x-10x 金色 */
  --color-multiplier-high: #a855f7;     /* ≥ 10x 紫色 */
  --color-multiplier-crash: #ef4444;    /* 爆炸 紅色 */
}
```

### 3.6 關鍵動畫設計

**火箭視覺設計（RocketSprite.tsx — SpaceX Falcon 9 + 經典卡通火箭混合風格）：**
- **機身**：8 段式圓柱體金屬漸層（左暗→中亮→右暗）+ 環境遮蔽覆層（ambient occlusion）
- **機身細節**：4 條接縫線（高光/陰影）+ 4 排×2 鉚釘（含高光點）+ 3 條金色裝飾帶（金屬漸層）
- **鼻錐**：紅色金屬漸層 + 高光 + 邊緣陰影
- **觀景窗**：多層玻璃反射（3 層反射 + 1 光點 + 金屬邊框）
- **尾翼**：3D 厚度效果（面 + 邊 + 高光 + 陰影）
- **引擎噴嘴**：鐘形 + 內部深度（3 層）+ 安裝環
- **火焰**：4 層（紅外→橘→黃→白核心），各自獨立擾動動畫
- **排氣煙霧**：3 個動態粒子
- 所有位移使用 `vw` 單位（響應式適配各裝置）

**動畫區域高度：**
- 電腦版：`clamp(200px, 49vh, 585px)`
- 手機版：`clamp(180px, 35vh, 300px)`（CSS variable `--rocket-area-height`）

**飛行軌跡（平台差異）：**

| 平台 | 升空角度 | 動畫時長 | 終點位置 | 備註 |
|------|----------|----------|----------|------|
| 電腦版 | 8 度 | 18 秒 (linear) | 約 3x 倍率到達終點 | 超過 3x 後停在終點 (`animation-fill-mode: forwards`) |
| 手機版 | 30 度 (tan30°≈0.577) | 18 秒 (linear) | `translate(58vw, -33.5vw)` | 同上 |

**飛行位置追蹤：**
- 飛行期間使用 `requestAnimationFrame` 持續追蹤火箭像素位置
- CRASHED 時使用**最後追蹤的位置**（不依賴 crash 後讀取，避免動畫重置導致位置錯誤）
- 飛行火箭保持掛載（`visibility: hidden`），不卸載，確保 ref 有效

**墜毀動畫（CSS `@keyframes rocket-fall`，2 秒）：**

```css
@keyframes rocket-fall {
  0%   { /* 原位閃光放大 */ transform: translate(lastX, lastY) scale(1.3); }
  15%  { /* 翻轉至 135 度（頭朝右下）*/ transform: translate(lastX, lastY) rotate(135deg) scale(1.0); }
  40%  { /* 開始 45 度向右下墜落 */ }
  100% { /* 墜落終點 */ transform: translate(lastX+200px, lastY+350px) rotate(135deg) scale(0.4); opacity: 0; }
}
```

- 容器 `overflow` 在 CRASHED 時切換為 `visible`
- 使用 CSS `@keyframes` 驅動（非 transition + state）

| 動畫 | 觸發時機 | 實作方式 |
|------|----------|----------|
| 火箭飛行 | FLYING 階段持續 | CSS `transition` + `transform: translate()` 升空飛行 (vw 單位), 18 秒 linear; `requestAnimationFrame` 持續追蹤位置 |
| 火箭墜毀 | CRASHED 瞬間 | CSS `@keyframes rocket-fall`: 原位閃光 scale(1.3) → 翻轉 135° → 45° 右下墜落 (+200px,+350px) 縮小至 0.4 淡出, 共 2 秒 |
| 星空背景 | 持續播放 | CSS `@keyframes` 星點滾動 + 流星尾跡 |
| 倍率跳動 | 每次倍數更新 | CSS `@keyframes` scale pulse + 依倍數變色（右上角定位） |
| 逃跑成功 | Cashout 時 | 金色 Glassmorphism 彈窗 fadeIn + 粒子慶祝（PanelGrid 內, pointer-events-none, 2 秒消失） |
| 倒數計時 | WAITING/BETTING | CSS `@keyframes` 數字縮放 + 漸變 |
| NO MORE BET | BETTING 最後 1 秒 | 紅色文字閃爍動畫 |
| 面板狀態切換 | 下注/逃跑/失敗 | CSS `transition` 背景色 + 邊框顏色漸變 |

**倍數顏色系統（MultiplierDisplay & HistoryBar 統一）：**

| 倍數範圍 | 顏色 | 色碼 |
|----------|------|------|
| < 2x | 綠色 | `#22c55e` |
| 2x - 10x | 金色 | `#fbbf24` |
| ≥ 10x | 紫色 | `#a855f7` |
| 爆炸 (CRASHED) | 紅色 | `#ef4444` |

### 3.7 覆蓋層設計 (Overlays)

覆蓋層定位於 PanelGrid 內（`position: absolute`），不覆蓋整個畫面：

| 覆蓋層 | 觸發條件 | 視覺風格 | 行為 |
|--------|----------|----------|------|
| **CashoutOverlay** | 任一面板成功逃跑 | 金色 Glassmorphism 卡片，「CONGRATULATIONS!」、Total Payout 金額（美元）、逃跑倍率、金色粒子效果 | `pointer-events: none`，2 秒自動消失 |
| **CrashedOverlay** | 火箭墜毀 | 紅色 Glassmorphism 彈窗，大字「ROCKET CRASH!」+ 墜毀倍數 + 損失面板數 | 彈窗風格，SETTLED 後顯示 |
| **PanelResult** | 回合結束 | 各面板獨立顯示：「LOST」(紅色) 或盈利金額 (綠色) | CRASHED/SETTLED 顯示 "WAITING FOR NEXT ROUND" |

### 3.8 音效系統 (Sound System)

使用 Web Audio API 合成音效，無需外部音檔載入：

| 音效 ID | 觸發時機 | 音效描述 |
|---------|----------|----------|
| `countdownTick` | BETTING 倒數每秒 | 短促嗶聲 |
| `betPlaced` | 下注確認 | 硬幣音效 |
| `multiplierTick` | FLYING 倍數更新 | 逐漸升高的音調 |
| `cashoutSuccess` | 逃跑成功 | 金幣收集慶祝音 |
| `crashExplosion` | 火箭墜毀 | 爆炸低頻音 |
| `roundStart` | 新回合開始 | （靜音，無音效） |

**特殊音效：**
- BETTING 倒數結束時：清脆「噹」聲（A7 + C8 + E7 + A6 和弦疊加）

**控制：**
- TopBar 加入靜音按鈕（`<MuteButton />`），切換全域靜音
- 手機版：首次觸摸（touchstart）解鎖 AudioContext（瀏覽器安全策略要求）
- WAITING 階段無音效

---

## 4. 後端架構設計

### 4.1 模組依賴圖

```
routes/game.ts          ws/multiplier.ts
    │                       │
    ▼                       ▼
engine/CrashEngine.ts  ◄────────  核心控制器 (Singleton)
    │
    ├── engine/RoundManager.ts      ← 回合生命週期管理 (計時器 + 狀態)
    ├── engine/ProvablyFair.ts      ← Seed 生成 / 墜毀點計算
    ├── engine/CrashMath.ts         ← RTP + Volatility 數學模型
    ├── engine/SessionStore.ts      ← 回合 & 押注狀態暫存 (Map)
    ├── services/lobby-client.ts    ← 大廳錢包橋接 (getBalance/settle/closeSession)
    └── db/models/*                 ← 資料庫讀寫 (fire-and-forget，不阻擋遊戲)
```

**架構備註：**
- `placeBet` / `cashout` 方法為 `async`（支援大廳錢包 settle 呼叫）
- Lobby settle 失敗時自動 fallback 到 in-memory 餘額管理
- 每個 WS 連線附帶 per-connection bet 序列化鎖（防止併發 race condition）
- DB 操作採 fire-and-forget 模式（寫入失敗不影響遊戲進行）
- `CrashEngine.getSessionStore()` 公開方法供外部查詢回合狀態

### 4.2 CrashEngine 核心類別

```typescript
// packages/server/src/engine/CrashEngine.ts

class CrashEngine {
  private roundManager: RoundManager;
  private sessionStore: SessionStore;
  private provablyFair: ProvablyFair;
  private crashMath: CrashMath;

  /** 取得目前回合狀態 */
  getRoundState(): RoundState;

  /** 玩家在指定面板下注 */
  async placeBet(params: {
    playerId: string;
    panelId: PanelId;          // 'A' | 'B' | 'C' | 'D'
    betAmount: number;
    autoCashout?: number;       // 自動逃跑倍率 (nullable)
  }): Promise<PlaceBetResponse>;

  /** 玩家在指定面板逃跑 */
  async cashout(params: {
    playerId: string;
    panelId: PanelId;
    sessionId: string;
  }): Promise<CashoutResponse>;

  /** 驗證公平性 (回合結束後) */
  verifyFairness(params: {
    serverSeed: string;
    clientSeed: string;
    nonce: number;
  }): VerifyResponse;
}
```

### 4.3 RoundManager 回合生命週期

回合管理器負責控制每局遊戲的計時與狀態轉換：

```typescript
// packages/server/src/engine/RoundManager.ts

class RoundManager extends EventEmitter {
  private phase: RoundPhase = 'WAITING';
  private multiplier: number = 1.00;
  private crashPoint: number;           // 本局預定墜毀倍率
  private tickInterval: NodeJS.Timer | null = null;

  /** 回合計時設定 */
  private readonly WAITING_DURATION = 3000;    // 等待階段 3 秒
  private readonly BETTING_DURATION = 20000;   // 下注階段 20 秒
  private readonly NO_MORE_BET_PAUSE = 1000;   // "NO MORE BET" 暫停 1 秒（BETTING 結束後、FLYING 開始前）
  private readonly TICK_INTERVAL = 50;         // 倍數更新頻率 50ms (20Hz)
  private readonly SETTLED_DURATION = 3000;    // 結算展示 3 秒

  /** 啟動新回合 */
  startNewRound(crashPoint: number, serverSeedHash: string): void {
    // WAITING → BETTING → FLYING → CRASHED → SETTLED → WAITING...
  }

  /** 飛行階段 — 倍數增長 tick */
  private tick(): void {
    // 倍數以指數曲線增長
    // 當 multiplier >= crashPoint 時觸發墜毀
    this.multiplier = calculateMultiplierAtTime(elapsed, this.crashPoint);
    this.emit('multiplier_update', this.multiplier);

    if (this.multiplier >= this.crashPoint) {
      this.crash();
    }
  }

  /** 觸發墜毀 */
  private crash(): void {
    this.phase = 'CRASHED';
    this.emit('crashed', this.crashPoint);
  }
}
```

### 4.4 SessionStore 設計

管理每回合的玩家押注狀態，使用 `Map` 結構：

```typescript
// packages/server/src/engine/SessionStore.ts

interface RoundSession {
  sessionId: string;
  crashPoint: number;              // 預定墜毀點 (僅後端可見)
  serverSeed: string;
  serverSeedHash: string;
  rtpSetting: number;
  volatilityLevel: number;
  phase: RoundPhase;
  startedAt: Date;
}

interface PanelBet {
  betId: string;
  sessionId: string;
  playerId: string;
  panelId: PanelId;
  betAmount: number;
  autoCashout: number | null;
  status: 'active' | 'cashed_out' | 'lost';
  cashoutMultiplier: number | null;
  payout: number;
  lobbyToken: string | null;         // 大廳 Game Session Token
  lobbySessionId: string | null;     // 大廳 Session ID
  createdAt: Date;
}

class SessionStore {
  private currentRound: RoundSession | null = null;
  private bets: Map<string, PanelBet> = new Map();   // key: `${playerId}:${panelId}`
  private readonly TTL_MS = 30 * 60 * 1000;

  createRound(session: RoundSession): void;
  getCurrentRound(): RoundSession | null;
  placeBet(bet: PanelBet): void;
  getBet(playerId: string, panelId: PanelId): PanelBet | undefined;
  getActiveBets(): PanelBet[];                        // 所有尚未結算的押注
  settleBet(playerId: string, panelId: PanelId, result: Partial<PanelBet>): void;
  clearRound(): void;                                 // 回合結束清理
}
```

### 4.5 請求驗證層

所有 API 端點必須經過以下驗證：

| 驗證項目 | 說明 |
|----------|------|
| **參數合法性** | `panelId` ∈ ['A','B','C','D']，`betAmount` > 0，`autoCashout` > 1.00 |
| **回合階段** | `placeBet` 僅允許在 `BETTING` 階段 |
| **面板唯一性** | 同一玩家同一回合每個面板僅允許一次下注 |
| **逃跑合法性** | 僅 `FLYING` 階段 + `status: 'active'` 的面板才允許逃跑 |
| **餘額充足** | 下注時驗證餘額 ≥ 各面板下注總額 |

---

## 5. API 規格定義

### 5.1 POST /game/bet

在指定面板下注（BETTING 階段）。

**Request:**
```json
{
  "playerId": "user_999",
  "panelId": "A",
  "betAmount": 50.00,
  "autoCashout": 2.00
}
```

**Response (200):**
```json
{
  "betId": "BET-ROCKET-20260317-P1",
  "sessionId": "SESSION-LH-88888",
  "panelId": "A",
  "betAmount": 50.00,
  "autoCashout": 2.00,
  "balance": 950.00
}
```

### 5.2 POST /game/cashout

在指定面板逃跑（FLYING 階段）。

**Request:**
```json
{
  "playerId": "user_999",
  "panelId": "A",
  "sessionId": "SESSION-LH-88888"
}
```

**Response (200):**
```json
{
  "panelId": "A",
  "cashoutMultiplier": 2.45,
  "payout": 122.50,
  "profit": 72.50,
  "balance": 1072.50
}
```

### 5.3 GET /game/history

取得最近 N 局的墜毀倍數歷史。

**Query Params:** `limit` (預設 10)

**Response (200):**
```json
{
  "rounds": [
    { "sessionId": "SESSION-LH-88888", "crashMultiplier": 5.42, "crashedAt": "2026-03-17T19:35:15.000Z" },
    { "sessionId": "SESSION-LH-88887", "crashMultiplier": 1.23, "crashedAt": "2026-03-17T19:34:02.000Z" }
  ]
}
```

### 5.4 GET /game/verify

供玩家驗證回合公平性。

**Query Params:** `serverSeed`, `clientSeed`, `nonce`

**Response (200):**
```json
{
  "isValid": true,
  "computedHash": "d8e9f2a1...",
  "computedCrashPoint": 5.42
}
```

### 5.5 GET /game/round-state

取得目前回合狀態（初次連線或重新連線用）。

**Response (200):**
```json
{
  "phase": "FLYING",
  "sessionId": "SESSION-LH-88888",
  "serverSeedHash": "d8e9f2a1...",
  "currentMultiplier": 2.45,
  "elapsed": 12500
}
```

### 5.6 錯誤回應格式

所有錯誤統一使用以下格式：

```json
{
  "error": {
    "code": "BET_PHASE_CLOSED",
    "message": "Betting phase has ended. Please wait for the next round."
  }
}
```

**錯誤代碼列表:**

| Code | HTTP Status | 說明 |
|------|-------------|------|
| `INVALID_PARAMS` | 400 | 請求參數不合法 |
| `INVALID_PANEL_ID` | 400 | 面板 ID 不在 A-D 範圍 |
| `BET_PHASE_CLOSED` | 409 | 下注階段已結束 |
| `DUPLICATE_BET` | 409 | 同一面板已下注 |
| `NOT_FLYING` | 409 | 非飛行階段，無法逃跑 |
| `ALREADY_CASHED_OUT` | 409 | 該面板已逃跑 |
| `SESSION_NOT_FOUND` | 404 | 找不到指定的 Session |
| `SESSION_MISMATCH` | 403 | Session 不屬於當前回合 |
| `INSUFFICIENT_BALANCE` | 402 | 餘額不足 |

---

## 6. 資料模型設計

### 6.1 ER Diagram

```
┌───────────────────────────────┐
│   rocketlh_crash_logs          │     ← 每局一筆，所有面板共用
├───────────────────────────────┤
│ draw_id (PK)                   │
│ session_id (UNIQUE)            │
│ crash_multiplier               │
│ server_seed                    │
│ server_seed_hash               │
│ client_seed                    │
│ rtp_setting                    │
│ volatility_level               │
│ created_at                     │
│ crashed_at                     │
└──────────┬────────────────────┘
           │ 1
           │
           │ N
┌──────────▼────────────────────┐     ┌───────────────────────────────┐
│   rocketlh_bet_records         │     │   rocketlh_settlements         │
├───────────────────────────────┤     ├───────────────────────────────┤
│ bet_id (PK)                    │────▶│ settlement_id (PK)             │
│ session_id (FK)                │     │ bet_id (FK)                    │
│ player_id                      │     │ outcome (win/lose)             │
│ panel_id (A/B/C/D)            │     │ cashout_multiplier             │
│ bet_amount (DECIMAL)           │     │ payout (DECIMAL)               │
│ rtp_setting                    │     │ profit (DECIMAL)               │
│ volatility_level               │     │ settled_at                     │
│ status                         │     └───────────────────────────────┘
│ auto_cashout                   │
│ created_at                     │
└───────────────────────────────┘
```

> **備註：** 所有表名加上 `rocketlh_` 前綴，避免與其他遊戲表名衝突。DB 操作採 fire-and-forget 模式，不阻擋遊戲主迴圈。

### 6.2 DDL 定義

> 對標 `rocketLH` proposal 標準化資料結構。

```sql
-- 開獎記錄表（每局一筆，所有面板共用）
CREATE TABLE rocketlh_crash_logs (
    draw_id           VARCHAR(64) PRIMARY KEY,         -- e.g. CRASH-LOG-20260317-D1
    session_id        VARCHAR(64) UNIQUE NOT NULL,
    crash_multiplier  DECIMAL(10, 4) NOT NULL,          -- 墜毀倍率
    server_seed       VARCHAR(128) NOT NULL,
    server_seed_hash  VARCHAR(128) NOT NULL,
    client_seed       VARCHAR(128),                     -- 玩家自訂 Seed (nullable)
    rtp_setting       SMALLINT NOT NULL CHECK (rtp_setting IN (94, 95, 96, 97, 98, 99)),
    volatility_level  SMALLINT NOT NULL DEFAULT 3 CHECK (volatility_level BETWEEN 1 AND 5),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    crashed_at        TIMESTAMPTZ                       -- 回合結束時間
);

CREATE INDEX idx_rocketlh_crash_logs_session_id ON rocketlh_crash_logs (session_id);
CREATE INDEX idx_rocketlh_crash_logs_created_at ON rocketlh_crash_logs (created_at DESC);

-- 注單記錄表（每個面板一筆，單局最多 4 筆）
CREATE TABLE rocketlh_bet_records (
    bet_id            VARCHAR(64) PRIMARY KEY,          -- e.g. BET-ROCKET-20260317-P1
    session_id        VARCHAR(64) NOT NULL REFERENCES rocketlh_crash_logs(session_id),
    player_id         VARCHAR(64) NOT NULL,
    panel_id          CHAR(1) NOT NULL CHECK (panel_id IN ('A', 'B', 'C', 'D')),
    bet_amount        DECIMAL(12, 2) NOT NULL CHECK (bet_amount > 0),
    rtp_setting       SMALLINT NOT NULL CHECK (rtp_setting IN (94, 95, 96, 97, 98, 99)),
    volatility_level  SMALLINT NOT NULL DEFAULT 3,
    status            VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cashed_out', 'lost')),
    auto_cashout      DECIMAL(10, 2),                   -- 自動逃跑倍率 (nullable)
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (session_id, player_id, panel_id)            -- 同回合同玩家同面板只能下注一次
);

CREATE INDEX idx_rocketlh_bet_records_session_id ON rocketlh_bet_records (session_id);
CREATE INDEX idx_rocketlh_bet_records_player_id ON rocketlh_bet_records (player_id);

-- 結算記錄表
CREATE TABLE rocketlh_settlements (
    settlement_id      VARCHAR(64) PRIMARY KEY,         -- e.g. SETTLE-ROCKET-20260317-S1
    bet_id             VARCHAR(64) NOT NULL REFERENCES rocketlh_bet_records(bet_id),
    outcome            VARCHAR(8) NOT NULL CHECK (outcome IN ('win', 'lose')),
    cashout_multiplier DECIMAL(10, 4) NOT NULL,         -- 逃跑倍率 (lose 時 = crash_multiplier)
    payout             DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    profit             DECIMAL(12, 2) NOT NULL DEFAULT 0.00,  -- 淨利潤 (payout - betAmount)
    settled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rocketlh_settlements_bet_id ON rocketlh_settlements (bet_id);
```

---

## 7. 核心演算法模組

### 7.1 墜毀點生成 (Crash Point Generator)

Crash 遊戲的核心在於：基於 RTP 與 Volatility 參數，生成符合數學期望的墜毀倍率。

```typescript
// packages/server/src/engine/CrashMath.ts

/**
 * 基於 Inverse CDF 方法生成墜毀點
 *
 * 基本公式 (無 Volatility 調整):
 *   crashPoint = RTP / (1 - randomValue)
 *   其中 randomValue ∈ [0, 1) 為均勻分佈隨機數
 *
 * 加入 Volatility 調整:
 *   使用 Beta 分佈變換 randomValue，改變倍數分配曲線形狀
 */
class CrashMath {
  private readonly rtpOptions = [94, 95, 96, 97, 98, 99];
  private readonly volatilityParams: Record<number, { alpha: number; beta: number }> = {
    1: { alpha: 1.0, beta: 2.0 },   // 低波動：偏重低倍數（β>α 集中低端）
    2: { alpha: 1.0, beta: 1.5 },   // 中低波動
    3: { alpha: 1.0, beta: 1.0 },   // 中波動：標準均勻分佈 (預設)
    4: { alpha: 1.5, beta: 1.0 },   // 高波動：偏重高倍數
    5: { alpha: 2.0, beta: 1.0 },   // 極高波動：長尾分佈（α>β 集中高端）
  };

  /**
   * 計算墜毀點
   * @param randomValue - 由 Provably Fair 機制生成的 [0, 1) 確定性隨機數
   * @param rtp - RTP 百分比 (94-99)
   * @param volatility - 波動度等級 (1-5)
   * @returns 墜毀倍率 (最低 1.00x)
   */
  calculateCrashPoint(randomValue: number, rtp: number, volatility: number): number {
    const rtpDecimal = rtp / 100;
    const { alpha, beta } = this.volatilityParams[volatility];

    // 透過 Beta 分佈 CDF 逆函數調整 randomValue
    const adjustedRandom = this.betaInverseCDF(randomValue, alpha, beta);

    // 計算墜毀點
    const crashPoint = rtpDecimal / (1 - adjustedRandom);

    // 最低為 1.00x，精度到小數兩位
    return Math.max(1.00, Math.floor(crashPoint * 100) / 100);
  }

  /**
   * Beta 分佈逆 CDF (近似實作)
   */
  private betaInverseCDF(p: number, alpha: number, beta: number): number {
    // 當 alpha=1, beta=1 時等同均勻分佈，直接回傳 p
    if (alpha === 1 && beta === 1) return p;
    // 使用數值逼近法計算 Beta 逆 CDF
    // ... (Newton-Raphson 或查表法)
  }

  /**
   * 計算在特定倍數的生存機率 (用於驗證/顯示)
   * P(crash > target) = 1 - CDF(1 - rtp/target)
   */
  survivalProbability(targetMultiplier: number, rtp: number, volatility: number): number {
    const rtpDecimal = rtp / 100;
    if (targetMultiplier <= 1.00) return 1.0;
    const rawP = 1 - rtpDecimal / targetMultiplier;
    const { alpha, beta } = this.volatilityParams[volatility];
    return 1 - this.betaCDF(rawP, alpha, beta);
  }
}
```

### 7.2 倍數增長曲線

飛行階段的倍數隨時間以指數曲線增長：

```typescript
/**
 * 計算特定時間點的倍數
 * 使用指數增長模型: multiplier = e^(speed * elapsed)
 * speed 參數根據 crashPoint 和目標飛行時長反推
 */
function calculateMultiplierAtTime(elapsedMs: number, targetDuration: number = 60000): number {
  // 基礎速率：讓倍數在目標時長內增長到合理範圍
  const speed = 0.00006; // 可調參數
  const multiplier = Math.exp(speed * elapsedMs);
  return Math.floor(multiplier * 100) / 100;
}
```

### 7.3 自動逃跑處理

每次倍數更新 tick 時，檢查所有設定了自動逃跑的面板：

```typescript
/**
 * 在每次 multiplier tick 時執行
 */
function checkAutoCashouts(currentMultiplier: number, activeBets: PanelBet[]): PanelBet[] {
  const triggered: PanelBet[] = [];
  for (const bet of activeBets) {
    if (
      bet.status === 'active' &&
      bet.autoCashout !== null &&
      currentMultiplier >= bet.autoCashout
    ) {
      triggered.push(bet);
    }
  }
  return triggered;
}
```

---

## 8. Provably Fair 機制設計

### 8.1 機制流程

```
回合開始前:
  Server 產生: serverSeed (隨機 32 bytes hex)
  Server 計算: serverSeedHash = SHA-256(serverSeed)
  Server 廣播: serverSeedHash → 所有連線的前端 (承諾)

回合進行中:
  墜毀點由 serverSeed + clientSeed + nonce 決定性計算
  玩家只能看到 Hash，無法反推墜毀點

回合結束後 (墜毀):
  Server 公開: serverSeed
  前端驗證: SHA-256(serverSeed) === 先前收到的 serverSeedHash
  前端驗證: 用 serverSeed + clientSeed + nonce 重算墜毀點 → 結果一致
```

### 8.2 墜毀點確定性生成

```typescript
// packages/server/src/engine/ProvablyFair.ts

import crypto from 'crypto';

class ProvablyFair {
  /**
   * 產生 Server Seed
   */
  generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 計算 Hash
   */
  hashSeed(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  /**
   * 基於 Seed 生成確定性隨機數 [0, 1)
   * 用於墜毀點計算
   */
  generateRandomValue(serverSeed: string, clientSeed: string, nonce: number): number {
    const hmac = crypto.createHmac('sha256', serverSeed)
                       .update(`${clientSeed}:${nonce}`)
                       .digest('hex');

    // 取前 8 個 hex 字元 (32 bits) 轉為 [0, 1) 浮點數
    const intValue = parseInt(hmac.substring(0, 8), 16);
    return intValue / 0x100000000; // 除以 2^32
  }

  /**
   * 一步到位：生成墜毀點
   */
  generateCrashPoint(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    rtp: number,
    volatility: number,
    crashMath: CrashMath
  ): number {
    const randomValue = this.generateRandomValue(serverSeed, clientSeed, nonce);
    return crashMath.calculateCrashPoint(randomValue, rtp, volatility);
  }
}
```

### 8.3 前端驗證工具

```typescript
// packages/shared/src/fairness.ts (前後端共用)

/**
 * 玩家可在前端自行驗證:
 * 1. serverSeedHash 是否匹配
 * 2. crashPoint 是否可由 serverSeed 重現
 */
async function verifySeedHash(serverSeed: string, expectedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(serverSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return computedHash === expectedHash;
}

/**
 * 重算墜毀點以驗證公平性
 */
function verifyCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  rtp: number,
  volatility: number
): number {
  // 與後端使用完全相同的 HMAC-SHA256 + Inverse CDF 邏輯
  const hmac = hmacSha256(serverSeed, `${clientSeed}:${nonce}`);
  const intValue = parseInt(hmac.substring(0, 8), 16);
  const randomValue = intValue / 0x100000000;
  return calculateCrashPointClient(randomValue, rtp, volatility);
}
```

---

## 9. 安全性設計

### 9.1 威脅模型與對策

| 威脅 | 風險等級 | 對策 |
|------|----------|------|
| **結果竄改** — 竄改逃跑請求偽造倍率 | 高 | 後端鎖定逃跑瞬間的即時倍率，前端無法影響判定 |
| **提前逃跑** — 在墜毀後才發送逃跑請求 | 高 | 後端精確記錄墜毀時間，墜毀後拒絕所有逃跑請求 |
| **重複下注** — 同一面板重複下注 | 中 | `UNIQUE (session_id, player_id, panel_id)` 約束 + SessionStore 雙重驗證 |
| **Session 劫持** — 盜用他人 Session 逃跑 | 中 | 所有請求驗證 playerId 歸屬 |
| **時序攻擊** — 透過延遲推測墜毀點 | 低 | 墜毀點在回合開始前即已確定，飛行階段僅按時間遞增倍數 |
| **暴力猜測** — 嘗試推算 Server Seed | 低 | SHA-256 單向函數，32 bytes 隨機 Seed (2^256 組合) |
| **超額投注** — 多面板總額超過餘額 | 高 | 每次下注即時驗證並預扣餘額 |
| **WebSocket 注入** — 偽造倍數訊息 | 中 | WebSocket 僅 Server→Client 單向廣播，Client 無法傳送倍數 |

### 9.2 輸入驗證規則

```typescript
// packages/server/src/middleware/validation.ts

const placeBetSchema = {
  playerId: { type: 'string', required: true, minLength: 1 },
  panelId: { type: 'string', required: true, enum: ['A', 'B', 'C', 'D'] },
  betAmount: { type: 'number', required: true, min: 0.01 },
  autoCashout: { type: 'number', required: false, min: 1.01 },  // 必須大於 1.00x
};

const cashoutSchema = {
  playerId: { type: 'string', required: true },
  panelId: { type: 'string', required: true, enum: ['A', 'B', 'C', 'D'] },
  sessionId: { type: 'string', required: true },
};
```

### 9.3 Rate Limiting

| 端點 | 限制 |
|------|------|
| `POST /game/bet` | 每位玩家每回合最多 4 次（每面板 1 次） |
| `POST /game/cashout` | 每面板每回合限 1 次 |
| `GET /game/history` | 每位玩家每秒 5 次 |
| WebSocket 連線 | 每 IP 最多 5 個並發連線 |

---

## 10. 測試策略

### 10.1 測試層級

```
┌─────────────────────────────────────┐
│        E2E Tests (Playwright)       │  完整多回合遊戲流程
├─────────────────────────────────────┤
│      Integration Tests (Vitest)     │  API 端點 + WebSocket + DB
├─────────────────────────────────────┤
│        Unit Tests (Vitest)          │  純函數 & 模組
└─────────────────────────────────────┘
```

### 10.2 關鍵測試案例

**Unit Tests (shared/fairness):**
- SHA-256 Hash 前後端計算結果一致
- 相同 Seed + nonce 生成相同隨機值（確定性）
- 不同 Seed 生成不同隨機值（隨機性）

**Unit Tests (server/CrashMath):**
- 各 RTP / Volatility 組合下墜毀點生成的統計分佈
- 墜毀點最低值為 1.00x
- 生存機率隨目標倍數單調遞減
- Beta 分佈逆 CDF 邊界值正確

**Unit Tests (server/RoundManager):**
- 回合狀態機完整轉換：WAITING → BETTING → FLYING → CRASHED → SETTLED → WAITING
- 倍數在飛行階段單調遞增
- 倍數達到 crashPoint 時正確觸發墜毀
- 自動逃跑在正確倍數觸發

**Unit Tests (server/CrashEngine):**
- placeBet → 正確建立押注記錄
- placeBet 在非 BETTING 階段 → 拒絕
- 同一面板重複下注 → 拒絕
- cashout → 鎖定正確倍率並計算獎金
- cashout 在非 FLYING 階段 → 拒絕
- 墜毀後未逃跑面板 → 標記為 lost

**Integration Tests (API + WebSocket):**
- 完整遊戲流程：bet → 飛行 → cashout
- 完整失敗流程：bet → 飛行 → crashed → lost
- 多面板同時下注，部分逃跑部分未逃跑
- WebSocket 倍數廣播接收正確
- 參數驗證 (400 errors)
- 回合階段驗證 (409 errors)

**RTP 模擬驗證 (scripts/simulate-rtp.ts):**
- 對每個 RTP × Volatility 組合進行 100,000+ 局自動化投注模擬
- 驗證最終回報率是否落在設定值 ± 1.0% 範圍內
- 驗證 Volatility 對倍數分佈的影響是否符合對照表

### 10.3 RTP 模擬腳本設計

```typescript
// scripts/simulate-rtp.ts

async function simulateRTP(params: {
  rtpSetting: number;           // 94-99
  volatilityLevel: number;      // 1-5
  rounds: number;               // 模擬局數 (建議 100,000+)
  betAmount: number;
  cashoutStrategy: 'random' | 'fixed'; // 模擬逃跑策略
  fixedCashout?: number;        // 固定逃跑倍率
}): Promise<{
  totalBet: number;
  totalPayout: number;
  actualRTP: number;
  deviation: number;            // 與設定值的偏差百分比
  distribution: {               // 墜毀倍數分佈統計
    'under_1.5x': number;
    '1.5x_to_2x': number;
    '2x_to_5x': number;
    '5x_to_10x': number;
    '10x_to_50x': number;
    '50x_to_100x': number;
    'over_100x': number;
  };
}>;
```

---

## 11. 大廳錢包整合

### 11.1 錢包 API 串接

遊戲結算時，透過大廳 API Client 進行餘額操作：

| API 端點 | 用途 |
|----------|------|
| `GET /lobby/api/game/balance` | 取得玩家即時餘額（每回合開始前） |
| `POST /lobby/api/game/settle` | 結算下注與獎金（下注扣款 + 逃跑發放） |
| `POST /lobby/api/game/close-session` | 關閉遊戲 Session（玩家離開遊戲時） |

### 11.2 認證機制

- 遊戲前端透過大廳發放的 **Game Session Token**（短效 JWT，30 分鐘有效）存取玩家餘額
- 遊戲後端透過 **X-Game-Secret** Header（共享金鑰）呼叫大廳結算 API

### 11.3 多面板結算流程

由於每局可能有多個面板同時下注，結算需注意交易完整性：

```
回合開始 (BETTING):
  Panel A 下注 $50 → POST /lobby/api/game/settle { type: 'debit', amount: 50 }
  Panel B 下注 $100 → POST /lobby/api/game/settle { type: 'debit', amount: 100 }
  (各面板獨立扣款)

飛行中 (FLYING):
  Panel A 逃跑 2.45x → POST /lobby/api/game/settle { type: 'credit', amount: 122.50 }
  (即時發放獎金)

墜毀後 (CRASHED):
  Panel B 未逃跑 → 無需額外操作 (下注已在 BETTING 階段預扣)
```

---

## 12. 部署架構

### 12.1 開發環境

```
npm run dev
  ├── client (Vite dev server) → http://localhost:5178 (內部開發用)
  └── server (ts-node-dev)     → http://localhost:4002 (內部開發用, HTTP + WS)
```

- Vite dev server 透過 `proxy` 設定將 `/game/*` 請求與 WebSocket 轉發至後端。
- Vite 設定 `server.host: true` 暴露區域網路，支援手機測試。
- 透過 game-lobby 的 Unified Gateway（Port 3001/3002）統一對外提供 `/rocketLH/` 路由。

### 12.2 整合架構

```
                  Unified Gateway (game-lobby)
                  ┌─────────────────────────────────────────────────┐
Browser ──────►   │ Port 3001 /rocketLH/       → 前端               │
                  │ Port 3002 /rocketLH/       → 後端 API           │
                  │ Port 3002 /rocketLH/ws     → WebSocket          │
                  │                                                  │
                  │ Gateway 實作：                                    │
                  │  createServer + server.on('upgrade')             │
                  │  手動處理 WS 代理（HTTP Upgrade）                  │
                  │  /rocketLH/ws → ws://localhost:4002              │
                  │  pathRewrite: '^/rocketLH' → '' (無 /api 前綴)   │
                  └─────────────┬───────────────────────────────────┘
                                │ (結算)
                                ▼
                  大廳後端 Wallet API
                  POST /lobby/api/game/settle
```

**WS 代理備註：**
- 前端 WS URL：`ws://${location.host}/rocketLH/ws`（透過 Gateway）
- Gateway 使用 `createServer` + `server.on('upgrade')` 手動攔截 WebSocket 升級請求
- 路徑重寫：`/rocketLH/*` → `/*`（後端無需知道 `/rocketLH` 前綴）

### 12.3 生產環境

```
┌──────────────────────────────────────────────┐
│           game-lobby Unified Gateway          │
│         (Port 3001 前端 / Port 3002 API)      │
├──────────────────────┬───────────────────────┤
│   /rocketLH/         │   /rocketLH/          │
│   Static Files       │   API Proxy           │
│   (client/dist/)     │   + WS Proxy          │
│                      │        │              │
│                      │        ▼              │
│                      │   Node.js Server      │
│                      │   (HTTP + WebSocket)  │
│                      │        │              │
│                      │        ▼              │
│                      │   PostgreSQL          │
│                      │   (+ Redis optional)  │
└──────────────────────┴───────────────────────┘
```

### 12.4 環境變數

```bash
# .env.example

# Server
PORT=4002
NODE_ENV=production
BASE_URL=/rocketLH/

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/rocket_lh

# Game Config
DEFAULT_RTP=97
DEFAULT_VOLATILITY=3
SESSION_TTL_MINUTES=30

# 回合計時 (毫秒)
WAITING_DURATION=3000
BETTING_DURATION=20000
NO_MORE_BET_PAUSE=1000
SETTLED_DURATION=3000

# WebSocket
WS_PATH=/rocketLH/ws
WS_HEARTBEAT_INTERVAL=30000

# 大廳整合
LOBBY_API_URL=http://localhost:3002/lobby
GAME_SECRET=rocketlh-shared-secret

# 非大廳模式（獨立運行時使用的初始餘額）
DEFAULT_BALANCE=1000

# Redis (optional, for horizontal scaling)
# REDIS_URL=redis://localhost:6379

# Security
CORS_ORIGIN=http://localhost:3001
RATE_LIMIT_WINDOW_MS=1000
RATE_LIMIT_MAX_REQUESTS=10
```

---

## 附錄 A: 開發階段對照

| Phase | 涵蓋的系統設計章節 | 交付物 |
|-------|---------------------|--------|
| Phase 1 | §2 (結構), §7 (演算法) | Monorepo 骨架 + `CrashMath` + `ProvablyFair` + Unit Tests |
| Phase 2 | §4 (後端), §5 (API), §6 (DB), §8 (Fair) | CrashEngine + RoundManager + API + WebSocket + DB Migration |
| Phase 3 | §3 (前端) | React UI + 火龍動畫 + 四面板 + WebSocket 串接 |
| Phase 4 | §10 (測試), §11 (大廳整合), §12 (部署) | E2E Tests + RTP 模擬 + 大廳錢包串接 + 部署設定 |

---

## 附錄 B: 變異數與 RTP 賠率參照

### B.1 Volatility 等級生存機率 (RTP 97%)

| 目標倍率 | LV.1 (低波動) | LV.2 (中低) | LV.3 (中波動) | LV.4 (高波動) | LV.5 (極高) |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **1.10x** | 88.0% | 87.0% | 86.0% | 84.0% | 80.0% |
| **1.50x** | 64.0% | 63.0% | 61.0% | 58.0% | 52.0% |
| **2.00x** | 48.0% | 47.0% | 45.0% | 42.0% | 35.0% |
| **5.00x** | 18.0% | 19.0% | 19.4% | 19.5% | 18.5% |
| **10.0x** | 5.0% | 7.5% | 9.0% | 10.5% | 12.0% |
| **50.0x** | 0.1% | 0.8% | 1.5% | 2.5% | 3.5% |
| **100x** | 0.01% | 0.2% | 0.8% | 1.5% | 2.5% |
| **1000x** | 0.00% | 0.01% | 0.05% | 0.15% | 0.50% |

### B.2 全 RTP 等級對照 (Volatility LV.3)

| 目標倍率 | RTP 94% | RTP 95% | RTP 96% | RTP 97% (預設) | RTP 98% | RTP 99% |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1.10x** | 83.3% | 84.1% | 85.1% | 86.0% | 86.9% | 87.8% |
| **1.50x** | 59.1% | 59.8% | 60.4% | 61.0% | 61.7% | 62.3% |
| **2.00x** | 43.6% | 44.1% | 44.5% | 45.0% | 45.4% | 45.9% |
| **5.00x** | 18.2% | 18.5% | 18.9% | 19.4% | 19.8% | 20.3% |
| **10.0x** | 8.41% | 8.56% | 8.78% | 9.00% | 9.22% | 9.45% |
| **20.0x** | 4.08% | 4.19% | 4.31% | 4.45% | 4.60% | 4.76% |
| **50.0x** | 1.35% | 1.40% | 1.45% | 1.50% | 1.56% | 1.62% |
| **100x** | 0.65% | 0.71% | 0.76% | 0.80% | 0.85% | 0.91% |

---

## 附錄 C: v1.5 變更日誌 (2026-03-18)

| 變更項目 | 章節 | 說明 |
|----------|------|------|
| Server Port 更新 | §12.1, §12.4 | 內部開發 Port 從 3006 改為 4002 |
| WebSocket 事件新增 | §3.4 | 新增 `bet_confirmed` 和 `cashout_success` ServerMessage 事件 |

---

## 附錄 D: v1.6 變更日誌 (2026-03-19)

| # | 變更項目 | 章節 | 說明 |
|---|----------|------|------|
| 1 | 回合計時調整 | §4.3, §12.4 | WAITING 5s→3s, BETTING 8s→20s, 新增 1s NO MORE BET 暫停 |
| 2 | 火箭動畫取代龍 emoji | §2, §3.2, §3.6 | SVG 火箭 (金屬漸層 + 紅鼻錐 + 動態火焰), 75° 朝向, 30° 飛行, 135° 墜落, vw 單位 |
| 3 | 音效系統 | §3.8 (新增) | Web Audio API 合成音效 (6 種), BETTING 結束和弦, 靜音按鈕, 手機觸摸解鎖 |
| 4 | UI 佈局重構 | §3.2, §3.7 | 移除面板標題, BetPanel 單行佈局, 紫色 Auto Cashout toggle, BalanceBar + REBET, Overlay 定位 PanelGrid 內 |
| 5 | WebSocket 雙向通訊 | §3.4 | 新增 ServerMessage: countdown_tick/round_settled/registered/error; ClientMessage: register/place_bet/cashout/update_auto_cashout |
| 6 | 後端架構強化 | §4.1, §4.2, §4.4 | async placeBet/cashout, lobby-client.ts, settle fallback, per-connection 序列化鎖, PanelBet 新增 lobbyToken/lobbySessionId, fire-and-forget DB |
| 7 | Volatility 參數修正 | §7.1 | LV.1 α=1,β=2 (原 α=2,β=1); LV.5 α=2,β=1 (原 α=1,β=2) — 修正 Beta 分佈偏斜方向 |
| 8 | DB 表名前綴 | §6.1, §6.2 | 所有表名加 `rocketlh_` 前綴 (rocketlh_crash_logs, rocketlh_bet_records, rocketlh_settlements) |
| 9 | 閘道 WS 代理 | §12.2 | Gateway 改用 createServer + server.on('upgrade') 手動處理 WS; pathRewrite '^/rocketLH' → '' |
| 10 | PWA / 手機版 | §12.1 | Vite server.host:true, WS URL 透過 Gateway, 首觸解鎖音效, vw 響應式動畫 |

---

## 附錄 E: v1.7 變更日誌 (2026-03-19)

| # | 變更項目 | 章節 | 說明 |
|---|----------|------|------|
| 1 | 動畫區域高度 | §3.5, §3.6 | 電腦版 `clamp(200px, 49vh, 585px)`, 手機版 `clamp(180px, 35vh, 300px)` (`--rocket-area-height`) |
| 2 | 火箭飛行角度 | §3.6 | 電腦版 8° 升空, 手機版 30° 升空 (58vw 終點) |
| 3 | 墜毀動畫改進 | §3.5, §3.6 | JS `getBoundingClientRect()` 定位 → 閃光(300ms) → 翻轉180° → translateY(50vh), CSS transition + React state 驅動, 共 2 秒 |
| 4 | 倍數顏色系統 | §3.5, §3.6 | <2x 綠色, 2-10x 金色, ≥10x 紫色, 爆炸紅色; MultiplierDisplay + HistoryBar 統一 |
| 5 | UI 微調 | §3.2 | "Available Balance"→"Balance" (白色金額), 面板標題完全移除(無結果不渲染), REBET 金色按鈕 |
| 6 | 飛行動畫時長 | §3.5, §3.6 | 18 秒 linear (對應約 3x 到達終點), 超過 3x 停在終點 (forwards) |

---

---

## 附錄 F: v1.8 變更日誌 (2026-03-20)

| # | 變更項目 | 章節 | 說明 |
|---|----------|------|------|
| 1 | 墜落動畫重構 | §3.6 | `requestAnimationFrame` 持續追蹤位置; CRASHED 用最後追蹤位置; 飛行火箭 visibility:hidden 保持掛載; 改回 CSS `@keyframes rocket-fall` (閃光→135°翻轉→45°右下墜落+縮小淡出, 2 秒) |
| 2 | 手機版飛行終點 | §3.6 | 30° 升空, 終點 `translate(58vw, -33.5vw)` |
| 3 | 火箭 SVG 升級 | §2, §3.6 | RocketSprite.tsx 全面重構: 8 段金屬漸層機身、環境遮蔽、鉚釘、觀景窗多層玻璃反射、3D 尾翼、鐘形引擎噴嘴、4 層火焰獨立擾動、排氣煙霧粒子、金色裝飾帶 (Falcon 9 + 卡通混合風格) |

---

*文件版本：v1.8 | 日期：2026-03-20*
