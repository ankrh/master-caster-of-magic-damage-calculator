# CoM2 / Warlord binary analysis — damage and healing

Damage accumulation, healing, living-figure accounting, and death routing.

Addresses refer to the pinned `Caster.exe` build. See the [analysis index](./CoM2%20binary%20analysis.md) for binary identity, method, and the subsystem map.

## Damage accumulation, healing and death routing (R5.2f, resolved 2026-08-02)

The durable source-shaped reconstruction is `Combat.DamageHandling.pas`; encoded branch,
call, arithmetic and write evidence plus five contiguous ledgers are in
`Combat.DamageHandling.R5.2f.evidence.md`. They cover `@Combat@AddDamage`,
`@Combat@Combatheal`, `@Units@LivingFigures`, `@Units@TopFigureDamage`, and
`@Combat@Dealdamage`.

The engine maintains three damage categories in both `DamageT` and the persistent base unit:
irrecoverable, undead, and normal. `AddDamage` adds them independently. `Dealdamage` adds the
incoming irrecoverable and undead buckets to their dedicated words and adds all three to
`Totaldamage`; it does not cap those additions to remaining HP. `LivingFigures` then returns
`figures - Totaldamage div HpPerFigure`, with complete signed `idiv` and no clamp, while
`DeadFigures` is exactly `BaseUnits[u].figures - LivingFigures(u)`, also without its own clamp,
and `TopFigureDamage` returns `Totaldamage - DeadFigures * HpPerFigure`
(`$005964C6..$005964EE`, `$00596501..$00596549`, `$0059658F..$005965BB`). The completed
callee body is in
`Combat.CallClosureHelpers.pas`, with byte evidence in
`Combat.CallClosureHelpers.R5.2k.evidence.md`.

`Combatheal` defines healable damage as `Totaldamage - Irrecoverabledamage`. Unless `overheal`
is set, the requested amount is capped to that value. Natural healing, regeneration, or
overheal removes recoverable normal damage first and undead damage second
(`$005B12A0..$005B13D3`). In overheal mode, any remaining amount becomes
`amount div LivingFigures` bonus HP per living figure, with the base `bonushp` word capped at
90. It adds the same per-figure amount to `Totaldamage` for already-dead figures so they stay
dead. `CanHealNaturally` is true exactly when calculated `nohealing` is false and calculated
race is not `RCNoHeal` (21); if either condition fails, that dead-figure adjustment is also
added to irrecoverable damage
(`$005B13DA..$005B15B1`). This completes the callee-side evidence behind F27 and F28:
Bloodsucker's configured healing amount and Life Steal's raw roll magnitude are accepted
independently of target overkill.

Before accumulation, Buried merges all incoming damage into the irrecoverable bucket.
Confusion, Possession, and Creature Binding do the same only when `CCIrrecoverable > 1`
(`$005B4271..$005B4334`). The setting name and shipped default 2 are bound by its loader at
`$00633ED9..$00633EF3`. The TD32-named `overland` argument is not read anywhere in the complete
`Dealdamage` extent.

Once `Totaldamage >= HpPerFigure * figures`, the base record is marked dead. The largest
accumulated category then chooses a category flag: irrecoverable wins ties against both other
categories; otherwise undead wins a tie against normal. A combat-summoned unit subsequently
also sets `irrecoverable` without clearing `undeaded`, so an undead-dominant combat-summoned
death can retain both flags (`$005B4488..$005B4548`). Damage is also added to `CAattdamage` or
`CAdefdamage` when the damaged unit matches the corresponding current combat unit
(`$005B4416..$005B4486`).

Verified: Codex 2026-08-02, single-agent cold derivation followed by a complete raw-byte
self-review and user-directed integration. No Claude derivation was produced. Claude reviewed the
full extent against the binary on 2026-08-03 (R5.C) and found no semantic misreading: the
`Combatheal(overheal, isregen)` parameter binding that F27/F28 rest on is confirmed from TD32
rather than inference, and the control-enchantment merge, the `>=` death threshold, the
category-dominance chain and the calculated-vs-base `figures` split all reproduce. No change was
required.
