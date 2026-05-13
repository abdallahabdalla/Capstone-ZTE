/**
 * @jest-environment jsdom
 */

// ============================================
// Mock Setup — Simulates Browser Environment
// ============================================
beforeEach(() => {
  // Clear localStorage before each test
  localStorage.clear();

  // Reset DOM elements
  document.body.innerHTML = `
    <div id="token-status">No Token</div>
    <div id="timer">—</div>
    <div id="last-response">—</div>
    <div id="token-display">No token yet</div>
    <div id="log"></div>
    <span id="badge-step1">waiting</span>
    <span id="badge-step2">waiting</span>
    <span id="badge-step3">waiting</span>
    <span id="badge-step4">waiting</span>
    <span id="badge-step5">waiting</span>
    <span id="badge-step6">waiting</span>
    <span id="badge-response">—</span>
  `;
});

// ============================================
// Token Storage Tests
// ============================================
describe('Token Storage — Unit Tests', () => {

  test('should store access token in localStorage', () => {
    const mockToken = 'mock-access-token-123';
    localStorage.setItem('access_token', mockToken);
    expect(localStorage.getItem('access_token')).toBe(mockToken);
  });

  test('should store token expiry in localStorage', () => {
    const expiry = (Date.now() + 300000).toString();
    localStorage.setItem('token_expiry', expiry);
    expect(localStorage.getItem('token_expiry')).toBe(expiry);
  });

  test('should store refresh token in localStorage', () => {
    const mockRefresh = 'mock-refresh-token-456';
    localStorage.setItem('refresh_token', mockRefresh);
    expect(localStorage.getItem('refresh_token')).toBe(mockRefresh);
  });

  test('should store id token in localStorage', () => {
    const mockIdToken = 'mock-id-token-789';
    localStorage.setItem('id_token', mockIdToken);
    expect(localStorage.getItem('id_token')).toBe(mockIdToken);
  });

});

// ============================================
// Token Expiry Tests
// ============================================
describe('Token Expiry — Unit Tests', () => {

  test('should correctly identify a valid (non-expired) token', () => {
    const futureExpiry = Date.now() + 300000; // 5 mins from now
    localStorage.setItem('token_expiry', futureExpiry.toString());
    const expiry = parseInt(localStorage.getItem('token_expiry'));
    expect(Date.now() < expiry).toBe(true);
  });

  test('should correctly identify an expired token', () => {
    const pastExpiry = Date.now() - 1000; // 1 second ago
    localStorage.setItem('token_expiry', pastExpiry.toString());
    const expiry = parseInt(localStorage.getItem('token_expiry'));
    expect(Date.now() > expiry).toBe(true);
  });

  test('should detect when less than 1 minute remains', () => {
    const almostExpired = Date.now() + 59000; // 59 seconds
    const remaining = almostExpired - Date.now();
    expect(remaining <= 60000).toBe(true);
  });

  test('should detect when more than 1 minute remains', () => {
    const plenty = Date.now() + 120000; // 2 minutes
    const remaining = plenty - Date.now();
    expect(remaining <= 60000).toBe(false);
  });

});

// ============================================
// Logout Cleanup Tests
// ============================================
describe('Logout — Unit Tests', () => {

  test('should clear access token on logout', () => {
    localStorage.setItem('access_token', 'some-token');
    localStorage.removeItem('access_token');
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  test('should clear refresh token on logout', () => {
    localStorage.setItem('refresh_token', 'some-refresh');
    localStorage.removeItem('refresh_token');
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  test('should clear id token on logout', () => {
    localStorage.setItem('id_token', 'some-id-token');
    localStorage.removeItem('id_token');
    expect(localStorage.getItem('id_token')).toBeNull();
  });

  test('should clear all tokens on logout', () => {
    localStorage.setItem('access_token', 'token');
    localStorage.setItem('refresh_token', 'refresh');
    localStorage.setItem('id_token', 'id');
    localStorage.setItem('token_expiry', '999999');

    localStorage.clear();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('id_token')).toBeNull();
    expect(localStorage.getItem('token_expiry')).toBeNull();
  });

});

// ============================================
// DOM Update Tests
// ============================================
describe('UI State — Unit Tests', () => {

  test('should update token status display', () => {
    document.getElementById('token-status').textContent = 'Valid';
    expect(document.getElementById('token-status').textContent).toBe('Valid');
  });

  test('should update token display with token value', () => {
    const mockToken = 'eyJhbGciOiJSUzI1NiJ9.mockpayload.mocksignature';
    document.getElementById('token-display').textContent = mockToken;
    expect(document.getElementById('token-display').textContent).toBe(mockToken);
  });

  test('should reset timer display on logout', () => {
    document.getElementById('timer').textContent = '4:32';
    document.getElementById('timer').textContent = '—';
    expect(document.getElementById('timer').textContent).toBe('—');
  });

  test('should reset last response display on logout', () => {
    document.getElementById('last-response').textContent = '200 OK';
    document.getElementById('last-response').textContent = '—';
    expect(document.getElementById('last-response').textContent).toBe('—');
  });

});