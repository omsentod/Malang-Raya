(function() {
    const mask = document.getElementById('preloader-mask');
    const pctText = document.getElementById('preloader-pct');
    const preloader = document.getElementById('global-preloader');
    
    let progress = 0;
    let isLoaded = false;
    
    // Listen to window load event
    window.addEventListener('load', () => {
        isLoaded = true;
    });

    // Safety timeout to prevent infinite hangs (in case load event fires too late)
    setTimeout(() => {
        isLoaded = true;
    }, 1500);

    function updateProgress() {
        if (progress < 85) {
            // Smooth increment in the beginning
            progress += Math.floor(Math.random() * 4) + 2;
            if (progress > 85) progress = 85;
        } else if (isLoaded) {
            // Finish quickly once resources are fully loaded
            progress += Math.floor(Math.random() * 12) + 6;
            if (progress >= 100) {
                progress = 100;
            }
        } else {
            // Creep up slowly while waiting for the load event
            if (progress < 99) {
                progress += 0.25;
            }
        }

        // Update DOM element visual states
        if (mask) mask.style.height = progress + '%';
        if (pctText) pctText.textContent = Math.floor(progress) + '%';

        if (progress < 100) {
            requestAnimationFrame(() => {
                setTimeout(updateProgress, 30);
            });
        } else {
            // Once 100% is reached, trigger fade-out transition
            setTimeout(() => {
                if (preloader) {
                    preloader.classList.add('fade-out');
                    // Remove from DOM to release resources and restore pointer events
                    setTimeout(() => {
                        preloader.remove();
                    }, 500);
                }
            }, 200);
        }
    }

    // Initialize progress loops
    updateProgress();
})();
