import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, getSubjects, addSubject, deleteSubject } from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/subjects")({
  component: SubjectsPage,
});

function SubjectsPage() {
  const subjects = useStore(getSubjects);
  const [name, setName] = useState("");
  const [optional, setOptional] = useState(false);

  function handleAdd() {
    if (!name.trim()) return toast.error("Enter subject name.");
    const ok = addSubject({ id: crypto.randomUUID(), name: name.trim(), isOptional: optional });
    if (!ok) return toast.error("Subject already exists.");
    setName(""); setOptional(false);
    toast.success("Subject added.");
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-3xl">Subjects</h1>
        <p className="text-muted-foreground">Manage the school's subject catalog.</p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4" /> Add subject</h2>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Agriculture" />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch checked={optional} onCheckedChange={setOptional} id="opt" />
            <Label htmlFor="opt">Optional (for S.2–S.4)</Label>
          </div>
          <Button onClick={handleAdd}>Add</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="h-4 w-4" /> Catalog ({subjects.length})</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {subjects.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.name}</span>
                <Badge variant={s.isOptional ? "secondary" : "default"}>
                  {s.isOptional ? "Optional" : "Compulsory"}
                </Badge>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Existing marks for this subject remain in storage but won't appear on report cards.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { deleteSubject(s.id); toast.success("Subject deleted."); }}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
