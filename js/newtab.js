import { html, presetColors, Messenger, Drag, ImageSearch, Dialog, StorageByCache } from "./util.js";
import i18n from "./lang/main.js";
import PICTURE from "./pictures.js";
import { Config } from "./config.js";

/** 添加css */
class CSS {
  /** 插入数条css规则 */
  static insert(cssList) {
    for (const css of cssList) {
      document.styleSheets[0].insertRule(css);
    }
  }
  /** 设置css变量 */
  static setVariable(name, value) {
    document.documentElement.style.setProperty(`--${name}`, value);
  }
}

/** 便签控制器 */
class NoteController {
  /** 删除便签对话框 */
  static dialogRemove = new Dialog("删除便签？");
  /** 便签同步控制器 */
  static messenger = new Messenger("noteSync");
  /** 新便签对话框 */
  dialogNew;
  /** 便签的父元素 */
  parentElem;
  /** 默认便签 */
  defaultNote;
  /** 获取随机颜色 */
  get color() {
    return presetColors[Math.floor(Math.random() * presetColors.length)];
  }
  /**
   * 初始化便签控制器
   * @param {Elem } parentElem 便签的父元素
   * @param {Object} defaultNote 默认便签
   */
  constructor(parentElem, defaultNote = {}) {
    this.parentElem = parentElem;
    this.defaultNote = defaultNote;
    NoteController.messenger.listen("create", (data) => new Note(this.parentElem, this.defaultNote, data.note)); //监听便签创建
    NoteController.messenger.listen("delete", (data) => NoteController.delete(data.noteId)); //监听便签删除
    this.initEventListener();
  }
  /**
   * 新建便签。实际上是触发便签创建消息
   * @param {object} note 便签对象
   */
  new(note) {
    NoteController.messenger.emit("create", { note });
  }
  /** 初始化各种事件监听器 */
  initEventListener() {
    const { title: defaultTitle } = this.defaultNote;

    /** 新便签输入框 */
    const inputElem = html("input", { type: "text", value: defaultTitle, placeholder: defaultTitle });
    /** 创建新便签对话框 */
    this.dialogNew = new Dialog(i18n("newTab.newNote"), inputElem);

    //通过快捷键新建
    chrome.commands.onCommand.addListener((command) => {
      if (command != "newNote") return;
      this.new({ id: "note" + new Date().getTime(), title: defaultTitle, color: this.color });
    });
    //按住ctrl+鼠标左键新建
    window.addEventListener("click", (e) => {
      if (!(e.ctrlKey || e.metaKey) || ![...e.target.classList.values()].includes("wallpaper")) return;
      this.dialogNew.on("ok", () => {
        const value = inputElem.value || null;
        if (!value) return;
        this.new({ id: "note" + new Date().getTime(), title: value, color: this.color, position: [e.clientX, e.clientY] });
      });
      this.dialogNew.show();
    });
  }
  /**
   * 从列表加载便签
   * @param {Array} noteList 便签id列表
   */
  async load(noteList) {
    for (let noteId of noteList) {
      const response = await STORAGE.get(`notes/${noteId}`);
      this.new(await response.json());
    }
  }
  /**
   * 删除便签
   * @param {string} noteId 便签id
   */
  static async delete(noteId) {
    document.querySelector("#" + noteId)?.remove();
    config.notes.splice(
      config.notes.findIndex((i) => i == noteId),
      1
    );
    CONFIG.$("config.notes", config.notes);
    await STORAGE.delete(`notes/${noteId}`);
  }
}

