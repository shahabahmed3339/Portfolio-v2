// import regularFontUrl from "../fonts/Aptos.ttf";
// import boldFontUrl from "../fonts/Aptos-Bold.ttf";

// const regularFontFile = "Aptos.ttf";
// const boldFontFile = "Aptos-Bold.ttf";

const SECTION_LABELS = {
    about: "Professional Summary",
    experience: "Professional Experience",
    education: "Education",
    projects: "Selected Projects",
    technologies: "Technical Skills",
    skills: "Core Competencies",
    languages: "Languages",
};

const PDF_CONFIG = {
    document: { format: "a4", unit: "mm" },
    page: { width: 210, margin: 12, contentTop: 20, contentBottom: 285 },
    // font: { family: "Aptos", normal: "normal", bold: "bold", normalFile: regularFontFile, boldFile: boldFontFile, normalUrl: regularFontUrl, boldUrl: boldFontUrl },
    font: { family: "helvetica", normal: "normal", bold: "bold" },
    type: { name: 24, title: 11, section: 11.5, entry: 10.3, body: 10, contact: 9.3, detail: 9.6, projectUrl: 8.6 },
    lineHeight: { body: 4.76, compact: 4.6, entry: 4.7, contact: 4.76 },
    spacing: {
        afterName: 6.5, afterTitle: 5, afterContactRows: 0.24, afterEntry: 2, afterProject: 1.5,
        afterCategory: 1, sectionMinimum: 10, sectionTop: 3, sectionAfterTitle: 1.5, sectionAfterLine: 4.5,
    },
    layout: { entryMetaWidth: 55, projectLinkWidth: 68, bulletIndent: 3, minimumHeadingHeight: 8 },
    text: { contactSeparator: " | ", uncategorizedTechnology: "Other" },
};

const isPresent = (value) => value !== undefined && value !== null && (typeof value !== "string" || value.trim()) && (!Array.isArray(value) || value.length);
const toUrl = (value, baseUrl = "") => !isPresent(value) ? "" : (/^(https?:\/\/|mailto:|tel:)/i.test(value) ? value : `${baseUrl}${value}`);
const getDateRange = ({ start, from, startDate, end, to, endDate, current } = {}) => [start ?? from ?? startDate, end ?? to ?? endDate ?? current].filter(isPresent).join(" - ");

// const loadFontAsBase64 = async (fontUrl) => {
//     const response = await fetch(fontUrl);

//     if (!response.ok) {
//         throw new Error(`Failed to load font: ${fontUrl}`);
//     }

//     const arrayBuffer = await response.arrayBuffer();
//     const bytes = new Uint8Array(arrayBuffer);

//     let binary = "";
//     const chunkSize = 0x8000;

//     for (let i = 0; i < bytes.length; i += chunkSize) {
//         binary += String.fromCharCode(
//             ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
//         );
//     }

//     return btoa(binary);
// };

// const registerFont = async (pdf, {
//     url,
//     fileName,
//     family,
//     style,
// }) => {
//     const base64 = await loadFontAsBase64(url);

//     pdf.addFileToVFS(fileName, base64);
//     pdf.addFont(fileName, family, style);
// };


