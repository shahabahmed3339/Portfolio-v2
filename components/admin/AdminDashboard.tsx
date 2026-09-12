"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ResourceTable, type FieldConfig } from "./ResourceTable";
import { ProfileEditor } from "./ProfileEditor";
import { AdminHeader, AdminRoot, AdminStatus, AdminTabBar } from "./styles";

interface Tab {
  key: string;
  label: string;
  resource: string;
  fields: FieldConfig[];
}

const TABS: Tab[] = [
  {
    key: "projects",
    label: "Projects",
    resource: "projects",
    fields: [
      { name: "title", label: "Title" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "techList", label: "Tech (one per line)", type: "list" },
      { name: "github", label: "GitHub URL" },
      { name: "liveUrl", label: "Live URL" },
      { name: "isVisible", label: "Visible", type: "boolean", hideInTable: true },
      { name: "sortOrder", label: "Sort order", type: "number", hideInTable: true },
    ],
  },
  {
    key: "experience",
    label: "Experience",
    resource: "experience",
    fields: [
      { name: "title", label: "Title" },
      { name: "company", label: "Company" },
      { name: "description", label: "Description", type: "textarea", hideInTable: true },
      { name: "location", label: "Location", hideInTable: true },
      { name: "start", label: "Start" },
      { name: "end", label: "End" },
      { name: "image", label: "Image path", hideInTable: true },
      { name: "accomplishments", label: "Accomplishments (one per line)", type: "list", hideInTable: true },
      { name: "sortOrder", label: "Sort order", type: "number", hideInTable: true },
    ],
  },
  {
    key: "education",
    label: "Education",
    resource: "education",
    fields: [
      { name: "title", label: "Degree" },
      { name: "institute", label: "Institute" },
      { name: "location", label: "Location", hideInTable: true },
      { name: "start", label: "Start" },
      { name: "end", label: "End" },
      { name: "cgpa", label: "CGPA", hideInTable: true },
      { name: "thesis", label: "Thesis", type: "textarea", hideInTable: true },
      { name: "image", label: "Image path", hideInTable: true },
      { name: "sortOrder", label: "Sort order", type: "number", hideInTable: true },
    ],
  },
  {
    key: "technologies",
    label: "Technologies",
    resource: "technologies",
    fields: [
      { name: "title", label: "Title" },
      { name: "category", label: "Category" },
      { name: "icon", label: "Icon path" },
      { name: "sortOrder", label: "Sort order", type: "number", hideInTable: true },
    ],
  },
  {
    key: "skills",
    label: "Skills",
    resource: "skills",
    fields: [
      { name: "title", label: "Skill" },
      { name: "sortOrder", label: "Sort order", type: "number", hideInTable: true },
    ],
  },
  {
    key: "about",
    label: "About",
    resource: "about",
    fields: [
      { name: "text", label: "Paragraph", type: "textarea" },
      { name: "sortOrder", label: "Sort order", type: "number", hideInTable: true },
    ],
  },
  {
    key: "languages",
    label: "Languages",
    resource: "languages",
    fields: [
      { name: "name", label: "Language" },
      { name: "proficiency", label: "Proficiency" },
      { name: "sortOrder", label: "Sort order", type: "number", hideInTable: true },
    ],
  },
  {
    key: "social-links",
    label: "Social links",
    resource: "social-links",
    fields: [
      { name: "title", label: "Title" },
      { name: "url", label: "URL" },
      { name: "icon", label: "Icon path" },
      { name: "sortOrder", label: "Sort order", type: "number", hideInTable: true },
    ],
  },
];

export function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [active, setActive] = useState<string>("projects");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <AdminRoot>
        <AdminStatus style={{ padding: "8rem 2rem" }}>Checking session...</AdminStatus>
      </AdminRoot>
    );
  }

  if (status === "unauthenticated") return null;

  const activeTab = TABS.find((tab) => tab.key === active);

  return (
    <AdminRoot style={{ padding: "8rem 2rem 4rem" }}>
      <AdminHeader>
        <h1>Portfolio admin</h1>
        <div className="actions">
          <span>
            {session?.user?.name ?? session?.user?.email} <Link href="/">← View site</Link>
          </span>
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </button>
        </div>
      </AdminHeader>

      <AdminTabBar>
        <button
          type="button"
          className={active === "profile" ? "active" : ""}
          onClick={() => setActive("profile")}
        >
          Head / Profile
        </button>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={active === tab.key ? "active" : ""}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </AdminTabBar>

      {active === "profile" ? (
        <ProfileEditor />
      ) : activeTab ? (
        <ResourceTable
          key={activeTab.key}
          resource={activeTab.resource}
          title={activeTab.label}
          fields={activeTab.fields}
        />
      ) : null}
    </AdminRoot>
  );
}
