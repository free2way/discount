export type SourceGroup = "community" | "platform" | "software" | "social" | "discovery";

export type SourceCatalogEntry = {
  id: string;
  name: string;
  aliases?: string[];
  group: SourceGroup;
  format: string;
  trust: "官方" | "社区" | "聚合";
  credential: "无需密钥" | "Jina 密钥" | "登录态连接器";
  homepage: string;
  description: string;
  categories: string[];
  optional?: boolean;
};

export const SOURCE_GROUP_LABELS: Record<SourceGroup, string> = {
  community: "中文社区",
  platform: "官方平台",
  software: "软件与优惠",
  social: "社交线索",
  discovery: "产品发现",
};

export const SOURCE_CATALOG: SourceCatalogEntry[] = [
  {
    id: "linuxdo",
    name: "LINUX DO 福利羊毛",
    group: "community",
    format: "Jina Markdown",
    trust: "社区",
    credential: "Jina 密钥",
    homepage: "https://linux.do/c/welfare/36",
    description: "福利羊毛分区；解析主题标题、原始链接和发布时间。",
    categories: ["AI", "云服务", "软件"],
  },
  {
    id: "linuxdo_resource",
    name: "LINUX DO 资源荟萃",
    group: "community",
    format: "Jina Markdown",
    trust: "社区",
    credential: "Jina 密钥",
    homepage: "https://linux.do/c/resource/14",
    description: "资源荟萃分区；补充开发者资源、教程和免费工具线索。",
    categories: ["开发者", "AI", "软件"],
  },
  {
    id: "v2ex",
    name: "V2EX 推广",
    group: "community",
    format: "Atom",
    trust: "社区",
    credential: "无需密钥",
    homepage: "https://www.v2ex.com/go/promotions",
    description: "推广节点 Atom 信息流，保留主题原始链接并去除回复锚点。",
    categories: ["云服务", "软件", "其他"],
  },
  {
    id: "v2ex_free",
    name: "V2EX 免费赠送",
    group: "community",
    format: "JSON API",
    trust: "社区",
    credential: "无需密钥",
    homepage: "https://www.v2ex.com/go/free",
    description: "免费赠送节点；适合作为发现线索，仍需回溯活动官方页。",
    categories: ["免费资源", "软件"],
  },
  {
    id: "nodeseek",
    name: "NodeSeek 福利情报",
    aliases: ["NodeSeek"],
    group: "community",
    format: "RSS",
    trust: "社区",
    credential: "无需密钥",
    homepage: "https://www.nodeseek.com/",
    description: "VPS、云服务与主机社区信息流，按优惠信号进行质量筛选。",
    categories: ["VPS", "主机", "云服务"],
  },
  {
    id: "deepflood",
    name: "DeepFlood AI 与实用资源",
    group: "community",
    format: "RSS",
    trust: "聚合",
    credential: "无需密钥",
    homepage: "https://deepflood.com/",
    description: "AI、开发工具和实用资源信息流；非优惠内容会在质量层被过滤。",
    categories: ["AI", "开发者", "软件"],
  },
  {
    id: "nodeloc",
    name: "NodeLoc 中文羊毛与 VPS",
    group: "community",
    format: "RSS",
    trust: "社区",
    credential: "无需密钥",
    homepage: "https://www.nodeloc.com/",
    description: "中文 VPS 与主机社区，重点捕获促销、开机和长期优惠。",
    categories: ["VPS", "主机", "云服务"],
  },
  {
    id: "epic",
    name: "Epic Games",
    group: "platform",
    format: "JSON API",
    trust: "官方",
    credential: "无需密钥",
    homepage: "https://store.epicgames.com/zh-CN/free-games",
    description: "只收录当前促销窗口内且折扣价为 0 的官方免费游戏。",
    categories: ["游戏", "限时免费"],
  },
  {
    id: "appinn",
    name: "小众软件",
    group: "software",
    format: "RSS",
    trust: "聚合",
    credential: "无需密钥",
    homepage: "https://www.appinn.com/",
    description: "软件、效率工具和限免资讯；由优惠信号规则控制进入候选队列。",
    categories: ["软件", "效率工具"],
  },
  {
    id: "ghxi",
    name: "果核剥壳",
    group: "software",
    format: "RSS",
    trust: "聚合",
    credential: "无需密钥",
    homepage: "https://www.ghxi.com/",
    description: "软件与数字服务资讯，保留原文作为线索来源。",
    categories: ["软件", "数字服务"],
  },
  {
    id: "iplaysoft",
    name: "异次元软件世界",
    group: "software",
    format: "RSS",
    trust: "聚合",
    credential: "无需密钥",
    homepage: "https://www.iplaysoft.com/",
    description: "软件与开发工具信息流，请求允许跟随重定向到最终 Feed。",
    categories: ["软件", "开发者"],
  },
  {
    id: "slickdeals",
    name: "Slickdeals Frontpage",
    group: "software",
    format: "RSS",
    trust: "聚合",
    credential: "无需密钥",
    homepage: "https://slickdeals.net/",
    description: "英文综合优惠前台精选，适合补充全球消费与数字服务优惠。",
    categories: ["综合优惠", "数字服务"],
  },
  {
    id: "producthunt",
    name: "Product Hunt",
    group: "discovery",
    format: "RSS",
    trust: "聚合",
    credential: "无需密钥",
    homepage: "https://www.producthunt.com/",
    description: "新品发现入口；只把明确包含免费额度、折扣或试用的条目送入候选。",
    categories: ["AI", "SaaS", "开发者"],
  },
  {
    id: "reddit_freebies",
    name: "Reddit r/freebies",
    group: "social",
    format: "RSS",
    trust: "社区",
    credential: "无需密钥",
    homepage: "https://www.reddit.com/r/freebies/",
    description: "全球免费资源线索；串行限速并在 429 后退避重试。",
    categories: ["免费资源", "全球优惠"],
  },
  {
    id: "reddit_tech_deals",
    name: "Reddit IT / VPS / Crypto / Hosting",
    group: "social",
    format: "RSS",
    trust: "社区",
    credential: "无需密钥",
    homepage: "https://www.reddit.com/r/selfhosted+VPS+webhosting+CryptoAirdrops/",
    description: "合并 IT、VPS、主机与 Crypto 社区线索，统一限速并按子版块分类。",
    categories: ["VPS", "主机", "Crypto"],
  },
  {
    id: "telegram_freegames",
    name: "Telegram 免费游戏情报",
    group: "social",
    format: "公开预览页",
    trust: "社区",
    credential: "无需密钥",
    homepage: "https://t.me/s/freegamesnews",
    description: "解析 Telegram 公开频道预览，不接触账号 Cookie。",
    categories: ["游戏", "限时免费"],
  },
  {
    id: "telegram_cn_deals",
    name: "Telegram 中文科技与羊毛",
    group: "social",
    format: "公开预览页",
    trust: "社区",
    credential: "无需密钥",
    homepage: "https://t.me/s/zaihuapd",
    description: "中文科技与优惠频道，只保留具有明确优惠信号的公开消息。",
    categories: ["科技", "优惠", "云服务"],
  },
  {
    id: "xiaohongshu_connector",
    name: "小红书福利搜索",
    group: "social",
    format: "私有 RSS 连接器",
    trust: "社区",
    credential: "登录态连接器",
    homepage: "https://www.xiaohongshu.com/",
    description: "需要由用户自管登录态的 HTTPS RSS/浏览器桥；仓库不保存 Cookie。",
    categories: ["优惠", "生活方式"],
    optional: true,
  },
];

const NORMALIZED_SOURCE_NAMES = new Map<string, string>();
for (const source of SOURCE_CATALOG) {
  for (const name of [source.name, ...(source.aliases ?? [])]) {
    NORMALIZED_SOURCE_NAMES.set(name.trim().toLowerCase(), source.id);
  }
}

export function sourceIdForName(name: string): string | null {
  return NORMALIZED_SOURCE_NAMES.get(name.trim().toLowerCase()) ?? null;
}
