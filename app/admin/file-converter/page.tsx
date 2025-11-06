"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Download, Copy, QrCode, X, File, Settings, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import JSZip from "jszip";
import QRCode from "qrcode";

// Conversion Catalog - Authoritative matrix
const CONVERSION_CATALOG: Record<string, string[]> = {
  // Documents
  "txt": ["pdf", "doc", "docx", "odt", "rtf", "html", "md"],
  "log": ["pdf", "doc", "docx", "odt", "rtf", "html", "md"],
  "nfo": ["pdf", "doc", "docx", "odt", "rtf", "html", "md"],
  "md": ["pdf", "docx", "html", "rtf", "odt", "txt"],
  "html": ["pdf", "docx", "odt", "rtf", "txt", "md"],
  "htm": ["pdf", "docx", "odt", "rtf", "txt", "md"],
  "rtf": ["pdf", "doc", "docx", "odt", "txt", "html"],
  "doc": ["pdf", "docx", "odt", "rtf", "txt", "html"],
  "docx": ["pdf", "doc", "odt", "rtf", "txt", "html"],
  "wpd": ["pdf", "docx", "rtf", "txt"],
  "odt": ["pdf", "docx", "doc", "rtf", "txt", "html"],
  "pages": ["pdf", "docx", "rtf"],
  "pdf": ["pdfa", "docx", "odt", "rtf", "txt", "html", "svg", "png", "jpg", "tiff"],
  
  // Spreadsheets
  "xls": ["xlsx", "ods", "csv", "tsv", "json", "pdf"],
  "xlsx": ["xls", "ods", "csv", "tsv", "json", "pdf"],
  "ods": ["xlsx", "xls", "csv", "tsv", "json", "pdf"],
  "csv": ["xlsx", "xls", "ods", "tsv", "json", "parquet", "pdf"],
  "tsv": ["xlsx", "xls", "ods", "csv", "json", "parquet", "pdf"],
  "numbers": ["xlsx", "csv", "pdf"],
  
  // Presentations
  "ppt": ["pptx", "pdf", "odp", "png", "jpg", "svg", "mp4"],
  "pptx": ["ppt", "pdf", "odp", "png", "jpg", "svg", "mp4"],
  "odp": ["pptx", "pdf", "png", "jpg", "svg", "mp4"],
  "key": ["pdf", "pptx", "png", "jpg"],
  
  // eBooks
  "epub": ["mobi", "azw3", "pdf", "fb2", "txt"],
  "mobi": ["epub", "azw3", "pdf", "fb2", "txt"],
  "azw3": ["epub", "mobi", "pdf", "fb2", "txt"],
  "fb2": ["epub", "mobi", "azw3", "pdf", "txt"],
  "cbz": ["pdf", "epub"],
  "cbr": ["pdf", "epub"],
  
  // Raster Images
  "jpg": ["png", "webp", "avif", "jxl", "tiff", "bmp", "gif", "pdf"],
  "jpeg": ["png", "webp", "avif", "jxl", "tiff", "bmp", "gif", "pdf"],
  "png": ["jpg", "webp", "avif", "jxl", "tiff", "bmp", "gif", "pdf"],
  "gif": ["jpg", "png", "webp", "avif", "jxl", "tiff", "bmp", "pdf"],
  "bmp": ["jpg", "png", "webp", "avif", "jxl", "tiff", "gif", "pdf"],
  "tif": ["jpg", "png", "webp", "avif", "jxl", "tiff", "bmp", "gif", "pdf"],
  "tiff": ["jpg", "png", "webp", "avif", "jxl", "tiff", "bmp", "gif", "pdf"],
  "webp": ["jpg", "png", "avif", "jxl", "tiff", "bmp", "gif", "pdf"],
  "heic": ["jpg", "png", "webp", "avif", "jxl", "tiff", "bmp", "pdf"],
  "heif": ["jpg", "png", "webp", "avif", "jxl", "tiff", "bmp", "pdf"],
  "avif": ["jpg", "png", "webp", "jxl", "tiff", "bmp", "gif", "pdf"],
  "jxl": ["jpg", "png", "webp", "avif", "tiff", "bmp", "gif", "pdf"],
  
  // RAW Images
  "cr2": ["dng", "jpg", "png", "tiff"],
  "cr3": ["dng", "jpg", "png", "tiff"],
  "nef": ["dng", "jpg", "png", "tiff"],
  "nrw": ["dng", "jpg", "png", "tiff"],
  "arw": ["dng", "jpg", "png", "tiff"],
  "sr2": ["dng", "jpg", "png", "tiff"],
  "orf": ["dng", "jpg", "png", "tiff"],
  "rw2": ["dng", "jpg", "png", "tiff"],
  "dng": ["jpg", "png", "tiff"],
  "raf": ["dng", "jpg", "png", "tiff"],
  "srw": ["dng", "jpg", "png", "tiff"],
  
  // Vector / Design
  "svg": ["pdf", "eps", "ai", "png", "jpg", "webp", "avif"],
  "eps": ["pdf", "svg", "ai", "png", "jpg", "tiff"],
  "ai": ["pdf", "svg", "eps", "png", "jpg", "tiff"],
  "psd": ["pdf", "psb", "png", "jpg", "tiff", "webp", "avif"],
  "xcf": ["png", "jpg", "tiff", "psd"],
  
  // Icons
  "ico": ["png", "svg", "icns"],
  "icns": ["png", "svg", "ico"],
  
  // Audio
  "wav": ["mp3", "aac", "flac", "alac", "ogg", "opus", "wma", "amr"],
  "aiff": ["mp3", "aac", "flac", "alac", "ogg", "opus", "wma"],
  "au": ["mp3", "aac", "flac", "alac", "ogg", "opus"],
  "flac": ["mp3", "aac", "alac", "wav", "aiff", "ogg", "opus"],
  "alac": ["mp3", "aac", "flac", "wav", "aiff", "ogg", "opus"],
  "mp3": ["aac", "flac", "wav", "aiff", "ogg", "opus"],
  "aac": ["mp3", "flac", "wav", "aiff", "ogg", "opus"],
  "m4a": ["mp3", "aac", "flac", "wav", "aiff", "ogg", "opus"],
  "ogg": ["mp3", "aac", "flac", "wav", "aiff", "opus"],
  "opus": ["mp3", "aac", "flac", "wav", "aiff", "ogg"],
  "wma": ["mp3", "aac", "flac", "wav", "aiff"],
  "amr": ["mp3", "aac", "wav"],
  "midi": ["wav", "mp3"],
  "mid": ["wav", "mp3"],
  "kar": ["wav", "mp3"],
  
  // Video
  "mp4": ["webm", "mkv", "mov", "gif", "apng", "mp3", "aac", "flac", "wav"],
  "mov": ["mp4", "webm", "mkv", "gif", "apng", "mp3", "aac", "flac", "wav"],
  "mkv": ["mp4", "webm", "mov", "gif", "apng", "mp3", "aac", "flac", "wav"],
  "webm": ["mp4", "mkv", "mov", "gif", "apng", "mp3", "aac", "flac", "wav"],
  "avi": ["mp4", "webm", "mkv", "mov", "gif", "apng", "mp3", "aac", "flac", "wav"],
  "mpeg": ["mp4", "webm", "mkv", "mov", "gif", "apng", "mp3", "aac", "flac", "wav"],
  "ts": ["mp4", "webm", "mkv", "mov", "gif", "apng", "mp3", "aac", "flac", "wav"],
  "m2ts": ["mp4", "webm", "mkv", "mov", "gif", "apng", "mp3", "aac", "flac", "wav"],
  "flv": ["mp4", "webm", "mkv", "mov", "gif", "apng", "mp3", "aac", "flac", "wav"],
  "wmv": ["mp4", "webm", "mkv", "mov", "gif", "apng", "mp3", "aac", "flac", "wav"],
  "m4v": ["mp4", "webm", "mkv", "mov", "gif", "apng", "mp3", "aac", "flac", "wav"],
  "3gp": ["mp4", "webm", "mkv", "mov", "gif", "apng", "mp3", "aac", "flac", "wav"],
  
  // Subtitles
  "srt": ["vtt", "ass", "ssa"],
  "vtt": ["srt", "ass", "ssa"],
  "ass": ["srt", "vtt", "ssa"],
  "ssa": ["srt", "vtt", "ass"],
  "sub": ["srt", "vtt", "ass", "ssa"],
  "idx": ["srt", "vtt", "ass", "ssa"],
  
  // Archives
  "zip": ["7z", "tar", "targz", "tarbz2", "tarxz"],
  "7z": ["zip", "tar", "targz", "tarbz2", "tarxz"],
  "tar": ["zip", "7z", "targz", "tarbz2", "tarxz"],
  "targz": ["zip", "7z", "tar", "tarbz2", "tarxz"],
  "tarbz2": ["zip", "7z", "tar", "targz", "tarxz"],
  "tarxz": ["zip", "7z", "tar", "targz", "tarbz2"],
  "rar": ["zip", "7z", "tar", "targz", "tarbz2", "tarxz"],
  
  // 3D / CAD
  "dwg": ["dxf", "svg", "pdf", "png"],
  "dxf": ["svg", "pdf", "png"],
  "step": ["stl", "3mf", "obj", "glb", "gltf"],
  "stp": ["stl", "3mf", "obj", "glb", "gltf"],
  "iges": ["stl", "3mf", "obj", "glb", "gltf"],
  "igs": ["stl", "3mf", "obj", "glb", "gltf"],
  "obj": ["glb", "gltf", "fbx", "stl", "3mf", "ply"],
  "fbx": ["glb", "gltf", "obj", "stl", "3mf", "ply"],
  "glb": ["fbx", "obj", "stl", "3mf", "ply"],
  "gltf": ["fbx", "obj", "stl", "3mf", "ply"],
  "stl": ["obj", "glb", "gltf", "fbx", "3mf", "ply"],
  "3mf": ["obj", "glb", "gltf", "fbx", "stl", "ply"],
  "ply": ["obj", "glb", "gltf", "fbx", "stl", "3mf"],
  
  // Fonts
  "ttf": ["woff", "woff2", "eot"],
  "otf": ["woff", "woff2", "eot"],
  
  // Code / Data
  "json": ["yaml", "xml", "csv", "pdf"],
  "yaml": ["json", "xml", "csv", "pdf"],
  "yml": ["json", "xml", "csv", "pdf"],
  "xml": ["json", "yaml", "csv", "pdf"],
  
  // GIS
  "geojson": ["kml", "gpx", "shp"],
  "kml": ["geojson", "gpx"],
  "gpx": ["geojson", "kml"],
};

