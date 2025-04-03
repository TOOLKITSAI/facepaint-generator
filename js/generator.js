document.addEventListener('DOMContentLoaded', () => {
    // Modify the timeout to ensure proper loading of all elements before showing the guidance
    setTimeout(() => {
        showGuidance();
    }, 500);
    
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
    
    // Initialize custom options
    initializeCustomOptions();
    
    // Generate button click handler
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            // Get user input
            const description = promptInput ? promptInput.value.trim() : '';
            const category = categorySelect ? categorySelect.value : '';
            const style = styleSelect ? styleSelect.value : '';
            const complexity = complexitySelect ? complexitySelect.value : '';
            
            // Get custom options
            const backgroundColor = document.getElementById('background-color') ? document.getElementById('background-color').value : '';
            const faceArea = document.querySelector('.face-area__option.selected') ? document.querySelector('.face-area__option.selected').dataset.area : 'full';
            
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
                        complexity,
                        backgroundColor,
                        faceArea
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
            // Create a container that will be positioned fixed
            const guidancePopup = document.createElement('div');
            guidancePopup.className = 'guidance-popup';
            
            // Set inline styles to ensure proper positioning
            guidancePopup.style.position = 'fixed';
            guidancePopup.style.top = '0';
            guidancePopup.style.left = '0';
            guidancePopup.style.right = '0';
            guidancePopup.style.bottom = '0';
            guidancePopup.style.zIndex = '10000';
            guidancePopup.style.display = 'flex';
            guidancePopup.style.alignItems = 'center';
            guidancePopup.style.justifyContent = 'center';
            
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
            
            // Directly append to body to avoid any DOM positioning issues
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
    
    // Initialize custom options section
    function initializeCustomOptions() {
        // Create custom options container
        const customOptionsContainer = document.createElement('div');
        customOptionsContainer.className = 'custom-options';
        
        // Create custom options title with toggle
        const optionsTitle = document.createElement('div');
        optionsTitle.className = 'custom-options__title';
        optionsTitle.innerHTML = 'Advanced Options <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
        
        // Create options content container
        const optionsContent = document.createElement('div');
        optionsContent.className = 'custom-options__content';
        
        // Background color picker
        const colorPicker = document.createElement('div');
        colorPicker.className = 'color-picker';
        colorPicker.innerHTML = `
            <label class="color-picker__label" for="background-color">Background Color</label>
            <input type="color" id="background-color" class="color-picker__input" value="#FFFFFF">
        `;
        
        // Face area selection
        const faceArea = document.createElement('div');
        faceArea.className = 'face-area';
        faceArea.innerHTML = `
            <div class="face-area__label">Face Area</div>
            <div class="face-area__options">
                <div class="face-area__option selected" data-area="full">Full Face</div>
                <div class="face-area__option" data-area="eyes">Eyes Only</div>
                <div class="face-area__option" data-area="cheeks">Cheeks</div>
                <div class="face-area__option" data-area="forehead">Forehead</div>
            </div>
        `;
        
        // Add elements to DOM
        optionsContent.appendChild(colorPicker);
        optionsContent.appendChild(faceArea);
        customOptionsContainer.appendChild(optionsTitle);
        customOptionsContainer.appendChild(optionsContent);
        
        // Find where to insert custom options
        const generatorInput = document.querySelector('.generator__input');
        if (generatorInput) {
            // Insert before the generate button
            const generateBtn = generatorInput.querySelector('.btn--generate');
            if (generateBtn) {
                generatorInput.insertBefore(customOptionsContainer, generateBtn);
            } else {
                generatorInput.appendChild(customOptionsContainer);
            }
        }
        
        // Add toggle functionality
        optionsTitle.addEventListener('click', () => {
            optionsTitle.classList.toggle('expanded');
            optionsContent.classList.toggle('expanded');
        });
        
        // Add face area selection functionality
        const faceAreaOptions = document.querySelectorAll('.face-area__option');
        faceAreaOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                faceAreaOptions.forEach(opt => opt.classList.remove('selected'));
                // Add selected class to clicked option
                option.classList.add('selected');
            });
        });
    }
    
    // Add social sharing functionality
    function addSocialSharing() {
        // Create social sharing container
        const socialShareContainer = document.createElement('div');
        socialShareContainer.className = 'social-share';
        
        // Create sharing buttons
        socialShareContainer.innerHTML = `
            <button class="social-share__button social-share__button--facebook" title="Share on Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z"></path></svg>
            </button>
            <button class="social-share__button social-share__button--twitter" title="Share on Twitter">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.162 5.65593C21.3986 5.99362 20.589 6.2154 19.76 6.31393C20.6337 5.79136 21.2877 4.96894 21.6 3.99993C20.78 4.48793 19.881 4.82993 18.944 5.01493C18.3146 4.34151 17.4804 3.89489 16.5709 3.74451C15.6615 3.59413 14.7279 3.74842 13.9153 4.18338C13.1026 4.61834 12.4564 5.30961 12.0771 6.14972C11.6978 6.98983 11.6067 7.93171 11.818 8.82893C10.1551 8.74558 8.52832 8.31345 7.04328 7.56059C5.55823 6.80773 4.24812 5.75097 3.19799 4.45893C2.82628 5.09738 2.63095 5.82315 2.63199 6.56193C2.63199 8.01193 3.36999 9.29293 4.49199 10.0429C3.828 10.022 3.17862 9.84271 2.59799 9.51993V9.57193C2.59819 10.5376 2.93236 11.4735 3.54384 12.221C4.15532 12.9684 5.00647 13.4814 5.95299 13.6729C5.33661 13.84 4.6903 13.8646 4.06299 13.7449C4.32986 14.5762 4.85 15.3031 5.55058 15.824C6.25117 16.345 7.09712 16.6337 7.96999 16.6499C7.10247 17.3313 6.10917 17.8349 5.04687 18.1321C3.98458 18.4293 2.87412 18.5142 1.77899 18.3819C3.69069 19.6114 5.91609 20.2641 8.18899 20.2619C15.882 20.2619 20.089 13.8889 20.089 8.36193C20.089 8.18193 20.084 7.99993 20.076 7.82193C20.8949 7.23009 21.6016 6.49695 22.163 5.65693L22.162 5.65593Z"></path></svg>
            </button>
            <button class="social-share__button social-share__button--pinterest" title="Share on Pinterest">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12.8607 15.1017C11.8881 15.0104 11.4315 14.5781 10.6089 14.1623C10.1245 16.2367 9.55752 18.2248 8.01437 19.4311C7.57908 16.926 8.58307 15.0396 9.06645 13.0208C8.14957 11.8803 9.05969 9.5401 10.5766 10.191C12.4353 10.9735 9.22652 14.6538 11.7561 15.1585C14.3891 15.6823 15.4384 11.1412 13.8388 9.51317C11.4832 7.11922 7.12261 9.06469 7.66346 12.478C7.79933 13.2906 8.61671 13.5302 8.00962 14.6388C6.48686 14.3057 6.01353 13.146 6.06628 11.6149C6.15055 9.17092 8.30177 7.45482 10.4297 7.21398C13.1344 6.9072 15.6544 8.20387 15.9758 10.7487C16.3389 13.6758 14.7389 16.8037 12.8607 15.1017Z"></path></svg>
            </button>
            <button class="social-share__button social-share__button--email" title="Share via Email">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM20 7.238L12.072 14.338L4 7.216V19H20V7.238ZM4.511 5L12.061 11.662L19.502 5H4.511Z"></path></svg>
            </button>
        `;
        
        // Add click event listeners to buttons
        const facebookBtn = socialShareContainer.querySelector('.social-share__button--facebook');
        const twitterBtn = socialShareContainer.querySelector('.social-share__button--twitter');
        const pinterestBtn = socialShareContainer.querySelector('.social-share__button--pinterest');
        const emailBtn = socialShareContainer.querySelector('.social-share__button--email');
        
        if (facebookBtn) {
            facebookBtn.addEventListener('click', () => shareOnFacebook());
        }
        
        if (twitterBtn) {
            twitterBtn.addEventListener('click', () => shareOnTwitter());
        }
        
        if (pinterestBtn) {
            pinterestBtn.addEventListener('click', () => shareOnPinterest());
        }
        
        if (emailBtn) {
            emailBtn.addEventListener('click', () => shareViaEmail());
        }
        
        // Find where to insert social share buttons (after the existing action buttons)
        const previewActions = document.querySelector('.preview-result__actions');
        if (previewActions) {
            previewActions.appendChild(socialShareContainer);
        }
    }
    
    // Share on Facebook
    function shareOnFacebook() {
        if (!resultImage || !resultImage.src) {
            alert('No image to share. Please generate a design first.');
            return;
        }
        
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent('Check out this amazing face paint design!');
        
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${title}`, '_blank');
    }
    
    // Share on Twitter
    function shareOnTwitter() {
        if (!resultImage || !resultImage.src) {
            alert('No image to share. Please generate a design first.');
            return;
        }
        
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent('Check out this amazing face paint design I created! #FacePaintGenerator');
        
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    }
    
    // Share on Pinterest
    function shareOnPinterest() {
        if (!resultImage || !resultImage.src) {
            alert('No image to share. Please generate a design first.');
            return;
        }
        
        const url = encodeURIComponent(window.location.href);
        const media = encodeURIComponent(resultImage.src);
        const description = encodeURIComponent('Amazing face paint design created with Face Paint Generator');
        
        window.open(`https://pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${description}`, '_blank');
    }
    
    // Share via Email
    function shareViaEmail() {
        if (!resultImage || !resultImage.src) {
            alert('No image to share. Please generate a design first.');
            return;
        }
        
        const subject = encodeURIComponent('Check out this amazing face paint design!');
        const body = encodeURIComponent('I created this face paint design using the Face Paint Generator tool. Check it out: ' + window.location.href);
        
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
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
    
    // Add social sharing buttons when an image is successfully generated
    const originalPollPredictionStatus = pollPredictionStatus;
    // Override to add social sharing buttons
    window.pollPredictionStatus = function(id) {
        originalPollPredictionStatus(id);
        
        // We'll add a custom hook to add social sharing after the image is loaded
        const originalOnload = Image.prototype.onload;
        Image.prototype.onload = function() {
            if (originalOnload) originalOnload.call(this);
            
            // Remove any existing social share container
            const existingShare = document.querySelector('.social-share');
            if (existingShare) existingShare.remove();
            
            // Add social sharing
            setTimeout(() => {
                addSocialSharing();
            }, 100);
        };
    };
    
    // Update Gallery on initial load
    updateGallery();
});
