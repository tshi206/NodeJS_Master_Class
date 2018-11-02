/**
 * Worker-related tasks
 *
 */

// Dependencies
const path = require("path");
const fs = require("fs");
const _data = require("../data");
const https = require("https");
const http = require("http");
const Helpers = require("../Helpers");
const url = require("url");
const _logs = require("../Logs");

class Workers {

    constructor() {
        console.log("Workers status: on call")
    }

    static log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
        // Form the log data
        const logData = {
            "check" : originalCheckData,
            "outcome" : checkOutcome,
            state,
            "alert" : alertWarranted,
            "time" : timeOfCheck
        };
        // Convert data to a string
        const logString = JSON.stringify(logData);
        // Determine the name of the log file
        const logFilename = originalCheckData.id;
        (async () => {
            try {
                // Append the log string to the file
                await _logs.append(logFilename, logString);
            } catch (e) {
                console.error(e)
            }
        })()
    }

    /**
     * Sanity-check the check-data
     * @param originalCheckData
     * @return {boolean} - true means all good; false otherwise
     */
    static validateCheckData(originalCheckData) {
        originalCheckData = typeof (originalCheckData) === "object" && originalCheckData !== null? originalCheckData : {};
        originalCheckData.id = typeof (originalCheckData.id) === "string" && originalCheckData.id.trim().length === 20 ? originalCheckData.id.trim() : false;
        originalCheckData.userPhone = typeof (originalCheckData.userPhone) === "string" && originalCheckData.userPhone.trim().length === 12 ? originalCheckData.userPhone.trim() : false;
        originalCheckData.protocol = typeof (originalCheckData.protocol) === "string" && ["http", "https"].includes(originalCheckData.protocol.trim().toLowerCase()) ? originalCheckData.protocol.trim().toLowerCase() : false;
        originalCheckData.url = typeof (originalCheckData.url) === "string" && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
        originalCheckData.method = typeof (originalCheckData.method) === "string" && ["post", "get", "put", "delete"].includes(originalCheckData.method.trim().toLowerCase()) ? originalCheckData.method.trim().toLowerCase() : false;
        originalCheckData.successCodes = typeof (originalCheckData.successCodes) === "object" && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
        originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) === "number" && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;
        // Set the keys that may not be set if the workers have never seen this check before
        originalCheckData.state = typeof (originalCheckData.state) === "string" && ["up", "down"].includes(originalCheckData.state.trim().toLowerCase()) ? originalCheckData.state.trim().toLowerCase() : "down";
        originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) === "number" && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;
        // if all the checks pass, pass the data along to the next step in the process
        return originalCheckData.id &&
            originalCheckData.userPhone &&
            originalCheckData.protocol &&
            originalCheckData.url &&
            originalCheckData.method &&
            originalCheckData.successCodes &&
            originalCheckData.timeoutSeconds;
    }

    // Perform the check, send the original check data and the outcome of the check process to the next step
    static async performCheck(originalCheckData) {
        // Prepare the initial check outcome
        let checkOutcome = {
            "error" : false,
            "responseCode" : false
        };
        // Parse the hostname and the path out of the original check data
        const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
        const hostname = parsedUrl.hostname;
        const path = parsedUrl.path; // Using path and not "pathname" (which are both available) because we want the query string
        // Constructing the request
        const requestDetails = {
            "protocol" : originalCheckData.protocol+":",
            hostname,
            "method" : originalCheckData.method.toUpperCase(),
            path,
            "timeout" : originalCheckData.timeoutSeconds * 1000 // this key expects milliseconds
        };
        const response = new Promise(resolve => {
            // Instantiate the request object (using either the http or https module)
            const _moduleToUse = originalCheckData.protocol.trim().toLowerCase() === "http" ? http : https;
            const req = _moduleToUse.request(requestDetails, res => {
                // Grab the status of the sent request and then update the check outcome and pass the data along
                checkOutcome.responseCode = res.statusCode;
                resolve({
                    originalCheckData,
                    checkOutcome
                })
            });
            // Bind to the error event so it doesn't get thrown
            req.on("error", e => {
                // Update the check outcome and pass the data along
                checkOutcome.error = {
                    "error" : true,
                    "value" : e
                };
                resolve({
                    originalCheckData,
                    checkOutcome
                })
            });
            // Bind to the timeout event
            // Bind to the error event so it doesn't get thrown
            req.on("timeout", () => {
                // Update the check outcome and pass the data along
                checkOutcome.error = {
                    "error" : true,
                    "value" : "timeout"
                };
                resolve({
                    originalCheckData,
                    checkOutcome
                })
            });
            // End the request and send it off
            req.end()
        });
        return await response
    }

    /**
     * Process the check outcome, update the check data as needed and then trigger an alert to the user if needed. Special logic for accommodating a check that has never been tested before (don't want to alert on that one)
     * @param payload
     * @return {Promise<Object | string>} - return the new check data if no error AND the alert is needed to be sent; otherwise return either error string or plain messages for logging purposes
     */
    static async processCheckOutcome(payload) {
        const {originalCheckData, checkOutcome} = payload;
        // Decide if the check is considered up or down
        const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.includes(checkOutcome.responseCode) ? "up" : "down";
        // Decide if an alert is warranted
        const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state;
        // Log the outcome
        const timeOfCheck = Date.now();
        Workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);
        // Update the check data
        const newCheckData = originalCheckData;
        newCheckData.state = state;
        newCheckData.lastChecked = timeOfCheck;
        // Save the updates
        const result = await _data.update("checks", newCheckData.id, newCheckData);
        if (!result) {
            // Send the new check data to the next phase in the process if needed
            if (alertWarranted) {
                return newCheckData;
            } else {
                return "Check outcome has not changed, no alert needed"
            }
        } else {
            return `Error trying to save updates to one of the checks. Check id [ ${newCheckData.id} ]. User phone [ ${newCheckData.userPhone} ]. Stacktrace : {\n${result}\n}`
        }
    }

    /**
     * Alert the user as to a change in their check status
     * @param newCheckData
     * @return {Promise<string>}
     */
    static async alertUserToStatusChanged(newCheckData) {
        const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
        let result;
        try {
            result = await Helpers.sendTwilioSms(`+${newCheckData.userPhone}`, msg);
        } catch (e) {
            result = e;
        }
        if (!result) {
            return `Success: User was alerted to a status change in their check, via SMS: {\n${msg}\n}`
        } else {
            return `Error: Could not send SMS alert to user who has a state change in their check. Stacktrace: {\n${result}\n}`
        }
    }

    // Lookup all checks, get their data, send to a validator
    static async gatherAllChecks() {
        // Get all the checks
        const result = await _data.list("checks");
        if (result.length === 0) {
            console.error("There is currently no checks launched in the system")
        }
        result.forEach(async check => {
            // Read in the check data
            const originalCheckData = await _data.read("checks", check);
            if (typeof (originalCheckData) === "string") {
                throw originalCheckData;
            }
            // Pass the data to the check validator and let that function continue
            const validation = Workers.validateCheckData(originalCheckData);
            if (!validation) {
                console.error(`Error : Check ID [ ${originalCheckData.id} ] of user [ ${originalCheckData.userPhone} ] is not properly formatted. Skipping it.`);
                return
            }
            const checkOutcome = await Workers.performCheck(originalCheckData);
            const newCheckData = await Workers.processCheckOutcome(checkOutcome);
            if (typeof (newCheckData) === "string") {
                console.error(newCheckData)
            } else {
                // Send the alert and log the result
                console.log(await Workers.alertUserToStatusChanged(newCheckData))
            }
        })
    }

    // Timer to execute the worker-process once per minute
    loop() {
        const interval = setInterval(async () => {
            try {
                await Workers.gatherAllChecks();
            } catch (e) {
                console.error(e);
                console.error("Workers status: terminated with error");
                interval.clearInterval()
            }
        }, 1000 * 60)
    }

    // Rotate (aka compress) the log files
    static async rotateLogs() {
        // listing all the (non compressed) log files
        const logs = await _logs.list(false);
        if (typeof (logs) === "object" && logs instanceof Array && logs.length > 0) {
            logs.forEach(async logName => {
                // Compress the data to a different file
                const logId = logName.replace(".log", "");
                const newFileId = `${logId}-${Date.now()}`;
                const err1 = await _logs.compress(logId, newFileId);
                if (!err1) {
                    // Truncating the log
                    const err2 = await _logs.truncate(logId);
                    if (!err2) {
                        console.log(`Success truncating log file. Log ID : ${logId}`)
                    } else {
                        console.error(`Error truncating log file. Log ID : ${logId}`, err2)
                    }
                } else {
                    console.error(`Error compressing one of the log files. Log ID : ${logId}`, err1);
                }
            })
        } else {
            console.error("There is no logs to rotate (compress)", logs);
        }
    }

    // Timer to execute the log-rotation process once per day
    logRotationLoop() {
        setInterval(async () => {
            try {
                await Workers.rotateLogs();
            } catch (e) {
                console.error(e);
                throw e
            }
        }, 1000 * 60 * 60 * 24)
    }

    async init() {
        // Execute all the checks
        await Workers.gatherAllChecks();
        // Call the loop so the checks will execute later on
        this.loop();
        // Compress all the logs immediately
        await Workers.rotateLogs();
        // Call the compression loop so logs will be compressed later on
        this.logRotationLoop();
    }

}

// Export the module
module.exports = new Workers();