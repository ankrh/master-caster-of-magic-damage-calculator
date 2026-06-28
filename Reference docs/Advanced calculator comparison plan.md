# Comparison plan: Advanced Damage Calculator (wiki) vs. this calculator

A multi-session todo to compare the MoM wiki's `AdvancedDamageCalculator.js` (henceforth **ADC**)
against this project's `Calculator/` implementation. ADC is a single ~8200-line file; ours is split
across `engine.js`, `combat.js`, `stats.js`, `data.js`, `ui.js`, and the `units_*.js` rosters.

**Goal:** find where the two disagree on combat math, ability handling, or unit data — and decide,
per discrepancy, whether ADC is right, we are right, or it's a deliberate CoM2/CoM1/Warlord
divergence from base MoM.

**Version mapping (the spine of this comparison).** ADC has a `vnum` dropdown
([AdvancedDamageCalculator.js:48-51](AdvancedDamageCalculator.js#L48-L51)) with two base-MoM
versions; our calculator models two MoM versions of its own. They line up:

| ADC `vnum` | Our version token | Relationship | What a divergence means |
|------------|-------------------|--------------|--------------------------|
| `0` = **v1.31** | **`mom_1.31`** | Same game version — apples-to-apples | A genuine bug in one calculator |
| `1` = **v1.40n** | **`mom_cp_1.60.00`** (a.k.a. `mom_1.60`) | Close but *not* identical (1.40n predates 1.60) | Could be a legitimate 1.40→1.60 change **or** a bug — identify and judge each one individually |

So the MoM side is a real head-to-head, not "old external baseline vs. our newer lineage." Our
CoM1/CoM2/Warlord are descendants where deliberate divergence from MoM is expected; ADC has no
counterpart for them, so those stay out of the direct ADC head-to-head (use ADC only as a sanity
reference for inherited base mechanics).

**Working method (per the global rules):** for each item, compare ADC against our implementation,
then report agreements and discrepancies directly in the prompt reply. *Present findings and agree
on interpretation before changing any code*. For 1.31↔`mom_1.31` treat any difference as a suspected
bug to root-cause. For 1.40n↔`mom_cp_1.60.00` treat differences as candidates that need
classifying (real 1.40→1.60 change vs. bug) — small deviations are expected but must each be
explained, not waved away. Cross-check every discrepancy against the `Reference docs/` helptext +
manual for the relevant version.

---

## How ADC is structured (orientation)

- **Core distribution math** (`engine.js` analogues):
  - `binom_arr` / `binom_arr_stride` (ADC:1630/1649) — binomial distributions.
  - `apply_block` (ADC:1606), `get_block_arr` (ADC:1672) — block roll application.
  - `calc_transition_table` (ADC:1696) — per-attack figure-HP state transitions.
  - `make_grand_transition_table` (ADC:1959), `apply_grand_transition_table_to_side` (ADC:1748).
  - `simultaneous_resolve` / `..._lsteal` (ADC:1805/1866) — joint HP-state resolution.
  - `repeat_melee_attack` (ADC:1928), `calc_one_attack` (ADC:1996).
- **Special-attack tables:** `construct_gaze_transition_table` (ADC:2007),
  `apply_touch_to_grand_transition_table` (ADC:2106),
  `apply_immolation_to_grand_transition_table` (ADC:2158), `apply_gazes` (ADC:2279).
- **Melee orchestration:** `calc_melee_grand_transition_table` (2289), `calc_melee_one_side` (2340),
  `calc_melee_main` (2346), `calcround` (2352).
- **Top-level driver:** `calcdamage` (ADC:3108) builds the `mo` two-side stat object and runs rounds.
- **Unit/roster + UI:** `changeunit` (5573), `changerace` (7658), `randomize_hero` (5094),
  `process_enchants` (3069), `process_artifact` (2794), `change_pick`/`craftchange` (heroes/artifacts).

Our analogues: `engine.js` (`singleAttackDmgDist`, `convolveDists`, `calcTotalDamageDist`,
`calcAreaDamageDist`, `calcResistDmgDist`, `calcFigureKillDmgDist`), `combat.js` (`resolveCombat`
and the per-ability modifier functions), `stats.js` (`deriveUnitStats`), `data.js` (ability/enchant
defs + presets), `units_*.js` (rosters).

---

## Todo list (one or more per conversation)

### 1. Core damage-distribution engine (exact math)
- [x] Confirm both use exact binomial math, no Monte Carlo. Compare `binom_arr`/`binom_arr_stride`
      (ADC) vs `binomialPMF`/`binomCoeff` (engine.js).
- [x] Compare the **to-hit → block → damage** pipeline: ADC `get_block_arr`+`calc_transition_table`
      vs our `singleAttackDmgDist`. Same order of operations? Same handling of the 30% base hit/block?
- [x] Compare multi-figure aggregation: ADC grand-transition-table vs our `convolveDists` /
      `calcTotalDamageDist`. Does ADC track *joint* attacker+defender HP state (it appears to) where
      we may treat damage as an independent distribution? Note any modelling-depth difference.
- [x] Figure-HP carry-over / partial wounded top figure: ADC `change_fig`/`woundedTopFigHP` analogue
      vs our `woundedTopFigHP`. Same rounding?

### 2. Combat round structure & sequencing
- [x] Phase order within a round: ranged/thrown → gaze → first strike → melee → counterattack.
      Compare ADC `calcround` against our `resolveCombat`.
- [x] First strike / negate first strike: ADC `fs`/`negatefs` vs our `firstStrike` handling.
- [x] Counterattack penalty: ADC `counterattack_penalty` in `calcround` vs ours.
- [x] Simultaneous resolution vs sequential: ADC `simultaneous_resolve`. Do we model simultaneous
      death (both sides deal damage before removing figures)? This is a likely divergence — flag it.
- [x] Number of rounds / iteration counts (`melee_iter_cts`, `iter_ct` in ADC).

### 3. Ranged & distance
- [x] Distance-to-hit penalty curve: ADC `rangedist` handling vs our `distancePenalty`.
      **Finding:** MoM matches. ADC's dropdown values map to effective range bands 1–2, 3–5,
      6–8, 9–11, 12–14, 15–17, 18–20; `calcround` subtracts `10 * (ranged_dist - 1)` for
      physical ranged attacks only, producing −10/−20/−30/... at 3/6/9/... tiles. Our MoM
      branch now uses `-10 * floor(distance / 3)` for missile and boulder and ignores magic
      ranged, so it agrees for `mom_1.31` and `mom_cp_1.60.00`.
      **Fixed discrepancy:** The previous implementation accidentally capped MoM at −30% for
      distance ≥9. That matched ADC only up to distance 11 and leaked for high-To-Hit physical
      ranged attacks at distance ≥12. The CoM branch had the same spurious −30% cap; CoM helptext
      says the penalty is −10% for each full 4 tiles, so it now uses `-10 * floor(distance / 4)`.
      CoM2 was already uncapped and has no ADC counterpart.
- [x] Long range ability: ADC `lrange` vs our `longRange`.
      **Finding:** Matches. ADC applies a flat −10% penalty whenever physical ranged distance
      would otherwise exceed the first penalty band. Our `longRange` caps any larger penalty at
      −10%, which is equivalent for MoM and also matches the MoM wiki Long Range description.
- [x] Ranged immunity / missile immunity: ADC `missimm` vs `missileImmunityDef`.
      **Finding:** MoM matches for Missile Immunity itself. ADC applies `missimm` only to bow
      ranged (`rangedtype == 4`) and raises defense to 50; it does not apply to boulder or magical
      ranged. Our MoM branch applies `missileImmunityDef` only when `rangedType === 'missile'`
      and sets defense to 50. Both also preserve the MoM 1.31 Weapon Immunity/Missile Immunity
      interaction where an applicable Weapon Immunity shield can prevent the Missile Immunity
      defense-50 replacement.
      **Deferred note:** ADC's bow-ranged Weapon Immunity condition does not include Eldritch
      Weapon in the bypass check, while our implementation treats Eldritch Weapon as a normal
      weapon upgrade. That is a Weapon Immunity / weapon-modifier issue, not a Missile Immunity
      issue; revisit under steps 8–9.

### 4. Gaze attacks (death/stoning/doom)
- [x] `construct_gaze_transition_table` / `apply_gazes` vs our `buildGazeDist` + `calcDoomDist` +
      `deathGazeFailProb`/`stoningFailProb`.
      **Finding:** Single-type Death Gaze and Stoning Gaze agree in shape: one resistance roll per
      defender figure, failed roll kills that figure, and kill damage is capped by remaining HP.
      The value encoding is inverse but equivalent: ADC stores e.g. `dgaze = 13` and tests
      `dgaze > resist + bonus`, while ours stores `deathGaze: -3` and computes
      `effectiveRes = resist - 3 + bonus`.
      **Resolved (was a discrepancy):** Combined Death+Stoning Gaze against a multi-figure defender.
      ADC resolves both saves per current figure, so each figure can die at most once and the combined
      kill chance is `1 - deathSurvive * stoningSurvive`. Our `buildGazeDist` now does the same: it
      combines the two into a single joint per-figure kill probability
      (`jointFail = 1 - (1 - stoningFail) * (1 - deathFail)`) and applies one
      `calcFigureKillDmgDist(defAlive, jointFail, ...)`, instead of convolving two independent
      figure-kill distributions. This matches ADC and the wiki (a figure dies if it fails *either*
      roll, once). The earlier independent convolution overstated full-kill outcomes on multi-figure
      targets (e.g. 4 figures, 5 HP, 20% Death + 20% Stoning fail averaged ~7.941 instead of the
      correct 7.2); that no longer occurs.
      **Additional ADC-specific note:** ADC gates melee-phase gaze on hidden `gazeranged > 0`, even
      for Doom Gaze, because the wiki calculator keeps a hidden gaze attack value on gaze units.
      Our generic model allows Doom Gaze to fire from `doomGaze` alone. For real MoM roster units
      this is mostly an input-model difference rather than a confirmed game-mechanic bug.
- [x] Doom gaze strength & blazing-eyes interaction (`blazingEyesDoomGazeForUnit`).
      **Finding:** ADC's Doom Gaze damage is exact, once per attacking unit, capped by target HP,
      with no to-hit or defense rolls. Our `buildGazeDist` applies `doomStr` once, not per source
      figure, so the core MoM behavior agrees. CoM2's `Blazing Eyes` has no ADC counterpart; our
      `blazingEyesDoomGazeForUnit` matches CoM2 helptext/manual: Chaos creatures gain Doom Gaze 3,
      or +1 if they already have Doom Gaze. Our CoM2 `Focus Magic` handling also matches the
      helptext/manual statement that magical ranged, Doom Gaze, or breath gain +3 strength.
      **ADC-specific note:** ADC suppresses the hidden physical gaze hit when `doomgaze` is present
      (`if (!mo.doomgaze[side]) calc_one_attack(...)`), so Chaos Spawn's hidden gaze value is used
      as a carrier/gate, not extra physical damage. Our data does not give Chaos Spawn a separate
      hidden gaze attack, so normal roster behavior remains aligned; manually setting both
      `doomGaze` and `gazeRanged` in our UI intentionally produces both components.
- [x] Gaze resistance modifiers, bless/chaos-nature defence terms in ADC `construct_gaze_...`.
      **Finding:** ADC applies Bless to Death Gaze resistance as `resist + 3 * bless`, and applies
      Resist Elements / Elemental Armor to Stoning Gaze resistance via `resist + chaosnature_def`.
      Our MoM branch matches with `bResDeath = res + Bless` and `bResStoning = res + elemResistBonus`.
      The CoM/CoM2/Warlord differences are deliberate version splits: Bless is +5 resistance in CoM
      and CoM2, +4 resistance in Warlord, and Resist Elements gives +4 stoning resistance only in
      CoM-era rules. CoM/CoM2 helptext and manuals agree that Bless protects against Death/Chaos
      gaze/touch effects, while petrification is Nature and belongs to the elemental-resistance path.
      **Defense-side finding:** ADC sends the hidden physical gaze component through the breath-style
      defense bucket (`shields_vsbreath`), where Bless applies against Death/Chaos units' gaze and
      `chaosnature_def` applies against Chaos/Nature units' gaze. Our dedicated `vsGaze` bucket
      mirrors that MoM behavior: Bless applies when the gaze attacker is Death/Chaos; Elemental
      Armor / Resist Elements applies to Stoning-only gaze in MoM. Later CoM branches intentionally
      diverge per their helptext/manual wording.

### 5. Touch attacks (poison / stoning touch / death touch / dispel evil)
- [x] `apply_touch_to_grand_transition_table` vs our `poisonFailProb`, `stoningFailProb`,
      `deathTouchFailProb`, `dispelEvilFailProb`, `exorciseFailProb`.
      **Finding:** The core touch math matches for MoM. ADC applies each touch effect after building
      the ordinary melee transition table and gates melee touch attacks on the delivering melee
      attack having positive strength (`attack[att_side] < 1` returns before touch effects). Our
      `touchAttackFires`/`meleeTouchParams` gate does the same for melee, and the thrown/ranged/gaze
      callers deliberately attach touch effects to those delivery phases. ADC's touch helper takes
      one layer per positive attacking figure count; our callers pass the active attacker figure
      count directly. Both therefore scale poison and kill-touch rolls with attacker figures, not
      defender figures. This agrees with the wiki touch-attack reference: touch attacks are
      per-attacker-figure, while gaze attacks are per-defender-figure.
      **Resistance/immunity finding:** Poison is the nonmagical exception: ADC blocks it only through
      poison immunity or effective resistance 10+, and keeps Resist Magic out of poison by adding
      +5 resistance but also setting `pois_resist_penalty = 5`. Our `poisonFailProb` reads base
      resistance rather than `bResM`, so Resist Magic likewise has no effect. ADC removes stoning
      touch against Stoning Immunity/Magic Immunity and removes death touch against Death
      Immunity/Magic Immunity/Righteousness; our failure-probability helpers produce the same MoM
      outcomes through large immunity bonuses. ADC's Dispel Evil affects Death or Chaos units only,
      at -4 resistance normally and -9 for undead; our MoM `dispelEvilFailProb` matches that target
      and penalty shape, with the local created-undead distinction retained for CoM-era data.
      **Modifier finding:** ADC's Stoning Touch uses the same Nature protection bucket as stoning
      gaze (`chaosnature_def`), so Resist Magic, Resist Elements, and Elemental Armor apply. Death
      Touch uses Death protection (`Bless`, Resist Magic, Righteousness/Magic/Death immunity). Our
      `buildResistanceContext` gives Stoning Touch `bResM + elemResistBonus(...)` and Death Touch
      `bResM + Bless`, so the MoM resistance buckets agree. CoM/CoM2/Warlord differences here are
      deliberate version splits already encoded in `elemResistBonus` and `Bless` values.
- [x] Poison strength & resistance penalty (`pois_resist_penalty`).
      **Finding:** ADC's poison damage distribution is exactly `poison_strength * attacking_figures`
      independent Bernoulli failures, capped by remaining target HP. The `att_to_hit` parameter name
      is misleading in this helper; for poison it is the poison fail probability
      `1 - ((resist - pois_resist_penalty) * 0.1)`. Our `calcResistDmgDist(atkFigs * poisonStr,
      poisonFail, cap)` is equivalent. The only ADC `pois_resist_penalty` source found in the
      relevant path is Resist Magic, where it cancels the +5 resistance bonus for poison. Our code
      achieves the same result by never passing Resist Magic into `poisonFailProb`.
- [x] Stoning/death-touch as figure-kill vs damage — compare modelling.
      **Finding:** ADC models stoning/death/dispel-style touch effects as whole-figure kill damage:
      failed rolls use `binom_arr_stride(..., def_fig_hp)`, so each failed roll contributes exactly
      one full defender figure's HP, capped at the target's current total HP. Our
      `calcFigureKillDmgDist(numRolls, pFail, defHP, cap)` is the same model. This means both
      calculators count a kill-touch failure as `defHP` damage even when the current top figure is
      already wounded, with final overkill capped only by remaining total HP. That is consistent
      between ADC and us, but it is a modelling convention to keep in mind when checking wounded
      top-figure edge cases.
      **Combination note:** Unlike gaze step 4's combined Death+Stoning case, ADC applies multiple
      touch powers sequentially as separate per-attacker-figure touch distributions. A single
      attacking figure with two instant-kill touch powers can therefore kill up to two defender
      figures if both rolls fail. Our independent convolution of Stoning Touch, Death Touch, Dispel
      Evil, and Exorcise matches that composition and also matches the wiki note that an item with
      multiple touch powers may destroy multiple figures.
      **Scope note:** ADC also has `redtouch` (item Destruction/disintegration) in this same helper.
      This project does not currently expose a Destruction touch ability, so no runtime comparison
      was made for that item-power-only branch.

### 6. Immolation / wall of fire / fire damage
- [x] `apply_immolation_to_grand_transition_table` vs our `immolationStr`/`immolationBlocksRanged`/
      `wallOfFire*`. Does immolation bypass block (shields_vsimmo)? Compare.
      **Finding:** Immolation does **not** bypass block in ADC. ADC builds `att_arr =
      binom_arr(0.7, att_immo)`, i.e. standard 30% spell To Hit, then applies `get_block_arr`
      with `shields_vsimmo`, defender To Block, and Invulnerability. Our immolation/Wall of Fire
      paths use `calcAreaDamageDist(..., toHitImmolation/wallOfFireToHit, vsImmolation, toBlock,
      ...)`, so the hit → block → damage model agrees for full-health figures. Large Shield,
      Bless, Resist Elements / Elemental Armor, Magic Immunity, Fire Immunity, and Righteousness
      all feed the same "vs immolation" shield bucket before block rolls.
      **Armor Piercing finding (fixed):** ADC never halves the immolation bucket — there is no
      `ap_* → shields_vsimmo` (only melee/ranged/breath get halved, ADC:2560-2569), and the wiki's
      Immolation Damage / Armor Piercing Damage pages list AP nowhere among immolation's modifiers.
      Our `computeDefenseProfile` previously halved `defImm` under attacker Armor Piercing; that was
      a bug, now removed (immolation defense is `defLSNoVert + blessImm + elemImm`, no AP). Locked by
      the `immolationArmorPiercingIgnored` preset.
      **Strength / trigger finding:** ADC is MoM-only and uses Immolation strength 4. Our MoM
      branches also use strength 4; CoM/CoM2/Warlord deliberately use strength 10 per helptext
      and manuals. Immolation-with-ranged and Immolation-with-breath are *unimplemented* in ADC —
      both paths are literal `// todo: apply immolation` stubs (ADC:2679, 2695), and ADC fires
      Immolation only in the gaze phase and in melee. So our `mom_1.31` ranged-Immolation bug (which
      `mom_cp_1.60.00` and later versions correctly drop, per the CoM manual change note) has no ADC
      head-to-head; it rests on the wiki + helptext/manual, not ADC. Wall of Fire has no ADC
      UI counterpart, but our modelling uses the same area-fire distribution and defense bucket;
      the later-version strengths are deliberate: MoM 5, CoM/CoM2 10, Warlord 12 at 60% To Hit
      against a single figure.
      **Wounded-top-figure cap (fixed):** Area Damage caps each figure at its *current* HP, where
      only the lead figure can be wounded (from previous combat) and all others are full — see the
      MoM wiki Area Damage page ("takes into account injuries already sustained by a 'lead' figure
      from previous combat … only the 'lead' figure in a unit can be injured"). `calcAreaDamageDist`
      now takes a `topFigHP` parameter; every Immolation and Wall of Fire call passes
      `woundedTopFigHP(cap, hp)`, so the wounded top figure is capped at its remaining HP and the
      rest at full `hp`. Fresh full-HP targets are unaffected (the cap is a no-op when `topFigHP == hp`).
      **Timing — simultaneous vs sequential (we are correct, ADC is wrong):** The MoM wiki is
      explicit that Immolation, as a touch-triggered attack, is calculated *simultaneously* with its
      delivering attack against the *pre-attack* figure count — Touch Attack page: "all Melee Damage
      and Touch Attacks are delivered simultaneously: the game first calculates the effect of these,
      and only then … applies the damage and kills off Figures"; the Basilisk+Immolation example
      states the target "will be considered as having 8 figures for both abilities, regardless of how
      many they are likely to lose to each attack individually." Our model computes the melee (or
      thrown/gaze) damage and the Immolation area damage independently against the same pre-phase
      figure state and sums them — matching this. ADC instead folds the melee into its grand
      transition table *first* and applies Immolation to the **post-melee** figure count
      (ADC:2334-2335), so when the delivering attack kills a figure in the same phase, ADC's
      Immolation hits one fewer figure than the game does (it under-counts). No code change: ours is
      already correct.
- [x] Fire immunity: ADC `fireimm` vs `fireImmunityDef`.
      **Finding:** Matches for MoM. ADC folds Fire Immunity into `shields_vsimmo = 50` together
      with Magic Immunity and Righteousness, so fire-immune targets still pass through the same
      block-roll machinery but effectively block all normal Immolation dice. Our MoM
      `fireImmunityDef` likewise raises the Immolation/Wall of Fire defense bucket to 50. The
      CoM/CoM2/Warlord branch raises the bucket to 100, which is a deliberate local convention for
      full immunity in those versions and is consistent with their helptext/manual wording that
      Fire Immunity negates fire attacks, including Immolation / Wall of Fire fire damage.

### 7. Life steal / regeneration / vampirism
- [ ] `simultaneous_resolve_lsteal` vs our `calcLifeStealDmgDist` / `lifeStealEffective`.
- [ ] Regen modelling (does either restore figures mid-combat?). ADC `regen`.
- [ ] Cross-check vampirism — recent commits changed it to match the manual; ADC may predate that.

### 8. Defensive abilities & immunities
- [ ] Invulnerability (`invuln`, `def_invuln`) — flat damage reduction. Compare application point.
- [ ] Weapon immunity (`weapimm` / `weaponImmunityDef`), magic immunity (`magimm` /
      `magicImmunityDef`), illusion immunity (`illimm`), death/cold/poison/stoning immunity.
- [ ] Lucky (`lucky`), large shield (`lshield` / `largeShield`), non-corporeal (`noncorp`).
- [ ] Resist-all / holy bonus / righteousness (`resistall`, `holybonus`, `righteousnessDef`).
- [ ] Bless and realm-of-unit flags (`lifeunit/deathunit/chaosunit/natureunit/sorcunit`).

### 9. Attack-strength & to-hit modifiers
- [ ] Armor piercing (`ap_melee` etc.) — how ADC halves defence vs our handling.
- [ ] Illusion attacks (`illusion_melee`) negating defence.
- [ ] Holy / bless / weapon-type (`wtype`/`weaponBonus`) bonuses.
- [ ] Level bonuses: ADC `changelevel` vs our `getLevelBonuses` — verify per-level stat tables.

### 10. Unit roster & loading
- [ ] How ADC stores units (race × unit index arrays in `changeunit`/`changerace`) vs our
      `units_*.js`. Spot-check a few shared units' base stats for agreement.
- [x] Establish ADC's baseline version — **done.** `vnum` dropdown selects v1.31 (`mom_1.31`) or
      v1.40n (`mom_cp_1.60.00`). See the version-mapping table at the top. The `vnum` value is read
      as `mo.vnum` ([calcdamage:3187](AdvancedDamageCalculator.js#L3187)) and branches in combat
      include Lucky/to-hit handling and Weapon Immunity/Missile Immunity interaction, plus one
      hero-pick spot ([5156](AdvancedDamageCalculator.js#L5156)).
- [ ] Hero randomization & artifacts (`randomize_hero`, `process_artifact`, `craftchange`) — likely
      out of scope for us, but note any combat-relevant artifact effects.

### 11. Enchantments / global toggles
- [ ] `process_enchants` (ADC) vs our `ENCHANTMENT_DEFS` + global-toggle wiring (true light,
      darkness, node aura, city walls). Map ADC's enchant set to ours; note gaps.

### 12. Edge cases & numeric output
- [ ] Damage cap handling (`cap` param in our dist functions) — does ADC cap distributions?
- [ ] Rounding/formatting (`round_str`, ADC:2770) vs our display — ensure not mistaken for a math
      difference.
- [ ] Zero-figure / overkill / 1-HP-figure edge behaviour.
