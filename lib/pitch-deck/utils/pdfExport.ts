import jsPDF from "jspdf";
import { BRANDS } from "@/lib/quote-calculator/brands";

// Landscape orientation: A4 landscape is 297mm x 210mm
const MARGINS = { top: 60, bottom: 40, left: 30, right: 30 };
const PAGE_WIDTH = 297; // A4 landscape width in mm
const PAGE_HEIGHT = 210; // A4 landscape height in mm

// Home page color scheme
const COLORS = {
  background: "#161616", // Dark background
  foreground: "#FFFFFF", // White text
  accent: "#586034", // Orange accent
};

// Helper function to convert hex to RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 166, b: 23 }; // Default orange
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

      const scale = 4;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

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

interface PitchDeckData {
  title: string;
  brandId?: string;
  coverDescription?: string;
  preparedFor?: string;
  preparedDate?: string;
  coverMediaUrls?: string[];
  scopeOfWork?: string;
  preProduction?: string;
  production?: string;
  postProduction?: string;
  imageryMediaUrls?: string[];
  estimate?: string;
  galleryMediaUrls?: string[];
}

export async function generatePitchDeckPDF(deck: PitchDeckData): Promise<void> {
  // Force Alex Grosse branding for pitch decks
  const brandId = "alex-grosse";
  const brand = BRANDS[brandId];
  
  // Create landscape PDF
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Page 1: Cover Page with Full-Page Media Collage Background (no header)
  await renderCoverPage(doc, deck, pageWidth, pageHeight, brandId);

  // Page 2: Scope of Work
  if (deck.scopeOfWork) {
    doc.addPage();
    await renderScopeOfWork(doc, deck, pageWidth, pageHeight);
  }

  // Page 3: Production Breakdown
  if (deck.preProduction || deck.production || deck.postProduction) {
    doc.addPage();
    await renderProductionBreakdown(doc, deck, pageWidth, pageHeight);
  }

  // Page 4: Relevant Imagery
  if (deck.imageryMediaUrls && deck.imageryMediaUrls.length > 0) {
    doc.addPage();
    await renderImagery(doc, deck, pageWidth, pageHeight);
  }

  // Gallery page removed per latest requirements

  // Page 6: Estimate
  if (deck.estimate) {
    doc.addPage();
    await renderEstimate(doc, deck, pageWidth, pageHeight);
  }

  // Add page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - MARGINS.right,
      pageHeight - 15,
      { align: "right" }
    );
  }

  // Generate filename
  const title = deck.title.replace(/[^a-z0-9]/gi, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `IANCOURTRIGHT_PitchDeck_${title}_${dateStr}.pdf`;

  doc.save(filename);
}

