const content = document.querySelector("#documentContent, #markdownContent");
const documentName = document.querySelector("#documentName");
const documentPath = document.querySelector("#documentPath");
const query = new URLSearchParams(window.location.search);
const configuredDocument = window.image2Documents?.[query.get("doc") || ""];
const requestedFile = configuredDocument?.source?.replace(/^\.\//, "") || query.get("file") || "README.md";
const markdownLocaleStrings = window.image2LocaleStrings || {
  invalidPath: "Invalid document path",
  loadFailed: "Unable to load document",
  retry: "Return to the library and try again.",
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function safeDocumentPath(value) {
  const path = String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
  if (!path.endsWith(".md") || path.split("/").some((part) => part === ".." || part === ".")) return null;
  return path;
}

function documentUrl(file) {
  return new URL(`./${file}`, window.location.href);
}

function resolveHref(href, file) {
  const value = String(href || "").trim();
  if (!value || value.startsWith("#")) return value;
  if (/^(?:mailto:|tel:|javascript:)/i.test(value)) return "#";
  if (/^https?:\/\//i.test(value)) return value;
  try {
    const resolved = new URL(value, documentUrl(file));
    if (resolved.pathname.endsWith(".md")) {
      const target = safeDocumentPath(resolved.pathname.replace(/^\/+/, ""));
      return target ? `./markdown.html?file=${encodeURIComponent(target)}${resolved.hash}` : "#";
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch { return "#"; }
}

function resolveImage(src, file) {
  try {
    const resolved = new URL(src, documentUrl(file));
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch { return ""; }
}

function inlineMarkdown(value, file) {
  const tokens = [];
  const stash = (html) => `\u0000${tokens.push(html) - 1}\u0000`;
  let text = escapeHtml(value);
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)/g, (_, alt, src, title) => stash(`<img src="${escapeHtml(resolveImage(src, file))}" alt="${alt}"${title ? ` title="${escapeHtml(title)}"` : ""}>`));
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)/g, (_, label, href, title) => {
    const target = resolveHref(href, file);
    const external = /^https?:\/\//i.test(target);
    return stash(`<a href="${escapeHtml(target)}"${title ? ` title="${escapeHtml(title)}"` : ""}${external ? ' target="_blank" rel="noreferrer"' : ""}>${label}</a>`);
  });
  text = text.replace(/`([^`]+)`/g, (_, code) => stash(`<code>${code}</code>`));
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/_([^_]+)_/g, "<em>$1</em>");
  text = text.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)] || "");
  return text;
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function renderMarkdown(source, file) {
  const lines = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const output = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (/^```/.test(line.trim())) {
      const language = line.trim().slice(3).trim();
      index += 1;
      const code = [];
      while (index < lines.length && !/^```/.test(lines[index].trim())) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      output.push(`<pre><code class="language-${escapeHtml(language)}">${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^#{1,6}\s+/.test(line)) {
      const match = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
      const level = match[1].length;
      const heading = inlineMarkdown(match[2], file);
      output.push(`<h${level} id="heading-${output.length}">${heading}</h${level}>`);
      index += 1;
      continue;
    }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { output.push("<hr>"); index += 1; continue; }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ""));
      output.push(`<blockquote>${renderMarkdown(quote.join("\n"), file)}</blockquote>`);
      continue;
    }
    if (index + 1 < lines.length && line.includes("|") && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim() && lines[index].includes("|")) rows.push(splitTableRow(lines[index++]));
      output.push(`<div class="markdown-table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${inlineMarkdown(cell, file)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((_, cellIndex) => `<td>${inlineMarkdown(row[cellIndex] || "", file)}</td>`).join("")}`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      const pattern = ordered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/;
      while (index < lines.length && pattern.test(lines[index])) items.push(lines[index++].match(pattern)[1]);
      output.push(`<${ordered ? "ol" : "ul"}>${items.map((item) => `<li>${inlineMarkdown(item, file)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^```|^#{1,6}\s+|^\s*>|^\s*[-*+]\s+|^\s*\d+[.)]\s+/.test(lines[index]) && !(lines[index].includes("|") && isTableSeparator(lines[index + 1] || ""))) paragraph.push(lines[index++].trim());
    output.push(`<p>${inlineMarkdown(paragraph.join("\n").replace(/\n/g, " "), file)}</p>`);
  }
  return output.join("\n");
}

async function loadDocument() {
  const file = safeDocumentPath(requestedFile);
  if (!file) throw new Error(markdownLocaleStrings.invalidPath);
  if (documentName) documentName.textContent = configuredDocument?.title || file.split("/").pop().replace(/\.md$/i, "");
  if (documentPath) documentPath.textContent = file;
  const response = await fetch(`./${file}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${markdownLocaleStrings.loadFailed} (${response.status})`);
  content.innerHTML = renderMarkdown(await response.text(), file);
  document.title = `${documentName?.textContent || file} · IMAGE2 UI`;
}

loadDocument().catch((error) => {
  content.innerHTML = `<p class="error-state">${escapeHtml(error.message)}. ${escapeHtml(markdownLocaleStrings.retry)}</p>`;
});
