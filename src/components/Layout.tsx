import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";
import damhaLogo from "@/assets/damha6_logo.jpg";

export function Layout() {
  const { admin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img
              src={damhaLogo}
              alt="Damha VI"
              className="h-10 w-auto object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground">
                Controle de Acesso
              </h1>
              <p className="text-xs text-muted-foreground">
                Damha VI - Parque Residencial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>{admin?.nome}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-6 mt-auto">
        <div className="container flex flex-col items-center gap-3 text-center">
          <p className="text-xs bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent animate-pulse font-medium">
            Desenvolvido por Luis Miguel. Todos os direitos reservados © 2026.
          </p>
        </div>
      </footer>
    </div>
  );
}
