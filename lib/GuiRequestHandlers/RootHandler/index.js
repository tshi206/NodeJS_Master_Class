const Helpers = require("../../Helpers");

class RootHandler {
    /**
     * Get the html string from the index template
     * @param data
     * @return {Promise<string>}
     */
    static async index(data) {
        // Prepare data for interpolation
        const templateData = {
            'head.title' : 'This is the title',
            'head.description' : 'This is the meta description',
            'body.title' : 'Hello templated world!',
            'body.class' : 'index'
        };
        // Read in the index template as a string
        return await Helpers.addUniversalTemplate(await Helpers.getTemplate("index", templateData), templateData)
    }
}

module.exports = RootHandler;