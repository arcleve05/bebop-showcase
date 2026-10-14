# Quality engineering leadership — professional context

**Andrew R. Cleveland | Enterprise QA strategy, regulated delivery, hands-on automation**

This document provides professional context for the separately developed [Bebop personal engineering portfolio](../README.md). It is based on the accompanying resume, not on source code, internal metrics, or documents extracted from employers.

## Scope and scale

| Professional setting | Documented leadership and execution experience |
| --- | --- |
| Baxter International (formerly Hillrom), Apr 2021–present | Senior Engineering Manager, R&D. Leads 50+ globally distributed professionals across manual, automation, exploratory, performance, hardware, infrastructure and DevOps-related functions supporting Voalte Nurse Call. |
| First Citizens Bank, Apr 2015–Apr 2021 | Managed a 15-person organization spanning automation, performance engineering and test-data management. Built enterprise automation frameworks and helped establish structured UAT for teller and digital banking applications. |
| Orasi Software, Sep 2009–Apr 2015 | Managed consulting engagements, quality strategy and enterprise application testing across Fortune 500 customers. |

## Practices relevant to regulated financial services

**Quality governance and evidence:** Documented test strategy, acceptance criteria, coverage metrics, requirement traceability, defect disposition and objective evidence supporting release decisions in a Class II medical-device context; previous banking experience spans test data masking, application integration validation and UAT.

**Hands-on automation:** Personally implemented frameworks with Selenium, Playwright and UFT across First Citizens Bank and Baxter/Hillrom. Experience includes UI/API testing, automation standards and CI/CD release gating. The resume does not establish direct Cypress production experience; Playwright and Selenium are closely related capabilities, not the same tool.

**Quality outcomes:** The resume reports up to **40% reduction in test-cycle time** and **85%+ automated first-run pass rates** following improvements to automation workflows and CI integration. These are professional outcomes, not verified by Bebop's public CI.

**People and operating model:** Globally distributed delivery across time zones; pooled automation specialist model designed to improve coverage and prioritize risk without proportional staffing growth.

**Incident and release decisions:** Risk-based incident triage, root-cause analysis, prevention follow-through and business-facing go/no-go recommendations; experience supporting structured bank integration acceptance.

## What the public Bebop examples demonstrate

- [Independent evaluation](../examples/evidence-grading/): a strict decision rule that refuses to hide critical failures in an aggregate score.
- [Dependency contracts](../examples/dependency-contract/): defensive parsing and negative-path tests for unambiguous work admission.
- [Live state](../examples/live-state-cache/): explicit degraded health and state visibility.
- [Execution bounds](../examples/lease-policy/): time-dependent policy tests and evidence-grounded worker progress.

The public examples are personal software artifacts, not proof of the historical banking/healthcare metrics above. The leadership examples and code samples are complementary, not the same work.

## Interview topics

How to build quality standards across manual and automated testing; how to define an evidence-based release gate; how to coordinate business acceptance and integration verification with customer-facing teams; how to prioritize risk for a distributed QA organization; and when to hold a release despite a high aggregate pass rate.
