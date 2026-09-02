// --- Combat Resolution: special attacks and immunity defenses ---
// Touch and gaze kill probabilities, gaze/damage-spell distributions, phase breakdown
// labels, Life Steal, and the immunity/Immolation/Wall of Fire defense helpers.

// --- Rider reachability ---
// Whether the engine reaches a rider's resistance roll at all. Each `*FailProb` below answers 0
// for two different reasons — the block was skipped outright, or the roll was made and cannot
// succeed — and the resolver has to tell them apart: a skipped block emits no histogram, while a
// roll that cannot succeed emits one with all its mass at 0 (`CLAUDE.md`, *Input/output
// contract*). Each predicate is named once here and read by both the probability beside it and
// the placement map `touchParams` builds (`combat_phases.js`), so the two cannot drift.
//
// One predicate serves both engine families because both spell the same test, in different
// places. Caster.exe repeats `not Units[du].magicimmunity` inside each rider's own condition
// (`Combat.ApplyAttack.pas:477`, `:491`, `:499`, `:507`, `:519`) and omits it from Poison's
// (`:526`). The DOS builds hoist it: `!(Attribs_1 & USA_IMMUNITY_MAGIC)` at `131:0x99F67` opens
// the whole rider group and its false arm jumps to `0x9A1E6`, past Dispel Evil, Stoning Touch,
// Death Touch, Life Steal and Destruction together, which is why the individual DOS blocks at
// `0x9A010` and `0x9A094` carry only their own Stoning/Death immunity test. DOS Poison sits
// outside that gate at `0x9A2D8`, behind `USA_IMMUNITY_POISON` alone. `Reference docs/DOS
// reconstructed/combat.c`. That answers the question the F223 run left open.
function poisonReachesRoll(defAbilities) {
  return !hasAbil(defAbilities, 'poisonImmunity');
}

function stoningTouchReachesRoll(defAbilities) {
  return !hasAbil(defAbilities, 'stoningImmunity') && !hasAbil(defAbilities, 'magicImmunity');
}

function deathTouchReachesRoll(defAbilities) {
  return !hasAbil(defAbilities, 'deathImmunity') && !hasAbil(defAbilities, 'magicImmunity');
}

function lifeStealReachesRoll(defAbilities) {
  return !hasAbil(defAbilities, 'deathImmunity') && !hasAbil(defAbilities, 'magicImmunity');
}

