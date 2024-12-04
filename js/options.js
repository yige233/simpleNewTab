import { html, Messenger, ImageSearch, Dialog, Table, StorageByCache } from "./util.js";
import i18n from "./lang/main.js";
import PICTURE from "./pictures.js";
import { Config } from "./config.js";

/** 数据存储 */
export const STORAGE = new StorageByCache("cache-storage");
/** 完整的config对象 */
const CONFIG = await Config.init();
/** 只包含设置的config对象 */
const config = CONFIG.config;
/** 图片相关 */
const Pictures = PICTURE.init(config.apis);
/** 侧栏目录 */
const sideIndexElem = document.querySelector(".side-index");
/** 主要内容 */
const mainContentElem = document.querySelector(".main-content");
/** 删除便签对话框 */
const dialogDeleteNote = new Dialog(i18n("note.delete.question"));
/** 便签信息同步 */
const noteSync = new Messenger("noteSync");

/**
 * 如果target是函数，则执行并返回其返回值；否则返回其自身
 * @param {any} target 一个任意对象
 * @returns
 */
function execFunction(target) {
  if (typeof target == "function") return target();
  return target;
}
/**
 * 如果cancel为false，就将element的背景色设为红色（警告色），反之则清除背景色
 * @param {Element} element 元素
 * @param {boolean} cancel 是否取消警告
 */
function errorAlert(element, cancel = false) {
  if (cancel) {
    return (element.style.backgroundColor = "");
  }
  element.style.backgroundColor = "#ff4136";
}
/**
 * 为页面添加项目。
 * @param {string} id 项目id
 * @param {string} name 项目名称
 * @param {string} desc 项目介绍
 * @param {Array} contentElem 项目内部元素列表
 */
function addItem({ id, name, desc, contentElem = [] }) {
  contentElem = contentElem.map((i) => execFunction(i));
  const sideElem = html("div", html("a", { class: "pseudo button", href: `#${id}` }, name));
  const mainElem = html("div", { id }, html("h2", name), desc && html("p", desc), ...contentElem);
  sideIndexElem.append(sideElem);
  mainContentElem.append(mainElem);
}
/**
 * 创建单选框。
 * @param {string} desc 单选框功能介绍
 * @param {string} checked 是否已勾选
 * @param {Function} onChange 勾选状态改变时的回调函数
 * @returns
 */
function checkbox(desc, checked, onChange = () => null) {
  const check = html("input", { type: "checkbox", checked: checked ? true : undefined }, { input: () => onChange(check.checked) });
  return html("label", html("span", desc), check, html("span", { class: "checkable" }));
}
/**
 * 创建输入框。
 * @param {any} attributes 输入框的属性
 * @param {string} config 输入框对应的配置项
 * @returns
 */
function inputElement(attributes, config) {
  const configValue = CONFIG.$(config);
  attributes.value = configValue;
  const input = html("input", attributes, { input: () => CONFIG.$(config, attributes.type == "number" ? parseInt(input.value) : input.value) });
  return input;
}
/**
 * 创建选择框。
 * @param {any} attributes 选择框属性
 * @param {string} config 选择框对应的配置项
 * @param {any} options 选择框的子选项键值对
 * @returns
 */
function selectElement(attributes, config, options) {
  const configValue = CONFIG.$(config);
  attributes.value = configValue;
  const select = html("select", attributes, { input: () => CONFIG.$(config, select.value) });
  for (const option in options) {
    const optionElem = html("option", { value: option, selected: config == option ? true : undefined }, options[option]);
    select.append(optionElem);
  }
  return select;
}
/**
 * 创建文字输入区域
 * @param {any} attribute textarea的属性
 * @param {string} config 对应的配置项。不需要就使用undefined
 * @param {function} valueCheck 保存输入框内容前，对输入框内容进行检查的回调。传入原始输入框的值
 * @returns
 */
function textareaELem(attribute, config, valueCheck = (value) => value) {
  const listeners = {
    input: () => {
      const value = valueCheck(textarea.value);
      CONFIG.$(config, value);
    },
  };
  const textarea = html("textarea", attribute, listeners, attribute.value);
  return textarea;
}

/**
 * 创建一个按钮
 * @param {*} type 按钮类型
 * @param {*} text 按钮文字
 * @param {*} onClick 按钮点击事件
 * @returns
 */
