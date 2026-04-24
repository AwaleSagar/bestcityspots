import { Skeleton, Stack, Row, Grid, Caption } from "@/components/atlas";
import { Sparkles } from "lucide-react";

export default function AIBriefingSkeleton() {
  return (
    <section aria-label="AI briefing loading">
      <Stack gap={4}>
        <Row gap={2}>
          <Caption>
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-accent)]" aria-hidden />
            AI briefing · generating…
          </Caption>
        </Row>
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-11 w-28" rounded="md" />
          <Skeleton className="h-11 w-28" rounded="md" />
          <Skeleton className="h-11 w-32" rounded="md" />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6 md:p-8">
          <Stack gap={3}>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-8/12" />
          </Stack>
        </div>
        <Grid cols={{ base: 1, sm: 2 }} gap={4} aria-hidden>
          <Skeleton className="h-28 w-full" rounded="lg" />
          <Skeleton className="h-28 w-full" rounded="lg" />
        </Grid>
      </Stack>
    </section>
  );
}
