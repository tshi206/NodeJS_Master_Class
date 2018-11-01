// Dependencies
const _data = require("../data");
const Helpers = require("../Helpers");
const Config = require("../../config");

/**
 * Verify if a given token id is currently valid for a given user
 * @param id
 * @param phone
 * @return {Promise<boolean>}
 */
async function verifyToken (id, phone) {
    if (id === false) return false;
    // Lookup the token
    try {
        const tokenData = await _data.read("tokens", id);
        // Check that the token is for the given user and has not expired
        return tokenData.phone === phone && tokenData.expires > Date.now();
    } catch (e) {
        return false;
    }
}

// Define private subroutines
_users = {
    // private methods for users handler
    // Required data: firstName, lastName, phone, password, tosAgreement
    // Optional data: none
    "post" : async data => {
        const firstName = typeof (data.payload.firstName) === "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
        const lastName = typeof (data.payload.lastName) === "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
        const phone = typeof (data.payload.phone) === "string" && data.payload.phone.trim().length === 12 ? data.payload.phone.trim() : false;
        const password = typeof (data.payload.password) === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
        const tosAgreement = typeof (data.payload.tosAgreement) === "boolean" && data.payload.tosAgreement === true;
        if (firstName && lastName && phone && password && tosAgreement) {
            // Make sure that the user does not already exist
            try {
                await _data.read("users", phone);
                // User already exists
                return {
                    statusCode : 400,
                    payload: {
                        "Error" : "A user with that phone number already exists"
                    }
                }
            } catch (error) {
                // Cannot read file since the user does not exist yet then we are good to go create it now
                if (error.code === "ENOENT") {
                    // Hash the password
                    const hashedPassword = Helpers.hash(password);
                    if (hashedPassword) {
                        // Create the user object
                        const userObject = {
                            firstName,
                            lastName,
                            phone,
                            hashedPassword,
                            tosAgreement
                        };
                        // Persist the user to disk
                        try {
                            await _data.create("users", phone, userObject);
                            return {statusCode : 200}
                        } catch (e) {
                            console.error(e);
                            return {
                                statusCode : 500,
                                payload: {
                                    "Error" : "Could not create the new user"
                                }
                            }
                        }
                    } else {
                        return {
                            statusCode : 500,
                            payload: {
                                "Error" : "Could not hash the user\'s password"
                            }
                        }
                    }
                } else {
                    return {
                        statusCode : 500,
                        payload: {
                            "Error" : "Internal server error when reading local json"
                        }
                    }
                }
            }
        } else {
            return {
                statusCode : 400,
                payload: {
                    "Error" : "Missing required fields"
                }
            }
        }
    },
    // Users - get
    // Required data: phone
    // Optional data: none
    "get" : async data => {
        // Check that the phone number is valid
        const phone = typeof (data.queryStringObject.phone) ==="string" && data.queryStringObject.phone.trim().length === 12 ? data.queryStringObject.phone.trim() : false;
        if (phone) {
            // Get the token from the headers
            const token = typeof (data.headers["token"]) === "string" ? data.headers["token"] : false;
            // Verify that the given token is valid for the phone number
            const result = await verifyToken(token, phone);
            if (!result) {
                return {
                    statusCode : 403,
                    payload : {
                        "Error" : "Missing required token in header, or token is invalid (e.g., expired)"
                    }
                }
            }
            // Lookup the user
            try {
                const data = await _data.read("users", phone);
                // Remove the hashed password from the user object before returning it to the requester
                delete data.hashedPassword;
                return {
                    statusCode : 200,
                    payload : data
                }
            } catch (e) {
                return {
                    statusCode : 404,
                    payload : {
                        "Error" : "User not found"
                    }
                }
            }
        } else {
            return {
                statusCode : 400,
                payload: {
                    "Error" : "Missing required fields"
                }
            }
        }
    },
    // Users - put
    // Required data : phone
    // Optional data : firstName, lastName, password (at least one must be specified)
    "put" : async data => {
        // Check for the required field
        const phone = typeof (data.payload.phone) === "string" && data.payload.phone.trim().length === 12 ? data.payload.phone.trim() : false;
        // Check for the optional fields
        const firstName = typeof (data.payload.firstName) === "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
        const lastName = typeof (data.payload.lastName) === "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
        const password = typeof (data.payload.password) === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
        if (phone && (firstName || lastName || password)) {
            // Get the token from the headers
            const token = typeof (data.headers["token"]) === "string" ? data.headers["token"] : false;
            // Verify that the given token is valid for the phone number
            const result = await verifyToken(token, phone);
            if (!result) {
                return {
                    statusCode : 403,
                    payload : {
                        "Error" : "Missing required token in header, or token is invalid (e.g., expired)"
                    }
                }
            }
            // Lookup the user
            try {
                const userData = await _data.read("users", phone);
                // Update the fields necessary
                if (firstName) {
                    userData.firstName = firstName;
                }
                if (lastName) {
                    userData.lastName = lastName;
                }
                if (password) {
                    userData.hashedPassword = Helpers.hash(password);
                }
                // Store the new updates
                try {
                    await _data.update("users", phone, userData);
                    delete userData.hashedPassword;
                    return {
                        statusCode : 200,
                        payload : userData
                    }
                } catch (e) {
                    console.error(e);
                    return {
                        statusCode : 500,
                        payload : {
                            "Error" : "Could not update the user"
                        }
                    }
                }
            } catch (e) {
                return {
                    statusCode : 400,
                    payload : {
                        "Error" : "The specified user does not exist"
                    }
                }
            }
        } else {
            return {
                statusCode : 400,
                payload : {
                    "Error" : "Missing required field (either the phone number is invalid or the fields to update are missing)"
                }
            }
        }
    },
    // Users - delete
    // Require field : phone
    "delete" : async data => {
        // Check that the phone number is valid
        const phone = typeof (data.queryStringObject.phone) ==="string" && data.queryStringObject.phone.trim().length === 12 ? data.queryStringObject.phone.trim() : false;
        if (phone) {
            // Get the token from the headers
            const token = typeof (data.headers["token"]) === "string" ? data.headers["token"] : false;
            // Verify that the given token is valid for the phone number
            const result = await verifyToken(token, phone);
            if (!result) {
                return {
                    statusCode : 403,
                    payload : {
                        "Error" : "Missing required token in header, or token is invalid (e.g., expired)"
                    }
                }
            }
            // Lookup the user
            try {
                const data = await _data.read("users", phone);
                // Erase the user's json from the disk
                try {
                    await _data.delete("users", phone);
                    delete data.hashedPassword;
                    // Delete each of the checks associated with the user
                    const userChecks = typeof (data.checks) === "object" && data.checks instanceof Array ? data.checks : [];
                    const checksToDelete = userChecks.length;
                    if (checksToDelete > 0) {
                        try {
                            userChecks.forEach(async checkId => await _data.delete("checks", checkId))
                        } catch (e) {
                            return {
                                statusCode : 500,
                                payload : {
                                    "Error" : "Errors encountered while attempting to delete all of the user's checks. All checks may not have been deleted from the system successfully. Stacktrace " + e
                                }
                            }
                        }
                    }
                    return {
                        statusCode : 200,
                        payload : data
                    }
                } catch (e) {
                    return {
                        statusCode : 500,
                        payload : {
                            "Error" : "Could not delete the specified user"
                        }
                    }
                }
            } catch (e) {
                return {
                    statusCode : 400,
                    payload : {
                        "Error" : "Could not find the specified user"
                    }
                }
            }
        } else {
            return {
                statusCode : 400,
                payload: {
                    "Error" : "Missing required fields"
                }
            }
        }
    }
};

