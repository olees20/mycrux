# Gym analytics data dictionary

All KPIs are gym-scoped aggregates produced by `get_gym_operational_analytics`. The selected inclusive date range is compared with the immediately preceding range of equal length. CSV exports contain only the five documented aggregate fields: period, key, label, value and definition.

| KPI | Reproducible source definition |
| --- | --- |
| Active users | Distinct member profile IDs appearing in a check-in, non-deleted ascent, non-deleted community post, or event registration during the period. IDs are counted but never returned. |
| Member registrations | `gym_memberships` records whose `joined_at` is in the period. |
| Check-ins | Member and guest `check_ins` records whose `checked_in_at` is in the period. This is not occupancy. |
| Waiver completions | Non-revoked `waiver_acceptances` signed in the period, for members and guests. Identity evidence and consent snapshots are excluded. |
| Event registrations | `event_registrations` whose `registered_at` is in the period, regardless of later status. Notes are excluded. |
| Community engagement | Non-deleted community posts and comments plus reactions created in the period. Chat channels and messages are excluded. |
| Route usage | Non-deleted ascent logs whose `climbed_at` is in the period. Member IDs, visibility and notes are excluded from results. |

Only gym owners or staff granted the `analytics.read` capability can execute the query or export it. Aggregate counts may still be sensitive for very small gyms and should not be shared publicly.
