# GLOBAL DEAL HUNTER｜全球羊毛情报中心

一个面向全球优惠、免费资源、限时活动与金融服务优惠的自动化情报工作空间。

核心能力：

- 每 2 小时采集与复核（发布后由 Sites 云任务执行）
- 官方来源优先，Reddit 仅作为发现线索
- 链接与活动名称规范化去重
- 有效性、截止时间、地区、资格与隐藏条件识别
- 价值评分与高价值排序
- 已过期活动自动归档
- D1 持久化数据库与受控 MCP 写入工具
- 响应式情报看板，包含八个独立模块

应用源码位于 [`sites/global-deal-hunter`](./sites/global-deal-hunter)。运行与质量规则见 [`OPERATIONS.md`](./sites/global-deal-hunter/OPERATIONS.md)。

## 本地开发

```bash
cd sites/global-deal-hunter
npm ci
npm run db:generate
npm run dev
```

## 验证

```bash
npx tsc --noEmit
npm run build
```
