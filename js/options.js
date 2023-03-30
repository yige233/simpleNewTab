import { html, TabGroup, Table, TransportWorker } from "./toolkit.js";
import i18n from "./lang/main.js";
import configuration from "./config.js";
import pictures from "./pictures.js";

const saveConfig = () => setConf(conf);
const libPicture = await pictures;
const { config: conf, setMutiple: setConf, default: defaultConfig } = await configuration;
const { config: locale } = i18n;

document.querySelector("title").innerText = i18n.option.title;
document.querySelector(".header>div").innerText = i18n.option.title;
document.querySelector(".footer").innerText = i18n.option.footer;
const sidebar = document.querySelector(".side").children;
sidebar[0].innerHTML = i18n.option.basicConf;
sidebar[1].innerHTML = i18n.option.noteEdit;
sidebar[2].innerHTML = i18n.option.extPage;
sidebar[3].innerHTML = i18n.option.apiPage;
document.querySelector(".side").addEventListener("click", (e) => {
  const currentBtn = e.target.getAttribute("data-target");
  if (!currentBtn) return;
  for (let button of document.querySelectorAll(".side>div")) {
    if (currentBtn == button.getAttribute("data-target")) {
      button.setAttribute("type", "primary");
    } else {
      button.removeAttribute("type");
    }
  }
});

//基本设置
const basicConfig = new TabGroup("basic-config", document.querySelector("#basic-config"));

//编辑便签
const noteEdit = new TabGroup("note-edit", document.querySelector("#note-edit"));

//壁纸API
basicConfig.add(locale.api.name, () => {
  function addItem(api, order) {
    const weight = html(`<input class="ui-input" type="number" min=0 value="${api.weight}" />`);
    const textarea = html(`<textarea class="ui-textarea" resize="vertical">${JSON.stringify(api.config, null, 4)}</textarea>`);
    const button = html(`<button type="danger" class="ui-button">${i18nApi.delete}</button>`);
    weight.addEventListener("change", () => saveConfig((conf.apis[order].weight = Number(weight.value).toFixed())));
    textarea.addEventListener("change", () => {
      try {
        saveConfig((conf.apis[order].config = JSON.parse(textarea.value.replace(/[\n|\r]/g, ""))));
      } catch {
        textarea.errorTip(i18nApi.api.config.error);
      }
    });
    button.addEventListener("click", () => {
      saveConfig(
        conf.apis.splice(
          conf.apis.findIndex((i) => i == api),
          1
        )
      );
      button.parentNode.parentNode.remove();
    });
    weightTip(weight);
    return [api.type, api.api, weight, textarea, button];
  }

  function weightTip(weight) {
    weight.addEventListener("focus", () =>
      weight.tips(i18nApi.api.weight.desc, {
        eventType: "none",
      })
    );
    weight.addEventListener("blur", () => weight["ui-tips"].hide());
  }

  const i18nApi = locale.api;
  const table = new Table(locale.description, i18nApi.desc);
  const listAllApi = new Table(i18nApi.api.type, i18nApi.current, i18nApi.api.weight.name, i18nApi.api.config.desc, "");

  table.add(i18nApi.current, () => {
    for (let i in conf.apis) {
      const api = conf.apis[i];
      listAllApi.add(...addItem(api, i));
    }
    return listAllApi.table;
  });
  table.add(i18nApi.add.name, () => {
    const input = new Table(i18nApi.api.type, i18nApi.add.desc, i18nApi.api.weight.name, "");
    const type = html(`<select is="ui-select"></select>`);
    const api = html(`<input class="ui-input" type="url" required />`);
    const weight = html(`<input class="ui-input" type="number" min=0 value=10 step=1 />`);
    const btn = html(`<button type="success" class="ui-button">${i18nApi.add.name}</button>`);
    for (let i of libPicture.adapters.keys()) {
      const option = html(`<option value="${i}">${i}</option>`);
      if (type.children.length == 0) {
        option.setAttribute("selected", true);
      }
      type.append(option);
    }
    weightTip(weight);
    btn.addEventListener("click", () => {
      try {
        const url = new URL(api.value);
        if (!["http:", "https:"].includes(url.protocol)) throw "不正确的协议:" + url.protocol;
        const newApi = {
          api: url.href,
          weight: Number(weight.value).toFixed() || 10,
          type: type.value,
          config: {},
        };
        listAllApi.add(...addItem(newApi, conf.apis.length + 1));
        saveConfig(conf.apis.push(newApi));
      } catch (err) {
        api.errorTip(i18nApi.add.fail);
      }
    });
    input.add(type, api, weight, btn);
    return input.table;
  });
  return table.table;
});

