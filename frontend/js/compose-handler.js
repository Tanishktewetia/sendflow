/**
 * Compose Handler
 * Manages email composition and sending functionality
 */

// Email selector modal instance
let emailSelectorModal = null;

// Selected emails for sending
let selectedEmailsForCampaign = [];

/**
 * Initialize compose functionality on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeComposeHandler();
});

/**
 * Initialize compose handler
 */
function initializeComposeHandler() {
    // Initialize email selector modal
    emailSelectorModal = new EmailSelectorModal();
    emailSelectorModal.init();

    const emailForm = document.getElementById('email-form');
    const subjectInput = document.getElementById('email-subject');
    const bodyInput = document.getElementById('email-body');
    const scheduleCheckbox = document.getElementById('schedule-later');
    const scheduleSettings = document.getElementById('schedule-settings');

    // Update preview on subject change
    subjectInput.addEventListener('input', updatePreview);

    // Update preview on body change
    bodyInput.addEventListener('input', updatePreview);

    // Toggle schedule settings
    scheduleCheckbox.addEventListener('change', () => {
        scheduleSettings.style.display = scheduleCheckbox.checked ? 'block' : 'none';
    });

    // Form submission
    emailForm.addEventListener('submit', handleEmailSubmit);

    // Update recipient count
    const recipientFilter = document.getElementById('recipient-filter');
    recipientFilter.addEventListener('change', updateRecipientCount);

    // Add recipient selector button handler
    const selectRecipientsBtn = document.getElementById('select-recipients-btn');
    if (selectRecipientsBtn) {
        selectRecipientsBtn.addEventListener('click', openEmailSelectorModal);
    }

    // Initialize preview
    updatePreview();
}

/**
 * Update email preview
 */
function updatePreview() {
    const subject = document.getElementById('email-subject').value || 'Your subject here';
    const body = document.getElementById('email-body').value || 'Your email content will appear here...';

    document.getElementById('preview-subject').textContent = subject;
    document.getElementById('preview-body').innerHTML = body;
}

/**
 * Update recipient count display
 */
function updateRecipientCount() {
    // This would be updated with actual recipient count from backend
    const recipientFilter = document.getElementById('recipient-filter').value;
    const countElement = document.getElementById('count-value');

    if (recipientFilter === '') {
        countElement.textContent = '0';
    } else if (recipientFilter === 'all') {
        // In real implementation, fetch from backend
        countElement.textContent = '(Loading...)';
    } else if (recipientFilter === 'custom') {
        // Show count of selected emails
        const count = selectedEmailsForCampaign.length;
        countElement.textContent = count > 0 ? count : '0 (click Select Emails button)';
    } else {
        countElement.textContent = '(Filtered)';
    }
}

/**
 * Handle email form submission
 * @param {Event} event - Form submit event
 */
async function handleEmailSubmit(event) {
    event.preventDefault();

    const subject = document.getElementById('email-subject').value.trim();
    const body = document.getElementById('email-body').value.trim();
    const recipientFilter = document.getElementById('recipient-filter').value;
    const scheduleCheckbox = document.getElementById('schedule-later').checked;
    const scheduleTime = document.getElementById('schedule-time').value;

    // Validate inputs
    if (!subject) {
        showNotification('Please enter an email subject', 'warning');
        return;
    }

    if (!body) {
        showNotification('Please enter email body', 'warning');
        return;
    }

    if (!recipientFilter) {
        showNotification('Please select recipients', 'warning');
        return;
    }

    if (scheduleCheckbox && !scheduleTime) {
        showNotification('Please select a scheduled time', 'warning');
        return;
    }

    // Check if custom recipients selected and no emails chosen
    if (recipientFilter === 'custom' && selectedEmailsForCampaign.length === 0) {
        showNotification('Please select at least one email for custom list', 'warning');
        return;
    }

    // Prepare email data
    const emailData = {
        subject: subject,
        body: body,
        recipientFilter: recipientFilter,
        scheduled: scheduleCheckbox,
        scheduledTime: scheduleTime || null,
    };

    // Add selected emails if using custom filter
    if (recipientFilter === 'custom' && selectedEmailsForCampaign.length > 0) {
        emailData.selectedEmails = selectedEmailsForCampaign;
    }

    // Send email
    await sendEmailCampaign(emailData);
}

/**
 * Send email campaign to backend
 * @param {object} emailData - Email campaign data
 */
async function sendEmailCampaign(emailData) {
    const sendBtn = document.querySelector('button[type="submit"]');
    const originalText = sendBtn.textContent;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
        const response = await apiCall(API_ENDPOINTS.EMAIL_SEND, {
            method: 'POST',
            body: JSON.stringify(emailData),
        });

        if (response && response.success) {
            showStatusMessage('✅ Email campaign sent successfully!', 'success');
            showNotification('Campaign sent!', 'success');

            // Reset form
            document.getElementById('email-form').reset();
            updatePreview();
        } else {
            showStatusMessage('❌ Failed to send campaign', 'error');
            showNotification('Failed to send campaign', 'error');
        }
    } catch (error) {
        console.error('Send error:', error);
        showStatusMessage('❌ Error: ' + error.message, 'error');
        showNotification('Error sending campaign', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = originalText;
    }
}

/**
 * Show status message
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'success', 'error'
 */
function showStatusMessage(message, type) {
    const statusDiv = document.getElementById('send-status');
    statusDiv.className = `status-message ${type}`;
    statusDiv.innerHTML = message;
    statusDiv.style.display = 'block';

    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 6000);
    }
}

/**
 * Open email selector modal
 */
function openEmailSelectorModal() {
    if (!emailSelectorModal) {
        console.error('Email selector modal not initialized');
        return;
    }

    emailSelectorModal.open((selectedEmails) => {
        handleEmailsSelected(selectedEmails);
    });
}

/**
 * Handle emails selected from modal
 * @param {Array<string>} selectedEmails - Array of selected email IDs
 */
function handleEmailsSelected(selectedEmails) {
    selectedEmailsForCampaign = selectedEmails;
    
    // Update recipient filter dropdown
    const recipientFilter = document.getElementById('recipient-filter');
    if (recipientFilter) {
        recipientFilter.value = 'custom';
    }

    // Update the count display
    updateRecipientCount();

    // Show notification
    showNotification(`Selected ${selectedEmails.length} email${selectedEmails.length !== 1 ? 's' : ''} for campaign`, 'success');
}

/**
 * Get selected emails for campaign
 */
function getSelectedEmailsForCampaign() {
    if (selectedEmailsForCampaign && selectedEmailsForCampaign.length > 0) {
        return selectedEmailsForCampaign;
    }
    return null;
}
