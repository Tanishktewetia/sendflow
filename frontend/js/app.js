// App Initialization & Authentication

// Global variable to track campaign completion timeout
let campaignTimeoutId = null;

// Timer tracking variables
let campaignStartTime = null;          // When campaign started (timestamp)
let campaignTimerIntervalId = null;   // Interval for timer display update
let campaignElapsedTime = 0;          // Total elapsed time in milliseconds (preserved during pause)
let campaignStatusPollIntervalId = null; // Poll backend queue status while campaign is active
let dashboardDbStatsCache = {};

function getCurrentUserId() {
    const rawUserId = localStorage.getItem('userId');
    if (rawUserId) {
        return rawUserId;
    }

    try {
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (userData?.id != null) {
            return String(userData.id);
        }
    } catch (error) {
        // ignore
    }

    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user?.id != null) {
            return String(user.id);
        }
    } catch (error) {
        // ignore
    }

    try {
        const token = getJwtToken();
        if (token) {
            const [, payload] = token.split('.');
            if (payload) {
                const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
                if (decoded?.userId != null) {
                    return String(decoded.userId);
                }
                if (decoded?.id != null) {
                    return String(decoded.id);
                }
            }
        }
    } catch (error) {
        // ignore malformed token payloads
    }

    return null;
}

function buildUserIdHeader() {
    const userId = getCurrentUserId();
    return userId ? { 'X-User-Id': userId } : {};
}

function getCampaignTargetTotal(queue = []) {
    const backendTotal = Number(localStorage.getItem('campaignTargetTotal') || '0');
    if (backendTotal > 0) {
        return backendTotal;
    }

    const processingId = localStorage.getItem('currentProcessingCSVId');
    const currentCSV = Array.isArray(queue)
        ? queue.find(q => String(q.id) === String(processingId))
        : null;

    if (currentCSV && Number(currentCSV.recipientCount) > 0) {
        return Number(currentCSV.recipientCount);
    }

    return 0;
}

function getSendRangePayload() {
    const sendTo = (document.getElementById('sendToOption')?.value || 'all').toLowerCase();
    const rangeFrom = parseInt(document.getElementById('rangeFrom')?.value || '1', 10);
    const rangeTo = parseInt(document.getElementById('rangeTo')?.value || '1', 10);

    return {
        sendTo,
        rangeFrom: Number.isFinite(rangeFrom) ? rangeFrom : 1,
        rangeTo: Number.isFinite(rangeTo) ? rangeTo : 1
    };
}

function getCampaignLogSeqKey(queueId) {
    return `campaignLogAfterSeq:${queueId}`;
}

function getDashboardStatsCache() {
    return dashboardDbStatsCache || {};
}

async function refreshDashboardStatsFromBackend() {
    try {
        const token = getJwtToken();
        if (!token) {
            return getDashboardStatsCache();
        }

        const response = await fetch(`${API_BASE_URL}/campaign-queue/dashboard-stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...buildUserIdHeader()
            }
        });

        if (!response.ok) {
            return getDashboardStatsCache();
        }

        const payload = await response.json();
        dashboardDbStatsCache = payload || {};
        return dashboardDbStatsCache;
    } catch (error) {
        console.warn('[DEBUG] Failed to refresh dashboard stats from backend:', error?.message || error);
        return getDashboardStatsCache();
    }
}

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
    restoreLocalComposeDraft();
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
    loadEmailProviders(); // Load providers + default provider immediately on startup
    
    // Fetch email providers from backend to ensure they persist after logout
    // Update mail provider stat after loading to show correct provider name immediately
    fetchEmailProvidersFromBackend(function(providers) {
        console.log('Email providers loaded on app init:', providers);
        updateMailProviderStat(); // Refresh provider display with loaded data
    });
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

function persistLocalComposeDraft() {
    const subject = document.getElementById('emailSubject')?.value || '';
    const body = document.getElementById('emailBody')?.value || '';
    const sendTo = document.getElementById('sendToOption')?.value || 'all';

    localStorage.setItem('emailDraft', JSON.stringify({
        subject,
        emailBody: body,
        sendTo,
        updatedAt: new Date().toISOString()
    }));
}

function restoreLocalComposeDraft() {
    try {
        const raw = localStorage.getItem('emailDraft');
        if (!raw) return false;

        const draft = JSON.parse(raw);
        if (!draft || (typeof draft.subject !== 'string' && typeof draft.emailBody !== 'string')) {
            return false;
        }

        const subjectInput = document.getElementById('emailSubject');
        const bodyInput = document.getElementById('emailBody');
        const sendToSelect = document.getElementById('sendToOption');

        if (subjectInput && !subjectInput.value) {
            subjectInput.value = draft.subject || '';
        }

        if (bodyInput && !bodyInput.value) {
            bodyInput.value = draft.emailBody || '';
        }

        if (sendToSelect && (draft.sendTo === 'all' || draft.sendTo === 'range')) {
            sendToSelect.value = draft.sendTo;
            const rangeInputs = document.getElementById('rangeInputs');
            if (rangeInputs) {
                rangeInputs.style.display = draft.sendTo === 'range' ? 'flex' : 'none';
            }
        }

        updatePreview();
        return Boolean((draft.subject || '').trim() || (draft.emailBody || '').trim());
    } catch (error) {
        console.warn('[DEBUG] Failed to restore local compose draft:', error?.message || error);
        return false;
    }
}



// EMAIL COMPOSER
function setupForms() {
    
    // Email inputs for preview
    document.getElementById('emailSubject')?.addEventListener('input', () => {
        updatePreview();
        persistLocalComposeDraft();
    });
    document.getElementById('emailBody')?.addEventListener('input', () => {
        updatePreview();
        persistLocalComposeDraft();
    });
    
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
        persistLocalComposeDraft();
        updateDashboardStats(); // Update dashboard instantly when send option changes
    });

    // Range inputs
    document.getElementById('rangeFrom')?.addEventListener('input', () => {
        updatePreview();
        persistLocalComposeDraft();
        updateDashboardStats(); // Update dashboard instantly
    });
    document.getElementById('rangeTo')?.addEventListener('input', () => {
        updatePreview();
        persistLocalComposeDraft();
        updateDashboardStats(); // Update dashboard instantly
    });
    
    // Campaign control
    document.getElementById('startBtn')?.addEventListener('click', handleStartCampaign);
    document.getElementById('pauseBtn')?.addEventListener('click', handlePauseCampaign);
    
    // Clear logs button
    document.getElementById('clearLogsBtn')?.addEventListener('click', clearTerminalLogs);
    document.getElementById('exportLogsBtn')?.addEventListener('click', exportTerminalLogs);
    document.getElementById('clearStatsBtn')?.addEventListener('click', handleClearDashboardStats);
    
    // CSV upload
    setupCSVUpload();
    
    // Load CSV files from backend (sync with database, not just localStorage)
    syncCSVQueueFromBackend().then(() => {
        refreshDashboardStatsFromBackend().finally(() => {
            updateCSVQueueDisplay();
            updateDashboardStats();
        });
    });

    // Save Draft button
    document.getElementById('saveDraftBtn')?.addEventListener('click', handleSaveDraft);
    document.getElementById('clearDraftBtn')?.addEventListener('click', handleClearDraft);
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

function setCampaignRunningUI(isResume = false) {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const campaignStatus = document.getElementById('campaignStatus');

    if (startBtn) {
        startBtn.style.display = 'none';
        startBtn.disabled = false;
    }
    if (pauseBtn) {
        pauseBtn.style.display = 'inline-flex';
    }
    if (campaignStatus) {
        campaignStatus.textContent = 'Campaign running...';
        campaignStatus.className = 'campaign-status running';
    }

    updateCampaignButtonIcons('running');
    startCampaignTimer(isResume);
    startCampaignStatusPolling();
}

function startCampaignStatusPolling() {
    if (campaignStatusPollIntervalId) {
        clearInterval(campaignStatusPollIntervalId);
        campaignStatusPollIntervalId = null;
    }

    campaignStatusPollIntervalId = setInterval(async () => {
        try {
            const queueId = localStorage.getItem('currentQueueId');
            const token = getJwtToken();
            if (queueId && token) {
                const response = await fetch(`${API_BASE_URL}/campaign-queue/${queueId}/status`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const statusData = await response.json();
                    const processed = Number(statusData.processedRecipients ?? statusData.currentRow ?? 0);
                    const sent = Number(statusData.sentRecipients ?? statusData.sent ?? 0);
                    const failed = Number(statusData.failedRecipients ?? statusData.failed ?? 0);
                    const totalRecipients = Number(statusData.totalRecipients ?? statusData.totalRows ?? 0);
                    const queueStatus = String(statusData.status || '').toUpperCase();

                    localStorage.setItem('csvProgress', String(processed));
                    localStorage.setItem('campaignSentProgress', String(sent));
                    if (totalRecipients > 0) {
                        localStorage.setItem('campaignTargetTotal', String(totalRecipients));
                    }

                    await pollCampaignRuntimeEvents(queueId);

                    const sessionLogs = JSON.parse(localStorage.getItem('currentSessionLogs') || '{}');
                    sessionLogs.successCount = sent;
                    sessionLogs.failureCount = failed;
                    localStorage.setItem('currentSessionLogs', JSON.stringify(sessionLogs));

                    await refreshDashboardStatsFromBackend();
                    updateDashboardStats();

                    if (queueStatus === 'COMPLETED') {
                        stopCampaignStatusPolling();
                        onCampaignComplete();
                        return;
                    }

                    if (queueStatus === 'FAILED') {
                        stopCampaignStatusPolling();
                        stopCampaignTimer();
                        const startBtn = document.getElementById('startBtn');
                        const pauseBtn = document.getElementById('pauseBtn');
                        const campaignStatus = document.getElementById('campaignStatus');
                        if (startBtn) startBtn.style.display = 'inline-flex';
                        if (pauseBtn) pauseBtn.style.display = 'none';
                        if (campaignStatus) {
                            campaignStatus.textContent = 'Campaign failed';
                            campaignStatus.className = 'campaign-status error';
                        }
                        localStorage.removeItem('campaignTargetTotal');
                        localStorage.removeItem('currentProcessingCSVId');
                        localStorage.removeItem('currentQueueId');
                        syncCSVQueueFromBackend().then(async (queue) => {
                            await refreshDashboardStatsFromBackend();
                            updateCSVQueueDisplay(queue);
                            updateDashboardStats(queue);
                        });
                        return;
                    }

                    if (queueStatus === 'PAUSED') {
                        localStorage.setItem('campaignPaused', 'true');
                        syncCampaignControlUI();
                    }
                }
            }

            // Fallback: if backend status endpoint path misses completion, reconcile from queue list status.
            const processingCsvId = Number(localStorage.getItem('currentProcessingCSVId') || '0');
            if (processingCsvId > 0) {
                const queue = await syncCSVQueueFromBackend();
                const currentCsv = Array.isArray(queue)
                    ? queue.find(item => Number(item?.id) === processingCsvId)
                    : null;
                const reconciledStatus = normalizeCsvStatus(currentCsv?.status);

                if (reconciledStatus === 'completed') {
                    stopCampaignStatusPolling();
                    onCampaignComplete();
                    return;
                }

                if (reconciledStatus === 'failed') {
                    stopCampaignStatusPolling();
                    stopCampaignTimer();
                    localStorage.removeItem('campaignTargetTotal');
                    localStorage.removeItem('currentProcessingCSVId');
                    localStorage.removeItem('currentQueueId');
                    const startBtn = document.getElementById('startBtn');
                    const pauseBtn = document.getElementById('pauseBtn');
                    const campaignStatus = document.getElementById('campaignStatus');
                    if (startBtn) startBtn.style.display = 'inline-flex';
                    if (pauseBtn) pauseBtn.style.display = 'none';
                    if (campaignStatus) {
                        campaignStatus.textContent = 'Campaign failed';
                        campaignStatus.className = 'campaign-status error';
                    }
                    await refreshDashboardStatsFromBackend();
                    updateCSVQueueDisplay(queue);
                    updateDashboardStats(queue);
                    return;
                }
            }
        } catch (error) {
            console.warn('[DEBUG] Campaign status polling error:', error?.message || error);
        }
    }, 1500);
}

async function pollCampaignRuntimeEvents(queueId) {
    try {
        const token = getJwtToken();
        if (!token || !queueId) {
            return;
        }

        const seqKey = getCampaignLogSeqKey(queueId);
        const afterSeq = Number(localStorage.getItem(seqKey) || '0');
        const response = await fetch(`${API_BASE_URL}/campaign-queue/${queueId}/events?afterSeq=${afterSeq}&limit=100`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return;
        }

        const payload = await response.json();
        const events = Array.isArray(payload.events) ? payload.events : [];
        if (events.length === 0) {
            return;
        }

        events.forEach((event) => {
            appendBackendRuntimeEventToTerminal(event);
        });

        localStorage.setItem(seqKey, String(payload.nextSeq || afterSeq));
    } catch (error) {
        console.warn('[DEBUG] Runtime events polling error:', error?.message || error);
    }
}

function appendBackendRuntimeEventToTerminal(event) {
    const level = String(event?.level || 'info').toLowerCase();
    const type = level === 'success' ? 'success'
        : (level === 'error' ? 'error'
            : (level === 'warning' ? 'warning'
                : (level === 'status' ? 'status' : 'info')));

    const rowPrefix = event?.row ? `[row ${event.row}] ` : '';
    const recipientSuffix = event?.recipientEmail ? ` (${event.recipientEmail})` : '';
    addTerminalLog(`${rowPrefix}${event?.message || ''}${recipientSuffix}`, type);
}

async function loadPersistedCampaignLogs(limit = 200) {
    try {
        const token = getJwtToken();
        if (!token) {
            return 0;
        }

        const response = await fetch(`${API_BASE_URL}/campaign-queue/events/recent?limit=${limit}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...buildUserIdHeader()
            }
        });

        if (!response.ok) {
            return 0;
        }

        const payload = await response.json();
        const events = Array.isArray(payload.events) ? payload.events : [];
        if (events.length === 0) {
            return 0;
        }

        events.forEach((event) => appendBackendRuntimeEventToTerminal(event));

        const latestByQueue = new Map();
        events.forEach((event) => {
            if (event.queueId != null && event.seq != null) {
                const current = Number(latestByQueue.get(String(event.queueId)) || 0);
                const incoming = Number(event.seq || 0);
                if (incoming > current) {
                    latestByQueue.set(String(event.queueId), incoming);
                }
            }
        });

        latestByQueue.forEach((seq, queueId) => {
            localStorage.setItem(getCampaignLogSeqKey(queueId), String(seq));
        });
        return events.length;
    } catch (error) {
        console.warn('[DEBUG] Failed to load persisted runtime logs:', error?.message || error);
        return 0;
    }
}

