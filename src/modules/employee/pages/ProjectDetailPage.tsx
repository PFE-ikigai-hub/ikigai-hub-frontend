// Ce fichier gere une partie du frontend.
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProjectDetailView } from "@/shared/components/project/ProjectDetailView";


export function EmployeeProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const id = Number.parseInt(String(projectId ?? ""), 10);

  useEffect(() => {
    if (Number.isNaN(id)) navigate("/employee/projects", { replace: true });
  }, [id, navigate]);

  if (Number.isNaN(id)) return null;

  return (
    <ProjectDetailView
      projectId={id}
      backHref="/employee/projects"
      deliverableHref={(deliverableId) => `/employee/feedback/${deliverableId}`}
      allowDeliverableDelete
      showHistoryTab={false}
    />
  );
}