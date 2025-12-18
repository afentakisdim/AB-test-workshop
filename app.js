/**
 * A/B Test Platform - Main Application JavaScript
 * Handles routing, authentication, localStorage management, and all UI interactions
 */

// ============================================
// Constants & Configuration
// ============================================

const STORAGE_KEYS = {
    USERS: 'abtest_users',
    SESSION: 'abtest_session',
    TESTS: 'abtest_tests'
};

const ROUTES = {
    '/': 'browse',
    '/login': 'login',
    '/register': 'register',
    '/create': 'create',
    '/dashboard': 'dashboard',
    '/share': 'share'
};

// ============================================
// LocalStorage Management
// ============================================

/**
 * Generic function to safely get data from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} Stored value or default
 */
function getFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage (${key}):`, error);
        showError('Storage error. Please check your browser settings.');
        return defaultValue;
    }
}

/**
 * Generic function to safely save data to localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} Success status
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error writing to localStorage (${key}):`, error);
        if (error.name === 'QuotaExceededError') {
            showError('Storage is full. Please free up some space.');
        } else {
            showError('Storage error. Please check your browser settings.');
        }
        return false;
    }
}

/**
 * Get all users from storage
 * @returns {Array} Array of user objects
 */
function getUsers() {
    return getFromStorage(STORAGE_KEYS.USERS, []);
}

/**
 * Save users array to storage
 * @param {Array} users - Array of user objects
 */
function saveUsers(users) {
    saveToStorage(STORAGE_KEYS.USERS, users);
}

/**
 * Get all tests from storage
 * @returns {Array} Array of test objects
 */
function getTests() {
    return getFromStorage(STORAGE_KEYS.TESTS, []);
}

/**
 * Save tests array to storage
 * @param {Array} tests - Array of test objects
 */
function saveTests(tests) {
    saveToStorage(STORAGE_KEYS.TESTS, tests);
}

/**
 * Get current session (logged-in user ID)
 * @returns {string|null} User ID or null
 */
function getSession() {
    return getFromStorage(STORAGE_KEYS.SESSION, null);
}

/**
 * Set current session
 * @param {string|null} userId - User ID or null
 */
function setSession(userId) {
    saveToStorage(STORAGE_KEYS.SESSION, userId);
}

// ============================================
// Authentication
// ============================================

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} Result object with success status and message
 */
function registerUser(email, password) {
    const users = getUsers();
    
    // Check if user already exists
    if (users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, message: 'Email already registered' };
    }
    
    // Validate password length
    if (password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters' };
    }
    
    // Create new user (in production, password would be hashed)
    const newUser = {
        id: generateId(),
        email: email.toLowerCase(),
        password: password // In production, use proper hashing
    };
    
    users.push(newUser);
    saveUsers(users);
    
    return { success: true, user: newUser };
}

/**
 * Login a user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} Result object with success status and user/error
 */
function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    
    if (!user) {
        return { success: false, message: 'Invalid email or password' };
    }
    
    setSession(user.id);
    return { success: true, user };
}

/**
 * Logout current user
 */
function logoutUser() {
    setSession(null);
    navigateTo('/');
    updateNavigation();
}

/**
 * Get current logged-in user
 * @returns {Object|null} User object or null
 */
function getCurrentUser() {
    const sessionId = getSession();
    if (!sessionId) return null;
    
    const users = getUsers();
    return users.find(u => u.id === sessionId) || null;
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Object|null} User object or null
 */
function getUserById(userId) {
    if (!userId) return null;
    const users = getUsers();
    return users.find(u => u.id === userId) || null;
}

/**
 * Get submitter display name (username part of email)
 * @param {string} userId - User ID
 * @returns {string} Formatted submitter info or "Anonymous"
 */
