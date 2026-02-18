// lib/email/templates.ts

/** ===== Helpers ===== */
function esc(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function idr(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);
}

function pill(text: string, bg: string, fg: string) {
  return `
    <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${bg};color:${fg};
      font-size:12px;font-weight:700;letter-spacing:.02em;">
      ${esc(text)}
    </span>`;
}

function kvRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 0;color:#6b7280;font-size:13px;">${esc(label)}</td>
      <td style="padding:10px 0;color:#111827;font-size:13px;font-weight:700;text-align:right;">${esc(value)}</td>
    </tr>`;
}

function button(url: string, label: string) {
  return `
  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:44px;v-text-anchor:middle;width:260px;" arcsize="18%" strokecolor="#111827" fillcolor="#111827">
    <w:anchorlock/>
    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:14px;font-weight:bold;">
      ${esc(label)}
    </center>
  </v:roundrect>
  <![endif]-->
  <!--[if !mso]><!-- -->
  <a href="${url}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;
    padding:12px 18px;border-radius:10px;font-weight:800;font-size:14px;">
    ${esc(label)}
  </a>
  <!--<![endif]-->`;
}

function emailShell(opts: {
  preheader: string;
  title: string;
  brand: string;
  badgeHtml?: string;
  bodyHtml: string;
  cta?: { url: string; label: string };
  footerNote?: string;
}) {
  const year = new Date().getFullYear();
  const preheader = esc(opts.preheader);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(opts.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${preheader}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0"
            style="width:100%;max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

            <tr>
              <td style="padding:18px 20px;background:#0b1220;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#ffffff;font-family:Arial, sans-serif;">
                      <div style="font-weight:900;font-size:16px;letter-spacing:.06em;text-transform:uppercase;">
                        ${esc(opts.brand)}
                      </div>
                      <div style="margin-top:6px;font-weight:800;font-size:22px;line-height:1.25;">
                        ${esc(opts.title)}
                      </div>
                    </td>
                    <td align="right" style="vertical-align:top;">
                      ${opts.badgeHtml ?? ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 20px;font-family:Arial, sans-serif;color:#111827;">
                ${opts.bodyHtml}

                ${
                  opts.cta
                    ? `<div style="margin-top:18px;">${button(opts.cta.url, opts.cta.label)}</div>`
                    : ""
                }

                ${
                  opts.cta
                    ? `<div style="margin-top:14px;font-size:12px;color:#6b7280;line-height:1.6;">
                        Kalau tombol tidak bisa diklik, copy link ini:<br/>
                        <span style="word-break:break-all;">${opts.cta.url}</span>
                      </div>`
                    : ""
                }

                <div style="margin-top:18px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:12px;color:#6b7280;line-height:1.6;">
                  ${
                    opts.footerNote
                      ? `<div>${esc(opts.footerNote)}</div>`
                      : `<div>Butuh bantuan? Balas email ini untuk support.</div>`
                  }
                  <div style="margin-top:6px;">© ${year} ${esc(opts.brand)}.</div>
                </div>
              </td>
            </tr>
          </table>

          <div style="max-width:640px;margin-top:10px;font-family:Arial, sans-serif;font-size:11px;color:#9ca3af;line-height:1.6;text-align:center;">
            Email ini dikirim otomatis untuk update status pesanan.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** ===== Templates (existing) ===== */

export function paidEmailTemplate(args: { orderId: string; total: number; appUrl: string }) {
  const url = `${args.appUrl}/orders/${args.orderId}/confirmation`;

  const bodyHtml = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">
      Pembayaran kamu sudah <b>terverifikasi</b>. Pesanan akan segera diproses.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;padding:14px 16px;">
      ${kvRow("Order ID", args.orderId)}
      ${kvRow("Total", idr(args.total))}
      ${kvRow("Status", "Paid")}
    </table>

    <div style="margin-top:12px;font-size:12px;color:#6b7280;line-height:1.6;">
      Simpan email ini sebagai bukti pembayaran. Jika tidak menemukan email di inbox, cek folder Spam/Promotions.
    </div>
  `;

  return emailShell({
    brand: "LappyGo",
    title: "Payment Success",
    preheader: `Pembayaran untuk order ${args.orderId} sudah terverifikasi.`,
    badgeHtml: pill("PAID", "#DCFCE7", "#166534"),
    bodyHtml,
    cta: { url, label: "Lihat status order" },
  });
}

