// Supabase Edge Function: mycmail-webhook
// Triggers on new messages and sends webhook notifications to Zapier/other services
//
// Security hardening (2025-12-26):
// - Message body NOT included by default (set WEBHOOK_INCLUDE_BODY=true to enable)
// - Agent filter support (set WEBHOOK_AGENT_FILTER=agent1,agent2 to limit)
// - Encrypted messages are flagged but body always redacted unless explicitly enabled

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface WebhookPayload {
  event: 'message.received';
  timestamp: string;
  message: {
    id: string;
    from_agent: string;
    to_agent: string;
    subject: string;
    body?: string;  // Only included if WEBHOOK_INCLUDE_BODY=true
    body_redacted: boolean;
    encrypted: boolean;
    created_at: string;
  };
}

interface WebhookTarget {
  url: string;
  headers?: Record<string, string>;
  retries?: number;
}

/**
 * Send webhook with retry logic
 */
async function sendWebhook(
  target: WebhookTarget,
  payload: WebhookPayload
): Promise<{ success: boolean; error?: string }> {
  const maxRetries = target.retries || 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(target.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Myceliumail-Webhook/1.1',
          ...target.headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ Webhook delivered (attempt ${attempt}/${maxRetries})`);
        return { success: true };
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Webhook attempt ${attempt}/${maxRetries} failed:`, error);

      // Exponential backoff
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error'
  };
}

/**
 * Main Edge Function handler
 */
serve(async (req) => {
  try {
    // Parse webhook trigger payload from Supabase
    const { record, table, type } = await req.json();

    // Only process INSERT events on agent_messages table
    if (table !== 'agent_messages' || type !== 'INSERT') {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Not a message insert' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Security: Check agent filter
    const agentFilter = Deno.env.get('WEBHOOK_AGENT_FILTER')?.split(',').map(a => a.trim()) || [];
    if (agentFilter.length > 0 && !agentFilter.includes(record.to_agent)) {
      console.log(`⏭️ Skipping webhook: ${record.to_agent} not in agent filter`);
      return new Response(
        JSON.stringify({ skipped: true, reason: `Agent ${record.to_agent} not in filter` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Security: Check if body should be included (default: NO)
    const includeBody = Deno.env.get('WEBHOOK_INCLUDE_BODY')?.toLowerCase() === 'true';

    // Build webhook payload (metadata only by default)
    const payload: WebhookPayload = {
      event: 'message.received',
      timestamp: new Date().toISOString(),
      message: {
        id: record.id,
        from_agent: record.from_agent,
        to_agent: record.to_agent,
        subject: record.subject,
        body_redacted: !includeBody,
        encrypted: record.encrypted || false,
        created_at: record.created_at,
      },
    };

    // Only include body if explicitly enabled AND message is not encrypted
    if (includeBody && !record.encrypted) {
      payload.message.body = record.message;
    } else if (includeBody && record.encrypted) {
      console.log('⚠️ Body requested but message is encrypted - redacting');
    }

    // Get webhook targets from environment
    const webhookUrls = Deno.env.get('WEBHOOK_URLS')?.split(',') || [];
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

    if (webhookUrls.length === 0) {
      console.warn('⚠️ No WEBHOOK_URLS configured');
      return new Response(
        JSON.stringify({ skipped: true, reason: 'No webhooks configured' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send to all configured webhooks in parallel
    const results = await Promise.all(
      webhookUrls.map(url =>
        sendWebhook(
          {
            url: url.trim(),
            headers: webhookSecret ? { 'X-Webhook-Secret': webhookSecret } : {},
            retries: 3,
          },
          payload
        )
      )
    );

    const successCount = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success);

    console.log(`📊 Webhooks: ${successCount}/${webhookUrls.length} succeeded`);

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        delivered: successCount,
        total: webhookUrls.length,
        body_included: includeBody && !record.encrypted,
        failures: failures.map(f => f.error),
      }),
      {
        status: successCount > 0 ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Edge Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
