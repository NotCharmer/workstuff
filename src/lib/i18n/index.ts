export { he, type HeMessages } from "./he";
import { he } from "./he";

export function uploadStatusHe(status: string): string {
  return he.uploadStatus[status] ?? status;
}

export function gradeSourceHe(source: string): string {
  return he.gradeSource[source] ?? source;
}

export { he as dateLocaleHe } from "date-fns/locale";
