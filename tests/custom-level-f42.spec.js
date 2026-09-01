// F42 keeps the Custom card as the editable pre-level boundary even when persistence restore
// leaves a roster base record in the UI's internal cache.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

const VERSIONS = [
  'mom_1.31',
  'mom_cp_1.60.00',
  'com_6.08',
  'com2_1.05.11',
  'com2_warlord_1.5.12.9',
];

test('F42 Custom Level changes preserve pre-level card stats and base identity in every version', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(versions => {
    const change = (id, value) => {
      const control = document.getElementById(id);
      if (control.type === 'checkbox') control.checked = !!value;
      else control.value = String(value);
      control.dispatchEvent(new Event('change'));
    };
    const snapshot = prefix => ({
      selection: document.getElementById(prefix + 'Unit').value,
      figures: document.getElementById(prefix + 'Figs').value,
      melee: document.getElementById(prefix + 'Atk').value,
      sharedType: document.getElementById(prefix + 'RtbType').value,
      sharedAttack: document.getElementById(prefix + 'Rtb').value,
      modernRangedType: document.getElementById(prefix + 'ModernRangedType').value,
      modernRanged: document.getElementById(prefix + 'ModernRanged').value,
      modernThrown: document.getElementById(prefix + 'ModernThrown').value,
      modernFireBreath: document.getElementById(prefix + 'ModernFireBreath').value,
      modernLightningBreath: document.getElementById(prefix + 'ModernLightningBreath').value,
      toHit: document.getElementById(prefix + 'ToHitMod').value,
      toHitShared: document.getElementById(prefix + 'ToHitRtbMod').value,
      hitChance: document.getElementById(prefix + 'HitChance').value,
      hitMelee: document.getElementById(prefix + 'HitMelee').value,
      hitRanged: document.getElementById(prefix + 'HitRanged').value,
      hitThrown: document.getElementById(prefix + 'HitThrown').value,
      hitBreath: document.getElementById(prefix + 'HitBreath').value,
      toBlock: document.getElementById(prefix + 'ToBlkMod').value,
      defense: document.getElementById(prefix + 'Def').value,
      resistance: document.getElementById(prefix + 'Res').value,
      hits: document.getElementById(prefix + 'HP').value,
      identity: readIdentityControls(prefix),
      identityDisabled: ['BaseHero', 'BaseFantastic', 'BaseRace', 'SpecialUnit']
        .map(suffix => document.getElementById(prefix + suffix).disabled),
    });

    return versions.map((version, index) => {
      change('gameVersion', version);

      // Seed the cache with an actual roster record, then restore a Custom state over it.
      // The F42-era Level handler read this stale record and copied it back onto the card;
      // since F136 (HISTORY.md) no level handler writes a card field at all.
      const roster = (unitDatabases[version] || []).find(unit => unit.category !== 'Heroes');
      change('aUnit', roster.id);
      applyState({
        v: PAGE_STATE_VERSION,
        ids: {
          gameVersion: version,
          aUnit: 'custom',
          aFigs: String(3 + index),
          aAtk: String(11 + index),
          aRtbType: 'boulder',
          aRtb: String(7 + index),
          aModernRangedType: 'magic',
          aModernRanged: String(6 + index),
          aModernThrown: String(5 + index),
          aModernFireBreath: String(4 + index),
          aModernLightningBreath: String(3 + index),
          aToHitMod: String(10 + index),
          aToHitRtbMod: String(20 + index),
          aToBlkMod: String(30 + index),
          aDef: String(9 + index),
          aRes: String(8 + index),
          aHP: String(12 + index),
          aLevel: 'normal',
        },
        identity: {
          a: {
            isHero: false,
            baseFantastic: false,
            baseRace: index % 2 ? 'Chaos' : 'Nature',
            specialUnit: 'none',
          },
          b: persistedIdentity('b'),
        },
        generic: { a: index % 2 === 0, b: false },
      });

      const before = snapshot('a');
      const effectiveBefore = readUnitStats('a');
      change('aLevel', 'elite');
      const after = snapshot('a');
      const effectiveAfter = readUnitStats('a');
      return {
        version,
        before,
        after,
        level: document.getElementById('aLevel').value,
        effectiveBefore: {
          atk: effectiveBefore.atk,
          def: effectiveBefore.def,
          hp: effectiveBefore.hp,
        },
        effectiveAfter: {
          atk: effectiveAfter.atk,
          def: effectiveAfter.def,
          hp: effectiveAfter.hp,
        },
      };
    });
  }, VERSIONS);

  expect(report.map(result => result.version)).toEqual(VERSIONS);
  for (const result of report) {
    expect(result.before.selection, result.version).toBe('custom');
    expect(result.after, result.version).toEqual(result.before);
    expect(result.after.identityDisabled, result.version).toEqual([false, false, false, false]);
    expect(result.level, result.version).toBe('elite');
    expect(result.effectiveAfter.atk, `${result.version} applies Level downstream`).toBeGreaterThan(
      result.effectiveBefore.atk,
    );
    expect(result.effectiveAfter.def, `${result.version} applies Defense downstream`).toBeGreaterThan(
      result.effectiveBefore.def,
    );
    expect(result.effectiveAfter.hp, `${result.version} applies HP downstream`).toBeGreaterThan(
      result.effectiveBefore.hp,
    );
  }
  expectNoConsoleErrors(errors);
});

