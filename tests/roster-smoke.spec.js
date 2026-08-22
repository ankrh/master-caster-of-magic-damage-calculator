// Roster smoke test: for every game version, select every unit in the picker
// and assert the page stays healthy (no console errors / page crashes) and the
// core stat fields become real numbers. A handful of spot-checks confirm the
// selected unit's stats actually came from the units_*.js data table.
//
// This is a SMOKE test — it does not assert specific stat values for every
// unit; correctness of the numbers is the PRESETS suite's job.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue, gameVersions } = require('./helpers');

const VERSIONS = gameVersions();

for (const version of VERSIONS) {
  test(`every roster unit selects cleanly (${version})`, async ({ page }) => {
    test.setTimeout(90_000);
    const errors = await openCalculator(page);
    await setValue(page, 'gameVersion', version);

    // Drive selection the way the combobox does (set the hidden #aUnit value and
    // dispatch a real 'change'), inside one evaluate loop to avoid per-unit
    // Playwright round-trips. unitComboboxData holds the picker's flat list.
    const report = await page.evaluate(() => {
      const list = (typeof unitComboboxData !== 'undefined' && unitComboboxData['a']) || [];
      const hidden = document.getElementById('aUnit');
      const db = unitDatabases[document.getElementById('gameVersion').value] || [];
      const num = v => v !== '' && v != null && Number.isFinite(Number(v));
      const bad = [];
      const identityBad = [];
      for (const u of list) {
        const source = db.find(unit => String(unit.id) === u.id);
        hidden.value = u.id;
        hidden.dispatchEvent(new Event('change'));
        const figs = document.getElementById('aFigs').value;
        const hp = document.getElementById('aHP').value;
        const atk = document.getElementById('aAtk').value;
        const def = document.getElementById('aDef').value;
        const res = document.getElementById('aRes').value;
        if (!(num(figs) && num(hp) && num(atk) && num(def) && num(res)
              && Number(figs) >= 1 && Number(hp) >= 1)) {
          bad.push({ id: u.id, name: u.name, figs, hp, atk, def, res });
        }
        const identity = readUnitStats('a').identity;
        if (!(identity.version === document.getElementById('gameVersion').value
              && source
              && identity.templateId === source.templateId
              && identity.heroTypeId === source.heroTypeId
              && identity.isHero === source.isHero
              && identity.baseRace === source.baseRace
              && identity.baseFantastic === source.baseFantastic
              && identity.race === source.baseRace
              && identity.fantastic === source.baseFantastic
              && !Object.prototype.hasOwnProperty.call(identity, 'chosen')
              && !Object.prototype.hasOwnProperty.call(identity, 'golem'))) {
          identityBad.push({ id: u.id, name: u.name, source, identity });
        }
      }
      hidden.value = 'custom';
      hidden.dispatchEvent(new Event('change'));
      const fantastic = document.getElementById('aBaseFantastic');
      const race = document.getElementById('aBaseRace');
      fantastic.checked = true;
      fantastic.dispatchEvent(new Event('change'));
      race.value = 'Chaos';
      race.dispatchEvent(new Event('change'));
      const fantasticIdentity = { ...unitIdentity['a'] };
      const hero = document.getElementById('aBaseHero');
      hero.checked = true;
      hero.dispatchEvent(new Event('change'));
      const customIdentity = readUnitStats('a').identity;
      return { count: list.length, bad, identityBad, customIdentity,
        fantasticIdentity, storedCustomIdentity: unitIdentity['a'] };
    });

    expect(report.count, 'the picker should have units for this version').toBeGreaterThan(0);
    expect(report.bad, 'every unit yields numeric core stats').toEqual([]);
    expect(report.identityBad, 'every predefined unit carries source/base/live identity').toEqual([]);
    expect(report.customIdentity.templateId, 'custom template ID').toBeNull();
    expect(report.customIdentity.heroTypeId, 'custom hero-type ID').toBeNull();
    expect(report.customIdentity.isHero, 'custom Hero remains independent of null IDs').toBe(true);
    expect(report.fantasticIdentity.baseRace, 'custom Fantastic realm is stored independently').toBe('Chaos');
    expect(report.fantasticIdentity.baseFantastic, 'custom Fantastic flag is synchronized').toBe(true);
    expect(report.storedCustomIdentity.templateId, 'stored custom template ID').toBeNull();
    expect(report.storedCustomIdentity.heroTypeId, 'stored custom hero-type ID').toBeNull();
    expect(report.storedCustomIdentity.isHero, 'stored custom Hero flag is synchronized').toBe(true);
    expect(report.storedCustomIdentity.baseFantastic, 'stored custom Fantastic remains independent').toBe(true);

    // Spot-checks: for a few units that have a melee value (so applyLevelBonuses
    // writes the stat fields), the DOM must match the data-table record.
    const spot = await page.evaluate(() => {
      const db = (typeof unitDatabases !== 'undefined' && unitDatabases[document.getElementById('gameVersion').value]) || [];
      const hidden = document.getElementById('aUnit');
      const withMelee = db.filter(u => u.category !== 'Heroes' && typeof u.melee === 'number' && u.melee > 0).slice(0, 4);
      const out = [];
      for (const u of withMelee) {
        hidden.value = String(u.id);
        hidden.dispatchEvent(new Event('change'));
        out.push({
          name: u.name,
          figsOk: document.getElementById('aFigs').value === String(u.figures || 1),
          hpOk: document.getElementById('aHP').value === String(u.hp),
          defOk: document.getElementById('aDef').value === String(u.defense),
          resOk: document.getElementById('aRes').value === String(u.resist),
        });
      }
      return out;
    });
    expect(spot.length, 'at least one spot-check unit exists').toBeGreaterThan(0);
    for (const s of spot) {
      expect(s.figsOk, `${s.name}: figures match roster`).toBe(true);
      expect(s.hpOk, `${s.name}: hp matches roster`).toBe(true);
      expect(s.defOk, `${s.name}: defense matches roster`).toBe(true);
      expect(s.resOk, `${s.name}: resist matches roster`).toBe(true);
    }

    expectNoConsoleErrors(errors);
  });
}

