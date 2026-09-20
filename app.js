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

  const previewSection = document.getElementById('preview-section');
  const imageCanvas = document.getElementById('image-canvas');
  const imageMeta = document.getElementById('image-meta');
  const ctx = imageCanvas.getContext('2d');

  // Filter Buttons
  const filterGrayscale = document.getElementById('filter-grayscale');
  const filterThreshold = document.getElementById('filter-threshold');
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
    grayscale: false,
    threshold: false,
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

  // Drag & Drop
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
    const dt = e.dataTransfer;
    if (dt.files && dt.files[0]) {
      loadImageFromFile(dt.files[0]);
    }
  });

  // Global Paste (Ctrl+V) for instant screenshots
  window.addEventListener('paste', (e) => {
    if (e.clipboardData && e.clipboardData.items) {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          loadImageFromFile(file);
          showToast('تم استيراد الصورة الملصوقة من الحافظة بنجاح!', 'success');
          break;
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

        // Automatic instant OCR trigger
        setTimeout(() => {
          startOcrRecognition();
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

      // Automatic instant OCR trigger
      setTimeout(() => {
        startOcrRecognition();
      }, 400);
    };
    sampleImg.src = sampleCanvas.toDataURL('image/png');
  }

  /* ==========================================================
     3. Image Pre-Processing & Filters (Improves OCR Accuracy)
     ========================================================== */
  function resetFilterState() {
    filters = {
      grayscale: false,
      threshold: false,
      invert: false,
      rotation: 0
    };
    updateFilterButtonUI();
  }

  function updateFilterButtonUI() {
    filterGrayscale.classList.toggle('active', filters.grayscale);
    filterThreshold.classList.toggle('active', filters.threshold);
    filterInvert.classList.toggle('active', filters.invert);
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

    // Apply pixel filters if enabled
    if (filters.grayscale || filters.threshold || filters.invert) {
      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        let r = d[i];
        let g = d[i + 1];
        let b = d[i + 2];

        // Grayscale conversion using luminance formula
        let gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        if (filters.threshold) {
          // Binarization: isolates crisp black text from paper background
          gray = gray > 140 ? 255 : 0;
          r = g = b = gray;
        } else if (filters.grayscale) {
          r = g = b = gray;
        }

        if (filters.invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
      }

      ctx.putImageData(imgData, 0, 0);
    }
  }

  filterGrayscale.addEventListener('click', () => {
    filters.grayscale = !filters.grayscale;
    updateFilterButtonUI();
    renderCanvas();
  });

  filterThreshold.addEventListener('click', () => {
    filters.threshold = !filters.threshold;
    if (filters.threshold) filters.grayscale = true;
    updateFilterButtonUI();
    renderCanvas();
  });

  filterInvert.addEventListener('click', () => {
    filters.invert = !filters.invert;
    updateFilterButtonUI();
    renderCanvas();
  });

  filterRotate.addEventListener('click', () => {
    filters.rotation = (filters.rotation + 90) % 360;
    renderCanvas();
    showToast(`تم تدوير الصورة إلى ${filters.rotation} درجة`, 'info');
  });

  btnResetFilters.addEventListener('click', () => {
    resetFilterState();
    renderCanvas();
    showToast('تمت إعادة ضبط فلاتر الصورة للأصل', 'info');
  });

  /* ==========================================================
     4. OCR Engine Execution (Tesseract.js v5)
     ========================================================== */
  btnStartOcr.addEventListener('click', () => {
    startOcrRecognition();
  });

  async function startOcrRecognition() {
    if (!currentImage || isProcessing) return;

    const selectedLang = ocrLanguage.value;
    const selectedPsm = parseInt(ocrPsm.value, 10);

    isProcessing = true;
    btnStartOcr.setAttribute('disabled', 'true');
    ocrProgressCard.classList.remove('hidden');
    ocrProgressBar.style.width = '5%';
    ocrProgressPercent.textContent = '5%';
    ocrStatusText.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-blue-400"></i> جارٍ الاتصال بمحرك التعرّف...';
    ocrSubStatus.textContent = 'Preparing worker and resources...';

    try {
      showToast('بدأت عملية استخراج النصوص... يرجى الانتظار ثوانٍ', 'info');

      // Execute Tesseract recognition with progress logger
      const result = await Tesseract.recognize(
        imageCanvas,
        selectedLang,
        {
          logger: (progress) => {
            handleOcrProgress(progress);
          }
        }
      );

      // Handle Result
      const extractedText = result.data.text.trim();
      const confidence = Math.round(result.data.confidence || 0);

      if (!extractedText) {
        resultText.value = 'لم يتم العثور على نص واضح في هذه الصورة.\n\nجرّب النصائح التالية:\n1. تأكد من تحديد لغة النص الصحيحة من القائمة.\n2. استخدم زر "عزل النص" أو "رمادي" في شريط الفلاتر.\n3. تأكد من تدوير الصورة بالاتجاه الصحيح.';
        confidenceBadge.classList.add('hidden');
        detectAndRender12DigitNumbers('');
        showToast('لم يتم العثور على نص. راجع نصائح تحسين الصورة!', 'warning');
      } else {
        resultText.value = extractedText;
        confidenceBadge.textContent = `دقة التعرّف: ${confidence}%`;
        confidenceBadge.classList.remove('hidden');

        // Colorize confidence badge
        if (confidence >= 80) {
          confidenceBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        } else if (confidence >= 55) {
          confidenceBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20';
        } else {
          confidenceBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20';
        }

        updateStats();
        autoDetectDirection(extractedText);

        // Detect and display 12-digit number in top-level dedicated card
        const found12Digits = detectAndRender12DigitNumbers(extractedText);
        if (found12Digits.length > 0) {
          showToast(`تم اكتشاف رقم مكون من 12 رقماً (${found12Digits[0]}) في أعلى الصفحة!`, 'success');
          // Smooth scroll to top 12-digit container so it is immediately visible
          setTimeout(() => {
            digit12Container.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        } else {
          showToast(`اكتمل استخراج النص بنجاح! نسبة الدقة المقدرة: ${confidence}%`, 'success');
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
  function handleOcrProgress(m) {
    let statusAr = 'جارٍ معالجة الصورة...';
    const percent = Math.min(100, Math.round((m.progress || 0) * 100));

    if (m.status === 'loading tesseract core') {
      statusAr = 'تحميل نواة المعالج السريع (WebAssembly)...';
    } else if (m.status === 'loading language traineddata') {
      statusAr = 'تحميل قاموس ونموذج اللغة المختارة...';
    } else if (m.status === 'initializing api') {
      statusAr = 'تهيئة محرك القراءة البصرية...';
    } else if (m.status === 'recognizing text') {
      statusAr = `جارٍ استخراج وقراءة النصوص (${percent}%)...`;
    }

    ocrStatusText.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-blue-400"></i> ${statusAr}`;
    ocrProgressPercent.textContent = `${percent}%`;
    ocrProgressBar.style.width = `${percent}%`;
    ocrSubStatus.textContent = `${m.status}: ${(m.progress * 100).toFixed(1)}%`;
  }

  /* ==========================================================
     5. 12-Digit Number Extraction & Rendering
     ========================================================== */
  function normalizeDigits(str) {
    if (!str) return '';
    const arabicIndicMap = {'٠':'0', '١':'1', '٢':'2', '٣':'3', '٤':'4', '٥':'5', '٦':'6', '٧':'7', '٨':'8', '٩':'9'};
    const persianMap = {'۰':'0', '۱':'1', '۲':'2', '۳':'3', '۴':'4', '۵':'5', '۶':'6', '۷':'7', '۸':'8', '۹':'9'};
    return str.replace(/[٠-٩]/g, d => arabicIndicMap[d] || d)
              .replace(/[۰-۹]/g, d => persianMap[d] || d);
  }

  function extract12DigitNumbers(rawText) {
    if (!rawText) return [];
    const text = normalizeDigits(rawText);
    const foundNumbers = new Set();

    // 1. Check for pure 12-digit sequences not attached to longer digits
    const pureMatches = text.match(/(?<!\d)\d{12}(?!\d)/g);
    if (pureMatches) {
      pureMatches.forEach(num => foundNumbers.add(num));
    }

    // 2. Check for 12 digits separated by spaces, dashes, or dots (e.g., 1234 5678 9012 or 1234-5678-9012)
    const tokens = text.split(/[\r\n\t,;،:]+/);
    tokens.forEach(token => {
      const candidates = token.match(/(?:\b|\s|^)(?:[\d\s\-\.\/]{12,24})(?:\b|\s|$)/g);
      if (candidates) {
        candidates.forEach(c => {
          const cleanDigits = c.replace(/\D/g, '');
          if (cleanDigits.length === 12) {
            foundNumbers.add(cleanDigits);
          }
        });
      }
    });

    return Array.from(foundNumbers);
  }

  function detectAndRender12DigitNumbers(text) {
    const numbers = extract12DigitNumbers(text);

    if (!digit12Container || !digit12List) return [];

    if (numbers.length === 0) {
      digit12Container.classList.add('hidden');
      digit12List.innerHTML = '';
      return [];
    }

    digit12Container.classList.remove('hidden');
    digit12CountBadge.textContent = numbers.length === 1 
      ? 'تم العثور على رقم واحد (12 رقماً)' 
      : `تم العثور على ${numbers.length} أرقام (12 رقماً)`;

    digit12List.innerHTML = '';

    numbers.forEach((num, index) => {
      // Format 12 digits as 4 4 4 (e.g. 1234 5678 9012)
      const formatted = num.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');

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
            <span class="text-[11px] text-slate-400 font-mono dir-ltr text-left">
              تنسيق القراءة: ${formatted}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button type="button" class="btn-copy-digit12 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer">
            <i class="fa-regular fa-copy text-sm"></i>
            <span>نسخ الرقم (12)</span>
          </button>
        </div>
      `;

      // Copy Button Event Listener
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

        // Animated Success Feedback
        copyBtn.innerHTML = '<i class="fa-solid fa-check text-emerald-950 text-sm"></i> <span>تم النسخ بنجاح!</span>';
        copyBtn.className = 'btn-copy-digit12 px-4 py-2.5 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-2';
        showToast(`تم نسخ الرقم (${num}) إلى الحافظة!`, 'success');

        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fa-regular fa-copy text-sm"></i> <span>نسخ الرقم (12)</span>';
          copyBtn.className = 'btn-copy-digit12 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer';
        }, 2200);
      });

      digit12List.appendChild(card);
    });

    return numbers;
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
        .then(() => console.log('ServiceWorker registered successfully'))
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
