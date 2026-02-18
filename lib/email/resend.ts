// lib/email/resend.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendOrderEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const from = process.env.EMAIL_FROM!;
  return resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}