/** 便签 */
class Note {
  /** 便签主体元素 */
  noteBody;
  /** 上一次样式变化的时间戳 */
  lastStyleChange = 0;
  /** 是否正在同步样式 */
  syncStyle = false;
  /**
   * 新建便签
   * @param {*} parentElem 便签父元素
   * @param {*} defaultNote 默认便签数据
   * @param {*} note 便签数据
   * @returns
   */
  constructor(parentElem, defaultNote, note) {
    this.note = Object.assign({}, defaultNote, note);
    this.config = {
      maxWidth: window.innerWidth - this.note.size[0],
      maxHeight: window.innerHeight - this.note.size[1],
    };
    if (document.querySelector("#" + this.note.id)) return;
    this.noteBody = html("div", { class: "note noteappear", id: this.note.id }, html("div", { class: "note-title" }), html("textarea", { class: "note-content" }, this.note.content));
    this.save();
    this.initTitleEvent();
    this.initBodyEvent();
    this.initSync();
    this.initStyle();
    this.initStyleListener();
    parentElem.append(this.noteBody);
  }
  /** 获取元素位置和大小[x,y,w,h](px) */
  static getNotePosition(element) {
    const style = getComputedStyle(element);
    return [style.left, style.top, style.width, style.height].map((i) => Number(i.replace(/[a-z]/g, "")));
  }
  /** 初始化标题元素相关事件 */
  initTitleEvent() {
    /** 便签标题元素 */
    const titleElem = this.noteBody.querySelector(".note-title");
    /** 元素坐标和鼠标坐标的偏移量 */
    let [offsetX, offsetY] = [0, 0];
    //处理拖拽
    dragHandler.add(titleElem);
    titleElem.addEventListener("click", (e) => {
      //按住shift，同时单击鼠标左键删除
      if (!e.shiftKey) return;
      NoteController.messenger.emit("delete", { tabId: CURRENTTAB.id, noteId: this.note.id });
    });
    titleElem.addEventListener("contextmenu", (e) => {
      //右键弹出删除便签对话框
      e.preventDefault();
      NoteController.dialogRemove.on("ok", () => NoteController.messenger.emit("delete", { tabId: CURRENTTAB.id, noteId: this.note.id }));
      NoteController.dialogRemove.show();
    });
    titleElem.addEventListener("drag-start", (e) => {
      //获取鼠标位置和元素位置的偏差量
      const { x, y } = e.detail;
      const [initX, initY] = Note.getNotePosition(this.noteBody);
      [offsetX, offsetY] = [x - initX, y - initY];
      this.dragging = true;
    });
    titleElem.addEventListener("dragging", (e) => {
      // 将当前鼠标位置减去开始拖动时计算得到的偏差量，设置为新的元素位置
      const { x, y } = e.detail;
      const newPosX = x - offsetX;
      const newPosY = y - offsetY;
      this.changeStyle(this.noteBody, { position: [newPosX, newPosY] });
    });
  }
  /** 初始化内容元素相关事件 */
  initBodyEvent() {
    /** 便签内容元素 */
    const contentElem = this.noteBody.querySelector(".note-content");
    contentElem.addEventListener("input", () => {
      //输入内容时保存内容，并同步到其他标签页
      this.save({ content: contentElem.value });
      NoteController.messenger.emit("syncContent", { tabId: CURRENTTAB.id, noteId: this.note.id, content: contentElem.value });
    });
  }
  /** 初始化同步监听 */
  initSync() {
    /** 便签内容元素 */
    const contentElem = this.noteBody.querySelector(".note-content");
    NoteController.messenger.listen("syncContent", (data) => {
      // 监听便签内容同步
      if (data.tabId == CURRENTTAB.id || data.noteId != this.note.id) return;
      contentElem.value = data.content;
    });
    NoteController.messenger.listen("syncStyle", (data) => {
      //监听便签样式同步
      if (data.tabId == CURRENTTAB.id || data.noteId != this.note.id) return;
      this.syncStyle = true;
      this.changeStyle(this.noteBody, data);
    });
  }
  /** 初始化样式监听 */
  initStyleListener() {
    //监听自身样式变化
    new MutationObserver(async (mutationList) => {
      const now = new Date().getTime();
      if (now - this.lastStyleChange < 10) return; //舍弃与上一次样式变化间隔小于10ms的事件
      this.lastStyleChange = now;

      if (this.syncStyle) {
        /**
         *若 syncStyle 为 true ，说明当前样式变化来源是同步控制器，因此不执行剩余代码
         * 但是将 syncStyle 重置为 false 。下一次样式变化时，若 syncStyle 仍然为 ture，
         * 说明仍然是在同步其他标签页，继续无视；若是 false ，则说明样式变化来源是手动操作，
         * 因此将样式同步给其他标签页
         */
        this.syncStyle = false;
        return;
      }
      const [left, top, width, height] = Note.getNotePosition(mutationList[0].target);
      this.save({ position: [left, top], size: [width, height] });
      NoteController.messenger.emit("syncStyle", { tabId: CURRENTTAB.id, noteId: this.note.id, position: [left, top], size: [width, height] });
    }).observe(this.noteBody, { arrtibutes: true, attributeFilter: ["style"] });
  }
  /** 初始化便签样式 */
  initStyle() {
    const { id, size, position, opacity, fontColor, color, title, fontSize } = this.note;
    const { maxWidth, maxHeight } = this.config;
    CSS.insert([
      `#${id} {
        width:${size[0]}px;
        height:${size[1]}px;
        top:${position[1] < 0 ? 5 : position[1] > maxHeight ? maxHeight - 5 : position[1]}px;
        left:${position[0] < 0 ? 5 : position[0] > maxWidth ? maxWidth - 5 : position[0]}px;
        background-color:rgba(255 255 255 / ${opacity}%);
    }`,
      `#${id}>div.note-title {
      color:${fontColor};
      background-color: ${color};
    }`,
      `#${id}>div.note-title::after {
        content:"${title}"
    }`,
      `#${id}>textarea {
      height:${size[1] - 30}px;
      font-size: ${fontSize}px;
    }`,
    ]);
  }
  /**
   * 保存便签
   * @param {Object} items 便签设置
   */
  async save(items = {}) {
    for (let item in items) this.note[item] = items[item];
    if (!config.notes.includes(this.note.id)) {
      config.notes.push(this.note.id);
      CONFIG.$("config.notes", config.notes);
    }
    await STORAGE.set(`notes/${this.note.id}`, this.note);
  }
  /** 修改便签样式 */
  changeStyle(bodyElem, styles = {}) {
    const { position = [null, null], size = [null, null] } = styles;
    position[0] && (bodyElem.style.left = `${position[0]}px`);
    position[1] && (bodyElem.style.top = `${position[1]}px`);
    size[0] && (bodyElem.style.width = `${size[0]}px`);
    size[1] && (bodyElem.style.height = `${size[1]}px`);
  }
}

