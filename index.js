const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  user: 'dagim',
  host: 'localhost',
  database: 'acme_ice_cream',
  password: '1234',
  port: 5432,
});

app.use(bodyParser.json());

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      DROP TABLE IF EXISTS flavors;
      CREATE TABLE flavors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      INSERT INTO flavors (name, is_favorite) VALUES 
      ('Vanilla', true),
      ('Chocolate', false),
      ('Strawberry', false);
    `);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};


initDb().catch(err => console.error(err.stack));

app.get('/api/flavors', async (req, res) => {
  const result = await pool.query('SELECT * FROM flavors');
  res.json(result.rows);
});

app.get('/api/flavors/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM flavors WHERE id = $1', [id]);
  res.json(result.rows[0]);
});

app.post('/api/flavors', async (req, res) => {
  const { name, is_favorite } = req.body;
  const result = await pool.query(
    'INSERT INTO flavors (name, is_favorite) VALUES ($1, $2) RETURNING *',
    [name, is_favorite]
  );
  res.json(result.rows[0]);
});

app.delete('/api/flavors/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM flavors WHERE id = $1', [id]);
  res.status(204).send();
});

app.put('/api/flavors/:id', async (req, res) => {
  const { id } = req.params;
  const { name, is_favorite } = req.body;
  const result = await pool.query(
    'UPDATE flavors SET name = $1, is_favorite = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
    [name, is_favorite, id]
  );
  res.json(result.rows[0]);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
