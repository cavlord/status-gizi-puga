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
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, CheckCircle, ArrowLeft, KeyRound, Sparkles, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    } catch (error: unknown) {
      toast({ title: 'Registrasi Gagal', description: error instanceof Error ? error.message : 'Terjadi kesalahan', variant: 'destructive' });
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
    } catch (error: unknown) {
      toast({ title: 'Verifikasi Gagal', description: error instanceof Error ? error.message : 'Verifikasi gagal', variant: 'destructive' });
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
    } catch (error: unknown) {
      toast({ title: 'Gagal', description: error instanceof Error ? error.message : 'Terjadi kesalahan', variant: 'destructive' });
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
    } catch (error: unknown) {
      toast({ title: 'Gagal', description: error instanceof Error ? error.message : 'Terjadi kesalahan', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async () => {
    if (otpValue.length !== 6) {
      toast({ title: 'Error', description: 'Kode OTP harus 6 digit', variant: 'destructive' });
      return;
    }
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
    } catch (error: unknown) {
      toast({ title: 'Verifikasi Gagal', description: error instanceof Error ? error.message : 'Verifikasi gagal', variant: 'destructive' });
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
    } catch (error: unknown) {
      toast({ title: 'Gagal', description: error instanceof Error ? error.message : 'Terjadi kesalahan', variant: 'destructive' });
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-2xl p-8">
          {/* Logo and Header */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="flex justify-center mb-4">
              <motion.img
                src="/icon/logos.svg"
                alt="Logo Gizi X"
                className="w-24 h-24 object-contain drop-shadow-2xl"
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {mode === 'login' ? (
                  <>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
                      Dashboard GiziX
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                      Dihati Kampar
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                      {mode === 'register' && 'Registrasi Akun'}
                      {mode === 'register-otp' && 'Verifikasi Email'}
                      {mode === 'registered' && 'Pendaftaran Berhasil'}
                      {mode === 'forgot' && 'Lupa Password'}
                      {mode === 'forgot-otp' && 'Verifikasi OTP'}
                      {mode === 'reset-password' && 'Reset Password'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {mode === 'register' && 'Buat akun baru untuk akses dashboard'}
                      {mode === 'register-otp' && `Kode dikirim ke ${registerEmail}`}
                      {mode === 'registered' && 'Akun Anda telah terdaftar'}
                      {mode === 'forgot' && 'Masukkan email untuk reset password'}
                      {mode === 'forgot-otp' && `Kode dikirim ke ${forgotEmail}`}
                      {mode === 'reset-password' && 'Buat password baru Anda'}
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Forms */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Login Form */}
              {mode === 'login' && (
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="nama@email.com"
                        className="pl-10 h-11 bg-muted/50 border-border focus:border-primary transition-all"
                        {...loginForm.register('email')}
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11 bg-muted/50 border-border focus:border-primary transition-all"
                        {...loginForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Lupa password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold rounded-xl shadow-lg transition-all"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Login <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Belum punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      Daftar sekarang
                    </button>
                  </p>
                </form>
              )}

              {/* Register Form */}
              {mode === 'register' && (
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="nama@email.com"
                        className="pl-10 h-11 bg-muted/50 border-border focus:border-primary transition-all"
                        {...registerForm.register('email')}
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimal 8 karakter"
                        className="pl-10 pr-10 h-11 bg-muted/50 border-border focus:border-primary transition-all"
                        {...registerForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-medium">Konfirmasi Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Ulangi password"
                        className="pl-10 pr-10 h-11 bg-muted/50 border-border focus:border-primary transition-all"
                        {...registerForm.register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold rounded-xl shadow-lg transition-all"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Daftar <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Sudah punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      Login
                    </button>
                  </p>
                </form>
              )}

              {/* Register OTP */}
              {mode === 'register-otp' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <KeyRound className="w-8 h-8 text-primary" />
                    </div>
                    <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    <p className="text-xs text-muted-foreground">Kode berlaku 5 menit</p>
                  </div>

                  <Button
                    onClick={handleVerifyRegisterOtp}
                    disabled={isLoading || otpValue.length !== 6}
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold rounded-xl shadow-lg transition-all"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verifikasi <ArrowRight className="w-5 h-5 ml-2" /></>}
                  </Button>

                  <button
                    onClick={handleResendRegisterOtp}
                    disabled={isLoading}
                    className="w-full text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Kirim ulang kode
                  </button>

                  <button
                    onClick={() => switchMode('register')}
                    className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Kembali
                  </button>
                </div>
              )}

              {/* Registered Success */}
              {mode === 'registered' && (
                <div className="space-y-6 text-center">
                  <div className="flex justify-center">
                    <div className="p-4 bg-emerald-500/10 rounded-full">
                      <CheckCircle className="w-16 h-16 text-emerald-500" />
                    </div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      Email terverifikasi! Hubungi <strong>admin</strong> untuk mendapat akses dashboard.
                    </p>
                  </div>
                  <Button
                    onClick={() => switchMode('login')}
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold rounded-xl shadow-lg transition-all"
                  >
                    Kembali ke Login
                  </Button>
                </div>
              )}

              {/* Forgot Password */}
              {mode === 'forgot' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 mb-6">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Masukkan email terdaftar untuk menerima kode OTP
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="nama@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="pl-10 h-11 bg-muted/50 border-border focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleForgotPassword}
                    disabled={isLoading || !forgotEmail}
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold rounded-xl shadow-lg transition-all"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Kirim OTP <ArrowRight className="w-5 h-5 ml-2" /></>}
                  </Button>

                  <button
                    onClick={() => switchMode('login')}
                    className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Kembali
                  </button>
                </div>
              )}

              {/* Forgot OTP */}
              {mode === 'forgot-otp' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <KeyRound className="w-8 h-8 text-primary" />
                    </div>
                    <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    <p className="text-xs text-muted-foreground">Kode berlaku 5 menit</p>
                  </div>

                  <Button
                    onClick={handleVerifyOtpAndReset}
                    disabled={isLoading || otpValue.length !== 6}
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold rounded-xl shadow-lg transition-all"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verifikasi <ArrowRight className="w-5 h-5 ml-2" /></>}
                  </Button>

                  <button
                    onClick={() => switchMode('forgot')}
                    className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Kembali
                  </button>
                </div>
              )}

              {/* Reset Password */}
              {mode === 'reset-password' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 mb-6">
                    <div className="p-4 bg-emerald-500/10 rounded-full">
                      <Lock className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Buat password baru untuk akun Anda
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-medium">Password Baru</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Minimal 8 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 bg-muted/50 border-border focus:border-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password" className="text-sm font-medium">Konfirmasi Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirm-new-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Ulangi password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 bg-muted/50 border-border focus:border-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleResetPassword}
                    disabled={isLoading}
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold rounded-xl shadow-lg transition-all"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Reset Password <ArrowRight className="w-5 h-5 ml-2" /></>}
                  </Button>

                  <button
                    onClick={() => switchMode('login')}
                    className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Kembali
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground/60 mt-6"
        >
          © 2024 Rossa Gusti Yolanda S.Gz. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default AuthPage;

// Made with Bob