function stopCampaignStatusPolling() {
    if (campaignStatusPollIntervalId) {
        clearInterval(campaignStatusPollIntervalId);
        campaignStatusPollIntervalId = null;
    }
}

function syncCampaignControlUI(queueParam = null) {
    const queue = Array.isArray(queueParam) ? queueParam : getCSVQueue();
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const campaignStatus = document.getElementById('campaignStatus');
    const isPaused = localStorage.getItem('campaignPaused') === 'true';
    const processingId = localStorage.getItem('currentProcessingCSVId');

    const processingCsv = queue.find(q => {
        const status = normalizeCsvStatus(q?.status);
        return status === 'processing' && String(q?.id) === String(processingId);
    });

    if (isPaused) {
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (pauseBtn) pauseBtn.style.display = 'none';
        updateCampaignButtonIcons('paused');
        return;
    }

    if (processingCsv) {
        if (startBtn) startBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'inline-flex';
        if (campaignStatus && !campaignStatus.textContent) {
            campaignStatus.textContent = 'Campaign running...';
            campaignStatus.className = 'campaign-status running';
        }
        updateCampaignButtonIcons('running');
        return;
    }

    if (startBtn) startBtn.style.display = 'inline-flex';
    if (pauseBtn) pauseBtn.style.display = 'none';
    updateCampaignButtonIcons('idle');
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
    
    // Fetch email providers from backend to get fresh data
    fetchEmailProvidersFromBackend(async function(providers) {
        // Check if at least one email provider/mailer is configured
        if (providers.length === 0) {
            showNotification('❌ No email provider configured. Please add and verify an email provider in Settings first.', 'error');
            return;
        }
        
        // Check user's email selection preference - fetch from backend
        let emailSelectionPref = 'default';
        try {
            const token = getJwtToken();
            if (token) {
                const response = await fetch(`${API_BASE_URL}/users/email-selection-preference`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    emailSelectionPref = data.preference || 'default';
                    console.log('[DEBUG] Email selection preference from backend:', emailSelectionPref);
                } else {
                    // Fallback to localStorage
                    emailSelectionPref = localStorage.getItem('emailSelectionPreference') || 'default';
                    console.log('[DEBUG] Using localStorage email preference:', emailSelectionPref);
                }
            } else {
                emailSelectionPref = localStorage.getItem('emailSelectionPreference') || 'default';
            }
        } catch (error) {
            console.warn('[DEBUG] Error fetching email preference from backend, using localStorage:', error);
            emailSelectionPref = localStorage.getItem('emailSelectionPreference') || 'default';
        }
        
        console.log('[DEBUG] Final email selection preference:', emailSelectionPref);
        
        // Always ask for email provider if preference is "prompt" (regardless of number of providers)
        if (emailSelectionPref === 'prompt') {
            console.log('[DEBUG] Showing email selection modal (prompt mode)');
            showEmailSelectionModal();
            return;
        }
        
        // Using default email provider
        
        // If no default provider is selected, select the first one
        if (!localStorage.getItem('selectedEmailProvider')) {
            localStorage.setItem('selectedEmailProvider', providers[0].id);
        }
        
// Check if at least one CSV is in the queue OR if there's pending CSV data
        const csvQueue = getCSVQueue();
        const hasPendingCSV = pendingCSVData.file && pendingCSVData.recipients.length > 0;
        
        if (csvQueue.length === 0 && !hasPendingCSV) {
            showNotification('❌ No CSV uploaded. Please select a CSV file first.', 'error');
            return;
        }
        
        // If there's pending CSV data, remind user to confirm upload
        if (hasPendingCSV && csvQueue.length === 0) {
            showNotification('⚠️ CSV file selected but not uploaded yet. Please click "Confirm Upload" button first.', 'warning');
            return;
        }
        
        const recipients = JSON.parse(localStorage.getItem('recipients') || '[]');
        const queueForValidation = getCSVQueue();
        const activeCsv = queueForValidation.find(q => {
            const status = normalizeCsvStatus(q?.status);
            return status === 'pending' || status === 'processing';
        });
        const totalRecipientsForValidation = recipients.length > 0
            ? recipients.length
            : Number(activeCsv?.recipientCount || activeCsv?.totalRows || 0);

        if (!isPaused && totalRecipientsForValidation <= 0) {
            showNotification('Please upload recipients first', 'error');
            return;
        }
        
        const subject = document.getElementById('emailSubject')?.value?.trim();
        const body = document.getElementById('emailBody')?.value || '';
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
            
            if (rangeTo > totalRecipientsForValidation) {
                showNotification(`To cannot exceed total recipients (${totalRecipientsForValidation})`, 'error');
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
    });
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
    const queueId = localStorage.getItem('currentQueueId');
    
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
        localStorage.removeItem('campaignSentProgress');
        localStorage.removeItem('csvStoppedAt');
        localStorage.removeItem('campaignElapsedTimeMS');  // Clear stored elapsed time
        localStorage.removeItem('currentQueueId');
        localStorage.removeItem('campaignTargetTotal');
        
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
    syncCSVQueueFromBackend().then(async (queue) => {
        await refreshDashboardStatsFromBackend();
        updateCSVQueueDisplay(queue);
        updateDashboardStats(queue);

        // Follow-up refresh to avoid transient stale stats immediately after completion.
        setTimeout(async () => {
            const latestQueue = await syncCSVQueueFromBackend();
            await refreshDashboardStatsFromBackend();
            updateCSVQueueDisplay(latestQueue);
            updateDashboardStats(latestQueue);
        }, 1200);
    });
    
    // Clear campaign state for next campaign
    localStorage.removeItem('currentProcessingCSVId');
    localStorage.removeItem('csvProgress');
    localStorage.removeItem('campaignSentProgress');
    localStorage.removeItem('campaignPaused');
    localStorage.removeItem('campaignPausedRow');
    localStorage.removeItem('campaignElapsedTimeMS');
    localStorage.removeItem('currentQueueId');
    localStorage.removeItem('campaignTargetTotal');

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

    const queueId = localStorage.getItem('currentQueueId');
    
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

    if (queueId) {
        const token = getJwtToken();
        fetch(`${API_BASE_URL}/campaign-queue/${queueId}/pause?reason=User paused`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(async (resp) => {
            if (!resp.ok) {
                return;
            }
            const pauseData = await resp.json().catch(() => ({}));
            const backendStatus = String(pauseData.status || '').toUpperCase();
            if (backendStatus === 'COMPLETED' || backendStatus === 'FAILED') {
                stopCampaignStatusPolling();
                onCampaignComplete();
            }
        })
        .catch((err) => {
            console.error('[DEBUG] Backend pause request failed:', err);
        });
    }

    stopCampaignStatusPolling();

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

async function resetStuckCSV() {
    // Cancel any active campaign timeout/timer
    if (campaignTimeoutId) {
        clearTimeout(campaignTimeoutId);
        campaignTimeoutId = null;
        // Timeout cleared on reset
    }
    
    // Stop the timer display and clear all timer variables immediately
    stopCampaignTimer();
    stopCampaignStatusPolling();
    
    // Reset any stuck CSV that's in processing state
    const processingId = localStorage.getItem('currentProcessingCSVId');
    const queue = getCSVQueue();
    const processingCsvId = processingId ? parseInt(processingId, 10) : null;
    let backendQueueId = Number(localStorage.getItem('currentQueueId') || '0') || null;

    // Recovery path: if queueId is missing/stale in local storage, get currently running queue from backend.
    if (!backendQueueId) {
        try {
            const token = getJwtToken();
            if (token) {
                const statsResp = await fetch(`${API_BASE_URL}/campaign-queue/dashboard-stats`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        ...buildUserIdHeader()
                    }
                });

                if (statsResp.ok) {
                    const statsPayload = await statsResp.json().catch(() => ({}));
                    const running = statsPayload?.running || null;
                    const runningQueueId = Number(running?.queueId || 0) || null;
                    const runningCsvId = Number(running?.csvUploadId || 0) || null;

                    if (runningQueueId && (!processingCsvId || !runningCsvId || runningCsvId === processingCsvId)) {
                        backendQueueId = runningQueueId;
                        localStorage.setItem('currentQueueId', String(runningQueueId));
                    }
                }
            }
        } catch (err) {
            console.warn('[DEBUG] Could not recover backend queue id during reset:', err);
        }
    }

    if (backendQueueId) {
        try {
            const token = getJwtToken();
            const userId = getCurrentUserId();
            const response = await fetch(`${API_BASE_URL}/campaign-queue/${backendQueueId}/reset`, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    'Content-Type': 'application/json',
                    ...(userId ? { 'X-User-Id': userId } : {})
                },
                body: JSON.stringify({ reason: 'Manual reset from dashboard' })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Reset failed (${response.status})`);
            }

            addTerminalLog(`Backend reset acknowledged for queue ${backendQueueId}`, 'info');
        } catch (error) {
            console.error('[DEBUG] Failed to reset campaign on backend:', error);
            showNotification(`❌ Failed to reset backend campaign: ${error.message}`, 'error');
            return;
        }
    } else if (processingCsvId) {
        showNotification('❌ Could not identify backend queue for reset. Please refresh and try again.', 'error');
        return;
    }
    
    if (processingCsvId) {
        const csv = queue.find(q => q.id === processingCsvId);
        if (csv && csv.status === 'processing') {
            // Set CSV back to pending state
            setCSVPending(processingCsvId);
            addTerminalLog(`CSV reset by user - forcefully cleared from processing state back to pending`, 'warning');
            activityLog.add(`CSV manually reset: ${csv.name} - returned to pending`, 'warning', 'sync');
        }
    }
    
    // Clear all processing-related data including timer data
    localStorage.removeItem('currentProcessingCSVId');
    localStorage.removeItem('csvProgress');
    localStorage.removeItem('campaignSentProgress');
    localStorage.removeItem('currentSessionLogs');
    localStorage.removeItem('csvStoppedAt');
    localStorage.removeItem('campaignPaused');
    localStorage.removeItem('campaignPausedRow');
    localStorage.removeItem('campaignEmailProvider');
    localStorage.removeItem('campaignElapsedTimeMS');  // Clear stored elapsed time
    localStorage.removeItem('currentQueueId');
    localStorage.removeItem('campaignTargetTotal');
    
    // Re-enable provider selector
    const providerSelect = document.getElementById('providerType');
    if (providerSelect) providerSelect.disabled = false;
    
    // Reset UI buttons and status
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('campaignStatus').textContent = '';
    
    // Update displays
    updateCurrentRunningCSV();
    await syncCSVQueueFromBackend();
    await refreshDashboardStatsFromBackend();
    updateCSVQueueDisplay();
    updateDashboardStats();  // Update stats after reset
    showNotification('✅ Stuck CSV reset and moved back to pending', 'success');
}

async function handleSaveDraft() {
    const subject = document.getElementById('emailSubject')?.value?.trim();
    const body = document.getElementById('emailBody')?.value || '';
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
            const errorMessage = String(errorData.error || 'Failed to save draft');

            // If existing draft ID is stale/non-draft, create a fresh draft instead of failing.
            if (isUpdate) {
                const fallbackResponse = await fetch(`${API_BASE_URL}/campaigns/draft/save`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(draftData)
                });

                if (!fallbackResponse.ok) {
                    const fallbackError = await fallbackResponse.json().catch(() => ({}));
                    const fallbackMessage = fallbackError.error || errorMessage;
                    console.error('[DEBUG] Draft fallback save failed:', fallbackMessage);
                    showNotification('❌ Failed to save draft: ' + fallbackMessage, 'error');
                    return;
                }

                response = fallbackResponse;
                isUpdate = false;
            } else {
                console.error('[DEBUG] Draft save failed:', errorMessage);
                showNotification('❌ Failed to save draft: ' + errorMessage, 'error');
                return;
            }
        }

        const backendResponse = await response.json();
        console.log('[DEBUG] Draft saved successfully:', backendResponse);

        // Store draft ID for future updates
        const draftId = backendResponse.campaignId || lastDraftId;
        localStorage.setItem('lastDraftId', draftId?.toString());
        persistLocalComposeDraft();

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

        // Fetch latest draft from backend
        console.log('[DEBUG] Loading saved draft from backend...');
        const response = await fetch(`${API_BASE_URL}/campaigns/draft/latest`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch latest draft');
            restoreLocalComposeDraft();
            return;
        }

        const data = await response.json();
        const draft = data?.draft || null;

        if (!draft || data?.hasDraft === false) {
            console.log('[DEBUG] No draft campaigns found');
            restoreLocalComposeDraft();
            return;
        }

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

        localStorage.setItem('emailDraft', JSON.stringify({
            subject: draft.subject || '',
            emailBody: draft.emailBody || '',
            sendTo: 'all',
            updatedAt: new Date().toISOString()
        }));

        // Update preview with loaded draft
        updatePreview();
        
        // Show range inputs if needed
        const rangeInputs = document.getElementById('rangeInputs');
        if (rangeInputs && sendToSelect?.value === 'range') {
            rangeInputs.style.display = 'flex';
        }
        
        // Update dashboard instantly when draft is loaded
        updateDashboardStats();
    } catch (error) {
        console.error('[DEBUG] Error loading saved draft:', error);
        restoreLocalComposeDraft();
        // Silently fail - don't block app loading
    }
}

async function handleClearDraft() {
    const clearBtn = document.getElementById('clearDraftBtn');
    const originalLabel = clearBtn?.innerHTML;

    showConfirmModal(
        '⚠️ Clear Draft?',
        'This will delete your saved compose draft from database and clear local draft data.',
        async () => {
            try {
                const token = getJwtToken();
                if (!token) {
                    showNotification('❌ Not logged in. Please login first.', 'error');
                    return;
                }

                if (clearBtn) {
                    clearBtn.disabled = true;
                    clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                }

                const response = await fetch(`${API_BASE_URL}/campaigns/draft`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Failed to clear draft (${response.status})`);
                }

                localStorage.removeItem('lastDraftId');
                localStorage.removeItem('emailDraft');

                const subjectInput = document.getElementById('emailSubject');
                const bodyInput = document.getElementById('emailBody');
                const sendToSelect = document.getElementById('sendToOption');
                const rangeInputs = document.getElementById('rangeInputs');

                if (subjectInput) subjectInput.value = '';
                if (bodyInput) bodyInput.value = '';
                if (sendToSelect) sendToSelect.value = 'all';
                if (rangeInputs) rangeInputs.style.display = 'none';

                updatePreview();
                showNotification('✅ Draft cleared successfully', 'success');
            } catch (error) {
                showNotification(`❌ ${error.message}`, 'error');
            } finally {
                if (clearBtn) {
                    clearBtn.disabled = false;
                    clearBtn.innerHTML = originalLabel || 'Clear Draft';
                }
            }
        },
        null,
        'Clear Draft',
        'Cancel'
    );
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
    localStorage.removeItem('lastDraftId');
    localStorage.removeItem('csvQueue');
    localStorage.removeItem('recipients');
    localStorage.removeItem('campaigns');
    localStorage.removeItem('currentSessionLogs');
    localStorage.removeItem('lifetimeStats');
    dashboardDbStatsCache = {};
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
    lines: [],
    file: null  // Store the actual File object for backend submission
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

