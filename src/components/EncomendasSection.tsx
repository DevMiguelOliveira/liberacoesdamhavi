import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Trash2, Package, Plus } from "lucide-react";
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

    useEffect(() => {
        fetchEncomendas();

        // Realtime subscription
        const channel = supabase
            .channel("encomendas-changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "encomendas",
                },
                () => {
                    fetchEncomendas();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
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
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        ENCOMENDAS HOJE
                    </CardTitle>
                    <CardDescription>
                        Registro de encomendas recebidas
                    </CardDescription>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar por entregador, empresa ou destino..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Formulário inline para adicionar encomenda */}

                    <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                                <Plus className="h-4 w-4 text-primary" />
                                Registrar Nova Encomenda
                            </h3>
                            <Badge variant="outline" className="bg-white text-xs font-normal text-muted-foreground border-slate-200">
                                Destino: {destinoFixo}
                            </Badge>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 items-start">
                            <div className="flex-1 w-full">
                                <Input
                                    placeholder="Nome do Entregador"
                                    value={nomeEntregador}
                                    onChange={(e) => setNomeEntregador(e.target.value)}
                                    className="bg-white border-slate-200 focus:border-primary"
                                />
                            </div>

                            <div className="w-full md:w-64 flex flex-col gap-2">
                                <Select value={empresaSelecionada} onValueChange={setEmpresaSelecionada}>
                                    <SelectTrigger className="bg-white border-slate-200">
                                        <SelectValue placeholder="Selecione a empresa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Shopee">Shopee</SelectItem>
                                        <SelectItem value="Mercado Livre">Mercado Livre</SelectItem>
                                        <SelectItem value="Amazon">Amazon</SelectItem>
                                        <SelectItem value="Magalu">Magalu</SelectItem>
                                        <SelectItem value="Correios">Correios</SelectItem>
                                        <SelectItem value="outra">Outra (Manual)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {empresaSelecionada === "outra" && (
                                    <Input
                                        placeholder="Digite o nome da empresa"
                                        value={empresaManual}
                                        onChange={(e) => setEmpresaManual(e.target.value)}
                                        className="bg-white border-slate-200"
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
                            Nenhuma encomenda registrada hoje.
                        </p>
                    ) : filteredEncomendas.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">
                            Nenhuma encomenda encontrada com o termo "{searchTerm}".
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
                                        <TableHead>Remover</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEncomendas.map((encomenda) => (
                                        <TableRow key={encomenda.id} className="bg-orange-50/50 hover:bg-orange-100/50">
                                            <TableCell>
                                                <Badge variant="outline" className="bg-white/50 text-muted-foreground">
                                                    {encomenda.destino}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{encomenda.nome_entregador}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-purple-200 text-purple-900 hover:bg-purple-300">
                                                    {encomenda.empresa}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {format(new Date(encomenda.criado_em), "dd/MM/yyyy HH:mm")}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setEncomendaToDelete(encomenda.id)}
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
            </Card >

            <AlertDialog open={!!encomendaToDelete} onOpenChange={() => setEncomendaToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Encomenda?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir este registro de encomenda? Esta ação não pode ser desfeita.
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
        </>
    );
}
