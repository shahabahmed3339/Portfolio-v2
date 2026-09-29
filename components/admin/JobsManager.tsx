"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminFormField,
  AdminModalCard,
  AdminModalOverlay,
  AdminPanel,
  AdminStatus,
  AdminTable,
  AdminTableScroll,
  AdminToolbar,
} from "./styles";

/**
 * Jobs manager: create / edit / archive / delete jobs, inspect their resume
 * versions, and trigger tailored-resume generation.
 *
 * Deliberately mirrors the existing `ResourceTable` interaction model (modal
 * form, table, delete confirmation) so the admin area stays consistent.
 */

interface Job {
  id: string;
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  jobUrl: string | null;
  location: string | null;
  notes: string | null;
  slug: string;
  isArchived: boolean;
  createdAt: string;
  _count?: { resumeVersions: number };
}

interface ResumeVersion {
  id: string;
  version: number;
  slug: string;
  status: string;
  isPublished: boolean;
  isActive: boolean;
  createdAt: string;
}

const EMPTY_DRAFT: Record<string, string> = {
  companyName: "",
  jobTitle: "",
  jobDescription: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  jobUrl: "",
  location: "",
  notes: "",
};

async function jsonFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const body = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok) throw new Error((body && body.error) || `Request failed (${response.status})`);
  return body;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function JobsManager() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<Job | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await jsonFetch(`/api/jobs${showArchived ? "?archived=1" : ""}`);
      setJobs(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadVersions = useCallback(async (jobId: string) => {
    setVersionsLoading(true);
    try {
      const data = await jsonFetch(`/api/jobs/${jobId}`);
      setVersions(data.resumeVersions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resume versions");
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  async function openDetails(job: Job) {
    setSelected(job);
    setNotice("");
    await loadVersions(job.id);
  }

  function openCreate() {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT });
  }

  function openEdit(job: Job) {
    setEditingId(job.id);
    setDraft({
      companyName: job.companyName,
      jobTitle: job.jobTitle,
      jobDescription: job.jobDescription,
      contactName: job.contactName ?? "",
      contactEmail: job.contactEmail ?? "",
      contactPhone: job.contactPhone ?? "",
      jobUrl: job.jobUrl ?? "",
      location: job.location ?? "",
      notes: job.notes ?? "",
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;

    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(draft)) {
        payload[key] = value.trim() === "" ? null : value.trim();
      }

      if (editingId) {
        await jsonFetch(`/api/jobs/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await jsonFetch("/api/jobs", { method: "POST", body: JSON.stringify(payload) });
      }
      setDraft(null);
      setEditingId(null);
      await load();
      if (selected) await loadVersions(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the job");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(job: Job) {
    try {
      await jsonFetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        body: JSON.stringify({ isArchived: !job.isArchived }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive the job");
    }
  }

  async function handleDelete(job: Job) {
    if (
      !window.confirm(
        `Delete "${job.companyName} — ${job.jobTitle}" and all of its resume versions? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await jsonFetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (selected?.id === job.id) setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete the job");
    }
  }

  async function handleGenerate(job: Job) {
    setGenerating(true);
    setError("");
    setNotice("Generating tailored resume...");
    try {
      const result = await jsonFetch(`/api/jobs/${job.id}/generate`, { method: "POST" });
      setNotice(
        `Resume generated successfully — version ${result.version}. It is not published yet.`,
      );
      await loadVersions(job.id);
      await load();
    } catch (err) {
      setNotice("");
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish(version: ResumeVersion, action: "publish" | "unpublish") {
    setError("");
    try {
      await jsonFetch(`/api/resume-versions/${version.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      if (selected) await loadVersions(selected.id);
      setNotice(
        action === "publish"
          ? `Version ${version.version} is now the live resume on the public portfolio.`
          : `Version ${version.version} was unpublished.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update publishing");
    }
  }

  return (
    <AdminPanel>
      <h2>Jobs</h2>

      {error ? <AdminStatus style={{ color: "#e31f71" }}>{error}</AdminStatus> : null}
      {notice ? <AdminStatus style={{ color: "#4B8BBE" }}>{notice}</AdminStatus> : null}

      <AdminToolbar>
        <label style={{ marginRight: "auto", display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
        <button type="button" onClick={openCreate}>
          + Add job
        </button>
      </AdminToolbar>

      {loading ? (
        <AdminStatus>Loading...</AdminStatus>
      ) : jobs.length === 0 ? (
        <AdminStatus>No jobs yet. Click “Add job” to create one.</AdminStatus>
      ) : (
        <AdminTableScroll>
          <AdminTable>
            <thead>
              <tr>
                <th>Company</th>
                <th>Job title</th>
                <th>Location</th>
                <th>Versions</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} style={job.isArchived ? { opacity: 0.55 } : undefined}>
                  <td data-label="Company">{job.companyName}</td>
                  <td data-label="Job title">{job.jobTitle}</td>
                  <td data-label="Location">{job.location || "—"}</td>
                  <td data-label="Versions">{job._count?.resumeVersions ?? 0}</td>
                  <td data-label="Created">{formatDate(job.createdAt)}</td>
                  <td className="actions">
                    <div className="actions-inner">
                      <button type="button" onClick={() => void openDetails(job)}>
                        Details
                      </button>
                      <button type="button" onClick={() => openEdit(job)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => void handleArchive(job)}>
                        {job.isArchived ? "Restore" : "Archive"}
                      </button>
                      <button type="button" className="danger" onClick={() => void handleDelete(job)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminTableScroll>
      )}

      {selected ? (
        <AdminModalOverlay onClick={() => setSelected(null)}>
          <AdminModalCard onClick={(e) => e.stopPropagation()}>
            <h2>
              {selected.companyName} — {selected.jobTitle}
            </h2>

            <dl style={{ display: "grid", gap: "0.6rem", marginBottom: "2rem", fontSize: "1.3rem" }}>
              <div>
                <strong>Location:</strong> {selected.location || "—"}
              </div>
              <div>
                <strong>Created:</strong> {formatDate(selected.createdAt)}
              </div>
              <div>
                <strong>Contact:</strong>{" "}
                {[selected.contactName, selected.contactEmail, selected.contactPhone]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </div>
              {selected.jobUrl ? (
                <div>
                  <strong>Job URL:</strong>{" "}
                  <a href={selected.jobUrl} target="_blank" rel="noreferrer">
                    {selected.jobUrl}
                  </a>
                </div>
              ) : null}
              <div>
                <strong>Job description:</strong>
                <pre style={{ whiteSpace: "pre-wrap", marginTop: "0.4rem", opacity: 0.85 }}>
                  {selected.jobDescription}
                </pre>
              </div>
              {selected.notes ? (
                <div>
                  <strong>Notes:</strong> {selected.notes}
                </div>
              ) : null}
            </dl>

            <h3 style={{ marginBottom: "1rem" }}>Resume versions</h3>

            {versionsLoading ? (
              <AdminStatus>Loading versions...</AdminStatus>
            ) : versions.length === 0 ? (
              <AdminStatus>No resume versions yet for this job.</AdminStatus>
            ) : (
              <AdminTable>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Generated</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((version) => (
                    <tr key={version.id}>
                      <td data-label="Version">Version {version.version}</td>
                      <td data-label="Generated">{formatDate(version.createdAt)}</td>
                      <td data-label="Status">
                        {version.isActive ? "Active (live)" : version.isPublished ? "Published" : "Not published"}
                      </td>
                      <td className="actions">
                        <div className="actions-inner">
                          <button
                            type="button"
                            onClick={() => window.open(`/resume/${version.slug}`, "_blank")}
                          >
                            View
                          </button>
                          {version.isPublished ? (
                            <button type="button" onClick={() => void handlePublish(version, "unpublish")}>
                              Unpublish
                            </button>
                          ) : (
                            <button type="button" onClick={() => void handlePublish(version, "publish")}>
                              Publish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            )}

            <div className="modal-actions">
              <button type="button" className="cancel" onClick={() => setSelected(null)}>
                Close
              </button>
              <button
                type="button"
                disabled={generating}
                onClick={() => void handleGenerate(selected)}
              >
                {generating ? "Generating tailored resume..." : "Generate tailored resume"}
              </button>
            </div>
          </AdminModalCard>
        </AdminModalOverlay>
      ) : null}

      {draft ? (
        <AdminModalOverlay onClick={() => setDraft(null)}>
          <AdminModalCard onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Edit job" : "Add job"}</h2>
            <form onSubmit={handleSubmit}>
              {(
                [
                  ["companyName", "Company name *"],
                  ["jobTitle", "Job title *"],
                  ["location", "Location"],
                  ["contactName", "Contact name"],
                  ["contactEmail", "Contact email"],
                  ["contactPhone", "Contact phone"],
                  ["jobUrl", "Job URL"],
                ] as const
              ).map(([name, label]) => (
                <AdminFormField key={name}>
                  {label}
                  <input
                    value={draft[name] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
                    required={label.endsWith("*")}
                  />
                </AdminFormField>
              ))}

              <AdminFormField>
                Job description *
                <textarea
                  rows={8}
                  value={draft.jobDescription ?? ""}
                  onChange={(e) => setDraft({ ...draft, jobDescription: e.target.value })}
                  required
                />
              </AdminFormField>

              <AdminFormField>
                Notes
                <textarea
                  rows={4}
                  value={draft.notes ?? ""}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </AdminFormField>

              <div className="modal-actions">
                <button type="button" className="cancel" onClick={() => setDraft(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </AdminModalCard>
        </AdminModalOverlay>
      ) : null}
    </AdminPanel>
  );
}