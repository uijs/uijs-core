var constant = require('./util').constant;

exports.stack = function(options) {
  options = options || {};
  options.padding = options.padding || constant(5);
  options.spacing = options.spacing || constant(5);

  return function() {
    var parent = this;

    parent.on('after-add-child', function(child) {
      child.x = options.padding;

      child.width = function() {
        return parent.width() - options.padding() * 2;
      };

      var prev = child.prev();
      if (!prev) child.y = options.padding;
      else child.y = function() { return prev.y() + prev.height() + options.spacing() };
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
      return parent.unoccupied(child).x; 
    };
    child.y = function() { 
      return parent.unoccupied(child).y; 
    };
    child.width = function() { 
      return parent.unoccupied(child).width; 
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
      return region.y + region.height - child.height();
    };
    child.width = function() { 
      var region = parent.unoccupied(child);
      return region.width; 
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
      return region.height; 
    };
  };

  dockers.right = function(child) { 
    var parent = this;
    child.x = function() { 
      var region = parent.unoccupied(child);
      return region.x + region.width - child.width(); 
    };
    child.y = function() { 
      var region = parent.unoccupied(child);
      return region.y; 
    };
    child.height = function() { 
      var region = parent.unoccupied(child);
      return region.height; 
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
      return region.width; 
    };
    child.height = function() { 
      var region = parent.unoccupied(child);
      return region.height; 
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
            curr.y += child.height() + options.spacing();
            curr.height -= child.height() + options.spacing();
            break;
          case 'bottom':
            curr.height -= child.height() + options.spacing();
            break;
          case 'left':
            curr.x += child.width() + options.spacing();
            curr.width -= child.width() + options.spacing();
            break;
          case 'right':
            curr.width -= child.width() + options.spacing();
            break;
          case 'fill':
            curr.width -= child.width();
            curr.height -= child.height();
            break;
        }
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