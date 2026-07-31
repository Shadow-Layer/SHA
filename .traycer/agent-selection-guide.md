# Traycer Agent Selection
# Mandatory Governance

Before selecting any child agent, Traycer MUST:

1. Load engineering-principles.md
2. Load documentation-governance.md
3. Load mandatory-lifecycle.md
4. Load tool-fallbacks.md
5. Load traycer-workflow.md

These documents are authoritative.

If any instruction conflicts with them, follow the governance documents.
## Core Principle

Traycer is an orchestration system.

Traycer itself never performs implementation work.

Every significant task is delegated to one or more specialised Kilo Code Free agents.

No agent may skip or reorder the mandatory execution workflow.

---

# Mandatory Lifecycle

Every request MUST follow this sequence.

User Request

↓

Specification Agent

↓

Traycer Internal Verification

↓

User Specification Approval

↓

Planning Agent

↓

Implementation Agent(s)

↓

Review Agent

↓

Verification Agent

↓

Completion Report

No phase may be skipped.

No implementation may begin before the Specification phase has completed and the user has approved it.

---

# Agent Selection

## Specification

Delegate to

```
.traycer/skills/traycer-specification.md
```
 

Purpose

Create a complete production-grade specification.

---

## Planning

Delegate to

```
.traycer/skills/traycer-planning.md
```
 

Purpose

Generate the execution roadmap.

---

## Implementation

Delegate to

```
.traycer/skills/traycer-implement.md
```
 

Purpose

Implement ONLY what exists inside the approved specification.

---

## Review

Delegate to

```
.traycer/skills/traycer-review.md
```


Purpose

Review implementation against the specification.

---

## Verification

Delegate to

```
.traycer/skills/traycer-verification.md
```
 

Purpose

Verify implementation correctness.

---

# Mandatory Rules

Rule 1

Every request starts with Specification.

Never implement first.

---

Rule 2

Implementation Agents are forbidden from inventing requirements.

If requirements are missing

return to Specification.

---

Rule 3

Planning cannot begin until

• Specification passes Traycer Verification

AND

• User explicitly approves it.

---

Rule 4

Implementation must strictly follow the approved specification.

No feature creep.

No interpretation.

No assumption.

---

Rule 5

Review compares implementation to specification.

Not to user prompts.

---

Rule 6

Verification validates

• functionality

• architecture

• documentation

• testing

• acceptance criteria

---

Rule 7

Completion is reached only when every acceptance criterion has passed.

---

# Failure Recovery

If any phase fails

return to the previous phase.

Never continue with unresolved issues.

Examples

Specification fails

↓

Specification Agent

Implementation fails

↓

Implementation Agent

Verification fails

↓

Implementation Agent

Review fails

↓

Implementation Agent

---

# Source of Truth

The approved Specification is the single source of truth.

Every subsequent phase must use it.

The original user request is never interpreted again after specification approval.

---

# Workflow Guarantee

Traycer guarantees that every implementation follows

Specification

↓

Verification

↓

Approval

↓

Planning

↓

Implementation

↓

Review

↓

Verification

↓

Completion

No exceptions.