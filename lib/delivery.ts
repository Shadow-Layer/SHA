import { Resend } from "resend";

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

type SendEmailResult = { sent: true } | { sent: false; reason: string };

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "not_configured" };
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || "SHA <noreply@sha.co.zw>";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      return { sent: false, reason: error.message ?? "Resend error" };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export function buildLandlordInviteEmail(params: {
  landlordName: string;
  claimUrl: string;
}): { subject: string; html: string } {
  const subject = "Your SHA landlord invite";
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <p style="font-size:15px;color:#111827;margin:0 0 16px;">Hi ${params.landlordName},</p>
    <p style="font-size:15px;color:#374151;margin:0 0 24px;">SHA (Student Housing Archive) has added your property to our platform.</p>
    <a href="${params.claimUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Claim Your Account</a>
    <p style="font-size:13px;color:#6b7280;margin:24px 0 0;">This link expires in 14 days.</p>
  </div>
</body>
</html>`;
  return { subject, html };
}

export function buildServiceProviderInviteEmail(params: {
  businessName: string;
  claimUrl: string;
}): { subject: string; html: string } {
  const subject = "Your SHA service provider invite";
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <p style="font-size:15px;color:#111827;margin:0 0 16px;">Hi ${params.businessName},</p>
    <p style="font-size:15px;color:#374151;margin:0 0 24px;">SHA (Student Housing Archive) has added your service to our platform.</p>
    <a href="${params.claimUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Claim Your Provider Account</a>
    <p style="font-size:13px;color:#6b7280;margin:24px 0 0;">This link expires in 7 days.</p>
  </div>
</body>
</html>`;
  return { subject, html };
}
