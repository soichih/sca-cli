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
    .command('ls')
    .description('list your workflow instances')
    .action(action_ls);

if(!process.argv.slice(2).length) {
    program.outputHelp(function(t) { return colors.red(t)});
    process.exit(1);
}

//TODO - I need to handle a case when user doesn't specify any command (process.argv.length == 2?)
program.parse(process.argv);

function action_ls(env) {
    common.load_jwt(function(err, jwt) {
        if(err) throw err;
        //console.log(config.api.core);
        request.get({
            url: config.api.core+"/instance", 
            json: true,
            headers: { 'Authorization': 'Bearer '+jwt }
        }, function(err, res, instances) {
            if(err) throw err;
            if(res.statusCode != 200) return common.show_error(res, instances);
            instances.forEach(function(instance) {
                console.log(colors.gray(instance._id)+" "+instance.create_date+" "+instance.workflow_id+" "+colors.underline(colors.green(instance.name))+" "+colors.green(instance.desc));
            });
        });
    });
}
