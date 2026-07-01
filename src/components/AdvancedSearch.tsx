import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DRAW_SCHEDULE, DAYS_ORDER } from "@/types/lottery";
import { ALGORITHM_NAMES } from "@/lib/algorithms/registry";

interface SearchFilters {
  numbers: number[];
  drawNames: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minMatches?: number;
  algorithms: string[];
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onReset: () => void;
}

export const AdvancedSearch = ({ onSearch, onReset }: AdvancedSearchProps) => {
  const [filters, setFilters] = useState<SearchFilters>({
    numbers: [],
    drawNames: [],
    algorithms: []
  });
  const [numberInput, setNumberInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const allDraws = DAYS_ORDER.flatMap(day => DRAW_SCHEDULE[day]);
  const algorithms = ALGORITHM_NAMES;

  const addNumber = () => {
    const num = parseInt(numberInput);
    if (num >= 1 && num <= 90 && !filters.numbers.includes(num)) {
      setFilters(prev => ({
        ...prev,
        numbers: [...prev.numbers, num].sort((a, b) => a - b)
      }));
      setNumberInput("");
    }
  };

  const removeNumber = (num: number) => {
    setFilters(prev => ({
      ...prev,
      numbers: prev.numbers.filter(n => n !== num)
    }));
  };

  const toggleDraw = (drawName: string) => {
    setFilters(prev => ({
      ...prev,
      drawNames: prev.drawNames.includes(drawName)
        ? prev.drawNames.filter(d => d !== drawName)
        : [...prev.drawNames, drawName]
    }));
  };

  const toggleAlgorithm = (algorithm: string) => {
    setFilters(prev => ({
      ...prev,
      algorithms: prev.algorithms.includes(algorithm)
        ? prev.algorithms.filter(a => a !== algorithm)
        : [...prev.algorithms, algorithm]
    }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    setFilters({
      numbers: [],
      drawNames: [],
      algorithms: []
    });
    setNumberInput("");
    onReset();
  };

  const hasActiveFilters = filters.numbers.length > 0 || 
                          filters.drawNames.length > 0 || 
                          filters.dateFrom || 
                          filters.dateTo || 
                          filters.minMatches || 
                          filters.algorithms.length > 0;

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Recherche Avancée
            </CardTitle>
            <CardDescription>
              Filtrez les résultats selon vos critères
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? "Masquer" : "Filtres"}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recherche par numéros */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Rechercher par numéros</label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              max="90"
              placeholder="Numéro (1-90)"
              value={numberInput}
              onChange={(e) => setNumberInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addNumber()}
            />
            <Button onClick={addNumber} size="icon">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          
          {filters.numbers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.numbers.map(num => (
                <Badge key={num} variant="secondary" className="gap-1">
                  {num}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeNumber(num)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {showFilters && (
          <div className="space-y-4 border-t pt-4">
            {/* Tirages */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tirages</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                {allDraws.map(draw => (
                  <div key={draw.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={draw.name}
                      checked={filters.drawNames.includes(draw.name)}
                      onCheckedChange={() => toggleDraw(draw.name)}
                    />
                    <label 
                      htmlFor={draw.name} 
                      className="text-xs cursor-pointer"
                    >
                      {draw.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Période */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date de début</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Date de fin</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Nombre minimum de correspondances */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Correspondances minimum</label>
              <Select 
                value={filters.minMatches?.toString() || ""} 
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  minMatches: value ? parseInt(value) : undefined 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes</SelectItem>
                  <SelectItem value="1">1 ou plus</SelectItem>
                  <SelectItem value="2">2 ou plus</SelectItem>
                  <SelectItem value="3">3 ou plus</SelectItem>
                  <SelectItem value="4">4 ou plus</SelectItem>
                  <SelectItem value="5">5 (jackpot)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Algorithmes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Algorithmes</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {algorithms.map(algo => (
                  <div key={algo} className="flex items-center space-x-2">
                    <Checkbox
                      id={algo}
                      checked={filters.algorithms.includes(algo)}
                      onCheckedChange={() => toggleAlgorithm(algo)}
                    />
                    <label 
                      htmlFor={algo} 
                      className="text-xs cursor-pointer"
                    >
                      {algo}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSearch} className="flex-1 gap-2">
            <Search className="w-4 h-4" />
            Rechercher
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={handleReset}>
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Résumé des filtres actifs */}
        {hasActiveFilters && (
          <div className="text-xs text-muted-foreground">
            Filtres actifs: {[
              filters.numbers.length > 0 && `${filters.numbers.length} numéro(s)`,
              filters.drawNames.length > 0 && `${filters.drawNames.length} tirage(s)`,
              filters.dateFrom && "date début",
              filters.dateTo && "date fin",
              filters.minMatches && `min ${filters.minMatches} correspondances`,
              filters.algorithms.length > 0 && `${filters.algorithms.length} algorithme(s)`
            ].filter(Boolean).join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
};