// App Initialization & Authentication

// Global variable to track campaign completion timeout
let campaignTimeoutId = null;

// Timer tracking variables
let campaignStartTime = null;          // When campaign started (timestamp)
let campaignTimerIntervalId = null;   // Interval for timer display update
let campaignElapsedTime = 0;          // Total elapsed time in milliseconds (preserved during pause)

function checkAuth() {
    // Check if user has valid JWT token (primary authentication check)
    const token = localStorage.getItem('jwt_token');
    
    if (!token || token === '' || token === 'null' || token === null) {
        // Not authenticated - redirect to auth page
        window.location.href = 'auth.html';
        return false;
    }
    
    return true;
}

/**
 * Prevent back button navigation to landing page or auth page
 * When user is logged in, they should stay in the app
 */
function preventBackNavigation() {
    // Push a state to history to prevent going back to previous pages
    window.history.pushState(null, null, window.location.href);
    
    // Listen for back button attempt
    window.addEventListener('popstate', function(event) {
        // If user is still authenticated, don't allow going back
        if (isAuthenticated && isAuthenticated()) {
            // Push the app page again to prevent going back
            window.history.pushState(null, null, window.location.href);
            
            // Optional: Show a notification
            console.log('Back navigation prevented - user is logged in');
        } else {
            // User is not authenticated, allow normal navigation
            window.location.href = 'auth.html';
        }
    });
}

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication - if not authenticated, checkAuth() will redirect
    if (!checkAuth()) {
        return; // Stop initialization if not authenticated
    }
    
    // Prevent back button navigation to landing/auth pages
    preventBackNavigation();
    
    // User is authenticated, safe to initialize the app
    initilizeApp();
});

function initilizeApp() {
    setupSidebar();
    setupForms();
    setupNotifications();
    setupSettingsModal();
    setupSecurityForm();
    setupDeleteAccount();
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
    loadUserAvatarOnInit(); // Load avatar on page initialization
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
    
    // Load user name - check multiple sources
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const displayName = user.name || user.fullName || userData.fullName || userData.name || 'User';
    userNameDisplay.textContent = displayName;
    
    // Load sidebar avatar from backend
    loadSidebarAvatarFromBackend();
    
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
    profileImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (event) => {
            profileImage.src = event.target.result;
        };
        reader.readAsDataURL(file);

        // Upload to backend
        uploadAvatarToBackend(file);
    });

    // Save profile
    profileEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = profileDisplayName.value.trim();
        
        if (!name) {
            showNotification('Please enter your name', 'error');
            return;
        }

        // Prepare update data
        const updateData = {
            fullName: name
        };
        
        // Show loading state
        const submitBtn = profileEditForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        // Send to backend
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await apiCall(`${API_BASE_URL}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            
            // Success - update locally
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.name = name;
            user.fullName = name;
            localStorage.setItem('user', JSON.stringify(user));

            // Update profile button display
            if (document.getElementById('userNameDisplay')) {
                document.getElementById('userNameDisplay').textContent = name;
            }

            showNotification('Profile updated successfully', 'success');
            closeProfileModal();
        } catch (error) {
            // Error - still update locally
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.name = name;
            localStorage.setItem('user', JSON.stringify(user));
            if (document.getElementById('userNameDisplay')) {
                document.getElementById('userNameDisplay').textContent = name;
            }
            
            showNotification('Profile updated (offline mode)', 'success');
            closeProfileModal();
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
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

/**
 * Upload avatar file to backend
 */
async function uploadAvatarToBackend(file) {
    // Validate file
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
        showNotification('File size exceeds 5MB limit', 'error');
        return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showNotification('Invalid image format. Use JPG, PNG, GIF, or WebP', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('jwt_token');
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/users/avatar/upload`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            showNotification(error.error || 'Avatar upload failed', 'error');
            return;
        }

        const result = await response.json();
        
        // Store the storage path in user object
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.avatarStoragePath = result.avatarStoragePath;
        localStorage.setItem('user', JSON.stringify(user));

        // Update sidebar and profile modal with the new avatar
        updateSidebarAvatar(result.publicUrl);
        
        const profileImageElement = document.getElementById('profileImage');
        if (profileImageElement) {
            profileImageElement.src = result.publicUrl;
        }

        showNotification('Avatar uploaded successfully', 'success');
    } catch (error) {
        console.error('Avatar upload error:', error);
        showNotification('Failed to upload avatar', 'error');
    }
}

