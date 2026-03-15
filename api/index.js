require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT.replace(/^'|'$/g, '');
const serviceAccount = JSON.parse(rawServiceAccount);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();
const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
});

const verifyAdmin = (req, res, next) => {
  const token = req.headers['x-admin-key'];
  if (token !== process.env.ADMIN_SECRET_KEY) return res.status(403).json({ error: 'Unauthorized' });
  next();
};

app.post('/api/auth', (req, res) => {
  const { secretKey } = req.body;
  if (secretKey === process.env.ADMIN_SECRET_KEY) res.json({ success: true });
  else res.status(401).json({ success: false });
});

app.get('/api/snippets', async (req, res) => {
  try {
    const snapshot = await db.ref('snippets').once('value');
    const data = snapshot.val() || {};
    const snippets = Object.keys(data).map(key => {
      const { password, ...safeData } = data[key];
      return { id: key, isLocked: !!password, views: safeData.views || 0, copies: safeData.copies || 0, ...safeData };
    });
    res.json(snippets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/snippets/detail', async (req, res) => {
  const { id, password } = req.body;
  const adminKey = req.headers['x-admin-key'];
  const isAdmin = adminKey === process.env.ADMIN_SECRET_KEY;

  try {
    const snapshot = await db.ref(`snippets/${id}`).once('value');
    const snippet = snapshot.val();
    if (!snippet) return res.status(404).json({ error: 'Not found' });
    
    if (!isAdmin && snippet.password && snippet.password !== password) {
      return res.status(401).json({ error: 'Locked' });
    }
    
    const gistRes = await githubApi.get(`/gists/${snippet.gistId}`);
    res.json({ ...snippet, files: gistRes.data.files, password: isAdmin ? snippet.password : null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/snippets/:id/view', async (req, res) => {
  try {
    const ref = db.ref(`snippets/${req.params.id}/views`);
    await ref.transaction(current => (current || 0) + 1);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/snippets/:id/copy', async (req, res) => {
  try {
    const ref = db.ref(`snippets/${req.params.id}/copies`);
    await ref.transaction(current => (current || 0) + 1);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/snippets', verifyAdmin, async (req, res) => {
  const { title, category, description, code, filename, password } = req.body;
  try {
    const gistRes = await githubApi.post('/gists', {
      description: title,
      public: false,
      files: { [filename]: { content: code } }
    });
    
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const hash = Math.random().toString(36).substring(2, 6);
    const slugId = baseSlug ? `${baseSlug}-${hash}` : hash;

    const snippetData = {
      title, category, description,
      gistId: gistRes.data.id,
      password: password || null,
      views: 0, copies: 0,
      createdAt: Date.now()
    };
    
    await db.ref(`snippets/${slugId}`).set(snippetData);
    res.json({ id: slugId, ...snippetData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/snippets/:id', verifyAdmin, async (req, res) => {
  const { title, category, description, code, filename, password, gistId } = req.body;
  try {
    await githubApi.patch(`/gists/${gistId}`, {
      files: { [filename]: { content: code } }
    });
    await db.ref(`snippets/${req.params.id}`).update({
      title, category, description, password: password || null
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/snippets/:id', verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.ref(`snippets/${req.params.id}`).once('value');
    const snippet = snapshot.val();
    if (snippet && snippet.gistId) await githubApi.delete(`/gists/${snippet.gistId}`);
    await db.ref(`snippets/${req.params.id}`).remove();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const snap = await db.ref('categories').once('value');
    const data = snap.val() || {};
    const categories = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/categories', verifyAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const snap = await db.ref('categories').once('value');
    const data = snap.val() || {};
    const isDuplicate = Object.values(data).some(c => c.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) return res.status(400).json({ error: 'Category already exists' });

    const newRef = db.ref('categories').push();
    await newRef.set({ name, createdAt: Date.now() });
    res.json({ id: newRef.key, name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/categories/:id', verifyAdmin, async (req, res) => {
  try {
    await db.ref(`categories/${req.params.id}`).remove();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/snippets', (req, res) => res.sendFile(path.join(__dirname, '../public/snippets.html')));
app.get('/snippet', (req, res) => res.sendFile(path.join(__dirname, '../public/detail.html')));
app.get('/zamsxit/login', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));
app.get('/zamsxit/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));
app.get('/zamsxit/logout', (req, res) => res.redirect('/zamsxit/login'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[ZamsXit Core] System Online on Port ${PORT}`));
module.exports = app;