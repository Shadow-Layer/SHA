# Traycer Documentation Governance

Version: 1.0

Status: MANDATORY

This document governs every modification to documentation.

Documentation is considered project history.

History is an asset.

Destroying history is prohibited.

---

# Primary Rule

Documentation must evolve.

Documentation must never be replaced.

Preserve history.

Append knowledge.

Correct inaccuracies.

Recover missing information.

Never overwrite documentation.

---

# Documentation Philosophy

Every document represents accumulated project knowledge.

The objective is to preserve, improve and extend knowledge.

Never regenerate documentation from scratch simply because it is easier.

---

# Forbidden Actions

Agents must NEVER

• Replace an existing document

• Delete historical information without justification

• Rewrite an entire document for a small change

• Remove changelog entries

• Remove historical decisions

• Remove architectural rationale

• Remove migration history

• Remove release notes

• Replace documentation with generated summaries

• Discard useful information

---

# Required Behaviour

When updating documentation

Always

Read entire document

Understand existing structure

Preserve formatting

Preserve history

Preserve rationale

Preserve previous versions

Amend inaccuracies

Append new knowledge

Merge duplicated information

Never regenerate.

---

# Documentation Update Strategy

Step 1

Inspect documentation.

Step 2

Determine

What is correct

What is outdated

What is missing

What conflicts

---

Step 3

Correct inaccuracies.

Do not delete historical context.

Mark superseded information where appropriate.

---

Step 4

Append new knowledge.

Integrate naturally.

Maintain document structure.

---

Step 5

Verify consistency with

Repository

Architecture

Implementation

Business Rules

Other documentation

---

# Changelog Policy

CHANGELOG.md is immutable history.

It may only be

Appended

Corrected

Recovered

Cross-referenced

Never replaced.

Never regenerated.

Never reordered.

---

# Missing History Recovery

If documentation appears incomplete

The agent MUST attempt recovery.

Recovery sources include

Git history

Git commits

Git tags

Release branches

Historical documentation

Archived documentation

Repository history

Recovered information must be clearly identified.

---

# Git Recovery Rules

Before assuming information is lost

Inspect

git log

git blame

git diff

git show

git reflog (where appropriate)

Historical branches

Tags

Previous releases

Recover documentation whenever possible.

---

# Amendments

Incorrect information

↓

Correct

Incomplete information

↓

Append

Missing information

↓

Recover

Duplicate information

↓

Merge

Conflicting information

↓

Investigate

Never overwrite.

---

# Documentation Merge Rules

When two documents overlap

Do not delete one immediately.

Determine

Authoritative source

Missing information

Conflicting information

Merge useful information

Deprecate obsolete documents

Maintain redirects where appropriate.

---

# Repository-Wide Consistency

Documentation changes must preserve consistency across

README

Architecture

API docs

Developer guides

Deployment guides

Release notes

Migration guides

CHANGELOG

ADR documents

Specifications

User documentation

---

# Automatic Validation

Before completing documentation updates verify

✓ Existing content preserved

✓ New information appended

✓ No history lost

✓ No accidental overwrite

✓ No deleted rationale

✓ No deleted changelog entries

✓ Repository consistency maintained

---

# Failure Conditions

STOP immediately if

Existing documentation cannot be read

Merge conflict exists

History appears missing

Git history unavailable

Conflicting documentation exists

Return control to Traycer.

---

# Definition of Done

Documentation work is complete only if

History preserved

Knowledge expanded

Inaccuracies corrected

Missing information recovered

Repository consistent

No existing information destroyed

No overwrite occurred

Documentation becomes strictly more complete than before.
