import sys
file_path = "src/components/ForensicAuditPanel.tsx"
with open(file_path, "r") as f:
    content = f.read()

target1 = "{lastAuditResult.geminiAnalysis.summary}"
replacement1 = "{typeof lastAuditResult.geminiAnalysis.summary === 'object' ? JSON.stringify(lastAuditResult.geminiAnalysis.summary) : String(lastAuditResult.geminiAnalysis.summary)}"
content = content.replace(target1, replacement1)

target2 = "{issue}"
replacement2 = "{typeof issue === 'object' ? JSON.stringify(issue) : String(issue)}"
content = content.replace(target2, replacement2)

target3 = "{rec.priority}"
replacement3 = "{typeof rec.priority === 'object' ? JSON.stringify(rec.priority) : String(rec.priority)}"
content = content.replace(target3, replacement3)

target4 = "{rec.action}"
replacement4 = "{typeof rec.action === 'object' ? JSON.stringify(rec.action) : String(rec.action)}"
content = content.replace(target4, replacement4)

target5 = "{rec.impact}"
replacement5 = "{typeof rec.impact === 'object' ? JSON.stringify(rec.impact) : String(rec.impact)}"
content = content.replace(target5, replacement5)

target6 = "{assessment.status}"
replacement6 = "{typeof assessment.status === 'object' ? JSON.stringify(assessment.status) : String(assessment.status)}"
content = content.replace(target6, replacement6)

target7 = "{audit.draw_name}"
replacement7 = "{typeof audit.draw_name === 'object' ? JSON.stringify(audit.draw_name) : String(audit.draw_name)}"
content = content.replace(target7, replacement7)

with open(file_path, "w") as f:
    f.write(content)

print("Patched.")
