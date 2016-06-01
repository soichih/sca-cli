
//core
var fs = require('fs');

//contrib
var jwt = require('jsonwebtoken');
var colors = require('colors/safe');
var request = require('request');
var plog = require('single-line-log').stdout;

//mine
var config = require('./config');

/*
String.prototype.pad= function (paddingValue) {
   return String(paddingValue + this).slice(-paddingValue.length);
};
*/

exports.pad = function(string, width, padding) { 
    //if(string === undefined) string = "";
    if(typeof string != String) string = new String(string);
    if(padding === undefined) padding = " ";
    while(string.length < width) {
        string = padding+string;
    }
    return string;
}

exports.show_error = function(res, body) {
    console.error(res.statusCode);
    console.log(JSON.stringify(body, null, 4));
}

exports.load_jwt = function(cb) {
    fs.stat(config.path.cli_jwt, function(err, stats) {
        if(err) return cb("Can't load SCA access token. Have you logged in?");
        fs.readFile(config.path.cli_jwt, {encoding: 'ascii'}, function(err, data) {
            if(err) return cb("Can't open SCA access token. Please check file permission for "+config.path.cli_jwt);
            var token = jwt.decode(data);
            //console.log(token.exp);
            //console.log(Date.now()/1000);
            if(token.exp < Date.now()/1000) {
                console.error("Your SCA token has expired. Please re-run $ sca login");
                process.exit(1);
            }
            cb(null, data);
        });
    });
};

exports.color_status = function(status) {
    switch(status.trim()) {
        case "finished": return colors.cyan(status);
        case "running": return colors.green(status);
        case "failed": return colors.red(status);
        case "stopped": return colors.yellow(status);
        case "requested": return colors.blue(status);
    }
    return colors.gray(status);
}

exports.color_workflow = function(workflow) {
    var label = "";
    if(workflow.name) label += colors.cyan(""+workflow.name+":");
    if(workflow.sca) label += workflow.sca.label+" ";
    if(workflow.version) label += colors.gray(workflow.version);
    return label;
}

exports.formatsize = function(bytes) {
    if      (bytes>=1000000000) {bytes=(bytes/1000000000).toFixed(2)+' GB';}
    else if (bytes>=1000000)    {bytes=(bytes/1000000).toFixed(2)+' MB';}
    else if (bytes>=1000)       {bytes=(bytes/1000).toFixed(2)+' KB';}
    else if (bytes>1)           {bytes=bytes+' bytes';}
    else if (bytes==1)          {bytes=bytes+' byte';}
    else                        {bytes='0 byte';}
    return bytes;
}

exports.wait_task = function(task, cb) {
    console.log("Please monitor progress at "+colors.cyan(config.progress_url+"#/detail/"+task.progress_key));
    //console.dir(task);
    function check_status() {
        //console.log(config.api.progress+"/status/"+task.progress_key);
        request.get({
            url: config.api.progress+"/status/"+task.progress_key,
            json: true,
        }, function(err, res, progress){
            if(err) throw err;
            //console.dir(progress); 
            if(progress.status) {
                var per = "";
                if(progress.progress) per = " "+colors.gray(progress.progress*100+"%");
                plog(exports.color_status(progress.status)+per+" "+progress.msg);
                if(progress.status == "failed") cb("thawing failed");
                if(progress.status == "finished") {
                    console.log(""); //newline
                    return cb();
                }
            }
            //all else.. reload
            setTimeout(check_status, 1000);
        });
    }
    check_status();
}
