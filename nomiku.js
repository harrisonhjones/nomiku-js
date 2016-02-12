#!/usr/bin/env node
'use strict';

 /**
 * @overview Provides an API wrapper for the WiFi Nomiku/Tender service
 * @see {@link http://github.com/harrisonhjones/}
 * @author Harrison Jones (harrison@hhj.me)
 * @copyright Harrison Jones 2016
 * @license
 * The MIT License (MIT)
 * 
 * Copyright (c) 2016 Harrison Jones
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

var apiToken = false,
    apiUserID = 0,
    apiURL = 'https://www.eattender.com/api/',
    deviceID = '',
    mqttURL = '',
    STATE_ON = '1',
    STATE_OFF = '0';

/**
 * @function setToken
 * @description Manually sets a token
 * @param {String} apiToken - the API token to use
 * @returns {Boolean} true if a token is provided. False otherwise
 */
function setToken(token)
{
    if(token)
    {
        apiToken = token;
        return true;
    }
    else
    {
        return false;
    }
}

/**
 * @function setUserID
 * @description Manually sets a userID
 * @param {String} id - the user ID to use
 * @returns {Boolean} true if a id is provided. False otherwise
 */
function setUserID(id)
{
    if(id)
    {
        apiUserID = id;
        return true;
    }
    else
    {
        return false;
    }
}

/**
 * @function setDeviceID
 * @description Manually sets the device ID
 * @param {String} id - the device ID to use
 * @returns {Boolean} true if a id is provided. False otherwise
 */
function setDeviceID(id)
{
    if(id)
    {
        deviceID = id;
        return true;
    }
    else
    {
        return false;
    }
}

/**
 * @function auth
 * @description Authenticates and grabs an access token
 * @param {String} email - email to login to the Nomiku API with
 * @param {String} password - password for the login
 * @param {authenticateCallback} cb - The callback that handles the response.
 */
function auth(email, password, cb)
{
    if(email && password)
    {
        // We are using the 'request' module to http requests
        var request = require('request');

        // Set a HTTP POST request to the auth endpoint with the required login information. If we login correctly grab the returned userID and apiToken and set them; call the callback with `false` to indicate that no error has occured. If not, call the callback with the error
        request.post(apiURL + 'users/auth', {form:{email: email, password: password}}, function (error, response, body) {
            // console.log("Auth success", error, response.statusCode);
            if (!error && response.statusCode == 201) {
                body = JSON.parse(body);
                setUserID(body.user_id);
                setToken(body.api_token);
                cb(false);
            }
            else
            {
                cb(error);
            }
        });
    }
    else
    {
        cb("You failed to provide either an email or password to authenticate against. Email =", email, "& password =", password);
    }
}

/**
 * @function getDevices
 * @description Authenticates and grabs an access token
 * @param {String} email - email to login to the Nomiku API with
 * @param {String} password - password for the login
 * @param {authenticateCallback} cb - The callback that handles the response.
 */
function getDevices(cb)
{
    if(!apiToken || !apiUserID)
        return cb("You must authenticate first!",null);
    // We are using the 'request' module to http requests
    var request = require('request');

    var options = {
        url: apiURL + 'devices',
        headers: {
        'X-Api-Token': apiToken
        }
    };

    // Set a HTTP POST request to the auth endpoint with the required login information. If we login correctly grab the returned userID and apiToken and set them; call the callback with `false` to indicate that no error has occured. If not, call the callback with the error
    request.get(options, function (error, response, body) {
        // console.log("Auth success", error, response.statusCode);
        if (!error && response.statusCode == 200) {
            body = JSON.parse(body);
            cb(false, body.devices);
        }
        else
        {
            cb(error, null);
        }
    });

}

/**
 * @function get
 * @description Grabs an arbitrary variable value
 * @param {String} variableName - the variable name to grab
 * @param {getSetCallback} cb - The callback that handles the response.
 */
function get(variableName, cb)
{
    if(!variableName)
        return cb("You must provide a variable name",null);

    // If the `variableName` variable name isn't a string convert it to one (required by the API)
    if (!(typeof variableName === 'string') || !(variableName instanceof String))
        variableName = variableName.toString();

    //console.log("Calling `set` with variableName =`",variableName,"` (", typeof variableName, ")")

    // If we haven't set the apiToken, userID, or deviceID return with an error because we need those 3 things to successfully execute the command
    if(!apiToken || !apiUserID)
        return cb("You must authenticate first!",null);
    
    if(!deviceID)
        return cb("You must set a device ID!",null);

    // We are using the mqtt library to talk to the API. Connect to the API with the apiUserID and API Token
    var mqtt    = require('mqtt'),
        client  = mqtt.connect('https://mq.nomiku.com/mqtt',{username: 'user/'+apiUserID, password: apiToken});

    //console.log("Getting:", variableName);
    //console.log("UserID:", apiUserID);
    //console.log("APIToken:", apiToken);
    
    // When we connect subscribe to the desired variable
    client.on('connect', function () {
        client.subscribe('nom2/' + deviceID + '/get/' + variableName);
    });
    
    // Once we get the desired variable value kill the conneciton and call the callback with the variable value
    client.on('message', function (topic, message) {
      client.end();
      cb(false, message.toString());
    });
}

