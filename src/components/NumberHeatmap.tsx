import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

interface NumberHeat {
  number: number;
  temperature: "hot" | "warm" | "cold" | "frozen";
  score: number;
  lastSeen: number;
  frequency: number;
}

interface NumberHeatmapProps {
  results: any[];
}

export const NumberHeatmap = ({ results }: NumberHeatmapProps) => {
  const heatData = useMemo(() => {
    const heat: NumberHeat[] = [];
    
    for (let num = 1; num <= 90; num++) {
      const appearances = results
        .map((r, idx) => ({ idx, has: r.winning_numbers?.includes(num) }))
        .filter(a => a.has);
      
      const lastSeen = appearances.length > 0 ? appearances[0].idx : 999;
      const frequency = appearances.length / results.length;
      
      // Dynamic window based on dataset size for trend analysis (e.g., 20% of dataset)
      const windowSize = Math.max(5, Math.floor(results.length * 0.2));
      const recent = results.slice(0, windowSize).filter(r => r.winning_numbers?.includes(num)).length;
      const previous = results.slice(windowSize, windowSize * 2).filter(r => r.winning_numbers?.includes(num)).length;
      
      // Calculate data-driven decay rate. Inverse of expected average appearances
      const expectedAppearances = results.length * (5 / 90);
      const decayRate = 1 / Math.max(1, expectedAppearances);

      const recencyScore = Math.exp(-lastSeen * decayRate);
      
      // Normalized frequency score relative to expectation
      const expectedFrequency = 5 / 90;
      const freqScore = frequency / expectedFrequency;
      
      // Trend multiplier derived from statistical improvement
      const recentRate = windowSize > 0 ? recent / windowSize : 0;
      const previousRate = windowSize > 0 ? previous / windowSize : 0;
      const trendMultiplier = previousRate > 0 ? (recentRate / previousRate) : (recentRate > 0 ? 1.5 : 1);
      const clampedTrendScore = Math.max(0.5, Math.min(2.0, trendMultiplier));

      const score = recencyScore * freqScore * clampedTrendScore;
      
      // Temperatures based on statistical quartiles or mean variance
      // Since score revolves around 1.0 (expected behavior)
      let temperature: NumberHeat["temperature"];
      if (score > 1.5) temperature = "hot"; // > 50% above expected
      else if (score > 1.0) temperature = "warm"; // above expected
      else if (score > 0.5) temperature = "cold"; // below expected
      else temperature = "frozen"; // < 50% below expected
      
      heat.push({ number: num, temperature, score, lastSeen, frequency });
    }
    
    return heat;
  }, [results]);

  const getColor = (temp: string) => {
    switch (temp) {
      case "hot": return "bg-red-500 hover:bg-red-600";
      case "warm": return "bg-orange-400 hover:bg-orange-500";
      case "cold": return "bg-blue-400 hover:bg-blue-500";
      case "frozen": return "bg-blue-200 hover:bg-blue-300";
      default: return "bg-gray-400";
    }
  };

  const getTextColor = (temp: string) => {
    return temp === "frozen" ? "text-gray-700" : "text-white";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-5 h-5" />
          Carte de Chaleur
        </CardTitle>
        <CardDescription>
          Température des numéros (1-90)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 flex-wrap">
          <Badge className="bg-red-500">🔥 Chaud</Badge>
          <Badge className="bg-orange-400">☀️ Tiède</Badge>
          <Badge className="bg-blue-400">❄️ Froid</Badge>
          <Badge className="bg-blue-200 text-gray-700">🧊 Gelé</Badge>
        </div>
        
        <div className="grid grid-cols-10 gap-1">
          {heatData.map((heat) => (
            <button
              key={heat.number}
              className={`${getColor(heat.temperature)} ${getTextColor(heat.temperature)} 
                p-2 rounded text-xs font-bold transition-all hover:scale-110 hover:z-10 relative group`}
              title={`N°${heat.number} - ${heat.temperature} - Score: ${heat.score.toFixed(2)}`}
            >
              {heat.number}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                Fréq: {(heat.frequency * 100).toFixed(1)}%<br/>
                Vu: {heat.lastSeen === 999 ? "Jamais" : `${heat.lastSeen} tirages`}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
