# R5.1b merged verification evidence

This durable companion supports the canonical source body in
`Units.RecalculateUnits.pas` for `@Units@RecalculateUnits`,
`$0059A02C..$005A65B2`. It was promoted from the corrected Codex derivation
after the Claude/Codex review round closed with no surviving disagreements.
Claude's additional mechanic-level explanations are merged into
`CoM2 binary - unit recalculation.md`.

Provenance: Claude 2026-08-01; Codex 2026-08-01, independent from the shared
thirteen-anchor spine already present in the reconstruction placeholder; cross-review and
independent address verification completed 2026-08-02.

## Branch-target and arithmetic evidence

This appendix is part of the source-shaped reconstruction audit. It records every semantic
conditional jump in the assigned extent with its encoded bytes, literal target, the first
instruction at that target and the next semantic instruction reached from it. Compiler
range/overflow guards are excluded under the derivation conventions; signed-division
correction branches excluded here are quoted in the arithmetic table below.

### Conditional-branch targets (401)

- `$0059A058` `0f84ba000000 je 0x59a118` -> `$0059A118`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A144 742c je 0x59a172`
- `$0059A08A` `7f2c jg 0x59a0b8` -> `$0059A0B8`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A0E4 0f8c88000000 jl 0x59a172`
- `$0059A0E4` `0f8c88000000 jl 0x59a172` -> `$0059A172`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A19E 0f85ba010000 jne 0x59a35e`
- `$0059A144` `742c je 0x59a172` -> `$0059A172`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A19E 0f85ba010000 jne 0x59a35e`
- `$0059A19E` `0f85ba010000 jne 0x59a35e` -> `$0059A35E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A38A 0f84a3020000 je 0x59a633`
- `$0059A1D0` `0f8488010000 je 0x59a35e` -> `$0059A35E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A38A 0f84a3020000 je 0x59a633`
- `$0059A227` `7433 je 0x59a25c` -> `$0059A25C`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A2AA 7433 je 0x59a2df`
- `$0059A2AA` `7433 je 0x59a2df` -> `$0059A2DF`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A313 7e49 jle 0x59a35e`
- `$0059A313` `7e49 jle 0x59a35e` -> `$0059A35E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A38A 0f84a3020000 je 0x59a633`
- `$0059A38A` `0f84a3020000 je 0x59a633` -> `$0059A633`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A636 e8bddbffff call 0x5981f8`
- `$0059A667` `0f848a050000 je 0x59abf7` -> `$0059ABF7`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059AC23 7f38 jg 0x59ac5d`
- `$0059A699` `7e33 jle 0x59a6ce` -> `$0059A6CE`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A6FA 7e33 jle 0x59a72f`
- `$0059A6FA` `7e33 jle 0x59a72f` -> `$0059A72F`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A75B 7e33 jle 0x59a790`
- `$0059A75B` `7e33 jle 0x59a790` -> `$0059A790`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A7BC 0f8e87010000 jle 0x59a949`
- `$0059A7BC` `0f8e87010000 jle 0x59a949` -> `$0059A949`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A975 0f85c0000000 jne 0x59aa3b`
- `$0059A7EE` `0f8555010000 jne 0x59a949` -> `$0059A949`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059A975 0f85c0000000 jne 0x59aa3b`
- `$0059A975` `0f85c0000000 jne 0x59aa3b` -> `$0059AA3B`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059AA66 e889b9ffff call 0x5963f4`
- `$0059AA6D` `7534 jne 0x59aaa3` -> `$0059AAA3`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059AAC7 838482bc68420603 add dword ptr [edx + eax*4 + 0x64268bc], 3`
- `$0059AB7C` `7e79 jle 0x59abf7` -> `$0059ABF7`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059AC23 7f38 jg 0x59ac5d`
- `$0059AC23` `7f38 jg 0x59ac5d` -> `$0059AC5D`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059AC89 742c je 0x59acb7`
- `$0059AC2C` `742f je 0x59ac5d` -> `$0059AC5D`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059AC89 742c je 0x59acb7`
- `$0059AC89` `742c je 0x59acb7` -> `$0059ACB7`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059ACBA e80de6ffff call 0x5992cc`
- `$0059ACEB` `0f84762d0000 je 0x59da67` -> `$0059DA67`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059DA93 0f8459020000 je 0x59dcf2`
- `$0059AD40` `0f84142d0000 je 0x59da5a` -> `$0059DA5A`: first `ff45ec inc dword ptr [ebp - 0x14]`; next semantic at `$0059DA61 0f8591d2ffff jne 0x59acf8`
- `$0059AD97` `0f84ac000000 je 0x59ae49` -> `$0059AE49`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059AE50 0f84ac000000 je 0x59af02`
- `$0059AE50` `0f84ac000000 je 0x59af02` -> `$0059AF02`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059AF09 0f84ac000000 je 0x59afbb`
- `$0059AF09` `0f84ac000000 je 0x59afbb` -> `$0059AFBB`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059AFC2 0f84ac000000 je 0x59b074`
- `$0059AFC2` `0f84ac000000 je 0x59b074` -> `$0059B074`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B07B 0f84ac000000 je 0x59b12d`
- `$0059B07B` `0f84ac000000 je 0x59b12d` -> `$0059B12D`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B134 0f84ac000000 je 0x59b1e6`
- `$0059B134` `0f84ac000000 je 0x59b1e6` -> `$0059B1E6`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B1ED 0f84ac000000 je 0x59b29f`
- `$0059B1ED` `0f84ac000000 je 0x59b29f` -> `$0059B29F`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B2A6 0f84ac000000 je 0x59b358`
- `$0059B2A6` `0f84ac000000 je 0x59b358` -> `$0059B358`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B35F 0f84ac000000 je 0x59b411`
- `$0059B35F` `0f84ac000000 je 0x59b411` -> `$0059B411`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B418 0f84ac000000 je 0x59b4ca`
- `$0059B418` `0f84ac000000 je 0x59b4ca` -> `$0059B4CA`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B4D1 0f84ac000000 je 0x59b583`
- `$0059B4D1` `0f84ac000000 je 0x59b583` -> `$0059B583`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B58A 0f84ac000000 je 0x59b63c`
- `$0059B58A` `0f84ac000000 je 0x59b63c` -> `$0059B63C`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B643 0f84ac000000 je 0x59b6f5`
- `$0059B643` `0f84ac000000 je 0x59b6f5` -> `$0059B6F5`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B6FC 0f84ac000000 je 0x59b7ae`
- `$0059B6FC` `0f84ac000000 je 0x59b7ae` -> `$0059B7AE`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B7B5 0f84ac000000 je 0x59b867`
- `$0059B7B5` `0f84ac000000 je 0x59b867` -> `$0059B867`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B86E 0f84a8000000 je 0x59b91c`
- `$0059B86E` `0f84a8000000 je 0x59b91c` -> `$0059B91C`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B923 0f84a8000000 je 0x59b9d1`
- `$0059B8A1` `7e79 jle 0x59b91c` -> `$0059B91C`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B923 0f84a8000000 je 0x59b9d1`
- `$0059B923` `0f84a8000000 je 0x59b9d1` -> `$0059B9D1`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B9D8 0f84a8000000 je 0x59ba86`
- `$0059B956` `7e79 jle 0x59b9d1` -> `$0059B9D1`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059B9D8 0f84a8000000 je 0x59ba86`
- `$0059B9D8` `0f84a8000000 je 0x59ba86` -> `$0059BA86`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059BA8D 0f84a8000000 je 0x59bb3b`
- `$0059BA0B` `7e79 jle 0x59ba86` -> `$0059BA86`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059BA8D 0f84a8000000 je 0x59bb3b`
- `$0059BA8D` `0f84a8000000 je 0x59bb3b` -> `$0059BB3B`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059BB42 0f84ac000000 je 0x59bbf4`
- `$0059BAC0` `7e79 jle 0x59bb3b` -> `$0059BB3B`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059BB42 0f84ac000000 je 0x59bbf4`
- `$0059BB42` `0f84ac000000 je 0x59bbf4` -> `$0059BBF4`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059BBFB 0f84ac000000 je 0x59bcad`
- `$0059BBFB` `0f84ac000000 je 0x59bcad` -> `$0059BCAD`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059BCB4 0f84ac000000 je 0x59bd66`
- `$0059BCB4` `0f84ac000000 je 0x59bd66` -> `$0059BD66`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059BD6D 0f84ad020000 je 0x59c020`
- `$0059BD6D` `0f84ad020000 je 0x59c020` -> `$0059C020`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C027 7458 je 0x59c081`
- `$0059BE4B` `7e33 jle 0x59be80` -> `$0059BE80`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059BEAC 0f8eac000000 jle 0x59bf5e`
- `$0059BEAC` `0f8eac000000 jle 0x59bf5e` -> `$0059BF5E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059BF8A 7e33 jle 0x59bfbf`
- `$0059BF8A` `7e33 jle 0x59bfbf` -> `$0059BFBF`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059BFEB 7e33 jle 0x59c020`
- `$0059BFEB` `7e33 jle 0x59c020` -> `$0059C020`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C027 7458 je 0x59c081`
- `$0059C027` `7458 je 0x59c081` -> `$0059C081`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C088 7458 je 0x59c0e2`
- `$0059C088` `7458 je 0x59c0e2` -> `$0059C0E2`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C0E9 742c je 0x59c117`
- `$0059C0E9` `742c je 0x59c117` -> `$0059C117`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C11E 742c je 0x59c14c`
- `$0059C11E` `742c je 0x59c14c` -> `$0059C14C`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C153 742c je 0x59c181`
- `$0059C153` `742c je 0x59c181` -> `$0059C181`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C188 742c je 0x59c1b6`
- `$0059C188` `742c je 0x59c1b6` -> `$0059C1B6`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C1BD 742c je 0x59c1eb`
- `$0059C1BD` `742c je 0x59c1eb` -> `$0059C1EB`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C1F2 742c je 0x59c220`
- `$0059C1F2` `742c je 0x59c220` -> `$0059C220`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C227 7458 je 0x59c281`
- `$0059C227` `7458 je 0x59c281` -> `$0059C281`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C288 742c je 0x59c2b6`
- `$0059C288` `742c je 0x59c2b6` -> `$0059C2B6`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C2BD 7433 je 0x59c2f2`
- `$0059C2BD` `7433 je 0x59c2f2` -> `$0059C2F2`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C2F9 742c je 0x59c327`
- `$0059C2F9` `742c je 0x59c327` -> `$0059C327`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C32E 742c je 0x59c35c`
- `$0059C32E` `742c je 0x59c35c` -> `$0059C35C`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C363 742c je 0x59c391`
- `$0059C363` `742c je 0x59c391` -> `$0059C391`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C398 742c je 0x59c3c6`
- `$0059C398` `742c je 0x59c3c6` -> `$0059C3C6`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C3CD 742c je 0x59c3fb`
- `$0059C3CD` `742c je 0x59c3fb` -> `$0059C3FB`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C402 7458 je 0x59c45c`
- `$0059C402` `7458 je 0x59c45c` -> `$0059C45C`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C463 742c je 0x59c491`
- `$0059C463` `742c je 0x59c491` -> `$0059C491`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C498 742c je 0x59c4c6`
- `$0059C498` `742c je 0x59c4c6` -> `$0059C4C6`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C4CD 742c je 0x59c4fb`
- `$0059C4CD` `742c je 0x59c4fb` -> `$0059C4FB`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C502 0f84d8000000 je 0x59c5e0`
- `$0059C502` `0f84d8000000 je 0x59c5e0` -> `$0059C5E0`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C5E7 742c je 0x59c615`
- `$0059C5E7` `742c je 0x59c615` -> `$0059C615`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C61C 742c je 0x59c64a`
- `$0059C61C` `742c je 0x59c64a` -> `$0059C64A`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C651 742c je 0x59c67f`
- `$0059C651` `742c je 0x59c67f` -> `$0059C67F`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C686 742c je 0x59c6b4`
- `$0059C686` `742c je 0x59c6b4` -> `$0059C6B4`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C6BB 742c je 0x59c6e9`
- `$0059C6BB` `742c je 0x59c6e9` -> `$0059C6E9`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059C715 0f8592000000 jne 0x59c7ad`
- `$0059C715` `0f8592000000 jne 0x59c7ad` -> `$0059C7AD`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C7B4 742c je 0x59c7e2`
- `$0059C722` `0f8485000000 je 0x59c7ad` -> `$0059C7AD`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C7B4 742c je 0x59c7e2`
- `$0059C7B4` `742c je 0x59c7e2` -> `$0059C7E2`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C7E9 0f8e92000000 jle 0x59c881`
- `$0059C7E9` `0f8e92000000 jle 0x59c881` -> `$0059C881`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C888 0f85ac000000 jne 0x59c93a`
- `$0059C888` `0f85ac000000 jne 0x59c93a` -> `$0059C93A`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C941 0f85ac000000 jne 0x59c9f3`
- `$0059C941` `0f85ac000000 jne 0x59c9f3` -> `$0059C9F3`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059C9FA 752c jne 0x59ca28`
- `$0059C9FA` `752c jne 0x59ca28` -> `$0059CA28`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CA32 720c jb 0x59ca40`
- `$0059CA32` `720c jb 0x59ca40` -> `$0059CA40`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CA47 746f je 0x59cab8`
- `$0059CA3A` `0f83f5090000 jae 0x59d435` -> `$0059D435`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D441 0f8313060000 jae 0x59da5a`
- `$0059CA47` `746f je 0x59cab8` -> `$0059CAB8`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CABF 746f je 0x59cb30`
- `$0059CA83` `7533 jne 0x59cab8` -> `$0059CAB8`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CABF 746f je 0x59cb30`
- `$0059CABF` `746f je 0x59cb30` -> `$0059CB30`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CB37 746f je 0x59cba8`
- `$0059CAFB` `7533 jne 0x59cb30` -> `$0059CB30`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CB37 746f je 0x59cba8`
- `$0059CB37` `746f je 0x59cba8` -> `$0059CBA8`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CBAF 0f8416010000 je 0x59cccb`
- `$0059CB73` `7533 jne 0x59cba8` -> `$0059CBA8`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CBAF 0f8416010000 je 0x59cccb`
- `$0059CBAF` `0f8416010000 je 0x59cccb` -> `$0059CCCB`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CCD2 0f8416010000 je 0x59cdee`
- `$0059CC68` `7561 jne 0x59cccb` -> `$0059CCCB`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CCD2 0f8416010000 je 0x59cdee`
- `$0059CC96` `7e33 jle 0x59cccb` -> `$0059CCCB`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CCD2 0f8416010000 je 0x59cdee`
- `$0059CCD2` `0f8416010000 je 0x59cdee` -> `$0059CDEE`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CDF5 0f8416010000 je 0x59cf11`
- `$0059CD8B` `7561 jne 0x59cdee` -> `$0059CDEE`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CDF5 0f8416010000 je 0x59cf11`
- `$0059CDB9` `7e33 jle 0x59cdee` -> `$0059CDEE`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CDF5 0f8416010000 je 0x59cf11`
- `$0059CDF5` `0f8416010000 je 0x59cf11` -> `$0059CF11`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CF18 0f8416010000 je 0x59d034`
- `$0059CEAE` `7561 jne 0x59cf11` -> `$0059CF11`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CF18 0f8416010000 je 0x59d034`
- `$0059CEDC` `7e33 jle 0x59cf11` -> `$0059CF11`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059CF18 0f8416010000 je 0x59d034`
- `$0059CF18` `0f8416010000 je 0x59d034` -> `$0059D034`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D03B 0f8416010000 je 0x59d157`
- `$0059CFD1` `7561 jne 0x59d034` -> `$0059D034`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D03B 0f8416010000 je 0x59d157`
- `$0059CFFF` `7e33 jle 0x59d034` -> `$0059D034`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D03B 0f8416010000 je 0x59d157`
- `$0059D03B` `0f8416010000 je 0x59d157` -> `$0059D157`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D15E 0f8416010000 je 0x59d27a`
- `$0059D0F4` `7561 jne 0x59d157` -> `$0059D157`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D15E 0f8416010000 je 0x59d27a`
- `$0059D122` `7e33 jle 0x59d157` -> `$0059D157`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D15E 0f8416010000 je 0x59d27a`
- `$0059D15E` `0f8416010000 je 0x59d27a` -> `$0059D27A`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D281 0f84a5000000 je 0x59d32c`
- `$0059D217` `7561 jne 0x59d27a` -> `$0059D27A`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D281 0f84a5000000 je 0x59d32c`
- `$0059D245` `7e33 jle 0x59d27a` -> `$0059D27A`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D281 0f84a5000000 je 0x59d32c`
- `$0059D281` `0f84a5000000 je 0x59d32c` -> `$0059D32C`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059D357 8945d0 mov dword ptr [ebp - 0x30], eax`
- `$0059D361` `7407 je 0x59d36a` -> `$0059D36A`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D371 7406 je 0x59d379`
- `$0059D371` `7406 je 0x59d379` -> `$0059D379`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D380 7407 je 0x59d389`
- `$0059D380` `7407 je 0x59d389` -> `$0059D389`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D390 740f je 0x59d3a1`
- `$0059D390` `740f je 0x59d3a1` -> `$0059D3A1`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D3A8 7411 je 0x59d3bb`
- `$0059D3A8` `7411 je 0x59d3bb` -> `$0059D3BB`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D3C2 7411 je 0x59d3d5`
- `$0059D3C2` `7411 je 0x59d3d5` -> `$0059D3D5`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D3DC 7411 je 0x59d3ef`
- `$0059D3DC` `7411 je 0x59d3ef` -> `$0059D3EF`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D3F6 743d je 0x59d435`
- `$0059D3F6` `743d je 0x59d435` -> `$0059D435`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D441 0f8313060000 jae 0x59da5a`
- `$0059D441` `0f8313060000 jae 0x59da5a` -> `$0059DA5A`: first `ff45ec inc dword ptr [ebp - 0x14]`; next semantic at `$0059DA61 0f8591d2ffff jne 0x59acf8`
- `$0059D44E` `7433 je 0x59d483` -> `$0059D483`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D48A 7433 je 0x59d4bf`
- `$0059D48A` `7433 je 0x59d4bf` -> `$0059D4BF`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D4C6 7433 je 0x59d4fb`
- `$0059D4C6` `7433 je 0x59d4fb` -> `$0059D4FB`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D502 0f84ac000000 je 0x59d5b4`
- `$0059D502` `0f84ac000000 je 0x59d5b4` -> `$0059D5B4`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D5BB 0f84ac000000 je 0x59d66d`
- `$0059D5BB` `0f84ac000000 je 0x59d66d` -> `$0059D66D`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D674 0f84ac000000 je 0x59d726`
- `$0059D674` `0f84ac000000 je 0x59d726` -> `$0059D726`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D72D 0f84ac000000 je 0x59d7df`
- `$0059D72D` `0f84ac000000 je 0x59d7df` -> `$0059D7DF`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D7E6 0f84ac000000 je 0x59d898`
- `$0059D7E6` `0f84ac000000 je 0x59d898` -> `$0059D898`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D89F 0f84ac000000 je 0x59d951`
- `$0059D89F` `0f84ac000000 je 0x59d951` -> `$0059D951`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059D97C 8945cc mov dword ptr [ebp - 0x34], eax`
- `$0059D986` `7407 je 0x59d98f` -> `$0059D98F`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D996 7406 je 0x59d99e`
- `$0059D996` `7406 je 0x59d99e` -> `$0059D99E`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D9A5 7407 je 0x59d9ae`
- `$0059D9A5` `7407 je 0x59d9ae` -> `$0059D9AE`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D9B5 740f je 0x59d9c6`
- `$0059D9B5` `740f je 0x59d9c6` -> `$0059D9C6`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D9CD 7411 je 0x59d9e0`
- `$0059D9CD` `7411 je 0x59d9e0` -> `$0059D9E0`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059D9E7 7411 je 0x59d9fa`
- `$0059D9E7` `7411 je 0x59d9fa` -> `$0059D9FA`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059DA01 7411 je 0x59da14`
- `$0059DA01` `7411 je 0x59da14` -> `$0059DA14`: first `8b45d4 mov eax, dword ptr [ebp - 0x2c]`; next semantic at `$0059DA1B 743d je 0x59da5a`
- `$0059DA1B` `743d je 0x59da5a` -> `$0059DA5A`: first `ff45ec inc dword ptr [ebp - 0x14]`; next semantic at `$0059DA61 0f8591d2ffff jne 0x59acf8`
- `$0059DA61` `0f8591d2ffff jne 0x59acf8` -> `$0059ACF8`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059AD40 0f84142d0000 je 0x59da5a`
- `$0059DA93` `0f8459020000 je 0x59dcf2` -> `$0059DCF2`: first `c745ec01000000 mov dword ptr [ebp - 0x14], 1`; next semantic at `$0059DD24 8945c8 mov dword ptr [ebp - 0x38], eax`
- `$0059DAEA` `7431 je 0x59db1d` -> `$0059DB1D`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059DB49 0f84a3010000 je 0x59dcf2`
- `$0059DB49` `0f84a3010000 je 0x59dcf2` -> `$0059DCF2`: first `c745ec01000000 mov dword ptr [ebp - 0x14], 1`; next semantic at `$0059DD24 8945c8 mov dword ptr [ebp - 0x38], eax`
- `$0059DBD7` `0f85b2000000 jne 0x59dc8f` -> `$0059DC8F`: first `e8c0bf0100 call 0x5b9c54`
- `$0059DC96` `742e je 0x59dcc6` -> `$0059DCC6`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059DCEA c684825469420601 mov byte ptr [edx + eax*4 + 0x6426954], 1`
- `$0059DD41` `7558 jne 0x59dd9b` -> `$0059DD9B`: first `b001 mov al, 1`; next semantic at `$0059DDAF 88841108050000 mov byte ptr [ecx + edx + 0x508], al`
- `$0059DD5D` `753c jne 0x59dd9b` -> `$0059DD9B`: first `b001 mov al, 1`; next semantic at `$0059DDAF 88841108050000 mov byte ptr [ecx + edx + 0x508], al`
- `$0059DD79` `7520 jne 0x59dd9b` -> `$0059DD9B`: first `b001 mov al, 1`; next semantic at `$0059DDAF 88841108050000 mov byte ptr [ecx + edx + 0x508], al`
- `$0059DD95` `7504 jne 0x59dd9b` -> `$0059DD9B`: first `b001 mov al, 1`; next semantic at `$0059DDAF 88841108050000 mov byte ptr [ecx + edx + 0x508], al`
- `$0059DDBD` `0f8536ffffff jne 0x59dcf9` -> `$0059DCF9`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059DD24 8945c8 mov dword ptr [ebp - 0x38], eax`
- `$0059DDEF` `0f84cd000000 je 0x59dec2` -> `$0059DEC2`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059DEEE 7466 je 0x59df56`
- `$0059DEEE` `7466 je 0x59df56` -> `$0059DF56`: first `8b0dd8867000 mov ecx, dword ptr [0x7086d8]`; next semantic at `$0059DF6D e80eb00300 call 0x5d8f80`
- `$0059DF7C` `0f842b050000 je 0x59e4ad` -> `$0059E4AD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E4B0 e8d3a8ffff call 0x598d88`
- `$0059DFB6` `0f85f1040000 jne 0x59e4ad` -> `$0059E4AD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E4B0 e8d3a8ffff call 0x598d88`
- `$0059DFC4` `7e32 jle 0x59dff8` -> `$0059DFF8`: first `837dec00 cmp dword ptr [ebp - 0x14], 0`; next semantic at `$0059DFFC 0f8eab040000 jle 0x59e4ad`
- `$0059DFF6` `7f6f jg 0x59e067` -> `$0059E067`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E092 8945c4 mov dword ptr [ebp - 0x3c], eax`
- `$0059DFFC` `0f8eab040000 jle 0x59e4ad` -> `$0059E4AD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E4B0 e8d3a8ffff call 0x598d88`
- `$0059E02B` `0f847c040000 je 0x59e4ad` -> `$0059E4AD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E4B0 e8d3a8ffff call 0x598d88`
- `$0059E061` `0f8546040000 jne 0x59e4ad` -> `$0059E4AD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E4B0 e8d3a8ffff call 0x598d88`
- `$0059E18F` `0f8eac000000 jle 0x59e241` -> `$0059E241`: first `8b45c4 mov eax, dword ptr [ebp - 0x3c]`; next semantic at `$0059E248 7e42 jle 0x59e28c`
- `$0059E248` `7e42 jle 0x59e28c` -> `$0059E28C`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E2B0 c68482a16d420601 mov byte ptr [edx + eax*4 + 0x6426da1], 1`
- `$0059E2E4` `0f85c3010000 jne 0x59e4ad` -> `$0059E4AD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E4B0 e8d3a8ffff call 0x598d88`
- `$0059E316` `0f8591010000 jne 0x59e4ad` -> `$0059E4AD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E4B0 e8d3a8ffff call 0x598d88`
- `$0059E348` `0f855f010000 jne 0x59e4ad` -> `$0059E4AD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E4B0 e8d3a8ffff call 0x598d88`
- `$0059E37A` `0f852d010000 jne 0x59e4ad` -> `$0059E4AD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E4B0 e8d3a8ffff call 0x598d88`
- `$0059E3AC` `0f85fb000000 jne 0x59e4ad` -> `$0059E4AD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E4B0 e8d3a8ffff call 0x598d88`
- `$0059E3DE` `7e33 jle 0x59e413` -> `$0059E413`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E43E e8b17fffff call 0x5963f4`
- `$0059E445` `7533 jne 0x59e47a` -> `$0059E47A`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E49E 838482ec6842060a add dword ptr [edx + eax*4 + 0x64268ec], 0xa`
- `$0059E4E1` `7476 je 0x59e559` -> `$0059E559`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E585 7476 je 0x59e5fd`
- `$0059E585` `7476 je 0x59e5fd` -> `$0059E5FD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E629 7476 je 0x59e6a1`
- `$0059E629` `7476 je 0x59e6a1` -> `$0059E6A1`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E6CD 742c je 0x59e6fb`
- `$0059E6CD` `742c je 0x59e6fb` -> `$0059E6FB`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E727 0f8489000000 je 0x59e7b6`
- `$0059E727` `0f8489000000 je 0x59e7b6` -> `$0059E7B6`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E7E2 742c je 0x59e810`
- `$0059E785` `7d2f jge 0x59e7b6` -> `$0059E7B6`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E7E2 742c je 0x59e810`
- `$0059E7E2` `742c je 0x59e810` -> `$0059E810`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E83C 742c je 0x59e86a`
- `$0059E83C` `742c je 0x59e86a` -> `$0059E86A`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E896 742c je 0x59e8c4`
- `$0059E896` `742c je 0x59e8c4` -> `$0059E8C4`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E8F0 0f8443010000 je 0x59ea39`
- `$0059E8F0` `0f8443010000 je 0x59ea39` -> `$0059EA39`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059EA65 742c je 0x59ea93`
- `$0059E94E` `7d2f jge 0x59e97f` -> `$0059E97F`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059E9AC 7d2e jge 0x59e9dc`
- `$0059E9AC` `7d2e jge 0x59e9dc` -> `$0059E9DC`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059EA08 7d2f jge 0x59ea39`
- `$0059EA08` `7d2f jge 0x59ea39` -> `$0059EA39`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059EA65 742c je 0x59ea93`
- `$0059EA65` `742c je 0x59ea93` -> `$0059EA93`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059EABF 0f8488000000 je 0x59eb4d`
- `$0059EABF` `0f8488000000 je 0x59eb4d` -> `$0059EB4D`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059EB79 0f8484000000 je 0x59ec03`
- `$0059EACC` `747f je 0x59eb4d` -> `$0059EB4D`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059EB79 0f8484000000 je 0x59ec03`
- `$0059EB1F` `742c je 0x59eb4d` -> `$0059EB4D`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059EB79 0f8484000000 je 0x59ec03`
- `$0059EB79` `0f8484000000 je 0x59ec03` -> `$0059EC03`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059EC2F 0f8441020000 je 0x59ee76`
- `$0059EC2F` `0f8441020000 je 0x59ee76` -> `$0059EE76`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059EEA2 0f84f0020000 je 0x59f198`
- `$0059ED0D` `7e33 jle 0x59ed42` -> `$0059ED42`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059ED81 e822e20500 call 0x5fcfa8`
- `$0059EEA2` `0f84f0020000 je 0x59f198` -> `$0059F198`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F1C4 0f84de000000 je 0x59f2a8`
- `$0059EF3B` `7c67 jl 0x59efa4` -> `$0059EFA4`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059EFD0 0f8cc2010000 jl 0x59f198`
- `$0059EFD0` `0f8cc2010000 jl 0x59f198` -> `$0059F198`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F1C4 0f84de000000 je 0x59f2a8`
- `$0059F002` `0f8eac000000 jle 0x59f0b4` -> `$0059F0B4`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F0DF e81073ffff call 0x5963f4`
- `$0059F0E6` `0f85ac000000 jne 0x59f198` -> `$0059F198`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F1C4 0f84de000000 je 0x59f2a8`
- `$0059F1C4` `0f84de000000 je 0x59f2a8` -> `$0059F2A8`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F2D4 745a je 0x59f330`
- `$0059F1F6` `0f8cac000000 jl 0x59f2a8` -> `$0059F2A8`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F2D4 745a je 0x59f330`
- `$0059F2D4` `745a je 0x59f330` -> `$0059F330`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F35C 0f8441010000 je 0x59f4a3`
- `$0059F302` `7c2c jl 0x59f330` -> `$0059F330`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F35C 0f8441010000 je 0x59f4a3`
- `$0059F35C` `0f8441010000 je 0x59f4a3` -> `$0059F4A3`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F4CF 0f8407010000 je 0x59f5dc`
- `$0059F415` `7d2f jge 0x59f446` -> `$0059F446`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F473 7d2e jge 0x59f4a3`
- `$0059F473` `7d2e jge 0x59f4a3` -> `$0059F4A3`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F4CF 0f8407010000 je 0x59f5dc`
- `$0059F4CF` `0f8407010000 je 0x59f5dc` -> `$0059F5DC`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F608 0f8439010000 je 0x59f747`
- `$0059F608` `0f8439010000 je 0x59f747` -> `$0059F747`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F77B 755b jne 0x59f7d8`
- `$0059F77B` `755b jne 0x59f7d8` -> `$0059F7D8`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F804 0f84c6030000 je 0x59fbd0`
- `$0059F804` `0f84c6030000 je 0x59fbd0` -> `$0059FBD0`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059FBFC 0f8491010000 je 0x59fd93`
- `$0059F8E9` `7e67 jle 0x59f952` -> `$0059F952`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F97E 7e33 jle 0x59f9b3`
- `$0059F97E` `7e33 jle 0x59f9b3` -> `$0059F9B3`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059F9DF 7e33 jle 0x59fa14`
- `$0059F9DF` `7e33 jle 0x59fa14` -> `$0059FA14`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059FA40 7e33 jle 0x59fa75`
- `$0059FA40` `7e33 jle 0x59fa75` -> `$0059FA75`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059FAA1 7e67 jle 0x59fb0a`
- `$0059FAA1` `7e67 jle 0x59fb0a` -> `$0059FB0A`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059FB2E 838482fc68420601 add dword ptr [edx + eax*4 + 0x64268fc], 1`
- `$0059FBFC` `0f8491010000 je 0x59fd93` -> `$0059FD93`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059FDBF 742c je 0x59fded`
- `$0059FDBF` `742c je 0x59fded` -> `$0059FDED`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059FE19 742c je 0x59fe47`
- `$0059FE19` `742c je 0x59fe47` -> `$0059FE47`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059FE73 0f846e020000 je 0x5a00e7`
- `$0059FE73` `0f846e020000 je 0x5a00e7` -> `$005A00E7`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0113 7458 je 0x5a016d`
- `$0059FEA5` `0f8eb8000000 jle 0x59ff63` -> `$0059FF63`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059FF8F 7e3a jle 0x59ffcb`
- `$0059FF8F` `7e3a jle 0x59ffcb` -> `$0059FFCB`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$0059FFF6 e84564ffff call 0x596440`
- `$0059FFFD` `0f84b8000000 je 0x5a00bb` -> `$005A00BB`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A00DF c68482a16d420601 mov byte ptr [edx + eax*4 + 0x6426da1], 1`
- `$005A0113` `7458 je 0x5a016d` -> `$005A016D`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0199 0f8481020000 je 0x5a0420`
- `$005A0199` `0f8481020000 je 0x5a0420` -> `$005A0420`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A044C 745b je 0x5a04a9`
- `$005A044C` `745b je 0x5a04a9` -> `$005A04A9`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A04D5 0f8442040000 je 0x5a091d`
- `$005A04D5` `0f8442040000 je 0x5a091d` -> `$005A091D`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0949 0f84ac000000 je 0x5a09fb`
- `$005A0507` `0f8eac000000 jle 0x5a05b9` -> `$005A05B9`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A05E4 e80b5effff call 0x5963f4`
- `$005A05EB` `0f85ac000000 jne 0x5a069d` -> `$005A069D`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A06C1 8384820069420603 add dword ptr [edx + eax*4 + 0x6426900], 3`
- `$005A0949` `0f84ac000000 je 0x5a09fb` -> `$005A09FB`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0A27 0f84d6020000 je 0x5a0d03`
- `$005A0A27` `0f84d6020000 je 0x5a0d03` -> `$005A0D03`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0D2F 0f8416010000 je 0x5a0e4b`
- `$005A0AB1` `0f844c020000 je 0x5a0d03` -> `$005A0D03`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0D2F 0f8416010000 je 0x5a0e4b`
- `$005A0B8F` `0f8eac000000 jle 0x5a0c41` -> `$005A0C41`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0C6D 7e33 jle 0x5a0ca2`
- `$005A0C6D` `7e33 jle 0x5a0ca2` -> `$005A0CA2`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0CCE 7e33 jle 0x5a0d03`
- `$005A0CCE` `7e33 jle 0x5a0d03` -> `$005A0D03`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0D2F 0f8416010000 je 0x5a0e4b`
- `$005A0D2F` `0f8416010000 je 0x5a0e4b` -> `$005A0E4B`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0E77 0f8490010000 je 0x5a100d`
- `$005A0D61` `7e3c jle 0x5a0d9f` -> `$005A0D9F`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0DC3 838482fc68420602 add dword ptr [edx + eax*4 + 0x64268fc], 2`
- `$005A0E77` `0f8490010000 je 0x5a100d` -> `$005A100D`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1039 0f84ad000000 je 0x5a10ec`
- `$005A0EAF` `0f84ac000000 je 0x5a0f61` -> `$005A0F61`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A0F85 8384820069420601 add dword ptr [edx + eax*4 + 0x6426900], 1`
- `$005A1039` `0f84ad000000 je 0x5a10ec` -> `$005A10EC`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1118 0f84f9000000 je 0x5a1217`
- `$005A1090` `745a je 0x5a10ec` -> `$005A10EC`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1118 0f84f9000000 je 0x5a1217`
- `$005A10BE` `752c jne 0x5a10ec` -> `$005A10EC`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1118 0f84f9000000 je 0x5a1217`
- `$005A1118` `0f84f9000000 je 0x5a1217` -> `$005A1217`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1243 742c je 0x5a1271`
- `$005A11B6` `7533 jne 0x5a11eb` -> `$005A11EB`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A120F c68482a16d420601 mov byte ptr [edx + eax*4 + 0x6426da1], 1`
- `$005A1243` `742c je 0x5a1271` -> `$005A1271`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1274 e86b3dffff call 0x594fe4`
- `$005A127B` `0f84e3030000 je 0x5a1664` -> `$005A1664`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1690 0f8414020000 je 0x5a18aa`
- `$005A1291` `7c48 jl 0x5a12db` -> `$005A12DB`: first `837de800 cmp dword ptr [ebp - 0x18], 0`; next semantic at `$005A12DF 0f8e7f030000 jle 0x5a1664`
- `$005A12C6` `740b je 0x5a12d3` -> `$005A12D3`: first `ff45ec inc dword ptr [ebp - 0x14]`; next semantic at `$005A12D6 ff4dc0 dec dword ptr [ebp - 0x40]`
- `$005A12D9` `75c3 jne 0x5a129e` -> `$005A129E`: first `8b45ec mov eax, dword ptr [ebp - 0x14]`; next semantic at `$005A12C6 740b je 0x5a12d3`
- `$005A12DF` `0f8e7f030000 jle 0x5a1664` -> `$005A1664`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1690 0f8414020000 je 0x5a18aa`
- `$005A131C` `0f8eae000000 jle 0x5a13d0` -> `$005A13D0`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A13FC 7e35 jle 0x5a1433`
- `$005A13FC` `7e35 jle 0x5a1433` -> `$005A1433`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A145F 7e35 jle 0x5a1496`
- `$005A145F` `7e35 jle 0x5a1496` -> `$005A1496`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A14C2 0f8eee000000 jle 0x5a15b6`
- `$005A14C2` `0f8eee000000 jle 0x5a15b6` -> `$005A15B6`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A15DD 018c8200694206 add dword ptr [edx + eax*4 + 0x6426900], ecx`
- `$005A1690` `0f8414020000 je 0x5a18aa` -> `$005A18AA`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A18D6 747f je 0x5a1957`
- `$005A16C2` `0f84e2010000 je 0x5a18aa` -> `$005A18AA`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A18D6 747f je 0x5a1957`
- `$005A1719` `0f848b010000 je 0x5a18aa` -> `$005A18AA`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A18D6 747f je 0x5a1957`
- `$005A18D6` `747f je 0x5a1957` -> `$005A1957`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1983 0f848d040000 je 0x5a1e16`
- `$005A1929` `742c je 0x5a1957` -> `$005A1957`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1983 0f848d040000 je 0x5a1e16`
- `$005A1983` `0f848d040000 je 0x5a1e16` -> `$005A1E16`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1E19 e8c631ffff call 0x594fe4`
- `$005A19B5` `7532 jne 0x5a19e9` -> `$005A19E9`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1A3A 0f84d6030000 je 0x5a1e16`
- `$005A19E3` `0f842d040000 je 0x5a1e16` -> `$005A1E16`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1E19 e8c631ffff call 0x594fe4`
- `$005A1A3A` `0f84d6030000 je 0x5a1e16` -> `$005A1E16`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1E19 e8c631ffff call 0x594fe4`
- `$005A1BC4` `0f8eac000000 jle 0x5a1c76` -> `$005A1C76`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1CA2 0f8eac000000 jle 0x5a1d54`
- `$005A1CA2` `0f8eac000000 jle 0x5a1d54` -> `$005A1D54`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1D80 7e33 jle 0x5a1db5`
- `$005A1D80` `7e33 jle 0x5a1db5` -> `$005A1DB5`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1DE1 7e33 jle 0x5a1e16`
- `$005A1DE1` `7e33 jle 0x5a1e16` -> `$005A1E16`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1E19 e8c631ffff call 0x594fe4`
- `$005A1E20` `0f84ec000000 je 0x5a1f12` -> `$005A1F12`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1F3E 0f84e7010000 je 0x5a212b`
- `$005A1E31` `0f8cdb000000 jl 0x5a1f12` -> `$005A1F12`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1F3E 0f84e7010000 je 0x5a212b`
- `$005A1E6A` `0f8496000000 je 0x5a1f06` -> `$005A1F06`: first `ff45ec inc dword ptr [ebp - 0x14]`; next semantic at `$005A1F09 ff4dc0 dec dword ptr [ebp - 0x40]`
- `$005A1E9C` `7535 jne 0x5a1ed3` -> `$005A1ED3`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A1EF7 838482d868420601 add dword ptr [edx + eax*4 + 0x64268d8], 1`
- `$005A1F0C` `0f8530ffffff jne 0x5a1e42` -> `$005A1E42`: first `8b45ec mov eax, dword ptr [ebp - 0x14]`; next semantic at `$005A1E6A 0f8496000000 je 0x5a1f06`
- `$005A1F3E` `0f84e7010000 je 0x5a212b` -> `$005A212B`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2157 0f842f010000 je 0x5a228c`
- `$005A1F95` `0f8490010000 je 0x5a212b` -> `$005A212B`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2157 0f842f010000 je 0x5a228c`
- `$005A2079` `0f84ac000000 je 0x5a212b` -> `$005A212B`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2157 0f842f010000 je 0x5a228c`
- `$005A2157` `0f842f010000 je 0x5a228c` -> `$005A228C`: first `a188917000 mov eax, dword ptr [0x709188]`; next semantic at `$005A2297 0f8ced000000 jl 0x5a238a`
- `$005A21AE` `0f84d8000000 je 0x5a228c` -> `$005A228C`: first `a188917000 mov eax, dword ptr [0x709188]`; next semantic at `$005A2297 0f8ced000000 jl 0x5a238a`
- `$005A2297` `0f8ced000000 jl 0x5a238a` -> `$005A238A`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A23B6 0f844a010000 je 0x5a2506`
- `$005A22D0` `0f84a8000000 je 0x5a237e` -> `$005A237E`: first `ff45ec inc dword ptr [ebp - 0x14]`; next semantic at `$005A2381 ff4dc0 dec dword ptr [ebp - 0x40]`
- `$005A22E0` `0f8598000000 jne 0x5a237e` -> `$005A237E`: first `ff45ec inc dword ptr [ebp - 0x14]`; next semantic at `$005A2381 ff4dc0 dec dword ptr [ebp - 0x40]`
- `$005A2315` `7467 je 0x5a237e` -> `$005A237E`: first `ff45ec inc dword ptr [ebp - 0x14]`; next semantic at `$005A2381 ff4dc0 dec dword ptr [ebp - 0x40]`
- `$005A2384` `0f851effffff jne 0x5a22a8` -> `$005A22A8`: first `8b45ec mov eax, dword ptr [ebp - 0x14]`; next semantic at `$005A22D0 0f84a8000000 je 0x5a237e`
- `$005A23B6` `0f844a010000 je 0x5a2506` -> `$005A2506`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2532 742d je 0x5a2561`
- `$005A240D` `0f84f3000000 je 0x5a2506` -> `$005A2506`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2532 742d je 0x5a2561`
- `$005A2440` `7903 jns 0x5a2445` -> `$005A2445`: first `c1f802 sar eax, 2`; next semantic at `$005A244F 7d07 jge 0x5a2458`
- `$005A244F` `7d07 jge 0x5a2458` -> `$005A2458`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A24C9 668984913e6f4206 mov word ptr [ecx + edx*4 + 0x6426f3e], ax`
- `$005A2532` `742d je 0x5a2561` -> `$005A2561`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A258D 7461 je 0x5a25f0`
- `$005A258D` `7461 je 0x5a25f0` -> `$005A25F0`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2671 e8566e0300 call 0x5d94cc`
- `$005A26AB` `740b je 0x5a26b8` -> `$005A26B8`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A26E4 7556 jne 0x5a273c`
- `$005A26AE` `7440 je 0x5a26f0` -> `$005A26F0`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A271C 751e jne 0x5a273c`
- `$005A26B1` `7475 je 0x5a2728` -> `$005A2728`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A272B e8b428ffff call 0x594fe4`
- `$005A26E4` `7556 jne 0x5a273c` -> `$005A273C`: first `a188917000 mov eax, dword ptr [0x709188]`; next semantic at `$005A2748 0f8410010000 je 0x5a285e`
- `$005A271C` `751e jne 0x5a273c` -> `$005A273C`: first `a188917000 mov eax, dword ptr [0x709188]`; next semantic at `$005A2748 0f8410010000 je 0x5a285e`
- `$005A2732` `7408 je 0x5a273c` -> `$005A273C`: first `a188917000 mov eax, dword ptr [0x709188]`; next semantic at `$005A2748 0f8410010000 je 0x5a285e`
- `$005A2748` `0f8410010000 je 0x5a285e` -> `$005A285E`: first `a188917000 mov eax, dword ptr [0x709188]`; next semantic at `$005A286A 0f8446030000 je 0x5a2bb6`
- `$005A277A` `0f84de000000 je 0x5a285e` -> `$005A285E`: first `a188917000 mov eax, dword ptr [0x709188]`; next semantic at `$005A286A 0f8446030000 je 0x5a2bb6`
- `$005A27AC` `0f85ac000000 jne 0x5a285e` -> `$005A285E`: first `a188917000 mov eax, dword ptr [0x709188]`; next semantic at `$005A286A 0f8446030000 je 0x5a2bb6`
- `$005A286A` `0f8446030000 je 0x5a2bb6` -> `$005A2BB6`: first `a188917000 mov eax, dword ptr [0x709188]`; next semantic at `$005A2BC2 0f8446030000 je 0x5a2f0e`
- `$005A289C` `0f8514030000 jne 0x5a2bb6` -> `$005A2BB6`: first `a188917000 mov eax, dword ptr [0x709188]`; next semantic at `$005A2BC2 0f8446030000 je 0x5a2f0e`
- `$005A297A` `0f8eac000000 jle 0x5a2a2c` -> `$005A2A2C`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2A58 0f8eac000000 jle 0x5a2b0a`
- `$005A2A58` `0f8eac000000 jle 0x5a2b0a` -> `$005A2B0A`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2B7B 66898491906d4206 mov word ptr [ecx + edx*4 + 0x6426d90], ax`
- `$005A2BC2` `0f8446030000 je 0x5a2f0e` -> `$005A2F0E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2F3A 0f8472360000 je 0x5a65b2`
- `$005A2BF4` `0f8414030000 je 0x5a2f0e` -> `$005A2F0E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2F3A 0f8472360000 je 0x5a65b2`
- `$005A2D7E` `0f8eac000000 jle 0x5a2e30` -> `$005A2E30`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2E5C 0f8eac000000 jle 0x5a2f0e`
- `$005A2E5C` `0f8eac000000 jle 0x5a2f0e` -> `$005A2F0E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A2F3A 0f8472360000 je 0x5a65b2`
- `$005A2F3A` `0f8472360000 je 0x5a65b2` -> `$005A65B2`: assigned-extent boundary; late UnitCalc hook follows
- `$005A2F74` `7509 jne 0x5a2f7f` -> `$005A2F7F`: first `c745e002000000 mov dword ptr [ebp - 0x20], 2`
- `$005A2F8D` `7466 je 0x5a2ff5` -> `$005A2FF5`: first `8b45e0 mov eax, dword ptr [ebp - 0x20]`; next semantic at `$005A301C 0f8ea1020000 jle 0x5a32c3`
- `$005A2F9B` `7458 je 0x5a2ff5` -> `$005A2FF5`: first `8b45e0 mov eax, dword ptr [ebp - 0x20]`; next semantic at `$005A301C 0f8ea1020000 jle 0x5a32c3`
- `$005A301C` `0f8ea1020000 jle 0x5a32c3` -> `$005A32C3`: first `8b45e0 mov eax, dword ptr [ebp - 0x20]`; next semantic at `$005A32EA 0f8e12010000 jle 0x5a3402`
- `$005A320C` `0f8ef0010000 jle 0x5a3402` -> `$005A3402`: first `8b45e0 mov eax, dword ptr [ebp - 0x20]`; next semantic at `$005A3429 0f8e3e030000 jle 0x5a376d`
- `$005A32EA` `0f8e12010000 jle 0x5a3402` -> `$005A3402`: first `8b45e0 mov eax, dword ptr [ebp - 0x20]`; next semantic at `$005A3429 0f8e3e030000 jle 0x5a376d`
- `$005A3429` `0f8e3e030000 jle 0x5a376d` -> `$005A376D`: first `8b45e0 mov eax, dword ptr [ebp - 0x20]`; next semantic at `$005A3794 0f8e44060000 jle 0x5a3dde`
- `$005A345B` `0f8eb8000000 jle 0x5a3519` -> `$005A3519`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3545 7e3a jle 0x5a3581`
- `$005A3545` `7e3a jle 0x5a3581` -> `$005A3581`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A35AD 7e3a jle 0x5a35e9`
- `$005A35AD` `7e3a jle 0x5a35e9` -> `$005A35E9`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3615 7e3a jle 0x5a3651`
- `$005A3615` `7e3a jle 0x5a3651` -> `$005A3651`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A367C e8bf2dffff call 0x596440`
- `$005A3683` `0f84b8000000 je 0x5a3741` -> `$005A3741`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3765 c68482a16d420601 mov byte ptr [edx + eax*4 + 0x6426da1], 1`
- `$005A3794` `0f8e44060000 jle 0x5a3dde` -> `$005A3DDE`: first `8b45e0 mov eax, dword ptr [ebp - 0x20]`; next semantic at `$005A3E05 7e2c jle 0x5a3e33`
- `$005A37C6` `7e3c jle 0x5a3804` -> `$005A3804`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3830 0f8500020000 jne 0x5a3a36`
- `$005A37F4` `7e0e jle 0x5a3804` -> `$005A3804`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3830 0f8500020000 jne 0x5a3a36`
- `$005A37FE` `0f8e32020000 jle 0x5a3a36` -> `$005A3A36`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3A62 0f84a2010000 je 0x5a3c0a`
- `$005A3830` `0f8500020000 jne 0x5a3a36` -> `$005A3A36`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3A62 0f84a2010000 je 0x5a3c0a`
- `$005A3862` `0f85ce010000 jne 0x5a3a36` -> `$005A3A36`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3A62 0f84a2010000 je 0x5a3c0a`
- `$005A3894` `0f8eb8000000 jle 0x5a3952` -> `$005A3952`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A397E 018c82fc684206 add dword ptr [edx + eax*4 + 0x64268fc], ecx`
- `$005A3A62` `0f84a2010000 je 0x5a3c0a` -> `$005A3C0A`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3C36 0f84a2010000 je 0x5a3dde`
- `$005A3A94` `0f8eb8000000 jle 0x5a3b52` -> `$005A3B52`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3B7E 018c82fc684206 add dword ptr [edx + eax*4 + 0x64268fc], ecx`
- `$005A3C36` `0f84a2010000 je 0x5a3dde` -> `$005A3DDE`: first `8b45e0 mov eax, dword ptr [ebp - 0x20]`; next semantic at `$005A3E05 7e2c jle 0x5a3e33`
- `$005A3C68` `0f8eb8000000 jle 0x5a3d26` -> `$005A3D26`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3D52 018c82fc684206 add dword ptr [edx + eax*4 + 0x64268fc], ecx`
- `$005A3E05` `7e2c jle 0x5a3e33` -> `$005A3E33`: first `8b45e0 mov eax, dword ptr [ebp - 0x20]`; next semantic at `$005A3E5A 7f35 jg 0x5a3e91`
- `$005A3E5A` `7f35 jg 0x5a3e91` -> `$005A3E91`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A3E94 e84b11ffff call 0x594fe4`
- `$005A3E8F` `7e3f jle 0x5a3ed0` -> `$005A3ED0`: first `b803000000 mov eax, 3`; next semantic at `$005A3F03 0f8e7a020000 jle 0x5a4183`
- `$005A3E9B` `7533 jne 0x5a3ed0` -> `$005A3ED0`: first `b803000000 mov eax, 3`; next semantic at `$005A3F03 0f8e7a020000 jle 0x5a4183`
- `$005A3F03` `0f8e7a020000 jle 0x5a4183` -> `$005A4183`: first `c745e801000000 mov dword ptr [ebp - 0x18], 1`; next semantic at `$005A4195 7c44 jl 0x5a41db`
- `$005A4195` `7c44 jl 0x5a41db` -> `$005A41DB`: first `8b45e0 mov eax, dword ptr [ebp - 0x20]`; next semantic at `$005A4202 7f3f jg 0x5a4243`
- `$005A41CA` `7407 je 0x5a41d3` -> `$005A41D3`: first `ff45e4 inc dword ptr [ebp - 0x1c]`
- `$005A41D9` `75c7 jne 0x5a41a2` -> `$005A41A2`: first `8b45e4 mov eax, dword ptr [ebp - 0x1c]`; next semantic at `$005A41CA 7407 je 0x5a41d3`
- `$005A4202` `7f3f jg 0x5a4243` -> `$005A4243`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A426F 0f8577030000 jne 0x5a45ec`
- `$005A4237` `7f0a jg 0x5a4243` -> `$005A4243`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A426F 0f8577030000 jne 0x5a45ec`
- `$005A423D` `0f85f5060000 jne 0x5a4938` -> `$005A4938`: first `a12ca27000 mov eax, dword ptr [0x70a22c]`; next semantic at `$005A4940 0f8489010000 je 0x5a4acf`
- `$005A426F` `0f8577030000 jne 0x5a45ec` -> `$005A45EC`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A45EF e8580affff call 0x59504c`
- `$005A42A1` `7e67 jle 0x5a430a` -> `$005A430A`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4336 7e67 jle 0x5a439f`
- `$005A4336` `7e67 jle 0x5a439f` -> `$005A439F`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A43CB 7e33 jle 0x5a4400`
- `$005A43CB` `7e33 jle 0x5a4400` -> `$005A4400`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A442C 7e33 jle 0x5a4461`
- `$005A442C` `7e33 jle 0x5a4461` -> `$005A4461`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A448D 7e33 jle 0x5a44c2`
- `$005A448D` `7e33 jle 0x5a44c2` -> `$005A44C2`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A44EE 7e67 jle 0x5a4557`
- `$005A44EE` `7e67 jle 0x5a4557` -> `$005A4557`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4583 7e67 jle 0x5a45ec`
- `$005A4583` `7e67 jle 0x5a45ec` -> `$005A45EC`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A45EF e8580affff call 0x59504c`
- `$005A45F6` `0f843c030000 je 0x5a4938` -> `$005A4938`: first `a12ca27000 mov eax, dword ptr [0x70a22c]`; next semantic at `$005A4940 0f8489010000 je 0x5a4acf`
- `$005A4601` `0f8eca020000 jle 0x5a48d1` -> `$005A48D1`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A48F5 8384820069420601 add dword ptr [edx + eax*4 + 0x6426900], 1`
- `$005A463D` `7e67 jle 0x5a46a6` -> `$005A46A6`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A46D2 7e67 jle 0x5a473b`
- `$005A46D2` `7e67 jle 0x5a473b` -> `$005A473B`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4767 7e33 jle 0x5a479c`
- `$005A4767` `7e33 jle 0x5a479c` -> `$005A479C`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A47C8 7e33 jle 0x5a47fd`
- `$005A47C8` `7e33 jle 0x5a47fd` -> `$005A47FD`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4829 7e33 jle 0x5a485e`
- `$005A4829` `7e33 jle 0x5a485e` -> `$005A485E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4882 838482fc68420601 add dword ptr [edx + eax*4 + 0x64268fc], 1`
- `$005A48CB` `0f8540fdffff jne 0x5a4611` -> `$005A4611`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A463D 7e67 jle 0x5a46a6`
- `$005A4940` `0f8489010000 je 0x5a4acf` -> `$005A4ACF`: first `b803000000 mov eax, 3`; next semantic at `$005A4B02 0f8e0d010000 jle 0x5a4c15`
- `$005A497A` `0f854f010000 jne 0x5a4acf` -> `$005A4ACF`: first `b803000000 mov eax, 3`; next semantic at `$005A4B02 0f8e0d010000 jle 0x5a4c15`
- `$005A4988` `0f8e41010000 jle 0x5a4acf` -> `$005A4ACF`: first `b803000000 mov eax, 3`; next semantic at `$005A4B02 0f8e0d010000 jle 0x5a4c15`
- `$005A49B7` `0f8412010000 je 0x5a4acf` -> `$005A4ACF`: first `b803000000 mov eax, 3`; next semantic at `$005A4B02 0f8e0d010000 jle 0x5a4c15`
- `$005A4B02` `0f8e0d010000 jle 0x5a4c15` -> `$005A4C15`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4C41 745d je 0x5a4ca0`
- `$005A4B34` `0f85db000000 jne 0x5a4c15` -> `$005A4C15`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4C41 745d je 0x5a4ca0`
- `$005A4BE5` `7d2e jge 0x5a4c15` -> `$005A4C15`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4C41 745d je 0x5a4ca0`
- `$005A4C41` `745d je 0x5a4ca0` -> `$005A4CA0`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4CCC 745d je 0x5a4d2b`
- `$005A4C70` `7d2e jge 0x5a4ca0` -> `$005A4CA0`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4CCC 745d je 0x5a4d2b`
- `$005A4CCC` `745d je 0x5a4d2b` -> `$005A4D2B`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4D57 7479 je 0x5a4dd2`
- `$005A4CFB` `7d2e jge 0x5a4d2b` -> `$005A4D2B`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4D57 7479 je 0x5a4dd2`
- `$005A4D57` `7479 je 0x5a4dd2` -> `$005A4DD2`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4DFE 7466 je 0x5a4e66`
- `$005A4DFE` `7466 je 0x5a4e66` -> `$005A4E66`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A4E92 0f848b010000 je 0x5a5023`
- `$005A4E92` `0f848b010000 je 0x5a5023` -> `$005A5023`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A504F 0f84e3020000 je 0x5a5338`
- `$005A504F` `0f84e3020000 je 0x5a5338` -> `$005A5338`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5364 0f8471020000 je 0x5a55db`
- `$005A5364` `0f8471020000 je 0x5a55db` -> `$005A55DB`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5607 0f84e6000000 je 0x5a56f3`
- `$005A5607` `0f84e6000000 je 0x5a56f3` -> `$005A56F3`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A571F 0f849b000000 je 0x5a57c0`
- `$005A571F` `0f849b000000 je 0x5a57c0` -> `$005A57C0`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A57F4 7568 jne 0x5a585e`
- `$005A57F4` `7568 jne 0x5a585e` -> `$005A585E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A588A 0f8429030000 je 0x5a5bb9`
- `$005A57FE` `7e5e jle 0x5a585e` -> `$005A585E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A588A 0f8429030000 je 0x5a5bb9`
- `$005A5830` `7e2c jle 0x5a585e` -> `$005A585E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A588A 0f8429030000 je 0x5a5bb9`
- `$005A588A` `0f8429030000 je 0x5a5bb9` -> `$005A5BB9`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5BE5 742c je 0x5a5c13`
- `$005A5968` `7e2f jle 0x5a5999` -> `$005A5999`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5A3D 66898491626f4206 mov word ptr [ecx + edx*4 + 0x6426f62], ax`
- `$005A5A71` `7e2f jle 0x5a5aa2` -> `$005A5AA2`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5ACE 7e2f jle 0x5a5aff`
- `$005A5ACE` `7e2f jle 0x5a5aff` -> `$005A5AFF`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5B2B 7e2f jle 0x5a5b5c`
- `$005A5B2B` `7e2f jle 0x5a5b5c` -> `$005A5B5C`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5B88 7e2f jle 0x5a5bb9`
- `$005A5B88` `7e2f jle 0x5a5bb9` -> `$005A5BB9`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5BE5 742c je 0x5a5c13`
- `$005A5BE5` `742c je 0x5a5c13` -> `$005A5C13`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5C3F 742c je 0x5a5c6d`
- `$005A5C3F` `742c je 0x5a5c6d` -> `$005A5C6D`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5C99 742c je 0x5a5cc7`
- `$005A5C99` `742c je 0x5a5cc7` -> `$005A5CC7`: first `b803000000 mov eax, 3`; next semantic at `$005A5CFA 7e3a jle 0x5a5d36`
- `$005A5CFA` `7e3a jle 0x5a5d36` -> `$005A5D36`: first `a1149f7000 mov eax, dword ptr [0x709f14]`; next semantic at `$005A5D3E 0f8e3b030000 jle 0x5a607f`
- `$005A5D3E` `0f8e3b030000 jle 0x5a607f` -> `$005A607F`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A60AB 0f8484000000 je 0x5a6135`
- `$005A5D70` `7536 jne 0x5a5da8` -> `$005A5DA8`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5DD4 7536 jne 0x5a5e0c`
- `$005A5DA2` `0f8f4c010000 jg 0x5a5ef4` -> `$005A5EF4`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5F18 83ac82e468420614 sub dword ptr [edx + eax*4 + 0x64268e4], 0x14`
- `$005A5DD4` `7536 jne 0x5a5e0c` -> `$005A5E0C`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5E0F e838f2feff call 0x59504c`
- `$005A5E06` `0f8fe8000000 jg 0x5a5ef4` -> `$005A5EF4`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5F18 83ac82e468420614 sub dword ptr [edx + eax*4 + 0x64268e4], 0x14`
- `$005A5E16` `7436 je 0x5a5e4e` -> `$005A5E4E`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5E51 e88ef1feff call 0x594fe4`
- `$005A5E48` `0f8fa6000000 jg 0x5a5ef4` -> `$005A5EF4`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5F18 83ac82e468420614 sub dword ptr [edx + eax*4 + 0x64268e4], 0x14`
- `$005A5E58` `7432 je 0x5a5e8c` -> `$005A5E8C`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5EB8 0f85c1010000 jne 0x5a607f`
- `$005A5E8A` `7f68 jg 0x5a5ef4` -> `$005A5EF4`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A5F18 83ac82e468420614 sub dword ptr [edx + eax*4 + 0x64268e4], 0x14`
- `$005A5EB8` `0f85c1010000 jne 0x5a607f` -> `$005A607F`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A60AB 0f8484000000 je 0x5a6135`
- `$005A5EEE` `0f8e8b010000 jle 0x5a607f` -> `$005A607F`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A60AB 0f8484000000 je 0x5a6135`
- `$005A60AB` `0f8484000000 je 0x5a6135` -> `$005A6135`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A6161 0f844b040000 je 0x5a65b2`
- `$005A60E5` `750c jne 0x5a60f3` -> `$005A60F3`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A6127 750c jne 0x5a6135`
- `$005A6127` `750c jne 0x5a6135` -> `$005A6135`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A6161 0f844b040000 je 0x5a65b2`
- `$005A6161` `0f844b040000 je 0x5a65b2` -> `$005A65B2`: assigned-extent boundary; late UnitCalc hook follows
- `$005A61B5` `0f84f7030000 je 0x5a65b2` -> `$005A65B2`: assigned-extent boundary; late UnitCalc hook follows
- `$005A61E7` `0f8419030000 je 0x5a6506` -> `$005A6506`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A652A 838482fc68420601 add dword ptr [edx + eax*4 + 0x64268fc], 1`
- `$005A6371` `0f8eac000000 jle 0x5a6423` -> `$005A6423`: first `8b45f0 mov eax, dword ptr [ebp - 0x10]`; next semantic at `$005A644F 0f8e5d010000 jle 0x5a65b2`
- `$005A644F` `0f8e5d010000 jle 0x5a65b2` -> `$005A65B2`: assigned-extent boundary; late UnitCalc hook follows

