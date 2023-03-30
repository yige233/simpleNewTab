const _adapterName = Symbol("adapterName");
const _configTemplate = Symbol("configTemplate");
const _func = Symbol("func");

class ApiAdapter {
  /**
   * 构造新的api适配器
   * @param {*} adapterName 适配器名称
   * @param {*} configTemplate 可选的配置模板
   * @param {*} handler 处理函数，能够返回下面这个东西就ok
   {
      message: "", //关于该图片的信息
      name: "", //图片名
      pic: new Blob(), //图片数据
    }
   */
  constructor(adapterName, configTemplate = {}, handler) {
    this[_adapterName] = adapterName;
    this[_configTemplate] = configTemplate;
    this[_func] = handler;
  }
  get adapterName() {
    return this[_adapterName];
  }
  get configTemplate() {
    return this[_configTemplate] || {};
  }
  new(api, config) {
    return {
      api: api,
      config: config,
      get: this[_func],
    };
  }
}

export default ApiAdapter;
