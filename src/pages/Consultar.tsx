import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Search, X, Filter, User, MapPin, Calendar, FileText, Trash2, Download } from "lucide-react";
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
  observacoes?: string;
}

export default function Consultar() {
  const navigate = useNavigate();
  const [liberacoes, setLiberacoes] = useState<Liberacao[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [liberacaoToDelete, setLiberacaoToDelete] = useState<string | null>(null);

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
      handleSearch(); // Refresh list
    }
    setLiberacaoToDelete(null);
  };

  // Filters
  const [nome, setNome] = useState("");
  const [quadra, setQuadra] = useState("");
  const [lote, setLote] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [dataFiltro, setDataFiltro] = useState("");

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      await supabase.rpc("update_expired_liberacoes");
    } catch (err) {
      console.error("Erro ao atualizar status expirados:", err);
    }

    let query = supabase
      .from("liberacoes")
      .select("*")
      .order("criado_em", { ascending: false });

    if (nome.trim()) {
      query = query.ilike("nome_pessoa", `%${nome.trim().toUpperCase()}%`);
    }
    if (quadra.trim()) {
      query = query.ilike("quadra", `%${quadra.trim().toUpperCase()}%`);
    }
    if (lote.trim()) {
      query = query.ilike("lote", `%${lote.trim().toUpperCase()}%`);
    }
    if (dataFiltro) {
      // Filter where the selected date is within the range [data_inicio, data_fim]
      query = query.lte("data_inicio", dataFiltro).gte("data_fim", dataFiltro);
    }
    if (status !== "all") {
      query = query.eq("status", status as "ativo" | "expirado");
    }

    const { data, error } = await query.limit(100);

    setIsLoading(false);

    if (error) {
      console.error("Error fetching liberacoes:", error);
      return;
    }

    setLiberacoes(data || []);
  };

  const clearFilters = () => {
    setNome("");
    setQuadra("");
    setLote("");
    setStatus("all");
    setDataFiltro("");
    setLiberacoes([]);
    setHasSearched(false);
  };

  const downloadCSV = () => {
    if (liberacoes.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    // CSV Header
    const headers = [
      "Nome",
      "CPF",
      "Quadra",
      "Lote",
      "Tipo de Acesso",
      "Data Início",
      "Data Fim",
      "Status",
      "Observações",
      "Data de Registro"
    ];

    // CSV Rows
    const rows = liberacoes.map(lib => [
      `"${lib.nome_pessoa}"`,
      `"${lib.cpf || ""}"`,
      `"${lib.quadra}"`,
      `"${lib.lote}"`,
      `"${lib.tipo_acesso}"`,
      `"${format(new Date(lib.data_inicio + "T00:00:00"), "dd/MM/yyyy")}"`,
      `"${format(new Date(lib.data_fim + "T00:00:00"), "dd/MM/yyyy")}"`,
      `"${lib.status}"`,
      `"${lib.observacoes || ""}"`,
      `"${format(new Date(lib.criado_em), "dd/MM/yyyy HH:mm")}"`
    ]);

    // Combine header and rows
    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.join(";"))
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `liberacoes_export_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Consultar Liberações</h1>
          <p className="text-muted-foreground">
            Busque por nome, CPF, quadra, lote, data ou status.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="bg-muted/50 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtros
          </CardTitle>
          <CardDescription>
            Refine sua busca utilizando os campos abaixo
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nome" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <User className="h-3 w-3" />
                Nome
              </Label>
              <Input
                id="nome"
                placeholder="EX: JOÃO DA SILVA"
                value={nome}
                onChange={(e) => setNome(e.target.value.toUpperCase())}
                className="uppercase font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Data
              </Label>
              <Input
                id="data"
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quadra" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Quadra
              </Label>
              <Input
                id="quadra"
                placeholder="EX: A"
                value={quadra}
                onChange={(e) => setQuadra(e.target.value.toUpperCase())}
                className="uppercase font-bold text-center"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lote" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Lote
              </Label>
              <Input
                id="lote"
                placeholder="EX: 15"
                value={lote}
                onChange={(e) => setLote(e.target.value.toUpperCase())}
                className="uppercase font-bold text-center"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="expirado">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
            <Button variant="outline" onClick={clearFilters} className="gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50">
              <X className="h-4 w-4" />
              Limpar
            </Button>
            <Button onClick={handleSearch} className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
              <Search className="h-4 w-4" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">
            Resultados
            {hasSearched && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({liberacoes.length} encontrados)
              </span>
            )}
          </CardTitle>
          {hasSearched && liberacoes.length > 0 && (
            <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !hasSearched ? (
            <div className="text-center py-8 text-muted-foreground">
              Use os filtros acima para buscar liberações
            </div>
          ) : liberacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma liberação encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quadra/Lote</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Obs</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Remover Liberação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liberacoes.map((lib) => (
                    <TableRow
                      key={lib.id}
                      className={
                        lib.tipo_acesso === "visitante"
                          ? "bg-sky-50/50 hover:bg-sky-100/50 data-[state=selected]:bg-sky-100"
                          : "bg-yellow-50/50 hover:bg-yellow-100/50 data-[state=selected]:bg-yellow-100"
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-center justify-center bg-blue-100 p-1 px-2 rounded-md border border-blue-300 shadow-sm min-w-[3.5rem]">
                            <span className="text-[0.6rem] font-bold text-black uppercase tracking-widest">Quadra</span>
                            <span className="text-lg font-black text-blue-900">{lib.quadra.toUpperCase()}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center bg-blue-100 p-1 px-2 rounded-md border border-blue-300 shadow-sm min-w-[3.5rem]">
                            <span className="text-[0.6rem] font-bold text-gray-700 uppercase tracking-widest">Lote</span>
                            <span className="text-lg font-black text-blue-900">{lib.lote.toUpperCase()}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold uppercase">{lib.nome_pessoa.toUpperCase()}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" title={lib.observacoes}>{lib.observacoes || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            lib.tipo_acesso === "visitante"
                              ? "bg-sky-200 text-sky-900 hover:bg-sky-300 border-sky-300"
                              : "bg-yellow-200 text-yellow-900 hover:bg-yellow-300 border-yellow-300"
                          }
                        >
                          {lib.tipo_acesso === "visitante" ? "Visitante" : "Prestador"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(lib.data_inicio + "T00:00:00"), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(lib.data_fim + "T00:00:00"), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={lib.status === "ativo" && new Date(lib.data_fim + "T00:00:00") >= new Date(new Date().setHours(0, 0, 0, 0)) ? "default" : "secondary"}
                          className={lib.status === "ativo" && new Date(lib.data_fim + "T00:00:00") >= new Date(new Date().setHours(0, 0, 0, 0)) ? "bg-success" : ""}
                        >
                          {lib.status === "ativo" && new Date(lib.data_fim + "T00:00:00") >= new Date(new Date().setHours(0, 0, 0, 0)) ? "Ativo" : "Expirado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(lib.criado_em), "HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLiberacaoToDelete(lib.id)}
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
    </div>
  );
}