async function renderCoverPage(
  doc: jsPDF,
  deck: PitchDeckData,
  pageWidth: number,
  pageHeight: number,
  brandId: string
) {
  // Full-page media collage background (4x3 grid - matching preview)
  // IMPORTANT: Draw images FIRST, then overlay on top
  const coverMediaUrls = deck.coverMediaUrls || [];
  
  if (coverMediaUrls.length > 0) {
    const cols = 4;
    const rows = 3;
    const cellWidth = pageWidth / cols;
    const cellHeight = pageHeight / rows;

    let mediaIndex = 0;
    const loadedImages: Array<{ dataUrl: string; x: number; y: number; width: number; height: number }> = [];
    
    // Load all images first
    console.log("Loading cover images:", coverMediaUrls.length);
    for (let row = 0; row < rows && mediaIndex < coverMediaUrls.length; row++) {
      for (let col = 0; col < cols && mediaIndex < coverMediaUrls.length; col++) {
        try {
          const imageUrl = coverMediaUrls[mediaIndex];
          if (imageUrl && imageUrl.startsWith("http")) {
            console.log(`Loading cover image ${mediaIndex}: ${imageUrl.substring(0, 50)}...`);
            const pngDataUrl = await convertImageToPNG(imageUrl);
            loadedImages.push({
              dataUrl: pngDataUrl,
              x: col * cellWidth,
              y: row * cellHeight,
              width: cellWidth,
              height: cellHeight,
            });
            console.log(`Successfully loaded cover image ${mediaIndex}`);
          }
        } catch (error) {
          console.error(`Error loading cover image ${mediaIndex}:`, error);
        }
        mediaIndex++;
      }
    }
    
    // Add all loaded images to PDF (draw images first)
    console.log(`Adding ${loadedImages.length} images to PDF`);
    loadedImages.forEach(({ dataUrl, x, y, width, height }) => {
      doc.addImage(
        dataUrl,
        "PNG",
        x,
        y,
        width,
        height,
        undefined,
        "FAST"
      );
    });
  } else {
    console.warn("No cover media URLs provided");
  }

  // Dark overlay AFTER images (bg-black/60 - matching preview page)
  // Since jsPDF doesn't support alpha, we need to use a blended color
  // Black at 60% opacity over white background = RGB(0, 0, 0) * 0.6 + RGB(255, 255, 255) * 0.4
  // = RGB(102, 102, 102) - but we want it darker so images show through less
  // Use RGB(60, 60, 60) for a darker overlay that still allows images to show
  doc.setFillColor(60, 60, 60); // Dark gray to simulate 60% black overlay
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Alex Grosse wordmark at top center (matching preview - larger size)
  const wordmarkPath = "/wordmark-alexgrosse-white.svg";
  try {
    const wordmarkDataUrl = await convertImageToPNG(wordmarkPath);
    const wordmarkWidth = 200; // Larger to match preview h-20 to h-36
    const wordmarkHeight = 50;
    doc.addImage(
      wordmarkDataUrl,
      "PNG",
      pageWidth / 2 - wordmarkWidth / 2,
      40,
      wordmarkWidth,
      wordmarkHeight,
      undefined,
      "FAST"
    );
  } catch (error) {
    console.error("Error loading wordmark:", error);
    // Fallback: Draw text if wordmark fails
    const accentRgb = hexToRgb(COLORS.accent);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("ALEX GROSSE", pageWidth / 2, 50, { align: "center" });
  }

  // Title - ULTRA-BOLD, UPPERCASE, centered (matching preview)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(48);
  doc.setFont("helvetica", "bold");
  const titleText = deck.title.toUpperCase();
  const titleLines = doc.splitTextToSize(titleText, pageWidth - 60);
  // Calculate center position
  const titleY = pageHeight / 2 - (titleLines.length * 8) / 2;
  doc.text(titleLines, pageWidth / 2, titleY, { align: "center" });

  // Description below title (matching preview)
  if (deck.coverDescription) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(230, 230, 230); // white/90
    const descLines = doc.splitTextToSize(
      deck.coverDescription,
      pageWidth - 80
    );
    const descY = titleY + (titleLines.length * 8) + 12;
    doc.text(descLines, pageWidth / 2, descY, { align: "center" });
  }

  // Prepared for and date - bottom section (matching preview)
  const infoStartY = pageHeight - 50;
  
  if (deck.preparedFor) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const accentRgb = hexToRgb(COLORS.accent);
    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.text(`PREPARED FOR: ${deck.preparedFor.toUpperCase()}`, pageWidth / 2, infoStartY, { align: "center" });
  }
  if (deck.preparedDate) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(204, 204, 204); // white/80
    doc.text(`DATE: ${String(deck.preparedDate).toUpperCase()}`, pageWidth / 2, infoStartY + 10, { align: "center" });
  }
}

async function renderScopeOfWork(
  doc: jsPDF,
  deck: PitchDeckData,
  pageWidth: number,
  pageHeight: number
) {
  // Orange bar section header (full width, no black header - matching preview)
  const accentRgb = hexToRgb(COLORS.accent);
  doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
  
  // Orange bar height - large enough for big text
  const barHeight = 60;
  doc.rect(0, 0, pageWidth, barHeight, "F");

  // Section title - ULTRA-BOLD, UPPERCASE, WHITE ON ORANGE (matching preview exactly)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(72); // Large to match preview's clamp(4.5rem, 15vw, 26rem)
  doc.setFont("helvetica", "bold");
  doc.text("SCOPE OF WORK", pageWidth / 2, barHeight / 2 + 10, { align: "center" });
  
  // White content area below orange bar
  let y = barHeight + 30; // Start content after orange bar

  // Content (matching preview spacing and typography)
  if (deck.scopeOfWork) {
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(
      deck.scopeOfWork,
      pageWidth - MARGINS.left - MARGINS.right
    );
    doc.text(lines, MARGINS.left, y);
  }
}

