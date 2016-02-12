var nom = require('../nomiku.js');

function showVariable(err, varName, value)
{
    if(err)
        console.log("Error. Unable to get", varName, ". Details:",err)
    else
        console.log(varName, "=", value);
}

nom.auth(process.env.NOMIKU_EMAIL, process.env.NOMIKU_PASSWORD, function(error){
    if(error)
    {
        console.log("Failed to login for some reason. Error =", error);
        return;
    }

    nom.getDevices(function(error, devices)
    {
        if(error)
        {
            console.log("Error:", error);
            return
        }
        else
        {
            console.log("Devices:", devices);
            // Select the first non-virtual device
            for (var i = 0; i < devices.length; i++) {
                if(devices[i].hardware_device_id)
                {
                    nom.setDeviceID(devices[i].hardware_device_id);

                    nom.getState(function (err, value){showVariable(err, 'state', value)});
                    nom.getTemp(function (err, value){showVariable(err, 'temp', value)});
                    nom.getSetPoint(function (err, value){showVariable(err, 'setPoint', value)});
                    nom.getReceipeID(function (err, value){showVariable(err, 'recipeID', value)});
                    nom.getVersion(function (err, value){showVariable(err, 'version', value)});
                    nom.setState(nom.STATE_OFF, function (err, value){showVariable(err, 'state', value)});
                    nom.setSetPoint(70, function (err, value){showVariable(err, 'setPoint', value)});

                    return
                }
            };
        }
    });
});