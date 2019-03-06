const { ImageFill } = require("scenegraph");
const utils = require("./utils");
const { error } = require("./lib/dialogs");


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
</style>
<form method="dialog">
    <h1 class="h1">
        <span>Maps</span>
        <img class="plugin-icon" src="x" />
    </h1>
    <hr />
    <div class="container">
                <label>
                    <span>Location</span>
                    <input type="text" id="location" placeholder="Location (Enter a place name or address)" />
                </label>
                <label>
                    <span>Zoom Level</span>
                    <input type="range" min=1 max=20 value=12 step=1 id="zoom" />
                </label>
                <label>
                    <span>Map Type</span>
                    <select id="mapType" uxp-quiet="true">
                        <option value="roadmap">Roadmap</option>
                        <option value="terrain">Terrain</option>
                        <option value="satellite">Satellite</option>
                        <option value="hybrid">Hybrid</option>
                    </select>
                </label>
    </div>
    <footer>
        ${buttons.map(({label, type, variant} = {}, idx) => `<button id="btn${idx}" type="${type}" uxp-variant="${variant}">${label}</button>`).join('')}
    </footer>
</form>
    `;

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


async function generateMap(selection) {
    if (selection.items.length === 0) {
        await error("Selection Error", "Please select a item");
        return ;
    }

    const response = await showDialog();
    if (response.which === 0) { // cancel was pressed
        return;
    }

    const apiKey = utils.getApiKey();

    for (let node of selection.items) {
        const url = "https://maps.googleapis.com/maps/api/staticmap?" +
            "center=" + encodeURIComponent(response.values.location) +
            "&zoom=" + encodeURIComponent(response.values.zoom) +
            "&size=" + encodeURIComponent(node.width) + "x" + encodeURIComponent(node.height) +
            "&scale=2" +
            "&maptype=" + encodeURIComponent(response.values.mapType) +
            "&markers=color:red%7C" + encodeURIComponent(response.values.location) +
            "&key=" + encodeURIComponent(apiKey);

        const tempFile = await utils.downloadImage(url);

        console.log(url);
        console.log(node.width);
        console.log(node.height);

        const imageFill = new ImageFill(tempFile);
        node.fill = imageFill;
    }
}

module.exports = {
    commands: {
        generateMap
    }
}