function buttonElement(type, text, onClick = () => null) {
  return html("button", { class: type }, { click: onClick }, text);
}
/**
 * 创建一个卡片
 * @param {element} header 卡片头部元素
 * @param  {...element} contentElem 卡片内容元素
 * @returns
 */
function card(header, ...contentElem) {
  contentElem = contentElem.map((i) => execFunction(i));
  return html("article", { class: "card" }, header && html("header", execFunction(header)), ...contentElem);
}

/**
 * 添加一个便签项目
 * @param {any} note 便签数据
 */
function addItemNote(note) {
  const noteId = note.id;
  async function saveNote() {
    if (!config.notes.includes(noteId)) return;
    await STORAGE.set(`notes/${noteId}`, note);
  }
  addItem({
    id: noteId,
    name: note.title,
    contentElem: [
      card(undefined, () => {
        const table = new Table(i18n("note.id"), noteId);
        const titleElem = html("input", { value: note.title }, { input: () => saveNote((note.title = titleElem.value)) });
        const colorElem = html("input", { type: "color", value: note.color }, { input: () => saveNote((note.color = colorElem.value)) });
        const fontColorElem = html("input", { type: "color", value: note.fontColor }, { input: () => saveNote((note.fontColor = fontColorElem.value)) });
        const fontSizeELem = html("input", { type: "number", min: 0, step: 1, value: note.fontSize }, { input: () => saveNote((note.fontSize = fontSizeELem.value)) });
        const opacityElem = html("input", { type: "number", min: 0, step: 1, value: note.opacity }, { input: () => saveNote((note.opacity = opacityElem.value)) });
        const contentElem = html("textarea", { style: "width:100%;height:200px" }, { input: () => saveNote((note.content = contentElem.value)) }, note.content);
        table.add(i18n("note.title"), titleElem);
        table.add(i18n("note.color"), colorElem);
        table.add(i18n("note.fontColor"), fontColorElem);
        table.add(i18n("note.fontSize"), fontSizeELem);
        table.add(i18n("note.opacity"), opacityElem);
        table.add(i18n("note.content"), contentElem);
        table.add(i18n("note.size.desc"), () => {
          const inputH = html(
            "input",
            { type: "number", min: 0, step: 1, value: note.size[0], placeholder: i18n("note.size.height") },
            { input: () => saveNote((note.size = [inputH.value, inputW.value])) }
          );
          const inputW = html(
            "input",
            { type: "number", min: 0, step: 1, value: note.size[1], placeholder: i18n("note.size.width") },
            { input: () => saveNote((note.size = [inputH.value, inputW.value])) }
          );
          return html("div", inputH, inputW);
        });
        table.add(i18n("note.position.desc"), () => {
          const inputL = html(
            "input",
            { type: "number", min: 0, step: 1, value: note.position[0], placeholder: i18n("note.position.left") },
            { input: () => saveNote((note.position = [inputL.value, inputT.value])) }
          );
          const inputT = html(
            "input",
            { type: "number", min: 0, step: 1, value: note.position[1], placeholder: i18n("note.position.top") },
            { input: () => saveNote((note.position = [inputL.value, inputT.value])) }
          );
          return html("div", inputL, inputT);
        });
        table.add(
          i18n("note.delete.desc"),
          html(
            "div",
            buttonElement("error", i18n("note.delete.btn"), () => {
              dialogDeleteNote.on("ok", async () => noteSync.emit("delete", { tabId: 0, noteId }));
              dialogDeleteNote.show();
            })
          )
        );
        return table.table;
      }),
    ],
  });
}

