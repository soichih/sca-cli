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
            console.log(JSON.stringify(workflows, null, 4));
            
            //organize workflow into archy-friendly format
            var org = [];
            for(var workflow_id in workflows) {
                var org_workflow = {label: workflow_id, nodes: []};
                for(var inst_id in workflows[workflow_id].insts) {
                    var org_inst = {label: "instance:"+inst_id, nodes: []};
                    for(var service_id in workflows[workflow_id].insts[inst_id]._services) {
                        var org_service = {label: "service:"+service_id, nodes: []};
                        workflows[workflow_id].insts[inst_id]._services[service_id].forEach(function(task) {
                            org_service.nodes.push("task:"+task._id+" status: "+task.status);
                            //org_service.nodes.push(task);
                        });
                        org_inst.nodes.push(org_service);
                    }
                    org_workflow.nodes.push(org_inst);
                }
                org.push(org_workflow);
            }
            //console.log(JSON.stringify(org, null, 4));
            console.log(archy({label: 'workflows', nodes: org}));
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


