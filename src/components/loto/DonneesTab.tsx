import React, { useState, useMemo } from "react";
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
  Star,
  Flame,
  Snowflake,
  BarChart3,
  Filter,
  Sparkles,
  ArrowUpDown
} from "lucide-react";
import { useDrawResults, useRefreshResults } from "@/hooks/useDrawResults";
import { NumberBall } from "@/components/NumberBall";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { DrawResult } from "@/hooks/useDrawResults";
import { formatToFrenchDate } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";

interface DonneesTabProps {
  drawName: string;
}

const ResultRow = React.memo(({ result }: { result: DrawResult }) => {
  const sum = useMemo(() => {
    return result.winning_numbers.reduce((acc, curr) => acc + curr, 0);
  }, [result.winning_numbers]);

  const evenCount = useMemo(() => {
    return result.winning_numbers.filter(n => n % 2 === 0).length;
  }, [result.winning_numbers]);

  const oddCount = result.winning_numbers.length - evenCount;

  return (
    <div className="p-3.5 sm:p-4 bg-secondary/15 hover:bg-secondary/35 border border-border/40 hover:border-border/80 rounded-xl transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
      {/* Date and Meta */}
      <div className="flex items-center justify-between md:justify-start gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm text-foreground flex items-center gap-2">
              <span>{formatToFrenchDate(result.draw_date)}</span>
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 h-4 bg-background/50">
                {result.draw_time}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5 flex items-center gap-2">
              <span>Somme: <strong className="text-foreground">{sum}</strong></span>
              <span>•</span>
              <span>Parité: <strong className="text-foreground">{evenCount}P / {oddCount}I</strong></span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Numbers */}
      <div className="flex items-center gap-3 flex-wrap justify-start md:justify-end">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest hidden lg:inline mr-1">
            Gagnants:
          </span>
          {result.winning_numbers.map((num, idx) => (
            <NumberBall key={`w-${idx}`} number={num} size="sm" className="shadow-xs" />
          ))}
        </div>

        {result.machine_numbers && result.machine_numbers.length > 0 && (
          <>
            <div className="w-px h-7 bg-border/60 mx-1 hidden sm:block" />
            <div className="flex gap-1.5 items-center">
              <span className="text-[10px] font-mono text-amber-500 font-semibold hidden lg:flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Machine:
              </span>
              {result.machine_numbers.map((num, idx) => (
                <div key={`m-${idx}`} className="relative group/ball" title="Numéro Machine">
                  <NumberBall 
                    number={num} 
                    size="sm" 
                    className="border-2 border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold" 
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
  const [filterMode, setFilterMode] = useState<"all" | "machine" | "even_heavy" | "odd_heavy">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = 15;
  
  const { data: allResults, isLoading, refetch } = useDrawResults(drawName, 300);
  const refreshResults = useRefreshResults();
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      try {
        await refreshResults();
      } catch (authError) {
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

  // Hot & Cold Numbers Calculation
  const { hotNumbers, coldNumbers } = useMemo(() => {
    if (!allResults || allResults.length === 0) return { hotNumbers: [], coldNumbers: [] };
    
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 90; i++) counts[i] = 0;

    allResults.forEach(r => {
      r.winning_numbers?.forEach(num => {
        if (num >= 1 && num <= 90) counts[num] = (counts[num] || 0) + 1;
      });
    });

    const sorted = Object.entries(counts)
      .map(([num, count]) => ({ num: Number(num), count }))
      .sort((a, b) => b.count - a.count);

    return {
      hotNumbers: sorted.slice(0, 5),
      coldNumbers: sorted.slice(-5).reverse()
    };
  }, [allResults]);

  // Filter and paginate results
  const filteredResults = useMemo(() => {
    if (!allResults) return [];
    
    return allResults.filter(result => {
      // Filter tag matching
      if (filterMode === "machine" && (!result.machine_numbers || result.machine_numbers.length === 0)) {
        return false;
      }
      if (filterMode === "even_heavy") {
        const evens = result.winning_numbers.filter(n => n % 2 === 0).length;
        if (evens < 3) return false;
      }
      if (filterMode === "odd_heavy") {
        const odds = result.winning_numbers.filter(n => n % 2 !== 0).length;
        if (odds < 3) return false;
      }

      // Search term matching
      if (!searchTerm.trim()) return true;
      const searchNum = parseInt(searchTerm.trim());
      if (!isNaN(searchNum)) {
        return result.winning_numbers.includes(searchNum) || result.machine_numbers?.includes(searchNum);
      }
      return result.draw_date.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [allResults, searchTerm, filterMode]);

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedResults = useMemo(() => {
    return filteredResults.slice(
      (page - 1) * itemsPerPage,
      page * itemsPerPage
    );
  }, [filteredResults, page, itemsPerPage]);

  const totalDraws = allResults?.length || 0;
  const latestResult = allResults?.[0];
  const oldestResult = allResults?.[allResults.length - 1];

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5 text-xs font-semibold">
              <Database className="w-3.5 h-3.5 mr-1" /> BD Officielle
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">• 1 à 90</span>
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tight mt-1">
            Historique {drawName}
          </h2>
          <p className="text-xs text-muted-foreground">
            Consultation et exploration statistique des tirages officiels enregistrés
          </p>
        </div>
        
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 rounded-xl h-11 px-5 shadow-xs shrink-0"
          variant="outline"
        >
          <RefreshCw className={cn("w-4 h-4 text-primary", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Actualisation..." : "Actualiser la base"}
        </Button>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/40 border-border/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold font-mono">{totalDraws}</p>
              <p className="text-[11px] text-muted-foreground">Tirages Indexés</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold font-mono truncate">
                {latestResult ? formatToFrenchDate(latestResult.draw_date) : "N/A"}
              </p>
              <p className="text-[11px] text-muted-foreground">Dernier Tirage</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            </div>
            <div>
              <p className="text-xl font-bold font-mono">
                {allResults?.filter(r => r.machine_numbers && r.machine_numbers.length > 0).length || 0}
              </p>
              <p className="text-[11px] text-muted-foreground">Tirages avec Machine</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0 border border-border/40">
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold font-mono truncate">
                {oldestResult ? formatToFrenchDate(oldestResult.draw_date) : "N/A"}
              </p>
              <p className="text-[11px] text-muted-foreground">Premier Tirage</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hot & Cold Numbers Widget */}
      {hotNumbers.length > 0 && (
        <Card className="bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-950/80 border-border/50 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-border/30">
              {/* Hot Numbers */}
              <div className="space-y-2 pb-3 md:pb-0 md:pr-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20" />
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-400 font-mono">
                    Top 5 Numéros Chauds (Fréquence Max)
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {hotNumbers.map(({ num, count }) => (
                    <div key={`hot-${num}`} className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg">
                      <NumberBall number={num} size="sm" />
                      <span className="text-[11px] font-mono text-orange-300 font-semibold">{count}x</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cold Numbers */}
              <div className="space-y-2 pt-3 md:pt-0 md:pl-4">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300 font-mono">
                    Top 5 Numéros Froids (Fréquence Min)
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {coldNumbers.map(({ num, count }) => (
                    <div key={`cold-${num}`} className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-lg">
                      <NumberBall number={num} size="sm" />
                      <span className="text-[11px] font-mono text-sky-300 font-semibold">{count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest Result Banner */}
      {latestResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border-primary/30 shadow-md overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <CardContent className="p-5 sm:p-6 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  <span className="text-sm font-bold tracking-tight text-foreground">Dernier Résultat Publié</span>
                </div>
                <Badge variant="secondary" className="bg-background/80 backdrop-blur text-xs font-mono border border-border/50 w-fit">
                  {formatToFrenchDate(latestResult.draw_date)} • {latestResult.draw_time}
                </Badge>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-2">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Numéros Gagnants</span>
                  <div className="flex justify-center gap-2.5 flex-wrap">
                    {latestResult.winning_numbers.map((num, idx) => (
                      <NumberBall key={idx} number={num} size="md" className="shadow-md" />
                    ))}
                  </div>
                </div>

                {latestResult.machine_numbers && latestResult.machine_numbers.length > 0 && (
                  <>
                    <div className="w-px h-12 bg-border/60 hidden md:block" />
                    <div className="h-px w-full bg-border/40 md:hidden my-1" />
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-amber-500 flex items-center gap-1 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Numéros Machine
                      </span>
                      <div className="flex justify-center gap-2.5 flex-wrap">
                        {latestResult.machine_numbers.map((num, idx) => (
                          <NumberBall 
                            key={idx} 
                            number={num} 
                            size="md" 
                            className="border-2 border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shadow-md" 
                          />
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

      {/* Search & Filter bar */}
      <Card className="bg-card/60 backdrop-blur-md border-border/40 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Historique Chronologique
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {/* Quick filter pills */}
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/30 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant={filterMode === "all" ? "default" : "ghost"}
                  onClick={() => { setFilterMode("all"); setPage(1); }}
                  className="h-7 text-xs rounded-lg px-2.5"
                >
                  Tous
                </Button>
                <Button
                  size="sm"
                  variant={filterMode === "machine" ? "default" : "ghost"}
                  onClick={() => { setFilterMode("machine"); setPage(1); }}
                  className="h-7 text-xs rounded-lg px-2.5"
                >
                  Machine
                </Button>
                <Button
                  size="sm"
                  variant={filterMode === "even_heavy" ? "default" : "ghost"}
                  onClick={() => { setFilterMode("even_heavy"); setPage(1); }}
                  className="h-7 text-xs rounded-lg px-2.5"
                >
                  Majorité Pairs
                </Button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher (ex: 28 ou 2024)..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-9 bg-secondary/30 border-border/40 focus:border-primary rounded-xl text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Activity className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Chargement des données historiques...</p>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                {paginatedResults.map((result) => (
                  <ResultRow key={result.id} result={result} />
                ))}
                
                {paginatedResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-xl bg-secondary/10">
                    <AlertCircle className="w-10 h-10 mb-2 opacity-40 text-primary" />
                    <p className="text-sm font-semibold">{searchTerm ? "Aucun résultat ne correspond à votre recherche" : "Aucun historique disponible"}</p>
                    {searchTerm && (
                      <Button variant="link" size="sm" onClick={() => setSearchTerm("")} className="text-xs mt-1">
                        Effacer la recherche
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-border/30">
                  <p className="text-xs text-muted-foreground font-mono">
                    Affichage de <strong className="text-foreground">{paginatedResults.length}</strong> sur <strong className="text-foreground">{filteredResults.length}</strong> tirages (Page {page}/{totalPages})
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="border-border/40 rounded-lg h-8 px-3 text-xs gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Précédent
                    </Button>
                    <span className="text-xs font-mono px-2 py-1 bg-secondary/50 rounded border border-border/30">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="border-border/40 rounded-lg h-8 px-3 text-xs gap-1"
                    >
                      Suivant <ChevronRight className="w-3.5 h-3.5" />
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

