'use strict';

//var defaults = require('./defaults');
var homedir = require('homedir');

exports.home_url = 'https://soichi7.ppa.iu.edu';

//api endpoints
exports.api = {
    core: exports.home_url+'/api/sca',       
    auth: exports.home_url+'/api/auth',       
}

exports.path = {
    cli_jwt: homedir()+'/.sca/keys/cli.jwt', //place to store access token
}
