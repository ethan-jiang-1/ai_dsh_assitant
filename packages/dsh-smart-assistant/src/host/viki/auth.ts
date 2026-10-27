/**
 * Where the OpenViking API key comes from.
 *
 * A key is a secret: the environment is the durable, non-exported home for it, and the config
 * value exists only for backward compatibility with homes that predate `apiKeyEnv`. The
 * resolution order is deliberate — an inline config value is plaintext in the profile patch,
 * so it must never win over an environment variable with the same purpose.
 *
 * @module dsh-smart-assistant/host/viki/auth
 */

/** The config fields that decide where the API key is read from. */
export interface VikiAuthConfig {
  /** Deprecated inline key; plaintext in the profile patch. Kept for old homes. */
  readonly apiKey?: string
  /** Environment variable that holds the key; defaults to {@link DEFAULT_VIKI_API_KEY_ENV}. */
  readonly apiKeyEnv?: string
}

/** Default environment variable holding the OpenViking API key. */
export const DEFAULT_VIKI_API_KEY_ENV = 'OPENVIKING_API_KEY'

/** Where a resolved key came from, so the caller can warn without printing the value. */
export interface VikiApiKeyResolution {
  /** Resolved key, or undefined when neither source has one. */
  readonly apiKey?: string
  /** `env` is the supported source; `config` is deprecated; `none` means unauthenticated. */
  readonly source: 'env' | 'config' | 'none'
  /** Environment variable that was consulted, even when empty. */
  readonly envName: string
}

/**
 * Resolve the OpenViking API key without ever logging it.
 * @param config - The plugin config.
 * @param env - Environment mapping; defaults to the process environment.
 * @returns The key, its source, and the env variable name consulted.
 */
export function resolveVikiApiKey(
  config: VikiAuthConfig,
  env: Readonly<Record<string, string | undefined>> = process.env,
): VikiApiKeyResolution {
  const envName = config.apiKeyEnv?.trim() || DEFAULT_VIKI_API_KEY_ENV
  const fromEnv = env[envName]?.trim()
  if (fromEnv !== undefined && fromEnv !== '') return { apiKey: fromEnv, source: 'env', envName }
  const inline = config.apiKey?.trim()
  if (inline !== undefined && inline !== '') return { apiKey: inline, source: 'config', envName }
  return { source: 'none', envName }
}
