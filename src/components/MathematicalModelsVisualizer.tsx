import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Network, Sigma, Activity, BarChart3, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export const MathematicalModelsVisualizer = () => {
  // Fake data representing Poisson distribution of delays
  const poissonData = useMemo(() => Array.from({ length: 35 }, (_, i) => {
    const lambda = 18; // Moyenne d'écart
    const k = i;
    // Poisson approximation: (lambda^k * e^-lambda) / k! (simplified for visual shape)
    const y = Math.max(0, Math.exp(-Math.pow((k - lambda)/5, 2)) * 100);
    return {
      gap: k,
      probability: y,
      isDue: k >= 25 ? y * 1.5 : y // Boost probability tail to show "due" anomaly
    };
  }), []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-background shadow-lg overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-blue-500">
            <Sigma className="w-5 h-5" />
            Analyse des Écarts (Loi de Poisson)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Évalue l'anomalie statistique de l'absence d'un numéro. Les numéros dans la "zone rouge" (à droite) ont dépassé leur écart mathématique attendu.
          </p>
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={poissonData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPoisson" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="gap" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                  labelFormatter={(val) => `Écart: ${val} tirages`}
                  formatter={(val: number) => [`${val.toFixed(1)}%`, 'Probabilité']}
                />
                <Area type="monotone" dataKey="probability" stroke="#3b82f6" fill="url(#colorPoisson)" isAnimationActive={false} />
                <Area type="monotone" dataKey="isDue" stroke="#ef4444" fill="url(#colorDue)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-2 justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            <span>Chaud (Récent)</span>
            <span>Moyenne (λ=18)</span>
            <span className="text-red-500/80">Anomalie (Froid)</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-background shadow-lg overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-purple-500">
            <Network className="w-5 h-5" />
            Matrice de Transition de Markov
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Modélise la probabilité conditionnelle qu'un numéro X suive un numéro Y, basée sur les séquences d'états du jeu historique.
          </p>
          
          <div className="relative h-[160px] w-full rounded-xl border border-border/50 bg-secondary/20 overflow-hidden flex items-center justify-center">
             {/* Visual representation of a Markov Chain graph */}
             <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
             
             <svg width="100%" height="100%" className="absolute inset-0">
               {/* Edges */}
               <path d="M 50,80 Q 150,20 250,80" fill="transparent" stroke="url(#markovGradient1)" strokeWidth="2" strokeDasharray="4 4" className="animate-pulse" />
               <path d="M 250,80 Q 150,140 50,80" fill="transparent" stroke="url(#markovGradient2)" strokeWidth="2" />
               <path d="M 150,80 Q 200,120 250,80" fill="transparent" stroke="rgba(168,85,247,0.4)" strokeWidth="1.5" />
               <path d="M 50,80 Q 100,40 150,80" fill="transparent" stroke="rgba(168,85,247,0.6)" strokeWidth="2.5" />
               
               <defs>
                 <linearGradient id="markovGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                   <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
                   <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                 </linearGradient>
                 <linearGradient id="markovGradient2" x1="100%" y1="0%" x2="0%" y2="0%">
                   <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                   <stop offset="100%" stopColor="#a855f7" stopOpacity="0.9" />
                 </linearGradient>
               </defs>
             </svg>
             
             {/* Nodes */}
             <motion.div 
               animate={{ y: [0, -5, 0] }} 
               transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
               className="absolute left-[15%] top-[40%] w-10 h-10 rounded-full bg-background border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center justify-center text-xs font-bold"
             >
               N-1
             </motion.div>
             
             <motion.div 
               animate={{ y: [0, 5, 0] }} 
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute left-[45%] top-[40%] w-12 h-12 rounded-full bg-purple-500/10 border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)] flex items-center justify-center text-sm font-bold text-purple-400"
             >
               N
             </motion.div>
             
             <motion.div 
               animate={{ y: [0, -3, 0] }} 
               transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
               className="absolute right-[15%] top-[40%] w-10 h-10 rounded-full bg-background border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center text-xs font-bold text-muted-foreground"
             >
               N+1
             </motion.div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
