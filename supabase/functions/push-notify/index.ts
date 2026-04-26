import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type PushRequest = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function sendPush(messages: ExpoPushMessage[]) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  return response.json();
}

async function cleanupInvalidTokens(messages: ExpoPushMessage[], result: any) {
  const tickets = Array.isArray(result?.data) ? result.data : [];
  const invalidTokens = tickets
    .map((ticket: any, index: number) => {
      const details = ticket?.details;
      if (ticket?.status === 'error' && details?.error === 'DeviceNotRegistered') {
        return messages[index]?.to ?? null;
      }
      return null;
    })
    .filter((token: string | null): token is string => !!token);

  if (invalidTokens.length === 0) {
    return;
  }

  await supabase
    .from('push_tokens')
    .delete()
    .in('token', invalidTokens);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Supabase env is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await request.json() as PushRequest;

    if (!payload.userId || !payload.title || !payload.body) {
      return new Response(JSON.stringify({ error: 'userId, title, and body are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', payload.userId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const messages: ExpoPushMessage[] = tokens.map(({ token }) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
    }));

    const result = await sendPush(messages);
    await cleanupInvalidTokens(messages, result);

    return new Response(JSON.stringify({ sent: messages.length, result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
