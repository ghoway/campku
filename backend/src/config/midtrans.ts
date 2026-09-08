import Snap from "midtrans-client";
import crypto from "crypto";
import { env } from "./env";

let snap: any;

export function getSnap() {
  if (!snap) {
    snap = new Snap.Snap({
      isProduction: env.MIDTRANS_IS_PRODUCTION === "true",
      serverKey: env.MIDTRANS_SERVER_KEY ?? "",
      clientKey: env.MIDTRANS_CLIENT_KEY ?? "",
    });
  }
  return snap;
}

export function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
  serverKey: string = env.MIDTRANS_SERVER_KEY || ""
): boolean {
  const raw = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return expected === signatureKey;
}
