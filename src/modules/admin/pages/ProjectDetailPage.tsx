import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProjectDetailView } from "@/shared/components/project/ProjectDetailView";

export function AdminProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const id = Number.parseInt(String(projectId ?? ""), 10);

  useEffect(() => {
    if (Number.isNaN(id)) {
      navigate("/admin/projects", { replace: true });
    }
  }, [id, navigate]);

  if (Number.isNaN(id)) return null;

  return (
    <ProjectDetailView
      projectId={id}
      backHref="/admin/projects"
      deliverableHref={(deliverableId) => `/admin/deliverables/${deliverableId}`}
      allowDeliverableDelete
    />
  );
}
