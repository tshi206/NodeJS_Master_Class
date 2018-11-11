const Helpers = require("../../Helpers");

class Handler {

    static async sessionCreate() {
        // Prepare data for interpolation
        const templateData = {
            'head.title' : 'Login to your account',
            'head.description' : 'Please enter your phone number and password to access your account',
            'body.class' : 'sessionCreate'
        };
        // Read in the index template as a string
        return await Helpers.addUniversalTemplate(await Helpers.getTemplate("sessionCreate", templateData), templateData)
    }

    static async sessionDeleted() {
        // Prepare data for interpolation
        const templateData = {
            'head.title' : 'Logged Out',
            'head.description' : 'Your have been logged out of your account.',
            'body.class' : 'sessionDeleted'
        };
        // Read in the index template as a string
        return await Helpers.addUniversalTemplate(await Helpers.getTemplate("sessionDeleted", templateData), templateData)
    }

}

module.exports = Handler;