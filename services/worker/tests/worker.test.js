const request = require('supertest');

// Mock Firestore
jest.mock('@google-cloud/firestore', () => {
  return {
    Firestore: jest.fn().mockImplementation(() => ({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          set: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              job_id: 'job-test-001',
              status: 'completed',
              output: { processed: true, itemCount: 1 },
              completedAt: '2024-01-01T00:00:00.000Z',
            }),
          }),
        }),
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        }),
      }),
    })),
  };
});

const app = require('../src/index');

describe('Worker - Health Check', () => {
  test('GET /health harus balik status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('worker');
  });
});

describe('Worker - Process Job', () => {
  test('POST /process tanpa job_id harus balik 400', async () => {
    const res = await request(app)
      .post('/process')
      .send({ payload: { data: 'test' } });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('job_id wajib diisi');
  });

  test('POST /process dengan job_id valid harus berhasil', async () => {
    const res = await request(app)
      .post('/process')
      .send({ job_id: 'job-test-001', payload: { data: 'test' } });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.output.processed).toBe(true);
  });

  test('GET /results/:job_id harus balik data job', async () => {
    const res = await request(app).get('/results/job-test-001');
    expect(res.statusCode).toBe(200);
    expect(res.body.job_id).toBe('job-test-001');
    expect(res.body.status).toBe('completed');
  });

  test('GET /results harus balik array', async () => {
    const res = await request(app).get('/results');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
  });
});
