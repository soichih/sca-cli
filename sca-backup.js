#!/usr/bin/env node
'use strict';

//core
var fs = require('fs');
var zlib = require('zlib');

//contrib
var program = require('commander');
var request = require('request');
var mkdirp = require('mkdirp');
var path = require('path');
var prompt = require('prompt');
var colors = require('colors/safe');
var jwt = require('jsonwebtoken');
var fstream = require('fstream');
var tar = require('tar');

//mine
var config = require('./config');
var common = require('./common');

program
    .command('create <dir>')
    .option('-m, --desc [text]', 'Text to describe this backup (text indexed for search query)')
    .description('backup specified directory')
    .action(action_create);

program
    .command('search [query]')
    .description('query list of sda backups')
    .action(action_search);

program
    .command('restore <taskid>')
    .description('Restore specified backup in the current directory')
    .action(action_restore);

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

function get_backup_instance(cb) {
    //query for sca-wf-backup instance
    request.get({
        url: config.api.core+"/instance", 
        json: true,
        headers: auth_headers,
        qs: {where: JSON.stringify({workflow_id: 'sca-wf-backup'})},
    }, function(err, res, body) {
        if(err) return cb(err);
        if(res.statusCode != 200) return cb("failed to query for sca-wf-backup");
        if(body.length == 0) {
            
            //user doesn't have sca-wf-backup yet. need to create one 
            request.post({
                url: config.api.core+"/instance/sca-wf-backup", 
                json: true,
                body: {
                    name: 'somename',
                    desc: 'somedesc',
                    config: {some:'thing'}
                }, //freesurfer@karst to osgxd
                headers: auth_headers,
            }, function(err, res, body) {
                if(err) throw err;
                cb(null, body);
            });
        } else {
            //return the first one for now..
            //TODO - if user has more than 1 sca-wf-backup, I should probably pick the latest one?
            cb(null, body[0]); 
        }
    });
}

function action_create(dir, options) {
    //console.log("dir:"+dir);
    //console.dir(options.desc);

    get_backup_instance(function(err, instance) {
        if(err) throw err; 
        var best_resource = null;
        //find the best resource to upload files to
        request.get({
            url: config.api.core+"/resource/best", 
            json: true, 
            headers: auth_headers,
            qs: {where: JSON.stringify({service_id: 'sca-service-hpss'})},
        }, function(err, res, ret) {
            if(err) throw err;
            //TODO - handle a case where user doesn't have any hpss resource
            var best_resource = ret.resource;

            //create unique name
            var tgzname = Date.now()+".tar.gz";

            // /resource/upload uses base64 encoded path
            var path64 = new Buffer(instance._id+"/_upload/"+tgzname).toString('base64');
            var req = request.post({
                url: config.api.core+"/resource/upload/"+best_resource._id+"/"+path64,
                headers: auth_headers,
            }, function(err, res, file) {
                if(err) throw err;
                request.post({
                    url: config.api.core+"/task",
                    json: true,
                    body: {
                        instance_id: instance._id,
                        service_id: 'sca-service-hpss',
                        //name: 'nonamek',
                        desc: options.desc,
                        config: {
                            put: [
                                {localpath:"../_upload/"+tgzname, hpsspath: "backup/"+tgzname}
                            ],
                            auth: {
                                //TODO - download resource list (and let user pick resource to use if there are multiple)
                                username: "hayashis",
                                keytab: "5682f80ae8a834a636dee418.keytab",
                            }
                        }
                    },
                    headers: auth_headers,
                }, function(err, res, task) {
                    if(err) throw err;
                    console.dir(task);
                }); 
            });
            
            //now start streaming!
            console.log("uploading.. "+colors.gray("resourceid:"+best_resource._id));
            fstream.Reader({path: dir, type: "Directory"})
            .on('error', function(err) { throw(err); })
            .pipe(tar.Pack()).pipe(zlib.createGzip()).pipe(req);
        });
    });
}

/*
function create_zip(dir, tarfilename, cb) {
    //create tar.gz file
    var dest = fs.createWriteStream(tarfilename);
    var packer = tar.Pack()
    .on('error', function(err) { cb(err); })
    .on('end', cb);
    var zipper = zlib.createGzip();
    fstream.Reader({path: dir, type: "Directory"})
    .on('error', function(err) { cb(err); })
    .pipe(packer).pipe(zipper).pipe(dest)
}
*/

function action_search(query) {
    //console.dir(query);
    //console.log(config.api.core);
    get_backup_instance(function(err, instance) {
        if(err) throw err; 
        //console.dir(instance);
        var where = {
            instance_id: instance._id,
        };
        if(query) where.$text = {$search: query};
        //console.dir(where);
        
        //now search for tasks
        request.get({
            url: config.api.core+"/task", 
            json: true,
            headers: auth_headers,
            qs: { where: JSON.stringify(where) }
        }, function(err, res, tasks) {
            if(err) return cb(err);
            tasks.forEach(function(task) {
                var status = common.color_status(task.status);
                //var taskid = colors.bgBlue(task._id);
                var taskid = colors.gray(task._id);
                if(task.products && task.products[0]) {
                    var file = task.products[0].files[0];
                    var size = file.size;
                    var path = colors.gray(file.path);
                }
                console.log(taskid+" "+task.create_date+" "+status+" "+path+" ("+size+" bytes)");
                console.log(colors.green(task.desc));
            });
        }); 
    });
}

function action_restore(taskid) {
    console.log("taskid:"+taskid);
}

