import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Trash2, Package, Plus } from "lucide-react";
import { format } from "date-fns";
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
    codigo: string;
    quadra: string;
    lote: string;
    status: string;
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
    const [codigo, setCodigo] = useState("");
    const [status, setStatus] = useState("Entregue");

    // Quadra e Lote fixos para condomínio
    const quadraFixa = "CON999";
    const loteFixo = "CON999";

    const fetchEncomendas = async () => {
        setIsLoading(true);

        // Pegar data de hoje no formato YYYY-MM-DD
        const today = new Date();
        const todayStr = format(today, "yyyy-MM-dd");

        const { data, error } = await supabase
            .from("encomendas")
            .select("*")
            .gte("criado_em", `${todayStr}T00:00:00`)
            .lte("criado_em", `${todayStr}T23:59:59`)
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
        if (!nomeEntregador || !empresaFinal || !codigo) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        const { error } = await supabase
            .from("encomendas")
            .insert([{
                nome_entregador: nomeEntregador,
                empresa: empresaFinal,
                codigo: codigo,
                quadra: quadraFixa,
                lote: loteFixo,
                status: status
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
            setCodigo("");
            setStatus("Entregue");
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
            encomenda.codigo.toLowerCase().includes(searchLower) ||
            encomenda.quadra.toLowerCase().includes(searchLower) ||
            encomenda.lote.toLowerCase().includes(searchLower)
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
                            placeholder="Buscar por entregador, empresa, código, quadra ou lote..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Formulário inline para adicionar encomenda */}
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Registrar Nova Encomenda
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <Input
                                placeholder="Nome do Entregador"
                                value={nomeEntregador}
                                onChange={(e) => setNomeEntregador(e.target.value)}
                                className="md:col-span-2"
                            />

                            {/* Select de Empresa */}
                            <div className="flex flex-col gap-2">
                                <Select value={empresaSelecionada} onValueChange={setEmpresaSelecionada}>
                                    <SelectTrigger>
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
                                        className="mt-1"
                                    />
                                )}
                            </div>

                            <Input
                                placeholder="Código"
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value)}
                            />
                            <Input
                                placeholder="Quadra"
                                value={quadraFixa}
                                disabled
                                className="w-24 bg-muted text-muted-foreground"
                            />
                            <Input
                                placeholder="Lote"
                                value={loteFixo}
                                disabled
                                className="w-24 bg-muted text-muted-foreground"
                            />
                        </div>
                        <div className="flex gap-3 mt-3">
                            <Input
                                placeholder="Status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="max-w-xs"
                            />
                            <Button onClick={handleAddEncomenda} className="gap-2">
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
                                        <TableHead>Nome do Entregador</TableHead>
                                        <TableHead>Empresa</TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Destino</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Data/Hora</TableHead>
                                        <TableHead>Remover</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEncomendas.map((encomenda) => (
                                        <TableRow key={encomenda.id} className="bg-orange-50/50 hover:bg-orange-100/50">
                                            <TableCell className="font-medium">{encomenda.nome_entregador}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-purple-200 text-purple-900 hover:bg-purple-300">
                                                    {encomenda.empresa}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono font-bold">{encomenda.codigo}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col items-center justify-center bg-blue-100 p-1 px-2 rounded-md border border-blue-300 shadow-sm min-w-[3.5rem]">
                                                        <span className="text-[0.6rem] font-bold text-black uppercase tracking-widest">Quadra</span>
                                                        <span className="text-lg font-black text-blue-900">{encomenda.quadra}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center justify-center bg-blue-100 p-1 px-2 rounded-md border border-blue-300 shadow-sm min-w-[3.5rem]">
                                                        <span className="text-[0.6rem] font-bold text-gray-700 uppercase tracking-widest">Lote</span>
                                                        <span className="text-lg font-black text-blue-900">{encomenda.lote}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-600 hover:bg-green-700">
                                                    {encomenda.status}
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
