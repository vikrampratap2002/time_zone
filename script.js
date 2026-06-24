 const API_KEY = '5bb35f2842264f86a262ca23dd727570'; // 🔑 Replace with your key

  // Helper: offset seconds → "UTC+05:30" string
  function secToOffset(sec) {
    if (sec === undefined || sec === null) return '';
    const abs = Math.abs(sec);
    const h   = Math.floor(abs / 3600);
    const m   = Math.floor((abs % 3600) / 60);
    const sign = sec >= 0 ? '+' : '-';
    return `UTC${sign}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  // Fill an info panel with timezone data + coords + reverse-geo data
  function fillPanel(prefix, tzData, lat, lon, geoProps) {
    const tz = tzData.timezone || tzData;

    document.getElementById(`${prefix}-name`).textContent         = tz.name || '';
    document.getElementById(`${prefix}-lat`).textContent          = parseFloat(lat).toFixed(5);
    document.getElementById(`${prefix}-lon`).textContent          = parseFloat(lon).toFixed(5);
    document.getElementById(`${prefix}-offset-std`).textContent   = secToOffset(tz.offset_STD);
    document.getElementById(`${prefix}-offset-std-sec`).textContent = tz.offset_STD ?? '';
    document.getElementById(`${prefix}-offset-dst`).textContent   = secToOffset(tz.offset_DST);
    document.getElementById(`${prefix}-offset-dst-sec`).textContent = tz.offset_DST ?? '';

    if (geoProps) {
      document.getElementById(`${prefix}-country`).textContent  = geoProps.country || '';
      document.getElementById(`${prefix}-postcode`).textContent = geoProps.postcode || '';
      document.getElementById(`${prefix}-city`).textContent     = geoProps.city || geoProps.town || geoProps.village || '';
    }
  }

  // ── STEP 3: Auto-detect current timezone ────────────────
  async function initCurrentTimezone() {
    const loadEl  = document.getElementById('current-loading');
    const dataEl  = document.getElementById('current-data');
    const errEl   = document.getElementById('current-error');

    if (!navigator.geolocation) {
      loadEl.style.display = 'none';
      errEl.style.display  = 'block';
      errEl.textContent    = 'Geolocation not supported by your browser.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          // Timezone
          const tzRes  = await fetch(`https://api.geoapify.com/v1/timezone?lat=${lat}&lon=${lon}&apiKey=${API_KEY}`);
          const tzData = await tzRes.json();

          // Reverse geocode for city/postcode/country
          const rgRes  = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${API_KEY}`);
          const rgData = await rgRes.json();
          const props  = rgData.features?.[0]?.properties || {};

          fillPanel('c', tzData, lat, lon, props);
          loadEl.style.display = 'none';
          dataEl.style.display = 'block';
        } catch(e) {
          loadEl.style.display = 'none';
          errEl.style.display  = 'block';
          errEl.textContent    = 'Could not fetch timezone: ' + e.message;
        }
      },
      (err) => {
        loadEl.style.display = 'none';
        errEl.style.display  = 'block';
        errEl.textContent    = 'Location access denied or unavailable.';
      },
      { timeout: 10000 }
    );
  }

  // ── STEP 4: Search by address ────────────────────────────
  async function searchAddress() {
    const input    = document.getElementById('address-input');
    const errorEl  = document.getElementById('addr-error');
    const resultEl = document.getElementById('result-section');
    const btn      = document.getElementById('search-btn');
    const address  = input.value.trim();

    // Reset
    errorEl.style.display  = 'none';
    resultEl.style.display = 'none';

    // Validate
    if (!address || address.length < 3) {
      errorEl.style.display = 'block';
      errorEl.textContent   = 'Please enter a valid address !';
      return;
    }

    btn.disabled       = true;
    btn.textContent    = 'Searching…';

    try {
      // Geocode address → lat/lon
      const geoRes  = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&limit=1&apiKey=${API_KEY}`);
      const geoData = await geoRes.json();

      if (!geoData.features || geoData.features.length === 0) {
        throw new Error('timezone could not be found');
      }

      const feature = geoData.features[0];
      const [lon, lat] = feature.geometry.coordinates;
      const props = feature.properties;

      // Fetch timezone
      const tzRes  = await fetch(`https://api.geoapify.com/v1/timezone?lat=${lat}&lon=${lon}&apiKey=${API_KEY}`);
      const tzData = await tzRes.json();

      fillPanel('r', tzData, lat, lon, props);
      resultEl.style.display = 'block';

    } catch(e) {
      errorEl.style.display = 'block';
      errorEl.textContent   = 'timezone could not be found !';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Search';
    }
  }

  // Enter key support
  document.getElementById('address-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchAddress();
  });

  // Auto-run on page load
  initCurrentTimezone();