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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img
                src="/icon/logos.svg"
                alt="Logo Gizi X"
                className="w-14 h-14 object-contain"
              />
            </div>
            
            {mode === 'login' ? (
              <>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">
                  Dashboard GiziX
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Posyandu Dihati Kampar
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">
                  {mode === 'register' && 'Registrasi Akun'}
                  {mode === 'register-otp' && 'Verifikasi Email'}
                  {mode === 'registered' && 'Pendaftaran Berhasil'}
                  {mode === 'forgot' && 'Lupa Password'}
                  {mode === 'forgot-otp' && 'Verifikasi OTP'}
                  {mode === 'reset-password' && 'Reset Password'}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {mode === 'register' && 'Buat akun untuk akses sistem'}
                  {mode === 'register-otp' && `Kode telah dikirim ke ${registerEmail}`}
                  {mode === 'registered' && 'Akun Anda menunggu verifikasi admin'}
                  {mode === 'forgot' && 'Masukkan email terdaftar Anda'}
                  {mode === 'forgot-otp' && `Kode dikirim ke ${forgotEmail}`}
                  {mode === 'reset-password' && 'Buat password baru'}
                </p>
              </>
            )}
          </div>

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    className="pl-9 h-10"
                    {...loginForm.register('email')}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-foreground">Password</Label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs text-primary hover:underline font-normal"
                  >
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-9 pr-9 h-10"
                    {...loginForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 font-medium"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Masuk'
                )}
              </Button>

              <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border mt-4">
                Belum memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-primary hover:underline font-medium"
                >
                  Daftar
                </button>
              </div>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-email" className="text-xs font-medium text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="nama@email.com"
                    className="pl-9 h-10"
                    {...registerForm.register('email')}
                  />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-password" className="text-xs font-medium text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
                    className="pl-9 pr-9 h-10"
                    {...registerForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-medium text-foreground">Konfirmasi Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi password"
                    className="pl-9 pr-9 h-10"
                    {...registerForm.register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 font-medium"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Daftar'
                )}
              </Button>

              <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border mt-4">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-primary hover:underline font-medium"
                >
                  Masuk
                </button>
              </div>
            </form>
          )}

          {/* Register OTP */}
          {mode === 'register-otp' && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-muted rounded-full">
                  <KeyRound className="w-5 h-5 text-foreground" />
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
                <p className="text-xs text-muted-foreground">Kode berlaku selama 5 menit</p>
              </div>

              <Button
                onClick={handleVerifyRegisterOtp}
                disabled={isLoading || otpValue.length !== 6}
                className="w-full h-10 font-medium"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verifikasi'}
              </Button>

              <div className="flex flex-col items-center gap-2 pt-1 text-xs">
                <button
                  onClick={handleResendRegisterOtp}
                  disabled={isLoading}
                  className="text-primary hover:underline font-medium disabled:opacity-50"
                >
                  Kirim ulang kode OTP
                </button>
                <button
                  onClick={() => switchMode('register')}
                  className="inline-flex items-center text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Kembali ke registrasi
                </button>
              </div>
            </div>
          )}

          {/* Registered Success */}
          {mode === 'registered' && (
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <div className="p-3 bg-emerald-500/10 rounded-full">
                  <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="p-3.5 bg-muted/50 rounded-lg text-xs text-muted-foreground leading-relaxed">
                Email Anda berhasil diverifikasi. Silakan hubungi <strong>admin</strong> untuk persetujuan akun sebelum masuk.
              </div>
              <Button
                onClick={() => switchMode('login')}
                className="w-full h-10 font-medium"
              >
                Kembali ke Halaman Masuk
              </Button>
            </div>
          )}

          {/* Forgot Password */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="text-xs font-medium text-foreground">Email Terdaftar</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="nama@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
              </div>

              <Button
                onClick={handleForgotPassword}
                disabled={isLoading || !forgotEmail}
                className="w-full h-10 font-medium"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim Kode OTP'}
              </Button>

              <div className="pt-2 text-center">
                <button
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Kembali ke Halaman Masuk
                </button>
              </div>
            </div>
          )}

          {/* Forgot OTP */}
          {mode === 'forgot-otp' && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-muted rounded-full">
                  <KeyRound className="w-5 h-5 text-foreground" />
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
                <p className="text-xs text-muted-foreground">Kode berlaku selama 5 menit</p>
              </div>

              <Button
                onClick={handleVerifyOtpAndReset}
                disabled={isLoading || otpValue.length !== 6}
                className="w-full h-10 font-medium"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verifikasi Kode'}
              </Button>

              <div className="pt-1 text-center">
                <button
                  onClick={() => switchMode('forgot')}
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Ganti Email
                </button>
              </div>
            </div>
          )}

          {/* Reset Password */}
          {mode === 'reset-password' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs font-medium text-foreground">Password Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9 pr-9 h-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-new-password" className="text-xs font-medium text-foreground">Konfirmasi Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pl-9 pr-9 h-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleResetPassword}
                disabled={isLoading}
                className="w-full h-10 font-medium"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Password Baru'}
              </Button>

              <div className="pt-2 text-center">
                <button
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Batalkan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 Rossa Gusti Yolanda S.Gz. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;

// Made with Bob
