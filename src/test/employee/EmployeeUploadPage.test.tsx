import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmployeeUploadPage } from "@/modules/employee/pages/DashboardPage";
import { renderWithRouter } from "@/test/test-utils";
import { useAuth } from "@/core/auth/AuthProvider";
import { affectationsApi, deliverablesApi, projectsApi, versionsApi } from "@/core/api/client";


vi.mock("@/core/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/core/api/client", () => ({
  affectationsApi: {
    byEmployee: vi.fn(),
  },
  projectsApi: {
    batch: vi.fn(),
  },
  deliverablesApi: {
    byProject: vi.fn(),
    create: vi.fn(),
  },
  versionsApi: {
    upload: vi.fn(),
  },
}));

vi.mock("@/core/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "employee.uploadDeliverable": "Uploader un livrable",
          "employee.noProjects": "Aucun projet assigne",
          "error.emptyFile": "Desole, vous ne pouvez pas uploader un fichier vide (0 octet).",
          "filter.type.IMAGE": "Image",
          "filter.type.VIDEO": "Video",
          "filter.type.PDF": "PDF",
          "filter.type.TEXTE": "Texte",
          "filter.type.AUDIO": "Audio",
          "filter.type.AUTRE": "Autre",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedByEmployee = vi.mocked(affectationsApi.byEmployee);
const mockedBatchProjects = vi.mocked(projectsApi.batch);
const mockedByProject = vi.mocked(deliverablesApi.byProject);
const mockedCreateDeliverable = vi.mocked(deliverablesApi.create);
const mockedUploadVersion = vi.mocked(versionsApi.upload);

describe("EmployeeUploadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { id: "7", firstName: "Emp", lastName: "One", email: "emp@ikigai.com", role: "EMPLOYE" },
      role: "EMPLOYE",
      isLoading: false,
      isFullyReady: true,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    mockedByEmployee.mockResolvedValue({
      content: [
        {
          id: 1,
          projetId: 10,
          projetNom: "Site web",
          employeId: 7,
          employeNom: "One",
          employePrenom: "Emp",
          roleDansProjet: "DEV",
          dateAffectation: new Date().toISOString(),
        },
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 100,
      first: true,
      last: true,
      empty: false,
    });

    mockedBatchProjects.mockResolvedValue([
      {
        id: 10,
        nom: "Site web",
        description: "",
        dateDebut: "2026-01-01",
        dateFinPrevue: null,
        statut: "EN_COURS",
        clientId: 3,
        clientNom: "Client A",
      },
    ]);

    mockedByProject.mockResolvedValue({
      content: [
        {
          id: 42,
          projetId: 10,
          projetNom: "Site web",
          nom: "Header video",
          type: "VIDEO",
          description: "",
          statut: "EN_REVUE",
          dateCreation: "2026-01-01",
          deposeParId: 7,
          deposeParNom: "Emp One",
        },
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 100,
      first: true,
      last: true,
      empty: false,
    });
  });

  it("shows validation error for unsupported file type", async () => {
    const { container } = renderWithRouter(<EmployeeUploadPage />, { route: "/employee/upload" });

    await waitFor(() => {
      expect(screen.getByText("Uploader un livrable")).toBeInTheDocument();
      expect(screen.getByText(/Site web/)).toBeInTheDocument();
    });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    fireEvent.change(fileInput, {
      target: {
        files: [new File(["dummy"], "malware.exe", { type: "application/x-msdownload" })],
      },
    });

    expect(await screen.findByText(/Type de fichier non supporte pour cet upload/i)).toBeInTheDocument();
    expect(mockedUploadVersion).not.toHaveBeenCalled();
  });

  it("uploads a new version for an existing deliverable", async () => {
    const userEventApi = userEvent.setup();
    const { container } = renderWithRouter(<EmployeeUploadPage />, { route: "/employee/upload" });

    await waitFor(() => {
      expect(screen.getByText(/Site web/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Nouvelle version/i }));

    const selects = container.querySelectorAll("select");
    const projectSelect = selects[0] as HTMLSelectElement;
    await userEventApi.selectOptions(projectSelect, "10");

    await waitFor(() => {
      expect(mockedByProject).toHaveBeenCalledWith(10);
    });

    const deliverableSelect = await waitFor(() => {
      const found = Array.from(container.querySelectorAll("select")).find((selectEl) =>
        Array.from(selectEl.querySelectorAll("option")).some((opt) => opt.value === "42")
      ) as HTMLSelectElement | undefined;

      expect(found).toBeTruthy();
      return found!;
    });

    await waitFor(() => {
      expect(deliverableSelect).not.toBeDisabled();
    });
    await userEventApi.selectOptions(deliverableSelect, "42");

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(["content"], "clip.mp4", { type: "video/mp4" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const submitButton = screen.getByRole("button", { name: "Confirmer" });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    await userEventApi.click(submitButton);

    await waitFor(() => {
      expect(mockedUploadVersion).toHaveBeenCalledWith(42, expect.any(File), undefined);
    });

    expect(await screen.findByText(/Upload reussi/i)).toBeInTheDocument();
    expect(mockedCreateDeliverable).not.toHaveBeenCalled();
  });
});
