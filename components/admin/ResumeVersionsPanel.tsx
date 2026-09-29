"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPanel, AdminStatus, AdminTable, AdminTableScroll, AdminToolbar } from "./styles";

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

  async function handlePublish(version: VersionRow, action: "publish" | "unpublish") {
    setError("");
    setNotice("");
    try {
      await jsonFetch(`/api/resume-versions/${version.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await load();
      setNotice(
        action === "publish"
          ? `Version ${version.version} is now the live resume on the public portfolio.`
          : `Version ${version.version} was unpublished.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update publishing");
    }
  }

  async function handleResetToCanonical() {
    setError("");
    setNotice("");
    try {
      await jsonFetch("/api/resume-versions/active", { method: "POST" });
      await load();
      setNotice("The public portfolio is back to the canonical resume from src/data.js.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset the active resume");
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
        <button type="button" onClick={() => void handleResetToCanonical()} disabled={!activeVersion}>
          Use canonical resume
        </button>
      </AdminToolbar>

      {loading ? (
        <AdminStatus>Loading...</AdminStatus>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr key={version.id}>
                  <td data-label="Job">
                    {version.job ? `${version.job.companyName} — ${version.job.jobTitle}` : "—"}
                  </td>
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
                        disabled={!version.isPublished}
                        title={version.isPublished ? "Open public URL" : "Publish this version first"}
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
        </AdminTableScroll>
      )}
    </AdminPanel>
  );
}