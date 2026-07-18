# Accessibility and responsive manual test checklist

Automated axe checks cover public and authentication pages at desktop and mobile sizes. They cannot prove full WCAG 2.2 AA conformance, so complete this checklist before a production release and after major navigation, form, visualisation, or realtime changes.

## Test setup

- Test at 320 px, 768 px, and at least 1280 px wide; zoom browser content to 200% and text to 200%.
- Use keyboard only, then VoiceOver/Safari or NVDA/Firefox. Repeat one journey with reduced motion and one in Windows high-contrast mode.
- Confirm focus is always visible, order matches the visual flow, sticky content does not cover focused controls, and no two-dimensional scrolling is required except the labelled route-map region and data tables.
- Trigger validation and server errors. Confirm the message is announced, identifies the problem in text rather than colour alone, and submitted values remain available where safe.

## Authentication

- Tab first to “Skip to main content”; activate it and confirm focus reaches the main landmark.
- Complete login, registration, forgot-password, and reset-password forms with a password manager and keyboard.
- Submit empty, malformed, invalid-credential, and throttled states; confirm generic messages are announced and do not reveal whether an account exists.

## Route explorer and route map

- Change filters and switch map/list views at each breakpoint.
- Pan and zoom the labelled map region by keyboard. Select point and polygon markers and confirm the selected-route summary updates.
- Navigate the complete filtered route list without using the image; confirm every visual marker has the same route, grade, wall, and colour information in text.
- Open a route and verify wall-image alternative text, route-location caption, feedback controls, and ascent form.

## Forms and waivers

- Complete gym setup, route/event creation, waiver editing and acceptance, guest registration, check-in, and ascent logging.
- Confirm labels remain visible, fieldsets and legends describe grouped controls, required state is conveyed, and upload constraints are available in text.
- Read long waiver text at 200% zoom and operate its scroll region by keyboard before signing.

## Chat and realtime UI

- Enter a channel, load older messages, edit/report a message, and send multiline text by keyboard.
- Confirm connection changes and new messages are announced politely without repeatedly reading the entire page.
- With realtime disconnected, verify the refresh control and explanatory fallback remain usable.

## Competition scoring and visualisations

- Update a score and confirm the live leaderboard announces the changed text without moving focus.
- Verify reading order is rank, climber, then score. Check that abbreviations are explained in nearby competition copy.
- On Statistics, compare each visual bar chart with its adjacent data table and confirm all values are available without colour or geometry.

## Staff dashboard and responsive navigation

- Use skip navigation, gym switching, search, member/staff view switching, and every dashboard link by keyboard.
- At 320 px, confirm navigation can scroll without clipping controls and cards/tables preserve their information.
- Confirm destructive or consequential actions have clear names, disabled states remain understandable, and status messages receive screen-reader announcements.

Record browser, assistive technology, viewport, failures, screenshots, and retest result in the release ticket. Automated success does not constitute a formal accessibility certification.
