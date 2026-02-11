const API_BASE_URL = 'https://payment.youtube-silenceskipper.com';

let currentEmail = '';
let resendTimerInterval = null;

// URL 파라미터에서 이메일 자동 입력 (Paddle에서 리디렉션 시)
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('email')) {
    document.getElementById('email').value = decodeURIComponent(urlParams.get('email'));
  }
  
  // 이벤트 리스너 등록
  setupEventListeners();
});

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
  // Step 1: 이메일 제출
  document.getElementById('emailForm').addEventListener('submit', handleEmailSubmit);
  
  // Step 2: 코드 검증
  document.getElementById('codeForm').addEventListener('submit', handleCodeSubmit);
  
  // 재발송 버튼
  document.getElementById('resendBtn').addEventListener('click', handleResend);
  
  // 이메일 변경 버튼
  document.getElementById('changeEmailBtn').addEventListener('click', handleChangeEmail);
  
  // 코드 입력 필드: 숫자만 입력 허용
  document.getElementById('code').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
  });
}

/**
 * Step 1: 이메일 제출 처리
 */
async function handleEmailSubmit(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const statusDiv = document.getElementById('status');
  const sendCodeBtn = document.getElementById('sendCodeBtn');
  const emailInput = document.getElementById('email');
  
  // UI 업데이트 - 로딩 상태
  statusDiv.className = 'status loading';
  statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending verification code...';
  sendCodeBtn.disabled = true;
  emailInput.disabled = true;
  
  try {
    console.log('[YSS Activate] Requesting verification code for:', email);
    
    const response = await fetch(`${API_BASE_URL}/api/v4/request-verification-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send verification code');
    }
    
    console.log('[YSS Activate] Code sent successfully');
    
    // Step 2로 전환
    currentEmail = email;
    showStep2(email);
    startResendTimer();
    
    // 상태 초기화
    statusDiv.className = 'status';
    statusDiv.innerHTML = '';
    
  } catch (error) {
    console.error('[YSS Activate] Error:', error);
    
    statusDiv.className = 'status error';
    
    // 에러 타입별 메시지
    let errorMessage = '';
    if (error.message.includes('INVALID_EMAIL_FORMAT')) {
      errorMessage = `
        <h3><i class="fas fa-exclamation-circle"></i> Invalid Email Format</h3>
        <p>Please enter a valid email address.</p>
      `;
    } else if (error.message.includes('NO_ACTIVE_SUBSCRIPTION')) {
      errorMessage = `
        <h3><i class="fas fa-ban"></i> No Active Subscription Found</h3>
        <p>We couldn't find an active subscription for this email.</p>
        <p>Please check your email or purchase a subscription first.</p>
        <a href="https://youtube-silenceskipper.com/#pricing" target="_blank">
          <i class="fas fa-shopping-cart"></i> View Pricing
        </a>
      `;
    } else if (error.message.includes('EMAIL_BLOCKED') || error.message.includes('429')) {
      errorMessage = `
        <h3><i class="fas fa-clock"></i> Too Many Attempts</h3>
        <p>This email is temporarily blocked due to multiple failed attempts.</p>
        <p>Please try again in 10 minutes.</p>
      `;
    } else if (error.message.includes('CODE_ALREADY_SENT')) {
      errorMessage = `
        <h3><i class="fas fa-info-circle"></i> Code Already Sent</h3>
        <p>A verification code was already sent to this email.</p>
        <p>Please wait 1 minute before requesting a new code.</p>
      `;
    } else if (error.message.includes('fetch')) {
      errorMessage = `
        <h3><i class="fas fa-wifi"></i> Network Error</h3>
        <p>Failed to connect to the server. Please check your internet connection and try again.</p>
      `;
    } else {
      errorMessage = `
        <h3><i class="fas fa-times-circle"></i> Failed to Send Code</h3>
        <p>${error.message}</p>
        <p>Please try again or contact support if the problem persists.</p>
      `;
    }
    
    statusDiv.innerHTML = errorMessage;
    
    // Re-enable form
    sendCodeBtn.disabled = false;
    emailInput.disabled = false;
  }
}

/**
 * Step 2: 코드 검증 처리
 */
async function handleCodeSubmit(e) {
  e.preventDefault();
  
  const code = document.getElementById('code').value.trim();
  const statusDiv = document.getElementById('status');
  const verifyCodeBtn = document.getElementById('verifyCodeBtn');
  const codeInput = document.getElementById('code');
  const resendBtn = document.getElementById('resendBtn');
  
  // 코드 형식 검증 (클라이언트 측)
  if (!/^\d{6}$/.test(code)) {
    statusDiv.className = 'status error';
    statusDiv.innerHTML = `
      <h3><i class="fas fa-exclamation-circle"></i> Invalid Code Format</h3>
      <p>Please enter a 6-digit code.</p>
    `;
    return;
  }
  
  // UI 업데이트 - 로딩 상태
  statusDiv.className = 'status loading';
  statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying code...';
  verifyCodeBtn.disabled = true;
  codeInput.disabled = true;
  resendBtn.disabled = true;
  
  try {
    console.log('[YSS Activate] Verifying code for:', currentEmail);
    
    const response = await fetch(`${API_BASE_URL}/api/v4/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: currentEmail,
        code: code
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // 실패 시 시도 횟수 표시
      if (data.attempts_remaining !== undefined) {
        const attemptsFeedback = document.getElementById('attemptsFeedback');
        attemptsFeedback.textContent = `${data.attempts_remaining} attempts remaining`;
        attemptsFeedback.style.color = data.attempts_remaining <= 2 ? '#c62828' : '#f57c00';
      }
      
      throw new Error(data.error || 'Code verification failed');
    }
    
    console.log('[YSS Activate] Code verified successfully:', data);
    
    // DOM에 구독 데이터 저장 (Extension이 읽어갈 수 있도록)
    statusDiv.className = 'status loading';
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
    
    // Extension이 데이터를 가져갈 때까지 대기 (polling)
    waitForExtensionPickup();
    
  } catch (error) {
    console.error('[YSS Activate] Error:', error);
    
    statusDiv.className = 'status error';
    
    // 에러 타입별 메시지
    let errorMessage = '';
    if (error.message.includes('CODE_NOT_FOUND')) {
      errorMessage = `
        <h3><i class="fas fa-exclamation-triangle"></i> Code Expired</h3>
        <p>This verification code has expired or does not exist.</p>
        <p>Please request a new code.</p>
      `;
    } else if (error.message.includes('CODE_MISMATCH') || error.message.includes('401')) {
      errorMessage = `
        <h3><i class="fas fa-times-circle"></i> Invalid Code</h3>
        <p>The code you entered is incorrect.</p>
        <p>Please check and try again.</p>
      `;
    } else if (error.message.includes('MAX_ATTEMPTS_EXCEEDED') || error.message.includes('EMAIL_BLOCKED')) {
      errorMessage = `
        <h3><i class="fas fa-ban"></i> Too Many Failed Attempts</h3>
        <p>You've exceeded the maximum number of attempts.</p>
        <p>This email is now blocked for 10 minutes.</p>
        <p>Please try again later.</p>
      `;
      
      // 블록 시 Step 1로 돌아가기
      setTimeout(() => {
        handleChangeEmail();
      }, 3000);
    } else if (error.message.includes('fetch')) {
      errorMessage = `
        <h3><i class="fas fa-wifi"></i> Network Error</h3>
        <p>Failed to connect to the server. Please check your internet connection and try again.</p>
      `;
    } else {
      errorMessage = `
        <h3><i class="fas fa-times-circle"></i> Verification Failed</h3>
        <p>${error.message}</p>
        <p>Please try again or contact support if the problem persists.</p>
      `;
    }
    
    statusDiv.innerHTML = errorMessage;
    
    // Re-enable form (블록이 아닌 경우만)
    if (!error.message.includes('MAX_ATTEMPTS_EXCEEDED') && !error.message.includes('EMAIL_BLOCKED')) {
      verifyCodeBtn.disabled = false;
      codeInput.disabled = false;
      // 타이머가 끝났으면 재발송 버튼 활성화
      if (!resendTimerInterval) {
        resendBtn.disabled = false;
      }
    }
    
    // 코드 입력 필드 포커스 및 선택
    codeInput.focus();
    codeInput.select();
  }
}

