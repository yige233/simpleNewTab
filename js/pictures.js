import { StorageByCache } from "./util.js";
import randomPicV1 from "./adapters/random-pic-v1.js";
import randomPicV2 from "./adapters/random-pic-v2.js";

/**
 * 约定：
 *  1、图片数据的结构为：
 *    {
        message: "string" //关于该图片的信息
        name: "string", //该图片的名称
        pic: Blob, //该图片的二进制数据
        type: "enum string", //该图片的API类型。如果是用户选择的默认图，则没有。
        api: "string" //该图片的来源API地址。如果是bing或者用户选择的默认图，则没有。
      }
    2、API配置对象的结构为：
      {
        api: "string", //API url地址
        type: "enum string", //该API的适配器类型
        weight: 10, //API的权重
        config: { //API的自定义配置
          collections: [""],
        },
      },
 */

/** 数据存储 */
const STORAGE = new StorageByCache("cache-storage");

/** 管理图片 */
class Picture {
  /** 图片API适配器 */
  adapters = new Map();
  /** 图片API实例 */
  instances = [];
  /**
   * 注册图片API适配器
   * @param  {...any} adapters 图片API适配器
   */
  constructor(...adapters) {
    for (const adapter of adapters) {
      this.adapters.set(adapter.adapterName, adapter);
    }
  }
  /**
   * 初始化API实例。
   * @param {*} apis API列表
   * @returns
   */
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
  /**
   * 保存图片到缓存
   * @param {string} key 只允许 cachedPic 和 defaultPic
   * @param {object} data 图片数据
   * @returns
   */
  async setPicCache(key = "cachedPic", data = undefined) {
    if (!["cachedPic", "defaultPic"].includes(key) || !data) return false;
    const { pic, ...meta } = data;
    STORAGE.set(`${key}-meta`, meta);
    return STORAGE.set(key, pic);
  }
  /**
   * 获取图片缓存
   * @param {string} key 只允许 cachedPic 和 defaultPic
   * @returns 图片数据
   */
  async getPicCache(key = "cachedPic") {
    if (!["cachedPic", "defaultPic"].includes(key)) return false;
    const pic = await STORAGE.get(key);
    const picMeta = await STORAGE.get(`${key}-meta`);
    if (!pic) return false;
    return { pic: await pic.blob(), ...(await picMeta.json()) };
  }
  /**
   * 删除图片缓存
   * @param {string} key 只允许 cachedPic 和 defaultPic
   * @returns
   */
  async deletePicCache(key = "cachedPic") {
    if (!["cachedPic", "defaultPic"].includes(key)) return false;
    STORAGE.delete(`${key}-meta`);
    return STORAGE.delete(key);
  }
  /** 从bing获取图片 */
  async getBingPic() {
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      const picIndex = Math.round(Math.random() * 8);
      setTimeout(() => controller.abort(), 3e3); //控制超时时间
      const res = await fetch(`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=${picIndex}&n=1`, {
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
  /** 从API获取图片（根据权重随机） */
  async getApiPic() {
    /** 权重累加值 */
    const pool = [];
    if (this.instances.length == 0) return false;
    for (let i in this.instances) {
      //将各个实例的权重累加，并放入权重累加值数组中。
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
  /**
   * 获取随机图片。
   * @param {boolean} preferBing 是否优先选择bing图片，默认false
   * @param {boolean} useCache 是否使用缓存，默认true
   * @returns
   */
  async getRandomPic(preferBing = false, useCache = true) {
    //优先获取缓存图片
    if (useCache) {
      const cachedPic = await this.getPicCache("cachedPic");
      const defaultPic = await this.getPicCache("defaultPic");
      //优先级1：非Bing类型的缓存图片
      if (cachedPic && cachedPic.type !== "bingPic") {
        return cachedPic;
      }
      //优先级2：缓存（此时缓存图片必是bing图片）和默认图片都存在时，根据preferBing选择
      if (cachedPic && defaultPic) {
        return preferBing && cachedPic.type === "bingPic" ? cachedPic : defaultPic;
      }
      //优先级3：仅当缓存或默认图片存在时返回存在的那种图片
      if (cachedPic || defaultPic) {
        return cachedPic || defaultPic;
      }
    }
    //不存在缓存图片，直接从api获取图片
    const picFromApi = await this.getApiPic();
    if (picFromApi) {
      return picFromApi;
    }
    //从API获取图片失败，获取bing图片
    const picFromBing = await this.getBingPic();
    if (picFromBing) {
      return picFromBing;
    }
    //什么也没有
    return null;
  }
}

/** 图片相关 */
export default new Picture(randomPicV2, randomPicV1);
