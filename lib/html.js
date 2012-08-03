var box = require('./box');
var util = require('./util');
var capture = require('./interaction').capture;
var defaults = util.defaults;

module.exports = function(options) {
  var obj = box(defaults(options, {
    html: '<div>',
    interaction: false, // by default we let HTML capture events
  }));

  var last_bounds = null;

  obj.on('frame', function() {
    var self = this;

    var pt = this.screen();
    var bounds = pt.x + ',' + pt.y + ' ' + this.width + 'x' + this.height;

    if (bounds !== last_bounds) {
      var div = self._container(); // ensure that the element exists.

      // update bounds
      div.style.left = pt.x;
      div.style.top = pt.y;
      div.style.width = this.width;

      // clip to parent bounds or nasty things will happen.
      div.style.height = util.min(this.height, this.parent.height - this.y);

      last_bounds = bounds;
    }
  });

  Object.defineProperty(obj, 'container', {
    get: function() {
      var self = this;
      if (!self._div) return null;
      return self._container();
    },
  })

  // returns the `div` container that hosts this tag.
  // the div will be created and appended to the document body
  // if it ain't.
  obj._container = function() {
    var self = this;
    var div = self._div;
    if (!div) {
      div = self._div = document.createElement('div');
      div.style.overflow = 'auto';
      div.style.position = 'absolute';
      document.body.appendChild(self._div);

      div.innerHTML = self.html;

      if (self.interaction) {
        capture(div, function(event, pt, e) {
          // we need to pass the interaction data to the canvas
          var root = self.root();
          var spt = self.screen();
          root.interact(event, {
            x: pt.x + spt.x,
            y: pt.y + spt.y,
          }, e);
        });
      }

      if (self.onload) {
        self.onload(div);
      }
    }

    return div;
  };

  return obj;
};