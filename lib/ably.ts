const ABLY_CAPABILITY = JSON.stringify({
  "*": ["publish", "subscribe", "presence", "history"],
});

async function getAblyModule() {
  const ablyModule = await import("ably");
  return ("default" in ablyModule ? ablyModule.default : ablyModule) as typeof import("ably");
}

export function getAblyApiKey() {
  const apiKey = process.env.ABLY_API_KEY?.trim();
  return apiKey && apiKey.length > 0 ? apiKey : null;
}

export async function createAblyRestClient() {
  const apiKey = getAblyApiKey();
  if (!apiKey) {
    return null;
  }

  const Ably = await getAblyModule();
  return new Ably.Rest({ key: apiKey });
}

export async function createAblyTokenRequest(clientId: string) {
  const client = await createAblyRestClient();
  if (!client) {
    return null;
  }

  return client.auth.createTokenRequest({
    clientId,
    capability: ABLY_CAPABILITY,
  });
}

export async function publishInboxEvent(
  conversationId: string,
  eventName: string,
  data: Record<string, unknown>,
) {
  const client = await createAblyRestClient();
  if (!client) {
    return false;
  }

  await client.channels.get(`inbox:${conversationId}`).publish(eventName, data);
  return true;
}
