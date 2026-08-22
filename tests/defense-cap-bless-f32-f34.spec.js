const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('F32 splits modern defense dice after die 15 and leaves boundaries unchanged', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const mean = dist => dist.reduce((sum, p, value) => sum + p * value, 0);
    const referenceRollover = (hits, blocks, hp) => {
      const memo = new Map([[0, [1]]]);
      const solve = remaining => {
        if (memo.has(remaining)) return memo.get(remaining);
        const dist = new Array(remaining + 1).fill(0);
        for (let blocked = 0; blocked < blocks.length; blocked++) {
          const probability = blocks[blocked];
          const net = Math.max(remaining - blocked, 0);
          if (net < hp) {
            dist[net] += probability;
          } else {
            const sub = solve(net - hp);
            for (let damage = 0; damage < sub.length; damage++) {
              dist[hp + damage] += probability * sub[damage];
            }
          }
        }
        memo.set(remaining, dist);
        return dist;
      };
      return solve(hits);
    };
    const makeUnit = (version, prefix, overrides = {}) => deriveUnitStats({
      prefix,
      version,
      abilities: {},
      level: 'normal',
      weapon: 'normal',
      armor: 'normal',
      rtbType: 'none',
      unitType: 'normal',
      figs: 1,
      atk: 0,
      rtb: 0,
      modernAttacks: {},
      def: 0,
      res: 10,
      hp: 100,
      dmg: 0,
      ...(version.startsWith('com2') ? { hitChance: 70 } : { toHitMod: 70, toHitRtbMod: 70 }),
      toBlkMod: 0,
      cityWalls: 'none',
      nodeAura: 'none',
      rangedCheck: false,
      rangedDist: 1,
      ...overrides,
    });

    const modern = ['com2_1.05.11', 'com2_warlord_1.5.12.7'].map(version => {
      const attacker = makeUnit(version, 'a', {
        rtb: 20,
        rtbType: 'missile',
        modernAttacks: { ranged: { strength: 20, type: 'missile' } },
      });
      const defender = makeUnit(version, 'b', { def: 20, toBlkMod: 30 });
      const profile = buildToBlockContext(attacker, defender, 0, 0, version)
        .bToBlockVsARangedEW;
      const actual = resolveCombat(attacker, defender, {
        version, isRanged: true, wallOfFire: false, distance: 1,
      });
      const blocks = defenseBlockPMF(20, profile);
      const normal = singleAttackDmgDist(20, 1, 20, profile, 100);
      const rollover = singleAttackDmgDist(20, 1, 20, profile, 3);
      const area = areaPerFigureDmgDist(20, 1, 20, profile, 100);
      return {
        version,
        profile,
        integratedMeanDamage: mean(actual.totalDmgToB),
        mean20At60: mean(defenseBlockPMF(20, profile)),
        mean15At60: mean(defenseBlockPMF(15, profile)),
        mean16At30: mean(defenseBlockPMF(16,
          { chance: 0.30, capDice: 15, cappedChance: 0.30 })),
        pmf20At60: defenseBlockPMF(20, profile),
        independent: convolveDists(
          binomialPMF(15, 0.60), binomialPMF(5, 0.30), 20),
        normal,
        normalReference: blocks.slice().reverse(),
        rollover,
        rolloverReference: referenceRollover(20, blocks, 3),
        area,
        areaReference: blocks.slice().reverse(),
        overHundred: defenseBlockPMF(20,
          { chance: 1.2, capDice: 15, cappedChance: 0.30 }),
      };
    });
    const dos = ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'].map(version => {
      const attacker = makeUnit(version, 'a');
      const defender = makeUnit(version, 'b', { def: 20, toBlkMod: 30 });
      const chance = buildToBlockContext(attacker, defender, 0, 0, version)
        .bToBlockVsAMelee;
      return { version, chance, mean: mean(defenseBlockPMF(20, chance)) };
    });
    return { modern, dos };
  });

  for (const row of report.modern) {
    expect(row.profile).toEqual({ chance: 0.6, capDice: 15, cappedChance: 0.3 });
    expect(row.mean20At60).toBeCloseTo(10.5, 12);
    expect(row.integratedMeanDamage).toBeCloseTo(9.5, 12);
    expect(row.mean15At60).toBeCloseTo(9, 12);
    expect(row.mean16At30).toBeCloseTo(4.8, 12);
    expect(row.pmf20At60).toHaveLength(21);
    row.pmf20At60.forEach((p, i) => expect(p).toBeCloseTo(row.independent[i], 14));
    row.normal.forEach((p, i) => expect(p).toBeCloseTo(row.normalReference[i], 14));
    row.rollover.forEach((p, i) => expect(p).toBeCloseTo(row.rolloverReference[i], 14));
    row.area.forEach((p, i) => expect(p).toBeCloseTo(row.areaReference[i], 14));
    expect(row.overHundred.every(p => p >= 0 && p <= 1)).toBe(true);
    expect(row.overHundred.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 14);
    expect(row.overHundred.reduce((sum, p, value) => sum + p * value, 0))
      .toBeCloseTo(16.5, 12);
  }
  for (const row of report.dos) {
    expect(row.chance, row.version).toBe(0.6);
    expect(row.mean, row.version).toBeCloseTo(12, 12);
  }
  expectNoConsoleErrors(errors);
});

