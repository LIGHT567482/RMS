import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  useStore,
  getSchool,
  setSchool,
  defaultSchool,
  factoryReset,
  getAuth,
  setAuth,
  getAdminPassword,
  setAdminPassword,
  getGradingScale,
  setGradingScale,
  getAllSubjectPapers,
  setAllSubjectPapers,
  getCombinations,
  addCombination,
  deleteCombination,
  getOrdinarySubjects,
  setOrdinarySubjects,
  getAdvancedSubjects,
  setAdvancedSubjects,
  addOrdinarySubject,
  deleteOrdinarySubject,
  addAdvancedSubject,
  deleteAdvancedSubject,
  getPaperGradingConfig,
  setPaperGradingConfig,
  getStudents,
  updateStudent,
} from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Save,
  AlertTriangle,
  KeyRound,
  School,
  ShieldAlert,
  Sliders,
  BookOpen,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  COMPULSORY_SUBJECTS,
  OPTIONAL_SUBJECTS,
  ADVANCED_SUBJECTS,
  ALL_CLASSES,
  EXAM_SETS,
  type Combination,
  type ExamSet,
} from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  const ordinarySubjects = useStore(getOrdinarySubjects);
  const advancedSubjects = useStore(getAdvancedSubjects);
  const [gradingTab, setGradingTab] = useState<"view" | "edit">("view");
  const [selectedLevel, setSelectedLevel] = useState<"ordinary" | "advanced">("ordinary");
  const [selectedSubject, setSelectedSubject] = useState(ordinarySubjects[0]?.name ?? "English");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [editScale, setEditScale] = useState(() =>
    getGradingScale(ordinarySubjects[0]?.name ?? "English"),
  );
  const [papersTab, setPapersTab] = useState<"O" | "A">("O");
  const [subjectPapers, setSubjectPapers] = useState(() => getAllSubjectPapers());
  const combinations = useStore(getCombinations);
  const students = useStore(getStudents);
  const [newCombination, setNewCombination] = useState({
    name: "",
    shortForm: "",
    subjects: [] as string[],
  });
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectOptional, setNewSubjectOptional] = useState(false);
  const [selectedPaperGradingSubject, setSelectedPaperGradingSubject] = useState("");
  const [selectedPaperMode, setSelectedPaperMode] = useState<"individual" | "pairs" | "all">(
    "individual",
  );
  const [subjectToDelete, setSubjectToDelete] = useState<{ id: string; name: string } | null>(null);

  const subjectsForLevel = selectedLevel === "ordinary" ? ordinarySubjects : advancedSubjects;

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
    const allOrdinary = getOrdinarySubjects();
    if (allOrdinary.length && !allOrdinary.some((sub) => sub.name === selectedSubject)) {
      setSelectedSubject(allOrdinary[0].name);
      return;
    }
    setEditScale(getGradingScale(selectedSubject, selectedClass || undefined));
  }, [ordinarySubjects, selectedSubject, selectedClass, selectedLevel]);

  useEffect(() => {
    if (selectedPaperGradingSubject === "") {
      const allSubjects = selectedLevel === "ordinary" ? ordinarySubjects : advancedSubjects;
      if (allSubjects.length) {
        setSelectedPaperGradingSubject(allSubjects[0].name);
      }
    }
    setSelectedPaperMode(getPaperGradingConfig(selectedPaperGradingSubject));
  }, [selectedLevel, selectedPaperGradingSubject, ordinarySubjects, advancedSubjects]);

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
    toast.success(
      `Grading scale for ${selectedSubject}${selectedClass ? ` (${selectedClass})` : ""} saved.`,
    );
  }

  function saveSubjectPapers() {
    setAllSubjectPapers(subjectPapers);
    toast.success("Subject papers configuration saved.");
  }

  function handleAddSubject() {
    if (!newSubjectName.trim()) return toast.error("Enter subject name.");

    const s = {
      id: crypto.randomUUID(),
      name: newSubjectName.trim(),
      isOptional: newSubjectOptional,
    };

    const added = selectedLevel === "ordinary" ? addOrdinarySubject(s) : addAdvancedSubject(s);

    if (!added) {
      toast.error("Subject already exists.");
      return;
    }

    setNewSubjectName("");
    setNewSubjectOptional(false);
    toast.success("Subject added.");
  }

  function handleDeleteSubject(id: string) {
    const subject = subjectsForLevel.find((s) => s.id === id);
    if (subject) {
      setSubjectToDelete({ id, name: subject.name });
    }
  }

  function confirmDeleteSubject() {
    if (!subjectToDelete) return;
    if (selectedLevel === "ordinary") {
      deleteOrdinarySubject(subjectToDelete.id);
    } else {
      deleteAdvancedSubject(subjectToDelete.id);
    }
    toast.success(`Subject "${subjectToDelete.name}" deleted permanently.`);
    setSubjectToDelete(null);
  }

  function savePaperGradingConfig() {
    setPaperGradingConfig(selectedPaperGradingSubject, selectedPaperMode);
    toast.success(
      `Paper grading mode set to ${selectedPaperMode} for ${selectedPaperGradingSubject}.`,
    );
  }

  function handleAddCombination() {
    if (
      !newCombination.name.trim() ||
      !newCombination.shortForm.trim() ||
      newCombination.subjects.length === 0
    ) {
      toast.error("Please fill all fields and select at least one subject.");
      return;
    }

    const combo: Combination = {
      id: newCombination.shortForm.toUpperCase(),
      name: newCombination.name,
      shortForm: newCombination.shortForm.toUpperCase(),
      subjects: newCombination.subjects,
    };

    if (addCombination(combo)) {
      toast.success("Combination added successfully.");
      setNewCombination({ name: "", shortForm: "", subjects: [] });
    } else {
      toast.error("Combination with this short form already exists.");
    }
  }

  function handleDeleteCombination(id: string) {
    deleteCombination(id);
    toast.success("Combination deleted.");
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isFirstSetup ? "Set Admin Password" : "Enter Admin Password"}
            </DialogTitle>
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
    setSchool({ ...defaultSchool, ...draft });
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
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <School className="h-4 w-4" /> School Details
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex items-center gap-4">
                {draft.logoDataUrl ? (
                  <img
                    src={draft.logoDataUrl}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover border-2 border-[oklch(0.78_0.14_80)]"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground text-center">
                    SCHOOL
                    <br />
                    BADGE
                  </div>
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
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Motto</Label>
                <Input
                  value={draft.motto}
                  onChange={(e) => setDraft({ ...draft, motto: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Input
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                />
              </div>
              <div>
                <Label>P.O. Box</Label>
                <Input
                  value={draft.poBox}
                  onChange={(e) => setDraft({ ...draft, poBox: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Telephone Numbers</Label>
                <Input
                  value={draft.telephones}
                  onChange={(e) =>
                    setDraft({ ...draft, telephones: e.target.value.replace(/\D/g, "") })
                  }
                />
              </div>
              <div>
                <Label>Primary Color</Label>
                <Input
                  type="color"
                  value={draft.primaryColor ?? "#3c64ff"}
                  onChange={(e) => setDraft({ ...draft, primaryColor: e.target.value })}
                />
              </div>
              <div>
                <Label>Accent Color</Label>
                <Input
                  type="color"
                  value={draft.accentColor ?? "#f59e0b"}
                  onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })}
                />
              </div>
              <div>
                <Label>Background Color</Label>
                <Input
                  type="color"
                  value={draft.backgroundColor ?? "#f8fafc"}
                  onChange={(e) => setDraft({ ...draft, backgroundColor: e.target.value })}
                />
              </div>
              <div>
                <Label>Text Color (Light Mode)</Label>
                <Input
                  type="color"
                  value={draft.foregroundColor ?? "#111111"}
                  onChange={(e) => setDraft({ ...draft, foregroundColor: e.target.value })}
                />
              </div>
              <div>
                <Label>Dark Mode Background</Label>
                <Input
                  type="color"
                  value={draft.backgroundColorDark ?? "#0f172a"}
                  onChange={(e) => setDraft({ ...draft, backgroundColorDark: e.target.value })}
                />
              </div>
              <div>
                <Label>Text Color (Dark Mode)</Label>
                <Input
                  type="color"
                  value={draft.foregroundColorDark ?? "#f8fafc"}
                  onChange={(e) => setDraft({ ...draft, foregroundColorDark: e.target.value })}
                />
              </div>
              <div>
                <Label>Report Card Page Color (O-Level)</Label>
                <Input
                  type="color"
                  value={draft.reportCardPageColor ?? "#ffffff"}
                  onChange={(e) => setDraft({ ...draft, reportCardPageColor: e.target.value })}
                />
              </div>
              <div>
                <Label>Report Card Content Color (O-Level)</Label>
                <Input
                  type="color"
                  value={draft.reportCardContentColor ?? "#111111"}
                  onChange={(e) => setDraft({ ...draft, reportCardContentColor: e.target.value })}
                />
              </div>
              <div>
                <Label>Report Card Heading Color (O-Level)</Label>
                <Input
                  type="color"
                  value={draft.reportCardHeadingColor ?? "#3c64ff"}
                  onChange={(e) => setDraft({ ...draft, reportCardHeadingColor: e.target.value })}
                />
              </div>
              <div>
                <Label>Report Card Page Color (A-Level)</Label>
                <Input
                  type="color"
                  value={draft.reportCardPageColorAdvanced ?? "#f8fafc"}
                  onChange={(e) =>
                    setDraft({ ...draft, reportCardPageColorAdvanced: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Report Card Content Color (A-Level)</Label>
                <Input
                  type="color"
                  value={draft.reportCardContentColorAdvanced ?? "#111111"}
                  onChange={(e) =>
                    setDraft({ ...draft, reportCardContentColorAdvanced: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Report Card Heading Color (A-Level)</Label>
                <Input
                  type="color"
                  value={draft.reportCardHeadingColorAdvanced ?? "#dc2626"}
                  onChange={(e) =>
                    setDraft({ ...draft, reportCardHeadingColorAdvanced: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-2">Report Card Exam Sets</Label>
                <div className="grid grid-cols-3 gap-3">
                  {EXAM_SETS.map((set) => {
                    const selected = draft.selectedExamSets?.includes(set) ?? false;
                    return (
                      <label
                        key={set}
                        className="inline-flex items-center gap-2 rounded border border-input px-3 py-2 text-sm"
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const current = draft.selectedExamSets ?? ["EOT"];
                            if (checked) {
                              setDraft({
                                ...draft,
                                selectedExamSets: Array.from(new Set([...current, set])),
                              });
                            } else if (current.length > 1) {
                              setDraft({
                                ...draft,
                                selectedExamSets: current.filter((item) => item !== set),
                              });
                            }
                          }}
                        />
                        <span>{set}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Choose which exam sets should appear on report cards and be used to calculate
                  average subject marks.
                </p>
              </div>
              <div>
                <Label>Student ID Prefix</Label>
                <Input
                  value={draft.studentIdentificationPrefix ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      studentIdentificationPrefix: e.target.value
                        .replace(/[^A-Za-z0-9]/g, "")
                        .toUpperCase(),
                    })
                  }
                  placeholder="e.g. LIGHT"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Prefix used when generating Student Identification Numbers.
                </p>
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <Switch
                  id="watermark-colored"
                  checked={draft.reportCardWatermarkColored ?? true}
                  onCheckedChange={(value) =>
                    setDraft({ ...draft, reportCardWatermarkColored: Boolean(value) })
                  }
                />
                <Label htmlFor="watermark-colored" className="mb-0">
                  Colored report card watermark
                </Label>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={saveSchool}>
                <Save className="h-4 w-4 mr-1" /> Save School Details
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <BookOpen className="h-4 w-4" /> Candidate Registration Numbers
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter registration numbers for S.4 and S.6 candidates. Student IDs are generated
              automatically using the configured prefix.
            </p>
            {students.filter((s) => s.classLevel === "S.4" || s.classLevel === "S.6").length ===
            0 ? (
              <p className="text-sm text-muted-foreground">
                No S.4 or S.6 students currently enrolled.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-secondary-foreground">
                    <tr>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Class</th>
                      <th className="p-3 text-left">Student ID</th>
                      <th className="p-3 text-left">Registration Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter((s) => s.classLevel === "S.4" || s.classLevel === "S.6")
                      .map((student) => (
                        <tr key={student.id} className="border-t hover:bg-accent/10">
                          <td className="p-3">{student.name}</td>
                          <td className="p-3">{student.classLevel}</td>
                          <td className="p-3">{student.studentIdentificationNumber ?? "-"}</td>
                          <td className="p-3">
                            <Input
                              value={student.registrationNumber ?? ""}
                              onChange={(e) =>
                                updateStudent(student.id, {
                                  registrationNumber: e.target.value.trim() || undefined,
                                })
                              }
                              placeholder="Enter candidate registration number"
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <ShieldAlert className="h-4 w-4" /> Recovery & Security
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Security Question</Label>
                <Input
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  placeholder="e.g. LIGHT TECHNOLOGIES"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Security Answer</Label>
                <Input
                  type="password"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Answer for recovery"
                />
              </div>
              <div>
                <Label>Recovery Email</Label>
                <Input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Recovery Password</Label>
                <Input
                  type="password"
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={saveRecoverySettings}>Save Recovery Settings</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <BookOpen className="h-4 w-4" /> Subject Catalog
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Configure subjects separately for Ordinary and Advanced Levels.
            </p>

            <div className="mb-6 border-b pb-4">
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setSelectedLevel("ordinary")}
                  className={`px-4 py-2 rounded ${selectedLevel === "ordinary" ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-700"}`}
                >
                  Ordinary Level (S.1–S.4)
                </button>
                <button
                  onClick={() => setSelectedLevel("advanced")}
                  className={`px-4 py-2 rounded ${selectedLevel === "advanced" ? "bg-red-100 text-red-900" : "bg-slate-100 text-slate-700"}`}
                >
                  Advanced Level (S.5–S.6)
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="e.g. Agriculture"
                  />
                </div>
                {selectedLevel === "ordinary" && (
                  <div className="flex items-center gap-2 pb-2">
                    <Switch
                      checked={newSubjectOptional}
                      onCheckedChange={setNewSubjectOptional}
                      id="subject-optional"
                    />
                    <Label htmlFor="subject-optional">Optional (for S.2–S.4)</Label>
                  </div>
                )}
                {selectedLevel === "advanced" && (
                  <div className="text-sm text-muted-foreground pb-2">
                    All A-level subjects are compulsory
                  </div>
                )}
                <div className="flex items-end">
                  <Button onClick={handleAddSubject}>Add Subject</Button>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {subjectsForLevel.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-md border bg-card"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {s.isOptional ? "Optional" : "Compulsory"}
                      </span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleDeleteSubject(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Sliders className="h-4 w-4" /> Paper Grading Configuration
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Configure how to grade papers: individually, in pairs, or all together.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Level</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedLevel("ordinary")}
                    className={`px-3 py-2 text-sm rounded ${selectedLevel === "ordinary" ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-700"}`}
                  >
                    O-Level
                  </button>
                  <button
                    onClick={() => setSelectedLevel("advanced")}
                    className={`px-3 py-2 text-sm rounded ${selectedLevel === "advanced" ? "bg-red-100 text-red-900" : "bg-slate-100 text-slate-700"}`}
                  >
                    A-Level
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="paper-subject">Subject</Label>
                <select
                  id="paper-subject"
                  title="Subject"
                  value={selectedPaperGradingSubject}
                  onChange={(e) => setSelectedPaperGradingSubject(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  {subjectsForLevel.map((subject) => (
                    <option key={subject.id} value={subject.name}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded mb-4">
              <Label>Grading Mode</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="paper-individual"
                    name="paper-mode"
                    value="individual"
                    title="Individual Paper Grading"
                    checked={selectedPaperMode === "individual"}
                    onChange={(e) => setSelectedPaperMode(e.target.value as any)}
                  />
                  <Label htmlFor="paper-individual">Individual Paper Grading</Label>
                  <span className="text-xs text-muted-foreground">
                    Each paper has its own grade scale
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="paper-pairs"
                    name="paper-mode"
                    value="pairs"
                    title="Paired Paper Grading"
                    checked={selectedPaperMode === "pairs"}
                    onChange={(e) => setSelectedPaperMode(e.target.value as any)}
                  />
                  <Label htmlFor="paper-pairs">Paired Paper Grading</Label>
                  <span className="text-xs text-muted-foreground">
                    Papers 1–2 graded together, paper 3 separately
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="paper-all"
                    name="paper-mode"
                    value="all"
                    title="All Papers Together"
                    checked={selectedPaperMode === "all"}
                    onChange={(e) => setSelectedPaperMode(e.target.value as any)}
                  />
                  <Label htmlFor="paper-all">All Papers Together</Label>
                  <span className="text-xs text-muted-foreground">
                    Average all papers and apply grade scale
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={savePaperGradingConfig}>
                <Save className="h-4 w-4 mr-1" /> Save Paper Grading Config
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Sliders className="h-4 w-4" /> Grading Scales
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Configure custom grading scales per subject or subject/class combination.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="grading-subject">Subject</Label>
                <select
                  id="grading-subject"
                  title="Subject"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  {subjectsForLevel.map((subject) => (
                    <option key={subject.id} value={subject.name}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="grading-class">Class (Optional - leave empty for all)</Label>
                <select
                  id="grading-class"
                  title="Class"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
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
                  <Input
                    type="number"
                    value={editScale.ordinaA}
                    onChange={(e) =>
                      setEditScale({ ...editScale, ordinaA: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="text-xs">Grade B: ≥</Label>
                  <Input
                    type="number"
                    value={editScale.ordinaB}
                    onChange={(e) =>
                      setEditScale({ ...editScale, ordinaB: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="text-xs">Grade C: ≥</Label>
                  <Input
                    type="number"
                    value={editScale.ordinaC}
                    onChange={(e) =>
                      setEditScale({ ...editScale, ordinaC: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="text-xs">Grade D: ≥</Label>
                  <Input
                    type="number"
                    value={editScale.ordinaD}
                    onChange={(e) =>
                      setEditScale({ ...editScale, ordinaD: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-blue-50 p-4 rounded mb-4">
              <p className="font-semibold text-sm">
                Advanced Level (S.5-S.6) - Grades A-F (with points)
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Grade A: ≥</Label>
                  <Input
                    type="number"
                    value={editScale.advancedA}
                    onChange={(e) =>
                      setEditScale({ ...editScale, advancedA: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="text-xs">Grade B: ≥</Label>
                  <Input
                    type="number"
                    value={editScale.advancedB}
                    onChange={(e) =>
                      setEditScale({ ...editScale, advancedB: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="text-xs">Grade C: ≥</Label>
                  <Input
                    type="number"
                    value={editScale.advancedC}
                    onChange={(e) =>
                      setEditScale({ ...editScale, advancedC: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="text-xs">Grade D: ≥</Label>
                  <Input
                    type="number"
                    value={editScale.advancedD}
                    onChange={(e) =>
                      setEditScale({ ...editScale, advancedD: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="text-xs">Grade E: ≥</Label>
                  <Input
                    type="number"
                    value={editScale.advancedE}
                    onChange={(e) =>
                      setEditScale({ ...editScale, advancedE: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="text-xs">Grade O: ≥</Label>
                  <Input
                    type="number"
                    value={editScale.advancedO}
                    onChange={(e) =>
                      setEditScale({ ...editScale, advancedO: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="text-xs">Grade F: &lt; O</Label>
                  <div className="text-xs text-muted-foreground pt-2">Automatic</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setEditScale(getGradingScale(selectedSubject, selectedClass || undefined))
                }
              >
                Reset
              </Button>
              <Button onClick={saveGradingScale}>
                <Save className="h-4 w-4 mr-1" /> Save Grading Scale
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <BookOpen className="h-4 w-4" /> Subject Papers Configuration
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Configure the number of papers per subject for O-level and A-level.
            </p>

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
                        onChange={(e) =>
                          setSubjectPapers({
                            ...subjectPapers,
                            [`O:${subject}`]: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {ADVANCED_SUBJECTS.concat([
                    "GeneralPaper",
                    "SubsidiaryICT",
                    "SubsidiaryMath",
                  ]).map((subject) => (
                    <div key={subject}>
                      <Label className="text-xs">{subject}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={subjectPapers[`A:${subject}`] ?? 1}
                        onChange={(e) =>
                          setSubjectPapers({
                            ...subjectPapers,
                            [`A:${subject}`]: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={saveSubjectPapers}>
                <Save className="h-4 w-4 mr-1" /> Save Papers Configuration
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Sliders className="h-4 w-4" /> Advanced Level Combinations
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add or remove advanced-level combinations used across the system.
            </p>

            <div className="grid gap-4 sm:grid-cols-3 mb-4">
              <div>
                <Label>Combination Name</Label>
                <Input
                  value={newCombination.name}
                  onChange={(e) => setNewCombination({ ...newCombination, name: e.target.value })}
                  placeholder="e.g., Physics, Chemistry, Mathematics"
                />
              </div>
              <div>
                <Label>Short Form</Label>
                <Input
                  value={newCombination.shortForm}
                  onChange={(e) =>
                    setNewCombination({
                      ...newCombination,
                      shortForm: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., PCM"
                />
              </div>
              <div>
                <Label>Subjects</Label>
                <div className="grid gap-2 text-sm">
                  {ADVANCED_SUBJECTS.concat([
                    "GeneralPaper",
                    "SubsidiaryICT",
                    "SubsidiaryMath",
                  ]).map((subject) => (
                    <label key={subject} className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={newCombination.subjects.includes(subject)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewCombination({
                              ...newCombination,
                              subjects: [...newCombination.subjects, subject],
                            });
                          } else {
                            setNewCombination({
                              ...newCombination,
                              subjects: newCombination.subjects.filter((s) => s !== subject),
                            });
                          }
                        }}
                      />
                      {subject}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mb-6">
              <Button onClick={handleAddCombination}>
                <Save className="h-4 w-4 mr-1" /> Add Combination
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Existing Combinations</Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {combinations.map((combo) => (
                  <div
                    key={combo.id}
                    className="flex items-center justify-between rounded border p-3"
                  >
                    <div>
                      <p className="font-medium">{combo.shortForm}</p>
                      <p className="text-xs text-muted-foreground">{combo.name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCombination(combo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <KeyRound className="h-4 w-4" /> Reset Access Code
            </h2>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>New Access Code (5–10 digits)</Label>
                <Input
                  inputMode="numeric"
                  maxLength={10}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <Button onClick={changeCode}>Change Code</Button>
            </div>
          </Card>

          <Card className="p-6 border-destructive/40">
            <h2 className="font-semibold flex items-center gap-2 mb-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Factory reset wipes ALL data: students, marks, project work, school settings, and the
              access code. You'll be returned to first-time setup.
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

      {/* Confirmation Dialog for Subject Deletion */}
      <AlertDialog
        open={!!subjectToDelete}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>"{subjectToDelete?.name}"</strong> from the{" "}
              {selectedLevel === "ordinary" ? "Ordinary Level" : "Advanced Level"} catalog?
              <br />
              <br />
              This subject will not automatically reappear. You can only add it back by manually
              creating it again in this settings page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subject</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSubject}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
