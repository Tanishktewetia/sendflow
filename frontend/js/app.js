// App Initialization & Authentication

// Global variable to track campaign completion timeout
let campaignTimeoutId = null;

// Timer tracking variables
let campaignStartTime = null;          // When campaign started (timestamp)
let campaignTimerIntervalId = null;   // Interval for timer display update
let campaignElapsedTime = 0;          // Total elapsed time in milliseconds (preserved during pause)

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.loggedIn) {
        window.location.href = 'auth.html';
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initilizeApp();
});

function initilizeApp() {
    setupSidebar();
    setupForms();
    setupNotifications();
    setupSettingsModal();
    setupEmailSelectionPreference();
    loadSavedDraft();
    restoreLastSection();
    activityLog.load(); // Load activity log from localStorage
    updateCurrentRunningCSV();
    restoreCampaignStateOnReload(); // Restore button states if campaign was running
    restoreTerminalLogs(); // Restore terminal logs on page reload
    restoreSectionStates(); // Restore collapsed/expanded state of stats sections
    updateDashboardStats(); // Update dashboard statistics
    activityLog.updateDisplay(); // Display activity log
}

// SIDEBAR NAVIGATION
function setupSidebar() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
            
            // Update active state
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Close mobile sidebar
            closeMobileSidebar();
        });
    });

    // Mobile menu toggle
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const toggleArrow = document.querySelector('.toggle-arrow');

    // Toggle button opens/closes sidebar
    mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sidebar.classList.contains('active')) {
            // Close sidebar
            sidebar.classList.remove('active');
            mobileToggle.classList.remove('moved');
            if (toggleArrow) toggleArrow.textContent = '>';
        } else {
            // Open sidebar
            sidebar.classList.add('active');
            mobileToggle.classList.add('moved');
            if (toggleArrow) toggleArrow.textContent = '<';
        }
    });

    // Close button
    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('active');
            mobileToggle.classList.remove('moved');
            if (toggleArrow) toggleArrow.textContent = '>';
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
            // Don't close if clicking toggle button or sidebar
            if (!sidebar.contains(e.target) && e.target !== mobileToggle && !mobileToggle.contains(e.target)) {
                sidebar.classList.remove('active');
                mobileToggle.classList.remove('moved');
                if (toggleArrow) toggleArrow.textContent = '>';
            }
        }
    });

    // Profile menu setup
    setupProfileMenu();
}

// Profile Menu
function setupProfileMenu() {
    const profileBtn = document.getElementById('profileSidebarBtn');
    const profileTooltip = document.getElementById('profileTooltip');
    const userNameDisplay = document.getElementById('userNameDisplay');
    
    // Load user name
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.name) {
        userNameDisplay.textContent = user.name;
    }
    
    // Load sidebar avatar
    const profileImage = localStorage.getItem('profileImage');
    if (profileImage) {
        updateSidebarAvatar(profileImage);
    }
    
    // Toggle tooltip
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileTooltip.classList.toggle('active');
    });
    
    // Close tooltip when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileBtn.contains(e.target) && !profileTooltip.contains(e.target)) {
            profileTooltip.classList.remove('active');
        }
    });
    
    // Close tooltip when clicking menu items
    const profileOptions = document.querySelectorAll('.profile-option');
    profileOptions.forEach((option, index) => {
        option.addEventListener('click', (e) => {
            // First option (Profile) opens the edit modal
            if (index === 0) {
                e.preventDefault();
                openProfileModal();
            }
            // Second option (Settings) opens the settings modal
            else if (index === 1) {
                e.preventDefault();
                openSettingsModal();
            }
            profileTooltip.classList.remove('active');
        });
    });

    // Setup profile modal
    setupProfileModal();
}

// Profile Modal Functions
function setupProfileModal() {
    const modalOverlay = document.getElementById('profileModalOverlay');
    const profileModal = document.getElementById('profileModal');
    const profileModalClose = document.getElementById('profileModalClose');
    const profileModalCancel = document.getElementById('profileModalCancel');
    const profileEditForm = document.getElementById('profileEditForm');
    const profileImageInput = document.getElementById('profileImageInput');
    const profileImageUploadBtn = document.getElementById('profileImageUploadBtn');
    const profileDisplayName = document.getElementById('profileDisplayName');
    const profileEmail = document.getElementById('profileEmail');
    const profileImage = document.getElementById('profileImage');

    // Load profile data
    loadProfileData();

    // Open modal
    profileImageUploadBtn.addEventListener('click', () => {
        profileImageInput.click();
    });

    // Close modal
    profileModalClose.addEventListener('click', closeProfileModal);
    profileModalCancel.addEventListener('click', closeProfileModal);
    modalOverlay.addEventListener('click', closeProfileModal);

    // Handle image upload
    profileImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target.result;
                profileImage.src = imageData;
                localStorage.setItem('profileImage', imageData);
                // Update sidebar avatar
                updateSidebarAvatar(imageData);
            };
            reader.readAsDataURL(file);
        }
    });

    // Save profile
    profileEditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = profileDisplayName.value.trim();
        
        if (!name) {
            showNotification('Please enter your name', 'error');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.name = name;
        localStorage.setItem('user', JSON.stringify(user));

        // Update profile button display
        document.getElementById('userNameDisplay').textContent = name;

        showNotification('Profile updated successfully', 'success');
        closeProfileModal();
    });
}

function openProfileModal() {
    document.getElementById('profileModalOverlay').classList.add('active');
    document.getElementById('profileModal').classList.add('active');
    loadProfileData();
}

function closeProfileModal() {
    document.getElementById('profileModalOverlay').classList.remove('active');
    document.getElementById('profileModal').classList.remove('active');
}

function loadProfileData() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('profileDisplayName').value = user.name || '';
    document.getElementById('profileEmail').value = user.email || '';
    
    const profileImage = localStorage.getItem('profileImage');
    if (profileImage) {
        document.getElementById('profileImage').src = profileImage;
        updateSidebarAvatar(profileImage);
    }
}

function updateSidebarAvatar(imageData) {
    const sidebarAvatarImg = document.getElementById('sidebarAvatar');
    const sidebarAvatarIcon = document.getElementById('sidebarAvatarIcon');
    
    if (imageData) {
        sidebarAvatarImg.src = imageData;
        sidebarAvatarImg.style.display = 'block';
        sidebarAvatarIcon.style.display = 'none';
    } else {
        sidebarAvatarImg.style.display = 'none';
        sidebarAvatarIcon.style.display = 'block';
    }
}

function closeMobileSidebar() {
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('mobileMenuToggle').classList.remove('moved');
        const toggleArrow = document.querySelector('.toggle-arrow');
        if (toggleArrow) toggleArrow.textContent = '>';
    }
}

function switchSection(section) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));

    const target = document.getElementById(`${section}-section`);
    if (target) {
        target.classList.add('active');
        updatePageTitle(section);
        
        // Save current section to localStorage
        localStorage.setItem('lastSection', section);
        
        // Update active nav item
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.dataset.section === section) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Refresh queue display when accessing upload section
        if (section === 'upload') {
            updateCSVQueueDisplay();
        }
    }
}

function restoreLastSection() {
    const lastSection = localStorage.getItem('lastSection') || 'dashboard';
    switchSection(lastSection);
}

function updatePageTitle(section) {
    const titles = {
        'dashboard': 'Dashboard',
        'compose': 'Compose Email',
        'upload': 'Upload CSV',
        'logs': 'Campaign Logs'
    };
    document.querySelector('.page-title').textContent = titles[section] || 'Dashboard';
}



// EMAIL COMPOSER
function setupForms() {
    
    // Email inputs for preview
    document.getElementById('emailSubject')?.addEventListener('input', updatePreview);
    document.getElementById('emailBody')?.addEventListener('input', updatePreview);
    
    // Send To selection
    document.getElementById('sendToOption')?.addEventListener('change', (e) => {
        const rangeInputs = document.getElementById('rangeInputs');
        rangeInputs.style.display = e.target.value === 'range' ? 'flex' : 'none';
        updatePreview();
        updateDashboardStats(); // Update dashboard instantly when send option changes
    });

    // Range inputs
    document.getElementById('rangeFrom')?.addEventListener('input', () => {
        updatePreview();
        updateDashboardStats(); // Update dashboard instantly
    });
    document.getElementById('rangeTo')?.addEventListener('input', () => {
        updatePreview();
        updateDashboardStats(); // Update dashboard instantly
    });
    
    // Campaign control
    document.getElementById('startBtn')?.addEventListener('click', handleStartCampaign);
    document.getElementById('pauseBtn')?.addEventListener('click', handlePauseCampaign);
    
    // Clear logs button
    document.getElementById('clearLogsBtn')?.addEventListener('click', clearTerminalLogs);
    
    // CSV upload
    setupCSVUpload();

    // Save Draft button
    document.getElementById('saveDraftBtn')?.addEventListener('click', handleSaveDraft);
}

/**
 * Update campaign button icons based on state
 * @param {string} state - 'running' or 'paused'
 */
function updateCampaignButtonIcons(state) {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (state === 'running') {
        // Campaign is running - show pause icon and hide start
        if (pauseBtn && pauseBtn.querySelector('i')) {
            pauseBtn.querySelector('i').className = 'fas fa-pause';
        }
        if (startBtn && startBtn.querySelector('i')) {
            startBtn.querySelector('i').className = 'fas fa-play';
        }
    } else if (state === 'paused') {
        // Campaign is paused - show resume (play) icon on start
        if (startBtn && startBtn.querySelector('i')) {
            startBtn.querySelector('i').className = 'fas fa-play';
        }
    } else if (state === 'idle') {
        // Idle state - show play icon on start
        if (startBtn && startBtn.querySelector('i')) {
            startBtn.querySelector('i').className = 'fas fa-play';
        }
    }
}

function updatePreview() {
    const subject = document.getElementById('emailSubject')?.value || '-';
    const body = document.getElementById('emailBody')?.value || '-';
    const sendTo = document.getElementById('sendToOption')?.value || 'all';
    
    document.getElementById('previewSubject').textContent = subject;
    document.getElementById('previewBody').textContent = body.substring(0, 50) + (body.length > 50 ? '...' : '');
    
    if (sendTo === 'range') {
        const from = document.getElementById('rangeFrom')?.value || '1';
        const to = document.getElementById('rangeTo')?.value || '100';
        document.getElementById('previewCount').textContent = `${from} to ${to}`;
    } else {
        document.getElementById('previewCount').textContent = 'All recipients';
    }
}

function handleSendCampaign(e) {
    e.preventDefault();
    const subject = document.getElementById('emailSubject').value;
    const body = document.getElementById('emailBody').value;

    if (!subject || !body) {
        showNotification('Please fill subject and body', 'error');
        return;
    }

    showConfirmModal('Send Campaign?', 'Are you sure you want to send this campaign?', () => {
        const campaign = {
            subject,
            body,
            recipients: JSON.parse(localStorage.getItem('recipients') || '[]'),
            timestamp: new Date().toISOString()
        };
        
        let campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
        campaigns.push(campaign);
        localStorage.setItem('campaigns', JSON.stringify(campaigns));
        
        // Mark current CSV as processing
        const queue = getCSVQueue();
        const processingItem = queue.find(q => q.status === 'processing' || q.status === 'pending');
        if (processingItem) {
            setCSVProcessing(processingItem.id);
            localStorage.setItem('currentProcessingCSVId', processingItem.id);
        }
        
        closeModal();
        document.getElementById('composeForm').reset();
        updatePreview();
        
        // Simulate sending
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-flex';
        document.getElementById('campaignStatus').textContent = 'Campaign sending...';
        showNotification('Campaign initiated', 'success');
        
        // Clear any existing timeout
        if (campaignTimeoutId) {
            clearTimeout(campaignTimeoutId);
        }
        
        // Set new timeout and store the ID
        campaignTimeoutId = setTimeout(() => {
            // Only complete if campaign is still running (not paused)
            const isPaused = localStorage.getItem('campaignPaused') === 'true';
            if (!isPaused) {
                onCampaignComplete();
            }
            campaignTimeoutId = null;
        }, 10000);
    });
}

