//静态导入本地化翻译模块
import zh_CN from "./zh_CN.js";

//翻译列表
const translations = {
  zh_CN,
};

const defaultLang = "zh_CN";
const currentLang = chrome.i18n.getMessage("@@ui_locale");
const targetTrans = translations[currentLang] || translations[defaultLang];

function merge(a, b) {
  const c = Object.assign({}, a);
  for (let key in b) {
    if (typeof b[key] === "object") {
      c[key] = merge(c[key], b[key]);
    } else {
      c[key] = b[key];
    }
  }
  return Object.freeze(c);
}

export default merge(translations[defaultLang], targetTrans);
