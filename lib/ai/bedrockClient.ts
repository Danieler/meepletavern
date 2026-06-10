import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

let bedrockClient: BedrockRuntimeClient | null = null;

export function getBedrockRuntimeClient() {
  const region = process.env.AWS_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Bedrock credentials are not configured");
  }

  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {})
      }
    });
  }

  return bedrockClient;
}
