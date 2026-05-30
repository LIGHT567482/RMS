import { createFileRoute } from "@tanstack/react-router";
import { createElement, isValidElement, useEffect, useState, type ElementType, type ReactNode } from "react";
import {
  useStore,
  getSchool,
  setSchool,
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
  ShieldAlert,
  Sliders,
  BookOpen,
  Trash2,
  Users,
  FileText,
  LayoutGrid,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  COMPULSORY_SUBJECTS,
  OPTIONAL_SUBJECTS,
  ADVANCED_SUBJECTS,
  ALL_CLASSES,
  DEFAULT_EXAM_SETS,
  type ClassLevel,
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
  component: AdminPage,
});

function AdminPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const school = useStore(getSchool);
  const [activeSection, setActiveSection] = useState<string>("security");
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  const [selectedStreamClass, setSelectedStreamClass] = useState<ClassLevel>("S.1");
  const [newStreamName, setNewStreamName] = useState("");
  const [selectedPaperTarget, setSelectedPaperTarget] = useState("All Papers");
  const [subjectToDelete, setSubjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

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

  function handlePasswordChange() {
    const currentPassword = getAdminPassword();
    
    // Validate old password
    if (!oldPassword.trim()) {
      return toast.error("Please enter your current password.");
    }
    if (oldPassword !== currentPassword) {
      return toast.error("Current password is incorrect.");
    }

    // Validate new password
    if (!newPassword.trim()) {
      return toast.error("Please enter a new password.");
    }
    if (newPassword === currentPassword) {
      return toast.error("New password must be different from current password.");
    }
    if (!isValidAdminPassword(newPassword)) {
      return toast.error(
        "Password must be 8-10 characters and include an uppercase letter, a lowercase letter, a digit, and a special character.",
      );
    }

    // Confirm new password
    if (newPassword !== confirmNewPassword) {
      return toast.error("New passwords do not match.");
    }

    // Update the password
    setAdminPassword(newPassword);
    
    // Reset form and close dialog
    setOldPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowPasswordChangeDialog(false);
    
    toast.success("Password changed successfully.");
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

  function addNewClassStream() {
    const trimmed = newStreamName.trim();
    if (!trimmed) {
      return toast.error("Stream name cannot be empty.");
    }
    const current = school.classStreams?.[selectedStreamClass] ?? [];
    if (current.includes(trimmed)) {
      return toast.error(`Stream ${trimmed} already exists for ${selectedStreamClass}.`);
    }

    setSchool({
      ...school,
      classStreams: {
        ...(school.classStreams ?? {}),
        [selectedStreamClass]: [...current, trimmed],
      },
    });
    setNewStreamName("");
    toast.success(`Added stream ${trimmed} to ${selectedStreamClass}.`);
  }

  function removeClassStream(classLevel: ClassLevel, stream: string) {
    const current = school.classStreams?.[classLevel] ?? [];
    setSchool({
      ...school,
      classStreams: {
        ...(school.classStreams ?? {}),
        [classLevel]: current.filter((item) => item !== stream),
      },
    });
    toast.success(`Removed stream ${stream} from ${classLevel}.`);
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="bg-muted pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isFirstSetup && (
                <p className="mt-2 text-xs text-muted-foreground">
                  8–10 chars, including uppercase, lowercase, digit, and special character.
                </p>
              )}
            </div>
            {isFirstSetup && (
              <div>
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    className="bg-muted pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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

  function changeCode() {
    if (!/^\d{5,10}$/.test(newCode)) return toast.error("Code must be 5–10 digits.");
    auth.resetCode(newCode);
    setNewCode("");
    toast.success("Access code changed.");
  }

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="font-display text-3xl">Admin</h1>
            <p className="text-muted-foreground">Configure security, examination, and academic administration.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-5 gap-6 min-h-screen">
          {/* Left Sidebar Navigation - 1/5 width */}
          <div className="col-span-1">
            <Card className="sticky top-6">
              <div className="p-4 space-y-2">
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
                  icon={LayoutGrid}
                  label="Exam Sets"
                  section="examSets"
                  active={activeSection === "examSets"}
                  onClick={() => setActiveSection("examSets")}
                />
                <NavButton
                  icon={Sliders}
                  label="Appearance"
                  section="appearance"
                  active={activeSection === "appearance"}
                  onClick={() => setActiveSection("appearance")}
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
                  icon={LayoutGrid}
                  label="Class Streams"
                  section="streams"
                  active={activeSection === "streams"}
                  onClick={() => setActiveSection("streams")}
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
                {/* Access code and danger zone are now grouped under Recovery & Security */}
              </div>
            </Card>
          </div>

          {/* Right Content Area - 4/5 width */}
          <div className="col-span-4">
            {activeSection === null ? (
              <Card className="p-12 text-center text-muted-foreground">
                <p className="text-lg">Select an admin section from the menu on the left</p>
              </Card>
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
                newCode={newCode}
                setNewCode={setNewCode}
                onChange={changeCode}
                auth={auth}
                navigate={navigate}
                showPasswordChangeDialog={showPasswordChangeDialog}
                setShowPasswordChangeDialog={setShowPasswordChangeDialog}
                oldPassword={oldPassword}
                setOldPassword={setOldPassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmNewPassword={confirmNewPassword}
                setConfirmNewPassword={setConfirmNewPassword}
                showOldPassword={showOldPassword}
                setShowOldPassword={setShowOldPassword}
                showNewPassword={showNewPassword}
                setShowNewPassword={setShowNewPassword}
                showConfirmNewPassword={showConfirmNewPassword}
                setShowConfirmNewPassword={setShowConfirmNewPassword}
                onPasswordChange={handlePasswordChange}
              />
            ) : activeSection === "appearance" ? (
              <AppearanceSection />
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
            ) : activeSection === "streams" ? (
              <ClassStreamsSection
                selectedClass={selectedStreamClass}
                setSelectedClass={setSelectedStreamClass}
                newStreamName={newStreamName}
                setNewStreamName={setNewStreamName}
                classStreams={school.classStreams ?? {}}
                onAddStream={addNewClassStream}
                onRemoveStream={removeClassStream}
              />
            ) : activeSection === "combinations" ? (
              <CombinationsSection
                newCombination={newCombination}
                setNewCombination={setNewCombination}
                combinations={combinations}
                onAddCombination={handleAddCombination}
                onDeleteCombination={handleDeleteCombination}
              />
            ) : activeSection === "examSets" ? (
              <ExamSetsSection />
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
              creating it again in this admin page.
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

function ExamSetsSection() {
  const school = useStore(getSchool);
  const defaultSets =
    school.selectedExamSets && school.selectedExamSets.length > 0
      ? school.selectedExamSets
      : DEFAULT_EXAM_SETS;
  const [ordinarySets, setOrdinarySets] = useState<ExamSet[]>(
    school.selectedExamSetsOrdinary && school.selectedExamSetsOrdinary.length > 0
      ? school.selectedExamSetsOrdinary
      : defaultSets,
  );
  const [advancedSets, setAdvancedSets] = useState<ExamSet[]>(
    school.selectedExamSetsAdvanced && school.selectedExamSetsAdvanced.length > 0
      ? school.selectedExamSetsAdvanced
      : defaultSets,
  );
  const [weights, setWeights] = useState<Record<string, number>>(school.examSetWeights ?? {});
  const [reportOrdinarySet, setReportOrdinarySet] = useState<ExamSet>(
    (school.reportCardExamSetsOrdinary && school.reportCardExamSetsOrdinary[0]) ||
      (school.selectedExamSetsOrdinary && school.selectedExamSetsOrdinary[0]) ||
      defaultSets[0],
  );
  const [reportAdvancedSet, setReportAdvancedSet] = useState<ExamSet>(
    (school.reportCardExamSetsAdvanced && school.reportCardExamSetsAdvanced[0]) ||
      (school.selectedExamSetsAdvanced && school.selectedExamSetsAdvanced[0]) ||
      defaultSets[0],
  );
  const [newSetCode, setNewSetCode] = useState("");
  const [newSetWeight, setNewSetWeight] = useState<string>("");
  const [newSetTarget, setNewSetTarget] = useState<"ordinary" | "advanced" | "both">("ordinary");

  function addNewSet() {
    const code = newSetCode.trim().toUpperCase();
    if (!code) return toast.error("Enter an exam set code.");
    if (
      (newSetTarget !== "advanced" && ordinarySets.includes(code)) ||
      (newSetTarget !== "ordinary" && advancedSets.includes(code))
    ) {
      return toast.error("Exam set already exists for the selected level.");
    }

    if (newSetTarget !== "advanced") {
      setOrdinarySets((current) => (current.includes(code) ? current : [...current, code]));
    }
    if (newSetTarget !== "ordinary") {
      setAdvancedSets((current) => (current.includes(code) ? current : [...current, code]));
    }

    if (newSetWeight.trim()) {
      const n = Number(newSetWeight);
      if (!Number.isNaN(n)) setWeights((w) => ({ ...w, [code]: n }));
    }
    setNewSetCode("");
    setNewSetWeight("");
    toast.success("Exam set added locally. Save to persist.");
  }

  function removeOrdinarySet(code: string) {
    setOrdinarySets((s) => s.filter((x) => x !== code));
    if (reportOrdinarySet === code) {
      const remaining = ordinarySets.filter((x) => x !== code);
      setReportOrdinarySet(remaining[0] ?? defaultSets[0]);
    }
  }

  function removeAdvancedSet(code: string) {
    setAdvancedSets((s) => s.filter((x) => x !== code));
    if (reportAdvancedSet === code) {
      const remaining = advancedSets.filter((x) => x !== code);
      setReportAdvancedSet(remaining[0] ?? defaultSets[0]);
    }
  }

  function saveSets() {
    setSchool({
      ...school,
      selectedExamSets: Array.from(new Set([...ordinarySets, ...advancedSets])),
      selectedExamSetsOrdinary: ordinarySets,
      selectedExamSetsAdvanced: advancedSets,
      reportCardExamSetsOrdinary: [reportOrdinarySet],
      reportCardExamSetsAdvanced: [reportAdvancedSet],
      examSetWeights: weights,
    });
    toast.success("Exam sets saved.");
  }

  return (
    <div>
      <h2 className="font-semibold text-lg">Exam Sets</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Configure exam set codes and the maximum marks each exam set is graded out of. Choose one
        exam set per level for report card generation under the selected exam sets.
      </p>

      <Card className="p-4 mb-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_10rem_10rem] items-end">
          <div>
            <Label>Code</Label>
            <Input
              value={newSetCode}
              onChange={(e) => setNewSetCode(e.target.value)}
              placeholder="E.g. B.O.T"
            />
          </div>
          <div>
            <Label>Max Marks</Label>
            <Input
              value={newSetWeight}
              onChange={(e) => setNewSetWeight(e.target.value)}
              placeholder="Optional max marks"
            />
          </div>
          <div>
            <Label>Applies to</Label>
            <Select value={newSetTarget} onValueChange={(v) => setNewSetTarget(v as "ordinary" | "advanced" | "both") }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ordinary">Ordinary Level</SelectItem>
                <SelectItem value="advanced">Advanced Level</SelectItem>
                <SelectItem value="both">Both Levels</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button className="w-full" onClick={addNewSet}>
              Add
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Ordinary Level Sets</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Choose the one exam set that will be used for generating Ordinary level report cards.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Max Marks</th>
                <th className="text-left p-2">Report card set</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ordinarySets.map((s, index) => (
                <tr key={`${s}-${index}`} className="border-t">
                  <td className="p-2 font-medium">{s}</td>
                  <td className="p-2">{weights[s] ?? "—"}</td>
                  <td className="p-2">
                    <input
                      type="radio"
                      name="report-ordinary-set"
                      checked={reportOrdinarySet === s}
                      onChange={() => setReportOrdinarySet(s)}
                      className="mr-2"
                      aria-label={`Use ${s} for Ordinary report cards`}
                      title={`Use ${s} for Ordinary report cards`}
                    />
                    <span className="inline-block">Use</span>
                  </td>
                  <td className="p-2">
                    <Button variant="destructive" size="sm" onClick={() => removeOrdinarySet(s)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Advanced Level Sets</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Choose the one exam set that will be used for generating Advanced level report cards.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Max Marks</th>
                <th className="text-left p-2">Report card set</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {advancedSets.map((s, index) => (
                <tr key={`${s}-${index}`} className="border-t">
                  <td className="p-2 font-medium">{s}</td>
                  <td className="p-2">{weights[s] ?? "—"}</td>
                  <td className="p-2">
                    <input
                      type="radio"
                      name="report-advanced-set"
                      checked={reportAdvancedSet === s}
                      onChange={() => setReportAdvancedSet(s)}
                      className="mr-2"
                      aria-label={`Use ${s} for Advanced report cards`}
                      title={`Use ${s} for Advanced report cards`}
                    />
                    <span className="inline-block">Use</span>
                  </td>
                  <td className="p-2">
                    <Button variant="destructive" size="sm" onClick={() => removeAdvancedSet(s)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="p-4 my-4">
        <div className="flex flex-col gap-4">
          <div>
            <Label>Max Marks</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Assign the maximum marks each exam set is graded out of. These values dominate report calculation and make the system adaptive to the exam set mark scheme.
            </p>
          </div>
          <div className="grid gap-3">
            {Array.from(new Set([...ordinarySets, ...advancedSets])).map((s) => (
              <div key={s} className="grid grid-cols-[1fr_8rem] gap-3 items-end">
                <div>
                  <Label>{s}</Label>
                  <Input
                    type="number"
                    value={weights[s] ?? ""}
                    onChange={(e) => setWeights((w) => ({ ...w, [s]: Number(e.target.value) }))}
                    placeholder="(none)"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button onClick={saveSets}>
          <Save className="h-4 w-4 mr-2" /> Save Exam Sets
        </Button>
      </div>
    </div>
  );
}

// Section Components
function ClassStreamsSection({
  selectedClass,
  setSelectedClass,
  newStreamName,
  setNewStreamName,
  classStreams,
  onAddStream,
  onRemoveStream,
}: {
  selectedClass: ClassLevel;
  setSelectedClass: (classLevel: ClassLevel) => void;
  newStreamName: string;
  setNewStreamName: (value: string) => void;
  classStreams: Record<ClassLevel, string[]>;
  onAddStream: () => void;
  onRemoveStream: (classLevel: ClassLevel, stream: string) => void;
}) {
  const streams = classStreams[selectedClass] ?? [];

  return (
    <Card className="p-6">
      <h2 className="font-semibold flex items-center gap-2 mb-4">
        <LayoutGrid className="h-4 w-4" /> Class Streams / Branches
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Class</Label>
          <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v as ClassLevel)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_CLASSES.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>New Stream / Branch</Label>
          <Input
            value={newStreamName}
            onChange={(e) => setNewStreamName(e.target.value)}
            placeholder="A, B, North, Red, ..."
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={onAddStream}>Add Stream</Button>
      </div>
      <div className="mt-6 space-y-3">
        {streams.length ? (
          <div className="grid gap-2">
            {streams.map((stream) => (
              <div key={stream} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{stream}</p>
                  <p className="text-xs text-muted-foreground">Attached to {selectedClass}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onRemoveStream(selectedClass, stream)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No streams or branches configured for {selectedClass} yet.</p>
        )}
      </div>
    </Card>
  );
}

function AppearanceSection() {
  const school = useStore(getSchool);
  const [primaryColor, setPrimaryColor] = useState(school.primaryColor || "#3c64ff");
  const [secondaryColor, setSecondaryColor] = useState(school.secondaryColor || "#eef2ff");
  const [accentColor, setAccentColor] = useState(school.accentColor || "#f59e0b");
  const [backgroundColor, setBackgroundColor] = useState(school.backgroundColor || "#f8fafc");
  const [foregroundColor, setForegroundColor] = useState(school.foregroundColor || "#111111");
  const [backgroundColorDark, setBackgroundColorDark] = useState(school.backgroundColorDark || "#0f172a");
  const [foregroundColorDark, setForegroundColorDark] = useState(school.foregroundColorDark || "#f8fafc");

  const [reportPageColor, setReportPageColor] = useState(school.reportCardPageColor || "#ffffff");
  const [reportContentColor, setReportContentColor] = useState(school.reportCardContentColor || "#111111");
  const [reportHeadingColor, setReportHeadingColor] = useState(school.reportCardHeadingColor || school.primaryColor || "#3c64ff");
  const [reportPageColorAdv, setReportPageColorAdv] = useState(school.reportCardPageColorAdvanced || "#f8fafc");
  const [reportContentColorAdv, setReportContentColorAdv] = useState(school.reportCardContentColorAdvanced || "#111111");
  const [reportHeadingColorAdv, setReportHeadingColorAdv] = useState(school.reportCardHeadingColorAdvanced || "#dc2626");
  const [watermarkColored, setWatermarkColored] = useState<boolean>(
    school.reportCardWatermarkColored ?? true,
  );

  function saveAppearance() {
    setSchool({
      ...school,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      foregroundColor,
      backgroundColorDark,
      foregroundColorDark,
      reportCardPageColor: reportPageColor,
      reportCardContentColor: reportContentColor,
      reportCardHeadingColor: reportHeadingColor,
      reportCardPageColorAdvanced: reportPageColorAdv,
      reportCardContentColorAdvanced: reportContentColorAdv,
      reportCardHeadingColorAdvanced: reportHeadingColorAdv,
      reportCardWatermarkColored: watermarkColored,
    });
    toast.success("Appearance settings saved.");
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold flex items-center gap-2 mb-4">
        <Sliders className="h-4 w-4" /> Appearance (Colors)
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Color branding is editable here. Full school branding such as logo, name, and address remain managed in Light Distributor.
      </p>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-border bg-background shadow-sm">
          <div className="border-b border-border px-4 py-3 font-semibold">Branding colors</div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Primary Color</span>
              <input id="primary-color" title="Primary Color" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-20" />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Secondary Color</span>
              <input id="secondary-color" title="Secondary Color" type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10 w-20" />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Accent Color</span>
              <input id="accent-color" title="Accent Color" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-20" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background shadow-sm">
          <div className="border-b border-border px-4 py-3 font-semibold">System colors</div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Background Color (Light)</span>
              <input id="background-color" title="Background Color (Light Mode)" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-10 w-20" />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Foreground Color (Light)</span>
              <input id="foreground-color" title="Foreground Color (Light Mode)" type="color" value={foregroundColor} onChange={(e) => setForegroundColor(e.target.value)} className="h-10 w-20" />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Background Color (Dark)</span>
              <input id="background-color-dark" title="Background Color (Dark Mode)" type="color" value={backgroundColorDark} onChange={(e) => setBackgroundColorDark(e.target.value)} className="h-10 w-20" />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Foreground Color (Dark)</span>
              <input id="foreground-color-dark" title="Foreground Color (Dark Mode)" type="color" value={foregroundColorDark} onChange={(e) => setForegroundColorDark(e.target.value)} className="h-10 w-20" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background shadow-sm">
          <div className="border-b border-border px-4 py-3 font-semibold">Report colors</div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Report Page Color (Ordinary)</span>
              <input id="report-page-color" title="Report Page Color (Ordinary)" type="color" value={reportPageColor} onChange={(e) => setReportPageColor(e.target.value)} className="h-10 w-20" />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Report Heading Color (Ordinary)</span>
              <input id="report-heading-color" title="Report Heading Color (Ordinary)" type="color" value={reportHeadingColor} onChange={(e) => setReportHeadingColor(e.target.value)} className="h-10 w-20" />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Report Content Color (Ordinary)</span>
              <input id="report-content-color" title="Report Content Color (Ordinary)" type="color" value={reportContentColor} onChange={(e) => setReportContentColor(e.target.value)} className="h-10 w-20" />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Report Page Color (Advanced)</span>
              <input id="report-page-color-adv" title="Report Page Color (Advanced)" type="color" value={reportPageColorAdv} onChange={(e) => setReportPageColorAdv(e.target.value)} className="h-10 w-20" />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Report Heading Color (Advanced)</span>
              <input id="report-heading-color-adv" title="Report Heading Color (Advanced)" type="color" value={reportHeadingColorAdv} onChange={(e) => setReportHeadingColorAdv(e.target.value)} className="h-10 w-20" />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
              <span>Report Content Color (Advanced)</span>
              <input id="report-content-color-adv" title="Report Content Color (Advanced)" type="color" value={reportContentColorAdv} onChange={(e) => setReportContentColorAdv(e.target.value)} className="h-10 w-20" />
            </div>
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <Switch checked={watermarkColored} onCheckedChange={(v) => setWatermarkColored(Boolean(v))} />
                <div>
                  <Label>Watermark Colored</Label>
                  <p className="text-xs text-muted-foreground">When off, watermark will be grayscale on reports.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={saveAppearance} className="bg-primary/15 text-primary hover:bg-primary/20">
          Save Colors
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
  newCode,
  setNewCode,
  onChange,
  auth,
  navigate,
  showPasswordChangeDialog,
  setShowPasswordChangeDialog,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  showOldPassword,
  setShowOldPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmNewPassword,
  setShowConfirmNewPassword,
  onPasswordChange,
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
  newCode: string;
  setNewCode: (code: string) => void;
  onChange: () => void;
  auth: any;
  navigate: any;
  showPasswordChangeDialog: boolean;
  setShowPasswordChangeDialog: (show: boolean) => void;
  oldPassword: string;
  setOldPassword: (password: string) => void;
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (password: string) => void;
  showOldPassword: boolean;
  setShowOldPassword: (show: boolean) => void;
  showNewPassword: boolean;
  setShowNewPassword: (show: boolean) => void;
  showConfirmNewPassword: boolean;
  setShowConfirmNewPassword: (show: boolean) => void;
  onPasswordChange: () => void;
}) {
  return (
    <div className="space-y-4">
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
        <div className="mt-5 flex justify-end gap-3">
          <Button 
            onClick={() => setShowPasswordChangeDialog(true)}
            variant="outline"
          >
            Change Dashboard Password
          </Button>
          <Button onClick={onSave}>Save Recovery Settings</Button>
        </div>
      </Card>

      <PasswordChangeDialog
        open={showPasswordChangeDialog}
        onOpenChange={setShowPasswordChangeDialog}
        oldPassword={oldPassword}
        setOldPassword={setOldPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmNewPassword={confirmNewPassword}
        setConfirmNewPassword={setConfirmNewPassword}
        showOldPassword={showOldPassword}
        setShowOldPassword={setShowOldPassword}
        showNewPassword={showNewPassword}
        setShowNewPassword={setShowNewPassword}
        showConfirmNewPassword={showConfirmNewPassword}
        setShowConfirmNewPassword={setShowConfirmNewPassword}
        onConfirm={onPasswordChange}
      />

      <AccessCodeSection newCode={newCode} setNewCode={setNewCode} onChange={onChange} />

      <DangerZoneSection auth={auth} navigate={navigate} />
    </div>
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
              title="Individual Paper Grading"
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
              title="Paired Paper Grading"
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
              title="All Papers Together"
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

function PasswordChangeDialog({
  open,
  onOpenChange,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  showOldPassword,
  setShowOldPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmNewPassword,
  setShowConfirmNewPassword,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oldPassword: string;
  setOldPassword: (password: string) => void;
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (password: string) => void;
  showOldPassword: boolean;
  setShowOldPassword: (show: boolean) => void;
  showNewPassword: boolean;
  setShowNewPassword: (show: boolean) => void;
  showConfirmNewPassword: boolean;
  setShowConfirmNewPassword: (show: boolean) => void;
  onConfirm: () => void;
}) {
  const handleClose = () => {
    onOpenChange(false);
    // Reset form when closing
    setOldPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Dashboard Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old-password">Current Password</Label>
            <div className="relative">
              <Input
                id="old-password"
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (8-10 characters)"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must include uppercase, lowercase, digit, and special character
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmNewPassword ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Change Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DangerZoneSection({
  auth,
  navigate,
}: {
  auth: any;
  navigate: any;
}) {
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const currentPassword = auth.getInfo()?.accessCode ?? "";

  return (
    <Card className="p-6 border-destructive/40">
      <h2 className="font-semibold flex items-center gap-2 mb-2 text-destructive">
        <AlertTriangle className="h-4 w-4" /> Danger Zone
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Factory reset wipes ALL data: students, marks, project work, school settings, and the
        access code. You'll be returned to first-time setup.
      </p>
      <AlertDialog open={showResetDialog} onOpenChange={(open) => {
          if (!open) setConfirmPassword("");
          setShowResetDialog(open);
        }}>
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
          <div className="space-y-4 mt-4">
            <Label htmlFor="reset-password">Admin Password</Label>
            <Input
              id="reset-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Enter admin password to confirm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmPassword !== currentPassword) {
                  toast.error("Enter the correct admin password to confirm.");
                  return;
                }
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
