# Isekaimania Wiki — Content Scope & Source Rules

Last reviewed: 2026-11-10

## Purpose
The wiki documents player-useful, confirmed **gameplay data** from the live Isekaimania Sheets and Isekaimania Localization. It is **not** a transcript of the game's conversations or a dump of every source-sheet row.

## INCLUDE
- Confirmed ID-backed characters, jobs, monsters, active/passive skills, items, equipment, chests, tile data and tile areas.
- Main Quests, relevant named Special Events and grade Missions: objectives, prerequisites, conditions, meaningful stage/action summaries, locations, encounters, outcomes and rewards.
- Gameplay descriptions and labels in available source-backed languages; relevant references between items, skills, monsters, quests, tiles and chests.
- Source-backed balance changes, additions, and corrections with an entry in the Wiki Version Log.

## EXCLUDE
- **All NPC/player dialogues, conversation transcripts and individual dialogue-option scripts.** Retaining raw source dialogue fields inside existing structured stage records does not authorize rendering or translating dialogue as wiki content.
- **Universal / generic / system Special Events** (for example `GeneralEnd`, `UniversalSellMaterial` and other shared event handlers): do not show them as individual Special Event wiki entries; do not report these rows as missing content.
- Repeated internal event steps, boilerplate choice handlers, technical flags, developer/test mechanisms and unconfirmed design concepts without a valid ID as standalone wiki entries.
- Blank-ID drafts, stopped/incomplete/untested features and unsupported interpretations of mechanics, rewards or enum values.

## IMPORTANT DISTINCTIONS
- **No quest attached** does *not* by itself imply that an event is universal. Some named events have zero quests but are still meaningful and should remain eligible.
- Named Special Events with useful objectives must remain in the **source JSON** even when they have no Quest entry. **Public display is a separate eligibility decision**: source retention does not imply that an unlocalized event should be shown on the Wiki.
- Only claim translations have been verified for the **displayed gameplay text** actually checked; dialogue translations are expressly out of scope.
- An untranslated internal identifier should not be fabricated into a display name. Mark it pending and check the source.
- Do not assume every `SpecialEvents` Sheet row should appear in the wiki. Group and filter by gameplay relevance.

## SOURCE & SAFETY
1. Requested scope and explicit decisions override general guidance.
2. Respect confirmed game runtime behavior and the source-of-truth hierarchy in Isekaimania Design Rules.
3. Use live Isekaimania Sheets and Localization for ID-backed content and exact source values; never invent IDs.
4. Preserve existing IDs, compatible wiki JSON schema, and related references.
5. Specific naming exception: Chest ID 77 remains `HeartwoodCache` by explicit decision. The Chest Sheet's competing name must not silently overwrite this.
6. Keep `wiki-baseline-0.0` intact as the revert point.
7. Track audit limitations in `data/version_log.json`; do not state that all content or a game version is verified until actually checked.

## VERSION-LOG AUDIT RULE
Excluded dialogue and universal event rows are **out of scope**, not missing or pending localization work. Only report gaps in included gameplay content and its displayed localization.

## APPROVED NAMED EVENT EXCEPTIONS (2026-10-20)
Keep the source JSON records for all twelve named single-stage events even when they have zero attached quests or no exact source title translation: `WhereIsCastle`, `MysteriousOneEye`, `TheVampWarning`, `TheThunderForest`, `TooBrightToStudy`, `PoisonInThePuddle`, `WaterproofingFailure`, `TheGlowingWreckage`, `TracksUnderTheSnow`, `TheSmokingCrate`, `TheAbandonedHerbBasket`, `TheEmptyHuntingCamp`. They are **retained as named gameplay event source records**, not universal handlers. **As decided 2026-10-27, all twelve are deliberately filtered out of the public Quests display until their localization is verified**; do not delete their JSON records. Never invent translated titles. Universal/system events and all dialogues remain excluded.

## ONGOING WORK VS RELEASE READINESS
- **Mechanics documentation** is an ongoing, evolving wiki workstream as gameplay systems change or are confirmed. Do not treat unfinished optional mechanics explanations as a blocker to calling the currently scoped, verified data snapshot up to date.
- **Delivery/presentation work** (layout, navigation, usability, refinements and publishing improvements) is ongoing, separately tracked. It is not a blanket blocker to a verified data-synchronization checkpoint. Actual broken published links or data display are defects and must still be reported.
- For any version claim, distinguish **source data synchronization**, **verified gameplay scope**, **website availability**, and **ongoing documentation/delivery improvements**. Never imply these four are identical.
- Scope remains: dialogues and universal/system Special Events excluded, twelve approved named events kept, Chest ID 77 fixed as `HeartwoodCache`.

## AUDIT PLAYBOOK — 2026-11-10 (prior chat decisions + existing records)

