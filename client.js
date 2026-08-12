(() => {
  const API = 'https://api.ekodi.kr';
  const TENANT = 'cgma';
  const STORAGE_KEY = 'ekodi-customer-token';
  const ROLE_LABELS = {
    client_admin: '고객 관리자',
    client_editor: '콘텐츠 편집자',
    client_viewer: '조회·검수자'
  };

  const loginForm = document.querySelector('#loginForm');
  const inviteForm = document.querySelector('#inviteForm');
  const account = document.querySelector('#account');
  const loginError = document.querySelector('#loginError');
  const inviteError = document.querySelector('#inviteError');
  const authTitle = document.querySelector('#authTitle');
  const authCopy = document.querySelector('#authCopy');
  const modeBadge = document.querySelector('#modeBadge');

  function token() {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '확인 필요' : date.toLocaleString('ko-KR');
  }

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token()) headers.set('authorization', `Bearer ${token()}`);
    if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    const response = await fetch(`${API}${path}`, { ...options, headers, cache: 'no-store' });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.error || `고객 인증 요청 실패 (${response.status})`);
    return data;
  }

  function showLogin() {
    modeBadge.textContent = '고객 전용';
    authTitle.textContent = '고객 로그인';
    authCopy.textContent = 'EKODI에서 등록한 이메일과 고객 비밀번호로 로그인합니다.';
    loginForm.hidden = false;
    inviteForm.hidden = true;
    account.hidden = true;
  }

  function showInvite() {
    modeBadge.textContent = '초대 확인';
    authTitle.textContent = '고객 계정 활성화';
    authCopy.textContent = 'EKODI가 발급한 1회용 고객 초대를 확인했습니다. 이름과 새 비밀번호를 등록해 주세요.';
    loginForm.hidden = true;
    inviteForm.hidden = false;
    account.hidden = true;
  }

  function showAccount(data) {
    modeBadge.textContent = '인증 완료';
    authTitle.textContent = '고객 관리공간';
    authCopy.textContent = '청계면상인회 EKODI 고객 테넌트의 인증과 권한이 확인되었습니다.';
    loginForm.hidden = true;
    inviteForm.hidden = true;
    account.hidden = false;
    document.querySelector('#accountTenant').textContent = data.tenant?.name || '청계면상인회';
    document.querySelector('#accountEmail').textContent = data.email || '';
    document.querySelector('#accountRole').textContent = ROLE_LABELS[data.role] || data.role || '고객 사용자';
    document.querySelector('#accountExpiry').textContent = formatDate(data.expiresAt);
  }

  async function restore() {
    if (!token()) return showLogin();
    try {
      showAccount(await api('/api/customer/session'));
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      showLogin();
    }
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginError.textContent = '';
    if (!loginForm.checkValidity()) return loginForm.reportValidity();
    const form = new FormData(loginForm);
    const submit = loginForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = '인증 중…';
    try {
      const result = await api('/api/customer/login', {
        method: 'POST',
        body: JSON.stringify({
          tenant: TENANT,
          email: String(form.get('email')).trim().toLowerCase(),
          password: String(form.get('password'))
        })
      });
      sessionStorage.setItem(STORAGE_KEY, result.token);
      loginForm.reset();
      showAccount(result);
    } catch (error) {
      loginError.textContent = error.message;
    } finally {
      submit.disabled = false;
      submit.textContent = '고객 관리공간 로그인';
    }
  });

  inviteForm.addEventListener('submit', async event => {
    event.preventDefault();
    inviteError.textContent = '';
    if (!inviteForm.checkValidity()) return inviteForm.reportValidity();
    const form = new FormData(inviteForm);
    const password = String(form.get('password'));
    const confirmPassword = String(form.get('confirmPassword'));
    if (password !== confirmPassword) {
      inviteError.textContent = '비밀번호가 일치하지 않습니다.';
      return;
    }
    const inviteToken = new URLSearchParams(location.search).get('ekodi_invite') || '';
    const submit = inviteForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = '계정 활성화 중…';
    try {
      const result = await api('/api/customer/accept-invite', {
        method: 'POST',
        body: JSON.stringify({
          token: inviteToken,
          displayName: String(form.get('displayName')).trim(),
          password
        })
      });
      sessionStorage.setItem(STORAGE_KEY, result.token);
      const params = new URLSearchParams(location.search);
      params.delete('ekodi_invite');
      history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`);
      inviteForm.reset();
      showAccount(result);
    } catch (error) {
      inviteError.textContent = error.message;
    } finally {
      submit.disabled = false;
      submit.textContent = '초대 수락하고 계정 활성화';
    }
  });

  document.querySelector('#logoutButton').addEventListener('click', async () => {
    try {
      if (token()) await api('/api/customer/logout', { method: 'POST' });
    } catch {}
    sessionStorage.removeItem(STORAGE_KEY);
    showLogin();
  });

  const inviteToken = new URLSearchParams(location.search).get('ekodi_invite');
  if (inviteToken) showInvite();
  else restore();
})();
