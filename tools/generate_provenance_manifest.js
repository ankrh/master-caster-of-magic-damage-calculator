#!/usr/bin/env node
'use strict';

// Reviewer aid: prints the reviewed binding manifest after adjacent citations have been
// manually checked. It never writes the manifest; updating that trust anchor is an explicit diff.
const fs = require('fs');
const crypto = require('crypto');
const { calculatorFiles } = require('./provenance_audit');

const output = {};
for (const file of calculatorFiles) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /PROVENANCE\[([^\]]+)\]: VERIFIED\s+versions=([^;]+);\s*sources=(.+)$/.exec(line);
    if (!match) continue;
    const versions = match[2].split(',').map(value => value.trim()).filter(Boolean);
    const citations = match[3].split('|').map(value => value.trim()).filter(Boolean);
    const sourceDigests = citations.map(citation => {
      const value = citation.startsWith('TABLE=') ? citation.slice(6) : citation;
      const source = /^(.*):(\d+)-(\d+)$/.exec(value);
      const lines = fs.readFileSync(source[1], 'utf8').split(/\r?\n/);
      const excerpt = lines.slice(Number(source[2]) - 1, Number(source[3])).join('\n');
      return crypto.createHash('sha256').update(excerpt).digest('hex');
    });
    output[match[1]] = crypto.createHash('sha256').update(JSON.stringify({
      versions, citations, sourceDigests,
    })).digest('hex');
  }
}
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
