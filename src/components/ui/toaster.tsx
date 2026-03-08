import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isDestructive = variant === "destructive";
        const isSuccess = title?.toString().toLowerCase().includes("berhasil") || 
                          title?.toString().toLowerCase().includes("sukses") ||
                          title?.toString().toLowerCase().includes("success");
        const isWarning = title?.toString().toLowerCase().includes("peringatan") ||
                          title?.toString().toLowerCase().includes("warning");

        const Icon = isDestructive ? XCircle : isSuccess ? CheckCircle : isWarning ? AlertTriangle : Info;
        const iconColor = isDestructive 
          ? "text-red-400" 
          : isSuccess 
            ? "text-emerald-400" 
            : isWarning 
              ? "text-amber-400" 
              : "text-sky-400";
        const borderAccent = isDestructive
          ? "border-l-red-500"
          : isSuccess
            ? "border-l-emerald-500"
            : isWarning
              ? "border-l-amber-500"
              : "border-l-sky-500";

        return (
          <Toast key={id} variant={variant} {...props} className={`border-l-4 ${borderAccent}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="grid gap-0.5">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
