import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProjectDetailView } from "@/shared/components/project/ProjectDetailView";
import { DefaultAvatar } from "@/shared/components/ui/DefaultAvatar";

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
      renderAffectation={(a) => (
        <div className="flex items-center gap-3">
          <DefaultAvatar
            src={(() => {
              try {
                const saved = localStorage.getItem(`ikigai-avatar-${a.employeId}`);
                return saved || undefined;
              } catch {
                return undefined;
              }
            })()}
            alt={`${a.employePrenom} ${a.employeNom}`}
            size="md"
            className="shrink-0"
          />
          {a.employePrenom} {a.employeNom}
        </div>
      )}
    />
  );
}
