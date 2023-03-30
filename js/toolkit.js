/**
 * 从字符串创建元素
 * @param {String} str 字符串形式的元素
 * @returns html元素或者HTMLCollection
 */
function html(text) {
  const container = document.createElement("body");
  container.insertAdjacentHTML("beforeend", text);
  const children = container.children;
  return children.length == 0 ? null : children.length == 1 ? children[0] : children;
}

//预设颜色
const presetColors = [
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

//搬运工人，构建时传入要处理的事件名
class TransportWorker {
  //和总站建立连接
  constructor(event = "default") {
    this.port = chrome.runtime.connect({
      name: event,
    });
    this.event = event;
    this.handler = [];
    this.port.onMessage.addListener((message) => {
      for (let func of this.handler) func(message);
    });
  }
  //传入一个函数，用于接收Station传回的数据，该函数有一个data参数
  handleWith(func) {
    this.handler.push(func);
  }
  //向Station发送数据
  post(data = {}) {
    this.port.postMessage({
      event: this.event,
      data: data,
    });
  }
  disconnect() {
    this.port.disconnect();
  }
}

//数据处理总站
class TransportStation {
  //事件列表，只有在列表里的事件才会被处理
  eventList = new Map([["default", () => {}]]);
  //事务列表，有新连接时就将该连接加入事务列表
  transactions = new Set();
  constructor() {
    chrome.runtime.onConnect.addListener((port) => {
      this.transactions.add(port);
      port.onDisconnect.addListener((port) => this.transactions.delete(port)); //删除断开连接的事务
      port.onMessage.addListener(async (message) => {
        const { event = "default", data = null } = message;
        const eventResponse = this.eventList.get(event) || this.eventList.get("default"); //处理特定事件
        //向对应的搬运工人都发送该事件的处理结果
        const result = await eventResponse(data);
        for (let transaction of this.transactions) {
          if (transaction.name != event) continue;
          transaction.postMessage(result);
        }
      });
    });
  }
  //为事件创建处理函数
  manage(event, callback = () => {}) {
    if (!event) return;
    this.eventList.set(event, callback);
  }
}

class TabGroup {
  tabContainer = html(`<div class="ui-tab-tabs"></div>`);
  tabs = new Map();
  node = null;
  /**
   * 构造一个tab组
   * @param {String} name tab组的名称
   * @param {Node} node tab组的父元素
   */
  constructor(name, node) {
    this.name = name;
    this.node = node;
    node.append(this.tabContainer);
  }
  /** 添加一个tab
   * @param {string} tabName tab名称
   * @param {Node} content tab内容
   */
  add(tabName, content) {
    let dataTarget = this.name + "-" + Math.random().toString().slice(2);
    content = typeof content === "function" ? content() : content;
    content = typeof content === "string" ? html(`<div>${content}</div>`) : content;
    if (content.id) {
      dataTarget = content.id;
    } else {
      content.id = dataTarget;
    }
    const title = html(`<button data-target="${dataTarget}" name="tab-button-${this.name}" class="ui-tab-tab" is-tab>${tabName}</button>`);
    content.classList.add("ui-tab-content");
    this.tabs.set(tabName, [title, content]);
    if (this.node) {
      if (!this.node.querySelector('[class*="active"]')) {
        title.setAttribute("open", true);
        content.classList.add("active");
      }
      this.tabContainer.append(title);
      this.node.append(content);
    }
  }
  /**
   * 删除tab
   * @param {String} tabName
   * @returns Boolean
   */
  delete(tabName) {
    if (!this.tabs.has(tabName)) return false;
    const [title, content] = this.tabs.get(tabName);
    title.remove();
    content.remove();
    this.tabs.delete(tabName);
    if (this.tabs.size > 0) this.tabs.get([...this.tabs.keys()][0])[0].click();
    return true;
  }
}

class Table {
  table = html(`<table class="ui-table"><thead><tr></tr></thead><tbody></tbody></table>`);
  /**
   * 构造一个表格
   * @param  {...Node} heads 表格标题
   */
  constructor(...heads) {
    for (let i of heads) {
      const td = document.createElement("th");
      td.append(typeof i == "function" ? i() : i);
      this.table.querySelector("thead>tr").append(td);
    }
  }
  /**
   * 添加一行项目
   * @param  {...Node} items 表格项目
   */
  add(...items) {
    const tr = document.createElement("tr");
    for (let i of items) {
      const td = document.createElement("td");
      td.append(typeof i == "function" ? i() : i);
      tr.append(td);
    }
    this.table.querySelector("tbody").append(tr);
  }
}

export { html, TransportWorker, TransportStation, presetColors, TabGroup, Table };