// Fetch CSV queue from backend database
function normalizeCsvStatus(status) {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'queued' || normalized === 'queue') {
        return 'pending';
    }
    if (normalized === 'in_progress' || normalized === 'in-progress') {
        return 'processing';
    }
    if (normalized === 'done') {
        return 'completed';
    }

    return normalized || 'pending';
}

// Get CSV queue from LOCAL CACHE - synchronous, returns immediately
function getCSVQueue() {
    const cached = localStorage.getItem('csvQueue');
    const queue = cached ? JSON.parse(cached) : [];
    if (!Array.isArray(queue)) {
        return [];
    }
    return queue.map(item => ({
        ...item,
        status: normalizeCsvStatus(item?.status)
    }));
}

// Fetch CSV queue from BACKEND and update cache - call this when you need fresh data from server
async function syncCSVQueueFromBackend() {
    try {
        const token = getJwtToken();
        if (!token) {
            console.warn('[CSV QUEUE] No token, skipping backend sync');
            return getCSVQueue(); // Return cached version
        }
        
        const response = await fetch(`${API_BASE_URL}/csv/queue`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn('[CSV QUEUE] Failed to sync from backend:', response.status);
            return getCSVQueue(); // Return cached version on error
        }

        const data = await response.json();
        console.log('[CSV QUEUE] Backend queue:', data);

        // Convert backend format to frontend format
        if (data.queue && Array.isArray(data.queue)) {
            const queue = data.queue.map(csv => ({
                id: csv.id,
                name: csv.name,
                databaseId: csv.id,
                status: normalizeCsvStatus(csv.status),
                uploadedAt: new Date(csv.uploadedAt).toLocaleString(),
                completedAt: null,
                recipients: [],
                recipientCount: csv.recipientCount || csv.recipients || 0,
                totalRows: csv.recipients || 0,
                queuePosition: csv.queuePosition
            }));

            console.log('[CSV QUEUE] Loaded', queue.length, 'items from backend');
            console.log('[CSV QUEUE] Queue items after mapping:', queue.map(q => ({ id: q.id, name: q.name })));
            localStorage.setItem('csvQueue', JSON.stringify(queue));
            console.log('[CSV QUEUE] Stored in localStorage:', JSON.parse(localStorage.getItem('csvQueue')).map(q => ({ id: q.id, name: q.name })));
            return queue;
        }
        
        return getCSVQueue(); // Return cached version
    } catch (error) {
        console.error('[CSV QUEUE] Sync error:', error);
        return getCSVQueue(); // Return cached version on error
    }
}

