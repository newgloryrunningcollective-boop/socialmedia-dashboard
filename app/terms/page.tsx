import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Social Media Dashboard",
  description: "Terms of Service for Social Media Dashboard.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <article className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm text-slate-400">Last updated: May 6, 2026</p>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        </header>

        <p className="text-slate-300">
          Social Media Dashboard is a web application for connecting social media accounts, viewing
          authorized profile information, and planning content.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Use Of The Service</h2>
          <p className="text-slate-300">
            You may use the service only with accounts you own or are authorized to manage. You are
            responsible for complying with each connected platform&apos;s terms and policies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Connected Platforms</h2>
          <p className="text-slate-300">
            When you connect a platform such as TikTok, you grant the service permission to request
            the scopes shown during authorization. You may revoke access through the connected
            platform&apos;s account settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Availability</h2>
          <p className="text-slate-300">
            The service is provided as-is. Social platform APIs may change, become unavailable, or
            require additional review and approval.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Contact</h2>
          <p className="text-slate-300">
            For questions about these terms, contact newglory.runningcollective@gmail.com.
          </p>
        </section>
      </article>
    </main>
  );
}
