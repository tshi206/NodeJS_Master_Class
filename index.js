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
 */

// Dependencies
const server = require("./lib/Server");
const workers = require("./lib/Workers");

// Declare the app
class App {

    // Init
    constructor() {
        // Start the server
        server.init();
        (async () => {
            try {
                // Start the workers
                await workers.init();
                // Send log to console in blue
                console.log("\x1b[36m%s\x1b[0m", "Workers status: running")
            } catch (e) {
                console.error(e);
                console.error("Workers status: terminated with error")
            }
        })();
    }

}

module.exports = new App();