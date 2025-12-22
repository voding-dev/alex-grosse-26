"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, X, GripVertical, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePortfolioPdf, PortfolioPdfSettings, SelectedImage } from "@/lib/pdf/portfolioPdfExport";
import { Id } from "@/convex/_generated/dataModel";

interface SelectedImageData {
  id: string;
  storageKey: string;
  url: string;
  portfolioTitle: string;
  aspectRatio?: number;
}

export default function CreatePdfPage() {
  // Fetch all public portfolio items
  const portfolioItems = useQuery(api.portfolio.listPublic) || [];
  
  // Fetch settings for PDF branding
  const settings = useQuery(api.settings.getAll);
  
  // Get cover image storage key and fetch its URL
  const coverStorageKey = settings?.pdfCoverStorageKey as string | undefined;
  const coverImageUrl = useQuery(
    api.storageQueries.getUrl,
    coverStorageKey ? { storageId: coverStorageKey } : "skip"
  );
  
  // State for selected images
  const [selectedImages, setSelectedImages] = useState<SelectedImageData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Expand all categories by default when portfolio items load
  useEffect(() => {
    if (portfolioItems.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set(portfolioItems.map(p => p._id)));
    }
  }, [portfolioItems, expandedCategories.size]);

  // Toggle image selection
  const toggleImageSelection = (image: SelectedImageData) => {
    setSelectedImages(prev => {
      const exists = prev.find(i => i.id === image.id);
      if (exists) {
        return prev.filter(i => i.id !== image.id);
      } else {
        return [...prev, image];
      }
    });
  };

  // Remove image from selection
  const removeImage = (id: string) => {
    setSelectedImages(prev => prev.filter(i => i.id !== id));
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newImages = [...selectedImages];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    setSelectedImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Generate PDF
  const handleGeneratePdf = async () => {
    if (selectedImages.length === 0) return;
    
    setIsGenerating(true);
    setProgress(0);
    setProgressMessage("Starting PDF generation...");

    try {
      const pdfSettings: PortfolioPdfSettings = {
        coverImageUrl: coverImageUrl || undefined,
        contactName: (settings?.pdfContactName as string) || "Alex Grosse",
        title: (settings?.pdfTitle as string) || "Photographer & Producer",
        email: (settings?.pdfEmail as string) || "",
        phone: (settings?.pdfPhone as string) || "",
        website: (settings?.pdfWebsite as string) || "",
        logoUrl: "/ag-wordmark-white.svg",
      };

      const images: SelectedImage[] = selectedImages.map(img => ({
        url: img.url,
        portfolioTitle: img.portfolioTitle,
        aspectRatio: img.aspectRatio,
      }));

      await generatePortfolioPdf(pdfSettings, images, (prog, msg) => {
        setProgress(prog);
        setProgressMessage(msg);
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setProgressMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Sidebar */}
      <aside className="w-72 bg-[#FAFAF9] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        {/* Logo & Header */}
        <div className="p-6 border-b border-gray-200">
          <Link href="/" className="block mb-4">
            <Image
              src="/ag-wordmark-dark.svg"
              alt="Alex Grosse"
              width={140}
              height={35}
              className="h-8 w-auto"
            />
          </Link>
          <h1 
            className="text-lg font-black uppercase tracking-wider"
            style={{ fontWeight: '900', color: '#586034' }}
          >
            Create a PDF!
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Select as many images as you wish & reorder below!
          </p>
        </div>

        {/* Download Button */}
        <div className="p-4 border-b border-gray-200">
          <Button
            onClick={handleGeneratePdf}
            disabled={selectedImages.length === 0 || isGenerating}
            className="w-full font-black uppercase tracking-wider transition-all"
            style={{ 
              backgroundColor: selectedImages.length === 0 ? '#ccc' : '#586034',
              fontWeight: '900',
              color: '#fff'
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
          {isGenerating && (
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: '#586034' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{progressMessage}</p>
            </div>
          )}
        </div>

        {/* Selected Images */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">
            Selected Images ({selectedImages.length})
          </p>
          
          {selectedImages.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Click images to select them
            </p>
          ) : (
            <div className="space-y-2">
              {selectedImages.map((image, index) => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 cursor-move transition-all ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {image.portfolioTitle}
                    </p>
                  </div>
                  <button
                    onClick={() => removeImage(image.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Alex Grosse
          </p>
        </div>
      </aside>

      {/* Main Content - Portfolio Grid */}
      <main className="flex-1 p-8 overflow-y-auto">
        {portfolioItems.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-8">
            {portfolioItems.map((portfolio) => (
              <PortfolioCategory
                key={portfolio._id}
                portfolioId={portfolio._id}
                title={portfolio.title}
                isExpanded={expandedCategories.has(portfolio._id)}
                onToggle={() => toggleCategory(portfolio._id)}
                selectedImages={selectedImages}
                onToggleImage={toggleImageSelection}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Portfolio Category Component
function PortfolioCategory({
  portfolioId,
  title,
  isExpanded,
  onToggle,
  selectedImages,
  onToggleImage,
}: {
  portfolioId: Id<"portfolio">;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  selectedImages: SelectedImageData[];
  onToggleImage: (image: SelectedImageData) => void;
}) {
  // Fetch assets for this portfolio
  const assets = useQuery(api.assets.listPortfolio, { portfolioId }) || [];
  
  // Filter to only images
  const imageAssets = assets.filter(asset => asset.type === "image");
  
  // Count selected from this category
  const selectedCount = selectedImages.filter(
    img => imageAssets.some(a => a._id === img.id)
  ).length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Category Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-black uppercase tracking-wider text-gray-800" style={{ fontWeight: '900' }}>
            + {title}
          </span>
          {selectedCount > 0 && (
            <span 
              className="px-2 py-0.5 text-xs font-bold rounded-full text-white"
              style={{ backgroundColor: '#586034' }}
            >
              {selectedCount} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <span className="text-sm">{imageAssets.length} images</span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>

      {/* Images Grid */}
      {isExpanded && (
        <div className="p-4">
          {imageAssets.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No images in this category</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {imageAssets.map((asset) => (
                <PortfolioImage
                  key={asset._id}
                  assetId={asset._id}
                  storageKey={asset.previewKey || asset.storageKey}
                  portfolioTitle={title}
                  aspectRatio={asset.width && asset.height ? asset.width / asset.height : undefined}
                  isSelected={selectedImages.some(img => img.id === asset._id)}
                  onToggle={onToggleImage}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Individual Image Component
function PortfolioImage({
  assetId,
  storageKey,
  portfolioTitle,
  aspectRatio,
  isSelected,
  onToggle,
}: {
  assetId: string;
  storageKey: string;
  portfolioTitle: string;
  aspectRatio?: number;
  isSelected: boolean;
  onToggle: (image: SelectedImageData) => void;
}) {
  // Get the URL for this image - skip if no valid storageKey
  const imageUrl = useQuery(
    api.storageQueries.getUrl, 
    storageKey ? { storageId: storageKey } : "skip"
  );

  if (!storageKey || !imageUrl) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
    );
  }

  const handleClick = () => {
    onToggle({
      id: assetId,
      storageKey,
      url: imageUrl,
      portfolioTitle,
      aspectRatio,
    });
  };

  return (
    <button
      onClick={handleClick}
      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
        isSelected 
          ? 'border-[#586034] ring-2 ring-[#586034]/30' 
          : 'border-transparent hover:border-gray-300'
      }`}
    >
      <Image
        src={imageUrl}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
      />
      
      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-[#586034]/30 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-[#586034] flex items-center justify-center">
            <Check className="h-5 w-5 text-white" />
          </div>
        </div>
      )}
    </button>
  );
}

