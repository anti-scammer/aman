/**
 * Claude Code CLI as an LLM provider, for a machine where the developer is
 * already signed in.
 *
 * This shells out to the `claude` binary rather than calling the Anthropic API,
 * because it needs no API key: it borrows the sign-in already on the machine.
 * That is also its limit. It works on a laptop or a workstation and it does not
 * work in the Docker image, which has neither the binary nor the credentials,
 * so this is a development and demo provider, not the deployed one.
 *
 * Two measured properties decided the shape of this file:
 *
 *   Latency. Three runs of one classification took 12.4s, 12.9s and 15.5s, a
 *   mean of 13.6s. The CLI reported 8.1s of that as its own work, so roughly
 *   five seconds is process startup. Ollama on the same prompt answers in
 *   about one. The timeout below is sized for that, and a caller that cannot
 *   wait should not use this provider.
 *
 *   Cost. The CLI reported 0.0213 USD for a single classification, against
 *   roughly 0.0013 USD of tokens for the same model through the API. The
 *   difference is the CLI's own harness prompt, which is sent every call.
 *
 * Config (env):
 *   CLAUDE_CLI_BIN   - path to the binary, default "claude"
 *   CLAUDE_CLI_MODEL - default "claude-haiku-4-5"
 *
 * Never throws: every failure returns null so the caller falls back to rules.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

/**
 * Generous because the CLI is slow to start. Measured mean was 13.6s with a
 * 15.5s worst case, so a 12s timeout of the kind the HTTP provider uses would
 * have failed intermittently and looked like a flaky model.
 */
const CLI_TIMEOUT_MS = 45_000;
/** The CLI prints its own harness noise on some paths; cap what we buffer. */
const MAX_BUFFER = 4 * 1024 * 1024;

function cliConfig() {
  return {
    bin: process.env.CLAUDE_CLI_BIN ?? 'claude',
    model: process.env.CLAUDE_CLI_MODEL ?? 'claude-haiku-4-5',
  };
}

export function claudeCliModel(): string {
  return cliConfig().model;
}

/**
 * The JSON envelope `--output-format json` prints. Only the fields worth
 * reading are named; the CLI adds many more.
 */
interface CliEnvelope {
  is_error?: boolean;
  result?: string;
  total_cost_usd?: number;
}

/**
 * Ask the CLI to classify, returning the model's raw text for the caller to
 * parse, or null on any failure.
 *
 * Deliberately does not pass --bare or --restricted. Both look like sensible
 * ways to skip hooks and tools for a one-shot prompt, and both make the CLI
 * report "Not logged in" and exit in about 50ms even when credentials are
 * perfectly good.
 */
export async function claudeCliComplete(
  systemPrompt: string,
  userText: string,
): Promise<string | null> {
  const { bin, model } = cliConfig();
  const prompt = `${systemPrompt}\n\nMessage: ${userText}`;

  try {
    const { stdout } = await run(
      bin,
      ['-p', prompt, '--model', model, '--output-format', 'json'],
      { timeout: CLI_TIMEOUT_MS, maxBuffer: MAX_BUFFER, windowsHide: true },
    );

    const envelope = JSON.parse(stdout) as CliEnvelope;
    // A failed run still exits 0 and still prints an envelope; the failure is
    // reported in the body, so the exit code alone is not enough to trust.
    if (envelope.is_error) return null;
    return typeof envelope.result === 'string' ? envelope.result : null;
  } catch {
    // Binary missing, not signed in, timed out, or output that is not JSON.
    return null;
  }
}

/**
 * Whether the CLI is present and signed in.
 *
 * Deliberately a real one-token round trip rather than a `--version` check:
 * the binary being installed says nothing about whether it can authenticate,
 * and an unauthenticated CLI is the failure this needs to catch. Callers
 * should cache the answer, because this costs a request.
 */
export async function probeClaudeCli(): Promise<boolean> {
  const { bin, model } = cliConfig();
  try {
    const { stdout } = await run(
      bin,
      ['-p', 'Reply with exactly: OK', '--model', model, '--output-format', 'json'],
      { timeout: CLI_TIMEOUT_MS, maxBuffer: MAX_BUFFER, windowsHide: true },
    );
    const envelope = JSON.parse(stdout) as CliEnvelope;
    return envelope.is_error !== true;
  } catch {
    return false;
  }
}
