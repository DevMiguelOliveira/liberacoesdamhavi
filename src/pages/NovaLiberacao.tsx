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
      cadastrado_por: data.cadastrado_por.trim().toUpperCase(),
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
        "max-w-2xl mx-auto shadow-xl border-t-8 transition-all duration-500",
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
        <CardContent className="p-3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            {/* SEÇÃO 1: Tipo de Acesso - Compacto */}
            <Controller
              name="tipo_acesso"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => field.onChange("visitante")}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 px-2 rounded-xl border-2 transition-all gap-0.5 group relative",
                      field.value === "visitante"
                        ? "border-accent bg-gradient-to-br from-accent to-accent/80 text-black shadow-sm scale-[1.01]"
                        : "border-muted bg-background hover:border-accent/50 text-muted-foreground hover:bg-accent/5"
                    )}
                  >
                    <User className={cn("h-5 w-5", field.value === "visitante" ? "animate-bounce" : "")} />
                    <span className="font-black uppercase text-xs tracking-tight">Visitante</span>
                    <span className="text-[9px] opacity-70">Acesso Social</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange("prestador")}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 px-2 rounded-xl border-2 transition-all gap-0.5 group relative",
                      field.value === "prestador"
                        ? "border-warning bg-gradient-to-br from-warning to-warning/80 text-black shadow-sm scale-[1.01]"
                        : "border-muted bg-background hover:border-warning/50 text-muted-foreground hover:bg-warning/5"
                    )}
                  >
                    <Clock className={cn("h-5 w-5", field.value === "prestador" ? "animate-pulse" : "")} />
                    <span className="font-black uppercase text-xs tracking-tight">Prestador</span>
                    <span className="text-[9px] opacity-70">Acesso Serviço</span>
                  </button>
                </div>
              )}
            />
            {errors.tipo_acesso && (
              <p className="text-xs text-destructive text-center">{errors.tipo_acesso.message}</p>
            )}

            {/* SEÇÃO 2: Destino e Nome Invertidos e Compactos */}
            <div className="grid gap-2 sm:grid-cols-2">
              {/* Destino (Quadra/Lote) - Agora Primeiro */}
              <div className={cn(
                "p-2 rounded-xl border-2 transition-all space-y-1",
                tipoAcesso === "visitante" ? "bg-accent/5 border-accent/30" :
                  tipoAcesso === "prestador" ? "bg-warning/5 border-warning/30" :
                    "bg-secondary/20 border-secondary"
              )}>
                <Label className={cn(
                  "flex items-center gap-2 uppercase text-[10px] font-black tracking-wider transition-colors",
                  tipoAcesso === "visitante" ? "text-accent" :
                    tipoAcesso === "prestador" ? "text-warning" :
                      "text-primary"
                )}>
                  <MapPin className="h-3 w-3" />
                  Destino
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="quadra"
                    placeholder="QUADRA"
                    {...register("quadra")}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase();
                      e.target.value = val;
                      setValue("quadra", val, { shouldValidate: true });
                    }}
                    className="bg-background font-black text-lg uppercase text-center h-8 border-2"
                    autoFocus
                  />
                  <Input
                    id="lote"
                    placeholder="LOTE"
                    {...register("lote")}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      e.target.value = val;
                      setValue("lote", val, { shouldValidate: true });
                    }}
                    onBlur={(e) => {
                      let val = e.target.value;
                      if (val.length > 0 && parseInt(val) < 10) {
                        val = val.padStart(2, "0");
                        e.target.value = val;
                        setValue("lote", val, { shouldValidate: true });
                      }
                    }}
                    className="bg-background font-black text-lg uppercase text-center h-8 border-2"
                  />
                </div>
                {(errors.quadra || errors.lote) && (
                  <p className="text-[10px] text-destructive leading-tight">{errors.quadra?.message || errors.lote?.message}</p>
                )}
              </div>

              {/* Nome - Agora Segundo */}
              <div className={cn(
                "p-2 rounded-xl border-2 transition-all space-y-1",
                tipoAcesso === "visitante" ? "bg-accent/5 border-accent/30" :
                  tipoAcesso === "prestador" ? "bg-warning/5 border-warning/30" :
                    "bg-secondary/20 border-secondary"
              )}>
                <Label htmlFor="nome_pessoa" className={cn(
                  "flex items-center gap-2 uppercase text-[10px] font-black tracking-wider transition-colors",
                  tipoAcesso === "visitante" ? "text-accent" :
                    tipoAcesso === "prestador" ? "text-warning" :
                      "text-primary"
                )}>
                  <User className="h-3 w-3" />
                  Nome Completo
                </Label>
                <Input
                  id="nome_pessoa"
                  placeholder="EX: JOÃO DA SILVA"
                  {...register("nome_pessoa")}
                  className="bg-background uppercase font-bold text-sm h-8 border-2 focus-visible:ring-offset-1"

                />
                {errors.nome_pessoa && (
                  <p className="text-[10px] text-destructive leading-tight">{errors.nome_pessoa.message}</p>
                )}
              </div>
            </div>

            {/* SEÇÃO 3: Período de Acesso - Compacto */}
            <div className={cn(
              "p-2 rounded-xl border-2 transition-all",
              tipoAcesso === "visitante" ? "bg-accent/5 border-accent/30" :
                tipoAcesso === "prestador" ? "bg-warning/5 border-warning/30" :
                  "bg-secondary/20 border-secondary"
            )}>
              <div className="flex items-center justify-between mb-2">
                <Label className={cn(
                  "flex items-center gap-2 uppercase text-[10px] font-black tracking-wider transition-colors",
                  tipoAcesso === "visitante" ? "text-accent" :
                    tipoAcesso === "prestador" ? "text-warning" :
                      "text-primary"
                )}>
                  <CalendarIconLucide className="h-3 w-3" />
                  Período
                </Label>
                {diasLiberados > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    tipoAcesso === "visitante" ? "bg-accent/20 text-accent" :
                      tipoAcesso === "prestador" ? "bg-warning/20 text-warning" :
                        "bg-primary/20 text-primary"
                  )}>
                    {diasLiberados} {diasLiberados === 1 ? "dia" : "dias"}
                  </span>
                )}
              </div>

              {/* Calendário elegante com seleção de range - Compacto */}
              <div className="bg-slate-900 rounded-lg p-3 shadow-lg w-fit mx-auto origin-top">
                <Calendar
                  mode="range"
                  selected={{
                    from: dataInicio || undefined,
                    to: dataFim || undefined
                  }}
                  onSelect={(range) => {
                    if (range?.from) {
                      setValue("data_inicio", range.from);
                      if (range.to) {
                        const diffTime = range.to.getTime() - range.from.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        setValue("dias_liberados", diffDays);
                      } else {
                        setValue("dias_liberados", 1);
                      }
                    } else {
                      setValue("dias_liberados", 1);
                    }
                  }}
                  numberOfMonths={1}
                  locale={ptBR}
                  className="!bg-transparent"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-2 sm:space-x-2 sm:space-y-0",
                    month: "space-y-2",
                    caption: "flex justify-center pt-1 relative items-center text-slate-100",
                    caption_label: "text-sm font-bold text-slate-100",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse",
                    head_row: "flex justify-between",
                    head_cell: "text-slate-500 rounded-md w-9 font-medium text-[11px] uppercase",
                    row: "flex w-full mt-1 justify-between",
                    cell: "h-9 w-9 text-center text-sm p-0 relative rounded-full",
                    day: "h-9 w-9 p-0 font-medium text-slate-300 hover:bg-slate-700 hover:text-white rounded-full transition-all aria-selected:opacity-100",
                    day_range_start: "day-range-start !bg-primary !text-white rounded-full",
                    day_range_end: "day-range-end !bg-primary !text-white rounded-full",
                    day_selected: "!bg-primary !text-white hover:!bg-primary hover:!text-white focus:!bg-primary focus:!text-white font-bold",
                    day_today: "bg-slate-700 text-white font-bold",
                    day_outside: "text-slate-600 opacity-50",
                    day_disabled: "text-slate-700 opacity-30",
                    day_range_middle: "!bg-primary/30 !text-white rounded-none",
                    day_hidden: "invisible",
                  }}
                />
              </div>

              {/* Atalhos rápidos - Compacto */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const hoje = new Date();
                    setValue("data_inicio", hoje);
                    setValue("dias_liberados", 1);
                  }}
                  className={cn(
                    "h-8 px-4 text-xs font-bold transition-all border-2 rounded-full",
                    diasLiberados === 1 && dataInicio?.toDateString() === new Date().toDateString()
                      ? (tipoAcesso === "visitante" ? "bg-accent border-accent text-black shadow-sm" :
                        tipoAcesso === "prestador" ? "bg-warning border-warning text-black shadow-sm" :
                          "bg-primary border-primary text-white shadow-sm")
                      : "hover:bg-muted border-slate-300"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3 w-3" />
                  Só Hoje
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValue("data_inicio", new Date());
                    setValue("dias_liberados", 8);
                  }}
                  className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  1 Semana
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValue("data_inicio", new Date());
                    setValue("dias_liberados", 31);
                  }}
                  className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  1 Mês
                </Button>
              </div>

              {/* Resumo visual elegante - Compacto */}
              {dataInicio && dataFim && (
                <div className={cn(
                  "mt-2 p-1 rounded-lg text-center border",
                  tipoAcesso === "visitante" ? "bg-accent/10 border-accent/30" :
                    tipoAcesso === "prestador" ? "bg-warning/10 border-warning/30" :
                      "bg-primary/5 border-primary/20"
                )}>
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-center">
                      <span className="text-[9px] uppercase text-muted-foreground block">Início</span>
                      <span className="font-black text-xs">{format(dataInicio, "dd/MM", { locale: ptBR })}</span>
                    </div>
                    <div className="text-muted-foreground text-[10px]">→</div>
                    <div className="text-center">
                      <span className="text-[9px] uppercase text-muted-foreground block">Fim</span>
                      <span className="font-black text-xs">{format(dataFim, "dd/MM", { locale: ptBR })}</span>
                    </div>
                    <div className={cn(
                      "ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                      tipoAcesso === "visitante" ? "bg-accent text-black" :
                        tipoAcesso === "prestador" ? "bg-warning text-black" :
                          "bg-primary text-white"
                    )}>
                      {diasLiberados}d
                    </div>
                  </div>
                </div>
              )}

              {(errors.data_inicio || errors.dias_liberados) && (
                <p className="text-[10px] text-destructive mt-1">{errors.data_inicio?.message || errors.dias_liberados?.message}</p>
              )}
            </div>

            {/* SEÇÃO 4: Observações - Compacto */}
            <div className={cn(
              "p-2 rounded-xl border-2 transition-all",
              tipoAcesso === "visitante" ? "bg-accent/5 border-accent/30" :
                tipoAcesso === "prestador" ? "bg-warning/5 border-warning/30" :
                  "bg-secondary/20 border-secondary"
            )}>
              <Label className={cn(
                "flex items-center gap-2 uppercase text-[10px] font-black tracking-wider mb-1 transition-colors",
                tipoAcesso === "visitante" ? "text-accent" :
                  tipoAcesso === "prestador" ? "text-warning" :
                    "text-primary"
              )}>
                Observações (opcional)
              </Label>
              <Input
                id="observacoes"
                placeholder="Ex: Deixar na garagem, etc..."
                className="bg-background h-8 text-xs border-2"
                {...register("observacoes")}
              />
            </div>

            {/* SEÇÃO 5: Quem fez a liberação - Obrigatório */}
            <div className="p-2 rounded-xl border-2 transition-all bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/10 dark:border-amber-900/40">
              <Label htmlFor="cadastrado_por" className="flex items-center gap-2 uppercase text-[10px] font-black tracking-wider mb-1 text-amber-600 dark:text-amber-500">
                Quem fez a liberação (Obrigatório)
              </Label>
              <Input
                id="cadastrado_por"
                placeholder="NOME DO PORTEIRO/ADMIN"
                className="bg-background h-8 text-xs border-2 uppercase font-bold text-sm focus:border-amber-500 dark:focus:border-amber-500 focus-visible:ring-amber-500/30"
                {...register("cadastrado_por")}
              />
              {errors.cadastrado_por && (
                <p className="text-[10px] text-destructive leading-tight mt-1">{errors.cadastrado_por.message}</p>
              )}
            </div>

            {/* Actions - Compacto */}
            <div className="flex gap-2 pt-2 border-t mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="gap-2 w-1/3 h-10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                size="sm"
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                size="sm"
                className={cn(
                  "gap-2 flex-1 shadow-md hover:shadow-lg transition-all h-10 text-sm font-bold uppercase tracking-wider",
                  tipoAcesso === "visitante" ? "bg-accent hover:bg-accent/90" :
                    tipoAcesso === "prestador" ? "bg-warning hover:bg-warning/90 text-warning-foreground" :
                      "bg-primary hover:bg-primary/90"
                )}
              >
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
