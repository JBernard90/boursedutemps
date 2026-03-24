const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

dotenv.config();

const startTime = Date.now();

// --- DATABASE -------------------------------------------------------------
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 20000,
    })
  : null;

const query = async (text, params) => {
  if (!pool) throw new Error('DATABASE_URL manquant dans les variables Vercel.');
  return pool.query(text, params);
};

const initDB = async () => {
  if (!pool) return;
  const tables = [
    `CREATE TABLE IF NOT EXISTS otps (
      id SERIAL PRIMARY KEY,
      identifier VARCHAR(255) NOT NULL,
      code VARCHAR(10) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      uid VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      whatsapp VARCHAR(255),
      campus VARCHAR(255),
      department VARCHAR(255),
      gender VARCHAR(50),
      country VARCHAR(255),
      availability VARCHAR(255),
      languages JSONB,
      offered_skills JSONB,
      requested_skills JSONB,
      bio TEXT,
      avatar TEXT,
      cover_photo VARCHAR(255),
      credits INTEGER DEFAULT 5,
      role VARCHAR(50) DEFAULT 'user',
      status VARCHAR(50) DEFAULT 'active',
      verified BOOLEAN DEFAULT true,
      is_verified_email BOOLEAN DEFAULT true,
      is_verified_sms BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255),
      user_name VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      credit_cost INTEGER NOT NULL,
      category VARCHAR(255),
      status VARCHAR(50) DEFAULT 'proposed',
      accepted_by VARCHAR(255),
      accepted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255),
      user_name VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      credit_offer INTEGER NOT NULL,
      category VARCHAR(255),
      status VARCHAR(50) DEFAULT 'proposed',
      fulfilled_by VARCHAR(255),
      fulfilled_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS blogs (
      id SERIAL PRIMARY KEY,
      author_id VARCHAR(255),
      author_name VARCHAR(255),
      author_avatar VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(255),
      media JSONB DEFAULT '[]',
      likes TEXT[] DEFAULT '{}',
      dislikes TEXT[] DEFAULT '{}',
      shares INTEGER DEFAULT 0,
      reposts INTEGER DEFAULT 0,
      comments JSONB DEFAULT '[]',
      external_link VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      author_id VARCHAR(255),
      author_name VARCHAR(255),
      author_avatar VARCHAR(255),
      content TEXT NOT NULL,
      rating INTEGER NOT NULL,
      media JSONB DEFAULT '[]',
      likes TEXT[] DEFAULT '{}',
      dislikes TEXT[] DEFAULT '{}',
      shares INTEGER DEFAULT 0,
      reposts INTEGER DEFAULT 0,
      comments JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS forum_topics (
      id SERIAL PRIMARY KEY,
      author_id VARCHAR(255),
      author_name VARCHAR(255),
      author_avatar VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(255),
      media JSONB DEFAULT '[]',
      likes TEXT[] DEFAULT '{}',
      dislikes TEXT[] DEFAULT '{}',
      shares INTEGER DEFAULT 0,
      reposts INTEGER DEFAULT 0,
      comments JSONB DEFAULT '[]',
      external_link VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS connections (
      id SERIAL PRIMARY KEY,
      sender_id VARCHAR(255),
      receiver_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'sent',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      from_id VARCHAR(255),
      to_id VARCHAR(255),
      amount INTEGER NOT NULL,
      service_title VARCHAR(255),
      type VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];
  const client = await pool.connect();
  try {
    for (const sql of tables) {
      await client.query(sql);
    }
    console.log('[DB] Tables initialisees');
  } catch (err) {
    console.error('[DB] Erreur init:', err && err.message);
  } finally {
    client.release();
  }
};
initDB().catch(err => console.error('[DB] Init failed:', err && err.message));

// --- AUTH MIDDLEWARE ------------------------------------------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant', success: false });
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalide', success: false });
    req.user = user;
    next();
  });
};

// --- OTP -----------------------------------------------------------------
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// --- NODEMAILER -----------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// --- WhatsApp OTP supprime - email uniquement ---------------------------

// --- EXPRESS -------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '10mb' }));

const sendError = (res, message, status, code) => {
  status = status || 500;
  return res.status(status).json({ error: message, success: false, code: code || 'ERROR' });
};

// --- HEALTH ---------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', uptime: Date.now() - startTime });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected', error: err.message, success: false });
  }
});

// --- VERIFY INIT ----------------------------------------------------------
app.post('/api/verify/init', async (req, res) => {
  const { email, phone } = req.body;
  if (!email) return sendError(res, 'Email requis.', 400);
  try {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await query('DELETE FROM otps WHERE identifier = $1', ['email:' + email]);
    await query('INSERT INTO otps (identifier, code, expires_at) VALUES ($1, $2, $3)', ['email:' + email, otp, expiresAt]);

    transporter.sendMail({
      from: '"Bourse du Temps" <' + process.env.EMAIL_USER + '>',
      to: email,
      subject: 'Code de verification - Bourse du Temps',
      html: '<div style="font-family:sans-serif;padding:20px;max-width:500px;margin:0 auto;border:1px solid #eee;border-radius:10px;"><h2 style="color:#1e40af;">Verification de votre email</h2><p>Votre code de verification (valable <strong>5 minutes</strong>) :</p><div style="background:#f3f4f6;padding:15px;text-align:center;border-radius:8px;margin:20px 0;"><strong style="font-size:32px;letter-spacing:4px;color:#1f2937;">' + otp + '</strong></div><p style="font-size:12px;color:#6b7280;">Si vous n\'etes pas a l\'origine de cette demande, ignorez cet email.</p></div>',
    }).catch(function(e) { console.error('[Email OTP error]', e.message); });

    res.json({ success: true, message: 'Code envoye par email.' });
  } catch (err) {
    console.error('[verify/init]', err);
    sendError(res, 'Erreur generation du code.');
  }
});

// --- VERIFY CHECK ---------------------------------------------------------
app.post('/api/verify/check', async (req, res) => {
  const { email, emailCode } = req.body;
  if (!email || !emailCode) return sendError(res, 'Email et code requis.', 400);
  try {
    const r = await query('SELECT * FROM otps WHERE identifier = $1 ORDER BY created_at DESC LIMIT 1', ['email:' + email]);
    const otp = r.rows[0];
    if (!otp || otp.code !== emailCode || new Date() > new Date(otp.expires_at))
      return sendError(res, 'Code invalide ou expire.', 400);
    res.json({ success: true });
  } catch (err) {
    console.error('[verify/check]', err);
    sendError(res, 'Erreur verification code.');
  }
});

// --- REGISTER -------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  const { email, phone, emailCode, password, firstName, lastName, campus, department, gender, country, offeredSkills, requestedSkills, availability, languages, avatar } = req.body;
  if (!email || !emailCode || !password || !firstName || !lastName)
    return sendError(res, 'Champs obligatoires manquants.', 400);
  try {
    const r = await query('SELECT * FROM otps WHERE identifier = $1 ORDER BY created_at DESC LIMIT 1', ['email:' + email]);
    const otp = r.rows[0];
    if (!otp || otp.code !== emailCode || new Date() > new Date(otp.expires_at))
      return sendError(res, 'Code email invalide ou expire.', 403);

    const existing = await query('SELECT uid FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return sendError(res, 'Cet email est deja utilise.', 409);

    const hashedPassword = await bcrypt.hash(password, 10);
    const uid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    await query(
      'INSERT INTO users (uid,email,password,first_name,last_name,whatsapp,campus,department,gender,country,offered_skills,requested_skills,availability,languages,avatar,verified,is_verified_email,is_verified_sms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,true,true)',
      [uid, email, hashedPassword, firstName, lastName, phone||null, campus||null, department||null, gender||null, country||null,
       JSON.stringify(offeredSkills||[]), JSON.stringify(requestedSkills||[]), availability||null, JSON.stringify(languages||[]), avatar||null]
    );
    await query('DELETE FROM otps WHERE identifier = $1', ['email:' + email]);

    const token = jwt.sign({ uid, email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.status(201).json({ success: true, uid, token });
  } catch (err) {
    console.error('[register]', err);
    if (err.code === '23505') return sendError(res, 'Cet email est deja utilise.', 409);
    sendError(res, 'Erreur inscription. Veuillez reessayer.');
  }
});

// --- LOGIN ----------------------------------------------------------------
app.post('/api/login/init', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return sendError(res, 'Email et mot de passe requis.', 400);
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return sendError(res, 'Email ou mot de passe incorrect.', 401);
    const user = result.rows[0];
    if (!await bcrypt.compare(password, user.password))
      return sendError(res, 'Email ou mot de passe incorrect.', 401);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await query('DELETE FROM otps WHERE identifier = $1', ['login:' + email]);
    await query('INSERT INTO otps (identifier, code, expires_at) VALUES ($1, $2, $3)', ['login:' + email, otp, expiresAt]);

    transporter.sendMail({
      from: '"Bourse du Temps" <' + process.env.EMAIL_USER + '>',
      to: email,
      subject: 'Code de connexion - Bourse du Temps',
      html: '<div style="font-family:sans-serif;padding:20px;max-width:500px;margin:0 auto;border:1px solid #eee;border-radius:10px;"><h2 style="color:#1e40af;">Connexion a Bourse du Temps</h2><p>Votre code de connexion (valable <strong>5 minutes</strong>) :</p><div style="background:#f3f4f6;padding:15px;text-align:center;border-radius:8px;margin:20px 0;"><strong style="font-size:32px;letter-spacing:4px;color:#1f2937;">' + otp + '</strong></div><p style="font-size:12px;color:#6b7280;">Si vous n\'etes pas a l\'origine de cette demande, changez votre mot de passe.</p></div>',
    }).catch(function(e) { console.error('[Login OTP error]', e.message); });

    res.json({ success: true, message: 'Code de connexion envoye par email.' });
  } catch (err) {
    console.error('[login/init]', err);
    sendError(res, 'Erreur de connexion. Veuillez reessayer.');
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password, otp } = req.body;
  if (!email || !password || !otp) return sendError(res, 'Email, mot de passe et code OTP requis.', 400);
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return sendError(res, 'Email ou mot de passe incorrect.', 401);
    const user = result.rows[0];
    if (!await bcrypt.compare(password, user.password))
      return sendError(res, 'Email ou mot de passe incorrect.', 401);

    const r = await query('SELECT * FROM otps WHERE identifier = $1 ORDER BY created_at DESC LIMIT 1', ['login:' + email]);
    const otpRow = r.rows[0];
    if (!otpRow || otpRow.code !== otp || new Date() > new Date(otpRow.expires_at))
      return sendError(res, 'Code OTP invalide ou expire.', 403);

    await query('DELETE FROM otps WHERE identifier = $1', ['login:' + email]);
    const token = jwt.sign({ uid: user.uid, email: user.email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    const { password: _, ...u } = user;
    res.json({ success: true, token, user: u });
  } catch (err) {
    console.error('[login]', err);
    sendError(res, 'Erreur de connexion. Veuillez reessayer.');
  }
});

// --- AUTH/ME --------------------------------------------------------------
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM users WHERE uid = $1', [req.user.uid]);
    if (!result.rows.length) return sendError(res, 'Utilisateur non trouve.', 404);
    const { password, ...u } = result.rows[0];
    res.json(Object.assign({}, u, { success: true }));
  } catch (err) { sendError(res, err.message); }
});

// --- CRUD GENERIQUE -------------------------------------------------------
const tables = ['users','services','requests','blogs','testimonials','forumTopics','connections','transactions'];

const toCamel = function(obj) {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj && obj.constructor === Object)
    return Object.keys(obj).reduce(function(r, k) {
      r[k.replace(/_([a-z])/g, function(g) { return g[1].toUpperCase(); })] = toCamel(obj[k]);
      return r;
    }, {});
  return obj;
};

const toSnake = function(k) { return k.replace(/[A-Z]/g, function(l) { return '_' + l.toLowerCase(); }); };

// Colonnes TEXT[] dans PostgreSQL (tableaux de strings simples)
const TEXT_ARRAY_COLS = ['likes', 'dislikes', 'shares_list'];

// Colonnes JSONB (tableaux d'objets complexes)
const JSONB_COLS = ['media', 'comments', 'languages', 'offered_skills', 'requested_skills'];

const serialize = function(v, colName) {
  if (typeof v === 'object' && v !== null) {
    const col = colName ? toSnake(colName) : '';
    // TEXT[] : tableau de strings simples -> format PostgreSQL {val1,val2}
    if (Array.isArray(v) && TEXT_ARRAY_COLS.includes(col)) {
      return '{' + v.map(function(s) { return '"' + String(s).replace(/"/g, '\\"') + '"'; }).join(',') + '}';
    }
    // JSONB : objets complexes -> JSON string
    return JSON.stringify(v);
  }
  return v;
};

tables.forEach(function(table) {
  const db = table === 'forumTopics' ? 'forum_topics' : table;
  const idCol = table === 'users' ? 'uid' : 'id';

  app.get('/api/' + table, async function(req, res) {
    try { res.json(toCamel((await query('SELECT * FROM ' + db + ' ORDER BY created_at DESC')).rows)); }
    catch (e) { sendError(res, e.message); }
  });

  app.get('/api/' + table + '/:id', async function(req, res) {
    try {
      const r = await query('SELECT * FROM ' + db + ' WHERE ' + idCol + ' = $1', [req.params.id]);
      if (!r.rows.length) return sendError(res, 'Introuvable', 404);
      res.json(toCamel(r.rows[0]));
    } catch (e) { sendError(res, e.message); }
  });

  app.post('/api/' + table, authenticateToken, async function(req, res) {
    try {
      const body = Object.assign({}, req.body);
      delete body.id; delete body.uid;
      const keys = Object.keys(body);
      if (!keys.length) return sendError(res, 'Corps vide', 400);
      const cols = keys.map(toSnake).join(', ');
      const vals = keys.map(function(k) { return serialize(body[k], k); });
      const ph = keys.map(function(_, i) { return '$' + (i+1); }).join(', ');
      const r = await query('INSERT INTO ' + db + ' (' + cols + ') VALUES (' + ph + ') RETURNING *', vals);
      res.status(201).json(toCamel(r.rows[0]));
    } catch (e) { sendError(res, e.message); }
  });

  app.put('/api/' + table + '/:id', authenticateToken, async function(req, res) {
    try {
      const body = Object.assign({}, req.body);
      delete body.id; delete body.uid;
      const keys = Object.keys(body);
      const vals = keys.map(function(k) { return serialize(body[k], k); });
      const existing = await query('SELECT ' + idCol + ' FROM ' + db + ' WHERE ' + idCol + ' = $1', [req.params.id]);
      if (existing.rows.length) {
        const set = keys.map(function(k,i) { return toSnake(k) + ' = $' + (i+1); }).join(', ');
        const r = await query('UPDATE ' + db + ' SET ' + set + ' WHERE ' + idCol + ' = $' + (keys.length+1) + ' RETURNING *', vals.concat([req.params.id]));
        res.json(toCamel(r.rows[0]));
      } else {
        const allK = [idCol].concat(keys), allV = [req.params.id].concat(vals);
        const r = await query('INSERT INTO ' + db + ' (' + allK.map(toSnake).join(', ') + ') VALUES (' + allK.map(function(_,i){ return '$'+(i+1); }).join(', ') + ') RETURNING *', allV);
        res.status(201).json(toCamel(r.rows[0]));
      }
    } catch (e) { sendError(res, e.message); }
  });

  app.patch('/api/' + table + '/:id', authenticateToken, async function(req, res) {
    try {
      const body = Object.assign({}, req.body);
      delete body.id; delete body.uid;
      const keys = Object.keys(body);
      if (!keys.length) return res.json({ success: true });
      const vals = keys.map(function(k) { return serialize(body[k], k); });
      const set = keys.map(function(k,i) { return toSnake(k) + ' = $' + (i+1); }).join(', ');
      const r = await query('UPDATE ' + db + ' SET ' + set + ' WHERE ' + idCol + ' = $' + (keys.length+1) + ' RETURNING *', vals.concat([req.params.id]));
      res.json(toCamel(r.rows[0]));
    } catch (e) { sendError(res, e.message); }
  });

  app.delete('/api/' + table + '/:id', authenticateToken, async function(req, res) {
    try {
      await query('DELETE FROM ' + db + ' WHERE ' + idCol + ' = $1', [req.params.id]);
      res.json({ success: true });
    } catch (e) { sendError(res, e.message); }
  });
});

// --- HELP / SUPPORT ADMIN ---------------------------------------------------
app.post('/api/help', async function(req, res) {
  const { type, subject, message, email, phone } = req.body;
  if (!email || !phone || !subject || !message) return sendError(res, 'Tous les champs sont requis.', 400);
  try {
    await transporter.sendMail({
      from: '"Bourse du Temps" <' + process.env.EMAIL_USER + '>',
      to: process.env.EMAIL_USER,
      subject: '[SUPPORT ' + (type||'') + '] ' + subject,
      html: '<div style="font-family:sans-serif;padding:20px;">' +
        '<h2 style="color:#1e40af;">Nouveau message Support Admin</h2>' +
        '<p><b>Type:</b> ' + (type||'') + '</p>' +
        '<p><b>Email:</b> ' + email + '</p>' +
        '<p><b>Téléphone:</b> ' + phone + '</p>' +
        '<p><b>Objet:</b> ' + subject + '</p>' +
        '<p><b>Message:</b></p><p>' + message + '</p>' +
        '</div>'
    });
    res.json({ success: true });
  } catch(e) {
    console.error('[help]', e);
    sendError(res, 'Erreur envoi email: ' + e.message);
  }
});


// --- OPEN GRAPH SHARE PAGE ------------------------------------------------
app.get('/share/blog/:id', async (req, res) => {
  try {
    const r = await query('SELECT * FROM blogs WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.redirect('https://boursedutemps.vercel.app/blog');
    const blog = r.rows[0];

    const title = blog.title || 'Bourse du Temps';
    const description = (blog.content || '').substring(0, 200).replace(/"/g, '&quot;') + '...';
    const author = blog.author_name || 'Bourse du Temps';
    const siteUrl = 'https://boursedutemps.vercel.app';
    
    // Get first image from media if available
    let image = 'https://i.postimg.cc/5Y3Rg6zs/image-1.jpg';
    try {
      const media = typeof blog.media === 'string' ? JSON.parse(blog.media) : (blog.media || []);
      const firstImage = media.find(m => m.type === 'image');
      if (firstImage && firstImage.url) image = firstImage.url;
    } catch(e) {}

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Bourse du Temps</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Bourse du Temps" />
  <meta property="og:url" content="${siteUrl}/share/blog/${blog.id}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="article:author" content="${author}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />

  <!-- SEO -->
  <meta name="description" content="${description}" />

  <!-- Redirect vers le vrai site apres 0.5s -->
  <meta http-equiv="refresh" content="0;url=${siteUrl}/blog#blog-${blog.id}" />
  <script>window.location.href = '${siteUrl}/blog#blog-${blog.id}';</script>
</head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;">
  <div style="text-align:center;max-width:500px;padding:40px;">
    <img src="https://i.postimg.cc/5Y3Rg6zs/image-1.jpg" style="width:80px;height:80px;border-radius:50%;margin-bottom:20px;" />
    <h1 style="color:#1e40af;font-size:1.5rem;margin-bottom:10px;">${title}</h1>
    <p style="color:#64748b;margin-bottom:20px;">${description}</p>
    <a href="${siteUrl}/blog" style="background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
      Voir sur Bourse du Temps →
    </a>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[share/blog]', err);
    res.redirect('https://boursedutemps.vercel.app/blog');
  }
});


// --- OPEN GRAPH SHARE - TESTIMONIALS --------------------------------------
app.get('/share/testimonials/:id', async (req, res) => {
  try {
    const r = await query('SELECT * FROM testimonials WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.redirect('https://boursedutemps.vercel.app/testimonials');
    const t = r.rows[0];
    const title = (t.title || 'Témoignage') + ' — Bourse du Temps';
    const description = (t.content || '').replace(/<[^>]*>/g, '').substring(0, 200) + '...';
    const author = t.author_name || 'Bourse du Temps';
    const siteUrl = 'https://boursedutemps.vercel.app';
    let image = 'https://i.postimg.cc/5Y3Rg6zs/image-1.jpg';
    try {
      const media = typeof t.media === 'string' ? JSON.parse(t.media) : (t.media || []);
      const firstImage = media.find(m => m.type === 'image');
      if (firstImage && firstImage.url) image = firstImage.url;
    } catch(e) {}
    const stars = '★'.repeat(t.rating || 5) + '☆'.repeat(5 - (t.rating || 5));
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Bourse du Temps" />
  <meta property="og:url" content="${siteUrl}/share/testimonials/${t.id}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${stars} ${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:locale" content="fr_FR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${stars} ${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta http-equiv="refresh" content="0;url=${siteUrl}/testimonials#testimonial-${t.id}" />
  <script>window.location.href = '${siteUrl}/testimonials#testimonial-${t.id}';</script>
</head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;">
  <div style="text-align:center;max-width:500px;padding:40px;">
    <div style="font-size:2rem;margin-bottom:12px;">${stars}</div>
    <h1 style="color:#1e40af;font-size:1.5rem;margin-bottom:10px;">${t.title || 'Témoignage'}</h1>
    <p style="color:#64748b;margin-bottom:8px;font-style:italic;">Par ${author}</p>
    <p style="color:#64748b;margin-bottom:20px;">${description}</p>
    <a href="${siteUrl}/testimonials" style="background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Voir sur Bourse du Temps →</a>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[share/testimonials]', err);
    res.redirect('https://boursedutemps.vercel.app/testimonials');
  }
});

// --- OPEN GRAPH SHARE - FORUM ---------------------------------------------
app.get('/share/forum/:id', async (req, res) => {
  try {
    const r = await query('SELECT * FROM forum_topics WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.redirect('https://boursedutemps.vercel.app/forum');
    const t = r.rows[0];
    const title = (t.title || 'Discussion') + ' — Bourse du Temps';
    const description = (t.content || t.message || '').replace(/<[^>]*>/g, '').substring(0, 200) + '...';
    const author = t.author_name || 'Bourse du Temps';
    const siteUrl = 'https://boursedutemps.vercel.app';
    let image = 'https://i.postimg.cc/5Y3Rg6zs/image-1.jpg';
    try {
      const media = typeof t.media === 'string' ? JSON.parse(t.media) : (t.media || []);
      const firstImage = media.find(m => m.type === 'image');
      if (firstImage && firstImage.url) image = firstImage.url;
    } catch(e) {}
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Bourse du Temps" />
  <meta property="og:url" content="${siteUrl}/share/forum/${t.id}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:locale" content="fr_FR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta http-equiv="refresh" content="0;url=${siteUrl}/forum#forum-${t.id}" />
  <script>window.location.href = '${siteUrl}/forum#forum-${t.id}';</script>
</head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;">
  <div style="text-align:center;max-width:500px;padding:40px;">
    <div style="font-size:2rem;margin-bottom:12px;">💬</div>
    <h1 style="color:#1e40af;font-size:1.5rem;margin-bottom:10px;">${t.title || 'Discussion'}</h1>
    <p style="color:#64748b;margin-bottom:8px;">Par ${author}</p>
    <p style="color:#64748b;margin-bottom:20px;">${description}</p>
    <a href="${siteUrl}/forum" style="background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Voir sur Bourse du Temps →</a>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[share/forum]', err);
    res.redirect('https://boursedutemps.vercel.app/forum');
  }
});



// --- SITEMAP --------------------------------------------------------------
app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://boursedutemps.vercel.app/</loc><priority>1.0</priority></url>
  <url><loc>https://boursedutemps.vercel.app/about</loc><priority>0.8</priority></url>
  <url><loc>https://boursedutemps.vercel.app/services</loc><priority>0.9</priority></url>
  <url><loc>https://boursedutemps.vercel.app/requests</loc><priority>0.9</priority></url>
  <url><loc>https://boursedutemps.vercel.app/members</loc><priority>0.8</priority></url>
  <url><loc>https://boursedutemps.vercel.app/blog</loc><priority>0.9</priority></url>
  <url><loc>https://boursedutemps.vercel.app/forum</loc><priority>0.9</priority></url>
  <url><loc>https://boursedutemps.vercel.app/testimonials</loc><priority>0.7</priority></url>
</urlset>`);
});

