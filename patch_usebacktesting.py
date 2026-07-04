import sys

file_path = "src/hooks/useBacktesting.ts"
with open(file_path, "r") as f:
    content = f.read()

interface_target = """export interface BacktestResult {
  algorithm: string;
  accuracy: number;
  avgMatches: number;"""

interface_replacement = """export interface BacktestResult {
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgMatches: number;"""

if interface_target in content:
    content = content.replace(interface_target, interface_replacement)
else:
    print("Interface target not found.")

# Update the select query to fetch precision and recall if they existed, but they don't in `algorithm_performance`.
# But wait, in the evaluate-algorithms API call, we get the fresh BacktestResult with precision and recall.
# The user wants to *display* these results in a summary card. 
# We'll just export the types.

with open(file_path, "w") as f:
    f.write(content)

print("Patched useBacktesting.ts")
