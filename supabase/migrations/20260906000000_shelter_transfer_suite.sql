-- ============================================================================
-- KHALID AL-SULAIM GROUP ERP - SHELTER & SPONSORSHIP TRANSFER SUITE MIGRATION
-- Reference: BRD_نظام_إدارة_السكن_ونقل_الخدمات.xlsx
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WORKERS MASTER TABLE (ملف العاملة الموحد)
CREATE TABLE IF NOT EXISTS public.shelter_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_code VARCHAR(50) UNIQUE NOT NULL,
    original_office_id VARCHAR(50) NOT NULL, -- SAF, DAR, TOP, YAQ
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(255),
    nationality VARCHAR(100) NOT NULL,
    passport_number VARCHAR(100) NOT NULL,
    iqama_number VARCHAR(100),
    birth_date DATE,
    age INT,
    phone_number VARCHAR(50),
    saudi_entry_date DATE,
    initial_shelter_entry_date DATE NOT NULL,
    initial_entry_reason TEXT NOT NULL,
    operational_status VARCHAR(100) NOT NULL DEFAULT 'داخل السكن',
    required_action VARCHAR(100) NOT NULL DEFAULT 'نقل خدمات',
    requested_salary NUMERIC(12, 2) NOT NULL DEFAULT 1500,
    experience_years INT DEFAULT 0,
    experience_country VARCHAR(100),
    languages TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    photo_url TEXT,
    cv_url TEXT,
    documents_status VARCHAR(50) DEFAULT 'مكتملة',
    client_trials_count INT DEFAULT 0,
    last_dispatch_date TIMESTAMPTZ,
    last_return_date TIMESTAMPTZ,
    responsible_employee VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FIRST SPONSOR TABLE (بيانات الكفيل الأول)
CREATE TABLE IF NOT EXISTS public.shelter_worker_first_sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.shelter_workers(id) ON DELETE CASCADE,
    sponsor_name VARCHAR(255) NOT NULL,
    national_id_or_iqama VARCHAR(50),
    phone_number VARCHAR(50),
    city VARCHAR(100),
    contract_ref_no VARCHAR(100),
    recruitment_office VARCHAR(255),
    relationship_start_date DATE,
    return_date DATE NOT NULL,
    return_reason TEXT NOT NULL,
    warranty_status VARCHAR(100) DEFAULT 'داخل الضمان (90 يوم)',
    has_claim BOOLEAN DEFAULT FALSE,
    claim_details TEXT,
    previous_relationship_status VARCHAR(100) DEFAULT 'منتهية ودية',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ACCOMMODATION CASES TABLE (حالات السكن)
CREATE TABLE IF NOT EXISTS public.shelter_accommodation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_code VARCHAR(50) UNIQUE NOT NULL,
    worker_id UUID NOT NULL REFERENCES public.shelter_workers(id) ON DELETE CASCADE,
    original_office_id VARCHAR(50) NOT NULL,
    entry_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entry_reason TEXT NOT NULL,
    receiving_employee VARCHAR(255) NOT NULL,
    received_documents TEXT[] DEFAULT '{}',
    iqama_status VARCHAR(100) DEFAULT 'سارية',
    required_action VARCHAR(100) DEFAULT 'تقييم نقل الخدمات',
    responsible_employee VARCHAR(255),
    priority VARCHAR(50) DEFAULT 'عادية',
    case_status VARCHAR(100) DEFAULT 'نشطة بالسكن',
    exit_datetime TIMESTAMPTZ,
    exit_type VARCHAR(100),
    room_number VARCHAR(50),
    bed_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRANSFER CASES TABLE (عمليات نقل الخدمات)
CREATE TABLE IF NOT EXISTS public.shelter_transfer_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_code VARCHAR(50) UNIQUE NOT NULL,
    worker_id UUID NOT NULL REFERENCES public.shelter_workers(id) ON DELETE CASCADE,
    accommodation_case_id UUID REFERENCES public.shelter_accommodation_cases(id) ON DELETE SET NULL,
    original_office_id VARCHAR(50) NOT NULL,
    executing_office_id VARCHAR(50) NOT NULL,
    new_client_name VARCHAR(255) NOT NULL,
    new_client_national_id VARCHAR(50),
    new_client_phone VARCHAR(50) NOT NULL,
    new_client_city VARCHAR(100),
    responsible_employee VARCHAR(255),
    selection_date DATE DEFAULT CURRENT_DATE,
    reservation_date DATE DEFAULT CURRENT_DATE,
    transfer_status VARCHAR(100) DEFAULT 'محجوزة',
    transfer_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    down_payment NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'معلق',
    agreement_ref_no VARCHAR(100),
    agreement_sign_date DATE,
    agreement_file_url TEXT,
    delivery_datetime TIMESTAMPTZ,
    followup_days_duration INT DEFAULT 5,
    followup_end_date DATE,
    client_decision VARCHAR(100) DEFAULT 'قيد التجربة',
    transfer_request_date DATE,
    transfer_request_status VARCHAR(100),
    transfer_completion_date DATE,
    return_datetime TIMESTAMPTZ,
    return_reason TEXT,
    actual_trial_days INT DEFAULT 0,
    deduction_amount NUMERIC(12, 2) DEFAULT 0,
    refund_amount NUMERIC(12, 2) DEFAULT 0,
    settlement_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CLIENT FOLLOW-UPS (متابعة العملاء اليومية)
CREATE TABLE IF NOT EXISTS public.shelter_client_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_case_id UUID NOT NULL REFERENCES public.shelter_transfer_cases(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.shelter_workers(id) ON DELETE CASCADE,
    contact_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contacted_person VARCHAR(255) NOT NULL,
    contact_channel VARCHAR(50) DEFAULT 'اتصال هاتفي',
    employee_name VARCHAR(255) NOT NULL,
    contact_result VARCHAR(100) NOT NULL,
    client_feedback TEXT,
    required_action_today TEXT,
    next_contact_date DATE,
    alert_level VARCHAR(20) DEFAULT 'green',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. WORKER MOVEMENT TIMELINE (سجل الحركات التاريخي)
CREATE TABLE IF NOT EXISTS public.shelter_worker_movement_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.shelter_workers(id) ON DELETE CASCADE,
    accommodation_case_id UUID REFERENCES public.shelter_accommodation_cases(id) ON DELETE SET NULL,
    transfer_case_id UUID REFERENCES public.shelter_transfer_cases(id) ON DELETE SET NULL,
    event_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    movement_type VARCHAR(100) NOT NULL,
    from_status VARCHAR(100),
    to_status VARCHAR(100),
    actor_employee VARCHAR(255) NOT NULL,
    office_id VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    attachment_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_shelter_workers_status ON public.shelter_workers(operational_status);
CREATE INDEX IF NOT EXISTS idx_shelter_workers_office ON public.shelter_workers(original_office_id);
CREATE INDEX IF NOT EXISTS idx_shelter_transfer_status ON public.shelter_transfer_cases(transfer_status);
CREATE INDEX IF NOT EXISTS idx_shelter_transfer_dates ON public.shelter_transfer_cases(delivery_datetime, followup_end_date);
CREATE INDEX IF NOT EXISTS idx_shelter_timeline_worker ON public.shelter_worker_movement_timeline(worker_id, event_datetime DESC);
