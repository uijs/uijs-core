var uijs = require('uijs');
var constant = uijs.util.constant;

var app = uijs.app({ 
  layout: uijs.layouts.dock({ padding: constant(0) }) 
});

var term = uijs.terminal({ dockStyle: constant('fill') });
app.add(term);

term.writeLine('Hello, how are yoiu?');
term.writeLine('Hello, how are yoiu #2?');
term.writeLine('Hello, how are yoiu #3?');

var i = 0;
setInterval(function() {
  term.writeLine('Line ' + i++);
}, 100);

module.exports = app;