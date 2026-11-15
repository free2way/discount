# 小红书连接器

小红书搜索页依赖登录态与前端签名，GitHub Actions 不能在没有用户授权会话的情况下可靠匿名采集。GLOBAL DEAL HUNTER 因此只提供可选的私有桥接入口，不保存 Cookie，也不绕过登录或风控。

## 启用条件

1. 在你控制的环境中部署 RSS/浏览器桥接器，并使用你自己的小红书登录态。
2. 桥接器只输出公开笔记的 RSS/Atom，条目链接必须指向 `xiaohongshu.com` 或 `xhslink.com`。
3. 在 GitHub 仓库的 Actions Secrets 新增 `XHS_RSS_URL`，值为桥接器的 HTTPS Feed 地址。
4. 手动运行一次 `Scan deals and deploy`，确认 `source_results` 出现 `xiaohongshu_connector` 且 `ok: true`。

未配置 `XHS_RSS_URL` 时，扫描器不会请求小红书、不会产生空白来源，也不会把未验证内容标记为已采集。

## 安全边界

- 不把 Cookie、二维码、浏览器 Profile 或个人账号凭据提交到仓库。
- 不采集私密笔记、评论区身份信息或登录后非公开内容。
- 社区笔记只作为发现线索，必须回溯品牌或项目官方页面后才能升级为 `verified`。
