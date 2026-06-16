const express = require('express');
const { Firestore } = require('@google-cloud/firestore');

const app = express();
const db = new Firestore();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

app.get('/api/items', async (req, res) => {
  try {
    const snapshot = await db.collection('items').limit(20).get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil items' });
  }
});

app.post('/api/items', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name wajib diisi' });

  try {
    const docRef = await db.collection('items').add({
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ id: docRef.id, name, description: description || '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membuat item' });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const doc = await db.collection('items').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Item tidak ditemukan' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil item' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    await db.collection('items').doc(req.params.id).delete();
    res.json({ message: 'Item berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus item' });
  }
});

module.exports = app;
