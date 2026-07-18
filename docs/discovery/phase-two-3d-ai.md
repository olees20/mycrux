# Phase-two 3D and AI discovery plan

Status: discovery only  
Date: 18 July 2026  
Decision owner: Product owner, advised by platform engineering, privacy/legal, accessibility and representative route setters

This document defines isolated experiments for advanced route visualisation and recommendations. It does not approve a production feature, accuracy claim, biometric processing, model training on member content, or a change to the MVP data path. The existing accessible 2D wall image, route geometry and text description remain canonical throughout discovery and after any later launch.

## Non-negotiable boundaries

- Run proofs of concept in a separate cloud project, storage bucket, database/schema and deployment with synthetic walls or specifically consented pilot captures. It receives no production service-role key, database connection, webhook, user table or analytics stream.
- No experimental dependency, model endpoint, table, bucket, feature flag or UI is merged into the production path during discovery. A later production proposal requires its own architecture decision, threat/privacy assessment, migration, RLS, accessibility review and tests.
- A trained route setter must approve or correct every detected hold, colour, segment, route association and suggested mapping before publication. Confidence never replaces review.
- The 2D editor and accessible route list must work when WebGL, LiDAR, camera permission, the model service or the 3D asset is absent, slow, rejected or deleted.
- Never infer identity, body shape, ability, health, injury, protected characteristics or precise location. Do not use faces, bystanders, conversations, EXIF location or member-uploaded media as training inputs.
- Report results with sample size, capture conditions and confidence intervals. Do not market experimental metrics as general accuracy.

## Questions and hypotheses

1. Can a setter capture enough overlapping imagery on ordinary supported phones to construct a useful wall surface without closing the gym or buying specialist equipment?
2. Does LiDAR materially improve metric scale and surface alignment compared with image-only photogrammetry on devices that support it?
3. Can route points move reliably between the existing normalised 2D coordinate system and a 3D wall coordinate system?
4. Can computer vision reduce annotation time across hold colours, wall textures, lighting and occlusion while preserving mandatory setter review?
5. Does interactive 3D improve route understanding enough to justify accessibility, device, storage, network, compute and maintenance costs over the 2D baseline?
6. Can privacy-conscious recommendations help members discover routes without profiling sensitive traits or creating a filter bubble?

## Candidate architecture

```text
consented capture set -> isolated upload/quarantine -> reconstruction job
                                                     |
                                                     v
setter review tool <- detections + confidence <- derived mesh/texture
       |                                             |
       v                                             v
approved experiment manifest ----------------> 3D PoC viewer
       |
       +-------------------------> unchanged 2D route view (canonical fallback)
```

Each capture receives a random experiment identifier, not a production gym/member identifier. A manifest records capture consent, device class, algorithm/model version, processing configuration, derived-asset lineage, reviewer decisions and deletion status. Raw capture, derived mesh/texture, labels and metrics use separate prefixes and least-privilege service identities. Outputs are immutable by model jobs after submission for review.

If a later production design is proposed, tenant identity must be explicit on every asset and metadata row, RLS/storage policies must mirror existing gym isolation, and only approved annotations may cross from an isolated processing queue into an application-owned import endpoint. Direct model writes to production remain prohibited.

## Capture and reconstruction experiment

### Inputs

- Compare image-only photogrammetry from two common phone tiers with LiDAR-assisted capture from one supported device class.
- Use three synthetic/consented wall sections: planar, slab/vertical with texture, and overhang/volume geometry. Include at least four lighting conditions and deliberate occlusion/glare cases.
- Capture a measured scale bar and 12 independently surveyed control points per wall. Remove people, screens, notices, QR codes and unrelated personal information before upload; strip EXIF metadata client-side and verify removal server-side.
- Give the operator an overlap/coverage guide, low-light warning, capture progress and retake flow. Camera access is optional and purpose-specific, never bundled with member consent.

### Model format and coordinate mapping

- Evaluate glTF/GLB for delivery, with compressed geometry/textures only after measuring visual error. Preserve a higher-resolution processing artifact separately from the web asset.
- Define wall-local right-handed coordinates in metres. Record the transform from surveyed control points to model space and a camera projection from model space to the canonical 2D image.
- Map existing 2D points/polygons by ray-casting onto the reviewed wall mesh. Project 3D annotations back into normalised 2D coordinates and compare with setter-authored ground truth.
- Version mesh, calibration, transform, canonical image and route annotations together. A changed wall model never silently moves a published route; it creates a reviewable draft.

