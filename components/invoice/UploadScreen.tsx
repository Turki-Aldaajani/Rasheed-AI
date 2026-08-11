"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Sparkles,
  Trash2,
  UploadCloud,
  Camera,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button, EstimateNote } from "@/components/ui/Primitives";
import { Wordmark } from "@/components/layout/Logo";
import { cn } from "@/lib/formatting";
import { processAndUploadBill, validateBillFile, BillMetadata } from "@/lib/billService";
import styles from "./UploadScreen.module.css";

export function UploadScreen({
  onAnalyze,
  onBack,
}: {
  onAnalyze: () => void;
  onBack: () => void;
}) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Upload and OCR states
  const [uploadState, setUploadState] = useState<'idle' | 'validating' | 'compressing' | 'uploading' | 'saving' | 'analyzing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BillMetadata | null>(null);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const triggerCameraSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    cameraInputRef.current?.click();
  };

  // Detect and synchronize dark mode setting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') || 
                     document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkMode(isDark);
    }
  }, []);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Toggle local dark theme
  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  };

  const acceptFile = useCallback((selectedFile: File) => {
    setError(null);
    setResult(null);
    setUploadState('idle');
    setProgress(0);

    const validation = validateBillFile(selectedFile);
    if (!validation.isValid) {
      setError(validation.errorMessage || 'ملف غير صالح.');
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    setFile(selectedFile);
    
    if (selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setUploadState('idle');
    setProgress(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (inputRef.current) inputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;

    // Temporary/Mock user ID for prototype demonstration
    const mockUserId = 'usr_987654321_invoice';

    const uploadResult = await processAndUploadBill(
      file,
      mockUserId,
      (stage, currentProgress) => {
        setUploadState(stage);
        setProgress(currentProgress);
      }
    );

    if (!uploadResult.success) {
      setUploadState('error');
      setError(uploadResult.error || 'حدث خطأ أثناء معالجة الفاتورة.');
      return;
    }

    // High fidelity analysis mock
    setUploadState('analyzing');
    setProgress(95);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setUploadState('done');
    setProgress(100);
    setResult(uploadResult.data || null);

    // Refresh Next.js page data cache so the dashboard updates
    router.refresh();

    // Call onAnalyze parent callback after a brief success animation delay
    setTimeout(() => {
      onAnalyze();
    }, 1500);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusText = (): string => {
    switch (uploadState) {
      case 'validating':
        return 'جاري التحقق من صحة الملف وحجمه...';
      case 'compressing':
        return 'جاري ضغط وتحسين جودة الصورة لتقليل الحجم...';
      case 'uploading':
        return 'جاري رفع الملف إلى مخزن البيانات السحابي...';
      case 'saving':
        return 'جاري تسجيل الفاتورة وحفظ البيانات الوصفية...';
      case 'analyzing':
        return 'جاري فحص وتحليل بيانات الفاتورة ذكياً (OCR)...';
      case 'done':
        return 'تم الرفع والتحليل بنجاح!';
      case 'error':
        return 'فشلت العملية.';
      default:
        return 'جاهز للرفع';
    }
  };

  return (
    <div className={styles.container}>
      {/* Theme Toggle Widget */}
      <div className={styles.themeToggle}>
        <button 
          onClick={toggleTheme} 
          className={styles.themeButton}
          aria-label="تغيير المظهر"
        >
          {isDarkMode ? "☀️ الوضع الفاتح" : "🌙 الوضع الداكن"}
        </button>
      </div>

      <header className="border-b border-ink-100 mb-6 pb-4">
        <div className="flex items-center justify-between">
          <Wordmark />
          <Button variant="ghost" onClick={onBack} disabled={uploadState !== 'idle' && uploadState !== 'done' && uploadState !== 'error'}>
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
        </div>
      </header>

      <div className={styles.card}>
        <div className="rs-rise">
          <h1 className={styles.title}>حلّل فاتورتك</h1>
          <p className={styles.subtitle}>
            ارفع فاتورة الكهرباء أو المياه وسيساعدك رشيد على فهم استهلاك منزلك.
          </p>
        </div>

        {/* Upload Zone */}
        {!file && (
          <div
            className={cn(
              styles.dropzone,
              dragging && styles.dropzoneHovered,
              "rs-rise mt-8"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropFile = e.dataTransfer.files?.[0];
              if (dropFile) acceptFile(dropFile);
            }}
            onClick={() => inputRef.current?.click()}
          >
            <div className={styles.iconWrapper}>
              <UploadCloud className="h-10 w-10 text-brand-600" strokeWidth={1.75} />
            </div>
            
            <p className={styles.dropText}>اسحب الفاتورة هنا</p>
            <p className={styles.subText}>أو انقر لاختيار ملف من جهازك (الحد الأقصى: 10 ميجابايت)</p>
            <p className={styles.subText} style={{ marginTop: '4px', fontWeight: 'bold' }}>PDF / JPG / PNG</p>

            <div className={styles.actionDivider}>أو</div>

            {/* Mobile Camera Capture */}
            <Button
              variant="secondary"
              className="mt-2 flex gap-2 items-center"
              onClick={triggerCameraSelect}
            >
              <Camera className="h-4 w-4" />
              التقاط صورة للفاتورة مباشرة
            </Button>
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])}
        />

        {/* Selected file and Preview block */}
        {file && (
          <div className={`${styles.previewContainer} rs-rise`}>
            <div className={styles.previewHeader}>
              <div className="min-w-0 flex-1 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                  <FileText className="h-5 w-5 text-brand-700" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900 text-sm">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleRemoveFile} 
                className={styles.removeButton}
                title="إزالة الملف"
                disabled={uploadState !== 'idle' && uploadState !== 'done' && uploadState !== 'error'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Render Preview image */}
            {previewUrl ? (
              <div className={styles.imagePreviewWrapper}>
                <img src={previewUrl} alt="معاينة الفاتورة" className={styles.imagePreview} />
              </div>
            ) : (
              <div className={styles.pdfPreviewWrapper}>
                <FileText className="h-10 w-10 text-ink-300" strokeWidth={1.5} />
                <p className="text-sm text-ink-500">
                  ملف PDF — سيتم قراءته واستخراج بياناته أثناء التحليل
                </p>
              </div>
            )}

            {/* Upload trigger button */}
            {uploadState === 'idle' && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button size="lg" className="w-full justify-center" onClick={handleUpload}>
                  حلّل الفاتورة المرفوعة
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Progress Card */}
        {uploadState !== 'idle' && uploadState !== 'error' && (
          <div className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>{getStatusText()}</span>
              <span className={styles.progressPercentage}>{progress}%</span>
            </div>
            
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
            </div>

            <div className={styles.stagesWrapper}>
              <span className={uploadState === 'validating' ? styles.stageActive : ''}>التحقق</span>
              <span className={uploadState === 'compressing' ? styles.stageActive : ''}>الضغط</span>
              <span className={uploadState === 'uploading' ? styles.stageActive : ''}>الرفع</span>
              <span className={uploadState === 'saving' ? styles.stageActive : ''}>التسجيل</span>
              <span className={uploadState === 'analyzing' ? styles.stageActive : ''}>التحليل</span>
            </div>
          </div>
        )}

        {/* Arabic Error Dialog */}
        {error && (
          <div className={`${styles.alert} ${styles.alertError} rs-rise`} role="alert">
            <div className={styles.alertIcon}>
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className={styles.alertContent}>
              <h4 className={styles.alertTitle}>خطأ في معالجة الفاتورة</h4>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {uploadState === 'done' && result && (
          <div className={`${styles.alert} ${styles.alertSuccess} rs-rise`}>
            <div className={styles.alertIcon}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className={styles.alertContent}>
              <h4 className={styles.alertTitle}>تم رفع الفاتورة ومعالجتها بنجاح!</h4>
              <p>يتم الآن نقلك إلى لوحة التحليلات الخاصة بالاستهلاك...</p>
              <ul className={styles.alertDetails}>
                <li><strong>اسم الملف:</strong> {result.file_name}</li>
                <li><strong>الحجم بعد التحسين:</strong> {formatFileSize(result.file_size)}</li>
                <li><strong>الرابط السحابي:</strong> <a href={result.storage_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>معاينة الملف المرفوع</a></li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {uploadState === 'idle' && !file && (
          <Button size="lg" variant="secondary" onClick={onAnalyze}>
            <Sparkles className="h-4 w-4" />
            استخدم فاتورة تجريبية
          </Button>
        )}
      </div>

      <EstimateNote className="mt-8">
        في هذا النموذج الأولي، يتم ضغط الفواتير محلياً وحفظ بياناتها بأمان في قاعدة بيانات السحابية الخاصة بالمشروع.
      </EstimateNote>
    </div>
  );
}
