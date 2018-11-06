const Helpers = require("../../Helpers");

class RootHandler {
    /**
     * Get the html string from the index template
     * @return {Promise<string>}
     */
    static async index() {
        // Read in the index template as a string
        return await Helpers.getTemplate("index");
    }
}

module.exports = RootHandler;