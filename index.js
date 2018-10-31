/**
 * Primary file for the API
 */

/**
 * Side remark - how to make a JS class:
 *
     class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
     }

     let myPoint = new Point(1, 2);
     console.log(myPoint);
 *
 * @type {{_connectionListener, METHODS, STATUS_CODES, Agent, ClientRequest, globalAgent, IncomingMessage, OutgoingMessage, Server, ServerResponse, createServer, get, request}|*}
 */

// Dependency
const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require("fs");
const router = require("./lib/Router");
const notFound = require("./lib/Handlers").notFound;
const config = require("./config");
const Helpers = require("./lib/Helpers");

// const _data = require("./lib/data");
// // TESTING
// // @TODO delete this
// (async () => {
//     try {
//         const result = await _data.read('test', 'newFile2');
//         console.log("Exit with error? ", result);
//     } catch (error) {
//         console.error(error);
//     }
// })();

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
    const {statusCode, payload} = await chosenHandler(data);

    const status = typeof(statusCode) === "number" ? statusCode : 200;

    const responsePayload = typeof(payload) === "object" ? payload : {};

    const payloadString = JSON.stringify(responsePayload);

    // Return the response
    res.setHeader("Content-Type", "application/json");
    res.writeHead(status);
    res.end(payloadString);

    // Log the request path
    console.log(`Request received on path: ${trimmedPath} with method: ${method} and with these query string entries[k, v]: \n${Object.entries(queryStringObject).map(value => (`[${value[0]}, ${value[1]}]`))}\n with these headers: {\n${Object.entries(headers).map(value => (`\n"${value[0]}":"${value[1]}"`))}\n\n}\n \nPayload: {\n${requestPayload}\n\n}\n\nResponse Status: ${status}\n\nResponse body:\n${payloadString}\n`);

};

// The HTTP server instance
const HTTP_Server = http.createServer(unifiedServer);

// Start the HTTP server
HTTP_Server.listen(config["httpPort"], () => {
    console.log(`HTTP Server listening on port ${config["httpPort"]} in ${config["envName"]} mode`);
});

// Instantiate the HTTPS server
const httpsServerOptions = {
    "key" : fs.readFileSync("./https/key.pem"),
    "cert" : fs.readFileSync("./https/cert.pem")
};
const HTTPS_Server = https.createServer(httpsServerOptions, unifiedServer);

// Start the HTTPS server
HTTPS_Server.listen(config["httpsPort"], () => {
    console.log(`HTTPS Server listening on port ${config["httpsPort"]} in ${config["envName"]} mode`);
});