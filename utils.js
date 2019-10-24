const storage = require("uxp").storage;
const fs = storage.localFileSystem;

let data;

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
    await tempFile.write(photoObj, { format: storage.formats.binary });
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
        case "Polygon":
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
 * A little helper class to make storing key-value-pairs (e.g. settings) for plugins for Adobe XD CC easier.
 */
class storageHelper {
    /**
     * Creates a data file if none was previously existent.
     * @return {Promise<storage.File>} The data file
     * @private
     */
    static async init() {
        let dataFolder = await fs.getDataFolder();
        try {
            let returnFile = await dataFolder.getEntry('storage.json');
            data = JSON.parse((await returnFile.read({format: storage.formats.utf8})).toString());
            return returnFile;
        } catch (e) {
            const file = await dataFolder.createEntry('storage.json', {type: storage.types.file, overwrite: true});
            if (file.isFile) {
                await file.write('{}', {append: false});
                data = {};
                return file;
            } else {
                throw new Error('Storage file storage.json was not a file.');
            }
        }
    }

    /**
     * Retrieves a value from storage. Saves default value if none is set.
     * @param {string} key The identifier
     * @param {*} defaultValue The default value. Gets saved and returned if no value was previously set for the speciefied key.
     * @return {Promise<*>} The value retrieved from storage. If none is saved, the `defaultValue` is returned.
     */
    static async get(key, defaultValue) {
        if (!data) {
            const dataFile = await this.init();
            data = JSON.parse((await dataFile.read({format: storage.formats.utf8})).toString());
        }
        if (data[key] === undefined) {
            await this.set(key, defaultValue);
            return defaultValue;
        } else {
            return data[key];
        }
    }

    /**
     * Saves a certain key-value-pair to the storage.
     * @param {string} key The identifier
     * @param {*} value The value that get's saved
     * @return {Promise<void>}
     */
    static async set(key, value) {
        const dataFile = await this.init();
        data[key] = value;
        return await dataFile.write(JSON.stringify(data), {append: false, format: storage.formats.utf8})
    }

    /**
     * Deletes a certain key-value-pair from the storage
     * @param {string} key The key of the deleted pair
     * @return {Promise<void>}
     */
    static async delete(key) {
        return await this.set(key, undefined);
    }

    /**
     * Resets (i.e. purges) all stored settings.
     * @returns {Promise<void>}
     */
    static async reset() {
        const dataFile = await this.init();
        return await dataFile.write('{}', {append: false, format: storage.formats.utf8})

    }
}

module.exports = {
    downloadImage,
    parseStyles,
    getDimensions,
    storageHelper
};
