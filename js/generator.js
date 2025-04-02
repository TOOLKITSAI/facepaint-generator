document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
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
    
    // 点击生成按钮时的处理
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            // 获取用户输入
            const description = promptInput ? promptInput.value.trim() : '';
            const category = categorySelect ? categorySelect.value : '';
            const style = styleSelect ? styleSelect.value : '';
            const complexity = complexitySelect ? complexitySelect.value : '';
            
            // 验证输入
            if (!description) {
                alert('请描述你想要的面部彩绘设计');
                return;
            }
            
            // 显示加载状态
            if (previewPlaceholder) previewPlaceholder.classList.add('hidden');
            if (previewResult) previewResult.classList.add('hidden');
            if (previewLoading) previewLoading.classList.remove('hidden');
            
            try {
                // 调用生成API
                const response = await fetch('https://facepaint-generator.toolkitsai.workers.dev', {
                    method: 'POST',
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
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || '生成请求失败');
                }
                
                console.log('生成任务已创建:', data);
                
                // 开始轮询检查生成状态
                const predictionId = data.id;
                pollPredictionStatus(predictionId);
                
            } catch (error) {
                console.error('生成失败:', error);
                alert(`生成失败: ${error.message}`);
                
                // 恢复到占位符状态
                if (previewPlaceholder) previewPlaceholder.classList.remove('hidden');
                if (previewLoading) previewLoading.classList.add('hidden');
            }
        });
    }
    
    // 轮询检查生成状态
    function pollPredictionStatus(id) {
        console.log('开始检查状态，ID:', id);
        
        // 设置轮询间隔
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`https://facepaint-status.toolkitsai.workers.dev?id=${id}`);
                const data = await response.json();
                
                console.log('状态更新:', data);
                
                if (!data.success) {
                    clearInterval(pollInterval);
                    throw new Error(data.error || '检查状态失败');
                }
                
                // 根据状态更新UI
                if (data.status === 'succeeded') {
                    clearInterval(pollInterval);
                    
                    // 获取生成的图像URL
                    const imageUrl = data.output && data.output[0];
                    
                    if (imageUrl && resultImage) {
                        resultImage.src = imageUrl;
                        resultImage.alt = '生成的面部彩绘设计';
                        
                        if (previewLoading) previewLoading.classList.add('hidden');
                        if (previewResult) previewResult.classList.remove('hidden');
                        
                        // 保存到历史记录
                        saveToHistory({
                            description: promptInput ? promptInput.value : '',
                            category: categorySelect ? categorySelect.value : '',
                            style: styleSelect ? styleSelect.value : '',
                            complexity: complexitySelect ? complexitySelect.value : '',
                            imageUrl
                        });
                    } else {
                        throw new Error('无法获取生成的图像');
                    }
                    
                } else if (data.status === 'failed') {
                    clearInterval(pollInterval);
                    throw new Error(data.error || '生成失败');
                }
                // 如果是其他状态(processing, starting)，继续轮询
                
            } catch (error) {
                console.error('检查状态失败:', error);
                clearInterval(pollInterval);
                
                if (previewPlaceholder) previewPlaceholder.classList.remove('hidden');
                if (previewLoading) previewLoading.classList.add('hidden');
                
                alert(`生成失败: ${error.message}`);
            }
        }, 3000); // 每3秒检查一次
    }
    
    // 保存到历史记录
    function saveToHistory(item) {
        try {
            const history = JSON.parse(localStorage.getItem('facepainting-history') || '[]');
            
            // 添加到历史记录的前面
            history.unshift({
                ...item,
                timestamp: new Date().toISOString()
            });
            
            // 限制历史记录数量为10个
            const limitedHistory = history.slice(0, 10);
            localStorage.setItem('facepainting-history', JSON.stringify(limitedHistory));
            
            // 如果有Gallery部分，更新显示
            updateGallery();
            
        } catch (error) {
            console.error('保存历史记录失败:', error);
        }
    }
    
    // 更新Gallery显示
    function updateGallery() {
        const galleryGrid = document.getElementById('gallery-grid');
        if (!galleryGrid) return;
        
        try {
            const history = JSON.parse(localStorage.getItem('facepainting-history') || '[]');
            
            // 清空现有内容
            galleryGrid.innerHTML = '';
            
            // 如果有历史记录，添加到Gallery
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
            console.error('更新Gallery失败:', error);
        }
    }
    
    // 重新生成按钮
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => {
            if (generateBtn) generateBtn.click();
        });
    }
    
    // 保存按钮
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!resultImage || !resultImage.src) {
                alert('没有可保存的图像');
                return;
            }
            
            try {
                // 获取图像数据
                const response = await fetch(resultImage.src);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                
                // 创建下载链接并触发点击
                const a = document.createElement('a');
                a.href = url;
                a.download = `facepaint-${new Date().getTime()}.png`;
                document.body.appendChild(a);
                a.click();
                
                // 清理
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
                
            } catch (error) {
                console.error('保存图像失败:', error);
                alert('保存图像失败，请重试');
            }
        });
    }
    
    // 初始加载时更新Gallery
    updateGallery();
});
