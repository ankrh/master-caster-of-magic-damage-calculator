// --- Combat Resolution: phase builders and their contexts ---
// Touch parameters, combat-unit normalization, the paired To-Hit/resistance/defense/To-Block
// contexts, and the builders for each combat phase resolveCombat runs.

// Touch-attack parameters for `self` striking `other`. Shared by every delivery
// phase (melee, thrown, ranged, gaze) — the caller supplies the phase-specific
// gates:
//   fires:             whether touch attacks deliver at all this phase
//                      (per-phase touchAttackFires / Black Sleep / gaze-active rule)
//   record:            normalized global/melee/ranged flag record for this phase
// `touchFlagRecords` is an internal normalized representation. When present it owns
// placement; record values are already effective calculator values. The ordinary card and
// every DOS roster ability remain common flags and therefore use the ability fallback.
//
// The key comes from the caller, so this one read stands for all seven riders and no per-site
// version test can express their differing scopes. `touchKeyInVersion` (`combat_effects.js`) is
// that scope, per key: without it a MoM-only Dispel Evil fired in CoM 1, CoM2 and Warlord and a
// CoM-plus Exorcise fired in both MoM builds, through the ability fallback below (F158).
function placedTouchValue(self, key, record, ver) {
  if (!touchKeyInVersion(key, ver)) return null;
  const fallback = abilDefined(self.abilities, key) ? self.abilities[key] : null;
  if (!self.touchFlagRecords) return fallback;
  const records = self.touchFlagRecords;
  const values = [];
  if (records.global && records.global[key] != null) values.push(records.global[key]);
  if (record !== 'global' && records[record] && records[record][key] != null) {
    values.push(records[record][key]);
  }
  if (!values.length) return null;
  // `@Combat@mergeflags` **adds** the two Poison values where both records carry one, and that
  // is not what `max` does — but no record other than `global` is ever given poison
  // (`applyWarlordTouchFlagPlacement`, `combat_effects.js`), so `values` holds one entry here
  // and the two rules cannot be distinguished. A channel-specific poison would need the sum.
  if (key === 'poison') return Math.max(...values);
  if (key === 'dispelEvil') return values.some(Boolean);
  // For the other valued riders `@Combat@mergeflags` keeps `Min(existing, incoming)` — the
  // stronger, more negative save modifier — when a general and a channel-specific flag are both
  // present: `Reference docs/Caster binary/CoM2 binary - map and city.md`, `$005B168A..$005B17FA`.
  return Math.min(...values);
}

function dosChannelTouchModifier(self, key, record, ver) {
  const dos = ver === 'mom_1.31' || ver === 'mom_cp_1.60.00' || ver === 'com_6.08';
  if (!dos || record === 'global' || !self.touchFlagRecords
      || !self.touchFlagRecords[record]
      || self.touchFlagRecords[record][key] == null) return 0;
  if (key === 'stoningTouch') return -1;
  if (key === 'deathTouch') return -3;
  return 0;
}

// DOS loads one channel record for every non-melee BU_ProcessAttack call — ordinary ranged,
// Thrown, both Breaths and all Gazes all read `ranged_attack_attributes` (131:0x99AF7), melee
// reads `melee_attack_attributes` (131:0x99C0D): `Reference docs/DOS reconstructed/
// R6.2c.evidence.md`, findings 5 and 7. Caster has distinct dispatch choices; Warlord Thrown
// deliberately shares its melee record, while Breath and Gaze use only general flags.
function touchRecordForPhase(ver, phase) {
  const dos = ver === 'mom_1.31' || ver === 'mom_cp_1.60.00' || ver === 'com_6.08';
  if (dos) return phase === 'melee' ? 'melee' : 'ranged';
  if (phase === 'melee' || phase === 'ranged') return phase;
  if (phase === 'thrown' && ver && ver.startsWith('com2_warlord')) return 'melee';
  return 'global';
}

// The rider values `self` carries for this phase's record, in one read per key. The rider
// resistance steps gate on this map, so the presence test a step asks is the one the fail
// probability below asks (`resistanceQueries`, `combat_effects.js`).
function placedTouchValues(self, record, ver) {
  const values = {};
  for (const key of PLACED_TOUCH_KEYS) values[key] = placedTouchValue(self, key, record, ver);
  return values;
}

// `fires` is the group gate: the per-phase touch-attack rule, and for a modern gaze the
// attack-type jump that sends types 6..8 past the whole rider block. No rider queries a
// resistance when the group does not run, which is why the gate is passed down rather than
// applied to the returned probabilities.
// Which rider histogram each touch query's chain belongs to. `lifeRider` is one rider slot
// under two build names and Life Steal's drain and healing are two views of one roll, so three
// display keys read a query the list makes once (`resistanceQueries`, `combat_effects.js`).
const TOUCH_RIDER_CHAIN_KEYS = Object.freeze({
  lifeRiderRes: ['dispelEvil', 'exorcise'],
  stoningTouchRes: ['stoningTouch'],
  deathTouchRes: ['deathTouch'],
  lifeStealRes: ['lifeSteal', 'lifeStealHeal'],
  destructionRes: ['destruction'],
  poisonRes: ['poison'],
});

// One breakdown row's rider id -> chain records map, for one direction of the exchange. The
// touch queries' chains are already keyed by rider id; what this adds is the base-roll slot's
// own effective-defense chain, Immolation's, and — on a gaze row — the two kill rolls, which
// belong to the gaze call itself rather than to any rider of it (F223). `melee` is the
// base-roll slot in every phase, so the defense its attack was scored against is what that
// histogram explains. Every record here was built by the call that computed the figure; this
// only says which histogram each one belongs under.
function rowRiderChains(touchChains, baseDefenseChain, immolationChain, baseResistanceChains) {
  const chains = { ...(touchChains || {}) };
  const base = [];
  // A kill-roll record that names a rider id belongs to that histogram instead of to the
  // base-roll slot: the DOS stoning loop draws its own row because its `hits` go to a bucket of
  // their own (F225.2), so the roll it made must head that row rather than the slot that no
  // longer carries its damage. `gazeKillProbs` is what marks a record, and it marks only the
  // one the DOS gaze splits out — a modern row's kill roll is its call's whole damage and stays
  // unmarked, on the base-roll slot.
  for (const record of baseResistanceChains || []) {
    if (!record) continue;
    if (record.riderKey) {
      (chains[record.riderKey] = chains[record.riderKey] || []).push(record);
    } else {
      base.push(record);
    }
  }
  if (baseDefenseChain) base.push(baseDefenseChain);
  if (base.length) chains.melee = base;
  if (immolationChain) chains.immolation = [immolationChain];
  return chains;
}

// Re-key the chains a query group produced onto the rider ids the histograms carry. Nothing is
// computed here: each record is the one the query already built, and a rider whose query was
// not made has no entry, which is the same gate the histogram's own presence reads.
function riderChainsByKey(queryChains, keyMap) {
  const byKey = {};
  if (!queryChains) return byKey;
  for (const [field, keys] of Object.entries(keyMap)) {
    const record = queryChains[field];
    if (!record) continue;
    for (const key of keys) (byKey[key] = byKey[key] || []).push(record);
  }
  return byKey;
}

