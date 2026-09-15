"use client";

import { useEffect, useState } from "react";
import { AdminButton, AdminFormField, AdminFormGrid, AdminPanel, AdminStatus } from "./styles";

const FIELDS: { name: string; label: string; number?: boolean }[] = [
  { name: "name", label: "Name" },
  { name: "title", label: "Title" },
  { name: "totalExperience", label: "Total experience (years)", number: true },
  { name: "profile", label: "Profile image path" },
  { name: "location", label: "Location" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email" },
  { name: "linkedIn", label: "LinkedIn handle" },
  { name: "github", label: "GitHub handle" },
  { name: "portfolio", label: "Portfolio URL" },
  { name: "backgroundVideo", label: "Background video path" },
  { name: "resume", label: "Resume PDF path" },
];

export function ProfileEditor() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((profile) => {
        const next: Record<string, string> = {};
        for (const field of FIELDS) next[field.name] = profile[field.name] ?? "";
        setValues(next);
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload: Record<string, any> = {};
      for (const field of FIELDS) {
        const raw = values[field.name] ?? "";
        payload[field.name] = field.number ? Number(raw || 0) : raw || null;
      }
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to save");
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminPanel>
        <AdminStatus>Loading profile...</AdminStatus>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel>
      <h2>Head / Profile</h2>
      {error ? <AdminStatus style={{ color: "#e31f71" }}>{error}</AdminStatus> : null}
      {message ? <AdminStatus style={{ color: "#4B8BBE" }}>{message}</AdminStatus> : null}

      <AdminFormGrid onSubmit={handleSubmit}>
        {FIELDS.map((field) => (
          <AdminFormField key={field.name}>
            {field.label}
            <input
              type={field.number ? "number" : "text"}
              value={values[field.name] ?? ""}
              onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
            />
          </AdminFormField>
        ))}
        <div>
          <AdminButton type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </AdminButton>
        </div>
      </AdminFormGrid>
    </AdminPanel>
  );
}
