import ApiAdapter from "./main.js";

export default new ApiAdapter("randomPicV2", { collections: [] }, async function () {
  try {
    const controller = new AbortController();
    const signal = controller.signal;
    const { collections = [] } = this.config;
    setTimeout(() => controller.abort(), 1000); //控制超时时间
    const res = await fetch(`${this.api}random-picture?collection=${collections.join("|")}`, {
      signal: signal,
    });
    const json = await res.json();
    if (json.code != 200) throw new Error(`[Adapter.${this.adapterName}] 获取图片元数据失败: ${json.message}`);

    const picMeta = json.data;
    const pic = await fetch(`${this.api}pictures/${picMeta.collection}/${picMeta.pic}`);
    return {
      name: picMeta.pic,
      message: `${picMeta.pic} 来自 ${this.api}`,
      pic: await pic.blob(),
    };
  } catch (err) {
    console.warn(err);
    return null;
  }
});
