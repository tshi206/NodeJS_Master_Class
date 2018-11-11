const Helpers = require("../../Helpers");

class Handler {

    static async accountCreate() {
        // Prepare data for interpolation
        const templateData = {
            'head.title' : 'Create an account',
            'head.description' : 'Sign up is easy and only takes a few seconds',
            'body.class' : 'accountCreate'
        };
        // Read in the index template as a string
        return await Helpers.addUniversalTemplate(await Helpers.getTemplate("accountCreate", templateData), templateData)
    }

    static async accountEdit() {
        // Prepare data for interpolation
        const templateData = {
            'head.title' : 'Account Settings',
            'body.class' : 'accountEdit'
        };
        // Read in the index template as a string
        return await Helpers.addUniversalTemplate(await Helpers.getTemplate("accountEdit", templateData), templateData)
    }

    static async accountDeleted() {
        // Prepare data for interpolation
        const templateData = {
            'head.title' : 'Account Deleted',
            'head.description' : 'Your account has been deleted',
            'body.class' : 'accountDeleted'
        };
        // Read in the index template as a string
        return await Helpers.addUniversalTemplate(await Helpers.getTemplate("accountDeleted", templateData), templateData)
    }

}

module.exports = Handler;