(() => {
  const tableList = new Table(
    i18n("config.api.api.type"),
    i18n("config.api.current"),
    html("span", { "data-tooltip": i18n("config.api.api.weight.desc") }, i18n("config.api.api.weight.name")),
    html("span", { "data-tooltip": i18n("config.api.api.config.desc") }, i18n("config.api.api.config.name")),
    ""
  );
  function addEntry(apiAddr) {
    const apiIndex = () => config.apis.findIndex((i) => i.api == apiAddr);
    const api = config.apis[apiIndex()];
    const weightElem = inputElement({ type: "number", min: 0, step: 1 }, `config.apis.${apiIndex()}.weight`);
    const configElem = textareaELem({ style: "height:150px;", value: JSON.stringify(api.config, null, 4) }, `config.apis.${apiIndex()}.config`, (value) => {
      try {
        errorAlert(configElem, true);
        return JSON.parse(value);
      } catch {
        errorAlert(configElem);
      }
    });
    const buttonElemCreator = (entryId) =>
      buttonElement("error", i18n("config.api.delete"), () => {
        CONFIG.save(config.apis.splice(apiIndex(), 1));
        tableList.remove(entryId);
      });
    tableList.add(api.type, html("a", { href: api.api, target: "_blank" }, api.api), weightElem, configElem, buttonElemCreator);
  }
  addItem({
    id: "api",
    name: i18n("config.api.name"),
    desc: i18n("config.api.desc"),
    contentElem: [
      card(html("h3", i18n("config.api.current")), () => {
        for (const api of config.apis) {
          addEntry(api.api);
        }
        return tableList.table;
      }),
      card(html("h3", i18n("config.api.add.name")), () => {
        const tableNew = new Table(i18n("config.api.api.type"), i18n("config.api.add.desc"), i18n("config.api.api.weight.name"), "");
        const selectElem = selectElement({ style: "max-width:200px;" }, undefined, Object.fromEntries([...Pictures.adapters.keys()].map((i) => [i, i])));
        const newApiElem = html("input");
        const weightElem = html("input", { type: "number", value: 10, step: 1, min: 0 });
        const button = buttonElement("success", i18n("config.api.add.name"), () => {
          try {
            const url = new URL(newApiElem.value);
            if (!["http:", "https:"].includes(url.protocol)) throw "bad protocol";
            if (config.apis.find((i) => i.api == url.href)) throw "duplicated";
            const newApi = {
              api: url.href,
              weight: Number(weightElem.value).toFixed() || 10,
              type: selectElem.value,
              config: {},
            };
            errorAlert(newApiElem, true);
            CONFIG.save(config.apis.push(newApi));
            addEntry(newApi.api);
          } catch (err) {
            errorAlert(newApiElem);
          }
        });
        tableNew.add(selectElem, newApiElem, weightElem, button);
        return tableNew.table;
      }),
    ],
  });
})();

