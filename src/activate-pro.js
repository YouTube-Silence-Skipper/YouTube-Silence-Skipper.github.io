const API_BASE_URL = 'https://payment.youtube-silenceskipper.com';

let currentEmail = '';
let resendTimerInterval = null;

/**
 * Generate time-based authentication token
 * @returns {string} Double base64 encoded timestamp token
 */
function generateAuthToken() {
  const timestamp = Math.floor(Date.now() / 1000);
  const firstEncoding = btoa(timestamp.toString());
  const secondEncoding = btoa(firstEncoding);
  return secondEncoding;
}

// URL 파라미터에서 이메일 자동 입력 (Paddle에서 리디렉션 시)
// 주의: URLSearchParams는 '+'를 공백으로 디코딩해 plus-aliasing(user+tag@…) 이메일을 손상시키고,
//       .get() 결과에 decodeURIComponent를 또 걸면 '이중 디코딩'이 된다.
//       → 원본 쿼리에서 직접 추출 후 정확히 1회만 decode 한다(decodeURIComponent는 '+'를 보존).
function getEmailParamFromQuery() {
  const match = window.location.search.match(/[?&]email=([^&]*)/);
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch (_) {
    return match[1]; // 깨진 %시퀀스 등 decode 실패 시 원문 사용(프리필 중단 방지)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const prefillEmail = getEmailParamFromQuery();
  if (prefillEmail) {
    document.getElementById('email').value = prefillEmail;
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
  
  // 재발송 버튼: 초기 화면(Step 1)으로 돌아가 코드를 다시 요청
  document.getElementById('resendBtn').addEventListener('click', handleChangeEmail);
  
  // 이메일 변경 버튼
  document.getElementById('changeEmailBtn').addEventListener('click', handleChangeEmail);
  
  // 코드 입력 필드: 숫자만 입력 허용
  document.getElementById('code').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
  });

  // 제출 버튼은 HTML에서 disabled로 시작한다. 이 스크립트가 늦게 로드되는 동안 제출되면
  // 폼이 기본 GET 제출로 새로고침되어 URL이 "activate-pro.html?"가 되고, 익스텐션의
  // 활성화 content script 매칭에서 빠질 수 있다. 핸들러를 붙인 뒤에만 활성화한다.
  document.getElementById('sendCodeBtn').disabled = false;
  document.getElementById('verifyCodeBtn').disabled = false;
}

/**
 * Step 1: 이메일 제출 처리
 */
async function handleEmailSubmit(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim().toLowerCase(); // RISK-01: 백엔드 정규화와 일치(소문자+trim). '+'는 보존됨
  const statusDiv = document.getElementById('status');
  const sendCodeBtn = document.getElementById('sendCodeBtn');
  const emailInput = document.getElementById('email');

  // Turnstile(봇 방지) 토큰 확인
  const turnstileToken = (typeof turnstile !== 'undefined') ? turnstile.getResponse() : '';
  if (!turnstileToken) {
    statusDiv.className = 'status error';
    statusDiv.innerHTML = `
      <h3><i class="fas fa-exclamation-circle"></i> Verification Required</h3>
      <p>Please complete the verification challenge above and try again.</p>
    `;
    return;
  }

  // UI 업데이트 - 로딩 상태
  statusDiv.className = 'status loading';
  statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending verification code...';
  sendCodeBtn.disabled = true;
  emailInput.disabled = true;
  
  try {
    const token = generateAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/v4/request-verification-code`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, turnstileToken })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send verification code');
    }
    
    // Step 2로 전환
    currentEmail = email;
    showStep2(email);
    startResendTimer();
    
    // 상태 초기화
    statusDiv.className = 'status';
    statusDiv.innerHTML = '';
    
  } catch (error) {
    console.error('[YSS Activate] Request Error:', error.message);
    
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
    } else if (error.message.includes('TURNSTILE_FAILED')) {
      errorMessage = `
        <h3><i class="fas fa-shield-alt"></i> Verification Failed</h3>
        <p>Bot verification failed. Please complete the challenge again.</p>
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

    // Turnstile 토큰은 1회용 → 재시도 위해 위젯 리셋
    if (typeof turnstile !== 'undefined') {
      turnstile.reset();
    }
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
    const token = generateAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/v4/verify-code`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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
    
    // Extension이 데이터를 가져갈 때까지 대기 (polling)
    waitForExtensionPickup();
    
  } catch (error) {
    console.error('[YSS Activate] Verification Error:', error.message);
    
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
 * 이메일 변경 / 재발송 버튼 처리 (Step 1으로 돌아가기)
 */
function handleChangeEmail() {
  // 타이머 중지
  stopResendTimer();

  // Turnstile 위젯 리셋 (새 토큰 준비)
  if (typeof turnstile !== 'undefined') {
    turnstile.reset();
  }
  
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
  }
}

/**
 * 성공 메시지 표시
 */
function showSuccess() {
  const statusDiv = document.getElementById('status');
  const successAnim = document.getElementById('successAnimation');
  const header = document.querySelector('.activate-pro-header');
  const steps = document.querySelectorAll('.step');
  const helpSection = document.querySelector('.help-section');
  const resendSection = document.querySelector('.resend-section');

  // 인증 관련 요소 숨기기
  if (header) header.style.display = 'none';
  steps.forEach(step => step.style.display = 'none');
  if (helpSection) helpSection.style.display = 'none';
  if (resendSection) resendSection.style.display = 'none';

  // 체크 애니메이션 표시
  if (successAnim) {
    successAnim.style.display = 'flex';
  }

  statusDiv.className = 'status success';
  statusDiv.style.textAlign = 'center';
  statusDiv.style.borderLeft = 'none';
  statusDiv.style.background = 'transparent';
  statusDiv.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-bottom: 2rem;">
      <img src="images/logo.png" alt="YouTube Silence Skipper Logo" style="width: 32px; height: 32px;">
      <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 1.125rem; color: var(--activate-primary); letter-spacing: -0.02em;">
        YouTube Silence Skipper
        <span style="background: var(--activate-primary); color: white; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1;">PRO</span>
      </div>
    </div>
    <h3 style="font-size: 2rem; margin-bottom: 0.5rem; color: var(--activate-primary); font-weight: 700; letter-spacing: -0.03em;">Activated Successfully!</h3>
    <p style="font-size: 1.05rem; color: var(--activate-text-secondary); margin-bottom: 2.5rem;">Your Pro features are now active in the extension.</p>

    <a href="https://www.youtube.com" target="_blank" class="btn-activate" style="display: inline-block; width: auto; padding: 1rem 2.5rem; text-decoration: none;">
      <i class="fas fa-play-circle"></i> Start Using Pro on YouTube
    </a>
  `;
  
  // 보안: Extension이 데이터를 가져간 후 민감한 데이터 제거
  clearSensitiveData();
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
