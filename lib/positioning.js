var constant = require('./util').constant;

//
// attributes

var attributes = {};

attributes.top = attributes.y = function(box, delta) {
  return function() {
    return box.y() + (delta || 0);
  }
};

attributes.left = attributes.x = function(box, delta) { 
  return function() {
    return box.x() + (delta || 0);
  }
};

attributes.right = function(box, delta) {
  return function() {
    return box.x() + box.width() + (delta || 0);
  }
};

attributes.bottom = function(box, delta) {
  return function() {
    return box.y() + box.height() + (delta || 0);
  };
};

attributes.width = function(box, delta) {
  return function() {
    return box.width() + (delta || 0);
  }
};

attributes.height = function(box, delta) {
  return function() {
    return box.height() + (delta || 0);
  }
};

attributes.centerx = function(box, delta) {
  return function() {
    return box.width() / 2 - this.width() / 2 + (delta || 0);
  }
};

attributes.centery = function(box, delta) {
  return function() {
    return box.height() / 2 - this.height() / 2 + (delta || 0);
  }
};

// export all attributed positional functions
for (var k in attributes) {
  exports[k] = attributes[k];
}

//
// relations

exports.parent = mkrelational(function() {
  if (!this.parent) throw new Error('no parent');
  return this.parent;
});

exports.prev = mkrelational(function() {
  if (!this.parent) throw new Error('no parent no prev()');
  var prev = this.prev();

  // if no prev, it means we are the first, so just assume all 0
  if (!prev) return {
    x: constant(0),
    y: constant(0),
    width: constant(0),
    height: constant(0),
  }

  return prev;
});




// --- private

// returns a hash of positional attributed functions bound to the
// box returned by the `related` function.
function mkrelational(related) {
  if (!related || typeof related !== 'function') throw new Error('`related` must be a function');
  var functions = {};
  Object.keys(attributes).forEach(function(attr) {
    var attrfn = attributes[attr];
    functions[attr] = function(delta) {
      return function() {
        var self = this;
        delta = delta || 0;
        return attrfn(related.call(self), delta).call(self);
      };
    };
  });

  return functions;
}