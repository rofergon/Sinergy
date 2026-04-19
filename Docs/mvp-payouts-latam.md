# MVP Doc: Global Payroll Payouts for LatAm

## 1. One-line Summary

We are building infrastructure that helps global companies pay talent in Latin America without relying on expensive and operationally complex outsourcing or subcontracting structures.

## 2. Problem

Companies around the world increasingly hire contractors and distributed talent across Latin America. Today, many of them depend on outsourcing firms, Employer of Record structures, payroll intermediaries, or fragmented manual operations to move funds.

This creates four major problems:

- high operational cost
- slow payment cycles
- poor visibility into fees and FX
- little control over approvals, reconciliation, and exceptions

In practice, companies are not only paying people. They are also paying for complexity.

## 3. MVP Thesis

Instead of trying to replace the entire global payroll stack on day one, the MVP focuses on one painful workflow:

**allowing global companies to fund payouts in USDC and execute local payouts to talent in LatAm with approval controls, tracking, and reconciliation.**

The goal is not to solve every country, every payout type, or every compliance edge case in v1.

The goal is to prove that cross-border payouts to LatAm talent can be:

- cheaper
- faster
- more transparent
- easier to operate

## 4. Target User

The initial user is a company outside Latin America that:

- hires contractors, freelancers, or remote teams in LatAm
- currently uses expensive intermediaries or fragmented finance ops
- needs batch payouts, auditability, and operational control

Primary internal users inside the client company:

- finance
- operations
- approvers
- compliance or risk reviewers

## 5. Core Value Proposition

Global companies need a simpler way to pay talent in LatAm.

This MVP gives them a single operational layer to:

- onboard beneficiaries
- upload and approve payout batches
- see quote and fees before execution
- fund in USDC
- reconcile funding
- track payout execution
- resolve exceptions from one place

## 6. Positioning

Do not present this as a generic cross-border payments platform.

Present it as:

**Infrastructure for global companies to pay talent in Latin America without depending on costly and opaque subcontracting or outsourcing layers.**

## 7. Why This Can Win

This concept is strong because it combines:

- a very real B2B pain point
- a clear wedge market
- operational depth beyond a simple wallet app
- a practical crypto rail with a business outcome people understand

The strongest differentiation is not just moving money. It is reducing operational friction around moving money.

## 8. MVP Scope

### Frontend

The frontend should be designed as an operations console, not just a dashboard.

Include:

- `Auth + Access Control`
- `Company Onboarding` basic
- `Beneficiary Management`
- `Batch Creation`
- `Quote Review`
- `Approval Workflow`
- `Funding Dashboard`
- `Payout Tracking`
- `Exception Inbox`
- `Reporting` basic

### Backend

Keep the backend focused on the transactional core.

Include:

- `Public API`
- `Auth / Identity`
- `Company / Account Service`
- `Beneficiary Service`
- `Corridor Registry`
- `Validation Engine`
- `Quote Engine`
- `Funding Engine`
- `Payout Orchestrator`
- `Partner Adapter Layer`
- `Ledger`
- `Webhook / Event Service`
- `Audit Logs`

## 9. What Not To Build In V1

To stay credible and shippable, explicitly leave out:

- multi-chain support
- advanced smart routing
- complex partner fallback logic
- cash pickup
- custom workflow builders
- highly configurable treasury automation
- broad country coverage from day one
- heavy ML or risk scoring systems

## 10. Best MVP Flow

The demo and product narrative should revolve around one clean workflow:

1. The company onboards and sets basic account details.
2. The company creates beneficiaries in LatAm.
3. The company uploads a payout batch.
4. The system validates beneficiary and payout data.
5. The system generates a quote showing fees, FX, and required funding.
6. An approver approves the batch.
7. The platform generates USDC funding instructions.
8. The company sends funds.
9. The system detects and reconciles funding.
10. The platform executes local payouts through the partner layer.
11. The team tracks status and resolves any failure from the Exception Inbox.