export function failedEmailTemplate(args: { orderId: string; reason: string; appUrl: string }) {
  const url = `${args.appUrl}/orders/${args.orderId}/confirmation`;

  const bodyHtml = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">
      Pembayaran untuk pesanan ini <b>gagal</b> atau <b>expired</b>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;padding:14px 16px;">
      ${kvRow("Order ID", args.orderId)}
      ${kvRow("Status", "Failed / Expired")}
      ${kvRow("Reason", args.reason)}
    </table>

    <div style="margin-top:12px;font-size:12px;color:#6b7280;line-height:1.6;">
      Kamu bisa coba checkout ulang atau gunakan metode pembayaran lain.
    </div>
  `;

  return emailShell({
    brand: "LappyGo",
    title: "Pembayaran gagal / expired",
    preheader: `Pembayaran order ${args.orderId} gagal atau expired.`,
    badgeHtml: pill("FAILED", "#FEE2E2", "#991B1B"),
    bodyHtml,
    cta: { url, label: "Buka order" },
  });
}

export function shippedEmailTemplate(args: { orderId: string; appUrl: string }) {
  const url = `${args.appUrl}/orders/${args.orderId}/confirmation`;

  const bodyHtml = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">
      Pesanan kamu sudah kami serahkan ke kurir
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;padding:14px 16px;">
      ${kvRow("Order ID", args.orderId)}
      ${kvRow("Status", "Shipped")}
    </table>

    <div style="margin-top:12px;font-size:12px;color:#6b7280;line-height:1.6;">
      Cek detail & update status pengiriman lewat halaman order.
    </div>
  `;

  return emailShell({
    brand: "LappyGo",
    title: "Order dikirim",
    preheader: `Pesanan ${args.orderId} sudah dikirim.`,
    badgeHtml: pill("SHIPPED", "#DBEAFE", "#1D4ED8"),
    bodyHtml,
    cta: { url, label: "Lihat status" },
  });
}

/** ===== Templates (new) ===== */

export function cancelRequestEmailTemplate(args: {
  orderId: string;
  appUrl: string;
  reason?: string | null;
}) {
  const url = `${args.appUrl}/orders/${args.orderId}/confirmation`;

  const bodyHtml = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">
      Kami sudah menerima <b>permintaan pembatalan</b> untuk pesanan ini.
      Tim kami akan meninjau permintaan kamu secepatnya.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;padding:14px 16px;">
      ${kvRow("Order ID", args.orderId)}
      ${kvRow("Status", "Cancellation Requested")}
      ${args.reason ? kvRow("Reason", String(args.reason)) : ""}
    </table>

    <div style="margin-top:12px;font-size:12px;color:#6b7280;line-height:1.6;">
      Kamu akan mendapatkan email lagi ketika permintaan disetujui / ditolak.
    </div>
  `;

  return emailShell({
    brand: "LappyGo",
    title: "Permintaan pembatalan diterima",
    preheader: `Permintaan pembatalan untuk order ${args.orderId} sudah kami terima.`,
    badgeHtml: pill("REQUESTED", "#FEF3C7", "#92400E"),
    bodyHtml,
    cta: { url, label: "Lihat status order" },
  });
}

export function cancelledEmailTemplate(args: {
  orderId: string;
  appUrl: string;
  note?: string | null;
}) {
  const url = `${args.appUrl}/orders/${args.orderId}/confirmation`;

  const bodyHtml = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">
      Pesanan kamu telah <b>dibatalkan</b>.
      Jika pembayaran sudah dilakukan, proses refund (jika ada) akan mengikuti kebijakan yang berlaku.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;padding:14px 16px;">
      ${kvRow("Order ID", args.orderId)}
      ${kvRow("Status", "Cancelled")}
      ${args.note ? kvRow("Note", String(args.note)) : ""}
    </table>

    <div style="margin-top:12px;font-size:12px;color:#6b7280;line-height:1.6;">
      Kalau kamu masih butuh barangnya, kamu bisa checkout ulang kapan saja.
    </div>
  `;

  return emailShell({
    brand: "LappyGo",
    title: "Order dibatalkan",
    preheader: `Order ${args.orderId} telah dibatalkan.`,
    badgeHtml: pill("CANCELLED", "#FEE2E2", "#991B1B"),
    bodyHtml,
    cta: { url, label: "Buka order" },
  });
}

export function cancelRejectedEmailTemplate(args: {
  orderId: string;
  appUrl: string;
  reason?: string | null;
}) {
  const url = `${args.appUrl}/orders/${args.orderId}/confirmation`;

  const bodyHtml = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">
      Maaf, <b>permintaan pembatalan</b> untuk pesanan ini <b>tidak disetujui</b>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;padding:14px 16px;">
      ${kvRow("Order ID", args.orderId)}
      ${kvRow("Status", "Cancellation Rejected")}
      ${args.reason ? kvRow("Reason", String(args.reason)) : ""}
    </table>

    <div style="margin-top:12px;font-size:12px;color:#6b7280;line-height:1.6;">
      Kamu tetap bisa melanjutkan proses order lewat halaman order.
    </div>
  `;

  return emailShell({
    brand: "LappyGo",
    title: "Permintaan pembatalan ditolak",
    preheader: `Permintaan pembatalan untuk order ${args.orderId} tidak disetujui.`,
    badgeHtml: pill("REJECTED", "#E0E7FF", "#3730A3"),
    bodyHtml,
    cta: { url, label: "Buka order" },
  });
}