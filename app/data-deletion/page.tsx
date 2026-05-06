import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion Instructions | Social Media Dashboard",
  description: "Data deletion instructions for Social Media Dashboard.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <article className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm text-slate-400">Last updated: May 6, 2026</p>
          <h1 className="text-3xl font-semibold tracking-tight">Data Deletion Instructions</h1>
        </header>

        <p className="text-slate-300">
          Social Media Dashboard lets authorized users connect social media accounts to view profile
          information and account statistics. You can request removal of connected account data at
          any time.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">How To Request Deletion</h2>
          <p className="text-slate-300">
            Email newglory.runningcollective@gmail.com with the subject Data deletion request and
            include the connected account username or profile name you want removed. We will remove
            any stored connection data associated with that account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Revoke Platform Access</h2>
          <p className="text-slate-300">
            You can also revoke the app&apos;s access directly in the connected platform&apos;s account or
            business settings. Revoking access prevents the dashboard from making future API
            requests for that account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-medium">Temporary Browser Storage</h2>
          <p className="text-slate-300">
            During early testing, some connection data may be stored temporarily in secure browser
            cookies. Clearing browser cookies for this site also removes those local connection
            tokens from your browser.
          </p>
        </section>
      </article>
    </main>
  );
}
