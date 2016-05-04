var nom = require('../nomiku.js');

var logger = require('cologger');

nom.setDebug(true);

function showVariable(err, varName, value)
{
    if(err)
        logger.error("Error. Unable to get", varName, ". Details:",err)
    else
        logger.info(varName, "=", value);
}

logger.info('Logging into the Nomiku/Tender service')

nom.auth(process.env.NOMIKU_EMAIL, process.env.NOMIKU_PASSWORD, function(error){
    if(error)
    {
        logger.error("Failed to login for some reason. Error =", error);
        return;
    }

    logger.success('Logged in.');
    logger.info("The current access token is " + nom.getToken())

    logger.info("Getting a list of all devices associated with the current user");
    nom.getDevices(function(error, devices)
    {
        if(error)
        {
            logger.error("Error:", error);
            return
        }
        else
        {
            logger.success('Device list obtained.');
            logger.info("Devices:", devices);
            // Select the first non-virtual device
            for (var i = 0; i < devices.length; i++) {

                if(devices[i].hardware_device_id == process.env.NOMIKU_DEVICE_ID)
                {
                    logger.info("Special device id: ", process.env.NOMIKU_DEVICE_ID);
                    logger.info("Current device id: ", devices[i].hardware_device_id);

                    console.log(nom.states);

                    var deviceID = devices[i].hardware_device_id;
                    nom.setDeviceID(devices[i].hardware_device_id);
                    nom.getState(function (err, value){showVariable(err, deviceID + ' - state', nom.states[value])});
                    nom.getTemp(function (err, value){showVariable(err, deviceID + ' - temp', value)});
                    nom.getSetPoint(function (err, value){showVariable(err, deviceID + ' - setPoint', value)});
                    nom.getReceipeID(function (err, value){showVariable(err, deviceID + ' - recipeID', value)});
                    nom.getVersion(function (err, value){showVariable(err, deviceID + ' - version', value)});
                    nom.setState(nom.STATE_OFF, function (err, value){showVariable(err, deviceID + ' - state', nom.states[value])});
                    nom.setSetPoint(70, function (err, value){showVariable(err, deviceID + ' - setPoint', value)});


                    setTimeout(function() {nom.getState(function (err, value){showVariable(err, deviceID + ' - state', nom.states[value])});}, 3000);
                    return
                }
            };
        }
    });
});