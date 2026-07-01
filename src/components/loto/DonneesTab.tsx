import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Database, 
  Search, 
  RefreshCw, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  Star
} from "lucide-react";
import { useDrawResults, useRefreshResults } from "@/hooks/useDrawResults";
import { NumberBall } from "@/components/NumberBall";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { DrawResult } from "@/hooks/useDrawResults";

interface DonneesTabProps {
  drawName: string;
}

const ResultRow = React.memo(({ result }: { result: DrawResult }) => {
  return (
    <div className="p-3 bg-secondary/20 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-secondary/40 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-medium">{result.draw_date}</span>
          <Badge variant="secondary" className="text-xs">
            {result.draw_time}
          </Badge>
        </div>
      </div>
      
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {result.winning_numbers.map((num, idx) => (
            <NumberBall key={`w-${idx}`} number={num} size="sm" />
          ))}
        </div>

        {result.machine_numbers && result.machine_numbers.length > 0 && (
          <>
            <div className="w-px h-6 bg-border/60 mx-1 hidden sm:block" />
            <div className="flex gap-1.5 items-center">
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 hidden lg:inline flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Machine:
              </span>
              {result.machine_numbers.map((num, idx) => (
                <div key={`m-${idx}`} className="relative group/ball" title="Numéro Machine">
                  <NumberBall 
                    number={num} 
                    size="sm" 
                    className="border-2 border-amber-500/50 bg-amber-500/5 text-amber-600 dark:text-amber-400" 
                  />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 flex items-center justify-center border border-background">
                    <Star className="w-1.5 h-1.5 fill-white text-white" />
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export const DonneesTab = ({ drawName }: DonneesTabProps) => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = 15;
  
  const { data: allResults, isLoading, refetch } = useDrawResults(drawName, 300);
  const refreshResults = useRefreshResults();
  const queryClient = useQueryClient();

  // Handle refresh - works for both authenticated and non-authenticated users
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // First try edge function for authenticated users
      try {
        await refreshResults();
      } catch (authError) {
        // If auth fails, just refetch from cache - still useful
        console.log("Auth not available, refreshing from database only");
      }
      await queryClient.invalidateQueries({ queryKey: ["draw-results"] });
      await refetch();
      toast.success("Données actualisées");
    } catch (error) {
      console.error("Refresh error:", error);
      toast.error("Erreur lors de l'actualisation");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter and paginate results
  const filteredResults = allResults?.filter(result => {
    if (!searchTerm) return true;
    const searchNum = parseInt(searchTerm);
    if (!isNaN(searchNum)) {
      return result.winning_numbers.includes(searchNum);
    }
    return result.draw_date.includes(searchTerm);
  }) || [];

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedResults = filteredResults.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Calculate stats
  const totalDraws = allResults?.length || 0;
  const latestResult = allResults?.[0];
  const oldestResult = allResults?.[allResults.length - 1];

  return (
    <div className="space-y-6 pb-24">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Données - {drawName}</h2>
          <p className="text-sm text-muted-foreground">
            Historique complet du tirage sélectionné
          </p>
        </div>
        
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? "Actualisation..." : "Actualiser"}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-secondary/30 border-border/30">
            <CardContent className="p-4 text-center">
              <Database className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalDraws}</p>
              <p className="text-xs text-muted-foreground">Tirages</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-secondary/30 border-border/30">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium truncate">
                {latestResult?.draw_date || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Plus récent</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-secondary/30 border-border/30">
            <CardContent className="p-4 text-center">
              <Calendar className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium truncate">
                {oldestResult?.draw_date || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Plus ancien</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Latest Result Highlight */}
      {latestResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">Dernier Résultat</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {latestResult.draw_date} - {latestResult.draw_time}
                </Badge>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Numéros Gagnants</span>
                  <div className="flex justify-center gap-2">
                    {latestResult.winning_numbers.map((num, idx) => (
                      <NumberBall key={idx} number={num} size="md" />
                    ))}
                  </div>
                </div>

                {latestResult.machine_numbers && latestResult.machine_numbers.length > 0 && (
                  <>
                    <div className="w-px h-12 bg-border/60 hidden md:block" />
                    <div className="h-px w-full bg-border/40 md:hidden my-1" />
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Numéros Machine
                      </span>
                      <div className="flex justify-center gap-2">
                        {latestResult.machine_numbers.map((num, idx) => (
                          <div key={idx} className="relative">
                            <NumberBall 
                              number={num} 
                              size="md" 
                              className="border-2 border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search & History */}
      <Card className="bg-card/50 backdrop-blur border-border/30">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Historique Complet
            </CardTitle>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (date ou numéro)"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 bg-secondary/50 border-border/30"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Activity className="w-8 h-8 animate-pulse text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedResults.map((result) => (
                  <ResultRow key={result.id} result={result} />
                ))}
                
                {paginatedResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
                    <p>{searchTerm ? "Aucun résultat trouvé" : "Aucun historique disponible"}</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
                  <p className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages} ({filteredResults.length} résultats)
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="border-border/30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="border-border/30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
