const usernameInput = document.getElementById('username');
const fetchBtn = document.getElementById('fetchBtn');
const btnText = fetchBtn.querySelector('.btn-text');
const btnLoader = fetchBtn.querySelector('.btn-loader');
const errorEl = document.getElementById('error');
const infoEl = document.getElementById('info');
const resultsEl = document.getElementById('results');
const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKeyBtn');

// Load saved key
const savedKey = localStorage.getItem('tt_api_key') || '';
if (savedKey) apiKeyInput.value = savedKey;

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem('tt_api_key', key);
    showInfo('API key saved in this browser');
  } else {
    localStorage.removeItem('tt_api_key');
    showInfo('API key removed');
  }
});

function setLoading(isLoading) {
  fetchBtn.disabled = isLoading;
  btnText.hidden = isLoading;
  btnLoader.hidden = !isLoading;
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
  infoEl.hidden = true;
  resultsEl.hidden = true;
}

function showInfo(msg) {
  infoEl.textContent = msg;
  infoEl.hidden = false;
}

function hideMessages() {
  errorEl.hidden = true;
  infoEl.hidden = true;
}

function formatNumber(val) {
  if (val === null || val === undefined || val === 'N/A' || val === '') return '—';
  if (typeof val === 'string' && /[,\s]/.test(val)) return val;
  const num = Number(String(val).replace(/,/g, ''));
  if (isNaN(num)) return String(val);
  return num.toLocaleString('en-US');
}

function cleanUsername(raw) {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

function val(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return null;
}

// ========== FREE SOURCE (TikMatrix) ==========
async function fetchFree(username) {
  const url = `https://user.tikmatrix.com/api/user?username=${encodeURIComponent(username)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data || !data.profile) throw new Error('User not found');
  return { source: 'free', data };
}

// ========== OMAR-THING API (with key) ==========
async function fetchOmar(username, key) {
  // Try new API first
  const urls = [
    `https://dev.omar-thing.site/api/v1/profile?username=${encodeURIComponent(username)}&format=clean&key=${encodeURIComponent(key)}`,
    `https://api.omar-thing.site/?key=${encodeURIComponent(key)}&username=${encodeURIComponent(username)}`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data && (data.data || data.profile || data.status === 'success')) {
        return { source: 'omar', data };
      }
    } catch (e) {
      console.warn('Omar endpoint failed', e);
    }
  }
  throw new Error('Omar API failed or invalid key');
}

function normalizeOmar(raw) {
  // Handle both new and old response shapes
  const root = raw.data || raw;
  const user = root.user || root.profile || root;
  const stats = root.stats || root.statsV2 || {};

  return {
    nickname: val(user, 'nickname', 'Nickname'),
    username: val(user, 'uniqueId', 'unique_id', 'Username') || '',
    avatar: val(user, 'avatarLarger', 'avatarMedium', 'avatarThumb', 'Avatar URL', 'avatar'),
    about: val(user, 'signature', 'About', 'bio'),
    userId: val(user, 'id', 'User ID', 'user_id'),
    private: val(user, 'privateAccount', 'Private') ? 'Yes' : 'No',
    created: val(user, 'createTime', 'Account Created', 'create_time'),
    nickEdited: val(user, 'nickNameModifyTime', 'Nickname Last Modified') || 'N/A',
    userChanged: val(user, 'uniqueIdModifyTime', 'Username Last Modified') || 'N/A',
    language: val(user, 'language', 'Language') || '—',
    bioLink: val(user, 'bioLink', 'Bio Link')?.link || val(user, 'bioLink', 'Bio Link') || 'N/A',
    followers: val(stats, 'followerCount', 'Followers', 'follower_count'),
    following: val(stats, 'followingCount', 'Following', 'following_count'),
    hearts: val(stats, 'heart', 'heartCount', 'Hearts', 'diggCount'),
    videos: val(stats, 'videoCount', 'Videos', 'video_count'),
    friends: val(stats, 'friendCount', 'Friends', 'friend_count'),
    // Regions
    lockedRegion: val(user, 'region', 'locked_region', 'Locked Region', 'Country') || val(root, 'region', 'Country'),
    registeredRegion: val(user, 'registered_region', 'Registered Region', 'region') || val(root, 'registered_region'),
    currentRegion: val(user, 'current_region', 'Current Region', 'region') || val(root, 'current_region') || val(user, 'Country'),
  };
}