function getSubmitterInfo(userId) {
    if (!userId || userId.startsWith('shared_')) {
        return 'Submitted by Anonymous';
    }
    
    const user = getUserById(userId);
    if (!user || !user.email) {
        return 'Submitted by Anonymous';
    }
    
    const emailParts = user.email.split('@');
    const username = emailParts[0] || 'Anonymous';
    return `Submitted by ${username}`;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if logged in
 */
function isAuthenticated() {
    return getCurrentUser() !== null;
}

// ============================================
// Test Management
// ============================================

/**
 * Create a new test
 * @param {string} title - Test title
 * @param {string} imageA - Image A URL
 * @param {string} imageB - Image B URL
 * @param {string} userId - Creator user ID
 * @returns {Object} Created test object
 */
function createTest(title, imageA, imageB, userId) {
    const tests = getTests();
    const newTest = {
        id: generateId(),
        userId: userId,
        title: title.trim(),
        imageA: imageA.trim(),
        imageB: imageB.trim(),
        votes: {}
    };
    
    tests.push(newTest);
    saveTests(tests);
    
    return newTest;
}

/**
 * Get all tests (excluding deleted)
 * @returns {Array} Array of test objects
 */
function getAllTests() {
    return getTests().filter(test => !test.deleted);
}

/**
 * Get tests created by a specific user (excluding deleted)
 * @param {string} userId - User ID
 * @returns {Array} Array of test objects
 */
function getUserTests(userId) {
    return getTests().filter(test => test.userId === userId && !test.deleted);
}

/**
 * Get deleted tests created by a specific user
 * @param {string} userId - User ID
 * @returns {Array} Array of deleted test objects
 */
function getDeletedUserTests(userId) {
    return getTests().filter(test => test.userId === userId && test.deleted === true);
}

/**
 * Vote on a test
 * @param {string} testId - Test ID
 * @param {string} userId - User ID
 * @param {string} option - 'A' or 'B'
 * @returns {Object} Result object with success status
 */
function voteOnTest(testId, userId, option) {
    if (option !== 'A' && option !== 'B') {
        return { success: false, message: 'Invalid vote option' };
    }
    
    const tests = getTests();
    const test = tests.find(t => t.id === testId);
    
    if (!test) {
        return { success: false, message: 'Test not found' };
    }
    
    // Check if user already voted
    if (test.votes[userId]) {
        return { success: false, message: 'You have already voted on this test' };
    }
    
    // Record vote
    test.votes[userId] = option;
    saveTests(tests);
    
    return { success: true };
}

/**
 * Check if user has voted on a test
 * @param {string} testId - Test ID
 * @param {string} userId - User ID
 * @returns {boolean} True if user has voted
 */
function hasUserVoted(testId, userId) {
    const tests = getTests();
    const test = tests.find(t => t.id === testId);
    return test && test.votes[userId] ? true : false;
}

/**
 * Get a test by ID
 * @param {string} testId - Test ID
 * @returns {Object|null} Test object or null
 */
function getTestById(testId) {
    const tests = getTests();
    return tests.find(t => t.id === testId) || null;
}

/**
 * Delete a test (soft delete - marks as deleted)
 * @param {string} testId - Test ID
 * @param {string} userId - User ID (must match test creator)
 * @returns {Object} Result object with success status and message
 */
function deleteTest(testId, userId) {
    const tests = getTests();
    const testIndex = tests.findIndex(t => t.id === testId);
    
    if (testIndex === -1) {
        return { success: false, message: 'Test not found' };
    }
    
    const test = tests[testIndex];
    
    // Verify user owns the test
    if (test.userId !== userId) {
        return { success: false, message: 'You can only delete your own tests' };
    }
    
    // Mark test as deleted (soft delete)
    test.deleted = true;
    test.deletedAt = Date.now();
    saveTests(tests);
    
    return { success: true, message: 'Test deleted successfully' };
}

/**
 * Restore a deleted test
 * @param {string} testId - Test ID
 * @param {string} userId - User ID (must match test creator)
 * @returns {Object} Result object with success status and message
 */
function restoreTest(testId, userId) {
    const tests = getTests();
    const testIndex = tests.findIndex(t => t.id === testId);
    
    if (testIndex === -1) {
        return { success: false, message: 'Test not found' };
    }
    
    const test = tests[testIndex];
    
    // Verify user owns the test
    if (test.userId !== userId) {
        return { success: false, message: 'You can only restore your own tests' };
    }
    
    // Restore test
    test.deleted = false;
    delete test.deletedAt;
    saveTests(tests);
    
    return { success: true, message: 'Test restored successfully' };
}

/**
 * Permanently delete a test
 * @param {string} testId - Test ID
 * @param {string} userId - User ID (must match test creator)
 * @returns {Object} Result object with success status and message
 */
function permanentlyDeleteTest(testId, userId) {
    const tests = getTests();
    const testIndex = tests.findIndex(t => t.id === testId);
    
    if (testIndex === -1) {
        return { success: false, message: 'Test not found' };
    }
    
    const test = tests[testIndex];
    
    // Verify user owns the test
    if (test.userId !== userId) {
        return { success: false, message: 'You can only delete your own tests' };
    }
    
    // Permanently remove test from array
    tests.splice(testIndex, 1);
    saveTests(tests);
    
    return { success: true, message: 'Test permanently deleted' };
}

/**
 * Get vote counts for a test
 * @param {Object} test - Test object
 * @returns {Object} Object with countA and countB
 */
function getVoteCounts(test) {
    const votes = Object.values(test.votes || {});
    return {
        countA: votes.filter(v => v === 'A').length,
        countB: votes.filter(v => v === 'B').length
    };
}

/**
 * Generate a shareable link for a test
 * @param {Object} test - Test object
 * @returns {string} Shareable URL
 */
function generateShareLink(test) {
    // Encode test data as base64 JSON in URL
    const testData = {
        title: test.title,
        imageA: test.imageA,
        imageB: test.imageB
    };
    const encoded = btoa(JSON.stringify(testData));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/share?data=${encodeURIComponent(encoded)}`;
}

/**
 * Import test from shareable link
 * @param {string} encodedData - Base64 encoded test data
 * @returns {Object} Result object with success status and test/message
 */
function importSharedTest(encodedData) {
    try {
        const decoded = JSON.parse(atob(encodedData));
        
        // Validate test data
        if (!decoded.title || !decoded.imageA || !decoded.imageB) {
            return { success: false, message: 'Invalid test data' };
        }
        
        // Check if test already exists (by title and images)
        const existingTests = getTests();
        const duplicate = existingTests.find(t => 
            t.title === decoded.title && 
            t.imageA === decoded.imageA && 
            t.imageB === decoded.imageB
        );
        
        if (duplicate) {
            return { success: false, message: 'This test already exists', test: duplicate };
        }
        
        // Create new test with imported data
        // Use current user ID or generate a temporary one
        const currentUser = getCurrentUser();
        const userId = currentUser ? currentUser.id : 'shared_' + generateId();
        
        const newTest = {
            id: generateId(),
            userId: userId,
            title: decoded.title,
            imageA: decoded.imageA,
            imageB: decoded.imageB,
            votes: {},
            shared: true // Mark as shared/imported
        };
        
        const tests = getTests();
        tests.push(newTest);
        saveTests(tests);
        
        return { success: true, test: newTest };
    } catch (error) {
        console.error('Error importing shared test:', error);
        return { success: false, message: 'Failed to import test data' };
    }
}

// ============================================
// DOM Utilities
// ============================================

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        setTimeout(() => {
            errorEl.classList.add('hidden');
        }, 5000);
    }
}

/**
 * Show loading state
 * @param {boolean} show - Whether to show loading
 */
function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        if (show) {
            loadingEl.classList.remove('hidden');
        } else {
            loadingEl.classList.add('hidden');
        }
    }
}

/**
 * Hide all views
 */
function hideAllViews() {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });
}

/**
 * Show a specific view
 * @param {string} viewId - ID of view to show
 */
function showView(viewId) {
    hideAllViews();
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.remove('hidden');
        // Focus management for accessibility
        const heading = view.querySelector('h1');
        if (heading) {
            heading.focus();
        }
    }
}

/**
 * Clear form errors
 * @param {HTMLFormElement} form - Form element
 */
function clearFormErrors(form) {
    form.querySelectorAll('.error-text').forEach(el => {
        el.textContent = '';
    });
    // Remove error classes from inputs
    form.querySelectorAll('input').forEach(input => {
        input.classList.remove('error');
    });
}

/**
 * Set field error
 * @param {string} fieldId - Field ID
 * @param {string} message - Error message
 */
function setFieldError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    const inputEl = document.getElementById(fieldId);
    
    if (errorEl) {
        errorEl.textContent = message;
    }
    
    // Add or remove error class from input
    if (inputEl) {
        if (message) {
            inputEl.classList.add('error');
        } else {
            inputEl.classList.remove('error');
        }
    }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate URL format (supports both http/https URLs and data URLs)
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
    if (!url) return false;
    
    // Check for data URL
    if (url.startsWith('data:image/')) {
        return true;
    }
    
    // Check for regular URL
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// ============================================
// Navigation & Routing
// ============================================

/**
 * Navigate to a route
 * @param {string} path - Route path
 */
function navigateTo(path) {
    window.location.hash = path;
}

/**
 * Handle route changes
 */
function handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    // Extract route path without query string (hash routes have query in hash)
    const routePath = hash.split('?')[0];
    const routeName = ROUTES[routePath] || 'browse';
    
    // Protected routes require authentication
    const protectedRoutes = ['create', 'dashboard'];
    if (protectedRoutes.includes(routeName) && !isAuthenticated()) {
        navigateTo('/login');
        return;
    }
    
    // Redirect logged-in users away from auth pages
    if ((routeName === 'login' || routeName === 'register') && isAuthenticated()) {
        navigateTo('/');
        return;
    }
    
    showView(`${routeName}-view`);
    updateNavigation();
    
    // Handle share route with query parameters (in hash)
    if (routeName === 'share') {
        const queryPart = hash.split('?')[1] || '';
        const urlParams = new URLSearchParams(queryPart);
        const data = urlParams.get('data');
        if (data) {
            handleSharedTest(data);
        } else {
            showError('Invalid share link');
            navigateTo('/');
        }
        return;
    }
    
    // Load view-specific data
    switch(routeName) {
        case 'browse':
            renderBrowseView();
            break;
        case 'dashboard':
            renderDashboardView();
            break;
    }
}

/**
 * Update navigation based on authentication state
 */
function updateNavigation() {
    const isLoggedIn = isAuthenticated();
    const currentUser = getCurrentUser();
    
    // Show/hide navigation items
    document.getElementById('create-nav-item').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('dashboard-nav-item').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('profile-nav-item').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('login-nav-item').classList.toggle('hidden', isLoggedIn);
    document.getElementById('register-nav-item').classList.toggle('hidden', isLoggedIn);
    
    // Update mobile menu items
    const mobileCreate = document.getElementById('mobile-create-nav-item');
    const mobileDashboard = document.getElementById('mobile-dashboard-nav-item');
    const mobileProfile = document.getElementById('mobile-profile-nav-item');
    const mobileLogin = document.getElementById('mobile-login-nav-item');
    const mobileRegister = document.getElementById('mobile-register-nav-item');
    
    if (mobileCreate) mobileCreate.classList.toggle('hidden', !isLoggedIn);
    if (mobileDashboard) mobileDashboard.classList.toggle('hidden', !isLoggedIn);
    if (mobileProfile) mobileProfile.classList.toggle('hidden', !isLoggedIn);
    if (mobileLogin) mobileLogin.classList.toggle('hidden', isLoggedIn);
    if (mobileRegister) mobileRegister.classList.toggle('hidden', isLoggedIn);
    
    // Close profile dropdown when navigation updates
    closeProfileDropdown();
}

// ============================================
// View Rendering
// ============================================

/**
 * Render the browse tests view
 */
function renderBrowseView() {
    const container = document.getElementById('tests-grid');
    const noTestsEl = document.getElementById('no-tests');
    const authCtaSection = document.getElementById('auth-cta-section');
    const tests = getAllTests();
    const currentUser = getCurrentUser();
    const isLoggedIn = !!currentUser;
    
    // Show/hide CTA section based on authentication
    if (authCtaSection) {
        if (isLoggedIn) {
            authCtaSection.classList.add('hidden');
        } else {
            authCtaSection.classList.remove('hidden');
        }
    }
    
    if (tests.length === 0) {
        container.innerHTML = '';
        noTestsEl.classList.remove('hidden');
        return;
    }
    
    noTestsEl.classList.add('hidden');
    const userId = currentUser ? currentUser.id : null;
    
    container.innerHTML = tests.map(test => {
        const hasVoted = userId ? hasUserVoted(test.id, userId) : false;
        const userVote = userId && test.votes[userId] ? test.votes[userId] : null;
        
        return `
            <article class="test-card" role="listitem">
                <div class="test-card-header">
                    <div class="test-title-group">
                        <h3>${escapeHtml(test.title)}</h3>
                        <p class="test-submitter">${escapeHtml(getSubmitterInfo(test.userId))}</p>
                    </div>
                    <button class="share-button" data-test-id="${test.id}" aria-label="Share this test" title="Share test">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                    </button>
                </div>
                <div class="test-images">
                    <div class="test-image-wrapper">
                        <img src="${escapeHtml(test.imageA)}" alt="Option A for ${escapeHtml(test.title)}" class="test-image" onerror="this.parentElement.innerHTML='<span class=\\'preview-placeholder\\'>Image failed to load</span>'">
                        <span class="test-label">A</span>
                    </div>
                    <div class="test-image-wrapper">
                        <img src="${escapeHtml(test.imageB)}" alt="Option B for ${escapeHtml(test.title)}" class="test-image" onerror="this.parentElement.innerHTML='<span class=\\'preview-placeholder\\'>Image failed to load</span>'">
                        <span class="test-label">B</span>
                    </div>
                </div>
                ${userId ? (
                    hasVoted ? `
                        <div class="already-voted" role="status" aria-live="polite">
                            You voted for option ${userVote}
                        </div>
                    ` : `
                        <div class="vote-buttons">
                            <button class="vote-button" data-test-id="${test.id}" data-option="A" aria-label="Vote for option A">
                                Vote A
                            </button>
                            <button class="vote-button" data-test-id="${test.id}" data-option="B" aria-label="Vote for option B">
                                Vote B
                            </button>
                        </div>
                    `
                ) : `
                    <div class="already-voted">
                        <a href="#/login">Login to vote</a>
                    </div>
                `}
            </article>
        `;
    }).join('');
    
    // Attach vote button handlers
    if (userId) {
        container.querySelectorAll('.vote-button').forEach(button => {
            button.addEventListener('click', handleVote);
        });
    }
    
    // Attach share button handlers
    container.querySelectorAll('.share-button').forEach(button => {
        button.addEventListener('click', handleShare);
    });
}

/**
 * Render the dashboard view
 */
function renderDashboardView() {
    const container = document.getElementById('dashboard-tests');
    const noTestsEl = document.getElementById('no-user-tests');
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        navigateTo('/login');
        return;
    }
    
    const userTests = getUserTests(currentUser.id);
    
    if (userTests.length === 0) {
        container.innerHTML = '';
        noTestsEl.classList.remove('hidden');
        return;
    }
    
    noTestsEl.classList.add('hidden');
    
    container.innerHTML = userTests.map(test => {
        const votes = getVoteCounts(test);
        const total = votes.countA + votes.countB;
        
        return `
            <article class="dashboard-card" role="listitem" data-test-id="${test.id}">
                <div class="test-card-content">
                    <div class="test-card-header">
                        <div class="test-title-group">
                            <h3>${escapeHtml(test.title)}</h3>
                            <p class="test-submitter">${escapeHtml(getSubmitterInfo(test.userId))}</p>
                        </div>
                        <div class="test-card-actions">
                            <button class="share-button" data-test-id="${test.id}" aria-label="Share this test" title="Share test">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="18" cy="5" r="3"></circle>
                                    <circle cx="6" cy="12" r="3"></circle>
                                    <circle cx="18" cy="19" r="3"></circle>
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                                </svg>
                            </button>
                            <button class="delete-button" data-test-id="${test.id}" aria-label="Delete this test" title="Delete test">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="test-images">
                        <div class="test-image-wrapper">
                            <img src="${escapeHtml(test.imageA)}" alt="Option A for ${escapeHtml(test.title)}" class="test-image" onerror="this.parentElement.innerHTML='<span class=\\'preview-placeholder\\'>Image failed to load</span>'">
                            <span class="test-label">A</span>
                        </div>
                        <div class="test-image-wrapper">
                            <img src="${escapeHtml(test.imageB)}" alt="Option B for ${escapeHtml(test.title)}" class="test-image" onerror="this.parentElement.innerHTML='<span class=\\'preview-placeholder\\'>Image failed to load</span>'">
                            <span class="test-label">B</span>
                        </div>
                    </div>
                    <div class="stats">
                        <div class="stat-item">
                            <span class="stat-value">${votes.countA}</span>
                            <span class="stat-label">Votes for A${total > 0 ? ` (${Math.round(votes.countA / total * 100)}%)` : ''}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${votes.countB}</span>
                            <span class="stat-label">Votes for B${total > 0 ? ` (${Math.round(votes.countB / total * 100)}%)` : ''}</span>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join('');
    
    // Attach share button handlers
    container.querySelectorAll('.share-button').forEach(button => {
        button.addEventListener('click', handleShare);
    });
    
    // Attach delete button handlers
    container.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', showDeleteModal);
    });
    
    // Render deleted tests tab (only if deleted tab is active or will be shown)
    renderDeletedTestsView();
    updateDeletedTabCount();
}

