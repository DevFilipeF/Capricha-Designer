import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, SearchX } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <SearchX className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-5xl font-bold font-display text-primary">404</p>
        <h1 className="mt-3 text-xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço <span className="font-mono text-xs">{location.pathname}</span> não existe neste sistema.
        </p>
        <Button asChild className="mt-6">
          <Link to="/"><Home className="h-4 w-4 mr-2" />Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
