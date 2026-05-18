// Configuration
const CONFIG = {
  authentikBase: 'http://localhost:9000',
  clientId: 'my-app',
  redirectUri: 'http://localhost:5173/callback',
  logoutUri: 'http://localhost:5173',
  backendUrl: 'http://localhost:4000',
  scope: 'openid profile email offline_access'
};

// Session Inactivity Settings Testing
const SESSION_TIMEOUT = 15 * 1000;  // 15 seconds
const SESSION_WARNING = 10 * 1000;  // warn at 10 seconds

// Session Inactivity Settings
// const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
// const SESSION_WARNING = 5 * 60 * 1000; // warn at 5 minutes before auto-logout

// State
let tokenExpiry = null; // timestamp when token expires
let timerInterval = null;
let accessToken = null;
let refreshToken = null;
let autoRefreshTriggered = false;
let sessionTimer = null;
let sessionWarningTimer = null;
let sessionWarningInterval = null;

// Logging
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

// Badge Helper
function setBadge(id, text, type = 'info') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'badge ' + type;
  el.textContent = text;
}

// Timer
function startTimer() {
  autoRefreshTriggered = false;
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

    // Auto-refresh at 1 minute remaining
    // if (remaining <= 60000 && !autoRefreshTriggered) {
    //   autoRefreshTriggered = true;
    //   log('1 minute remaining — auto-refreshing token...', 'warn');
    //   refreshAccessToken();
    // }
  }, 500);
}

function handleTokenExpiry() {
  accessToken = null;
  tokenExpiry = null;
  refreshToken = null;
  
  localStorage.removeItem('access_token');
  localStorage.removeItem('token_expiry');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('id_token');

  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  stopSessionTimer();

  document.getElementById('token-status').textContent = 'Expired';
  document.getElementById('timer').textContent = '0:00';
  document.getElementById('token-display').textContent = 'Token expired — please login again';

  ['badge-step1','badge-step2','badge-step3',
   'badge-step4','badge-step5','badge-step6',
   'badge-response'].forEach(id => setBadge(id, 'waiting', 'gray'));

  log('Token expired — login required', 'danger');
}

// ============================================
// Session Inactivity Timer
// ============================================

function createWarningBanner() {
  if (document.getElementById('session-warning')) return;

  const banner = document.createElement('div');
  banner.id = 'session-warning';
  banner.style.cssText = `
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0;
    background: #7a2a00;
    color: #fff;
    text-align: center;
    padding: 14px 20px;
    font-size: 15px;
    font-weight: bold;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  `;
  banner.innerHTML = `
    ⚠️ You will be logged out due to inactivity in
    <span id="session-countdown" style="font-size:17px; margin: 0 6px;">5:00</span>
    <button onclick="resetSessionTimer()" style="
      margin-left: 16px;
      padding: 5px 14px;
      background: #fff;
      color: #7a2a00;
      border: none;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
    ">Stay Logged In</button>
  `;
  document.body.prepend(banner);
}

function showSessionWarning() {
  const banner = document.getElementById('session-warning');
  if (banner) banner.style.display = 'block';
  log('⚠️ Inactivity warning — 5 minutes until auto-logout', 'warn');

  let remaining = SESSION_WARNING;

  if (sessionWarningInterval) clearInterval(sessionWarningInterval);
  sessionWarningInterval = setInterval(() => {
    remaining -= 1000;
    if (remaining <= 0) {
      clearInterval(sessionWarningInterval);
      return;
    }
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const el = document.getElementById('session-countdown');
    if (el) el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
}

function hideSessionWarning() {
  const banner = document.getElementById('session-warning');
  if (banner) banner.style.display = 'none';
  if (sessionWarningInterval) {
    clearInterval(sessionWarningInterval);
    sessionWarningInterval = null;
  }
  const el = document.getElementById('session-countdown');
  if (el) el.textContent = '5:00';
}

function resetSessionTimer() {
  if (!accessToken) return; // only run if user is logged in

  hideSessionWarning();

  if (sessionTimer) clearTimeout(sessionTimer);
  if (sessionWarningTimer) clearTimeout(sessionWarningTimer);

  // Warn at 5 minutes before the hour is up
  sessionWarningTimer = setTimeout(() => {
    showSessionWarning();
  }, SESSION_TIMEOUT - SESSION_WARNING);

  // Auto-logout after full hour
  sessionTimer = setTimeout(() => {
    log('Auto-logout — 1 hour of inactivity reached', 'danger');
    logout();
  }, SESSION_TIMEOUT);
}

function startSessionTimer() {
  createWarningBanner();
  resetSessionTimer();

  // Reset timer on any user activity
  ['mousemove', 'click', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    window.addEventListener(event, resetSessionTimer, { passive: true });
  });

  log('Session inactivity timer started — auto-logout after 1 hour of inactivity', 'info');
}

function stopSessionTimer() {
  if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
  if (sessionWarningTimer) { clearTimeout(sessionWarningTimer); sessionWarningTimer = null; }
  hideSessionWarning();

  ['mousemove', 'click', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    window.removeEventListener(event, resetSessionTimer);
  });
}


