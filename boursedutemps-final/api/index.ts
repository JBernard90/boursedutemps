import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import compression from 'compression';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initDB, query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

dotenv.config();

const startTime = Date.now();

// Init DB non-bloquant
initDB().catch((err: any) =>
  console.error('[DB] Erreur init:', err?.message || err)
);

// ─── OTP ──────────────────────────────────────────────────────────────────
const generateSecureOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ─── Nodemailer ───────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── TextBee SMS ──────────────────────────────────────────────────────────
const sendSMS = async (to: string, message: string): Promise<boolean> => {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_SENDER_ID;

  if (!apiKey || !deviceId) {
    console.warn('[TextBee] Clés manquantes - SMS ignoré');
    return false;
  }

  try {
    const nodeFetch = await import('node-fetch');
    const fetchFn = nodeFetch.default || nodeFetch;
    const response = await (fetchFn as any)(
      'https://api.textbee.dev/api/v1/gateway/devices/send-sms',
      {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver: to, message, deviceId }),
      }
    );
    return response.ok;
  } catch (error: any) {
    console.error('[TextBee] Erreur:', error.message);
    return false;
  }
};

// ─── Express App ─────────────────────────────────────────────────────────
const app = express();

app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Force JSON sur toutes les réponses API
app.use('/api', (_req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// ─── Helper sendError ─────────────────────────────────────────────────────
const sendError = (
  res: express.Response,
  message: string,
  status = 500,
  code?: string
) => {
  res.status(status).json({ error: message, success: false, ...(code ? { code } : {}) });
};

// ─── Health ───────────────────────────────────────────────────────────────
app.get('/api/health', async (_req: express.Request, res: express.Response) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', uptime: Date.now() - startTime });
  } catch (err: any) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: err.message,
      success: false,
    });
  }
});

