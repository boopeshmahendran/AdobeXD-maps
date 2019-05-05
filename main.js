const { ImageFill } = require("scenegraph");
const utils = require("./utils");
const { alert, error } = require("./lib/dialogs");

const dialog = document.createElement('dialog');

const ButtonsEnum = {
    CANCEL: 0,
    OK: 1
};

let selectedMapType = '';

/**
 * Creates and initializes the dialog UI
 */
function init() {
    dialog.innerHTML = `
<style>
    form {
        width: 360px;
    }
    #zoomLevelsImg {
        height: 85px;
    }
    .mapType {
        position: relative;
    }
    .selectedTick {
        position: absolute;
        width: 26px;
        height: 26px;
        top: 50%;
        left: 35%;
        visibility: hidden;
    }
    .mapType.selected .selectedTick {
        visibility: visible;
    }
    .mapTypeImg {
        height: 85px;
        margin: 1px;
    }
    .mapTypeInput {
        display: flex;
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
    .spread {
        justify-content: space-between;
    }
</style>
<form method="dialog">
    <h1 class="h1">
        <span>Maps generator</span>
        <img class="plugin-icon" src="images/logo2.png" />
    </h1>
    <hr />
    <div class="container">
                <label>
                    <span>Location</span>
                    <input type="text" id="location" placeholder="Location (Enter a place name or address)" />
                </label>
                <label>
                    <div class="row spread">
                        <span>Zoom Level</span>
                        <span id="zoomValue">12</span>
                    </div>
                    <input type="range" min=1 max=20 value=12 step=1 id="zoom" />
                </label>
                <img id="zoomLevelsImg" src="images/zoomlevels.png" alt="Zoom Levels Example" />
                <label>
                    <span>Map Type</span>
                </label>
                <div class="mapTypeInput">
                    <div class="mapType selected">
                        <img class="mapTypeImg" src="images/roadmap.png" alt="Roadmap Map Type" />
                        <img class="selectedTick" src="images/selectedTick.png" alt="selectedTick" />
                    </div>
                    <div class="mapType">
                        <img class="mapTypeImg" src="images/terrain.png" alt="Terrain Map Type" />
                        <img class="selectedTick" src="images/selectedTick.png" alt="selectedTick" />
                    </div>
                    <div class="mapType">
                        <img class="mapTypeImg" src="images/satellite.png" alt="Satellite Map Type" />
                        <img class="selectedTick" src="images/selectedTick.png" alt="selectedTick" />
                    </div>
                    <div class="mapType">
                        <img class="mapTypeImg" src="images/hybrid.png" alt="Hybrid Map Type" />
                        <img class="selectedTick" src="images/selectedTick.png" alt="selectedTick" />
                    </div>
                </div>
                <label class="row">
                    <input type="checkbox" checked="true" id="locationPin"/>
                    <span> Include Location Pin </span>
                </label>
                <label>
                    <span>(Optional) Enter Styles json: </span>
                    <textarea height="100px" placeholder="Enter Styles json" id="styles"></textarea>
                </label>
                <p><a href="https://developers.google.com/maps/documentation/javascript/style-reference">Learn more about Styling</a></p>
    </div>
    <footer>
        <button id="btn0" uxp-variant="primary">Cancel</button>
        <button id="btn1" type="submit" uxp-variant="cta">Generate Map</button>
    </footer>
</form>
    `;

    // Update slider label on slider value change
    const zoomValueEl = dialog.querySelector("#zoomValue");
    const zoomSlider = dialog.querySelector("#zoom");
    zoomSlider.addEventListener("change", function(e) {
        zoomValueEl.textContent = zoomSlider.value;
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
    const mapTypeValues = ["roadmap", "terrain", "satellite", "hybrid"];

    const selectMapType = idx => {
        mapTypes.forEach(el => el.classList.remove('selected'));
        mapTypes[idx].classList.add('selected');
    };

    mapTypes.forEach((el, idx) => {
        el.onclick = e => {
            e.preventDefault();
            selectMapType(idx);
            selectedMapType = mapTypeValues[idx];
        }
    })


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
        mapType: selectedMapType,
        locationPin: dialog.querySelector('#locationPin').checked,
        styles: dialog.querySelector('#styles').value || ''
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
            return {
                which: ButtonsEnum.OK,
                values: getInputData()
            };
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

    try {
        if (inputValues.styles) {
            mapStyles = utils.parseStyles(inputValues.styles);
        }
    } catch (errMsg) {
        await error("Error", "There are errors in styles JSON");
        return;
    }

    const apiKey = utils.getApiKey();

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

        const url = "https://maps.googleapis.com/maps/api/staticmap?" +
            "center=" + encodeURIComponent(inputValues.location) +
            "&zoom=" + encodeURIComponent(inputValues.zoom) +
            "&size=" + encodeURIComponent(width) + "x" + encodeURIComponent(height) +
            "&scale=2" +
            "&maptype=" + encodeURIComponent(inputValues.mapType) +
            (inputValues.locationPin ? ("&markers=color:red%7C" + encodeURIComponent(inputValues.location)): "") +
            mapStyles +
            "&key=" + encodeURIComponent(apiKey);

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