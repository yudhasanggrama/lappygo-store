type MidtransSnapResponse = {
  token: string;
  redirect_url: string;
};

export async function createMidtransSnap(params: {
  providerOrderId: string; // yang dikirim ke midtrans (unik)
  grossAmount: number;
  customer: { first_name?: string; email?: string; phone?: string };
  items: Array<{ id: string; price: number; quantity: number; name: string }>;
}) {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const baseUrl = isProd
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  const auth = Buffer.from(`${serverKey}:`).toString("base64");

  const body = {
    transaction_details: {
      order_id: params.providerOrderId,
      gross_amount: params.grossAmount,
    },
    customer_details: {
      first_name: params.customer.first_name ?? "",
      email: params.customer.email ?? "",
      phone: params.customer.phone ?? "",
    },
    item_details: params.items.map((it) => ({
      id: it.id,
      price: it.price,
      quantity: it.quantity,
      name: it.name.slice(0, 50),
    })),
  };

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Midtrans Snap error: ${res.status} ${text}`);
  }

  return (await res.json()) as MidtransSnapResponse;
}

/**
 * Midtrans signature_key = sha512(order_id + status_code + gross_amount + server_key)
 */
export async function verifyMidtransSignature(payload: any) {
  const crypto = await import("crypto");

  const orderId = payload.order_id;
  const statusCode = payload.status_code;
  const grossAmount = payload.gross_amount;
  const signature = payload.signature_key;

  if (!orderId || !statusCode || !grossAmount || !signature) return false;

  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  const raw = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");

  return expected === signature;
}

export function mapMidtransToOrder(payload: any): {
  status: "pending" | "paid" | "shipped" | "completed" | "cancelled" | "expired";
  payment_status: "unpaid" | "paid" | "failed" | "expired" | "refunded";
  paid_at: string | null;
} {
  const ts = payload.transaction_status as string | undefined;
  const fs = payload.fraud_status as string | undefined;

  let status: any = "pending";
  let payment_status: any = "unpaid";
  let paid_at: string | null = null;

  if (ts === "pending") {
    status = "pending";
    payment_status = "unpaid";
  } else if (ts === "settlement") {
    status = "paid";
    payment_status = "paid";
    paid_at = new Date().toISOString();
  } else if (ts === "capture") {
    if (!fs || fs === "accept") {
      status = "paid";
      payment_status = "paid";
      paid_at = new Date().toISOString();
    } else {
      status = "pending";
      payment_status = "unpaid";
    }
  } else if (ts === "expire") {
    status = "expired";
    payment_status = "expired";
  } else if (ts === "deny" || ts === "cancel") {
    status = "cancelled";
    payment_status = "failed";
  } else if (ts === "refund" || ts === "partial_refund") {
    status = "cancelled";
    payment_status = "refunded";
  }

  return { status, payment_status, paid_at };
}