#!/bin/sh
cd /home/user/legend-studio && python3 -I tools/build.py >/dev/null && python3 -c "
s=open('dist/index.html').read()
open('dist/test.html','w').write('<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"></head><body style=\"margin:0\"><script src=\"../qa/mock.js\"></script>'+s+'</body></html>')"
