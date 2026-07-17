# Statistics definitions

All date grouping uses the `session_date` captured in the gym's local calendar when an ascent or session is logged.

- **Sessions:** distinct climbing-session records. Multiple ascents can share one session.
- **Climbs:** non-deleted ascent entries whose outcome is flash, onsight, redpoint or repeat. Attempted and project entries are not sends.
- **Attempts:** sum of the `attempts` field across every non-deleted log entry, including projects.
- **Success rate:** successful ascent entries divided by all non-deleted ascent entries. It is unavailable—not zero—when there are no entries.
- **Grade distribution:** successful ascent entries grouped by the route grade snapshot stored when logging.
- **Best send:** highest successful Font grade with a recognised ordering. It is unavailable when no comparable Font send exists; incomparable systems are never guessed.
- **Flashes:** non-deleted entries with outcome `flash`.
- **Weekly streak:** longest run of Monday-to-Sunday calendar weeks containing at least one session. Multiple sessions in a week count once.
- **Progress over time:** successful ascent entries grouped by gym-local calendar month.

Statistics include private entries because they are personal analytics. Privacy controls govern other members' social reads, not the owner's own statistics.
