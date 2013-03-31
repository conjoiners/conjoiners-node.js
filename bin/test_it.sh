#!/bin/sh

cd ../test
nodeunit test_implant.js
nodeunit test_conjoiner.js