function touchParams(self, other, ver, fires, record = 'global', wantChains = false) {
  const values = placedTouchValues(self, record, ver);
  // The hover chains are collected by the queries themselves; asking for none is what keeps the
  // matrix, which renders no histogram, off the tracing path (`CLAUDE.md`, *Architecture*).
  const queryChains = wantChains ? {} : null;
  const res = resistanceQueries('touch', other, ver, values, fires, queryChains);
  const poisonStr = fires && values.poison != null ? values.poison : 0;
  const stoningTouch = values.stoningTouch == null ? null
    : values.stoningTouch + dosChannelTouchModifier(self, 'stoningTouch', record, ver);
  const deathTouch = values.deathTouch == null ? null
    : values.deathTouch + dosChannelTouchModifier(self, 'deathTouch', record, ver);
  return {
    poisonStr,
    poisonFail:     poisonStr > 0 ? poisonFailProb(res.poisonRes, other.abilities, ver) : 0,
    stoningFail:    (fires && stoningTouch != null)
                      ? stoningFailProb(res.stoningTouchRes, other.abilities, stoningTouch) : 0,
    deathTouchFail: (fires && deathTouch != null)
                      ? deathTouchFailProb(res.deathTouchRes, other.abilities, deathTouch) : 0,
    // Dispel Evil and Exorcise are one rider slot under two names, so they read the one
    // Life-realm query that slot makes (`touchRiderResistance:lifeRider`).
    dispelEvilFail: (fires && values.dispelEvil)
                      ? dispelEvilFailProb(res.lifeRiderRes, other.abilities, other.unitType) : 0,
    exorciseFail:   (fires && values.exorcise != null)
                      ? exorciseFailProb(res.lifeRiderRes, other.abilities, other.unitType,
                        values.exorcise, ver) : 0,
    // Destruction remains a general touch flag. Warlord's Energy Cannon triggers it
    // from a magical beam, and the roster Magician attacks only at range.
    destructionFail: (fires && values.destruction != null)
                      ? destructionFailProb(res.destructionRes, other.abilities,
                        values.destruction, ver) : 0,
    lifeStealMod:   (fires && values.lifeSteal != null)
                      ? lifeStealEffective(res.lifeStealRes, other.abilities, values.lifeSteal) : null,
    // The Life Steal drain is the roll margin, so the consumer needs the same figure the roll
    // used. It travels with the rider that asked for it rather than being threaded separately.
    lifeStealRes:   res.lifeStealRes ?? null,
    // The effective-resistance chain each reached rider's histogram hangs on, keyed by rider
    // id. Empty unless the caller asked for chains.
    chains: riderChainsByKey(queryChains, TOUCH_RIDER_CHAIN_KEYS),
    // Which riders this call actually reaches, separately from whether they can then land.
    // The resolver emits one histogram per reached rider and none for the others, so a rider a
    // version does not carry — `placedTouchValue` returns null for it — never reaches a panel
    // (INV-2), an immunity that skips the block draws nothing, and a rider whose roll is made
    // and cannot succeed still draws, at zero (`CLAUDE.md`, *Input/output contract*). Each
    // immunity test is the `*ReachesRoll` predicate its own fail probability reads
    // (`combat_special_attacks.js`), not a second copy of it.
    placed: {
      // `ApplyAttack`'s Poison block also tests `aflags.poisonvalue > 0`, and the DOS shared
      // byte marshals an unchecked Poison Touch as 0 rather than as absent, so strength is the
      // placement test here rather than presence of the key.
      poison: poisonStr > 0 && poisonReachesRoll(other.abilities),
      stoningTouch: !!(fires && stoningTouch != null)
        && stoningTouchReachesRoll(other.abilities),
      deathTouch: !!(fires && deathTouch != null) && deathTouchReachesRoll(other.abilities),
      dispelEvil: !!(fires && values.dispelEvil)
        && dispelEvilReachesRoll(other.abilities, other.unitType),
      exorcise: !!(fires && values.exorcise != null)
        && exorciseReachesRoll(other.abilities, other.unitType, ver),
      destruction: !!(fires && values.destruction != null)
        && destructionReachesRoll(other.abilities, ver),
      lifeSteal: !!(fires && values.lifeSteal != null)
        && lifeStealReachesRoll(other.abilities),
    },
  };
}

// Touch-attack parameters for `self` firing alongside its gaze phase against `other`.
// DOS BU_ProcessAttack merges its ranged flag record into every non-melee call, including
// Gazes. Modern ApplyAttack attack types 6-8 jump past all six rider blocks, so no modern
// gaze rider is asked for and none queries a resistance.
// Returns raw probs plus `*With` booleans gated on the gaze actually being active.
function gazeTouchParams(self, other, gazeActive, selfSleep, ver, wantChains = false) {
  // The unsigned two-step range idiom admits exactly attack types 6..8 and sends them past all
  // six rider blocks, which every other type executes in order: `Reference docs/Caster binary/
  // Combat.ApplyAttack.R5.2c.evidence.md`. Dispel Evil is not a seventh rider to exclude — it is
  // MoM's name for the flag Caster reads as Exorcise, out of scope in the modern builds
  // (`TOUCH_KEY_SCOPE_IDS`, `combat_effects.js`) and so already 0 there — and it rides the DOS
  // gaze call unchanged.
  const modernGazeSkipsRiders = ver === 'com2_1.05.11' || ver === 'com2_warlord_1.5.12.9';
  const active = !selfSleep && gazeActive;
  // A gaze that is not dealt makes no call, so its riders query nothing. The `*With` booleans
  // below already suppressed the values; making it the group gate stops the query as well.
  const touch = touchParams(self, other, ver, !modernGazeSkipsRiders && active,
    touchRecordForPhase(ver, 'gaze'), wantChains);
  return {
    poisonStr: touch.poisonStr,
    poisonFail: touch.poisonFail,
    stoningFail: touch.stoningFail,
    deathTouchFail: touch.deathTouchFail,
    dispelEvilFail: touch.dispelEvilFail,
    exorciseFail: touch.exorciseFail,
    destructionFail: touch.destructionFail,
    lifeStealMod: touch.lifeStealMod,
    lifeStealRes: touch.lifeStealRes,
    chains: touch.chains,
    poisonWith:     active && touch.poisonFail > 0,
    stoningWith:    active && touch.stoningFail > 0,
    deathTouchWith: active && touch.deathTouchFail > 0,
    dispelEvilWith: active && touch.dispelEvilFail > 0,
    exorciseWith:   active && touch.exorciseFail > 0,
    destructionWith: active && touch.destructionFail > 0,
    lifeStealWith:  active && touch.lifeStealMod !== null,
    // The gaze call's placement map, narrowed by the same `active` gate the `*With` booleans
    // use. A modern gaze places nothing: `fires` was already false for it above.
    placed: Object.fromEntries(Object.entries(touch.placed)
      .map(([key, value]) => [key, active && value])),
  };
}

// Gaze kill-roll probabilities: stoning and death gaze fail chances for `self` vs `other`.
// The two rolls are a rider group of their own — past the touch riders, in the order the engine
// deals them — so each asks its own realm query rather than reading a precomputed figure.
// Whether this build's gaze splits its stoning kill into a rider of its own. The DOS builds do:
// one `BU_ProcessAttack` produces one three-bucket record and the stoning loop is the only part
// of it that writes `local_damage[2]` (F225.2). A modern gaze is already one `ApplyAttack` call
// per gaze type, so there is nothing to split out.
function dosGazeSplitsStoningKill(ver) {
  return ver !== 'com2_1.05.11' && ver !== 'com2_warlord_1.5.12.9';
}

// Tag a chain record with the rider histogram it heads, without mutating the record the query
// built: `null` leaves it as it is, so an unmarked record still tests falsy on `riderKey`.
function markRiderChain(record, riderKey) {
  if (!record) return null;
  return riderKey ? { ...record, riderKey } : record;
}

