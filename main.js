const { ImageFill } = require("scenegraph");
const os = require("os");
const utils = require("./utils");
const { alert, error } = require("./lib/dialogs");

const dialog = document.createElement('dialog');

const ButtonsEnum = {
    CANCEL: 0,
    OK: 1
};

/**
 * Creates and initializes the dialog UI
 */
async function init() {
    dialog.innerHTML = `
<style>
    form {
        width: 500px;
    }
    label {
        margin-bottom: 10px;
    }
    .h1 {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
    .h1 img {
        width: 18px;
        height: 18px;
        flex: 0 0 18px;
        padding: 0;
        margin: 0;
    }
    img.plugin-icon {
        border-radius: 4px;
        overflow: hidden;
    }
    .container {
        overflow-x: hidden;
        overflow-y: auto;
        height: auto;
    }
    .row {
        align-items: center;
    }
    .zoomLevel {
        width: 57px;
        height: 81px;
        margin: 1px;
    }
    .zoomLevelInput {
        height: 85px;
        width: 100%;
        background: url("images/zoomlevels.png");
        background-size: contain;
    }
    #zoomValue, #mapType {
        font-weight: 700;
    }
    #styles {
        width: 350px;
    }
    #location, #apiKey, #styles {
        width: 300px;
    }
    .zoomLevelInput, .mapTypeInput {
        display: flex;
        width: 350px;
        margin-left: 5px;
        margin-top: 5px;
    }
    .mapType {
        width: 88px;
        position: relative;
        height: 36px;
        margin: 1px;
    }
    .mapTypeInput {
        height: 40px;
        background: url("images/maptypes.png");
        background-size: contain;
    }
    .checkmark {
        position: absolute;
        width: 16px;
        height: 16px;
        top: 12px;
        left: 36px;
        visibility: hidden;
    }
    .mapType.selected .checkmark {
        visibility: visible;
    }
    .note {
        font-size: 10px;
        color: #777777;
    }
    .stylesLink {
        font-size: 10px;
    }
</style>
<form method="dialog">
    <h1 class="h1">
        <span>Maps Generator</span>
        <img class="plugin-icon" src="images/logo2.png" />
    </h1>
    <hr />
    <div class="container">
        <label>
            <p>Location</p>
            <input type="text" id="location" placeholder="Enter a place or address" />
        </label>
        <label>
            <div class="row"><p>Zoom Level: </p><p id="zoomValue">12</p></div>
            <input type="range" min=1 max=20 value=12 step=1 id="zoom" />
            <div class="zoomLevelInput">
                <div class="zoomLevel"> </div>
                <div class="zoomLevel"> </div>
                <div class="zoomLevel"> </div>
                <div class="zoomLevel"> </div>
                <div class="zoomLevel"> </div>
                <div class="zoomLevel"> </div>
            </div>
        </label>
        <label>
            <div class="row"><p>Map Type: </p><p id="mapType">Roadmap</p> </div>
            <div class="mapTypeInput">
                <div class="mapType selected">
                    <img class="checkmark" src="images/checkmark.png" alt="selected" />
                </div>
                <div class="mapType">
                    <img class="checkmark" src="images/checkmark.png" alt="selected" />
                </div>
                <div class="mapType">
                    <img class="checkmark" src="images/checkmark.png" alt="selected" />
                </div>
                <div class="mapType">
                    <img class="checkmark" src="images/checkmark.png" alt="selected" />
                </div>
            </div>
        </label>
        <label>
            <div class="row"><input type="checkbox" checked="true" id="locationPin"/> <p>Include Location Pin</p></div>
        </label>
        <label>
            <p>Enter JSON styles (optional)</p>
            <textarea height="80px" placeholder="Enter JSON styles" id="styles"></textarea>
            <a href="https://developers.google.com/maps/documentation/javascript/style-reference" class="stylesLink">Learn more about Styling</a>
        </label>
        <hr />
        <label>
            <p>Enter Your Google Static Maps API Key</p>
            <input type="text" id="apiKey" />
            <p class="note">NOTE: You must enable billing in your Google Cloud Platform project.</p>
            <a href="https://support.google.com/googleapi/answer/6158867?hl=en" class="stylesLink">Learn how to Enable Billing</a>
        </label>
    </div>
    <footer>
        <button id="btn0" uxp-variant="primary">Cancel</button>
        <button id="btn1" type="submit" uxp-variant="cta">Generate Map</button>
    </footer>
</form>
    `;

    // Zoom level input handling
    const zoomValueEl = dialog.querySelector("#zoomValue");
    const zoomSlider = dialog.querySelector("#zoom");
    zoomSlider.addEventListener("change", function(e) {
        zoomValueEl.textContent = zoomSlider.value;
    });

    const zoomLevels = Array.from(dialog.querySelectorAll(".zoomLevel"));
    const zoomLevelValues = [2, 5, 9, 12, 15, 19];

    zoomLevels.forEach((el, idx) => {
        el.onclick = e => {
            e.preventDefault();
            zoomSlider.value = zoomLevelValues[idx];
            zoomValueEl.textContent = zoomLevelValues[idx];
        }
    });

    // Ensure that the form can submit when the user presses ENTER
    const form = dialog.querySelector('form');
    form.onsubmit = () => dialog.close('ok');

    // Attach button event handlers
    [0, 1].forEach(idx => {
        const button = dialog.querySelector(`#btn${idx}`);
        button.onclick = e => {
            e.preventDefault();
            dialog.close( idx === ButtonsEnum.CANCEL ? 'reasonCanceled' : 'ok');
        }
    });

    // Map types input handling
    const mapTypes = Array.from(dialog.querySelectorAll(".mapType"));
    const mapTypeValues = ["Roadmap", "Terrain", "Satellite", "Hybrid"];
    const mapTypeValueEl = dialog.querySelector("#mapType");

    mapTypes.forEach((el, idx) => {
        el.onclick = e => {
            e.preventDefault();
            mapTypes.forEach(el => el.classList.remove('selected'));
            mapTypes[idx].classList.add('selected');
            mapTypeValueEl.textContent = mapTypeValues[idx];
        }
    });

    // Retrieve previous settings
    const apiKeyInput = dialog.querySelector("#apiKey");
    const savedApiKey = await utils.storageHelper.get('apiKey', '');
    const styles = dialog.querySelector("#styles");
    const savedStyles = await utils.storageHelper.get('styles', '');
    apiKeyInput.value = savedApiKey;
    if (os.platform() === "darwin") {
        styles.innerHTML = savedStyles;
    }
    else {
        styles.value = savedStyles;
    }

    document.appendChild(dialog);
}

