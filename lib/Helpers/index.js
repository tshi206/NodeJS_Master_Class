/**
 * Utility class with static functions
 */

const crypto = require("crypto");
const config = require("../../config");

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
}

module.exports = Helpers;