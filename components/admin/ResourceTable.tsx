"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminModalCard,
  AdminModalOverlay,
  AdminPanel,
  AdminStatus,
  AdminTable,
  AdminToolbar,
} from "./styles";

export type FieldType = "text" | "textarea" | "number" | "list" | "boolean";

export interface FieldConfig {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  hideInTable?: boolean;
}

interface ResourceTableProps {
  /** API path segment, e.g. "projects" -> /api/projects */
  resource: string;
  title: string;
  fields: FieldConfig[];
}

type Row = Record<string, any>;

function fieldType(field: FieldConfig): FieldType {
  return field.type ?? "text";
}

function emptyDraft(fields: FieldConfig[]): Row {
  const draft: Row = {};
  for (const field of fields) {
    if (fieldType(field) === "list") draft[field.name] = "";
    else if (fieldType(field) === "number") draft[field.name] = "0";
    else if (fieldType(field) === "boolean") draft[field.name] = "true";
    else draft[field.name] = "";
  }
  return draft;
}

function draftFromRow(fields: FieldConfig[], row: Row): Row {
  const draft: Row = {};
  for (const field of fields) {
    const value = row[field.name];
    if (fieldType(field) === "list") draft[field.name] = Array.isArray(value) ? value.join("\n") : "";
    else if (fieldType(field) === "boolean") draft[field.name] = value ? "true" : "false";
    else draft[field.name] = value ?? "";
  }
  return draft;
}

function toPayload(fields: FieldConfig[], draft: Row): Row {
  const payload: Row = {};
  for (const field of fields) {
    const raw = String(draft[field.name] ?? "");
    const type = fieldType(field);
    if (type === "list") {
      payload[field.name] = raw.split("\n").map((s) => s.trim()).filter(Boolean);
    } else if (type === "number") {
      payload[field.name] = raw === "" ? 0 : Number(raw);
    } else if (type === "boolean") {
      payload[field.name] = raw === "true";
    } else {
      payload[field.name] = raw === "" ? null : raw;
    }
  }
  return payload;
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

export function ResourceTable({ resource, title, fields }: ResourceTableProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Row | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await jsonFetch(`/api/${resource}`);
      setRows(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft(fields));
  }

  function openEdit(row: Row) {
    setEditingId(row.id);
    setDraft(draftFromRow(fields, row));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const payload = toPayload(fields, draft);
      if (editingId) {
        await jsonFetch(`/api/${resource}/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await jsonFetch(`/api/${resource}`, { method: "POST", body: JSON.stringify(payload) });
      }
      setDraft(null);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Row) {
    if (!window.confirm(`Delete this ${title.toLowerCase()} item?`)) return;
    try {
      await jsonFetch(`/api/${resource}/${row.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const tableFields = fields.filter((field) => !field.hideInTable);

  return (
    <AdminPanel>
      <h2>{title}</h2>

      {error ? <AdminStatus style={{ color: "#e31f71" }}>{error}</AdminStatus> : null}

      <AdminToolbar>
        <button type="button" onClick={openCreate}>
          + Add {title.replace(/s$/, "")}
        </button>
      </AdminToolbar>

      {loading ? (
        <AdminStatus>Loading...</AdminStatus>
      ) : rows.length === 0 ? (
        <AdminStatus>No items yet. Click “Add” to create one.</AdminStatus>
      ) : (
        <AdminTable>
          <thead>
            <tr>
              {tableFields.map((field) => (
                <th key={field.name}>{field.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {tableFields.map((field) => (
                  <td key={field.name}>{renderCell(row[field.name])}</td>
                ))}
                <td className="actions">
                  <button type="button" onClick={() => openEdit(row)}>
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => handleDelete(row)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}

      {draft ? (
        <AdminModalOverlay onClick={() => setDraft(null)}>
          <AdminModalCard onClick={(e) => e.stopPropagation()}>
            <h2>
              {editingId ? "Edit" : "Add"} {title.replace(/s$/, "")}
            </h2>
            <form onSubmit={handleSubmit}>
              {fields.map((field) => (
                <label key={field.name} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "1.3rem" }}>
                  {field.label}
                  {fieldType(field) === "textarea" || fieldType(field) === "list" ? (
                    <textarea
                      value={String(draft[field.name] ?? "")}
                      placeholder={field.placeholder}
                      onChange={(e) => setDraft({ ...draft, [field.name]: e.target.value })}
                    />
                  ) : fieldType(field) === "boolean" ? (
                    <select
                      value={String(draft[field.name] ?? "true")}
                      onChange={(e) => setDraft({ ...draft, [field.name]: e.target.value })}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <input
                      type={fieldType(field) === "number" ? "number" : "text"}
                      value={String(draft[field.name] ?? "")}
                      placeholder={field.placeholder}
                      onChange={(e) => setDraft({ ...draft, [field.name]: e.target.value })}
                    />
                  )}
                </label>
              ))}

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

function renderCell(value: any) {
  if (value === null || value === undefined || value === "") return <span style={{ opacity: 0.5 }}>—</span>;
  if (Array.isArray(value)) {
    const text = value.join(", ");
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  }
  const text = String(value);
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}
