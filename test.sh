#!/bin/bash
for file in tests/*.eml; do
    ./test.exp 25 ${file}
done