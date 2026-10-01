"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminActionButton,
  AdminFormField,
  AdminModalCard,
  AdminModalOverlay,
  AdminPanel,
  AdminStatus,
  AdminTable,
  AdminTableScroll,
  AdminToolbar,
  Spinner,
} from "./styles";

/**
 * Flat overview of every tailored resume version across all jobs, plus the
 * current live-resume state.
 *
 * The key thing this screen must always make obvious: whether the public
 * portfolio is currently showing the canonical resume or a tailored one, and
 * whether each version is publicly reachable.
 */

interface VersionRow {
  id: string;
  jobId: string | null;
  version: number;
  slug: string;
  status: string;
  isPublished: boolean;
  isActive: boolean;
  createdAt: string;
  job: { id: string; companyName: string; jobTitle: string } | null;
}

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

export function ResumeVersionsPanel() {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [aiConfiguration, setAiConfiguration] = useState("");
  const [aiMissingKeyMessage, setAiMissingKeyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /**
   * Ids of rows with an action in flight. A set (rather than a single id) means
   * two actions on different rows can run without hiding each other's spinner.
   */
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [resetting, setResetting] = useState(false);
  const [draft, setDraft] = useState<{ version: VersionRow; json: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await jsonFetch("/api/resume-versions");
      setVersions(data.versions ?? []);
      setAiConfigured(Boolean(data.aiConfigured));
      setAiConfiguration(data.aiConfiguration ?? "");
      setAiMissingKeyMessage(data.aiMissingKeyMessage ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resume versions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeVersion = versions.find((version) => version.isActive) ?? null;

  function setBusy(id: string, busy: boolean) {
    setBusyIds((current) =>
      busy ? [...new Set([...current, id])] : current.filter((value) => value !== id),
    );
  }

  async function handlePublish(version: VersionRow, action: "publish" | "unpublish") {
    setError("");
    setNotice("");
    setBusy(version.id, true);
    try {
      await jsonFetch(`/api/resume-versions/${version.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await load();
      setNotice(
        action === "publish"
          ? `Version ${version.version} is now the default resume on the public portfolio.`
          : `Version ${version.version} is no longer the default resume. It is still viewable at /${version.slug}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update publishing");
    } finally {
      setBusy(version.id, false);
    }
  }

  async function handleResetToCanonical() {
    setError("");
    setNotice("");
    setResetting(true);
    try {
      await jsonFetch("/api/resume-versions/active", { method: "POST" });
      await load();
      setNotice("The public portfolio is back to the canonical resume from src/data.js.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset the active resume");
    } finally {
      setResetting(false);
    }
  }

  /**
   * Loads the full document for a version and opens it in the JSON editor.
   *
   * The document is edited as raw JSON (rather than a form per field) because a
   * resume is deeply nested; the server re-validates it against `resumeSchema`
   * before saving, so a malformed edit is rejected instead of corrupting it.
   */
  async function handleOpenEdit(version: VersionRow) {
    setError("");
    setNotice("");
    setBusy(version.id, true);
    try {
      const data = await jsonFetch(`/api/resume-versions/${version.id}`);
      setDraft({ version, json: JSON.stringify(data.resumeJson, null, 2) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the resume document");
    } finally {
      setBusy(version.id, false);
    }
  }

  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(draft.json);
    } catch {
      setError("The document is not valid JSON. Fix the syntax before saving.");
      return;
    }

    setSavingEdit(true);
    setError("");
    try {
      await jsonFetch(`/api/resume-versions/${draft.version.id}`, {
        method: "PUT",
        body: JSON.stringify(parsed),
      });
      setDraft(null);
      await load();
      setNotice(`Version ${draft.version.version} was updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the resume version");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(version: VersionRow) {
    if (
      !window.confirm(
        `Delete version ${version.version} for ${version.job?.companyName ?? "this job"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError("");
    setNotice("");
    setBusy(version.id, true);
    try {
      await jsonFetch(`/api/resume-versions/${version.id}`, { method: "DELETE" });
      await load();
      setNotice(`Version ${version.version} was deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete the resume version");
    } finally {
      setBusy(version.id, false);
    }
  }

  return (
    <AdminPanel>
      <h2>Resume versions</h2>

      {!aiConfigured ? (
        <AdminStatus style={{ color: "#e31f71" }}>
          {aiMissingKeyMessage ||
            "No AI provider is configured. Add an API key to your .env file and restart the server to enable resume generation."}
        </AdminStatus>
      ) : null}

      {error ? <AdminStatus style={{ color: "#e31f71" }}>{error}</AdminStatus> : null}
      {notice ? <AdminStatus style={{ color: "#4B8BBE" }}>{notice}</AdminStatus> : null}

      <AdminStatus>
        <strong>Live on the public portfolio:</strong>{" "}
        {activeVersion
          ? `Version ${activeVersion.version} for ${activeVersion.job?.companyName ?? "—"}`
          : "Canonical resume (src/data.js)"}
      </AdminStatus>

      {aiConfigured ? (
        <AdminStatus>
          <strong>Resume generation:</strong> {aiConfiguration}
        </AdminStatus>
      ) : null}

      <AdminToolbar>
        <AdminActionButton
          type="button"
          onClick={() => void handleResetToCanonical()}
          disabled={!activeVersion || resetting}
        >
          {resetting ? <Spinner aria-hidden /> : null}
          {resetting ? "Switching..." : "Use canonical resume"}
        </AdminActionButton>
      </AdminToolbar>

      {loading ? (
        <AdminStatus>
          <Spinner aria-hidden />
          Loading...
        </AdminStatus>
      ) : versions.length === 0 ? (
        <AdminStatus>
          No tailored resumes yet. Create a job under “Jobs”, then generate a tailored resume.
        </AdminStatus>
      ) : (
        <AdminTableScroll>
          <AdminTable>
            <thead>
              <tr>
                <th>Job</th>
                <th>Version</th>
                <th>Generated</th>
                <th>Status</th>
                <th>URL</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => {
                const busy = busyIds.includes(version.id);
                return (
                  <tr key={version.id}>
                    <td data-label="Job">
                      {version.job ? `${version.job.companyName} — ${version.job.jobTitle}` : "—"}
                    </td>
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
                          onClick={() => void handleOpenEdit(version)}
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
                          onClick={() => void handleDelete(version)}
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

      {draft ? (
        <AdminModalOverlay onClick={() => setDraft(null)}>
          <AdminModalCard className="wide" onClick={(e) => e.stopPropagation()}>
            <h2>
              Edit version {draft.version.version}
              {draft.version.job ? ` — ${draft.version.job.companyName}` : ""}
            </h2>
            <form onSubmit={handleSaveEdit}>
              <AdminFormField>
                Resume document (JSON)
                <textarea
                  rows={18}
                  value={draft.json}
                  spellCheck={false}
                  onChange={(e) => setDraft({ ...draft, json: e.target.value })}
                  style={{ fontFamily: "monospace", fontSize: "1.2rem", minHeight: "50vh" }}
                />
              </AdminFormField>

              <div className="modal-actions">
                <AdminActionButton
                  type="button"
                  className="cancel"
                  onClick={() => setDraft(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </AdminActionButton>
                <AdminActionButton type="submit" disabled={savingEdit}>
                  {savingEdit ? <Spinner aria-hidden /> : null}
                  {savingEdit ? "Saving..." : "Save changes"}
                </AdminActionButton>
              </div>
            </form>
          </AdminModalCard>
        </AdminModalOverlay>
      ) : null}
    </AdminPanel>
  );
}