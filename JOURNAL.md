<!-- Tier: JOURNAL. Working notes, findings, provenance, handoffs. Written and pruned freely.
     Never authoritative: treat an entry as a lead to re-verify against the code, not as a reason.
     See global CLAUDE.md. -->

# Journal
## 2026-09-02 — F227.6: the seven small scripts take anchors, and the audit runs clean

49 line citations → 50 anchors from the map (one comma list emits two), 14 of them **text anchors**
— `MASTER.CAS` and `SpellMysticSurge.CAS` define no labels, and each anchor was checked unique in
the shipped file before use — 14 continuations expanded, all seven budget rows lowered to 0.
`--strict` and plain mode are now the same green check: 554 anchors, 139 delegated, 0 unresolved or
malformed, every one of the ten scripts at 0/0. No `@span`, no re-delimiting, no `/N`, no
`PROVENANCE` range into any of the seven. The map is deleted; the builder still runs (`build()`
through its export, 0 entries) and nothing outside itself names it. **F227 is closed.**

Alignment 1.5.12.7 → 1.5.12.9: `MASTER`, `CombatEndTurn`, `SpellMysticSurge` shift 0 (`MASTER` 403
changed in place); `OverlandEndTurn` shift 0 through 996, +21 after; `DisAbil` shift 0 through 355,
+5 from 357, +10 after 3464; `OLSpell` and `COSpell` shift 0 through 180 / 207, +308 after.
1.5.12.6.2 equals 1.5.12.7 for all but `DisAbil` (+10 at 29) and `OLSpell`.

`DisAbil.CAS:840`/`:846` read as 1.5.12.7 — the Artificer Upgrade gate and the Magical Weapon
Artificer arm, where the 6.2 lines are a Magical Weapon `AddAbilityLine` and `ORELEVEL=0` — →
`!NOLOGISTIC!+3` and `+9`, shipped 845 and 851. `OLSpell.CAS:587` is a different statement in each
release; every citing file is 1.5.12.9-numbered and means the Rebuild Mechanical write →
`!NOTMARKOFCONQUEROR!+8`.

**The wide scan** — bare `:N` in any paragraph carrying a `.CAS` mention, plus prose "line N" —
found stragglers across all ten scripts that the audit's heuristic never attributes: five into
`UnitCalcPre` (`:1058`, the 1.5.12.7 True Light block `:1507-1540`, `:30`/`:94` in a spec, Eye of
Heaven "lines 1839-1841", Lucky Star "line 1020" ×2), one into `UnitCalc` (the Sentience tail
`:1305-1306`), `CreateUnit` "lines 412-441" and "line 40" ×2, `DisAbil` "lines 1036-1046" (text
anchor on the section comment — no label within 200 lines), `COSpell` "line 1328", `OverlandEndTurn`
`:425`/`:577` and "line 391". Half came from the review. Left bare on purpose: Pascal, JS, `HELP.TXT`,
`UNITS.INI`, `spells.ini` numbers, and the inventory's `Line` column.

**Left whole, as a decision:** the md5-pinned 1.5.12.7 source-order tables in
`Reference docs/Caster binary/CoM2 binary - unit recalculation.md` §"Warlord regions b and d" —
46 rows and six bullets. The section states its own referent, so its numbers are not stale against
what they cite, and re-pinning is the alternative F227 rejected. Preamble corrected to say the release
is no longer shipped and is recoverable at `2c0fd48^`. Re-deriving it against 1.5.12.9 with
label-bounded rows is its own item, not a citation swap.

Two traps worth keeping. Writing ``(`File.CAS:N`)`` in the audit's own header or in `TESTS.md` is
itself a malformed citation to the audit — the first wording of both went red. And a `| tail` on the
review command masked the audit's exit code, so codex started against a red tree and the harness
timed the pipeline out; the orphaned session finished and wrote the file on its own.

Method A. Review MISS 1 (self-inflicted red) and MISS 2/4 (eight prose "line N" stragglers) accepted;
MISS 3 (convert the md5-pinned tables) rejected as above. Two gaps the audit cannot see — a locator
followed by `/N`, and a bare `:N` or prose "line N" under a `@span` line or bare mention — are the
one part of F227's body worth carrying forward as an item.


## 2026-09-02 — F227.5: `CreateUnit.CAS`'s citations take label anchors

69 line citations → 70 anchors from the map (one comma list emits two), 57 continuations
expanded, budget row lowered to 0. Audit: `CreateUnit.CAS` 0/0, 49 deprecated remain across the
seven small scripts, `--strict` red only on those. No `@span`, no re-delimiting; one statement
shortened to a `'`-free fragment because the Malnourished header's apostrophe broke a
single-quoted `desc:` in `presets_protections_and_weapons.js`.

**Unlike `UnitCalc.CAS`, no head was re-pinned at the landing.** `2c0fd48` touched only `@span` paths
for this script, so heads and continuations alike are 1.5.12.7 numbers. Alignment 1.5.12.7 →
1.5.12.9 is one hunk: 1–49 shift 0, old 50 became 50–52 (the Magic Perimeter gate gained an Evil
Presence term), 51 onward +2. 1.5.12.6.2 is identical to 1.5.12.7 here; the superseded 1.5.12.6 set
has no `CreateUnit.CAS`.

Retargets beyond the map, each hand-verified: `stats_identity.js`'s Sancta Basilica `:414-419`
covered one `STypeID` branch where the prose says two → `!NOFROSTCLUB!+5..+14` (shipped 417–426,
the +3 Resistance write through the second Sanctify write); `stats_sequence.js`'s `SRage` `:375` was
off by one (old 375 is `SMultiLabel`, `SRage` is 376) → `!NOALTAROFTHESUN!+6`. The Basilica block at
shipped lines, for Q30 and F204: 418 `STypeID=108` Monks (Sanctify, Exorcise −1), 424 `=231`
Inquisitors (Sanctify, Exorcise −3), 430 `=111` Crusaders (Lucky), 435 `=113` Paladins (Magic
Immunity), 440 fallthrough; Q30's `:412-441` is the old header-to-label span, shipped 414–443.

**The audit's continuation heuristic has a blind spot.** It sets an antecedent only on a
`File.CAS:N`, `!` or `~` locator, so a bare `:N` under a `@span` provenance line or after a bare
filename mention is attributed to nothing. 28 `CreateUnit.CAS` continuations were of that shape —
11 after mentions in `presets_buildings_and_machines.js`, 17 found only by the review in
`stats_sequence.js` and `stats.js`. A wider any-mention scan now finds no stragglers outside the
inventory's table columns. Left bare on purpose: three `OverlandEndTurn.CAS` lines in
`combat_abilities.js` (F227.6's), a `UNITS.INI` range, and the table columns.

Method A; codex emitted within the ceiling. Both MISS clusters accepted; nothing rejected.


## 2026-09-02 — F227.4: `UnitCalc.CAS`'s citations take label anchors

117 line citations → 119 anchors from the map (two comma lists emit two each), 42 continuations
expanded (40 from the map's rows plus the `:333`/`:498` pair handed off from F227.3), budget row
lowered to 0. Audit: `UnitCalc.CAS` 0/0, 118 deprecated remain across eight scripts, `--strict` red
only on those. No `PROVENANCE sources=` range needed `@span`; provenance and rebind unmoved. One
double-quoted `desc:` re-delimited (the Fortification fixture).

**The continuations were nearly all 1.5.12.7-numbered even beside a 1.5.12.9 head.** `git log -S`
shows the landing commit re-pinned the head citations and left the bare `:N`s. So the map's per-entry
attribution does not transfer to an entry's continuations; each was read against both sets.
Alignment 1.5.12.7 → 1.5.12.9 for this script: 49–334 shift +2, 335–344 gone, 345 onward shift −8.
One `stats.js` comment (Colossal Strength) still carried 1.5.12.6-superseded numbers — Rust 500–512,
Focus Magic 83/515, Weakness 317–323 — recoverable from `b5c97e5^`.

Retargets beyond the map, each hand-verified against the shipped script: the Night Goblin
comment's `:498` names Rust but shipped 498 is the Focus Magic header, so it anchors to Rust's gate
(`!NOTCITY!+11` → 485); Favored Terrain's "doubled branch" `:646-658` narrowed to the IF block
(`!TACTICIANEFFECT!+2..+11`); "Colossal `:1227`" read as the 1.5.12.7 block header (`!NOCOMBAT!+4`);
the mixed-release `550,569-571` anchored to 550 and 561–563 (`!NOAETHERSURGE!+3` and `+14..+16`).
Review added one: the Energy-Weaponry fixture's Outlander gate `1398-1400` was off by one from the
three lines it quotes (→ `!COMBATOVERRIDE!+5..+7`). Left bare on purpose: `stats.js`'s `:1730`,
`:1554`, `:651`, which are `Units.RecalculateUnits.pas` lines the audit's heuristic hangs on a CAS
antecedent, and the inventory's table columns.

Method A; codex emitted within the ceiling. Its one NIT — six blank-ending ranges (Night Goblin ×3,
Rust ×3) carry only a first-line assertion — was not applied: that is the form the map emits and
F227.3 kept, so changing it belongs to F227.6 uniformly or not at all.


## 2026-09-02 — F227.3: `UnitCalcPre.CAS`'s citations take label anchors

151 line citations → 158 anchors from the map (seven comma-list entries emit two each), 23
continuations expanded (22 bare `:N` plus one `/661` the map did not see), budget row lowered to 0.
Audit: `UnitCalcPre.CAS` 0/0, 235 deprecated remain across the nine other scripts, `--strict` red
only on those. No `PROVENANCE` `sources=` list carried a `UnitCalcPre.CAS` line range, so nothing
went to `@span` and no rebind was needed.

The map's `sourceLine`s had drifted in three files edited since F227.2 built it (+72, +24/+61, +40
lines); every entry was paired by citation **string and rank** within its file, none by line number,
and none was unlocatable.

Two retargets beyond the map in one comment. `stats.js`'s `UnitCalcPre.CAS:87` is blank in every
set; the `SETSTAT(U,SRanged,0,…)` it quotes is shipped `:97` → `!NOVAMPIRISM!+19`. Its companion
`:412` was a second bad number nobody had listed — a Righteous Ward line in every set — and the
strayed-branch Transmute Equipment ranged write it describes is shipped `:675` → `!NOSACRED!+18`.
Both confirmed by hand against the script.

The review added four more, each a case where the anchor's quoted statement made an imprecise
original visible: three `:834` citations whose prose names `IF (BASEFANTASTIC(U))` pointed at the
comment line above it (→ `!NOTHERO!+6`), a Breakthrough-grant citation spanning the whole block
(narrowed to the one write, `!NOTTACTICIANHERO!+10`), and a Guardian → Divine Barrier range that
included the Procurator `IF` (→ `+133..+135`). Kept pending the user's yes.

Two things for F227.4–.6. A citation inside a double-quoted JS `desc:` string cannot carry an
anchor's `"` in a form the audit reads, so two strings were re-delimited to single quotes with no
words changed. And 28 bare `:N` the audit's nearest-antecedent heuristic attributes to
`UnitCalcPre.CAS` are misattributions — inventory table columns, and two `UnitCalc.CAS` region-`d`
lines at `stats_sequence.js:1567-1568` (`:333`, `:498`) that F227.4's own map rows do not carry.
Handed off in F227's body.

Method A. First codex run hit the 600 s ceiling after analysis but before emitting; resumed with
`codex exec resume <id>` and it emitted in a minute. Review caught the `/661` dangling locator,
which neither the audit's `:N` heuristic nor its tail check sees — a candidate item.


## 2026-09-02 — F224.2c: Eternal Night's enemy-Resistance arm and Darkness's Death arm on the reader

`isDeathUnitAt` in `stats.js`: `unitInRealmAt(u, 'death')` for `com2_*`, the scalar compare for
DOS. Drives H3 (`$005A22D9`), H6 (`$005A45EF`) and the CoM2 Eternal Night doubling. Darkness's Life
arm, Warlord's Poor Vision (S9) and True Light (S8) are untouched — not in the diff — and F235 is
left open exactly as F224.2a left it.

The finding worth keeping: **the F224.1 reproduction card does not discriminate for these two
consumers.** `c:undead` has already written Death before both blocks fire, so the scalar already
says Death and before equals after on `ccDefense`+`undead`. The recovery arm differs from the
scalar only after ladder block 8's `RCNoHeal` overwrite (`$005A0472`), which `Q31.evidence.md`
predicts — so the discriminating card is `ccDefense`+`undead`+`raiseDead` (or `mysticSurge`). F224.2b
found the same thing independently for the Spell Ward Death arm. The same card *without* Chaos
Channels stays penalised, which is BUG-Q31 reproduced as written.

Measured headlessly on that card (`com2_1.05.11`, atk 5 / def 6 / res 9): with enemy Eternal
Night, res 8 → 10 and the doubled Darkness arm lands (atk 7, def 11); with Darkness alone, atk/def/res
each +1. `com_6.08` byte-identical before and after.

Five fixtures in `presets_ranged_and_haste.js`. Method A; GPT review at
`.reviews/F224.2c.review-of-Claude.md` approved with no findings, having reproduced all five values
headlessly and confirmed the binary's two independent `if`s versus the calculator's if/else-if is
harmless (no modern chain can be scalar-Life and helper-Death at that block). Interrupted by a rate
limit before the review; resumed and run foreground.


## 2026-09-02 — F224.2b: Spell Ward and Node Aura split per arm

The Death and Chaos wards and the Chaos node arm read `unitInRealmAt`; the Nature, Life and
Sorcery wards and the Nature and Sorcery node arms keep the scalar compare, byte-for-byte. The
split is per arm because the binary's is: Spell Ward's Death arm calls `IsDeathUnit` at
`$005A5E0F` and its Chaos arm `IsChaosUnit` at `$005A5E51`, while its other three arms are
`cmp race` (`$005A5D68`, `$005A5DCC`, `$005A5EB0`); Node Aura's `case 3` calls the helper at
`$005A272B` while `case 1`/`case 2` compare the scalar. Life stays scalar on the binary's say-so —
the Q31 loose end that the ladder overwrites Life yet the ward still compares `race` directly —
and the code carries no "overwritten realm ⇒ helper" path.

Two things worth keeping. The value-moving H7 case needs a **post-Undead overwrite** (`raiseDead`
or `mysticSurge`) to show: without a later conversion the scalar already says Death, so the
recovery arm changes nothing. And Chaos Channels ablation is inert in the two ward fixtures **by
coincidence** — its +3 armor cancels the ward's −3 — which the review caught as a false vacuity
claim; both fixtures now declare it inert-by-coincidence with the reasoning.

Measured on the F224.1 card (`com2_1.05.11`, `ccDefense`+`undead`): `spellWard:'chaos'` def 9 →
6, `nodeAura:'chaos'` atk 5 → 7 / def 9 → 11. All three DOS versions unchanged.

Node Aura fixtures are parked in `presets_curses_and_undead.js` this wave because
`presets_ranged_and_haste.js` was F224.2c's. TESTS.md's "154 of 1132" desc-citation recount is
stale by its own regex; re-measured in the authoritative pass after the wave rather than trusting
the agent's 144 of 1146.

Method A. GPT review at `.reviews/F224.2b.review-of-Claude.md` approved the predicate and caught
the vacuity claim; nothing rejected. Interrupted by a rate limit between review and revision;
resumed with the review already on disk.


## 2026-09-01 — F227.2: the CAS citation conversion map

`tools/build_cas_citation_map.js` -> `tools/cas_citation_map.json`, one entry per **occurrence**,
rebuilt in ~30s. 386 in-scope stale line citations: 382 clean, 1 ambiguous, 3 unconvertible. 394
anchors emitted (380 label, 14 text — `MASTER.CAS` and `SpellMysticSurge.CAS`, the two label-less
scripts), all 394 re-resolved through `cas_citation_audit.js`'s own resolver onto the exact lines
the map claims, all via diff alignment with no content-search fallback.

Attribution is by **introduction**: the oldest revision in the current contiguous run of the citing
file that already carries the exact citation string. Not blame — a reflow moves a line without
re-deriving its number — and not first-ever appearance, since one `stats.js` citation was removed
and re-added. 227 by introduction, 159 new in the working tree, 0 falling back to blame. Candidate
sets come from a git-derived timeline (`e17404e` 07-29 adds 1.5.12.6-superseded and 1.5.12.6.2;
`b5c97e5` 08-04 drops the superseded; `b844423` 08-09 adds 1.5.12.7; 1.5.12.9 lands on disk 08-30
20:26, untracked, twenty minutes after the last commit). Newest candidate wins, with one content
narrowing (a candidate reading blank on the first cited line is dropped — 3 occurrences, each
disclosed). Every entry also records what all four sets would give: **139 of 386 are set-independent,
so 247 rest on the attribution and say so.**

Three class-3 findings for F227.3–.6: `UnitCalcPre.CAS:87` is blank in every set, so the citation
never named the `SETSTAT(U,SRanged,0,…)` its own text quotes (the statement is at shipped `:97`);
`CreateUnit.CAS:414-419` starts on a blank line; and `UnitCalc.CAS:550,569-571` is **one comma list
carrying line numbers from two releases** — `550` is a 1.5.12.9 number while `569-571` are
1.5.12.7's, so someone re-pinned the first and not the rest. The single ambiguous case,
`DisAbil.CAS:840`, is decided by its own citing prose in favour of 1.5.12.7, which is what recency
picked anyway.

The map never writes `<script>.CAS` glued to a locator — `script` and `citedLines`/`anchor` are
separate fields — so it is out of the audit's scope **by content rather than by path**, enforced by a
fail-loud self-check that runs the audit's extractor over the serialised JSON before it lands. That
check has already fired, catching a stray locator in a code comment. Chosen over a path exclusion
deliberately: an exclusion would move ~400 strings into the out-of-scope census instead of
eliminating them, and would permit a future map to emit anchors nothing checks.

Operational lesson worth keeping: a build that timed out and was backgrounded completed twenty
minutes later and overwrote the map with pre-fix output, turning the audit red for defects already
fixed in source. Kill superseded background builds.

## 2026-09-01 — F225.2: the DOS gaze's stoning kill is routed to its own bucket

`buildGazeDist` no longer collapses the two kill loops into one joint per-figure probability. It
convolves them independently, and the DOS arms pass `stoningFail = 0` and hand the stoning kill to
`convolveTouchAttacks` as a `stoningGaze` rider with category `irrecoverableDamage`. Both
distributions are built from the same `tAlive`: the DOS loops share one unchanging `Cur_Figures`,
unlike the modern arm where `Dealdamage` runs between the two `ApplyAttack` calls.

The exhaustive sweep is the part worth keeping. 53 DOS gaze presets, 57 (preset, side) pairs, and
**exactly four can reach both kill loops** — the rest are single-loop gazes or type-104 pairs that
deliberately suppress the rolls to isolate the doom component. Three moved and are now pinned;
the fourth, `combinedStoningDeathGaze`, passes at 9.640 under **both** models because its 10 HP clip
absorbs the difference, which its `desc` now states. `combinedStoningDeathGazeUnclipped` (8 figures
x 10 HP, per-loop fail 0.1) publishes 17.000 against 16.20 for a one-charge model and is the fixture
that actually guards the change.

`predefChaosSpawnVsUnicorns` moved 0.929/20.805 -> 0.508/22.209 and was **derived, not observed**:
per-loop fail 0.5 against effective Resistance 9, `N = S + D ~ Binomial(8, 0.5)`, damage `4 + 6N`
clipped at the 24 pool giving `5676/256 = 22.171875`, plus a `0.1029 x 93/256` melee term; survivors
`140/256 = 0.546875` against the old model's exactly 1.0, and retaliation linear in survivors. The
parameters were confirmed independently against the F45 comment's own recorded 68.6% -> 31.6%, which
pins Resistance 9 without reference to any run. F45's defect arm moved with the model (0.260/23.129
-> 0.051/23.814) and the comment now carries the current pair, since the old one is no longer
reproducible by the procedure the note describes.

Two defects the review caught, both fixed in the same change: placement was gated on the gaze being
*active* rather than on the loop being *reached*, so a Stoning-Immune target drew a phantom all-zero
rider; and the kill roll's hover chain stayed on the base-roll slot, rendering a false "scored
against neither" message. `gazeKillProbs` now marks the DOS stoning record with its rider id and
`rowRiderChains` partitions on that mark, leaving modern routing untouched.

A new rider key also needs a `RIDER_LABELS` entry in `ui.js` — `riderDisplayName` throws on an
unlabelled key, so a rendered DOS gaze row would have taken the whole suite red. That file sits
outside the calculation layer and was in no agent's ownership list.


## 2026-09-01 — F227.1: the CAS citation grammar and audit

`Reference docs/CAS citation grammar.md` and `tools/cas_citation_audit.js` land; `TESTS.md` gains
`cas-citations` as scaffolding. Four locators after a `<file>.CAS` token: label anchor (preferred),
text anchor, line list (deprecated), and `@span` delegated to `provenance_audit.js`. An offset must
carry a statement assertion binding the first cited line — without that, an insertion between label
and target moves the citation silently, which is the failure F227 exists to end.

Exit contract is green-today: a line citation is *deprecated* under a **per-script** ceiling rather
than a failure, so deleting a citation from one script cannot pay for a new one in another, and each
of F227.3–.6 has an explicit exit (set its row to 0). `--strict` zeroes every ceiling and is F227.6's
clean-state proof. Chosen over red-by-design because a suite red for the whole of F227.2–.6 conflicts
with the project rule that a failing test is never dismissed.

Every count in the F227 body was confirmed by measurement: 433 line citations (159/126/76/72),
100/95/21 labels, 1915/1659 lines. Not in the body: 141 `@span` citations and 215 bare `:N`
continuations. Of the 433, 389 are in scope; the rest sit in `.reviews/`, `JOURNAL.md` and
`TASKS.md`, counted but not gated.

Two facts that cost time to find. `MASTER.CAS` and `SpellMysticSurge.CAS` define **zero labels**, so
the label anchor alone cannot cover the 16 citations into them — hence the text anchor. And
`UnitCalc.CAS:286-293`, the Mechanical Expert gate cited from `TESTS.md`, is off by two in 1.5.12.9:
the eight `STypeID` lines are 288-295.

The reviewer found that `OLSpell.CAS:587` names three different statements across 1.5.12.6.2,
1.5.12.7 and 1.5.12.9, with `combat_abilities.js:1352` intending the 1.5.12.9 one. F227.2's map
cannot be keyed on `(file, stale line)` alone; carried into F227.2's body as a scope note.

Method A. The GPT review returned "request changes" and found real defects, all adopted: malformed
locators were truncating into valid ones (so `--strict` could never have proved line locators gone),
`@span` delegation was looser than `provenance_audit.js:64` actually accepts, path prefixes silently
fell back to Warlord, and optional statement assertions defeated the point of the offset form. One
point rejected: a space before an offset reads as prose, not a typo, and flagging it would fail
ordinary sentences.

Separately: `npm run provenance` was red through this work from the uncommitted `unitcalc.c`
constant merge (Q18) invalidating the `heavenlyLight` span at `stats_sequence.js:965`. Resolved by
repointing the locator and running `tools/rebind_provenance_anchors.js --write` on the user's
explicit call — the tool's header restricts it to formula-identity moves, and this was a symbol
rename inside cited source, one step outside that scope. Single-key delta; audit back to 295
formulas, 0 UNVERIFIED.


## 2026-09-01 — F224.1: eight helper call sites, and the sweep turned up four more gaps

`Reference docs/Modern realm test inventory.md` is the ruling table. `IsChaosUnit`/`IsDeathUnit`
have exactly eight call sites (`Q31.evidence.md:142-153`), all in `RecalculateUnits`; every other
modern realm test, binary and `.CAS` alike, is a scalar race compare. Seven distinct calculator
consumers need the helper form, past F224's threshold of four, so F224.2 was gated for re-split
into three groups: the membership reader plus the three sites F224 names, then the two mixed-arm
blocks (Spell Ward, Node Aura) where one calculator predicate must split per arm, then the two
Death-side reads (Eternal Night, Darkness) which are `com2_*`-only.

Measured headlessly: `ccDefense`+`undead` in CoM2 makes `spellWard:'chaos'`, `nodeAura:'chaos'`
and `chaosSurge` all inert where the binary fires all three. F224's reproduction confirmed, and
wider than the item stated.

The instructive pair is S8/S9 — True Light and Eternal Night's Poor Vision in Warlord. Where the
script author wanted the flag as well as the realm he wrote both terms out, and the calculator
already carries both. That is what the binary's recovery clause does by hand, and why a
scalar-compare block must not silently acquire one.

