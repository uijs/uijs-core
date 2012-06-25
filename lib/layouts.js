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