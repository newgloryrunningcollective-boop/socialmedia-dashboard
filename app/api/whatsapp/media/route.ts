import { NextRequest, NextResponse } from "next/server";

const GRAPH_ORIGIN = "https://graph.facebook.com/v20.0";

export async function POST(req: NextRequest) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return NextResponse.json(
      {
        ok: false,
        message: "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID.",
      },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "A file is required." }, { status: 400 });
  }

  const upload = new FormData();
  upload.set("messaging_product", "whatsapp");
  upload.set("file", file, file.name);

  const res = await fetch(`${GRAPH_ORIGIN}/${phoneNumberId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: upload,
    cache: "no-store",
  });
  const result = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };

  return NextResponse.json(
    {
      ok: res.ok,
      result,
      mediaId: result.id ?? null,
      message: res.ok ? null : result.error?.message ?? "WhatsApp media upload failed.",
    },
    { status: res.ok ? 200 : res.status || 400 }
  );
}
