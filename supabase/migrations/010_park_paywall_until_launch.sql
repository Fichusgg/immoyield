-- Park the paywall until we have users. The deal-limit trigger is the only
-- object from migration 009 that affects user-facing behaviour; drop it so
-- nothing on the live DB enforces tier rules. The function stays so a future
-- "create trigger ..." one-liner re-enables it when the paywall ships.
drop trigger if exists enforce_free_deal_limit on public.deals;
