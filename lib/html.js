var box = require('./box');
var util = require('./util');
var capture = require('./interaction').capture;
var defaults = util.defaults;

module.exports = function(options) {
  options = defaults(options, {
    html: '<div>',
    attributes: {},
    style: {},
  });

  var obj = box(options);

  var last_bounds = null;

  obj.on('frame', function() {
    var self = this;

    var pt = this.screen();
    var bounds = pt.x + ',' + pt.y + ' ' + this.width() + 'x' + this.height();

    if (bounds !== last_bounds) {
      var el = self.element();
      var div = self.container(); // ensure that the element exists.

      // update bounds
      div.style.left = pt.x;
      div.style.top = pt.y;
      div.style.width = this.width();

      // clip to parent bounds or nasty things will happen.
      div.style.height = util.min(this.height(), this.parent.height() - this.y());

      last_bounds = bounds;
    }
  });

  // returns the `div` container that hosts this tag.
  // the div will be created and appended to the document body
  // if it ain't.
  obj.container = function() {
    var self = this;
    var div = self._div;
    if (!div) {
      div = self._div = document.createElement('div');
      div.style.overflow = 'auto';
      div.style.position = 'absolute';
      document.body.appendChild(self._div);

      if (self.capture()) {
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
    }
    return div;
  };

  // returns the element attached to this box
  obj.element = function() {
    var self = this;
    var el = self._el;
    if (!el) {
      // now create the element and snap it to the box

      var div = self.container();

      div.innerHTML = self.html;

      if (div.children.length === 1) {
        el = self._el = div.firstChild;
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.borderWidth = 0;
  
        // copy attributes and style, if defined
        if (self.attributes) {
          for (var k in self.attributes) {
            el[k] = self.attributes[k];
          }
        }

        if (self.style) {
          for (var k in self.style) {
            el.style[k] = self.style[k];
          }
        }
      }
      else {
        el = div.children;
      }
    }

    return el;
  };

  return obj;
};