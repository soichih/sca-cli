#!/usr/bin/env node
'use strict';

var program = require('commander');
var pkg = require('./package.json');
/*

program
  .version('0.0.1')
  .option('-p, --peppers', 'Add peppers')
  .option('-P, --pineapple', 'Add pineapple')
  .option('-b, --bbq-sauce', 'Add bbq sauce')
  .option('-c, --cheese [type]', 'Add the specified type of cheese [marble]', 'marble')
  .parse(process.argv);

console.log('you ordered a pizza with:');
if (program.peppers) console.log('  - peppers');
if (program.pineapple) console.log('  - pineapple');
if (program.bbqSauce) console.log('  - bbq');
console.log('  - %s cheese', program.cheese);
*/

/*
program
  .version(pkg.version)
  .command('rmdir <dir> [otherDirs...]')
  .action(function (dir, otherDirs) {
    console.log('rmdir %s', dir);
    if (otherDirs) {
      otherDirs.forEach(function (oDir) {
        console.log('rmdir %s', oDir);
      });
    }
  });

program.parse(process.argv);
*/

program
  .version(pkg.version)
  //.command('install [name]', 'install one or more packages')
  .command('login', 'Login to SCA and store access token')
  .command('resource', 'List / manipulate your SCA resources')
  .command('workflow', 'List SCA workflows')
  .command('instance', 'List / manipulate your SCA workflow instances')
  .command('task', 'List / manipuate your SCA tasks')
  .command('cp', 'Transfer data in/out of your SCA workflow instances')
  .command('backup', 'SCA showcase sda backup tool')
  //.command('list', 'list packages installed', {isDefault: true})

//TODO - handle a case user provide command not listed

program.parse(process.argv);

