import { useState, useEffect, Fragment } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, History, Users, Phone, MessageCircle, Loader2, Trash2, Monitor, Package, Pencil, ArrowUp, ArrowDown, UserX, AlertTriangle, Clock } from "lucide-react";
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
  const [newLiberacaoPopup, _setNewLiberacaoPopup] = useState<Liberacao | null>(null);
  const [liberacaoToInactivate, setLiberacaoToInactivate] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const setNewLiberacaoPopup = (val: Liberacao | null) => {
    console.log("💾 [Popup Debug] setNewLiberacaoPopup chamado com:", val);
    if (val === null) {
      console.trace("💾 [Popup Debug] Rastro de pilha para setNewLiberacaoPopup(null):");
    }
    _setNewLiberacaoPopup(val);
  };

  useEffect(() => {
    console.log("🪵 [Dashboard Debug] Componente Dashboard MONTOU");
    return () => {
      console.log("🪵 [Dashboard Debug] Componente Dashboard DESMONTOU");
    };
  }, []);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupKey)
        ? prev.filter((k) => k !== groupKey)
        : [...prev, groupKey]
    );
  };

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      // Beautiful premium chime: E5 (659.25 Hz) then A5 (880 Hz)
      playTone(659.25, now, 0.4);
      playTone(880, now + 0.12, 0.5);
    } catch (error) {
      console.error("Erro ao reproduzir som de notificação:", error);
    }
  };

  const showNewLiberacaoToast = (lib: Liberacao) => {
    const isVisitante = lib.tipo_acesso === "visitante";
    toast(
      `NOVA LIBERAÇÃO: ${lib.nome_pessoa.toUpperCase()}`,
      {
        description: `QUADRA ${lib.quadra.toUpperCase()} - LOTE ${lib.lote.toUpperCase()} (${isVisitante ? "VISITANTE" : "PRESTADOR"})`,
        duration: 10000,
        action: {
          label: "VER",
          onClick: () => {
            document.getElementById('liberacoes-ativas')?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    );
  };

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

  const handleInactivate = async () => {
    if (!liberacaoToInactivate) return;

    const { error } = await supabase
      .from("liberacoes")
      .update({ status: "expirado" })
      .eq("id", liberacaoToInactivate);

    if (error) {
      toast.error("Erro ao inativar liberação");
      console.error(error);
    } else {
      toast.success("Liberação inativada com sucesso");
      fetchTodayLiberacoes();
    }
    setLiberacaoToInactivate(null);
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
          if (payload.eventType === "INSERT") {
            const newLib = payload.new as Liberacao;
            const today = format(new Date(), "yyyy-MM-dd");
            console.log("🔍 [Realtime Debug] Dados recebidos:");
            console.log("- Data de Hoje (local):", today);
            console.log("- Liberação Inicio:", newLib.data_inicio);
            console.log("- Liberação Fim:", newLib.data_fim);
            console.log("- Status:", newLib.status);
            const isToday = newLib.status === "ativo" &&
                            newLib.data_inicio <= today &&
                            newLib.data_fim >= today;
            console.log("- Ativa hoje? (isToday):", isToday);
            if (isToday) {
              playNotificationSound();
              showNewLiberacaoToast(newLib);
              setNewLiberacaoPopup(newLib);
            }
          }
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
      title: "Entradas CON999",
      description: "Histórico de entregas (Encomendas) e Entradas CON999.",
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
              placeholder="BUSCAR POR NOME, QUADRA/LOTE, TIPO OU OBSERVAÇÕES..."
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
                    <TableHead className="hidden md:table-cell font-black text-xs uppercase tracking-widest text-primary">Status</TableHead>
                    <TableHead className="hidden sm:table-cell font-black text-xs uppercase tracking-widest text-primary">Registro</TableHead>
                    <TableHead className="text-right pr-2 sm:pr-6 font-black text-xs uppercase tracking-widest text-primary">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-muted/30">
                  {(() => {
                    // Grouping filtered releases by Quadra & Lote (maintaining alphabetical order)
                    const groupedLiberacoes: { key: string; quadra: string; lote: string; list: Liberacao[] }[] = [];
                    
                    filteredLiberacoes.forEach((lib) => {
                      const key = `${lib.quadra.toUpperCase()}_${lib.lote.toUpperCase()}`;
                      const existingGroup = groupedLiberacoes.find((g) => g.key === key);
                      if (existingGroup) {
                        existingGroup.list.push(lib);
                      } else {
                        groupedLiberacoes.push({
                          key,
                          quadra: lib.quadra,
                          lote: lib.lote,
                          list: [lib],
                        });
                      }
                    });

                    return groupedLiberacoes.map((group) => {
                      const isExpanded = expandedGroups.includes(group.key);
                      const hasMultiple = group.list.length > 1;

                      if (!hasMultiple) {
                        const lib = group.list[0];
                        return (
                          <TableRow
                            key={lib.id}
                            className={cn(
                              lib.tipo_acesso === "visitante"
                                ? "bg-sky-50/50 hover:bg-sky-100/50 data-[state=selected]:bg-sky-100"
                                : "bg-yellow-50/50 hover:bg-yellow-100/50 data-[state=selected]:bg-yellow-100"
                            )}
                          >
                            <TableCell>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <div className={cn(
                                  "flex flex-col items-center justify-center p-1 sm:p-1.5 px-2 sm:px-3 rounded-xl border-2 shadow-sm min-w-[3rem] sm:min-w-[3.5rem] transition-colors",
                                  lib.tipo_acesso === "visitante" ? "bg-accent/10 border-accent/30" : "bg-warning/10 border-warning/30"
                                )}>
                                  <span className={cn(
                                    "text-[0.55rem] sm:text-[0.6rem] font-black uppercase tracking-widest opacity-70",
                                    lib.tipo_acesso === "visitante" ? "text-black" : "text-warning-foreground"
                                  )}>Quadra</span>
                                  <span className={cn(
                                    "text-lg sm:text-xl font-black",
                                    lib.tipo_acesso === "visitante" ? "text-black" : "text-warning-foreground"
                                  )}>{lib.quadra.toUpperCase()}</span>
                                </div>
                                <div className={cn(
                                  "flex flex-col items-center justify-center p-1 sm:p-1.5 px-2 sm:px-3 rounded-xl border-2 shadow-sm min-w-[3rem] sm:min-w-[3.5rem] transition-colors",
                                  lib.tipo_acesso === "visitante" ? "bg-accent/10 border-accent/30" : "bg-warning/10 border-warning/30"
                                )}>
                                  <span className={cn(
                                    "text-[0.55rem] sm:text-[0.6rem] font-black uppercase tracking-widest opacity-70",
                                    lib.tipo_acesso === "visitante" ? "text-black" : "text-warning-foreground"
                                  )}>Lote</span>
                                  <span className={cn(
                                    "text-lg sm:text-xl font-black",
                                    lib.tipo_acesso === "visitante" ? "text-black" : "text-warning-foreground"
                                  )}>{lib.lote.toUpperCase()}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-bold uppercase text-slate-900 dark:text-slate-100 break-words whitespace-normal min-w-[130px] sm:min-w-[160px] text-xs sm:text-sm">{lib.nome_pessoa.toUpperCase()}</TableCell>
                            <TableCell className="min-w-[120px] max-w-[220px] break-words whitespace-normal text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase" title={lib.observacoes}>
                              {lib.observacoes || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "font-black uppercase tracking-tighter px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs border-2 shadow-sm",
                                  lib.tipo_acesso === "visitante"
                                    ? "bg-accent text-accent-foreground border-accent-foreground/10 hover:bg-accent/90"
                                    : "bg-warning text-warning-foreground border-warning-foreground/10 hover:bg-warning/90"
                                )}
                              >
                                {lib.tipo_acesso === "visitante" ? "Visitante" : "Prestador"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-black text-slate-700 dark:text-slate-300 text-xs sm:text-sm whitespace-nowrap">
                              Até {format(new Date(lib.data_fim + "T00:00:00"), "dd/MM", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
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
                            <TableCell className="hidden sm:table-cell text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm whitespace-nowrap">
                              <span>{format(new Date(lib.criado_em), "dd/MM/yy")}</span>
                              <span className="mx-1 text-slate-300">•</span>
                              <span>{format(new Date(lib.criado_em), "HH:mm")}</span>
                            </TableCell>
                            <TableCell className="text-right pr-2 sm:pr-6">
                              <div className="flex justify-end gap-0.5 sm:gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingLiberacao(lib)}
                                  className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500 hover:text-blue-600 hover:bg-blue-50 shadow-sm hover:shadow-blue-100 transition-all rounded-full"
                                  title="EDITAR LIBERAÇÃO"
                                >
                                  <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setLiberacaoToInactivate(lib.id)}
                                  className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500 hover:text-orange-600 hover:bg-orange-50 shadow-sm hover:shadow-orange-100 transition-all rounded-full"
                                  title="Inativar (tirar das ativas de hoje)"
                                >
                                  <UserX className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setLiberacaoToDelete(lib.id)}
                                  className="h-8 w-8 sm:h-10 sm:w-10 text-destructive hover:text-destructive-foreground hover:bg-destructive shadow-sm hover:shadow-destructive/40 transition-all rounded-full"
                                  title="EXCLUIR PERMANENTEMENTE"
                                >
                                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      // Render grouped header row and children below
                      const totalVisitantes = group.list.filter((l) => l.tipo_acesso === "visitante").length;
                      const totalPrestadores = group.list.filter((l) => l.tipo_acesso === "prestador").length;

                      return (
                        <Fragment key={group.key}>
                          <TableRow
                            onClick={() => toggleGroup(group.key)}
                            className="cursor-pointer bg-gradient-to-r from-amber-50/60 to-orange-50/60 hover:from-amber-100/60 hover:to-orange-100/60 font-bold border-l-4 border-l-orange-500 shadow-sm transition-all"
                            title="CLIQUE PARA EXPANDIR E VER LIBERAÇÕES"
                          >
                            <TableCell>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 px-2 sm:px-3 rounded-xl border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20 shadow-sm min-w-[3rem] sm:min-w-[3.5rem]">
                                  <span className="text-[0.55rem] sm:text-[0.65rem] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 opacity-80">Quadra</span>
                                  <span className="text-lg sm:text-xl font-black text-orange-800 dark:text-orange-200">{group.quadra.toUpperCase()}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 px-2 sm:px-3 rounded-xl border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20 shadow-sm min-w-[3rem] sm:min-w-[3.5rem]">
                                  <span className="text-[0.55rem] sm:text-[0.65rem] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 opacity-80">Lote</span>
                                  <span className="text-lg sm:text-xl font-black text-orange-800 dark:text-orange-200">{group.lote.toUpperCase()}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell colSpan={2}>
                              <div className="flex flex-col">
                                <span className="text-xs sm:text-sm font-black text-orange-800 dark:text-orange-300 uppercase flex items-center gap-2">
                                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400 animate-pulse" />
                                  Múltiplas Liberações ({group.list.length}) - CLIQUE PARA VER
                                </span>
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight mt-0.5 break-words whitespace-normal block" title={group.list.map(l => l.nome_pessoa).join(", ")}>
                                  {group.list.map(l => l.nome_pessoa).join(", ")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none font-black uppercase tracking-tighter px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs shadow-sm">
                                Múltiplos ({totalVisitantes}V / {totalPrestadores}P)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-black text-orange-700 dark:text-orange-400 text-[9px] sm:text-[10px] uppercase whitespace-nowrap">
                                Vários Períodos
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge className="bg-success text-success-foreground font-black uppercase px-3 py-1 border shadow-sm">
                                Ativos
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-tighter whitespace-nowrap">
                                {group.list.length} Registros
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-2 sm:pr-6">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleGroup(group.key);
                                }}
                                className="h-8 sm:h-10 w-full sm:w-auto px-2 sm:px-4 text-orange-600 hover:text-orange-700 hover:bg-orange-100/50 dark:text-orange-400 dark:hover:bg-orange-950/30 font-black flex items-center justify-center gap-1 sm:gap-2 rounded-xl border border-orange-200 dark:border-orange-900/50 text-[10px] sm:text-xs"
                              >
                                {isExpanded ? "RECOLHER" : "VER LIBERAÇÕES"}
                                <span className="text-[8px] sm:text-[9px]">{isExpanded ? "▲" : "▼"}</span>
                              </Button>
                            </TableCell>
                          </TableRow>

                          {isExpanded &&
                            group.list.map((lib) => (
                              <TableRow
                                key={lib.id}
                                className={cn(
                                  "border-l-4 animate-in slide-in-from-top-1 duration-100",
                                  lib.tipo_acesso === "visitante"
                                    ? "bg-sky-50/30 hover:bg-sky-100/30 dark:bg-sky-950/5 dark:hover:bg-sky-900/10 border-l-sky-400"
                                    : "bg-yellow-50/30 hover:bg-yellow-100/30 dark:bg-yellow-950/5 dark:hover:bg-yellow-900/10 border-l-yellow-400"
                                )}
                              >
                                <TableCell className="pl-4 sm:pl-8">
                                  <div className="flex items-center gap-2 opacity-60">
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Liberação</span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-bold uppercase text-slate-800 dark:text-slate-200 break-words whitespace-normal min-w-[130px] sm:min-w-[160px] text-xs sm:text-sm">{lib.nome_pessoa.toUpperCase()}</TableCell>
                                <TableCell className="min-w-[120px] max-w-[220px] break-words whitespace-normal text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase" title={lib.observacoes}>
                                  {lib.observacoes || "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "font-black uppercase tracking-tighter px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs border-2 shadow-sm",
                                      lib.tipo_acesso === "visitante"
                                        ? "bg-accent text-accent-foreground border-accent-foreground/10 hover:bg-accent/90"
                                        : "bg-warning text-warning-foreground border-warning-foreground/10 hover:bg-warning/90"
                                    )}
                                  >
                                    {lib.tipo_acesso === "visitante" ? "Visitante" : "Prestador"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-black text-slate-700 dark:text-slate-300 text-xs sm:text-sm whitespace-nowrap">
                                  Até {format(new Date(lib.data_fim + "T00:00:00"), "dd/MM", { locale: ptBR })}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
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
                                <TableCell className="hidden sm:table-cell text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm whitespace-nowrap">
                                  <span>{format(new Date(lib.criado_em), "dd/MM/yy")}</span>
                                  <span className="mx-1 text-slate-300">•</span>
                                  <span>{format(new Date(lib.criado_em), "HH:mm")}</span>
                                </TableCell>
                                <TableCell className="text-right pr-2 sm:pr-6">
                                  <div className="flex justify-end gap-0.5 sm:gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingLiberacao(lib);
                                      }}
                                      className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500 hover:text-blue-600 hover:bg-blue-50 shadow-sm hover:shadow-blue-100 transition-all rounded-full"
                                      title="EDITAR LIBERAÇÃO"
                                    >
                                      <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLiberacaoToInactivate(lib.id);
                                      }}
                                      className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500 hover:text-orange-600 hover:bg-orange-50 shadow-sm hover:shadow-orange-100 transition-all rounded-full"
                                      title="Inativar (tirar das ativas de hoje)"
                                    >
                                      <UserX className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLiberacaoToDelete(lib.id);
                                      }}
                                      className="h-8 w-8 sm:h-10 sm:w-10 text-destructive hover:text-destructive-foreground hover:bg-destructive shadow-sm hover:shadow-destructive/40 transition-all rounded-full"
                                      title="EXCLUIR PERMANENTEMENTE"
                                    >
                                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                        </Fragment>
                      );
                    });
                  })()}
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

      <AlertDialog open={!!liberacaoToInactivate} onOpenChange={() => setLiberacaoToInactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar Liberação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar esta liberação? Ela será removida da lista de ativas de hoje, mas continuará salva no histórico de registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleInactivate} className="bg-orange-500 text-white hover:bg-orange-600">
              Inativar
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

      {/* Popup de Nova Liberação */}
      {/* Popup de Nova Liberação Customizado com DialogPrimitive para evitar fechamento indesejado */}
      <DialogPrimitive.Root open={!!newLiberacaoPopup} onOpenChange={() => {}}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="fixed left-[50%] top-[50%] z-[100] w-[95%] sm:max-w-[550px] translate-x-[-50%] translate-y-[-50%] border-4 border-orange-500 bg-white dark:bg-slate-900 shadow-[0_0_50px_rgba(249,115,22,0.6)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 focus:outline-none rounded-2xl flex flex-col max-h-[90vh] overflow-y-auto p-0"
          >
            {newLiberacaoPopup && (
              <>
                {/* Header Banner - Coloration that calls attention */}
                <div className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white p-5 text-center flex flex-col items-center gap-3 border-b-4 border-orange-500">
                  <div className="bg-white/20 p-2.5 rounded-full animate-bounce border-2 border-white/40 shadow-inner">
                    <AlertTriangle className="h-10 w-10 text-white animate-pulse" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white leading-tight">
                    ATENÇÃO: NOVA LIBERAÇÃO ADICIONADA
                  </h2>
                </div>

                <div className="p-6 space-y-6 flex-1">
                  {/* Nome do Visitante/Prestador */}
                  <div className="text-center bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Nome</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight block px-2 break-words whitespace-normal leading-snug">
                      {newLiberacaoPopup.nome_pessoa}
                    </span>
                  </div>

                  {/* Quadra e Lote */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 shadow-sm">
                      <span className="text-[0.7rem] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Quadra</span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{newLiberacaoPopup.quadra.toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 shadow-sm">
                      <span className="text-[0.7rem] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Lote</span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{newLiberacaoPopup.lote.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Horário de Adição e Tipo de Acesso */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                      <Clock className="h-6 w-6 text-orange-500 animate-pulse shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[0.65rem] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Horário</span>
                        <span className="text-base font-black text-slate-950 dark:text-white">
                          {format(new Date(newLiberacaoPopup.criado_em), "HH:mm")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                      <div className={cn(
                        "h-3 w-3 rounded-full shrink-0 animate-ping",
                        newLiberacaoPopup.tipo_acesso === "visitante" ? "bg-sky-500" : "bg-yellow-500"
                      )} />
                      <div className="flex flex-col">
                        <span className="text-[0.65rem] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tipo Acesso</span>
                        <span className="text-sm font-black text-slate-950 dark:text-white uppercase">
                          {newLiberacaoPopup.tipo_acesso === "visitante" ? "Visitante" : "Prestador"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  {newLiberacaoPopup.observacoes && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 rounded-xl p-4 text-center shadow-inner">
                      <span className="text-[0.65rem] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Observações</span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase italic whitespace-normal break-words leading-relaxed">
                        "{newLiberacaoPopup.observacoes}"
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Button */}
                <div className="p-6 border-t bg-slate-50 dark:bg-slate-900/50 flex justify-center">
                  <Button 
                    onClick={() => setNewLiberacaoPopup(null)} 
                    className="w-full font-black uppercase text-base tracking-widest h-14 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-2 border-white/10"
                  >
                    Entendido!
                  </Button>
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

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