async function loadProfileData() {
    // Get user data from localStorage
    const token = localStorage.getItem('jwt_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    
    // Load from localStorage (cached data) - try both keys
    const displayName = user.name || user.fullName || userData.fullName || userData.name || '';
    const email = user.email || userData.email || '';
    
    if (document.getElementById('profileDisplayName')) {
        document.getElementById('profileDisplayName').value = displayName;
    }
    if (document.getElementById('profileEmail')) {
        document.getElementById('profileEmail').value = email;
    }
    
    // Fetch fresh user data from backend if token exists
    if (token) {
        try {
            const response = await apiCall(`${API_BASE_URL}/users/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
            
            if (response) {
                console.log('Profile data response:', response);  // Debug log
                // Update form with fresh data
                if (document.getElementById('profileDisplayName')) {
                    document.getElementById('profileDisplayName').value = response.fullName || response.name || '';
                }
                if (document.getElementById('profileEmail')) {
                    document.getElementById('profileEmail').value = response.email || '';
                }
                
                // Update localStorage cache
                const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
                cachedUser.name = response.fullName || response.name;
                cachedUser.email = response.email;
                cachedUser.fullName = response.fullName;
                cachedUser.avatarStoragePath = response.avatarStoragePath;
                localStorage.setItem('user', JSON.stringify(cachedUser));

                // Display avatar if available
                if (response.avatarStoragePath) {
                    const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatar_img/${response.avatarStoragePath}`;
                    console.log('Loading avatar from profile data:', avatarUrl);  // Debug log
                    const profileImageElement = document.getElementById('profileImage');
                    if (profileImageElement) {
                        profileImageElement.src = avatarUrl;
                    }
                    updateSidebarAvatar(avatarUrl);
                }
            }
        } catch (error) {
            console.log('Failed to load profile data:', error);
        }
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

/**
 * Load user avatar from backend on page initialization
 */
async function loadUserAvatarOnInit() {
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) return;
        
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Avatar init response:', result);  // Debug log
            if (result && result.avatarStoragePath) {
                const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatar_img/${result.avatarStoragePath}`;
                console.log('Loading avatar from init:', avatarUrl);  // Debug log
                updateSidebarAvatar(avatarUrl);
            }
        }
    } catch (error) {
        console.error('Failed to load avatar on init:', error);
    }
}

/**
 * Load sidebar avatar from backend (called during profile menu setup)
 */
async function loadSidebarAvatarFromBackend() {
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) return;
        
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Avatar sidebar response:', result);  // Debug log
            if (result && result.avatarStoragePath) {
                const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatar_img/${result.avatarStoragePath}`;
                console.log('Loading sidebar avatar:', avatarUrl);  // Debug log
                updateSidebarAvatar(avatarUrl);
            }
        }
    } catch (error) {
        console.error('Failed to load sidebar avatar:', error);
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
        const queue = getCSVQueue();
        const csvAvailable = queue.some(q => q.status === 'pending' || q.status === 'processing');
        
        // If custom range is selected but no CSV is available, show warning and reset to 'all'
        if (e.target.value === 'range' && !csvAvailable) {
            showNotification('❌ Please upload a CSV file first before using custom range', 'warning');
            e.target.value = 'all';
            document.getElementById('rangeInputs').style.display = 'none';
            return;
        }
        
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
    
    // Load CSV files from backend (sync with database, not just localStorage)
    loadCSVQueueFromBackend();

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

async function handleSaveDraft() {
    const subject = document.getElementById('emailSubject')?.value?.trim();
    const body = document.getElementById('emailBody')?.value?.trim();
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const originalText = saveDraftBtn?.textContent;

    if (!subject || !body) {
        showNotification('Please fill in subject and body before saving', 'error');
        return;
    }
    
    // ============ UPDATE BUTTON STATE - SHOW LOADING ============
    if (saveDraftBtn) {
        saveDraftBtn.textContent = '💾 Saving...';
        saveDraftBtn.disabled = true;
    }

    try {
        // Get JWT token
        const token = getJwtToken();
        if (!token) {
            showNotification('❌ Not logged in. Please login first.', 'error');
            
            // ============ RESTORE BUTTON STATE ============
            if (saveDraftBtn) {
                saveDraftBtn.textContent = originalText;
                saveDraftBtn.disabled = false;
            }
            
            window.location.href = 'auth.html';
            return;
        }

        // Prepare draft data
        const draftData = {
            campaignName: subject.substring(0, 50) + (subject.length > 50 ? '...' : ''),
            subject: subject,
            emailBody: body
        };

        // Check if updating existing draft or creating new one
        const lastDraftId = localStorage.getItem('lastDraftId');
        let response;
        let isUpdate = false;

        if (lastDraftId && lastDraftId !== 'null' && lastDraftId !== '') {
            // ============ UPDATE EXISTING DRAFT ============
            console.log('[DEBUG] Updating existing draft - ID:', lastDraftId);
            response = await fetch(`${API_BASE_URL}/campaigns/${lastDraftId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(draftData)
            });
            isUpdate = true;
        } else {
            // ============ CREATE NEW DRAFT ============
            console.log('[DEBUG] Creating new draft');
            response = await fetch(`${API_BASE_URL}/campaigns/draft/save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(draftData)
            });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || 'Failed to save draft';
            console.error('[DEBUG] Draft save failed:', errorMessage);
            
            // ============ RESTORE BUTTON STATE ============
            if (saveDraftBtn) {
                saveDraftBtn.textContent = originalText;
                saveDraftBtn.disabled = false;
            }
            
            showNotification('❌ Failed to save draft: ' + errorMessage, 'error');
            return;
        }

        const backendResponse = await response.json();
        console.log('[DEBUG] Draft saved successfully:', backendResponse);

        // Store draft ID for future updates
        const draftId = backendResponse.campaignId || lastDraftId;
        localStorage.setItem('lastDraftId', draftId?.toString());

        // Show success message
        const displaySubject = subject.substring(0, 30) + (subject.length > 30 ? '...' : '');
        const actionText = isUpdate ? 'updated' : 'saved';
        showNotification(`✅ Draft ${actionText}: "${displaySubject}"`, 'success', 3000);
        updateDashboardStats();
        
    } catch (error) {
        console.error('[DEBUG] Draft save error:', error);
        
        // ============ RESTORE BUTTON STATE ============
        if (saveDraftBtn) {
            saveDraftBtn.textContent = originalText;
            saveDraftBtn.disabled = false;
        }
        
        showNotification('❌ Failed to save draft: ' + error.message, 'error');
    } finally {
        // ============ ENSURE BUTTON IS RESTORED ============
        if (saveDraftBtn && saveDraftBtn.textContent === '💾 Saving...') {
            saveDraftBtn.textContent = originalText;
            saveDraftBtn.disabled = false;
        }
    }
}

