import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema, LoginFormData, RegisterFormData } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'register-otp' | 'registered' | 'forgot' | 'forgot-otp' | 'reset-password';

const AuthPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const result = await login(data.email, data.password);
    setIsLoading(false);

    if (result.success) {
      toast({ title: 'Login Berhasil', description: 'Selamat datang kembali!' });
      navigate('/');
    } else {
      toast({ title: 'Login Gagal', description: result.error || 'Terjadi kesalahan', variant: 'destructive' });
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Registrasi gagal');
      setRegisterEmail(data.email);
      setOtpValue('');
      setMode('register-otp');
      toast({ title: 'Kode OTP Dikirim', description: 'Cek email Anda untuk kode verifikasi' });
    } catch (error: any) {
      toast({ title: 'Registrasi Gagal', description: error.message || 'Terjadi kesalahan', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRegisterOtp = async () => {
    if (otpValue.length !== 6) {
      toast({ title: 'Error', description: 'Kode OTP harus 6 digit', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ email: registerEmail, otp: otpValue }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Verifikasi gagal');
      setMode('registered');
      toast({ title: 'Email Terverifikasi', description: 'Menunggu persetujuan admin untuk akses dashboard' });
    } catch (error: any) {
      toast({ title: 'Verifikasi Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ email: registerEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal kirim ulang OTP');
      setOtpValue('');
      toast({ title: 'OTP Dikirim Ulang', description: 'Cek email Anda untuk kode verifikasi baru' });
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast({ title: 'Error', description: 'Email wajib diisi', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal mengirim OTP');
      toast({ title: 'OTP Dikirim', description: 'Cek email Anda untuk kode OTP' });
      setMode('forgot-otp');
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async () => {
    if (otpValue.length !== 6) {
      toast({ title: 'Error', description: 'Kode OTP harus 6 digit', variant: 'destructive' });
      return;
    }
    // Verify OTP server-side before showing reset form
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ email: forgotEmail, otp: otpValue, action: 'verify' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Kode OTP salah');
      setMode('reset-password');
    } catch (error: any) {
      toast({ title: 'Verifikasi Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Error', description: 'Password minimal 8 karakter', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Error', description: 'Password tidak cocok', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ email: forgotEmail, otp: otpValue, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal reset password');
      toast({ title: 'Berhasil', description: 'Password berhasil direset. Silakan login.' });
      switchMode('login');
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    loginForm.reset();
    registerForm.reset();
    setForgotEmail('');
    setRegisterEmail('');
    setOtpValue('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'DASHBOARD';
      case 'register': return 'Registrasi';
      case 'register-otp': return 'Verifikasi Email';
      case 'registered': return 'Pendaftaran Berhasil';
      case 'forgot': return 'Lupa Password';
      case 'forgot-otp': return 'Verifikasi OTP';
      case 'reset-password': return 'Reset Password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'GIZI X DIHATI KAMPAR';
      case 'register': return 'Buat akun baru untuk akses dashboard';
      case 'register-otp': return `Masukkan kode OTP yang dikirim ke ${registerEmail}`;
      case 'registered': return 'Akun Anda telah terdaftar';
      case 'forgot': return 'Masukkan email untuk menerima kode OTP';
      case 'forgot-otp': return `Masukkan kode OTP yang dikirim ke ${forgotEmail}`;
      case 'reset-password': return 'Masukkan password baru Anda';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-xl bg-white/90 border border-slate-200/80 rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] p-8">
          <div className="text-center mb-8 flex flex-col items-center">
            <img
              src="/icon/logos.svg"
              alt="Logo Gizi X Dihati Kampar"
              className="w-[220px] h-[220px] object-contain mx-auto -mb-4 drop-shadow-[0_10px_25px_rgba(0,0,0,0.15)] animate-fade-in"
              style={{ animationDuration: '1s', animationFillMode: 'both' }}
              loading="eager"
              decoding="async"
            />
            {mode === 'login' ? (
              <>
                <p className="text-sm leading-none font-bold tracking-[0.2em] mb-1.5 animate-fade-in"
                  style={{ color: '#0f172a', animationDuration: '0.8s', animationDelay: '0.5s', animationFillMode: 'both' }}>
                  DIHATI KAMPAR
                </p>
                <h1 className="text-3xl font-bold font-heading leading-none tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.08)] animate-fade-in"
                  style={{ background: 'linear-gradient(135deg, #10b981, #0ea5e9, #0284c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animationDuration: '0.8s', animationDelay: '0.8s', animationFillMode: 'both' }}>
                  DASHBOARD
                </h1>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold font-heading leading-none mb-1 tracking-wide text-slate-800 drop-shadow-[0_1px_2px_rgba(0,0,0,0.08)] animate-fade-in"
                  style={{ animationDuration: '0.8s', animationDelay: '0.5s', animationFillMode: 'both' }}>
                  {getTitle()}
                </h1>
                <p className="text-sm leading-none font-medium tracking-wide text-muted-foreground animate-fade-in"
                  style={{ animationDuration: '0.8s', animationDelay: '0.8s', animationFillMode: 'both' }}>
                  {getSubtitle()}
                </p>
              </>
            )}
          </div>

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5 animate-fade-in" style={{ animationDuration: '0.8s', animationDelay: '1.3s', animationFillMode: 'both' }}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="nama@email.com" className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-12 rounded-xl transition-all duration-300" {...loginForm.register('email')} />
                </div>
                {loginForm.formState.errors.email && <p className="text-red-400 text-xs mt-1">{loginForm.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground text-sm">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pl-10 pr-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-12 rounded-xl transition-all duration-300" {...loginForm.register('password')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && <p className="text-red-400 text-xs mt-1">{loginForm.formState.errors.password.message}</p>}
              </div>

              <div className="text-right">
                <button type="button" onClick={() => switchMode('forgot')} className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">
                  Lupa password?
                </button>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Login <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>

              <p className="text-center text-muted-foreground text-sm">
                Belum punya akun?{' '}
                <button type="button" onClick={() => switchMode('register')} className="text-primary hover:text-primary/80 font-medium transition-colors">Daftar sekarang</button>
              </p>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-foreground text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="reg-email" type="email" placeholder="nama@email.com" className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-12 rounded-xl transition-all duration-300" {...registerForm.register('email')} />
                </div>
                {registerForm.formState.errors.email && <p className="text-red-400 text-xs mt-1">{registerForm.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-foreground text-sm">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="Minimal 8 karakter" className="pl-10 pr-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-12 rounded-xl transition-all duration-300" {...registerForm.register('password')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {registerForm.formState.errors.password && <p className="text-red-400 text-xs mt-1">{registerForm.formState.errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-foreground text-sm">Konfirmasi Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} placeholder="Ulangi password" className="pl-10 pr-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-12 rounded-xl transition-all duration-300" {...registerForm.register('confirmPassword')} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {registerForm.formState.errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{registerForm.formState.errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Daftar <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>

              <p className="text-center text-muted-foreground text-sm">
                Sudah punya akun?{' '}
                <button type="button" onClick={() => switchMode('login')} className="text-primary hover:text-primary/80 font-medium transition-colors">Login</button>
              </p>
            </form>
          )}

          {/* Register OTP Verification */}
          {mode === 'register-otp' && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpValue} onChange={(value) => setOtpValue(value)}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-muted-foreground text-xs">Kode berlaku selama 5 menit</p>
              </div>

              <Button type="button" onClick={handleVerifyRegisterOtp} disabled={isLoading || otpValue.length !== 6} className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verifikasi Email <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>

              <button type="button" onClick={handleResendRegisterOtp} disabled={isLoading} className="flex items-center justify-center gap-2 w-full text-primary hover:text-primary/80 text-sm font-medium transition-colors">
                Kirim ulang kode
              </button>

              <button type="button" onClick={() => switchMode('register')} className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:text-foreground text-sm transition-colors">
                <ArrowLeft className="w-4 h-4" /> Kembali ke Registrasi
              </button>
            </div>
          )}

          {/* Registration Success */}
          {mode === 'registered' && (
            <div className="space-y-5 text-center">
              <div className="flex justify-center"><CheckCircle className="w-16 h-16 text-green-400" /></div>
              <div className="p-4 bg-muted/50 rounded-xl border border-border">
                <p className="text-foreground/80 text-sm leading-relaxed">Email Anda telah terverifikasi. Anda dapat login setelah mendapat <strong className="text-foreground">izin akses dari Admin</strong>.</p>
                <p className="text-muted-foreground text-xs mt-3">Hubungi admin untuk mendapatkan akses ke dashboard.</p>
              </div>
              <Button type="button" onClick={() => switchMode('login')} className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300">
                Kembali ke Login
              </Button>
            </div>
          )}

          {/* Forgot Password - Email Input */}
          {mode === 'forgot' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm text-center max-w-[280px]">
                  Masukkan email yang terdaftar, kami akan mengirim kode OTP untuk mereset password Anda
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-foreground text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="nama@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-12 rounded-xl transition-all duration-300"
                  />
                </div>
              </div>

              <Button type="button" onClick={handleForgotPassword} disabled={isLoading || !forgotEmail} className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Kirim Kode OTP <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>

              <button type="button" onClick={() => switchMode('login')} className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:text-foreground text-sm transition-colors">
                <ArrowLeft className="w-4 h-4" /> Kembali ke Login
              </button>
            </div>
          )}

          {/* Forgot Password - OTP Verification */}
          {mode === 'forgot-otp' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm text-center">
                  Masukkan 6 digit kode OTP yang dikirim ke <span className="font-semibold text-foreground">{forgotEmail}</span>
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpValue} onChange={(value) => setOtpValue(value)}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <p className="text-muted-foreground text-xs text-center">Kode berlaku selama 5 menit</p>

              <Button type="button" onClick={handleVerifyOtpAndReset} disabled={isLoading || otpValue.length !== 6} className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verifikasi <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>

              <button type="button" onClick={() => switchMode('forgot')} className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:text-foreground text-sm transition-colors">
                <ArrowLeft className="w-4 h-4" /> Kirim ulang kode
              </button>
            </div>
          )}

          {/* Reset Password - New Password */}
          {mode === 'reset-password' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-primary/20 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm text-center">
                  Buat password baru untuk akun Anda
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-foreground text-sm">Password Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-12 rounded-xl transition-all duration-300"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-foreground text-sm">Konfirmasi Password Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi password baru"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pl-10 pr-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-12 rounded-xl transition-all duration-300"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button type="button" onClick={handleResetPassword} disabled={isLoading} className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Reset Password <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>

              <button type="button" onClick={() => switchMode('login')} className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:text-foreground text-sm transition-colors">
                <ArrowLeft className="w-4 h-4" /> Kembali ke Login
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-muted-foreground/60 text-xs mt-6">
          © 2024 Posyandu Dashboard. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