/**
 * Update deleted tests tab count badge
 */
function updateDeletedTabCount() {
    const deletedTab = document.getElementById('deleted-tests-tab');
    const currentUser = getCurrentUser();
    
    if (deletedTab && currentUser) {
        const deletedTests = getDeletedUserTests(currentUser.id);
        const count = deletedTests.length;
        
        // Remove existing badge if any
        const existingBadge = deletedTab.querySelector('.tab-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Add badge if there are deleted tests
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'tab-badge';
            badge.textContent = count;
            deletedTab.appendChild(badge);
        }
    }
}

/**
 * Render deleted tests view
 */
function renderDeletedTestsView() {
    const container = document.getElementById('dashboard-deleted-tests');
    const noDeletedTestsEl = document.getElementById('no-deleted-tests');
    const currentUser = getCurrentUser();
    
    if (!currentUser || !container) {
        return;
    }
    
    const deletedTests = getDeletedUserTests(currentUser.id);
    
    if (deletedTests.length === 0) {
        container.innerHTML = '';
        if (noDeletedTestsEl) noDeletedTestsEl.classList.remove('hidden');
        return;
    }
    
    if (noDeletedTestsEl) noDeletedTestsEl.classList.add('hidden');
    
    container.innerHTML = deletedTests.map(test => {
        const votes = getVoteCounts(test);
        const total = votes.countA + votes.countB;
        
        return `
            <article class="dashboard-card deleted-test-card" role="listitem" data-test-id="${test.id}">
                <div class="test-card-header">
                    <div class="test-title-group">
                        <h3>${escapeHtml(test.title)}</h3>
                        <p class="test-submitter">${escapeHtml(getSubmitterInfo(test.userId))}</p>
                    </div>
                </div>
                <div class="test-images">
                    <div class="test-image-wrapper">
                        <img src="${escapeHtml(test.imageA)}" alt="Option A for ${escapeHtml(test.title)}" class="test-image" onerror="this.parentElement.innerHTML='<span class=\\'preview-placeholder\\'>Image failed to load</span>'">
                        <span class="test-label">A</span>
                    </div>
                    <div class="test-image-wrapper">
                        <img src="${escapeHtml(test.imageB)}" alt="Option B for ${escapeHtml(test.title)}" class="test-image" onerror="this.parentElement.innerHTML='<span class=\\'preview-placeholder\\'>Image failed to load</span>'">
                        <span class="test-label">B</span>
                    </div>
                </div>
                <div class="stats">
                    <div class="stat-item">
                        <span class="stat-value">${votes.countA}</span>
                        <span class="stat-label">Votes for A${total > 0 ? ` (${Math.round(votes.countA / total * 100)}%)` : ''}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${votes.countB}</span>
                        <span class="stat-label">Votes for B${total > 0 ? ` (${Math.round(votes.countB / total * 100)}%)` : ''}</span>
                    </div>
                </div>
                <div class="deleted-test-actions">
                    <button class="btn btn-restore" data-test-id="${test.id}">Restore</button>
                    <button class="btn btn-delete-permanent" data-test-id="${test.id}">Delete Permanently</button>
                </div>
            </article>
        `;
    }).join('');
    
    // Attach restore button handlers
    container.querySelectorAll('.btn-restore').forEach(button => {
        button.addEventListener('click', handleRestore);
    });
    
    // Attach permanent delete button handlers
    container.querySelectorAll('.btn-delete-permanent').forEach(button => {
        button.addEventListener('click', handlePermanentDelete);
    });
    
    // Update tab count
    updateDeletedTabCount();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Event Handlers
// ============================================

/**
 * Handle login form submission
 */
function handleLogin(e) {
    e.preventDefault();
    clearFormErrors(e.target);
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    let isValid = true;
    
    // Validate email
    if (!email) {
        setFieldError('login-email', 'Email is required');
        isValid = false;
    } else if (!isValidEmail(email)) {
        setFieldError('login-email', 'Please enter a valid email');
        isValid = false;
    }
    
    // Validate password
    if (!password) {
        setFieldError('login-password', 'Password is required');
        isValid = false;
    }
    
    if (!isValid) {
        return;
    }
    
    // Attempt login
    const result = loginUser(email, password);
    
    if (result.success) {
        updateNavigation();
        navigateTo('/');
    } else {
        setFieldError('login-password', result.message);
        showError(result.message);
    }
}

/**
 * Handle register form submission
 */
function handleRegister(e) {
    e.preventDefault();
    clearFormErrors(e.target);
    
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    
    let isValid = true;
    
    // Validate email
    if (!email) {
        setFieldError('register-email', 'Email is required');
        isValid = false;
    } else if (!isValidEmail(email)) {
        setFieldError('register-email', 'Please enter a valid email');
        isValid = false;
    }
    
    // Validate password
    if (!password) {
        setFieldError('register-password', 'Password is required');
        isValid = false;
    } else if (password.length < 6) {
        setFieldError('register-password', 'Password must be at least 6 characters');
        isValid = false;
    }
    
    // Validate password confirmation
    if (!passwordConfirm) {
        setFieldError('register-password-confirm', 'Please confirm your password');
        isValid = false;
    } else if (password !== passwordConfirm) {
        setFieldError('register-password-confirm', 'Passwords do not match');
        isValid = false;
    }
    
    if (!isValid) {
        return;
    }
    
    // Attempt registration
    const result = registerUser(email, password);
    
    if (result.success) {
        // Auto-login after registration
        setSession(result.user.id);
        updateNavigation();
        navigateTo('/');
    } else {
        setFieldError('register-email', result.message);
        showError(result.message);
    }
}

/**
 * Handle create test form submission
 */
function handleCreateTest(e) {
    e.preventDefault();
    clearFormErrors(e.target);
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        navigateTo('/login');
        return;
    }
    
    const title = document.getElementById('test-title').value.trim();
    const imageA = document.getElementById('test-image-a').value.trim();
    const imageB = document.getElementById('test-image-b').value.trim();
    
    let isValid = true;
    
    // Validate title
    if (!title) {
        setFieldError('test-title', 'Title is required');
        isValid = false;
    } else if (title.length < 3) {
        setFieldError('test-title', 'Title must be at least 3 characters');
        isValid = false;
    }
    
    // Validate image URLs or files
    if (!imageA) {
        setFieldError('test-image-a', 'Image A is required (URL or file)');
        isValid = false;
    } else if (!isValidUrl(imageA)) {
        setFieldError('test-image-a', 'Please enter a valid URL or upload an image file');
        isValid = false;
    }
    
    if (!imageB) {
        setFieldError('test-image-b', 'Image B is required (URL or file)');
        isValid = false;
    } else if (!isValidUrl(imageB)) {
        setFieldError('test-image-b', 'Please enter a valid URL or upload an image file');
        isValid = false;
    }
    
    if (!isValid) {
        return;
    }
    
    // Create test
    createTest(title, imageA, imageB, currentUser.id);
    
    // Reset form
    e.target.reset();
    updateImagePreview('test-image-a', 'test-image-a-preview');
    updateImagePreview('test-image-b', 'test-image-b-preview');
    
    // Navigate to dashboard
    navigateTo('/dashboard');
}