// Save happens automatically via API calls now
async function saveCSVQueue(queue) {
    // localStorage cache is updated by individual API calls
    if (!Array.isArray(queue)) {
        queue = [];
    }
    localStorage.setItem('csvQueue', JSON.stringify(queue));
    updateCSVQueueDisplay(queue);
    updateDashboardStats(queue);
}

// Add CSV to queue via API
async function addToCSVQueue(name, recipients, uploadId = null) {
    try {
        const token = getJwtToken();
        if (!token) {
            showNotification('❌ Not logged in. Please login first.', 'error');
            window.location.href = 'auth.html';
            return false;
        }
        
        if (!uploadId) {
            showNotification('❌ Invalid CSV ID', 'error');
            return false;
        }
        
        console.log('[CSV QUEUE] Adding', uploadId, 'to queue. Type:', typeof uploadId, 'Value:', uploadId);
        
        // Ensure uploadId is a number
        const numericUploadId = Number(uploadId);
        if (isNaN(numericUploadId)) {
            console.error('[CSV QUEUE] Invalid uploadId - not a number:', uploadId);
            showNotification('❌ Invalid CSV ID format', 'error');
            return false;
        }
        
        const url = `${API_BASE_URL}/csv/queue/${numericUploadId}`;
        console.log('[CSV QUEUE] Making request to URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('[CSV QUEUE] Successfully added to queue:', data);
            
            // Refresh queue display from backend
            await syncCSVQueueFromBackend();
            updateCSVQueueDisplay();
            updateDashboardStats();
            
            showNotification(`✅ CSV "${name}" added to queue`, 'success');
            activityLog.add(`CSV uploaded: ${name} (${recipients.length} recipients)`, 'info', 'file-csv');
            
            return true;
        } else {
            const error = await response.json();
            showNotification(`❌ ${error.error || 'Failed to add to queue'}`, 'error');
            console.error('[CSV QUEUE] Add failed:', error);
            return false;
        }
    } catch (error) {
        showNotification(`❌ Error adding to queue: ${error.message}`, 'error');
        console.error('[CSV QUEUE] API error:', error);
        return false;
    }
}