//一般背景色
basicConfig.add(locale.bgColor.name, () => {
  const table = new Table(locale.description, locale.bgColor.desc);
  table.add(locale.bgColor.current, conf.bgColor);
  table.add(locale.bgColor.change, () => {
    const picker = html(`<input type="color" is="ui-color" value="${conf.bgColor}" />`);
    picker.addEventListener("change", () => {
      table.table.querySelector("tbody > tr:nth-child(1) > td:nth-child(2)").innerHTML = picker.value;
      saveConfig((conf.bgColor = picker.value));
    });
    return picker;
  });
  return table.table;
});

//壁纸拖动
basicConfig.add(locale.allowDrag.name, () => {
  const table = new Table(locale.description, locale.allowDrag.desc);
  table.add(locale.allowDrag.current, () => {
    const input = html(`<input type="checkbox" is="ui-switch" ${conf.allowDrag ? "checked" : ""} />`);
    input.addEventListener("change", () => saveConfig((conf.allowDrag = input.checked)));
    return input;
  });
  return table.table;
});

//壁纸拖动敏感度
basicConfig.add(locale.dragSenstive.name, () => {
  const table = new Table(locale.description, locale.dragSenstive.desc);
  table.add(locale.dragSenstive.current, () => {
    const input = html(`<input type="range" is="ui-range" data-tips="\${value}" value=${conf.dragSenstive} reverse />`);
    input.addEventListener("change", () => saveConfig((conf.dragSenstive = input.value)));
    return input;
  });
  return table.table;
});

//壁纸动画
basicConfig.add(locale.animation.name, () => {
  const table = new Table(locale.description, locale.animation.desc);
  table.add(locale.animation.delay, () => {
    const input = html(`<input class="ui-input" type="number" min=0 step=0.1 value="${conf.animation.delay.replace(/[a-z]/g, "")}" />`);
    input.addEventListener("change", () => saveConfig((conf.animation.delay = input.value + "s")));
    return input;
  });
  table.add(locale.animation.duration, () => {
    const input = html(`<input class="ui-input" type="number" min=0 step=0.1 value="${conf.animation.duration.replace(/[a-z]/g, "")}" />`);
    input.addEventListener("change", () => saveConfig((conf.animation.duration = input.value + "s")));
    return input;
  });
  table.add(locale.animation.function.desc, () => {
    const input = html(`<select is="ui-select"></select>`);
    for (const functionType in locale.animation.function.option) {
      const option = html(`<option value="${functionType}">${locale.animation.function.option[functionType]}</option>`);
      if (conf.animation.function == functionType) {
        option.setAttribute("selected", true);
      }
      input.append(option);
    }
    input.addEventListener("change", () => saveConfig((conf.animation.function = input.value)));
    return input;
  });
  return table.table;
});

//壁纸动画关键帧
basicConfig.add(locale.keyframe.name, () => {
  function addItem(name, style) {
    const textarea = html(`<textarea class="ui-textarea" placeholder='top: "100%"' resize="vertical">${style}</textarea>`);
    const button = html(`<button type="danger" class="ui-button">${locale.keyframe.frames.btn}</button>`);
    textarea.addEventListener("change", () => saveConfig((conf.keyframes[conf.keyframes.findIndex((i) => i[0] == name)][1] = textarea.value.split(/\n/g))));
    button.addEventListener("click", () => {
      saveConfig(
        conf.keyframes.splice(
          conf.keyframes.findIndex((i) => i == name),
          1
        )
      );
      button.parentNode.parentNode.remove();
    });
    return [name, textarea, button];
  }

  const table = new Table(locale.description, locale.keyframe.desc);
  const listAllFrame = new Table();
  table.add(locale.keyframe.frames.desc, () => {
    for (let [name, style] of conf.keyframes) {
      listAllFrame.add(...addItem(name, style));
    }
    return listAllFrame.table;
  });
  table.add(locale.keyframe.new.desc, () => {
    const input = new Table(locale.keyframe.new.name, locale.keyframe.new.css, "");
    const name = html(`<input class="ui-input" type="text" placeholder="0%" required />`);
    const css = html(`<textarea class="ui-textarea" placeholder='top: "100%"' resize="vertical"></textarea>`);
    const button = html(`<button type="success" class="ui-button">${locale.keyframe.new.btn}</button>`);
    button.addEventListener("click", () => {
      const newFrame = [name.value, css.value.split(/\n/g)];
      if (!name.value) {
        return name.errorTip(locale.keyframe.new.error);
      }
      listAllFrame.add(...addItem(...newFrame));
      saveConfig(conf.keyframes.push(newFrame));
    });
    input.add(name, css, button);
    return input.table;
  });
  return table.table;
});