/**
 * Handle vote button click
 */
function handleVote(e) {
    const button = e.currentTarget;
    const testId = button.dataset.testId;
    const option = button.dataset.option;
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        navigateTo('/login');
        return;
    }
    
    // Disable button during processing
    button.disabled = true;
    
    const result = voteOnTest(testId, currentUser.id, option);
    
    if (result.success) {
        // Re-render browse view to show updated state
        renderBrowseView();
    } else {
        showError(result.message);
        button.disabled = false;
    }
}

/**
 * Handle share button click
 */
function handleShare(e) {
    e.stopPropagation();
    const button = e.currentTarget;
    const testId = button.dataset.testId;
    const test = getTestById(testId);
    
    if (!test) {
        showError('Test not found');
        return;
    }
    
    const shareLink = generateShareLink(test);
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareLink).then(() => {
            showError(''); // Clear any errors
            // Show success message (reusing error message area for now)
            const errorEl = document.getElementById('error-message');
            if (errorEl) {
                errorEl.textContent = 'Share link copied to clipboard!';
                errorEl.classList.remove('hidden');
                errorEl.style.backgroundColor = 'rgba(52, 199, 89, 0.1)';
                errorEl.style.borderColor = '#34c759';
                errorEl.style.color = '#34c759';
                setTimeout(() => {
                    errorEl.classList.add('hidden');
                    errorEl.style.backgroundColor = '';
                    errorEl.style.borderColor = '';
                    errorEl.style.color = '';
                }, 3000);
            }
        }).catch(() => {
            // Fallback: show link in prompt
            prompt('Copy this link to share:', shareLink);
        });
    } else {
        // Fallback for older browsers
        prompt('Copy this link to share:', shareLink);
    }
}

