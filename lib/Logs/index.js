const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/**
 * This is a library for storing and rotating logs
 */
class Logs {

    constructor() {
        this.baseDir = path.join(__dirname, "/../../.logs/")
    }

    // Append a string to a file. Create the file if it does not exist.
    async append(file, str) {
        // Open the file for appending
        return await new Promise((resolve, reject) => {
            fs.open(`${this.baseDir}${file}.log`, "a", (err, fileDescriptor) => {
                if (!err && fileDescriptor) {
                    // Append to the file and close it
                    fs.appendFile(fileDescriptor, str+"\n", err => {
                        if (!err) {
                            fs.close(fileDescriptor, err => {
                                if (!err) resolve(false);
                                reject(`Error closing the log file that was being appended. Path : ${this.baseDir}${file}.log`);
                            })
                        } else {
                            reject(`Error appending to log file. Path : ${this.baseDir}${file}.log`)
                        }
                    })
                } else {
                    reject(`Could not open the log file for appending. Path : ${this.baseDir}${file}.log`)
                }
            })
        })
    }

    /**
     * List all the logs (can be an empty array) and optionally include the compressed logs
     * @param includeCompressedLogs {boolean}
     * @return {Promise<Array | string>} - return error string if error otherwise return array
     */
    async list(includeCompressedLogs) {
        return await new Promise(resolve => {
            fs.readdir(this.baseDir, (err, data) => {
                if (!err && data) {
                    data = data.filter(name => !name.startsWith("."));
                    if (!includeCompressedLogs) {
                        data = data.filter(name => !name.endsWith(".gz.b64"))
                    }
                    data = data.map(name => name.replace(".log", "")).map(name => name.replace(".gz.b64", ""));
                    resolve(data)
                } else {
                    resolve(err)
                }
            })
        })
    }

    /**
     * Compress the contents of one .log file into a .gz.b64 file within the same directory
     * @param logId - the file to compress
     * @param newFileId - the compressed file as result
     * @return {Promise<boolean | string>} - false if no error; otherwise return error string
     */
    async compress(logId, newFileId) {
        const sourceFile = logId+".log";
        const destFile = newFileId+".gz.b64";
        // Read the source file
        return await new Promise(resolve => {
            fs.readFile(`${this.baseDir}${sourceFile}`, "utf8", (err, inputString) => {
                if (!err && inputString) {
                    // Compress the data using gzip
                    zlib.gzip(inputString, (err, buffer) => {
                        if (!err && buffer) {
                            // Send the data to the destination file
                            fs.open(`${this.baseDir}${destFile}`, "wx", (err, fileDescriptor) => {
                                if (!err && fileDescriptor) {
                                    // Continue to write file
                                    fs.writeFile(fileDescriptor, Buffer.from(buffer).toString("base64"), err => {
                                        if (!err) {
                                            // Close the destination file
                                            fs.close(fileDescriptor, err => {
                                                if (!err) {
                                                    resolve(false)
                                                } else {
                                                    resolve(err)
                                                }
                                            })
                                        } else {
                                            resolve(err)
                                        }
                                    })
                                } else {
                                    resolve(err)
                                }
                            })
                        } else {
                            resolve(err)
                        }
                    })
                } else {
                    resolve(err)
                }
            })
        })
    }

    /**
     * Decompress the contents of a .gz.b64 file into a string variable
     * @param fileId
     * @return {Promise<{error : boolean, value : string}>}
     */
    async decompress(fileId) {
        const filename = fileId+".gz.b64";
        const result = {
            error : false,
            value : false
        };
        return await new Promise(resolve => {
            fs.readFile(`${this.baseDir}${filename}`, "utf8", (err, str) => {
                if (!err && str) {
                    // Decompress the data
                    const inputBuffer = Buffer.from(str, "base64");
                    zlib.unzip(inputBuffer, (err, outputBuffer) => {
                        if (!err && outputBuffer) {
                            result.value = outputBuffer.toString();
                            resolve(result)
                        } else {
                            result.error = true;
                            result.value = err;
                            resolve(result)
                        }
                    })
                } else {
                    result.error = true;
                    result.value = err;
                    resolve(result)
                }
            })
        })
    }

    async truncate(logId) {
        return await new Promise(resolve => {
            fs.truncate(`${this.baseDir}${logId}.log`, 0, err => {
                if (!err) {
                    resolve(false)
                } else {
                    resolve(err)
                }
            })
        })
    }

}

module.exports = new Logs();