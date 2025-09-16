// Qbi2 - Knowledge Management System

// Global state
let currentTopics = [];
let selectedTopic = null;
let selectedSubTopics = [];
let currentSubTopics = [];
let contextMenuTarget = null;
let contextMenuType = null; // 'topic' or 'subtopic'
let editingTopicId = null;
let editingSubTopicId = null;

// Wait for Tauri API
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🟢 Qbi starting...');
    console.log('🟢 DOM loaded, initializing...');

    // Wait for Tauri API injection
    await waitForTauriAPI();

    // Initialize app
    initializeApp();
});

async function waitForTauriAPI() {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
        // デバッグ用: __TAURI__の内容を確認
        if (window.__TAURI__) {
            console.log('🔍 __TAURI__ object found:', window.__TAURI__);
            console.log('🔍 __TAURI__ keys:', Object.keys(window.__TAURI__));

            // invokeメソッドの確認
            if (window.__TAURI__.invoke) {
                console.log('🟢 Tauri API found via __TAURI__.invoke');
                return;
            }

            // coreモジュール経由でinvokeを確認
            if (window.__TAURI__.core && window.__TAURI__.core.invoke) {
                console.log('🟢 Tauri API found via __TAURI__.core.invoke');
                // invokeをトップレベルに移動
                window.__TAURI__.invoke = window.__TAURI__.core.invoke;
                return;
            }

            // primitiveモジュール経由でinvokeを確認
            if (window.__TAURI__.primitives && window.__TAURI__.primitives.invoke) {
                console.log('🟢 Tauri API found via __TAURI__.primitives.invoke');
                window.__TAURI__.invoke = window.__TAURI__.primitives.invoke;
                return;
            }
        }

        // __TAURI_IIFE__を確認
        if (window.__TAURI_IIFE__ && typeof window.__TAURI_IIFE__.invoke === 'function') {
            console.log('🟢 Tauri API found via __TAURI_IIFE__');
            window.__TAURI__ = window.__TAURI_IIFE__;
            return;
        }

        if (attempts % 10 === 0) {
            console.log(`🔍 Waiting for Tauri API... attempt ${attempts + 1}/${maxAttempts}`);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
    }

    console.error('❌ Tauri API not found after', maxAttempts, 'attempts');
    console.error('Available window properties:', Object.keys(window).filter(key => key.includes('tauri') || key.includes('TAURI')));
    if (window.__TAURI__) {
        console.error('__TAURI__ structure:', window.__TAURI__);
    }
    throw new Error('Tauri API not available');
}

function initializeApp() {
    console.log('🟢 Initializing app...');

    // Bind events
    bindEvents();

    // Load initial data
    loadTopics();

    console.log('🟢 App initialized');
}

function bindEvents() {
    // Tab management
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Topic management
    document.getElementById('add-topic-btn').addEventListener('click', () => {
        showModal('topic-modal');
    });

    // Scraping
    document.getElementById('start-scraping-btn').addEventListener('click', startScraping);

    // Article generation
    document.getElementById('generate-article-btn').addEventListener('click', generateArticle);

    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Topic context menu events
    document.getElementById('add-subtopic-context').addEventListener('click', () => {
        if (contextMenuTarget) {
            selectedTopic = currentTopics.find(t => t.id === contextMenuTarget);
            showModal('subtopic-modal');
        }
        hideContextMenu();
    });

    document.getElementById('edit-topic-context').addEventListener('click', editTopic);
    document.getElementById('delete-topic-context').addEventListener('click', deleteTopic);

    // SubTopic context menu events
    document.getElementById('edit-subtopic-context').addEventListener('click', editSubTopic);
    document.getElementById('delete-subtopic-context').addEventListener('click', deleteSubTopic);

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('contextmenu', (e) => {
        // Prevent default context menu for right-clicks not on topic items
        if (!e.target.closest('.topic-item')) {
            e.preventDefault();
            hideContextMenu();
        }
    });
}

// Tab Management
function switchTab(tabId) {
    // Hide all tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Remove active state from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Show selected tab panel
    document.getElementById(tabId).classList.add('active');

    // Add active state to clicked tab button
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    // Update tab-specific content
    if (tabId === 'tab-resources' && selectedSubTopics.length > 0) {
        loadResourceStocks(selectedSubTopics[0]);
    }
}

