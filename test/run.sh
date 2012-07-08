#!/bin/bash
echo "Running catest tests"
cantest *.cantest.js --no-browse
echo "Running functional tests"
for x in `ls *.test.js`; do 
    node $x || (
        echo "Test $x failed"
        exit 1
    );
done