async function removeFromCSVQueue(id) {
    // Cannot remove if processing
    const processingId = localStorage.getItem('currentProcessingCSVId');
    if (processingId && parseInt(processingId) === id) {
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

    // ============ REMOVE FROM QUEUE VIA API ============
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

        console.log('[CSV QUEUE] Removing from queue - ID:', id);
        
        const response = await fetch(`${API_BASE_URL}/csv/queue/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `Delete failed with status ${response.status}`;
            console.error('[CSV QUEUE] Removal failed:', errorMessage);
            
            // ============ RESTORE BUTTON STATE ON ERROR ============
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteIcon.className = 'fas fa-trash'; // Restore icon
            }
            
            showNotification('❌ Failed to remove from queue: ' + errorMessage, 'error');
            return false;
        }

        const backendResponse = await response.json();
        console.log('[CSV QUEUE] Successfully removed from queue:', backendResponse);
        
        // Refresh queue display from backend
        await syncCSVQueueFromBackend();
        updateCSVQueueDisplay();
        updateDashboardStats();
        
        showNotification('✅ CSV removed from queue', 'success');
        return true;
        
    } catch (error) {
        console.error('[CSV QUEUE] Removal error:', error);
        
        // ============ RESTORE BUTTON STATE ON ERROR ============
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteIcon.className = 'fas fa-trash'; // Restore icon
        }
        
        showNotification('❌ Failed to remove from queue: ' + error.message, 'error');
        return false;
    }
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

function reprocessCSV(id, buttonEl) {
    return reprocessCSVAsync(id, buttonEl);
}

async function reprocessCSVAsync(id, buttonEl) {
    const originalLabel = buttonEl?.innerHTML;
    if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    try {
        const token = getJwtToken();
        if (!token) {
            showNotification('❌ Not logged in. Please login again.', 'error');
            window.location.href = 'auth.html';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/csv/queue/${id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData.error || `Reprocess failed (${response.status})`;
            showNotification(`❌ ${msg}`, 'error');
            return;
        }

        const refreshedQueue = await syncCSVQueueFromBackend();
        const updatedItem = refreshedQueue.find(q => String(q.id) === String(id));
        const name = updatedItem?.name || `CSV ${id}`;

        activityLog.add(`CSV re-added to queue: ${name}`, 'info', 'redo');
        showNotification(`✅ ${name} has been re-added to queue`, 'success');
        updateCSVQueueDisplay(refreshedQueue);
        updateDashboardStats(refreshedQueue);
    } catch (error) {
        showNotification(`❌ Failed to reprocess CSV: ${error.message}`, 'error');
    } finally {
        if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.innerHTML = originalLabel || '<i class="fas fa-redo"></i>';
        }
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

function updateCSVQueueDisplay(queue) {
    // If no queue passed, try to get from localStorage cache
    if (!queue) {
        queue = JSON.parse(localStorage.getItem('csvQueue') || '[]');
    }
    
    // Normalize queue payload to avoid status/counter mismatches from backend/local cache
    if (Array.isArray(queue)) {
        queue = queue.map(csv => ({
            ...csv,
            status: normalizeCsvStatus(csv?.status),
            recipientCount: Number(csv?.recipientCount ?? csv?.totalRows ?? csv?.recipients ?? 0) || 0
        }));
    }
    
    if (!Array.isArray(queue)) {
        queue = [];
    }
    
    console.log('[QUEUE DISPLAY] Queue items with names:', queue.map(q => ({ id: q.id, name: q.name, status: q.status, recipientCount: q.recipientCount })));

    const queueSection = document.getElementById('csvQueueSection');
    const queueList = document.getElementById('csvQueueList');
    const queueCount = document.getElementById('queueCount');

    if (!Array.isArray(queue) || queue.length === 0) {
        queueSection.style.display = 'none';
        return;
    }

    queueSection.style.display = 'block';
    const activeQueueCount = queue.filter(item => item.status === 'pending' || item.status === 'processing').length;
    queueCount.textContent = `(${activeQueueCount}/5)`;

    const getStatusMeta = (status) => {
        if (status === 'processing') return { icon: 'spinner fa-spin', label: 'Processing' };
        if (status === 'completed') return { icon: 'check-circle', label: 'Completed' };
        if (status === 'failed') return { icon: 'times-circle', label: 'Failed' };
        return { icon: 'hourglass-half', label: 'Ready' };
    };

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
                            <i class="fas fa-${getStatusMeta(item.status).icon}"></i>
                            ${getStatusMeta(item.status).label}
                        </span>
                    </div>
                </div>
            </div>
            <div class="queue-item-actions">
                ${item.status === 'completed' || item.status === 'failed' ? `
                    <button id="reprocessBtn-${item.id}" class="btn btn-secondary" onclick="reprocessCSV(${item.id}, this)" title="Add back to pending queue">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button id="deleteBtn-${item.id}" class="btn btn-secondary" onclick="removeFromCSVQueue(${item.id})" title="Delete from database and storage">
                        <i id="deleteIcon-${item.id}" class="fas fa-trash"></i>
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

    syncCampaignControlUI(queue);
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
function updateDashboardStats(queue) {
    // If no queue passed, try to get from localStorage cache
    if (!queue) {
        queue = JSON.parse(localStorage.getItem('csvQueue') || '[]');
    }
    
    if (!Array.isArray(queue)) {
        queue = [];
    }

    // Normalize queue payload to avoid status/counter mismatches from backend/local cache
    queue = queue.map(csv => ({
        ...csv,
        status: normalizeCsvStatus(csv?.status),
        recipientCount: Number(csv?.recipientCount ?? csv?.totalRows ?? csv?.recipients ?? 0) || 0
    }));
    
    const dbStats = getDashboardStatsCache();
    
    // Get current processing campaign details
    const processingId = localStorage.getItem('currentProcessingCSVId');
    const csvProgress = parseInt(localStorage.getItem('csvProgress') || '0');
    const sentProgress = parseInt(localStorage.getItem('campaignSentProgress') || '0');
    let emailsSent = 0;
    let emailsTotal = 0;
    let emailsLeft = 0;
    let currentCSV = null;
    
    if (processingId) {
        currentCSV = queue.find(q => String(q.id) === String(processingId));
        if (currentCSV && currentCSV.recipientCount > 0) {
            emailsSent = sentProgress;
            emailsTotal = currentCSV.recipientCount;
            emailsLeft = Math.max(0, emailsTotal - emailsSent);
        }
    }
    
    // 1. Current Queue - total recipients in pending and processing CSVs
    const currentQueueCount = queue.reduce((sum, csv) => {
        if (csv.status === 'pending' || csv.status === 'processing') {
            return sum + (Number(csv.recipientCount) || 0);
        }
        return sum;
    }, 0);
    
    // 2. Pending count - number of CSVs in pending state
    const pendingCSVCount = queue.filter(q => q.status === 'pending').length;
    
    const sessionLogs = JSON.parse(localStorage.getItem('currentSessionLogs') || '{}');

    // 3. Sent today - DB daily aggregate + live running queue counters
    const runningSent = Number(dbStats?.running?.sent ?? 0) || 0;
    const runningFailed = Number(dbStats?.running?.failed ?? 0) || 0;
    const localSentLive = processingId ? Math.max(0, sentProgress) : 0;
    const localFailedLive = processingId ? Math.max(0, Number(sessionLogs?.failureCount ?? 0) || 0) : 0;
    const effectiveLiveSent = Math.max(runningSent, localSentLive);
    const effectiveLiveFailed = Math.max(runningFailed, localFailedLive);
    const sentToday = (Number(dbStats?.daily?.sent ?? 0) || 0) + effectiveLiveSent;
    
    // 4. Failed today - DB daily aggregate + live running queue counters
    const failedToday = (Number(dbStats?.daily?.failed ?? 0) || 0) + effectiveLiveFailed;
    
    // 5. Failed during current campaign (same as failedToday if campaign is running)
    const failedDuringCampaign = (processingId) ? failedToday : 0;
    
    // 6. Total sent till date (YTD aggregate + current running queue)
    const totalSent = (Number(dbStats?.ytd?.sent ?? 0) || 0) + effectiveLiveSent;
    
    // 7. Total failed till date (YTD aggregate + current running queue)
    const totalFailed = (Number(dbStats?.ytd?.failed ?? 0) || 0) + effectiveLiveFailed;
    
    // 8. Calculate success rate till date
    let successRate = 0;
    const ytdTotalForRate = totalSent + totalFailed;
    if (ytdTotalForRate > 0) {
        successRate = Math.round((totalSent / ytdTotalForRate) * 100);
    }
    
    // 9. Calculate success rate for today's session
    let todaySuccessRate = 0;
    const todayTotal = sentToday + failedToday;
    if (todayTotal > 0) {
        todaySuccessRate = Math.round((sentToday / todayTotal) * 100);
    }
    
    // Update UI - RUNNING CAMPAIGN
    // Always display: sent / total-to-process (total from backend when available)
    let campaignProgressDisplay;
    const runningFromDb = dbStats?.running || null;
    const queueCsvToProcess = currentCSV || queue.find(csv => csv.status === 'pending' || csv.status === 'processing');
    const pendingCsvRecipientCount = Array.isArray(pendingCSVData?.recipients) ? pendingCSVData.recipients.length : 0;

    const sendToOption = document.getElementById('sendToOption')?.value || 'all';
    const rangeFromInput = document.getElementById('rangeFrom')?.value || '1';
    const rangeToInput = document.getElementById('rangeTo')?.value || '1';
    const rangeFrom = Math.max(1, parseInt(rangeFromInput, 10) || 1);
    const rangeTo = Math.max(rangeFrom, parseInt(rangeToInput, 10) || rangeFrom);

    // Pick base total from backend campaign target first, else active CSV in queue, else pending file in uploader
    const backendTargetTotal = getCampaignTargetTotal(queue);
    const baseTotal = backendTargetTotal > 0
        ? backendTargetTotal
        : (queueCsvToProcess ? (Number(queueCsvToProcess.recipientCount) || 0) : pendingCsvRecipientCount);

    let targetTotal = baseTotal;
    if (sendToOption === 'range') {
        const requestedTotal = Math.max(0, rangeTo - rangeFrom + 1);
        targetTotal = baseTotal > 0 ? Math.min(baseTotal, requestedTotal) : requestedTotal;
    }

    if (runningFromDb && Number(runningFromDb.total) > 0) {
        const processedCount = Math.max(0, Number(runningFromDb.processed) || 0);
        const totalCount = Math.max(0, Number(runningFromDb.total) || 0);
        const boundedProcessed = Math.min(processedCount, totalCount);
        campaignProgressDisplay = `${boundedProcessed}/${totalCount}`;
    } else if (processingId) {
        const processedCount = Math.max(0, Number(csvProgress) || 0);
        const boundedProcessed = targetTotal > 0 ? Math.min(processedCount, targetTotal) : processedCount;
        campaignProgressDisplay = `${boundedProcessed}/${targetTotal}`;
    } else if (targetTotal > 0) {
        campaignProgressDisplay = `0/${targetTotal}`;
    } else {
        campaignProgressDisplay = '0/0';
    }
    document.getElementById('statCampaignProgress').textContent = campaignProgressDisplay;
    
    // Update CSV to Process - only show actionable CSVs (running, pending, or current upload draft).
    let csvToProcessDisplay = 'None';
    
    // Priority 1: Show next CSV in queue (pending or processing)
    if (runningFromDb && Number(runningFromDb.csvUploadId) > 0) {
        const runningCsv = queue.find(csv => String(csv.id) === String(runningFromDb.csvUploadId));
        csvToProcessDisplay = runningCsv?.name || csvToProcessDisplay;
    }

    if (csvToProcessDisplay === 'None' && queueCsvToProcess) {
        csvToProcessDisplay = queueCsvToProcess.name || 'Unknown';
    }
    // Priority 2: Show pending CSV being uploaded
    else if (pendingCSVData?.fileName) {
        csvToProcessDisplay = pendingCSVData.fileName;
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
        parseCSV(csv, file.name, file);  // Pass the file object
    };
    reader.readAsText(file);
}

function parseCSV(csv, fileName, file) {
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
        lines: lines,
        file: file  // Store the actual File object for backend submission
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
        const queueAddSuccess = await addToCSVQueue(
            pendingCSVData.fileName,
            pendingCSVData.recipients,
            backendResponse.uploadId
        );

        if (queueAddSuccess) {
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
        } else {
            // Keep preview data so user can retry queueing without re-uploading the file.
            showNotification('❌ CSV uploaded but could not be added to queue. Please retry.', 'error');
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
    
    // Use classList to avoid flickering - remove old type class and add new one
    notif.classList.remove('type-success', 'type-error', 'type-warning', 'type-info');
    notif.classList.add(`type-${type}`);
    
    // Show the notification
    notif.classList.add('show');
    
    // Hide after duration
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
    
    // Fetch email providers from backend (instead of localStorage)
    fetchEmailProvidersFromBackend(async function(providers) {
        // Also fetch the default email provider from backend
        let selectedEmailProviderId = localStorage.getItem('selectedEmailProvider');
        
        try {
            const token = getJwtToken();
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            console.log('[DEBUG] Fetching default email provider from backend...');
            
            const response = await fetch(`${API_BASE_URL}/email-providers/default`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.defaultProvider && data.defaultProvider.id) {
                    selectedEmailProviderId = String(data.defaultProvider.id);
                    // Update localStorage with the default from backend
                    localStorage.setItem('selectedEmailProvider', selectedEmailProviderId);
                    console.log('[DEBUG] Default email provider from backend:', selectedEmailProviderId);
                }
            } else {
                console.log('[DEBUG] No default email provider set on backend');
            }
        } catch (error) {
            console.warn('[DEBUG] Could not fetch default from backend, using localStorage:', error.message);
        }
        
        displayEmailProviders(providers, selectedEmailProviderId);
        updateMailProviderStat();
    });
}

/**
 * Fetch email providers from backend database
 */
async function fetchEmailProvidersFromBackend(callback) {
    try {
        const token = getJwtToken();
        const userId = getCurrentUserId();
        
        console.log('[DEBUG] Fetching providers - Token:', token ? 'Present' : 'Missing', 'UserId:', userId);
        
        // Use the AUTHENTICATED endpoint that extracts userId from JWT token
        const response = await fetch(`${API_BASE_URL}/email-providers`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('[DEBUG] Providers fetch response status:', response.status);
        
        if (!response.ok) {
            console.error('[ERROR] Failed to fetch email providers - Status:', response.status);
            throw new Error(`API returned ${response.status}`);
        }
        
        let data = await response.json();
        console.log('[DEBUG] Raw response from backend:', data);
        
        // Handle the response structure - providers are in an array under "providers" key OR at root level
        let providers = Array.isArray(data) ? data : (data.providers || []);
        
        console.log('[DEBUG] Extracted providers:', providers);
        
        // Transform backend data to frontend format
        if (providers && Array.isArray(providers)) {
            providers = providers.map(p => ({
                id: p.id,
                name: p.displayName || p.fromEmail,
                email: p.fromEmail,
                type: p.providerType.toLowerCase(),
                isVerified: p.isVerified,
                isActive: p.isActive,
                createdAt: p.createdAt
            }));
        } else {
            providers = [];
        }
        
        // Also update localStorage as cache (but fetch from DB is primary source)
        localStorage.setItem('emailProviders', JSON.stringify(providers));
        
        console.log('[DEBUG] Email providers fetched from backend:', providers);
        console.log('[DEBUG] Calling callback with', providers.length, 'providers');
        callback(providers);
        
    } catch (error) {
        console.error('[ERROR] Error fetching email providers from backend:', error);
        console.log('[DEBUG] Checking localStorage for cached providers...');
        
        // Fallback to localStorage cache if backend fails
        const cachedProviders = JSON.parse(localStorage.getItem('emailProviders') || '[]');
        console.log('[DEBUG] Found', cachedProviders.length, 'cached providers in localStorage');
        callback(cachedProviders);
    }
}

function displayEmailProviders(providers, selectedEmailProviderId) {
    const providersContainer = document.getElementById('providersContainer');
    
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
    
    // Auto-select first provider if only one exists and none is selected
    if (providers.length === 1 && !selectedEmailProviderId) {
        selectedEmailProviderId = String(providers[0].id);
        localStorage.setItem('selectedEmailProvider', selectedEmailProviderId);
        console.log('[EMAIL PROVIDER] Auto-selected single provider:', providers[0].name);
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

async function setDefaultProvider(e) {
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
        try {
            // Call backend API to set as default
            const token = getJwtToken();
            if (!token) {
                showNotification('❌ Not logged in. Please login first.', 'error');
                window.location.href = 'auth.html';
                return;
            }
            
            console.log('[EMAIL PROVIDER] Calling backend to set default provider:', selectedProviderId);
            
            const response = await fetch(`${API_BASE_URL}/email-providers/${selectedProviderId}/set-as-default`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Store the selected provider ID in localStorage as backup
                localStorage.setItem('selectedEmailProvider', selectedProviderId);
                
                // Show success notification
                showNotification(`✅ ${selectedProvider.name} is now set as default email provider!`, 'success');
                
                console.log('[EMAIL PROVIDER] Default provider set successfully:', selectedProvider.name, selectedProviderId);
                
                // Reload the provider list to update UI with star indicator
                loadEmailProviders();
                
                // Update dashboard stat in real-time
                updateMailProviderStat();
            } else {
                const error = await response.json();
                showNotification(`❌ Failed to set default provider: ${error.error || 'Unknown error'}`, 'error');
                console.error('[EMAIL PROVIDER] Failed to set default provider:', error);
                e.target.checked = false;
            }
        } catch (error) {
            showNotification(`❌ Error setting default provider: ${error.message}`, 'error');
            console.error('[EMAIL PROVIDER] API call error:', error);
            e.target.checked = false;
        }
    }
}

function setupSecurityForm() {
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordUpdate);
    }
}

function setupEmailSelectionPreference() {
    // Load saved preference from backend first, fallback to localStorage
    loadEmailSelectionPreferenceFromBackend();

    // Add event listeners to save preference when changed
    const emailSelectionRadios = document.querySelectorAll('input[name="emailSelection"]');
    emailSelectionRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                saveEmailSelectionPreferenceToBackend(e.target.value);
            }
        });
    });
}

