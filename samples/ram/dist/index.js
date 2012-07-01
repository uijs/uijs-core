var carousel = (function(global, undefined){
  var DEBUG         = false,
      pkgdefs       = {},
      pkgmap        = {},
      global        = {},
      lib           = undefined,
      nativeRequire = typeof require != 'undefined' && require,
      ties, locals;
  lib = (function(exports){
  exports.path = (function(exports){ 
    // Copyright Joyent, Inc. and other Node contributors.
// Minimized fork of NodeJS' path module, based on its an early version.
exports.join = function () {
  return exports.normalize(Array.prototype.join.call(arguments, "/"));
};
exports.normalizeArray = function (parts, keepBlanks) {
  var directories = [], prev;
  for (var i = 0, l = parts.length - 1; i <= l; i++) {
    var directory = parts[i];
    // if it's blank, but it's not the first thing, and not the last thing, skip it.
    if (directory === "" && i !== 0 && i !== l && !keepBlanks) continue;
    // if it's a dot, and there was some previous dir already, then skip it.
    if (directory === "." && prev !== undefined) continue;
    if (
      directory === ".."
      && directories.length
      && prev !== ".."
      && prev !== "."
      && prev !== undefined
      && (prev !== "" || keepBlanks)
    ) {
      directories.pop();
      prev = directories.slice(-1)[0]
    } else {
      if (prev === ".") directories.pop();
      directories.push(directory);
      prev = directory;
    }
  }
  return directories;
};
exports.normalize = function (path, keepBlanks) {
  return exports.normalizeArray(path.split("/"), keepBlanks).join("/");
};
exports.dirname = function (path) {
  return path && path.substr(0, path.lastIndexOf("/")) || ".";
};
    return exports;
  })({});
  return exports;
})({});
  function findPkg(uri){
    return pkgmap[uri];
  }
  function findModule(workingModule, uri){
    var module = undefined,
        moduleId = lib.path.join(lib.path.dirname(workingModule.id), uri).replace(/\.js$/, ''),
        moduleIndexId = lib.path.join(moduleId, 'index'),
        pkg = workingModule.pkg;
    var i = pkg.modules.length,
        id;
    while(i-->0){
      id = pkg.modules[i].id;
      if(id==moduleId || id == moduleIndexId){
        module = pkg.modules[i];
        break;
      }
    }
    return module;
  }
  function genRequire(callingModule){
    return function require(uri){
      var module,
          pkg;
      if(/^\./.test(uri)){
        module = findModule(callingModule, uri);
      } else if ( ties && ties.hasOwnProperty( uri ) ) {
        return ties[ uri ];
      } else {
        pkg = findPkg(uri);
        if(!pkg && nativeRequire){
          try {
            pkg = nativeRequire(uri);
          } catch (nativeRequireError) {}
          if(pkg) return pkg;
        }
        if(!pkg){
          throw new Error('Cannot find module "'+uri+'" @[module: '+callingModule.id+' package: '+callingModule.pkg.name+']');
        }
        module = pkg.index;
      }
      if(!module){
        throw new Error('Cannot find module "'+uri+'" @[module: '+callingModule.id+' package: '+callingModule.pkg.name+']');
      }
      module.parent = callingModule;
      return module.call();
    };
  }
  function module(parentId, wrapper){
    var parent = pkgdefs[parentId],
        mod = wrapper(parent),
        cached = false;
    mod.exports = {};
    mod.require = genRequire(mod);
    mod.call = function(){
            if(cached) {
        return mod.exports;
      }
      cached = true;
      global.require = mod.require;
      mod.wrapper(mod, mod.exports, global, global.Buffer,global.process, global.require);
      return mod.exports;
    };
    if(parent.mainModuleId == mod.id){
      parent.index = mod;
      parent.parents.length == 0 && ( locals.main = mod.call );
    }
    parent.modules.push(mod);
  }
  function pkg(/* [ parentId ...], wrapper */){
    var wrapper = arguments[ arguments.length - 1 ],
        parents = Array.prototype.slice.call(arguments, 0, arguments.length - 1),
        ctx = wrapper(parents);
    if(pkgdefs.hasOwnProperty(ctx.id)){
      throw new Error('Package#'+ctx.id+' "' + ctx.name + '" has duplication of itself.');
    }
    pkgdefs[ctx.id] = ctx;
    pkgmap[ctx.name] = ctx;
    arguments.length == 1 && ( pkgmap['main'] = ctx );
  }
  function mainRequire(uri){
    return pkgmap.main.index.require(uri);
  }
  function stderr(){
    return lib.process.stderr.content;
  }
  function stdin(){
    return lib.process.stdin.content;
  }
  function stdout(){
    return lib.process.stdout.content;
  }
  return (locals = {
    'lib'        : lib,
    'findPkg'    : findPkg,
    'findModule' : findModule,
    'name'       : 'carousel',
    'module'     : module,
    'pkg'        : pkg,
    'packages'   : pkgmap,
    'stderr'     : stderr,
    'stdin'      : stdin,
    'stdout'     : stdout,
    'require'    : mainRequire
});
})(this);
carousel.pkg(function(parents){
  return {
    'id':1,
    'name':'carousel',
    'main':undefined,
    'mainModuleId':'lib/index',
    'modules':[],
    'parents':parents
  };
});
carousel.module(1, function(/* parent */){
  return {
    'id': 'lib/carousel',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var uijs = require('uijs');
var c = uijs.util.constant;
var defaults = uijs.util.defaults;
var min = uijs.util.min;
var max = uijs.util.max;
var accelaration = 3500;
var bounce_time = 5.0;
module.exports = function(options) {
  var obj = uijs.view(defaults(options, {
    images: c([]),
    fillStyle: c('black')
  }));
  var base = {
    ondraw: obj.ondraw
  };
  var sp = spring(0, 500);
  var touchstart = null;
  var x0 = 0;
  var last_x;
  var last_ts;
  var last_v;
  var v0 = 0;
  var end_time = 0;
  var a = 0;
  var direction = 0;
  var buff = document.createElement("canvas");
  buff.x = 0;
  buff.y = 0;
  buff.width = 1000;
  buff.height = 480;
  var last_draw_ts = Date.now();
  var last_draw_x = 0;
  obj.ondraw = function(context) {
    var self = this;
    var x = sp(x0);
    var ctx = buff.getContext('2d');
    var h = self.height();
    var w = self.width();
    var top = h / 2 - 25;
    var bottom = h / 2 + 25;
    ctx.fillRect(0, 0, self.width(), self.height());
    self.images().forEach(function(img) {
      var i = img();
      if (i.width === 0 || i.height === 0) return;
      var y = h / 2 - i.height / 2;
      ctx.drawImage(i, x, y);
      x += i.width;
    });
    context.drawImage(ctx.canvas, 0, 0);
  };
  obj.on('touchstart', function(coords) {
    history = [];
    touchstart = coords;
    touchstart.x -= x0;
    last_x = touchstart.x;
    last_ts = Date.now();
  });
  obj.on('touchmove', function(coords) {
    x0 = coords.x - touchstart.x;
    last_v = current_velocity(coords);
    last_x = coords.x;
    last_ts = Date.now();
  });
  function current_velocity(coords) {
    var delta_x = last_x - coords.x;
    var delta_ts = last_ts - Date.now();
    return delta_x / delta_ts * 1000;
  }
  obj.on('touchend', function(coords) {
    touchstart = null;
    v0 = last_v;
    direction = Math.abs(v0) / -v0;
    v0 = -1 * direction * min(3200, Math.abs(v0));
    a = direction * accelaration;
    end_time = Date.now();
    last_x = 0;
    last_v = 0;
    last_ts = 0;
  });
  function spring(base, stretch, options) {
    options = options || {};
    
    var friction = 'friction' in options ? options.friction : 0.7;
    var elasticity = 'elasticity' in options ? options.elasticity : 0.1;
    var curr = base + stretch;
    var spring_v = 0;
    var spring_a = 0;
    var spring_mode = false;
    return function() {
      // if (typeof new_curr !== 'undefined') curr = new_curr;
      if (spring_mode) {
        spring_a = elasticity * (base - curr);
        spring_v = spring_v * friction + spring_a;
        curr += spring_v;
        
        if (Math.abs(curr - base) < 0.1) {
          console.log('spring done');
          spring_mode = false;
          v0 = 0;
          a = 0;
          last_draw_x = curr;
        }
        return curr;
      }
      else {
        var dt = (Date.now() - last_draw_ts) / 1000.0;
        curr = last_draw_x + v0 * dt + 0.5 * a * dt * dt;
        v0 = (curr - last_draw_x) / dt;
        if (-1 * direction * v0 < 0) {
          v0 = 0;
          a = 0;
        }
        last_draw_ts = Date.now();
        last_draw_x = curr;
        if (curr > stretch) {
          spring_mode = true;
        }
        return curr;
      }
    };
  }
  obj.on('mousedown', function(e) { obj.emit('touchstart', e); });
  obj.on('mousemove', function(e) { obj.emit('touchmove', e); });
  obj.on('mouseup', function(e) { obj.emit('touchend', e); });
  return obj;
}
    }
  };
});
carousel.module(1, function(/* parent */){
  return {
    'id': 'lib/data',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      module.exports = [
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
  'https://graph.facebook.com/577529546/picture?type=square', 
  'https://graph.facebook.com/581266131/picture?type=square',
  'https://graph.facebook.com/298400036/picture?type=square',
  'https://graph.facebook.com/522034861/picture?type=square', 
  'https://graph.facebook.com/522239234/picture?type=square', 
  'https://graph.facebook.com/522769386/picture?type=square', 
  'https://graph.facebook.com/540044215/picture?type=square', 
  'https://graph.facebook.com/555329200/picture?type=square', 
  'https://graph.facebook.com/560091387/picture?type=square', 
  'https://graph.facebook.com/563367011/picture?type=square', 
  'https://graph.facebook.com/563538726/picture?type=square', 
];
    }
  };
});
carousel.module(1, function(/* parent */){
  return {
    'id': 'lib/index',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var uijs = require('uijs');
var c = uijs.util.constant;
var loadimage = uijs.util.loadimage;
var carousel = require('./carousel');
var images = require('./data');
var app = uijs.app({
  layout: uijs.layouts.none(),
  width: function() { return this.parent.width() },
  height: function() { return this.parent.height() },
});
var car = carousel({
  width: app.width,
  height: app.height,
  x: c(0),
  y: c(0),
  images: c(images.map(function(url) {
    return loadimage(url)
  }))
});
app.add(car);
// var sim = uijs.view({
//   width: app.width,
//   height: app.height,
// });
// var t = Date.now();
// var v = 100;
// var x0 = 500;
// var sp = spring(0, 0.8, 0.1);
// sim.ondraw = function(ctx) {
//   var self = this;
//   ctx.fillRect(0,0,self.width(),self.height());
//   var x = sp();
//   ctx.fillStyle = 'white';
//   ctx.fillRect(x,50,10,10);
// };
// app.add(sim);
module.exports = app;
    }
  };
});
carousel.pkg(1, function(parents){
  return {
    'id':2,
    'name':'uijs',
    'main':undefined,
    'mainModuleId':'lib/index',
    'modules':[],
    'parents':parents
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/animation',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      // -- animation
var constant = require('./util').constant;
var curves = exports.curves = {};
curves.linear = function() {
  return function(x) {
    return x;
  };
};
curves.easeInEaseOut = function() {
  return function(x) {
    return (1 - Math.sin(Math.PI / 2 + x * Math.PI)) / 2;
  };
};
module.exports = function(from, to, options) {
  options = options || {};
  options.duration = options.duration || constant(250);
  options.callback = options.callback || function() { };
  options.curve = options.curve || curves.easeInEaseOut();
  options.name = options.name || from.toString() + '_to_' + to.toString();
  var startTime = Date.now();
  var endTime = Date.now() + options.duration();
  var callbackCalled = false;
  // console.time(options.name);
  return function () {
    var elapsedTime = Date.now() - startTime;
    var ratio = elapsedTime / options.duration();
    if (ratio < 1.0) {
      curr = from + (to - from) * options.curve(ratio);
    }
    else {
      // console.timeEnd(options.name);
      curr = to;
      if (options.callback && !callbackCalled) {
        options.callback.call(this);
        callbackCalled = true;
      }
    }
    return curr;
  };
};
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/app',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
var defaults = require('./util').defaults;
var constant = require('./util').constant;
module.exports = function(options) {
  return view(defaults(options, {
    dockStyle: constant('fill'),
  }));
}
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/button',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
var layouts = require('./layouts');
var image = require('./image');
var constant = require('./util').constant;
var derive = require('./util').derive;
var valueof = require('./util').valueof;
var defaults = require('./util').defaults;
module.exports = function(options) {
  options = defaults(options, {
    radius: constant(10),
    layouts: layouts.dock(),
    font: constant('xx-large Helvetica'),
    text: constant('button'),
    width: constant(400),
    height: constant(80),
    fillStyle: constant('#aaaaaa'),
    strokeStyle: constant('black'),
    lineWidth: constant(3),
    textFillStyle: constant('black'),
    shadowColor: constant('rgba(0,0,0,0.5)'),
    shadowBlur: constant(15),
    shadowOffsetX: constant(5),
    shadowOffsetY: constant(5),
    shadowColor: constant('rgba(0,0,0,0.5)'),
    shadowBlur: constant(5),
  });
  // highlighted state
  options.highlighted = defaults(options.highlighted, {
    fillStyle: constant('#666666'),
    shadowOffsetX: constant(0),
    shadowOffsetY: constant(0),
    x: function() { return this.base.x() + 5; },
    y: function() { return this.base.y() + 5; },
  });
  var self = view(options);
  self.on('touchstart', function(c) { self.override = derive(self.highlighted); });
  self.on('touchend',   function(c) { self.override = null; });
  self.on('mousedown',  function(c) { self.emit('touchstart', c); });
  self.on('mouseup',    function(c) { self.emit('touchend', c); });
  self.on('touchend', function(c) {
    if (c.x < 0 || c.x > self.width()) return;
    if (c.y < 0 || c.y > self.height()) return;
    return self.queue('click', c);
  });
  return self;
};
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/canvasize',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
var constant = require('./util').constant;
var layouts = require('./layouts');
var INTERACTION_EVENTS = [
  'touchstart',
  'touchmove',
  'touchend',
  'mousedown',
  'mousemove',
  'mouseup',
];
module.exports = function(options) {
  options = options || {};
  window.requestAnimationFrame || (
    window.requestAnimationFrame = 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame    || 
    window.oRequestAnimationFrame      || 
    window.msRequestAnimationFrame     || 
    function(cb) { setTimeout(cb, 1000/60); }
  );
  window.devicePixelRatio || (window.devicePixelRatio = 1);
  console.log('devicePixelRatio is', window.devicePixelRatio);
  var canvas = null;
  if (options.element) {
    canvas = options.element;
    canvas.width = canvas.width || parseInt(canvas.style.width) * window.devicePixelRatio;
    canvas.height = canvas.height || parseInt(canvas.style.height) * window.devicePixelRatio;
  }
  else {
    if (document.body.hasChildNodes()) {
      while (document.body.childNodes.length) {
        document.body.removeChild(document.body.firstChild);
      }
    }
    document.body.style.background = 'white';
    document.body.style.padding = '0px';
    document.body.style.margin = '0px';
    canvas = document.createElement('canvas');
    canvas.style.background = 'green';
    document.body.appendChild(canvas);
    window.onresize = function() {
      // http://joubert.posterous.com/crisp-html-5-canvas-text-on-mobile-phones-and
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = window.innerWidth;
      canvas.style.height = window.innerHeight;
      var c = canvas.getContext('2d');
      c.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    document.body.onorientationchange = window.onresize;
    setTimeout(function() { 
      window.scrollTo(0, 0);
      window.onresize();
    }, 0);
    window.onresize();
  }
  var ctx = canvas.getContext('2d');
  options = options || {};
  options.id = options.id || constant('canvas');
  options.x = options.x || constant(0);
  options.y = options.y || constant(0);
  options.width = options.width || function() { return canvas.width / window.devicePixelRatio; };
  options.height = options.height || function() { return canvas.height / window.devicePixelRatio; };
  options.layout = options.layout || layouts.none();
  var main = view(options);
  // get the coordinates for a mouse or touch event
  // http://www.nogginbox.co.uk/blog/canvas-and-multi-touch
  function getCoords(e) {
    if (e.touches && e.touches.length > 0) {
      e = e.touches[0];
      return { x: e.pageX - canvas.offsetLeft, y: e.pageY - canvas.offsetTop };
    }
    else if (e.offsetX) {
      // works in chrome / safari (except on ipad/iphone)
      return { x: e.offsetX, y: e.offsetY };
    }
    else if (e.layerX) {
      // works in Firefox
      return { x: e.layerX, y: e.layerY };
    }
    else if (e.pageX) {
      // works in safari on ipad/iphone
      return { x: e.pageX - canvas.offsetLeft, y: e.pageY - canvas.offsetTop };
    }
  }
  // add mouse/touch interaction events
  INTERACTION_EVENTS.forEach(function(name) {
    canvas['on' + name] = function(e) {
      e.preventDefault();
      var coords = (name !== 'touchend') ? getCoords(e) : getCoords(e.changedTouches[0]);
      // coords.x *= window.devicePixelRatio;
      // coords.y *= window.devicePixelRatio;
      if (coords) main.log('on' + name, coords.x + ',' + coords.y);
      else main.log('error - no coords for ' + name);
      
      main.interact(name, coords, e);
    };
  });
  function redraw() {
    //TODO: since the canvas fills the screen we don't really need this?
    if (main.alpha && main.alpha() < 1.0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    main.draw(ctx);
    window.requestAnimationFrame(redraw);
  }
  redraw();
  main.INTERACTION_EVENTS = INTERACTION_EVENTS;
  return main;
};
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/image',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
var defaults = require('./util').defaults;
var constant = require('./util').constant;
module.exports = function(options) {
  var obj = view(defaults(options, {
    stretch: constant(false),
  }));
  var base = {
    width: self.width,
    height: self.height,
  };
  // console.log('!!!');
  // obj.width = function() {
  //   var self = this;
  //   if (self.image && !self.stretch()) {
  //     return self.image.width;
  //   }
  //   else return base.width.call(self);
  // };
  // obj.height = function() {
  //   var self = this;
  //   if (self.image & !self.stretch()) {
  //     return self.image.height;
  //   }
  //   else return base.height.call(self);
  // };
  return obj;
};
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/index',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      exports.canvasize = require('./canvasize');
exports.animation = require('./animation');
exports.util = require('./util');
exports.image = require('./image');
exports.label = require('./label');
exports.layouts = require('./layouts');
exports.rectangle = require('./rectangle');
exports.view = require('./view');
exports.button = require('./button');
exports.app = require('./app');
exports.terminal = require('./terminal');
exports.rterm = require('./rterm');
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/label',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
module.exports = function(options) {
  return view(options);
};
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/layouts',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var constant = require('./util').constant;
var max = require('./util').max;
var defaults = require('./util').defaults;
exports.stack = function(options) {
  options = options || {};
  options.padding = options.padding || constant(0);
  options.spacing = options.spacing || constant(0);
  options.stretch = options.stretch || constant(false);
  return function() {
    var parent = this;
    parent.on('after-add-child', function(child) {
      child.x = options.padding;
      if (options.stretch()) {
        child.width = function() {
          return parent.width() - options.padding() * 2 - child.shadowOffsetX();
        };
      }
      var prev = child.prev();
      if (!prev) {
        child.y = options.padding;
      }
      else {
        child.y = function() { 
          return prev.y() + prev.height() + options.spacing() + child.shadowOffsetY();
        };
      }
      // center
      child.x = function() {
        return parent.width() / 2 - this.width() / 2;
      };
    });
  };
};
exports.dock = function(options) {
  options = options || {};
  options.spacing = options.spacing || constant(0);
  options.padding = options.padding || constant(0);
  return function() {
    var parent = this;
    parent.dock = function(child, type) {
      var parent = this;
      var base = { 
        x: child.x, 
        y: child.y,
        width: child.width,
        height: child.height,
      };
      var adjust = 
      {
        left:   { width: false, height: true,  x: true,  y: false },
        right:  { width: false, height: true,  x: true,  y: false },
        top:    { width: true,  height: false, x: false, y: true  },
        bottom: { width: true,  height: false, x: false, y: true  },
        fill:   { width: true,  height: true,  x: false, y: false },
      }[type];
      if (adjust.x) {
        child.x = function() {
          var region = parent.unoccupied(child);
          return region.x + (type === 'right' ? region.width - child.width() - child.shadowOffsetX() : 0)
        };
      }
      if (adjust.y) {
        child.y = function() { 
          var region = parent.unoccupied(child);
          return region.y + (type === 'bottom' ? region.height - child.height() - child.shadowOffsetY() : 0);
        };
      }
      if (adjust.width) {
        child.x = function() {
          if (!child.dockOptions.center()) return base.x.call(child);
          var region = parent.unoccupied(child);
          return region.x + region.width / 2 - (child.width() + child.shadowOffsetX()) / 2; 
        };
        child.width = function() { 
          if (!child.dockOptions.stretch()) return base.width.call(child);
          var region = parent.unoccupied(child);
          return region.width - child.shadowOffsetX();
        };
      }
      if (adjust.height) {
        child.y = function() {
          if (!child.dockOptions.center()) return base.y.call(child);
          var region = parent.unoccupied(child);
          return region.y + region.height / 2 - (child.height() + child.shadowOffsetY()) / 2;
        };
        child.height = function() { 
          if (!child.dockOptions.stretch()) return base.height.call(child);
          var region = parent.unoccupied(child);
          return region.height - child.shadowOffsetY();
        };
      }
    };
    // returns the unoccupied region after distributing
    // frames for all children (up to `upto` child, if specified).
    parent.unoccupied = function(upto) {
      // start with the entire parent region
      var curr = {
        x: options.padding(),
        y: options.padding(),
        width: parent.width() - options.padding() * 2,
        height: parent.height() - options.padding() * 2,
      };
      for (var id in parent._children) {
        
        // break until we reach `upto`
        if (upto && upto._id == id) {
          break;
        }
        var child = parent._children[id];
        if (!child.visible()) continue;
        
        var dockStyle = (child.dockStyle && child.dockStyle()) || 'top';
        switch (dockStyle) {
          case 'top':
            curr.y += child.height() + options.spacing() + child.shadowOffsetY();
            curr.height -= child.height() + child.shadowOffsetY() + options.spacing();
            break;
          case 'bottom':
            curr.height -= child.height() + child.shadowOffsetY() + options.spacing();
            break;
          case 'left':
            curr.x += child.width() + options.spacing() + child.shadowOffsetX();
            curr.width -= child.width() + child.shadowOffsetX() + options.spacing();
            break;
          case 'right':
            curr.width -= child.width() + child.shadowOffsetX() + options.spacing();
            break;
          case 'fill':
            curr.width -= child.width() + child.shadowOffsetX();
            curr.height -= child.height() + child.shadowOffsetY();
            break;
        }
        if (curr.width < 0) curr.width = 0;
        if (curr.height < 0) curr.height = 0;
        if (curr.width === 0 || curr.height === 0) break;
      }
      return curr;
    };
    this.on('before-add-child', function(child) {
      var dockStyle = (child.dockStyle && child.dockStyle()) || 'top';
      child.dockOptions = defaults(child.dockOptions, {
        center: constant(true),
        stretch: constant(true),
      });
      parent.dock(child, dockStyle);
    });
  };
};
exports.none = function() {
  return function() { };
};
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/rectangle',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
module.exports = function(options) {
  return view(options);
}
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/rterm',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
var constant = require('./util').constant;
var defaults = require('./util').defaults;
module.exports = function(socket, options) {
  if (!socket) throw new Error('`socket` is required');
  var obj = view(defaults(options, {
    id: constant('#terminal'),
    visible: constant(false),
  }));
  obj.writeLine = function() {
    var args = [];
    
    for (var i = 0; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }
    var line = {
      time: Date.now(),
      data: args.join(' '),
    };
    socket.emit('log', line);
    return line;
  };
  return obj;
};
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/terminal',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
var constant = require('./util').constant;
var max = require('./util').max;
module.exports = function(options) {
  options = options || {};
  options.bufferSize = options.bufferSize || constant(100);
  options.id = options.id || constant('#terminal'); // for `view.log(...)`
  options.lineHeight = options.lineHeight || constant(12);
  var self = view(options);
  self.fillStyle = constant('black');
  var lines = [];
  self.writeLine = function(s) {
    var line = {
      data: s,
      time: Date.now()
    };
    lines.push(line);
    var bufferSize = self.bufferSize && self.bufferSize();
    if (bufferSize) {
      while (lines.length > bufferSize) {
        lines.shift();
      }
    }
    return line;
  };
  var _ondraw = self.ondraw;
  self.ondraw = function(ctx) {
    _ondraw.call(self, ctx);
    ctx.save();
    var lineHeight = self.lineHeight();
    ctx.font = lineHeight + 'px Courier';
    ctx.textAlign = 'left';
    // calculate how many lines can fit into the terminal
    var maxLines = self.height() / lineHeight;
    var first = max(0, Math.round(lines.length - maxLines) + 1);
    var y = 0;
    for (var i = first; i < lines.length; ++i) {
      var line = lines[i].data;
      var now = '[' + new Date(lines[i].time).toISOString().replace(/.*T/, '') + '] ';
      ctx.fillStyle = 'gray';
      ctx.fillText(now, 0, y);
      ctx.fillStyle = 'white';
      ctx.fillText(line, ctx.measureText(now).width, y);
      y += lineHeight;
    }
    ctx.restore();
  };
  return self;
}
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/util',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      exports.constant = function(x) { return function() { return x; }; };
exports.centerx = function(target, delta) { return function() { return target.width() / 2 - this.width() / 2 + (delta || 0); }; };
exports.centery = function(target, delta) { return function() { return target.height() / 2 - this.height() / 2 + (delta || 0); }; };
exports.top = function(target, delta) { return function() { return (delta || 0); }; };
exports.left = function(target, delta) { return function() { return (delta || 0); }; };
exports.right = function(target, delta) { return function() { return target.width() + (delta || 0); }; };
exports.bottom = function(target, delta) { return function() { return target.height() + (delta || 0); }; };
exports.min = function(a, b) { return a < b ? a : b; };
exports.max = function(a, b) { return a > b ? a : b; };
// returns a function that creates a new object linked to `this` (`Object.create(this)`).
// any property specified in `options` (if specified) is assigned to the child object.
exports.derive = function(options) {
  return function() {
    var obj = Object.create(this);
    obj.base = this;
    if (options) {
      for (var k in options) {
        obj[k] = options[k];
      }
    }
    return obj;
  };  
};
// returns the value of `obj.property` if it is defined (could be `null` too)
// if not, returns `def` (or false). useful for example in tri-state attributes where `null` 
// is used to disregard it in the drawing process (e.g. `fillStyle`).
exports.valueof = function(obj, property, def) {
  if (!obj) throw new Error('`obj` is required');
  if (!def) def = false;
  if (!(property in obj)) return def;
  else return obj[property];
};
exports.defaults = function(target, source) {
  var valueof = exports.valueof;
  target = target || {};
  for (var k in source) {
    target[k] = valueof(target, k, source[k]);
  }
  return target;
};
exports.loadimage = function(src) {
  if (typeof src === 'function') src = src();
  
  var img = new Image();
  img.src = src;
  img.onload = function() { };
  return function() {
    return img;
  }
};
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/view',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var layouts = require('./layouts');
var constant = require('./util').constant;
var valueof = require('./util').valueof;
module.exports = function(options) {
  var view       = options       || {};
  view.x         = view.x        || function() { return 0; };
  view.y         = view.y        || function() { return 0; };
  view.width     = view.width    || function() { return 100; };
  view.height    = view.height   || function() { return 50; };
  view.rotation  = view.rotation || function() { return 0; };
  view.visible   = view.visible  || function() { return true; };
  view.clip      = view.clip     || function() { return true; };
  view.layout    = view.layout   || layouts.stack();
  view.alpha     = view.alpha    || null;
  view.override  = view.override || null;
  view.id        = view.id       || function() { return this._id; };
  view.terminal  = view.terminal || function() { return this.query('#terminal'); };
  
  view.shadowOffsetX = valueof(view, 'shadowOffsetX') || function() { return 0; };
  view.shadowOffsetY = valueof(view, 'shadowOffsetY') || function() { return 0; };
  view.shadowBlur    = valueof(view, 'shadowBlur') || function() { return 0; };
  view.shadowColor   = valueof(view, 'shadowColor') || function() { return 'black'; };
  view.font              = valueof(view, 'font')           || function() { return '16pt Helvetica'; };
  view.textShadowBlur    = valueof(view, 'textShadowBlur') || function() { return 0; };
  view.textShadowColor   = valueof(view, 'textShadowColor') || function() { return 'black' };
  view.textShadowOffsetX = valueof(view, 'textShadowOffsetX') || function() { return 0; };
  view.textShadowOffsetY = valueof(view, 'textShadowOffsetY') || function() { return 0; };
  // rect
  view.radius    = view.radius || constant(0);
  // image
  view.image                = view.image    || null;
  view.imageStretchWidth    = valueof(view, 'imageStretchWidth')  || constant(false);
  view.imageStretchHeight   = valueof(view, 'imageStretchHeight') || constant(false);
  view.imageHorizontalAlign = view.imageHorizontalAlign           || constant('center');
  view.imageVerticalAlign   = view.imageVerticalAlign             || constant('middle');
  
  // text
  view.text              = view.text || null;
  view.textBaseline      = view.textBaseline || constant('top');
  view.textAlign         = view.textAlign || constant('center');
  view.textVerticalAlign = view.textVerticalAlign || constant('middle');
  view._id       = '<unattached>';
  view._is_view  = true;
  view._children = {};
  view._nextid   = 0;
  if (!('textFillStyle' in view) && !('textStrokeStyle' in view)) {
    view.textFillStyle = constant('black');
  }
  // -- log
  // logs to the terminal associated with this view
  view.log = function() {
    var self = this;
    var term = self.terminal();
    if (!term) return;
    var args = [];
    var id = (self.id && self.id()) || self._id;
    args.push('[' + id + ']');
    for (var i = 0; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }
    term.writeLine(args.join(' '));
  };
  // -- event emitter
  var _subscriptions = {};
  view.emit = function(event) {
    var self = this;
    var handlers = _subscriptions[event];
    var handled;
    if (handlers) {
      var args = [];
      for (var i = 1; i < arguments.length; ++i) {
        args.push(arguments[i]);
      }
      handlers.forEach(function(fn) {
        var ret = fn.apply(self, args);
        if (typeof ret === 'undefined' || ret === true) handled = true;
        if (ret === false) handled = false;
      });
    }
    return handled;
  };
  // emits the event (with arguments) after 100ms
  // should be used to allow ui to update when emitting
  // events from event handlers.
  view.queue = function(event) {
    var self = this;
    var args = arguments;
    console.log('emitting later', event);
    setTimeout(function() {
      self.emit.apply(self, args);
    }, 50);
  };
  view.on = function(event, handler) {
    var self = this;
    if (!_subscriptions) return;
    var handlers = _subscriptions[event];
    if (!handlers) handlers = _subscriptions[event] = [];
    handlers.push(handler);
  };  
  // call layout initialization function on the child
  if (view.layout) {
    view.layout();
  }
  // -- children/parents
  // returns the root of the view hierarchy
  view.root = function() {
    var self = this;
    if (!self.parent) return self;
    return self.parent.root();
  };
  // adds a child to the end of the children's stack.
  view.add = function(child) {
    var self = this;
    if (Array.isArray(child)) {
      return child.forEach(function(c) {
        self.add(c);
      });
    }
    if (!child._is_view) throw new Error('can only add views as children to a view');
    var previd = self._nextid;
    child._id = self._nextid++;
    child.parent = self;
    child.bringToTop = function() {
      self.remove(child);
      self.add(child);
    };
    child.remove = function() {
      self.remove(child);
    };
    child.prev = function() {
      var prev = null;
      
      for (var id in self._children) {
        if (id == child._id) {
          return self._children[prev];
        }
        prev = id;
      }
      return null;
    };
    var allow = true;
    var child_ret = child.emit('before-add-child', self);
    if (typeof child_ret === 'undefined') allow = true;
    else allow = !!child_ret;
    if (allow) {
      var ret = self.emit('before-add-child', child);
      if (typeof ret === 'undefined') allow = true;
      else allow = !!ret;
    }
    if (allow) {
      self._children[child._id] = child;
      self.emit('after-add-child', child);
      child.emit('after-child-added', self);
    }
  };
  // removes a child
  view.remove = function(child) {
    var self = this;
    delete self._children[child._id];
    child.parent = null;
    return child;
  };
  // removes all children
  view.empty = function() {
    var self = this;
    for (var k in self._children) {
      self.remove(self._children[k]);
    }
  };
  // retrieve a child by it's `id()` property. children without
  // this property cannot be retrieved using this function.
  view.get = function(id) {
    var self = this;
    for (var k in self._children) {
      var child = self._children[k];
      if (child.id && child.id() === id) {
        return child;
      }
    }
    return null;
  };
  // retrieve a child from the entire view tree by id.
  view.query = function(id) {
    var self = this;
    var child = self.get(id);
    if (!child) {
      for (var k in self._children) {
        var found = self._children[k].query(id);
        if (found) {
          child = found;
          break;
        }
      }
    }
    return child;
  };
  // -- drawing
  // default draw for view is basically to draw a rectangle
  view.ondraw = function(ctx) {
    var self = this;
    var radius = (self.radius && self.radius()) || 0;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(self.width() - radius, 0);
    if (radius) ctx.quadraticCurveTo(self.width(), 0, self.width(), radius);
    ctx.lineTo(self.width(), self.height() - radius);
    if (radius) ctx.quadraticCurveTo(self.width(), self.height(), self.width() - radius, self.height());
    ctx.lineTo(radius, self.height());
    if (radius) ctx.quadraticCurveTo(0, self.height(), 0, self.height() - radius);
    ctx.lineTo(0, radius);
    if (radius) ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    
    self.drawFill(ctx);
    self.drawImage(ctx);
    self.drawBorder(ctx);
    self.drawText(ctx);
  };
  view.drawFill = function(ctx) {
    var self = this;
    if (!self.fillStyle) return;
    ctx.fill();
  };
  view.drawBorder = function(ctx) {
    var self = this;
    if (!self.strokeStyle) return;
    // we don't want shadow on the border
    ctx.save();
    ctx.shadowOffsetY = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  };
  view.drawImage = function(ctx) {
    var self = this;
    if (!self.image) return;
    var img = self.image();
    if (!img) return;
    if (img.width === 0 || img.height === 0) return;
    var strw = self.imageStretchWidth();
    var strh = self.imageStretchHeight();
    var x, y, w, h;
    if (strw) {
      x = 0;
      w = self.width();  
    }
    else {
      w = img.width;
      switch (self.imageHorizontalAlign()) {
        case 'left':
          x = 0;
          break;
        case 'right':
          x = self.width() - w;
          break;
        case 'center':
        default:
          x = self.width() / 2 - w / 2;
          break;
      }
    }
    if (strh) {
      y = 0;
      h = self.height();
    }
    else {
      h = img.height;
      switch (self.imageVerticalAlign()) {
        case 'top':
          y = 0;
          break;
        case 'bottom':
          y = self.height() - h;
          break;
        case 'middle':
        default:
          y = self.height () / 2 - h / 2;
          break;
      }
    }
    ctx.drawImage(img, x, y, w, h);
  }
  view.drawText = function(ctx) {
    var self = this;
    if (!self.text || !self.text() || self.text().length === 0) return;
    if (!self.textFillStyle && !self.textStrokeStyle) return;
    var text = self.text();
    var width = self.width();
    var height = self.height();
    var top = 0;
    var left = 0;
    // http://stackoverflow.com/questions/1134586/how-can-you-find-the-height-of-text-on-an-html-canvas
    var textHeight = ctx.measureText('ee').width;
    switch (ctx.textAlign) {
      case 'start':
      case 'left': left = 0; break;
      case 'end':
      case 'right': left = width; break;
      case 'center': left = width / 2; break;
    }
    switch (self.textVerticalAlign()) {
      case 'top': top = 0; break;
      case 'middle': top = height / 2 - textHeight / 2; break;
      case 'bottom': top = height - textHeight; break;
    }
    ctx.save();
    if (self.textShadowBlur) ctx.shadowBlur = self.textShadowBlur();
    if (self.textShadowColor) ctx.shadowColor = self.textShadowColor();
    if (self.textShadowOffsetX) ctx.shadowOffsetX = self.textShadowOffsetX();
    if (self.textShadowOffsetY) ctx.shadowOffsetY = self.textShadowOffsetY();
    if (self.textFillStyle) {
      var s = self.textFillStyle();
      if (s && s !== '') {
        ctx.fillStyle = self.textFillStyle();
        ctx.fillText(text, left, top, width);
      }
    }
    if (self.textStrokeStyle) {
      var s = self.textStrokeStyle();
      if (s && s !== '') {
        ctx.strokeStyle = s;
        ctx.strokeText(text, left, top, width);
      }
    }
    ctx.restore();
  };
  view._self = function() {
    var override = this.override && this.override();
    if (override) return override;
    else return this;
  };
  view.draw = function(ctx) {
    var self = this._self();
    ctx.save();
    if (self.rotation && self.rotation()) {
      var centerX = self.x() + self.width() / 2;
      var centerY = self.y() + self.height() / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(self.rotation());
      ctx.translate(-centerX, -centerY);
    }
    // TODO: add alpha check as well (do not view if transparent)
    if (self.visible()) {
      // stuff that applies to all children
      ctx.translate(self.x(), self.y());
      if (self.alpha) ctx.globalAlpha = self.alpha();
      ctx.save();
      // stuff that applies only to this child
      if (self.fillStyle) ctx.fillStyle = self.fillStyle();
      if (self.shadowBlur) ctx.shadowBlur = self.shadowBlur();
      if (self.shadowColor) ctx.shadowColor = self.shadowColor();
      if (self.shadowOffsetX) ctx.shadowOffsetX = self.shadowOffsetX();
      if (self.shadowOffsetY) ctx.shadowOffsetY = self.shadowOffsetY();
      if (self.lineCap) ctx.lineCap = self.lineCap();
      if (self.lineJoin) ctx.lineJoin = self.lineJoin();
      if (self.lineWidth) ctx.lineWidth = self.lineWidth();
      if (self.strokeStyle) ctx.strokeStyle = self.strokeStyle();
      if (self.font) ctx.font = self.font();
      if (self.textAlign) ctx.textAlign = self.textAlign();
      if (self.textBaseline) ctx.textBaseline = self.textBaseline();
      if (self.ondraw) {
        // TODO: do not draw if out of viewport
        if (self.width() > 0 && self.height() > 0) {
          self.ondraw(ctx);
        }
      }
      ctx.restore();
      if (self.clip()) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(self.width(), 0);
        ctx.lineTo(self.width(), self.height());
        ctx.lineTo(0, self.height());
        ctx.closePath();
        ctx.clip();
      }
      Object.keys(self._children).forEach(function(key) {
        var child = self._children[key];
        child.draw.call(child, ctx);
      });
      ctx.restore();
    }
  };
  // returns the first child
  view.first = function() {
    var self = this;
    var keys = self._children && Object.keys(self._children);
    if (!keys || keys.length === 0) return null;
    return self._children[keys[0]];
  };
  // if `children` is defined in construction, add them and
  // replace with a property so we can treat children as an array
  if (view.children) {
    view.add(view.children);
    delete view.children;
  }
  // -- interactivity
  // returns {x,y} in child coordinates
  view.hittest = function(child, pt) {
    var self = this;
    if (pt.x >= child.x() &&
        pt.y >= child.y() &&
        pt.x <= child.x() + child.width() &&
        pt.y <= child.y() + child.height()) {
      
      // convert to child coords
      var child_x = pt.x - child.x();
      var child_y = pt.y - child.y();
      return { x: child_x, y: child_y };
    }
    return null;
  };
  var current_handler = null;
  view._propagate = function(event, pt, e) {
    var self = this;
    var handler = null;
    for (var id in self._children) {
      var child = self._children[id];
      var child_pt = self.hittest(child, pt);
      if (child_pt) {
        var child_handler = child.interact(event, child_pt, e);
        if (child_handler) handler = child_handler;
      }
    }
    if (!handler) {
      if (self.emit(event, pt, e)) {
        handler = self;
      }
    }
    if (handler) self.log(event, 'handled by', handler.id());
    return handler;
  }
  // called with a mouse/touch event and relative coords
  // and propogates to child views. if child view did not handle
  // the event, the event is emitted to the parent (dfs).
  view.interact = function(event, pt, e) {
    var self = this;
    if (event === 'touchstart' || event === 'mousedown') {
      current_handler = null;
      var handler = self._propagate(event, pt, e);
      if (handler) current_handler = handler;
      return current_handler;
    }
    // check if we already have an ongoing touch
    if (current_handler) {
      // convert pt to current handler coordinates.
      var current_handler_screen = current_handler.screen();
      var this_screen = self.screen();
      var delta = {
        x: current_handler_screen.x - this_screen.x,
        y: current_handler_screen.y - this_screen.y,
      };
      pt.x = pt.x || 0;
      pt.y = pt.y || 0;
      pt = {
        x: pt.x - delta.x,
        y: pt.y - delta.y,
      };
      var handled = current_handler.emit(event, pt, e);
      if (event === 'touchend' || event === 'mouseup') current_handler = null;
      return handled ? self : null;
    }
    return null;
  };
  // returns the screen coordinates of this view
  view.screen = function() {
    var self = this;
    var pscreen = self.parent ? self.parent.screen() : { x: 0, y: 0 };
    return {
      x: pscreen.x + self.x(),
      y: pscreen.y + self.y()
    };
  };
  return view;
};
    }
  };
});
carousel.module(2, function(/* parent */){
  return {
    'id': 'lib/index',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      exports.canvasize = require('./canvasize');
exports.animation = require('./animation');
exports.util = require('./util');
exports.image = require('./image');
exports.label = require('./label');
exports.layouts = require('./layouts');
exports.rectangle = require('./rectangle');
exports.view = require('./view');
exports.button = require('./button');
exports.app = require('./app');
exports.terminal = require('./terminal');
exports.rterm = require('./rterm');
    }
  };
});
if(typeof module != 'undefined' && module.exports ){
  module.exports = carousel;
  if( !module.parent ){
    carousel.main();
  }
};
window.require = carousel.require;
window.app = carousel.require('carousel');
