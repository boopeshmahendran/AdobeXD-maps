const { ImageFill } = require("scenegraph");
const utils = require("./utils");
const { alert, error } = require("./lib/dialogs");


/**
 * Creates and show the input dialog UI
 * 
 * @returns {Promise} Resolves to an object of form {which, values}. `which` indicates which button
 * was pressed. `values` is an object containing the values of the form.
 */
async function showDialog() {
    let buttons = [
        { label: "Cancel", variant: "primary" },
        { label: "Generate Map", variant: "cta", type: "submit" }
    ];

    const dialog = document.createElement('dialog');
    dialog.innerHTML = `
<style>
    form {
        width: 360px;
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
                    <input type="checkbox" checked="true" id="locationPin"/>
                    <span> Location Pin </span>
                </label>
                <label>
                    <span>Enter Styles JSON</span>
                    <textarea id="styles"></textarea>
                </label>
    </div>
    <footer>
        ${buttons.map(({label, type, variant} = {}, idx) => `<button id="btn${idx}" type="${type}" uxp-variant="${variant}">${label}</button>`).join('')}
    </footer>
</form>
    `;

    // Update slider label on slider value change
    const zoomValueEl = dialog.querySelector("#zoomValue");
    const zoomSlider = dialog.querySelector("#zoom");
    zoomSlider.addEventListener("change", function(e) {
        zoomValueEl.textContent = zoomSlider.value;
    })

    // Default select first value in map type drop down
    dialog.querySelector("#mapType").selectedIndex = 0;

    // The "ok" and "cancel" button indices. OK buttons are "submit" or "cta" buttons. Cancel buttons are "reset" buttons.
    let okButtonIdx = -1;
    let cancelButtonIdx = -1;
    let clickedButtonIdx = -1;

    // Ensure that the form can submit when the user presses ENTER (we trigger the OK button here)
    const form = dialog.querySelector('form');
    form.onsubmit = () => dialog.close('ok');

    // Attach button event handlers and set ok and cancel indices
    buttons.forEach(({type, variant} = {}, idx) => {
        const button = dialog.querySelector(`#btn${idx}`);
        if (type === 'submit' || variant === 'cta') {
            okButtonIdx = idx;
        }
        if (type === 'reset') {
            cancelButtonIdx = idx;
        }
        button.onclick = e => {
            e.preventDefault();
            clickedButtonIdx = idx;
            dialog.close( idx === cancelButtonIdx ? 'reasonCanceled' : 'ok');
        }
    });

    try {
        document.appendChild(dialog);
        const response = await dialog.showModal();
        if (response === 'reasonCanceled') {
            // user hit ESC
            return {which: cancelButtonIdx, value: ''};
        } else {
            if (clickedButtonIdx === -1) {
                // user pressed ENTER, so no button was clicked!
                clickedButtonIdx = okButtonIdx; // may still be -1, but we tried
            }
            return {
                which: clickedButtonIdx,
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
        return {which: cancelButtonIdx, value: ''};
    } finally {
        dialog.remove();
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
            "Supported layers are Rectangle, Ellipse and Path."
         );
        return ;
    }

    const response = await showDialog();
    if (response.which === 0) { // cancel was pressed
        return;
    }
    
    const inputValues = response.values;
    let mapStyles;

    try {
        mapStyles = utils.parseStyles(inputValues.styles);
    } catch (errMsg) {
        await error("Error", errMsg);
        return;
    }

    const apiKey = utils.getApiKey();

    const totalObjCount = selection.items.length;
    let filledObjCount = 0;
    let finishMsg = "";


    for (let node of selection.items) {
        let width, height;

        if (node.constructor.name === "Rectangle") {
            width = node.width;
            height = node.height;
        } else if (node.constructor.name === "Ellipse") {
            width = node.radiusX * 2;
            height = node.radiusY * 2;
        } else if (node.constructor.name === "Path") { // selecting arbitrary values for path
            width = 500;
            height = 500;
        } else {
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
            "&" + mapStyles +
            "&key=" + encodeURIComponent(apiKey);

        try {
            const tempFile = await utils.downloadImage(url);
            const imageFill = new ImageFill(tempFile);
            node.fill = imageFill;
        } catch (errMsg) {
            await error("Error", errMsg);
            return;
        }

        filledObjCount++;
    }

    finishMsg += `\n${filledObjCount} of ${totalObjCount} selected objects were filled\n`;

    await alert("Done", finishMsg);
    return ;
}

module.exports = {
    commands: {
        generateMap
    }
}