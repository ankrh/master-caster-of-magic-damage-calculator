# Warlord v1.5.12.6 — superseded by the v1.5.12.6.2 hotfix

The files that shipped with Warlord **v1.5.12.6**:

- `UNITS.INI` — that version's unit roster.
- `HELP.TXT` — that version's in-game helptext.

The current version's equivalents are in the parent directory. Nothing here is a source for
current behaviour — do not read these when verifying a mechanic.

**What v1.5.12.6.2 changed.** `UNITS.INI`: `Custom13=14` (Sapiens) added to `[170]` Wraiths and
`[171]` Shadow Demons; nothing else. `HELP.TXT`: five entries corrected to match the scripts —
`#Retort Artificer` and `#UA ARTIFICER UPGRADE` (+1 → +2 Resistance), `#UA BOMBS&GRENADES`
(wrong Thrown formula, and Wall Crusher added), `#Spell EXPLOSIVE` (Wall Crusher added),
`#Spell XENOPSYCHOLOGY` and `#Spell RADIO` (scope widened to Sapiens summons). See
`Reference docs/Source discrepancies.md` §1, §2, §3, §5, §6.

**When they can go.** Once no doc cites the pre-hotfix wording, delete this directory; the diffs
are in git history.
