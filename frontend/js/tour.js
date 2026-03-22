/**
 * Guided Onboarding Tour using Driver.js (local from node_modules)
 * Interactive, multi-step guided flow with user click requirements
 */

let tourDriver = null;
let tourInitialized = false;

/**
 * Initialize the tour when Driver is available
 */
function initializeTour() {
    if (tourInitialized) {
        return;
    }

    tourInitialized = true;

    // Check if user has already completed the tour
    const tourCompleted = localStorage.getItem('tourCompleted');
    
    if (tourCompleted === 'true') {
        return;
    }

    startTour();
}

/**
 * Start the tour with Driver.js
 */
function startTour() {
    try {
        // Access the driver factory correctly
        if (typeof window.driver === 'undefined' || typeof window.driver.js === 'undefined') {
            tourInitialized = false;
            return;
        }

        const factory = window.driver.js.driver;
        
        if (typeof factory !== 'function') {
            tourInitialized = false;
            return;
        }

        // Initialize Driver instance - AUTO-CLICK ONLY, NO MANUAL INTERACTION
        tourDriver = factory({
            animate: true,
            opacity: 0.5,
            padding: 8,
            allowClose: true,  // SHOW CLOSE BUTTON
            overlayClickBehavior: 'block',  // Block clicks outside highlighted area
            stagePadding: 8,
            popoverClass: 'driver-popover-custom',
            showProgress: false,
            nextBtnText: 'Continue',
            prevBtnText: 'Back',
            closeBtnText: '×',  // X button for close
            allowClicksThrough: false,  // DISABLE CLICKS ON HIGHLIGHTED ELEMENTS
            disableActiveInteraction: true,  // DISABLE ALL INTERACTION WITH HIGHLIGHTED ELEMENT
            allowPreviousStep: false,  // DISABLE BACK BUTTON COMPLETELY
            onDestroyed: () => {
                completeTour();
            }
        });

        // Define professional tour steps - simplified to 5 steps
        const steps = [
            // STEP 1: Welcome with Sidebar Highlight
            {
                element: '.sidebar-nav',
                popover: {
                    title: 'Welcome to SendFlow',
                    description: 'This is your navigation menu. Let\'s set up your account to start sending campaigns.',
                    side: 'right',
                    align: 'start',
                    showButtons: ['next', 'close']
                }
            },
            // STEP 2: Profile Icon - INTERACTIVE
            {
                element: '#profileSidebarBtn',
                popover: {
                    title: 'Your Account',
                    description: 'Click on your profile to access your account settings',
                    side: 'left',
                    align: 'center',
                    showButtons: ['next', 'close'],
                    onNextClick: function() {
                        // Auto-click profile button when Continue is clicked
                        const profileBtn = document.getElementById('profileSidebarBtn');
                        if (profileBtn) {
                            profileBtn.click();
                            // Wait for settings option to appear in DOM before advancing
                            waitForElement('#profileTooltip .profile-option:nth-child(2)', 2000).then(() => {
                                if (tourDriver) {
                                    tourDriver.moveNext();
                                }
                            });
                        }
                    }
                }
            },
            // STEP 3: Settings Option - INTERACTIVE
            {
                element: '#profileTooltip .profile-option:nth-child(2)',
                popover: {
                    title: 'Settings',
                    description: 'Click on Settings to configure your account',
                    side: 'bottom',
                    align: 'center',
                    showButtons: ['next', 'close'],
                    onNextClick: function() {
                        // Auto-click settings option when Continue is clicked
                        const settingsOption = document.querySelector('#profileTooltip .profile-option:nth-child(2)');
                        if (settingsOption) {
                            settingsOption.click();
                            // Wait for email provider element to be visible before advancing
                            waitForElement('button.settings-nav-item[data-section="email-provider"]', 2000).then(() => {
                                if (tourDriver) {
                                    tourDriver.moveNext();
                                }
                            });
                        }
                    }
                }
            },
            // STEP 4: Email Provider Section highlight - FINAL STEP
            {
                element: 'button.settings-nav-item[data-section="email-provider"]',
                popover: {
                    title: '⚠️ Email Provider Configuration',
                    description: 'Configure your email provider settings. <span style="color: #4A90E2; font-weight: bold;">You cannot send any emails without setting this up.</span> Add your SMTP credentials or connect your email account now.',
                    side: 'right',
                    align: 'center',
                    showButtons: ['close'],
                    onHighlighted: function(element) {
                        // Highlight the corresponding content area on the right
                        const emailProviderSection = document.getElementById('email-provider-section');
                        if (emailProviderSection) {
                            emailProviderSection.classList.add('tour-highlighted');
                        }
                    },
                    onCloseClick: function() {
                        // Remove highlight from content area
                        const emailProviderSection = document.getElementById('email-provider-section');
                        if (emailProviderSection) {
                            emailProviderSection.classList.remove('tour-highlighted');
                        }
                        completeTour();
                    }
                }
            }
        ];

        // Set steps and start
        tourDriver.setSteps(steps);
        tourDriver.drive(0);

        // Auto-advance on interactive step clicks
        setupAutoAdvance();

    } catch (err) {
        tourInitialized = false;
    }
}

/**
 * Setup tour - disabled manual interaction, only auto-click via Continue button
 */
function setupAutoAdvance() {
    // Manual interaction disabled - all advancement happens via onNextClick callbacks
    // This prevents confusion from manual clicks interfering with the tour flow
}

/**
 * Wait for an element to exist in the DOM AND be visible/measurable
 */
function waitForElement(selector, timeout = 2000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            const element = document.querySelector(selector);
            // Check if element exists AND has valid dimensions (visible)
            if (element && element.offsetHeight > 0 && element.offsetWidth > 0) {
                clearInterval(checkInterval);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                resolve(null); // Timeout reached, resolve anyway
            }
        }, 50); // Check every 50ms for faster response
    });
}

/**
 * Mark tour as complete
 */
function completeTour() {
    localStorage.setItem('tourCompleted', 'true');
    if (tourDriver) {
        tourDriver.destroy();
    }
}

/**
 * Restart the tour from user menu
 */
function restartTour() {
    localStorage.removeItem('tourCompleted');
    tourInitialized = false;
    
    if (tourDriver) {
        tourDriver.destroy();
    }
    
    startTour();
    
    return false;
}

/**
 * Skip tour and mark as completed
 */
function skipTour() {
    if (tourDriver) {
        tourDriver.destroy();
    }
    localStorage.setItem('tourCompleted', 'true');
    
    return false;
}

// Initialize tour when page is ready (only once)
let tourInitScheduled = false;

function scheduleInitialize() {
    if (tourInitScheduled) return;
    tourInitScheduled = true;
    setTimeout(initializeTour, 800);
}

document.addEventListener('DOMContentLoaded', scheduleInitialize);

// Also handle if page already loaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    scheduleInitialize();
}
