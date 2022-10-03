//从字符串创建dom元素
function dom(str) {
    let body = new DOMParser().parseFromString(str, 'text/html').body.children[0];
    return body || new DOMParser().parseFromString(str, 'text/html').head.children[0];
};

//获取国际化翻译文本
function i18n(content) {
    return chrome.i18n.getMessage(content);
};

//预设颜色
const presetColors = ["#464646", "#66CCCC", "#CCFF66", "#FF99CC", "#FF9999", "#FFCC99", "#FF6666", "#FFFF66", "#99CC66", "#666699", "#99CC33", "#FF9900", "#FFCC00", "#FF0033", "#FF9966", "#CCFF00", "#CC3399", "#FF6600", "#993366", "#CCCC33", "#666633"];


//访问indexeddb数据库存储。
class Db {
    db = null;
    //获取数据库中的一张表，传入表名。若不存在则创建。
    constructor() {};
    use(...tables) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("SimpleNewTab"); //数据库名写死
            request.onerror = err => {
                console.warn("打开数据库失败", err);
                reject(false);
            };
            request.onsuccess = e => {
                this.db = e.target.result;
                resolve(new class {
                    constructor(db) {
                        this.db = db;
                    };
                    open(tableName = "") {
                        if (!this.db.objectStoreNames.contains(tableName)) return false;
                        return new Table(this.db, tableName);
                    };
                }(this.db));
            };
            request.onupgradeneeded = async e => {
                this.db = e.target.result;
                for (let table of tables) {
                    if (!this.db.objectStoreNames.contains(table)) {
                        await new Promise(resolve => {
                            this.db.createObjectStore(table, {
                                keyPath: 'id'
                            });
                            resolve();
                        })
                    };
                };
            };
        });
    };
    static async init() {
        const db = await new Db().use("Picture", "Config");
        const db_Config = db.open("Config");
        await db_Config.setMutiple(defaultConfig);
    };
};

//打开一张表
class Table {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    };
    //获取表中主键为id的数据
    get(id) {
        return new Promise(resolve => {
            const request = this.db.transaction([this.tableName], 'readwrite').objectStore(this.tableName).get(id);
            request.onerror = e => resolve(null);
            request.onsuccess = e => {
                if (typeof (request.result) != "undefined") return resolve(request.result.data)
                return resolve(null);
            };
        });
    };
    async getMutiple(keys) {
        const result = {};
        for (let key in keys) {
            const res = await this.get(key);
            result[key] = typeof (res) == "undefined" ? keys[key] : res;
        };
        return result;
    };
    //添加主键为id的数据
    set(id, data = {}, overwrite = false) {
        return new Promise(resolve => {
            if (typeof (data) === "undefined" || !id) return resolve(false);
            this.get(id).then(() => {
                if (!overwrite) throw "not allowed to overwrite data";
                const request = this.db.transaction([this.tableName], 'readwrite').objectStore(this.tableName).put({
                    id: id,
                    data: data
                });
                request.onsuccess = e => resolve(true);
                request.onerror = e => resolve(false);
            }).catch(() => {
                const request = this.db.transaction([this.tableName], 'readwrite').objectStore(this.tableName).add({
                    id: id,
                    data: data
                });
                request.onsuccess = e => resolve(true);
                request.onerror = e => resolve(false);
            });
        });
    };
    async setMutiple(data, overwrite = false) {
        for (let key in data) {
            await this.set(key, (data[key] === false) ? false : data[key] || "", overwrite);
        };
    };
    //清除主键为id的数据
    remove(id) {
        return new Promise(resolve => {
            const request = this.db.transaction([this.tableName], 'readwrite').objectStore(this.tableName).delete(id);
            request.onsuccess = e => resolve(true);
        });
    };
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
        this.target.addEventListener("dragstart", e => {
            e.preventDefault();
        });
    };
    //拖动开始，传入一个回调函数，参数为mousedown事件，应当返回一个包含元素初始坐标[x,y]的数组。可能会出现各种莫名其妙的需求，所以这一步可以自定义。
    onStart(func) {
        this.target.addEventListener("mousedown", e => {
            this.prevMoveX = e.clientX; //设置上一次拖动时的坐标为当前鼠标的坐标
            this.prevMoveY = e.clientY;
            [this.posX, this.posY] = func(e); //设置当前元素的坐标
            this.dragging = true; //标志开始拖动
        });
    };
    //拖动时，传入一个回调函数，参数为mousemove事件，应当在这里为元素设置新坐标，一个例子是：从const newPosX = Number(Drag.posX) + (e.clientX - Drag.prevMoveX); Drag.style.left = `${newPosX}px`;
    //元素的新坐标x = 原始坐标 + （当前鼠标坐标 - 上一次鼠标坐标）
    onDragging(func) {
        window.addEventListener("mousemove", e => {
            if (this.dragging) func(e);
        });
    };
};

