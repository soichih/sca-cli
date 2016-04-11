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

common.load_jwt(function(err, jwt) {
    if(err) throw err;
    request.get({
        url: config.api.core+"/workflow", 
        json: true,
        headers: { 'Authorization': 'Bearer '+jwt }
    }, function(err, res, workflows) {
        if(err) throw err;
        if(res.statusCode != 200) return common.show_error(res, workflows);

        //find instances that we need to load tasks
        var insts = []; 
        for(var workflow_id in workflows) {
            for(var inst_id in workflows[workflow_id].insts) {
                //workflows[workflow_id].insts[inst_id]._workflow_id = workflow_id;//helps to organize things later
                insts.push(workflows[workflow_id].insts[inst_id]);
            }
        }

        //now load all tasks
        //console.log(JSON.stringify(workflows, null, 4));
        async.eachSeries(insts, function(inst, next) {
            load_tasks(inst._id, function(err, tasks) {
                if(err) next(err);

                //organize tasks under each services
                var w_inst = workflows[inst.workflow_id].insts[inst._id];
                w_inst._services = {};
                tasks.forEach(function(task) {
                    if(w_inst._services[task.service_id] === undefined) w_inst._services[task.service_id] = [];
                    w_inst._services[task.service_id].push(task);
                });
                /*
                tasks.forEach(function(task) {
                    var inst = data[task._workflow_id].nodes[task.instance_id];
                    var service = inst.nodes[inst.service_id];
                    if(inst.nodes[inst.service_id] == undefined) inst.nodes[inst.service_id] = [];
                    inst.nodes[inst.service_id].push({
                        label: task._id
                    });
                });
                */
                next();
            }); 
        }, function(err) {
            if(err) throw err;

            //just ugly json output
            //console.log(JSON.stringify(workflows, null, 4));
            
            for(var workflow_id in workflows) {
                var workflow = workflows[workflow_id];

                var workflow_label = "";
                if(workflow.package.sca) workflow_label += workflow.package.sca.label+" ";
                if(workflow.package.name) workflow_label += colors.cyan("("+workflow.package.name+") ");
                //if(workflow.package.description) workflow_label += colors.gray(workflow.package.description+" ");
                if(workflow.package.version) workflow_label += colors.gray(workflow.package.version);
                console.log(workflow_label);

                if(workflow.package.author) console.log(workflow.package.author);
                //organize workflow into archy-friendly format
                for(var inst_id in workflows[workflow_id].insts) {
                    var inst = workflows[workflow_id].insts[inst_id];
                    //var inst_label = "instance:"+inst.config.description;
                    //var inst_label = "instance:"+inst_id;
                    var inst_label = colors.gray("instance:")+inst_id;
                    inst_label += " "+colors.gray(config.home_url+workflow.url+"/#/"+inst_id+"/start");
                    var org_inst = {label: inst_label, nodes: []};
                    for(var service_id in workflows[workflow_id].insts[inst_id]._services) {
                        var org_service = {label: colors.gray("service:")+service_id, nodes: []};
                        workflows[workflow_id].insts[inst_id]._services[service_id].forEach(function(task) {
                            var status = task.status;
                            switch(status) {
                            case "finished": status = colors.green(status); break;
                            case "running": status = colors.blue(status); break;
                            case "failed": status = colors.read(status); break
                            case "failed": status = colors.read(status); break
                            }
                            org_service.nodes.push(colors.gray("task:")+task._id+" "+status);
                            //org_service.nodes.push(task);
                        });
                        org_inst.nodes.push(org_service);
                    }
                    console.log(archy(org_inst));
                }
                //console.log(JSON.stringify(org, null, 4));
            }
        });
        //console.log(JSON.stringify(body, null, 4));
    });

    function load_tasks(instance_id, cb) {
        request.get({
            url: config.api.core+"/task/query", 
            json: true,
            qs: {where: JSON.stringify({instance_id: instance_id})},
            headers: { 'Authorization': 'Bearer '+jwt }
        }, function(err, res, tasks) {
            if(err) throw err;
            if(res.statusCode != 200) return common.show_error(res, tasks);
            cb(null, tasks);
        });
    }

});


