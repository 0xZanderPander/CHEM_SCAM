import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export type DocSection = { id: string; title: string };

export function DocPage({
  eyebrow,
  title,
  summary,
  updated,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  updated: string;
  sections: DocSection[];
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <SiteHeader compact />

      <div className="page-shell py-10">
        <div className="doc-panel">
          <p className="eyebrow text-[#6b6558]">{eyebrow}</p>
          <h1 className="font-display mt-3 text-4xl font-black leading-none text-[#171412]">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#45403b]">{summary}</p>
          <p className="font-data mt-5 text-[11px] uppercase tracking-[0.08em] text-[#6b6558]">
            Last updated {updated}
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <nav aria-label="On this page" className="doc-toc lg:sticky lg:top-8">
            <p className="eyebrow mb-3 text-[#6b6558]">On this page</p>
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </nav>

          <article className="doc-panel doc-prose">{children}</article>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
