import json

with open('tsconfig.json', 'r') as f:
    config = json.load(f)

if "node_modules" not in config['exclude']:
    config['exclude'].append("node_modules")

with open('tsconfig.json', 'w') as f:
    json.dump(config, f, indent=2)

print("Patched tsconfig.json")
