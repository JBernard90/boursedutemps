
import React, { useState } from 'react';
import { User } from '../types';

interface AuthModalProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  onAuth: (u: User) => void;
  onSwitch: (m: 'login' | 'signup') => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ mode, onClose, onAuth, onSwitch }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('Management');
  const [gender, setGender] = useState<'Homme' | 'Femme'>('Homme');
  const [country, setCountry] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [offeredSkills, setOfferedSkills] = useState('');
  const [requestedSkills, setRequestedSkills] = useState('');
  const [availability, setAvailability] = useState('');
  const [languages, setLanguages] = useState('');
  const [avatar, setAvatar] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // OTP State
  const [emailCode, setEmailCode] = useState('');
  const [loginOtp, setLoginOtp] = useState('');

  const ALLOWED_DOMAIN = '@etu-usenghor.org';

  // ─── INSCRIPTION : envoyer OTP email ────────────────────────────────────
  const handleSendCode = async () => {
    if (!email.endsWith(ALLOWED_DOMAIN)) {
      alert(`Seules les adresses ${ALLOWED_DOMAIN} sont autorisées.`);
      return;
    }
    if (!whatsapp || !/^\+[1-9]\d{1,14}$/.test(whatsapp)) {
      alert('Format de téléphone invalide. Utilisez le format international (ex: +221...)');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/verify/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: whatsapp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur envoi du code');
      setStep(2);
      alert('Code envoyé ! Vérifiez votre email.');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── INSCRIPTION : vérifier OTP email ───────────────────────────────────
  const verifyCode = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, emailCode })
      });
      if (res.ok) {
        setStep(3);
      } else {
        const data = await res.json();
        alert(data.error || 'Code incorrect ou expiré.');
      }
    } catch {
      alert('Erreur lors de la vérification.');
    } finally {
      setLoading(false);
    }
  };

  // ─── INSCRIPTION : finaliser ─────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatar) { alert('Photo requise'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, phone: whatsapp, emailCode, password,
          firstName, lastName, department, gender, country,
          offeredSkills: offeredSkills.split(',').map(s => s.trim()).filter(Boolean),
          requestedSkills: requestedSkills.split(',').map(s => s.trim()).filter(Boolean),
          availability,
          languages: languages.split(',').map(l => l.trim()).filter(Boolean),
          avatar,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inscription');
      localStorage.setItem('token', data.token);
      const userRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${data.token}` } });
      const userData = await userRes.json();
      onAuth(userData);
      alert('Inscription réussie !');
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── CONNEXION : étape 1 → envoyer OTP ──────────────────────────────────
  const handleLoginInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/login/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Identifiants incorrects');
      setStep(2);
      alert('Code de connexion envoyé par email !');
    } catch (error: any) {
      alert('Erreur : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── CONNEXION : étape 2 → vérifier OTP ─────────────────────────────────
  const handleLoginVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, otp: loginOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code incorrect');
      localStorage.setItem('token', data.token);
      onAuth(data.user);
      onClose();
    } catch (error: any) {
      alert('Erreur : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const fillForTest = () => {
    setEmail('test@etu-usenghor.org');
    setPassword('password123');
    setFirstName('Test');
    setLastName('User');
    setCountry('Sénégal');
    setWhatsapp('+221770000000');
    setOfferedSkills('Excel, Design');
    setRequestedSkills('Anglais, Piano');
    setAvailability('Soirs et weekends');
    setLanguages('Français, Anglais');
    setAvatar('https://picsum.photos/seed/test/200/200');
    setTermsAccepted(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="font-heading text-3xl font-bold text-slate-800 uppercase tracking-tight">
            {mode === 'login' ? 'Connexion' : 'Bourse du Temps - Inscription'}
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            {mode === 'login'
              ? (step === 1 ? 'Entrez vos identifiants' : 'Vérification par email')
              : `Étape ${step} sur 4`}
          </p>
          {mode === 'signup' && step === 1 && (
            <button type="button" onClick={fillForTest}
              className="mt-4 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">
              Remplir automatiquement (Test)
            </button>
          )}
        </div>

        <div className="space-y-6">

          {/* ══ CONNEXION ════════════════════════════════════════════════ */}
          {mode === 'login' && (
            <>
              {step === 1 && (
                <form onSubmit={handleLoginInit} className="space-y-4">
                  <input required type="email" placeholder="Email institutionnel"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                    value={email} onChange={e => setEmail(e.target.value)} />
                  <input required type="password" placeholder="Mot de passe"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                    value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-200 disabled:opacity-50">
                    {loading ? 'Vérification...' : 'Continuer'}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleLoginVerify} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-xs text-blue-800 font-medium">
                      Un code de connexion a été envoyé à <strong>{email}</strong>. Valable 5 minutes.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Code de connexion (6 chiffres)</label>
                    <input placeholder="_ _ _ _ _ _"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-mono text-center tracking-widest text-xl"
                      value={loginOtp} onChange={e => setLoginOtp(e.target.value)} maxLength={6} />
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setStep(1)}
                      className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200">Retour</button>
                    <button type="submit" disabled={loading || loginOtp.length < 6}
                      className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50">
                      {loading ? 'Connexion...' : 'Se Connecter'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ══ INSCRIPTION ══════════════════════════════════════════════ */}
          {mode === 'signup' && (
            <>
              {/* Étape 1 : email + whatsapp */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Institutionnel</label>
                    <input required type="email" placeholder="votre-email@etu-usenghor.org"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                      value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Numéro WhatsApp (contact)</label>
                    <input required placeholder="Ex: +221 77..."
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                      value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                    <p className="text-xs text-slate-400">Utilisé comme information de contact uniquement, pas pour la vérification.</p>
                  </div>
                  <button type="button" onClick={handleSendCode} disabled={loading}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50">
                    {loading ? 'Envoi...' : 'Recevoir le code par email'}
                  </button>
                </div>
              )}

              {/* Étape 2 : vérification OTP */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-xs text-blue-800 font-medium">
                      Un code a été envoyé à <strong>{email}</strong>. Valable 5 minutes.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Code Email (6 chiffres)</label>
                    <input placeholder="_ _ _ _ _ _"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-mono text-center tracking-widest text-xl"
                      value={emailCode} onChange={e => setEmailCode(e.target.value)} maxLength={6} />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setStep(1)}
                      className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200">Retour</button>
                    <button type="button" onClick={verifyCode} disabled={loading || emailCode.length < 6}
                      className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50">
                      {loading ? 'Vérification...' : 'Vérifier'}
                    </button>
                  </div>
                </div>
              )}

              {/* Étape 3 : infos personnelles */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <input required placeholder="Prénom"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                      value={firstName} onChange={e => setFirstName(e.target.value)} />
                    <input required placeholder="Nom"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                      value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                      value={gender} onChange={e => setGender(e.target.value as any)}>
                      <option value="Homme">Homme</option>
                      <option value="Femme">Femme</option>
                    </select>
                    <input required placeholder="Pays d'origine"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                      value={country} onChange={e => setCountry(e.target.value)} />
                  </div>
                  <select className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                    value={department} onChange={e => setDepartment(e.target.value)}>
                    <option>Management</option>
                    <option>Culture</option>
                    <option>Environnement</option>
                    <option>Santé</option>
                  </select>
                  <input required type="password" placeholder="Mot de passe"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                    value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setStep(4)}
                    disabled={!firstName || !lastName || !country || !password}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50">Suivant</button>
                </div>
              )}

              {/* Étape 4 : profil */}
              {step === 4 && (
                <form onSubmit={handleRegister} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-center">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Photo de Profil (OBLIGATOIRE)</label>
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border-4 border-blue-50 shadow-inner">
                        {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <span className="text-3xl grayscale">👤</span>}
                      </div>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="text-xs text-slate-500 cursor-pointer" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Compétences Offertes</label>
                      <input required placeholder="Excel, Marketing..."
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                        value={offeredSkills} onChange={e => setOfferedSkills(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Compétences Recherchées</label>
                      <input required placeholder="Anglais, Piano..."
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                        value={requestedSkills} onChange={e => setRequestedSkills(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Disponibilité</label>
                    <input required placeholder="Ex: Soirs et weekends..."
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                      value={availability} onChange={e => setAvailability(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Langues</label>
                    <input required placeholder="Français, Wolof, Anglais..."
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none"
                      value={languages} onChange={e => setLanguages(e.target.value)} />
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <label className="flex items-start gap-4 cursor-pointer">
                      <input type="checkbox" required className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
                      <span className="text-xs text-slate-500 leading-relaxed">
                        J'accepte les <strong>conditions d'utilisation</strong>. Je confirme que mon profil sera <strong>visible par tous les membres</strong>.
                      </span>
                    </label>
                  </div>
                  <button type="submit" disabled={loading || !avatar || !termsAccepted}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 disabled:opacity-50">
                    {loading ? 'Finalisation...' : 'Terminer'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p className="text-center mt-8 text-sm font-medium text-slate-400">
          {mode === 'login' ? 'Nouveau membre ?' : 'Déjà inscrit ?'}
          <button onClick={() => { onSwitch(mode === 'login' ? 'signup' : 'login'); setStep(1); }}
            className="text-blue-600 font-bold ml-1 hover:underline">
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