// Topic Management
async function loadTopics() {
    try {
        console.log('🔍 Loading topics...');
        currentTopics = await window.__TAURI__.invoke('get_topics');
        console.log('✅ Topics loaded:', currentTopics);
        renderTopics();
    } catch (error) {
        console.error('❌ Failed to load topics:', error);
        showError('Failed to load topics: ' + error);
    }
}

function renderTopics() {
    const hierarchicalList = document.getElementById('topic-list');

    if (currentTopics.length === 0) {
        hierarchicalList.innerHTML = '<div class="empty-state"><p>No topics yet</p></div>';
        return;
    }

    hierarchicalList.innerHTML = currentTopics.map(topic => `
        <div class="hierarchical-item">
            <div class="topic-item ${selectedTopic?.id === topic.id ? 'selected' : ''}"
                 onclick="selectTopic('${topic.id}')"
                 oncontextmenu="showContextMenu(event, '${topic.id}')">
                <h3>${escapeHtml(topic.name)}</h3>
                ${topic.description ? `<p>${escapeHtml(topic.description)}</p>` : ''}
            </div>
            <div class="subtopic-dropdown" id="subtopic-dropdown-${topic.id}">
                <!-- SubTopics will be loaded here -->
            </div>
        </div>
    `).join('');

    // Load subtopics for each topic
    currentTopics.forEach(topic => {
        loadSubTopicsForHover(topic.id);
    });
}

async function selectTopic(topicId) {
    selectedTopic = currentTopics.find(t => t.id === topicId);
    if (!selectedTopic) return;

    console.log('Selected topic:', selectedTopic);

    // Update UI
    renderTopics();

    // Clear previous subtopic selections
    selectedSubTopics = [];
    updateScrapingButton();
}

// Load subtopics for hover display
async function loadSubTopicsForHover(topicId) {
    try {
        console.log('🔍 Loading subtopics for topic:', topicId);
        console.log('🔍 Topic ID type:', typeof topicId);

        // エラーメッセージに基づいてtopicIdを試す
        const result = await window.__TAURI__.invoke('get_subtopics', { topicId: topicId });
        console.log('✅ Subtopics loaded with topicId:', result);
        renderSubTopicsInDropdown(topicId, result);
    } catch (error) {
        console.error('❌ Failed with topicId:', error);

        // topic_idも試す
        try {
            console.log('🔄 Trying topic_id format...');
            const altResult = await window.__TAURI__.invoke('get_subtopics', { topic_id: topicId });
            console.log('✅ topic_id format worked:', altResult);
            renderSubTopicsInDropdown(topicId, altResult);
        } catch (altError) {
            console.error('❌ Both topicId and topic_id failed:', altError);
        }
    }
}

// Compatibility function for loadSubTopics
async function loadSubTopics(topicId) {
    return loadSubTopicsForHover(topicId);
}

function renderSubTopicsInDropdown(topicId, subtopics) {
    const dropdown = document.getElementById(`subtopic-dropdown-${topicId}`);

    if (subtopics.length === 0) {
        dropdown.innerHTML = '<div class="empty-state"><p>No subtopics yet</p></div>';
        return;
    }

    dropdown.innerHTML = subtopics.map(subtopic => `
        <div class="subtopic-item ${selectedSubTopics.includes(subtopic.id) ? 'selected' : ''}"
             onclick="toggleSubTopicSelection('${subtopic.id}')"
             oncontextmenu="showSubTopicContextMenu(event, '${subtopic.id}')">
            ${subtopic.template_type ? `<span class="subtopic-type-badge">${subtopic.template_type}</span>` : ''}
            <div class="subtopic-name">${escapeHtml(subtopic.name)}</div>
        </div>
    `).join('');
}

function toggleSubTopicSelection(subtopicId) {
    if (selectedSubTopics.includes(subtopicId)) {
        selectedSubTopics = selectedSubTopics.filter(id => id !== subtopicId);
    } else {
        selectedSubTopics.push(subtopicId);
    }

    // Re-render all dropdowns to update selection state
    currentTopics.forEach(topic => {
        loadSubTopicsForHover(topic.id);
    });

    updateScrapingButton();

    // Load resources for the first selected subtopic
    if (selectedSubTopics.length > 0) {
        loadResourceStocks(selectedSubTopics[0]);
    } else {
        // Clear resource list if no subtopics selected
        const resourceList = document.getElementById('resource-list');
        resourceList.innerHTML = '<div class="empty-state"><p>No resources collected yet</p></div>';
    }
}