export async function exportResumePdf(resumeData) {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF(PDF_CONFIG.document);
    const { page, font, type, lineHeight, spacing, layout, text } = PDF_CONFIG;

    // await registerFont(pdf, {
    //     url: font.normalUrl,
    //     fileName: font.normalFile,
    //     family: font.family,
    //     style: "normal",
    // });

    // await registerFont(pdf, {
    //     url: font.boldUrl,
    //     fileName: font.boldFile,
    //     family: font.family,
    //     style: "bold",
    // });

    const margin = page.margin;
    const pageWidth = page.width;
    const pageBottom = page.contentBottom;
    const contentWidth = pageWidth - (margin * 2);
    let y = page.contentTop;

    const setTextStyle = (size, bold = false) => {
        pdf.setFont(font.family, bold ? font.bold : font.normal);
        pdf.setFontSize(size);
    };
    const newPage = () => { pdf.addPage(); y = page.contentTop; };
    const ensureSpace = (height) => { if (y + height > pageBottom) newPage(); };
    const write = (value, { bold = false, size = type.body, indent = 0, lineHeight: textLineHeight = lineHeight.body } = {}) => {
        setTextStyle(size, bold);
        const lines = pdf.splitTextToSize(String(value), contentWidth - indent);
        ensureSpace(lines.length * textLineHeight);
        pdf.text(lines, margin + indent, y);
        y += lines.length * textLineHeight;
    };
    const writeCategory = (category, items) => {
        const label = `${category}: `;
        setTextStyle(type.detail, true);
        const labelWidth = pdf.getTextWidth(label);
        setTextStyle(type.detail);
        const lines = pdf.splitTextToSize(items.join(", "), contentWidth - labelWidth);
        ensureSpace(lines.length * lineHeight.compact);
        setTextStyle(type.detail, true);
        pdf.text(label, margin, y);
        setTextStyle(type.detail);
        pdf.text(lines[0], margin + labelWidth, y);
        lines.slice(1).forEach((line, index) => pdf.text(line, margin, y + ((index + 1) * lineHeight.compact)));
        y += lines.length * lineHeight.compact;
    };
    const section = (title) => {
        ensureSpace(spacing.sectionMinimum);
        y += spacing.sectionTop;
        setTextStyle(type.section, true);
        pdf.text(title.toUpperCase(), margin, y);
        y += spacing.sectionAfterTitle;
        pdf.line(margin, y, pageWidth - margin, y);
        y += spacing.sectionAfterLine;
    };
    const entryHeading = (title, organization, entry) => {
        const meta = [getDateRange(entry), entry.location].filter(isPresent).join(text.contactSeparator);
        setTextStyle(type.entry, true);
        const titleLines = pdf.splitTextToSize(title, meta ? contentWidth - layout.entryMetaWidth : contentWidth);
        ensureSpace(Math.max(titleLines.length * lineHeight.entry, layout.minimumHeadingHeight));
        pdf.text(titleLines, margin, y);
        if (meta) {
            setTextStyle(type.contact);
            pdf.text(meta, pageWidth - margin, y, { align: "right" });
        }
        y += titleLines.length * lineHeight.entry;
        if (organization) write(organization, { bold: true });
    };
    const projectHeading = (title, url) => {
        setTextStyle(type.entry, true);
        const urlLabel = url?.replace(/^https?:\/\//, "") || "";
        const titleLines = pdf.splitTextToSize(title, urlLabel ? contentWidth - layout.projectLinkWidth : contentWidth);
        ensureSpace(Math.max(titleLines.length * lineHeight.entry, layout.minimumHeadingHeight));
        pdf.text(titleLines, margin, y);
        if (urlLabel) {
            setTextStyle(type.projectUrl);
            pdf.textWithLink(urlLabel, pageWidth - margin, y, { align: "right", url });
        }
        y += titleLines.length * lineHeight.entry;
    };
    const { head = {}, about = [], experience = [], education = [], projects = [], technologies = [], skills = [], languages = [] } = resumeData;

    setTextStyle(type.name, true);
    pdf.text(head.name || "Resume", pageWidth / 2, y, { align: "center" });
    y += spacing.afterName;
    if (head.title) { setTextStyle(type.title); pdf.text(head.title, pageWidth / 2, y, { align: "center" }); y += spacing.afterTitle; }
    const contacts = [
        head.phone && [head.phone, `tel:${head.phone.replace(/\s/g, "")}`],
        head.email && [head.email, `mailto:${head.email}`],
        head.linkedIn && [`linkedin.com/in/${head.linkedIn}`, toUrl(head.linkedIn, "https://www.linkedin.com/in/")],
        head.github && [`github.com/${head.github}`, toUrl(head.github, "https://github.com/")],
        head.portfolio && [head.portfolio.replace(/^https?:\/\//, ""), toUrl(head.portfolio)],
    ].filter(Boolean);
    setTextStyle(type.contact);
    const separator = text.contactSeparator;
    const contactRows = contacts.reduce((rows, contact) => {
        const currentRow = rows[rows.length - 1];
        const currentWidth = currentRow.reduce((total, [label]) => total + pdf.getTextWidth(label), 0) + Math.max(currentRow.length - 1, 0) * pdf.getTextWidth(separator);
        const nextWidth = pdf.getTextWidth(contact[0]) + (currentRow.length ? pdf.getTextWidth(separator) : 0);
        if (currentRow.length && currentWidth + nextWidth > contentWidth) rows.push([contact]);
        else currentRow.push(contact);
        return rows;
    }, [[]]);
    contactRows.forEach((row) => {
        const rowWidth = row.reduce((total, [label]) => total + pdf.getTextWidth(label), 0) + Math.max(row.length - 1, 0) * pdf.getTextWidth(separator);
        let contactX = (pageWidth - rowWidth) / 2;
        row.forEach(([label, url], index) => {
            pdf.textWithLink(label, contactX, y, { url });
            contactX += pdf.getTextWidth(label);
            if (index < row.length - 1) { pdf.text(separator, contactX, y); contactX += pdf.getTextWidth(separator); }
        });
        y += lineHeight.contact;
    });
    y += spacing.afterContactRows;

    const summary = (Array.isArray(about) ? about : [about]).filter(isPresent).join(" ");
    if (summary) { section(SECTION_LABELS.about); write(summary); }
    if (experience.length) {
        section(SECTION_LABELS.experience);
        experience.filter(Boolean).forEach((job) => {
            entryHeading(job.title, job.company, job);
            if (job.description) write(job.description);
            (job.accomplishments || []).filter(isPresent).forEach((item) => write(`- ${item}`, { indent: layout.bulletIndent }));
            y += spacing.afterEntry;
        });
    }
    if (education.length) {
        section(SECTION_LABELS.education);
        education.filter(Boolean).forEach((item) => {
            entryHeading(item.title, item.institute, item);
            if (item.cgpa) write(`CGPA: ${item.cgpa}`);
            if (item.thesis) write(`Thesis: ${item.thesis}`);
            y += spacing.afterEntry;
        });
    }
    if (projects.length) {
        section(SECTION_LABELS.projects);
        projects.filter(Boolean).forEach((project) => {
            projectHeading(project.title || "Project", project.github && toUrl(project.github));
            if (project.description) write(project.description);
            if (project.techList?.length) write(`Technologies: ${project.techList.filter(isPresent).join(", ")}`, { size: type.detail, lineHeight: lineHeight.compact });
            y += spacing.afterProject;
        });
    }
    if (technologies.length) {
        const technologiesByCategory = technologies.filter(isPresent).reduce((groups, item) => {
            const title = typeof item === "object" ? item.title : item;
            const category = typeof item === "object" && isPresent(item.category) ? item.category : text.uncategorizedTechnology;
            if (!isPresent(title)) return groups;
            if (!groups.has(category)) groups.set(category, []);
            groups.get(category).push(title);
            return groups;
        }, new Map());

        section(SECTION_LABELS.technologies);
        technologiesByCategory.forEach((items, category) => {
            writeCategory(category, items);
            y += spacing.afterCategory;
        });
    }
    [
        [SECTION_LABELS.skills, skills], [SECTION_LABELS.languages, languages],
    ].forEach(([title, items]) => {
        const text = items.filter(isPresent).join(", ");
        if (text) { section(title); write(text); }
    });
    pdf.save(`${(head.name || "Resume").replace(/\s+/g, "-")}-Resume.pdf`);
}
