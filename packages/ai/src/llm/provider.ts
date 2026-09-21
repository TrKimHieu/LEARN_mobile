export interface LlmGenerateParams {
  system?: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmGenerationResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  model: string;
  /** Nếu số lần thử lại có phản hồi lỗi, đây là nội dung thử lại đã gửi. */
  attempt?: number;
}

export interface LlmProvider {
  /** Tên model mặc định của provider này. */
  readonly defaultModel: string;
  generate(params: LlmGenerateParams): Promise<LlmGenerationResult>;
}

/** JSON parse kèm thông báo lỗi rõ — dùng khi model trả về không phải JSON thuần. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Output không phải JSON: bắt đầu bằng "${trimmed.slice(0, 80)}"`);
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}
