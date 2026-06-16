const request = require('supertest');
const app = require('../src/app');

// Mock Firestore supaya test tidak perlu koneksi ke GCP/emulator
jest.mock('@google-cloud/firestore', () => {
  const mockData = {};

  const mockDoc = (id, data) => ({
    id,
    exists: !!data,
    data: () => data,
  });

  return {
    Firestore: jest.fn().mockImplementation(() => ({
      collection: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            docs: Object.entries(mockData).map(([id, data]) => mockDoc(id, data)),
          }),
        }),
        add: jest.fn().mockResolvedValue({ id: 'mock-id-123' }),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockDoc('mock-id-123', {
            name: 'item test',
            description: 'deskripsi test',
            createdAt: '2024-01-01T00:00:00.000Z',
          })),
          delete: jest.fn().mockResolvedValue({}),
        }),
      }),
    })),
  };
});

describe('API Gateway - Health Check', () => {
  test('GET /health harus balik status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('api-gateway');
  });
});

describe('API Gateway - Items', () => {
  test('GET /api/items harus balik array items', async () => {
    const res = await request(app).get('/api/items');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('POST /api/items tanpa name harus balik 400', async () => {
    const res = await request(app)
      .post('/api/items')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('name wajib diisi');
  });

  test('POST /api/items dengan name yang valid harus berhasil', async () => {
    const res = await request(app)
      .post('/api/items')
      .send({ name: 'item baru', description: 'ini deskripsinya' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('item baru');
  });

  test('GET /api/items/:id harus balik data item', async () => {
    const res = await request(app).get('/api/items/mock-id-123');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name');
  });

  test('DELETE /api/items/:id harus berhasil', async () => {
    const res = await request(app).delete('/api/items/mock-id-123');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Item berhasil dihapus');
  });
});
