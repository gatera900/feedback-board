const path = require('path');
const express = require('express');
const db = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}


app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});



app.get('/api/feedbacks', async (req, res) => {
  try {
    const { category, sort, search } = req.query;

    const whereClauses = [];
    const params = [];

    if (category && category.toLowerCase() !== 'all') {
      whereClauses.push('LOWER(category) = LOWER(?)');
      params.push(category);
    }

    if (search && search.trim().length > 0) {
      whereClauses.push('(LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))');
      const like = `%${search.trim()}%`;
      params.push(like, like);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderBy = 'ORDER BY upvotes DESC, created_at DESC';
    if (sort === 'recent') {
      orderBy = 'ORDER BY created_at DESC';
    } else if (sort === 'most') {
      orderBy = 'ORDER BY upvotes DESC';
    }

    const rows = await all(
      `SELECT id, title, description, category, upvotes, created_at
       FROM feedbacks ${whereSql} ${orderBy}`,
      params
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
});


app.post('/api/feedbacks', async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title || !category) {
      res.status(400).json({ error: 'Title and category are required' });
      return;
    }
    const insert = await run(
      `INSERT INTO feedbacks (title, description, category) VALUES (?, ?, ?)`
      , [title.trim(), description ? description.trim() : '', category.trim()]
    );

    const row = await get(
      `SELECT id, title, description, category, upvotes, created_at FROM feedbacks WHERE id = ?`,
      [insert.lastID]
    );
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});


app.post('/api/feedbacks/:id/upvote', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const update = await run(`UPDATE feedbacks SET upvotes = upvotes + 1 WHERE id = ?`, [id]);
    if (update.changes === 0) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }
    const row = await get(
      `SELECT id, title, description, category, upvotes, created_at FROM feedbacks WHERE id = ?`,
      [id]
    );
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upvote' });
  }
});


app.get('/api/feedbacks/:id/comments', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const rows = await all(
      `SELECT id, feedback_id, author, content, created_at FROM comments WHERE feedback_id = ? ORDER BY created_at ASC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});


app.post('/api/feedbacks/:id/comments', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { author, content } = req.body;
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    const safeAuthor = author && author.trim().length > 0 ? author.trim() : 'Anonymous';
    await run(
      `INSERT INTO comments (feedback_id, author, content) VALUES (?, ?, ?)`,
      [id, safeAuthor, content.trim()]
    );
    const rows = await all(
      `SELECT id, feedback_id, author, content, created_at FROM comments WHERE feedback_id = ? ORDER BY created_at ASC`,
      [id]
    );
    res.status(201).json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

app.listen(PORT, () => {
  
  console.log(`Server running on http://localhost:${PORT}`);
});