addItem({
  id: "background-color",
  name: i18n("config.bgColor.name"),
  desc: i18n("config.bgColor.desc"),
  contentElem: [card(undefined, html("div", i18n("config.bgColor.change"), inputElement({ type: "color" }, "config.bgColor")))],
});
addItem({
  id: "wallpaler-dragging",
  name: i18n("config.dragSetting.name"),
  desc: i18n("config.dragSetting.desc"),
  contentElem: [
    card(
      html("h3", i18n("config.dragSetting.enabled.name")),
      checkbox(i18n("config.dragSetting.enabled.status"), CONFIG.$("config.allowDrag"), (checked) => CONFIG.$("config.allowDrag", checked))
    ),
    card(html("h3", i18n("config.dragSetting.senstive.name")), html("div", i18n("config.dragSetting.senstive.desc"), inputElement({ type: "number", step: 1, min: 0 }, "config.dragSenstive"))),
  ],
});
(() => {
  const tableList = new Table(i18n("config.animation.keyframes.frame"), i18n("config.animation.keyframes.css"), "");
  function addEntry(keyframeName) {
    const frameIndex = () => config.keyframes.findIndex((i) => i[0] == keyframeName);
    const frameName = inputElement({}, `config.keyframes.${frameIndex()}.0`);
    const cssElem = textareaELem({ value: config.keyframes[frameIndex()][1] }, `config.keyframes.${frameIndex()}.1`);
    const buttonElemCreator = (entryId) =>
      buttonElement("error", i18n("config.animation.keyframes.btnDel"), () => {
        CONFIG.save(config.keyframes.splice(frameIndex(), 1));
        tableList.remove(entryId);
      });
    tableList.add(frameName, cssElem, buttonElemCreator);
  }
  addItem({
    id: "wallpaler-animation",
    name: i18n("config.animation.name"),
    desc: i18n("config.animation.desc"),
    contentElem: [
      card(
        undefined,
        html("div", i18n("config.animation.delay"), inputElement({ type: "number", step: 0.1, min: 0 }, "config.animation.delay")),
        html("div", i18n("config.animation.duration"), inputElement({ type: "number", step: 0.1, min: 0 }, "config.animation.duration")),
        html("div", i18n("config.animation.function.desc"), selectElement({ style: "max-width:400px;" }, CONFIG.$("config.animation.function"), i18n("config.animation.function.option")))
      ),
      card(html("h3", i18n("config.animation.keyframes.name")), () => {
        for (const [name] of config.keyframes) {
          addEntry(name);
        }
        return tableList.table;
      }),
      card(html("h3", i18n("config.animation.keyframes.new")), () => {
        const tableNew = new Table(i18n("config.animation.keyframes.frame"), i18n("config.animation.keyframes.css"), "");
        const frameName = html("input");
        const cssElem = html("textarea");
        const buttonElem = buttonElement("success", i18n("config.animation.keyframes.btnAdd"), () => {
          const newFrame = [frameName.value, cssElem.value];
          if (newFrame[0]) {
            errorAlert(frameName, true);
          } else {
            return errorAlert(frameName);
          }
          CONFIG.save(config.keyframes.push(newFrame));
          addEntry(newFrame[0]);
        });
        tableNew.add(frameName, cssElem, buttonElem);
        return tableNew.table;
      }),
    ],
  });
})();
addItem({
  id: "default-note",
  name: i18n("config.defaultNote.name"),
  desc: i18n("config.defaultNote.desc"),
  contentElem: [
    card(
      undefined,
      html("div", i18n("config.defaultNote.defaultTitle.desc"), inputElement({}, "config.defaultNote.title")),
      html("div", i18n("config.defaultNote.fontColor"), inputElement({ type: "color" }, "config.defaultNote.fontColor")),
      html("div", i18n("config.defaultNote.fontSize"), inputElement({ type: "number", min: 0, step: 1 }, "config.defaultNote.fontSize")),
      html("div", i18n("config.defaultNote.opacity"), inputElement({ type: "number", min: 0, step: 1, max: 100 }, "config.defaultNote.opacity")),
      html("div", i18n("config.defaultNote.content"), textareaELem({ value: config.defaultNote.content }, "config.defaultNote.content")),
      html(
        "div",
        i18n("config.defaultNote.size.desc"),
        inputElement({ type: "number", min: 0, step: 1, placeholder: i18n("config.defaultNote.size.height") }, "config.defaultNote.size.0"),
        inputElement({ type: "number", min: 0, step: 1, placeholder: i18n("config.defaultNote.size.width") }, "config.defaultNote.size.1")
      )
    ),
  ],
});
addItem({
  id: "default-wallpaler",
  name: i18n("config.defaultPic.name"),
  desc: i18n("config.defaultPic.desc"),
  contentElem: [
    card(
      undefined,
      () => {
        const dialog = new Dialog();
        const selectElem = html(
          "input",
          { type: "file", style: "display:none", accept: "image/*" },
          {
            input: async () => {
              if (!selectElem.value) return;
              const image = selectElem.files[0];
              const result = await Pictures.setPicCache("defaultPic", {
                message: "用户设置的默认图片: " + image.name,
                name: image.name,
                pic: image,
              });
              if (result) return dialog.show(i18n("config.defaultPic.set.ok"));
              dialog.show(i18n("config.defaultPic.set.fail"));
            },
          }
        );
        const buttonView = buttonElement(undefined, i18n("config.defaultPic.view.desc"), async () => {
          try {
            const wallpaper = await Pictures.getPicCache("defaultPic");
            chrome.tabs.create({ url: URL.createObjectURL(wallpaper.pic) });
          } catch {
            dialog.show(i18n("config.defaultPic.view.fail"));
          }
        });
        const buttonSet = buttonElement("success", i18n("config.defaultPic.set.desc"), () => selectElem.click());
        const buttonDel = buttonElement("error", i18n("config.defaultPic.delete.desc"), async () => {
          await Pictures.deletePicCache("defaultPic");
          dialog.show(i18n("config.defaultPic.delete.ok"));
        });
        return html("div", buttonView, buttonSet, buttonDel);
      },
      checkbox(i18n("config.defaultPic.preferBing"), CONFIG.$("config.preferBing"), (checked) => CONFIG.$("config.preferBing", checked))
    ),
  ],
});
addItem({
  id: "image-search",
  name: i18n("config.imageSearch.name"),
  desc: i18n("config.imageSearch.desc"),
  contentElem: [
    card(
      undefined,
      checkbox(i18n("config.imageSearch.enable"), CONFIG.$("config.imageSearch.enable"), (checked) => CONFIG.$("config.imageSearch.enable", checked))
    ),
    () => {
      const translate = {
        bing: i18n("config.imageSearch.engines.bing"),
        google: i18n("config.imageSearch.engines.google"),
        baidu: i18n("config.imageSearch.engines.baidu"),
        yandex: i18n("config.imageSearch.engines.yandex"),
        saucenao: i18n("config.imageSearch.engines.saucenao"),
        ascii2d: i18n("config.imageSearch.engines.ascii2d"),
        tinyeye: i18n("config.imageSearch.engines.tinyeye"),
      };
      const cardELem = card(i18n("config.imageSearch.available"));
      const enabledEnginge = config.imageSearch.engines;
      for (const engineName in ImageSearch.engines) {
        cardELem.append(
          checkbox(translate[engineName], enabledEnginge.includes(engineName), (checked) => {
            if (checked) {
              enabledEnginge.push(engineName);
            } else {
              enabledEnginge.splice(enabledEnginge.indexOf(engineName), 1);
            }
            CONFIG.save((config.imageSearch.engines = enabledEnginge));
          })
        );
      }
      return cardELem;
    },
  ],
});
addItem({
  id: "chromeos-wallpaper",
  name: i18n("config.chromeOSwallpaper.name"),
  desc: i18n("config.chromeOSwallpaper.desc"),
  contentElem: [
    card(
      undefined,
      checkbox(i18n("config.chromeOSwallpaper.enable"), CONFIG.$("config.chromeOSwallpaper.enable"), (checked) => CONFIG.$("config.chromeOSwallpaper.enable", checked)),
      html("div", i18n("config.chromeOSwallpaper.rollFrequency"), inputElement({ type: "number", min: 0, step: 0.5 }, "config.chromeOSwallpaper.switchPeriod")),
      html("div", i18n("config.chromeOSwallpaper.rollLimit"), inputElement({ type: "number", min: 0, step: 1, max: 100 }, "config.chromeOSwallpaper.minBatteryLevel"))
    ),
  ],
});
addItem({
  id: "edit-json",
  name: i18n("config.editJson.name"),
  desc: i18n("config.editJson.desc"),
  contentElem: [
    card(
      i18n("config.editJson.content"),
      () => {
        const textarea = textareaELem({ style: "width:100%;height:500px", value: JSON.stringify(config, null, 4) }, "config", (value) => {
          try {
            errorAlert(textarea, true);
            const newConfig = JSON.parse(value);
            newConfig.notes = config.notes;
            return newConfig;
          } catch {
            errorAlert(textarea);
          }
        });
        return textarea;
      },
      () => {
        const dialog = new Dialog(i18n("config.editJson.restore.question"), i18n("config.editJson.restore.desc"));
        const button = buttonElement("error", i18n("config.editJson.restore.btn"), () => {
          dialog.on("ok", () => {
            CONFIG.restore();
            window.location.reload();
          });
          dialog.show();
        });
        return html("div", button);
      }
    ),
  ],
});
addItem({
  id: "reload-extension",
  name: i18n("config.reloadExtension.name"),
  desc: i18n("config.reloadExtension.desc"),
  contentElem: [
    card(
      undefined,
      html(
        "div",
        buttonElement("error", i18n("config.reloadExtension.btn"), () => chrome.runtime.reload())
      )
    ),
  ],
});
noteSync.listen("delete", async (data) => {
  const { noteId } = data;
  await STORAGE.delete(`notes/${noteId}`);
  document.querySelector("#" + noteId).remove();
  document.querySelector(`a[href="#${noteId}"]`).parentElement.remove();
  config.notes.splice(config.notes.indexOf(noteId), 1);
  CONFIG.save();
});
noteSync.listen("create", (data) => {
  const fullNote = Object.assign({}, config.defaultNote, data.note);
  addItemNote(fullNote);
});
for (const noteId of config.notes) {
  const response = await STORAGE.get(`notes/${noteId}`);
  const note = await response.json();
  addItemNote(note);
}
