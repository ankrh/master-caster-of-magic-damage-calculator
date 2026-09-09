<!-- Tier: CONTRACT. Shared execution procedures referenced by CLAUDE.md. -->

# Agent execution

## Launchers and prompts

Use these launchers for cross-model review and derivation from either coordinator. Resolve `~`
to the user's home directory. Use an installed Python interpreter; on Windows, expand paths
through `$env:USERPROFILE` and quote them. In Codex, run wrappers as foreground commands inside
the background-capable shell tool and retain its session handle. In Claude, start long commands
in the shell tool's background mode and retain its task ID for Monitor or the output tool.

| Target | Python script | Model and effort arguments |
|---|---|---|
| GPT | `~/.claude/tools/codex_agent.py` | `--model gpt-6-astra --reasoning-effort medium` |
| Claude | `~/.codex/skills/claude-review/scripts/claude_agent.py` | `--model claude-fable-5-1 --effort medium` |

The model arguments implement the preferences in `CLAUDE.md` using explicit model IDs. Honor
any model choice the user supplies for the task; do not silently substitute an unavailable model.

Both launchers accept `--repo <directory> --prompt <UTF-8-file> --out <answer-file>` and
`--resume <session-id>`. GPT derivations additionally use `--require-session`; Claude returns a
validated session ID on every success. Claude derivations use `--mode derivation`; Claude reviews
use `--mode review` (the default). Do not type `codex exec` or `codex exec resume` directly.
Use a distinct output filename for every call, including evidence continuations, so prior answers
and their logs remain available and the GPT launcher's existing-log guard does not reject a run.

Put prompts, evidence packets, status files and reports in a named task directory under
`.reviews/`. Pass relevant global and project instructions explicitly in every launch prompt;
do not assume the child inherits the coordinator's context. The Claude launcher disables
automatic customizations, hooks, skills and MCP servers. Identify the child's assigned stage so
it performs only that stage, without recursively launching the project's full task protocol.

For a review, supply the exact scope, user requirements, relevant source paths, a diff that
includes new files, and verification results. Claude can read and search files but has no shell:
the coordinator supplies the diff and any tool-generated evidence. Ask for concrete defects,
locations, impact and corrections, separating optional suggestions. Include Method A's test-cost
rule from `CLAUDE.md`.

For a derivation, supply the common evidence packet required by Method B and ask for the complete
derivation as the final answer. Use reading tools only, with no delegation or workspace edits;
do not pass GPT's `--write`. An agent requests missing disassembly or raw data from the
coordinator, who extracts it from the binary and supplies it to both agents. Continue each
derivation session with the added evidence through its wrapper, keeping the instruction-count
limits from Method B. The wrappers persist each agent's answer verbatim; writing the file does
not make the coordinator its content author.

## Independence and round outputs

Initial derivation prompts contain no existing reconstruction of the target or other agent's
answer. Prepare an evidence-only working directory for each derivation agent and tell it to read
only the supplied evidence paths. Claude's `--restricted` file tools are confined to `--repo`;
copy every permitted evidence file inside it. This is an application restriction, not an OS
sandbox. GPT uses its wrapper's read-only sandbox; direct its reads to the supplied evidence.
Neither agent may seek the other derivation early.

After both derivations finish, resume each session to review the other derivation. Use Claude's
review mode for that call. For revisions, start fresh sessions in derivation mode to exclude the
other derivation retained by the reciprocal-review sessions. Supply only the permitted inputs
listed in Method B, plus the applicable task instructions. Provide binary evidence directly;
do not supply links to excluded derivations through handoff files.

Keep separate files for initial derivations, reciprocal reviews and revisions. The artifact
table in `CLAUDE.md` gives their names. Merge the revised outputs only after both
have completed successfully. Preserve their provenance and name unresolved disagreements.

## Waiting and validation

- In Claude, use Monitor when available, or the native background-task completion/output tool.
- In Codex, use the shell tool's returned session handle and its follow-up output tool. Use the
  agent wait/message tools for native implementation subagents. If a tool call itself yields a
  running cell, wait on that cell with its matching tool.
- Use bounded waits that leave room for progress updates. Do not spawn sleep or shell polling
  processes, relaunch a slow job, or treat a running job as a failed one.

A run counts as completed only when its wrapper exits successfully and its new, nonempty answer
has been read and checked against the task. Save the printed session ID and log paths in the
task's status/report files. Failed runs can leave an older answer in place; that file is not a
successful result of the failed attempt. Inspect error logs before retrying. Use the active
platform's normal approval mechanism when execution requires access outside its permissions;
do not weaken the wrapper's restrictions to work around a denial.

Test commands use the same background/session facilities. The test selection policy remains in
`CLAUDE.md` and `TESTS.md`.
