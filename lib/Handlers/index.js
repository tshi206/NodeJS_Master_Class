// Define the handlers
const handlers = {

    ping: async data => {

        // Return a HTTP status code and a payload object in JSON format
        return {
            statusCode : 200,
            payload : {
                'isAlive' : 'True'
            }
        };

    },

    notFound: async data => {
        return {statusCode : 404};
    }

};

module.exports = handlers;