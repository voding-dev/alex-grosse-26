import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Quote, QuotePDFOptions } from "../types/pricing";
import { AppSettings } from "../types/settings";
import { BRANDS } from "../brands";

const MARGINS = { top: 50, bottom: 30, left: 14, right: 14 };

interface PDFExportOptions {
  quote: Quote;
  settings: AppSettings;
  pdfOptions: QuotePDFOptions;
}

function ensureSpace(
  doc: jsPDF,
  yPos: number,
  needed: number,
  pageHeight: number,
  quoteData: Quote
): number {
  if (yPos + needed > pageHeight - MARGINS.bottom) {
    doc.addPage();
    addHeader(doc, quoteData.brand || "ian-courtright", quoteData);
    return MARGINS.top;
  }
  return yPos;
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 166, b: 23 }; // Default orange
}

function addHeader(doc: jsPDF, brandId: string, quoteData: Quote) {
  const brand = BRANDS[brandId] || BRANDS["ian-courtright"];
  const pageWidth = doc.internal.pageSize.getWidth();

  // Black header bar
  doc.setFillColor(13, 13, 13); // #0D0D0D
  doc.rect(0, 0, pageWidth, 40, "F");

  // Brand name (lime/orange/teal) - Convert hex to RGB
  const rgb = hexToRgb(brand.secondaryColor);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bolditalic");
  doc.text(brand.name, pageWidth / 2, 18, { align: "center" });

  // Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PRODUCTION QUOTE", pageWidth / 2, 28, { align: "center" });
  
  // Note: The tagline in the header is fixed as "PRODUCTION QUOTE" per spec,
  // but the brand tagline (Freelance/Production/Software Quote Builder) is used elsewhere

  // Website
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(brand.website, pageWidth / 2, 35, { align: "center" });
}

