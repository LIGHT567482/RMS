import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GraduationCap, ShieldAlert, KeyRound } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { defaultSchool, getSchool, setSchool, useStore } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: WelcomePage,
});

function WelcomePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "setup" | "forgot">("signin");
  const [code, setCode] = useState("");
  const [code2, setCode2] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverPw, setRecoverPw] = useState("");
  const school = useStore(getSchool);

  useEffect(() => {
    const currentSchool = getSchool();
    const shouldClearLegacy = currentSchool.name === "AMPLE HIGH SCHOOL"
      || currentSchool.address === "Nateete Kampala, Muntundwe – Kanaala"
      || currentSchool.telephones === "0702263655 / 0781832089"
      || currentSchool.motto === "FORWARDEVER"
      || currentSchool.poBox === "4591 Kampala – UGANDA";

    if (shouldClearLegacy) {
      setSchool(defaultSchool);
    }

    if (auth.isAuthenticated) navigate({ to: "/dashboard" });
    setMode(auth.hasAccount ? "signin" : "setup");
  }, [auth.isAuthenticated, auth.hasAccount, navigate]);

  const validCode = (c: string) => /^\d{5,10}$/.test(c);
  const isSetup = mode === "setup";

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!validCode(code)) return toast.error("Access code must be 5–10 digits.");
    if (auth.signIn(code)) {
      toast.success("Welcome back.");
      navigate({ to: "/dashboard" });
    } else {
      toast.error("Incorrect access code.");
    }
  }

  function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!validCode(code)) return toast.error("Access code must be 5–10 digits.");
    if (code !== code2) return toast.error("Codes don't match.");

    setSchool(school);
    auth.setupAccount({
      accessCode: code,
      recoveryEmail: email || undefined,
      recoveryPassword: pw || undefined,
      securityQuestion: question || undefined,
      securityAnswer: answer || undefined,
    });
    toast.success("Account created. Welcome.");
    navigate({ to: "/dashboard" });
  }

  function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    const info = auth.getInfo();
    if (!info) return toast.error("No account exists yet.");
    const okEmail = info.recoveryEmail && info.recoveryEmail.toLowerCase() === recoverEmail.toLowerCase();
    const okPw = info.recoveryPassword && info.recoveryPassword === recoverPw;
    const okAns = info.securityAnswer && info.securityAnswer.toLowerCase() === answer.toLowerCase();
    if (!((okEmail && okPw) || okAns)) {
      return toast.error("Verification failed. Provide the correct email + password OR security answer.");
    }
    if (!validCode(code)) return toast.error("New code must be 5–10 digits.");
    auth.resetCode(code);
    toast.success("Access code reset. Sign in with your new code.");
    setMode("signin");
    setCode("");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[2fr_1fr] bg-background">
      {/* Left: hero */}
      <div className="relative hidden lg:flex items-center justify-center p-12 text-white overflow-hidden"
        style={{
          background: school.signInBackgroundUrl ? undefined : "linear-gradient(135deg, #f6d34f 0%, #f3b533 50%, #d7891c 100%)",
          backgroundImage: school.signInBackgroundUrl ? `url(${school.signInBackgroundUrl})` : undefined,
          backgroundSize: school.signInBackgroundUrl ? "cover" : undefined,
          backgroundPosition: school.signInBackgroundUrl ? "center" : undefined,
        }}>
        {school.signInBackgroundUrl ? <div className="absolute inset-0 bg-slate-950/50" /> : (
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 blur-3xl"
               style={{ background: "var(--gradient-gold)" }} />
        )}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center gap-8 max-w-lg">
          <div>
            <h1 className="font-display text-5xl leading-tight">
              {school.name}
            </h1>
            <p className="mt-4 text-white/80">
              {school.motto || "A complete offline platform for managing student records, marks, and printable report cards."}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/20 border border-destructive/40 text-sm">
            <ShieldAlert className="h-4 w-4" /> FOR STAFF USE ONLY
          </div>
          {(school.address || school.poBox || school.telephones) ? (
            <div className="text-xs text-white/60 space-y-1">
              {school.address ? <p>{school.address}</p> : null}
              {(school.poBox || school.telephones) ? (
                <p>{school.poBox ? `P.O. Box ${school.poBox}` : ""}{school.poBox && school.telephones ? " • " : ""}{school.telephones}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Right: forms */}
      <div className="flex items-center justify-center p-0 relative overflow-hidden bg-white h-full">
        <Card className="relative w-full h-full p-8 rounded-none flex items-center justify-center" style={{ boxShadow: "var(--shadow-elegant)" }}>
          <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full">
            <div className="lg:hidden mb-6 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl" style={{ background: "var(--gradient-hero)" }}>
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <h2 className="font-display text-2xl mt-3">{school.name}</h2>
              <p className="text-xs text-destructive mt-1">FOR STAFF USE ONLY</p>
            </div>

            <div className="flex flex-col items-center gap-4 mb-6 text-center">
              <div className="h-48 w-48 rounded-full overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center">
                {school.logoDataUrl ? (
                  <img src={school.logoDataUrl} alt="School logo" className="h-full w-full object-cover" />
                ) : (
                  <GraduationCap className="h-24 w-24 text-primary" />
                )}
              </div>
              <div className="flex items-center justify-center gap-2">
                <h2 className="font-display text-2xl">
                  {school.name}
                </h2>
              </div>
            </div>

          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4 text-center">
              <div>
                <Label htmlFor="code" className="mx-auto">Access Code (5–10 digits)</Label>
                <Input id="code" inputMode="numeric" maxLength={10} value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••" autoFocus className="text-2xl tracking-[0.5em] text-center font-mono" />
              </div>
              <Button type="submit" className="w-full" size="lg">Sign In</Button>
              <button type="button" onClick={() => setMode("forgot")}
                className="text-sm text-primary hover:underline w-full text-center">
                Forgotten access code?
              </button>
            </form>
          )}

          {mode === "setup" && (
            <form onSubmit={handleSetup} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create one administrator account. School branding will be configured in settings.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Access Code (5–10 digits)</Label>
                  <Input inputMode="numeric" maxLength={10} value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
                </div>
                <div>
                  <Label>Confirm Code</Label>
                  <Input inputMode="numeric" maxLength={10} value={code2}
                    onChange={(e) => setCode2(e.target.value.replace(/\D/g, ""))} required />
                </div>
              </div>
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">RECOVERY (if you forget your code)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>School Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label>Recovery Password</Label>
                    <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Security Question</Label>
                    <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. School founding year?" />
                  </div>
                  <div>
                    <Label>Security Answer</Label>
                    <Input value={answer} onChange={(e) => setAnswer(e.target.value)} />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg">Create Account & Sign In</Button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Verify by School Email + Password OR by answering your security question.
              </p>
              <div>
                <Label>School Email</Label>
                <Input type="email" value={recoverEmail} onChange={(e) => setRecoverEmail(e.target.value)} />
              </div>
              <div>
                <Label>Recovery Password</Label>
                <Input type="password" value={recoverPw} onChange={(e) => setRecoverPw(e.target.value)} />
              </div>
              <div className="text-center text-xs text-muted-foreground">— OR —</div>
              <div>
                <Label>Security Answer ({auth.getInfo()?.securityQuestion || "—"})</Label>
                <Input value={answer} onChange={(e) => setAnswer(e.target.value)} />
              </div>
              <div className="border-t pt-4">
                <Label>New Access Code (5–10 digits)</Label>
                <Input inputMode="numeric" maxLength={10} value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setMode("signin")}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">Reset Code</Button>
              </div>
            </form>
          )}
          </div>
        </Card>
      </div>
    </div>
  );
}