//默认便签配置
basicConfig.add(locale.defaultNote.name, () => {
  const table = new Table(locale.description, locale.defaultNote.desc);
  table.add(locale.defaultNote.defaultTitle.desc, () => {
    const input = html(`<input class="ui-input" value="${conf.defaultNote.title}" placeholder="${locale.defaultNote.defaultTitle.value}" />`);
    input.addEventListener("change", () => saveConfig((conf.defaultNote.title = input.value)));
    return input;
  });
  table.add(locale.defaultNote.fontColor, () => {
    const input = html(`<input type="color" is="ui-color" value="${conf.defaultNote.fontColor}" />`);
    input.addEventListener("change", () => saveConfig((conf.defaultNote.fontColor = input.value)));
    return input;
  });
  table.add(locale.defaultNote.fontSize, () => {
    const input = html(`<input class="ui-input" type="number" value="${Number(conf.defaultNote.fontSize.replace(/[a-z]/g, ""))}" />`);
    input.addEventListener("change", () => saveConfig((conf.defaultNote.fontSize = input.value + "px")));
    return input;
  });
  table.add(locale.defaultNote.opacity, () => {
    const input = html(`<input type="range" is="ui-range" data-tips="\${value}" value=${Number(conf.defaultNote.opacity.replace(/%/g, ""))} reverse />`);
    input.addEventListener("change", () => saveConfig((conf.defaultNote.opacity = value + "%")));
    return input;
  });
  table.add(locale.defaultNote.content, () => {
    const input = html(`<textarea class="ui-textarea" placeholder="" resize="vertical">${conf.defaultNote.content}</textarea>`);
    input.addEventListener("change", () => saveConfig((conf.defaultNote.content = input.value)));
    return input;
  });
  table.add(locale.defaultNote.size.desc, () => {
    const input = new Table();
    const height = html(`<input class="ui-input" value="${conf.defaultNote.size[0]}" placeholder="${locale.defaultNote.size.height}" />`);
    const width = html(`<input class="ui-input" value="${conf.defaultNote.size[1]}" placeholder="${locale.defaultNote.size.width}" />`);
    input.table.addEventListener("change", () => saveConfig((conf.defaultNote.size = [height.value, width.value])));
    input.add(height, width);
    return input.table;
  });
  return table.table;
});

//默认壁纸
basicConfig.add(locale.defaultPic.name, () => {
  const table = new Table(locale.description, locale.defaultPic.desc);
  table.add(locale.defaultPic.view.desc, () => {
    const button = html(`<button type="primary" class="ui-button">${locale.defaultPic.view.btn}</button>`);
    button.addEventListener("click", async () => {
      const image = await libPicture.getDbPic("defaultPic");
      if (!image) return new LightTip(locale.defaultPic.view.fail, "error");
      chrome.tabs.create({
        url: URL.createObjectURL(image.pic),
      });
    });
    return button;
  });
  table.add(locale.defaultPic.set.desc, () => {
    const button = html(`<button type="success" class="ui-button">${locale.defaultPic.set.btn}<input type=file accept="image/*" style="display:none" /></button>`);
    const input = button.querySelector("input");
    input.addEventListener("change", async () => {
      if (!input.value) return;
      const res = await libPicture.setPic("defaultPic", {
        message: "用户设置的默认图片: " + input.files[0].name,
        name: input.files[0].name,
        pic: input.files[0],
      });
      if (res) return new LightTip(locale.defaultPic.set.ok, "success");
      new LightTip(locale.defaultPic.set.fail, "error");
    });
    button.addEventListener("click", () => input.click());
    return button;
  });
  table.add(locale.defaultPic.delete.desc, () => {
    const button = html(`<button type="danger" class="ui-button">${locale.defaultPic.delete.btn}</button>`);
    button.addEventListener("click", () => {
      libPicture.removePic("defaultPic").then(() => new LightTip(locale.defaultPic.delete.ok, "success"));
    });
    return button;
  });
  return table.table;
});

//除API外优先使用的壁纸
basicConfig.add(locale.preferBing.name, () => {
  const table = new Table(locale.description, locale.preferBing.desc);
  const span = html(`<span>${conf.preferBing ? locale.preferBing.state.bing : locale.preferBing.state.custom}</span>`);
  table.add(locale.preferBing.state.desc, span);
  table.add(locale.preferBing.btn, () => {
    const input = html(`<input type="checkbox" is="ui-switch" ${conf.preferBing ? "checked" : ""} />`);
    input.addEventListener("change", () => {
      span.innerHTML = input.checked ? locale.preferBing.state.bing : locale.preferBing.state.custom;
      saveConfig((conf.preferBing = input.checked));
    });
    return input;
  });
  return table.table;
});

