const vocabDetails = {
  页头: { english: "Header / App Bar", detail: "页头位于页面最上方。这里用品牌标志和个人入口告诉用户“我在哪”，也提供常用操作。" },
  标题区: { english: "Value Proposition", detail: "标题区先给出核心价值，再用短说明告诉用户这个页面能帮他完成什么。" },
  主视觉: { english: "Hero Visual", detail: "主视觉用核心照片或插画快速传达主题，不读文字也能大致理解页面内容。" },
  主按钮: { english: "Primary CTA", detail: "主按钮代表页面最希望用户执行的动作，应该使用清楚、直接的行动文案。" },
  底部导航: { english: "Bottom Navigation", detail: "底部导航固定放置几个主要页面入口，让用户能在核心功能之间快速切换。" }
};

const caseStudies = {
  fufu: {
    reference: "./demo/fufu-bakery/assets/reference-overview.png",
    referenceAlt: "FuFu Bakery 烘焙会员应用原始参考图",
    image: "./demo/fufu-bakery/mobile-preview.png",
    alt: "FuFu Bakery 手绘烘焙会员最终可点击页面",
    structure: "欢迎页、烘焙首页、今日菜单和会员卡组成轻量门店流程。",
    assets: "狗狗烘焙师插画和烘焙氛围参考图。",
    controls: ["进入按钮", "菜单切换", "会员卡", "底部导航"],
    demo: "./demo/fufu-bakery/index.html",
    prompt: "使用 image-to-ui-skill，参考我上传的手绘烘焙会员应用图片，保留狗狗烘焙师、纸白留白、黄色按钮和底部导航结构，生成欢迎页、烘焙首页、今日菜单和会员卡可点击手机页面，并检查进入按钮、菜单切换与底部导航交互。"
  },
  plate: {
    reference: "./demo/plate-play/assets/reference-overview.png",
    referenceAlt: "Plate Play 食谱应用原始参考图",
    image: "./demo/plate-play/mobile-preview.png",
    alt: "Plate Play 食谱最终可点击页面",
    structure: "首页介绍、食谱列表和食谱详情形成从发现到烹饪的流程。",
    assets: "厨师主插画和食物照片。",
    controls: ["食谱分类", "收藏按钮", "底部导航"],
    demo: "./demo/plate-play/index.html",
    prompt: "使用 image-to-ui-skill，参考我上传的食谱应用图片，保留高彩插画、主行动按钮和食谱卡片结构，生成首页、食谱列表和详情三个可点击手机页面，并检查收藏与导航交互。"
  },
  relay: {
    reference: "./demo/relay-music/assets/reference-overview.png",
    referenceAlt: "RELAY 音乐应用原始参考图",
    image: "./demo/relay-music/assets/relay-effect-board.png",
    alt: "RELAY 音乐发现最终可点击页面",
    structure: "艺人主页、正在播放和音乐发现流分别承担介绍、播放和继续探索。",
    assets: "艺人摄影、专辑封面和内容缩略图。",
    controls: ["播放控制", "收藏按钮", "页面切换"],
    demo: "./demo/relay-music/index.html",
    prompt: "使用 image-to-ui-skill，参考我上传的音乐应用图片，保留编辑式摄影、深色播放器和发现流结构，生成艺人主页、播放页和发现页三个可点击手机页面，并检查播放与收藏状态。"
  }
};

const tokenPresets = {
  image2: { color: "#b8f36b", font: "system", radius: 14, space: 8 },
  signal: { color: "#91d8ee", font: "mono", radius: 4, space: 6 },
  editorial: { color: "#ff9f8f", font: "serif", radius: 0, space: 12 },
  friendly: { color: "#f3cf55", font: "rounded", radius: 24, space: 10 }
};

const fontStacks = {
  system: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  rounded: 'ui-rounded, "Arial Rounded MT Bold", ui-sans-serif, sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
  serif: 'Georgia, "Times New Roman", serif'
};

function copyText(text, statusElement, message) {
  const fallback = () => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  const task = navigator.clipboard?.writeText ? navigator.clipboard.writeText(text) : Promise.resolve(fallback());
  task.then(() => { statusElement.textContent = message; }).catch(() => {
    fallback();
    statusElement.textContent = message;
  });
}

const quickPrompt = document.querySelector("#quickPrompt");
document.querySelector("#copyQuickPrompt")?.addEventListener("click", () => {
  copyText(quickPrompt.textContent.trim(), document.querySelector("#copyStatus"), "Prompt 已复制，可以和参考图一起发送。" );
  window.image2Analytics?.track("beginner_prompt_copy", { source: "quick_start" });
});

const casePanel = document.querySelector("#casePanel");
let activeCase = "fufu";
function renderCase(id) {
  const item = caseStudies[id];
  activeCase = id;
  document.querySelector("#caseReferenceImage").src = item.reference;
  document.querySelector("#caseReferenceImage").alt = item.referenceAlt;
  document.querySelector("#caseImage").src = item.image;
  document.querySelector("#caseImage").alt = item.alt;
  document.querySelector("#caseStructure").textContent = item.structure;
  document.querySelector("#caseAssets").textContent = item.assets;
  document.querySelector("#caseControls").innerHTML = item.controls.map((control) => `<span>${control}</span>`).join("");
  document.querySelector("#caseDemoLink").href = item.demo;
}

