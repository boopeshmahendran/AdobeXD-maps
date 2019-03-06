const uxp = require("uxp").storage;
const apiKeys = require("./apiKeys.json").apiKeys;
const fs = uxp.localFileSystem;

async function downloadImage(photoUrl) {
    try {
        const photoObj = await xhrBinary(photoUrl);
        const tempFolder = await fs.getTemporaryFolder();
        const tempFile = await tempFolder.createFile("tmp", { overwrite: true });
        await tempFile.write(photoObj, { format: uxp.formats.binary });
        return tempFile;
    } catch (err) {
        console.log("error")
        console.log(err.message);
    }
}

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
        req.onerror = reject;
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
    console.log(apiKeys);
    const length = apiKeys.length;
    return apiKeys[Math.floor(Math.random()*length)];
}

module.exports = {
    downloadImage,
    getApiKey
};