import i18n from "./lang/main.js";

/**
 * 通过cache-storage实现数据持久化存储。
 */
export class StorageByCache {
  /** 打开缓存。传入缓存名称 */
  constructor(cacheName) {
    this.cache = caches.open(cacheName);
  }
  /**
   * 构建Request对象
   * @param {*} key key 名称
   * @returns {Request}
   */
  static getRequest(key) {
    if (typeof key !== "string") throw new Error("key 只能是 string");
    return new Request(`https://dummy/${key}`);
  }
  /**
   * 构建Response对象。默认类型是 application/json，如果data是File类型，则type为File.type
   * @param {any} data 响应体数据
   * @param {string} type 响应体类型
   * @returns {Response}
   */
  static getResponse(data, headers = {}) {
    const header = Object.assign({ "content-type": "application/json" }, headers);
    if (data instanceof File || data instanceof Blob) {
      header["content-type"] = data.type;
    }
    if (header["content-type"] == "application/json") {
      data = JSON.stringify(data);
    }
    header["content-length"] = data.length || data.size;
    return new Response(data, {
      headers: new Headers(header),
    });
  }
  /**
   * 向缓存中存储数据。
   * @param {*} key key 名称
   * @param {*} value 数据
   * @param {*} type 数据类型。默认是 application/json，如果data是File类型，则type为File.type
   */
  async set(key, value, headers = {}) {
    const cache = await this.cache;
    const request = StorageByCache.getRequest(key);
    const response = StorageByCache.getResponse(value, headers);
    await cache.put(request, response);
    return value;
  }
  /**
   * 从缓存中取出数据
   * @param {string} key key 名称
   * @returns {any} 数据
   */
  async get(key) {
    const cache = await this.cache;
    const response = await cache.match(`https://dummy/${key}`);
    return response || null;
  }
  /**
   * 从缓存中删除数据
   * @param {string} key key 名称
   */
  async delete(key) {
    const cache = await this.cache;
    return cache.delete(`https://dummy/${key}`);
  }
}

/** 便于在不直接接触DOM的情况下，使用传统的表单提交（POST）。 */
export class HtmlForm {
  /** 表单元素 */
  form = document.createElement("form");
  /**
   * 创建一个html表单。
   * @param {*} url action的目标url。可以立即提供一个url，也可以稍后使用attr()提供
   */
  constructor(url = "") {
    const form = this.form;
    form.action = url;
    form.enctype = "multipart/form-data";
    form.style = "display:none";
    form.method = "POST";
    form.target = "_blank";
  }
  /**
   * 添加表单项目
   * @param {string} name 项目名称
   * @param {any} value 项目的值
   */
  append(name, value) {
    const input = document.createElement("input");
    input.name = name;
    // 如果是文件列表，则需要特殊处理
    if (value instanceof FileList) {
      input.type = "file";
      input.files = value;
    } else {
      input.value = value;
    }
    this.form.append(input);
  }
  /** 提交表单 */
  submit() {
    const form = this.form;
    document.body.append(form);
    form.submit();
    form.remove();
  }
  /**
   * 为表单设置属性。
   * @param {*} 要设置的属性的键值对
   */
  attr({ ...attrs }) {
    for (const name in attrs) {
      this.form[name] = attrs[name];
    }
  }
}

