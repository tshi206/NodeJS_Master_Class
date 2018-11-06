/**
 * Server-related tasks
 * @type {{_connectionListener, METHODS, STATUS_CODES, Agent, ClientRequest, globalAgent, IncomingMessage, OutgoingMessage, Server, ServerResponse, createServer, get, request}|*}
 */

// Dependency
const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require("fs");
const path = require("path");
const router = require("../Router");
const notFound = require("../ApiRequestHandlers").notFound;
const config = require("../config");
const Helpers = require("../Helpers");
const util = require("util");
const debug = util.debuglog("server");

// Unified server logic for both http and https server
const unifiedServer = async (req, res) => {

    // Get the URL and parse it
    const parsedUrl = url.parse(req.url, true);

    // Get the path from the URL
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, "");

    // Get the query string as an object
    const queryStringObject = parsedUrl.query;

    // Get the HTTP Method
    const method = req.method.toLowerCase();

    // Get the headers as an object
    const headers = req.headers;

    // Get the payload if any
    const decoder = new StringDecoder("utf-8");
    let buffer = "";
    // If the request does not have a payload, the "data" event won't be emitted while the "end" event is always triggered regardless. As the data stream comes in, the "data" event might get emitted several times.
    req.on("data", data => {
        buffer += decoder.write(data);
    });

    const inputStreamFinished = new Promise(resolve => {
        // the "end" event will always get called
        req.on("end", () => {
            buffer += decoder.end();
            resolve(buffer);
        });
    });

    const requestPayload = await inputStreamFinished;

    // Choose the handler this request should go to. If one is not found, use the not found handler
    const chosenHandler = Object.keys(router).includes(trimmedPath) ? router[trimmedPath] : notFound;

    // Construct the data object to send to the handler
    const data =  {
        trimmedPath,
        queryStringObject,
        method,
        headers,
        "payload" : Helpers.parseJsonToObject(requestPayload)
    };

    // Route the request to the chosen handler
    const {statusCode, payload, contentType} = await chosenHandler(data);

    const status = typeof(statusCode) === "number" ? statusCode : 200;

    const content_type = typeof (contentType) === "string" ? contentType : "application/json";

    // Return the response-parts that are content-specific
    let payloadString = "";
    if (content_type === "application/json") {
        payloadString = JSON.stringify(typeof(payload) === "object" ? payload : {});
    }
    if (content_type === "text/html") {
        payloadString = typeof(payload) === "string" ? payload : "";
    }

    // Return the response-parts that are common to all content-types
    res.setHeader("Content-Type", content_type);
    res.writeHead(status);
    res.end(payloadString);

    // Log the request path. If the response is 200, print green otherwise print red
    if (status === 200 || status === 201) {
        debug("\x1b[32m%s\x1b[0m", `Request received on path: ${trimmedPath} with method: ${method} and with these query string entries[k, v]: \n${Object.entries(queryStringObject).map(value => (`[${value[0]}, ${value[1]}]`))}\n with these headers: {\n${Object.entries(headers).map(value => (`\n"${value[0]}":"${value[1]}"`))}\n\n}\n \nPayload: {\n${requestPayload}\n\n}\n\nResponse Status: ${status}\n\nResponse body:\n${payloadString}\n`);
    } else {
        debug("\x1b[31m%s\x1b[0m", `Request received on path: ${trimmedPath} with method: ${method} and with these query string entries[k, v]: \n${Object.entries(queryStringObject).map(value => (`[${value[0]}, ${value[1]}]`))}\n with these headers: {\n${Object.entries(headers).map(value => (`\n"${value[0]}":"${value[1]}"`))}\n\n}\n \nPayload: {\n${requestPayload}\n\n}\n\nResponse Status: ${status}\n\nResponse body:\n${payloadString}\n`);
    }

};

const httpsServerOptions = {
    "key" : fs.readFileSync(path.join(__dirname, "/../../https/key.pem")),
    "cert" : fs.readFileSync(path.join(__dirname, "/../../https/cert.pem"))
};

// Instantiate the server module object
class Server {

    constructor() {
        // The HTTP server instance
        this.HTTP_Server = http.createServer(unifiedServer);
        // Instantiate the HTTPS server
        this.HTTPS_Server = https.createServer(httpsServerOptions, unifiedServer);
    }

    init() {
        // Start the HTTP server
        this.HTTP_Server.listen(config["httpPort"], () => {
            console.log("\x1b[34m%s\x1b[0m", `HTTP Server listening on port ${config["httpPort"]} in ${config["envName"]} mode`);
        });
        // Start the HTTPS server
        this.HTTPS_Server.listen(config["httpsPort"], () => {
            console.log("\x1b[35m%s\x1b[0m", `HTTPS Server listening on port ${config["httpsPort"]} in ${config["envName"]} mode`);
        })
    }

}

// Export the server
module.exports = new Server();