/** 设置背景 */
class Background {
  /** 背景元素 */
  background = html("div", { class: "wallpaper appear hide" });
  /** 背景元数据 */
  meta;
  /** 背景位置 */
  position = [50, 50];
  /** 背景的key名 */
  get keyName() {
    return `${this.meta.api}_${this.meta.name}`;
  }
  /** 实例化，并向后台发送cachePic消息 */
  constructor() {
    this.setStyle();
    const messenger = new Messenger("cachePic");
    messenger.emit();
    messenger.listen((message) => {
      console.log("后台缓存图片:", message);
    });
  }
  /**
   * 初始化
   * @param {Element} parentElem 父元素
   * @returns 等到加载动画结束的Promise
   */
  async init(parentElem) {
    this.meta = await Pictures.getRandomPic(config.preferBing);
    const { pic, message } = this.meta;
    if (!pic) {
      //获取所有图片源都失败，使用浏览器默认新标签页
      chrome.tabs.create({
        url: "chrome-search://local-ntp/local-ntp.html",
      });
      return window.close();
    }
    console.log("当前图片：", message);
    this.position = await this.getPosition();
    this.setPosition(...this.position);
    CSS.setVariable("bg-image-url", `url(${URL.createObjectURL(pic)})`);
    this.initCmdListener();
    this.initDragEvent();
    parentElem.append(this.background);
    return new Promise((resolve) => {
      let appear = () => {
        this.background.classList.remove("hide");
      };
      let done = () => {
        this.background.removeEventListener("animationstart", appear);
        this.background.removeEventListener("animationend", done);
        resolve(this.background);
      };
      this.background.addEventListener("animationstart", appear);
      this.background.addEventListener("animationend", done);
    });
  }
  /** 初始化快捷键监听 */
  initCmdListener() {
    chrome.commands.onCommand.addListener((command) => {
      if (["bingPic"].includes(this.meta.type)) return; //是从bing获取的图片，不能保存图片位置
      if (command == "saveBgPos") this.savePosition(); //快捷键保存图片位置
      if (command == "delBgPos") this.savePosition(true); //快捷键删除图片位置
    });
  }
  /** 初始化拖拽事件处理 */
  initDragEvent() {
    //开始处理拖动
    dragHandler.add(this.background);
    //定义拖动的坐标偏移量
    let [offsetX, offsetY] = [0, 0];
    this.background.addEventListener("drag-start", (e) => {
      //开始拖动时，获得当前鼠标坐标和图片位置（百分比）。计算偏移量为当前鼠标坐标除以拖拽敏感度，并加上当前图片位置。
      const { x, y } = e.detail;
      const [initX, initY] = this.getCurrentPosition();
      [offsetX, offsetY] = [initX + x / config.dragSenstive, initY + y / config.dragSenstive];
    });
    this.background.addEventListener("dragging", (e) => {
      /**
       * 拖动中，计算当前图片位置为偏移量减去当前鼠标坐标除以拖拽敏感度。
       * 也就是：图片的初始位置(%)+(初始鼠标位置-当前鼠标位置)/拖拽敏感度。
       * 拖拽敏感度的高低，影响了鼠标移动幅度对图片位置的影响大小。
       */
      if (!config.allowDrag) return;
      const { x, y } = e.detail;
      const newPosX = offsetX - x / config.dragSenstive;
      const newPosY = offsetY - y / config.dragSenstive;
      this.setPosition(newPosX, newPosY);
    });
  }
  /** 获取当前背景位置 */
  getCurrentPosition() {
    const style = getComputedStyle(this.background);
    return style["backgroundPosition"]
      .replace(/%/g, "")
      .split(" ")
      .map((i) => Number(i));
  }
  /** 获取存储的当前背景的位置 */
  async getPosition() {
    try {
      const response = await STORAGE.get(`backgroundPosition/${this.keyName}`);
      const data = await response.json();
      return data.pos;
    } catch (e) {
      return [50, 50];
    }
  }
  /**
   * 设置背景位置
   * @param {number} x x坐标
   * @param {number} y y坐标
   */
  setPosition(x = 50, y = 50) {
    [x, y] = [x, y].map((i) => i.toFixed(1));
    CSS.setVariable("bg-position", `${x}% ${y}%`);
  }
  /**
   * 保存背景位置
   * @param {boolean} deleteFlag 是否为删除背景位置
   * @returns
   */
  async savePosition(deleteFlag = false) {
    if (deleteFlag) {
      return STORAGE.delete(`backgroundPosition/${this.keyName}`);
    }
    const style = getComputedStyle(this.background);
    await STORAGE.set(`backgroundPosition/${this.keyName}`, {
      name: this.meta.name,
      pos: style["backgroundPosition"].replace(/%/g, "").split(" "),
    });
  }
  /** 设置样式 */
  setStyle() {
    const keyframesArr = [];
    for (let [name, style] of config.keyframes) {
      keyframesArr.push(`${name} {${style}}`);
    }
    CSS.setVariable("bg-color", config.bgColor);
    CSS.setVariable("bg-appear", `appear ${config.animation.duration}s ${config.animation.function} ${config.animation.delay}s 1 normal forwards`);
    document.styleSheets[0].insertRule(`@keyframes appear {${keyframesArr.join("\n")}}`);
  }
}

