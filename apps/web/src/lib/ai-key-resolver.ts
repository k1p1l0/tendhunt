import { dbConnect } from "@/lib/mongodb";
import { decrypt } from "@/lib/encryption";
import UserAiConfig from "@/models/user-ai-config";

const DEFAULT_SCORING_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_AGENT_MODEL = "claude-sonnet-4-5-20250929";

/**
 * Resolves the Anthropic API key for a given user.
 *
 * If the user has BYOK enabled and a validated key stored, returns the
 * decrypted user key. Otherwise falls back to the platform key from env.
 */
export async function getAnthropicKey(userId: string): Promise<string> {
  await dbConnect();

  const config = await UserAiConfig.findOne({ userId })
    .select("anthropicApiKey useOwnKey")
    .lean();

  if (config?.useOwnKey && config.anthropicApiKey) {
    try {
      return decrypt(config.anthropicApiKey);
    } catch {
      // Decryption failed — fall through to platform key
      console.error(
        `[ai-key-resolver] Failed to decrypt BYOK key for user ${userId}, using platform key`
      );
    }
  }

  const platformKey = process.env.ANTHROPIC_API_KEY;
  if (!platformKey) {
    throw new Error(
      `[ai-key-resolver] No ANTHROPIC_API_KEY configured and user ${userId} has no BYOK key`
    );
  }
  return platformKey;
}

/**
 * Returns the user's preferred scoring model, or the platform default.
 */
export async function getModelForScoring(userId: string): Promise<string> {
  await dbConnect();

  const config = await UserAiConfig.findOne({ userId })
    .select("preferredScoringModel")
    .lean();

  return config?.preferredScoringModel || DEFAULT_SCORING_MODEL;
}

/**
 * Returns the user's preferred agent model, or the platform default.
 */
export async function getModelForAgent(userId: string): Promise<string> {
  await dbConnect();

  const config = await UserAiConfig.findOne({ userId })
    .select("preferredAgentModel")
    .lean();

  return config?.preferredAgentModel || DEFAULT_AGENT_MODEL;
}
