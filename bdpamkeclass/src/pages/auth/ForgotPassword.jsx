import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import bdpamkeLogo from "@/artifacts/BDPAmke.avif";

// ── Step 1: Enter email ────────────────────────────────────────────────────
function StepEmail({ onNext }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required."); return; }
    setError("");
    setLoading(true);
    try {
      await axios.post("/api/auth/forgot-password", { email: email.trim() });
      onNext(email.trim());
    } catch (err) {
      setError(err?.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the email address associated with your account. We'll send a 6-digit verification code.
      </p>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="space-y-1">
        <Label htmlFor="fp-email">Email Address</Label>
        <Input
          id="fp-email"
          type="email"
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending…" : "Send Code"}
      </Button>
    </form>
  );
}

// ── Step 2: Enter 6-digit code ────────────────────────────────────────────
function StepCode({ email, onNext, onResend }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  function handleDigit(index, value) {
    const v = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    if (v && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(""));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) { setError("Please enter all 6 digits."); return; }
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/verify-reset-code", { email, code });
      onNext(data.resetToken);
    } catch (err) {
      setError(err?.response?.data?.error || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setDigits(["", "", "", "", "", ""]);
    try {
      await axios.post("/api/auth/forgot-password", { email });
    } catch { /* silent */ } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A 6-digit code was sent to <strong>{email}</strong>. Enter it below.
      </p>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="space-y-1">
        <Label>Verification Code</Label>
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-12 text-center text-xl font-bold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-blue-50"
            />
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Verifying…" : "Verify Code"}
      </Button>
      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          {resending ? "Resending…" : "Resend code"}
        </button>
      </div>
    </form>
  );
}

// ── Step 3: Set new password ──────────────────────────────────────────────
function StepNewPassword({ resetToken, onDone }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { setError("Both fields are required."); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/reset-password", { resetToken, newPassword });
      onDone(data.updatedAccounts || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Create a new password for your account.
      </p>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="space-y-1">
        <Label htmlFor="np-new">New Password</Label>
        <Input
          id="np-new"
          type="password"
          placeholder="At least 6 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="np-confirm">Confirm Password</Label>
        <Input
          id="np-confirm"
          type="password"
          placeholder="Repeat your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving…" : "Change Password"}
      </Button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
const STEP_TITLES = ["Reset Your Password", "Enter Verification Code", "Set New Password"];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = email, 1 = code, 2 = new password
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [done, setDone] = useState(false);
  const [updatedAccounts, setUpdatedAccounts] = useState([]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center gap-2">
          <img src={bdpamkeLogo} alt="BDPAMKE" className="h-14 w-auto object-contain" />
          <CardTitle className="text-xl text-center">{done ? "Password Changed" : STEP_TITLES[step]}</CardTitle>
          {!done && (
            <div className="flex gap-1.5 mt-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? "bg-teal-500" : "bg-gray-200"}`} />
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
              <p className="text-green-600 font-medium text-center">✅ Your password has been updated successfully.</p>
              {updatedAccounts.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    {updatedAccounts.length === 1 ? "Account updated:" : `${updatedAccounts.length} accounts updated:`}
                  </p>
                  <ul className="space-y-1">
                    {updatedAccounts.map((username) => (
                      <li key={username} className="text-sm text-slate-600 flex items-center gap-2">
                        <span className="text-teal-500">✓</span>
                        <span className="font-mono">{username}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button className="w-full" onClick={() => navigate("/login")}>
                Sign In
              </Button>
            </div>
          ) : step === 0 ? (
            <StepEmail onNext={(e) => { setEmail(e); setStep(1); }} />
          ) : step === 1 ? (
            <StepCode email={email} onNext={(token) => { setResetToken(token); setStep(2); }} onResend={() => {}} />
          ) : (
            <StepNewPassword resetToken={resetToken} onDone={(accounts) => { setUpdatedAccounts(accounts); setDone(true); }} />
          )}
          {!done && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
