# TODO — open mechanic questions

The questions themselves live here. **Tracking lives in `Calculator/BACKLOG.md`**, §6 and §7,
which give each one an ID (Q1–Q15, X1–X6), a status, and links to any verification-queue entry
that would answer it. Add a question here first, then a row there.

## Resolved

- **Does "ranged" include thrown and breath (MoM 1.31 to-hit)?** No. Thrown and breath use only
  the base `tohit` (innate + experience level + hero abilities); neither `melee_tohit` nor
  `ranged_tohit` reaches them, so item and weapon-quality to-hit bonuses do not apply. Resolved
  from `WIZARDS.EXE` — see `MoM binary analysis.md`. This also resolves a **prose-vs-prose
  conflict**: `MoM source - Fandom site/To Hit.md` is correct; `Thrown Attack.md:56` (Axe to-hit
  improves thrown accuracy) is wrong. To-hit only — an axe's *attack strength* does reach thrown.

## Open Questions

- **Does anything use `unitT.savemodifier`?** `Typedec.pas:181` declares it on the unit record,
  but it has no `UNITS.INI` key in either roster, no stat ID in `MASTER.CAS`, and no reference in
  any `.CAS` file in either script set (searched 2026-07-31). Recorded as apparently unused in
  `Caster binary/CoM2 binary analysis.md`, and excluded from the calculator's CoM2 card field set on that
  basis. What would settle it: a `Caster.exe` read of record `+?` for this field — which the
  direct-displacement scans cannot see if the engine reaches it through the computed-pointer
  layer. Low priority; the cost of being wrong is one missing input, not a wrong number.

- **Troll Shaman/Magician cost and Magician attack discrepancy**: Game data shows Troll Shamans cost 80 (manual: 50), Magicians cost 180 (manual: 120), and Magicians have Melee 4 (manual: 3). The cost increases may reflect the high-HP / Regeneration premium not documented in the manual. The +1 Melee on Magicians is unexplained — verify whether Trolls have an undocumented +1 Melee modifier on top of the +2 already listed, or whether the manual value is simply wrong.

- **Draconian Resistance discrepancy**: Game data (UNITS.INI / HTML) shows Draconian common units have Resistance 1 higher than the manual states (Spearmen 4 vs 3, Swordsmen 5 vs 4, Halberdiers 6 vs 5, Magicians 9 vs 8). This likely means Draconians have an undocumented +1 Resistance racial modifier not listed in the manual.

- Warp reality wiki says to hit can be reduced to 0%, but the to hit wiki page says we can't go below 10%

- Does the chaos spawn poison touch trigger on doom gaze, melee attack or on both?

- Weird defense behavior on page 25

- CoM high prayer description says +3 attack but MoM and CoM2 have +2 attack, and CoM manual says "didn't change it"... Assuming it's +2 in all versions.

- **Supreme Light's `defense += resistance/3` reads a live resistance in CoM 1** (`0x90A46`), i.e. one that Warp Resist has already zeroed and Darkness has already adjusted, but that the Tactician retort has not yet raised. The calculator computes it from a base-ish resistance instead, so a Warp-Resisted or Darkness-affected unit gets the wrong armor bonus. Not applied — it needs a decision on how far to model "reads the value at its own point" for a term that is not itself a scaling effect.

- Manuals say that wraiths have life steal -4 but it seems to be -3

- With blazing eyes, can a unit have doom gaze at the same time as ranged attacks?

does destiny remove the buff from magical/mithril/adamantium weapons?

does animate dead give +ranged attack?

does "ranged" typically include thrown and breath? (answered for MoM 1.31 to-hit — see Resolved
above; still open for other versions and for non-to-hit effects)

land linking



Questions for the experts:
- I found various discrepancies between the numbers in the CoM2 manual and the UNITS.INI file. Would it be of interest for me to compile a list of these?

- Chaos Spawn has both a melee attack and doom gaze attack. Is poison touch attached to only one of those, and if so, which? Or is it attached to both so poison activates twice in each attack sequence?

- ~~When I look at the MoM and CoM1 data using MoMTweaker, it seems like gaze attack type and values are stored in the same field as ranged, thrown and breath. Is this a fundamental property of how the game engine treats gaze...~~ **Answered from the binary** — yes, one slot: strength `.ranged` (+0x01), type `.ranged_type` (+0x02), so gaze can never co-exist with ranged/thrown/breath. See `MoM binary analysis.md`, *Gaze attacks*. The Blazing Eyes / CoM2 half below is still open, since CoM2 is a different engine.

- Related to the above: With blazing eyes, can a unit have doom gaze at the same time as ranged attacks?

- When the CoM2 manual or help text states "+X attack", is it synonymous with "+X melee attack"?

- Similarly for "+X ranged"; which attack types does that include? Missile/boulder/magical/thrown/breath/gaze?

- The wiki page on Warp Reality states that to hit can be reduced to 0%, but the to hit wiki page says to hit can't go below 10%. Which is correct, and is there any version difference as far as the minimum to hit chance?

- Seravy mentions some new defense formulas in this post: https://www.realmsbeyond.net/forums/showthread.php?tid=8106&pid=645212#pid645212 Is this in the current versions of CoM or CoM2?

- Does destiny remove the buff from magical/mithril/adamantium weapons?

- The CoM2 help text states that Land Linking gives +2 breath, but the CoM2 and CoM1 manuals do not mention a modifier to breath.

- Sky drake has negate first strike in UNITS.INI but not in the manual

