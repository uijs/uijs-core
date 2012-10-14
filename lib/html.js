var box = require('./box');
var util = require('./util');
var capture = require('./interaction').capture;
var defaults = util.defaults;
var bind = require('./bind');

module.exports = function(options) {
  var obj = box(defaults(options, {
    root: 'div',
    html: '<div>',
    bounds: bind(function() {
      var spt = this.screen();
      return spt.x + ',' + spt.y + ' ' + this.width + 'x' + this.height; 
    }),
    invalidators: [ 'bounds' ],
    interaction: false, // by default we let HTML capture events
    handleEvents: false, //in case of interaction = true events are being handled by canvas
  }));

  Object.defineProperty(obj, 'container', {
    get: function() {
      var self = this;
      if (!self._div) return null;
      return self._container();
    }
  });

  // returns the `div` container that hosts this tag.
  // the div will be created and appended to the document body
  // if it ain't.
  obj._container = function() {
    var self = this;
    var div = self._div;
    if (!div) {
      div = self._div = document.createElement(self.root);
      div.style.overflow = 'auto';
      div.style.position = 'absolute';
      document.body.appendChild(self._div);

      div.innerHTML = self.html;

      if (self.interaction) {
        capture(div, { preventDefault: !self.handleEvents }, function(event, pt, e) {
          // we need to pass the interaction data to the canvas
          var root = self.root();
          var spt = self.screen();
          root.interact(event, {
            x: pt.x + spt.x,
            y: pt.y + spt.y
          }, e);
        });
      }

      if (self.onload) {
        self.onload(div);
      }

      // emit an event, why the hell do we need `html.onload`?
      self.emit('load', div);
    }

    return div;
  };

  obj.watch('bounds', function() {
    var self = this;

    var pt = this.screen();
    var div = self._container(); // ensure that the element exists.

    // update bounds
    div.style.left = pt.x;
    div.style.top = pt.y;
    div.style.width = this.width;

    // clip to parent bounds or nasty things will happen.
    div.style.height = util.min(this.height, this.parent.height - this.y);
  });

  return obj;
};