function handleStartCampaign() {
    
    // CRITICAL: Check if a campaign is ACTIVELY RUNNING (not paused) before processing anything
    const currentProcessingId = localStorage.getItem('currentProcessingCSVId');
    const isPaused = localStorage.getItem('campaignPaused') === 'true';
    
    // Only block if a campaign is running AND it's NOT paused
    if (currentProcessingId && !isPaused) {
        console.log('[DEBUG] Campaign already running with CSV ID:', currentProcessingId);
        showNotification('⚠️ A campaign is already running. Please pause or wait for it to complete before starting a new one.', 'warning');
        return;
    }
    
    // Check if at least one email provider/mailer is configured
    const emailProviders = JSON.parse(localStorage.getItem('emailProviders') || '[]');
    if (emailProviders.length === 0) {
        showNotification('❌ No email provider configured. Please add and verify an email provider in Settings first.', 'error');
        return;
    }
    
    // Check user's email selection preference - from DOM or localStorage
    let emailSelectionPref = document.querySelector('input[name="emailSelection"]:checked')?.value;
    if (!emailSelectionPref) {
        emailSelectionPref = localStorage.getItem('emailSelectionPreference') || 'default';
    }
    
    console.log('[DEBUG] Email selection preference:', emailSelectionPref);
    
    // Always ask for email provider if preference is "prompt" (regardless of number of providers)
    if (emailSelectionPref === 'prompt') {
        console.log('[DEBUG] Showing email selection modal (prompt mode)');
        showEmailSelectionModal();
        return;
    }
    
    // Using default email provider
    
    // If no default provider is selected, select the first one
    if (!localStorage.getItem('selectedEmailProvider')) {
        localStorage.setItem('selectedEmailProvider', emailProviders[0].id);
    }
    
    // Check if at least one CSV is in the queue
    const csvQueue = getCSVQueue();
    if (csvQueue.length === 0) {
        showNotification('❌ No CSV uploaded. Please upload a CSV file to the queue first.', 'error');
        return;
    }
    
    const recipients = JSON.parse(localStorage.getItem('recipients') || '[]');
    
    if (recipients.length === 0) {
        showNotification('Please upload recipients first', 'error');
        return;
    }
    
    const subject = document.getElementById('emailSubject')?.value?.trim();
    const body = document.getElementById('emailBody')?.value?.trim();
    const sendTo = document.getElementById('sendToOption')?.value;
    
    if (!subject || !body) {
        showNotification('Please fill in subject and body', 'error');
        return;
    }
    
    // Validate range if custom range is selected
    if (sendTo === 'range') {
        const rangeFrom = parseInt(document.getElementById('rangeFrom')?.value || 0);
        const rangeTo = parseInt(document.getElementById('rangeTo')?.value || 0);
        
        if (rangeFrom < 1) {
            showNotification('From must be at least 1', 'error');
            return;
        }
        
        if (rangeTo < rangeFrom) {
            showNotification('To must be greater than or equal to From', 'error');
            return;
        }
        
        if (rangeTo > recipients.length) {
            showNotification(`To cannot exceed total recipients (${recipients.length})`, 'error');
            return;
        }
    }

    // All validations passed - now actually start the campaign
    // All validations passed
    
    // If campaign is paused, resume it instead of starting fresh
    if (isPaused && currentProcessingId) {
        proceedWithCampaignResume();
    } else {
        proceedWithCampaignStart();
    }
}

function onCampaignComplete() {
    // Clear timeout ID since campaign completed
    if (campaignTimeoutId) {
        clearTimeout(campaignTimeoutId);
        campaignTimeoutId = null;
    }
    
    // Stop the timer display
    stopCampaignTimer();
    
    const processingId = localStorage.getItem('currentProcessingCSVId');
    
    if (processingId) {
        // Get campaign stats for activity log
        const sessionLogs = JSON.parse(localStorage.getItem('currentSessionLogs') || '{}');
        const queue = getCSVQueue();
        const csv = queue.find(q => q.id === parseInt(processingId));
        const csvName = csv ? csv.name : 'Unknown';
        const sent = sessionLogs.successCount || 0;
        const failed = sessionLogs.failureCount || 0;
        
        // Mark CSV as completed (do not remove from queue - keep for reference)
        setCSVCompleted(parseInt(processingId));
        
        // Log activity
        activityLog.add(`Campaign executed successfully: ${csvName} (${sent} sent, ${failed} failed) - CSV marked as completed`, 'success', 'check-circle');
        
        // Show toast notification
        showNotification(`✅ Campaign executed successfully\n${csvName} has been processed`, 'success');
        
        endCSVLogging(parseInt(processingId));
        localStorage.removeItem('currentProcessingCSVId');
        localStorage.removeItem('csvProgress');
        localStorage.removeItem('csvStoppedAt');
        localStorage.removeItem('campaignElapsedTimeMS');  // Clear stored elapsed time
        
        // Clear pause state to unlock provider for next campaign
        localStorage.removeItem('campaignPaused');
        localStorage.removeItem('campaignPausedRow');
        localStorage.removeItem('campaignEmailProvider');
        const providerSelect = document.getElementById('providerType');
        if (providerSelect) providerSelect.disabled = false;
    }

    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('campaignStatus').textContent = 'Campaign completed';
    
    // Update button icons to idle state
    updateCampaignButtonIcons('idle');
    updateCurrentRunningCSV();
    updateCSVQueueDisplay(); // Refresh queue to show completed status
    updateDashboardStats(); // Update stats after campaign completion
    
    // Clear campaign state for next campaign
    localStorage.removeItem('currentProcessingCSVId');
    localStorage.removeItem('csvProgress');
    localStorage.removeItem('campaignPaused');
    localStorage.removeItem('campaignPausedRow');
    localStorage.removeItem('campaignElapsedTimeMS');

    // Move to next CSV in queue and show dialog
    moveToNextCSVWithDialog();
}

function moveToNextCSVWithDialog() {
    const queue = getCSVQueue();
    const nextItem = queue.find(q => q.status === 'pending');

    if (nextItem) {
        // Show dialog with next CSV info
        showNextCSVDialog(nextItem);
    } else {
        // All CSVs processed
        document.getElementById('campaignStatus').textContent = '';
        updateCurrentRunningCSV();
        activityLog.add('All CSVs in queue have been processed', 'info', 'check-circle');
        showNotification('✅ All CSVs in queue have been processed', 'success');
    }
}

function showNextCSVDialog(nextItem) {
    showConfirmModal(
        '📧 Next CSV in Queue',
        `Next CSV file ready to process:\n\n<strong>${nextItem.name}</strong>\n\nRecipients: ${nextItem.recipientCount}\n\nWould you like to continue with this CSV?`,
        () => {
            // User confirmed - load and start next CSV
            localStorage.setItem('recipients', JSON.stringify(nextItem.recipients));
            updateRangeInputs(nextItem.recipientCount);
            document.getElementById('campaignStatus').textContent = `Ready to process: ${nextItem.name}`;
            updateCurrentRunningCSV();
            updateCSVQueueDisplay(); // Refresh queue display
            activityLog.add(`Next CSV loaded: ${nextItem.name} (${nextItem.recipientCount} recipients)`, 'info', 'file-csv');
            showNotification(`Next CSV loaded: ${nextItem.name}`, 'info');
            closeModal();
        },
        () => {
            // User declined - just close dialog
            document.getElementById('campaignStatus').textContent = 'Waiting for user input';
            updateCSVQueueDisplay(); // Refresh queue display
            closeModal();
        },
        'Continue',
        'Skip for now'
    );
}

function moveToNextCSV() {
    const queue = getCSVQueue();
    const nextItem = queue.find(q => q.status === 'pending');

    if (nextItem) {
        // Load next CSV
        localStorage.setItem('recipients', JSON.stringify(nextItem.recipients));
        updateRangeInputs(nextItem.recipientCount);
        document.getElementById('campaignStatus').textContent = `Ready to process: ${nextItem.name}`;
        updateCurrentRunningCSV();
        showNotification(`Next CSV loaded: ${nextItem.name}`, 'info');
    } else {
        // All CSVs processed, clear the current processing ID
        document.getElementById('campaignStatus').textContent = '';
        updateCurrentRunningCSV();
        showNotification('All CSVs processed', 'info');
    }
}

/**
 * Start the campaign timer display
 * @param {boolean} isResume - whether this is resuming a paused campaign (true) or starting fresh (false)
 */
function startCampaignTimer(isResume = false) {
    // Campaign timer started
    
    // Only reset elapsed time if starting fresh (not resuming)
    if (!isResume) {
        campaignElapsedTime = 0;
    }
    
    // Record the exact start time
    campaignStartTime = Date.now();
    
    // Clear any existing timer interval completely
    if (campaignTimerIntervalId) {
        clearInterval(campaignTimerIntervalId);
        campaignTimerIntervalId = null;
    }
    
    // Update timer display every 100ms for smooth animation
    campaignTimerIntervalId = setInterval(() => {
        if (campaignStartTime) {
            // Calculate elapsed time since campaign started
            const currentElapsed = Date.now() - campaignStartTime + campaignElapsedTime;
            const seconds = Math.floor(currentElapsed / 1000);
            const milliseconds = Math.floor((currentElapsed % 1000) / 100);
            
            // Display timer as "⏱️ 5.3s" format
            const timerDisplay = document.getElementById('campaignTimer');
            if (timerDisplay) {
                timerDisplay.textContent = `⏱️ ${seconds}.${milliseconds}s`;
            }
        }
    }, 100);
    
    // Timer initialized
}

/**
 * Pause the campaign timer display (preserve elapsed time)
 */
function pauseCampaignTimer() {
    // Pausing campaign timer
    
    if (campaignTimerIntervalId) {
        clearInterval(campaignTimerIntervalId);
        campaignTimerIntervalId = null;
    }
    
    // Store the elapsed time so we can resume from the same point
    if (campaignStartTime) {
        campaignElapsedTime += Date.now() - campaignStartTime;
        campaignStartTime = null;
    }
    
    // Update timer display to show the paused time
    const seconds = Math.floor(campaignElapsedTime / 1000);
    const milliseconds = Math.floor((campaignElapsedTime % 1000) / 100);
    const timerDisplay = document.getElementById('campaignTimer');
    if (timerDisplay) {
        timerDisplay.textContent = `⏸️ ${seconds}.${milliseconds}s (paused)`;
    }
    
    // Timer paused
}

/**
 * Stop and reset the campaign timer display
 */
function stopCampaignTimer() {
    // Stopping campaign timer
    
    if (campaignTimerIntervalId) {
        clearInterval(campaignTimerIntervalId);
        campaignTimerIntervalId = null;
    }
    
    // Reset timing variables
    campaignStartTime = null;
    campaignElapsedTime = 0;
    
    // Clear timer display immediately and force UI update
    const timerDisplay = document.getElementById('campaignTimer');
    if (timerDisplay) {
        timerDisplay.textContent = '';
        // Force a reflow to ensure UI updates immediately
        void timerDisplay.offsetHeight;
    }
    
    // Timer stopped and reset
}

