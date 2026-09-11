// The main deriveUnitStats value suite: per-ability, per-enchantment and per-version stat
// expectations over the five calculator versions. Inputs state innate properties separately
// from marked effects; calculated output abilities remain the engine's merged record.

'use strict';

const {
  evalInContext, assert, assertEqual, assertClose, assertIs, baseUnitInput,
} = require('./assertions');

function runDeriveUnitStatsChecks(ctx) {
  const modernChannels = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'com2_warlord_1.5.12.9',
    rtbType: 'missile',
    rtb: 7,
    modernAttacks: {
      ranged: { strength: 7, type: 'missile' },
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
      lightningBreath: { strength: 4, type: 'lightning' },
    },
  }));
  assertEqual(modernChannels.rtb, 7, 'The shared RTB projection remains unchanged during R3.2');
  assertEqual(modernChannels.modernAttacks.ranged.strength, 7, 'Modern Ranged is derived independently');
  assertEqual(modernChannels.modernAttacks.thrown.strength, 3, 'Modern Thrown is derived independently');
  assertEqual(modernChannels.modernAttacks.fireBreath.strength, 5, 'Modern Fire Breath is derived independently');
  assertEqual(modernChannels.modernAttacks.lightningBreath.strength, 4, 'Modern Lightning Breath is derived independently');

  const modernAttackInput = {
    ranged: { strength: 7, type: 'missile' },
    thrown: { strength: 3, type: 'thrown' },
    fireBreath: { strength: 5, type: 'fire' },
    lightningBreath: { strength: 4, type: 'lightning' },
  };
  const animatedChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', innateAbilities: { doomGaze: 6 }, markedAbilities: { animated: true },
    modernAttacks: modernAttackInput,
  }));
  assertEqual(animatedChannels.modernAttacks.ranged.strength, 8,
    'Modern Animated writes conventional Ranged');
  assertEqual(animatedChannels.modernAttacks.thrown.strength, 4,
    'Modern Animated writes Thrown');
  assertEqual(animatedChannels.modernAttacks.fireBreath.strength, 6,
    'Modern Animated writes Fire Breath');
  assertEqual(animatedChannels.modernAttacks.lightningBreath.strength, 5,
    'Modern Animated writes Lightning Breath');
  assertEqual(animatedChannels.effectiveDoomGaze, 6,
    'Modern Animated leaves the independent Doom Gaze field unchanged');

  const blackPrayerChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', innateAbilities: { doomGaze: 6 }, markedAbilities: { blackPrayer: true },
    modernAttacks: modernAttackInput,
  }));
  assertEqual(blackPrayerChannels.modernAttacks.ranged.strength, 6,
    'Modern Black Prayer writes conventional Ranged');
  assertEqual(blackPrayerChannels.modernAttacks.thrown.strength, 2,
    'Modern Black Prayer writes Thrown');
  assertEqual(blackPrayerChannels.modernAttacks.fireBreath.strength, 4,
    'Modern Black Prayer writes Fire Breath');
  assertEqual(blackPrayerChannels.modernAttacks.lightningBreath.strength, 3,
    'Modern Black Prayer writes Lightning Breath');
  assertEqual(blackPrayerChannels.effectiveDoomGaze, 6,
    'Modern Black Prayer leaves the independent Doom Gaze field unchanged');

  const tacticianHeroChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', unitType: 'hero', innateAbilities: { doomGaze: 6 }, markedAbilities: { tactician: true },
    modernAttacks: modernAttackInput,
  }));
  assertEqual(tacticianHeroChannels.modernAttacks.ranged.strength, 9,
    'Modern Tactician hero writes conventional Ranged');
  assertEqual(tacticianHeroChannels.modernAttacks.thrown.strength, 3,
    'Modern Tactician hero leaves Thrown unchanged');
  assertEqual(tacticianHeroChannels.modernAttacks.fireBreath.strength, 5,
    'Modern Tactician hero leaves Fire Breath unchanged');
  assertEqual(tacticianHeroChannels.modernAttacks.lightningBreath.strength, 4,
    'Modern Tactician hero leaves Lightning Breath unchanged');
  assertEqual(tacticianHeroChannels.effectiveDoomGaze, 6,
    'Modern Tactician hero leaves the independent Doom Gaze field unchanged');

  const mindStormChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', innateAbilities: { doomGaze: 6 }, markedAbilities: { mindStorm: true },
    modernAttacks: {
      ranged: { strength: 7, type: 'missile' },
      thrown: { strength: 6, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
      lightningBreath: { strength: 4, type: 'lightning' },
    },
  }));
  assertEqual(mindStormChannels.modernAttacks.ranged.strength, 2,
    'Modern Mind Storm subtracts 5 from conventional Ranged');
  assertEqual(mindStormChannels.modernAttacks.thrown.strength, 1,
    'Modern Mind Storm subtracts 5 from Thrown');
  assertEqual(mindStormChannels.modernAttacks.fireBreath.strength, 5,
    'Modern Mind Storm leaves Fire Breath unchanged');
  assertEqual(mindStormChannels.modernAttacks.lightningBreath.strength, 4,
    'Modern Mind Storm leaves Lightning Breath unchanged');
  assertEqual(mindStormChannels.effectiveDoomGaze, 6,
    'Modern Mind Storm leaves Doom Gaze unchanged');

  const tacticianReadsLiveRanged = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', unitType: 'hero',
    markedAbilities: { tactician: true, mindStorm: true, warpAttack: true },
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
  }));
  assertEqual(tacticianReadsLiveRanged.modernAttacks.ranged, undefined,
    'Modern Tactician does not restore Ranged when the post-Warp live field remains negative');

  const trueLightChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', unitType: 'fantastic_life', trueLight: true,
    innateAbilities: { doomGaze: 6 }, modernAttacks: modernAttackInput,
  }));
  assertEqual(trueLightChannels.modernAttacks.ranged.strength, 8,
    'Warlord True Light writes conventional Ranged');
  assertEqual(trueLightChannels.modernAttacks.thrown.strength, 3,
    'Warlord True Light leaves Thrown unchanged');
  assertEqual(trueLightChannels.modernAttacks.fireBreath.strength, 5,
    'Warlord True Light leaves Fire Breath unchanged');
  assertEqual(trueLightChannels.modernAttacks.lightningBreath.strength, 4,
    'Warlord True Light leaves Lightning Breath unchanged');
  assertEqual(trueLightChannels.effectiveDoomGaze, 6,
    'Warlord True Light leaves Doom Gaze unchanged');

  const trueLightCreatesMelee = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'com2_warlord_1.5.12.9', unitType: 'fantastic_life', atk: 0,
    trueLight: true, modernAttacks: {},
  }));
  assertEqual(trueLightCreatesMelee.atk, 1,
    'Warlord True Light preserves its unconditional melee write on a Life unit with zero base melee');

  const nodeAuraChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', unitType: 'fantastic_chaos', nodeAura: 'chaos',
    innateAbilities: { doomGaze: 6 }, modernAttacks: modernAttackInput,
  }));
  assertEqual(nodeAuraChannels.modernAttacks.ranged.strength, 9,
    'Modern node aura writes positive conventional Ranged');
  assertEqual(nodeAuraChannels.modernAttacks.thrown.strength, 3,
    'Modern node aura leaves Thrown unchanged');
  assertEqual(nodeAuraChannels.modernAttacks.fireBreath.strength, 7,
    'Modern node aura writes positive Fire Breath');
  assertEqual(nodeAuraChannels.modernAttacks.lightningBreath.strength, 6,
    'Modern node aura writes positive Lightning Breath');
  assertEqual(nodeAuraChannels.effectiveDoomGaze, 6,
    'Modern node aura leaves Doom Gaze unchanged');

  const nodeAuraDoesNotCreateAttacks = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'com2_1.05.11', unitType: 'fantastic_chaos', atk: 0,
    nodeAura: 'chaos', modernAttacks: {},
  }));
  assertEqual(nodeAuraDoesNotCreateAttacks.atk, 0,
    'Modern node aura does not create melee from zero');
  assertEqual(Object.keys(nodeAuraDoesNotCreateAttacks.modernAttacks).length, 0,
    'Modern node aura does not create any independent secondary attack field from zero');

  const nodeAuraUsesBaseMelee = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', unitType: 'hero', atk: 1, nodeAura: 'chaos',
    identity: { version: 'com2_warlord_1.5.12.9', templateId: null, heroTypeId: null,
      isHero: true, baseRace: 'Chaos', baseFantastic: false, specialUnit: 'none' },
    markedAbilities: { soulFlay: true },
  }));
  assertEqual(nodeAuraUsesBaseMelee.atk, 2,
    'Modern node aura uses positive persistent melee after Soul Flay makes live melee zero');

  const nodeAuraDoesNotUseCreatedMelee = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'com2_warlord_1.5.12.9', unitType: 'hero', atk: 0, nodeAura: 'life',
    identity: { version: 'com2_warlord_1.5.12.9', templateId: null, heroTypeId: null,
      isHero: true, baseRace: 'Life', baseFantastic: false, specialUnit: 'none' },
    trueLight: true,
  }));
  assertEqual(nodeAuraDoesNotUseCreatedMelee.atk, 1,
    'Modern node aura ignores live melee created by True Light when persistent melee is zero');

  const orderedF18 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', unitType: 'hero', nodeAura: 'chaos',
    identity: { version: 'com2_1.05.11', templateId: null, heroTypeId: null,
      isHero: true, baseRace: 'Chaos', baseFantastic: false, specialUnit: 'none' },
    markedAbilities: { tactician: true, mindStorm: true, warpAttack: true },
    modernAttacks: { ranged: { strength: 10, type: 'missile' } },
  }));
  assertEqual(orderedF18.modernAttacks.ranged.strength, 5,
    'Node aura, Mind Storm, Warp, then Tactician produce the source-ordered Ranged result');
  const orderedF18Ids = orderedF18.modernAttacks.ranged.modifierTrace.entries
    .map(entry => entry.source.id);
  assert(orderedF18Ids.indexOf('nodeAura') < orderedF18Ids.indexOf('mindStorm')
      && orderedF18Ids.indexOf('mindStorm') < orderedF18Ids.indexOf('warpAttack')
      && orderedF18Ids.indexOf('warpAttack') < orderedF18Ids.indexOf('tactician'),
  'F18 modifier trace orders node aura, Mind Storm, Warp, and Tactician');

  const flameBladeAfterWarp = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { flameBlade: true, warpAttack: true },
    modernAttacks: { fireBreath: { strength: 2, type: 'fire' } },
  }));
  assertEqual(flameBladeAfterWarp.modernAttacks.fireBreath.strength, 2,
    'Warlord combat Flame Blade adds Fire Breath after region-c Warp');
  const flameBladeFireIds = flameBladeAfterWarp.modernAttacks.fireBreath.modifierTrace.entries
    .map(entry => entry.source.id);
  assert(flameBladeFireIds.indexOf('warpAttack') < flameBladeFireIds.indexOf('flameBlade'),
    'Warlord combat Flame Blade Fire Breath trace follows Warp in region d');

  const flameBladeCreatesFireBreath = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', markedAbilities: { flameBlade: true },
    modernAttacks: {},
  }));
  assertEqual(flameBladeCreatesFireBreath.modernAttacks.fireBreath.strength, 1,
    'Warlord combat Flame Blade creates strength-1 Fire Breath when the field was zero');
  assert(flameBladeCreatesFireBreath.modernAttacks.fireBreath.modifierTrace.entries
    .some(entry => entry.source.id === 'flameBlade'),
  'Created Flame Blade Fire Breath retains its region-d modifier trace');

  // F118: one Flame Blade input, whichever control supplies it. Warlord's arcane unit ability
  // and the wizard spell of the other four builds set the same record flag and run the same
  // block, so they share `calcKey: 'flameBlade'` (`enchantments.js`) and neither version's
  // control can reach a build that hides it. The Warlord amounts are the ability's own — +3
  // melee, +2 missile/Thrown, +1 Fire Breath, and the magic-weapon upgrade — not the +3 melee
  // alone that a base-game spell input used to produce here.
  const warlordBladeInput = {
    version: 'com2_warlord_1.5.12.9', atk: 5,
    modernAttacks: { ranged: { strength: 4, type: 'missile' },
      thrown: { strength: 3, type: 'thrown' }, fireBreath: { strength: 2, type: 'fire' } },
  };
  const warlordBlade = ctx.deriveUnitStats(baseUnitInput({
    ...warlordBladeInput, markedAbilities: { flameBlade: true },
  }));
  assertEqual(warlordBlade.atk, 8, 'The Warlord Flame Blade input adds its +3 melee');
  assertEqual(warlordBlade.modernAttacks.ranged.strength, 6,
    'The Warlord Flame Blade input adds its +2 to a missile Ranged channel');
  assertEqual(warlordBlade.modernAttacks.thrown.strength, 5,
    'The Warlord Flame Blade input adds its +2 to Thrown');
  assertEqual(warlordBlade.modernAttacks.fireBreath.strength, 3,
    'The Warlord Flame Blade input adds its +1 Fire Breath');
  assertEqual(warlordBlade.weapon, 'magic',
    'The Warlord Flame Blade input upgrades a normal weapon to magic');
  // The control key is not a second derivation input: nothing reads it.
  const warlordBladeStaleKey = ctx.deriveUnitStats(baseUnitInput({
    ...warlordBladeInput, innateAbilities: { flameBladeWarlord: true },
  }));
  const warlordBladeOff = ctx.deriveUnitStats(baseUnitInput({ innateAbilities: {}, ...warlordBladeInput }));
  assertEqual(warlordBladeStaleKey.atk, warlordBladeOff.atk,
    'No `flameBladeWarlord` derivation input survives the merge');
  assertEqual(warlordBladeStaleKey.weapon, warlordBladeOff.weapon,
    'No `flameBladeWarlord` derivation input reaches the weapon upgrade');
  // CoM2 keeps the spell's own arithmetic on the shared key: +3 melee and +2 missile, no
  // Thrown and no Fire Breath (`unitcalc.c` com1:0x8F596-0x8F59B nopped the Thrown test, and
  // the Fire Breath write is the Warlord-only region-`d` step).
  const com2Blade = ctx.deriveUnitStats(baseUnitInput({
    ...warlordBladeInput, version: 'com2_1.05.11', markedAbilities: { flameBlade: true },
  }));
  assertEqual(com2Blade.atk, 8, 'CoM2 Flame Blade adds its +3 melee');
  assertEqual(com2Blade.modernAttacks.ranged.strength, 6, 'CoM2 Flame Blade adds +2 to missile');
  assertEqual(com2Blade.modernAttacks.thrown.strength, 3, 'CoM2 Flame Blade reaches no Thrown');
  assertEqual(com2Blade.modernAttacks.fireBreath.strength, 2,
    'CoM2 Flame Blade reaches no Fire Breath');

  const metalFiresFantastic = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.31', unitType: 'fantastic_chaos', atk: 2, rtb: 3,
    rtbType: 'missile', markedAbilities: { metalFires: true },
  }));
  assertEqual(metalFiresFantastic.atk, 2,
    'Metal Fires leaves a Fantastic unit\'s melee unchanged');
  assertEqual(metalFiresFantastic.rtb, 3,
    'Metal Fires leaves a Fantastic unit\'s missile/Thrown strength unchanged');
  assertEqual(metalFiresFantastic.weapon, 'normal',
    'Metal Fires leaves a Fantastic unit\'s weapon quality unchanged');

  // The version boundary, asserted where it is reachable. Metal Fires is the compiled block at
  // `unitcalc.c` 131:0x9065F, which the reconstruction guards with
  // `#if BUILD == MOM131 || BUILD == CP160`: CoM 1 does not build it and `Caster.exe` has no
  // counterpart, so all three of its writes — melee 0x906C1, missile/Thrown strength 0x906FC
  // and the magic-weapon upgrade 0x90723 — are absent from the three CoM engines. This cannot
  // be a preset: `ui_abilities.js` hides the control outside MoM, so `applyPreset` leaves it
  // unchecked and `deriveUnitStats` is the only path that reaches the input at all (F111).
  // MoM 1.31 is the positive control, so the claim is an exclusion rather than an inert input.
  const metalFiresMoM = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.31', atk: 2, rtb: 3, rtbType: 'missile', markedAbilities: { metalFires: true },
  }));
  assertEqual(metalFiresMoM.atk, 3, 'MoM Metal Fires adds its +1 melee');
  assertEqual(metalFiresMoM.rtb, 4, 'MoM Metal Fires adds its +1 missile strength');
  assertEqual(metalFiresMoM.weapon, 'magic', 'MoM Metal Fires upgrades a normal weapon to magic');
  for (const version of ['com_6.08', 'com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const metalFiresCoM = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 2, rtb: 3, rtbType: 'missile', markedAbilities: { metalFires: true },
      ...(version.startsWith('com2')
        ? { modernAttacks: { ranged: { strength: 3, type: 'missile' } } } : {}),
    }));
    assertEqual(metalFiresCoM.atk, 2, `${version} builds no Metal Fires melee write`);
    assertEqual(metalFiresCoM.rtb, 3, `${version} builds no Metal Fires ranged/Thrown write`);
    assertEqual(metalFiresCoM.weapon, 'normal',
      `${version} builds no Metal Fires magic-weapon upgrade`);
  }
  const metalFiresThrownCoM2 = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'com2_1.05.11', atk: 2,
    modernAttacks: { ranged: { strength: 3, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' } },
  }));
  const metalFiresThrownCoM2On = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 2, markedAbilities: { metalFires: true },
    modernAttacks: { ranged: { strength: 3, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' } },
  }));
  assertEqual(metalFiresThrownCoM2On.modernAttacks.ranged.strength,
    metalFiresThrownCoM2.modernAttacks.ranged.strength,
    'CoM2 Metal Fires reaches no modern Ranged channel');
  assertEqual(metalFiresThrownCoM2On.modernAttacks.thrown.strength,
    metalFiresThrownCoM2.modernAttacks.thrown.strength,
    'CoM2 Metal Fires reaches no modern Thrown channel');

  const modernBlackpowder = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    innateAbilities: { outlanderWizard: true, armorPiercing: true }, markedAbilities: { rocketry: true },
    rtbType: 'missile',
    rtb: 5,
    modernAttacks: {
      ranged: { strength: 5, type: 'missile' },
      thrown: { strength: 2, type: 'thrown' },
    },
  }));
  assertEqual(modernBlackpowder.modernAttacks.ranged.type, 'boulder',
    'Blackpowder transforms the modern Ranged channel without consuming Thrown');
  assertEqual(modernBlackpowder.modernAttacks.thrown.strength, 6,
    'Blackpowder independently transforms the modern Thrown channel');

  const destiny = ctx.deriveUnitStats(baseUnitInput({
    markedAbilities: { destiny: true },
    level: 'champion',
    rtbType: 'missile',
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
    figs: 2,
    atk: 3,
    rtb: 2,
    def: 1,
    res: 4,
    hp: 2,
  }));
  assertEqual(destiny.atk, 6, 'Destiny doubles base melee attack and strips level bonuses');
  assertEqual(destiny.rtb, 4, 'Destiny doubles base ranged attack and strips level bonuses');
  assertEqual(destiny.def, 5, 'Destiny adds 4 defense');
  assertEqual(destiny.res, 8, 'Destiny adds 4 resistance');
  assertEqual(destiny.hp, 4, 'Destiny doubles hit points');
  assertEqual(destiny.unitType, 'fantastic_life', 'Destiny changes unit type to fantastic Life');
  assertEqual(destiny.abilities.supernatural, true, 'Destiny grants Supernatural for combat');

  const liveHpCharm = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    markedAbilities: { charmOfLife: true, endurance: true },
    hp: 7,
  }));
  assertEqual(liveHpCharm.hp, 13,
    'Charm of Life reads live HP after Endurance (7 + 4 + trunc(11 / 4))');

  const allEarlierHpCharm = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    markedAbilities: { charmOfLife: true, endurance: true, lionheart: true },
    hp: 7,
  }));
  assertEqual(allEarlierHpCharm.hp, 23,
    'Charm of Life reads live HP after Endurance and Lionheart (7 + 4 + 8 + trunc(19 / 4))');

  const ludusRanged = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', race: 'Orc',
    markedAbilities: { ludusAgoge: true }, rtbType: 'missile', rtb: 5,
    modernAttacks: { ranged: { strength: 5, type: 'missile' } },
  }));
  assertEqual(ludusRanged.rtb, 6,
    'Ludus Agoge preserves the executing script ranged +1 write');

  const motherFungusRanged = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', race: 'Goblin',
    markedAbilities: { motherFungus: true }, rtbType: 'missile', rtb: 5,
    modernAttacks: { ranged: { strength: 5, type: 'missile' } },
  }));
  assertEqual(motherFungusRanged.rtb, 7,
    'Mother Fungus preserves the executing script ranged +2 write');

  const altarMoonBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', race: 'Gnoll',
    markedAbilities: { altarOfTheMoon: true, focusMagic: true }, rtbType: 'none', rtb: 0,
  }));
  assertEqual(altarMoonBeforeFocus.rtb, 3,
    'Altar of the Moon does not treat the later Focus Magic ranged creation as permanent ranged');

  const ludusBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', race: 'Orc',
    markedAbilities: { ludusAgoge: true, focusMagic: true }, rtbType: 'none', rtb: 0,
  }));
  assertEqual(ludusBeforeFocus.rtb, 3,
    'Ludus Agoge does not treat the later Focus Magic ranged creation as permanent ranged');

  const motherFungusBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', race: 'Goblin',
    markedAbilities: { motherFungus: true, focusMagic: true }, rtbType: 'none', rtb: 0,
  }));
  assertEqual(motherFungusBeforeFocus.rtb, 3,
    'Mother Fungus does not treat the later Focus Magic ranged creation as permanent ranged');

  // Branch 3 of the Focus Magic ranged block grants the magical type and no strength
  // (Units.RecalculateUnits.pas; CoM2 binary - unit recalculation.md, *Focus Magic*), so from
  // that line on the record carries an ordinary magical ranged attack. Every write the chain
  // places after `c:focusMagic` must therefore treat a converted attack exactly as
  // it treats a native one of the same strength — that equivalence is the claim, not a number
  // read off the implementation. Orihalcon, Discipline and Blazing March write the channel from
  // the CoM2 binary's region `c`, and no Warlord script writes it (`UnitCalcPre.CAS` and
  // `UnitCalc.CAS` name Discipline and Blazing March only to set flags, Orihalcon not at all),
  // so the two engines must also answer alike.
  // Both engines here are modern, so each probe states the record's Ranged channel; the shared
  // slot stays beside it as the card's projection (`SPEC.md`, *Attack channels on the card*).
  const channelFor = (type, overrides) => ({
    modernAttacks: { ranged: { strength: overrides.rtb || 0, type } },
  });
  const convertedVsNative = (label, overrides) => {
    for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
      const converted = ctx.deriveUnitStats(baseUnitInput({
        version, rtbType: 'missile', ...overrides, ...channelFor('missile', overrides),
        markedAbilities: { ...(overrides.markedAbilities || {}), focusMagic: true },
      }));
      const native = ctx.deriveUnitStats(baseUnitInput({
        innateAbilities: {},
        version, rtbType: 'magic', ...overrides, ...channelFor('magic', overrides),
      }));
      assertEqual(converted.rtb, native.rtb,
        `${label} treats a Focus-converted attack as a native magical one (${version})`);
    }
    const warlord = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_warlord_1.5.12.9', rtbType: 'missile', ...overrides,
      ...channelFor('missile', overrides),
      markedAbilities: { ...(overrides.markedAbilities || {}), focusMagic: true },
    }));
    const coM2 = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_1.05.11', rtbType: 'missile', ...overrides,
      ...channelFor('missile', overrides),
      markedAbilities: { ...(overrides.markedAbilities || {}), focusMagic: true },
    }));
    assertEqual(warlord.rtb, coM2.rtb,
      `${label} reads the converted channel alike in Warlord and CoM2`);
  };
  convertedVsNative('Orihalcon', { armor: 'orihalcon', rtb: 2 });
  convertedVsNative('Discipline',
    { level: 'veteran', rtb: 1, markedAbilities: { discipline: 'overland' } });
  convertedVsNative('Blazing March', { rtb: 2, markedAbilities: { blazingMarch: true } });

  // The Warlord blade's ranged bonus sits at the same `c:flameBlade` entry, which the
  // Warlord chain places after the conversion and the CoM 1 chain before it — the version
  // difference is the step's position, not a gate. CoM 1 keeps its bonus below
  // (`com1FlameBeforeFocus`); Warlord sees the converted attack.
  const warlordBladeConverted = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { flameBlade: true, focusMagic: true }, rtbType: 'missile', rtb: 2,
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
  }));
  const warlordBladeNative = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { flameBlade: true }, rtbType: 'magic', rtb: 2,
    modernAttacks: { ranged: { strength: 2, type: 'magic' } },
  }));
  assertEqual(warlordBladeConverted.rtb, warlordBladeNative.rtb,
    'The Warlord blade treats a Focus-converted attack as a native magical one');

  const fieryFuryBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { fieryFury: true, focusMagic: true }, rtbType: 'missile', rtb: 2,
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
  }));
  assertEqual(fieryFuryBeforeFocus.rtb, 4,
    'Fiery Fury tests missile ranged before the later Warlord Focus Magic conversion');

  const ludusUsesBaseRace = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', race: 'Orc', atk: 1,
    markedAbilities: { ludusAgoge: true, ccFireBreath: true },
  }));
  assertEqual(ludusUsesBaseRace.atk, 2,
    'Permanent recruitment gates retain base race after Chaos Channels changes live identity');

  const naturalSelectionUsesBaseType = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 1,
    markedAbilities: { coal: true, ccFireBreath: true },
  }));
  assertEqual(naturalSelectionUsesBaseType.atk, 2,
    'Natural Selection retains normal base-unit eligibility after Chaos Channels');

  const pillarUsesBaseType = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', res: 1,
    markedAbilities: { pillarOfFaithRes: 2, ccFireBreath: true },
  }));
  assertEqual(pillarUsesBaseType.res, 3,
    'Pillar of Faith retains normal base-unit eligibility after Chaos Channels');

  const fieryFuryUsesBaseType = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 1,
    markedAbilities: { fieryFury: true, ccFireBreath: true },
  }));
  assertEqual(fieryFuryUsesBaseType.atk, 4,
    'Fiery Fury follows BASEFANTASTIC after Chaos Channels changes live identity');

  const ccMomThrownAtCeiling = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.31', rtb: 3, rtbType: 'thrown',
    markedAbilities: { ccFireBreath: true },
  }));
  assertEqual(ccMomThrownAtCeiling.rtb, 2,
    'MoM 1.31 Chaos Channels replaces a strength-3 Thrown shared slot with Fire Breath 2');
  assertEqual(ccMomThrownAtCeiling.thrownType, 'fire',
    'MoM 1.31 admits the Fire Breath mutation at its signed ranged ceiling');
  const ccMomTrace = ccMomThrownAtCeiling.statTrace
    .find(step => step.id === 'chaosChannels:fireBreath');
  assertEqual(ccMomTrace.changes.rtb.from, 3,
    'MoM 1.31 Chaos Channels trace starts from the source shared-slot strength');
  assertEqual(ccMomTrace.changes.rtb.to, 2,
    'MoM 1.31 Chaos Channels trace records the replacing Fire Breath write');

  const ccMomAboveCeiling = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.31', rtb: 4, rtbType: 'thrown',
    markedAbilities: { ccFireBreath: true },
  }));
  assertEqual(ccMomAboveCeiling.rtb, 4,
    'MoM 1.31 rejects a base Thrown strength above its ceiling of 3');
  assertEqual(ccMomAboveCeiling.thrownType, 'thrown',
    'MoM 1.31 leaves an above-ceiling shared Thrown slot intact');

  for (const [version, expectedStrength] of [
    ['mom_cp_1.60.00', 3],
    ['com_6.08', 3],
  ]) {
    const positiveThrown = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 3, rtbType: 'thrown',
      markedAbilities: { ccFireBreath: true },
    }));
    assertEqual(positiveThrown.rtb, expectedStrength,
      `${version}: positive base Thrown strength rejects the Chaos Channels Fire Breath option`);
    assertEqual(positiveThrown.thrownType, 'thrown',
      `${version}: rejected Chaos Channels leaves the shared Thrown type intact`);
  }

  for (const [version, grantedStrength] of [
    ['mom_1.31', 2],
    ['mom_cp_1.60.00', 2],
    ['com_6.08', 4],
  ]) {
    const emptySlot = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 0, rtbType: 'none', markedAbilities: { ccFireBreath: true },
    }));
    assertEqual(emptySlot.rtb, grantedStrength,
      `${version}: an empty DOS shared slot receives the version-specific Fire Breath strength`);
    assertEqual(emptySlot.thrownType, 'fire',
      `${version}: an empty DOS shared slot becomes Fire Breath`);

    const gazeSlot = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 2, rtbType: 'gaze_multiple', markedAbilities: { ccFireBreath: true },
    }));
    assertEqual(gazeSlot.rtb, 2,
      `${version}: a Gaze in the DOS shared slot rejects Chaos Channels Fire Breath`);
    assertEqual(gazeSlot.thrownType, 'none',
      `${version}: a DOS Gaze never gains a second Breath channel`);
    assert(!gazeSlot.statTrace.some(step => step.id === 'chaosChannels:fireBreath'),
      `${version}: rejected shared-slot Fire Breath emits no stat write`);

    const explicitGaze = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 0, rtbType: 'none',
      innateAbilities: { stoningGaze: -1 }, markedAbilities: { ccFireBreath: true },
    }));
    assertEqual(explicitGaze.rtb, 0,
      `${version}: an explicit DOS Gaze control also occupies the shared attack slot`);
    assertEqual(explicitGaze.thrownType, 'none',
      `${version}: explicit DOS Gaze and Chaos Channels Breath cannot coexist`);

    for (const breathType of ['fire', 'lightning']) {
      const existingBreath = ctx.deriveUnitStats(baseUnitInput({
        version, rtb: 2, rtbType: breathType, markedAbilities: { ccFireBreath: true },
      }));
      assertEqual(existingBreath.rtb, 2,
        `${version}: an existing ${breathType} Breath rejects Chaos Channels Fire Breath`);
      assertEqual(existingBreath.thrownType, breathType,
        `${version}: rejected Chaos Channels leaves the existing ${breathType} Breath intact`);
      assert(!existingBreath.statTrace.some(step => step.id === 'chaosChannels:fireBreath'),
        `${version}: a rejected second Breath emits no Chaos Channels stat write`);
    }
  }

  const ccPatchedSignedNegative = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_cp_1.60.00', rtb: -1, rtbType: 'thrown',
    markedAbilities: { ccFireBreath: true },
  }));
  assertEqual(ccPatchedSignedNegative.rtb, 2,
    'CP 1.60 compares the source shared strength as signed and admits negative Thrown');
  assertEqual(ccPatchedSignedNegative.thrownType, 'fire',
    'CP 1.60 replaces an admitted negative Thrown slot with Fire Breath 2');

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const ccModernBesideRanged = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 7, rtbType: 'missile',
      innateAbilities: { stoningGaze: -3 }, markedAbilities: { ccFireBreath: true },
      modernAttacks: {
        ranged: { strength: 7, type: 'missile' },
        thrown: null, fireBreath: null, lightningBreath: null,
      },
    }));
    assertEqual(ccModernBesideRanged.modernAttacks.ranged.strength, 7,
      `${version}: Chaos Channels leaves conventional Ranged unchanged`);
    assertEqual(ccModernBesideRanged.modernAttacks.fireBreath.strength, 4,
      `${version}: Chaos Channels seeds Fire Breath beside conventional Ranged and Gaze`);
    assertEqual(ccModernBesideRanged.abilities.stoningGaze, -3,
      `${version}: Chaos Channels leaves the independent Stoning Gaze unchanged`);
    const ccModernTrace = ccModernBesideRanged.modernAttacks.fireBreath.modifierTrace.entries
      .find(entry => entry.id === 'chaosChannels:fireBreath');
    assertEqual(ccModernTrace.from, 0,
      `${version}: Chaos Channels Fire Breath trace starts at the empty independent channel`);
    assertEqual(ccModernTrace.to, 4,
      `${version}: Chaos Channels Fire Breath trace records the additive grant`);
  }

  const fieryFuryBeforeRaiseDead = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', unitType: 'fantastic_nature',
    identity: {
      version: 'com2_warlord_1.5.12.9', templateId: null, heroTypeId: null,
      isHero: false, baseRace: 'Nature', baseFantastic: true, specialUnit: 'none',
    },
    markedAbilities: { fieryFury: true, raiseDead: true },
  }));
  assertEqual(fieryFuryBeforeRaiseDead.unitType, 'fantastic_unaligned',
    'Raise Dead No-Heal conversion runs after Warlord Fiery Fury identity conversion');

  const fieryFuryBeforeMysticSurge = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', unitType: 'fantastic_nature',
    identity: {
      version: 'com2_warlord_1.5.12.9', templateId: null, heroTypeId: null,
      isHero: false, baseRace: 'Nature', baseFantastic: true, specialUnit: 'none',
    },
    markedAbilities: { fieryFury: true, mysticSurge: true },
  }));
  assertEqual(fieryFuryBeforeMysticSurge.unitType, 'fantastic_unaligned',
    'Mystic Surge No-Heal conversion runs after Warlord Fiery Fury identity conversion');

  const sanctifyRetainsLiveFantastic = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { combatSummoned: true, sanctify: true },
  }));
  assertEqual(sanctifyRetainsLiveFantastic.unitType, 'fantastic_life',
    'Sanctify writes Life without clearing a non-clergy unit already made Fantastic');

  const sanctifyBeforeRaiseDead = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    innateAbilities: { clergy: true }, markedAbilities: { sanctify: true, raiseDead: true },
  }));
  assertEqual(sanctifyBeforeRaiseDead.unitType, 'fantastic_unaligned',
    'Raise Dead No-Heal conversion runs after Warlord Sanctify identity writes');

  const sanctifiedClergyHero = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', unitType: 'hero', atk: 1, trueLight: true,
    identity: {
      version: 'com2_warlord_1.5.12.9', templateId: null, heroTypeId: null,
      isHero: true, baseRace: 'High Men', baseFantastic: false, specialUnit: 'none',
    },
    innateAbilities: { clergy: true }, markedAbilities: { sanctify: true },
  }));
  assertEqual(sanctifiedClergyHero.unitType, 'hero',
    'Sanctify does not apply its clergy Fantastic write to heroes');
  assertEqual(sanctifiedClergyHero.abilities.liveRace, 'Life',
    'Sanctify still writes live Life race for heroes');
  assertEqual(sanctifiedClergyHero.abilities.liveFantastic, false,
    'Sanctify leaves a Clergy hero non-Fantastic');
  assertEqual(sanctifiedClergyHero.atk, 2,
    'Sanctified hero live Life race reaches later True Light realm gates');

  assertEqual(evalInContext(ctx,
    "supernaturalMinDamageFn({ supernatural: true }, 'mom_1.31')"), null,
  'MoM Supernatural input produces no minimum-damage callback');
  assertEqual(evalInContext(ctx,
    "supernaturalMinDamageFn({ supernatural: true }, 'com_6.08')"), null,
  'CoM Supernatural produces no minimum-damage callback');
  assertEqual(evalInContext(ctx,
    "supernaturalMinDamageForHits(9, 'com_6.08')"), 0,
  'CoM Supernatural helper has no combat effect');
  assertEqual(evalInContext(ctx,
    "supernaturalMinDamageForHits(25, 'com2_1.05.11')"), 8,
  'Modern Supernatural rounds an 8.5 tie to the even integer 8');
  assertEqual(evalInContext(ctx,
    "supernaturalMinDamageForHits(75, 'com2_1.05.11')"), 26,
  'Modern Supernatural rounds a 25.5 tie to the even integer 26');

  const uncappedPillar = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { pillarOfFaithRes: 10 }, res: 1,
  }));
  assertEqual(uncappedPillar.res, 11,
    'Pillar of Faith uses the executing script building count without an artificial cap');

  const naturalSelectionOverwrite = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { powerMinerals: 2, nightshade: 1 }, res: 3,
  }));
  assertEqual(naturalSelectionOverwrite.res, 4,
    'Natural Selection Nightshade overwrites the earlier Power-mineral resistance write');

  const naturalSelectionCount = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { powerMinerals: 2, nightshade: 3 }, res: 3,
  }));
  assertEqual(naturalSelectionCount.res, 6,
    'Natural Selection adds the full Nightshade count from the saved Resistance snapshot');

  // Wild Game adds a flat +1 to a physical or magical ranged attack. The magnitude needs a probe
  // at a size the corpus does not carry: every shipped Wild Game fixture states strength 5, so a
  // rounded percentage — `+= Math.trunc(strength / 5)` — is +1 there and agrees with all of them,
  // while a strength-2 attacker takes +0 instead of +1. F268.5 deleted this claim as "covered by
  // two fixtures" and its review disproved that with exactly this mutation: it passes all 1,161
  // fixtures on four moments and ten category moments, and the whole Node tree. Restored here,
  // which is the retired `r9-g1c` spec's only surviving assertion.
  const wildGameFlatBonusAtLowStrength = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { wildGame: true }, rtbType: 'missile', rtb: 2,
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
  }));
  assertEqual(wildGameFlatBonusAtLowStrength.modernAttacks.ranged.strength, 3,
    'Wild Game adds a flat +1, not a proportion of the ranged strength it reads');

  const wildGameDoesNotFollowFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { wildGame: true, focusMagic: true }, rtbType: 'thrown', rtb: 2,
    modernAttacks: { thrown: { strength: 2, type: 'thrown' } },
  }));
  assertEqual(wildGameDoesNotFollowFocus.rtb, 2,
    'Wild Game reads the saved conventional-ranged field rather than Focus-converted Thrown');

  const com1FlameBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', markedAbilities: { flameBlade: true, focusMagic: true },
    rtbType: 'missile', rtb: 1,
  }));
  assertEqual(com1FlameBeforeFocus.rtb, 3,
    'CoM 1 Flame Blade adds 2 before Focus Magic applies its minimum of 3');
  assertEqual(com1FlameBeforeFocus.statTrace
    .filter(step => ['level', 'weapon', 'flameBlade', 'focusMagic'].includes(step.id))
    .map(step => step.id).join(','), 'flameBlade,focusMagic',
  'CoM 1 trace preserves Flame Blade before Focus Magic when no other step mutates');

  const com1MaterialOrder = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', weapon: 'mithril', markedAbilities: { focusMagic: true },
    rtbType: 'missile', rtb: 1,
  }));
  assert(com1MaterialOrder.statTrace.findIndex(step => step.id === 'weapon')
      < com1MaterialOrder.statTrace.findIndex(step => step.id === 'focusMagic'),
    'DOS weapon material executes before CoM 1 Focus Magic');

  const focusMagicLowStrength = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    markedAbilities: { focusMagic: true },
    rtbType: 'missile',
    rtb: 1,
    modernAttacks: { ranged: { strength: 1, type: 'missile' } },
  }));
  assertEqual(focusMagicLowStrength.rangedType, 'magic',
    'Modern Focus Magic converts a low-strength physical ranged attack');
  assertEqual(focusMagicLowStrength.rtb, 1,
    'Modern Focus Magic preserves positive conversion strength below 3');

  // The magical-ranged `+3` is the branch's fourth arm, reached on `B.ranged <> 0` and a magical
  // `B.rangedtype` and carrying no live-strength test (Units.RecalculateUnits.pas:903-907), so a
  // region-`b` penalty that has already driven the field below zero does not withhold it.
  const focusMagicUnderPlague = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { focusMagic: true, plague: true },
    rtbType: 'magic', rtb: 2,
    modernAttacks: { ranged: { strength: 2, type: 'magic' } },
  }));
  assertEqual((focusMagicUnderPlague.modernAttacks.ranged || {}).strength, 2,
    'Focus Magic adds three to a permanently magical ranged attack a phase-b penalty drove below zero');

  const warlordFocusBeforeWarp = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { focusMagic: true, warpAttack: true },
    rtbType: 'magic',
    rtb: 5,
    modernAttacks: { ranged: { strength: 5, type: 'magic' } },
  }));
  assertEqual(warlordFocusBeforeWarp.rtb, 4,
    'Warlord compiled Focus Magic adds 3 before Warp Attack halves the strength');

  const modernNegativeWarp = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    markedAbilities: { mindStorm: true, warpAttack: true },
    rtbType: 'missile',
    rtb: 2,
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
  }));
  const modernNegativeWarpEntry = modernNegativeWarp.modifierTraces.sharedAttack.entries
    .find(entry => entry.source.id === 'warpAttack');
  assertEqual(modernNegativeWarpEntry.from, -3,
    'Modern Warp Attack reads the negative odd strength left by Mind Storm');
  assertEqual(modernNegativeWarpEntry.to, -1,
    'Modern Warp Attack uses signed truncate-toward-zero division');

  const beatFiveDefense = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { beatOfSwiftness: true },
    def: 5,
  }));
  assertEqual(beatFiveDefense.def, 5,
    'Beat of Swiftness rounds a 0.5 defense reduction to even');
  const beatTwentyFiveDefense = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { beatOfSwiftness: true },
    def: 25,
  }));
  assertEqual(beatTwentyFiveDefense.def, 23,
    'Beat of Swiftness rounds a 2.5 defense reduction to even');
  const beatHiddenOutsideWarlord = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    markedAbilities: { beatOfSwiftness: true },
    def: 25,
  }));
  assertEqual(beatHiddenOutsideWarlord.def, 25,
    'Beat of Swiftness is inert outside Warlord even when supplied as a raw hidden input');

  const lightningBladeThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { lightningBlade: true },
    rtbType: 'thrown',
    rtb: 4,
    modernAttacks: { thrown: { strength: 4, type: 'thrown' } },
  }));
  assert(!lightningBladeThrown.modernAttacks.thrown,
    'Lightning Blade converts the represented Thrown channel to Lightning Breath');
  assertEqual(lightningBladeThrown.modernAttacks.lightningBreath.strength, 5,
    'Lightning Blade writes Lightning Breath at Thrown + 1 strength');

  // Nature Link (Warlord rename of Land Linking) maps to the landLinking calcKey.
  // Fantastic units get the Land Linking melee/def bonus AND the Warlord +1 resistance.
  const natureLinkFantastic = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { landLinking: true },
    unitType: 'fantastic_nature',
    atk: 1, def: 1, res: 1,
  }));
  assertEqual(natureLinkFantastic.atk, 3, 'Nature Link gives fantastic units +2 melee');
  assertEqual(natureLinkFantastic.def, 3, 'Nature Link gives fantastic units +2 defense');
  assertEqual(natureLinkFantastic.res, 2, 'Nature Link gives fantastic units +1 resistance (Warlord)');

  // Normal units get only the +1 resistance, not the fantastic-only melee/def bonus.
  const natureLinkNormal = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { landLinking: true },
    unitType: 'normal',
    atk: 1, def: 1, res: 1,
  }));
  assertEqual(natureLinkNormal.atk, 1, 'Nature Link gives normal units no melee bonus');
  assertEqual(natureLinkNormal.def, 1, 'Nature Link gives normal units no defense bonus');
  assertEqual(natureLinkNormal.res, 2, 'Nature Link gives normal units +1 resistance (Warlord)');

  // CoM2 Land Linking grants no resistance bonus, even on fantastic units.
  const landLinkingCoM2 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    markedAbilities: { landLinking: true },
    unitType: 'fantastic_nature',
    atk: 1, def: 1, res: 1,
  }));
  assertEqual(landLinkingCoM2.atk, 3, 'Land Linking (CoM2) gives fantastic units +2 melee');
  assertEqual(landLinkingCoM2.res, 1, 'Land Linking (CoM2) grants no resistance bonus');

  const luckyStar = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { luckyStar: true },
    rtbType: 'missile',
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
    atk: 2, rtb: 2, def: 2, res: 2,
  }));
  assertEqual(luckyStar.atk, 3, 'Lucky Star aura gives every friendly unit +1 melee');
  assertEqual(luckyStar.rtb, 3, 'Lucky Star aura gives every friendly unit +1 ranged');
  assertEqual(luckyStar.def, 3, 'Lucky Star aura gives every friendly unit +1 armor');
  assertEqual(luckyStar.res, 3, 'Lucky Star aura gives +1 resistance and no Lucky resistance');
  assertClose(luckyStar.toHitMelee, 0.3, 'Lucky Star aura does not grant Lucky To-Hit');
  assertClose(luckyStar.toBlock, 0.3, 'Lucky Star aura does not grant Lucky To-Block');

  // Only the enchanted unit gains Lucky, expressed with the ordinary `lucky` control.
  const luckyStarTarget = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    innateAbilities: { lucky: true }, markedAbilities: { luckyStar: true },
    atk: 2, def: 2, res: 2,
  }));
  assertEqual(luckyStarTarget.res, 4, 'Enchanted unit gets the aura resistance plus Lucky resistance');
  assertClose(luckyStarTarget.toHitMelee, 0.4, 'Enchanted unit gets Lucky To-Hit');
  assertClose(luckyStarTarget.toBlock, 0.4, 'Enchanted unit gets Lucky To-Block');

  // Psycho Force (UnitCalc.CAS!COMBATOVERRIDE!+13..+17 "IF (SPELLSTATE(W,STMagitekPsycheForceConverter)=2) THEN {" "}") and Pneuma Field (UnitCalc.CAS!COMBATOVERRIDE!+19..+25 "IF (SPELLSTATE(W,STMagitekPneumaReactor)=2) THEN {" "SETSTAT(U,AFLifeSteal,0,PNEUMA,1);") read the Resistance
  // standing at their own position in region `d`. Region `e`'s aura pass raises Resistance
  // afterwards, so a Holy Bonus aura must not feed either effect. Both are Outlander-soldier
  // reforms, so the inputs are the wizard retort plus the reform, never the derived label.
  const psychoForceInput = overrides => baseUnitInput({
    innateAbilities: {},
    version: 'com2_warlord_1.5.12.9',
    level: 'veteran',
    atk: 1, def: 1, res: 4, hp: 1,
    ...overrides,
  });
  const psychoNoAura = ctx.deriveUnitStats(psychoForceInput({
    innateAbilities: { outlanderWizard: true }, markedAbilities: { psychoConverter: true },
  }));
  // These probes receive a later aura; they do not provide Holy Bonus intrinsically.
  const psychoWithAura = ctx.deriveUnitStats(psychoForceInput({
    innateAbilities: { outlanderWizard: true }, markedAbilities: { psychoConverter: true, holyBonus: 2 },
  }));
  // res 4 + Xenopsychology-free base = 5 at region d, veteran rank 2 => trunc(5 * 2 / 2) = 5.
  assertEqual(psychoNoAura.res, 5, 'Baseline resistance for the Psycho Force reads');
  assertEqual(psychoWithAura.res, 7, 'The Holy Bonus aura raises the finished resistance to 7');
  assertClose(psychoNoAura.toBlock, 0.35, 'Psycho Force adds resistance x level / 2 To-Defend');
  assertClose(psychoWithAura.toBlock, 0.35,
    'Psycho Force reads resistance at region d, so the region-e aura does not feed it');
  assertClose(psychoWithAura.toHitMelee, 0.35,
    'and the same pre-aura value drives its To-Hit half');

  const pneumaNoAura = ctx.deriveUnitStats(psychoForceInput({
    innateAbilities: { outlanderWizard: true }, markedAbilities: { pneumaReactor: true },
  }));
  const pneumaWithAura = ctx.deriveUnitStats(psychoForceInput({
    innateAbilities: { outlanderWizard: true }, markedAbilities: { pneumaReactor: true, holyBonus: 2 },
  }));
  assertEqual(pneumaNoAura.abilities.lifeSteal, -2, 'Pneuma Field drains trunc(resistance / 2)');
  assertEqual(pneumaWithAura.abilities.lifeSteal, -2,
    'Pneuma Field reads resistance at region d, so the region-e aura does not deepen the drain');
  const pneumaWarped = ctx.deriveUnitStats(psychoForceInput({
    innateAbilities: { outlanderWizard: true }, markedAbilities: { pneumaReactor: true, warpResist: true },
  }));
  assertEqual(pneumaWarped.abilities.lifeSteal, 0,
    'Warp Resist zeroes resistance in region c, so Pneuma Field drains nothing');

  const trueSight = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { trueSight: true },
    rtbType: 'magic',
    rtb: 1,
    modernAttacks: { ranged: { strength: 1, type: 'magic' } },
  }));
  assertEqual(trueSight.abilities.illusionImmunity, true, 'True Sight grants Illusion Immunity');
  assertClose(trueSight.toHitMelee, 0.3, 'True Sight does not boost melee To-Hit');
  assertClose(trueSight.toHitRtb, 0.35, 'True Sight gives +5% ranged To-Hit in Warlord');

  const eyeOfHeavenTrueSight = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { eyeOfHeaven: true },
    rtbType: 'magic',
    rtb: 1,
    modernAttacks: { ranged: { strength: 1, type: 'magic' } },
  }));
  assertClose(eyeOfHeavenTrueSight.toHitRtb, 0.35, 'Eye of Heaven grants the True Sight To-Hit bonus');

  // UnitCalc.CAS!NOTZEAL!+3..+5 "IF (GETENCHANTMENTFLAG(U,EncTrueSight,0)>0) THEN {" "}" writes SToRanged alone. The engine record carries hitchancethrown and
  // hitchancebreath as separate fields, so neither receives the bonus.
  const eyeOfHeavenBreath = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { eyeOfHeaven: true },
    rtbType: 'fire',
    rtb: 1,
    modernAttacks: { fireBreath: { strength: 1, type: 'fire' } },
  }));
  assertClose(eyeOfHeavenBreath.toHitRtb, 0.3,
    'True Sight writes SToRanged only, so Fire Breath To-Hit is unchanged');

  const academyMagicRanged = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { alumniOfAcademy: true },
    race: 'Halfling',
    name: 'Halfling Shamans',
    modernAttacks: { ranged: { strength: 3, type: 'magic' } },
    figs: 6,
  }));
  assertEqual(academyMagicRanged.figs, 8, 'Academy gives a Halfling magical-ranged unit +2 figures');

  const academyMechanical = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    innateAbilities: { mechanical: true }, markedAbilities: { alumniOfAcademy: true },
    race: 'Halfling',
    name: 'Mechanical Shamans',
    modernAttacks: { ranged: { strength: 3, type: 'magic' } },
    figs: 6,
  }));
  assertEqual(academyMechanical.figs, 6, 'Academy excludes Mechanical magical-ranged units');

  const academyRocs = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { alumniOfAcademy: true },
    race: 'Halfling',
    name: 'Halfling Rocs',
    figs: 2,
  }));
  assertEqual(academyRocs.figs, 4, 'Academy gives Halfling Rocs +2 figures');

  const academyOtherRace = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    markedAbilities: { alumniOfAcademy: true },
    race: 'High Men',
    name: 'High Men Magicians',
    modernAttacks: { ranged: { strength: 3, type: 'magic' } },
    figs: 4,
  }));
  assertEqual(academyOtherRace.figs, 4, 'Academy is inert outside the Halfling race');

  const innerPower = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: { fireImmunity: true }, markedAbilities: { innerPower: true },
    rtbType: 'fire',
    rtb: 1,
    modernAttacks: { fireBreath: { strength: 1, type: 'fire' } },
  }));
  assertEqual(innerPower.atk, 4, 'Inner Power eligible unit gains melee attack');
  assertEqual(innerPower.rtb, 4, 'Inner Power eligible unit gains breath attack');
  assertEqual(innerPower.def, 3, 'Inner Power eligible unit gains defense');
  assertEqual(innerPower.res, 3, 'Inner Power eligible unit gains resistance');
  assertEqual(innerPower.abilities.innerPower, true, 'Inner Power remains active when eligible');

  const ineligibleInnerPower = ctx.deriveUnitStats(baseUnitInput({
    markedAbilities: { innerPower: true },
    rtbType: 'fire',
    rtb: 1,
    modernAttacks: { fireBreath: { strength: 1, type: 'fire' } },
  }));
  assertEqual(ineligibleInnerPower.atk, 1, 'Inner Power ineligible unit does not gain melee attack');
  // Re-aimed from the published `abilities.innerPower` onto the stats the block writes. The
  // eligibility test is `c:innerPower`'s own `when` now rather than a suppression of the
  // published key, so the key carries the raw enchantment flag and the consequence to assert is
  // the one the four lines above state for the eligible unit (F200).
  assertEqual(ineligibleInnerPower.rtb, 1, 'Inner Power ineligible unit does not gain breath attack');
  assertEqual(ineligibleInnerPower.def, 1, 'Inner Power ineligible unit does not gain defense');
  assertEqual(ineligibleInnerPower.res, 1, 'Inner Power ineligible unit does not gain resistance');

  const holyWeaponThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_cp_1.60.00',
    markedAbilities: { holyWeapon: true },
    rtbType: 'thrown',
    rtb: 2,
  }));
  assertEqual(holyWeaponThrown.rtbToHitWpnBonus, 0, 'Holy Weapon thrown to-hit bonus is tracked separately from weapon bonus');
  assertClose(holyWeaponThrown.toHitRtb, 0.4, 'Holy Weapon boosts thrown to-hit outside MoM 1.31');

  // Units.RecalculateUnits.pas:1806-1809 writes hitchancemelee, hitchancethrown and — for a
  // non-magical type — hitchanceranged. hitchancebreath is not among them, and no other write
  // in that routine touches it, so a Breath channel keeps the unmodified common value.
  const holyWeaponChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    markedAbilities: { holyWeapon: true },
    modernAttacks: {
      ranged: { strength: 4, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' },
      fireBreath: { strength: 4, type: 'fire' },
    },
  }));
  assertClose(holyWeaponChannels.modernAttacks.ranged.toHit, 0.4,
    'Holy Weapon reaches the Ranged To-Hit modifier');
  assertClose(holyWeaponChannels.modernAttacks.thrown.toHit, 0.4,
    'Holy Weapon reaches the Thrown To-Hit modifier');
  assertClose(holyWeaponChannels.modernAttacks.fireBreath.toHit, 0.3,
    'Holy Weapon does not reach the Breath To-Hit modifier');
  assertClose(holyWeaponChannels.toHitMelee, 0.4,
    'Holy Weapon reaches the melee To-Hit modifier');

  const darknessDeath = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
    def: 3,
    res: 5,
    darkness: true,
  }));
  assertEqual(darknessDeath.atk, 5, 'Darkness gives Death units +1 melee attack');
  assertEqual(darknessDeath.rtb, 3, 'Darkness gives Death units +1 ranged attack');
  assertEqual(darknessDeath.def, 4, 'Darkness gives Death units +1 defense');
  assertEqual(darknessDeath.res, 6, 'Darkness gives Death units +1 resistance');

  const modernDarknessDoesNotBoostGaze = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    unitType: 'fantastic_death',
    innateAbilities: { doomGaze: 4 },
    darkness: true,
  }));
  assertEqual(modernDarknessDoesNotBoostGaze.abilities.doomGaze, 4,
    'Modern Darkness does not write the separate Doom Gaze field');

  const modernDarknessPositiveGates = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'com2_1.05.11',
    unitType: 'fantastic_life',
    atk: 0,
    rtb: 0,
    def: 0,
    res: 0,
    darkness: true,
  }));
  assert(!modernDarknessPositiveGates.statTrace.some(entry => entry.id === 'darkness'),
    'Modern Darkness does not subtract from zero Life attack, defense, or resistance channels');

  const modernChaosSurgeKeepsBaseMeleeGate = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    unitType: 'fantastic_chaos',
    markedAbilities: { blazeOfGlory: true },
    chaosSurge: 1,
    atk: 0,
    def: 4,
  }));
  assertEqual(modernChaosSurgeKeepsBaseMeleeGate.atk, 4,
    'Modern Chaos Surge does not create melee before Blaze of Glory widens the slot');

  const trueLightDeath = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'mom_cp_1.60.00',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    trueLight: true,
  }));
  assertEqual(trueLightDeath.atk, 3, 'True Light gives Death units -1 melee attack in MoM');
  assertEqual(trueLightDeath.rtb, 1, 'True Light gives Death units -1 ranged attack in MoM');
  assertEqual(trueLightDeath.def, 2, 'True Light gives Death units -1 defense in MoM');
  assertEqual(trueLightDeath.res, 4, 'True Light gives Death units -1 resistance in MoM');

  const bothLightDark = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'mom_cp_1.60.00',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    trueLight: true,
    darkness: true,
  }));
  assertEqual(bothLightDark.atk, 4, 'True Light and Darkness cancel Death melee attack modifiers');
  assertEqual(bothLightDark.rtb, 2, 'True Light and Darkness cancel Death ranged attack modifiers');
  assertEqual(bothLightDark.def, 3, 'True Light and Darkness cancel Death defense modifiers');
  assertEqual(bothLightDark.res, 5, 'True Light and Darkness cancel Death resistance modifiers');

  const eternalNightDeathMoM = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_cp_1.60.00',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    markedAbilities: { eternalNight: true },
  }));
  assertEqual(eternalNightDeathMoM.atk, 5, 'Eternal Night uses normal Darkness melee attack in MoM');
  assertEqual(eternalNightDeathMoM.rtb, 3, 'Eternal Night uses normal Darkness ranged attack in MoM');
  assertEqual(eternalNightDeathMoM.def, 4, 'Eternal Night uses normal Darkness defense in MoM');
  assertEqual(eternalNightDeathMoM.res, 6, 'Eternal Night uses normal Darkness resistance in MoM');

  const enemyEternalNightNormalMoM = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'mom_cp_1.60.00',
    unitType: 'normal',
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightNormalMoM.res, 5, 'Enemy Eternal Night has no extra non-Death resistance penalty in MoM');

  const eternalNightDeath = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'com2_1.05.11',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
    def: 3,
    res: 5,
    eternalNight: true,
  }));
  assertEqual(eternalNightDeath.atk, 6, 'Eternal Night gives Death units +2 melee attack in CoM2');
  assertEqual(eternalNightDeath.rtb, 4, 'Eternal Night gives Death units +2 ranged attack in CoM2');
  assertEqual(eternalNightDeath.def, 5, 'Eternal Night gives Death units +2 defense in CoM2');
  assertEqual(eternalNightDeath.res, 6, 'Eternal Night gives Death units the normal +1 Darkness resistance in CoM2');

  const eternalNightDeathCoM = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    markedAbilities: { eternalNight: true },
  }));
  assertEqual(eternalNightDeathCoM.atk, 5, 'Eternal Night uses normal Darkness melee attack in CoM');
  assertEqual(eternalNightDeathCoM.rtb, 3, 'Eternal Night uses normal Darkness ranged attack in CoM');
  assertEqual(eternalNightDeathCoM.def, 4, 'Eternal Night uses normal Darkness defense in CoM');
  assertEqual(eternalNightDeathCoM.res, 6, 'Eternal Night uses normal Darkness resistance in CoM');

  const enemyEternalNightNormalCoM = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'com_6.08',
    unitType: 'normal',
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightNormalCoM.res, 4, 'Enemy Eternal Night gives non-Death normal units -1 resistance in CoM');

  const enemyEternalNightLifeCoM2 = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'com2_1.05.11',
    unitType: 'fantastic_life',
    atk: 4,
    def: 3,
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightLifeCoM2.atk, 3, 'Enemy Eternal Night applies the Darkness attack penalty once to Life units in CoM2');
  assertEqual(enemyEternalNightLifeCoM2.def, 2, 'Enemy Eternal Night applies the Darkness defense penalty once to Life units in CoM2');
  assertEqual(enemyEternalNightLifeCoM2.res, 3, 'Enemy Eternal Night applies Darkness resistance plus enemy resistance penalty to Life units in CoM2');

  const enemyEternalNightDeathCoM2 = ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    version: 'com2_1.05.11',
    unitType: 'fantastic_death',
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightDeathCoM2.res, 6, 'Enemy Eternal Night does not apply the extra resistance penalty to Death units');
}

