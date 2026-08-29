
const SECTION_LABELS = {
  about: "Professional Summary",
  experience: "Professional Experience",
  education: "Education",
  projects: "Selected Projects",
  technologies: "Technical Skills",
  skills: "Core Competencies",
  languages: "Languages",
  interests: "Interests",
};

const isPresent = (value) => value !== undefined && value !== null && (typeof value !== "string" || value.trim()) && (!Array.isArray(value) || value.length);
const toUrl = (value, baseUrl = "") => !isPresent(value) ? "" : (/^(https?:\/\/|mailto:|tel:)/i.test(value) ? value : `${baseUrl}${value}`);
const getDateRange = ({ start, from, startDate, end, to, endDate, current } = {}) => [start ?? from ?? startDate, end ?? to ?? endDate ?? current].filter(isPresent).join(" - ");

export async function exportResumePdf(resumeData) {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ format: "a4", unit: "mm" });
    const margin = 12;
    const pageWidth = 210;
    const pageBottom = 285;
    const contentWidth = pageWidth - (margin * 2);
    let y = 20;

    const newPage = () => { pdf.addPage(); y = 20; };
    const ensureSpace = (height) => { if (y + height > pageBottom) newPage(); };
    const write = (text, { bold = false, size = 10, indent = 0, lineHeight = 4.76 } = {}) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(size);
        const lines = pdf.splitTextToSize(String(text), contentWidth - indent);
        ensureSpace(lines.length * lineHeight);
        pdf.text(lines, margin + indent, y);
        y += lines.length * lineHeight;
    };
    const section = (title) => {
        ensureSpace(10);
        y += 3;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11.5);
        pdf.text(title.toUpperCase(), margin, y);
        y += 1.5;
        pdf.line(margin, y, pageWidth - margin, y);
        y += 4.5;
    };
    const link = (label, url, { center = false } = {}) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.3);
        const lines = pdf.splitTextToSize(label, contentWidth);
        ensureSpace(lines.length * 4.76);
        lines.forEach((line) => {
            const x = center ? (pageWidth - pdf.getTextWidth(line)) / 2 : margin;
            pdf.textWithLink(line, x, y, { url });
            y += 4.76;
        });
    };
    const entryHeading = (title, organization, entry) => {
        const meta = [getDateRange(entry), entry.location].filter(isPresent).join(" | ");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.3);
        const titleLines = pdf.splitTextToSize(title, meta ? contentWidth - 55 : contentWidth);
        ensureSpace(Math.max(titleLines.length * 4.7, 8));
        pdf.text(titleLines, margin, y);
        if (meta) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9.3);
            pdf.text(meta, pageWidth - margin, y, { align: "right" });
        }
        y += titleLines.length * 4.7;
        if (organization) write(organization, { bold: true, size: 10 });
    };
    const projectHeading = (title, url) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.3);
        const urlLabel = url?.replace(/^https?:\/\//, "") || "";
        const titleLines = pdf.splitTextToSize(title, urlLabel ? contentWidth - 68 : contentWidth);
        ensureSpace(Math.max(titleLines.length * 4.7, 8));
        pdf.text(titleLines, margin, y);
        if (urlLabel) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8.6);
            pdf.textWithLink(urlLabel, pageWidth - margin, y, { align: "right", url });
        }
        y += titleLines.length * 4.7;
    };
    const { head = {}, about = [], experience = [], education = [], projects = [], technologies = [], skills = [], languages = [], interests = [] } = resumeData;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.text(head.name || "Resume", pageWidth / 2, y, { align: "center" });
    y += 6.5;
    if (head.title) { pdf.setFontSize(11); pdf.text(head.title, pageWidth / 2, y, { align: "center" }); y += 5; }
    const contacts = [
        head.phone && [head.phone, `tel:${head.phone.replace(/\s/g, "")}`],
        head.email && [head.email, `mailto:${head.email}`],
        head.linkedIn && [`linkedin.com/in/${head.linkedIn}`, toUrl(head.linkedIn, "https://www.linkedin.com/in/")],
        head.github && [`github.com/${head.github}`, toUrl(head.github, "https://github.com/")],
    ].filter(Boolean);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.3);
    const separator = " | ";
    const rowWidth = contacts.reduce((total, [label]) => total + pdf.getTextWidth(label), 0) + (Math.max(contacts.length - 1, 0) * pdf.getTextWidth(separator));
    let contactX = (pageWidth - rowWidth) / 2;
    contacts.forEach(([label, url], index) => {
        pdf.textWithLink(label, contactX, y, { url });
        contactX += pdf.getTextWidth(label);
        if (index < contacts.length - 1) { pdf.text(separator, contactX, y); contactX += pdf.getTextWidth(separator); }
    });
    y += 5;

    const summary = (Array.isArray(about) ? about : [about]).filter(isPresent).join(" ");
    if (summary) { section(SECTION_LABELS.about); write(summary); }
    if (experience.length) {
        section(SECTION_LABELS.experience);
        experience.filter(Boolean).forEach((job) => {
            entryHeading(job.title, job.company, job);
            if (job.description) write(job.description);
            (job.accomplishments || []).filter(isPresent).forEach((item) => write(`- ${item}`, { indent: 3 }));
            y += 2;
        });
    }
    if (education.length) {
        section(SECTION_LABELS.education);
        education.filter(Boolean).forEach((item) => {
            entryHeading(item.title, item.institute, item);
            if (item.cgpa) write(`CGPA: ${item.cgpa}`);
            if (item.thesis) write(`Thesis: ${item.thesis}`);
            y += 2;
        });
    }
    if (projects.length) {
        section(SECTION_LABELS.projects);
        projects.filter(Boolean).forEach((project) => {
            projectHeading(project.title || "Project", project.github && toUrl(project.github));
            if (project.description) write(project.description);
            if (project.techList?.length) write(`Technologies: ${project.techList.filter(isPresent).join(", ")}`, { size: 9.6, lineHeight: 4.6 });
            y += 1.5;
        });
    }
    [
        [SECTION_LABELS.technologies, technologies.map((item) => typeof item === "object" ? item.title : item)],
        [SECTION_LABELS.skills, skills], [SECTION_LABELS.languages, languages], [SECTION_LABELS.interests, interests],
    ].forEach(([title, items]) => {
        const text = items.filter(isPresent).join(", ");
        if (text) { section(title); write(text); }
    });
    pdf.save(`${(head.name || "Resume").replace(/\s+/g, "-")}-ATS-Resume.pdf`);
}