function handlePauseCampaign() {
    // Pause the campaign - it can be resumed from where it stopped
    // IMPORTANT: Preserve progress, lock provider, keep CSV in queue
    
    // Cancel the completion timeout when pausing
    if (campaignTimeoutId) {
        clearTimeout(campaignTimeoutId);
        campaignTimeoutId = null;
    }
    
    // Pause the timer display (preserve elapsed time)
    pauseCampaignTimer();
    
    const processingId = localStorage.getItem('currentProcessingCSVId');
    const currentRow = parseInt(localStorage.getItem('csvProgress') || '0');
    let csvName = 'Unknown';
    let totalRows = 0;
    
    if (processingId) {
        // Get CSV name and total rows for activity log
        const queue = getCSVQueue();
        const csv = queue.find(q => q.id === parseInt(processingId));
        if (csv) {
            csvName = csv.name;
            totalRows = csv.recipientCount || 0;
        }
        
        // Store pause state - DO NOT clear progress
        localStorage.setItem('campaignPaused', 'true');
        localStorage.setItem('campaignPausedRow', currentRow.toString());
        localStorage.setItem('campaignPausedAt', new Date().toISOString());
        
        // Store elapsed time so it can be restored on page reload
        localStorage.setItem('campaignElapsedTimeMS', campaignElapsedTime.toString());
        
        // Lock the email provider during pause
        const selectedProvider = document.getElementById('providerType')?.value || '';
        if (selectedProvider) {
            localStorage.setItem('campaignEmailProvider', selectedProvider);
            const providerSelect = document.getElementById('providerType');
            if (providerSelect) providerSelect.disabled = true;
        }
        
        // Log activity with pause details
        const sessionLogs = JSON.parse(localStorage.getItem('currentSessionLogs') || '{}');
        const sent = sessionLogs.successCount || 0;
        const failed = sessionLogs.failureCount || 0;
        const remaining = totalRows - currentRow;
        
        activityLog.add(
            `Campaign paused: ${csvName} at row ${currentRow}/${totalRows} (${sent} sent, ${failed} failed, ${remaining} remaining)`,
            'campaign-pause',
            'pause-circle'
        );
        
        addTerminalLog(`Campaign paused at row ${currentRow}/${totalRows} by user`, 'warning');
        // Progress preserved for resume
    }

    // Update UI
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('campaignStatus').textContent = `⏸️ Campaign paused at row ${currentRow}. Click Start to resume.`;
    
    // Update button icons for paused state
    updateCampaignButtonIcons('paused');
    updateCurrentRunningCSV();
    showNotification(`Campaign paused at row ${currentRow}. Ready to resume.`, 'info');
}

function handleResetStuckCSV() {
    showConfirmModal(
        '⚠️ Reset Stuck CSV?',
        'This will forcefully reset any stuck campaign and clear its processing state. All unsaved progress will be lost. Are you sure you want to proceed?',
        () => {
            closeModal();
            resetStuckCSV();
        }
    );
}

function resetStuckCSV() {
    // Cancel any active campaign timeout/timer
    if (campaignTimeoutId) {
        clearTimeout(campaignTimeoutId);
        campaignTimeoutId = null;
        // Timeout cleared on reset
    }
    
    // Stop the timer display and clear all timer variables immediately
    stopCampaignTimer();
    
    // Reset any stuck CSV that's in processing state
    const processingId = localStorage.getItem('currentProcessingCSVId');
    const queue = getCSVQueue();
    
    if (processingId) {
        const csv = queue.find(q => q.id === parseInt(processingId));
        if (csv && csv.status === 'processing') {
            // Set CSV back to pending state
            setCSVPending(parseInt(processingId));
            addTerminalLog(`CSV reset by user - forcefully cleared from processing state back to pending`, 'warning');
            activityLog.add(`CSV manually reset: ${csv.name} - returned to pending`, 'warning', 'sync');
        }
    }
    
    // Clear all processing-related data including timer data
    localStorage.removeItem('currentProcessingCSVId');
    localStorage.removeItem('csvProgress');
    localStorage.removeItem('currentSessionLogs');
    localStorage.removeItem('csvStoppedAt');
    localStorage.removeItem('campaignPaused');
    localStorage.removeItem('campaignPausedRow');
    localStorage.removeItem('campaignEmailProvider');
    localStorage.removeItem('campaignElapsedTimeMS');  // Clear stored elapsed time
    
    // Re-enable provider selector
    const providerSelect = document.getElementById('providerType');
    if (providerSelect) providerSelect.disabled = false;
    
    // Reset UI buttons and status
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('campaignStatus').textContent = '';
    
    // Update displays
    updateCurrentRunningCSV();
    updateCSVQueueDisplay();
    updateDashboardStats();  // Update stats after reset
    showNotification('✅ Stuck CSV reset and moved back to pending', 'success');
}

function handleSaveDraft() {
    const subject = document.getElementById('emailSubject')?.value?.trim();
    const body = document.getElementById('emailBody')?.value?.trim();

    if (!subject || !body) {
        showNotification('Please fill in subject and body before saving', 'error');
        return;
    }

    const draft = {
        subject,
        body,
        sendTo: document.getElementById('sendToOption')?.value || 'all',
        rangeFrom: document.getElementById('rangeFrom')?.value || '',
        rangeTo: document.getElementById('rangeTo')?.value || '',
        savedAt: new Date().toLocaleString()
    };

    localStorage.setItem('emailDraft', JSON.stringify(draft));
    showNotification('Email draft saved successfully', 'success');
    updateDashboardStats(); // Update dashboard instantly when draft is saved
}

function loadSavedDraft() {
    const savedDraft = localStorage.getItem('emailDraft');
    if (!savedDraft) return;

    try {
        const draft = JSON.parse(savedDraft);
        
        const subjectInput = document.getElementById('emailSubject');
        const bodyInput = document.getElementById('emailBody');
        const sendToSelect = document.getElementById('sendToOption');
        const rangeFromInput = document.getElementById('rangeFrom');
        const rangeToInput = document.getElementById('rangeTo');

        if (subjectInput) subjectInput.value = draft.subject || '';
        if (bodyInput) bodyInput.value = draft.body || '';
        if (sendToSelect) sendToSelect.value = draft.sendTo || 'all';
        if (rangeFromInput) rangeFromInput.value = draft.rangeFrom || '';
        if (rangeToInput) rangeToInput.value = draft.rangeTo || '';

        // Update preview with loaded draft
        updatePreview();
        
        // Show range inputs if needed
        const rangeInputs = document.getElementById('rangeInputs');
        if (rangeInputs && sendToSelect?.value === 'range') {
            rangeInputs.style.display = 'flex';
        }
        
        // Update dashboard instantly when draft is loaded
        updateDashboardStats();
    } catch (e) {
        console.error('Error loading saved draft:', e);
    }
}

function handleLogout() {
    localStorage.removeItem('user');
    window.location.href = 'auth.html';
}

// CSV UPLOAD - Temporary storage for parsed CSV data (not added to queue until confirmed)
let pendingCSVData = {
    fileName: '',
    recipients: [],
    lines: []
};

function setupCSVUpload() {
    const uploadForm = document.getElementById('uploadForm');
    const csvFile = document.getElementById('csvFile');

    if (!uploadForm) return;

    uploadForm.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadForm.classList.add('drag-over');
    });

    uploadForm.addEventListener('dragleave', () => {
        uploadForm.classList.remove('drag-over');
    });

    uploadForm.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadForm.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        handleFile(file);
    });

    csvFile?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFile(file);
    });

    // Load and display saved queue on initialization
    loadCSVQueue();
}

function getCSVQueue() {
    return JSON.parse(localStorage.getItem('csvQueue') || '[]');
}

function saveCSVQueue(queue) {
    localStorage.setItem('csvQueue', JSON.stringify(queue));
    updateCSVQueueDisplay();
    updateDashboardStats();
}

function addToCSVQueue(name, recipients) {
    const queue = getCSVQueue();
    
    if (queue.length >= 5) {
        showNotification('Maximum 5 CSV files allowed in queue', 'error');
        return false;
    }

    const csvItem = {
        id: Date.now(),
        name: name,
        recipients: recipients,
        recipientCount: recipients.length,
        status: 'pending',
        uploadedAt: new Date().toLocaleString(),
        completedAt: null
    };

    queue.push(csvItem);
    saveCSVQueue(queue);
    
    // Log activity
    activityLog.add(`CSV uploaded: ${name} (${recipients.length} recipients)`, 'info', 'file-csv');
    
    // Update displays instantly
    updateCSVQueueDisplay();
    updateDashboardStats();
    
    showNotification(`CSV "${name}" added to queue`, 'success');
    return true;
}

function removeFromCSVQueue(id) {
    const queue = getCSVQueue();
    const item = queue.find(q => q.id === id);

    // Cannot remove if processing
    if (item && item.status === 'processing') {
        showNotification('Cannot remove CSV while processing. Stop the campaign first.', 'error');
        return false;
    }

    const newQueue = queue.filter(q => q.id !== id);
    saveCSVQueue(newQueue);
    
    // Update displays instantly
    updateCSVQueueDisplay();
    updateDashboardStats();
    
    showNotification('CSV removed from queue', 'success');
    return true;
}

function setCSVProcessing(id) {
    const queue = getCSVQueue();
    const item = queue.find(q => q.id === id);
    if (item) {
        item.status = 'processing';
        saveCSVQueue(queue);
        updateDashboardStats();
    }
}

function setCSVCompleted(id) {
    const queue = getCSVQueue();
    const item = queue.find(q => q.id === id);
    if (item) {
        item.status = 'completed';
        item.completedAt = new Date().toLocaleString();
        saveCSVQueue(queue);
        updateDashboardStats();
    }
}

function reprocessCSV(id) {
    // Convert a completed CSV back to pending status
    const queue = getCSVQueue();
    const item = queue.find(q => q.id === id);
    
    if (item && item.status === 'completed') {
        item.status = 'pending';
        item.completedAt = null;
        saveCSVQueue(queue);
        activityLog.add(`CSV re-added to queue: ${item.name} (${item.recipientCount} recipients)`, 'info', 'redo');
        showNotification(`✅ ${item.name} has been re-added to the pending queue`, 'success');
        updateCSVQueueDisplay();
        updateDashboardStats(); // Update stats instantly to show file name and count
    }
}

function setCSVPending(id) {
    const queue = getCSVQueue();
    const item = queue.find(q => q.id === id);
    if (item) {
        item.status = 'pending';
        item.completedAt = null;
        saveCSVQueue(queue);
        updateDashboardStats();
    }
}

