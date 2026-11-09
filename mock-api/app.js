'use strict';
/**
 * API mock của LEARN cho app mobile: cùng đường dẫn, cùng dạng dữ liệu (xem `src/contracts/`) với
 * `apps/api` của repo LEARN_website, nhưng chạy trong bộ nhớ, không cần Docker/Postgres/Redis.
 * Chỉ để làm giao diện và thử luồng — KHÔNG phải backend thật, không bảo mật gì cả.
 */
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { LIMITS, PLANS, createState, addCourse, addDocument, addJob, tick, setProgress, getProgress, iso, DAY } = require('./state');

/** Đọc từ `src/contracts/version.ts` để luôn khớp sau `npm run sync:contracts`. */
const { CONTRACTS_HASH } = require('@learn/api-contracts');
const MIN_MOBILE_VERSION = '1.0.0';
const ACCESS_TTL_MS_DEFAULT = 15 * 60_000;

class HttpError extends Error {
  constructor(status, code, detail, meta) {
    super(detail);
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}
const notFound = (what = 'Không tìm thấy dữ liệu.') => new HttpError(404, 'NOT_FOUND', what);
const unauth = (d = 'Cần đăng nhập.') => new HttpError(401, 'UNAUTHENTICATED', d);
const bad = (d) => new HttpError(422, 'VALIDATION_FAILED', d);

const TITLES = {
  400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden', 404: 'Not Found',
  409: 'Conflict', 413: 'Payload Too Large', 422: 'Unprocessable Entity', 500: 'Internal Server Error',
};

function createApp(options = {}) {
  let state = createState(options);
  const accessTtl = options.accessTtlMs ?? ACCESS_TTL_MS_DEFAULT;
  const latency = options.latencyMs ?? 0;
  const log = options.log ?? (() => {});

  // ── Token ────────────────────────────────────────────────────────────────
  const issueAccess = (user) => `mock.${user.id}.${Date.now() + accessTtl}.${randomUUID().slice(0, 8)}`;
  function issueSession(user) {
    const refreshToken = `mock-refresh-${randomUUID()}`;
    state.refreshTokens.set(refreshToken, { userId: user.id, used: false });
    return { user: publicUser(user), accessToken: issueAccess(user), refreshToken };
  }
  function authenticate(req) {
    const header = req.headers.authorization ?? '';
    const [, token] = header.match(/^Bearer (.+)$/) ?? [];
    const [prefix, userId, exp] = (token ?? '').split('.');
    if (prefix !== 'mock' || !userId || Number(exp) < Date.now()) throw unauth('Phiên đăng nhập đã hết hạn.');
    const user = state.users.get(userId);
    if (!user) throw unauth();
    return user;
  }
  const requireAdmin = (user) => {
    if (user.role !== 'ADMIN') throw new HttpError(403, 'FORBIDDEN', 'Chỉ quản trị viên được truy cập.');
  };

  // ── Hình dữ liệu ─────────────────────────────────────────────────────────
  const publicUser = ({ password: _p, ...rest }) => rest;
  const ownCourse = (user, id) => {
    const c = state.courses.find((x) => x.id === id && (x.userId === user.id || user.role === 'ADMIN'));
    if (!c) throw notFound('Không tìm thấy khóa học.');
    return c;
  };
  const courseLessons = (courseId) =>
    state.lessons.filter((l) => l.courseId === courseId).sort((a, b) => a.orderIndex - b.orderIndex);
  const ownLesson = (user, lessonId, courseId) => {
    const l = state.lessons.find((x) => x.id === lessonId && (!courseId || x.courseId === courseId));
    if (!l) throw notFound('Không tìm thấy bài học.');
    ownCourse(user, l.courseId);
    return l;
  };
  const lessonSummary = (user, l) => {
    const p = getProgress(state, user.id, l.id);
    return {
      id: l.id, title: l.title, orderIndex: l.orderIndex, status: l.status,
      exerciseCount: l.exercises.length, confidence: l.confidence,
      progressStatus: p.status, bestScore: p.bestScore,
    };
  };
  const lessonRead = (user, l) => {
    const p = getProgress(state, user.id, l.id);
    return {
      id: l.id, title: l.title, summary: l.summary, contentMd: l.contentMd,
      estimatedMinutes: l.estimatedMinutes, orderIndex: l.orderIndex, status: l.status,
      sourceChunkIds: l.chunkIds, confidence: l.confidence, editedByUserAt: l.editedByUserAt,
      progress: { status: p.status, bestScore: p.bestScore },
    };
  };
  const courseCounts = (user, c) => {
    const lessons = courseLessons(c.id);
    const done = lessons.filter((l) => getProgress(state, user.id, l.id).status === 'COMPLETED').length;
    return { lessons, done };
  };
  const courseSummary = (user, c) => {
    const { lessons, done } = courseCounts(user, c);
    return {
      id: c.id, title: c.title, description: c.description, language: c.language,
      status: lessons.length ? 'READY' : 'DRAFT',
      progress: { completed: done, total: lessons.length },
      documentCount: state.documents.filter((d) => d.courseId === c.id).length,
      lessonCount: lessons.length, updatedAt: c.updatedAt,
    };
  };
  const courseDetail = (user, c) => {
    const { lessons, done } = courseCounts(user, c);
    const scores = lessons.map((l) => getProgress(state, user.id, l.id).bestScore).filter((s) => s !== null);
    return {
      id: c.id, title: c.title, description: c.description, language: c.language,
      status: lessons.length ? 'READY' : 'DRAFT', createdAt: c.createdAt, updatedAt: c.updatedAt,
      stats: {
        completedLessons: done, totalLessons: lessons.length,
        averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      },
    };
  };
  const documentList = (d) => ({
    id: d.id, filename: d.filename, mimeType: d.mimeType, sizeBytes: d.sizeBytes, status: d.status,
    pageCount: d.pageCount, chunkCount: d.chunkCount, errorMessage: d.errorMessage, createdAt: d.createdAt,
  });
  const jobSummary = (j) => ({
    id: j.id, courseId: j.courseId, documentId: j.documentId, type: j.type, status: j.status,
    progress: j.progress, progressLabel: j.progressLabel, error: j.error,
    queuedAt: j.queuedAt, startedAt: j.startedAt, finishedAt: j.finishedAt,
  });
  const adminJob = (j) => {
    const course = state.courses.find((c) => c.id === j.courseId);
    const owner = state.users.get(j.userId);
    return { ...jobSummary(j), courseTitle: course?.title ?? '(đã xoá)', requesterEmail: owner?.email ?? '' };
  };

  // ── Hạn mức ──────────────────────────────────────────────────────────────
  const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
  function usageFor(user) {
    const plan = state.subscriptions.get(user.id)?.planCode ?? 'FREE';
    const lim = LIMITS[plan] ?? LIMITS.FREE;
    const since = monthStart();
    const used = {
      COURSES_CREATED: [state.courses.filter((c) => c.userId === user.id).length, 'lifetime'],
      DOCUMENTS_UPLOADED: [state.documents.filter((d) => d.userId === user.id && d.confirmedAtMs >= since).length, 'month'],
      AI_JOBS_RUN: [state.jobs.filter((j) => j.userId === user.id && j.type === 'GENERATE_LESSONS' && j.queuedAtMs >= since).length, 'month'],
    };
    return Object.fromEntries(Object.entries(used).map(([k, [n, window]]) => [k, { used: n, limit: lim[k], window }]));
  }
  function checkQuota(user, metric) {
    const u = usageFor(user)[metric];
    if (u.limit !== null && u.used >= u.limit) {
      throw new HttpError(402, 'QUOTA_EXCEEDED', 'Bạn đã dùng hết hạn mức của gói hiện tại.', { metric, limit: u.limit, used: u.used });
    }
  }

  // ── Chấm bài ─────────────────────────────────────────────────────────────
  const norm = (s) => String(s).trim().toLowerCase();
  function gradeQuestion(q, a) {
    if (!a) return false;
    if (q.type === 'MULTIPLE_CHOICE') return a.optionId === q.key.optionId;
    if (q.type === 'TRUE_FALSE') return a.value === q.key.value;
    const t = norm(a.text ?? '');
    if (!t) return false;
    return q.key.acceptable.some((k) => (q.type === 'FILL_BLANK' ? t === norm(k) : t.includes(norm(k))));
  }
  const exerciseRead = (user, lesson, ex) => {
    const subs = state.submissions.filter((s) => s.userId === user.id && s.exerciseId === ex.id);
    const best = subs.reduce((m, s) => (!m || s.score > m.score ? s : m), null);
    return {
      id: ex.id, title: ex.title, instruction: ex.instruction, difficulty: ex.difficulty,
      passScore: ex.passScore, orderIndex: ex.orderIndex,
      questions: ex.questions.map(({ id, orderIndex, type, prompt, points, options }) => ({ id, orderIndex, type, prompt, points, options })),
      bestSubmission: best ? { attemptNo: best.attemptNo, score: best.score, maxScore: best.maxScore, createdAt: best.createdAt } : null,
      exercises: lesson.exercises.map((e) => {
        const bs = state.submissions.filter((s) => s.userId === user.id && s.exerciseId === e.id);
        const bestScore = bs.length ? Math.max(...bs.map((s) => s.score)) : null;
        return {
          id: e.id, title: e.title, orderIndex: e.orderIndex, difficulty: e.difficulty,
          questionCount: e.questions.length, passScore: e.passScore, bestScore,
          passed: bestScore !== null && bestScore >= e.passScore,
        };
      }),
    };
  };

  // ── Định tuyến ───────────────────────────────────────────────────────────
  const routes = [];
  const route = (method, pattern, handler, { auth = true } = {}) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_m, k) => (keys.push(k), '([^/]+)')) + '/?$');
    routes.push({ method, re, keys, handler, auth });
  };
  const body = (ctx) => {
    if (ctx.body === null || typeof ctx.body !== 'object') throw bad('Nội dung gửi lên không hợp lệ.');
    return ctx.body;
  };

  // Hệ thống
  route('GET', '/api/v1/health', () => ({ status: 'ok', mock: true }), { auth: false });
  route('GET', '/api/v1/health/ready', () => ({ status: 'ok', mock: true }), { auth: false });
  route('GET', '/api/v1/meta', () => ({ apiVersion: 'v1', contractsHash: CONTRACTS_HASH, minMobileVersion: MIN_MOBILE_VERSION }), { auth: false });

  // Xác thực
  route('POST', '/api/v1/auth/register', (ctx) => {
    const { email, password, displayName } = body(ctx);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) throw bad('Email không hợp lệ.');
    if (typeof password !== 'string' || password.length < 8) throw bad('Mật khẩu cần ít nhất 8 ký tự.');
    if (typeof displayName !== 'string' || displayName.trim().length < 2) throw bad('Tên hiển thị cần từ 2 ký tự.');
    const lower = email.toLowerCase();
    if ([...state.users.values()].some((u) => u.email === lower)) throw new HttpError(409, 'CONFLICT', 'Email này đã được đăng ký.');
    const user = { id: randomUUID(), email: lower, displayName: displayName.trim(), role: 'LEARNER', locale: 'vi', emailVerifiedAt: null, createdAt: iso(Date.now()), password };
    state.users.set(user.id, user);
    state.subscriptions.set(user.id, { planCode: 'FREE', status: 'ACTIVE', currentPeriodEnd: null, cancelAtPeriodEnd: false });
    return [201, issueSession(user)];
  }, { auth: false });
  route('POST', '/api/v1/auth/login', (ctx) => {
    const { email, password } = body(ctx);
    const user = [...state.users.values()].find((u) => u.email === String(email ?? '').toLowerCase());
    if (!user || user.password !== password) throw unauth('Email hoặc mật khẩu không đúng.');
    return issueSession(user);
  }, { auth: false });
  route('POST', '/api/v1/auth/refresh', (ctx) => {
    const { refreshToken } = body(ctx);
    const rec = state.refreshTokens.get(refreshToken);
    if (!rec) throw unauth('Phiên đăng nhập không còn hợp lệ.');
    if (rec.used) {
      // Dùng lại token đã xoay vòng = nghi bị đánh cắp → thu hồi cả họ token (như máy chủ thật).
      for (const [t, r] of state.refreshTokens) if (r.userId === rec.userId) state.refreshTokens.delete(t);
      throw unauth('Phiên đăng nhập không còn hợp lệ.');
    }
    rec.used = true;
    return issueSession(state.users.get(rec.userId));
  }, { auth: false });
  const endSession = (all) => (ctx) => {
    const token = ctx.body?.refreshToken;
    const rec = state.refreshTokens.get(token);
    if (rec && all) {
      for (const [k, r] of state.refreshTokens) if (r.userId === rec.userId) state.refreshTokens.delete(k);
    } else if (rec) {
      state.refreshTokens.delete(token);
    }
    return [204];
  };
  route('POST', '/api/v1/auth/logout', endSession(false), { auth: false });
  route('POST', '/api/v1/auth/logout-all', endSession(true), { auth: false });
  route('POST', '/api/v1/auth/forgot-password', (ctx) => {
    const user = [...state.users.values()].find((u) => u.email === String(body(ctx).email ?? '').toLowerCase());
    if (user) {
      const token = `mock-reset-${randomUUID()}`;
      state.resetTokens.set(token, user.id);
      log(`[mock] Đặt lại mật khẩu cho ${user.email}: learn://reset-password?token=${token}`);
    }
    return [202, { message: 'Nếu email có tài khoản, một thư đặt lại mật khẩu đã được gửi.' }];
  }, { auth: false });
  route('POST', '/api/v1/auth/reset-password', (ctx) => {
    const { token, newPassword } = body(ctx);
    const userId = state.resetTokens.get(token);
    if (!userId) throw new HttpError(400, 'VALIDATION_FAILED', 'Đường dẫn đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    if (typeof newPassword !== 'string' || newPassword.length < 8) throw bad('Mật khẩu cần ít nhất 8 ký tự.');
    state.users.get(userId).password = newPassword;
    state.resetTokens.delete(token);
    return [204];
  }, { auth: false });

  // Khóa học
  route('GET', '/api/v1/workspace', (ctx) => ({
    courses: state.courses.filter((c) => c.userId === ctx.user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((c) => courseSummary(ctx.user, c)),
  }));
  route('POST', '/api/v1/courses', (ctx) => {
    const { title, description, language } = body(ctx);
    if (typeof title !== 'string' || !title.trim()) throw bad('Vui lòng nhập tên khóa học.');
    if (title.length > 200) throw bad('Tên khóa học tối đa 200 ký tự.');
    checkQuota(ctx.user, 'COURSES_CREATED');
    const c = addCourse(state, ctx.user.id, title.trim(), description ?? null, Date.now());
    c.status = 'DRAFT';
    c.language = language === 'en' ? 'en' : 'vi';
    return [201, courseDetail(ctx.user, c)];
  });
  route('GET', '/api/v1/courses/:id', (ctx) => courseDetail(ctx.user, ownCourse(ctx.user, ctx.params.id)));

  // Tài liệu
  route('GET', '/api/v1/courses/:id/documents', (ctx) => {
    const c = ownCourse(ctx.user, ctx.params.id);
    return { documents: state.documents.filter((d) => d.courseId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(documentList) };
  });
  route('POST', '/api/v1/courses/:id/documents/upload-url', (ctx) => {
    const c = ownCourse(ctx.user, ctx.params.id);
    const { filename, mimeType, sizeBytes } = body(ctx);
    if (!/\.(pdf|txt|md|docx|pptx)$/i.test(filename ?? '')) throw new HttpError(422, 'UNSUPPORTED_FILE_TYPE', 'Chỉ nhận PDF, TXT, Markdown, DOCX, PPTX.');
    if (!(sizeBytes > 0) || sizeBytes > 26_214_400) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Tệp tối đa 25 MB.');
    checkQuota(ctx.user, 'DOCUMENTS_UPLOADED');
    const doc = addDocument(state, c, filename, mimeType, sizeBytes, Date.now());
    // Presigned URL giả trỏ về chính server này, theo Host của request → điện thoại trong LAN tới được.
    return [201, { documentId: doc.id, uploadUrl: `${ctx.origin}/mock-storage/${doc.id}`, expiresInSec: 900 }];
  });
  route('POST', '/api/v1/documents/:id/confirm', (ctx) => {
    const doc = state.documents.find((d) => d.id === ctx.params.id && d.userId === ctx.user.id);
    if (!doc) throw notFound('Không tìm thấy tài liệu.');
    if (doc.status !== 'PENDING') return [200, documentList(doc)];
    doc.status = 'UPLOADED';
    doc.confirmedAtMs = Date.now();
    return [200, documentList(doc)];
  });

  // AI
  route('POST', '/api/v1/ai/courses/:id/generate-lessons', (ctx) => {
    const c = ownCourse(ctx.user, ctx.params.id);
    const input = ctx.body ?? {};
    if (!state.documents.some((d) => d.courseId === c.id && d.status === 'EXTRACTED')) {
      throw new HttpError(409, 'CONFLICT', 'Khóa học chưa có tài liệu nào đã trích xuất xong.');
    }
    const running = state.jobs.find((j) => j.courseId === c.id && (j.status === 'QUEUED' || j.status === 'RUNNING'));
    if (running) return [202, jobSummary(running)];
    checkQuota(ctx.user, 'AI_JOBS_RUN');
    const job = addJob(state, c, ctx.user, Date.now());
    job.difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(input.difficulty) ? input.difficulty : 'MEDIUM';
    job.inputParams = { difficulty: job.difficulty, language: input.language ?? c.language };
    return [202, jobSummary(job)];
  });
  const ownJob = (ctx) => {
    const j = state.jobs.find((x) => x.id === ctx.params.jobId && x.userId === ctx.user.id);
    if (!j) throw notFound('Không tìm thấy tác vụ AI.');
    return j;
  };
  route('GET', '/api/v1/ai/jobs/:jobId', (ctx) => jobSummary(ownJob(ctx)));
  route('POST', '/api/v1/ai/jobs/:jobId/cancel', (ctx) => {
    const j = ownJob(ctx);
    if (j.status === 'QUEUED' || j.status === 'RUNNING') {
      j.status = 'CANCELLED';
      j.finishedAt = iso(Date.now());
      j.progressLabel = 'Đã hủy';
    }
    return jobSummary(j);
  });

  // Bài học
  route('GET', '/api/v1/courses/:id/lessons', (ctx) => {
    const c = ownCourse(ctx.user, ctx.params.id);
    return { lessons: courseLessons(c.id).map((l) => lessonSummary(ctx.user, l)) };
  });
  route('PATCH', '/api/v1/courses/:id/lessons/reorder', (ctx) => {
    const c = ownCourse(ctx.user, ctx.params.id);
    const ids = body(ctx).lessonIds;
    const mine = courseLessons(c.id);
    if (!Array.isArray(ids) || ids.length !== mine.length || !mine.every((l) => ids.includes(l.id))) throw bad('Danh sách bài học không khớp khóa học.');
    ids.forEach((id, i) => { state.lessons.find((l) => l.id === id).orderIndex = i; });
    return { lessons: courseLessons(c.id).map((l) => lessonSummary(ctx.user, l)) };
  });
  route('GET', '/api/v1/courses/:id/lessons/:lessonId', (ctx) => lessonRead(ctx.user, ownLesson(ctx.user, ctx.params.lessonId, ctx.params.id)));
  route('PATCH', '/api/v1/courses/:id/lessons/:lessonId', (ctx) => {
    const l = ownLesson(ctx.user, ctx.params.lessonId, ctx.params.id);
    const p = body(ctx);
    if (p.title !== undefined) { if (String(p.title).length < 5 || String(p.title).length > 200) throw bad('Tiêu đề cần từ 5 đến 200 ký tự.'); l.title = p.title; }
    if (p.summary !== undefined) l.summary = p.summary;
    if (p.contentMd !== undefined) { if (String(p.contentMd).length < 10 || String(p.contentMd).length > 12000) throw bad('Nội dung cần từ 10 đến 12000 ký tự.'); l.contentMd = p.contentMd; }
    if (p.status !== undefined) l.status = p.status;
    l.editedByUserAt = iso(Date.now());
    return lessonRead(ctx.user, l);
  });
  route('DELETE', '/api/v1/courses/:id/lessons/:lessonId', (ctx) => {
    const l = ownLesson(ctx.user, ctx.params.lessonId, ctx.params.id);
    state.lessons = state.lessons.filter((x) => x.id !== l.id);
    courseLessons(l.courseId).forEach((x, i) => { x.orderIndex = i; });
    return [204];
  });
  route('GET', '/api/v1/courses/:id/lessons/:lessonId/sources', (ctx) => {
    const l = ownLesson(ctx.user, ctx.params.lessonId, ctx.params.id);
    const chunks = state.documents.flatMap((d) => d.chunks);
    return { sources: l.chunkIds.map((id) => chunks.find((c) => c.id === id)).filter(Boolean).map((c) => ({ chunkId: c.id, documentId: c.documentId, filename: c.filename, pageFrom: c.pageFrom, pageTo: c.pageTo, headingPath: c.headingPath, excerpt: c.excerpt, truncated: c.truncated })) };
  });
  route('POST', '/api/v1/courses/:id/lessons/:lessonId/start', (ctx) => {
    const l = ownLesson(ctx.user, ctx.params.lessonId, ctx.params.id);
    const p = getProgress(state, ctx.user.id, l.id);
    if (p.status === 'NOT_STARTED') setProgress(state, ctx.user.id, l.id, 'IN_PROGRESS', p.bestScore);
    return [204];
  });

  // Bài tập
  route('GET', '/api/v1/lessons/:lessonId/exercise', (ctx) => {
    const l = ownLesson(ctx.user, ctx.params.lessonId);
    if (!l.exercises.length) throw notFound('Bài học này chưa có bài tập.');
    const wanted = ctx.query.get('exerciseId');
    const ex = wanted ? l.exercises.find((e) => e.id === wanted) : [...l.exercises].sort((a, b) => a.orderIndex - b.orderIndex)[0];
    if (!ex) throw notFound('Không tìm thấy bài tập.');
    return exerciseRead(ctx.user, l, ex);
  });
  route('POST', '/api/v1/lessons/:lessonId/exercise/submit', (ctx) => {
    const l = ownLesson(ctx.user, ctx.params.lessonId);
    const { answers, exerciseId } = body(ctx);
    if (!Array.isArray(answers) || !answers.length) throw bad('Chưa có câu trả lời nào.');
    const ex = exerciseId ? l.exercises.find((e) => e.id === exerciseId) : l.exercises[0];
    if (!ex) throw notFound('Không tìm thấy bài tập.');
    const byQ = new Map(answers.map((a) => [a.questionId, a]));
    const results = ex.questions.map((q) => {
      const ok = gradeQuestion(q, byQ.get(q.id));
      return { questionId: q.id, isCorrect: ok, correctAnswer: q.key, explanation: q.explanation, pointsEarned: ok ? q.points : 0 };
    });
    const score = results.reduce((s, r) => s + r.pointsEarned, 0);
    const maxScore = ex.questions.reduce((s, q) => s + q.points, 0);
    const passed = score >= ex.passScore;
    const attemptNo = state.submissions.filter((s) => s.userId === ctx.user.id && s.exerciseId === ex.id).length + 1;
    const sub = { id: randomUUID(), userId: ctx.user.id, courseId: l.courseId, lessonId: l.id, exerciseId: ex.id, attemptNo, score, maxScore, passed, createdAt: iso(Date.now()) };
    state.submissions.push(sub);
    const prev = getProgress(state, ctx.user.id, l.id);
    const best = Math.max(prev.bestScore ?? 0, score);
    const done = prev.status === 'COMPLETED' || passed;
    setProgress(state, ctx.user.id, l.id, done ? 'COMPLETED' : 'IN_PROGRESS', best);
    return [201, { id: sub.id, exerciseId: ex.id, lessonCompleted: done, attemptNo, score, maxScore, passed, createdAt: sub.createdAt, results }];
  });

  // Tiến trình
  const mySubs = (user) => state.submissions.filter((s) => s.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  route('GET', '/api/v1/progress/overview', (ctx) => {
    const courses = state.courses.filter((c) => c.userId === ctx.user.id);
    const all = courses.flatMap((c) => courseLessons(c.id));
    const scores = all.map((l) => getProgress(state, ctx.user.id, l.id).bestScore).filter((s) => s !== null);
    const days = new Set(mySubs(ctx.user).map((s) => s.createdAt.slice(0, 10)));
    // Chuỗi ngày liên tiếp có làm bài, tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa làm).
    const dayKey = (ms) => iso(ms).slice(0, 10);
    let cursor = days.has(dayKey(Date.now())) ? Date.now() : Date.now() - DAY;
    let streak = 0;
    while (days.has(dayKey(cursor))) {
      streak++;
      cursor -= DAY;
    }
    return {
      courseCount: courses.length,
      completedLessons: all.filter((l) => getProgress(state, ctx.user.id, l.id).status === 'COMPLETED').length,
      totalLessons: all.length,
      averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      activeStreak: streak,
    };
  });
  route('GET', '/api/v1/progress/courses', (ctx) => ({
    courses: state.courses.filter((c) => c.userId === ctx.user.id).map((c) => {
      const { lessons, done } = courseCounts(ctx.user, c);
      return { courseId: c.id, courseTitle: c.title, completed: done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
    }),
  }));
  route('GET', '/api/v1/progress/history', (ctx) => {
    const limit = Math.min(100, Math.max(1, Number(ctx.query.get('limit')) || 20));
    const offset = Number(ctx.query.get('cursor')) || 0;
    const all = mySubs(ctx.user);
    const items = all.slice(offset, offset + limit).map((s) => {
      const course = state.courses.find((c) => c.id === s.courseId);
      const lesson = state.lessons.find((l) => l.id === s.lessonId);
      const ex = lesson?.exercises.find((e) => e.id === s.exerciseId);
      return { id: s.id, courseId: s.courseId, lessonId: s.lessonId, exerciseId: s.exerciseId, passed: s.passed, lessonTitle: lesson?.title ?? '(bài đã xoá)', courseTitle: course?.title ?? '(khóa đã xoá)', exerciseTitle: ex?.title ?? null, score: s.score, maxScore: s.maxScore, createdAt: s.createdAt };
    });
    return { items, nextCursor: offset + limit < all.length ? String(offset + limit) : null };
  });

  // Gói đăng ký
  route('GET', '/api/v1/plans', () => PLANS, { auth: false });
  route('GET', '/api/v1/subscription', (ctx) => ({ ...state.subscriptions.get(ctx.user.id), billingMode: 'demo', usage: usageFor(ctx.user) }));
  route('POST', '/api/v1/subscription/checkout', (ctx) => {
    const { planCode } = body(ctx);
    if (!PLANS.some((p) => p.code === planCode)) throw bad('Gói không tồn tại.');
    state.subscriptions.set(ctx.user.id, { planCode, status: 'ACTIVE', currentPeriodEnd: planCode === 'FREE' ? null : iso(Date.now() + 30 * DAY), cancelAtPeriodEnd: false });
    return { url: `${ctx.origin}/mock/checkout-demo`, mode: 'demo' };
  });
  route('POST', '/api/v1/subscription/cancel', (ctx) => {
    const sub = state.subscriptions.get(ctx.user.id);
    if (sub.planCode !== 'FREE') sub.cancelAtPeriodEnd = true;
    return [204];
  });

  // Quản trị
  route('GET', '/api/v1/admin/metrics', (ctx) => {
    requireAdmin(ctx.user);
    const today = iso(Date.now()).slice(0, 10);
    const days = Array.from({ length: 7 }, (_, i) => iso(Date.now() - (6 - i) * DAY).slice(0, 10));
    return {
      generatedAt: iso(Date.now()),
      totals: {
        users: state.users.size,
        usersToday: [...state.users.values()].filter((u) => u.createdAt.startsWith(today)).length,
        courses: state.courses.length, documents: state.documents.length, aiJobs: state.jobs.length,
        aiJobsToday: state.jobs.filter((j) => j.queuedAt.startsWith(today)).length,
        submissions: state.submissions.length, totalCostUsd: Number((state.jobs.length * 0.0312).toFixed(4)),
      },
      dailyCosts: days.map((date, i) => ({ date, totalCostUsd: Number((0.02 + i * 0.011).toFixed(4)), jobCount: 1 + (i % 3), totalInputTokens: 2400 * (1 + (i % 3)), totalOutputTokens: 1300 * (1 + (i % 3)) })),
    };
  });
  route('GET', '/api/v1/admin/ai-jobs', (ctx) => {
    requireAdmin(ctx.user);
    const status = ctx.query.get('status');
    return { jobs: state.jobs.filter((j) => !status || j.status === status).sort((a, b) => b.queuedAt.localeCompare(a.queuedAt)).map(adminJob) };
  });
  const anyJob = (ctx) => {
    requireAdmin(ctx.user);
    const j = state.jobs.find((x) => x.id === ctx.params.jobId);
    if (!j) throw notFound('Không tìm thấy tác vụ AI.');
    return j;
  };
  route('GET', '/api/v1/admin/ai-jobs/:jobId', (ctx) => {
    const j = anyJob(ctx);
    return { ...adminJob(j), attempt: j.attempt, inputParams: j.inputParams, runs: j.runs };
  });
  route('GET', '/api/v1/admin/ai-jobs/:jobId/audit-log', (ctx) => ({ entries: state.audit.filter((a) => a.entityId === anyJob(ctx).id) }));
  route('POST', '/api/v1/admin/ai-jobs/:jobId/retry', (ctx) => {
    const j = anyJob(ctx);
    if (j.status !== 'FAILED' && j.status !== 'CANCELLED') throw new HttpError(409, 'CONFLICT', 'Chỉ chạy lại được tác vụ đã lỗi hoặc đã hủy.');
    Object.assign(j, { status: 'QUEUED', progress: 0, progressLabel: null, error: null, queuedAt: iso(Date.now()), queuedAtMs: Date.now(), startedAt: null, finishedAt: null, attempt: j.attempt + 1, materialized: false });
    state.audit.push({ id: randomUUID(), actorEmail: ctx.user.email, action: 'AI_JOB_RETRIED', entityType: 'AIJob', entityId: j.id, metadata: { attempt: j.attempt }, createdAt: iso(Date.now()) });
    return adminJob(j);
  });

  // Công cụ của mock
  route('POST', '/__mock/reset', () => { state = createState(options); return [200, { reset: true }]; }, { auth: false });

  // ── HTTP ─────────────────────────────────────────────────────────────────
  const send = (res, status, payload, requestId) => {
    const text = status === 204 || payload === undefined ? '' : JSON.stringify(payload);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'x-request-id': requestId, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' });
    res.end(text);
  };
  const readBody = (req) => new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });

  const server = http.createServer(async (req, res) => {
    const requestId = randomUUID();
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const started = Date.now();
    try {
      if (latency) await new Promise((r) => setTimeout(r, latency));
      if (req.method === 'OPTIONS') return send(res, 204, undefined, requestId);

      // Kho tệp giả: nhận PUT của presigned URL và bỏ nội dung.
      if (req.method === 'PUT' && url.pathname.startsWith('/mock-storage/')) {
        const raw = await readBody(req);
        const doc = state.documents.find((d) => d.id === url.pathname.split('/').pop());
        if (!doc) throw notFound('Không tìm thấy tài liệu.');
        doc.receivedBytes = raw.length;
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
        return res.end();
      }

      tick(state);
      const found = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
      if (!found) throw notFound(`Không có endpoint ${req.method} ${url.pathname}.`);
      const params = {};
      const m = url.pathname.match(found.re);
      found.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });

      const raw = await readBody(req);
      let parsed = null;
      if (raw.length) {
        try { parsed = JSON.parse(raw.toString('utf8')); } catch { throw bad('JSON không hợp lệ.'); }
      }
      const ctx = { params, query: url.searchParams, body: parsed, origin: `http://${req.headers.host}`, user: found.auth ? authenticate(req) : null };
      const out = found.handler(ctx);
      const [status, payload] = Array.isArray(out) && typeof out[0] === 'number' ? out : [200, out];
      send(res, status, payload, requestId);
      log(`${req.method} ${url.pathname} → ${status} (${Date.now() - started} ms)`);
    } catch (err) {
      const e = err instanceof HttpError ? err : new HttpError(500, 'INTERNAL_ERROR', 'Lỗi nội bộ của API mock.');
      if (!(err instanceof HttpError)) log(`[mock] lỗi không lường trước: ${err.stack}`);
      send(res, e.status, { type: 'about:blank', title: TITLES[e.status] ?? 'Error', status: e.status, code: e.code, detail: e.message, requestId, ...(e.meta ? { meta: e.meta } : {}) }, requestId);
      log(`${req.method} ${url.pathname} → ${e.status} ${e.code}`);
    }
  });

  return { server, getState: () => state };
}

module.exports = { createApp };
