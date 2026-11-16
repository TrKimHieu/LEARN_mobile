import { apiFetch, refreshSession, setAccessToken } from '../api-client';
import { startTesting, stopTesting, isTesting } from '../testing-mode';
import { writeRefreshToken } from '../token-store';
import { courseSummarySchema, nativeAuthResponseSchema, courseDetailSchema, dueReviewsResponseSchema, reviewResultSchema, documentListSchema } from '@/contracts';

jest.mock('../config', () => ({ config: { apiUrl: 'https://api.test' } }));
jest.mock('../token-store', () => ({
  readRefreshToken: jest.fn(async () => 'real-refresh-token'),
  writeRefreshToken: jest.fn(),
}));

afterEach(() => stopTesting());

it('runs a mutable demo without network or changes to the real session', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('server unavailable'));
  setAccessToken('real-access-token');
  const session = startTesting();
  expect(nativeAuthResponseSchema.safeParse(session).success).toBe(true);
  expect(isTesting()).toBe(true);
  const workspace = await apiFetch<any>('/api/v1/workspace');
  expect(courseSummarySchema.array().safeParse(workspace.courses).success).toBe(true);
  expect(workspace.courses.length).toBeGreaterThan(0);
  const course = await apiFetch<any>('/api/v1/courses', {
    method: 'POST', body: { title: 'Testing offline', description: 'Demo' },
  });
  expect(courseDetailSchema.safeParse(await apiFetch(`/api/v1/courses/${course.id}`)).success).toBe(true);
  expect((await apiFetch<any>('/api/v1/workspace')).courses.some((c: any) => c.title === 'Testing offline')).toBe(true);
  expect(global.fetch).not.toHaveBeenCalled();
  expect(writeRefreshToken).not.toHaveBeenCalled();
  stopTesting();
  global.fetch = jest.fn().mockResolvedValue(new Response('{}'));
  await apiFetch('/api/v1/meta');
  expect(global.fetch).toHaveBeenCalledWith('https://api.test/api/v1/meta', expect.objectContaining({
    headers: expect.objectContaining({ Authorization: 'Bearer real-access-token' }),
  }));
});

it('resets demo changes for each testing session', async () => {
  startTesting();
  await apiFetch('/api/v1/courses', { method: 'POST', body: { title: 'Temporary' } });
  stopTesting();
  startTesting();
  expect((await apiFetch<any>('/api/v1/workspace')).courses.some((c: any) => c.title === 'Temporary')).toBe(false);
});

it('does not refresh a real request that returns 401 after entering Testing', async () => {
  let respond!: (response: Response) => void;
  global.fetch = jest.fn(() => new Promise<Response>((resolve) => { respond = resolve; }));
  const request = apiFetch('/api/v1/workspace');
  const rejection = expect(request).rejects.toMatchObject({ status: 401 });
  startTesting();
  respond(new Response('{}', { status: 401 }));
  await rejection;
  expect(await refreshSession()).toBeNull();
  expect(writeRefreshToken).not.toHaveBeenCalled();
});

it('supports review cards and grading without a server', async () => {
  startTesting();
  const due = dueReviewsResponseSchema.parse(await apiFetch('/api/v1/reviews/due'));
  expect(due.dueCount).toBeGreaterThan(0);
  const questionId = due.cards[0]!.questionId;
  const result = reviewResultSchema.parse(await apiFetch(`/api/v1/reviews/${questionId}`, {
    method: 'POST', body: { grade: 'GOOD', reviewedAt: new Date().toISOString() },
  }));
  expect(result.applied).toBe(true);
  expect(dueReviewsResponseSchema.parse(await apiFetch('/api/v1/reviews/due')).cards.some((c) => c.questionId === questionId)).toBe(false);
});

it('preserves quota metadata so the demo can display a quota notice', async () => {
  startTesting();
  for (let i = 0; i < 3; i++) {
    await apiFetch('/api/v1/courses', { method: 'POST', body: { title: `Quota ${i}` } });
  }
  await expect(apiFetch('/api/v1/courses', { method: 'POST', body: { title: 'Over quota' } })).rejects.toMatchObject({
    status: 402, code: 'QUOTA_EXCEEDED', requestId: expect.any(String),
    meta: { metric: 'COURSES_CREATED', limit: 5, used: 5 },
  });
});

it('imports extracted text so a new course can generate mock lessons', async () => {
  startTesting();
  const course = await apiFetch<any>('/api/v1/courses', { method: 'POST', body: { title: 'Text demo' } });
  const doc = documentListSchema.parse(await apiFetch(`/api/v1/courses/${course.id}/documents/text`, {
    method: 'POST', body: { filename: 'notes.txt', sourceMimeType: 'text/plain', sourceSizeBytes: 42, method: 'TEXT', pages: [{ page: null, text: 'A local testing document.' }] },
  }));
  expect(doc.status).toBe('EXTRACTED');
  expect(doc.chunkCount).toBeGreaterThan(0);
  const job = await apiFetch<any>(`/api/v1/ai/courses/${course.id}/generate-lessons`, { method: 'POST', body: { difficulty: 'MEDIUM', language: 'vi' } });
  expect(job.status).toBe('QUEUED');
});
