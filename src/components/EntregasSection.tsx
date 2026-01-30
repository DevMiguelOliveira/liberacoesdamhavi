import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Trash2, Package } from "lucide-react";
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

export default function EntregasSection() {
    const [entregas, setEntregas] = useState<Entrega[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [entregaToDelete, setEntregaToDelete] = useState<string | null>(null);

    const fetchEntregas = async () => {
        setIsLoading(true);

        const { data, error } = await supabase
            .from("entregas")
            .select("*")
            .order("criado_em", { ascending: false });

        if (error) {
            console.error("Erro ao buscar entregas:", error);
            setEntregas([]);
        } else {
            setEntregas(data || []);
        }
        setIsLoading(false);
    };

    const handleDelete = async () => {
        if (!entregaToDelete) return;

        const { error } = await supabase
            .from("entregas")
            .delete()
            .eq("id", entregaToDelete);

        if (error) {
            toast.error("Erro ao excluir entrega");
            console.error(error);
        } else {
            toast.success("Entrega excluída com sucesso");
            fetchEntregas();
        }
        setEntregaToDelete(null);
    };

    useEffect(() => {
        fetchEntregas();

        // Realtime subscription
        const channel = supabase
            .channel("entregas-changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "entregas",
                },
                () => {
                    fetchEntregas();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Filtrar entregas
    const filteredEntregas = entregas.filter((entrega) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            entrega.nome_entregador.toLowerCase().includes(searchLower) ||
            entrega.empresa.toLowerCase().includes(searchLower) ||
            entrega.codigo.toLowerCase().includes(searchLower) ||
            entrega.quadra.toLowerCase().includes(searchLower) ||
            entrega.lote.toLowerCase().includes(searchLower)
        );
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        ENTREGAS / ENCOMENDAS HOJE
                    </CardTitle>
                    <CardDescription>
                        Registro de entregas e encomendas recebidas
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
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : entregas.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">
                            Nenhuma entrega registrada hoje.
                        </p>
                    ) : filteredEntregas.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">
                            Nenhuma entrega encontrada com o termo "{searchTerm}".
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
                                    {filteredEntregas.map((entrega) => (
                                        <TableRow key={entrega.id} className="bg-orange-50/50 hover:bg-orange-100/50">
                                            <TableCell className="font-medium">{entrega.nome_entregador}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-purple-200 text-purple-900 hover:bg-purple-300">
                                                    {entrega.empresa}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono font-bold">{entrega.codigo}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col items-center justify-center bg-blue-100 p-1 px-2 rounded-md border border-blue-300 shadow-sm min-w-[3.5rem]">
                                                        <span className="text-[0.6rem] font-bold text-black uppercase tracking-widest">Quadra</span>
                                                        <span className="text-lg font-black text-blue-900">{entrega.quadra}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center justify-center bg-blue-100 p-1 px-2 rounded-md border border-blue-300 shadow-sm min-w-[3.5rem]">
                                                        <span className="text-[0.6rem] font-bold text-gray-700 uppercase tracking-widest">Lote</span>
                                                        <span className="text-lg font-black text-blue-900">{entrega.lote}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-600 hover:bg-green-700">
                                                    {entrega.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {format(new Date(entrega.criado_em), "dd/MM/yyyy HH:mm")}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setEntregaToDelete(entrega.id)}
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

            <AlertDialog open={!!entregaToDelete} onOpenChange={() => setEntregaToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Entrega?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir este registro de entrega? Esta ação não pode ser desfeita.
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