/** 图片搜索引擎快捷调用 */
export class ImageSearch {
  /** 可用的图片搜索引擎 */
  static engines = {
    /**
     * 谷歌图片搜索
     * @param {fileList} files fileList 对象
     */
    google: function (files) {
      // 构建表单，然后提交
      const form = new HtmlForm(`https://lens.google.com/v3/upload?hl=zh-CN`);
      form.append("encoded_image", files);
      form.submit();
    },
    /**
     * 必应图片搜索
     * @param {fileList} files fileList 对象
     */
    bing: async function (files) {
      const [data] = files;
      const accessTest = await fetch("https://www.bing.com");
      if (accessTest.redirected) {
        return;
      }
      const form = new HtmlForm(`https://www.bing.com/images/search?view=detailv2&iss=sbiupload`);
      const base64Data = (await ImageSearch.imgToBase64(data)).split(",")[1];
      form.append("imageBin", base64Data);
      form.append("iss", "sbiupload");
      form.submit();
    },
    /**
     * yandex图片搜索
     * @param {fileList} files fileList 对象
     */
    yandex: async function (files) {
      const [data] = files;
      // 由于yandex是通过ajax上传图片，所以需要先打开一个空白窗口，避免延迟弹出窗口造成干扰
      const preOpenWindow = window.open("about:blank", "_blank");
      preOpenWindow.document.title = i18n("imageSearch.titles.yandex");
      try {
        const upload = await fetch("https://yandex.com/images-apphost/image-download?cbird=111&images_avatars_size=preview&images_avatars_namespace=images-cbir", {
          headers: {
            "content-type": data.type,
          },
          body: data,
          method: "POST",
        });
        if (upload.status !== 200) throw new Error(`yandex: ${upload.status}: ${upload.statusText}`);
        const { cbir_id: cbirId, url } = await upload.json();
        // 此时再通过预先打开的窗口跳转到结果页面
        preOpenWindow.location.href = `https://yandex.com/images/search?cbir_id=${cbirId}&rpt=imageview&url=${url}`;
      } catch (e) {
        preOpenWindow.close();
      }
    },
    /**
     * 百度图片搜索
     * @param {fileList} files fileList 对象
     */
    baidu: async function (files) {
      const [data] = files;
      // 同yandex，不过百度采用了form表单上传
      const preOpenWindow = window.open("about:blank", "_blank");
      const form = new FormData();
      preOpenWindow.document.title = i18n("imageSearch.titles.baidu");
      form.enctype = "multipart/form-data";
      form.append("image", data);
      try {
        const upload = await fetch("https://graph.baidu.com/upload", {
          body: form,
          method: "POST",
        });
        if (upload.status !== 200) throw new Error(`百度: ${upload.status}: ${upload.statusText}`);
        const {
          data: { url: urlStr },
          status,
        } = await upload.json();
        if (status != 0) throw new Error(`百度: 服务器报告错误: ${status}`);
        // 为得到的url进行修改，使搜索结果页面的ui变得正常
        const url = new URL(urlStr);
        url.searchParams.set("entrance", "GENERAL");
        url.searchParams.set("tpl_from", "pc");
        url.searchParams.set("extUiData[isLogoShow]", "1");
        preOpenWindow.location.href = url.href;
      } catch (e) {
        preOpenWindow.close();
      }
    },
    /**
     * saucenao图片搜索
     * @param {fileList} files fileList 对象
     */
    saucenao: function (files) {
      // 同google
      const form = new HtmlForm(`https://saucenao.com/search.php`);
      form.append("url", `Paste Image URL`);
      form.append("file", files);
      form.submit();
    },
    /**
     * acsii2d图片搜索
     * @param {fileList} files fileList 对象
     */
    ascii2d: function (files) {
      // 同google
      const form = new HtmlForm(`https://ascii2d.net/search/file`);
      form.append("utf8", `✓`);
      form.append("file", files);
      form.submit();
    },
    /**
     * tinyeye图片搜索
     * @param {fileList} files fileList 对象
     */
    tinyeye: async function (files) {
      const [data] = files;
      //同百度，不过不需要处理url
      const preOpenWindow = window.open("about:blank", "_blank");
      const form = new FormData();
      preOpenWindow.document.title = i18n("imageSearch.titles.tinyeye");
      form.enctype = "multipart/form-data";
      form.append("image", data);
      try {
        const upload = await fetch("https://tineye.com/api/v1/result_json/", {
          body: form,
          method: "POST",
        });
        if (upload.status !== 200) throw new Error(`tinyeye: ${upload.status}: ${upload.statusText}`);
        const { query_hash: queryHash } = await upload.json();
        if (!queryHash) throw new Error("tinyeye返回的query_hash为空");
        preOpenWindow.location.href = `https://tineye.com/search/${queryHash}?sort=score&order=desc&page=1`;
      } catch (e) {
        preOpenWindow.close();
      }
    },
  };
  /** 允许上传的图片类型。各个引擎对图片类型的接受度不同，因此默认只允许jpeg、png、webp */
  static allowedImageType = ["image/jpeg", "image/png", "image/webp"];
  /** 启用的图片搜索引擎Set */
  engines = new Set();
  dialog = {
    /** 选择搜索引擎的对话框 */
    selectEngine: undefined,
    /** 选择图片的对话框 */
    pickImage: undefined,
  };
  /** 拖放生效的html元素 */
  dragTarget;
  /** 默认已选的搜索引擎 */
  defaultSelected = [];
  /** 启用图片搜索 */
  enable = true;
  /**
   * 为元素设置拖放图片搜索，并提供需要启用的引擎
   * @param {HTMLElement} dragTarget 拖放生效的html元素
   * @param  {...string} defaultSelected 默认已选的搜索引擎
   */
  constructor(dragTarget, ...defaultSelected) {
    this.dragTarget = dragTarget;
    this.defaultSelected = defaultSelected.filter((i) => typeof i == "string");
    this.initDialog();
    dragTarget.addEventListener("drop", (e) => this.eventHandler(e));
    dragTarget.addEventListener("dragover", (e) => e.preventDefault());
  }
  /**
   * 将图片转换为base64对象
   * @param {File} file Flie对象
   * @returns {string}
   */
  static imgToBase64(file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    return new Promise((resolve) => (reader.onload = (e) => resolve(e.target.result)));
  }
  /** 拖放事件处理。也就是拖放图片直接触发搜索 */
  eventHandler(e) {
    if (!this.enable) return;
    e.preventDefault();
    const files = e.dataTransfer.files;
    this.search(files);
  }
  /** 初始化各个对话框 */
  initDialog() {
    const checkBoxes = [];
    for (const engineName in ImageSearch.engines) {
      const defaultEnabled = this.defaultSelected.includes(engineName);
      defaultEnabled && this.engines.add(engineName);
      const checkbox = html(
        "input",
        { type: "checkbox", checked: defaultEnabled ? true : undefined },
        {
          change: () => {
            checkbox.checked ? this.engines.add(engineName) : this.engines.delete(engineName);
          },
        }
      );
      checkBoxes.push(html("label", checkbox, html("span", { class: "checkable" }, engineName)));
    }
    const dialogSelect = new Dialog(i18n("imageSearch.dialog.engine"), ...checkBoxes);
    const dialogPick = new Dialog(
      i18n("imageSearch.dialog.pic"),
      html(
        "label",
        { class: "dropimage" },
        html(
          "input",
          { type: "file", accept: "image/png,image/jpeg" },
          {
            change: (e) => {
              const files = e.target.files;
              if (files.length > 0) {
                dialogPick.close("ok");
                this.search(files);
              }
            },
          }
        )
      )
    );
    dialogPick.buttons({ cancel: i18n("imageSearch.dialog.cancel") });
    dialogSelect.$(".dialog-content").classList.add("engine-list");
    this.dialog = {
      selectEngine: dialogSelect,
      pickImage: dialogPick,
    };
  }
  /**
   * 搜索图像。由于需要构建表单并追加图像数据，需要 FileList 而不能是 File 。
   * @param {FileList} image 以 FileList 形式存在的图像
   */
  search(image) {
    const data = image[0];
    if (!data || !ImageSearch.allowedImageType.includes(data.type)) return;
    this.dialog.selectEngine.on("ok", () => {
      for (const engineName of this.engines) {
        try {
          ImageSearch.engines[engineName](image);
        } catch (e) {
          console.error(`使用图片搜索引擎: ${engineName} 时出错: `, e);
        }
      }
    });
    this.dialog.selectEngine.show();
  }
  /** 显示选择图片的对话框 */
  showPickDialog() {
    if (!this.enable) return;
    this.dialog.pickImage.$("input").value = "";
    this.dialog.pickImage.show();
  }
  /** 移除拖放事件监听 */
  remove() {
    this.dragTarget.removeEventListener("drop", (e) => this.eventHandler(e));
    this.dragTarget.removeEventListener("dragover", (e) => e.preventDefault());
  }
}

