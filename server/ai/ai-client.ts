import { PROMPT_VERSION, buildTailorPrompt } from "./resume-tailor";
import { resumeTailorOutputSchema, type ResumeTailorOutput } from "@/server/resume/resume-schema";

/**
 * Server-side AI client for resume tailoring.
 *
 * Two providers are supported and both are called server-side only - API keys
 * are read from the environment at call time and are never returned to, or
 * referenced by, the browser:
 *
 *   - Google Gemini  (GEMINI_API_KEY, optional GEMINI_MODEL)
 *   - Groq           (GROQ_API_KEY,   optional GROQ_MODEL)
 *
 * When both keys are present the preferred provider is tried first and the
 * other is used as an automatic fallback. This matters in practice: a Gemini
 * key can be valid but have its project denied access (HTTP 403), in which case
 * falling back to Groq keeps the admin workflow usable.
 *
 * The provider list, endpoints, env var names and default models live in the
 * `PROVIDERS` registry below - adding a provider means adding one entry there
 * plus one entry in `PROVIDER_CALLERS`, nothing else.
 */

const REQUEST_TIMEOUT_MS = 60_000;

export type AiProvider = "gemini" | "groq";

/**
 * Single source of truth for every provider. Adding a third provider means
 * adding one entry here plus a matching entry in `PROVIDER_CALLERS` - nothing
 * else in the codebase hardcodes a provider name or env var.
 */
interface ProviderConfig {
  /** Admin-facing name, also used in error messages. */
  readonly label: string;
  readonly endpoint: string;
  readonly apiKeyEnv: string;
  readonly modelEnv: string;
  readonly defaultModel: string;
}

const PROVIDERS: Record<AiProvider, ProviderConfig> = {
  gemini: {
    label: "Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    apiKeyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    defaultModel: "gemini-3.8-flash",
  },
  groq: {
    label: "Groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    apiKeyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "openai/gpt-oss-120b",
  },
};

/** Providers that currently have a key configured, in preference order. */
export const PROVIDER_ORDER: readonly AiProvider[] = ["gemini", "groq"];

const ENV_KEYS: Record<AiProvider, string> = {
  gemini: PROVIDERS.gemini.apiKeyEnv,
  groq: PROVIDERS.groq.apiKeyEnv,
};

const MODEL_ENV_KEYS: Record<AiProvider, string> = {
  gemini: PROVIDERS.gemini.modelEnv,
  groq: PROVIDERS.groq.modelEnv,
};

/** Error codes surfaced to the admin UI. Never contains the API key. */
export type TailorErrorCode =
  | "MISSING_API_KEY"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INVALID_RESPONSE"
  | "SCHEMA_MISMATCH"
  | "TIMEOUT";

export class TailorError extends Error {
  readonly code: TailorErrorCode;
  /** Safe to show to an admin; contains no secrets or stack traces. */
  readonly adminMessage: string;

  constructor(code: TailorErrorCode, adminMessage: string, internal?: string) {
    super(internal ? `${adminMessage} (${internal})` : adminMessage);
    this.name = "TailorError";
    this.code = code;
    this.adminMessage = adminMessage;
  }
}

function apiKeyFor(provider: AiProvider): string | undefined {
  const key = process.env[ENV_KEYS[provider]];
  return key?.trim() || undefined;
}

function modelFor(provider: AiProvider): string {
  return process.env[MODEL_ENV_KEYS[provider]]?.trim() || PROVIDERS[provider].defaultModel;
}

/** Providers that currently have a key configured, in preference order. */
export function getConfiguredProviders(): AiProvider[] {
  return PROVIDER_ORDER.filter((provider) => apiKeyFor(provider) !== undefined);
}

/** True when at least one AI provider is usable. */
export function isAiConfigured(): boolean {
  return getConfiguredProviders().length > 0;
}

/**
 * Actionable message for the admin when no provider is usable. Derived from the
 * provider registry so it can never drift from the keys actually read.
 */
export function missingKeyMessage(): string {
  const keys = PROVIDER_ORDER.map((provider) => PROVIDERS[provider].apiKeyEnv);
  return `No AI provider is configured. Add ${keys.join(" and/or ")} to .env and restart the server.`;
}

/** Human-readable description of the active provider setup, for the admin UI. */
export function describeAiConfiguration(): string {
  const providers = getConfiguredProviders();
  if (providers.length === 0) return "none";
  return providers.map((p) => `${PROVIDERS[p].label} (${modelFor(p)})`).join(", ");
}

export interface TailorResumeInput {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  location?: string | null;
  notes?: string | null;
  canonicalResume: unknown;
}

export interface TailorResumeResult {
  output: ResumeTailorOutput;
  model: string;
  provider: AiProvider;
  promptVersion: string;
}

// ---------------------------------------------------------------------------
// Provider calls
// ---------------------------------------------------------------------------

/** Sends the prompt to one provider and returns the raw text it produced. */
type ProviderCaller = (prompt: string, apiKey: string, model: string) => Promise<string>;

/**
 * Shared request runner: same timeout, same error mapping and the same
 * admin-safe messages for every provider, so a new provider only has to supply
 * its URL, body and a way to read the text back out.
 */
