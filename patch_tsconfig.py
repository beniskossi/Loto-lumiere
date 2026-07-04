import json

with open('tsconfig.json', 'r') as f:
    config = json.load(f)

if 'exclude' not in config:
    config['exclude'] = []

if "supabase/functions" not in config['exclude']:
    config['exclude'].append("supabase/functions")

with open('tsconfig.json', 'w') as f:
    json.dump(config, f, indent=2)

print("Patched tsconfig.json")
