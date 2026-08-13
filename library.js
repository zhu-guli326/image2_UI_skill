import { getLibraryPreviewDevice, getLibraryPreviewDisplayDevice, libraryPreviewAssetVersion } from "./library-preview-config.mjs";
import { searchGuides } from "./library-search.mjs";
import { styleGuides, brandProfiles } from "./catalog/index.js";

const previewImageSets = Object.freeze({
  museum: [
    { src: "./assets/cases/museum-app/home-screen.png", label: "首页" },
    { src: "./assets/cases/museum-app/exhibitions-screen.png", label: "展览列表" },
    { src: "./assets/cases/museum-app/detail-screen.png", label: "展览详情" }
  ],
  fashion: [
    { src: "./assets/cases/fashion-shopping-app/hero-screen.png", label: "品牌首页" },
    { src: "./assets/cases/fashion-shopping-app/catalog-screen.png", label: "商品目录" },
    { src: "./assets/cases/fashion-shopping-app/favorites-screen.png", label: "收藏页" }
  ],
  fufu: [
    { src: "./demo/fufu-bakery/screenshots/01-welcome.png", label: "欢迎页" },
    { src: "./demo/fufu-bakery/screenshots/02-home.png", label: "烘焙首页" },
    { src: "./demo/fufu-bakery/screenshots/04-menu.png", label: "今日菜单" },
    { src: "./demo/fufu-bakery/screenshots/03-member.png", label: "会员卡" }
  ],
  organique: [
    { src: "./demo/organique-food/screenshots/01-choose.png", label: "选择餐食" },
    { src: "./demo/organique-food/screenshots/02-plan.png", label: "配送计划" },
    { src: "./demo/organique-food/screenshots/03-confirmation.png", label: "确认页" }
  ],
  "plate-play": [
    { src: "./demo/plate-play/screenshots/library-preview-2x.png", label: "欢迎页" },
    { src: "./demo/plate-play/screenshots/recipes.png", label: "食谱列表" },
    { src: "./demo/plate-play/screenshots/detail.png", label: "食谱详情" }
  ],
  "carry-bag": [
    { src: "./demo/carry-bag/screenshots/03-hero.png", label: "品牌首页" },
    { src: "./demo/carry-bag/screenshots/01-catalog.png", label: "商品目录" },
    { src: "./demo/carry-bag/screenshots/02-detail.png", label: "商品详情" }
  ],
  fithub: [
    { src: "./demo/fithub/screenshots/01-discover.png", label: "训练发现" },
    { src: "./demo/fithub/screenshots/02-activity.png", label: "活动统计" },
    { src: "./demo/fithub/screenshots/03-focus.png", label: "目标部位" }
  ],
  "still-form": [
    { src: "./demo/still-form/screenshots/01-intro.png", label: "品牌入口" },
    { src: "./demo/still-form/screenshots/02-catalog.png", label: "系列目录" },
    { src: "./demo/still-form/screenshots/03-detail.png", label: "单品详情" }
  ],
  news: [
    { src: "./assets/cases/news-app/headlines-screen.png", label: "头条页" },
    { src: "./assets/cases/news-app/feed-screen.png", label: "新闻流" },
    { src: "./assets/cases/news-app/discover-screen.png", label: "发现页" }
  ],
  "signal-grid": [
    { src: "./demo/signal-grid/screenshots/01-scan.png", label: "扫描页" },
    { src: "./demo/signal-grid/screenshots/02-plans.png", label: "方案页" },
    { src: "./demo/signal-grid/screenshots/03-confirmation.png", label: "确认页" }
  ],
  "volt-route": [
    { src: "./demo/volt-route/screenshots/01-dashboard.png", label: "车辆状态" },
    { src: "./demo/volt-route/screenshots/02-route.png", label: "充电路线" },
    { src: "./demo/volt-route/screenshots/03-charging.png", label: "充电进度" }
  ],
  moe: [
    { src: "./demo/moe-habits/screenshots/video-2x/01-intro.png", label: "欢迎页" },
    { src: "./demo/moe-habits/screenshots/video-2x/02-home.png", label: "习惯首页" },
    { src: "./demo/moe-habits/screenshots/video-2x/03-task.png", label: "任务页" },
    { src: "./demo/moe-habits/screenshots/video-2x/04-celebration.png", label: "完成反馈" }
  ],
  loy: [
    { src: "./demo/loy-wellness/screenshots/03-welcome.png", label: "欢迎页" },
    { src: "./demo/loy-wellness/screenshots/01-home.png", label: "健康首页" },
    { src: "./demo/loy-wellness/screenshots/02-playlist.png", label: "播放列表" }
  ],
  moodly: [
    { src: "./demo/moodly-health/screenshots/01-checkin.png", label: "情绪签到" },
    { src: "./demo/moodly-health/screenshots/02-confirm.png", label: "签到完成" }
  ],
  reflect: [
    { src: "./demo/reflect-journal/screenshots/01-home.png", label: "日记首页" },
    { src: "./demo/reflect-journal/screenshots/02-detail.png", label: "日记详情" }
  ],
  mimo: [
    { src: "./demo/mimo-activities/screenshots/01-carousel.png", label: "日程轮播" },
    { src: "./demo/mimo-activities/screenshots/02-walk-focus.png", label: "步行任务" }
  ]
});