async function postToProvider(
  provider: AiProvider,
  request: { url: string; headers?: Record<string, string>; body: unknown },
  extract: (payload: unknown) => string,
): Promise<string> {
  const { label } = PROVIDERS[provider];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...request.headers },
      signal: controller.signal,
      body: JSON.stringify(request.body),
    });

    const payload: unknown = await response.json().catch(() => ({}));

    if (response.status === 429) {
      throw new TailorError(
        "RATE_LIMITED",
        `${label} rate limit reached. Wait a moment and try generating again.`,
      );
    }

    if (!response.ok) {
      // The upstream message can be useful for an admin but never includes our key.
      const detail = upstreamErrorMessage(payload) ?? `HTTP ${response.status}`;
      throw new TailorError("UPSTREAM_ERROR", `${label} API request failed.`, detail);
    }

    const text = extract(payload);
    if (!text) {
      throw new TailorError("INVALID_RESPONSE", `${label} returned an empty response.`);
    }
    return text;
  } catch (error) {
    if (error instanceof TailorError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new TailorError("TIMEOUT", `${label} took too long to respond. Please try again.`);
    }
    throw new TailorError(
      "UPSTREAM_ERROR",
      `Could not reach the ${label} API.`,
      (error as Error).message,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Best-effort read of an upstream error message across provider payload shapes. */
function upstreamErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return undefined;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

interface GroqResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  error?: { message?: string; type?: string; code?: string };
}

/**
 * Models occasionally wrap JSON in markdown fences or add a sentence of
 * preamble despite instructions. Strip those before parsing rather than
 * failing the whole generation.
 */
function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return candidate.trim();
  return candidate.slice(start, end + 1);
}

function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  return postToProvider(
    "gemini",
    {
      url: `${PROVIDERS.gemini.endpoint}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      body: {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          // Ask for JSON natively; the response is still validated afterwards
          // because a structured response is not a guarantee of correctness.
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      },
    },
    (payload) => {
      const gemini = payload as GeminiResponse;
      if (gemini.promptFeedback?.blockReason) {
        throw new TailorError(
          "UPSTREAM_ERROR",
          `Gemini refused the request (${gemini.promptFeedback.blockReason}).`,
        );
      }
      return gemini.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    },
  );
}

function callGroq(prompt: string, apiKey: string, model: string): Promise<string> {
  return postToProvider(
    "groq",
    {
      url: PROVIDERS.groq.endpoint,
      // Groq is OpenAI-compatible but authenticates with a bearer token rather
      // than Gemini's query parameter.
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        top_p: 0.9,
        // Groq honours OpenAI's structured-output flag for the models we use;
        // if a model rejects it the response is still validated afterwards.
        response_format: { type: "json_object" },
        max_tokens: 8192,
      },
    },
    (payload) => (payload as GroqResponse).choices?.[0]?.message?.content ?? "",
  );
}

const PROVIDER_CALLERS: Record<AiProvider, ProviderCaller> = {
  gemini: callGemini,
  groq: callGroq,
};

/** Calls one provider with the model resolved for it. */
function callProvider(provider: AiProvider, prompt: string, apiKey: string): Promise<string> {
  return PROVIDER_CALLERS[provider](prompt, apiKey, modelFor(provider));
}

/**
 * Tailors the canonical resume to a job and returns a schema-validated result.
 *
 * Throws a `TailorError` with an admin-safe message on any failure. The caller
 * is responsible for persisting the result; nothing is written here.
 */
export async function tailorResumeForJob(input: TailorResumeInput): Promise<TailorResumeResult> {
  const providers = getConfiguredProviders();
  if (providers.length === 0) {
    throw new TailorError("MISSING_API_KEY", missingKeyMessage());
  }

  const prompt = buildTailorPrompt({
    canonicalResume: JSON.stringify(input.canonicalResume, null, 2),
    companyName: input.companyName,
    jobTitle: input.jobTitle,
    jobDescription: input.jobDescription,
    location: input.location,
    notes: input.notes,
  });

  const failures: string[] = [];

  for (const provider of providers) {
    const apiKey = apiKeyFor(provider);
    // `getConfiguredProviders` already filtered these, so this is unreachable -
    // it exists only to satisfy the type checker without a non-null assertion.
    if (!apiKey) continue;

    const label = PROVIDERS[provider].label;

    try {
      const raw = await callProvider(provider, prompt, apiKey);
      return parseTailorResponse(raw, provider, label);
    } catch (error) {
      // A second provider with a working key should still save the day: a
      // Gemini project can be denied access (403) while Groq is fine, so move
      // on to the next provider instead of failing the whole generation.
      if (error instanceof TailorError && error.code === "RATE_LIMITED") throw error;

      failures.push(`${label}: ${(error as Error).message}`);
      console.error(`[resume-tailor] ${label} attempt failed:`, (error as Error).message);
    }
  }

  const adminMessage =
    providers.length === 1
      ? `${PROVIDERS[providers[0]].label} could not generate the resume. Please try again.`
      : "Every configured AI provider failed. Please try again.";

  throw new TailorError("UPSTREAM_ERROR", adminMessage, failures.join(" | ").slice(0, 500));
}

/** Parses, validates and normalises a provider response into the result shape. */
function parseTailorResponse(
  raw: string,
  provider: AiProvider,
  label: string,
): TailorResumeResult {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJsonObject(raw));
  } catch {
    throw new TailorError(
      "INVALID_RESPONSE",
      `${label} did not return valid JSON. The previous version was left untouched.`,
    );
  }

  const validated = resumeTailorOutputSchema.safeParse(parsedJson);
  if (!validated.success) {
    // Log the precise schema failure server-side; show the admin a summary only.
    console.error(
      `[resume-tailor] ${label} response failed schema validation:`,
      JSON.stringify(validated.error.flatten()),
    );
    throw new TailorError(
      "SCHEMA_MISMATCH",
      `${label} returned a resume that did not match the expected schema, so nothing was saved.`,
      JSON.stringify(validated.error.flatten().fieldErrors).slice(0, 500),
    );
  }

  return {
    output: validated.data,
    model: modelFor(provider),
    provider,
    promptVersion: PROMPT_VERSION,
  };
}