// ============================================
// Configuration — matches your .env in backend
// ============================================
const CONFIG = {
  authentikBase: 'http://localhost:9000',
  clientId: 'my-app',
  redirectUri: 'http://localhost:5173/callback',
  backendUrl: 'http://localhost:4000',
  scope: 'openid profile email'
};

// ============================================
// State
// ============================================
let tokenExpiry = null;
let timerInterval = null;
let accessToken = null;

// ============================================
// Logging
// ============================================
function log(msg, type = 'info') {
  const colors = {
    success: '#3b6d11',
    danger: '#a32d2d',
    info: '#185fa5',
    warn: '#854f0b'
  };
  const el = document.getElementById('log');
  const time = new Date().toLocaleTimeString();
  const div = document.createElement('div');
  div.style.color = colors[type] || '#555';
  div.textContent = `[${time}] ${msg}`;
  el.prepend(div);
}

// ============================================
// Badge Helper
// ============================================
function setBadge(id, text, type = 'info') {
  const el = document.getElementById(id);
  el.className = 'badge ' + type;
  el.textContent = text;
}

// ============================================
// Timer
// ============================================
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const remaining = tokenExpiry - Date.now();
    if (remaining <= 0) {
      clearInterval(timerInterval);
      handleTokenExpiry();
      return;
    }
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    document.getElementById('timer').textContent =
      `${mins}:${secs.toString().padStart(2, '0')}`;
  }, 500);
}

function handleTokenExpiry() {
  accessToken = null;
  document.getElementById('token-status').textContent = 'Expired';
  document.getElementById('timer').textContent = '0:00';
  document.getElementById('token-display').textContent = 'Token expired — please login again';
  setBadge('badge-step3', 'expired', 'danger');
  setBadge('badge-response', '401 Unauthorized', 'danger');
  document.getElementById('last-response').textContent = '401';
  log('Token expired — login required', 'danger');
}

// ============================================
// Step 1 — Login with Authentik
// ============================================
function login() {
  log('Redirecting to Authentik login...', 'info');
  setBadge('badge-step1', 'redirecting', 'warning');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CONFIG.clientId,
    redirect_uri: CONFIG.redirectUri,
    scope: CONFIG.scope,
  });

  window.location.href =
    `${CONFIG.authentikBase}/application/o/authorize/?${params}`;
}

// ============================================
// Step 2 — Handle Callback (after Authentik redirects back)
// ============================================
async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (!code) return;

  log('Received auth code — exchanging for JWT...', 'info');
  setBadge('badge-step1', 'done', 'success');
  setBadge('badge-step2', 'verified', 'success');
  setBadge('badge-step3', 'issuing...', 'warning');

  try {
    // Exchange auth code for token
    const response = await fetch(
      `${CONFIG.authentikBase}/application/o/token/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: CONFIG.redirectUri,
          client_id: CONFIG.clientId,
        }),
      }
    );

    const data = await response.json();

    if (data.access_token) {
      accessToken = data.access_token;
      tokenExpiry = Date.now() + data.expires_in * 1000;

      // Store token
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('token_expiry', tokenExpiry);

      // Update UI
      document.getElementById('token-status').textContent = 'Valid';
      document.getElementById('last-response').textContent = 'JWT issued';
      document.getElementById('token-display').textContent = accessToken;
      setBadge('badge-step3', 'issued', 'success');

      log('JWT issued successfully — 5 min timer started', 'success');
      startTimer();

      // Clean URL
      window.history.replaceState({}, '', '/');
    } else {
      log('Token exchange failed — check Authentik config', 'danger');
    }

  } catch (err) {
    log('Error connecting to Authentik: ' + err.message, 'danger');
  }
}

// ============================================
// Step 3 — Call Protected Endpoint
// ============================================
async function callSecureEndpoint() {
  // Check for stored token
  if (!accessToken) {
    accessToken = localStorage.getItem('access_token');
    const expiry = localStorage.getItem('token_expiry');
    if (expiry) tokenExpiry = parseInt(expiry);
  }

  if (!accessToken || Date.now() > tokenExpiry) {
    log('No valid token — request blocked', 'danger');
    setBadge('badge-step4', 'failed', 'danger');
    setBadge('badge-step5', 'failed', 'danger');
    setBadge('badge-step6', 'denied', 'danger');
    setBadge('badge-response', '401 Unauthorized', 'danger');
    document.getElementById('last-response').textContent = '401';
    return;
  }

  log('Sending API request to /secure-data with JWT...', 'info');
  setBadge('badge-step4', 'verifying', 'warning');

  try {
    const response = await fetch(
      `${CONFIG.backendUrl}/secure-data`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    setBadge('badge-step4', 'valid', 'success');
    setBadge('badge-step5', 'not expired', 'success');

    if (response.ok) {
      const data = await response.json();
      setBadge('badge-step6', 'allowed', 'success');
      setBadge('badge-response', '200 OK', 'success');
      document.getElementById('last-response').textContent = '200 OK';
      log('Access granted — secure data received!', 'success');
      console.log('Secure data:', data);
    } else {
      setBadge('badge-step6', 'denied', 'danger');
      setBadge('badge-response', '401 Unauthorized', 'danger');
      document.getElementById('last-response').textContent = '401';
      log('Access denied — token invalid or expired', 'danger');
    }

  } catch (err) {
    log('Error connecting to backend: ' + err.message, 'danger');
  }
}

// ============================================
// On Page Load — Check if returning from Authentik
// ============================================
window.addEventListener('load', () => {
  log('Dashboard ready — click Login to begin', 'info');

  // Check if we have a stored valid token
  const storedToken = localStorage.getItem('access_token');
  const storedExpiry = localStorage.getItem('token_expiry');

  if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
    accessToken = storedToken;
    tokenExpiry = parseInt(storedExpiry);
    document.getElementById('token-status').textContent = 'Valid';
    document.getElementById('token-display').textContent = storedToken;
    log('Existing valid token found — ready to use', 'success');
    setBadge('badge-step3', 'active', 'success');
    startTimer();
  }

  // Handle redirect back from Authentik
  if (window.location.search.includes('code=')) {
    handleCallback();
  }
});