// --- ROBOTS.TXT -----------------------------------------------------------
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /profile
Disallow: /moderation
Disallow: /api/
Sitemap: https://boursedutemps.vercel.app/sitemap.xml`);
});

// --- GOOGLE SEARCH CONSOLE VERIFICATION ----------------------------------
app.get('/google1801069cb5a6ae0c.html', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send('google-site-verification: google1801069cb5a6ae0c.html');
});

// --- SET ADMIN ROLE (one-time setup) --------------------------------------
app.post('/api/make-admin', async (req, res) => {
  const { email, secret } = req.body;
  if (secret !== 'BourseAdmin2026') return sendError(res, 'Non autorisé', 403);
  try {
    const r = await query("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING uid, email, role", [email]);
    if (!r.rows.length) return sendError(res, 'Utilisateur non trouvé', 404);
    res.json({ success: true, user: r.rows[0] });
  } catch (err) {
    sendError(res, err.message);
  }
});


// --- HELPER EMAIL ---------------------------------------------------------
const sendNotificationEmail = async (to, subject, html) => {
  if (!to) return;
  try {
    await transporter.sendMail({
      from: '"Bourse du Temps" <' + process.env.EMAIL_USER + '>',
      to,
      subject,
      html
    });
  } catch(e) {
    console.error('[Notification email error]', e.message);
  }
};