const githubApiUrl = "https://api.github.com/repos/zhu-guli326/image2_UI_skill";
const githubStarsFallbackUrl = "https://img.shields.io/github/stars/zhu-guli326/image2_UI_skill.json";
const gallery = document.querySelector("#demoGallery");
const searchInput = document.querySelector("#styleSearch");
const categoryNav = document.querySelector("#categoryNav");
const catalogHeading = document.querySelector("#catalogHeading");
const resultCount = document.querySelector("#resultCount");
const emptyState = document.querySelector("#emptyState");
const githubStars = document.querySelector("#githubStars");
const githubStarsNav = document.querySelector("#githubStarsNav");
const styleDialog = document.querySelector("#styleDialog");
const styleDialogContent = document.querySelector("#styleDialogContent");
const previewDialog = document.querySelector("#previewDialog");
const previewDialogTitle = document.querySelector("#previewDialogTitle");
const previewDialogImage = document.querySelector("#previewDialogImage");
const previewImageNavigation = document.querySelector("#previewImageNavigation");
const previewImagePrevious = document.querySelector("#previewImagePrevious");
const previewImageNext = document.querySelector("#previewImageNext");
const previewImageLabel = document.querySelector("#previewImageLabel");
const previewImageCount = document.querySelector("#previewImageCount");
const previewDialogVideo = document.querySelector("#previewDialogVideo");
const previewDialogDemo = document.querySelector("#previewDialogDemo");
const previewCursor = document.querySelector("#previewCursor");
const previewMediaFrame = document.querySelector("#previewMediaFrame");
const previewModeSwitch = document.querySelector("#previewModeSwitch");
const previewDialogReference = document.querySelector("#previewDialogReference");
const previewDialogOpenLive = document.querySelector("#previewDialogOpenLive");
const previewMediaStatus = document.querySelector("#previewMediaStatus");
const previewMediaStatusText = document.querySelector("#previewMediaStatusText");
const previewMediaRetry = document.querySelector("#previewMediaRetry");
const infoDialog = document.querySelector("#infoDialog");
const infoDialogContent = document.querySelector("#infoDialogContent");
let activeCategory = "all";
let activeTag = "";
let activePreviewGuide = null;
let previewLoadTimer = 0;
let activePreviewMode = null;
let activePreviewImages = [];
let activePreviewImageIndex = 0;
const track = (name, properties) => window.image2Analytics?.track(name, properties);

const previewModeLabels = {
  image: "效果图",
  video: "Demo 视频",
  live: "可点击 Demo"
};

function updateCatalogCounts() {
  const counts = {};
  for (const guide of styleGuides) counts[guide.category] = (counts[guide.category] || 0) + 1;
  categoryNav.querySelector('[data-filter="all"] b').textContent = styleGuides.length;
  categoryNav.querySelectorAll("[data-filter]:not([data-filter=all])").forEach((item) => { item.querySelector("b").textContent = counts[item.dataset.filter] || 0; });
  document.querySelector(".stats-panel span:first-child strong").textContent = styleGuides.length;
  document.querySelector(".stats-panel span:nth-child(2) strong").textContent = styleGuides.length;
  document.querySelector(".sidebar-note strong").textContent = `${styleGuides.length} 个真实 UI 案例`;
}

function getPreviewDevice(guide, mode) {
  return getLibraryPreviewDevice(guide.id, mode);
}

function getPreviewModes(guide) {
  return ["image", guide.video && "video", guide.liveDemo && "live"].filter(Boolean);
}

function getCardPoster(guide) {
  if (guide.liveDemo) return `${guide.liveDemo.replace(/index\.html$/, "screenshots/library-preview-2x.png")}?v=${libraryPreviewAssetVersion}`;
  return guide.previewImage || guide.poster;
}

function getPreviewPoster(guide) {
  if (guide.previewImage) return guide.previewImage;
  if (guide.liveDemo) return getCardPoster(guide);
  return guide.poster;
}

