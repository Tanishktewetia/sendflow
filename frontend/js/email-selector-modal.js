/**
 * Email Selection Modal Handler
 * Manages the email selection modal UI for compose page
 */

class EmailSelectorModal {
    constructor() {
        this.modal = null;
        this.overlay = null;
        this.emailList = [];
        this.selectedEmails = new Set();
        this.allEmails = [];
        this.searchTerm = '';
        this.onConfirm = null;
        this.isLoading = false;
    }

    /**
     * Initialize the modal
     */
    init() {
        this.createModalHTML();
        this.attachEventListeners();
    }

    /**
     * Create the modal HTML structure
     */
    createModalHTML() {
        // Check if modal already exists
        const existingOverlay = document.getElementById('emailModalOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'emailModalOverlay';
        overlay.className = 'email-modal-overlay';
        overlay.innerHTML = `
            <div class="email-modal">
                <h2>Select Recipients</h2>
                <p class="email-modal-description">
                    Choose the recipients you want to send emails to. You can search, select multiple recipients, or select all.
                </p>
                
                <div class="email-search-container">
                    <input 
                        type="text" 
                        id="emailSearchInput" 
                        placeholder="Search by email or name..."
                        class="email-search-input"
                    />
                    <button id="emailSearchBtn" class="email-search-btn">Search</button>
                </div>

                <div id="emailListContainer" class="email-list-container">
                    <div class="email-list-toggle-all">
                        <input 
                            type="checkbox" 
                            id="emailSelectAllCheckbox" 
                            class="email-checkbox"
                        />
                        <label for="emailSelectAllCheckbox">Select All</label>
                    </div>
                    <ul id="emailItemsList" class="email-list">
                        <li class="email-modal-loading">Loading emails...</li>
                    </ul>
                </div>

                <div class="email-selection-count">
                    <span id="emailSelectionCount">0 emails selected</span>
                </div>

                <div class="email-modal-buttons">
                    <button id="emailModalCancel" class="email-modal-cancel">Cancel</button>
                    <button id="emailModalConfirm" class="email-modal-confirm" disabled>Confirm Selection</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.modal = overlay.querySelector('.email-modal');
    }

    /**
     * Attach event listeners to modal elements
     */
    attachEventListeners() {
        // Close modal on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Search functionality
        const searchInput = this.modal.querySelector('#emailSearchInput');
        const searchBtn = this.modal.querySelector('#emailSearchBtn');
        
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
            this.handleSearch(searchInput.value);
        });

        searchBtn.addEventListener('click', () => {
            this.handleSearch(searchInput.value);
        });

        // Select all checkbox
        const selectAllCheckbox = this.modal.querySelector('#emailSelectAllCheckbox');
        selectAllCheckbox.addEventListener('change', (e) => {
            this.handleSelectAll(e.target.checked);
        });

        // Cancel button
        this.modal.querySelector('#emailModalCancel').addEventListener('click', () => {
            this.close();
        });

        // Confirm button
        this.modal.querySelector('#emailModalConfirm').addEventListener('click', () => {
            this.confirm();
        });
    }

    /**
     * Load emails from API or local source
     */
    async loadEmails() {
        try {
            this.isLoading = true;
            this.updateEmailList([]);

            // Try to load from IndexedDB first, then from API
            const emails = await this.loadEmailsFromStorage();
            
            this.allEmails = emails || [];
            this.emailList = [...this.allEmails];
            this.renderEmailList();

        } catch (error) {
            console.error('Error loading emails:', error);
            this.showEmptyState('Failed to load emails. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load emails from IndexedDB or API
     */
    async loadEmailsFromStorage() {
        return new Promise((resolve) => {
            // Check if we have emails stored in IndexedDB
            if (window.db) {
                const transaction = window.db.transaction(['recipients'], 'readonly');
                const store = transaction.objectStore('recipients');
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const emails = request.result.map(item => ({
                        email: item.email,
                        name: item.name || item.email.split('@')[0],
                        id: item.email
                    }));
                    resolve(emails);
                };

                request.onerror = () => {
                    resolve([]);
                };
            } else {
                resolve([]);
            }
        });
    }

    /**
     * Handle search functionality
     */
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase().trim();
        
        if (this.searchTerm) {
            this.emailList = this.allEmails.filter(email => 
                email.email.toLowerCase().includes(this.searchTerm) ||
                (email.name && email.name.toLowerCase().includes(this.searchTerm))
            );
        } else {
            this.emailList = [...this.allEmails];
        }

        this.renderEmailList();
    }

    /**
     * Handle select all functionality
     */
    handleSelectAll(isChecked) {
        if (isChecked) {
            // Select all visible emails
            this.emailList.forEach(email => {
                this.selectedEmails.add(email.id || email.email);
            });
        } else {
            // Deselect all visible emails
            this.emailList.forEach(email => {
                this.selectedEmails.delete(email.id || email.email);
            });
        }

        this.renderEmailList();
        this.updateSelectionCount();
    }

    /**
     * Handle individual email selection
     */
    handleEmailSelection(emailId, isChecked) {
        if (isChecked) {
            this.selectedEmails.add(emailId);
        } else {
            this.selectedEmails.delete(emailId);
        }

        this.updateSelectAllCheckbox();
        this.updateSelectionCount();
    }

    /**
     * Update the select all checkbox state
     */
    updateSelectAllCheckbox() {
        const selectAllCheckbox = this.modal.querySelector('#emailSelectAllCheckbox');
        
        if (this.emailList.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else {
            const allSelected = this.emailList.every(email => 
                this.selectedEmails.has(email.id || email.email)
            );
            const noneSelected = this.emailList.every(email => 
                !this.selectedEmails.has(email.id || email.email)
            );

            selectAllCheckbox.checked = allSelected;
            selectAllCheckbox.indeterminate = !allSelected && !noneSelected;
        }
    }

    /**
     * Update the selection count display
     */
    updateSelectionCount() {
        const countSpan = this.modal.querySelector('#emailSelectionCount');
        const confirmBtn = this.modal.querySelector('#emailModalConfirm');
        const count = this.selectedEmails.size;

        countSpan.textContent = `${count} email${count !== 1 ? 's' : ''} selected`;
        confirmBtn.disabled = count === 0;
    }

    /**
     * Render the email list
     */
    renderEmailList() {
        const emailItemsList = this.modal.querySelector('#emailItemsList');

        if (this.isLoading) {
            emailItemsList.innerHTML = '<li class="email-modal-loading">Loading emails...</li>';
            return;
        }

        if (this.emailList.length === 0) {
            emailItemsList.innerHTML = this.searchTerm 
                ? '<li class="email-modal-empty">No emails match your search.</li>'
                : '<li class="email-modal-empty">No emails available.</li>';
            this.updateSelectAllCheckbox();
            this.updateSelectionCount();
            return;
        }

        emailItemsList.innerHTML = this.emailList.map(email => {
            const emailId = email.id || email.email;
            const isSelected = this.selectedEmails.has(emailId);
            
            return `
                <li class="email-item" data-email-id="${emailId}">
                    <input 
                        type="checkbox" 
                        class="email-checkbox email-item-checkbox"
                        data-email-id="${emailId}"
                        ${isSelected ? 'checked' : ''}
                    />
                    <div class="email-info">
                        <p class="email-address">${this.escapeHtml(email.email)}</p>
                        ${email.name ? `<p class="email-name">${this.escapeHtml(email.name)}</p>` : ''}
                    </div>
                </li>
            `;
        }).join('');

        // Attach event listeners to checkboxes
        emailItemsList.querySelectorAll('.email-item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleEmailSelection(e.target.dataset.emailId, e.target.checked);
            });
        });

        // Attach click listeners to email items
        emailItemsList.querySelectorAll('.email-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('email-checkbox') || 
                    e.target.classList.contains('email-item-checkbox')) {
                    return; // Let checkbox handler deal with it
                }
                const checkbox = item.querySelector('.email-item-checkbox');
                checkbox.checked = !checkbox.checked;
                this.handleEmailSelection(checkbox.dataset.emailId, checkbox.checked);
            });
        });

        this.updateSelectAllCheckbox();
        this.updateSelectionCount();
    }

    /**
     * Update email list display
     */
    updateEmailList(emails) {
        this.emailList = emails;
        this.renderEmailList();
    }

    /**
     * Show empty state message
     */
    showEmptyState(message) {
        const emailItemsList = this.modal.querySelector('#emailItemsList');
        emailItemsList.innerHTML = `<li class="email-modal-empty">${this.escapeHtml(message)}</li>`;
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Open the modal
     */
    async open(onConfirmCallback) {
        this.onConfirm = onConfirmCallback;
        this.selectedEmails.clear();
        
        // Show overlay
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Load emails
        await this.loadEmails();
    }

    /**
     * Close the modal
     */
    close() {
        this.overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        this.selectedEmails.clear();
    }

    /**
     * Confirm selection and call callback
     */
    confirm() {
        const selectedEmailsList = Array.from(this.selectedEmails);
        
        if (selectedEmailsList.length === 0) {
            alert('Please select at least one email');
            return;
        }

        if (this.onConfirm) {
            this.onConfirm(selectedEmailsList);
        }

        this.close();
    }

    /**
     * Get selected emails data
     */
    getSelectedEmails() {
        const selectedList = [];
        this.selectedEmails.forEach(emailId => {
            const email = this.allEmails.find(e => (e.id || e.email) === emailId);
            if (email) {
                selectedList.push(email);
            }
        });
        return selectedList;
    }

    /**
     * Manually add emails to the list
     */
    addEmails(emails) {
        this.allEmails = [...this.allEmails, ...emails];
        this.emailList = [...this.allEmails];
        this.renderEmailList();
    }

    /**
     * Clear the modal
     */
    destroy() {
        if (this.overlay) {
            this.overlay.remove();
        }
        this.selectedEmails.clear();
        this.emailList = [];
        this.allEmails = [];
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailSelectorModal;
}