// Store the test ID to delete in a variable
let testToDeleteId = null;

/**
 * Show delete confirmation modal
 */
function showDeleteModal(e) {
    e.preventDefault();
    e.stopPropagation();
    const button = e.currentTarget;
    const testId = button.dataset.testId;
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        showError('You must be logged in to delete tests');
        return;
    }
    
    const test = getTestById(testId);
    if (!test) {
        showError('Test not found');
        return;
    }
    
    // Verify user owns the test
    if (test.userId !== currentUser.id) {
        showError('You can only delete your own tests');
        return;
    }
    
    // Store test ID for deletion
    testToDeleteId = testId;
    
    // Show modal
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Focus the cancel button for accessibility
        const cancelBtn = document.getElementById('modal-delete-cancel');
        if (cancelBtn) {
            cancelBtn.focus();
        }
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Hide delete confirmation modal
 */
function hideDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.add('hidden');
        testToDeleteId = null;
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Reset confirm button state
        const confirmBtn = document.getElementById('modal-delete-confirm');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Yes, delete it';
        }
    }
}

/**
 * Confirm delete (actually delete the test)
 */
function confirmDelete() {
    if (!testToDeleteId) {
        return;
    }
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showError('You must be logged in to delete tests');
        hideDeleteModal();
        return;
    }
    
    const test = getTestById(testToDeleteId);
    if (!test) {
        showError('Test not found');
        hideDeleteModal();
        return;
    }
    
    // Verify user owns the test
    if (test.userId !== currentUser.id) {
        showError('You can only delete your own tests');
        hideDeleteModal();
        return;
    }
    
    const confirmBtn = document.getElementById('modal-delete-confirm');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting...';
    }
    
    const result = deleteTest(testToDeleteId, currentUser.id);
    
    if (result.success) {
        hideDeleteModal();
        // Re-render dashboard view
        renderDashboardView();
        showError(''); // Clear any errors
        // Show success message
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = 'Test deleted successfully';
            errorEl.classList.remove('hidden');
            errorEl.style.backgroundColor = 'rgba(52, 199, 89, 0.1)';
            errorEl.style.borderColor = '#34c759';
            errorEl.style.color = '#34c759';
            setTimeout(() => {
                errorEl.classList.add('hidden');
                errorEl.style.backgroundColor = '';
                errorEl.style.borderColor = '';
                errorEl.style.color = '';
            }, 3000);
        }
    } else {
        showError(result.message);
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Yes, delete it';
        }
    }
}