function updateScrapingButton() {
    const scrapingBtn = document.getElementById('start-scraping-btn');
    const articleBtn = document.getElementById('generate-article-btn');

    if (selectedSubTopics.length > 0) {
        scrapingBtn.textContent = `🔍 Start Scraping (${selectedSubTopics.length})`;
        scrapingBtn.disabled = false;
        articleBtn.disabled = false;
    } else {
        scrapingBtn.textContent = '🔍 Start Scraping';
        scrapingBtn.disabled = true;
        articleBtn.disabled = true;
    }
}

// Modal Management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');

    // Focus first input
    const firstInput = modal.querySelector('input, textarea');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');

    // Clear form
    modal.querySelectorAll('input, textarea, select').forEach(input => {
        input.value = '';
    });
}

// Topic Creation
async function submitTopic() {
    const name = document.getElementById('topic-name').value.trim();
    const description = document.getElementById('topic-description').value.trim();

    if (!name) {
        alert('Topic name is required');
        return;
    }

    try {
        console.log('🔨 Creating topic:', { name, description });
        const result = await window.__TAURI__.invoke('create_topic', {
            req: {
                name,
                description: description || null
            }
        });
        console.log('✅ Topic created:', result);

        closeModal('topic-modal');
        await loadTopics();
        showSuccess('Topic created successfully');
    } catch (error) {
        console.error('❌ Failed to create topic:', error);
        showError('Failed to create topic: ' + error);
    }
}

// SubTopic Creation
async function submitSubTopic() {
    const name = document.getElementById('subtopic-name').value.trim();
    const templateType = document.getElementById('subtopic-type').value;
    const description = document.getElementById('subtopic-description').value.trim();

    if (!name) {
        alert('SubTopic name is required');
        return;
    }

    try {
        console.log('🔨 Creating subtopic:', { name, templateType, description });
        const result = await window.__TAURI__.invoke('create_subtopic', {
            req: {
                topic_id: selectedTopic.id,
                name,
                description: description || null,
                template_type: templateType || null
            }
        });
        console.log('✅ SubTopic created:', result);

        closeModal('subtopic-modal');
        await loadSubTopics(selectedTopic.id);
        showSuccess('SubTopic created successfully');
    } catch (error) {
        console.error('Failed to create subtopic:', error);
        showError('Failed to create subtopic: ' + error);
    }
}

// Scraping functionality
async function startScraping() {
    if (selectedSubTopics.length === 0) {
        alert('Please select at least one subtopic');
        return;
    }

    console.log('Starting scraping for subtopics:', selectedSubTopics);

    const status = document.getElementById('scraping-status');
    const btn = document.getElementById('start-scraping-btn');

    status.textContent = 'Scraping...';
    status.style.background = '#FF9800';
    btn.disabled = true;

    try {
        const result = await window.__TAURI__.invoke('start_scraping', {
            subtopic_ids: selectedSubTopics
        });

        status.textContent = 'Completed';
        status.style.background = '#4CAF50';
        showSuccess(result);

        // Load resources for the first selected subtopic
        if (selectedSubTopics.length > 0) {
            await loadResourceStocks(selectedSubTopics[0]);
        }

    } catch (error) {
        console.error('Scraping failed:', error);
        status.textContent = 'Failed';
        status.style.background = '#f44336';
        showError('Scraping failed: ' + error);
    } finally {
        btn.disabled = false;
    }
}

// Load and display resource stocks
async function loadResourceStocks(subtopicId) {
    try {
        console.log('Loading resource stocks for subtopic:', subtopicId);
        const resources = await window.__TAURI__.invoke('get_resource_stocks', {
            subtopicId: subtopicId
        });
        renderResourceStocks(resources);
    } catch (error) {
        console.error('Failed to load resource stocks:', error);
    }
}

function renderResourceStocks(resources) {
    const resourceList = document.getElementById('resource-list');

    if (resources.length === 0) {
        resourceList.innerHTML = '<div class="empty-state"><p>No resources collected yet</p></div>';
        return;
    }

    resourceList.innerHTML = resources.map(resource => `
        <div class="resource-item">
            <h5>${resource.title || 'Untitled'}</h5>
            <div class="url">${resource.url}</div>
            ${resource.summary ? `<div class="summary">${escapeHtml(resource.summary)}</div>` : ''}
            <div class="status ${resource.status}">${resource.status}</div>
        </div>
    `).join('');
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    console.error('🚨 Error:', message);
    alert('Error: ' + message);
}