// ============================================
// Token Refresh
// ============================================
async function refreshAccessToken() {
  const storedRefresh = refreshToken || localStorage.getItem('refresh_token');

  if (!storedRefresh) {
    log('No refresh token available — please login again', 'danger');
    return;
  }

  log('Refreshing access token...', 'info');

  try {
    const response = await fetch(`${CONFIG.authentikBase}/application/o/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: storedRefresh,
        client_id: CONFIG.clientId,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      accessToken = data.access_token;
      tokenExpiry = Date.now() + data.expires_in * 1000;

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('token_expiry', tokenExpiry.toString());

      if (data.refresh_token) {
        refreshToken = data.refresh_token;
        localStorage.setItem('refresh_token', refreshToken);
      }

      if (data.id_token) {
        localStorage.setItem('id_token', data.id_token);
      }

      document.getElementById('token-status').textContent = 'Valid';
      document.getElementById('token-display').textContent = accessToken;
      setBadge('badge-step3', 'refreshed', 'success');
      log('Token refreshed successfully — new 5 min timer started', 'success');
      startTimer();
    } else {
      log('Token refresh failed: ' + (data.error_description || data.error || 'unknown error'), 'danger');
      console.error('Refresh error response:', data);
    }

  } catch (err) {
    log('Error refreshing token: ' + err.message, 'danger');
  }
}

// ============================================
// Step 1 — Login
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
// Step 2 — Handle Callback
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
    const response = await fetch(`${CONFIG.authentikBase}/application/o/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: CONFIG.redirectUri,
        client_id: CONFIG.clientId,
      }),
    });

    const data = await response.json();
    console.log('Token response:', data);

    if (data.access_token) {
      accessToken = data.access_token;
      tokenExpiry = Date.now() + data.expires_in * 1000;

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('token_expiry', tokenExpiry.toString());

      // Store refresh token
      if (data.refresh_token) {
        refreshToken = data.refresh_token;
        localStorage.setItem('refresh_token', refreshToken);
        log('Refresh token stored', 'info');
      } else {
        log('No refresh token received — check offline_access scope', 'warn');
      }

      if (data.id_token) {
        localStorage.setItem('id_token', data.id_token);
      }

      document.getElementById('token-status').textContent = 'Valid';
      document.getElementById('last-response').textContent = 'JWT issued';
      document.getElementById('token-display').textContent = accessToken;
      setBadge('badge-step3', 'issued', 'success');
      log('JWT issued successfully — 5 min timer started', 'success');
      startTimer();
      startSessionTimer(); // Start the session timer after successful login
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
    const response = await fetch(`${CONFIG.backendUrl}/secure-data`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

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
// Logout
// ============================================
function logout() {
  if (!accessToken) {
    log('No active session to logout from', 'warn');
    return;
  }

  log('Logging out — clearing session...', 'warn');

  // FIX: Grab id_token BEFORE removing it from localStorage
  const idToken = localStorage.getItem('id_token');

  accessToken = null;
  tokenExpiry = null;
  refreshToken = null;

  localStorage.removeItem('access_token');
  localStorage.removeItem('token_expiry');
  localStorage.removeItem('id_token');
  localStorage.removeItem('refresh_token');

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  stopSessionTimer(); // Stop the session timer when logging out

  document.getElementById('token-status').textContent = 'No Token';
  document.getElementById('timer').textContent = '—';
  document.getElementById('last-response').textContent = '—';
  document.getElementById('token-display').textContent = 'No token yet';

  ['badge-step1','badge-step2','badge-step3',
   'badge-step4','badge-step5','badge-step6',
   'badge-response'].forEach(id => setBadge(id, 'waiting', 'gray'));

  log('Session cleared — redirecting to Authentik logout...', 'warn');

  // FIX: Use the idToken variable captured above (not localStorage)
   setTimeout(() => {
    window.location.href = CONFIG.logoutUri;
  }, 1500);
}

// ============================================
// On Page Load
// ============================================
window.addEventListener('load', () => {
  log('Dashboard ready — click Login to begin', 'info');

  const storedToken = localStorage.getItem('access_token');
  const storedExpiry = localStorage.getItem('token_expiry');
  const storedRefresh = localStorage.getItem('refresh_token');

  if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
    accessToken = storedToken;
    tokenExpiry = parseInt(storedExpiry);
    if (storedRefresh) refreshToken = storedRefresh;
    document.getElementById('token-status').textContent = 'Valid';
    document.getElementById('token-display').textContent = storedToken;
    log('Existing valid token found — ready to use', 'success');
    setBadge('badge-step3', 'active', 'success');
    startTimer();
    startSessionTimer(); // Start the session timer on page load (for returning users)
  }

  if (window.location.search.includes('code=')) {
    handleCallback();
  }
});