/**
 * Handle restore button click
 */
function handleRestore(e) {
    e.stopPropagation();
    const button = e.currentTarget;
    const testId = button.dataset.testId;
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        showError('You must be logged in to restore tests');
        return;
    }
    
    const result = restoreTest(testId, currentUser.id);
    
    if (result.success) {
        renderDashboardView();
        showError('');
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = 'Test restored successfully';
            errorEl.classList.remove('hidden');
            errorEl.style.backgroundColor = 'rgba(52, 199, 89, 0.1)';
            errorEl.style.borderColor = '#34c759';
            errorEl.style.color = '#34c759';
            setTimeout(() => {
                errorEl.classList.add('hidden');
                errorEl.style.backgroundColor = '';
                errorEl.style.borderColor = '';
                errorEl.style.color = '';
            }, 3000);
        }
    } else {
        showError(result.message);
    }
}

/**
 * Handle permanent delete button click
 */
function handlePermanentDelete(e) {
    e.stopPropagation();
    const button = e.currentTarget;
    const testId = button.dataset.testId;
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        showError('You must be logged in to delete tests');
        return;
    }
    
    const test = getTestById(testId);
    if (!test) {
        showError('Test not found');
        return;
    }
    
    // Confirm permanent deletion
    const confirmed = confirm(`Are you sure you want to permanently delete "${test.title}"? This action cannot be undone.`);
    
    if (!confirmed) {
        return;
    }
    
    button.disabled = true;
    
    const result = permanentlyDeleteTest(testId, currentUser.id);
    
    if (result.success) {
        renderDashboardView();
        showError('');
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = 'Test permanently deleted';
            errorEl.classList.remove('hidden');
            errorEl.style.backgroundColor = 'rgba(52, 199, 89, 0.1)';
            errorEl.style.borderColor = '#34c759';
            errorEl.style.color = '#34c759';
            setTimeout(() => {
                errorEl.classList.add('hidden');
                errorEl.style.backgroundColor = '';
                errorEl.style.borderColor = '';
                errorEl.style.color = '';
            }, 3000);
        }
    } else {
        showError(result.message);
        button.disabled = false;
    }
}

/**
 * Handle shared test import
 */
function handleSharedTest(encodedData) {
    showView('share-view');
    const shareContent = document.getElementById('share-content');
    
    if (!shareContent) return;
    
    shareContent.innerHTML = '<p>Importing test...</p>';
    
    const result = importSharedTest(encodedData);
    
    if (result.success) {
        shareContent.innerHTML = `
            <p>Test imported successfully!</p>
            <a href="#/" class="btn btn-primary">View All Tests</a>
        `;
        // Refresh browse view after a short delay
        setTimeout(() => {
            navigateTo('/');
        }, 2000);
    } else {
        if (result.test) {
            // Test already exists
            shareContent.innerHTML = `
                <p>This test already exists in your collection.</p>
                <a href="#/" class="btn btn-primary">View All Tests</a>
            `;
        } else {
            shareContent.innerHTML = `
                <p>Error: ${result.message || 'Failed to import test'}</p>
                <a href="#/" class="btn btn-primary">Go to Home</a>
            `;
        }
    }
}

/**
 * Convert file to data URL
 * @param {File} file - File object
 * @returns {Promise<string>} Promise that resolves to data URL
 */
function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('File must be an image'));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Handle URL input (from paste or text input)
 * @param {string} url - URL string to process
 * @param {string} inputId - Input field ID to update
 * @param {string} previewId - Preview container ID
 */
function handleUrlInput(url, inputId, previewId) {
    const trimmedUrl = url.trim();
    
    // Check if it's already a valid URL
    if (isValidUrl(trimmedUrl)) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = trimmedUrl;
            updateImagePreview(inputId, previewId);
            setFieldError(inputId, '');
        }
        return;
    }
    
    // Try adding https:// if it looks like a domain
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('data:')) {
        const urlWithProtocol = 'https://' + trimmedUrl;
        if (isValidUrl(urlWithProtocol)) {
            const input = document.getElementById(inputId);
            if (input) {
                input.value = urlWithProtocol;
                updateImagePreview(inputId, previewId);
                setFieldError(inputId, '');
            }
            return;
        }
    }
    
    // Invalid URL
    setFieldError(inputId, 'Please paste a valid image URL');
}

/**
 * Handle file drop or selection
 * @param {File} file - Dropped or selected file
 * @param {string} inputId - Input field ID to update
 * @param {string} previewId - Preview container ID
 */
async function handleImageFile(file, inputId, previewId) {
    try {
        const dataUrl = await fileToDataUrl(file);
        const input = document.getElementById(inputId);
        if (input) {
            input.value = dataUrl;
            updateImagePreview(inputId, previewId);
            // Clear any error messages
            setFieldError(inputId, '');
        }
    } catch (error) {
        showError(error.message || 'Failed to process image file');
        setFieldError(inputId, error.message || 'Invalid image file');
    }
}

/**
 * Setup drag and drop handlers for a drop zone
 * @param {string} dropZoneId - Drop zone element ID
 * @param {string} fileInputId - File input element ID
 * @param {string} urlInputId - URL input field ID
 * @param {string} previewId - Preview container ID
 */
function setupDragAndDrop(dropZoneId, fileInputId, urlInputId, previewId) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(fileInputId);
    
    if (!dropZone || !fileInput) return;
    
    // Prevent default drag behaviors on drop zone
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        const text = dt.getData('text/plain');
        
        // Check if files were dropped
        if (files.length > 0) {
            handleImageFile(files[0], urlInputId, previewId);
        }
        // Check if text/URL was pasted/dropped
        else if (text && text.trim()) {
            handleUrlInput(text.trim(), urlInputId, previewId);
        }
    }, false);
    
    // Handle paste events (paste URL directly into drop zone when focused)
    // Note: Users can also paste directly into the URL input field above (recommended)
    dropZone.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        
        if (text && text.trim()) {
            handleUrlInput(text.trim(), urlInputId, previewId);
        }
    }, false);
    
    // Handle file input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleImageFile(e.target.files[0], urlInputId, previewId);
            // Reset file input so same file can be selected again
            e.target.value = '';
        }
    }, false);
    
    // Handle click on drop zone (trigger file input)
    dropZone.addEventListener('click', (e) => {
        // Don't trigger if clicking on the file input itself
        if (e.target !== fileInput) {
            fileInput.click();
        }
    }, false);
    
    // Handle keyboard interaction (Enter or Space)
    dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    }, false);
}

