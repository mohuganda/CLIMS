# Engineering practices

Every change is held to the 20 practices in the project brief. A commit that applies one names
it by number, for example `feat(tokens): exp always set (6, 9, 14)`.

Practices 1–9, 12, 13, 14 and 18 match Israel Josué Parra Rosales,
[20 Best Programming Practices](https://medium.com/@josueparra2892/20-best-programming-practices-407df688b96e),
as cited in duara-geo. The wording of the rest comes from the Duara Meet brief.

| #   | Practice                        | How it shows here                                                                                                              |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Descriptive names               | `room_name`, `short_code`, `lobby_bypass`: the names Jitsi and the brief use, not new ones                                     |
| 2   | Comments say why                | The spike's config comments say _why_ `JICOFO_ENABLE_AUTH=0` is needed, not what it does                                       |
| 3   | DRY                             | One policy resolver (ADM-01); one token minter; one place that knows Jitsi's claim names                                       |
| 4   | Unit-test every domain function | Table-driven Go tests; domain coverage ≥ 80%                                                                                   |
| 5   | One style                       | gofmt + golangci-lint, ESLint + Prettier, enforced in CI                                                                       |
| 6   | Handle every error              | Wrapped with context; clients get safe messages; Jitsi refusals are told apart from outages                                    |
| 7   | Document                        | GoDoc/TSDoc, OpenAPI, ADRs in `docs/adr/`                                                                                      |
| 8   | Optimise where measured         | Token issue and the join page are the hot paths; measured before tuned                                                         |
| 9   | Security first                  | Tokens scoped to one room, always expiring, never wildcard; secrets generated per install; input validated at the API boundary |
| 10  | Git hygiene                     | Small conventional commits, feature branches, PRs                                                                              |
| 11  | Plan before coding              | Each phase starts with its design/ADR                                                                                          |
| 12  | Simplest data structure         | Policy and branding are single rows; attendance comes from Prosody's own records                                               |
| 13  | Modular                         | One Go package per domain module; domain code depends on interfaces (`Mailer`, `TokenSigner`, `Clock`, …)                      |
| 14  | Test edge cases                 | Expired, tampered and wrong-room tokens; DST; invalid branding; SMTP down; network drops                                       |
| 15  | Refactor continuously           | Leave code cleaner than found                                                                                                  |
| 16  | No mutable globals              | Dependencies injected from `cmd/`                                                                                              |
| 17  | CHANGELOG                       | `docs/CHANGELOG.md`                                                                                                            |
| 18  | Single responsibility           | Jitsi does media; the API decides; the web app displays                                                                        |
| 19  | Memory as well as time          | Bounded request bodies, bounded queues, streaming exports                                                                      |
| 20  | Learn from mistakes             | Notable bugs and root causes go in `docs/lessons.md`                                                                           |

**Two more rules:**

- Jitsi source is never modified.
- A security control is never weakened to make a test pass.

## A change is done when

1. Lint and tests pass, and new behaviour has a test (4, 5, 14).
2. A new endpoint is in the OpenAPI document (7).
3. Anything that touches Jitsi has been run against the real pinned stack, not only fakes. Jitsi's
   behaviour lives in its config and plugins, which is where the assumptions hide (14).
