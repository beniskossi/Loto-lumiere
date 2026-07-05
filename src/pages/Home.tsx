import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DRAW_SCHEDULE, DAYS_ORDER } from "@/types/lottery";
import { Clock, Calendar, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Shield, LogOut } from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollToTop } from "@/components/loto/ScrollToTop";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
  };

  const getDayColor = (dayIndex: number) => {
    const colors = [
      "from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/10 border-red-500/20 text-red-700 dark:text-red-400", // Lundi
      "from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400", // Mardi
      "from-yellow-500/10 to-yellow-500/5 dark:from-yellow-500/20 dark:to-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400", // Mercredi
      "from-green-500/10 to-green-500/5 dark:from-green-500/20 dark:to-green-500/10 border-green-500/20 text-green-700 dark:text-green-400", // Jeudi
      "from-cyan-500/10 to-cyan-500/5 dark:from-cyan-500/20 dark:to-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400", // Vendredi
      "from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400", // Samedi
      "from-purple-500/10 to-purple-500/5 dark:from-purple-500/20 dark:to-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400", // Dimanche
    ];
    return colors[dayIndex % colors.length];
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden pb-12">
      {/* Background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/8" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[150px] dark:bg-accent/8" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display font-extrabold text-xl tracking-tight text-foreground">LOTO LUMIÈRE</h1>
                <p className="font-mono text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Sélection de Tirage</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate("/admin")}
                  className="text-muted-foreground hover:text-foreground w-9 h-9"
                  title="Administration"
                >
                  <Shield className="w-4 h-4" />
                </Button>
              )}
              <ThemeToggle />
              {user && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground w-9 h-9"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-display font-bold mb-3 tracking-tight">Choisissez un Tirage</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Accédez à l'historique complet, aux statistiques détaillées et aux prédictions avancées pour chaque tirage de la Loterie Nationale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DAYS_ORDER.map((day, index) => {
            const draws = DRAW_SCHEDULE[day] || [];
            const dayStyle = getDayColor(index);
            
            return (
              <Card key={day} className="border-border/50 bg-secondary/10 shadow-sm overflow-hidden flex flex-col h-full">
                <CardHeader className={`pb-4 border-b bg-gradient-to-br ${dayStyle}`}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <CardTitle className="text-lg font-bold">{day}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <div className="divide-y divide-border/30 flex flex-col h-full">
                    {draws.map((draw) => (
                      <button
                        key={draw.name}
                        onClick={() => navigate(`/tirage/${encodeURIComponent(draw.name)}`)}
                        className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors text-left group w-full"
                      >
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {draw.name}
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1.5 font-mono bg-background/50">
                          <Clock className="w-3 h-3" />
                          {draw.time}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
      
      <ScrollToTop />
    </div>
  );
};

export default Home;
