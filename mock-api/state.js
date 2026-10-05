'use strict';
/**
 * Trạng thái trong bộ nhớ của API mock: dữ liệu seed + "đồng hồ" đẩy tài liệu và AI Job qua các
 * trạng thái theo thời gian. Mọi thứ mất khi tắt server (hoặc gọi `POST /__mock/reset`).
 */
const { randomUUID } = require('node:crypto');
const { buildChunks, buildLessons } = require('./content');

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const iso = (ms) => new Date(ms).toISOString();

/** Tên chứa các từ này → tài liệu trích xuất thất bại / AI Job thất bại (để thử trạng thái lỗi). */
const FAIL_PATTERN = /l[oỗ]i|loi|fail|error/i;

const PLANS = [
  {
    code: 'FREE',
    name: 'Miễn phí',
    description: 'Đủ để thử LEARN với vài khóa học.',
    priceCents: 0,
    currency: 'USD',
    interval: 'month',
    features: ['5 khóa học', '10 tài liệu mỗi tháng', '5 lượt sinh bài bằng AI mỗi tháng'],
    isFutureExtension: false,
  },
  {
    code: 'PRO',
    name: 'Pro',
    description: 'Không giới hạn cho người học nghiêm túc.',
    priceCents: 900,
    currency: 'USD',
    interval: 'month',
    features: ['Không giới hạn khóa học', 'Không giới hạn tài liệu', 'Không giới hạn lượt sinh bài'],
    isFutureExtension: false,
  },
];

const LIMITS = {
  FREE: { COURSES_CREATED: 5, DOCUMENTS_UPLOADED: 10, AI_JOBS_RUN: 5 },
  PRO: { COURSES_CREATED: null, DOCUMENTS_UPLOADED: null, AI_JOBS_RUN: null },
};

function makeUser(email, displayName, role, password, now) {
  return {
    id: randomUUID(),
    email,
    displayName,
    role,
    locale: 'vi',
    emailVerifiedAt: iso(now - 30 * DAY),
    createdAt: iso(now - 30 * DAY),
    password,
  };
}