// --- Poison Touch ---
// Compute probability of failing a single poison resistance roll.
// MoM: d10, success if roll ≤ Resistance. pFail = max(0, (10 - res) / 10).
// CoM: universal -1 save modifier → pFail = max(0, (11 - res) / 10).
// Poison Immunity skips the roll outright rather than granting resistance.
// Magic Immunity does NOT protect from Poison: the effect is dispatched with realm 0,
// and the resistance routine gates Magic Immunity's bonus on realm != 0. The same gate
// excludes Righteousness, Elemental Armor, Resist Elements, Bless and Resist Magic.
function poisonFailProb(defRes, defAbilities, version) {
  const isCoM = version && version.startsWith('com');
  if (!poisonReachesRoll(defAbilities)) return 0;
  const penalty = isCoM ? 1 : 0;
  const effectiveRes = defRes - penalty;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// --- Stoning Touch ---
// Compute probability of failing a stoning resistance roll.
// MoM: d10, success if roll ≤ (Resistance + modifier). The stoningTouch value is negative
// (e.g. -3 means a -3 penalty to the target's resistance roll).
// Stoning Immunity and Magic Immunity both skip the roll outright rather than granting
// resistance — Magic Immunity via a gate that jumps past the whole touch/gaze group.
// Righteousness does not apply: the realm is Nature, and Righteousness covers Chaos and Death.
function stoningFailProb(defRes, defAbilities, modifier) {
  if (!stoningTouchReachesRoll(defAbilities)) return 0;
  const effectiveRes = defRes + modifier;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// --- Death Touch ---
// Same kill-roll mechanics as Stoning Touch, but with the Death-realm immunity model:
// Death Immunity and Magic Immunity each skip the roll outright. Righteousness is a real
// +30 resistance bonus (the realm is Death, which Righteousness covers) and reaches `defRes`
// as a step of the resistance transform, not as a second bonus here.
// Each attacking figure makes one resistance roll on the target; a failed roll kills
// one defender figure.
function deathTouchFailProb(defRes, defAbilities, modifier) {
  if (!deathTouchReachesRoll(defAbilities)) return 0;
  const effectiveRes = defRes + modifier;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// --- Dispel Evil / Exorcise (shared) ---
// Both are resist-or-banish effects that kill one fantastic figure per attacking
// figure on a failed resist roll, with no defense roll. They share this core: a
// positive `penalty` is the total Resistance reduction on the target. Magic Immunity
// skips the roll outright; a final effective Resistance >= 10 is also immune.
// The realm-targeting and penalty values differ per effect (see callers below).
//
// **Neither caller tests the defender's Spirit Link, and neither may.** Spirit Link is Warlord's
// alone (`PROVENANCE[spiritLink]`, `stats_identity.js`), and the engine's write is a derivation
// one: `UnitCalc.CAS!NOTICEAGE!+2..+3 ": Effect of Sentience, enchanted fantastic unit could not be targeted by fantastic-only spell and gain +2 resistance :" "IF GETENCHANTMENTFLAG(U,EncSpiritLink,1) THEN { SETSTAT(U,AFantastic,0,0); }"` clears the calculated `Fantastic` flag at the tail of the
// recalculation, which the `d:spiritLink` step models and which is the last write of that field
// in the Warlord chain. A spirit-linked target therefore reaches these functions projected as
// `normal_*` and falls out on each caller's own unit-type test, with nothing left for a second
// test to do. A defender-side `spiritLink` read here was that second copy, and because the key
// exists in no other engine it turned the rider off outright in `mom_1.31`, `mom_cp_1.60.00`,
// `com_6.08` and `com2_1.05.11` (`SPEC.md`, *Versions*, invariant 4; F168 deleted both).
// Magic Immunity is not tested here: it belongs to the two callers' reachability predicates,
// `dispelEvilReachesRoll` and `exorciseReachesRoll`, which both run before this.
function fantasticResistKillFailProb(defRes, defAbilities, penalty) {
  const effectiveRes = defRes - penalty;
  if (effectiveRes >= 10) return 0;
  return Math.min(1, Math.max(0, (10 - effectiveRes) / 10));
}

// True for a *created* undead target (Undead/Animate Dead/Revenant), which both
// Dispel Evil and Exorcise hit with an extra penalty — base Death creatures do not
// get this bonus penalty, matching the original MoM Dispel Evil behaviour.
function isCreatedUndeadTarget(defUnitType, defAbilities) {
  return defUnitType === 'fantastic_death'
    && (hasAbil(defAbilities, 'undead') || hasAbil(defAbilities, 'animated'));
}

// The Dispel Evil block's own eligibility: the DOS arms test the target's race before they
// roll, so a target outside it is not "resisted", the rider is never dispatched at all.
function dispelEvilPenalty(defUnitType, defAbilities) {
  if (isCreatedUndeadTarget(defUnitType, defAbilities)) return 9;
  if (defUnitType === 'fantastic_death' || defUnitType === 'fantastic_chaos') return 4;
  return null;
}

function dispelEvilReachesRoll(defAbilities, defUnitType) {
  return dispelEvilPenalty(defUnitType, defAbilities) !== null
    && !hasAbil(defAbilities, 'magicImmunity');
}

// --- Dispel Evil ---
// Touch attack. Only affects fantastic_death (created-undead penalty -9, else -4) and
// fantastic_chaos (penalty -4). Other unit types are immune.
//
// Dispel Evil and Exorcise are **one shared rider under two names**, the touch-flag counterpart
// of the repurposed enchantment bits (`COMBAT_VERSION_SCOPES`, `steps.js`). `ATT_DISPEL_EVIL` is
// attack flag `0x0800` in all three DOS builds (`combat.c:88`) and each build compiles its own
// block behind it: 131 and 160 test race Chaos/Death and apply -4, -5 more for a mutated target;
// CoM 1 tests signed race `>= RACE_FIRST_FANTASTIC` and applies -3, -3 more, and exempts Spell
// Lock. `Caster.exe` names the rider `exorcise` in `AttackFlagsT` and has no Dispel Evil member
// at all, so the modern engines carry only the successor. A Dispel Evil read firing outside MoM
// is therefore the same engine write under the wrong name, exactly as an Eldritch Weapon read
// firing in CoM 1 would be. Scope is per touch key, routed by `TOUCH_KEY_SCOPE_IDS`
// (`combat_effects.js`); this formula id is its MoM entry.
// STAT-FORMULA[dispelEvilTouchRider]
// PROVENANCE[dispelEvilTouchRider]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/combat.c@span:29:a622cfdbc42ac471b8aeb63d
function dispelEvilFailProb(defRes, defAbilities, defUnitType) {
  if (!dispelEvilReachesRoll(defAbilities, defUnitType)) return 0;
  return fantasticResistKillFailProb(defRes, defAbilities,
    dispelEvilPenalty(defUnitType, defAbilities));
}

// CoM 6.08's common 0x0800 flag retains the executable-table name Dispel Evil, but the
// version-specific consumer ignores Spec_Att_Attrib and uses literal -3. Its persistent-unit
// Spell Lock bit skips the resistance call altogether.
function exorciseReachesRoll(defAbilities, defUnitType, version) {
  if (!String(defUnitType || '').startsWith('fantastic_')) return false;
  if (version === 'com_6.08' && hasAbil(defAbilities, 'spellLock')) return false;
  return !hasAbil(defAbilities, 'magicImmunity');
}

// --- Exorcise (CoM-era successor to Dispel Evil) ---
// Same resist-or-banish mechanic as Dispel Evil, but since CoM it affects fantastic
// creatures of ANY realm (not just Death/Chaos), and uses the ability's own strength
// as the base penalty. `modifier` is the Exorcise strength (e.g. -1 → -1 penalty).
// Created-undead targets suffer an additional -3 (vs Dispel Evil's additional -5).
//
// The other half of the shared rider described above: CoM 1's block for flag `0x0800`, and the
// `exorcise` member of `Caster.exe`'s `AttackFlagsT`, which the modern rider loop reads first of
// the six. Neither MoM build compiles this arm, so the key is out of scope there.
// STAT-FORMULA[exorciseTouchRider]
// PROVENANCE[exorciseTouchRider]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/combat.c@span:34:29a4d4421788f0f43bb2ab70 | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:13:b67a607c5a672579af407603
function exorciseFailProb(defRes, defAbilities, defUnitType, modifier, version) {
  if (!exorciseReachesRoll(defAbilities, defUnitType, version)) return 0;
  const basePenalty = version === 'com_6.08' ? 3 : -modifier;
  const penalty = basePenalty + (isCreatedUndeadTarget(defUnitType, defAbilities) ? 3 : 0);
  return fantasticResistKillFailProb(defRes, defAbilities, penalty);
}

function destructionReachesRoll(defAbilities, version) {
  return destructionInVersion(version) && !hasAbil(defAbilities, 'magicImmunity');
}

// --- Destruction ---
// CoM2 and Warlord only. Each surviving attacking figure makes one resistance-roll
// attempt inside ApplyAttack's figure loop. A failed attempt runs `Result.field_00 := 150`
// — an assignment of a flat constant, not an `Inc` and not the target's remaining HP — so
// repeated failures neither add nor multiply, and whatever Exorcise and Stoning Touch had
// already put in that bucket is discarded (`Combat.ApplyAttack.pas`, the `$005B2DC2` write).
// Treated as a Chaos-realm attack, so Bless protects: callers pass the Bless-boosted
// Chaos-realm resistance (`ResChaos`), the realm `Combat.ApplyAttack.pas:521` hands the
// roll as `inferred_ChaosRealm`.
// Righteousness is deliberately absent — it is MoM-only, and Destruction is CoM2/Warlord-only,
// so the two can never meet; a Righteousness branch here would be dead code.
// Death Immunity and Stoning Immunity do NOT apply — the realm is Chaos, not Death. Magic
// Immunity does: its help text names Doom, Illusion and Poison as the only riders it fails
// to stop on a magical ranged attack, and Destruction is not among them.
// The stored value is a resistance modifier in the same sense as Stoning/Death Touch
// (negative = penalty); the roster ships Destruction=0, i.e. an unmodified roll.
// Which engines the calculator rolls the rider in. `TOUCH_KEY_SCOPE_IDS` scopes Dispel Evil and
// Exorcise because their *placement* differs by build; Destruction is placed everywhere the
// ability is set, so its version test lives here, beside the roll, and the placement map reads
// the same predicate rather than restating it.
//
// The scope is the calculator's, not the engines'. All three DOS builds compile an
// `ATT_DESTRUCTION` block — `Reference docs/DOS reconstructed/combat.c`, the `0x9A19E` block,
// which adds the target's `hits` in MoM/CP and a flat 100 in CoM 1 — but the only writer of the
// flag is `BU_Apply_Item_Attack_Specials` (`unitcalc.c`, `IP_DESTRUCTION` at `131:0x8E550`), an
// item power. Hero equipment is deferred by SPEC, so no DOS unit the calculator can build
// carries the flag, and the DOS arm is unmodelled rather than absent (TASKS `M3`, blocked by
// F41). Widening this predicate before that lands would draw a Destruction panel no DOS
// matchup can reach.
function destructionInVersion(version) {
  return !!(version && version.startsWith('com2_'));
}

function destructionFailProb(defRes, defAbilities, modifier, version) {
  if (!destructionReachesRoll(defAbilities, version)) return 0;
  const effectiveRes = defRes + modifier;
  if (effectiveRes >= 10) return 0;
  return Math.min(1, Math.max(0, (10 - effectiveRes) / 10));
}

// --- Death Gaze ---
// Same roll mechanics as Stoning Gaze. Death Immunity and Magic Immunity each skip the
// roll outright; Righteousness' +30 is already inside `defRes`.
// The skip pair is the same two immunities the Death-realm touch block tests, so
// `deathTouchReachesRoll` above is its one home rather than this block carrying a second copy.
// The hover chain a gaze histogram shows reads the same predicate, so the probability and the
// chain cannot disagree about whether the roll happened (F222.5).
function deathGazeFailProb(defRes, defAbilities, modifier) {
  if (!deathTouchReachesRoll(defAbilities)) return 0;
  const effectiveRes = defRes + modifier;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// --- The DOS shared special-value byte ---

// The DOS record carries one `Spec_Att_Attrib` byte (+0x15) and every consumer below reads it:
// the touch riders as a save modifier (the code negates it at the read site), Holy Bonus and
// Resistance to All as the magnitude a per-player maximum is taken over. So the record is one
// number plus flags, not a number each. The third element is the sign that consumer's
// calculator ability value carries, which is how the rosters have always stored it.
//
// Poison Touch's repeat count shares the roster's single `Gaze/Poison` column, and is modelled
// here as a consumer of the same byte, but the reconstruction names its loop bound separately
// (`Poison_Strength`, `combat.c`) and no evidence document states that field's offset. That one
// membership is therefore uncited — a T8-class gap, listed here rather than folded into the
// citation below.
//
// The gazes read the same byte but are selected by `ranged_type` (103/104/105) rather than by a
// flag of their own, so they take no entry here; the shared strength/type slot selects them.
// Holy Bonus and Resistance to All are this unit's *provided* value; the received side is a
// separate control and the two contend in `mergeAbilityCalcValue`.
const DOS_SPECIAL_CONSUMERS = [
  ['stoningTouch', 'Stoning Touch', -1],
  ['deathTouch', 'Death Touch', -1],
  ['lifeSteal', 'Life Steal', -1],
  ['poison', 'Poison Touch', 1],
  ['holyBonus', 'Holy bonus', 1],
  ['resistanceToAll', 'Res. to all', 1],
];

// Dispel Evil, CoM 1 Exorcise, and Destruction dispatch alongside the touch riders but their
// modifiers are literals in the DOS code — -4, -3, and 0 — so they never read the byte. They
// therefore stay ordinary ability values rather than joining this block, which is reserved for
// the byte's consumers.

// Consumers the shared slot's type selects rather than a flag, so they get no DOS control.
const DOS_GAZE_KEYS = ['stoningGaze', 'deathGaze', 'doomGaze'];

// CoM2 and Warlord replaced the shared byte with independent per-effect fields.
function dosSpecialIsActive(version) {
  return !version.startsWith('com2');
}

// The gazes read the shared byte through the shared `ranged_type`: 103 runs the stoning kill
// loop, 105 the death loop, and 104 runs both — which is why a unit with two gazes is
// necessarily 104, and why the two share one modifier. Selecting a non-gaze type therefore
// removes the gaze outright; the record cannot hold both.
// PROVENANCE[dosGazeTypeContention]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:23:ba289a70c76622d0c1837f6e | Reference docs/DOS reconstructed/combat.c@span:23:d3690441e61c73a51c7266fd
function dosGazeAbilityValues(rangedType, magnitude) {
  const mag = Math.abs(magnitude || 0);
  const stoning = rangedType === 'gaze_stoning' || rangedType === 'gaze_multiple';
  const death = rangedType === 'gaze_death' || rangedType === 'gaze_multiple';
  return {
    stoningGaze: stoning ? -mag : null,
    deathGaze: death ? -mag : null,
    // Doom damage is the shared *strength* slot, not the byte — `deriveUnitStats` reads it from
    // there for type 104 — so the ability value contributes nothing in the DOS versions.
    doomGaze: 0,
  };
}

// The DOS read side. Consumer values are derived from the one byte and its flags rather than
// from per-effect inputs, so the record's contention holds however the state was reached —
// roster, preset, share link or hand edit. `consumers` is marshalled by the caller: each entry
// names the ability definition the byte feeds, the sign it carries, whether its flag is set,
// and the value the same calc key receives from elsewhere (`undefined` on the matrix path,
// where the received side is overlaid afterwards).
// PROVENANCE[dosSharedSpecialByte]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:20:058c9ea7d6c14be3d698e06a | Reference docs/DOS reconstructed/combat.c@span:22:cfb3908957e79fe942a78119 | Reference docs/DOS reconstructed/combat.c@span:19:2479e7f72df0edd5cef33c89
function dosSpecialAbilityValues({ version, magnitude, rangedType, consumers }) {
  if (!dosSpecialIsActive(version)) return {};
  const mag = Math.abs(magnitude || 0);
  const out = {};
  for (const { def, sign, checked, received } of consumers) {
    const calcKey = def.calcKey || def.key;
    // `null` (absent) and 0 (present, modifier −0) are different states for a numcheck: the
    // engine tests the flag, so an unset flag must read back as null rather than 0.
    if (def.type === 'numcheck') {
      out[calcKey] = checked ? sign * mag : null;
    } else {
      out[calcKey] = mergeAbilityCalcValue(def, received, checked ? sign * mag : 0);
    }
  }
  return { ...out, ...dosGazeAbilityValues(rangedType, mag) };
}

// --- Gaze realm ---
// A gaze's damage realm is a property of the single `ranged_type` field, not of the
// attacker's own realm. MoM 1.31 classifies 103 Stoning Gaze -> Nature, 104 Multi/Doom
// Gaze -> Chaos, 105 Death Gaze -> Death (WIZARDS.EXE switch at 0x9A79E; the gaze rows are
// byte-identical in CP 1.60 and CoM 1). Because the stoning kill loop fires on 103 or 104
// and the death loop on 104 or 105, a unit carrying *both* gazes is necessarily type 104 —
// which is also what gives Doom Gaze its automatic damage.
//
// In the DOS versions the flags below are themselves derived from `ranged_type` (see
// `dosGazeAbilityValues`), so this reads the type through them rather than treating them as
// independent inputs: stoning-only is 103, death-only 105, both 104. CoM2 and Warlord keep
// genuinely independent gaze fields, which is why the inference stays flag-shaped here.
function gazeRealm(atkAbilities) {
  const stoning = abilDefined(atkAbilities, 'stoningGaze');
  const death = abilDefined(atkAbilities, 'deathGaze');
  if ((abilVal(atkAbilities, 'doomGaze', 0) || 0) > 0 || (stoning && death)) return 'chaos';
  if (death) return 'death';
  if (stoning) return 'nature';
  return null;
}

// Build the combined gaze damage distribution delivered by `atk` against `def`.
// Includes the hidden physical ranged component, followed by doom gaze (exact damage),
// stoning-kill rolls and death-kill rolls.
// Blur applies only to the hidden physical ranged component, not doom gaze.
//
// The hidden component is rolled **once per attacking figure**: it runs inside
// `BU_ProcessAttack`'s per-figure loop, whose bound is the gazer's own figure count
// (WIZARDS.EXE body 0x99F5A, back-edge 0x9A576, identical in CP 1.60 and CoM 1). The two
// kill loops sit *before* that loop and are bounded by the **defender's** figure count
// (0x99E0C stoning, 0x99EAB death), so they resolve once per attack — hence `defAlive`
// below but `atkAlive` above.
//
// `doomFigs` is the count the doom damage is delivered over, and the two engine families
// differ. The DOS builds assign `hits = attack_strength` for ranged type 104 inside that same
// per-figure loop (0x9A1E6 -> 0x9A204, annotated `com1:=` throughout, so CoM 1 shares the
// site), which makes their doom damage scale with the gazer's figure count; the caller passes
// the gazer's living figures. CoM2 and Warlord instead call `ApplyAttack` with a literal `1`
// for Doom Gaze alone (0x5B3858 attacker, 0x5B3982 retaliation) while both kill-roll gazes
// pass `LivingFigures(au)`, so their doom lands once and the caller passes 1.
// The only part of a gaze that is scored against the target's Defense is its conventional
// component, and Black Sleep turns even that into Doom damage. Read by the builder below and by
// the hover chain a gaze row's base-roll histogram shows: a pure kill or Doom gaze consults no
// Defense at all, so it must not claim it was scored against one (F222.5).
function gazeConsultsDefense(atk, conventionalAsDoom) {
  return (atk.effectiveGazeRanged || 0) > 0 && !conventionalAsDoom;
}

function buildGazeDist(atk, def, atkAlive, defAlive, defRemHP, stoningFail, deathFail, doomStr, defDefStat, defInvulnBonus, blurChance, blurBuggy, defTopFigHP, conventionalAsDoom = false, defToBlockOverride = null, minDamageFromHits = null, doomFigs = 1) {
  if (defAlive <= 0 || defRemHP <= 0) return [1];
  let dist = [1];
  const defStat = (defDefStat != null) ? defDefStat : def.def;
  const defToBlock = (defToBlockOverride != null) ? defToBlockOverride : def.toBlock;
  if (atk.effectiveGazeRanged > 0) {
    const gazeFigs = Math.max(1, atkAlive);
    dist = gazeConsultsDefense(atk, conventionalAsDoom)
      ? calcTotalDamageDist(gazeFigs, atk.effectiveGazeRanged, atk.toHitRtb, defStat, defToBlock, def.hp, defInvulnBonus, blurChance, blurBuggy, defTopFigHP, minDamageFromHits)
      : calcDoomDist(gazeFigs, atk.effectiveGazeRanged);
  }
  // Doom Gaze: exact damage, no rolls, no immunities, delivered `doomFigs` times.
  if (doomStr > 0) {
    dist = convolveDists(dist, calcDoomDist(Math.max(1, doomFigs), doomStr));
  }
  // Stoning- and death-gaze kill rolls, convolved **independently**. The two DOS loops are
  // sequential and mutually blind: both iterate `0 .. Cur_Figures-1` over an unchanging
  // `Cur_Figures` (0x99E07 and 0x99EA6 re-read `es:[bx+0xd]`, which nothing between 0x99D97
  // and 0x99EAE writes) and neither identifies a figure, so a figure that fails both rolls is
  // charged twice — `hits` into `local_damage[2]` from the stoning loop at 0x99D73-0x99E0F and
  // `hits` into `local_damage[0]` from the death loop at 0x99E11-0x99EAE. It is not only a
  // bucket split: `BU_ApplyDamage` derives `figures_lost` from the sum of the three buckets
  // (`total / bu->hits`, 0x8747E) and clamps only in overkill (0x874D3), so the second charge
  // raises expected kills across the normal range too. The joint per-figure probability this
  // replaced was true of the figure count and false of the damage record, which is what the
  // calculator publishes (`Reference docs/DOS reconstructed/F225.1 gaze kill adjudication.md`).
  //
  // A modern gaze is its own `ApplyAttack` call and passes one of the two as 0, so this
  // degenerates to a single kill roll there. The DOS caller passes `stoningFail` as 0 and
  // routes that loop through the rider channel instead, because it is the one part of the gaze
  // that writes the irreversible bucket (`combat.c:4419`).
  if (stoningFail > 0) {
    dist = convolveDists(dist, buildGazeKillDist(def, defAlive, defRemHP, stoningFail));
  }
  if (deathFail > 0) {
    dist = convolveDists(dist, buildGazeKillDist(def, defAlive, defRemHP, deathFail));
  }
  return dist;
}

// One gaze kill loop's damage: one resistance roll per *defending* figure, each failure
// charging that figure's full `hits`. Split out of `buildGazeDist` so the DOS stoning loop can
// be convolved into its own damage bucket and its own histogram while the death loop stays on
// the gaze's base distribution.
function buildGazeKillDist(def, defAlive, defRemHP, fail) {
  if (defAlive <= 0 || defRemHP <= 0) return [1];
  return calcFigureKillDmgDist(defAlive, fail, def.hp);
}

// Build a deterministic doom damage distribution.
// Doom damage skips attack rolls and defense rolls: total = figs * str. Nothing truncates it
// inside the phase (`CLAUDE.md`, *Architecture*), so the total is exact even past the target.
function calcDoomDist(figs, str) {
  const totalDmg = Math.max(0, figs * str);
  const dist = new Array(totalDmg + 1).fill(0);
  dist[totalDmg] = 1;
  return dist;
}

// ApplyDamageSpell adjusts the returned damageT after DamageSpell has selected its category.
// The tests are strictly ordered and mutually exclusive, so one positive record gains exactly
// one point even if more than one field is positive. A wholly non-positive record is unchanged.
// STAT-FORMULA[applyDamageSpellAmplifier]
// PROVENANCE[applyDamageSpellAmplifier]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Spells.DamageSpells.pas@span:10:7409aeb6eaa969da9307bc69 | Reference docs/Caster binary/Combat.AmplifiedDamage.pas@span:26:1f64b59e444155839ce664c8
function applyDamageSpellAmplifier(damageRecord, amplified) {
  const adjusted = {
    normal: damageRecord.normal,
    irrec: damageRecord.irrec,
    undead: damageRecord.undead,
  };
  if (!amplified) return adjusted;
  if (adjusted.normal > 0) adjusted.normal += 1;
  else if (adjusted.irrec > 0) adjusted.irrec += 1;
  else if (adjusted.undead > 0) adjusted.undead += 1;
  return adjusted;
}

// Which arm of the spell path a cast takes. The modern engine returns before reading Defense
// on Magic Immunity, and Black Sleep turns the spell into Doom damage, which reads no Defense
// either; only `rolled` scores against one. Dispatched on by `calcDamageSpellDist` below, and
// read by the hover chain an Immolation histogram shows so the two cannot disagree (F222.5).
function damageSpellArm(version, targetAbilities, nonmagic = false) {
  if (!(version && version.startsWith('com2_'))) return 'rolled';
  if (hasAbil(targetAbilities, 'magicImmunity') && !nonmagic) return 'immune';
  if (hasAbil(targetAbilities, 'blackSleep')) return 'doom';
  return 'rolled';
}

function damageSpellConsultsDefense(version, targetAbilities, nonmagic = false) {
  return damageSpellArm(version, targetAbilities, nonmagic) === 'rolled';
}

// Shared direct-spell damage path for Immolation and Wall of Fire. The modern engine exits
// on Magic Immunity before inspecting Black Sleep. Black Sleep then turns the spell into Doom
// damage. Modern Area iterations use a full HP-per-figure cap. A non-Area spell instead uses the
// ordinary attack spill loop: the wounded top figure supplies the first boundary, and every
// crossed boundary rerolls Defense and reapplies Invulnerability before the remainder continues.
// STAT-FORMULA[damageSpellResolution]
// PROVENANCE[damageSpellResolution]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Spells.DamageSpells.pas@span:8:678a9503cf9c8ef4b13b7642 | Reference docs/Caster binary/Spells.DamageSpells.pas@span:23:c169d74794484ec3c2d57202 | Reference docs/Caster binary/Spells.DamageSpells.pas@span:34:6c7e183574c858090c5884e5 | Reference docs/Caster binary/Spells.DamageSpells.pas@span:10:7409aeb6eaa969da9307bc69 | Reference docs/Caster binary/Combat.AmplifiedDamage.pas@span:26:1f64b59e444155839ce664c8
function calcDamageSpellDist(targetFigs, atkStr, toHit, defStr, toBlock, hp,
  invulnBonus, minDamageFromHits, topFigHP, version, targetAbilities,
  area = true, nonmagic = false, amplified = false) {
  const modern = !!(version && version.startsWith('com2_'));
  const arm = damageSpellArm(version, targetAbilities, nonmagic);
  if (arm === 'immune') return [1];
  let dist;
  if (arm === 'doom') {
    dist = area
      ? calcDoomDist(targetFigs, Math.min(atkStr, hp))
      : calcDoomDist(1, atkStr);
  } else if (area) {
    const areaTopFigHP = modern ? undefined : topFigHP;
    dist = calcAreaDamageDist(targetFigs, atkStr, toHit, defStr, toBlock, hp,
      invulnBonus, minDamageFromHits, areaTopFigHP);
  } else {
    dist = calcTotalDamageDist(1, atkStr, toHit, defStr, toBlock, hp,
      invulnBonus, 0, false, topFigHP, minDamageFromHits);
  }

  // Wall of Fire routes its DamageSpell result through the normal category. Keep the category
  // adjustment explicit here so this total-damage projection uses ApplyDamageSpell's exact
  // normal -> irrecoverable -> undead priority instead of an equivalent but category-blind shift.
  if (!amplified) return dist;
  const adjusted = new Array(dist.length + 1).fill(0);
  for (let damage = 0; damage < dist.length; damage++) {
    if (dist[damage] < 1e-15) continue;
    const damageRecord = applyDamageSpellAmplifier(
      { normal: damage, irrec: 0, undead: 0 }, amplified,
    );
    adjusted[damageRecord.normal + damageRecord.irrec + damageRecord.undead] += dist[damage];
  }
  return adjusted;
}

// --- Attack names ---
// The name of the ordinary attack roll a phase makes. `melee` is the base-roll slot in every
// phase (`TOUCH_RIDER_KEYS`, combat_fear_and_touch.js), so the slot holds the gaze's own damage
// in a gaze row and the Thrown or Breath roll in a Thrown row; the UI labels it with the row's
// own attack rather than printing "Melee" there. A row that resolves two directions at once
// (melee + counter, 2nd strike + counter) names one attack per side, which is why these are
// per-side names and not one string. The phase-label builders below compose their `label` out of
// the same functions, so the row heading and the rider panel inside it cannot drift apart.
function thrownAttackName(thrownType, hasted) {
  const name = thrownType === 'thrown' ? 'Thrown'
             : thrownType === 'fire' ? 'Fire Breath'
             : 'Lightning Breath';
  return hasted ? 'Hasted ' + name : name;
}

const FIRST_STRIKE_ATTACK_NAME = 'First Strike';

function meleeAttackName(hasted) {
  return hasted ? 'Hasted Melee' : 'Melee';
}

function secondStrikeAttackName(hasted) {
  return hasted ? 'Hasted 2nd Strike' : '2nd Strike';
}

function counterAttackName(hasted) {
  return hasted ? 'Hasted Counter-attack' : 'Counter-attack';
}

// Phase label for a gaze attack given which gaze types are active. Also the gaze row's attack
// name: the side prefix is added by `gazePhaseLabel`, and a rider panel sits in a column that
// already states its side.
function gazeLabel(stoning, death, doom) {
  const count = (stoning ? 1 : 0) + (death ? 1 : 0) + (doom ? 1 : 0);
  if (count > 1) return 'Gaze Attack';
  if (stoning) return 'Stoning Gaze';
  if (death) return 'Death Gaze';
  if (doom) return 'Doom Gaze';
  return 'Gaze';
}

function appendBreakdownTouchLabels(label, params) {
  const {
    poisonTouch = false,
    stoningTouch = false,
    deathTouch = false,
    dispelEvil = false,
    exorcise = false,
    destruction = false,
    lifeSteal = false,
    immolation = false,
  } = params;
  let out = label;
  if (poisonTouch) out += ' + Poison Touch';
  if (stoningTouch) out += ' + Stoning Touch';
  if (deathTouch) out += ' + Death Touch';
  if (dispelEvil) out += ' + Dispel Evil';
  if (exorcise) out += ' + Exorcise';
  if (destruction) out += ' + Destruction';
  if (lifeSteal) out += ' + Life Steal';
  if (immolation) out += ' + Immolation';
  return out;
}

function thrownPhaseLabel(params) {
  const {
    thrownType,
    hasted,
    poisonTouch,
    stoningTouch,
    deathTouch,
    dispelEvil,
    exorcise,
    destruction,
    lifeSteal,
    immolation,
  } = params;
  return appendBreakdownTouchLabels(thrownAttackName(thrownType, hasted),
    { poisonTouch, stoningTouch, deathTouch, dispelEvil, exorcise, destruction, lifeSteal, immolation });
}

function gazePhaseLabel(side, params) {
  const {
    stoningGaze,
    deathGaze,
    doomGaze,
    poisonTouch,
    stoningTouch,
    deathTouch,
    dispelEvil,
    exorcise,
    destruction,
    lifeSteal,
    immolation,
  } = params;
  return appendBreakdownTouchLabels(side + ' ' + gazeLabel(stoningGaze, deathGaze, doomGaze), {
    poisonTouch,
    stoningTouch,
    deathTouch,
    dispelEvil,
    exorcise,
    destruction,
    lifeSteal,
    immolation,
  });
}

function firstStrikeBreakdownLabel(params) {
  return appendBreakdownTouchLabels(FIRST_STRIKE_ATTACK_NAME, params);
}

function secondStrikeCounterBreakdownLabel(params) {
  const { counterHasted, ...touchParams } = params;
  let label = appendBreakdownTouchLabels(secondStrikeAttackName(true), touchParams);
  label += ' + ' + counterAttackName(counterHasted);
  return label;
}

function counterBreakdownLabel(params) {
  const { counterHasted, ...touchParams } = params;
  return appendBreakdownTouchLabels(counterAttackName(counterHasted), touchParams);
}

function meleeBreakdownLabel(params) {
  const { hasted, counterHasted, ...touchParams } = params;
  let label = appendBreakdownTouchLabels(meleeAttackName(hasted), touchParams);
  label += ' + ' + counterAttackName(counterHasted);
  return label;
}

// --- Life Steal ---
// Compute whether life steal can affect the target, and return the modifier.
// Returns null if immune: Death Immunity and Magic Immunity each skip the roll outright, and an
// effective Res ≥ 10 can never fail a save. Righteousness' +30 is already inside `defRes`, which
// matters here beyond the gate: the same `defRes` is the resistance the drain magnitude is a
// margin over, so a bonus applied only to this test would be spent as damage.
// The lifeSteal value is the resistance penalty (e.g. -3 means target's res is penalized by 3).
function lifeStealEffective(defRes, defAbilities, modifier) {
  if (!lifeStealReachesRoll(defAbilities)) return null;
  const effRes = defRes + modifier;
  if (effRes >= 10) return null;
  return modifier;
}

// Whether one selected attack call reaches its touch-rider dispatcher.
//
// DOS `BU_ProcessAttack` aborts a call whose *live* strength is 0 just before the dispatcher.
// MoM 1.31 keeps that abort; CP 1.60 and CoM 1 overwrite its conditional jump with `EB 03`, an
// unconditional jump past it, so an already-admitted call still dispatches riders at 0 strength.
//
// `Caster.exe` tests no strength at all, base or calculated. `ApplyAttack` leaves early only on
// `figs <= 0` ($005B19D9), and each of its six rider blocks is gated on the attack type, the
// attacker's rider flags and the defender's immunities alone ($005B2994..$005B2E6F). The
// per-channel test the modern engine does make lives in the caller and reads the *calculated*
// value: `PerformMeleeAttack` issues its melee calls unconditionally and gates Thrown and Breath
// on `Units[au].thrown|firebreath|lightningbreath > 0`, while `PerformRangedAttack` gates only on
// `ammo > 0`. The calculator carries that channel gate where the engine does — at phase admission,
// in `modernAttackChannels` (`combat_phases.js`) — so the modern arm here is unconditional, and no
// arm reads the card's base value.
// STAT-FORMULA[touchDispatcherAdmission]
// PROVENANCE[touchDispatcherAdmission]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/combat.c@span:21:cab055592de9a7dcacc5683e | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:12:925a0ecea8452d215c0226e1 | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:27:136dbc9a5a7d34e8fd32dfda | Reference docs/Caster binary/Combat.PerformAttacks.pas@span:36:da1652787ca5b24382ba9800
function touchAttackFires(effectiveAtk, version) {
  return version === 'mom_1.31' ? effectiveAtk > 0 : true;
}

// Check whether a gaze attack fires for a given unit.
// Stoning/Death Gaze are attached to the hidden gaze ranged component (or, for Chaos Spawn,
// the Doom Gaze) and fire only while that hidden attack strength is > 0. In MoM (1.31 and
// 1.60) the hidden attack must be present; in later versions (CoM+) gaze always fires.
// Same effective-vs-base split as touch delivery: MoM 1.31 uses *effective* hidden strength
// (the v1.31 bug suppresses gaze when reduced to 0); MoM 1.60 uses *base* hidden strength
// (so reducing the effective value to 0, e.g. via Black Prayer, no longer disables the gaze).
function gazeAttackFires(effectiveGazeRanged, effectiveDoomGaze, baseGazeRanged, baseDoomGaze, version) {
  if (version === 'mom_1.31') return effectiveGazeRanged > 0 || effectiveDoomGaze > 0;
  if (version === 'mom_cp_1.60.00') return (baseGazeRanged || 0) > 0 || (baseDoomGaze || 0) > 0;
  return true;
}

// Ruler of Underworld is Caster.exe's King of Underworld global: during combat it derives the
// aggregate Wraith Form flag for the owner's units, which is what carries Weapon Immunity and
// Non-Corporeal. The DOS engines have no such global, so the effect does not exist there and the
// control is hidden in all three — `COMBAT_VERSION_SCOPES` (`steps.js`) is the home for that fact
// and this is its one gate.
// STAT-FORMULA[rulerOfUnderworldEligibility]
// PROVENANCE[rulerOfUnderworldEligibility]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:1771129697cc08c42e75f953 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:5:35fc242da2227f6e691cb83f
function rulerOfUnderworldActiveForUnit(abilities, version) {
  return combatEffectInVersion('resolution:rulerOfUnderworldEligibility', version)
    && hasAbil(abilities, 'rulerOfUnderworld');
}

// Eldritch Weapon is guarded by enchantment bit `0x00200000` in both MoM builds. CoM 1 reuses that
// same bit for Mystic Surge — the reconstruction records the repurposing as an explicit alias
// (`unitcalc.c:51`, `#define UE_MYSTIC_SURGE UE_ELDRITCH_WEAPON`) and gives each build its own
// block. So CoM 1's -10pp To Block is real and is Mystic Surge's; an Eldritch Weapon read firing
// there would double the same engine write under a second name.
// STAT-FORMULA[eldritchWeaponEligibility]
// PROVENANCE[eldritchWeaponEligibility]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:aa0a43e91e01a69c33497368
function eldritchWeaponActiveForUnit(abilities, version) {
  return combatEffectInVersion('resolution:eldritchWeaponEligibility', version)
    && hasAbil(abilities, 'eldritchWeapon');
}

// Blazing March's magic-weapon grant is CoM 1's alone among the DOS builds. Slot `0x0A` is one
// spell with two names — `unitcalc.c:237`, `#define CE_BLAZING_MARCH_ATTACKER
// CE_METAL_FIRES_ATTACKER` — and each engine compiles its own block for it: CoM 1's sets
// `Weapon_Plus1` at `com1:0x9048B`, and its whole block reads `131:—  160:—`, so neither MoM
// build contains it. MoM's block for the same slot is Metal Fires (`131:0x9065F..0x9072B`),
// whose own `Weapon_Plus1` write the calculator already carries as `metalFiresActive`
// (`stats.js`). A Blazing March read firing in MoM is therefore the same engine write under a
// second name, exactly as an Eldritch Weapon read firing in CoM 1 would be. CoM2 and Warlord
// grant it instead through the calculated `EncMagic` flag, which never reaches this DOS path.
// STAT-FORMULA[blazingMarchMagicWeapon]
// PROVENANCE[blazingMarchMagicWeapon]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:27:ed30ef34c9d4d2d39878f571 | Reference docs/DOS reconstructed/unitcalc.c@span:20:65ce76678d0f8928a37f1972
function blazingMarchMagicWeaponForUnit(abilities, version) {
  return combatEffectInVersion('resolution:blazingMarchMagicWeapon', version)
    && hasAbil(abilities, 'blazingMarch');
}

function hasWeaponImmunityEffect(abilities, version) {
  return hasAbil(abilities, 'weaponImmunity') || hasAbil(abilities, 'invulnerability')
      || hasAbil(abilities, 'wraithForm')
      || rulerOfUnderworldActiveForUnit(abilities, version);
}

// Caster.exe passes `EncMagic or magicranged` from ApplyAttack to EffectiveDefense.
// King/Ruler of Underworld suppresses only the attacker's ApplyMagicWeapons material grant.
// An independent EncMagic source survives whether it runs before or after that helper. The
// derived unit record keeps those sources separate so this helper mirrors the engine input.
function modernAttackIsMagic(attacker, defAbilities, magicranged) {
  if (magicranged) return true;
  if (hasAbil(defAbilities, 'rulerOfUnderworld')) {
    return !!attacker.encMagicIndependentOfMaterial;
  }
  return !!attacker.encMagic;
}

// --- Weapon Immunity eligibility ---
// Triggers only against Normal units carrying a normal (non-magical) weapon. Which attacks can
// present that weapon at all is decided by the caller: `dosDefenseForAttack` for the DOS
// engines, whose immunity mask never admits Thrown in MoM 1.31 and never admits a gaze in any
// build, and `computeCasterDefenseForAttack` for Caster.exe. The bonus each engine then applies
// is its own ordered step: `dosEffectiveDefense:weaponImmunityFloor` (MoM, raise to 10),
// `dosEffectiveDefense:weaponImmunityBonus` (CoM 1, +8) and `effectiveDefense:weaponImmunity`
// (CoM2 +8, Warlord +10).
// v1.31 bug: Generic units (Trireme, Galley, Warship, Catapult) bypass WI regardless of attack type.
function weaponImmunityApplies(defAbilities, atkWeapon, atkUnitType, version, atkGeneric) {
  if (!hasWeaponImmunityEffect(defAbilities, version)) return false;
  // Ruler of Underworld preserves Weapon Immunity against magical/mithril/adamantium
  // weapons, but still only against normal-unit attacks.
  if (atkWeapon !== 'normal' && !rulerOfUnderworldActiveForUnit(defAbilities, version)) return false;
  if (!isNormalUnitType(atkUnitType)) return false;
  // MoM 1.31 marks generic hulls as having a magical weapon, so they never set
  // the attack-side Weapon Immunity flag.
  if (version === 'mom_1.31' && atkGeneric) return false;
  return true;
}

// Wraith Form and Ruler of Underworld both grant Non-Corporeal in addition to Weapon Immunity.
function hasNonCorporealEffect(abilities, version) {
  return hasAbil(abilities, 'nonCorporeal')
      || hasAbil(abilities, 'wraithForm')
      || rulerOfUnderworldActiveForUnit(abilities, version);
}

// --- Rage (Warlord) ---
// +1 melee (and +1 ranged, if the unit has a ranged attack) per figure the unit has lost.
// "Figures lost" = original figures − figures currently alive, so it folds in BOTH
// pre-combat casualties (from the Damage field) and casualties taken earlier in this
// combat — the alive count passed in already reflects cumulative in-combat damage.
// Only boosts an attack that already exists (base strength > 0); never creates one.
// STAT-FORMULA[rageEffectiveAttack]
// PROVENANCE[rageEffectiveAttack]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:13:325ede6460c3b3ea9b78f8a2
function applyRage(baseAtk, unit, aliveNow) {
  if (!combatEffectInVersion('resolution:rageEffectiveAttack', unit.combatVersion)) return baseAtk;
  if (baseAtk <= 0 || !hasAbil(unit.abilities, 'rage')) return baseAtk;
  return baseAtk + Math.max(0, unit.figs - aliveNow);
}

// --- Immolation ---
// Immolation strength: 4 in MoM, 10 in CoM/CoM2. The modern DamageSpell path applies
// Chaos Conjunction's exact extended-real 1.34 multiplier and Delphi Trunc conversion
// to spell ID 99. Wall of Fire is spell ID 87 and does not use this helper.
// Delivered as a Fireball effect (spell 96) with an explicit strength override; how each value
// was established is `Reference docs/MoM binary analysis.md`, *Immolation and Wall of Fire are
// both Fireball*.
// STAT-FORMULA[immolationStrength]
// PROVENANCE[immolationStrength]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/combat.c@span:38:88b87d43f6f27bfce4600ec3 | Reference docs/DOS reconstructed/combat.c@span:9:932433dee123be7e2cfc4a2c | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:6:61977524faa49301ba9b8fa3 | Reference docs/Caster binary/Spells.DamageSpells.pas@span:3:d7f972d281da4e1635757ec7 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/spells.ini@span:3:5caa7f065c55dac1ccd2d5c1 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/spells.ini@span:3:5caa7f065c55dac1ccd2d5c1
function immolationStr(version, chaosConjunction = false) {
  const modern = !!(version && version.startsWith('com2_'));
  const base = (version && (version.startsWith('com_') || modern)) ? 10 : 4;
  return modern && chaosConjunction ? Math.trunc(base * 1.34) : base;
}

// Which attack phases carry Immolation — the single home for that table.
// `Caster.exe` runs it under one attack-type test, `Units[au].immolation and (at = ATmelee)`
// ($005B24D8..$005B253A, `Reference docs/Caster binary/Combat.ApplyAttack.pas`), so the modern
// Thrown, Breath, Ranged and Gaze calls all skip it. DOS `BU_ProcessAttack` makes no attack-type
// test: melee, thrown, breath and gaze all carry Immolation in every build, and ranged carries it
// only in MoM 1.31, the 1.50 patch having removed it there.
// Reaching the melee call is a separate question, owned by `touchAttackFires` above.
function immolationFiresInPhase(version, phase) {
  if (version && version.startsWith('com2_')) return phase === 'melee';
  return phase !== 'ranged' || version === 'mom_1.31';
}

// --- Wall of Fire ---
// Wall of Fire: town enchantment. Inflicts a Ranged Magical Immolation Damage
// attack on every attacker figure that melees a unit inside the town.
// Strength 5 in MoM; strength 10 in CoM/CoM2; strength 12 in Warlord.
// Fires once per combat, at Step 3 in the melee sequence: AFTER thrown/breath
// and gaze phases, BEFORE the melee damage + counter-attack.
// Targets only the attacker (A) - the unit passing through the wall.
// Does not fire in ranged combat (attacker shoots from outside the wall).
// Which immunities stop it, and which defence terms apply, are the spell path's defence
// descriptor rather than this strength function's: the `immolation` arm of `dosDefenseForAttack`
// and of `computeCasterDefenseForAttack` (`combat_effects.js`), cited where each is written.
// They are not uniform across builds — CoM 1 has no Righteousness step at all.
// Warlord: hits a single figure at strength 12 instead of every figure at 10.
// Delivered as a Fireball effect (spell 96); Fireball's area flag is what makes the attack land
// on every figure, and Warlord's removal of that flag is what reduces it to one.
// How each strength and To Hit was established: `Reference docs/MoM binary analysis.md`,
// *Immolation and Wall of Fire are both Fireball*; `Reference docs/CoM2 data tables.md`,
// *Wall of Fire*.
// STAT-FORMULA[wallOfFireStrength]
// PROVENANCE[wallOfFireStrength]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/combat.c@span:7:ff40688656520f07bf1f3557 | Reference docs/DOS reconstructed/combat.c@span:9:932433dee123be7e2cfc4a2c | Reference docs/DOS reconstructed/spelldat.c@span:30:33d3c975302b2b73b0595bca | TABLE=Reference docs/Script source/CoM2 1.05.11 base/SPELLS.INI@span:12:85344419a06ccdd501b45c67 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/SPELLS.INI@span:17:760d893e17440a46164523c2
function wallOfFireStr(version) {
  if (version && version.startsWith('com2_warlord')) return 12;
  if (version && (version.startsWith('com_') || version.startsWith('com2_'))) return 10;
  return 5;
}

// Wall of Fire To Hit: standard 30% spell To Hit, except Warlord raises it to 60%.
// STAT-FORMULA[wallOfFireToHit]
// PROVENANCE[wallOfFireToHit]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=TABLE=Reference docs/Script source/CoM2 1.05.11 base/SPELLS.INI@span:12:85344419a06ccdd501b45c67 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/SPELLS.INI@span:17:760d893e17440a46164523c2
function wallOfFireToHit(version) {
  return (version && version.startsWith('com2_warlord')) ? 0.6 : 0.3;
}

// Warlord removes Wall of Fire's Area flag, selecting one ordinary spill-capable attack.
// STAT-FORMULA[wallOfFireAreaShape]
// PROVENANCE[wallOfFireAreaShape]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=TABLE=Reference docs/Script source/CoM2 1.05.11 base/SPELLS.INI@span:12:85344419a06ccdd501b45c67 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/SPELLS.INI@span:17:760d893e17440a46164523c2
function wallOfFireSingleFigure(version) {
  return !!(version && version.startsWith('com2_warlord'));
}

// FirewallEffect reads the calculated Teleporting/Merging fields through HasTeleMerge.
// STAT-FORMULA[wallOfFireEligibility]
// PROVENANCE[wallOfFireEligibility]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.CallClosureHelpers.pas@span:6:39bf9c419009b48c27e6c076
function wallOfFireEligible(version, attackerAbilities) {
  return !(version && version.startsWith('com2_')
    && (hasAbil(attackerAbilities, 'teleporting') || hasAbil(attackerAbilities, 'merging')));
}

// The two-card projection treats Card B as the present opposing-owner unit in AmplifiedDamage's
// combat scan. Copies do not stack because this result is Boolean.
// STAT-FORMULA[wallOfFireAmplifierProjection]
// PROVENANCE[wallOfFireAmplifierProjection]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Spells.DamageSpells.pas@span:10:7409aeb6eaa969da9307bc69 | Reference docs/Caster binary/Combat.AmplifiedDamage.pas@span:26:1f64b59e444155839ce664c8
function wallOfFireAmplified(version, opposingAbilities) {
  return !!(version && version.startsWith('com2_warlord_'))
    && hasAbil(opposingAbilities, 'amplifier');
}
