import { format } from "date-fns";
import { id } from "date-fns/locale";

export function formatDateIndonesian(dateString: string | Date, fmt: string = "dd MMMM yyyy HH:mm") {
  if (!dateString) return "-";
  return format(new Date(dateString), fmt, { locale: id });
}

export function formatTime(dateString: string | Date) {
  if (!dateString) return "-";
  return format(new Date(dateString), "HH:mm", { locale: id });
}
