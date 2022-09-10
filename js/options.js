import {
    i18n,
    dom,
    defaultConfig,
    Db,
    Background
} from "./tools.js";

const showDesc = {
    showBack: false,
    data: ""
};

const db = await new Db().use("Picture", "Config");
const db_Config = db.open("Config");
const db_Picture = db.open("Picture");

const conf = await db_Config.getMutiple(defaultConfig);

document.head.querySelector("title").innerText = i18n("optionPageTitle");

const edit = dom(`
<div class="edit">
    <h2 class="title">${i18n("optionPageTitle")}</h2>
    <textarea class="editArea" placeholder='{}' title="">${JSON.stringify(conf,null,4)}</textarea>
</div>`);

const btns = dom(`
<div class="btns">
    <button class="showDesc">${i18n("optionShowDescBtn")}</button>
    <button class="save">${i18n("optionSave")}</button>
    <button class="restore">${i18n("optionRestore")}</button>
    <button class="addPic">${i18n("optionAddPic")}</button>
    <button class="openPic">${i18n("optionOpenPic")}</button>
    <button class="delPic">${i18n("optionDelPic")}</button>
    <input type=file accept="image/*" style="display:none" id="addPic" />
</div>`);

const editArea = edit.querySelector(".editArea");
const btnSave = btns.querySelector(".save");
const btnShowDesc = btns.querySelector(".showDesc");
const btnRestore = btns.querySelector(".restore");
const btnAddPic = btns.querySelector(".addPic");
const btnOpenPic = btns.querySelector(".openPic");
const btnDelPic = btns.querySelector(".delPic");
const inputAddPic = btns.querySelector("#addPic");

btnShowDesc.addEventListener("click", async () => {
    if (showDesc.showBack) {
        editArea.value = showDesc.data;
        showDesc.showBack = false;
        btnShowDesc.innerText = i18n("optionShowDescBtn");
        return;
    };
    showDesc.data = editArea.value;
    editArea.value = i18n("optionShowDesc");
    btnShowDesc.innerText = i18n("optionShowBackBtn");
    showDesc.showBack = true;
});

btnSave.addEventListener("click", async () => {
    try {
        const newJson = JSON.parse(editArea.value.replace(/[\n|\r]/g, ""));
        await db_Config.setMutiple(newJson, true);
        alert(i18n("optionSaveOK"));
    } catch (err) {
        alert(i18n("optionSaveErr") + err.message);
    };
});

btnRestore.addEventListener("click", () => {
    editArea.value = JSON.stringify(defaultConfig, null, 4);
});

inputAddPic.addEventListener("change", async () => {
    if (!inputAddPic.value) return;
    const res = await db_Picture.set("defaultPic", {
        ok: true,
        desc: inputAddPic.files[0].name,
        pic: inputAddPic.files[0],
    }, true);
    if (res) return alert(i18n("optionAddPicOK"));
    alert(i18n("optionAddPicErr"));
});

btnAddPic.addEventListener("click", async () => {
    inputAddPic.click();
});

btnOpenPic.addEventListener("click", async () => {
    const image = await db_Picture.get("defaultPic");
    if (image && image.ok) return chrome.tabs.create({
        url: URL.createObjectURL(image.pic)
    });
    alert(i18n("optionOpenPicErr"));
});

btnDelPic.addEventListener("click", async () => {
    await db_Picture.remove("defaultPic").then(() => alert(i18n("optionDelPicOK")));
});

await new Background(db, document.body, conf).apply();
document.body.append(edit, btns);