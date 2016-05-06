#!/usr/bin/env node

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

/**
 * @class
 * @description Creates a new Nomiku adapter
 * @property {String} STATE_ON - The value to indicate that a unit is "ON"
 * @property {String} STATE_OFF - The value to indicate that a unit is "OFF"
 * @property {String} STATE_OFFLINE - The value to indicate that a unit is "OFFLINE"
 * @property {Array} states - All available device states exposed for easy translation of state value to human-readable state
 */ 
var Nomiku = (function() {

    var _ = require('private-parts').createKey();

    function Nomiku(token) {
        if(token)
            _(this).apiToken = token;
        else
            _(this).apiToken = null;

        _(this).apiUserID = 0;
        _(this).apiURL = 'https://www.eattender.com/api/'
        _(this).deviceID = '';
        _(this).mqttURL = '';
        _(this).debug = false; 
    }

    Nomiku.prototype.STATE_ON = '1';
    Nomiku.prototype.STATE_OFF = '0';
    Nomiku.prototype.STATE_OFFLINE = '-1';
    Nomiku.prototype.STATE_BOOTING_UP = '2';
    Nomiku.prototype.states = {"-1": "OFFLINE", "0": "OFF", "1": "ON", "2": "BOOTING UP"};

    /**
     * @function debug
     * @memberof Nomiku.prototype
     * @description Outputs a debugging message (if debugging is enabled)
     * @param {String|Object|Array} arguments - The different arguments to output
     */
    Nomiku.prototype.debug = function() {
        if (_(this).debug)
        {
            args = ["[nomiku-js]"];
            for (var i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
            console.log(args.join(" "));
        } 
    }

    /**
     * @function setDebug
     * @memberof Nomiku.prototype
     * @description Manually sets if debugging is on or off
     * @param {Boolean} arg - The future state of the debugger's on state
     */
    Nomiku.prototype.setDebug = function(arg) {
        if(typeof arg === 'boolean') 
        {
            _(this).debug = arg;
            this.debug("debugging " + (arg ? 'enabled' : 'disabled'));
        }
    }

    /**
     * @function setToken
     * @memberof Nomiku.prototype
     * @description Manually sets a token
     * @param {String} apiToken - the API token to use
     * @returns {Boolean} true if a token is provided. False otherwise
     */
    Nomiku.prototype.setToken = function(token)
    {
        if(token)
        {
            _(this).apiToken = token;
            return true;
        }
        else
        {
            return false;
        }
    }

    /**
     * @function setUserID
     * @memberof Nomiku.prototype
     * @description Manually sets a userID
     * @param {String} id - the user ID to use
     * @returns {Boolean} true if a id is provided. False otherwise
     */
    Nomiku.prototype.setUserID = function(id)
    {
        if(id)
        {
            _(this).apiUserID = id;
            return true;
        }
        else
        {
            return false;
        }
    }

    /**
     * @function setDeviceID
     * @memberof Nomiku.prototype
     * @description Manually sets the device ID
     * @param {String} id - the device ID to use
     * @returns {Boolean} true if a id is provided. False otherwise
     */
    Nomiku.prototype.setDeviceID = function(id)
    {
        this.debug("Device ID set to", id);

        if(id)
        {
            _(this).deviceID = id;
            return true;
        }
        else
        {
            return false;
        }
    }

    /**
     * @function getToken
     * @memberof Nomiku.prototype
     * @description Returns the current apiToken
     * @returns {String} The current apiToken / access token
     */
    Nomiku.prototype.getToken = function()
    {
        return _(this).apiToken;
    }

    /**
     * @function auth
     * @memberof Nomiku.prototype
     * @description Authenticates and grabs an access token
     * @param {String} email - email to login to the Nomiku API with
     * @param {String} password - password for the login
     * @param {authenticateCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.auth = function(email, password, cb)
    {
        if(email && password)
        {
            // We are using the 'needle' module to perform http requests
            var needle = require('needle');

            this.debug("Authenticating against url=" + (_(this).apiURL + 'users/auth'), "with username =", email, "& password =", password);

            // See http://www.toptal.com/javascript/10-most-common-javascript-mistakes for why this is done
            var self = this;

            // Set a HTTP POST request to the auth endpoint with the required login information. If we login correctly grab the returned userID and apiToken and set them; call the callback with `false` to indicate that no error has occured. If not, call the callback with the error
            needle.post(_(this).apiURL + 'users/auth', {email: email, password: password}, function (error, response) {
                if(error)
                {
                    cb({error: 'BAD_HTTP_REQUEST', message: error});
                }
                else
                {
                    if(response.statusCode == 201) {
                        var body = response.body;
                        self.setUserID(body.user_id);
                        self.setToken(body.api_token);
                        cb(false);
                    }
                    else
                    {
                        cb({error: "BAD_HTTP_RESPONSE_CODE", message: response.statusCode});
                    }
                }
            });
        }
        else
        {
            cb({error: "BAD_FUNCTION_PARAMETERS", message: ("You failed to provide either an email or password to authenticate against. Email =", email, "& password =", password)});
        }
    }


    Nomiku.prototype.getUser = function(userID, type, cb)
    {
        type = type || 'basic';

        this.debug("Getting " + type + " user info for user " + userID);

        if(!userID)
        {
            cb({error: "BAD_FUNCTION_PARAMETERS", message: "No userID specified!"}, null);
            return;
        }
        else
        {
            if (userID == 'me')
            {
                if(!_(this).apiUserID)
                {
                    cb({error: "FAILURE_TO_AUTHENTICATE", message: "You must authenticate first! You cannot specify 'me' as your userID if you have not logged in using a username and password first"}, null);
                    return;
                }
                else
                {
                    userID = _(this).apiUserID;
                }
            }
            // We are using the 'needle' module to perform http requests
            var needle = require('needle');

            // This request does not require authentication (though if you provide it the request will return more information)
            var options = {};
            if(type == 'full')
            {
                if(!_(this).apiToken)
                {
                    cb({error: "FAILURE_TO_AUTHENTICATE", message: "You must authenticate first! You cannot specify 'full' as your type if you have not logged in or provided a apiToken first"}, null);                            
                    return;
                }
                else
                {
                    options = {
                        headers: {
                            'X-Api-Token': _(this).apiToken
                        }
                    };
                }
            }

            // Perform a HTTP GET to grab all the devices tied to the user with the access token we have
            needle.get(_(this).apiURL + 'users/' + userID, options, function (error, response) {
                if(error)
                {
                    cb({error: "BAD_HTTP_REQUEST", message: error});
                }
                else
                {
                    if(response.statusCode == 200) {
                        var body = response.body;
                        cb(false, body.user);
                    }
                    else
                    {
                        cb({error:"BAD_HTTP_RESPONSE_CODE", message: response.statusCode});
                    }
                }
            });
        }
    }

    /**
     * @function getDevices
     * @memberof Nomiku.prototype
     * @description Authenticates and grabs an access token
     * @param {devicesCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.getDevices = function(cb)
    {
        if(!_(this).apiToken)
        {
            cb({error: "FAILURE_TO_AUTHENTICATE", message: "You must authenticate first!"}, null);
        }
        else
        {
            // We are using the 'needle' module to perform http requests
            var needle = require('needle');

            var options = {
                headers: {
                    'X-Api-Token': _(this).apiToken
                }
            };

            this.debug("Getting device list");

            // Perform a HTTP GET to grab all the devices tied to the user with the access token we have
            needle.get(_(this).apiURL + 'devices', options, function (error, response) {
                if(error)
                {
                    cb({error: "BAD_HTTP_REQUEST", message: error});
                }
                else
                {
                    if(response.statusCode == 200) {
                        var body = response.body;
                        cb(false, body.devices);
                    }
                    else
                    {
                        cb({error:"BAD_HTTP_RESPONSE_CODE", message: response.statusCode});
                    }
                }
            });
        }
    }

    /**
     * @function getDeviceSession
     * @memberof Nomiku.prototype
     * @description Grabs the current session info for a device
     * @param {String|Number} deviceID - the device ID of the device (get it using a device list)
     * @param {deviceSession} cb - The callback that handles the response.
     */
    Nomiku.prototype.getDeviceSession = function(deviceID, cb)
    {
        if(!_(this).apiToken)
        {
            cb({error: "FAILURE_TO_AUTHENTICATE", message: "You must authenticate first!"}, null);
        }
        else
        { 
            var self = this;
            self.debug("Getting device '", deviceID, "' session");

            if(!deviceID)
            {
                cb({error: "BAD_FUNCTION_PARAMETERS", message: "No deviceID specified!"}, null);
                return;
            }

            var options = {
                headers: {
                    'X-Api-Token': _(this).apiToken
                }
            };
            var needle = require('needle');
            needle.get(_(this).apiURL + 'devices/' + deviceID + '/session', options, function (error, response) {
                if(error)
                {
                    cb({error: "BAD_HTTP_REQUEST", message: error});
                }
                else
                {
                    if(response.statusCode == 200) 
                    {
                        cb(false, response.body);
                    }
                    else
                    {
                        cb({error: "BAD_HTTP_RESPONSE_CODE", message: response.statusCode});
                    }
                }
            });
        }
    }

    /**
     * @function getDeviceState
     * @memberof Nomiku.prototype
     * @description Grabs the state of a device
     * @param {String|Number} deviceID - the device ID of the device (get it using a device list)
     * @param {deviceCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.getDeviceState = function(deviceID, cb)
    {
        if(!_(this).apiToken)
        {
            cb({error: "FAILURE_TO_AUTHENTICATE", message: "You must authenticate first!"}, null);
        }
        else
        { 
            var self = this;
            self.debug("Getting device '", deviceID, "' state");
            
            if(!deviceID)
            {
                cb({error: "BAD_FUNCTION_PARAMETERS", message: "No deviceID specified!"}, null);
                return;
            }
            else
                {

                // Step 1 - Get device session info
                // Returns: 
                //  {
                //      "session_token": "{SESSION_TOKEN}",
                //      "session_base_url": "{SESSION_BASE_URL}",
                //      "session_path": "{SESSION_PATH}"
                //  }
                self.getDeviceSession(deviceID, function(error, session_info) {
                    if(error)
                    {
                        cb(error, null);
                    }
                    else
                    {
                        var options = {
                            headers: {
                                'X-Api-Token': _(self).apiToken
                            }
                        };
                        var needle = require('needle');
                        // Step 2 - GET {SESSION_BASE_URL} + {SESSION_PATH} + "?auth=" + {SESSION_TOKEN}
                        self.debug("Getting device state info");
                        needle.get(session_info.session_base_url + session_info.session_path + '?auth=' + session_info.session_token, options, function (error, response) {
                            if(error)
                            {
                                cb({error: true, message: error});
                            }
                            else
                            {
                                if(response.statusCode == 200) 
                                {
                                    // Returns 
                                    //  {
                                    //      recipeID: {RECIPE_ID},
                                    //      setpoint: {SETPOINT},
                                    //      showF: {SHOW_F},
                                    //      state: {STATE},
                                    //      temp: {TEMP},
                                    //      timerRunning: {TIMER_RUNNING},
                                    //      timerSecs: {TIMER_SECS}
                                    //  }
                                    cb(false, response.body);
                                }
                                else
                                {
                                    cb({error: "BAD_HTTP_RESPONSE_CODE", message: response.statusCode});
                                }
                                
                            }
                        });
                    }
                });
            }
        }
    }


    /**
     * @function setDeviceState
     * @memberof Nomiku.prototype
     * @description Sets the state of a device
     * @param {String|Number} deviceID - the device ID of the device (get it using a device list)
     * @param {Object} deviceState - The new device state. 
     * @param {deviceCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.setDeviceState = function(deviceID, deviceState, cb)
    {
        if(!_(this).apiToken)
        {
            cb({error: "FAILURE_TO_AUTHENTICATE", message: "You must authenticate first!"}, null);
        }
        else
        { 
            var self = this;
            self.debug("Set device '", deviceID, "' state to ", deviceState);
        
            if(!deviceID)
            {
                cb({error: "BAD_FUNCTION_PARAMETERS", message: "No deviceID specified!"}, null);
                return;
            }

            if(!deviceState)
            {    
                cb({error: "BAD_FUNCTION_PARAMETERS", message: "No deviceState specified!"}, null);
                return;
            }

            var needle = require('needle');

            var options = {
                headers: {
                    'X-Api-Token': _(self).apiToken,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            var data = JSON.stringify({state: deviceState});
            needle.post(_(this).apiURL + 'devices/' + deviceID + '/set', data, options, function (error, response) {
                if(error)
                {
                    cb({error: true, message: error});
                }
                else
                {
                    if(response.statusCode == 201) 
                    {
                        cb(false, response.body);
                    }
                    else
                    {
                        cb({error: "BAD_HTTP_RESPONSE_CODE", message: response.statusCode});
                    }
                    
                }
            });
        }
    }

    /**
     * @function setMQTT
     * @memberof Nomiku.prototype
     * @description Sets an arbitrary variable value
     * @param {String} hardwareID - The hardware ID of the device to update
     * @param {String} variableName - the variable name to set
     * @param {String} value - the value to set the variable to
     * @param {getSetCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.setMQTT = function(hardwareID, variableName, value, cb)
    {
        if(!_(this).apiToken || !_(this).apiUserID)
        {
            cb({error: "FAILURE_TO_AUTHENTICATE", message: "You must authenticate first!"}, null);
        }
        else
        { 
            this.debug("Setting", variableName, 'to', value, 'on', hardwareID, 'using token', _(this).apiToken);

            if(!hardwareID)
            {
                cb({error: "BAD_FUNCTION_PARAMETERS", message: "No hardwareID specified!"}, null);
                return;
            }

            if(!variableName)
            {
                cb({error: "BAD_FUNCTION_PARAMETERS", message: "No variableName specified!"}, null);
                return;
            }

            if(!value)
            {
                cb({error: "BAD_FUNCTION_PARAMETERS", message: "No value specified!"}, null);
                return;
            }
            
            // If the `variableName` variable name isn't a string convert it to one (required by the API)
            if (!(typeof variableName === 'string') || !(variableName instanceof String))
                variableName = variableName.toString();
            
            // If the `value` variable name isn't a string convert it to one (required by the API)
            if (!(typeof value === 'string') || !(value instanceof String))
                value = value.toString();

            // We are using the mqtt library to talk to the API. Connect to the API with the apiUserID and API Token
            var mqtt    = require('mqtt'),
                client  = mqtt.connect('https://mq.nomiku.com/mqtt',{username: 'user/'+_(this).apiUserID, password: _(this).apiToken});

            // When we connect publish the desired variable value and subscribe to the value (not really useful since it returns an old value)
            var self = this;

            client.on('connect', function () {
                client.publish('nom2/' + hardwareID + '/set/' + variableName, value);
                client.subscribe('nom2/' + hardwareID + '/get/' + variableName);
            });
            
            // Once we get the desired variable value kill the conneciton and call the callback with the variable value. Again; this is almost always the old value
            client.on('message', function (topic, message) {
                client.end();
                cb(false, message.toString());
            });

            client.on('error', function (error) {
                self.debug("An MQTT error occured.",error);
                cb(error.toString(),null);
                client.end();
            });
        }
    }

    /**
     * @function CtoF
     * @memberof Nomiku.prototype
     * @description Converts temperatures in Celcius to Farenheight 
     * @param {String} c - The temp value in degrees Celcius
     * @returns {Number} The converted temperature in Farenheight
     */
    Nomiku.prototype.CtoF = function(c)
    {
        return c*1.8+32;
    }

    /**
     * @function FtoC
     * @memberof Nomiku.prototype
     * @description Converts temperatures in Farenheight to Celcius 
     * @param {String} f - The temp value in degrees Farenheight
     * @returns {Number} The converted temperature in Celcius
     */
    Nomiku.prototype.FtoC = function(f)
    {
        return (f-32)/1.8;
    }

    return Nomiku;
}());

/** @module nomiku-js */
module.exports = new Nomiku;

/**
 * @callback authenticateCallback
 * @memberof Nomiku.prototype
 * @param {Boolean|object} error - False if no error occured; an error obejct if an error did occur
 */

/**
 * @callback getSetCallback
 * @memberof Nomiku.prototype
 * @param {Boolean|object} error - False if no error occured; an error obejct if an error did occur
 * @param {String} value - the value returned from the get request if an error did not occur
 */

 /**
 * @callback deviceCallback
 * @memberof Nomiku.prototype
 * @param {Boolean|object} error - False if no error occured; an error obejct if an error did occur
 * @param {String} device - A device object containing the device's state
 */

 /**
 * @callback devicesCallback
 * @memberof Nomiku.prototype
 * @param {Boolean|object} error - False if no error occured; an error obejct if an error did occur
 * @param {Array} devices - An array of devices containing basic device info (no state information)
 */

 /**
 * @callback deviceSession
 * @memberof Nomiku.prototype
 * @param {Boolean|object} error - False if no error occured; an error obejct if an error did occur
 * @param {Object} deviceSessionInfo - The device session information
 */

