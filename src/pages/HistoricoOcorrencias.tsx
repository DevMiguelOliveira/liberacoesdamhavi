import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    ArrowLeft,
    Loader2,
    RefreshCw,
    Trash2,
    AlertTriangle,
    Search,
    Pencil,
    Check,
    Clock,
    X
} from "lucide-react";
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

interface Ocorrencia {
    id: string;
    mensagem: string;
    status: "finalizada" | "pendente" | "recusada";
    autor: string;
    motivo_recusa?: string | null;
    criado_em: string;
    admin_id?: string;
}

export default function HistoricoOcorrencias() {
    const navigate = useNavigate();
    const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [ocorrenciaToDelete, setOcorrenciaToDelete] = useState<string | null>(null);
    const [editingOcorrencia, setEditingOcorrencia] = useState<Ocorrencia | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Estados do diálogo de recusa
    const [recusaOcorrenciaId, setRecusaOcorrenciaId] = useState<string | null>(null);
    const [motivoRecusaInput, setMotivoRecusaInput] = useState("");

    const fetchOcorrencias = async (silent = false) => {
        if (!silent) setIsLoading(true);

        try {
            const { data, error } = await (supabase as any)
                .from("ocorrencias")
                .select("*")
                .order("criado_em", { ascending: false })
                .limit(1000); // Limite maior para o histórico

            if (error) {
                console.error("Erro ao buscar ocorrências:", error);
                toast.error("Erro ao carregar histórico de ocorrências");
            } else {
                setOcorrencias(data || []);
            }
        } catch (err) {
            console.error("Erro na busca de ocorrências:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!ocorrenciaToDelete) return;

        try {
            const { error } = await (supabase as any)
                .from("ocorrencias")
                .delete()
                .eq("id", ocorrenciaToDelete);

            if (error) {
                toast.error("Erro ao excluir ocorrência");
                console.error(error);
            } else {
                toast.success("Ocorrência excluída com sucesso");
                fetchOcorrencias();
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao processar exclusão");
        } finally {
            setOcorrenciaToDelete(null);
        }
    };

    const handleUpdateOcorrencia = async () => {
        if (!editingOcorrencia) return;

        if (!editingOcorrencia.mensagem.trim()) {
            toast.error("A mensagem não pode estar vazia");
            return;
        }

        if (!editingOcorrencia.autor.trim()) {
            toast.error("O nome do autor não pode estar vazio");
            return;
        }

        if (editingOcorrencia.status === "recusada" && !editingOcorrencia.motivo_recusa?.trim()) {
            toast.error("Você deve digitar um motivo para a recusa");
            return;
        }

        try {
            const { error } = await (supabase as any)
                .from("ocorrencias")
                .update({
                    mensagem: editingOcorrencia.mensagem.trim(),
                    status: editingOcorrencia.status,
                    autor: editingOcorrencia.autor.trim().toUpperCase(),
                    motivo_recusa: editingOcorrencia.status === "recusada" ? editingOcorrencia.motivo_recusa?.trim().toUpperCase() : null,
                })
                .eq("id", editingOcorrencia.id);

            if (error) throw error;

            toast.success("Ocorrência atualizada com sucesso");
            setEditingOcorrencia(null);
            fetchOcorrencias();
        } catch (error) {
            console.error("Erro ao atualizar ocorrência:", error);
            toast.error("Erro ao atualizar ocorrência");
        }
    };

    const handleOpenRecusaDialog = (id: string) => {
        setRecusaOcorrenciaId(id);
        setMotivoRecusaInput("");
    };

    const handleConfirmRecusa = async () => {
        if (!recusaOcorrenciaId) return;
        if (!motivoRecusaInput.trim()) {
            toast.error("Você deve digitar um motivo para recusar a ocorrência");
            return;
        }

        try {
            const { error } = await (supabase as any)
                .from("ocorrencias")
                .update({ 
                    status: "recusada",
                    motivo_recusa: motivoRecusaInput.trim().toUpperCase()
                })
                .eq("id", recusaOcorrenciaId);

            if (error) throw error;

            toast.success("Ocorrência marcada como Recusada");
            setRecusaOcorrenciaId(null);
            setMotivoRecusaInput("");
            fetchOcorrencias(true);
        } catch (error) {
            console.error("Erro ao recusar ocorrência:", error);
            toast.error("Erro ao alterar status");
        }
    };

    const handleSetStatus = async (id: string, novoStatus: "finalizada" | "pendente" | "recusada") => {
        if (novoStatus === "recusada") {
            handleOpenRecusaDialog(id);
            return;
        }

        try {
            const { error } = await (supabase as any)
                .from("ocorrencias")
                .update({ 
                    status: novoStatus,
                    motivo_recusa: null
                })
                .eq("id", id);

            if (error) throw error;

            let statusLabel = novoStatus === "finalizada" ? "Finalizada" : "Pendente";
            toast.success(`Status alterado para ${statusLabel}`);
            fetchOcorrencias(true);
        } catch (error) {
            console.error("Erro ao alterar status:", error);
            toast.error("Erro ao alterar status");
        }
    };

    useEffect(() => {
        fetchOcorrencias();

        // Realtime subscription
        const channel = (supabase as any)
            .channel("historico-ocorrencias-realtime")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "ocorrencias",
                },
                (payload: any) => {
                    console.log("📡 [Histórico Ocorrências] Realtime event recebido:", payload.eventType, payload);
                    fetchOcorrencias(true);
                }
            )
            .subscribe((status: string, err: any) => {
                console.log("📡 [Histórico Ocorrências] Status da subscription:", status);
                if (err) {
                    console.error("📡 [Histórico Ocorrências] Erro na subscription:", err);
                }
            });

        // Polling fallback
        const pollingInterval = setInterval(() => {
            fetchOcorrencias(true);
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollingInterval);
        };
    }, []);

    // Filtrar ocorrências
    const filteredOcorrencias = ocorrencias.filter((oc) => {
        const searchLower = searchTerm.toLowerCase();
        const statusPT = oc.status === "finalizada" ? "finalizada" : oc.status === "recusada" ? "recusada" : "pendente";
        return (
            oc.mensagem.toLowerCase().includes(searchLower) ||
            oc.autor.toLowerCase().includes(searchLower) ||
            statusPT.includes(searchLower)
        );
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
                            Histórico de Ocorrências
                        </h1>
                        <p className="text-muted-foreground">
                            Registro completo de ocorrências, comunicados e notificações
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por relato, autor ou status..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 uppercase font-semibold text-xs h-10"
                        />
                    </div>
                    <Button variant="outline" onClick={() => fetchOcorrencias()} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Atualizar
                    </Button>
                </div>
            </div>

            <Card className="border-t-4 border-t-red-500">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        Ocorrências Registradas
                        <Badge variant="secondary" className="ml-2 font-normal">
                            {ocorrencias.length} registros
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Lista completa de ocorrências e notificações enviadas pela portaria.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredOcorrencias.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Nenhuma ocorrência encontrada.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50 border-b">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300 pl-6">Status</TableHead>
                                        <TableHead className="font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">Mensagem / Relato</TableHead>
                                        <TableHead className="font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">Autor</TableHead>
                                        <TableHead className="font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">Data / Hora</TableHead>
                                        <TableHead className="text-right pr-6 font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-muted/30">
                                    {filteredOcorrencias.map((oc) => (
                                        <TableRow
                                            key={oc.id}
                                            className={`transition-colors ${
                                                oc.status === "finalizada"
                                                    ? "bg-emerald-50/20 hover:bg-emerald-100/20 dark:bg-emerald-950/5 dark:hover:bg-emerald-950/10"
                                                    : oc.status === "recusada"
                                                    ? "bg-rose-50/20 hover:bg-rose-100/20 dark:bg-rose-950/5 dark:hover:bg-rose-950/10"
                                                    : "bg-orange-50/20 hover:bg-orange-100/20 dark:bg-orange-950/5 dark:hover:bg-orange-950/10"
                                            }`}
                                        >
                                            {/* Status Badge */}
                                            <TableCell className="align-middle pl-6">
                                                {oc.status === "finalizada" && (
                                                    <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-900/60 font-black uppercase text-[10px] tracking-widest py-1 px-2.5">
                                                        Finalizada
                                                    </Badge>
                                                )}
                                                {oc.status === "pendente" && (
                                                    <Badge className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-2 border-orange-200 dark:border-orange-900/60 font-black uppercase text-[10px] tracking-widest py-1 px-2.5">
                                                        Pendente
                                                    </Badge>
                                                )}
                                                {oc.status === "recusada" && (
                                                    <Badge className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-2 border-red-200 dark:border-red-900/60 font-black uppercase text-[10px] tracking-widest py-1 px-2.5">
                                                        Recusada
                                                    </Badge>
                                                )}
                                            </TableCell>

                                            <TableCell className="font-bold text-slate-800 dark:text-slate-200 break-words whitespace-normal max-w-lg text-sm uppercase">
                                                <div>{oc.mensagem}</div>
                                                {oc.status === "recusada" && oc.motivo_recusa && (
                                                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-bold bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded px-2 py-1 max-w-fit">
                                                        <AlertTriangle className="h-3.5 w-3.5 animate-pulse shrink-0" />
                                                        <span>MOTIVO DA RECUSA: {oc.motivo_recusa}</span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            <TableCell className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">
                                                {oc.autor}
                                            </TableCell>

                                            <TableCell className="font-semibold text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                                {format(new Date(oc.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                            </TableCell>

                                            <TableCell className="text-right pr-6 align-middle">
                                                <div className="flex justify-end gap-2">
                                                    {/* Botão de Marcar como Finalizada */}
                                                    {oc.status !== "finalizada" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleSetStatus(oc.id, "finalizada")}
                                                            className="h-10 w-10 text-emerald-600 bg-emerald-100/80 border border-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shadow-sm transition-all duration-200 rounded-full flex items-center justify-center"
                                                            title="Marcar como Finalizada"
                                                        >
                                                            <Check className="h-5 w-5" />
                                                        </Button>
                                                    )}

                                                    {/* Botão de Marcar como Pendente */}
                                                    {oc.status !== "pendente" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleSetStatus(oc.id, "pendente")}
                                                            className="h-10 w-10 text-orange-600 bg-orange-100/80 border border-orange-300 hover:bg-orange-500 hover:text-white hover:border-orange-500 shadow-sm transition-all duration-200 rounded-full flex items-center justify-center"
                                                            title="Marcar como Pendente"
                                                        >
                                                            <Clock className="h-5 w-5" />
                                                        </Button>
                                                    )}

                                                    {/* Botão de Marcar como Recusada */}
                                                    {oc.status !== "recusada" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleSetStatus(oc.id, "recusada")}
                                                            className="h-10 w-10 text-red-600 bg-red-100/80 border border-red-300 hover:bg-red-600 hover:text-white hover:border-red-600 shadow-sm transition-all duration-200 rounded-full flex items-center justify-center"
                                                            title="Marcar como Recusada"
                                                        >
                                                            <X className="h-5 w-5" />
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setEditingOcorrencia(oc)}
                                                        className="h-10 w-10 text-blue-600 bg-blue-100/80 border border-blue-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm transition-all duration-200 rounded-full flex items-center justify-center"
                                                        title="EDITAR RELATO"
                                                    >
                                                        <Pencil className="h-5 w-5" />
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setOcorrenciaToDelete(oc.id)}
                                                        className="h-10 w-10 text-red-600 bg-red-100/80 border border-red-300 hover:bg-red-600 hover:text-white hover:border-red-600 shadow-sm transition-all duration-200 rounded-full flex items-center justify-center"
                                                        title="EXCLUIR REGISTRO"
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

            {/* Confirmar Exclusão Dialog */}
            <AlertDialog open={!!ocorrenciaToDelete} onOpenChange={() => setOcorrenciaToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir ocorrência?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza de que deseja excluir este registro de ocorrência? Esta ação não poderá ser desfeita.
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

            {/* Editar Ocorrência Dialog */}
            <Dialog open={!!editingOcorrencia} onOpenChange={(open) => !open && setEditingOcorrencia(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Editar Ocorrência / Notificação</DialogTitle>
                        <DialogDescription>
                            Altere a mensagem, autor ou status da ocorrência e clique em salvar.
                        </DialogDescription>
                    </DialogHeader>

                    {editingOcorrencia && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-mensagem" className="font-bold">Mensagem</Label>
                                <Input
                                    id="edit-mensagem"
                                    value={editingOcorrencia.mensagem}
                                    onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, mensagem: e.target.value.toUpperCase() })}
                                    className="uppercase font-bold"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-autor" className="font-bold">Autor / Porteiro</Label>
                                <Input
                                    id="edit-autor"
                                    value={editingOcorrencia.autor}
                                    onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, autor: e.target.value.toUpperCase() })}
                                    className="uppercase font-bold"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="font-bold">Status da Ocorrência</Label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingOcorrencia({ ...editingOcorrencia, status: "pendente", motivo_recusa: null })}
                                        className={`flex-1 py-2.5 rounded-lg font-black text-xs border-2 uppercase transition-all ${
                                            editingOcorrencia.status === "pendente"
                                                ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                                : "bg-white dark:bg-slate-950 text-orange-500 border-orange-200"
                                        }`}
                                    >
                                        Pendente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingOcorrencia({ ...editingOcorrencia, status: "finalizada", motivo_recusa: null })}
                                        className={`flex-1 py-2.5 rounded-lg font-black text-xs border-2 uppercase transition-all ${
                                            editingOcorrencia.status === "finalizada"
                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                                : "bg-white dark:bg-slate-950 text-emerald-600 border-emerald-200"
                                        }`}
                                    >
                                        Finalizada
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingOcorrencia({ ...editingOcorrencia, status: "recusada" })}
                                        className={`flex-1 py-2.5 rounded-lg font-black text-xs border-2 uppercase transition-all ${
                                            editingOcorrencia.status === "recusada"
                                                ? "bg-red-600 text-white border-red-600 shadow-sm"
                                                : "bg-white dark:bg-slate-950 text-red-600 border-red-200"
                                        }`}
                                    >
                                        Recusada
                                    </button>
                                </div>
                            </div>

                            {editingOcorrencia.status === "recusada" && (
                                <div className="grid gap-2 animate-in fade-in-50 duration-200">
                                    <Label htmlFor="edit-motivo-recusa" className="font-bold text-red-600">Motivo da Recusa</Label>
                                    <Input
                                        id="edit-motivo-recusa"
                                        value={editingOcorrencia.motivo_recusa || ""}
                                        onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, motivo_recusa: e.target.value.toUpperCase() })}
                                        className="uppercase font-bold border-red-300 focus:border-red-500"
                                        placeholder="DIGITE O MOTIVO DA RECUSA..."
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingOcorrencia(null)}>Cancelar</Button>
                        <Button onClick={handleUpdateOcorrencia}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Justificar Recusa */}
            <Dialog open={!!recusaOcorrenciaId} onOpenChange={(open) => !open && setRecusaOcorrenciaId(null)}>
                <DialogContent className="sm:max-w-[425px] border-4 border-red-500">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2 font-black uppercase tracking-tight">
                            <AlertTriangle className="h-5 w-5 animate-pulse" />
                            Justificar Recusa
                        </DialogTitle>
                        <DialogDescription className="font-semibold text-xs text-muted-foreground">
                            Digite abaixo o motivo pelo qual esta ocorrência/notificação foi recusada.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="motivo-recusa" className="font-bold text-xs uppercase text-slate-600">
                                Motivo da Recusa
                            </Label>
                            <Input
                                id="motivo-recusa"
                                placeholder="DIGITE O MOTIVO DA RECUSA..."
                                value={motivoRecusaInput}
                                onChange={(e) => setMotivoRecusaInput(e.target.value.toUpperCase())}
                                className="uppercase font-bold border-red-300 focus:border-red-500 h-12"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRecusaOcorrenciaId(null)}>Cancelar</Button>
                        <Button onClick={handleConfirmRecusa} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wide">
                            Confirmar Recusa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