Four things the sweep turned up that are not the collapse, each verified against its block:
Exorcise's created-undead penalty carries a `fantastic_death` term no version's block has
(`Combat.ApplyAttack.pas:482-484` is `EncUndead` alone; all three DOS builds are `mutations & 0x20`
alone); `supremeLightActiveForUnit` tests the compact token, so a Life-race hero fails a gate
`U.race = RCLife` passes; `unit.raceNoHeal` has no producer anywhere, and the case it loses is Raise
Dead, not Mystic Surge; and `UnitCalc.CAS:93-98` is an unmodelled region-`d` Sanctify race re-write
that in Warlord would undo a region-`c` conversion.

Loose end that bears on F224.2b: `Q31.evidence.md:171-172`'s own open point. Life *is* overwritten
by ladder block 5 yet Spell Ward still gives it a direct `race` compare, so the recovery reading
explains four of Spell Ward's five arms and not that one. F224.2 therefore cannot generalise
"realm the ladder overwrites ⇒ helper form".

Method A. GPT review at `.reviews/F224.1.review-of-Claude.md` caught the Exorcise omission, a
Mystic-Surge-for-Raise-Dead error, and stale line numbers the agent's own comment edits had
created. All accepted, none rejected.

## 2026-09-01 — F225.1: the DOS gaze kill loops charge twice

Settled by reading WIZARDS.EXE directly. The stoning loop (`0x99D73`-`0x99E0F`) writes
`local_damage[2]` (irreversible) and the death loop (`0x99E11`-`0x99EAE`) writes `local_damage[0]`
(regular). Both are bounded by the defender's `Cur_Figures`, re-read at `0x99E07` and `0x99EA6` and
unmodified between them, and neither loop identifies a figure. A Multiple Gaze (type 104) therefore
charges a defender twice for a figure that fails both rolls. `BU_ApplyDamage` derives kills from the
*sum* of the buckets (`figures_lost = total / hits`, `0x8747E`), so the second charge raises expected
figures killed across the normal range; the clamp at `0x874D3` bites only in overkill. On
`doomGazeChaosSpawn` that is 1.588 expected kills against 1.440 for a one-charge-per-figure model.
The per-bucket split in `bu->damage[]` (capped at 200 each) survives independently and is what
reaches the disposition ladder and healing.

`0x99D73`-`0x99EB0` is byte-identical in all three DOS builds (slice SHA-256 `03B71480...`). The one
neighbouring build difference: MoM 1.31's `jg 0x99ED7` at `0x99ED2` falls through to the epilogue, so
1.31 discards the whole `local_damage` record when `attack_strength <= 0`; CP 1.60 and CoM 1 patched
it to an unconditional jump. Already modelled by `hiddenGazeLevelLadderNeedsStrength`.

Bucket 2 = irreversible confirmed twice downstream: `Battle_Unit_Heal`'s
`healable = UNDEATH + REGULAR` (`0x7FCC5..0x7FCF2` — exclusion by omission, not the subtraction
form, which is Caster's), and `BU_ApplyDamage`'s disposition ladder where irreversible-largest gives
`BUS_GONE` (`0x875B9`). Both `BUS_GONE` comparisons are `>=`, so an equal-charge Multiple-Gaze kill
leaves the unit GONE rather than DEAD. Not modelled; post-combat disposition is out of scope.

Both loops read the same attacker byte `Spec_Att_Attrib` and differ only in the realm argument
(0 = Nature, 4 = Death), so the modifier is shared but the two fail probabilities still differ via
realm-specific defender resistance. Do not collapse them.

`buildGazeDist`'s `jointFail` is a plain faithfulness defect, not a recorded deviation: its stated
reason is true of the figure count and false of the damage record, which is what the calculator
publishes. Ruling and evidence:
`Reference docs/DOS reconstructed/F225.1 gaze kill adjudication.md`.

Fixture consequence: `combinedStoningDeathGaze` stays at 9.640 because the 10 HP clip absorbs the
difference, so it is *not* a guard on F225.2; `doomGazeChaosSpawn` moves 11.133 -> 11.716.

Method A. GPT review at `.reviews/F225.1.review-of-Claude.md` caught the 1.31 `attack_strength`
qualification and a PRNG-independence overclaim; both folded in.


## 2026-09-01 — Q18: the CoM 1 `0x97` unit-type ceiling is the normal/fantastic cut

Settled by decoding the CoM 1 unit-type table rather than by reading more code. The compared value
is a base unit type — a raw index into the `0x24`-stride table at `DS:0x019C`, not a roster id — so
the `units_mom.js` `id = index + 1` convention that generated the doubt never applied. Row `0x98`
is `Boars` (race byte `0x10`, Nature) and every row from there
to the table's last, `0xC5` `Nagas`, carries a realm, so `type < 0x97` is "normal unit" with the
cut one row low: it also drops `0x97`, the last of six `Settlers` rows.

Two rounds of undercounting before this landed. First pass I reported five consumer sites when my
own byte scan had returned fifteen and I only wrote up the ones I recognised; second pass I found
23 by sweeping more encodings; the review found the 24th, `0x5C269`, which compares a word stack
local and so is invisible to any `es:[bx+5]` pattern. Lesson worth keeping: when a scan returns N
hits, write up N or say why not — recognising a subset is not a census, and "I scanned every
encoding" is a claim that needs the sweep to be built from the decoder, not from patterns I
thought of.

`0x5C269` turned out to be the best evidence in the item and it inverted a claim I had made twice.
The bytes `[0x5C240,0x5C274)` are identical across all three builds except one immediate: `0x9A` in
1.31/CP, `0x97` in CoM 1. So the ceiling is **not** a CoM 1 addition — it is a MoM constant that
CoM retargeted. 1.31 has 11 sites at `0x9A` and CP has 11; CoM 1 has none, and 24 at `0x97`. Since
`0x9A` is exactly 1.31's first fantastic row, the gate was *correct* in 1.31, and CoM's retarget to
`0x97` undershot its own new boundary (`0x98`) by one. That converts "one row low" from an
observation into a demonstrated regression, and it explains where D37's wrong name came from:
`UNITTYPE_MAGIC_SPIRIT_BOUND` is right for 1.31's `0x9A` and wrong for CoM 1's `0x97`.

The reviewer's finding 9 ("this ceiling is CoM 1-only") is wrong in the same way mine was — they
swept the earlier builds for `0x97` and concluded the concept was absent, when it is the value that
is CoM-only. Worth remembering that a cross-build absence check has to sweep for the *homolog*,
not the constant.

Other real corrections from the review, all accepted: "admits `type < 0x97`" was too strong as a
universal (13 `jae`, 9 `jb`, 2 `jl`, no `jbe`/`jle` — the durable claim is that every site
partitions strictly at `0x97`, while which arm matters is local); `0x5C269` is a second signed word
compare, so "only `0x97656`" was false; and four sites (`0x7358E`, `0x7365A`, `0x9D27B`,
`0x9D290`) take the type from a **lair record** guard slot (`DS:[0x9CC0]`, stride `0x18`,
`+0x05`/`+0x07`) rather than `_UNITS`.

The alignment came from the Tweaker export's `Nr` column, which is the binary index outright —
its six `Settlers` rows sit on the six binary `Settlers` indices. That is a cheaper alignment
method than name-matching stat columns and is worth reaching for first next time.

Two loose ends I did not chase, neither of which moves the answer. Whether type `0x97` is
reachable at all in CoM 1 is open: CoM 1 rewrote its race byte from `0x0D` to `0x00` and five of
the six `Settlers` rows now read `0x00`, so race is no longer the settler selector. And the
engine has a *different*, exact normal-unit predicate — `unit_types[type].race < 0x0F`, used at
`0x5FD12` and `0x60900` — which the four ceiling sites do not use.

Written to `R6.1a.evidence.md` (semantics) and `MoM binary analysis.md` (table extent and
alignment). `UNITTYPE_MAGIC_SPIRIT_BOUND` in `combat.c`/D37 was simply wrong — `0x9A` is Magic
Spirit — and `unitcalc.c` carried two names for the same byte; all four are now
`COM1_UNITTYPE_NORMAL_CEILING`. Both `.c` renames were kept line-count-neutral because
`Calculator/combat.js` cites `combat.c:<line>`.

## 2026-09-01 — The post-combat block states a composition, and doing so exposed three gaps

User's decision, replacing the three magnitudes the block used to show. The magnitudes were
misleading because the accumulators are uncapped by design: a Destruction success books a flat 150
against a unit whose whole pool is 40, so the block read "75.000" beside a damage figure of 20.

**Why a composition is the right thing to show.** `Combatheal` defines healable damage as
`Totaldamage - Irrecoverabledamage` and never decrements the irrecoverable figure, and it removes
plain normal damage before undead damage
([Combat.DamageHandling.pas:80-95](Reference%20docs/Caster%20binary/Combat.DamageHandling.pas:80)).
So the split says how much of a wound is permanent, how much is healed last, and how much is
ordinary — which is a live question for the wounded survivor that most combats produce, where the
magnitudes said nothing useful.

User ruled two choices explicitly: the denominator is the **accumulated** categories, not the
capped damage figure above the block (they coincide for a survivor and diverge only on overkill);
and the percentages are a **ratio of means**, not the mean of per-path ratios.

### What the display now rests on, and where that is thin

The three categories partition the record's total in both families — modern derives regular as
`total - irrecoverable - undead` and `normalizeCombatHealState` clamps the other two so it cannot
go negative; the DOS record stores its own regular byte and derives the total by summing them.
Probed both.

The weak point is not the arithmetic, it is the **coverage of the category routing**. Where the
calculator does not route a category, the block does not report an absence — it reports the wound
as wholly regular, which reads as a measurement. So the display promoted three previously harmless
gaps into wrong answers. `runRiderHistogramChecks` now places every rider that writes a non-normal
bucket and asserts its category arrives.

| Gap | Status |
|---|---|
| A DOS gaze carries the touch group, so a Stoning Touch on the ranged record reached the irrecoverable bucket while `trackModernHealing` was false | **Fixed** — the gate gained `aStoningWithGaze \|\| bStoningWithGaze`, and a fixture pins it; removing the term makes that check fail |
| The DOS stoning gaze's own kill books regular damage; `combat.c:4419` writes `local_damage[2]`, the irreversible bucket | **Open, not fixed** — number-moving through DOS combat healing |
| Create Undead routes the whole ordinary roll into the undead bucket (`Combat.ApplyAttack.pas:624`); the calculator omits the flag | **Open, not fixed** — the omission was justified by it moving no displayed number, and this readout is that number |

The DOS bucket indices were read off the source rather than inferred: index 1 is the Create Undead
branch and index 0 its else arm ([combat.c:4934](Reference%20docs/DOS%20reconstructed/combat.c:4934)),
which fixes 0 = regular, 1 = undead, 2 = irreversible.

### Review round (Method A, `codex exec` GPT 5.6 Sol)

Six findings. Two were the gaps above — it disproved the "no non-normal category can be written on
a numeric joint" claim my code carried as a comment, with a concrete input for each, and that
comment is now rewritten to say what is actually checked and what is not. Two presentation defects
were real and fixed: three equal shares printed 33.3 each for 99.9%, so the largest share now
absorbs the rounding residue; and "Damage taken: none" could sit beside a positive damage figure
when Life Steal healed the wound away, so it reads "Damage remaining: none".

Its DOS-saturation finding is **not** a defect: `BU_ApplyDamage` saturates each stored byte at 200,
so a saturated record is what the engine holds, and the user's denominator is what the record
holds. Its capped-versus-uncapped weighting finding is real but unreachable — it needs a target
that starts with non-regular damage, which no control exposes.

## 2026-09-01 — F222 correction: the cap belongs at the phase boundary, not inside it

The user's correction of the F222 run. The ruling F222.1 wrote said damage is not truncated
**inside** a combat phase; F222.2 read that as no truncation at all and removed the cap on what a
phase *publishes* too. The result was phase-total and combat-total histograms running past the
target's remaining HP — a Destruction row reading 150 against a 12-HP unit, "% HP" readouts over
100%. Two things came out of one instruction.

### Where the cap went back, and where it stayed out

| Quantity | Capped? |
|---|---|
| Rider accumulators on the outcome (`outcome.riders`) | **No** — user's explicit ruling |
| The three category accumulators, and the combat-healing state | **No** |
| `convolveTouchAttacks` and everything under it in `engine.js` | **No** |
| A phase's published marginal (`marginal`, `marginalA/B`, `fsMarginal`, `counterMarginal`, `secondMarginal`) | **Yes** |
| `aDamageTaken` / `bDamageTaken`, which is all `totalDmgToA/B` is | **Yes** |
| The joint cumulative-damage coordinate | Yes, as before |

`shownDamage(damage, cap)` in `combat_state.js` is the single clip, applied on the way out of a
phase and nowhere earlier. The cap is the HP the target had *entering* that phase —
`healingStateRemainingHp(targetState)` on the healing paths, so an intervening Life Steal that
restored capacity is respected — and the two Haste second-strike arms take the post-first-strike
capacity rather than the capacity entering the block. The ranged volley has no joint traversal to
clip it, so it clips its own published total through `clipDistAtRemainingHp`.

Keeping the internal accumulators uncapped is not a compromise: it is what makes category
attribution order-independent, which is the one real correctness gain F222.2 had. `Dealdamage`
(`Combat.DamageHandling.pas:134`) does `Inc(Totaldamage, irrec + undead + normal)` with no clamp
anywhere, so uncapped state is also the engine-faithful half. The clip is presentation.

**The consequence to know:** riders no longer sum to their phase total. They *bound* it. In an
overkill cell the rider values sum past the published figure, and that is what overkill now means
in this build. `tools/unit_checks/phases.js` had asserted the equality; it now asserts the bound
plus "the published total stops at the target's remaining HP", which is the half that would have
caught this in the first place.

### Every number F222.2 moved came back on its own

All 21 preset expectations recomputed to their pre-F222 values exactly, without touching a
formula — which is the measurement that says the cap is back in the right place and nothing else
moved with it. `bloodsuckerCapAtRemHPWarlord` got its name back for the same reason: the clamp it
names exists again, at the phase boundary.

Two spec fixtures went back too. `life-steal-healing.spec.js`'s F57 regains its 100-HP defender
and its clipped-maximum discriminator, so the fixture-input change that run made to a
**regression** suite is undone. `modern-riders.spec.js`'s F26 keeps its flat-150 assertions
against `convolveTouchAttacks` — correct, that is inside the phase — and re-aims the two that
read `totalDmgToB` at the clipped bin.

### The review round found two more, one of them pre-existing

Method A, `codex exec` GPT 5.6 Sol, one round. It confirmed the clip's placement everywhere else
— no leak into the rider tallies, the category accumulators or `applyOutcomeDamageToState`, and
both second-strike arms already on the post-first-strike capacity.

1. **The counter read A's capacity from before the strike that healed it.** `capA` is taken from
   `path.aState` at the top of the cell, but A's own First Strike can heal it (Life Steal,
   Bloodsucker) and the counter lands after that heal — `Combatheal` runs inside the strike's own
   `ApplyAttack` (`Combat.ApplyAttack.pas:511`; DOS `combat.c:4672`, before the counter call at
   `:3992`). With the clip in place that under-reported the counter. Both FS blocks now derive
   `capAAfterFs` / `aAliveAfterFs` from `postFsPath.aState`, which is what
   `applySimultaneousPairWithHealing` already did for its own counter target and what the same
   blocks already did for `capBAfterFs`. The two fall-through arms keep `capA`: no strike precedes
   their counter.
2. **A published distribution summing to zero, and it predates all of this.** CoM 1 omits the
   Haste repeat against a top figure above 24 HP; the plain (non-healing) arm of
   `applyFsBlockHaste` dropped that mass instead of folding it in, so the row's `secondMarginal`
   stayed `[0]` — an INV-1 violation on a distribution the breakdown draws. `git show HEAD` has
   the same gap, so it is not this run's, but it is a spec invariant and the healing arm two
   hundred lines up already folds at damage 0, so it is fixed here rather than filed.
   `phaseDistSums` in `tools/unit_checks/phases.js` now asserts every published phase
   distribution is a PMF; removing the one-line fold makes it fail with "expected 1, got 0",
   which is the check this needed all along.

Its third finding was fair and is why the partition assertion exists: the bound alone survives a
rider marginal read at the wrong probability weight, because the other riders still clear the
published total. `assertRidersPartitionTotal` asserts the equality on a rider set that cannot
overkill, in both engine families, which is the case where the clip is the identity and the
equality still holds.

### The rider panels were in the wrong column

Second half of the correction, and an independent defect. `phaseRiderRows` tagged every rider
with the right `side` and the panel title read "Poison Touch → defender", but `renderRiderPanels`
laid the band out as one wrapping grid under both phase panels, so the first rider took the left
slot whoever it damaged. A defender's Poison Touch was drawn under "Mean damage to attacker". The
band is now two columns on the same tracks and gap as `.breakdown-phase-panels`, each rider in the
column of the unit whose HP it is, both columns always emitted so a one-sided phase still leaves
the other column under its own unit. `tests/rider-histograms-f222.spec.js` pins it by geometry —
each rider panel's horizontal centre must fall inside its own side's phase panel — rather than by
class name, so a later layout change cannot pass it by accident.

## 2026-09-01 — F222.5: the chain rides out of the query, and three slots were scored against nothing

### The shape

A rider histogram's hover chain is a record the query that produced its number built:
`{ quantity: 'resistance' | 'defense', realm, trace }`, where `trace` is `projectStatTrace`'s
ordinary projection. `riderResistanceQuery` (`combat_effects.js`) makes one call and hands back
both the figure and the projection of the trace that call recorded — there is no second reading
of the sequence anywhere, which is the whole reason F222.5 sits after F223. `fillDefenseChain`
does the same for the two EffectiveDefense routines.

`projectStatTrace` gained `options.baseId` because these two sequences seed from the record's own
Resistance or Defense rather than from zero. A seed that writes nothing but the base drops out; a
seed that writes more than it — City Walls into the modern EffectiveDefense, the DOS Vertigo
subtraction — stays as the transform it is, which is why those two steps carry explicit
`sourceLabel`s.

Chains are opt-in (`opts.riderChains`, set only by `recalculate()`). The matrix draws no
histogram and allocates no trace array; the coverage asserts that rather than assuming it.

### The realm is in the header, and so is the subject

`Effective Resistance (defender) vs Nature`. Both halves are load-bearing, and the second was not
in the plan. Driving the page found `Life Steal healing → attacker` showing a chain built from the
*defender's* Resistance, which read as a chain about the attacker. Every chain on a row is about
that direction's target, so `phaseRiderRows` states `chainSubject` and the heading names it.

Measured on one CoM2 defender in one attack: Nature 17, Death 18, Chaos 18, realm-less 8. Two of
the four are the same number under different questions and one is the record's own untouched
Resistance — a chain without its realm cannot be read.

### Three riders were being shown a Defense that produced nothing

The review round found these; all three are fixed, and each fix names the rule once.

- **A gaze row.** Only a gaze's conventional component is scored against Defense, and Black Sleep
  turns even that into Doom damage. A pure kill or Doom gaze consults none.
  `gazeConsultsDefense` (`combat_special_attacks.js`) is now the rule, read by `buildGazeDist`
  itself and by the row's chain gate.
- **Immolation.** The modern spell path returns before reading Defense on Magic Immunity and
  turns into Doom damage under Black Sleep. `damageSpellArm` classifies the cast, is dispatched
  on by `calcDamageSpellDist`, and `damageSpellConsultsDefense` is what the chain gate asks.
- **A Doom melee/thrown/ranged slot**, which was already suppressed before the review.

Nothing here moves a number: all four predicates are read by the computation and by the chain.

### An immunity-skipped gaze kill roll no longer shows a chain

F223 left open that a rider's resistance step is gated on the rider being *present*, not on the
engine *reaching* the roll, and named F222.5 as where that would surface. For the touch group it
does not: `touchParams.placed` applies the seven `*ReachesRoll` predicates and a panel exists
only for a placed rider, so `placed` is a subset of the step's `when` and no unreached roll has a
histogram to hang a chain on. The **gaze** group was the exception — the base-roll slot always
draws — and against Stoning Immunity it showed a Nature chain for a roll `ApplyAttack` skips.
`gazeKillProbs` now withholds those two chains behind the same predicates the fail probabilities
read; `deathGazeFailProb` was routed through `deathTouchReachesRoll` so the immunity pair has one
home rather than two copies.

**F222.2's journal entry overstates the fix it recorded.** It says the seven predicates are read
"by both the step's gate and the fail function". They are read by the *placement map* and the
fail function; the resistance steps' `when` still asks only presence. The query is still made for
a roll the engine never attempts — F223's open item stands as written — but nothing renders it.

### What a zero-probability rider shows

The same chain, unchanged. R5 draws it with all its mass at 0, and the chain is what makes the
zero readable: `stoningHighRes` shows Resistance 13 against a −3 save, i.e. the figure the roll
had to beat. That is different from an immunity-skipped roll, which shows no chain at all,
because there was no call.

### Known gap, not fixed: the DOS marker steps are invisible in their own chain

`Battle_Unit_Defense_Special` carries two values — a running defense and a `defenseSpecial`
marker — and the immunity steps write the marker, not the defense. Projected onto
`effectiveDefense`, a Magic-Immune DOS defender's chain reads
`Defense Special (phase attackSpecific): 4 → 50` with no line naming Magic Immunity. Modern has a
milder version: the six immunity assignments are one step, labelled `Immunities`. Both are the
step granularity the sequences were transcribed at, so closing either means splitting steps and
moving `STEP_VERSION_SCOPES` rows — number-neutral but wide. Presented rather than done.

### Cause Fear is out of scope and stays out

The five realms the item names are covered (Death appears twice), but Cause Fear's own Death
query is not rendered: a `mode: 'feared'` row carries no `riders` key and therefore no rider
panel, by F222.4's design. Hanging a chain there means attaching to the row's two ordinary phase
panels, which is a different attachment path.

### Verified by driving the page, not only by tests

Modern CoM2 with four rider realms at once (Nature/Death/Chaos/realm-less), plus Life Steal's
two histograms; MoM 1.31 and CP 1.60 with Dispel Evil / Stoning / Death / Poison and a City-Walls
melee chain reading `Editable base: 5 | Vertigo: 5 → 4 | City Walls: 4 → 7`; a modern gaze pair
showing one kill roll each and no Defense; Immolation rolled (Bless +5 on the Chaos-realm spell)
and Immolation under Magic Immunity showing the stated no-roll line; `stoningHighRes` drawing all
its mass at 0 with its chain intact; and long-press at 375px on a rider name inside a scrolling
histogram, which shows the overlay inside the viewport and dismisses on the next tap. No console
errors in any case.

### Review round (Method A, `codex exec` GPT 5.6 Sol, one round)