const emailStyle = `
  font-family: Arial, sans-serif;
  max-width: 500px;
  margin: 0 auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`;

const emailHeader = `
  <div style="background:#1e40af;padding:24px;text-align:center;">
    <img src="https://i.postimg.cc/5Y3Rg6zs/image-1.jpg" style="width:60px;height:60px;border-radius:50%;margin-bottom:12px;" />
    <h1 style="color:white;margin:0;font-size:20px;">Bourse du Temps</h1>
  </div>
`;

const emailFooter = `
  <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      Université Senghor — Alexandrie, Égypte<br/>
      <a href="https://boursedutemps.vercel.app" style="color:#1e40af;">boursedutemps.vercel.app</a>
    </p>
  </div>
`;

// --- NOTIFY: CONNEXION REQUEST --------------------------------------------
app.post('/api/notify/connection', async (req, res) => {
  const { receiverEmail, receiverName, senderName } = req.body;
  if (!receiverEmail) return res.json({ success: false });
  const html = `<div style="${emailStyle}">
    ${emailHeader}
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin-top:0;">Nouvelle demande de connexion 🔗</h2>
      <p style="color:#475569;">Bonjour <strong>${receiverName}</strong>,</p>
      <p style="color:#475569;"><strong>${senderName}</strong> souhaite se connecter avec vous sur la Bourse du Temps.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://boursedutemps.vercel.app/members" style="background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Voir la demande →
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;">Connectez-vous à votre profil pour accepter ou refuser cette demande.</p>
    </div>
    ${emailFooter}
  </div>`;
  await sendNotificationEmail(receiverEmail, `${senderName} souhaite se connecter avec vous`, html);
  res.json({ success: true });
});

