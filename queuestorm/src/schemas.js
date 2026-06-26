import { z } from "zod";

export const TransactionSchema = z.object({
    transaction_id: z.string(),
    timestamp: z.string(),
    type: z.enum(["transfer", "payment", "cash_in", "cash_out", "settlement", "refund"]),
    amount: z.number(),
    counterparty: z.string().nullable().optional().default(null),
    status: z.enum(["completed", "failed", "pending", "reversed"])
});

export const TicketRequestSchema = z.object({
    ticket_id: z.string(),
    complaint: z.string(),
    language: z.enum(["en", "bn", "mixed"]).optional(),
    channel: z.enum(["in_app_chat", "call_center", "email", "merchant_portal", "field_agent"]).optional(),
    user_type: z.enum(["customer", "merchant", "agent", "unknown"]).optional(),
    campaign_context: z.string().optional(),
    transaction_history: z.array(TransactionSchema).optional().default([]),
    metadata: z.record(z.any()).optional()
});