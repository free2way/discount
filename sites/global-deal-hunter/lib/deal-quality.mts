export type QualityDecision = {
  relevanceScore: number;
  riskScore: number;
  publish: boolean;
  riskFlags: string[];
  reasons: string[];
};

const STRONG_DEAL_PATTERNS = [
  /(?:限时|当前|本周)?免费/i,
  /限免|羊毛|福利|免单|赠品|领取|领鸡蛋/i,
  /(?:全场|低至|立享|优惠|折扣|促销|大促|特价)/i,
  /\b(?:free|discount|promotion|promo|coupon|cashback|rebate|giveaway|deal|trial)\b/i,
  /(?:返现|返利|立减|减免|注册送|首充送|送)[^。；，,]{0,18}(?:\d|额度|会员|credits?)/i,
  /(?:\d+(?:\.\d+)?\s*折|\d+%\s*(?:off|返现|折扣))/i,
  /(?:优惠码|兑换码|coupon|promo code)/i,
];

const WEAK_DEAL_PATTERNS = [
  /免费版|免费层|免费计划|开源/i,
  /低价|降价|省钱|性价比/i,
  /credits?|额度|返现|bonus/i,
];

const HARD_RISK_PATTERNS: Array<[RegExp, string]> = [
  [/(?:破解|修改版|绿色汉化版|便携增强版|免激活)/i, "untrusted_software"],
  [/(?:代充|接码|官转|反代|共享账号|号池|pro\s*池|共享[^。；，,]{0,12}重置|成品号)/i, "account_abuse"],
  [/(?:助记词|私钥|远程控制|屏幕共享)/i, "credential_theft"],
  [/(?:中转(?:站|自荐|服务)?|(?:api|ai)\s*聚合站|统一\s*api\s*入口|官\s*key|机场|翻墙|代理订阅)/i, "unverified_reseller"],
  [/(?:住宅\s*IP|静态\s*ISP|TG\s*(?:详聊|联系))/i, "unverified_reseller"],
  [/(?:万一免五|万\s*[\d.]+\s*免\s*五|开户链接|开户推荐|证券[^。；，,]{0,12}返佣)/i, "unverified_financial"],
  [/(?:出售|求购|收个|再出个|出个|出Host|出tamago|改邮|原邮交付|(?:^|[「【\s])(?:出|收)(?:[」】\s]|总价|心碎))/i, "secondary_market"],
];

const NOISE_PATTERNS = [
  /(?:漏洞|CVE-\d+|被黑客|安全警告)/i,
  /(?:测试留档|测评留档|BUG|怎么|吗[？?]?$|求助|教程|攻略)/i,
  /(?:版本发布|正式版|离线安装包|更新日志)/i,
  /(?:^|[\s(（])v?\d+\.\d+(?:\.\d+)?(?:$|[\s)）])/i,
];

export function assessDealQuality(title: string, summary = ""): QualityDecision {
  const text = `${title} ${summary}`.replace(/\s+/g, " ");
  const riskFlags = HARD_RISK_PATTERNS.filter(([pattern]) => pattern.test(text)).map(([, flag]) => flag);
  const strongMatches = STRONG_DEAL_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const weakMatches = WEAK_DEAL_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const noiseMatches = NOISE_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const relevanceScore = Math.max(0, Math.min(100, strongMatches * 38 + weakMatches * 12 - noiseMatches * 28));
  const riskScore = Math.min(100, riskFlags.length * 45);
  const publish = relevanceScore >= 38 && riskFlags.length === 0;
  const reasons: string[] = [];
  if (!strongMatches) reasons.push("未发现明确的免费、折扣、返现或赠送信号");
  if (noiseMatches) reasons.push("内容更像资讯、问答、测评或普通软件更新");
  if (riskFlags.length) reasons.push("命中高风险或不受支持的交易/软件规则");
  if (publish) reasons.push("优惠相关性达到公开候选阈值");
  return { relevanceScore, riskScore, publish, riskFlags, reasons };
}