// --- NOTIFY: CONNECTION ACCEPTED ------------------------------------------
app.post('/api/notify/connection-accepted', async (req, res) => {
  const { receiverEmail, receiverName, accepterName } = req.body;
  if (!receiverEmail) return res.json({ success: false });
  const html = `<div style="${emailStyle}">
    ${emailHeader}
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin-top:0;">Demande de connexion acceptée ✅</h2>
      <p style="color:#475569;">Bonjour <strong>${receiverName}</strong>,</p>
      <p style="color:#475569;"><strong>${accepterName}</strong> a accepté votre demande de connexion. Vous pouvez maintenant échanger des messages !</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://boursedutemps.vercel.app/members" style="background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Voir mes connexions →
        </a>
      </div>
    </div>
    ${emailFooter}
  </div>`;
  await sendNotificationEmail(receiverEmail, `${accepterName} a accepté votre demande de connexion`, html);
  res.json({ success: true });
});

// --- NOTIFY: NEW COMMENT --------------------------------------------------
app.post('/api/notify/comment', async (req, res) => {
  let { authorEmail, authorId, authorName, commenterName, postTitle, postType, postId } = req.body;
  // Fetch author email from DB if not provided
  if (!authorEmail && authorId) {
    try {
      const r = await query('SELECT email, first_name, last_name FROM users WHERE uid = $1', [authorId]);
      if (r.rows.length) {
        authorEmail = r.rows[0].email;
        if (!authorName) authorName = r.rows[0].first_name + ' ' + r.rows[0].last_name;
      }
    } catch(e) {}
  }
  if (!authorEmail) return res.json({ success: false });
  const pageMap = { blog: 'blog', forum: 'forum', testimonials: 'testimonials' };
  const page = pageMap[postType] || 'blog';
  const anchorMap = { blog: 'blog', forum: 'forum', testimonials: 'testimonial' };
  const anchor = anchorMap[postType] || 'blog';
  const url = `https://boursedutemps.vercel.app/${page}#${anchor}-${postId}`;
  const html = `<div style="${emailStyle}">
    ${emailHeader}
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin-top:0;">Nouveau commentaire 💬</h2>
      <p style="color:#475569;">Bonjour <strong>${authorName}</strong>,</p>
      <p style="color:#475569;"><strong>${commenterName}</strong> a commenté votre publication <strong>"${postTitle}"</strong>.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Voir le commentaire →
        </a>
      </div>
    </div>
    ${emailFooter}
  </div>`;
  await sendNotificationEmail(authorEmail, `${commenterName} a commenté votre publication`, html);
  res.json({ success: true });
});

