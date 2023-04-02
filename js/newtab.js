import { TransportWorker, html, presetColors } from "./toolkit.js";
import i18n from "./lang/main.js";
import configuration from "./config.js";
import database from "./database.js";
import pictures from "./pictures.js";

class Note {
  static listenNewNote(parentElem) {
    function newNote(note) {
      noteSync.post({
        event: "create",
        note: Object.assign({}, config.defaultNote, note),
        tabId: currentTab.id,
      });
    }
    noteSync.handleWith((data) => {
      if (data.event == "create") return new Note(parentElem, data.note).saveConfig();
    });
    //快捷键新建
    chrome.commands.onCommand.addListener((command) => {
      if (command != "newNote") return;
      newNote({
        id: "note" + Math.floor(new Date()),
        title: config.defaultNote.title,
        color: presetColors[Math.floor(Math.random() * presetColors.length)],
      });
    });
    window.addEventListener("click", (e) => {
      if (!(e.ctrlKey || e.metaKey) || ![...e.target.classList.values()].includes("wallpaper")) return;
      const inputElem = html(`<input class="ui-input" value="${config.defaultNote.title}" placeholder="${config.defaultNote.title}" />`);
      const prompt = new Dialog({
        content: inputElem,
        title: i18n.newTab.newNote,
        buttons: [
          {
            value: "确定",
            events: () => {
              const value = inputElem.value || null;
              prompt.remove();
              if (!value) return;
              newNote({
                id: "note" + Math.floor(new Date()),
                title: value,
                color: presetColors[Math.floor(Math.random() * presetColors.length)],
                position: [e.clientX, e.clientY],
              });
            },
          },
          {},
        ],
      });
      prompt.addEventListener("hide", () => prompt.remove());
    });
  }
  programControl = false;
  constructor(parentElem, note) {
    this.note = note;
    this.config = {
      maxWidth: window.innerWidth - note.size[0],
      maxHeight: window.innerHeight - note.size[1],
    };
    noteSync.handleWith((data) => {
      if (data.event == "delete") return this.delete(data.noteId);
    });
    parentElem.append(this.noteDiv());
    return this;
  }
  delete(noteId = this.note.id) {
    document.querySelector("#" + noteId).remove();
    delete config.notes[noteId];
    setConf("notes", config.notes, true);
  }
  noteDiv() {
    const body = html(`<div class="note noteappear" id="${this.note.id}"><div class="note-title"></div><textarea class="note-content">${this.note.content}</textarea></div>`);
    const title = body.querySelector(".note-title");
    const content = body.querySelector(".note-content");
    const drag = new Drag(title);
    this.setStyle();
    title.addEventListener("click", (e) => {
      if (!e.shiftKey) return;
      noteSync.post({
        event: "delete",
        tabId: currentTab.id,
        noteId: this.note.id,
      });
    });
    content.addEventListener("input", (e) => {
      noteSync.post({
        tabId: currentTab.id,
        event: "syncContent",
        content: e.target.value,
      });
    });
    drag.onStart(() => {
      const style = getComputedStyle(body);
      return [style.left.replace(/[a-z]/g, ""), style.top.replace(/[a-z]/g, "")];
    });
    drag.onDragging((e) => {
      let newPosX = Number(drag.posX) + (e.clientX - drag.prevMoveX);
      let newPosY = Number(drag.posY) + (e.clientY - drag.prevMoveY);
      this.changeStyle(body, {
        position: [newPosX, newPosY],
      });
    });
    noteSync.handleWith((data) => {
      if (data.tabId == currentTab.id) return;
      if (data.event == "syncContent") {
        content.value = data.content;
        this.saveConfig({
          content: data.content,
        });
      }
      if (data.event == "syncStyle") {
        if (data.noteId != this.note.id) return;
        //为当前便签设置“正在被程序控制”的flag
        this.programControl = true;
        this.changeStyle(body, data);
        this.saveConfig({
          position: data.position,
          size: data.size,
        });
      }
    });
    new MutationObserver(async (mutationList, observer) => {
      //如果当前便签正在被程序控制，就什么也不做，避免造成鬼畜，但是把“正在被程序控制”改为false。
      //下一次样式变化时，如果该flag还是false，就说明当前没有被程序控制，可以将自身的样式同步给其他tab
      if (this.programControl) return (this.programControl = false);
      const style = getComputedStyle(mutationList[0].target);
      const position = [style.left.replace(/[a-z]/g, ""), style.top.replace(/[a-z]/g, "")];
      const size = [style.width.replace(/[a-z]/g, ""), style.height.replace(/[a-z]/g, "")];
      noteSync.post({
        tabId: currentTab.id,
        event: "syncStyle",
        noteId: this.note.id,
        position: position,
        size: size,
      });
    }).observe(body, {
      arrtibutes: true,
      attributeFilter: ["style"],
    });
    return body;
  }
  saveConfig(items = {}) {
    for (let item in items) this.note[item] = items[item];
    config.notes[this.note.id] = this.note;
    setConf("notes", config.notes, true);
  }
  changeStyle(bodyElem, styles = {}) {
    const { position = [null, null], size = [null, null] } = styles;
    position[0] && (bodyElem.style.left = `${position[0]}px`);
    position[1] && (bodyElem.style.top = `${position[1]}px`);
    size[0] && (bodyElem.style.width = `${size[0]}px`);
    size[1] && (bodyElem.style.height = `${size[1]}px`);
  }
  setStyle() {
    const { id, size, position, opacity, fontColor, color, title, fontSize } = this.note;
    const { maxWidth, maxHeight } = this.config;
    document.head.append(
      html(`<style>
    #${id} {
        width:${size[0]}px;
        height:${size[1]}px;
        top:${position[1] < 0 ? 5 : position[1] > maxHeight ? maxHeight - 5 : position[1]}px;
        left:${position[0] < 0 ? 5 : position[0] > maxWidth ? maxWidth - 5 : position[0]}px;
        background-color:rgba(255 255 255 / ${opacity});
    }
    #${id}>div.note-title {
        color:${fontColor};
        background-color: ${color};
    }
    #${id}>div.note-title::after {
        content:"${title}"
    }
    #${id}>textarea {
        height:${size[1] - 30}px;
        font-size: ${fontSize};
    }
</style>`)
    );
  }
}

