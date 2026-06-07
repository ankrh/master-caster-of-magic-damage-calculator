# Tooltip style guide

Standard structure for `tooltip:` strings in `ABILITY_DEFS` / `ENCHANTMENT_DEFS` (`data.js`).

Tooltips render with `\n` as line breaks. No line should be more than 75 characters, preferably fewer. Include only the line types that apply, always in the order below. Omit any line that doesn't.

## Line order

```
Versions: <which games the ability/enchantment exists in>
Does not affect <unit types>; <conditions on the bearer itself>
Opponents with <abilities/immunities> are unaffected.
MoM 1.31 & 1.60: <effect>
MoM 1.31 bug: <deviation>
CoM 1 & 2: <effect>
Warlord: <effect>
Not modeled: <types of effects>
```

1. **`Versions:`** — which game(s) the feature exists in. Omit if it exists in all of them.
2. **`Does not affect …`** — unit-type / realm eligibility for the effect, plus any condition on the **bearer itself** (the unit that has the ability) that stops it from taking effect — appended to the same line, after the unit-type restrictions. Phrase positively when clearer ("Fantastic targets only.", "Applies only to Life fantastic creatures and Caster units."). Reserve this line for unit-type eligibility and bearer conditions; enemy-held immunities/abilities go on the `Opponents with …` line instead.
3. **`Opponents with … are unaffected.`** — abilities or immunities that an **opposing unit** can have that block this ability from affecting it (e.g. `Opponents with Death Immunity, Magic Immunity, or Righteousness are unaffected.`, `Opponents with Negate First Strike are unaffected.`). Use this — never an `Immune:` line — for enemy-held blockers.
4. **`Version effect lines`** — the actual mechanic, split per version *only where versions differ*. If behavior is identical across versions, write a single unlabelled effect line instead of repeating the same number three times. Immunities granted are a part of the effect. Bug descriptions follow directly after the corresponding version effect description.
5. **`Effects not modeled`** - a keyword list of types of effects not modeled, without numbers, without version difference breakdown.

**Completeness across versions.** Once `Versions:` (or the absence of it) establishes which games contain the mechanic, the tooltip must make the mechanic's behavior clear in *every* one of those versions. If versions share behavior, a single unlabelled effect line covers them; if any version differs, it needs its own line. Do not leave a version it applies to unaddressed — e.g. naming the MoM and CoM modifiers of an effect but not the Warlord one would be a gap if Warlord has that effect. If the behavior in some version is unclear or undocumented, ask the user before writing or recommending the tooltip — do not guess or silently omit it.

**Warlord is a separate version token.** It is *not* covered by `CoM 1 & 2`, even though the Warlord mod is built on CoM2. Every tooltip for a mechanic that exists in Warlord must address Warlord explicitly — use `CoM 1 & 2 & Warlord:` when the value is shared (verify against `Warlord helptext.TXT` / `Warlord manual.txt` first), or a separate `Warlord:` line when it differs. If Warlord behavior is unverified, flag it rather than folding it into the CoM2 line.

## Fixed token vocabulary

Use these exact spellings so tooltips stay greppable and consistent:

- Version splits: `MoM 1.31 & 1.60`, `MoM 1.31`, `MoM 1.60`, `CoM 1 & 2`, `CoM 2`, `Warlord`
- Bugs: `MoM 1.31 bug:` (or numbered `MoM 1.31 bug 1:` / `bug 2:` when there are several).
- Bearer eligibility: `Does not affect …` / `… targets only.` / `Applies only to …`
- Enemy-held blockers: `Opponents with … are unaffected.` (trailing period) — covers immunities (Death Immunity, Magic Immunity, Fire Immunity, …) and counter-abilities (Illusion Immunity, True Sight, Negate First Strike).
- Granted immunity (an effect): `Grants <X> Immunity.`

### Attack categories

The engine's attack phases form this hierarchy:

```
melee
thrown
breath          (fire / lightning)
ranged          — the whole ranged phase, which splits into:
  ├─ physical ranged   (missile, boulder)
  └─ magical ranged    (magic_c / magic_n / magic_s)
gaze
```

- **`ranged`** already subsumes magical ranged. When a mechanic affects the
  whole ranged phase, write `ranged attacks` — never `ranged or magical ranged`
  or `ranged, magical ranged, …` (magical ranged is a subset, not a sibling).
- Split into `physical ranged` / `missile` / `boulder` vs `magical ranged` only
  when the behavior actually differs between them.
- Canonical spelling is **`magical ranged`** — not `magic ranged`.

## Don'ts

- No hedges ("informational only", "no effect in this calculator"). If a control exists, assume its mechanics are implemented or imminent.
- Do not carry over wording from an existing tooltip unless it's backed by the actual implementation (engine code) or the authoritative reference docs. Current tooltips may contain unverified or imprecise claims; verify against the source before reusing a phrase, and ask the user when a term's accuracy is unclear.
- No background/flavor information (lore, design history, "successor to X", what a mechanic is "based on"). Tooltips state mechanics only. Add such context only if the user approves it.
- For enchantments: No resistance-roll modifiers that relate to the probability of landing the effect. The calculator models the *outcome* of a successfully landed effect, not the roll to resist it. Attack components that may or may not land in each individual attack should have their roll mechanics explained.

## Special cases

- Some tooltips such as the base unit stats or unit level tooltips may deviate from the above template - ask the user.