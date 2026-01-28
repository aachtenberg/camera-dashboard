-- Initial schema for camera dashboard
-- Based on SURVEILLANCE_DASHBOARD_PLAN.md Phase 2

CREATE TABLE IF NOT EXISTS cameras (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('mjpeg', 'hls', 'rtsp')),
    camera_url TEXT,
    hls_path TEXT,
    rtsp_url TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    motion_triggered BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS motion_events (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    score FLOAT,
    image_id INTEGER REFERENCES images(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_camera_timestamp ON images(camera_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_motion_events_camera_timestamp ON motion_events(camera_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cameras_enabled ON cameras(enabled);

-- Insert default cameras from current in-memory data
INSERT INTO cameras (name, location, type, camera_url, hls_path, enabled) VALUES
    ('Family Room Cam', 'Family Room', 'mjpeg', 'http://192.168.0.206/', NULL, true),
    ('Surveillance Cam', 'Unknown', 'mjpeg', 'http://192.168.0.219/', NULL, true),
    ('Camera 3', 'Unknown', 'hls', NULL, '/streams/camera3/index.m3u8', false),
    ('Camera 4', 'Unknown', 'hls', NULL, '/streams/camera4/index.m3u8', false),
    ('Camera 5', 'Unknown', 'hls', NULL, '/streams/camera5/index.m3u8', false)
ON CONFLICT DO NOTHING;
