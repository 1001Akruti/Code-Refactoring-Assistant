document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const codeInput = document.getElementById('codeInput');
    const cleanerCodeDiv = document.getElementById('cleanerCode');
    const designPatternsDiv = document.getElementById('designPatterns');
    const optimizationDiv = document.getElementById('optimization');
    const namingImprovementsDiv = document.getElementById('namingImprovements');

    analyzeBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        
        if (!code) {
            alert('Please paste some code to analyze');
            return;
        }

        // Set analyzing state
        setAnalyzingState();

        try {
            const response = await fetch('http://localhost:8000/refactor', {
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
            
            // Display results
            cleanerCodeDiv.textContent = data.cleaner_code || 'No suggestions';
            designPatternsDiv.textContent = data.design_patterns || 'No suggestions';
            optimizationDiv.textContent = data.optimization || 'No suggestions';
            namingImprovementsDiv.textContent = data.naming_improvements || 'No suggestions';
            
            // Remove analyzing class
            [cleanerCodeDiv, designPatternsDiv, optimizationDiv, namingImprovementsDiv].forEach(div => {
                div.classList.remove('analyzing');
            });
        } catch (error) {
            console.error('Error:', error);
            // Show error in all boxes
            const errorMessage = 'Error: Unable to connect to the refactoring service';
            [cleanerCodeDiv, designPatternsDiv, optimizationDiv, namingImprovementsDiv].forEach(div => {
                div.textContent = errorMessage;
                div.className = 'content error';
            });
        }
    });

    function setAnalyzingState() {
        const divs = [cleanerCodeDiv, designPatternsDiv, optimizationDiv, namingImprovementsDiv];
        divs.forEach(div => {
            div.textContent = 'Analyzing...';
            div.className = 'content analyzing';
        });
    }
});