// --- NOTIFY: NEW LIKE -----------------------------------------------------
app.post('/api/notify/like', async (req, res) => {
  let { authorEmail, authorId, authorName, likerName, postTitle, postType, postId } = req.body;
  if (!authorEmail && authorId) {
    try {
      const r = await query('SELECT email, first_name, last_name FROM users WHERE uid = $1', [authorId]);
      if (r.rows.length) {
        authorEmail = r.rows[0].email;
        if (!authorName) authorName = r.rows[0].first_name + ' ' + r.rows[0].last_name;
      }
    } catch(e) {}
  }
  if (!authorEmail) return res.json({ success: false });
  const pageMap = { blog: 'blog', forum: 'forum', testimonials: 'testimonials' };
  const page = pageMap[postType] || 'blog';
  const anchorMap = { blog: 'blog', forum: 'forum', testimonials: 'testimonial' };
  const anchor = anchorMap[postType] || 'blog';
  const url = `https://boursedutemps.vercel.app/${page}#${anchor}-${postId}`;
  const html = `<div style="${emailStyle}">
    ${emailHeader}
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin-top:0;">Quelqu'un aime votre publication ❤️</h2>
      <p style="color:#475569;">Bonjour <strong>${authorName}</strong>,</p>
      <p style="color:#475569;"><strong>${likerName}</strong> a aimé votre publication <strong>"${postTitle}"</strong>.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Voir la publication →
        </a>
      </div>
    </div>
    ${emailFooter}
  </div>`;
  await sendNotificationEmail(authorEmail, `${likerName} aime votre publication`, html);
  res.json({ success: true });
});