### Arithmetic idioms

Each sequence below is quoted through its correction or divide/store operation. Together with
the source-shaped expressions above, these sequences make the signed rounding reproducible.

- **IPShadow signed div 2:** `$0059D2E8 83e801 sub eax, 1; $0059D2EB 7105 jno 0x59d2f2; $0059D2ED e8f69be6ff call 0x406ee8; $0059D2F2 d1f8 sar eax, 1; $0059D2F4 7903 jns 0x59d2f9; $0059D2F6 83d000 adc eax, 0; $0059D2F9 8b55f0 mov edx, dword ptr [ebp - 0x10]`
- **Endurance gold-HP division by figures:** `$0059ED75 8bca mov ecx, edx; $0059ED77 99 cdq; $0059ED78 f7f9 idiv ecx; $0059ED7A 8bd0 mov edx, eax; $0059ED7C b801000000 mov eax, 1`
- **Endurance HP division by figures:** `$0059EE32 8bca mov ecx, edx; $0059EE34 99 cdq; $0059EE35 f7f9 idiv ecx; $0059EE37 8bd0 mov edx, eax; $0059EE39 b801000000 mov eax, 1`
- **Lionheart gold-HP division by figures:** `$005A077C 8bca mov ecx, edx; $005A077E 99 cdq; $005A077F f7f9 idiv ecx; $005A0781 8b55f0 mov edx, dword ptr [ebp - 0x10]; $005A0784 4a dec edx`
- **Lionheart HP division by figures:** `$005A082D 8bca mov ecx, edx; $005A082F 99 cdq; $005A0830 f7f9 idiv ecx; $005A0832 8b55f0 mov edx, dword ptr [ebp - 0x10]; $005A0835 4a dec edx`
- **Charm of Life signed div 4:** `$005A243E 85c0 test eax, eax; $005A2440 7903 jns 0x5a2445; $005A2442 83c003 add eax, 3; $005A2445 c1f802 sar eax, 2; $005A2448 8945e8 mov dword ptr [ebp - 0x18], eax; $005A244B 837de801 cmp dword ptr [ebp - 0x18], 1; $005A244F 7d07 jge 0x5a2458`
- **Warp Attack melee penalty term, signed div 2:** `$005A53AF e8341be6ff call 0x406ee8; $005A53B4 8b0d88917000 mov ecx, dword ptr [0x709188]; $005A53BA 8b9491b8684206 mov edx, dword ptr [ecx + edx*4 + 0x64268b8]; $005A53C1 d1fa sar edx, 1; $005A53C3 7903 jns 0x5a53c8; $005A53C5 83d200 adc edx, 0; $005A53C8 2bc2 sub eax, edx`
- **Warp Attack melee live-stat signed div 2:** `$005A5445 8b00 mov eax, dword ptr [eax]; $005A5447 99 cdq; $005A5448 f7f9 idiv ecx; $005A544A 5a pop edx; $005A544B 8902 mov dword ptr [edx], eax`
- **Warp Attack ranged penalty term, signed div 2:** `$005A5492 e8511ae6ff call 0x406ee8; $005A5497 8b0d88917000 mov ecx, dword ptr [0x709188]; $005A549D 8b9491bc684206 mov edx, dword ptr [ecx + edx*4 + 0x64268bc]; $005A54A4 d1fa sar edx, 1; $005A54A6 7903 jns 0x5a54ab; $005A54A8 83d200 adc edx, 0; $005A54AB 2bc2 sub eax, edx`
- **Warp Attack ranged live-stat signed div 2:** `$005A5528 8b00 mov eax, dword ptr [eax]; $005A552A 99 cdq; $005A552B f7f9 idiv ecx; $005A552D 5a pop edx; $005A552E 8902 mov dword ptr [edx], eax`
- **Warp Attack Thrown signed div 2:** `$005A5561 8b00 mov eax, dword ptr [eax]; $005A5563 99 cdq; $005A5564 f7f9 idiv ecx; $005A5566 5a pop edx; $005A5567 8902 mov dword ptr [edx], eax`
- **Warp Attack Fire Breath signed div 2:** `$005A559A 8b00 mov eax, dword ptr [eax]; $005A559C 99 cdq; $005A559D f7f9 idiv ecx; $005A559F 5a pop edx; $005A55A0 8902 mov dword ptr [edx], eax`
- **Warp Attack Lightning Breath signed div 2:** `$005A55D3 8b00 mov eax, dword ptr [eax]; $005A55D5 99 cdq; $005A55D6 f7f9 idiv ecx; $005A55D8 5a pop edx; $005A55D9 8902 mov dword ptr [edx], eax`
- **Warp Defense penalty-term signed div 3:** `$005A5638 b903000000 mov ecx, 3; $005A563D 99 cdq; $005A563E f7f9 idiv ecx; $005A5640 8b55f0 mov edx, dword ptr [ebp - 0x10]; $005A5643 4a dec edx`
- **Warp Defense live-stat signed div 3:** `$005A56EB 8b00 mov eax, dword ptr [eax]; $005A56ED 99 cdq; $005A56EE f7f9 idiv ecx; $005A56F0 5a pop edx; $005A56F1 8902 mov dword ptr [edx], eax`