### Measurements and gates

Use at least 30 independently annotated routes and 120 control/hold points across the three walls.

| Metric | Go threshold | Stop/rework threshold |
| --- | --- | --- |
| Successful capture without expert help | At least 85% of 20 guided attempts complete within 12 minutes | Below 70%, or capture presents unacceptable safety/operational disruption |
| Surveyed control-point reprojection error | Median at most 20 mm and p95 at most 50 mm | p95 above 100 mm on any wall class |
| 2D-to-3D-to-2D route-point error | Median at most 1.5% and p95 at most 3% of image diagonal | p95 above 5% or route association changes after an unchanged-model reprocess |
| Mesh completeness | At least 95% of climbable wall area usable, with holes visibly flagged | Hidden/unflagged holes or geometry that could misrepresent route location |
| Operator effort | Median total capture plus review at most 30 minutes per wall section | More than 60 minutes, or slower than maintaining the 2D map |

Proceed with LiDAR only if it improves p95 geometric error by at least 20% or reduces operator time by at least 25% without making supported-device coverage unacceptable. Otherwise prefer image-only capture. Stop the 3D track if setters find the geometry misleading, the 2D baseline performs equally in user research, or safe capture requires specialist operation that the pilot cannot fund.

## Hold detection and route segmentation experiment

### Label and evaluation design

- Two route setters independently label hold/volume masks, visible colour family, route grouping, occlusion and ambiguous regions. Resolve disagreements into a reviewed gold set and retain disagreement rates.
- Split by wall, not by image, so near-duplicate frames cannot leak into train and test. Keep one gym/wall style entirely out of training for an external-style test.
- Report per-colour, wall-texture, lighting, hold-size and occlusion slices, plus macro averages. “Unknown/needs review” is a valid and preferred output.
- Hold detection emits masks or boxes, colour probabilities, route-segment candidates, confidence/calibration data, model version and explanatory evidence. It never publishes directly.

### Measurements and gates

| Metric | Go threshold for a review assistant | Stop/rework threshold |
| --- | --- | --- |
| Hold detection | Macro precision at least 0.92, recall at least 0.85; no evaluated slice below 0.75 recall | Precision below 0.85 or a material lighting/colour slice below 0.60 recall |
| Hold mask quality | Median intersection-over-union at least 0.80, p10 at least 0.60 | Median below 0.70 or boundaries routinely obscure route understanding |
| Colour family | Macro F1 at least 0.90 with calibrated “unknown”; expected calibration error at most 0.08 | Any common colour F1 below 0.75 or unknown cases forced into confident labels |
| Route segmentation/grouping | Adjusted Rand index at least 0.85 and zero unreviewed publication | Below 0.70, or reviewers cannot efficiently see why holds were grouped |
| Review efficiency | Median setter annotation time reduced at least 35% versus manual 2D baseline | Less than 15% reduction, correction burden increases, or error detection is unreliable |
| Confidence usefulness | At least 90% of wrong predictions fall below the publication-assistance threshold | High-confidence errors are not rare enough for safe triage |

Thresholds permit only an annotation assistant, never autonomous publication. Every model output enters a draft state. The reviewer can accept, edit, reject and flag a capture; the audit record retains model/version, original suggestion, final decision and reviewer role. Rejection feeds evaluation only unless separate training consent exists.

## Viewer, device and accessibility experiment

Test current and previous major versions of Safari/iOS, Chrome/Android, Chrome/Edge desktop and Safari/macOS across representative low-, mid- and high-tier hardware. Record WebGL support, memory pressure, thermal/battery behavior and assistive-technology interaction.

| Budget | Target |
| --- | --- |
| Initial 3D transfer | At most 5 MB on the default mobile asset; no automatic raw capture/model download |
| Interactive load | p75 at most 3 seconds on a throttled mid-tier mobile/4G profile after page shell; 2D content remains immediately usable |
| Interaction | At least 30 frames/second p75 and no task over 200 ms during ordinary pan/orbit/select |
| Memory | At most 200 MB incremental browser memory on the mid-tier reference device |
| Stability | At least 99% viewer sessions without crash/context loss in the study; failures switch to 2D without data loss |
| Accessibility | Every route/hold and action available in ordered text/2D form; keyboard focus never enters an inescapable canvas; reduced-motion respected |

