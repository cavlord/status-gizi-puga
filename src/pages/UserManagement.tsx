import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Mail, 
  Copy, 
  Check, 
  ShieldAlert, 
  Loader2,
  UserX,
  UserCheck,
  Key,
  RefreshCw,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserData {
  id: string;
  email: string;
  verified: boolean;
  created_at: string;
  otp: string | null;
  otp_expiry: string | null;
  role?: string;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Verify admin status on mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated || !user?.email) {
        setIsCheckingAdmin(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-admin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ email: user.email }),
          }
        );

        const data = await response.json();
        setIsAdmin(data.isAdmin === true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, user?.email]);

  // Fetch users when admin is confirmed
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      // Use edge function to fetch users (bypasses RLS)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-get-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ adminEmail: user.email }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil data user");
      }

      setUsers(data.users || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(error.message || "Gagal memuat data user");
    } finally {
      setIsLoading(false);
    }
  };

  const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleGenerateOTP = async (targetUser: UserData) => {
    if (!user?.email) return;
    
    setSelectedUser(targetUser);
    setIsProcessing(true);
    
    try {
      const otp = generateOTP();
      // OTP berlaku selama 1 jam
      const otpExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            adminEmail: user.email,
            userId: targetUser.id,
            action: 'generate_otp',
            otp,
            otpExpiry
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat OTP");
      }

      setGeneratedOTP(otp);
      setShowOTPDialog(true);
      toast.success("OTP berhasil dibuat!");
      
      // Refresh user list
      fetchUsers();
    } catch (error: any) {
      console.error("Error generating OTP:", error);
      toast.error(error.message || "Gagal membuat OTP");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShowExistingOTP = (targetUser: UserData) => {
    setSelectedUser(targetUser);
    setGeneratedOTP(targetUser.otp);
    setShowOTPDialog(true);
  };

  const handleDeactivateUser = (targetUser: UserData) => {
    setSelectedUser(targetUser);
    setShowDeactivateDialog(true);
  };

  const confirmDeactivateUser = async () => {
    if (!selectedUser || !user?.email) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            adminEmail: user.email,
            userId: selectedUser.id,
            action: 'deactivate'
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Gagal menonaktifkan user");
      }

      toast.success(`User ${selectedUser.email} berhasil dinonaktifkan`);
      setShowDeactivateDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deactivating user:", error);
      toast.error(error.message || "Gagal menonaktifkan user");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActivateUser = async (targetUser: UserData) => {
    if (!user?.email) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            adminEmail: user.email,
            userId: targetUser.id,
            action: 'activate'
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengaktifkan user");
      }

      toast.success(`User ${targetUser.email} berhasil diaktifkan`);
      fetchUsers();
    } catch (error: any) {
      console.error("Error activating user:", error);
      toast.error(error.message || "Gagal mengaktifkan user");
    } finally {
      setIsProcessing(false);
    }
  };
  const handleDeleteUser = (targetUser: UserData) => {
    setSelectedUser(targetUser);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser || !user?.email) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            adminEmail: user.email,
            userId: selectedUser.id,
            action: 'delete'
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Gagal menghapus user");
      }

      toast.success(`User ${selectedUser.email} berhasil dihapus`);
      setShowDeleteDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Gagal menghapus user");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyOTP = () => {
    if (generatedOTP) {
      navigator.clipboard.writeText(generatedOTP);
      setCopied(true);
      toast.success("OTP berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isOTPValid = (otpExpiry: string | null): boolean => {
    if (!otpExpiry) return false;
    return new Date(otpExpiry) > new Date();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state while checking admin
  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
          <p className="text-muted-foreground mb-6">
            Anda harus login terlebih dahulu.
          </p>
          <Button onClick={() => navigate("/auth")}>
            Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
          <p className="text-muted-foreground mb-6">
            Halaman ini hanya dapat diakses oleh Admin.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Kembali ke Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen User</h1>
          <p className="text-muted-foreground">Kelola semua user yang terdaftar</p>
        </div>
        <Button onClick={fetchUsers} variant="outline" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Daftar User ({users.length})
          </CardTitle>
          <CardDescription>
            Semua user yang telah mendaftar di sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Belum ada user yang terdaftar
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Daftar</TableHead>
                    <TableHead>OTP</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {u.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.verified ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <UserX className="h-3 w-3 mr-1" />
                            Belum Verifikasi
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell>
                        {u.otp && isOTPValid(u.otp_expiry) ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-600 cursor-pointer" onClick={() => handleShowExistingOTP(u)}>
                            <Key className="h-3 w-3 mr-1" />
                            Lihat OTP
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateOTP(u)}
                            disabled={isProcessing}
                          >
                            <Key className="h-4 w-4 mr-1" />
                            OTP
                          </Button>
                          {u.verified ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeactivateUser(u)}
                              disabled={isProcessing || u.email === user?.email}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Nonaktif
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleActivateUser(u)}
                              disabled={isProcessing}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Aktifkan
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(u)}
                            disabled={isProcessing || u.email === user?.email}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OTP Dialog */}
      <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kode OTP</DialogTitle>
            <DialogDescription>
              Kode OTP untuk {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl font-bold tracking-[0.5em] text-primary">
                {generatedOTP}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyOTP}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Kode berlaku selama 1 jam
            </p>
          </div>
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <strong>Instruksi:</strong> Kirim kode ini ke user melalui WhatsApp, SMS, atau media lain.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOTPDialog(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan User?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menonaktifkan user <strong>{selectedUser?.email}</strong>. 
              User tidak akan bisa login sampai diaktifkan kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeactivateUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserX className="h-4 w-4 mr-2" />
              )}
              Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus user <strong>{selectedUser?.email}</strong> secara permanen. 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