function gazeKillProbs(self, selfStoningActive, selfDeathActive, other, ver, wantChains = false) {
  const queryChains = wantChains ? {} : null;
  const res = resistanceQueries('gazeKill', other, ver,
    { stoningGaze: selfStoningActive, deathGaze: selfDeathActive }, true, queryChains);
  return {
    stoningFail: selfStoningActive ? stoningFailProb(res.stoningGazeRes, other.abilities, self.abilities.stoningGaze) : 0,
    deathFail:   selfDeathActive   ? deathGazeFailProb(res.deathGazeRes, other.abilities, self.abilities.deathGaze)   : 0,
    // Both kill rolls are the gaze call's own rather than a rider on it, so their chains hang
    // on the row's base-roll slot. They stay keyed here because a modern row is one gaze, and a
    // row must not show the chain of the kill roll its own call never made; the caller picks by
    // the same activity flags its label is built from, in the order PerformAttacks deals them.
    //
    // A chain is also withheld where the engine skips the roll on an immunity: the query above
    // is still made — the resistance steps gate on the gaze being active, not on the roll being
    // reached — but nothing was rolled, so there is no figure to explain. The two predicates are
    // the ones the fail probabilities read (`combat_special_attacks.js`).
    //
    // A DOS row's stoning roll is additionally marked with the histogram it heads. There the
    // stoning loop's `hits` go to their own bucket and draw their own row (F225.2), so the roll
    // explains that row rather than the base-roll slot; `rowRiderChains` reads the mark. A
    // modern row is one `ApplyAttack` call whose kill *is* the row's damage, so it stays
    // unmarked and its chain remains where F223 put it.
    chains: queryChains
      ? {
        stoningGaze: selfStoningActive && stoningTouchReachesRoll(other.abilities)
          ? markRiderChain(queryChains.stoningGazeRes,
            dosGazeSplitsStoningKill(ver) ? 'stoningGaze' : null) : null,
        deathGaze: selfDeathActive && deathTouchReachesRoll(other.abilities)
          ? queryChains.deathGazeRes || null : null,
      }
      : {},
  };
}

// Doom damage deals exactly 1 damage per 2 points of attack strength (rounded
// down), so affected strengths are halved before their exact-damage phase.
// Intrinsic Doom affects every conventional attack; Warlord Energy Weaponry is
// melee-only and Energy Cannon is ranged-only. Gaze has its own explicit Doom
// strength. Black Sleep's damage→Doom conversion uses full strength.
// PROVENANCE[doomAttackStrengthModifiers]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/combat.c@span:23:b0c6213a0d9c2c2e5d3f54ec | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:34:935a71829ffc2ed26b56056c | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:30:b0c2bd6060999b364362d31d | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:8:ede4f7dc06908e75ecaa412b | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:8:02e6fff5e548271398f1d598 | Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:9:d4b5090bf579662a98cef0d9 | Reference docs/Script source/Warlord 1.5.12.9/CreateUnit.CAS@span:10:57c912964ac8750b69987067 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:21fdd7af4a50407f32527bbf | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:21fdd7af4a50407f32527bbf
// STAT-FORMULA[doomAttackStrengthModifiers]
function applyDoomUAHalving(unit, version) {
  const allDoom = hasAbil(unit.abilities, 'doom');
  const meleeDoom = allDoom || hasAbil(unit.abilities, 'energyWeaponry');
  const rangedDoom = allDoom || hasAbil(unit.abilities, 'energyCannon');
  if (!meleeDoom && !rangedDoom) return unit;
  const modernAttacks = unit.modernAttacks && Object.fromEntries(
    Object.entries(unit.modernAttacks).map(([key, channel]) => [key,
      channel && (allDoom || (rangedDoom && key === 'ranged'))
        ? { ...channel, strength: Math.floor((channel.strength || 0) / 2) }
        : channel,
    ]),
  );
  return Object.assign({}, unit, {
    atk: meleeDoom ? Math.floor((unit.atk || 0) / 2) : unit.atk,
    rtb: rangedDoom ? Math.floor((unit.rtb || 0) / 2) : unit.rtb,
    ...(modernAttacks ? { modernAttacks } : {}),
  });
}

// Calculator orchestration over individually classified source-authored transforms; this wrapper
// is not itself an engine formula. It no longer rewrites `unitType`: the ordered identity
// conversions own the realm and Fantastic writes, and `unitType` reaches here already projected
// from the finished live identity (M7).
function normalizeCombatUnit(unit, version) {
  // Derived calculator records carry the raw BaseUnits flag explicitly. Plain resolver callers
  // predate that boundary, so an omitted marker means their supplied Death Immunity is intrinsic.
  const baseDeathImmunity = unit.baseDeathImmunity == null
    ? hasAbil(unit.abilities, 'deathImmunity')
    : !!unit.baseDeathImmunity;
  let normalized = applyBloodLustEffects(unit, version);
  normalized = applyVampirismEffects(normalized, version);
  normalized = applyRevenantEffects(normalized, version);
  normalized = applyAnimatedEffects(normalized, version);
  normalized = applyUndeadImmunities(normalized, version);
  normalized = applyBlackChannelsEffects(normalized, version);
  normalized = applyRebuildEffects(normalized, version);
  normalized = applyFieryFuryEffects(normalized, version);
  normalized = applyZealEffects(normalized, version);
  normalized = applyTemporalTwistEffects(normalized, version);
  normalized = applyTacticianWarlordEffects(normalized, version);
  normalized = applyDoomUAHalving(normalized, version);
  const extraHitsCap = version === 'com_6.08' || (version && version.startsWith('com2_'))
    ? 90 : 255;
  const modernBonusHp = Math.min(extraHitsCap,
    Math.max(0, Math.trunc(Number(normalized.baseBonusHp) || 0)));
  const withType = Object.assign({}, normalized, {
    combatVersion: version,
    baseDeathImmunity,
    combatBaseHp: normalized.combatBaseHp || normalized.hp,
    baseBonusHp: modernBonusHp,
    hp: normalized.hp + modernBonusHp,
    noHealing: !!normalized.noHealing
      || hasAbil(normalized.abilities, 'undead')
      || hasAbil(normalized.abilities, 'animated')
      || (combatEffectInVersion('resolution:mysticSurge', version)
        && hasAbil(normalized.abilities, 'mysticSurge')),
  });
  // Angelic Guardians grants/improves Exorcise based on the finalized realm.
  const withGuardians = applyAngelicGuardiansEffects(withType, version);
  return applyWarlordTouchFlagPlacement(withGuardians, version);
}

function combatHealStateFromUnit(unit, additionalDamage = 0) {
  const baseTotal = Math.max(0, Math.trunc(Number(unit.totalDamage ?? unit.dmg) || 0));
  const totalDamage = baseTotal + Math.max(0, Math.trunc(Number(additionalDamage) || 0));
  if (usesDosCombatHealing(unit.combatVersion)) {
    return normalizeDosCombatHealState({
      version: unit.combatVersion,
      figures: unit.figs,
      baseHp: unit.combatBaseHp || unit.hp,
      totalDamage,
      irreversibleDamage: Math.min(baseTotal,
        Math.max(0, Math.trunc(Number(unit.irrecoverableDamage) || 0))),
      undeadDamage: Math.min(baseTotal,
        Math.max(0, Math.trunc(Number(unit.undeadDamage) || 0))),
      extraHits: unit.baseBonusHp,
    });
  }
  return normalizeCombatHealState({
    figures: unit.figs,
    hp: unit.combatBaseHp || unit.hp,
    totalDamage,
    irrecoverableDamage: Math.min(baseTotal,
      Math.max(0, Math.trunc(Number(unit.irrecoverableDamage) || 0))),
    undeadDamage: Math.min(baseTotal,
      Math.max(0, Math.trunc(Number(unit.undeadDamage) || 0))),
    bonusHp: unit.baseBonusHp,
    noHealing: unit.noHealing,
    raceNoHeal: unit.raceNoHeal,
  });
}