## 11. Product Differentiators

If you want the project to feel sharper and less generic, emphasize these three components:

### A. Exception Inbox

This is where operations teams resolve failed payouts, incomplete funding, expired quotes, callback mismatches, and manual review cases.

Why it matters:

- most payment systems break in the edges
- exception handling is where operational value becomes visible
- it makes the product feel real, not theoretical

### B. Corridor Registry

A structured layer that defines corridor-specific rules:

- country
- currency
- required fields
- payout methods
- limits
- quote TTL

Why it matters:

- prevents scattered country logic
- makes the system extensible
- gives credibility to the architecture

### C. Ledger + Reconciliation

An internal record of funding, reservations, fees, and payout state, independent from partner responses.

Why it matters:

- creates trust
- enables auditing
- avoids depending entirely on third-party status

## 12. Architecture Summary for One Slide

### Frontend Layer

An operations console for finance and ops teams to manage beneficiaries, batches, approvals, funding, tracking, and exceptions.

### Core Backend Layer

A transactional engine that validates payouts, produces quotes, reconciles funding, routes execution, records ledger movements, and emits status events.

### Integration Layer

Partner adapters that standardize external payout providers and isolate provider-specific complexity.

### Trust Layer

Ledger, audit logs, and reconciliation to guarantee traceability and operational control.

## 13. 30-Second Pitch

Global companies hiring talent in Latin America often rely on expensive outsourcing or subcontracting structures just to move money. We are building a payout infrastructure that lets them fund in USDC, approve payment batches, execute local payouts, and track everything end to end from one operational console. The MVP focuses on making recurring payments to LatAm talent faster, cheaper, and more transparent, while giving finance teams the controls they need around approvals, reconciliation, and exception handling.

## 14. 60-Second Pitch

Companies around the world are hiring more talent in Latin America, but paying those teams is still painful. Many rely on outsourcing firms, payroll intermediaries, or manual finance operations that are slow, expensive, and opaque.

Our MVP is a payout infrastructure designed specifically for this use case. A company can onboard beneficiaries, upload a batch of payments, get a quote, approve it, fund in USDC, and then execute local payouts to talent in LatAm. On the backend, the platform validates data, reconciles funding, routes payouts through partner integrations, and records everything in a ledger with auditability.

What makes the product different is that it does not stop at moving money. It gives finance and operations teams an Exception Inbox, approval workflows, and reconciliation tools so they can actually run this process at scale with less cost and more visibility.

## 15. Demo Script for 5 Minutes

### Part 1: Set the problem

Explain that global companies hiring in LatAm often pay too much in intermediary fees and still lack visibility and control.

### Part 2: Show beneficiary and batch creation

Walk through:

- creating a beneficiary
- uploading a payout batch
- seeing validations

### Part 3: Show quote and approval

Walk through:

- quote per batch
- fees and expected payout amount
- approval workflow with audit trail

### Part 4: Show funding

Walk through:

- funding instructions in USDC
- detected deposit
- reconciled amount

### Part 5: Show execution and tracking

Walk through:

- payout progressing through statuses
- final paid state for successful items
- one failed item routed into Exception Inbox

### Part 6: Close with the business value

Explain that the product reduces dependence on expensive outsourcing layers while giving finance teams direct control over a process that is usually fragmented and opaque.

## 16. Suggested Judging Narrative

If you are presenting to judges, keep the story simple:

1. Global hiring in LatAm is growing.
2. The current payment stack is too expensive and too manual.
3. We are removing operational complexity, not just adding another wallet.
4. The MVP proves a realistic workflow from funding to payout to reconciliation.

## 17. Final Recommendation

If you want this to feel like a winner, optimize for focus:

- one initial corridor or a small corridor set
- one strong payout use case
- one clean end-to-end demo
- one clear story about reducing outsourcing complexity

The more clearly you show control, traceability, and operational efficiency, the stronger the project will feel.
