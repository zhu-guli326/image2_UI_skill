import { vocabularyCategories, vocabularyEntries, vocabularyById } from "./vocabulary-data.js";

const STORAGE_KEY = "image2-ui-vocabulary-favorites";
const state = {
  query: "",
  category: "all",
  sort: "recommended",
  favorites: new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")),
};

const $ = (selector) => document.querySelector(selector);
const categoryChips = $("#categoryChips");
const taxonomyNav = $("#taxonomyNav");
const entryGrid = $("#entryGrid");
const resultCount = $("#resultCount");
const resultsSummary = $("#resultsSummary");
const emptyState = $("#emptyState");
const termDialog = $("#termDialog");
const termDialogContent = $("#termDialogContent");
const toast = $("#toast");

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));

function persistFavorites() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.favorites]));
}

function categoryLabel(id) {
  return vocabularyCategories.find((category) => category.id === id)?.label || "词条";
}

function matches(entry) {
  if (state.category === "favorites" && !state.favorites.has(entry.id)) return false;
  if (state.category !== "all" && state.category !== "favorites" && entry.category !== state.category) return false;
  const query = state.query.trim().toLocaleLowerCase();
  if (!query) return true;
  const haystack = [entry.name, entry.en, entry.ask, entry.definition, entry.role, entry.tags.join(" "), entry.anatomy.flat().join(" ")].join(" ").toLocaleLowerCase();
  return haystack.includes(query);
}

function filteredEntries() {
  const list = vocabularyEntries.filter(matches);
  if (state.sort === "az") return [...list].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (state.sort === "category") return [...list].sort((a, b) => `${a.category}${a.name}`.localeCompare(`${b.category}${b.name}`, "zh-CN"));
  if (state.sort === "favorites") return [...list].sort((a, b) => Number(state.favorites.has(b.id)) - Number(state.favorites.has(a.id)) || a.name.localeCompare(b.name, "zh-CN"));
  return list;
}

function renderCategories() {
  const html = vocabularyCategories.map((category) => {
    const selected = state.category === category.id;
    const count = category.id === "favorites" ? state.favorites.size : category.id === "all" ? vocabularyEntries.length : vocabularyEntries.filter((entry) => entry.category === category.id).length;
    return `<button class="category-chip${selected ? " is-selected" : ""}" type="button" data-category="${category.id}" aria-pressed="${selected}"><span>${category.label}</span><b>${count}</b></button>`;
  }).join("");
  categoryChips.innerHTML = html;
  taxonomyNav.innerHTML = html.replaceAll("category-chip", "taxonomy-link");
  [...document.querySelectorAll("[data-category]")].forEach((button) => button.addEventListener("click", () => {
    state.category = button.dataset.category;
    render();
  }));
}

function previewMarkup(entry) {
  return `<div class="entry-visual"><img src="${escapeHtml(entry.example.src)}" alt="${escapeHtml(entry.example.alt)}" loading="lazy"><div class="visual-label"><span>${escapeHtml(entry.en)}</span><span>${escapeHtml(entry.category === "visual" ? "VISUAL" : "UI ROLE")}</span></div></div>`;
}

function cardMarkup(entry) {
  const favorite = state.favorites.has(entry.id);
  return `<article class="entry-card" data-entry-id="${escapeHtml(entry.id)}">
    <button class="entry-card-hitarea" type="button" data-open-term="${escapeHtml(entry.id)}" aria-label="查看 ${escapeHtml(entry.name)} 详情"></button>
    ${previewMarkup(entry)}
    <div class="entry-card-body">
      <div class="entry-card-meta"><span>${escapeHtml(categoryLabel(entry.category))}</span><button class="favorite-button${favorite ? " is-favorite" : ""}" type="button" data-favorite="${escapeHtml(entry.id)}" aria-pressed="${favorite}" aria-label="${favorite ? "取消收藏" : "收藏"}${escapeHtml(entry.name)}" title="${favorite ? "取消收藏" : "收藏"}">${favorite ? "★" : "☆"}</button></div>
      <h3>${escapeHtml(entry.name)} <em>${escapeHtml(entry.en)}</em></h3>
      <p class="entry-ask">“${escapeHtml(entry.ask)}”</p>
      <p class="entry-definition">${escapeHtml(entry.definition)}</p>
      <div class="entry-tags">${entry.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="entry-card-footer"><span>查看 anatomy、变体和 prompt</span><span aria-hidden="true">↗</span></div>
    </div>
  </article>`;
}

function renderEntries() {
  const list = filteredEntries();
  entryGrid.innerHTML = list.map(cardMarkup).join("");
  emptyState.hidden = list.length > 0;
  resultCount.textContent = `${list.length} 条`;
  resultsSummary.textContent = state.query ? `“${state.query}”匹配 ${list.length} 个词条` : state.category === "favorites" ? `你收藏了 ${list.length} 个词条` : `${categoryLabel(state.category)} · ${list.length} 个词条`;
  document.querySelectorAll("[data-open-term]").forEach((button) => button.addEventListener("click", () => openTerm(button.dataset.openTerm)));
  document.querySelectorAll("[data-favorite]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    const id = button.dataset.favorite;
    if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
    persistFavorites();
    render();
    showToast(state.favorites.has(id) ? "已加入收藏" : "已取消收藏");
  }));
}

