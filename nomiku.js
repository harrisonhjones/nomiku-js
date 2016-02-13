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

    /**
     * @function setDebug
     * @memberof Nomiku.prototype
     * @description Manually sets if debugging is on or off
     * @param {Boolean} arg - The future state of the debugger's on state
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
     * @function debug
     * @memberof Nomiku.prototype
     * @description Manually sets if debugging is on or off
     * @param {Boolean} arg - The future state of the debugger's on state
     */
    Nomiku.prototype.setDebug = function(arg) {
        if(typeof arg === 'boolean') {
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
            // We are using the 'request' module to http requests
            var request = require('request');

            this.debug("Authenticating against url=" + (_(this).apiURL + 'users/auth'), "with username =", email, "& password =", password);

            // See http://www.toptal.com/javascript/10-most-common-javascript-mistakes for why this is done
            var self = this;

            // Set a HTTP POST request to the auth endpoint with the required login information. If we login correctly grab the returned userID and apiToken and set them; call the callback with `false` to indicate that no error has occured. If not, call the callback with the error
            request.post(_(this).apiURL + 'users/auth', {form:{email: email, password: password}}, function (error, response, body) {
                // console.log("Auth success", error, response.statusCode);
                if (!error && response.statusCode == 201) {
                    body = JSON.parse(body);
                    //this.setUserID();
                    self.setUserID(body.user_id);
                    self.setToken(body.api_token);
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
     * @memberof Nomiku.prototype
     * @description Authenticates and grabs an access token
     * @param {String} email - email to login to the Nomiku API with
     * @param {String} password - password for the login
     * @param {authenticateCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.getDevices = function(cb)
    {
        if(!_(this).apiToken || !_(this).apiUserID)
            return cb("You must authenticate first!",null);
        // We are using the 'request' module to http requests
        var request = require('request');

        var options = {
            url: _(this).apiURL + 'devices',
            headers: {
            'X-Api-Token': _(this).apiToken
            }
        };

        this.debug("Getting device list");

        // Set a HTTP POST request to the auth endpoint with the required login information. If we login correctly grab the returned userID and apiToken and set them; call the callback with `false` to indicate that no error has occured. If not, call the callback with the error
        request.get(options, function (error, response, body) {
            // console.log("Auth success", error, response.statusCode);
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                // this.debug("Found the following devices:", body.devices);
                cb(false, body.devices);
            }
            else
            {
                this.debug("Unable to pull the device list. Error =", error);
                cb(error, null);
            }
        });

    }

    /**
     * @function get
     * @memberof Nomiku.prototype
     * @description Grabs an arbitrary variable value
     * @param {String} variableName - the variable name to grab
     * @param {getSetCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.get = function(variableName, cb)
    {
        this.debug("Getting", variableName, 'from', _(this).deviceID, 'using token', _(this).apiToken);

        if(!variableName)
            return cb("You must provide a variable name",null);

        // If the `variableName` variable name isn't a string convert it to one (required by the API)
        if (!(typeof variableName === 'string') || !(variableName instanceof String))
            variableName = variableName.toString();

        // If we haven't set the apiToken, userID, or deviceID return with an error because we need those 3 things to successfully execute the command
        if(!_(this).apiToken || !_(this).apiUserID)
            return cb("You must authenticate first!",null);
        
        if(!_(this).deviceID)
            return cb("You must set a device ID!",null);

        // We are using the mqtt library to talk to the API. Connect to the API with the apiUserID and API Token
        var mqtt    = require('mqtt'),
            client  = mqtt.connect('https://mq.nomiku.com/mqtt',{username: 'user/'+_(this).apiUserID, password: _(this).apiToken});
        
        // When we connect subscribe to the desired variable
        var self = this;

        client.on('connect', function () {
            self.debug("Subscribing to ", 'nom2/' + _(self).deviceID + '/get/' + variableName)
            client.subscribe('nom2/' + _(self).deviceID + '/get/' + variableName);
        });
        
        // Once we get the desired variable value kill the conneciton and call the callback with the variable value
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

    /**
     * @function set
     * @memberof Nomiku.prototype
     * @description Sets an arbitrary variable value
     * @param {String} variableName - the variable name to set
     * @param {String} value - the value to set the variable to
     * @param {getSetCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.set = function(variableName, value, cb)
    {
        this.debug("Setting", variableName, 'to', value, 'on', _(this).deviceID, 'using token', _(this).apiToken);

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

        // If we haven't set the apiToken, userID, or deviceID return with an error because we need those 3 things to successfully execute the command
        if(!_(this).apiToken || !_(this).apiUserID)
            return cb("You must authenticate first!",null);

        if(!_(this).deviceID)
            return cb("You must set a device ID!",null);

        // We are using the mqtt library to talk to the API. Connect to the API with the apiUserID and API Token
        var mqtt    = require('mqtt'),
            client  = mqtt.connect('https://mq.nomiku.com/mqtt',{username: 'user/'+_(this).apiUserID, password: _(this).apiToken});

        // When we connect publish the desired variable value and subscribe to the value (not really useful since it returns an old value)
        var self = this;

        client.on('connect', function () {
            client.publish('nom2/' + _(self).deviceID + '/set/' + variableName, value);
            client.subscribe('nom2/' + _(self).deviceID + '/get/' + variableName);
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

    /**
     * @function getState
     * @memberof Nomiku.prototype
     * @description Grabs the most recent state (0 = off, 1 = on, -1 = offline)
     * @param {getSetCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.getState = function(cb)
    {
        this.get('state', cb);
    }

    /**
     * @function getTemp
     * @memberof Nomiku.prototype
     * @description Grabs the most recent temperature in Celcius
     * @param {getSetCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.getTemp = function(cb)
    {
        this.get('temp', cb);
    }

    /**
     * @function getSetPoint
     * @memberof Nomiku.prototype
     * @description Grabs the most recent set point temperature in Celcius
     * @param {getSetCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.getSetPoint = function(cb)
    {
        this.get('setpoint', cb);
    }

    /**
     * @function getReceipeID
     * @memberof Nomiku.prototype
     * @description Grabs the most recent recipe ID
     * @param {getSetCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.getReceipeID = function(cb)
    {
        this.get('recipeID', cb);
    }

    /**
     * @function getVersion
     * @memberof Nomiku.prototype
     * @description Grabs the most recent version
     * @param {getSetCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.getVersion = function(cb)
    {
        this.get('version', cb);
    }

    /**
     * @function setState
     * @memberof Nomiku.prototype
     * @description Sets the current state of the device
     * @param {getSetCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.setState = function(value, cb)
    {
        this.set('state', value, cb);
    }

    /**
     * @function setSetPoint
     * @memberof Nomiku.prototype
     * @description Sets the current temperature set point in Celcius of the device
     * @param {getSetCallback} cb - The callback that handles the response.
     */
    Nomiku.prototype.setSetPoint = function(value, cb)
    {
        this.set('setpoint', value, cb);
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

