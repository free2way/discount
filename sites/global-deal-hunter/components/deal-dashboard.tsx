"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Activity, AlertTriangle, ArrowUpRight, BadgeCheck, Banknote, Bell, BellRing, Bot, Boxes, CalendarClock,
  ChevronRight, CircleDollarSign, Clock3, Cloud, CreditCard, Database, Gift,
  Globe2, Heart, History, Radar, Search, ShieldCheck, Sparkles, WalletCards,
} from "lucide-react";

export type Deal = {
  id: number;
  name: string;
  category: string;
  summary: string;
  value_amount: number | null;
  value_currency: string | null;
  value_label: string;
  value_score: number;
  requirements: string;
  regions: string;
  hidden_conditions: string;
  starts_at: string | null;
  ends_at: string | null;
  steps: string;
  official_url: string;
  source_url: string;
  source_name: string;
  source_type: string;
  source_subreddit: string | null;
  source_account: string | null;
  source_official: boolean | number;
  verification_status: string;
  status: string;
  confidence: number;
  risk_notes: string;
  first_seen_at: string;
  last_verified_at: string;
};

export type ScanRun = {
  finished_at: string;
  status: string;
  sources_checked: number;
  candidates_found: number;
  verified_count: number;
  pending_count: number;
  archived_count: number;
  notes: string;
} | null;

export type SourceHealth = {
  source_id: string;
  source_name: string;
  ok: boolean;
  count: number;
  attempts: number;
  response_ms: number;
  consecutive_failures: number;
  last_success_at: string | null;
  error: string | null;
};

const categories = [
  { id: "latest", label: "今日最新优惠", icon: Radar },
  { id: "high-value", label: "高价值排行榜", icon: Sparkles },
  { id: "ai", label: "AI 工具", icon: Bot },
  { id: "crypto", label: "Crypto", icon: CircleDollarSign },
  { id: "banking", label: "银行与银行卡", icon: LandmarkIcon },
  { id: "cloud", label: "VPS 与云服务", icon: Cloud },
  { id: "ending", label: "即将截止", icon: CalendarClock },
  { id: "expired", label: "已结束档案", icon: History },
];

function LandmarkIcon({ className }: { className?: string }) {
  return <Banknote className={className} />;
}

const categoryMeta: Record<string, { label: string; icon: typeof Bot; tone: string }> = {
  ai: { label: "AI 工具", icon: Bot, tone: "violet" },
  crypto: { label: "Crypto", icon: CircleDollarSign, tone: "amber" },
  cards: { label: "U 卡", icon: CreditCard, tone: "cyan" },
  banking: { label: "海外银行", icon: Banknote, tone: "emerald" },
  cloud: { label: "云与 VPS", icon: Cloud, tone: "sky" },
  software: { label: "软件服务", icon: Boxes, tone: "rose" },
  other: { label: "其他优惠", icon: Gift, tone: "slate" },
};

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? value : "#";
  } catch {
    return "#";
  }
}

function formatTime(value: string | null) {
  if (!value) return "未公布";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "待核实";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" }).format(date);
}

function formatScanTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待核实";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(date);
}

function isExpired(deal: Deal, now = Date.now()) {
  if (deal.status === "expired") return true;
  if (!deal.ends_at) return false;
  const deadline = Date.parse(deal.ends_at);
  return Number.isFinite(deadline) && deadline <= now;
}

function isEndingSoon(deal: Deal, now = Date.now()) {
  if (!deal.ends_at || isExpired(deal, now)) return false;
  const remaining = new Date(deal.ends_at).getTime() - now;
  return remaining > 0 && remaining <= 7 * 24 * 60 * 60 * 1000;
}

