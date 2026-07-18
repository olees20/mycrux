# Performance budgets and query review

Reviewed 18 July 2026. Local measurements establish a regression baseline; they are not production Web Vitals and must be replaced with p75 field data after launch.

## Budgets

| Surface | Launch budget | Enforcement |
| --- | --- | --- |
| Public/auth mobile LCP | ≤ 2.5 s p75 | Production RUM; local Playwright navigation smoke check |
| INP | ≤ 200 ms p75 | Production RUM |
| CLS | ≤ 0.1 p75 | Production RUM |
| Local DOMContentLoaded | < 5 s | Playwright on desktop and Pixel 7 profiles |
| Local transferred resources | < 2.5 MB per public/auth navigation | Playwright; intentionally loose for development assets |
| Authenticated page server response | < 800 ms p95 excluding provider outage | Structured route/query timings |
| Feed query | < 50 ms warm at 10k tenant rows | Periodic staging `EXPLAIN (ANALYZE, BUFFERS)` |

Images from the configured Supabase Storage host use the Next.js image optimizer. Width/height are retained to prevent layout shifts. Public day-pass configuration can be cached for five minutes; token pages and all cookie/personalised tenant pages remain dynamic and must not be shared-cached.

## Measured database results

Measurements used PostgreSQL 24 locally with synthetic records added only to a disposable database. Buffers were warm. The notification query used 10,000 rows for one gym/member and requested 31 rows at offset 3,000; the community query used 5,000 rows and requested 21 rows at offset 1,000.

| Query | Plan | Execution |
| --- | --- | --- |
| Notification feed | `notifications_profile_feed_idx` index scan | 0.988 ms |
| Community feed | `community_posts_gym_pinned_feed_idx` index scan | 0.354 ms |

Deep offset scans still touch rows before the requested page (6,131 and 2,020 shared-hit blocks respectively). Current page bounds make memory and response size predictable, but cursor pagination should replace offsets if tenants routinely exceed roughly 10,000 records per feed.

## Query and realtime review

- Logbook, community, events, and notifications fetch one extra row to determine whether a next page exists, then render 20–30 rows. Filters survive page navigation.
- Chat messages already use a 50-row newest-first window and cursor-like `created_at` loading. Channel unread counts moved from one count query per channel to `get_chat_channel_summaries`, a single grouped tenant-authorized query.
- Formal competition scores moved from one query per competition to one bounded query for at most ten current/recent competitions and twenty displayed rows each.
- Signed URLs for logbook media, community images, event images, and wall images are requested in bucket batches instead of one network call per image.
- The community and notification feed indexes match tenant, actor/filter, and ordering predicates. The partial ascent index matches active personal-logbook filters. The event index matches published upcoming-event scans.
- Analytics RPCs perform tenant/capability checks before aggregation. Route-setting analytics use gym/date/route indexes; general analytics use bounded reporting periods. Community and competition leaderboards remain server-derived and return bounded result sets. Re-run plans with production-like skew before enabling long reporting ranges.
- Chat and competition Realtime subscriptions remove their channel during React effect cleanup. Reconnects trigger a bounded refresh; private content is never cached.

## Reproduction

Run `npm run test:db` against a fresh local database, insert synthetic tenant rows in a disposable copy, `ANALYZE` the affected tables, then use `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` with the same tenant predicates and page bounds. Run `npx playwright test e2e/performance.spec.ts` for both configured projects. Never load synthetic volume into staging or production without an approved cleanup plan.