### Instruction-level audit anchors

These lists accompany the source-shaped body; they do not replace it. J cites every semantic
conditional jump, C every non-compiler call, and W every named-field or cached-record write.
Range/overflow guard calls and their branches are excluded under the reconstruction convention.

- Row 0: J: `$0059A058`, `$0059A08A`, `$0059A0E4`, `$0059A144`; C: —; W: `$0059A0B0`, `$0059A10E`, `$0059A16A`
- Row 1: J: `$0059A19E`, `$0059A1D0`, `$0059A227`, `$0059A2AA`, `$0059A313`; C: —; W: `$0059A24D`, `$0059A2D0`, `$0059A357`
- Row 2: J: `$0059A38A`; C: —; W: `$0059A3B4`, `$0059A3E3`, `$0059A40F`, `$0059A43B`, `$0059A469`, `$0059A49D`, `$0059A4D7`, `$0059A511`, `$0059A54B`, `$0059A585`, `$0059A5BF`, `$0059A5F1`, `$0059A624`
- Row 3: J: —; C: `$0059A636`; W: —
- Row 4: J: `$0059A667`, `$0059A699`, `$0059A6FA`, `$0059A75B`, `$0059A7BC`, `$0059A7EE`, `$0059A975`, `$0059AA6D`, `$0059AB7C`; C: `$0059AA66`; W: `$0059A6BF`, `$0059A720`, `$0059A781`, `$0059A844`, `$0059A8B1`, `$0059A8DF`, `$0059A90A`, `$0059A939`, `$0059A99F`, `$0059A9CE`, `$0059A9FC`, `$0059AA2B`, `$0059AA93`, `$0059AAC7`, `$0059AB47`, `$0059ABEF`
- Row 5: J: `$0059AC23`, `$0059AC2C`; C: `$0059AC25`; W: `$0059AC52`
- Row 6: J: `$0059AC89`; C: —; W: `$0059ACAF`
- Row 7: J: —; C: `$0059ACBA`; W: —
- Row 8: J: `$0059ACEB`, `$0059AD40`, `$0059AD97`, `$0059AE50`, `$0059AF09`, `$0059AFC2`, `$0059B07B`, `$0059B134`, `$0059B1ED`, `$0059B2A6`, `$0059B35F`, `$0059B418`, `$0059B4D1`, `$0059B58A`, `$0059B643`, `$0059B6FC`, `$0059B7B5`, `$0059B86E`, `$0059B8A1`, `$0059B923`, `$0059B956`, `$0059B9D8`, `$0059BA0B`, `$0059BA8D`, `$0059BAC0`, `$0059BB42`, `$0059BBFB`, `$0059BCB4`, `$0059BD6D`, `$0059BE4B`, `$0059BEAC`, `$0059BF8A`, `$0059BFEB`, `$0059C027`, `$0059C088`, `$0059C0E9`, `$0059C11E`, `$0059C153`, `$0059C188`, `$0059C1BD`, `$0059C1F2`, `$0059C227`, `$0059C288`, `$0059C2BD`, `$0059C2F9`, `$0059C32E`, `$0059C363`, `$0059C398`, `$0059C3CD`, `$0059C402`, `$0059C463`, `$0059C498`, `$0059C4CD`, `$0059C502`, `$0059C5E7`, `$0059C61C`, `$0059C651`, `$0059C686`, `$0059C6BB`, `$0059C715`, `$0059C722`, `$0059C7B4`, `$0059C7E9`, `$0059C888`, `$0059C941`, `$0059C9FA`, `$0059CA32`, `$0059CA3A`, `$0059CA47`, `$0059CA83`, `$0059CABF`, `$0059CAFB`, `$0059CB37`, `$0059CB73`, `$0059CBAF`, `$0059CC68`, `$0059CC96`, `$0059CCD2`, `$0059CD8B`, `$0059CDB9`, `$0059CDF5`, `$0059CEAE`, `$0059CEDC`, `$0059CF18`, `$0059CFD1`, `$0059CFFF`, `$0059D03B`, `$0059D0F4`, `$0059D122`, `$0059D15E`, `$0059D217`, `$0059D245`, `$0059D281`, `$0059D361`, `$0059D371`, `$0059D380`, `$0059D390`, `$0059D3A8`, `$0059D3C2`, `$0059D3DC`, `$0059D3F6`, `$0059D441`, `$0059D44E`, `$0059D48A`, `$0059D4C6`, `$0059D502`, `$0059D5BB`, `$0059D674`, `$0059D72D`, `$0059D7E6`, `$0059D89F`, `$0059D986`, `$0059D996`, `$0059D9A5`, `$0059D9B5`, `$0059D9CD`, `$0059D9E7`, `$0059DA01`, `$0059DA1B`, `$0059DA61`; C: —; W: `$0059AD8D`, `$0059ADC1`, `$0059AE41`, `$0059AE7A`, `$0059AEFA`, `$0059AF33`, `$0059AFB3`, `$0059AFEC`, `$0059B06C`, `$0059B0A5`, `$0059B125`, `$0059B15E`, `$0059B1DE`, `$0059B264`, `$0059B290`, `$0059B31D`, `$0059B349`, `$0059B3D6`, `$0059B402`, `$0059B442`, `$0059B4C2`, `$0059B4FB`, `$0059B57B`, `$0059B5B4`, `$0059B634`, `$0059B66D`, `$0059B6ED`, `$0059B726`, `$0059B7A6`, `$0059B7DF`, `$0059B85F`, `$0059B914`, `$0059B9C9`, `$0059BA7E`, `$0059BB33`, `$0059BB6C`, `$0059BBEC`, `$0059BC25`, `$0059BCA5`, `$0059BCDE`, `$0059BD5E`, `$0059BD97`, `$0059BE17`, `$0059BE71`, `$0059BED6`, `$0059BF56`, `$0059BFB0`, `$0059C011`, `$0059C04D`, `$0059C079`, `$0059C0AE`, `$0059C0DA`, `$0059C10F`, `$0059C144`, `$0059C179`, `$0059C1AE`, `$0059C1E3`, `$0059C218`, `$0059C24D`, `$0059C279`, `$0059C2AE`, `$0059C2E3`, `$0059C31F`, `$0059C354`, `$0059C389`, `$0059C3BE`, `$0059C3F3`, `$0059C428`, `$0059C454`, `$0059C489`, `$0059C4BE`, `$0059C4F3`, `$0059C52C`, `$0059C558`, `$0059C5D8`, `$0059C60D`, `$0059C642`, `$0059C677`, `$0059C6AC`, `$0059C6E1`, `$0059C7A5`, `$0059C7DA`, `$0059C82F`, `$0059C879`, `$0059C8B2`, `$0059C932`, `$0059C96B`, `$0059C9EB`, `$0059CA20`, `$0059CA6D`, `$0059CAA9`, `$0059CAE5`, `$0059CB21`, `$0059CB5D`, `$0059CB99`, `$0059CBD9`, `$0059CC59`, `$0059CCBC`, `$0059CCFC`, `$0059CD7C`, `$0059CDDF`, `$0059CE1F`, `$0059CE9F`, `$0059CF02`, `$0059CF42`, `$0059CFC2`, `$0059D025`, `$0059D065`, `$0059D0E5`, `$0059D148`, `$0059D188`, `$0059D208`, `$0059D26B`, `$0059D31E`, `$0059D357`, `$0059D366`, `$0059D376`, `$0059D385`, `$0059D395`, `$0059D39E`, `$0059D3AD`, `$0059D3B4`, `$0059D3C7`, `$0059D3CE`, `$0059D3E1`, `$0059D3E8`, `$0059D41C`, `$0059D427`, `$0059D42E`, `$0059D474`, `$0059D4B0`, `$0059D4EC`, `$0059D52C`, `$0059D5AC`, `$0059D5E5`, `$0059D665`, `$0059D69E`, `$0059D71E`, `$0059D757`, `$0059D7D7`, `$0059D810`, `$0059D890`, `$0059D8C9`, `$0059D949`, `$0059D97C`, `$0059D98B`, `$0059D99B`, `$0059D9AA`, `$0059D9BA`, `$0059D9C3`, `$0059D9D2`, `$0059D9D9`, `$0059D9EC`, `$0059D9F3`, `$0059DA06`, `$0059DA0D`, `$0059DA41`, `$0059DA4C`, `$0059DA53`
- Row 9: J: `$0059DA93`, `$0059DAEA`, `$0059DB49`, `$0059DBD7`, `$0059DC96`; C: `$0059DBD0`, `$0059DC8F`; W: `$0059DB10`, `$0059DC01`, `$0059DC2D`, `$0059DC59`, `$0059DC85`, `$0059DCBC`, `$0059DCEA`
- Row 10: J: `$0059DD41`, `$0059DD5D`, `$0059DD79`, `$0059DD95`, `$0059DDBD`; C: —; W: `$0059DD24`, `$0059DDAF`
- Row 11: J: `$0059DDEF`; C: —; W: `$0059DE19`, `$0059DE4C`, `$0059DE7F`, `$0059DEB2`
- Row 12: J: `$0059DEEE`; C: —; W: `$0059DF14`, `$0059DF47`
- Row 13: J: `$0059DF7C`, `$0059DFB6`, `$0059DFC4`, `$0059DFF6`, `$0059DFFC`, `$0059E02B`, `$0059E061`, `$0059E18F`, `$0059E248`, `$0059E2E4`, `$0059E316`, `$0059E348`, `$0059E37A`, `$0059E3AC`, `$0059E3DE`, `$0059E445`; C: `$0059DF6D`, `$0059DF75`, `$0059E43E`; W: `$0059E092`, `$0059E0B9`, `$0059E0EC`, `$0059E120`, `$0059E153`, `$0059E1B9`, `$0059E239`, `$0059E24D`, `$0059E285`, `$0059E2B0`, `$0059E404`, `$0059E46B`, `$0059E49E`
- Row 14: J: —; C: `$0059E4B0`; W: —
- Row 15: J: `$0059E4E1`, `$0059E585`, `$0059E629`; C: `$0059E514`, `$0059E5B8`, `$0059E65C`; W: `$0059E552`, `$0059E5F6`, `$0059E69A`
- Row 16: J: `$0059E6CD`; C: —; W: `$0059E6F3`
- Row 17: J: `$0059E727`, `$0059E785`; C: —; W: `$0059E751`, `$0059E7AB`
- Row 18: J: `$0059E7E2`; C: —; W: `$0059E808`
- Row 19: J: `$0059E83C`; C: —; W: `$0059E862`
- Row 20: J: `$0059E896`; C: —; W: `$0059E8BC`
- Row 21: J: `$0059E8F0`, `$0059E94E`, `$0059E9AC`, `$0059EA08`; C: —; W: `$0059E91A`, `$0059E974`, `$0059E9D2`, `$0059EA2E`
- Row 22: J: `$0059EA65`; C: —; W: `$0059EA8B`
- Row 23: J: `$0059EABF`, `$0059EACC`, `$0059EB1F`; C: `$0059EAC5`; W: `$0059EB45`
- Row 24: J: `$0059EB79`; C: —; W: `$0059EBA3`, `$0059EBCF`, `$0059EBFB`
- Row 25: J: `$0059EC2F`, `$0059ED0D`; C: `$0059ED81`, `$0059EE3E`; W: `$0059EC59`, `$0059ECD9`, `$0059ED33`, `$0059EDF7`, `$0059EE68`
- Row 26: J: `$0059EEA2`, `$0059EF3B`, `$0059EFD0`, `$0059F002`, `$0059F0E6`; C: `$0059F0DF`; W: `$0059EECC`, `$0059EEFF`, `$0059EF61`, `$0059EF94`, `$0059F02C`, `$0059F0AC`, `$0059F110`, `$0059F190`
- Row 27: J: `$0059F1C4`, `$0059F1F6`; C: —; W: `$0059F220`, `$0059F2A0`
- Row 28: J: `$0059F2D4`, `$0059F302`; C: —; W: `$0059F328`
- Row 29: J: `$0059F35C`, `$0059F415`, `$0059F473`; C: —; W: `$0059F386`, `$0059F3B2`, `$0059F3E1`, `$0059F43B`, `$0059F499`
- Row 30: J: `$0059F4CF`; C: —; W: `$0059F4F9`, `$0059F579`, `$0059F5A5`, `$0059F5D4`
- Row 31: J: `$0059F608`; C: —; W: `$0059F632`, `$0059F65E`, `$0059F68A`, `$0059F6B9`, `$0059F6E7`, `$0059F714`, `$0059F73F`
- Row 32: J: `$0059F77B`; C: —; W: `$0059F7A1`, `$0059F7D0`
- Row 33: J: `$0059F804`, `$0059F8E9`, `$0059F97E`, `$0059F9DF`, `$0059FA40`, `$0059FAA1`; C: —; W: `$0059F82E`, `$0059F85A`, `$0059F889`, `$0059F8B5`, `$0059F90F`, `$0059F942`, `$0059F9A4`, `$0059FA05`, `$0059FA66`, `$0059FAC7`, `$0059FAFA`, `$0059FB2E`, `$0059FB61`, `$0059FB95`, `$0059FBC8`
- Row 34: J: `$0059FBFC`; C: —; W: `$0059FC26`, `$0059FC55`, `$0059FC81`, `$0059FCAD`, `$0059FCD9`, `$0059FD07`, `$0059FD34`, `$0059FD5F`, `$0059FD8B`
- Row 35: J: `$0059FDBF`; C: —; W: `$0059FDE5`
- Row 36: J: `$0059FE19`; C: —; W: `$0059FE3F`
- Row 37: J: `$0059FE73`, `$0059FEA5`, `$0059FF8F`, `$0059FFFD`; C: `$0059FFF6`; W: `$0059FED7`, `$0059FF5B`, `$0059FFBD`, `$005A002F`, `$005A00B3`, `$005A00DF`
- Row 38: J: `$005A0113`; C: —; W: `$005A0139`, `$005A0165`
- Row 39: J: `$005A0199`; C: —; W: `$005A01C3`, `$005A01EF`, `$005A0268`, `$005A0294`, `$005A0314`, `$005A0340`, `$005A03C0`, `$005A03EC`, `$005A0418`
- Row 40: J: `$005A044C`; C: —; W: `$005A0472`, `$005A04A1`
- Row 41: J: `$005A04D5`, `$005A0507`, `$005A05EB`; C: `$005A05E4`; W: `$005A0531`, `$005A05B1`, `$005A0615`, `$005A0695`, `$005A06C1`, `$005A0741`, `$005A07F2`, `$005A0857`, `$005A08DB`, `$005A090F`
- Row 42: J: `$005A0949`; C: —; W: `$005A0973`, `$005A09F3`
- Row 43: J: `$005A0A27`, `$005A0AB1`, `$005A0B8F`, `$005A0C6D`, `$005A0CCE`; C: —; W: `$005A0A51`, `$005A0A7D`, `$005A0ADB`, `$005A0B5B`, `$005A0BB9`, `$005A0C39`, `$005A0C93`, `$005A0CF4`
- Row 44: J: `$005A0D2F`, `$005A0D61`; C: —; W: `$005A0D87`, `$005A0DC3`, `$005A0E43`
- Row 45: J: `$005A0E77`, `$005A0EAF`; C: `$005A0EA8`; W: `$005A0ED9`, `$005A0F59`, `$005A0F85`, `$005A1005`
- Row 46: J: `$005A1039`, `$005A1090`, `$005A10BE`; C: —; W: `$005A10E4`
- Row 47: J: `$005A1118`, `$005A11B6`; C: `$005A11AF`; W: `$005A1142`, `$005A1175`, `$005A11DC`, `$005A120F`
- Row 48: J: `$005A1243`; C: —; W: `$005A1269`
- Row 49: J: `$005A127B`, `$005A1291`, `$005A12C6`, `$005A12D9`, `$005A12DF`, `$005A131C`, `$005A13FC`, `$005A145F`, `$005A14C2`; C: `$005A1274`; W: `$005A1294`, `$005A12D6`, `$005A1349`, `$005A13C8`, `$005A1425`, `$005A1488`, `$005A152C`, `$005A15AE`, `$005A15DD`, `$005A165C`
- Row 50: J: `$005A1690`, `$005A16C2`, `$005A1719`; C: —; W: `$005A1743`, `$005A17C3`, `$005A17EF`, `$005A186F`, `$005A189B`
- Row 51: J: `$005A18D6`, `$005A1929`; C: —; W: `$005A194F`
- Row 52: J: `$005A1983`, `$005A19B5`, `$005A19E3`, `$005A1A3A`, `$005A1BC4`, `$005A1CA2`, `$005A1D80`, `$005A1DE1`; C: —; W: `$005A1A64`, `$005A1AE4`, `$005A1B10`, `$005A1B90`, `$005A1BEE`, `$005A1C6E`, `$005A1CCC`, `$005A1D4C`, `$005A1DA6`, `$005A1E07`
- Row 53: J: `$005A1E20`, `$005A1E31`, `$005A1E6A`, `$005A1E9C`, `$005A1F0C`; C: `$005A1E19`; W: `$005A1E38`, `$005A1EC2`, `$005A1EF7`, `$005A1F09`
- Row 54: J: `$005A1F3E`, `$005A1F95`, `$005A2079`; C: `$005A2072`; W: `$005A1FBF`, `$005A203F`, `$005A20A3`, `$005A2123`
- Row 55: J: `$005A2157`, `$005A21AE`; C: —; W: `$005A21D8`, `$005A2204`, `$005A2284`
- Row 56: J: `$005A2297`, `$005A22D0`, `$005A22E0`, `$005A2315`, `$005A2384`; C: `$005A22D9`; W: `$005A229E`, `$005A233B`, `$005A236E`, `$005A2381`
- Row 57: J: `$005A23B6`, `$005A240D`, `$005A2440`, `$005A244F`; C: —; W: `$005A24C9`, `$005A24F8`
- Row 58: J: `$005A2532`; C: —; W: `$005A255A`
- Row 59: J: `$005A258D`; C: `$005A25BF`; W: `$005A25E9`
- Row 60: J: `$005A26AB`, `$005A26AE`, `$005A26B1`, `$005A26E4`, `$005A271C`, `$005A2732`; C: `$005A2671`, `$005A26E9`, `$005A2721`, `$005A272B`, `$005A2737`; W: `$005A26A4`
- Row 61: J: `$005A2748`, `$005A277A`, `$005A27AC`; C: —; W: `$005A27D6`, `$005A2856`
- Row 62: J: `$005A286A`, `$005A289C`, `$005A297A`, `$005A2A58`; C: —; W: `$005A28C6`, `$005A2946`, `$005A29A4`, `$005A2A24`, `$005A2A82`, `$005A2B02`, `$005A2B7B`, `$005A2BA7`
- Row 63: J: `$005A2BC2`, `$005A2BF4`, `$005A2D7E`, `$005A2E5C`; C: —; W: `$005A2C1E`, `$005A2C9E`, `$005A2CCA`, `$005A2D4A`, `$005A2DA8`, `$005A2E28`, `$005A2E86`, `$005A2F06`
- Row 64: J: `$005A2F3A`, `$005A2F74`, `$005A2F8D`, `$005A2F9B`; C: `$005A2F86`; W: `$005A2F76`, `$005A2F7F`, `$005A2FC1`, `$005A2FED`
- Row 65: J: `$005A301C`, `$005A320C`, `$005A32EA`; C: —; W: `$005A3046`, `$005A30C6`, `$005A30F2`, `$005A3172`, `$005A319E`, `$005A31D1`, `$005A3236`, `$005A32B6`, `$005A3314`, `$005A3347`, `$005A337A`, `$005A33FA`
- Row 66: J: `$005A3429`, `$005A345B`, `$005A3545`, `$005A35AD`, `$005A3615`, `$005A3683`; C: `$005A367C`; W: `$005A348D`, `$005A3511`, `$005A3573`, `$005A35DB`, `$005A3643`, `$005A36B5`, `$005A3739`, `$005A3765`
- Row 67: J: `$005A3794`, `$005A37C6`, `$005A37F4`, `$005A37FE`, `$005A3830`, `$005A3862`, `$005A3894`, `$005A3A62`, `$005A3A94`, `$005A3C36`, `$005A3C68`; C: —; W: `$005A38C6`, `$005A394A`, `$005A397E`, `$005A3A02`, `$005A3A2E`, `$005A3AC6`, `$005A3B4A`, `$005A3B7E`, `$005A3C02`, `$005A3C9A`, `$005A3D1E`, `$005A3D52`, `$005A3DD6`
- Row 68: J: `$005A3E05`; C: —; W: `$005A3E2B`
- Row 69: J: `$005A3E5A`, `$005A3E8F`, `$005A3E9B`; C: `$005A3E94`; W: `$005A3EC1`
- Row 70: J: `$005A3F03`; C: —; W: `$005A3F2D`, `$005A3F60`, `$005A3F94`, `$005A3FC7`, `$005A3FFB`, `$005A402E`, `$005A4061`, `$005A4094`, `$005A40C7`, `$005A40FB`, `$005A417B`
- Row 71: J: `$005A4195`, `$005A41CA`, `$005A41D9`, `$005A4202`, `$005A4237`, `$005A423D`, `$005A426F`, `$005A42A1`, `$005A4336`, `$005A43CB`, `$005A442C`, `$005A448D`, `$005A44EE`, `$005A4583`, `$005A45F6`, `$005A4601`, `$005A463D`, `$005A46D2`, `$005A4767`, `$005A47C8`, `$005A4829`, `$005A48CB`; C: `$005A45EF`; W: `$005A4198`, `$005A419B`, `$005A41D3`, `$005A41D6`, `$005A42C7`, `$005A42FA`, `$005A435C`, `$005A438F`, `$005A43F1`, `$005A4452`, `$005A44B3`, `$005A4514`, `$005A4547`, `$005A45A9`, `$005A45DC`, `$005A4607`, `$005A4663`, `$005A4696`, `$005A46F8`, `$005A472B`, `$005A478D`, `$005A47EE`, `$005A484F`, `$005A4882`, `$005A48B5`, `$005A48C8`, `$005A48F5`, `$005A4928`
- Row 72: J: `$005A4940`, `$005A497A`, `$005A4988`, `$005A49B7`; C: —; W: `$005A49E1`, `$005A4A14`, `$005A4A47`, `$005A4AC7`
- Row 73: J: `$005A4B02`, `$005A4B34`, `$005A4BE5`; C: —; W: `$005A4BB0`, `$005A4C0B`
- Row 74: J: `$005A4C41`, `$005A4C70`, `$005A4CCC`, `$005A4CFB`; C: —; W: `$005A4C96`, `$005A4D21`
- Row 75: J: `$005A4D57`; C: —; W: `$005A4DCA`
- Row 76: J: `$005A4DFE`; C: —; W: `$005A4E24`, `$005A4E57`
- Row 77: J: `$005A4E92`; C: —; W: `$005A4EBC`, `$005A4F3C`, `$005A4F68`, `$005A4FE8`, `$005A5014`
- Row 78: J: `$005A504F`; C: —; W: `$005A5079`, `$005A50F9`, `$005A5125`, `$005A51A5`, `$005A51D1`, `$005A5204`, `$005A5284`, `$005A52B0`, `$005A5330`
- Row 79: J: `$005A5364`; C: —; W: `$005A540C`, `$005A544B`, `$005A54EF`, `$005A552E`, `$005A5567`, `$005A55A0`, `$005A55D9`
- Row 80: J: `$005A5607`; C: —; W: `$005A56B2`, `$005A56F1`
- Row 81: J: `$005A571F`; C: —; W: `$005A578B`, `$005A57B9`
- Row 82: J: `$005A57F4`, `$005A57FE`, `$005A5830`; C: —; W: `$005A5856`
- Row 83: J: `$005A588A`, `$005A5968`, `$005A5A71`, `$005A5ACE`, `$005A5B2B`, `$005A5B88`; C: —; W: `$005A5934`, `$005A598E`, `$005A5A3D`, `$005A5A97`, `$005A5AF4`, `$005A5B51`, `$005A5BAE`
- Row 84: J: `$005A5BE5`, `$005A5C3F`, `$005A5C99`; C: —; W: `$005A5C0B`, `$005A5C65`, `$005A5CBF`
- Row 85: J: `$005A5CFA`; C: —; W: `$005A5D28`
- Row 86: J: `$005A5D3E`, `$005A5D70`, `$005A5DA2`, `$005A5DD4`, `$005A5E06`, `$005A5E16`, `$005A5E48`, `$005A5E58`, `$005A5E8A`, `$005A5EB8`, `$005A5EEE`; C: `$005A5E0F`, `$005A5E51`; W: `$005A5F18`, `$005A5F4B`, `$005A5FCB`, `$005A5FF7`, `$005A6077`
- Row 87: J: `$005A60AB`, `$005A60E5`, `$005A6127`; C: —; W: `$005A60EC`, `$005A612E`
- Row 88: J: `$005A6161`, `$005A61B5`, `$005A61E7`, `$005A6371`, `$005A644F`; C: —; W: `$005A6211`, `$005A6291`, `$005A62BD`, `$005A633D`, `$005A639B`, `$005A641B`, `$005A6479`, `$005A64F9`, `$005A652A`, `$005A65AA`