async function loadSavedDraft() {
    try {
        // Get JWT token
        const token = getJwtToken();
        if (!token) return; // User not logged in yet

        // Fetch campaigns from backend
        console.log('[DEBUG] Loading saved draft from backend...');
        const response = await fetch(`${API_BASE_URL}/campaigns`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch campaigns');
            return;
        }

        const data = await response.json();
        const campaigns = data.campaigns || [];
        
        // Find the most recent DRAFT campaign
        const draftCampaigns = campaigns.filter(c => c.status === 'DRAFT');
        if (draftCampaigns.length === 0) {
            console.log('[DEBUG] No draft campaigns found');
            return;
        }

        // Sort by createdAt descending to get the most recent
        draftCampaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const draft = draftCampaigns[0];

        console.log('[DEBUG] Found draft:', draft);

        // ============ STORE DRAFT ID FOR EDITING ============
        localStorage.setItem('lastDraftId', draft.id?.toString());
        console.log('[DEBUG] Set lastDraftId for editing:', draft.id);

        // Load draft into form
        const subjectInput = document.getElementById('emailSubject');
        const bodyInput = document.getElementById('emailBody');
        const sendToSelect = document.getElementById('sendToOption');

        if (subjectInput) subjectInput.value = draft.subject || '';
        if (bodyInput) bodyInput.value = draft.emailBody || '';
        if (sendToSelect) sendToSelect.value = 'all'; // Default to all recipients

        // Update preview with loaded draft
        updatePreview();
        
        // Show range inputs if needed
        const rangeInputs = document.getElementById('rangeInputs');
        if (rangeInputs && sendToSelect?.value === 'range') {
            rangeInputs.style.display = 'flex';
        }
        
        // Show notification about loaded draft
        const createdTime = new Date(draft.createdAt).toLocaleString();
        showNotification(`📋 Draft loaded from database: "${draft.subject.substring(0, 30)}..." (Saved: ${createdTime})`, 'info', 3000);
        
        // Update dashboard instantly when draft is loaded
        updateDashboardStats();
    } catch (error) {
        console.error('[DEBUG] Error loading saved draft:', error);
        // Silently fail - don't block app loading
    }
}

/**
 * Logout function - Clear user session and redirect to auth
 * This function is available globally for the logout button
 */
