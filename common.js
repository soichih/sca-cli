
//core
var fs = require('fs');

//contrib
var jwt = require('jsonwebtoken');
var colors = require('colors/safe');

//mine
var config = require('./config');

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
            if(token.exp > Date.now()) return cb("Your SCA acces token has expired. Please re-login.");
            cb(null, data);
        });
    });
};

exports.color_status = function(status) {
    switch(status) {
        case "finished": return colors.cyan(status);
        case "running": return colors.green(status);
        case "failed": return colors.red(status);
        case "stopped": return colors.yellow(status);
    }
    return colors.gray(status);
}
