import config from "./config.js";
import database from "./database.js";

import randomPicV1 from "./adapters/random-pic-v1.js";
import randomPicV2 from "./adapters/random-pic-v2.js";

class Picture {
  adapters = new Map();
  instances = [];
  constructor(...adapters) {
    for (const adapter of adapters) {
      this.adapters.set(adapter.adapterName, adapter);
    }
  }
  init(apis) {
    for (const api of apis) {
      if (this.adapters.has(api.type)) {
        const adapter = this.adapters.get(api.type);
        this.instances.push({
          api: api.api,
          weight: api.weight || 10,
          instance: adapter.new(api.api, api.config || adapter.configTemplate),
          type: adapter.adapterName,
        });
      }
    }
    return this;
  }
  async setPic(key = "cachedPic", data = null) {
    if (!["cachedPic", "defaultPic"].includes(key)) return false;
    return (await database).open("Picture").set(key, data, true);
  }
  async getDbPic(key = "cachedPic") {
    if (!["cachedPic", "defaultPic"].includes(key)) return false;
    return (await database).open("Picture").get(key);
  }
  async removePic(key = "cachedPic") {
    if (!["cachedPic", "defaultPic"].includes(key)) return false;
    return (await database).open("Picture").remove(key);
  }
  async getBing() {
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      setTimeout(() => controller.abort(), 1 * 1000); //控制超时时间
      const res = await fetch("https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1", {
        signal: signal,
      });
      const {
        images: [{ url, copyright, title }],
      } = await res.json();
      const pic = await fetch(`https://cn.bing.com${url}`);
      return {
        message: copyright + " 来自 cn.bing.com",
        name: title,
        pic: await pic.blob(),
        type: "bingPic",
      };
    } catch (err) {
      return null;
    }
  }
  async getApi() {
    const pool = [];
    if (this.instances.length == 0) return false;
    for (let i in this.instances) {
      pool.push((pool[i - 1] || 0) + Number(this.instances[i].weight));
    }
    const luckyNum = Math.floor(Math.random() * pool[pool.length - 1] + 1); //在 1 到之前累加的 最大值+1 的范围内生成随机数
    for (let i in pool) {
      if (luckyNum > pool[i]) continue; //如果随机数大于某项的累加，说明没有随机到该项
      const data = await this.instances[i].instance.get();
      if (data) {
        data.type = this.instances[i].type;
        data.api = this.instances[i].api;
      }
      return data || false;
    }
  }
}

const libPicture = new Picture(randomPicV2, randomPicV1);

export default Promise.resolve(config).then((res) => libPicture.init(res.config.apis));
