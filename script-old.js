/**
 * YouTube Silence Skipper Website Scripts
 */

// Paddle 초기화
let paddleInitialized = false;

function initializePaddle() {
  if (typeof Paddle !== 'undefined' && !paddleInitialized) {
    try {
      Paddle.Environment.set('production');
      Paddle.Initialize({
        token: 'live_3ba5a78d5a0dfd653ea01cf09f7', // public token
        pwCustomer: { }
      });
      
      paddleInitialized = true;
      console.log('Paddle initialized successfully');
      
      // Pro 플랜 업그레이드 버튼에 이벤트 리스너 추가
      setupPaddleCheckout();
      
    } catch (error) {
      console.error('Paddle initialization failed:', error);
    }
  }
}

function setupPaddleCheckout() {
  // Pro 플랜 업그레이드 버튼 찾기
  const upgradeButton = document.querySelector('.btn-pricing.btn-featured');
  
  if (upgradeButton) {
    // 기존 href 제거하고 클릭 이벤트 추가
    upgradeButton.removeAttribute('href');
    upgradeButton.style.cursor = 'pointer';
    
    upgradeButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      if (!paddleInitialized) {
        alert('Payment system is initializing. Please try again in a moment.');
        return;
      }
      
      // Paddle Checkout 열기
      try {
        Paddle.Checkout.open({
          items: [{
            priceId: 'pri_01k2q4bxj662c46peqbp3f2aap',
            quantity: 1
          }],
          settings: {
            // variant: 'one-page',
            displayMode: 'overlay',
            successUrl: 'https://youtube-silenceskipper.com/pro-success.html',
          }
        })
      } catch (error) {
        console.error('Paddle Checkout error:', error);
        alert('Payment system error occurred.');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Paddle 초기화
  initializePaddle();
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        // Offset for fixed header
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Navbar scroll effect
  const navbar = document.querySelector('.navbar');
  
  function updateNavbar() {
    if (window.scrollY > 50) {
      navbar.style.padding = '0.5rem 0';
      navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    } else {
      navbar.style.padding = '1rem 0';
      navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
    }
  }
  
  window.addEventListener('scroll', updateNavbar);
  updateNavbar(); // Initial call
  
  // Toggle switches in settings preview
  document.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', function() {
      this.classList.toggle('active');
    });
  });
  
  // Apply button effect
  const applyBtn = document.querySelector('.apply-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', function() {
      this.textContent = 'Applied!';
      setTimeout(() => {
        this.textContent = 'Apply';
      }, 1500);
    });
  }
  
  // Video placeholder click effect
  const videoPlaceholder = document.querySelector('.video-placeholder');
  if (videoPlaceholder) {
    videoPlaceholder.addEventListener('click', function() {
      this.innerHTML = '<p>Video demo would play here in a real implementation</p>';
      this.style.display = 'flex';
      this.style.alignItems = 'center';
      this.style.justifyContent = 'center';
      this.style.padding = '1rem';
      this.style.textAlign = 'center';
    });
  }
  
  // Simple animation for feature cards
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  
  document.querySelectorAll('.feature-card, .faq-item, .installation-step').forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(item);
  });
});
