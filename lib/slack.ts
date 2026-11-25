// Posts a line to the 9SM Slack workspace through an incoming webhook.
// Does nothing until SLACK_WEBHOOK_URL is set in Vercel, and never blocks or
// fails the action that called it.
export async function notifySlack(text: string, memberId?: string | null) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const mention = memberId && /^[UW][A-Z0-9]+$/.test(memberId) ? `<@${memberId}> ` : "";
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: mention + text }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Slack being down must not stop a client's request from saving.
  }
}