function createState(options = {}) {
  const now = options.now ?? Date.now();
  const state = {
    options: { jobMs: 6000, ...options },
    users: new Map(),
    refreshTokens: new Map(),
    resetTokens: new Map(),
    courses: [],
    documents: [],
    lessons: [],
    submissions: [],
    progress: new Map(), // `${userId}:${lessonId}` → { status, bestScore }
    jobs: [],
    audit: [],
    subscriptions: new Map(),
  };

  const demo = makeUser('demo@learn.ai', 'Học viên Demo', 'LEARNER', 'Demo@12345', now);
  const admin = makeUser('admin@learn.ai', 'Quản trị viên', 'ADMIN', 'Admin@12345', now);
  for (const u of [demo, admin]) {
    state.users.set(u.id, u);
    state.subscriptions.set(u.id, {
      planCode: 'FREE',
      status: 'ACTIVE',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }

  // Khóa 1 (cùng tên với dữ liệu seed của backend thật, để e2e chạy được trên mock): đủ bài học, bài tập và lịch sử làm bài.
  const git = addCourse(state, demo.id, 'Lập trình TypeScript', 'Từ kiểu dữ liệu cơ bản tới generics.', now - 10 * DAY);
  const gitDoc = addDocument(state, git, 'typescript-co-ban.md', 'text/markdown', 5442, now - 10 * DAY);
  gitDoc.status = 'EXTRACTED';
  gitDoc.pageCount = 6;
  gitDoc.chunks = buildChunks(gitDoc.id, gitDoc.filename, 6);
  gitDoc.chunkCount = gitDoc.chunks.length;
  const gitLessons = buildLessons(
    'TypeScript',
    'MEDIUM',
    gitDoc.chunks.map((c) => c.id),
  ).map((l) => ({ ...l, courseId: git.id }));
  state.lessons.push(...gitLessons);
  setProgress(state, demo.id, gitLessons[0].id, 'COMPLETED', 8);
  setProgress(state, demo.id, gitLessons[1].id, 'IN_PROGRESS', null);
  [
    [gitLessons[0], 8, 3 * DAY],
    [gitLessons[0], 6, 2 * DAY],
    [gitLessons[0], 8, DAY],
  ].forEach(([lesson, score, ago], i) => {
    const ex = lesson.exercises[0];
    state.submissions.push({
      id: randomUUID(),
      userId: demo.id,
      courseId: git.id,
      lessonId: lesson.id,
      exerciseId: ex.id,
      attemptNo: i + 1,
      score,
      maxScore: 10,
      passed: score >= ex.passScore,
      createdAt: iso(now - ago),
    });
  });
  const okJob = addJob(state, git, demo, now - 10 * DAY + 5 * MIN, 'SUCCEEDED');
  okJob.progress = 100;
  okJob.materialized = true;

  // Khóa 2: có tài liệu, chưa có bài học — để thử luồng sinh bài bằng AI.
  const eng = addCourse(
    state,
    demo.id,
    'Tiếng Anh giao tiếp',
    'Mẫu câu thường dùng nơi công sở.',
    now - 2 * DAY,
  );
  const engDoc = addDocument(state, eng, 'english-office.pdf', 'application/pdf', 812_000, now - 2 * DAY);
  engDoc.status = 'EXTRACTED';
  engDoc.pageCount = 12;
  engDoc.chunks = buildChunks(engDoc.id, engDoc.filename, 8);
  engDoc.chunkCount = engDoc.chunks.length;
  const failed = addJob(state, eng, demo, now - 2 * DAY + 10 * MIN, 'FAILED');
  failed.error = {
    code: 'AI_GENERATION_TIMEOUT',
    message: 'Mô hình không phản hồi kịp thời gian cho phép.',
    detail: null,
  };
  state.audit.push({
    id: randomUUID(),
    actorEmail: admin.email,
    action: 'AI_JOB_VIEWED',
    entityType: 'AIJob',
    entityId: failed.id,
    metadata: null,
    createdAt: iso(now - DAY),
  });

  return state;
}

function addCourse(state, userId, title, description, now) {
  const course = {
    id: randomUUID(),
    userId,
    title,
    description,
    language: 'vi',
    status: 'READY',
    createdAt: iso(now),
    updatedAt: iso(now),
  };
  state.courses.push(course);
  return course;
}

function addDocument(state, course, filename, mimeType, sizeBytes, now) {
  const doc = {
    id: randomUUID(),
    courseId: course.id,
    userId: course.userId,
    filename,
    mimeType,
    sizeBytes,
    status: 'PENDING',
    pageCount: null,
    chunkCount: 0,
    errorMessage: null,
    createdAt: iso(now),
    confirmedAtMs: now,
    chunks: [],
  };
  state.documents.push(doc);
  return doc;
}

function addJob(state, course, user, nowMs, status = 'QUEUED', type = 'GENERATE_LESSONS') {
  const finished = status !== 'QUEUED' && status !== 'RUNNING';
  const job = {
    id: randomUUID(),
    courseId: course.id,
    userId: user.id,
    documentId: null,
    type,
    status,
    progress: finished ? 0 : 0,
    progressLabel: null,
    error: null,
    queuedAt: iso(nowMs),
    queuedAtMs: nowMs,
    startedAt: finished ? iso(nowMs + 1000) : null,
    finishedAt: finished ? iso(nowMs + 7000) : null,
    attempt: 1,
    inputParams: { difficulty: 'MEDIUM', language: course.language },
    runs: finished
      ? [
          {
            id: randomUUID(),
            step: 'plan',
            model: 'mock-model',
            inputTokens: 1800,
            outputTokens: 420,
            latencyMs: 2100,
            createdAt: iso(nowMs + 2000),
          },
        ]
      : [],
    materialized: false,
    difficulty: 'MEDIUM',
  };
  state.jobs.push(job);
  return job;
}

function setProgress(state, userId, lessonId, status, bestScore) {
  state.progress.set(`${userId}:${lessonId}`, { status, bestScore });
}

function getProgress(state, userId, lessonId) {
  return state.progress.get(`${userId}:${lessonId}`) ?? { status: 'NOT_STARTED', bestScore: null };
}

/** Đẩy tài liệu và AI Job tới trạng thái đúng với thời điểm `now`. Gọi ở đầu mỗi request. */
function tick(state, now = Date.now()) {
  for (const doc of state.documents) {
    if (doc.status !== 'UPLOADED' && doc.status !== 'EXTRACTING') continue;
    const elapsed = now - doc.confirmedAtMs;
    if (elapsed >= state.options.jobMs / 2) {
      if (FAIL_PATTERN.test(doc.filename)) {
        doc.status = 'FAILED';
        doc.errorMessage = 'Không đọc được nội dung tệp (API mock: tên tệp chứa "lỗi").';
      } else {
        doc.status = 'EXTRACTED';
        doc.pageCount = 3 + (doc.filename.length % 12);
        doc.chunks = buildChunks(doc.id, doc.filename, 6);
        doc.chunkCount = doc.chunks.length;
      }
    } else if (elapsed >= 1000) {
      doc.status = 'EXTRACTING';
    }
  }

  for (const job of state.jobs) {
    if (job.status !== 'QUEUED' && job.status !== 'RUNNING') continue;
    const course = state.courses.find((c) => c.id === job.courseId);
    const elapsed = now - job.queuedAtMs;
    const run = state.options.jobMs;
    if (elapsed < 1000) {
      job.status = 'QUEUED';
      job.progress = 0;
      job.progressLabel = 'Đang chờ trong hàng đợi';
    } else if (elapsed < 1000 + run) {
      job.status = 'RUNNING';
      job.startedAt ??= iso(job.queuedAtMs + 1000);
      job.progress = Math.min(95, Math.floor(((elapsed - 1000) / run) * 100));
      job.progressLabel =
        job.progress < 30 ? 'Đọc tài liệu' : job.progress < 70 ? 'Soạn bài học' : 'Tạo bài tập';
    } else if (course && FAIL_PATTERN.test(course.title)) {
      job.status = 'FAILED';
      job.finishedAt = iso(job.queuedAtMs + 1000 + run);
      job.error = {
        code: 'AI_GENERATION_FAILED',
        message: 'AI giả được cấu hình để thất bại (tên khóa học có chữ "lỗi").',
        detail: null,
      };
    } else {
      job.status = 'SUCCEEDED';
      job.progress = 100;
      job.progressLabel = 'Hoàn tất';
      job.finishedAt = iso(job.queuedAtMs + 1000 + run);
      job.runs = [
        {
          id: randomUUID(),
          step: 'generate-lessons',
          model: 'mock-model',
          inputTokens: 2400,
          outputTokens: 1300,
          latencyMs: run,
          createdAt: job.finishedAt,
        },
      ];
      if (!job.materialized && course) materializeLessons(state, job, course);
    }
  }
}

function materializeLessons(state, job, course) {
  const chunkIds = state.documents
    .filter((d) => d.courseId === course.id && d.status === 'EXTRACTED')
    .flatMap((d) => d.chunks.map((c) => c.id));
  const base = state.lessons.filter((l) => l.courseId === course.id).length;
  const fresh = buildLessons(course.title, job.difficulty, chunkIds).map((l, i) => ({
    ...l,
    courseId: course.id,
    orderIndex: base + i,
  }));
  state.lessons.push(...fresh);
  job.materialized = true;
  course.status = 'READY';
  course.updatedAt = new Date().toISOString();
}

module.exports = {
  PLANS,
  LIMITS,
  FAIL_PATTERN,
  createState,
  addCourse,
  addDocument,
  addJob,
  tick,
  setProgress,
  getProgress,
  iso,
  DAY,
};
