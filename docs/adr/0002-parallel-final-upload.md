# ADR-0002: Parallel final upload (concurrency 3)

- **Status**: Accepted
- **Date**: 2026-05-21
- **Deciders**: Mohanad Kandil
- **Related code**: `services/backgroundUpload.ts`

## Context

At the end of a five-step reflection session, the app uploads each recording to Firebase Storage, writes a Firestore document with the download URL, patches the corresponding local record, and deletes the local m4a file. In the original implementation, `processQueue` consumed the queue with a `while` loop that processed one upload at a time. End-to-end wall-clock time scaled linearly with the number of recordings, and a five-recording session took about fourteen seconds on Wi-Fi.

The bottleneck was not server-side or per-file; it was the serial scheduler.

## Decision

Process the upload queue in parallel batches of up to three concurrent uploads. Each batch is removed from the queue atomically with `splice(0, CONCURRENCY)`, the queue is persisted to AsyncStorage immediately, and the batch is awaited with `Promise.all`. Each upload's three-step pipeline (Storage upload, Firestore write, local patch + file delete) is extracted into a `processOne(upload)` helper so concurrency only needs to be expressed once.

Failure semantics are preserved: a failed upload is logged and dropped from the queue, matching the prior behavior of "no infinite retry loop in v1".

```ts
const CONCURRENCY = 3;
while (this.uploadQueue.length > 0) {
  const batch = this.uploadQueue.splice(0, CONCURRENCY);
  await this.saveQueueToStorage();
  await Promise.all(
    batch.map((u) => this.processOne(u).catch((e) => console.error(...)))
  );
}
```

## Consequences

**Positive**

- Five-recording end-to-end upload time on Wi-Fi: ~14 s → ~5 s (≈ 3×).
- Same storage contract, same Firestore schema, no client-visible behavior change other than speed.
- The concurrency constant is a single number, easy to tune per cohort or per network condition.

**Negative / trade-offs**

- Three concurrent uploads consume more bandwidth and more device CPU briefly. Acceptable on Wi-Fi; we may revisit if we see issues on cellular.
- Failures inside one upload do not block the rest of the batch, but they also do not cause a retry. We accept this trade as the v1 behavior already drops on failure.
- If a single upload is much larger than the others in the batch, head-of-line blocking inside `Promise.all` adds latency. Not currently observed because each m4a is roughly the same size per step.

## Notes

Reversible by setting `CONCURRENCY = 1`, which restores the original serial behavior. If we ever add retry logic, this is the natural place to add a per-upload backoff inside `processOne`.
