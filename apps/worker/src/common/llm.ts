import {
  MockLlmProvider,
  AnthropicLlmProvider,
  loadMockFixtures,
  type LlmProvider,
} from '@learn/ai';
import { env } from '../environment';

/** HANDBOOK §15.4 — LLM_MODE=mock cho dev/CI/E2E khi chưa có LLM_API_KEY; 'live' gọi Anthropic thật. */
export function createLlmProvider(): LlmProvider {
  if (env.LLM_MODE === 'mock' || !env.LLM_API_KEY) {
    return new MockLlmProvider(1200, loadMockFixtures(env.MOCK_FIXTURES_PATH));
  }
  return new AnthropicLlmProvider(env.LLM_API_KEY, env.LLM_MODEL_GENERATION);
}

/** Giá ước tính mỗi 1M token — HANDBOOK §8.5 theo dõi chi phí. Provider mock luôn 0. */
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
};
const DEFAULT_COST = { input: 3, output: 15 };

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  if (model.startsWith('mock/')) return 0;
  const rate = COST_PER_MILLION[model] ?? DEFAULT_COST;
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}
