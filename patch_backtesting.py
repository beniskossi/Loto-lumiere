import sys

file_path = "supabase/functions/_shared/backtesting.ts"
with open(file_path, "r") as f:
    content = f.read()

# First replace the BacktestResult interface
interface_target = """export interface BacktestResult {
  algorithm: string;
  accuracy: number;
  avgMatches: number;
  bestMatch: number;
  worstMatch: number;
  consistency: number;
  totalTests: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  matchDistribution: Record<number, number>;
}"""

interface_replacement = """export interface BacktestResult {
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgMatches: number;
  bestMatch: number;
  worstMatch: number;
  consistency: number;
  totalTests: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  matchDistribution: Record<number, number>;
}"""

if interface_target in content:
    content = content.replace(interface_target, interface_replacement)

# Then replace the backtestAlgorithm logic
func_target = """  const scores: number[] = [];
  const returns: number[] = [];
  const matchDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };"""

func_replacement = """  const scores: number[] = [];
  const returns: number[] = [];
  const precisions: number[] = [];
  const recalls: number[] = [];
  const matchDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };"""

if func_target in content:
    content = content.replace(func_target, func_replacement)


func_target_2 = """    try {
      const prediction = algorithm(trainSlice);
      const matches = prediction.numbers.filter(n => 
        testPoint.winning_numbers.includes(n)
      ).length;
      
      scores.push(matches);
      matchDistribution[matches]++;
      
      // Calculate return (simplified: +1 for each match above 1, -1 otherwise)
      const gain = matches >= 2 ? matches - 1 : -1;
      returns.push(gain);
    } catch {
      scores.push(0);
      matchDistribution[0]++;
      returns.push(-1);
    }"""

func_replacement_2 = """    try {
      const prediction = algorithm(trainSlice);
      const predictedCount = prediction.numbers.length;
      const actualCount = testPoint.winning_numbers.length;
      
      const matches = prediction.numbers.filter(n => 
        testPoint.winning_numbers.includes(n)
      ).length;
      
      scores.push(matches);
      matchDistribution[matches]++;
      
      const precision = predictedCount > 0 ? matches / predictedCount : 0;
      const recall = actualCount > 0 ? matches / actualCount : 0;
      precisions.push(precision);
      recalls.push(recall);
      
      // Calculate return (simplified: +1 for each match above 1, -1 otherwise)
      const gain = matches >= 2 ? matches - 1 : -1;
      returns.push(gain);
    } catch {
      scores.push(0);
      precisions.push(0);
      recalls.push(0);
      matchDistribution[0]++;
      returns.push(-1);
    }"""

if func_target_2 in content:
    content = content.replace(func_target_2, func_replacement_2)


func_target_3 = """  // Calculate metrics
  const avgMatches = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgMatches, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);"""

func_replacement_3 = """  // Calculate metrics
  const avgMatches = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgMatches, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  const avgPrecision = precisions.reduce((a, b) => a + b, 0) / precisions.length;
  const avgRecall = recalls.reduce((a, b) => a + b, 0) / recalls.length;
  const f1Score = (avgPrecision + avgRecall) > 0 
    ? 2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall) 
    : 0;"""

if func_target_3 in content:
    content = content.replace(func_target_3, func_replacement_3)
    
func_target_4 = """  return {
    algorithm: algorithmName,
    accuracy: (avgMatches / 5) * 100,
    avgMatches,"""

func_replacement_4 = """  return {
    algorithm: algorithmName,
    accuracy: (avgMatches / 5) * 100,
    precision: avgPrecision * 100,
    recall: avgRecall * 100,
    f1Score: f1Score * 100,
    avgMatches,"""

if func_target_4 in content:
    content = content.replace(func_target_4, func_replacement_4)

func_target_5 = """function aggregateFoldResults(folds: BacktestResult[], algorithmName: string): BacktestResult {
  const n = folds.length;
  
  const avgAccuracy = folds.reduce((sum, f) => sum + f.accuracy, 0) / n;"""

func_replacement_5 = """function aggregateFoldResults(folds: BacktestResult[], algorithmName: string): BacktestResult {
  const n = folds.length;
  
  const avgAccuracy = folds.reduce((sum, f) => sum + f.accuracy, 0) / n;
  const avgPrecision = folds.reduce((sum, f) => sum + (f.precision || 0), 0) / n;
  const avgRecall = folds.reduce((sum, f) => sum + (f.recall || 0), 0) / n;
  const avgF1Score = folds.reduce((sum, f) => sum + (f.f1Score || 0), 0) / n;"""

if func_target_5 in content:
    content = content.replace(func_target_5, func_replacement_5)

func_target_6 = """  return {
    algorithm: algorithmName,
    accuracy: avgAccuracy,
    avgMatches,"""

func_replacement_6 = """  return {
    algorithm: algorithmName,
    accuracy: avgAccuracy,
    precision: avgPrecision,
    recall: avgRecall,
    f1Score: avgF1Score,
    avgMatches,"""

if func_target_6 in content:
    content = content.replace(func_target_6, func_replacement_6)


func_target_7 = """function createEmptyResult(algorithmName: string): BacktestResult {
  return {
    algorithm: algorithmName,
    accuracy: 0,
    avgMatches: 0,"""

func_replacement_7 = """function createEmptyResult(algorithmName: string): BacktestResult {
  return {
    algorithm: algorithmName,
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
    avgMatches: 0,"""
    
if func_target_7 in content:
    content = content.replace(func_target_7, func_replacement_7)

with open(file_path, "w") as f:
    f.write(content)

print("Patched backtesting.ts")
