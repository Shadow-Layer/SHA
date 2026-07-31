# Traycer Workflow

Version: 1.0

Status: MANDATORY

This workflow defines how every engineering request is executed.

Every delegated agent must follow this workflow before performing any work.

This workflow is authoritative.

If another instruction conflicts with this workflow, stop and return control to Traycer.

---

# Mission

Deliver deterministic, production-grade engineering through structured execution.

Every request must follow the same repeatable workflow.

No shortcuts.

No skipped phases.

No implementation before understanding.

---

# Workflow Principles

Always

• Understand before changing
• Inspect before deciding
• Verify before completing
• Preserve existing work
• Minimise unnecessary changes
• Produce deterministic results
• Keep documentation synchronized
• Maintain repository integrity

Never

• Guess
• Invent requirements
• Skip verification
• Rewrite documentation unnecessarily
• Overwrite historical records
• Expand scope
• Ignore failures

---

# Mandatory Lifecycle

Every request MUST follow this sequence.

```
User Request
        │
        ▼
Repository Discovery
        │
        ▼
Specification
        │
        ▼
Traycer Verification
        │
        ▼
User Approval
        │
        ▼
Planning
        │
        ▼
Implementation
        │
        ▼
Review
        │
        ▼
Verification
        │
        ▼
Documentation Update
        │
        ▼
Completion Report
```

Implementation before Specification is prohibited.

---

# Repository Discovery

Before making decisions

Inspect

Repository structure

Architecture

Existing documentation

Configuration

Dependencies

Build system

Testing

Infrastructure

Relevant source files

Never assume repository structure.

---

# Specification

Produce a complete production-grade specification.

The specification must include

Problem Definition

Current State

Desired State

Requirements

Architecture

Implementation Scope

Risks

Acceptance Criteria

Validation

No implementation occurs during this phase.

---

# Traycer Verification

Traycer verifies

Repository alignment

Requirement completeness

Architecture consistency

Acceptance criteria

Scope

If verification fails

Return to Specification.

---

# User Approval

Present the specification.

Wait for explicit approval.

If approval is not received

Return to Specification.

Implementation is blocked.

---

# Planning

Generate

Execution roadmap

Dependency graph

Work packages

Validation plan

Rollback plan

Every implementation task must originate from the execution plan.

---

# Implementation

Implement only approved work packages.

Allowed

Approved implementation

Required tests

Required documentation

Required fixes

Forbidden

Feature creep

Architecture redesign

Unapproved refactoring

Documentation regeneration

Unapproved dependency changes

---

# Review

Perform an independent engineering review.

Compare implementation against

Approved specification

Execution plan

Acceptance criteria

Repository standards

Do not review against assumptions.

---

# Verification

Verify

Requirements

Acceptance criteria

Regression

Documentation

Production readiness

Business rules

Deployment readiness

No implementation is complete until verification passes.

---

# Documentation Workflow

Before modifying documentation

Read the entire document.

Understand its purpose.

Inspect related documents.

Determine

Correct information

Outdated information

Missing information

Conflicts

Then

Correct inaccuracies.

Append new knowledge.

Recover missing history.

Merge duplicated information.

Never regenerate an existing document.

Never overwrite historical information.

---

# Documentation Preservation

Documentation is cumulative.

Historical knowledge is valuable.

Agents must preserve

Design decisions

Architecture rationale

Release history

Migration history

Change logs

Implementation notes

Repository knowledge

When information appears missing

Attempt recovery from

Git history

Previous commits

Branches

Tags

Historical documentation

Only after recovery should documentation be updated.

---

# Tool Failure Recovery

Tool failures are recoverable.

If a tool fails

Retry safely.

Attempt automatic correction.

Delegate to an approved fallback agent.

Continue execution whenever possible.

Only request user intervention after all recovery options have failed.

---

# Validation Checklist

Before completion verify

✓ Repository inspected

✓ Specification approved

✓ Planning completed

✓ Implementation completed

✓ Review passed

✓ Verification passed

✓ Documentation updated

✓ Changelog updated

✓ Acceptance criteria satisfied

✓ No unintended changes

✓ No overwritten documentation

✓ No unresolved blockers

---

# Failure Handling

Return to the previous lifecycle phase if

Requirements change

Repository assumptions fail

Unexpected architecture discovered

Documentation conflicts exist

Implementation exceeds scope

Verification fails

Tool recovery fails

Never continue with unresolved issues.

---

# Completion Report

Every completed request must include

Summary

Requirements completed

Files modified

Files created

Files removed

Documentation updated

Tests performed

Verification results

Known limitations

Recommendations

Outstanding work

---

# Definition of Done

A request is complete only if

The repository has been inspected.

The specification has been approved.

Planning has been completed.

Implementation follows the approved plan.

Review passes.

Verification passes.

Documentation accurately reflects implementation.

Historical documentation has been preserved.

No acceptance criteria remain incomplete.

The repository is in a releasable state.

Otherwise

The workflow is incomplete.

Return to the appropriate lifecycle phase.

Never bypass the workflow.