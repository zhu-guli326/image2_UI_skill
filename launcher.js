const styles = {
  museum: {
    name: "画册式留白",
    caseName: "ArtMuse",
    path: "./assets/cases/museum-app/library-preview-2x.png",
    direction: "纸张白、低饱和展签色、细线与大量留白；像展览画册，内容优先，图片少裁切，排版克制清晰。",
  },
  fashion: {
    name: "编辑式电商",
    caseName: "Vestra",
    path: "./assets/cases/fashion-shopping-app/library-preview-2x.png",
    direction: "大幅人物或单品主视觉、柔和色调和宽松留白；让商品成为主角，购物控件轻量而清楚。",
  },
  plate: {
    name: "高彩插画",
    caseName: "Plate Play",
    path: "./demo/plate-play/screenshots/library-preview-2x.png",
    direction: "明亮撞色、粗黑线描和扁平插画；画面活泼但文字、按钮和导航保持真实、清晰、可编辑。",
  },
  carry: {
    name: "冷感产品陈列",
    caseName: "Carry Bag",
    path: "./demo/carry-bag/screenshots/library-preview-2x.png",
    direction: "冰灰背景、克制产品摄影与一处荧光操作色；用明确层级分开产品质感和购买动作。",
  },
  fithub: {
    name: "动感运动",
    caseName: "FitHub",
    path: "./demo/fithub/screenshots/library-preview-2x.png",
    direction: "强对比运动摄影、紧凑数据和清晰训练节奏；动效服务进度、选择与反馈。",
  },
  custom: {
    name: "跟随参考图",
    caseName: "自定义",
    path: "",
    direction: "以用户附加的参考图为唯一主要视觉方向，不套用案例预设；保留原图构图、层级和视觉语言。",
  },
};

const formats = {
  mobile: { name: "手机 App", instruction: "做成移动端 App 原型；使用稳定的 9:16 设计画布并适配窄屏。" },
  web: { name: "响应式网页", instruction: "做成响应式网页；覆盖桌面和移动布局，不把移动端做成缩小的桌面版。" },
  dashboard: { name: "产品后台", instruction: "做成工作型产品后台；信息密度稳定，优先扫描、比较和重复操作效率。" },
  desktop: { name: "桌面应用", instruction: "做成桌面应用界面；使用清晰的窗口、侧栏和多面板层级。" },
};

const interactions = {
  single: "单屏状态：所有明显控件可点击，并至少包含选中、切换或反馈状态。",
  path: "关键路径：实现 2-4 个关键页面或状态，主要操作可以完整走通。",
  complete: "完整流程：实现用户自然期待的主要页面、空态、加载、错误和完成反馈。",
};

const channels = {
  auto: "自动选择当前可用的 image2 通道，并在最终汇报中记录实际通道。",
  native: "只使用原生 image2；如果不可用，停止并准确说明缺口。",
  fallback: "优先原生 image2，不可用时允许使用项目备案通道，并记录实际通道。",
};

const form = document.querySelector("#launcherForm");
const brief = document.querySelector("#projectBrief");
const briefCount = document.querySelector("#briefCount");
const fileInput = document.querySelector("#referenceFile");
const uploadZone = document.querySelector("#uploadZone");
const referencePreview = document.querySelector("#referencePreview");
const referenceImage = document.querySelector("#referenceImage");
const referenceName = document.querySelector("#referenceName");
const referenceSize = document.querySelector("#referenceSize");
const removeReference = document.querySelector("#removeReference");
const deviceFrameRow = document.querySelector("#deviceFrameRow");
const promptOutput = document.querySelector("#promptOutput");
const selectionSummary = document.querySelector("#selectionSummary");
const handoffNote = document.querySelector("#handoffNote");
const copyPrompt = document.querySelector("#copyPrompt");
const resetForm = document.querySelector("#resetForm");
const toast = document.querySelector("#toast");
const intentDialog = document.querySelector("#intentDialog");
const intentDialogStatus = document.querySelector("#intentDialogStatus");
const track = (name, properties) => window.image2Analytics?.track(name, properties);
let selectedFile = null;
let objectUrl = "";
let toastTimer = 0;
let selectedIntent = "";

const intents = Object.freeze({
  explore: { label: "探索并理解代码", instruction: "先分析现有代码、界面结构、视觉资产和交互路径；除非我继续要求，否则不要修改代码。" },
  build: { label: "构建新功能、应用或工具", instruction: "完成效果图、代码 UI、图片资产、可点击交互与浏览器验证。" },
  review: { label: "审查代码并提出修改建议", instruction: "以代码审查方式检查正确性、视觉还原、交互、可访问性、回归风险和测试缺口，先报告问题，不要直接修改。" },
  fix: { label: "修复问题和失败", instruction: "复现并定位问题根因，实施范围明确的修复，然后运行相关检查并报告验证结果。" },
});