// --- NOTIFY: NEW SERVICE/REQUEST ------------------------------------------
app.post('/api/notify/exchange', async (req, res) => {
  const { targetEmail, targetName, fromName, title, type } = req.body;
  if (!targetEmail) return res.json({ success: false });
  const isService = type === 'service';
  const html = `<div style="${emailStyle}">
    ${emailHeader}
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin-top:0;">${isService ? 'Nouveau service proposé 🛠️' : 'Nouvelle demande reçue 📋'}</h2>
      <p style="color:#475569;">Bonjour <strong>${targetName}</strong>,</p>
      <p style="color:#475569;"><strong>${fromName}</strong> ${isService ? 'a accepté votre service' : 'a répondu à votre demande'} : <strong>"${title}"</strong>.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://boursedutemps.vercel.app/${isService ? 'services' : 'requests'}" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Voir les détails →
        </a>
      </div>
    </div>
    ${emailFooter}
  </div>`;
  await sendNotificationEmail(targetEmail, `${fromName} a répondu à votre ${isService ? 'service' : 'demande'}`, html);
  res.json({ success: true });
});


// --- MESSAGES -------------------------------------------------------------

// Envoyer un message
app.post('/api/messages', authenticateToken, async (req, res) => {
  const { receiverId, content, mediaUrl, mediaType, fileName, link } = req.body;
  if (!receiverId) return sendError(res, 'Destinataire requis', 400);
  try {
    const r = await query(
      'INSERT INTO messages (sender_id, receiver_id, content, media_url, media_type, file_name, link) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.uid, receiverId, content||null, mediaUrl||null, mediaType||null, fileName||null, link||null]
    );
    res.status(201).json(toCamel(r.rows[0]));
  } catch(e) { sendError(res, e.message); }
});

