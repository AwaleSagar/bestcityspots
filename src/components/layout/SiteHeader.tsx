import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { HeaderNav } from "./HeaderNav";
import { Wordmark } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { SavedLink } from "./SavedLink";
import { ThemeToggle } from "./ThemeControls";

export function SiteHeader() {
  return (
    <header data-print-hide className="border-rule bg-paper sticky top-0 z-40 border-b">
      <Container className="flex h-16 items-center gap-2 lg:gap-6">
        <Link href="/" aria-label="Best City Spots — home" className="-ml-1 rounded-md p-1">
          <Wordmark />
        </Link>
        <HeaderNav />
        <div className="ml-auto flex items-center gap-1">
          <SearchTrigger />
          <SavedLink className="hidden sm:inline-flex" />
          <ThemeToggle className="hidden lg:inline-flex" />
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
