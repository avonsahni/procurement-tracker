#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Team Hub — local migration verification (no Supabase needed).
#
# Spins up a throwaway database on a local PostgreSQL 16 cluster, applies
# shims that mirror the Supabase environment (auth schema, auth.uid() driven
# by a session GUC, my_org_ids/is_org_admin from migration 005), applies
# supabase/migrations/039_team_hub.sql VERBATIM, then runs:
#   01-smoke.sql  — T1–T7 positive suites (triggers, mentions, soft delete,
#                   entity channels, tenant isolation, private channels)
#   inline N1–N8  — attack scenarios that must all be rejected
#
# RLS is exercised for real: queries run as the non-owner role `app_user`
# with auth.uid() simulated via `set test.uid = '<uuid>'`.
#
# Usage (as root, with postgresql-16 installed):
#   pg_ctlcluster 16 main start
#   bash scripts/team-hub/verify-local.sh
#
# NOTE: this complements — does not replace — the cloud isolation suite:
#   npm run test:isolation   (covers the same tables against real Supabase)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/../.."

DB=teamhub_test
SQL() { su postgres -c "psql -v ON_ERROR_STOP=1 -d $DB $*"; }

su postgres -c "dropdb --if-exists $DB && createdb $DB"
su postgres -c "psql -q -d $DB -c 'create role authenticated nologin'" 2>/dev/null || true

echo "── applying shims ──"
SQL -q -f scripts/team-hub/00-shim.sql > /dev/null
echo "── applying migration 039 (verbatim) ──"
SQL -q -f supabase/migrations/039_team_hub.sql > /dev/null
echo "── applying migration 039 again (idempotency check) ──"
SQL -q -f supabase/migrations/039_team_hub.sql > /dev/null
echo "── positive suites ──"
SQL -f scripts/team-hub/01-smoke.sql | grep -E "PASS|FAIL"

echo "── negative suites ──"
fail=0
neg() {
  local label="$1" sql="$2" expect="${3:-ERROR}"
  local out
  out=$(su postgres -c "psql -d $DB" <<SQLEOF 2>&1
set role app_user;
$sql
SQLEOF
)
  if echo "$out" | grep -q "$expect"; then
    echo "✓ $label"
  else
    echo "✗ $label — NOT BLOCKED"; echo "$out" | tail -3; fail=1
  fi
}

su postgres -c "psql -q -d $DB" <<'EOF'
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
insert into public.messages (id,thread_id,channel_id,org_id,author_id,body) values
 ('00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','second');
EOF

neg "N1 cross-tenant message insert" "
set test.uid = '00000000-0000-0000-0000-0000000000a3';
insert into public.messages (thread_id,channel_id,org_id,author_id,body) values
 ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a3','attack');"

neg "N2 foreign creator entity channel" "
set test.uid = '00000000-0000-0000-0000-0000000000a3';
select public.get_or_create_entity_channel('00000000-0000-0000-0000-000000000001','package','00000000-0000-0000-0000-000000000111','00000000-0000-0000-0000-0000000000a3');"

neg "N3 raw soft-delete UPDATE" "
set test.uid = '00000000-0000-0000-0000-0000000000a1';
update public.messages set deleted_at=now() where id='00000000-0000-0000-0000-000000000502';"

neg "N4 non-member joins private channel" "
set test.uid = '00000000-0000-0000-0000-0000000000a2';
insert into public.channel_members (channel_id,user_id,org_id,role) values
 ('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000001','member');"

neg "N5 direct INSERT into mentions" "
set test.uid = '00000000-0000-0000-0000-0000000000a1';
insert into public.mentions (message_id,thread_id,channel_id,org_id,mentioned_user_id) values
 ('00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a2');"

neg "N6 non-author soft_delete_message" "
set test.uid = '00000000-0000-0000-0000-0000000000a2';
select public.soft_delete_message('00000000-0000-0000-0000-000000000502');" "only the author or an org admin"

su postgres -c "psql -q -d $DB -c \"update public.channels set archived_at=now() where id='00000000-0000-0000-0000-000000000301';\""
neg "N7 post into archived channel" "
set test.uid = '00000000-0000-0000-0000-0000000000a1';
insert into public.messages (thread_id,channel_id,org_id,author_id,body) values
 ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','too late');"

out=$(su postgres -c "psql -d $DB" <<'EOF' 2>&1
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a3';
update public.messages set body='pwned' where org_id='00000000-0000-0000-0000-000000000001';
EOF
)
if echo "$out" | grep -q "UPDATE 0"; then echo "✓ N8 cross-tenant UPDATE affects 0 rows"; else echo "✗ N8 FAIL"; fail=1; fi

[ "$fail" -eq 0 ] && echo "── ALL CHECKS PASSED ──" || { echo "── FAILURES ──"; exit 1; }
