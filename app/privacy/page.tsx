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
          information, view live account statistics, and display recent public content from
          connected platforms.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Information We Collect</h2>
          <p className="text-slate-300">
            When you connect Instagram, Facebook, LinkedIn, or TikTok, we request only the
            permissions shown during authorization. Depending on the platform, this may include
            basic profile information, account identifiers, display name, username, avatar or profile
            picture, follower counts, following counts, media counts, page names, and public content
            metadata that you explicitly authorize.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">How We Use Information</h2>
          <p className="text-slate-300">
            We use connected account data to show social profile information, live account
            statistics, and authorized public content metadata inside the dashboard. We do not sell
            connected account data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Tokens And Access</h2>
          <p className="text-slate-300">
            Access tokens and refresh tokens are used only to communicate with the platform APIs you
            authorize. Tokens are handled server-side and should be revoked by disconnecting access in
            the connected platform&apos;s account settings or by contacting the app operator.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Data Deletion</h2>
          <p className="text-slate-300">
            You can request deletion of connected account data by following the instructions at
            https://socialmedia-dashboard-phi.vercel.app/data-deletion.
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