/**
 * Load email selection preference from backend database
 */
async function loadEmailSelectionPreferenceFromBackend() {
    try {
        const token = getJwtToken();
        if (!token) {
            console.log('[EMAIL PREF] No token, using localStorage');
            loadEmailSelectionPreferenceFromStorage();
            return;
        }

        const response = await fetch(`${API_BASE_URL}/users/email-selection-preference`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const preference = data.preference || 'default';
            console.log('[EMAIL PREF] Loaded from backend:', preference);

            // Update UI
            const radio = document.querySelector(`input[name="emailSelection"][value="${preference}"]`);
            if (radio) {
                radio.checked = true;
            }

            // Cache in localStorage
            localStorage.setItem('emailSelectionPreference', preference);
        } else {
            console.warn('[EMAIL PREF] Backend fetch failed, using localStorage');
            loadEmailSelectionPreferenceFromStorage();
        }
    } catch (error) {
        console.warn('[EMAIL PREF] Error loading from backend:', error);
        loadEmailSelectionPreferenceFromStorage();
    }
}

/**
 * Load email selection preference from localStorage (fallback)
 */
function loadEmailSelectionPreferenceFromStorage() {
    const savedPreference = localStorage.getItem('emailSelectionPreference') || 'default';
    const radio = document.querySelector(`input[name="emailSelection"][value="${savedPreference}"]`);
    if (radio) {
        radio.checked = true;
    }
}

/**
 * Save email selection preference to backend database
 */
async function saveEmailSelectionPreferenceToBackend(preference) {
    try {
        const token = getJwtToken();
        if (!token) {
            console.log('[EMAIL PREF] No token, saving to localStorage only');
            localStorage.setItem('emailSelectionPreference', preference);
            showNotification(`✅ Email preference set to: ${preference === 'prompt' ? 'Ask me' : 'Default'}`, 'success');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/users/email-selection-preference`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ preference })
        });

        if (response.ok) {
            console.log('[EMAIL PREF] Saved to backend:', preference);
            localStorage.setItem('emailSelectionPreference', preference);
            showNotification(`✅ Email preference set to: ${preference === 'prompt' ? 'Ask me' : 'Default'}`, 'success');
        } else {
            const error = await response.json();
            console.error('[EMAIL PREF] Backend save failed:', error);
            localStorage.setItem('emailSelectionPreference', preference);
            showNotification(`⚠️ Saved locally (backend sync failed): ${preference === 'prompt' ? 'Ask me' : 'Default'}`, 'warning');
        }
    } catch (error) {
        console.error('[EMAIL PREF] Error saving to backend:', error);
        localStorage.setItem('emailSelectionPreference', preference);
        showNotification(`⚠️ Saved locally: ${preference === 'prompt' ? 'Ask me' : 'Default'}`, 'warning');
    }
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
    if (deleteBtn && deleteBtn.dataset.deleteAccountBound !== 'true') {
        deleteBtn.addEventListener('click', handleDeleteAccountClick);
        deleteBtn.dataset.deleteAccountBound = 'true';
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
            window.location.href = 'auth.html';
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
        syncCampaignControlUI();
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
        syncCampaignControlUI();
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
        startCampaignTimer(true);
        startCampaignStatusPolling();
    }
    
    console.log('[DEBUG] Campaign state restored - isPaused:', isPaused, 'pausedRow:', pausedRow);
    syncCampaignControlUI(queue);
}

/**
 * Restore terminal logs on page reload
 * Restores all campaign logs that were saved to localStorage
 */
function restoreTerminalLogs() {
    const logsList = document.getElementById('logsList');
    const terminalContent = logsList?.querySelector('.terminal-content');
    if (!terminalContent) {
        return;
    }

    terminalContent.innerHTML = '<p class="terminal-line terminal-info">Loading persisted logs...</p>';

    loadPersistedCampaignLogs(500).then((persistedCount) => {
        if (persistedCount > 0) {
            if (logsList) logsList.scrollTop = logsList.scrollHeight;
            return;
        }

    const sessionLogs = JSON.parse(localStorage.getItem('currentSessionLogs') || '{}');
    
    // If no logs exist, nothing to restore
    if (!sessionLogs.logs || sessionLogs.logs.length === 0) {
        console.log('[DEBUG] No logs to restore from localStorage');
            terminalContent.innerHTML = '<p class="terminal-line terminal-info">System ready...</p>';
        return;
    }

        terminalContent.innerHTML = '';
    
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
    });
}

async function exportTerminalLogs() {
    try {
        const token = getJwtToken();
        if (!token) {
            showNotification('❌ Please login again to export logs', 'error');
            return;
        }

        const queueId = localStorage.getItem('currentQueueId');
        const params = new URLSearchParams();
        params.set('limit', '10000');
        if (queueId) {
            params.set('queueId', String(queueId));
        }

        const response = await fetch(`${API_BASE_URL}/campaign-queue/events/export?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...buildUserIdHeader()
            }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to export logs');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = queueId ? `campaign-logs-queue-${queueId}.txt` : 'campaign-logs-all.txt';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        showNotification('✅ Logs exported successfully', 'success');
    } catch (error) {
        showNotification(`❌ ${error.message}`, 'error');
    }
}

async function handleClearDashboardStats() {
    const queue = getCSVQueue();
    const isRunning = queue.some(item => normalizeCsvStatus(item?.status) === 'processing');
    if (isRunning) {
        showNotification('⚠️ Cannot clear stats while a campaign is running. Pause or complete it first.', 'warning');
        return;
    }

    showConfirmModal(
        '⚠️ Clear Dashboard Stats?',
        'This will permanently delete all persisted <strong>Today</strong> and <strong>Till Date</strong> stats from database tables for your account. This cannot be undone.',
        async () => {
            const clearStatsBtn = document.getElementById('clearStatsBtn');
            const originalLabel = clearStatsBtn?.innerHTML;
            if (clearStatsBtn) {
                clearStatsBtn.disabled = true;
                clearStatsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }

            try {
                const token = getJwtToken();
                if (!token) {
                    showNotification('❌ Not logged in. Please login again.', 'error');
                    window.location.href = 'auth.html';
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/campaign-queue/dashboard-stats`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        ...buildUserIdHeader()
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Failed to clear stats (${response.status})`);
                }

                dashboardDbStatsCache = {
                    daily: { sent: 0, failed: 0, total: 0 },
                    ytd: { sent: 0, failed: 0, total: 0 },
                    running: null
                };

                localStorage.removeItem('lifetimeStats');
                localStorage.removeItem('campaignSentProgress');
                localStorage.removeItem('csvProgress');
                localStorage.removeItem('campaignTargetTotal');

                await refreshDashboardStatsFromBackend();
                updateDashboardStats(getCSVQueue());

                showNotification('✅ Dashboard stats cleared successfully', 'success');
            } catch (error) {
                showNotification(`❌ ${error.message}`, 'error');
            } finally {
                if (clearStatsBtn) {
                    clearStatsBtn.disabled = false;
                    clearStatsBtn.innerHTML = originalLabel || '<i class="fas fa-trash-can"></i>';
                }
            }
        },
        null,
        'Clear Stats',
        'Cancel'
    );
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