function updateCSVQueueDisplay() {
    const queue = getCSVQueue();
    const queueSection = document.getElementById('csvQueueSection');
    const queueList = document.getElementById('csvQueueList');
    const queueCount = document.getElementById('queueCount');

    if (queue.length === 0) {
        queueSection.style.display = 'none';
        return;
    }

    queueSection.style.display = 'block';
    queueCount.textContent = `(${queue.length}/5)`;

    queueList.innerHTML = queue.map((item, index) => `
        <div class="queue-item ${item.status === 'completed' ? 'queue-item-completed' : ''}">
            <div class="queue-item-info">
                <div class="queue-item-icon">
                    <i class="fas fa-file-csv"></i>
                </div>
                <div class="queue-item-details">
                    <div class="queue-item-name">${index + 1}. ${item.name}</div>
                    <div class="queue-item-status">
                        <span class="queue-item-count">${item.recipientCount} recipients</span>
                        <span>•</span>
                        <span>${item.uploadedAt}</span>
                        <span class="status-badge ${item.status}">
                            <i class="fas fa-${item.status === 'processing' ? 'spinner fa-spin' : item.status === 'completed' ? 'check-circle' : 'hourglass-half'}"></i>
                            ${item.status === 'pending' ? '⏳ Ready' : item.status === 'processing' ? '🔄 Processing' : '✅ Completed'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="queue-item-actions">
                ${item.status === 'completed' ? `
                    <button class="btn btn-secondary" onclick="reprocessCSV(${item.id})" title="Add back to pending queue">
                        <i class="fas fa-redo"></i> Reprocess
                    </button>
                ` : `
                    <button class="btn btn-secondary" onclick="removeFromCSVQueue(${item.id})" 
                            ${item.status === 'processing' ? 'disabled title="Cannot remove while processing"' : ''}
                            title="Remove from queue">
                        <i class="fas fa-trash"></i>
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

function loadCSVQueue() {
    const queue = getCSVQueue();
    if (queue.length > 0) {
        updateCSVQueueDisplay();
        // Restore the first pending CSV to form (for editing)
        const firstPending = queue.find(q => q.status === 'pending');
        if (firstPending) {
            localStorage.setItem('recipients', JSON.stringify(firstPending.recipients));
            updateRangeInputs(firstPending.recipientCount);
        }
    }
}

/**
 * Update dashboard statistics displayed at the top
 * Shows: Current Queue, Current Session Stats, Till Date Stats, and Success Rate
 */
function updateDashboardStats() {
    const queue = getCSVQueue();
    const sessionLogs = JSON.parse(localStorage.getItem('currentSessionLogs') || '{}');
    
    // Get stored lifetime stats
    const lifetimeStats = JSON.parse(localStorage.getItem('lifetimeStats') || '{"totalSent": 0, "totalSuccess": 0, "totalFailed": 0}');
    
    // Get current processing campaign details
    const processingId = localStorage.getItem('currentProcessingCSVId');
    const csvProgress = parseInt(localStorage.getItem('csvProgress') || '0');
    let emailsSent = 0;
    let emailsTotal = 0;
    let emailsLeft = 0;
    
    if (processingId) {
        const currentCSV = queue.find(q => q.id === parseInt(processingId));
        if (currentCSV && currentCSV.recipientCount > 0) {
            emailsSent = csvProgress;
            emailsTotal = currentCSV.recipientCount;
            emailsLeft = Math.max(0, emailsTotal - emailsSent);
        }
    }
    
    // 1. Current Queue - total recipients in pending and processing CSVs
    const currentQueueCount = queue.reduce((sum, csv) => {
        if (csv.status === 'pending' || csv.status === 'processing') {
            return sum + csv.recipientCount;
        }
        return sum;
    }, 0);
    
    // 2. Pending count - number of CSVs in pending state
    const pendingCSVCount = queue.filter(q => q.status === 'pending').length;
    
    // 3. Sent today - from current session
    const sentToday = sessionLogs.successCount || 0;
    
    // 4. Failed today - from current session
    const failedToday = sessionLogs.failureCount || 0;
    
    // 5. Failed during current campaign (same as failedToday if campaign is running)
    const failedDuringCampaign = (processingId) ? failedToday : 0;
    
    // 6. Total sent till date
    const totalSent = lifetimeStats.totalSent || 0;
    
    // 7. Total failed till date
    const totalFailed = lifetimeStats.totalFailed || 0;
    
    // 8. Calculate success rate till date
    let successRate = 0;
    if (lifetimeStats.totalSent > 0) {
        successRate = Math.round((lifetimeStats.totalSuccess / lifetimeStats.totalSent) * 100);
    }
    
    // 9. Calculate success rate for today's session
    let todaySuccessRate = 0;
    const todayTotal = sentToday + failedToday;
    if (todayTotal > 0) {
        todaySuccessRate = Math.round((sentToday / todayTotal) * 100);
    }
    
    // Update UI - RUNNING CAMPAIGN
    // If campaign is running, show progress
    // If no campaign but pending CSVs exist, show "0/{totalPendingCount}"
    // Only show "0/0" if queue is completely empty
    let campaignProgressDisplay;
    if (processingId && emailsTotal > 0) {
        // Campaign running: show actual progress
        campaignProgressDisplay = `${emailsSent}/${emailsTotal}`;
    } else if (!processingId && currentQueueCount > 0) {
        // No campaign running, but pending/processing CSVs exist: show 0/total ready
        // Check if custom range is selected
        const sendToOption = document.getElementById('sendToOption')?.value || 'all';
        let effectiveTotal = currentQueueCount;
        
        if (sendToOption === 'range') {
            // Custom range selected - calculate total based on range
            const rangeFromInput = document.getElementById('rangeFrom')?.value || '1';
            const rangeToInput = document.getElementById('rangeTo')?.value || '1';
            const rangeFrom = parseInt(rangeFromInput);
            const rangeTo = parseInt(rangeToInput);
            effectiveTotal = Math.max(1, rangeTo - rangeFrom + 1);
        }
        
        campaignProgressDisplay = `0/${effectiveTotal}`;
    } else {
        // Queue is empty
        campaignProgressDisplay = '0/0';
    }
    document.getElementById('statCampaignProgress').textContent = campaignProgressDisplay;
    
    // Update CSV to Process - show only pending/processing CSVs, not completed ones
    let csvToProcessDisplay = 'None';
    // Find the first pending or processing CSV (not completed)
    const pendingOrProcessingCSV = queue.find(csv => csv.status === 'pending' || csv.status === 'processing');
    if (pendingOrProcessingCSV) {
        csvToProcessDisplay = pendingOrProcessingCSV.name || 'Unknown';
    }
    document.getElementById('statFailedCampaign').textContent = csvToProcessDisplay;
    
    // Update UI - Mail Provider Set
    updateMailProviderStat();
    
    // Update UI - TODAY'S SESSION
    document.getElementById('statSent').textContent = sentToday;
    document.getElementById('statFailed').textContent = failedToday;
    document.getElementById('statTodaySuccessRate').textContent = todaySuccessRate + '%';
    
    // Update UI - TILL DATE
    document.getElementById('statTotalSent').textContent = totalSent;
    document.getElementById('statTotalFailed').textContent = totalFailed;
    document.getElementById('statSuccessRate').textContent = successRate + '%';
    
    console.log('[DEBUG] Dashboard stats updated:', { 
        emailsSent,
        emailsTotal,
        emailsLeft,
        failedDuringCampaign,
        sentToday, 
        failedToday, 
        todaySuccessRate,
        pendingCSVCount, 
        totalSent,
        totalFailed,
        successRate 
    });
}

// Update Mail Provider Stat (Real-time)
function updateMailProviderStat() {
    const emailProviders = JSON.parse(localStorage.getItem('emailProviders') || '[]');
    const selectedProviderId = localStorage.getItem('selectedEmailProvider');
    let providerDisplay = 'None';
    
    if (emailProviders.length > 0) {
        // Find provider by ID (ID is a timestamp generated when provider is added)
        const selectedProvider = emailProviders.find(p => p.id === parseInt(selectedProviderId));
        if (selectedProvider) {
            // Display format: "Provider Name (TYPE)" - show the user-given name instead of email
            const providerType = selectedProvider.type ? selectedProvider.type.toUpperCase() : 'UNKNOWN';
            providerDisplay = `${selectedProvider.name} (${providerType})`;
        } else if (selectedProviderId) {
            providerDisplay = 'Not Set';
        }
    }
    
    const statElement = document.getElementById('statMailProviderSet');
    if (statElement) {
        statElement.textContent = providerDisplay;
    }
}

// Toggle collapsible sections
function toggleSection(sectionId) {
    let contentId, iconId;
    
    if (sectionId === 'todaySession') {
        contentId = 'todaySessionContent';
        iconId = 'todaySessionIcon';
    } else if (sectionId === 'tillDate') {
        contentId = 'tillDateContent';
        iconId = 'tillDateIcon';
    }
    
    const contentElement = document.getElementById(contentId);
    const iconElement = document.getElementById(iconId);
    
    if (!contentElement || !iconElement) return;
    
    // Toggle display
    const isHidden = contentElement.style.display === 'none';
    contentElement.style.display = isHidden ? 'grid' : 'none';
    
    // Rotate icon
    if (isHidden) {
        iconElement.classList.remove('collapsed');
    } else {
        iconElement.classList.add('collapsed');
    }
    
    // Save state to localStorage
    localStorage.setItem(`section_${sectionId}_expanded`, isHidden);
}

// Restore section states on page load
function restoreSectionStates() {
    const sections = ['todaySession', 'tillDate'];
    sections.forEach(sectionId => {
        const expanded = localStorage.getItem(`section_${sectionId}_expanded`) === 'true';
        if (expanded) {
            const contentId = sectionId === 'todaySession' ? 'todaySessionContent' : 'tillDateContent';
            const iconId = sectionId === 'todaySession' ? 'todaySessionIcon' : 'tillDateIcon';
            
            const contentElement = document.getElementById(contentId);
            const iconElement = document.getElementById(iconId);
            
            if (contentElement && iconElement) {
                contentElement.style.display = 'grid';
                iconElement.classList.remove('collapsed');
            }
        }
    });
}

// ===== REAL-TIME ACTIVITY LOG SYSTEM =====
const activityLog = {
    entries: [],
    maxEntries: 15,
    
    add: function(message, type, icon) {
        const timestamp = new Date();
        const entry = {
            id: Date.now(),
            message: message,
            type: type || 'info', // success, error, warning, info
            icon: icon || getIconForType(type),
            timestamp: timestamp,
            timeString: this.formatTime(timestamp)
        };
        
        // Add to front of array (newest first)
        this.entries.unshift(entry);
        
        // Keep only last 15 entries
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(0, this.maxEntries);
        }
        
        // Save to localStorage for persistence
        this.save();
        
        // Update UI
        this.updateDisplay();
        
        console.log('[ACTIVITY]', entry.type.toUpperCase(), message);
    },
    
    formatTime: function(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        
        if (diffMins === 0) {
            return diffSecs + 's ago';
        } else if (diffMins < 60) {
            return diffMins + 'm ago';
        } else {
            const diffHours = Math.floor(diffMins / 60);
            return diffHours + 'h ago';
        }
    },
    
    save: function() {
        localStorage.setItem('dashboardActivityLog', JSON.stringify(this.entries));
    },
    
    load: function() {
        const saved = localStorage.getItem('dashboardActivityLog');
        if (saved) {
            this.entries = JSON.parse(saved);
        }
    },
    
    updateDisplay: function() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        if (this.entries.length === 0) {
            activityList.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> No recent activity</div>';
            return;
        }
        
        activityList.innerHTML = this.entries.map(entry => `
            <div class="activity-entry ${entry.type}">
                <div class="activity-icon">
                    <i class="fas fa-${entry.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-message">${escapeHtml(entry.message)}</div>
                    <div class="activity-timestamp">${entry.timeString}</div>
                </div>
            </div>
        `).join('');
    }
};

function getIconForType(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'times-circle',
        'warning': 'exclamation-circle',
        'info': 'info-circle',
        'campaign-start': 'play-circle',
        'campaign-stop': 'stop-circle',
        'email-sent': 'envelope',
        'email-fail': 'exclamation-triangle',
        'csv-upload': 'file-csv'
    };
    return icons[type] || 'circle';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function handleFile(file) {
    if (!file || file.type !== 'text/csv') {
        showNotification('Please upload a CSV file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const csv = e.target.result;
        parseCSV(csv, file.name);
    };
    reader.readAsText(file);
}

function parseCSV(csv, fileName) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    if (!headers.includes('name') || !headers.includes('email')) {
        showNotification('❌ CSV must have "name" and "email" columns', 'error');
        return;
    }

    const recipients = [];
    for (let i = 1; i < Math.min(lines.length, 100); i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const recipient = {};
        headers.forEach((header, idx) => {
            recipient[header] = values[idx] || '';
        });
        recipients.push(recipient);
    }

    if (recipients.length === 0) {
        showNotification('❌ CSV file is empty', 'error');
        return;
    }

    // Store in pending data - DO NOT add to queue yet
    pendingCSVData = {
        fileName: fileName,
        recipients: recipients,
        lines: lines
    };

    // Store in localStorage temporarily for preview
    localStorage.setItem('recipients', JSON.stringify(recipients));
    updateRangeInputs(recipients.length);
    
    // Show preview
    showPreview(lines);
}

function updateRangeInputs(totalCount) {
    const rangeTo = document.getElementById('rangeTo');
    if (rangeTo) {
        rangeTo.value = totalCount;
        rangeTo.max = totalCount;
    }
    
    const rangeFrom = document.getElementById('rangeFrom');
    if (rangeFrom) {
        rangeFrom.max = totalCount;
    }
}

