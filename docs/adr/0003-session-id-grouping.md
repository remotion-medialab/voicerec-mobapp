# ADR-0003: Group recordings by session id, infer for legacy entries

- **Status**: Accepted
- **Date**: 2026-05-21
- **Deciders**: Mohanad Kandil
- **Related code**: `components/recording/RecordingApp.tsx`, `services/recording.ts`, `services/backgroundUpload.ts`, `components/RecordingsListScreen.tsx`, `types/recording.ts`

## Context

Each reflection flow records five voice steps in sequence. In the original implementation, each step was stored as an independent recording with a `stepNumber` (0–4) but no link back to the flow it belonged to. The recordings list rendered every step as a separate row. A user who ran the flow twice in a day saw ten loose entries; the structure of the session was lost.

We needed a way to group the five recordings of one flow as a single unit on the timeline, both for new recordings and for the recordings already stored locally and in Firestore.

## Decision

Introduce an optional `sessionId` field on `RecordingEntry`. The orchestrator (`RecordingApp`) mints a new id when the first step of a flow begins, threads it through `saveRecordingLocally`, `queueForLater`, and the Firestore document, and clears it when the flow is restarted.

For recordings written before this change, the list view infers a session client-side by walking the day's recordings in time order and starting a new inferred session whenever:

- the entry has no `sessionId`, AND
- one of: it is the first entry, or `stepNumber` resets to 0, or the gap from the previous entry exceeds 30 minutes.

Both explicit and inferred sessions render as a single collapsible "Session N" card on the day. Tapping the card expands to the five step rows and plays inline.

## Consequences

**Positive**

- The timeline now reflects the user's actual mental model: one card per flow, expandable to its five steps.
- New recordings carry the id all the way through Firestore, so any future analysis (across cohorts or sessions) has the grouping for free.
- Legacy entries are not orphaned. Existing local recordings group as one session each (assuming they were recorded in a single sitting), which is true for the current participant set.

**Negative / trade-offs**

- Two sources of truth for the grouping (explicit id vs inferred) means the list view has to handle both, which is some extra branching in `daySessions`.
- The inference heuristic (`stepNumber === 0` reset or >30 min gap) is correct for the typical flow but will mis-group if a participant recorded multiple flows in quick succession before this change. We accept this because the affected entries are few and the worst case is a visually merged session, not data loss.
- Existing Firestore docs do not get back-filled with `sessionId`. We could add a one-off migration script, but the inference handles them well enough that this is not urgent.

## Notes

If we ever want a stricter grouping (e.g., for analysis that requires exact session boundaries on legacy data), we will add a one-off Firestore migration that assigns inferred ids and writes them back. The schema is forward-compatible: `sessionId` is optional, so older clients ignore it.
