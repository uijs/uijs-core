# uijs

A web UI system for real mobile apps.

[Stability](http://nodejs.org/api/documentation.html#documentation_stability_index): 1 - Experimental

## Goal

Our goal is to create a UI software stack for mobile apps that looks and behaves like native mobile UI. Current stacks like [jQuery Mobile](http://jquerymobile.com/), [jQTouch](http://www.jqtouch.com) and [Sencha Touch](http://www.sencha.com/products/touch) are doing an excellent job with HTML5. We thought it would be interesting to try out something a little different and use the HTML5 canvas as our basis for the entire UI system.

Our thesis, which is yet to be proven, is that since we have almost full control on both rendering and behavior we might be able to create a great experience, which mobile users are accustomed to in native apps today.

At this point (v0.0.1), uijs is not yet usable. We are building it as you read this (yes!). If you are interested in contributing or trying it out, you are more then welcome. Ping us at the [uijs google group](mailto:uijs@googlegroups.com).

uijs's codebase is maintained on [github](https://github.com) (of course) and published via [npm](npmjs.org) as [CommonJS](http://www.commonjs.org) modules. See [Getting Started](#getting-started) for more information on how to install uijs and build uijs apps.

This repository contains only the uijs __core__ module. It consists only of the basic mechanisms that can be used to build uijs modules (UI widgets) and apps. We believe in the ["batteries are not included"](https://github.com/joyent/node/wiki/node-core-vs-userland) philosophy employed in projects like [node.js](http://nodejs.org). For frontend libraries, this is even more critical because one would want to keep the footprint of their app as small as possible, so we didn't want to put too much into the core library.

## Getting started

### Installing

To get started first installl the [development tools](https://github.com/eladb/uijs-devtools) globally:

    $ npm install -g uijs-devtools
    
Now, create a directory for your app/module and install uijs there:

    $ cd hello-uijs
    $ npm install uijs
    
This will create a `node_modules/uijs` directory with the uijs core module.

### Hello, uijs!

uijs apps/modules are CommonJS libraries (`require()`) that export a uijs [box](#box). A box is a visual rectanglurly-bound element that can draw itself and may have child boxes. In uijs everything is a box.

Let's create a simple box that prints 'hello, uijs!'.

Create a file named `hello.js`:

    var uijs = require('uijs');
    var box = uijs.box;
    
    var app = box();
    
    app.ondraw = function(ctx) {
    
        // fill the box
        ctx.fillStyle = '#1C8BDC';
        ctx.fillRect(0, 0, this.width(), this.height());
    
        // draw text
        ctx.fillStyle = 'white';
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'black';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.lineWidth = 2;
        ctx.font = '50px Helvetica';
        ctx.fillText('Hello, uijs!', 100, 100);
        
    };
    
    module.exports = app;

We create a box by calling `box()` and set it's `ondraw` function to use `ctx` (which is simply a [CanvasRenderingContext2D](http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#canvasrenderingcontext2d)) to print the text "Hello, uijs" at 100, 100 (relative to the box's origin).

### Building

Now, let's build and open this app.

    $ uijs build hello.js
    dist/hello.uijs.js created
    dist/hello.uijs.html created

> `uijs` is the entry point for the development tools. We use the `build` command, passing it `hello.js` as the input. Use `uijs -h` for usage.

`build` created two outputs: `dist/hello.uijs.js` and `dist/hello.uijs.html`:

 * The .`js` file is our app bundled using 
  [Browserify](https://github.com/substack/node-browserify). It basically allows 
  including a uijs app using a `<script>` tag within any HTML document.
 * The `.html` file is a standard uijs HTML shim with the bundled app
   embedded and contains the uijs [bootstrapping](#bootstrap) code. In most 
   cases, you will only need this file to serve your app to clients via CDN or 
   some other static file server.
   
Open `dist/hello.uijs.html` with a web browser and you should see something like this:

![image](doc/hellouijs.png)

Yeah!

### Working iteratively

Passing `-w` to `uijs build` will start a file watch on the directory and automatically rebuild when your code changes, so you can work iteratively and refresh the browser window.

    $ uijs build hello.js -w
    Watching /Users/eladb/hello-uijs exclude: [ 'dist', 'node_modules', '.git', /\.tmp.+/ ]
    dist/hello.uijs.js created
    dist/hello.uijs.html created    
    ...
    /Users/eladb/hello-uijs/hello.js changed. rebuilding
    dist/hello.uijs.js created
    dist/hello.uijs.html created    
    ...
    
Pretty useful!

### Running on a mobile device

uijs is all about mobile apps, so we made it super easy to serve your app for development and access it through the local network via your mobile browser.

Execute:

    $ uijs debug hello.js -w
    Watching /Users/eladb/hello-uijs exclude: [ 'dist', 'node_modules', '.git', /\.tmp.+/ ]
    dist/hello.uijs.js created
    dist/hello.uijs.html created
    starting debugger for /Users/eladb/hello-uijs/dist/hello.uijs.js
    uijs debugger listening on port 5000

As you can see, the debugger is listening on port 5000. Now all you need to do is point your mobile device to `http://<your-machine-ip-address>:5000` and your app should show up.

Since most mobile browsers do not have a console window, if you use `console.log` in your codebase, those logs will be outputed on the console of your host machine, making your life so much better.

Since we used `-w`, the file watch will also work in this mode.

## For contributors

### Running tests

`npm test` will run all tests. These are the regression tests that should be executed before commiting code into the repository.

We have two types of tests:

 1. Functional tests are located under `test/*.test.js`. __Functional tests__ 
    are simply node.js scripts. If they exit with a non zero exit code, the test 
    failed.
 2. Visual tests are located under `test/*.cantest.{js|png}`. __Visual tests__ 
    use [node-canvas](https://github.com/learnboost/node-canvas) and 
    [cantest](https://github.com/eladb/node-cantest) and can be executed 
    using `cantest xxx.cantest.js`. Read more about visual tests in the 
    [cantest README](https://github.com/eladb/node-cantest/blob/master/README.md) 
    file.

Running all tests:

    $ npm test
    > uijs@0.0.1 test
    > cd test && ./run.sh
    
    Running catest tests
    Running functional tests

### Viewing samples

Samples are simple uijs modules. In order to a sample, point `uijs build` to the sample file and open it (you will need to [install](#installing) the devtools of course):

For example:

    $ cd samples
    $ uijs build interaction-sample.js
    dist/interaction-sample.uijs.js created
    dist/interaction-sample.uijs.html created
    $ open dist/interaction-sample.uijs.html

## License

(The MIT License)

Copyright (c) 2012 uijs.org

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
