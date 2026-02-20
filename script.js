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
            // priceId: 'pri_01k2q4bxj662c46peqbp3f2aap', -- original price
            priceId: 'pri_01kch9pkfgcgmaxy18kv63k86t',
            quantity: 1
          }],
          settings: {
            // variant: 'one-page',
            displayMode: 'overlay',
            successUrl: 'https://youtube-silenceskipper.com/activate-pro.html?email={customer.email}',
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
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
  // 브라우저 감지 및 버튼 문구 변경
  updateHeroButtonText();

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

function updateHeroButtonText() {
  const heroButton = document.querySelector('.hero-buttons .btn-primary');
  const pricingBtn = document.querySelector('.pricing-card .plan-btn');
  const footerStoreLink = document.querySelector('.footer-links a[href*="chromewebstore"]');
  
  const userAgent = navigator.userAgent.toLowerCase();
  let browserName = '';
  
  const STORES = {
    chrome: 'https://chromewebstore.google.com/detail/youtube-silence-skipper/ijlnjklmlhhfodgfpidpnccipnodohgl',
    edge: 'https://microsoftedge.microsoft.com/addons/detail/youtube-silence-skipper/mapnepjdljlbflbbejcioffofefdcdbl',
    whale: 'https://store.whale.naver.com/detail/epkmhiejgnefgegggoneipgmlnbbgdji'
  };

  let storeUrl = STORES.chrome;

  // 브라우저 감지 로직
  if (userAgent.includes('whale')) {
    browserName = 'Whale';
    storeUrl = STORES.whale;
  } else if (userAgent.includes('edg/')) {
    browserName = 'Edge';
    storeUrl = STORES.edge;
  } else if (userAgent.includes('opr/') || userAgent.includes('opera')) {
    browserName = 'Opera';
  } else if (userAgent.includes('firefox')) {
    browserName = 'Firefox';
  } else if (userAgent.includes('duckduckgo')) {
    browserName = 'DuckDuckGo';
  } else if (userAgent.includes('chrome')) {
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
      browserName = 'Brave';
    } else {
      browserName = 'Chrome';
    }
  }

  // Hero 버튼 텍스트 변경
  if (heroButton && browserName) {
    const icon = heroButton.querySelector('i');
    heroButton.innerHTML = '';
    if (icon) {
      heroButton.appendChild(icon);
      heroButton.innerHTML += ` Add to ${browserName} Free`;
    } else {
      heroButton.textContent = `Add to ${browserName} Free`;
    }
  }

  // Pricing 버튼 링크 변경
  if (pricingBtn) {
    pricingBtn.href = storeUrl;
  }

  // Footer 링크 변경
  if (footerStoreLink) {
    footerStoreLink.href = storeUrl;
  }
}