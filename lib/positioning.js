//
// attributes

var attributes = {};

attributes.top = attributes.y = function(box, delta) {
  return box.y + delta;
};

attributes.left = attributes.x = function(box, delta) { 
  return box.x + delta;
};

attributes.right = function(box, delta) {
  return box.x + box.width + delta;
};

attributes.bottom = function(box, delta) {
  return box.y + box.height + delta;
};

attributes.width = function(box, delta) {
  return box.width + delta;
};

attributes.height = function(box, delta) {
  return box.height + delta;
};

attributes.centerx = function(box, delta) {
  return box.width / 2 - this.width / 2 + delta;
};

attributes.centery = function(box, delta) {
  return box.height / 2 - this.height / 2 + delta;
};

// export all attributed positional functions
for (var k in attributes) {
  exports[k] = attributes[k];
}

//
// relations

var zero = {
  x: 0,
  y: 0,
  width: 0,
  height: 0
};

exports.parent = mkrelational(function() {
  if (!this.parent) return zero; // no parent (yet, so return zero bounds)
  return this.parent;
});

exports.prev = mkrelational(function() {
  if (!this.parent) return zero; // no parent, no prev, return zero bounds
  
  var prev = this.prev();
  if (!prev) return zero; // if no prev, it means we are the first, so just assume all 0
  return prev;
});

exports.relative = function(query) {
  return mkrelational(function() {
    // first, search the parent layer
    var box = this.parent.query(query);

    // if not found in parent layer, search entire tree
    if(!box){
      box = this.root().query(query);
    }
    if (!box) return zero;
    return box;
  });
};

// --- private

// returns a hash of positional attributed functions bound to the
// box returned by the `related` function.
function mkrelational(related) {
  if (!related || typeof related !== 'function') throw new Error('`related` must be a function');
  var functions = {};
  Object.keys(attributes).forEach(function(attr) {
    var attrfn = attributes[attr];
    functions[attr] = function(delta) {
      delta = delta || 0;
      return function() {
        return attrfn.call(this, related.call(this), delta);
      };
    };
  });
  return functions;
}