// PROVENANCE[pairToHitModifiers]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:1ff32cf14236f60c8659c472 | Reference docs/DOS reconstructed/unitcalc.c@span:40:7a990661f197312ddc553d16 | Reference docs/DOS reconstructed/combat.c@span:20:cb4fa9e7501e8b1aefe9a152 | Reference docs/DOS reconstructed/combat.c@span:28:50bbe6203a794ed0191be832 | Reference docs/DOS reconstructed/combat.c@span:12:0485456526aaa82ac1801b1c | Reference docs/DOS reconstructed/combat.c@span:17:c3f9b1d6c7b49267895ba012 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:11:b08aaa1432383a78ae466dd0
// STAT-FORMULA[pairToHitModifiers]
function applyPairToHitModifiers(a, b, version) {
  // Lucky v1.31: defender's Lucky penalizes opponent's melee To Hit by -10%.
  // Prayer / High Prayer v1.31: enemy melee To Hit malus (-10%).
  if (version === 'mom_1.31') {
    if (hasAbil(b.abilities, 'lucky')) {
      a = Object.assign({}, a, { toHitMelee: Math.max(0.1, a.toHitMelee - 0.1) });
    }
    if (hasAbil(a.abilities, 'lucky')) {
      b = Object.assign({}, b, { toHitMelee: Math.max(0.1, b.toHitMelee - 0.1) });
    }

    if (hasAbil(a.abilities, 'prayer') || hasAbil(a.abilities, 'highPrayer')) {
      b = Object.assign({}, b, { toHitMelee: Math.max(0.1, b.toHitMelee - 0.1) });
    }
    if (hasAbil(b.abilities, 'prayer') || hasAbil(b.abilities, 'highPrayer')) {
      a = Object.assign({}, a, { toHitMelee: Math.max(0.1, a.toHitMelee - 0.1) });
    }
  }

  // Invisibility blocks ranged targeting in all versions — a separate, earlier eligibility
  // check. In MoM it additionally costs the attacker 10 percentage points of To Hit unless the
  // attacker has Illusions Immunity, a block CoM 1 replaces with 62 nops:
  // `Reference docs/MoM binary analysis.md`, *Invisibility's To-Hit penalty*.
  const invisIsCoM = version && version.startsWith('com');
  const aInvisible = hasAbil(a.abilities, 'invisibility');
  const bInvisible = hasAbil(b.abilities, 'invisibility');
  const aCanSeeB = !bInvisible || hasAbil(a.abilities, 'illusionImmunity');
  const bCanSeeA = !aInvisible || hasAbil(b.abilities, 'illusionImmunity');
  if (!aCanSeeB && !invisIsCoM) {
    a = Object.assign({}, a, {
      toHitMelee: Math.max(0.1, a.toHitMelee - 0.1),
      toHitRtb:   Math.max(0.1, a.toHitRtb - 0.1),
    });
  }
  if (!bCanSeeA && !invisIsCoM) {
    b = Object.assign({}, b, {
      toHitMelee: Math.max(0.1, b.toHitMelee - 0.1),
      toHitRtb:   Math.max(0.1, b.toHitRtb - 0.1),
    });
  }

  return { a, b, aCanSeeB, bCanSeeA };
}

function buildVertigoContext(a, b, version) {
  const isCoM = version && version.startsWith('com');
  const aVertigo = hasAbil(a.abilities, 'vertigo')
    && !hasAbil(a.abilities, 'illusionImmunity') && !hasAbil(a.abilities, 'magicImmunity');
  const bVertigo = hasAbil(b.abilities, 'vertigo')
    && !hasAbil(b.abilities, 'illusionImmunity') && !hasAbil(b.abilities, 'magicImmunity');

  return {
    isCoM,
    // Persistent Hit/To Defend penalties were already applied by recalculation. Only MoM's
    // separate -1 Defense-die projection remains resolution-time state here — Vertigo's
    // defensive half is a live-stat write, not a conventional-attack modifier
    // (`Reference docs/MoM binary analysis.md`, *Combat-effect stat writes*).
    aToHitMeleeVert: a.toHitMelee,
    bToHitMeleeVert: b.toHitMelee,
    aToHitRtbVert: a.toHitRtb,
    bToHitRtbVert: b.toHitRtb,
    aVertigoDefPenalty: !isCoM && aVertigo ? 1 : 0,
    bVertigoDefPenalty: !isCoM && bVertigo ? 1 : 0,
    aVertigoBlockPenalty: 0,
    bVertigoBlockPenalty: 0,
  };
}

function remainingUnitState(unit) {
  const totalHP = unit.figs * unit.hp;
  return {
    totalHP,
    alive: Math.max(0, unit.figs - Math.floor(unit.dmg / unit.hp)),
    remHP: Math.max(0, totalHP - unit.dmg),
  };
}

// Caster.exe keeps conventional ranged, Thrown, Fire Breath and Lightning Breath in
// independent fields.  The card still carries the shared slot the modern engine does not have
// (`SPEC.md`, *Deliberate deviations from the engine*), but combat must never recover a modern
// channel from that lossy display value.
function modernAttackUnit(unit, channel) {
  if (!channel) return null;
  const ranged = channel.key === 'ranged';
  return Object.assign({}, unit, {
    rtb: channel.strength,
    baseRtb: channel.baseStrength,
    toHitRtb: channel.toHit,
    rangedType: ranged ? channel.type : 'none',
    thrownType: ranged ? 'none' : channel.type,
  });
}

// The secondary channels of a CoM2/Warlord record, in resolution order. Every modern unit has
// the record — `deriveUnitStats` halts on an input without one — so there is no absent-record
// arm here: a unit with no secondary attack answers with an empty list, not a missing one.
function modernAttackChannels(unit) {
  return ['lightningBreath', 'fireBreath', 'thrown'].map(key => {
    const attack = unit.modernAttacks[key];
    return attack && attack.strength > 0 ? { key, ...attack } : null;
  }).filter(Boolean);
}

// `defChains` mirrors the value fields: one hover chain per defense sequence this exchange
// actually ran, produced by that run. An attack type the exchange does not make has no value
// here and no chain either, so no histogram can show a step this version never executed.
function buildDefenseContext(a, b, version, aVertigoDefPenalty, bVertigoDefPenalty, needed = null,
  wantChains = false) {
  // Aggregates Vertigo def penalty, Large Shield, Bless (defense half), Elemental Armor,
  // Armor Piercing, Weapon/Missile/Magic/Fire Immunity, Righteousness, and Illusion.
  if (version && version.startsWith('com2') && needed) {
    const defChains = {};
    const defense = (target, attacker, penalty, type, active, key) => {
      if (!active) return 0;
      const slot = wantChains ? {} : null;
      const value = computeCasterDefenseForAttack(target, attacker, version, penalty, type, slot);
      if (slot) defChains[key] = slot.chain;
      return value;
    };
    const bDefVsA = defense(b, a, bVertigoDefPenalty, 'melee', needed.melee, 'bDefVsA');
    const bDefVsARanged = defense(b, a, bVertigoDefPenalty, 'ranged', needed.ranged,
      'bDefVsARanged');
    const bDefForThrown = defense(b, a, bVertigoDefPenalty, 'thrown', needed.thrown,
      'bDefForThrown');
    const bDefForGaze = defense(b, a, bVertigoDefPenalty, 'gaze', needed.aGaze, 'bDefForGaze');
    const bDefForImm = defense(b, a, bVertigoDefPenalty, 'immolation', needed.aImmolation,
      'bDefForImm');
    const aDefVsB = defense(a, b, aVertigoDefPenalty, 'melee', needed.counter, 'aDefVsB');
    const aDefForGaze = defense(a, b, aVertigoDefPenalty, 'gaze', needed.bGaze, 'aDefForGaze');
    const aDefForImm = defense(a, b, aVertigoDefPenalty, 'immolation', needed.bImmolation,
      'aDefForImm');
    return {
      bDefVsA,
      bDefVsARanged,
      bDefForThrown,
      bDefForGaze,
      bDefForImm,
      aDefVsB,
      aDefForGaze,
      aDefForImm,
      defChains,
    };
  }

  const bProfileChains = wantChains ? {} : null;
  const aProfileChains = wantChains ? {} : null;
  const bDefProfile = computeDefenseProfile(b, a, version, bVertigoDefPenalty, bProfileChains);
  const aDefProfile = computeDefenseProfile(a, b, version, aVertigoDefPenalty, aProfileChains);
  return {
    bDefProfile,
    aDefProfile,
    bDefVsA: bDefProfile.vsMelee,
    bDefVsARanged: bDefProfile.vsRanged,
    bDefForThrown: bDefProfile.vsThrown,
    bDefForGaze: bDefProfile.vsGaze,
    bDefForImm: bDefProfile.vsImmolation,
    aDefVsB: aDefProfile.vsMelee,
    aDefForGaze: aDefProfile.vsGaze,
    aDefForImm: aDefProfile.vsImmolation,
    defChains: wantChains ? {
      bDefVsA: bProfileChains.vsMelee,
      bDefVsARanged: bProfileChains.vsRanged,
      bDefForThrown: bProfileChains.vsThrown,
      bDefForGaze: bProfileChains.vsGaze,
      bDefForImm: bProfileChains.vsImmolation,
      aDefVsB: aProfileChains.vsMelee,
      aDefForGaze: aProfileChains.vsGaze,
      aDefForImm: aProfileChains.vsImmolation,
    } : {},
  };
}