## Coverage ledger

The assigned extent is now fully represented. Reaching `$005A65B2` in the withdrawn survey did
not reconstruct the omitted bodies; the replacement above does.

| Row | Start | End | Within | Disposition | Reconstruction location |
|---:|---|---|---:|---|---|
| 0 | `$0059A02C` | `$0059A172` | — | reconstructed | Source-shaped block 59A02C..59A172 (exact) |
| 1 | `$0059A172` | `$0059A35E` | — | reconstructed | Source-shaped block 59A172..59A35E (inferred: global semantic name) |
| 2 | `$0059A35E` | `$0059A633` | — | reconstructed | Source-shaped block 59A35E..59A633 (exact) |
| 3 | `$0059A633` | `$0059A63B` | — | reconstructed | Source-shaped block 59A633..59A63B (exact TD32 call) |
| 4 | `$0059A63B` | `$0059ABF7` | — | reconstructed | Source-shaped block 59A63B..59ABF7 (exact) |
| 5 | `$0059ABF7` | `$0059AC5D` | — | reconstructed | Source-shaped block 59ABF7..59AC5D (exact) |
| 6 | `$0059AC5D` | `$0059ACB7` | — | reconstructed | Source-shaped block 59AC5D..59ACB7 (exact) |
| 7 | `$0059ACB7` | `$0059ACBF` | — | reconstructed | Source-shaped block 59ACB7..59ACBF (exact TD32 call) |
| 8 | `$0059ACBF` | `$0059DA67` | — | reconstructed | Source-shaped block 59ACBF..59DA67 (exact outer structure) |
| 9 | `$0059DA67` | `$0059DCF2` | — | reconstructed | Source-shaped block 59DA67..59DCF2 (exact) |
| 10 | `$0059DCF2` | `$0059DDC3` | — | reconstructed | Source-shaped block 59DCF2..59DDC3 (exact) |
| 11 | `$0059DDC3` | `$0059DEC2` | — | reconstructed | Source-shaped block 59DDC3..59DEC2 (exact) |
| 12 | `$0059DEC2` | `$0059DF56` | — | reconstructed | Source-shaped block 59DEC2..59DF56 (exact) |
| 13 | `$0059DF56` | `$0059E4AD` | — | reconstructed | Source-shaped block 59DF56..59E4AD (inferred: global/record names) |
| 14 | `$0059E4AD` | `$0059E4B5` | — | reconstructed | Source-shaped block 59E4AD..59E4B5 (exact TD32 call) |
| 15 | `$0059E4B5` | `$0059E6A1` | — | reconstructed | Source-shaped block 59E4B5..59E6A1 (exact) |
| 16 | `$0059E6A1` | `$0059E6FB` | — | reconstructed | Source-shaped block 59E6A1..59E6FB (exact) |
| 17 | `$0059E6FB` | `$0059E7B6` | — | reconstructed | Source-shaped block 59E6FB..59E7B6 (exact) |
| 18 | `$0059E7B6` | `$0059E810` | — | reconstructed | Source-shaped block 59E7B6..59E810 (exact) |
| 19 | `$0059E810` | `$0059E86A` | — | reconstructed | Source-shaped block 59E810..59E86A (exact) |
| 20 | `$0059E86A` | `$0059E8C4` | — | reconstructed | Source-shaped block 59E86A..59E8C4 (exact) |
| 21 | `$0059E8C4` | `$0059EA39` | — | reconstructed | Source-shaped block 59E8C4..59EA39 (exact) |
| 22 | `$0059EA39` | `$0059EA93` | — | reconstructed | Source-shaped block 59EA39..59EA93 (exact) |
| 23 | `$0059EA93` | `$0059EB4D` | — | reconstructed | Source-shaped block 59EA93..59EB4D (exact) |
| 24 | `$0059EB4D` | `$0059EC03` | — | reconstructed | Source-shaped block 59EB4D..59EC03 (exact) |
| 25 | `$0059EC03` | `$0059EE76` | — | reconstructed | Source-shaped block 59EC03..59EE76 (inferred: configured-global binding) |
| 26 | `$0059EE76` | `$0059F198` | — | reconstructed | Source-shaped block 59EE76..59F198 (exact) |
| 27 | `$0059F198` | `$0059F2A8` | — | reconstructed | Source-shaped block 59F198..59F2A8 (exact) |
| 28 | `$0059F2A8` | `$0059F330` | — | reconstructed | Source-shaped block 59F2A8..59F330 (exact) |
| 29 | `$0059F330` | `$0059F4A3` | — | reconstructed | Source-shaped block 59F330..59F4A3 (exact) |
| 30 | `$0059F4A3` | `$0059F5DC` | — | reconstructed | Source-shaped block 59F4A3..59F5DC (exact) |
| 31 | `$0059F5DC` | `$0059F747` | — | reconstructed | Source-shaped block 59F5DC..59F747 (exact) |
| 32 | `$0059F747` | `$0059F7D8` | — | reconstructed | Source-shaped block 59F747..59F7D8 (inferred: configured-global binding) |
| 33 | `$0059F7D8` | `$0059FBD0` | — | reconstructed | Source-shaped block 59F7D8..59FBD0 (exact) |
| 34 | `$0059FBD0` | `$0059FD93` | — | reconstructed | Source-shaped block 59FBD0..59FD93 (exact) |
| 35 | `$0059FD93` | `$0059FDED` | — | reconstructed | Source-shaped block 59FD93..59FDED (exact) |
| 36 | `$0059FDED` | `$0059FE47` | — | reconstructed | Source-shaped block 59FDED..59FE47 (exact) |
| 37 | `$0059FE47` | `$005A00E7` | — | reconstructed | Source-shaped block 59FE47..5A00E7 (inferred: configured-global bindings) |
| 38 | `$005A00E7` | `$005A016D` | — | reconstructed | Source-shaped block 5A00E7..5A016D (exact) |
| 39 | `$005A016D` | `$005A0420` | — | reconstructed | Source-shaped block 5A016D..5A0420 (exact) |
| 40 | `$005A0420` | `$005A04A9` | — | reconstructed | Source-shaped block 5A0420..5A04A9 (exact) |
| 41 | `$005A04A9` | `$005A091D` | — | reconstructed | Source-shaped block 5A04A9..5A091D (inferred: configured-global bindings) |
| 42 | `$005A091D` | `$005A09FB` | — | reconstructed | Source-shaped block 5A091D..5A09FB (exact) |
| 43 | `$005A09FB` | `$005A0D03` | — | reconstructed | Source-shaped block 5A09FB..5A0D03 (exact) |
| 44 | `$005A0D03` | `$005A0E4B` | — | reconstructed | Source-shaped block 5A0D03..5A0E4B (exact) |
| 45 | `$005A0E4B` | `$005A100D` | — | reconstructed | Source-shaped block 5A0E4B..5A100D (exact) |
| 46 | `$005A100D` | `$005A10EC` | — | reconstructed | Source-shaped block 5A100D..5A10EC (exact) |
| 47 | `$005A10EC` | `$005A1217` | — | reconstructed | Source-shaped block 5A10EC..5A1217 (exact) |
| 48 | `$005A1217` | `$005A1271` | — | reconstructed | Source-shaped block 5A1217..5A1271 (exact) |
| 49 | `$005A1271` | `$005A1664` | — | reconstructed | Source-shaped block 5A1271..5A1664 (exact) |
| 50 | `$005A1664` | `$005A18AA` | — | reconstructed | Source-shaped block 5A1664..5A18AA (exact) |
| 51 | `$005A18AA` | `$005A1957` | — | reconstructed | Source-shaped block 5A18AA..5A1957 (exact) |
| 52 | `$005A1957` | `$005A1E16` | — | reconstructed | Source-shaped block 5A1957..5A1E16 (exact) |
| 53 | `$005A1E16` | `$005A1F12` | — | reconstructed | Source-shaped block 5A1E16..5A1F12 (exact) |
| 54 | `$005A1F12` | `$005A212B` | — | reconstructed | Source-shaped block 5A1F12..5A212B (exact) |
| 55 | `$005A212B` | `$005A228C` | — | reconstructed | Source-shaped block 5A212B..5A228C (exact) |
| 56 | `$005A228C` | `$005A238A` | — | reconstructed | Source-shaped block 5A228C..5A238A (exact) |
| 57 | `$005A238A` | `$005A2506` | — | reconstructed | Source-shaped block 5A238A..5A2506 (exact) |
| 58 | `$005A2506` | `$005A2561` | — | reconstructed | Source-shaped block 5A2506..5A2561 (exact) |
| 59 | `$005A2561` | `$005A25F0` | — | reconstructed | Source-shaped block 5A2561..5A25F0 (exact) |
| 60 | `$005A25F0` | `$005A273C` | — | reconstructed | Source-shaped block 5A25F0..5A273C (exact) |
| 61 | `$005A273C` | `$005A285E` | — | reconstructed | Source-shaped block 5A273C..5A285E (inferred: event name) |
| 62 | `$005A285E` | `$005A2BB6` | — | reconstructed | Source-shaped block 5A285E..5A2BB6 (inferred: event name) |
| 63 | `$005A2BB6` | `$005A2F0E` | — | reconstructed | Source-shaped block 5A2BB6..5A2F0E (inferred: event name) |
| 64 | `$005A2F0E` | `$005A2FF5` | — | reconstructed | Source-shaped block 5A2F0E..5A2FF5 (inferred: one global semantic name) |
| 65 | `$005A2FF5` | `$005A3402` | 64 | reconstructed | Source-shaped block 5A2FF5..5A3402 (exact) |
| 66 | `$005A3402` | `$005A376D` | 64 | reconstructed | Source-shaped block 5A3402..5A376D (inferred: configured-global bindings) |
| 67 | `$005A376D` | `$005A3DDE` | 64 | reconstructed | Source-shaped block 5A376D..5A3DDE (inferred: configured-global bindings) |
| 68 | `$005A3DDE` | `$005A3E33` | 64 | reconstructed | Source-shaped block 5A3DDE..5A3E33 (exact) |
| 69 | `$005A3E33` | `$005A3ED0` | 64 | reconstructed | Source-shaped block 5A3E33..5A3ED0 (exact) |
| 70 | `$005A3ED0` | `$005A4183` | 64 | reconstructed | Source-shaped block 5A3ED0..5A4183 (exact) |
| 71 | `$005A4183` | `$005A4938` | 64 | reconstructed | Source-shaped block 5A4183..5A4938 (exact) |
| 72 | `$005A4938` | `$005A4ACF` | 64 | reconstructed | Source-shaped block 5A4938..5A4ACF (exact) |
| 73 | `$005A4ACF` | `$005A4C15` | 64 | reconstructed | Source-shaped block 5A4ACF..5A4C15 (inferred: configured-global binding) |
| 74 | `$005A4C15` | `$005A4D2B` | 64 | reconstructed | Source-shaped block 5A4C15..5A4D2B (exact) |
| 75 | `$005A4D2B` | `$005A4DD2` | 64 | reconstructed | Source-shaped block 5A4D2B..5A4DD2 (exact) |
| 76 | `$005A4DD2` | `$005A4E66` | 64 | reconstructed | Source-shaped block 5A4DD2..5A4E66 (exact) |
| 77 | `$005A4E66` | `$005A5023` | 64 | reconstructed | Source-shaped block 5A4E66..5A5023 (exact) |
| 78 | `$005A5023` | `$005A5338` | 64 | reconstructed | Source-shaped block 5A5023..5A5338 (exact) |
| 79 | `$005A5338` | `$005A55DB` | 64 | reconstructed | Source-shaped block 5A5338..5A55DB (exact) |
| 80 | `$005A55DB` | `$005A56F3` | 64 | reconstructed | Source-shaped block 5A55DB..5A56F3 (exact) |
| 81 | `$005A56F3` | `$005A57C0` | 64 | reconstructed | Source-shaped block 5A56F3..5A57C0 (exact) |
| 82 | `$005A57C0` | `$005A585E` | 64 | reconstructed | Source-shaped block 5A57C0..5A585E (inferred: city-field alias) |
| 83 | `$005A585E` | `$005A5BB9` | 64 | reconstructed | Source-shaped block 5A585E..5A5BB9 (exact) |
| 84 | `$005A5BB9` | `$005A5CC7` | 64 | reconstructed | Source-shaped block 5A5BB9..5A5CC7 (exact) |
| 85 | `$005A5CC7` | `$005A5D36` | 64 | reconstructed | Source-shaped block 5A5CC7..5A5D36 (inferred: configured-global binding) |
| 86 | `$005A5D36` | `$005A607F` | 64 | reconstructed | Source-shaped block 5A5D36..5A607F (inferred: city-field aliases) |
| 87 | `$005A607F` | `$005A6135` | 64 | reconstructed | Source-shaped block 5A607F..5A6135 (inferred: sight-byte aliases) |
| 88 | `$005A6135` | `$005A65B2` | 64 | reconstructed | Source-shaped block 5A6135..5A65B2 (exact) |

Current completion counts:

- `unresolved ranges: 0`
- `synthetic helpers without bodies: 0`
- `semantic conditional jumps omitted: 0`
- `semantic calls omitted: 0`
- `state writes omitted: 0`
- `declared parent mismatches: 0`

**R5.1b is complete.**
