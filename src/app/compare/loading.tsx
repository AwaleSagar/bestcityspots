import { Container } from "@/components/ui/Container";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main id="main-content">
      <Container>
        <LoadingRegion label="Loading comparison" className="py-12">
          <Skeleton className="h-12 w-72 max-w-full" />
          <Skeleton className="mt-6 h-14 w-full max-w-2xl" />
          <div className="mt-12 space-y-3">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-14 w-full" />
            ))}
          </div>
        </LoadingRegion>
      </Container>
    </main>
  );
}