The viewer is an enhancement behind explicit “View in 3D” activation. It must not autoplay motion, request camera access, encode meaning only by colour/depth, or hide the route name, grade, wall, colour and location description. Provide reset-view, keyboard controls, textual selection status and a persistent “Use 2D view” control. If a meaningful accessible 3D interaction cannot be delivered, 3D remains a non-essential visual supplement.

## Personalised recommendation experiment

### Allowed signals

- Explicit member preferences: grades/discipline, desired challenge, favourite wall/route style and “show me something different”.
- Member-owned interactions inside one gym: published-route views, voluntary ratings and ascent outcomes/attempt counts, subject to retention limits.
- Operational route facts: grade, discipline, wall, setter-reviewed tags, publish/retire dates and availability.

Do not use waiver/guest/check-in history, chat/community content, free text, contacts, billing, marketing consent, precise visit timing, device fingerprint, disability/health/injury, age, gender or inferred protected/sensitive traits. Do not share signals between gyms. New members receive a transparent popularity/recency/diversity baseline requiring no personal history.

### Transparent output and control

Show at most three plain-language reasons such as “matches your V3–V4 preference”, “new on the slab”, or “different from your recent climbs”. Let a member change preferences, hide a route, reset/delete recommendation history and disable personalisation without losing core product access. Do not label a member’s ability, readiness or safety. The feature discovers routes; it does not advise what is safe to climb.

Start with an interpretable weighted ranker in an offline, tenant-separated notebook/service. Compare against recent/popular and grade-filter baselines; do not begin with generative AI or cross-user embeddings. Human product review approves signals and reason templates. Route availability and gym safety/closure rules always override ranking.

### Measurements and gates

- Offline, time-based evaluation across at least 100 synthetic or expressly consented pilot profiles, reporting per-gym results: NDCG@10 at least 10% over the recency/popularity baseline, catalogue coverage at least 30%, and no more than 50% of recommendations from one wall/style when alternatives exist.
- Counterfactual privacy test: changing a prohibited field cannot affect rankings; cross-gym events cannot be retrieved or influence output. Any failure is a stop condition.
- Moderated study with at least 20 consenting members: at least 70% correctly understand one displayed reason, at least 70% rate control/reset as easy, and no participant interprets the output as safety or medical advice after the final copy review.
- Online pilot, only after separate approval: opt-in rate and route-save/view usefulness are descriptive, not a mandate to maximise engagement. Stop if opt-out/reset is unreliable, complaints show material stereotyping/filter bubbles, or any gym/member data crosses a tenant boundary.

## Privacy, consent and governance

- Complete a data-protection impact assessment before any real-gym capture or member recommendation pilot. Record controller/processor roles, purpose, lawful basis, recipients, subprocessors, international transfers, security measures, retention and rights handling.
- Wall capture consent is gym/location-specific and separate from member recommendation consent. Post signage and schedule capture to exclude people; pause and discard a take if a person appears. Face blurring is not permission to collect bystanders routinely.
- Training permission must be explicit, granular by raw/derived asset and revocable for future training. Product-operation consent does not imply model-training consent. Withdrawing training permission removes the asset from future datasets/releases; document the limits of removing influence from an already trained model.
- Keep a dataset/model card with provenance, permitted purpose, exclusions, label process, demographic/sensitive-data statement, quality slices, limitations, licences, deletion history and model lineage. No web-scraped or unclear-licence climbing imagery.
- Proposed discovery retention: raw captures for at most 30 days after accepted reconstruction, rejected captures for at most 7 days, derived consented evaluation assets for at most 90 days, and aggregate non-identifying metrics for the documented study period. Shorter gym/legal requirements win. Automated deletion must be tested.
- Encrypt in transit/at rest, use time-limited uploads/downloads, scan files, separate operator/reviewer access, log access without sensitive content, rotate secrets, and prohibit public buckets. Treat detailed wall geometry and behind-the-scenes imagery as commercially/security-sensitive gym data.
- A participant can access, correct, export, withdraw and request deletion through the study contact. Do not recruit minors or process their recommendation history in discovery.

