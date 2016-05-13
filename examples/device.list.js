// Prerequisits
// process.env.NOMIKU_EMAIL - Your Nomiku/Tender email
// process.env.NOMIKU_PASSWORD - Your Nomiku/Tender password

// Import the Nomiku library
// var nom = require('nomiku-js');  // Uncomment if you installed nomiku-js with `npm install nomiku-js`
var Nomiku = require('../nomiku.js');  // Uncomment if you are running this script from the examples folder
var nom = new Nomiku();

// Turn on debugging to see what is happening in the nomiku-js package
nom.setDebug(true);

// Let the user know what we are doing
console.log('[INFO] Logging into the Nomiku/Tender service');

// Log into the Nomiku service and grab an access token
nom.auth(process.env.NOMIKU_EMAIL, process.env.NOMIKU_PASSWORD, function(error){

    // If there was an error logging in report it
    if(error)
    {
        console.log("[ERROR] Failed to login for some reason. Error =", error);
        return;
    }

    console.log('[SUCCESS] Logged in.');
    console.log("[INFO] The current access token is", nom.getToken());

    // Get the user's device list
    nom.getDevices(function(error, devices)
    {
        if(error)
        {
            console.log("[ERROR] Failed to get the user's device list. Error =", error);
            return;
        }
        else
        {
            console.log('[INFO] Device list obtained.');
            console.log(devices);
        }
    });
});