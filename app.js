'use strict';
(function () {
  // ===================================================================
  // Temel yardımcılar
  // ===================================================================
  const CFG = window.RANDEVU_CONFIG || {};
  const APP = CFG.appName || 'Bi Koltuk';
  const TZ = 'Europe/Istanbul';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TL = (n) => `${Number(n || 0).toLocaleString('tr-TR')} ₺`;
  const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
  const addDays = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const dowOf = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
  const dLabel = (d, o) => new Date(`${d}T12:00:00Z`).toLocaleDateString('tr-TR', { timeZone: 'UTC', ...o });
  const longDay = (d) => dLabel(d, { weekday: 'long', day: 'numeric', month: 'long' });
  const relDay = (d) => (d === today() ? 'Bugün' : d === addDays(today(), 1) ? 'Yarın' : longDay(d));
  const hm = (iso) => new Date(iso).toLocaleTimeString('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  const dateOf = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: TZ });
  const at = (d, t) => new Date(`${d}T${t}:00+03:00`);
  const nowHM = () => new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const normPhone = (p) => { const d = String(p || '').replace(/\D/g, '').slice(-10); return /^5\d{9}$/.test(d) ? d : null; };
  // Dükkan telefonu sabit hat da olabilir (0312 ...)
  const normAnyPhone = (p) => { const d = String(p || '').replace(/\D/g, '').slice(-10); return /^[2-5]\d{9}$/.test(d) ? d : null; };
  const fmtPhone = (d) => (d && d.length === 10 ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : d || '');
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* özel pencere */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* yok say */ } },
  };
  const siteUrl = () => location.origin + location.pathname;
  const shopLink = (slug) => `${siteUrl()}#/b/${slug}`;
  const waLink = (phone, text) => `https://wa.me/${phone ? `90${phone}` : ''}?text=${encodeURIComponent(text)}`;
  const mapsLink = (s) => (s.lat != null && s.lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.name, s.address, s.district, s.city].filter(Boolean).join(' '))}`);
  const igLink = (h) => `https://instagram.com/${encodeURIComponent(String(h).replace(/^@/, '').trim())}`;
  const slugify = (s) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'dukkan';
  const rand4 = () => Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  const km = (a, b) => {
    const r = (x) => (x * Math.PI) / 180;
    const dl = r(b[0] - a[0]); const dn = r(b[1] - a[1]);
    const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dn / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };
  const CONTACTS = 'contacts' in navigator && typeof navigator.contacts.select === 'function';
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
  const stamps = (n, t) => `<span class="stamps" role="img" aria-label="${t} damgadan ${n} tanesi dolu">${'●'.repeat(n)}${'○'.repeat(Math.max(0, t - n))}</span>`;
  const fmtKm = (k) => (k < 1 ? `${Math.round(k * 1000)} m` : `${k.toFixed(1).replace('.', ',')} km`);
  const DAYS = [['1', 'Pazartesi'], ['2', 'Salı'], ['3', 'Çarşamba'], ['4', 'Perşembe'], ['5', 'Cuma'], ['6', 'Cumartesi'], ['0', 'Pazar']];
  // Yaklaşık semt merkezleri (mesafe sıralaması için)
  const PLACES = {
    'Kızılay': [39.9208, 32.8541], 'Çankaya': [39.9035, 32.8597], 'Tunalı': [39.9055, 32.8607], 'Dikmen': [39.8755, 32.8408],
    'Bahçelievler': [39.9186, 32.8228], 'Emek': [39.9265, 32.8176], 'Ulus': [39.9417, 32.8547], 'Keçiören': [39.9707, 32.8636],
    'Yenimahalle': [39.965, 32.81], 'Batıkent': [39.968, 32.731], 'Etimesgut': [39.947, 32.669], 'Eryaman': [39.979, 32.633],
    'Sincan': [39.969, 32.582], 'Çayyolu': [39.8866, 32.6841], 'Ümitköy': [39.888, 32.705], 'Mamak': [39.925, 32.92],
    'Gölbaşı': [39.788, 32.806], 'Pursaklar': [40.039, 32.9],
  };
  const STATUS = { confirmed: 'Bekleniyor', completed: 'Geldi', cancelled: 'İptal', no_show: 'Gelmedi' };
  const MY_STATUS = { confirmed: 'Onaylı', completed: 'Tamamlandı', cancelled: 'İptal edildi', no_show: 'Gidilmedi' };

  // ===================================================================
  // Hatalar
  // ===================================================================
  class AppError extends Error { constructor(code, data) { super(code); this.code = code; this.data = data; } }
  const MSG = {
    NETWORK: 'İnternete bağlanılamadı. Bağlantını kontrol edip tekrar dene.',
    SLOT_TAKEN: 'Bu saat az önce doldu. Başka bir saat seç.',
    HOLD_EXPIRED: 'Saati tutma süren doldu. Saati yeniden seç.',
    NAME_INVALID: 'Adını en az 2 harf olacak şekilde yaz.',
    PHONE_INVALID: 'Cep telefonunu 05xx xxx xx xx şeklinde yaz.',
    SHOP_PHONE_INVALID: 'Dükkan telefonunu 0xxx xxx xx xx şeklinde, alan koduyla yaz.',
    TOO_MANY: 'Bu dükkanda zaten 3 yaklaşan randevun var. Yeni randevu için önce birini iptal et.',
    CANNOT_CANCEL: 'Bu randevu artık iptal edilemiyor. Dükkanı arayabilirsin.',
    REVIEW_NOT_ALLOWED: 'Yorumu, berber randevunu tamamlandı olarak işaretledikten sonra yazabilirsin.',
    ALREADY_REVIEWED: 'Bu randevu için zaten yorum yazdın.',
    REVIEW_INVALID: 'Yorumun 3 ile 500 karakter arasında olmalı.',
    RATING_INVALID: 'Puanı 1 ile 5 arasında seç.',
    DAY_INVALID: 'Geçmiş bir gün seçilemez.',
    SHOP_NOT_FOUND: 'Bu dükkan bulunamadı. Link yanlış olabilir ya da dükkan kapanmış olabilir.',
    STAFF_NOT_IN_SHOP: 'Seçilen personel bu dükkanda değil. Sayfayı yenile.',
    SERVICE_NOT_FOR_STAFF: 'Seçilen hizmet bu personelde yok. Sayfayı yenile.',
    DUPLICATE: 'Bu kayıt zaten var.',
    FORBIDDEN: 'Bu işlem için yetkin yok. Çıkış yapıp tekrar giriş yap.',
    BAD_LOGIN: 'E-posta veya şifre hatalı.',
    EMAIL_TAKEN: 'Bu e-postayla zaten hesap var. "Giriş yap" sekmesini kullan.',
    WEAK_PASSWORD: 'Şifre en az 8 karakter olmalı.',
    EMAIL_NOT_CONFIRMED: 'E-postanı henüz doğrulamadın. Gelen kutundaki bağlantıya dokun.',
    RATE: 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.',
    AUTH: 'Oturumun sona erdi. Tekrar giriş yap.',
    NOT_AUTHENTICATED: 'Oturumun sona erdi. Tekrar giriş yap.',
    NOT_ADMIN: 'Bu ekran sadece yönetici içindir.',
    SETUP_MISSING: 'Kurulum eksik: veritabanının yeni parçası çalıştırılmamış. bikoltuk.github.io/kurulum sayfasında "Hepsini kopyala" ile çalıştır.',
    OWNER_NAME_INVALID: 'Adını ve soyadını yaz.',
    NOSHOW_BLOCKED: 'Bu numarayla online randevu alınamıyor: önceki randevulara gelinmemiş. Randevu için dükkanı ara.',
    INVITE_INVALID: 'Davet kodu yanlış ya da süresi dolmuş. Dükkan sahibinden yeni kod iste.',
    OWNS_SHOP: 'Bu hesabın kendi dükkanı var. Usta olarak katılmak için başka bir e-postayla kayıt ol.',
    NOT_ALLOWED: 'Bu işlem için yetkin yok.',
    UPLOAD: 'Fotoğraf yüklenemedi. JPG veya PNG bir fotoğraf seç.',
    UNKNOWN: 'Bir şeyler ters gitti. Tekrar dene.',
  };
  const KNOWN = ['SLOT_TAKEN', 'HOLD_EXPIRED', 'NAME_INVALID', 'PHONE_INVALID', 'TOO_MANY', 'CANNOT_CANCEL', 'REVIEW_NOT_ALLOWED',
    'ALREADY_REVIEWED', 'REVIEW_INVALID', 'RATING_INVALID', 'DAY_INVALID', 'SHOP_NOT_FOUND', 'STAFF_NOT_IN_SHOP', 'SERVICE_NOT_FOR_STAFF',
    'NOT_AUTHENTICATED', 'NOT_ADMIN', 'NOSHOW_BLOCKED', 'INVITE_INVALID', 'OWNS_SHOP', 'NOT_ALLOWED'];
  function codeOf(data, status) {
    const d = data && typeof data === 'object' ? data : {};
    const text = [d.message, d.msg, d.error_description, d.error, d.error_code, typeof data === 'string' ? data : ''].filter(Boolean).join(' ');
    const k = KNOWN.find((c) => text.includes(c));
    if (k) return k;
    if (d.code === '23P01') return 'SLOT_TAKEN';
    if (['PGRST202', 'PGRST204', 'PGRST205', '42703', '42P01', '42883'].includes(d.code)) return 'SETUP_MISSING';
    if (d.code === '23505') return 'DUPLICATE';
    if (d.code === '42501') return 'FORBIDDEN';
    if (/invalid_credentials|Invalid login/i.test(text)) return 'BAD_LOGIN';
    if (/already registered|user_already_exists|already been registered/i.test(text)) return 'EMAIL_TAKEN';
    if (/weak_password|Password should/i.test(text)) return 'WEAK_PASSWORD';
    if (/email_not_confirmed|Email not confirmed/i.test(text)) return 'EMAIL_NOT_CONFIRMED';
    if (status === 429 || /rate.?limit/i.test(text)) return 'RATE';
    if (status === 401 || /JWT|jwt expired/i.test(text)) return 'AUTH';
    if (status === 403) return 'FORBIDDEN';
    return 'UNKNOWN';
  }
  const msgOf = (e) => (e && MSG[e.code]) || MSG.UNKNOWN;

  // ===================================================================
  // Supabase istemcisi (kütüphanesiz, doğrudan REST)
  // ===================================================================
  // Üstteki berber direği şeridi, sunucuyla konuşulurken döner
  const loader = {
    n: 0, timer: 0, shownAt: 0, boot: true, // açılışta şerit sayfa ilk çizildiği andan itibaren döner (index.html)
    start() {
      if (this.n++ > 0) return;
      clearTimeout(this.timer);
      if (document.documentElement.classList.contains('loading')) return;
      this.timer = setTimeout(() => { this.shownAt = Date.now(); document.documentElement.classList.add('loading'); }, 100);
    },
    stop() {
      if (--this.n > 0) return;
      this.n = 0;
      if (this.boot) return;
      clearTimeout(this.timer);
      if (!document.documentElement.classList.contains('loading')) return;
      this.timer = setTimeout(() => { if (!this.n) document.documentElement.classList.remove('loading'); }, Math.max(0, 700 - (Date.now() - this.shownAt)));
    },
    booted() {
      this.boot = false;
      $('#main').removeAttribute('aria-busy');
      if (!this.n) document.documentElement.classList.remove('loading');
    },
  };
  const api = {
    base: String(CFG.supabaseUrl || '').replace(/\/+$/, ''),
    key: String(CFG.supabaseKey || ''),
    session: store.get('rv_session', null),
    refreshing: null,
    ready() { return /^https?:\/\//.test(this.base) && !/XXXX/.test(this.base) && this.key.length > 20 && !/BURAYA/.test(this.key); },
    setSession(s) {
      if (s && s.access_token) {
        const exp = s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600);
        this.session = { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: exp, user: s.user || (this.session && this.session.user) || null };
        store.set('rv_session', this.session);
      } else {
        this.session = null;
        store.del('rv_session');
      }
    },
    async fresh() {
      const s = this.session;
      if (!s || !s.refresh_token || s.expires_at - 60 > Date.now() / 1000) return;
      if (!this.refreshing) {
        this.refreshing = (async () => {
          try {
            const d = await this.raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token }, anon: true });
            this.setSession(d);
          } catch (e) {
            if (e.code !== 'NETWORK') this.setSession(null);
          } finally { this.refreshing = null; }
        })();
      }
      await this.refreshing;
    },
    async raw(path, { method = 'GET', body, headers = {}, anon = false } = {}) {
      // Anahtar sadece apikey başlığında gider (yeni "publishable" anahtarlar Authorization'da kabul edilmez).
      // Authorization sadece berber giriş yaptıysa, onun oturum anahtarıyla gönderilir.
      const h = { apikey: this.key, ...headers };
      if (!anon && this.session) h.Authorization = `Bearer ${this.session.access_token}`;
      let payload;
      if (body instanceof Blob) payload = body;
      else if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
      let res;
      let text;
      loader.start();
      try {
        try { res = await fetch(this.base + path, { method, headers: h, body: payload }); } catch { throw new AppError('NETWORK'); }
        text = await res.text();
      } finally { loader.stop(); }
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      if (!res.ok) {
        const err = new AppError(codeOf(data, res.status), data);
        if (err.code === 'AUTH' && !anon && this.session) this.setSession(null);
        throw err;
      }
      return data;
    },
    async req(path, opts = {}) { if (!opts.anon) await this.fresh(); return this.raw(path, opts); },
    rpc(fn, args = {}) { return this.req(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args }); },
    get(table, query) { return this.req(`/rest/v1/${table}?${query}`); },
    insert(table, rows) { return this.req(`/rest/v1/${table}`, { method: 'POST', body: rows, headers: { Prefer: 'return=representation' } }); },
    upsert(table, rows, conflict) {
      return this.req(`/rest/v1/${table}?on_conflict=${conflict}`, { method: 'POST', body: rows, headers: { Prefer: 'resolution=merge-duplicates,return=representation' } });
    },
    patch(table, filter, body) { return this.req(`/rest/v1/${table}?${filter}`, { method: 'PATCH', body, headers: { Prefer: 'return=representation' } }); },
    del(table, filter) { return this.req(`/rest/v1/${table}?${filter}`, { method: 'DELETE' }); },
    photoUrl(path) {
      if (/^(https:\/\/|\/)/.test(String(path))) return String(path); // sitedeki örnek fotoğraflar (test dükkanları)
      return `${this.base}/storage/v1/object/public/shop-photos/${String(path).split('/').map(encodeURIComponent).join('/')}`;
    },
    async upload(path, blob) {
      try {
        return await this.req(`/storage/v1/object/shop-photos/${path}`, { method: 'POST', body: blob, headers: { 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'true' } });
      } catch (e) { throw e.code === 'NETWORK' || e.code === 'AUTH' ? e : new AppError('UPLOAD', e.data); }
    },
    removeFiles(paths) { return paths.length ? this.req('/storage/v1/object/shop-photos', { method: 'DELETE', body: { prefixes: paths } }) : Promise.resolve(); },
    async signIn(email, password) {
      const d = await this.raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, anon: true });
      this.setSession(d);
      return d;
    },
    async signUp(email, password) {
      const d = await this.raw(`/auth/v1/signup?redirect_to=${encodeURIComponent(siteUrl())}`, { method: 'POST', body: { email, password }, anon: true });
      if (d && d.access_token) this.setSession(d);
      return d;
    },
    recover(email) { return this.raw(`/auth/v1/recover?redirect_to=${encodeURIComponent(siteUrl())}`, { method: 'POST', body: { email }, anon: true }); },
    setPassword(password) { return this.req('/auth/v1/user', { method: 'PUT', body: { password } }); },
    async signOut() { try { await this.req('/auth/v1/logout', { method: 'POST' }); } catch { /* yine de çık */ } this.setSession(null); },
    uid() { return (this.session && this.session.user && this.session.user.id) || null; },
  };
  const q = (v) => encodeURIComponent(v);

  // ===================================================================
  // Durum
  // ===================================================================
  const S = {
    route: null,
    disc: null, discAt: 0,
    sort: store.get('rv_sort', 'near'),
    loc: store.get('rv_loc', { name: 'Kızılay', c: PLACES['Kızılay'] }),
    search: '',
    shops: {},          // slug -> {shop, staff, services, reviews, at}
    bk: { slug: null }, // randevu adımları
    mine: null,
    authTab: 'login',
    my: null,           // berber: {shop, staff, services, day, appts, walkins, waitlist, notes, reviews, custs}
    custSearch: '',
  };
  const favs = () => store.get('rv_fav', []);
  const isFav = (id) => favs().includes(id);
  const tokens = () => store.get('rv_tokens', []);

  // ===================================================================
  // Görünüm altyapısı
  // ===================================================================
  const main = $('#main');
  function toast(m, bad) {
    const t = $('#toast');
    t.textContent = m;
    t.className = bad ? 'bad on' : 'on';
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('on'), bad ? 5000 : 3200);
  }
  const fail = (e) => { if (!(e instanceof AppError)) console.error(e); toast(msgOf(e), true); };

  function paint(html, { focus = false } = {}) {
    const ae = document.activeElement;
    let key = null;
    if (ae && main.contains(ae)) {
      if (ae.id) key = `#${CSS.escape(ae.id)}`;
      else if (ae.dataset.act) key = `[data-act="${CSS.escape(ae.dataset.act)}"][data-v="${CSS.escape(ae.dataset.v || '')}"]`;
    }
    main.innerHTML = html;
    if (focus) { const h = $('h1', main); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } return; }
    if (key) {
      const el = main.querySelector(key);
      if (el) {
        el.focus({ preventScroll: true });
        try { if (typeof el.value === 'string' && el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); } catch { /* bu alan türünde imleç yok */ }
      }
    }
  }

  const loading = (t = 'Yükleniyor…') => `<p class="mut" style="margin-top:24px">${esc(t)}</p>`;
  const errorBox = (e) => `<div class="card empty"><h1>Bir sorun çıktı</h1><p>${esc(msgOf(e))}</p>
    <button class="btn" data-act="reload">Tekrar dene</button></div>`;

  function parseRoute() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const p = h.split('/').filter(Boolean);
    if (p[0] === 'b' && p[1]) return p[2] === 'randevu' ? { name: 'book', slug: p[1] } : { name: 'shop', slug: p[1] };
    if (p[0] === 'randevularim') return { name: 'mine' };
    if (p[0] === 'berber') return { name: 'barber', tab: p[1] || 'bugun' };
    return { name: 'discover' };
  }
  const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

  function setNav(r) {
    const tab = r.name === 'mine' ? 'mine' : r.name === 'barber' ? 'barber' : 'discover';
    $$('.tabs a').forEach((a) => { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }

  let seq = 0;
  async function render({ force = false, retried = false, quiet = false } = {}) {
    const my = ++seq;
    const r = parseRoute();
    const changed = !S.route || S.route.name !== r.name || S.route.slug !== r.slug || S.route.tab !== r.tab;
    S.route = r;
    setNav(r);
    if (changed && r.name === 'book' && S.bk.done) S.bk.slug = null; // yeniden girişte temiz başla
    if (r.name !== 'book' && S.bk.hold) releaseHold();
    if (!api.ready()) { paint(notConfigured(), { focus: true }); return; }
    const slow = quiet ? 0 : setTimeout(() => { if (my === seq) paint(loading()); }, 180);
    try {
      const html = await VIEWS[r.name](r, force || changed);
      clearTimeout(slow);
      if (my !== seq) return;
      paint(html, { focus: changed });
      if (changed) window.scrollTo(0, 0);
      after(r);
    } catch (e) {
      clearTimeout(slow);
      if (my !== seq) return;
      if (quiet) return; // arka plan eşitlemesi hata verirse ekrandakini bozma
      if (e.code === 'AUTH' && r.name === 'barber') { S.my = null; paint(authHtml(), { focus: true }); return; }
      // Süresi dolmuş berber oturumu müşteri sayfalarını bozmasın: oturumsuz bir kez daha dene
      if (e.code === 'AUTH' && !retried) { render({ force: true, retried: true }); return; }
      if (!(e instanceof AppError)) console.error(e);
      paint(errorBox(e), { focus: true });
    }
  }
  // Aramada sadece listeyi güncelle (klavye kapanmasın)
  function patchList(id) {
    const tpl = document.createElement('template');
    tpl.innerHTML = VIEWS_SYNC[S.route.name](S.route);
    const fresh = tpl.content.querySelector(`#${id}`);
    const cur = $(`#${id}`);
    if (fresh && cur) cur.innerHTML = fresh.innerHTML;
  }
  // Veri değişmeden yeniden çiz
  function redraw() { try { paint(VIEWS_SYNC[S.route.name](S.route)); after(S.route); } catch (e) { paint(errorBox(e)); } }

  function after(r) {
    document.title = r.name === 'discover' ? APP : `${(($('h1', main) || {}).textContent || '').trim()} | ${APP}`;
    if (r.name === 'barber' && r.tab === 'ayarlar') drawQr();
    tickHold();
  }

  function notConfigured() {
    return `<div class="card"><h1>Kurulum tamamlanmadı</h1>
      <p>Uygulamanın veritabanı bağlantısı henüz girilmedi. <b>config.js</b> dosyasına Supabase adresini ve anahtarını yaz.</p></div>`;
  }

  // ===================================================================
  // Müşteri: Keşfet
  // ===================================================================
  async function loadDiscover(force) {
    if (!S.disc || force || Date.now() - S.discAt > 60000) { S.disc = await api.rpc('discover'); S.discAt = Date.now(); }
  }
  function nextFreeLabel(iso) { const d = dateOf(iso); return `${relDay(d)} ${hm(iso)}`; }

  function discoverHtml() {
    const f = favs();
    const me = S.loc && S.loc.c;
    const term = S.search.trim().toLocaleLowerCase('tr');
    let list = (S.disc || []).map((x) => ({ ...x, km: me && x.lat != null && x.lng != null ? km(me, [x.lat, x.lng]) : null, fav: f.includes(x.id) }));
    if (term) list = list.filter((x) => `${x.name} ${x.district} ${x.address}`.toLocaleLowerCase('tr').includes(term));
    const byKm = (a, b) => (a.km == null) - (b.km == null) || (a.km || 0) - (b.km || 0);
    const bySoon = (a, b) => (a.next_free == null) - (b.next_free == null) || String(a.next_free).localeCompare(String(b.next_free)) || byKm(a, b);
    list.sort((a, b) => (b.fav - a.fav) || (S.sort === 'soon' ? bySoon(a, b) : byKm(a, b)));
    const locOpts = Object.keys(PLACES).map((k) => `<option ${S.loc && S.loc.name === k ? 'selected' : ''}>${esc(k)}</option>`).join('');
    const mine = S.loc && !PLACES[S.loc.name] ? `<option selected>${esc(S.loc.name)}</option>` : '';
    return `<h1>Berber bul</h1>
    <div class="row" style="align-items:flex-end">
      <div style="flex:1 1 180px"><label for="loc">Konumun</label><select id="loc">${mine}${locOpts}</select></div>
      <button class="sm" data-act="gps" data-v="">Konumumu kullan</button>
    </div>
    <p class="hint">Konumun telefonundan dışarı gönderilmez; mesafe telefonda hesaplanır.</p>
    <div class="chips" role="group" aria-label="Sıralama" style="margin:14px 0 4px">
      <button class="chip" aria-pressed="${S.sort === 'near'}" data-act="sort" data-v="near">En yakın</button>
      <button class="chip" aria-pressed="${S.sort === 'soon'}" data-act="sort" data-v="soon">En erken boş saat</button>
    </div>
    <label for="search" class="sr-only">Dükkan ara</label>
    <input id="search" type="search" placeholder="Dükkan ya da semt ara" value="${esc(S.search)}" autocomplete="off" style="margin-top:10px">
    ${f.length ? '<p class="hint">Favorilerin listenin başında görünür.</p>' : ''}
    <ul class="plain" id="shop-list" aria-live="polite">${list.map(shopCard).join('') || `<li class="card empty"><p><b>${term ? 'Aramana uyan dükkan yok.' : 'Henüz listede dükkan yok.'}</b></p><p class="mut">Berber misin? Alttaki <b>Berber</b> sekmesinden dükkanını ücretsiz ekle.</p></li>`}</ul>`;
  }
  function shopCard(x) {
    const thumb = x.photo ? `<img class="thumb" src="${esc(api.photoUrl(x.photo))}" alt="" loading="lazy">` : `<div class="thumb ph" aria-hidden="true">${esc(x.name.trim()[0] || '?')}</div>`;
    const rating = x.review_count ? `<span class="stars">★ ${String(x.rating).replace('.', ',')}</span> (${x.review_count} yorum)` : 'Henüz yorum yok';
    const free = !x.accepting ? '<span class="hot">Şu an online randevu almıyor</span>' : x.next_free ? `İlk boş saat: <b>${esc(nextFreeLabel(x.next_free))}</b>` : 'Önümüzdeki 7 gün dolu';
    return `<li class="card"><div class="shop-card">${thumb}<div>
      <div class="row"><h2><a href="#/b/${esc(x.slug)}">${esc(x.name)}</a></h2>${x.fav ? '<span class="badge fav">Favorin</span>' : ''}</div>
      <p class="mut">${esc(x.district || x.address || '')}${x.km != null ? `, ${fmtKm(x.km)}` : ''}</p>
      <p class="mut">${rating}</p><p>${free}</p></div></div>
      <div class="acts">
        ${x.accepting ? `<a class="sm pri" href="#/b/${esc(x.slug)}/randevu">Randevu al</a>` : ''}
        <a class="sm" href="#/b/${esc(x.slug)}">Dükkanı gör</a>
        <button class="sm fav-btn" aria-pressed="${x.fav}" data-act="fav" data-v="${esc(x.id)}" aria-label="${esc(x.name)} favorilere ${x.fav ? 'eklendi' : 'ekle'}">${x.fav ? '♥ Favori' : '♡ Favori'}</button>
      </div></li>`;
  }

  // ===================================================================
  // Müşteri: Dükkan sayfası
  // ===================================================================
  const SHOP_COLS = 'id,name,slug,city,district,address,phone,instagram,lat,lng,photos,accepting,hours,slot_minutes';
  async function loadShop(slug, force) {
    const c = S.shops[slug];
    if (c && !force && Date.now() - c.at < 60000) return c;
    // Sadakat sütunları 5. parçayla gelir; çalıştırılmamışsa dükkan sayfası yine açılsın
    const rows = await api.get('shops', `slug=eq.${q(slug)}&select=${SHOP_COLS},loyalty_target,loyalty_reward`)
      .catch((e) => { if (e.code === 'SETUP_MISSING') return api.get('shops', `slug=eq.${q(slug)}&select=${SHOP_COLS}`); throw e; });
    if (!rows || !rows.length) throw new AppError('SHOP_NOT_FOUND');
    const shop = rows[0];
    const [staff, services, reviews] = await Promise.all([
      api.get('staff', `shop_id=eq.${shop.id}&active=eq.true&select=id,name,title&order=created_at`),
      api.get('services', `shop_id=eq.${shop.id}&active=eq.true&select=id,staff_id,name,price,duration&order=price`),
      api.get('reviews', `shop_id=eq.${shop.id}&select=id,author,rating,body,reply,created_at&order=created_at.desc&limit=50`),
    ]);
    S.shops[slug] = { shop, staff, services, reviews, at: Date.now() };
    return S.shops[slug];
  }
  const ratingOf = (rv) => (rv.length ? (rv.reduce((a, r) => a + r.rating, 0) / rv.length).toFixed(1).replace('.', ',') : null);
  function reviewsHtml(rv) {
    if (!rv.length) return '<p class="mut">Henüz yorum yok. Randevusu tamamlanan müşteriler yorum yazabilir.</p>';
    return `<ul class="plain">${rv.map((r) => `<li class="appt"><p><span class="stars" aria-label="5 üzerinden ${r.rating} puan">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span> <b>${esc(r.author)}</b> <span class="mut">${esc(dLabel(dateOf(r.created_at), { day: 'numeric', month: 'long', year: 'numeric' }))}</span></p>
      <p>${esc(r.body)}</p>${r.reply ? `<p class="mut"><b>Dükkanın yanıtı:</b> ${esc(r.reply)}</p>` : ''}
      ${CFG.contactEmail && /@/.test(CFG.contactEmail) ? `<a class="hint" href="mailto:${esc(CFG.contactEmail)}?subject=${q('Yorum bildirimi')}&body=${q(`Uygunsuz bulduğum yorum: ${r.id}\nNedeni: `)}">Bu yorumu bildir</a>` : ''}</li>`).join('')}</ul>`;
  }
  function shopHtml(r) {
    const { shop: s, staff, services, reviews } = S.shops[r.slug];
    const fav = isFav(s.id);
    const avg = ratingOf(reviews);
    const pics = (s.photos || []).map((p, i) => `<img src="${esc(api.photoUrl(p))}" alt="${esc(s.name)} fotoğrafı ${i + 1}" loading="lazy">`).join('');
    const menu = staff.map((st) => {
      const sv = services.filter((v) => v.staff_id === st.id);
      if (!sv.length) return '';
      return `<div class="appt"><h3>${esc(st.name)} <span class="mut">${esc(st.title)}</span></h3>
        <ul class="plain">${sv.map((v) => `<li class="row"><span>${esc(v.name)} <span class="mut">${v.duration} dk</span></span><b>${TL(v.price)}</b></li>`).join('')}</ul></div>`;
    }).join('');
    return `<a class="back" href="#/">‹ Berberler</a>
    <h1>${esc(s.name)}</h1>
    <p class="mut">${esc([s.address, s.district, s.city].filter(Boolean).join(', '))}</p>
    <p>${avg ? `<span class="stars">★ ${avg}</span> (${reviews.length} yorum)` : '<span class="mut">Henüz yorum yok</span>'}</p>
    <div class="acts">
      <button class="sm fav-btn" aria-pressed="${fav}" data-act="fav" data-v="${esc(s.id)}">${fav ? '♥ Favorilerinde' : '♡ Favorilere ekle'}</button>
      <a class="sm" href="${esc(mapsLink(s))}" target="_blank" rel="noopener">Yol tarifi</a>
      ${s.phone ? `<a class="sm" href="tel:0${esc(s.phone)}">Ara: ${esc(fmtPhone(s.phone))}</a>` : ''}
      ${s.instagram ? `<a class="sm" href="${esc(igLink(s.instagram))}" target="_blank" rel="noopener">Instagram</a>` : ''}
    </div>
    ${s.loyalty_target > 0 ? `<p class="card loyal"><b>Sadakat kartı:</b> her ${s.loyalty_target}. ziyaretinde ${esc(s.loyalty_reward || 'hediye')}. Damgaların Randevularım ekranında birikir.</p>` : ''}
    ${s.accepting && menu ? `<a class="btn" href="#/b/${esc(s.slug)}/randevu">Randevu al</a>` : `<p class="card hot">${s.accepting ? 'Bu dükkan henüz hizmet eklemedi.' : 'Dükkan şu an online randevu almıyor.'}</p>`}
    ${pics ? `<h2>Fotoğraflar</h2><div class="pics">${pics}</div>` : ''}
    ${menu ? `<h2>Hizmetler ve fiyatlar</h2><div class="card">${menu}</div>` : ''}
    <h2>Yorumlar</h2><div class="card">${reviewsHtml(reviews)}</div>`;
  }

  // ===================================================================
  // Müşteri: Randevu alma
  // ===================================================================
  function resetBooking(slug) {
    if (S.bk.hold) releaseHold();
    S.bk = { slug, staff: null, svc: null, day: 0, autoDay: true, slots: null, slotsKey: '', slot: null, hold: null, done: null, busy: false };
  }
  const bkDays = () => Array.from({ length: 14 }, (_, i) => addDays(today(), i));
  async function loadSlots() {
    const b = S.bk;
    const { shop } = S.shops[b.slug];
    const key = `${b.staff}|${b.svc}|${b.day}`;
    if (!b.staff || !b.svc) { b.slots = null; return; }
    b.slots = await api.rpc('get_slots', { p_shop: shop.id, p_staff: b.staff, p_service: b.svc, p_day: bkDays()[b.day] });
    b.slotsKey = key;
  }
  // Müşteri gün seçmediyse, boş saati olan ilk güne kendiliğinden geç
  async function loadSlotsAuto() {
    await loadSlots();
    const b = S.bk;
    if (!b.autoDay || !b.slots || b.slots.length) return;
    const hrs = S.shops[b.slug].shop.hours || {};
    const days = bkDays();
    const start = b.day;
    for (let i = start + 1; i < days.length && i <= start + 7; i += 1) {
      if (!Array.isArray(hrs[String(dowOf(days[i]))])) continue;
      b.day = i;
      await loadSlots();
      if (b.slots.length) return;
    }
    b.day = start;
    await loadSlots();
  }
  function releaseHold() {
    const h = S.bk.hold;
    S.bk.hold = null;
    S.bk.slot = null;
    if (h) api.rpc('release_hold', { p_hold: h.id }).catch(() => {});
  }
  function bookHtml(r) {
    const b = S.bk;
    const { shop: s, staff, services } = S.shops[r.slug];
    if (b.done) return doneHtml(s, b.done);
    if (!s.accepting) return `<a class="back" href="#/b/${esc(s.slug)}">‹ ${esc(s.name)}</a><h1>${esc(s.name)}</h1><p class="card hot">Dükkan şu an online randevu almıyor. Dükkanı arayabilirsin.</p>`;
    const bookable = staff.filter((st) => services.some((v) => v.staff_id === st.id));
    let h = `<a class="back" href="#/b/${esc(s.slug)}">‹ ${esc(s.name)}</a><h1>Randevu al</h1>
      <h2 id="h-staff">Kimden almak istersin?</h2><div class="picks" role="group" aria-labelledby="h-staff">${bookable.map((st) =>
        `<button class="card pick" aria-pressed="${b.staff === st.id}" data-act="pick-staff" data-v="${st.id}"><b>${esc(st.name)}</b><span class="mut">${esc(st.title)}</span></button>`).join('')}</div>`;
    if (!bookable.length) return `${h}<p class="card">Bu dükkan henüz hizmet eklemedi.</p>`;
    if (b.staff) {
      const sv = services.filter((v) => v.staff_id === b.staff);
      h += `<h2 id="h-svc">Hizmet</h2><div class="chips" role="group" aria-labelledby="h-svc">${sv.map((v) =>
        `<button class="chip" aria-pressed="${b.svc === v.id}" data-act="pick-svc" data-v="${v.id}">${esc(v.name)}<small>${TL(v.price)}, ${v.duration} dk</small></button>`).join('')}</div>`;
    }
    if (b.svc) {
      const days = bkDays();
      const svc = services.find((v) => v.id === b.svc);
      h += `<h2 id="h-day">Gün</h2><div class="chips days" role="group" aria-labelledby="h-day">${days.map((d, i) => {
        const closed = !(s.hours && Array.isArray(s.hours[String(dowOf(d))]));
        return `<button class="chip" aria-pressed="${b.day === i}" data-act="pick-day" data-v="${i}" ${closed ? 'disabled' : ''} aria-label="${esc(longDay(d))}${closed ? ', kapalı' : ''}">${esc(i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : dLabel(d, { weekday: 'short' }))}<small>${closed ? 'Kapalı' : esc(dLabel(d, { day: 'numeric', month: 'short' }))}</small></button>`;
      }).join('')}</div>`;
      h += '<h2 id="h-slot">Saat</h2>';
      if (b.slots == null) h += loading('Boş saatler yükleniyor…');
      else if (!b.slots.length) h += `<p class="card">${esc(relDay(days[b.day]))} için boş saat kalmadı. Başka bir gün seç ya da bekleme listesine katıl.</p>${waitlistForm()}`;
      else {
        const surge = b.slots[0].slot_surge;
        h += `<div class="slots" role="group" aria-labelledby="h-slot">${b.slots.map((x) =>
          `<button class="slot" aria-pressed="${b.slot === x.slot_at}" data-act="pick-slot" data-v="${esc(x.slot_at)}">${esc(x.slot_label)}</button>`).join('')}</div>
          <p class="mut">${surge ? `Bu gün yoğun: fiyat <b>${TL(b.slots[0].slot_price)}</b> (normalde ${TL(svc.price)}).` : `Fiyat ${TL(b.slots[0].slot_price)}.`}</p>`;
      }
    }
    if (b.hold) h += holdHtml(s, staff, services);
    return h;
  }
  function holdHtml(s, staff, services) {
    const b = S.bk;
    const st = staff.find((x) => x.id === b.staff);
    const sv = services.find((x) => x.id === b.svc);
    const me = store.get('rv_me', { name: '', phone: '' });
    return `<section class="card hold" aria-labelledby="h-hold">
      <h2 id="h-hold" tabindex="-1" style="margin-top:0">Saat senin için tutuluyor</h2>
      <p class="timer" role="timer" aria-live="off">Kalan süre: <span id="hold-left">5:00</span></p>
      <div class="bar" aria-hidden="true"><i id="hold-bar"></i></div>
      <p><b>${esc(relDay(dateOf(b.hold.at)))}, ${esc(hm(b.hold.at))}</b></p>
      <p>${esc(st ? st.name : '')}, ${esc(sv ? sv.name : '')} (${sv ? sv.duration : ''} dk)</p>
      <p class="total">${TL(b.hold.price)}</p>${b.hold.surge ? `<p class="hot">Yoğun gün farkı dahil (normalde ${TL(b.hold.base)})</p>` : ''}
      <form data-form="confirm" novalidate>
        <label for="c-name">Adın ve soyadın</label>
        <input id="c-name" name="name" required minlength="2" maxlength="60" autocomplete="name" value="${esc(me.name)}">
        <label for="c-phone">Cep telefonun</label>
        <input id="c-phone" name="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder="05xx xxx xx xx" value="${esc(me.phone ? fmtPhone(me.phone) : '')}">
        <label class="chk"><input type="checkbox" name="remember" checked>Bilgilerimi bu telefonda hatırla</label>
        <p class="hint">Adın ve telefonun sadece bu randevu için dükkanla paylaşılır. <a href="gizlilik.html" target="_blank" rel="noopener">Gizlilik politikası</a></p>
        <button class="btn">Randevuyu onayla</button>
        <button type="button" class="btn sec" data-act="release" data-v="">Vazgeç, başka saat seç</button>
      </form></section>`;
  }
  function waitlistForm() {
    const me = store.get('rv_me', { name: '', phone: '' });
    return `<form data-form="waitlist" class="card" novalidate><h3>Bekleme listesi</h3>
      <p class="mut">Bu günde bir saat boşalırsa dükkan sana WhatsApp'tan haber verebilir.</p>
      <label for="w-name">Adın</label><input id="w-name" name="name" required minlength="2" autocomplete="name" value="${esc(me.name)}">
      <label for="w-phone">Cep telefonun</label><input id="w-phone" name="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder="05xx xxx xx xx" value="${esc(me.phone ? fmtPhone(me.phone) : '')}">
      <button class="btn sec">Bekleme listesine katıl</button></form>`;
  }
  const gcal = (title, startIso, mins, loc) => {
    const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const st = new Date(startIso);
    const en = new Date(st.getTime() + mins * 60000);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${q(title)}&dates=${f(st)}/${f(en)}&location=${q(loc)}`;
  };
  function doneHtml(s, d) {
    return `<h1>Randevun alındı</h1>
    <section class="card"><p class="total">${esc(relDay(dateOf(d.at)))}, ${esc(hm(d.at))}</p>
      <p><b>${esc(s.name)}</b></p><p>${esc(d.staff)}, ${esc(d.svc)} (${d.mins} dk)</p>
      <p>Ödenecek: <b>${TL(d.price)}</b>${d.surge ? ' (yoğun gün farkı dahil)' : ''}</p>
      <p class="mut">İptal etmen gerekirse <a href="#/randevularim">Randevularım</a> sayfasından yapabilirsin.</p>
      <a class="btn" href="${esc(gcal(`${s.name} randevusu`, d.at, d.mins, [s.address, s.district, s.city].filter(Boolean).join(', ')))}" target="_blank" rel="noopener">Takvimime ekle</a>
      <a class="btn sec" href="${esc(mapsLink(s))}" target="_blank" rel="noopener">Yol tarifi</a>
      <a class="btn sec" href="#/randevularim">Randevularım</a>
      <button class="btn sec" data-act="new-bk" data-v="">Yeni randevu al</button>
    </section>`;
  }
  function tickHold() {
    const b = S.bk;
    clearInterval(tickHold.t);
    if (!b.hold || !S.route || S.route.name !== 'book') return;
    const upd = () => {
      if (!S.bk.hold) { clearInterval(tickHold.t); return; }
      const left = S.bk.hold.exp - Date.now();
      if (left <= 0) {
        clearInterval(tickHold.t);
        S.bk.hold = null; S.bk.slot = null; S.bk.slots = null;
        toast('Saati tutma süren doldu. Saati yeniden seç.', true);
        loadSlots().then(redraw, fail);
        return;
      }
      const el = $('#hold-left');
      if (el) el.textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
      const bar = $('#hold-bar');
      if (bar) bar.style.width = `${Math.max(0, (left / 300000) * 100)}%`;
    };
    upd();
    tickHold.t = setInterval(upd, 1000);
  }

  // ===================================================================
  // Müşteri: Randevularım
  // ===================================================================
  async function loadMine() {
    const t = tokens();
    const ids = t.map((x) => x.token);
    const [mine, extras] = await Promise.all([
      ids.length ? api.rpc('my_bookings', { p_tokens: ids }) : [],
      ids.length ? api.rpc('my_extras', { p_tokens: ids }).catch(() => []) : [],
    ]);
    S.mine = mine;
    S.extras = Object.fromEntries(extras.map((x) => [x.token, x]));
  }
  function loyaltyCards() {
    const by = {};
    for (const a of S.mine || []) {
      const x = (S.extras || {})[a.token];
      if (!x || !(x.loyalty_target > 0)) continue;
      const c = by[x.shop_slug] || (by[x.shop_slug] = { name: a.shop_name, t: x.loyalty_target, reward: x.loyalty_reward, v: 0 });
      c.v = Math.max(c.v, x.visits);
    }
    const list = Object.values(by);
    if (!list.length) return '';
    return `<h2>Sadakat kartların</h2><ul class="plain">${list.map((c) => {
      const n = c.v % c.t;
      const left = c.t - n;
      return `<li class="card loyal"><div class="row"><h3>${esc(c.name)}</h3>${stamps(n, c.t)}</div>
        <p>${left === 1 ? `<b>Sıradaki ziyaretin ödüllü: ${esc(c.reward || 'hediye')}</b>` : `${left} ziyaret sonra: ${esc(c.reward || 'hediye')}`}</p></li>`;
    }).join('')}</ul>`;
  }
  function mineHtml() {
    const list = S.mine || [];
    if (!list.length) return `<h1>Randevularım</h1><div class="card empty"><p><b>Henüz randevun yok.</b></p><p class="mut">Bu telefondan aldığın randevular burada görünür.</p><a class="btn" href="#/">Berber bul</a></div>`;
    const now = Date.now();
    const up = list.filter((a) => a.status === 'confirmed' && new Date(a.starts_at).getTime() > now).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const past = list.filter((a) => !up.includes(a));
    const item = (a) => {
      const canReview = a.status === 'completed' && !a.reviewed;
      return `<li class="card"><div class="row"><h3>${esc(a.shop_name)}</h3><span class="badge st-${esc(a.status)}">${esc(MY_STATUS[a.status] || a.status)}</span></div>
      <p><b>${esc(relDay(dateOf(a.starts_at)))}, ${esc(hm(a.starts_at))}</b></p>
      <p class="mut">${esc(a.staff_name || '')}, ${esc(a.service_name)}, ${TL(a.price)}</p>
      <div class="acts">
        ${up.includes(a) ? `<button class="sm" data-act="cancel-bk" data-v="${esc(a.token)}" data-two="1">Randevuyu iptal et</button>` : (S.extras || {})[a.token] ? `<button class="sm pri" data-act="rebook" data-v="${esc(a.token)}">Aynısını tekrar al</button>` : `<a class="sm" href="#/b/${esc(a.shop_slug)}/randevu">Tekrar randevu al</a>`}
        ${a.shop_phone ? `<a class="sm" href="tel:0${esc(a.shop_phone)}">Dükkanı ara</a>` : ''}
      </div>
      ${canReview ? `<form data-form="review" novalidate style="margin-top:8px"><input type="hidden" name="token" value="${esc(a.token)}">
        <label for="rt-${esc(a.token)}">Puanın</label><select id="rt-${esc(a.token)}" name="rating">
          <option value="5">5 yıldız, çok iyi</option><option value="4">4 yıldız, iyi</option><option value="3">3 yıldız, idare eder</option><option value="2">2 yıldız, kötü</option><option value="1">1 yıldız, çok kötü</option></select>
        <label for="rb-${esc(a.token)}">Yorumun</label><textarea id="rb-${esc(a.token)}" name="body" required minlength="3" maxlength="500"></textarea>
        <p class="hint">Yorumunda sadece adın ve soyadının baş harfi görünür.</p>
        <button class="btn sec">Yorumu gönder</button></form>` : ''}
      ${a.reviewed ? '<p class="okc">Yorumun yayında. Teşekkürler!</p>' : ''}</li>`;
    };
    const g = S.gAsk;
    return `<h1>Randevularım</h1>
      ${g ? `<section class="card loyal" role="status"><p><b>Teşekkürler!</b> ${esc(g.name)} için Google'da da yorum yazar mısın? Dükkanın daha çok kişiye ulaşır.</p>
        <div class="acts"><a class="sm pri" href="${esc(g.url)}" target="_blank" rel="noopener">Google'da yorum yaz</a><button class="sm" data-act="g-dismiss" data-v="">Şimdi değil</button></div></section>` : ''}
      ${up.length ? `<h2>Yaklaşan</h2><ul class="plain">${up.map(item).join('')}</ul>` : ''}
      ${loyaltyCards()}
      ${past.length ? `<h2>Geçmiş</h2><ul class="plain">${past.map(item).join('')}</ul>` : ''}`;
  }

  // ===================================================================
  // Berber: giriş ve kurulum
  // ===================================================================
  function authHtml() {
    const t = S.authTab;
    return `<h1>Berber paneli</h1>
    <p class="mut">Dükkanını ekle, randevularını tek ekrandan yönet. Ücretsiz.</p>
    <nav class="subnav" aria-label="Giriş türü">
      <a href="#/berber" ${t === 'login' ? 'aria-current="page"' : ''} data-act="auth-tab" data-v="login">Giriş yap</a>
      <a href="#/berber" ${t === 'signup' ? 'aria-current="page"' : ''} data-act="auth-tab" data-v="signup">Kayıt ol</a>
    </nav>
    ${t === 'reset' ? `<form data-form="recover" class="card" novalidate><h2 style="margin-top:0">Şifreni sıfırla</h2>
      <label for="r-email">E-posta</label><input id="r-email" name="email" type="email" required autocomplete="email">
      <button class="btn">Sıfırlama bağlantısı gönder</button>
      <button type="button" class="lnk" data-act="auth-tab" data-v="login">Girişe dön</button></form>`
    : `<form data-form="${t}" class="card" novalidate>
      <label for="a-email">E-posta</label><input id="a-email" name="email" type="email" required autocomplete="email">
      <label for="a-pass">Şifre</label><input id="a-pass" name="password" type="password" required minlength="8" autocomplete="${t === 'signup' ? 'new-password' : 'current-password'}">
      ${t === 'signup' ? '<p class="hint">En az 8 karakter. Kayıt olarak <a href="gizlilik.html" target="_blank" rel="noopener">gizlilik politikasını</a> okuduğunu kabul edersin.</p>' : ''}
      <button class="btn">${t === 'signup' ? 'Hesap oluştur' : 'Giriş yap'}</button>
      ${t === 'login' ? '<button type="button" class="lnk" data-act="auth-tab" data-v="reset">Şifremi unuttum</button>' : ''}
    </form>`}`;
  }
  function onboardHtml() {
    return `${setupBanner()}<h1>Dükkanını oluştur</h1>
    <form data-form="onboard" class="card" novalidate>
      <label for="o-name">Dükkan adı</label><input id="o-name" name="name" required minlength="2" maxlength="80" placeholder="Örn. Makas &amp; Ustura">
      <label for="o-dist">Semt</label><select id="o-dist" name="district">${Object.keys(PLACES).map((k) => `<option>${esc(k)}</option>`).join('')}<option value="">Diğer</option></select>
      <label for="o-phone">Dükkan telefonu (isteğe bağlı, müşteriler görür)</label><input id="o-phone" name="phone" type="tel" inputmode="tel" placeholder="0312 xxx xx xx ya da 05xx xxx xx xx">
      <h2>Berber olduğunu doğrulayalım</h2>
      <p class="mut">Yeni dükkanlar onaylandıktan sonra müşterilere görünür. Seni bu numaradan arayıp teyit ederiz. Bu bilgiler müşterilere gösterilmez.</p>
      <label for="o-owner">Adın ve soyadın</label><input id="o-owner" name="owner_name" required minlength="2" maxlength="80" autocomplete="name">
      <label for="o-mobile">Cep telefonun</label><input id="o-mobile" name="owner_phone" type="tel" inputmode="tel" required placeholder="05xx xxx xx xx" autocomplete="tel">
      <button class="btn">Dükkanı oluştur</button>
    </form>
    <section class="card"><h2 style="margin-top:0">Bir dükkanda usta mısın?</h2>
      <p class="mut">Dükkan sahibinden aldığın davet kodunu yaz. Kendi randevularını görür, "Geldi" işaretlersin.</p>
      <form data-form="claim" novalidate><label for="cl-code">Davet kodu</label><input id="cl-code" name="code" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false">
      <button class="btn sec">Ekibe katıl</button></form></section>
    ${S.my && S.my.isAdmin ? '<a class="btn sec" href="#/berber/yonetim">Yönetim ekranı</a>' : ''}
    <button class="lnk" data-act="logout" data-v="">Çıkış yap</button>`;
  }
  function passwordHtml() {
    return `<h1>Yeni şifre belirle</h1><form data-form="newpass" class="card" novalidate>
      <label for="np">Yeni şifre</label><input id="np" name="password" type="password" required minlength="8" autocomplete="new-password">
      <button class="btn">Şifreyi kaydet</button></form>`;
  }

  // ===================================================================
  // Berber: veri
  // ===================================================================
  async function loadMyShop(force) {
    if (S.my && S.my.shop && !force) return;
    const uid = api.uid();
    const [rows, admin] = await Promise.all([
      api.get('shops', `owner_id=eq.${uid}&select=*`),
      api.rpc('is_admin').catch((e) => e),
    ]);
    const day = (S.my && S.my.day) || today();
    const isAdmin = admin === true;
    const setupMissing = admin instanceof AppError && admin.code === 'SETUP_MISSING';
    if (!rows.length) {
      // Usta hesabı: dükkan sahibinin davetiyle bağlanmış
      const acc = await api.get('staff_accounts', `user_id=eq.${uid}&select=staff_id,shop_id`).catch(() => []);
      if (acc.length) {
        const sid = acc[0].shop_id;
        const [shops, staff, services] = await Promise.all([
          api.get('shops', `id=eq.${sid}&select=*`),
          api.get('staff', `shop_id=eq.${sid}&select=*&order=created_at`),
          api.get('services', `shop_id=eq.${sid}&select=*&order=price`),
        ]);
        if (shops.length) { S.my = { ...(S.my || {}), shop: shops[0], staff, services, day, isAdmin, setupMissing, role: 'staff', me: acc[0].staff_id, accounts: [], contact: null }; return; }
      }
      S.my = { shop: null, day, isAdmin, setupMissing };
      return;
    }
    const shop = rows[0];
    const [staff, services, contacts, accounts] = await Promise.all([
      api.get('staff', `shop_id=eq.${shop.id}&select=*&order=created_at`),
      api.get('services', `shop_id=eq.${shop.id}&select=*&order=price`),
      api.get('shop_contacts', `shop_id=eq.${shop.id}&select=*`).catch(() => []),
      api.get('staff_accounts', `shop_id=eq.${shop.id}&select=staff_id,user_id,code,code_expires`).catch((e) => e),
    ]);
    const missing5 = accounts instanceof AppError;
    S.my = { ...(S.my || {}), shop, staff, services, day, isAdmin, setupMissing: setupMissing || missing5, role: 'owner', me: null, accounts: missing5 ? [] : accounts, contact: contacts[0] || null };
  }
  async function loadToday() {
    const m = S.my;
    const from = at(addDays(m.day, -6), '00:00').toISOString();
    const to = at(addDays(m.day, 1), '00:00').toISOString();
    const [appts, walkins, waitlist] = await Promise.all([
      api.get('appointments', `shop_id=eq.${m.shop.id}&starts_at=gte.${q(from)}&starts_at=lt.${q(to)}&select=*&order=starts_at`),
      api.get('walkins', `shop_id=eq.${m.shop.id}&select=*&order=created_at`),
      api.get('waitlist', `shop_id=eq.${m.shop.id}&day=eq.${m.day}&select=*&order=created_at`),
    ]);
    const phones = [...new Set(appts.filter((a) => a.customer_phone && a.kind !== 'block' && dateOf(a.starts_at) === m.day).map((a) => a.customer_phone))];
    const [packages, vis] = await Promise.all([
      m.role === 'staff' ? [] : api.get('customer_packages', `shop_id=eq.${m.shop.id}&select=*&order=created_at`).catch(() => []),
      m.shop.loyalty_target > 0 && phones.length
        ? api.get('appointments', `shop_id=eq.${m.shop.id}&status=eq.completed&kind=eq.appointment&customer_phone=in.(${phones.join(',')})&select=customer_phone&limit=10000`).catch(() => [])
        : [],
    ]);
    const visits = {};
    vis.forEach((r) => { visits[r.customer_phone] = (visits[r.customer_phone] || 0) + 1; });
    Object.assign(m, { appts, walkins, waitlist, packages, visits, loadedAt: Date.now() });
  }
  async function loadReport() {
    const m = S.my;
    const from = at(addDays(today(), -29), '00:00').toISOString();
    m.rep = await api.get('appointments', `shop_id=eq.${m.shop.id}&starts_at=gte.${q(from)}&kind=eq.appointment&select=staff_id,service_name,status,price,starts_at,source&order=starts_at&limit=10000`);
  }
  async function loadCustomers() {
    const m = S.my;
    const from = at(addDays(today(), -365), '00:00').toISOString();
    const [rows, notes, packages] = await Promise.all([
      api.get('appointments', `shop_id=eq.${m.shop.id}&starts_at=gte.${q(from)}&kind=eq.appointment&select=customer_name,customer_phone,status,price,starts_at&order=starts_at.desc&limit=5000`),
      api.get('customer_notes', `shop_id=eq.${m.shop.id}&select=ckey,note`),
      api.get('customer_packages', `shop_id=eq.${m.shop.id}&select=*&order=created_at`).catch(() => []),
    ]);
    m.custRows = rows;
    m.packages = packages;
    m.notes = Object.fromEntries(notes.map((n) => [n.ckey, n.note]));
  }
  async function loadAdmin() { S.adminRows = await api.rpc('admin_shops'); }
  async function loadSettings() {
    S.my.reviews = await api.get('reviews', `shop_id=eq.${S.my.shop.id}&select=*&order=created_at.desc&limit=100`);
  }
  const staffName = (id) => ((S.my.staff || []).find((s) => s.id === id) || {}).name || '';
  const svcOf = (id) => (S.my.services || []).find((v) => v.id === id);
  const isStaff = () => !!(S.my && S.my.role === 'staff');
  const crew = (m) => (m.role === 'staff' ? m.staff.filter((st) => st.id === m.me) : m.staff);
  const pkgsOf = (k) => (S.my.packages || []).filter((p) => p.ckey === k);

  function barberShell(tab, body) {
    if (isStaff()) return `${setupBanner()}${body}`;
    const t = (k, label, href) => `<a href="${href}" ${tab === k ? 'aria-current="page"' : ''}>${label}</a>`;
    return `${setupBanner()}<nav class="subnav" aria-label="Berber bölümleri">${t('bugun', 'Randevular', '#/berber')}${t('musteriler', 'Müşteriler', '#/berber/musteriler')}${t('rapor', 'Rapor', '#/berber/rapor')}${t('ayarlar', 'Ayarlar', '#/berber/ayarlar')}${S.my && S.my.isAdmin ? t('yonetim', 'Yönetim', '#/berber/yonetim') : ''}</nav>${body}`;
  }

  // ===================================================================
  // Berber: Randevular (gün görünümü)
  // ===================================================================
  function setupBanner() {
    if (!S.my || !S.my.setupMissing) return '';
    return `<section class="card status bad" role="alert"><h2>Kurulum eksik</h2>
      <p>Veritabanının yeni parçası henüz çalıştırılmamış. Bu yüzden son eklenen özelliklerin bir kısmı (onay, sadakat, paket, usta girişi gibi) çalışmıyor.</p>
      <p>Kurulum sayfasında <b>Hepsini kopyala</b>'ya dokun, Supabase'e yapıştır ve çalıştır.</p>
      <a class="btn" href="kurulum/" target="_blank" rel="noopener">Kurulum sayfasını aç</a></section>`;
  }
  function shopState(m) {
    const s = m.shop;
    if (!s.is_active && !s.reviewed_at) return 'pending';
    if (!s.is_active) return 'rejected';
    if (!m.staff.some((st) => st.active && m.services.some((v) => v.staff_id === st.id && v.active))) return 'incomplete';
    if (!s.accepting) return 'closed';
    return 'live';
  }
  function statusCard() {
    const m = S.my;
    const st = shopState(m);
    const hasStaff = m.staff.some((x) => x.active);
    const hasSvc = m.services.some((v) => v.active);
    const hasLoc = m.shop.lat != null;
    const hasPhoto = (m.shop.photos || []).length > 0;
    const li = (ok, t) => `<li>${ok ? '<span class="okc" aria-hidden="true">✓</span>' : '<span aria-hidden="true">○</span>'} ${t}<span class="sr-only">${ok ? ', tamamlandı' : ', yapılmadı'}</span></li>`;
    const todo = (hasStaff && hasSvc && hasLoc && hasPhoto) ? '' : `<ul class="plain checklist">${li(hasStaff, 'Personel ekle')}${li(hasSvc, 'Personele hizmet ve fiyat ekle')}${li(hasLoc, 'Dükkan konumunu kaydet')}${li(hasPhoto, 'Fotoğraf ekle')}</ul>`;
    const goBtn = S.route && S.route.tab === 'ayarlar' ? '' : '<a class="btn sec" href="#/berber/ayarlar">Ayarlara git</a>';
    if (st === 'pending') {
      return `<section class="card status pending" role="status"><h2>Dükkanın onay bekliyor</h2>
        <p>${m.contact ? `Berber olduğunu teyit etmek için seni <b>${esc(fmtPhone(m.contact.owner_phone))}</b> numarasından arayacağız.` : '<b>Onay için Ayarlar\'da adını ve cep telefonunu gir.</b>'} Onaylanınca müşteriler dükkanını görür ve randevu alabilir.</p>
        ${todo ? `<p class="mut">Bu sırada şunları tamamla:</p>${todo}${goBtn}` : ''}</section>`;
    }
    if (st === 'rejected') {
      return `<section class="card status bad" role="status"><h2>Dükkanın onaylanmadı</h2>
        ${m.shop.review_note ? `<p>Neden: ${esc(m.shop.review_note)}</p>` : ''}
        <p>Bir yanlışlık olduğunu düşünüyorsan ${esc(CFG.contactEmail || '')} adresine yaz.</p></section>`;
    }
    if (st === 'incomplete') {
      return `<section class="card status bad" role="status"><h2>Müşteriler dükkanını henüz göremiyor</h2>
        <p>Görünmen için en az bir personel ve o personele bir hizmet eklemelisin.</p>${todo}${goBtn}</section>`;
    }
    if (st === 'closed') {
      return `<section class="card status bad" role="status"><h2>Online randevu kapalı</h2><p>Müşteriler dükkanını görür ama randevu alamaz. Açmak için Randevular ekranındaki düğmeyi kullan.</p></section>`;
    }
    return `<section class="card status ok" role="status"><p class="okc" style="margin:0">Dükkanın müşterilere açık, randevu alınabiliyor.</p>${todo ? `<p class="mut">Daha çok müşteri için:</p>${todo}` : ''}</section>`;
  }

  // Günün çizelgesi: her saat ve her çalışan için ayrı kutu
  const toMin = (t) => { const [a, b] = String(t).split(':').map(Number); return a * 60 + b; };
  const minLabel = (x) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  function scheduleHtml() {
    const m = S.my;
    const s = m.shop;
    const staff = crew(m).filter((st) => st.active);
    if (!staff.length) return '';
    const h = s.hours && s.hours[String(dowOf(m.day))];
    if (!Array.isArray(h)) return `<h2>Günün çizelgesi</h2><p class="card mut">${esc(relDay(m.day))} dükkan kapalı. Çalışma saatlerini Ayarlar'dan değiştirebilirsin.</p>`;
    const step = s.slot_minutes || 30;
    const open = toMin(h[0]);
    const close = toMin(h[1]);
    const nowM = m.day === today() ? toMin(nowHM()) : (m.day < today() ? 24 * 60 : -1);
    const live = (m.appts || []).filter((a) => dateOf(a.starts_at) === m.day && (a.status === 'confirmed' || a.status === 'completed'));
    const pick = m.pick;
    let rows = '';
    for (let t = open; t < close; t += step) {
      const label = minLabel(t);
      const cells = staff.map((st) => {
        const a = live.find((x) => x.staff_id === st.id && toMin(hm(x.starts_at)) < t + step && (toMin(hm(x.ends_at)) || 1440) > t);
        if (a) {
          const first = toMin(hm(a.starts_at)) >= t;
          const block = a.kind === 'block';
          const name = block ? 'Kapalı' : a.customer_name.split(' ')[0];
          if (!first) return `<span class="cell cont${block ? ' block' : ''}" role="img" aria-label="${label} ${esc(st.name)}: dolu, ${esc(name)} devam ediyor"><span aria-hidden="true">↳</span></span>`;
          return `<button class="cell busy${block ? ' block' : ''}${a.status === 'completed' ? ' done' : ''}" data-act="goto-appt" data-v="${a.id}" aria-label="${label} ${esc(st.name)}: ${esc(block ? 'kapalı' : a.customer_name)}">${esc(name)}</button>`;
        }
        if (t + step <= nowM) return `<span class="cell past" role="img" aria-label="${label} ${esc(st.name)}: geçti"><span aria-hidden="true">–</span></span>`;
        const on = pick && pick.staff === st.id && pick.t === t;
        return `<button class="cell free" aria-pressed="${!!on}" data-act="slot-pick" data-v="${st.id}|${t}" aria-label="${label} ${esc(st.name)}: boş">+</button>`;
      }).join('');
      rows += `<div class="srow" style="--n:${staff.length}"><span class="stime">${label}</span>${cells}</div>`;
      if (pick && pick.t === t) rows += quickHtml(staff.find((x) => x.id === pick.staff), t);
    }
    return `<h2 id="h-sched">Günün çizelgesi</h2>
      <p class="hint">Boş kutuya (+) dokun: o saat ve o çalışan için randevu ekle ya da saati kapat. Dolu kutuya dokununca randevunun ayrıntısı açılır.</p>
      <div class="sched card"><div class="srow head" style="--n:${staff.length}"><span></span>${staff.map((st) => `<b class="shead">${esc(st.name)}</b>`).join('')}</div>${rows}</div>`;
  }
  function quickHtml(st, t) {
    if (!st) return '';
    const m = S.my;
    const sv = m.services.filter((v) => v.staff_id === st.id && v.active);
    return `<form data-form="quick" class="card qpanel" novalidate aria-labelledby="q-h">
      <h3 id="q-h" tabindex="-1">${esc(relDay(m.day))} ${minLabel(t)}, ${esc(st.name)}</h3>
      <input type="hidden" name="staff" value="${st.id}"><input type="hidden" name="t" value="${t}">
      ${sv.length ? `<label for="q-svc">Hizmet</label><select id="q-svc" name="svc">${sv.map((v) => `<option value="${v.id}">${esc(v.name)} (${v.duration} dk, ${TL(v.price)})</option>`).join('')}</select>
      <label for="q-name">Müşteri adı (isteğe bağlı)</label><input id="q-name" name="name" maxlength="60" autocomplete="off">
      <label for="q-phone">Telefon (isteğe bağlı)</label><input id="q-phone" name="phone" type="tel" inputmode="tel" placeholder="05xx xxx xx xx" autocomplete="off">
      ${CONTACTS ? '<button type="button" class="sm" data-act="contact-pick" data-v="q" style="margin-top:8px">Rehberden seç</button>' : ''}` : `<p class="mut">${esc(st.name)} için hizmet yok. Randevu eklemek için Ayarlar'dan hizmet ekle.</p>`}
      <div class="two"><div><label for="q-rep">Tekrar</label><select id="q-rep" name="rep"><option value="0">Tek seferlik</option><option value="1">Her hafta</option><option value="2">2 haftada bir</option><option value="3">3 haftada bir</option><option value="4">4 haftada bir</option></select></div>
      <div><label for="q-cnt">Kaç kez</label><select id="q-cnt" name="cnt">${[4, 6, 8, 12].map((n) => `<option>${n}</option>`).join('')}</select></div></div>
      <div class="acts">${sv.length ? '<button class="sm pri" name="mode" value="appt">Randevu ekle</button>' : ''}
        <button class="sm" name="mode" value="block">Saati kapat</button>
        <button type="button" class="sm" data-act="pick-cancel" data-v="">Vazgeç</button></div>
      <p class="hint">Eklenen ya da kapatılan saati müşteriler online alamaz.</p></form>`;
  }
  function todayHtml() {
    const m = S.my;
    const s = m.shop;
    const staffMode = m.role === 'staff';
    const dayAppts = (m.appts || []).filter((a) => dateOf(a.starts_at) === m.day && (!staffMode || a.staff_id === m.me));
    const live = dayAppts.filter((a) => a.kind !== 'block' && (a.status === 'confirmed' || a.status === 'completed'));
    const sum = (arr) => arr.reduce((x, a) => x + (a.price || 0), 0);
    const opts = m.staff.filter((st) => st.active).flatMap((st) => m.services.filter((v) => v.staff_id === st.id && v.active)
      .map((v) => `<option value="${st.id}|${v.id}">${esc(st.name)}: ${esc(v.name)} (${v.duration} dk, ${TL(v.price)})</option>`)).join('');
    const waiting = (m.waitlist || []).filter((w) => w.status === 'waiting');
    const freed = dayAppts.some((a) => a.status === 'cancelled') && waiting.length;
    return `${staffMode ? `<h1 style="margin:8px 0 0">${esc(s.name)}</h1><p class="mut">${esc(staffName(m.me))}, burada sadece kendi randevularını görüyorsun.</p>` : `<div class="row" style="margin-top:8px"><h1 style="margin:0">${esc(s.name)}</h1>
      <button class="switch" role="switch" aria-checked="${s.accepting}" data-act="accepting" data-v="">Online randevu ${s.accepting ? 'açık' : 'kapalı'}</button></div>
    ${['live', 'closed'].includes(shopState(m)) ? '' : statusCard()}`}
    <div class="daynav"><button class="sm" data-act="day" data-v="-1" aria-label="Önceki gün">‹</button>
      <b>${esc(relDay(m.day))}${m.day !== today() && m.day !== addDays(today(), 1) ? '' : `<br><span class="mut">${esc(dLabel(m.day, { day: 'numeric', month: 'long' }))}</span>`}</b>
      <button class="sm" data-act="day" data-v="1" aria-label="Sonraki gün">›</button></div>
    ${m.day !== today() ? '<button class="lnk" data-act="day" data-v="0">Bugüne dön</button>' : ''}
    <div class="stats">
      <div class="card"><span class="mut">Randevu</span><b>${live.length}</b></div>
      <div class="card"><span class="mut">Beklenen</span><b>${TL(sum(live))}</b></div>
      <div class="card"><span class="mut">Tamamlanan</span><b>${TL(sum(live.filter((a) => a.status === 'completed')))}</b></div>
    </div>
    <p class="hint">Son güncelleme ${esc(hm(new Date(m.loadedAt || Date.now()).toISOString()))}. <button class="lnk" data-act="refresh" data-v="">Yenile</button></p>
    ${freed ? `<p class="card hot">İptal olan saat var ve bekleme listesinde ${waiting.length} kişi bekliyor. Aşağıdan WhatsApp ile haber ver.</p>` : ''}
    ${scheduleHtml()}
    <h2>Randevular</h2>
    <section class="card">${dayAppts.length ? `<ul class="plain">${dayAppts.map(apptHtml).join('')}</ul>` : '<p class="mut">Bu gün için randevu yok.</p>'}</section>
    ${!staffMode && m.day === today() && opts ? `<details class="card" id="add-box" ${m.addOpen ? 'open' : ''}><summary>Kapıdan gelen müşteriyi sıraya ekle</summary>
      <form data-form="add-appt" novalidate>
        <label for="m-name">Müşteri adı</label><input id="m-name" name="name" required minlength="1" maxlength="60" autocomplete="off">
        <label for="m-phone">Telefon (isteğe bağlı)</label><input id="m-phone" name="phone" type="tel" inputmode="tel" placeholder="05xx xxx xx xx" autocomplete="off">
        ${CONTACTS ? '<button type="button" class="sm" data-act="contact-pick" data-v="m" style="margin-top:8px">Rehberden seç</button>' : ''}
        <label for="m-svc">Personel ve hizmet</label><select id="m-svc" name="svc">${opts}</select>
        <button class="btn" name="mode" value="queue">Sıraya ekle</button>
      </form></details>` : ''}
    ${!staffMode && m.day === today() && m.walkins.length ? queueHtml() : ''}
    ${!staffMode && (m.waitlist || []).length ? waitlistHtml() : ''}
    ${commissionHtml()}
    ${staffMode ? `<section class="card"><p class="mut">${esc((api.session && api.session.user && api.session.user.email) || '')}</p><button class="btn sec" data-act="logout" data-v="">Çıkış yap</button></section>` : ''}`;
  }
  function apptHtml(a) {
    const m = S.my;
    if (a.kind === 'block') {
      return `<li class="appt" id="appt-${a.id}" tabindex="-1"><div class="row"><span class="time">${esc(hm(a.starts_at))}–${esc(hm(a.ends_at))}</span><span class="badge">Kapalı</span></div>
        <p class="mut">${esc(staffName(a.staff_id))} bu saatte müşteri almıyor.</p>
        <div class="acts"><button class="sm" data-act="unblock" data-v="${a.id}">Saati aç</button></div></li>`;
    }
    const msg = `Merhaba ${a.customer_name.split(' ')[0]}, ${relDay(dateOf(a.starts_at)).toLocaleLowerCase('tr')} saat ${hm(a.starts_at)} ${m.shop.name} randevunu hatırlatırız. Gelemeyeceksen lütfen haber ver.`;
    const src = a.source === 'web' ? 'online' : a.source === 'walkin' ? 'kapıdan' : 'elle';
    const mins = Math.round((new Date(a.ends_at) - new Date(a.starts_at)) / 60000);
    const t = m.shop.loyalty_target;
    let loyal = '';
    if (t > 0 && a.customer_phone && (a.status === 'confirmed' || a.status === 'completed')) {
      const v = (m.visits || {})[a.customer_phone] || 0;
      if (a.status === 'confirmed') loyal = (v + 1) % t === 0 ? `<p class="hot">Bu ziyaret ödüllü: ${esc(m.shop.loyalty_reward || 'hediye')} (${t}. ziyaret)</p>` : `<p class="mut">Sadakat: ${stamps(v % t, t)} ${v % t}/${t}</p>`;
      else if (v > 0 && v % t === 0) loyal = `<p class="okc">Bu ziyaret ödüllüydü: ${esc(m.shop.loyalty_reward || 'hediye')}</p>`;
    }
    const pk = m.role === 'staff' ? [] : pkgsOf(ckey(a.customer_name, a.customer_phone)).filter((p) => p.used < p.total);
    const pkHtml = pk.map((p) => `<p class="mut">Paket: ${esc(p.title)}, ${p.total - p.used} hakkı kaldı <button class="sm" data-act="pkg-use" data-v="${p.id}">1 hak kullan</button></p>`).join('');
    return `<li class="appt" id="appt-${a.id}" tabindex="-1"><div class="row"><span class="time">${esc(hm(a.starts_at))}–${esc(hm(a.ends_at))}</span><span class="badge st-${a.status}">${STATUS[a.status]}</span></div>
      <p><b>${esc(a.customer_name)}</b> <span class="mut">(${src}${a.series_id ? ', tekrarlayan' : ''})</span></p>
      <p class="mut">${esc(a.service_name)}, ${esc(staffName(a.staff_id))}, ${TL(a.price)}${a.surge ? ' (yoğun gün farkı dahil)' : ''}${a.customer_phone ? `, ${esc(fmtPhone(a.customer_phone))}` : ''}</p>
      ${loyal}${pkHtml}
      <div class="acts">
        ${a.status === 'confirmed' ? `<button class="sm pri" data-act="st" data-v="${a.id}" data-k="completed">Geldi</button>
          <button class="sm" data-act="st" data-v="${a.id}" data-k="no_show">Gelmedi</button>
          <button class="sm" data-act="st" data-v="${a.id}" data-k="cancelled" data-two="1">İptal et</button>` : ''}
        ${a.customer_phone ? `<a class="sm" href="tel:0${esc(a.customer_phone)}">Ara</a>` : ''}
        ${a.customer_phone && a.status === 'confirmed' ? `<a class="sm" href="${esc(waLink(a.customer_phone, msg))}" target="_blank" rel="noopener">WhatsApp ile hatırlat</a>` : ''}
        ${a.series_id && a.status === 'confirmed' ? `<button class="sm" data-act="series-cancel" data-v="${a.id}" data-two="1">Sonraki tekrarları iptal et</button>` : ''}
        ${a.status === 'confirmed' ? `<a class="sm" href="${esc(gcal(`${a.customer_name}: ${a.service_name} (${staffName(a.staff_id)})`, a.starts_at, mins, m.shop.name))}" target="_blank" rel="noopener">Takvime ekle</a>` : ''}
      </div></li>`;
  }
  function queueHtml() {
    const m = S.my;
    const waitBy = {};
    return `<h2>Sıra (kapıdan gelenler)</h2><section class="card"><ul class="plain">${m.walkins.map((w, i) => {
      const sv = svcOf(w.service_id);
      const wait = waitBy[w.staff_id] || 0;
      waitBy[w.staff_id] = wait + (sv ? sv.duration : 30);
      return `<li class="appt"><div class="row"><b>${i + 1}. ${esc(w.name)}</b><span class="mut">${wait ? `tahmini bekleme ${wait} dk` : 'sıradaki'}</span></div>
        <p class="mut">${esc(staffName(w.staff_id))}, ${esc(sv ? sv.name : '')}</p>
        <div class="acts"><button class="sm pri" data-act="seat" data-v="${w.id}">Koltuğa aldım</button><button class="sm" data-act="unqueue" data-v="${w.id}">Sıradan çıkar</button></div></li>`;
    }).join('')}</ul></section>`;
  }
  function waitlistHtml() {
    const m = S.my;
    const link = shopLink(m.shop.slug);
    return `<h2>Bekleme listesi (${esc(relDay(m.day))})</h2><section class="card"><ul class="plain">${m.waitlist.map((w) => {
      const text = `Merhaba ${w.name.split(' ')[0]}, ${m.shop.name}'da ${relDay(m.day).toLocaleLowerCase('tr')} için saat boşaldı. Randevu almak için: ${link}`;
      return `<li class="appt"><div class="row"><b>${esc(w.name)}</b><span class="badge">${w.status === 'notified' ? 'Haber verildi' : 'Bekliyor'}</span></div>
        <p class="mut">${esc(fmtPhone(w.phone))}${w.staff_id ? `, ${esc(staffName(w.staff_id))}` : ''}</p>
        <div class="acts"><a class="sm pri" href="${esc(waLink(w.phone, text))}" target="_blank" rel="noopener" data-act="wl-notify" data-v="${w.id}">WhatsApp ile haber ver</a>
        <button class="sm" data-act="wl-del" data-v="${w.id}">Listeden çıkar</button></div></li>`;
    }).join('')}</ul></section>`;
  }
  function commissionHtml() {
    const m = S.my;
    if (!m.staff.length) return '';
    const done = (m.appts || []).filter((a) => a.status === 'completed' && a.kind !== 'block');
    const rows = crew(m).map((st) => {
      const day = done.filter((a) => a.staff_id === st.id && dateOf(a.starts_at) === m.day).reduce((x, a) => x + a.price, 0);
      const week = done.filter((a) => a.staff_id === st.id).reduce((x, a) => x + a.price, 0);
      const pr = (v) => Math.round((v * st.commission) / 100);
      return `<li class="appt"><p><b>${esc(st.name)}</b> <span class="mut">prim oranı %${st.commission}</span></p>
        <p class="mut">${esc(relDay(m.day))}: ${TL(day)} ciro, ${TL(pr(day))} prim. Son 7 gün: ${TL(week)} ciro, ${TL(pr(week))} prim.</p></li>`;
    }).join('');
    return `<h2>Personel prim özeti</h2><section class="card"><ul class="plain">${rows}</ul><p class="hint">Sadece "Geldi" olarak işaretlenen randevular sayılır.</p></section>`;
  }

  // ===================================================================
  // Berber: Müşteriler
  // ===================================================================
  const ckey = (name, phone) => (phone ? phone : `ad:${String(name).trim().toLocaleLowerCase('tr')}`);
  function customersHtml() {
    const m = S.my;
    const map = new Map();
    for (const a of m.custRows || []) {
      if (!a.customer_phone && a.customer_name === 'Dükkan müşterisi') continue;
      const k = ckey(a.customer_name, a.customer_phone);
      let c = map.get(k);
      if (!c) { c = { k, name: a.customer_name, phone: a.customer_phone, visits: 0, spent: 0, last: null, noshow: 0, cancel: 0, upcoming: 0 }; map.set(k, c); }
      if (a.status === 'completed') { c.visits += 1; c.spent += a.price; if (!c.last || a.starts_at > c.last) c.last = a.starts_at; }
      else if (a.status === 'no_show') c.noshow += 1;
      else if (a.status === 'cancelled') c.cancel += 1;
      else if (a.status === 'confirmed' && new Date(a.starts_at) > new Date()) c.upcoming += 1;
    }
    const term = S.custSearch.trim().toLocaleLowerCase('tr');
    let list = Array.from(map.values());
    const digits = term.replace(/\D/g, '').replace(/^0/, '');
    if (term) list = list.filter((c) => c.name.toLocaleLowerCase('tr').includes(term) || (digits.length >= 3 && String(c.phone).includes(digits)));
    list.sort((a, b) => String(b.last || '').localeCompare(String(a.last || '')));
    const lt = m.shop.loyalty_target;
    const pkHtml = (c) => {
      const ps = pkgsOf(c.k);
      return `${ps.map((p) => `<div class="row pkg"><span>Paket: <b>${esc(p.title)}</b>, ${p.used}/${p.total} kullanıldı${p.used >= p.total ? ' (bitti)' : ''}</span>
        <span class="acts">${p.used < p.total ? `<button class="sm" data-act="pkg-use" data-v="${p.id}">1 hak kullan</button>` : ''}<button class="sm" data-act="pkg-del" data-v="${p.id}" data-two="1">Sil</button></span></div>`).join('')}
        <details><summary>Paket ekle</summary><form data-form="pkg-add" novalidate><input type="hidden" name="k" value="${esc(c.k)}"><input type="hidden" name="name" value="${esc(c.name)}">
          <div class="two"><div><label for="pt-${esc(c.k)}">Paket adı</label><input id="pt-${esc(c.k)}" name="title" maxlength="60" value="Saç 5'li"></div>
          <div><label for="pn-${esc(c.k)}">Hak sayısı</label><input id="pn-${esc(c.k)}" name="total" type="number" inputmode="numeric" min="1" max="100" value="5"></div></div>
          <p class="hint">Parasını dükkanda alırsın; uygulama kalan hakkı takip eder.</p><button class="sm pri">Paketi ekle</button></form></details>`;
    };
    const card = (c, i) => `<li class="card"><div class="row"><h3>${esc(c.name)}</h3>${c.noshow >= 2 ? `<span class="badge st-no_show">${c.noshow} kez gelmedi</span>` : ''}</div>
      ${lt > 0 && c.phone ? `<p class="mut">Sadakat: ${stamps(c.visits % lt, lt)} ${c.visits % lt}/${lt}${(c.visits + 1) % lt === 0 ? ' <b>, sıradaki ziyareti ödüllü</b>' : ''}</p>` : ''}
      <p class="mut">${c.visits} ziyaret, ${TL(c.spent)} harcama${c.last ? `, son ziyaret ${esc(dLabel(dateOf(c.last), { day: 'numeric', month: 'long' }))}` : ''}${c.upcoming ? `, ${c.upcoming} yaklaşan randevu` : ''}${c.noshow ? `, ${c.noshow} kez gelmedi` : ''}${c.cancel ? `, ${c.cancel} iptal` : ''}.</p>
      ${c.phone ? `<div class="acts"><a class="sm" href="tel:0${esc(c.phone)}">Ara: ${esc(fmtPhone(c.phone))}</a><a class="sm" href="${esc(waLink(c.phone, `Merhaba ${c.name.split(' ')[0]}, `))}" target="_blank" rel="noopener">WhatsApp</a></div>` : ''}
      <form data-form="note" novalidate><input type="hidden" name="k" value="${esc(c.k)}">
        <label for="n-${i}">Not</label><input id="n-${i}" name="note" maxlength="300" value="${esc(m.notes[c.k] || '')}" placeholder="Örn. 2 numara, sakal kısa">
        <button class="sm" style="margin-top:8px">Notu kaydet</button></form>
      ${pkHtml(c)}</li>`;
    const weeks = m.shop.rebook_weeks || 4;
    const now = Date.now();
    const due = term ? [] : Array.from(map.values())
      .filter((c) => c.phone && c.last && !c.upcoming && now - new Date(c.last).getTime() > weeks * 7 * 86400000)
      .sort((a, b) => String(a.last).localeCompare(String(b.last))).slice(0, 40);
    const link = shopLink(m.shop.slug);
    const dueHtml = due.length ? `<details class="card" id="due-box" open><summary>Zamanı gelenler (${due.length})</summary>
      <p class="hint">${weeks} haftadan uzun süredir gelmeyen ve randevusu olmayan müşteriler. Tek dokunuşla davet et.</p>
      <ul class="plain">${due.map((c) => {
        const w = Math.floor((now - new Date(c.last).getTime()) / (7 * 86400000));
        const text = `Merhaba ${c.name.split(' ')[0]}, ${m.shop.name} olarak seni bekliyoruz. Son ziyaretinin üzerinden ${w} hafta geçti. Randevu almak için: ${link}`;
        return `<li class="appt"><div class="row"><b>${esc(c.name)}</b><span class="mut">${w} hafta önce</span></div>
          <div class="acts"><a class="sm pri" href="${esc(waLink(c.phone, text))}" target="_blank" rel="noopener">WhatsApp ile davet et</a></div></li>`;
      }).join('')}</ul></details>` : '';
    return `<h1>Müşteriler</h1>
      ${dueHtml}
      <label for="cust-q">Müşteri ara</label><input id="cust-q" type="search" value="${esc(S.custSearch)}" placeholder="Ad ya da telefon" autocomplete="off">
      <ul class="plain" id="cust-list" aria-live="polite">${list.map(card).join('') || `<li class="card empty"><p class="mut">${term ? 'Aramana uyan müşteri yok.' : 'Henüz müşteri yok. Randevular oluştukça burada listelenir.'}</p></li>`}</ul>`;
  }

  // ===================================================================
  // Berber: Rapor
  // ===================================================================
  function reportHtml() {
    const m = S.my;
    const p = m.rp || 7;
    const from = addDays(today(), -(p - 1));
    const nowIso = new Date().toISOString();
    const rows = (m.rep || []).filter((a) => dateOf(a.starts_at) >= from && a.starts_at <= nowIso);
    const done = rows.filter((a) => a.status === 'completed');
    const ns = rows.filter((a) => a.status === 'no_show').length;
    const ciro = done.reduce((x, a) => x + a.price, 0);
    const kept = rows.filter((a) => a.status !== 'cancelled');
    const online = kept.filter((a) => a.source === 'web').length;
    const pct = (a, b) => (b ? Math.round((a * 100) / b) : 0);
    const staffRows = m.staff.map((st) => {
      const d = done.filter((a) => a.staff_id === st.id);
      const c = d.reduce((x, a) => x + a.price, 0);
      return { st, n: d.length, c, pr: Math.round((c * st.commission) / 100) };
    }).filter((r) => r.n || r.st.active);
    const svc = {};
    done.forEach((a) => { svc[a.service_name] = (svc[a.service_name] || 0) + 1; });
    const top = Object.entries(svc).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const hours = {};
    kept.forEach((a) => { const h = Number(hm(a.starts_at).slice(0, 2)); hours[h] = (hours[h] || 0) + 1; });
    const hk = Object.keys(hours).map(Number);
    const hMin = hk.length ? Math.min(...hk) : 9;
    const hMax = hk.length ? Math.max(...hk) : 20;
    const hMaxV = Math.max(1, ...Object.values(hours));
    const bars = [];
    for (let h = hMin; h <= hMax; h += 1) {
      const v = hours[h] || 0;
      bars.push(`<div class="bar" title="${String(h).padStart(2, '0')}:00, ${v} randevu"><span style="height:${Math.round((v * 100) / hMaxV)}%"></span><small>${String(h).padStart(2, '0')}</small></div>`);
    }
    const busiest = hk.length ? hk.reduce((a, b) => (hours[b] > hours[a] ? b : a)) : null;
    const per = (k, l) => `<button class="sm" aria-pressed="${p === k}" data-act="rp" data-v="${k}">${l}</button>`;
    return `<h1>Rapor</h1>
      <div class="acts" role="group" aria-label="Dönem" style="margin-bottom:12px">${per(1, 'Bugün')}${per(7, 'Son 7 gün')}${per(30, 'Son 30 gün')}</div>
      <div class="stats">
        <div class="card"><span class="mut">Ciro</span><b>${TL(ciro)}</b></div>
        <div class="card"><span class="mut">Müşteri</span><b>${done.length}</b></div>
        <div class="card"><span class="mut">Ortalama</span><b>${TL(done.length ? Math.round(ciro / done.length) : 0)}</b></div>
        <div class="card"><span class="mut">Gelmeyen</span><b>%${pct(ns, done.length + ns)}</b></div>
        <div class="card"><span class="mut">Online</span><b>%${pct(online, kept.length)}</b></div>
        <div class="card"><span class="mut">İptal</span><b>${rows.length - kept.length}</b></div>
      </div>
      <p class="hint">Sadece "Geldi" işaretlenen randevular ciroya girer. Kapıdan gelenler dahil.</p>
      <h2>Personel</h2><section class="card"><ul class="plain">${staffRows.map((r) => `<li class="appt"><div class="row"><b>${esc(r.st.name)}</b><b>${TL(r.c)}</b></div>
        <p class="mut">${r.n} müşteri, prim %${r.st.commission}: ${TL(r.pr)}</p></li>`).join('') || '<li class="mut">Henüz veri yok.</li>'}</ul></section>
      <h2>En yoğun saatler</h2><section class="card">${hk.length ? `<div class="bars" role="img" aria-label="Saatlere göre randevu sayısı. En yoğun saat ${String(busiest).padStart(2, '0')}:00.">${bars.join('')}</div>
        <p class="hint">En yoğun saat ${String(busiest).padStart(2, '0')}:00. Boş saatler için kampanya düşünebilirsin.</p>` : '<p class="mut">Henüz veri yok.</p>'}</section>
      <h2>En çok yapılan hizmetler</h2><section class="card">${top.length ? `<ul class="plain">${top.map(([n, c]) => `<li class="row"><span>${esc(n)}</span><b>${c}</b></li>`).join('')}</ul>` : '<p class="mut">Henüz veri yok.</p>'}</section>`;
  }

  // ===================================================================
  // Berber: Ayarlar
  // ===================================================================
  function drawQr() {
    const box = $('#qr-box');
    if (!box || !S.my || !S.my.shop) return;
    const text = shopLink(S.my.shop.slug);
    if (typeof window.qrcode !== 'function') { box.innerHTML = '<p class="mut">QR kod için internet bağlantısı gerekiyor.</p>'; setTimeout(() => { if (typeof window.qrcode === 'function') drawQr(); }, 1500); return; }
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      let p = '';
      for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (qr.isDark(r, c)) p += `M${c + 4} ${r + 4}h1v1h-1z`;
      box.innerHTML = `<svg class="qr" viewBox="0 0 ${n + 8} ${n + 8}" role="img" aria-label="Dükkan randevu linkinin QR kodu"><rect width="100%" height="100%" fill="#fff"/><path d="${p}" fill="#000"/></svg>`;
    } catch { box.innerHTML = '<p class="mut">QR kod oluşturulamadı.</p>'; }
  }
  function staffAccountHtml(st) {
    const m = S.my;
    const acc = (m.accounts || []).find((x) => x.staff_id === st.id);
    const code = acc && !acc.user_id && acc.code && new Date(acc.code_expires) > new Date() ? acc.code : '';
    const text = `Merhaba ${st.name}, Bi Koltuk'ta ${m.shop.name} ekibine katılmak için ${siteUrl()}#/berber adresini aç, e-postanla "Kayıt ol", sonra "Davet kodu" kısmına şunu yaz: ${code}`;
    return `<div class="svc-row"><p><b>Kendi telefonundan giriş</b></p>${acc && acc.user_id
      ? `<p class="okc">${esc(st.name)} kendi hesabıyla giriyor; sadece kendi randevularını görür.</p><button class="sm" data-act="staff-unlink" data-v="${st.id}" data-two="1">Bağlantıyı kaldır</button>`
      : code
        ? `<p>Davet kodu: <b class="code">${esc(code)}</b> <span class="mut">7 gün geçerli, tek kullanımlık</span></p><div class="acts"><a class="sm pri" href="${esc(waLink('', text))}" target="_blank" rel="noopener">WhatsApp ile gönder</a><button class="sm" data-act="staff-invite" data-v="${st.id}">Yeni kod</button></div>`
        : `<p class="mut">${esc(st.name)} kendi telefonundan girip kendi randevularını görebilir, "Geldi" işaretleyebilir. Fiyatları ve ayarları değiştiremez.</p><button class="sm" data-act="staff-invite" data-v="${st.id}">Davet kodu oluştur</button>`}</div>`;
  }
  function settingsHtml() {
    const m = S.my;
    const s = m.shop;
    const link = shopLink(s.slug);
    const distOpts = Object.keys(PLACES).map((k) => `<option ${s.district === k ? 'selected' : ''}>${esc(k)}</option>`).join('');
    const staffHtml = m.staff.map((st) => {
      const sv = m.services.filter((v) => v.staff_id === st.id);
      return `<article class="svc-row"><form data-form="staff" novalidate><input type="hidden" name="id" value="${st.id}">
        <div class="row"><h3>${esc(st.name)}</h3><span class="badge">${st.active ? 'Çalışıyor' : 'Pasif'}</span></div>
        <div class="two"><div><label for="sn-${st.id}">Ad</label><input id="sn-${st.id}" name="name" required minlength="2" maxlength="60" value="${esc(st.name)}"></div>
        <div><label for="sc-${st.id}">Prim (%)</label><input id="sc-${st.id}" name="commission" type="number" inputmode="numeric" min="0" max="100" value="${st.commission}"></div></div>
        <label for="stt-${st.id}">Unvan</label><input id="stt-${st.id}" name="title" maxlength="30" value="${esc(st.title)}">
        <div class="acts"><button class="sm pri">Kaydet</button><button type="button" class="sm" data-act="staff-active" data-v="${st.id}">${st.active ? 'Pasif yap' : 'Aktif yap'}</button></div></form>
        ${staffAccountHtml(st)}
        ${sv.map((v) => `<form data-form="svc" class="svc-row" novalidate><input type="hidden" name="id" value="${v.id}"><input type="hidden" name="staff" value="${st.id}">
          <p><b>${esc(v.name)}</b></p><div class="two">
          <div><label for="vp-${v.id}">Fiyat (₺)</label><input id="vp-${v.id}" name="price" type="number" inputmode="numeric" min="0" max="100000" step="5" required value="${v.price}"></div>
          <div><label for="vd-${v.id}">Süre (dk)</label><input id="vd-${v.id}" name="duration" type="number" inputmode="numeric" min="5" max="480" step="5" required value="${v.duration}"></div></div>
          <label class="chk"><input type="checkbox" name="active" ${v.active ? 'checked' : ''}>Müşteriler seçebilsin</label>
          <button class="sm">Hizmeti kaydet</button></form>`).join('')}
        <form data-form="svc" class="svc-row" novalidate><input type="hidden" name="staff" value="${st.id}"><h3>${esc(st.name)} için yeni hizmet</h3>
          <label for="nv-${st.id}">Hizmet adı</label><input id="nv-${st.id}" name="name" list="svc-names" required minlength="2" maxlength="40" placeholder="Örn. Saç">
          <div class="two"><div><label for="nvp-${st.id}">Fiyat (₺)</label><input id="nvp-${st.id}" name="price" type="number" inputmode="numeric" min="0" max="100000" step="5" required></div>
          <div><label for="nvd-${st.id}">Süre (dk)</label><input id="nvd-${st.id}" name="duration" type="number" inputmode="numeric" min="5" max="480" step="5" required value="30"></div></div>
          <button class="btn sec">Hizmeti ekle</button></form></article>`;
    }).join('');
    const hours = DAYS.map(([k, n]) => {
      const h = s.hours[k];
      return `<div class="hr" role="group" aria-label="${n}"><label class="chk"><input type="checkbox" name="o${k}" ${h ? 'checked' : ''}>${n}</label>
        <input type="time" name="a${k}" aria-label="${n} açılış" value="${h ? h[0] : '10:00'}"><input type="time" name="c${k}" aria-label="${n} kapanış" value="${h ? h[1] : '20:00'}"></div>`;
    }).join('');
    const rv = (m.reviews || []).map((r) => `<li class="appt"><p><span class="stars" aria-label="${r.rating} yıldız">${'★'.repeat(r.rating)}</span> <b>${esc(r.author)}</b></p><p>${esc(r.body)}</p>
      <form data-form="reply" novalidate><input type="hidden" name="id" value="${r.id}"><label for="rp-${r.id}">Yanıtın</label>
      <input id="rp-${r.id}" name="reply" maxlength="500" value="${esc(r.reply || '')}"><button class="sm" style="margin-top:8px">${r.reply ? 'Yanıtı güncelle' : 'Yanıtla'}</button></form></li>`).join('');
    return `<h1>Ayarlar</h1>
    ${statusCard()}
    <section class="card" id="s-link"><h2 style="margin-top:0">Müşteri linkin ve QR kodun</h2>
      <p>Müşterilerin bu linkten ya da QR koddan randevu alır. Instagram biyografine, WhatsApp durumuna ve vitrine koy.</p>
      <p class="linkbox" id="shop-link">${esc(link)}</p><div id="qr-box"></div>
      <div class="acts"><button class="sm pri" data-act="copy-link" data-v="">Linki kopyala</button>
      <a class="sm" href="${esc(waLink('', `${s.name} için online randevu: ${link}`))}" target="_blank" rel="noopener">WhatsApp'ta paylaş</a></div>
      <p class="hint">İpucu: Müşterine dükkanını uygulamada "Favori" yapmasını söyle; favori dükkanlar listesinin en başında görünür.</p></section>

    <section class="card" id="s-contact"><h2 style="margin-top:0">Doğrulama bilgilerin</h2>
      <p class="mut">Sadece onay için kullanılır, müşterilere gösterilmez.</p>
      <form data-form="contact" novalidate>
        <label for="c-owner">Adın ve soyadın</label><input id="c-owner" name="owner_name" required minlength="2" maxlength="80" value="${esc(m.contact ? m.contact.owner_name : '')}" autocomplete="name">
        <label for="c-mobile">Cep telefonun</label><input id="c-mobile" name="owner_phone" type="tel" inputmode="tel" required value="${esc(m.contact ? fmtPhone(m.contact.owner_phone) : '')}" placeholder="05xx xxx xx xx" autocomplete="tel">
        <button class="btn sec">Kaydet</button></form></section>

    <section class="card" id="s-profile"><h2 style="margin-top:0">Dükkan bilgileri</h2><form data-form="profile" novalidate>
      <label for="p-name">Dükkan adı</label><input id="p-name" name="name" required minlength="2" maxlength="80" value="${esc(s.name)}">
      <label for="p-dist">Semt</label><select id="p-dist" name="district">${distOpts}<option value="" ${PLACES[s.district] ? '' : 'selected'}>Diğer</option></select>
      <label for="p-addr">Açık adres</label><input id="p-addr" name="address" maxlength="200" value="${esc(s.address)}" autocomplete="street-address">
      <label for="p-phone">Dükkan telefonu</label><input id="p-phone" name="phone" type="tel" inputmode="tel" value="${esc(fmtPhone(s.phone))}" placeholder="05xx xxx xx xx">
      <label for="p-ig">Instagram kullanıcı adı</label><input id="p-ig" name="instagram" maxlength="60" value="${esc(s.instagram)}" placeholder="@kullaniciadi">
      <button class="btn">Bilgileri kaydet</button></form>
      <p class="${s.lat != null ? 'okc' : 'mut'}" style="margin-top:16px">${s.lat != null ? 'Konum kaydedildi. Müşteriler mesafeyi ve yol tarifini görebilir.' : 'Konum kaydedilmedi. Dükkandayken aşağıdaki düğmeye dokun.'}</p>
      <button class="btn sec" data-act="locate" data-v="">Dükkanın konumunu bu telefondan al</button></section>

    <section class="card" id="s-photos"><h2 style="margin-top:0">Fotoğraflar</h2>
      <p class="mut">En fazla 8 fotoğraf. Dükkanın içi, koltuklar ve yaptığın kesimler iyi sonuç verir.</p>
      <div class="pics">${(s.photos || []).map((p, i) => `<div class="pic-edit"><img src="${esc(api.photoUrl(p))}" alt="Dükkan fotoğrafı ${i + 1}" loading="lazy"><button class="sm" data-act="photo-del" data-v="${esc(p)}" data-two="1">Kaldır</button></div>`).join('')}</div>
      ${(s.photos || []).length < 8 ? '<label for="photo-in">Fotoğraf ekle</label><input id="photo-in" type="file" accept="image/jpeg,image/png,image/webp" multiple>' : ''}</section>

    <section class="card" id="s-staff"><h2 style="margin-top:0">Personel ve hizmetler</h2>
      <p class="mut">Her personelin fiyatı ve süresi ayrı girilir. Süre, randevu saatlerinin hesaplanmasında kullanılır.</p>
      ${staffHtml}
      <form data-form="staff-add" class="svc-row" novalidate><h3>Yeni personel</h3>
        <label for="ns-name">Ad</label><input id="ns-name" name="name" required minlength="2" maxlength="60">
        <label for="ns-title">Unvan</label><input id="ns-title" name="title" maxlength="30" value="Usta">
        <button class="btn sec">Personel ekle</button></form></section>

    <section class="card" id="s-hours"><h2 style="margin-top:0">Çalışma saatleri</h2><form data-form="hours" novalidate>${hours}
      <label for="h-slot">Randevu aralığı</label><select id="h-slot" name="slot">${[15, 30, 60].map((g) => `<option value="${g}" ${g === s.slot_minutes ? 'selected' : ''}>${g} dakikada bir</option>`).join('')}</select>
      <button class="btn">Saatleri kaydet</button></form></section>

    <section class="card" id="s-pricing"><h2 style="margin-top:0">Yoğun gün fiyatı</h2><form data-form="pricing" novalidate>
      <label class="chk"><input type="checkbox" name="auto" ${s.auto_pricing ? 'checked' : ''}>Yoğun günlerde otomatik fiyat farkı uygula</label>
      <div class="two"><div><label for="pr-th">Günlük randevu eşiği</label><input id="pr-th" name="threshold" type="number" inputmode="numeric" min="1" max="200" value="${s.surge_threshold}"></div>
      <div><label for="pr-pc">Fark (%)</label><input id="pr-pc" name="percent" type="number" inputmode="numeric" min="0" max="50" value="${s.surge_percent}"></div></div>
      <p class="hint">Bir günde bu sayıdan fazla randevu olunca o günün yeni randevularına fark eklenir. Müşteri fiyatı onaydan önce görür.</p>
      <button class="btn">Kaydet</button></form></section>

    <section class="card" id="s-rules"><h2 style="margin-top:0">Sadakat ve kurallar</h2><form data-form="rules" novalidate>
      <div class="two"><div><label for="l-t">Sadakat kartı</label><select id="l-t" name="loyalty_target"><option value="0">Kapalı</option>${[5, 6, 8, 10, 12, 15].map((n) => `<option value="${n}" ${s.loyalty_target === n ? 'selected' : ''}>Her ${n}. ziyaret</option>`).join('')}</select></div>
      <div><label for="l-r">Ödül</label><input id="l-r" name="loyalty_reward" maxlength="60" value="${esc(s.loyalty_reward || '')}" placeholder="Örn. Saç bedava"></div></div>
      <p class="hint">"Geldi" işaretlenen her randevu bir damga sayılır. Müşteri damgalarını Randevularım ekranında görür; ödül sırası gelince randevu kartında yazar.</p>
      <label for="l-w">"Zamanı gelenler" listesi</label><select id="l-w" name="rebook_weeks">${[2, 3, 4, 5, 6, 8].map((n) => `<option value="${n}" ${(s.rebook_weeks || 4) === n ? 'selected' : ''}>${n} haftadır gelmeyenler</option>`).join('')}</select>
      <label for="l-n">Gelmeyen müşteri</label><select id="l-n" name="noshow_limit"><option value="0" ${s.noshow_limit === 0 ? 'selected' : ''}>Engelleme yok</option>${[1, 2, 3].map((n) => `<option value="${n}" ${s.noshow_limit === n ? 'selected' : ''}>${n} kez gelmeyen online randevu alamasın</option>`).join('')}</select>
      <p class="hint">Son 6 ayda bu kadar kez "Gelmedi" işaretlenen numara, online randevu yerine dükkanı aramaya yönlendirilir. Sen elle randevu vermeye devam edebilirsin.</p>
      <label for="l-g">Google yorum linkin</label><input id="l-g" name="google_review_url" type="url" inputmode="url" maxlength="300" value="${esc(s.google_review_url || '')}" placeholder="https://g.page/r/...">
      <p class="hint">Google Haritalar'da dükkanını aç, "Yorum yaz" bağlantısını paylaş ve buraya yapıştır. 4 ya da 5 yıldız veren müşteriye "Google'da da yazar mısın?" diye sorulur.</p>
      <button class="btn">Kaydet</button></form></section>

    <section class="card" id="s-reviews"><h2 style="margin-top:0">Yorumlar</h2>${rv ? `<ul class="plain">${rv}</ul>` : '<p class="mut">Henüz yorum yok. Müşteri, randevusu "Geldi" olarak işaretlenince yorum yazabilir.</p>'}</section>

    <section class="card" id="s-account"><h2 style="margin-top:0">Hesap</h2>
      <p class="mut">${esc((api.session && api.session.user && api.session.user.email) || '')}</p>
      <button class="btn sec" data-act="logout" data-v="">Çıkış yap</button>
      <details style="margin-top:14px"><summary>Hesabımı sil</summary>
        <form data-form="delete-account" novalidate><p>Dükkanın, personelin, hizmetlerin, randevu kayıtların, yorumların ve fotoğrafların kalıcı olarak silinir. Bu geri alınamaz.</p>
        <label for="del-c">Onaylamak için SİL yaz</label><input id="del-c" name="c" autocomplete="off">
        <button class="btn red">Hesabımı kalıcı olarak sil</button></form></details>
      <p><a href="gizlilik.html" target="_blank" rel="noopener">Gizlilik politikası</a></p></section>`;
  }

  // ===================================================================
  // Yönetim (platform sahibi): dükkan onayı
  // ===================================================================
  function adminHtml() {
    const rows = S.adminRows || [];
    const pend = rows.filter((r) => r.pending);
    const act = rows.filter((r) => r.is_active);
    const rej = rows.filter((r) => !r.is_active && !r.pending);
    const card = (r) => {
      const text = `Merhaba ${(r.owner_name || '').split(' ')[0]}, ${APP} uygulamasına ${r.name} adıyla dükkan başvurusu yaptın. Berber olduğunu teyit etmek için yazıyoruz.`;
      return `<li class="card"><div class="row"><h3>${esc(r.name)}</h3><span class="badge ${r.is_active ? 'st-completed' : r.pending ? 'st-confirmed' : 'st-cancelled'}">${r.is_active ? 'Yayında' : r.pending ? 'Onay bekliyor' : 'Reddedildi'}</span></div>
        <p class="mut">${esc([r.address, r.district].filter(Boolean).join(', ') || 'Adres girilmedi')}, başvuru ${esc(dLabel(dateOf(r.created_at), { day: 'numeric', month: 'long' }))}</p>
        <p><b>${esc(r.owner_name || 'Ad girilmedi')}</b>${r.owner_phone ? `, ${esc(fmtPhone(r.owner_phone))}` : ', <span class="hot">telefon girilmedi</span>'}${r.email ? `<br><span class="mut">${esc(r.email)}</span>` : ''}</p>
        <p class="mut">${r.staff_count} personel, ${r.service_count} hizmet, ${r.appt_count} randevu${r.review_note ? `. Not: ${esc(r.review_note)}` : ''}</p>
        <div class="acts">
          ${r.owner_phone ? `<a class="sm" href="tel:0${esc(r.owner_phone)}">Ara</a><a class="sm" href="${esc(waLink(r.owner_phone, text))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
          ${r.is_active ? '' : `<button class="sm pri" data-act="admin-ok" data-v="${r.id}">Onayla</button>`}
        </div>
        ${r.is_active || r.pending ? `<form data-form="admin-no" class="svc-row" novalidate><input type="hidden" name="id" value="${r.id}">
          <label for="an-${r.id}">${r.is_active ? 'Yayından kaldırma nedeni' : 'Reddetme nedeni'} (berber görür)</label><input id="an-${r.id}" name="note" maxlength="200">
          <button class="sm" style="margin-top:8px">${r.is_active ? 'Yayından kaldır' : 'Reddet'}</button></form>` : ''}</li>`;
    };
    return `<h1>Yönetim</h1>
      <p class="mut">Yeni dükkanlar sen onaylayana kadar müşterilere görünmez. Onaylamadan önce berberi arayıp teyit et.</p>
      <h2>Onay bekleyenler (${pend.length})</h2><ul class="plain">${pend.map(card).join('') || '<li class="card mut">Bekleyen başvuru yok.</li>'}</ul>
      <h2>Yayında (${act.length})</h2><ul class="plain">${act.map(card).join('') || '<li class="card mut">Henüz yok.</li>'}</ul>
      ${rej.length ? `<h2>Reddedilenler (${rej.length})</h2><ul class="plain">${rej.map(card).join('')}</ul>` : ''}`;
  }

  // ===================================================================
  // Görünüm tablosu
  // ===================================================================
  const VIEWS = {
    async discover(r, force) { await loadDiscover(force); return discoverHtml(); },
    async shop(r, force) { await loadShop(r.slug, force); return shopHtml(r); },
    async book(r, force) {
      await loadShop(r.slug, force);
      if (S.bk.slug !== r.slug) {
        resetBooking(r.slug);
        const hrs = S.shops[r.slug].shop.hours || {};
        const open = bkDays().findIndex((d) => Array.isArray(hrs[String(dowOf(d))]));
        S.bk.day = open < 0 ? 0 : open;
      }
      const { staff, services } = S.shops[r.slug];
      // "Aynısını tekrar al": usta ya da hizmet artık yoksa seçimi sıfırla
      if (S.bk.staff && !staff.some((st) => st.id === S.bk.staff && st.active !== false)) { S.bk.staff = null; S.bk.svc = null; }
      if (S.bk.svc && !services.some((v) => v.id === S.bk.svc && v.staff_id === S.bk.staff)) S.bk.svc = null;
      const bookable = staff.filter((st) => services.some((v) => v.staff_id === st.id));
      if (!S.bk.staff && bookable.length === 1) S.bk.staff = bookable[0].id;
      if (S.bk.staff && !S.bk.svc) { const sv = services.filter((v) => v.staff_id === S.bk.staff); if (sv.length === 1) S.bk.svc = sv[0].id; }
      if (S.bk.svc && !S.bk.done && (force || S.bk.slots == null || S.bk.slotsKey !== `${S.bk.staff}|${S.bk.svc}|${S.bk.day}`)) await loadSlotsAuto();
      return bookHtml(r);
    },
    async mine() { await loadMine(); return mineHtml(); },
    async barber(r, force) {
      if (r.tab === 'sifre') return api.session ? passwordHtml() : authHtml();
      if (!api.session) return authHtml();
      await loadMyShop(force);
      if (r.tab === 'yonetim') {
        if (!S.my.isAdmin) throw new AppError('NOT_ADMIN');
        await loadAdmin();
        return S.my.shop ? barberShell('yonetim', adminHtml()) : adminHtml();
      }
      if (!S.my.shop) return onboardHtml();
      if (isStaff()) { await loadToday(); return barberShell('bugun', todayHtml()); }
      if (r.tab === 'musteriler') { await loadCustomers(); return barberShell('musteriler', customersHtml()); }
      if (r.tab === 'rapor') { await loadReport(); return barberShell('rapor', reportHtml()); }
      if (r.tab === 'ayarlar') { await loadSettings(); return barberShell('ayarlar', settingsHtml()); }
      await loadToday();
      return barberShell('bugun', todayHtml());
    },
  };
  const VIEWS_SYNC = {
    discover: () => discoverHtml(),
    shop: (r) => shopHtml(r),
    book: (r) => bookHtml(r),
    mine: () => mineHtml(),
    barber: (r) => {
      if (r.tab === 'sifre') return passwordHtml();
      if (!api.session) return authHtml();
      if (r.tab === 'yonetim' && S.my && S.my.isAdmin) return S.my.shop ? barberShell('yonetim', adminHtml()) : adminHtml();
      if (!S.my || !S.my.shop) return onboardHtml();
      if (isStaff()) return barberShell('bugun', todayHtml());
      if (r.tab === 'musteriler') return barberShell('musteriler', customersHtml());
      if (r.tab === 'rapor') return barberShell('rapor', reportHtml());
      if (r.tab === 'ayarlar') return barberShell('ayarlar', settingsHtml());
      return barberShell('bugun', todayHtml());
    },
  };

  // ===================================================================
  // Etkileşimler
  // ===================================================================
  function twoStep(btn) {
    if (btn.dataset.armed === '1') { clearTimeout(twoStep.t); btn.dataset.armed = ''; return true; }
    $$('[data-armed="1"]').forEach((b) => { b.dataset.armed = ''; b.textContent = b.dataset.label; });
    btn.dataset.label = btn.textContent;
    btn.dataset.armed = '1';
    btn.textContent = 'Emin misin? Tekrar dokun';
    clearTimeout(twoStep.t);
    twoStep.t = setTimeout(() => { if (btn.dataset.armed === '1') { btn.dataset.armed = ''; btn.textContent = btn.dataset.label; } }, 5000);
    toast('Onaylamak için aynı düğmeye tekrar dokun.');
    return false;
  }
  async function busy(el, fn) {
    if (el.disabled || el.dataset.busy) return;
    el.dataset.busy = '1';
    const wasDisabled = el.disabled;
    if ('disabled' in el) el.disabled = true;
    try { await fn(); } catch (e) { fail(e); } finally {
      if (el.isConnected) { delete el.dataset.busy; if ('disabled' in el) el.disabled = wasDisabled; }
    }
  }
  function geo() {
    return new Promise((ok, no) => {
      if (!navigator.geolocation) { no(new Error('yok')); return; }
      navigator.geolocation.getCurrentPosition((p) => ok([p.coords.latitude, p.coords.longitude]), no, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    });
  }
  async function resize(file, max = 1280) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
      if (!blob) throw new AppError('UPLOAD');
      return blob;
    } catch (e) { throw e instanceof AppError ? e : new AppError('UPLOAD'); } finally { URL.revokeObjectURL(url); }
  }
  async function refreshMy(what = 'shop') {
    if (what === 'shop') await loadMyShop(true);
    const t = S.route.tab;
    if (isStaff()) await loadToday();
    else if (t === 'ayarlar') await loadSettings();
    else if (t === 'musteriler') await loadCustomers();
    else if (t === 'rapor') await loadReport();
    else await loadToday();
    redraw();
  }

  const ACTS = {
    reload: () => render({ force: true }),
    refresh: () => render({ force: true }),
    fav(btn) {
      const id = btn.dataset.v;
      const f = favs();
      const on = !f.includes(id);
      store.set('rv_fav', on ? [...f, id] : f.filter((x) => x !== id));
      toast(on ? 'Favorilere eklendi. Bu dükkan listenin başında görünecek.' : 'Favorilerden çıkarıldı.');
      redraw();
    },
    sort(btn) { S.sort = btn.dataset.v; store.set('rv_sort', S.sort); redraw(); },
    gps: (btn) => busy(btn, async () => {
      try { const c = await geo(); S.loc = { name: 'Konumum', c }; store.set('rv_loc', S.loc); S.sort = 'near'; redraw(); toast('Konumun alındı. En yakın dükkanlar üstte.'); }
      catch { toast('Konum alınamadı. Konum iznini aç ya da listeden semt seç.', true); }
    }),
    'pick-staff': (btn) => { const b = S.bk; if (b.hold) releaseHold(); b.staff = btn.dataset.v; b.svc = null; b.slots = null; const sv = S.shops[b.slug].services.filter((v) => v.staff_id === b.staff); if (sv.length === 1) { b.svc = sv[0].id; slotsThenDraw(); } else redraw(); },
    'pick-svc': (btn) => { const b = S.bk; if (b.hold) releaseHold(); b.svc = btn.dataset.v; slotsThenDraw(); },
    'pick-day': (btn) => { const b = S.bk; if (b.hold) releaseHold(); b.day = Number(btn.dataset.v); b.autoDay = false; slotsThenDraw(); },
    'pick-slot': (btn) => busy(btn, async () => {
      const b = S.bk;
      if (b.hold) releaseHold();
      const { shop } = S.shops[b.slug];
      try {
        const h = await api.rpc('create_hold', { p_shop: shop.id, p_staff: b.staff, p_service: b.svc, p_starts_at: btn.dataset.v });
        b.slot = btn.dataset.v;
        b.hold = { id: h.hold_id, at: btn.dataset.v, exp: Date.now() + 300000, price: h.price, base: h.base_price, surge: h.surge };
        redraw();
        const hh = $('#h-hold');
        if (hh) { hh.focus({ preventScroll: true }); hh.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      } catch (e) {
        fail(e);
        if (e.code === 'SLOT_TAKEN') { await loadSlots(); redraw(); }
      }
    }),
    'new-bk': () => { S.bk.slug = null; render({ force: true }); },
    rebook: (btn) => {
      const x = (S.extras || {})[btn.dataset.v];
      if (!x) return;
      resetBooking(x.shop_slug);
      Object.assign(S.bk, { staff: x.staff_id, svc: x.service_id });
      go(`#/b/${x.shop_slug}/randevu`);
    },
    'g-dismiss': () => { S.gAsk = null; redraw(); },
    rp: (btn) => { S.my.rp = Number(btn.dataset.v); redraw(); },
    'contact-pick': async (btn) => {
      const pre = btn.dataset.v;
      try {
        const [c] = await navigator.contacts.select(['name', 'tel'], { multiple: false });
        if (!c) return;
        const nm = (c.name || [])[0] || '';
        const tel = (c.tel || []).map(normPhone).find(Boolean) || '';
        if (nm && $(`#${pre}-name`)) $(`#${pre}-name`).value = nm.slice(0, 60);
        if ($(`#${pre}-phone`)) $(`#${pre}-phone`).value = tel ? fmtPhone(tel) : '';
        if (!tel && (c.tel || []).length) toast('Rehberdeki numara cep telefonu değil, telefon alanını boş bıraktım.', true);
      } catch { /* kullanıcı vazgeçti */ }
    },
    'pkg-use': (btn) => busy(btn, async () => {
      const p = (S.my.packages || []).find((x) => x.id === btn.dataset.v);
      if (!p || p.used >= p.total) return;
      await api.patch('customer_packages', `id=eq.${p.id}`, { used: p.used + 1 });
      await refreshMy('day');
      toast(`${p.title}: 1 hak kullanıldı, ${p.total - p.used - 1} hak kaldı.`);
    }),
    'pkg-del': (btn) => { if (!twoStep(btn)) return; busy(btn, async () => { await api.del('customer_packages', `id=eq.${btn.dataset.v}`); await refreshMy('day'); toast('Paket silindi.'); }); },
    'series-cancel': (btn) => {
      if (!twoStep(btn)) return;
      busy(btn, async () => {
        const a = S.my.appts.find((x) => x.id === btn.dataset.v);
        const rows = await api.patch('appointments', `series_id=eq.${a.series_id}&starts_at=gt.${q(a.starts_at)}&status=eq.confirmed`, { status: 'cancelled' });
        await refreshMy('day');
        toast(`Sonraki ${rows.length} tekrar iptal edildi. Bu randevu duruyor.`);
      });
    },
    'staff-invite': (btn) => busy(btn, async () => { await api.rpc('staff_invite', { p_staff: btn.dataset.v }); await refreshMy(); toast('Davet kodu hazır. WhatsApp ile ustana gönder.'); }),
    'staff-unlink': (btn) => { if (!twoStep(btn)) return; busy(btn, async () => { await api.del('staff_accounts', `staff_id=eq.${btn.dataset.v}`); await refreshMy(); toast('Ustanın hesap bağlantısı kaldırıldı.'); }); },
    'slot-pick': (btn) => {
      const [staff, t] = btn.dataset.v.split('|');
      S.my.pick = { staff, t: Number(t) };
      redraw();
      const h = $('#q-h');
      if (h) { h.focus({ preventScroll: true }); h.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    },
    'pick-cancel': () => { const t = S.my.pick; S.my.pick = null; redraw(); const b = t && $(`[data-act="slot-pick"][data-v="${t.staff}|${t.t}"]`); if (b) b.focus(); },
    'goto-appt': (btn) => { const el = $(`#appt-${btn.dataset.v}`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.focus({ preventScroll: true }); } },
    unblock: (btn) => busy(btn, async () => { await api.del('appointments', `id=eq.${btn.dataset.v}`); await refreshMy('day'); toast('Saat açıldı, müşteriler yeniden alabilir.'); }),
    'admin-ok': (btn) => busy(btn, async () => { await api.rpc('admin_review_shop', { p_shop: btn.dataset.v, p_approve: true, p_note: null }); await loadAdmin(); S.disc = null; redraw(); toast('Dükkan onaylandı, artık müşterilere görünüyor.'); }),
    release: () => { releaseHold(); redraw(); const h = $('#h-slot'); if (h) h.scrollIntoView({ block: 'start' }); },
    'cancel-bk': (btn) => { if (!twoStep(btn)) return; busy(btn, async () => { await api.rpc('cancel_booking', { p_token: btn.dataset.v }); S.disc = null; await loadMine(); redraw(); toast('Randevun iptal edildi.'); }); },
    'auth-tab': (el, ev) => { ev.preventDefault(); S.authTab = el.dataset.v; redraw(); const f = $('#a-email') || $('#r-email'); if (f) f.focus(); },
    logout: (btn) => busy(btn, async () => { await api.signOut(); S.my = null; S.authTab = 'login'; toast('Çıkış yapıldı.'); go('#/berber'); }),
    accepting: (btn) => busy(btn, async () => {
      const on = !S.my.shop.accepting;
      const [row] = await api.patch('shops', `id=eq.${S.my.shop.id}`, { accepting: on });
      S.my.shop = { ...S.my.shop, ...row };
      S.disc = null;
      toast(on ? 'Online randevu açıldı.' : 'Online randevu kapatıldı. Müşteriler yeni randevu alamaz.');
      redraw();
    }),
    day: (btn) => busy(btn, async () => { const v = Number(btn.dataset.v); S.my.day = v === 0 ? today() : addDays(S.my.day, v); S.my.pick = null; await loadToday(); redraw(); }),
    st: (btn) => {
      if (btn.dataset.two && !twoStep(btn)) return;
      busy(btn, async () => {
        const k = btn.dataset.k;
        await api.patch('appointments', `id=eq.${btn.dataset.v}`, { status: k });
        await refreshMy('day');
        toast(k === 'completed' ? 'Geldi olarak işaretlendi.' : k === 'no_show' ? 'Gelmedi olarak işaretlendi.' : 'Randevu iptal edildi.');
      });
    },
    seat: (btn) => busy(btn, async () => {
      const w = S.my.walkins.find((x) => x.id === btn.dataset.v);
      const sv = svcOf(w.service_id);
      const now = new Date();
      now.setSeconds(0, 0);
      await api.insert('appointments', [{ shop_id: S.my.shop.id, staff_id: w.staff_id, service_id: w.service_id, service_name: sv ? sv.name : 'Hizmet', customer_name: w.name, customer_phone: w.phone || '', starts_at: now.toISOString(), ends_at: new Date(now.getTime() + (sv ? sv.duration : 30) * 60000).toISOString(), base_price: sv ? sv.price : 0, price: sv ? sv.price : 0, status: 'completed', source: 'walkin' }]);
      await api.del('walkins', `id=eq.${w.id}`);
      await refreshMy('day');
      toast(`${w.name} koltuğa alındı ve kazanca eklendi.`);
    }),
    unqueue: (btn) => busy(btn, async () => { await api.del('walkins', `id=eq.${btn.dataset.v}`); await refreshMy('day'); }),
    'wl-notify': (el) => { api.patch('waitlist', `id=eq.${el.dataset.v}`, { status: 'notified' }).then(() => refreshMy('day')).catch(() => {}); },
    'wl-del': (btn) => busy(btn, async () => { await api.del('waitlist', `id=eq.${btn.dataset.v}`); await refreshMy('day'); }),
    'copy-link': async () => {
      const link = shopLink(S.my.shop.slug);
      try { await navigator.clipboard.writeText(link); toast('Link kopyalandı.'); }
      catch { const el = $('#shop-link'); const rg = document.createRange(); rg.selectNodeContents(el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg); toast('Link seçildi, kopyala diyebilirsin.'); }
    },
    locate: (btn) => busy(btn, async () => {
      let c;
      try { c = await geo(); } catch { toast('Konum alınamadı. Telefonun konum iznini açıp tekrar dene.', true); return; }
      await api.patch('shops', `id=eq.${S.my.shop.id}`, { lat: c[0], lng: c[1] });
      S.disc = null;
      await refreshMy();
      toast('Dükkanın konumu kaydedildi.');
    }),
    'photo-del': (btn) => {
      if (!twoStep(btn)) return;
      busy(btn, async () => {
        const path = btn.dataset.v;
        await api.removeFiles([path]).catch(() => {});
        await api.patch('shops', `id=eq.${S.my.shop.id}`, { photos: (S.my.shop.photos || []).filter((p) => p !== path) });
        S.disc = null;
        await refreshMy();
        toast('Fotoğraf kaldırıldı.');
      });
    },
    'staff-active': (btn) => busy(btn, async () => {
      const st = S.my.staff.find((x) => x.id === btn.dataset.v);
      await api.patch('staff', `id=eq.${st.id}`, { active: !st.active });
      S.disc = null;
      await refreshMy();
      toast(st.active ? `${st.name} pasif yapıldı, müşteriler seçemez.` : `${st.name} aktif.`);
    }),
  };
  function slotsThenDraw() {
    S.bk.slots = null;
    redraw();
    loadSlotsAuto().then(redraw, (e) => { fail(e); S.bk.slots = []; redraw(); });
  }

  const FORMS = {
    async confirm(d, form) {
      const b = S.bk;
      const phone = normPhone(d.phone);
      if (String(d.name || '').trim().length < 2) throw new AppError('NAME_INVALID');
      if (!phone) throw new AppError('PHONE_INVALID');
      if (!b.hold) throw new AppError('HOLD_EXPIRED');
      const { shop, staff, services } = S.shops[b.slug];
      const res = await api.rpc('confirm_booking', { p_hold: b.hold.id, p_name: d.name.trim(), p_phone: phone });
      if (d.remember) store.set('rv_me', { name: d.name.trim(), phone }); else store.del('rv_me');
      store.set('rv_tokens', [{ token: res.token, slug: shop.slug, at: res.starts_at }, ...tokens()].slice(0, 50));
      const st = staff.find((x) => x.id === b.staff);
      const sv = services.find((x) => x.id === b.svc);
      b.done = { at: res.starts_at, price: res.price, surge: res.surge, staff: st ? st.name : '', svc: sv ? sv.name : '', mins: sv ? sv.duration : 30 };
      b.hold = null; b.slot = null; b.slots = null;
      S.disc = null;
      clearInterval(tickHold.t);
      paint(VIEWS_SYNC.book(S.route), { focus: true });
      after(S.route);
      window.scrollTo(0, 0);
      void form;
    },
    async waitlist(d) {
      const b = S.bk;
      const phone = normPhone(d.phone);
      if (String(d.name || '').trim().length < 2) throw new AppError('NAME_INVALID');
      if (!phone) throw new AppError('PHONE_INVALID');
      await api.rpc('join_waitlist', { p_shop: S.shops[b.slug].shop.id, p_staff: b.staff, p_service: b.svc, p_day: bkDays()[b.day], p_name: d.name.trim(), p_phone: phone });
      store.set('rv_me', { name: d.name.trim(), phone });
      toast('Bekleme listesine eklendin. Saat boşalırsa dükkan sana haber verebilir.');
    },
    async review(d) {
      await api.rpc('add_review', { p_token: d.token, p_rating: Number(d.rating), p_body: String(d.body || '').trim() });
      const x = (S.extras || {})[d.token];
      const a = (S.mine || []).find((y) => y.token === d.token);
      if (Number(d.rating) >= 4 && x && x.google_review_url) S.gAsk = { url: x.google_review_url, name: a ? a.shop_name : '' };
      Object.keys(S.shops).forEach((k) => { S.shops[k].at = 0; });
      await loadMine();
      redraw();
      toast('Yorumun yayınlandı. Teşekkürler!');
    },
    async login(d) {
      if (!d.email || !d.password) throw new AppError('BAD_LOGIN');
      await api.signIn(d.email.trim(), d.password);
      S.my = null;
      toast('Giriş yapıldı.');
      render({ force: true });
    },
    async signup(d) {
      if (String(d.password || '').length < 8) throw new AppError('WEAK_PASSWORD');
      const r = await api.signUp(String(d.email || '').trim(), d.password);
      if (r && r.access_token) { S.my = null; toast('Hesabın oluşturuldu.'); render({ force: true }); }
      else { S.authTab = 'login'; redraw(); toast('Hesabın oluşturuldu. E-postana gelen bağlantıya dokun, sonra giriş yap.'); }
    },
    async recover(d) {
      await api.recover(String(d.email || '').trim());
      toast('Sıfırlama bağlantısı gönderildi. Gelmezse bize yaz: ' + (CFG.contactEmail || ''));
      S.authTab = 'login';
      redraw();
    },
    async newpass(d) {
      if (String(d.password || '').length < 8) throw new AppError('WEAK_PASSWORD');
      await api.setPassword(d.password);
      toast('Şifren güncellendi.');
      go('#/berber');
    },
    async onboard(d) {
      const name = String(d.name || '').trim();
      if (name.length < 2) throw new AppError('NAME_INVALID');
      const owner = String(d.owner_name || '').trim();
      if (owner.length < 2) throw new AppError('OWNER_NAME_INVALID');
      const mobile = normPhone(d.owner_phone);
      if (!mobile) throw new AppError('PHONE_INVALID');
      const phone = d.phone ? normAnyPhone(d.phone) : '';
      if (d.phone && !phone) throw new AppError('SHOP_PHONE_INVALID');
      const c = PLACES[d.district];
      const row = { owner_id: api.uid(), name, slug: `${slugify(name)}-${rand4()}`, district: d.district || '', phone, lat: c ? c[0] : null, lng: c ? c[1] : null };
      let created;
      try { [created] = await api.insert('shops', [row]); } catch (e) {
        if (e.code !== 'DUPLICATE') throw e;
        row.slug = `${slugify(name)}-${rand4()}`;
        try { [created] = await api.insert('shops', [row]); } catch (e2) { if (e2.code !== 'DUPLICATE') throw e2; }
      }
      if (!created) { await loadMyShop(true); created = S.my.shop; }
      if (created) await api.upsert('shop_contacts', [{ shop_id: created.id, owner_name: owner, owner_phone: mobile }], 'shop_id').catch(fail);
      S.disc = null;
      await loadMyShop(true);
      go('#/berber/ayarlar');
      toast('Dükkanın oluşturuldu ve onaya gönderildi. Bu sırada personel ve hizmetlerini ekle.');
    },
    async claim(d) {
      const code = String(d.code || '').replace(/\s/g, '');
      if (code.length < 6) throw new AppError('INVITE_INVALID');
      const res = await api.rpc('claim_staff', { p_code: code });
      S.my = null;
      await loadMyShop(true);
      go('#/berber');
      toast(`${res.shop} ekibine ${res.staff} olarak katıldın.`);
    },
    async rules(d) {
      const url = String(d.google_review_url || '').trim();
      if (url && !/^https:\/\/\S+$/.test(url)) { toast('Google linki https:// ile başlamalı.', true); return; }
      await api.patch('shops', `id=eq.${S.my.shop.id}`, {
        loyalty_target: Number(d.loyalty_target) || 0,
        loyalty_reward: String(d.loyalty_reward || '').trim().slice(0, 60),
        rebook_weeks: Number(d.rebook_weeks) || 4,
        noshow_limit: Number(d.noshow_limit) || 0,
        google_review_url: url,
      });
      S.disc = null;
      Object.keys(S.shops).forEach((k) => { S.shops[k].at = 0; });
      await refreshMy();
      toast('Sadakat ve kurallar kaydedildi.');
    },
    async 'pkg-add'(d) {
      const title = String(d.title || '').trim();
      const total = Math.round(Number(d.total));
      if (title.length < 2) { toast('Paket adını yaz.', true); return; }
      if (!(total >= 1 && total <= 100)) { toast('Hak sayısını 1 ile 100 arasında yaz.', true); return; }
      await api.insert('customer_packages', [{ shop_id: S.my.shop.id, ckey: d.k, customer_name: String(d.name || '').slice(0, 60) || 'Müşteri', title, total }]);
      await refreshMy('day');
      toast(`${title} paketi eklendi.`);
    },
    async contact(d) {
      const owner = String(d.owner_name || '').trim();
      if (owner.length < 2) throw new AppError('OWNER_NAME_INVALID');
      const mobile = normPhone(d.owner_phone);
      if (!mobile) throw new AppError('PHONE_INVALID');
      await api.upsert('shop_contacts', [{ shop_id: S.my.shop.id, owner_name: owner, owner_phone: mobile, updated_at: new Date().toISOString() }], 'shop_id');
      await refreshMy();
      toast('Doğrulama bilgilerin kaydedildi.');
    },
    async quick(d, form, submitter) {
      const m = S.my;
      const t = Number(d.t);
      const who = staffName(d.staff);
      const block = submitter && submitter.value === 'block';
      const sv = block ? null : svcOf(d.svc);
      if (!block && !sv) { toast('Hizmet seç.', true); return; }
      const phone = d.phone ? normPhone(d.phone) : '';
      if (!block && d.phone && !phone) throw new AppError('PHONE_INVALID');
      const name = block ? 'Kapalı' : String(d.name || '').trim() || 'Dükkan müşterisi';
      const every = Number(d.rep) || 0;
      const times = every ? Math.min(12, Number(d.cnt) || 4) : 1;
      const series = every ? newId() : null;
      const mins = block ? (m.shop.slot_minutes || 30) : sv.duration;
      const ok = [];
      const missed = [];
      for (let i = 0; i < times; i += 1) {
        const day = addDays(m.day, i * every * 7);
        const startsAt = at(day, minLabel(t));
        const row = block
          ? { shop_id: m.shop.id, staff_id: d.staff, service_name: 'Kapalı', customer_name: 'Kapalı', kind: 'block', price: 0, base_price: 0 }
          : { shop_id: m.shop.id, staff_id: d.staff, service_id: sv.id, service_name: sv.name, customer_name: name, customer_phone: phone || '', base_price: sv.price, price: sv.price };
        Object.assign(row, { starts_at: startsAt.toISOString(), ends_at: new Date(startsAt.getTime() + mins * 60000).toISOString(), status: 'confirmed', source: 'barber' });
        if (series) row.series_id = series;
        if (i > 0 && !Array.isArray((m.shop.hours || {})[String(dowOf(day))])) { missed.push(`${dLabel(day, { day: 'numeric', month: 'long' })} (kapalı)`); continue; }
        try { await api.insert('appointments', [row]); ok.push(day); } catch (e) {
          if (e.code !== 'SLOT_TAKEN') throw e;
          if (i === 0) {
            toast(block ? `${who} bu saatte dolu.` : `${who} için ${sv.duration} dakikalık süre sonraki randevuyla çakışıyor. Başka saat seç.`, true);
            return;
          }
          missed.push(`${dLabel(day, { day: 'numeric', month: 'long' })} (dolu)`);
        }
      }
      m.pick = null;
      await refreshMy('day');
      const base = block ? `${minLabel(t)} ${who} için kapatıldı. Müşteriler bu saati alamaz.` : `${minLabel(t)} ${who}: ${name} eklendi. Müşteriler bu saati alamaz.`;
      toast(every ? `${base} ${ok.length} tekrar eklendi${missed.length ? `; eklenemeyen: ${missed.join(', ')}` : ''}.` : base, missed.length > 0);
    },
    async 'admin-no'(d) {
      await api.rpc('admin_review_shop', { p_shop: d.id, p_approve: false, p_note: String(d.note || '').trim() || null });
      await loadAdmin();
      S.disc = null;
      redraw();
      toast('Dükkan müşterilere kapatıldı.');
    },
    async 'add-appt'(d, form) {
      const m = S.my;
      const [staffId, svcId] = String(d.svc || '').split('|');
      const name = String(d.name || '').trim();
      if (!name) throw new AppError('NAME_INVALID');
      const phone = d.phone ? normPhone(d.phone) : '';
      if (d.phone && !phone) throw new AppError('PHONE_INVALID');
      await api.insert('walkins', [{ shop_id: m.shop.id, staff_id: staffId, service_id: svcId, name, phone: phone || '' }]);
      form.reset();
      await refreshMy('day');
      toast(`${name} sıraya eklendi.`);
    },
    async note(d) {
      await api.upsert('customer_notes', [{ shop_id: S.my.shop.id, ckey: d.k, note: String(d.note || '').trim(), updated_at: new Date().toISOString() }], 'shop_id,ckey');
      S.my.notes[d.k] = String(d.note || '').trim();
      toast('Not kaydedildi.');
    },
    async profile(d) {
      const name = String(d.name || '').trim();
      if (name.length < 2) throw new AppError('NAME_INVALID');
      const phone = d.phone ? normAnyPhone(d.phone) : '';
      if (d.phone && !phone) throw new AppError('SHOP_PHONE_INVALID');
      const patch = { name, district: d.district || '', address: String(d.address || '').trim(), phone: phone || '', instagram: String(d.instagram || '').trim().replace(/^@/, '') };
      const c = PLACES[d.district];
      if (S.my.shop.lat == null && c) { patch.lat = c[0]; patch.lng = c[1]; }
      await api.patch('shops', `id=eq.${S.my.shop.id}`, patch);
      S.disc = null;
      await refreshMy();
      toast('Dükkan bilgileri kaydedildi.');
    },
    async 'staff-add'(d, form) {
      const name = String(d.name || '').trim();
      if (name.length < 2) throw new AppError('NAME_INVALID');
      await api.insert('staff', [{ shop_id: S.my.shop.id, name, title: String(d.title || '').trim() || 'Usta' }]);
      form.reset();
      await refreshMy();
      toast(`${name} eklendi. Şimdi ${name} için hizmet ve fiyat ekle.`);
    },
    async staff(d) {
      const name = String(d.name || '').trim();
      if (name.length < 2) throw new AppError('NAME_INVALID');
      await api.patch('staff', `id=eq.${d.id}`, { name, title: String(d.title || '').trim() || 'Usta', commission: Math.max(0, Math.min(100, Number(d.commission) || 0)) });
      await refreshMy();
      toast('Personel kaydedildi.');
    },
    async svc(d, form) {
      const price = Math.round(Number(d.price));
      const duration = Math.round(Number(d.duration));
      if (!(price >= 0 && price <= 100000)) { toast('Fiyatı 0 ile 100.000 ₺ arasında yaz.', true); return; }
      if (!(duration >= 5 && duration <= 480)) { toast('Süreyi 5 ile 480 dakika arasında yaz.', true); return; }
      let done;
      if (d.id) {
        await api.patch('services', `id=eq.${d.id}`, { price, duration, active: !!d.active });
        done = 'Hizmet kaydedildi.';
      } else {
        const name = String(d.name || '').trim();
        if (name.length < 2) { toast('Hizmet adını yaz.', true); return; }
        try { await api.insert('services', [{ staff_id: d.staff, name, price, duration }]); } catch (e) {
          if (e.code === 'DUPLICATE') { toast('Bu personelde bu isimde bir hizmet zaten var.', true); return; }
          throw e;
        }
        done = `${name} eklendi.`;
        form.reset();
      }
      S.disc = null;
      await refreshMy();
      toast(done);
    },
    async hours(d) {
      const hours = {};
      for (const [k, n] of DAYS) {
        if (d[`o${k}`]) {
          if (!d[`a${k}`] || !d[`c${k}`] || d[`a${k}`] >= d[`c${k}`]) { toast(`${n}: açılış saati kapanıştan önce olmalı.`, true); return; }
          hours[k] = [d[`a${k}`], d[`c${k}`]];
        } else hours[k] = null;
      }
      await api.patch('shops', `id=eq.${S.my.shop.id}`, { hours, slot_minutes: Number(d.slot) });
      S.disc = null;
      await refreshMy();
      toast('Çalışma saatleri kaydedildi.');
    },
    async pricing(d) {
      await api.patch('shops', `id=eq.${S.my.shop.id}`, {
        auto_pricing: !!d.auto,
        surge_threshold: Math.max(1, Math.min(200, Number(d.threshold) || 15)),
        surge_percent: Math.max(0, Math.min(50, Number(d.percent) || 0)),
      });
      await refreshMy();
      toast('Fiyat ayarı kaydedildi.');
    },
    async reply(d) {
      const reply = String(d.reply || '').trim();
      await api.patch('reviews', `id=eq.${d.id}`, { reply: reply || null, replied_at: reply ? new Date().toISOString() : null });
      await refreshMy('none');
      toast('Yanıt kaydedildi.');
    },
    async 'delete-account'(d) {
      if (String(d.c || '').trim().toLocaleUpperCase('tr') !== 'SİL') { toast('Onaylamak için kutuya SİL yaz.', true); return; }
      if (S.my && S.my.shop) await api.removeFiles(S.my.shop.photos || []).catch(() => {});
      await api.rpc('delete_my_account');
      api.setSession(null);
      S.my = null; S.disc = null;
      toast('Hesabın ve tüm verilerin silindi.');
      go('#/');
    },
  };

  // Olay yakalama
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || !main.contains(el)) return;
    const fn = ACTS[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'BUTTON') ev.preventDefault();
    fn(el, ev);
  });
  document.addEventListener('submit', (ev) => {
    const form = ev.target;
    const fn = FORMS[form.dataset.form];
    if (!fn) return;
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const btn = ev.submitter || form.querySelector('button:not([type="button"])');
    busy(btn || form, () => fn(d, form, ev.submitter));
  });
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.id === 'loc') { S.loc = { name: t.value, c: PLACES[t.value] || (S.loc && S.loc.c) }; store.set('rv_loc', S.loc); redraw(); }
    else if (t.id === 'photo-in' && t.files && t.files.length) {
      const files = Array.from(t.files).slice(0, Math.max(0, 8 - (S.my.shop.photos || []).length));
      busy(t, async () => {
        toast('Fotoğraflar yükleniyor…');
        const added = [];
        for (const f of files) {
          const blob = await resize(f);
          const path = `${S.my.shop.id}/${Date.now()}-${rand4()}.jpg`;
          await api.upload(path, blob);
          added.push(path);
        }
        await api.patch('shops', `id=eq.${S.my.shop.id}`, { photos: [...(S.my.shop.photos || []), ...added] });
        S.disc = null;
        await refreshMy();
        toast(`${added.length} fotoğraf eklendi.`);
      });
    }
  });
  document.addEventListener('toggle', (ev) => { if (ev.target.id === 'add-box' && S.my) S.my.addOpen = ev.target.open; }, true);
  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.id === 'search') { S.search = t.value; clearTimeout(document.searchT); document.searchT = setTimeout(() => patchList('shop-list'), 120); }
    if (t.id === 'cust-q') { S.custSearch = t.value; clearTimeout(document.custT); document.custT = setTimeout(() => patchList('cust-list'), 120); }
  });

  // Eşitleme: açık ekran arka planda tazelenir (berberin eklediği, müşterinin aldığı randevu herkeste görünsün).
  // Kullanıcı bir şey yazarken, onay beklerken ya da randevu adımındayken ekran bozulmasın diye beklenir.
  function canSync() {
    const r = S.route;
    if (document.hidden || !r || !api.ready() || seq === 0) return false;
    if (r.name === 'book') return false;
    if (r.name === 'barber' && (!api.session || !S.my || (!S.my.shop && r.tab !== 'yonetim') || r.tab === 'ayarlar' || S.my.pick)) return false;
    const ae = document.activeElement;
    if (ae && main.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) return false;
    if ($$('input, textarea', main).some((i) => i.type !== 'hidden' && i.type !== 'checkbox' && i.type !== 'radio' && i.id !== 'search' && i.id !== 'cust-q' && i.value && i.value !== i.defaultValue)) return false;
    if ($('[data-armed="1"]')) return false;
    return true;
  }
  let lastSync = 0;
  function sync() {
    if (!canSync()) return;
    lastSync = Date.now();
    render({ force: true, quiet: true });
  }
  // Yeni sürüm yayınlandıysa açık uygulamayı da yenile (Play'deki uygulama günlerce arka planda açık kalabiliyor)
  let lastVer = 0;
  async function checkVersion() {
    if (Date.now() - lastVer < 60000 || location.protocol !== 'https:') return;
    lastVer = Date.now();
    try {
      const html = await fetch('./index.html', { cache: 'no-store' }).then((res) => (res.ok ? res.text() : ''));
      const live = (html.match(/app\.js\?v=(\d+)/) || [])[1];
      const mine = ((($('script[src*="app.js"]') || {}).src || '').match(/v=(\d+)/) || [])[1];
      if (live && mine && live !== mine && canSync()) location.reload();
    } catch { /* çevrimdışı */ }
  }
  setInterval(sync, 30000);
  setInterval(checkVersion, 5 * 60000);
  const wake = () => { if (document.hidden) return; checkVersion(); if (Date.now() - lastSync > 5000) sync(); };
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('focus', wake);
  window.addEventListener('online', wake);
  window.addEventListener('pageshow', (ev) => { if (ev.persisted) wake(); });

  // ===================================================================
  // Başlangıç
  // ===================================================================
  async function authFromHash() {
    const h = location.hash.slice(1).replace(/^\//, '');
    if (!/access_token=|error_description=/.test(h)) return;
    const p = new URLSearchParams(h);
    if (p.get('error_description')) {
      history.replaceState(null, '', `${siteUrl()}#/berber`);
      setTimeout(() => toast(`Bağlantı geçersiz ya da süresi dolmuş. Tekrar dene. (${p.get('error_description')})`, true), 300);
      return;
    }
    api.setSession({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_at: Number(p.get('expires_at')) || undefined, expires_in: Number(p.get('expires_in')) || 3600 });
    try { const u = await api.raw('/auth/v1/user'); api.session.user = u; api.setSession(api.session); } catch { /* sonra denenir */ }
    history.replaceState(null, '', `${siteUrl()}${p.get('type') === 'recovery' ? '#/berber/sifre' : '#/berber'}`);
  }

  async function boot() {
    document.title = APP;
    const brand = $('#brand');
    if (brand) brand.textContent = APP;
    const sp = new URLSearchParams(location.search).get('s');
    if (sp && !location.hash) history.replaceState(null, '', `${siteUrl()}#/b/${encodeURIComponent(sp)}`);
    try { await authFromHash(); } catch { /* bağlantı yoksa aşağıdaki görünüm hatayı gösterir */ }
    window.addEventListener('hashchange', () => render());
    try { await render(); } finally { loader.booted(); }
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  boot();
}());
