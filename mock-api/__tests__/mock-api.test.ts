/**
 * @jest-environment node
 *
 * Chạy API mock thật trên cổng ngẫu nhiên và kiểm MỌI response bằng Zod schema của app
 * (`src/contracts`) — nếu contracts đổi mà mock lệch, test này đỏ.
 */
import http, { type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { z } from 'zod';
import {
  adminAiJobDetailSchema,
  adminAiJobListSchema,
  adminMetricsSchema,
  aiJobSummarySchema,
  auditLogEntrySchema,
  CONTRACTS_HASH,
  courseDetailSchema,
  courseSummarySchema,
  documentListSchema,
  errorSchema,
  exerciseReadSchema,
  historyPageSchema,
  lessonReadSchema,
  lessonSourceSchema,
  lessonSummarySchema,
  metaResponseSchema,
  nativeAuthResponseSchema,
  planListSchema,
  progressCourseSchema,
  progressOverviewSchema,
  submissionSchema,
  submitExerciseSchema,
  subscriptionResponseSchema,
  uploadUrlResponseSchema,
} from '@/contracts';

const { createApp } = require('../app') as { createApp: (o: object) => { server: Server } };

let base = '';
let close: () => Promise<void>;

beforeAll(async () => {
  const { server } = createApp({ jobMs: 200 });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => new Promise((r) => server.close(() => r()));
});
afterAll(() => close());

/** Dùng `http` của Node: `fetch` trong jest-expo bị thay bằng bản của Expo. */
function raw(method: string, path: string, headers: Record<string, string>, payload?: string) {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    const req = http.request(base + path, { method, headers }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (text += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, text }));
    });
    req.on('error', reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

async function call(method: string, path: string, opts: { body?: unknown; token?: string } = {}) {
  const res = await raw(
    method,
    path,
    {
      'x-learn-client': 'native',
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  );
  return { status: res.status, json: res.text ? JSON.parse(res.text) : undefined };
}

function ok<T extends z.ZodTypeAny>(schema: T, res: { status: number; json: unknown }, status = 200) {
  expect(res.status).toBe(status);
  const parsed = schema.safeParse(res.json);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error.issues, null, 2));
  return parsed.data as z.infer<T>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function login(email = 'demo@learn.ai', password = 'Demo@12345') {
  return ok(nativeAuthResponseSchema, await call('POST', '/api/v1/auth/login', { body: { email, password } }));
}

describe('hệ thống và xác thực', () => {
  it('meta khớp contracts của app', async () => {
    const meta = ok(metaResponseSchema, await call('GET', '/api/v1/meta'));
    expect(meta.contractsHash).toBe(CONTRACTS_HASH);
  });

  it('đăng nhập đúng/sai, lỗi theo envelope chuẩn', async () => {
    await login();
    const res = await call('POST', '/api/v1/auth/login', {
      body: { email: 'demo@learn.ai', password: 'sai' },
    });
    expect(res.status).toBe(401);
    const err = errorSchema.parse(res.json);
    expect(err.code).toBe('UNAUTHENTICATED');
    expect(err.requestId).toBeTruthy();
  });

  it('refresh xoay vòng; dùng lại token cũ thì thu hồi cả họ token', async () => {
    const first = await login();
    const second = ok(
      nativeAuthResponseSchema,
      await call('POST', '/api/v1/auth/refresh', { body: { refreshToken: first.refreshToken } }),
    );
    expect(second.refreshToken).not.toBe(first.refreshToken);
    const reuse = await call('POST', '/api/v1/auth/refresh', {
      body: { refreshToken: first.refreshToken },
    });
    expect(reuse.status).toBe(401);
    const revoked = await call('POST', '/api/v1/auth/refresh', {
      body: { refreshToken: second.refreshToken },
    });
    expect(revoked.status).toBe(401);
  });

  it('request không token hoặc token sai → 401', async () => {
    expect((await call('GET', '/api/v1/workspace')).status).toBe(401);
    expect((await call('GET', '/api/v1/workspace', { token: 'token-sai' })).status).toBe(401);
  });

  it('đăng ký tài khoản mới có workspace trống; trùng email → 409', async () => {
    const body = { email: 'dkmoi@learn.ai', password: 'Matkhau123', displayName: 'Người Mới' };
    const session = ok(
      nativeAuthResponseSchema,
      await call('POST', '/api/v1/auth/register', { body }),
      201,
    );
    const ws = await call('GET', '/api/v1/workspace', { token: session.accessToken });
    expect(ws.json.courses).toEqual([]);
    expect((await call('POST', '/api/v1/auth/register', { body })).status).toBe(409);
  });
});

describe('luồng người học với dữ liệu seed', () => {
  it('khóa học, bài học, bài tập, nộp bài, tiến trình', async () => {
    const { accessToken: token } = await login();

    const ws = await call('GET', '/api/v1/workspace', { token });
    const courses = ok(z.object({ courses: z.array(courseSummarySchema) }), ws).courses;
    const git = courses.find((c) => c.title === 'Lập trình TypeScript')!;
    expect(git.lessonCount).toBe(4);
    ok(courseDetailSchema, await call('GET', `/api/v1/courses/${git.id}`, { token }));
    ok(
      z.object({ documents: z.array(documentListSchema) }),
      await call('GET', `/api/v1/courses/${git.id}/documents`, { token }),
    );

    const lessons = ok(
      z.object({ lessons: z.array(lessonSummarySchema) }),
      await call('GET', `/api/v1/courses/${git.id}/lessons`, { token }),
    ).lessons;
    const lesson = lessons[2]!;
    ok(lessonReadSchema, await call('GET', `/api/v1/courses/${git.id}/lessons/${lesson.id}`, { token }));
    const sources = ok(
      z.object({ sources: z.array(lessonSourceSchema) }),
      await call('GET', `/api/v1/courses/${git.id}/lessons/${lesson.id}/sources`, { token }),
    );
    expect(sources.sources.length).toBeGreaterThan(0);
    expect(
      (await call('POST', `/api/v1/courses/${git.id}/lessons/${lesson.id}/start`, { token })).status,
    ).toBe(204);

    const ex = ok(exerciseReadSchema, await call('GET', `/api/v1/lessons/${lesson.id}/exercise`, { token }));
    // Đáp án không được rời server trước khi nộp.
    expect(JSON.stringify(ex)).not.toMatch(/"key"|correctAnswer/);
    const answers = ex.questions.map((q) => {
      if (q.type === 'MULTIPLE_CHOICE') return { type: q.type, questionId: q.id, optionId: q.options[0]!.id };
      if (q.type === 'TRUE_FALSE') return { type: q.type, questionId: q.id, value: false };
      return { type: q.type, questionId: q.id, text: 'sai' };
    });
    expect(submitExerciseSchema.safeParse({ answers, exerciseId: ex.id }).success).toBe(true);
    const wrong = ok(
      submissionSchema,
      await call('POST', `/api/v1/lessons/${lesson.id}/exercise/submit`, {
        token,
        body: { answers, exerciseId: ex.id },
      }),
      201,
    );
    expect(wrong.passed).toBe(false);
    expect(wrong.results.every((r) => r.correctAnswer !== null)).toBe(true);

    const right = ok(
      submissionSchema,
      await call('POST', `/api/v1/lessons/${lesson.id}/exercise/submit`, {
        token,
        body: {
          exerciseId: ex.id,
          answers: wrong.results.map((r, i) => {
            const q = ex.questions[i]!;
            const k = r.correctAnswer as { optionId?: string; value?: boolean; acceptable?: string[] };
            if (q.type === 'MULTIPLE_CHOICE') return { type: q.type, questionId: q.id, optionId: k.optionId };
            if (q.type === 'TRUE_FALSE') return { type: q.type, questionId: q.id, value: k.value };
            return { type: q.type, questionId: q.id, text: k.acceptable![0] };
          }),
        },
      }),
      201,
    );
    expect(right.passed).toBe(true);
    expect(right.lessonCompleted).toBe(true);
    expect(right.attemptNo).toBe(2);

    const overview = ok(progressOverviewSchema, await call('GET', '/api/v1/progress/overview', { token }));
    expect(overview.completedLessons).toBe(2);
    expect(overview.activeStreak).toBeGreaterThanOrEqual(3);
    ok(
      z.object({ courses: z.array(progressCourseSchema) }),
      await call('GET', '/api/v1/progress/courses', { token }),
    );
    const page1 = ok(historyPageSchema, await call('GET', '/api/v1/progress/history?limit=2', { token }));
    expect(page1.nextCursor).not.toBeNull();
    const page2 = ok(
      historyPageSchema,
      await call('GET', `/api/v1/progress/history?limit=2&cursor=${page1.nextCursor}`, { token }),
    );
    expect(page2.items.length).toBeGreaterThan(0);
  });

  it('sửa, sắp xếp lại, xoá bài học', async () => {
    const { accessToken: token } = await login();
    const ws = await call('GET', '/api/v1/workspace', { token });
    const git = ws.json.courses.find((c: { title: string }) => c.title === 'Lập trình TypeScript');
    const list = (await call('GET', `/api/v1/courses/${git.id}/lessons`, { token })).json
      .lessons as { id: string }[];
    const patched = ok(
      lessonReadSchema,
      await call('PATCH', `/api/v1/courses/${git.id}/lessons/${list[0]!.id}`, {
        token,
        body: { title: 'Tiêu đề đã sửa' },
      }),
    );
    expect(patched.editedByUserAt).not.toBeNull();
    const reversed = list.map((l) => l.id).reverse();
    const re = ok(
      z.object({ lessons: z.array(lessonSummarySchema) }),
      await call('PATCH', `/api/v1/courses/${git.id}/lessons/reorder`, {
        token,
        body: { lessonIds: reversed },
      }),
    );
    expect(re.lessons.map((l) => l.id)).toEqual(reversed);
    expect(
      (await call('DELETE', `/api/v1/courses/${git.id}/lessons/${list[3]!.id}`, { token })).status,
    ).toBe(204);
    expect(
      (await call('GET', `/api/v1/courses/${git.id}/lessons/${list[3]!.id}`, { token })).status,
    ).toBe(404);
  });
});

describe('tạo khóa học → tải tài liệu → sinh bài học bằng AI giả', () => {
  async function newUser(email: string) {
    const body = { email, password: 'Matkhau123', displayName: 'Người Thử' };
    return ok(nativeAuthResponseSchema, await call('POST', '/api/v1/auth/register', { body }), 201);
  }

  async function uploadDoc(token: string, courseId: string, filename: string) {
    const up = ok(
      uploadUrlResponseSchema,
      await call('POST', `/api/v1/courses/${courseId}/documents/upload-url`, {
        token,
        body: { filename, mimeType: 'text/markdown', sizeBytes: 11, checksumSha256: 'a'.repeat(64) },
      }),
      201,
    );
    // URL ký theo Host của request → điện thoại trong LAN tới được.
    expect(up.uploadUrl.startsWith(base)).toBe(true);
    const put = await raw('PUT', up.uploadUrl.slice(base.length), {}, 'hello world');
    expect(put.status).toBe(200);
    const confirm = await call('POST', `/api/v1/documents/${up.documentId}/confirm`, {
      token,
      body: { sizeBytes: 11 },
    });
    expect(confirm.status).toBe(200);
  }

  it('chạy trọn luồng', async () => {
    const { accessToken: token } = await newUser('luong@learn.ai');
    const course = ok(
      courseDetailSchema,
      await call('POST', '/api/v1/courses', { token, body: { title: 'Python nhập môn' } }),
      201,
    );
    const noDoc = await call('POST', `/api/v1/ai/courses/${course.id}/generate-lessons`, {
      token,
      body: {},
    });
    expect(noDoc.status).toBe(409);

    const exe = await call('POST', `/api/v1/courses/${course.id}/documents/upload-url`, {
      token,
      body: { filename: 'x.exe', mimeType: 'application/x-msdownload', sizeBytes: 10, checksumSha256: 'a'.repeat(64) },
    });
    expect(exe.json.code).toBe('UNSUPPORTED_FILE_TYPE');

    await uploadDoc(token, course.id, 'python.md');
    await wait(500);
    const docs = ok(
      z.object({ documents: z.array(documentListSchema) }),
      await call('GET', `/api/v1/courses/${course.id}/documents`, { token }),
    ).documents;
    expect(docs[0]!.status).toBe('EXTRACTED');

    const job = ok(
      aiJobSummarySchema,
      await call('POST', `/api/v1/ai/courses/${course.id}/generate-lessons`, {
        token,
        body: { difficulty: 'EASY' },
      }),
      202,
    );
    expect(['QUEUED', 'RUNNING']).toContain(job.status);
    await wait(1500);
    const done = ok(aiJobSummarySchema, await call('GET', `/api/v1/ai/jobs/${job.id}`, { token }));
    expect(done.status).toBe('SUCCEEDED');
    const lessons = (await call('GET', `/api/v1/courses/${course.id}/lessons`, { token })).json.lessons;
    expect(lessons).toHaveLength(4);
  });

  it('tên khóa học chứa "lỗi" → AI Job thất bại', async () => {
    const { accessToken: token } = await newUser('loi@learn.ai');
    const bad = ok(
      courseDetailSchema,
      await call('POST', '/api/v1/courses', { token, body: { title: 'Khóa lỗi thử nghiệm' } }),
      201,
    );
    await uploadDoc(token, bad.id, 'a.md');
    await wait(500);
    const job = ok(
      aiJobSummarySchema,
      await call('POST', `/api/v1/ai/courses/${bad.id}/generate-lessons`, { token, body: {} }),
      202,
    );
    await wait(1500);
    const failed = ok(aiJobSummarySchema, await call('GET', `/api/v1/ai/jobs/${job.id}`, { token }));
    expect(failed.status).toBe('FAILED');
    expect(failed.error?.code).toBe('AI_GENERATION_FAILED');
  });

  it('huỷ job đang chạy', async () => {
    const { accessToken: token } = await newUser('huy@learn.ai');
    const course = ok(
      courseDetailSchema,
      await call('POST', '/api/v1/courses', { token, body: { title: 'Khóa huỷ' } }),
      201,
    );
    await uploadDoc(token, course.id, 'b.md');
    await wait(500);
    const job = ok(
      aiJobSummarySchema,
      await call('POST', `/api/v1/ai/courses/${course.id}/generate-lessons`, { token, body: {} }),
      202,
    );
    const cancelled = ok(
      aiJobSummarySchema,
      await call('POST', `/api/v1/ai/jobs/${job.id}/cancel`, { token }),
    );
    expect(cancelled.status).toBe('CANCELLED');
    await wait(1500);
    const after = ok(aiJobSummarySchema, await call('GET', `/api/v1/ai/jobs/${job.id}`, { token }));
    expect(after.status).toBe('CANCELLED');
  });

  it('vượt hạn mức gói FREE → 402 QUOTA_EXCEEDED kèm meta', async () => {
    const { accessToken: token } = await newUser('quota@learn.ai');
    let last = { status: 201, json: undefined as unknown };
    for (let i = 0; i < 6; i++) {
      last = await call('POST', '/api/v1/courses', { token, body: { title: `Khóa ${i}` } });
    }
    expect(last.status).toBe(402);
    const err = errorSchema.parse(last.json);
    expect(err.code).toBe('QUOTA_EXCEEDED');
    expect(err.meta).toMatchObject({ metric: 'COURSES_CREATED', limit: 5 });
  });
});

describe('gói đăng ký và quản trị', () => {
  it('plans, subscription, checkout demo, huỷ', async () => {
    const { accessToken: token } = await login();
    ok(planListSchema, await call('GET', '/api/v1/plans'));
    ok(subscriptionResponseSchema, await call('GET', '/api/v1/subscription', { token }));
    const checkout = await call('POST', '/api/v1/subscription/checkout', {
      token,
      body: { planCode: 'PRO' },
    });
    expect(checkout.json.mode).toBe('demo');
    const pro = ok(subscriptionResponseSchema, await call('GET', '/api/v1/subscription', { token }));
    expect(pro.planCode).toBe('PRO');
    expect(Object.values(pro.usage).every((u) => u.limit === null)).toBe(true);
    expect((await call('POST', '/api/v1/subscription/cancel', { token })).status).toBe(204);
  });

  it('admin xem số liệu, AI Job, nhật ký, chạy lại; người học bị 403', async () => {
    const learner = await login();
    expect((await call('GET', '/api/v1/admin/metrics', { token: learner.accessToken })).status).toBe(403);

    const { accessToken: token } = await login('admin@learn.ai', 'Admin@12345');
    ok(adminMetricsSchema, await call('GET', '/api/v1/admin/metrics', { token }));
    const jobList = z.object({ jobs: z.array(adminAiJobListSchema) });
    const jobs = ok(jobList, await call('GET', '/api/v1/admin/ai-jobs', { token })).jobs;
    expect(jobs.length).toBeGreaterThan(0);
    const failedOnly = ok(jobList, await call('GET', '/api/v1/admin/ai-jobs?status=FAILED', { token })).jobs;
    expect(failedOnly.every((j) => j.status === 'FAILED')).toBe(true);
    const target = failedOnly.find((j) => j.error?.code === 'AI_GENERATION_TIMEOUT')!;
    ok(adminAiJobDetailSchema, await call('GET', `/api/v1/admin/ai-jobs/${target.id}`, { token }));
    const log = ok(
      z.object({ entries: z.array(auditLogEntrySchema) }),
      await call('GET', `/api/v1/admin/ai-jobs/${target.id}/audit-log`, { token }),
    );
    expect(log.entries.length).toBeGreaterThan(0);
    const retried = ok(
      adminAiJobListSchema,
      await call('POST', `/api/v1/admin/ai-jobs/${target.id}/retry`, { token }),
    );
    expect(retried.status).toBe('QUEUED');
  });

  it('endpoint không tồn tại → 404 theo envelope chuẩn', async () => {
    const res = await call('GET', '/api/v1/khong-co');
    expect(res.status).toBe(404);
    expect(errorSchema.parse(res.json).code).toBe('NOT_FOUND');
  });
});