// STAT-FORMULA[resolutionToBlockContext]
// PROVENANCE[resolutionToBlockContext]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:988ef64cd77214c23cb77397 | Reference docs/DOS reconstructed/combat.c@span:22:f1bd863bb2e19d690ca89983 | Reference docs/DOS reconstructed/combat.c@span:17:168e451097f43626bf9c9d57 | Reference docs/DOS reconstructed/combat.c@span:13:ee0ffb0fdc5af4e30c63a285 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:12:08b392da258c1aa5831668e7 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:34f14a18e857be474ba8f10a | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:8:ede4f7dc06908e75ecaa412b | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:4:2cb725296f6895640edcf211 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:ce6c3e49e9933d68f63f9666 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:ce6c3e49e9933d68f63f9666
function buildToBlockContext(a, b, aVertigoBlockPenalty, bVertigoBlockPenalty, version) {
  // Both -10pp arms are version-scoped, so a missing version would silently disable both rather
  // than gate them — the invented default this gating exists to remove.
  if (!version) {
    throw new Error('buildToBlockContext: version is required to scope Eldritch Weapon and '
      + 'Mystic Surge.');
  }
  // Eldritch Weapon: -10pp to defender's toBlock on melee, thrown, and missile ranged attacks.
  // Mystic Surge: -10pp to opponent's To Block on all conventional attacks.
  // One engine write, two named effects: MoM's bit 0x00200000 is Eldritch Weapon and CoM 1's is
  // Mystic Surge, so exactly one of these pairs can be live in any version and CoM 1 reaches the
  // reduction through Mystic Surge (`COMBAT_VERSION_SCOPES`, `steps.js`).
  const aEW = eldritchWeaponActiveForUnit(a.abilities, version);
  const bEW = eldritchWeaponActiveForUnit(b.abilities, version);
  const mysticSurgeLive = combatEffectInVersion('resolution:mysticSurge', version);
  const aMysticSurge = mysticSurgeLive && hasAbil(a.abilities, 'mysticSurge');
  const bMysticSurge = mysticSurgeLive && hasAbil(b.abilities, 'mysticSurge');
  const bToBlockConventional = Math.max(0, b.toBlock - bVertigoBlockPenalty);
  const aToBlockConventional = Math.max(0, a.toBlock - aVertigoBlockPenalty);
  const bToBlockVsAAll = aMysticSurge ? Math.max(0, bToBlockConventional - 0.10) : bToBlockConventional;
  const aToBlockVsBAll = bMysticSurge ? Math.max(0, aToBlockConventional - 0.10) : aToBlockConventional;

  const modernProfile = chance => version && version.startsWith('com2_')
    ? { chance, capDice: 15, cappedChance: 0.30 }
    : chance;
  return {
    bToBlockConventional: modernProfile(bToBlockConventional),
    aToBlockConventional: modernProfile(aToBlockConventional),
    bToBlockVsAAll: modernProfile(bToBlockVsAAll),
    aToBlockVsBAll: modernProfile(aToBlockVsBAll),
    bToBlockVsAMelee: modernProfile(aEW ? Math.max(0, bToBlockVsAAll - 0.10) : bToBlockVsAAll),
    bToBlockVsAThrEW: modernProfile((aEW && a.thrownType === 'thrown') ? Math.max(0, bToBlockVsAAll - 0.10) : bToBlockVsAAll),
    bToBlockVsARangedEW: modernProfile((aEW && a.rangedType === 'missile') ? Math.max(0, bToBlockVsAAll - 0.10) : bToBlockVsAAll),
    aToBlockVsBMelee: modernProfile(bEW ? Math.max(0, aToBlockVsBAll - 0.10) : aToBlockVsBAll),
  };
}

