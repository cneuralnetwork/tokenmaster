import { mkdtemp, mkdir, writeFile, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export async function fixture(empty = false) {
  const root = await mkdtemp(join(tmpdir(), "tokenmaster-test-"));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: root,
    USERPROFILE: root,
    XDG_CONFIG_HOME: join(root, ".config"),
    XDG_DATA_HOME: join(root, ".local/share"),
    LOG_LEVEL: "0",
  };
  for (const key of [
    "CLAUDE_CONFIG_DIR",
    "CODEX_HOME",
    "OPENCODE_DATA_DIR",
    "AMP_DATA_DIR",
    "DROID_SESSIONS_DIR",
    "CODEBUFF_DATA_DIR",
    "HERMES_HOME",
    "PI_AGENT_DIR",
    "GOOSE_PATH_ROOT",
    "KILO_DATA_DIR",
    "COPILOT_HOME",
    "GEMINI_DATA_DIR",
    "ANTIGRAVITY_DATA_DIR",
    "KIMI_DATA_DIR",
    "QWEN_DATA_DIR",
    "OPENCLAW_DIR",
    "GROK_HOME",
    "ZCODE_HOME",
  ])
    delete env[key];
  delete env.COPILOT_OTEL_FILE_EXPORTER_PATH;
  const put = async (path: string, content: unknown) => {
    const full = join(root, path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(
      full,
      typeof content === "string" ? content : JSON.stringify(content),
    );
  };
  await mkdir(join(root, ".claude/projects"), { recursive: true });
  if (!empty) {
    const claude = {
      timestamp: "2026-01-02T12:00:00Z",
      sessionId: "test-session",
      type: "assistant",
      requestId: "req-test",
      message: {
        id: "msg_test_001",
        model: "claude-sonnet-4-20250514",
        role: "assistant",
        usage: {
          input_tokens: 1000,
          output_tokens: 200,
          cache_creation_input_tokens: 300,
          cache_read_input_tokens: 400,
        },
      },
      costUSD: 0.123,
    };
    await put(
      ".claude/projects/test-project/session.jsonl",
      [JSON.stringify(claude), JSON.stringify(claude), "not json"].join("\n") +
        "\n",
    );
    await put(
      ".codex/sessions/2026/01/02/rollout-test.jsonl",
      [
        {
          type: "session_meta",
          timestamp: "2026-01-02T12:00:00Z",
          payload: { id: "codex-test", cwd: "/test/project" },
        },
        {
          type: "turn_context",
          timestamp: "2026-01-02T12:01:00Z",
          payload: { model: "gpt-5", cwd: "/test/project" },
        },
        {
          type: "event_msg",
          timestamp: "2026-01-02T12:02:00Z",
          payload: {
            type: "token_count",
            info: {
              total_token_usage: {
                input_tokens: 2000,
                cached_input_tokens: 500,
                output_tokens: 300,
                reasoning_output_tokens: 100,
                total_tokens: 2300,
              },
              last_token_usage: {
                input_tokens: 2000,
                cached_input_tokens: 500,
                output_tokens: 300,
                reasoning_output_tokens: 100,
                total_tokens: 2300,
              },
            },
          },
        },
      ]
        .map((v) => JSON.stringify(v))
        .join("\n") + "\n",
    );
    await put(
      ".local/share/opencode/storage/message/session-open/message.json",
      {
        id: "message-open",
        sessionID: "session-open",
        role: "assistant",
        providerID: "anthropic",
        modelID: "claude-sonnet-4-20250514",
        time: { created: 1767358800000 },
        tokens: { input: 700, output: 50, cache: { read: 100, write: 20 } },
        cost: 0.03,
      },
    );
    await cp(
      fileURLToPath(
        new URL(
          "../../../rust/adapters/copilot/tests/fixtures/session-state",
          import.meta.url,
        ),
      ),
      join(root, ".copilot/session-state"),
      { recursive: true },
    );
  }
  return {
    root,
    env,
    put,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}
