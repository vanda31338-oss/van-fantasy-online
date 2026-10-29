# inline the prop maps into the 100-baht test project
import json, sys
src = open('qa/b100/b100.src.js').read(); maps = open('qa/b100/maps.json').read()
out = src.replace('__MAPS__', maps)
open('qa/b100/b100.js', 'w').write(out)
open('src/sample_b100.js', 'w').write(out)  # shipped in the page: home demo + the house-quality example in prompts
print('ok', len(src) + len(maps))