// Preset quick targets
const PRESET_TARGETS = ["pdf", "mp4", "png", "mp3", "zip", "epub", "csv", "glb"];

// Format display names
const FORMAT_NAMES: Record<string, string> = {
  pdf: "PDF",
  pdfa: "PDF/A",
  doc: "DOC",
  docx: "DOCX",
  odt: "ODT",
  rtf: "RTF",
  html: "HTML",
  md: "Markdown",
  txt: "TXT",
  xls: "XLS",
  xlsx: "XLSX",
  ods: "ODS",
  csv: "CSV",
  tsv: "TSV",
  json: "JSON",
  parquet: "Parquet",
  ppt: "PPT",
  pptx: "PPTX",
  odp: "ODP",
  epub: "EPUB",
  mobi: "MOBI",
  azw3: "AZW3",
  fb2: "FB2",
  jpg: "JPG",
  jpeg: "JPEG",
  png: "PNG",
  gif: "GIF",
  webp: "WebP",
  avif: "AVIF",
  jxl: "JPEG XL",
  tiff: "TIFF",
  bmp: "BMP",
  heic: "HEIC",
  heif: "HEIF",
  dng: "DNG",
  svg: "SVG",
  eps: "EPS",
  ai: "AI",
  psd: "PSD",
  ico: "ICO",
  icns: "ICNS",
  wav: "WAV",
  mp3: "MP3",
  aac: "AAC",
  flac: "FLAC",
  ogg: "OGG",
  opus: "Opus",
  mp4: "MP4",
  mov: "MOV",
  mkv: "MKV",
  webm: "WebM",
  srt: "SRT",
  vtt: "VTT",
  zip: "ZIP",
  "7z": "7Z",
  tar: "TAR",
  glb: "GLB",
  gltf: "GLTF",
  obj: "OBJ",
  fbx: "FBX",
  stl: "STL",
  woff: "WOFF",
  woff2: "WOFF2",
};

