import { createFileRoute } from "@tanstack/react-router";
import { createElement, isValidElement, useEffect, useState, type ElementType, type ReactNode } from "react";
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
  getPaperGradingTarget,
  setPaperGradingTarget,
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
  Users,
  FileText,
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

function getPaperTargetOptions(
  subjectPapers: Record<string, number>,
  level: "ordinary" | "advanced",
  subject: string,
  mode: "individual" | "pairs" | "all",
) {
  const key = `${level === "ordinary" ? "O" : "A"}:${subject}`;
  const count = subjectPapers[key] ?? 1;
  if (mode === "all") return ["All Papers"];

  if (mode === "individual") {
    return Array.from({ length: Math.max(1, count) }, (_, index) => `Paper ${index + 1}`);
  }

  const targets: string[] = [];
  for (let i = 1; i <= Math.max(1, count); i += 2) {
    if (i + 1 <= count) {
      targets.push(`Papers ${i}-${i + 1}`);
    } else {
      targets.push(`Paper ${i}`);
    }
  }

  return targets.length ? targets : ["All Papers"];
}

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const school = useStore(getSchool);
  const [activeSection, setActiveSection] = useState<string | null>(null);
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
  const [selectedPaperTarget, setSelectedPaperTarget] = useState("All Papers");
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
    if (selectedPaperGradingSubject) {
      setSelectedPaperMode(getPaperGradingConfig(selectedPaperGradingSubject));
      const savedTarget = getPaperGradingTarget(selectedPaperGradingSubject);
      setSelectedPaperTarget(
        savedTarget ?? getPaperTargetOptions(subjectPapers, selectedLevel, selectedPaperGradingSubject, getPaperGradingConfig(selectedPaperGradingSubject))[0],
      );
    }
  }, [selectedLevel, selectedPaperGradingSubject, ordinarySubjects, advancedSubjects, subjectPapers]);

  useEffect(() => {
    if (!selectedPaperGradingSubject) return;
    const options = getPaperTargetOptions(subjectPapers, selectedLevel, selectedPaperGradingSubject, selectedPaperMode);
    if (!options.includes(selectedPaperTarget)) {
      setSelectedPaperTarget(options[0]);
    }
  }, [selectedPaperMode, selectedPaperGradingSubject, selectedLevel, subjectPapers, selectedPaperTarget]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const authData = getAuth();
    if (!authData) return;
    setRecoveryEmail(authData.recoveryEmail ?? "");
    setRecoveryPassword(authData.recoveryPassword ?? "");
    setSecurityQuestion(authData.securityQuestion ?? "");
    setSecurityAnswer(authData.securityAnswer ?? "");
  }, [isAuthenticated]);

  function isValidAdminPassword(value: string) {
    const isValidLength = value.length >= 8 && value.length <= 10;
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasDigit = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value);
    return isValidLength && hasUppercase && hasLowercase && hasDigit && hasSpecial;
  }

  function handlePasswordSubmit() {
    const adminPw = getAdminPassword();
    if (isFirstSetup) {
      if (!password.trim()) return toast.error("Password is required.");
      if (!isValidAdminPassword(password)) {
        return toast.error(
          "Password must be 8-10 characters and include an uppercase letter, a lowercase letter, a digit, and a special character.",
        );
      }
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
    setPaperGradingTarget(selectedPaperGradingSubject, selectedPaperTarget);
    toast.success(
      `Paper grading mode set to ${selectedPaperMode} for ${selectedPaperGradingSubject} (${selectedPaperTarget}).`,
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
        <DialogContent className="bg-muted border border-primary/15 text-card-foreground shadow-sm">
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
                className="bg-muted"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              {isFirstSetup && (
                <p className="mt-2 text-xs text-muted-foreground">
                  8–10 chars, including uppercase, lowercase, digit, and special character.
                </p>
              )}
            </div>
            {isFirstSetup && (
              <div>
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  className="bg-muted"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              className="bg-primary/15 text-primary hover:bg-primary/20"
              onClick={handlePasswordSubmit}
            >
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
      <div className="max-w-7xl mx-auto">
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="text-muted-foreground">School details, security, and system reset.</p>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-5 gap-6 min-h-screen">
          {/* Left Sidebar Navigation - 1/5 width */}
          <div className="col-span-1">
            <Card className="sticky top-6">
              <div className="p-4 space-y-2">
                <NavButton
                  icon={School}
                  label="School Details"
                  section="school"
                  active={activeSection === "school"}
                  onClick={() => setActiveSection("school")}
                />
                <NavButton
                  icon={BookOpen}
                  label="Candidate Reg. No."
                  section="candidates"
                  active={activeSection === "candidates"}
                  onClick={() => setActiveSection("candidates")}
                />
                <NavButton
                  icon={Users}
                  label="Students"
                  section="students"
                  active={activeSection === "students"}
                  onClick={() => {
                    setActiveSection("students");
                    navigate({ to: "/dashboard/students" });
                  }}
                />
                <NavButton
                  icon={FileText}
                  label="Report Cards"
                  section="reports"
                  active={activeSection === "reports"}
                  onClick={() => {
                    setActiveSection("reports");
                    navigate({ to: "/dashboard/reports" });
                  }}
                />
                <NavButton
                  icon={ShieldAlert}
                  label="Recovery & Security"
                  section="security"
                  active={activeSection === "security"}
                  onClick={() => setActiveSection("security")}
                />
                <NavButton
                  icon={BookOpen}
                  label="Subject Catalog"
                  section="subjects"
                  active={activeSection === "subjects"}
                  onClick={() => setActiveSection("subjects")}
                />
                <NavButton
                  icon={Sliders}
                  label="Grading Settings"
                  section="gradingScales"
                  active={activeSection === "gradingScales"}
                  onClick={() => setActiveSection("gradingScales")}
                />
                <NavButton
                  icon={BookOpen}
                  label="Subject Papers"
                  section="papers"
                  active={activeSection === "papers"}
                  onClick={() => setActiveSection("papers")}
                />
                <NavButton
                  icon={Sliders}
                  label="A-Level Combinations"
                  section="combinations"
                  active={activeSection === "combinations"}
                  onClick={() => setActiveSection("combinations")}
                />
                <NavButton
                  icon={KeyRound}
                  label="Reset Access Code"
                  section="accessCode"
                  active={activeSection === "accessCode"}
                  onClick={() => setActiveSection("accessCode")}
                />
                <NavButton
                  icon={AlertTriangle}
                  label="Danger Zone"
                  section="danger"
                  active={activeSection === "danger"}
                  onClick={() => setActiveSection("danger")}
                  variant="destructive"
                />
              </div>
            </Card>
          </div>

          {/* Right Content Area - 4/5 width */}
          <div className="col-span-4">
            {activeSection === null ? (
              <Card className="p-12 text-center text-muted-foreground">
                <p className="text-lg">Select a settings section from the menu on the left</p>
              </Card>
            ) : activeSection === "school" ? (
              <SchoolDetailsSection draft={draft} setDraft={setDraft} onSave={saveSchool} />
            ) : activeSection === "candidates" ? (
              <CandidatesSection students={students} />
            ) : activeSection === "security" ? (
              <SecuritySection
                securityQuestion={securityQuestion}
                setSecurityQuestion={setSecurityQuestion}
                securityAnswer={securityAnswer}
                setSecurityAnswer={setSecurityAnswer}
                recoveryEmail={recoveryEmail}
                setRecoveryEmail={setRecoveryEmail}
                recoveryPassword={recoveryPassword}
                setRecoveryPassword={setRecoveryPassword}
                onSave={saveRecoverySettings}
              />
            ) : activeSection === "subjects" ? (
              <SubjectCatalogSection
                selectedLevel={selectedLevel}
                setSelectedLevel={setSelectedLevel}
                newSubjectName={newSubjectName}
                setNewSubjectName={setNewSubjectName}
                newSubjectOptional={newSubjectOptional}
                setNewSubjectOptional={setNewSubjectOptional}
                subjectsForLevel={subjectsForLevel}
                onAddSubject={handleAddSubject}
                onDeleteSubject={handleDeleteSubject}
              />
            ) : activeSection === "gradingScales" ? (
              <GradingScalesSection
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                subjectsForLevel={subjectsForLevel}
                editScale={editScale}
                setEditScale={setEditScale}
                selectedLevel={selectedLevel}
                setSelectedLevel={setSelectedLevel}
                selectedPaperGradingSubject={selectedPaperGradingSubject}
                setSelectedPaperGradingSubject={setSelectedPaperGradingSubject}
                selectedPaperMode={selectedPaperMode}
                setSelectedPaperMode={setSelectedPaperMode}
                selectedPaperTarget={selectedPaperTarget}
                setSelectedPaperTarget={setSelectedPaperTarget}
                subjectPapers={subjectPapers}
                onSave={saveGradingScale}
                onReset={() =>
                  setEditScale(getGradingScale(selectedSubject, selectedClass || undefined))
                }
                onSavePaperGradingConfig={savePaperGradingConfig}
              />
            ) : activeSection === "papers" ? (
              <SubjectPapersSection
                papersTab={papersTab}
                setPapersTab={setPapersTab}
                subjectPapers={subjectPapers}
                setSubjectPapers={setSubjectPapers}
                onSave={saveSubjectPapers}
              />
            ) : activeSection === "combinations" ? (
              <CombinationsSection
                newCombination={newCombination}
                setNewCombination={setNewCombination}
                combinations={combinations}
                onAddCombination={handleAddCombination}
                onDeleteCombination={handleDeleteCombination}
              />
            ) : activeSection === "accessCode" ? (
              <AccessCodeSection newCode={newCode} setNewCode={setNewCode} onChange={changeCode} />
            ) : activeSection === "danger" ? (
              <DangerZoneSection auth={auth} navigate={navigate} />
            ) : null}
          </div>
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

// Navigation Button Component
function NavButton({
  icon,
  label,
  section,
  active,
  onClick,
  variant = "default",
}: {
  icon: ReactNode | ElementType;
  label: string;
  section: string;
  active: boolean;
  onClick: () => void;
  variant?: "default" | "destructive";
}) {
  const iconElement = isValidElement(icon)
    ? icon
    : icon && (typeof icon === "function" || typeof icon === "object")
    ? createElement(icon as ElementType, { className: "h-4 w-4" })
    : null;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
        active
          ? variant === "destructive"
            ? "bg-destructive/20 text-destructive font-semibold"
            : "bg-primary/20 text-primary font-semibold"
          : "text-foreground hover:bg-accent"
      }`}
    >
      {iconElement}
      <span className="text-sm">{label}</span>
    </button>
  );
}

// Section Components
function SchoolDetailsSection({
  draft,
  setDraft,
  onSave,
}: {
  draft: any;
  setDraft: (draft: any) => void;
  onSave: () => void;
}) {
  return (
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
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => setDraft({ ...draft, logoDataUrl: r.result as string });
                  r.readAsDataURL(f);
                }}
              />
            </div>
            <div>
              <Label>Sign In Background</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => setDraft({ ...draft, signInBackgroundUrl: r.result as string });
                  r.readAsDataURL(f);
                }}
              />
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
            placeholder="123456789/0987654321"
            value={draft.telephones}
            onChange={(e) =>
              setDraft({ ...draft, telephones: e.target.value.replace(/[^0-9/ ]/g, "") })
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
        <Button onClick={onSave}>
          <Save className="h-4 w-4 mr-1" /> Save School Details
        </Button>
      </div>
    </Card>
  );
}

function CandidatesSection({ students }: { students: any[] }) {
  const s4Students = students.filter((s) => s.classLevel === "S.4");
  const s6Students = students.filter((s) => s.classLevel === "S.6");

  return (
    <Card className="p-6">
      <h2 className="font-semibold flex items-center gap-2 mb-4">
        <BookOpen className="h-4 w-4" /> Candidate Registration Numbers
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Enter registration numbers for S.4 and S.6 candidates. Student IDs are generated
        automatically using the configured prefix.
      </p>
      {s4Students.length === 0 && s6Students.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No S.4 or S.6 students currently enrolled.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted p-4">
            <h3 className="text-base font-semibold mb-3">S.4 Candidates</h3>
            {s4Students.length === 0 ? (
              <p className="text-sm text-muted-foreground">No S.4 candidates found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead className="bg-secondary/15 text-secondary-foreground">
                    <tr>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Student ID</th>
                      <th className="p-3 text-left">Registration Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s4Students.map((student) => (
                      <tr key={student.id} className="border-t hover:bg-accent/10">
                        <td className="p-3">{student.name}</td>
                        <td className="p-3">{student.studentIdentificationNumber ?? "-"}</td>
                        <td className="p-3">
                          <Input
                            className="max-w-[12rem]"
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
          </div>

          <div className="rounded-lg border border-border bg-muted p-4">
            <h3 className="text-base font-semibold mb-3">S.6 Candidates</h3>
            {s6Students.length === 0 ? (
              <p className="text-sm text-muted-foreground">No S.6 candidates found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead className="bg-secondary/15 text-secondary-foreground">
                    <tr>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Student ID</th>
                      <th className="p-3 text-left">Registration Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s6Students.map((student) => (
                      <tr key={student.id} className="border-t hover:bg-accent/10">
                        <td className="p-3">{student.name}</td>
                        <td className="p-3">{student.studentIdentificationNumber ?? "-"}</td>
                        <td className="p-3">
                          <Input
                            className="max-w-[12rem]"
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
          </div>
        </div>
      )}
    </Card>
  );
}

function SecuritySection({
  securityQuestion,
  setSecurityQuestion,
  securityAnswer,
  setSecurityAnswer,
  recoveryEmail,
  setRecoveryEmail,
  recoveryPassword,
  setRecoveryPassword,
  onSave,
}: {
  securityQuestion: string;
  setSecurityQuestion: (value: string) => void;
  securityAnswer: string;
  setSecurityAnswer: (value: string) => void;
  recoveryEmail: string;
  setRecoveryEmail: (value: string) => void;
  recoveryPassword: string;
  setRecoveryPassword: (value: string) => void;
  onSave: () => void;
}) {
  return (
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
        <Button onClick={onSave}>Save Recovery Settings</Button>
      </div>
    </Card>
  );
}

function SubjectCatalogSection({
  selectedLevel,
  setSelectedLevel,
  newSubjectName,
  setNewSubjectName,
  newSubjectOptional,
  setNewSubjectOptional,
  subjectsForLevel,
  onAddSubject,
  onDeleteSubject,
}: {
  selectedLevel: "ordinary" | "advanced";
  setSelectedLevel: (level: "ordinary" | "advanced") => void;
  newSubjectName: string;
  setNewSubjectName: (name: string) => void;
  newSubjectOptional: boolean;
  setNewSubjectOptional: (optional: boolean) => void;
  subjectsForLevel: any[];
  onAddSubject: () => void;
  onDeleteSubject: (id: string) => void;
}) {
  return (
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
            className={`px-4 py-2 rounded ${
              selectedLevel === "ordinary" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            Ordinary Level (S.1–S.4)
          </button>
          <button
            onClick={() => setSelectedLevel("advanced")}
            className={`px-4 py-2 rounded ${
              selectedLevel === "advanced" ? "bg-secondary/15 text-secondary" : "bg-muted text-muted-foreground"
            }`}
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
            <Button onClick={onAddSubject}>Add Subject</Button>
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
            <Button size="icon" variant="ghost" onClick={() => onDeleteSubject(s.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function GradingScalesSection({
  selectedSubject,
  setSelectedSubject,
  selectedClass,
  setSelectedClass,
  subjectsForLevel,
  editScale,
  setEditScale,
  onSave,
  onReset,
  selectedLevel,
  setSelectedLevel,
  selectedPaperGradingSubject,
  setSelectedPaperGradingSubject,
  selectedPaperMode,
  setSelectedPaperMode,
  selectedPaperTarget,
  setSelectedPaperTarget,
  subjectPapers,
  onSavePaperGradingConfig,
}: {
  selectedSubject: string;
  setSelectedSubject: (subject: string) => void;
  selectedClass: string;
  setSelectedClass: (classLevel: string) => void;
  subjectsForLevel: any[];
  editScale: any;
  setEditScale: (scale: any) => void;
  onSave: () => void;
  onReset: () => void;
  selectedLevel: "ordinary" | "advanced";
  setSelectedLevel: (level: "ordinary" | "advanced") => void;
  selectedPaperGradingSubject: string;
  setSelectedPaperGradingSubject: (subject: string) => void;
  selectedPaperMode: "individual" | "pairs" | "all";
  setSelectedPaperMode: (mode: "individual" | "pairs" | "all") => void;
  selectedPaperTarget: string;
  setSelectedPaperTarget: (target: string) => void;
  subjectPapers: Record<string, number>;
  onSavePaperGradingConfig: () => void;
}) {
  return (
    <Card className="p-6">
      <h2 className="font-semibold flex items-center gap-2 mb-4">
        <Sliders className="h-4 w-4" /> Grading Configuration
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Configure grading scales, paper grading mode, and subject paper counts in one central place.
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

      <div className="space-y-3 bg-muted p-4 rounded mb-4">
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

      <div className="space-y-3 bg-muted p-4 rounded mb-4">
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

      <div className="space-y-3 bg-muted p-4 rounded mb-4">
        <h3 className="font-semibold text-sm mb-3">Paper Grading Mode</h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Level</Label>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setSelectedLevel("ordinary")}
                className={`px-3 py-2 text-sm rounded ${
                  selectedLevel === "ordinary"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                O-Level
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevel("advanced")}
                className={`px-3 py-2 text-sm rounded ${
                  selectedLevel === "advanced"
                    ? "bg-secondary/15 text-secondary"
                    : "bg-muted text-muted-foreground"
                }`}
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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="paper-individual"
              name="paper-mode"
              value="individual"
              checked={selectedPaperMode === "individual"}
              onChange={(e) => setSelectedPaperMode(e.target.value as any)}
            />
            <Label htmlFor="paper-individual">Individual Paper Grading</Label>
            <span className="text-xs text-muted-foreground">
              Each paper is graded with its own scale.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="paper-pairs"
              name="paper-mode"
              value="pairs"
              checked={selectedPaperMode === "pairs"}
              onChange={(e) => setSelectedPaperMode(e.target.value as any)}
            />
            <Label htmlFor="paper-pairs">Paired Paper Grading</Label>
            <span className="text-xs text-muted-foreground">
              Papers 1–2 are graded together, paper 3 separately.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="paper-all"
              name="paper-mode"
              value="all"
              checked={selectedPaperMode === "all"}
              onChange={(e) => setSelectedPaperMode(e.target.value as any)}
            />
            <Label htmlFor="paper-all">All Papers Together</Label>
            <span className="text-xs text-muted-foreground">
              Average all papers and apply the selected grade scale.
            </span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="paper-target">Apply To</Label>
            <select
              id="paper-target"
              title="Paper group"
              value={selectedPaperTarget}
              onChange={(e) => setSelectedPaperTarget(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              {getPaperTargetOptions(subjectPapers, selectedLevel, selectedPaperGradingSubject, selectedPaperMode).map(
                (target) => (
                  <option key={target} value={target}>
                    {target}
                  </option>
                ),
              )}
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              Choose the paper or paper group this grading mode should apply to.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onSavePaperGradingConfig}>
            <Save className="h-4 w-4 mr-1" /> Save Paper Grading
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onReset}>
          Reset
        </Button>
        <Button onClick={onSave}>
          <Save className="h-4 w-4 mr-1" /> Save Grading Scale
        </Button>
      </div>
    </Card>
  );
}

function SubjectPapersSection({
  papersTab,
  setPapersTab,
  subjectPapers,
  setSubjectPapers,
  onSave,
}: {
  papersTab: "O" | "A";
  setPapersTab: (tab: "O" | "A") => void;
  subjectPapers: any;
  setSubjectPapers: (papers: any) => void;
  onSave: () => void;
}) {
  return (
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
        <Button onClick={onSave}>
          <Save className="h-4 w-4 mr-1" /> Save Papers Configuration
        </Button>
      </div>
    </Card>
  );
}

function CombinationsSection({
  newCombination,
  setNewCombination,
  combinations,
  onAddCombination,
  onDeleteCombination,
}: {
  newCombination: any;
  setNewCombination: (combo: any) => void;
  combinations: any[];
  onAddCombination: () => void;
  onDeleteCombination: (id: string) => void;
}) {
  return (
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
          <div className="grid gap-2 text-sm max-h-32 overflow-y-auto">
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
                        subjects: newCombination.subjects.filter((s: string) => s !== subject),
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
        <Button onClick={onAddCombination}>
          <Save className="h-4 w-4 mr-1" /> Add Combination
        </Button>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Existing Combinations</Label>
        <div className="grid gap-3 sm:grid-cols-2">
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
                onClick={() => onDeleteCombination(combo.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function AccessCodeSection({
  newCode,
  setNewCode,
  onChange,
}: {
  newCode: string;
  setNewCode: (code: string) => void;
  onChange: () => void;
}) {
  return (
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
        <Button onClick={onChange}>Change Code</Button>
      </div>
    </Card>
  );
}

function DangerZoneSection({
  auth,
  navigate,
}: {
  auth: any;
  navigate: any;
}) {
  return (
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
  );
}
