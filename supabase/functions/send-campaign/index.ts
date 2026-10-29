import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Recipient {
  customer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  segment: string;
  tier_name: string | null;
  total_spent: number;
}

function personalizeMessage(template: string, r: Recipient): string {
  const safeName = r.name || 'Valued Customer';
  const firstName = safeName.split(" ")[0] ?? safeName;
  const lastName = safeName.split(" ").slice(1).join(" ") ?? "";
  return template
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{last_name\}\}/g, lastName)
    .replace(/\{\{name\}\}/g, safeName)
    .replace(/\{\{email\}\}/g, r.email ?? "")
    .replace(/\{\{phone\}\}/g, r.phone ?? "")
    .replace(/\{\{segment\}\}/g, r.segment ?? "Standard")
    .replace(/\{\{loyalty_tier\}\}/g, r.tier_name ?? "Bronze")
    .replace(/\{\{total_spend\}\}/g, Number(r.total_spent || 0).toLocaleString());
}

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  let cleaned = phone.trim().replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }
  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    if (/^[1-9]\d{6,14}$/.test(digits)) {
      return cleaned;
    }
    return null;
  }
  if (/^\d{10}$/.test(cleaned)) {
    return `+1${cleaned}`;
  }
  if (/^[1-9]\d{10,14}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return null;
}

