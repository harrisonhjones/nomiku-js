// Prerequisits
// process.env.NOMIKU_EMAIL - Your Nomiku/Tender email
// process.env.NOMIKU_PASSWORD - Your Nomiku/Tender password
// process.env.NOMIKU_HARDWARE_ID - The device hardware id of the device you want to control
// process.env.NOMIKU_DEVICE_ID - The device hardware id of the device you want to control

// Import the Nomiku library
// var nom = require('nomiku-js');  // Uncomment if you installed nomiku-js with `npm install nomiku-js`
var Nomiku = require('../nomiku.js');  // Uncomment if you are running this script from the examples folder
var nom = new Nomiku();

// Turn on debugging to see what is happening in the nomiku-js package
nom.setDebug(true);

// Let the user know what we are doing
console.log('[INFO]\t\tLogging into the Nomiku/Tender service');

// Log into the Nomiku service and grab an access token
nom.auth(process.env.NOMIKU_EMAIL, process.env.NOMIKU_PASSWORD, function(error){
    
    // If there was an error logging in report it
    if(error)
    {
        console.log("[ERROR]\t\tFailed to login for some reason. Error =", error);
        return;
    }

    console.log('[SUCCESS]\t\tLogged in.');
    console.log("[INFO]\t\tThe current access token is", nom.getToken());

    // Set the device's state using MQTT (the only supported method at the moment)
    /*nom.setMQTT(process.env.NOMIKU_HARDWARE_ID, 'setpoint', '63', function(error, deviceInfo)
    {
        if(error)
        {
            console.log("[ERROR] Failed to set the device's state. Error =", error);
            return;
        }
        else
        {
            console.log('[INFO] Device state set.');
            console.log(deviceInfo);
        }
    });    */

    nom.setDeviceState(process.env.NOMIKU_DEVICE_ID, {state: nom.STATE_OFF, setpoint: nom.FtoC(135)}, function(error, deviceInfo)
    {
        if(error)
        {
            console.log("[ERROR] Failed to set the device's state. Error =", error);
            return;
        }
        else
        {
            console.log('[INFO] Device state set.');
            console.log(deviceInfo);
        }
    }); 
});