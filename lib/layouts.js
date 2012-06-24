var constant = require('./util').constant;
var max = require('./util').max;

exports.stack = function(options) {
  options = options || {};
  options.padding = options.padding || constant(5);
  options.spacing = options.spacing || constant(5);

  return function() {
    var parent = this;

    parent.on('after-add-child', function(child) {
      child.x = options.padding;

      child.width = function() {
        return parent.width() - options.padding() * 2 - child.shadowOffsetX();
      };

      var prev = child.prev();
      if (!prev) child.y = options.padding;
      else child.y = function() { return prev.y() + prev.height() + options.spacing() + child.shadowOffsetY() };
    });
  };
};

exports.dock = function(options) {

  options = options || {};
  options.spacing = options.spacing || constant(5);
  options.padding = options.padding || constant(5);

  var dockers = {};

  dockers.top = function(child) {
    var parent = this;
    child.x = function() { 
      var region = parent.unoccupied(child);
      return region.x; 
    };
    child.y = function() { 
      var region = parent.unoccupied(child);
      return region.y; 
    };
    child.width = function() { 
      var region = parent.unoccupied(child);
      return region.width - child.shadowOffsetX();
    };
  };

  dockers.bottom = function(child) {
    var parent = this;
    child.x = function() { 
      var region = parent.unoccupied(child);
      return region.x; 
    };
    child.y = function() { 
      var region = parent.unoccupied(child);
      return region.y + region.height - child.height() - child.shadowOffsetY();
    };
    child.width = function() { 
      var region = parent.unoccupied(child);
      return region.width - child.shadowOffsetX();
    };
  };

  dockers.left = function(child) {
    var parent = this;
    child.x = function() { 
      var region = parent.unoccupied(child);
      return region.x; 
    };
    child.y = function() { 
      var region = parent.unoccupied(child);
      return region.y; 
    };
    child.height = function() { 
      var region = parent.unoccupied(child);
      return region.height - child.shadowOffsetY(); 
    };
  };

  dockers.right = function(child) { 
    var parent = this;
    child.x = function() { 
      var region = parent.unoccupied(child);
      return region.x + region.width - child.width() - child.shadowOffsetX(); 
    };
    child.y = function() { 
      var region = parent.unoccupied(child);
      return region.y; 
    };
    child.height = function() { 
      var region = parent.unoccupied(child);
      return region.height - child.shadowOffsetY();
    };
  };

  dockers.fill = function(child) {
    var parent = this;
    child.x = function() { 
      var region = parent.unoccupied(child);
      return region.x; 
    };
    child.y = function() { 
      var region = parent.unoccupied(child);
      return region.y; 
    };
    child.width = function() { 
      var region = parent.unoccupied(child);
      return region.width - child.shadowOffsetX();
    };
    child.height = function() { 
      var region = parent.unoccupied(child);
      return region.height - child.shadowOffsetY();
    };
  }

  return function() {
    var parent = this;

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
      var docker = dockers[dockStyle];
      if (docker) docker.call(parent, child);
    });
  };
};

exports.none = function() {
  return function() { };
};