//编辑JSON格式的配置
basicConfig.add(locale.editJson.name, () => {
  const table = new Table(locale.description, locale.editJson.desc);
  const textarea = html(`<textarea class="ui-textarea" resize="vertical" rows="20">${JSON.stringify(conf, null, 4)}</textarea>`);
  textarea.addEventListener("change", () => {
    try {
      setConf(JSON.parse(textarea.value.replace(/[\n|\r]/g, "")));
    } catch {
      textarea.errorTip(locale.editJson.error);
    }
  });
  table.add(locale.editJson.content, textarea);
  table.add(locale.editJson.restore.desc, () => {
    const button = html(`<button type="danger" class="ui-button">${locale.editJson.restore.desc}</button>`);
    button.addEventListener("click", () => {
      textarea.value = JSON.stringify(defaultConfig, null, 4);
      new LightTip(locale.editJson.restore.ok, "success");
    });
    return button;
  });

  return table.table;
});

for (const id in conf.notes) {
  const note = conf.notes[id];
  const syncWorker = new TransportWorker("noteSync");
  noteEdit.add(id, () => {
    const table = new Table(i18n.note.id, id);
    table.add(i18n.note.title, () => {
      const input = html(`<input class="ui-input" placeholder="${conf.defaultNote.title}" class="ui-input" value=${note.title} />`);
      input.addEventListener("change", () => saveConfig((note.title = input.value)));
      return input;
    });
    table.add(i18n.note.color, () => {
      const input = html(`<input type="color" is="ui-color" value="${note.color}" />`);
      input.addEventListener("change", () => saveConfig((note.color = input.value)));
      return input;
    });
    table.add(i18n.note.fontColor, () => {
      const input = html(`<input type="color" is="ui-color" value="${note.fontColor}" />`);
      input.addEventListener("change", () => saveConfig((note.fontColor = input.value)));
      return input;
    });
    table.add(i18n.note.fontSize, () => {
      const input = html(`<input type="number" autocomplete="off" min=0 placeholder="16" step=0.1 class="ui-input" value=${Number(note.fontSize.replace(/[a-z]/g, ""))} />`);
      input.addEventListener("change", () => saveConfig((note.fontSize = input.value + "px")));
      return input;
    });
    table.add(i18n.note.opacity, () => {
      const input = html(`<input type="range" is="ui-range" data-tips="\${value}" value=${Number(note.opacity.replace(/%/g, ""))} reverse />`);
      input.addEventListener("change", () => saveConfig((note.opacity = input.value + "%")));
      return input;
    });
    table.add(i18n.note.content, () => {
      const input = html(`<textarea class="ui-textarea" placeholder="" resize="vertical">${note.content}</textarea>`);
      input.addEventListener("change", () => saveConfig((note.content = input.value)));
      return input;
    });
    table.add(i18n.note.size.desc, () => {
      const input = new Table();
      const height = html(`<input class="ui-input" value="${note.size[0]}" placeholder="${i18n.note.size.height}" />`);
      const width = html(`<input class="ui-input" value="${note.size[1]}" placeholder="${i18n.note.size.width}" />`);
      input.table.addEventListener("change", () => saveConfig((note.size = [height.value, width.value])));
      input.add(height, width);
      return input.table;
    });
    table.add(i18n.note.position.desc, () => {
      const input = new Table();
      const left = html(`<input class="ui-input" value="${note.position[0]}" placeholder="${i18n.note.size.height}" />`);
      const top = html(`<input class="ui-input" value="${note.position[1]}" placeholder="${i18n.note.size.width}" />`);
      input.table.addEventListener("change", () => saveConfig((note.position = [left.value, top.value])));
      input.add(left, top);
      return input.table;
    });
    table.add(i18n.note.delete.desc, () => {
      const button = html(`<button type="danger" class="ui-button">${i18n.note.delete.btn}</button>`);
      button.addEventListener("click", () => {
        syncWorker.post({
          event: "delete",
          tabId: Math.random(),
          noteId: note.id,
        });
        noteEdit.delete(id);
      });
      return button;
    });
    return table.table;
  });
}
if (noteEdit.tabs.size <= 0) {
  noteEdit.add(i18n.note.null.name, html(`<div style="font-size:16px">${i18n.note.null.tip}</div>`));
}