/** 预设颜色列表 */
export const presetColors = [
  "#464646",
  "#66CCCC",
  "#CCFF66",
  "#FF99CC",
  "#FF9999",
  "#FFCC99",
  "#FF6666",
  "#FFFF66",
  "#99CC66",
  "#666699",
  "#99CC33",
  "#FF9900",
  "#FFCC00",
  "#FF0033",
  "#FF9966",
  "#CCFF00",
  "#CC3399",
  "#FF6600",
  "#993366",
  "#CCCC33",
  "#666633",
];

/**
 * 创建一个元素并设置其属性、事件监听器以及子元素。
 * @param {string} tagName - 要创建的元素的标签名。
 * @param {Object} attrs - 元素的属性对象，键值对形式，键为属性名，值为属性值。可不存在
 * @param {Object} linteners - 元素的事件监听器对象，键值对形式，键为事件类型，值为对应的处理函数。可不存在，但如果要要添加事件监听器，则需要提供一个空对象。
 * @param {Array} children - 元素的子元素数组，可以是其他元素、文本节点等。
 * @returns {HTMLElement} - 元素。
 */
export function html(tagName, ...args) {
  let [attrs = {}, listeners = {}, ...children] = args;
  const element = document.createElement(tagName);
  const ifELem = [];
  // 检测attrs和listeners是否是元素或文本节点，如果是，将其放入children数组
  if (attrs instanceof HTMLElement || typeof attrs === "string") {
    ifELem.push(attrs);
    attrs = {};
  }
  if (listeners instanceof HTMLElement || typeof listeners === "string") {
    ifELem.push(listeners);
    listeners = {};
  }
  children.unshift(...ifELem);
  // 处理attrs
  for (const attrName in attrs) {
    if (typeof attrName !== "string" || typeof attrs[attrName] === "undefined") continue;
    element.setAttribute(attrName, attrs[attrName]);
  }
  // 处理listeners
  for (const eventName in listeners) {
    if (typeof eventName !== "string") continue;
    element.addEventListener(eventName, listeners[eventName]);
  }
  // 添加children
  for (const child of children.filter((i) => i)) {
    element.append(child);
  }
  return element;
}

