const APIHandlers = require("../ApiRequestHandlers");
const GUIHandlers = require("../GuiRequestHandlers");

// Instantiate the API handlers for subsequent uses
const apiHandlers = new APIHandlers();

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
    "favicon.ico" : GUIHandlers.favicon,
    "public" : GUIHandlers.public,
    "" : GUIHandlers.index,
    "account/create" : GUIHandlers.accountCreate,
    "account/edit" : GUIHandlers.accountEdit,
    "account/deleted" : GUIHandlers.accountDeleted,
    "session/create" : GUIHandlers.sessionCreate,
    "session/deleted" : GUIHandlers.sessionDeleted,
    "checks/all" : GUIHandlers.checksList,
    "checks/create" : GUIHandlers.checksCreate,
    "checks/edit" : GUIHandlers.checksEdit,
    "ping" : APIHandlers.ping,
    "api/users" : apiHandlers.users,
    "api/tokens" : apiHandlers.tokens,
    "api/checks" : apiHandlers.checks
};

module.exports = router;