function showSuccess(message) {
    console.log('✅ Success:', message);
    alert('Success: ' + message);
}

// Article Generation (placeholder)
async function generateArticle() {
    if (!selectedTopic || selectedSubTopics.length === 0) {
        alert('Please select a topic and subtopics first');
        return;
    }

    const btn = document.getElementById('generate-article-btn');
    btn.disabled = true;
    btn.textContent = '📝 Generating...';

    try {
        // Placeholder for article generation
        await new Promise(resolve => setTimeout(resolve, 2000));

        const articleContent = document.getElementById('article-content');
        articleContent.innerHTML = `
            <h1>${selectedTopic.name}</h1>
            <p><em>Generated article for topic: ${selectedTopic.name}</em></p>
            <p>This is a placeholder for the generated article content. In the future, this will contain AI-generated articles based on the collected resource stocks.</p>
            <h2>Selected SubTopics:</h2>
            <ul>
                ${selectedSubTopics.map(id => {
                    const subtopic = currentSubTopics.find(st => st.id === id);
                    return `<li>${subtopic ? subtopic.name : 'Unknown'}</li>`;
                }).join('')}
            </ul>
        `;

        // Switch to article tab
        switchTab('tab-articles');

        showSuccess('Article generated successfully');
    } catch (error) {
        console.error('Article generation failed:', error);
        showError('Article generation failed: ' + error);
    } finally {
        btn.disabled = false;
        btn.textContent = '📝 Generate Article';
    }
}