function render() {
  renderCategories();
  renderEntries();
  $("#entryCount").textContent = vocabularyEntries.length;
}

function listMarkup(items, className = "detail-list") {
  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function tableMarkup(rows, headings) {
  return `<div class="detail-table-wrap"><table><thead><tr>${headings.map((heading) => `<th>${escapeHtml(heading)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function openTerm(id) {
  const entry = vocabularyById[id];
  if (!entry) return;
  const favorite = state.favorites.has(entry.id);
  termDialogContent.innerHTML = `<div class="term-detail">
    <div class="detail-topline"><span>${escapeHtml(categoryLabel(entry.category))} · ${escapeHtml(entry.level)}</span><button class="favorite-detail-button" type="button" data-detail-favorite="${escapeHtml(entry.id)}" aria-pressed="${favorite}">${favorite ? "★ 已收藏" : "☆ 收藏词条"}</button></div>
    <h2 id="termDialogTitle">${escapeHtml(entry.name)} <em>${escapeHtml(entry.en)}</em></h2>
    <div class="detail-tags">${entry.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    <blockquote class="detail-ask">“${escapeHtml(entry.ask)}”</blockquote>
    <p class="detail-definition"><strong>${escapeHtml(entry.definition)}</strong> ${escapeHtml(entry.role)}</p>
    <figure class="detail-figure"><img src="${escapeHtml(entry.example.src)}" alt="${escapeHtml(entry.example.alt)}"><figcaption>${escapeHtml(entry.example.caption)}</figcaption></figure>
    <div class="detail-columns">
      <section><h3>组成结构 · Anatomy</h3>${tableMarkup(entry.anatomy, ["部件", "它负责什么"])}</section>
      <section><h3>常见变体 · Variants</h3>${tableMarkup(entry.variants, ["变体", "什么时候用"])}</section>
    </div>
    <div class="detail-columns">
      <section><h3>状态与响应式</h3>${tableMarkup(entry.states, ["状态", "实现提示"])}</section>
      <section><h3>什么时候用 / 不用</h3><h4>适合</h4>${listMarkup(entry.useWhen)}<h4>不要硬用</h4>${listMarkup(entry.avoidWhen)}</section>
    </div>
    <section class="split-panel"><div><h3>code-ui</h3>${listMarkup(entry.codeUI, "compact-list")}</div><div><h3>image2-assets</h3>${listMarkup(entry.image2, "compact-list")}</div></section>
    <section class="prompt-panel"><div class="prompt-heading"><h3>你可以这样告诉 AI Agent</h3><button class="copy-prompt-button" type="button" data-copy-prompt="${escapeHtml(entry.id)}">复制 prompt</button></div><pre id="prompt-${escapeHtml(entry.id)}"><code>${escapeHtml(entry.prompt)}</code></pre></section>
    <section class="confusion-panel"><h3>容易混淆</h3><p>${escapeHtml(entry.confusedWith)}</p><p class="related-terms"><strong>相关词：</strong>${entry.related.map((related) => vocabularyById[related] ? `<button type="button" data-related-term="${escapeHtml(related)}">${escapeHtml(vocabularyById[related].name)}</button>` : "").join(" ")}</p></section>
    <footer class="detail-footer"><a href="${escapeHtml(entry.source)}" target="_blank" rel="noreferrer">查看权威出处 ↗</a><span>本地案例图 · 文字与控件由代码实现</span></footer>
  </div>`;
  termDialogContent.scrollTop = 0;
  if (!termDialog.open) termDialog.showModal();
  $("[data-detail-favorite]").addEventListener("click", () => {
    if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
    persistFavorites();
    openTerm(id);
    render();
  });
  document.querySelectorAll("[data-copy-prompt]").forEach((button) => button.addEventListener("click", () => copyPrompt(button.dataset.copyPrompt)));
  document.querySelectorAll("[data-related-term]").forEach((button) => button.addEventListener("click", () => openTerm(button.dataset.relatedTerm)));
}

async function copyPrompt(id) {
  const prompt = vocabularyById[id]?.prompt;
  if (!prompt) return;
  try { await navigator.clipboard.writeText(prompt); } catch { const area = document.createElement("textarea"); area.value = prompt; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); }
  showToast("Agent prompt 已复制");
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
}

$("#vocabularySearch").addEventListener("input", (event) => { state.query = event.target.value; renderEntries(); });
$("#sortSelect").addEventListener("change", (event) => { state.sort = event.target.value; renderEntries(); });
$("#clearSearch").addEventListener("click", () => { state.query = ""; state.category = "all"; $("#vocabularySearch").value = ""; render(); });
$("#themeToggle").addEventListener("click", () => { document.documentElement.classList.toggle("dark-mode"); localStorage.setItem("image2-ui-vocab-theme", document.documentElement.classList.contains("dark-mode") ? "dark" : "light"); });
if (localStorage.getItem("image2-ui-vocab-theme") === "dark") document.documentElement.classList.add("dark-mode");
document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#vocabularySearch").focus(); } if (event.key === "Escape" && !termDialog.open) { state.query = ""; $("#vocabularySearch").value = ""; renderEntries(); } });

render();
