async function load() {
  const res = await fetch('/api/cameras');
  const cams = await res.json();
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  cams.forEach(cam => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.position = 'relative';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.margin = '8px 12px';

    const h = document.createElement('h3');
    h.textContent = cam.name;
    h.style.margin = '0';

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.style.background = 'transparent';
    deleteBtn.style.border = '1px solid #ff4444';
    deleteBtn.style.color = '#ff4444';
    deleteBtn.style.borderRadius = '2px';
    deleteBtn.style.padding = '1px 4px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.fontSize = '10px';
    deleteBtn.style.lineHeight = '1';
    deleteBtn.style.fontWeight = 'bold';
    deleteBtn.onclick = async () => {
      if (confirm(`Are you sure you want to delete ${cam.name}?`)) {
        await fetch(`/api/cameras/${cam.id}`, { method: 'DELETE' });
        load();
      }
    };

    header.appendChild(h);
    header.appendChild(deleteBtn);
    card.appendChild(header);

    // Handle MJPEG streams (direct from ESP32 cameras)
    if (cam.type === 'mjpeg' && cam.cameraUrl) {
      // Use iframe to embed the camera's native web interface
      const iframe = document.createElement('iframe');
      iframe.src = cam.cameraUrl;
      iframe.style.width = '100%';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.display = 'block';

      card.appendChild(iframe);
      grid.appendChild(card);
      return;
    }

    // Handle HLS streams
    if (cam.type === 'hls' && cam.hls) {
      const v = document.createElement('video');
      v.controls = true;
      v.autoplay = false;
      v.muted = true;

      // Check if HLS is natively supported (Safari)
      if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = cam.hls;
      }
      // Use hls.js for other browsers
      else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        hls.loadSource(cam.hls);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
          console.log('HLS manifest loaded for', cam.name);
        });
        hls.on(Hls.Events.ERROR, function(event, data) {
          console.error('HLS error for', cam.name, data);
          if (data.fatal) {
            h.textContent = cam.name + ' (Error loading stream)';
          }
        });
      }
      else {
        h.textContent = cam.name + ' (HLS not supported)';
      }

      card.appendChild(v);
      grid.appendChild(card);
    }
  });
}

// Handle side panel
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('add-camera-btn');
  const closeBtn = document.getElementById('close-panel');
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('side-panel');
  const typeSelect = document.getElementById('cam-type');
  const mjpegFields = document.getElementById('mjpeg-fields');
  const hlsFields = document.getElementById('hls-fields');

  function openPanel() {
    panel.classList.add('open');
    overlay.classList.add('show');
  }

  function closePanel() {
    panel.classList.remove('open');
    overlay.classList.remove('show');
  }

  addBtn.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  // Show/hide fields based on type
  typeSelect.addEventListener('change', () => {
    const type = typeSelect.value;
    if (type === 'mjpeg') {
      mjpegFields.style.display = 'block';
      hlsFields.style.display = 'none';
    } else if (type === 'hls') {
      mjpegFields.style.display = 'none';
      hlsFields.style.display = 'block';
    } else {
      mjpegFields.style.display = 'block';
      hlsFields.style.display = 'none';
    }
  });

  // Handle form submission
  const form = document.getElementById('camera-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('cam-name').value;
    const location = document.getElementById('cam-location').value;
    const type = document.getElementById('cam-type').value;
    const cameraUrl = document.getElementById('cam-url').value;
    const hls = document.getElementById('cam-hls').value;

    const payload = {
      name,
      location: location || 'Unknown',
      type,
      cameraUrl: type === 'mjpeg' ? cameraUrl : null,
      hls: type === 'hls' ? hls : null
    };

    const res = await fetch('/api/cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      form.reset();
      load();
      closePanel();
    } else {
      const error = await res.json();
      alert(`Error: ${error.error}`);
    }
  });
});

load();
