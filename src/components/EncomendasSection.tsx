import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Trash2, Package, Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format, startOfDay, endOfDay } from "date-fns";
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

interface Encomenda {
    id: string;
    nome_entregador: string;
    empresa: string;
    destino: string;
    criado_em: string;
}

export default function EncomendasSection() {
    const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [encomendaToDelete, setEncomendaToDelete] = useState<string | null>(null);
    const [editingEncomenda, setEditingEncomenda] = useState<Encomenda | null>(null);

    // Estados do formulário
    const [nomeEntregador, setNomeEntregador] = useState("");
    const [empresaSelecionada, setEmpresaSelecionada] = useState("");
    const [empresaManual, setEmpresaManual] = useState("");

    // Destino fixo para condomínio
    const destinoFixo = "CON999";

    const fetchEncomendas = async () => {
        setIsLoading(true);

        const today = new Date();
        const start = startOfDay(today).toISOString();
        // Estender o final do dia em 4 horas para garantir que diferenças de fuso horário não escondam registros do final do dia
        const endData = endOfDay(today);
        endData.setHours(endData.getHours() + 4);
        const end = endData.toISOString();

        const { data, error } = await supabase
            .from("encomendas")
            .select("*")
            .gte("criado_em", start)
            .lte("criado_em", end)
            .order("criado_em", { ascending: false });

        if (error) {
            console.error("Erro ao buscar encomendas:", error);
            setEncomendas([]);
        } else {
            setEncomendas(data || []);
        }
        setIsLoading(false);
    };

    const handleDelete = async () => {
        if (!encomendaToDelete) return;

        const { error } = await supabase
            .from("encomendas")
            .delete()
            .eq("id", encomendaToDelete);

        if (error) {
            toast.error("Erro ao excluir encomenda");
            console.error(error);
        } else {
            toast.success("Encomenda excluída com sucesso");
            fetchEncomendas();
        }
        setEncomendaToDelete(null);
        setEncomendaToDelete(null);
    };

    const handleUpdateEncomenda = async () => {
        if (!editingEncomenda) return;

        try {
            const { error } = await supabase
                .from("encomendas")
                .update({
                    nome_entregador: editingEncomenda.nome_entregador,
                    empresa: editingEncomenda.empresa,
                })
                .eq("id", editingEncomenda.id);

            if (error) throw error;

            toast.success("Encomenda atualizada com sucesso");
            setEditingEncomenda(null);
            fetchEncomendas();
        } catch (error) {
            console.error("Erro ao atualizar encomenda:", error);
            toast.error("Erro ao atualizar encomenda");
        }
    };

    const handleAddEncomenda = async () => {
        // Determinar qual nome de empresa usar
        const empresaFinal = empresaSelecionada === "outra" ? empresaManual : empresaSelecionada;

        // Validação básica
        if (!nomeEntregador || !empresaFinal) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        const { error } = await supabase
            .from("encomendas")
            .insert([{
                nome_entregador: nomeEntregador,
                empresa: empresaFinal,
                destino: destinoFixo
            }]);

        if (error) {
            toast.error("Erro ao registrar encomenda");
            console.error(error);
        } else {
            toast.success("Encomenda registrada com sucesso");
            // Limpar formulário
            setNomeEntregador("");
            setEmpresaSelecionada("");
            setEmpresaManual("");
            fetchEncomendas();
        }
    };

    const handleNomeEntregadorChange = (val: string) => {
        setNomeEntregador(val.toUpperCase());
    };

    const handleEmpresaManualChange = (val: string) => {
        setEmpresaManual(val.toUpperCase());
    };

    useEffect(() => {
        fetchEncomendas();

        // Realtime subscription com logs detalhados
        const channel = supabase
            .channel("encomendas-realtime-channel")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "encomendas",
                },
                (payload) => {
                    console.log("📡 [Encomendas] Realtime event recebido:", payload.eventType, payload);
                    fetchEncomendas();
                }
            )
            .subscribe((status, err) => {
                console.log("📡 [Encomendas] Status da subscription:", status);
                if (err) {
                    console.error("📡 [Encomendas] Erro na subscription:", err);
                }
                if (status === "SUBSCRIBED") {
                    console.log("✅ [Encomendas] Realtime conectado com sucesso!");
                }
                if (status === "CHANNEL_ERROR") {
                    console.error("❌ [Encomendas] Erro no canal - usando fallback de polling");
                }
                if (status === "TIMED_OUT") {
                    console.warn("⏰ [Encomendas] Timeout na conexão realtime");
                }
            });

        // Fallback: Polling a cada 30 segundos para garantir sincronização
        // Isso garante que mesmo se o realtime falhar, os dados serão atualizados
        const pollingInterval = setInterval(() => {
            console.log("🔄 [Encomendas] Polling de fallback executando...");
            fetchEncomendas();
        }, 30000); // 30 segundos

        return () => {
            console.log("🔌 [Encomendas] Removendo subscription e polling...");
            supabase.removeChannel(channel);
            clearInterval(pollingInterval);
        };
    }, []);

    // Filtrar encomendas
    const filteredEncomendas = encomendas.filter((encomenda) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            encomenda.nome_entregador.toLowerCase().includes(searchLower) ||
            encomenda.empresa.toLowerCase().includes(searchLower) ||
            encomenda.destino.toLowerCase().includes(searchLower)
        );
    });

    return (
        <>
            <Card id="encomendas-section">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        ENTRADA DE ENCOMENDAS E PRESTADORES PARA O CONDOMÍNIO
                    </CardTitle>
                    <CardDescription>
                        Registro de Entregadores e Prestadores que acessaram o condomínio.
                    </CardDescription>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="BUSCAR POR NOME OU EMPRESA..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                            className="pl-10 uppercase font-semibold"
                        />
                    </div>

                    {/* Formulário inline para adicionar encomenda */}

                    <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                                <Plus className="h-4 w-4 text-primary" />
                                Registrar Entrada
                            </h3>
                            <Badge variant="outline" className="bg-white text-xs font-normal text-muted-foreground border-slate-200">
                                Destino: {destinoFixo}
                            </Badge>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 items-start">
                            <div className="flex-1 w-full">
                                <Input
                                    placeholder="NOME DO ENTREGADOR OU PRESTADOR"
                                    value={nomeEntregador}
                                    onChange={(e) => handleNomeEntregadorChange(e.target.value)}
                                    className="bg-white border-slate-300 focus:border-primary uppercase font-bold text-lg h-12"
                                />
                            </div>

                            <div className="w-full md:w-64 flex flex-col gap-2">
                                <Select value={empresaSelecionada} onValueChange={setEmpresaSelecionada}>
                                    <SelectTrigger className="bg-white border-slate-300 font-bold uppercase h-12">
                                        <SelectValue placeholder="SELECIONE A EMPRESA" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SEMAE">SEMAE</SelectItem>
                                        <SelectItem value="MERCADINHO KW">MERCADINHO KW</SelectItem>
                                        <SelectItem value="ADMINISTRAÇÃO">ADMINISTRAÇÃO</SelectItem>
                                        <SelectItem value="SHOPEE">SHOPEE</SelectItem>
                                        <SelectItem value="MERCADO LIVRE">MERCADO LIVRE</SelectItem>
                                        <SelectItem value="AMAZON">AMAZON</SelectItem>
                                        <SelectItem value="MAGALU">MAGALU</SelectItem>
                                        <SelectItem value="CORREIOS">CORREIOS</SelectItem>
                                        <SelectItem value="JADLOG">JADLOG</SelectItem>
                                        <SelectItem value="TOTAL EXPRESS">TOTAL EXPRESS</SelectItem>
                                        <SelectItem value="AZUL CARGO">AZUL CARGO</SelectItem>
                                        <SelectItem value="outra">OUTRA (MANUAL)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {empresaSelecionada === "outra" && (
                                    <Input
                                        placeholder="NOME DA EMPRESA"
                                        value={empresaManual}
                                        onChange={(e) => handleEmpresaManualChange(e.target.value)}
                                        className="bg-white border-slate-300 uppercase font-bold h-12"
                                    />
                                )}
                            </div>

                            <Button onClick={handleAddEncomenda} className="gap-2 bg-primary hover:bg-primary/90 shadow-sm w-full md:w-auto min-w-[120px]">
                                <Plus className="h-4 w-4" />
                                Registrar
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : encomendas.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">
                            Nenhuma entrada registrada hoje.
                        </p>
                    ) : filteredEncomendas.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">
                            Nenhuma entrada encontrada com o termo "{searchTerm}".
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Destino</TableHead>
                                        <TableHead>Nome do Entregador</TableHead>
                                        <TableHead>Empresa</TableHead>
                                        <TableHead>Data/Hora</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEncomendas.map((encomenda) => (
                                        <TableRow key={encomenda.id} className="bg-orange-50/50 hover:bg-orange-100/50">
                                            <TableCell>
                                                <Badge variant="outline" className="bg-blue-100/50 text-blue-900 border-blue-200 font-black px-3 py-1">
                                                    {encomenda.destino.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-bold uppercase text-slate-900">{encomenda.nome_entregador.toUpperCase()}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-orange-200 text-orange-900 hover:bg-orange-300 font-bold px-3 py-1 border border-orange-300 shadow-sm uppercase">
                                                    {encomenda.empresa.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {format(new Date(encomenda.criado_em), "dd/MM/yyyy HH:mm")}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setEditingEncomenda(encomenda)}
                                                        className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setEncomendaToDelete(encomenda.id)}
                                                        className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
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
            </Card >

            <AlertDialog open={!!encomendaToDelete} onOpenChange={() => setEncomendaToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Registro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir este registro de entrada? Esta ação não pode ser desfeita.
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

            <Dialog open={!!editingEncomenda} onOpenChange={(open) => !open && setEditingEncomenda(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Editar Encomenda</DialogTitle>
                        <DialogDescription>
                            Faça as alterações necessárias e clique em Salvar.
                        </DialogDescription>
                    </DialogHeader>
                    {editingEncomenda && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nome_entregador" className="font-bold">Nome do Entregador</Label>
                                <Input
                                    id="nome_entregador"
                                    value={editingEncomenda.nome_entregador}
                                    onChange={(e) => setEditingEncomenda({ ...editingEncomenda, nome_entregador: e.target.value.toUpperCase() })}
                                    className="uppercase"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="empresa" className="font-bold">Empresa</Label>
                                <Select
                                    value={["SHOPEE", "MERCADO LIVRE", "AMAZON", "MAGALU", "CORREIOS", "JADLOG", "TOTAL EXPRESS", "AZUL CARGO"].includes(editingEncomenda.empresa) ? editingEncomenda.empresa : "outra"}
                                    onValueChange={(val) => {
                                        if (val !== "outra") {
                                            setEditingEncomenda({ ...editingEncomenda, empresa: val });
                                        } else {
                                            // Se escolher manual, mantém o valor atual ou limpa se for um dos predefinidos
                                            if (["SHOPEE", "MERCADO LIVRE", "AMAZON", "MAGALU", "CORREIOS", "JADLOG", "TOTAL EXPRESS", "AZUL CARGO"].includes(editingEncomenda.empresa)) {
                                                setEditingEncomenda({ ...editingEncomenda, empresa: "" });
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="uppercase">
                                        <SelectValue placeholder="SELECIONE A EMPRESA" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SHOPEE">SHOPEE</SelectItem>
                                        <SelectItem value="MERCADO LIVRE">MERCADO LIVRE</SelectItem>
                                        <SelectItem value="AMAZON">AMAZON</SelectItem>
                                        <SelectItem value="MAGALU">MAGALU</SelectItem>
                                        <SelectItem value="CORREIOS">CORREIOS</SelectItem>
                                        <SelectItem value="JADLOG">JADLOG</SelectItem>
                                        <SelectItem value="TOTAL EXPRESS">TOTAL EXPRESS</SelectItem>
                                        <SelectItem value="AZUL CARGO">AZUL CARGO</SelectItem>
                                        <SelectItem value="outra">OUTRA (MANUAL)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    className="uppercase mt-1"
                                    value={editingEncomenda.empresa}
                                    onChange={(e) => setEditingEncomenda({ ...editingEncomenda, empresa: e.target.value.toUpperCase() })}
                                    placeholder="DIGITE O NOME DA EMPRESA"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingEncomenda(null)}>Cancelar</Button>
                        <Button onClick={handleUpdateEncomenda}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
