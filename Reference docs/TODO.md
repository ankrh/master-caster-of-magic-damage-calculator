# TODO

## Open Questions

- **Troll Shaman/Magician cost and Magician attack discrepancy**: Game data shows Troll Shamans cost 80 (manual: 50), Magicians cost 180 (manual: 120), and Magicians have Melee 4 (manual: 3). The cost increases may reflect the high-HP / Regeneration premium not documented in the manual. The +1 Melee on Magicians is unexplained — verify whether Trolls have an undocumented +1 Melee modifier on top of the +2 already listed, or whether the manual value is simply wrong.

- **Draconian Resistance discrepancy**: Game data (UNITS.INI / HTML) shows Draconian common units have Resistance 1 higher than the manual states (Spearmen 4 vs 3, Swordsmen 5 vs 4, Halberdiers 6 vs 5, Magicians 9 vs 8). This likely means Draconians have an undocumented +1 Resistance racial modifier not listed in the manual.

- **UNITS.INI validity** The data on settlers in the UNITS.INI file has no lucky settlers, but they exist in game in CoM2. Are we sure that the UNITS.INI from the CoM2 folder actually describes CoM2 units?

- Warp reality wiki says to hit can be reduced to 0%, but the to hit wiki page says we can't go below 10%

- Does the chaos spawn poison touch trigger on doom gaze, melee attack or on both?

- Weird defense behavior on page 25

- CoM high prayer description says +3 attack but MoM and CoM2 have +2 attack, and CoM manual says "didn't change it"... Assuming it's +2 in all versions.

- Manuals say that wraiths have life steal -4 but it seems to be -3

- With blazing eyes, can a unit have doom gaze at the same time as ranged attacks?

does destiny remove the buff from magical/mithril/adamantium weapons?

does animate dead give +ranged attack?

does "ranged" typically include thrown and breath?

land linking



Questions for the experts:
- I found various discrepancies between the numbers in the CoM2 manual and the UNITS.INI file. Would it be of interest for me to compile a list of these?

- Chaos Spawn has both a melee attack and doom gaze attack. Is poison touch attached to only one of those, and if so, which? Or is it attached to both so poison activates twice in each attack sequence?

- When I look at the MoM and CoM1 data using MoMTweaker, it seems like gaze attack type and values are stored in the same field as ranged, thrown and breath. Is this a fundamental property of how the game engine treats gaze, specifically, that gaze could never occur alongside ranged, thrown, or breath? If so, it might make sense for me to merge gaze into the ranged/thrown/breath field in my calculator as well.

- Related to the above: With blazing eyes, can a unit have doom gaze at the same time as ranged attacks?

- When the CoM2 manual or help text states "+X attack", is it synonymous with "+X melee attack"?

- Similarly for "+X ranged"; which attack types does that include? Missile/boulder/magical/thrown/breath/gaze?

- The wiki page on Warp Reality states that to hit can be reduced to 0%, but the to hit wiki page says to hit can't go below 10%. Which is correct, and is there any version difference as far as the minimum to hit chance?

- Seravy mentions some new defense formulas in this post: https://www.realmsbeyond.net/forums/showthread.php?tid=8106&pid=645212#pid645212 Is this in the current versions of CoM or CoM2?

- Does destiny remove the buff from magical/mithril/adamantium weapons?

- The CoM2 help text states that Land Linking gives +2 breath, but the CoM2 and CoM1 manuals do not mention a modifier to breath.

- Sky drake has negate first strike in UNITS.INI but not in the manual