/**
 * @function set
 * @description Sets an arbitrary variable value
 * @param {String} variableName - the variable name to set
 * @param {String} value - the value to set the variable to
 * @param {getSetCallback} cb - The callback that handles the response.
 */
function set(variableName, value, cb)
{
    if(!variableName)
        return cb("You must provide a variable name. You provided ", variableName,null);
    
    if(!value)
        return cb("You must provide a variable value. You provided ", value,null);
    
    // If the `variableName` variable name isn't a string convert it to one (required by the API)
    if (!(typeof variableName === 'string') || !(variableName instanceof String))
        variableName = variableName.toString();
    
    // If the `value` variable name isn't a string convert it to one (required by the API)
    if (!(typeof value === 'string') || !(value instanceof String))
        value = value.toString();

    // console.log("Calling `set` with variableName =`",variableName,"` (", typeof variableName, ") & value =`", value,"` (" , typeof value, ")")

    // If we haven't set the apiToken, userID, or deviceID return with an error because we need those 3 things to successfully execute the command
    if(!apiToken || !apiUserID)
        return cb("You must authenticate first!",null);

    if(!deviceID)
        return cb("You must set a device ID!",null);

    // We are using the mqtt library to talk to the API. Connect to the API with the apiUserID and API Token
    var mqtt    = require('mqtt'),
        client  = mqtt.connect('https://mq.nomiku.com/mqtt',{username: 'user/'+apiUserID, password: apiToken});

    // When we connect publish the desired variable value and subscribe to the value (not really useful since it returns an old value)
    client.on('connect', function () {
        // console.log("Publishing `" + 'nom2/' + deviceID + '/set/' + variableName + "`")
        client.publish('nom2/' + deviceID + '/set/' + variableName, value);
        client.subscribe('nom2/' + deviceID + '/get/' + variableName);
    });
    
    // Once we get the desired variable value kill the conneciton and call the callback with the variable value. Again; this is almost always the old value
    client.on('message', function (topic, message) {
        client.end();
        cb(false, message.toString());
    });
}

/**
 * @function getState
 * @description Grabs the most recent state (0 = off, 1 = on)
 * @param {getSetCallback} cb - The callback that handles the response.
 */
function getState(cb)
{
    get('state', cb);
}

/**
 * @function getTemp
 * @description Grabs the most recent temperature in Celcius
 * @param {getSetCallback} cb - The callback that handles the response.
 */
function getTemp(cb)
{
    get('temp', cb);
}

/**
 * @function getSetPoint
 * @description Grabs the most recent set point temperature in Celcius
 * @param {getSetCallback} cb - The callback that handles the response.
 */
function getSetPoint(cb)
{
    get('setpoint', cb);
}

/**
 * @function getReceipeID
 * @description Grabs the most recent recipe ID
 * @param {getSetCallback} cb - The callback that handles the response.
 */
function getReceipeID(cb)
{
    get('recipeID', cb);
}

/**
 * @function getVersion
 * @description Grabs the most recent version
 * @param {getSetCallback} cb - The callback that handles the response.
 */
function getVersion(cb)
{
    get('version', cb);
}

/**
 * @function setState
 * @description Sets the current state of the device
 * @param {getSetCallback} cb - The callback that handles the response.
 */
function setState(value, cb)
{
    set('state', value, cb);
}

/**
 * @function setState
 * @description Sets the current state of the device
 * @param {getSetCallback} cb - The callback that handles the response.
 */
function setState(value, cb)
{
    set('state', value, cb);
}

/**
 * @function setSetPoint
 * @description Sets the current temperature set point in Celcius of the device
 * @param {getSetCallback} cb - The callback that handles the response.
 */
function setSetPoint(value, cb)
{
    set('setpoint', value, cb);
}

/**
 * @function CtoF
 * @description Converts temperatures in Celcius to Farenheight 
 * @param {String} c - The temp value in degrees Celcius
 * @returns {Number} The converted temperature in Farenheight
 */
function CtoF(c)
{
    return c*1.8+32;
}

/**
 * @function FtoC
 * @description Converts temperatures in Farenheight to Celcius 
 * @param {String} f - The temp value in degrees Farenheight
 * @returns {Number} The converted temperature in Celcius
 */
function FtoC(f)
{
    return (f-32)/1.8;
}

/**
 * @callback authenticateCallback
 * @param {Boolean|object} error - False if no error occured; an error obejct if an error did occur
 */

/**
 * @callback getSetCallback
 * @param {Boolean|object} error - False if no error occured; an error obejct if an error did occur
 * @param {String} value - the value returned from the get request if an error did not occur
 */

module.exports = {
    auth: auth,
    getDevices: getDevices,
    setToken: setToken,
    setUserID: setUserID,
    setDeviceID: setDeviceID,
    get: get,
    set: set,
    CtoF: CtoF,
    FtoC: FtoC,
    getState: getState,
    getTemp: getTemp,
    getSetPoint: getSetPoint,
    getReceipeID: getReceipeID,
    getVersion: getVersion,
    STATE_ON: STATE_ON,
    STATE_OFF: STATE_OFF,
    setState: setState,
    setSetPoint: setSetPoint
}