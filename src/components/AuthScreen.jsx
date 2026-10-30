import { useRef, useState } from 'react';
import Book from './Book';
import { useBookTilt } from '../hooks/useBookTilt';
import { bookFallback } from '../data/examples';
import { resetPassword, signIn, signInWithGoogle, signUp } from '../firebase';
import { friendlyError } from '../lib/errors';
import logoRed from '../assets/logo-piatto.png';
import logoLight from '../assets/logo-piatto-claro.png';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pantalla de ingreso: iniciar sesión, crear una cuenta o entrar con Google
function AuthScreen() {
  const artRef = useRef(null);
  useBookTilt(artRef);

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }
  const [sending, setSending] = useState(null); // 'form' | 'google' | null
  const isSignup = mode === 'signup';

  function switchMode(next) {
    setMode(next); setErrors({}); setMessage(null);
  }

  async function submit(e) {
    e.preventDefault();
    // Validaciones básicas
    const errs = {};
    if (isSignup && name.trim().length < 2) errs.name = 'Escribí tu nombre.';
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Escribí un correo válido, por ejemplo sofia@gmail.com.';
    if (password.length < 6) errs.password = 'La contraseña tiene que tener al menos 6 caracteres.';
    setErrors(errs); setMessage(null);
    if (Object.keys(errs).length) return;

    setSending('form');
    try {
      if (isSignup) await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
      // Al entrar, App detecta la sesión y muestra la aplicación
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err) });
      setSending(null);
    }
  }

  async function google() {
    setMessage(null); setSending('google');
    try {
      await signInWithGoogle();
    } catch (err) {
      // Si la persona cerró la ventanita de Google, no es un error
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setMessage({ type: 'error', text: friendlyError(err) });
      }
      setSending(null);
    }
  }

  async function forgot() {
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: 'Escribí tu correo acá arriba y volvé a tocar “Olvidé mi contraseña”.' });
      return;
    }
    try {
      await resetPassword(email.trim());
      setMessage({ type: 'info', text: `Te mandamos un correo a ${email.trim()} para elegir una contraseña nueva. Si no lo ves, revisá la carpeta de spam.` });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err) });
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-side">
        <a className="auth-brand" href="#">
          <picture>
            <source srcSet={logoLight} media="(prefers-color-scheme: dark)" />
            <img src={logoRed} alt="" width="58" height="44" />
          </picture>
          Piatto
        </a>

        <form className="auth-card" onSubmit={submit} noValidate>
          <div className="auth-tabs" role="group" aria-label="Elegí una opción">
            <button type="button" aria-pressed={!isSignup} onClick={() => switchMode('login')}>Iniciar sesión</button>
            <button type="button" aria-pressed={isSignup} onClick={() => switchMode('signup')}>Crear cuenta</button>
          </div>

          <div className="auth-title">
            <p>{isSignup ? '¡Hola! Te damos la bienvenida' : '¡Qué bueno verte de nuevo!'}</p>
            <h1>{isSignup ? 'Creá tu cuenta' : 'Ingresá a tu cuenta'}</h1>
          </div>

          {isSignup && (
            <label className="field">Nombre
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="¿Cómo te llamás?" aria-invalid={!!errors.name} />
              <span className="field-error">{errors.name}</span>
            </label>
          )}

          <label className="field">Correo electrónico
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="tu@correo.com" aria-invalid={!!errors.email} />
            <span className="field-error">{errors.email}</span>
          </label>

          <div className="field">
            <label htmlFor="auth-pass">Contraseña</label>
            <div className="pass-group">
              <input
                id="auth-pass" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? 'Al menos 6 caracteres' : ''} aria-invalid={!!errors.password}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPass ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <span className="field-error">{errors.password}</span>
            {!isSignup && <button type="button" className="auth-link forgot" onClick={forgot}>Olvidé mi contraseña</button>}
          </div>

          {message && <p className={`auth-msg ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</p>}

          <button className="btn btn-primary auth-submit" type="submit" disabled={!!sending}>
            {sending === 'form'
              ? <><span className="spinner" />{isSignup ? 'Creando tu cuenta…' : 'Entrando…'}</>
              : isSignup ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>

          <button className="btn auth-google" type="button" onClick={google} disabled={!!sending}>
            {sending === 'google' ? <><span className="spinner" />Abriendo Google…</> : 'Continuar con Google'}
          </button>

          <p className="auth-switch">
            {isSignup ? '¿Ya tenés una cuenta? ' : '¿No tenés una cuenta? '}
            <button type="button" className="auth-link" onClick={() => switchMode(isSignup ? 'login' : 'signup')}>
              {isSignup ? 'Iniciá sesión' : 'Registrate'}
            </button>
          </p>
        </form>
      </main>

      <aside className="auth-art" ref={artRef} aria-hidden="true">
        <div className="auth-art-copy">
          <h2>Cociná con lo que hay en casa.</h2>
          <p>Guardá tus recetas, armá la lista del súper sin olvidarte nada y descubrí qué podés cocinar hoy con lo que tenés en la alacena.</p>
        </div>
        <div className="scene">
          <div className="layer book-layer" style={{ '--d': 6 }}>
            <Book recipes={bookFallback} />
          </div>
        </div>
      </aside>
    </div>
  );
}

export default AuthScreen;
