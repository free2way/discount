import assert from "node:assert/strict";
import test from "node:test";
import { assessDealQuality } from "./deal-quality.mts";

test("publishes clear discount candidates", () => {
  const result = assessDealQuality("双 11 大促：正版软件低至 6 折", "限时优惠");
  assert.equal(result.publish, true);
  assert.ok(result.relevanceScore >= 38);
});

test("queues ordinary news instead of publishing it", () => {
  const result = assessDealQuality("Windows 画图曝出高危漏洞", "微软发布安全公告");
  assert.equal(result.publish, false);
});

test("blocks risky resellers and modified software", () => {
  const reseller = assessDealQuality("GPT 代充价格优惠，接码 3 元一次");
  const software = assessDealQuality("文件管理器修改版免费下载");
  assert.equal(reseller.publish, false);
  assert.ok(reseller.riskFlags.includes("account_abuse"));
  assert.equal(software.publish, false);
  assert.ok(software.riskFlags.includes("untrusted_software"));
});

test("queues relay pools, unofficial keys, and secondary-market posts", () => {
  const relay = assessDealQuality("RelayRouter 中转自荐，注册送免费额度", "纯 Pro 池并支持共享官方重置");
  const keySeller = assessDealQuality("dsf 上游提供官 key，3.5 折直出");
  const resale = assessDealQuality("「出」总价 80 出 HKG 稀有套餐 5 折");
  assert.equal(relay.publish, false);
  assert.ok(relay.riskFlags.includes("unverified_reseller"));
  assert.ok(relay.riskFlags.includes("account_abuse"));
  assert.equal(keySeller.publish, false);
  assert.ok(keySeller.riskFlags.includes("unverified_reseller"));
  assert.equal(resale.publish, false);
  assert.ok(resale.riskFlags.includes("secondary_market"));
});

test("queues anonymous cloud, proxy, and securities solicitations", () => {
  const cloud = assessDealQuality("AWS 新号 65 折，老号无需迁移", "优质资源，TG 详聊");
  const proxy = assessDealQuality("住宅 IP 免费送", "静态 ISP 独享 IP 低价促销");
  const broker = assessDealQuality("银河证券万一免五开户链接", "开户链接推荐");
  assert.equal(cloud.publish, false);
  assert.ok(cloud.riskFlags.includes("unverified_reseller"));
  assert.equal(proxy.publish, false);
  assert.ok(proxy.riskFlags.includes("unverified_reseller"));
  assert.equal(broker.publish, false);
  assert.ok(broker.riskFlags.includes("unverified_financial"));
});

test("does not treat routine freeware version updates as fresh deals", () => {
  const result = assessDealQuality("Flameshot(截图工具) v15.0.0", "免费、开源、跨平台的软件版本更新");
  assert.equal(result.publish, false);
});
