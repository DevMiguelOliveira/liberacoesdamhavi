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
        <CardContent className="pt-8 px-6 pb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Nome */}
            <div className={cn(
              "p-4 rounded-xl border transition-all space-y-2",
              tipoAcesso === "visitante" ? "bg-accent/5 border-accent/20" :
                tipoAcesso === "prestador" ? "bg-warning/5 border-warning/20" :
                  "bg-secondary/20 border-secondary"
            )}>
              <Label htmlFor="nome_pessoa" className={cn(
                "flex items-center gap-2 uppercase text-xs font-bold tracking-wider transition-colors",
                tipoAcesso === "visitante" ? "text-accent" :
                  tipoAcesso === "prestador" ? "text-warning" :
                    "text-primary"
              )}>
                <User className="h-4 w-4" />
                Nome Completo *
              </Label>
              <Input
                id="nome_pessoa"
                placeholder="EX: JOÃO DA SILVA"
                {...register("nome_pessoa")}
                className="bg-background uppercase font-bold text-lg h-12 border-2 focus-visible:ring-offset-2"
                autoFocus
              />
              {errors.nome_pessoa && (
                <p className="text-sm text-destructive">{errors.nome_pessoa.message}</p>
              )}
            </div>

            {/* Tipo de Acesso */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-primary uppercase text-xs font-bold tracking-wider">
                <User className="h-3.5 w-3.5" />
                Tipo de Acesso *
              </Label>
              <Controller
                name="tipo_acesso"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => field.onChange("visitante")}
                      className={cn(
                        "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all gap-3 group relative overflow-hidden",
                        field.value === "visitante"
                          ? "border-accent bg-accent text-accent-foreground shadow-lg scale-105"
                          : "border-muted bg-background hover:border-accent/50 text-muted-foreground"
                      )}
                    >
                      <User className={cn("h-8 w-8 transition-transform group-hover:scale-110", field.value === "visitante" ? "animate-bounce" : "")} />
                      <span className="font-bold uppercase text-sm tracking-tighter">Visitante</span>
                      {field.value === "visitante" && (
                        <div className="absolute top-1 right-1">
                          <div className="bg-white/20 p-1 rounded-full"><Save className="h-3 w-3" /></div>
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("prestador")}
                      className={cn(
                        "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all gap-3 group relative overflow-hidden",
                        field.value === "prestador"
                          ? "border-warning bg-warning text-warning-foreground shadow-lg scale-105"
                          : "border-muted bg-background hover:border-warning/50 text-muted-foreground"
                      )}
                    >
                      <Clock className={cn("h-8 w-8 transition-transform group-hover:scale-110", field.value === "prestador" ? "animate-pulse" : "")} />
                      <span className="font-bold uppercase text-sm tracking-tighter">Prestador</span>
                      {field.value === "prestador" && (
                        <div className="absolute top-1 right-1">
                          <div className="bg-black/10 p-1 rounded-full"><Save className="h-3 w-3" /></div>
                        </div>
                      )}
                    </button>
                  </div>
                )}
              />
              {errors.tipo_acesso && (
                <p className="text-sm text-destructive">{errors.tipo_acesso.message}</p>
              )}
            </div>

            {/* Quadra e Lote */}
            <div className={cn(
              "p-4 rounded-xl border transition-all duration-500",
              tipoAcesso === "visitante" ? "bg-accent/5 border-accent/20" :
                tipoAcesso === "prestador" ? "bg-warning/5 border-warning/20" :
                  "bg-secondary/30 border-secondary"
            )}>
              <div className={cn(
                "mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest",
                tipoAcesso === "visitante" ? "text-accent" :
                  tipoAcesso === "prestador" ? "text-warning" :
                    "text-primary"
              )}>
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
                    placeholder="EX: A"
                    {...register("quadra")}
                    className="bg-background font-black text-xl uppercase text-center"
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
                    placeholder="EX: 15"
                    {...register("lote")}
                    className="bg-background font-black text-xl uppercase text-center"
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

              <div className="space-y-3">
                <Label htmlFor="dias_liberados" className="flex items-center gap-2 text-primary uppercase text-xs font-bold tracking-wider">
                  <Clock className="h-3.5 w-3.5" />
                  Dias Liberados *
                </Label>
                <Input
                  id="dias_liberados"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  {...register("dias_liberados", { valueAsNumber: true })}
                  className="bg-background font-bold text-lg"
                />
                <div className="flex flex-wrap gap-2">
                  {[1, 3, 7, 15, 30].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setValue("dias_liberados", d)}
                      className={cn(
                        "h-8 px-3 text-xs font-bold transition-all border-2",
                        diasLiberados === d
                          ? (tipoAcesso === "visitante" ? "bg-accent border-accent text-accent-foreground scale-110 shadow-md" :
                            tipoAcesso === "prestador" ? "bg-warning border-warning text-warning-foreground scale-110 shadow-md" :
                              "bg-primary border-primary text-primary-foreground scale-110")
                          : "hover:bg-muted"
                      )}
                    >
                      {d === 1 ? "HOJE" : `${d} DIAS`}
                    </Button>
                  ))}
                </div>
                {errors.dias_liberados && (
                  <p className="text-sm text-destructive">{errors.dias_liberados.message}</p>
                )}
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes" className="flex items-center gap-2 text-primary uppercase text-xs font-bold tracking-wider">
                <FileText className="h-3.5 w-3.5" />
                Observações
              </Label>
              <Textarea
                id="observacoes"
                placeholder="EX: DEIXAR A ENTREGA NA GARAGEM, ETC..."
                className="bg-background min-h-[100px] uppercase text-xs"
                {...register("observacoes")}
              />
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