// Récupérer la conversation avec un membre
app.get('/api/messages/:partnerId', authenticateToken, async (req, res) => {
  try {
    const r = await query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [req.user.uid, req.params.partnerId]
    );
    // Marquer les messages reçus comme lus
    await query(
      'UPDATE messages SET read = true WHERE receiver_id = $1 AND sender_id = $2 AND read = false',
      [req.user.uid, req.params.partnerId]
    );
    res.json(toCamel(r.rows));
  } catch(e) { sendError(res, e.message); }
});

// Compter les messages non lus par expéditeur
app.get('/api/messages/unread', authenticateToken, async (req, res) => {
  try {
    const r = await query(
      'SELECT sender_id, COUNT(*) as count FROM messages WHERE receiver_id = $1 AND read = false GROUP BY sender_id',
      [req.user.uid]
    );
    const counts = {};
    r.rows.forEach(row => { counts[row.sender_id] = parseInt(row.count); });
    res.json(counts);
  } catch(e) { sendError(res, e.message); }
});

// --- NOTIFY: NEW MESSAGE --------------------------------------------------
app.post('/api/notify/message', async (req, res) => {
  const { receiverEmail, receiverName, senderName } = req.body;
  if (!receiverEmail) return res.json({ success: false });
  const html = `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <div style="background:#1e40af;padding:24px;text-align:center;">
      <img src="https://i.postimg.cc/5Y3Rg6zs/image-1.jpg" style="width:60px;height:60px;border-radius:50%;margin-bottom:12px;" />
      <h1 style="color:white;margin:0;font-size:20px;">Bourse du Temps</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin-top:0;">Nouveau message 💬</h2>
      <p style="color:#475569;">Bonjour <strong>${receiverName}</strong>,</p>
      <p style="color:#475569;"><strong>${senderName}</strong> vous a envoyé un message privé.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://boursedutemps.vercel.app/messages" style="background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Voir le message →
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">Université Senghor — <a href="https://boursedutemps.vercel.app" style="color:#1e40af;">boursedutemps.vercel.app</a></p>
    </div>
  </div>`;
  await sendNotificationEmail(receiverEmail, `Nouveau message de ${senderName}`, html);
  res.json({ success: true });
});