// Context Menu Functions
function showContextMenu(event, topicId) {
    event.preventDefault();
    event.stopPropagation();

    contextMenuTarget = topicId;
    contextMenuType = 'topic';

    // 他のアイテムからmenu-activeクラスを削除
    document.querySelectorAll('.hierarchical-item.menu-active').forEach(item => {
        item.classList.remove('menu-active');
    });

    // 現在のアイテムにmenu-activeクラスを追加
    const topicElement = event.currentTarget.closest('.hierarchical-item');
    if (topicElement) {
        topicElement.classList.add('menu-active');
    }

    const contextMenu = document.getElementById('topic-context-menu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;

    adjustContextMenuPosition(contextMenu, event);
}

function showSubTopicContextMenu(event, subtopicId) {
    event.preventDefault();
    event.stopPropagation();

    contextMenuTarget = subtopicId;
    contextMenuType = 'subtopic';

    // 他のアイテムからmenu-activeクラスを削除
    document.querySelectorAll('.hierarchical-item.menu-active').forEach(item => {
        item.classList.remove('menu-active');
    });

    // 現在のアイテムの親Topicにmenu-activeクラスを追加
    const subtopicElement = event.currentTarget;
    const topicElement = subtopicElement.closest('.hierarchical-item');
    if (topicElement) {
        topicElement.classList.add('menu-active');
    }

    const contextMenu = document.getElementById('subtopic-context-menu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;

    adjustContextMenuPosition(contextMenu, event);
}

function adjustContextMenuPosition(contextMenu, event) {
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = `${event.pageX - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = `${event.pageY - rect.height}px`;
    }
}

function hideContextMenu() {
    document.getElementById('topic-context-menu').style.display = 'none';
    document.getElementById('subtopic-context-menu').style.display = 'none';

    // menu-activeクラスを削除
    document.querySelectorAll('.hierarchical-item.menu-active').forEach(item => {
        item.classList.remove('menu-active');
    });

    contextMenuTarget = null;
    contextMenuType = null;
}

// Topic/SubTopic CRUD Functions
async function editTopic() {
    if (!contextMenuTarget) return;

    const topic = currentTopics.find(t => t.id === contextMenuTarget);
    if (!topic) return;

    editingTopicId = contextMenuTarget;
    document.getElementById('edit-topic-name').value = topic.name;
    document.getElementById('edit-topic-description').value = topic.description || '';

    hideContextMenu();
    showModal('edit-topic-modal');
}

async function updateTopic() {
    const name = document.getElementById('edit-topic-name').value.trim();
    const description = document.getElementById('edit-topic-description').value.trim();

    if (!name) {
        alert('Topic name is required');
        return;
    }

    try {
        console.log('🔨 Updating topic:', { id: editingTopicId, name, description });
        const result = await window.__TAURI__.invoke('update_topic', {
            id: editingTopicId,
            req: {
                name,
                description: description || null
            }
        });
        console.log('✅ Topic updated:', result);

        closeModal('edit-topic-modal');
        await loadTopics();
        showSuccess('Topic updated successfully');
    } catch (error) {
        console.error('❌ Failed to update topic:', error);
        showError('Failed to update topic: ' + error);
    }
}

async function deleteTopic() {
    console.log('🔍 deleteTopic called, contextMenuTarget:', contextMenuTarget, 'contextMenuType:', contextMenuType);

    if (!contextMenuTarget) {
        console.log('❌ No contextMenuTarget');
        return;
    }

    // Tauri環境ではconfirmが正常動作しないため、直接削除を実行
    console.log('🔍 Proceeding with topic deletion (confirmation skipped in Tauri)');

    try {
        console.log('🗑️ Deleting topic:', contextMenuTarget);
        const result = await window.__TAURI__.invoke('delete_topic', { id: contextMenuTarget });
        console.log('✅ Topic deleted:', result);

        hideContextMenu();
        await loadTopics();
        showSuccess('Topic deleted successfully');
    } catch (error) {
        console.error('❌ Failed to delete topic:', error);
        showError('Failed to delete topic: ' + error);
    }
}

async function editSubTopic() {
    if (!contextMenuTarget) return;

    const subtopic = currentSubTopics.find(st => st.id === contextMenuTarget);
    if (!subtopic) return;

    editingSubTopicId = contextMenuTarget;
    document.getElementById('edit-subtopic-name').value = subtopic.name;
    document.getElementById('edit-subtopic-type').value = subtopic.template_type || '';
    document.getElementById('edit-subtopic-description').value = subtopic.description || '';

    hideContextMenu();
    showModal('edit-subtopic-modal');
}

async function updateSubTopic() {
    const name = document.getElementById('edit-subtopic-name').value.trim();
    const templateType = document.getElementById('edit-subtopic-type').value;
    const description = document.getElementById('edit-subtopic-description').value.trim();

    if (!name) {
        alert('SubTopic name is required');
        return;
    }

    try {
        console.log('🔨 Updating subtopic:', { id: editingSubTopicId, name, templateType, description });
        const result = await window.__TAURI__.invoke('update_subtopic', {
            id: editingSubTopicId,
            req: {
                topic_id: selectedTopic.id,
                name,
                description: description || null,
                template_type: templateType || null
            }
        });
        console.log('✅ SubTopic updated:', result);

        closeModal('edit-subtopic-modal');
        await loadSubTopicsForHover(selectedTopic.id);
        showSuccess('SubTopic updated successfully');
    } catch (error) {
        console.error('❌ Failed to update subtopic:', error);
        showError('Failed to update subtopic: ' + error);
    }
}

async function deleteSubTopic() {
    console.log('🔍 deleteSubTopic called, contextMenuTarget:', contextMenuTarget, 'contextMenuType:', contextMenuType);

    if (!contextMenuTarget) {
        console.log('❌ No contextMenuTarget');
        return;
    }

    // Tauri環境ではconfirmが正常動作しないため、直接削除を実行
    console.log('🔍 Proceeding with subtopic deletion (confirmation skipped in Tauri)');

    try {
        console.log('🗑️ Deleting subtopic:', contextMenuTarget);
        const result = await window.__TAURI__.invoke('delete_subtopic', { id: contextMenuTarget });
        console.log('✅ SubTopic deleted:', result);

        hideContextMenu();

        // SubTopicを削除した後は、Topicのリストを再読み込み
        await loadTopics();
        showSuccess('SubTopic deleted successfully');
    } catch (error) {
        console.error('❌ Failed to delete subtopic:', error);
        showError('Failed to delete subtopic: ' + error);
    }
}

// Make functions global for onclick handlers
window.selectTopic = selectTopic;
window.toggleSubTopicSelection = toggleSubTopicSelection;
window.closeModal = closeModal;
window.submitTopic = submitTopic;
window.submitSubTopic = submitSubTopic;
window.updateTopic = updateTopic;
window.updateSubTopic = updateSubTopic;
window.deleteTopic = deleteTopic;
window.deleteSubTopic = deleteSubTopic;
window.showContextMenu = showContextMenu;
window.showSubTopicContextMenu = showSubTopicContextMenu;