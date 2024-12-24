import i18n from "./lang/main.js";
import { StorageByCache } from "./util.js";

/** 默认配置Symbol */
const defaultConfig = Symbol("defaultConfig");

/** 数据存储 */
export const STORAGE = new StorageByCache("cache-storage");

/** 默认配置 */
export const configuration = {
  /** 背景颜色 */
  bgColor: "#464646",
  /** 图片API列表 */
  apis: [
    {
      api: "http://localhost:3000/",
      type: "randomPicV2",
      weight: 10,
      config: {
        collections: [""],
      },
    },
  ],
  /** 是否允许拖冬壁纸 */
  allowDrag: true,
  /** 是否优先使用bing壁纸（在任意API不可用，以及设置了默认壁纸的情况下） */
  preferBing: false,
  /** 拖动敏感度 */
  dragSenstive: 10,
  /** 更新提示 */
  updateTip: true,
  /** 动画设置 */
  animation: {
    /** 动画延迟 */
    delay: 0,
    /** 动画时长 */
    duration: 0.2,
    /** 动画运动方式 */
    function: "ease-out",
  },
  /** 动画关键帧列表。子元素是一个数组，第一个元素是关键帧名称，第二个元素是关键帧css样式 */
  keyframes: [
    ["from", ["top:100%;"]],
    ["to", ["top:0%;"]],
  ],
  /** 默认便签 */
  defaultNote: {
    /** 默认便签标题 */
    title: i18n("config.defaultNote.defaultTitle.value"),
    /** 默认便签尺寸 */
    size: [300, 300],
    /** 默认便签位置 */
    position: [300, 300],
    /** 默认便签字体颜色 */
    fontColor: "#000000",
    /** 默认便签内容 */
    content: "",
    /** 默认便签透明度 */
    opacity: 60,
    /** 默认便签字体大小 */
    fontSize: 16,
  },
  /** 图片搜索设置 */
  imageSearch: {
    /** 是否启用图片搜索 */
    enable: true,
    /** 默认启用的搜索引擎列表 */
    engines: [],
  },
  /** ChromeOS壁纸设置。对于非ChromeOS系统，此选项无效 */
  chromeOSwallpaper: {
    /** 是否启用随机更换ChromeOS壁纸 */
    enable: true,
    /** 更换周期，单位为分钟 */
    switchPeriod: 1,
    /** 最小电池电量，低于此值将不会更换壁纸 */
    minBatteryLevel: 20,
  },
  /** 便签id列表 */
  notes: [],
};
/** 配置控制器 */
export class Config {
  [defaultConfig] = configuration;
  /** 可自由修改的配置项 */
  config = {};
  /**
   * 实例化
   * @param {object} currentConfig 当前配置
   */
  constructor(currentConfig = {}) {
    this.config = Object.assign({}, configuration, currentConfig);
  }
  /** 获取默认配置 */
  get default() {
    return this[defaultConfig];
  }
  /** 初始化。应通过该方法初始化配置控制器 */
  static async init() {
    const configRes = await STORAGE.get("config");
    const currentConf = configRes ? await configRes.json() : undefined;
    return new Config(currentConf);
  }
  /**
   * 访问配置项。
   * @param {string} propPath 用“.”分隔的配置项路径。
   * @param {any} value 如果存在，则将该值赋给对应配置项，并保存。
   * @returns
   */
  $(propPath, value = undefined) {
    if (typeof propPath !== "string") {
      return undefined;
    }
    const properties = propPath.split(".");
    const lastProperty = properties.pop();
    let target = this;
    for (const propName of properties) {
      if (!target[propName]) {
        throw new Error(`试图访问不存在的属性: '${propPath}'`);
      }
      target = target[propName];
    }
    if (typeof value !== "undefined") {
      target[lastProperty] = value;
      this.save();
      return value;
    }
    return target[lastProperty];
  }
  /** 保存配置。如果是直接修改 config 属性，那么需要额外调用该方法来保存配置。 */
  save() {
    STORAGE.set("config", this.config);
  }
  /** 恢复默认配置，除了 notes */
  restore() {
    this.config = Object.assign({}, configuration, { notes: this.config.notes });
    this.save();
  }
}