interface FileConversion {
  id: string;
  file: File;
  detectedType: string;
  fileSize: number;
  outputFormat: string;
  status: 'pending' | 'converting' | 'completed' | 'error' | 'cancelled';
  progress: number;
  convertedBlob: Blob | null;
  convertedUrl: string | null;
  downloadUrl: string | null;
  error?: string;
  expiresAt: number;
  advancedOptions: Record<string, any>;
}

const EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

export default function FileConverterPage() {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<FileConversion[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const conversionTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const detectFileType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    // Check MIME type first, then fall back to extension
    if (file.type) {
      const mimeMap: Record<string, string> = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'video/mp4': 'mp4',
        'video/quicktime': 'mov',
        'application/zip': 'zip',
        'application/json': 'json',
      };
      if (mimeMap[file.type]) {
        return mimeMap[file.type];
      }
    }
    return extension;
  };

  const getAllowedOutputs = (inputType: string): string[] => {
    return CONVERSION_CATALOG[inputType] || [];
  };

  const formatTimeRemaining = (expiresAt: number): string => {
    const now = Date.now();
    const remaining = Math.max(0, expiresAt - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (selectedFiles: File[]) => {
    const newFiles: FileConversion[] = selectedFiles.map(file => {
      const detectedType = detectFileType(file);
      const allowedOutputs = getAllowedOutputs(detectedType);
      
      return {
        id: Math.random().toString(36).substring(2, 11),
        file,
        detectedType,
        fileSize: file.size,
        outputFormat: allowedOutputs.length > 0 ? allowedOutputs[0] : '',
        status: 'pending',
        progress: 0,
        convertedBlob: null,
        convertedUrl: null,
        downloadUrl: null,
        expiresAt: Date.now() + EXPIRY_TIME,
        advancedOptions: {},
      };
    });

    setFiles(prev => [...prev, ...newFiles]);
    
    toast({
      title: "Files Added",
      description: `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} added. Select output formats and convert.`,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileSelect(Array.from(selectedFiles));
    }
  };

  const updateOutputFormat = (id: string, format: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, outputFormat: format } : f
    ));
  };

  const cancelConversion = (id: string) => {
    const timeout = conversionTimeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      conversionTimeoutsRef.current.delete(id);
    }
    
    setFiles(prev => prev.map(f => 
      f.id === id && f.status === 'converting' 
        ? { ...f, status: 'cancelled', progress: 0 }
        : f
    ));
    
    toast({
      title: "Conversion Cancelled",
      description: "File conversion has been cancelled.",
    });
  };

  // Simulate conversion - In production, this would call a real conversion API
  const performConversion = async (fileConversion: FileConversion): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      // Simulate conversion progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // For now, simulate conversion by creating a blob with the same content
          // In production, this would call a real conversion service
          fileConversion.file.arrayBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: `application/${fileConversion.outputFormat}` });
            resolve(blob);
          }).catch(reject);
        } else {
          setFiles(prev => prev.map(f => 
            f.id === fileConversion.id ? { ...f, progress } : f
          ));
        }
      }, 200);
    });
  };

  const startConversion = async (id: string) => {
    const fileConversion = files.find(f => f.id === id);
    if (!fileConversion || !fileConversion.outputFormat) {
      toast({
        title: "Error",
        description: "Please select an output format",
        variant: "destructive",
      });
      return;
    }

    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status: 'converting', progress: 0 } : f
    ));
    setIsConverting(true);

    try {
      const convertedBlob = await performConversion(fileConversion);
      const convertedUrl = URL.createObjectURL(convertedBlob);
      const downloadUrl = convertedUrl;
      
      setFiles(prev => prev.map(f => 
        f.id === id 
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100,
              convertedBlob,
              convertedUrl,
              downloadUrl,
            }
          : f
      ));
      
      toast({
        title: "Conversion Complete",
        description: `${fileConversion.file.name} converted successfully.`,
      });
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === id 
          ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Conversion failed'
            }
          : f
      ));
      
      toast({
        title: "Conversion Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
      updateOverallProgress();
    }
  };

  const convertAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' && f.outputFormat);
    if (pendingFiles.length === 0) {
      toast({
        title: "No Files to Convert",
        description: "Please select output formats for your files.",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    setOverallProgress(0);

    for (const fileConversion of pendingFiles) {
      await startConversion(fileConversion.id);
    }

    setIsConverting(false);
  };

  const updateOverallProgress = () => {
    const total = files.length;
    const completed = files.filter(f => f.status === 'completed').length;
    setOverallProgress(total > 0 ? (completed / total) * 100 : 0);
  };

  useEffect(() => {
    updateOverallProgress();
  }, [files]);

  // Auto-delete expired files
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setFiles(prev => {
        const expired = prev.filter(f => f.expiresAt < now);
        expired.forEach(f => {
          if (f.convertedUrl) URL.revokeObjectURL(f.convertedUrl);
          if (f.downloadUrl) URL.revokeObjectURL(f.downloadUrl);
        });
        return prev.filter(f => f.expiresAt >= now);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const downloadFile = (fileConversion: FileConversion) => {
    if (!fileConversion.downloadUrl) return;
    const link = document.createElement("a");
    link.href = fileConversion.downloadUrl;
    const extension = fileConversion.outputFormat;
    link.download = `${fileConversion.file.name.replace(/\.[^/.]+$/, "")}.${extension}`;
    link.click();
  };

  const copyLink = async (fileConversion: FileConversion) => {
    if (!fileConversion.downloadUrl) return;
    try {
      await navigator.clipboard.writeText(fileConversion.downloadUrl);
      toast({
        title: "Link Copied",
        description: "Download link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const generateQR = async (fileConversion: FileConversion) => {
    if (!fileConversion.downloadUrl) return;
    try {
      const qrDataUrl = await QRCode.toDataURL(fileConversion.downloadUrl);
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `qr-${fileConversion.file.name.replace(/\.[^/.]+$/, "")}.png`;
      link.click();
      
      toast({
        title: "QR Code Generated",
        description: "QR code downloaded.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const removeFile = (id: string) => {
    const fileConversion = files.find(f => f.id === id);
    if (fileConversion) {
      if (fileConversion.convertedUrl) URL.revokeObjectURL(fileConversion.convertedUrl);
      if (fileConversion.downloadUrl) URL.revokeObjectURL(fileConversion.downloadUrl);
    }
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const downloadAll = async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.convertedBlob);
    if (completedFiles.length === 0) {
      toast({
        title: "No Files to Download",
        description: "Complete conversions first.",
        variant: "destructive",
      });
      return;
    }

    if (completedFiles.length === 1) {
      downloadFile(completedFiles[0]);
      return;
    }

    try {
      const zip = new JSZip();
      completedFiles.forEach(fileConversion => {
        if (fileConversion.convertedBlob) {
          const extension = fileConversion.outputFormat;
          const filename = `${fileConversion.file.name.replace(/\.[^/.]+$/, "")}.${extension}`;
          zip.file(filename, fileConversion.convertedBlob);
        }
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `converted_files_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      
      toast({
        title: "Download Started",
        description: "All files downloaded as ZIP.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ZIP file",
        variant: "destructive",
      });
    }
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const convertingCount = files.filter(f => f.status === 'converting').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-sm font-medium text-accent">
            <File className="h-4 w-4" />
            Universal Converter
          </div>
          
          <h1 className="text-4xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            File Converter
          </h1>
          
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Convert files between formats instantly. Drag & drop or select files. 
            Expires automatically after 15 minutes.
          </p>
        </div>

        {/* Preset Bar */}
        {files.length === 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {PRESET_TARGETS.map(format => (
              <Badge 
                key={format} 
                variant="outline" 
                className="px-4 py-2 text-sm cursor-default"
              >
                {FORMAT_NAMES[format] || format.toUpperCase()}
              </Badge>
            ))}
          </div>
        )}

        {/* Upload Area */}
        {files.length === 0 ? (
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
                  <h3 className="text-xl font-semibold text-foreground">Drop files or click to choose</h3>
                  <p className="text-foreground/60">
                    We'll only show valid outputs based on your file types.
                  </p>
                </div>
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-accent hover:bg-accent/90 text-background"
                >
                  Choose Files
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </div>
          </Card>
        ) : (
          /* Files List */
          <div className="space-y-6">
            {/* Stats & Controls */}
            <Card className="p-6 bg-background/80 backdrop-blur-sm border-foreground/10">
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{files.length}</div>
                    <div className="text-sm text-foreground/60">Total Files</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{completedCount}</div>
                    <div className="text-sm text-foreground/60">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">{convertingCount}</div>
                    <div className="text-sm text-foreground/60">Converting</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground/80">{pendingCount}</div>
                    <div className="text-sm text-foreground/60">Pending</div>
                  </div>
                </div>

                {isConverting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-foreground/80">
                      <span>Converting files...</span>
                      <span>{Math.round(overallProgress)}%</span>
                    </div>
                    <Progress value={overallProgress} className="w-full" />
                  </div>
                )}

                {pendingCount > 0 && (
                  <div className="flex gap-4">
                    <Button
                      onClick={convertAll}
                      className="bg-accent hover:bg-accent/90 text-background"
                      disabled={isConverting}
                    >
                      Convert All ({pendingCount})
                    </Button>
                    {completedCount > 0 && (
                      <Button
                        onClick={downloadAll}
                        variant="outline"
                        disabled={isConverting}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download All
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* File Chips */}
            <div className="space-y-4">
              {files.map((fileConversion) => {
                const allowedOutputs = getAllowedOutputs(fileConversion.detectedType);
                const expiresIn = formatTimeRemaining(fileConversion.expiresAt);
                
                return (
                  <Card key={fileConversion.id} className="border-foreground/10">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* File Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <File className="h-5 w-5 text-accent flex-shrink-0" />
                              <h3 className="font-semibold text-foreground truncate">
                                {fileConversion.file.name}
                              </h3>
                              <Badge variant="secondary" className="text-xs">
                                {fileConversion.detectedType.toUpperCase() || 'UNKNOWN'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {formatFileSize(fileConversion.fileSize)}
                              </Badge>
                            </div>
                            
                            {fileConversion.status === 'completed' && (
                              <div className="flex items-center gap-2 text-sm text-foreground/60">
                                <Clock className="h-4 w-4" />
                                <span>Expires in {expiresIn}</span>
                              </div>
                            )}
                          </div>
                          
                          <Button
                            onClick={() => removeFile(fileConversion.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-foreground/60 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Output Format Selection */}
                        {allowedOutputs.length === 0 ? (
                          <div className="flex items-center gap-2 text-sm text-red-500">
                            <AlertCircle className="h-4 w-4" />
                            <span>No conversions available for this file type.</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <Label className="text-sm font-medium text-foreground mb-2 block">
                                Output Format
                              </Label>
                              <Select
                                value={fileConversion.outputFormat}
                                onValueChange={(value) => updateOutputFormat(fileConversion.id, value)}
                                disabled={fileConversion.status === 'converting' || fileConversion.status === 'completed'}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {allowedOutputs.map(format => (
                                    <SelectItem key={format} value={format}>
                                      {FORMAT_NAMES[format] || format.toUpperCase()}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {fileConversion.status === 'pending' && (
                              <Button
                                onClick={() => startConversion(fileConversion.id)}
                                className="bg-accent hover:bg-accent/90 text-background"
                                disabled={!fileConversion.outputFormat}
                              >
                                Convert
                              </Button>
                            )}
                            
                            {fileConversion.status === 'converting' && (
                              <div className="flex items-center gap-4">
                                <div className="w-32">
                                  <Progress value={fileConversion.progress} />
                                </div>
                                <span className="text-sm text-foreground/60">{Math.round(fileConversion.progress)}%</span>
                                <Button
                                  onClick={() => cancelConversion(fileConversion.id)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                            
                            {fileConversion.status === 'completed' && fileConversion.downloadUrl && (
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => downloadFile(fileConversion)}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                                <Button
                                  onClick={() => copyLink(fileConversion)}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </Button>
                                <Button
                                  onClick={() => generateQR(fileConversion)}
                                  variant="outline"
                                  size="sm"
                                >
                                  <QrCode className="h-4 w-4 mr-2" />
                                  QR
                                </Button>
                              </div>
                            )}
                            
                            {fileConversion.status === 'error' && (
                              <div className="flex items-center gap-2 text-sm text-red-500">
                                <AlertCircle className="h-4 w-4" />
                                <span>{fileConversion.error || 'Conversion failed'}</span>
                              </div>
                            )}
                            
                            {fileConversion.status === 'cancelled' && (
                              <Badge variant="secondary">Cancelled</Badge>
                            )}
                          </div>
                        )}

                        {/* Advanced Options - Collapsible */}
                        {fileConversion.status === 'pending' && (
                          <Tabs defaultValue="basic" className="w-full">
                            <TabsList>
                              <TabsTrigger value="basic">Basic</TabsTrigger>
                              <TabsTrigger value="advanced">Advanced</TabsTrigger>
                            </TabsList>
                            <TabsContent value="basic" className="mt-4">
                              <p className="text-sm text-foreground/60">
                                Basic conversion settings applied automatically.
                              </p>
                            </TabsContent>
                            <TabsContent value="advanced" className="mt-4">
                              <div className="space-y-4 text-sm text-foreground/60">
                                <p>Advanced options will be available based on file type.</p>
                                {/* Advanced options UI can be expanded here */}
                              </div>
                            </TabsContent>
                          </Tabs>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}






