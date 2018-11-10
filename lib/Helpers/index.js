/**
 * Utility class with static functions
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("../config");
const https = require("https");
const querystring = require("querystring");
const promisify = require("util").promisify;

const fsReadFile = promisify(fs.readFile);

class Helpers {

    /**
     * Takes a string and return its hash value
     * @param pwd - string
     * @return string | boolean - return false upon failure; otherwise return the hashed string
     */
    static hash(pwd) {
        if (typeof (pwd) === "string" && pwd.length > 0) {
            return crypto.createHmac("sha256", config["hashingSecret"]).update(pwd).digest("hex");
        } else {
            return false;
        }
    }

    /**
     * Parse a JSON string to an object in all cases, without throwing
     * @param requestPayload - string
     */
    static parseJsonToObject(requestPayload) {
        try {
            return JSON.parse(requestPayload);
        } catch (e) {
            return {}
        }
    }

    /**
     * Create a string of random alphanumeric characters, of a given length
     * @param strLength
     * @return {string | boolean} - return false upon failure; otherwise return the randomized string
     */
    static createRandomString(strLength) {
        strLength = typeof (strLength) === "number" && strLength > 0 ? strLength : false;
        if (strLength) {
            // Define all the possible characters that could go into a string
            const possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";
            // Start the final string
            let str = "";
            for (let i = 1; i <= strLength; i++) {
                // Get a random char from the possible characters string and then append this char to the final string
                str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            }
            return str;
        } else {
            return false;
        }
    }

    /**
     * Send an SMS message via Twilio
     * @param phone
     * @param msg
     * @return {Promise<boolean | string>} - return false if no error; otherwise return the error string
     */
    static async sendTwilioSms(phone, msg) {
        // Validate parameters
        phone = typeof (phone) === "string" && phone.trim().length >= 7 ? phone.trim() : false;
        msg = typeof (msg) === "string" && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
        if (phone && msg) {
            // Configure the request payload
            const payload = {
                "From" : config["twilio"].fromPhone,
                "To" : phone,
                "Body" : msg
            };
            // Stringify the payload
            const stringPayload = querystring.stringify(payload);
            // Configure the request details
            const requestDetails = {
                "protocol" : "https:",
                "hostname" : "api.twilio.com",
                "method" : "POST",
                "path" : `/2010-04-01/Accounts/${config["twilio"].accountSid}/Messages.json`,
                "auth" : `${config["twilio"].accountSid}:${config["twilio"].authToken}`,
                "headers" : {
                    "Content-Type" : "application/x-www-form-urlencoded",
                    "Content-Length" : Buffer.byteLength(stringPayload)
                }
            };
            // Send the request object and get the result
            return await new Promise((resolve, reject) => {
                // Instantiate the request object
                const req = https.request(requestDetails, res => {
                    console.log("Twilio response ", res.statusCode, res.statusMessage);
                    // Grab the status of the sent request
                    const status = res.statusCode;
                    if (status === 200 || status === 201) {
                        resolve(false)
                    } else {
                        reject(`Status code returned by Twilio API was ${status}`)
                    }
                });
                // Bind to the error event so it does not get thrown
                req.on("error", e => {
                    reject(e)
                });
                // Add the stringified payload
                req.write(stringPayload);
                // End the request. Ending a request is the same as sending it off
                req.end();
            })
        } else {
            return "Given parameters were missing or invalid"
        }
    }

    /**
     * Get the string content of a template under the 'templates' dir
     * @param templateName
     * @param data
     * @return {Promise<string>} - error will be thrown if any; otherwise the string content gets returned
     */
    static async getTemplate(templateName, data) {
        templateName = typeof (templateName) === "string" && templateName.length > 0 ? templateName : false;
        data = typeof (data) === "object" && data !== null ? data : {};
        if (templateName) {
            const templateDir = path.join(__dirname, "/../../templates/");
            try {
                return Helpers.interpolate(await fsReadFile(`${templateDir}${templateName}.html`, "utf8"), data)
            } catch (e) {
                throw `No template could be found for the template name: [${ templateName }] under the [${ templateDir }] directory. Stacktrace: ` + e
            }
        } else {
            throw "A valid template name was not specified. Template Name Requested: " + templateName
        }
    }

    // Add the universal header and footer to a string and pass provided data object to the header and footer for interpolation
    static async addUniversalTemplate(str, data) {
        str = typeof (str) === "string" && str.length > 0 ? str : "";
        data = typeof (data) === "object" && data !== null ? data : {};
        try {
            // Get the header
            const headerStr = await Helpers.getTemplate("_header", data);
            // Get the footer
            const footerStr = await Helpers.getTemplate("_footer", data);
            return `${headerStr}${str}${footerStr}`
        } catch (e) {
            throw "Could not find the template. Stacktrace: " + e
        }
    }

    /**
     * Take a given string and a data object and find/replace all the keys within it
     * @param str
     * @param data
     * @return {string}
     */
    static interpolate(str, data) {
        str = typeof (str) === "string" && str.length > 0 ? str : "";
        data = typeof (data) === "object" && data !== null ? data : {};
        // Add the template globals to the data object, prepending their key name with "global"
        Object.keys(config["templateGlobals"]).forEach(key => {
            data[`global.${key}`] = config["templateGlobals"][key]
        });
        // For each key in the data object, insert its value into the string at the corresponding place holder
        Object.keys(data).forEach(key => {
            if (typeof (data[key]) === "string") {
                str = str.replace(`{${key}}`, data[key])
            }
        });
        return str
    }

    // Get the content of a static (public) asset
    static async getStaticAsset(filename) {
        filename = typeof (filename) === "string" && filename.length > 0 ? filename : false;
        if (filename) {
            const publicDir = path.join(__dirname, "/../../public/");
            return await fsReadFile(`${publicDir}${filename}`);
        } else {
            throw "A valid file name was not specified"
        }
    }

}

module.exports = Helpers;