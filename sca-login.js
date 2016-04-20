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

//mine
var config = require('./config');
var common = require('./common');

program
    //.version('0.0.1')
    //.arguments('<cmd> [env]')
    /*
    .action(function (cmd, env) {
        cmdValue = cmd;
        envValue = env;
    })
    */
    .option('-u --username <username>', 'SCA username')
    .option('-p --password <password>', 'SCA password')
    .parse(process.argv);

var schema = {
    properties: {
        username: {required: true},
        password: {required: true, hidden: true},
    }
};
prompt.message = null;//"SCA";//colors.rainbow("SCA");
prompt.override = program;
prompt.start();
prompt.get(schema, function(err, results) {
    if(err) throw err; 
    for(var k in results) {
        program[k] = results[k];
    }
    dorequest();
});

function dorequest() {

    //console.log(config.api.core);
    request.post({
        url: config.api.auth+"/local/auth", 
        json: true,
        body: {username: program.username, password: program.password}
    }, function(err, res, body) {
        if(err) throw err;
        if(res.statusCode != 200) return common.show_error(res, body);

        //make sure .sca/keys directory exists
        var dirname = path.dirname(config.path.cli_jwt);
        mkdirp(dirname, function (err) {
            if (err) throw err;
            fs.chmodSync(dirname, '700');
            //fs.writeFileSync(config.path.cli_jwt, JSON.stringify({username: program.username, jwt: body.jwt}));
            fs.writeFileSync(config.path.cli_jwt, body.jwt);
            fs.chmodSync(config.path.cli_jwt, '600');
            
            //console.log(colors.rainbow(body.jwt));
            //console.log(colors.green(body.jwt));
            var token = jwt.decode(body.jwt);
            console.dir(token);
        });
    });

}
