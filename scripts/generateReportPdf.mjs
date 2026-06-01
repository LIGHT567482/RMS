import puppeteer from "puppeteer";

const [, , studentId, outPath = `report-${Date.now()}.pdf`, baseUrl = "http://localhost:5173"] = process.argv;

if (!studentId) {
  console.error("Usage: node scripts/generateReportPdf.mjs <studentId> [outPath] [baseUrl]");
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Set a large viewport to allow desktop layout rendering
  await page.setViewport({ width: 1200, height: 2400, deviceScaleFactor: 2 });

  const url = `${baseUrl}/dashboard/reports?previewStudent=${encodeURIComponent(studentId)}`;
  console.log("Loading page:", url);

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  // Wait for the report element to be present
  await page.waitForSelector(".print-area", { timeout: 15000 });

  // Give the page a moment to finish fonts/images
  await page.waitForTimeout(500);

  const pdfOptions = {
    path: outPath,
    format: "A4",
    printBackground: true,
    // Ensure at least 20mm (2cm) margins so images don't touch sheet edges
    margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" },
  };

  console.log("Generating PDF to", outPath);
  await page.pdf(pdfOptions);

  await browser.close();
  console.log("PDF created:", outPath);
})();
