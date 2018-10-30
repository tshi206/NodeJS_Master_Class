/**
 * Library for storing and editing data
 */

// Dependencies
const fs = require("fs");
const path = require("path");

/**
 * Class Lib - handles fs I/O
 */
class Lib {
    constructor(){
        // Base directory of the data folder
        this.baseDir = path.join(__dirname, "/../.data/");
    }

    /**
     * Write data to a file, return false if no error; otherwise return error strings
     * @param dir
     * @param file
     * @param data
     * @returns {Promise<Boolean|String>}
     */
    async create(dir, file, data) {
        const fileWritten = new Promise((resolve, reject) => {
            // Open the file for writing
            fs.open(`${this.baseDir}${dir}/${file}.json`, "wx", (err, fileDescriptor) => {
                if (!err && fileDescriptor) {
                    // Convert data to string
                    const stringData = JSON.stringify(data);
                    //Write to file and close it
                    fs.writeFile(fileDescriptor, stringData, err => {
                        if (!err) {
                            fs.close(fileDescriptor, err => {
                                if (!err) {
                                    resolve(false);
                                } else {
                                    reject("Error closing new file")
                                }
                            })
                        } else {
                            reject("Error writing to new file");
                        }
                    })
                } else {
                    reject("Could not create new file, it may already exist");
                }
            });
        });
        return await fileWritten;
    }

    /**
     * Read data from a file, return the read data if no error; otherwise return the error message
     * @param dir
     * @param file
     * @returns {Promise<data | error>}
     */
    async read(dir, file) {
        const fileRead = new Promise((resolve, reject) => {
            fs.readFile(`${this.baseDir}${dir}/${file}.json`, "utf-8", (err, data) => {
                if (!err) {
                    resolve(data);
                } else {
                    reject(err);
                }
            })
        });
        return await fileRead;
    }

    /**
     * Update data inside a file, return false if no error; otherwise return the error string
     * @param dir
     * @param file
     * @param data
     * @returns {Promise<Boolean | String>}
     */
    async update(dir, file, data) {
        const fileUpdated = new Promise((resolve, reject) => {
            // Open the file for writing
            fs.open(`${this.baseDir}${dir}/${file}.json`, "r+", (err, fileDescriptor) => {
                if (!err && fileDescriptor) {
                    // Convert data to string
                    const stringData = JSON.stringify(data);
                    // Truncate the file
                    fs.truncate(fileDescriptor, err => {
                        if (!err) {
                            // Write to the truncated file and close it
                            fs.writeFile(fileDescriptor, stringData, err => {
                                if (!err) {
                                    fs.close(fileDescriptor, err => {
                                        if (!err) {
                                            resolve(false)
                                        } else {
                                            reject("There was an error closing the file")
                                        }
                                    })
                                } else {
                                    reject("Error writing to existing file")
                                }
                            })
                        } else {
                            reject("Error truncating file");
                        }
                    })
                } else {
                    reject("Could not open the file for updating, it may not exist yet");
                }
            })
        });
        return await fileUpdated;
    }

    /**
     * Delete a file, return false if no error; otherwise return the error string
     * @param dir
     * @param file
     * @returns {Promise<Boolean | String>}
     */
    async delete(dir, file) {
        const fileDeleted = new Promise((resolve, reject) => {
            // Unlink the file
            fs.unlink(`${this.baseDir}${dir}/${file}.json`, err => {
                if (!err) {
                    resolve(false)
                } else {
                    reject("Error deleting file")
                }
            })
        });
        return await fileDeleted;
    }
}

// Export the module
module.exports = new Lib();