import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const DrawResultsSkeleton = () => {
  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-card border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div>
              <Skeleton className="h-3 w-24 mb-2" />
              <div className="flex gap-2">
                {[...Array(5)].map((_, j) => (
                  <Skeleton key={j} className="h-12 w-12 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export const StatisticsSkeleton = () => {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <Card key={i} className="bg-gradient-card border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(10)].map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const PredictionSkeleton = () => {
  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="p-6 bg-gradient-primary rounded-lg">
          <Skeleton className="h-4 w-48 mb-4 bg-white/20" />
          <div className="flex gap-3 justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-full bg-white/20" />
            ))}
          </div>
          <Skeleton className="h-2 w-full bg-white/20" />
        </div>
      </CardContent>
    </Card>
  );
};
