const repositories = [
  { slug: "Vincentwei1021/video-shotcraft", category: "VIDEO", title: "video-shotcraft", fallback: "面向产品宣传视频的镜头配方与动态样例库。", focus: "视频叙事 / 动态样例" },
  { slug: "emilkowalski/skills", category: "DESIGN", title: "emilkowalski / skills", fallback: "为设计师和工程师准备的一组实用 skills。", focus: "产品设计 / 前端体验" },
  { slug: "pbakaus/impeccable", category: "DESIGN", title: "pbakaus / impeccable", fallback: "帮助 AI 更好理解设计语言与界面质量的 skill。", focus: "设计语言 / UI 品质" },
  { slug: "greensock/GSAP", category: "MOTION", title: "greensock / GSAP", fallback: "现代 Web 动画的成熟工具与生态。", focus: "动效系统 / 交互反馈" },
  { slug: "Leonxlnx/taste-skill", category: "DESIGN", title: "Leonxlnx / taste-skill", fallback: "让 AI 避免生成无聊、通用、模板化界面的设计品味 skill。", focus: "去模板感 / 视觉判断" },
  { slug: "mattpocock/skills", category: "ENGINEERING", title: "mattpocock / skills", fallback: "面向真实工程工作的可复用 agent skills。", focus: "工程工作流 / Agent" }
];

const designWebsites = [
  { name: "Dribbble", url: "https://dribbble.com", type: "视觉灵感", description: "适合快速浏览单屏视觉、组件细节、品牌语言与插画风格。", bestFor: "首页视觉 / 组件灵感" },
  { name: "Behance", url: "https://www.behance.net", type: "完整项目", description: "更适合研究从品牌、页面到案例叙事的一整套项目表达。", bestFor: "品牌系统 / 案例拆解" },
  { name: "Awwwards", url: "https://www.awwwards.com", type: "网页体验", description: "聚焦高质量网站、交互叙事与创意开发作品。", bestFor: "作品集 / 交互动效" },
  { name: "Mobbin", url: "https://mobbin.com", type: "产品 UI", description: "按真实产品流程查找移动端与 Web 应用界面。", bestFor: "App 流程 / UX 模式" },
  { name: "Land-book", url: "https://land-book.com", type: "落地页", description: "专注收集落地页和营销网站，适合寻找首屏与转化结构。", bestFor: "Landing page / 首屏" },
  { name: "SiteInspire", url: "https://www.siteinspire.com", type: "网站策展", description: "按风格、行业和平台筛选网页参考，适合建立视觉情绪板。", bestFor: "网页风格 / Moodboard" }
];

const repoList = document.querySelector("#repoList");
const track = (name, properties) => window.image2Analytics?.track(name, properties);

function formatNumber(value) {
  if (typeof value !== "number") return "--";
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value);
}

function formatDate(date) {
  if (!date) return "近期更新";
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  if (days === 0) return "今天更新";
  if (days < 7) return `${days} 天前更新`;
  if (days < 30) return `${Math.floor(days / 7)} 周前更新`;
  return `${Math.floor(days / 30)} 个月前更新`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function renderRepositories(items) {
  repoList.innerHTML = items.map((item) => `
    <article class="repo-row">
      <p class="repo-category">${escapeHtml(item.category)}</p>
      <div class="repo-main"><a href="https://github.com/${item.slug}" target="_blank" rel="noreferrer" data-repo-link="${item.slug}">${escapeHtml(item.title)}</a><p>${escapeHtml(item.description || item.fallback)}</p></div>
      <p class="repo-focus">${escapeHtml(item.focus)}</p>
      <div class="repo-stats"><span title="GitHub Stars">Star <b>${formatNumber(item.stars)}</b></span><span title="Forks">Fork <b>${formatNumber(item.forks)}</b></span><small>${formatDate(item.updatedAt)}</small></div>
    </article>
  `).join("");
  repoList.querySelectorAll("[data-repo-link]").forEach((link) => link.addEventListener("click", () => track("skill_repo_open", { repository: link.dataset.repoLink })));
}

function renderDesignWebsites() {
  const websiteList = document.querySelector("#websiteList");
  websiteList.innerHTML = designWebsites.map((site, index) => `
    <article class="website-row">
      <p>${String(index + 1).padStart(2, "0")}</p>
      <div><a href="${site.url}" target="_blank" rel="noreferrer" data-design-site="${site.name}">${site.name}</a><span>${site.type}</span></div>
      <p>${site.description}</p>
      <small>${site.bestFor}</small>
    </article>
  `).join("");
  websiteList.querySelectorAll("[data-design-site]").forEach((link) => link.addEventListener("click", () => track("design_site_open", { site: link.dataset.designSite })));
}

async function loadRepositoryData() {
  renderRepositories(repositories);
  const resolved = await Promise.all(repositories.map(async (item) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${item.slug}`, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
      if (!response.ok) throw new Error("GitHub API request failed");
      const repo = await response.json();
      return { ...item, description: repo.description, stars: repo.stargazers_count, forks: repo.forks_count, updatedAt: repo.pushed_at };
    } catch { return item; }
  }));
  renderRepositories(resolved);
}

loadRepositoryData();
renderDesignWebsites();
track("skills_page_view");