/** 当前的tab */
const CURRENTTAB = await chrome.tabs.getCurrent();
/** 配置控制器 */
const CONFIG = await Config.init();
/** 只包含设置的config对象 */
const config = CONFIG.config;
/** 数据存储 */
const STORAGE = new StorageByCache("cache-storage");
/** 图片相关 */
const Pictures = PICTURE.init(config.apis);
/** 拖拽控制 */
const dragHandler = new Drag();
/** 背景控制 */
const background = new Background();
/** 图像搜索 */
const imageSearch = new ImageSearch(document.body, ...config.imageSearch.engines);
/** 便签控制 */
const noteController = new NoteController(document.body, config.defaultNote);
/** 通知切换chrome OS 壁纸的通信端口 */
const wallpaperSwitch = new Messenger("chromeos-wallpaper-switch");

/** 背景右键菜单 */
const menu = new Dialog(
  "菜单",
  html("button", {}, { click: () => menu.close("bg-image-save") }, i18n("newTab.menu.savePosition")),
  html("button", {}, { click: () => menu.close("bg-image-restore") }, i18n("newTab.menu.restorePosition")),
  html("button", {}, { click: () => menu.close("new-note") }, i18n("newTab.menu.newNote")),
  html("button", { style: config.imageSearch.enable ? "display:block;" : "display:none;" }, { click: () => menu.close("image-search") }, i18n("newTab.menu.imageSearch")),
  html("button", { style: chrome.wallpaper ? "display:block;" : "display:none;" }, { click: () => menu.close("chromeos-wallpaper") }, i18n("newTab.menu.rollWallpaper"))
);
/** 背景元素引用 */
const bgElem = await background.init(document.body);

imageSearch.enable = config.imageSearch.enable;
noteController.load(config.notes);

menu.buttons({ cancel: i18n("newTab.cancel") });
bgElem.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  menu.on("bg-image-save", () => background.savePosition());
  menu.on("bg-image-restore", () => background.savePosition(true));
  menu.on("new-note", () => noteController.new({ id: "note" + new Date().getTime(), color: noteController.color, position: [e.clientX, e.clientY] }));
  menu.on("image-search", () => imageSearch.showPickDialog());
  menu.on("chromeos-wallpaper", () => wallpaperSwitch.emit());
  menu.show();
});
