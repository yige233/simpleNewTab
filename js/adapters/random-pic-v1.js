import ApiAdapter from "./main.js";

export default new ApiAdapter("randomPicV1", null, async function () {
  try {
    const controller = new AbortController();
    const signal = controller.signal;
    setTimeout(() => controller.abort(), 1000); //控制超时时间
    const res = await fetch(`${this.api}random`, {
      signal: signal,
    });
    const picMeta = await res.json();
    if (!res.ok) throw new Error(`[Adapter.${this.adapterName}] 获取图片元数据失败: ${picMeta.message}`);
    const pic = await fetch(`${this.api}pic?name=${picMeta.pic}`);
    return {
      message: `${picMeta.pic} 来自 ${this.api}`,
      name: picMeta.pic,
      pic: await pic.blob(),
    };
  } catch (err) {
    console.warn(err.message);
    return null;
  }
});