/**
 * Send campaign CSV file to backend for processing and queuing
 * @param {File} csvFile - The CSV file to send
 * @param {string} campaignName - Name of the campaign
 * @param {string} subject - Email subject
 * @param {string} body - Email body content
 * @param {Long} providerId - Email provider ID
 */
async function sendCampaignToBackend(csvFile, campaignName, subject, body, providerId) {
    try {
        if (!csvFile) {
            showNotification('❌ No CSV file available. Please upload a CSV first.', 'error');
            return null;
        }

        console.log('[DEBUG] Sending campaign to backend:', {
            campaignName,
            subject,
            providerId,
            fileName: csvFile.name
        });

        const token = getJwtToken();
        const userId = getCurrentUserId();

        const formData = new FormData();
        formData.append('csvFile', csvFile);
        formData.append('campaignName', campaignName || csvFile.name.replace('.csv', ''));
        formData.append('subject', subject);
        formData.append('body', body);
        formData.append('providerId', providerId);

        // Show loading state
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading to Backend...';
        }

        const response = await fetch(`${API_BASE_URL}/campaigns/upload-csv`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...(userId ? { 'X-User-Id': userId } : {})
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Backend request failed (${response.status})`);
        }

        const backendResponse = await response.json();
        console.log('[DEBUG] Backend response:', backendResponse);

        // Add to local queue for display
        if (backendResponse.success && backendResponse.queueId) {
            const queueItem = {
                id: backendResponse.queueId,
                name: campaignName || csvFile.name,
                recipients: JSON.parse(localStorage.getItem('recipients') || '[]'),
                recipientCount: backendResponse.totalRecipients,
                status: 'pending',
                uploadedAt: new Date().toLocaleString(),
                completedAt: null,
                databaseId: backendResponse.csvUploadId,
                campaignId: backendResponse.campaignId,
                backendQueue: true  // Mark as from backend
            };

            // Add to CSV queue
            const queue = getCSVQueue();
            queue.push(queueItem);
            saveCSVQueue(queue);

            showNotification(`✅ Campaign queued successfully! Queue position: ${backendResponse.queuePosition}`, 'success');
            
            // Log activity
            activityLog.add(`Campaign created: ${campaignName} (${backendResponse.totalRecipients} recipients) - Queue position: ${backendResponse.queuePosition}`, 'campaign-start', 'play-circle');

            return backendResponse;
        } else {
            throw new Error('Invalid response from backend');
        }

    } catch (error) {
        console.error('[ERROR] Failed to send campaign to backend:', error);
        showNotification(`❌ Failed to send campaign: ${error.message}`, 'error');
        
        // Restore button state
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Start Campaign';
        }
        
        return null;
    }
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
    
    // Get campaign details from UI
    const subject = document.getElementById('emailSubject')?.value?.trim();
    const body = document.getElementById('emailBody')?.value || '';
    let selectedEmailProviderId = localStorage.getItem('selectedEmailProvider');
    
    console.log('[DEBUG] Subject:', subject ? 'Present' : 'MISSING');
    console.log('[DEBUG] Body:', body ? 'Present' : 'MISSING');
    console.log('[DEBUG] Selected Email Provider ID:', selectedEmailProviderId);
    
    // Check email selection preference - prompt if needed
    const emailSelectionPref = localStorage.getItem('emailSelectionPreference') || 'default';
    if (emailSelectionPref === 'prompt') {
        // Get list of available providers
        const providers = JSON.parse(localStorage.getItem('emailProviders') || '[]');
        
        if (providers.length === 0) {
            showNotification('❌ No email providers available. Please add and configure an email provider first.', 'error');
            return;
        }
        
        if (providers.length === 1) {
            // Only one provider - auto-select it
            selectedEmailProviderId = String(providers[0].id);
            localStorage.setItem('selectedEmailProvider', selectedEmailProviderId);
        } else if (providers.length > 1) {
            // Multiple providers - show modal for selection
            showEmailProviderSelectionModal(() => {
                // Callback: after user selects provider, resume campaign start
                const newSelectedId = localStorage.getItem('selectedEmailProvider');
                if (newSelectedId) {
                    selectedEmailProviderId = newSelectedId;
                    // Re-call proceedWithCampaignStart to continue with selected provider
                    // But first, remove the preference check to avoid infinite loop
                    continueCampaignStart(subject, body, selectedEmailProviderId);
                }
            });
            return; // Exit here, modal will handle the flow
        }
    }
    
    // Continue with normal campaign start
    continueCampaignStart(subject, body, selectedEmailProviderId);
}

/**
 * Continue campaign start after email provider is confirmed
 */
function continueCampaignStart(subject, body, selectedEmailProviderId) {
    // Check for CSV - either in pendingCSVData OR in the queue
    let csvToUse = null;
    
    // Priority 1: Check if there's a pending/processing CSV in the queue (from backend upload)
    let queue = getCSVQueue();
    console.log('[DEBUG] Queue at campaign start:', JSON.stringify(queue));
    
    // Look for any CSV in queue (pending, processing, or completed for reprocessing)
    let queuedCSV = queue.find(q => {
        const status = normalizeCsvStatus(q?.status);
        console.log('[DEBUG] Checking CSV id=', q?.id, 'rawStatus=', q?.status, '-> normalized:', status);
        return status === 'pending' || status === 'processing';
    });
    
    if (queuedCSV) {
        console.log('[DEBUG] Found CSV in queue:', queuedCSV);
        csvToUse = queuedCSV;
        // Store recipients from queue for the campaign
        // For completed CSVs (reprocessing), use totalRows or recipientCount
        const recipients = queuedCSV.recipients || [];
        const recipientCount = queuedCSV.recipientCount || queuedCSV.totalRows || recipients.length;
        console.log('[DEBUG] CSV recipientCount:', recipientCount, 'recipients array length:', recipients.length);
        
        // If no recipients array but have count, create array of dummy recipients
        if (recipients.length === 0 && recipientCount > 0) {
            console.log('[DEBUG] Creating dummy recipient array from count');
            // This is a reprocessed CSV - we don't need individual recipients for display
            // The backend will handle fetching them
        }
        localStorage.setItem('recipients', JSON.stringify(recipients));
    } 
    // Priority 2: Check pending CSV data (currently being previewed)
    else if (pendingCSVData.file && pendingCSVData.recipients.length > 0) {
        console.log('[DEBUG] Found pending CSV data for upload');
        csvToUse = {
            name: pendingCSVData.fileName,
            recipients: pendingCSVData.recipients,
            file: pendingCSVData.file,
            isPending: true  // Mark as needing upload
        };
        localStorage.setItem('recipients', JSON.stringify(pendingCSVData.recipients));
    }
    
    if (!csvToUse) {
        console.error('[DEBUG] No CSV found. Queue length:', queue.length, 'PendingCSVData:', pendingCSVData);
        showNotification('❌ No CSV file available. Please upload a CSV file first or select one from the queue.', 'error');
        return;
    }
    
    // Verify we have recipients data (either from queue or pending upload)
    const hasRecipients = (csvToUse.recipients && csvToUse.recipients.length > 0) || 
                          (csvToUse.recipientCount && csvToUse.recipientCount > 0) ||
                          (pendingCSVData?.recipients && pendingCSVData.recipients.length > 0);
    
    if (!hasRecipients) {
        console.error('[DEBUG] No recipients data found for CSV:', csvToUse);
        showNotification('❌ No recipients found. Please upload a CSV with recipients.', 'error');
        return;
    }
    
    // If CSV is still pending (not uploaded to backend yet), send it first
    if (csvToUse.isPending && csvToUse.file) {
        console.log('[DEBUG] CSV pending upload - sending to backend first');
        // Get campaign name from upload form or generate one
        const campaignName = document.getElementById('campaignNameInput')?.value?.trim() || 
                              csvToUse.name.replace('.csv', '') || 
                              'Campaign ' + new Date().toLocaleString();
        
        // Show loading state on button
        const startBtn = document.getElementById('startBtn');
        const originalText = startBtn?.innerHTML;
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Campaign...';
        }
        
        // Send to backend
        (async () => {
            try {
                const backendResponse = await sendCampaignToBackend(
                    csvToUse.file,
                    campaignName,
                    subject,
                    body,
                    selectedEmailProviderId
                );
                
                if (backendResponse && backendResponse.success) {
                    const token = getJwtToken();
                    const rangePayload = getSendRangePayload();
                    const startResponse = await fetch(`${API_BASE_URL}/campaign-queue/start/${backendResponse.queueId}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(rangePayload)
                    });

                    if (!startResponse.ok) {
                        const startError = await startResponse.json().catch(() => ({}));
                        throw new Error(startError.error || 'Campaign queued but failed to start');
                    }

                    const started = await startResponse.json().catch(() => ({}));

                    // Success - campaign started
                    localStorage.setItem('currentQueueId', String(backendResponse.queueId));
                    localStorage.setItem('currentProcessingCSVId', String(csvToUse.id || backendResponse.csvUploadId || backendResponse.queueId));
                    localStorage.setItem('currentCampaignId', String(backendResponse.campaignId));
                    localStorage.setItem('csvProgress', '0');
                    localStorage.setItem('campaignSentProgress', '0');
                    localStorage.setItem(getCampaignLogSeqKey(backendResponse.queueId), '0');

                    const targetTotal = Number(started.totalRecipients ?? backendResponse.totalRecipients ?? 0);
                    if (targetTotal > 0) {
                        localStorage.setItem('campaignTargetTotal', String(targetTotal));
                    }

                    setCampaignRunningUI(false);
                    startCSVLogging(csvToUse.name || campaignName || 'campaign.csv');
                    updateCurrentRunningCSV();
                    updateCSVQueueDisplay();
                    showNotification('✅ Campaign started successfully!', 'success');
                } else {
                    showNotification('❌ Failed to start campaign', 'error');
                    if (startBtn) {
                        startBtn.disabled = false;
                        startBtn.innerHTML = originalText;
                    }
                }
            } catch (error) {
                showNotification('❌ Error starting campaign: ' + error.message, 'error');
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.innerHTML = originalText;
                }
            }
        })();
        return;
    }
    
    // If CSV is already in queue (from backend), just mark it as processing
    if (csvToUse && !csvToUse.isPending) {
        console.log('[DEBUG] Starting campaign with queued CSV:', csvToUse);
        
        // Show loading state
        const startBtn = document.getElementById('startBtn');
        const originalText = startBtn?.innerHTML;
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Campaign...';
        }
        
        (async () => {
            try {
                const token = getJwtToken();
                const campaignName = document.getElementById('campaignNameInput')?.value?.trim()
                    || csvToUse.name?.replace('.csv', '')
                    || `Campaign ${new Date().toLocaleString()}`;

                const response = await fetch(`${API_BASE_URL}/campaign-queue/start-from-csv-upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        csvUploadId: csvToUse.id,
                        campaignName,
                        subject,
                        body,
                        providerId: Number(selectedEmailProviderId),
                        ...getSendRangePayload()
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to start campaign from existing CSV');
                }

                const started = await response.json();

                setCSVProcessing(csvToUse.id);
                localStorage.setItem('currentQueueId', String(started.queueId));
                localStorage.setItem('currentCampaignId', String(started.campaignId));
                localStorage.setItem('currentProcessingCSVId', String(csvToUse.id));
                localStorage.setItem('campaignSentProgress', '0');
                localStorage.setItem(getCampaignLogSeqKey(started.queueId), '0');

                const targetTotal = Number(started.totalRecipients ?? started.totalRows ?? csvToUse.recipientCount ?? 0);
                if (targetTotal > 0) {
                    localStorage.setItem('campaignTargetTotal', String(targetTotal));
                }

                const isPaused = localStorage.getItem('campaignPaused') === 'true';
                const pausedRow = parseInt(localStorage.getItem('campaignPausedRow') || '0');
                localStorage.setItem('csvProgress', String(isPaused ? pausedRow : 0));

                localStorage.removeItem('campaignPaused');
                localStorage.removeItem('campaignPausedAt');

                setCampaignRunningUI(isPaused);
                startCSVLogging(csvToUse.name || campaignName || 'campaign.csv');
                updateCurrentRunningCSV();
                updateCSVQueueDisplay();
                activityLog.add(`Campaign started: ${queuedCSV.name}`, 'campaign-start', 'play-circle');
                showNotification('✅ Campaign started successfully!', 'success');
            } catch (error) {
                showNotification(`❌ Failed to start campaign: ${error.message}`, 'error');
            } finally {
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.innerHTML = originalText;
                }
            }
        })();

        return;
    }
}

/**
 * DEBUG HELPER: Add a test email provider for demo/testing purposes
 * Call this from browser console: window.addTestProvider()
 * This bypasses verification for quick testing
 */
window.addTestProvider = async function(name = 'Test Gmail', email = 'test@gmail.com', type = 'SMTP') {
    try {
        console.log('[DEBUG] Adding test provider:', name, email, type);
        
        const token = getJwtToken();
        if (!token) {
            console.error('[ERROR] No JWT token found. Please login first.');
            return;
        }
        
        // Directly add provider without verification (for testing only)
        const response = await fetch(`${API_BASE_URL}/email-providers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                providerType: type,
                displayName: name,
                fromEmail: email,
                fromName: name,
                encryptedConfig: {
                    password: 'test-app-password-123',
                    username: email,
                    host: 'smtp.gmail.com',
                    port: 587
                }
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('[ERROR] Failed to add test provider:', error);
            showNotification('❌ Failed to add test provider: ' + error.error, 'error');
            return;
        }
        
        const result = await response.json();
        console.log('[SUCCESS] Test provider added:', result);
        showNotification(`✅ Test provider "${name}" added successfully!`, 'success');
        
        // Reload providers to show in UI
        loadEmailProviders();
        
    } catch (error) {
        console.error('[ERROR] Error adding test provider:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
};

console.log('✅ App loaded. Debug helper available: window.addTestProvider()');

/**
 * Handle resuming a campaign from paused state
 */
function proceedWithCampaignResume() {
    console.log('[DEBUG] proceedWithCampaignResume() called');

    const queueId = localStorage.getItem('currentQueueId');
    if (queueId) {
        (async () => {
            try {
                const token = getJwtToken();
                const response = await fetch(`${API_BASE_URL}/campaign-queue/${queueId}/resume`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(getSendRangePayload())
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to resume campaign');
                }

                localStorage.removeItem('campaignPaused');
                localStorage.removeItem('campaignPausedAt');
                setCampaignRunningUI(true);
                addTerminalLog('Campaign resumed from paused state', 'status');
                updateCurrentRunningCSV();
                updateCSVQueueDisplay();
                showNotification('Campaign resumed', 'success');
            } catch (error) {
                showNotification(`❌ Resume failed: ${error.message}`, 'error');
            }
        })();
        return;
    }
    
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
 * Show modal to select email provider for campaign
 */
function showEmailProviderSelectionModal(onSelectCallback) {
    const providers = JSON.parse(localStorage.getItem('emailProviders') || '[]');
    
    if (providers.length === 0) {
        showNotification('No email providers available', 'error');
        return;
    }
    
    const modal = document.getElementById('emailSelectionModal');
    const overlay = document.getElementById('emailSelectionOverlay');
    if (!modal || !overlay) {
        console.error('[ERROR] Email selection modal elements not found!');
        return;
    }
    
    const providersList = document.getElementById('emailProvidersList');
    const currentSelected = localStorage.getItem('selectedEmailProvider');
    
    // Populate providers list with radio buttons
    providersList.innerHTML = providers.map(provider => `
        <div class="email-provider-option" style="padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center;">
            <input type="radio" name="emailProviderSelection" value="${provider.id}" 
                   style="margin-right: 0.75rem; cursor: pointer;" 
                   ${String(provider.id) === String(currentSelected) ? 'checked' : ''}>
            <div style="flex: 1;">
                <div style="font-weight: 500; color: #1f2937;">${provider.name}</div>
                <div style="font-size: 0.875rem; color: #6b7280;">${provider.email}</div>
            </div>
        </div>
    `).join('');
    
    // Make provider options clickable
    const options = providersList.querySelectorAll('.email-provider-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
        });
    });
    
    // Show modal
    modal.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Handle confirm button
    const confirmBtn = document.getElementById('confirmEmailSelectionBtn');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const selected = document.querySelector('input[name="emailProviderSelection"]:checked');
            if (selected) {
                const providerId = selected.value;
                localStorage.setItem('selectedEmailProvider', providerId);
                closeEmailSelectionModal();
                if (onSelectCallback) {
                    onSelectCallback(providerId);
                }
                proceedWithCampaignStart();
            } else {
                showNotification('Please select an email provider', 'warning');
            }
        };
    }
}

