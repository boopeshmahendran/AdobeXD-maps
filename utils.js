const uxp = require("uxp").storage;
const apiKeys = require("./apiKeys.json").apiKeys;
const fs = uxp.localFileSystem;

/**
 * Downloads an image from the photoUrl and
 * stores it in a temp file and returns the file
 *
 * @param {url} photoUrl
 */
async function downloadImage(photoUrl) {
    const photoObj = await xhrBinary(photoUrl);
    const tempFolder = await fs.getTemporaryFolder();
    const tempFile = await tempFolder.createFile("tmp", { overwrite: true });
    await tempFile.write(photoObj, { format: uxp.formats.binary });
    return tempFile;
}

/**
 * Fetches a url with binary data and returns a promise
 * which resolves with this data
 *
 * @param {url} url
 */
function xhrBinary(url) {
    return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.onload = () => {
            if (req.status === 200) {
                try {
                    const arr = new Uint8Array(req.response);
                    resolve(arr);
                } catch (err) {
                    reject('Couldnt parse response. ${err.message}, ${req.response}');
                }
            } else {
                reject('Request had an error: ${req.status}');
            }
        }
        req.onerror = function() {
            reject('Network Request failed. Please ensure you have internet connectivitiy.');
        };
        req.onabort = reject;
        req.open('GET', url, true);
        req.responseType = "arraybuffer";
        req.send();
    });
}

/**
 * Gets a random api key from the apikeys list in apikeys.json
 */
function getApiKey() {
    const length = apiKeys.length;
    return apiKeys[Math.floor(Math.random()*length)];
}

/**
 * Converts a styles json to styles url parameter
 * Copied from https://stackoverflow.com/questions/19115223/converting-google-maps-styles-array-to-google-static-maps-styles-string
 * 
 * @param {string} jsonStr 
 * @return string
 */

function parseStyles(jsonStr) {
    let json;
    let result = [];

    json = JSON.parse(jsonStr);

    json.forEach((item) => {
        let style = '';
        if (item.stylers && item.stylers.length > 0) {
            // add feature
            if (item.hasOwnProperty('featureType')) {
                style += 'feature:' + item.featureType + '|'
            } else {
                style += 'feature:all' + '|'
            }

            // add element
            if (item.hasOwnProperty('elementType')) {
                style += 'element:' + item.elementType + '|'
            } else {
                style += 'element:all' + '|'
            }

            // add stylers
            item.stylers.forEach((styler) => {
                const propName = Object.keys(styler)[0];
                const propVal = styler[propName].toString().replace('#', '0x');
                style += propName + ':' + propVal + '|';
            });
        }
        result.push('style=' + encodeURIComponent(style));
    });

    return '&' + result.join('&');
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

module.exports = {
    downloadImage,
    getApiKey,
    parseStyles,
    getDimensions
};