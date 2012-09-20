# uijs-core

[![Build Status](https://secure.travis-ci.org/uijs/uijs-core.png)](http://travis-ci.org/uijs/uijs-core)

This is the core library for [uijs](https://github.com/uijs/uijs). It contains the low-level rendering and binding engines and some utilities.

To get started with __uijs__, see the 
uijs [README](https://github.com/uijs/uijs/blob/master/README.md).

See [organization](https://github.com/uijs/uijs/blob/master/doc/organization.md) for some info on what's here and what's elsewhere.

## Tests

To run visual tests, you will have to install [cairo](http://cairographics.org/). On a mac with [homebrew](http://mxcl.github.com/homebrew/) just type `brew install cairo`.

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

## Benchmarks

Benchmarks are uijs apps (export a `box`). All benchmarks are under the `benchmarks` directory.
To run a benchmark, use the uijs devtool `bench` or `prof` commands. By default the benchmark will run for 5 seconds. If `prof` is used, it will show a profiler output.

    $ cd benchmarks
    $ uijs bench the-box.js
    the-box.js 34303.2fps
    $ uijs prof the-box.js
    ...
    ... # benchmark results
    ...
    the-box.js 36176.4fps

Note that since benchmarks are regular uijs apps, they can usually be also opened from the browser. The fps measurements will be outputed to the console.

    $ cd benchmarks
    $ uijs debug the-jumping-box.js
    http://localhost:5000

### Results

_All results are from MacBook Air 1.8 GHz i7 4GB_

    +---------------------------------+-------------------+
    | test               | b87c5582d2 | 8119a6f096        |
    +--------------------+------------+-------------------+
    | the-box.js         | 13,592fps  | 66,870fps (+491%) |
    | the-jumping-box.js | 141.4fps   | 1,398fps (+988%)  |
    +---------------------------------+-------------------+

## License

(The MIT License)

Copyright (c) 2012 uijs.org and other uijs contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.