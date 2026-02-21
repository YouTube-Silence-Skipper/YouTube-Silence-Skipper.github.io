/**
 * Browser Detection and Dynamic Store Link Update
 * This script updates the download links and text based on the user's browser.
 */

document.addEventListener('DOMContentLoaded', function() {
  updateBrowserLinks();
});

function updateBrowserLinks() {
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

  // 1. Hero 버튼 (있을 경우에만 실행)
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

  // 2. Pricing 버튼 (있을 경우에만 실행)
  if (pricingBtn) {
    pricingBtn.href = storeUrl;
  }

  // 3. Footer 링크 (있을 경우에만 실행)
  if (footerStoreLink) {
    footerStoreLink.href = storeUrl;
  }
}