//允许拖动元素。
class Drag {
  //传入欲使得可拖动的元素。
  constructor(target) {
    this.target = target; //目标元素
    this.dragging = false; //拖动中的flag
    this.posX = 0; //拖动开始时的坐标x
    this.posY = 0; //拖动开始时的坐标y
    this.prevMoveX = 0; //上一次拖动时的坐标x
    this.prevMoveY = 0; //上一次拖动时的坐标y
    this.onDragEnd = () => {};
    window.addEventListener("mouseup", () => {
      if (this.dragging) {
        this.dragging = false;
        this.onDragEnd();
      }
    });
    this.target.addEventListener("dragstart", (e) => {
      e.preventDefault();
    });
  }
  //拖动开始，传入一个回调函数，参数为mousedown事件，应当返回一个包含元素初始坐标[x,y]的数组。可能会出现各种莫名其妙的需求，所以这一步可以自定义。
  onStart(func) {
    this.target.addEventListener("mousedown", (e) => {
      this.prevMoveX = e.clientX; //设置上一次拖动时的坐标为当前鼠标的坐标
      this.prevMoveY = e.clientY;
      [this.posX, this.posY] = func(e); //设置当前元素的坐标
      this.dragging = true; //标志开始拖动
    });
  }
  //拖动时，传入一个回调函数，参数为mousemove事件，应当在这里为元素设置新坐标，一个例子是：从const newPosX = Number(Drag.posX) + (e.clientX - Drag.prevMoveX); Drag.style.left = `${newPosX}px`;
  //元素的新坐标x = 原始坐标 + （当前鼠标坐标 - 上一次鼠标坐标）
  onDragging(func) {
    window.addEventListener("mousemove", (e) => {
      if (this.dragging) func(e);
    });
  }
}

