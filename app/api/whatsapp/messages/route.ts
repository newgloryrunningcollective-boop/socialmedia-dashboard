import { NextRequest, NextResponse } from "next/server";
import { addWhatsAppMessage, readWhatsAppMessages } from "../_store";

const GRAPH_ORIGIN = "https://graph.facebook.com/v20.0";

type WhatsAppSendBody = {
  to?: string;
  text?: string;
  mediaId?: string | null;
  mediaType?: string | null;
  filename?: string | null;
};

function getConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? null,
  };
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildMessagePayload(body: WhatsAppSendBody) {
  const to = getString(body.to);
  const text = getString(body.text);
  const mediaId = getString(body.mediaId);
  const mediaType = (getString(body.mediaType) ?? "text").toLowerCase();

  if (!to) return { error: "Recipient phone number is required." };

  if (mediaId && ["image", "video", "document"].includes(mediaType)) {
    const mediaPayload: Record<string, string> = { id: mediaId };
    if (text) mediaPayload.caption = text;
    if (mediaType === "document" && getString(body.filename)) {
      mediaPayload.filename = getString(body.filename) as string;
    }

    return {
      payload: {
        messaging_product: "whatsapp",
        to,
        type: mediaType,
        [mediaType]: mediaPayload,
      },
      to,
      text,
      mediaId,
      mediaType,
    };
  }

  if (!text) return { error: "Message text or uploaded media is required." };

  return {
    payload: {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: true, body: text },
    },
    to,
    text,
    mediaId: null,
    mediaType: "text",
  };
}

export async function GET() {
  const config = getConfig();

  return NextResponse.json({
    ok: true,
    configured: Boolean(config.accessToken && config.phoneNumberId),
    phoneNumberId: config.phoneNumberId ?? null,
    businessAccountId: config.businessAccountId,
    webhookPath: "/api/whatsapp/webhook",
    messages: readWhatsAppMessages(),
    message:
      config.accessToken && config.phoneNumberId
        ? null
        : "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to send and receive WhatsApp messages.",
  });
}

export async function POST(req: NextRequest) {
  const config = getConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    return NextResponse.json(
      {
        ok: false,
        message: "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID.",
      },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as WhatsAppSendBody;
  const built = buildMessagePayload(body);
  if ("error" in built) {
    return NextResponse.json({ ok: false, message: built.error }, { status: 400 });
  }

  const res = await fetch(`${GRAPH_ORIGIN}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(built.payload),
    cache: "no-store",
  });
  const result = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (res.ok) {
    addWhatsAppMessage({
      id: result.messages?.[0]?.id ?? crypto.randomUUID(),
      direction: "outbound",
      from: config.phoneNumberId,
      to: built.to,
      text: built.text ?? null,
      mediaType: built.mediaType,
      mediaId: built.mediaId,
      timestamp: new Date().toISOString(),
      status: "sent",
    });
  }

  return NextResponse.json(
    {
      ok: res.ok,
      result,
      message: res.ok ? null : result.error?.message ?? "WhatsApp message send failed.",
    },
    { status: res.ok ? 200 : res.status || 400 }
  );
}
