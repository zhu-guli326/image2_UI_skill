const FIELD_WEIGHTS = Object.freeze({
  id: 12,
  aliases: 11,
  name: 10,
  style: 9,
  tags: 8,
  bestFor: 7,
  layout: 6,
  reference: 5,
  summary: 4,
  palette: 3,
  category: 3,
  prompt: 2,
  recipe: 2,
});

const SEARCH_STOPWORDS = new Set([
  "app", "apps", "ui", "ux", "demo", "style", "case", "cases", "example", "examples",
  "案例", "应用", "界面", "页面", "风格", "设计案例",
]);

// Search terms are deliberately curated. They describe user intent without
// making every commerce or wellness case match every broad category word.
const TERM_GROUPS = [
  ["女装", "女服", "女式", "女性服饰", "女士服装", "服装", "服饰", "时装", "成衣", "穿搭", "衣服", "fashion", "clothing", "apparel", "womenswear", "women's fashion"],
  ["电商", "购物", "零售", "商城", "商品", "commerce", "shopping", "retail"],
  ["食品", "餐食", "食物", "餐饮", "food", "meal", "nutrition"],
  ["烘焙", "面包", "糕点", "bakery", "baking"],
  ["咖啡", "咖啡店", "咖啡馆", "coffee", "cafe"],
  ["健康", "健康管理", "康复", "wellness", "health", "wellbeing"],
  ["情绪", "心情", "心理", "反思", "emotion", "mood", "mental health", "reflection"],
  ["旅行", "旅游", "出行", "目的地", "trip", "travel", "journey", "destination"],
  ["音乐", "播放", "播放器", "流媒体", "music", "player", "streaming"],
  ["充电", "电动车", "新能源", "电车", "ev", "electric vehicle", "charging", "charger"],
  ["习惯", "打卡", "习惯养成", "日常记录", "habit", "tracker", "routine", "check-in"],
  ["扫描", "识别", "分析", "scanner", "scan", "analysis"],
  ["美术馆", "画廊", "展览", "策展", "museum", "gallery", "exhibition", "curation"],
  ["插画", "手绘", "线稿", "illustration", "illustrated", "hand drawn"],
  ["新闻", "资讯", "报刊", "阅读", "news", "editorial", "reading"],
  ["笔记", "手账", "创意工具", "notes", "notebook", "creative tool"],
  ["暗色", "深色", "黑色", "dark", "dark mode"],
];

const CATEGORY_LABELS = Object.freeze({
  culture: ["文化", "文化内容", "艺术", "culture"],
  commerce: ["零售", "电商", "购物", "商业", "commerce"],
  editorial: ["新闻", "阅读", "编辑", "editorial"],
  travel: ["旅行", "旅游", "出行", "travel"],
  creative: ["创意", "工具", "创意工具", "creative"],
  wellness: ["健康", "陪伴", "健康陪伴", "wellness"],
});

// These are terms a person may type even when the case copy uses a more
// specific product description. Keep them attached to a case so they remain
// explainable and easy to extend as the library grows.
const GUIDE_ALIASES = Object.freeze({
  fashion: ["女装", "女装购物", "女装电商", "women's fashion", "fashion shopping"],
  "still-form": ["女装", "女装购物", "服装设计", "衣服", "穿搭", "clothing store", "apparel", "fashion clothing"],
  fufu: ["咖啡店", "咖啡馆", "coffee shop", "cafe", "baking"],
  organique: ["健康餐", "营养餐", "meal plan", "healthy food"],
  cleanbite: ["食品扫描", "营养扫描", "food scanner", "ingredient scanner"],
  "plate-play": ["烹饪", "厨房", "cooking", "recipe"],
  fithub: ["健身", "训练", "workout", "fitness"],
  "volt-route": ["电动车充电", "新能源充电", "ev charging", "electric car"],
  moe: ["习惯追踪", "习惯打卡", "habit tracker", "routine tracker"],
  "relay-music": ["音乐播放器", "音乐流媒体", "music player", "music streaming", "now playing"],
  museum: ["博物馆", "美术馆导览", "museum guide", "gallery guide"],
  notebook: ["创意工作台", "笔记工具", "creative workspace", "note taking"],
  loy: ["情绪仪表盘", "睡眠记录", "mood tracker", "sleep tracker"],
  "softly-reflections": ["情绪反思", "心理签到", "reflection journal", "mood check-in"],
});

const ALIAS_PHRASE_INDEX = new Map();
for (const [guideId, aliases] of Object.entries(GUIDE_ALIASES)) {
  for (const alias of aliases) {
    const key = compactSearchText(alias);
    const guideIds = ALIAS_PHRASE_INDEX.get(key) || [];
    if (!guideIds.includes(guideId)) guideIds.push(guideId);
    ALIAS_PHRASE_INDEX.set(key, guideIds);
  }
}

