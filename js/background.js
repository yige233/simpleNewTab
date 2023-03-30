import pictures from "./pictures.js";
import { TransportStation } from "./toolkit.js";

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: "../html/options.html",
  });
});

chrome.runtime.onInstalled.addListener((detail) => {
  if (["install", "update"].includes(detail.reason)) {
    chrome.tabs.create({
      url: "https://github.com/yige233/simpleNewTab#simplenewtab",
    });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log("服务工作进程被唤醒", new Date());
});

(async () => {
  const station = new TransportStation();
  const libPicture = await pictures;
  let caching = false;

  //同步便签
  station.manage("noteSync", (data) => data);

  //后台刷新壁纸缓存
  station.manage("cachePic", async () => {
    if (caching) return false;
    caching = true;
    const imageFromApi = await libPicture.getApi();
    if (imageFromApi) {
      console.log("预加载图像：", imageFromApi.message || null);
      libPicture.setPic("cachedPic", imageFromApi);
      caching = false;
      return true;
    }
    const imageFromBing = await libPicture.getBing();
    if (imageFromBing) {
      console.log("预加载图像：", imageFromBing.message || null);
      libPicture.setPic("cachedPic", imageFromBing);
      caching = false;
      return true;
    }
    caching = false;
    return false;
  });
})();
