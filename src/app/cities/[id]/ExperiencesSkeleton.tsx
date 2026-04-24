import { Skeleton, Stack, Grid, Caption } from "@/components/atlas";
import { Compass } from "lucide-react";

export default function ExperiencesSkeleton() {
  return (
    <section aria-label="Experiences loading">
      <Stack gap={4}>
        <Caption>
          <Compass className="h-3.5 w-3.5 text-[color:var(--color-accent)]" aria-hidden />
          Curated experiences · loading…
        </Caption>
        <Skeleton className="h-7 w-56 max-w-full" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-11 w-28" rounded="md" />
          <Skeleton className="h-11 w-24" rounded="md" />
          <Skeleton className="h-11 w-24" rounded="md" />
        </div>
        <Grid cols={{ base: 1, md: 2 }} gap={4}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]"
            >
              <Skeleton className="h-40 w-full" rounded="sm" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </Grid>
      </Stack>
    </section>
  );
}
