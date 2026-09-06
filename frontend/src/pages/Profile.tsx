// frontend/src/pages/Profile.tsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Lock,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Ticket,
  Wallet as WalletIcon,
  Camera,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPut, apiPost, apiUpload } from "../lib/apiClient";
import { formatMoney } from "../lib/constants";
import AccountNav from "../components/AccountNav";

interface Order {
  status: string;
  event_date: string;
}

function initialsFor(name?: string, email?: string) {
  const source = name?.trim() || email || "?";
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function Profile() {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [balance, setBalance] = useState<number | null>(null);
  const [eventsAttended, setEventsAttended] = useState<number | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
    setAvatarUrl(profile.avatar_url || null);
    fetchAccountStats();
  }, [profile]);

  const fetchAccountStats = async () => {
    setStatsError(null);

    const [balanceResult, ordersResult] = await Promise.allSettled([
      apiGet<{ balance: number }>("/api/wallet/balance"),
      apiGet<{ orders: Order[] }>("/api/orders"),
    ]);

    if (balanceResult.status === "fulfilled") {
      setBalance(balanceResult.value.balance);
    } else {
      console.error("Failed to fetch wallet balance:", balanceResult.reason);
      setStatsError(
        balanceResult.reason instanceof Error
          ? balanceResult.reason.message
          : "Failed to load balance"
      );
    }

    if (ordersResult.status === "fulfilled") {
      const now = new Date();
      const attended = (ordersResult.value.orders || []).filter(
        (o) => o.status === "paid" && new Date(o.event_date) < now
      ).length;
      setEventsAttended(attended);
    } else {
      console.error("Failed to fetch orders:", ordersResult.reason);
    }
  };

  // ─── Profile update ──────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!profile) {
      setProfileError("Please log in to update your profile");
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      await apiPut(`/api/users/${profile.id}`, { full_name: fullName, phone });
      setProfileSuccess("Profile updated successfully");
      await refreshProfile();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Avatar upload ───────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be under 2MB");
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      // Upload to backend
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiUpload<{ url: string }>("/api/uploads/avatar", formData);

      // Update profile with the new URL
      await apiPut(`/api/users/${profile.id}`, { avatar_url: response.url });
      setAvatarUrl(response.url);
      setAvatarError(null);
      await refreshProfile();
    } catch (err) {
      console.error("Avatar upload error:", err);
      setAvatarError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile || !avatarUrl) return;

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      // Update profile to remove avatar URL
      await apiPut(`/api/users/${profile.id}`, { avatar_url: null });
      setAvatarUrl(null);
      await refreshProfile();
    } catch (err) {
      console.error("Remove avatar error:", err);
      setAvatarError(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ─── Password change ─────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!profile) {
      setPasswordError("Please log in to change your password");
      return;
    }

    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword) {
      setPasswordError("Please fill in both password fields");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    setChangingPassword(true);
    try {
      await apiPost<{ success: boolean }>("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  // ─── Logout ──────────────────────────────────────────────────────
  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h1 className="font-display text-4xl mb-4">Please log in</h1>
        <p className="text-smoke mb-8">You need to be logged in to view your profile.</p>
        <Link to="/login" className="text-gold font-semibold">
          Log in →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 pb-24">
      <p className="text-xs font-bold tracking-widest uppercase text-gold mb-2">Account</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-6">My Profile</h1>

      <AccountNav />

      {statsError && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">Couldn't load your balance: {statsError}</p>
        </div>
      )}

      {avatarError && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{avatarError}</p>
        </div>
      )}

      {/* Identity Card */}
      <div className="bg-gradient-to-br from-panel to-ink border border-gold/20 rounded-2xl p-8 mb-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center overflow-hidden">
              {uploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-gold animate-spin" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-2xl text-gold">
                  {initialsFor(profile.full_name, profile.email)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold hover:bg-gold-bright disabled:opacity-60 text-ink flex items-center justify-center border-2 border-ink transition-colors"
              aria-label="Upload profile photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs disabled:opacity-50"
                aria-label="Remove avatar"
              >
                ×
              </button>
            )}
          </div>
          <div>
            <p className="font-display text-2xl text-bone">{profile.full_name || "Unnamed"}</p>
            <p className="text-sm text-smoke">{profile.email}</p>
            {uploadingAvatar && <p className="text-xs text-gold mt-1">Uploading photo...</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-line/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
              <WalletIcon className="w-4 h-4 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-smoke">Balance</p>
              <p className="text-sm font-bold text-bone truncate">
                {balance !== null ? formatMoney(balance, "NGN") : "···"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-smoke">Events attended</p>
              <p className="text-sm font-bold text-bone truncate">
                {eventsAttended !== null ? eventsAttended : "···"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-smoke">Member since</p>
              <p className="text-sm font-bold text-bone truncate">
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })
                  : "···"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Details */}
      <div className="bg-panel border border-line rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-gold mb-4">
          Personal Details
        </h2>

        {profileError && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-3 mb-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{profileError}</p>
          </div>
        )}
        {profileSuccess && (
          <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-3 mb-4 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-400">{profileSuccess}</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-smoke mb-1.5 block">Full name</label>
            <div className="relative">
              <User className="w-4 h-4 text-smoke absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-ink border border-line rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-gold/50"
                placeholder="Your full name"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-smoke mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-smoke absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full bg-ink/50 border border-line rounded-xl pl-10 pr-4 py-3 text-sm text-smoke outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-smoke mb-1.5 block">Phone number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-smoke absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-ink border border-line rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-gold/50"
                placeholder="+234 800 000 0000"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="mt-5 bg-gold hover:bg-gold-bright disabled:opacity-50 text-ink font-bold px-6 py-3 rounded-xl transition-colors"
        >
          {savingProfile ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Security */}
      <div className="bg-panel border border-line rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-gold mb-4">
          Security
        </h2>

        {passwordError && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-3 mb-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{passwordError}</p>
          </div>
        )}
        {passwordSuccess && (
          <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-3 mb-4 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-400">{passwordSuccess}</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-smoke mb-1.5 block">
              Current password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-smoke absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-ink border border-line rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-gold/50"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-smoke mb-1.5 block">New password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-smoke absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-ink border border-line rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-gold/50"
                placeholder="At least 8 characters"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-smoke mb-1.5 block">
              Confirm new password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-smoke absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-ink border border-line rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-gold/50"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={changingPassword}
          className="mt-5 border border-gold/40 hover:bg-gold/10 disabled:opacity-50 text-gold font-bold px-6 py-3 rounded-xl transition-colors"
        >
          {changingPassword ? "Updating..." : "Change Password"}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-panel border border-line rounded-2xl p-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-smoke mb-4">
          Session
        </h2>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 border border-line hover:border-red-400/40 text-smoke hover:text-red-400 text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  );
}