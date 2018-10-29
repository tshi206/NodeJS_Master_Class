// Define the handlers
const handlers = {

    sample: async data => {

        // Return a HTTP status code and a payload object in JSON format
        return {
            statusCode : 406,
            payload : {
                'name' : 'sample handler'
            }
        };

    },

    notFound: async data => {
        return {statusCode : 404};
    }

};

module.exports = handlers;