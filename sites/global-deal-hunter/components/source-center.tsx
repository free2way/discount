"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, ChevronDown, CircleAlert, Clock3, Eye, EyeOff,
  Filter, Focus, Gauge, KeyRound, Play, RadioTower, Search, ShieldCheck,
} from "lucide-react";
import type { SourceHealth } from "@/components/deal-dashboard";
import { SOURCE_CATALOG, SOURCE_GROUP_LABELS, type SourceGroup } from "@/lib/source-catalog";

const ACTIONS_URL = "https://github.com/free2way/discount/actions/workflows/scan-and-deploy.yml";

function formatLatency(value: number) {
  if (!value) return "—";
  if (value < 1_000) return `${value} ms`;
  return `${(value / 1_000).toFixed(1)} s`;
}

function formatLastSuccess(value: string | null) {
  if (!value) return "尚无成功记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待核实";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "Asia/Shanghai",
  }).format(date);
}

type StatusFilter = "all" | "healthy" | "attention" | "connector";

export default function SourceCenter({
  sourceHealth,
  query,
  focusedSources,
  mutedSources,
  onToggleFocus,
  onToggleMuted,
}: {
  sourceHealth: SourceHealth[];
  query: string;
  focusedSources: Set<string>;
  mutedSources: Set<string>;
  onToggleFocus: (sourceId: string) => void;
  onToggleMuted: (sourceId: string) => void;
}) {
  const [group, setGroup] = useState<"all" | SourceGroup>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const healthById = useMemo(() => new Map(sourceHealth.map((item) => [item.source_id, item])), [sourceHealth]);
  const healthy = sourceHealth.filter((source) => source.ok).length;
  const fetched = sourceHealth.reduce((total, source) => total + source.count, 0);
  const retries = sourceHealth.reduce((total, source) => total + Math.max(0, source.attempts - 1), 0);

  const visibleSources = useMemo(() => SOURCE_CATALOG.filter((source) => {
    const health = healthById.get(source.id);
    if (group !== "all" && source.group !== group) return false;
    if (status === "healthy" && !health?.ok) return false;
    if (status === "attention" && health?.ok) return false;
    if (status === "connector" && !source.optional) return false;
    if (query && !`${source.name} ${source.id} ${source.description} ${source.categories.join(" ")}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [group, healthById, query, status]);

  return (
    <section className="source-center" aria-label="数据源中心">
      <div className="source-center__summary">
        <div><span>已接入</span><strong>{sourceHealth.length}</strong><small>固定源与已配置连接器</small></div>
        <div><span>健康</span><strong>{healthy}/{sourceHealth.length}</strong><small>最近一次扫描成功</small></div>
        <div><span>本轮抓取</span><strong>{fetched}</strong><small>进入质量筛选前的条目</small></div>
        <div><span>自动重试</span><strong>{retries}</strong><small>限流与瞬时故障恢复</small></div>
      </div>

      <div className="source-center__toolbar">
        <div className="source-group-tabs" aria-label="来源分组">
          <button type="button" className={group === "all" ? "active" : ""} onClick={() => setGroup("all")}>全部</button>
          {(Object.entries(SOURCE_GROUP_LABELS) as Array<[SourceGroup, string]>).map(([key, label]) => (
            <button type="button" key={key} className={group === key ? "active" : ""} onClick={() => setGroup(key)}>{label}</button>
          ))}
        </div>
        <label className="source-status-filter"><Filter size={14} /><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="all">全部状态</option><option value="healthy">仅健康</option><option value="attention">需关注</option><option value="connector">待接连接器</option></select></label>
        <a className="source-run-link" href={ACTIONS_URL} target="_blank" rel="noreferrer"><Play size={14} /> GitHub 扫描 <ArrowUpRight size={13} /></a>
      </div>

      <div className="source-management-note">
        <ShieldCheck size={15} />
        <span><strong>安全边界：</strong>重点与隐藏设置只保存在当前浏览器，并影响本设备的信息流；不会暂停 GitHub Actions，也不会把密钥发送到前端。</span>
      </div>

      <div className="source-table" role="table" aria-label="数据源状态">
        <div className="source-table__head" role="row">
          <span>来源</span><span>接入方式</span><span>状态</span><span>本轮条目</span><span>响应</span><span>管理</span>
        </div>
        {visibleSources.map((source) => {
          const health = healthById.get(source.id);
          const isFocused = focusedSources.has(source.id);
          const isMuted = mutedSources.has(source.id);
          const isExpanded = expanded === source.id;
          const statusLabel = health ? (health.ok ? "运行正常" : "抓取异常") : source.optional ? "等待连接器" : "等待扫描";
          return (
            <div className={isMuted ? "source-record source-record--muted" : "source-record"} key={source.id} role="row">
              <div className="source-record__main">
                <button type="button" className="source-identity" onClick={() => setExpanded(isExpanded ? null : source.id)} aria-expanded={isExpanded}><i className={health?.ok ? "source-dot source-dot--ok" : health ? "source-dot source-dot--error" : "source-dot"} /><span><strong>{source.name}</strong><small>{SOURCE_GROUP_LABELS[source.group]} · {source.id}</small></span></button>
                <span className="source-method"><b>{source.format}</b><small><KeyRound size={11} /> {source.credential}</small></span>
                <span className={health?.ok ? "source-state source-state--ok" : health ? "source-state source-state--error" : "source-state"}><b>{statusLabel}</b><small>{health?.last_success_at ? `成功于 ${formatLastSuccess(health.last_success_at)}` : source.optional ? "配置 XHS_RSS_URL 后接入" : "等待首轮记录"}</small></span>
                <span className="source-number"><b>{health?.count ?? "—"}</b><small>{health && health.attempts > 1 ? `${health.attempts} 次尝试` : "一次完成"}</small></span>
                <span className="source-number"><b>{health ? formatLatency(health.response_ms) : "—"}</b><small>{health?.consecutive_failures ? `连续失败 ${health.consecutive_failures}` : "无连续故障"}</small></span>
                <span className="source-actions">
                  <button type="button" className={isFocused ? "source-action source-action--active" : "source-action"} aria-pressed={isFocused} onClick={() => onToggleFocus(source.id)} title="重点来源会优先显示"><Focus size={14} /><span>{isFocused ? "已重点" : "重点"}</span></button>
                  <button type="button" className={isMuted ? "source-action source-action--muted" : "source-action"} aria-pressed={isMuted} onClick={() => onToggleMuted(source.id)} title="只影响当前设备的信息流"><span>{isMuted ? <EyeOff size={14} /> : <Eye size={14} />}</span><span>{isMuted ? "已隐藏" : "显示"}</span></button>
                  <button type="button" className="source-expand" onClick={() => setExpanded(isExpanded ? null : source.id)} aria-label={isExpanded ? "收起来源详情" : "展开来源详情"} aria-expanded={isExpanded}><ChevronDown className={isExpanded ? "source-chevron source-chevron--open" : "source-chevron"} size={15} /></button>
                </span>
              </div>
              {isExpanded ? (
                <div className="source-record__detail">
                  <div><span>采集策略</span><p>{source.description}</p></div>
                  <div><span>关注领域</span><p>{source.categories.join(" · ")}</p></div>
                  <div><span>可信层级</span><p>{source.trust}来源；非官方内容仅作为线索，需回溯验证。</p></div>
                  <div><span>运行诊断</span><p>{health?.error ? health.error : health ? `本轮 ${health.count} 条，${health.attempts} 次尝试，响应 ${formatLatency(health.response_ms)}。` : source.optional ? "尚未配置登录态连接器。" : "当前快照还没有此来源的运行记录。"}</p></div>
                  <a href={source.homepage} target="_blank" rel="noreferrer">访问来源 <ArrowUpRight size={13} /></a>
                </div>
              ) : null}
            </div>
          );
        })}
        {!visibleSources.length ? <div className="source-empty"><Search size={20} /><span>没有匹配的数据源</span></div> : null}
      </div>

      <div className="source-center__footer">
        <span><RadioTower size={14} /> 每 2 小时由 GitHub Actions 扫描</span>
        <span><Gauge size={14} /> Reddit 自动限速与退避</span>
        <span><Activity size={14} /> 记录响应时间、重试和连续失败</span>
        <span><CircleAlert size={14} /> 小红书需私有连接器</span>
        <span><Clock3 size={14} /> 所有时间按北京时间展示</span>
      </div>
    </section>
  );
}
