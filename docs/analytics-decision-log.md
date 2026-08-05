# Analytics Decision Log v1.0

**Document Status:** `GATE 1.5 — BUSINESS DECISION FREEZE`  
**Baseline Document:** `Phase 3.8C – Analytics Engine Architecture Proposal (Revision 2.1 Final)`  
**Scope:** Formal Business Decision Log for CMMS Analytics Engine  
**Purpose:** Freeze every pending business decision requiring User review prior to Phase 3.8C Gate 2 implementation.

---

## 1. Executive Summary & Guidelines

The **Analytics Decision Log v1.0** serves as the authoritative, frozen business contract for Phase 3.8C Analytics Engine. Derived strictly from Section 32 (`USER REVIEW REQUIRED`) of the conditionally approved architecture proposal (Revision 2.1 Final), this log enumerates all **58 business decision items** across 10 functional domains.

### Guidelines for Decision Freeze:
1. **No Code / No Architecture Modification:** This log does not alter any technical design, metric contract, API, or data quality rule established in Gate 1.
2. **Standardized Decision Format:** Every item specifies `Decision ID`, `Category`, `Decision Question`, `Current Architecture Proposal`, `Available Options`, `Recommendation`, `User Decision` (`TBD`), `Status` (`Pending User Approval`), and `Implementation Impact`.
3. **Fail-Closed Default Policy:** Until an item is explicitly approved by the User, the system strictly enforces the safe fallback specified in the architecture proposal (e.g. `status = 'N/A'`, `status = 'ESTIMATED'`, or **HTTP 403 Forbidden**).

---

## 2. Decision Log Registry

### 2.1. Work Order & Maintenance Request Policy

#### DEC-001: WorkOrder `requestId` Unique Constraint Policy
- **Category:** Schema & Relation Policy
- **Decision Question:** Should a single Maintenance Request be allowed to generate multiple Work Orders in future phases, or remains strictly 1-to-1?
- **Current Architecture Proposal:** Currently enforced as 1-to-1 database cardinality via `@unique` constraint on `WorkOrder.requestId`.
- **Available Options:**
  - **Option A:** Retain `@unique` on `requestId` (Strict 1-to-1: Each Request creates exactly 1 Work Order).
  - **Option B:** Remove `@unique` constraint in future schema migration (Allow 1 Request to spawn multiple Work Orders, e.g. multi-equipment or multi-phase WOs).
- **Recommendation:**
  - *Option A Pros:* Strong relation integrity, simplifies scope navigation (`request.department`).
  - *Option B Pros:* Supports complex multi-stage maintenance scenarios.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Data Quality `RELATION_INTEGRITY_ANOMALY` checks, Future Prisma schema migration planning.

#### DEC-002: WorkOrder `@unique` Constraint Retention Timing
- **Category:** Schema & Migration Policy
- **Decision Question:** Should `@unique` constraint on `WorkOrder.requestId` be retained in the schema until a full multi-WO migration is designed?
- **Current Architecture Proposal:** Retain `@unique` in Phase 3.8C baseline; evaluate removal only in post-3.8C migrations.
- **Available Options:**
  - **Option A:** Freeze `@unique` constraint as permanent business rule.
  - **Option B:** Schedule constraint removal for Phase 3.9 / 4.0 schema migration.
- **Recommendation:** Option A for current baseline; re-evaluate if business workflows require multi-WO requests.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `WorkOrder` relation validation in Aggregation Engine.

#### DEC-003: Failure Incident Workflow Classification
- **Category:** Failure Definition
- **Decision Question:** How is a Failure Incident strictly defined for `FAIL_COUNT` and `FAIL_FREQUENCY`?
- **Current Architecture Proposal:** Failure Incident = `WorkOrder` with `requestId != null` (Corrective origin) AND `status IN (COMPLETED, VERIFIED, CLOSED)` AND valid `equipmentId` AND NOT cancelled/rejected.
- **Available Options:**
  - **Option A:** Strict workflow classification (Corrective origin + accepted completed status + active equipment).
  - **Option B:** Include open/in-progress Corrective Work Orders (`status IN (ASSIGNED, IN_PROGRESS)`).
  - **Option C:** Include all Maintenance Requests regardless of Work Order completion.
- **Recommendation:** Option A ensures data accuracy by excluding incomplete or unverified work.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `FAIL_COUNT`, `FAIL_FREQUENCY`, `FAIL_TOP_EQ` metric filters (Transition `status` from `ESTIMATED` to `OK`).

#### DEC-004: Cancelled / Rejected Work Order Treatment in Failure Analytics
- **Category:** Failure Policy
- **Decision Question:** Are Cancelled or Rejected Work Orders excluded from failure incident counts?
- **Current Architecture Proposal:** Exclude Cancelled (`status = CANCELLED`) and Rejected (`status = REJECTED`) Work Orders from all failure metrics.
- **Available Options:**
  - **Option A:** Exclude completely from failure counts.
  - **Option B:** Track under separate "Administrative Cancellation" metric.
- **Recommendation:** Option A prevents skewing operational reliability metrics with invalid requests.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `FailureAnalyticsService` DB query `where` clause.

#### DEC-005: Unclassified Work Order Treatment
- **Category:** Failure Policy
- **Decision Question:** Are Unclassified Work Orders (lacking both `requestId` and `scheduleId`) excluded from failure analytics or tracked under Data Quality warnings?
- **Current Architecture Proposal:** Exclude from failure metrics; report count under Data Quality `SCOPE_POPULATION_MISMATCH` or `BUSINESS_RULE_UNCONFIRMED` metadata warnings.
- **Available Options:**
  - **Option A:** Exclude from Failure metrics and log warning in metadata.
  - **Option B:** Include in total Work Order counts under `UNCLASSIFIED` ratio bucket.
