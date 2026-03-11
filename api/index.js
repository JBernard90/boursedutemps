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
      content TEXT NOT NULL, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT,
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
      content TEXT NOT NULL, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT,
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
      content TEXT NOT NULL, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT, message TEXT,
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
const serialize = function(v) { return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v; };

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
      const vals = Object.values(body).map(serialize);
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
      const vals = Object.values(body).map(serialize);
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
      const vals = Object.values(body).map(serialize);
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
