import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, History, Users, Phone, MessageCircle, Loader2, Trash2, Monitor, Package, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  const [editingLiberacao, setEditingLiberacao] = useState<Liberacao | null>(null);
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
    setLiberacaoToDelete(null);
  };

  const handleUpdateLiberacao = async () => {
    if (!editingLiberacao) return;

    try {
      const { error } = await supabase
        .from("liberacoes")
        .update({
          nome_pessoa: editingLiberacao.nome_pessoa,
          tipo_acesso: editingLiberacao.tipo_acesso,
          quadra: editingLiberacao.quadra,
          lote: editingLiberacao.lote,
          observacoes: editingLiberacao.observacoes,
        })
        .eq("id", editingLiberacao.id);

      if (error) throw error;

      toast.success("Liberação atualizada com sucesso");
      setEditingLiberacao(null);
      fetchTodayLiberacoes();
    } catch (error) {
      console.error("Erro ao atualizar liberação:", error);
      toast.error("Erro ao atualizar liberação");
    }
  };

  const fetchTodayLiberacoes = async (silent = false) => {
    console.log("🔄 Iniciando fetchTodayLiberacoes...");
    if (!silent) setIsLoading(true);

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
    // Update expired releases in the database
    const updateStatuses = async () => {
      try {
        await supabase.rpc("update_expired_liberacoes");
      } catch (err) {
        console.error("Erro ao atualizar status expirados:", err);
      }
    };

    updateStatuses();
    fetchTodayLiberacoes();

    // Realtime subscription com logs detalhados
    const channel = supabase
      .channel("liberacoes-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "liberacoes",
        },
        (payload) => {
          console.log("📡 [Liberações] Realtime event recebido:", payload.eventType, payload);
          fetchTodayLiberacoes(true);
        }
      )
      .subscribe((status, err) => {
        console.log("📡 [Liberações] Status da subscription:", status);
        if (err) {
          console.error("📡 [Liberações] Erro na subscription:", err);
        }
        if (status === "SUBSCRIBED") {
          console.log("✅ [Liberações] Realtime conectado com sucesso!");
        }
        if (status === "CHANNEL_ERROR") {
          console.error("❌ [Liberações] Erro no canal - usando fallback de polling");
        }
        if (status === "TIMED_OUT") {
          console.warn("⏰ [Liberações] Timeout na conexão realtime");
        }
      });

    // Fallback: Polling a cada 30 segundos para garantir sincronização
    // Isso garante que mesmo se o realtime falhar, os dados serão atualizados
    const pollingInterval = setInterval(() => {
      console.log("🔄 [Liberações] Polling de fallback executando...");
      fetchTodayLiberacoes(true);
    }, 30000); // 30 segundos

    return () => {
      console.log("🔌 [Liberações] Removendo subscription e polling...");
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
    };
  }, []);

  const menuItems = [
    {
      title: "Nova Liberação",
      description: "VISITANTE/PRESTADOR",
      icon: Plus,
      path: "/nova-liberacao",
      theme: "primary",
    },
    {
      title: "Consultar",
      description: "Buscar liberações",
      icon: Search,
      path: "/consultar",
      theme: "accent",
    },
    {
      title: "Histórico",
      description: "Ver todos os registros",
      icon: History,
      path: "/historico",
      theme: "secondary",
    },
    {
      title: "Encomendas",
      description: "Histórico de entregas (Encomendas)",
      icon: Package,
      path: "/historico-encomendas",
      theme: "warning",
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
    const destinoCompleto = `${lib.quadra} ${lib.lote}`.toLowerCase();

    return (
      lib.nome_pessoa.toLowerCase().includes(searchLower) ||
      lib.quadra.toLowerCase().includes(searchLower) ||
      lib.lote.toLowerCase().includes(searchLower) ||
      destinoCompleto.includes(searchLower) ||
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {menuItems.map((item) => {
          const isPrimary = item.path === "/nova-liberacao";
          const themes = {
            primary: "bg-gradient-to-br from-primary to-success/80 text-white shadow-primary/20 hover:shadow-primary/40",
            accent: "bg-gradient-to-br from-accent to-blue-600 text-white shadow-accent/20 hover:shadow-accent/40",
            secondary: "bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-slate-200 hover:shadow-slate-300",
            warning: "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-orange-100 hover:shadow-orange-200"
          };

          return (
            <Card
              key={item.path}
              className={cn(
                "group cursor-pointer transition-all duration-300 relative overflow-hidden h-32 flex flex-col justify-center border-none",
                themes[item.theme as keyof typeof themes],
                "hover:-translate-y-1.5 shadow-lg"
              )}
              onClick={() => navigate(item.path)}
            >
              <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <item.icon size={80} />
              </div>

              <CardHeader className="p-3 pb-1 relative z-10 flex flex-row items-center gap-3">
                <div className={cn(
                  "rounded-xl p-2.5 shadow-inner transition-transform duration-500 group-hover:scale-110",
                  isPrimary ? "bg-white/20 text-white" : "bg-white/10 text-white"
                )}>
                  <item.icon className={cn(
                    "h-5 w-5",
                    isPrimary && "animate-pulse"
                  )} />
                </div>
                {isPrimary && (
                  <Badge className="bg-white/20 text-white border-none font-black text-[9px] h-4">PRINCIPAL</Badge>
                )}
              </CardHeader>
              <CardContent className="p-3 pt-0 relative z-10">
                <CardTitle className="text-sm font-black tracking-tight uppercase mb-0.5">
                  {item.title}
                </CardTitle>
                <CardDescription className="text-[10px] text-white/80 font-medium leading-tight">
                  {item.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Today's Active Liberacoes */}
      <Card id="liberacoes-ativas">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            LIBERAÇÕES ATIVAS HOJE
          </CardTitle>
          <CardDescription>
            Visitantes e prestadores com acesso permitido para hoje
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="BUSCAR POR NOME, DESTINO (QUADRA/LOTE), TIPO OU OBSERVAÇÕES..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              className="pl-12 h-12 bg-background border-2 font-semibold uppercase tracking-tight shadow-inner"
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
                <TableHeader className="bg-muted/50 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-black text-xs uppercase tracking-widest text-primary">Destino</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-widest text-primary">Nome</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-widest text-primary">Observações</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-widest text-primary">Tipo</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-widest text-primary">Validade</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-widest text-primary">Status</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-widest text-primary">Registro</TableHead>
                    <TableHead className="text-right pr-6 font-black text-xs uppercase tracking-widest text-primary">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-muted/30">
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
                          <div className={cn(
                            "flex flex-col items-center justify-center p-1.5 px-3 rounded-xl border-2 shadow-sm min-w-[3.5rem] transition-colors",
                            lib.tipo_acesso === "visitante" ? "bg-accent/10 border-accent/30" : "bg-warning/10 border-warning/30"
                          )}>
                            <span className={cn(
                              "text-[0.6rem] font-black uppercase tracking-widest opacity-70",
                              lib.tipo_acesso === "visitante" ? "text-black" : "text-warning-foreground"
                            )}>Quadra</span>
                            <span className={cn(
                              "text-xl font-black",
                              lib.tipo_acesso === "visitante" ? "text-black" : "text-warning-foreground"
                            )}>{lib.quadra.toUpperCase()}</span>
                          </div>
                          <div className={cn(
                            "flex flex-col items-center justify-center p-1.5 px-3 rounded-xl border-2 shadow-sm min-w-[3.5rem] transition-colors",
                            lib.tipo_acesso === "visitante" ? "bg-accent/10 border-accent/30" : "bg-warning/10 border-warning/30"
                          )}>
                            <span className={cn(
                              "text-[0.6rem] font-black uppercase tracking-widest opacity-70",
                              lib.tipo_acesso === "visitante" ? "text-black" : "text-warning-foreground"
                            )}>Lote</span>
                            <span className={cn(
                              "text-xl font-black",
                              lib.tipo_acesso === "visitante" ? "text-black" : "text-warning-foreground"
                            )}>{lib.lote.toUpperCase()}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold uppercase text-slate-900">{lib.nome_pessoa.toUpperCase()}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-500 font-semibold text-xs uppercase" title={lib.observacoes}>
                        {lib.observacoes || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-black uppercase tracking-tighter px-3 py-1 border-2 shadow-sm",
                            lib.tipo_acesso === "visitante"
                              ? "bg-accent text-accent-foreground border-accent-foreground/10 hover:bg-accent/90"
                              : "bg-warning text-warning-foreground border-warning-foreground/10 hover:bg-warning/90"
                          )}
                        >
                          {lib.tipo_acesso === "visitante" ? "Visitante" : "Prestador"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-black text-slate-700">
                        Até {format(new Date(lib.data_fim + "T00:00:00"), "dd/MM", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "font-black uppercase px-3 py-1 border shadow-sm",
                            new Date(lib.data_fim + "T00:00:00") >= new Date(new Date().setHours(0, 0, 0, 0))
                              ? "bg-success text-success-foreground hover:bg-success/90"
                              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          )}
                        >
                          {new Date(lib.data_fim + "T00:00:00") >= new Date(new Date().setHours(0, 0, 0, 0)) ? "Ativo" : "Expirado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 font-bold text-sm">
                        <span>{format(new Date(lib.criado_em), "dd/MM/yy")}</span>
                        <span className="mx-1 text-slate-300">•</span>
                        <span>{format(new Date(lib.criado_em), "HH:mm")}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingLiberacao(lib)}
                            className="h-10 w-10 text-blue-500 hover:text-blue-600 hover:bg-blue-50 shadow-sm hover:shadow-blue-100 transition-all rounded-full"
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLiberacaoToDelete(lib.id)}
                            className="h-10 w-10 text-destructive hover:text-destructive-foreground hover:bg-destructive shadow-sm hover:shadow-destructive/40 transition-all rounded-full"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
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

      <Dialog open={!!editingLiberacao} onOpenChange={(open) => !open && setEditingLiberacao(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Liberação</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias e clique em Salvar.
            </DialogDescription>
          </DialogHeader>
          {editingLiberacao && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome" className="font-bold">Nome Completo</Label>
                <Input
                  id="nome"
                  value={editingLiberacao.nome_pessoa}
                  onChange={(e) => setEditingLiberacao({ ...editingLiberacao, nome_pessoa: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quadra" className="font-bold">Quadra</Label>
                  <Input
                    id="quadra"
                    value={editingLiberacao.quadra}
                    onChange={(e) => setEditingLiberacao({ ...editingLiberacao, quadra: e.target.value.toUpperCase() })}
                    className="uppercase"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lote" className="font-bold">Lote</Label>
                  <Input
                    id="lote"
                    value={editingLiberacao.lote}
                    onChange={(e) => setEditingLiberacao({ ...editingLiberacao, lote: e.target.value.toUpperCase() })}
                    className="uppercase"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipo" className="font-bold">Tipo de Acesso</Label>
                <Select
                  value={editingLiberacao.tipo_acesso}
                  onValueChange={(value: "visitante" | "prestador") => setEditingLiberacao({ ...editingLiberacao, tipo_acesso: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visitante">VISITANTE</SelectItem>
                    <SelectItem value="prestador">PRESTADOR DE SERVIÇO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="obs" className="font-bold">Observações</Label>
                <Input
                  id="obs"
                  value={editingLiberacao.observacoes || ""}
                  onChange={(e) => setEditingLiberacao({ ...editingLiberacao, observacoes: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLiberacao(null)}>Cancelar</Button>
            <Button onClick={handleUpdateLiberacao}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Botão flutuante para ir até Liberações Ativas */}
      <Button
        onClick={() => {
          document.getElementById('liberacoes-ativas')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="fixed bottom-20 right-6 h-12 w-auto px-4 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white z-50 transition-all hover:scale-105 flex items-center gap-2"
        title="Ir para Liberações Ativas"
      >
        <Users className="h-5 w-5" />
        <ArrowUp className="h-4 w-4" />
      </Button>

      {/* Botão flutuante para ir até Encomendas */}
      <Button
        onClick={() => {
          document.getElementById('encomendas-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="fixed bottom-6 right-6 h-12 w-auto px-4 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600 text-white z-50 transition-all hover:scale-105 flex items-center gap-2"
        title="Ir para Encomendas"
      >
        <Package className="h-5 w-5" />
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
