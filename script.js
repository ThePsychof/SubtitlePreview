// =====================================
// Subtitle Preview
// Part 1
// =====================================

// ---------- Elements ----------

const subtitle = document.getElementById("subtitle");
const preview = document.getElementById("preview");

const subtitleText = document.getElementById("subtitleText");

const fontFamily = document.getElementById("fontFamily");

const fontSize = document.getElementById("fontSize");

const fontSizeValue = document.getElementById("fontSizeValue");

const fontColor = document.getElementById("fontColor");

const backgroundUpload =
    document.getElementById("backgroundUpload");

const resetBackground =
    document.getElementById("resetBackground");

// ---------- Defaults ----------

const defaults = {

    text:
        "This is what your subtitle will look like.",

    font:
        "Arial",

    size:
        22,

    color:
        "#ffff00"

};

// =====================================
// Subtitle
// =====================================

function updateSubtitleText(){

    subtitle.textContent =
        subtitleText.value;

}

function updateFontFamily(){

    subtitle.style.fontFamily =
        fontFamily.value;

}

function updateFontSize(){

    subtitle.style.fontSize =
        fontSize.value + "px";

    fontSizeValue.textContent =
        fontSize.value + " px";

}

function updateFontColor(){

    subtitle.style.color =
        fontColor.value;

}

// =====================================
// Apply Everything
// =====================================

function refresh(){

    updateSubtitleText();

    updateFontFamily();

    updateFontSize();

    updateFontColor();

}

// =====================================
// Events
// =====================================

subtitleText.addEventListener(

    "input",

    refresh

);


fontFamily.addEventListener(

    "change",

    refresh

);

fontSize.addEventListener(

    "input",

    refresh

);

fontColor.addEventListener(

    "input",

    refresh

);

// =====================================
// Background Upload
// =====================================

function loadBackground(file){

    if(!file){

        return;

    }

    const reader =
        new FileReader();

    reader.onload = function(event){

        preview.style.backgroundImage =
            url("${event.target.result}");

    };

    reader.readAsDataURL(file);

}

backgroundUpload.addEventListener(

    "change",

    function(){

        const file =
            this.files[0];

        loadBackground(file);

    }

);
// =====================================
// Part 2
// =====================================

// ---------- Remove Background ----------

function removeBackground() {

    preview.style.backgroundImage = "none";

    backgroundUpload.value = "";

}

resetBackground.addEventListener(

    "click",

    removeBackground

);

// ---------- Reset Everything ----------

function resetDefaults() {

    subtitleText.value =
        defaults.text;

    fontFamily.value =
        defaults.font;

    fontSize.value =
        defaults.size;

    fontColor.value =
        defaults.color;

    removeBackground();

    refresh();

}

// =====================================
// Drag & Drop Support
// =====================================

preview.addEventListener("dragover", function (e) {

    e.preventDefault();

});

preview.addEventListener("drop", function (e) {

    e.preventDefault();

    const file = e.dataTransfer.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) return;

    loadBackground(file);

});

// =====================================
// Paste Image (Ctrl + V)
// =====================================

window.addEventListener("paste", function (e) {

    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {

        const item = items[i];

        if (item.type.startsWith("image/")) {

            const file = item.getAsFile();

            loadBackground(file);

            break;

        }

    }

});

// =====================================
// Double Click Preview
// Removes Background
// =====================================

preview.addEventListener("dblclick", removeBackground);

// =====================================
// Keyboard Shortcut
// Ctrl + R = Reset
// =====================================

window.addEventListener("keydown", function (e) {

    if (e.ctrlKey && e.key.toLowerCase() === "r") {

        e.preventDefault();

        resetDefaults();

    }

});

// =====================================
// Initial State
// =====================================

refresh();

console.log(
    "Subtitle Preview loaded successfully."
);