function buildWallOfFirePhase(active, params) {
  if (!active) return null;
  const {
    wofStr,
    wofToHit,
    wofSingleFigure,
    aDefForImm,
    aToBlock,
    aHP,
    aInvulnBonus,
    aAbilities,
    amplifiedDamage,
    version,
  } = params;

  // Wall of Fire damage to A using A's defense profile vs immolation. Touch-free.
  // Warlord makes one non-Area spill-capable attack; all other versions use Area iterations.
  return {
    kind: 'damage',
    source: 'a',
    target: 'a',
    consumesFear: false,
    compute: (_sAlive, tAlive, cap) => {
      if (tAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
      const targetFigs = wofSingleFigure ? 1 : tAlive;
      return {
        dist: calcDamageSpellDist(targetFigs, wofStr, wofToHit, aDefForImm, aToBlock,
          aHP, aInvulnBonus, null, woundedTopFigHP(cap, aHP), version, aAbilities,
          !wofSingleFigure, false, amplifiedDamage),
        lifeStealEV: 0,
      };
    },
  };
}

function buildThrownPhase(active, params) {
  if (!active) return null;
  const {
    a,
    b,
    aDoomsB,
    aBlackSleep,
    aToHitRtbVert,
    bDefForThrown,
    bToBlockVsAThrEW,
    bInvulnBonus,
    bBlurChance,
    blurBuggy,
    isCoM2,
    aMinDamageFromHits,
    aImmWithThrown,
    immStr,
    bDefForImm,
    bToBlockVsAAll,
    aPoisonStrT,
    aPoisonFailT,
    aStoningFailT,
    aDeathTouchFailT,
    aDispelEvilFailT,
    aExorciseFailT,
    aDestructionFailT,
    aLifeStealModT,
    lifeStealRes,
    aTouchPlacedT,
    aHaste,
    version,
  } = params;

  // Thrown / breath: A->B, fires before melee. Touch attacks fold in. Haste self-convolves.
  return {
    kind: 'damage',
    source: 'a',
    target: 'b',
    consumesFear: false,
    compute: (sAlive, tAlive, cap, _fearDist, context = {}) => {
      if (sAlive <= 0 || cap <= 0 || aBlackSleep) return { dist: [1], lifeStealEV: 0 };
      let dist = a.rtb > 0
        ? (aDoomsB ? calcDoomDist(sAlive, a.rtb)
          : calcTotalDamageDist(sAlive, a.rtb, aToHitRtbVert, bDefForThrown, bToBlockVsAThrEW, b.hp, bInvulnBonus, bBlurChance, blurBuggy,
              isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined, aMinDamageFromHits))
        : [1];
      const aImmTDist = (aImmWithThrown && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, a.toHitImmolation, bDefForImm,
          bToBlockVsAAll, b.hp, bInvulnBonus, aMinDamageFromHits,
          woundedTopFigHP(cap, b.hp), version, b.abilities)
        : null;
      const touchSpec = {
        poisonStr: aPoisonStrT, poisonFail: aPoisonFailT,
        stoningFail: aStoningFailT,
        deathTouchFail: aDeathTouchFailT,
        dispelEvilFail: aDispelEvilFailT,
        exorciseFail: aExorciseFailT,
        destructionFail: aDestructionFailT,
        targetHP: b.hp,
        lifeStealMod: aLifeStealModT, lifeStealRes,
        placed: aTouchPlacedT,
        immDist: aImmTDist,
        bloodsucker: hasAbil(a.abilities, 'bloodSucker'),
        sourceState: context.sourceState || combatHealStateFromUnit(a),
        version,
      };
      let t = convolveTouchAttacks(dist, sAlive, touchSpec);
      if (aHaste) t = repeatTouchAttack(t, dist, sAlive, touchSpec);
      return t;
    },
  };
}

function buildMeleePhase(params) {
  const {
    a,
    b,
    aImmWithMelee,
    immStr,
    bDefForImm,
    bToBlockVsAAll,
    bInvulnBonus,
    aMinDamageFromHits,
    aFearForCell,
    aFearProbability,
    aDoomsB,
    aBlackSleep,
    aMeleeAtkVsB,
    aToHitMeleeVert,
    bDefVsA,
    bToBlockVsAMelee,
    aPoisonStrM,
    aPoisonFailM,
    aStoningFailM,
    aDeathTouchFailM,
    aDispelEvilFailM,
    aExorciseFailM,
    aDestructionFailM,
    aLifeStealModM,
    lifeStealRes,
    aTouchPlacedM,
    bBlurChance,
    blurBuggy,
    aHaste,
    isCoM2,
    version,
  } = params;

  return {
    kind: 'damage',
    source: 'a',
    target: 'b',
    consumesFear: false,
    compute: (sAlive, tAlive, cap, _fearDist, context = {}) => {
      const fearD = aFearForCell(sAlive, tAlive);
      // ApplyAttack sets a Black-Sleeping source's caller-supplied `figs := 0` before its Cause
      // Fear loop (`Reference docs/Caster binary/Combat.ApplyAttack.R5.2a-b.evidence.md`,
      // `$005B19D6`). A dead target does not suppress the call or that loop; only zero source
      // figures do, so cap=0 still carries a real feared-count sample.
      const firstFearedDist = aBlackSleep ? [1] : fearedCountDist(fearD, sAlive);
      if (sAlive <= 0 || cap <= 0 || (isCoM2 && aBlackSleep)) {
        return { dist: [1], lifeStealEV: 0,
        fearSamples: aHaste
          ? [firstFearedDist, firstFearedDist]
          : [firstFearedDist] };
      }
      const aImmMDist = (aImmWithMelee && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, a.toHitImmolation, bDefForImm,
          bToBlockVsAAll, b.hp, bInvulnBonus, aMinDamageFromHits,
          woundedTopFigHP(cap, b.hp), version, b.abilities)
        : null;
      const o = calcMeleeTouchOutcome(fearD, sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
        bDefVsA, bToBlockVsAMelee, b.hp, cap,
        aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aDestructionFailM, aLifeStealModM, lifeStealRes,
        aImmMDist, bInvulnBonus, bBlurChance, blurBuggy, aHaste,
        isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined,
        aMinDamageFromHits, hasAbil(a.abilities, 'bloodSucker'), version,
        context.sourceState || combatHealStateFromUnit(a),
        isCoM2 ? aFearProbability : null, aTouchPlacedM);
      return { ...o, dist: o.damageDist,
        fearSamples: aHaste
          ? [firstFearedDist,
            aBlackSleep ? [1] : (o.repeatFearedDist || firstFearedDist)]
          : [firstFearedDist] };
    },
  };
}

function buildCounterPhase(params) {
  const {
    a,
    b,
    bImmWithMelee,
    immStr,
    aDefForImm,
    aToBlockVsBAll,
    aInvulnBonus,
    bMinDamageFromHits,
    bFearForCell,
    bDoomsA,
    bBlackSleep,
    bMeleeAtkVsA,
    bToHitMeleeVert,
    aDefVsB,
    aToBlockVsBMelee,
    bPoisonStrM,
    bPoisonFailM,
    bStoningFailM,
    bDeathTouchFailM,
    bDispelEvilFailM,
    bExorciseFailM,
    bDestructionFailM,
    bLifeStealModM,
    lifeStealRes,
    bTouchPlacedM,
    aBlurChance,
    blurBuggy,
    bCounterHaste,
    isCoM2,
    version,
  } = params;

  return {
    kind: 'damage',
    source: 'b',
    target: 'a',
    consumesFear: false,
    compute: (sAlive, tAlive, cap, _fearDist, context = {}) => {
      const fearD = bFearForCell(sAlive);
      const fearedDist = bBlackSleep ? [1] : fearedCountDist(fearD, sAlive);
      if (sAlive <= 0 || cap <= 0 || (isCoM2 && bBlackSleep)) {
        return { dist: [1], lifeStealEV: 0, fearSamples: [fearedDist] };
      }
      const bImmMDist = (bImmWithMelee && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, b.toHitImmolation, aDefForImm,
          aToBlockVsBAll, a.hp, aInvulnBonus, bMinDamageFromHits,
          woundedTopFigHP(cap, a.hp), version, a.abilities)
        : null;
      const o = calcMeleeTouchOutcome(fearD, sAlive, bDoomsA, bBlackSleep ? 0 : applyRage(bMeleeAtkVsA, b, sAlive), bToHitMeleeVert,
        aDefVsB, aToBlockVsBMelee, a.hp, cap,
        bPoisonStrM, bPoisonFailM, bStoningFailM, bDeathTouchFailM, bDispelEvilFailM, bExorciseFailM, bDestructionFailM, bLifeStealModM, lifeStealRes,
        bImmMDist, aInvulnBonus, aBlurChance, blurBuggy, bCounterHaste,
        isCoM2 ? woundedTopFigHP(cap, a.hp) : undefined,
        bMinDamageFromHits, hasAbil(b.abilities, 'bloodSucker'), version,
        context.sourceState || combatHealStateFromUnit(b), null, bTouchPlacedM);
      return { ...o, dist: o.damageDist, fearSamples: [fearedDist] };
    },
  };
}

function buildFirstStrikeComputes(params) {
  const {
    a,
    b,
    aImmWithMelee,
    immStr,
    bDefForImm,
    bToBlockVsAAll,
    bInvulnBonus,
    aMinDamageFromHits,
    aFearedByB,
    aPFear,
    aFearForCell,
    aDoomsB,
    aBlackSleep,
    aMeleeAtkVsB,
    aToHitMeleeVert,
    bDefVsA,
    bToBlockVsAMelee,
    aPoisonStrM,
    aPoisonFailM,
    aStoningFailM,
    aDeathTouchFailM,
    aDispelEvilFailM,
    aExorciseFailM,
    aDestructionFailM,
    aLifeStealModM,
    lifeStealRes,
    aTouchPlacedM,
    bBlurChance,
    blurBuggy,
    isCoM2,
    version,
  } = params;

  // All three FS-block strike computes are the same single A→B melee strike
  // (no doubleStrike — the FS block sequences strikes itself); they differ only
  // in which fear distribution applies. `fearFor` maps (sAlive, tAlive) to the
  // fear PMF over A's unfeared count, or null for no fear.
  const makeAStrike = (fearFor) => (sAlive, tAlive, cap, _fearDist, context = {}) => {
    const fearDist = fearFor(sAlive, tAlive);
    const fearedDist = aBlackSleep ? [1] : fearedCountDist(fearDist, sAlive);
    if (sAlive <= 0 || cap <= 0 || (isCoM2 && aBlackSleep)) {
      return { dist: [1], lifeStealEV: 0, fearSamples: [fearedDist] };
    }
    const aImmMDist = (aImmWithMelee && tAlive > 0)
      ? calcDamageSpellDist(tAlive, immStr, a.toHitImmolation, bDefForImm,
        bToBlockVsAAll, b.hp, bInvulnBonus, aMinDamageFromHits,
        woundedTopFigHP(cap, b.hp), version, b.abilities)
      : null;
    const o = calcMeleeTouchOutcome(fearDist, sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
      bDefVsA, bToBlockVsAMelee, b.hp, cap,
      aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aDestructionFailM, aLifeStealModM, lifeStealRes,
      aImmMDist, bInvulnBonus, bBlurChance, blurBuggy, false /* doubleStrike */,
      isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined,
      aMinDamageFromHits, hasAbil(a.abilities, 'bloodSucker'), version,
      context.sourceState || combatHealStateFromUnit(a), null, aTouchPlacedM);
    return { ...o, dist: o.damageDist, fearSamples: [fearedDist] };
  };

  return {
    // FS strike: fear is aFearedByB only (no aFearBug — that fires after FS).
    // Used for both no-Haste FS and FS+Haste FS strike.
    fsStrikeCompute: makeAStrike((sAlive) => aFearedByB ? calcFearDist(sAlive, aPFear) : null),
    // Hasted 2nd strike: full A-side fear (aFearForCell, includes aFearBug).
    secondStrikeCompute: makeAStrike((sAlive, tAlive) => aFearForCell(sAlive, tAlive)),
    // No-fear strike: caller passes in k_a as sAlive (fear pre-sampled). Used when
    // DOS FS+Haste can share one pre-sampled fear count across both strikes.
    aStrikeNoFear: makeAStrike(() => null),
  };
}

function buildAttackerGazePhase(active, params) {
  if (!active) return null;
  const {
    a,
    b,
    aStoningGazeActiveP,
    aDeathGazeActiveP,
    aStoningGazeFailP,
    aDeathGazeFailP,
    aGazeDoomStrP,
    bDefForGaze,
    bInvulnBonus,
    bBlurChance,
    blurBuggy,
    isCoM2,
    bBlackSleep,
    bToBlockVsAAll,
    aMinDamageFromHits,
    aImmWithGaze,
    immStr,
    bDefForImm,
    aPoisonWithGaze,
    aPoisonStrG_raw,
    aPoisonFailG,
    aStoningWithGaze,
    aStoningFailG,
    aDeathTouchWithGaze,
    aDeathTouchFailG,
    aDispelEvilWithGaze,
    aDispelEvilFailG,
    aExorciseWithGaze,
    aDestructionWithGaze,
    aTouchPlacedG,
    aExorciseFailG,
    aDestructionFailG,
    aLifeStealWithGaze,
    aLifeStealModG,
    lifeStealRes,
    version,
  } = params;

  // Attacker gaze A->B. Source = A's surviving figs; target = B.
  return {
    kind: 'damage',
    source: 'a',
    target: 'b',
    consumesFear: false,
    compute: (sAlive, tAlive, cap, _fearDist, context = {}) => {
      if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
      if (isCoM2) {
        const steps = [];
        let dispelEvilPending = aDispelEvilWithGaze ? aDispelEvilFailG : 0;
        const nextGazeSpec = (extra = {}) => {
          const spec = { ...commonSpec, dispelEvilFail: dispelEvilPending, ...extra };
          dispelEvilPending = 0;
          return spec;
        };
        const commonSpec = {
          poisonStr: 0, poisonFail: 0, stoningFail: 0, deathTouchFail: 0,
          dispelEvilFail: 0, exorciseFail: 0, destructionFail: 0,
          targetHP: b.hp, lifeStealMod: null, lifeStealRes,
          // A modern gaze is its own ApplyAttack call and types 6..8 jump past every rider
          // block, so it places none: only the gaze's own damage draws a histogram.
          placed: aTouchPlacedG,
          immDist: null, bloodsucker: hasAbil(a.abilities, 'bloodSucker'), version,
        };
        if (aStoningGazeActiveP) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(a, b, stepAlive, Math.max(0, Math.ceil(remaining / b.hp)),
              remaining, aStoningGazeFailP, 0, 0, bDefForGaze, bInvulnBonus,
              bBlurChance, blurBuggy, woundedTopFigHP(remaining, b.hp), false,
              bToBlockVsAAll, aMinDamageFromHits),
            atkFigs: stepAlive,
            spec: nextGazeSpec({ baseDamageCategory: 'irrecoverableDamage' }),
          }));
        }
        if (aDeathGazeActiveP) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(a, b, stepAlive, Math.max(0, Math.ceil(remaining / b.hp)),
              remaining, 0, aDeathGazeFailP, 0, bDefForGaze, bInvulnBonus,
              bBlurChance, blurBuggy, woundedTopFigHP(remaining, b.hp), false,
              bToBlockVsAAll, aMinDamageFromHits),
            atkFigs: stepAlive,
            spec: nextGazeSpec(),
          }));
        }
        if (aGazeDoomStrP > 0) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(a, b, stepAlive, Math.max(0, Math.ceil(remaining / b.hp)),
              remaining, 0, 0, aGazeDoomStrP, bDefForGaze, bInvulnBonus,
              bBlurChance, blurBuggy, woundedTopFigHP(remaining, b.hp), bBlackSleep,
              bToBlockVsAAll, aMinDamageFromHits),
            atkFigs: 1,
            spec: nextGazeSpec(),
          }));
        }
        return sequenceTouchApplyAttacks(steps, cap,
          context.sourceState || combatHealStateFromUnit(a));
      }
      // DOS only — the modern branch returned above. The DOS doom assignment sits inside the
      // per-figure loop, so MoM's doom damage scales with the attacker's figure count where
      // CoM2 and Warlord deliberately do not: `Reference docs/MoM binary analysis.md`,
      // *Gaze attacks: one slot, two figure bounds, and a realm*.
      // The stoning kill leaves the base distribution: it is the one part of a DOS gaze that
      // writes `local_damage[2]` (`combat.c:4419`), so it rides the touch channel with its own
      // bucket and its own histogram while the physical component, the doom damage and the
      // death kill stay on the base as regular damage. The two loops are still counted over
      // the same unreduced `tAlive` — nothing between them reduces `Cur_Figures` (F225.1) —
      // which is why this is not sequenced the way the modern arm above is.
      let dist = buildGazeDist(a, b, sAlive, tAlive, cap, 0, aDeathGazeFailP, aGazeDoomStrP, bDefForGaze, bInvulnBonus, bBlurChance, blurBuggy,
        isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined, bBlackSleep, bToBlockVsAAll, aMinDamageFromHits, sAlive);
      // Placement, not landing: the stoning loop is skipped outright when the target carries
      // Stoning Immunity (`0x99D8F`) or Magic Immunity, whose gate at `0x99D3F` jumps past both
      // kill loops — the same pair `stoningFailProb` reads, and the same predicate this row's
      // kill-roll chain is already withheld on (`gazeKillProbs` above). A skipped block emits no
      // histogram; a roll that is made and cannot succeed still emits one, at 0.
      const aStoningGazeReaches = !!aStoningGazeActiveP
        && stoningTouchReachesRoll(b.abilities);
      const aStoningGazeKillDist = aStoningGazeReaches
        ? buildGazeKillDist(b, tAlive, cap, aStoningGazeFailP) : null;
      const aImmGDist = (aImmWithGaze && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, a.toHitImmolation, bDefForImm,
          bToBlockVsAAll, b.hp, bInvulnBonus, aMinDamageFromHits,
          woundedTopFigHP(cap, b.hp), version, b.abilities)
        : null;
      const t = convolveTouchAttacks(dist, sAlive, {
        poisonStr: aPoisonWithGaze ? aPoisonStrG_raw : 0, poisonFail: aPoisonFailG,
        stoningFail: aStoningWithGaze ? aStoningFailG : 0,
        deathTouchFail: aDeathTouchWithGaze ? aDeathTouchFailG : 0,
        dispelEvilFail: aDispelEvilWithGaze ? aDispelEvilFailG : 0,
        exorciseFail: aExorciseWithGaze ? aExorciseFailG : 0,
        destructionFail: aDestructionWithGaze ? aDestructionFailG : 0,
        targetHP: b.hp,
        lifeStealMod: aLifeStealWithGaze ? aLifeStealModG : null, lifeStealRes,
        stoningGazeDist: aStoningGazeKillDist,
        placed: { ...aTouchPlacedG, stoningGaze: aStoningGazeReaches },
        immDist: aImmGDist,
        bloodsucker: hasAbil(a.abilities, 'bloodSucker'),
        sourceState: context.sourceState || combatHealStateFromUnit(a),
        version,
      });
      return t;
    },
  };
}

