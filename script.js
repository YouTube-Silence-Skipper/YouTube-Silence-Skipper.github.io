/**
 * YouTube Silence Skipper - Website JavaScript
 * Handles interactive elements and animations
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize FAQ accordion functionality
    initFaqAccordion();
    
    // Generate FAQ structured data for SEO
    generateFaqStructuredData();
});

/**
 * Initialize FAQ accordion functionality
 * Toggles the active class on FAQ items when clicked
 */
function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Toggle active class on the clicked item
            item.classList.toggle('active');
            
            // Close other items (optional - for accordion behavior)
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
        });
    });
}

/**
 * Smooth scroll to anchor links
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

/**
 * Add animation on scroll
 * Adds a 'visible' class to elements as they enter the viewport
 */
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.feature-card, .workflow-step, .installation-step');
    
    // Check if element is in viewport
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.85 &&
            rect.bottom >= 0
        );
    }
    
    // Add visible class to elements in viewport
    function checkVisibility() {
        animatedElements.forEach(element => {
            if (isInViewport(element) && !element.classList.contains('visible')) {
                element.classList.add('visible');
            }
        });
    }
    
    // Initial check
    checkVisibility();
    
    // Check on scroll
    window.addEventListener('scroll', checkVisibility);
});

/**
 * Generate FAQ structured data for SEO
 * Creates JSON-LD structured data for FAQs
 */
function generateFaqStructuredData() {
    const faqItems = document.querySelectorAll('.faq-item');
    const faqData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": []
    };
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question h3').textContent;
        const answer = item.querySelector('.faq-answer p').textContent;
        
        faqData.mainEntity.push({
            "@type": "Question",
            "name": question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": answer
            }
        });
    });
    
    // Create the script element
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(faqData);
    
    // Append to the document
    document.head.appendChild(script);
}

/**
 * Performance optimization
 * Lazy loads images and defers non-critical resources
 */
document.addEventListener('DOMContentLoaded', function() {
    // Add lazy loading to all images that don't already have it
    document.querySelectorAll('img:not([loading])').forEach(img => {
        img.setAttribute('loading', 'lazy');
    });
    
    // Prefetch important pages
    const prefetchLink = document.createElement('link');
    prefetchLink.rel = 'dns-prefetch';
    prefetchLink.href = 'https://www.youtube.com';
    document.head.appendChild(prefetchLink);
});
