import sys
file_path = "src/components/ForensicAuditPanel.tsx"
with open(file_path, "r") as f:
    content = f.read()

target1 = "{insight.title}"
replacement1 = "{typeof insight.title === 'object' ? JSON.stringify(insight.title) : String(insight.title)}"
content = content.replace(target1, replacement1)

target2 = "{insight.severity}"
replacement2 = "{typeof insight.severity === 'object' ? JSON.stringify(insight.severity) : String(insight.severity)}"
content = content.replace(target2, replacement2)

target3 = "{insight.description}"
replacement3 = "{typeof insight.description === 'object' ? JSON.stringify(insight.description) : String(insight.description)}"
content = content.replace(target3, replacement3)

target4 = "{insight.suggestedAction}"
replacement4 = "{typeof insight.suggestedAction === 'object' ? JSON.stringify(insight.suggestedAction) : String(insight.suggestedAction)}"
content = content.replace(target4, replacement4)

target5 = "{algo.algorithm}"
replacement5 = "{typeof algo.algorithm === 'object' ? JSON.stringify(algo.algorithm) : String(algo.algorithm)}"
content = content.replace(target5, replacement5)

target6 = "{adj.algorithm}"
replacement6 = "{typeof adj.algorithm === 'object' ? JSON.stringify(adj.algorithm) : String(adj.algorithm)}"
content = content.replace(target6, replacement6)

target7 = "{algo}"
replacement7 = "{typeof algo === 'object' ? JSON.stringify(algo) : String(algo)}"
content = content.replace(target7, replacement7)

with open(file_path, "w") as f:
    f.write(content)

print("Patched.")
