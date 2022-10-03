import {
    i18n,
    dom,
    Db,
    defaultConfig,
    presetColors
} from "./tools.js";

//多个子页面
class Pages {
    current = null;
    //传入子页面元素
    constructor(...pages) {
        this.pages = pages;
        for (let page of pages) {
            page.classList.add("hide");
            document.querySelector("#body").append(page);
        };
        this.show(0);
    };
    //显示指定子页面
    show(id) {
        if (id == this.current) return;
        this.pages[id].classList.toggle("hide");
        (this.current != null) && this.pages[this.current].classList.toggle("hide");
        this.current = id;
    };
};

const db = await new Db().use("Picture", "Config");
const db_Config = db.open("Config");
const db_Picture = db.open("Picture");

const conf = await db_Config.getMutiple(defaultConfig);

//用layui
layui.use(() => {
    //保存设置
    function saveConf(func) {
        func();
        db_Config.setMutiple(conf, true);
        document.querySelector("#editJson").innerHTML = JSON.stringify(conf, null, 4);
    };

    //显示tip信息
    function tips(text, target) {
        layui.layer.tips(text, target);
    };

    //创建一个tab元素
    function fillTab(config = []) {
        const elem = document.querySelector("#templates").querySelector("#tab").children[0].cloneNode(true),
            title = elem.querySelector(".layui-tab-title"),
            content = elem.querySelector(".layui-tab-content");
        for (let i in config) {
            let current = config[i],
                singleTitle = dom(`<li ${(i == 0) ? 'class="layui-this"' : ''} lay-id="${current.id || current.title}">${current.title || ""}</li>`),
                singleContent = dom(`<div class="layui-tab-item ${(i == 0) ? 'layui-show' : ''}">${current.content || ""}</div>`);
            if (current.inner) {
                singleContent.append(current.inner());
            };
            title.append(singleTitle);
            content.append(singleContent);
        };
        return elem;
    };

    //创建一个表格
    function fillTable(config = {}) {
        const elem = document.querySelector("#templates").querySelector("#table").children[0].cloneNode(true);
        const {
            cols = [], tHead = null, skin = null, tBody
        } = config;
        for (let c of cols) {
            const col = document.createElement("col");
            col.setAttribute("width", c);
            elem.querySelector("colgroup").append(col);
        };
        for (let items of tBody) {
            let tr = document.createElement("tr");
            for (let item of items) {
                const td = document.createElement("td");
                if (typeof (item) == "function") {
                    td.append(item());
                } else {
                    td.innerHTML = item;
                };
                tr.append(td);
            };
            elem.querySelector("tbody").append(tr);
        };
        if (tHead) {
            for (let head of tHead) {
                let th = document.createElement("th");
                th.innerHTML = head || "";
                elem.querySelector("thead>tr").append(th);
            };
        };
        if (skin) {
            elem.querySelector(".layui-table").setAttribute("lay-skin", skin);
        };
        return elem;
    };

    //创建一个颜色选择器
    function colorPick(config = {}) {
        const elem = dom(`<div></div>`);
        layui.colorpicker.render(Object.assign({
            elem: elem
        }, config));
        return elem;
    };

    //创建一个选择框
    function selector(options = []) {
        const elem = dom(`<select></select>`);
        for (let [value = "", desc = value, selected = false] of options) {
            const option = dom(`<option value="${value}" ${selected ? "selected" : ""}>${desc}</option>`);
            elem.append(option);
        };
        return elem;
    };

    //为元素添加lay-filter属性
    function addFilter(elem, filter) {
        elem.setAttribute("lay-filter", filter);
    };

    //基本设置
    const basicConfig = [{
        title: i18n("conf_bgColor_title"),
        content: "",
        inner: () => {
            const table = fillTable({
                cols: [200],
                tBody: [
                    [i18n("conf_desc"), i18n("conf_bgColor_desc")],
                    [i18n("conf_bgColor_current"), conf.bgColor],
                    [i18n("conf_bgColor_change"), () => colorPick({
                        color: conf.bgColor,
                        predefine: true,
                        colors: presetColors,
                        done: async (color) => {
                            saveConf(() => conf.bgColor = color);
                            table.querySelector("div > table > tbody > tr:nth-child(2) > td:nth-child(2)").innerHTML = color;
                        }
                    })]
                ]
            });
            return table;
        }
    }, {
        title: i18n("conf_api_title"),
        content: "",
        inner: () => {
            function row(api) {
                return [api, () => {
                    const btn = dom(`<button type="button" class="layui-btn">${i18n("conf_api_delete")}</button>`);
                    btn.addEventListener("click", async e => {
                        saveConf(() => conf.api.splice(conf.api.findIndex(i => i == api), 1));
                        e.target.parentNode.parentNode.remove();
                    });
                    return btn;
                }];
            };
            const table = {
                skin: "nob",
                cols: [300],
                tBody: []
            };
            for (let api of conf.api) table.tBody.push(row(api));
            const tableElem = fillTable(table);
            const newApi = dom(`<div class="layui-form-item">
                                <label class="layui-form-label">${i18n("conf_api_add_desc")}</label>
                                <div class="layui-input-block">
                                    <input type="text" lay-verify="title" autocomplete="off" placeholder="${i18n("conf_api_add_desc")}" class="layui-input" />
                                </div>
                            </div>`);
            newApi.querySelector("input").addEventListener("change", e => {
                if (e.target.value.length < 1) return;
                try {
                    const url = new URL(e.target.value);
                    if (!["http:", "https:"].includes(url.protocol)) throw "不正确的协议:" + url.protocol;
                    saveConf(() => conf.api.push(url.toString()));
                    const newTable = fillTable({
                        tBody: [row(url.toString())]
                    });
                    tableElem.querySelector("tbody").append(newTable.querySelector("tr"));
                } catch (err) {
                    tips(i18n("conf_api_add_fail") + e.target.value, e.target);
                };
            });
            return fillTable({
                cols: [200],
                tBody: [
                    [i18n("conf_desc"), i18n("conf_api_desc")],
                    [i18n("conf_api_current"), () => tableElem],
                    [i18n("conf_api_add"), () => newApi]
                ]
            });
        }
    }, {
        title: i18n("conf_allowDrag_title"),
        content: "",
        inner: () => fillTable({
            cols: [200],
            tBody: [
                [i18n("conf_desc"), i18n("conf_allowDrag_desc")],
                [i18n("conf_allowDrag_current"), () => {
                    layui.form.on('switch(allowDrag)', data => saveConf(() => conf.allowDrag = data.elem.checked));
                    return dom(`<input type="checkbox" ${conf.allowDrag?"checked":""} name="open" lay-skin="switch" lay-filter="allowDrag" lay-text="${i18n("conf_allowDrag_on")}|${i18n("conf_allowDrag_off")}">`);
                }]
            ]
        })
    }, {
        title: i18n("conf_dragSenstive_title"),
        content: "",
        inner: () => fillTable({
            cols: [200],
            tBody: [
                [i18n("conf_desc"), i18n("conf_dragSenstive_desc")],
                [i18n("conf_dragSenstive_current"), () => {
                    const slide = dom(`<div style="padding:0 20px;"></div>`);
                    layui.slider.render({
                        elem: slide,
                        min: 1,
                        max: 100,
                        value: conf.dragSenstive,
                        change: (value) => {
                            if (value == conf.dragSenstive) return;
                            saveConf(() => conf.dragSenstive = value);
                        }
                    });
                    return slide;
                }]
            ]
        })
    }, {
        title: i18n("conf_animation_title"),
        content: "",
        inner: () => fillTable({
            cols: [200],
            tBody: [
                [i18n("conf_desc"), i18n("conf_animation_desc")],
                [i18n("conf_animation_delay"), () => {
                    const input = dom(`<input type="number" autocomplete="off" min=0 placeholder="${i18n("conf_animation_delay")}" step=0.1 class="layui-input" value=${Number(conf.animation.delay.replace(/[a-z]/g,""))} />`);
                    input.addEventListener("change", () => saveConf(() => conf.animation.delay = input.value + "s"));
                    return input;
                }],
                [i18n("conf_animation_duration"), () => {
                    const input = dom(`<input type="number" autocomplete="off" min=0 placeholder="${i18n("conf_animation_duration")}" step=0.1 class="layui-input" value=${Number(conf.animation.duration.replace(/[a-z]/g,""))} />`);
                    input.addEventListener("change", () => saveConf(() => conf.animation.duration = input.value + "s"));
                    return input;
                }],
                [i18n("conf_animation_function"), () => {
                    const options = [
                        ["linear", i18n("conf_animation_function_linear")],
                        ["ease", i18n("conf_animation_function_ease")],
                        ["ease-in", i18n("conf_animation_function_easeIn")],
                        ["ease-out", i18n("conf_animation_function_easeOut")],
                        ["ease-in-out", i18n("conf_animation_function_easeInOut")]
                    ];
                    for (let i of options) {
                        if (conf.animation.function == i[0]) i.push(true);
                    };
                    layui.form.on('select(anifunction)', data => saveConf(() => conf.animation.function = data.elem.value));
                    const select = selector(options);
                    addFilter(select, "anifunction");
                    return select;
                }]
            ]
        })
    }, {
        title: i18n("conf_keyframe_title"),
        content: "",
        inner: () => {
            function row(name, style) {
                return [name, () => {
                    const textarea = dom(`<textarea placeholder='top: "100%"' class="layui-textarea">${style.join("\n")}</textarea>`);
                    textarea.addEventListener("input", () => saveConf(() => conf.keyframes[conf.keyframes.findIndex(i => i[0] == name)][1] = textarea.value.split(/\n/g)));
                    return textarea;
                }, () => {
                    const btn = dom(`<button type="button" class="layui-btn">${i18n("conf_keyframe_btn_delete")}</button>`);
                    btn.addEventListener("click", async e => {
                        saveConf(() => conf.keyframes.splice(conf.keyframes.findIndex(i => i[0] == name), 1));
                        e.target.parentNode.parentNode.remove();
                    });
                    return btn;
                }]
            }
            const table = {
                skin: "line",
                cols: [100],
                tBody: []
            };
            for (let [name, style] of conf.keyframes) {
                table.tBody.push(row(name, style));
            };
            const tableElem = fillTable(table);
            const inputFrameName = dom(`<input type="text" autocomplete="off" placeholder="0%" step=0.1 class="layui-input" />`);
            const inputFrameCSS = dom(`<textarea placeholder='top: "0%"' class="layui-textarea"></textarea>`);
            const btnAdd = dom(`<button type="button" class="layui-btn">${i18n("conf_keyframe_btn_add")}</button>`);
            btnAdd.addEventListener("click", async () => {
                const newFrame = [inputFrameName.value, inputFrameCSS.value.split(/\n/g)];
                conf.keyframes.push(newFrame);
                await db_Config.setMutiple(conf, true);
                const newTable = fillTable({
                    tBody: [row(newFrame[0], newFrame[1])]
                });
                tableElem.querySelector("tbody").append(newTable.querySelector("tr"));
            });
            return fillTable({
                cols: [200],
                tBody: [
                    [i18n("conf_desc"), i18n("conf_keyframe_desc")],
                    [i18n("conf_keyframe_frames"), () => tableElem],
                    [i18n("conf_keyframe_new"), () => fillTable({
                        skin: "line",
                        cols: [100],
                        tBody: [
                            [i18n("conf_keyframe_new_name"), () => inputFrameName],
                            [i18n("conf_keyframe_css"), () => inputFrameCSS],
                            [() => btnAdd]
                        ]
                    })]
                ]
            })
        }
    }, {
        title: i18n("conf_defaultNote_title"),
        content: "",
        inner: () => fillTable({
            cols: [200],
            tBody: [
                [i18n("conf_desc"), i18n("conf_defaultNote_desc")],
                [i18n("conf_defaultNote_defaultTitle"), () => {
                    const input = dom(`<input type="text" autocomplete="off" placeholder="${i18n("conf_defaultNote_defaultTitle_value")}" class="layui-input" value=${conf.defaultNote.title} />`);
                    input.addEventListener("change", () => saveConf(() => conf.defaultNote.title = input.value));
                    return input;
                }],
                [i18n("conf_defaultNote_fontColor"), () => colorPick({
                    color: conf.defaultNote.fontColor,
                    predefine: true,
                    colors: presetColors,
                    change: color => saveConf(() => conf.defaultNote.fontColor = color)
                })],
                [i18n("conf_defaultNote_content"), () => {
                    const textarea = dom(`<textarea placeholder='' class="layui-textarea">${conf.defaultNote.content}</textarea>`);
                    textarea.addEventListener("input", () => saveConf(() => conf.defaultNote.content = textarea.value));
                    return textarea;
                }],
                [i18n("conf_defaultNote_fontSize"), () => {
                    const input = dom(`<input type="number" autocomplete="off" min=0 placeholder="16" step=0.1 class="layui-input" value=${Number(conf.defaultNote.fontSize.replace(/[a-z]/g,""))} />`);
                    input.addEventListener("change", () => saveConf(() => conf.defaultNote.fontSize = input.value + "px"));
                    return input;
                }],
                [i18n("conf_defaultNote_opacity"), () => {
                    const slide = dom(`<div style="padding:0 20px;"></div>`);
                    layui.slider.render({
                        elem: slide,
                        value: Number(conf.defaultNote.opacity.replace(/%/g, "")),
                        setTips: value => value + "%",
                        change: value => saveConf(() => conf.defaultNote.opacity = value + "%")
                    });
                    return slide;
                }],
                [i18n("conf_defaultNote_size"), () => {
                    const inputs = dom(`<div>
                    <input type="number" autocomplete="off" min=30 placeholder="${i18n("conf_defaultNote_size_height")}" step=1 class="layui-input" value=${conf.defaultNote.size[0]} />
                    <input type="number" autocomplete="off" min=30 placeholder="${i18n("conf_defaultNote_size_width")}" step=1 class="layui-input" value=${conf.defaultNote.size[1]} />
                    </div>`);
                    const [inputH, inputW] = inputs.children;
                    inputH.addEventListener("change", () => saveConf(() => conf.defaultNote.size[0] = inputH.value));
                    inputW.addEventListener("change", () => saveConf(() => conf.defaultNote.size[1] = inputW.value));
                    return inputs;
                }]
            ]
        })
    }, {
        title: i18n("conf_defaultPic_title"),
        content: "",
        inner: () => fillTable({
            cols: [200],
            tBody: [
                [i18n("conf_desc"), i18n("conf_defaultPic_desc")],
                [i18n("conf_defaultPic_set"), () => {
                    const upload = dom(`<div><button type="button" class="layui-btn">${i18n("conf_defaultPic_btn_set")}</button><input type=file accept="image/*" style="display:none" /></div>`);
                    const [btn, input] = upload.children;
                    input.addEventListener("change", async () => {
                        if (!input.value) return;
                        const res = await db_Picture.set("defaultPic", {
                            ok: true,
                            message: input.files[0].name,
                            type: "default",
                            pic: input.files[0],
                        }, true);
                        if (res) return tips(i18n("conf_defaultPic_set_ok"), btn);
                        tips(i18n("conf_defaultPic_set_fail"), btn);
                    });
                    btn.addEventListener("click", () => input.click());
                    return upload;
                }],
                [i18n("conf_defaultPic_view"), () => {
                    const btn = dom(`<button type="button" class="layui-btn">${i18n("conf_defaultPic_btn_view")}</button>`);
                    btn.addEventListener("click", async () => {
                        const image = await db_Picture.get("defaultPic");
                        if (image && image.ok) return chrome.tabs.create({
                            url: URL.createObjectURL(image.pic)
                        });
                        tips(i18n("conf_defaultPic_view_fail"), btn);
                    });
                    return btn;
                }],
                [i18n("conf_defaultPic_delete"), () => {
                    const btn = dom(`<button type="button" class="layui-btn">${i18n("conf_defaultPic_btn_delete")}</button>`);
                    btn.addEventListener("click", () => {
                        db_Picture.remove("defaultPic").then(() => tips(i18n("conf_defaultPic_delete_ok"), btn));
                    });
                    return btn;
                }]
            ]
        })
    }, {
        title: i18n("conf_preferBing_title"),
        content: "",
        inner: () => fillTable({
            cols: [200],
            tBody: [
                [i18n("conf_desc"), i18n("conf_preferBing_desc")],
                [i18n("conf_preferBing_current"), () => {
                    layui.form.on('switch(preferBing)', data => saveConf(() => conf.preferBing = data.elem.checked));
                    return dom(`<input type="checkbox" ${conf.preferBing?"checked":""} name="open" lay-skin="switch" lay-filter="preferBing" lay-text="${i18n("conf_preferBing_bing")}|${i18n("conf_preferBing_custom")}">`);
                }]
            ]
        })
    }, {
        title: i18n("conf_editJson_title"),
        content: "",
        inner: () => {
            const textarea = dom(`<textarea id="editJson" placeholder='{}' class="layui-textarea" style="height: 500px;font-family: Consolas, Microsoft Yahei;">${JSON.stringify(conf,null,4)}</textarea>`);
            return fillTable({
                cols: [200],
                tBody: [
                    [i18n("conf_desc"), i18n("conf_editJson_desc")],
                    [i18n("conf_editJson_content"), () => textarea],
                    [i18n("conf_editJson_restore"), () => {
                        const btn = dom(`<button type="button" class="layui-btn">${i18n("conf_editJson_btn_restore")}</button>`);
                        btn.addEventListener("click", () => {
                            textarea.value = JSON.stringify(defaultConfig, null, 4);
                        });
                        return btn;
                    }],
                    [i18n("conf_editJson_save"), () => {
                        const btn = dom(`<button type="button" class="layui-btn">${i18n("conf_editJson_btn_save")}</button>`);
                        btn.addEventListener("click", async e => {
                            try {
                                const newJson = JSON.parse(textarea.value.replace(/[\n|\r]/g, ""));
                                await db_Config.setMutiple(newJson, true);
                                tips(i18n("conf_editJson_save_ok"), e.target);
                            } catch (err) {
                                tips(i18n("conf_editJson_save_fail") + err.message, e.target);
                            };
                        });
                        return btn;
                    }]
                ]
            });
        }
    }];

    //便签设置
    const noteConfig = [];
    for (const id in conf.notes) {
        const note = conf.notes[id];
        noteConfig.push({
            title: id,
            content: "",
            inner: () => fillTable({
                cols: [200],
                tBody: [
                    [i18n("note_title"), () => {
                        const input = dom(`<input type="text" autocomplete="off" placeholder="${conf.defaultNote.title}" class="layui-input" value=${note.title} />`);
                        input.addEventListener("change", () => saveConf(() => note.title = input.value));
                        return input;
                    }],
                    [i18n("note_fontColor"), () => colorPick({
                        color: note.fontColor,
                        predefine: true,
                        colors: presetColors,
                        change: color => saveConf(() => note.fontColor = color)
                    })],
                    [i18n("note_color"), () => colorPick({
                        color: note.color,
                        predefine: true,
                        colors: presetColors,
                        change: color => saveConf(() => note.color = color)
                    })],
                    [i18n("note_content"), () => {
                        const textarea = dom(`<textarea placeholder='' class="layui-textarea">${note.content}</textarea>`);
                        textarea.addEventListener("input", () => saveConf(() => note.content = textarea.value));
                        return textarea;
                    }],
                    [i18n("note_fontSize"), () => {
                        const input = dom(`<input type="number" autocomplete="off" min=0 placeholder="16" step=0.1 class="layui-input" value=${Number(note.fontSize.replace(/[a-z]/g,""))} />`);
                        input.addEventListener("change", () => saveConf(() => note.fontSize = input.value + "px"));
                        return input;
                    }],
                    [i18n("note_opacity"), () => {
                        const slide = dom(`<div style="padding:0 20px;"></div>`);
                        layui.slider.render({
                            elem: slide,
                            value: Number(note.opacity.replace(/%/g, "")),
                            setTips: value => {
                                return value + '%';
                            },
                            change: value => saveConf(() => note.opacity = value + "%")
                        });
                        return slide;
                    }],
                    [i18n("note_size"), () => {
                        const inputs = dom(`<div>
                        <input type="number" autocomplete="off" min=30 placeholder="${i18n("note_size_height")}" step=1 class="layui-input" value=${note.size[0]} />
                        <input type="number" autocomplete="off" min=30 placeholder="${i18n("note_size_width")}" step=1 class="layui-input" value=${note.size[1]} />
                        </div>`);
                        const [inputH, inputW] = inputs.children;
                        inputH.addEventListener("change", () => saveConf(() => note.size[0] = inputH.value));
                        inputW.addEventListener("change", () => saveConf(() => note.size[1] = inputW.value));
                        return inputs;
                    }],
                    [i18n("note_position"), () => {
                        const inputs = dom(`<div>
                        <input type="number" autocomplete="off" min=30 placeholder="${i18n("note_position_left")}" step=1 class="layui-input" value=${note.position[0]} />
                        <input type="number" autocomplete="off" min=30 placeholder="${i18n("note_position_top")}" step=1 class="layui-input" value=${note.position[1]} />
                        </div>`);
                        const [inputLeft, inputTop] = inputs.children;
                        inputLeft.addEventListener("change", () => saveConf(() => note.position[0] = inputLeft.value));
                        inputTop.addEventListener("change", () => saveConf(() => note.position[1] = inputTop.value));
                        return inputs;
                    }],
                    [i18n("note_delete"), () => {
                        const btn = dom(`<button type="button" class="layui-btn">${i18n("note_btn_delete")}</button>`);
                        btn.addEventListener("click", () => {
                            layui.element.tabDelete('noteTab', id);
                            saveConf(() => {
                                delete conf.notes[id]
                            });
                        });
                        return btn;
                    }]
                ]
            })
        });
    };
    //没有便签时的提示
    if (noteConfig.length == 0) noteConfig.push({
        title: i18n("note_null_title"),
        content: i18n("note_null_tip")
    });
    try {
        const nav = dom(`<ul class="layui-nav layui-nav-tree">
        <li class="layui-nav-item layui-this"><a href="#">${i18n("option_basicConf")}</a></li>
        <li class="layui-nav-item"><a href="#">${i18n("option_noteEdit")}</a></li>
        <li class="layui-nav-item layui-nav-itemed">
            <a href="#">${i18n("option_links")}</a>
            <dl class="layui-nav-child">
                <dd><a href="https://github.com/yige233/simpleNewTab" target="_blank">${i18n("option_extPage")}</a></dd>
                <dd><a href="https://github.com/yige233/randomPic" target="_blank">${i18n("option_apiPage")}</a></dd>
            </dl>
        </li>
    </ul>`);
        const notes = fillTab(noteConfig);
        addFilter(notes, "noteTab");
        const pages = new Pages(fillTab(basicConfig), notes);
        nav.querySelectorAll("li")[0].addEventListener("click", () => {
            pages.show(0);
            layui.element.init();
        });
        nav.querySelectorAll("li")[1].addEventListener("click", () => {
            pages.show(1);
            layui.element.init();
        });
        document.querySelector(".layui-side > div").append(nav);
        layui.form.render();
        layui.element.init();
    } catch (err) {
        //return console.log(err);
        //页面渲染错误时，直接恢复默认设置并重载
        db_Config.setMutiple(defaultConfig, true).then(() => window.location.reload());
    };
    document.querySelector("title").innerText = i18n("option_title");
    document.querySelector(".layui-logo").innerText = i18n("option_title");
    document.querySelector(".layui-footer").innerText = i18n("option_footer");
});