/**
 * 재발송 버튼 처리
 */
async function handleResend() {
  const resendBtn = document.getElementById('resendBtn');
  const statusDiv = document.getElementById('status');
  
  // 버튼 비활성화
  resendBtn.disabled = true;
  
  statusDiv.className = 'status loading';
  statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resending code...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v4/request-verification-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: currentEmail })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to resend code');
    }
    
    console.log('[YSS Activate] Code resent successfully');
    
    // 타이머 재시작
    startResendTimer();
    
    // 성공 메시지
    statusDiv.className = 'status success';
    statusDiv.innerHTML = `
      <h3><i class="fas fa-check-circle"></i> Code Resent</h3>
      <p>A new verification code has been sent to your email.</p>
    `;
    
    // 3초 후 메시지 제거
    setTimeout(() => {
      statusDiv.className = 'status';
      statusDiv.innerHTML = '';
    }, 3000);
    
    // 코드 입력 필드 초기화 및 포커스
    document.getElementById('code').value = '';
    document.getElementById('code').focus();
    
  } catch (error) {
    console.error('[YSS Activate] Resend error:', error);
    
    statusDiv.className = 'status error';
    
    let errorMessage = '';
    if (error.message.includes('CODE_ALREADY_SENT')) {
      errorMessage = `
        <h3><i class="fas fa-info-circle"></i> Please Wait</h3>
        <p>A code was already sent recently. Please wait 1 minute before requesting a new code.</p>
      `;
    } else if (error.message.includes('EMAIL_BLOCKED')) {
      errorMessage = `
        <h3><i class="fas fa-clock"></i> Temporarily Blocked</h3>
        <p>Too many attempts. Please try again in 10 minutes.</p>
      `;
    } else {
      errorMessage = `
        <h3><i class="fas fa-times-circle"></i> Failed to Resend</h3>
        <p>${error.message}</p>
      `;
    }
    
    statusDiv.innerHTML = errorMessage;
    
    // 에러가 아닌 경우만 재발송 버튼 다시 활성화
    if (!error.message.includes('EMAIL_BLOCKED')) {
      resendBtn.disabled = false;
    }
  }
}