function handleLogout() {
    // Clear all authentication data
    if (typeof clearAuthData === 'function') {
        clearAuthData();
    }
    
    // Clear all user data
    localStorage.removeItem('user');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_id');
    localStorage.removeItem('profileImage');
    localStorage.removeItem('emailProviders');
    localStorage.removeItem('selectedEmailProvider');
    localStorage.removeItem('emailSelectionPreference');
    localStorage.removeItem('emailDraft');
    localStorage.removeItem('csvQueue');
    localStorage.removeItem('recipients');
    localStorage.removeItem('campaigns');
    localStorage.removeItem('currentSessionLogs');
    localStorage.removeItem('lifetimeStats');
    localStorage.removeItem('dashboardActivityLog');
    localStorage.removeItem('lastSection');
    
    // Clear campaign state
    localStorage.removeItem('currentProcessingCSVId');
    localStorage.removeItem('csvProgress');
    localStorage.removeItem('campaignPaused');
    localStorage.removeItem('campaignPausedRow');
    localStorage.removeItem('campaignEmailProvider');
    localStorage.removeItem('campaignElapsedTimeMS');
    
    // Redirect to auth page
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

function addToCSVQueue(name, recipients, uploadId = null) {
    const queue = getCSVQueue();
    
    if (queue.length >= 5) {
        showNotification('Maximum 5 CSV files allowed in queue', 'error');
        return false;
    }

    const csvItem = {
        id: uploadId || Date.now(), // Use real database ID if provided, fallback to timestamp
        name: name,
        recipients: recipients,
        recipientCount: recipients.length,
        status: 'pending',
        uploadedAt: new Date().toLocaleString(),
        completedAt: null,
        databaseId: uploadId // Store both for clarity
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

async function removeFromCSVQueue(id) {
    const queue = getCSVQueue();
    const item = queue.find(q => q.id === id);

    // Cannot remove if processing
    if (item && item.status === 'processing') {
        showNotification('Cannot remove CSV while processing. Stop the campaign first.', 'error');
        return false;
    }

    // ============ UPDATE BUTTON STATE - SHOW LOADING ============
    const deleteBtn = document.getElementById(`deleteBtn-${id}`);
    const deleteIcon = document.getElementById(`deleteIcon-${id}`);
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteIcon.className = 'fas fa-spinner fa-spin'; // Show spinner
    }

    // ============ DELETE FROM BACKEND FIRST ============
    try {
        const token = getJwtToken();
        if (!token) {
            showNotification('❌ Not logged in. Please login first.', 'error');
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteIcon.className = 'fas fa-trash'; // Restore icon
            }
            window.location.href = 'auth.html';
            return false;
        }

        console.log('[DEBUG] Deleting CSV from backend - ID:', id, 'Name:', item?.name);
        const response = await fetch(API_ENDPOINTS.CSV_DELETE(id), {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `Delete failed with status ${response.status}`;
            console.error('[DEBUG] Backend delete failed:', errorMessage);
            
            // ============ RESTORE BUTTON STATE ON ERROR ============
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteIcon.className = 'fas fa-trash'; // Restore icon
            }
            
            showNotification('❌ Delete failed: ' + errorMessage, 'error');
            return false;
        }

        const backendResponse = await response.json();
        console.log('[DEBUG] Backend delete successful:', backendResponse);
        
    } catch (error) {
        console.error('[DEBUG] Delete error:', error);
        
        // ============ RESTORE BUTTON STATE ON ERROR ============
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteIcon.className = 'fas fa-trash'; // Restore icon
        }
        
        showNotification('❌ Delete failed: ' + error.message, 'error');
        return false;
    }

    // ============ BACKEND DELETE SUCCESSFUL - NOW REMOVE FROM LOCAL QUEUE ============
    const newQueue = queue.filter(q => q.id !== id);
    saveCSVQueue(newQueue);
    
    // Update displays instantly
    updateCSVQueueDisplay();
    updateDashboardStats();
    
    console.log('[DEBUG] CSV removed from local queue - ID:', id);
    showNotification('✅ CSV deleted from database and storage', 'success');
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
                    <button id="deleteBtn-${item.id}" class="btn btn-secondary" onclick="removeFromCSVQueue(${item.id})" 
                            ${item.status === 'processing' ? 'disabled title="Cannot remove while processing"' : ''}
                            title="Remove from queue">
                        <i id="deleteIcon-${item.id}" class="fas fa-trash"></i>
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
 * Load CSV uploads from backend and populate localStorage queue
 * Called on app initialization to sync with database
 */
async function loadCSVQueueFromBackend() {
    try {
        const token = getJwtToken();
        if (!token) {
            console.log('[DEBUG] No token, skipping backend CSV load');
            return;
        }

        console.log('[DEBUG] Fetching CSVs from backend...');
        const response = await fetch(API_ENDPOINTS.CSV_LIST, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('[DEBUG] Failed to fetch CSVs from backend:', response.status);
            return;
        }

        const data = await response.json();
        console.log('[DEBUG] Backend CSVs:', data);

        // Convert backend format to queue format
        if (data.uploads && Array.isArray(data.uploads)) {
            const queue = data.uploads.map(csv => ({
                id: csv.id,
                name: csv.fileName,
                databaseId: csv.id,
                status: 'pending', // Default status for display
                uploadedAt: new Date(csv.uploadedAt).toLocaleString(),
                completedAt: null,
                recipients: [], // Backend doesn't send recipients back, that's fine
                recipientCount: csv.validRows || 0,
                totalRows: csv.totalRows || 0,
                validRows: csv.validRows || 0,
                invalidRows: csv.invalidRows || 0
            }));

            console.log('[DEBUG] Loaded', queue.length, 'CSVs from backend');
            saveCSVQueue(queue);
            updateCSVQueueDisplay();
            updateDashboardStats();
        }
    } catch (error) {
        console.error('[DEBUG] Error loading CSVs from backend:', error);
        // Silently fail - use localStorage as fallback
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

async function confirmUpload() {
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

    // ============ UPDATE BUTTON STATE - SHOW LOADING ============
    const confirmBtn = document.getElementById('confirmUploadBtn');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = '⏳ Uploading...';
    confirmBtn.disabled = true;

    // ============ UPLOAD TO BACKEND FIRST ============
    try {
        // Get JWT token
        const token = getJwtToken();
        if (!token) {
            showNotification('❌ Not logged in. Please login first.', 'error');
            
            // ============ RESTORE BUTTON STATE ============
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
            
            window.location.href = 'auth.html';
            return;
        }

        // Reconstruct CSV file from parsed data
        const headers = ['name', 'email', 'company', 'customField1', 'customField2'];
        const csvLines = [headers.join(',')];
        pendingCSVData.recipients.forEach(recipient => {
            const row = headers.map(h => recipient[h] || '').join(',');
            csvLines.push(row);
        });
        const csvContent = csvLines.join('\n');
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });

        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', csvBlob, pendingCSVData.fileName);
        formData.append('recipients', JSON.stringify(pendingCSVData.recipients));

        // Send to backend
        console.log('[DEBUG] Uploading CSV to backend:', pendingCSVData.fileName);
        const response = await fetch(API_ENDPOINTS.EMAIL_UPLOAD_CSV, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `Upload failed with status ${response.status}`;
            console.error('[DEBUG] Backend upload failed:', errorMessage);
            
            // ============ RESTORE BUTTON STATE ON ERROR ============
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
            
            if (errorMessage.includes('Maximum 5 CSV files')) {
                showNotification('❌ Maximum 5 CSV files allowed. Please delete some files first.', 'error');
            } else if (errorMessage.includes('10MB')) {
                showNotification('❌ File size exceeds 10MB limit', 'error');
            } else {
                showNotification('❌ Backend upload failed: ' + errorMessage, 'error');
            }
            return;
        }

        const backendResponse = await response.json();
        console.log('[DEBUG] Backend upload successful:', backendResponse);
        
        // ============ BACKEND SUCCESSFUL - NOW ADD TO LOCAL QUEUE ============
        // This keeps a local cache for the UI to work offline
        // IMPORTANT: Use the uploadId from backend, not a timestamp!
        if (addToCSVQueue(pendingCSVData.fileName, pendingCSVData.recipients, backendResponse.uploadId)) {
            showNotification('✅ CSV uploaded and added to queue successfully', 'success');
            
            // Clear pending data
            pendingCSVData = {
                fileName: '',
                recipients: [],
                lines: []
            };
            
            // Reset upload form
            resetUpload();
            
            // Update displays
            updateCSVQueueDisplay();
            updateDashboardStats();
        }
    } catch (error) {
        console.error('[DEBUG] Upload error:', error);
        
        // ============ RESTORE BUTTON STATE ON ERROR ============
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
        
        showNotification('❌ Upload failed: ' + error.message, 'error');
    }
}

function resetUpload() {
    document.getElementById('uploadForm').style.display = 'block';
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('csvFile').value = '';
    
    // Reset button state
    const confirmBtn = document.getElementById('confirmUploadBtn');
    if (confirmBtn) {
        confirmBtn.textContent = 'Confirm Upload';
        confirmBtn.disabled = false;
    }
    
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
    
    // Load profile data into settings form
    loadSettingsProfileData();
    
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

function loadSettingsProfileData() {
    // Get user data from localStorage - try both 'user' and 'user_data' keys
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const displayName = user.name || user.fullName || userData.fullName || userData.name || '';
    const email = user.email || userData.email || '';
    const token = localStorage.getItem('jwt_token');
    
    // Load from localStorage first
    if (document.getElementById('settingsProfileDisplayName')) {
        document.getElementById('settingsProfileDisplayName').value = displayName;
    }
    if (document.getElementById('settingsProfileEmail')) {
        document.getElementById('settingsProfileEmail').value = email;
    }
    
    // Fetch fresh user data from backend if token exists
    if (token) {
        (async () => {
            try {
                const response = await apiCall(`${API_BASE_URL}/users/profile`, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                
                if (response && response.data) {
                    const freshData = response.data;
                    if (document.getElementById('settingsProfileDisplayName')) {
                        document.getElementById('settingsProfileDisplayName').value = freshData.fullName || freshData.name || '';
                    }
                    if (document.getElementById('settingsProfileEmail')) {
                        document.getElementById('settingsProfileEmail').value = freshData.email || '';
                    }
                }
            } catch (error) {
                console.log('Using cached profile data');
            }
        })();
    }
}

/**
 * Setup avatar upload handlers
 */
function setupAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput');
    const avatarUploadBtn = document.getElementById('avatarUploadBtn');
    const avatarDeleteBtn = document.getElementById('avatarDeleteBtn');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    
    if (!avatarInput || !avatarUploadBtn) return;
    
    // Trigger file input when button clicked
    avatarUploadBtn.addEventListener('click', () => {
        avatarInput.click();
    });
    
    // Handle file selection
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (event) => {
            avatarPreview.src = event.target.result;
            avatarPreview.style.display = 'block';
            avatarPlaceholder.style.display = 'none';
            avatarDeleteBtn.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
        
        // Upload to server
        await uploadAvatarToServer(file);
    });
    
    // Handle delete
    avatarDeleteBtn.addEventListener('click', async () => {
        if (!confirm('Delete your avatar?')) return;
        await deleteAvatarFromServer();
    });
}

/**
 * Upload avatar to server
 */
async function uploadAvatarToServer(file) {
    try {
        const token = localStorage.getItem('jwt_token');
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE_URL}/users/avatar/upload`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Avatar upload failed');
        }
        
        const data = await response.json();
        showNotification('Avatar uploaded successfully!', 'success');
        
        // Update sidebar avatar
        if (data.publicUrl) {
            updateSidebarAvatar(data.publicUrl);
        }
        
    } catch (error) {
        showNotification('Avatar upload failed: ' + error.message, 'error');
        console.error('Avatar upload error:', error);
    }
}

/**
 * Delete avatar from server
 */
async function deleteAvatarFromServer() {
    try {
        const token = localStorage.getItem('jwt_token');
        
        const response = await fetch(`${API_BASE_URL}/users/avatar`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Avatar delete failed');
        }
        
        const avatarInput = document.getElementById('avatarInput');
        const avatarPreview = document.getElementById('avatarPreview');
        const avatarPlaceholder = document.getElementById('avatarPlaceholder');
        const avatarDeleteBtn = document.getElementById('avatarDeleteBtn');
        
        // Reset UI
        avatarInput.value = '';
        avatarPreview.style.display = 'none';
        avatarPlaceholder.style.display = 'flex';
        avatarDeleteBtn.style.display = 'none';
        
        // Reset sidebar avatar
        updateSidebarAvatar(null);
        
        showNotification('Avatar deleted successfully', 'success');
        
    } catch (error) {
        showNotification('Avatar delete failed: ' + error.message, 'error');
        console.error('Avatar delete error:', error);
    }
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
    
    const cancelBtn = document.getElementById('cancelVerificationBtn');
    cancelBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        handleCancelVerification();
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

async function verifyProviderWithBackend(provider) {
    showNotification('Verifying email provider credentials...', 'info');
    
    // Determine which endpoint to call based on provider type
    let endpoint;
    let requestBody;
    
    if (provider.type === 'smtp') {
        endpoint = `${API_BASE_URL}/email-providers/verify/smtp`;
        requestBody = {
            name: provider.name,
            email: provider.email,
            host: 'smtp.gmail.com',
            port: 587,
            username: provider.email,
            password: provider.credentials.password
        };
    } else if (provider.type === 'resend') {
        endpoint = `${API_BASE_URL}/email-providers/verify/resend`;
        requestBody = {
            name: provider.name,
            email: provider.email,
            apiKey: provider.credentials.apiKey
        };
    } else if (provider.type === 'outlook') {
        endpoint = `${API_BASE_URL}/email-providers/verify/outlook`;
        requestBody = {
            name: provider.name,
            email: provider.email,
            appPassword: provider.credentials.password
        };
    } else {
        showVerificationFailed('Unknown provider type');
        return;
    }
    
    try {
        const token = localStorage.getItem('jwt_token');
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (response.ok && data.verified) {
            // Store verification token for later use when adding provider
            window.verificationToken = data.verificationToken;
            showVerificationSuccess(provider);
            console.log('[DEBUG] Email provider verification successful:', data.message);
        } else {
            const errorMsg = data?.error || data?.message || 'Failed to verify provider credentials';
            showVerificationFailed(errorMsg);
            console.log('[DEBUG] Email provider verification failed:', errorMsg);
        }
    } catch (error) {
        const errorMsg = error.message || 'Network error - unable to verify provider';
        showVerificationFailed(errorMsg);
        console.error('[ERROR] Provider verification failed:', error);
    }
}

function showVerificationPending() {
    const statusDiv = document.getElementById('verificationStatus');
    const statusMessage = document.getElementById('verificationMessage');
    const verifyBtn = document.getElementById('verifyProviderBtn');
    const addProviderBtn = document.getElementById('addProviderBtn');
    const cancelBtn = document.getElementById('cancelVerificationBtn');
    
    statusDiv.style.display = 'block';
    statusDiv.className = 'verification-status pending';
    statusMessage.textContent = '⏳ Verification Pending - Sending test email to your address...';
    
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    addProviderBtn.style.display = 'none';
    cancelBtn.style.display = 'block';
}

function showVerificationSuccess(provider) {
    const statusDiv = document.getElementById('verificationStatus');
    const statusMessage = document.getElementById('verificationMessage');
    const verifyBtn = document.getElementById('verifyProviderBtn');
    const addProviderBtn = document.getElementById('addProviderBtn');
    const cancelBtn = document.getElementById('cancelVerificationBtn');
    
    statusDiv.style.display = 'block';
    statusDiv.className = 'verification-status verified';
    statusMessage.innerHTML = `✅ Verified - Test email sent to <strong>${provider.email}</strong>. You can now add this provider.`;
    
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="fas fa-check"></i> Verified';
    addProviderBtn.style.display = 'block';
    cancelBtn.style.display = 'block';
    
    // Store verified provider temporarily (only saved to DB when Add Provider is clicked)
    window.verifiedProvider = provider;
    
    showNotification('Credentials verified successfully!', 'success');
}

function showVerificationFailed(message = 'Verification failed') {
    const statusDiv = document.getElementById('verificationStatus');
    const statusMessage = document.getElementById('verificationMessage');
    const verifyBtn = document.getElementById('verifyProviderBtn');
    const addProviderBtn = document.getElementById('addProviderBtn');
    const cancelBtn = document.getElementById('cancelVerificationBtn');
    
    statusDiv.style.display = 'block';
    statusDiv.className = 'verification-status failed';
    statusMessage.textContent = `❌ ${message} - Please check your credentials and try again.`;
    
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = '<i class="fas fa-redo"></i> Try Again';
    addProviderBtn.style.display = 'none';
    cancelBtn.style.display = 'block';
    
    showNotification(message, 'error');
}

function resetVerificationState() {
    const statusDiv = document.getElementById('verificationStatus');
    const verifyBtn = document.getElementById('verifyProviderBtn');
    const addProviderBtn = document.getElementById('addProviderBtn');
    const cancelBtn = document.getElementById('cancelVerificationBtn');
    
    statusDiv.style.display = 'none';
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify Now';
    addProviderBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    
    window.verifiedProvider = null;
    window.verificationToken = null;
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

async function handleAddProvider() {
    const verifiedProvider = window.verifiedProvider;
    const verificationToken = window.verificationToken;
    
    if (!verifiedProvider) {
        showNotification('Please verify credentials first', 'error');
        return;
    }
    
    if (!verificationToken) {
        showNotification('Verification token missing. Please verify again.', 'error');
        return;
    }
    
    // Show loading state
    const addBtn = document.getElementById('addProviderBtn');
    const originalText = addBtn.textContent;
    addBtn.disabled = true;
    addBtn.textContent = '⏳ Adding...';
    
    // Prepare provider data for confirmation
    const providerData = {
        providerType: verifiedProvider.type.toUpperCase(),
        displayName: verifiedProvider.name,
        fromEmail: verifiedProvider.email,
        fromName: verifiedProvider.name,
        encryptedConfig: verifiedProvider.credentials,  // Send as Map, not JSON string
        verificationToken: verificationToken
    };
    
    try {
        const token = getJwtToken();
        if (!token) {
            showNotification('Not logged in. Please login first.', 'error');
            addBtn.disabled = false;
            addBtn.textContent = originalText;
            return;
        }
        
        // Call confirm endpoint with verification token
        const response = await fetch(`${API_BASE_URL}/email-providers/confirm`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(providerData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to add provider');
        }
        
        const result = await response.json();
        
        // Add to local cache for quick display
        verifiedProvider.id = result.providerId;
        let providers = JSON.parse(localStorage.getItem('emailProviders') || '[]');
        providers.push(verifiedProvider);
        localStorage.setItem('emailProviders', JSON.stringify(providers));
        
        // If this is the first provider, set it as default
        if (providers.length === 1) {
            localStorage.setItem('selectedEmailProvider', verifiedProvider.id.toString());
            console.log('[DEBUG] First provider added, setting as default - ID:', verifiedProvider.id);
        }
        
        showNotification(`✅ ${verifiedProvider.name} added and verified successfully!`, 'success');
        
        // Reset form and reload
        resetEmailProviderForm();
        resetVerificationState();
        loadEmailProviders();
        updateMailProviderStat();
        
    } catch (error) {
        console.error('[DEBUG] Add provider error:', error);
        showNotification('❌ Failed to add provider: ' + error.message, 'error');
    } finally {
        // Reset button
        addBtn.disabled = false;
        addBtn.textContent = originalText;
    }
}

/**
 * Cancel email provider verification
 * Closes the modal and resets the form
 */
function handleCancelVerification() {
    resetVerificationState();
    resetEmailProviderForm();
    showNotification('Verification cancelled', 'info');
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
                <button class="delete-btn" id="delete-provider-${provider.id}" onclick="deleteEmailProvider(${provider.id})" ${campaignActive ? 'disabled' : ''} style="${campaignActive ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
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

/**
 * Show delete confirmation modal for email provider
 */
function showDeleteConfirmationModal(providerId, providerName) {
    const overlay = document.getElementById('deleteModalOverlay');
    const modal = document.getElementById('deleteConfirmationModal');
    const titleEl = document.getElementById('deleteModalTitle');
    const messageEl = document.getElementById('deleteModalMessage');
    const confirmBtn = document.getElementById('deleteModalConfirmBtn');
    const cancelBtn = document.getElementById('deleteModalCancelBtn');
    
    // Update modal content
    titleEl.textContent = 'Delete Email Provider';
    messageEl.textContent = `Are you sure you want to delete "${providerName}"? This action cannot be undone.`;
    
    // Show modal
    overlay.classList.add('active');
    modal.classList.add('active');
    
    // Remove previous event listeners by cloning
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    const newConfirmBtn = document.getElementById('deleteModalConfirmBtn');
    
    // Add new event listeners
    newConfirmBtn.addEventListener('click', () => performDeleteEmailProvider(providerId));
    cancelBtn.addEventListener('click', closeDeleteConfirmationModal);
    overlay.addEventListener('click', closeDeleteConfirmationModal);
}

/**
 * Close delete confirmation modal
 */
function closeDeleteConfirmationModal() {
    const overlay = document.getElementById('deleteModalOverlay');
    const modal = document.getElementById('deleteConfirmationModal');
    
    overlay.classList.remove('active');
    modal.classList.remove('active');
}

/**
 * Perform the actual deletion of email provider
 */
async function performDeleteEmailProvider(providerId) {
    try {
        // Close modal first
        closeDeleteConfirmationModal();
        
        // Get the delete button and set loading state
        const deleteBtn = document.getElementById(`delete-provider-${providerId}`);
        if (!deleteBtn) {
            throw new Error('Delete button not found');
        }
        
        const originalIcon = deleteBtn.innerHTML;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        deleteBtn.style.pointerEvents = 'none';
        deleteBtn.style.opacity = '0.7';
        
        // Call backend API to delete provider
        const token = getJwtToken();
        if (!token) {
            showNotification('Not logged in. Please login first.', 'error');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalIcon;
            deleteBtn.style.pointerEvents = 'auto';
            deleteBtn.style.opacity = '1';
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/email-providers/${providerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to delete provider (${response.status})`);
        }
        
        // Success - update local cache
        let providers = JSON.parse(localStorage.getItem('emailProviders') || '[]');
        const providerToDelete = providers.find(p => p.id === providerId);
        providers = providers.filter(p => p.id !== providerId);
        localStorage.setItem('emailProviders', JSON.stringify(providers));
        
        // If deleted provider was selected default, clear the selection
        const selectedProviderId = localStorage.getItem('selectedEmailProvider');
        if (String(selectedProviderId) === String(providerId)) {
            localStorage.removeItem('selectedEmailProvider');
        }
        
        showNotification('✅ Email provider deleted successfully', 'success');
        console.log('[EMAIL PROVIDER] Deleted provider:', providerToDelete?.name);
        
        // Reload the provider list
        loadEmailProviders();
        
        // Update dashboard stat in real-time
        updateMailProviderStat();
        
    } catch (error) {
        console.error('[ERROR] Failed to delete email provider:', error);
        showNotification('❌ ' + error.message, 'error');
        
        // Restore button state
        const deleteBtn = document.getElementById(`delete-provider-${providerId}`);
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.style.pointerEvents = 'auto';
            deleteBtn.style.opacity = '1';
        }
    }
}