/** 构造表格元素 */
export class Table {
  /** 表格元素 */
  table = html("table", html("thead", html("tr")), html("tbody"));
  /** 表格主体元素 */
  tbody = this.table.querySelector("tbody");
  /**
   * 构造一个表格
   * @param  {...Node} heads 表格标题
   */
  constructor(...heads) {
    const tr = this.table.querySelector("thead>tr");
    for (let i of heads) {
      tr.append(html("th", typeof i == "function" ? i() : i));
    }
  }
  /**
   * 添加一行项目
   * @param  {Node} items 表格项目。如果是函数，则使用该函数的返回值。会向函数传递一个 entryId 参数，指示该行项目的 id。
   */
  add(...items) {
    const entryId = Math.random();
    const tr = html("tr", { "entry-id": entryId });
    for (let i of items) {
      tr.append(html("td", typeof i == "function" ? i(entryId) : i));
    }
    this.tbody.append(tr);
  }
  /**
   * 从表格中删除项目
   * @param {string} entryId 项目id
   * @returns {boolean}
   */
  remove(entryId) {
    const tr = this.table.querySelector(`tr[entry-id="${entryId}"]`);
    if (tr) {
      tr.remove();
      return true;
    }
    return false;
  }
}

/** 与背景服务通信 */
export class Messenger {
  /** 背景服务单独初始化 */
  static backgroundInit() {
    /** 通信端口 */
    const ports = new Set();
    /** 通信端口传入的数据处理回调 */
    const portHandlers = new Map();
    //监听端口连接事件
    chrome.runtime.onConnect.addListener((port) => {
      ports.add(port);
      port.onDisconnect.addListener((port) => ports.delete(port));
      //监听端口消息事件
      port.onMessage.addListener(async (message) => {
        if (!portHandlers.has(port.name)) return;
        //从消息中获取事件名称和数据，并将数据交由回调函数处理
        const { event = "default", data = null, id } = message;
        const result = await portHandlers.get(port.name)(data);

        for (let portsInstace of ports) {
          //将回调函数处理的结果发送给所有同名端口（消息同步）
          if (portsInstace.name != port.name) continue;
          portsInstace.postMessage({ event, data: result, id });
        }
      });
    });
    //返回一个函数，通过该函数设定要转发的通信端口，也可以传入回调对消息进行修改
    return function (channelName, callback = (data) => data) {
      portHandlers.set(channelName, callback);
    };
  }
  /**
   * 建立连接。
   * @param {string} name 唯一的连接名称
   */
  constructor(name = "default") {
    this.port = chrome.runtime.connect({ name });
    this.port.onDisconnect.addListener(() => {
      this.port = chrome.runtime.connect({ name });
    });
  }
  /**
   *监听事件。
   * @param {string} event 事件名称，默认以port.name作为事件名
   * @param {function} callback 回调
   */
  listen(event = this.port.name, callback = () => null) {
    if (typeof event == "function") {
      callback = event;
      event = this.port.name;
    }
    this.port.onMessage.addListener((message) => {
      const { event: eventName, data = null } = message;
      if (eventName == event) callback(data);
    });
  }
  /**
   * 触发事件，同时可以发送数据
   * @param {string} event 事件名称，默认以port.name作为事件名
   * @param {any} data 数据
   */
  emit(event = this.port.name, data = {}) {
    this.port.postMessage({ event, data });
  }
  /** 断开连接 */
  disconnect() {
    this.port.disconnect();
  }
}

