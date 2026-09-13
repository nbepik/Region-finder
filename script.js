const usernameInput = document.getElementById('username');
const fetchBtn = document.getElementById('fetchBtn');
const btnText = fetchBtn.querySelector('.btn-text');
const btnLoader = fetchBtn.querySelector('.btn-loader');
const errorEl = document.getElementById('error');
const resultsEl = document.getElementById('results');

function setLoading(isLoading) {
  fetchBtn.disabled = isLoading;
  btnText.hidden = isLoading;
  btnLoader.hidden = !isLoading;
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
  resultsEl.hidden = true;
}

function hideError() {
  errorEl.hidden = true;
}

function formatNumber(val) {
  if (val === null || val === undefined || val === 'N/A' || val === '') return '—';
  // Already formatted string from API
  if (typeof val === 'string' && /[,\s]/.test(val)) return val;
  const num = Number(String(val).replace(/,/g, ''));
  if (isNaN(num)) return val;
  return num.toLocaleString('en-US');
}

function cleanUsername(raw) {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

async function fetchUser(username) {
  const url = `https://user.tikmatrix.com/api/user?username=${encodeURIComponent(username)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data || !data.profile) {
    throw new Error('User not found or private');
  }
  return data;
}

function render(data) {
  const p = data.profile || {};
  const s = data.stats || {};

  // Avatar
  const avatar = document.getElementById('avatar');
  avatar.src = p['Avatar URL'] || p.avatar || '';
  avatar.onerror = () => { avatar.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect fill="%231a1625" width="72" height="72"/><text x="36" y="42" text-anchor="middle" fill="%23b794f6" font-size="24">?</text></svg>'; };

  document.getElementById('nickname').textContent = p.Nickname || p.nickname || '—';
  document.getElementById('handle').textContent = p.Username || `@${usernameInput.value.replace(/^@/, '')}`;
  document.getElementById('about').textContent = p.About || p.bio || '';

  // Stats
  document.getElementById('followers').textContent = formatNumber(s.Followers ?? s.followerCount);
  document.getElementById('following').textContent = formatNumber(s.Following ?? s.followingCount);
  document.getElementById('hearts').textContent = formatNumber(s.Hearts ?? s.heart ?? s.likes);
  document.getElementById('videos').textContent = formatNumber(s.Videos ?? s.videoCount);
  document.getElementById('friends').textContent = formatNumber(s.Friends ?? s.friendCount);

  // Details
  document.getElementById('country').textContent = p.Country || p.region || 'N/A';
  document.getElementById('userId').textContent = p['User ID'] || p.userId || '—';
  document.getElementById('private').textContent = (p.Private !== undefined) ? (p.Private ? 'Yes' : 'No') : 'No';
  document.getElementById('created').textContent = p['Account Created'] || p.createTime || '—';
  document.getElementById('nickEdited').textContent = p['Nickname Last Modified'] || 'N/A';
  document.getElementById('userChanged').textContent = p['Username Last Modified'] || 'N/A';
  document.getElementById('language').textContent = p.Language || '—';

  const bioLinkEl = document.getElementById('bioLink');
  const link = p['Bio Link'];
  if (link && link !== 'N/A' && link !== '') {
    const href = link.startsWith('http') ? link : `https://${link}`;
    bioLinkEl.innerHTML = `<a href="${href}" target="_blank" rel="noopener">${link}</a>`;
  } else {
    bioLinkEl.textContent = 'N/A';
  }

  resultsEl.hidden = false;
}

async function handleFetch() {
  const raw = usernameInput.value;
  const username = cleanUsername(raw);

  if (!username) {
    showError('Please enter a username');
    return;
  }

  hideError();
  setLoading(true);
  resultsEl.hidden = true;

  try {
    const data = await fetchUser(username);
    render(data);
  } catch (err) {
    console.error(err);
    showError('User not found, private, or temporary error. Try again.');
  } finally {
    setLoading(false);
  }
}

fetchBtn.addEventListener('click', handleFetch);

usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleFetch();
});

// Auto-focus
usernameInput.focus();
 
