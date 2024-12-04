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

const langMap = merge(translations[defaultLang], targetTrans);

/**
 * 从 本地化语言对象里查找指定路径属性的值
 * @param {string} propPath 属性路径，用点分隔
 * @returns
 */
export default function (propPath) {
  // 如果propPath不是字符串
  if (typeof propPath !== "string") {
    return `bad propPath: ${propPath}`;
  }
  /** 属性路径数组 */
  const properties = propPath.split(".");
  /** 最后一个属性名 */
  const lastProperty = properties.pop();
  let target = langMap;
  // 遍历属性路径数组，获取目标对象
  for (const propName of properties) {
    if (!target[propName]) {
      return `propPath not found: ${propPath}`;
    }
    target = target[propName];
  }
  const result = target[lastProperty] ?? `target is null or undefined: ${propPath}`;
  return result;
}
