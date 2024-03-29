#!/bin/bash
for file in tests/*.eml; do
    ./test.exp 25 ${file}
    sleep 1
done