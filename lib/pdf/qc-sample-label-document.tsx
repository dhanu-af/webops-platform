import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

// A small printable label (not A4, matching the other pdf routes' own page
// sizing) -- 4x3 inches at 72pt/in -- sized to stick on a physical sample
// container. Mirrors the reference implementation's layout exactly.
const PAGE_WIDTH = 288;
const PAGE_HEIGHT = 216;
const MARGIN = 14;

const COLORS = { text: "#0f172a", muted: "#64748b" };

const styles = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    padding: MARGIN,
    flexDirection: "row",
    fontFamily: "Helvetica",
  },
  qr: { width: PAGE_HEIGHT - MARGIN * 2, height: PAGE_HEIGHT - MARGIN * 2 },
  textBlock: { flex: 1, marginLeft: 10, justifyContent: "flex-start" },
  sampleId: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLORS.text, marginTop: 4 },
  productName: { fontSize: 9, color: COLORS.text, marginTop: 4 },
  batchNumber: { fontSize: 8, color: COLORS.muted, marginTop: 2 },
});

export function QcSampleLabelDocument({
  sample,
  qrDataUri,
}: {
  sample: { sampleId: string; productName: string; batchNumber: string };
  qrDataUri: string;
}) {
  return (
    <Document title={`${sample.sampleId} Label`}>
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML img; no alt prop exists on this component */}
        <Image src={qrDataUri} style={styles.qr} />
        <View style={styles.textBlock}>
          <Text style={styles.sampleId}>{sample.sampleId}</Text>
          <Text style={styles.productName}>{sample.productName}</Text>
          <Text style={styles.batchNumber}>Batch {sample.batchNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