Five findings. Four acted on: the gaze immunity skip, the gaze Defense chain, the Immolation
Defense chain, and the DOS City-Walls append (one expression now produces both the returned
figure and the chain's last line, so they cannot diverge). The fifth, that the coverage cannot
*establish* the same-path property, is true and unfixable by assertion — the same shape F222.3
recorded for R4. The check was strengthened to the strongest available necessary condition: the
chain's entry ids, their order and their running values must equal an independently traced run of
the same query, so a reconstruction would have to reproduce this version's step list exactly.

Its Cause Fear finding is the scope decision above, declined with the reason.

### Coverage

`runRiderChainChecks` (`tools/unit_checks/phases.js`), 15,938 assertions total (was 15,555): the
five realms in one modern attack and their distinctness, the realm table against both engine
families, chain continuity and endpoint on both, no cross-family step in either, no chain without
a request, the gaze row's single kill roll, the immunity-skipped gaze, the kill/Doom gaze
carrying no Defense against a DOS conventional gaze that does, Immolation's three arms, and the
DOS City-Walls entry appearing exactly once. Page-side, `modifier-trace-tooltips.spec.js` pins the
heading vocabulary and the bookends and `touch-tooltips.spec.js` the long-press path.

## 2026-09-01 — F222.4: the rider band wraps, never collapses, and two rows had to start existing

### The layout decision

Rider panels flow in a wrapping grid beneath the row's two existing panels:
`repeat(auto-fill, minmax(min(220px, 100%), 1fr))`. 220px is the width of one of the phase row's
own panels inside the fixed results column (`--two-panel-width` = 250px×2 + 1.5rem), so the band
is 2-up at desktop and 1-up on a phone, matching the phase panels' column count at every width
with no breakpoint of its own. `min(220px, 100%)` is load-bearing: a bare `minmax(220px, 1fr)`
auto-fill track overflows a container narrower than 220px and would scroll the page sideways,
which `mobile-layout` forbids.

**Collapse was rejected, and the reason is R5.** The omission-versus-all-zero distinction is only
readable when the panels are on screen; behind a disclosure it reintroduces exactly the ambiguity
the rule exists to prevent. Riders are made subordinate by rank instead — smaller type, denser
padding, a 170px scroll cap against the phase panels' 300px, a left rule and a `Riders (n)`
caption. Measured worst case: 13 synthetic panels render as a 1659px band at any desktop width;
the realistic maximum is 12 (all nine damage riders plus a counter slot and the two heals).

### Two rows that had to start existing, or the feature is invisible where it matters most

- **A plain unhasted melee emitted no phase row at all.** `breakdown.length > 0 || aHaste ||
  bCounterHaste` was the whole gate, so `phases` came back `null` and a Stoning-Touch attacker in
  the commonest matchup in the tool showed no rider histogram anywhere. The gate now also fires on
  `meleeCarriesRider` — a rider other than the two base `melee` slots. A row carrying only the
  base slots is still suppressed, deliberately: its two histograms are the two top-level panels
  restated. `renderBreakdownGrid`'s matching `phases.length <= 1` early return got the same
  exception.
- **The ranged volley has no rows to hang anything on** (`phases: null`, riders at the top level).
  `renderRangedRiderGrid` gives it the grid to itself under a `Rider breakdown` heading.

### `melee` is one key and needs five names, so the resolver states them

`melee` is the base-roll slot in every phase, and a simultaneous row carries **two** of them —
`riders=[stoningTouch:def, poison:def, melee:def, melee:atk]` on a melee+counter row. Parsing the
row's `label` for the name is not viable: `appendBreakdownTouchLabels` joins rider names with the
same `' + '` separator. So each breakdown row now carries `attackLabels: { def?, atk? }`, and the
five `*BreakdownLabel` builders compose their heading out of the same
`thrownAttackName` / `gazeLabel` / `meleeAttackName` / `secondStrikeAttackName` /
`counterAttackName` helpers, so heading and panel cannot drift. A `melee` slot on a side with no
name halts (`riderDisplayName`), which is why the coverage below asserts the field across every
phase shape in every version rather than sampling.

### Verified by driving the page, not only by tests

Nine matchups through the real controls at 1500px, 1000px and 375px, plus a synthetic 13-rider
row. No horizontal page scroll at any width; no console errors. What the cases showed: a CoM2
Destruction rider drawing 250% of the target's HP (overkill displayed, not clipped); MoM 1.31
Thrown and melee rows each naming their own base roll; a Warlord multi-channel row naming
"Lightning Breath" and "Fire Breath" in their own rows; `stoningHighRes` drawing an all-zero
Stoning Touch panel; `magicImmunityPoisonTouch` + the DOS Stoning flag drawing Poison and
omitting Stoning from the same grid; Wall of Fire drawing no band at all; and the ranged volley's
band naming its slot "Ranged".

Two rendering defects only the page showed: the 170px window opens scrolled to the mean, so the
column headings scrolled away (now `position: sticky`, `z-index: 2` — `.chance-text` lifts itself
to 1 to clear its own bar), and `colHeader: 'HP healed'` wrapped to two lines in the 50px value
column (now `Healed`).

### Review round (Method A, `codex exec` GPT 5.6 Sol, one round)

Eight findings; five acted on, three rejected with reasons.

Acted on: the scroll container was keyboard-inaccessible (only a container that actually overflows
now becomes a tab stop, labelled from its own header, with a `:focus-visible` outline — WCAG
2.1.1); `--muted` (#999) on `--panel` (#2d3561) is ~4.0:1 and both new labels used it (they take
`--text`; the pre-existing uses elsewhere are untouched); the new spec covered no ranged mode, a
weak off-axis assertion that only read the column heading, and no attack-label coverage beyond
Thrown/Melee/Counter — the last is now a resolver-side battery in `runRiderHistogramChecks`
across eight phase shapes × five versions plus the volley (15,365 → 15,555 assertions), which is
where the gap actually lived.

Rejected:

- *"Base-only melee riders are still omitted."* Deliberate, as above: that row's two panels are
  the two top-level panels restated.
- *`renderDistPanel`'s `dist[maxD] < 1e-10` tail trim breaks the no-truncation rule.* It trims a
  trailing run of bins below 1e-10 from the **display** only; `expected` sums the whole array and
  the resolver's distribution is untouched. Pre-existing and shared with every other panel.
- *No heading semantics / table captions.* The substantive half (an accessible name on each
  scrollable histogram) is fixed above. Making only the rider caption a heading would be
  inconsistent with `.breakdown-heading` and `.breakdown-phase-label`, which are plain divs; that
  is a page-wide question, not a rider one.

### Knock-on correction, worth knowing

The phase panels' "% HP" denominator was `figs × hpPerFigure`, not the target's remaining HP. Both
they and the rider panels now pass `leadFigureRemainingHp(remHP, perFig, figs)`, derived from the
row's own numbers, so the denominator and the figure-kill ticks are right for a pre-damaged
target. Visible only when a unit starts with damage; no preset moved.

### What F222.5 gets

Each rider histogram is a `.dist-panel.rider-panel` inside `.breakdown-rider-panels`, carrying
`data-rider-key`, `data-rider-side` and `data-rider-quantity`, with the rider's name in a
`.rider-name` span inside `.dist-header`. That span is the hook for the effective-resistance and
effective-defense chain; the dataset gives the realm query its subject without re-deriving it.
The row's own `attackLabels[side]` names the base-roll slot.

## 2026-09-01 — F222.3: the DOS side already emitted; what it needed was proof and one closed question

### The finding that made this a short subtask

F222.2's machinery is engine-family agnostic in fact, not just in intent. Probed across all three
DOS builds and every DOS-reachable phase — melee, counter, Thrown, both Breaths through the
shared slot, attacker and defender gaze, First Strike and its CoM 1 fall-through, the ranged
volley — the ruled shape was already coming out: correct keys, correct sides, `dispelEvil` in the
two MoM builds and `exorcise` in CoM 1, no `destruction` anywhere, every histogram a valid PMF,
and the riders summing exactly to their phase total on both sides. **No calculation code
changed.** What F222.3 adds is the coverage that pins it, one closed evidence question, and three
corrected comments.

### The question F223 left open is answered, and the answer is "the DOS gate is hoisted"

F223 recorded that the DOS blocks at `combat.c:4603` and `:4628` test only Stoning/Death Immunity
while `stoningFailProb` / `deathTouchFailProb` apply a Magic-Immunity gate in every version, and
asked whether the calculator over-tests. It does not. The DOS rider group **opens** with
`!(_battle_units[du].Attribs_1 & USA_IMMUNITY_MAGIC)` at `131:0x99F67`, and its false arm jumps to
`0x9A1E6` — past Dispel Evil, Stoning Touch, Death Touch, Life Steal *and* Destruction together.
Caster.exe spells the same test five times inside the individual rider conditions
(`Combat.ApplyAttack.pas:477`, `:491`, `:499`, `:507`, `:519`); the DOS builds hoist it once. Both
families therefore skip the same five blocks, which is why one set of `*ReachesRoll` predicates
serves both. Poison is outside the gate in both — DOS at `0x9A2D8` behind `USA_IMMUNITY_POISON`
alone, Caster at `:526` with no `magicimmunity` term — and `poisonReachesRoll` matches. The
reachability header in `combat_special_attacks.js` now carries this; it is the single home.

Under R5 this is load-bearing rather than cosmetic: a Magic-Immune DOS defender must draw *no*
panel for those five, not five all-zero ones, and the check now asserts exactly that alongside
Poison still drawing.

### DOS Destruction is compiled, not modelled

All three DOS builds compile an `ATT_DESTRUCTION` block (`combat.c:4684`: `local_damage[2] += hits`
in MoM/CP, a flat 100 in CoM 1). The sole writer of the flag is `BU_Apply_Item_Attack_Specials`
(`unitcalc.c:1488`, `IP_DESTRUCTION` at `131:0x8E550`) — an item power, and hero equipment is
deferred by SPEC. So no DOS unit the calculator can build carries it, which is what TASKS `M3`
records and what makes `destructionInVersion` a **modelling** scope. F222.2's comment there said
Destruction "is only ever rolled by Caster.exe", which the reconstruction contradicts; corrected,
with the warning that widening the predicate before F41 lands would draw a panel no DOS matchup
can reach.

### `TOUCH_RIDER_KEYS` is a display order, and said it was an execution order

Immolation is dealt before the per-figure loop (`Combat.ApplyAttack.pas:378`, `combat.c:4353`) and
Bloodsucker once after it closes (`:631`), so neither is "in the order the per-figure loop runs
them". Nor is the list universal: the DOS builds generate conventional damage before entering
Poison (`combat.c:4733`, `:4892`) where Caster runs Poison before its own roll. Only the six
middle entries are an engine order, and `convolveTouchAttacks` does not compute in list order
either. Comment corrected; nothing reads the order as a computation order, because the buckets
are additive and Destruction's assignment is resolved as a joint rather than by list position.

### Coverage added (`tools/unit_checks/phases.js`)

`runRiderHistogramChecks` gained a DOS block per version: Thrown + melee rows, the DOS gaze row
(which exercises `gazeTouchParams`' narrowed placement map — the thing F222.2 handed over as
believed-right-but-untested), the ranged volley's top-level array against `totalDmgToB`, a
single-figure Life Steal fixture for the source-side `lifeStealHeal` histogram and the DOS healing
record, a 30-HP-figure First Strike fixture for the `isCoM1Only` fall-through arm, and both halves
of R5. INV-1 is asserted as a real PMF test — every bin finite and in [0,1], then the sum —
because a sum-only test admits a negative bin against an oversized one and `NaN` slips through any
`Math.abs(x − y) > eps` comparison. R1 is asserted twice per side: the means agree *and* the phase
total's maximum equals the sum of its riders' maxima, which a rider read at the wrong probability
weight and a rider dealt against the wrong HP scale fail separately.

### The review round (Method A, `codex exec` GPT 5.6 Sol, one round)

It confirmed the two evidence findings above independently, found no tally-weight defect across
every DOS-reachable applicator arm, no double-tallied rider, and no surviving within-phase
truncation. Six of its eight findings were about the new checks being weak rather than wrong —
sum-only INV-1, no volley PMF/sum check, an inert-rider assertion that would accept extra mass in
later bins, a comment claiming First-Strike coverage the fixtures did not have, and no DOS Life
Steal coverage at all — and all six are fixed above. Its `TOUCH_RIDER_KEYS` finding is the comment
correction above.

Its remaining finding is that mean-equality does not *establish* R4, only fail loudly when R4 is
broken by weighting. That is true and unfixed: per path the riders sum to the damage exactly, so
the sum's marginal is not the convolution of the rider marginals and no distribution-level
identity is available to assert. The two equalities are necessary conditions, not a proof.

### One defect found, deliberately not fixed: modern Exorcise ignores Spell Lock

`exorciseReachesRoll` (`combat_special_attacks.js`) exempts Spell Lock only for `com_6.08`, but
`Combat.ApplyAttack.pas:477` tests `not Units[du].EnchantmentFlags[EncSpellLock]` unconditionally.
The reviewer built a reachable modern carrier: the strayed Warlord Wanderer takes `spellLock`
(`stats_identity.js:772`) and can be made Fantastic through Animate Dead / Undead, at which point
the calculator rolls Exorcise against a target the engine skips — an R5 violation *and* a moved
number. It is **pre-existing**, not F222.2's: the `com_6.08`-only test is what `exorciseFailProb`
carried before F222.2 moved it into the predicate. Out of F222.3's scope, on the modern side, and
it moves numbers, so it is presented rather than fixed.

### Two things measured in passing, neither acted on

- **The DOS hasted-melee hang is pre-existing.** A `mom_1.31` attacker with Death Touch + Life
  Steal + Haste takes **209 s** for one `resolveCombat`; the same case on `HEAD` (before F222.2)
  takes **189 s**. `repeatTouchAttack` squares an unmerged outcome list per joint cell, and the
  DOS drain is wide. F222.2's accumulators cost about 11%, not the two orders of magnitude
  separating this from the modern path's 1.2 s.
- **`dosChannelTouchModifier` (`combat_phases.js`) is dead code.** It returns 0 unless
  `self.touchFlagRecords[record][key]` is set, and `touchFlagRecords` is written only by
  `applyWarlordTouchFlagPlacement`, which returns early for every non-Warlord version. So the
  DOS `channel_attack_flags` −1 / −3 Stoning/Death modifiers (`combat.c`, the
  `channel_attack_flags & ATT_STONING_TOUCH` tests) never apply. Fixing it moves numbers.

### What F222.4 gets

`phase.riders` is `[{ key, side, quantity, dist }]` on every damage row in every version;
`mode: 'feared'` rows carry no `riders` key at all, and a phase every path skipped (the target
already dead) emits an empty array. DOS keys: `immolation`, `dispelEvil` (MoM 1.31 / CP 1.60) or
`exorcise` (CoM 1), `stoningTouch`, `deathTouch`, `lifeSteal`, `poison`, `melee`, plus source-side
`lifeStealHeal`. Never `destruction`, never `bloodsucker` / `bloodsuckerHeal` — those two are
Warlord's. The ranged volley carries the same array at the top level as `result.riders`. Wall of
Fire is not an `ApplyAttack` call and emits no riders in any version; its row's single
distribution is the whole story.

## 2026-09-01 — F195: Spell Ward is a realm test, and the item's own witness was wrong

### The block

`$005A5D36..$005A607F` (`Units.RecalculateUnits.pas`) is a settlement-index guard over five realm
arms and nothing else: `U.race = 16` (Nature), `U.race = 19` (Life), `IsDeathUnit(i)`,
`IsChaosUnit(i)`, `U.race = 17` (Sorcery), each paired with its own city byte, and Q31 shows the
two classifiers are `(race = RCChaos) or (ChaosChannel and EncUndead)` and its `RCDeath` twin.
No Fantastic test anywhere. `spellWardActive` (`stats.js`) lost its live-Fantastic term.

Node Aura's block, `$005A25F0`, is the same shape and had the same term removed earlier; its
`nodeAuraNonFantastic` / `nodeAuraNonFantasticNatureCoM2` presets are the pattern the three new
Spell Ward presets follow.

### The TASKS body named a case that was already correct

F195 justified the removal with Spirit Link: "a spirit-linked Death or Chaos creature is warded by
the block and not by the calculator". Probed against the code, that unit **was already warded**.
`d:spiritLink` clears Fantastic in region d and `c:spellWard` stands in region c, so the flag is
still set where the step reads it — which is what the comment the change replaced said in as many
words. The item's witness and the item's fix pointed in opposite directions.

The term was reachable through a different door: units the recalculation gives a realm *without*
making them Fantastic. Two classes, both live:

- **Realm-tagged non-Fantastic heroes in the roster.** `units_com2.js` #34 Chosen (Torin), race
  Life; `units_warlord.js` #29 Black Knight (Mortu) and #32 Necromancer (Ravashack), race Death,
  #33 Everchosen, race Chaos, #34 Avatar, race Life. All `baseFantastic: false`.
- **A Sanctified non-clergy Warlord unit.** `b:sanctify` writes `u.race = 'Life'` and only sets
  Fantastic for clergy non-heroes, so a sanctified hero or non-clergy unit carries the Life realm
  with the flag clear.

Before the change all five ward arms were inert for these; after, all five fire, while a
realm-less unit and a wrong-realm ward stay inert.

### Two things found in passing, neither touched

- **The Q31 recovery clause is unmodelled.** A Chaos-Channelled undead unit is `IsDeathUnit` *and*
  `IsChaosUnit` in the binary — `race` carries only the last conversion, and the
  `ChaosChannel and EncUndead` arm recovers the destroyed `RCChaos`. `unitRealmAt` returns one
  realm, so a Chaos ward is inert against it (probed: `ccDefense` + `undead` + `spellWard:'chaos'`
  does not fire, `spellWard:'death'` does). Independent of F195 — the old Fantastic term was not
  what blocked it. Fixing it means a realm *set* rather than a scalar, which also touches Node
  Aura, Chaos Surge, Blazing Eyes and Eternal Night. **Filed as F224** on 2026-09-01, which found
  the scope is wider than the ward: `IsChaosUnit` has three different calculator spellings
  (`unitRealmAt(u) === 'chaos'`, and the compact token twice), two of which also demand Fantastic.
- **CoM 1's `realmWardActive` carries the same `u.fantastic` term, and correctly so.** Read during
  the review round: `unitcalc.c:3966-3975` gates on `bu->race != rt_Fantastic_No_Realm &&
  bu->race > RACE_FIRST_FANTASTIC`, a race-range test that in CoM 1's encoding *is* the fantastic
  realms. Not the same defect; the term stays, and `realmWardActive` now says why.

### Review round (`codex exec`, `.reviews/F195.review-of-Claude.md`)

Confirmed the removal against the block, Q31 and the routine's outer filters, and confirmed the
TASKS witness is wrong by an independent probe. Three revisions taken: the comment and tooltip
said "realm test alone" / "applies only to", which overstates what Q31 proves given the
unmodelled recovery clause, and now say "no Fantastic condition" / "applies to"; coverage gained
a To-Hit assertion and the two hero cases, since the hero path reaches the ward only through
`realmOfUnitType`'s live-identity fallback.

One finding not acted on: `tools/unit_checks/identity_record_choice.js:75-86` repeats the EncMagic
address, the result-field rationale and the rank-sampling rule that `stats.js`'s `identitySamples`
comment now owns. Pre-existing duplication, surfaced rather than edited in two places.

### Dead code removed with it

`fantasticAtModernEncMagicRule` had exactly two consumers; Spell Ward was one, and the other
(`modernEncMagicIndependentOfMaterial`) reads `identityAtRank('c:chaosSurge').fantastic` inline.
The helper and its comment are gone, and the block extent `$005A1217..$005A1271` that only that
comment carried moved to the `identitySamples` comment, which is now the rule's single home.

## 2026-08-31 — F222.2: riders ride the outcome, the caps are gone, and Destruction assigns 150

### Shape emitted

Each breakdown row now carries `riders: [{ key, side, quantity, dist }]`, ordered by the engine's
per-figure loop. `side` is the panel column (`atk`/`def`), `quantity` is `targetHp` for the shared
HP axis and `sourceHp` for Life Steal's healing. The ranged result, which resolves without a
joint, carries the same array at the top level. Keys: `immolation`, `exorcise`, `dispelEvil`,
`stoningTouch`, `deathTouch`, `lifeSteal`, `destruction`, `poison`, `melee`, `bloodsucker`, plus
source-side `lifeStealHeal` and `bloodsuckerHeal`.

`melee` is the base-roll slot in every phase, so in a gaze row it carries the gaze's own damage
(physical component + doom + kill rolls). That is the ruling's key set taken literally; F222.4 can
label the slot per phase.

### Where the marginal is read

Per-phase, in the same traversal and at the same probability weight the phase's existing damage
`marginal` uses (`newRiderTally`/`tallyRider*`/`finishRiderTally`, `combat_state.js`). Rider
totals are **not** added to `healingPathKey`. The journal's F222.1 wording asked for that; doing it
would multiply the joint's per-cell path count by the product of the rider value ranges, and
nothing reads a cross-phase cumulative rider total — F222.4 renders per-phase rows. The per-phase
accumulation is still a marginal read of the joint: for every incoming path (probability p) and
every outcome (probability q) it books p·q at that outcome's rider value.

INV-1 holds per rider: a path that skipped the phase carries no accumulator, so `finishRiderTally`
folds `1 − Σ` in at 0.

### Presence

`touchParams` now returns a `placed` map — `fires && the rider is on this phase's attack record` —
threaded into every touch spec and read by `touchRidersPresent`. Two consequences worth knowing:

- **An immune target draws nothing, a merely resistant one draws an all-zero histogram.** The
  first version of this shipped the immune case as an all-zero histogram and recorded it as a
  deviation; the review round overturned that (see below). Reachability is now a named predicate
  per rider.
- **Destruction needed its own version predicate.** `TOUCH_KEY_SCOPE_IDS.destruction` is `null`
  (all versions) because placement is the same everywhere; only the *roll* is Caster-only, inside
  `destructionFailProb`. Placing the key off the ability alone would have drawn a Destruction
  panel in MoM. `destructionInVersion(version)` now sits beside `destructionFailProb` and both
  read it.
- **Poison places on strength, not on key presence.** The DOS shared-byte marshalling gives an
  unchecked Poison Touch the value 0 rather than `null`, so `values.poison != null` would have
  drawn an empty Poison panel on every DOS phase row. `ApplyAttack`'s own block tests
  `aflags.poisonvalue > 0`, which is the test used.

### Destruction: both findings confirmed against the binary

`Combat.ApplyAttack.pas:519-523` — `Result.field_00 := 150`, an assignment at `$005B2DC2`, inside
the per-figure loop and after that figure's Exorcise and Stoning Touch blocks. So:

- a success discards every irrecoverable HP booked so far in the same `ApplyAttack`;
- figures after the last success accumulate on top of the 150;
- 150 is a flat constant, unrelated to the target.

`calcIrrecoverableRiderOutcomes` (`engine.js`) enumerates that exactly: no success, probability
`(1−pd)^N`, all N figures' kills stand; otherwise the last success sits `m` figures from the end
with probability `pd·(1−pd)^m` and only those `m` figures contribute alongside the 150. The three
irrecoverable riders resolve as one joint whenever Destruction is placed, and as independent
addends otherwise.

### What the removal of the caps moved

21 of 1134 presets. For **every one**, clipping the new distribution back at the target's
remaining HP reproduces the old expectation exactly — measured, not argued — so the only change is
that overkill is now displayed.

| Preset | Before | After | Arithmetic |
|---|---|---|---|
| `stoningGazeBasic` | 8.060 | 8.300 | 0.8×10 stoning + 0.3 physical, no longer sharing a 10-HP cap |
| `stoningGazeMultiFig` | 12.261 | 12.300 | 4×0.6×5 + 0.3; the clipped 0.6⁴×0.3 comes back |
| `stoningGazeBilateral` | 1.612 / 8.060 | 1.660 / 8.300 | B's 20% survival × 8.30 |
| `combinedStoningDeathGaze` | 9.640 | 10.600 | doom 1 always lands beside the 0.96×10 kill |
| `hiddenGazeStoningKillsPerDefenderFigure` | 20 | 22 | 20 kill + the physical 2 |
| `doomGazeKill` | 10 | 12 | doom 12 against a 10-HP pool |
| `doomGazeChaosSpawn` | 11.133 | 11.200 | 4 + 4×0.36×5 |
| `hasteGazeNotDoubled` | 8.060 | 8.300 | control for `stoningGazeBasic` |
| `righteousnessStoningGazeNotBlocked` | 8.060 | 8.300 | control for `stoningGazeBasic` |
| `bloodsuckerCapAtRemHPWarlord` → `bloodsuckerOverkillPastRemHPWarlord` | 6.000 | 7.000 | 5 + 2 against a 6-HP target |
| `destructionWholeUnitCoM2` | 20.000 | 75.000 | 0.5 × 150 |
| `destructionPerAttackerFigureCoM2` | 37.500 | 140.625 | 0.9375 × 150 |
| `destructionSaveModifierCoM2` | 32.000 | 120.000 | 0.8 × 150 |
| `destructionRangedMagicCoM2` / `…Warlord` | 20.000 | 75.000 | 0.5 × 150 |
| `destructionBlessCoM2` | 12.000 | 45.000 | 0.3 × 150 |
| `destructionBlessWarlord` | 16.000 | 60.000 | 0.4 × 150 |
| `destructionDeathImmunityNoProtectionCoM2` | 20.000 | 75.000 | 0.5 × 150 |
| `energyCannonDestructionWarlord` | 7.000 | 105.000 | 0.7 × 150 |
| `predefLongbowmenVsOrcSpears` | 3.929 | 3.937 | overkill past the 8-HP pool |
| `predefChaosSpawnVsUnicorns` | 20.805 | 22.070 | overkill past the 24-HP pool |

The Bloodsucker fixture's key was renamed because its old name asserted the clamp the ruling
removes; `test_tree.js` was updated with it.

Four spec files needed call-site or expectation work beyond the parameter removals:

- `life-steal-healing.spec.js`'s F28 case now asserts that the damage distribution *equals* the
  raw drain distribution, which is what "the drain is not truncated" means once the damage is not
  either.
- Its F57 case lost its discriminator: the CoM 24-HP First-Strike suppression used to be visible
  only as a difference in the clipped maximum damage to A, which was an artefact of the clamp.
  The fixture's defender dropped from 100 HP to 25 (still above the 24-HP threshold, so CoM still
  suppresses) so that A's 21..30 drain kills it 70% of the time; the claim is now the mean damage
  to A, 4.5 with First Strike in the MoM builds against 15 in CoM 6.08.
- `modern-riders.spec.js`'s F26 case reads the 150 payload rather than the target's HP.
- `wall-of-fire-f36-f40.spec.js`'s reference implementation sizes its axis from the spell's own
  maximum.

### Cost

Measured, not guessed.

- A 40×40 Warlord melee matrix: **832 µs/cell**, largest outcome list seen **19**. The matrix
  suite is unchanged (11.4 s for six tests).
