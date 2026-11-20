-- ============================================================================
-- Migration: 20261121040000_wms_company_scoped_primary_keys.sql
-- Purpose: Multi-tenant integrity for the Inventory (WMS) cloud ledger.
--
-- Problem: every wms_* table used a GLOBAL primary key `(id)`, while the client
-- engine reuses the same ids across the 5 isolated companies (e.g. `WH-RET`,
-- `CAT-IT`, seeded item ids). Syncing company SAF would therefore overwrite
-- (or be blocked by) rows owned by company KAS — cross-tenant data corruption.
--
-- Fix: switch every wms_* table that has (id, company_id) to a company-scoped
-- primary key `(company_id, id)` and convert all single-column foreign keys
-- between wms_* tables into composite `(company_id, <col>)` foreign keys so a
-- row can only reference parents inside its own company. Covering indexes are
-- created for every composite foreign key.
--
-- Safety: the cloud WMS tables are empty (all data still lives in browsers),
-- the migration aborts if any affected table already contains rows.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  fk RECORD;
  v_rows BIGINT;
  v_fk_defs JSONB := '[]'::jsonb;
  v_item JSONB;
  v_ref_cols TEXT[];
  v_cols TEXT[];
  v_on_delete TEXT;
  v_name TEXT;
BEGIN
  -- 0. Abort when data already exists (avoid unsafe key rewrite on live data)
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'wms\_%'
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', r.relname) INTO v_rows;
    IF v_rows > 0 THEN
      RAISE EXCEPTION 'Table public.% has % rows — company-scoped key migration must be run on empty WMS tables', r.relname, v_rows;
    END IF;
  END LOOP;

  -- 1. Capture and drop every single-column FK between wms_* tables that points at `id`
  FOR fk IN
    SELECT con.conname,
           src.relname AS src_table,
           tgt.relname AS tgt_table,
           (SELECT attname FROM pg_attribute WHERE attrelid = con.conrelid AND attnum = con.conkey[1]) AS src_col,
           (SELECT attname FROM pg_attribute WHERE attrelid = con.confrelid AND attnum = con.confkey[1]) AS tgt_col,
           con.confdeltype
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_class tgt ON tgt.oid = con.confrelid
    JOIN pg_namespace n ON n.oid = src.relnamespace
    WHERE con.contype = 'f'
      AND n.nspname = 'public'
      AND src.relname LIKE 'wms\_%'
      AND tgt.relname LIKE 'wms\_%'
      AND array_length(con.conkey, 1) = 1
  LOOP
    IF fk.tgt_col = 'id' THEN
      v_fk_defs := v_fk_defs || jsonb_build_object(
        'src', fk.src_table, 'tgt', fk.tgt_table, 'col', fk.src_col, 'del', fk.confdeltype
      );
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', fk.src_table, fk.conname);
    END IF;
  END LOOP;

  -- 2. Switch PK (id) -> (company_id, id) on every wms_* table that has both columns
  FOR r IN
    SELECT c.relname, con.conname, con.conkey, c.oid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_constraint con ON con.conrelid = c.oid AND con.contype = 'p'
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'wms\_%'
      AND array_length(con.conkey, 1) = 1
      AND (SELECT attname FROM pg_attribute WHERE attrelid = c.oid AND attnum = con.conkey[1]) = 'id'
      AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = c.oid AND attname = 'company_id' AND NOT attisdropped)
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.relname, r.conname);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET NOT NULL', r.relname);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I PRIMARY KEY (company_id, id)', r.relname, r.relname || '_pkey');
  END LOOP;

  -- 3. Recreate FKs as composite (company_id, col) -> (company_id, id) + covering index
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_fk_defs)
  LOOP
    v_on_delete := CASE v_item ->> 'del'
      WHEN 'c' THEN ' ON DELETE CASCADE'
      WHEN 'n' THEN ' ON DELETE SET NULL (' || quote_ident(v_item ->> 'col') || ')'
      WHEN 'r' THEN ' ON DELETE RESTRICT'
      ELSE ''
    END;
    v_name := left((v_item ->> 'src') || '_' || (v_item ->> 'col') || '_cfk', 63);

    IF EXISTS (
      SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
      WHERE c.relname = v_item ->> 'src' AND a.attname = 'company_id' AND NOT a.attisdropped
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (company_id, %I) REFERENCES public.%I (company_id, id)%s',
        v_item ->> 'src', v_name, v_item ->> 'col', v_item ->> 'tgt', v_on_delete
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (company_id, %I)',
        left('idx_' || (v_item ->> 'src') || '_co_' || (v_item ->> 'col'), 63),
        v_item ->> 'src', v_item ->> 'col'
      );
    END IF;
  END LOOP;
END $$;

-- 4. Align the atomic posting RPC with the company-scoped keys
DO $$
DECLARE
  v_def TEXT;
BEGIN
  v_def := pg_get_functiondef('public.wms_post_voucher_atomic(text,jsonb,jsonb)'::regprocedure);
  v_def := replace(v_def, 'WHERE id = v_voucher_id AND company_id = p_company_id', 'WHERE company_id = p_company_id AND id = v_voucher_id');
  v_def := replace(v_def, '  ON CONFLICT (id) DO UPDATE SET', '  ON CONFLICT (company_id, id) DO UPDATE SET');
  v_def := replace(v_def, '    ON CONFLICT (id) DO NOTHING;', '    ON CONFLICT (company_id, id) DO NOTHING;');
  EXECUTE v_def;
END $$;

REVOKE ALL ON FUNCTION public.wms_post_voucher_atomic(TEXT, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wms_post_voucher_atomic(TEXT, JSONB, JSONB) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