// private methods for tokens handler
_tokens = {
    // Tokens - post
    // Require data: phone, password
    // Optional data: none
    "post" : async data => {
        const phone = typeof (data.payload.phone) === "string" && data.payload.phone.trim().length === 12 ? data.payload.phone.trim() : false;
        const password = typeof (data.payload.password) === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
        if (phone && password) {
            // Lookup the user who matches that phone number
            try {
                const userData = await _data.read("users", phone);
                // Hash the sent password, and compare it to the password stored in the user object
                const hashedPassword = Helpers.hash(password);
                if (hashedPassword === userData.hashedPassword) {
                    // If valid, create a new token with a random name. Set expiry time 1 hour in the future
                    const tokenId = Helpers.createRandomString(20);
                    const expires = Date.now() + 1000 * 60 * 60;
                    const tokenObject = {
                        phone,
                        "id" : tokenId,
                        expires
                    };
                    // Store the token
                    try {
                        await _data.create("tokens", tokenId, tokenObject);
                        return {
                            statusCode : 200,
                            payload : tokenObject
                        }
                    } catch (e) {
                        return {
                            statusCode : 500,
                            payload : {
                                "Error" : "Could not create the new token"
                            }
                        }
                    }
                } else {
                    return {
                        statusCode : 400,
                        payload : {
                            "Error" : "Password did not match the specified user\'s stored password"
                        }
                    }
                }
            } catch (e) {
                return {
                    statusCode : 400,
                    payload : {
                        "Error" : "Could not find the specified user"
                    }
                }
            }
        } else {
            return {
                statusCode : 400,
                payload : {
                    "Error" : "Missing required field(s)"
                }
            }
        }
    },
    // Tokens - get
    // Required data : id
    // Optional data : none
    "get" : async data => {
        // Check that the id is valid
        const id = typeof (data.queryStringObject.id) ==="string" && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
        if (id) {
            // Lookup the token
            try {
                const tokenData = await _data.read("tokens", id);
                return {
                    statusCode : 200,
                    payload : tokenData
                }
            } catch (e) {
                return {
                    statusCode : 404,
                    payload : {
                        "Error" : "Token not found"
                    }
                }
            }
        } else {
            return {
                statusCode : 400,
                payload: {
                    "Error" : "Missing required fields"
                }
            }
        }
    },
    // Tokens - put
    // Required data : id, extend
    // Optional data : none
    "put" : async data => {
        const id = typeof (data.payload.id) === "string" && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
        const extend = typeof (data.payload.extend) === "boolean" && data.payload.extend === true;
        if (id && extend) {
            // Lookup the token
            try {
                const tokenData = await _data.read("tokens", id);
                // Check to make sure the token isn't already expired
                if (tokenData.expires > Date.now()) {
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    // Store the new updates
                    try {
                        await _data.update("tokens", id, tokenData);
                        return {
                            statusCode : 200,
                            payload : tokenData
                        }
                    } catch (e) {
                        return {
                            statusCode : 500,
                            payload : {
                                "Error" : "Could not update the token's expiration"
                            }
                        }
                    }
                } else {
                    return {
                        statusCode : 400,
                        payload : {
                            "Error" : "The token has already expired and cannot be extended"
                        }
                    }
                }
            } catch (e) {
                return {
                    statusCode : 400,
                    payload : {
                        "Error" : "Specified token does not exist"
                    }
                }
            }
        } else {
            return {
                statusCode : 400,
                payload : {
                    "Error" : "Missing required field(s) or field(s) are invalid"
                }
            }
        }
    },
    // Tokens - delete
    // Required data : id
    // Optional data : none
    "delete" : async data => {
        // Check if the id is valid
        const id = typeof (data.queryStringObject.id) ==="string" && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
        if (id) {
            // Lookup the token
            try {
                const data = await _data.read("tokens", id);
                // Erase the token's json from the disk
                try {
                    await _data.delete("tokens", id);
                    return {
                        statusCode : 200,
                        payload : data
                    }
                } catch (e) {
                    return {
                        statusCode : 500,
                        payload : {
                            "Error" : "Could not delete the specified token"
                        }
                    }
                }
            } catch (e) {
                return {
                    statusCode : 400,
                    payload : {
                        "Error" : "Could not find the specified token"
                    }
                }
            }
        } else {
            return {
                statusCode : 400,
                payload: {
                    "Error" : "Missing required fields"
                }
            }
        }
    }
};