function closeEmailSelectionModal() {
    const modal = document.getElementById('emailSelectionModal');
    const overlay = document.getElementById('emailSelectionOverlay');
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

/**
 * Cancel email provider selection
 */
function cancelEmailSelection() {
    const modal = document.getElementById('emailSelectionModal');
    const overlay = document.getElementById('emailSelectionOverlay');
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    window.emailProviderSelectionCallback = null;
}

/**
 * Confirm email provider selection (called from button)
 */
function confirmEmailSelection() {
    const modal = document.getElementById('emailSelectionModal');
    const confirmBtn = modal?.querySelector('.btn-primary');
    if (confirmBtn) {
        confirmBtn.click();
    }
}

/**
 * Send campaign to backend API
 * @param {object} campaignData - Campaign data to send
 */
async function sendCampaignDataToBackend(campaignData) {
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
    return clearTerminalLogsAsync();
}

async function clearTerminalLogsAsync() {
    const logsList = document.getElementById('logsList');
    const terminalContent = logsList?.querySelector('.terminal-content');
    const clearBtn = document.getElementById('clearLogsBtn');
    const originalLabel = clearBtn?.innerHTML;

    if (clearBtn) {
        clearBtn.disabled = true;
        clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
    }

    try {
        const token = getJwtToken();
        if (!token) {
            throw new Error('Please login again to clear logs');
        }

        const queueId = localStorage.getItem('currentQueueId');
        const params = new URLSearchParams();
        if (queueId) {
            params.set('queueId', String(queueId));
        }

        const endpoint = `${API_BASE_URL}/campaign-queue/events${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...buildUserIdHeader(),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to clear logs from backend');
        }

        const payload = await response.json().catch(() => ({}));
        const deleted = Number(payload?.deleted || 0);

        // Clear local caches so UI and local fallback remain consistent with DB.
        localStorage.removeItem('currentSessionLogs');
        localStorage.removeItem('allCSVLogs');

        if (terminalContent) {
            terminalContent.innerHTML = '<p class="terminal-line terminal-info">System ready...</p>';
            logsList.scrollTop = 0;
        }

        showNotification(`✓ Cleared ${deleted} persisted log entries`, 'success');
    } catch (error) {
        showNotification(`❌ ${error.message}`, 'error');
    } finally {
        if (clearBtn) {
            clearBtn.disabled = false;
            clearBtn.innerHTML = originalLabel || '<i class="fas fa-trash"></i> Clear Logs';
        }
    }
}

