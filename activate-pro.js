const API_BASE_URL = 'https://payment.youtube-silenceskipper.com';

// URL 파라미터에서 이메일 자동 입력 (Paddle에서 리디렉션 시)
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('email')) {
    document.getElementById('email').value = decodeURIComponent(urlParams.get('email'));
  }
});

// 폼 제출 핸들러
document.getElementById('activateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const subscriptionId = document.getElementById('subscriptionId').value.trim();
  const statusDiv = document.getElementById('status');
  const activateBtn = document.getElementById('activateBtn');
  const emailInput = document.getElementById('email');
  const subIdInput = document.getElementById('subscriptionId');
  
  // UI 업데이트 - 로딩 상태
  statusDiv.className = 'status loading';
  statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting activation from server...';
  activateBtn.disabled = true;
  emailInput.disabled = true;
  subIdInput.disabled = true;
  
  try {
    // Step 1: 서버에 초기 활성화 요청
    console.log('[YSS Activate] Requesting activation:', { email, subscriptionId });
    
    const response = await fetch(`${API_BASE_URL}/api/v4/activate-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        subscription_id: subscriptionId
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to activate subscription');
    }
    
    console.log('[YSS Activate] Server response:', data);
    
    // Step 2: DOM에 구독 데이터 저장 (Extension이 읽어갈 수 있도록)
    statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticated! Now waiting for extension<span id="loading-dots">.</span>';
    
    // "..." 애니메이션 시작
    startLoadingAnimation();
    
    // 기존 컨테이너가 있으면 제거 (중복 방지)
    const existingContainer = document.getElementById('yss-activation-data');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    const tokenContainer = document.createElement('div');
    tokenContainer.id = 'yss-activation-data';
    tokenContainer.setAttribute('data-activated', 'true');
    tokenContainer.setAttribute('data-subscription', JSON.stringify(data));
    tokenContainer.setAttribute('data-picked-up', 'false');
    tokenContainer.style.display = 'none';
    document.body.appendChild(tokenContainer);
    
    console.log('[YSS Activate] Subscription data stored in DOM');
    
    // Step 3: Extension이 데이터를 가져갈 때까지 대기 (polling)
    waitForExtensionPickup();
    
  } catch (error) {
    console.error('[YSS Activate] Error:', error);
    
    statusDiv.className = 'status error';
    
    // 에러 타입별 메시지
    let errorMessage = '';
    if (error.message.includes('Invalid email or subscription ID')) {
      errorMessage = `
        <h3><i class="fas fa-exclamation-triangle"></i> Invalid Credentials</h3>
        <p>The email or subscription ID you entered doesn't match our records.</p>
        <p><strong>Please check:</strong></p>
        <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
          <li>Email matches your Paddle payment email</li>
          <li>Subscription ID starts with "sub_" and is copied correctly</li>
          <li>Check your Paddle confirmation email for the correct details</li>
        </ul>
      `;
    } else if (error.message.includes('Subscription is')) {
      errorMessage = `
        <h3><i class="fas fa-ban"></i> Subscription Not Active</h3>
        <p>${error.message}</p>
        <p>Please renew your subscription or contact support.</p>
      `;
    } else if (error.message.includes('Invalid') && error.message.includes('format')) {
      errorMessage = `
        <h3><i class="fas fa-exclamation-circle"></i> Invalid Format</h3>
        <p>${error.message}</p>
        <p>Please check your input and try again.</p>
      `;
    } else if (error.message.includes('fetch')) {
      errorMessage = `
        <h3><i class="fas fa-wifi"></i> Network Error</h3>
        <p>Failed to connect to the server. Please check your internet connection and try again.</p>
      `;
    } else {
      errorMessage = `
        <h3><i class="fas fa-times-circle"></i> Activation Failed</h3>
        <p>${error.message}</p>
        <p>Please try again or contact support if the problem persists.</p>
      `;
    }
    
    statusDiv.innerHTML = errorMessage;
    
    // Re-enable form
    activateBtn.disabled = false;
    emailInput.disabled = false;
    subIdInput.disabled = false;
  }
});

// 로딩 애니메이션 interval ID 저장
let loadingAnimationInterval = null;

/**
 * "..." 로딩 애니메이션 시작
 */
function startLoadingAnimation() {
  let dotCount = 1;
  loadingAnimationInterval = setInterval(() => {
    const dotsElement = document.getElementById('loading-dots');
    if (dotsElement) {
      dotCount = (dotCount % 3) + 1; // 1, 2, 3 반복
      dotsElement.textContent = '.'.repeat(dotCount);
    }
  }, 500); // 500ms마다 업데이트
}

/**
 * 로딩 애니메이션 중지
 */
function stopLoadingAnimation() {
  if (loadingAnimationInterval) {
    clearInterval(loadingAnimationInterval);
    loadingAnimationInterval = null;
  }
}

/**
 * Extension이 토큰을 가져갈 때까지 대기
 */
function waitForExtensionPickup() {
  let elapsed = 0;
  const checkInterval = 500; // 500ms마다 확인
  const timeout = 5000; // 5초 타임아웃
  
  const intervalId = setInterval(() => {
    const container = document.getElementById('yss-activation-data');
    
    if (!container) {
      clearInterval(intervalId);
      showError('Activation data was removed unexpectedly');
      return;
    }
    
    // Extension이 데이터를 읽어갔는지 확인
    if (container.getAttribute('data-picked-up') === 'true') {
      clearInterval(intervalId);
      stopLoadingAnimation(); // 애니메이션 중지
      showSuccess();
      return;
    }
    
    elapsed += checkInterval;
    
    // 타임아웃 체크
    if (elapsed >= timeout) {
      clearInterval(intervalId);
      stopLoadingAnimation(); // 애니메이션 중지
      showTimeout();
    }
  }, checkInterval);
}

/**
 * 민감한 구독 데이터를 DOM에서 제거 (보안)
 */
function clearSensitiveData() {
  const container = document.getElementById('yss-activation-data');
  if (container) {
    container.removeAttribute('data-subscription');
    console.log('[YSS Activate] Subscription data cleared from DOM for security');
  }
}

/**
 * 성공 메시지 표시
 */
function showSuccess() {
  const statusDiv = document.getElementById('status');
  statusDiv.className = 'status success';
  statusDiv.innerHTML = `
    <h3><i class="fas fa-check-circle"></i> Pro Activated Successfully!</h3>
    <p>Your Pro features are now active in the YouTube Silence Skipper extension.</p>
    <p style="margin-top: 1rem;">
      <strong><i class="fas fa-star"></i> You can now enjoy all Pro features and future updates!</strong>
    </p>

    <a href="https://www.youtube.com" target="_blank">
      <i class="fas fa-play-circle"></i> Start Using Pro on YouTube
    </a>
  `;
  
  // 보안: Extension이 데이터를 가져간 후 민감한 데이터 제거
  clearSensitiveData();
  
  console.log('[YSS Activate] Activation completed successfully!');
}

/**
 * 타임아웃 메시지 표시
 */
function showTimeout() {
  const statusDiv = document.getElementById('status');
  statusDiv.className = 'status error';
  statusDiv.innerHTML = `
    <h3><i class="fas fa-clock"></i> Extension Not Detected</h3>
    <p>Authentication was successful on the server, but the extension didn't pick up the token.</p>
    <p><strong>Possible reasons:</strong></p>
    <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
      <li>Extension is not installed or disabled</li>
      <li>Extension needs to be reloaded</li>
      <li>Browser needs to be restarted</li>
    </ul>
    <p style="margin-top: 1rem;">
      <strong>What to do:</strong>
    </p>
    <ol style="margin-left: 1.5rem; margin-top: 0.5rem;">
      <li>Make sure the extension is installed and enabled</li>
      <li>Refresh this page and try again</li>
      <li>Or restart your browser and try again</li>
    </ol>
    <a href="https://chromewebstore.google.com/detail/ijlnjklmlhhfodgfpidpnccipnodohgl" 
       target="_blank" 
       rel="noopener">
      <i class="fas fa-download"></i> Install Extension
    </a>
  `;
  
  // Clear sensitive subscription data from DOM (security)
  clearSensitiveData();
  
  // Re-enable form
  document.getElementById('activateBtn').disabled = false;
  document.getElementById('email').disabled = false;
  document.getElementById('subscriptionId').disabled = false;
  
  console.warn('[YSS Activate] Extension pickup timed out after 5 seconds');
}

/**
 * 에러 메시지 표시
 */
function showError(message) {
  const statusDiv = document.getElementById('status');
  statusDiv.className = 'status error';
  statusDiv.innerHTML = `
    <h3><i class="fas fa-exclamation-triangle"></i> Error</h3>
    <p>${message}</p>
  `;
  
  // Re-enable form
  document.getElementById('activateBtn').disabled = false;
  document.getElementById('email').disabled = false;
  document.getElementById('subscriptionId').disabled = false;
}
