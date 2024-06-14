const battery = await navigator.getBattery();
/**
 * 每20秒发送一次消息，以延长 ServiceWorker 生命周期，从而确保chromeOS壁纸更换功能正常运行
 * 顺便发送电池信息
 */
setInterval(async () => {
  (await navigator.serviceWorker.ready).active.postMessage({
    batteryCharging: battery.charging,
    batteryLevel: battery.level,
  });
}, 2e4);