//设置背景
class Background {
  //传入背景的容器元素，背景相关的配置
  constructor() {
    this.setStyle();
    cachingPic.handleWith((res) => {
      console.log("后台缓存图片结果：", res);
      if (res === null) cachingPic.post();
    });
    cachingPic.post();
  }
  async load(parentElem) {
    const picture = await this.getPic();
    const bgPosition = db.open("BackgroundPosition");
    if (!picture) {
      //获取所有图片源都失败，使用浏览器默认新标签页
      chrome.tabs.create({
        url: "chrome-search://local-ntp/local-ntp.html",
      });
      return window.close();
    }
    const { pic, type, message, name, api } = picture;
    console.log("获取图片：", message);
    const background = html(`<div class="wallpaper appear hide" style='background-image: url("${URL.createObjectURL(pic)}");z-index:-999;'></div>`);
    if (!["bingPic"].includes(type)) {
      //不是从bing获取的图片，可以保存图片位置
      const keyName = `${name},${api}`;
      const position = await bgPosition.get(keyName);
      const positionOld = await bgPosition.get(message);
      if (positionOld) {
        //将旧的键名换成成新的格式
        bgPosition.remove(message);
        bgPosition.set(keyName, positionOld, true);
      }
      const [posX, posY] = position || positionOld || [50, 50];
      background.style.backgroundPosition = `${posX}% ${posY}%`;
      chrome.commands.onCommand.addListener((command) => {
        //检测保存图片位置的快捷键
        if (command != "saveBgPos") return;
        const style = getComputedStyle(background);
        bgPosition.set(keyName, style["backgroundPosition"].replace(/%/g, "").split(" "), true);
      });
      chrome.commands.onCommand.addListener((command) => {
        //检测删除图片位置的快捷键
        if (command != "delBgPos") return;
        bgPosition.remove(keyName);
      });
    }
    parentElem.append(background);
    if (config.allowDrag) {
      const drag = new Drag(background);
      drag.onStart(() => {
        const style = getComputedStyle(background);
        return style["backgroundPosition"].replace(/%/g, "").split(" ");
      });
      drag.onDragging((e) => {
        let newPosX = Number(drag.posX) - (e.clientX - drag.prevMoveX) / config.dragSenstive;
        let newPosY = Number(drag.posY) - (e.clientY - drag.prevMoveY) / config.dragSenstive;
        background.style.backgroundPosition = `${newPosX}% ${newPosY}%`;
      });
    }
    await new Promise((resolve) => {
      background.addEventListener("animationstart", () => {
        background.classList.toggle("hide");
      });
      background.addEventListener("animationend", () => resolve());
    });
  }
  //获取图片
  async getPic() {
    const cache = await libPicture.getDbPic("cachedPic"); //是否存在缓存图片
    //存在缓存,且缓存类型不是bing，或者缓存类型是bing且优先bing
    if (cache && (cache.type != "bingPic" || (config.preferBing && cache.type == "bingPic"))) {
      return cache;
    }
    const picFromApi = await libPicture.getApi(); //不存在缓存图片，直接从api获取图片，并后台缓存新图片
    if (picFromApi) {
      return picFromApi;
    }
    const picFromBing = await libPicture.getBing(); //从API获取图片失败，获取bing图片
    const defaultPic = await libPicture.getDbPic("defaultPic"); ///从API获取新图片失败，获取默认图片
    const picOK = [picFromBing, defaultPic].filter((i) => i); //筛选成功获取到图片的源
    if (picOK.length == 2) {
      //如果两个都获取成功，根据preferBing来判断使用哪个
      if (config.preferBing) {
        return picFromBing;
      }
      return defaultPic;
    }
    if (picOK.length == 1) {
      return picOK[0];
    }
    return null;
  }
  //设置相关样式
  setStyle() {
    const keyframesArr = [];
    for (let [name, style] of config.keyframes) {
      keyframesArr.push(`${name} {${style.join("\n")}}`);
    }
    const style = `<style>
            @keyframes appear {${keyframesArr.join("\n")}}
            body{background-color: ${config.bgColor};}
            .appear {animation: appear ${config.animation.duration} ${config.animation.function} ${config.animation.delay} 1 normal forwards;}
            .hide {opacity:0}
        </style>`;
    document.head.append(html(style));
  }
}

document.head.querySelector("title").innerText = i18n.newTab.title;
const currentTab = await chrome.tabs.getCurrent();
const { config, set: setConf } = await configuration;
const noteSync = new TransportWorker("noteSync");
const cachingPic = new TransportWorker("cachePic");
const db = await database;
const libPicture = await pictures;

await new Background().load(document.body);
for (let note in config.notes) new Note(document.body, config.notes[note]);
Note.listenNewNote(document.body);

//background.js作为Service Worker，最多5分钟就会停止活动。用alarms API唤醒background.js
chrome.alarms.create("wakeUp", {
  delayInMinutes: 5,
});
