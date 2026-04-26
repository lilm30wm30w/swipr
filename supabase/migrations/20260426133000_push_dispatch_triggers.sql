create extension if not exists pg_net;

create or replace function public.enqueue_push_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://rixjtyglytavebfgzicz.functions.supabase.co/push-notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'userId', p_user_id,
      'title', p_title,
      'body', p_body,
      'data', p_data
    )
  );
end;
$$;

create or replace function public.notify_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_target_user_id uuid;
begin
  select *
  into v_match
  from public.matches
  where id = new.match_id;

  if not found then
    return new;
  end if;

  if new.sender_id = v_match.user1_id then
    v_target_user_id := v_match.user2_id;
  else
    v_target_user_id := v_match.user1_id;
  end if;

  perform public.enqueue_push_notification(
    v_target_user_id,
    'New message',
    'You have a new message in Swipr.',
    jsonb_build_object('type', 'message', 'matchId', new.match_id)
  );

  return new;
end;
$$;

create or replace function public.notify_on_match_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enqueue_push_notification(
    new.user1_id,
    'New match',
    'You have a new match in Swipr.',
    jsonb_build_object('type', 'match', 'matchId', new.id)
  );

  perform public.enqueue_push_notification(
    new.user2_id,
    'New match',
    'You have a new match in Swipr.',
    jsonb_build_object('type', 'match', 'matchId', new.id)
  );

  return new;
end;
$$;

create or replace function public.notify_on_trade_proposal_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_target_user_id uuid;
  v_title text;
  v_body text;
  v_status text;
begin
  select *
  into v_match
  from public.matches
  where id = coalesce(new.match_id, old.match_id);

  if not found then
    return coalesce(new, old);
  end if;

  v_status := coalesce(new.status, old.status);

  if tg_op = 'INSERT' then
    if new.proposer_id = v_match.user1_id then
      v_target_user_id := v_match.user2_id;
    else
      v_target_user_id := v_match.user1_id;
    end if;

    v_title := 'Trade proposal';
    v_body := 'You received a new trade proposal in Swipr.';
  elsif tg_op = 'UPDATE' then
    if new.proposer_id = v_match.user1_id then
      v_target_user_id := v_match.user1_id;
    else
      v_target_user_id := v_match.user2_id;
    end if;

    if new.status = old.status then
      return new;
    end if;

    if new.status = 'accepted' then
      v_title := 'Trade accepted';
      v_body := 'Your trade proposal was accepted.';
    elsif new.status = 'declined' then
      v_title := 'Trade declined';
      v_body := 'Your trade proposal was declined.';
    else
      return new;
    end if;
  else
    return coalesce(new, old);
  end if;

  perform public.enqueue_push_notification(
    v_target_user_id,
    v_title,
    v_body,
    jsonb_build_object('type', 'trade_proposal', 'matchId', coalesce(new.match_id, old.match_id), 'status', v_status)
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists messages_push_notify on public.messages;
create trigger messages_push_notify
after insert on public.messages
for each row execute function public.notify_on_message_insert();

drop trigger if exists matches_push_notify on public.matches;
create trigger matches_push_notify
after insert on public.matches
for each row execute function public.notify_on_match_insert();

drop trigger if exists trade_proposals_push_notify_insert on public.trade_proposals;
create trigger trade_proposals_push_notify_insert
after insert on public.trade_proposals
for each row execute function public.notify_on_trade_proposal_change();

drop trigger if exists trade_proposals_push_notify_update on public.trade_proposals;
create trigger trade_proposals_push_notify_update
after update on public.trade_proposals
for each row execute function public.notify_on_trade_proposal_change();

grant execute on function public.enqueue_push_notification(uuid, text, text, jsonb) to postgres, service_role;
