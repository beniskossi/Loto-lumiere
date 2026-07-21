import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Trophy, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  FileText, 
  HeartHandshake, 
  ArrowLeft 
} from "lucide-react";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

const emailSchema = z.string().email("Format d'e-mail incorrect");
const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères");

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Recovery flow state
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);

      const { error } = await signIn(loginEmail, loginPassword);

      if (error) {
        if (error.message.includes("Invalid login credentials") || error.message.includes("does not exist")) {
          toast({
            title: "Identifiants invalides",
            description: "L'adresse e-mail ou le mot de passe est incorrect.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur de connexion",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Connexion établie",
          description: "Bienvenue dans votre suite analytique LOTO LUMIÈRE.",
        });
        navigate("/");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erreur de saisie",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [loginEmail, loginPassword, signIn, navigate, toast]);

  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);

      if (signupPassword !== confirmPassword) {
        toast({
          title: "Mot de passe différent",
          description: "La confirmation ne correspond pas au mot de passe saisi.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await signUp(signupEmail, signupPassword, signupFullName);

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Compte existant",
            description: "Cet e-mail est déjà associé à un compte d'analyste.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur d'inscription",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Compte initié avec succès !",
          description: "Veuillez consulter votre boîte mail pour valider votre inscription.",
        });
        // Clear form
        setSignupEmail("");
        setSignupPassword("");
        setSignupFullName("");
        setConfirmPassword("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erreur de saisie",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [signupEmail, signupPassword, confirmPassword, signupFullName, signUp, toast]);

  const handleRecovery = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      emailSchema.parse(recoveryEmail);
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      setRecoverySent(true);
      toast({
        title: "Lien de récupération envoyé",
        description: "Veuillez vérifier votre boîte de réception pour réinitialiser votre mot de passe.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur de récupération",
        description: error instanceof z.ZodError ? error.errors[0].message : error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [recoveryEmail, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1017]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0d1017] text-foreground font-sans">
      <div className="w-full max-w-md space-y-6">
        
        {/* Upper Brand Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-primary/10 border border-primary/20 rounded-full mb-2">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 font-display">LOTO LUMIÈRE</h1>
          <p className="text-sm text-slate-400">
            Suite professionnelle d'analyse stochastique et d'aide à la décision
          </p>
        </div>

        {isRecoveryMode ? (
          /* Password Recovery Card */
          <Card className="bg-[#121620] border border-border/40 shadow-xl rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => { setIsRecoveryMode(false); setRecoverySent(false); }}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <CardTitle className="text-lg font-bold">Récupération de compte</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Saisissez votre e-mail pour obtenir un lien de réinitialisation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recoverySent ? (
                <div className="space-y-4 py-2 text-center">
                  <div className="inline-flex p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Un e-mail contenant les instructions de récupération a été envoyé à <strong className="text-slate-100">{recoveryEmail}</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pensez à vérifier votre dossier de courrier indésirable (Spam) si vous ne recevez rien dans les 5 minutes.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRecovery} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recovery-email" className="text-sm font-semibold">Adresse e-mail</Label>
                    <Input
                      id="recovery-email"
                      type="email"
                      placeholder="analyste@lotolumiere.com"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-[#181d2a] border-border/30 rounded-xl text-sm py-5"
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-xl py-5 text-sm font-semibold" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Traitement en cours...
                      </>
                    ) : (
                      "Recevoir le lien d'accès"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Normal Sign In / Sign Up Card */
          <Card className="bg-[#121620] border border-border/40 shadow-xl rounded-2xl">
            <CardContent className="p-6">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 p-1 bg-[#1a1f2e] border border-border/20 rounded-xl mb-6">
                  <TabsTrigger value="login" className="rounded-lg text-sm font-semibold py-2.5 data-[state=active]:bg-[#121620] data-[state=active]:text-primary">
                    Connexion
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg text-sm font-semibold py-2.5 data-[state=active]:bg-[#121620] data-[state=active]:text-primary">
                    Inscription
                  </TabsTrigger>
                </TabsList>

                {/* Login tab content */}
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-semibold">Adresse e-mail</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="analyste@lotolumiere.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="bg-[#181d2a] border-border/30 rounded-xl text-sm py-5 focus-visible:ring-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password" className="text-sm font-semibold">Mot de passe</Label>
                        <button
                          type="button"
                          onClick={() => setIsRecoveryMode(true)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          disabled={isLoading}
                          className="bg-[#181d2a] border-border/30 rounded-xl text-sm py-5 pr-10 focus-visible:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          tabIndex={-1}
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full rounded-xl py-5 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Authentification...
                        </>
                      ) : (
                        "Se connecter à la console"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Sign up tab content */}
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-semibold">Nom complet</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Jean Dupont"
                        value={signupFullName}
                        onChange={(e) => setSignupFullName(e.target.value)}
                        disabled={isLoading}
                        className="bg-[#181d2a] border-border/30 rounded-xl text-sm py-5 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-semibold">Adresse e-mail</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="analyste@lotolumiere.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="bg-[#181d2a] border-border/30 rounded-xl text-sm py-5 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-semibold">Mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="Minimum 6 caractères"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                          disabled={isLoading}
                          className="bg-[#181d2a] border-border/30 rounded-xl text-sm py-5 pr-10 focus-visible:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          tabIndex={-1}
                        >
                          {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-sm font-semibold">Confirmer le mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={isLoading}
                          className="bg-[#181d2a] border-border/30 rounded-xl text-sm py-5 pr-10 focus-visible:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full rounded-xl py-5 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Création du profil d'analyste...
                        </>
                      ) : (
                        "Créer mon compte d'analyste"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Legal Mentions footer with dialog modals */}
        <div className="text-center space-y-3 pt-2">
          <p className="text-xs text-slate-400 leading-relaxed">
            En utilisant la suite analytique LOTO LUMIÈRE, vous certifiez comprendre les principes d'indépendance des tirages.
          </p>
          
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs font-semibold text-primary/90">
            {/* Modal: Conditions d'utilisation */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1 hover:text-primary hover:underline">
                  <FileText className="w-3.5 h-3.5" />
                  Conditions d'utilisation
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-[#121620] border-border/40 text-foreground max-h-[80vh] overflow-y-auto rounded-2xl scrollbar-thin">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="text-primary w-5 h-5" />
                    Conditions Générales d'Utilisation
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Dernière mise à jour : Juillet 2026
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm text-slate-300 leading-relaxed pt-2">
                  <p>
                    Bienvenue sur <strong>LOTO LUMIÈRE</strong>. Cette application est un outil d'analyse de données historiques et de modélisation mathématique destiné à des fins de divertissement et de recherche statistique appliquée.
                  </p>
                  <h4 className="font-bold text-slate-100">1. Absence de Garanties</h4>
                  <p>
                    LOTO LUMIÈRE calcule des projections empiriques à partir des tirages antérieurs. En aucun cas l'application ou ses administrateurs ne prétendent, ne suggèrent ou ne garantissent l'obtention de gains ou de résultats gagnants. Les tirages de loterie physiques officiels restent strictement aléatoires et mathématiquement indépendants les uns des autres.
                  </p>
                  <h4 className="font-bold text-slate-100">2. Usage Interdit aux Mineurs</h4>
                  <p>
                    L'utilisation de cette application et la participation aux jeux de loterie sont formellement réservées aux personnes majeures selon les lois applicables dans leur juridiction territoriale (généralement 18 ans révolus).
                  </p>
                  <h4 className="font-bold text-slate-100">3. Propriété Intellectuelle</h4>
                  <p>
                    Les algorithmes d'orchestration stochastique, de backtesting Walk-Forward et d'analyse d'asymétrie statistique demeurent la propriété exclusive de LOTO LUMIÈRE et ne peuvent être extraits ou reproduits sans notre accord formel écrit.
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            <span className="text-slate-600">|</span>

            {/* Modal: Politique de confidentialité */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1 hover:text-primary hover:underline">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Politique de confidentialité
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-[#121620] border-border/40 text-foreground max-h-[80vh] overflow-y-auto rounded-2xl scrollbar-thin">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <ShieldCheck className="text-emerald-500 w-5 h-5" />
                    Politique de Confidentialité
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Sécurité et respect de la vie privée - Juillet 2026
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm text-slate-300 leading-relaxed pt-2">
                  <p>
                    Chez <strong>LOTO LUMIÈRE</strong>, nous accordons une importance fondamentale à la confidentialité de vos données et à votre anonymat de recherche.
                  </p>
                  <h4 className="font-bold text-slate-100">1. Collecte Limitée & Bases Légales</h4>
                  <p>
                    Nous traitons vos données sur la base de votre <strong>consentement</strong> (Article 6(1)(a) du RGPD) pour l'enregistrement de vos préférences et grilles suivies, et de notre <strong>intérêt légitime</strong> (Article 6(1)(f) du RGPD) pour assurer la sécurité et l'authentification de votre compte d'analyste.
                  </p>
                  <h4 className="font-bold text-slate-100">2. Non-Transmission à des Tiers</h4>
                  <p>
                    Vos données de profil, préférences de calcul et configurations de simulation ne sont jamais vendues, cédées ou transmises à des régies publicitaires ou des opérateurs de jeux tiers. Toutes les analyses restent confinées à votre espace de travail.
                  </p>
                  <h4 className="font-bold text-slate-100">3. Sécurisation Technique</h4>
                  <p>
                    Nous utilisons les protocoles d'authentification certifiés de Supabase avec chiffrement fort au repos et en transit (HTTPS/SSL), ainsi que des règles de sécurité de niveau ligne (Row-Level Security) strictes sur notre base de données PostgreSQL.
                  </p>
                  <h4 className="font-bold text-slate-100">4. Durée de Conservation des Données</h4>
                  <p>
                    Vos données sont conservées uniquement pour la durée de vie active de votre compte. Tout compte n'ayant enregistré aucune connexion pendant une période de 24 mois consécutifs est considéré comme inactif et ses données personnelles associées sont définitivement et automatiquement purgées.
                  </p>
                  <h4 className="font-bold text-slate-100">5. Droit à l'Oubli & Suppression Autonome</h4>
                  <p>
                    Conformément à la réglementation européenne, vous disposez d'un droit complet d'accès, de rectification et d'effacement de vos données. LOTO LUMIÈRE met à votre disposition un outil de suppression autonome de compte et d'historiques dans l'onglet <strong>Compte</strong> de l'application, supprimant instantanément et de manière irréversible toutes vos données de nos serveurs.
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            <span className="text-slate-600">|</span>

            {/* Modal: Jeu Responsable */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1 hover:text-primary hover:underline">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  Jeu Responsable
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-[#121620] border-border/40 text-foreground max-h-[80vh] overflow-y-auto rounded-2xl scrollbar-thin">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <HeartHandshake className="text-amber-500 w-5 h-5" />
                    Charte du Jeu Responsable
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Prévention, vigilance et conseils pratiques
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm text-slate-300 leading-relaxed pt-2">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 font-bold text-xs flex gap-2">
                    <span>⚠️</span>
                    <span>ATTENTION : Jouer comporte des risques de dépendance, d'isolement et d'endettement financier.</span>
                  </div>
                  <p>
                    LOTO LUMIÈRE s'engage activement pour la prévention de l'addiction aux jeux de hasard. Nous rappelons que l'utilisation de nos modèles statistiques doit rester une activité de loisir saine.
                  </p>
                  <h4 className="font-bold text-slate-100">Règles d'or pour un comportement sain :</h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li>Fixez-vous un budget hebdomadaire ou mensuel strict et ne le dépassez jamais.</li>
                    <li>N'empruntez jamais d'argent pour financer vos participations aux jeux.</li>
                    <li>Considérez les pertes comme le coût d'un divertissement, jamais comme une dette à récupérer.</li>
                    <li>Ne jouez jamais lorsque vous êtes fatigué, déprimé ou sous l'influence de l'alcool.</li>
                  </ul>
                  <h4 className="font-bold text-slate-100">Besoin d'aide ?</h4>
                  <p>
                    Si vous ressentez une perte de contrôle ou de l'anxiété liée au jeu, des professionnels indépendants et bienveillants sont disponibles pour vous écouter et vous soutenir gratuitement. Contactez les services d'aide locaux de votre pays de résidence.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;
