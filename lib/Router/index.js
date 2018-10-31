const Handlers = require("../Handlers");

// Instantiate the handlers for subsequent uses
const handlers = new Handlers();

// Define a request router
const router = {
    /**
     * path can contain slashes so can't just use normal variable name, the keys have to be of string type otherwise they cannot represent "foo/bar" since _foo/bar_ is not a valid variable name. Generally, if the object keys do not contain any special characters, the following two are equivalent:
     *   {
     *      "foo" : myVar,
     *      foo : myVar
     *   }
     *
     * However, the following won't pass the runtime compilation:
     *   {
     *       "foo/bar" : myVar, // this is okay
     *       foo/bar : myVar // syntax not allowed!
     *   }
     *
     */
    "ping" : Handlers.ping,
    "users" : handlers.users,
    "tokens" : handlers.tokens
};

module.exports = router;