function convertImageToPNG(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Scale for high resolution
      const scale = 4;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      // Convert to PNG data URL
      try {
        const pngDataUrl = canvas.toDataURL("image/png");
        resolve(pngDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}

export async function generatePDF({
  quote: quoteData,
  settings,
  pdfOptions,
}: PDFExportOptions): Promise<void> {
  const brand = BRANDS[quoteData.brand || "ian-courtright"];
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = MARGINS.top;

  // Add header to first page
  addHeader(doc, quoteData.brand || "ian-courtright", quoteData);

  // Page 1: Quote Details & Line Items
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Quote Details", MARGINS.left, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Client: ${quoteData.clientName || "N/A"}`, MARGINS.left, yPos);
  yPos += 6;
  doc.text(`Project: ${quoteData.projectName || "N/A"}`, MARGINS.left, yPos);
  yPos += 6;
  doc.text(
    `Date: ${new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })}`,
    MARGINS.left,
    yPos
  );
  yPos += 12;

  // Line Items
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Line Items", MARGINS.left, yPos);
  yPos += 8;

  // Process categories with enabled items
  const categoriesWithItems = quoteData.categories.filter((cat) =>
    cat.items.some((item) => item.enabled)
  );

  for (const category of categoriesWithItems) {
    const enabledItems = category.items.filter((item) => item.enabled);
    if (enabledItems.length === 0) continue;

    yPos = ensureSpace(doc, yPos, 20, pageHeight, quoteData);

    // Category header
    doc.setFillColor(13, 13, 13);
    doc.rect(MARGINS.left, yPos - 6, pageWidth - MARGINS.left - MARGINS.right, 6, "F");
    const categoryRgb = hexToRgb(brand.secondaryColor);
    doc.setTextColor(categoryRgb.r, categoryRgb.g, categoryRgb.b);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(category.name.toUpperCase(), MARGINS.left + 2, yPos - 1);

    yPos += 4;

    // Table data
    const tableData = enabledItems.map((item) => [
      item.name,
      item.quantity.toString(),
      item.rate.toLocaleString("en-US", {
        style: "currency",
        currency: quoteData.jobControls.currency,
        minimumFractionDigits: 2,
      }),
      (item.quantity * item.rate).toLocaleString("en-US", {
        style: "currency",
        currency: quoteData.jobControls.currency,
        minimumFractionDigits: 2,
      }),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Item", "Qty", "Rate", "Amount"]],
      body: tableData,
      theme: "plain",
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
      margin: { left: MARGINS.left, right: MARGINS.right, top: 55, bottom: 40 },
      didDrawPage: () => {
        addHeader(doc, quoteData.brand || "ian-courtright", quoteData);
      },
      showHead: "everyPage",
    });

    // Get final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || yPos;
    yPos = finalY + 5;
  }

  // Totals section (right-aligned)
  const baseCosts = quoteData.categories.reduce((total, category) => {
    return (
      total +
      category.items
        .filter((item) => item.enabled)
        .reduce((catTotal, item) => catTotal + item.quantity * item.rate, 0)
    );
  }, 0);

  const productionFee = baseCosts * (quoteData.jobControls.productionFeePercent / 100);
  const rushFee = baseCosts * (quoteData.jobControls.rushPercent / 100);
  const subtotalBeforeDiscount = baseCosts + productionFee + rushFee;
  const discountAmount = subtotalBeforeDiscount * (quoteData.jobControls.discountPercent / 100);
  const subtotal = subtotalBeforeDiscount - discountAmount;
  const salesTax = subtotal * (quoteData.jobControls.salesTaxPercent / 100);
  const grandTotal = subtotal + salesTax;

  yPos = ensureSpace(doc, yPos, 60, pageHeight, quoteData);

  const totalsX = pageWidth - 80;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Base Costs", totalsX, yPos, { align: "right" });
  doc.text(
    baseCosts.toLocaleString("en-US", {
      style: "currency",
      currency: quoteData.jobControls.currency,
      minimumFractionDigits: 2,
    }),
    pageWidth - MARGINS.right,
    yPos,
    { align: "right" }
  );
  yPos += 5;

  if (productionFee > 0) {
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Production Fee (${quoteData.jobControls.productionFeePercent}%)`,
      totalsX,
      yPos,
      { align: "right" }
    );
    doc.text(
      productionFee.toLocaleString("en-US", {
        style: "currency",
        currency: quoteData.jobControls.currency,
        minimumFractionDigits: 2,
      }),
      pageWidth - MARGINS.right,
      yPos,
      { align: "right" }
    );
    yPos += 5;
  }

  if (rushFee > 0) {
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Rush/Expedite (${quoteData.jobControls.rushPercent}%)`,
      totalsX,
      yPos,
      { align: "right" }
    );
    doc.text(
      rushFee.toLocaleString("en-US", {
        style: "currency",
        currency: quoteData.jobControls.currency,
        minimumFractionDigits: 2,
      }),
      pageWidth - MARGINS.right,
      yPos,
      { align: "right" }
    );
    yPos += 5;
  }

  if (discountAmount > 0) {
    doc.setTextColor(0, 150, 0); // Green color for discount
    doc.text(
      `Discount (${quoteData.jobControls.discountPercent}%)`,
      totalsX,
      yPos,
      { align: "right" }
    );
    doc.text(
      `-${discountAmount.toLocaleString("en-US", {
        style: "currency",
        currency: quoteData.jobControls.currency,
        minimumFractionDigits: 2,
      })}`,
      pageWidth - MARGINS.right,
      yPos,
      { align: "right" }
    );
    yPos += 5;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Subtotal", totalsX, yPos, { align: "right" });
  doc.text(
    subtotal.toLocaleString("en-US", {
      style: "currency",
      currency: quoteData.jobControls.currency,
      minimumFractionDigits: 2,
    }),
    pageWidth - MARGINS.right,
    yPos,
    { align: "right" }
  );
  yPos += 8;

  // Page 2: Payment Details
  doc.addPage();
  addHeader(doc, quoteData.brand || "ian-courtright", quoteData);
  yPos = MARGINS.top;

  // Grand Total display
  doc.setDrawColor(0, 0, 0);
  doc.line(MARGINS.left, yPos, pageWidth - MARGINS.right, yPos);
  yPos += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal Before Discount", pageWidth / 2, yPos, { align: "center" });
  doc.text(
    subtotalBeforeDiscount.toLocaleString("en-US", {
      style: "currency",
      currency: quoteData.jobControls.currency,
      minimumFractionDigits: 2,
    }),
    pageWidth / 2,
    yPos + 5,
    { align: "center" }
  );
  if (discountAmount > 0) {
    doc.setTextColor(0, 150, 0);
    doc.text(`Discount (${quoteData.jobControls.discountPercent}%)`, pageWidth / 2, yPos + 12, { align: "center" });
    doc.text(
      `-${discountAmount.toLocaleString("en-US", {
        style: "currency",
        currency: quoteData.jobControls.currency,
        minimumFractionDigits: 2,
      })}`,
      pageWidth / 2,
      yPos + 17,
      { align: "center" }
    );
    doc.setTextColor(0, 0, 0);
    doc.text("Subtotal", pageWidth / 2, yPos + 24, { align: "center" });
    doc.text(
      subtotal.toLocaleString("en-US", {
        style: "currency",
        currency: quoteData.jobControls.currency,
        minimumFractionDigits: 2,
      }),
      pageWidth / 2,
      yPos + 29,
      { align: "center" }
    );
    yPos += 12;
  }
  yPos += 15;

  // Grand Total box
  doc.setFillColor(13, 13, 13);
  doc.rect(MARGINS.left, yPos, pageWidth - MARGINS.left - MARGINS.right, 12, "F");
  const grandTotalRgb = hexToRgb(brand.secondaryColor);
  doc.setTextColor(grandTotalRgb.r, grandTotalRgb.g, grandTotalRgb.b);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("GRAND TOTAL:", MARGINS.left + 5, yPos + 8);
  doc.text(
    grandTotal.toLocaleString("en-US", {
      style: "currency",
      currency: quoteData.jobControls.currency,
      minimumFractionDigits: 2,
    }),
    pageWidth - MARGINS.right - 5,
    yPos + 8,
    { align: "right" }
  );
  yPos += 20;

  // Payment Information
  doc.setFillColor(13, 13, 13);
  doc.rect(MARGINS.left, yPos, pageWidth - MARGINS.left - MARGINS.right, 8, "F");
  doc.setTextColor(brand.secondaryColor === "#CCFF33" ? 204 : 255, brand.secondaryColor === "#CCFF33" ? 255 : 166, brand.secondaryColor === "#CCFF33" ? 51 : 23);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT INFORMATION", pageWidth / 2, yPos + 6, { align: "center" });
  yPos += 15;

  const hasQR = pdfOptions.showQRCode && settings.paymentInfo.qrCodeUrl;
  const colWidth = hasQR ? (pageWidth - MARGINS.left - MARGINS.right - 20) / 2 : pageWidth - MARGINS.left - MARGINS.right;

  // Payment methods
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  const paymentMethods = settings.paymentInfo.paymentMethods.sort((a, b) => a.order - b.order);
  paymentMethods.forEach((method) => {
    doc.setFont("helvetica", "bold");
    doc.text(`• ${method.platform}:`, MARGINS.left, yPos);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(method.details, colWidth - 10);
    doc.text(lines, MARGINS.left + 5, yPos + 4);
    yPos += lines.length * 4 + 6;
  });

  // QR Code (if enabled)
  if (hasQR && settings.paymentInfo.qrCodeUrl) {
    try {
      const qrX = pageWidth - MARGINS.right - colWidth;
      doc.setFont("helvetica", "bold");
      doc.text("Scan to Pay:", qrX, MARGINS.top + 15);
      
      const qrImageData = await convertImageToPNG(settings.paymentInfo.qrCodeUrl);
      doc.addImage(qrImageData, "PNG", qrX, MARGINS.top + 20, 60, 60);
      
      // Border around QR
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(2);
      doc.rect(qrX - 3, MARGINS.top + 17, 66, 66);
    } catch (error) {
      console.error("Error adding QR code:", error);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128);
      doc.text("QR code could not be loaded", MARGINS.left, yPos);
    }
  }

  // Page 3: Terms & Conditions (if any selected)
  if (pdfOptions.selectedSLATermIds.length > 0) {
    doc.addPage();
    addHeader(doc, quoteData.brand || "ian-courtright", quoteData);
    yPos = MARGINS.top;

    doc.setFillColor(13, 13, 13);
    doc.rect(MARGINS.left, yPos, pageWidth - MARGINS.left - MARGINS.right, 8, "F");
    const termsRgb = hexToRgb(brand.secondaryColor);
    doc.setTextColor(termsRgb.r, termsRgb.g, termsRgb.b);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TERMS & CONDITIONS", pageWidth / 2, yPos + 6, { align: "center" });
    yPos += 15;

    const selectedTerms = settings.slaTerms
      .filter((t) => pdfOptions.selectedSLATermIds.includes(t.id))
      .sort((a, b) => a.order - b.order);

    for (const term of selectedTerms) {
      yPos = ensureSpace(doc, yPos, 40, pageHeight, quoteData);

      // Term box with accent bar
      const boxHeight = 30;
      doc.setFillColor(240, 240, 240);
      doc.rect(MARGINS.left, yPos, pageWidth - MARGINS.left - MARGINS.right, boxHeight, "F");
      const accentRgb = hexToRgb(brand.secondaryColor);
      doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
      doc.rect(MARGINS.left, yPos, 4, boxHeight, "F");

      // Term title
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(term.title.toUpperCase(), MARGINS.left + 8, yPos + 7);

      // Term content
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const contentLines = doc.splitTextToSize(
        term.content,
        pageWidth - MARGINS.left - MARGINS.right - 12
      );
      doc.text(contentLines, MARGINS.left + 8, yPos + 12);
      yPos += boxHeight + 5;
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  const validityDays = pdfOptions.customValidityDays || settings.quoteValidityDays;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      `This quote is valid for ${validityDays} days from the date of issue.`,
      pageWidth / 2,
      pageHeight - 15,
      { align: "center" }
    );
    doc.setFontSize(7);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - MARGINS.right,
      pageHeight - 10,
      { align: "right" }
    );
  }

  // Generate filename
  const clientName = (quoteData.clientName || "Client").replace(/[^a-z0-9]/gi, "_");
  const projectName = (quoteData.projectName || "Project").replace(/[^a-z0-9]/gi, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `${brand.name.replace(/\s+/g, "")}_Quote_${clientName}_${projectName}_${dateStr}.pdf`;

  doc.save(filename);
}

