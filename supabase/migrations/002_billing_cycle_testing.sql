-- Allow the live smoke-test billing tier used for real-money checkout tests.
do $$ begin
  alter type public.billing_cycle add value 'testing';
exception
  when duplicate_object then null;
end $$;
