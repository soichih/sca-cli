#!/usr/bin/env node
'use strict';

//core
var fs = require('fs');

//contrib
var program = require('commander');
var request = require('request');
var mkdirp = require('mkdirp');
var path = require('path');
var prompt = require('prompt');
var colors = require('colors/safe');
var jwt = require('jsonwebtoken');
var async = require('async');
var archy = require('archy');

//mine
var config = require('./config');
var common = require('./common');

program
    .command('register <giturl>')
    .description('Register a new SCA service from github URL')
    .action(command_register);
 
if(!process.argv.slice(2).length) {
    program.outputHelp(function(t) { return colors.red(t)});
    process.exit(1);
}

var auth_headers; //everyone uses this
common.load_jwt(function(err, _jwt) {
    if(err) throw err;
    auth_headers = { 'Authorization': 'Bearer '+_jwt };
    program.parse(process.argv);
}); 

function command_register(giturl) {
    request.post({
        url: config.api.core+"/service", 
        json: true,
        body: {
            giturl: giturl
        }, 
        headers: auth_headers,
    }, function(err, res, body) {
        if(err) throw err;
        if(res.statusCode != 200) return common.show_error(res, body);
        console.log(JSON.stringify(body, null, 4));
    });
}

