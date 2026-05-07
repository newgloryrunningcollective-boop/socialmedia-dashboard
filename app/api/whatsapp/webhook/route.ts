import { NextRequest, NextResponse } from "next/server";
import { addWhatsAppMessage } from "../_store";

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string; caption?: string };
          video?: { id?: string; caption?: string };
          document?: { id?: string; caption?: string; filename?: string };
        }>;
        statuses?: Array<{
          id?: string;
          recipient_id?: string;
          status?: string;
          timestamp?: string;
        }>;
        metadata?: {
          phone_number_id?: string;
        };
      };
    }>;
  }>;
};

function toIsoTimestamp(timestamp: string | undefined) {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString();
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token && expectedToken && token === expectedToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: false, message: "Webhook verification failed." }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => ({}))) as WhatsAppWebhookPayload;

  payload.entry?.forEach((entry) => {
    entry.changes?.forEach((change) => {
      const phoneNumberId = change.value?.metadata?.phone_number_id ?? null;

      change.value?.messages?.forEach((message) => {
        const media =
          message.image ??
          message.video ??
          message.document ??
          null;

        addWhatsAppMessage({
          id: message.id ?? crypto.randomUUID(),
          direction: "inbound",
          from: message.from ?? null,
          to: phoneNumberId,
          text: message.text?.body ?? media?.caption ?? null,
          mediaType: message.type ?? null,
          mediaId: media?.id ?? null,
          timestamp: toIsoTimestamp(message.timestamp),
        });
      });

      change.value?.statuses?.forEach((status) => {
        addWhatsAppMessage({
          id: status.id ?? crypto.randomUUID(),
          direction: "status",
          from: phoneNumberId,
          to: status.recipient_id ?? null,
          text: null,
          timestamp: toIsoTimestamp(status.timestamp),
          status: status.status ?? null,
        });
      });
    });
  });

  return NextResponse.json({ ok: true, message: "EVENT_RECEIVED" });
}