function DealCard({ deal, rank, favorite, reminder, onFavorite, onReminder }: {
  deal: Deal;
  rank?: number;
  favorite: boolean;
  reminder: boolean;
  onFavorite: () => void;
  onReminder: () => void;
}) {
  const meta = categoryMeta[deal.category] ?? categoryMeta.other;
  const Icon = meta.icon;
  const verified = deal.verification_status === "verified";
  const conflicting = deal.verification_status === "conflicting";
  const verificationLabel = verified
    ? "官方已验证"
    : conflicting
      ? "来源有冲突"
      : "待核实";
  const sourceIsOfficialPage = verified && deal.source_url === deal.official_url;
  return (
    <article className="deal-card">
      <div className="deal-card__top">
        <div className={`category-icon category-icon--${meta.tone}`}><Icon size={18} /></div>
        <div className="deal-card__identity">
          <div className="eyebrow-row">
            {rank ? <span className="rank">#{rank}</span> : null}
            <span>{meta.label}</span>
            <span className="dot">·</span>
            <span>{deal.regions}</span>
          </div>
          <h3>{deal.name}</h3>
        </div>
        <div className="value-block">
          <strong>{deal.value_label}</strong>
          <span>价值分 {deal.value_score}</span>
        </div>
      </div>

      <p className="deal-summary">{deal.summary}</p>

      <div className="status-row">
        <span className={verified ? "status status--verified" : conflicting ? "status status--conflicting" : "status status--pending"}>
          {verified ? <BadgeCheck size={14} /> : <AlertTriangle size={14} />}
          {verificationLabel}
        </span>
        <span className="status status--muted"><Clock3 size={14} /> 截止 {formatTime(deal.ends_at)}</span>
        {deal.source_type === "reddit" ? <span className="status status--reddit">Reddit 发现</span> : null}
        {deal.source_type === "x" ? <span className={deal.source_official ? "status status--x-official" : "status status--x"}>{deal.source_official ? "X 官方账号" : "X 线索"}</span> : null}
        {deal.source_type === "feed" ? <span className="status status--feed">RSS / Atom 线索</span> : null}
      </div>

      <div className="deal-details">
        <div><span>参与条件</span><p>{deal.requirements}</p></div>
        <div><span>隐藏条件</span><p>{deal.hidden_conditions || "未发现"}</p></div>
        <div><span>参与步骤</span><p>{deal.steps}</p></div>
        <div><span>风险提示</span><p>{deal.risk_notes}</p></div>
      </div>

      <div className="deal-card__footer">
        <div className="source-note">
          <span>来源：{deal.source_name}{deal.source_subreddit ? ` · r/${deal.source_subreddit}` : ""}{deal.source_account ? ` · @${deal.source_account.replace(/^@/, "")}` : ""}</span>
          <span>最后验证：{formatTime(deal.last_verified_at)}</span>
        </div>
        <div className="link-row">
          <button type="button" className={favorite ? "icon-action icon-action--active" : "icon-action"} onClick={onFavorite} aria-label={favorite ? "取消收藏" : "收藏优惠"}><Heart size={15} fill={favorite ? "currentColor" : "none"} /></button>
          <button type="button" className={reminder ? "icon-action icon-action--active" : "icon-action"} onClick={onReminder} aria-label={reminder ? "关闭截止与变化提醒" : "开启截止与变化提醒"}>{reminder ? <BellRing size={15} /> : <Bell size={15} />}</button>
          {sourceIsOfficialPage ? null : <a href={safeUrl(deal.source_url)} target="_blank" rel="noreferrer">{verified ? "原始来源" : "线索原文"}</a>}
          {verified || deal.source_url !== deal.official_url ? <a className="primary-link" href={safeUrl(deal.official_url)} target="_blank" rel="noreferrer">官方活动 <ArrowUpRight size={14} /></a> : null}
        </div>
      </div>
    </article>
  );
}

const FAVORITES_KEY = "deal-hunter:favorites";
const REMINDERS_KEY = "deal-hunter:reminders";
const BASELINES_KEY = "deal-hunter:baselines";
const NOTIFIED_KEY = "deal-hunter:notified";
const STORAGE_EVENT = "deal-hunter:storage";
const EMPTY_ID_SNAPSHOT = "[]";

function parseIds(raw: string) {
  try {
    const value = JSON.parse(raw);
    return new Set<number>(Array.isArray(value) ? value.filter((id) => Number.isInteger(id)) : []);
  } catch {
    return new Set<number>();
  }
}

function readStringSet(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set<string>(Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function readBaselines() {
  try {
    const value = JSON.parse(localStorage.getItem(BASELINES_KEY) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

function writeLocalStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: key }));
    return true;
  } catch {
    return false;
  }
}

function useStoredIds(key: string) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) onStoreChange();
    };
    const handleLocalStorage = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) onStoreChange();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(STORAGE_EVENT, handleLocalStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STORAGE_EVENT, handleLocalStorage);
    };
  }, [key]);
  const getSnapshot = useCallback(() => localStorage.getItem(key) ?? EMPTY_ID_SNAPSHOT, [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_ID_SNAPSHOT);
  return useMemo(() => parseIds(raw), [raw]);
}

