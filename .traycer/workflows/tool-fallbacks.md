# Traycer Tool Fallback Workflow

Version: 1.0

Status: MANDATORY

This document defines mandatory fallback behaviour whenever a required tool
cannot successfully complete its assigned task.

Tool failures must never terminate the engineering workflow if a safe,
approved fallback exists.

---

# Philosophy

A tool failure is not a workflow failure.

Traycer must attempt recovery before abandoning execution.

Recovery should be automatic whenever possible.

---

# Tool Priority

Primary Tool

↓

Retry

↓

Alternative Tool

↓

Delegated Agent

↓

User Intervention

Never skip directly to failure.

---

# Shell Execution

If a shell operation is required

attempt

Primary Shell

If successful

continue.

If unsuccessful

attempt recovery.

---

# Shell Recovery

Recoverable failures include

• Shell unavailable

• PowerShell parsing errors

• Terminal startup failure

• Invalid escaping

• Working directory issues

• Environment variable issues

• Tool timeout

• Permission prompts

• Unsupported shell syntax

---

# Mandatory Recovery

Retry once after correcting obvious command formatting.

Examples

Normalise paths

Quote file names

Escape shell characters

Convert path separators where appropriate

Correct working directory

Retry command

---

If recovery fails

delegate shell execution to the approved Shell Execution Agent.

Do not abandon the workflow.

---

# Shell Execution Agent

Responsibilities

Execute terminal commands

Correct shell syntax

Correct path escaping

Detect platform differences

Return

Executed command

Output

Errors

Exit code

Suggested corrections

The parent agent remains responsible for interpreting results.

---

# Parent Agent Rules

The parent agent must never fabricate shell output.

The parent agent must wait for delegated results.

The parent agent must not assume command success.

---

# Fallback Order

Primary Shell

↓

Retry

↓

Shell Execution Agent

↓

Alternative implementation

↓

User intervention

---

# Validation

After delegated execution verify

✓ Command completed

✓ Exit code checked

✓ Output reviewed

✓ Errors handled

✓ Expected result achieved

---

# Failure

Only request user assistance after

Primary shell failed

Retry failed

Delegated shell failed

Alternative execution unavailable

---

# Completion

A shell task is complete only if

Command executed

Result verified

Output interpreted

Workflow continues

Tool failure alone is never considered task failure.