
//core
var fs = require('fs');

//contrib
var jwt = require('jsonwebtoken');

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
            var token = jwt.decode(data);
            if(token.exp > Date.now()) return cb("Your SCA acces token has expired. Please re-login.");
            cb(null, data);
        });
    });
};
