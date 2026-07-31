# Traycer Mandatory Execution Lifecycle

Version: 1.0

Status: REQUIRED

This document defines the mandatory execution lifecycle for every request processed by Traycer.

Every agent must follow this workflow.

No agent may skip, reorder, or bypass any phase unless explicitly instructed by Traycer after user approval.

---

# Core Philosophy

Traycer is an orchestration system.

Agents do not make product decisions.

Agents do not redefine requirements.

Agents execute a deterministic software delivery workflow.

Every implementation begins with understanding.

Every implementation ends with independent verification.

---

# Mandatory Lifecycle

Every request follows this exact lifecycle.

User Request
↓
Repository Discovery
↓
Specification
↓
Traycer Verification
↓
User Approval
↓
Planning
↓
Implementation
↓
Review
↓
Verification
↓
Completion Report

Skipping phases is prohibited.

---

# Phase 1

Repository Discovery

Purpose

Understand the repository before making decisions.

Activities

- inspect repository
- inspect documentation
- inspect architecture
- inspect dependencies
- inspect workflows
- inspect configuration
- identify affected components
- identify existing behaviour

Output

Repository Assessment

---

# Phase 2

Specification

Purpose

Produce a complete production-grade specification.

Activities

- define problem
- define requirements
- define architecture
- define risks
- define implementation scope
- define acceptance criteria

Output

Approved Specification Draft

---

# Phase 3

Traycer Verification

Purpose

Validate the specification before presenting it to the user.

Checklist

✓ repository inspected

✓ architecture consistent

✓ requirements complete

✓ no contradictions

✓ no ambiguity

✓ acceptance criteria complete

✓ implementation scope complete

If verification fails

Return to Specification.

---

# Phase 4

User Approval

Purpose

The user approves the specification.

Implementation is blocked until approval.

Possible outcomes

Approved

Changes Requested

Rejected

If not approved

Return to Specification.

---

# Phase 5

Planning

Purpose

Convert the specification into deterministic implementation work.

Activities

- dependency analysis
- work packages
- execution order
- validation checkpoints
- rollback planning

Output

Execution Plan

---

# Phase 6

Implementation

Purpose

Implement only the approved execution plan.

Rules

Only modify approved files.

Do not invent requirements.

Do not expand scope.

Do not redesign architecture.

Output

Completed Implementation

---

# Phase 7

Review

Purpose

Perform an independent engineering review.

Review

Correctness

Architecture

Business Rules

Documentation

Testing

Repository Standards

Output

Review Report

---

# Phase 8

Verification

Purpose

Final independent quality assurance.

Verify

Requirements

Acceptance Criteria

Regression

Production Readiness

Output

Verification Report

---

# Phase 9

Completion

Purpose

Deliver final implementation.

Deliver

Implementation Summary

Review Summary

Verification Summary

Remaining Risks

Recommendations

---

# Global Rules

Every agent must obey these rules.

Rule 1

Never skip phases.

---

Rule 2

Never implement before specification approval.

---

Rule 3

Never invent requirements.

---

Rule 4

Never modify files outside the approved scope.

---

Rule 5

Every requirement must be traceable to the approved specification.

---

Rule 6

Every code change must satisfy one or more approved requirements.

---

Rule 7

Every implementation must pass review.

---

Rule 8

Every implementation must pass verification.

---

Rule 9

Every completed task must update project documentation when required by the approved execution plan.

---

Rule 10

If uncertainty exists

STOP

Return to the previous lifecycle phase.

---

Rule 11

Tool failures are recoverable.

If a required tool fails

retry

attempt automatic correction

delegate to an approved fallback agent

Only request user intervention after all approved fallback mechanisms have been exhausted.

---


# Completion Conditions

A request is complete only if

✓ Repository inspected

✓ Specification approved

✓ Planning completed

✓ Implementation completed

✓ Review passed

✓ Verification passed

✓ Acceptance criteria satisfied

✓ Documentation updated

✓ Final report produced

Otherwise

The lifecycle is incomplete.

Return to the appropriate phase.

---

# Workflow Guarantee

Traycer guarantees that every implementation follows a deterministic, repeatable, enterprise-grade software delivery process.

The approved Specification is the single source of truth.

The approved Execution Plan is the only implementation roadmap.

Independent Review validates engineering quality.

Independent Verification validates production readiness.

No implementation is considered complete until every lifecycle phase has successfully completed.
