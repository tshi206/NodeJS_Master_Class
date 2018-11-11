const Helpers = require("../../Helpers");

class RootHandler {
    /**
     * Get the html string from the index template
     * @return {Promise<string>}
     */
    static async index() {
        // Prepare data for interpolation
        const templateData = {
            'head.title' : 'Uptime Monitoring - Made Simple',
            'head.description' : 'We offer free simple uptime monitoring for HTTP/HTTPS sites of all kinds. When your site goes down, we will send a text to let you know.',
            'body.class' : 'index'
        };
        // Read in the index template as a string
        return await Helpers.addUniversalTemplate(await Helpers.getTemplate("index", templateData), templateData)
    }
}

module.exports = RootHandler;