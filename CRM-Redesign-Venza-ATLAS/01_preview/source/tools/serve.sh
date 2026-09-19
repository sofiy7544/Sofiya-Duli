#!/bin/sh
[ -f /tmp/preview-http.pid ] && kill "$(cat /tmp/preview-http.pid)" 2>/dev/null; sleep .3
setsid nohup python3 -m http.server 4173 --directory /home/claude/preview/dist > /tmp/http.log 2>&1 &
echo $! > /tmp/preview-http.pid
sleep 1
