const RootHandler = require("./RootHandler");
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
                const payload = await RootHandler.index(data);
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

}

module.exports = Handler;