/** 对话框 */
export class Dialog {
  /** 对话框元素 */
  dialog;
  /** 用后自动销毁 */
  once = false;
  /**
   * 构建对话框
   * @param {string} title 对话框标题
   * @param  {...HTMLElement} contentElem 对话框主体元素
   */
  constructor(title, ...contentElem) {
    this.dialog = html(
      "dialog",
      {},
      {
        cancel: () => this.close("cancel"),
        click: (e) => e.target == this.dialog && this.close("cancel"),
        contextmenu: (e) => e.preventDefault(),
      },
      html("div", html("div", { class: "dialog-title" }, title), html("div", { class: "dialog-content" }, {}, ...contentElem), html("div", { class: "dialog-footer" }))
    );
    this.buttons(); //设置默认按钮
    document.body.append(this.dialog);
  }
  /**
   * 添加按钮
   * @param {*} buttons 键值对形式，键为按下该按钮时会触发的事件名，值是按钮的文本名称
   */
  buttons(buttons = { ok: i18n("dialog.ok"), cancel: i18n("dialog.cancel") }) {
    const footer = this.dialog.querySelector(".dialog-footer");
    footer.innerHTML = ""; //清空原有按钮
    for (const btn in buttons) {
      const btnElem = html("button", { class: "pseudo" }, buttons[btn]);
      btnElem.addEventListener("click", () => this.close(btn)); //按下按钮时关闭对话框，并传递按钮对应的事件名称
      footer.append(btnElem);
    }
    return this;
  }
  /**
   * 修改对话框内容,并可选地修改对话框标题与内容
   * @param {*} title 新的标题
   * @param  {...any} contentElem 新的对话框主体
   */
  show(title, ...contentElem) {
    const content = this.dialog.querySelector(".dialog-content");
    title && (this.dialog.querySelector(".dialog-title").innerText = title);
    if (contentElem.length > 0) {
      content.innerHTML = "";
      content.append(...contentElem);
    }
    this.dialog.showModal();
  }
  /**
   * 显示一个确认框。会强制使用默认按钮。
   * @param  {...any} args 同 show() 的参数
   * @returns
   */
  confirm(...args) {
    return new Promise((resolve) => {
      this.buttons();
      this.on("ok", () => resolve(true));
      this.on("cancel", () => resolve(false));
      this.show(...args);
    });
  }
  /**
   * 关闭对话框。可以显式调用此方法并传入自定义事件名，触发监听该事件的回调，而不修改对话框按钮
   * @param {} returnValue 对话框关闭时返回的值
   */
  close(returnValue) {
    this.dialog.close(returnValue);
  }
  /**
   * 监听按钮事件。实际上是监听对话框关闭事件
   * @param {*} eventName 事件名称，实际上是对话框关闭时的returnValue。默认是ok和cancel（通过默认的 buttons() 方法设置）
   * @param {*} callbackFunc 回调
   */
  on(eventName, callbackFunc) {
    let callbackClose = (e) => {
      const result = this.dialog.returnValue;
      this.dialog.removeEventListener("close", callbackClose);
      try {
        result == eventName && callbackFunc(e);
      } catch (e) {
        console.error("Error on handling dialog Event:", e);
      }
      if (this.once) {
        this.remove();
      }
    };
    this.dialog.addEventListener("close", callbackClose);
    return this;
  }
  /** 移除对话框 */
  remove() {
    this.dialog.remove();
  }
  /**
   * 对this.dialog.querySelectorAll和querySelector的包装
   * @param {*} selector 选择器
   * @param {boolean} isAll 是否用querySelectorAll
   * @returns
   */
  $(selector, isAll = false) {
    if (isAll) return this.dialog.querySelectorAll(selector);
    return this.dialog.querySelector(selector);
  }
}

