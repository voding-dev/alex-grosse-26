"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Download, Zap, Package, ArrowRight, Trash2 } from "lucide-react";
import JSZip from "jszip";

interface CompressedImage {
  id: string;
  original: File;
  compressed: Blob | null;
  originalUrl: string;
  compressedUrl: string | null;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export default function ImageCompressorPage() {
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedImages, setCompressedImages] = useState<CompressedImage[]>([]);
  const [compressionLevel, setCompressionLevel] = useState([70]);
  const [outputFormat, setOutputFormat] = useState("jpeg");
  const [maxWidth, setMaxWidth] = useState([1920]);
  const [enableResize, setEnableResize] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const compressImage = useCallback(async (
    file: File,
    id: string
  ): Promise<CompressedImage> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (enableResize && width > maxWidth[0]) {
            const ratio = maxWidth[0] / width;
            width = maxWidth[0];
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          const quality = compressionLevel[0] / 100;
          const mimeType = outputFormat === "jpeg" ? "image/jpeg" : "image/png";

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to create blob"));
                return;
              }

              const originalSize = file.size;
              const compressedSize = blob.size;
              const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

              const compressedUrl = URL.createObjectURL(blob);

              resolve({
                id,
                original: file,
                compressed: blob,
                originalUrl: URL.createObjectURL(file),
                compressedUrl,
                originalSize,
                compressedSize,
                compressionRatio,
                status: 'completed',
              });
            },
            mimeType,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = URL.createObjectURL(file);
    });
  }, [compressionLevel, outputFormat, maxWidth, enableResize]);

  const handleFileSelect = async (files: File[]) => {
    const validFiles = files.filter(file => file.type.startsWith("image/"));
    
    if (validFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select valid image files",
        variant: "destructive",
      });
      return;
    }

    if (validFiles.length < files.length) {
      toast({
        title: "Warning",
        description: `${files.length - validFiles.length} non-image files were skipped`,
      });
    }

    const initialImages: CompressedImage[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      original: file,
      compressed: null,
      originalUrl: URL.createObjectURL(file),
      compressedUrl: null,
      originalSize: file.size,
      compressedSize: 0,
      compressionRatio: 0,
      status: 'pending',
    }));

    setCompressedImages(prev => [...prev, ...initialImages]);
    setIsProcessing(true);
    setProcessingProgress(0);

    let completed = 0;
    for (const imageData of initialImages) {
      setCompressedImages(prev => prev.map(img => 
        img.id === imageData.id ? { ...img, status: 'processing' } : img
      ));

      try {
        const result = await compressImage(imageData.original, imageData.id);
        setCompressedImages(prev => prev.map(img => 
          img.id === imageData.id ? result : img
        ));
      } catch (error) {
        setCompressedImages(prev => prev.map(img => 
          img.id === imageData.id 
            ? { ...img, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
            : img
        ));
      }

      completed++;
      setProcessingProgress((completed / initialImages.length) * 100);
    }

    setIsProcessing(false);
    toast({
      title: "Success",
      description: `${completed} image${completed !== 1 ? 's' : ''} processed!`,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(Array.from(files));
    }
  };

  const downloadSingle = (image: CompressedImage) => {
    if (!image.compressedUrl) return;
    const link = document.createElement("a");
    link.href = image.compressedUrl;
    const extension = outputFormat === "jpeg" ? "jpg" : "png";
    link.download = `compressed_${image.original.name.replace(/\.[^/.]+$/, "")}.${extension}`;
    link.click();
  };

  const downloadAllAsZip = async () => {
    const completedImages = compressedImages.filter(img => img.status === 'completed' && img.compressed);
    
    if (completedImages.length === 0) {
      toast({
        title: "Error",
        description: "No compressed images to download",
        variant: "destructive",
      });
      return;
    }

    try {
      const zip = new JSZip();
      completedImages.forEach(image => {
        if (image.compressed) {
          const extension = outputFormat === "jpeg" ? "jpg" : "png";
          const filename = `compressed_${image.original.name.replace(/\.[^/.]+$/, "")}.${extension}`;
          zip.file(filename, image.compressed);
        }
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      link.download = `compressed_images_${date}.zip`;
      link.click();
      
      toast({
        title: "Success",
        description: "ZIP download started!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ZIP file",
        variant: "destructive",
      });
    }
  };

  const removeImage = (id: string) => {
    const image = compressedImages.find(img => img.id === id);
    if (image) {
      URL.revokeObjectURL(image.originalUrl);
      if (image.compressedUrl) {
        URL.revokeObjectURL(image.compressedUrl);
      }
    }
    setCompressedImages(prev => prev.filter(img => img.id !== id));
  };

  const resetAll = () => {
    compressedImages.forEach(image => {
      URL.revokeObjectURL(image.originalUrl);
      if (image.compressedUrl) {
        URL.revokeObjectURL(image.compressedUrl);
      }
    });
    setCompressedImages([]);
    setProcessingProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const recompressAll = async () => {
    const imagesToRecompress = compressedImages.map(img => img.original);
    resetAll();
    await handleFileSelect(imagesToRecompress);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-sm font-medium text-accent">
            <Zap className="h-4 w-4" />
            Smart Compression
          </div>
          
          <h1 className="text-4xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Image Compressor
          </h1>
          
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Reduce file sizes dramatically while preserving stunning visual quality. 
            Process images instantly in your browser.
          </p>
        </div>

        {compressedImages.length === 0 ? (
          /* Upload Area */
          <Card className="border-2 border-dashed border-foreground/20 bg-background/50 backdrop-blur-sm">
            <div
              className={`p-12 text-center transition-colors ${
                dragOver ? "bg-accent/10 border-accent" : ""
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <div className="space-y-6">
                <div className="mx-auto w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-background" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">Drop your image here</h3>
                  <p className="text-foreground/60">
                    Supports JPEG, PNG, and WebP files. Select multiple files for bulk processing.
                  </p>
                </div>
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-accent hover:bg-accent/90 text-background"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Choose File"}
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </div>
          </Card>
        ) : (
          /* Compression Results */
          <div className="space-y-6">
            {/* Stats Dashboard */}
            <Card className="p-6 bg-background/80 backdrop-blur-sm border-foreground/10">
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">{compressedImages.length}</div>
                    <div className="text-sm text-foreground/60">Total Images</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {compressedImages.filter(img => img.status === 'completed').length}
                    </div>
                    <div className="text-sm text-foreground/60">Completed</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground/80">
                      {formatFileSize(compressedImages.reduce((sum, img) => sum + img.originalSize, 0))}
                    </div>
                    <div className="text-sm text-foreground/60">Original Size</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {formatFileSize(compressedImages.reduce((sum, img) => sum + img.compressedSize, 0))}
                    </div>
                    <div className="text-sm text-foreground/60">Compressed Size</div>
                  </div>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-foreground/80">
                      <span>Processing images...</span>
                      <span>{Math.round(processingProgress)}%</span>
                    </div>
                    <Progress value={processingProgress} className="w-full" />
                  </div>
                )}

                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Compression Level</label>
                    <Slider
                      value={compressionLevel}
                      onValueChange={setCompressionLevel}
                      max={100}
                      min={10}
                      step={5}
                      className="w-full"
                    />
                    <div className="text-xs text-foreground/60">{compressionLevel[0]}%</div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Output Format</label>
                    <Select value={outputFormat} onValueChange={setOutputFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jpeg">JPEG</SelectItem>
                        <SelectItem value="png">PNG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Max Width (px)</label>
                    <Slider
                      value={maxWidth}
                      onValueChange={setMaxWidth}
                      max={3840}
                      min={640}
                      step={80}
                      disabled={!enableResize}
                      className="w-full"
                    />
                    <div className="text-xs text-foreground/60">{maxWidth[0]}px</div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button onClick={recompressAll} disabled={isProcessing} variant="outline" className="flex-1">
                      Recompress All
                    </Button>
                    <Button onClick={resetAll} variant="outline" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Image Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {compressedImages.map((image) => (
                <Card key={image.id} className="overflow-hidden border-foreground/10">
                  <div className="p-4 bg-foreground/5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm truncate flex-1 text-foreground">
                        {image.original.name}
                      </h3>
                      <Button
                        onClick={() => removeImage(image.id)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-foreground/60 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {image.status === 'pending' && (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {image.status === 'processing' && (
                        <Badge variant="secondary">
                          <Zap className="h-3 w-3 mr-1 animate-pulse" />
                          Processing
                        </Badge>
                      )}
                      {image.status === 'completed' && (
                        <>
                          <Badge variant="default" className="bg-accent text-background text-xs">
                            {formatFileSize(image.compressedSize)}
                          </Badge>
                          <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10 text-xs">
                            -{Math.round(image.compressionRatio)}%
                          </Badge>
                        </>
                      )}
                      {image.status === 'error' && (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="aspect-square bg-foreground/5 flex items-center justify-center overflow-hidden">
                    <img
                      src={image.compressedUrl || image.originalUrl}
                      alt={image.original.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  
                  <div className="p-3 bg-background border-t border-foreground/10">
                    <div className="flex items-center justify-between text-xs text-foreground/60 mb-2">
                      <span>Original: {formatFileSize(image.originalSize)}</span>
                      {image.status === 'completed' && (
                        <span>Compressed: {formatFileSize(image.compressedSize)}</span>
                      )}
                    </div>
                    
                    {image.status === 'completed' && (
                      <Button
                        onClick={() => downloadSingle(image)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Download className="h-3 w-3 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Bulk Download */}
            {compressedImages.some(img => img.status === 'completed') && (
              <div className="flex justify-center gap-4">
                <Button
                  onClick={downloadAllAsZip}
                  className="bg-accent hover:bg-accent/90 text-background px-8"
                  size="lg"
                  disabled={isProcessing}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Download All as ZIP
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

