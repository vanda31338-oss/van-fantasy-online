#!/bin/sh
# qa/tiny/tiny.js = tiny.src.js with the prop maps inlined
cd /home/user/legend-studio && node tools/mktiny.mjs qa/tiny/maps.json >/dev/null && node -e "
const fs=require('fs');fs.writeFileSync('qa/tiny/tiny.js',fs.readFileSync('qa/tiny/tiny.src.js','utf8').replace('__MAPS__',fs.readFileSync('qa/tiny/maps.json','utf8')))"
