"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowUpRight, BadgeCheck, Banknote, Bot, Boxes, CalendarClock,
  ChevronRight, CircleDollarSign, Clock3, Cloud, CreditCard, Database, Gift,
  Globe2, History, Radar, Search, ShieldCheck, Sparkles, WalletCards,
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

function isEndingSoon(deal: Deal) {
  if (!deal.ends_at || deal.status === "expired") return false;
  const remaining = new Date(deal.ends_at).getTime() - Date.now();
  return remaining > 0 && remaining <= 7 * 24 * 60 * 60 * 1000;
}

function DealCard({ deal, rank }: { deal: Deal; rank?: number }) {
  const meta = categoryMeta[deal.category] ?? categoryMeta.other;
  const Icon = meta.icon;
  const verified = deal.verification_status === "verified";
  const conflicting = deal.verification_status === "conflicting";
  const verificationLabel = verified
    ? "官方已验证"
    : conflicting
      ? "来源有冲突"
      : "待核实";
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
          <a href={safeUrl(deal.source_url)} target="_blank" rel="noreferrer">原始来源</a>
          <a className="primary-link" href={safeUrl(deal.official_url)} target="_blank" rel="noreferrer">官方活动 <ArrowUpRight size={14} /></a>
        </div>
      </div>
    </article>
  );
}

export default function DealDashboard({ deals, latestScan }: { deals: Deal[]; latestScan: ScanRun }) {
  const [activeModule, setActiveModule] = useState("latest");
  const [query, setQuery] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const referenceTime = latestScan ? Date.parse(latestScan.finished_at) : 0;

  const visibleDeals = useMemo(() => {
    const hasFreshActiveDeals = deals.some((deal) => {
      const firstSeen = new Date(deal.first_seen_at).getTime();
      return deal.status !== "expired" && Number.isFinite(firstSeen) && firstSeen <= referenceTime && referenceTime - firstSeen <= 24 * 60 * 60 * 1000;
    });
    return deals
      .filter((deal) => {
        if (verifiedOnly && deal.verification_status !== "verified") return false;
        if (query && !`${deal.name} ${deal.summary} ${deal.source_name} ${deal.regions}`.toLowerCase().includes(query.toLowerCase())) return false;
        if (activeModule === "expired") return deal.status === "expired";
        if (deal.status === "expired") return false;
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
      .sort((a, b) => activeModule === "high-value" ? b.value_score - a.value_score : new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime());
  }, [activeModule, deals, query, referenceTime, verifiedOnly]);

  const activeCount = deals.filter((deal) => deal.status !== "expired").length;
  const latestFreshCount = deals.filter((deal) => {
    const firstSeen = new Date(deal.first_seen_at).getTime();
    return deal.status !== "expired" && Number.isFinite(firstSeen) && firstSeen <= referenceTime && referenceTime - firstSeen <= 24 * 60 * 60 * 1000;
  }).length;
  const verifiedCount = deals.filter((deal) => deal.verification_status === "verified" && deal.status !== "expired").length;
  const endingCount = deals.filter(isEndingSoon).length;
  const socialSourceCount = deals.filter((deal) => (
    deal.source_type === "reddit" || deal.source_type === "x"
  ) && deal.status !== "expired").length;
  const currentLabel = categories.find((item) => item.id === activeModule)?.label ?? "优惠情报";
  const scanHealthy = latestScan?.status === "success";
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
        </nav>

        <div className="source-panel">
          <div className="source-panel__title"><ShieldCheck size={16} /> 来源策略</div>
          <p><b>Tier 1</b> 官方网站 / 公告</p>
          <p><b>Tier 2</b> 官方社媒 / 文档</p>
          <p><b>线索</b> Reddit / 非官方 X / 社区</p>
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
          </div>
        </header>

        <section className="metric-grid" aria-label="数据摘要">
          <div className="metric-card metric-card--accent"><span>活跃优惠</span><strong>{activeCount}</strong><small>实时去重后的活动</small><Radar size={24} /></div>
          <div className="metric-card"><span>官方已验证</span><strong>{verifiedCount}</strong><small>可回溯一手来源</small><BadgeCheck size={24} /></div>
          <div className="metric-card"><span>7 天内截止</span><strong>{endingCount}</strong><small>建议优先处理</small><CalendarClock size={24} /></div>
          <div className="metric-card"><span>X / Reddit 来源</span><strong>{socialSourceCount}</strong><small>均保留原帖并回溯官方页</small><WalletCards size={24} /></div>
        </section>

        <section className="intel-strip">
          <div><span className="pulse-dot" /><strong>最近扫描</strong><span>{latestScan ? formatTime(latestScan.finished_at) : "等待首次自动扫描"}</span></div>
          <div><Database size={15} /><span>候选 {latestScan?.candidates_found ?? 0}</span><span>验证 {latestScan?.verified_count ?? 0}</span><span>归档 {latestScan?.archived_count ?? 0}</span></div>
        </section>

        <section className="feed-heading">
          <div><h2>{currentLabel}</h2><p>{visibleDeals.length ? activeModule === "latest" && latestFreshCount === 0 ? `24 小时内暂无新增，显示最近收录的 ${visibleDeals.length} 条活跃优惠` : `共 ${visibleDeals.length} 条，按价值与新鲜度排序` : "系统只展示有来源记录；不会用示例优惠填充看板"}</p></div>
          <span className="sync-label"><Radar size={14} /> 每 2 小时更新</span>
        </section>

        <section className="deal-feed">
          {visibleDeals.length ? visibleDeals.map((deal, index) => <DealCard key={deal.id} deal={deal} rank={activeModule === "high-value" ? index + 1 : undefined} />) : (
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
