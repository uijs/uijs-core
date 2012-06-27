var one = require('one');
var fs = require('fs');
var async = require('async');
var mkdirp = require('mkdirp');
var path = require('path');
var ncp = require('ncp').ncp;
var exec = require('child_process').exec;

module.exports = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (typeof options === 'string') {
    options = { package: options };
  }

  options = options || {};
  var package = options.package || path.join(process.cwd(), 'package.json');

  var appdir = path.dirname(package);
  var outdir = 'out'    in options ? options.out    : path.join(appdir, 'dist');
  var js     = 'js'     in options ? options.js     : 'a.js';
  var html   = 'html'   in options ? options.html   : 'index.html';
  var assets = 'assets' in options ? options.assets : path.join(appdir, 'assets');
  var verbose = 'verbose' in options ? options.verbose : false;
  var pre     = 'pre' in options ? options.pre : null;

  var buildopts = options.buildopts || {};
  buildopts.name = 'boo';

  var actions = {};

  function prebuild(cb) {
    if (pre) {
      var child = exec(pre, { cwd: appdir }, function(err) {
        if (err) return cb(err);
        else return cb();
      });
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
    }
    else {
      return cb();
    }
  }

  actions.mkdir = function(dist, manifest, cb) {
    console.log('creating', outdir);
    return mkdirp(outdir, function(err) {
      if (err) return cb(err);
      return cb();
    });
  };

  if (js) {
    actions.js = function(dist, manifest, cb) {
      return write(js, dist, cb);
    };
  }

  if (html) {
    actions.html = function(dist, manifest, cb) {
      return fs.readFile(path.join(__dirname, 'html-shim.html'), function(err, template) {
        if (err) return cb(err);
        var text = template.toString().replace('{{__APP__}}', dist);
        return write(html, text, cb);
      });
    };
  }

  if (assets) {
    actions.assets = function(dist, manifest, cb) {
      return ncp(assets, path.join(outdir, 'assets'), function(err) {
        if (err) return cb(err);
        console.log('done');
        return cb();
      });
    };
  }

  return prebuild(function(err) {
    if (err) return callback(err);

    // one.quite();
    if (!verbose) one.quiet();
    return one.build(package, buildopts, function(err, dist, pkg) {
      if (err) return callback(err);


      one.manifest(package, function(err, manifest) {
        if (err) return callback(err);

        // Export two more globals: `require` and `app`. It makes reusing client
        // side code easy because the package name doesn't need to be explicitly specified.
        dist += '\n';
        dist += 'window.require = ' + manifest.name + '.require;\n';
        dist += 'window.app = telobike.require(\'' + manifest.name + '\');\n';

        async.forEach(
          Object.keys(actions), 
          function(name, cb) { 
            console.log('build -- ' + name);
            return actions[name](dist, manifest, function(err) {
              if (err) {
                console.error('[' + name + ']', err);
                return cb(err);
              }
              return cb();
            });
          }, 
          function(err) {
            if (err) console.error(err);
            if (err) return callback(err);
            else return callback(null, dist, manifest);
          });
      });
    });
  });

  // -- helpers

  function write(filename, data, cb) {
    return fs.writeFile(path.join(outdir, filename), data, function(err) {
      if (err) return cb(err);
      console.log(path.join(outdir, filename) + ' created');
      return cb();
    });
  }  
};