import { Resend } from "resend";

export async function sendWaitlistReleaseEmail(input: {
  to: string;
  name: string;
  waitlistEntryId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
  }

  const intakeUrl = `${appUrl}/intake?wid=${input.waitlistEntryId}`;
  const resend = new Resend(apiKey);
  const firstName = input.name.trim().split(/\s+/)[0] || "there";

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: "You're in — complete your Fera intake",
    html: `
      <p>Hi ${firstName},</p>
      <p>A spot is open for you on Fera. Take a few minutes to complete your intake so we can prepare your snapshot.</p>
      <p><a href="${intakeUrl}">Start your intake</a></p>
      <p>If the link does not work, copy this into your browser:<br/>${intakeUrl}</p>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }
}
