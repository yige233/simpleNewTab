import { Config } from "./config.js";
import PICTURE from "./pictures.js";
import { Messenger, StorageByCache, presetColors } from "./util.js";
import i18n from "./lang/main.js";

/** 电池信息 */
const battery = { charging: true, level: 1 };
/** 是否正在缓存图片 */
let caching = false;
/** 设置端口监听回调函数 */
const setPortHandler = Messenger.backgroundInit();

const htmlModifyList = {
  ["{{newtab-title}}"]: i18n("newTab.title"),
  ["{{settings-title}}"]: i18n("settings.title"),
  ["{{settings-brand}}"]: i18n("settings.title"),
  ["{{settings-to-top}}"]: i18n("settings.top"),
  ["{{settings-ext-link}}"]: i18n("settings.apiPage"),
  ["{{settings-api-link}}"]: i18n("settings.extPage"),
  ["{{settings-index}}"]: i18n("settings.index"),
};

/**
 * 创建离屏文档
 * @param {boolean} retry 是否重试
 * @returns
 */
async function createOffscreen(retry = true) {
  try {
    await chrome.offscreen.createDocument({
      url: "../html/offscreen.html",
      reasons: ["BATTERY_STATUS"],
      justification: "保持后台 ServiceWorker 始终运行，以及向扩展程序传递电池信息",
    });
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const allClients = await clients.matchAll();
    const hasOffscreen = allClients.some((client) => new URL(client.url).pathname.endsWith("offscreen.html"));
    if (!hasOffscreen) {
      if (retry) {
        return createOffscreen(false);
      }
      console.warn("没有检测到离屏文档，后台服务可能会随时被浏览器清除，依赖后台服务的功能可能会出现异常");
    }
  }
}

/** 获取电池信息 */
function getBatteryInfo(e) {
  const { data } = e;
  battery.charging = data.batteryCharging;
  battery.level = data.batteryLevel;
}

/**
 * 获取随机图片
 * @param {boolean} useCache 是否使用缓存，默认true
 * @returns
 */
async function getPicture(useCache = true) {
  const { config } = await Config.init();
  const Picture = PICTURE.init(config.apis);
  return Picture.getRandomPic(config.preferBing, useCache);
}

/** 缓存图片任务 */
async function cachingPic() {
  if (caching) return "有正在进行中的缓存任务";
  const { config } = await Config.init();
  const Picture = PICTURE.init(config.apis);
  caching = true;
  const image = await getPicture(false);
  if (image && image.type) {
    Picture.setPicCache("cachedPic", image);
    caching = false;
    return image.message;
  }
  caching = false;
  return "缓存失败";
}

/** 闹钟处理 */
async function alarmHandler(alarm) {
  const { name: alarmName } = alarm;
  if (alarmName == "wallpaper-switch") {
    setChromeOSWallpaper();
  }
}

/** 设置ChromeOS壁纸 */
async function setChromeOSWallpaper() {
  const {
    config: {
      chromeOSwallpaper: { enable, minBatteryLevel },
    },
  } = await Config.init();
  if (!chrome.wallpaper) return console.warn("当前设备不支持设置ChromeOS壁纸");
  if (!enable) return console.warn("ChromeOS壁纸功能未启用");
  if (!battery.charging && battery.level < minBatteryLevel / 100) {
    return console.warn(new Date().toLocaleDateString(), "当前设备电量过低，不切换壁纸");
  }
  const image = await getPicture();
  if (!image) {
    return console.warn(new Date().toLocaleDateString(), "获取壁纸失败");
  }
  await chrome.wallpaper.setWallpaper({
    data: await image.pic.arrayBuffer(),
    layout: "CENTER_CROPPED",
    filename: image.message,
  });
  cachingPic();
}

/** 设置闹钟 */
async function createAlarm() {
  const {
    config: {
      chromeOSwallpaper: { enable, switchPeriod },
    },
  } = await Config.init();
  if (switchPeriod == 0) return;
  if (enable && chrome.wallpaper) {
    chrome.alarms.create("wallpaper-switch", {
      periodInMinutes: switchPeriod,
    });
  }
}

async function fetchHandler(event) {
  //如果请求模式是navigate
  if (event.request.mode == "navigate") {
    try {
      const origIndex = await fetch(event.request);
      let responseText = await origIndex.text();
      for (let i in htmlModifyList) {
        responseText = responseText.replace(i, htmlModifyList[i]);
      }
      return new Response(responseText, { status: 200, headers: { "content-type": "text/html;charset=UTF-8" } });
    } catch {
      return fetch(event.request);
    }
  }
  return fetch(event.request);
}

createOffscreen();
createAlarm();
setPortHandler("cachePic", cachingPic);
setPortHandler("noteSync");
setPortHandler("chromeos-wallpaper-switch", setChromeOSWallpaper);

self.addEventListener("message", getBatteryInfo);
chrome.runtime.onStartup.addListener(() => createOffscreen());
chrome.runtime.onInstalled.addListener(async (detail) => {
  const { version, homepage_url } = chrome.runtime.getManifest();
  const CONFIG = await Config.init();
  const config = CONFIG.config;
  if (["install", "update"].includes(detail.reason)) {
    if (detail.reason == "install") {
      chrome.tabs.create({ url: homepage_url });
    }
    if (detail.reason == "update" && detail.previousVersion != version && config.updateTip) {
      const STORAGE = new StorageByCache("cache-storage");
      const notiId = "extension-updated";
      if (!config.notes.includes(notiId)) {
        config.notes.push(notiId);
        CONFIG.$("config.notes", config.notes);
      }
      await STORAGE.set(`notes/${notiId}`, {
        id: notiId,
        title: i18n("updateTip.name"),
        content: i18n("updateTip.desc").replace("{version}", version).replace("{homepage}", homepage_url),
        color: presetColors[Math.floor(Math.random() * presetColors.length)],
        size: [500, 275],
      });
    }
    CONFIG.save();
  }
});
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: "../html/options.html" }));
chrome.alarms.onAlarm.addListener(alarmHandler);

self.addEventListener("fetch", (event) => event.respondWith(fetchHandler(event)));
