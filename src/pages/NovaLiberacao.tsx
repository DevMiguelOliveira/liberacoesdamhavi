import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { liberacaoSchema, LiberacaoFormData, formatCPF } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, Loader2, Save, X, User, FileText, MapPin, Clock, Calendar as CalendarIconLucide } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NovaLiberacao() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<LiberacaoFormData>({
    resolver: zodResolver(liberacaoSchema),
    defaultValues: {
      data_inicio: new Date(),
      dias_liberados: 1,
    },
  });

  const dataInicio = watch("data_inicio");
  const diasLiberados = watch("dias_liberados");

  const dataFim = dataInicio && diasLiberados
    ? addDays(dataInicio, diasLiberados - 1)
    : null;

  const onSubmit = async (data: LiberacaoFormData) => {
    if (!admin) {
      toast.error("Erro de autenticação");
      return;
    }

    setIsLoading(true);

    const dataFimCalculada = addDays(data.data_inicio, data.dias_liberados - 1);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const status = dataFimCalculada >= hoje ? "ativo" : "expirado";

    const { error } = await supabase.from("liberacoes").insert({
      nome_pessoa: data.nome_pessoa.trim(),
      cpf: data.cpf.replace(/\D/g, ""),
      tipo_acesso: data.tipo_acesso,
      quadra: data.quadra.trim().toUpperCase(),
      lote: data.lote.trim().toUpperCase(),
      data_inicio: format(data.data_inicio, "yyyy-MM-dd"),
      data_fim: format(dataFimCalculada, "yyyy-MM-dd"),
      status,
      admin_id: admin.id,
    });

    setIsLoading(false);

    if (error) {
      console.error("Error creating liberacao:", error);
      toast.error("Erro ao salvar liberação", {
        description: "Tente novamente.",
      });
      return;
    }

    toast.success("Liberação registrada com sucesso!", {
      description: `${data.nome_pessoa} - Válida até ${format(dataFimCalculada, "dd/MM/yyyy")}`,
    });
    navigate("/");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Liberação</h1>
          <p className="text-muted-foreground">
            Registrar entrada de Visitante ou Prestador
          </p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto shadow-lg border-primary/20">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Dados da Liberação
          </CardTitle>
          <CardDescription>
            Preencha os dados do Visitante ou Prestador e o período de acesso:
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Nome e CPF */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome_pessoa" className="flex items-center gap-2 text-primary uppercase text-xs font-bold tracking-wider">
                  <User className="h-3.5 w-3.5" />
                  Nome Completo *
                </Label>
                <Input
                  id="nome_pessoa"
                  placeholder="João da Silva"
                  {...register("nome_pessoa")}
                  className="bg-background"
                />
                {errors.nome_pessoa && (
                  <p className="text-sm text-destructive">{errors.nome_pessoa.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf" className="flex items-center gap-2 text-primary uppercase text-xs font-bold tracking-wider">
                  <FileText className="h-3.5 w-3.5" />
                  CPF (opcional)
                </Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  {...register("cpf", {
                    onChange: (e) => {
                      const formatted = formatCPF(e.target.value);
                      e.target.value = formatted;
                    },
                  })}
                  className="bg-background"
                />
                {errors.cpf && (
                  <p className="text-sm text-destructive">{errors.cpf.message}</p>
                )}
              </div>
            </div>

            {/* Tipo de Acesso */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-primary uppercase text-xs font-bold tracking-wider">
                <User className="h-3.5 w-3.5" />
                Tipo de Acesso *
              </Label>
              <Controller
                name="tipo_acesso"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visitante">Visitante</SelectItem>
                      <SelectItem value="prestador">Prestador de Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tipo_acesso && (
                <p className="text-sm text-destructive">{errors.tipo_acesso.message}</p>
              )}
            </div>

            {/* Quadra e Lote */}
            <div className="bg-secondary/30 p-4 rounded-lg border border-secondary">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                <MapPin className="h-4 w-4" />
                Destino do Acesso
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quadra" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Quadra *
                  </Label>
                  <Input
                    id="quadra"
                    placeholder="Ex: A"
                    {...register("quadra")}
                    className="bg-background font-medium text-lg"
                  />
                  {errors.quadra && (
                    <p className="text-sm text-destructive">{errors.quadra.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lote" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Lote *
                  </Label>
                  <Input
                    id="lote"
                    placeholder="Ex: 15"
                    {...register("lote")}
                    className="bg-background font-medium text-lg"
                  />
                  {errors.lote && (
                    <p className="text-sm text-destructive">{errors.lote.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Data e Dias */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary uppercase text-xs font-bold tracking-wider">
                  <CalendarIconLucide className="h-3.5 w-3.5" />
                  Data Inicial *
                </Label>
                <Controller
                  name="data_inicio"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-background",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            "Selecione a data"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.data_inicio && (
                  <p className="text-sm text-destructive">{errors.data_inicio.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dias_liberados" className="flex items-center gap-2 text-primary uppercase text-xs font-bold tracking-wider">
                  <Clock className="h-3.5 w-3.5" />
                  Dias Liberados *
                </Label>
                <Input
                  id="dias_liberados"
                  type="number"
                  min={1}
                  max={365}
                  {...register("dias_liberados", { valueAsNumber: true })}
                  className="bg-background"
                />
                {errors.dias_liberados && (
                  <p className="text-sm text-destructive">{errors.dias_liberados.message}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="gap-2 w-1/3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-2 flex-1 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Liberação
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