export default function DealDashboard({ deals, latestScan, sourceHealth }: { deals: Deal[]; latestScan: ScanRun; sourceHealth: SourceHealth[] }) {
  const [activeModule, setActiveModule] = useState("latest");
  const [query, setQuery] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [regionFilter, setRegionFilter] = useState("all");
  const [eligibilityFilter, setEligibilityFilter] = useState("all");
  const favorites = useStoredIds(FAVORITES_KEY);
  const reminders = useStoredIds(REMINDERS_KEY);
  const referenceTime = latestScan ? Date.parse(latestScan.finished_at) : 0;

  useEffect(() => {
    if (!reminders.size || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const notified = readStringSet(NOTIFIED_KEY);
    const baselines = readBaselines();
    for (const deal of deals) {
      if (!reminders.has(deal.id)) continue;
      const remaining = deal.ends_at ? Date.parse(deal.ends_at) - Date.now() : Number.POSITIVE_INFINITY;
      const baseline = baselines[String(deal.id)];
      const valueChanged = Boolean(baseline && baseline !== deal.value_label);
      const valueEvent = `${deal.id}:value:${deal.value_label}`;
      const deadlineEvent = `${deal.id}:deadline:${deal.ends_at ?? "unknown"}`;
      const eventKey = valueChanged ? valueEvent : deadlineEvent;
      if (!notified.has(eventKey) && (valueChanged || (remaining > 0 && remaining <= 3 * 86_400_000))) {
        try {
          new Notification(valueChanged ? `${deal.name} 权益发生变化` : `${deal.name} 即将截止`, { body: valueChanged ? `当前：${deal.value_label}` : `截止：${formatTime(deal.ends_at)}` });
          notified.add(eventKey);
        } catch {
          // Browsers can still reject notifications after permission was granted.
        }
      }
      baselines[String(deal.id)] = deal.value_label;
    }
    writeLocalStorage(NOTIFIED_KEY, [...notified]);
    writeLocalStorage(BASELINES_KEY, baselines);
  }, [deals, reminders]);

  function toggleStored(current: Set<number>, key: string, deal: Deal) {
    const next = new Set(current);
    if (next.has(deal.id)) next.delete(deal.id); else next.add(deal.id);
    writeLocalStorage(key, [...next]);
  }

  async function toggleReminder(deal: Deal) {
    const enabling = !reminders.has(deal.id);
    if (enabling && typeof Notification !== "undefined" && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch { /* Permission remains unchanged. */ }
    }
    if (enabling) {
      const baselines = readBaselines();
      baselines[String(deal.id)] = deal.value_label;
      writeLocalStorage(BASELINES_KEY, baselines);
    }
    toggleStored(reminders, REMINDERS_KEY, deal);
  }

  const visibleDeals = useMemo(() => {
    const hasFreshActiveDeals = deals.some((deal) => {
      const firstSeen = new Date(deal.first_seen_at).getTime();
      return !isExpired(deal) && Number.isFinite(firstSeen) && firstSeen <= referenceTime && referenceTime - firstSeen <= 24 * 60 * 60 * 1000;
    });
    return deals
      .filter((deal) => {
        if (verifiedOnly && deal.verification_status !== "verified") return false;
        if (favoritesOnly && !favorites.has(deal.id)) return false;
        const regionText = deal.regions.toLowerCase();
        if (regionFilter === "global" && !/全球|global|多数|支持地区/.test(regionText)) return false;
        if (regionFilter === "us" && !/美国|美國|united states|\bus\b/.test(regionText)) return false;
        if (regionFilter === "cn" && !/中国|中國|大陆|大陸|china|江苏/.test(regionText)) return false;
        const eligibilityText = `${deal.requirements} ${deal.hidden_conditions}`.toLowerCase();
        if (eligibilityFilter === "student" && !/学生|student|在校/.test(eligibilityText)) return false;
        if (eligibilityFilter === "new" && !/新客户|新用户|new customer|new user|首次/.test(eligibilityText)) return false;
        if (eligibilityFilter === "kyc" && !/kyc|身份|实名/.test(eligibilityText)) return false;
        if (eligibilityFilter === "payment" && !/付款方式|支付卡|信用卡|银行卡|payment/.test(eligibilityText)) return false;
        if (query && !`${deal.name} ${deal.summary} ${deal.source_name} ${deal.regions}`.toLowerCase().includes(query.toLowerCase())) return false;
        if (activeModule === "expired") return isExpired(deal);
        if (isExpired(deal)) return false;
        if (activeModule === "high-value") return deal.value_score >= 75;
        if (activeModule === "ending") return isEndingSoon(deal);
        if (["ai", "crypto", "cloud"].includes(activeModule)) return deal.category === activeModule;
        if (activeModule === "banking") return ["banking", "cards"].includes(deal.category);
        if (activeModule === "latest") {
          const firstSeen = new Date(deal.first_seen_at).getTime();
          return !hasFreshActiveDeals || (Number.isFinite(firstSeen) && firstSeen <= referenceTime && referenceTime - firstSeen <= 24 * 60 * 60 * 1000);
        }
        return true;
      })
      .sort((a, b) => {
        if (activeModule === "high-value") return b.value_score - a.value_score;
        if (activeModule === "latest") {
          const verificationOrder = Number(b.verification_status === "verified") - Number(a.verification_status === "verified");
          if (verificationOrder) return verificationOrder;
          const valueOrder = b.value_score - a.value_score;
          if (valueOrder) return valueOrder;
        }
        return new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime();
      });
  }, [activeModule, deals, eligibilityFilter, favorites, favoritesOnly, query, referenceTime, regionFilter, verifiedOnly]);

  const activeCount = deals.filter((deal) => !isExpired(deal)).length;
  const latestFreshCount = deals.filter((deal) => {
    const firstSeen = new Date(deal.first_seen_at).getTime();
    return !isExpired(deal) && Number.isFinite(firstSeen) && firstSeen <= referenceTime && referenceTime - firstSeen <= 24 * 60 * 60 * 1000;
  }).length;
  const verifiedCount = deals.filter((deal) => deal.verification_status === "verified" && !isExpired(deal)).length;
  const endingCount = deals.filter(isEndingSoon).length;
  const pendingExternalCount = deals.filter((deal) => (
    deal.source_type === "reddit" || deal.source_type === "x" || deal.source_type === "feed"
  ) && deal.verification_status !== "verified" && !isExpired(deal)).length;
  const currentLabel = categories.find((item) => item.id === activeModule)?.label ?? "优惠情报";
  const scanHealthy = latestScan?.status === "success";
  const healthySources = sourceHealth.filter((source) => source.ok).length;
  const scanStateLabel = !latestScan
    ? "等待首次扫描"
    : scanHealthy
      ? "最近扫描成功"
      : "最近扫描需检查";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Globe2 size={22} /></div>
          <div><strong>GLOBAL DEAL</strong><span>HUNTER / 全球羊毛情报</span></div>
        </div>

        <div className={scanHealthy ? "live-chip" : "live-chip live-chip--warning"}>
          <i /> {scanStateLabel} <span>2H</span>
        </div>

        <nav aria-label="情报模块">
          <p className="nav-label">情报模块</p>
          {categories.map((item) => {
            const Icon = item.icon;
            return (
              <button type="button" key={item.id} aria-current={activeModule === item.id ? "page" : undefined} className={activeModule === item.id ? "nav-item nav-item--active" : "nav-item"} onClick={() => setActiveModule(item.id)}>
                <Icon size={17} /><span>{item.label}</span><ChevronRight size={14} />
              </button>
            );
          })}
          <a className="nav-item" href="/review"><ShieldCheck size={17} /><span>候选审核队列</span><ChevronRight size={14} /></a>
        </nav>

        <div className="source-panel">
          <div className="source-panel__title"><ShieldCheck size={16} /> 来源策略</div>
          <p><b>Tier 1</b> 官方网站 / 公告</p>
          <p><b>Tier 2</b> 官方社媒 / 文档</p>
          <p><b>线索</b> X / Reddit / RSS / Atom</p>
          <small>社交信息未回溯官方前统一标记「待核实」</small>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="kicker">INTELLIGENCE DESK / 情报总览</p>
            <h1>{currentLabel}</h1>
          </div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} /><input aria-label="搜索活动、地区或来源" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索活动、地区或来源" /></label>
            <button type="button" aria-pressed={verifiedOnly} className={verifiedOnly ? "filter-button filter-button--active" : "filter-button"} onClick={() => setVerifiedOnly((value) => !value)}>
              <BadgeCheck size={16} /> 仅已验证
            </button>
            <button type="button" aria-pressed={favoritesOnly} className={favoritesOnly ? "filter-button filter-button--active" : "filter-button"} onClick={() => setFavoritesOnly((value) => !value)}>
              <Heart size={16} /> 收藏
            </button>
          </div>
        </header>

        <section className="personal-filters" aria-label="地区与资格筛选">
          <label>地区<select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}><option value="all">全部地区</option><option value="global">全球/广泛可用</option><option value="us">美国</option><option value="cn">中国</option></select></label>
          <label>资格<select value={eligibilityFilter} onChange={(event) => setEligibilityFilter(event.target.value)}><option value="all">全部资格</option><option value="student">学生</option><option value="new">新用户/新客户</option><option value="kyc">需要 KYC</option><option value="payment">需要付款方式</option></select></label>
          <span><Bell size={14} /> 收藏和提醒保存在本设备；授权浏览器通知后可接收截止及权益变化提醒。</span>
        </section>

        <section className="metric-grid" aria-label="数据摘要">
          <div className="metric-card metric-card--accent"><span>活跃优惠</span><strong>{activeCount}</strong><small>实时去重后的活动</small><Radar size={24} /></div>
          <div className="metric-card"><span>官方已验证</span><strong>{verifiedCount}</strong><small>可回溯一手来源</small><BadgeCheck size={24} /></div>
          <div className="metric-card"><span>7 天内截止</span><strong>{endingCount}</strong><small>建议优先处理</small><CalendarClock size={24} /></div>
          <div className="metric-card"><span>外部待核线索</span><strong>{pendingExternalCount}</strong><small>X / Reddit / RSS / Atom</small><WalletCards size={24} /></div>
        </section>

        <section className="intel-strip">
          <div>
            <span className="pulse-dot" />
            <strong>上一次扫描</strong>
            {latestScan
              ? <time dateTime={latestScan.finished_at}>{formatScanTime(latestScan.finished_at)}（北京时间）</time>
              : <span>等待首次自动扫描</span>}
          </div>
          <div><Database size={15} /><span>候选 {latestScan?.candidates_found ?? 0}</span><span>验证 {latestScan?.verified_count ?? 0}</span><span>归档 {latestScan?.archived_count ?? 0}</span></div>
          <div className={healthySources === sourceHealth.length ? "source-health source-health--ok" : "source-health source-health--warning"} title={sourceHealth.map((source) => `${source.source_name}: ${source.ok ? `正常，${source.count} 条` : source.error ?? "失败"}`).join("\n")}><Activity size={15} /><span>来源健康 {healthySources}/{sourceHealth.length}</span></div>
        </section>

        <section className="feed-heading">
          <div><h2>{currentLabel}</h2><p>{visibleDeals.length ? activeModule === "latest" && latestFreshCount === 0 ? `24 小时内暂无新增，显示最近收录的 ${visibleDeals.length} 条活跃优惠` : `共 ${visibleDeals.length} 条，按价值与新鲜度排序` : "系统只展示有来源记录；不会用示例优惠填充看板"}</p></div>
          <span className="sync-label"><Radar size={14} /> 每 2 小时更新</span>
        </section>

        <section className="deal-feed">
          {visibleDeals.length ? visibleDeals.map((deal, index) => <DealCard key={`${deal.id}:${deal.official_url}`} deal={deal} rank={activeModule === "high-value" ? index + 1 : undefined} favorite={favorites.has(deal.id)} reminder={reminders.has(deal.id)} onFavorite={() => toggleStored(favorites, FAVORITES_KEY, deal)} onReminder={() => void toggleReminder(deal)} />) : (
            <div className="empty-state">
              <div className="empty-radar"><Radar size={32} /></div>
              <h3>扫描队列已就绪</h3>
              <p>首次定时任务完成后，经过官方回溯、地区条件识别与去重的优惠会出现在这里。Reddit 与非官方 X 帖子只作为发现线索，不会被自动当成事实。</p>
              <div className="empty-checks"><span><BadgeCheck size={15} /> 官方源优先</span><span><ShieldCheck size={15} /> 风险与条件必填</span><span><History size={15} /> 过期自动归档</span></div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
