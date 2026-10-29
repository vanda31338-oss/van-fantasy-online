#!/bin/sh
# qa/wings/wings.js = wings.src.js with the prop maps inlined
cd /home/user/legend-studio && node tools/mkwings.mjs qa/wings/maps.json >/dev/null && node -e "
const fs=require('fs');fs.writeFileSync('qa/wings/wings.js',fs.readFileSync('qa/wings/wings.src.js','utf8').replace('__MAPS__',fs.readFileSync('qa/wings/maps.json','utf8')))"