function normalizeFree(raw) {
  const p = raw.profile || {};
  const s = raw.stats || {};
  return {
    nickname: p.Nickname || '—',
    username: (p.Username || '').replace(/^@/, ''),
    avatar: p['Avatar URL'] || '',
    about: p.About || '',
    userId: p['User ID'] || '—',
    private: 'No',
    created: p['Account Created'] || '—',
    nickEdited: p['Nickname Last Modified'] || 'N/A',
    userChanged: p['Username Last Modified'] || 'N/A',
    language: p.Language || '—',
    bioLink: p['Bio Link'] || 'N/A',
    followers: s.Followers,
    following: s.Following,
    hearts: s.Hearts,
    videos: s.Videos,
    friends: s.Friends,
    lockedRegion: p.Country && p.Country !== 'N/A' ? p.Country : null,
    registeredRegion: p.Country && p.Country !== 'N/A' ? p.Country : null,
    currentRegion: p.Country && p.Country !== 'N/A' ? p.Country : null,
  };
}

function render(norm, source) {
  const avatar = document.getElementById('avatar');
  avatar.src = norm.avatar || '';
  avatar.onerror = () => {
    avatar.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect fill="%231a1625" width="72" height="72"/><text x="36" y="42" text-anchor="middle" fill="%23b794f6" font-size="24">?</text></svg>';
  };

  document.getElementById('nickname').textContent = norm.nickname || '—';
  document.getElementById('handle').textContent = norm.username ? `@${norm.username}` : '—';
  document.getElementById('about').textContent = norm.about || '';

  document.getElementById('followers').textContent = formatNumber(norm.followers);
  document.getElementById('following').textContent = formatNumber(norm.following);
  document.getElementById('hearts').textContent = formatNumber(norm.hearts);
  document.getElementById('videos').textContent = formatNumber(norm.videos);
  document.getElementById('friends').textContent = formatNumber(norm.friends);

  // Regions
  document.getElementById('lockedRegion').textContent = norm.lockedRegion || 'N/A';
  document.getElementById('registeredRegion').textContent = norm.registeredRegion || 'N/A';
  document.getElementById('currentRegion').textContent = norm.currentRegion || 'N/A';

  document.getElementById('userId').textContent = norm.userId || '—';
  document.getElementById('private').textContent = norm.private || '—';
  document.getElementById('created').textContent = formatDate(norm.created);
  document.getElementById('nickEdited').textContent = formatDate(norm.nickEdited);
  document.getElementById('userChanged').textContent = formatDate(norm.userChanged);
  document.getElementById('language').textContent = norm.language || '—';

  const bioLinkEl = document.getElementById('bioLink');
  const link = norm.bioLink;
  if (link && link !== 'N/A' && link !== '') {
    const href = String(link).startsWith('http') ? link : `https://${link}`;
    bioLinkEl.innerHTML = `<a href="${href}" target="_blank" rel="noopener">${link}</a>`;
  } else {
    bioLinkEl.textContent = 'N/A';
  }

  resultsEl.hidden = false;

  if (source === 'free') {
    showInfo('Free mode · Region data is limited. Add API key above for Locked / Registered / Current.');
  } else {
    showInfo('Full data loaded with your API key');
  }
}

function formatDate(v) {
  if (!v || v === 'N/A' || v === '—') return 'N/A';
  // Unix timestamp?
  if (typeof v === 'number' || /^\d{10}$/.test(String(v))) {
    const d = new Date(Number(v) * 1000);
    return isNaN(d) ? v : d.toISOString().replace('T', ' ').slice(0, 19);
  }
  return String(v);
}

async function handleFetch() {
  const username = cleanUsername(usernameInput.value);
  if (!username) {
    showError('Please enter a username');
    return;
  }

  hideMessages();
  setLoading(true);
  resultsEl.hidden = true;

  const key = (apiKeyInput.value || localStorage.getItem('tt_api_key') || '').trim();

  try {
    let result;
    if (key) {
      try {
        result = await fetchOmar(username, key);
      } catch (e) {
        console.warn('Omar failed, falling back to free', e);
        result = await fetchFree(username);
      }
    } else {
      result = await fetchFree(username);
    }

    const norm = result.source === 'omar'
      ? normalizeOmar(result.data)
      : normalizeFree(result.data);

    render(norm, result.source);
  } catch (err) {
    console.error(err);
    showError('User not found, private account, or temporary error. Try again.');
  } finally {
    setLoading(false);
  }
}

fetchBtn.addEventListener('click', handleFetch);
usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleFetch();
});

usernameInput.focus();