/**
 * 이메일 변경 버튼 처리 (Step 1으로 돌아가기)
 */
function handleChangeEmail() {
  // 타이머 중지
  stopResendTimer();
  
  // Step 1 표시, Step 2 숨김
  document.getElementById('step1').classList.add('active');
  document.getElementById('step1').classList.remove('hidden');
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step2').classList.add('hidden');
  
  // 코드 입력 필드 초기화
  document.getElementById('code').value = '';
  document.getElementById('attemptsFeedback').textContent = '';
  
  // 상태 메시지 초기화
  const statusDiv = document.getElementById('status');
  statusDiv.className = 'status';
  statusDiv.innerHTML = '';
  
  // 이메일 입력 필드 활성화 및 포커스
  const emailInput = document.getElementById('email');
  emailInput.disabled = false;
  document.getElementById('sendCodeBtn').disabled = false;
  emailInput.focus();
  emailInput.select();
  
  currentEmail = '';
  
  console.log('[YSS Activate] Returned to Step 1');
}

/**
 * Step 2 표시
 */
function showStep2(email) {
  // Step 1 숨김, Step 2 표시
  document.getElementById('step1').classList.remove('active');
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step2').classList.add('active');
  document.getElementById('step2').classList.remove('hidden');
  
  // 이메일 표시
  document.getElementById('userEmail').textContent = email;
  
  // 코드 입력 필드 활성화 및 포커스
  const codeInput = document.getElementById('code');
  codeInput.disabled = false;
  codeInput.value = '';
  codeInput.focus();
  
  document.getElementById('verifyCodeBtn').disabled = false;
  
  console.log('[YSS Activate] Switched to Step 2');
}

/**
 * 재발송 타이머 시작 (60초 카운트다운)
 */
function startResendTimer() {
  let seconds = 60;
  const timerElement = document.getElementById('timer');
  const resendBtn = document.getElementById('resendBtn');
  
  // 기존 타이머 중지
  stopResendTimer();
  
  // 버튼 비활성화
  resendBtn.disabled = true;
  
  resendTimerInterval = setInterval(() => {
    seconds--;
    timerElement.textContent = seconds;
    
    if (seconds === 0) {
      clearInterval(resendTimerInterval);
      resendTimerInterval = null;
      resendBtn.disabled = false;
      timerElement.textContent = '60';
    }
  }, 1000);
}

/**
 * 재발송 타이머 중지
 */
function stopResendTimer() {
  if (resendTimerInterval) {
    clearInterval(resendTimerInterval);
    resendTimerInterval = null;
  }
  
  document.getElementById('timer').textContent = '60';
  document.getElementById('resendBtn').disabled = false;
}

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
  
  // Resend 섹션 숨기기 (activation 성공 시 불필요)
  const resendSection = document.querySelector('.resend-section');
  if (resendSection) {
    resendSection.style.display = 'none';
  }
  
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
}
