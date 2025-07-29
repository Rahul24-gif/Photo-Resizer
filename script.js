
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const imageContainer = document.getElementById('image-container');
  const imagePreview = document.getElementById('image-preview');
  const loading = document.getElementById('loading');
  const alertContainer = document.getElementById('alert-container');

  const presets = document.getElementById('presets');
  const widthInput = document.getElementById('width');
  const heightInput = document.getElementById('height');
  const unitInput = document.getElementById('unit');
  const dpiInput = document.getElementById('dpi');
  const maxSizeInput = document.getElementById('maxSize');
  const minSizeInput = document.getElementById('minSize');

  const downloadJpg = document.getElementById('download-jpg');
  const downloadPng = document.getElementById('download-png');
  const downloadPdf = document.getElementById('download-pdf');
  const reset = document.getElementById('reset');
  const previewBtn = document.getElementById('preview-btn');
  const modalPreviewImage = document.getElementById('modal-preview-image');

  let cropper;

  const presetData = [
    { name: 'PAN Card', width: 15, height: 20, maxSize: 15 },
    { name: 'Passport', width: 413, height: 531, dpi: 300, maxSize: 50 },
    { name: 'Aadhar Card', width: 214, height: 214, dpi: 300 },
    { name: 'Voter ID', width: 236, height: 315, dpi: 300 },
    { name: 'Driving License', width: 413, height: 531, dpi: 300 },
  ];

  presetData.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = preset.name;
    presets.appendChild(option);
  });

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
  });

  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showAlert('Please select a valid image file.', 'danger');
      return;
    }

    loading.style.display = 'block';
    dropzone.style.display = 'none';

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imageContainer.style.display = 'block';
      loading.style.display = 'none';

      if (cropper) {
        cropper.destroy();
      }

      cropper = new Cropper(imagePreview, {
        viewMode: 1,
        autoCropArea: 1,
        responsive: true,
      });
    };
    reader.onerror = () => {
      loading.style.display = 'none';
      showAlert('Error reading file.', 'danger');
    };
    reader.readAsDataURL(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    handleFile(file);
  }

  presets.addEventListener('change', (e) => {
    const preset = presetData[e.target.value];
    if (preset) {
      widthInput.value = preset.width;
      heightInput.value = preset.height;
      dpiInput.value = preset.dpi || 72;
      maxSizeInput.value = preset.maxSize || '';
      if (cropper) {
        cropper.setAspectRatio(preset.width / preset.height);
      }
    }
  });

  widthInput.addEventListener('input', updateAspectRatio);
  heightInput.addEventListener('input', updateAspectRatio);

  function updateAspectRatio() {
    if (!cropper) return;
    const width = parseFloat(widthInput.value);
    const height = parseFloat(heightInput.value);

    if (width > 0 && height > 0) {
      cropper.setAspectRatio(width / height);
    } else {
      cropper.setAspectRatio(NaN); // Allow free crop if dimensions are not valid
    }
  }

  function getOutputDimensions() {
    const width = parseFloat(widthInput.value);
    const height = parseFloat(heightInput.value);
    const unit = unitInput.value;
    const dpi = parseFloat(dpiInput.value);

    if (unit === 'cm') {
      return { width: Math.round(((width * 10) / 25.4) * dpi), height: Math.round(((height * 10) / 25.4) * dpi) };
    } else if (unit === 'mm') {
      return { width: Math.round((width / 25.4) * dpi), height: Math.round((height / 25.4) * dpi) };
    } else if (unit === 'in') {
      return { width: Math.round(width * dpi), height: Math.round(height * dpi) };
    }
    return { width, height };
  }

  downloadJpg.addEventListener('click', () => download('jpeg'));
  downloadPng.addEventListener('click', () => download('png'));
  downloadPdf.addEventListener('click', () => {
    if (!cropper) return;
    const { width, height } = getOutputDimensions();
    const canvas = cropper.getCroppedCanvas({ width, height });
    html2canvas(canvas).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();
      pdf.addImage(imgData, 'PNG', 0, 0);
      pdf.save('image.pdf');
    });
  });

  function download(format) {
    if (!cropper) return;
    const { width, height } = getOutputDimensions();
    const maxSize = parseFloat(maxSizeInput.value);
    const minSize = parseFloat(minSizeInput.value);

    let quality = 0.92;
    if (format === 'jpeg' && (maxSize || minSize)) {
      const checkSize = (currentQuality, step, limit) => {
        cropper.getCroppedCanvas({ width, height }).toBlob((blob) => {
          const currentSize = blob.size / 1024;

          if (step > 0.001) { // Prevent infinite loops
            if (maxSize && currentSize > maxSize) {
              checkSize(currentQuality - step, step / 2, limit);
            } else if (minSize && currentSize < minSize) {
              checkSize(currentQuality + step, step / 2, limit);
            } else {
              saveAs(blob, `image.${format}`);
            }
          } else {
            saveAs(blob, `image.${format}`);
          }
        }, `image/${format}`, currentQuality);
      };
      checkSize(quality, 0.5, 20);
    } else {
      cropper.getCroppedCanvas({ width, height }).toBlob((blob) => {
        saveAs(blob, `image.${format}`);
      }, `image/${format}`);
    }
  }

  reset.addEventListener('click', () => {
    if (cropper) {
      cropper.destroy();
    }
    imageContainer.style.display = 'none';
    dropzone.style.display = 'block';
    fileInput.value = '';
    widthInput.value = '';
    heightInput.value = '';
    presets.value = '';
    maxSizeInput.value = '';
  });

  previewBtn.addEventListener('click', () => {
    if (!cropper) return;
    const { width, height } = getOutputDimensions();
    const canvas = cropper.getCroppedCanvas({ width, height });
    modalPreviewImage.src = canvas.toDataURL();
    $('#previewModal').modal('show');
  });

  function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
      ${message}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    `;
    alertContainer.appendChild(alert);
  }
});
