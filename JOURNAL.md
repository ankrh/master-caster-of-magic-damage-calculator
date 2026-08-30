<!-- Tier: JOURNAL. Working notes, findings, provenance, handoffs. Written and pruned freely.
     Never authoritative: treat an entry as a lead to re-verify against the code, not as a reason.
     See global CLAUDE.md. -->

# Journal

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

The gate, re-read at `Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:275-305`:

- Recipient gate `:276` is `GETSTAT(U,SCustomAttribute,1)<>1` — the **permanent** Mechanical flag.
- The scan `:278-300` walks `UNITONTILE` over `NMAXCOMBAT`, drops units whose `GETSTAT(UOT,SOwner,0)`
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

- **Great Unbinding is exempt for a Spirit-Linked unit in the script and is not in the calculator.**
  `UnitCalcPre.CAS:1352` is `IF (HASGLOBAL(W,GEGreatUnbinding)) %OR
  (GETENCHANTMENTFLAG(U,EncSpiritLink,0)>0) THEN { GOTO "NOTUNBINDING"; }`. `greatUnbindingActive`
  (`stats.js:808-810`) has no Spirit Link term, so a base-Fantastic Spirit-Linked unit takes
  −20%/−20%/−2 in the calculator and none in Warlord. The same gate's eligibility term also differs:
  the script reads `FANTASTIC(U)` plus the Undead and three Chaos-Channels enchantment flags, the
  calculator reads `isFantasticBase` alone. Moves numbers; needs its own item.
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

Left open: `TESTS.md`'s *presets* entry still says "101 of 1122 `desc` fields quote a source address
inline". The 1122 was already one behind before this item and is now two; the 101 was not
re-measured, so the whole sentence needs one census rather than a patch.

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
