import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, History, Users, Phone, MessageCircle, Loader2, Trash2, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import damhaLogo from "@/assets/logo_damha_nova.jpg";
import EncomendasSection from "@/components/EncomendasSection";

interface Liberacao {
  id: string;
  nome_pessoa: string;
  tipo_acesso: "visitante" | "prestador";
  quadra: string;
  lote: string;
  data_inicio: string;
  data_fim: string;
  status: "ativo" | "expirado";
  criado_em: string;
  observacoes?: string;
}

interface Entrega {
  id: string;
  nome_entregador: string;
  empresa: string;
  codigo: string;
  quadra: string;
  lote: string;
  status: string;
  criado_em: string;
}

export default function Dashboard() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [todayLiberacoes, setTodayLiberacoes] = useState<Liberacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liberacaoToDelete, setLiberacaoToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleDelete = async () => {
    if (!liberacaoToDelete) return;

    const { error } = await supabase
      .from("liberacoes")
      .delete()
      .eq("id", liberacaoToDelete);

    if (error) {
      toast.error("Erro ao excluir liberação");
      console.error(error);
    } else {
      toast.success("Liberação excluída com sucesso");
      fetchTodayLiberacoes();
    }
    setLiberacaoToDelete(null);
  };

  const fetchTodayLiberacoes = async () => {
    console.log("🔄 Iniciando fetchTodayLiberacoes...");
    setIsLoading(true);

    // Get today's date in YYYY-MM-DD format using local time (Brazil/System)
    const todayDate = new Date();
    const today = format(todayDate, "yyyy-MM-dd");

    console.log("Data de hoje:", today);

    // Fetch active liberacoes valid for today
    const { data, error } = await supabase
      .from("liberacoes")
      .select("*")
      .eq("status", "ativo")
      .lte("data_inicio", today)
      .gte("data_fim", today);

    console.log("Liberações retornadas:", data);
    console.log("Erro:", error);

    if (error) {
      console.error("Error fetching today's liberacoes:", error);
      setTodayLiberacoes([]);
      setIsLoading(false);
      return;
    }

    // Ordenar por quadra e lote de forma alfanumérica
    const sortedData = (data || []).sort((a, b) => {
      // Função auxiliar para converter string em número se possível
      const parseValue = (value: string) => {
        const num = parseInt(value, 10);
        return isNaN(num) ? value : num;
      };

      const quadraA = parseValue(a.quadra);
      const quadraB = parseValue(b.quadra);

      // Comparar quadras
      if (quadraA < quadraB) return -1;
      if (quadraA > quadraB) return 1;

      // Se quadras são iguais, comparar lotes
      const loteA = parseValue(a.lote);
      const loteB = parseValue(b.lote);

      if (loteA < loteB) return -1;
      if (loteA > loteB) return 1;

      return 0;
    });

    console.log("Liberações ordenadas:", sortedData);
    setTodayLiberacoes(sortedData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTodayLiberacoes();

    // Realtime subscription
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "liberacoes",
        },
        (payload) => {
          console.log("📡 Realtime event recebido:", payload);
          fetchTodayLiberacoes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const menuItems = [
    {
      title: "Nova Liberação",
      description: "Registrar liberação de visitante ou prestador",
      icon: Plus,
      path: "/nova-liberacao",
      variant: "default" as const,
    },
    {
      title: "Consultar Liberações",
      description: "Buscar liberações ativas ou expiradas.",
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

  const handleCreateShortcut = () => {
    const shortcutContent = `[InternetShortcut]\nURL=${window.location.origin}\nIconIndex=0\nIconFile=${window.location.origin}/damha6%20logo.jpg`;
    const blob = new Blob([shortcutContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Liberações Damha VI.url";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Atalho baixado!", {
      description: "Mova o arquivo baixado para sua Área de Trabalho.",
    });
  };

  // Filtrar liberações com base no termo de busca
  const filteredLiberacoes = todayLiberacoes.filter((lib) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      lib.nome_pessoa.toLowerCase().includes(searchLower) ||
      lib.quadra.toLowerCase().includes(searchLower) ||
      lib.lote.toLowerCase().includes(searchLower) ||
      lib.tipo_acesso.toLowerCase().includes(searchLower) ||
      (lib.observacoes?.toLowerCase().includes(searchLower) || false)
    );
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="space-y-2 text-center">
        <div className="flex justify-center mb-6">
          <img
            src={damhaLogo}
            alt="Damha VI Logo"
            className="h-40 w-auto object-contain animate-float hover:scale-105 transition-transform duration-700 ease-in-out"
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

      {/* Today's Active Liberacoes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            LIBERAÇÕES ATIVAS HOJE
          </CardTitle>
          <CardDescription>
            Visitantes e prestadores com acesso permitido para hoje
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome, quadra, lote, tipo ou observações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : todayLiberacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              Nenhuma liberação ativa encontrada para hoje.
            </p>
          ) : filteredLiberacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              Nenhuma liberação encontrada com o termo "{searchTerm}".
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destino</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Horário do Registro</TableHead>
                    <TableHead>Remover Liberação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLiberacoes.map((lib) => (
                    <TableRow
                      key={lib.id}
                      className={
                        lib.tipo_acesso === "visitante"
                          ? "bg-sky-50/50 hover:bg-sky-100/50 data-[state=selected]:bg-sky-100"
                          : "bg-yellow-50/50 hover:bg-yellow-100/50 data-[state=selected]:bg-yellow-100"
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-center justify-center bg-blue-100 p-1 px-2 rounded-md border border-blue-300 shadow-sm min-w-[3.5rem]">
                            <span className="text-[0.6rem] font-bold text-black uppercase tracking-widest">Quadra</span>
                            <span className="text-lg font-black text-blue-900">{lib.quadra}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center bg-blue-100 p-1 px-2 rounded-md border border-blue-300 shadow-sm min-w-[3.5rem]">
                            <span className="text-[0.6rem] font-bold text-gray-700 uppercase tracking-widest">Lote</span>
                            <span className="text-lg font-black text-blue-900">{lib.lote}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{lib.nome_pessoa}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={lib.observacoes}>
                        {lib.observacoes || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            lib.tipo_acesso === "visitante"
                              ? "bg-sky-200 text-sky-900 hover:bg-sky-300 border-sky-300"
                              : "bg-yellow-200 text-yellow-900 hover:bg-yellow-300 border-yellow-300"
                          }
                        >
                          {lib.tipo_acesso === "visitante" ? "Visitante" : "Prestador"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Até {format(new Date(lib.data_fim + "T00:00:00"), "dd/MM", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-success hover:bg-success/80">
                          Ativo
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(lib.criado_em), "HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLiberacaoToDelete(lib.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Encomendas Section */}
      <EncomendasSection />

      <AlertDialog open={!!liberacaoToDelete} onOpenChange={() => setLiberacaoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Liberação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta liberação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info & Contacts Section */}
      <div className="grid gap-4 md:grid-cols-3">
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
                  Todas as entradas ficam salvas no histórico.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-accent p-3">
                <Phone className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Contatos Úteis</h3>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Portaria Social: (17) 3512-9009</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    <span>Whatsapp: (14) 99106-0771</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-secondary/50 cursor-pointer hover:bg-secondary/70 transition-colors group"
          onClick={handleCreateShortcut}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-accent p-3 group-hover:bg-primary/10 transition-colors">
                <Monitor className="h-6 w-6 text-accent-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">Acesso Rápido</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique aqui para baixar um atalho para sua Área de Trabalho.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
