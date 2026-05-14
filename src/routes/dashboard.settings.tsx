import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useStore, getSchool, setSchool, factoryReset, getAuth, setAuth, getAdminPassword, setAdminPassword, getGradingScale, setGradingScale, getAllSubjectPapers, setAllSubjectPapers } from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Save, AlertTriangle, KeyRound, School, ShieldAlert, Sliders, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { COMPULSORY_SUBJECTS, OPTIONAL_SUBJECTS, ADVANCED_SUBJECTS, ALL_CLASSES } from "@/lib/types";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const school = useStore(getSchool);
  const [draft, setDraft] = useState(school);
  const [newCode, setNewCode] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [gradingTab, setGradingTab] = useState<"view" | "edit">("view");
  const [selectedSubject, setSelectedSubject] = useState("English");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [editScale, setEditScale] = useState(getGradingScale("English"));
  const [papersTab, setPapersTab] = useState<"O" | "A">("O");
  const [subjectPapers, setSubjectPapers] = useState(() => getAllSubjectPapers());

  useEffect(() => {
    const adminPw = getAdminPassword();
    if (adminPw === null) {
      setIsFirstSetup(true);
      setShowPasswordDialog(true);
    } else {
      setShowPasswordDialog(true);
    }
  }, []);

  useEffect(() => {
    setEditScale(getGradingScale(selectedSubject, selectedClass || undefined));
  }, [selectedSubject, selectedClass]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const authData = getAuth();
    if (!authData) return;
    setRecoveryEmail(authData.recoveryEmail ?? "");
    setRecoveryPassword(authData.recoveryPassword ?? "");
    setSecurityQuestion(authData.securityQuestion ?? "");
    setSecurityAnswer(authData.securityAnswer ?? "");
  }, [isAuthenticated]);

  function handlePasswordSubmit() {
    const adminPw = getAdminPassword();
    if (isFirstSetup) {
      if (!password.trim()) return toast.error("Password is required.");
      if (password !== confirmPassword) return toast.error("Passwords do not match.");
      setAdminPassword(password);
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      toast.success("Admin password set.");
    } else {
      if (password === adminPw) {
        setIsAuthenticated(true);
        setShowPasswordDialog(false);
      } else {
        toast.error("Incorrect password.");
      }
    }
  }

  function saveRecoverySettings() {
    const authData = getAuth();
    if (!authData) {
      return toast.error("No access account found.");
    }
    setAuth({
      ...authData,
      recoveryEmail: recoveryEmail || undefined,
      recoveryPassword: recoveryPassword || undefined,
      securityQuestion: securityQuestion || undefined,
      securityAnswer: securityAnswer || undefined,
    });
    toast.success("Security settings saved.");
  }

  function saveGradingScale() {
    setGradingScale(selectedSubject, editScale, selectedClass || undefined);
    toast.success(`Grading scale for ${selectedSubject}${selectedClass ? ` (${selectedClass})` : ""} saved.`);
  }

  function saveSubjectPapers() {
    setAllSubjectPapers(subjectPapers);
    toast.success("Subject papers configuration saved.");
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isFirstSetup ? "Set Admin Password" : "Enter Admin Password"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            {isFirstSetup && (
              <div>
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handlePasswordSubmit}>
              {isFirstSetup ? "Set Password" : "Enter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setDraft({ ...draft, logoDataUrl: r.result as string });
    r.readAsDataURL(f);
  }

  function handleBackgroundImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setDraft({ ...draft, signInBackgroundUrl: r.result as string });
    r.readAsDataURL(f);
  }

  function saveSchool() {
    setSchool(draft);
    toast.success("School details saved.");
  }

  function changeCode() {
    if (!/^\d{5,10}$/.test(newCode)) return toast.error("Code must be 5–10 digits.");
    auth.resetCode(newCode);
    setNewCode("");
    toast.success("Access code changed.");
  }

  return (
    <div className="space-y-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="text-muted-foreground">School details, security, and system reset.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* Left Column */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><School className="h-4 w-4" /> School Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex items-center gap-4">
                {draft.logoDataUrl ? (
                  <img src={draft.logoDataUrl} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-[oklch(0.78_0.14_80)]" />
                ) : (
                  <div className="h-20 w-20 rounded-full border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground text-center">SCHOOL<br/>BADGE</div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>School Logo / Badge</Label>
                    <Input type="file" accept="image/*" onChange={handleLogo} />
                  </div>
                  <div>
                    <Label>Sign In Background</Label>
                    <Input type="file" accept="image/*" onChange={handleBackgroundImage} />
                  </div>
                </div>
              </div>
              <div>
                <Label>School Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <Label>Motto</Label>
                <Input value={draft.motto} onChange={(e) => setDraft({ ...draft, motto: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
              </div>
              <div>
                <Label>P.O. Box</Label>
                <Input value={draft.poBox} onChange={(e) => setDraft({ ...draft, poBox: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </div>
              <div>
                <Label>Primary Color</Label>
                <Input type="color" value={draft.primaryColor ?? "#3c64ff"}
                  onChange={(e) => setDraft({ ...draft, primaryColor: e.target.value })} />
              </div>
              <div>
                <Label>Accent Color</Label>
                <Input type="color" value={draft.accentColor ?? "#f59e0b"}
                  onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })} />
              </div>
              <div>
                <Label>Background Color</Label>
                <Input type="color" value={draft.backgroundColor ?? "#f8fafc"}
                  onChange={(e) => setDraft({ ...draft, backgroundColor: e.target.value })} />
              </div>
              <div>
                <Label>Text Color (Light Mode)</Label>
                <Input type="color" value={draft.foregroundColor ?? "#111111"}
                  onChange={(e) => setDraft({ ...draft, foregroundColor: e.target.value })} />
              </div>
              <div>
                <Label>Dark Mode Background</Label>
                <Input type="color" value={draft.backgroundColorDark ?? "#0f172a"}
                  onChange={(e) => setDraft({ ...draft, backgroundColorDark: e.target.value })} />
              </div>
              <div>
                <Label>Text Color (Dark Mode)</Label>
                <Input type="color" value={draft.foregroundColorDark ?? "#f8fafc"}
                  onChange={(e) => setDraft({ ...draft, foregroundColorDark: e.target.value })} />
              </div>
              <div>
                <Label>Report Card Page Color (O-Level)</Label>
                <Input type="color" value={draft.reportCardPageColor ?? "#ffffff"}
                  onChange={(e) => setDraft({ ...draft, reportCardPageColor: e.target.value })} />
              </div>
              <div>
                <Label>Report Card Content Color (O-Level)</Label>
                <Input type="color" value={draft.reportCardContentColor ?? "#111111"}
                  onChange={(e) => setDraft({ ...draft, reportCardContentColor: e.target.value })} />
              </div>
              <div>
                <Label>Report Card Heading Color (O-Level)</Label>
                <Input type="color" value={draft.reportCardHeadingColor ?? "#3c64ff"}
                  onChange={(e) => setDraft({ ...draft, reportCardHeadingColor: e.target.value })} />
              </div>
              <div>
                <Label>Report Card Page Color (A-Level)</Label>
                <Input type="color" value={draft.reportCardPageColorAdvanced ?? "#f8fafc"}
                  onChange={(e) => setDraft({ ...draft, reportCardPageColorAdvanced: e.target.value })} />
              </div>
              <div>
                <Label>Report Card Content Color (A-Level)</Label>
                <Input type="color" value={draft.reportCardContentColorAdvanced ?? "#111111"}
                  onChange={(e) => setDraft({ ...draft, reportCardContentColorAdvanced: e.target.value })} />
              </div>
              <div>
                <Label>Report Card Heading Color (A-Level)</Label>
                <Input type="color" value={draft.reportCardHeadingColorAdvanced ?? "#dc2626"}
                  onChange={(e) => setDraft({ ...draft, reportCardHeadingColorAdvanced: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Telephone Numbers</Label>
                <Input value={draft.telephones} onChange={(e) => setDraft({ ...draft, telephones: e.target.value })} />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={saveSchool}><Save className="h-4 w-4 mr-1" /> Save School Details</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><ShieldAlert className="h-4 w-4" /> Recovery & Security</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Security Question</Label>
                <Input value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} placeholder="e.g. What is the school motto?" />
              </div>
              <div className="sm:col-span-2">
                <Label>Security Answer</Label>
                <Input type="password" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Answer for recovery" />
              </div>
              <div>
                <Label>Recovery Email</Label>
                <Input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} />
              </div>
              <div>
                <Label>Recovery Password</Label>
                <Input type="password" value={recoveryPassword} onChange={(e) => setRecoveryPassword(e.target.value)} />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={saveRecoverySettings}>Save Recovery Settings</Button>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><Sliders className="h-4 w-4" /> Grading Scales</h2>
            <p className="text-sm text-muted-foreground mb-4">Configure custom grading scales per subject or subject/class combination.</p>
            
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <Label>Subject</Label>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                  <option>English</option>
                  <option>Mathematics</option>
                  <option>Physics</option>
                  <option>Chemistry</option>
                  <option>Geography</option>
                  <option>History</option>
                  <option>Biology</option>
                  <option>Computer</option>
                  <option>CRE</option>
                  <option>IRE</option>
                  <option>FineArt</option>
                  <option>Entrepreneurship</option>
                  <option>Luganda</option>
                </select>
              </div>
              <div>
                <Label>Class (Optional - leave empty for all)</Label>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="">All Classes</option>
                  <option value="S.1">S.1</option>
                  <option value="S.2">S.2</option>
                  <option value="S.3">S.3</option>
                  <option value="S.4">S.4</option>
                  <option value="S.5">S.5</option>
                  <option value="S.6">S.6</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded mb-4">
              <p className="font-semibold text-sm">Ordinary Level (S.1-S.4) - Grades A-E</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Grade A: ≥</Label>
                  <Input type="number" value={editScale.ordinaA} onChange={(e) => setEditScale({...editScale, ordinaA: parseInt(e.target.value) || 0})} min="0" max="100" />
                </div>
                <div>
                  <Label className="text-xs">Grade B: ≥</Label>
                  <Input type="number" value={editScale.ordinaB} onChange={(e) => setEditScale({...editScale, ordinaB: parseInt(e.target.value) || 0})} min="0" max="100" />
                </div>
                <div>
                  <Label className="text-xs">Grade C: ≥</Label>
                  <Input type="number" value={editScale.ordinaC} onChange={(e) => setEditScale({...editScale, ordinaC: parseInt(e.target.value) || 0})} min="0" max="100" />
                </div>
                <div>
                  <Label className="text-xs">Grade D: ≥</Label>
                  <Input type="number" value={editScale.ordinaD} onChange={(e) => setEditScale({...editScale, ordinaD: parseInt(e.target.value) || 0})} min="0" max="100" />
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-blue-50 p-4 rounded mb-4">
              <p className="font-semibold text-sm">Advanced Level (S.5-S.6) - Grades A-F (with points)</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Grade A: ≥</Label>
                  <Input type="number" value={editScale.advancedA} onChange={(e) => setEditScale({...editScale, advancedA: parseInt(e.target.value) || 0})} min="0" max="100" />
                </div>
                <div>
                  <Label className="text-xs">Grade B: ≥</Label>
                  <Input type="number" value={editScale.advancedB} onChange={(e) => setEditScale({...editScale, advancedB: parseInt(e.target.value) || 0})} min="0" max="100" />
                </div>
                <div>
                  <Label className="text-xs">Grade C: ≥</Label>
                  <Input type="number" value={editScale.advancedC} onChange={(e) => setEditScale({...editScale, advancedC: parseInt(e.target.value) || 0})} min="0" max="100" />
                </div>
                <div>
                  <Label className="text-xs">Grade D: ≥</Label>
                  <Input type="number" value={editScale.advancedD} onChange={(e) => setEditScale({...editScale, advancedD: parseInt(e.target.value) || 0})} min="0" max="100" />
                </div>
                <div>
                  <Label className="text-xs">Grade E: ≥</Label>
                  <Input type="number" value={editScale.advancedE} onChange={(e) => setEditScale({...editScale, advancedE: parseInt(e.target.value) || 0})} min="0" max="100" />
                </div>
                <div>
                  <Label className="text-xs">Grade O: ≥</Label>
                  <Input type="number" value={editScale.advancedO} onChange={(e) => setEditScale({...editScale, advancedO: parseInt(e.target.value) || 0})} min="0" max="100" />
                </div>
                <div>
                  <Label className="text-xs">Grade F: &lt; O</Label>
                  <div className="text-xs text-muted-foreground pt-2">Automatic</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditScale(getGradingScale(selectedSubject, selectedClass || undefined))}>Reset</Button>
              <Button onClick={saveGradingScale}><Save className="h-4 w-4 mr-1" /> Save Grading Scale</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4" /> Subject Papers Configuration</h2>
            <p className="text-sm text-muted-foreground mb-4">Configure the number of papers per subject for O-level and A-level.</p>
            
            <div className="flex gap-2 mb-4">
              <Button 
                variant={papersTab === "O" ? "default" : "outline"} 
                size="sm"
                onClick={() => setPapersTab("O")}
              >
                O-Level
              </Button>
              <Button 
                variant={papersTab === "A" ? "default" : "outline"} 
                size="sm"
                onClick={() => setPapersTab("A")}
              >
                A-Level
              </Button>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              {papersTab === "O" ? (
                <>
                  {[...COMPULSORY_SUBJECTS, ...OPTIONAL_SUBJECTS].map((subject) => (
                    <div key={subject}>
                      <Label className="text-xs">{subject}</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="10"
                        value={subjectPapers[`O:${subject}`] ?? 1}
                        onChange={(e) => setSubjectPapers({
                          ...subjectPapers,
                          [`O:${subject}`]: parseInt(e.target.value) || 1
                        })}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {ADVANCED_SUBJECTS.concat(["GeneralPaper", "SubsidiaryICT", "SubsidiaryMath"]).map((subject) => (
                    <div key={subject}>
                      <Label className="text-xs">{subject}</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="10"
                        value={subjectPapers[`A:${subject}`] ?? 1}
                        onChange={(e) => setSubjectPapers({
                          ...subjectPapers,
                          [`A:${subject}`]: parseInt(e.target.value) || 1
                        })}
                      />
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={saveSubjectPapers}><Save className="h-4 w-4 mr-1" /> Save Papers Configuration</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><KeyRound className="h-4 w-4" /> Reset Access Code</h2>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>New Access Code (5–10 digits)</Label>
                <Input inputMode="numeric" maxLength={10} value={newCode}
                  onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ""))} />
              </div>
              <Button onClick={changeCode}>Change Code</Button>
            </div>
          </Card>

          <Card className="p-6 border-destructive/40">
            <h2 className="font-semibold flex items-center gap-2 mb-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Factory reset wipes ALL data: students, marks, project work, school settings, and the access code.
              You'll be returned to first-time setup.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Factory Reset</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset everything?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes all data on this device. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      factoryReset();
                      auth.signOut();
                      toast.success("System reset.");
                      navigate({ to: "/" });
                    }}
                  >
                    Yes, reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        </div>
      </div>
    </div>
  );
}
