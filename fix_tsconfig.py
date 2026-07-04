import json

with open('tsconfig.json', 'r') as f:
    config = json.load(f)

config['compilerOptions']['paths'] = {
    "@/*": ["./src/*"]
}
config['include'] = ["src"]
if "supabase/functions" not in config.get('exclude', []):
    config['exclude'] = config.get('exclude', []) + ["supabase/functions"]

with open('tsconfig.json', 'w') as f:
    json.dump(config, f, indent=2)

print("Fixed tsconfig.json")
