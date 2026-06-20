const express = require('express');
const { Firestore } = require('@google-cloud/firestore');

const app = express();
const db = new Firestore();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'worker' });
});

// Terima job dan proses
app.post('/process', async (req, res) => {
  const { job_id, payload } = req.body;

  if (!job_id) {
    return res.status(400).json({ error: 'job_id wajib diisi' });
  }

  try {
    console.log(`Memproses job: ${job_id}`);

    // Simpan status "processing" dulu
    await db.collection('job_results').doc(job_id).set({
      job_id,
      status: 'processing',
      payload: payload || {},
      startedAt: new Date().toISOString(),
    });

    // Simulasi proses (misalnya resize gambar, kirim email, dll)
    const output = {
      processed: true,
      itemCount: Array.isArray(payload) ? payload.length : 1,
      summary: `Job ${job_id} berhasil diproses`,
    };

    // Update ke "completed"
    await db.collection('job_results').doc(job_id).update({
      status: 'completed',
      output,
      completedAt: new Date().toISOString(),
    });

    console.log(`Job ${job_id} selesai`);
    res.json({ job_id, status: 'completed', output });

  } catch (err) {
    console.error(`Error memproses job ${job_id}:`, err);

    // Tandai job sebagai gagal
    await db.collection('job_results').doc(job_id).set({
      job_id,
      status: 'failed',
      error: err.message,
      failedAt: new Date().toISOString(),
    }).catch(() => {});

    res.status(500).json({ error: 'Gagal memproses job' });
  }
});

// Ambil hasil job
app.get('/results/:job_id', async (req, res) => {
  try {
    const doc = await db.collection('job_results').doc(req.params.job_id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Job tidak ditemukan' });
    }

    res.json(doc.data());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil hasil job' });
  }
});

// List semua job results
app.get('/results', async (req, res) => {
  try {
    const snapshot = await db.collection('job_results').limit(20).get();
    const results = snapshot.docs.map(doc => doc.data());
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil daftar job' });
  }
});

module.exports = app;
