import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTrackedPredictions } from "@/hooks/usePredictionTracking";
import { usePaginatedQuery, PaginatedResponse } from "@/hooks/usePaginatedQuery";
import { useAuth } from "@/hooks/useAuth";
import { NumberBall } from "./NumberBall";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Filter } from "lucide-react";
import { MobilePagination } from "./MobilePagination";

export const TrackedPredictionsDisplay = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDraw, setSelectedDraw] = useState<string>("all");
  const itemsPerPage = 10;
  
  const { data: paginatedData, isLoading } = usePaginatedQuery<any>(
    "user_prediction_tracking",
    ["tracked-predictions", user?.id || "", selectedDraw],
    { page: currentPage, pageSize: itemsPerPage, orderBy: "marked_at", ascending: false },
    { user_id: user?.id }
  );
  
  const paginatedPredictions = paginatedData?.data || [];
  const totalPages = paginatedData?.totalPages || 0;
  const totalCount = paginatedData?.count || 0;
  
  // Get draw names for filter
  const { data: allPredictions } = useTrackedPredictions(user?.id);
  const drawNames = Array.from(new Set((allPredictions || []).map((p: any) => p.predictions?.draw_name).filter(Boolean)));
  
  const handleDrawChange = (value: string) => {
    setSelectedDraw(value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasNoPredictions = totalCount === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Historique de Prédictions
        </CardTitle>
        <CardDescription>
          {hasNoPredictions ? "Aucune prédiction sauvegardée" : `${totalCount} prédiction${totalCount > 1 ? 's' : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasNoPredictions && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedDraw} onValueChange={handleDrawChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrer par tirage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les tirages</SelectItem>
                {drawNames.map((drawName: string) => (
                  <SelectItem key={drawName} value={drawName}>
                    {drawName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {hasNoPredictions ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune prédiction sauvegardée pour le moment
          </p>
        ) : paginatedPredictions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune prédiction pour ce tirage
          </p>
        ) : (
          <>
          {paginatedPredictions.map((tracked: any) => (
          <div key={tracked.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="outline">{tracked.predictions.draw_name}</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Prédiction du {new Date(tracked.predictions.prediction_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Sauvegardé le {new Date(tracked.marked_at).toLocaleDateString()}
                </p>
                {tracked.predictions.confidence_score && (
                  <Badge variant="secondary" className="mt-1">
                    {Math.round(tracked.predictions.confidence_score * 100)}% confiance
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {tracked.predictions.predicted_numbers.map((num: number) => (
                <NumberBall key={num} number={num} />
              ))}
            </div>

            {tracked.notes && (
              <p className="text-sm text-muted-foreground italic">{tracked.notes}</p>
            )}

            <p className="text-xs text-muted-foreground">
              Modèle: {tracked.predictions.model_used}
            </p>
          </div>
        ))}
          </>
        )}
        
        <MobilePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalCount}
          className="pt-4 border-t"
        />
      </CardContent>
    </Card>
  );
};