/**
 * Delete email provider - shows confirmation modal
 */
function deleteEmailProvider(providerId) {
    // Get provider name from the list
    const providers = JSON.parse(localStorage.getItem('emailProviders') || '[]');
    const provider = providers.find(p => p.id === providerId);
    const providerName = provider?.name || 'this email provider';
    
    // Show confirmation modal
    showDeleteConfirmationModal(providerId, providerName);
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

async function handlePasswordUpdate(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const repeatPassword = document.getElementById('repeatPassword').value;
    const errorDisplay = document.getElementById('currentPasswordError');
    
    // Clear previous error
    if (errorDisplay) {
        errorDisplay.style.display = 'none';
        errorDisplay.textContent = '';
    }
    
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
    
    if (currentPassword === newPassword) {
        showNotification('New password must be different from current password', 'error');
        return;
    }
    
    // Prepare password update
    const updateData = {
        currentPassword: currentPassword,
        newPassword: newPassword
    };
    
    // Show loading state
    const passwordForm = document.getElementById('passwordForm');
    const submitBtn = passwordForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';
    
    // Send to backend
    try {
        const token = localStorage.getItem('jwt_token');
        const response = await apiCall(`${API_BASE_URL}/users/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        // Success
        showNotification('Password updated successfully', 'success');
        passwordForm.reset();
    } catch (error) {
        // Error
        const errorMsg = error.message || error;
        if (errorMsg.includes('Current password') || errorMsg.includes('incorrect') || errorMsg.includes('does not match')) {
            // Display error message next to password field
            if (errorDisplay) {
                errorDisplay.textContent = 'Current password does not match';
                errorDisplay.style.display = 'block';
            }
            showNotification('Current password does not match', 'error');
        } else if (errorMsg.includes('Password')) {
            showNotification(errorMsg, 'error');
        } else {
            showNotification('Failed to update password. Please try again.', 'error');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function setupDeleteAccount() {
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteAccountClick);
    }
}

async function handleDeleteAccountClick() {
    // Show deletion modal
    const modal = document.getElementById('deleteAccountModal');
    const overlay = document.getElementById('deleteAccountModalOverlay');
    const confirmInput = document.getElementById('deleteConfirmationInput');
    const confirmBtn = document.getElementById('confirmDeleteAccountBtn');
    
    // Reset input and button state
    confirmInput.value = '';
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Delete Account';
    
    // Show modal
    modal.style.display = 'block';
    overlay.style.display = 'block';
    
    // Focus on input
    confirmInput.focus();
}

function cancelDeleteAccount() {
    const modal = document.getElementById('deleteAccountModal');
    const overlay = document.getElementById('deleteAccountModalOverlay');
    
    // Hide modal
    modal.style.display = 'none';
    overlay.style.display = 'none';
    
    // Clear input
    document.getElementById('deleteConfirmationInput').value = '';
    showNotification('Account deletion cancelled', 'info');
}

async function confirmDeleteAccount() {
    const confirmInput = document.getElementById('deleteConfirmationInput');
    const confirmBtn = document.getElementById('confirmDeleteAccountBtn');
    
    // Check if user typed DELETE
    if (confirmInput.value !== 'DELETE') {
        showNotification('Please type DELETE to confirm', 'error');
        return;
    }
    
    // Show loading state
    const originalText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting...';
    
    // Send delete request to backend
    try {
        const token = localStorage.getItem('jwt_token');
        const response = await apiCall(`${API_BASE_URL}/users/delete-account`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        // Success
        showNotification('Account deleted successfully', 'success');
        
        // Hide modal
        const modal = document.getElementById('deleteAccountModal');
        const overlay = document.getElementById('deleteAccountModalOverlay');
        modal.style.display = 'none';
        overlay.style.display = 'none';
        
        // Clear all data after a short delay
        setTimeout(() => {
            localStorage.clear();
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        // Error
        showNotification('Failed to delete account. Please try again.', 'error');
        
        // Reset button
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
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

