"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminActionButton,
  AdminDetailGrid,
  AdminFormField,
  AdminModalCard,
  AdminModalOverlay,
  AdminPanel,
  AdminPre,
  AdminStatus,
  AdminTable,
  AdminTableScroll,
  AdminToolbar,
  Spinner,
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

/** Shape returned by /api/resume-versions/[id] when loading the document. */
interface ResumeVersionDetail {
  id: string;
  resumeJson: unknown;
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

  /** Job ids with a row-level action in flight (archive / delete / details). */
  const [busyJobs, setBusyJobs] = useState<string[]>([]);
  /** Resume version ids with an action in flight (view / publish / edit / delete). */
  const [busyVersions, setBusyVersions] = useState<string[]>([]);
  const [draftVersion, setDraftVersion] = useState<{ version: ResumeVersion; json: string } | null>(null);
  const [savingVersionEdit, setSavingVersionEdit] = useState(false);

  function setBusyJob(id: string, busy: boolean) {
    setBusyJobs((current) =>
      busy ? [...new Set([...current, id])] : current.filter((value) => value !== id),
    );
  }

  function setBusyVersion(id: string, busy: boolean) {
    setBusyVersions((current) =>
      busy ? [...new Set([...current, id])] : current.filter((value) => value !== id),
    );
  }

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
    setBusyJob(job.id, true);
    try {
      await loadVersions(job.id);
    } finally {
      setBusyJob(job.id, false);
    }
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
    setError("");
    setNotice("");
    setBusyJob(job.id, true);
    try {
      await jsonFetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        body: JSON.stringify({ isArchived: !job.isArchived }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive the job");
    } finally {
      setBusyJob(job.id, false);
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
    setError("");
    setNotice("");
    setBusyJob(job.id, true);
    try {
      await jsonFetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (selected?.id === job.id) setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete the job");
    } finally {
      setBusyJob(job.id, false);
    }
  }

  async function handleGenerate(job: Job) {
    setGenerating(true);
    setError("");
    setNotice("Generating tailored resume...");
    try {
      const result = await jsonFetch(`/api/jobs/${job.id}/generate`, { method: "POST" });
      setNotice(
        `Resume generated — version ${result.version}. It is viewable at /${result.slug} and is not the default yet.`,
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
    setNotice("");
    setBusyVersion(version.id, true);
    try {
      await jsonFetch(`/api/resume-versions/${version.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      if (selected) await loadVersions(selected.id);
      setNotice(
        action === "publish"
          ? `Version ${version.version} is now the default resume on the public portfolio.`
          : `Version ${version.version} is no longer the default resume. It is still viewable at /${version.slug}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update publishing");
    } finally {
      setBusyVersion(version.id, false);
    }
  }

  /** Loads the version's full document and opens it in the JSON editor. */
  async function handleOpenVersionEdit(version: ResumeVersion) {
    setError("");
    setNotice("");
    setBusyVersion(version.id, true);
    try {
      const data: ResumeVersionDetail = await jsonFetch(`/api/resume-versions/${version.id}`);
      setDraftVersion({ version, json: JSON.stringify(data.resumeJson, null, 2) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the resume document");
    } finally {
      setBusyVersion(version.id, false);
    }
  }

  async function handleSaveVersionEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!draftVersion) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(draftVersion.json);
    } catch {
      setError("The document is not valid JSON. Fix the syntax before saving.");
      return;
    }

    setSavingVersionEdit(true);
    setError("");
    try {
      await jsonFetch(`/api/resume-versions/${draftVersion.version.id}`, {
        method: "PUT",
        body: JSON.stringify(parsed),
      });
      const editedVersion = draftVersion.version.version;
      setDraftVersion(null);
      if (selected) await loadVersions(selected.id);
      setNotice(`Version ${editedVersion} was updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the resume version");
    } finally {
      setSavingVersionEdit(false);
    }
  }

  async function handleDeleteVersion(version: ResumeVersion) {
    if (!window.confirm(`Delete version ${version.version}? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    setBusyVersion(version.id, true);
    try {
      await jsonFetch(`/api/resume-versions/${version.id}`, { method: "DELETE" });
      if (selected) await loadVersions(selected.id);
      await load();
      setNotice(`Version ${version.version} was deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete the resume version");
    } finally {
      setBusyVersion(version.id, false);
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
        <AdminActionButton type="button" onClick={openCreate} disabled={loading}>
          {loading ? <Spinner aria-hidden /> : null}
          + Add job
        </AdminActionButton>
      </AdminToolbar>

      {loading ? (
        <AdminStatus>
          <Spinner aria-hidden />
          Loading...
        </AdminStatus>
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
              {jobs.map((job) => {
                const busy = busyJobs.includes(job.id);
                return (
                  <tr key={job.id} style={job.isArchived ? { opacity: 0.55 } : undefined}>
                    <td data-label="Company">{job.companyName}</td>
                    <td data-label="Job title">{job.jobTitle}</td>
                    <td data-label="Location">{job.location || "—"}</td>
                    <td data-label="Versions">{job._count?.resumeVersions ?? 0}</td>
                    <td data-label="Created">{formatDate(job.createdAt)}</td>
                    <td className="actions">
                      <div className="actions-inner">
                        <AdminActionButton
                          type="button"
                          onClick={() => void openDetails(job)}
                          disabled={busy}
                        >
                          {busy ? <Spinner aria-hidden /> : null}
                          Details
                        </AdminActionButton>
                        <AdminActionButton type="button" onClick={() => openEdit(job)} disabled={busy}>
                          Edit
                        </AdminActionButton>
                        <AdminActionButton
                          type="button"
                          onClick={() => void handleArchive(job)}
                          disabled={busy}
                        >
                          {busy ? <Spinner aria-hidden /> : null}
                          {busy ? "Working..." : job.isArchived ? "Restore" : "Archive"}
                        </AdminActionButton>
                        <AdminActionButton
                          type="button"
                          className="danger"
                          onClick={() => void handleDelete(job)}
                          disabled={busy}
                        >
                          {busy ? <Spinner aria-hidden /> : null}
                          Delete
                        </AdminActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        </AdminTableScroll>
      )}

      {selected ? (
        <AdminModalOverlay onClick={() => setSelected(null)}>
          <AdminModalCard className="wide" onClick={(e) => e.stopPropagation()}>
            <h2>
              {selected.companyName} — {selected.jobTitle}
            </h2>

            <AdminDetailGrid>
              <div>
                <dt>Job title</dt>
                <dd>{selected.jobTitle}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{selected.location || "—"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(selected.createdAt)}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>
                  {[selected.contactName, selected.contactEmail, selected.contactPhone]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
              {selected.jobUrl ? (
                <div>
                  <dt>Job URL</dt>
                  <dd>
                    <a href={selected.jobUrl} target="_blank" rel="noreferrer">
                      {selected.jobUrl}
                    </a>
                  </dd>
                </div>
              ) : null}
              {selected.notes ? (
                <div>
                  <dt>Notes</dt>
                  <dd>{selected.notes}</dd>
                </div>
              ) : null}
              <div className="full">
                <dt>Job description</dt>
                <dd>
                  <AdminPre>{selected.jobDescription}</AdminPre>
                </dd>
              </div>
            </AdminDetailGrid>

            <h3 style={{ marginBottom: "1rem" }}>Resume versions</h3>

            {versionsLoading ? (
              <AdminStatus>
                <Spinner aria-hidden />
                Loading versions...
              </AdminStatus>
            ) : versions.length === 0 ? (
              <AdminStatus>No resume versions yet for this job.</AdminStatus>
            ) : (
              <AdminTableScroll>
                <AdminTable>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Generated</th>
                      <th>Status</th>
                      <th>URL</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((version) => {
                      const busy = busyVersions.includes(version.id);
                      return (
                        <tr key={version.id}>
                          <td data-label="Version">Version {version.version}</td>
                          <td data-label="Generated">{formatDate(version.createdAt)}</td>
                          <td data-label="Status">
                            {version.isActive ? "Default (live)" : "Viewable"}
                          </td>
                          <td data-label="URL">
                            <a href={`/${version.slug}`} target="_blank" rel="noreferrer">
                              /{version.slug}
                            </a>
                          </td>
                          <td className="actions">
                            <div className="actions-inner">
                              <AdminActionButton
                                type="button"
                                onClick={() => window.open(`/${version.slug}`, "_blank")}
                                disabled={busy}
                                title={`Open /${version.slug}`}
                              >
                                View
                              </AdminActionButton>
                            <AdminActionButton
                              type="button"
                              onClick={() => void handleOpenVersionEdit(version)}
                              disabled={busy}
                            >
                              {busy ? <Spinner aria-hidden /> : null}
                              Edit
                            </AdminActionButton>
                            {version.isActive ? (
                              <AdminActionButton
                                type="button"
                                onClick={() => void handlePublish(version, "unpublish")}
                                disabled={busy}
                              >
                                {busy ? <Spinner aria-hidden /> : null}
                                {busy ? "Working..." : "Unset default"}
                              </AdminActionButton>
                            ) : (
                              <AdminActionButton
                                type="button"
                                onClick={() => void handlePublish(version, "publish")}
                                disabled={busy}
                              >
                                {busy ? <Spinner aria-hidden /> : null}
                                {busy ? "Working..." : "Set as default"}
                              </AdminActionButton>
                            )}
                            <AdminActionButton
                              type="button"
                              className="danger"
                              onClick={() => void handleDeleteVersion(version)}
                              disabled={busy}
                            >
                              {busy ? <Spinner aria-hidden /> : null}
                              Delete
                            </AdminActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </AdminTable>
              </AdminTableScroll>
            )}

            <div className="modal-actions">
              <AdminActionButton
                type="button"
                className="cancel"
                onClick={() => setSelected(null)}
                disabled={generating}
              >
                Close
              </AdminActionButton>
              <AdminActionButton
                type="button"
                disabled={generating}
                onClick={() => void handleGenerate(selected)}
              >
                {generating ? <Spinner aria-hidden /> : null}
                {generating ? "Generating tailored resume..." : "Generate tailored resume"}
              </AdminActionButton>
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
                <AdminActionButton
                  type="button"
                  className="cancel"
                  onClick={() => setDraft(null)}
                  disabled={saving}
                >
                  Cancel
                </AdminActionButton>
                <AdminActionButton type="submit" disabled={saving}>
                  {saving ? <Spinner aria-hidden /> : null}
                  {saving ? "Saving..." : "Save"}
                </AdminActionButton>
              </div>
            </form>
          </AdminModalCard>
        </AdminModalOverlay>
      ) : null}

      {draftVersion ? (
        <AdminModalOverlay onClick={() => setDraftVersion(null)}>
          <AdminModalCard className="wide" onClick={(e) => e.stopPropagation()}>
            <h2>Edit version {draftVersion.version.version}</h2>
            <form onSubmit={handleSaveVersionEdit}>
              <AdminFormField>
                Resume document (JSON)
                <textarea
                  rows={18}
                  value={draftVersion.json}
                  spellCheck={false}
                  onChange={(e) => setDraftVersion({ ...draftVersion, json: e.target.value })}
                  style={{ fontFamily: "monospace", fontSize: "1.2rem", minHeight: "50vh" }}
                />
              </AdminFormField>

              <div className="modal-actions">
                <AdminActionButton
                  type="button"
                  className="cancel"
                  onClick={() => setDraftVersion(null)}
                  disabled={savingVersionEdit}
                >
                  Cancel
                </AdminActionButton>
                <AdminActionButton type="submit" disabled={savingVersionEdit}>
                  {savingVersionEdit ? <Spinner aria-hidden /> : null}
                  {savingVersionEdit ? "Saving..." : "Save changes"}
                </AdminActionButton>
              </div>
            </form>
          </AdminModalCard>
        </AdminModalOverlay>
      ) : null}
    </AdminPanel>
  );
}