document.addEventListener('DOMContentLoaded', () => {
// Configure Require.js to load Monaco Editor from CDN
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});

    // Load Monaco Editor
    require(['vs/editor/editor.main'], function () {
        // Create Monaco Editor instance
        const editor = monaco.editor.create(document.getElementById('editorContainer'), {
            value: '',
            language: 'javascript',
            theme: 'vs-dark',
            lineNumbers: true,
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 10, bottom: 10 }
        });

        // Add placeholder functionality
        const editorContainer = document.getElementById('editorContainer');
        const updatePlaceholder = () => {
            if (editor.getValue().trim() === '') {
                editorContainer.classList.add('placeholder');
            } else {
                editorContainer.classList.remove('placeholder');
            }
        };

        // Initialize placeholder state
        updatePlaceholder();

        // Listen for content changes
        editor.onDidChangeModelContent(updatePlaceholder);

        const analyzeBtn = document.getElementById('analyzeBtn');
        const cleanerCodeDiv = document.getElementById('cleanerCode');
        const designPatternsDiv = document.getElementById('designPatterns');
        const optimizationDiv = document.getElementById('optimization');
        const namingImprovementsDiv = document.getElementById('namingImprovements');
        const emptyState = document.querySelector('.empty-state');
        const loadingState = document.querySelector('.loading-state');
        const editorSection = document.querySelector('.editor-section');

        // Toggle accordion function - only one item active at a time
        window.toggleAccordion = function(header) {
            const item = header.parentElement;
            const isActive = item.classList.contains('active');

            // Close all items
            document.querySelectorAll('.accordion-item').forEach(item => {
                item.classList.remove('active');
            });

            // Open clicked item if it wasn't already active
            if (!isActive) {
                item.classList.add('active');
            }
        };

        analyzeBtn.addEventListener('click', async () => {
            const code = editor.getValue().trim();

            if (!code) {
                alert('Please paste some code to analyze');
                return;
            }

            // Hide empty state, show loading state
            emptyState.style.display = 'none';
            loadingState.classList.add('active');
            loadingState.querySelector('.loading-text').textContent = 'Reading code...';
            analyzeBtn.classList.add('loading');

            try {
                // Simulate loading steps for better UX
                await new Promise(resolve => setTimeout(resolve, 800));
                loadingState.querySelector('.loading-text').textContent = 'Finding improvements...';
                await new Promise(resolve => setTimeout(resolve, 1000));
                loadingState.querySelector('.loading-text').textContent = 'Generating AI response...';
                await new Promise(resolve => setTimeout(resolve, 1200));
                loadingState.querySelector('.loading-text').textContent = 'Almost done...';
                await new Promise(resolve => setTimeout(resolve, 800));

                const response = await fetch('https://code-refactoring-assistant.vercel.app/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                // Hide loading state
                loadingState.classList.remove('active');
                analyzeBtn.classList.remove('loading');

                // Display results with enhanced formatting
                cleanerCodeDiv.innerHTML = formatCleanerCode(data);
                designPatternsDiv.innerHTML = formatDesignPatterns(data);
                optimizationDiv.innerHTML = formatOptimization(data);
                namingImprovementsDiv.innerHTML = formatNamingImprovements(data);

                // Add skeleton loading animation to content initially, then remove
                [cleanerCodeDiv, designPatternsDiv, optimizationDiv, namingImprovementsDiv].forEach(div => {
                    div.classList.add('skeleton');
                    setTimeout(() => {
                        div.classList.remove('skeleton');
                    }, 300);
                });

            } catch (error) {
                console.error('Error:', error);
                // Hide loading state
                loadingState.classList.remove('active');
                analyzeBtn.classList.remove('loading');

                // Show error in all boxes
                const errorMessage = 'Error: Unable to connect to the refactoring service';
                [cleanerCodeDiv, designPatternsDiv, optimizationDiv, namingImprovementsDiv].forEach(div => {
                    div.innerHTML = `<div class="error-message">${errorMessage}</div>`;
                    div.className = 'content error';
                });
            }
        });

        // Update empty state visibility based on editor content
        const checkEmptyState = () => {
            if (editor.getValue().trim() === '') {
                emptyState.style.display = 'block';
                editorSection.style.opacity = '0.7';
            } else {
                emptyState.style.display = 'none';
                editorSection.style.opacity = '1';
            }
        };

        // Initial check
        checkEmptyState();

        // Listen for content changes to toggle empty state
        editor.onDidChangeModelContent(checkEmptyState);
    });
});

// Format cleaner code as syntax highlighted block
function formatCleanerCode(data) {
    if (!data || !data.cleaner_code || !data.cleaner_code.code || data.cleaner_code.code.trim() === '') {
        return '<div class="empty-result">No suggestions for cleaner code</div>';
    }
    return `<pre><code class="language-${data.language || 'javascript'}">${escapeHtml(data.cleaner_code.code)}</code></pre>`;
}

