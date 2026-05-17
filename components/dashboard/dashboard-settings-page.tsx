"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { clearLocalHistoryBackups } from "@/lib/dashboard-history";
import { updateProfileViaApi } from "@/lib/profile-api";
import { createClient } from "@/lib/supabase/client";

const INPUT_CLASS =
  "w-full rounded-lg border border-white/[0.08] bg-[#1a1a24] px-4 py-3 text-sm text-white placeholder:text-[#71717a] outline-none transition-colors focus:border-[#7c3aed] disabled:opacity-60";

type DashboardSettingsPageProps = {
  initialUsername: string | null;
  memberSince: string | null;
  initials: string;
};

function formatMemberSince(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function DashboardSettingsPage({
  initialUsername,
  memberSince,
  initials,
}: DashboardSettingsPageProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername ?? "");
  const [email, setEmail] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("email");
  const [userId, setUserId] = useState<string | null>(null);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [clearingLocal, setClearingLocal] = useState(false);
  const [localClearMessage, setLocalClearMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? null);
      setUserId(user.id);
      const authProvider =
        typeof user.app_metadata?.provider === "string"
          ? user.app_metadata.provider
          : "email";
      setProvider(authProvider === "google" ? "Google" : "Email & password");
    }
    void loadAuth();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileSaving(true);

    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setProfileError("Username must be at least 2 characters.");
      setProfileSaving(false);
      return;
    }

    const result = await updateProfileViaApi(trimmed);
    if (!result.ok) {
      setProfileError(result.message);
      setProfileSaving(false);
      return;
    }

    setProfileSuccess("Profile updated.");
    setProfileSaving(false);
    router.refresh();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (provider !== "Email & password") {
      setPasswordError("Password changes are only available for email sign-in.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error("[settings] password update:", error.message);
      setPasswordError(error.message);
      setPasswordSaving(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordSuccess("Password updated.");
    setPasswordSaving(false);
  }

  function handleClearLocalData() {
    if (!userId) return;
    const confirmed = window.confirm(
      "Remove Speech Evaluator and Voice Coach backups stored in this browser? Cloud history in your account is not affected.",
    );
    if (!confirmed) return;

    setClearingLocal(true);
    setLocalClearMessage(null);
    try {
      clearLocalHistoryBackups(userId);
      setLocalClearMessage("Local history backups cleared on this device.");
    } catch {
      setLocalClearMessage("Could not clear local backups. Try again.");
    }
    setClearingLocal(false);
  }

  const isEmailUser = provider === "Email & password";

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Profile</h2>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Member since {formatMemberSince(memberSince)}
        </p>

        <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <motionlessDashboardShell>
              {initials}
            </motionlessDashboardShell>
            <div className="min-w-0 flex-1">
              <label
                htmlFor="settings-username"
                className="mb-1.5 block text-sm font-medium text-[#d4d4d8]"
              >
                Username
              </label>
              <input
                id="settings-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={INPUT_CLASS}
                autoComplete="username"
                disabled={profileSaving}
              />
            </div>
          </div>

          {profileError ? (
            <AuthAlert variant="error">{profileError}</AuthAlert>
          ) : null}
          {profileSuccess ? (
            <AuthAlert variant="success">{profileSuccess}</AuthAlert>
          ) : null}

          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {profileSaving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Account</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="text-[#9ca3af]">Email</dt>
            <dd className="mt-1 font-medium text-white">{email ?? "—"}</dd>
          </motionlessDashboardShell>
          <div>
            <dt className="text-[#9ca3af]">Sign-in method</dt>
            <dd className="mt-1 font-medium text-white">{provider}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Security</h2>
        {isEmailUser ? (
          <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="settings-new-password"
                className="mb-1.5 block text-sm font-medium text-[#d4d4d8]"
              >
                New password
              </label>
              <input
                id="settings-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={INPUT_CLASS}
                autoComplete="new-password"
                disabled={passwordSaving}
              />
            </div>
            <div>
              <label
                htmlFor="settings-confirm-password"
                className="mb-1.5 block text-sm font-medium text-[#d4d4d8]"
              >
                Confirm password
              </label>
              <input
                id="settings-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={INPUT_CLASS}
                autoComplete="new-password"
                disabled={passwordSaving}
              />
            </div>

            {passwordError ? (
              <AuthAlert variant="error">{passwordError}</AuthAlert>
            ) : null}
            {passwordSuccess ? (
              <AuthAlert variant="success">{passwordSuccess}</AuthAlert>
            ) : null}

            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordSaving ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-[#9ca3af]">
            You signed in with Google. Manage your password in your Google account.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Data on this device</h2>
        <p className="mt-2 text-sm text-[#9ca3af]">
          Clear browser-only session backups. Your cloud history in Supabase is
          not deleted.
        </p>
        {localClearMessage ? (
          <AuthAlert variant="info">{localClearMessage}</AuthAlert>
        ) : null}
        <button
          type="button"
          onClick={handleClearLocalData}
          disabled={clearingLocal || !userId}
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {clearingLocal ? "Clearing…" : "Clear local history backups"}
        </button>
      </section>
    </div>
  );
}
