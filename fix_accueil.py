import sys

file_path = "src/components/loto/AccueilTab.tsx"
with open(file_path, "r") as f:
    lines = f.readlines()

for i in range(len(lines)-1, -1, -1):
    if "    </div>" in lines[i]:
        lines.insert(i, "      </div>\n")
        break

with open(file_path, "w") as f:
    f.writelines(lines)
print("Fixed.")
