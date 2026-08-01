# Epic Brief — Student Housing Archive (SHA)

## Summary

Student Housing Archive (SHA) is a community-driven housing marketplace and forum built for university students in Mutare, Zimbabwe. It gives students a trusted, transparent place to discover accommodation, read peer reviews, and apply for housing — while cutting out exploitative agents and reducing scams through transparency and community verification. Landlords benefit equally: they get direct access to a qualified student audience without paying agent fees or dealing with middlemen. Messaging between landlord and student is **gated**: an **in-app inbox** thread is created only after a landlord accepts an application (async messaging in MVP; real-time chat is v1.1+). The platform is built around a living archive of housing data that grows more valuable over time as students verify listings, share experiences, and discuss everything from rent prices to landlord behaviour. SHA launches as a web platform (Next.js + MongoDB, deployed on Vercel) with a 3-week build window, targeting a "coming soon" state at launch while data collection runs in parallel.

---

## Context & Problem

### Who is affected

- **Students** searching for accommodation every semester in Mutare (Africa University, MSU, and other institutions). They currently rely on word-of-mouth, Facebook groups, or housing agents — all of which are unreliable, opaque, or expensive.
- **Landlords** renting to students who lose money to agent delays, miscommunication, and poor tenant matching.

### The pain


| Pain                                                                         | Who feels it |
| ---------------------------------------------------------------------------- | ------------ |
| Agent fees charged just to view a room                                       | Students     |
| Fake or misleading listings with no accountability                           | Students     |
| No way to know landlord rules, personality, or reliability before committing | Students     |
| Empty rooms due to poor reach and agent dependency                           | Landlords    |
| No way to screen tenants or set preferences before they arrive               | Landlords    |
| No shared memory — every semester students start from zero                   | Both         |


### Why now

There is no student-specific housing platform serving Mutare. The gap is real, the demand is proven (students actively seek housing info in WhatsApp groups), and the community trust required to make it work can only be built by starting early and accumulating verified data over time.

---

## Goals

1. Launch a publicly browsable listing directory with a "coming soon" state that invites early data contribution.
2. Enable landlords to self-register properties and receive student applications directly.
3. Support open registration with a **Verified Student** badge for approved university email domains (**.ac.zw** and **@africau.edu**).
4. Build a community verification layer so listings earn trust through student confirmation over time.
5. Provide an authenticated forum tied to real entities (houses, landlords, locations, services) — not a generic chat board.
6. Establish SHA as the go-to housing intelligence resource for Mutare students before expanding to other towns.

---

## Constraints

- **3-week build window** — scope is fixed; no new features after Day 2 of development.
- **No preloaded data at launch** — platform launches in "coming soon" mode; listings are collected post-launch.
- **No maps, AI (SHASA), payments, or real-time chat** in MVP — these are explicitly post-MVP (MVP uses **async in-app inbox messaging** after application acceptance; real-time chat is v1.1+).
- **Vercel free tier** — deployment must stay within free tier limits.

&nbsp;