- The pathological rider stack the F222.1 entry warned about is real but **pre-existing**: a
  CoM2 attacker carrying Poison 3 + Stoning + Death + Exorcise + Destruction + Life Steal, two
  figures, against a four-figure Fantastic Death defender takes **39.6 s** for one
  `resolveCombat` after the change and **48.2 s** before it (measured on the stashed tree). So
  the rider accumulators did not make it worse — the destruction joint replaced three
  independent addends and paid for them — but `addDamage`'s unmerged cross product remains a
  latent hang for a unit nobody ships. No roster unit reaches it.

A keyed merge inside `addDamage` was considered and rejected: with per-rider accumulators on the
outcome, two paths that reach the same total damage differ in their rider vectors, so the merge
would deduplicate nothing and only cost the key construction.

### The review round changed four things

Method A, `codex exec` GPT 5.6 Sol, one round. It confirmed the Destruction joint against
`Combat.ApplyAttack.pas:477-523` line by line, found no surviving truncation, no rider/total
conservation error and no stale caller, and re-derived four of the moved preset numbers. Its four
findings, all acted on:

1. **R5 was genuinely broken for an immunity that skips the block.** The placement gate deviation
   this entry originally recorded was not defensible: a Magic-Immune defender drew empty Stoning
   Touch and Destruction panels, and the engine does not reach those rolls at all
   (`Combat.ApplyAttack.pas:491`, `:519`). Fixed rather than deviated from. Each rider's
   reachability is now a named predicate — `poisonReachesRoll`, `stoningTouchReachesRoll`,
   `deathTouchReachesRoll`, `lifeStealReachesRoll`, `dispelEvilReachesRoll`,
   `exorciseReachesRoll`, `destructionReachesRoll` — read by both its own `*FailProb` and the
   placement map, so the immunity test has one home. `fantasticResistKillFailProb` lost its own
   Magic Immunity branch to the two callers' predicates, and `dispelEvilPenalty` was split out so
   the realm eligibility could be asked without computing a probability. A resistance the roll
   cannot beat still emits, at zero; that half was already pinned and the immunity half now is
   too. The proposal filed against `CLAUDE.md`'s *Deliberate deviations* is withdrawn.

   This is also the answer to F223's open item for the touch group: naming the predicate once is
   what that entry said the fix required, and these seven are it. The `when` gates on the rider
   resistance steps still ask only whether the rider is placed, so F222.5 can narrow them to the
   same predicates without inventing anything.

2. **Three tooltips promised the caps this change removes.** `abilities.js`: Life Steal said
   "Target damage is capped by remaining HP", Destruction said "Any failed attempt destroys the
   whole target unit", Blood Sucker said its damage lands "before target rendering caps
   overkill". All three now state the uncapped behaviour, and Destruction's states the
   assignment.

Moving the new predicates also moved two `STAT-FORMULA`/`PROVENANCE` markers off the function
they name — `npm run provenance` caught it as an orphan marker, which is what that check is for.
The helpers sit above their formula's comment block instead.

### Left for F222.3 / F222.4

The tally machinery in `combat_state.js` is engine-family agnostic and already runs on the DOS
blocks (`applyDamagePhase`, `applySimultaneousPair`, `applyFsBlock*` plain variants), so F222.3
extends it rather than rewriting it: what it has to add is the DOS placement map on the gaze path
(`gazeTouchParams` currently narrows `touchParams`' map by the `*With` gate, which is right but
untested for DOS) and the rider-set difference (no `destruction`, `dispelEvil` for `exorcise`).
F222.4 renders `phase.riders`; nothing in `ui*.js` was touched.

## 2026-08-31 — Q31 reconstructed: `IsChaosUnit` is realm-plus-recovery, and the defect is in `IsDeathUnit`

Method B, three routines, `$00594FE4..$0059511F` (315 bytes). Merged evidence in
`Reference docs/Caster binary/Q31.evidence.md`; that file owns the result. Notes here are the
things the evidence doc does not carry.

**The compiled predicate.** `IsChaosUnit = (race = RCChaos) or (ChaosChannel and EncUndead)`, on the
calculated record. `ChaosChannel = EncCCArmor or EncCCFlight or EncCCBreath`. `IsDeathUnit` is the
same with `RCDeath`.

**Why the tail is not a defect.** `race` is one scalar the ladder overwrites repeatedly. Chaos
Channels writes `RCChaos`; if the unit is also undead, a later block overwrites it with `RCDeath`.
The conjunction recovers exactly the units whose `RCChaos` write was destroyed. Both agents first
called it a clone-and-edit defect and both revised after reading the ladder's write order — the
defect reading is what you get from the three routines alone, and it is wrong.

**Process notes for the next Method B run.**

- The extent was three routines, not one. `IsChaosUnit` alone is not derivable: the callee and the
  byte-identical sibling are both load-bearing for the answer. Sizing the extent by the named
  symbol would have produced a confident wrong answer.
- **Neither derivation could settle the question from its assigned extent.** The answer came from
  `RecalculateUnits`, outside it. What produced it was asking the *review* round a question neither
  derivation had raised. Worth repeating: the cross-review is not only an error check.
- I launched the two revisions concurrently, and Claude re-read `Q31.GPT.md` mid-revision while GPT
  rewrote it twice. No damage — the revision's real input is the other agent's *review*, both review
  files were stable, and Claude noticed the change and re-verified. The fix is not snapshot
  machinery (my first instinct, and wrong): the other agent's derivation is simply not an input to
  the revision round, having already been read during the review round. Saying that in the prompt
  rules the read out and leaves the two revisions safely concurrent. Proposal filed.
- My brief said the extent was 323 bytes. It is 315 (`$68+$68+$6B = $13B`). Both agents caught it
  independently. The per-routine extents were right, so nothing downstream moved.

**Open, and deliberately not acted on.** The calculator's four `IsChaosUnit` sites, `BUG-Q31`, and
the stale `IsChaosUnit` framing in `CoM2 binary - unit recalculation.md` §Spell Ward are all
presented to the user, not changed. F195 is unblocked but not touched.

## 2026-08-31 — F191 closed: the strip-only Rust state stays unexposed

Ruled by the user: do not expose Warlord Rust's "materials stripped, no stat penalty" state. The
single `rust` control keeps meaning both halves landed, which is what SPEC's cast-curse rule already
gives; the ruling is only that the intermediate state is not worth its own control. F191 deleted from
`TASKS.md`, and the priority list renumbered from row 5 down. Filed as a *Deliberate deviations*
addition in `PROPOSALS.md` so the collapsed control is not later read as a defect.

## 2026-08-31 — F222.1 ruled: nothing is truncated inside a phase, and every rider plots uncapped HP

Deliverable of F222.1: the ruling and the shape F222.2/F222.3 must emit. No code.

### What the engine actually accumulates

`ApplyAttack` returns a three-field record, not a number — `irrecoverable` +$00, `undead` +$04,
`normal` +$08 ([Combat.PerformAttacks.pas:27](Reference%20docs/Caster%20binary/Combat.PerformAttacks.pas:27)).
Every rider writes into one of the three; the ordinary attack roll accumulates in a local
`TotalDamage` and is deposited into one bucket after the per-figure loop closes.

| Rider | Rolls | Per success | Bucket | `Combat.ApplyAttack.pas` |
|---|---|---|---|---|
| Cause Fear | one per **attacking** figure, before the loop | removes one attacking figure | none | `:251` |
| Immolation | one `DamageSpell`, melee only | a whole three-bucket record, `AddDamage`d in | all three | `:378` |
| Death Gaze | one per **defending** figure | `HpPerFigure(du)` | normal | `:386` |
| Stoning Gaze | one per **defending** figure | `HpPerFigure(du)` | irrecoverable | `:405` |
| Exorcise | one per attacking figure | `HpPerFigure(du)` | irrecoverable | `:477` |
| Stoning Touch | one per attacking figure | `HpPerFigure(du)` | irrecoverable | `:491` |
| Death Touch | one per attacking figure | `HpPerFigure(du)` | normal | `:499` |
| Life Steal | one per attacking figure | roll result `i` HP, and `Combatheal(au, i)` | undead | `:507` |
| Destruction | one per attacking figure | `field_00 := 150` — an **assignment** | irrecoverable | `:519` |
| Poison | `poisonvalue` rolls per attacking figure | 1 | `TotalDamage` | `:526` |
| Melee / Doom | one per attacking figure | `dam2` after blur, defense, invulnerability | normal, or undead under Create Undead | `:543`, `:554` |
| Bloodsucker | once, after the loop, if anything landed at all | flat `BloodsuckerDamage` | normal | `:633` |

Three properties of that loop decide the ruling:

- **Nothing is capped, anywhere.** Not in `ApplyAttack`, not in `Dealdamage`
  ([Combat.DamageHandling.pas:134](Reference%20docs/Caster%20binary/Combat.DamageHandling.pas:134)),
  which does `Inc(BaseUnits[u].Totaldamage, irrec + undead + normal)` and then tests
  `HpPerFigure(u) * figures <= Totaldamage` for death. Overkill accumulates and is ignored.
- **Riders and the attack roll never meet inside `ApplyAttack`.** They are added only downstream,
  by `Dealdamage`. The three buckets partition every HP the attack produced, so per-rider HP sums
  exactly to the phase total — a property that only holds while both are uncapped.
- **Rider kills are already denominated in HP.** The engine's unit for "one figure killed" is
  `HpPerFigure(du)`. Figures-killed is derived; HP is the primitive.

The DOS engines have the same shape — three separate accumulators, no cap; Stoning Touch is
`local_damage[2] += hits` at [combat.c:4616](Reference%20docs/DOS%20reconstructed/combat.c:4616).

### The ruling

**R1 — one axis, and its unit is HP.** Every rider that writes into one of the three damage
buckets plots on a single shared HP axis: Poison, Stoning / Death / Dispel Evil / Exorcise Touch,
Stoning and Death Gaze, Destruction, Immolation, Life Steal's drain, Bloodsucker's damage, and the
ordinary melee / ranged / breath / thrown roll. No rider gets its own unit. Figures-killed is a
derived label (`hp ÷ HpPerFigure(target)`), not a second emitted quantity — the resolver emits HP
and F222.4 may add a secondary figure tick to the axis.

**R2 — two riders are off that axis, and stay off it.** Cause Fear removes attacking figures
before any roll and writes to no bucket; its quantity is figures removed, and it keeps the
`fearSamples` histogram it already emits. Life Steal's *healing* is a source-side quantity the
engine keeps somewhere else entirely (`Combatheal`, not `field_04`); Life Steal therefore gets two
histograms in its row — drain on the shared target-HP axis, heal on a source-HP axis — because they
are two different numbers, not two views of one.

**R3 — no truncation inside a phase.** The within-phase caps come out. Uncapped is what the engine
computes, and it is the only regime in which R1's per-rider values sum to the phase total. What is
removed is *truncation*; remaining-HP as an engine input stays.

Removed:

| Site | Today | After |
|---|---|---|
| [combat_fear_and_touch.js:181](Calculator/combat_fear_and_touch.js:181) `addDamage` | `Math.min(cap, outcome.damage + damage)` | plain addition |
| `addDamage`'s category write | `outcome[category] + cappedDamage - outcome.damage` | `outcome[category] + damage` |
| [combat_fear_and_touch.js:266](Calculator/combat_fear_and_touch.js:266) `collapseTouchOutcomes` | `new Array(cap + 1)` | sized from observed max, as `outcomeMetricDist` already does |
| [engine.js:651](Calculator/engine.js:651) `calcFigureKillDmgDist` | `Math.min(k * defHP, cap)` | `k * defHP` |
| `calcTotalDamageDist`'s `remHP` truncation | clipped at `remHP` | natural maximum |
| Life Steal and Bloodsucker folds | `Math.min(cap, …)`, `Math.min(cap - outcome.damage, …)` | plain |

Kept, because these read remaining HP as engine state rather than as a clamp:

- `woundedTopFigHP(remHP, hp)` ([combat_abilities.js:53](Calculator/combat_abilities.js:53)) — the
  partially-damaged top figure, i.e. `topfdam` at `Combat.ApplyAttack.pas:605`.
- The `cap <= 0` early exit in `applyDamagePhaseWithHealing`, which mirrors the engine's dead/zero-figure gates.
- The joint grid coordinate, `Math.min(targetCum + outcome.damage, targetTotalRemHP)`
  ([combat_state.js:323](Calculator/combat_state.js:323)). This is a bucketing axis and must stay
  finite; it is not a clamp on any value anyone reads.

The parameter currently called `cap` should be renamed `remHP` at the same time — it is doing two
jobs under one name, and that is what made the truncation look like engine behaviour.

**R4 — the marginal is a read of the joint, never a separate computation.** Each rider accumulator
becomes a field on the existing outcome/healing path and is threaded through the same traversal
that already carries `aRawDrain` and `aDamageTaken`
([combat_state.js:53](Calculator/combat_state.js:53)). The histogram is
`jointMetricDist(joint, key)` — the identical mechanism `aRawDrain` uses today, which sizes itself
from the observed maximum and therefore needs no cap to exist. No rider distribution is ever
computed standalone and convolved into a total. INV-1 holds because there is still exactly one
distribution: the joint, with per-path accumulators hanging off it.

**R5 — an inert rider is omitted, and omission keys off the gate, not off the values.** A rider
whose gate is false for this matchup — no attack flag, target immune, version does not have it —
emits no key and draws nothing; ten blank panels per phase row is not a UI. A rider that is *on*
but landed with probability zero **does** draw, with all mass at 0. INV-2 is satisfied by the
gate being the same version-gated predicate the resolver already evaluates: a rider a version does
not have never emits, so nothing hidden can move a number. The failure mode the rule exists to
prevent is inferring omission from an all-zero histogram, which would make "immune" and "absent"
indistinguishable to the reader.

### Shape F222.2 and F222.3 must emit

Per outcome path, a map of uncapped HP keyed by rider id, alongside the existing per-category
totals:

```
riders: {
  melee: 9, stoningTouch: 10, poison: 3, ...   // HP dealt to the phase target, uncapped
}
```

carried target-side the way `aDamageTaken` / `bDamageTaken` are, and merged in `healingPathKey`.
Source-side keys (`lifeStealHeal`) ride with the existing `aHealedDamage` group. Gate presence is
emitted separately from value — a `ridersPresent` set on the phase result, so R5's omission rule
reads the gate rather than the histogram.

Keys are the rider ids already in `touchSpec` (`poison`, `stoningTouch`, `deathTouch`,
`dispelEvil`, `exorcise`, `destruction`, `lifeSteal`, `immolation`, `bloodsucker`) plus `melee`
for the ordinary roll. F222.3's DOS set drops `destruction` and renames `exorcise` to `dispelEvil`.

### Consequences, and the one that changes an existing display

**The total damage histograms change.** `bDamageTaken` becomes genuinely uncapped, and
[combat.js:1085](Calculator/combat.js:1085) already prefers it over the capped marginal. A
four-figure Stoning Touch attacker against a 12-HP defender will show mass out past 30. This is the
price of riders that sum to their total, and it is honest to `Totaldamage`, but it is the one place
the ruling moves a number a user sees today. Lethality reporting is unaffected — `aDestroyPct` /
`bDestroyPct` read the healing state, not the dist.

**Category attribution stops being order-dependent.** Today the surplus in an overkill cell is
charged to whichever contributor was folded in last, because `addDamage` writes
`cappedDamage - outcome.damage`. Constructed case: cap 10, melee rolls 9, Stoning kills two 5-HP
figures. Binary: `normal = 9`, `irrec = 10`, and `Dealdamage`'s classification
(`irrec >= undead and irrec >= normal`) marks the unit irrecoverable. Calculator today:
`irrec = 1`, not irrecoverable. Uncapping fixes this as a side effect.

**Outcome-list growth is the real cost.** `addDamage` pushes `|outcomes| × |riderDist|` entries
with no keyed merge; widening `|riderDist|` multiplies through. `collapseTouchOutcomes` only
collapses at the end, and `addHealingPath` only merges once the path reaches the joint. F222.2
should budget for a keyed merge inside `addDamage` rather than discovering it as a hang.

### Two Destruction findings this turned up, not filed

Both land on F222.2 and neither is in F222.1's scope.

1. **`Result.field_00 := 150` is an assignment, not `Inc`** (`Combat.ApplyAttack.pas:523`). A
   Destruction success inside the per-figure loop **discards** whatever irrecoverable HP Exorcise
   and Stoning Touch had accumulated so far in the same `ApplyAttack`. A later figure's Stoning
   success then `Inc`s on top of 150. The calculator adds Destruction as an independent addend
   ([combat_fear_and_touch.js:210](Calculator/combat_fear_and_touch.js:210)) and models neither the
   overwrite nor the ordering.
2. **150 is a flat constant, not the target's remaining HP.** `calcUnitKillDmgDist(pFail, cap)`
   ([engine.js:668](Calculator/engine.js:668)) uses `cap` as the *payload*, so under R3 this rider
   has nothing to fall back to — it needs the constant. Uncapping without fixing it would silently
   leave Destruction dealing whatever `cap` last happened to be.

### Filed as proposals

Two lines to `CLAUDE.md` — the no-truncation rule under Architecture, and R1/R2's unit rule, since
F222.2 and F222.3 are separate runs that must emit the same shape and the journal is not
authoritative.

## 2026-08-31 - F223: the resistance cross product is gone; each rider asks its own query

`buildResistanceContext` and its `PROVENANCE[resolutionResistanceContext]` are deleted. In their
place, `Calculator/combat_effects.js` carries six ordered step lists under "Per-roll resistance
queries (F223)" - touch / fear / gazeKill, one pair per engine family - and
`resistanceQueries(group, target, version, values, fires)` dispatches by `startsWith('com2')`.

**Rider order and realm, read off the sources rather than assumed.**

| Rider | Caster.exe | DOS |
|---|---|---|
| Dispel Evil / Exorcise | Life, `Combat.ApplyAttack.pas:485` | Life, `combat.c:4556` (MoM arm) / `:4590` (CoM 1 arm) |
| Stoning Touch | Nature, `:494` | Nature, `combat.c:4617` |
| Death Touch | Death, `:502` | Death, `combat.c:4641` |
| Life Steal | Death, `:511` | Death, `combat.c:4672` |
| Destruction | Chaos, `:521` | Chaos, `combat.c:4686` |
| Poison | realm 0, `:533` | `sbr_NONE`, `combat.c:4905` (CoM 1 pushes -1 for both realm and modifier) |
| Cause Fear | Death, `:258` | Death, `combat.c:2266`/`:2270` |
| Gaze kill rolls | Stoning then Death, `Combat.PerformAttacks.pas:157`/`:172` | Stoning then Death, `combat.c:4414`/`:4438` |

**The gaze kill rolls are not riders, and the first naming said they were.** A kill gaze is its own
`ApplyAttack` call — `PerformAttacks` dispatches `ATStoningGaze` (8) and `ATDeathGaze` (7)
separately, and the shared dispatch arm sets `atk := 0` (`Combat.ApplyAttack.pas:314-324`), so the
per-figure resistance roll is the whole call rather than something riding one. Nothing rides on
them either: types 6..8 jump past all six touch-rider blocks. The DOS pair is the same — gated on
the selected attack's `ranged_type` being a gaze, so it is the gaze's own effect there too; what
genuinely rides a DOS gaze is the *touch* group, because `BU_ProcessAttack` merges its ranged flag
record into every non-melee call. The four steps are therefore `gazeKillResistance:*` and
`dosGazeKillResistance:*`, the group key is `gazeKill`, and the runner is `resistanceQueries`
rather than `riderResistances` — two of its three groups are riders, one is not. Cause Fear keeps
the rider name: it runs inside the `ATMelee` arm at `:251-265` and modifies that exchange.

The touch-rider order is identical in the two families, and so is the gaze order. `ApplyAttack`
lays its Death-Gaze block out *before* its Stoning-Gaze block, and reading that as an execution
order was wrong: `at` selects exactly one of the two per call, so the layout says nothing about
which is dealt first. The order is the caller's, and `PerformAttacks` deals Stoning then Death
for the attacker group and again for the defender group. Both modern gaze steps therefore cite
the caller alongside the `ApplyAttack` block that supplies the realm. The GPT review round caught
this; the first version of the list had the two the wrong way round.

**Dispel Evil and Exorcise are one slot.** `combat.c:4537` is one `ATT_DISPEL_EVIL` block whose
MoM/CP arm and CoM 1 arm are the two builds' names for the same Life-realm roll, and Caster.exe
has the same slot under the Exorcise name. So one step (`lifeRider`) makes one query and both
fail-probability formulas read it. Which name a build gives the flag stays in
`TOUCH_KEY_SCOPE_IDS` -> `COMBAT_VERSION_SCOPES`; the new `STEP_VERSION_SCOPES` rows say only
which engine family makes the call, which is why they are `SCOPE_MODERN` / `SCOPE_DOS` and not a
second copy of the per-key scope.

**What the old shape hid.** `needsAgainst` gated the modern arm on *ability presence*, while the
consumers gate on *activity*: a unit with a Death Gaze ability that is not active would have been
handed the target's raw `res` and, had `gazeKillProbs` ever consumed it, would have rolled against
an unmodified figure. No path reaches that today - the activity flags require the ability - so no
number moves, but the new shape cannot express it at all.

**Cost.** Measured in the node context (Warlord, target with Bless/Resist Magic/Resist Elements):
one `effectiveResistance` is 0.77 us; a touch group with no rider present is **0.34 us** against
the old fixed ten-query cross product's **6.9 us** per attack; a touch group with all six riders
present is 4.7 us. The common case is an order of magnitude cheaper and the pathological case -
every rider on both sides in all seven phases - is about 40 us against 7.7 us, roughly 0.7 s
across a full 150x150 matrix that no roster can actually populate.

`lifeStealRes` now travels on the touch params rather than being threaded from the cross product,
so the drain margin comes from the same query the roll used. It is `null` when the rider did not
fire; the only consumer (`combat_fear_and_touch.js:217-219`) reads it under `lifeStealMod != null`,
which is the same predicate the step fires on.

**The review round (Method A, `codex exec` GPT 5.6) changed three more things.** The modern gaze
order above; the deletion of a dead thrown destructure at the top of `resolveCombat`, which had
been harmless while it only read precomputed figures and became a duplicate rider query once
each call did its own; and `gazeTouchParams` now folding gaze activity and Black Sleep into the
group gate it passes down, so an undealt gaze queries nothing. All three are behaviour-preserving:
every consumer of a gaze rider value was already `*With`-gated, and `*With` collapses to false
whenever the new gate does. `tools/unit_checks/phases.js` gained an active-Life-Steal thrown case,
because both existing cases pass `aLifeStealModT: null` and so never read the renamed parameter.

**Open, and not fixed here: a rider step is gated on the rider being present, not on the engine
reaching the roll.** `ApplyAttack` tests `not magicimmunity`, `not stoningimmunity`,
`not deathimmunity` and the Exorcise eligibility/Spell-Lock pair *before* calling
`ResistanceRoll`; the `when` predicates ask only whether the rider is placed and the group fires.
No number moves, because every `*FailProb` function in `combat_special_attacks.js` returns 0 (or
`lifeStealEffective` null) on the same immunities before it reads the resistance figure. But the
query is made, and F222.5 would render a chain for a roll the engine never attempted. Fixing it
means naming each rider's "the engine reaches the roll" predicate once, where both the step's
`when` and the fail function read it — and that surfaces a second question: the DOS blocks at
`combat.c:4603` and `:4628` test only Stoning/Death Immunity, with no Magic-Immunity term, while
`stoningFailProb`/`deathTouchFailProb` apply a Magic-Immunity gate in every version.

Green after the change: `npm run provenance` 295 formulas (was 278), `node tools/node_unit_checks.js`
14,916 assertions (was 14,670), `npm test` 130 passed.

## 2026-08-30 - F219.1: the Node aura gate was right, the tooltip was the outlier

Both blocks gate on **race**, never on the Fantastic flag.

| Source | True location | Gate |
|---|---|---|
| DOS | `Reference docs/DOS reconstructed/unitcalc.c:3336-3344`, `BU_Apply_Battlefield_Effects` | `bu->race == rt_Sorcery` / `rt_Chaos` (131:0x8FF42) / `rt_Nature`, else-if chain |
| CoM2/Warlord | `Reference docs/Caster binary/Units.RecalculateUnits.pas:1955-1966`, `$005A25F0..$005A273C` | `NodeAuraType` 1/2/3 -> `U.race = 16` / `U.race = 17` / `IsChaosUnit(i)` |

Neither has a Fantastic term, so `nodeAuraActive` (`Calculator/stats.js:553-557`), which tests the
realm alone, matches; index.html:85's "Fantastic units of the node's realm" did not. The gate is
reachable non-vacuously: Spirit Link clears live Fantastic without touching race, so a
spirit-linked realm creature still keeps the aura.

