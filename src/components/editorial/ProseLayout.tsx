import type { ReactNode } from "react";
import type { BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";

interface ProseLayoutProps {
  title: ReactNode;
  lede: ReactNode;
  eyebrow?: ReactNode;
  breadcrumbs: BreadcrumbItem[];
  /** In-page table of contents (desktop aside). */
  toc?: ReadonlyArray<{ id: string; label: string }>;
  children: ReactNode;
}

/** Long-form page shell for About, Methodology, Press and Accessibility. */
export function ProseLayout({
  title,
  lede,
  eyebrow,
  breadcrumbs,
  toc,
  children,
}: ProseLayoutProps) {
  return (
    <main id="main-content">
      <Container>
        <PageHeader breadcrumbs={breadcrumbs} eyebrow={eyebrow} title={title} lede={lede} />
        <div className="grid gap-12 py-12 pb-24 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-20">
          <div className="prose-almanac min-w-0">{children}</div>
          {toc && toc.length > 0 ? (
            <nav aria-label="On this page" className="hidden lg:block">
              <div className="sticky top-24">
                <p className="text-sm font-semibold">On this page</p>
                <ul className="border-rule mt-3 space-y-2 border-l pl-4 text-sm">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="text-ink-muted hover:text-ink">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