//搬运工人，构建时传入要处理的事件名
class TransportWorker {
    //和总站建立连接
    constructor(event = "default") {
        this.port = chrome.runtime.connect({
            name: event
        });
        this.event = event;
        this.handler = [];
        this.port.onMessage.addListener(message => {
            for (let func of this.handler) func(message);
        });
    };
    //传入一个函数，用于接收Station传回的数据，该函数有一个data参数
    handleWith(func) {
        this.handler.push(func);
    };
    //向Station发送数据
    post(data = {}) {
        this.port.postMessage({
            event: this.event,
            data: data
        });
    };
    disconnect() {
        this.port.disconnect();
    };
};

//获取随机图片
class Picture {
    constructor() {};

    //从缓存获取图片
    getFromCache(db) {
        return db.get("cachedPic");
    };
    //从API获取随机图片
    async getFromApi(apis = [], maxTryCount = 1) {
        async function getPicName(api) {
            try {
                const controller = new AbortController();
                const signal = controller.signal;
                setTimeout(() => controller.abort(), 1000); //控制超时时间
                const res = await fetch(`${api}random`, {
                    signal: signal
                });
                const resJson = await res.json();
                return [res.ok, resJson];
            } catch {
                return [false, {
                    message: "网络请求失败或被中断。"
                }];
            };
        };

        let tryCount = 0;
        maxTryCount = maxTryCount < 1 ? 1 : maxTryCount;

        if (!apis.length) {
            return {
                ok: false,
                message: "没有可用的api。"
            };
        };

        while (tryCount < maxTryCount) {
            const api = new URL(apis[Math.floor((Math.random() * apis.length))]).toString();
            const [result, json] = await getPicName(api);
            if (!result) {
                console.warn("第", tryCount + 1, "次尝试从", api, "获取图片失败:", json.message);
                tryCount++;
                continue;
            };
            const pic = await fetch(`${api}pic?name=${json.pic}`);
            return {
                ok: true,
                message: json.pic + " 来自 " + api,
                type: "api",
                pic: await pic.blob()
            };
        };
        return {
            ok: false,
            message: "尝试了" + maxTryCount + "次获取图片，均失败。"
        };
    };

    //从Bing获取图片
    async getFromBing() {
        try {
            const controller = new AbortController();
            const signal = controller.signal;
            setTimeout(() => controller.abort(), 1 * 1000); //控制超时时间
            const res = await fetch("https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1", {
                signal: signal
            });
            const json = await res.json();
            const pic = await fetch(`https://cn.bing.com${json.images[0].url}`);
            return {
                ok: true,
                message: json.images[0].copyright + " 来自 cn.bing.com",
                type: "bing",
                pic: await pic.blob()
            };
        } catch (err) {
            return {
                ok: false,
                message: err.message
            };
        };
    };

    //从默认壁纸获取图片
    getFromDefault(db) {
        return db.get("defaultPic");
    };
};

