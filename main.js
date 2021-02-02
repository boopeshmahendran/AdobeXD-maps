const { ImageFill } = require("scenegraph");
const os = require("os");
const utils = require("./utils");
const { alert, error } = require("./lib/dialogs");
const { editDocument } = require("application");

let panel;

/**
 * Creates and initializes the dialog UI
 */
async function init() {

    const HTML = `
<style>
    form {
        padding: 4px;
    }
    label {
        padding-right: 8px;
        margin-bottom: 10px;
    }
    .container {
        overflow-x: hidden;
        overflow-y: auto;
        height: auto;
    }
    .row {
        align-items: center;
    }
    .zoomLevelImage {
        min-height: 65px;
        max-height: 150px;
        object-fit: contain;
    }
    .zoomLevel {
        width: 100%;
        height: auto;
        margin: 1px;
    }
    #zoomValue, #mapType {
        font-weight: 700;
    }
    #location, #apiKey, #styles {
        width: 100%;
    }
    .zoomLevelInput, .mapTypeInput {
        display: flex;
        width: 100%;
        margin-top: 5px;
        justify-content: space-around;
    }
    .mapTypeImage{
        min-height: 36px;
        max-height: 60px;
        object-fit:contain;
    }
    .mapType {
        width: 100%;
        position: relative;
        margin: 1px;
        align-content: center;
    }
    .checkmark {
        position: absolute;
        
        min-width: 15px;
        width: 25%;
        max-width: 30px;

        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
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
        text-align: right;
        font-size: 10px;
    }
</style>
<form method="dialog">
    <div class="container">
        <label>
            <p>Location</p>
            <input type="text" id="location" placeholder="Enter a place or address" />
        </label>
        <label>
            <div class="row"><p>Zoom Level: </p><p id="zoomValue">12</p></div>
            <input type="range" min=1 max=20 value=12 step=1 id="zoom" />
            <div class="zoomLevelInput">
                <div class="zoomLevel">
                    <img class="zoomLevelImage" src="images/zoomlevels/2.png">
                </div>
                <div class="zoomLevel">
                    <img class="zoomLevelImage" src="images/zoomlevels/5.png">
                </div>
                <div class="zoomLevel">
                    <img class="zoomLevelImage" src="images/zoomlevels/9.png">
                </div>
                <div class="zoomLevel">
                    <img class="zoomLevelImage" src="images/zoomlevels/12.png">
                </div>
                <div class="zoomLevel">
                    <img class="zoomLevelImage" src="images/zoomlevels/15.png">
                </div>
                <div class="zoomLevel">
                    <img class="zoomLevelImage" src="images/zoomlevels/19.png">
                </div>
            </div>
        </label>
        <label>
            <div class="row"><p>Map Type: </p><p id="mapType">Roadmap</p> </div>
            <div class="mapTypeInput">
                <div class="mapType selected">
                    <img class="mapTypeImage" src="images/maptypes/roadmap.png">
                    <img class="checkmark" src="images/checkmark.png" alt="selected" />
                </div>
                <div class="mapType">
                    <img class="mapTypeImage" src="images/maptypes/terrain.png">
                    <img class="checkmark" src="images/checkmark.png" alt="selected" />
                </div>
                <div class="mapType">
                    <img class="mapTypeImage" src="images/maptypes/satellite.png">
                    <img class="checkmark" src="images/checkmark.png" alt="selected" />
                </div>
                <div class="mapType">
                    <img class="mapTypeImage" src="images/maptypes/hybrid.png"> 
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
        <button id="btn1" type="submit" uxp-variant="cta">Generate Map</button>
    </footer>
</form>
    `;

    panel = document.createElement("panel");
    panel.innerHTML = HTML;

    // Zoom level input handling
    const zoomValueEl = panel.querySelector("#zoomValue");
    const zoomSlider = panel.querySelector("#zoom");
    zoomSlider.addEventListener("input", function (e) {
        zoomValueEl.textContent = zoomSlider.value;
    });

    const zoomLevels = Array.from(panel.querySelectorAll(".zoomLevel"));
    const zoomLevelValues = [2, 5, 9, 12, 15, 19];

    zoomLevels.forEach((el, idx) => {
        el.onclick = e => {
            e.preventDefault();
            zoomSlider.value = zoomLevelValues[idx];
            zoomValueEl.textContent = zoomLevelValues[idx];
        }
    });

    // Ensure that the form can submit when the user presses ENTER
    const form = panel.querySelector('form');
    form.onsubmit = generateMap;

    // Attach button event handlers

    const button = panel.querySelector(`#btn1`);
    button.onclick = generateMap;

    // Map types input handling
    const mapTypes = Array.from(panel.querySelectorAll(".mapType"));
    const mapTypeValues = ["Roadmap", "Terrain", "Satellite", "Hybrid"];
    const mapTypeValueEl = panel.querySelector("#mapType");

    mapTypes.forEach((el, idx) => {
        el.onclick = e => {
            e.preventDefault();
            mapTypes.forEach(el => el.classList.remove('selected'));
            mapTypes[idx].classList.add('selected');
            mapTypeValueEl.textContent = mapTypeValues[idx];
        }
    });

    // Retrieve previous settings
    const apiKeyInput = panel.querySelector("#apiKey");
    const savedApiKey = await utils.storageHelper.get('apiKey', '');
    const styles = panel.querySelector("#styles");
    const savedStyles = await utils.storageHelper.get('styles', '');
    apiKeyInput.value = savedApiKey;
    if (os.platform() === "darwin") {
        styles.innerHTML = savedStyles;
    }
    else {
        styles.value = savedStyles;
    }

    return panel;

}

/**
 * Gets the Input data from the UI
 * 
 * @returns {Object} Object containing input data
 */
function getInputData() {
    return {
        location: panel.querySelector('#location').value || '',
        zoom: panel.querySelector('#zoom').value || '',
        mapType: panel.querySelector('#mapType').textContent.toLowerCase(),
        locationPin: panel.querySelector('#locationPin').checked,
        styles: panel.querySelector('#styles').value || '',
        apiKey: panel.querySelector('#apiKey').value
    }
}

async function show(event) {

    if(!panel){
        panel = await init();
        event.node.appendChild(panel);
    }

}

function hide(event) {
    // Not necessary at the moment
}

function update(selection) {
  
    panel.querySelector("#btn1").disabled = selection.items.length === 0;

}

/**
 * Main function which generates the map
 */
async function generateMap() {

    const inputValues = getInputData();
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


    editDocument({ editLabel: "Generate Map" }, async function (selection) {

        //This error handling is going to move somewhere else

        const totalObjCount = selection.items.length;
        let filledObjCount = 0;
        let finishMsg = "";

        for (let node of selection.items) {
            let width, height;

            try {
                ({ width, height } = utils.getDimensions(node));
            } catch (errMsg) {
                finishMsg += `\n${node.constructor.name} is not supported and so was skipped.\n`
                continue;
            }

            // Save settings
            try {
                await utils.storageHelper.set('apiKey', panel.querySelector("#apiKey").value);
            } catch (errMsg) {
                await error("Error", errMsg);
                return;
            }
            try {
                await utils.storageHelper.set('styles', panel.querySelector("#styles").value);
            } catch (errMsg) {
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

    })

    return;
}

module.exports = {
    //   commands: {
    //      generateMap
    //    },
    panels: {
        mapGenerator: {
            show,
            hide,
            update
        }
    }
}
