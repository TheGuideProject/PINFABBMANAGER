export type SectionKind =
  | "text"
  | "table"
  | "measurements"
  | "photos"
  | "signatures";

export type TemplateSection = {
  key: string;
  titleEn: string;
  titleIt: string;
  kind: SectionKind;
  aiHint: string;
};

export type ReportContent = Record<string, string>;

export function parseStructure(structure: unknown): TemplateSection[] {
  if (!Array.isArray(structure)) return [];
  return structure.filter(
    (section): section is TemplateSection =>
      !!section &&
      typeof section === "object" &&
      typeof (section as TemplateSection).key === "string" &&
      typeof (section as TemplateSection).kind === "string",
  );
}

export function sectionTitle(section: TemplateSection, locale: string) {
  return locale === "it" ? section.titleIt || section.titleEn : section.titleEn;
}
