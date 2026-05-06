import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Social Media Dashboard",
  description: "Privacy Policy for Social Media Dashboard.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <article className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm text-slate-400">Last updated: May 6, 2026</p>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        </header>

        <p className="text-slate-300">
          Social Media Dashboard helps authorized users connect social media accounts, view profile
          information, and display recent public content from connected platforms.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Information We Collect</h2>
          <p className="text-slate-300">
            When you connect TikTok, we request access to basic profile information such as open ID,
            avatar, and display name. If you grant video access, we may also retrieve public video
            metadata such as video ID, title, description, cover image URL, share URL, embed link,
            duration, cursor, and pagination status.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">How We Use Information</h2>
          <p className="text-slate-300">
            We use connected account data to show social profile information and recent public video
            metadata inside the dashboard. We do not sell connected account data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Tokens And Access</h2>
          <p className="text-slate-300">
            Access tokens and refresh tokens are used only to communicate with the platform APIs you
            authorize. Tokens are handled server-side and should be revoked by disconnecting access in
            your TikTok account settings or by contacting the app operator.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Contact</h2>
          <p className="text-slate-300">
            For privacy questions or access removal requests, contact
            newglory.runningcollective@gmail.com.
          </p>
        </section>
      </article>
    </main>
  );
}
