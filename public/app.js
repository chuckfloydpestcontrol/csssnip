class SnippetVault {
    constructor() {
        this.snippets = [];
        this.filteredSnippets = [];
        this.categories = [];
        this.codeEditor = null;
        this.editCodeEditor = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.initCodeEditor();
        this.bindEvents();
        this.loadCategories();
        this.loadSnippets();
    }

    async checkAuth() {
        try {
            const response = await fetch('/auth/me', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                window.location.href = '/login.html';
                return;
            }
            
            this.currentUser = await response.json();
            this.updateUIForUser();
        } catch (error) {
            window.location.href = '/login.html';
        }
    }

    updateUIForUser() {
        // Add user info to header
        const header = document.querySelector('header');
        const userInfo = document.createElement('div');
        userInfo.className = 'mt-4 flex justify-between items-center';
        userInfo.innerHTML = `
            <div class="text-sm text-gray-600">
                Logged in as: <span class="font-medium">${this.currentUser.email}</span>
                ${this.currentUser.isSuperUser ? '<span class="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Super User</span>' : ''}
            </div>
            <div class="flex gap-2">
                ${this.currentUser.isSuperUser ? '<a href="/admin.html" class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Admin</a>' : ''}
                <button id="changePasswordBtn" class="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">Change Pass</button>
                <button id="logoutBtn" class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">Logout</button>
            </div>
        `;
        header.appendChild(userInfo);
        
        // Add logout functionality
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Add change password functionality
        document.getElementById('changePasswordBtn').addEventListener('click', () => this.showPasswordModal());
        
        // Update manage categories button visibility for super users
        if (!this.currentUser.isSuperUser) {
            document.getElementById('manageCategoriesBtn').style.display = 'none';
        }
    }

    async logout() {
        try {
            await fetch('/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/login.html';
        } catch (error) {
            this.showErrorMessage('Failed to logout');
        }
    }

    initCodeEditor() {
        const textarea = document.getElementById('cssCode');
        const container = textarea.parentElement;
        
        this.codeEditor = CodeMirror(container, {
            value: '',
            mode: 'css',
            theme: 'material-darker',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            styleActiveLine: true,
            indentUnit: 2,
            tabSize: 2,
            lineWrapping: true,
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Tab": function(cm) {
                    if (cm.doc.somethingSelected()) {
                        return CodeMirror.Pass;
                    }
                    var spacesPerTab = cm.getOption("indentUnit");
                    var spacesToInsert = spacesPerTab - (cm.doc.getCursor("start").ch % spacesPerTab);
                    var spaces = Array(spacesToInsert + 1).join(" ");
                    cm.replaceSelection(spaces, "end", "+input");
                }
            }
        });

        // Hide the original textarea
        textarea.style.display = 'none';
        
        // Sync CodeMirror content with textarea for form submission
        this.codeEditor.on('change', () => {
            textarea.value = this.codeEditor.getValue();
        });
    }

    bindEvents() {
        const form = document.getElementById('snippetForm');
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        const saveCategoryBtn = document.getElementById('saveCategoryBtn');
        const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
        const newCategoryName = document.getElementById('newCategoryName');
        const toggleFormBtn = document.getElementById('toggleFormBtn');
        const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
        const closeCategoryManagerBtn = document.getElementById('closeCategoryManagerBtn');
        const editForm = document.getElementById('editSnippetForm');
        const closeEditModal = document.getElementById('closeEditModal');
        const cancelEdit = document.getElementById('cancelEdit');
        const passwordForm = document.getElementById('changePasswordForm');
        const closePasswordModal = document.getElementById('closePasswordModal');
        const cancelPassword = document.getElementById('cancelPassword');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        categoryFilter.addEventListener('change', (e) => this.handleCategoryFilter(e.target.value));
        toggleFormBtn.addEventListener('click', () => this.toggleForm());
        
        addCategoryBtn.addEventListener('click', () => this.showNewCategoryInput());
        saveCategoryBtn.addEventListener('click', () => this.saveNewCategory());
        cancelCategoryBtn.addEventListener('click', () => this.hideNewCategoryInput());
        manageCategoriesBtn.addEventListener('click', () => this.showCategoryManager());
        closeCategoryManagerBtn.addEventListener('click', () => this.hideCategoryManager());
        
        editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
        closeEditModal.addEventListener('click', () => this.hideEditModal());
        cancelEdit.addEventListener('click', () => this.hideEditModal());
        
        passwordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        closePasswordModal.addEventListener('click', () => this.hidePasswordModal());
        cancelPassword.addEventListener('click', () => this.hidePasswordModal());
        
        newCategoryName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveNewCategory();
            }
        });
    }

    toggleForm() {
        const formContent = document.getElementById('formContent');
        const chevronIcon = document.getElementById('chevronIcon');
        
        if (formContent.style.display === 'none') {
            formContent.style.display = 'block';
            chevronIcon.style.transform = 'rotate(0deg)';
        } else {
            formContent.style.display = 'none';
            chevronIcon.style.transform = 'rotate(-90deg)';
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/categories', {
                credentials: 'include'
            });
            if (response.ok) {
                this.categories = await response.json();
                this.populateCategorySelects();
            } else {
                this.showErrorMessage('Failed to load categories');
            }
        } catch (error) {
            this.showErrorMessage('Network error loading categories');
        }
    }

    populateCategorySelects() {
        const categorySelect = document.getElementById('category');
        const categoryFilter = document.getElementById('categoryFilter');
        
        // Clear existing options (except first option)
        categorySelect.innerHTML = '<option value="">Select a category</option>';
        categoryFilter.innerHTML = '<option value="">All categories</option>';
        
        // Add categories to both selects
        this.categories.forEach(category => {
            const option1 = new Option(category, category);
            const option2 = new Option(category, category);
            categorySelect.appendChild(option1);
            categoryFilter.appendChild(option2);
        });
    }

    showNewCategoryInput() {
        document.getElementById('newCategoryInput').classList.remove('hidden');
        document.getElementById('newCategoryName').focus();
    }

    hideNewCategoryInput() {
        document.getElementById('newCategoryInput').classList.add('hidden');
        document.getElementById('newCategoryName').value = '';
    }

    showCategoryManager() {
        document.getElementById('manageCategoriesModal').classList.remove('hidden');
        this.populateCategoryManager();
    }

    hideCategoryManager() {
        document.getElementById('manageCategoriesModal').classList.add('hidden');
    }

    populateCategoryManager() {
        const categoryList = document.getElementById('categoryList');
        categoryList.innerHTML = '';
        
        this.categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'flex items-center justify-between bg-white px-3 py-2 rounded border';
            categoryItem.innerHTML = `
                <span class="text-sm text-gray-700">${this.escapeHtml(category)}</span>
                <button type="button" class="delete-category-btn px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500" data-category="${this.escapeHtml(category)}">
                    Delete
                </button>
            `;
            categoryList.appendChild(categoryItem);
        });

        // Add event listeners to delete buttons
        categoryList.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const categoryName = e.target.getAttribute('data-category');
                this.confirmDeleteCategory(categoryName);
            });
        });
    }

    confirmDeleteCategory(categoryName) {
        if (confirm(`Are you sure you want to delete the category "${categoryName}"?\n\nThis action cannot be undone. Categories with existing snippets cannot be deleted.`)) {
            this.deleteCategory(categoryName);
        }
    }

    async deleteCategory(categoryName) {
        try {
            const response = await fetch(`/categories/${encodeURIComponent(categoryName)}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                await this.loadCategories(); // Refresh categories
                this.populateCategoryManager(); // Refresh the manager view
                this.showSuccessMessage('Category deleted successfully!');
            } else {
                const error = await response.json();
                this.showErrorMessage(error.error || 'Failed to delete category');
            }
        } catch (error) {
            this.showErrorMessage('Network error. Please try again.');
        }
    }

    async saveNewCategory() {
        const nameInput = document.getElementById('newCategoryName');
        const name = nameInput.value.trim();
        
        if (!name) {
            this.showErrorMessage('Category name cannot be empty');
            return;
        }

        try {
            const response = await fetch('/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                await this.loadCategories(); // Refresh categories
                this.hideNewCategoryInput();
                
                // Auto-select the new category
                document.getElementById('category').value = name;
                
                this.showSuccessMessage('Category added successfully!');
            } else {
                const error = await response.json();
                this.showErrorMessage(error.error || 'Failed to add category');
            }
        } catch (error) {
            this.showErrorMessage('Network error. Please try again.');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            description: formData.get('description'),
            category: formData.get('category'),
            css_code: this.codeEditor.getValue()
        };

        if (!data.css_code.trim()) {
            this.showErrorMessage('CSS code cannot be empty');
            return;
        }

        try {
            const response = await fetch('/snippets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const newSnippet = await response.json();
                this.snippets.unshift(newSnippet);
                this.filterAndRender();
                
                // Reset form
                e.target.reset();
                this.codeEditor.setValue('');
                
                this.showSuccessMessage('Snippet added successfully!');
            } else {
                const error = await response.json();
                this.showErrorMessage(error.error || 'Failed to add snippet');
            }
        } catch (error) {
            this.showErrorMessage('Network error. Please try again.');
        }
    }

    async loadSnippets() {
        try {
            const response = await fetch('/snippets', {
                credentials: 'include'
            });
            if (response.ok) {
                this.snippets = await response.json();
                this.filterAndRender();
            } else {
                this.showErrorMessage('Failed to load snippets');
            }
        } catch (error) {
            this.showErrorMessage('Network error. Please try again.');
        } finally {
            document.getElementById('loadingSpinner').style.display = 'none';
        }
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.filterAndRender();
    }

    handleCategoryFilter(category) {
        this.selectedCategory = category;
        this.filterAndRender();
    }

    filterAndRender() {
        this.filteredSnippets = this.snippets.filter(snippet => {
            const matchesSearch = !this.searchTerm || 
                snippet.description.toLowerCase().includes(this.searchTerm) ||
                snippet.css_code.toLowerCase().includes(this.searchTerm);
            
            const matchesCategory = !this.selectedCategory || 
                snippet.category === this.selectedCategory;

            return matchesSearch && matchesCategory;
        });

        this.renderSnippets();
    }

    renderSnippets() {
        const container = document.getElementById('snippetsContainer');
        const noResults = document.getElementById('noResults');
        
        if (this.filteredSnippets.length === 0) {
            container.innerHTML = '';
            noResults.classList.remove('hidden');
            return;
        }

        noResults.classList.add('hidden');
        
        container.innerHTML = this.filteredSnippets.map(snippet => {
            const canEdit = snippet.user_id === this.currentUser.id || this.currentUser.isSuperUser;
            const authorEmail = snippet.author_email || 'Unknown';
            
            return `
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">${this.escapeHtml(snippet.description)}</h3>
                        <div class="mt-2 flex items-center gap-2">
                            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                ${snippet.category}
                            </span>
                            <span class="text-xs text-gray-500">by ${authorEmail}</span>
                        </div>
                    </div>
                    ${canEdit ? `
                    <div class="flex items-center gap-2">
                        <button type="button" class="edit-snippet-btn px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500" data-snippet-id="${snippet.id}">
                            Edit
                        </button>
                        <button type="button" class="delete-snippet-btn px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500" data-snippet-id="${snippet.id}">
                            Delete
                        </button>
                    </div>
                    ` : ''}
                </div>
                <div class="relative">
                    <button type="button" class="copy-snippet-btn absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 z-10" data-css-code="${this.escapeHtml(snippet.css_code)}">
                        Copy
                    </button>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre><code class="language-css text-sm">${this.escapeHtml(snippet.css_code)}</code></pre>
                    </div>
                </div>
            </div>
        `}).join('');

        // Re-highlight code blocks
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }

        // Add event listeners to edit buttons
        container.querySelectorAll('.edit-snippet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const snippetId = e.target.getAttribute('data-snippet-id');
                const snippet = this.snippets.find(s => s.id == snippetId);
                if (snippet) {
                    this.showEditModal(snippet);
                }
            });
        });

        // Add event listeners to delete buttons
        container.querySelectorAll('.delete-snippet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const snippetId = e.target.getAttribute('data-snippet-id');
                const snippet = this.snippets.find(s => s.id == snippetId);
                if (snippet) {
                    this.confirmDeleteSnippet(snippet);
                }
            });
        });

        // Add event listeners to copy buttons
        container.querySelectorAll('.copy-snippet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cssCode = e.target.getAttribute('data-css-code');
                this.copyToClipboard(cssCode, e.target);
            });
        });
    }

    showEditModal(snippet) {
        document.getElementById('editModal').classList.remove('hidden');
        document.getElementById('editSnippetId').value = snippet.id;
        document.getElementById('editDescription').value = snippet.description;
        
        // Populate category dropdown for edit modal
        this.populateEditCategorySelect();
        
        // Set the category after populating the dropdown
        setTimeout(() => {
            document.getElementById('editCategory').value = snippet.category;
        }, 0);
        
        // Initialize edit code editor if not already done
        if (!this.editCodeEditor) {
            this.initEditCodeEditor();
        }
        
        // Set the code content
        this.editCodeEditor.setValue(snippet.css_code);
    }

    hideEditModal() {
        document.getElementById('editModal').classList.add('hidden');
    }

    initEditCodeEditor() {
        const textarea = document.getElementById('editCssCode');
        const container = textarea.parentElement;
        
        this.editCodeEditor = CodeMirror(container, {
            value: '',
            mode: 'css',
            theme: 'material-darker',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            styleActiveLine: true,
            indentUnit: 2,
            tabSize: 2,
            lineWrapping: true,
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Tab": function(cm) {
                    if (cm.doc.somethingSelected()) {
                        return CodeMirror.Pass;
                    }
                    var spacesPerTab = cm.getOption("indentUnit");
                    var spacesToInsert = spacesPerTab - (cm.doc.getCursor("start").ch % spacesPerTab);
                    var spaces = Array(spacesToInsert + 1).join(" ");
                    cm.replaceSelection(spaces, "end", "+input");
                }
            }
        });

        // Hide the original textarea
        textarea.style.display = 'none';
        
        // Sync CodeMirror content with textarea for form submission
        this.editCodeEditor.on('change', () => {
            textarea.value = this.editCodeEditor.getValue();
        });
    }

    populateEditCategorySelect() {
        const editCategorySelect = document.getElementById('editCategory');
        editCategorySelect.innerHTML = '<option value="">Select a category</option>';
        
        this.categories.forEach(category => {
            const option = new Option(category, category);
            editCategorySelect.appendChild(option);
        });
    }

    async handleEditSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            description: formData.get('description'),
            category: formData.get('category'),
            css_code: this.editCodeEditor.getValue()
        };

        const snippetId = document.getElementById('editSnippetId').value;

        if (!data.css_code.trim()) {
            this.showErrorMessage('CSS code cannot be empty');
            return;
        }

        try {
            const response = await fetch(`/snippets/${snippetId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const updatedSnippet = await response.json();
                
                // Update the snippet in our local array
                const index = this.snippets.findIndex(s => s.id == snippetId);
                if (index !== -1) {
                    this.snippets[index] = updatedSnippet;
                }
                
                this.filterAndRender();
                this.hideEditModal();
                this.showSuccessMessage('Snippet updated successfully!');
            } else {
                const error = await response.json();
                this.showErrorMessage(error.error || 'Failed to update snippet');
            }
        } catch (error) {
            this.showErrorMessage('Network error. Please try again.');
        }
    }

    confirmDeleteSnippet(snippet) {
        if (confirm(`Are you sure you want to delete this snippet?\n\n"${snippet.description}"\n\nThis action cannot be undone.`)) {
            this.deleteSnippet(snippet.id);
        }
    }

    async deleteSnippet(snippetId) {
        try {
            const response = await fetch(`/snippets/${snippetId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                // Remove from local array
                this.snippets = this.snippets.filter(s => s.id != snippetId);
                this.filterAndRender();
                this.showSuccessMessage('Snippet deleted successfully!');
            } else {
                const error = await response.json();
                this.showErrorMessage(error.error || 'Failed to delete snippet');
            }
        } catch (error) {
            this.showErrorMessage('Network error. Please try again.');
        }
    }

    async copyToClipboard(text, button) {
        // Decode HTML entities before copying
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        const decodedText = textarea.value;

        try {
            await navigator.clipboard.writeText(decodedText);
            
            // Visual feedback
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            button.classList.add('bg-green-600', 'hover:bg-green-700');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('bg-green-600', 'hover:bg-green-700');
                button.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            this.fallbackCopyToClipboard(decodedText, button);
        }
    }

    fallbackCopyToClipboard(text, button) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            button.classList.add('bg-green-600', 'hover:bg-green-700');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('bg-green-600', 'hover:bg-green-700');
                button.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }, 2000);
        } catch (err) {
            this.showErrorMessage('Failed to copy to clipboard');
        }

        document.body.removeChild(textArea);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'bg-green-100 text-green-800 border-green-200');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'bg-red-100 text-red-800 border-red-200');
    }

    showMessage(message, classes) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg border ${classes} z-50 transition-opacity duration-300`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(messageDiv);
            }, 300);
        }, 3000);
    }

    showPasswordModal() {
        document.getElementById('passwordModal').classList.remove('hidden');
        document.getElementById('changePasswordForm').reset();
        document.getElementById('passwordError').classList.add('hidden');
        document.getElementById('passwordSuccess').classList.add('hidden');
    }

    hidePasswordModal() {
        document.getElementById('passwordModal').classList.add('hidden');
    }

    async handlePasswordChange(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('passwordError');
        const successDiv = document.getElementById('passwordSuccess');
        
        // Hide previous messages
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');
        
        // Validate passwords match
        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'New passwords do not match';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        // Validate password length
        if (newPassword.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters long';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        try {
            const response = await fetch('/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                successDiv.textContent = 'Password changed successfully!';
                successDiv.classList.remove('hidden');
                document.getElementById('changePasswordForm').reset();
                
                // Hide modal after 2 seconds
                setTimeout(() => {
                    this.hidePasswordModal();
                }, 2000);
            } else {
                errorDiv.textContent = data.error || 'Failed to change password';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new SnippetVault();
});