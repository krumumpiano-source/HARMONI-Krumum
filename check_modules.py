import re

content = open('D:/AI Vs Programe/Krumum/js/app.js', encoding='utf-8-sig').read()
lines = content.split('\n')

module_lines = {}
for i, line in enumerate(lines):
    m = re.search(r"App\.modules\['([^']+)'\] = \{", line)
    if m:
        module_lines[m.group(1)] = i + 1

module_list = sorted(module_lines.items(), key=lambda x: x[1])
print(f"Total modules: {len(module_list)}\n")

for i, (name, start) in enumerate(module_list):
    end = module_list[i+1][1] if i+1 < len(module_list) else len(lines)
    block = '\n'.join(lines[start-1:end])
    size = end - start
    has_api = ('API.get' in block or 'API.post' in block or 'API.put' in block or 'API.delete' in block)
    tag = '✅' if (size > 80 and has_api) else ('⚠️' if size > 30 else '❌')
    print(f"{tag} {name}: {size} lines, API={has_api}")
