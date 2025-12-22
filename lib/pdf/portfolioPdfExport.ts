import jsPDF from "jspdf";

// A4 landscape dimensions
const PAGE_WIDTH = 297; // mm
const PAGE_HEIGHT = 210; // mm

// Branding colors - Alex Grosse olive green
const COLORS = {
  accent: "#586034", // Olive green accent
  dark: "#161616",
  white: "#FFFFFF",
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
    : { r: 88, g: 96, b: 52 }; // Default olive green
}

// Convert image URL to data URL for embedding in PDF (JPEG for photos)
function convertImageToDataUrl(imageUrl: string): Promise<{ dataUrl: string; width: number; height: number }> {
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

      // Use original image dimensions
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        resolve({ dataUrl, width: img.width, height: img.height });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
    img.src = imageUrl;
  });
}

// Convert SVG/logo to PNG with transparent background
function convertLogoToDataUrl(logoUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
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

      // Set canvas to exact target size (in pixels, scaled up for quality)
      const scale = 4;
      canvas.width = targetWidth * scale;
      canvas.height = targetHeight * scale;
      
      // Draw image scaled to fill the canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        // Use PNG format to preserve transparency
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load logo: ${logoUrl}`));
    img.src = logoUrl;
  });
}

export interface PortfolioPdfSettings {
  coverImageUrl?: string;
  contactName: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  logoUrl?: string; // Wordmark logo URL
}

export interface SelectedImage {
  url: string;
  portfolioTitle: string;
  aspectRatio?: number;
}

export async function generatePortfolioPdf(
  settings: PortfolioPdfSettings,
  selectedImages: SelectedImage[],
  onProgress?: (progress: number, message: string) => void
): Promise<void> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalSteps = selectedImages.length + 1; // +1 for cover page
  let currentStep = 0;

  // ========== COVER PAGE ==========
  onProgress?.(0, "Creating cover page...");

  const accentRgb = hexToRgb(COLORS.accent);
  let coverIsLandscape = true; // Default to landscape layout

  // Draw hero image if provided and detect orientation
  if (settings.coverImageUrl) {
    try {
      const { dataUrl, width, height } = await convertImageToDataUrl(settings.coverImageUrl);
      const coverAspectRatio = width / height;
      coverIsLandscape = coverAspectRatio >= 1;

      if (coverIsLandscape) {
        // LANDSCAPE IMAGE: Image on top, green bar at bottom
        const barHeight = pageHeight * 0.22;
        const imageAreaHeight = pageHeight - barHeight;
        
        // Scale image to fill the top area
        let imgWidth = pageWidth;
        let imgHeight = pageWidth / coverAspectRatio;
        
        // If image is shorter than area, scale up to fill height
        if (imgHeight < imageAreaHeight) {
          imgHeight = imageAreaHeight;
          imgWidth = imageAreaHeight * coverAspectRatio;
        }
        
        // Center horizontally
        const x = (pageWidth - imgWidth) / 2;
        doc.addImage(dataUrl, "JPEG", x, 0, imgWidth, imgHeight, undefined, "FAST");
      } else {
        // PORTRAIT IMAGE: Image on left, green bar on right
        const barWidth = pageWidth * 0.35;
        const imageAreaWidth = pageWidth - barWidth;
        
        // Scale image to fill the left area
        let imgHeight = pageHeight;
        let imgWidth = pageHeight * coverAspectRatio;
        
        // If image is narrower than area, scale up to fill width
        if (imgWidth < imageAreaWidth) {
          imgWidth = imageAreaWidth;
          imgHeight = imageAreaWidth / coverAspectRatio;
        }
        
        // Center vertically
        const y = (pageHeight - imgHeight) / 2;
        doc.addImage(dataUrl, "JPEG", 0, y, imgWidth, imgHeight, undefined, "FAST");
      }
    } catch (error) {
      console.error("Error loading cover image:", error);
    }
  }

  // Draw accent color bar based on cover image orientation
  if (coverIsLandscape) {
    // LANDSCAPE: Green bar at BOTTOM
    const barHeight = pageHeight * 0.22;
    const barY = pageHeight - barHeight;
    
    doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.rect(0, barY, pageWidth, barHeight, "F");

    // Left side content - Logo and Title
    const leftX = 25;
    const centerY = barY + barHeight / 2;
    
    // Logo dimensions for landscape bar (SVG aspect ratio is ~4.6:1)
    // Logo: 55mm wide x 12mm tall
    const logoWidth = 55;
    const logoHeight = 12;
    const logoX = leftX;
    const logoY = centerY - logoHeight - 2;
    
    // Try to load and display the logo
    let logoLoaded = false;
    if (settings.logoUrl) {
      try {
        const dataUrl = await convertLogoToDataUrl(settings.logoUrl, logoWidth, logoHeight);
        doc.addImage(dataUrl, "PNG", logoX, logoY, logoWidth, logoHeight, undefined, "FAST");
        logoLoaded = true;
      } catch (error) {
        console.error("Error loading logo:", error);
      }
    }
    
    // Fallback to text if logo fails
    if (!logoLoaded) {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(settings.contactName.toUpperCase(), leftX, centerY - 4);
    }

    // Professional title - below logo/name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(settings.title, leftX, centerY + 8);

    // Right side content - Contact info, vertically centered
    const rightX = pageWidth - 25;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    // Calculate total height of contact info to center it
    const lineHeight = 7;
    const contactLines = [settings.email, settings.website, settings.phone].filter(Boolean);
    const totalContactHeight = contactLines.length * lineHeight;
    let infoY = centerY - totalContactHeight / 2 + 3;
    
    if (settings.email) {
      doc.text(settings.email, rightX, infoY, { align: "right" });
      infoY += lineHeight;
    }
    if (settings.website) {
      doc.text(settings.website, rightX, infoY, { align: "right" });
      infoY += lineHeight;
    }
    if (settings.phone) {
      doc.text(settings.phone, rightX, infoY, { align: "right" });
    }

    // Subtle separator line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    const lineY = barY + barHeight - 10;
    doc.line(pageWidth * 0.6, lineY, pageWidth - 25, lineY);
  } else {
    // PORTRAIT: Green bar on RIGHT
    const barWidth = pageWidth * 0.35;
    const barX = pageWidth - barWidth;
    
    doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.rect(barX, 0, barWidth, pageHeight, "F");

    const contentX = barX + 20;
    const contentRight = pageWidth - 20;
    
    // Top section - Logo and Title
    let topY = 25;
    
    // Logo dimensions for portrait bar (SVG aspect ratio is ~4.6:1)
    // Bar width is ~104mm (35% of 297mm), so max logo width ~64mm with padding
    // Logo: 60mm wide x 13mm tall
    const logoWidth = 60;
    const logoHeight = 13;
    const logoX = contentX;
    const logoY = topY;
    
    // Try to load and display the logo
    let logoLoaded = false;
    if (settings.logoUrl) {
      try {
        const dataUrl = await convertLogoToDataUrl(settings.logoUrl, logoWidth, logoHeight);
        doc.addImage(dataUrl, "PNG", logoX, logoY, logoWidth, logoHeight, undefined, "FAST");
        topY += logoHeight + 6;
        logoLoaded = true;
      } catch (error) {
        console.error("Error loading logo:", error);
      }
    }
    
    // Fallback to text if logo fails
    if (!logoLoaded) {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(settings.contactName.toUpperCase(), contentX, topY + 5);
      topY += 12;
    }

    // Professional title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(settings.title, contentX, topY);

    // Bottom section - Contact info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Separator line above contact info
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(contentX, pageHeight - 55, contentRight, pageHeight - 55);
    
    let infoY = pageHeight - 42;
    if (settings.email) {
      doc.text(settings.email, contentX, infoY);
      infoY += 7;
    }
    if (settings.website) {
      doc.text(settings.website, contentX, infoY);
      infoY += 7;
    }
    if (settings.phone) {
      doc.text(settings.phone, contentX, infoY);
    }
  }

  currentStep++;
  onProgress?.((currentStep / totalSteps) * 100, "Cover page complete");

  // ========== IMAGE PAGES ==========
  for (let i = 0; i < selectedImages.length; i++) {
    const image = selectedImages[i];
    onProgress?.(
      ((currentStep + i) / totalSteps) * 100,
      `Processing image ${i + 1} of ${selectedImages.length}...`
    );

    doc.addPage();

    try {
      const { dataUrl, width, height } = await convertImageToDataUrl(image.url);
      const aspectRatio = width / height;
      const isLandscape = aspectRatio > 1;

      let imgWidth: number;
      let imgHeight: number;
      let x: number;
      let y: number;

      if (isLandscape) {
        // Landscape: fit to full width
        imgWidth = pageWidth;
        imgHeight = pageWidth / aspectRatio;
        x = 0;
        y = (pageHeight - imgHeight) / 2;
      } else {
        // Portrait: fit to full height
        imgHeight = pageHeight;
        imgWidth = pageHeight * aspectRatio;
        x = (pageWidth - imgWidth) / 2;
        y = 0;
      }

      // White background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Add the image
      doc.addImage(dataUrl, "JPEG", x, y, imgWidth, imgHeight, undefined, "FAST");
    } catch (error) {
      console.error(`Error loading image ${i + 1}:`, error);
      // Draw placeholder for failed image
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(14);
      doc.text("Image could not be loaded", pageWidth / 2, pageHeight / 2, { align: "center" });
    }

    currentStep++;
  }

  onProgress?.(100, "Generating PDF...");

  // Generate filename
  const dateStr = new Date().toISOString().split("T")[0];
  const safeName = settings.contactName.replace(/[^a-z0-9]/gi, "_").toUpperCase();
  const filename = `${safeName}_Portfolio_${dateStr}.pdf`;

  doc.save(filename);
}

