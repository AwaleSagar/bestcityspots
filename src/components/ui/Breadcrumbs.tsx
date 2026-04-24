import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--color-muted)]">
        <li>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[color:var(--color-foreground)]"
            aria-label="Home"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <ChevronRight
              className="h-3.5 w-3.5 text-[color:var(--color-muted-soft)]"
              aria-hidden="true"
            />
            {item.href && index < items.length - 1 ? (
              <Link
                href={item.href}
                className="transition-colors hover:text-[color:var(--color-foreground)]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="font-medium text-[color:var(--color-foreground)]"
                aria-current="page"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
