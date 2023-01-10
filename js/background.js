import {
    Db,
    Picture,
    defaultConfig
} from "./tools.js";


//数据处理总站
class TransportStation {
    //事件列表，只有在列表里的事件才会被处理
    eventList = new Map([
        ["default", () => {}]
    ]);
    //事务列表，有新连接时就将该连接加入事务列表
    transactions = new Set();
    constructor() {
        chrome.runtime.onConnect.addListener(port => {
            this.transactions.add(port);
            port.onDisconnect.addListener(port => this.transactions.delete(port)); //删除断开连接的事务
            port.onMessage.addListener(async message => {
                const {
                    event = "default", data = null
                } = message;
                const eventResponse = this.eventList.get(event) || this.eventList.get("default"); //处理特定事件
                //向对应的搬运工人都发送该事件的处理结果
                const result = await eventResponse(data);
                for (let transaction of this.transactions) {
                    if (transaction.name != event) continue;
                    transaction.postMessage(result);
                };
            });
        });
    };
    //为事件创建处理函数
    manage(event, callback = () => {}) {
        if (!event) return;
        this.eventList.set(event, callback);
    };
};

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: "../html/options.html"
    });
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.tabs.create({
        url: "https://github.com/yige233/simpleNewTab"
    });
});

chrome.alarms.onAlarm.addListener(alarm => {
    console.log("被唤醒", new Date());
});

(async () => {
    const station = new TransportStation();
    await Db.init();
    let caching = false;
    const db = await new Db().use("Picture", "Config", "BackgroundPosition");
    const db_Config = db.open("Config");
    const conf = await db_Config.getMutiple(defaultConfig);

    //升级配置
    (() => {
        let needUpgrade = false;
        if (!conf.defaultNote.title) {
            needUpgrade = true;
            conf.defaultNote.title = defaultConfig.defaultNote.title;
        };
        if (conf.keyframes.length > 0 && !Array.isArray(conf.keyframes[0])) {
            needUpgrade = true;
            const keyframesArr = [];
            for (let keyframe of conf.keyframes) {
                for (let framename in keyframe) {
                    const stylesArr = [];
                    for (let style in keyframe[framename]) stylesArr.push(`${style}:${keyframe[framename][style]};`);
                    keyframesArr.push([framename, stylesArr]);
                };
            };
            conf.keyframes = keyframesArr;
        };
        needUpgrade && db_Config.setMutiple(conf, true);
    })();

    //同步便签
    station.manage("noteSync", data => data);

    //后台刷新壁纸缓存
    station.manage("cachePic", async apis => {
        if (caching) return false;
        caching = true;
        const picture = new Picture();
        const imageFromApi = await picture.getFromApi(apis);
        if (imageFromApi.ok) {
            console.log("预加载：", imageFromApi.message || null);
            db.open("Picture").set("cachedPic", imageFromApi, true);
            caching = false;
            return true;
        };
        const imageFromBing = await picture.getFromBing();
        if (imageFromBing.ok) {
            console.log("预加载：", imageFromBing.message || null);
            imageFromBing.ok && db.open("Picture").set("cachedPic", imageFromBing, true);
            caching = false;
            return true;
        };
        caching = false;
        return false;
    });
})();