// Format design patterns as beautiful cards
function formatDesignPatterns(data) {
    if (!data || !data.design_patterns || !data.design_patterns.applicable || !data.design_patterns.patterns || data.design_patterns.patterns.length === 0) {
        return '<div class="empty-result">No design pattern suggestions</div>';
    }

    const patternsArray = data.design_patterns.patterns;

    return patternsArray.map(pattern => {
        // Extract title and description if possible
        let title = pattern.name || 'Design Pattern';
        let description = '';

        if (pattern.why && pattern.where) {
            description = `<strong>Why:</strong> ${escapeHtml(pattern.why)}<br><strong>Where:</strong> ${escapeHtml(pattern.where)}`;
        } else if (pattern.why) {
            description = `<strong>Why:</strong> ${escapeHtml(pattern.why)}`;
        } else if (pattern.where) {
            description = `<strong>Where:</strong> ${escapeHtml(pattern.where)}`;
        }

        let benefitsHtml = '';
        if (pattern.benefits && pattern.benefits.length > 0) {
            benefitsHtml = '<strong>Benefits:</strong><br>' + pattern.benefits.map(b => `&bull; ${escapeHtml(b)}`).join('<br>');
        }

        let exampleHtml = '';
        if (pattern.example && pattern.example.trim() !== '') {
            exampleHtml = `<strong>Example:</strong><br><pre><code class="language-${data.language || 'javascript'}">${escapeHtml(pattern.example)}</code></pre>`;
        }

        return `
            <div class="design-pattern-card">
                <h4>${escapeHtml(title)}</h4>
                ${description ? `<p>${description}</p>` : ''}
                ${benefitsHtml ? `<p>${benefitsHtml}</p>` : ''}
                ${exampleHtml ? `<p>${exampleHtml}</p>` : ''}
            </div>
        `;
    }).join('');
}

// Format optimization as checklist
function formatOptimization(data) {
    if (!data || !data.optimization || !data.optimization.issues || data.optimization.issues.length === 0) {
        return '<div class="empty-result">No optimization suggestions</div>';
    }

    const items = data.optimization.issues;

    return items.map(item => {
        // Check if item looks like it has a checkbox or status
        let checked = false;
        let text = item.title || 'Optimization';

        // Create detailed optimization display
        let details = '';
        if (item.before && item.after) {
            details = `
                <div class="optimization-details">
                    <div class="before-after">
                        <div class="before-box">
                            <strong>Before:</strong><br>
                            <pre><code class="language-${data.language || 'javascript'}">${escapeHtml(item.before)}</code></pre>
                        </div>
                        <div class="after-box">
                            <strong>After:</strong><br>
                            <pre><code class="language-${data.language || 'javascript'}">${escapeHtml(item.after)}</code></pre>
                        </div>
                    </div>
                    ${item.reason ? `<p><strong>Reason:</strong> ${escapeHtml(item.reason)}</p>` : ''}
                    ${item.complexity_before && item.complexity_after ? `<p><strong>Complexity:</strong> ${escapeHtml(item.complexity_before)} → ${escapeHtml(item.complexity_after)}</p>` : ''}
                </div>
            `;
        }

        return `
            <div class="optimization-item">
                <div class="optimization-icon">âœ“</div>
                <div class="optimization-text">
                    <strong>${escapeHtml(text)}</strong> (Line ${item.line || 'N/A'})
                    ${details}
                </div>
            </div>
        `;
    }).join('');
}

// Format naming improvements as professional table
function formatNamingImprovements(data) {
    if (!data || !data.naming_improvements || !data.naming_improvements.issues || data.naming_improvements.issues.length === 0) {
        // Also check diagnostics for naming-related issues
        const namingDiagnostics = data && data.diagnostics ? data.diagnostics.filter(d => 
            d.message && (d.message.toLowerCase().includes('name') || d.message.toLowerCase().includes('variable'))) : [];
        if (!namingDiagnostics || namingDiagnostics.length === 0) {
            return '<div class="empty-result">No naming improvement suggestions</div>';
        }
        // If we have naming diagnostics, use those
        const rows = namingDiagnostics.map(d => ({
            old: '',
            new: d.suggestion || '',
            reason: d.message
        }));
        return rows.map(row => {
            const reasonText = row.reason ? `<div class="badge">${escapeHtml(row.reason)}</div>` : '';
            return `
                <div class="naming-row">
                    <div class="old-name">${escapeHtml(row.old) || 'N/A'}</div>
                    <div class="arrow">â†’</div>
                    <div class="new-name">${escapeHtml(row.new)}</div>
                    ${reasonText}
                </div>
            `;
        }).join('');
    }

    const rows = data.naming_improvements.issues;

    return rows.map(row => {
        const reasonText = row.reason ? `<div class="badge">${escapeHtml(row.reason)}</div>` : '';
        return `
            <div class="naming-row">
                <div class="old-name">${escapeHtml(row.old_name || '')}</div>
                <div class="arrow">â†’</div>
                <div class="new-name">${escapeHtml(row.new_name || '')}</div>
                ${reasonText}
                ${row.line !== undefined ? `<div class="line-number">Line ${row.line}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Format diagnostics
function formatDiagnostics(data) {
    if (!data || !data.diagnostics || data.diagnostics.length === 0) {
        return '';
    }

    const diagnostics = data.diagnostics;

    return diagnostics.map(diag => {
        const severityClass = `severity-${diag.severity || 'info'}`;
        return `
            <div class="diagnostic-item ${severityClass}">
                <div class="diagnostic-icon">
                    ${diag.severity === 'error' ? 'ðŸ”¥' : diag.severity === 'warning' ? 'âš¡ï¸' : 'â„«'}
                </div>
                <div class="diagnostic-content">
                    <div class="diagnostic-message">
                        ${diag.line !== undefined ? `<strong>Line ${diag.line}:</strong> ` : ''}${escapeHtml(diag.message)}
                    </div>
                    ${diag.suggestion ? `<div class="diagnostic-suggestion"><strong>Suggestion:</strong> ${escapeHtml(diag.suggestion)}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    const str = String(text);
    const map = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#039;'
    };

    return str.replace(/[&<>"']/g, m => map[m]);
}
