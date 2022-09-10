import {
    Db,
    Picture,
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

//在worker之间传递数据
function passData(data) {
    return data;
};

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: "../html/options.html"
    });
});

chrome.alarms.onAlarm.addListener(function (alarm) {
    console.log("被唤醒", new Date());
});

(async () => {
    const station = new TransportStation();
    await Db.init();
    let caching = false;
    const db = await new Db().use("Picture");
    station.manage("noteSync", passData);
    //后台刷新壁纸缓存
    station.manage("cachePic", async (apis) => {
        if (caching) return false;
        caching = true;
        const picture = new Picture(apis);
        const result = await picture.get();
        console.log("预加载：", result.desc || null);
        caching = false;
        result.ok && db.open("Picture").set("cachedPic", result, true);
        return result.ok;
    });
})();