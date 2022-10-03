import {
    dom,
    i18n,
    presetColors,
    Drag,
    Db,
    Background,
    HotKey,
    TransportWorker,
    defaultConfig
} from "./tools.js";


class Note {
    //新建一个便签。传入便签的父元素、便签配置和同步对象。
    constructor(container, note, syncWorker) {
        this.maxWidth = window.innerWidth - note.size[0]; //规定便签最大据离左部多少px
        this.maxHeight = window.innerHeight - note.size[1]; //规定便签最大据离顶部多少px
        this.note = note;
        this.syncWorker = syncWorker;
        this.programControl = false;
        const style = dom(`<style>
        #${note.id} {
            width:${note.size[0]}px;
            height:${note.size[1]}px;
            top:${(note.position[1]<0)?5:(note.position[1]>this.maxHeight)?this.maxHeight-5:note.position[1]}px;
            left:${(note.position[0]<0?5:(note.position[0]>this.maxWidth)?this.maxWidth-5:note.position[0])}px;
            background-color:rgba(255 255 255 / ${note.opacity});
        }
        #${note.id}>div.noteTitle {
            color:${note.fontColor};
            background-color: ${note.color};
        }
        #${note.id}>div.noteTitle::after {
            content:"${note.title}"
        }
        #${note.id}>textarea {
            height:${note.size[1]-30}px;
            font-size: ${note.fontSize};
        }
    </style>`);
        this.noteContainer = dom(`<div class="note noteappear" id="${note.id}"><div class="noteTitle"></div><textarea class="noteContent">${note.content}</textarea></div>`);
        container.append(this.noteContainer);
        document.head.append(style);
        const title = this.noteContainer.querySelector(".noteTitle");
        //监听删除便签。
        title.addEventListener("click", () => {
            if (!hotKey.has("Shift")) return;
            Note.deleteNote(note.id);
            syncWorker.post({
                event: "delete",
                tabId: currentTab.id,
                noteId: note.id
            });
        });
        this.setDrag(title);
        this.listenStyleChange();
        this.listenContentChange();
    };
    //返回一个同步对象，用于在不同新标签页之间同步便签数据
    static noteSync() {
        const worker = new TransportWorker("noteSync");
        worker.handleWith(data => {
            if (data.tabId == currentTab.id) return;
            if (data.event == "delete") return Note.deleteNote(data.noteId);
            if (data.event == "create") return new Note(document.body, data.note, worker);
        });
        return worker;
    };
    //删除便签
    static deleteNote(noteId) {
        delete conf.notes[noteId];
        db_Config.set("notes", conf.notes, true);
        document.querySelector("#" + noteId).remove();
    };
    //监听新建便签
    static newNoteTrigger(syncWorker) {
        const create = note => {
            conf.notes[note.id] = note;
            db_Config.set("notes", conf.notes, true);
            new Note(document.body, note, syncWorker);
            syncWorker.post({
                event: "create",
                note: note,
                tabId: currentTab.id
            });
        };
        //按住Ctrl并点击新标签页处新建
        document.body.addEventListener("click", e => {
            if (!hotKey.has("Control")) return;
            setTimeout(() => {
                layui.use(() => {
                    layui.layer.prompt({
                        value: conf.defaultNote.title,
                        title: i18n("newTab_requireNoteTitle")
                    }, (value, index, elem) => {
                        layer.close(index);
                        if (!value) return;
                        const note = {
                            id: "note" + Math.floor(new Date()),
                            title: value,
                            color: presetColors[Math.floor((Math.random() * presetColors.length))],
                        };
                        Object.assign(note, conf.defaultNote);
                        note.position = [e.clientX, e.clientY];
                        create(note);
                    });
                });

            }, 10);
        });
        //快捷键新建
        chrome.commands.onCommand.addListener(command => {
            if (command != "newNote") return;
            const note = {
                id: "note" + Math.floor(new Date()),
                title: conf.defaultNote.title,
                color: presetColors[Math.floor((Math.random() * presetColors.length))],
            };
            Object.assign(note, conf.defaultNote);
            create(note);
        });
    };
    //从一堆完整的便签配置项加载便签
    static loadNotes(notes, syncWorker) {
        for (let note in notes) new Note(document.body, notes[note], syncWorker);
    };
    //修改便签样式
    changeStyle(styles = {}) {
        const {
            position = [null, null], size = [null, null]
        } = styles;
        position[0] && (this.noteContainer.style.left = `${position[0]}px`);
        position[1] && (this.noteContainer.style.top = `${position[1]}px`);
        size[0] && (this.noteContainer.style.width = `${size[0]}px`);
        size[1] && (this.noteContainer.style.height = `${size[1]}px`);
    };
    //保存便签配置
    save(items) {
        for (let item in items) this.note[item] = items[item];
        conf.notes[this.note.id] = this.note;
        db_Config.set("notes", conf.notes, true);
    };
    //为便签设置拖拽
    setDrag(title) {
        const drag = new Drag(title);
        drag.onStart(() => {
            const style = getComputedStyle(this.noteContainer);
            return [style.left.replace(/[a-z]/g, ""), style.top.replace(/[a-z]/g, "")];
        });
        drag.onDragging(e => {
            let newPosX = Number(drag.posX) + (e.clientX - drag.prevMoveX);
            let newPosY = Number(drag.posY) + (e.clientY - drag.prevMoveY);
            this.changeStyle({
                position: [newPosX, newPosY]
            });
        });
    };
    //监听便签内容变化，并同步数据。
    listenContentChange() {
        const textarea = this.noteContainer.querySelector(".noteContent");
        this.syncWorker.handleWith(data => {
            if (data.tabId == currentTab.id) return;
            if (data.event == "syncContent") {
                textarea.value = data.content;
            };
        });
        textarea.addEventListener("input", e => {
            this.syncWorker.post({
                tabId: currentTab.id,
                event: "syncContent",
                content: e.target.value
            });
            this.save({
                content: e.target.value
            });
        });
    };
    //监听便签样式变化，并同步数据
    listenStyleChange() {
        this.syncWorker.handleWith(data => {
            if (data.tabId == currentTab.id) return;
            if (data.event == "syncStyle") {
                if (data.noteId != this.note.id) return;
                //为当前便签设置“正在被程序控制”的flag
                this.programControl = true;
                this.changeStyle(data);
            };
        });
        //检测便签样式变化
        new MutationObserver(async (mutationList, observer) => {
            const style = getComputedStyle(mutationList[0].target);
            const position = [style.left.replace(/[a-z]/g, ""), style.top.replace(/[a-z]/g, "")];
            const size = [style.width.replace(/[a-z]/g, ""), style.height.replace(/[a-z]/g, "")];
            this.save({
                position: position,
                size: size
            });
            //如果当前便签正在被程序控制，就什么也不做，避免造成鬼畜，但是把“正在被程序控制”改为false。
            //下一次样式变化时，如果该flag还是false，就说明当前没有被程序控制，可以将自身的样式同步给其他tab
            if (this.programControl) {
                this.programControl = false;
                return;
            };
            this.syncWorker.post({
                tabId: currentTab.id,
                event: "syncStyle",
                noteId: this.note.id,
                position: position,
                size: size
            });
        }).observe(this.noteContainer, {
            arrtibutes: true,
            attributeFilter: ["style"]
        });
    };
};

const db = await new Db().use("Picture", "Config");
const db_Config = db.open("Config");
const conf = await db_Config.getMutiple(defaultConfig);
const hotKey = new HotKey();
const currentTab = await chrome.tabs.getCurrent();
const noteSync = Note.noteSync();

document.head.querySelector("title").innerText = i18n("newTab_title");
await new Background(db, document.body, conf).apply();
Note.loadNotes(conf.notes, noteSync);
Note.newNoteTrigger(noteSync);

//background.js作为Service Worker，最多5分钟就会停止活动。用alarms API唤醒background.js
chrome.alarms.create("wakeUp", {
    delayInMinutes: 5
});