// --- F33 / F56: the modern hero ranged exemption, and the gaze fields the level ladder skips ---
//
// Tag: regression.  Anchor: F33, F56.  Migrated out of `tests/range-level-f33-f56.spec.js` by F268.4
// and reduced there under that item's deletion default.  Everything kept below is
// `data-scope="core"`, so the browser bought it nothing; it keeps its own
// `--only range-level-f33-f56` command through `MIGRATED_SUITES`.
//
// **What survived, and why only this.**  Removing the hero exemption for `com2`/Warlord alone --
// leaving CoM 1's intact -- left all 1,161 preset fixtures green on all four moments and all ten
// damage-category moments, and the other 29,664 Node assertions with them.  No fixture pairs a
// hero with a ranged distance above 1, so the modern arm is corpus-unreachable.  The *DOS and
// CoM 1* arms are reachable and were dropped: removing the exemption outright fails
// `distPenaltyHeroCoM12`, and replacing the CoM2 per-tile formula with CoM 1's divisor fails
// `distPenaltyCoM2_6` and `distPenaltyCoM2_16`.
//
// **F56 stayed too, and the reasoning that first retired it was wrong.**  F268.4 initially
// concluded the claim was unfalsifiable: a modern derived unit has no `gaze` or `doomGaze` field
// (`'gaze' in derived === false` for `com2_1.05.11` -- those are the DOS record's), and writing
// `u.abilities.stoningGaze` from inside the level step leaves the derived value at its stated
// `-3`, so three separate mutations all moved no number.  **The review broke that** with a fourth
// aimed at the object the derivation actually shares: `ctx.markedAbilities` is the
// `effectiveAbilities` map `stats.js` hands the sequence, the published combat abilities copy it,
// and the level step's closure can reach it.  Decrementing `ctx.markedAbilities.stoningGaze` by
// the ranged level bonus -- the plausible mistake of running a modern gaze's resistance modifier
// through the ranged ladder -- moves the elite value from `-3` to `-5` in both modern builds and
// is caught by **nothing**: not the corpus, not the rest of the Node checks.  Reproduced before
// restoring.  "I could not construct one" is a statement about the search, not about the code.
//
// The *DOS* half of F56 is a real behaviour and is corpus-reachable, so it stayed retired:
// zeroing the DOS gaze level step fails the preset corpus.
//
// Also dropped, and lost with the spec: the `#rangedDistLabel` control tooltip's statement that
// heroes ignore the penalty, which is a DOM read no Node context can make, and the three gaze
// tooltips' "Level does not modify this independent gaze field" line.  Nothing else in the tree
// asserts either -- see the F268.4 report's coverage-given-up paragraph.