/**
 * Delete image from preview and input
 * @param {string} inputId - Input field ID
 * @param {string} previewId - Preview container ID
 */
function deleteImage(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (input) {
        input.value = '';
        // Clear error state
        setFieldError(inputId, '');
        input.classList.remove('error');
    }
    
    if (preview) {
        preview.innerHTML = '<span class="preview-placeholder">Enter URL to preview</span>';
    }
}

/**
 * Update image preview
 * @param {string} inputId - Input field ID
 * @param {string} previewId - Preview container ID
 */
function updateImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (!input || !preview) return;
    
    const url = input.value.trim();
    
    if (!url) {
        preview.innerHTML = '<span class="preview-placeholder">Enter URL to preview</span>';
        // Clear error state when empty
        setFieldError(inputId, '');
        return;
    }
    
    if (!isValidUrl(url)) {
        // Only show error if user has typed something
        if (document.activeElement === input || input.value.length > 0) {
            preview.innerHTML = '<span class="preview-placeholder">Invalid URL</span>';
        } else {
            preview.innerHTML = '<span class="preview-placeholder">Enter URL to preview</span>';
        }
        return;
    }
    
    // Create container for image and delete button
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    
    // Create image element
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Preview of ${inputId.includes('a') ? 'Image A' : 'Image B'}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-image-btn';
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', `Delete ${inputId.includes('a') ? 'Image A' : 'Image B'}`);
    deleteBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteImage(inputId, previewId);
    });
    
    img.onload = () => {
        preview.innerHTML = '';
        container.appendChild(img);
        container.appendChild(deleteBtn);
        preview.appendChild(container);
        // Clear error state when image loads successfully
        setFieldError(inputId, '');
    };
    
    img.onerror = () => {
        preview.innerHTML = '<span class="preview-placeholder">Image failed to load</span>';
        // Show error if URL is invalid
        setFieldError(inputId, 'Please enter a valid URL or upload an image file');
    };
    
    // Append container with image and delete button
    preview.innerHTML = '';
    container.appendChild(img);
    container.appendChild(deleteBtn);
    preview.appendChild(container);
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize the application
 */
function init() {
    // Check localStorage availability
    if (typeof Storage === 'undefined') {
        showError('localStorage is not available in your browser.');
        return;
    }
    
    // Set up routing
    window.addEventListener('hashchange', handleRoute);
    
    // Set up navigation links
    document.querySelectorAll('[data-route]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const route = link.dataset.route;
            navigateTo(route);
        });
    });
    
    // Set up profile dropdown
    setupProfileDropdown();
    
    // Set up mobile menu
    setupMobileMenu();
    
    // Set up login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        // Inline validation - only show errors if user has typed something invalid
        loginForm.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', function() {
                const value = this.value.trim();
                if (value === '') {
                    // Clear error if field is empty (user deleted content)
                    setFieldError(this.id, '');
                } else if (this.id === 'login-email' && !isValidEmail(value)) {
                    setFieldError(this.id, 'Please enter a valid email');
                } else if (this.validity.valid) {
                    setFieldError(this.id, '');
                }
            });
            input.addEventListener('blur', function() {
                const value = this.value.trim();
                if (value === '' || this.validity.valid) {
                    setFieldError(this.id, '');
                }
            });
        });
    }
    
    // Set up register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        // Inline validation - only show errors if user has typed something invalid
        registerForm.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', function() {
                const value = this.value;
                if (value === '') {
                    // Clear error if field is empty
                    setFieldError(this.id, '');
                } else if (this.id === 'register-email' && !isValidEmail(value)) {
                    setFieldError(this.id, 'Please enter a valid email');
                } else if (this.id === 'register-password' && value.length > 0 && value.length < 6) {
                    setFieldError(this.id, 'Password must be at least 6 characters');
                } else if (this.id === 'register-password-confirm') {
                    const password = document.getElementById('register-password').value;
                    if (value && value !== password) {
                        setFieldError(this.id, 'Passwords do not match');
                    } else if (value && value === password) {
                        setFieldError(this.id, '');
                    }
                } else if (this.validity.valid) {
                    setFieldError(this.id, '');
                }
            });
            input.addEventListener('blur', function() {
                const value = this.value;
                if (value === '' || this.validity.valid) {
                    if (this.id !== 'register-password-confirm' || 
                        value === document.getElementById('register-password').value) {
                        setFieldError(this.id, '');
                    }
                }
            });
        });
    }
    
    // Set up create test form
    const createForm = document.getElementById('create-test-form');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateTest);
        
        // Image preview on input with inline validation
        const imageAInput = document.getElementById('test-image-a');
        const imageBInput = document.getElementById('test-image-b');
        const titleInput = document.getElementById('test-title');
        
        if (titleInput) {
            titleInput.addEventListener('input', function() {
                const value = this.value.trim();
                if (value === '') {
                    setFieldError(this.id, '');
                } else if (value.length > 0 && value.length < 3) {
                    setFieldError(this.id, 'Title must be at least 3 characters');
                } else {
                    setFieldError(this.id, '');
                }
                
                // Update preview section title
                const previewTitle = document.getElementById('preview-title');
                if (previewTitle) {
                    previewTitle.textContent = value || 'Preview';
                }
            });
        }
        
        if (imageAInput) {
            imageAInput.addEventListener('input', () => {
                const value = imageAInput.value.trim();
                if (value && !isValidUrl(value)) {
                    setFieldError('test-image-a', 'Please enter a valid URL or upload an image file');
                } else {
                    setFieldError('test-image-a', '');
                }
                updateImagePreview('test-image-a', 'test-image-a-preview');
            });
        }
        
        if (imageBInput) {
            imageBInput.addEventListener('input', () => {
                const value = imageBInput.value.trim();
                if (value && !isValidUrl(value)) {
                    setFieldError('test-image-b', 'Please enter a valid URL or upload an image file');
                } else {
                    setFieldError('test-image-b', '');
                }
                updateImagePreview('test-image-b', 'test-image-b-preview');
            });
        }
        
        // Set up drag and drop for image inputs
        setupDragAndDrop('drop-zone-a', 'file-input-a', 'test-image-a', 'test-image-a-preview');
        setupDragAndDrop('drop-zone-b', 'file-input-b', 'test-image-b', 'test-image-b-preview');
    }
    
    // Initialize navigation
    updateNavigation();
    
    // Set up dashboard tabs
    setupDashboardTabs();
    
    // Set up delete modal
    setupDeleteModal();
    
    // Handle initial route
    handleRoute();
}