//设置背景
class Background { //传入数据库，背景的容器元素，背景相关的配置
    constructor(db, container, conf) {
        this.container = container;
        this.conf = conf;
        this.db = db.open("Picture")
        this.setStyle();
        this.worker = new TransportWorker("cachePic"); //用于通知后台刷新缓存
        this.worker.handleWith(res => {
            console.log("后台缓存图片结果：", res);
            if (res === null) this.worker.post(conf.api);
        });
    };
    //为背景设置拖拽
    setDrag(target) {
        const drag = new Drag(target);
        drag.onStart(() => {
            const style = getComputedStyle(target);
            return style['backgroundPosition'].replace(/%/g, "").split(" ");
        });
        drag.onDragging(e => {
            let newPosX = Number(drag.posX) - (e.clientX - drag.prevMoveX) / this.conf.dragSenstive;
            let newPosY = Number(drag.posY) - (e.clientY - drag.prevMoveY) / this.conf.dragSenstive;
            target.style.backgroundPosition = `${newPosX}% ${newPosY}%`;
        });
    };
    //获取图片
    async getPic() {
        const Pic = new Picture();
        const cache = await Pic.getFromCache(this.db); //是否存在缓存图片
        if (cache && cache.ok) { //存在缓存
            if (cache.type == "api" || (this.conf.preferBing && cache.type == "bing")) { //缓存类型是api，或者缓存类型是bing且优先bing
                console.log("从缓存中加载：", cache.message);
                return cache;
            };
        };
        const picFromApi = await Pic.getFromApi(this.conf.api); //不存在缓存图片，直接从api获取图片，并后台缓存新图片
        if (picFromApi && picFromApi.ok) {
            console.log("从api获取：", picFromApi.message);
            return picFromApi;
        };
        const picFromBing = await Pic.getFromBing() || {
            ok: false
        }; //从API获取图片失败，获取bing图片
        const defaultPic = await Pic.getFromDefault(this.db) || {
            ok: false
        }; ///从API获取新图片失败，获取默认图片
        const picOK = [picFromBing, defaultPic].filter(i => i.ok); //筛选成功获取到图片的源
        if (picOK.length == 2) { //如果两个都获取成功，根据preferBing来判断使用哪个
            if (this.conf.preferBing) {
                console.log("从Bing获取:", picFromBing.message);
                return picFromBing;
            };
            console.log("用户设置的默认图片:", defaultPic.message);
            return defaultPic;
        };
        if (picOK.length == 1) { //只有一个获取成功，只能用它了
            console.log(picOK[0].type == "bing" ? "从Bing获取:" : "用户设置的默认图片:", picOK[0].message);
            return picOK[0];
        };
        return {
            ok: false
        };
    };
    //设置背景
    async apply() {
        const {
            ok,
            pic
        } = await this.getPic();
        this.worker.post(this.conf.api);
        if (!ok) { //获取所有图片源都失败，使用浏览器默认新标签页
            chrome.tabs.create({
                url: "chrome-search://local-ntp/local-ntp.html"
            });
            return window.close();
        };
        const background = dom(`<div class="wallpaper appear hide" style='background-image: url("${URL.createObjectURL(pic)}");z-index:-999;'></div>`);
        this.container.append(background);
        if (this.conf.allowDrag) this.setDrag(background);
        await new Promise(resolve => {
            background.addEventListener("animationstart", () => {
                background.classList.toggle("hide");
            });
            background.addEventListener("animationend", () => resolve());
        });
    };
    //设置相关样式
    setStyle() {
        const keyframesArr = [];
        for (let [name, style] of this.conf.keyframes) {
            keyframesArr.push(`${name} {${style.join("\n")}}`);
        };
        const style = `<style>
            @keyframes appear {${keyframesArr.join("\n")}}
            body{background-color: ${this.conf.bgColor};}
            .appear {animation: appear ${this.conf.animation.duration} ${this.conf.animation.function} ${this.conf.animation.delay} 1 normal forwards;}
            .hide {opacity:0}
        </style>`;
        document.head.append(dom(style));
    };
};

//检测按键
class HotKey {
    activeKeys = new Set();
    constructor() {
        window.addEventListener("keydown", e => {
            this.activeKeys.add(e.key); //有按键按下时，将其添加进Set
        });
        window.addEventListener("keyup", e => {
            this.activeKeys.delete(e.key); //松开后将其从Set删除
        });
    };
    has(...keys) {
        let hasKeys = false;
        for (let key of keys) {
            if (this.activeKeys.has(key)) {
                this.activeKeys.delete(key); //检测到按键后也将其删除，避免出现循环
                hasKeys = true;
            } else hasKeys = false;
        };
        return hasKeys;
    };
};

//默认设置
const defaultConfig = {
    bgColor: '#464646',
    api: ["http://localhost:3000/"],
    allowDrag: true,
    preferBing: false,
    dragSenstive: 10,
    animation: {
        delay: "0s",
        duration: "0.2s",
        function: "ease-out"
    },
    keyframes: [
        ["from", ["top:100%;"]],
        ["to", ["top:0%;"]]
    ],
    defaultNote: {
        title: i18n("conf_defaultNote_defaultTitle_value"),
        size: [300, 300],
        position: [300, 300],
        fontColor: "#000",
        content: "",
        opacity: "60%",
        fontSize: "16px"
    },
    notes: {}
};

export {
    dom,
    i18n,
    Drag,
    TransportWorker,
    Db,
    Picture,
    Background,
    HotKey,
    presetColors,
    defaultConfig,
}