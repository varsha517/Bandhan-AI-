import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (typeof error === 'object' && error !== null && 'context' in error) {
    const context = error.context;
    if (context instanceof Response) {
      const body: unknown = await context.clone().json().catch(() => null);
      if (typeof body === 'object' && body !== null) {
        const payload = body as { error?: unknown; message?: unknown };
        if (typeof payload.error === 'string') return payload.error;
        if (typeof payload.message === 'string') return payload.message;
      }

      return `Edge Function returned HTTP ${context.status}`;
    }

    if (context instanceof Error) {
      return `Failed to reach the Edge Function: ${context.message}`;
    }
  }

  return error instanceof Error ? error.message : String(error);
}

export async function invokeSendCampaign<T>(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<T>('send-campaign', { body });
  if (error) {
    return { data: null, error: await getFunctionErrorMessage(error) };
  }

  return { data, error: null };
}
