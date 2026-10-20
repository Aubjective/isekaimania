# Isekaimania Wiki — Content Scope & Source Rules

Last reviewed: 2026-10-20

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
- Named Special Events should remain even when their gameplay objective is derived from event conditions rather than a Quest entry.
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
Keep all twelve named single-stage events even when they have zero attached quests or no exact source title translation: `WhereIsCastle`, `MysteriousOneEye`, `TheVampWarning`, `TheThunderForest`, `TooBrightToStudy`, `PoisonInThePuddle`, `WaterproofingFailure`, `TheGlowingWreckage`, `TracksUnderTheSnow`, `TheSmokingCrate`, `TheAbandonedHerbBasket`, `TheEmptyHuntingCamp`. They are **included**; missing localization is not a reason to hide or delete them. Never invent translated titles. Universal/system events and all dialogues remain excluded.

## ONGOING WORK VS RELEASE READINESS
- **Mechanics documentation** is an ongoing, evolving wiki workstream as gameplay systems change or are confirmed. Do not treat unfinished optional mechanics explanations as a blocker to calling the currently scoped, verified data snapshot up to date.
- **Delivery/presentation work** (layout, navigation, usability, refinements and publishing improvements) is ongoing, separately tracked. It is not a blanket blocker to a verified data-synchronization checkpoint. Actual broken published links or data display are defects and must still be reported.
- For any version claim, distinguish **source data synchronization**, **verified gameplay scope**, **website availability**, and **ongoing documentation/delivery improvements**. Never imply these four are identical.
- Scope remains: dialogues and universal/system Special Events excluded, twelve approved named events kept, Chest ID 77 fixed as `HeartwoodCache`.
