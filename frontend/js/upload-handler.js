/**
 * Upload Handler
 * Manages CSV file upload and preview functionality
 */

let selectedFile;
let parsedRecipients = [];

/**
 * Initialize upload functionality on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeUploadHandler();
});

/**
 * Initialize upload handler
 */
function initializeUploadHandler() {
    const fileInput = document.getElementById('csv-file');
    const fileLabel = document.querySelector('.file-input-label');
    const uploadBtn = document.getElementById('upload-btn');
    const clearBtn = document.getElementById('clear-btn');

    // File input change event
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    fileLabel.addEventListener('dragover', handleDragOver);
    fileLabel.addEventListener('dragleave', handleDragLeave);
    fileLabel.addEventListener('drop', handleFileDrop);

    // Upload button
    if (uploadBtn) {
        uploadBtn.addEventListener('click', handleUpload);
    }

    // Clear button
    if (clearBtn) {
        clearBtn.addEventListener('click', clearUpload);
    }
}

/**
 * Handle file selection from input
 * @param {Event} event - Change event
 */
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

/**
 * Handle drag over
 * @param {Event} event - Dragover event
 */
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#4f46e5';
    event.currentTarget.style.background = 'rgba(79, 70, 229, 0.1)';
}

/**
 * Handle drag leave
 * @param {Event} event - Dragleave event
 */
function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#e2e8f0';
    event.currentTarget.style.background = '#f8fafc';
}

/**
 * Handle file drop
 * @param {Event} event - Drop event
 */
function handleFileDrop(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#e2e8f0';
    event.currentTarget.style.background = '#f8fafc';

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const fileInput = document.getElementById('csv-file');
        fileInput.files = files;
        processFile(files[0]);
    }
}

/**
 * Process selected file
 * @param {File} file - Selected file
 */
function processFile(file) {
    // Validate file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showNotification('Please select a valid CSV file', 'error');
        return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification('File size exceeds 10MB limit', 'error');
        return;
    }

    selectedFile = file;

    // Display file info
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-size').textContent = formatBytes(file.size);
    document.getElementById('file-info').style.display = 'block';

    // Read file and preview
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const csvContent = event.target.result;
            parsedRecipients = parseCSV(csvContent);

            if (parsedRecipients.length === 0) {
                showNotification('CSV file is empty or invalid', 'warning');
                return;
            }

            // Show preview
            displayCSVPreview(parsedRecipients);

            // Enable upload button
            document.getElementById('upload-btn').disabled = false;
        } catch (error) {
            showNotification('Error parsing CSV file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

/**
 * Display CSV preview in table
 * @param {Array} recipients - Array of recipient objects
 */
function displayCSVPreview(recipients) {
    const previewSection = document.getElementById('csv-preview');
    const previewHead = document.getElementById('preview-head');
    const previewBody = document.getElementById('preview-body');
    const previewInfo = document.getElementById('preview-info');

    // Get column headers
    const headers = Object.keys(recipients[0] || {});

    // Create header row
    previewHead.innerHTML = '';
    headers.forEach((header) => {
        const th = document.createElement('th');
        th.textContent = header;
        previewHead.appendChild(th);
    });

    // Create body rows (show first 10 rows)
    previewBody.innerHTML = '';
    const rowsToShow = Math.min(recipients.length, 10);
    for (let i = 0; i < rowsToShow; i++) {
        const row = document.createElement('tr');
        headers.forEach((header) => {
            const td = document.createElement('td');
            td.textContent = recipients[i][header] || '';
            row.appendChild(td);
        });
        previewBody.appendChild(row);
    }

    // Show info
    const message =
        recipients.length > 10
            ? `Showing 10 of ${recipients.length} recipients`
            : `Total: ${recipients.length} recipients`;
    previewInfo.textContent = message;

    previewSection.style.display = 'block';
}

/**
 * Handle file upload
 */
async function handleUpload() {
    if (!selectedFile) {
        showNotification('Please select a file', 'warning');
        return;
    }

    const uploadBtn = document.getElementById('upload-btn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('recipients', JSON.stringify(parsedRecipients));

        const response = await fetch(API_ENDPOINTS.EMAIL_UPLOAD_CSV, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
        }

        const data = await response.json();

        // Show success message
        showStatusMessage(
            `✅ Successfully uploaded ${parsedRecipients.length} recipients!`,
            'success'
        );
        showNotification('File uploaded successfully', 'success');
    } catch (error) {
        console.error('Upload error:', error);
        showStatusMessage('❌ Upload failed: ' + error.message, 'error');
        showNotification('Upload failed', 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Recipients';
    }
}

/**
 * Clear upload form
 */
function clearUpload() {
    document.getElementById('csv-file').value = '';
    selectedFile = null;
    parsedRecipients = [];

    document.getElementById('file-info').style.display = 'none';
    document.getElementById('csv-preview').style.display = 'none';
    document.getElementById('upload-status').innerHTML = '';

    document.getElementById('upload-btn').disabled = true;

    showNotification('Form cleared', 'info', 2000);
}

/**
 * Show status message
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'success', 'error'
 */
function showStatusMessage(message, type) {
    const statusDiv = document.getElementById('upload-status');
    statusDiv.className = `status-message ${type}`;
    statusDiv.innerHTML = message;
    statusDiv.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}
