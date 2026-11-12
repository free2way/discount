# GLOBAL DEAL HUNTER — 技术开发与验收文档（Phase 1）

> 版本：v1.0　｜　创建日期：2026-11-11　｜　适用范围：Phase 1「数据实时性 + 修复脱节 + 国际化」
> 关联文档：[`README.md`](../README.md)、[`OPERATIONS.md`](../OPERATIONS.md)

---

## 0. 背景与现状基线

| 项目 | 现状 |
|---|---|
| 产品形态 | 自动采集 + 只读展示的全球优惠情报看板 |
| 技术栈 | Next.js 16 / React 19 / Vinext（OpenAI Sites）/ Cloudflare Workers + D1 / Drizzle / Tailwind 4 |
| 数据流 | GitHub Actions（2h 三层 cron）→ `scan:feeds` → `data/*.json` → commit → Vercel 快照渲染 / Sites 走 D1 |
| 质量基线 | `npm test` 33/33 通过；10 个固定订阅源已接入 |
| 成熟度 | 采集 MVP 已稳定上线；用户层（登录/收藏/通知）已设计未接线 |

### 本阶段要解决的四个确认问题

- **P1.1** Vercel 版 `loadDashboard()` 在**构建时** `import` JSON，`force-dynamic` 形同虚设，Action 刷新数据后页面不更新。
- **P1.2** `feedResultsToDeals` 按源独立切片，**跨源同一活动不去重**，看板重复展示。
- **P1.3** 宣称「全球」但源与评分强偏中文社区（仅 Epic 为国际源），英文信号覆盖弱。
- **P1.4** `db/schema.ts` 的 4 张用户表与 `chatgpt-auth.ts` **完全未被引用**，构成误导性死代码。

---

## 1. 交付范围（In / Out of Scope）

### In Scope
- 方案 A：Vercel 快照运行时拉取 + 合并逻辑纯函数化
- 方案 B：跨源全局去重（基于 `canonicalKey`）
- 方案 C：国际源扩充 + 英文优惠信号增强
- 方案 D：死代码/Schema 分叉决策与标注

### Out of Scope（留待 Phase 2）
- ChatGPT 登录路由落地、服务端收藏/关注、服务端通知投递、用户偏好个性化

---

## 2. 任务分解与验收标准（AC）

> 每个任务含：改动点、实现要点、验收标准（AC）、测试用例（TC）、完成定义（DoD）。

### 任务 A — 修复 Vercel 快照实时性

**改动点**
- `lib/dashboard-snapshot.ts`：抽出纯函数 `buildFromSnapshot(feedScanJson)`，输入快照 JSON，输出 `{ deals, latestScan, sourceHealth }`；现有模块级常量改为调用它构建默认导出（打包快照兜底）。
- `lib/dashboard-store.ts`（Vercel 版）：运行时 `fetch` 仓库 raw 快照，成功则 `buildFromSnapshot(live)`，失败回退打包快照。
- `app/page.tsx`：`export const dynamic = "force-dynamic"` → `export const revalidate = 600`。

**实现要点**
```ts
// lib/dashboard-store.ts
const SNAPSHOT_URL =
  "https://raw.githubusercontent.com/<owner>/discount/main/sites/global-deal-hunter/data/feed-scan.json";

export async function loadDashboard() {
  try {
    const res = await fetch(SNAPSHOT_URL, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`snapshot ${res.status}`);
    return buildFromSnapshot(await res.json());
  } catch {
    return { deals: snapshotDeals, latestScan: snapshotScanRun, sourceHealth: snapshotSourceHealth };
  }
}
```
- `<owner>` 用环境变量 `SNAPSHOT_SOURCE_URL` 覆盖，默认硬编码仓库地址；私有仓库需改用 Vercel Blob/KV。
- `buildFromSnapshot` 必须纯函数、无副作用、不读 `process`/`localStorage`，保证可单测。

**验收标准（AC）**
- AC-A1：Action 刷新 `feed-scan.json` 后，Vercel 页面在 ≤10 分钟内（revalidate 窗口）展示新的「最近扫描时间」，无需重新部署。
- AC-A2：raw 快照不可达（404/超时）时，页面仍正常渲染打包快照，不报错、不白屏。
- AC-A3：`buildFromSnapshot` 对相同输入产出与旧 `dashboard-snapshot` 完全一致的 `deals` 排序与 `latestScan` 字段。
- AC-A4：Sites 版 `dashboard-store.sites.ts` 的 D1 合并逻辑行为不回归（仍优先更新的 D1 数据）。

