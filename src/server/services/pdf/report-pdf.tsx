import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { prisma } from "@/server/db";
import { storage } from "@/server/services/storage";
import {
  parseStructure,
  type ReportContent,
  type TemplateSection,
} from "@/lib/report-template";

const MAX_PDF_PHOTOS = 24;

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  coverTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  coverSub: { fontSize: 12, color: "#475569", marginBottom: 2 },
  coverBox: {
    marginTop: 28,
    padding: 16,
    border: "1 solid #cbd5e1",
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: "1 solid #0ea5e9",
  },
  paragraph: { lineHeight: 1.5, marginBottom: 4 },
  row: { flexDirection: "row", borderBottom: "0.5 solid #e2e8f0", paddingVertical: 3 },
  headerRow: {
    flexDirection: "row",
    borderBottom: "1 solid #94a3b8",
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
  },
  cellName: { flex: 3 },
  cell: { flex: 1 },
  photo: { width: 160, height: 120, objectFit: "cover", borderRadius: 2 },
  photoWrap: { width: 170, marginBottom: 10 },
  photoCaption: { fontSize: 8, color: "#475569", marginTop: 2 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  signatureBox: {
    width: 220,
    marginTop: 14,
    paddingTop: 6,
    borderTop: "1 solid #94a3b8",
  },
  signatureImage: { width: 160, height: 60, objectFit: "contain" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const dateString = (value: Date) => value.toISOString().slice(0, 10);

export async function renderReportPdf(reportId: string): Promise<Buffer> {
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    include: {
      template: true,
      signatures: { orderBy: { signedAt: "asc" } },
      project: {
        include: {
          vessel: true,
          client: true,
          location: true,
          assignments: {
            where: { status: { not: "CANCELLED" } },
            include: { technician: { include: { user: true } } },
          },
          dailyLogs: {
            where: { status: { in: ["SUBMITTED", "ANALYZED"] } },
            include: {
              technician: { include: { user: true } },
              measurements: { include: { standard: true } },
            },
            orderBy: { logDate: "asc" },
          },
          photos: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const sections = parseStructure(report.template.structure);
  const content = (report.content ?? {}) as ReportContent;
  const project = report.project;

  const measurements = project.dailyLogs.flatMap((log) =>
    log.measurements.map((measurement) => ({
      date: dateString(log.logDate),
      ...measurement,
    })),
  );

  const photoBuffers: { buffer: Buffer; caption: string }[] = [];
  for (const photo of project.photos.slice(0, MAX_PDF_PHOTOS)) {
    try {
      const stream = await storage.getStream(photo.storageKey);
      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      photoBuffers.push({
        buffer: Buffer.concat(chunks),
        caption: `${photo.category}${photo.caption ? ` — ${photo.caption}` : ""}`,
      });
    } catch {
      // skip unreadable blobs
    }
  }

  const signatureImages: Record<string, Buffer> = {};
  for (const signature of report.signatures) {
    try {
      const stream = await storage.getStream(signature.imageStorageKey);
      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      signatureImages[signature.id] = Buffer.concat(chunks);
    } catch {
      // signature image missing — render the line anyway
    }
  }

  const renderSection = (section: TemplateSection) => {
    switch (section.kind) {
      case "text":
      case "table": {
        const text = content[section.key];
        if (!text) return null;
        return (
          <View key={section.key} wrap>
            <Text style={styles.sectionTitle}>{section.titleEn}</Text>
            {text.split("\n").map((line, index) =>
              line.trim() === "" ? (
                <Text key={index}> </Text>
              ) : (
                <Text key={index} style={styles.paragraph}>
                  {line}
                </Text>
              ),
            )}
          </View>
        );
      }
      case "measurements":
        if (measurements.length === 0) return null;
        return (
          <View key={section.key} wrap>
            <Text style={styles.sectionTitle}>{section.titleEn}</Text>
            <View style={styles.headerRow}>
              <Text style={styles.cell}>Date</Text>
              <Text style={styles.cellName}>Measurement</Text>
              <Text style={styles.cell}>Fin</Text>
              <Text style={styles.cell}>Value</Text>
              <Text style={styles.cell}>Allowed</Text>
              <Text style={styles.cell}>Result</Text>
            </View>
            {measurements.map((measurement) => (
              <View key={measurement.id} style={styles.row}>
                <Text style={styles.cell}>{measurement.date}</Text>
                <Text style={styles.cellName}>{measurement.name}</Text>
                <Text style={styles.cell}>{measurement.finPosition ?? "-"}</Text>
                <Text style={styles.cell}>
                  {measurement.value} {measurement.unit}
                </Text>
                <Text style={styles.cell}>
                  {measurement.standard
                    ? `${measurement.standard.minValue ?? ""}–${measurement.standard.maxValue ?? ""}`
                    : "-"}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    {
                      color:
                        measurement.withinSpec === false
                          ? "#dc2626"
                          : measurement.withinSpec === true
                            ? "#059669"
                            : "#475569",
                    },
                  ]}
                >
                  {measurement.withinSpec === null
                    ? "-"
                    : measurement.withinSpec
                      ? "OK"
                      : "OUT"}
                </Text>
              </View>
            ))}
          </View>
        );
      case "photos":
        if (photoBuffers.length === 0) return null;
        return (
          <View key={section.key} break>
            <Text style={styles.sectionTitle}>{section.titleEn}</Text>
            <View style={styles.photoGrid}>
              {photoBuffers.map((photo, index) => (
                <View key={index} style={styles.photoWrap}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
                  <Image src={photo.buffer} style={styles.photo} />
                  <Text style={styles.photoCaption}>{photo.caption}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      case "signatures":
        return (
          <View key={section.key} wrap={false}>
            <Text style={styles.sectionTitle}>{section.titleEn}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 24 }}>
              {report.signatures.map((signature) => (
                <View key={signature.id} style={styles.signatureBox}>
                  {signatureImages[signature.id] ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image
                      src={signatureImages[signature.id]}
                      style={styles.signatureImage}
                    />
                  ) : null}
                  <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 4 }}>
                    {signature.signerName}
                  </Text>
                  <Text style={{ color: "#475569" }}>
                    {signature.kind}
                    {signature.signerTitle ? ` — ${signature.signerTitle}` : ""} ·{" "}
                    {dateString(signature.signedAt)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const lead = project.assignments.find(
    (assignment) => assignment.role === "LEAD",
  );

  const pdf = (
    <Document
      title={`${project.code} — Service Report`}
      author="PINFAB"
      creator="PINFAB Manager"
    >
      <Page size="A4" style={styles.page}>
        <View style={{ marginTop: 80 }}>
          <Text style={{ fontSize: 11, color: "#0ea5e9", marginBottom: 12 }}>
            PINFAB — Fin Stabilizer Services
          </Text>
          <Text style={styles.coverTitle}>Service Report</Text>
          <Text style={styles.coverSub}>{project.title}</Text>
          <View style={styles.coverBox}>
            {[
              ["Report no.", `${project.code}-R${report.version}`],
              ["Vessel", `${project.vessel.name}${project.vessel.imoNumber ? ` (IMO ${project.vessel.imoNumber})` : ""}`],
              ["Client", project.client.name],
              ["Location", `${project.location.name}, ${project.location.country}`],
              ["Period", `${dateString(project.startDate)} → ${dateString(project.endDate)}`],
              ["Stabilizer", project.vessel.stabilizerModel ?? "—"],
              ["Lead technician", lead?.technician.user.name ?? "—"],
            ].map(([label, value]) => (
              <View key={label} style={{ flexDirection: "row", marginBottom: 4 }}>
                <Text style={{ width: 110, color: "#64748b" }}>{label}</Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.footer} fixed>
          <Text>PINFAB Manager — confidential</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
          />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        {sections
          .filter((section) => section.key !== "cover")
          .map((section) => renderSection(section))}
        <View style={styles.footer} fixed>
          <Text>
            {project.code} · {project.vessel.name}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(pdf) as Promise<Buffer>;
}
