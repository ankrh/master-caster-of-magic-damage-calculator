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

function touchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison, ver, fires, record = 'global') {
  const poison = placedTouchValue(self, 'poison', record, ver);
  const poisonStr = fires && poison != null ? poison : 0;
  const stoningTouchBase = placedTouchValue(self, 'stoningTouch', record, ver);
  const deathTouchBase = placedTouchValue(self, 'deathTouch', record, ver);
  const stoningTouch = stoningTouchBase == null ? null
    : stoningTouchBase + dosChannelTouchModifier(self, 'stoningTouch', record, ver);
  const deathTouch = deathTouchBase == null ? null
    : deathTouchBase + dosChannelTouchModifier(self, 'deathTouch', record, ver);
  const dispelEvil = placedTouchValue(self, 'dispelEvil', record, ver);
  const exorcise = placedTouchValue(self, 'exorcise', record, ver);
  const destruction = placedTouchValue(self, 'destruction', record, ver);
  const lifeSteal = placedTouchValue(self, 'lifeSteal', record, ver);
  return {
    poisonStr,
    poisonFail:     poisonStr > 0 ? poisonFailProb(otherResPoison, other.abilities, ver) : 0,
    stoningFail:    (fires && stoningTouch != null)
                      ? stoningFailProb(otherResStoning, other.abilities, stoningTouch) : 0,
    deathTouchFail: (fires && deathTouch != null)
                      ? deathTouchFailProb(otherResDeath, other.abilities, deathTouch) : 0,
    dispelEvilFail: (fires && dispelEvil)
                      ? dispelEvilFailProb(otherResM, other.abilities, other.unitType) : 0,
    exorciseFail:   (fires && exorcise != null)
                      ? exorciseFailProb(otherResM, other.abilities, other.unitType, exorcise, ver) : 0,
    // Destruction remains a general touch flag. Warlord's Energy Cannon triggers it
    // from a magical beam, and the roster Magician attacks only at range.
    // otherResDeath (not otherResM): Destruction is Chaos-realm, and that figure is the
    // Bless-boosted resistance the engine uses for Death/Chaos effects.
    destructionFail: (fires && destruction != null)
                      ? destructionFailProb(otherResDeath, other.abilities, destruction, ver) : 0,
    lifeStealMod:   (fires && lifeSteal != null)
                      ? lifeStealEffective(otherResDeath, other.abilities, lifeSteal) : null,
  };
}

// Touch-attack parameters for `self` striking `other` in melee.
function meleeTouchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison, ver) {
  return touchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison, ver,
    touchAttackFires(self.atk, ver), touchRecordForPhase(ver, 'melee'));
}

// Touch-attack parameters for `self` firing alongside its gaze phase against `other`.
// DOS BU_ProcessAttack merges its ranged flag record into every non-melee call, including
// Gazes. Modern ApplyAttack attack types 6–8 jump past all six riders, so their routed
// records remain available to other phases but are inert here.
// Returns raw probs plus `*With` booleans gated on the gaze actually being active.
function gazeTouchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison, gazeActive, selfSleep, ver) {
  const modernGazeSkipsRiders = ver === 'com2_1.05.11' || ver === 'com2_warlord_1.5.12.7';
  const touch = touchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison,
    ver, true, touchRecordForPhase(ver, 'gaze'));
  // The unsigned two-step range idiom admits exactly attack types 6..8 and sends them past all
  // six rider blocks, which every other type executes in order: `Reference docs/Caster binary/
  // Combat.ApplyAttack.R5.2c.evidence.md`. Dispel Evil is not a seventh rider to exclude — it is
  // MoM's name for the flag Caster reads as Exorcise, out of scope here (`TOUCH_KEY_SCOPE_IDS`,
  // `combat_effects.js`), and so already 0 — and it rides the DOS gaze call unchanged.
  const poisonStr = modernGazeSkipsRiders ? 0 : touch.poisonStr;
  const poisonFail = modernGazeSkipsRiders ? 0 : touch.poisonFail;
  const stoningFail = modernGazeSkipsRiders ? 0 : touch.stoningFail;
  const deathTouchFail = modernGazeSkipsRiders ? 0 : touch.deathTouchFail;
  const dispelEvilFail = touch.dispelEvilFail;
  const exorciseFail = modernGazeSkipsRiders ? 0 : touch.exorciseFail;
  const destructionFail = modernGazeSkipsRiders ? 0 : touch.destructionFail;
  const lifeStealMod = modernGazeSkipsRiders ? null : touch.lifeStealMod;
  const active = !selfSleep && gazeActive;
  return {
    poisonStr, poisonFail, stoningFail, deathTouchFail, dispelEvilFail, exorciseFail, destructionFail, lifeStealMod,
    poisonWith:     active && poisonFail > 0,
    stoningWith:    active && stoningFail > 0,
    deathTouchWith: active && deathTouchFail > 0,
    dispelEvilWith: active && dispelEvilFail > 0,
    exorciseWith:   active && exorciseFail > 0,
    destructionWith: active && destructionFail > 0,
    lifeStealWith:  active && lifeStealMod !== null,
  };
}

