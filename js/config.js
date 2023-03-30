import database from "./database.js";
import i18n from "./lang/main.js";

const version = 2;

const configuration = {
  bgColor: "#464646",
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
  allowDrag: true,
  preferBing: false,
  dragSenstive: 10,
  animation: {
    delay: "0s",
    duration: "0.2s",
    function: "ease-out",
  },
  keyframes: [
    ["from", ["top:100%;"]],
    ["to", ["top:0%;"]],
  ],
  defaultNote: {
    title: i18n.config.defaultNote.defaultTitle.value,
    size: [300, 300],
    position: [300, 300],
    fontColor: "#000000",
    content: "",
    opacity: "60%",
    fontSize: "16px",
  },
  notes: {},
};

async function upgradeConfig(table) {
  const userConfig = await table.getAll();
  if (!userConfig) {
    await table.set("version", version);
    await table.setMutiple(configuration);
    return true;
  }
  if (version > (userConfig.version || 0)) {
    const conf = Object.assign({}, userConfig);
    conf.version = version;
    conf.apis = [];
    for (let api of userConfig.api) {
      conf.apis.push({
        api: api,
        type: "randomPicV1",
        weight: 10,
        config: {},
      });
    }
    await table.setMutiple(conf, true);
    await table.remove("api");
    return true;
  }
  return false;
}

export default (async () => {
  const table = (await database).open("Config");
  const upgradeRes = await upgradeConfig(table);
  const currentConfig = await table.getAll();
  delete currentConfig.version;
  console.log("是否升级了配置文件：",upgradeRes);
  return {
    config: currentConfig,
    default: configuration,
    version: version,
    set: (...params) => table.set(...params),
    setMutiple: (...params) => table.setMutiple(...params, true),
  };
})();
