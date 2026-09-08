import { Resend } from "resend";
import { env } from "./env";

let resend: Resend | null = null;

export function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}
