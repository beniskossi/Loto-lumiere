import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Database, CheckCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DataQualityDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["data-quality-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('draw_results')
        .select('status');
      
      if (error) throw error;
      
      const total = data.length;
      const approved = data.filter(d => d.status === 'Approuve' || d.status === 'Publie').length;
      const validation = data.filter(d => d.status === 'En_validation' || d.status === 'Brouillon').length;
      const rejected = data.filter(d => d.status === 'Rejete').length;
      
      return { total, approved, validation, rejected };
    }
  });

  if (isLoading) return <div>Chargement des statistiques...</div>;

  const total = stats?.total || 0;
  const approved = stats?.approved || 0;
  const validation = stats?.validation || 0;
  const rejected = stats?.rejected || 0;
  const completeness = total > 0 ? (approved / total) * 100 : 0;

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Database className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <CardTitle>Qualité des Données & Traçabilité</CardTitle>
            <CardDescription>
              État de validation de la base de tirages
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 flex flex-col gap-1">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Database className="w-4 h-4" /> Total Tirages
            </span>
            <span className="text-2xl font-bold">{total}</span>
          </div>
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex flex-col gap-1">
            <span className="text-sm text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Approuvés / Publiés
            </span>
            <span className="text-2xl font-bold text-green-500">{approved}</span>
          </div>
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex flex-col gap-1">
            <span className="text-sm text-yellow-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> En Validation
            </span>
            <span className="text-2xl font-bold text-yellow-500">{validation}</span>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex flex-col gap-1">
            <span className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Rejetés / Suspects
            </span>
            <span className="text-2xl font-bold text-red-500">{rejected}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Taux de données validées</span>
            <span className="text-green-400">{completeness.toFixed(1)}%</span>
          </div>
          <Progress value={completeness} className="h-2 bg-slate-800" />
        </div>
      </CardContent>
    </Card>
  );
};
