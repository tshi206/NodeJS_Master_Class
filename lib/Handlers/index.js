// Dependencies
const _data = require("../data");
const Helpers = require("../Helpers");

/**
 * Verify if a given token id is currently valid for a given user
 * @param id
 * @param phone
 * @return {Promise<boolean>}
 */
async function verifyToken (id, phone) {
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
    // @TODO Cleanup (delete) any other data files associated with this user
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

}

module.exports = Handlers;