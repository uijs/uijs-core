function bind(obj, prop, fn) {
  if (obj === undefined) {
    return { $autobind: fn };
  }

  Object.defineProperty(obj, prop, {
    configurable: true,
    enumerable: true,
    get: fn,
    set: function(newval) {
      if (newval && newval.$autobind) {
        bind(obj, prop, newval.$autobind);
        return newval;
      }

      delete obj[prop];
      Object.defineProperty(obj, prop, {
        enumerable: true,
        configurable: true,
        writable: true,
        value: newval
      });
      return newval;
    }
  });

  return { $autobind: fn };
}

function autobind(obj) {
  Object.keys(obj).forEach(function(k) {
    var val = obj[k];
    if (val && val.$autobind) {
      bind(obj, k, val.$autobind);
    }
  });

  return obj;
}

module.exports = bind;
module.exports.autobind = autobind;