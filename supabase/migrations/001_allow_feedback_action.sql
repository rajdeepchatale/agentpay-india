-- Allow 'feedback' in the audit log.
--
-- The route, the AuditAction union and the dashboard all handled it; only the
-- CHECK constraint did not. Postgres rejected every row, logDecision swallowed
-- the error and returned a synthetic id, and the API answered {ok:true} — so
-- the feature reported success while writing nothing.
--
-- Run once against an existing database. A fresh one gets this from schema.sql.

alter table audit_log drop constraint if exists audit_log_action_valid;

alter table audit_log add constraint audit_log_action_valid check (
  action in (
    'search_products',
    'create_order',
    'guardrail_check',
    'consent_request',
    'failure_recovery',
    'feedback'
  )
);
