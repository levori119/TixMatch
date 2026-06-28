import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Payment provider abstraction.
 *
 * ⚠️ The implementation below is a DEV SANDBOX ONLY. It does NOT move real money
 * and is NOT a real payment integration. Before production, replace it with a
 * real PCI-DSS compliant gateway / Israeli card clearer using tokenized cards
 * (and evaluate Bit/PayBox availability — see CLAUDE.md §8). Keep this same
 * interface so the escrow logic doesn't change.
 */
export interface PaymentProvider {
  /** Place an authorization hold for `amountAgorot`; returns a hold reference. */
  authorizeHold(amountAgorot: number, ref: string): Promise<{ holdId: string }>;
  /** Capture a previously authorized hold (funds actually taken). */
  capture(holdId: string): Promise<void>;
  /** Release/refund a hold back to the payer. */
  refund(holdId: string): Promise<void>;
  /**
   * Tokenize a card. In a real integration this happens in the gateway's
   * iframe/SDK on the client so the PAN NEVER reaches our server — we only ever
   * receive a token + last4 + brand. Here (sandbox) we derive them and discard
   * the number immediately; we never persist the PAN.
   */
  tokenizeCard(input: {
    cardNumber: string;
    expMonth: number;
    expYear: number;
  }): Promise<{ token: string; last4: string; brand: string }>;
  /** Small verification charge/hold (the ₪1 authenticity check); returns a hold ref. */
  microChargeVerify(token: string, amountAgorot: number): Promise<{ holdId: string }>;
}

function brandFromNumber(num: string): string {
  if (/^4/.test(num)) return "Visa";
  if (/^5[1-5]/.test(num)) return "Mastercard";
  if (/^3[47]/.test(num)) return "Amex";
  if (/^3(0|6|8)/.test(num)) return "Diners";
  return "Card";
}

class SandboxPaymentProvider implements PaymentProvider {
  async authorizeHold(_amountAgorot: number, _ref: string) {
    return { holdId: `sbx_${randomBytes(8).toString("hex")}` };
  }
  async capture(_holdId: string) {
    /* no-op in sandbox */
  }
  async refund(_holdId: string) {
    /* no-op in sandbox */
  }
  async tokenizeCard(input: { cardNumber: string; expMonth: number; expYear: number }) {
    const digits = input.cardNumber.replace(/\D/g, "");
    // NOTE: the PAN is used only to derive last4/brand here and is then discarded.
    return {
      token: `sbx_tok_${randomBytes(8).toString("hex")}`,
      last4: digits.slice(-4),
      brand: brandFromNumber(digits),
    };
  }
  async microChargeVerify(_token: string, _amountAgorot: number) {
    return { holdId: `sbx_vrf_${randomBytes(8).toString("hex")}` };
  }
}

export const paymentProvider: PaymentProvider = new SandboxPaymentProvider();
