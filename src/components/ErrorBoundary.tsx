import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isChunkError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if the error is a dynamic import failure (chunk load error)
    const isChunkError = error.name === 'ChunkLoadError' || 
                         error.message.includes('Failed to fetch dynamically imported module') ||
                         error.message.includes('Importing a module script failed');
                         
    return { hasError: true, isChunkError };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Automatically reload the page if it's a chunk error
    if (this.state.isChunkError) {
      window.location.reload();
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full animate-pulse">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Mise à jour en cours...</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              L'application a été mise à jour. Rechargement automatique pour appliquer les changements.
            </p>
          </div>
        );
      }
      
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Une erreur inattendue est survenue</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Veuillez rafraîchir la page ou revenir à l'accueil.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
