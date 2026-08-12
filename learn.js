const vocabDetails = {
  页头: "页头在页面最上方。这里放品牌名，让用户一眼知道自己正在使用哪个产品。",
  主视觉: "主视觉是最先吸引注意的画面。Buddy 用彩色目的地和旅行插画，让用户马上联想到旅行计划。",
  标题区: "标题区用一句主标题和一小段说明，直接告诉用户这个页面能帮助他做什么。",
  主按钮: "主按钮代表页面最希望用户执行的动作。这里的 Get started 就是在邀请用户开始规划。",
  底部导航: "底部导航把几个最常用的页面放在一起。用户可以从探索切换到行程或个人页面。"
};

const caseStudies = {
  buddy: {
    image: "./demo/buddy-travel/mobile-preview.png",
    alt: "Buddy 旅行计划案例预览",
    caption: "案例库 · Buddy / 轻盈旅行计划",
    task: "帮助用户从一个目的地开始安排旅行",
    structure: "顶部品牌名，中间主视觉和目的地标签，底部是三项主导航。",
    tags: ["HTML：标题与导航", "CSS：荧光黄背景与圆形标签", "JS：目的地点击反馈"],
    question: "你可以先问自己：如果删掉图片，这个页面的任务还说得清吗？"
  },
  plate: {
    image: "./demo/plate-play/mobile-preview.png",
    alt: "Plate Play 食谱案例预览",
    caption: "案例库 · Plate Play / 高彩插画食谱",
    task: "让用户快速找到一个想做的食谱并开始烹饪",
    structure: "顶部标题和说明，中间厨师插画与主按钮，底部用导航切换首页、食谱和收藏。",
    tags: ["HTML：食谱标题与列表", "CSS：色块、圆角和响应式布局", "JS：分类与收藏状态"],
    question: "你可以先问自己：哪个元素最应该先被看到？为什么？"
  },
  relay: {
    image: "./demo/relay-music/assets/relay-effect-board.png",
    alt: "RELAY 音乐发现案例预览",
    caption: "案例库 · RELAY / 编辑式音乐发现",
    task: "让用户发现一位艺人、播放音乐并继续探索",
    structure: "三屏分别承担艺人主页、播放页和发现流，摄影负责吸引注意，播放器负责行动。",
    tags: ["HTML：艺人信息与播放控制", "CSS：冷灰展板和深色内容面", "JS：播放、收藏与页面切换"],
    question: "你可以先问自己：这三个页面为什么要拆开，而不是塞在一屏？"
  }
};

const caseImage = document.querySelector("#caseImage");
const caseCaption = document.querySelector("#caseCaption");
const caseTask = document.querySelector("#caseTask");
const caseStructure = document.querySelector("#caseStructure");
const caseTags = document.querySelector("#caseTags");
const caseQuestion = document.querySelector("#caseQuestion");
document.querySelectorAll("[data-case]").forEach((button) => {
  button.addEventListener("click", () => {
    const item = caseStudies[button.dataset.case];
    document.querySelectorAll("[data-case]").forEach((tab) => {
      const selected = tab === button;
      tab.classList.toggle("is-selected", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
    caseImage.src = item.image;
    caseImage.alt = item.alt;
    caseCaption.textContent = item.caption;
    caseTask.textContent = item.task;
    caseStructure.textContent = item.structure;
    caseTags.innerHTML = item.tags.map((tag) => `<span>${tag}</span>`).join("");
    caseQuestion.textContent = item.question;
  });
});

const vocabDetail = document.querySelector("#vocabDetail");
const vocabName = document.querySelector("#vocabName");
document.querySelectorAll("[data-vocab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-vocab]").forEach((item) => {
      const selected = item.dataset.vocab === button.dataset.vocab;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    vocabName.textContent = button.dataset.vocab;
    vocabDetail.textContent = vocabDetails[button.dataset.vocab];
  });
});

const learningCard = document.querySelector("#learningCard");
const codeColor = document.querySelector("#codeColor");
const previewFeedback = document.querySelector("#previewFeedback");
const colorNames = { "#b8f36b": "绿色", "#91d8ee": "蓝色", "#ff9f8f": "珊瑚色" };
document.querySelectorAll("[data-color]").forEach((button) => {
  button.addEventListener("click", () => {
    const color = button.dataset.color;
    learningCard.style.background = color;
    codeColor.textContent = color;
    document.querySelectorAll("[data-color]").forEach((item) => item.classList.toggle("is-active", item === button));
    learningCard.classList.remove("is-changing");
    requestAnimationFrame(() => learningCard.classList.add("is-changing"));
    previewFeedback.textContent = `你把卡片改成了${colorNames[color]}。这就是一次 CSS 调整。`;
  });
});

const learningMapLinks = [...document.querySelectorAll("[data-learn-section]")];
const learningSections = learningMapLinks
  .map((link) => document.querySelector(`#${link.dataset.learnSection}`))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const visibleEntry = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visibleEntry) return;
    learningMapLinks.forEach((link) => {
      const isCurrent = link.dataset.learnSection === visibleEntry.target.id;
      link.classList.toggle("is-current", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }, { rootMargin: "-28% 0px -58%", threshold: [0, 0.2, 0.5] });

  learningSections.forEach((section) => sectionObserver.observe(section));
}

window.image2Analytics?.track("beginner_guide_view");
