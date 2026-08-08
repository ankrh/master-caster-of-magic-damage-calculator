"""Regression tests for the DOS derivation checker and citation extractor."""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from capstone import CS_ARCH_X86, CS_MODE_16, Cs

from tools.scan_mom_binary import FIELDS
from tools.split_dos_derivation import extract_build_text
from tools.verify_dos_derivation import named_write


ROOT = Path(__file__).resolve().parents[1]
VERIFY = ROOT / 'tools' / 'verify_dos_derivation.py'


def instruction(raw):
    """Disassemble one 16-bit instruction for direct helper tests."""
    return next(iter(Cs(CS_ARCH_X86, CS_MODE_16).disasm(bytes(raw), 0x1000)))


class BuildCitationTests(unittest.TestCase):
    def test_labels_are_tokens_and_explicit_versions_win(self):
        text = """\
## Call inventory
| `0x1234` | unlabeled helper |
| `0x1235` | shared helper | all |
| `0x1236` | DOS-lineage helper | all MoM |
| `0x1237` | original helper | MoM 1.31 |
| `0x1238` | patched helper | CP 1.60, CoM 1 |
"""
        extracts = {build: extract_build_text(text, build)
                    for build in ('mom131', 'mom160', 'com1')}

        for result in extracts.values():
            self.assertNotIn('0x1234', result)  # "Call" is not an "all" label.
            self.assertIn('0x1235', result)
        self.assertIn('0x1236', extracts['mom131'])
        self.assertIn('0x1236', extracts['mom160'])
        self.assertNotIn('0x1236', extracts['com1'])
        self.assertIn('0x1237', extracts['mom131'])
        self.assertNotIn('0x1237', extracts['mom160'])
        self.assertNotIn('0x1237', extracts['com1'])
        self.assertNotIn('0x1238', extracts['mom131'])
        self.assertIn('0x1238', extracts['mom160'])
        self.assertIn('0x1238', extracts['com1'])

    def test_build_labelled_plain_inventory_lines_are_kept(self):
        text = """\
### Shared by all three builds
0x2000 je ->0x2004
### Details
mom131: 0x2005 ->0x2008
mom160: 0x2009 ->0x200C
com1: 0x200D ->0x2010
"""
        original = extract_build_text(text, 'mom131')
        patched = extract_build_text(text, 'mom160')
        com1 = extract_build_text(text, 'com1')
        for result in (original, patched, com1):
            self.assertIn('0x2000', result)
        self.assertIn('0x2005', original)
        self.assertNotIn('0x2005', patched)
        self.assertIn('0x2009', patched)
        self.assertNotIn('0x2009', com1)
        self.assertIn('0x200D', com1)

    def test_r6_2f_explicit_call_rows_do_not_leak(self):
        evidence = (ROOT / 'Reference docs' / 'DOS reconstructed'
                    / 'R6.2f.evidence.md').read_text(encoding='utf-8')
        original = extract_build_text(evidence, 'mom131')
        patched = extract_build_text(evidence, 'mom160')
        com1 = extract_build_text(evidence, 'com1')

        self.assertIn('0x877FD', original)
        self.assertIn('0x87809', original)
        self.assertNotIn('0x877FF', original)
        self.assertNotIn('0x8780B', original)
        com1_only_call = '| `0x87540` | `9A 4D 00 D0 03`'
        self.assertNotIn(com1_only_call, original)

        for result in (patched, com1):
            self.assertNotIn('0x877FD', result)
            self.assertNotIn('0x87809', result)
            self.assertIn('0x877FF', result)
            self.assertIn('0x8780B', result)
        self.assertNotIn(com1_only_call, patched)
        self.assertIn(com1_only_call, com1)

    def test_verifier_rejects_another_builds_same_address_citation(self):
        data = bytearray(b'\x90' * 0x101C)
        # 0x1014: cmp ax,1; 0x1017: je 0x101B; nop; nop; retf
        data[0x1014:0x101C] = bytes.fromhex('83 F8 01 74 02 90 90 CB')
        doc = """\
| 0 | mom131 | `0x1000` | `0x101C` | — | reconstructed | fixture |
| 0 | mom160 | `0x1000` | `0x101C` | — | reconstructed | fixture |
/* 131:0x1014  160:—  com1:— */
"""
        with tempfile.TemporaryDirectory() as tmp:
            exe = Path(tmp) / 'fixture.exe'
            evidence = Path(tmp) / 'fixture.md'
            exe.write_bytes(data)
            evidence.write_text(doc, encoding='utf-8')

            original = subprocess.run(
                [sys.executable, str(VERIFY), str(exe), str(evidence), 'mom131'],
                cwd=ROOT, capture_output=True, text=True, check=False)
            patched = subprocess.run(
                [sys.executable, str(VERIFY), str(exe), str(evidence), 'mom160'],
                cwd=ROOT, capture_output=True, text=True, check=False)

        self.assertEqual(0, original.returncode, original.stdout + original.stderr)
        self.assertEqual(1, patched.returncode, patched.stdout + patched.stderr)
        self.assertIn('01017', patched.stdout)


class NamedWriteTests(unittest.TestCase):
    def test_memory_source_is_not_a_write(self):
        self.assertFalse(named_write(instruction(bytes.fromhex('26 8B 0F'))))
        self.assertFalse(named_write(instruction(bytes.fromhex('A1 34 12'))))

    def test_memory_destination_is_a_write(self):
        self.assertTrue(named_write(instruction(bytes.fromhex('26 89 0F'))))
        self.assertTrue(named_write(instruction(bytes.fromhex('A3 34 12'))))

    def test_every_reconstructed_write_displacement_is_mapped(self):
        required = {
            0x07, 0x0B, 0x0C, 0x16, 0x17, 0x19, 0x1A,
            0x2C, 0x2D, 0x2E, 0x2F, 0x34, 0x36, 0x37, 0x38,
            0x3C, 0x3D, 0x64, 0x65, 0x66, 0x67, 0x68,
            0x69, 0x6A, 0x6B, 0x6C, 0x6D,
        }
        self.assertEqual(set(), required - set(FIELDS))
        for displacement in required:
            with self.subTest(displacement=hex(displacement)):
                store = instruction(bytes((0xC6, 0x47, displacement, 0x01)))
                load = instruction(bytes((0x8A, 0x47, displacement)))
                self.assertTrue(named_write(store))
                self.assertFalse(named_write(load))


if __name__ == '__main__':
    unittest.main()
