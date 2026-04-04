# School ERP Frontend - Initial QA Test Strategy (UI)

## 1. Document Control
- Version: 1.0
- Date: 2026-03-24
- Prepared by: QA (UI Automation + Manual)
- Application: SchoolManagement_FrontEnd (Angular)
- Purpose: Define initial QA approach before writing full Selenium automation

## 2. Project Snapshot (From Codebase Analysis)
- Technology: Angular 19 standalone components
- Approx size: 210 files under `src`
- Admin module components detected: 41
- Functional domains: Masters, AcademicModule, Attendance, Exam, Finance, TimeTable, Transportation, Dashboard, Authentication
- Routing style: large route table with Admin routes, OtherSidebar routes, and dynamic school routes (`/:schoolName/...`) with `schoolGuard`
- API interaction density: ~89 API calls (`get/post/put/delete`) across components
- UI pattern: form-heavy screens, CRUD, tables, modals, role-aware rendering, server-dependent dropdown chains

## 3. Test Objectives
- Validate business-critical UI flows for correctness, stability, and regression safety.
- Ensure role-based navigation and access behavior are correct.
- Verify form validations, table behaviors, pagination, modal interactions, and success/error messaging.
- Build a maintainable automation suite (Selenium + Java + TestNG + Maven) focused on high-value regression.

## 4. Scope
### In Scope (Phase 1)
- UI Functional testing only (no direct DB validation)
- Browser-based workflows for:
  - Login and role entry
  - Navigation and route access
  - Masters core forms (representative)
  - Exam workflows (priority)
  - Attendance and Finance smoke paths
- Form validation checks (required/min/max/format)
- Table and pagination behavior
- Modal popup behavior and status messages
- Role-based element visibility for Admin vs School-level user (as available)

### Out of Scope (Initial Phase)
- Performance/load testing
- Security penetration testing
- API contract testing in isolation
- Deep accessibility audit (can be planned in later phase)
- Mobile app/native testing

## 5. Risk-Based Priority Model
### P0 (Automate first)
- Login and role routing
- Exam module: `SetExam`, `ExamAttendece`, `ExamMarks`, `ExamResults`, `ViewExams`
- Critical save/update journeys with success/error modals

### P1
- AttendanceSheet, ViewAttendance, AttendanceSettings
- FeeCategory/FeeAllocation/FeeCollection key happy + validation paths

### P2
- Remaining CRUD screens in Masters, Transportation, TimeTable

## 6. Initial Test Approach
### 6.1 Manual First, Automation Next
- Step 1: Manual smoke walkthrough for each prioritized module
- Step 2: Freeze stable locators and test data
- Step 3: Build Selenium scripts for P0 smoke + core validations
- Step 4: Expand to P1 regression

### 6.2 Test Design Techniques
- Equivalence partitioning (valid/invalid inputs)
- Boundary value analysis (e.g., marks 0, max, max+1, negative)
- Decision table (role vs available actions)
- State transition (add mode/view mode/update mode)

## 7. Environment & Tools
- Frontend URL: `http://localhost:4200` (or deployed QA URL)
- Backend URL (as code indicates): `https://localhost:7067/api/SchoolManagement`
- Browsers for UI validation:
  - Chrome (primary)
  - Edge (secondary)
- Automation stack:
  - Selenium WebDriver
  - Java
  - TestNG
  - Maven
- Reporting:
  - TestNG default + ExtentReports (recommended)
  - Screenshots on failure

## 8. Test Data Strategy
- Create dedicated QA accounts:
  - Admin role (`RollID=1` equivalent behavior)
  - School user role (non-admin)
- Seed data sets for Exam flows:
  - Different classes/divisions/subjects
  - Students with attendance marked and absent states
  - Exams with varying max marks values
- Maintain reusable test data sheet with IDs and expected outcomes.

## 9. Entry and Exit Criteria
### Entry Criteria
- Build deployable and accessible
- Login credentials available
- Minimum test data seeded
- Stable environment and API reachability
- Signed scope for P0/P1

### Exit Criteria (Phase 1)
- 100% execution of P0 scenarios
- No open Critical/High defects in P0 flows
- Automation suite for P0 integrated in Maven execution
- Daily execution report published

## 10. Defect Management
- Defect fields: Module, Summary, Steps, Expected, Actual, Severity, Priority, Screenshots/Video, Build version
- Severity model:
  - Critical: blocker, app crash, data corruption
  - High: key workflow broken
  - Medium: partial functional issue
  - Low: cosmetic/minor usability
- Re-test + regression mandatory for all fixed P0 defects

## 11. Initial Coverage Map (High-Level)
- Authentication: sign-in, captcha handling, session-based redirect
- Routing: Admin routes, dynamic school routes, guarded access
- Common UI controls: dropdowns, date fields, inputs, tables, pagination, modals
- Exam module deep coverage in first wave

## 12. ExamMarks Component - Targeted Initial Scenarios
Based on `exammarks.component.html` and linked behavior:
- Marks input visible only when attendance marked = present
- "Absent" label when attendance marked = absent
- Marks validation messages:
  - required
  - min (no negative)
  - max (cannot exceed `maxMarks`)
- Submit button appears in add mode
- Update button appears in view mode
- Success/error modal behavior and close/OK actions
- No data state (`studentsList.length === 0`)
- Pagination controls and boundary behavior (first/prev/next/last)

## 13. Deliverables (Initial Documentation Pack)
1. Initial QA Test Strategy (this document)
2. Module-level Test Plan (next document)
3. Test Scenario catalog
4. Detailed test cases
5. RTM
6. Defect log template
7. Automation execution report template

## 14. Assumptions and Dependencies
- Backend contracts are stable during first automation sprint.
- UI text/locators may change; stable `data-testid` attributes are currently limited.
- Environment supports required data setup for exam modules.

## 15. Immediate Next Actions
1. Finalize Module Test Plan for Exam module (Document 2)
2. Create Test Scenario sheet for ExamMarks and related pages
3. Draft first 20 P0 test cases (manual)
4. Start Selenium framework structure if not already prepared
5. Automate P0 smoke and validation flows
