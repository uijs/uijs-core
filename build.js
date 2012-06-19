var exec = require('child_process').exec;
var child = exec('./build.sh');
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
