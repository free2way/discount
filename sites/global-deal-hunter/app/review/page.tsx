import review from "@/data/candidate-review.json";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "候选审核队列｜GLOBAL DEAL HUNTER",
  robots: { index: false, follow: false },
};

export default function ReviewQueuePage() {
  return (
    <main className="review-shell">
      <header className="review-header">
        <div>
          <span className="kicker">QUALITY DESK / 数据质量</span>
          <h1>候选审核队列</h1>
          <p>低相关或高风险条目不会进入公开看板；审核后仍需回溯官方证据才能升级为已验证。</p>
        </div>
        <Link href="/">返回情报看板</Link>
      </header>
      <section className="review-stats" aria-label="审核队列统计">
        <span>等待核实 {review.queued_count}</span>
        <span>规则拦截 {review.rejected_count}</span>
        <span>生成时间 {new Date(review.generated_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</span>
      </section>
      <section className="review-list">
        {review.candidates.map((candidate) => (
          <article className="review-item" key={candidate.key}>
            <div className="review-item__top">
              <h2>{candidate.title}</h2>
              <a href={candidate.source_url} target="_blank" rel="noreferrer nofollow">查看原始来源</a>
            </div>
            <p>{candidate.summary || "来源未提供摘要。"}</p>
            <div className="review-item__meta">
              <span>{candidate.source_name}</span>
              <span>相关性 {candidate.relevance_score}</span>
              <span>风险 {candidate.risk_score}</span>
              <span>{candidate.review_status === "rejected" ? "已自动拦截" : "等待人工核实"}</span>
              {candidate.risk_flags.map((flag) => <span className="risk" key={flag}>{flag}</span>)}
              {candidate.reasons.map((reason) => <span key={reason}>{reason}</span>)}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