// F121: the card and the matrix build a roster unit's modern attack channels from the same
// reader, so a record that states no attack reaches `deriveUnitStats` as four empty fields on
// both paths. That is what the ungated channel-creating engine writes need to land on, and it
// used to hold on the card only — the matrix passed `null` and silently created nothing.
// `SPEC.md`, *UI contract*: matrix rows enter the same boundary as the card.
for (const version of VERSIONS.filter(v => v.startsWith('com2'))) {
  test(`card and matrix read one modern attack record (${version})`, async ({ page }) => {
    const errors = await openCalculator(page);
    await setValue(page, 'gameVersion', version);

    const report = await page.evaluate(() => {
      const version = document.getElementById('gameVersion').value;
      const db = unitDatabases[version] || [];
      const picker = unitComboboxData['a'] || [];
      const units = picker.map(entry => db.find(unit => String(unit.id) === entry.id));
      const CHANNELS = ['ranged', 'thrown', 'fireBreath', 'lightningBreath'];
      const isEmpty = record => CHANNELS.every(key => !record[key]);

      // Every roster record states all four fields, whatever the unit carries.
      const badShape = units.filter(unit => {
        const record = predefinedModernAttacks(unit, version);
        return !record || JSON.stringify(Object.keys(record)) !== JSON.stringify(CHANNELS);
      }).map(unit => unit.name);
      const empty = units.filter(unit => isEmpty(predefinedModernAttacks(unit, version)));

      // The card writes the record into its fields and reads it back; the two must round-trip.
      const pick = id => {
        const hidden = document.getElementById('aUnit');
        hidden.value = String(id);
        hidden.dispatchEvent(new Event('change'));
      };
      const sample = [empty[0], units.find(u => (u.ranged || 0) === 0 && u.ranged_type
        && u.ranged_type !== 'none'), units.find(u => (u.ranged || 0) > 0),
      units.find(u => (u.thrown || 0) > 0)].filter(Boolean);
      const roundTripBad = [];
      for (const unit of sample) {
        pick(unit.id);
        const card = JSON.stringify(modernCardAttacks('a'));
        const roster = JSON.stringify(predefinedModernAttacks(unit, version));
        if (card !== roster) roundTripBad.push({ name: unit.name, card, roster });
      }

      // The end-to-end half, on a record that states no attack: Focus Magic's no-attack arm
      // creates the record's Ranged field at strength 3 with a magical projectile type
      // (`Units.RecalculateUnits.pas:884-910`, arm 2). Both paths must land it.
      const zero = empty[0];
      pick(zero.id);
      const focus = document.getElementById('aAbil_focusMagic');
      focus.checked = true;
      focus.dispatchEvent(new Event('change'));
      const shape = channels => Object.fromEntries(
        Object.entries(channels || {}).map(([key, c]) => [key, `${c.strength}/${c.type}`]));
      return {
        version, picked: units.length, empty: empty.length, badShape, roundTripBad,
        zeroName: zero.name,
        cardChannels: shape(readUnitStats('a').modernAttacks),
        matrixChannels: shape(
          buildMatrixAttackerStats(zero, { focusMagic: true }, 'melee').modernAttacks),
      };
    });

    expect(report.badShape, 'every modern roster record states all four attack fields').toEqual([]);
    // Guards the assertions below against a roster that stopped shipping the case they test.
    expect(report.empty, `${version} ships units whose record states no attack`).toBeGreaterThan(0);
    expect(report.roundTripBad, 'the card round-trips the roster record unchanged').toEqual([]);
    expect(report.cardChannels, `${report.zeroName}: Focus Magic creates Ranged 3 on the card`)
      .toEqual({ ranged: '3/magic' });
    expect(report.matrixChannels, `${report.zeroName}: and the same channel in the matrix`)
      .toEqual(report.cardChannels);

    expectNoConsoleErrors(errors);
  });
}

test('a predefined preset cannot replace roster-owned identity with synthetic fields', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const version = document.getElementById('gameVersion').value;
    const roster = (unitDatabases[version] || []).find(unit => unit.category !== 'Heroes');
    const presetName = '__r81_roster_identity_guard__';
    PRESETS[presetName] = {
      version,
      aUnitName: roster.name,
      a: { race: 'Synthetic Race', name: 'Synthetic Name' },
    };
    try {
      applyPreset(presetName);
      return {
        source: createRosterUnitIdentity(version, roster),
        actual: { ...unitIdentity.a },
      };
    } finally {
      delete PRESETS[presetName];
    }
  });

  expect(report.actual).toMatchObject(report.source);
  expect(report.actual.name).not.toBe('Synthetic Name');
  expectNoConsoleErrors(errors);
});
