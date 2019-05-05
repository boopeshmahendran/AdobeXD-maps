const { ImageFill } = require("scenegraph");
const utils = require("./utils");
const { alert, error } = require("./lib/dialogs");

const dialog = document.createElement('dialog');

const ButtonsEnum = {
    CANCEL: 0,
    OK: 1
};

function init() {
    dialog.innerHTML = `
<style>
    form {
        width: 360px;
    }
    #zoomLevelsImg {
        height: 85px;
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
        zoverflow-x: hidden;
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
                    <select id="mapType">
                        <option value="roadmap">Roadmap</option>
                        <option value="terrain">Terrain</option>
                        <option value="satellite">Satellite</option>
                        <option value="hybrid">Hybrid</option>
                    </select>
                </label>
                <label class="row">
                    <span> Location Pin </span>
                    <input type="checkbox" checked="true" id="locationPin"/>
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

    // Default select first value in map type drop down
    dialog.querySelector("#mapType").selectedIndex = 0;

    // Ensure that the form can submit when the user presses ENTER (we trigger the OK button here)
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

    document.appendChild(dialog);
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
                values: {
                    location: dialog.querySelector('#location').value || '',
                    zoom: dialog.querySelector('#zoom').value || '',
                    mapType: dialog.querySelector('#mapType').value || '',
                    locationPin: dialog.querySelector('#locationPin').checked,
                    styles: dialog.querySelector('#styles').value || ''
                }
            };
        }
    } catch(err) {
        // system refused the dialog
        return {which: ButtonsEnum.CANCEL, value: ''};
    } 
}

/**
 * Gets the dimensions of a node based on its type
 * 
 * @returns {Object} Object containing width and height
 */
function getDimensions(node) {
    let width, height;
    switch(node.constructor.name) {
        case "Rectangle":
            width = node.width;
            height = node.height;
            break;
        case "Ellipse": 
            width = node.radiusX * 2;
            height = node.radiusY * 2;
            break;
        case "BooleanGroup": // Selecting arbitrary values for path and boolean group
        case "Path": 
            width = 500;
            height = 500;
            break;
        default:
            throw "Not supported"
    }

    return {
        width, height
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
            ({width, height} = getDimensions(node));
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