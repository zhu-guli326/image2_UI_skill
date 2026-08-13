// Keep the public brand browser self-contained so GitHub Pages can render it
// even when the generated catalog directory has not been published yet.
const brandProfiles = [
  {
    id: "editorial-commerce", name: "编辑型时尚", sourceType: "style-reference", sourceStatus: "风格参考", reviewedAt: "2026-08-13",
    platforms: ["web", "ios"], industry: ["电商", "生活方式", "内容"], styles: ["编辑式", "极简", "奢侈品"], completeness: "完整系统",
    foundations: { colors: { paper: "#F7F4EF", ink: "#2D251F", accent: "#A45855", muted: "#9B9188" }, typography: { display: "授权衬线字体或高对比开源替代", body: "系统无衬线", scale: "40 / 28 / 18 / 14" }, spacing: "4px 基线，24px 内容边距，48px 区块间距", radius: "8px 内容容器，圆形仅用于头像与图像", elevation: "无厚阴影，以留白和细边界分层", grid: "12 列 Web，4 列移动端", motion: "180ms 淡入、收藏和画面切换" },
    components: { button: "深色实心主操作，文字短且明确", card: "图片优先，信息区平整无套卡", navigation: "低干扰文字导航，当前态使用细线", form: "细下划线或浅边框，避免高饱和输入框", dialog: "白底编辑式详情，保留充足阅读边距" },
    visualLanguage: { photography: "自然柔光、单一主体、保留剪裁与文案安全区；不生成品牌 logo 或文字", illustration: "克制、材料感优先，不取代功能 icon", iconography: "16-20px 细线代码图标" },
    contentVoice: "简短、感官具体、避免促销堆叠和夸张折扣语气。", accessibility: "正文至少 4.5:1 对比度；不以颜色作为唯一状态信息。", dos: ["让商品和摄影承担第一视觉", "将价格和行动放在稳定阅读层级"], donts: ["不要生成或仿制第三方品牌标识", "不要把折扣、角标和标签同时堆在主视觉上"]
  },
  {
    id: "minimal-tech", name: "极简科技", sourceType: "style-reference", sourceStatus: "风格参考", reviewedAt: "2026-08-13",
    platforms: ["web", "ios", "android"], industry: ["科技", "工具", "健康"], styles: ["功能主义", "极简"], completeness: "组件规范",
    foundations: { colors: { canvas: "#F4F6F4", ink: "#151716", accent: "#C8FF3D", signal: "#168143" }, typography: { display: "系统无衬线 700", body: "系统无衬线 400", scale: "32 / 24 / 16 / 14" }, spacing: "4px 基线，16px 控件间距，32px 模块间距", radius: "6px 数据容器，22px 主操作", elevation: "一层低对比边框，不使用玻璃拟态", grid: "12 列 Web，8pt 移动端节奏", motion: "150ms 状态反馈，遵从 reduced-motion" },
    components: { button: "高对比单一 accent，只用于主操作", card: "平整信息面，明确标题、数值和一个状态", navigation: "图标和文字均有可访问名称，选中态可见", form: "44px 最小触达区，错误不只依赖红色", dialog: "动作分级明确，危险动作需要二次确认" },
    visualLanguage: { photography: "产品和环境图干净、无文字、无商标，留出数据和说明空间", illustration: "用于空状态和解释，避免伪 UI glyph", iconography: "统一代码图标库，20-24px，1.75-2px stroke" },
    contentVoice: "直接、可扫描，以任务和状态为中心。", accessibility: "普通文本 4.5:1；所有图标按钮提供 aria-label；目标至少 44px。", dos: ["将色彩留给状态和行动", "让数值与任务先于装饰被读取"], donts: ["不要用位图承担导航或控制 glyph", "不要在单张卡片堆叠过多微型数据"]
  },
  {
    id: "soft-lifestyle", name: "柔和生活方式", sourceType: "style-reference", sourceStatus: "风格参考", reviewedAt: "2026-08-13",
    platforms: ["web", "ios"], industry: ["生活方式", "内容", "健康"], styles: ["亲和", "柔和", "极简"], completeness: "基础规范",
    foundations: { colors: { paper: "#FFFDF8", ink: "#282421", accent: "#6D9D8B", warm: "#E9C9A5" }, typography: { display: "人文无衬线或开源衬线替代", body: "系统无衬线", scale: "34 / 24 / 16 / 14" }, spacing: "4px 基线，20px 移动端边距，40px 内容节奏", radius: "10px 图片和轻量内容组", elevation: "非常轻的柔阴影，仅用于浮层", grid: "单列阅读优先，桌面最大行宽 72ch", motion: "200ms 温和转场，不依赖动画理解内容" },
    components: { button: "圆角主操作配清晰文字，次操作保持线性", card: "信息有限的独立项目，避免卡片套卡片", navigation: "移动端优先，当前页有文字和颜色双重提示", form: "单题一步，保留明确帮助文案", dialog: "轻量短流程，关闭和返回始终可见" },
    visualLanguage: { photography: "自然光、真诚日常场景、无文字无 logo", illustration: "少量角色或手绘质感承载情绪，不承担操作", iconography: "统一、克制的代码图标" },
    contentVoice: "温和但不含糊，用具体下一步取代空泛鼓励。", accessibility: "保持可读对比度；动效提供 reduced-motion；触摸目标不低于 44px。", dos: ["一次推进一个清楚动作", "让情绪性图片和真实文案分层"], donts: ["不要以品牌名或商标生成图片", "不要让柔色降低关键文字的可读性"]
  }
];

