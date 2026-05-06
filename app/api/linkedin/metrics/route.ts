import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type LinkedInIdentity = {
  personalProfile: {
    sub: string | null;
    name: string | null;
    email: string | null;
  };
  organizations: Array<{ id: string; name: string }>;
};

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("linkedin_identity")?.value;

  if (!raw) {
    return NextResponse.json(
      { ok: false, message: "No connected LinkedIn account found. Connect first." },
      { status: 400 }
    );
  }

  try {
    const identity: LinkedInIdentity = JSON.parse(raw);
    return NextResponse.json({ ok: true, identity });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid LinkedIn identity cookie." },
      { status: 400 }
    );
  }
}