// ─── POST /api/verify/init ────────────────────────────────────────────────
app.post('/api/verify/init', async (req: express.Request, res: express.Response) => {
  const { email, phone } = req.body;

  if (!email || !email.endsWith('@etu-usenghor.org')) {
    return sendError(res, 'Email invalide ou domaine non autorisé.', 400, 'INVALID_EMAIL');
  }
  if (!phone || !/^\+[1-9]\d{1,14}$/.test(phone)) {
    return sendError(res, 'Format de téléphone invalide. Utilisez le format international (ex: +221...)', 400, 'INVALID_PHONE');
  }

  const emailOtp = generateSecureOTP();
  const phoneOtp = generateSecureOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    await query('DELETE FROM otps WHERE identifier = $1 OR identifier = $2', [`email:${email}`, `phone:${phone}`]);
    await query('INSERT INTO otps (identifier, code, expires_at) VALUES ($1, $2, $3)', [`email:${email}`, emailOtp, expiresAt]);
    await query('INSERT INTO otps (identifier, code, expires_at) VALUES ($1, $2, $3)', [`phone:${phone}`, phoneOtp, expiresAt]);

    transporter.sendMail({
      from: `"Bourse du Temps" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Code de sécurité – Inscription',
      html: `
        <div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;max-width:500px;margin:0 auto;">
          <h2 style="color:#1e40af;">Vérification de votre adresse email</h2>
          <p>Vous avez demandé à vous inscrire sur la <strong>Bourse du Temps – Université Senghor</strong>.</p>
          <p>Voici votre code de sécurité à 6 chiffres (valable 10 minutes) :</p>
          <div style="background:#f3f4f6;padding:15px;text-align:center;border-radius:8px;margin:20px 0;">
            <strong style="font-size:32px;letter-spacing:4px;color:#1f2937;">${emailOtp}</strong>
          </div>
          <p style="font-size:12px;color:#6b7280;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        </div>
      `,
    }).catch((emailError: any) => {
      console.error('[Email] Erreur envoi:', emailError.message);
      console.log(`[DEV] Email OTP pour ${email}: ${emailOtp}`);
    });

    sendSMS(phone, `Bourse du Temps: Votre code est ${phoneOtp}. Valable 10 min.`)
      .then((sent) => { if (!sent) console.log(`[DEV] Phone OTP pour ${phone}: ${phoneOtp}`); })
      .catch(() => console.log(`[DEV] Phone OTP pour ${phone}: ${phoneOtp}`));

    res.json({ success: true, message: 'Codes envoyés. Vérifiez votre email et SMS.' });
  } catch (error: any) {
    console.error('[Verify Init] Erreur:', error);
    sendError(res, 'Erreur lors de la génération des codes de vérification.');
  }
});

// ─── POST /api/verify/check ───────────────────────────────────────────────
app.post('/api/verify/check', async (req: express.Request, res: express.Response) => {
  const { email, phone, emailCode, phoneCode } = req.body;

  if (!email || !phone || !emailCode || !phoneCode) {
    return sendError(res, 'Tous les champs sont requis.', 400);
  }

  try {
    const emailResult = await query('SELECT * FROM otps WHERE identifier = $1 ORDER BY created_at DESC LIMIT 1', [`email:${email}`]);
    const phoneResult = await query('SELECT * FROM otps WHERE identifier = $1 ORDER BY created_at DESC LIMIT 1', [`phone:${phone}`]);

    const storedEmail = emailResult.rows[0];
    const storedPhone = phoneResult.rows[0];

    if (!storedEmail || storedEmail.code !== emailCode || new Date() > new Date(storedEmail.expires_at)) {
      return sendError(res, 'Code email invalide ou expiré.', 400, 'INVALID_EMAIL_CODE');
    }
    if (!storedPhone || storedPhone.code !== phoneCode || new Date() > new Date(storedPhone.expires_at)) {
      return sendError(res, 'Code SMS invalide ou expiré.', 400, 'INVALID_SMS_CODE');
    }

    res.json({ success: true, message: 'Codes vérifiés avec succès.' });
  } catch (error: any) {
    console.error('[Verify Check] Erreur:', error);
    sendError(res, 'Erreur lors de la vérification des codes.');
  }
});

// ─── POST /api/register ───────────────────────────────────────────────────
app.post('/api/register', async (req: express.Request, res: express.Response) => {
  const { email, phone, emailCode, phoneCode, password, firstName, lastName, campus, department, gender, country, offeredSkills, requestedSkills, availability, languages, avatar } = req.body;

  if (!email || !phone || !emailCode || !phoneCode || !password || !firstName || !lastName) {
    return sendError(res, 'Champs obligatoires manquants.', 400, 'MISSING_FIELDS');
  }

  try {
    const emailResult = await query('SELECT * FROM otps WHERE identifier = $1 ORDER BY created_at DESC LIMIT 1', [`email:${email}`]);
    const phoneResult = await query('SELECT * FROM otps WHERE identifier = $1 ORDER BY created_at DESC LIMIT 1', [`phone:${phone}`]);

    const storedEmail = emailResult.rows[0];
    const storedPhone = phoneResult.rows[0];

    if (!storedEmail || storedEmail.code !== emailCode || new Date() > new Date(storedEmail.expires_at)) {
      return sendError(res, 'Échec de sécurité : Code email invalide ou expiré.', 403, 'INVALID_EMAIL_CODE');
    }
    if (!storedPhone || storedPhone.code !== phoneCode || new Date() > new Date(storedPhone.expires_at)) {
      return sendError(res, 'Échec de sécurité : Code SMS invalide ou expiré.', 403, 'INVALID_SMS_CODE');
    }

    const existingUser = await query('SELECT uid FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return sendError(res, 'Cet email est déjà utilisé.', 409, 'EMAIL_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const uid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    await query(
      `INSERT INTO users (uid, email, password, first_name, last_name, whatsapp, campus, department, gender, country, offered_skills, requested_skills, availability, languages, avatar, verified, is_verified_email, is_verified_sms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,true,true)`,
      [uid, email, hashedPassword, firstName, lastName, phone, campus || null, department || null, gender || null, country || null, JSON.stringify(offeredSkills || []), JSON.stringify(requestedSkills || []), availability || null, JSON.stringify(languages || []), avatar || null]
    );

    await query('DELETE FROM otps WHERE identifier = $1 OR identifier = $2', [`email:${email}`, `phone:${phone}`]);

    const token = jwt.sign({ uid, email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

    res.status(201).json({ success: true, uid, token });
  } catch (error: any) {
    console.error('[Register] Erreur:', error);
    if (error.code === '23505') {
      return sendError(res, 'Cet email est déjà utilisé.', 409, 'EMAIL_EXISTS');
    }
    sendError(res, process.env.NODE_ENV === 'production' ? 'Erreur lors de l\'inscription. Veuillez réessayer.' : error.message);
  }
});

// ─── POST /api/login ──────────────────────────────────────────────────────
app.post('/api/login', async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 'Email et mot de passe requis.', 400, 'MISSING_FIELDS');
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return sendError(res, 'Email ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return sendError(res, 'Email ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign({ uid: user.uid, email: user.email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, token, user: userWithoutPassword });
  } catch (error: any) {
    console.error('[Login] Erreur:', error);
    sendError(res, process.env.NODE_ENV === 'production' ? 'Erreur de connexion. Veuillez réessayer.' : error.message);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────
app.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const result = await query('SELECT * FROM users WHERE uid = $1', [req.user.uid]);
    if (result.rows.length === 0) {
      return sendError(res, 'Utilisateur non trouvé.', 404, 'USER_NOT_FOUND');
    }
    const { password, ...userWithoutPassword } = result.rows[0];
    res.json({ ...userWithoutPassword, success: true });
  } catch (error: any) {
    sendError(res, error.message);
  }
});

// ─── CRUD générique ───────────────────────────────────────────────────────
const tables = ['users', 'services', 'requests', 'blogs', 'testimonials', 'forumTopics', 'connections', 'transactions'];

const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map((v) => toCamelCase(v));
  if (obj !== null && obj?.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

tables.forEach((table) => {
  const dbTable = table === 'forumTopics' ? 'forum_topics' : table;

  app.get(`/api/${table}`, async (_req: express.Request, res: express.Response) => {
    try {
      const result = await query(`SELECT * FROM ${dbTable} ORDER BY created_at DESC`);
      res.json(toCamelCase(result.rows));
    } catch (error: any) { sendError(res, error.message); }
  });

  app.get(`/api/${table}/:id`, async (req: express.Request, res: express.Response) => {
    try {
      const idCol = table === 'users' ? 'uid' : 'id';
      const result = await query(`SELECT * FROM ${dbTable} WHERE ${idCol} = $1`, [req.params.id]);
      if (result.rows.length === 0) return sendError(res, 'Ressource introuvable', 404, 'NOT_FOUND');
      res.json(toCamelCase(result.rows[0]));
    } catch (error: any) { sendError(res, error.message); }
  });

  app.post(`/api/${table}`, authenticateToken, async (req: AuthRequest, res: express.Response) => {
    try {
      const body = { ...req.body };
      delete body.id; delete body.uid;
      const keys = Object.keys(body);
      if (keys.length === 0) return sendError(res, 'Corps vide', 400);
      const values = Object.values(body).map((v) => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.map((k) => k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)).join(', ');
      const result = await query(`INSERT INTO ${dbTable} (${columns}) VALUES (${placeholders}) RETURNING *`, values);
      res.status(201).json(toCamelCase(result.rows[0]));
    } catch (error: any) { sendError(res, error.message); }
  });

  app.put(`/api/${table}/:id`, authenticateToken, async (req: AuthRequest, res: express.Response) => {
    try {
      const idCol = table === 'users' ? 'uid' : 'id';
      const body = { ...req.body };
      delete body.id; delete body.uid;
      const keys = Object.keys(body);
      const values = Object.values(body).map((v) => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      const existing = await query(`SELECT ${idCol} FROM ${dbTable} WHERE ${idCol} = $1`, [req.params.id]);
      if (existing.rows.length > 0) {
        const setClause = keys.map((k, i) => `${k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)} = $${i + 1}`).join(', ');
        const result = await query(`UPDATE ${dbTable} SET ${setClause} WHERE ${idCol} = $${keys.length + 1} RETURNING *`, [...values, req.params.id]);
        res.json(toCamelCase(result.rows[0]));
      } else {
        const allKeys = [idCol, ...keys];
        const allValues = [req.params.id, ...values];
        const placeholders = allKeys.map((_, i) => `$${i + 1}`).join(', ');
        const columns = allKeys.map((k) => k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)).join(', ');
        const result = await query(`INSERT INTO ${dbTable} (${columns}) VALUES (${placeholders}) RETURNING *`, allValues);
        res.status(201).json(toCamelCase(result.rows[0]));
      }
    } catch (error: any) { sendError(res, error.message); }
  });

  app.patch(`/api/${table}/:id`, authenticateToken, async (req: AuthRequest, res: express.Response) => {
    try {
      const idCol = table === 'users' ? 'uid' : 'id';
      const body = { ...req.body };
      delete body.id; delete body.uid;
      const keys = Object.keys(body);
      if (keys.length === 0) return res.json({ success: true });
      const values = Object.values(body).map((v) => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      const setClause = keys.map((k, i) => `${k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)} = $${i + 1}`).join(', ');
      const result = await query(`UPDATE ${dbTable} SET ${setClause} WHERE ${idCol} = $${keys.length + 1} RETURNING *`, [...values, req.params.id]);
      res.json(toCamelCase(result.rows[0]));
    } catch (error: any) { sendError(res, error.message); }
  });

  app.delete(`/api/${table}/:id`, authenticateToken, async (req: AuthRequest, res: express.Response) => {
    try {
      const idCol = table === 'users' ? 'uid' : 'id';
      await query(`DELETE FROM ${dbTable} WHERE ${idCol} = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (error: any) { sendError(res, error.message); }
  });
});

// ─── 404 + Error Handler ──────────────────────────────────────────────────
app.use('/api/*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: `Route ${req.originalUrl} introuvable`, success: false, code: 'NOT_FOUND' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Error]', err);
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Valeur déjà existante', success: false, code: 'DUPLICATE' });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : err.message || 'Internal Server Error',
    success: false,
    code: 'INTERNAL_ERROR',
  });
});

export default app;
