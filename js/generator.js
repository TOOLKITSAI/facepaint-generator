document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const generateBtn = document.querySelector('.btn--generate');
    const promptInput = document.getElementById('prompt');
    const categorySelect = document.getElementById('category');
    const styleSelect = document.getElementById('style');
    const complexitySelect = document.getElementById('complexity');
    
    const previewContainer = document.querySelector('.preview-container');
    const previewPlaceholder = document.querySelector('.preview-placeholder');
    const previewResult = document.querySelector('.preview-result');
    const previewLoading = document.querySelector('.preview-loading');
    const resultImage = document.querySelector('.preview-result__image');
    
    const regenerateBtn = document.querySelector('.preview-result__actions .btn:first-child');
    const saveBtn = document.querySelector('.preview-result__actions .btn:last-child');
    
    // Show user guidance on first visit
    showGuidance();
    
    // Generate button click handler
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            // Get user input
            const description = promptInput ? promptInput.value.trim() : '';
            const category = categorySelect ? categorySelect.value : '';
            const style = styleSelect ? styleSelect.value : '';
            const complexity = complexitySelect ? complexitySelect.value : '';
            
            // Validate input
            if (!description) {
                alert('Please describe the face paint design you want');
                return;
            }
            
            // Show loading state
            if (previewPlaceholder) previewPlaceholder.classList.add('hidden');
            if (previewResult) previewResult.classList.add('hidden');
            if (previewLoading) previewLoading.classList.remove('hidden');
            
            // Initialize loading indicator
            updateLoadingState('starting', 10);
            
            try {
                console.log("Sending generation request...");
                // Call generation API
                const response = await fetch('https://facepaint-generator.toolkitsai.workers.dev', {
                    method: 'POST',
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        description,
                        category,
                        style,
                        complexity
                    })
                });
                
                console.log("Received response:", response);
                const data = await response.json();
                console.log("Parsed data:", data);
                
                if (!data.success) {
                    throw new Error(data.error || 'Failed to generate design');
                }
                
                if (!data.id) {
                    throw new Error('No valid prediction ID received');
                }
                
                console.log('Generation task created, ID:', data.id);
                // Start polling for generation status
                pollPredictionStatus(data.id);
                
            } catch (error) {
                console.error('Generation failed:', error);
                handleGenerationError(error);
            }
        });
    }
    
    // Update loading state with progress
    function updateLoadingState(stage, progress = null) {
        const loadingElement = document.querySelector('.preview-loading');
        
        // Create loading text element if it doesn't exist
        let loadingText = loadingElement.querySelector('.loading-text');
        if (!loadingText) {
            loadingText = document.createElement('div');
            loadingText.className = 'loading-text';
            loadingElement.appendChild(loadingText);
        }
        
        // Create progress bar if it doesn't exist
        let progressBar = loadingElement.querySelector('.progress-bar');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.innerHTML = '<div class="progress"></div>';
            loadingElement.appendChild(progressBar);
        }
        
        // Update loading text based on stage
        switch(stage) {
            case 'starting':
                loadingText.textContent = 'Preparing to create your face paint design...';
                break;
            case 'processing':
                loadingText.textContent = 'Creating your beautiful face paint design (20-30 seconds)...';
                break;
            case 'refining':
                loadingText.textContent = 'Refining details to make your design perfect...';
                break;
            default:
                loadingText.textContent = 'Generating...';
        }
        
        // Update progress bar if provided
        if (progress !== null) {
            const progressElement = progressBar.querySelector('.progress');
            progressElement.style.width = `${progress}%`;
        }
    }
    
    // Handle generation errors with suggestions
    function handleGenerationError(error) {
        console.error('Generation failed:', error);
        
        let errorMessage = 'Sorry, we encountered a problem while creating your design.';
        let suggestion = '';
        
        // Provide specific suggestions based on error type
        if (error.message.includes('API')) {
            errorMessage = 'Server Connection Issue';
            suggestion = 'Please try again later. Our service might be temporarily busy.';
        } else if (error.message.includes('valid')) {
            errorMessage = 'Your prompt may need adjustment';
            suggestion = 'Try using a more detailed or different description.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Generation timed out';
            suggestion = 'Please try refreshing the page and generating again.';
        }
        
        // Create error message container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.innerHTML = `
            <h4>${errorMessage}</h4>
            <p>${suggestion}</p>
            <button class="btn btn--small" id="try-again">Try Again</button>
        `;
        
        // Add to preview container
        const previewContainer = document.querySelector('.preview-container');
        if (previewContainer) {
            // Hide loading state
            const loadingElement = document.querySelector('.preview-loading');
            if (loadingElement) loadingElement.classList.add('hidden');
            
            // Remove any existing error messages
            if (document.querySelector('.error-message')) {
                document.querySelector('.error-message').remove();
            }
            
            // Add new error message
            previewContainer.appendChild(errorContainer);
            
            // Try again button handler
            document.getElementById('try-again').addEventListener('click', () => {
                errorContainer.remove();
                document.querySelector('.preview-placeholder').classList.remove('hidden');
            });
        }
    }
    
    // Poll for prediction status with enhanced progress tracking
    function pollPredictionStatus(id) {
        console.log('Starting status check, ID:', id);
        
        // Show initial status
        updateLoadingState('starting');
        let progressPercent = 10;
        
        // Set polling interval
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`https://facepaint-status.toolkitsai.workers.dev?id=${id}`);
                const data = await response.json();
                
                console.log('Status update:', data);
                
                if (!data.success) {
                    clearInterval(pollInterval);
                    throw new Error(data.error || 'Failed to check status');
                }
                
                // Update UI based on status
                switch(data.status) {
                    case 'starting':
                        updateLoadingState('starting', 15);
                        progressPercent = 15;
                        break;
                    case 'processing':
                        // Estimate progress
                        if (progressPercent < 70) {
                            progressPercent += 5;
                        }
                        updateLoadingState('processing', progressPercent);
                        break;
                    case 'succeeded':
                        updateLoadingState('refining', 100);
                        clearInterval(pollInterval);
                        
                        // Get generated image URL
                        const imageUrl = data.output && data.output[0];
                        
                        if (imageUrl && resultImage) {
                            // Preload image
                            const img = new Image();
                            img.onload = function() {
                                resultImage.src = imageUrl;
                                resultImage.alt = 'Generated face paint design';
                                
                                // Show result with fade-in effect
                                if (previewLoading) previewLoading.classList.add('hidden');
                                if (previewResult) {
                                    previewResult.classList.remove('hidden');
                                    previewResult.classList.add('fade-in');
                                }
                                
                                // Save to history
                                saveToHistory({
                                    description: promptInput ? promptInput.value : '',
                                    category: categorySelect ? categorySelect.value : '',
                                    style: styleSelect ? styleSelect.value : '',
                                    complexity: complexitySelect ? complexitySelect.value : '',
                                    imageUrl
                                });
                            };
                            img.src = imageUrl;
                        } else {
                            throw new Error('Unable to get generated image');
                        }
                        break;
                        
                    case 'failed':
                        clearInterval(pollInterval);
                        throw new Error(data.error || 'Generation failed');
                }
                
            } catch (error) {
                console.error('Status check failed:', error);
                clearInterval(pollInterval);
                
                handleGenerationError(error);
            }
        }, 3000); // Check every 3 seconds
    }
    
    // Show guidance popup for first-time users
    function showGuidance() {
        // Only show for first-time visits
        if (!localStorage.getItem('facepaint-guidance-shown')) {
            
            const guidancePopup = document.createElement('div');
            guidancePopup.className = 'guidance-popup';
            guidancePopup.innerHTML = `
                <div class="guidance-content">
                    <h3>Welcome to Face Paint Generator</h3>
                    <p>👋 Here are some tips for best results:</p>
                    <ul>
                        <li>Describe your desired face paint design in detail (e.g., "Sunflower pattern children's face paint")</li>
                        <li>Choose appropriate category and style for more targeted results</li>
                        <li>Generation takes about 30-60 seconds, please be patient</li>
                        <li>You can save designs and view them in your history</li>
                    </ul>
                    <button class="btn btn--primary" id="got-it">Got it!</button>
                </div>
            `;
            
            document.body.appendChild(guidancePopup);
            
            document.getElementById('got-it').addEventListener('click', () => {
                guidancePopup.remove();
                localStorage.setItem('facepaint-guidance-shown', 'true');
            });
        }
    }
    
    // Save to history
    function saveToHistory(item) {
        try {
            const history = JSON.parse(localStorage.getItem('facepainting-history') || '[]');
            
            // Add to beginning of history
            history.unshift({
                ...item,
                timestamp: new Date().toISOString()
            });
            
            // Limit history to 10 items
            const limitedHistory = history.slice(0, 10);
            localStorage.setItem('facepainting-history', JSON.stringify(limitedHistory));
            
            // If Gallery section exists, update display
            updateGallery();
            
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }
    
    // Update Gallery display
    function updateGallery() {
        const galleryGrid = document.getElementById('gallery-grid');
        if (!galleryGrid) return;
        
        try {
            const history = JSON.parse(localStorage.getItem('facepainting-history') || '[]');
            
            // Clear existing content
            galleryGrid.innerHTML = '';
            
            // If history exists, add to Gallery
            if (history.length > 0) {
                history.forEach(item => {
                    const galleryItem = document.createElement('div');
                    galleryItem.className = 'gallery__item';
                    
                    galleryItem.innerHTML = `
                        <div class="gallery__image-container">
                            <img src="${item.imageUrl}" alt="${item.description}" class="gallery__image">
                        </div>
                        <div class="gallery__details">
                            <p class="gallery__description">${item.description}</p>
                            <div class="gallery__tags">
                                ${item.style ? `<span class="gallery__tag">${item.style}</span>` : ''}
                                ${item.complexity ? `<span class="gallery__tag">${item.complexity}</span>` : ''}
                            </div>
                        </div>
                    `;
                    
                    galleryGrid.appendChild(galleryItem);
                });
            }
        } catch (error) {
            console.error('Failed to update Gallery:', error);
        }
    }
    
    // Regenerate button
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => {
            if (generateBtn) generateBtn.click();
        });
    }
    
    // Save button
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!resultImage || !resultImage.src) {
                alert('No image to save');
                return;
            }
            
            try {
                // Get image data
                const response = await fetch(resultImage.src);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                
                // Create download link and trigger click
                const a = document.createElement('a');
                a.href = url;
                a.download = `facepaint-${new Date().getTime()}.png`;
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
                
            } catch (error) {
                console.error('Failed to save image:', error);
                alert('Failed to save image, please try again');
            }
        });
    }
    
    // Update Gallery on initial load
    updateGallery();
});
