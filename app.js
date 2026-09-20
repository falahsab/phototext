/**
 * Pro OCR Extractor - Application Logic
 * Pure Client-Side OCR Web Application using Tesseract.js v5
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dropZone = document.getElementById('drop-zone');
  const dropZoneEmpty = document.getElementById('drop-zone-empty');
  const fileInput = document.getElementById('file-input');
  const cameraInput = document.getElementById('camera-input');
  const btnTriggerBrowse = document.getElementById('btn-trigger-browse');
  const btnTriggerCamera = document.getElementById('btn-trigger-camera');
  const btnLoadSample = document.getElementById('btn-load-sample');
  const btnLoadReceiverSample = document.getElementById('btn-load-receiver-sample');

  const previewSection = document.getElementById('preview-section');
  const imageCanvas = document.getElementById('image-canvas');
  const imageMeta = document.getElementById('image-meta');
  const ctx = imageCanvas.getContext('2d');

  // Filter Buttons
  const filterAdaptive = document.getElementById('filter-adaptive');
  const filterSharpen = document.getElementById('filter-sharpen');
  const filterGrayscale = document.getElementById('filter-grayscale');
  const filterInvert = document.getElementById('filter-invert');
  const filterRotate = document.getElementById('filter-rotate');
  const btnResetFilters = document.getElementById('btn-reset-filters');

  // OCR Controls
  const ocrLanguage = document.getElementById('ocr-language');
  const ocrPsm = document.getElementById('ocr-psm');
  const btnStartOcr = document.getElementById('btn-start-ocr');
  const ocrProgressCard = document.getElementById('ocr-progress-card');
  const ocrStatusText = document.getElementById('ocr-status-text');
  const ocrProgressPercent = document.getElementById('ocr-progress-percent');
  const ocrProgressBar = document.getElementById('ocr-progress-bar');
  const ocrSubStatus = document.getElementById('ocr-sub-status');

  // Gemini AI Vision Elements
  const btnGeminiVision = document.getElementById('btn-gemini-vision');
  const geminiModal = document.getElementById('gemini-modal');
  const btnCloseGeminiModal = document.getElementById('btn-close-gemini-modal');
  const btnCancelGemini = document.getElementById('btn-cancel-gemini');
  const btnSubmitGemini = document.getElementById('btn-submit-gemini');
  const geminiApiKeyInput = document.getElementById('gemini-api-key');

  // Default Engine Selector Elements
  const engineGemini = document.getElementById('engine-gemini');
  const engineLocal = document.getElementById('engine-local');
  const labelEngineGemini = document.getElementById('label-engine-gemini');
  const labelEngineLocal = document.getElementById('label-engine-local');
  const btnManageApiKey = document.getElementById('btn-manage-api-key');
  const apiKeyStatusText = document.getElementById('api-key-status-text');

  // Text Results & Tools
  const resultText = document.getElementById('result-text');
  const confidenceBadge = document.getElementById('confidence-badge');
  const statWords = document.getElementById('stat-words');
  const statChars = document.getElementById('stat-chars');
  const btnCopyText = document.getElementById('btn-copy-text');
  const btnSpeakText = document.getElementById('btn-speak-text');
  const btnCleanText = document.getElementById('btn-clean-text');
  const btnToggleDir = document.getElementById('btn-toggle-dir');
  const btnClearText = document.getElementById('btn-clear-text');

  // 12-Digit Number Box Elements
  const digit12Container = document.getElementById('digit12-container');
  const digit12List = document.getElementById('digit12-list');
  const digit12CountBadge = document.getElementById('digit12-count-badge');

  // Export Buttons
  const btnDownloadTxt = document.getElementById('btn-download-txt');
  const btnDownloadDoc = document.getElementById('btn-download-doc');
  const btnPrintPdf = document.getElementById('btn-print-pdf');

  // App Controls
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const btnResetAll = document.getElementById('btn-reset-all');
  const btnHelpModal = document.getElementById('btn-help-modal');
  const helpModal = document.getElementById('help-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCloseModal2 = document.getElementById('btn-close-modal-2');
  const btnInstallPwa = document.getElementById('btn-install-pwa');

  // Application State
  let currentImage = null; // Original loaded Image object
  let isProcessing = false;
  let speechUtterance = null;
  let deferredPrompt = null;

  // Filter State
  let filters = {
    adaptive: false,
    sharpen: false,
    grayscale: false,
    invert: false,
    rotation: 0 // 0, 90, 180, 270
  };

  /* ==========================================================
     1. Theme Management (Dark / Light)
     ========================================================== */
  const savedTheme = localStorage.getItem('pro_ocr_theme') || 'dark';
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
    themeIcon.classList.replace('fa-moon', 'fa-sun');
  }

  btnThemeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    if (isDark) {
      themeIcon.classList.replace('fa-sun', 'fa-moon');
      localStorage.setItem('pro_ocr_theme', 'dark');
      showToast('تم تفعيل الوضع الليلي', 'info');
    } else {
      themeIcon.classList.replace('fa-moon', 'fa-sun');
      localStorage.setItem('pro_ocr_theme', 'light');
      showToast('تم تفعيل الوضع النهاري', 'info');
    }
  });

  /* ==========================================================
     2. Image Loading & Input Handlers
     ========================================================== */
  btnTriggerBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  btnTriggerCamera.addEventListener('click', (e) => {
    e.stopPropagation();
    cameraInput.click();
  });

  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      loadImageFromFile(e.target.files[0]);
    }
  });

  cameraInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      loadImageFromFile(e.target.files[0]);
    }
  });

  // Window-level Drag & Drop protection (prevents browser from navigating away if dropped anywhere on page)
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let file of e.dataTransfer.files) {
        if (file.type.startsWith('image/')) {
          loadImageFromFile(file);
          showToast('تم استيراد الصورة المسحوبة بنجاح!', 'success');
          return;
        }
      }
    }
  });

  // DropZone specific styles
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      for (let file of dt.files) {
        if (file.type.startsWith('image/')) {
          loadImageFromFile(file);
          return;
        }
      }
    }
  });

  // Enhanced Global Paste (Ctrl+V) for instant clipboard images
  window.addEventListener('paste', (e) => {
    if (!e.clipboardData) return;

    // 1. Check clipboard files directly
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      for (let file of e.clipboardData.files) {
        if (file.type.startsWith('image/')) {
          loadImageFromFile(file);
          showToast('تم استيراد الصورة الملصوقة من الحافظة بنجاح!', 'success');
          return;
        }
      }
    }

    // 2. Check clipboard items
    if (e.clipboardData.items && e.clipboardData.items.length > 0) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            loadImageFromFile(file);
            showToast('تم استيراد الصورة الملصوقة من الحافظة بنجاح!', 'success');
            return;
          }
        }
      }
    }
  });

  // Load Image File into Memory
  function loadImageFromFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        currentImage = img;
        resetFilterState();
        renderCanvas();
        previewSection.classList.remove('hidden');
        btnStartOcr.removeAttribute('disabled');
        imageMeta.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
        showToast('تم تحميل الصورة بنجاح! جارٍ استخراج النص والرقم تلقائياً...', 'info');

        // Automatic instant OCR trigger according to chosen default engine
        setTimeout(() => {
          triggerAutoOcr();
        }, 400);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Load High-Quality Sample Demo Image (Created dynamically via Canvas)
  btnLoadSample.addEventListener('click', (e) => {
    e.stopPropagation();
    generateSampleImage();
  });

  function generateSampleImage() {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 900;
    sampleCanvas.height = 550;
    const sCtx = sampleCanvas.getContext('2d');

    // Clean background
    sCtx.fillStyle = '#ffffff';
    sCtx.fillRect(0, 0, sampleCanvas.width, sampleCanvas.height);

    // Decorative document header
    sCtx.fillStyle = '#2563eb';
    sCtx.fillRect(40, 40, sampleCanvas.width - 80, 10);

    // Document Titles & Text
    sCtx.textAlign = 'center';
    sCtx.direction = 'rtl';
    
    sCtx.fillStyle = '#0f172a';
    sCtx.font = 'bold 36px Tahoma, Arial';
    sCtx.fillText('بسم الله الرحمن الرحيم', sampleCanvas.width / 2, 110);

    sCtx.fillStyle = '#1e40af';
    sCtx.font = 'bold 28px Tahoma, Arial';
    sCtx.fillText('تقرير استخراج النصوص الذكي (Pro OCR)', sampleCanvas.width / 2, 165);

    sCtx.textAlign = 'right';
    sCtx.fillStyle = '#334155';
    sCtx.font = '22px Tahoma, Arial';
    sCtx.fillText('• التاريخ: سبتمبر 2026', sampleCanvas.width - 70, 230);
    sCtx.fillText('• هذه صورة تجريبية عالية الدقة لاختبار دقة قراءة المحرك.', sampleCanvas.width - 70, 275);
    sCtx.fillText('• يدعم النظام اللغة العربية والانجليزية بكفاءة عالية واحترافية.', sampleCanvas.width - 70, 320);
    
    // 12-digit number demonstration
    sCtx.fillStyle = '#b45309';
    sCtx.font = 'bold 24px Tahoma, Arial';
    sCtx.fillText('• رقم المعاملة / الهوية (12 رقماً): 458920173654', sampleCanvas.width - 70, 365);
    
    sCtx.fillStyle = '#0f172a';
    sCtx.font = 'bold 20px Arial, sans-serif';
    sCtx.direction = 'ltr';
    sCtx.textAlign = 'left';
    sCtx.fillText('English Text: 100% Client-side OCR with Tesseract.js & PWA Support.', 70, 420);
    sCtx.fillText('Fast, Private, Secure and Ready for Mobile & GitHub Pages.', 70, 460);

    // Convert to Image
    const sampleImg = new Image();
    sampleImg.onload = () => {
      currentImage = sampleImg;
      resetFilterState();
      renderCanvas();
      previewSection.classList.remove('hidden');
      btnStartOcr.removeAttribute('disabled');
      imageMeta.textContent = `${sampleImg.naturalWidth} × ${sampleImg.naturalHeight} px`;
      showToast('تم تحميل المستند التجريبي! جارٍ استخراج النص والرقم فوراً...', 'info');

      // Automatic instant OCR trigger according to chosen default engine
      setTimeout(() => {
        triggerAutoOcr();
      }, 400);
    };
    sampleImg.src = sampleCanvas.toDataURL('image/png');
  }

  // Load Receiver / TV Screen Sample Demo Image (The challenging test image uploaded by user)
  if (btnLoadReceiverSample) {
    btnLoadReceiverSample.addEventListener('click', (e) => {
      e.stopPropagation();
      loadReceiverSampleImage();
    });
  }

  function loadReceiverSampleImage() {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      resetFilterState();
      renderCanvas();
      previewSection.classList.remove('hidden');
      btnStartOcr.removeAttribute('disabled');
      imageMeta.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
      showToast('تم تحميل صورة شاشة الرسيفر! جارٍ الفحص المتقدم بالذكاء البصري...', 'info');

      // Automatic instant OCR trigger according to chosen default engine
      setTimeout(() => {
        triggerAutoOcr();
      }, 400);
    };
    img.onerror = () => {
      showToast('تعذر تحميل الصورة التجريبية، يرجى رفع الصورة يدوياً', 'warning');
    };
    img.src = './sample_receiver.png';
  }

  /* ==========================================================
     3. Advanced Image Pre-Processing & Filters (For Low-Quality Images)
     ========================================================== */
  function resetFilterState() {
    filters = {
      adaptive: false,
      sharpen: false,
      grayscale: false,
      invert: false,
      rotation: 0
    };
    updateFilterButtonUI();
  }

  function updateFilterButtonUI() {
    if (filterAdaptive) filterAdaptive.classList.toggle('active', filters.adaptive);
    if (filterSharpen) filterSharpen.classList.toggle('active', filters.sharpen);
    if (filterGrayscale) filterGrayscale.classList.toggle('active', filters.grayscale);
    if (filterInvert) filterInvert.classList.toggle('active', filters.invert);
  }

  // Polarity Detector: Detects if the image/border is dark or colored with light text (e.g. TV screens, OSD popups)
  function detectImagePolarity(canvasCtx, width, height) {
    const imgData = canvasCtx.getImageData(0, 0, width, height);
    const d = imgData.data;
    let totalLum = 0;
    let sampleCount = 0;
    const step = Math.max(1, Math.floor((width * height) / 3000));

    for (let i = 0; i < d.length; i += 4 * step) {
      totalLum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      sampleCount++;
    }
    const avgLum = totalLum / (sampleCount || 1);

    // Sample border pixels specifically (true background)
    let borderLum = 0;
    let borderCount = 0;
    for (let x = 0; x < width; x += 4) {
      const idxTop = (0 * width + x) * 4;
      const idxBot = ((height - 1) * width + x) * 4;
      borderLum += (0.299 * d[idxTop] + 0.587 * d[idxTop + 1] + 0.114 * d[idxTop + 2]);
      borderLum += (0.299 * d[idxBot] + 0.587 * d[idxBot + 1] + 0.114 * d[idxBot + 2]);
      borderCount += 2;
    }
    const avgBorder = borderLum / (borderCount || 1);

    return {
      avgLum,
      avgBorder,
      // If border is dark or medium-dark (under 165), it's light text on dark/colored background
      isDarkBackground: avgBorder < 165 || avgLum < 155
    };
  }

  // 1. Dynamic Contrast Normalizer (Auto Contrast)
  function applyAutoContrast(canvasCtx, width, height) {
    const imgData = canvasCtx.getImageData(0, 0, width, height);
    const d = imgData.data;
    let min = 255;
    let max = 0;

    for (let i = 0; i < d.length; i += 4) {
      const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      if (g < min) min = g;
      if (g > max) max = g;
    }

    const range = max - min || 1;
    if (range > 220 && min < 20) return;

    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, Math.round(((d[i] - min) / range) * 255)));
      d[i + 1] = Math.min(255, Math.max(0, Math.round(((d[i + 1] - min) / range) * 255)));
      d[i + 2] = Math.min(255, Math.max(0, Math.round(((d[i + 2] - min) / range) * 255)));
    }
    canvasCtx.putImageData(imgData, 0, 0);
  }

  // 2. Convolution Sharpening Kernel (Restores blurred WhatsApp and LCD/TV screen edges)
  function applySharpen(canvasCtx, width, height, strength = 3.6) {
    const imgData = canvasCtx.getImageData(0, 0, width, height);
    const d = imgData.data;
    const copy = new Uint8ClampedArray(d);
    const side = (strength - 1) / 4;

    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = (row + x) * 4;
        for (let c = 0; c < 3; c++) {
          const top = copy[((y - 1) * width + x) * 4 + c];
          const bottom = copy[((y + 1) * width + x) * 4 + c];
          const left = copy[(row + (x - 1)) * 4 + c];
          const right = copy[(row + (x + 1)) * 4 + c];
          const center = copy[idx + c];

          const val = center * strength - (top + bottom + left + right) * side;
          d[idx + c] = Math.min(255, Math.max(0, Math.round(val)));
        }
      }
    }
    canvasCtx.putImageData(imgData, 0, 0);
  }

  // 3. Bradley Adaptive Local Thresholding (Erases uneven shadows, wrinkles & camera flash)
  // Supports both Dark-on-Light (paper) and Light-on-Dark (TV screens / OSD popups)
  function applyBradleyAdaptiveThreshold(canvasCtx, width, height, s = 25, t = 0.14, polarity = 'darkOnLight') {
    const imgData = canvasCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const numPixels = width * height;

    const gray = new Uint8Array(numPixels);
    const integral = new Float64Array(numPixels);

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x;
        const dIdx = idx * 4;
        const g = Math.round(0.299 * data[dIdx] + 0.587 * data[dIdx + 1] + 0.114 * data[dIdx + 2]);
        gray[idx] = g;

        const left = x > 0 ? integral[idx - 1] : 0;
        const top = y > 0 ? integral[(y - 1) * width + x] : 0;
        const diag = (x > 0 && y > 0) ? integral[(y - 1) * width + (x - 1)] : 0;
        integral[idx] = g + left + top - diag;
      }
    }

    const s2 = Math.floor(s / 2);
    const factorDark = 1.0 - t;
    const factorLight = 1.0 + t;

    for (let y = 0; y < height; y++) {
      const y1 = Math.max(0, y - s2);
      const y2 = Math.min(height - 1, y + s2);
      const rowOffset = y * width;

      for (let x = 0; x < width; x++) {
        const x1 = Math.max(0, x - s2);
        const x2 = Math.min(width - 1, x + s2);
        const count = (x2 - x1 + 1) * (y2 - y1 + 1);

        const br = integral[y2 * width + x2];
        const bl = x1 > 0 ? integral[y2 * width + (x1 - 1)] : 0;
        const tr = y1 > 0 ? integral[(y1 - 1) * width + x2] : 0;
        const tl = (x1 > 0 && y1 > 0) ? integral[(y1 - 1) * width + (x1 - 1)] : 0;
        const sum = br - bl - tr + tl;

        const idx = rowOffset + x;
        const dIdx = idx * 4;
        
        let isForeground = false;
        if (polarity === 'darkOnLight') {
          // Dark ink on light paper
          isForeground = (gray[idx] * count) <= (sum * factorDark);
        } else {
          // Glowing/white text on dark/blue screen: make the text black ink (0) and background white (255)
          isForeground = (gray[idx] * count) >= (sum * factorLight);
        }

        // Tesseract always requires dark ink (0) on light background (255)
        const val = isForeground ? 0 : 255;
        data[dIdx] = val;
        data[dIdx + 1] = val;
        data[dIdx + 2] = val;
      }
    }
    canvasCtx.putImageData(imgData, 0, 0);
  }

  // 4. Off-Screen Processed Canvas Helper for Multi-Pass OCR with Smart Auto-Upscaling
  function createProcessedCanvas(sourceCanvas, type) {
    const c = document.createElement('canvas');
    
    // Dynamic Super-Resolution Scaling:
    // Small TV screenshots (e.g. 448x323) need at least 3x upscale so 14px digits reach 45-50px!
    const maxDim = Math.max(sourceCanvas.width, sourceCanvas.height);
    let scale = 1.0;
    if (maxDim < 600) {
      scale = 3.2; // 448px -> ~1433px
    } else if (maxDim < 1100) {
      scale = 2.0;
    } else if (maxDim < 1600) {
      scale = 1.4;
    }

    c.width = Math.round(sourceCanvas.width * scale);
    c.height = Math.round(sourceCanvas.height * scale);
    const cCtx = c.getContext('2d');
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';
    cCtx.drawImage(sourceCanvas, 0, 0, c.width, c.height);

    if (type === 'inverted_contrast') {
      // 1. Invert RGB raw values FIRST (White text 255 becomes near 0, dark/blue background becomes light)
      const imgData = cCtx.getImageData(0, 0, c.width, c.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
      cCtx.putImageData(imgData, 0, 0);
      
      // 2. Normalize and stretch contrast (maps text to pure black 0 and background to pure white 255)
      applyAutoContrast(cCtx, c.width, c.height);
      // 3. Sharpen edges
      applySharpen(cCtx, c.width, c.height, 3.8);

    } else if (type === 'adaptive_light_on_dark') {
      // For white/glowing text on TV/receiver blue dialogs
      applyAutoContrast(cCtx, c.width, c.height);
      applySharpen(cCtx, c.width, c.height, 3.2);
      applyBradleyAdaptiveThreshold(cCtx, c.width, c.height, 25, 0.12, 'lightOnDark');

    } else if (type === 'channel_red') {
      // In blue/cyan TV screens, Red channel offers the extreme maximum contrast between white text & blue box!
      const imgData = cCtx.getImageData(0, 0, c.width, c.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        // Red value inverted: White text (R=255) becomes 0 (black), Blue box (R=120) becomes 135
        const rInv = 255 - d[i];
        d[i] = rInv;
        d[i + 1] = rInv;
        d[i + 2] = rInv;
      }
      cCtx.putImageData(imgData, 0, 0);
      applyAutoContrast(cCtx, c.width, c.height);
      applySharpen(cCtx, c.width, c.height, 3.6);

    } else if (type === 'adaptive_dark_on_light') {
      // Standard Bradley for dark text on paper with shadows/creases
      applyAutoContrast(cCtx, c.width, c.height);
      applySharpen(cCtx, c.width, c.height, 3.2);
      applyBradleyAdaptiveThreshold(cCtx, c.width, c.height, 25, 0.14, 'darkOnLight');

    } else if (type === 'upscale_sharpen') {
      // High-resolution scaled with contrast stretch and convolution sharpening
      applyAutoContrast(cCtx, c.width, c.height);
      applySharpen(cCtx, c.width, c.height, 3.4);
    }

    return c;
  }

  function renderCanvas() {
    if (!currentImage) return;

    const rad = (filters.rotation * Math.PI) / 180;
    const isSideways = filters.rotation === 90 || filters.rotation === 270;
    const width = isSideways ? currentImage.naturalHeight : currentImage.naturalWidth;
    const height = isSideways ? currentImage.naturalWidth : currentImage.naturalHeight;

    imageCanvas.width = width;
    imageCanvas.height = height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rad);
    ctx.drawImage(currentImage, -currentImage.naturalWidth / 2, -currentImage.naturalHeight / 2);
    ctx.restore();

    // Apply pixel filters in optimal order
    if (filters.invert) {
      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
      ctx.putImageData(imgData, 0, 0);
    }

    if (filters.grayscale) {
      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        d[i] = d[i + 1] = d[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    if (filters.sharpen) {
      applySharpen(ctx, width, height);
    }

    if (filters.adaptive) {
      applyAutoContrast(ctx, width, height);
      applyBradleyAdaptiveThreshold(ctx, width, height, 25, 0.14, 'darkOnLight');
    }
  }

  if (filterAdaptive) {
    filterAdaptive.addEventListener('click', () => {
      filters.adaptive = !filters.adaptive;
      updateFilterButtonUI();
      renderCanvas();
      showToast(filters.adaptive ? 'تم تفعيل عزل الظلال والتباين الذكي' : 'تم إلغاء عزل الظلال', 'info');
    });
  }

  if (filterSharpen) {
    filterSharpen.addEventListener('click', () => {
      filters.sharpen = !filters.sharpen;
      updateFilterButtonUI();
      renderCanvas();
      showToast(filters.sharpen ? 'تم تفعيل توضيح الحواف الباهتة' : 'تم إلغاء توضيح الحواف', 'info');
    });
  }

  if (filterGrayscale) {
    filterGrayscale.addEventListener('click', () => {
      filters.grayscale = !filters.grayscale;
      updateFilterButtonUI();
      renderCanvas();
    });
  }

  if (filterInvert) {
    filterInvert.addEventListener('click', () => {
      filters.invert = !filters.invert;
      updateFilterButtonUI();
      renderCanvas();
    });
  }

  if (filterRotate) {
    filterRotate.addEventListener('click', () => {
      filters.rotation = (filters.rotation + 90) % 360;
      renderCanvas();
      showToast(`تم تدوير الصورة إلى ${filters.rotation} درجة`, 'info');
    });
  }

  btnResetFilters.addEventListener('click', () => {
    resetFilterState();
    renderCanvas();
    showToast('تمت إعادة ضبط فلاتر الصورة للأصل', 'info');
  });

  /* ==========================================================
     4. Default Engine & Multi-Pass OCR Execution
     ========================================================== */
  function getActiveEngine() {
    return localStorage.getItem('pro_ocr_default_engine') || 'gemini';
  }

  function updateApiKeyStatusUI() {
    const savedKey = localStorage.getItem('pro_ocr_gemini_key');
    if (!apiKeyStatusText) return;
    if (savedKey) {
      apiKeyStatusText.innerHTML = '<span class="text-emerald-400 font-bold">مفتاح Gemini: مفعّل ✓</span> (تعديل)';
    } else {
      apiKeyStatusText.textContent = 'إعداد مفتاح Gemini';
    }
  }

  function updateEngineUI() {
    const activeEngine = getActiveEngine();
    updateApiKeyStatusUI();

    if (activeEngine === 'gemini') {
      if (engineGemini) engineGemini.checked = true;
      if (labelEngineGemini) {
        labelEngineGemini.className = 'cursor-pointer relative flex items-start gap-2.5 p-2.5 rounded-xl border-2 border-purple-500/80 bg-purple-500/10 shadow-sm transition-all select-none';
      }
      if (labelEngineLocal) {
        labelEngineLocal.className = 'cursor-pointer relative flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-all select-none';
      }
      if (btnStartOcr) {
        btnStartOcr.className = 'w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-purple-600/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer';
        btnStartOcr.innerHTML = '<i class="fa-solid fa-brain text-amber-300"></i> <span>فحص الصورة بالذكاء الاصطناعي (Gemini Vision)</span>';
      }
      if (btnGeminiVision) {
        btnGeminiVision.innerHTML = '<i class="fa-solid fa-bolt text-blue-400"></i> <span>أو الفحص بالمحرك المحلي (Tesseract.js)</span>';
      }
    } else {
      if (engineLocal) engineLocal.checked = true;
      if (labelEngineLocal) {
        labelEngineLocal.className = 'cursor-pointer relative flex items-start gap-2.5 p-2.5 rounded-xl border-2 border-blue-500/80 bg-blue-500/10 shadow-sm transition-all select-none';
      }
      if (labelEngineGemini) {
        labelEngineGemini.className = 'cursor-pointer relative flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-all select-none';
      }
      if (btnStartOcr) {
        btnStartOcr.className = 'w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer';
        btnStartOcr.innerHTML = '<i class="fa-solid fa-bolt text-cyan-300"></i> <span>فحص الصورة بالمحرك المحلي (Tesseract.js)</span>';
      }
      if (btnGeminiVision) {
        btnGeminiVision.innerHTML = '<i class="fa-solid fa-brain text-purple-400"></i> <span>أو الفحص بالذكاء الاصطناعي (Gemini Vision)</span>';
      }
    }
  }

  // Initialize Engine UI state on load
  updateEngineUI();

  // Engine Radio Button change listeners
  if (engineGemini) {
    engineGemini.addEventListener('change', () => {
      localStorage.setItem('pro_ocr_default_engine', 'gemini');
      updateEngineUI();
      showToast('تم ضبط الذكاء الاصطناعي (Gemini) كمحرك افتراضي تلقائي!', 'success');
      const savedKey = localStorage.getItem('pro_ocr_gemini_key');
      if (!savedKey) {
        geminiModal.classList.remove('hidden');
        geminiApiKeyInput.focus();
      }
    });
  }

  if (engineLocal) {
    engineLocal.addEventListener('change', () => {
      localStorage.setItem('pro_ocr_default_engine', 'local');
      updateEngineUI();
      showToast('تم ضبط المحرك المحلي (Tesseract) كمحرك افتراضي!', 'info');
    });
  }

  if (btnManageApiKey) {
    btnManageApiKey.addEventListener('click', () => {
      const savedKey = localStorage.getItem('pro_ocr_gemini_key') || '';
      geminiApiKeyInput.value = savedKey;
      geminiModal.classList.remove('hidden');
      geminiApiKeyInput.focus();
    });
  }

  function triggerAutoOcr() {
    if (!currentImage || isProcessing) return;
    const activeEngine = getActiveEngine();

    if (activeEngine === 'gemini') {
      const savedKey = localStorage.getItem('pro_ocr_gemini_key');
      if (savedKey) {
        runGeminiVisionOcr(savedKey);
      } else {
        geminiModal.classList.remove('hidden');
        geminiApiKeyInput.focus();
        showToast('يرجى حفظ مفتاح Gemini API المجاني للبدء بالفحص بالذكاء الاصطناعي', 'info');
      }
    } else {
      startOcrRecognition();
    }
  }

  // Primary Start Button: runs active default engine
  btnStartOcr.addEventListener('click', () => {
    triggerAutoOcr();
  });

  async function startOcrRecognition() {
    if (!currentImage || isProcessing) return;

    const selectedLang = ocrLanguage.value;
    const selectedPsm = parseInt(ocrPsm.value, 10);

    isProcessing = true;
    btnStartOcr.setAttribute('disabled', 'true');
    ocrProgressCard.classList.remove('hidden');
    ocrProgressBar.style.width = '10%';
    ocrProgressPercent.textContent = '10%';
    ocrStatusText.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-blue-400"></i> جارٍ فحص الصورة بالذكاء البصري...';
    ocrSubStatus.textContent = 'تحليل خصائص الإضاءة ونوع الشاشة...';

    try {
      // 1. Analyze image polarity (detects if it's a TV screen/receiver popup with white text on dark/blue)
      const polarity = detectImagePolarity(ctx, imageCanvas.width, imageCanvas.height);
      
      // Determine optimal sequence of passes
      const passPlan = polarity.isDarkBackground
        ? [
            { type: 'inverted_contrast', title: 'المرحلة 1: شاشات التلفزيون والألوان المعكوسة (Inverted High-Contrast)' },
            { type: 'adaptive_light_on_dark', title: 'المرحلة 2: عزل توهج شاشات العرض والتباين الموضعي' },
            { type: 'channel_red', title: 'المرحلة 3: عزل طيف الألوان العالي لشاشات الرسيفر' },
            { type: 'upscale_sharpen', title: 'المرحلة 4: التكبير الفائق وتوضيح الحواف' },
            { type: 'adaptive_dark_on_light', title: 'المرحلة 5: الفحص التكيفي العميق للظلال' }
          ]
        : [
            { type: 'upscale_sharpen', title: 'المرحلة 1: التكبير الفائق وتوضيح الحواف الباهتة' },
            { type: 'adaptive_dark_on_light', title: 'المرحلة 2: إزالة الظلال والتباين التكيفي الموضعي' },
            { type: 'inverted_contrast', title: 'المرحلة 3: فحص الخلفيات المعكوسة والداكنة' },
            { type: 'adaptive_light_on_dark', title: 'المرحلة 4: عزل النصوص المضيئة على خلفيات ملونة' }
          ];

      let extractedText = '';
      let confidence = 0;
      let found12Digits = [];

      // Execute Multi-Pass Pipeline until 12-digit number is discovered
      for (let i = 0; i < passPlan.length; i++) {
        const pass = passPlan[i];
        const passPercent = Math.round(((i + 1) / (passPlan.length + 1)) * 100);

        ocrStatusText.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles fa-spin text-amber-400"></i> ${pass.title}...`;
        ocrSubStatus.textContent = `فحص متقدم (${i + 1} من ${passPlan.length})`;
        ocrProgressBar.style.width = `${Math.max(15, passPercent)}%`;
        ocrProgressPercent.textContent = `${Math.max(15, passPercent)}%`;

        const passCanvas = createProcessedCanvas(imageCanvas, pass.type);

        const passResult = await Tesseract.recognize(
          passCanvas,
          selectedLang,
          {
            logger: (progress) => {
              handleOcrProgress(progress, pass.title);
            }
          }
        );

        const passText = (passResult.data.text || '').trim();
        const passConf = Math.round(passResult.data.confidence || 0);
        const passFound = extract12DigitNumbers(passText);

        if (passText) {
          extractedText = extractedText ? `${extractedText}\n---\n${passText}` : passText;
          confidence = Math.max(confidence, passConf);
        }

        if (passFound.length > 0) {
          found12Digits = passFound;
          break; // Exit multi-pass immediately once the 12-digit number is extracted!
        }
      }

      // Handle Final Result Presentation
      if (!extractedText && found12Digits.length === 0) {
        resultText.value = 'لم يتم العثور على نص واضح في هذه الصورة.\n\nجرّب النصائح التالية:\n1. اضغط على زر "عزل الظلال" أو "توضيح الحواف" في شريط الفلاتر.\n2. تأكد من تدوير الصورة بالاتجاه الصحيح.\n3. أو استخدم زر "فحص فائق بالذكاء الاصطناعي (Gemini)" للصور بالغة الصعوبة.';
        confidenceBadge.classList.add('hidden');
        detectAndRender12DigitNumbers('');
        showToast('لم يتم العثور على نص. استخدم زر عزل الظلال أو فحص الذكاء الاصطناعي!', 'warning');
      } else {
        resultText.value = extractedText;
        confidenceBadge.textContent = `دقة التعرّف: ${confidence}%`;
        confidenceBadge.classList.remove('hidden');

        if (confidence >= 80) {
          confidenceBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        } else if (confidence >= 55) {
          confidenceBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20';
        } else {
          confidenceBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20';
        }

        updateStats();
        autoDetectDirection(extractedText);

        // Display 12-Digit Numbers
        render12DigitCards(found12Digits);

        if (found12Digits.length > 0) {
          showToast(`تم استخراج الرقم بنجاح (${found12Digits[0]}) في أعلى الصفحة!`, 'success');
          setTimeout(() => {
            digit12Container.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        } else {
          showToast(`اكتمل استخراج النص بنجاح! نسبة الدقة المقدرة: ${confidence}%`, 'info');
        }
      }

      ocrProgressPercent.textContent = '100%';
      ocrProgressBar.style.width = '100%';
      ocrStatusText.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> اكتملت المعالجة بنجاح!';
      ocrSubStatus.textContent = 'Finished successfully';

    } catch (err) {
      console.error('OCR Error:', err);
      showToast('حدث خطأ أثناء استخراج النص: ' + (err.message || 'خطأ غير معروف'), 'error');
      ocrStatusText.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-rose-400"></i> تعذر إكمال المعالجة';
    } finally {
      isProcessing = false;
      btnStartOcr.removeAttribute('disabled');
      setTimeout(() => {
        ocrProgressCard.classList.add('hidden');
      }, 3500);
    }
  }

  // Arabic Friendly Progress Translator
  function handleOcrProgress(m, stagePrefix = '') {
    let statusAr = 'جارٍ معالجة الصورة...';
    const percent = Math.min(100, Math.round((m.progress || 0) * 100));

    if (m.status === 'loading tesseract core') {
      statusAr = 'تحميل نواة المعالج السريع (WebAssembly)...';
    } else if (m.status === 'loading language traineddata') {
      statusAr = 'تحميل قاموس ونموذج اللغة المختارة...';
    } else if (m.status === 'initializing api') {
      statusAr = 'تهيئة محرك القراءة البصرية...';
    } else if (m.status === 'recognizing text') {
      statusAr = `${stagePrefix ? stagePrefix + ': ' : ''}استخراج وقراءة النصوص (${percent}%)...`;
    }

    ocrStatusText.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-blue-400"></i> ${statusAr}`;
    ocrProgressPercent.textContent = `${percent}%`;
    ocrProgressBar.style.width = `${percent}%`;
    ocrSubStatus.textContent = `${m.status}: ${(m.progress * 100).toFixed(1)}%`;
  }

  /* ==========================================================
     5. 12-Digit Number Extraction, Character Healing & Rendering
     ========================================================== */
  function normalizeDigits(str) {
    if (!str) return '';
    const arabicIndicMap = {'٠':'0', '١':'1', '٢':'2', '٣':'3', '٤':'4', '٥':'5', '٦':'6', '٧':'7', '٨':'8', '٩':'9'};
    const persianMap = {'۰':'0', '۱':'1', '۲':'2', '۳':'3', '۴':'4', '۵':'5', '۶':'6', '۷':'7', '۸':'8', '۹':'9'};
    return str.replace(/[٠-٩]/g, d => arabicIndicMap[d] || d)
              .replace(/[۰-۹]/g, d => persianMap[d] || d);
  }

  // Global map tracking receiver suffixes (e.g., -1618 for card 240411451232)
  let digitSuffixMap = {};

  // Expanded lookalike map for fuzzy character confusion in blurry / LCD / TV screen images
  const ocrDigitFixMap = {
    'O': '0', 'o': '0', 'D': '0', 'Q': '0', 'C': '0', 'U': '0',
    'l': '1', 'I': '1', 'i': '1', '|': '1', '!': '1', '[': '1', ']': '1', '/': '1', '\\': '1',
    'Z': '2', 'z': '2',
    'E': '3',
    'A': '4', 'a': '4', 'h': '4',
    'S': '5', 's': '5', '$': '5',
    'b': '6', 'G': '6',
    'T': '7', 't': '7',
    'B': '8', '&': '8',
    'g': '9', 'q': '9'
  };

  function healOcrCandidate(candidate) {
    if (!candidate) return null;
    let digitsCount = 0;
    let healed = '';

    for (let char of candidate) {
      if (/\d/.test(char)) {
        healed += char;
        digitsCount++;
      } else if (ocrDigitFixMap[char]) {
        healed += ocrDigitFixMap[char];
      }
    }

    // Must result in exactly 12 digits, and at least 7 must have been real original digits
    if (healed.length === 12 && digitsCount >= 7) {
      return healed;
    }
    return null;
  }

  function extract12DigitNumbers(rawText) {
    if (!rawText) return [];
    const text = normalizeDigits(rawText);
    const foundNumbers = new Set();
    digitSuffixMap = {};

    // 1. Check for 12 digits followed by receiver suffix (e.g. 240411451232-1618 or 240411451232 1618)
    const suffixMatches = text.match(/(?<!\d)(\d{12})([\s\-_/:]+\d{2,6})(?!\d)/g);
    if (suffixMatches) {
      suffixMatches.forEach(m => {
        const parts = m.match(/(?<!\d)(\d{12})([\s\-_/:]+\d{2,6})(?!\d)/);
        if (parts) {
          const num = parts[1];
          const suf = parts[2].trim();
          foundNumbers.add(num);
          digitSuffixMap[num] = suf;
        }
      });
    }

    // 2. Check for pure continuous 12-digit sequence
    const pureMatches = text.match(/(?<!\d)\d{12}(?!\d)/g);
    if (pureMatches) {
      pureMatches.forEach(num => foundNumbers.add(num));
    }

    // 3. Check for 12 digits formatted with spaces/dashes (e.g. 2404 1145 1232 or 2404-1145-1232)
    const formattedMatches = text.match(/(?<!\d)(\d{4}[\s\-_.]\d{4}[\s\-_.]\d{4})(?!\d)/g);
    if (formattedMatches) {
      formattedMatches.forEach(fm => {
        const clean = fm.replace(/\D/g, '');
        if (clean.length === 12) {
          foundNumbers.add(clean);
        }
      });
    }

    // 4. Check for joined receiver stream where serial + check digits were fused (e.g. 2404114512321618)
    const joinedMatches = text.match(/(?<!\d)(\d{12})(\d{3,6})(?!\d)/g);
    if (joinedMatches) {
      joinedMatches.forEach(jm => {
        const num = jm.slice(0, 12);
        const suf = '-' + jm.slice(12);
        foundNumbers.add(num);
        if (!digitSuffixMap[num]) {
          digitSuffixMap[num] = suf;
        }
      });
    }

    // 5. Line/token partition check
    const tokens = text.split(/[\r\n\t,;،:]+/);
    tokens.forEach(token => {
      const candidates = token.match(/(?:\b|\s|^)(?:[\d\s\-\.\/]{12,28})(?:\b|\s|$)/g);
      if (candidates) {
        candidates.forEach(c => {
          const d12 = c.match(/(?<!\d)(\d{12})(?!\d)/);
          if (d12) {
            foundNumbers.add(d12[1]);
          } else {
            const cleanDigits = c.replace(/\D/g, '');
            if (cleanDigits.length === 12) {
              foundNumbers.add(cleanDigits);
            } else if (cleanDigits.length >= 14 && cleanDigits.length <= 18) {
              const num = cleanDigits.slice(0, 12);
              foundNumbers.add(num);
              if (!digitSuffixMap[num]) {
                digitSuffixMap[num] = '-' + cleanDigits.slice(12);
              }
            }
          }
        });
      }
    });

    // 6. Smart Fuzzy OCR Healing for noisy/blurry/LCD text where 1-4 digits were misread as letters
    const fuzzyCandidates = text.match(/[A-Za-z0-9\-\s\.\/]{11,28}/g);
    if (fuzzyCandidates) {
      fuzzyCandidates.forEach(cand => {
        const cleaned = cand.replace(/[\s\-\.\/]/g, '');
        const healed12 = healOcrCandidate(cleaned.slice(0, 12));
        if (healed12) {
          foundNumbers.add(healed12);
          if (cleaned.length > 12 && !digitSuffixMap[healed12]) {
            digitSuffixMap[healed12] = '-' + cleaned.slice(12);
          }
        }
        if (cleaned.length === 12) {
          const healed = healOcrCandidate(cleaned);
          if (healed) foundNumbers.add(healed);
        }
      });
    }

    return Array.from(foundNumbers);
  }

  function detectAndRender12DigitNumbers(text) {
    const numbers = extract12DigitNumbers(text);
    render12DigitCards(numbers);
    return numbers;
  }

  function render12DigitCards(numbers) {
    if (!digit12Container || !digit12List) return;

    if (!numbers || numbers.length === 0) {
      digit12Container.classList.add('hidden');
      digit12List.innerHTML = '';
      return;
    }

    digit12Container.classList.remove('hidden');
    digit12CountBadge.textContent = numbers.length === 1 
      ? 'تم العثور على رقم واحد (12 رقماً)' 
      : `تم العثور على ${numbers.length} أرقام (12 رقماً)`;

    digit12List.innerHTML = '';

    numbers.forEach((num, index) => {
      const formatted = num.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
      const suffix = digitSuffixMap[num] || '';
      const fullCode = num + suffix;

      const card = document.createElement('div');
      card.className = 'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/95 border border-amber-500/40 shadow-md transition-all hover:border-amber-400';

      card.innerHTML = `
        <div class="flex items-center gap-3 overflow-hidden">
          <span class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/30 shrink-0">
            #${index + 1}
          </span>
          <div class="flex flex-col">
            <span class="digit12-text font-mono font-black text-xl sm:text-2xl tracking-widest text-amber-300 select-all dir-ltr text-left">
              ${num}
            </span>
            ${suffix ? `
              <span class="text-[11px] text-amber-400/90 font-mono dir-ltr text-left flex items-center gap-1 mt-0.5">
                <i class="fa-solid fa-satellite-dish text-xs text-amber-400"></i>
                <span>ملحق الكود: <strong>${suffix}</strong> | الكود الكامل: <strong>${fullCode}</strong></span>
              </span>
            ` : ''}
            <span class="text-[11px] text-slate-400 font-mono dir-ltr text-left">
              تنسيق القراءة: ${formatted}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
          <button type="button" class="btn-copy-digit12 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer">
            <i class="fa-regular fa-copy text-sm"></i>
            <span>نسخ الرقم (12)</span>
          </button>
          ${suffix ? `
            <button type="button" class="btn-copy-full px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer" title="نسخ الكود كاملاً مع الملحق">
              <i class="fa-solid fa-copy text-xs"></i>
              <span>نسخ مع الملحق</span>
            </button>
          ` : ''}
        </div>
      `;

      // Copy 12-Digit Button
      const copyBtn = card.querySelector('.btn-copy-digit12');
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(num);
        } catch (e) {
          const dummy = document.createElement('textarea');
          dummy.value = num;
          document.body.appendChild(dummy);
          dummy.select();
          document.execCommand('copy');
          document.body.removeChild(dummy);
        }

        copyBtn.innerHTML = '<i class="fa-solid fa-check text-emerald-950 text-sm"></i> <span>تم النسخ!</span>';
        copyBtn.className = 'btn-copy-digit12 px-4 py-2.5 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-2';
        showToast(`تم نسخ الرقم (${num}) إلى الحافظة!`, 'success');

        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fa-regular fa-copy text-sm"></i> <span>نسخ الرقم (12)</span>';
          copyBtn.className = 'btn-copy-digit12 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer';
        }, 2200);
      });

      // Copy Full Code with Suffix (if available)
      const copyFullBtn = card.querySelector('.btn-copy-full');
      if (copyFullBtn) {
        copyFullBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(fullCode);
          } catch (e) {
            const dummy = document.createElement('textarea');
            dummy.value = fullCode;
            document.body.appendChild(dummy);
            dummy.select();
            document.execCommand('copy');
            document.body.removeChild(dummy);
          }

          copyFullBtn.innerHTML = '<i class="fa-solid fa-check text-emerald-400 text-xs"></i> <span>تم النسخ!</span>';
          showToast(`تم نسخ الكود كاملاً (${fullCode})!`, 'success');

          setTimeout(() => {
            copyFullBtn.innerHTML = '<i class="fa-solid fa-copy text-xs"></i> <span>نسخ مع الملحق</span>';
          }, 2200);
        });
      }

      digit12List.appendChild(card);
    });
  }

  /* ==========================================================
     Gemini AI Vision Integration (Ultra-HD Option for Extreme Images)
     ========================================================== */
  if (btnGeminiVision) {
    btnGeminiVision.addEventListener('click', () => {
      if (!currentImage) {
        showToast('يرجى استيراد صورة أولاً لاستخراج النصوص منها!', 'warning');
        return;
      }
      const activeEngine = getActiveEngine();
      if (activeEngine === 'gemini') {
        // Run Alternative: Local Tesseract Engine
        showToast('تشغيل الفحص بالمحرك المحلي (Tesseract.js)...', 'info');
        startOcrRecognition();
      } else {
        // Run Alternative: Gemini AI Vision Engine
        const savedKey = localStorage.getItem('pro_ocr_gemini_key');
        if (savedKey) {
          runGeminiVisionOcr(savedKey);
        } else {
          geminiModal.classList.remove('hidden');
          geminiApiKeyInput.focus();
        }
      }
    });
  }

  if (btnCloseGeminiModal) {
    btnCloseGeminiModal.addEventListener('click', () => geminiModal.classList.add('hidden'));
  }
  if (btnCancelGemini) {
    btnCancelGemini.addEventListener('click', () => geminiModal.classList.add('hidden'));
  }

  if (btnSubmitGemini) {
    btnSubmitGemini.addEventListener('click', () => {
      const key = geminiApiKeyInput.value.trim();
      if (!key) {
        showToast('يرجى إدخال مفتاح Google Gemini API صالح', 'warning');
        return;
      }
      localStorage.setItem('pro_ocr_gemini_key', key);
      updateEngineUI();
      geminiModal.classList.add('hidden');
      showToast('تم حفظ مفتاح Gemini API بنجاح! جارٍ فحص الصورة...', 'success');
      runGeminiVisionOcr(key);
    });
  }

  async function runGeminiVisionOcr(apiKey) {
    if (!currentImage || isProcessing) return;

    isProcessing = true;
    ocrProgressCard.classList.remove('hidden');
    ocrProgressBar.style.width = '20%';
    ocrProgressPercent.textContent = '20%';
    ocrStatusText.innerHTML = '<i class="fa-solid fa-brain fa-spin text-purple-400"></i> جارٍ فحص الصورة بنموذج Gemini Vision الخارق...';
    ocrSubStatus.textContent = 'Analyzing degraded image using Multimodal Vision AI...';
    showToast('بدأ الفحص الخارق بالذكاء الاصطناعي (Gemini Vision)...', 'info');

    try {
      const base64Data = imageCanvas.toDataURL('image/jpeg', 0.92).split(',')[1];
      const mimeType = 'image/jpeg';

      ocrProgressBar.style.width = '55%';
      ocrProgressPercent.textContent = '55%';

      const prompt = 'You are an advanced OCR engine. Extract ALL text from this image accurately. Look specifically for any 12-digit number (such as an ID number, serial number, voucher, or card number). Output the 12-digit number clearly, and then the rest of the text.';

      let parsedResult = null;
      let lastError = null;
      // Google Gemini active vision models in priority order
      const modelsToTry = [
        'gemini-3.6-flash',
        'gemini-3.7-flash',
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash'
      ];

      for (const model of modelsToTry) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: base64Data } }
                ]
              }]
            })
          });

          const rawText = await res.text();
          let jsonBody = null;
          try {
            jsonBody = JSON.parse(rawText);
          } catch (jsonErr) {
            if (rawText.trim().startsWith('<')) {
              throw new Error('تم استلام صفحة ويب HTML بدلاً من رد JSON (يرجى عمل إعادة تحميل للصفحة Ctrl+F5 لتحديث الكاش أو التحقق من الشبكة).');
            }
            throw new Error(`خطأ في صيغة الرد: ${rawText.slice(0, 80)}`);
          }

          if (res.ok && jsonBody) {
            parsedResult = jsonBody;
            break;
          } else {
            lastError = jsonBody?.error?.message || `HTTP error ${res.status}`;
            if (lastError.includes('no longer available') || lastError.includes('not found') || res.status === 404) {
              continue; // Try next model
            } else {
              throw new Error(lastError);
            }
          }
        } catch (e) {
          if (e.message && (e.message.includes('no longer available') || e.message.includes('not found'))) {
            continue;
          }
          throw e;
        }
      }

      if (!parsedResult) {
        throw new Error(lastError || 'تعذر الاتصال بنماذج Google Gemini');
      }

      const data = parsedResult;
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      if (!aiText) {
        showToast('لم يسترجع الذكاء الاصطناعي أي نص من الصورة', 'warning');
      } else {
        resultText.value = aiText;
        confidenceBadge.textContent = 'دقة الذكاء الاصطناعي: 100%';
        confidenceBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40';
        confidenceBadge.classList.remove('hidden');

        updateStats();
        autoDetectDirection(aiText);

        const found = detectAndRender12DigitNumbers(aiText);
        if (found.length > 0) {
          showToast(`تم استخراج الرقم (${found[0]}) بنجاح بواسطة الذكاء الاصطناعي!`, 'success');
          setTimeout(() => {
            digit12Container.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        } else {
          showToast('اكتمل فحص الصورة بنجاح بواسطة الذكاء الاصطناعي!', 'success');
        }
      }

      ocrProgressPercent.textContent = '100%';
      ocrProgressBar.style.width = '100%';
      ocrStatusText.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> اكتمل فحص الذكاء الاصطناعي بنجاح!';
      ocrSubStatus.textContent = 'Gemini Vision finished successfully';

    } catch (err) {
      console.error('Gemini Vision Error:', err);
      showToast('خطأ في فحص الذكاء الاصطناعي: ' + (err.message || 'تأكد من صحة المفتاح والاتصال'), 'error');
      ocrStatusText.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-rose-400"></i> فشل فحص الذكاء الاصطناعي';
      if (err.message && (err.message.includes('API_KEY_INVALID') || err.message.includes('key'))) {
        localStorage.removeItem('pro_ocr_gemini_key');
      }
    } finally {
      isProcessing = false;
      btnStartOcr.removeAttribute('disabled');
      setTimeout(() => {
        ocrProgressCard.classList.add('hidden');
      }, 3500);
    }
  }

  /* ==========================================================
     6. Text Tools, Stats, TTS & Editing
     ========================================================== */
  resultText.addEventListener('input', () => {
    updateStats();
    detectAndRender12DigitNumbers(resultText.value);
  });

  function updateStats() {
    const text = resultText.value.trim();
    if (!text) {
      statWords.textContent = '0 كلمة';
      statChars.textContent = '0 حرف';
      return;
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    statWords.textContent = `${words} كلمة`;
    statChars.textContent = `${chars} حرف`;
  }

  function autoDetectDirection(text) {
    const arabicRegex = /[\u0600-\u06FF]/;
    if (arabicRegex.test(text)) {
      resultText.setAttribute('dir', 'rtl');
    } else {
      resultText.setAttribute('dir', 'ltr');
    }
  }

  btnToggleDir.addEventListener('click', () => {
    const currentDir = resultText.getAttribute('dir');
    const newDir = currentDir === 'rtl' ? 'ltr' : 'rtl';
    resultText.setAttribute('dir', newDir);
    showToast(`تم تغيير اتجاه النص إلى ${newDir.toUpperCase()}`, 'info');
  });

  btnCleanText.addEventListener('click', () => {
    let t = resultText.value;
    if (!t) return;
    // Remove consecutive empty lines & trim whitespace on each line
    t = t.split('\n')
         .map(line => line.trim())
         .filter((line, idx, arr) => line !== '' || (idx > 0 && arr[idx - 1] !== ''))
         .join('\n')
         .replace(/[ \t]+/g, ' '); // remove multiple spaces
    resultText.value = t;
    updateStats();
    detectAndRender12DigitNumbers(t);
    showToast('تم تنظيف وتنسيق النص المستخرج بنجاح', 'success');
  });

  btnCopyText.addEventListener('click', async () => {
    const text = resultText.value;
    if (!text) {
      showToast('لا يوجد نص لنسخه بعد!', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('تم نسخ النص إلى الحافظة بنجاح!', 'success');
    } catch (err) {
      resultText.select();
      document.execCommand('copy');
      showToast('تم نسخ النص بنجاح!', 'success');
    }
  });

  btnClearText.addEventListener('click', () => {
    if (!resultText.value) return;
    if (confirm('هل أنت متأكد من مسح النص المستخرج؟')) {
      resultText.value = '';
      confidenceBadge.classList.add('hidden');
      detectAndRender12DigitNumbers('');
      updateStats();
      if (speechSynthesis.speaking) speechSynthesis.cancel();
      showToast('تم مسح النص', 'info');
    }
  });

  // Text-To-Speech (Speech Synthesis)
  btnSpeakText.addEventListener('click', () => {
    const text = resultText.value.trim();
    if (!text) {
      showToast('لا يوجد نص للاستماع إليه!', 'warning');
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      btnSpeakText.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>استماع</span>';
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const isArabic = /[\u0600-\u06FF]/.test(text);
    utterance.lang = isArabic ? 'ar-SA' : 'en-US';
    utterance.rate = 0.95;

    utterance.onstart = () => {
      btnSpeakText.innerHTML = '<i class="fa-solid fa-stop"></i> <span>إيقاف</span>';
    };

    utterance.onend = utterance.onerror = () => {
      btnSpeakText.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>استماع</span>';
    };

    window.speechSynthesis.speak(utterance);
  });

  /* ==========================================================
     6. Exporting (TXT, Word DOC, Print/PDF)
     ========================================================== */
  btnDownloadTxt.addEventListener('click', () => {
    const text = resultText.value;
    if (!text) {
      showToast('لا يوجد نص لتنزيله!', 'warning');
      return;
    }
    // \ufeff adds UTF-8 BOM so Notepad displays Arabic correctly
    const blob = new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, 'pro-ocr-extracted-text.txt');
    showToast('تم تنزيل الملف النصي بنجاح!', 'success');
  });

  btnDownloadDoc.addEventListener('click', () => {
    const text = resultText.value;
    if (!text) {
      showToast('لا يوجد نص لتصديره!', 'warning');
      return;
    }
    // Formatted Word HTML with RTL support
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>المستند المستخرج</title>
        <style>
          body { font-family: 'Arial', 'Tahoma', sans-serif; font-size: 14pt; line-height: 1.8; direction: rtl; text-align: right; }
          .header { font-size: 18pt; font-weight: bold; color: #2563eb; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">النص المستخرج بواسطة Pro OCR Extractor</div>
        <p>${text.replace(/\n/g, '<br/>')}</p>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
    downloadBlob(blob, 'pro-ocr-document.doc');
    showToast('تم تصدير مستند Word بنجاح!', 'success');
  });

  btnPrintPdf.addEventListener('click', () => {
    if (!resultText.value) {
      showToast('لا يوجد نص للطباعة بعد!', 'warning');
      return;
    }
    window.print();
  });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ==========================================================
     7. Reset All & Modal Handlers
     ========================================================== */
  btnResetAll.addEventListener('click', () => {
    if (confirm('هل تريد إعادة تعيين الأداة بالكامل وإفراغ الصورة والنصوص؟')) {
      currentImage = null;
      fileInput.value = '';
      cameraInput.value = '';
      ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
      previewSection.classList.add('hidden');
      btnStartOcr.setAttribute('disabled', 'true');
      resultText.value = '';
      confidenceBadge.classList.add('hidden');
      detectAndRender12DigitNumbers('');
      updateStats();
      resetFilterState();
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
      showToast('تمت إعادة ضبط كل شيء للبدء من جديد', 'info');
    }
  });

  btnHelpModal.addEventListener('click', () => helpModal.classList.remove('hidden'));
  btnCloseModal.addEventListener('click', () => helpModal.classList.add('hidden'));
  btnCloseModal2.addEventListener('click', () => helpModal.classList.add('hidden'));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.add('hidden');
  });

  /* ==========================================================
     8. PWA, Mobile Installation & WhatsApp Share Handling
     ========================================================== */
  async function checkSharedImage() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('shared') === '1') {
      window.history.replaceState({}, document.title, window.location.pathname);

      try {
        const cache = await caches.open('pro-ocr-shared-data');
        const response = await cache.match('shared-image-transfer');
        if (response) {
          const blob = await response.blob();
          await cache.delete('shared-image-transfer');
          loadImageFromFile(blob);
          showToast('تم استلام الصورة المشتركة من واتساب بنجاح! جارٍ استخراج النص والرقم...', 'success');
        }
      } catch (err) {
        console.error('Error loading shared image from cache:', err);
      }
    }
  }

  // Check for shared image on app load
  checkSharedImage();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstallPwa.classList.remove('hidden');
    btnInstallPwa.classList.add('inline-flex');
  });

  btnInstallPwa.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('شكراً لتثبيت التطبيق على جهازك!', 'success');
    }
    deferredPrompt = null;
    btnInstallPwa.classList.add('hidden');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => {
          console.log('ServiceWorker registered successfully');
          reg.update();
        })
        .catch(err => console.log('ServiceWorker registration error:', err));
    });
  }

  /* ==========================================================
     9. Modern Toast Notifications
     ========================================================== */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let bgColors = 'bg-slate-850 text-slate-100 border-slate-700';
    let icon = '<i class="fa-solid fa-circle-info text-blue-400"></i>';

    if (type === 'success') {
      bgColors = 'bg-emerald-950/90 text-emerald-100 border-emerald-500/30';
      icon = '<i class="fa-solid fa-circle-check text-emerald-400"></i>';
    } else if (type === 'warning') {
      bgColors = 'bg-amber-950/90 text-amber-100 border-amber-500/30';
      icon = '<i class="fa-solid fa-triangle-exclamation text-amber-400"></i>';
    } else if (type === 'error') {
      bgColors = 'bg-rose-950/90 text-rose-100 border-rose-500/30';
      icon = '<i class="fa-solid fa-circle-xmark text-rose-400"></i>';
    }

    toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-xl backdrop-blur-md text-xs font-semibold max-w-sm sm:max-w-md ${bgColors} toast-enter`;
    toast.innerHTML = `${icon} <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  }

});
