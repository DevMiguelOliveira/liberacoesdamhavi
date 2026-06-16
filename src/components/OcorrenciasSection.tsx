import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Loader2, Trash2, Plus, Pencil, CheckCircle, AlertTriangle, Calendar, User, RefreshCw, Check, Clock, X } from "lucide-react";
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
import { format, startOfDay, endOfDay } from "date-fns";

interface Ocorrencia {
    id: string;
    mensagem: string;
    status: "finalizada" | "pendente" | "recusada";
    autor: string;
    motivo_recusa?: string | null;
    finalizado_por?: string | null;
    criado_em: string;
    admin_id?: string;
}

export default function OcorrenciasSection() {
    const { admin } = useAuth();
    const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [ocorrenciaToDelete, setOcorrenciaToDelete] = useState<string | null>(null);
    const [editingOcorrencia, setEditingOcorrencia] = useState<Ocorrencia | null>(null);

    // Estados do diálogo de recusa
    const [recusaOcorrenciaId, setRecusaOcorrenciaId] = useState<string | null>(null);
    const [motivoRecusaInput, setMotivoRecusaInput] = useState("");

    // Estados do diálogo de finalização
    const [finalizarOcorrenciaId, setFinalizarOcorrenciaId] = useState<string | null>(null);
    const [finalizadoPorInput, setFinalizadoPorInput] = useState("");

    // Estados do formulário de criação
    const [mensagem, setMensagem] = useState("");
    const [autor, setAutor] = useState("");

    // Sincronizar o nome do autor com o admin logado como sugestão inicial
    useEffect(() => {
        if (admin?.nome && !autor) {
            setAutor(admin.nome.toUpperCase());
        }
    }, [admin]);

    // Buscar ocorrências do dia atual
    const fetchOcorrencias = async (silent = false) => {
        if (!silent) setIsLoading(true);

        try {
            const today = new Date();
            const start = startOfDay(today).toISOString();
            // Estender fuso horário de segurança
            const endData = endOfDay(today);
            endData.setHours(endData.getHours() + 4);
            const end = endData.toISOString();

            // Usando cast (any) para evitar problemas se a tabela ainda não estiver nos types gerados do Supabase
            const { data, error } = await (supabase as any)
                .from("ocorrencias")
                .select("*")
                .gte("criado_em", start)
                .lte("criado_em", end)
                .order("criado_em", { ascending: false });

            if (error) {
                console.error("Erro ao buscar ocorrências:", error);
                setOcorrencias([]);
            } else {
                setOcorrencias(data || []);
            }
        } catch (err) {
            console.error("Erro na busca de ocorrências:", err);
            setOcorrencias([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Deletar ocorrência
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

    // Registrar ocorrência
    const handleAddOcorrencia = async () => {
        if (!mensagem.trim()) {
            toast.error("A mensagem da ocorrência/notificação não pode estar vazia");
            return;
        }

        if (!autor.trim()) {
            toast.error("Insira o nome de quem fez a ocorrência");
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await (supabase as any)
                .from("ocorrencias")
                .insert([{
                    mensagem: mensagem.trim(),
                    status: "pendente",
                    autor: autor.trim().toUpperCase(),
                    admin_id: admin?.id || null
                }]);

            if (error) throw error;

            toast.success("Ocorrência registrada com sucesso!");
            // Limpar formulário mantendo o autor
            setMensagem("");
            fetchOcorrencias();
        } catch (error: any) {
            console.error("Erro ao registrar ocorrência:", error);
            toast.error(error.message || "Erro ao registrar ocorrência");
            setIsLoading(false);
        }
    };

    // Atualizar ocorrência
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
            let finalizadoPorValue = editingOcorrencia.finalizado_por;
            if ((editingOcorrencia.status === "finalizada" || editingOcorrencia.status === "recusada") && !finalizadoPorValue) {
                finalizadoPorValue = admin?.nome?.toUpperCase() || null;
            } else if (editingOcorrencia.status === "pendente") {
                finalizadoPorValue = null;
            }

            const { error } = await (supabase as any)
                .from("ocorrencias")
                .update({
                    mensagem: editingOcorrencia.mensagem.trim(),
                    status: editingOcorrencia.status,
                    autor: editingOcorrencia.autor.trim().toUpperCase(),
                    motivo_recusa: editingOcorrencia.status === "recusada" ? editingOcorrencia.motivo_recusa?.trim().toUpperCase() : null,
                    finalizado_por: finalizadoPorValue
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

    // Abrir o modal de recusa
    const handleOpenRecusaDialog = (id: string) => {
        setRecusaOcorrenciaId(id);
        setMotivoRecusaInput("");
    };

    // Confirmar a recusa no banco de dados com a justificativa
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
                    motivo_recusa: motivoRecusaInput.trim().toUpperCase(),
                    finalizado_por: admin?.nome?.toUpperCase() || null
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

    // Alterar status diretamente
    const handleSetStatus = async (id: string, novoStatus: "finalizada" | "pendente" | "recusada") => {
        if (novoStatus === "recusada") {
            handleOpenRecusaDialog(id);
            return;
        }

        if (novoStatus === "finalizada") {
            setFinalizarOcorrenciaId(id);
            setFinalizadoPorInput(admin?.nome?.toUpperCase() || "");
            return;
        }

        try {
            const { error } = await (supabase as any)
                .from("ocorrencias")
                .update({ 
                    status: novoStatus,
                    motivo_recusa: null, // Limpa a justificativa se mudar de status
                    finalizado_por: null
                })
                .eq("id", id);

            if (error) throw error;

            let statusLabel = "Pendente";
            toast.success(`Status alterado para ${statusLabel}`);
            fetchOcorrencias(true);
        } catch (error) {
            console.error("Erro ao alterar status:", error);
            toast.error("Erro ao alterar status");
        }
    };

    // Confirmar a finalização no banco de dados com o identificador
    const handleConfirmFinalizar = async () => {
        if (!finalizarOcorrenciaId) return;
        if (!finalizadoPorInput.trim()) {
            toast.error("Você deve digitar o nome do finalizador");
            return;
        }

        try {
            const { error } = await (supabase as any)
                .from("ocorrencias")
                .update({ 
                    status: "finalizada",
                    motivo_recusa: null,
                    finalizado_por: finalizadoPorInput.trim().toUpperCase()
                })
                .eq("id", finalizarOcorrenciaId);

            if (error) throw error;

            toast.success("Ocorrência marcada como Finalizada");
            setFinalizarOcorrenciaId(null);
            setFinalizadoPorInput("");
            fetchOcorrencias(true);
        } catch (error) {
            console.error("Erro ao finalizar ocorrência:", error);
            toast.error("Erro ao alterar status");
        }
    };



    useEffect(() => {
        fetchOcorrencias();

        // Realtime subscription
        const channel = (supabase as any)
            .channel("ocorrencias-realtime-channel")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "ocorrencias",
                },
                (payload: any) => {
                    console.log("📡 [Ocorrências] Realtime event recebido:", payload.eventType, payload);
                    fetchOcorrencias(true);
                }
            )
            .subscribe((status: string, err: any) => {
                console.log("📡 [Ocorrências] Status da subscription:", status);
                if (err) {
                    console.error("📡 [Ocorrências] Erro na subscription:", err);
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
        const statusPT = oc.status === "finalizada" ? "finalizada" : "pendente";
        return (
            oc.mensagem.toLowerCase().includes(searchLower) ||
            oc.autor.toLowerCase().includes(searchLower) ||
            statusPT.includes(searchLower)
        );
    });

    return (
        <>
            <Card id="ocorrencias-section" className="border-t-4 border-t-amber-500">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
                        COMUNICADOS, OCORRÊNCIAS E NOTIFICAÇÕES PARA O CONDOMÍNIO
                    </CardTitle>
                    <CardDescription>
                        Registro interno de comunicados, ocorrências, solicitações e notificações.
                    </CardDescription>

                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="BUSCAR POR MENSAGEM, AUTOR OU STATUS..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                            className="pl-10 uppercase font-semibold"
                        />
                    </div>

                    {/* Form para adicionar Ocorrência */}
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black flex items-center gap-2 text-slate-700 dark:text-slate-300 uppercase">
                                <Plus className="h-4 w-4 text-amber-500" />
                                TODAS AS NOTIFICAÇÕES SERÃO ANALISADAS PELA ADMINISTRAÇÃO.
                            </h3>
                            <Badge variant="outline" className="bg-white dark:bg-slate-900 text-xs font-semibold text-muted-foreground border-slate-200 dark:border-slate-800 gap-1">
                                <Calendar className="h-3 w-3" />
                                Data: {format(new Date(), "dd/MM/yyyy")}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                            {/* Mensagem da Ocorrência */}
                            <div className="lg:col-span-7 flex flex-col gap-2">
                                <Label htmlFor="form-mensagem" className="font-bold text-xs text-slate-600 dark:text-slate-400 uppercase">
                                    Mensagem / Relato da Ocorrência
                                </Label>
                                <Input
                                    id="form-mensagem"
                                    placeholder="DIGITE A OCORRÊNCIA OU NOTIFICAÇÃO..."
                                    value={mensagem}
                                    onChange={(e) => setMensagem(e.target.value.toUpperCase())}
                                    className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:border-amber-500 uppercase font-bold text-sm h-12"
                                />
                            </div>

                            {/* Nome de quem fez a ocorrência */}
                            <div className="lg:col-span-3 flex flex-col gap-2">
                                <Label htmlFor="form-autor" className="font-bold text-xs text-slate-600 dark:text-slate-400 uppercase">
                                    Quem fez a ocorrência
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="form-autor"
                                        placeholder="NOME DO PORTEIRO/ADMIN"
                                        value={autor}
                                        onChange={(e) => setAutor(e.target.value.toUpperCase())}
                                        className="pl-10 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:border-amber-500 uppercase font-bold text-sm h-12"
                                    />
                                </div>
                            </div>

                            {/* Botão Registrar */}
                            <div className="lg:col-span-2">
                                <Button
                                    onClick={handleAddOcorrencia}
                                    className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black uppercase text-sm shadow-md flex items-center justify-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Registrar
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : ocorrencias.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">
                            Nenhuma ocorrência registrada hoje.
                        </p>
                    ) : filteredOcorrencias.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">
                            Nenhuma ocorrência encontrada com o termo "{searchTerm}".
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50 border-b">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">Status</TableHead>
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
                                            <TableCell className="align-middle">
                                                {oc.status === "finalizada" && (
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-900/60 font-black uppercase text-[10px] tracking-widest py-1 px-2.5">
                                                            Finalizada
                                                        </Badge>
                                                        {oc.finalizado_por && (
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter block leading-tight">
                                                                Por: {oc.finalizado_por}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {oc.status === "pendente" && (
                                                    <Badge className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-2 border-orange-200 dark:border-orange-900/60 font-black uppercase text-[10px] tracking-widest py-1 px-2.5">
                                                        Pendente
                                                    </Badge>
                                                )}
                                                {oc.status === "recusada" && (
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <Badge className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-2 border-red-200 dark:border-red-900/60 font-black uppercase text-[10px] tracking-widest py-1 px-2.5">
                                                            Recusada
                                                        </Badge>
                                                        {oc.finalizado_por && (
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter block leading-tight">
                                                                Por: {oc.finalizado_por}
                                                            </span>
                                                        )}
                                                    </div>
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
                                                {format(new Date(oc.criado_em), "dd/MM/yyyy HH:mm")}
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

            {/* Dialog Identificar Finalizador */}
            <Dialog open={!!finalizarOcorrenciaId} onOpenChange={(open) => !open && setFinalizarOcorrenciaId(null)}>
                <DialogContent className="sm:max-w-[425px] border-4 border-emerald-500">
                    <DialogHeader>
                        <DialogTitle className="text-emerald-600 flex items-center gap-2 font-black uppercase tracking-tight">
                            <Check className="h-5 w-5 animate-pulse" />
                            Finalizar Ocorrência
                        </DialogTitle>
                        <DialogDescription className="font-semibold text-xs text-muted-foreground">
                            Confirme ou digite o nome do funcionário que está finalizando esta ocorrência.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="finalizado-por" className="font-bold text-xs uppercase text-slate-600">
                                Nome do Finalizador
                            </Label>
                            <Input
                                id="finalizado-por"
                                placeholder="NOME DO PORTEIRO/ADMIN"
                                value={finalizadoPorInput}
                                onChange={(e) => setFinalizadoPorInput(e.target.value.toUpperCase())}
                                className="uppercase font-bold border-emerald-300 focus:border-emerald-500 h-12"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFinalizarOcorrenciaId(null)}>Cancelar</Button>
                        <Button onClick={handleConfirmFinalizar} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wide">
                            Confirmar Finalização
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
