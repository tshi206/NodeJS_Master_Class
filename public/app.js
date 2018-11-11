/**
 * This is the frontend logic for the application
 *
 */

// Container for the frontend application
let app = {};

// Config
app.config ={
    "sessionToken" : false
};

// AJAX Client for the restful API
app.client = {};

/**
 * Interface for making API calls
 * @param headers - HTTP header object
 * @param path - the URL relative to the hostname
 * @param method - the HTTP method in capital
 * @param queryStringObject - the query string k/v pairs in Object format
 * @param payload - the HTTP request payload
 * @param watchResponse - boolean, true if this function should return an response object (it will attempt to parse the response body into Object via JSON.parse and throw errors if any); otherwise the HTTP response will be omitted from the client
 * @return {Promise<Object | void>}
 */
app.client.request = async (headers, path, method, queryStringObject, payload, watchResponse) => {
    headers = typeof (headers) === "object" && headers !== null ? headers : {};
    path = typeof (path) === "string" ? path : "/";
    method = typeof (method) === "string" && ["POST", "GET", "PUT", "DELETE"].includes(method) ? method.toUpperCase() : "GET";
    queryStringObject = typeof (queryStringObject) === "object" && queryStringObject !== null ? queryStringObject : {};
    payload = typeof (payload) === "object" && payload !== null ? payload : {};
    watchResponse = typeof (watchResponse) === "boolean" ? watchResponse : false;
    // For each query string parameter sent, add it to the path
    let requestUrl = path + "?";
    Object.keys(queryStringObject).forEach(key => {
        requestUrl += `${key}=${queryStringObject[key]}&`;
    });
    requestUrl = requestUrl.substr(0, requestUrl.length - 1);
    // Form the HTTP request as a JSON type
    const xhr = new XMLHttpRequest();
    xhr.open(method, requestUrl, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    // For each header sent, add it to the request
    Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
    });
    // If there is a current session token, add that as a header as well
    if (app.config.sessionToken) xhr.setRequestHeader("token", app.config.sessionToken.id);
    // When the request comes back, handle the response
    const response = new Promise(resolve => {
        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                const statusCode = xhr.status;
                const responseReturned = xhr.responseText;
                // resolve with the parsed response if the response is watched, otherwise resolve into nothing
                if (watchResponse) {
                    try {
                        const parsedResponse = JSON.parse(responseReturned);
                        resolve({
                            statusCode,
                            parsedResponse
                        })
                    } catch (e) {
                        resolve({
                            statusCode,
                            "parsedResponse" : false
                        })
                    }
                } else {
                    resolve()
                }
            }
        };
    });
    // Send the payload as JSON
    const payloadString = JSON.stringify(payload);
    xhr.send(payloadString);
    return await response;
};

// Bind the logout button
app.bindLogoutButton = () => {
    document.getElementById("logoutButton").addEventListener("click", async e => {

        // Stop it from redirecting anywhere
        e.preventDefault();

        // Log the user out
        await app.logUserOut();

    });
};

// Log the user out then redirect them
app.logUserOut = async () => {
    // Get the current token id
    const tokenId = typeof(app.config.sessionToken.id) === 'string' ? app.config.sessionToken.id : false;
    // Send the current token to the tokens endpoint to delete it
    const queryStringObject = {
        'id': tokenId
    };
    const {statusCode, parsedResponse} = await app.client.request(undefined, 'api/tokens', 'DELETE', queryStringObject, undefined, true);
    if (statusCode === 200) {
        // Set the app.config token as false
        app.setSessionToken(false);
        // Send the user to the logged out page
        window.location = '/session/deleted';
    } else {
        alert(`Fail to delete your session due to error code ${statusCode}. Error: ${parsedResponse.Error}`);
    }
};

