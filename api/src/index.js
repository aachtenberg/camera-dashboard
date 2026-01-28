import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const app = express();
const port = process.env.API_PORT || 8080;

app.use(morgan('tiny'));
app.use(express.json());

// PostgreSQL connection pool
const pool = new pg.Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all cameras
app.get('/api/cameras', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, location, type, camera_url AS "cameraUrl", hls_path AS hls, enabled FROM cameras ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching cameras:', err);
    res.status(500).json({ error: 'Failed to fetch cameras' });
  }
});

// Add new camera
app.post('/api/cameras', async (req, res) => {
  const { name, location, type, cameraUrl, hls } = req.body;
  
  // Basic validation
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }
  
  if (type === 'mjpeg' && !cameraUrl) {
    return res.status(400).json({ error: 'cameraUrl is required for MJPEG cameras' });
  }
  
  if (type === 'hls' && !hls) {
    return res.status(400).json({ error: 'hls is required for HLS cameras' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO cameras (name, location, type, camera_url, hls_path, enabled)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, name, location, type, camera_url AS "cameraUrl", hls_path AS hls, enabled`,
      [name, location || 'Unknown', type, type === 'mjpeg' ? cameraUrl : null, type === 'hls' ? hls : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating camera:', err);
    res.status(500).json({ error: 'Failed to create camera' });
  }
});

// Delete camera
app.delete('/api/cameras/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid camera ID' });
  }
  
  try {
    const result = await pool.query('DELETE FROM cameras WHERE id = $1 RETURNING id', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting camera:', err);
    res.status(500).json({ error: 'Failed to delete camera' });
  }
});

// Get images for a camera
app.get('/api/cameras/:id/images', async (req, res) => {
  const cameraId = parseInt(req.params.id);
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  
  if (isNaN(cameraId)) {
    return res.status(400).json({ error: 'Invalid camera ID' });
  }
  
  try {
    const result = await pool.query(
      `SELECT id, camera_id AS "cameraId", timestamp, file_path AS "filePath", 
              file_size AS "fileSize", motion_triggered AS "motionTriggered"
       FROM images 
       WHERE camera_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2 OFFSET $3`,
      [cameraId, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching images:', err);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Get all recent images
app.get('/api/images', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const cameraId = req.query.cameraId ? parseInt(req.query.cameraId) : null;
  
  try {
    let query = `
      SELECT i.id, i.camera_id AS "cameraId", i.timestamp, i.file_path AS "filePath", 
             i.file_size AS "fileSize", i.motion_triggered AS "motionTriggered",
             c.name AS "cameraName"
      FROM images i
      JOIN cameras c ON i.camera_id = c.id
    `;
    const params = [];
    
    if (cameraId) {
      query += ' WHERE i.camera_id = $1';
      params.push(cameraId);
    }
    
    query += ' ORDER BY i.timestamp DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching images:', err);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await pool.end();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`api listening on ${port}`);
});
