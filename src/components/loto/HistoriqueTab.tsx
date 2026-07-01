import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Search, Filter, Calendar, Trophy, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NumberBall } from "@/components/NumberBall";
import { useDrawResultsPaginated, DrawResult } from "@/hooks/useDrawResults";
import { DRAW_SCHEDULE } from "@/types/lottery";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface HistoriqueTabProps {
  drawName: string;
}

export const HistoriqueTab = ({ drawName }: HistoriqueTabProps) => {
  const [selectedDraw, setSelectedDraw] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const allDraws = useMemo(() => Object.values(DRAW_SCHEDULE).flat(), []);

  const { data, isLoading } = useDrawResultsPaginated(
    selectedDraw === "all" ? undefined : selectedDraw,
    page,
    50
  );

  // Filter by search query (number or date)
  const filteredResults = useMemo(() => {
    if (!data?.data) return [];
    if (!searchQuery.trim()) return data.data;

    const query = searchQuery.trim().toLowerCase();
    
    return data.data.filter((result) => {
      // Search by number
      if (/^\d+$/.test(query)) {
        const num = parseInt(query);
        return result.winning_numbers.includes(num);
      }
      
      // Search by date
      if (result.draw_date.includes(query)) return true;
      
      // Search by draw name
      if (result.draw_name.toLowerCase().includes(query)) return true;
      
      return false;
    });
  }, [data?.data, searchQuery]);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-primary to-purple-400 bg-clip-text text-transparent">
          Archives Cosmiques
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          {data?.count || 0} tirages dans l'historique
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro ou date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary/30 border-border/30"
          />
        </div>

        {/* Draw Filter */}
        <Select value={selectedDraw} onValueChange={setSelectedDraw}>
          <SelectTrigger className="w-full sm:w-[180px] bg-secondary/30 border-border/30">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Tous les tirages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les tirages</SelectItem>
            {allDraws.map((draw) => (
              <SelectItem key={draw.name} value={draw.name}>
                {draw.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Results List */}
      <div className="space-y-2">
        {isLoading ? (
          // Loading skeleton
          [...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-secondary/30 animate-pulse"
            />
          ))
        ) : filteredResults.length === 0 ? (
          <Card className="bg-secondary/20 border-border/30">
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun résultat trouvé</p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredResults.map((result, index) => (
              <DrawResultRow
                key={result.id}
                result={result}
                index={index}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center gap-2 pt-4"
        >
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className={cn(
              "px-4 py-2 rounded-lg transition-all",
              "bg-secondary/30 hover:bg-secondary/50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Précédent
          </button>
          <span className="px-4 py-2 text-sm text-muted-foreground">
            Page {page} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(data.totalPages, page + 1))}
            disabled={page === data.totalPages}
            className={cn(
              "px-4 py-2 rounded-lg transition-all",
              "bg-secondary/30 hover:bg-secondary/50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Suivant
          </button>
        </motion.div>
      )}
    </div>
  );
};

// Individual result row
const DrawResultRow = React.memo(({ result, index }: { result: DrawResult; index: number }) => {
  const formattedDate = useMemo(() => {
    try {
      return format(parseISO(result.draw_date), "dd MMM yyyy", { locale: fr });
    } catch {
      return result.draw_date;
    }
  }, [result.draw_date]);

  // Simulate match count (in production, compare with stored predictions)
  const matchCount = useMemo(() => {
    // This would normally compare against stored predictions
    // For now, just show a random badge occasionally for demo
    return Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 3 : 0;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-sm",
        "border border-border/30 hover:border-border/50 transition-all",
        "group"
      )}
    >
      {/* Highlight for matches */}
      {matchCount >= 3 && (
        <div className={cn(
          "absolute inset-y-0 left-0 w-1",
          matchCount >= 5 ? "bg-success" :
          matchCount >= 4 ? "bg-warning" :
          "bg-info"
        )} />
      )}

      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Date & Draw Info */}
        <div className="flex items-center gap-3 min-w-[140px]">
          <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">{formattedDate}</p>
            <p className="text-xs text-muted-foreground">{result.draw_name}</p>
          </div>
        </div>

        {/* Numbers */}
        <div className="flex-1 flex flex-wrap gap-2 justify-center sm:justify-start">
          {result.winning_numbers.map((num, i) => (
            <div key={`w-${i}`}>
              <NumberBall 
                number={num}
                size="sm"
                className="w-10 h-10 text-sm group-hover:scale-105 transition-transform"
              />
            </div>
          ))}
          
          {/* Machine numbers (star) */}
          {result.machine_numbers && result.machine_numbers.length > 0 && (
            <>
              <div className="w-px h-10 bg-border/50 mx-2 hidden sm:block" />
              {result.machine_numbers.map((num, i) => (
                <div key={`m-${i}`} className="relative group-hover:scale-105 transition-transform">
                  <Star className="absolute -top-1 -right-1 w-3 h-3 text-warning fill-warning z-10" />
                  <NumberBall 
                    number={num}
                    size="sm"
                    className="w-10 h-10 text-sm border-2 border-warning/50"
                  />
                </div>
              ))}
            </>
          )}
        </div>

        {/* Match Badge */}
        {matchCount >= 3 && (
          <Badge 
            className={cn(
              "gap-1 self-start sm:self-center",
              matchCount >= 5 ? "bg-success text-success-foreground" :
              matchCount >= 4 ? "bg-warning text-warning-foreground" :
              "bg-info text-info-foreground"
            )}
          >
            <Trophy className="w-3 h-3" />
            {matchCount} numéros
          </Badge>
        )}
      </div>
    </motion.div>
  );
});