function withPreviewVersion(src) {
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}v=${libraryPreviewAssetVersion}`;
}

function getPreviewImages(guide) {
  const images = previewImageSets[guide.id];
  if (images?.length) return images.map((image) => ({
    ...image,
    alt: image.alt || `${guide.style} · ${image.label}`,
    src: withPreviewVersion(image.src)
  }));
  return [{ src: getPreviewPoster(guide), label: "效果图", alt: `${guide.style} 手机效果图` }];
}

function showPreviewImage(index) {
  if (!activePreviewImages.length) return;
  activePreviewImageIndex = (index + activePreviewImages.length) % activePreviewImages.length;
  const image = activePreviewImages[activePreviewImageIndex];
  previewDialogImage.src = image.src;
  previewDialogImage.alt = image.alt;
  previewImageLabel.textContent = image.label;
  previewImageCount.textContent = `${activePreviewImageIndex + 1} / ${activePreviewImages.length}`;
  previewImageNavigation.hidden = activePreviewImages.length < 2 || activePreviewMode !== "image";
  previewImagePrevious.setAttribute("aria-label", `上一张效果图，当前为${image.label}`);
  previewImageNext.setAttribute("aria-label", `下一张效果图，当前为${image.label}`);
}

function showPreviewImageError(image, guide) {
  image.hidden = true;
  previewMediaStatus.hidden = false;
  previewMediaStatusText.textContent = `${guide.name} 效果图不可用，请切换到可点击 Demo。`;
  previewMediaRetry.hidden = true;
  previewMediaStatus.classList.add("is-error");
}

function normalizeTag(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

function readTagFromUrl() {
  return new URL(window.location.href).searchParams.get("tag") || "";
}

function setTagFilter(tag, { push = true } = {}) {
  activeTag = tag;
  activeCategory = "all";
  categoryNav.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item.dataset.filter === "all"));
  const url = new URL(window.location.href);
  if (tag) url.searchParams.set("tag", tag);
  else url.searchParams.delete("tag");
  if (push) window.history.pushState({ tag }, "", url);
  renderDemoGallery();
  document.querySelector("#demoGallery")?.scrollIntoView({ block: "start" });
}

function getEmbeddedDemoUrl(guide) {
  const url = new URL(guide.liveDemo, window.location.href);
  url.searchParams.set("embed", "1");
  return url.href;
}

function updateEmbeddedPreviewScale() {
  if (!activePreviewGuide || previewDialogDemo.hidden) return;
  const { width, height } = getPreviewDevice(activePreviewGuide, "live");
  const scale = Math.min(previewMediaFrame.clientWidth / width, previewMediaFrame.clientHeight / height);
  previewMediaFrame.style.setProperty("--preview-embed-scale", String(scale));
}

const previewFrameObserver = new ResizeObserver(updateEmbeddedPreviewScale);
previewFrameObserver.observe(previewMediaFrame);

function buildStyleMode(guide) {
  return [
    `设计风格配置：${guide.name} / ${guide.style}`,
    `参考方向：${guide.reference}`,
    `适用场景：${guide.bestFor}`,
    "",
    "默认视觉参考（本地图片）",
    `参考图路径：${guide.referenceImage}`,
    "调用方式：生成或复刻界面时，将这张本地图片作为 image reference，优先保持它的构图、留白、色彩和信息密度。",
    `图像提示词：${guide.prompt}`,
    "",
    `核心原则：${guide.recipe.principle}`,
    `图片：${guide.recipe.image}`,
    `排版：${guide.recipe.type}`,
    `组件：${guide.recipe.components}`,
    `动效：${guide.recipe.motion}`,
    `避免：${guide.recipe.avoid}`
  ].join("\n");
}

function getBrandProfiles(guide) {
  return (guide.brandProfileIds || []).map((id) => brandProfiles.find((brand) => brand.id === id)).filter(Boolean);
}

function buildBrandPrompt(brand) {
  const colors = Object.entries(brand.foundations.colors).map(([name, value]) => `${name} ${value}`).join("; ");
  return [
    `品牌规范：${brand.name}（${brand.sourceStatus}）`,
    `平台：${brand.platforms.join(" / ")}`,
    `色彩：${colors}`,
    `字体：${brand.foundations.typography.display}；${brand.foundations.typography.body}`,
    `间距与圆角：${brand.foundations.spacing}；${brand.foundations.radius}`,
    `组件：按钮 ${brand.components.button}；卡片 ${brand.components.card}；导航 ${brand.components.navigation}`,
    `视觉：${brand.visualLanguage.photography}`,
    `内容语气：${brand.contentVoice}`,
    `限制：${brand.donts.join("；")}。不得生成、仿制或添加品牌 Logo、商标、品牌文字、商业字体或专属素材，除非用户已经提供并确认授权。`
  ].join("\n");
}

function buildBrandTokens(brand) {
  const { colors, typography, spacing, radius, elevation, grid, motion } = brand.foundations;
  return JSON.stringify({
    brandProfileId: brand.id,
    sourceStatus: brand.sourceStatus,
    color: colors,
    typography,
    spacing,
    radius,
    elevation,
    grid,
    motion,
    components: brand.components
  }, null, 2);
}

function getFilteredGuides() {
  return searchGuides(styleGuides, searchInput.value).filter((guide) => {
    const matchesTag = !activeTag || guide.tags.some((tag) => normalizeTag(tag) === normalizeTag(activeTag));
    return (activeCategory === "all" || guide.category === activeCategory) && matchesTag;
  });
}

function updateCatalogHeadingVisibility() {
  catalogHeading.hidden = activeCategory !== "all" || Boolean(activeTag);
}

function renderDemoGallery() {
  updateCatalogHeadingVisibility();
  const guides = getFilteredGuides();
  gallery.innerHTML = guides.map((guide) => {
    const mediaMode = guide.video ? "video" : "image";
    const openMode = guide.defaultPreviewMode || mediaMode;
    const openLabel = previewModeLabels[openMode];
    const poster = getCardPoster(guide);
    const previewActionButtons = [
      guide.video ? `<button class="style-details-button" type="button" data-preview-id="${guide.id}" data-preview-mode="video">视频</button>` : "",
      guide.liveDemo ? `<button class="style-details-button" type="button" data-preview-id="${guide.id}" data-preview-mode="live">可点击</button>` : ""
    ].join("");
    return `
    <article class="demo-card" data-case-id="${guide.id}">
      <div class="demo-card-preview" style="--preview: ${guide.preview}">
        <div class="phone-preview-media"><img src="${poster}" alt="${guide.style} 手机界面缩略图" decoding="async"><span class="media-hint">效果图预览</span></div>
        <button class="preview-open-button" type="button" data-preview-id="${guide.id}" data-preview-mode="${openMode}" aria-label="打开 ${guide.style} ${openLabel}"><span>${openLabel}</span></button>
      </div>
      <div class="demo-card-body">
        <button class="demo-card-details-hitarea" type="button" data-style-details="${guide.id}" aria-label="查看 ${guide.style} 案例详情"></button>
        <div class="demo-card-meta"><span>${guide.name}</span><span>${guide.bestFor}</span></div>
        <h3>${guide.style}</h3>
        <p class="demo-card-summary">${guide.summary}</p>
        <div class="style-tags" aria-label="风格关键词">${guide.tags.map((tag) => `<a class="style-tag${normalizeTag(tag) === normalizeTag(activeTag) ? " is-active" : ""}" href="./library.html?tag=${encodeURIComponent(tag)}" data-tag="${tag}" aria-pressed="${normalizeTag(tag) === normalizeTag(activeTag)}">${tag}</a>`).join("")}</div>
        <div class="brand-links" aria-label="适用品牌规范">${getBrandProfiles(guide).map((brand) => `<a href="./brands.html?brand=${encodeURIComponent(brand.id)}">${brand.name}</a>`).join("")}</div>
        <div class="demo-card-footer"><small title="本地参考图：${guide.referenceImage}">本地参考图 · ${guide.reference}</small><div class="demo-card-actions">${previewActionButtons}<button class="style-details-button" type="button" data-style-details="${guide.id}">查看要点</button><button class="copy-style-button" type="button" data-copy-style="${guide.id}" title="复制图片与提示词配置">复制配置</button></div></div>
      </div>
    </article>
  `;
  }).join("");
  resultCount.textContent = `${guides.length} 个案例`;
  emptyState.hidden = guides.length !== 0;
  gallery.querySelectorAll(".phone-preview-media img").forEach((image) => image.addEventListener("error", () => {
    const media = image.closest(".phone-preview-media");
    media?.classList.add("is-unavailable");
    image.remove();
  }, { once: true }));
  gallery.querySelectorAll("[data-copy-style]").forEach((button) => button.addEventListener("click", () => copyStyleMode(button)));
  gallery.querySelectorAll("[data-style-details]").forEach((button) => button.addEventListener("click", () => openStyleDetails(button.dataset.styleDetails)));
  gallery.querySelectorAll("[data-preview-id]").forEach((button) => button.addEventListener("click", () => openPreview(button.dataset.previewId, button.dataset.previewMode)));
  gallery.querySelectorAll("[data-tag]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setTagFilter(link.dataset.tag);
    track("tag_filter", { tag: link.dataset.tag, resultCount: getFilteredGuides().length });
  }));
}

function setPreviewMode(mode, shouldTrack = true) {
  const guide = activePreviewGuide;
  if (!guide) return;
  const modes = getPreviewModes(guide);
  const nextMode = modes.includes(mode) ? mode : (guide.video ? "video" : "image");
  const isImage = nextMode === "image";
  const isVideo = nextMode === "video";
  const isLiveDemo = nextMode === "live";
  const { width: phoneWidth, height: phoneHeight } = getPreviewDevice(guide, nextMode);
  const { width: displayWidth, height: displayHeight } = getLibraryPreviewDisplayDevice();
  activePreviewMode = nextMode;

  previewMediaFrame.style.setProperty("--preview-phone-ratio", `${displayWidth} / ${displayHeight}`);
  previewMediaFrame.style.setProperty("--preview-phone-ratio-value", displayWidth / displayHeight);
  previewMediaFrame.style.setProperty("--preview-source-width", `${phoneWidth}px`);
  previewMediaFrame.style.setProperty("--preview-source-height", `${phoneHeight}px`);
  [previewDialogVideo, previewDialogDemo].forEach((element) => {
    element.width = phoneWidth;
    element.height = phoneHeight;
  });

  previewDialogImage.hidden = !isImage;
  previewDialogVideo.hidden = !isVideo;
  previewDialogDemo.hidden = !isLiveDemo;
  previewMediaStatus.hidden = !isLiveDemo;
  previewMediaRetry.hidden = true;
  previewCursor.hidden = !isVideo;
  previewImageNavigation.hidden = !isImage || activePreviewImages.length < 2;
  previewCursor.classList.toggle("is-running", isVideo && !previewDialogVideo.paused);
  previewModeSwitch.querySelectorAll("button").forEach((button) => {
    const active = button.dataset.previewView === nextMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (isImage) {
    previewDialogVideo.pause();
    previewDialogDemo.src = "about:blank";
    previewDialogImage.hidden = false;
    previewMediaStatus.hidden = true;
    previewMediaStatus.classList.remove("is-error");
    showPreviewImage(activePreviewImageIndex);
  } else if (isVideo) {
    previewDialogDemo.src = "about:blank";
    previewDialogVideo.poster = getCardPoster(guide);
    previewDialogVideo.src = guide.video;
    previewDialogVideo.load();
    previewDialogVideo.play().catch(() => {});
  } else {
    previewDialogVideo.pause();
    window.clearTimeout(previewLoadTimer);
    previewMediaStatusText.textContent = "正在加载可点击 Demo...";
    previewMediaStatus.classList.remove("is-error");
    previewDialogDemo.title = `${guide.style} 可点击 Demo`;
    previewDialogDemo.src = getEmbeddedDemoUrl(guide);
    previewLoadTimer = window.setTimeout(() => {
      if (!activePreviewGuide || previewDialogDemo.hidden) return;
      previewMediaStatus.hidden = false;
      previewMediaStatusText.textContent = "Demo 加载超时，请重试或在新窗口打开。";
      previewMediaRetry.hidden = false;
      previewMediaStatus.classList.add("is-error");
    }, 8000);
    window.requestAnimationFrame(updateEmbeddedPreviewScale);
  }

  if (shouldTrack) track("preview_mode_change", { caseId: guide.id, mode: nextMode });
}

function openPreview(id, mode = "auto") {
  const guide = styleGuides.find((item) => item.id === id);
  if (!guide) return;
  activePreviewGuide = guide;
  activePreviewImages = getPreviewImages(guide);
  activePreviewImageIndex = 0;
  const modes = getPreviewModes(guide);
  const initialMode = mode === "auto" ? (guide.defaultPreviewMode || (guide.video ? "video" : (guide.liveDemo ? "live" : "image"))) : (modes.includes(mode) ? mode : modes[0]);

  previewDialogTitle.textContent = `${guide.name} · ${guide.style}`;
  previewDialogReference.textContent = guide.reference;
  previewMediaFrame.style.setProperty("--preview-media-bg", guide.preview);
  previewDialogOpenLive.hidden = !guide.liveDemo;
  if (guide.liveDemo) previewDialogOpenLive.href = guide.liveDemo;
  previewModeSwitch.innerHTML = modes.map((item) => `<button type="button" data-preview-view="${item}" aria-pressed="false">${previewModeLabels[item]}</button>`).join("");
  previewModeSwitch.hidden = modes.length < 2;
  previewModeSwitch.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => setPreviewMode(button.dataset.previewView)));

  previewDialog.showModal();
  setPreviewMode(initialMode, false);
  track(initialMode === "live" ? "live_demo_open" : "demo_preview_open", { caseId: guide.id, caseName: guide.name, mode: initialMode });
}

const infoPanels = {
  guide: {
    eyebrow: "IMAGE2 UI / GUIDE",
    title: "使用指南",
    intro: "从真实参考开始，把风格选择、图片资产与可点击界面连成一条可复用的工作流。",
    steps: [
      ["选择案例", "在案例库中查看统一 390×844 外框的效果图或 Demo 视频，打开风格详情，确认最接近的视觉方向。"],
      ["复制配置", "复制按钮会带出本地参考图路径、图像提示词、排版和组件原则。"],
      ["拆分实现", "把文字、按钮、导航、状态与常规图标放进代码；把照片、插画、纹理和产品图作为图片资产。"],
      ["连接本地资产", "把生成或选择的图片保存到项目目录，再接回页面中对应的视觉槽位。"],
      ["验证交付", "打开本地预览，检查点击路径、图片加载、移动端布局和 reduced-motion。"]
    ],
    callout: "开始时不需要写“做得更高级”。先选一个案例，再复制配置，沟通会准确得多。"
  },
  principles: {
    eyebrow: "IMAGE2 UI / PRINCIPLES",
    title: "项目原理",
    intro: "Image2 UI 的目标不是把截图压成一张图片，而是把可编辑、可交互的界面和真实视觉资产重新组合起来。",
    steps: [
      ["代码负责界面", "真实文本、按钮、输入、导航、状态栏、筛选控件和常规图标全部由代码渲染。"],
      ["图片负责视觉", "照片、产品、人物、插画、纹理、背景和缩略图使用真实本地图片资产。"],
      ["提示词可追溯", "每套风格保留本地参考图路径和提示词，避免下次又从模糊形容词开始。"],
      ["结构先于装饰", "先命名 top app bar、card grid、filter chips、detail dialog 等区域，再确定视觉表现。"],
      ["输出必须可用", "最终交付不是静态截图，而是可以打开、点击、修改并继续迭代的页面。"]
    ],
    callout: "图片不承担可读文字、导航或功能图标。这样界面才能保持清楚、可访问并且便于修改。"
  }
};

function openInfoPanel(id) {
  const panel = infoPanels[id];
  if (!panel) return;
  infoDialogContent.innerHTML = `<p class="kicker">${panel.eyebrow}</p><h2 id="infoDialogTitle">${panel.title}</h2><p>${panel.intro}</p><ol class="info-steps">${panel.steps.map((step, index) => `<li><b>0${index + 1}</b><div><strong>${step[0]}</strong><span>${step[1]}</span></div></li>`).join("")}</ol><p class="info-callout">${panel.callout}</p>`;
  infoDialog.showModal();
  track("info_panel_open", { panel: id });
}

function openStyleDetails(id) {
  const guide = styleGuides.find((item) => item.id === id);
  if (!guide) return;
  styleDialogContent.style.setProperty("--dialog-preview", guide.preview);
  const applicableBrands = getBrandProfiles(guide);
  styleDialogContent.innerHTML = `
    <div class="dialog-visual"><img src="${guide.referenceImage}" alt="${guide.style} 本地视觉参考图"></div>
    <div class="dialog-copy">
      <p class="kicker">${guide.name} / STYLE PROFILE</p>
      <h2 id="styleDialogTitle">${guide.style}</h2>
      <p class="dialog-intro">${guide.summary}</p>
      <dl class="dialog-facts">
        <div><dt>画面色彩</dt><dd>${guide.palette}</dd></div>
        <div><dt>页面节奏</dt><dd>${guide.layout}</dd></div>
        <div><dt>参考方向</dt><dd>${guide.reference}</dd></div>
        <div><dt>适用场景</dt><dd>${guide.bestFor}</dd></div>
      </dl>
      <p class="dialog-principle">${guide.recipe.principle}</p>
      <div class="dialog-recipe">
        <p><strong>图片：</strong>${guide.recipe.image}</p>
        <p><strong>排版：</strong>${guide.recipe.type}</p>
        <p><strong>组件：</strong>${guide.recipe.components}</p>
      </div>
      <div class="dialog-brand-profiles"><strong>适用品牌规范</strong><div>${applicableBrands.map((brand) => `<a href="./brands.html?brand=${encodeURIComponent(brand.id)}">${brand.name}</a>`).join("")}</div></div>
      <div class="dialog-actions"><button class="dialog-copy-button" type="button" data-copy-style="${guide.id}">复制图片与提示词配置</button>${applicableBrands[0] ? `<button class="dialog-copy-button dialog-brand-action" type="button" data-copy-brand="${applicableBrands[0].id}" data-case-id="${guide.id}">应用此品牌规范</button><button class="dialog-demo-link dialog-brand-action" type="button" data-copy-brand-prompt="${applicableBrands[0].id}">复制品牌 Prompt</button><button class="dialog-demo-link dialog-brand-action" type="button" data-download-brand-tokens="${applicableBrands[0].id}">生成 Design Tokens</button>` : ""}<button class="dialog-demo-link" type="button" data-preview-id="${guide.id}" data-preview-mode="image">查看效果图</button>${guide.video ? `<button class="dialog-demo-link" type="button" data-preview-id="${guide.id}" data-preview-mode="video">播放 Demo 视频</button>` : ""}${guide.liveDemo ? `<button class="dialog-demo-link" type="button" data-preview-id="${guide.id}" data-preview-mode="live">打开可点击 Demo</button>` : ""}</div>
    </div>`;
  styleDialogContent.querySelector("[data-copy-style]").addEventListener("click", (event) => copyStyleMode(event.currentTarget));
  styleDialogContent.querySelectorAll("[data-copy-brand]").forEach((button) => button.addEventListener("click", () => copyBrandApplication(button)));
  styleDialogContent.querySelectorAll("[data-copy-brand-prompt]").forEach((button) => button.addEventListener("click", () => copyBrandPrompt(button)));
  styleDialogContent.querySelectorAll("[data-download-brand-tokens]").forEach((button) => button.addEventListener("click", () => downloadBrandTokens(button)));
  styleDialogContent.querySelectorAll("[data-preview-id]").forEach((button) => button.addEventListener("click", (event) => {
    styleDialog.close();
    openPreview(event.currentTarget.dataset.previewId, event.currentTarget.dataset.previewMode);
  }));
  styleDialog.showModal();
  track("style_detail_open", { caseId: guide.id, caseName: guide.name });
}

window.image2BrandCatalog = { brandProfiles, buildBrandPrompt, buildBrandTokens };

async function copyBrandApplication(button) {
  const brand = brandProfiles.find((item) => item.id === button.dataset.copyBrand);
  const guide = styleGuides.find((item) => item.id === button.dataset.caseId);
  if (!brand || !guide) return;
  const text = [`应用品牌规范：${brand.name}`, `案例结构：${guide.name} / ${guide.style}`, "", buildBrandPrompt(brand), "", "输出 artifacts/brand-profile.json、artifacts/brand-tokens.json 和 artifacts/brand-compliance.md，并验证品牌规范未改变案例交互结构。"].join("\n");
  await copyTextWithFeedback(text, button, "已复制品牌应用指令");
}

async function copyBrandPrompt(button) {
  const brand = brandProfiles.find((item) => item.id === button.dataset.copyBrandPrompt);
  if (brand) await copyTextWithFeedback(buildBrandPrompt(brand), button, "品牌 Prompt 已复制");
}

function downloadBrandTokens(button) {
  const brand = brandProfiles.find((item) => item.id === button.dataset.downloadBrandTokens);
  if (!brand) return;
  const blob = new Blob([`${buildBrandTokens(brand)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${brand.id}-brand-tokens.json`;
  link.click();
  URL.revokeObjectURL(url);
  button.textContent = "已生成";
  window.setTimeout(() => { button.textContent = "生成 Design Tokens"; }, 1500);
}

async function copyTextWithFeedback(text, button, feedback) {
  const label = button.textContent;
  try { await navigator.clipboard.writeText(text); } catch { fallbackCopy(text); }
  button.textContent = feedback;
  window.setTimeout(() => { button.textContent = label; }, 1500);
}

async function copyStyleMode(button) {
  const guide = styleGuides.find((item) => item.id === button.dataset.copyStyle);
  if (!guide) return;
  const label = button.textContent;
  try { await navigator.clipboard.writeText(buildStyleMode(guide)); button.textContent = "已复制"; track("style_copy", { caseId: guide.id, caseName: guide.name }); }
  catch { fallbackCopy(buildStyleMode(guide)); button.textContent = "已复制"; track("style_copy", { caseId: guide.id, caseName: guide.name, method: "fallback" }); }
  window.setTimeout(() => { button.textContent = label; }, 1500);
}

function fallbackCopy(text) {
  const area = document.createElement("textarea"); area.value = text; area.style.position = "fixed"; area.style.opacity = "0"; document.body.append(area); area.select();
  if (!document.execCommand("copy")) throw new Error("Clipboard copy was blocked");
  area.remove();
}

categoryNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeCategory = button.dataset.filter;
  activeTag = "";
  const url = new URL(window.location.href);
  url.searchParams.delete("tag");
  window.history.pushState({ tag: "" }, "", url);
  categoryNav.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
  track("category_filter", { category: activeCategory });
  renderDemoGallery();
});
let searchTimer;
searchInput.addEventListener("input", () => {
  // A typed query searches the whole catalog; category/tag filters are useful
  // for browsing, but silently narrowing a search makes valid cases look lost.
  if (searchInput.value.trim() && (activeCategory !== "all" || activeTag)) {
    activeCategory = "all";
    activeTag = "";
    const url = new URL(window.location.href);
    url.searchParams.delete("tag");
    window.history.replaceState({ tag: "" }, "", url);
    categoryNav.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item.dataset.filter === "all"));
  }
  renderDemoGallery();
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    const query = searchInput.value.trim();
    if (query) track("library_search", { query, resultCount: getFilteredGuides().length });
  }, 600);
});
document.addEventListener("keydown", (event) => {
  if (previewDialog.open && activePreviewMode === "image" && activePreviewImages.length > 1) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPreviewImage(activePreviewImageIndex - 1);
      track("preview_image_change", { caseId: activePreviewGuide.id, direction: "previous", index: activePreviewImageIndex });
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showPreviewImage(activePreviewImageIndex + 1);
      track("preview_image_change", { caseId: activePreviewGuide.id, direction: "next", index: activePreviewImageIndex });
    }
    return;
  }
  if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
    searchInput.value = "";
    searchInput.blur();
    renderDemoGallery();
  }
});
document.querySelectorAll("a[href*='github.com']").forEach((link) => link.addEventListener("click", () => track("github_click", { location: link.className || "stats" })));
document.querySelectorAll("[data-info-panel]").forEach((button) => button.addEventListener("click", () => openInfoPanel(button.dataset.infoPanel)));
previewDialog.addEventListener("close", () => {
  window.clearTimeout(previewLoadTimer);
  previewDialogVideo.pause();
  previewDialogVideo.currentTime = 0;
  previewDialogVideo.removeAttribute("src");
  previewDialogImage.removeAttribute("src");
  previewDialogDemo.src = "about:blank";
  previewMediaStatus.hidden = true;
  previewMediaStatusText.textContent = "";
  previewMediaRetry.hidden = true;
  previewMediaStatus.classList.remove("is-error");
  previewCursor.hidden = true;
  previewCursor.classList.remove("is-running");
  previewImageNavigation.hidden = true;
  activePreviewMode = null;
  activePreviewImages = [];
  activePreviewImageIndex = 0;
  activePreviewGuide = null;
});
previewImagePrevious.addEventListener("click", () => {
  showPreviewImage(activePreviewImageIndex - 1);
  track("preview_image_change", { caseId: activePreviewGuide.id, direction: "previous", index: activePreviewImageIndex });
});
previewImageNext.addEventListener("click", () => {
  showPreviewImage(activePreviewImageIndex + 1);
  track("preview_image_change", { caseId: activePreviewGuide.id, direction: "next", index: activePreviewImageIndex });
});
previewDialogVideo.addEventListener("loadedmetadata", () => {
  previewMediaFrame.style.setProperty("--cursor-duration", `${Math.max(6, previewDialogVideo.duration)}s`);
});
previewDialogVideo.addEventListener("play", () => previewCursor.classList.add("is-running"));
previewDialogVideo.addEventListener("pause", () => previewCursor.classList.remove("is-running"));
previewDialogImage.addEventListener("error", () => {
  if (activePreviewGuide) showPreviewImageError(previewDialogImage, activePreviewGuide);
});
previewDialogDemo.addEventListener("load", () => {
  window.clearTimeout(previewLoadTimer);
  if (activePreviewGuide && !previewDialogDemo.hidden) previewMediaStatus.hidden = true;
});
previewDialogDemo.addEventListener("error", () => {
  window.clearTimeout(previewLoadTimer);
  previewMediaStatus.hidden = false;
  previewMediaStatusText.textContent = "Demo 加载失败，请重试或使用下方链接在新窗口打开。";
  previewMediaRetry.hidden = false;
  previewMediaStatus.classList.add("is-error");
});
previewMediaRetry.addEventListener("click", () => {
  if (activePreviewGuide) setPreviewMode("live", false);
});

[styleDialog, previewDialog, infoDialog].forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));

window.addEventListener("popstate", () => {
  activeTag = readTagFromUrl();
  activeCategory = "all";
  categoryNav.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item.dataset.filter === "all"));
  renderDemoGallery();
});

function updateGitHubStars(count) {
  if (!Number.isFinite(count)) return false;
  const stars = new Intl.NumberFormat("zh-CN").format(count);
  githubStars.textContent = stars;
  githubStarsNav.textContent = stars;
  return true;
}

async function loadGitHubStars() {
  try {
    const response = await fetch(githubApiUrl, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
    if (!updateGitHubStars(Number((await response.json()).stargazers_count))) throw new Error("Missing star count");
  } catch {
    try {
      const response = await fetch(githubStarsFallbackUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Star fallback returned ${response.status}`);
      if (!updateGitHubStars(Number((await response.json()).value))) throw new Error("Missing fallback star count");
    } catch {
      githubStars.textContent = "--";
      githubStarsNav.textContent = "--";
    }
  }
}

updateCatalogCounts();
activeTag = readTagFromUrl();
renderDemoGallery();
loadGitHubStars();
track("library_view", { referrer: document.referrer || "direct" });
