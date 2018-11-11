const RootHandler = require("./RootHandler");
const AccountHandler = require("./AccountHandler");
const SessionHandler = require("./SessionHandler");
const Helpers = require("../Helpers");

class Handler {

    /**
     * Index handler
     * @param data - the inbound payload
     * @return {Promise<string | object>} - the outbound payload, either the html string upon success or error message in JSON format
     */
    static async index(data) {
        if (data.method === "get") {
            try {
                // Get the outbound payload
                const payload = await RootHandler.index();
                return {
                    statusCode : 200,
                    payload,
                    contentType : "text/html"
                }
            } catch (e) {
                return {
                    statusCode : 500,
                    payload : {
                        "Error" : "Internal Server Error. Could not load the template for index page. Stacktrace: " + e
                    }
                }
            }
        } else {
            return {
                statusCode : 405,
                contentType : "text/html"
            }
        }
    }

    /**
     * Sign Up handler
     * @param data - parsed request payload
     * @return {Promise<string | object>} - the outbound payload, either the html string upon success or error message in JSON format
     */
    static async accountCreate(data) {
        if (data.method === "get") {
            try {
                // Get the outbound payload
                const payload = await AccountHandler.accountCreate();
                return {
                    statusCode : 200,
                    payload,
                    contentType : "text/html"
                }
            } catch (e) {
                return {
                    statusCode : 500,
                    payload : {
                        "Error" : "Internal Server Error. Could not load the template for index page. Stacktrace: " + e
                    }
                }
            }
        } else {
            return {
                statusCode : 405,
                contentType : "text/html"
            }
        }
    }

    /**
     * Login page handler - create a new session
     * @param data - parsed request payload
     * @return {Promise<string | object>} - the outbound payload, either the html string upon success or error message in JSON format
     */
    static async sessionCreate(data) {
        if (data.method === "get") {
            try {
                // Get the outbound payload
                const payload = await SessionHandler.sessionCreate();
                return {
                    statusCode : 200,
                    payload,
                    contentType : "text/html"
                }
            } catch (e) {
                return {
                    statusCode : 500,
                    payload : {
                        "Error" : "Internal Server Error. Could not load the template for index page. Stacktrace: " + e
                    }
                }
            }
        } else {
            return {
                statusCode : 405,
                contentType : "text/html"
            }
        }
    }

    /**
     * Logout page handler - delete a session
     * @param data - parsed request payload
     * @return {Promise<string | object>} - the outbound payload, either the html string upon success or error message in JSON format
     */
    static async sessionDeleted(data) {
        if (data.method === "get") {
            try {
                // Get the outbound payload
                const payload = await SessionHandler.sessionDeleted();
                return {
                    statusCode : 200,
                    payload,
                    contentType : "text/html"
                }
            } catch (e) {
                return {
                    statusCode : 500,
                    payload : {
                        "Error" : "Internal Server Error. Could not load the template for index page. Stacktrace: " + e
                    }
                }
            }
        } else {
            return {
                statusCode : 405,
                contentType : "text/html"
            }
        }
    }

    static async favicon(data) {
        if (data.method === "get") {
            // Read in the favicon's data
            try {
                const data = await Helpers.getStaticAsset("favicon.ico");
                return {
                    statusCode : 200,
                    payload : data,
                    contentType : "image/x-icon"
                }
            } catch (e) {
                return {
                    statusCode : 500,
                    payload : {
                        "Error" : "Internal Server Error. Could not load the favicon. Stacktrace: " + e
                    }
                }
            }
        } else {
            return {statusCode : 405}
        }
    }

    static async public(data) {
        if (data.method === "get") {
            // Get the filename being requested
            const trimmedAssetName = data.trimmedPath.replace("public/", "").trim();
            if (trimmedAssetName.length > 0) {
                try {
                    // Read in the asset data
                    const data = await Helpers.getStaticAsset(trimmedAssetName);
                    // Determine the content type (default to plain text)
                    let contentType;
                    const strExploded = trimmedAssetName.split(".");
                    switch (strExploded[1]) {
                        case "css":
                            contentType = "text/css";
                            break;
                        case "png":
                            contentType = "image/png";
                            break;
                        case "jpg":
                            contentType = "image/jpeg";
                            break;
                        case "ico":
                            contentType = "image/x-icon";
                            break;
                        case "js":
                            contentType = "application/javascript";
                            break;
                        default:
                            contentType = "text/plain";
                            break
                    }
                    return {
                        statusCode : 200,
                        payload : data,
                        contentType
                    }
                } catch (e) {
                    return {
                        statusCode : 500,
                        payload : {
                            "Error" : "Internal Server Error. Could not load the static asset. Stacktrace: " + e
                        }
                    }
                }
            } else {
                return {statusCode : 404}
            }
        } else {
            return {statusCode : 405}
        }
    }

}

module.exports = Handler;