/**
 * Setup dashboard tab switching
 */
function setupDashboardTabs() {
    const activeTab = document.getElementById('active-tests-tab');
    const deletedTab = document.getElementById('deleted-tests-tab');
    const activePanel = document.getElementById('active-tests-panel');
    const deletedPanel = document.getElementById('deleted-tests-panel');
    
    if (activeTab && deletedTab && activePanel && deletedPanel) {
        activeTab.addEventListener('click', () => {
            activeTab.classList.add('active');
            activeTab.setAttribute('aria-selected', 'true');
            activePanel.classList.remove('hidden');
            activePanel.classList.add('active');
            
            deletedTab.classList.remove('active');
            deletedTab.setAttribute('aria-selected', 'false');
            deletedPanel.classList.add('hidden');
            deletedPanel.classList.remove('active');
        });
        
        deletedTab.addEventListener('click', () => {
            deletedTab.classList.add('active');
            deletedTab.setAttribute('aria-selected', 'true');
            deletedPanel.classList.remove('hidden');
            deletedPanel.classList.add('active');
            
            activeTab.classList.remove('active');
            activeTab.setAttribute('aria-selected', 'false');
            activePanel.classList.add('hidden');
            activePanel.classList.remove('active');
            
            // Refresh deleted tests view when switching to deleted tab
            renderDeletedTestsView();
        });
    }
}

/**
 * Setup delete modal handlers
 */
function setupDeleteModal() {
    const modal = document.getElementById('delete-modal');
    const confirmBtn = document.getElementById('modal-delete-confirm');
    const cancelBtn = document.getElementById('modal-delete-cancel');
    const overlay = modal?.querySelector('.modal-overlay');
    
    if (!modal) return;
    
    // Confirm button - delete the test
    if (confirmBtn) {
        confirmBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            confirmDelete();
        });
    }
    
    // Cancel button - close modal
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideDeleteModal();
        });
    }
    
    // Close modal when clicking overlay (click on modal but not on modal-content)
    modal.addEventListener('click', (e) => {
        // Only close if clicking directly on the modal/overlay, not on modal-content
        if (e.target === modal || e.target === overlay) {
            hideDeleteModal();
        }
    });
    
    // Prevent modal content clicks from closing the modal
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            hideDeleteModal();
        }
    });
}

/**
 * Toggle profile dropdown
 */
function toggleProfileDropdown() {
    const profileBtn = document.getElementById('profile-btn');
    const dropdown = document.getElementById('profile-dropdown');
    
    if (!profileBtn || !dropdown) return;
    
    const isExpanded = profileBtn.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
        closeProfileDropdown();
    } else {
        profileBtn.setAttribute('aria-expanded', 'true');
        dropdown.classList.remove('hidden');
    }
}

/**
 * Close profile dropdown
 */
function closeProfileDropdown() {
    const profileBtn = document.getElementById('profile-btn');
    const dropdown = document.getElementById('profile-dropdown');
    
    if (profileBtn) {
        profileBtn.setAttribute('aria-expanded', 'false');
    }
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
    const burger = document.getElementById('nav-burger');
    const mobileMenu = document.getElementById('nav-mobile-menu');
    
    if (!burger || !mobileMenu) return;
    
    const isExpanded = burger.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
        closeMobileMenu();
    } else {
        burger.setAttribute('aria-expanded', 'true');
        mobileMenu.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close mobile menu
 */
function closeMobileMenu() {
    const burger = document.getElementById('nav-burger');
    const mobileMenu = document.getElementById('nav-mobile-menu');
    
    if (burger) {
        burger.setAttribute('aria-expanded', 'false');
    }
    if (mobileMenu) {
        mobileMenu.classList.add('hidden');
    }
    document.body.style.overflow = '';
}

/**
 * Setup mobile menu handlers
 */
function setupMobileMenu() {
    const burger = document.getElementById('nav-burger');
    const mobileMenu = document.getElementById('nav-mobile-menu');
    const mobileLinks = mobileMenu?.querySelectorAll('.nav-mobile-link');
    const mobileProfileBtn = document.getElementById('mobile-profile-btn');
    const mobileLogoutBtn = document.getElementById('mobile-profile-logout-btn');
    
    if (burger) {
        burger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileMenu();
        });
    }
    
    // Close menu when clicking on overlay (outside menu content)
    if (mobileMenu) {
        mobileMenu.addEventListener('click', (e) => {
            if (e.target === mobileMenu) {
                closeMobileMenu();
            }
        });
    }
    
    // Close menu when clicking on a link
    if (mobileLinks) {
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                closeMobileMenu();
            });
        });
    }
    
    // Setup mobile profile dropdown
    if (mobileProfileBtn) {
        mobileProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const mobileDropdown = document.getElementById('mobile-profile-dropdown');
            const isExpanded = mobileProfileBtn.getAttribute('aria-expanded') === 'true';
            
            if (isExpanded) {
                mobileProfileBtn.setAttribute('aria-expanded', 'false');
                if (mobileDropdown) mobileDropdown.classList.add('hidden');
            } else {
                mobileProfileBtn.setAttribute('aria-expanded', 'true');
                if (mobileDropdown) mobileDropdown.classList.remove('hidden');
            }
        });
    }
    
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobileMenu();
            logoutUser();
        });
    }
    
    // Close mobile menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu && !mobileMenu.classList.contains('hidden')) {
            closeMobileMenu();
        }
    });
}

/**
 * Setup profile dropdown handlers
 */
function setupProfileDropdown() {
    const profileBtn = document.getElementById('profile-btn');
    const logoutBtn = document.getElementById('profile-logout-btn');
    
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleProfileDropdown();
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeProfileDropdown();
            logoutUser();
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const profileWrapper = document.querySelector('.nav-profile-wrapper');
        if (profileWrapper && !profileWrapper.contains(e.target)) {
            closeProfileDropdown();
        }
    });
    
    // Close dropdown on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProfileDropdown();
        }
    });
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