**测试用例（TC）**
- TC-A1（单测）：`buildFromSnapshot(fixtureJson)` 返回 deals 按 `value_score desc, first_seen_at desc` 排序。
- TC-A2（单测）：传入 `status:"partial"` 快照，`latestScan.notes` 含失败源计数。
- TC-A3（手动/集成）：mock fetch 返回 500 → `loadDashboard` 回退打包快照且不抛错。

**DoD**：新增单测通过；`npm test` 全绿；本地 `npm run dev` 与 `build:vercel` 均可渲染。

---

### 任务 B — 跨源全局去重

**改动点**
- `scripts/scan-feed-sources.mts`：`deduped` Map 的键由 `dealUrlKey(official_url)` 改为 `canonicalKey(official_url, name)`，并在冲突时择优保留。
- `lib/dashboard-snapshot.ts`：合并键同步为 `canonicalKey`，保持静态/动态一致。

**实现要点**
```ts
import { canonicalKey } from "../lib/deal-identity.ts";
for (const deal of [...carriedDeals, ...freshDeals]) {
  const key = canonicalKey(deal.official_url, deal.name);
  const cur = deduped.get(key);
  const better =
    !cur ||
    (deal.verification_status === "verified" && cur.verification_status !== "verified") ||
    deal.value_score > cur.value_score;
  if (better) deduped.set(key, deal);
}
```

**验收标准（AC）**
- AC-B1：两个不同源指向同一活动（标题规范化后相同）时，看板只展示 1 条，保留 `verified` 或更高 `value_score` 者。
- AC-B2：原本正常的单源去重（同源重复链接）行为不回归。
- AC-B3：`candidates_found` 统计口径不变（仍按原始 items 计），仅 `deals` 去重。

**测试用例（TC）**
- TC-B1（单测）：构造两源同活动 fixture → 合并后 `deals.length === 1`。
- TC-B2（单测）：verified + 低分 vs pending + 高分，断言保留 verified。

**DoD**：新增单测通过；真实 `npm run scan:feeds` 后 `deals` 数不异常膨胀。

---

### 任务 C — 国际源扩充 + 英文信号增强

**改动点**
- `lib/feed-sources.mts`：`FEED_SOURCE_DEFINITIONS` 追加国际源；`deal-quality.mts`：`STRONG_DEAL_PATTERNS` 补英文信号。
- `.github/workflows/scan-and-deploy.yml`：为需要 UA 的源保留现有 per-source retry（无需结构性改动）。

**实现要点**
```ts
// feed-sources.mts 追加
{ id: "slickdeals", name: "Slickdeals Frontpage",
  url: "https://feeds.feedburner.com/SlickdealsnetFP", format: "feed",
  allowedHosts: ["slickdeals.net"] },
{ id: "reddit_freebies", name: "r/freebies",
  url: "https://www.reddit.com/r/freebies/.rss", format: "feed",
  allowedHosts: ["reddit.com", "redd.it"] },
{ id: "producthunt", name: "Product Hunt",
  url: "https://www.producthunt.com/feed", format: "feed",
  allowedHosts: ["producthunt.com"] },
```
```ts
// deal-quality.mts STRONG_DEAL_PATTERNS 追加
/\b(?:free trial|lifetime deal|bogo|clearance|price drop|limited[- ]time)\b/i,
/\$\s?\d+(?:\.\d+)?\s*(?:off|discount|rebate)\b/i,
```
- Reddit RSS 需设 `User-Agent`（抓取层统一加），命中频率限制时依赖既有重试与 `carriedDeals` 容错。

**验收标准（AC）**
- AC-C1：新增源在 `npm run scan:feeds` 中被探测，`source_results` 含对应 `source_id`，失败不影响其他源。
- AC-C2：英文标题优惠（如 "Free trial: 3 months of X"）在 `assessDealQuality` 下 `publish === true`。
- AC-C3：新增源仍受 `allowedHosts` 沙箱约束，越域链接被过滤。

**测试用例（TC）**
- TC-C1（单测）：英文强信号标题 → `relevanceScore >= 38 && publish`。
- TC-C2（单测）：Reddit/Slickdeals 的 RSS fixture → 正确解析标题/链接/日期，HTML 挑战页仍被拒。
- TC-C3（单测）：越 `allowedHosts` 的 item 被丢弃。