const synonymIndex = new Map();
for (const group of TERM_GROUPS) {
  const normalized = group.map((term) => ({ term, key: compactSearchText(term) }));
  for (const item of normalized) synonymIndex.set(item.key, normalized.map(({ term }) => term));
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .replace(/[\u2010-\u2015\u2212_+/|&,，。！？、；：·•()[\]{}<>《》“”\"…]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(value) {
  return normalizeSearchText(value).replace(/\s/g, "");
}

function tokenizeSearchText(value) {
  return normalizeSearchText(value).match(/[a-z0-9]+|[\u3400-\u9fff]+/g) || [];
}

function queryTokens(value) {
  return tokenizeSearchText(value).filter((token) => !SEARCH_STOPWORDS.has(token));
}

function flattenValues(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  if (typeof value === "object") return Object.values(value).flatMap(flattenValues);
  return [String(value)];
}

function fieldValues(guide) {
  const recipe = flattenValues(guide.recipe).join(" ");
  const categoryLabels = CATEGORY_LABELS[guide.category] || [];
  return {
    id: guide.id,
    aliases: GUIDE_ALIASES[guide.id] || [],
    name: guide.name,
    style: guide.style,
    tags: guide.tags,
    bestFor: guide.bestFor,
    layout: guide.layout,
    reference: guide.reference,
    summary: guide.summary,
    palette: guide.palette,
    category: [guide.category, ...categoryLabels],
    prompt: guide.prompt,
    recipe,
  };
}

function buildSearchDocument(guide) {
  const values = fieldValues(guide);
  const fields = Object.entries(values).map(([key, value]) => {
    const text = flattenValues(value).join(" ");
    return {
      key,
      text,
      normalized: normalizeSearchText(text),
      compact: compactSearchText(text),
      tokens: tokenizeSearchText(text),
    };
  });
  return { guide, fields, compact: fields.map((field) => field.compact).join(" ") };
}

function expandedTerms(term) {
  const key = compactSearchText(term);
  return synonymIndex.get(key) || [term];
}

function phraseVariants(query) {
  const compact = compactSearchText(query);
  const variants = new Set([query, compact]);
  const aliases = synonymIndex.get(compact);
  aliases?.forEach((alias) => variants.add(alias));
  for (const aliasList of Object.values(GUIDE_ALIASES)) {
    for (const alias of aliasList) {
      if (compactSearchText(alias) === compact) variants.add(alias);
    }
  }
  return [...variants].map(compactSearchText).filter(Boolean);
}

function levenshteinWithin(left, right, limit) {
  if (Math.abs(left.length - right.length) > limit) return false;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let rowMinimum = row;
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      const value = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + cost);
      current[column] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > limit) return false;
    previous = current;
  }
  return previous[right.length] <= limit;
}

function fuzzyLatinMatch(term, field) {
  if (!/^[a-z0-9]+$/.test(term) || term.length < 4) return false;
  const limit = term.length >= 7 ? 2 : 1;
  return field.tokens.some((token) => /^[a-z0-9]+$/.test(token) && levenshteinWithin(term, token, limit));
}

function matchTerm(document, term) {
  let best = null;
  for (const variant of expandedTerms(term)) {
    const compactVariant = compactSearchText(variant);
    if (!compactVariant) continue;
    for (const field of document.fields) {
      if (field.compact.includes(compactVariant)) {
        const score = FIELD_WEIGHTS[field.key] * (compactVariant === field.compact ? 1.35 : 1);
        if (!best || score > best.score) best = { score, exact: true };
      } else if (fuzzyLatinMatch(compactVariant, field)) {
        const score = FIELD_WEIGHTS[field.key] * 0.55;
        if (!best || score > best.score) best = { score, exact: false };
      }
    }
  }
  return best;
}

function scoreGuide(document, query) {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = queryTokens(normalizedQuery);
  if (!tokens.length) return null;

  const phraseHit = phraseVariants(normalizedQuery).some((variant) => document.compact.includes(variant));
  const aliasPhraseGuides = ALIAS_PHRASE_INDEX.get(compactSearchText(normalizedQuery));
  if (aliasPhraseGuides?.length && !aliasPhraseGuides.includes(document.guide.id)) return null;
  const matches = tokens.map((token) => matchTerm(document, token));
  const meaningfulPhraseHit = phraseHit && (tokens.length === 1 || matches.every((match) => match?.exact));
  if (!meaningfulPhraseHit && matches.some((match) => !match)) return null;

  const score = matches.reduce((total, match) => total + (match?.score || 0), 0) + (meaningfulPhraseHit ? 42 : 0);
  return { score, exactMatches: matches.filter((match) => match?.exact).length };
}

export function searchGuides(guides, query) {
  const list = Array.isArray(guides) ? guides : [];
  if (!normalizeSearchText(query)) return [...list];

  return list
    .map((guide, index) => ({ guide, index, document: buildSearchDocument(guide) }))
    .map(({ guide, index, document }) => {
      const result = scoreGuide(document, query);
      return result ? { guide, index, ...result } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || right.exactMatches - left.exactMatches || left.index - right.index)
    .map(({ guide }) => guide);
}

export { normalizeSearchText, compactSearchText };
