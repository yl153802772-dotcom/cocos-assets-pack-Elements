#!/bin/bash

cd "$(dirname "$0")"
node run.js "$@"
exit $?