**Read this section before EVERY Isekaimania Sheets-vs-Wiki audit.** It clarifies longstanding decisions and must not be misread as a request to import every new row. Existing gameplay data were not synchronized merely by writing these rules.

### 1. Keep Wiki sections separate

- **Adventure Map** (UI route `MainQuests`, data `data/main-quest-groups.json` plus linked quest files): this is where **Main Quests** belong. Never call a Main Quest missing from the Wiki **Quests** tab when it should be evaluated against Adventure Map.
- **Quests**: evaluate named Special Events, Missions / grade and guild quests, and other player-useful quests according to their respective current Wiki views and data sources (`data/event-quests.json`, `data/guild-quests.json`, etc.). Do not conflate them with the Main Quest storyline.
- **Other Events**: retain the established interaction-oriented presentation when applicable, but never expose NPC/player dialogue transcripts or unsupported dialogue choices as documentation.
- Use existing Wiki UI/data routes; do not create duplicate quest sections or automatically reclassify events simply because another source sheet uses the word “quest”.

### 2. Exclusion and readiness decisions (not data gaps)

- **Exclude** universal / generic / system Special Events and shared handlers (e.g., `GeneralEnd`, `UniversalSellMaterial`), boilerplate technical event steps, dialogue transcripts, dialogue options, developer/test content, unsupported interpretations, unfinished features and blank-ID drafts. These are **out of Wiki scope**, not missing Wiki data.
- **Hold from publication** new quest/event content with no reliable gameplay description/objective or no sufficiently interpretable confirmed completion condition. Check official localization and source conditions before making a player-facing claim. **Never write a plausible-sounding objective, outcome, condition, translation or reward.**
- A record's presence in Sheets, having a numeric ID, or having a newly released game version does **not** by itself authorize publication. Classify by gameplay relevance, confirmed available fields, previous explicit exception decisions and release status.
- An event with **zero attached quests is not automatically universal or excluded**. Some named, gameplay-relevant encounters carry objectives in SpecialEvents conditions. Apply the 12 explicit inclusions below.
- **Do not delete previously approved source records or change earlier publication decisions** because a later automated audit labels localization incomplete. The 12 named events are source-retained but intentionally not publicly displayed; restore public display only after official localization is verified.
- Skill descriptions, mechanics explanations, optional documentation and delivery refinements are **ongoing workstreams**. Track them separately; they must not inflate the count of verified gameplay-data discrepancies or automatically block an otherwise scoped sync.
- Historical game bug fixes or UI-only version-log changes need not create new Wiki gameplay rows. For version claims distinguish a **completed game release**, a **source-data change**, an **included Wiki change**, and an **unverified/pending record**.

### 3. Twelve retained source exceptions — deliberately excluded from public display

As approved on **2026-10-20**, retain these **12 named single-stage Special Events** even with zero attached quests and/or an unresolved exact group-title localization. They are not universal handlers, but their public titles were not verified:

`WhereIsCastle`, `MysteriousOneEye`, `TheVampWarning`, `TheThunderForest`, `TooBrightToStudy`, `PoisonInThePuddle`, `WaterproofingFailure`, `TheGlowingWreckage`, `TracksUnderTheSnow`, `TheSmokingCrate`, `TheAbandonedHerbBasket`, `TheEmptyHuntingCamp`.

On **2026-10-27**, we explicitly filtered these **12 events from the public Quests catalogue** (51 total named event groups in JSON → **39 displayed**), while retaining all 51 source groups and all **203 Guild Quest** groups. The existing Wiki code `special-event-wiki.js` confirms public filtering by a localized group or quest title. Do **not** conflate data retention with public inclusion. The private **Isekaimania Wiki** Google Sheet, tab **Sheets Check**, contains 12 entries dated **2026-10-28 00:34:28 MYT**, one per event, marked **Open** for **Localization mapping**. “Public Title Visible? Yes” in those earlier audit rows describes the original key-fallback state at inspection, **before the public filtering change**, not current authorized visibility. Find the official localization from the source; do not invent it. These are privately tracked editorial discrepancies, not newly missing gameplay records and **not public Wiki Version Log items**.

Private discrepancy tracker: https://docs.google.com/spreadsheets/d/1QM8kPcSzP-7z6vE5M2AqIbDrcnH9IFvx4H6GOWenTG4

### 4. Source and display rules from earlier decisions

