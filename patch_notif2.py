import sys

file_path = "src/components/NotificationSettings.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("preferences: { \n          notification_enabled: enabled,\n          \n        }", "updates: { notification_enabled: enabled }")
content = content.replace("preferences: {}", "updates: {}")
content = content.replace("preferences: { notification_enabled: enabled }", "updates: { notification_enabled: enabled }")

with open(file_path, "w") as f:
    f.write(content)

print("Patched NotificationSettings.tsx")