**DoD**：新增单测通过；真实扫描一次，新增源至少一个成功返回条目或按预期记录失败。

---

### 任务 D — 死代码 / Schema 分叉决策

**决策（二选一，建议 D-保留）**
- **D-保留（推荐）**：为 Phase 2 保留 `userPreferences`/`userFavorites`/`dealAlerts`/`notificationEvents` 与 `chatgpt-auth.ts`，但在 `db/schema.ts` 与 `chatgpt-auth.ts` 顶部加注释标明「Phase 2 接线，当前未使用」，并在本文件登记为已知技术债。
- **D-移除**：若确定短期不做用户系统，提交一条 drizzle migration `DROP` 4 张表并删除 `chatgpt-auth.ts`。

**验收标准（AC）**
- AC-D1：采用 D-保留时，4 张表与 auth 模块均有显式「未接线/Phase 2」标注。
- AC-D2：采用 D-移除时，`npm run db:generate` 生成的 migration 可执行，`tsc` 无悬空引用。

**DoD**：决策记录写入「决策日志」；代码标注或迁移合并完成。

---

## 3. 整体验收清单（Release Gate）

发布 Phase 1 前必须全部满足：

- [x] `npm test` 全绿（33/33，含新增 A/B/C 用例）
- [x] `npx tsc --noEmit` 无类型错误
- [x] `npm run lint` 无错误
- [x] `npm run build:vercel` 成功产出 `.next`，首页标记为 10 分钟 ISR
- [x] `npm run scan:feeds` 真实跑通，`status: partial`（9/10）；三个国际源均成功，本机仅 LINUX DO 因未配置 `JINA_API_KEY` 返回 401
- [ ] Vercel 生产环境验证 AC-A1（刷新快照后 ≤10min 页面更新）；AC-A2 已由 500 回退集成测试覆盖
- [x] 全局去重自动化用例通过，verified 优先规则通过
- [x] 文档「决策日志」更新完毕

---

## 4. 风险与回滚

| 风险 | 缓解 | 回滚 |
|---|---|---|
| raw 快照拉取被限流/墙 | `revalidate` 缓存 + 打包快照兜底 | 还原 `loadDashboard` 为 import 版 |
| Reddit RSS 频控 | UA + per-source retry + carry | 从 `FEED_SOURCE_DEFINITIONS` 移除该源 |
| 去重键过激合并不同活动 | `canonicalKey` 已含标题归一，加单测边界 | 还原为 `dealUrlKey` |
| 英文正则误报噪声 | `NOISE_PATTERNS` 同步补充；审核队列兜底 | 回退正则 |

---

## 5. 决策日志

| 日期 | 决策点 | 结论 | 负责人 |
|---|---|---|---|
| 2026-11-12 | 任务 D 分叉 | 采用 D-保留；4 张用户表与 auth 模块保留给 Phase 2，并在源码明确标记当前未接线 | Codex |
| 2026-11-12 | Vercel 快照源 | 默认 GitHub Raw；支持 `SNAPSHOT_SOURCE_URL` 覆盖，失败回退打包快照 | Codex |
| 2026-11-12 | 国际信号源 | 接入 Slickdeals、Reddit r/freebies、Product Hunt；统一 UA、重试、域名白名单与风险审核 | Codex |

---

## 6. 附录：验证命令

```bash
cd sites/global-deal-hunter
npm ci
npm run db:generate
npm test                 # 单元测试
npx tsc --noEmit         # 类型检查
npm run lint             # 代码规范
npm run scan:feeds       # 真实抓取一次（会写 data/*.json）
npm run build:vercel     # Vercel 构建
```

---

## 7. Phase 2 预告（用户闭环，本阶段不实现）

- 补齐 `/signin-with-chatgpt`、`/signout-with-chatgpt`、`/callback` 路由，接通 `requireChatGPTUser`
- 收藏/关注从 `localStorage` 迁移至 `user_favorites`/`deal_alerts`（D1），跨设备同步
- 扫描步骤比对 `deal_alerts` 基线 → 写 `notification_events`（`event_key` 唯一索引幂等）→ 独立消费者投递（Email / Web Push / Telegram）
- `user_preferences`（地区/资格/截止天数）驱动看板默认过滤与通知阈值