## Cost and operational model

Do not approve a pilot from vendor headline prices. For each experiment, record actual usage and calculate monthly low/base/high scenarios using current written quotes at decision time:

```text
monthly cost = raw capture GB-month
             + derived model/texture GB-month
             + upload/download and CDN GB
             + reconstruction GPU/CPU minutes
             + detection inference images/minutes
             + managed database/queue/logging
             + setter capture and review hours
             + engineering/support/on-call allowance
```

Measure raw and compressed bytes per square metre, reconstruction minutes per capture, inference seconds per image, retries/failures, CDN transfer per viewer session and human minutes per wall/route. Include data residency, minimum commitments, egress, deletion/reprocessing, model/version migration and vendor-exit export. Redact commercial quotes from public documentation.

Go only if the base scenario fits an approved per-wall setup and per-month active-gym budget, the high scenario is affordable for three months, and review labour is lower than the 2D baseline by the target above. Stop if cost cannot be capped per tenant/job, vendor terms permit training on Crux/gym data, deletion cannot be verified, or exit requires losing canonical route annotations.

## Isolated proof-of-concept sequence

### Stage 0 — protocol and baseline (one week)

- Obtain privacy/legal protocol approval, synthetic/consented locations and written capture permissions.
- Freeze test walls, surveyed points, device/browser matrix, 2D task scripts, metric definitions and cost worksheet before running models.
- Time the current 2D capture/mapping and route-discovery tasks; this is the comparison baseline.
- **Exit:** dataset register and consent/deletion drill pass. Otherwise stop.

### Stage 1 — reconstruction and coordinate mapping (two weeks)

- Run image-only and LiDAR-assisted captures; produce versioned GLB assets in the isolated environment.
- Measure geometry, projection, effort, transfer, viewer and cost thresholds without AI annotation.
- **Exit:** all safety/privacy stop conditions avoided and the reconstruction gates met on every wall class. Otherwise retain the 2D workflow and close or redesign the track.

### Stage 2 — detection as a review assistant (two to three weeks)

- Build the reviewed gold set, train/evaluate only on permitted assets, calibrate confidence and prototype accept/edit/reject.
- Run a blinded crossover timing study: manual 2D annotation versus assisted annotation.
- **Exit:** detection, slice, calibration and review-efficiency gates met. Otherwise do not proceed to a product proposal.

### Stage 3 — 3D user study and recommendation offline study (two weeks)

- Compare route-finding comprehension, task time, error, accessibility preference and device behavior for 2D versus optional 3D.
- Evaluate the interpretable recommender offline and conduct the consented comprehension/control study; no production traffic.
- **Exit:** 3D produces a meaningful user benefit without weakening fallback/accessibility, and recommendations meet privacy/fairness/transparency gates.

### Stage 4 — decision, not deployment

- Publish reproducible aggregate results, failure cases, cost envelope, privacy/accessibility reviews, dataset/model cards and setter/member feedback.
- Product owner records one decision per capability: stop, repeat experiment, or commission a production architecture proposal.
- A “go” authorises design work only. It does not authorise production data, autonomous publication or rollout.

## Stop conditions applying at every stage

Stop collection/processing immediately for tenant crossover, unconsented people or content, unclear training rights, inability to honour deletion, public asset exposure, unsafe capture practice, misleading geometry, unreviewed model output, sensitive-trait inference, uncapped cost, or loss of the usable 2D fallback. Quarantine affected data, preserve only minimum incident evidence, notify the study owner/privacy contact, and do not resume until the cause and consent implications are reviewed.

## Discovery deliverables

- Reproducible capture protocol and synthetic/consented dataset register.
- Versioned evaluation scripts/configuration, surveyed ground truth and aggregate result tables.
- Model/dataset cards, confidence calibration, sliced error analysis and reviewer disagreement analysis.
- Device/browser/accessibility report and 2D-versus-3D moderated study findings.
- Per-wall/per-session cost worksheet with low/base/high scenarios and vendor-exit assessment.
- Privacy impact assessment, consent text, deletion evidence and security threat review.
- Final stop/repeat/propose decision against every threshold in this document.

Until those deliverables pass review, the correct product state is the current 2D experience with no experimental AI dependency.