// --- ADMIN STATS ----------------------------------------------------------
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    // Verify admin
    const userRes = await query('SELECT role FROM users WHERE uid = $1', [req.user.uid]);
    if (!userRes.rows.length || userRes.rows[0].role !== 'admin') {
      return sendError(res, 'Accès refusé', 403);
    }

    // Total counts
    const [members, blogs, forums, testimonials, services, requests, messages, connections, transactions] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM blogs'),
      query('SELECT COUNT(*) as count FROM forum_topics'),
      query('SELECT COUNT(*) as count FROM testimonials'),
      query('SELECT COUNT(*) as count FROM services'),
      query('SELECT COUNT(*) as count FROM requests'),
      query('SELECT COUNT(*) as count FROM messages'),
      query("SELECT COUNT(*) as count FROM connections WHERE status = 'accepted'"),
      query('SELECT COUNT(*) as count FROM transactions'),
    ]);

    // Members registered per day (last 30 days)
    const membersPerDay = await query(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) 
      ORDER BY date ASC
    `);

    // Most active members (by publications + messages)
    const topMembers = await query(`
      SELECT u.uid, u.first_name, u.last_name, u.avatar, u.department,
        (SELECT COUNT(*) FROM blogs WHERE author_id = u.uid) +
        (SELECT COUNT(*) FROM forum_topics WHERE author_id = u.uid) +
        (SELECT COUNT(*) FROM testimonials WHERE author_id = u.uid) +
        (SELECT COUNT(*) FROM messages WHERE sender_id = u.uid) as activity_score
      FROM users u
      ORDER BY activity_score DESC
      LIMIT 5
    `);

    // Recent members
    const recentMembers = await query(`
      SELECT uid, first_name, last_name, avatar, department, created_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    // Publications per category
    const blogCategories = await query(`
      SELECT category, COUNT(*) as count 
      FROM blogs 
      GROUP BY category 
      ORDER BY count DESC
    `);

    // Credits in circulation
    const credits = await query('SELECT SUM(credits) as total FROM users');

    // Active vs inactive members
    const activeMembers = await query(`
      SELECT COUNT(DISTINCT sender_id) as count FROM messages 
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    res.json({
      totals: {
        members: parseInt(members.rows[0].count),
        blogs: parseInt(blogs.rows[0].count),
        forums: parseInt(forums.rows[0].count),
        testimonials: parseInt(testimonials.rows[0].count),
        services: parseInt(services.rows[0].count),
        requests: parseInt(requests.rows[0].count),
        messages: parseInt(messages.rows[0].count),
        connections: parseInt(connections.rows[0].count),
        transactions: parseInt(transactions.rows[0].count),
        publications: parseInt(blogs.rows[0].count) + parseInt(forums.rows[0].count) + parseInt(testimonials.rows[0].count),
        creditsCirculation: parseInt(credits.rows[0].total || 0),
        activeThisWeek: parseInt(activeMembers.rows[0].count),
      },
      membersPerDay: membersPerDay.rows,
      topMembers: topMembers.rows.map(m => ({
        uid: m.uid,
        name: m.first_name + ' ' + m.last_name,
        avatar: m.avatar,
        department: m.department,
        score: parseInt(m.activity_score)
      })),
      recentMembers: recentMembers.rows.map(m => ({
        uid: m.uid,
        name: m.first_name + ' ' + m.last_name,
        avatar: m.avatar,
        department: m.department,
        createdAt: m.created_at
      })),
      blogCategories: blogCategories.rows,
    });
  } catch(e) {
    console.error('[admin/stats]', e);
    sendError(res, e.message);
  }
});


// --- JITSI MEET LIVE (100% gratuit, sans API key) ------------------------
app.post('/api/live/create', authenticateToken, async (req, res) => {
  const { title } = req.body;
  try {
    // Generer un nom de salle unique
    const roomName = 'BourseduTemps-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const jitsiUrl = 'https://meet.jit.si/' + roomName;

    res.json({
      url: jitsiUrl,
      name: title || 'Live Bourse du Temps',
      roomName: roomName
    });
  } catch(e) {
    console.error('[live/create]', e);
    sendError(res, e.message);
  }
});

app.get('/api/live/rooms', async (req, res) => {
  res.json([]);
});

// --- 404 + ERROR ----------------------------------------------------------
app.use('/api/*', function(req, res) {
  res.status(404).json({ error: 'Route ' + req.originalUrl + ' introuvable', success: false });
});

app.use(function(err, req, res, next) {
  console.error('[Error]', err);
  if (err.code === '23505') return res.status(409).json({ error: 'Valeur deja existante', success: false });
  res.status(err.status || 500).json({ error: err.message || 'Erreur interne', success: false });
});

module.exports = app;