const F33_MODERN = ['com2_1.05.11', 'com2_warlord_1.5.12.9'];

function runRangeLevelF33F56Checks(ctx) {
  // ---- F33: CoM2 and Warlord exempt heroes from physical ranged distance penalties ----
  const derive = (version, identity) => ctx.deriveUnitStats(baseUnitInput({
    innateAbilities: {},
    prefix: 'a', version, rtbType: 'missile', atk: 1, rtb: 10, def: 0, res: 5, hp: 10,
    toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0, rangedCheck: true, rangedDist: 8, identity,
    modernAttacks: { ranged: { strength: 10, type: 'missile' } },
  }));

  for (const version of F33_MODERN) {
    // [F33-1] The rule at its own function, on both physical ranged types and on neither of the
    // types it does not gate.  `distancePenalty`'s hero arm is `version.startsWith('com')`, so
    // this is its modern half; the DOS and CoM 1 halves are the corpus's.
    assertIs(ctx.distancePenalty(8, 'missile', false, version, true), 0,
      `${version}: a hero takes no missile distance penalty`);
    assertIs(ctx.distancePenalty(8, 'missile', false, version, false), -22,
      `${version}: a non-hero takes the full missile distance penalty`);
    assertIs(ctx.distancePenalty(8, 'boulder', false, version, true), 0,
      `${version}: a hero takes no boulder distance penalty`);
    assertIs(ctx.distancePenalty(8, 'boulder', false, version, false), -22,
      `${version}: a non-hero takes the full boulder distance penalty`);

    // [F33-2] and through a whole derivation, on a roster hero and a custom one, because the
    // exemption is only worth anything if the hero flag reaches the call.  The roster arm also
    // fails loud rather than passing vacuously if the roster stops shipping a physical-ranged
    // hero at all.
    const roster = evalInContext(ctx,
      version === 'com2_1.05.11' ? 'COM2_UNITS_DATA' : 'WARLORD_UNITS_DATA');
    const physical = unit => unit.ranged_type === 'Missile' || unit.ranged_type === 'Boulder';
    const rosterHero = Object.values(roster).find(unit => unit.isHero && physical(unit));
    const rosterNormal = Object.values(roster).find(unit => !unit.isHero && physical(unit));
    assert(rosterHero && rosterNormal,
      `${version}: the roster ships both a hero and a non-hero with a physical ranged attack, `
      + 'so the pair below is not an empty comparison');
    const derivedHero = derive(version, ctx.createRosterUnitIdentity(version, rosterHero));
    const derivedNormal = derive(version, ctx.createRosterUnitIdentity(version, rosterNormal));
    assertIs(derivedHero.isHero, true, `${version}: ${rosterHero.name} derives as a hero`);
    assertIs(derivedHero.rtbDistPenalty, 0,
      `${version}: the roster hero ${rosterHero.name} takes no distance penalty`);
    assert(!derivedHero.modifierTraces.toHitRanged.entries
      .some(entry => entry.source.id === 'distancePenalty'),
    `${version}: the roster hero's To Hit chain records no distance step at all`);
    assertIs(derivedNormal.isHero, false,
      `${version}: ${rosterNormal.name} derives as a non-hero`);
    assertIs(derivedNormal.rtbDistPenalty, -22,
      `${version}: the roster non-hero ${rosterNormal.name} takes the full penalty`);
    assert(derivedNormal.modifierTraces.toHitRanged.entries
      .some(entry => entry.source.id === 'distancePenalty'),
    `${version}: the roster non-hero's To Hit chain records the distance step`);

    const customHero = derive(version, ctx.createCustomUnitIdentity(version, {
      isHero: true, baseRace: 'High Men', baseFantastic: false,
    }));
    const customNormal = derive(version, ctx.createCustomUnitIdentity(version, {
      isHero: false, baseRace: 'High Men', baseFantastic: false,
    }));
    assertIs(customHero.rtbDistPenalty, 0,
      `${version}: a custom hero takes no distance penalty`);
    assertIs(customNormal.rtbDistPenalty, -22,
      `${version}: a custom non-hero takes the full penalty`);
  }

  // ---- F56: no modern gaze field is moved by the level bonus step ----
  const gazeDerive = (version, overrides = {}) => ctx.deriveUnitStats(baseUnitInput({
    prefix: 'a', version, innateAbilities: { stoningGaze: -3, deathGaze: -2, doomGaze: 4 },
    level: 'elite', atk: 1, def: 0, res: 5, hp: 10, toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0,
    modernAttacks: {}, ...overrides,
  }));

  for (const version of F33_MODERN) {
    const elite = gazeDerive(version);
    const levelStep = elite.statTrace.find(entry => entry.id === 'level');
    // [F56-1] the step's own write set names neither gaze field...
    assert(!levelStep.changes.gaze && !levelStep.changes.doomGaze,
      `${version}: the level step's write set names neither gaze field`);
    // [F56-2] ...and the values the card reads back are the ones the record stated.  This is the
    // assertion the review's counter-example needs: it reads the ability map, which is the object
    // a level step could actually reach and move.
    assertIs(elite.abilities.stoningGaze, -3, `${version}: elite Stoning Gaze is unmoved`);
    assertIs(elite.abilities.deathGaze, -2, `${version}: elite Death Gaze is unmoved`);
    assertIs(elite.abilities.doomGaze, 4, `${version}: elite Doom Gaze is unmoved`);
    const hero = gazeDerive(version, {
      identity: ctx.createCustomUnitIdentity(version, {
        isHero: true, baseRace: 'High Men', baseFantastic: false,
      }),
    });
    assertIs(hero.abilities.stoningGaze, -3, `${version}: elite hero Stoning Gaze is unmoved`);
    assertIs(hero.abilities.deathGaze, -2, `${version}: elite hero Death Gaze is unmoved`);
    assertIs(hero.abilities.doomGaze, 4, `${version}: elite hero Doom Gaze is unmoved`);

    // [F56-3] The control the claim needs: the same elite step does move every conventional
    // channel, so "unmoved" is about the gaze fields and not about the step being inert.
    const conventional = gazeDerive(version, {
      modernAttacks: {
        ranged: { strength: 2, type: 'missile' },
        thrown: { strength: 2, type: 'thrown' },
        fireBreath: { strength: 2, type: 'fire' },
        lightningBreath: { strength: 2, type: 'lightning' },
      },
    });
    assertIs(conventional.modernAttacks.ranged.strength, 4,
      `${version}: the elite ladder moves the conventional Ranged channel`);
    assertIs(conventional.modernAttacks.thrown.strength, 3,
      `${version}: the elite ladder moves the Thrown channel`);
    assertIs(conventional.modernAttacks.fireBreath.strength, 3,
      `${version}: the elite ladder moves the Fire Breath channel`);
    assertIs(conventional.modernAttacks.lightningBreath.strength, 3,
      `${version}: the elite ladder moves the Lightning Breath channel`);
  }
}

module.exports = { runDeriveUnitStatsChecks, runRangeLevelF33F56Checks };
