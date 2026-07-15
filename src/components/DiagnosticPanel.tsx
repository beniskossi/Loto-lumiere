import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Info,
  Monitor,
  Wifi,
  Database,
  Smartphone
} from "lucide-react";
import { runDiagnostics, getSystemInfo, runMathematicalValidation, type DiagnosticResult } from "@/utils/diagnostics";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Cpu } from "lucide-react";

export interface SystemInfo {
  userAgent: string;
  platform: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  viewport: {
    width: number;
    height: number;
  };
  timestamp: string;
}

export interface MathValidationCheck {
  name: string;
  status: 'ok' | 'error';
  message: string;
}

export interface MathValidationResult {
  success: boolean;
  checks: MathValidationCheck[];
}

export const DiagnosticPanel = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [mathValidation, setMathValidation] = useState<MathValidationResult | null>(null);

  const runAllDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await runDiagnostics();
      setDiagnostics(results);
      setSystemInfo(getSystemInfo());
      setMathValidation(runMathematicalValidation());
      
      // Test de connexion à la base de données
      try {
        const { error } = await supabase.from('draw_results').select('count').limit(1);
        setDbStatus(error ? 'error' : 'ok');
      } catch {
        setDbStatus('error');
      }
    } catch (error) {
      console.error('Erreur lors du diagnostic:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAllDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ok: 'default',
      warning: 'secondary',
      error: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const isMobile = systemInfo?.viewport?.width < 768;

  return (
    <Card className="w-full bg-card border-border/50 shadow-sm animate-fade-in hover:shadow-glow transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Monitor className="w-5 h-5 text-primary" />
              </div>
              Diagnostic de l'Application
            </CardTitle>
            <CardDescription className="text-base mt-1">
              Vérification de l'état des composants et fonctionnalités
            </CardDescription>
          </div>
          <Button 
            onClick={runAllDiagnostics} 
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4 p-1.5 bg-muted/50 rounded-xl mb-4">
            <TabsTrigger value="status" className="rounded-lg data-[state=active]:shadow-sm text-xs">État</TabsTrigger>
            <TabsTrigger value="system" className="rounded-lg data-[state=active]:shadow-sm text-xs">Système</TabsTrigger>
            <TabsTrigger value="math_validation" className="rounded-lg data-[state=active]:shadow-sm text-xs">Sécurité ML</TabsTrigger>
            <TabsTrigger value="fixes" className="rounded-lg data-[state=active]:shadow-sm text-xs">Solutions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4">
            {/* Statut de la base de données */}
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Connexion Base de Données</span>
                {getStatusBadge(dbStatus === 'checking' ? 'warning' : dbStatus)}
              </AlertDescription>
            </Alert>

            {/* Résultats des diagnostics */}
            <div className="space-y-3">
              {diagnostics.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium text-sm">{result.component}</p>
                      <p className="text-xs text-muted-foreground">{result.message}</p>
                      {result.details && (
                        <p className="text-xs text-muted-foreground mt-1">{result.details}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              ))}
            </div>

            {/* Statut mobile */}
            {isMobile && (
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  Interface mobile détectée - Optimisations actives
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="system" className="space-y-4">
            {systemInfo && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Navigateur</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div><strong>Platform:</strong> {systemInfo.platform}</div>
                      <div><strong>Langue:</strong> {systemInfo.language}</div>
                      <div><strong>Cookies:</strong> {systemInfo.cookieEnabled ? '✓' : '✗'}</div>
                      <div className="flex items-center gap-2">
                        <Wifi className="w-3 h-3" />
                        <strong>Réseau:</strong> {systemInfo.onLine ? 'En ligne' : 'Hors ligne'}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Écran</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div><strong>Résolution:</strong> {systemInfo.screen.width}×{systemInfo.screen.height}</div>
                      <div><strong>Viewport:</strong> {systemInfo.viewport.width}×{systemInfo.viewport.height}</div>
                      <div><strong>Couleurs:</strong> {systemInfo.screen.colorDepth} bits</div>
                      <div><strong>Type:</strong> {isMobile ? 'Mobile' : 'Desktop'}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">User Agent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs font-mono break-all">{systemInfo.userAgent}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="math_validation" className="space-y-4 animate-fade-in">
            <Alert className="bg-primary/5 border-primary/20">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <AlertDescription className="flex items-center justify-between w-full">
                <div>
                  <span className="font-semibold block text-sm">Garanties Anti-Hallucinations & Anti-Hasard</span>
                  <span className="text-xs text-muted-foreground block mt-0.5">Vérification de la rigueur mathématique et de l'intégrité déterministe du moteur de calcul.</span>
                </div>
                {mathValidation?.success ? (
                  <Badge className="bg-green-500 hover:bg-green-600 ml-2">VALIDÉ</Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2">ERREUR</Badge>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {mathValidation?.checks ? (
                mathValidation.checks.map((check: MathValidationCheck, idx: number) => (
                  <div key={idx} className="p-3 border rounded-lg bg-card/50 flex items-center justify-between gap-3 border-border/60">
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm text-foreground flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                        {check.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{check.message}</p>
                    </div>
                    <Badge variant={check.status === 'ok' ? 'default' : 'destructive'} className="uppercase text-[10px] whitespace-nowrap">
                      {check.status === 'ok' ? 'Conforme' : 'Échec'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Lancement des simulations mathématiques...</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="fixes" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Solutions aux Problèmes Courants</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-red-600">❌ Variables d'environnement manquantes</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p><strong>Solution:</strong> Configurer les variables Supabase</p>
                    <code className="block bg-muted p-2 rounded text-xs">
                      VITE_SUPABASE_URL=your_url<br/>
                      VITE_SUPABASE_ANON_KEY=your_key
                    </code>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-yellow-600">⚠️ Fonctionnalités limitées hors ligne</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs">
                    <p><strong>Solution:</strong> Vérifier la connexion internet pour accéder aux données en temps réel</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-600">ℹ️ Performance sur mobile</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs">
                    <p><strong>Optimisations:</strong> Interface adaptative, lazy loading, cache local</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-600">✅ Tout fonctionne</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs">
                    <p>L'application est entièrement fonctionnelle. Toutes les fonctionnalités sont disponibles.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};