// Gaze kill-roll probabilities: stoning and death gaze fail chances for `self` vs `other`.
function gazeKillProbs(self, selfStoningActive, selfDeathActive, other, otherResDeath, otherResStoning) {
  return {
    stoningFail: selfStoningActive ? stoningFailProb(otherResStoning, other.abilities, self.abilities.stoningGaze) : 0,
    deathFail:   selfDeathActive   ? deathGazeFailProb(otherResDeath, other.abilities, self.abilities.deathGaze)   : 0,
  };
}

// Doom damage deals exactly 1 damage per 2 points of attack strength (rounded
// down), so affected strengths are halved before their exact-damage phase.
// Intrinsic Doom affects every conventional attack; Warlord Energy Weaponry is
// melee-only and Energy Cannon is ranged-only. Gaze has its own explicit Doom
// strength. Black Sleep's damage→Doom conversion uses full strength.
// PROVENANCE[doomAttackStrengthModifiers]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:23:b0c6213a0d9c2c2e5d3f54ec | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:34:935a71829ffc2ed26b56056c | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:30:b0c2bd6060999b364362d31d | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:8:ede4f7dc06908e75ecaa412b | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:8:02e6fff5e548271398f1d598 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:9:d4b5090bf579662a98cef0d9 | Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:10:57c912964ac8750b69987067 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:21fdd7af4a50407f32527bbf | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:21fdd7af4a50407f32527bbf
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

// PROVENANCE[pairToHitModifiers]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:1ff32cf14236f60c8659c472 | Reference docs/DOS reconstructed/unitcalc.c@span:40:7a990661f197312ddc553d16 | Reference docs/DOS reconstructed/combat.c@span:20:cb4fa9e7501e8b1aefe9a152 | Reference docs/DOS reconstructed/combat.c@span:28:50bbe6203a794ed0191be832 | Reference docs/DOS reconstructed/combat.c@span:12:0485456526aaa82ac1801b1c | Reference docs/DOS reconstructed/combat.c@span:17:c3f9b1d6c7b49267895ba012 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:11:b08aaa1432383a78ae466dd0
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

