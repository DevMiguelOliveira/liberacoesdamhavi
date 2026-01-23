import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, History, Users } from "lucide-react";

import damhaLogo from "@/assets/logo_damha_nova.jpg";

export default function Dashboard() {
  const { admin } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    {
      title: "Nova Liberação",
      description: "Registrar entrada de visitante ou prestador",
      icon: Plus,
      path: "/nova-liberacao",
      variant: "default" as const,
    },
    {
      title: "Consultar Liberações",
      description: "Buscar liberações ativas por nome, CPF ou endereço",
      icon: Search,
      path: "/consultar",
      variant: "outline" as const,
    },
    {
      title: "Histórico",
      description: "Ver todas as liberações registradas",
      icon: History,
      path: "/historico",
      variant: "outline" as const,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="flex justify-center sm:justify-start mb-6">
          <img
            src={damhaLogo}
            alt="Damha VI Logo"
            className="h-24 w-auto object-contain animate-fade-in hover:scale-105 transition-transform duration-700 ease-in-out"
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {admin?.nome?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">
          O que você gostaria de fazer hoje?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {menuItems.map((item) => (
          <Card
            key={item.path}
            className="group cursor-pointer transition-all hover:shadow-card-hover hover:-translate-y-1"
            onClick={() => navigate(item.path)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className={`rounded-lg p-3 ${item.variant === "default"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                  }`}>
                  <item.icon className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                {item.title}
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <Card className="bg-secondary/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-accent p-3">
              <Users className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Sistema de Portaria</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Registre liberações de visitantes e prestadores de serviço.
                Todas as entradas ficam salvas no histórico para consulta futura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
