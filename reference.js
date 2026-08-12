const documentCatalog = window.image2Documents || {};
const documentQuery = new URLSearchParams(window.location.search);
const requestedDocument = documentQuery.get("doc") || "ui-section-vocabulary";
const documentDefinition = documentCatalog[requestedDocument];
const requestedLanguage = documentQuery.get("lang");
const supportedLanguages = documentDefinition?.locales ? Object.keys(documentDefinition.locales) : [];
const activeLanguage = supportedLanguages.includes(requestedLanguage)
  ? requestedLanguage
  : documentDefinition?.defaultLocale || supportedLanguages[0] || "en";
const activeDocument = documentDefinition?.locales?.[activeLanguage];

const localeStrings = {
  zh: {
    htmlLang: "zh-CN",
    loading: "正在加载文档...",
    invalidPath: "文档路径无效",
    loadFailed: "文档加载失败",
    retry: "请返回案例库后重试。",
  },
  en: {
    htmlLang: "en",
    loading: "Loading document...",
    invalidPath: "Invalid document path",
    loadFailed: "Unable to load document",
    retry: "Return to the library and try again.",
  },
};

const strings = localeStrings[activeLanguage] || localeStrings.en;
document.documentElement.lang = strings.htmlLang;
window.image2LocaleStrings = strings;
window.image2Documents = activeDocument ? { [requestedDocument]: activeDocument } : {};

if (!requestedLanguage && supportedLanguages.length > 1) {
  const localizedUrl = new URL(window.location.href);
  localizedUrl.searchParams.set("lang", activeLanguage);
  window.history.replaceState(null, "", localizedUrl);
}

document.querySelectorAll("[data-label-zh][data-label-en]").forEach((element) => {
  element.textContent = element.dataset[`label${activeLanguage === "zh" ? "Zh" : "En"}`];
});

const loadingState = document.querySelector(".loading-state");
if (loadingState) loadingState.textContent = strings.loading;

const languageSwitch = document.querySelector("#languageSwitch");
if (languageSwitch) {
  languageSwitch.hidden = supportedLanguages.length < 2;
  languageSwitch.innerHTML = supportedLanguages.map((language) => {
    const selected = language === activeLanguage;
    const label = language === "zh" ? "中文" : "English";
    return `<button type="button" data-language="${language}" aria-pressed="${selected}">${label}</button>`;
  }).join("");
  languageSwitch.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.language === activeLanguage) return;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("doc", requestedDocument);
      nextUrl.searchParams.set("lang", button.dataset.language);
      window.location.assign(nextUrl);
    });
  });
}