// STAT-FORMULA[resolutionResistanceContext]
// PROVENANCE[resolutionResistanceContext]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:34:f8439a410123d6cce14590d2 | Reference docs/DOS reconstructed/combat.c@span:39:dbb4cbc9b3c3b594fa500562 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:21:f4adc7d2f65b9cfc509a10b0 | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:18:78623ea798a8f277b575ffcd | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:35:575882ffecd40ed0b3c1ac6f | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:40:6e6d5d731c162207114b446a | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:21:ebeef9a1796d93992d2edd16 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:3:480d9a786f490a899b5cb259 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:3:0ae9bd687c26c112798c0947
function buildResistanceContext(a, b, version) {
  if (version && version.startsWith('com2')) {
    const needsAgainst = source => ({
      // Exorcise alone: this arm is `startsWith('com2')`, and Dispel Evil is MoM's name for the
      // same rider (`TOUCH_KEY_SCOPE_IDS`, `combat_effects.js`), so a `dispelEvil` term here
      // could only name an effect these engines do not have.
      magic: abilDefined(source.abilities, 'exorcise'),
      death: hasAbil(source.abilities, 'fear')
        || abilDefined(source.abilities, 'deathTouch')
        || abilDefined(source.abilities, 'deathGaze')
        || abilDefined(source.abilities, 'destruction')
        || abilDefined(source.abilities, 'lifeSteal'),
      stoning: abilDefined(source.abilities, 'stoningTouch')
        || abilDefined(source.abilities, 'stoningGaze'),
      poison: (abilVal(source.abilities, 'poison', 0) || 0) > 0,
    });
    const aNeeds = needsAgainst(b);
    const bNeeds = needsAgainst(a);
    const resistance = (target, realm, needed) => needed
      ? effectiveResistance(target, version, realm)
      : target.res;
    return {
      bResM: resistance(b, 'life', bNeeds.magic),
      aResM: resistance(a, 'life', aNeeds.magic),
      bResDeath: resistance(b, 'death', bNeeds.death),
      aResDeath: resistance(a, 'death', aNeeds.death),
      bResStoning: resistance(b, 'nature', bNeeds.stoning),
      aResStoning: resistance(a, 'nature', aNeeds.stoning),
      bResPoison: resistance(b, null, bNeeds.poison),
      aResPoison: resistance(a, null, aNeeds.poison),
    };
  }

  // The DOS engines reach the same stage through `Combat_Effective_Resistance`, one call per
  // incoming attack realm, transcribed as the ordered `DOS_RESISTANCE_STEPS` list. The realms
  // below are the calculator's names for the `magic_realm` argument the engine derives from the
  // attack's `ranged_type`, and they are the same four the `com2` branch above passes.
  const resistance = (target, realm) => dosEffectiveResistance(target, version, realm);
  return {
    bResM: resistance(b, 'life'),
    aResM: resistance(a, 'life'),
    bResDeath: resistance(b, 'death'),
    aResDeath: resistance(a, 'death'),
    bResStoning: resistance(b, 'nature'),
    aResStoning: resistance(a, 'nature'),
    bResPoison: resistance(b, null),
    aResPoison: resistance(a, null),
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

function buildDefenseContext(a, b, version, aVertigoDefPenalty, bVertigoDefPenalty, needed = null) {
  // Aggregates Vertigo def penalty, Large Shield, Bless (defense half), Elemental Armor,
  // Armor Piercing, Weapon/Missile/Magic/Fire Immunity, Righteousness, and Illusion.
  if (version && version.startsWith('com2') && needed) {
    const defense = (target, attacker, penalty, type, active) => active
      ? computeCasterDefenseForAttack(target, attacker, version, penalty, type)
      : 0;
    const bDefVsA = defense(b, a, bVertigoDefPenalty, 'melee', needed.melee);
    const bDefVsARanged = defense(b, a, bVertigoDefPenalty, 'ranged', needed.ranged);
    const bDefForThrown = defense(b, a, bVertigoDefPenalty, 'thrown', needed.thrown);
    const bDefForGaze = defense(b, a, bVertigoDefPenalty, 'gaze', needed.aGaze);
    const bDefForImm = defense(b, a, bVertigoDefPenalty, 'immolation', needed.aImmolation);
    const aDefVsB = defense(a, b, aVertigoDefPenalty, 'melee', needed.counter);
    const aDefForGaze = defense(a, b, aVertigoDefPenalty, 'gaze', needed.bGaze);
    const aDefForImm = defense(a, b, aVertigoDefPenalty, 'immolation', needed.bImmolation);
    return {
      bDefVsA,
      bDefVsARanged,
      bDefForThrown,
      bDefForGaze,
      bDefForImm,
      aDefVsB,
      aDefForGaze,
      aDefForImm,
    };
  }

  const bDefProfile = computeDefenseProfile(b, a, version, bVertigoDefPenalty);
  const aDefProfile = computeDefenseProfile(a, b, version, aVertigoDefPenalty);
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
  };
}

// STAT-FORMULA[resolutionToBlockContext]
// PROVENANCE[resolutionToBlockContext]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:988ef64cd77214c23cb77397 | Reference docs/DOS reconstructed/combat.c@span:22:f1bd863bb2e19d690ca89983 | Reference docs/DOS reconstructed/combat.c@span:17:168e451097f43626bf9c9d57 | Reference docs/DOS reconstructed/combat.c@span:13:ee0ffb0fdc5af4e30c63a285 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:12:08b392da258c1aa5831668e7 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:34f14a18e857be474ba8f10a | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:8:ede4f7dc06908e75ecaa412b | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:4:2cb725296f6895640edcf211 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:ce6c3e49e9933d68f63f9666 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:ce6c3e49e9933d68f63f9666
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
          aHP, cap, aInvulnBonus, null, woundedTopFigHP(cap, aHP), version, aAbilities,
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
    bResDeath,
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
        ? (aDoomsB ? calcDoomDist(sAlive, a.rtb, cap)
          : calcTotalDamageDist(sAlive, a.rtb, aToHitRtbVert, bDefForThrown, bToBlockVsAThrEW, b.hp, cap, bInvulnBonus, bBlurChance, blurBuggy,
              isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined, aMinDamageFromHits))
        : [1];
      const aImmTDist = (aImmWithThrown && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, a.toHitImmolation, bDefForImm,
          bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits,
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
        lifeStealMod: aLifeStealModT, lifeStealRes: bResDeath,
        immDist: aImmTDist,
        bloodsucker: hasAbil(a.abilities, 'bloodSucker'),
        sourceState: context.sourceState || combatHealStateFromUnit(a),
        version,
      };
      let t = convolveTouchAttacks(dist, cap, sAlive, touchSpec);
      if (aHaste) t = repeatTouchAttack(t, dist, cap, sAlive, touchSpec);
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
    bResDeath,
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
          bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits,
          woundedTopFigHP(cap, b.hp), version, b.abilities)
        : null;
      const o = calcMeleeTouchOutcome(fearD, sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
        bDefVsA, bToBlockVsAMelee, b.hp, cap,
        aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aDestructionFailM, aLifeStealModM, bResDeath,
        aImmMDist, bInvulnBonus, bBlurChance, blurBuggy, aHaste,
        isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined,
        aMinDamageFromHits, hasAbil(a.abilities, 'bloodSucker'), version,
        context.sourceState || combatHealStateFromUnit(a),
        isCoM2 ? aFearProbability : null);
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
    aResDeath,
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
          aToBlockVsBAll, a.hp, cap, aInvulnBonus, bMinDamageFromHits,
          woundedTopFigHP(cap, a.hp), version, a.abilities)
        : null;
      const o = calcMeleeTouchOutcome(fearD, sAlive, bDoomsA, bBlackSleep ? 0 : applyRage(bMeleeAtkVsA, b, sAlive), bToHitMeleeVert,
        aDefVsB, aToBlockVsBMelee, a.hp, cap,
        bPoisonStrM, bPoisonFailM, bStoningFailM, bDeathTouchFailM, bDispelEvilFailM, bExorciseFailM, bDestructionFailM, bLifeStealModM, aResDeath,
        bImmMDist, aInvulnBonus, aBlurChance, blurBuggy, bCounterHaste,
        isCoM2 ? woundedTopFigHP(cap, a.hp) : undefined,
        bMinDamageFromHits, hasAbil(b.abilities, 'bloodSucker'), version,
        context.sourceState || combatHealStateFromUnit(b));
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
    bResDeath,
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
        bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits,
        woundedTopFigHP(cap, b.hp), version, b.abilities)
      : null;
    const o = calcMeleeTouchOutcome(fearDist, sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
      bDefVsA, bToBlockVsAMelee, b.hp, cap,
      aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aDestructionFailM, aLifeStealModM, bResDeath,
      aImmMDist, bInvulnBonus, bBlurChance, blurBuggy, false /* doubleStrike */,
      isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined,
      aMinDamageFromHits, hasAbil(a.abilities, 'bloodSucker'), version,
      context.sourceState || combatHealStateFromUnit(a));
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
    aExorciseFailG,
    aDestructionFailG,
    aLifeStealWithGaze,
    aLifeStealModG,
    bResDeath,
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
          targetHP: b.hp, lifeStealMod: null, lifeStealRes: bResDeath,
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
      let dist = buildGazeDist(a, b, sAlive, tAlive, cap, aStoningGazeFailP, aDeathGazeFailP, aGazeDoomStrP, bDefForGaze, bInvulnBonus, bBlurChance, blurBuggy,
        isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined, bBlackSleep, bToBlockVsAAll, aMinDamageFromHits, sAlive);
      const aImmGDist = (aImmWithGaze && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, a.toHitImmolation, bDefForImm,
          bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits,
          woundedTopFigHP(cap, b.hp), version, b.abilities)
        : null;
      const t = convolveTouchAttacks(dist, cap, sAlive, {
        poisonStr: aPoisonWithGaze ? aPoisonStrG_raw : 0, poisonFail: aPoisonFailG,
        stoningFail: aStoningWithGaze ? aStoningFailG : 0,
        deathTouchFail: aDeathTouchWithGaze ? aDeathTouchFailG : 0,
        dispelEvilFail: aDispelEvilWithGaze ? aDispelEvilFailG : 0,
        exorciseFail: aExorciseWithGaze ? aExorciseFailG : 0,
        destructionFail: aDestructionWithGaze ? aDestructionFailG : 0,
        targetHP: b.hp,
        lifeStealMod: aLifeStealWithGaze ? aLifeStealModG : null, lifeStealRes: bResDeath,
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
    bExorciseFailG,
    bDestructionFailG,
    bLifeStealWithGaze,
    bLifeStealModG,
    aResDeath,
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
          targetHP: a.hp, lifeStealMod: null, lifeStealRes: aResDeath,
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
      let dist = buildGazeDist(b, a, sAlive, tAlive, cap, bStoningGazeFailP, bDeathGazeFailP, bGazeDoomStrP, aDefForGaze, aInvulnBonus, aBlurChance, blurBuggy,
        isCoM2 ? woundedTopFigHP(cap, a.hp) : undefined, aBlackSleep, aToBlockVsBAll, bMinDamageFromHits, sAlive);
      const bImmGDist = (bImmWithGaze && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, b.toHitImmolation, aDefForImm,
          aToBlockVsBAll, a.hp, cap, aInvulnBonus, bMinDamageFromHits,
          woundedTopFigHP(cap, a.hp), version, a.abilities)
        : null;
      const t = convolveTouchAttacks(dist, cap, sAlive, {
        poisonStr: bPoisonWithGaze ? bPoisonStrG_raw : 0, poisonFail: bPoisonFailG,
        stoningFail: bStoningWithGaze ? bStoningFailG : 0,
        deathTouchFail: bDeathTouchWithGaze ? bDeathTouchFailG : 0,
        dispelEvilFail: bDispelEvilWithGaze ? bDispelEvilFailG : 0,
        exorciseFail: bExorciseWithGaze ? bExorciseFailG : 0,
        destructionFail: bDestructionWithGaze ? bDestructionFailG : 0,
        targetHP: a.hp,
        lifeStealMod: bLifeStealWithGaze ? bLifeStealModG : null, lifeStealRes: aResDeath,
        immDist: bImmGDist,
        bloodsucker: hasAbil(b.abilities, 'bloodSucker'),
        sourceState: context.sourceState || combatHealStateFromUnit(b),
        version,
      });
      return t;
    },
  };
}
