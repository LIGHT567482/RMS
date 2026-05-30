import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/dashboard/subjects")({
  component: SubjectsRedirect,
});

function SubjectsRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to admin where subject management is admin-only
    navigate({ to: "/dashboard/settings", replace: true });
  }, [navigate]);

  return null;
}
