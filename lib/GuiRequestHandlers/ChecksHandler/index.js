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

    static async checksList() {
        // Prepare data for interpolation
        const templateData = {
            'head.title' : 'Dashboard',
            'body.class' : 'checksList'
        };
        // Read in the index template as a string
        return await Helpers.addUniversalTemplate(await Helpers.getTemplate("checksList", templateData), templateData)
    }

    static async checksEdit() {
        // Prepare data for interpolation
        const templateData = {
            'head.title' : 'Check Details',
            'body.class' : 'checksEdit'
        };
        // Read in the index template as a string
        return await Helpers.addUniversalTemplate(await Helpers.getTemplate("checksEdit", templateData), templateData)
    }

}

module.exports = Handler;