// Bind the forms
app.bindForms = function() {
    if (!document.querySelector("form")) return;
    document.querySelector("form").addEventListener("submit", async function(e) {

        // Stop it from submitting
        e.preventDefault();
        const formId = this.id;
        const path = this.action;
        const method = this.method.toUpperCase();

        // Hide the error message (if it's currently shown due to a previous error)
        document.querySelector("#"+formId+" .formError").style.display = 'hidden';

        // Turn the inputs into a payload
        const payload = {};
        const elements = this.elements;
        for(let i = 0; i < elements.length; i++){
            if(elements[i].type !== 'submit'){
                payload[elements[i].name] = elements[i].type === 'checkbox' ? elements[i].checked : elements[i].value;
            }
        }

        // Call the API
        const response = await app.client.request(undefined, path, method, undefined, payload, true);
        // Display an error on the form if needed
        if(response.statusCode !== 200){
            // Try to get the error from the api, or set a default error message and then set the formError field with the error text
            document.querySelector("#"+formId+" .formError").innerHTML = typeof(response.parsedResponse.Error) === 'string' ? response.parsedResponse.Error : 'An error has occurred, please try again';
            // Show (unhide) the form error field on the form
            document.querySelector("#"+formId+" .formError").style.display = 'block';

        } else {
            // If successful, send to form response processor
            await app.formResponseProcessor(formId,payload,response.parsedResponse);
        }
    });
};

// Form response processor
app.formResponseProcessor = async (formId,requestPayload,responsePayload) => {
    const functionToCall = false;
    // If account creation was successful, try to immediately log the user in
    if(formId === 'accountCreate'){
        // Take the phone and password, and use it to log the user in
        const newPayload = {
            'phone': requestPayload.phone,
            'password': requestPayload.password
        };

        const {statusCode, parsedResponse} = await app.client.request(undefined, 'api/tokens', 'POST', undefined, newPayload, true);
        // Display an error on the form if needed
        if(statusCode !== 200){

            // Set the formError field with the error text
            document.querySelector("#"+formId+" .formError").innerHTML = 'Sorry, an error has occurred. Please try again.';

            // Show (unhide) the form error field on the form
            document.querySelector("#"+formId+" .formError").style.display = 'block';

        } else {
            // If successful, set the token and redirect the user
            app.setSessionToken(parsedResponse);
            window.location = '/checks/all';
        }
    }
    // If login was successful, set the token in local storage and redirect the user
    if(formId === 'sessionCreate'){
        app.setSessionToken(responsePayload);
        window.location = '/checks/all';
    }
};

// Get the session token from local storage and set it in the app.config object
app.getSessionToken = () => {
    const tokenString = localStorage.getItem('token');
    if(typeof(tokenString) === 'string'){
        try{
            const token = JSON.parse(tokenString);
            app.config.sessionToken = token;
            if(typeof(token) === 'object'){
                app.setLoggedInClass(true);
            } else {
                app.setLoggedInClass(false);
            }
        }catch(e){
            app.config.sessionToken = false;
            app.setLoggedInClass(false);
        }
    }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = add => {
    const target = document.querySelector("body");
    if(add){
        target.classList.add('loggedIn');
    } else {
        target.classList.remove('loggedIn');
    }
};

// Set the session token in the app.config object as well as local storage
app.setSessionToken = token => {
    app.config.sessionToken = token;
    const tokenString = JSON.stringify(token);
    localStorage.setItem('token',tokenString);
    if(typeof(token) === 'object'){
        app.setLoggedInClass(true);
    } else {
        app.setLoggedInClass(false);
    }
};

// Renew the token, return false if no error; true otherwise
app.renewToken = async () => {
    const currentToken = typeof(app.config.sessionToken) === 'object' ? app.config.sessionToken : false;
    if(currentToken){
        // Update the token with a new expiration
        const payload = {
            'id': currentToken.id,
            'extend': true,
        };
        const {statusCode, parsedResponse} = await app.client.request(undefined, 'api/tokens', 'PUT', undefined, payload, true);
        // Display an error on the form if needed
        if(statusCode === 200){
            // Get the new token details
            app.setSessionToken(parsedResponse);
            return false;
        } else {
            app.setSessionToken(false);
            return true;
        }
    } else {
        app.setSessionToken(false);
        return true;
    }
};

// Loop to renew token often
app.tokenRenewalLoop = () => {
    setInterval(async () => {
        const err = await app.renewToken();
        if(!err){
            console.log("Token renewed successfully @ "+Date.now());
        }
    },1000 * 60);
};

// Init (bootstrapping)
app.init = () => {

    // Bind all form submissions
    app.bindForms();

    // Bind logout logout button
    app.bindLogoutButton();

    // Get the token from local storage
    app.getSessionToken();

    // Renew token
    app.tokenRenewalLoop();

};

// Call the init processes after the window loads
window.onload = () => {
    app.init();
};