// private checks subroutines
_checks = {
    // Checks - post
    // Required data : protocol, url, method, successCodes, timeoutSeconds
    // Optional data : none
    "post" : async data => {
        // Validate inputs
        const protocol = typeof (data.payload.protocol) === "string" && ["https", "http"].includes(data.payload.protocol.trim().toLowerCase()) ? data.payload.protocol.trim().toLowerCase() : false;
        const url = typeof (data.payload.url) === "string" && data.payload.url.trim().length > 0 ? data.payload.url.trim().toLowerCase() : false;
        const method = typeof (data.payload.method) === "string" && ["post", "get", "put", "delete"].includes(data.payload.method.trim().toLowerCase()) ? data.payload.method.trim().toLowerCase() : false;
        const successCodes = typeof (data.payload.successCodes) === "object" && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
        const timeoutSeconds = typeof (data.payload.timeoutSeconds) === "number" && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
        if (protocol && url && method && successCodes && timeoutSeconds) {
            // Get the token from the headers
            const token = typeof (data.headers["token"]) === "string" ? data.headers["token"] : false;
            try {
                // Lookup the user by reading the token
                const tokenData = await _data.read("tokens", token);
                const userPhone = tokenData.phone;
                // Lookup the user data
                const userData = await _data.read("users", userPhone);
                const userChecks = typeof (userData.checks) === "object" && userData.checks instanceof Array ? userData.checks : [];
                // Verify that the user has less than the number of max-checks-per-user
                if (userChecks.length < Config["maxChecks"]) {
                    // Create a random id for the check
                    const checkId = Helpers.createRandomString(20);
                    // Create the check object, and include the user's phone
                    const checkObject = {
                        "id" : checkId,
                        userPhone,
                        protocol,
                        url,
                        method,
                        successCodes,
                        timeoutSeconds
                    };
                    try {
                        // Persist the object
                        await _data.create("checks", checkId, checkObject);
                        // Add the check id to the user's object
                        userData.checks = userChecks;
                        userData.checks.push(checkId);
                        try {
                            // save the new user data
                            await _data.update("users", userPhone, userData);
                            // Return the data about the new check
                            return {
                                statusCode : 200,
                                payload : checkObject
                            }
                        } catch (e) {
                            return {
                                statusCode : 500,
                                payload : {
                                    "Error" : "Could not update the user with the new check"
                                }
                            }
                        }
                    } catch (e) {
                        return {
                            statusCode : 500,
                            payload : {
                                "Error" : "Could not create the new check"
                            }
                        }
                    }
                } else {
                    return {
                        statusCode : 400,
                        payload : {
                            "Error" : `The user already has the maximum number of checks (max checks = ${Config["maxChecks"]})`
                        }
                    }
                }
            } catch (e) {
                return {statusCode : 403}
            }
        } else {
            return {
                statusCode : 400,
                payload : {
                    "Error" : "Missing required inputs, or inputs are invalid"
                }
            }
        }
    },
    // Checks - get
    // Required data : id
    // Optional data : none
    "get" : async data => {
        // Check that the check id is valid
        const id = typeof (data.queryStringObject.id) ==="string" && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
        if (id) {
            try {
                // Lookup the check
                const checkData = await _data.read("checks", id);
                // Get the token from the headers
                const token = typeof (data.headers["token"]) === "string" ? data.headers["token"] : false;
                // Verify that the given token is valid and belongs to the user who created the check
                const result = await verifyToken(token, checkData.userPhone);
                if (!result) {
                    return {
                        statusCode : 403,
                        payload : {
                            "Error" : "Missing required token in header, or token is invalid (e.g., expired)"
                        }
                    }
                }
                // Return the check data
                return {
                    statusCode : 200,
                    payload : checkData
                }
            } catch (e) {
                return {
                    statusCode : 404,
                    payload : {
                        "Error" : "Specified check can not be found"
                    }
                }
            }
        } else {
            return {
                statusCode : 400,
                payload: {
                    "Error" : "Missing required fields"
                }
            }
        }
    },
    // Checks - put
    // Required data : id
    // Optional data : protocol, url, method, successCodes, timeoutSeconds (one must be sent)
    "put" : async data => {
        // Check for the required field
        const id = typeof (data.payload.id) === "string" && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
        // Check for the optional fields
        const protocol = typeof (data.payload.protocol) === "string" && ["https", "http"].includes(data.payload.protocol.trim().toLowerCase()) ? data.payload.protocol.trim().toLowerCase() : false;
        const url = typeof (data.payload.url) === "string" && data.payload.url.trim().length > 0 ? data.payload.url.trim().toLowerCase() : false;
        const method = typeof (data.payload.method) === "string" && ["post", "get", "put", "delete"].includes(data.payload.method.trim().toLowerCase()) ? data.payload.method.trim().toLowerCase() : false;
        const successCodes = typeof (data.payload.successCodes) === "object" && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
        const timeoutSeconds = typeof (data.payload.timeoutSeconds) === "number" && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
        if (id && (protocol || url || method || successCodes || timeoutSeconds)) {
            try {
                // Lookup the check
                const checkData = await _data.read("checks", id);
                // Get the token from the headers
                const token = typeof (data.headers["token"]) === "string" ? data.headers["token"] : false;
                // Verify that the given token is valid and belongs to the user who created the check
                const result = await verifyToken(token, checkData.userPhone);
                if (!result) {
                    return {
                        statusCode : 403,
                        payload : {
                            "Error" : "Missing required token in header, or token is invalid (e.g., expired)"
                        }
                    }
                }
                // Update the check where necessary
                if (protocol) checkData.protocol = protocol;
                if (url) checkData.url = url;
                if (method) checkData.method = method;
                if (successCodes) checkData.successCodes = successCodes;
                if (timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;
                try {
                    // Store the new updates
                    await _data.update("checks", id, checkData);
                    return {
                        statusCode : 200,
                        payload : checkData
                    }
                } catch (e) {
                    return {
                        statusCode : 500,
                        payload : {
                            "Error" : "Could not update the check. Stacktrace: " + e
                        }
                    }
                }
            } catch (e) {
                return {
                    statusCode : 400,
                    payload : {
                        "Error" : "Check id did not exist"
                    }
                }
            }
        } else {
            return {
                statusCode : 400,
                payload : {
                    "Error" : "Missing required field (either the check id is invalid or the fields to update are missing)"
                }
            }
        }
    },
    // Checks - delete
    // Required data : id
    // Optional data : none
    "delete" : async data => {
        // Check that the phone number is valid
        const id = typeof (data.queryStringObject.id) ==="string" && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
        if (id) {
            // Lookup the check
            try {
                const checkData = await _data.read("checks", id);
                // Get the token from the headers
                const token = typeof (data.headers["token"]) === "string" ? data.headers["token"] : false;
                // Verify that the given token is valid and belongs to the user who created the check
                const result = await verifyToken(token, checkData.userPhone);
                if (!result) {
                    return {
                        statusCode : 403,
                        payload : {
                            "Error" : "Missing required token in header, or token is invalid (e.g., expired)"
                        }
                    }
                }
                // Delete the check data
                const deletionResult = await _data.delete("checks", id);
                if (deletionResult === false) {
                    // Lookup the user
                    try {
                        const userData = await _data.read("users", checkData.userPhone);
                        // Erase the check from the user's list of checks
                        const userChecks = typeof (userData.checks) === "object" && userData.checks instanceof Array ? userData.checks : [];
                        const checkPosition = userChecks.indexOf(id);
                        if (checkPosition > -1) {
                            userChecks.splice(checkPosition, 1);
                            // Re-save the user's data
                            const exitStatus = await _data.update("users", checkData.userPhone, userData);
                            if (exitStatus === false) {
                                return {statusCode:200}
                            } else {
                                return {
                                    statusCode : 500,
                                    "Error" : "Could not update the user's checks list. Stacktrace " + exitStatus
                                }
                            }
                        } else {
                            return {
                                statusCode : 500,
                                payload : {
                                    "Error" : "Could not find the check on the user's object, so could not remove it"
                                }
                            }
                        }
                    } catch (e) {
                        return {
                            statusCode : 500,
                            payload : {
                                "Error" : "Could not find the user who created the check. So could not remove the check from the list of checks on the user object. Stacktrace " + e
                            }
                        }
                    }
                } else {
                    return {
                        statusCode : 500,
                        payload : {
                            "Error" : "Could not delete the check data. Stacktrace " + deletionResult
                        }
                    }
                }
            } catch (e) {
                return {
                    statusCode : 400,
                    payload : {
                        "Error" : "The specified check id does not exist"
                    }
                }
            }
        } else {
            return {
                statusCode : 400,
                payload: {
                    "Error" : "Missing required fields"
                }
            }
        }
    }
};

// Define the request handlers
class Handlers {

    static async ping(data) {
        data = data?data:{};
        // Return a HTTP status code and a payload object in JSON format
        return {
            statusCode : 200,
            payload : {
                'isAlive' : 'True',
                data
            }
        };

    }

    static async notFound(data) {
        console.log("404 Not Found with payload received ", data);
        return {statusCode : 404};
    }

    async users(data) {
        const acceptableMethods = ["post", "get", "put", "delete"];
        if (acceptableMethods.includes(data.method)) {
            return await _users[data.method].bind(this)(data);
        } else {
            return {statusCode : 405};
        }
    }

    async tokens(data) {
        const acceptableMethods = ["post", "get", "put", "delete"];
        if (acceptableMethods.includes(data.method)) {
            return await _tokens[data.method].bind(this)(data);
        } else {
            return {statusCode : 405};
        }
    }

    async checks(data) {
        const acceptableMethods = ["post", "get", "put", "delete"];
        if (acceptableMethods.includes(data.method)) {
            return await _checks[data.method].bind(this)(data);
        } else {
            return {statusCode : 405};
        }
    }

}

module.exports = Handlers;