/**
 * Gets the Input data from the UI
 * 
 * @returns {Object} Object containing input data
 */
function getInputData() {
    return {
        location: dialog.querySelector('#location').value || '',
        zoom: dialog.querySelector('#zoom').value || '',
        mapType: dialog.querySelector('#mapType').textContent.toLowerCase(),
        locationPin: dialog.querySelector('#locationPin').checked,
        styles: dialog.querySelector('#styles').value || '',
        apiKey: dialog.querySelector('#apiKey').value
    }
}

/**
 * Show the input dialog UI
 * 
 * @returns {Promise} Resolves to an object of form {which, values}. `which` indicates which button
 * was pressed. `values` is an object containing the values of the form.
 */
async function showDialog() {
    try {
        const response = await dialog.showModal();
        if (response === 'reasonCanceled') {
            // user hit ESC
            return {which: ButtonsEnum.CANCEL, value: ''};
        } else {
            return {which: ButtonsEnum.OK, values: getInputData()};
        }
    } catch(err) {
        // system refused the dialog
        return {which: ButtonsEnum.CANCEL, value: ''};
    }
}

/**
 * Main function which generates the map
 */
async function generateMap(selection) {
    if (selection.items.length === 0) {
        await error(
            "Selection Error",
            "Please select some layers.",
            "Supported layers are Rectangle, Ellipse, Path and BooleanGroup."
         );
        return ;
    }

    const response = await showDialog();
    if (response.which === ButtonsEnum.CANCEL) { // Dialog cancelled
        return;
    }
    
    const inputValues = response.values;
    let mapStyles = '';

    // Error checking
    if (inputValues.location == "") {
        error("Error", "You did not provide a place or address for your location.");
        return;
    }

    if (inputValues.apiKey == "") {
        error("Error", "Missing Google Static Maps API key. <a href=\"https://developers.google.com/maps/documentation/maps-static/get-api-key\">Generate one!</a>");
        return;
    }

    try {
        if (inputValues.styles) {
            mapStyles = utils.parseStyles(inputValues.styles);
        }
    } catch (errMsg) {
        await error("Error", "There are errors in styles JSON.");
        return;
    }

    const totalObjCount = selection.items.length;
    let filledObjCount = 0;
    let finishMsg = "";

    for (let node of selection.items) {
        let width, height;

        try {
            ({width, height} = utils.getDimensions(node));
        } catch(errMsg) {
            finishMsg += `\n${node.constructor.name} is not supported and so was skipped.\n`
            continue;
        }

        // Save settings
        try {
            await utils.storageHelper.set('apiKey', dialog.querySelector("#apiKey").value);
        } catch(errMsg) {
            await error("Error", errMsg);
            return;
        }
        try {
            await utils.storageHelper.set('styles', dialog.querySelector("#styles").value);
        } catch(errMsg) {
            await error("Error", errMsg);
            return;
        }

        const url = "https://maps.googleapis.com/maps/api/staticmap?" +
            "center=" + encodeURIComponent(inputValues.location) +
            "&zoom=" + encodeURIComponent(inputValues.zoom) +
            "&size=" + encodeURIComponent(width) + "x" + encodeURIComponent(height) +
            "&scale=2" +
            "&maptype=" + encodeURIComponent(inputValues.mapType) +
            (inputValues.locationPin ? ("&markers=color:red%7C" + encodeURIComponent(inputValues.location)) : "") +
            mapStyles +
            "&key=" + encodeURIComponent(inputValues.apiKey);

        try {
            const tempFile = await utils.downloadImage(url);
            const imageFill = new ImageFill(tempFile);
            node.fill = imageFill;
            node.fillEnabled = true;
        } catch (errMsg) {
            await error("Error", errMsg);
            return;
        }

        filledObjCount++;
    }

    if (finishMsg) { // Show done dialog only if some layers are skipped
        finishMsg += `\n${filledObjCount} of ${totalObjCount} selected objects were filled\n`;
        await alert("Done", finishMsg);
    }

    return ;
}

init(); // Creates the dialog

module.exports = {
    commands: {
        generateMap
    }
}
