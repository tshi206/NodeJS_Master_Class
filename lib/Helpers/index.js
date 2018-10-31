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
}

module.exports = Helpers;