- **Recommendation:** Option A maintains metric integrity while preserving visibility via metadata.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `DataQualityEngine` warning flags and `unclassifiedRatio` calculations.

---

### 2.2. Equipment Ownership & Scope Composition

#### DEC-006: Single vs Shared Equipment Department Ownership
- **Category:** Equipment Ownership
- **Decision Question:** Does an Equipment belong to a single department, or can it be shared across multiple departments?
- **Current Architecture Proposal:** `Equipment` model lacks direct `departmentId`. Currently scoped via `request.department` (Request-Origin department).
- **Available Options:**
  - **Option A:** Single primary department ownership (Add `Equipment.departmentId` FK in future schema).
  - **Option B:** Shared multi-department ownership (Add `EquipmentDepartment` relation table).
  - **Option C:** Request-Origin scope only (No equipment-level department column).
- **Recommendation:** Option A provides clean, unambiguous scope enforcement.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `Equipment` analytics scope filtering for `MANAGER` role.

#### DEC-007: Manager Equipment Scope Evaluation Path
- **Category:** Manager Scope
- **Decision Question:** Should a Manager view costs/failures based on Request origin department (`request.department`) or Equipment ownership?
- **Current Architecture Proposal:** Request origin department (`request.department = user.department`) for Work Orders. Equipment-level metrics without Request return `status = 'N/A'`.
- **Available Options:**
  - **Option A:** Request origin department (Filters WOs requested by manager's dept).
  - **Option B:** Equipment ownership department (Requires `Equipment.departmentId`).
- **Recommendation:** Option A for Phase 3.8C baseline; migrate to Option B once `Equipment.departmentId` is added.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `AnalyticsScopeService` query building for `MANAGER` role.

#### DEC-008: Preventive Maintenance Schedule Department Ownership
- **Category:** Department Ownership
- **Decision Question:** Which department owns a Preventive Maintenance Schedule (`MaintenanceSchedule`)?
- **Current Architecture Proposal:** `MaintenanceSchedule` lacks `departmentId`. Preventive WOs generated from schedules have `requestId = null`.
- **Available Options:**
  - **Option A:** Equipment's owning department (Requires `Equipment.departmentId`).
  - **Option B:** Add `MaintenanceSchedule.departmentId` FK.
  - **Option C:** Manager scope excludes Preventive WOs without Request (`status = 'N/A'`).
- **Recommendation:** Option B or Option A in post-3.8C schema update.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `MANAGER` role Preventive WO analytics.

#### DEC-009: Unassigned Equipment Manager Query Behavior
- **Category:** Manager Scope
- **Decision Question:** If an Equipment has no department ownership, should Manager queries return `value = null`, `status = 'N/A'`?
- **Current Architecture Proposal:** Return `value = null`, `status = 'N/A'`, `note = 'Equipment lacks department ownership scope'`.
- **Available Options:**
  - **Option A:** Safe default `value = null`, `status = 'N/A'`.
  - **Option B:** HTTP 403 Forbidden.
- **Recommendation:** Option A adheres to Metric Transparency guidelines.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `Manager` scope evaluation in `CostAnalyticsService` & `FailureAnalyticsService`.

#### DEC-010: OPERATOR Role Analytics Scope
- **Category:** Operator Scope
- **Decision Question:** How should the `OPERATOR` role be scoped for Analytics Engine APIs?
- **Current Architecture Proposal:** `OPERATOR` role receives **HTTP 403 Forbidden** for all Analytics Engine endpoints.
- **Available Options:**
  - **Option A:** Strict **HTTP 403 Forbidden** (Operators have no access to aggregate analytics).
  - **Option B:** Scoped access to own created requests/equipments (`request.requesterId = user.id`).
- **Recommendation:** Option A prevents unauthorized exposure of business intelligence data.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** NestJS `AnalyticsGuard` and `RoleMatrix`.

---

### 2.3. Technician Scope & Authorization Policy

#### DEC-011: Corrective WorkOrder Technician Assignment FK
- **Category:** Technician Scope
- **Decision Question:** How should Corrective Work Orders be assigned to Technicians by immutable ID in future schema migrations?
- **Current Architecture Proposal:** Add `WorkOrder.assignedTechnicianId` FK pointing to `User.id`. (In 3.8C, Corrective WOs use string `technicianName`, which is rejected for authorization, returning `status = 'N/A'`).
- **Available Options:**
  - **Option A:** Add `WorkOrder.assignedTechnicianId String? @db.Uuid` FK with foreign key relation to `User`.
  - **Option B:** Add `WorkOrderAssignment` multi-technician relation table.
- **Recommendation:** Option A for single-assignee model; Option B if multi-technician work orders are required.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `TECHNICIAN` role scope for Corrective WOs.

#### DEC-012: Technician Scope Boundary (Department vs Personal)
- **Category:** Technician Scope
- **Decision Question:** Is a Technician allowed to view aggregate analytics for their entire department, or strictly their own assigned Work Orders?
- **Current Architecture Proposal:** Strictly assigned Work Orders (`schedule.assignedTechnicianId = user.id`). Department-wide views are restricted to Managers/Admins.
- **Available Options:**
  - **Option A:** Strictly assigned Work Orders (Personal ID scope).
  - **Option B:** Department-wide Work Orders if Technician belongs to department.
- **Recommendation:** Option A enforces Least Privilege authorization.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `AnalyticsScopeService` `TECHNICIAN` scope filter.

#### DEC-013: Technician Cost Analytics Access
- **Category:** Authorization Policy
- **Decision Question:** Is a Technician allowed to view Cost Analytics?
- **Current Architecture Proposal:** **HTTP 403 Forbidden** (`FORBIDDEN (403)`).
- **Available Options:**
  - **Option A:** Strict **HTTP 403 Forbidden** (Technicians cannot view financial/cost data).
  - **Option B:** Allow viewing spare part quantities issued, but hide currency/financial values (`VND`).
  - **Option C:** Full access to cost analytics.
- **Recommendation:** Option B or Option A to protect sensitive cost metrics.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `CostAnalyticsService` role guards.

#### DEC-014: Technician Unassigned WorkOrder Viewing Access
- **Category:** Authorization Policy
- **Decision Question:** Is a Technician allowed to view Work Orders not assigned to them?
- **Current Architecture Proposal:** Forbidden in Analytics Engine queries.
- **Available Options:**
  - **Option A:** Strict isolation (Technician sees only assigned WOs).
  - **Option B:** Allow viewing unassigned WOs in queue (`assignedTechnicianId == null`).
- **Recommendation:** Option A for analytics calculations.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `Technician` scope `where` condition.

---

### 2.4. Cost Policy & Financial Composition

#### DEC-015: `WorkOrder.totalCost` Component Inclusion
- **Category:** Cost Composition
- **Decision Question:** What financial components are included in `WorkOrder.totalCost`?
- **Current Architecture Proposal:** Currently uses `WorkOrder.totalCost` as a single aggregate field (`status = ESTIMATED`, annotated with `BUSINESS_RULE_UNCONFIRMED`).
- **Available Options:**
  - **Option A:** `totalCost` includes Spare Parts + Labour + External Services.
  - **Option B:** `totalCost` includes Spare Parts only.
  - **Option C:** `totalCost` is a manual invoice total entered by manager.
- **Recommendation:** Option A is standard CMMS financial practice.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `COST_TOTAL` metric definition & breakdown logic.

#### DEC-016: Double Counting Prevention between WO Cost and Spare Part Transactions
- **Category:** Cost Policy
- **Decision Question:** Does `WorkOrder.totalCost` include Spare Part Cost? (Risk of double counting if `WorkOrder.totalCost` and `InventoryTransaction` issued values are summed in combined reports).
- **Current Architecture Proposal:** Keep `COST_TOTAL` (`WorkOrder.totalCost`) and `COST_SPARE_PART_CURRENT_PRICE_PROXY` (`InventoryTransaction`) as separate independent metrics.
- **Available Options:**
  - **Option A:** Keep metrics separate; do not allow cross-metric summation without explicit deduplication.
  - **Option B:** Subtract spare part transaction cost from `WorkOrder.totalCost` when computing combined totals.
- **Recommendation:** Option A provides clear metric boundaries and prevents double counting.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `CostAnalyticsService` aggregation logic.

#### DEC-017: Labour Cost Status Policy
- **Category:** Labour Cost
- **Decision Question:** Should Labour Cost (`COST_LABOUR`) return `status = 'N/A'` until a Labour Rate model is added to the schema?
- **Current Architecture Proposal:** `status = 'N/A'`, `value = null`, `note = 'Schema Gap: No hourly labour rate or technician time tracking model'`.
- **Available Options:**
  - **Option A:** Return `status = 'N/A'`, `value = null` (Strict schema gap declaration).
  - **Option B:** Estimate using hardcoded default hourly rate (e.g. 100,000 VND/hr).
- **Recommendation:** Option A maintains system audit compliance and avoids fake estimates.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `COST_LABOUR` metric registry definition.

#### DEC-018: Downtime Financial Loss Status Policy
- **Category:** Downtime Cost
- **Decision Question:** Should Downtime Cost (`COST_DOWNTIME`) return `status = 'N/A'` until Downtime Financial Loss Rates are configured per equipment?
- **Current Architecture Proposal:** `status = 'N/A'`, `value = null`, `note = 'Schema Gap: No downtime financial loss rate per equipment or line'`.
- **Available Options:**
  - **Option A:** Return `status = 'N/A'`, `value = null`.
  - **Option B:** Use estimated global default hourly downtime cost.
- **Recommendation:** Option A adhering to Metric Transparency.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `COST_DOWNTIME` metric registry definition.

#### DEC-019: External Service Cost Status Policy
- **Category:** External Service Cost
- **Decision Question:** Should External Service Cost (`COST_EXTERNAL_SERVICE`) return `status = 'N/A'` until Vendor Invoice models are added?
- **Current Architecture Proposal:** `status = 'N/A'`, `value = null`, `note = 'Schema Gap: No external service invoice or vendor contract model'`.
- **Available Options:**
  - **Option A:** Return `status = 'N/A'`, `value = null`.
  - **Option B:** Estimate from custom field text parsing.
- **Recommendation:** Option A.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `COST_EXTERNAL_SERVICE` metric definition.

#### DEC-020: Manager Cost Analytics Authorization Policy
- **Category:** Authorization Policy
- **Decision Question:** Which roles are authorized to view Cost Analytics?
- **Current Architecture Proposal:** `ADMIN` has full access. `MANAGER` is `PENDING USER DECISION (403 default)`. `TECHNICIAN` and `OPERATOR` are `FORBIDDEN (403)`.
- **Available Options:**
  - **Option A:** Allow `MANAGER` full cost access for WOs in their department.
  - **Option B:** Restrict `MANAGER` to non-financial operational metrics (Keep 403 for Cost).
- **Recommendation:** Option A is typical for Department Managers overseeing maintenance budgets.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `CostAnalyticsController` guards & Role Matrix update.

#### DEC-021: Spare Part Valuation Model (Current Price Proxy vs Historical Cost)
- **Category:** Spare Part Valuation
- **Decision Question:** What pricing model should be used for Spare Part Value calculation?
- **Current Architecture Proposal:** `COST_SPARE_PART_CURRENT_PRICE_PROXY` uses `InventoryTransaction.quantity * InventoryItem.unitPrice` (`status = ESTIMATED`, annotated with `COST_PROXY_USED`).
- **Available Options:**
  - **Option A:** Current Item Price Proxy (`InventoryItem.unitPrice` - current snapshot price).
  - **Option B:** Historical Unit Cost Snapshot (Requires adding `unitCostSnapshot` to `InventoryTransaction` in future schema).
- **Recommendation:** Option A for Phase 3.8C; upgrade to Option B post-3.8C.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `spare-part-analytics.service.ts` calculation formula.

#### DEC-022: Currency Standard & Formatting Policy
- **Category:** Financial Policy
- **Decision Question:** What is the system currency policy and decimal formatting standard?
- **Current Architecture Proposal:** `VND` (Vietnamese Dong), integer rounding (`roundHalfUp` to 0 decimal places for VND, or 2 decimal places for rates).
- **Available Options:**
  - **Option A:** `VND` standard (Integer rounding, no decimals).
  - **Option B:** Multi-currency support (`USD`, `EUR`, `VND`) with exchange rates.
- **Recommendation:** Option A simplifies core CMMS accounting.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Metric DTO response unit formatting.

---

### 2.5. Inventory & Movement Policy

#### DEC-023: Non-WO InventoryTransaction Scope Path
- **Category:** Inventory Movement
- **Decision Question:** Should `InventoryTransaction` without WO/Request links (receipts, adjustments, returns without WO) be excluded from Manager/Technician scope?
- **Current Architecture Proposal:** Excluded from Manager/Technician scope (`status = 'N/A'` or **HTTP 403 Forbidden**) because transactions lack direct department/user FKs. Accessible only by `ADMIN`.
- **Available Options:**
  - **Option A:** Exclude non-WO transactions from Manager/Technician scope (Admin only).
  - **Option B:** Add `warehouseId` / `departmentId` FK to `InventoryTransaction` in future schema.
- **Recommendation:** Option A for Phase 3.8C baseline.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `SparePartAnalyticsService` query scoping.

#### DEC-024: Stockout Event Count Status Policy
- **Category:** Stockout Definition
- **Decision Question:** Should Stockout Event Count (`PART_STOCKOUT_EVENT_COUNT`) return `status = 'N/A'` due to lack of historical stock balance snapshots?
- **Current Architecture Proposal:** `status = 'N/A'`, `value = null`, `note = 'Schema Gap: No historical inventory stock balance ledger'`.
- **Available Options:**
  - **Option A:** Return `status = 'N/A'`, `value = null`.
  - **Option B:** Estimate stockouts whenever `quantity == 0` on item record.
- **Recommendation:** Option A prevents inaccurate event counts.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `PART_STOCKOUT_EVENT_COUNT` metric registry entry.

#### DEC-025: Low Stock Item Count Snapshot Boundary
- **Category:** Inventory Policy
- **Decision Question:** Should `PART_LOW_STOCK_ITEM_COUNT` be documented strictly as a global current stock snapshot?
- **Current Architecture Proposal:** Evaluates `quantity <= minQuantity` on `InventoryItem` as a global total snapshot; ignores inactive/locked items; annotated with `note = 'Current global inventory snapshot, not warehouse-level stock'`.
- **Available Options:**
  - **Option A:** Global inventory item snapshot (Current schema behavior).
  - **Option B:** Warehouse-level stock snapshot (Requires multi-warehouse inventory schema).
- **Recommendation:** Option A for current baseline.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `PART_LOW_STOCK_ITEM_COUNT` documentation and calculation.

#### DEC-026: Fast-Moving Spare Part Movement Threshold
- **Category:** Fast Moving
- **Decision Question:** What time threshold defines a Fast-Moving spare part (`PART_FAST_MOVING`)?
- **Current Architecture Proposal:** `status = PENDING_BUSINESS_RULE`, `value = null` until movement threshold is approved.
- **Available Options:**
  - **Option A:** Issued $\ge 5$ times or quantity $\ge 50$ units within 30 days.
  - **Option B:** Issued $\ge 10$ times within 60 days.
- **Recommendation:** Option A is standard warehouse velocity scoring.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `PART_FAST_MOVING` ranking query filter.

#### DEC-027: Slow-Moving Spare Part Movement Threshold
- **Category:** Slow Moving
- **Decision Question:** What time threshold defines a Slow-Moving spare part (`PART_SLOW_MOVING`)?
- **Current Architecture Proposal:** `status = PENDING_BUSINESS_RULE`, `value = null`.
- **Available Options:**
  - **Option A:** Zero issues within 90 days, but issued at least once within 180 days.
  - **Option B:** Zero issues within 120 days.
- **Recommendation:** Option A.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `PART_SLOW_MOVING` ranking query filter.

#### DEC-028: Dead Stock Spare Part Threshold
- **Category:** Dead Stock
- **Decision Question:** What time threshold defines Dead Stock (`PART_DEAD_STOCK`)?
- **Current Architecture Proposal:** `status = PENDING_BUSINESS_RULE`, `value = null`.
- **Available Options:**
  - **Option A:** Zero issue transactions in retained history ($\ge 180$ days).
  - **Option B:** Zero issue transactions in $\ge 365$ days.
- **Recommendation:** Option A for inventory cost optimization.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `PART_DEAD_STOCK` ranking metric query.

#### DEC-029: Critical Spare Parts Scoring Model
- **Category:** Inventory Policy
- **Decision Question:** Are Critical Spare Parts configured manually or scored automatically?
- **Current Architecture Proposal:** Requires manual flag or ABC classification on `InventoryItem`. (Currently unsupported in schema, returning `status = 'N/A'`).
- **Available Options:**
  - **Option A:** Manual boolean flag on `InventoryItem` (`isCritical`).
  - **Option B:** Automated ABC / VED velocity scoring.
- **Recommendation:** Option A for simplicity.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Future inventory schema extension.

#### DEC-030: Inventory Transaction Type Consumption Mapping
- **Category:** Inventory Movement
- **Decision Question:** How are `ISSUE`, `RETURN`, and `ADJUST_OUT` transaction types treated in consumption analytics?
- **Current Architecture Proposal:** Consumption = `SUM(ISSUE) - SUM(RETURN)`. `ADJUST_OUT` is logged separately under Data Quality metadata warnings.
- **Available Options:**
  - **Option A:** Net Issue = `ISSUE - RETURN` (Strict usage consumption).
  - **Option B:** Gross Issue = `ISSUE` only (Ignores returns).
  - **Option C:** Include `ADJUST_OUT` in total consumption.
- **Recommendation:** Option A reflects true spare part consumption.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `PART_ISSUED_QUANTITY` aggregation formula.

---

### 2.6. Lifecycle Policy

#### DEC-031: Equipment Age Baseline Date Selection
- **Category:** Lifecycle Policy
- **Decision Question:** From which date should Equipment Age (`LIFE_EQ_AGE_FROM_CREATED_AT`) be calculated?
- **Current Architecture Proposal:** Uses `Equipment.createdAt` as commissioning date proxy (`analyticsType = ESTIMATED`, annotated with `TEMPORAL_PROXY_USED`).
- **Available Options:**
  - **Option A:** `Equipment.createdAt` record date proxy.
  - **Option B:** `Equipment.commissioningDate` (Requires adding `commissioningDate` to `Equipment` in future schema).
- **Recommendation:** Option A for Phase 3.8C; migrate to Option B when `commissioningDate` is populated.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `LIFE_EQ_AGE_FROM_CREATED_AT` calculation logic.

#### DEC-032: Remaining Useful Life (RUL) Status Policy
- **Category:** Lifecycle Policy
- **Decision Question:** Should Remaining Useful Life (`LIFE_EST_RUL`) return `status = 'N/A'` until manufacturer expected life or engineering standards are configured?
- **Current Architecture Proposal:** `status = 'N/A'`, `value = null`, `note = 'Schema Gap: No expected lifecycle years standard configured per equipment type'`.
- **Available Options:**
  - **Option A:** Return `status = 'N/A'`, `value = null` (Strict schema gap).
  - **Option B:** Rule-based estimate using generic 10-year lifespan proxy (`analyticsType = ESTIMATED`).
- **Recommendation:** Option A to prevent misleading predictive claims.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `LIFE_EST_RUL` metric registry definition.

#### DEC-033: Expected Lifecycle Configuration Level
- **Category:** Lifecycle Policy
- **Decision Question:** Is expected lifecycle configured per equipment category/type or per individual equipment?
- **Current Architecture Proposal:** Propose adding `expectedLifecycleYears` to `EquipmentCategory` or `Equipment` in future schema.
- **Available Options:**
  - **Option A:** Per Equipment Category.
  - **Option B:** Per individual Equipment instance.
- **Recommendation:** Option A for general defaults with Option B override.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Future schema extension proposal.

#### DEC-034: Rule-Based RUL Proxy Acceptance
- **Category:** Lifecycle Policy
- **Decision Question:** Is a rule-based RUL proxy acceptable (`analyticsType = ESTIMATED`, `method = RULE_BASED`) if explicit expected life is configured?
- **Current Architecture Proposal:** Acceptable provided `analyticsType = ESTIMATED` and data quality metadata includes `ESTIMATION_LIMITATION`.
- **Available Options:**
  - **Option A:** Accept rule-based proxy with `ESTIMATED` status flag.
  - **Option B:** Reject rule-based proxy; require ML sensor models.
- **Recommendation:** Option A provides operational utility without complex ML infrastructure.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `LifecycleAnalyticsService` engine.

#### DEC-035: Equipment Replacement Candidate Criteria
- **Category:** Lifecycle Policy
- **Decision Question:** What criteria determine an Equipment Replacement Candidate (`LIFE_REPLACEMENT_CANDIDATE`)?
- **Current Architecture Proposal:** `status = 'N/A'` until criteria are formally approved.
- **Available Options:**
  - **Option A:** Age $\ge 80\%$ expected life AND Failure Frequency $\ge 5$ events/year AND Repair Cost $\ge 50\%$ replacement cost.
  - **Option B:** High MTTR + High Failure Count threshold.
- **Recommendation:** Option A is standard lifecycle replacement scoring.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `LIFE_REPLACEMENT_CANDIDATE` metric algorithm.

#### DEC-036: Technical Approval Requirement for Replacement Candidates
- **Category:** Lifecycle Policy
- **Decision Question:** Does replacement candidate selection require technical approval before display in Manager dashboards?
- **Current Architecture Proposal:** Flag candidates as `PROVISIONAL_CANDIDATE` pending engineering sign-off.
- **Available Options:**
  - **Option A:** Require technical approval flag.
  - **Option B:** Display automatically based on algorithm score.
- **Recommendation:** Option B with clear "Automated Recommendation" disclaimers.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Dashboard widget logic in Phase 3.8D.

#### DEC-037: Replacement Cost ERP Integration (SAP Business One)
- **Category:** Lifecycle Policy
- **Decision Question:** Should replacement cost estimates be integrated from SAP Business One ERP or entered manually?
- **Current Architecture Proposal:** Propose manual `replacementCost` field on `Equipment` for Phase 3.8C/3.9; evaluate SAP B1 ERP sync in Phase 4.0.
- **Available Options:**
  - **Option A:** Manual entry on Equipment master record.
  - **Option B:** SAP Business One ERP integration.
- **Recommendation:** Option A for immediate availability.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Future Schema Proposal table.

---

### 2.7. Root Cause & CAPA Policy

#### DEC-038: Failure Cause Text vs Verified Root Cause Distinction
- **Category:** Root Cause Ownership
- **Decision Question:** Is Failure Cause text (`WorkOrder.failureCause`) distinct from a verified Root Cause?
- **Current Architecture Proposal:** Yes. `WorkOrder.failureCause` is treated strictly as an unverified free-text breakdown (`FAILURE_CAUSE_TEXT_DISTRIBUTION`, `status = PARTIALLY_SUPPORTED`). Verified Root Cause metrics return `status = 'N/A'`.
- **Available Options:**
  - **Option A:** Strict distinction (Text string $\neq$ Verified Root Cause).
  - **Option B:** Treat text string as canonical Root Cause.
- **Recommendation:** Option A prevents unverified text notes from polluting quality assurance metrics.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `RootCauseAnalyticsService` contract formatting.

#### DEC-039: Root Cause & CAPA Metric Status Policy
- **Category:** Root Cause Ownership
- **Decision Question:** Should all Root Cause and CAPA analytics return `status = 'N/A'` until structured Root Cause models or QMS integration are added?
- **Current Architecture Proposal:** All 5 Root Cause metrics (`ROOT_CAUSE_DISTRIBUTION`, `REPEAT_ROOT_CAUSE`, `CAPA_EFFECTIVENESS`, `RECURRENCE_AFTER_CAPA`, `ROOT_CAUSE_VERIFICATION_STATUS`) return `status = 'N/A'`, `value = null`.
- **Available Options:**
  - **Option A:** Return `status = 'N/A'`, `value = null` (Strict schema gap).
  - **Option B:** Parse keywords from `failureCause` string to populate categories.
- **Recommendation:** Option A adhering to Metric Transparency.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `root-cause-analytics.service.ts` placeholder contracts.

#### DEC-040: Root Cause System of Record Ownership
- **Category:** Root Cause Ownership
- **Decision Question:** Is Root Cause managed inside CMMS or in an external Quality Management System (QMS)?
- **Current Architecture Proposal:** Propose managing basic Root Cause (5-Why) inside CMMS via future schema extension; integrate with QMS if enterprise requires.
- **Available Options:**
  - **Option A:** Managed inside CMMS (Add `RootCauseInvestigation` model).
  - **Option B:** Managed in external QMS (Synced via REST API).
- **Recommendation:** Option A for operational self-containment.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Future Schema Proposal table.

#### DEC-041: CAPA System of Record Ownership
- **Category:** CAPA Ownership
- **Decision Question:** Is CAPA managed inside CMMS or in an external QMS?
- **Current Architecture Proposal:** Propose `CAPAReference` model in CMMS for linking maintenance actions to CAPA IDs.
- **Available Options:**
  - **Option A:** Managed inside CMMS.
  - **Option B:** Managed in external QMS.
- **Recommendation:** Option B (QMS is standard System of Record for CAPA).
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Future Schema Proposal table.

#### DEC-042: CAPA Effectiveness Rate Calculation Source
- **Category:** CAPA Ownership
- **Decision Question:** Is CAPA effectiveness rate synced from QMS or calculated in CMMS?
- **Current Architecture Proposal:** Returns `status = 'N/A'` until CAPA entity and recurrence tracking are established.
- **Available Options:**
  - **Option A:** Calculated in CMMS based on post-CAPA equipment recurrence within 90 days.
  - **Option B:** Synced from external QMS.
- **Recommendation:** Option A utilizing CMMS maintenance history.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `CAPA_EFFECTIVENESS` formula.

#### DEC-043: Root Cause Investigation System of Record
- **Category:** Root Cause Ownership
- **Decision Question:** Which system is the System of Record for Root Cause investigations?
- **Current Architecture Proposal:** CMMS for maintenance-driven failures; QMS for product quality impact failures.
- **Available Options:**
  - **Option A:** CMMS as primary System of Record.
  - **Option B:** QMS as primary System of Record.
- **Recommendation:** Option A for maintenance team workflow.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Domain integration architecture.

---

### 2.8. Time & Timezone Policy

#### DEC-044: System Timezone Identifier Policy
- **Category:** Timezone Identifier
- **Decision Question:** Should the system timezone identifier be set to `Asia/Bangkok` or `Asia/Ho_Chi_Minh` (both UTC+7)?
- **Current Architecture Proposal:** `Required offset: UTC+7`, `Timezone identifier: PENDING USER DECISION` (`Asia/Bangkok` vs `Asia/Ho_Chi_Minh`).
- **Available Options:**
  - **Option A:** `Asia/Ho_Chi_Minh` (Canonical for Vietnam deployment).
  - **Option B:** `Asia/Bangkok` (Standard UTC+7 IANA identifier).
- **Recommendation:** Option A for localized compliance in Vietnam.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `TimeEngine` timezone conversion & DTO metadata.

#### DEC-045: Calendar Week Start Boundary
- **Category:** Week Boundary
- **Decision Question:** Should the calendar week start on Monday or Sunday?
- **Current Architecture Proposal:** `Week Boundary: PENDING USER DECISION — Monday start or Sunday start`.
- **Available Options:**
  - **Option A:** Monday start (ISO-8601 standard: Monday 00:00:00.000 to Sunday 23:59:59.999).
  - **Option B:** Sunday start (US standard: Sunday 00:00:00.000 to Saturday 23:59:59.999).
- **Recommendation:** Option A (ISO-8601 standard is standard for industrial CMMS).
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `TimeEngine` week bucketing algorithms and SQL `DATE_TRUNC('week')`.

#### DEC-046: Failure Trend Timestamp Selection
- **Category:** Trend Timestamp
- **Decision Question:** Should Failure Trends use failure occurred date, reported date, or WO created date?
- **Current Architecture Proposal:** Uses `WorkOrder.createdAt` (Date recorded proxy; annotated with `TEMPORAL_PROXY_USED` metadata). Propose `failureOccurredAt` in future schema.
- **Available Options:**
  - **Option A:** `WorkOrder.createdAt` (Date recorded proxy).
  - **Option B:** `WorkOrder.reportedAt` / `failureOccurredAt` (Requires future schema extension).
- **Recommendation:** Option A for Phase 3.8C baseline; upgrade to Option B post-3.8C.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `FAIL_WO_CREATION_TREND` date field policy.

#### DEC-047: Inventory Trend Timestamp Selection
- **Category:** Inventory Timestamp
- **Decision Question:** Should Inventory Trends use transaction occurred date or ledger posting date?
- **Current Architecture Proposal:** Uses `InventoryTransaction.createdAt` (Date recorded proxy).
- **Available Options:**
  - **Option A:** `InventoryTransaction.createdAt`.
  - **Option B:** `postedAt` ledger posting date (Requires future schema extension).
- **Recommendation:** Option A for baseline.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `SparePartAnalyticsService` time bucketing.

---

### 2.9. API, Performance & Execution Policy

#### DEC-048: API Architecture Strategy Selection
- **Category:** API
- **Decision Question:** Do you approve **Option B (Domain-Oriented Typed API Strategy)** over Option A (Generic Query API)?
- **Current Architecture Proposal:** Option B (Dedicated typed endpoints: `/cost/trend`, `/failure/ranking`, `/spare-parts/trend`, `/lifecycle/query`, `/root-cause/ranking`).
- **Available Options:**
  - **Option A:** Generic Query API (`POST /api/v1/analytics/query`).
  - **Option B:** Domain-Oriented Typed API Strategy (`POST /api/v1/analytics/{domain}/{datasetType}`).
- **Recommendation:** Option B for superior type safety, Guard authorization, and OpenAPI docs.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `AnalyticsEngineController` route definitions.

#### DEC-049: Default & Maximum Date Window Budget
- **Category:** Date Window
- **Decision Question:** What default and maximum date windows should be enforced for synchronous analytics queries?
- **Current Architecture Proposal:** Default: 12 Months. Maximum synchronous window: 36 Months.
- **Available Options:**
  - **Option A:** Default 12 months, Max 36 months.
  - **Option B:** Default 6 months, Max 24 months.
- **Recommendation:** Option A balances analytical depth with query performance.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `AnalyticsQueryRequestDto` validation constraints.

#### DEC-050: Ranking Top N Limit Budget
- **Category:** Top N
- **Decision Question:** What default Top N limit and maximum Top N limit should be enforced for ranking queries?
- **Current Architecture Proposal:** Default: 20 records. Maximum Top N: 100 records.
- **Available Options:**
  - **Option A:** Default 20, Max 100.
  - **Option B:** Default 10, Max 50.
- **Recommendation:** Option A provides comprehensive Pareto ranking without UI overload.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `RankingDataset` query limit logic.

#### DEC-051: Matrix Cell Boundary Budget
- **Category:** Matrix Limits
- **Decision Question:** What maximum matrix cell count should be enforced for cross-tabulation queries?
- **Current Architecture Proposal:** Maximum: 10,000 cells ($100 \times 100$).
- **Available Options:**
  - **Option A:** Maximum 10,000 cells.
  - **Option B:** Maximum 2,500 cells ($50 \times 50$).
- **Recommendation:** Option A supports detailed multi-dimensional matrix queries.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `MatrixDataset` generation engine bounds check.

#### DEC-052: Parameterized Raw SQL Execution Policy
- **Category:** Raw SQL Policy
- **Decision Question:** Is parameterized Raw SQL permitted when Prisma lacks required aggregation capabilities?
- **Current Architecture Proposal:** Permitted ONLY when Prisma lacks required aggregation features, strictly parameterized, server scope applied, and verified by integration execution plans.
- **Available Options:**
  - **Option A:** Permitted under strict safety guidelines.
  - **Option B:** Strictly forbidden; force all aggregations into application memory.
- **Recommendation:** Option A prevents server memory exhaustion on large datasets ($> 100,000$ records).
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `AggregationEngine` database query strategy.

---

### 2.10. Cache, Compliance & Snapshot Policy

#### DEC-053: Real-Time vs Cached Execution Tolerance
- **Category:** Cache Strategy
- **Decision Question:** Does Analytics require real-time execution, or is near-real-time cached execution acceptable?
- **Current Architecture Proposal:** Near-real-time cached execution is proposed (Proposed TTL: 15 minutes), with event-driven cache invalidation on WO/Transaction writes.
- **Available Options:**
  - **Option A:** Cached execution with event-driven invalidation.
  - **Option B:** 100% real-time execution on every request (No cache).
- **Recommendation:** Option A guarantees $p95 \le 2.0\text{s}$ latency under heavy multi-user load.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `AnalyticsEngineService` caching layer.

#### DEC-054: Cache Error Fallback Behavior (Fail-Open vs Fail-Closed)
- **Category:** Cache Strategy
- **Decision Question:** If cache invalidation or retrieval fails, should the system fail-open (serve stale data) or fail-closed (re-compute synchronously)?
- **Current Architecture Proposal:** Re-compute synchronously (Fail-Closed on cache error to ensure data accuracy).
- **Available Options:**
  - **Option A:** Re-compute synchronously (Fail-Closed).
  - **Option B:** Serve stale cached data with `STALE_CACHE_USED` metadata warning.
- **Recommendation:** Option A ensures analytical correctness.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Cache error handling logic.

#### DEC-055: Metric Formula Versioning Requirement
- **Category:** KPI Versioning
- **Decision Question:** Is metric formula versioning required in response metadata for compliance?
- **Current Architecture Proposal:** Propose adding `metricVersion` (e.g. `v1.0.0`) to `AnalyticsResponseMetadata`.
- **Available Options:**
  - **Option A:** Include `metricVersion` in metadata.
  - **Option B:** Omit metric versioning.
- **Recommendation:** Option A provides audit traceability for regulatory compliance.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `AnalyticsResponseMetadata` DTO structure.

#### DEC-056: Snapshot Analytics Compliance Policy
- **Category:** Snapshot Analytics
- **Decision Question:** Are snapshot analytics records required for GMP / GxP review compliance?
- **Current Architecture Proposal:** Propose storing generated monthly analytics snapshots for formal compliance auditing.
- **Available Options:**
  - **Option A:** Store frozen monthly snapshot records in database.
  - **Option B:** Compute dynamically on demand (No snapshot storage).
- **Recommendation:** Option A for GMP/GxP regulated manufacturing environments.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Compliance snapshot service design.

#### DEC-057: E-Signature Requirement for Approved Reports
- **Category:** eSignature
- **Decision Question:** Is electronic signature (21 CFR Part 11 / Annex 11 e-signature) required for approved analytics reports?
- **Current Architecture Proposal:** Out of scope for Phase 3.8C Analytics Engine; evaluate in Phase 3.9 (Report Export Service).
- **Available Options:**
  - **Option A:** Require e-signature in Phase 3.9 Report Export.
  - **Option B:** Standard PDF export without e-signature.
- **Recommendation:** Option A if operating under GxP regulatory compliance.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** Phase 3.9 scope baseline.

#### DEC-058: Audit Log Retention for Unauthorized Query Attempts
- **Category:** Audit
- **Decision Question:** Should rejected unauthorized query attempts (HTTP 403 / 400) be logged in the audit trail?
- **Current Architecture Proposal:** Yes. Inherits Phase 3.8A `AnalyticsAuditAdapter` which logs `ANALYTICS_QUERY_ATTEMPTED` (Fail-Closed) and `ANALYTICS_QUERY_FAILED`.
- **Available Options:**
  - **Option A:** Log all query attempts (successful, failed, and unauthorized).
  - **Option B:** Log successful queries only.
- **Recommendation:** Option A satisfies ALCOA+ security audit trail standards.
- **User Decision:** `TBD`
- **Status:** `Pending User Approval`
- **Implementation Impact:** `AnalyticsAuditAdapter` event logging.

---

## 3. Decision Summary Table

| Category | Total Decisions | Approved | Pending User Approval | Rejected |
| :--- | :---: | :---: | :---: | :---: |
| **Work Order & Request Policy** | 5 | 0 | 5 | 0 |
| **Equipment Ownership & Scope** | 5 | 0 | 5 | 0 |
| **Technician Scope & Authorization** | 4 | 0 | 4 | 0 |
| **Cost Policy & Financial Composition** | 8 | 0 | 8 | 0 |
| **Inventory & Movement Policy** | 8 | 0 | 8 | 0 |
| **Lifecycle Policy** | 7 | 0 | 7 | 0 |
| **Root Cause & CAPA Policy** | 6 | 0 | 6 | 0 |
| **Time & Timezone Policy** | 4 | 0 | 4 | 0 |
| **API, Performance & Execution Policy** | 5 | 0 | 5 | 0 |
| **Cache, Compliance & Audit Policy** | 6 | 0 | 6 | 0 |
| **TOTAL** | **58** | **0** | **58** | **0** |

---

```text
Analytics Decision Log v1.0

Status:
GATE 1.5 BUSINESS DECISION FREEZE

Total Decisions: 58
Pending User Approval: 58
Approved: 0
Rejected: 0

Gate 2 implementation remains BLOCKED until all pending business decisions are resolved and frozen.
No code implementation has been performed.
No migration has been created.
```
