/**
 * Create and export configuration variables
 */

// Container for all the environments
const environments = {};

// Staging (default) environment
environments.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'envName' : 'staging',
    'hashingSecret' : 'this is a secret',
    'maxChecks' : 5,
    'twilio' : {
        'accountSid' : "ACb32d411ad7fe886aac54c665d25e5c5d",
        'authToken' : "9455e3eb3109edc12e3d8c92768f7a67",
        'fromPhone' : "+15005550006"
    }
};

// Production environment
environments.production = {
    'httpPort' : 80,
    'httpsPort' : 443,
    'envName' : 'production',
    'hashingSecret' : 'the red fox jumps over a lazy dog',
    'maxChecks' : 5,
    'twilio' : {
        'accountSid' : "",
        'authToken' : "",
        'fromPhone' : ""
    }
};

// Determine which environment was passed as a command line argument
const currentEnvironment = typeof (process.env.NODE_ENV) === "string" ? process.env.NODE_ENV.toLowerCase() : "";

// Check that the current environment is one of the environments above, if not, default to staging
const environmentToExport = Object.keys(environments).includes(currentEnvironment) ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;