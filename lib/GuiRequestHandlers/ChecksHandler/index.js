const Helpers = require("../../Helpers");

class Handler {

    static async checksCreate() {
        // Prepare data for interpolation
        const templateData = {
            'head.title' : 'Create a New Check',
            'body.class' : 'checksCreate'
        };
        // Read in the index template as a string
        return await Helpers.addUniversalTemplate(await Helpers.getTemplate("checksCreate", templateData), templateData)
    }

}

module.exports = Handler;