function buildDefenderGazePhase(active, params) {
  if (!active) return null;
  const {
    a,
    b,
    bStoningGazeActiveP,
    bDeathGazeActiveP,
    bStoningGazeFailP,
    bDeathGazeFailP,
    bGazeDoomStrP,
    aDefForGaze,
    aInvulnBonus,
    aBlurChance,
    blurBuggy,
    isCoM2,
    aBlackSleep,
    aToBlockVsBAll,
    bMinDamageFromHits,
    bImmWithGaze,
    immStr,
    aDefForImm,
    bPoisonWithGaze,
    bPoisonStrG_raw,
    bPoisonFailG,
    bStoningWithGaze,
    bStoningFailG,
    bDeathTouchWithGaze,
    bDeathTouchFailG,
    bDispelEvilWithGaze,
    bDispelEvilFailG,
    bExorciseWithGaze,
    bDestructionWithGaze,
    bTouchPlacedG,
    bExorciseFailG,
    bDestructionFailG,
    bLifeStealWithGaze,
    bLifeStealModG,
    lifeStealRes,
    version,
  } = params;

  // Defender gaze B->A.
  return {
    kind: 'damage',
    source: 'b',
    target: 'a',
    consumesFear: false,
    compute: (sAlive, tAlive, cap, _fearDist, context = {}) => {
      if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
      if (isCoM2) {
        const steps = [];
        let dispelEvilPending = bDispelEvilWithGaze ? bDispelEvilFailG : 0;
        const nextGazeSpec = (extra = {}) => {
          const spec = { ...commonSpec, dispelEvilFail: dispelEvilPending, ...extra };
          dispelEvilPending = 0;
          return spec;
        };
        const commonSpec = {
          poisonStr: 0, poisonFail: 0, stoningFail: 0, deathTouchFail: 0,
          dispelEvilFail: 0, exorciseFail: 0, destructionFail: 0,
          targetHP: a.hp, lifeStealMod: null, lifeStealRes,
          // A modern gaze is its own ApplyAttack call and types 6..8 jump past every rider
          // block, so it places none: only the gaze's own damage draws a histogram.
          placed: bTouchPlacedG,
          immDist: null, bloodsucker: hasAbil(b.abilities, 'bloodSucker'), version,
        };
        if (bStoningGazeActiveP) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(b, a, stepAlive, Math.max(0, Math.ceil(remaining / a.hp)),
              remaining, bStoningGazeFailP, 0, 0, aDefForGaze, aInvulnBonus,
              aBlurChance, blurBuggy, woundedTopFigHP(remaining, a.hp), false,
              aToBlockVsBAll, bMinDamageFromHits),
            atkFigs: stepAlive,
            spec: nextGazeSpec({ baseDamageCategory: 'irrecoverableDamage' }),
          }));
        }
        if (bDeathGazeActiveP) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(b, a, stepAlive, Math.max(0, Math.ceil(remaining / a.hp)),
              remaining, 0, bDeathGazeFailP, 0, aDefForGaze, aInvulnBonus,
              aBlurChance, blurBuggy, woundedTopFigHP(remaining, a.hp), false,
              aToBlockVsBAll, bMinDamageFromHits),
            atkFigs: stepAlive,
            spec: nextGazeSpec(),
          }));
        }
        if (bGazeDoomStrP > 0) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(b, a, stepAlive, Math.max(0, Math.ceil(remaining / a.hp)),
              remaining, 0, 0, bGazeDoomStrP, aDefForGaze, aInvulnBonus,
              aBlurChance, blurBuggy, woundedTopFigHP(remaining, a.hp), aBlackSleep,
              aToBlockVsBAll, bMinDamageFromHits),
            atkFigs: 1,
            spec: nextGazeSpec(),
          }));
        }
        return sequenceTouchApplyAttacks(steps, cap,
          context.sourceState || combatHealStateFromUnit(b));
      }
      // DOS only — the modern branch returned above; `sAlive` is the gazing defender's figures.
      // Same split as the attacker arm: the stoning kill is the gaze's irreversible half and
      // rides the touch channel, over the same unreduced `tAlive` the death loop reads.
      let dist = buildGazeDist(b, a, sAlive, tAlive, cap, 0, bDeathGazeFailP, bGazeDoomStrP, aDefForGaze, aInvulnBonus, aBlurChance, blurBuggy,
        isCoM2 ? woundedTopFigHP(cap, a.hp) : undefined, aBlackSleep, aToBlockVsBAll, bMinDamageFromHits, sAlive);
      // Same placement gate as the attacker arm: an immunity that skips the loop emits no key.
      const bStoningGazeReaches = !!bStoningGazeActiveP
        && stoningTouchReachesRoll(a.abilities);
      const bStoningGazeKillDist = bStoningGazeReaches
        ? buildGazeKillDist(a, tAlive, cap, bStoningGazeFailP) : null;
      const bImmGDist = (bImmWithGaze && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, b.toHitImmolation, aDefForImm,
          aToBlockVsBAll, a.hp, aInvulnBonus, bMinDamageFromHits,
          woundedTopFigHP(cap, a.hp), version, a.abilities)
        : null;
      const t = convolveTouchAttacks(dist, sAlive, {
        poisonStr: bPoisonWithGaze ? bPoisonStrG_raw : 0, poisonFail: bPoisonFailG,
        stoningFail: bStoningWithGaze ? bStoningFailG : 0,
        deathTouchFail: bDeathTouchWithGaze ? bDeathTouchFailG : 0,
        dispelEvilFail: bDispelEvilWithGaze ? bDispelEvilFailG : 0,
        exorciseFail: bExorciseWithGaze ? bExorciseFailG : 0,
        destructionFail: bDestructionWithGaze ? bDestructionFailG : 0,
        targetHP: a.hp,
        lifeStealMod: bLifeStealWithGaze ? bLifeStealModG : null, lifeStealRes,
        stoningGazeDist: bStoningGazeKillDist,
        placed: { ...bTouchPlacedG, stoningGaze: bStoningGazeReaches },
        immDist: bImmGDist,
        bloodsucker: hasAbil(b.abilities, 'bloodSucker'),
        sourceState: context.sourceState || combatHealStateFromUnit(b),
        version,
      });
      return t;
    },
  };
}
