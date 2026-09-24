import type { ActionType } from "./analytics-context";

/**
 * Client analytics batching engine — framework-free so it can be unit
 * tested (scripts/test-analytics-queue.ts). The React provider wires it to
 * browser storage, fetch and sendBeacon.
 *
 * Contract with POST /api/analytics (src/lib/analytics.ts): at most 50
 * events per request, body `{ events, timestamp }`.
 *
 * Fixes carried over from the previous provider:
 *  - Environment checks and the session id are resolved lazily on first
 *    use, so events recorded by child effects before the provider's own
 *    effects run (the landing pageview, the first city view) are kept.
 *  - A flush while a request is in flight leaves the queue untouched
 *    instead of discarding it.
 *  - Batches are chunked to the server's 50-event limit.
 */

export const MAX_EVENTS_PER_REQUEST = 50;

export interface AnalyticsEvent {
  type: "pageview" | "action" | "session_end";
  sessionId: string;
  isNewVisitor?: boolean;
  path?: string;
  cityId?: number;
  action?: ActionType;
  referrer?: string;
  sessionDuration?: number;
  pageCount?: number;
  hasGeoConsent?: boolean;
}

export interface AnalyticsEnvironment {
  /** DNT / dev-mode gate, evaluated once on first use. */
  isEnabled: () => boolean;
  /** Returns the tab's session id, creating one when missing. */
  getSession: () => { id: string; isNew: boolean };
  /** True only on a browser's first ever session (sets the marker). */
  claimNewVisitor: () => boolean;
  referrerOrigin: () => string | undefined;
  now: () => number;
  send: (body: string) => Promise<void>;
  beacon: (body: string) => boolean;
}

export class AnalyticsQueue {
  private queue: AnalyticsEvent[] = [];
  private sending = false;
  private enabled: boolean | null = null;
  private session: { id: string; startTime: number; pageCount: number } | null = null;
  private newVisitor: boolean | null = null;
  private referrer: string | undefined;
  private sessionEnded = false;

  constructor(private readonly env: AnalyticsEnvironment) {}

  get size(): number {
    return this.queue.length;
  }

  isEnabled(): boolean {
    if (this.enabled === null) this.enabled = this.env.isEnabled();
    return this.enabled;
  }

  private ensureSession() {
    if (!this.session) {
      const { id, isNew } = this.env.getSession();
      this.session = { id, startTime: this.env.now(), pageCount: 0 };
      this.newVisitor = isNew ? this.env.claimNewVisitor() : false;
      this.referrer = this.env.referrerOrigin();
    }
    return this.session;
  }

  pageview(path: string, hasGeoConsent: boolean, cityId?: number) {
    if (!this.isEnabled()) return;
    const session = this.ensureSession();
    session.pageCount += 1;
    this.queue.push({
      type: "pageview",
      sessionId: session.id,
      isNewVisitor: this.newVisitor === true,
      path,
      cityId,
      referrer: this.referrer,
      hasGeoConsent,
    });
    this.newVisitor = false;
  }

  action(action: ActionType, cityId?: number) {
    if (!this.isEnabled()) return;
    const session = this.ensureSession();
    this.queue.push({ type: "action", sessionId: session.id, action, cityId });
  }

  private takeBatches(): AnalyticsEvent[][] {
    const batches: AnalyticsEvent[][] = [];
    while (this.queue.length > 0) {
      batches.push(this.queue.splice(0, MAX_EVENTS_PER_REQUEST));
    }
    return batches;
  }

  private body(events: AnalyticsEvent[]): string {
    return JSON.stringify({ events, timestamp: new Date(this.env.now()).toISOString() });
  }

  /** Send everything queued. No-op while a previous flush is in flight. */
  async flush(): Promise<void> {
    if (this.sending || this.queue.length === 0 || !this.isEnabled()) return;
    this.sending = true;
    try {
      for (const batch of this.takeBatches()) {
        try {
          await this.env.send(this.body(batch));
        } catch {
          // Analytics must never break the page; a failed batch is dropped.
        }
      }
    } finally {
      this.sending = false;
    }
  }

  /** pagehide: append session_end and hand everything to sendBeacon. */
  endSession(hasGeoConsent: boolean) {
    if (!this.isEnabled() || this.sessionEnded) return;
    this.sessionEnded = true;
    const session = this.ensureSession();
    this.queue.push({
      type: "session_end",
      sessionId: session.id,
      sessionDuration: Math.max(0, Math.round((this.env.now() - session.startTime) / 1000)),
      pageCount: session.pageCount,
      hasGeoConsent,
    });
    for (const batch of this.takeBatches()) {
      const body = this.body(batch);
      if (!this.env.beacon(body)) void this.env.send(body).catch(() => {});
    }
  }

  /** bfcache restore: the page is live again, so a later hide may report. */
  resumeSession() {
    this.sessionEnded = false;
  }
}
