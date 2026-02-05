import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, RefreshCw, Trash2, Package } from "lucide-react";
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
import { Input } from "@/components/ui/input";

interface Encomenda {
    id: string;
    nome_entregador: string;
    empresa: string;
    destino: string;
    criado_em: string;
}

export default function HistoricoEncomendas() {
    const navigate = useNavigate();
    const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [encomendaToDelete, setEncomendaToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

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

    const fetchEncomendas = async () => {
        setIsLoading(true);

        const { data, error } = await supabase
            .from("encomendas")
            .select("*")
            .order("criado_em", { ascending: false })
            .limit(500); // Limite maior para histórico

        setIsLoading(false);

        if (error) {
            console.error("Error fetching encomendas:", error);
            toast.error("Erro ao carregar histórico de encomendas");
            return;
        }

        setEncomendas(data || []);
    };

    useEffect(() => {
        fetchEncomendas();

        // Realtime subscription com logs detalhados
        const channel = supabase
            .channel("historico-encomendas-realtime")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "encomendas",
                },
                (payload) => {
                    console.log("📡 [Histórico Encomendas] Realtime event recebido:", payload.eventType, payload);
                    fetchEncomendas();
                }
            )
            .subscribe((status, err) => {
                console.log("📡 [Histórico Encomendas] Status da subscription:", status);
                if (err) {
                    console.error("📡 [Histórico Encomendas] Erro na subscription:", err);
                }
                if (status === "SUBSCRIBED") {
                    console.log("✅ [Histórico Encomendas] Realtime conectado com sucesso!");
                }
            });

        // Fallback: Polling a cada 30 segundos
        const pollingInterval = setInterval(() => {
            console.log("🔄 [Histórico Encomendas] Polling de fallback executando...");
            fetchEncomendas();
        }, 30000);

        return () => {
            console.log("🔌 [Histórico Encomendas] Removendo subscription e polling...");
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
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Package className="h-6 w-6" />
                            Histórico de Encomendas
                        </h1>
                        <p className="text-muted-foreground">
                            Todas as encomendas registradas no sistema
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Buscar por entregador, empresa ou destino..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64"
                    />
                    <Button variant="outline" onClick={fetchEncomendas} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Atualizar
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registros de Encomendas</CardTitle>
                    <CardDescription>
                        Lista completa de todas as encomendas recebidas na portaria.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredEncomendas.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Nenhuma encomenda encontrada.
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Destino</TableHead>
                                        <TableHead>Nome do Entregador</TableHead>
                                        <TableHead>Empresa</TableHead>
                                        <TableHead>Data/Hora</TableHead>
                                        <TableHead className="w-[100px]">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEncomendas.map((encomenda) => (
                                        <TableRow key={encomenda.id} className="hover:bg-slate-50">
                                            <TableCell>
                                                <Badge variant="outline" className="bg-slate-100 font-normal">
                                                    {encomenda.destino}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{encomenda.nome_entregador}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-slate-100 font-normal">
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
            </Card>

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
        </div>
    );
}
