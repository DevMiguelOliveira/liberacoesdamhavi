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
import { Search, Loader2, Trash2, Plus, Pencil, CheckCircle, AlertTriangle, Calendar, User, RefreshCw, Check } from "lucide-react";
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
    status: "finalizada" | "pendente";
    autor: string;
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

    // Estados do formulário de criação
    const [mensagem, setMensagem] = useState("");
    const [statusSelecionado, setStatusSelecionado] = useState<"finalizada" | "pendente">("pendente");
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
                    status: statusSelecionado,
                    autor: autor.trim().toUpperCase(),
                    admin_id: admin?.id || null
                }]);

            if (error) throw error;

            toast.success("Ocorrência registrada com sucesso!");
            // Limpar formulário mantendo o autor
            setMensagem("");
            setStatusSelecionado("pendente");
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

        try {
            const { error } = await (supabase as any)
                .from("ocorrencias")
                .update({
                    mensagem: editingOcorrencia.mensagem.trim(),
                    status: editingOcorrencia.status,
                    autor: editingOcorrencia.autor.trim().toUpperCase(),
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

    // Alternar status de forma rápida na tabela
    const handleToggleStatus = async (ocorrencia: Ocorrencia) => {
        const novoStatus = ocorrencia.status === "finalizada" ? "pendente" : "finalizada";
        try {
            const { error } = await (supabase as any)
                .from("ocorrencias")
                .update({ status: novoStatus })
                .eq("id", ocorrencia.id);

            if (error) throw error;

            toast.success(`Status alterado para ${novoStatus === "finalizada" ? "Finalizada" : "Pendente"}`);
            fetchOcorrencias(true);
        } catch (error) {
            console.error("Erro ao alternar status:", error);
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
                        OCORRÊNCIAS E NOTIFICAÇÕES PARA O CONDOMÍNIO
                    </CardTitle>
                    <CardDescription>
                        Registro interno de ocorrências, comunicados e notificações da portaria.
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
                                Registrar Ocorrência / Notificação
                            </h3>
                            <Badge variant="outline" className="bg-white dark:bg-slate-900 text-xs font-semibold text-muted-foreground border-slate-200 dark:border-slate-800 gap-1">
                                <Calendar className="h-3 w-3" />
                                Data: {format(new Date(), "dd/MM/yyyy")}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                            {/* Mensagem da Ocorrência */}
                            <div className="lg:col-span-5 flex flex-col gap-2">
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

                            {/* Status Selector - Custom Premium Design */}
                            <div className="lg:col-span-2 flex flex-col gap-2">
                                <Label className="font-bold text-xs text-slate-600 dark:text-slate-400 uppercase">
                                    Status
                                </Label>
                                <div className="flex gap-2 h-12">
                                    <button
                                        type="button"
                                        onClick={() => setStatusSelecionado("pendente")}
                                        className={`flex-1 flex items-center justify-center rounded-lg font-black text-xs transition-all duration-300 border-2 uppercase tracking-wider ${
                                            statusSelecionado === "pendente"
                                                ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20 scale-102"
                                                : "bg-white dark:bg-slate-950 text-orange-500 border-orange-200 dark:border-orange-950/60 hover:bg-orange-50"
                                        }`}
                                    >
                                        Pendente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusSelecionado("finalizada")}
                                        className={`flex-1 flex items-center justify-center rounded-lg font-black text-xs transition-all duration-300 border-2 uppercase tracking-wider ${
                                            statusSelecionado === "finalizada"
                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 scale-102"
                                                : "bg-white dark:bg-slate-950 text-emerald-600 border-emerald-200 dark:border-emerald-950/60 hover:bg-emerald-50"
                                        }`}
                                    >
                                        Finalizada
                                    </button>
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
                                                    : "bg-orange-50/20 hover:bg-orange-100/20 dark:bg-orange-950/5 dark:hover:bg-orange-950/10"
                                            }`}
                                        >
                                            {/* Status Badge clickable to fast toggle */}
                                            <TableCell className="align-middle">
                                                <button
                                                    onClick={() => handleToggleStatus(oc)}
                                                    className="focus:outline-none transition-transform active:scale-95"
                                                    title="Clique para alternar o status rapidamente"
                                                >
                                                    {oc.status === "finalizada" ? (
                                                        <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-900/60 font-black uppercase text-[10px] tracking-widest py-1 px-2.5">
                                                            Finalizada
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-2 border-orange-200 dark:border-orange-900/60 font-black uppercase text-[10px] tracking-widest py-1 px-2.5">
                                                            Pendente
                                                        </Badge>
                                                    )}
                                                </button>
                                            </TableCell>

                                            <TableCell className="font-bold text-slate-800 dark:text-slate-200 break-words whitespace-normal max-w-lg text-sm uppercase">
                                                {oc.mensagem}
                                            </TableCell>

                                            <TableCell className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">
                                                {oc.autor}
                                            </TableCell>

                                            <TableCell className="font-semibold text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                                {format(new Date(oc.criado_em), "dd/MM/yyyy HH:mm")}
                                            </TableCell>

                                            <TableCell className="text-right pr-6 align-middle">
                                                <div className="flex justify-end gap-2">
                                                    {/* Toggle status shortcut button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleToggleStatus(oc)}
                                                        className={`h-8 w-8 rounded-full ${
                                                            oc.status === "finalizada"
                                                                ? "text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                        }`}
                                                        title={oc.status === "finalizada" ? "Marcar como Pendente" : "Marcar como Finalizada"}
                                                    >
                                                        {oc.status === "finalizada" ? (
                                                            <AlertTriangle className="h-4 w-4" />
                                                        ) : (
                                                            <Check className="h-4 w-4" />
                                                        )}
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setEditingOcorrencia(oc)}
                                                        className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                                        title="EDITAR RELATO"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setOcorrenciaToDelete(oc.id)}
                                                        className="h-8 w-8 text-destructive hover:text-destructive-foreground hover:bg-destructive rounded-full"
                                                        title="EXCLUIR REGISTRO"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
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
                                        onClick={() => setEditingOcorrencia({ ...editingOcorrencia, status: "pendente" })}
                                        className={`flex-1 py-2.5 rounded-lg font-black text-xs border-2 uppercase ${
                                            editingOcorrencia.status === "pendente"
                                                ? "bg-orange-500 text-white border-orange-500"
                                                : "bg-white dark:bg-slate-950 text-orange-500 border-orange-200"
                                        }`}
                                    >
                                        Pendente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingOcorrencia({ ...editingOcorrencia, status: "finalizada" })}
                                        className={`flex-1 py-2.5 rounded-lg font-black text-xs border-2 uppercase ${
                                            editingOcorrencia.status === "finalizada"
                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                : "bg-white dark:bg-slate-950 text-emerald-600 border-emerald-200"
                                        }`}
                                    >
                                        Finalizada
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingOcorrencia(null)}>Cancelar</Button>
                        <Button onClick={handleUpdateOcorrencia}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
