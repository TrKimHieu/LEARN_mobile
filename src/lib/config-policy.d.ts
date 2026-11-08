export type AppEnvironment = 'development' | 'preview' | 'production';
export function resolveEnvironment(value: unknown): AppEnvironment;
export function resolveApiOrigin(value: string | undefined, environment: AppEnvironment): string;