const caseTabs = [...document.querySelectorAll("[data-case]")];
caseTabs.forEach((button, index) => {
  button.addEventListener("click", () => {
    caseTabs.forEach((tab) => {
      const selected = tab === button;
      tab.classList.toggle("is-selected", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    casePanel.setAttribute("aria-labelledby", button.id);
    renderCase(button.dataset.case);
  });
  button.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    caseTabs[(index + direction + caseTabs.length) % caseTabs.length].click();
    caseTabs[(index + direction + caseTabs.length) % caseTabs.length].focus();
  });
});

document.querySelector("#copyCasePrompt")?.addEventListener("click", () => {
  copyText(caseStudies[activeCase].prompt, document.querySelector("#caseCopyStatus"), "同款结构 Prompt 已复制。" );
  window.image2Analytics?.track("beginner_prompt_copy", { source: "case_study", case: activeCase });
});

const vocabDetail = document.querySelector("#vocabDetail");
const vocabName = document.querySelector("#vocabName");
const vocabEnglish = document.querySelector("#vocabEnglish");
document.querySelectorAll("[data-vocab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-vocab]").forEach((item) => {
      const selected = item.dataset.vocab === button.dataset.vocab;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    const item = vocabDetails[button.dataset.vocab];
    vocabName.textContent = button.dataset.vocab;
    vocabEnglish.textContent = item.english;
    vocabDetail.textContent = item.detail;
  });
});

const brandPreset = document.querySelector("#brandPreset");
const brandColor = document.querySelector("#brandColor");
const brandColorValue = document.querySelector("#brandColorValue");
const displayFont = document.querySelector("#displayFont");
const cardRadius = document.querySelector("#cardRadius");
const radiusValue = document.querySelector("#radiusValue");
const spaceUnit = document.querySelector("#spaceUnit");
const spacingValue = document.querySelector("#spacingValue");
const brandPreview = document.querySelector("#brandPreview");
const tokenStatus = document.querySelector("#tokenStatus");

function currentTokens() {
  return {
    "--brand-primary": brandColor.value,
    "--font-display": displayFont.value,
    "--card-radius": `${cardRadius.value}px`,
    "--space-unit": `${spaceUnit.value}px`
  };
}

function tokensAsCss() {
  const tokens = currentTokens();
  return `:root {\n${Object.entries(tokens).map(([name, value]) => `  ${name}: ${name === "--font-display" ? `"${value}"` : value};`).join("\n")}\n}`;
}

function renderTokens() {
  brandColorValue.textContent = brandColor.value.toLowerCase();
  radiusValue.textContent = `${cardRadius.value}px`;
  spacingValue.textContent = `${spaceUnit.value}px`;
  brandPreview.style.setProperty("--preview-primary", brandColor.value);
  brandPreview.style.setProperty("--preview-font", fontStacks[displayFont.value]);
  brandPreview.style.setProperty("--preview-radius", `${cardRadius.value}px`);
  brandPreview.style.setProperty("--preview-space", `${spaceUnit.value}px`);
}

function applyPreset(name) {
  const preset = tokenPresets[name] || tokenPresets.image2;
  brandColor.value = preset.color;
  displayFont.value = preset.font;
  cardRadius.value = preset.radius;
  spaceUnit.value = preset.space;
  renderTokens();
}

brandPreset?.addEventListener("change", () => { applyPreset(brandPreset.value); tokenStatus.textContent = "品牌规范已应用到预览。"; });
[brandColor, displayFont, cardRadius, spaceUnit].forEach((control) => control?.addEventListener("input", () => { brandPreset.value = "image2"; renderTokens(); tokenStatus.textContent = ""; }));
document.querySelector("#resetTokens")?.addEventListener("click", () => { brandPreset.value = "image2"; applyPreset("image2"); tokenStatus.textContent = "已恢复默认规范。"; });
document.querySelector("#copyTokens")?.addEventListener("click", () => copyText(tokensAsCss(), tokenStatus, "Design Tokens 已复制。"));
document.querySelector("#saveBrand")?.addEventListener("click", () => {
  localStorage.setItem("image2-custom-brand-tokens", JSON.stringify(currentTokens()));
  tokenStatus.textContent = "自定义品牌已保存在此浏览器。";
});

try {
  const savedTokens = JSON.parse(localStorage.getItem("image2-custom-brand-tokens"));
  if (savedTokens) {
    brandColor.value = savedTokens["--brand-primary"] || brandColor.value;
    displayFont.value = savedTokens["--font-display"] || displayFont.value;
    cardRadius.value = Number.parseInt(savedTokens["--card-radius"], 10) || cardRadius.value;
    spaceUnit.value = Number.parseInt(savedTokens["--space-unit"], 10) || spaceUnit.value;
  }
} catch {}
renderTokens();

const learningMapLinks = [...document.querySelectorAll("[data-learn-section]")];
const learningSections = learningMapLinks.map((link) => document.querySelector(`#${link.dataset.learnSection}`)).filter(Boolean);
if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const visibleEntry = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visibleEntry) return;
    learningMapLinks.forEach((link) => {
      const isCurrent = link.dataset.learnSection === visibleEntry.target.id;
      link.classList.toggle("is-current", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }, { rootMargin: "-28% 0px -58%", threshold: [0, .2, .5] });
  learningSections.forEach((section) => sectionObserver.observe(section));
}

const progressBar = document.querySelector("#pageProgressBar");
function updateProgress() {
  const available = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = `${available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0}%`;
}
window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

window.image2Analytics?.track("beginner_guide_view");