const relatedCasesByBrand = {
  "editorial-commerce": [{ name: "Vestra", style: "编辑式时尚电商", tag: "编辑画册" }, { name: "Carry Bag", style: "高亮背包电商", tag: "户外产品" }, { name: "RELAY", style: "编辑式音乐发现", tag: "编辑式音乐" }],
  "minimal-tech": [{ name: "CleanBite", style: "荧光食品扫描", tag: "荧光青柠" }, { name: "Signal Grid", style: "服务风险扫描", tag: "风险扫描" }, { name: "Volt Route", style: "电动车充电", tag: "EV charging" }],
  "soft-lifestyle": [{ name: "Buddy", style: "轻盈旅行计划", tag: "贴纸标签" }, { name: "Plate Play", style: "高彩插画食谱", tag: "食谱插画" }, { name: "Moe", style: "手绘习惯养成", tag: "伪手写" }]
};

const brandList = document.querySelector("#brandList");
const detail = document.querySelector("#brandDetail");
const filters = document.querySelector("#brandFilters");
const resultCount = document.querySelector("#brandResultCount");
const emptyState = document.querySelector("#brandEmpty");
const toast = document.querySelector("#toast");
let toastTimer = 0;
let activeBrandId = readBrandId() || "minimal-tech";

populateFilter("industry", uniqueValues("industry"));
populateFilter("style", uniqueValues("styles"));
filters.addEventListener("change", handleFilterChange);
document.querySelector("#clearBrandFilters")?.addEventListener("click", clearFilters);
window.addEventListener("popstate", () => selectBrand(readBrandId() || "minimal-tech", { updateUrl: false }));
selectBrand(activeBrandId, { updateUrl: false });

