/**
 * YouTube Silence Skipper Website Scripts
 */

// Paddle 초기화
let paddleInitialized = false;

function setupPaddleCheckout() {
  // Pro 플랜 업그레이드 버튼 찾기
  const upgradeButton = document.querySelector('.plan-btn.plan-pro-btn');

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

document.addEventListener('DOMContentLoaded', function() {
  // Paddle 초기화
  initializePaddle();
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Add navbar background on scroll
window.addEventListener('scroll', function() {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.style.background = 'rgba(15, 15, 15, 0.98)';
  } else {
    navbar.style.background = 'rgba(15, 15, 15, 0.95)';
  }
});

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener('click', function() {
      mobileMenu.classList.toggle('active');
      
      // 아이콘 변경
      const icon = mobileMenuToggle.querySelector('i');
      if (mobileMenu.classList.contains('active')) {
        icon.className = 'fas fa-times';
      } else {
        icon.className = 'fas fa-bars';
      }
    });
    
    // 모바일 메뉴 링크 클릭 시 메뉴 닫기
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        mobileMenu.classList.remove('active');
        mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
      });
    });
  }
});