# Architecture Decision Records

This folder captures decisions about how the app is built. Each ADR is a short, dated record of one choice: why we needed to decide, what we chose, and what the consequences are. ADRs are written when the decision is made, not before. They are immutable once accepted — to change a decision, write a new ADR that supersedes the old one.

Format follows Michael Nygard's template.

## Index

| # | Title | Status |
|---|---|---|
| [0001](./0001-optimistic-step-transition.md) | Optimistic step transition in the recording flow | Accepted |
| [0002](./0002-parallel-final-upload.md) | Parallel final upload (concurrency 3) | Accepted |
| [0003](./0003-session-id-grouping.md) | Group recordings by session id, infer for legacy entries | Accepted |