function uniqueValues(field) {
  return [...new Set(brandProfiles.flatMap((brand) => brand[field] || []))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function populateFilter(name, values) {
  const select = filters.elements[name];
  for (const value of values) select.add(new Option(value, value));
}

function readBrandId() {
  return new URL(window.location.href).searchParams.get("brand");
}

function filteredBrands() {
  const data = new FormData(filters);
  return brandProfiles.filter((brand) => {
    const platform = data.get("platform");
    const industry = data.get("industry");
    const style = data.get("style");
    const completeness = data.get("completeness");
    return (!platform || brand.platforms.includes(platform)) && (!industry || brand.industry.includes(industry)) && (!style || brand.styles.includes(style)) && (!completeness || brand.completeness === completeness);
  });
}

function renderList() {
  const brands = filteredBrands();
  resultCount.textContent = `${brands.length} 个品牌规范`;
  emptyState.hidden = brands.length !== 0;
  brandList.hidden = brands.length === 0;
  brandList.innerHTML = brands.map((brand) => `
    <button class="brand-row${brand.id === activeBrandId ? " is-active" : ""}" type="button" data-brand-id="${escapeHtml(brand.id)}" aria-pressed="${brand.id === activeBrandId}">
      <span class="brand-row-head"><strong>${escapeHtml(brand.name)}</strong><span class="status-badge">${escapeHtml(brand.sourceStatus)}</span></span>
      <p>${escapeHtml(brand.styles.join(" / "))} · ${escapeHtml(brand.completeness)}</p>
      <span class="swatches" aria-label="色彩预览">${Object.values(brand.foundations.colors).slice(0, 5).map((color) => `<i style="--swatch:${safeColor(color)}"></i>`).join("")}</span>
    </button>`).join("");
  brandList.querySelectorAll("[data-brand-id]").forEach((button) => button.addEventListener("click", () => selectBrand(button.dataset.brandId)));
}

function handleFilterChange() {
  const brands = filteredBrands();
  if (!brands.length) {
    renderList();
    renderEmptyDetail();
    return;
  }
  const next = brands.find((brand) => brand.id === activeBrandId) || brands[0];
  selectBrand(next.id);
}

function clearFilters() {
  filters.reset();
  selectBrand(activeBrandId || "minimal-tech");
}

function selectBrand(id, { updateUrl = true } = {}) {
  const brand = brandProfiles.find((item) => item.id === id) || brandProfiles[0];
  if (!brand) return;
  activeBrandId = brand.id;
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("brand", brand.id);
    window.history.pushState({ brand: brand.id }, "", url);
  }
  renderList();
  renderDetail(brand);
  document.documentElement.style.setProperty("--accent", safeColor(brand.foundations.colors.accent || Object.values(brand.foundations.colors)[0]));
}

function renderDetail(brand) {
  const relatedCases = relatedCasesByBrand[brand.id] || [];
  detail.innerHTML = `
    <header class="detail-header">
      <div>
        <p class="eyebrow">${escapeHtml(brand.id.toUpperCase())}</p>
        <div class="detail-title-line"><h2>${escapeHtml(brand.name)}</h2><span class="status-badge">${escapeHtml(brand.sourceStatus)}</span></div>
        <p class="detail-summary">${escapeHtml(brand.contentVoice)}</p>
        <div class="metadata"><span class="meta-chip">${escapeHtml(brand.platforms.join(" / ").toUpperCase())}</span><span class="meta-chip">${escapeHtml(brand.industry.join(" / "))}</span><span class="meta-chip">${escapeHtml(brand.completeness)}</span><span class="meta-chip">复核 ${escapeHtml(brand.reviewedAt)}</span></div>
        <p class="source-note">${sourceNote(brand)}</p>
      </div>
      <div class="detail-actions">
        <button class="action primary" type="button" data-action="apply">应用到新项目</button>
        <button class="action" type="button" data-action="prompt">复制品牌 Prompt</button>
        <button class="action" type="button" data-action="tokens">生成 Design Tokens</button>
      </div>
    </header>
    <div class="detail-grid">
      <section class="spec-section full"><div class="section-heading"><h3>色彩系统</h3><span>Foundations / Colors</span></div><div class="color-system">${Object.entries(brand.foundations.colors).map(([name, value]) => `<div class="color-swatch"><i style="--swatch:${safeColor(value)}"></i><strong>${escapeHtml(name)}</strong><code>${escapeHtml(value)}</code></div>`).join("")}</div></section>
      <section class="spec-section"><div class="section-heading"><h3>字体与信息层级</h3><span>Typography</span></div>${definitionList(brand.foundations.typography)}</section>
      <section class="spec-section"><div class="section-heading"><h3>间距、圆角与网格</h3><span>Layout Tokens</span></div>${definitionList({ spacing: brand.foundations.spacing, radius: brand.foundations.radius, elevation: brand.foundations.elevation, grid: brand.foundations.grid })}</section>
      <section class="spec-section full"><div class="section-heading"><h3>组件规范</h3><span>Button / Card / Navigation / Form / Dialog</span></div>${definitionList(brand.components)}</section>
      <section class="spec-section"><div class="section-heading"><h3>摄影、插画与图标</h3><span>Visual Language</span></div>${definitionList(brand.visualLanguage)}</section>
      <section class="spec-section"><div class="section-heading"><h3>动效与可访问性</h3><span>Motion / Accessibility</span></div>${definitionList({ motion: brand.foundations.motion, accessibility: brand.accessibility })}</section>
      <section class="spec-section full"><div class="section-heading"><h3>内容语气</h3><span>Content Voice</span></div><p class="voice-sample">${escapeHtml(brand.contentVoice)}</p></section>
      <section class="spec-section full"><div class="section-heading"><h3>Do / Don't</h3><span>Compliance</span></div><div class="guidance-columns"><div><h4>应该</h4><ul>${brand.dos.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><div><h4>不要</h4><ul>${brand.donts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}<li>不要自动生成品牌 Logo、商标或带品牌文字的图片。</li></ul></div></div></section>
      <section class="spec-section full"><div class="section-heading"><h3>相关案例</h3><span>${relatedCases.length} CASES</span></div><div class="case-links">${relatedCases.map((item) => `<a href="./library.html?tag=${encodeURIComponent(item.tag)}">${escapeHtml(item.name)} · ${escapeHtml(item.style)}</a>`).join("") || "暂无关联案例"}</div></section>
    </div>`;
  detail.querySelector('[data-action="apply"]').addEventListener("click", () => copyText(buildProjectInstruction(brand), "已复制项目应用指令"));
  detail.querySelector('[data-action="prompt"]').addEventListener("click", () => copyText(buildBrandPrompt(brand), "品牌 Prompt 已复制"));
  detail.querySelector('[data-action="tokens"]').addEventListener("click", () => downloadTokens(brand));
}

function renderEmptyDetail() {
  detail.innerHTML = `<div class="detail-empty"><p class="eyebrow">NO MATCHING PROFILE</p><h2>换一组筛选条件</h2><p>当前平台、行业、风格和完整度没有交集。品牌规范不会消失，只是这组组合暂时没有结果。</p><button class="action primary" type="button" id="clearDetailFilters">查看全部品牌规范</button><div class="empty-suggestions"><span>极简科技</span><span>编辑型时尚</span><span>柔和生活方式</span></div></div>`;
  document.querySelector("#clearDetailFilters")?.addEventListener("click", clearFilters);
}

function definitionList(values) {
  return `<dl class="definition-list">${Object.entries(values).map(([name, value]) => `<div><dt>${escapeHtml(labelFor(name))}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
}

function sourceNote(brand) {
  const base = brand.sourceStatus === "风格参考" ? "这是可组合的风格参考，不代表任何第三方品牌的官方规范。" : `来源状态：${brand.sourceStatus}。`;
  const link = brand.sourceUrl ? ` <a href="${escapeHtml(brand.sourceUrl)}" target="_blank" rel="noreferrer">查看来源</a>` : "";
  return `${base} Logo、商业字体与专属素材仅在用户提供并确认授权后使用。${link}`;
}

function buildBrandPrompt(brand) {
  const colors = Object.entries(brand.foundations.colors).map(([name, value]) => `${name} ${value}`).join("; ");
  return [`品牌规范：${brand.name}`, `来源状态：${brand.sourceStatus}`, `平台：${brand.platforms.join(" / ")}`, `色彩：${colors}`, `字体：${Object.values(brand.foundations.typography).join("；")}`, `间距：${brand.foundations.spacing}`, `圆角：${brand.foundations.radius}`, `组件：${Object.entries(brand.components).map(([name, value]) => `${name} ${value}`).join("；")}`, `摄影：${brand.visualLanguage.photography}`, `插画：${brand.visualLanguage.illustration}`, `图标：${brand.visualLanguage.iconography}`, `内容语气：${brand.contentVoice}`, `可访问性：${brand.accessibility}`, `Do：${brand.dos.join("；")}`, `Don't：${brand.donts.join("；")}`, "资产限制：不得自动生成、仿制或添加品牌 Logo、商标、品牌文字、商业字体或专属素材；仅在用户提供并确认授权后使用。"].join("\n");
}

function buildBrandTokens(brand) {
  return {
    $schema: "https://design-tokens.github.io/community-group/format/",
    brandProfileId: brand.id,
    source: { type: brand.sourceType, status: brand.sourceStatus, url: brand.sourceUrl || null, reviewedAt: brand.reviewedAt },
    color: Object.fromEntries(Object.entries(brand.foundations.colors).map(([name, value]) => [name, { $type: "color", $value: value }])),
    typography: brand.foundations.typography,
    spacing: brand.foundations.spacing,
    radius: brand.foundations.radius,
    elevation: brand.foundations.elevation,
    grid: brand.foundations.grid,
    motion: brand.foundations.motion,
    components: brand.components,
    assetPolicy: { allowBrandMarks: false, note: "Logo, trademarks, commercial fonts, and proprietary assets require user-provided authorization." }
  };
}

function buildProjectInstruction(brand) {
  return [`在新项目中应用“${brand.name}”品牌规范，并保留所选案例的页面结构与交互逻辑。`, "", buildBrandPrompt(brand), "", "输出 artifacts/brand-profile.json、artifacts/brand-tokens.json 和 artifacts/brand-compliance.md；在验收中逐项核对色彩、字体、间距、圆角、组件、动效、摄影/插画语言与资产授权边界。"].join("\n");
}

async function copyText(text, message) {
  try { await navigator.clipboard.writeText(text); } catch { fallbackCopy(text); }
  showToast(message);
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.cssText = "position:fixed;opacity:0";
  document.body.append(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function downloadTokens(brand) {
  const blob = new Blob([`${JSON.stringify(buildBrandTokens(brand), null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${brand.id}-brand-tokens.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Design Tokens 已生成");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 1800);
}

function labelFor(value) {
  return ({ display: "标题字体", body: "正文字体", scale: "字号层级", spacing: "间距", radius: "圆角", elevation: "层级", grid: "网格", button: "按钮", card: "卡片", navigation: "导航", form: "表单", dialog: "弹窗", photography: "摄影", illustration: "插画", iconography: "图标", motion: "动效", accessibility: "可访问性" })[value] || value;
}

function safeColor(value) {
  return /^#[0-9a-f]{3,8}$/i.test(String(value)) ? value : "#d8dad4";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}
