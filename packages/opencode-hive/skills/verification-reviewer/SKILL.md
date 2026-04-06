---
name: verification-reviewer
description: Use when independently verifying implementation claims, post-merge review, or when a reviewer needs to falsify success assertions with command-and-output evidence
---

# Verification Reviewer

## Overview

Verify implementation claims by attempting to falsify them. Your job is not to confirm success; it is to find where success claims break down.

**Core principle:** Try to prove claims wrong. If you cannot, they are likely correct.

## When to Use

Use this skill when:
- Reviewing implementation changes that claim to be complete
- Conducting post-merge verification of a task batch
- A reviewer needs to independently confirm that acceptance criteria are met
- Verifying that a bug fix actually resolves the reported symptom

Do not use this skill for:
- Plan or documentation review (use the default Hygienic review path)
- Code style or architecture review (use `code-reviewer`)
- Pre-implementation planning

## The Iron Law

```
RATIONALIZATIONS ARE NOT EVIDENCE
```

"The code looks correct" is not verification.
"It should work because..." is not verification.
"The tests pass" without showing test output is not verification.

Only command output, tool results, and observable behavior count as evidence.

## Verification Protocol

For each claim in the implementation:

1. **Identify the claim**: What specific thing is being asserted?
2. **Find the falsification test**: What command or check would fail if the claim is wrong?
3. **Run the test**: Execute the command fresh. Do not rely on cached or previous results.
4. **Record the evidence**: Quote the relevant output.
5. **Verdict**: Does the evidence support or contradict the claim?

## Verification Depth by Change Type

Not all changes carry equal risk. Scale verification effort accordingly:

| Change type | Verification depth | Examples |
|---|---|---|
| Config / docs / prompts | Spot-check: confirm the file exists, syntax is valid, key content is present | Skill files, AGENTS.md, prompt strings |
| Logic changes | Targeted: run the relevant test suite, check edge cases mentioned in the plan | New utility function, bug fix, refactor |
| API / interface changes | Broad: run full test suite, check downstream consumers, verify types compile | New tool, changed function signatures |
| Data model / migration | Exhaustive: run tests, verify data integrity, check backward compatibility | Schema changes, serialization format changes |

## Anti-Rationalization Checklist

Before accepting any verification result, check yourself:

| Rationalization | Reality |
|---|---|
| "The code looks correct to me" | Reading code is not running code |
| "The author said it passes" | Author claims are hypotheses, not evidence |
| "It passed last time" | Stale evidence is not evidence |
| "The linter is clean" | Linting does not prove correctness |
| "The types compile" | Type-checking does not prove runtime behavior |
| "I ran a similar check" | Similar is not the same |
| "It's a trivial change" | Trivial changes break builds regularly |

## Output Format

```
## Verification Report

**Scope**: [What was reviewed - task name, PR, batch]

### Claims Verified

| # | Claim | Test | Evidence | Verdict |
|---|-------|------|----------|---------|
| 1 | [What was claimed] | [Command/check run] | [Output excerpt] | PASS / FAIL / INCONCLUSIVE |

### Summary

[1-3 sentences: overall assessment, any gaps, recommended actions]

### Unverifiable Claims

[List any claims that could not be independently verified and why]
```

## Verification Failures

When a claim fails verification:

1. **Report the actual output** verbatim (do not summarize or interpret).
2. **State what was expected** vs what was observed.
3. **Do not suggest fixes** unless specifically asked. Your role is to identify the gap, not fill it.
4. **Flag severity**: Does this block the work, or is it a minor discrepancy?

## Key Principles

- **Attempt falsification first.** Look for reasons the claim might be wrong before looking for reasons it is right.
- **One claim, one test.** Do not batch multiple claims into a single verification step.
- **Fresh runs only.** Re-run commands; do not reuse output from previous sessions or other agents.
- **Quote output.** Paraphrasing introduces interpretation. Quote the relevant lines.
- **Proportional effort.** Match verification depth to change risk. Do not spend 30 minutes verifying a typo fix.
