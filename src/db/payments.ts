import "server-only";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "./index";
import { paymentMethods, auditLog, platformSettings } from "./schema";
import { paymentProvider } from "./payment-provider";

export class PaymentError extends Error {}

const VALID = "verified";

/** Luhn check + basic length validation (sandbox still validates format). */
function luhnValid(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export async function addCard(
  userId: number,
  input: { cardNumber: string; expMonth: number; expYear: number },
) {
  if (!luhnValid(input.cardNumber)) {
    throw new PaymentError("מספר כרטיס לא תקין.");
  }
  const now = new Date();
  if (
    !Number.isInteger(input.expMonth) ||
    input.expMonth < 1 ||
    input.expMonth > 12 ||
    !Number.isInteger(input.expYear) ||
    input.expYear < now.getFullYear() ||
    input.expYear > now.getFullYear() + 20
  ) {
    throw new PaymentError("תוקף הכרטיס לא תקין.");
  }

  // tokenize (PAN is discarded by the provider; we store only token+last4+brand)
  const { token, last4, brand } = await paymentProvider.tokenizeCard(input);

  const [row] = await db
    .insert(paymentMethods)
    .values({ userId, gatewayToken: token, last4, brand, verificationStatus: "pending" })
    .returning();
  return row;
}

/** Run the ₪1 authenticity hold and mark the card verified. */
export async function verifyCard(paymentMethodId: number, userId: number) {
  return db.transaction(async (tx) => {
    const [pm] = await tx
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, paymentMethodId), eq(paymentMethods.userId, userId)));
    if (!pm) throw new PaymentError("אמצעי תשלום לא נמצא.");
    if (pm.verificationStatus === VALID) return pm;

    const [settings] = await tx.select().from(platformSettings).where(eq(platformSettings.id, 1));
    const holdAgorot = settings?.verificationHoldAgorot ?? 100; // ₪1

    const { holdId } = await paymentProvider.microChargeVerify(pm.gatewayToken, holdAgorot);

    const [updated] = await tx
      .update(paymentMethods)
      .set({ verificationStatus: VALID, verificationHoldId: holdId })
      .where(eq(paymentMethods.id, paymentMethodId))
      .returning();

    await tx.insert(auditLog).values({
      actorId: userId,
      action: "card_verify",
      entity: "payment_method",
      entityId: String(paymentMethodId),
      payload: { holdId, holdAgorot },
    });
    return updated;
  });
}

export function listCards(userId: number) {
  return db
    .select({
      id: paymentMethods.id,
      last4: paymentMethods.last4,
      brand: paymentMethods.brand,
      verificationStatus: paymentMethods.verificationStatus,
      createdAt: paymentMethods.createdAt,
    })
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .orderBy(desc(paymentMethods.createdAt));
}

export async function deleteCard(id: number, userId: number) {
  await db
    .delete(paymentMethods)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)));
}

/** True if the user has at least one verified card. */
export async function hasVerifiedCard(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(paymentMethods)
    .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.verificationStatus, VALID)));
  return Number(row?.n ?? 0) > 0;
}
