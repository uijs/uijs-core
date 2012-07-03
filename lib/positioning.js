exports.top = function(box) {
  return box.y();
};

exports.left = function(box) { 
  return box.x();
};

exports.right = function(box) {
  return box.x() + box.width();
};

exports.bottom = function(box) {
  return box.y() + box.height();
};

exports.width = function(box) {
  return box.width();
};

exports.height = function(box) {
  return box.height();
};

function _rulefn(rule) {
  if (Object.keys(rule).length !== 1) {
    throw new Error('positioning can only accept a single key as positioning rule');
  }

  var measure = Object.keys(rule)[0];
  var value = rule[measure];
  return function(box) {
    return exports[measure](box) + value;
  };
}

exports.parent = function(rule) {
  var fn = _rulefn(rule);
  return function() {
    return fn(this.parent);
  };
};

exports.relative = function(rule) {
  var fn = _rulefn(rule);
  return function() {
    return fn(this.prev());
  };
};

exports.centerx = function(delta) {
  delta = delta || 0;
  return function() {
    return this.parent.x() + this.parent.width() / 2 - this.width() / 2 + delta;
  };
};

exports.centery = function(delta) {
  delta = delta || 0;
  return function() {
    return this.parent.y() + this.parent.height() / 2 - this.height() / 2 + delta;
  };
};