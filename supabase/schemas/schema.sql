-- Local RMS schema definition.
-- This schema mirrors the offline data model used by the app.

create table if not exists students (
  id text primary key,
  name text not null,
  student_identification_number text,
  registration_number text,
  class_level text not null,
  stream text,
  gender text,
  photo_data_url text,
  optional_subjects jsonb,
  enrolled_subjects jsonb,
  enrollment_combination text,
  created_at timestamptz not null default now()
);

create table if not exists subjects (
  id text primary key,
  name text not null,
  is_optional boolean not null default false,
  deleted boolean not null default false
);

create table if not exists combinations (
  id text primary key,
  name text not null,
  short_form text not null,
  subjects jsonb not null
);

create table if not exists marks (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  term text not null,
  subject text not null,
  paper integer not null,
  exam_set text,
  score numeric(5,2),
  ca numeric(5,2),
  exam numeric(5,2)
);

create table if not exists project_work (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  term text not null,
  marks numeric(5,2) not null
);

create table if not exists school_info (
  id text primary key default 'singleton',
  data jsonb not null default '{}'::jsonb
);

create table if not exists auth_info (
  access_code text primary key,
  recovery_email text,
  recovery_password text,
  security_question text,
  security_answer text
);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null
);

create table if not exists paper_grading_config (
  subject text primary key,
  mode text not null
);

create table if not exists paper_grading_target (
  subject text primary key,
  target text not null
);
