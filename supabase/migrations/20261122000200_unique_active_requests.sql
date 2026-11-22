begin;

-- Reject equivalent active requests, including retries with a different UUID.
-- An existing duplicate stops deployment so staff can reconcile its history.
create unique index clinic_appointments_active_request_key
  on clinic_private.appointments (
    service_id,
    start_at,
    lower(patient),
    method,
    (case when method = 'email' then lower(contact)
      else regexp_replace(regexp_replace(contact,'[^0-9]','','g'),'^63','0') end)
  )
  where status in ('pending','confirmed');

commit;
