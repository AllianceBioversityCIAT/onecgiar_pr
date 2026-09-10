## 1. Fix the pipe

- [x] 1.1 In `format-time-ago.pipe.ts`, remove the `localTimezoneOffset` line and the `localDate = subHours(date, localTimezoneOffset)` line.
- [x] 1.2 Use the parsed `date` directly in the `> 1 week` `format(...)` fallback and in `formatDistanceToNowStrict(...)`.
- [x] 1.3 Keep the `serverTimezone` guard and input normalization (`parseISO`/`Date`/number) unchanged; `subHours` import retained (still used by the serverTimezone branch).

## 2. Tests

- [x] 2.1 Update `format-time-ago.pipe.spec.ts`: assertions no longer apply the local offset; fresh UTC instant → "0 seconds ago" (regression guard).
- [x] 2.2 Cover fresh event → near-zero "ago", 10-minutes-ago → "10 minutes ago", >1-week → absolute date, and suffix flag `false` → no "ago".
- [x] 2.3 Ran `npm run test .../format-time-ago.pipe.spec.ts` → 9/9 passing.

## 3. Verify

- [ ] 3.1 `npm start`, open Notifications → Requests received, confirm a just-created request shows "just now"/minutes (not "5 hours ago").
- [ ] 3.2 Spot-check pop-up notification, update-notification, and result-framework recent items render sane relative times.

## 4. Handoff

- [ ] 4.1 Create/attach the Jira ticket (P2-XXXX) and use it in the commit: `🐛 fix(format-time-ago) P2-XXXX: render timezone-independent relative time`.
- [ ] 4.2 Do NOT bundle with the P2-2928 alert-style fix — separate concern, separate change.
