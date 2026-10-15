import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  KeyRound, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Flame 
} from 'lucide-react';
import { loginWithGoogle, loginWithEmail, onAuthChange } from './services/auth';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui/card';
import { Badge } from './components/ui/badge';

export default function LoginApp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Modo Oscuro
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('acreditador_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('acreditador_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('acreditador_theme', 'light');
    }
  }, [isDark]);

  // Si ya tiene sesión activa y es admin, redirigir a admin.html
  useEffect(() => {
    const unsubscribe = onAuthChange((user, isAdmin) => {
      if (user && isAdmin) {
        window.location.href = './admin.html';
      } else {
        setCurrentUser(user);
      }
    });
    return () => unsubscribe();
  }, []);

  // Inicio de sesión con Google
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      window.location.href = './admin.html';
    } catch (err) {
      console.error('Error Google Sign-In:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Ventana de inicio de sesión cancelada.');
      } else {
        setError(err.message || 'Error al autenticar con Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Inicio de sesión con Email y Contraseña
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Por favor completá tu correo y contraseña.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      window.location.href = './admin.html';
    } catch (err) {
      console.error('Error Email Login:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Correo o contraseña incorrectos.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El formato del correo es inválido.');
      } else {
        setError(err.message || 'Error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 transition-colors duration-200">
      
      {/* Botón de tema en la esquina */}
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setIsDark((prev) => !prev)}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <div className="w-full max-w-md space-y-6">
        
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm mb-1">
            <Lock className="w-5 h-5 stroke-[2]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Panel de Administración
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            Acceso restringido para organizadores y supervisores de acreditación.
          </p>
        </div>

        {/* Tarjeta de Inicio de Sesión */}
        <Card className="shadow-lg border-zinc-200/90 dark:border-zinc-800">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-semibold">Iniciar sesión</CardTitle>
            <CardDescription className="text-xs">
              Tu cuenta debe estar dada de alta previamente en el sistema.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            
            {/* Botón de Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 gap-2.5 font-medium border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
              onClick={handleGoogleSignIn}
              isLoading={googleLoading}
              disabled={loading}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </Button>

            <div className="relative flex items-center justify-center py-1">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              <span className="absolute bg-white dark:bg-zinc-900 px-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                O con email
              </span>
            </div>

            {/* Formulario Email / Contraseña */}
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@evento.com"
                    className="pl-8"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Contraseña
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-8"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="default"
                className="w-full h-9 font-semibold gap-1.5"
                isLoading={loading}
                disabled={googleLoading}
              >
                <span>Acceder al Panel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </form>

          </CardContent>

          <CardFooter className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 pb-3 flex justify-between items-center text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Seguridad Cloud Firestore
            </span>
            <span>UTN FRSR</span>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
