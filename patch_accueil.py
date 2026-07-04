import sys

file_path = "src/components/loto/AccueilTab.tsx"
with open(file_path, "r") as f:
    content = f.read()

import_target = """import { CheckCircle2, Clock, Calendar as CalendarIcon, Filter, Info, Sparkles } from "lucide-react";"""
import_replacement = """import { CheckCircle2, Clock, Calendar as CalendarIcon, Filter, Info, Sparkles } from "lucide-react";
import { BacktestingSummaryCard } from "@/components/BacktestingSummaryCard";"""

if import_target in content:
    content = content.replace(import_target, import_replacement)

render_target = """      {/* Week Schedule Summary */}"""
render_replacement = """      {/* Dashboard Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Backtesting Module Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <BacktestingSummaryCard drawName={selectedDayDraws && selectedDayDraws.length > 0 ? selectedDayDraws[0].name : "Etoile"} />
        </motion.div>

        {/* Week Schedule Summary */}"""

if render_target in content:
    content = content.replace(render_target, render_replacement)
    
# We need to make sure the div around week schedule is properly formatted, wait, it already has motion.div.
# Let's verify how it is currently:
with open(file_path, "w") as f:
    f.write(content)

print("Patched AccueilTab.ts")