function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action ?? "send";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "runtime_diagnostics") {
      const diagnostics = {
        RESEND_API_KEY: Boolean(Deno.env.get("RESEND_API_KEY")?.trim()),
        RESEND_FROM_EMAIL: Boolean(Deno.env.get("RESEND_FROM_EMAIL")?.trim()),
        TWILIO_ACCOUNT_SID: Boolean(Deno.env.get("TWILIO_ACCOUNT_SID")?.trim()),
        TWILIO_AUTH_TOKEN: Boolean(Deno.env.get("TWILIO_AUTH_TOKEN")?.trim()),
        TWILIO_PHONE_NUMBER: Boolean(Deno.env.get("TWILIO_PHONE_NUMBER")?.trim()),
      };
      console.log("[runtime_diagnostics]", diagnostics);
      return new Response(JSON.stringify(diagnostics), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============ TEST CONNECTION ACTION ============
    if (action === "test_connection") {
      const resendKey = Deno.env.get("RESEND_API_KEY")?.trim() ?? "";
      const resendFrom = Deno.env.get("RESEND_FROM_EMAIL")?.trim() ?? "";

      const diagnostics = {
        api_key_configured: !!resendKey,
        sender_configured: !!resendFrom,
        sender_address: resendFrom,
        reached_resend: false,
        resend_status: null as number | null,
        resend_response: null as string | null,
        message: "",
      };

      if (!resendKey) {
        diagnostics.message = "RESEND_API_KEY is not configured in Edge Function secrets. Add it in the Supabase dashboard under Edge Function secrets.";
        return new Response(JSON.stringify({ diagnostics }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Use the send endpoint with dry_run to verify the key without actually sending
      // GET /domains requires broader permissions that a send-only key doesn't have
      try {
        const checkRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: "test@resend.dev",
            subject: "Configuration check",
            html: "<p>Configuration check</p>",
            dry_run: true,
          }),
        });
        diagnostics.reached_resend = true;
        diagnostics.resend_status = checkRes.status;

        if (checkRes.ok) {
          diagnostics.resend_response = "API key valid (send endpoint reachable).";
          diagnostics.message = `Resend API key is valid. Sender: ${resendFrom}.` +
            (resendFrom.includes("resend.dev")
              ? " Using Resend onboarding sender — emails can ONLY be sent to the address registered with your Resend account. To send to any email, verify your domain at https://resend.com/domains and set RESEND_FROM_EMAIL to your verified domain address."
              : " Custom domain sender configured.");
        } else {
          const errData = await checkRes.json().catch(() => ({}));
          diagnostics.resend_response = errData.message ?? `HTTP ${checkRes.status}`;
          if (checkRes.status === 401 || checkRes.status === 403) {
            diagnostics.message = `Resend API key rejected (HTTP ${checkRes.status}): ${diagnostics.resend_response}`;
          } else {
            diagnostics.message = `Resend API returned HTTP ${checkRes.status}: ${diagnostics.resend_response}`;
          }
        }
      } catch (err) {
        diagnostics.message = `Failed to reach Resend API: ${String(err)}`;
      }

      return new Response(JSON.stringify({ diagnostics }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============ TEST SEND ACTION ============
    if (action === "test_send") {
      const { to_email, subject, message } = body;

      if (!to_email || !isValidEmail(to_email)) {
        return new Response(JSON.stringify({ error: "A valid test email address is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const resendKey = Deno.env.get("RESEND_API_KEY")?.trim() ?? "";
      const resendFrom = Deno.env.get("RESEND_FROM_EMAIL")?.trim() ?? "";

      if (!resendKey || !resendFrom) {
        return new Response(JSON.stringify({
          error: "RESEND_API_KEY or RESEND_FROM_EMAIL is not configured. Add both in the Supabase dashboard under Edge Function secrets.",
          api_key_configured: !!resendKey,
          sender_configured: !!resendFrom,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const testSubject = subject ?? "BandhanAI Test Email";
      const testHtml = (message ?? "This is a test email from BandhanAI CRM. If you received this, email delivery is working correctly.").replace(/\n/g, "<br>");

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: to_email,
            subject: testSubject,
            html: testHtml,
          }),
        });

        const data = await res.json();

        if (res.ok && data.id) {
          return new Response(JSON.stringify({
            success: true,
            message: `Test email accepted by Resend. Message ID: ${data.id}`,
            provider_message_id: data.id,
            sender: resendFrom,
            recipient: to_email,
            resend_status: res.status,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } else {
          return new Response(JSON.stringify({
            success: false,
            error: data.message ?? data.error ?? `Resend returned HTTP ${res.status}`,
            resend_status: res.status,
            sender: resendFrom,
            recipient: to_email,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (err) {
        return new Response(JSON.stringify({
          success: false,
          error: `Network error reaching Resend: ${String(err)}`,
          sender: resendFrom,
          recipient: to_email,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ============ TEST SMS CONNECTION ACTION ============
    if (action === "test_sms_connection") {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

      console.log("[test_sms_connection] invoked", {
        sid_configured: !!twilioSid,
        token_configured: !!twilioToken,
        phone_configured: !!twilioPhone,
        phone_value: twilioPhone ?? null,
      });

      const diagnostics = {
        sid_configured: !!twilioSid,
        token_configured: !!twilioToken,
        phone_configured: !!twilioPhone,
        phone_number: twilioPhone ?? null,
        reached_twilio: false,
        twilio_status: null as number | null,
        twilio_response: null as string | null,
        message: "",
      };

      if (!twilioSid || !twilioToken || !twilioPhone) {
        const missing: string[] = [];
        if (!twilioSid) missing.push("TWILIO_ACCOUNT_SID");
        if (!twilioToken) missing.push("TWILIO_AUTH_TOKEN");
        if (!twilioPhone) missing.push("TWILIO_PHONE_NUMBER");
        diagnostics.message = `Missing Twilio secrets: ${missing.join(", ")}. Add them in Supabase Dashboard → Edge Functions → Secrets.`;
        return new Response(JSON.stringify({ diagnostics }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Verify credentials by fetching the account (lightweight GET)
      try {
        const auth = btoa(`${twilioSid}:${twilioToken}`);
        const checkRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}.json`, {
          method: "GET",
          headers: { "Authorization": `Basic ${auth}` },
        });
        diagnostics.reached_twilio = true;
        diagnostics.twilio_status = checkRes.status;

        if (checkRes.ok) {
          const acctData = await checkRes.json();
          diagnostics.twilio_response = `Account verified: ${acctData.friendly_name ?? acctData.status} (type: ${acctData.type ?? "unknown"})`;
          diagnostics.message = `Twilio credentials valid. Sender: ${twilioPhone}. Ready to send SMS.`;
        } else {
          const errData = await checkRes.json().catch(() => ({}));
          diagnostics.twilio_response = errData.message ?? `HTTP ${checkRes.status}`;
          diagnostics.message = `Twilio rejected credentials (HTTP ${checkRes.status}): ${diagnostics.twilio_response}`;
        }
      } catch (err) {
        diagnostics.message = `Failed to reach Twilio API: ${String(err)}`;
      }

      console.log("[test_sms_connection] result", { status: diagnostics.twilio_status, reached: diagnostics.reached_twilio });
      return new Response(JSON.stringify({ diagnostics }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============ TEST SMS SEND ACTION ============
    if (action === "test_sms_send") {
      const { to_phone, message: smsMessage } = body;

      if (!to_phone) {
        return new Response(JSON.stringify({ error: "A test phone number is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const normalized = normalizePhone(to_phone);
      if (!normalized) {
        return new Response(JSON.stringify({ error: `Invalid phone number format: ${to_phone}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

      console.log("[test_sms_send] invoked", { to: normalized, sid_configured: !!twilioSid, phone_configured: !!twilioPhone });

      if (!twilioSid || !twilioToken || !twilioPhone) {
        return new Response(JSON.stringify({
          success: false,
          error: "Twilio credentials not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to Edge Function secrets.",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const testMsg = smsMessage ?? "This is a test SMS from BandhanAI CRM. If you received this, SMS delivery is working correctly.";
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const auth = btoa(`${twilioSid}:${twilioToken}`);

      try {
        const reqBody = new URLSearchParams();
        reqBody.append("From", twilioPhone);
        reqBody.append("To", normalized);
        reqBody.append("Body", testMsg);

        const res = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: reqBody.toString(),
        });

        const data = await res.json().catch(() => ({}));
        console.log("[test_sms_send] Twilio response", { http_status: res.status, sid: data.sid ?? null, error_code: data.code ?? null });

        const isTwilioSuccess = res.ok && data.sid && !data.error_code && data.status !== "failed" && data.status !== "undelivered";

        if (isTwilioSuccess) {
          return new Response(JSON.stringify({
            success: true,
            message: `Test SMS accepted by Twilio. Message SID: ${data.sid}`,
            provider_message_id: data.sid,
            sender: twilioPhone,
            recipient: normalized,
            twilio_status: res.status,
            twilio_code: data.code ?? null,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } else {
          let errDetail = data.message ?? `Twilio returned HTTP ${res.status}`;
          if (data.code === 572006 || String(data.code) === "572006") {
            errDetail = `[Twilio 572006] ${data.message || 'Freeform message not allowed'}. Trial accounts cannot send freeform messages to unverified numbers. Either verify this recipient number in the Twilio Console (Phone Numbers > Verified Caller IDs) or use an approved template.`;
          } else if (data.code) {
            errDetail = `[Twilio ${data.code}] ${data.message}`;
          }

          return new Response(JSON.stringify({
            success: false,
            error: errDetail,
            twilio_status: res.status,
            twilio_code: data.code ?? null,
            twilio_more_info: data.more_info ?? null,
            sender: twilioPhone,
            recipient: normalized,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (err) {
        return new Response(JSON.stringify({
          success: false,
          error: `Network error reaching Twilio: ${String(err)}`,
          sender: twilioPhone,
          recipient: normalized,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ============ SEND CAMPAIGN ACTION ============
    const { campaign_id, channel, subject, message, recipient_ids, dataset_id } = body;

    if (!campaign_id || !channel || !message || !recipient_ids?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: campaign_id, channel, message, recipient_ids" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[send-campaign] invoked", { channel, campaign_id, action, recipient_count: recipient_ids?.length ?? 0, dataset_id: dataset_id ?? null });

    // Fetch recipients with customer data (scoped to user and active dataset if provided)
    let custQuery = supabase
      .from("customers")
      .select("id, name, email, phone, segment, total_spent, email_opt_out, sms_opt_out, whatsapp_opt_out, dataset_id")
      .in("id", recipient_ids)
      .eq("user_id", user.id);

    if (dataset_id) {
      custQuery = custQuery.eq("dataset_id", dataset_id);
    }

    const { data: customers, error: custError } = await custQuery;

    if (custError) throw custError;
    if (!customers?.length) {
      return new Response(JSON.stringify({ error: "No valid recipients found in active dataset" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch loyalty tiers for personalization
    const { data: loyalty } = await supabase
      .from("loyalty_accounts")
      .select("customer_id, tier_name")
      .in("customer_id", recipient_ids);

    const tierMap: Record<string, string> = {};
    (loyalty ?? []).forEach((l) => { tierMap[l.customer_id] = l.tier_name; });

    // Filter valid recipients based on channel and opt-out
    const validRecipients: Recipient[] = [];
    const skipped: { customer_id: string; reason: string }[] = [];

    for (const c of customers) {
      const optOut = channel === "Email" ? c.email_opt_out : channel === "SMS" ? c.sms_opt_out : c.whatsapp_opt_out;
      if (optOut) {
        skipped.push({ customer_id: c.id, reason: "Opted out" });
        continue;
      }
      if (channel === "Email") {
        if (!c.email) {
          skipped.push({ customer_id: c.id, reason: "No email address" });
          continue;
        }
        if (!isValidEmail(c.email)) {
          skipped.push({ customer_id: c.id, reason: "Invalid email format" });
          continue;
        }
      }
      if ((channel === "SMS" || channel === "WhatsApp") && !c.phone) {
        skipped.push({ customer_id: c.id, reason: "No phone number" });
        continue;
      }
      if (channel === "SMS" || channel === "WhatsApp") {
        const normalized = normalizePhone(c.phone!);
        if (!normalized) {
          skipped.push({ customer_id: c.id, reason: "Invalid phone number format for E.164 delivery" });
          continue;
        }
      }
      validRecipients.push({
        customer_id: c.id,
        name: c.name,
        email: c.email ? c.email.trim() : null,
        phone: c.phone,
        segment: c.segment,
        tier_name: tierMap[c.id] ?? null,
        total_spent: Number(c.total_spent),
      });
    }

    if (validRecipients.length === 0) {
      await supabase.from("campaigns").update({ status: "failed", end_date: new Date().toISOString() }).eq("id", campaign_id);
      return new Response(JSON.stringify({
        sent: 0, failed: 0, provider_configured: false,
        message: "No valid recipients available for delivery. See skipped list for details.",
        skipped, total_recipients: 0, errors: ["No valid recipient addresses"],
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create campaign_recipients records (pending)
    const recipientRecords = validRecipients.map((r) => ({
      campaign_id,
      customer_id: r.customer_id,
      channel,
      recipient: channel === "Email" ? r.email : normalizePhone(r.phone!),
      personalized_content: personalizeMessage(message, r),
      status: "pending",
      user_id: user.id,
    }));

    const { data: insertedRecipients, error: insertError } = await supabase
      .from("campaign_recipients")
      .insert(recipientRecords)
      .select("id, customer_id, recipient, personalized_content");

    if (insertError) throw insertError;

    // Check provider credentials. Never fall back to embedded secret values; runtime must use the actual project secrets.
    const resendKey = Deno.env.get("RESEND_API_KEY")?.trim() ?? "";
    const resendFrom = Deno.env.get("RESEND_FROM_EMAIL")?.trim() ?? "";
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim() ?? "";
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim() ?? "";
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER")?.trim() ?? "";
    const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim() ?? "";
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim() ?? "";

    const results: {
      sent: number;
      failed: number;
      provider_configured: boolean;
      message: string;
      errors: string[];
      provider_message_ids: string[];
    } = {
      sent: 0,
      failed: 0,
      provider_configured: false,
      message: "",
      errors: [],
      provider_message_ids: [],
    };
    const providerErrors: string[] = [];

    if (channel === "Email") {
      console.log("[send-campaign] email provider diagnostics", {
        function_reached: true,
        authenticated_user: Boolean(user),
        RESEND_API_KEY: Boolean(resendKey),
        RESEND_FROM_EMAIL: Boolean(resendFrom),
        request_channel: channel,
      });

      if (!resendKey || !resendFrom) {
        results.message = "Email provider (Resend) is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL to Edge Function secrets in the Supabase dashboard.";
        results.errors.push("Missing RESEND_API_KEY or RESEND_FROM_EMAIL secret");
        await supabase.from("campaign_recipients").update({ status: "failed", error_message: "Email provider not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL)" }).in("id", (insertedRecipients ?? []).map((r) => r.id));
        await supabase.from("campaigns").update({ status: "failed", end_date: new Date().toISOString() }).eq("id", campaign_id);
        return new Response(JSON.stringify({ ...results, skipped, total_recipients: validRecipients.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      results.provider_configured = true;

      for (const rec of insertedRecipients ?? []) {
        try {
          await supabase.from("campaign_recipients").update({ status: "sending" }).eq("id", rec.id);

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: resendFrom,
              to: rec.recipient,
              subject: subject ?? "Campaign Message",
              html: rec.personalized_content?.replace(/\n/g, "<br>") ?? message,
            }),
          });
          const data = await res.json().catch(() => ({}));
          const isResendSuccess = res.ok && data.id;
          console.log("[send-campaign] email provider response", {
            request_channel: channel,
            provider_response_http_status: res.status,
            accepted: Boolean(isResendSuccess),
          });

          if (isResendSuccess) {
            await supabase.from("campaign_recipients").update({
              status: "sent",
              provider_message_id: data.id,
              sent_at: new Date().toISOString(),
            }).eq("id", rec.id);
            results.sent++;
            results.provider_message_ids.push(data.id);
          } else {
            const rawErr = data.message ?? data.error ?? (data.statusCode ? `Resend ${data.statusCode}: ${data.name || ''}` : `Resend returned HTTP ${res.status}`);
            const helpfulMsg = resendFrom.includes("resend.dev") && (res.status === 403 || res.status === 400 || (typeof rawErr === "string" && rawErr.toLowerCase().includes("only send to")))
              ? `[Resend ${res.status}] ${rawErr}. NOTE: onboarding@resend.dev can ONLY deliver to the email address registered with your Resend account. To send to customers, verify your domain at https://resend.com/domains and set RESEND_FROM_EMAIL.`
              : `[Resend ${res.status || 'Error'}] ${rawErr}`;

            await supabase.from("campaign_recipients").update({
              status: "failed",
              error_message: helpfulMsg,
            }).eq("id", rec.id);
            results.failed++;
            providerErrors.push(helpfulMsg);
          }
        } catch (err) {
          const netErr = `Network error calling Resend API: ${String(err)}`;
          await supabase.from("campaign_recipients").update({
            status: "failed",
            error_message: netErr,
          }).eq("id", rec.id);
          results.failed++;
          providerErrors.push(netErr);
        }
      }

      results.errors = [...new Set(providerErrors)];
      results.message = results.failed === 0
        ? `All ${results.sent} emails delivered successfully via Resend.`
        : results.sent === 0
          ? `All ${results.failed} emails failed via Resend: ${results.errors[0] || 'Unknown error'}`
          : `${results.sent} sent, ${results.failed} failed via Resend. Error: ${results.errors[0] || 'Unknown error'}`;
    } else if (channel === "SMS") {
      console.log("[send-campaign] SMS channel invoked", {
        campaign_id,
        recipient_count: recipient_ids.length,
        valid_recipients: validRecipients.length,
        sid_configured: !!twilioSid,
        token_configured: !!twilioToken,
        phone_configured: !!twilioPhone,
      });

      if (!twilioSid || !twilioToken || !twilioPhone) {
        const missing: string[] = [];
        if (!twilioSid) missing.push("TWILIO_ACCOUNT_SID");
        if (!twilioToken) missing.push("TWILIO_AUTH_TOKEN");
        if (!twilioPhone) missing.push("TWILIO_PHONE_NUMBER");
        results.message = `SMS provider (Twilio) is not configured. Missing: ${missing.join(", ")}. Add them in Supabase Dashboard → Edge Functions → Secrets.`;
        results.errors.push(`Missing Twilio credentials: ${missing.join(", ")}`);
        await supabase.from("campaign_recipients").update({ status: "failed", error_message: `SMS provider not configured: missing ${missing.join(", ")}` }).in("id", (insertedRecipients ?? []).map((r) => r.id));
        await supabase.from("campaigns").update({ status: "failed", end_date: new Date().toISOString() }).eq("id", campaign_id);
        return new Response(JSON.stringify({ ...results, skipped, total_recipients: validRecipients.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      results.provider_configured = true;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const auth = btoa(`${twilioSid}:${twilioToken}`);

      for (const rec of insertedRecipients ?? []) {
        try {
          await supabase.from("campaign_recipients").update({ status: "sending" }).eq("id", rec.id);

          const reqBody = new URLSearchParams();
          reqBody.append("From", twilioPhone);
          reqBody.append("To", rec.recipient ?? "");
          reqBody.append("Body", rec.personalized_content ?? message);

          const res = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: reqBody.toString(),
          });
          const data = await res.json().catch(() => ({}));
          console.log("[send-campaign] Twilio response", {
            recipient: rec.recipient,
            http_status: res.status,
            sid: data.sid ?? null,
            error_code: data.code ?? null,
          });

          const isTwilioSuccess = res.ok && data.sid && !data.error_code && data.status !== "failed" && data.status !== "undelivered";

          if (isTwilioSuccess) {
            await supabase.from("campaign_recipients").update({
              status: "sent",
              provider_message_id: data.sid,
              sent_at: new Date().toISOString(),
            }).eq("id", rec.id);
            results.sent++;
            results.provider_message_ids.push(data.sid);
          } else {
            let errDetail = data.message ?? `Twilio returned HTTP ${res.status}`;
            if (data.code === 572006 || String(data.code) === "572006") {
              errDetail = `[Twilio 572006] ${data.message || 'Freeform message not allowed'}. Trial accounts cannot send freeform messages to unverified numbers. Either verify recipient numbers in Twilio Console (Phone Numbers > Verified Caller IDs) or use an approved template.`;
            } else if (data.code) {
              errDetail = `[Twilio ${data.code}] ${data.message}`;
            }

            await supabase.from("campaign_recipients").update({
              status: "failed",
              error_message: errDetail,
            }).eq("id", rec.id);
            results.failed++;
            providerErrors.push(errDetail);
          }
        } catch (err) {
          const netErr = `Network error calling Twilio API: ${String(err)}`;
          await supabase.from("campaign_recipients").update({
            status: "failed",
            error_message: netErr,
          }).eq("id", rec.id);
          results.failed++;
          providerErrors.push(netErr);
        }
      }

      results.errors = [...new Set(providerErrors)];
      results.message = results.failed === 0
        ? `All ${results.sent} SMS messages sent successfully via Twilio.`
        : results.sent === 0
          ? `All ${results.failed} SMS sends failed via Twilio: ${results.errors[0] || 'Unknown provider error'}`
          : `${results.sent} sent, ${results.failed} failed via Twilio. Error: ${results.errors[0] || 'Unknown provider error'}`;
    } else if (channel === "WhatsApp") {
      if (!whatsappToken || !whatsappPhoneId) {
        results.message = "WhatsApp API is not configured. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to Edge Function secrets.";
        results.errors.push("Missing WhatsApp secrets");
        await supabase.from("campaign_recipients").update({ status: "failed", error_message: "WhatsApp provider not configured" }).in("id", (insertedRecipients ?? []).map((r) => r.id));
        await supabase.from("campaigns").update({ status: "failed", end_date: new Date().toISOString() }).eq("id", campaign_id);
        return new Response(JSON.stringify({ ...results, skipped, total_recipients: validRecipients.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      results.provider_configured = true;

      const waUrl = `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`;

      for (const rec of insertedRecipients ?? []) {
        try {
          await supabase.from("campaign_recipients").update({ status: "sending" }).eq("id", rec.id);

          const res = await fetch(waUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${whatsappToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: (rec.recipient ?? "").replace("+", ""),
              type: "text",
              text: { body: rec.personalized_content ?? message },
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.messages?.[0]?.id) {
            await supabase.from("campaign_recipients").update({
              status: "sent",
              provider_message_id: data.messages[0].id,
              sent_at: new Date().toISOString(),
            }).eq("id", rec.id);
            results.sent++;
          } else {
            const waErr = data.error?.message ?? `WhatsApp API HTTP ${res.status}`;
            await supabase.from("campaign_recipients").update({
              status: "failed",
              error_message: waErr,
            }).eq("id", rec.id);
            results.failed++;
            providerErrors.push(waErr);
          }
        } catch (err) {
          const netErr = `Network error calling WhatsApp API: ${String(err)}`;
          await supabase.from("campaign_recipients").update({
            status: "failed",
            error_message: netErr,
          }).eq("id", rec.id);
          results.failed++;
          providerErrors.push(netErr);
        }
      }

      results.errors = [...new Set(providerErrors)];
      results.message = `${results.sent} sent, ${results.failed} failed via WhatsApp.`;
    }

    // Update campaign status
    const finalCampaignStatus = results.failed === 0 && results.sent > 0
      ? "sent"
      : results.sent > 0 && results.failed > 0
        ? "partially_failed"
        : "failed";

    await supabase.from("campaigns").update({
      status: finalCampaignStatus,
      end_date: new Date().toISOString(),
    }).eq("id", campaign_id);

    return new Response(
      JSON.stringify({ ...results, skipped, total_recipients: validRecipients.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

    return new Response(
      JSON.stringify({ ...results, skipped, total_recipients: validRecipients.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
