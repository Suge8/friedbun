#!/bin/sh
# 输出到 tmp/perf-input-<n>.log
for n in 1 2 3; do echo "frame $n" > "tmp/perf-input-$n.log"; done
