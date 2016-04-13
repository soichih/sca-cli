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

//list requested tasks for each workflow instances

program
.option('-i --instance <instid>', 'Instance ID to load tasks')
.parse(process.argv);
//console.dir(program);
                    
function create_workflow_label(workflow)  {
    var label = "";
    if(workflow.name) label += colors.cyan(""+workflow.name+":");
    if(workflow.sca) label += workflow.sca.label+" ";
    if(workflow.version) label += colors.gray(workflow.version);
    return label;
}

common.load_jwt(function(err, jwt) {
    if(err) throw err;
    request.get({
        url: config.api.core+"/workflow", 
        json: true,
        headers: { 'Authorization': 'Bearer '+jwt }
    }, function(err, res, workflows) {
        if(err) throw err;
        if(res.statusCode != 200) return common.show_error(res, workflows);

        /*
        //find instances that we need to load tasks
        var insts = []; 
        for(var workflow_id in workflows) {
            for(var inst_id in workflows[workflow_id].insts) {
                //workflows[workflow_id].insts[inst_id]._workflow_id = workflow_id;//helps to organize things later
                insts.push(workflows[workflow_id].insts[inst_id]);
            }
        }
        */

        load_instances(function(err, instances) {
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
                    workflows[instance.workflow_id]._instances.push(instance);
                });

                for(var workflow_id in workflows) {
                    var workflow = workflows[workflow_id];
                    if(workflow._instances.length == 0) continue;
                    console.log(create_workflow_label(workflow));
                    
                    //organize workflow into archy-friendly format
                    workflow._instances.forEach(function(instance) {
                        //if(instance.workflow_id != workflow_id) return;
                        var inst_label = colors.gray("instance:")+instance._id;
                        inst_label += " "+colors.gray(config.home_url+workflow.url+"/#/"+instance._id+"/start");
                        var org_inst = {label: inst_label, nodes: []};
                        for(var service_id in instance._services) {
                            var org_service = {label: service_id/*+colors.gray(" service")*/, nodes: []};
                            instance._services[service_id].forEach(function(task) {
                                var status = task.status;
                                switch(status) {
                                    case "finished": status = colors.gray(status); break;
                                    case "running": status = colors.green(status); break;
                                    case "failed": status = colors.red(status); break
                                    case "stopped": status = colors.yellow(status); break
                                    default: status = colors.blue(status);
                                }
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

    function load_instances(cb) {
        //load user instances
        request.get({
            url: config.api.core+"/instance", 
            json: true, 
            headers: {'Authorization': 'Bearer '+jwt}
        }, function(err, res, instances) {
            if(err) return cb(err);
            if(res.statusCode != 200) return common.show_error(res, instances);
            cb(null, instances);
        });
    }

    function load_tasks(instance_id, cb) {
        request.get({
            url: config.api.core+"/task/query", 
            json: true,
            qs: {where: JSON.stringify({instance_id: instance_id})},
            headers: { 'Authorization': 'Bearer '+jwt }
        }, function(err, res, tasks) {
            if(err) return cb(err);
            if(res.statusCode != 200) return common.show_error(res, tasks);
            cb(null, tasks);
        });
    }
});