async function renderProductionBreakdown(
  doc: jsPDF,
  deck: PitchDeckData,
  pageWidth: number,
  pageHeight: number
) {
  // Orange bar section header (full width, no black header - matching preview)
  const accentRgb = hexToRgb(COLORS.accent);
  doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
  
  const barHeight = 60;
  doc.rect(0, 0, pageWidth, barHeight, "F");

  // Section title - ULTRA-BOLD, UPPERCASE, WHITE ON ORANGE (matching preview)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(72);
  doc.setFont("helvetica", "bold");
  // Split text if it's too long to fit on one line
  const titleText = "PRODUCTION BREAKDOWN";
  const titleLines = doc.splitTextToSize(titleText, pageWidth - 20);
  const titleY = barHeight / 2 + 10 - ((titleLines.length - 1) * 4);
  doc.text(titleLines, pageWidth / 2, titleY, { align: "center" });
  
  // White content area below orange bar
  let y = barHeight + 30;

  // Pre-Production
  if (deck.preProduction) {
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("PRE-PRODUCTION", MARGINS.left, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const preProdLines = doc.splitTextToSize(
      deck.preProduction,
      pageWidth - MARGINS.left - MARGINS.right
    );
    doc.text(preProdLines, MARGINS.left, y);
    y += preProdLines.length * 5 + 20;
  }

  // Production
  if (deck.production) {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("PRODUCTION", MARGINS.left, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const prodLines = doc.splitTextToSize(
      deck.production,
      pageWidth - MARGINS.left - MARGINS.right
    );
    doc.text(prodLines, MARGINS.left, y);
    y += prodLines.length * 5 + 20;
  }

  // Post-Production
  if (deck.postProduction) {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("POST-PRODUCTION", MARGINS.left, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const postProdLines = doc.splitTextToSize(
      deck.postProduction,
      pageWidth - MARGINS.left - MARGINS.right
    );
    doc.text(postProdLines, MARGINS.left, y);
  }
}

async function renderImagery(
  doc: jsPDF,
  deck: PitchDeckData,
  pageWidth: number,
  pageHeight: number
) {
  // Orange bar section header (full width, no black header - matching preview)
  const accentRgb = hexToRgb(COLORS.accent);
  doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
  
  const barHeight = 60;
  doc.rect(0, 0, pageWidth, barHeight, "F");

  // Section title - ULTRA-BOLD, UPPERCASE, WHITE ON ORANGE (matching preview)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(72);
  doc.setFont("helvetica", "bold");
  doc.text("RELEVANT IMAGERY", pageWidth / 2, barHeight / 2 + 10, { align: "center" });
  
  // White content area below orange bar
  let y = barHeight + 30;

  // Render imagery in a grid (landscape: 3 columns - matching preview)
  const imageryUrls = (deck.imageryMediaUrls || []).filter((url) => url && url.startsWith("http"));
  
  console.log("Rendering imagery:", imageryUrls.length, "images");
  
  if (imageryUrls.length > 0) {
    const cols = 3;
    const rows = Math.ceil(imageryUrls.length / cols);
    const availableWidth = pageWidth - MARGINS.left - MARGINS.right;
    const availableHeight = pageHeight - y - MARGINS.bottom;
    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / rows;

    let mediaIndex = 0;
    const loadedImages: Array<{ dataUrl: string; x: number; y: number; width: number; height: number }> = [];
    
    // Load all images first
    for (let row = 0; row < rows && mediaIndex < imageryUrls.length; row++) {
      for (let col = 0; col < cols && mediaIndex < imageryUrls.length; col++) {
        try {
          const imageUrl = imageryUrls[mediaIndex];
          if (imageUrl && imageUrl.startsWith("http")) {
            console.log(`Loading imagery ${mediaIndex}: ${imageUrl.substring(0, 50)}...`);
            const pngDataUrl = await convertImageToPNG(imageUrl);
            const x = MARGINS.left + (col * cellWidth);
            const imageY = y + (row * cellHeight);
            const spacing = 6;
            
            loadedImages.push({
              dataUrl: pngDataUrl,
              x: x + spacing,
              y: imageY + spacing,
              width: cellWidth - spacing * 2,
              height: cellHeight - spacing * 2,
            });
            console.log(`Successfully loaded imagery ${mediaIndex}`);
          }
        } catch (error) {
          console.error(`Error loading imagery ${mediaIndex}:`, error);
        }
        mediaIndex++;
      }
    }
    
    // Add all loaded images
    console.log(`Adding ${loadedImages.length} imagery images to PDF`);
    loadedImages.forEach(({ dataUrl, x, y: imageY, width, height }) => {
      doc.addImage(dataUrl, "PNG", x, imageY, width, height, undefined, "FAST");
    });
  } else {
    console.warn("No imagery URLs provided");
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(12);
    doc.setFont("helvetica", "italic");
    doc.text("NO IMAGERY AVAILABLE", MARGINS.left, y);
  }
}

// renderGallery removed

async function renderEstimate(
  doc: jsPDF,
  deck: PitchDeckData,
  pageWidth: number,
  pageHeight: number
) {
  // Orange bar section header (full width, no black header - matching preview)
  const accentRgb = hexToRgb(COLORS.accent);
  doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
  
  const barHeight = 60;
  doc.rect(0, 0, pageWidth, barHeight, "F");

  // Section title - ULTRA-BOLD, UPPERCASE, WHITE ON ORANGE (matching preview)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(72);
  doc.setFont("helvetica", "bold");
  doc.text("ESTIMATE", pageWidth / 2, barHeight / 2 + 10, { align: "center" });
  
  // White content area below orange bar
  let y = barHeight + 30;

  // Content (matching preview spacing)
  if (deck.estimate) {
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(
      deck.estimate,
      pageWidth - MARGINS.left - MARGINS.right
    );
    doc.text(lines, MARGINS.left, y);
  }
}