- The authoritative localization sources for Special Events are the **SpecialEvents** and **Quests & Event Groups** localization tabs; consult other authoritative game UI/General strings only when applicable. Do not infer translations from internal identifiers.
- For Special Event / Guild Quest cards keep presentation compact: **Where** = Tile Data and Tile Area when meaningful; **Objective** = localized description where available, otherwise a **reliably interpretable source completion condition**. If the description already provides the same Tile Area, do not repeat it. **No stage-count decoration.**
- For uncertain objectives, quest conditions or source-vs-display discrepancies use private **Sheets Check** and keep the public Wiki Version Log concise: release and **confirmed in-scope synced data** only. Do not leak internal unresolved mapping tables into the public release summary.
- Chest ID **77** remains **`HeartwoodCache`** by explicit project decision, notwithstanding live Sheet `DryadPineGroveCache`; preserve links from HeartwoodSanctum / DryadPineGroveDungeon as previously established. Do not treat this as an accidental mismatch or silently overwrite it.
- Preserve `wiki-baseline-0.0`, approved IDs and source-backed relationships. Do not quietly replace records to make counts match.

### 5. Mandatory workflow for a new source version or new rows

1. **Read** `WIKI_CONTENT_SCOPE.md`, `data/version_log.json`, and the private **Isekaimania Wiki → Sheets Check** tracker **before** assessing missing items.
2. Read the live **Ver Log** with **completion/status/date** columns; a version bump alone does not mean every neighboring draft is released.
3. Classify each changed source record as **already covered**, **in-scope confirmed and missing/changed**, **explicitly excluded**, **source-retained but public-display withheld**, **held for source description/condition/localization**, or **unfinished/unconfirmed**. Keep the 12 named events in the source-retained/public-hidden category unless their localization is verified.
4. **Adventure Map**: check new `MainQuest...` group/quest IDs against `data/main-quest-groups.json` and its linked files. **Quests**: check non-main player-useful groups and actual completion/objective quality against the appropriate event/mission JSON, excluding universal handlers. Do not report the raw numeric difference `all Quest Sheet rows minus all Wiki quest rows` as missing.
5. For any included change, validate IDs, source fields, displayed/localized objectives, completion conditions, requirements, rewards and references **before** editing the corresponding real Wiki data. Do not create invented values or unnecessary helper layers.
6. Record uncertain/untranslated content in **Sheets Check** with source, date, issue and follow-up; keep such items out of new public missing-count claims. Do not duplicate already Open tracker entries.
7. Update **`data/version_log.json`** only with grounded details: latest source version observed, audited scope/date, actual confirmed changes, intentionally excluded categories, and unresolved items categorized properly. **Never certify a full sync or close ongoing work without the checks.**

### 6. Audit correction noted 2026-11-10

A preliminary 1.2.2 comparison listed **Quest IDs 325–360** as “missing” by raw numeric range. **That conclusion was premature and is withdrawn as a blanket claim.** The range includes non-main quests (e.g., Old Garrison) plus distinct `MainQuest...` records which must be assessed under **Adventure Map**. Each record requires inclusion/exclusion and description/condition checking first. Also do not equate a pending design log row with completed release content.

This note records audit policy, **not** a verified synchronization of 1.2.1/1.2.2 Wiki content.

## INCREMENTAL AUDIT RULE — 2026-11-10

**Do not redo the full Sheets comparison or ask for scope decisions every time.** Read the permanent checkpoint file `data/wiki_audit_checkpoint.json` **first**, then `data/version_log.json`, this scope document and the private `Sheets Check` tracker. Preserve previously verified categories and known exceptions; work from the last verified or reviewed source snapshot.

- The prior full baseline is the **2026-10-20** targeted/core gameplay audit, with an additional **2026-11-02** source review of 1.2.0. Do **not** treat 2026-11-02 as full 1.2.0 data parity. Read the exact category/field-level checkpoints and pending notes rather than relying on version numbers alone.
- From the last checkpoint, read newer **Ver Log** entries (including **status and completion date**), then inspect only affected gameplay categories/IDs and their linked data. If the source changed without a Ver Log entry, compare the affected category's IDs/fields and explicitly state the limited coverage.
- Any new item must be classified as **synced**, **confirmed change requiring sync**, **known source-retained/public-hidden**, **excluded by policy**, **pending clarification**, or **ongoing documentation**. Do not report intentionally excluded rows or 12 pre-existing title mappings as brand-new differences.
- Record confirmed deltas and before/after values in the private audit checkpoint or log; only promote `lastAuditedGameVersion` or `lastSyncedGameVersion` on actual verified matching coverage. Record which categories were checked, by ID and field, and which were not.
- Maintain old IDs/decisions, including the **Chest 77** naming exception. If source IDs are reassigned, flag conflicts explicitly instead of overwriting a Wiki record on the strength of a title/count comparison.
- **Public Wiki Version Log**: updated/ongoing/excluded concise high-level status; **private audit records**: exact source rows, differences, outstanding localization, excluded records, and prior decisions.

This incremental procedure is a standing instruction for future Isekaimania audit sessions; it does not imply that gameplay data itself was updated on 2026-11-10.
