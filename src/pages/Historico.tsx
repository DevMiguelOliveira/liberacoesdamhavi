import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

interface Liberacao {
  id: string;
  nome_pessoa: string;
  cpf: string;
  tipo_acesso: "visitante" | "prestador";
  quadra: string;
  lote: string;
  data_inicio: string;
  data_fim: string;
  status: "ativo" | "expirado";
  criado_em: string;
}

export default function Historico() {
  const navigate = useNavigate();
  const [liberacoes, setLiberacoes] = useState<Liberacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiberacoes = async () => {
    setIsLoading(true);

    // First, update expired status
    await supabase.rpc("update_expired_liberacoes");

    const { data, error } = await supabase
      .from("liberacoes")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(200);

    setIsLoading(false);

    if (error) {
      console.error("Error fetching liberacoes:", error);
      return;
    }

    setLiberacoes(data || []);
  };

  useEffect(() => {
    fetchLiberacoes();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Histórico de Liberações</h1>
            <p className="text-muted-foreground">
              Todas as liberações registradas no sistema
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchLiberacoes} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Table */}
      <Card className="shadow-lg border-primary/10">
        <CardHeader className="bg-muted/50 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            Liberações
            <Badge variant="secondary" className="ml-2 font-normal">
              {liberacoes.length} registros
            </Badge>
          </CardTitle>
          <CardDescription>
            Histórico completo ordenado por data de registro
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : liberacoes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
              <div className="p-4 rounded-full bg-muted">
                <RefreshCw className="h-8 w-8 opacity-50" />
              </div>
              <p>Nenhuma liberação registrada no sistema.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-background">
                  <TableRow>
                    <TableHead className="pl-6">Registro</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Quadra/Lote</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liberacoes.map((lib) => (
                    <TableRow key={lib.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(lib.criado_em), "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">{lib.nome_pessoa}</TableCell>
                      <TableCell>{formatCPF(lib.cpf)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {lib.tipo_acesso === "visitante" ? "Visitante" : "Prestador"}
                        </Badge>
                      </TableCell>
                      <TableCell>{lib.quadra}/{lib.lote}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(lib.data_inicio + "T00:00:00"), "dd/MM")}
                          {" - "}
                          {format(new Date(lib.data_fim + "T00:00:00"), "dd/MM/yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={lib.status === "ativo" ? "default" : "secondary"}
                          className={lib.status === "ativo" ? "bg-success" : ""}
                        >
                          {lib.status === "ativo" ? "Ativo" : "Expirado"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
