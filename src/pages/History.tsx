import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, History as HistoryIcon, Search, Calendar, Filter } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useDrawResults } from "@/hooks/useDrawResults";
import { DrawResultsSkeleton } from "@/components/LoadingSkeleton";
import { NumberBall } from "@/components/NumberBall";
import { DRAW_SCHEDULE } from "@/types/lottery";
import { UserNav } from "@/components/UserNav";
import { MobilePagination } from "@/components/MobilePagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MainNav } from "@/components/MainNav";
import { HistorySummaryStats } from "@/components/HistorySummaryStats";
import { PredictionVsResultsComparison } from "@/components/PredictionVsResultsComparison";
import { DataExporter } from "@/components/DataExporter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const History = () => {
  const navigate = useNavigate();
  const { data: allResults = [], isLoading } = useDrawResults(undefined, 1000);
  const [searchDate, setSearchDate] = useState("");
  const [filterDraw, setFilterDraw] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const allDraws = Object.values(DRAW_SCHEDULE).flat();

  const filteredResults = useMemo(() => {
    return allResults.filter((result) => {
      const matchesDate = !searchDate || result.draw_date.includes(searchDate);
      const matchesDraw = filterDraw === "all" || result.draw_name === filterDraw;
      return matchesDate && matchesDraw;
    });
  }, [allResults, searchDate, filterDraw]);

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredResults, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      {/* Background ambient blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[150px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all duration-300">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex h-16 items-center justify-between">
            <MainNav />
            
            <div className="flex items-center gap-2 px-4">
              <HistoryIcon className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-extrabold tracking-tight font-display text-foreground hidden sm:block uppercase">
                Historique
              </h1>
            </div>

            <UserNav />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 flex-1">
        <Breadcrumbs />
        
        <div className="text-center mb-10 mt-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3 font-display">
            Historique des Tirages
          </h2>
          <p className="text-sm font-medium text-muted-foreground/80">
            Consultez tous les résultats passés avec filtres avancés
          </p>
        </div>

        {!isLoading && filteredResults.length > 0 && (
          <HistorySummaryStats results={filteredResults} />
        )}

        <PredictionVsResultsComparison />

        <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filtres de Recherche
            </CardTitle>
            <CardDescription>
              Affinez votre recherche avec les filtres ci-dessous
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </label>
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  placeholder="Rechercher par date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Tirage
                </label>
                <Select value={filterDraw} onValueChange={setFilterDraw}>
                  <SelectTrigger>
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
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 animate-slide-up">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span>Résultats ({filteredResults.length})</span>
              <div className="flex items-center gap-2">
                {(searchDate || filterDraw !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchDate("");
                      setFilterDraw("all");
                      setCurrentPage(1);
                    }}
                    className="h-9"
                  >
                    Réinitialiser
                  </Button>
                )}
                <DataExporter
                  data={filteredResults}
                  defaultFileName="loto-lumiere-historique"
                  buttonText="Exporter ces résultats"
                  variant="outline"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <DrawResultsSkeleton />
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HistoryIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Aucun résultat trouvé pour ces critères</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tirage</TableHead>
                      <TableHead>Numéros Gagnants</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResults.map((result) => (
                      <TableRow 
                        key={result.id}
                        className="hover:bg-accent/5 transition-colors"
                      >
                        <TableCell className="font-medium">
                          {new Date(result.draw_date).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-semibold">{result.draw_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.draw_day} • {result.draw_time}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Numéros Gagnants</p>
                              <div className="flex gap-2 flex-wrap">
                                {result.winning_numbers.map((num, idx) => (
                                  <NumberBall key={`${num}-${idx}`} number={num} size="sm" />
                                ))}
                              </div>
                            </div>
                            {result.machine_numbers && result.machine_numbers.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Numéros Machine</p>
                                <div className="flex gap-2 flex-wrap">
                                  {result.machine_numbers.map((num, idx) => (
                                    <NumberBall key={`${num}-${idx}`} number={num} size="sm" className="opacity-70" />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/tirage/${result.draw_name}`)}
                          >
                            Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            <MobilePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={filteredResults.length}
              className="mt-6"
            />
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default History;
