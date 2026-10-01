/**
 * Plain-text normalisation for AI-generated resume content.
 *
 * The resume renders as plain text (`{about}`, `{project.description}`, ...), so
 * any markdown the model emits is shown literally: `**bold**` appears with its
 * asterisks, `*emphasis*` with its asterisks, `- bullet` with its dash, and
 * `[label](url)` as raw markup. The model is instructed not to use markdown, but
 * it does anyway often enough that the output is cleaned here rather than only
 * being asked for politely in the prompt.
 *
 * Deliberately conservative: only unambiguous markdown is removed. Content that
 * merely *contains* a special character (e.g. "C++", "Node.js", "50% growth",
 * "R&D") is left byte-identical, because silently altering the candidate's
 * facts would be worse than an occasional stray asterisk.
 */

/**
 * Converts markdown-flavoured text into the plain text the resume renders.
 *
 * Safe on any string and idempotent: running it twice produces the same result
 * as running it once, so it can be applied at several layers without harm.
 */
export function toPlainResumeText(input: string): string {
  if (!input) return input;

  let text = input;

  // Fenced code blocks: keep the content, drop the ``` fences (and any language
  // tag on the opening fence).
  text = text.replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, "$1");

  // Inline code: `text` -> text.
  text = text.replace(/`([^`]+)`/g, "$1");

  // Images before links: ![alt](url) -> alt. The alt text is what carries
  // meaning in a plain-text resume.
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Links: [label](url) -> label. Keeps the human-readable part.
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Reference-style links: [label][ref] -> label.
  text = text.replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1");

  // Bold + italic (***x*** / ___x___), bold (**x** / __x__), italic (*x* / _x_).
  // Ordered longest-delimiter-first so the shorter rule cannot eat half a pair.
  // The `\S`/`\s` guards keep underscores inside identifiers ("snake_case")
  // from being treated as emphasis markers.
  text = text.replace(/\*\*\*([\s\S]+?)\*\*\*/g, "$1");
  text = text.replace(/___([\s\S]+?)___/g, "$1");
  text = text.replace(/\*\*([\s\S]+?)\*\*/g, "$1");
  text = text.replace(/(^|\s)__([\s\S]+?)__(?=\s|$|[.,;:!?])/g, "$1$2");
  text = text.replace(/\*([^*\n]+)\*/g, "$1");
  text = text.replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,;:!?])/g, "$1$2");

  // Leading bullet markers and blockquote markers, per line.
  text = text
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s{0,3}>\s?/, "")
        .replace(/^\s*[-*+]\s+/, "")
        .replace(/^\s*\d+[.)]\s+/, ""),
    )
    .join("\n");

  // ATX headings: "## Title" -> "Title". Only a real heading (1-6 hashes then a
  // space) is touched, so "C# developer" and "#1 priority" survive.
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");

  // Horizontal rules on their own line.
  text = text.replace(/^\s*([-*_]\s*){3,}$/gm, "");

  // Strikethrough: ~~text~~ -> text.
  text = text.replace(/~~([\s\S]+?)~~/g, "$1");

  // Escaped markdown characters: "\*" -> "*".
  text = text.replace(/\\([\\`*_{}[\]()#+\-.!~>])/g, "$1");

  // Collapse the blank lines left behind by removed block markers, and trim.
  text = text
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}/**
 * Applies `toPlainResumeText` to every human-authored string in a resume.
 *
 * Used at the persistence and read boundaries so that:
 *  - documents saved before the plain-text rule existed are cleaned on the way
 *    out without needing to be regenerated, and
 *  - a manual edit cannot reintroduce markdown.
 *
 * Identity and asset fields (`head`, `backgroundVideo`, `resume`, image and
 * icon paths) are deliberately left untouched: they are machine-read values,
 * not prose, and rewriting them could break an asset reference.
 */
export function normalizeResumeText<T extends Record<string, any>>(resume: T): T {
  const mapAll = (values: string[] | undefined) => (values ?? []).map(toPlainResumeText);
  const plain = (value: string | null | undefined) =>
    typeof value === "string" ? toPlainResumeText(value) : value;

  return {
    ...resume,
    about: mapAll(resume.about),
    skills: mapAll(resume.skills),
    interests: mapAll(resume.interests),
    languages: mapAll(resume.languages),
    experience: (resume.experience ?? []).map((entry: any) => ({
      ...entry,
      title: toPlainResumeText(entry.title),
      company: toPlainResumeText(entry.company),
      description: plain(entry.description),
      location: plain(entry.location),
      accomplishments: mapAll(entry.accomplishments),
    })),
    education: (resume.education ?? []).map((entry: any) => ({
      ...entry,
      title: toPlainResumeText(entry.title),
      institute: toPlainResumeText(entry.institute),
      location: plain(entry.location),
      cgpa: plain(entry.cgpa),
      thesis: plain(entry.thesis),
    })),
    projects: (resume.projects ?? []).map((project: any) => ({
      ...project,
      title: toPlainResumeText(project.title),
      description: toPlainResumeText(project.description),
      techList: mapAll(project.techList),
    })),
    technologies: (resume.technologies ?? []).map((tech: any) => ({
      ...tech,
      title: toPlainResumeText(tech.title),
      category: toPlainResumeText(tech.category),
    })),
  } as T;
}