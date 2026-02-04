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
import { Textarea } from "@/components/ui/textarea";
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
    setValue,
    formState: { errors },
  } = useForm<LiberacaoFormData>({
    resolver: zodResolver(liberacaoSchema),
    defaultValues: {
      data_inicio: new Date(),
      dias_liberados: 1,
    },
  });

  const tipoAcesso = watch("tipo_acesso");
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
      nome_pessoa: data.nome_pessoa.trim().toUpperCase(),
      tipo_acesso: data.tipo_acesso,
      quadra: data.quadra.trim().toUpperCase(),
      lote: data.lote.trim().toUpperCase(),
      data_inicio: format(data.data_inicio, "yyyy-MM-dd"),
      data_fim: format(dataFimCalculada, "yyyy-MM-dd"),
      status,
      admin_id: admin.id,
      observacoes: data.observacoes?.trim() || null,
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

      <Card className={cn(
        "max-w-xl mx-auto shadow-xl border-t-8 transition-all duration-500",
        tipoAcesso === "visitante" ? "border-t-accent shadow-accent/10" :
          tipoAcesso === "prestador" ? "border-t-warning shadow-warning/10" :
            "border-t-primary shadow-primary/10"
      )}>
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className={cn(
              "h-5 w-5 transition-colors",
              tipoAcesso === "visitante" ? "text-accent" :
                tipoAcesso === "prestador" ? "text-warning" :
                  "text-primary"
            )} />
            Dados da Liberação
          </CardTitle>
          <CardDescription>
            {tipoAcesso === "visitante" ? "Preencha os dados do visitante para acesso social." :
              tipoAcesso === "prestador" ? "Preencha os dados do prestador para acesso de serviço." :
                "Preencha os dados para registrar a nova liberação:"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 px-4 pb-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* SEÇÃO 1: Tipo de Acesso - Em destaque */}
            <Controller
              name="tipo_acesso"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => field.onChange("visitante")}
                    className={cn(
                      "flex flex-col items-center justify-center py-3 px-4 rounded-xl border-2 transition-all gap-1 group relative",
                      field.value === "visitante"
                        ? "border-accent bg-gradient-to-br from-accent to-accent/80 text-accent-foreground shadow-lg scale-[1.02]"
                        : "border-muted bg-background hover:border-accent/50 text-muted-foreground hover:bg-accent/5"
                    )}
                  >
                    <User className={cn("h-6 w-6", field.value === "visitante" ? "animate-bounce" : "")} />
                    <span className="font-black uppercase text-sm tracking-tight">Visitante</span>
                    <span className="text-[10px] opacity-70">Acesso Social</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange("prestador")}
                    className={cn(
                      "flex flex-col items-center justify-center py-3 px-4 rounded-xl border-2 transition-all gap-1 group relative",
                      field.value === "prestador"
                        ? "border-warning bg-gradient-to-br from-warning to-warning/80 text-warning-foreground shadow-lg scale-[1.02]"
                        : "border-muted bg-background hover:border-warning/50 text-muted-foreground hover:bg-warning/5"
                    )}
                  >
                    <Clock className={cn("h-6 w-6", field.value === "prestador" ? "animate-pulse" : "")} />
                    <span className="font-black uppercase text-sm tracking-tight">Prestador</span>
                    <span className="text-[10px] opacity-70">Acesso Serviço</span>
                  </button>
                </div>
              )}
            />
            {errors.tipo_acesso && (
              <p className="text-xs text-destructive text-center">{errors.tipo_acesso.message}</p>
            )}

            {/* SEÇÃO 2: Nome e Destino lado a lado */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Nome */}
              <div className={cn(
                "p-3 rounded-xl border-2 transition-all space-y-2",
                tipoAcesso === "visitante" ? "bg-accent/5 border-accent/30" :
                  tipoAcesso === "prestador" ? "bg-warning/5 border-warning/30" :
                    "bg-secondary/20 border-secondary"
              )}>
                <Label htmlFor="nome_pessoa" className={cn(
                  "flex items-center gap-2 uppercase text-xs font-black tracking-wider transition-colors",
                  tipoAcesso === "visitante" ? "text-accent" :
                    tipoAcesso === "prestador" ? "text-warning" :
                      "text-primary"
                )}>
                  <User className="h-4 w-4" />
                  Nome Completo
                </Label>
                <Input
                  id="nome_pessoa"
                  placeholder="EX: JOÃO DA SILVA"
                  {...register("nome_pessoa")}
                  className="bg-background uppercase font-bold text-base h-10 border-2 focus-visible:ring-offset-1"
                  autoFocus
                />
                {errors.nome_pessoa && (
                  <p className="text-xs text-destructive">{errors.nome_pessoa.message}</p>
                )}
              </div>

              {/* Destino (Quadra/Lote) */}
              <div className={cn(
                "p-3 rounded-xl border-2 transition-all space-y-2",
                tipoAcesso === "visitante" ? "bg-accent/5 border-accent/30" :
                  tipoAcesso === "prestador" ? "bg-warning/5 border-warning/30" :
                    "bg-secondary/20 border-secondary"
              )}>
                <Label className={cn(
                  "flex items-center gap-2 uppercase text-xs font-black tracking-wider transition-colors",
                  tipoAcesso === "visitante" ? "text-accent" :
                    tipoAcesso === "prestador" ? "text-warning" :
                      "text-primary"
                )}>
                  <MapPin className="h-4 w-4" />
                  Destino (Quadra/Lote)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="quadra"
                    placeholder="QUADRA"
                    {...register("quadra")}
                    className="bg-background font-black text-xl uppercase text-center h-10 border-2"
                  />
                  <Input
                    id="lote"
                    placeholder="LOTE"
                    {...register("lote")}
                    className="bg-background font-black text-xl uppercase text-center h-10 border-2"
                  />
                </div>
                {(errors.quadra || errors.lote) && (
                  <p className="text-xs text-destructive">{errors.quadra?.message || errors.lote?.message}</p>
                )}
              </div>
            </div>

            {/* SEÇÃO 3: Período e Observações */}
            <div className={cn(
              "p-3 rounded-xl border-2 transition-all",
              tipoAcesso === "visitante" ? "bg-accent/5 border-accent/30" :
                tipoAcesso === "prestador" ? "bg-warning/5 border-warning/30" :
                  "bg-secondary/20 border-secondary"
            )}>
              <Label className={cn(
                "flex items-center gap-2 uppercase text-xs font-black tracking-wider mb-3 transition-colors",
                tipoAcesso === "visitante" ? "text-accent" :
                  tipoAcesso === "prestador" ? "text-warning" :
                    "text-primary"
              )}>
                <CalendarIconLucide className="h-4 w-4" />
                Período de Acesso
              </Label>

              <div className="grid gap-3 sm:grid-cols-3">
                {/* Data Inicial */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Data Início</span>
                  <Controller
                    name="data_inicio"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-semibold bg-background h-10 text-sm border-2",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
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
                </div>

                {/* Dias */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Duração</span>
                  <div className="flex gap-1 flex-wrap">
                    {[1, 3, 7, 15, 30].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValue("dias_liberados", d)}
                        className={cn(
                          "h-10 flex-1 min-w-[40px] text-xs font-black transition-all border-2",
                          diasLiberados === d
                            ? (tipoAcesso === "visitante" ? "bg-accent border-accent text-accent-foreground shadow-md" :
                              tipoAcesso === "prestador" ? "bg-warning border-warning text-warning-foreground shadow-md" :
                                "bg-primary border-primary text-primary-foreground shadow-md")
                            : "hover:bg-muted"
                        )}
                      >
                        {d === 1 ? "HOJE" : `${d}D`}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Observações</span>
                  <Input
                    id="observacoes"
                    placeholder="Ex: portão lateral..."
                    className="bg-background h-10 text-sm border-2"
                    {...register("observacoes")}
                  />
                </div>
              </div>

              {(errors.data_inicio || errors.dias_liberados) && (
                <p className="text-xs text-destructive mt-2">{errors.data_inicio?.message || errors.dias_liberados?.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-3 border-t mt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="gap-2 w-1/3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "gap-2 flex-1 shadow-md hover:shadow-lg transition-all h-12 text-base font-bold uppercase tracking-wider",
                  tipoAcesso === "visitante" ? "bg-accent hover:bg-accent/90" :
                    tipoAcesso === "prestador" ? "bg-warning hover:bg-warning/90 text-warning-foreground" :
                      "bg-primary hover:bg-primary/90"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
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