test('F34 keeps Bless Defense spell-only in both modern versions', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const target = blessed => ({
      def: 4,
      res: 0,
      unitType: 'normal',
      abilities: blessed ? { bless: true } : {},
      cityWallBonus: 0,
    });
    const channels = {
      melee: { unitType: 'fantastic_chaos', rangedType: 'none', thrownType: 'none', abilities: {} },
      ranged: { unitType: 'fantastic_chaos', rangedType: 'magic', thrownType: 'none', abilities: {} },
      breath: { unitType: 'fantastic_chaos', rangedType: 'none', thrownType: 'fire', abilities: {} },
      gaze: { unitType: 'fantastic_death', rangedType: 'none', thrownType: 'none', abilities: { deathGaze: -2 } },
    };
    return ['com2_1.05.11', 'com2_warlord_1.5.12.7'].map(version => ({
      version,
      unitChannels: Object.entries(channels).map(([name, attacker]) => {
        const attackType = name === 'breath' ? 'thrown' : name;
        return {
          name,
          blessed: computeCasterDefenseForAttack(target(true), attacker, version, 0, attackType),
          plain: computeCasterDefenseForAttack(target(false), attacker, version, 0, attackType),
        };
      }),
      spellChaos: effectiveDefense(target(true), version, {
        spellId: 99, spellRealm: 'chaos', magicImmunityEligible: true,
      }),
      spellDeath: effectiveDefense(target(true), version, {
        spellId: 1, spellRealm: 'death', magicImmunityEligible: true,
      }),
      zeroId: effectiveDefense(target(true), version, {
        spellId: 0, spellRealm: 'chaos', magicImmunityEligible: true,
      }),
      nonqualifyingRealm: effectiveDefense(target(true), version, {
        spellId: 1, spellRealm: 'life', magicImmunityEligible: true,
      }),
      nonmagic: effectiveDefense(target(true), version, {
        spellId: 99, spellRealm: 'chaos', magicImmunityEligible: false,
      }),
      armorPiercingSpell: effectiveDefense(target(true), version, {
        spellId: 99, spellRealm: 'chaos', magicImmunityEligible: true,
        armorPiercing: true,
      }),
      blessResistance: effectiveResistance(target(true), version, 'death'),
    }));
  });

  for (const row of report) {
    const defenseBonus = row.version.startsWith('com2_warlord') ? 7 : 5;
    const resistanceBonus = row.version.startsWith('com2_warlord') ? 4 : 5;
    for (const channel of row.unitChannels) {
      expect(channel.blessed, `${row.version} ${channel.name}`).toBe(channel.plain);
    }
    expect(row.spellChaos).toBe(4 + defenseBonus);
    expect(row.spellDeath).toBe(4 + defenseBonus);
    expect(row.zeroId).toBe(4);
    expect(row.nonqualifyingRealm).toBe(4);
    expect(row.nonmagic).toBe(4);
    expect(row.armorPiercingSpell).toBe(Math.floor((4 + defenseBonus) / 2));
    expect(row.blessResistance).toBe(resistanceBonus);
  }
  expectNoConsoleErrors(errors);
});