function readIntentFromUrl() {
  const value = new URL(window.location.href).searchParams.get("intent") || "";
  return intents[value] ? value : "";
}

function persistIntent(intent) {
  selectedIntent = intent;
  try { localStorage.setItem("image2-ui-intent", intent); } catch {}
  const url = new URL(window.location.href);
  url.searchParams.delete("start");
  url.searchParams.set("intent", intent);
  window.history.replaceState({ ...window.history.state, intent }, "", url);
  intentDialog.querySelectorAll("[data-intent]").forEach((button) => {
    const active = button.dataset.intent === intent;
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updatePrompt();
}

function openIntentDialog() {
  if (intentDialog.open) return;
  intentDialogStatus.textContent = "选择后会把任务方向写入调用指令。";
  intentDialog.showModal();
  track("launcher_intent_open", { source: new URL(window.location.href).searchParams.has("start") ? "skill" : "manual" });
}

function selectedValue(name) {
  return form.elements[name].value;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function updateFilePreview(file) {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = "";
  selectedFile = file || null;
  if (!selectedFile) {
    referencePreview.hidden = true;
    uploadZone.hidden = false;
    referenceImage.removeAttribute("src");
    fileInput.value = "";
    updatePrompt();
    return;
  }

  objectUrl = URL.createObjectURL(selectedFile);
  referenceImage.src = objectUrl;
  referenceName.textContent = selectedFile.name;
  referenceSize.textContent = formatBytes(selectedFile.size);
  referencePreview.hidden = false;
  uploadZone.hidden = true;
  updatePrompt();
}

function buildPrompt() {
  const formatKey = selectedValue("format");
  const styleKey = selectedValue("style");
  const workflow = selectedValue("workflow");
  const interaction = selectedValue("interaction");
  const channel = form.elements.channel.value;
  const deviceFrame = form.elements.deviceFrame.checked;
  const generateAssets = form.elements.generateAssets.checked;
  const screenshots = form.elements.screenshots.checked;
  const project = brief.value.trim() || "根据我接下来提供的内容，设计并实现一个结构完整、可继续修改的界面。";
  const style = styles[styleKey];
  const referenceLine = selectedFile
    ? `我会把参考图「${selectedFile.name}」与这条指令一起附上，请先分析这张图。`
    : styleKey === "custom"
      ? "我暂时没有附参考图，请先根据项目内容提出一个明确视觉方向再继续。"
      : `使用本地案例 ${style.caseName} 作为视觉参考：${style.path}`;
  const workflowLine = workflow === "full"
    ? "严格执行：参考输入 -> 生成并保存完整效果图 -> 检查效果图 -> 从效果图拆分 code-ui 与 image2-assets -> 实现可点击 UI。"
    : "我明确要求跳过完整效果图生成，直接分析参考输入并实现可点击 UI；仍需区分 code-ui 与 image2-assets。";
  const frameLine = formatKey === "mobile"
    ? deviceFrame
      ? "包含完整 iOS 设备外框、状态栏、安全区和顶部开孔；所有系统 glyph 用代码渲染。"
      : "不展示设备外框，但保留移动端安全区、触摸目标和稳定画布。"
    : "不添加手机设备外框。";
  const assetLine = generateAssets
    ? `复杂视觉资产使用 image2 生成并接回页面。${channels[channel]}`
    : "不额外生成复杂位图资产；使用现有本地素材或纯代码布局，并明确说明这一限制。";
  const screenshotLine = screenshots
    ? "完成后用浏览器实际点击主要路径，并提供桌面与移动验收截图。"
    : "完成后至少运行构建、破图和主要交互检查，不要求额外产出验收截图。";

  const intentLine = selectedIntent ? `\n- 任务方向：${intents[selectedIntent].label}。${intents[selectedIntent].instruction}\n` : "";
  return `使用 $image-to-ui-skill 完成下面的任务，直接执行，不要只给方案。${intentLine}\n项目：${project}\n\n配置：\n- 交付形式：${formats[formatKey].name}。${formats[formatKey].instruction}\n- 参考输入：${referenceLine}\n- 视觉方向：${style.name}。${style.direction}\n- 制作流程：${workflowLine}\n- 交互深度：${interactions[interaction]}\n- 设备呈现：${frameLine}\n- 图片资产：${assetLine}\n- 验收：${screenshotLine}\n\n所有可读文字、按钮、导航、表单、状态栏和普通图标必须由代码渲染；明显控件必须可点击或有明确反馈。最终给出可打开的预览入口、效果图与生成资产路径、实际 image2 通道和检查结果。`;
}

function updatePrompt() {
  const formatKey = selectedValue("format");
  const styleKey = selectedValue("style");
  const workflow = selectedValue("workflow");
  const interaction = selectedValue("interaction");
  promptOutput.textContent = buildPrompt();
  briefCount.textContent = String(brief.value.length);
  selectionSummary.innerHTML = [
    formats[formatKey].name,
    styles[styleKey].name,
    workflow === "full" ? "完整效果图流程" : "快速实现",
    interaction === "single" ? "单屏状态" : interaction === "path" ? "关键路径" : "完整流程",
  ].map((item) => `<span>${item}</span>`).join("");

  const mobile = formatKey === "mobile";
  deviceFrameRow.classList.toggle("is-disabled", !mobile);
  form.elements.deviceFrame.disabled = !mobile;
  handoffNote.textContent = selectedFile
    ? `复制后回到 Codex 粘贴，并同时附上「${selectedFile.name}」。`
    : "复制后回到 Codex 直接粘贴即可。";
  handoffNote.classList.toggle("has-reference", Boolean(selectedFile));
  try {
    localStorage.setItem("image2-ui-launcher", JSON.stringify({
      brief: brief.value,
      format: formatKey,
      style: styleKey,
      workflow,
      interaction,
      deviceFrame: form.elements.deviceFrame.checked,
      generateAssets: form.elements.generateAssets.checked,
      screenshots: form.elements.screenshots.checked,
      channel: form.elements.channel.value,
    }));
  } catch {}
}

function restoreState() {
  try {
    const state = JSON.parse(localStorage.getItem("image2-ui-launcher") || "null");
    if (!state) return;
    brief.value = state.brief || "";
    for (const name of ["format", "style", "workflow", "interaction"]) {
      if (state[name] && form.elements[name]) form.elements[name].value = state[name];
    }
    for (const name of ["deviceFrame", "generateAssets", "screenshots"]) {
      if (typeof state[name] === "boolean") form.elements[name].checked = state[name];
    }
    if (state.channel) form.elements.channel.value = state.channel;
  } catch {}
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2200);
}

async function copyText() {
  const text = promptOutput.textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(promptOutput);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
  }
  copyPrompt.textContent = "已复制";
  showToast(selectedFile ? "指令已复制，记得同时附上参考图" : "已复制调用指令");
  window.setTimeout(() => { copyPrompt.textContent = "复制调用指令"; }, 1800);
  track("launcher_prompt_copy", { format: selectedValue("format"), style: selectedValue("style") });
}

form.addEventListener("input", updatePrompt);
form.addEventListener("change", updatePrompt);
fileInput.addEventListener("change", () => updateFilePreview(fileInput.files[0]));
removeReference.addEventListener("click", () => updateFilePreview(null));
copyPrompt.addEventListener("click", copyText);
intentDialog.querySelectorAll("[data-intent]").forEach((button) => button.addEventListener("click", () => {
  const intent = button.dataset.intent;
  persistIntent(intent);
  intentDialogStatus.textContent = `已选择“${intents[intent].label}”。`;
  track("launcher_intent_select", { intent });
  window.setTimeout(() => intentDialog.close(), 260);
}));
intentDialog.addEventListener("click", (event) => { if (event.target === intentDialog) intentDialog.close(); });
resetForm.addEventListener("click", () => {
  form.reset();
  brief.value = "";
  updateFilePreview(null);
  try { localStorage.removeItem("image2-ui-launcher"); } catch {}
  updatePrompt();
  showToast("已恢复默认配置");
  track("launcher_reset");
});

for (const eventName of ["dragenter", "dragover"]) {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.add("is-dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.remove("is-dragging");
  });
}
uploadZone.addEventListener("drop", (event) => {
  const file = [...event.dataTransfer.files].find((item) => item.type.startsWith("image/"));
  if (file) updateFilePreview(file);
  else showToast("请选择图片文件");
});
window.addEventListener("beforeunload", () => { if (objectUrl) URL.revokeObjectURL(objectUrl); });

restoreState();
selectedIntent = readIntentFromUrl();
if (!selectedIntent) {
  try { const saved = localStorage.getItem("image2-ui-intent"); selectedIntent = intents[saved] ? saved : ""; } catch {}
}
updatePrompt();
track("launcher_page_view");
if (new URL(window.location.href).searchParams.get("start") === "1") openIntentDialog();
