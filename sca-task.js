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
    .command('show <taskid>')
    .description('display details about a task')
    .action(command_show);

program
    .command('rerun <taskid>')
    .description('rerun a finished / failed task')
    .action(command_rerun);

program
    .command('stop <taskid>')
    .description('stop a running task')
    .action(command_stop);

program
    .command('ls')
    .option('-i --instance <instid>', 'Instance ID to limit tasks')
    .description('list tasks')
    .action(command_ls);

program
    .command('stage <instance_id> <task_id> <resource_id>')
    .action(command_stage);
 
if(!process.argv.slice(2).length) {
    program.outputHelp(function(t) { return colors.red(t)});
    process.exit(1);
}

var jwt;
common.load_jwt(function(err, _jwt) {
    if(err) throw err;
    jwt = _jwt;
    program.parse(process.argv);
});

function command_show(taskid) {
    request.get({
        url: config.api.core+"/task", 
        json: true,
        qs: {where: JSON.stringify({_id: taskid})},
        headers: { 'Authorization': 'Bearer '+jwt }
    }, function(err, res, body) {
        if(err) throw err;
        if(res.statusCode != 200) return common.show_error(res, body);
        console.log(JSON.stringify(body, null, 4));
    });
}

function command_rerun(taskid) {
    request.put({
        url: config.api.core+"/task/rerun/"+taskid, 
        json: true,
        headers: { 'Authorization': 'Bearer '+jwt }
    }, function(err, res, body) {
        if(err) throw err;
        if(res.statusCode != 200) return common.show_error(res, body);
        console.log(JSON.stringify(body, null, 4));
    });
}

function command_stop(taskid) {
    request.put({
        url: config.api.core+"/task/stop/"+taskid, 
        json: true,
        headers: { 'Authorization': 'Bearer '+jwt }
    }, function(err, res, body) {
        if(err) throw err;
        if(res.statusCode != 200) return common.show_error(res, body);
        console.log(JSON.stringify(body, null, 4));
    });
}

function command_ls(options) {
    //first load workflow info..
    request.get({
        url: config.api.core+"/workflow", 
        json: true,
        headers: { 'Authorization': 'Bearer '+jwt }
    }, function(err, res, workflows) {
        if(err) throw err;
        if(res.statusCode != 200) return common.show_error(res, workflows);

        //then load all instances
        load_instances(options, function(err, instances) {
            if(err) throw err;
            if(res.statusCode != 200) return common.show_error(res, instances);

            //now load tasks for each instances
            //TODO - I should limit number of tasks to load (maybe the most recent?)
            async.eachSeries(instances, function(inst, next) {
                inst._services = {};
                load_tasks(inst._id, function(err, tasks) {
                    if(err) next(err);
                    //organize tasks under each services
                    tasks.forEach(function(task) {
                        if(inst._services[task.service_id] === undefined) inst._services[task.service_id] = [];
                        inst._services[task.service_id].push(task);
                    });
                    next();
                }); 
            }, function(err) {
                if(err) throw err;
        
                //create _instances list to add instances
                for(var workflow_id in workflows) {
                    workflows[workflow_id]._instances = [];
                }
                //then group tasks under separate workflows
                instances.forEach(function(instance) {
                    var wf = workflows[instance.workflow_id];
                    if(wf) wf._instances.push(instance);
                    else {
                        console.log(colors.gray("unknown workflow id:"+instance.workflow_id));
                    } 
                });

                for(var workflow_id in workflows) {
                    var workflow = workflows[workflow_id];
                    if(workflow._instances.length == 0) continue;
                    console.log(common.color_workflow(workflow));
                    
                    //organize workflow into archy-friendly format
                    workflow._instances.forEach(function(instance) {
                        //if(instance.workflow_id != workflow_id) return;
                        var inst_label = colors.gray("instance:")+instance._id;
                        inst_label += " "+colors.gray(config.home_url+workflow.url+"/#/start/"+instance._id);
                        var org_inst = {label: inst_label, nodes: []};
                        for(var service_id in instance._services) {
                            var org_service = {label: service_id/*+colors.gray(" service")*/, nodes: []};
                            instance._services[service_id].forEach(function(task) {
                                var status = common.color_status(task.status);
                                var dates = "created at "+task.create_date;
                                var deps = "";
                                if(task.deps.length) {
                                    var deps = colors.gray(" dep:");
                                    task.deps.forEach(function(dep) {
                                        deps+=dep+" "; 
                                    });
                                }
                                var task_label = colors.gray("task:")+task._id+" "+status+deps+"\n"+dates;
                                org_service.nodes.push(task_label);
                                //org_service.nodes.push(task);
                            });
                            org_inst.nodes.push(org_service);
                        }
                        console.log(archy(org_inst));
                    });
                    //console.log(JSON.stringify(org, null, 4));
                }
            });
        });
        //console.log(JSON.stringify(body, null, 4));
    });

    function load_instances(options, cb) {
        //load user instances
        var where = {};
        if(options.instance) {
            where._id = options.instance;
        }
        request.get({
            url: config.api.core+"/instance", 
            json: true, 
            qs: {where: JSON.stringify(where)},
            headers: {'Authorization': 'Bearer '+jwt}
        }, function(err, res, instances) {
            if(err) return cb(err);
            if(res.statusCode != 200) return common.show_error(res, instances);
            cb(null, instances);
        });
    }

    function load_tasks(instance_id, cb) {
        request.get({
            url: config.api.core+"/task", 
            json: true,
            qs: {where: JSON.stringify({instance_id: instance_id})},
            headers: { 'Authorization': 'Bearer '+jwt }
        }, function(err, res, tasks) {
            if(err) return cb(err);
            if(res.statusCode != 200) return common.show_error(res, tasks);
            cb(null, tasks);
        });
    }
}

function command_stage(instid, taskid, resourceid) {
    //submit noop request with dep set to the task to stage the taskid on resourceid
    request.post({
        url: config.api.core+"/task",
        json: true,
        body: {
            instance_id: instid,
            resource_id: resourceid, //resource id to run (this is suggestion, but score for noop for all resource should be 0)
            service_id: 'sca-service-noop',
            name: 'stage',
            config: {}, //noop!
            deps: [taskid], //here is the most important bit
        },
        headers: { 'Authorization': 'Bearer '+jwt }
    }, function(err, res, body) {
        if(err) throw err;
        common.wait_task(body.task, function(err) {
            if(err) throw err;
            console.log("completed");
        });
    }); 
}
