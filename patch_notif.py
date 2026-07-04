import sys

file_path = "src/components/NotificationSettings.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("setNotificationTime(preferences.notification_time || \"18:00\");", "setNotificationTime(\"18:00\");")
content = content.replace("notification_time: notificationTime", "")
content = content.replace("preferences: { notification_time: time }", "preferences: {}")

with open(file_path, "w") as f:
    f.write(content)

print("Patched NotificationSettings.tsx")