function showPreview(lines) {
    const previewDiv = document.getElementById('filePreview');
    const table = document.getElementById('previewTable');
    
    if (lines.length === 0) return;

    const headers = lines[0].split(',').map(h => h.trim());
    const totalRows = lines.length - 1; // Exclude header

    let html = '<thead><tr>';
    
    // Show columns: first 3, then ..., then last (if more than 4 columns)
    if (headers.length <= 4) {
        headers.forEach(h => { html += `<th>${h}</th>`; });
    } else {
        // First 3 columns
        for (let i = 0; i < 3; i++) {
            html += `<th>${headers[i]}</th>`;
        }
        // Ellipsis column
        html += `<th style="text-align: center; color: #888;">...</th>`;
        // Last column
        html += `<th>${headers[headers.length - 1]}</th>`;
    }
    
    html += '</tr></thead><tbody>';

    // Show rows: first 5, then ..., then last (if more than 6 data rows)
    if (totalRows <= 6) {
        // Show all rows
        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(',').map(c => c.trim());
            html += '<tr>';
            
            if (headers.length <= 4) {
                cells.forEach(cell => {
                    html += `<td>${cell}</td>`;
                });
            } else {
                // First 3 columns
                for (let j = 0; j < 3; j++) {
                    html += `<td>${cells[j] || ''}</td>`;
                }
                // Ellipsis column
                html += `<td style="text-align: center; color: #888;">...</td>`;
                // Last column
                html += `<td>${cells[cells.length - 1] || ''}</td>`;
            }
            
            html += '</tr>';
        }
    } else {
        // First 5 data rows
        for (let i = 1; i <= 5; i++) {
            const cells = lines[i].split(',').map(c => c.trim());
            html += '<tr>';
            
            if (headers.length <= 4) {
                cells.forEach(cell => {
                    html += `<td>${cell}</td>`;
                });
            } else {
                // First 3 columns
                for (let j = 0; j < 3; j++) {
                    html += `<td>${cells[j] || ''}</td>`;
                }
                // Ellipsis column
                html += `<td style="text-align: center; color: #888;">...</td>`;
                // Last column
                html += `<td>${cells[cells.length - 1] || ''}</td>`;
            }
            
            html += '</tr>';
        }
        
        // Ellipsis row
        html += '<tr style="text-align: center; color: #888;"><td colspan="' + (headers.length <= 4 ? headers.length : 5) + '">...</td></tr>';
        
        // Last data row
        const lastIdx = lines.length - 1;
        const cells = lines[lastIdx].split(',').map(c => c.trim());
        html += '<tr>';
        
        if (headers.length <= 4) {
            cells.forEach(cell => {
                html += `<td>${cell}</td>`;
            });
        } else {
            // First 3 columns
            for (let j = 0; j < 3; j++) {
                html += `<td>${cells[j] || ''}</td>`;
            }
            // Ellipsis column
            html += `<td style="text-align: center; color: #888;">...</td>`;
            // Last column
            html += `<td>${cells[cells.length - 1] || ''}</td>`;
        }
        
        html += '</tr>';
    }
    
    html += '</tbody>';

    table.innerHTML = html;
    previewDiv.style.display = 'block';
    
    // Auto-scroll to confirm button after showing preview
    setTimeout(() => {
        const confirmButton = previewDiv.querySelector('button[onclick="confirmUpload()"]');
        if (confirmButton) {
            confirmButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

function confirmUpload() {
    // Check if a file has been parsed and is pending
    if (!pendingCSVData.fileName || pendingCSVData.recipients.length === 0) {
        showNotification('❌ Please select and preview a CSV file first', 'error');
        return;
    }

    // Check queue limit
    const queue = getCSVQueue();
    if (queue.length >= 5) {
        showNotification('❌ Queue is full (maximum 5 files). Please process some files first.', 'error');
        return;
    }

    // NOW add to queue
    if (addToCSVQueue(pendingCSVData.fileName, pendingCSVData.recipients)) {
        showNotification('✅ CSV added to queue successfully', 'success');
        
        // Clear pending data
        pendingCSVData = {
            fileName: '',
            recipients: [],
            lines: []
        };
        
        resetUpload();
    } else {
        showNotification('❌ Failed to add CSV to queue', 'error');
    }
}

function resetUpload() {
    document.getElementById('uploadForm').style.display = 'block';
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('csvFile').value = '';
    
    // Clear pending data
    pendingCSVData = {
        fileName: '',
        recipients: [],
        lines: []
    };
}

// MODAL
function showConfirmModal(title, message, onConfirm, onReject, confirmLabel = 'Confirm', rejectLabel = 'Cancel') {
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('modal').classList.add('active');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').innerHTML = message;
    
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.querySelector('.modal-buttons .btn-secondary');
    
    confirmBtn.textContent = confirmLabel;
    cancelBtn.textContent = rejectLabel;
    
    confirmBtn.onclick = () => {
        closeModal();
        if (onConfirm) onConfirm();
    };
    
    cancelBtn.onclick = () => {
        closeModal();
        if (onReject) onReject();
    };
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('modal').classList.remove('active');
}

// NOTIFICATIONS
function setupNotifications() {
    // Close modal on overlay click
    document.getElementById('modalOverlay')?.addEventListener('click', closeModal);
}

function showNotification(message, type = 'info', duration = 3000) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = `notification show type-${type}`;
    
    setTimeout(() => {
        notif.classList.remove('show');
    }, duration);
}

// COACH MARKS


/* ============================== SETTINGS MODAL ============================== */

function setupSettingsModal() {
    const settingsBtn = document.querySelector('[data-section="settings"]');
    const closeSettingsBtn = document.getElementById('settingsCloseBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsOverlay = document.getElementById('settingsModalOverlay');
    const navItems = document.querySelectorAll('.settings-nav-item');
    
    // Open settings on clicking profile option (if implemented in profile tooltip)
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettingsModal);
    }
    
    // Close settings
    closeSettingsBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSettingsModal();
    });
    settingsOverlay?.addEventListener('click', closeSettingsModal);
    
    // Prevent closing when clicking inside modal
    settingsModal?.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Tab navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSettingsSection(section);
            
            // Update active state
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
    
    // Setup email provider actions
    setupEmailProviderForm();
    
    // Setup email selection preference
    setupEmailSelectionPreference();
    
    // Setup security form
    setupSecurityForm();
    
    // Setup delete account
    setupDeleteAccount();
    
    // Load existing providers
    loadEmailProviders();
}

function openSettingsModal() {
    const settingsModal = document.getElementById('settingsModal');
    const settingsOverlay = document.getElementById('settingsModalOverlay');
    settingsModal?.classList.add('active');
    settingsOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Reload email providers to show current lock state
    loadEmailProviders();
}

function closeSettingsModal() {
    const settingsModal = document.getElementById('settingsModal');
    const settingsOverlay = document.getElementById('settingsModalOverlay');
    settingsModal?.classList.remove('active');
    settingsOverlay?.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Update dashboard stat when settings modal closes
    updateMailProviderStat();
}

function switchSettingsSection(section) {
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach(s => s.classList.remove('active'));
    
    const targetSection = document.getElementById(`${section}-section`);
    targetSection?.classList.add('active');
}

function setupEmailProviderForm() {
    const providerTypeSelect = document.getElementById('providerType');
    const smtpFields = document.getElementById('smtpFields');
    const resendFields = document.getElementById('resendFields');
    const outlookFields = document.getElementById('outlookFields');
    const verifyBtn = document.getElementById('verifyProviderBtn');
    const addProviderBtn = document.getElementById('addProviderBtn');
    
    providerTypeSelect?.addEventListener('change', (e) => {
        smtpFields.style.display = 'none';
        resendFields.style.display = 'none';
        outlookFields.style.display = 'none';
        
        if (e.target.value === 'smtp') {
            smtpFields.style.display = 'flex';
        } else if (e.target.value === 'resend') {
            resendFields.style.display = 'flex';
        } else if (e.target.value === 'outlook') {
            outlookFields.style.display = 'flex';
        }
        
        // Reset verification state
        resetVerificationState();
    });
    
    verifyBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        handleVerifyProvider();
    });
    
    addProviderBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        handleAddProvider();
    });
}