/**
 * 允许拖动元素。通过 add() 方法添加元素，然后可以通过注册“drag-start”、“dragging”和“drag-end”事件，监听拖动事件。
 * “dragstart”和“dragging”事件会通过e.detail.x和e.detail.y获取事件触发时的鼠标坐标。
 */
export class Drag {
  /** 正在被拖动的元素 */
  currentDragging;
  /** 上一次拖动事件的时间戳 */
  lastDrag = 0;
  /** 允许拖动的元素列表 */
  dragElements = new Set();
  /**
   * 允许拖动元素。
   * @param {Element} target 想要其能拖动的元素
   */
  constructor() {
    //注册拖动开始事件
    for (const eventName of ["touchstart", "mousedown"]) {
      document.addEventListener(eventName, (e) => {
        if (this.dragElements.has(e.target)) {
          this.currentDragging = e.target;
          let [x, y] = Drag.getPosition(e);
          this.currentDragging.dispatchEvent(new CustomEvent("drag-start", { detail: { x, y } }));
        }
      });
    }
    //注册拖动中事件
    for (const eventName of ["touchmove", "mousemove"]) {
      document.addEventListener(eventName, (e) => {
        const now = new Date().getTime();
        if (now - this.lastDrag < 10) return; //舍弃与上一次拖动间隔小于10ms的拖动事件
        this.lastDrag = now;
        if (this.dragElements.has(this.currentDragging)) {
          let [x, y] = Drag.getPosition(e);
          this.currentDragging.dispatchEvent(new CustomEvent("dragging", { detail: { x, y } }));
        }
      });
    }
    //注册拖动结束事件
    for (const eventName of ["touchend", "mouseup"]) {
      document.addEventListener(eventName, () => {
        if (this.currentDragging) {
          this.currentDragging.dispatchEvent(new CustomEvent("drag-end"));
          this.currentDragging = undefined;
        }
      });
    }
  }
  /**
   * 获取事件触发的位置(clientX,clientY)
   * @param {*} e Event
   * @returns [x,y]
   */
  static getPosition(e) {
    if (e.touches) {
      const touch = e.touches.item(0);
      return [touch.clientX, touch.clientY];
    }
    return [e.clientX, e.clientY];
  }
  /**
   * 添加想要能够拖拽的元素
   * @param {*} element 目标元素
   */
  add(element) {
    element.addEventListener("dragstart", (e) => e.preventDefault());
    this.dragElements.add(element);
  }
}