// A predefined selection keeps its identity locking across a Level change, and — since F136
// (HISTORY.md) — keeps its card as well. This test used to assert the opposite for the one
// field it looked at: that the level handler put the roster's melee value back over a hand
// edit. It did, but only for the seven fields the removed half wrote, leaving figures, To
// Block and the four channel To Hit modifiers edited, so the card ended up neither the
// record nor what the user had. `SPEC.md`, *UI contract* now states the whole record once,
// when the unit is selected, and never in part.
test('F42 leaves predefined roster Level locking intact and the card untouched', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    // A normal unit, not the fantastic default: only normal units take the experience ladder,
    // and the derived check below has to be able to move.
    const version = document.getElementById('gameVersion').value;
    const normal = (unitDatabases[version] || [])
      .find(u => u.category !== 'Heroes' && !u.baseFantastic);
    const unitEl = document.getElementById('aUnit');
    unitEl.value = String(normal.id);
    unitEl.dispatchEvent(new Event('change'));

    const level = document.getElementById('aLevel');
    const rosterAttack = String(unitBaseStats.a.atk);
    const fields = ['Atk', 'Figs', 'Def', 'Res', 'HP', 'ToHitMod', 'ToHitRtbMod', 'ToBlkMod'];
    const read = () => Object.fromEntries(
      fields.map(f => [f, document.getElementById('a' + f).value]));
    // Away from the record but well clear of the terminal stat clamp, so the level bonus
    // below has room to show in the derived value.
    document.getElementById('aAtk').value = String(Number(rosterAttack) + 5);
    const edited = read();
    const effectiveBefore = readUnitStats('a').atk;
    level.value = 'elite';
    level.dispatchEvent(new Event('change'));
    return {
      selection: document.getElementById('aUnit').value,
      rosterAttack,
      edited,
      after: read(),
      effectiveBefore,
      effectiveAfter: readUnitStats('a').atk,
      identityDisabled: ['aBaseHero', 'aBaseFantastic', 'aBaseRace', 'aSpecialUnit']
        .every(id => document.getElementById(id).disabled),
    };
  });

  expect(report.selection).not.toBe('custom');
  // The edit really moved the card away from the record, so preserving it is a claim.
  expect(report.edited.Atk).not.toBe(report.rosterAttack);
  expect(report.after).toEqual(report.edited);
  // The level still reaches the derivation; it simply never writes back to the card.
  expect(report.effectiveAfter).toBeGreaterThan(report.effectiveBefore);
  expect(report.identityDisabled).toBe(true);
  expectNoConsoleErrors(errors);
});
