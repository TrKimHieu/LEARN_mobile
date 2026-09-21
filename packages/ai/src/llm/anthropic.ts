import Anthropic from '@anthropic-ai/sdk';
import type { LlmGenerateParams, LlmGenerationResult, LlmProvider } from './provider';

/** Adapter Anthropic Claude — HANDBOOK §5.3. Model lấy từ env, không hardcode. */
export class AnthropicLlmProvider implements LlmProvider {
  readonly defaultModel: string;
  private readonly client: Anthropic;

  constructor(apiKey: string, defaultModel: string, maxTokens = 4096) {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = defaultModel;
    this.maxTokens = maxTokens;
  }

  private readonly maxTokens: number;

  async generate(params: LlmGenerateParams): Promise<LlmGenerationResult> {
    const startedAt = Date.now();
    const res = await this.client.messages.create({
      model: params.model ?? this.defaultModel,
      max_tokens: params.maxTokens ?? this.maxTokens,
      system: params.system,
      messages: [{ role: 'user', content: params.prompt }],
      temperature: params.temperature ?? 0.2,
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return {
      text,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      latencyMs: Date.now() - startedAt,
      model: res.model,
    };
  }
}