function handleVerifyProvider() {
    const providerType = document.getElementById('providerType').value;
    
    if (!providerType) {
        showNotification('Please select a provider type', 'error');
        return;
    }
    
    let providerName, email, credentials;
    
    if (providerType === 'smtp') {
        providerName = document.getElementById('smtpName').value;
        email = document.getElementById('smtpEmail').value;
        const password = document.getElementById('smtpPassword').value;
        
        if (!providerName || !email || !password) {
            showNotification('Please fill in all SMTP fields', 'error');
            return;
        }
        
        credentials = { password };
    } else if (providerType === 'resend') {
        providerName = document.getElementById('resendName').value;
        email = document.getElementById('resendEmail').value;
        const apiKey = document.getElementById('resendApiKey').value;
        
        if (!providerName || !email || !apiKey) {
            showNotification('Please fill in all Resend fields', 'error');
            return;
        }
        
        credentials = { apiKey };
    } else if (providerType === 'outlook') {
        providerName = document.getElementById('outlookName').value;
        email = document.getElementById('outlookEmail').value;
        const password = document.getElementById('outlookPassword').value;
        
        if (!providerName || !email || !password) {
            showNotification('Please fill in all Outlook fields', 'error');
            return;
        }
        
        credentials = { password };
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    // Show verification pending status
    showVerificationPending();
    
    // Create provider object for verification
    const provider = {
        type: providerType,
        name: providerName,
        email: email,
        credentials: credentials
    };
    
    // Send verification request to backend
    verifyProviderWithBackend(provider);
}

function verifyProviderWithBackend(provider) {
    // Backend API Integration Point:
    // Replace the setTimeout below with actual fetch call to your backend
    // 
    // Example:
    // fetch('/api/email-provider/verify', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(provider)
    // })
    // .then(res => res.json())
    // .then(data => {
    //     if (data.verified) {
    //         showVerificationSuccess(provider);
    //     } else {
    //         showVerificationFailed(data.message || 'Test email could not be sent');
    //     }
    // })
    // .catch(err => showVerificationFailed(err.message));
    
    showNotification('Sending verification email...', 'info');
    
    // Simulated backend verification (2-second delay)
    // This will be replaced with actual backend call above
    setTimeout(() => {
        // For demonstration: always succeed
        // In production: response depends on backend verification
        showVerificationSuccess(provider);
    }, 2000);
}

function showVerificationPending() {
    const statusDiv = document.getElementById('verificationStatus');
    const statusMessage = document.getElementById('verificationMessage');
    const verifyBtn = document.getElementById('verifyProviderBtn');
    const addProviderBtn = document.getElementById('addProviderBtn');
    
    statusDiv.style.display = 'block';
    statusDiv.className = 'verification-status pending';
    statusMessage.textContent = '⏳ Verification Pending - Sending test email to your address...';
    
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    addProviderBtn.style.display = 'none';
}

function showVerificationSuccess(provider) {
    const statusDiv = document.getElementById('verificationStatus');
    const statusMessage = document.getElementById('verificationMessage');
    const verifyBtn = document.getElementById('verifyProviderBtn');
    const addProviderBtn = document.getElementById('addProviderBtn');
    
    statusDiv.style.display = 'block';
    statusDiv.className = 'verification-status verified';
    statusMessage.innerHTML = `✅ Verified - Test email sent to <strong>${provider.email}</strong>. You can now add this provider.`;
    
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verified';
    addProviderBtn.style.display = 'block';
    
    // Store verified provider temporarily
    window.verifiedProvider = provider;
    
    showNotification('Credentials verified successfully!', 'success');
}

function showVerificationFailed(message = 'Verification failed') {
    const statusDiv = document.getElementById('verificationStatus');
    const statusMessage = document.getElementById('verificationMessage');
    const verifyBtn = document.getElementById('verifyProviderBtn');
    const addProviderBtn = document.getElementById('addProviderBtn');
    
    statusDiv.style.display = 'block';
    statusDiv.className = 'verification-status failed';
    statusMessage.textContent = `❌ ${message} - Please check your credentials and try again.`;
    
    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Verify Now';
    addProviderBtn.style.display = 'none';
    
    showNotification(message, 'error');
}

function resetVerificationState() {
    const statusDiv = document.getElementById('verificationStatus');
    const verifyBtn = document.getElementById('verifyProviderBtn');
    const addProviderBtn = document.getElementById('addProviderBtn');
    
    statusDiv.style.display = 'none';
    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Verify Now';
    addProviderBtn.style.display = 'none';
    
    window.verifiedProvider = null;
}

function resetEmailProviderForm() {
    document.getElementById('providerType').value = '';
    document.getElementById('smtpName').value = '';
    document.getElementById('smtpEmail').value = '';
    document.getElementById('smtpPassword').value = '';
    document.getElementById('resendName').value = '';
    document.getElementById('resendEmail').value = '';
    document.getElementById('resendApiKey').value = '';
    document.getElementById('outlookName').value = '';
    document.getElementById('outlookEmail').value = '';
    document.getElementById('outlookPassword').value = '';
    document.getElementById('smtpFields').style.display = 'none';
    document.getElementById('resendFields').style.display = 'none';
    document.getElementById('outlookFields').style.display = 'none';
    resetVerificationState();
}

function handleAddProvider() {
    const verifiedProvider = window.verifiedProvider;
    
    if (!verifiedProvider) {
        showNotification('Please verify credentials first', 'error');
        return;
    }
    
    // Add verified ID
    verifiedProvider.id = Date.now();
    verifiedProvider.verified = true;
    
    // Get existing providers
    let providers = JSON.parse(localStorage.getItem('emailProviders') || '[]');
    
    // Check if email already exists
    if (providers.some(p => p.email === verifiedProvider.email)) {
        showNotification('Email already added', 'error');
        return;
    }
    
    // Add provider
    providers.push(verifiedProvider);
    localStorage.setItem('emailProviders', JSON.stringify(providers));
    
    showNotification(`${verifiedProvider.name} added successfully!`, 'success');
    
    // Reset form
    resetEmailProviderForm();
    
    // Reload provider list
    loadEmailProviders();
    
    // Update dashboard stat in real-time
    updateMailProviderStat();
}

function loadEmailProviders() {
    const providersContainer = document.getElementById('providersContainer');
    const providers = JSON.parse(localStorage.getItem('emailProviders') || '[]');
    const selectedEmailProviderId = localStorage.getItem('selectedEmailProvider');
    
    // Check if campaign is actually active - validate the CSV exists and is in progress
    let campaignActive = false;
    const processingId = localStorage.getItem('currentProcessingCSVId');
    if (processingId) {
        const queue = getCSVQueue();
        const processingCSV = queue.find(q => q.id === parseInt(processingId));
        // Only consider campaign active if CSV exists AND is in processing/pending state
        if (processingCSV && (processingCSV.status === 'processing' || processingCSV.status === 'pending')) {
            campaignActive = true;
        } else {
            // CSV doesn't exist or is not in processing state - clear the stuck flag
            console.warn('[EMAIL PROVIDER] Found stuck currentProcessingCSVId - clearing it');
            localStorage.removeItem('currentProcessingCSVId');
            campaignActive = false;
        }
    }
    
    // Disable "Ask me to select email" option if there's only one or no providers
    const emailSelectionRadio = document.querySelector('input[name="emailSelection"][value="prompt"]');
    if (emailSelectionRadio) {
        emailSelectionRadio.disabled = providers.length <= 1 || campaignActive;
        
        // If the radio is now disabled and it's currently selected, switch to "default"
        if (emailSelectionRadio.disabled && emailSelectionRadio.checked) {
            document.querySelector('input[name="emailSelection"][value="default"]').checked = true;
        }
    }
    
    if (providers.length === 0) {
        providersContainer.innerHTML = '<p class="empty-state">No email providers added yet</p>';
        return;
    }
    
    providersContainer.innerHTML = providers.map(provider => {
        const isDefault = String(provider.id) === String(selectedEmailProviderId);
        return `
        <div class="provider-card ${isDefault ? 'default-provider' : ''}${campaignActive ? ' campaign-locked' : ''}" data-provider-id="${provider.id}" style="cursor: ${campaignActive ? 'not-allowed' : 'pointer'}; transition: all 0.3s ease; ${campaignActive ? 'opacity: 0.6; pointer-events: none;' : ''}" title="${campaignActive ? 'Campaign in progress - email provider is locked' : ''}">
            <div class="provider-info">
                <p class="provider-name">${provider.name} (${provider.type.toUpperCase()})${isDefault ? ' ⭐' : ''}</p>
                <p class="provider-email">${provider.email}</p>
                ${campaignActive && isDefault ? '<p style="font-size: 12px; color: #10b981; margin-top: 4px;">🔒 Active in campaign</p>' : ''}
            </div>
            <div class="provider-actions">
                <div class="radio-wrapper">
                    <input type="radio" name="defaultProvider" value="${provider.id}" 
                           ${isDefault ? 'checked' : ''} ${campaignActive ? 'disabled' : ''}>
                </div>
                <button class="delete-btn" onclick="deleteEmailProvider(${provider.id})" ${campaignActive ? 'disabled' : ''} style="${campaignActive ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');
    
    // Add change event to radio buttons (only if campaign not active)
    if (!campaignActive) {
        document.querySelectorAll('input[name="defaultProvider"]').forEach(radio => {
            radio.addEventListener('change', setDefaultProvider);
        });
        
        // Add click handler to provider cards to set as default
        document.querySelectorAll('.provider-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking delete button
                if (e.target.closest('.delete-btn')) {
                    return;
                }
                // Find and click the radio button
                const radio = card.querySelector('input[name="defaultProvider"]');
                if (radio && !radio.disabled) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        });
    }
    
    // Remove any existing lock message before potentially adding a new one
    const existingLockMessage = providersContainer.parentElement.querySelector('#campaignLockMessage');
    if (existingLockMessage) {
        existingLockMessage.remove();
    }
    
    // Show locked message only if campaign is active
    if (campaignActive) {
        const lockMessage = document.createElement('div');
        lockMessage.id = 'campaignLockMessage';
        lockMessage.style.cssText = 'background: #1a3a3a; border: 1px solid #10b981; padding: 12px; border-radius: 6px; margin-bottom: 16px; color: #10b981; font-size: 13px; display: flex; align-items: center; gap: 8px;';
        lockMessage.innerHTML = '<i class="fas fa-lock"></i> <strong>Email providers are locked during campaign.</strong> Stop or complete the campaign to change providers.';
        providersContainer.parentElement.insertBefore(lockMessage, providersContainer);
    }
}

function deleteEmailProvider(providerId) {
    if (confirm('Are you sure you want to delete this email provider?')) {
        let providers = JSON.parse(localStorage.getItem('emailProviders') || '[]');
        providers = providers.filter(p => p.id !== providerId);
        localStorage.setItem('emailProviders', JSON.stringify(providers));
        
        showNotification('Email provider deleted', 'success');
        loadEmailProviders();
        
        // Update dashboard stat in real-time
        updateMailProviderStat();
    }
}

function setDefaultProvider(e) {
    // Check if campaign is currently active
    const campaignActive = !!localStorage.getItem('currentProcessingCSVId');
    
    if (campaignActive) {
        e.target.checked = false; // Prevent the change
        showNotification('⛔ Cannot change email provider while campaign is running. Please stop the campaign first.', 'error');
        console.warn('[EMAIL PROVIDER] Attempt to change provider during active campaign - BLOCKED');
        return;
    }
    
    const selectedProviderId = e.target.value;
    const providers = JSON.parse(localStorage.getItem('emailProviders') || '[]');
    const selectedProvider = providers.find(p => String(p.id) === String(selectedProviderId));
    
    if (selectedProvider) {
        // Store the selected provider ID in localStorage
        localStorage.setItem('selectedEmailProvider', selectedProviderId);
        
        // Show toast notification
        showNotification(`✅ ${selectedProvider.name} is now set as default email provider!`, 'success');
        
        console.log('[EMAIL PROVIDER] Default provider set to:', selectedProvider.name, selectedProviderId);
        
        // Reload the provider list to update UI with star indicator
        loadEmailProviders();
        
        // Update dashboard stat in real-time
        updateMailProviderStat();
    }
}

function setupSecurityForm() {
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordUpdate);
    }
}

function setupEmailSelectionPreference() {
    // Load saved preference from localStorage
    const savedPreference = localStorage.getItem('emailSelectionPreference');
    if (savedPreference) {
        const radio = document.querySelector(`input[name="emailSelection"][value="${savedPreference}"]`);
        if (radio) {
            radio.checked = true;
        }
    }

    // Add event listeners to save preference when changed
    const emailSelectionRadios = document.querySelectorAll('input[name="emailSelection"]');
    emailSelectionRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                localStorage.setItem('emailSelectionPreference', e.target.value);
                showNotification(`✅ Email preference set to: ${e.target.value === 'prompt' ? 'Ask me' : 'Default'}`, 'success');
            }
        });
    });
}

function handlePasswordUpdate(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const repeatPassword = document.getElementById('repeatPassword').value;
    
    if (!currentPassword || !newPassword || !repeatPassword) {
        showNotification('Please fill in all password fields', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('New password must be at least 6 characters', 'error');
        return;
    }
    
    if (newPassword !== repeatPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    // Verify current password
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.password !== currentPassword) {
        showNotification('Current password is incorrect', 'error');
        return;
    }
    
    // Update password
    user.password = newPassword;
    localStorage.setItem('user', JSON.stringify(user));
    
    showNotification('Password updated successfully', 'success');
    document.getElementById('passwordForm').reset();
}

function setupDeleteAccount() {
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteAccountClick);
    }
}

function handleDeleteAccountClick() {
    const confirmed = confirm(
        'Are you absolutely sure you want to delete your account? This cannot be undone.\n\n' +
        'All your data, campaigns, and email providers will be permanently deleted.'
    );
    
    if (confirmed) {
        const doubleConfirmed = confirm('Type "DELETE" in the next prompt to confirm account deletion.');
        if (doubleConfirmed) {
            // Clear all data
            localStorage.clear();
            
            showNotification('Account deleted successfully', 'success');
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    }
}

/* ============================== LOGGING & TERMINAL ============================== */

function addTerminalLog(message, type = 'info') {
    const logsList = document.getElementById('logsList');
    const terminalContent = logsList?.querySelector('.terminal-content');
    
    if (!terminalContent) return;
    
    const logLine = document.createElement('p');
    logLine.className = `terminal-line terminal-${type}`;
    logLine.textContent = message;
    
    terminalContent.appendChild(logLine);
    
    // Auto-scroll to bottom
    logsList.scrollTop = logsList.scrollHeight;
    
    // Save to current logs
    saveCurrentSessionLog(message, type);
}

function updateCurrentRunningCSV() {
    const currentRunningDiv = document.getElementById('currentRunningCSV');
    
    // Element removed from dashboard - safely exit if it doesn't exist
    if (!currentRunningDiv) {
        return;
    }
    
    const queue = getCSVQueue();
    
    // First, check if there's a campaign currently running
    let currentCSV = null;
    const processingId = localStorage.getItem('currentProcessingCSVId');
    
    if (processingId) {
        // Campaign is running - show the processing CSV
        currentCSV = queue.find(q => q.id === parseInt(processingId));
    } else {
        // No campaign running - show the first pending CSV in queue
        currentCSV = queue.find(q => q.status === 'pending');
    }
    
    // If no CSV found, show empty state
    if (!currentCSV) {
        currentRunningDiv.innerHTML = `
            <div class="running-csv-empty">
                <i class="fas fa-inbox"></i>
                <p>No CSV in queue</p>
            </div>
        `;
        return;
    }
    
    // Get the currently selected email provider - convert string ID to number for comparison
    const selectedEmailProviderId = localStorage.getItem('selectedEmailProvider');
    const emailProviders = JSON.parse(localStorage.getItem('emailProviders') || '[]');
    const selectedProvider = emailProviders.find(p => String(p.id) === String(selectedEmailProviderId));
    const providerDisplay = selectedProvider ? `${selectedProvider.name}` : 'Not selected';
    
    // Two side-by-side rectangles design - always show CSV in queue
    currentRunningDiv.innerHTML = `
        <div class="running-csv-cards">
            <div class="csv-card">
                <div class="csv-card-label">File</div>
                <div class="csv-card-value">${currentCSV.name}</div>
            </div>
            <div class="csv-card">
                <div class="csv-card-label">Email Provider</div>
                <div class="csv-card-value">${providerDisplay}</div>
            </div>
        </div>
    `;
}

/**
 * Restore campaign running state after page reload
 * If a campaign was running before reload, restore the Stop button display
 */
function restoreCampaignStateOnReload() {
    const currentProcessingId = localStorage.getItem('currentProcessingCSVId');
    
    if (!currentProcessingId) {
        // No campaign was running - ensure Start button is visible
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (pauseBtn) pauseBtn.style.display = 'none';
        return;
    }
    
    // Campaign was running before reload - restore the UI
    console.log('[DEBUG] Restoring campaign state for CSV ID:', currentProcessingId);
    
    // Verify the CSV still exists in queue and is valid
    const queue = getCSVQueue();
    const currentCSV = queue.find(q => q.id === parseInt(currentProcessingId));
    
    if (!currentCSV) {
        console.warn('[DEBUG] CSV not found in queue - campaign appears to be orphaned, clearing state');
        localStorage.removeItem('currentProcessingCSVId');
        localStorage.removeItem('csvProgress');
        localStorage.removeItem('csvStoppedAt');
        
        // Show Start button
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (pauseBtn) pauseBtn.style.display = 'none';
        return;
    }
    
    // Show Pause button and campaign running status
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const campaignStatus = document.getElementById('campaignStatus');
    
    // Check if campaign is paused
    const isPaused = localStorage.getItem('campaignPaused') === 'true';
    const pausedRow = parseInt(localStorage.getItem('campaignPausedRow') || '0');
    
    // Restore elapsed time from localStorage if paused
    if (isPaused) {
        const storedElapsedMS = parseInt(localStorage.getItem('campaignElapsedTimeMS') || '0');
        if (storedElapsedMS > 0) {
            campaignElapsedTime = storedElapsedMS;
        }
        
        // Show the paused timer
        const timerDisplay = document.getElementById('campaignTimer');
        if (timerDisplay && campaignElapsedTime > 0) {
            const seconds = Math.floor(campaignElapsedTime / 1000);
            const milliseconds = Math.floor((campaignElapsedTime % 1000) / 100);
            timerDisplay.textContent = `⏸️ ${seconds}.${milliseconds}s (paused)`;
        }
    }
    
    if (isPaused) {
        // Campaign is paused - show Start button to allow resume
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (campaignStatus) {
            campaignStatus.textContent = `⏸️ Paused at row ${pausedRow}`;
            campaignStatus.className = 'campaign-status paused';
        }
    } else {
        // Campaign is running - show Pause button
        if (startBtn) startBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'inline-flex';
        if (campaignStatus) {
            campaignStatus.textContent = 'Campaign running...';
            campaignStatus.className = 'campaign-status running';
        }
    }
    
    console.log('[DEBUG] Campaign state restored - isPaused:', isPaused, 'pausedRow:', pausedRow);
}

/**
 * Restore terminal logs on page reload
 * Restores all campaign logs that were saved to localStorage
 */
function restoreTerminalLogs() {
    const sessionLogs = JSON.parse(localStorage.getItem('currentSessionLogs') || '{}');
    
    // If no logs exist, nothing to restore
    if (!sessionLogs.logs || sessionLogs.logs.length === 0) {
        console.log('[DEBUG] No logs to restore from localStorage');
        return;
    }
    
    const logsList = document.getElementById('logsList');
    const terminalContent = logsList?.querySelector('.terminal-content');
    
    if (!terminalContent) {
        console.log('[DEBUG] Terminal content element not found, cannot restore logs');
        return;
    }
    
    console.log('[DEBUG] Restoring', sessionLogs.logs.length, 'terminal logs from localStorage');
    
    // Render all saved logs into the terminal
    sessionLogs.logs.forEach(log => {
        const logLine = document.createElement('p');
        logLine.className = `terminal-line terminal-${log.type}`;
        logLine.textContent = log.message;
        terminalContent.appendChild(logLine);
    });
    
    // Auto-scroll to bottom
    if (logsList) {
        logsList.scrollTop = logsList.scrollHeight;
    }
    
    console.log('[DEBUG] Terminal logs restored successfully');
}

function startCSVLogging(csvName) {
    const timestamp = new Date().toLocaleString();
    
    // Store campaign start time for calculating time elapsed
    localStorage.setItem('campaignStartTime', Date.now().toString());
    
    // Get existing logs (if any) to preserve them
    const existingLogs = JSON.parse(localStorage.getItem('currentSessionLogs') || '{}');
    const preservedLogs = existingLogs.logs || [];
    
    addTerminalLog(`\n========== NEW CAMPAIGN STARTED ==========`, 'status');
    addTerminalLog(`CSV File: ${csvName}`, 'info');
    addTerminalLog(`Started at: ${timestamp}`, 'info');
    addTerminalLog(`========================================\n`, 'status');
    
    // Initialize session logs with CSV name, but preserve existing logs
    const sessionLogs = {
        csvName: csvName,
        startTime: timestamp,
        logs: preservedLogs, // Keep existing logs, new ones will be appended by addTerminalLog
        errors: [],
        successCount: 0,
        failureCount: 0
    };
    
    localStorage.setItem('currentSessionLogs', JSON.stringify(sessionLogs));
}

function saveCurrentSessionLog(message, type) {
    const sessionLogs = JSON.parse(localStorage.getItem('currentSessionLogs') || '{}');
    
    if (!sessionLogs.logs) {
        sessionLogs.logs = [];
    }
    
    sessionLogs.logs.push({
        timestamp: new Date().toLocaleString(),
        message: message,
        type: type
    });
    
    localStorage.setItem('currentSessionLogs', JSON.stringify(sessionLogs));
}

/* ============================== EMAIL SELECTION ============================== */

function showEmailSelectionModal() {
    const emailProviders = JSON.parse(localStorage.getItem('emailProviders') || '[]');
    const listContainer = document.getElementById('emailProvidersList');
    
    // Clear previous content
    listContainer.innerHTML = '';
    
    // Create radio options for each provider
    emailProviders.forEach((provider, index) => {
        const label = document.createElement('label');
        label.className = 'email-option';
        label.innerHTML = `
            <input type="radio" name="campaignEmail" value="${provider.id}" ${index === 0 ? 'checked' : ''}>
            <div class="email-option-content">
                <span class="email-name">${provider.name} (${provider.type.toUpperCase()})</span>
            </div>
        `;
        listContainer.appendChild(label);
    });
    
    // Show modal
    document.getElementById('emailSelectionOverlay').style.display = 'block';
    document.getElementById('emailSelectionModal').style.display = 'block';
}

function confirmEmailSelection() {
    const selected = document.querySelector('input[name="campaignEmail"]:checked');
    
    if (!selected) {
        showNotification('Please select an email provider', 'error');
        return;
    }
    
    console.log('[EMAIL SELECTION] User confirmed email:', selected.value);
    
    // Store selected email provider
    localStorage.setItem('selectedEmailProvider', selected.value);
    
    // Close modal
    document.getElementById('emailSelectionOverlay').style.display = 'none';
    document.getElementById('emailSelectionModal').style.display = 'none';
    
    // Continue with campaign start
    console.log('[DEBUG] Calling proceedWithCampaignStart() from confirmEmailSelection()');
    proceedWithCampaignStart();
}

function cancelEmailSelection() {
    document.getElementById('emailSelectionOverlay').style.display = 'none';
    document.getElementById('emailSelectionModal').style.display = 'none';
}

function proceedWithCampaignStart() {
    console.log('[DEBUG] proceedWithCampaignStart() called');
    
    // Check if a campaign is ACTIVELY running - prevent concurrent starts
    // Allow if paused (resume scenario)
    const currentProcessingId = localStorage.getItem('currentProcessingCSVId');
    const campaignPausedState = localStorage.getItem('campaignPaused') === 'true';
    
    if (currentProcessingId && !campaignPausedState) {
        console.log('[DEBUG] Campaign already running with CSV ID:', currentProcessingId);
        showNotification('A campaign is already running. Please stop it first.', 'warning');
        return;
    }
    
    // This continues the campaign start process after email selection (if needed)
    const recipients = JSON.parse(localStorage.getItem('recipients') || '[]');
    const subject = document.getElementById('emailSubject')?.value?.trim();
    const body = document.getElementById('emailBody')?.value?.trim();
    const sendTo = document.getElementById('sendToOption')?.value || 'all';
    const selectedEmailProviderId = localStorage.getItem('selectedEmailProvider');
    
    console.log('[DEBUG] Subject:', subject ? 'Present' : 'MISSING');
    console.log('[DEBUG] Body:', body ? 'Present' : 'MISSING');
    console.log('[DEBUG] Recipients count:', recipients.length);
    console.log('[DEBUG] Selected Email Provider ID:', selectedEmailProviderId);
    
    // Validate range if needed
    if (sendTo === 'range') {
        const rangeFrom = parseInt(document.getElementById('rangeFrom')?.value || 0);
        const rangeTo = parseInt(document.getElementById('rangeTo')?.value || 0);
        
        if (rangeFrom < 1 || rangeTo < rangeFrom || rangeTo > recipients.length) {
            showNotification('Invalid range selected', 'error');
            return;
        }
    }
    
    // Check if resuming from paused campaign
    const isPaused = localStorage.getItem('campaignPaused') === 'true';
    const pausedProviderLock = localStorage.getItem('campaignEmailProvider');
    const wasResuming = isPaused;  // Save resume state for later use
    const pausedRow = parseInt(localStorage.getItem('campaignPausedRow') || '0');
    let startingRow = 0;
    
    if (isPaused && pausedProviderLock && pausedProviderLock !== 'undefined') {
        // Validate provider matches
        if (pausedProviderLock !== selectedEmailProviderId) {
            showConfirmModal(
                '⚠️ Provider Mismatch',
                `Campaign was paused with ${pausedProviderLock}, but you're trying to resume with ${selectedEmailProviderId}. 
                
Do you want to:
- Resume: Continue from row ${localStorage.getItem('campaignPausedRow')} with the current provider (might cause issues)
- Reset: Start fresh with the current provider`,
                () => {
                    // Resume anyway (user's responsibility)
                    proceedWithCampaignResume();
                },
                () => {
                    // Reset and start fresh
                    localStorage.removeItem('campaignPaused');
                    localStorage.removeItem('campaignPausedRow');
                    localStorage.removeItem('campaignEmailProvider');
                    const providerSelect = document.getElementById('providerType');
                    if (providerSelect) providerSelect.disabled = false;
                    proceedWithCampaignStart(); // Restart the process
                },
                'Resume Anyway',
                'Start Fresh'
            );
            return;
        }
        // Provider matches, proceed with resume
        startingRow = parseInt(localStorage.getItem('campaignPausedRow') || '0');
        console.log('[DEBUG] Resuming paused campaign from row:', startingRow);
    }
    
    // Find first PENDING CSV to process (not completed)
    // Also accept 'processing' CSVs for retry scenarios
    const queue = getCSVQueue();
    const processingItem = queue.find(q => q.status === 'pending' || q.status === 'processing');
    
    if (processingItem) {
        // Check if user is trying to start a DIFFERENT CSV than the paused one
        const pausedCSVId = parseInt(currentProcessingId);
        if (isPaused && processingItem.id !== pausedCSVId) {
            // User wants to start a new campaign, not resume the paused one
            console.log('[DEBUG] User starting NEW campaign with different CSV - clearing paused state');
            localStorage.removeItem('campaignPaused');
            localStorage.removeItem('campaignPausedRow');
            localStorage.removeItem('campaignEmailProvider');
            localStorage.removeItem('currentProcessingCSVId');
            startingRow = 0;
            const providerSelect = document.getElementById('providerType');
            if (providerSelect) providerSelect.disabled = false;
        }
        
        setCSVProcessing(processingItem.id);
        localStorage.setItem('currentProcessingCSVId', processingItem.id);
        localStorage.setItem('csvProgress', startingRow.toString());
        
        // Only clear pause state if starting fresh (not resuming)
        if (!isPaused) {
            localStorage.removeItem('csvStoppedAt'); // Clear any previous stopped time
        }
        
        console.log('[DEBUG] CSV marked as processing:', processingItem.id);
        
        // Log campaign start
        startCSVLogging(processingItem.name);
        
        // Update UI
        updateCurrentRunningCSV();
        updateCSVQueueDisplay();
        
        // Log activity
        activityLog.add(`Campaign started: ${processingItem.name} (${processingItem.recipientCount} recipients)`, 'campaign-start', 'play-circle');
        
        // Show campaign running state - with better element handling
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const campaignStatus = document.getElementById('campaignStatus');
        
        console.log('[DEBUG] Elements found - startBtn:', !!startBtn, 'pauseBtn:', !!pauseBtn, 'campaignStatus:', !!campaignStatus);
        
        if (startBtn) startBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'inline-flex';
        if (campaignStatus) {
            // Show if resuming from paused state or starting fresh
            if (wasResuming) {
                campaignStatus.textContent = `Resuming from row ${pausedRow}...`;
            } else {
                campaignStatus.textContent = 'Campaign running...';
            }
            campaignStatus.className = 'campaign-status running';
        }
        
        // Update button icons for running state
        updateCampaignButtonIcons('running');
        
        console.log('[DEBUG] Button display updated - pauseBtn visibility should now be inline-flex');
        showNotification('Campaign started successfully!', 'success');
        
        // Send actual email campaign to backend
        sendCampaignToBackend({
            subject: subject,
            body: body,
            recipientFilter: sendTo,
            recipients: recipients,
            emailProviderId: selectedEmailProviderId
        });
        
        // NOTE: Progress stays at 0 since there's no real backend actually sending emails
        // In a real scenario with actual email sending, this would increment based on send progress
        
        // Clear any existing timeout
        if (campaignTimeoutId) {
            clearTimeout(campaignTimeoutId);
            campaignTimeoutId = null;
        }
        
        // SAFETY CHECK: Ensure campaign is not paused before setting new timeout
        // This prevents infinite loop if pause flag wasn't properly cleared during resume
        // Note: wasResuming and pausedRow were already captured at function start
        
        localStorage.removeItem('campaignPaused');
        localStorage.removeItem('campaignPausedRow');
        
        // Start the timer display - pass whether this was a resume to preserve elapsed time
        startCampaignTimer(wasResuming);
        
        // Calculate timeout duration:
        // - If resuming: use remaining time (don't add another 10 seconds)
        // - If starting fresh: use full 10 seconds
        const CAMPAIGN_TOTAL_TIME = 10000; // 10 seconds total
        let timeoutDuration = CAMPAIGN_TOTAL_TIME;
        
        if (wasResuming) {
            // If resuming, calculate remaining time
            timeoutDuration = Math.max(100, CAMPAIGN_TOTAL_TIME - campaignElapsedTime);
            console.log('[DEBUG] Resuming campaign - elapsed:', campaignElapsedTime, 'remaining:', timeoutDuration);
        } else {
            console.log('[DEBUG] Starting fresh campaign - timeout:', timeoutDuration);
        }
        
        // Set new timeout and store the ID
        campaignTimeoutId = setTimeout(() => {
            // Check if campaign was paused during execution (user manually paused)
            // Note: We cleared the pause flag above, so this is only true if paused AFTER starting
            const isPaused = localStorage.getItem('campaignPaused') === 'true';
            if (!isPaused) {
                // Store the stopped time when campaign completes
                const stoppedTime = new Date().toLocaleString();
                localStorage.setItem('csvStoppedAt', stoppedTime);
                
                // Call completion handler
                onCampaignComplete();
                
                // Update UI to show stopped time
                updateCurrentRunningCSV();
            }
            campaignTimeoutId = null;
        }, timeoutDuration);
    } else {
        console.log('[DEBUG] ERROR: No pending CSV found in queue!');
        showNotification('No CSV available to process. Please upload a CSV first.', 'error');
    }
}

/**
 * Handle resuming a campaign from paused state
 */
function proceedWithCampaignResume() {
    console.log('[DEBUG] proceedWithCampaignResume() called');
    
    // NOTE: Do NOT clear pause state here - proceedWithCampaignStart() will handle it
    // If we clear the flag now, proceedWithCampaignStart() will think a campaign is already running
    
    // Re-enable provider selector after successful resume start
    setTimeout(() => {
        const providerSelect = document.getElementById('providerType');
        if (providerSelect) providerSelect.disabled = false;
    }, 1000);
    
    const pausedRow = parseInt(localStorage.getItem('campaignPausedRow') || '0');
    const csvName = localStorage.getItem('currentProcessingCSVId');
    
    activityLog.add(
        `Campaign resumed from row ${pausedRow}`,
        'campaign-resume',
        'play-circle'
    );
    
    showNotification(`Resuming campaign from row ${pausedRow}`, 'info');
    
    // Call normal start procedure which will use the stored progress
    proceedWithCampaignStart();
}

/**
 * Send campaign to backend API
 * @param {object} campaignData - Campaign data to send
 */
async function sendCampaignToBackend(campaignData) {
    try {
        console.log('[DEBUG] Sending campaign to backend:', campaignData);
        
        // Check if backend API function is available
        if (typeof apiCall === 'undefined' || typeof API_ENDPOINTS === 'undefined') {
            console.log('[DEBUG] Backend API not available - simulating send');
            addTerminalLog('✓ Campaign data prepared (backend not connected)', 'info');
            return;
        }
        
        const response = await apiCall(API_ENDPOINTS.EMAIL_SEND, {
            method: 'POST',
            body: JSON.stringify(campaignData),
        });
        
        console.log('[DEBUG] Campaign send response:', response);
        
        if (response && response.success) {
            console.log('[DEBUG] Campaign sent successfully to backend');
            addTerminalLog('✓ Campaign sent to backend successfully', 'success');
        } else {
            console.log('[DEBUG] Campaign send failed:', response);
            addTerminalLog('✗ Failed to send campaign to backend', 'error');
        }
    } catch (error) {
        console.error('[DEBUG] Error sending campaign to backend:', error);
        addTerminalLog(`✗ Error: ${error.message}`, 'error');
    }
}

function logEmailStatus(email, status, message) {
    const type = status === 'success' ? 'success' : 'error';
    const icon = status === 'success' ? '✓' : '✗';
    addTerminalLog(`${icon} ${email} - ${message}`, type);
    
    // Update counts
    const sessionLogs = JSON.parse(localStorage.getItem('currentSessionLogs') || '{}');
    if (status === 'success') {
        sessionLogs.successCount = (sessionLogs.successCount || 0) + 1;
    } else {
        sessionLogs.failureCount = (sessionLogs.failureCount || 0) + 1;
        if (!sessionLogs.errors) sessionLogs.errors = [];
        sessionLogs.errors.push({
            email: email,
            message: message,
            timestamp: new Date().toLocaleString()
        });
    }
    localStorage.setItem('currentSessionLogs', JSON.stringify(sessionLogs));
    
    // Add activity log entry every 10 emails or on error
    const totalProcessed = (sessionLogs.successCount || 0) + (sessionLogs.failureCount || 0);
    if (status === 'error') {
        activityLog.add(`Email failed: ${email}`, 'email-fail', 'exclamation-triangle');
    } else if (totalProcessed > 0 && totalProcessed % 10 === 0) {
        const failed = sessionLogs.failureCount || 0;
        const failedInfo = failed > 0 ? ` (${failed} failed)` : '';
        activityLog.add(`${totalProcessed} emails sent successfully${failedInfo}`, 'email-sent', 'envelope');
    }
    
    updateDashboardStats(); // Update stats when email is logged
}

function endCSVLogging(csvId) {
    const sessionLogs = JSON.parse(localStorage.getItem('currentSessionLogs') || '{}');
    const endTime = new Date().toLocaleString();
    
    sessionLogs.endTime = endTime;
    
    addTerminalLog(`\n========== CAMPAIGN COMPLETED ==========`, 'status');
    addTerminalLog(`Completed at: ${endTime}`, 'info');
    addTerminalLog(`Successful: ${sessionLogs.successCount || 0}`, 'success');
    addTerminalLog(`Failed: ${sessionLogs.failureCount || 0}`, (sessionLogs.failureCount || 0) > 0 ? 'error' : 'info');
    addTerminalLog(`========================================\n`, 'status');
    
    // Update lifetime stats for dashboard
    const lifetimeStats = JSON.parse(localStorage.getItem('lifetimeStats') || '{"totalSent": 0, "totalSuccess": 0, "totalFailed": 0}');
    lifetimeStats.totalSent += (sessionLogs.successCount || 0) + (sessionLogs.failureCount || 0);
    lifetimeStats.totalSuccess += (sessionLogs.successCount || 0);
    lifetimeStats.totalFailed += (sessionLogs.failureCount || 0);
    localStorage.setItem('lifetimeStats', JSON.stringify(lifetimeStats));
    
    console.log('[DEBUG] Lifetime stats updated:', lifetimeStats);
    
    // Clear campaign start time
    localStorage.removeItem('campaignStartTime');
    
    // Save logs to file (localStorage with CSV filename)
    const csvName = sessionLogs.csvName || 'campaign';
    const logFileName = `${csvName.replace('.csv', '')}.log`;
    
    const logsData = {
        fileName: logFileName,
        csvName: sessionLogs.csvName,
        startTime: sessionLogs.startTime,
        endTime: endTime,
        successCount: sessionLogs.successCount || 0,
        failureCount: sessionLogs.failureCount || 0,
        errors: sessionLogs.errors || [],
        allLogs: sessionLogs.logs || []
    };
    
    // Save to all logs history
    let allCSVLogs = JSON.parse(localStorage.getItem('allCSVLogs') || '[]');
    allCSVLogs.push(logsData);
    localStorage.setItem('allCSVLogs', JSON.stringify(allCSVLogs));
    
    // Clear current session
    localStorage.removeItem('currentSessionLogs');
}

function loadLogsFromFile(csvName) {
    const allCSVLogs = JSON.parse(localStorage.getItem('allCSVLogs') || '[]');
    const logFile = allCSVLogs.find(log => log.csvName === csvName);
    
    if (logFile) {
        const logsList = document.getElementById('logsList');
        const terminalContent = logsList?.querySelector('.terminal-content');
        
        if (terminalContent) {
            terminalContent.innerHTML = '';
            
            logFile.allLogs.forEach(log => {
                const logLine = document.createElement('p');
                logLine.className = `terminal-line terminal-${log.type}`;
                logLine.textContent = `[${log.timestamp}] ${log.message}`;
                terminalContent.appendChild(logLine);
            });
            
            logsList.scrollTop = logsList.scrollHeight;
        }
    }
}

function clearTerminalLogs() {
    const logsList = document.getElementById('logsList');
    const terminalContent = logsList?.querySelector('.terminal-content');
    
    if (terminalContent) {
        // Count logs before clearing
        const logsCount = terminalContent.querySelectorAll('.terminal-line').length;
        
        terminalContent.innerHTML = '<p class="terminal-line terminal-info">$ System ready...</p>';
        logsList.scrollTop = 0;
        
        // Show proper toast notification
        const message = logsCount > 1 
            ? `✓ Cleared ${logsCount - 1} log entries` 
            : `✓ Terminal cleared`;
        showNotification(message, 'success');
    }
}

