'use strict';

//var defaults = require('./defaults');
var homedir = require('homedir');

//api endpoints
exports.api = {
    core: 'https://soichi7.ppa.iu.edu/api/sca',       
    auth: 'https://soichi7.ppa.iu.edu/api/auth',       
}

exports.path = {
    cli_jwt: homedir()+'/.sca/keys/cli.jwt', //place to store access token
}