**Q31 does not block the Fantastic question** for four of the six arms directly (Nature and Sorcery
in CoM2 are `U.race = 16/17`; all three DOS arms are race equality). The reviewer's caveat is
recorded and is real but narrow: CoM2's *Chaos* arm alone routes through the unreconstructed
`IsChaosUnit`, so if Q31 later finds that helper tests Fantastic-and-Chaos, the CoM2 chaos arm -
and only that arm - would narrow. The tooltip states the modelled behaviour, which is realm-only
in every arm today.

No number moved: the code was already correct and only the tooltip changed. Two fixtures now pin
the ruling - `nodeAuraNonFantastic` (MoM 1.31, Chaos race, non-Fantastic, 1.800 against
`nodeAuraNoMatch`'s 1.200) and `nodeAuraNonFantasticNatureCoM2` (CoM 2, Nature race, exercising the
modern branch's provably realm-only arm rather than the Q31 one).

Checked and dismissed: the non-CoM2 branch of `c:nodeAura` (`stats_sequence.js:1228`) looked wider
than the DOS write (it touches channels and both gazes where the block writes only melee, ranged,
resist, defense), but outside CoM2 the channel list holds the single shared DOS ranged slot and the
gaze fields are projections of it. No divergence.

## 2026-08-30 - F217.3: a Rebuilt hero is not Mechanical

The item's cited lines all drift, and by much more than the ~8-11 lines the sibling items saw.
Located by content in `Reference docs/Script source/Warlord 1.5.12.9/`:

| Cited | True |
|---|---|
| `UnitCalc.CAS:276` | `UnitCalc.CAS:278` - `IF (GETSTAT(U,SCustomAttribute,1)<>1) THEN { GOTO "NOTENGINEERCOUNT"; }`, opening the Engineers/Mechaniacs block at :277-311 |
| `OLSpell.CAS:278-285` | `OLSpell.CAS:581-596` - the `SP<>SRebuild` block; the `IF (ISHERO(TU)=0)` body is :585-592 and its `SETSTAT(TU,SCustomAttribute,1,1)` is :587 |
| `UnitCalcPre.CAS:685` | `UnitCalcPre.CAS:685` - correct as cited; `SETSTAT(U,SCustomAttribute,0,1)`, inside the hero Rebuild branch at :682-693 |

The fork is settled by a census rather than by either cited line: across every `.CAS` in the
version, `SCustomAttribute` is read at selector 1 in 22 places and at selector 0 in exactly one -
`CombatEndTurn.CAS:525`, testing value 2 (Clergy corruption). Value 1 (Mechanical) has no
selector-0 reader anywhere: not `UnitCalc.CAS:278` (Mechanical Expert), not `:367` (the Mechanical
Master hero bonus), not `CreateUnit.CAS:38` (Artificer) or `:467` (the Academy magical-ranged
gate), not `DisAbil.CAS:483` (the display line), not `OverlandEndTurn.CAS:411`. So the hero
branch's write is inert in the engine, and the gate reading the permanent record is not a divergence
to model - it is the only record anything reads.

Hence `u.mechanical` is the permanent-record carrier and `b:rebuild`'s hero branch writes nothing to
it. `stats_identity.js`'s `permanentMechanical` already carried the same `&& !isHero` for the
Outlander derivations, so the change makes the record agree with a ruling the file had already made
on its own half.

Numbers moved: a Warlord hero with Rebuild and Mechanical Expert loses +20% To Hit / +10% To Defend.
New fixture `mechanicalExpertRebuildHeroNoBonusWarlord` pins 3.600 where the old code gave 6.000;
`mechanicalExpertRebuildMakesMechanicalWarlord` is the non-hero sibling at 6.000, differing only in
`unitType`.

No step id was added or removed, so `steps.js` and `stats_manifests.js` needed no entry; only the
`writes` list of the existing `rebuild` step became branch-dependent.

The GPT review caught the second carrier: `applyRebuildEffects` (`combat_effects.js`) projected
`mechanical: true` onto every Rebuilt unit for combat resolution, heroes included. Nothing reads it
today, so the fixture passed either way, but it contradicted the ruling and the display; it is now
non-hero-only. Its three other grants stay ungated - both branches write them
(`OLSpell.CAS:590-592`, `UnitCalcPre.CAS:688-690`).

Its second finding is not F217.3's: `stats_identity.js`'s comment on `outlanderSoldier` says the
gate admits heroes explicitly, and `UnitCalc.CAS:1397-1399` carries no hero term. The formula is
right, the comment is not. Left for whoever owns that block.

While here, every Rebuild-block script citation in the calculator was re-aimed by content, since
they had drifted with the same tree the item's did: `OLSpell.CAS:273-286` -> `581-595`, `:279` ->
`:587` (and, at `combat_abilities.js`'s `ISHERO` note, `:586`), `:280` -> `:588`. The
`combat_abilities.js` line numbers quoted inside four preset `desc`/`vacuity` strings moved with
this change and were updated too. `TESTS.md`'s preset census was recounted under its own rule
rather than incremented: 154 of 1132.

## 2026-08-30 - F217.2: Great Unbinding's two gates

The block is `UnitCalcPre.CAS:1362-1382`, not the 1352 the item cited — the same ~11-line drift
F217.1 hit. The existing `PROVENANCE[greatUnbinding]` span resolves to 1363-1379, so it already
covered both gates and needed no change.

Gate one, `:1363`, is an outright exemption: `IF (HASGLOBAL(W,GEGreatUnbinding)) %OR
(GETENCHANTMENTFLAG(U,EncSpiritLink,0)>0) THEN { GOTO "NOTUNBINDING"; }`. Only the Spirit Link half
is modelled. The `HASGLOBAL(W,…)` half has no counterpart: the calculator's single `greatUnbinding`
control is the *opponent's* cast reaching this unit — gate two, `HASGLOBAL(OPPONENT,…)` at `:1365` —
and the page has no "this unit's own wizard also has it" input.

Gate two's eligibility disjunction (`:1367-1374`) is `FANTASTIC(U)` plus `EncUndead`, `EncCCBreath`,
`EncCCFlight`, `EncCCArmor`, `EncNecromancy`, `EncRevenant`, `EncVampirism`. `greatUnbindingActive`
now reads live `u.fantastic` at the step rather than `isFantasticBase`, plus every one of those
flags that has a calculator input. `EncNecromancy` has none, so it has no term.

The live read is load-bearing, not cosmetic: `c:undead` writes `fantastic` in region **c**, after
this region-`b` block, so an Undead-flagged normal unit is not yet Fantastic when the gate runs —
which is exactly why the script lists `EncUndead` separately. That is what
`greatUnbindingUndeadFlagWarlord` pins. `chaosChannels:fireBreath:race` writes `fantastic` in `a`
for the modern builds, so the CC terms are redundant there, as they are in the script; they are
written out anyway because `chaosChannels:flight` and `:armor:race` are not all in `a`.

Judgment call worth re-checking: reading live `u.fantastic` in a `when` predicate is the same
positional form as `fantasticAtModernEncMagicRule` (F188), but it is also the shape F195 is
scheduled to *remove* from Spell Ward. If F195 rules that live-Fantastic reads are wrong in
general, this step is a second site to revisit.

Review round (GPT, `codex exec`) added a third fixture and three wording fixes. Its P2 was that the
live read was untested — every fixture would still pass with `isFantasticBase` back in place — so
`greatUnbindingLiveFantasticWarlord` (a Sanctified Clergy with a non-fantastic base, made Fantastic
by `b:sanctify` just before this step) now discriminates the two. Its P3s: the old "only fantastic
creatures are affected" wording survived in two `stats.js` comments, the preset section heading and
the non-fantastic fixture's `desc`; and the tooltip disclosed only Confusion as unmodelled, not the
`HASGLOBAL(W,…)` half of the exemption. All accepted.

Numbers moved: no roster default changes (Great Unbinding is a toggle). Three fixtures added,
`greatUnbindingSpiritLinkExemptWarlord` (10.0, was 8.0 under the old gate),
`greatUnbindingUndeadFlagWarlord` (8.0, was 10.0) and `greatUnbindingLiveFantasticWarlord`
(8.0, was 10.0). No existing fixture's number changed. The stale `isFantasticBase` citation inside
`greatUnbindingNonFantasticUnaffectedWarlord`'s vacuity note was rewritten to the disjunction.

## 2026-08-30 - F217.1: Night Goblins get their Darkness bonus

`UnitCalc.CAS:351-360` (the item text said 359-368; the gate is at 351, the label `!NOTNIGHTGOBLIN!`
at 361) is a second engine block on template 356, the inverse of the Poor Vision exemption F189
modelled: `IF (GetStat(U,STypeID,1)<>356) THEN GOTO "NOTNIGHTGOBLIN"`, then `+10` `SToHit` and
`+10` `SToDefend` when `ETERNALNIGHTCOUNT>0` or either `HASCOMBATGLOBAL(W,CGDarkness,1|2)`.

Modelled as `d:nightGoblinsNightVision` (`Calculator/stats_sequence.js`), gated on
`isWarlord && identity.specialUnit === 'nightGoblins' && hasDarkness`. `hasDarkness`
(`Calculator/stats.js`) is already exactly the script's disjunction: plain Darkness on either side,
or Eternal Night held by either wizard, which makes Darkness global. The label is "Night Vision",
which is what `DisAbil.CAS:487` prints for the same template.

Chain position: `d:flameBlade` (`UnitCalc.CAS:333`) then this, then `d:rust` (`:498`) — Warlord
chain only, so `STEP_VERSION_SCOPES` in `Calculator/steps.js` gets `SCOPE_WARLORD`.
`magicCalcScriptStatSteps` did not previously destructure `hasDarkness` or `identity`; both were
already on the context.

`eternalNightNightGoblinsExemptWarlord`: 14.000 -> 18.000 (40 dice at 30+5+10 = 45% instead of
35%), and the "not modelled ... will move to 18.000" sentence in its `desc` is replaced by the
block's actual reading. Its vacuity note's counterfactual moved 8.400 -> 10.800. The control
`eternalNightGoblinBowmenNotExemptWarlord` is template 348 and is untouched at 2.800.

Reviewer (codex) raised two points on the fixture. Acted on: its `vacuity` note claimed
`b.ability.eternalNight` was inert, which stopped being true — ablating it now returns 14.000 — so
the note is gone and the sweep reports no inert feature for the preset. Flagged, not acted on: the
fixture now asserts two template-356 blocks at once, so the 18.000-versus-2.800 gap against its
control no longer isolates the exemption alone.

Not renamed: the fixture still measures the Poor Vision exemption (it is the only thing separating
it from its 2.800 control), so `...ExemptWarlord` still describes what it asserts; the +10 is now
part of the arithmetic rather than a caveat.

## 2026-08-30 - F214: six fixture names stop claiming a version or a channel they do not run

Renames (each key has a second site in `test_tree.js`):

| Old | New | Why |
|---|---|---|
| `blessBreathBonusMoM` | `blessMagicRangedDefMoM` | magical-ranged card, not breath; MoM blocks 3 |
| `blessBreathBonusCoM` | `blessMagicRangedNoDefCoM` | asserts *no* bonus |
| `blessBreathBonusCoM2` | `blessMagicRangedNoDefCoM2` | asserts *no* bonus |
| `blessBreathBonusWarlord` | `blessMagicRangedNoDefWarlord` | asserts *no* bonus |
| `blurInvisCoM2` | `blurInvisCoM` | runs `V_COM` = com_6.08 |
| `blurPlusInvisCoM2` | `blurPlusInvisCoM` | runs `V_COM` = com_6.08 |

`blurPlusInvisCoM2v2` is the real CoM 2 arm and was left named as it is; the `CoM2v2` suffix now
reads oddly next to a free `blurPlusInvisCoM2`, but renaming it was outside the item and every
preset-key rename costs a stored-state migration.

The item asked whether `CoM2` is a legacy family label for the CoM family elsewhere in this
cluster. It is: `lionheartHpCoM2` (`presets_curses_and_undead.js:853`) also carries `version:
V_COM`. It is a third instance of the same class and was **not** renamed - not named by F214.
The dominant convention is the honest one (`blessMagicRangedNoDefCoM`, `blessFireBreathDefCoM`
= com_6.08), which is why the two Blur keys took `CoM`.

`spiritLinkBlessNoBonusWarlord` re-aim: the desc's "3.0 with Bless's +7" counterfactual is
unreachable, so the desc now states why rather than naming a number - `effectiveDefense:bless`
needs `magicImmunityEligible && spellId > 0` with a Chaos/Death realm
(`combat_effects.js:448-450`) and every unit-attack descriptor passes `spellId: 0` (`:654`,
`:663`, `:689`, `:701`); Immolation (`:709-717`) is the only modern channel that reaches the gate
and Spirit Link does not participate there. The key name was kept: "no bonus" is what the fixture
witnesses and the number was the only false part. Spirit Link itself remains inert on this card -
the same 10.000 holds without it - so a later pass may still prefer deletion over the re-aim.

`Reference docs/Version gating census.md:302` no longer says this fixture covers the
`d:spiritLink` fantastic-clear; `spiritLinkWeaponImmunityBypassWarlord` and
`spiritLinkExorciseImmuneWarlord` do.

Suites: `presets` pass, `node-unit-checks` pass, `provenance` pass, `version-gating` and
`f20-source-order` pass. The GPT reviewer reported an unreproducible
`d:nightGoblinsNightVision has no canonical version scope` from its own run; the scope is present
at `steps.js:290` and no suite here hits it.

## 2026-08-30 — F220: Destruction's resistance roll moved to the chaos bucket

`Reference docs/Caster binary/Combat.ApplyAttack.pas:521` passes `inferred_ChaosRealm` to the
Destruction `ResistanceRoll`, where the Life Steal roll six lines above passes
`inferred_DeathRealm`. `buildResistanceContext` had Destruction in its `death` need bucket, so
`touchParams` fed `destructionFailProb` the Death-realm resistance.

`buildResistanceContext` (`Calculator/combat_phases.js`) now carries a fifth pair,
`bResChaos`/`aResChaos`, whose CoM2 need term is Destruction alone; the DOS branch computes the
Chaos pair unconditionally like its four siblings. `touchParams`, `meleeTouchParams` and
`gazeTouchParams` take the value as a new positional argument after `otherResDeath`, and the
seven `combat.js` call sites pass it.

Confirmed numerically inert: `EFFECTIVE_RESISTANCE_STEPS` gates Bless on
`realm === 'chaos' || realm === 'death'` and Resist Elements on nature only, so the CoM2 chaos and
death values are equal today; `destructionFailProb` returns 0 outside `com2_`, so the DOS pair
feeds nothing. `presets`, `modern-riders`, `result-invariants`, `phase-order-f29`,
`node_unit_checks` and `provenance` all passed unchanged.

The DOS Chaos pair is dead today and the GPT review said so. Kept: MoM's
`elementalRealms: ['chaos','nature']` is exactly the thing that would tell chaos from death if a
DOS rider ever reads it, and the whole DOS branch already computes every realm unconditionally.

Follow-on, not acted on: the positional argument list of `touchParams` is now nine long and every
call site restates the same six resistance figures. Passing the resistance context object would
remove that; it was not in scope here.

## 2026-08-30 — F219.2: two records of a closed Artificer divergence removed

Verified in the shipped `Unit rosters/Warlord mod unit data/HELP.TXT`: `#Retort Artificer` (:216)
and `#UA ARTIFICER UPGRADE` (tag at :6334, effect at :6337 — TASKS.md's ":6332" is off by two)
both read "+2 Resistance", agreeing with `CreateUnit.CAS:40-43` and with §6's closure in
v1.5.12.6.2. No shipped *prose* source still says +1; `CreateUnit.CAS:37`'s own in-script comment
does, and that is the only survivor.

Removed both stale records named by the item: the trailing line of the `artificer` tooltip
(`Calculator/enchantments.js:131`), and the sentence in `Reference docs/Source discrepancies.md` §6
*Calculator* that asserted the tooltip notes the divergence. The review round found three more
in-code claims that the helptext still says +1 — `Calculator/combat_abilities.js:1245,1249`,
`Calculator/presets_buildings_and_machines.js:794` (preset `desc`),
`tools/unit_checks/derivation_stages.js:77` — all corrected, and §6's claim that a
`node_unit_checks.js` assertion pins +2 (it pins only the stage; the preset pins the magnitude). §6's Status row ("closed in
v1.5.12.6.2") was already correct and is untouched; the granted value (+2) is unchanged, so no
number moves.

## 2026-08-30 — Warlord 1.5.12.9 migration

`Raw install files/CoM2ModWarlord1.5.12.9` replaces 1.5.12.7 as the supported Warlord build. The
1.5.12.7 and 1.5.12.6.2 script trees, both superseded roster snapshots, and the 1.5.12.6/1.5.12.7
manuals were deleted rather than kept beside the new one.

**The engine binary did not change.** `CoMWin1511/Caster.exe` in the new install is 10,584,041
bytes, md5 `540c22dbd701fb2caa95bd3ecccd9447` — byte-identical to the documented one. Every
compiled-behaviour reconstruction therefore carries over untouched; only the script layer moved.

**Two content-addressed anchors broke, and they were the only two.** Repointing the citation paths
to `Warlord 1.5.12.9/` and re-resolving all 193 left exactly `outlanderBallisticsTraining` and
`berserkWarlord` unresolvable. Since `@span:<lines>:<sha>` locates its window by digest, an
unchanged block survives a line shift and only genuinely edited text fails — so that pair is a
mechanical confirmation that nothing else the calculator models changed between the two builds.
The 226 rebinds `rebind_provenance_anchors.js` then wrote were all rehashes; no key moved.

**What changed behaviourally** (both from the v1.5.12.8 change log):

- Ballistics Training split its three channels — `SToRanged` cut to `+10`, `SToBreath` and
  `SToThrown` still `+20` (`UnitCalcPre.CAS:1082-1088`). It had been one scalar applied to all
  three; it now resolves per kind the way Hurricane's split does.
- Berserk moved from `UnitCalc.CAS` (phase `d`) to `UnitCalcPre.CAS:1120-1129` (phase `b`), and
  traded `SToDefend -10` for `SDefense -1`.

**`SDefensePenalty` (stat 31) is a ledger, not an armor term.** Berserk's block writes
`SDefense -1` *and* `SDefensePenalty +1`, which reads at first like a second subtraction. It is
not: every writer of stat 31 pairs `SDefense -X` with `SDefensePenalty +X` for the same X — Blaze
of Glory (`UnitCalc.CAS:1489-1490`), Beat of Swiftness (`:1505-1506`), Hierophany
(`:1553-1554`) — exactly as the Blaze block pairs `SRanged -X` with `SRangedPenalty X`. Helptext
`#UA BERSERK` states the net as *"-1 Armor"*. The calculator already modelled the other three from
their `SDefense` half alone, so ignoring stat 31 was correct all along and stays correct here.

**Roster.** One new unit, `[364]` Aerial Support Drones (Arcane, flying, 3 figures, Thrown 7
beside Ranged 9 at `RangedType=13`). It is the first shipped user of ranged type 13, which
`tools/ranged_types.py` had annotated as unused. Its `Custom13=14` makes it the 32nd Sapiens unit
and its two attack channels the 30th multi-channel unit; both inventory counts in the Node checks
moved by one. Wanderer's cost went 200 → 1100, which touches no combat number.

**Out of scope, noted rather than done.** Air Support Doctrine (tech 380, replacing Corporate
Charter) is a combat *summon*; the Evil Presence / Magic Perimeter and Mariner Mastery fixes are
city and movement code the calculator does not model; and Invisibility from item power 65 waits on
hero equipment.

**Manual vs script.** The v1.5.12.9 manual still prints Ballistics Training as `+20%
Range/Breath/Thrown`, contradicting its own change log two hundred pages later. Helptext and script
agree with the change log. Filed as `Source discrepancies.md` §16.

## 2026-08-30 — F212: five fixture `desc` fields corrected, and the ordering fixture renamed

All five of the item's readings held against the code, and two of the three wrong numbers turn out
to be **DOS values carried into Warlord fixtures**.

- Large Shield is `+3` in the modern engines (`effectiveDefense:largeShield`,
  `Calculator/combat_effects.js`). `+2` is the MoM/CP value; the version split is already recorded
  at `Reference docs/DOS reconstructed/R6.version-differences.md`, C33.
  `rustEliminatesLargeShieldWarlord` carried the DOS number *and its counterfactual*: the sweep's
  ablation of `b.ability.rust` measures dmgToB 7, not the 8 the `desc` claimed.
  `fortificationRestoresRustedLargeShieldWarlord` had `12−(2+3)=7` right all along.
- Magic Immunity raises modern effective Defense to `100` (`effectiveDefense:immunities`). The DOS
  path writes a symbolic `defenseSpecial = 'full'` and never a 50 at all; `50` is manual prose
  (`Reference docs/MoM binary analysis.md`).
- Both grant fixtures closed with "so both named features are live", which the sweep contradicts:
  `a.ability.weakness` and `a.ability.mindStorm` both ablate at delta 0. The halves that move the
  number are `a.ability.sanctaBasilica` (6 → 3) and `a.ability.marionetteLifeBooks` (2.0 → 0.8) —
  and it is the Life books, not `channeler`, which ablates to 2.4.

**Row 5's mechanism was verified before the rename, because the rename depends on it.**
`hasMeleeAttackAt` is `runCtx => runCtx.base.atk > 0` (`Calculator/stats.js`); the CoM2 ranged,
Thrown and Breath arms of the `level` step read `base[...]` (`Calculator/stats_sequence.js`); and
`runStatSteps` reassigns `context.base` only for a step whose `phase` is `base`
(`Calculator/steps.js`). The `focusMagic` step is phase `c` and writes only `u`. So the two
region-`c` steps are order-independent on this card and the old key claimed an ordering the code
does not have. `focusMagicCreationAfterLevelCoM2` → `focusMagicCreatedRangedNoLevelBonusCoM2`; the
key had exactly two sites (its preset file and `Calculator/test_tree.js`) and no other reader
anywhere in the repo. The new key deliberately keeps a `level` token: that is what binds the
`a.level=champion` candidate to the key in the sweep (`camelTokens`/`containsRun`,
`tools/preset_vacuity_sweep.js`), so its `vacuity` declaration stays non-stale — confirmed by the
after-sweep, which reports the renamed fixture with `a.level=champion` inert and no finding.

**`TESTS.md`'s numerator was settled by recount, not by patch.** It said "103 of 1126". The figure
entered the file as "101 of 1122" (commit `3c67338`) and was hand-incremented since. No rule
reproduces 103: `<file>:<line>` alone gives 88, a binary address alone 71, either 146. Recorded as
**146 of 1126** with the regex written beside it so the next agent recounts instead of
incrementing.

The GPT reviewer independently measured **144** from the same sentence, which is the best argument
for recording the rule: its 87 for the file-location half is exactly this count with the `c`
extension dropped, and `combat.c`/`unitcalc.c` are the DOS reconstruction filenames, so `c` has to
stay in. (Its 70 for the address half is one below the 71 measured here and could not be
reproduced under any variation of the threshold.) The recorded rule is now a single regex and says
to test the **evaluated** `PRESETS` object rather than the file text.

Left open, none of it filed:

1. **SSOT overlap between `desc` and `vacuity`.** Three of the five fixtures now state the
   inertness in the `desc` *and* in the `vacuity` reason, and `focusMagicCreatedRanged…`'s reason
   still carries an aside correcting an ordering claim that the key and `desc` no longer make. I
   edited only the `desc` side. A defensible split is: `desc` owns what the fixture asserts and the
   arithmetic; `vacuity` owns the mechanism and its citations, and must stand alone because the
   sweep prints it without the `desc`. Under that split the three reasons' closing sentences
   ("…is the assertion; X is the live half, at melee 6 against the ungated 3") are the redundant
   copies. Not touched: `vacuity` reasons are inherited as settled.
2. **`vacuity` line citations have drifted and nothing checks them.**
   `focusMagicCreatedRangedNoLevelBonusCoM2`'s reason cites `stats_sequence.js:733/747/786/791/848/915-917`;
   the real lines are `737/751/790/794-795/852/919-921`, a uniform +4. The reviewer found the same
   in two more of the five: `rustEliminatesLargeShieldWarlord`'s reason cites `stats.js:1622` for
   the Large Shield clear, now `:1658`, and
   `sanctaBasilicaMagicImmunityStripsWeaknessWarlord`'s cites old positions for the curse lists and
   the finished-immunity logic. `PROVENANCE` citations are machine-checked; `vacuity` and `desc`
   citations are not, and the drift is repo-wide rather than anything F212 created.
3. `spiritLinkBlessNoBonusWarlord` was excluded from F212 by the item and stays untouched.

## 2026-08-30 — F131: the withdrawn ranged-mode tick is declared, and the Blaze of Glory distance fixture is re-aimed

**The item's mechanism was imprecise, and it mattered.** F131 said the affected presets "leave the
Ranged field empty". They do not. `updateTypeVisibility` (`ui_abilities.js`) gates `#rangedCheck`
on `hasConventionalRangedAttack(readUnitStats('a'))`, and `readUnitStats` returns the **derived**
record. Two of the four state a Ranged strength on the card and an effect under test then removes
it — Blaze of Glory moves Ranged onto Thrown, Mind Storm zeroes it.

**Four, not three.** Measured through the real page (`applyPreset` on every preset with
`rangedCheck: true`, 250 of 1126): `holyBonusNeedsRangedStrengthCoM` joined the three the item
names. It was filed earlier in this same run, which is why the item's count was short.

**The field is inert in the number and load-bearing in the counterfactual.** Removing
`rangedCheck`/`rangedDist` moved no measured number in any of the four. But hand the fixture the
value it says must not appear and the two answers separate:

| Fixture, counterfactual record | with the tick | without it |
|---|---|---|
| `holyBonusNeedsRangedStrengthCoM`, Ranged 2 | 2 | 0 |
| `supremeLightSkipsZeroedRangedCoM2`, net Ranged 2 | 2 | 0 |

So deleting the field would have left both fixtures green against the regression they exist to
catch. They keep the tick and declare `rangedModeWithdrawn: true` instead;
`focusMagicDoomGazeCoM` does the same, its `desc` having always described the fall-back to melee.
None of the three had a stat, an ability or an expectation touched, so the `vacuity` keep reasons
T2.07 and T2.16 settled still read true.

**Blaze of Glory can never be observed on this axis.** It empties the Ranged field
(`UnitCalc.CAS:1494-1500`) and no later step puts a conventional ranged attack back, so ranged mode
is always withdrawn and `distancePenaltyFor` answers 0 at `!input.rangedCheck` before it reads any
type. The fixture's counterfactual could not fire in either direction — vacuous, not merely weak.
`c:focusMagic` is the write that *is* observable: it retypes a live missile in place to the IsMagic
shot type with the strength intact, so the control is kept. Measured at range 6: **1.000** with
Focus Magic against **0.840** without, which is `distPenaltyCoM2_6` unchanged. That pair is the
re-aimed `focusMagicRetypeSkipsDistancePenaltyCoM2`. The comment above `distancePenaltyFor` named
`d:blazeOfGlory` as the write that separates finished type from permanent; corrected.

**The blast radius was the sweep, not the suite.** `tools/preset_vacuity_sweep.js` drives its
ablated variants through `applyPreset`, and an ablation can itself be what removes the ranged
attack — the first run after the halt landed died on `__vacuitySweepProbe__`. The exemption went
into the fixture first (`derivedFixture: true`) and the GPT review was right that this is a fixture
authorising itself past the boundary: `runTests` hands authored presets to the same function. It is
now `applyPreset(name, { origin })`, a caller statement over a closed set, with the sweep the one
caller that passes `'ablation-probe'`. `rangedModeWithdrawn` takes `true` or absence and halts on
anything else, so a truthy `'false'` cannot clear the finding it is supposed to state.

**Nothing moved.** `npm test` 130/130, `npm run provenance` 277/277, `node_unit_checks` 14646/0,
sweep 10 findings before and after with identical buckets, `derivation_equivalence` 52440
derivations.

`TESTS.md`'s presets entry had "103 of 1125 `desc` fields"; the corpus is 1126 and already was
before this item (F175/F189 added presets earlier in the run). Denominator corrected; the
numerator 103 was not recomputed, because the regex that produced it is not recorded anywhere.

## 2026-08-30 — F181: an unrecognised slot attack type halts, and it caught an F117 straggler

`buildSlotContext` (`Calculator/stats.js`) read the slot's token through three positive
`includes` predicates over `RANGED_TYPES`, `THROWN_TYPES` and `GAZE_TYPES`, so a token no
vocabulary defines answered `none` to all three and the slot derived with no attack in it.

**Scoping was measured, not reasoned.** A temporary census in `buildSlotContext` recorded every
value reaching `slot.type`, then two runs:

- Browser (every preset via `runTests()`, every roster unit on both sides in all five versions,
  every `<option>` of `#*RtbType` and `#*ModernRangedType`): **empty**. No `''`, `null`,
  `undefined` or stray token ever arrives from the page.
- Node (`tools/node_unit_checks.js`): exactly one offender, `'ranged'`, **1085 times**, from
  `tools/unit_checks/version_scope.js`.

So the legal "no attack" token is `'none'` alone. The item's open question — what a modern record
with no shared slot carries — has no separate answer: `sharedSlotRangedType` (`ui_card.js`) falls
through to the `#*RtbType` select whose default `<option>` is `none`, `modernAttackRecord`
(`ui_units.js`) seeds a typeless channel as `'none'`, and `predefinedUnitRtbType` (`ui_matrix.js`)
returns `'none'`. The blank the `ui_card.js` comment still describes was already closed by
`setSharedSlotRangedType`'s throw and the modern branch of the reader.

`SLOT_ATTACK_TYPES` in `data.js` is the union plus `none`; `version_scope.js` now reads its sweep
axis from it instead of re-deriving the same union, so the two cannot drift.

**The straggler.** `version_scope.js`'s ability-probe pair passed `rtbType: 'ranged'`, which names
nothing in any vocabulary. F117 corrected exactly this class in the token *list* above it — its
comment names `ranged`, `stoning`, `death` and `doom` — and missed this pair, so 1085 probes swept
a typeless slot. Now `'missile'`, pairing with the sibling `'thrown'` probe. The corrected axis
still passes: `node_unit_checks.js` reports the same 14646 assertions, all green.

**Nothing moved.** `tools/derivation_equivalence.js` before-vs-after: 0 differing cases of 52440.
`npm test` 130/130, `npm run provenance` 277/277, `tools/preset_vacuity_sweep.js` completed with 0
baseline disagreements (the sweep ablates ability flags only, never `rtbType`, so the halt cannot
reach its findings).

**Not a duplicate of the page layer.** `assertRestoredValuesAreOffered` (`ui_state.js`) and
`setSharedSlotRangedType` (`ui_card.js`) answer "is this a value the *control* offers" — a
version-agnostic option list that excludes `magic`/`magic_lightning`, which the computation must
accept. The new halt answers "is this a token the *derivation vocabulary* defines". Two questions,
two homes, the same split the existing `specialUnitAllowed` (page) / `specialUnitDef` (core) pair
already has.

**F161's `'stoning_gaze'` was already fixed** — `tools/unit_checks/backlog_checks.js:468` reads
`gaze_stoning`, and the token appears nowhere in the repo outside `TASKS.md`. It survives as the
literal handed to the new `tests/fail-loud-f113.spec.js` case, so the shape that hid it is now
pinned by the typo that exposed it.

**The review found two more of the same shape, both fixed.**

- `applyModernAttackFields` (`ui_units.js`) assigned the modern projectile straight to a
  `<select>`, so a token the control does not offer left it holding `''` and `modernAttackRecord`
  read that back as `'none'`. Reproduced: `{ ranged: { strength: 4, type: 'magic_i' } }` derived
  without throwing and without a ranged channel. That put the new halt out of reach of the exact
  producer the item was filed about — a fixture typo in a preset's `modernAttacks`. It now checks
  the token against the control's own option list and names the caller, which is the boundary
  `setSharedSlotRangedType` already held for the DOS shared slot one line earlier in `applyPreset`.
- The channel loop's drop test read `attack.type` before anything validated it, so
  `{ strength: 0, type: '' }` and a channel with no `type` were *filtered out* rather than
  rejected. The vocabulary check is now a named helper called from both the loop and
  `buildSlotContext`.

**Left open.** 68 comments across `Calculator/*.js` cite `SPEC.md`, a file that no longer exists;
the specification moved into `CLAUDE.md`. The new comment cites `CLAUDE.md`, so the file is now
mixed. `Reference docs/Attack-type predicate inventory.md` carries `stats.js` line numbers from
2026-08-20 that had already drifted before this change.

## 2026-08-30 — F196: the eight ids behind Mechanical Expert get names

The gate, re-read at `Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS:277-307`:

- Recipient gate `:278` is `GETSTAT(U,SCustomAttribute,1)<>1` — the **permanent** Mechanical flag.
- The scan `:280-302` walks `UNITONTILE` over `NMAXCOMBAT`, drops units whose `GETSTAT(UOT,SOwner,0)`
  is not `W`, and counts one when `GETHEAB(UOT,HAMechanicalMaster)>0` or `GETSTAT(UOT,STypeID,1)`
  is 52, 78, 110, 117, 144, 292, 357 or 363. Both reads are the **base** record.
- `:302-305` then writes `SToHit+20` and `SToDefend+10` on record 0, once, if `ENGINEERS>0`.

Names, cross-checked between `Unit rosters/Warlord mod unit data/UNITS.INI` (section index = STypeID;
[358] is Poxbearers, matching the Goblin Pox test at `:258`) and `Calculator/units_warlord.js`, which
race-prefixes the same records. The two agree:

| id | UNITS.INI `Name` (Race) | roster name |
|---|---|---|
| 52 | Engineers (1) | Beastmen Engineers |
| 78 | Combat Engineers (4) | Dwarf Combat Engineers |
| 110 | Engineers (8) | High Men Engineers |
| 117 | Engineers (9) | Klackon Engineers |
| 144 | Engineers (12) | Orc Engineers |
| 292 | Engineers (22) | Xuanyuan Engineers |
| 357 | Mechaniacs (25) | Goblin Mechaniacs |
| 363 | Clockwork Tinmen (15) | Clockwork Tinmen |

Five share the bare name "Engineers", so the tooltip carries the race word and folds the five into
one clause: "Beastmen, High Men, Klackon, Orc, or Xuanyuan Engineers". That is what made all eight
fit inside the style guide's 75-character lines without dropping any.

**Rebuild does not set the tick.** The first draft said a Rebuilt unit "takes the bonus but does not
itself set this". The reviewer caught the first half: for a **hero**, Rebuild writes
`SCustomAttribute` at record **0** (`UnitCalcPre.CAS:685`), while the recipient gate at
`UnitCalc.CAS:276` reads record **1** — so a Rebuilt hero gets nothing from the script. Only the
non-hero branch (`OLSpell.CAS:279`) writes record 1. The tooltip now claims only the presence half,
which holds for both: Rebuild changes no `STypeID` and grants no `HAMechanicalMaster`.

The calculator disagrees with the script here and it was left alone — see *Left open* below.

**Two things found while checking that the Mechanical flag itself is described** (item step 4). It is
user-visible: `abilities.js` `mechanical` is a checkbox with `match: 'Mechanical'`, auto-ticked from
the roster ability string. Its tooltip said Artificer grants "+1 melee/ranged/armor/resistance";
`CreateUnit.CAS:43` writes `GetStat(U,SResist,1)+2`. Corrected, along with the Magic Weapons half
(`:39`), and "To Defend" aligned to "To Block" (16 uses to 5 across the two def files).

Unfixed, and reported instead because it is outside F196: the `artificer` control's tooltip ends
"In-game helptext says +1 resistance; the script grants +2." This repo's
`Unit rosters/Warlord mod unit data/HELP.TXT:216` and `:6332` both say **+2**, and
`Reference docs/Source discrepancies.md:31` records the helptext as corrected in v1.5.12.6.2 — but
`:191` of that same doc still says the tooltip "notes the divergence". Two stale claims, one fact.

`tests/mechanical-expert-f196.spec.js` (scaffolding) resolves the eight ids out of the live roster
and asserts each resolved name's words appear in the tooltip, so a roster rename fails there rather
than leaving the tooltip quietly wrong. `tools/derivation_equivalence.js`: byte-identical against a
worktree at the parent commit, 0 of 52,440.

**Left open.** `d:mechanicalExpert`'s gate is `when: u => !!u.mechanical` — the live flag — while
`UnitCalc.CAS:276` reads the permanent one. For non-heroes the two agree, because `base:rebuild`
writes the permanent record. For heroes `b:rebuild` writes only record 0, so the calculator grants a
Rebuilt hero +20%/+10% that the script would not. Not fixed: it is a behaviour change, not a tooltip.
No fixture covers a Rebuilt hero either way.

## 2026-08-30 — F211: the Bless gate is right, the tooltip was wrong in three versions

F211 offered a fork: narrow the tooltip to Immolation, or establish the modern `effectiveDefense:bless`
gate is wrong and fix the code. The binary settles it for the gate.

`Combat.ResolutionHelpers.pas:197-200` — `EffectiveDefense`'s Bless term is
`EncBless and ismagic2 and (spellid > 0) and (SpellTable[spellid].Realm in [Chaos, Death])`.
`Combat.ApplyAttack.pas:446-457` is the only call site for a unit attack and passes the literal `0`
for `spellid` in every `at` case — melee, ranged, thrown, both breaths, all three gazes. So no unit
channel can satisfy `spellid > 0`, whatever `ismagic2` says (breath and gaze both set
`magicranged := True` and still get nothing). The only positive-`spellid` caller is
`Spells.DamageSpells.pas:169`, reached from `ApplyAttack`'s own `DamageSpell(du, SImmolation, ...)`.
The calculator's gate (`combat_effects.js`, `effectiveDefense:bless`) reproduces that clause term for
term, and `tests/defense-cap-bless-f32-f34.spec.js` ("F34 keeps Bless Defense spell-only in both
modern versions") already asserts it across all four unit channels.

So the tooltip was the outlier, and the change is tooltip text plus one code comment.
`tools/derivation_equivalence.js` output is byte-identical before and after (52,440 derivations).

Three corrections, not one:

- **CoM 2 / Warlord.** Old text promised breath, magical Chaos ranged, and thrown/physical ranged
  from Chaos/Death creatures. None of those reach the gate. What does: Immolation
  (`spellId: 99`) and Wall of Fire, which `combat.js` routes through the same `aDefForImm` channel
  (`combat.js:299`, `:441`). Both are `Realm=3` = Chaos in both `SPELLS.INI` files
  ([99] Immolation, [87] Wall of Fire; `Chaos = 3` at `Combat.ResolutionHelpers.pas:49`).
- **MoM 1.31 / 1.60.** The listed five channels are right against `dosDefenseForAttack`, but the
  list omitted Wall of Fire, which shares the `blessEligible: !isCoM1` immolation descriptor.
- **CoM 1.** Same omission on the exclusion side; the old "not to … any ranged attack" is now
  "not to melee, thrown, ranged, Immolation, or Wall of Fire".

The resistance half needed nothing: `buildResistanceContext` (`combat_phases.js`) puts Cause Fear,
Death Touch, Death Gaze, Destruction and Life Steal in the death-realm bucket and the Bless gate is
chaos-or-death, so the tooltip's five are exactly the set. Exorcise/Dispel Evil (life), Stoning
(nature) and Poison (null realm) correctly get nothing.

Also corrected: the `effectiveDefense:immunities` comment claimed `EncBless` is "keyed on
`SpellTable[spellid].Realm` in GetEffectiveResistance". It is keyed on `SpellTable[spellid].Realm`
in `EffectiveDefense` (`:197-200`) and on the caller's `realm` argument in `GetEffectiveResistance`
(`:125-126`). Two functions conflated; the comment now names both.

Left open, not touched:

- The `blessBreathBonus*` family (`MoM`, `CoM`, `CoM2`, `Warlord`) is misnamed: all four fixtures
  drive a **magical ranged** attack, not breath. `blessFireBreathDef*` are the actual breath cards.
  Same class as F214 (fixtures whose names claim something they do not run), but not in F214's list.
- `abilities.js:21` (Destruction) says "Chaos-realm resistance attempt". The binary agrees —
  `Combat.ApplyAttack.pas:521` passes `inferred_ChaosRealm` — but the calculator routes Destruction
  through the **death** bucket (`combat_phases.js`, `bResDeath`). Numerically inert in CoM2/Warlord
  (Bless, Magic Immunity and Resist Magic all treat chaos and death alike, and Resist Elements is
  nature-only), and Destruction does not fire in the DOS builds where MoM's elemental resistance arm
  would tell the two realms apart. Unfiled.

## 2026-08-30 — F197: Spirit Link's tooltip re-derived, not just renamed

The item was "the tooltip names Dispel Evil, which is MoM-only; the rider Warlord has is Exorcise".
That much is right — `AttackFlagsT` (`Reference docs/Caster binary/Combat.ApplyAttack.pas:98-104`)
declares `exorcise` and no Dispel Evil member, and `subgroup: 'Warlord only'` resolves to Warlord
alone (`ui_abilities.js:352`). But the rest of the old tooltip did not survive checking either.

Method: derive a Warlord unit with and without `spiritLink`, once per enchantment/ability def in
`ABILITY_DEFS + ENCHANTMENT_DEFS` plus the non-ability inputs, over eight base identities
(mundane-race normal, normal at each of five races, three fantastic realms), diffing every scalar
field. What actually moves:

- Gained while the b-write stands (`b:spiritLink` is the head of region `b`, everything below it
  reads a Fantastic unit): the fantastic-creature halves of Nature Link, Survival Instinct and
  Xenoveterinary; `b:nausea` suppressed (its gate is `!u.fantastic`); Chaos Embrace on a Chaos-race
  unit; Warp Reality's penalty escaped on a Chaos-race unit; a matching Spell Ward now bites; and
  the modern EncMagic Fantastic rule, which is what makes the attacks bypass Weapon Immunity.
- Lost or gained once `d:spiritLink` has cleared it (`e:*` and resolution): Exorcise cannot banish
  it, the level control opens (but not under Apotheosis — `levelEligible` excludes `destinyActive`,
  `stats.js:138-143`), Liability and Rust reach it, an enemy's Blood Lust doubles against it, and
  `e:leadershipAura` replaces `e:soulLinkerAura`.

The old tooltip's list "Node Aura, Darkness/True Light, Land Linking, Survival Instinct, Supreme
Light" was wrong on three of five. Node Aura (`stats.js:554-558`), Darkness and True Light
(`:676`, `:705`) and Supreme Light (`combat_abilities.js:290-306`) gate on the unit's **realm**,
and Spirit Link writes `fantastic` only — the realm is untouched, so none of them moves either way.
For a mundane-race unit the b-write does make the realm read `arcane` (Q28's path through
`legacyUnitTypeFromLiveIdentity`), but the Node aura control offers only chaos/nature/sorcery, so
still nothing moves. Supreme Light's `def` does move by +1 for a Life-race unit — that is
`floor(res/3)` reading the +2 Resistance, not the flag. Same for Pneuma Field's `trunc(res/2)`.

"Grants no enemy Bless bonus" is not a modelled effect at all: the modern
`effectiveDefense:bless` step needs `spellId > 0` with a chaos/death realm
(`combat_effects.js:448-451`) and every modern unit-attack descriptor passes `spellId: 0`
(`:652`, `:661`, `:687`, `:699`), while the resistance arm keys on the rider's realm, not the
attacker's. Nothing about the attacker's Fantastic status can reach Bless in Warlord. That is
F211's evidence; the `bless` tooltip and `spiritLinkBlessNoBonusWarlord` were left alone.

The new text states the rule ("anything read in between / afterwards") rather than a closed list,
because the list is not closable: every gate that reads the running identity between the two
writes is a member, and two of the candidates (`unitIsChaos`, Spell Ward's live-Fantastic term)
are exactly what Q31 and F195 have not settled.

Left open, found while doing this and **not** fixed:

- **The Spirit Link helptext promises Sapiens, the script does not write it.** `HELP.TXT:4538` says
  "gains Sapiens and sentience"; `UnitCalcPre.CAS:28-30` sets `AFantastic` and nothing else. Under
  *Source routing* the script wins, so the tooltip says nothing about it — but if it were granted,
  the `NOTSAPIENS` gate (`UnitCalcPre.CAS:1062-1064`) would re-open Radio, Xenopsychology,
  Ballistics Training and Bombs & Grenades for a base-Fantastic unit, which is a real difference.
- **The Node aura control's own tooltip says "Fantastic units of the node's realm"**
  (`index.html:85`) but `nodeAuraActive` (`stats.js:554-558`) tests the realm alone, so a
  `normal_nature` unit takes the aura. One of the two is wrong; not read further.
- `Reference docs/Version gating census.md:297-304` still says Warlord's Spirit Link Bless
  behaviour is "covered" by `spiritLinkBlessNoBonusWarlord`. It is not — see the Bless paragraph
  above. F211/the fixture re-aim own it.

## 2026-08-30 — F206: Blaze of Glory makes its Wall Crusher grant

`d:blazeOfGlory` now writes `u.wallCrusher = true` as the first of the block's three ability
writes, matching `UnitCalc.CAS:1503` ahead of `:1504` (Armor Piercing) and `:1505` (First Strike).
The item text says the Wall Crusher write sits *between* those two; it does not, it sits before
both.

No provenance change was needed. `PROVENANCE[blazeOfGlory]` cites
`UnitCalc.CAS@span:16:6cabb4119ac66a1204ea795e`; recomputing the sha256-prefix index the way
`tools/provenance_audit.js` builds it resolves that uniquely to lines 1490-1505, so `:1503` was
already inside the reviewed span. The reviewer re-derived the same range independently.

### The open question: does Wall Crusher deserve a resolver consequence

Nothing in `Calculator/` reads the finished `wallCrusher` flag — the only occurrences are the two
writes (`b:bombsGrenades`, now `d:blazeOfGlory`), the `POSITIONED_GRANT_WRITES` entry and the
Marionette Chaos-ascension display label. The roster strings "Wall Crusher" in `units_com2.js`
(15) and `units_warlord.js` (34) are never decoded into an ability either: `abilities.js` has no
definition for it, and roster parsing only consumes definitions.

But it is **not** out of scope, and calling it a dead field would be wrong. In CoM2/Warlord the
engine's consequence lands inside one mouse click:

- `Combat.PerformAttacks.pas:91-92` (`PerformRangedAttack`) and `:146-147` (`PerformMeleeAttack`)
  call `CrushWall(au)` and then `destroywall(BaseUnits[du].cox, BaseUnits[du].coy)` **before** any
  `ApplyAttack` in that call.
- `CrushWall` requires the calculated Wall Crusher flag and rejects an attacker whose owner is the
  combat defender owner (`Combat.AttackAndWallHelpers.pas:204`).
- `destroywall` turns wall state 1 (intact) into state 2 (broken) for the slot the defender's
  coordinates map to (`:326`), and `Combat.CallClosure.R5.2i.audit.md:100` records that this
  applies "before the attack later queries the wall state for extra Defense".
- The calculator reads exactly that value at `combat_effects.js:722-723` and `:1071-1077`, from a
  per-side `cityWalls` input of `'none' | '1' | '3'`.

So a Wall-Crusher attacker should see an intact defender's +3 drop to +1 for the rest of the click.
What blocks a one-line fix is that `destroywall` acts on the wall slot the defender's *coordinates*
select: a defender standing on an intact segment loses the bonus, a defender in the inner area
keeps +3 with no segment to break. The calculator's City Walls input conflates both (`index.html`
documents the option as "Inside"), so implementing this needs either a new "on an intact wall
segment" input or an approximation the user approves. Left as follow-on; F206 asked only for the
positioned write.

### Test mechanism

Presets assert `dmgToA`/`dmgToB` only, so an inert flag cannot be asserted by one. The grant is
asserted in `tools/unit_checks/warlord_abilities.js`, beside the existing
`assertEqual(bombs.abilities.wallCrusher, true, …)` for the identical `b:bombsGrenades` grant, plus
a hero negative. 14,643 -> 14,646 assertions.

`tools/derivation_equivalence.js`: 102 of 52,440 derivations move, all `com2_warlord_1.5.12.7`, and
the only field that changes is `abilities.wallCrusher` undefined -> true. No number moved.
`tools/preset_vacuity_sweep.js --only blazeOfGlory`: 13 presets swept, 0 findings, so no `vacuity`
declaration was needed.

Tooltip: "Not modeled: ammo loss, Wall Crusher." became "Grants Armor Piercing and Wall Crusher,
and loses First Strike. / Not modeled: ammo loss, wall breaking." The reviewer was right that
naming the grant without that disclosure over-promises against the *modelled effect* contract.
The sibling `explosive` tooltip still says "plus Wall Crusher" with no disclosure and `breakthrough`
still says "Not modeled: Wall Crusher" — three phrasings for one flag, left alone as outside F206.

## 2026-08-30 — F190: Warp Reality's Immolation To Hit arm goes, and the flat 30% is sourced

`deriveUnitStats` set `toHitImmolation = 0.3` and then re-charged Warp Reality's -20% against it,
two lines under its own comment saying Immolation ignores all modifiers. Verified against the
sources rather than the item text:

- Melee Immolation is delivered by `DamageSpell` — `Combat.ApplyAttack.pas:378-383`, with
  `SImmolation = 99` at `:83`.
- `DamageSpell`'s per-attack roll is
  `dam := AttackRoll(str, SpellTable[sp].hitchance) - DefenseRoll(def, Units[u].defendchance)` at
  `$005C1696..$005C16FF` (`Spells.DamageSpells.pas:197-198`). The attack half reads the *spell
  table*; only the defense half reads a unit field. No unit-side To Hit writer can reach it.
- Spell 99 sets no `HitChance` in either `spells.ini` (base `:1899-1916`, Warlord `:2218-2235`),
  and the file's own key list gives the default: "HitChance - chance to hit, defaults to 30%"
  (base `:332`, Warlord `:614`). Warlord's copy sets `HitChance` on ~20 other spells, so the
  absence on 99 is a choice, not an unused key.

Warp Reality's own write is the unit's hitchance — `Dec(U.hitchance,20)` at
`$005A3E33..$005A3ED0`, `bu->tohit -= 2` at 131:0x9079D and com1:0x90502 (the addresses the item
text and `stats_sequence.js` give, 131:0x9077A and com1:0x904DF, are the *gate*, not the write;
that is what those comments claim, so nothing there is wrong) — and that half is untouched, still
on `PROVENANCE[warpReality]` in `stats_sequence.js`.

**The user ruled** delete the arm and file the DOS half as its own item. Three dead values went
with it: `unitIsChaosAtWarpReality`, the `'c:warpReality'` identity sample (the arm was its only
reader, so `identitySamples` is now `c:chaosSurge` alone), and the F184 `LANDED_CORRECTIONS` row
naming the arm. The identity-projection agreement check moved two lines up, to sit directly under
`const statUnit`; that is only so the cross-boundary scanner attributes it to a symbol that means
something, and the two `modernEncMagic*` bindings it displaced moved below it (they are first read
~400 lines later).

`tools/derivation_equivalence.js`: 1816 of 52440 derivations move, all five versions, and the only
field that changes is `toHitImmolation` 0.1 -> 0.3.

`warpRealityChaosExemptAtBlockImmolationWarlord` was dropped, which is what its own T2 vacuity
declaration said should happen if the arm went. Its positional claim survives in
`warpRealityChaosExemptAtBlockWarlord`, which asserts the *unit* To Hit half. In its place,
`warpRealityDoesNotReachImmolationWarlord` pins the new value: a non-Chaos Warlord attacker with
no melee strength, Warp Reality charged in full, Immolation 10 at 30% -> 3.0 (the arm gave 1.0).
It is ablation-inert on `combat.warpReality` by design and declares that.
`warpRealityDoesNotReachImmolationMoM` pins the DOS half: 1 atk at 30%->10% = 0.1 plus Immolation 4
at an unmoved 30% = 1.2, total 1.3 (the arm gave 0.5). Both of its candidates are ablation-live, so
it needs no declaration. `tools/preset_vacuity_sweep.js --only warpReality` reports 0 findings over
all ten.

**The DOS half turned out to be already answered, and no item was filed.** The item text called
`BU_ProcessAttack`'s Immolation delivery an unreconstructed overlay, and it is not. `combat.c:4080`
calls `overlay_0388_0039(SPELL_FIREBALL, ...)` at `:4355`/`:4364`/`:4382`, and `0388:0039` resolves
to `0x87036`, which `R6.version-differences.md:286` lists as a reconstructed spell-damage builder
and which `combat.c:2596` holds under the name `Apply_Battle_Unit_Damage_From_Spell` — same file,
same signature, declared as an `extern` far stub at `:330` only because the call crosses an overlay
boundary. Its per-attack roll is `CMB_AttackRoll(attack_strength, 0)` at 131:0x87239, marked
identical in CP 1.60 and CoM 1. The to-hit argument is a literal zero; the attacker's `bu->tohit`
is neither passed nor read, and Wall of Fire shares the routine and the literal. So the flat 30% is
sourced in all five versions, not three, and there is nothing left to reconstruct. Codex found this
in the Method A review round, against a premise I had taken from the item text without checking.
The user had pre-approved filing one TASKS row for the DOS question; the row was written, then
withdrawn when the premise failed. `Calculator/stats.js` now carries the DOS citation beside the
modern one.

The Warp Reality tooltip (`index.html:63`) was checked and needed nothing: it promises
"-20% To Hit (melee, ranged, thrown, breath)" and never mentioned Immolation.

## 2026-08-30 — F189: Night Goblins take a special-unit key, and the Poor Vision gate reads it

The Warlord Eternal Night gate at `UnitCalcPre.CAS:1340-1344` has four terms. F186 landed the
realm and Undead-flag terms; the template term `(GetStat(U,STypeID,1)<>356)` at `:1341` was
unimplemented, so Warlord template 356 — Goblin Night Goblins, Missile 5 — took a -2 the block
exempts it from.

Verified against the sources rather than the item text: the span at `UnitCalcPre.CAS:1337-1346` is
the one the step's existing `PROVENANCE[eternalNight:poorVision]` citation already covers, so no
citation moved. `Scripts.TXT:266` fixes the record argument — "if B=0, it checks the current stats
and abilities, if B=1 it checks the base unit" — so the template term is a permanent read while
the realm term beside it is positional. `Calculator/units_warlord.js` confirms 356 is
`Goblin Night Goblins`, 8 figures, Missile strength 5, `to_hit` 5.

**The user ruled** that a template-id exception belongs in `SPECIAL_UNIT_DEFS`
(`Calculator/stats_identity.js`) rather than as a bare `templateId === 356` read at the gate, on
the ground that every template-id exception should live in one table, and accepted that the key
becomes user-visible in the `Special unit` selector. Implemented as `nightGoblins` /
"Night Goblins" / `versions: ['com2_warlord']`, with the roster arm in `specialUnitForRoster`.

The read is permanent by construction, not by position: `identity.specialUnit` is set once at
identity construction and no conversion writes it, so nothing in region `c` can defeat the
exemption — the distinction F175 turned on one gate over.

Presets: `eternalNightNightGoblinsExemptWarlord` (roster attacker, 8 x 5 = 40 dice at 30+5 = 35%
against defense 0 = 14.000) and its control `eternalNightGoblinBowmenNotExemptWarlord` (Goblin
Bowmen, template 348, penalised to strength 1, 8 dice = 2.800). Both defenders carry Poison
Immunity: the Night Goblins record also has `Poison Touch=1`, which added exactly 8 guaranteed
points and confounded the number under test — the first measurement came back 22.000, not 14.000.

**Noted, not fixed.** A comment in `Calculator/stats.js` referred to `identityAtPoorVision`, a
symbol that does not exist; it names the block this change edits, so it was repointed at
`warlordEternalNightActive` in the same pass.

Left open: the table's stated test ("a template earns a key only where the version's *engine*
makes the exception") covers this key, but it is the first whose engine site is a negative term
inside another effect's gate rather than a block of its own. Recorded in the comment above
`specialUnitForRoster`; no contract change proposed.

**Template 356 has four engine sites in Warlord, not one.** `UnitCalcPre.CAS:1341` is F189's.
`UnitCalc.CAS:359-368` is a second, **unmodelled** block: "Night Goblin gain bonus from Darkness or
Eternal Night", `+10` To Hit and `+10` To Defend when `ETERNALNIGHTCOUNT>0` or either Darkness
combat global is up — also a `GetStat(U,STypeID,1)` permanent read. The other two are display only:
`DisAbil.CAS:481` prints the ability line "Night Vision" for the unit, `DisAbil.CAS:1287` mirrors
the Poor Vision gate for its own line, and `DisAbil.CAS:3420` prints the unit name "Night Goblins",
which is where the key's label comes from. So the item's framing — "a roster exemption with no
other engine consequence" — is not what the scripts show, which strengthens rather than weakens the
ruling to give it a key. The unmodelled `+10/+10` block is named in
`eternalNightNightGoblinsExemptWarlord`'s `desc`: it is why that fixture's 14.000 becomes 18.000
once the block lands. Not filed; needs the user's approval to become a TASKS item.

## 2026-08-30 — F175: the two Warlord hero exclusions go

Both gates now carry their block's own test and nothing else.

- `b:nausea` (`Calculator/stats_sequence.js:502`): `isNormalUnitType(unitTypeAt(u))` →
  `!u.fantastic`. The branch is `IF FANTASTIC(U)` at `UnitCalcPre.CAS:1123` and the −10% To Hit /
  −10% To Defend pair is the **ELSE** arm at :1125-1128, read at that block's own position, so it
  reaches every unit not sent to `SETCOMBATENCHANTMENTFLAG(U,EncCreatureBinding,…)`.
- `wofDefenderBonusActive` (`Calculator/stats.js:868`): the `!isHero` term dropped, leaving
  `!permanentFantastic`. The block's only skip is `IF (BASEFANTASTIC(U)>0)` at
  `UnitCalcPre.CAS:1638`.

The two Fantastic tests stay distinct on purpose: `FANTASTIC(U)` is the calculated record and
`BASEFANTASTIC(U)` the permanent one, so Spirit Link clearing live Fantastic still does not confer
the garrison bonus and Raise Dead still does not withdraw it.

`unitTypeAt` fell out of `stats_sequence.js` entirely with the nausea rewrite, so it left that
file's destructure and the ctx object in `stats.js`; it is still read five times inside `stats.js`.

Measured with `tools/derivation_equivalence.js` before/after: **64 of 52440 derivations moved**, all
`com2_warlord_1.5.12.7`, all `id:hero` — 9 solo `nausea` cases, 9 solo `wallOfFireBoost` cases, 46
combination cases. The item recorded 64 of 52575 on 2026-08-25; the moved count is identical and the
case total drifted because the control surface changed since it was filed.

Two presets are the assertion, one per site: `nauseaReachesHeroWarlord`
(`presets_warlord_effects.js`, 0.100 where the old gate gave 0) and
`wallOfFireGarrisonReachesHeroWarlord` (`presets_fire_and_blessings.js`, 6.000 where the old gate
gave 5.000). Each declares `vacuity` for its own `unitType=hero` candidate, because the sweep
ablates hero → normal and *that inertness is the claim*: the blocks are asserted to answer the two
identities alike, so no ablation between them can move a number. Sweep after: 1123 swept, no finding
names either preset, no `stale-declaration`.

The `wallOfFireBoost` tooltip said "Defending regular units" / "Applies to normal units only" and
was rewritten — that wording came from `HELP.TXT:2761`, prose the script outranks. The `nausea`
tooltip already promised only "Does not affect fantastic creatures or units with Magic Immunity",
which the change makes exactly true rather than merely incomplete.

## 2026-08-30 — `longRangeMidRange` deleted, T2 closed

Settled as **delete** and executed, which was the last of the 389 without a verdict. Removed from
`presets_ranged_and_haste.js`, from the *Ranged* group in `test_tree.js:62`, and named-and-corrected
in `longRangeClose`'s `vacuity` reason. Sweep after: 1121 swept, `baselineMismatches` empty, 0 stale,
10 open findings whose keys are exactly the ten remaining adjudicated `re-aim`/`delete`. `npm test`
green, 129 tests.

**The recorded reason was half wrong and the redundancy was re-derived before deleting.** The
original entry said "the mom_1.31 ladder at distance 5 is already pinned by `rangedMissileBasic`" —
that fixture is at distance **9**. What pins the −10 step is `distPenaltyMoM3` at distance 3;
`floor(3/3)`, `floor(4/3)` and `floor(5/3)` are all 1 and mom_1.31 and mom_cp share the `else` branch
of `distancePenalty` (`combat_abilities.js:427-439`). Mutations worked through before deleting, and
which fixture catches each:

| Mutation of `distancePenalty` | Caught by |
|---|---|
| cap written flat, `if (longRange) penalty = -10` | `longRangeClose` only |
| cap removed, or `longRange` ignored | `longRangeMissile` |
| cap applied unconditionally, or `longRange` always true | `rangedMissileBasic` |
| divisor `/3` → `/2` or `round` | `longRangeClose`, `rangedMissileBasic` |
| divisor `/3` → `/4`, or the com2 branch taken | `rangedMissileBasic` |
| `floor(d/3)` → `floor((d-1)/3)` | `distPenaltyMoM3`, `rangedMissileBasic` |

None is caught only by `longRangeMidRange`. At distance 5 the penalty is exactly −10, so the cap's
guard is false and the fixture sits in the one spot where neither the ladder nor the cap can move it
without a sibling moving first. That is why it was inert under ablation and why it is safe to drop.

The lesson worth keeping is not about this fixture: **a delete verdict whose justification was
"enumerated by hand, not measured" is a lead, not a warrant.** Re-deriving it took ten minutes and
found the cited sibling was the wrong one.

## 2026-08-30 — T2.11–T2.23 adjudicated: 195 of 202 kept, seven verdicts open

Priority rows 1–13, the remaining four preset files. The 23 slices sum to exactly 389, so there was
no balance outside them and the close-out was verification rather than more adjudication. Final
sweep: 1122 swept, `baselineMismatches` empty, **0 stale declarations** across the 258 new keys, 11
findings open — precisely the seven below plus the four from the earlier round. `presets.spec.js`
passes in 36.4 s.

T2 did not close on this run: `longRangeMidRange` was recorded as "re-aim/delete", which is not a
verdict, so one of the 389 was still unsettled. The Method A review caught that; I had called the
item done. Settled as `delete` and closed the same day — see the entry above.

The review also sharpened the completeness test, which is worth keeping because the obvious version
is wrong. `378 + 11 = 389` is not sufficient on its own: the item allows the flagged set to shift, so
a newly flagged preset outside the original slices could replace one that stopped flagging and leave
the sum unchanged. What actually proves it is comparing the sweep's finding **keys** against the
recorded open list, plus the stale-declaration count. Both hold here.

378 fixtures now carry a `vacuity` block. 906 insertions, 0 deletions, and **no file outside the four
preset fixtures was touched** — `test_tree.js` included. The declarations are inert data on a path
that already existed, which is why every expectation still holds.

### The seven verdicts that are not `keep`

Left undeclared on purpose, so the sweep keeps reporting them. Each is a lead to re-verify, not a
ruling.

- **`focusMagicDoomGazeRangedBranchCoM2`** (delete). Its attacker block is identical to
  `focusMagicDoomGazeCoM2`'s; the only defender differences are `def:0`, which is the default
  (`data.js:102-104`), and `res:50`, which nothing on the magic-ranged path reads because the gaze
  phase is `!isRanged && aGazeActiveP` (`combat.js:296`). Both expect 3.000 by the same route.
  **Caveat for whoever acts on it:** it is the CoM2 Focus Magic group's entry (`test_tree.js:516`)
  while its twin sits in the version-difference pair (`:1182`), so deleting it leaves that group
  without the fact unless the twin is also listed there.
- **`spiritLinkBlessNoBonusWarlord`** (re-aim). Its `desc` states a number the engine cannot
  produce: "10.000 vs 3.0 with Bless's +7". Modern Bless needs `magicImmunityEligible && spellId > 0`
  with a chaos/death realm (`combat_effects.js:448`), and every modern unit-attack channel passes
  `spellId: 0` — melee `:652`, ranged `:661`, thrown `:687`, gaze `:699`. Immolation is the one
  modern channel that reaches the gate (`:707-715`), and Spirit Link does not participate there
  either. `blessBreathBonusWarlord` already pins the broader behaviour. Evidence is filed as F211.
- **`missileImmunityArmorPiercing`** (re-aim). Claims an ordering — AP halves first, then MI raises
  to 50 — that the card cannot witness: three shots against either def 50 or def 25 are all blocked,
  so every cell of the 2×2 ablation is 0.000. `fireImmunityAfterArmorPiercing` in the same file has
  the shape that works (large shot strength, deep pool).
- **`lavaSmelterFlameBladeWarlord`** (re-aim, as a rename). The key names `flameBlade`; the fixture
  configures `lavaSmelterFieryBlade`. Not a tokenisation artefact — `flameBlade` and
  `flameBladeWarlord` are separate live ability keys (`enchantments.js:34`, `:163`), so the key names
  a real feature the fixture does not contain. The claim itself is sound and distinct from
  `fieryBladeMeleeWarlord`. The key also appears at `test_tree.js:628`.
- **`supremeLightCasterRangedCoM2`** (re-aim, argued). The shot is type `magic`, so
  `isMagicalRangedType` returns true at `combat_abilities.js:301` and short-circuits before the
  Caster arm at `:304`. The Caster flag decides nothing; the fixture measures the magical-ranged arm,
  which `supremeLightSkipsZeroedRangedCoM2` already depends on.
- **`goodMoonSkipsDestinyPermanentFantasticCoM2`** (re-aim, measured). At base melee 1, Destiny's
  doubling and Good Moon's `if (u.atk > 0) u.atk += 1` (`stats_sequence.js:1260`) both land on 2, so
  the fixture would still pass with its own `destiny` term deleted. Base melee 3 separates them
  (Destiny 6, Destiny-free Good Moon 4) with the same claim.
- **`focusMagicConvertsThrownCoM2`** (re-aim, measured). Every configured feature is inert: without
  Focus Magic the unaltered Thrown 5 still reaches the defender for 5.0, and Missile Immunity is
  gated on `ctx.isMissile` (`combat_effects.js:470`), which the Thrown descriptor (`:684-696`) never
  supplies. `focusMagicConvertsMissileCoM2` is the discriminating shape of the same claim.

### Where the review defects were, and where they were not

27 defects across 11 of the 13 subtasks (T2.14 and T2.20 came back clean). **Not one was in a verdict
or a declaration key** — every single one was prose claiming more than the line it cited proved. That
matters more than the count: the arithmetic was right throughout, and what needed policing was the
justification a later agent inherits as settled.

By shape, largest first: 8 wrong-line (citing the `statStep({...})` / `attackSpecificStep(...)`
opening for the assignment inside it, or the neighbouring arm of a multi-way branch); 8 citation
narrower than the claim; 3 attributing a gate to a `.CAS` script that lacks it; 2 under-scoped
absolutes; 2 false corpus claims; 2 overstated equivalences ("verbatim" where ablation *assigns*
`unitType: 'normal'` and the sibling *omits* the field); 1 incomplete sibling inventory; 1 false
counterfactual.

Three reviewers independently converged on one methodological correction worth keeping: **absence of
`every-feature-inert` proves only that *some* candidate is live, not which one.** It identifies a
specific candidate only when the preset has exactly one candidate, or when every other candidate is
named and reported inert. Every use in the landed work satisfies that, but the unqualified rule is
wrong and had begun to propagate.

### Two traps for the next round

- **A sweep can leave a server on 8080 and make the next test run a silent no-op.**
  `preset_vacuity_sweep.js` starts its own server via `startServer()` and does not always tear it
  down. `npx playwright test` then fails with "port already used" and **exits 0 without running a
  single test**. This happened here and read as green from the exit code alone. Check the output, not
  the status.
- **`tools/siblings.js` does not exist.** The 2026-08-30 T2.01–T2.10 entry cites it as the tool that
  answers "does any sibling differ only in X" — the exact claim that round's review caught three
  agents getting wrong. Nothing in the repo provides it. Every sibling claim in this round was
  enumerated by hand.

### Filed from this run

F211–F216, each found by reading a fixture against the code rather than by the sweep, each verified
against source, none making a test red: the Bless tooltip promising a gate-excluded effect; five
preset `desc` fields stating a wrong number or cause; the Warlord race-building race/hero terms no
script contains; two `CoM2`-named fixtures resolving to `com_6.08`; three effects asserted only by
absence claims in a version; and the degenerate Land Linking version-difference subgroup.

## 2026-08-30 — T2.01–T2.10 adjudicated: 183 of 187 kept, four verdicts open

Priority rows 1–3 of `TASKS.md`: the 78 flagged presets in `presets_ranged_and_haste.js`, the 51
in `presets_curses_and_undead.js`, the 58 in `presets_fire_and_blessings.js`. The re-run before
starting reproduced 389 flagged of 1122 with `baselineMismatches: 0` and the same per-file counts
the task table records, so the slice bounds held and no re-partition was needed.

`looksNegative` is gone. What replaced it is a `vacuity` map on the fixture, keyed by the sweep's
own finding — a preset-level bucket name or an inert candidate's id — with the adjudicator's reason
as the value. The schema and its two fail-loud directions live in the tool's own header comment
(`tools/preset_vacuity_sweep.js`), which is the single home for them; do not restate it elsewhere.
The stale-declaration arm caught two of my own mis-keyed entries before the file was committed,
which is the only evidence I have that it works as intended beyond the deliberate probe.

### Method A review, and the four defects it found

Run 2026-08-30 with `codex exec -s read-only -C <repo> -o <out.md> "<prompt>" </dev/null`
(gpt-5.6-sol, high effort, session 01a051ce-c5c3-7973-b185-0ccd48527d85). Reviewing agent was GPT
because the implementing agent was Claude. All four findings were verified against the code and
applied.

1. `declarationKeyFor` stripped the reason prefix off every candidate-level bucket, so one
   declaration cleared all four. Narrowed: `named-feature-inert` and `version-dead` are still
   cleared by the bare candidate id, `roster-shadowed` and `hp-cap-hides` only in full. Both of
   the latter are empty across all 1122 presets today, so this moved nothing and closes the hole
   before a fixture changes shape.
2. `rangedBoulderBasic` claimed to be the only fixture holding boulder inside the ranged-type gate.
   `longRangeBoulder` does too, and would also catch the arm being dropped.
3. `guidingBeaconExcludesThrownCoM` and 4. `immolationAtkZeroNoFire` each claimed a one-value
   sibling. Neither has one - `siblings.js` reports none for either, and it had been run over both
   during the work. Writing "differs only there" without checking the tool that answers it is the
   failure mode to watch: the claim is a proof, and asserting it without the evidence is worse than
   omitting it, because a `vacuity` reason is inherited as settled.

Not covered by the review: it sampled the 183 declarations rather than sweeping them, so "no
wrongly-cleared presets" is weaker evidence than its line-citation check, which was exhaustive. Its
claim that all 183 maps "loaded successfully" is unverified - it was told not to run the sweep.

### The four verdicts that are not `keep`

Left undeclared on purpose, so the sweep keeps reporting them: a `re-aim` or `delete` verdict has
not cleared anything.

- **`longRangeMidRange`** (**delete — settled and executed 2026-08-30**, see that day's later entry).
  Every mis-implementation of the Long Range cap it catches is also caught by `longRangeMissile` or
  `longRangeClose`. Enumerated by hand against `distancePenalty`, not measured. The other half of
  this reason was wrong: it said "the mom_1.31 ladder at distance 5 is already pinned by
  `rangedMissileBasic`", but that fixture sits at distance **9**, not 5. What actually pins the −10
  step is `distPenaltyMoM3` at distance 3 — `floor(3/3)`, `floor(4/3)` and `floor(5/3)` are all 1,
  and mom_1.31 and mom_cp share the same `else` branch of `distancePenalty`. Conclusion unchanged,
  premise corrected.
- **`hasteMagicRangedDoublesForCaster`** (re-aim). Its named feature is inert because nothing on the
  MoM path reads it: the repeat gate is `momHeroManaRanged` (`Calculator/combat.js:1225`), which
  keys on hero-ness alone, and `caster` is read only by `supremeLightActiveForUnit`
  (`combat_abilities.js:297,304`), which returns early for non-CoM versions. **That modelling is
  declared** — SPEC, *Deliberate deviations*, "MoM 1.31's hero magical-ranged repeat is modelled as
  the common case", because the real gate reads an unrelated battle-unit slot and can flip either
  way. So the verdict is about the fixture, not the model: it asserts a Caster condition the
  calculator deliberately does not test, and passes with `caster` removed. An earlier draft of this
  entry called it an F180-adjacent modelling gap; that was wrong, and the claim was mine rather than
  the sweep's. The only residue is the tooltip (`Calculator/abilities.js:26`), whose MoM line
  describes an effect that is not modelled, against SPEC's rule that a tooltip describes the
  *modelled* effect.
- **`blackSleepIncomingRanged`** (re-aim). Measured, not argued: as authored, ablating Black Sleep
  leaves 9. Drop `toHitRtbMod:70` and it moves 9 → 2.7. The fixture sets the to-hit to 100% and the
  defender's Defense to 0, which are the only two things doom-style exact damage would show
  against, so it demonstrates nothing. `blackSleepIncomingMelee` and `blackSleepIgnoresDef` each
  keep one of the two discriminators and are fine.
- **`weaknessBoulderNotAffected`** (delete). Byte-identical to `weaknessBoulderNotAffectedMoM` once
  `desc` and `version` are stripped, and both resolve to mom_1.31 — the first through the
  "Artificial MoM 1.31 tests" group version, the second through its own `version:`. The
  version-differences copy is the one with a job, against `weaknessBoulderPenaltyCoM`.

### `warpDarknessOrderMoM` cannot do both its jobs, and no verdict fixes that

Declared `keep` — its version claim is live — but the mechanism its `desc` states is unobservable
on this card. Measured at mom_1.31: atk 4 gives 2 with Darkness and 2 without; atk 5 gives 3 and 2.
So Darkness does reach a MoM Death creature and Warp does halve it afterwards. But `floor((n+1)/2)`
and `floor(n/2)` differ only for odd `n`, while the contrast against `warpDarknessOrderCoM`
(`floor(n/2)+1`) exists only for even `n` — at atk 5 both versions measure 3. Pinning the
"Darkness is inside the halving" claim needs a third preset at an odd melee.

### Version coverage gaps the `version-dead` flag surfaced

Each of these is a key whose only presets in that version are absence claims, so the version has no
positive assertion for it at all. Reported by the sweep, confirmed by counting the population:

| Key | Version | Presets configuring it |
|---|---|---|
| `chaosSurge` | mom_cp_1.60.00 | 1, an ordering exclusion |
| `illusion` | mom_cp_1.60.00 | 1 |
| `prayer` | mom_cp_1.60.00 | 1 |
| `weaponImmunity` | com_6.08 | 2, both absence claims |
| `magicImmunity` | com_6.08 | 1 |
| `supremeLight` | com2_warlord_1.5.12.7 | 1 |
| `undead` | com2_1.05.11 | 3, all absence or override claims |

The `undead` row is the one that is probably correct rather than a gap: CoM v5.45 removed the
Poison Immunity grant, and CoM2 undead may confer nothing else the calculator models.

### Two shapes that account for most of the 183 keeps

Neither is a defect, and both were repeated often enough to be worth naming.

1. **The extractor cannot reach the discriminator.** `candidates()` enumerates abilities, seven
   unit fields, four identity fields and the top-level combat toggles. It never reaches `rtbType`,
   `rangedDist`, `rtb`, `atk`/`def`/`res`/`figs`, `modernAttacks`, or anything behind
   `aUnitName`/`bUnitName`. Every `no-ablatable-feature` in these three files was this.
2. **`containsRun` is order-sensitive.** `stoningMultiFig` and
   `hiddenGazeStoningKillsPerDefenderFigure` both name their feature and both report
   `name-binds-nothing`, because the tokeniser looks for `stoning touch` / `stoning gaze` as a
   contiguous run and the keys say `stoning multi fig` / `gaze stoning`.

A third, narrower one worth recording: `combinedStoningDeathGaze` and `doomGazeChaosSpawn` report
`every-feature-inert` because `dosGazeAbilityValues` (`combat_special_attacks.js:210-211`) derives
`stoningGaze` and `deathGaze` from one shared modifier, so the two fixture entries are two views of
one byte and one-at-a-time ablation cannot move either. `--interactions` reports the pair as
non-additive, which is the measurement that separates this from real inertness.

## 2026-08-29 — Preset vacuity: sweep re-run, and why the polarity regex has to go

Context: evaluating the deprecated backlog against the rebuilt `SPEC.md` before migration. The
preset-vacuity programme (backlog F61, F68–F79) turned out to rest on rules with no surviving
home, so the sweep was re-run to get current numbers.

Reproduce with `node tools/preset_vacuity_sweep.js --out report.json`. Takes several minutes and
drives a real browser. The JSON report from this run lived in a session scratchpad and is gone;
everything below is reproducible from that command.

### Sweep run

1122 presets swept, **`baselineMismatches: 0`** — every preset reproduced its expected value
before ablation, so the suite is green underneath and all findings below concern discrimination,
not correctness. **389 presets flagged.**

| Class | Meaning | Total | 1.31 | 1.60 | CoM1 | CoM2 | Warlord |
|---|---|---:|---:|---:|---:|---:|---:|
| A | Positive claim, no named feature moves anything | 36 | 16 | 4 | 6 | 4 | 6 |
| B | Negative claim, nothing moves | 87 | 41 | 1 | 5 | 15 | 25 |
| C | Some named feature inert, another live | 101 | 35 | 2 | 5 | 19 | 40 |
| D | Negative claim, some named features inert | 70 | 40 | 1 | 1 | 12 | 16 |
| E | Key binds no feature the preset configures | 47 | 8 | 1 | 2 | 0 | 36 |
| F | Nothing ablatable at all | 31 | 15 | 4 | 8 | 4 | 0 |
| — | `version-dead` (see below) | 35 | 2 | 7 | 10 | 12 | 4 |

These supersede the per-item counts in `Deprecated BACKLOG.md` F68–F79, which were measured
2026-08-22 to 08-26 against a smaller bucket set. Class A is smaller than recorded there (36, not
43) and class D much larger (70, not 37).

By observed shape, which is how the 389 were extracted for adjudication: 193 `some-named-inert`,
123 `nothing-live`, 42 `key-binds-nothing`, 31 `configures-nothing`.

### The regex that guessed claim polarity was wrong where it mattered

Deleted 2026-08-30; the measurement below is why. Whether an inert preset was a defect or a
legitimate assertion-of-absence was decided by `looksNegative`, which matched key tokens (`no`, `not`,
`never`, `immune`, `skips`, `exempt`, …) and desc patterns (`/\bdoes\s+not\b/`, `/\bno\s+effect\b/`,
…). Nothing on the fixture declares it.

Measured on a 12-preset sample adjudicated against the implementing code: **wrong on 6 of 12, and
inverted on the cases that matter.** It missed every genuine absence claim in the sample —
`poisonImmunity` because the token list has `immune` but not `immunity`; `distPenaltyHeroMoM12` on
the phrasing "(no hero exemption)"; all three `lightningResist` presets state their exclusion in
prose no pattern covers. Its one positive match, `longRangeClose` ("no effect"), is a preset that
should *not* be suppressed — see below.

### Ablation-inert is not the same as worthless

The single most useful finding, and the one that would have caused damage if missed. Two presets
are indistinguishable under ablation and completely different in value.

`distancePenalty` (`Calculator/combat_abilities.js:438`) ends `if (longRange && penalty < -10)
penalty = -10;` — a **cap**, which only acts when the penalty is already worse than −10.

| Preset | MoM ladder gives | real line | if written `if (longRange) penalty = -10` |
|---|---|---|---|
| `longRangeClose` (dist 2) | `-10 × floor(2/3)` = 0 | 0, guard false | **−10**, so 1.0 → 0.9 |
| `longRangeMidRange` (dist 5) | `-10 × floor(5/3)` = −10 | −10, guard false | −10, no change |

Both are inert under ablation, so both look vacuous. But `longRangeClose` is the only fixture that
pins the cap's *conditionality*, while `longRangeMidRange` is inert under that mis-implementation
too and its coverage already sits inside `distPenaltyMoM3`. Judging inertness by "would this notice
if the rule were deleted" alone would file both for deletion and lose real coverage.

### What the ablation extractor cannot see

`candidates()` (`tools/preset_vacuity_sweep.js:207`) enumerates only `unit.abilities`, the seven
`UNIT_FIELD_DEFAULTS` fields, the four `IDENTITY_DEFAULTS` fields, and top-level combat toggles. It
never reaches `rtbType`, `rangedDist`, `atk`/`def`/`hp`/`figs`, or anything resolved through
`aUnitName`/`bUnitName`.

So a preset whose real discriminator is a fixture value or roster data reports as unbindable when
it is only unreachable. **Measured: 14 of the 389 are roster-driven, and only 4 of the 42
`key-binds-nothing`** — so the blindness is broader than the roster, and "these are roster presets"
is not the explanation for class E.

### Sibling pairing is cheap evidence

**203 of the 389** have another preset differing in exactly one fixture value that pins a
*different* `expected`. That pairing is the strongest available evidence that a rule is genuinely
under test, and it is mechanically computable — worth handing to any adjudication pass as an input
rather than making each reader hunt for it.

### Corroborations of open backlog items

- `version-dead` (a named feature inert in *every* preset of its version, so the version does not
  implement it or hides its control) reaches backlog F180's finding from the preset side. Two of
  F180's five keys appear — `destruction` (MoM 1.31) and `supernatural` (CoM 1). `bless`,
  `ccFireBreath` and `immolation` do **not**, meaning some preset in those versions does move them.
  The two sweeps measure different populations, so this is a discrepancy to reconcile when F180
  runs, not proof either is wrong.
- `combat.warpReality` is version-dead in Warlord. F190 has since run: the Immolation arm went, its
  fixture with it, and two replacements arrived — a Warlord absence fixture (still inert, declared)
  and a MoM one that is ablation-live. Re-measure before trusting the version-dead line.
- The one version-difference subgroup whose members share a single expectation is
  `{landLinkingRangedCoM, landLinkingRangedCoM2}` at `0/2` — what F75 recorded.

### A vacuity mode no backlog item covers

`expectationsAtHpCap`: **64 presets** state an expectation at or above the defender's whole
hit-point pool, so they cannot distinguish the true total from any larger one. A preset expecting
20 against a 20-HP pool passes whether the answer is 20 or 200. None of classes A–F sees this and
no F68–F79 item is scoped to it.

`roster-shadowed` and `hp-cap-hides` both returned empty this run.

### Two rules with no home

Both came from the deleted `Calculator/CLAUDE.md` and will stop being re-derivable when
`Deprecated BACKLOG.md` is deleted.

1. **The ablation standard**, surviving only as a quotation in `tools/preset_vacuity_sweep.js:7`:
   "prove the expected result changes when the feature is removed; otherwise the preset is not a
   regression test." It is what makes the `presets` suite an authority rather than a set of numbers
   that happen to hold. Note it is positive-only and says nothing about presets asserting an
   absence. An earlier entry recorded this as filed in `PROPOSALS.md`; checked 2026-08-29,
   it is in neither `PROPOSALS.md` nor any binding document. Not proposed.
2. **The adjacent-defect bound**, reconstructed from its ~10 citation sites across the deprecated
   backlog — a test for when a discovered defect folds into the current item versus gets filed
   separately: (1) is it in code this item touches, (2) does a source cite it, (3) is there a preset
   that fails before and passes after, (4) would the fix move numbers outside the item's declared
   version scope. No home anywhere. Not proposed.

## 2026-08-29 — Backlog-to-SPEC evaluation: rulings made

From evaluating all 46 deprecated-backlog items against the rebuilt `SPEC.md`.

- **F180's `destruction` case is not a gating defect.** Ruled: the control being shown in the DOS
  versions is correct — DOS Destruction exists but is hero-only and therefore unimplemented until
  hero mechanics land, which is M3's blocker. Its tooltip (`Calculator/abilities.js:21`) reads
  "Versions: CoM 2, Warlord", accurate about what is *modelled*. Leaves F180 with four keys.
- **F145, F181, F191 and F131 are settled by SPEC rather than open decisions.** Confirmed:
  F145 by *Architecture* ("Version is a dimension of the model…" plus fail-loud, which together
  give Option A with the halt); F181 and F131's boundary by the fail-loud rule; F191 by the purpose
  section's rule that curses are assumed to have landed, which makes Rust's single control the
  specified behaviour rather than a deviation.
- **The polarity regex is to be replaced by a per-preset declaration**, adjudicated by reading each
  preset against the implementing code. Drafted as TASKS T2, approved, and carried out for
  T2.01-T2.10 on 2026-08-30.

## 2026-08-29 — Where the preset suite's 33 s actually goes; T1 dropped

Measured before deciding T1 (extract `readUnitStats` from the DOM), because its premise was that
headless preset evaluation would be materially faster. Chrome, one page load, all 1122 presets with
`expected`, this 8-core laptop. Two instrumented runs: a wrapped-call profile, and an unwrapped
decomposition of `applyPreset` / `recalculate` / `readUnitStats` / `resolveCombat`. Numbers below
are the unwrapped run except the call counts.

| Segment | Time | Share |
|---|---:|---:|
| `runTests()` end to end | 33.2 s | 100% |
| calculation proper — 2× `readUnitStats` + `resolveCombat` | 7.3 s | 22% |
| rendering the two dist panels | 2.1 s | 6% |
| `refreshAbilityFieldVisibility` | 10.9 s | 33% |
| balance: `onVersionChange`, unit locks, control writes, option repopulation | ~13 s | ~39% |
| Playwright + Chrome + dev server startup | ~3 s | once, not per preset |

Calls per 1122 presets: `refreshAbilityFieldVisibility` 3697, `populateSpecialUnitOptions` 5101,
`clearAbilities` 4500, `recalculate` 1441, `applyAbilities` 2256.

Three consequences.

- **The browser is not the cost.** Startup is ~3 s of a ~36 s single-file run, paid once. A jsdom
  harness would do the same DOM work more slowly than Chrome and come out behind — so "run the
  presets headlessly under a DOM shim" is a speed regression, not a speed fix.
- **~72% of the suite is UI bookkeeping no number depends on.** The axis that costs time is
  *rewriting the full control set 1122 times* versus *handing over a state object* — not
  browser versus Node.
- **A cheaper 20–25% exists and was not taken.** `applyPreset` runs the visibility pass 3.3× per
  preset where once at the end would do. Note `updateTypeVisibility` clears version-gated control
  values (`Calculator/ui_abilities.js:498`), so it is the enforcement point for INV-2 — it can be
  run once, not skipped.

Also found while scoping: the `deriveUnitStats` input record is written out as a literal in four
places — `Calculator/ui_card.js:63`, `Calculator/ui_matrix.js:182`, `Calculator/ui_matrix.js:263`
and `tools/unit_checks/assertions.js:67` — and they have drifted. `baseUnitInput` carries
`unitType` and `chaosChannels`, which no other copy has, and omits `identity`, `hurricane`,
`poxHost`, `generic` and `enemyEyeOfHeaven` from its defaults. Unfiled.

Outcome: T1 dropped on the user's call, the speed gain not being worth the price. Two sentences of
`SPEC.md`, *Architecture* did not survive that: one asserting calculation correctness is tested
headlessly (the `PRESETS` authority runs in Chrome), one calling a browser-only calculation a
structural defect (which would re-file T1). Deletion of both proposed in `PROPOSALS.md`. The two
sentences before them stand — the DOM-free calculation layer is what the matrix worker and
`node_unit_checks.js` both rest on, and nothing lints it.

## 2026-08-30 — F218.1 research: what an intact wall segment would have to say

Engine reading (CoM2/Warlord, verified against the reconstruction, not the item text):

- `Combat.AttackAndWallHelpers.pas` — `inferred_InsideWallCoordinates` is the **full** rectangle
  `x=6..9, y=10..13` (16 tiles), but `ctws` (`Combat.WallStateMapping.R5.2l.evidence.md`) maps only
  the **12 perimeter tiles** to wall slots 1..12. The 4 interior tiles (7,11) (7,12) (8,11) (8,12)
  map to slot 0.
- `GetWallState` returns 0 for slot 0, so `destroywall` (`:326`) is a **no-op** on an interior tile:
  it only rewrites state 1 → 2.
- `Combat.ApplyAttack.pas:434-444`: bonus applies when `HasWall and Insidewalls(du) and not
  Insidewalls(au)`; `def := CityWallDefBonus` (+3) and drops to `CityWallBrokenDefBonus` (+1) only
  when `wallState = 2`. State 0 (interior) therefore keeps +3 permanently.
- `CrushWall` (`:204`) fires on `wallcrusher and owner <> defender owner`, before any `ApplyAttack`
  in both `PerformRangedAttack` (`Combat.PerformAttacks.pas:91-92`) and `PerformMeleeAttack`
  (`:146-147`), so the same click sees the reduced bonus.
- Same block also drops to +1 for a `teleporting` or `merging` attacker on a simultaneous non-ranged
  attack. Neither is modelled either; unfiled, same shape as F218.

So "+3" in the UI is genuinely two engine states, 12 tiles vs 4: breakable segment, and unbreakable
interior. There is no DOS reconstruction of Wall Crusher at all (`grep -i crusher` over
`Reference docs/DOS reconstructed/` is empty), so F218.2 as filed is modern-only.

Calculator surface: `cityWalls` is a per-side string `'none' | '1' | '3'`, read at
`Calculator/ui_card.js:100` and `ui_matrix.js:211,296`, mapped to `cityWallBonus` at
`stats.js:517-524` (halts on anything else, naming `MATRIX_CITY_WALL_OPTIONS`), consumed at
`combat_effects.js:722-726` (modern) and `:1071-1077` (DOS). Option list is duplicated between
`index.html:250-253` / `:449-452` and `ui_matrix_properties.js:8`. Five fixtures in
`presets_immunities_and_abilities.js` set `'3'`. `ui_state.js:833-838` already carries one retired
`cityWalls` migration (global → card B).

Migration asymmetry that decides the cost question: **adding** an option value costs no migration
(old blobs keep using values the control still offers), **retiring** `'1'`/`'3'` halts every older
saved state and obliges a stated migration per CLAUDE.md.

## 2026-08-30 — Q32: re-derived from the binary; the CoM2 helptext is wrong, F211 stands

Research only; no code, fixture or reference doc touched. Binary read directly from
`Raw install files/CoM2ModWarlord1.5.12.9/CoMWin1511/Caster.exe` (imagebase `0x400000`), which is
the shared 1.05.11 executable — Warlord is script/INI only, so both versions share this code.

**Every `E8` caller of `@Units@EffectiveDefense` (`0x5965C8`)**, found by scanning all `.text` for
rel32 targets equal to `0x5965C8`. Exactly four:

| call site | function | `spellid` argument |
|---|---|---|
| `0x544980` | `@Aicombat@CombatAttackPriority` (entry `0x5445CC`) | literal 0 |
| `0x5449CA` | same function | literal 0 |
| `0x5B292A` | `@Combat@ApplyAttack` | literal 0 (`6A 00` at `0x5B28ED`) |
| `0x5C13A4` | `@Spells@DamageSpell` | `sp`, a real spell id |

The two `0x5449xx` sites are the AI's target-scoring routine (called only from `0x547F7D`,
`0x548017`, `0x5482A8`, `0x548424`); they move no damage. So `ApplyAttack` really is the only
damage-resolving caller for a unit attack, and `DamageSpell` the only caller that can pass
`spellid > 0`.

**Argument order confirmed empirically**, not assumed. Stack params are pushed right-to-left. At
`0x5B292A` the eight pushes decode to `ismagic2=[ebp-2A]`, `isranged=(at=1)`, `isfire=[ebp-2D]`,
`islightning=[ebp-2C]`, `isbreath=[ebp-2E]`, `ismissile=[ebp-2B]`, `spellid=0`, `extradef=def` —
exactly the local map declared at `Combat.ApplyAttack.pas:24-28`. The literal `0` therefore sits in
the `spellid` slot, not somewhere else.

**The Bless term, disassembled** (`0x5966B8`–`0x596703`): `mov al,[eax+0x53B]` (EncBless);
`and al,[ebp+0x24]` (`ismagic2`); `cmp [ebp+0x0C],0 / jle` (`spellid > 0`); bounds check `<= 0x190`;
`imul 0x17` / `[edx+eax*8+0x34]` (spell realm); `sub 3 / je`, `sub 2 / jne` (Chaos=3, Death=5);
then `+= [0x708148]`. **No `isbreath`, `isfire` or `islightning` appears anywhere in the term.**
The contrast is two instructions away: Resist Elements (`0x59667D`) and Elemental Armor
(`0x5966A2`) each do `mov al,[ebp+0x24] / or al,[ebp+0x14]` — `ismagic2 OR isbreath`. Bless omits
the `or isbreath`. That omission is what the whole question turns on, and it is in the executed
bytes.

**No script override.** Base CoM2 `MASTER.CAS` mentions `EncBless` only as the constant
(`= 51`, line 454); no base script reads it in a combat-defense context. Warlord's
`EncBless → ARMOR+7` lines (`COSpell.CAS:767, 810, 961, 1005, 1046, 1222, 1256, 1299, 1334, 1390,
1437, 1478, 1520`; `CombatEndTurn.CAS:378`) are all inside scripted *damage spells* that recompute
armor by hand, alongside `EncResistElements → +4` and `EncElementalArmor → +12`. They mirror the
`DamageSpell` path, not a unit attack. Warlord ships no unit-attack resolution hook at all.

**Verdict: the binary is right and the CoM2 helptext is wrong; F211's tooltip stands.** Nothing to
change in `blessBreathBonus*` or `blessMeleeFromDeathCoM2`.

**Why the helptext reads the way it does.** The resistance half of the claim is true, which is
probably how the defense half got carried along. `GetEffectiveResistance` takes `realm` directly
(`Combat.ResolutionHelpers.pas:126-127`), and `ApplyAttack` passes the Death realm for Cause Fear
(`:258`), Death Gaze (`:395`), Death Touch (`:502`) and Life Steal (`:511`), and Chaos for
Destruction (`:521`) — so Bless *does* add resistance on gaze and touch. Stoning gaze/touch pass
Nature (`:414`, `:494`) and poison passes realm 0 (`:533`), so Bless misses those. Warlord's
helptext (`Unit rosters/Warlord mod unit data/HELP.TXT:3133`) names precisely that set — "Death
Gaze, Death Touch, Cause Fear, and Life-Steal" — which is byte-accurate and shows the author was
reading the code for that clause.

Warlord then *split* the CoM2 sentence and, on the defense line, dropped "breath, gaze or touch"
in favour of "all fire or lightning damage types and any damage-dealing spells from Chaos and Death
realms". Chaos damage spells are overwhelmingly the fire/lightning ones, so that line is loose
prose for the `DamageSpell` case rather than a claim about breath. CoM2's single sentence
(`Reference docs/CoM2 helptext.TXT:1072`) welds the true resistance clause to a false defense
clause; the parallel `#UA BLESS` entry (`:2261`) repeats it.

Magnitudes are not in dispute and match: `+5` CoM2, `+7` Warlord for defense; resistance `+5` /
`+4`.

Open, minor: whether the missing `or isbreath` is an engine bug worth an H-row for Seravy. It sits
in a run of three terms where the other two have it.

## 2026-08-30 — F218.1 ruled: option 1 (deviation)

User ruled the intact-wall-segment question as a deliberate deviation rather than an input-contract
change: the "+3" `cityWalls` value means an intact, breakable segment, and a Wall-Crusher attacker
always reduces it to +1. The 4-of-16 interior-tile case (slot 0, `destroywall` a no-op, keeps +3)
becomes inexpressible. Proposal filed in `PROPOSALS.md` against CLAUDE.md's Deliberate deviations.
F218.2 is unblocked once the proposal is merged.

## 2026-08-30 — F221: the vacuity sweep leaked its dev server

Cause: `startServer` spawned `playwrightConfig.webServer.command` with `shell: true`, so `child`
was `cmd.exe` and `child.kill()` reaped only the shell — the Python server kept the listen socket
on 8080 and the next Playwright run died with "already used". The success path's `finally` was
running; it was killing the wrong process.

Fix in `tools/preset_vacuity_sweep.js`: `stopServer()` kills the whole tree (`taskkill /F /T /PID`
on Windows, mirroring `killChrome()` in `tools/state_persistence_check.js`; `process.kill(-pid)`
against a `detached` process group elsewhere), `installCleanup()` registers `exit` plus
SIGINT/SIGTERM/SIGHUP/SIGBREAK, and `chromium.launch` moved inside the `try` so a launch failure
releases the server too. A launcher that already exited is never signalled (pid reuse), and if it
died while some other checkout's server answered the readiness probe, `startServer` returns null —
we do not kill a server we did not start.

GPT review (Method A) raised three, all taken: stale-pid kill, `browser.close()` errors swallowed
by a `.catch(() => {})`, and one exit status for every signal.

Verified: success path exit 0 with nothing LISTENING on 8080 afterwards; an injected mid-run throw
likewise leaves the port clear. The Windows abort path could not be exercised — `process.kill(self,
'SIGINT')` is TerminateProcess on Windows, so no handler runs; a real console Ctrl+C does deliver
SIGINT and is what the handlers are for.

Unrelated, seen during verification: the working tree now throws
`step d:nightGoblinsNightVision has no canonical version scope` (`Calculator/steps.js:437`) on the
first preset, so the sweep cannot complete. It appeared between two runs of this session and is
F217.1's area, not this change's.

## 2026-08-30 — F218.1 ruling corrected

The earlier note recorded the wrong deviation. The user's ruling is that Wall Crusher is not
modelled against the wall bonus at all: the `cityWalls` input states the state at resolution time,
already accounting for any Wall Crusher, rather than the calculator transitioning +3 to +1. The
12-tile / 4-tile conflation is absorbed by the same deviation instead of being ruled on separately.
Proposal in `PROPOSALS.md` replaced accordingly. F218.2's scope shrinks: the five writers no longer
need a wall-bonus resolver, and the three inconsistent tooltips still need unifying on the wording
that Wall Crusher is not modelled here.

## 2026-08-31 — F218 deleted from TASKS

The user confirmed the F218.1 ruling settles the whole item: Wall Crusher does not change wall state
in the calculator, so no resolver is needed. F218's section and its priority row (was #5) are gone
and the list renumbered; F218 had no other open subtask.

Dropped with it, unfiled: the three tooltips that describe the flag three ways — `blazeOfGlory`
discloses "wall breaking", `explosive` says "plus Wall Crusher" with no disclosure, `breakthrough`
says "Not modeled: Wall Crusher". Under the ruling `breakthrough`'s wording is the correct one, so
the other two still disagree with it.
