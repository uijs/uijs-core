var exec = require('child_process').exec;
var child = exec('./bin/build.sh');
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
