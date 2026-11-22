#!/bin/sh
set -eu
npx newman run docs/postman/aiko.postman_collection.json -e docs/postman/aiko-local.postman_environment.json
