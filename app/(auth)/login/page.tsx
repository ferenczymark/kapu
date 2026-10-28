'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Lock, Mail, Eye, EyeOff, AlertCircle, UserPlus, LogIn, CheckCircle2, Database, User } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (isRegister && !username.trim()) {
      setError('Kérjük, add meg a felhasználónevedet!');
      return false;
    }

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      setError('Csak érvényes @gmail.com-os e-mail címmel lehet regisztrálni!');
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z0-9]+$/;
    if (!passwordRegex.test(password)) {
      setError('A jelszó csak angol kisbetűt, nagybetűt és számot tartalmazhat!');
      return false;
    }

    if (password.length < 6) {
      setError('A jelszónak legalább 6 karakter hosszúnak kell lennie!');
      return false;
    }

    if (isRegister && password !== confirmPassword) {
      setError('A két jelszó nem egyezik meg!');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setSuccess('Sikeres regisztráció! Most már bejelentkezhetsz.');
          setIsRegister(false);
          setUsername('');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message || 'Hibás e-mail cím vagy jelszó.');
        } else {
          setSuccess('Sikeres bejelentkezés! Átirányítás a vezérlőpultra...');
          setTimeout(() => {
            router.push('/dashboard');
          }, 800);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Hiba történt a csatlakozás során.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 overflow-hidden selection:bg-emerald-500/30">
      
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[30rem] h-[30rem] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-lg p-2 rounded-[2.5rem] bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-2xl">
        <div className="liquid-glass w-full rounded-[2rem] p-8 md:p-10 text-slate-100 relative overflow-hidden">
          
          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center shadow-inner backdrop-blur-xl mb-1">
              <Lock className="w-7 h-7 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            </div>
            
            <span className="text-[11px] font-bold tracking-[0.2em] text-emerald-400 uppercase">
              KAPUVEZÉRLŐ RENDSZER (SUPABASE)
            </span>
            
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {isRegister ? 'Regisztráció' : 'Bejelentkezés'}
            </h1>
          </div>

          <div className="grid grid-cols-2 p-1 mb-6 rounded-2xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
                setSuccess(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                !isRegister 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Bejelentkezés</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
                setSuccess(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                isRegister 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Regisztráció</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur-md p-3.5 text-xs font-medium text-red-300 shadow-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-md p-3.5 text-xs font-medium text-emerald-300 shadow-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 ml-1">Felhasználónév</label>
                <div className="liquid-glass-input relative rounded-2xl transition-all duration-300">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Felhasználónév"
                    className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 ml-1">E-mail cím (@gmail.com)</label>
              <div className="liquid-glass-input relative rounded-2xl transition-all duration-300">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nev@gmail.com"
                  className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 ml-1">Jelszó</label>
              <div className="liquid-glass-input relative rounded-2xl transition-all duration-300">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 ml-1">Jelszó megerősítése</label>
                <div className="liquid-glass-input relative rounded-2xl transition-all duration-300">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-px shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 mt-2"
            >
              <div className="w-full h-full bg-gradient-to-r from-emerald-500 to-cyan-600 py-3.5 text-sm font-bold text-slate-950 rounded-2xl flex items-center justify-center gap-2">
                {loading ? 'Csatlakozás...' : isRegister ? 'Regisztráció' : 'Bejelentkezés'}
              </div>
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400/80 font-medium">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Felhőalapú Supabase (PostgreSQL) Adatbázis</span>
          </div>

        </div>
      </div>
    </div>
  );
}