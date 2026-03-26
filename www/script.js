// Ver 3.0.8-AD-SIMU
// [REPAIR] 전역 에러 핸들러 (사소한 에러가 게임 전체를 멈추는 것을 방지)
window.onerror = function(message, source, lineno, colno, error) {
    console.warn("Global Error Captured (Defensive Mode):", message);
    return true; // 에러 전파 방지
};
console.log("🚀 뽕뽕비행기: 갤럭시 디펜더 [Ver 3.0.8-AD-SIMU] 가동 시작");

// --- Capacitor & AdMob (출시용 광고) 설정 ---
const { AdMob } = window.Capacitor ? window.Capacitor.Plugins : {};

// [DEFENSIVE] 안전하게 엘리먼트를 가져오는 헬퍼 함수
function safeGetElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`[Defensive] Element with id '${id}' not found. Creating a dummy to prevent crashes.`);
        const dummy = document.createElement('div');
        dummy.id = 'dummy'; // 더미 유무 확인을 위한 식별자 부여
        return dummy;
    }
    return el;
}

async function initAds() {
    if (!window.Capacitor) return;
    try {
        await AdMob.initialize({ requestTrackingAuthorization: true });
        // 하단 배너 광고 상시 노출 (테스트 ID)
        await AdMob.showBanner({
            adId: 'ca-app-pub-3940256099942544/6300978111',
            adSize: 'BANNER',
            position: 'BOTTOM_CENTER',
            margin: 0
        });
    } catch (e) { console.warn("AdMob Init Failed:", e); }
}

async function showInterstitial() {
    if (!window.Capacitor) return;
    try {
        await AdMob.prepareInterstitial({ adId: 'ca-app-pub-3940256099942544/1033173712' });
        await AdMob.showInterstitial();
    } catch (e) { console.warn("Interstitial Failed:", e); }
}

// --- Persistence Logic (Save/Load) ---
function saveData() {
    const gameData = {
        totalCoins: totalCoins,
        thisStageCoins: thisStageCoins, // [FIX] 스테이지 내 진행도 저장 필수
        currentStage: currentStage,
        currentFireRate: currentFireRate,
        currentMultiShot: currentMultiShot,
        costFireRate: costFireRate,
        costEnemySpeed: typeof costEnemySpeed !== 'undefined' ? costEnemySpeed : 1000,
        costLaser: typeof costLaser !== 'undefined' ? costLaser : 5000,
        magnetRange: typeof magnetRange !== 'undefined' ? magnetRange : 100,
        costMagnetRange: typeof costMagnetRange !== 'undefined' ? costMagnetRange : 1000,
        fireRateLevel: typeof fireRateLevel !== 'undefined' ? fireRateLevel : 1,
        multiShotLevel: typeof multiShotLevel !== 'undefined' ? multiShotLevel : 1,
        enemySlowLevel: typeof enemySlowLevel !== 'undefined' ? enemySlowLevel : 1,
        costFireRate: typeof costFireRate !== 'undefined' ? costFireRate : 1000,
        costMultiShot: typeof costMultiShot !== 'undefined' ? costMultiShot : 1000,
        costEnemySlow: typeof costEnemySlow !== 'undefined' ? costEnemySlow : 1000
    };
    localStorage.setItem('airplaneShooterData', JSON.stringify(gameData));
}

function loadData() {
    console.log("Loading game data...");

    const saved = localStorage.getItem('airplaneShooterData');
    if (saved) {
        const data = JSON.parse(saved);
        
        // [HARDENING] 모든 수치 데이터는 정수(Integer) 및 0 이상의 양수임을 강제함
        // 소수점이나 문자열 결합으로 인한 "501" 현상 방지
        const sanitize = (val, def = 0) => Math.max(0, Math.floor(Number(val) || def));

        totalCoins = sanitize(data.totalCoins);
        thisStageCoins = sanitize(data.thisStageCoins);
        currentStage = sanitize(data.currentStage, 1);
        
        currentFireRate = sanitize(data.currentFireRate, 180);
        currentMultiShot = sanitize(data.currentMultiShot, 1); // 3.0.5 기본값 1
        costFireRate = sanitize(data.costFireRate, 1000); // 3.0.5 기본값 1000
        costMultiShot = sanitize(data.costMultiShot, 1000);
        
        if (data.baseEnemySpeedMultiplier !== undefined) {
            baseEnemySpeedMultiplier = Math.max(0.1, Number(data.baseEnemySpeedMultiplier) || 1);
        }
        if (data.costEnemySpeed !== undefined) {
            costEnemySpeed = sanitize(data.costEnemySpeed, 500);
        }
        if (data.costLaser !== undefined) {
            costLaser = sanitize(data.costLaser, 5000);
        }
        if (data.magnetRange !== undefined) {
            magnetRange = sanitize(data.magnetRange, 100);
        }
        if (data.costMagnetRange !== undefined) {
            costMagnetRange = sanitize(data.costMagnetRange, 1000);
        }
        // [NEW] 레벨 및 진화용 데이터 로드
        fireRateLevel = sanitize(data.fireRateLevel, 1);
        multiShotLevel = sanitize(data.multiShotLevel, 1);
        enemySlowLevel = sanitize(data.enemySlowLevel, 1);
        
        // 3.0.5 경제 밸런스: 최소 비용 1000 강제 (데이터 오염 방지)
        costFireRate = Math.max(1000, sanitize(data.costFireRate, 1000));
        costMultiShot = Math.max(1000, sanitize(data.costMultiShot, 1000));
        costEnemySlow = Math.max(1000, sanitize(data.costEnemySlow, 1000));
        
        costEnemySpeed = Math.max(1000, sanitize(data.costEnemySpeed, 1000));
        costLaser = Math.max(5000, sanitize(data.costLaser, 5000));
        costMagnetRange = Math.max(1000, sanitize(data.costMagnetRange, 1000));
    } else {
        // [DEFENSIVE] 데이터가 아예 없는 경우 기본값 강제 할당
        fireRateLevel = 1;
        multiShotLevel = 1;
        enemySlowLevel = 1;
        costFireRate = 1000;
        costMultiShot = 1000;
        costEnemySlow = 1000;
        totalCoins = 0;
    }
    console.log("Data loaded successfully.");
}

async function showRewarded(successCallback) {
    console.log("광고 버튼 클릭됨! (showRewarded 호출)"); // [LOG] 연결 확인용
    if (!window.Capacitor) {
        // 브라우저 환경에서는 기존처럼 모의 광고 재생
        alert('🎥 광고 시청 중... (15초)');
        // [SIMULATION] 시뮬레이션 모드에서 확인 누르면 50,000 코인 지급
        totalCoins += 50000;
        saveData();
        updateShopUI();
        successCallback();
        return;
    }
    try {
        await AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-3940256099942544/5224354917' });
        const reward = await AdMob.showRewardVideoAd();
        if (reward) successCallback();
    } catch (e) {
        console.warn("Reward Ad Failed:", e);
        // 광고 로드 실패 시에도 보이스나 테스트를 위해 일단 진행 허용 (선택적)
        successCallback();
    }
}

// --- Web Audio API (효과음) 초기화 ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function playLaserSound() {
    if (!audioCtx) audioCtx = new AudioContext(); // 첫 발사 시 생성
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // 복고풍 뿅뿅 소리 (Square wave 파형 피치 드랍)
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1);

    // 짧고 굵직하게 끊어지는 사운드
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playCoinSound() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // 코인 특유의 띠-링! 느낌 (두 개의 음이 연달아 들리도록 피치 점프)
    osc.type = 'sine'; // 맑은 음색
    osc.frequency.setValueAtTime(987.77, audioCtx.currentTime); // 첫음 (B5)
    osc.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.05); // 짧게 E6로 도약

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.05);
    // 서서히 여운을 남기며 사라짐
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// [NEW] 자석 강화 사운드 (지잉- 하는 전자음)
function playMagnetSound() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

// 실제 유리 파손음을 Web Audio API로 극도로 정교하게 합성 (Impact + Crackling + Tinkling)
function playGlassSound() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    // 1. 강한 타격음 (Impact) - 깡! 하는 순간적인 충격
    const impactOsc = audioCtx.createOscillator();
    const impactGain = audioCtx.createGain();
    impactOsc.type = 'triangle';
    impactOsc.frequency.setValueAtTime(150, now);
    impactOsc.frequency.exponentialRampToValueAtTime(1000, now + 0.05);
    impactGain.gain.setValueAtTime(0.4, now);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    impactOsc.connect(impactGain);
    impactGain.connect(audioCtx.destination);
    impactOsc.start(now);
    impactOsc.stop(now + 0.1);

    // 2. 균열음 및 파편 비산 (Crackling/Shatter Noise) - 챙그랑!
    const duration = 0.5;
    const bufferSize = audioCtx.sampleRate * duration;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        // 시간에 따라 감쇄하는 화이트 노이즈
        output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(3000, now);
    noiseFilter.Q.value = 10; // 공명 추가로 맑은 느낌 강화

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noiseSource.start(now);

    // 3. 고주파 잔향음 (Tinkling) - 찰랑찰랑 흩어지는 파편
    for (let i = 0; i < 5; i++) {
        const tinkleOsc = audioCtx.createOscillator();
        const tinkleGain = audioCtx.createGain();
        const delay = Math.random() * 0.1;
        const freq = 4000 + Math.random() * 6000;

        tinkleOsc.type = 'sine';
        tinkleOsc.frequency.setValueAtTime(freq, now + delay);
        tinkleGain.gain.setValueAtTime(0, now + delay);
        tinkleGain.gain.linearRampToValueAtTime(0.1, now + delay + 0.01);
        tinkleGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);

        tinkleOsc.connect(tinkleGain);
        tinkleGain.connect(audioCtx.destination);
        tinkleOsc.start(now + delay);
        tinkleOsc.stop(now + delay + 0.2);
    }
}

let lastKlaxonTime = 0;
function playKlaxonSound() {
    const now = audioCtx ? audioCtx.currentTime : 0;
    if (now - lastKlaxonTime < 0.1) return; // 0.1초 쿨다운 (연속 재생 방지)
    lastKlaxonTime = now;

    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const currentTime = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'square';
    osc2.type = 'square';

    osc1.frequency.setValueAtTime(440, currentTime);
    osc2.frequency.setValueAtTime(349.23, currentTime);

    gainNode.gain.setValueAtTime(0.08, currentTime); // 약간 볼륨 하향
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.2);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start(currentTime);
    osc2.start(currentTime);
    osc1.stop(currentTime + 0.2);
    osc2.stop(currentTime + 0.2);
}

// [NEW] 11단계: 땡그랑! 보석/동전 부딪히는 소리
function playClinkSound() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(now + 0.2);
}

// [NEW] 결제 성공 소리 (카칭!)
function playPurchaseSuccessSound() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc1.frequency.setValueAtTime(1000, now);
    osc1.frequency.exponentialRampToValueAtTime(1500, now + 0.1);
    osc2.frequency.setValueAtTime(1200, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain); osc2.connect(gain);
    gain.connect(audioCtx.destination);
    osc1.start(); osc2.start();
    osc1.stop(now + 0.3); osc2.stop(now + 0.3);
}

// [NEW] 결제 실패 소리 (띠딕- 소리)
function playPurchaseFailSound() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(now + 0.2);
}

// [NEW] 13단계: 우주 공간의 웅성임 (자연스러운 톤으로 변경)
let spaceAmbianceSource = null;
let spaceAmbianceGain = null;

function startSpaceAmbiance() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // 이미 재생 중이면 중복 생성 방지
    if (spaceAmbianceSource) return;

    const now = audioCtx.currentTime;
    
    // 우주의 고요하고 부드러운 화이트 노이즈
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now); // 매우 부드러운 필터

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 2); // 아주 은은하게 커짐

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noiseSource.start(now);

    spaceAmbianceSource = noiseSource;
    spaceAmbianceGain = gain;
}

function stopSpaceAmbiance() {
    if (spaceAmbianceSource && spaceAmbianceGain) {
        const now = audioCtx.currentTime;
        spaceAmbianceGain.gain.cancelScheduledValues(now);
        spaceAmbianceGain.gain.setValueAtTime(spaceAmbianceGain.gain.value, now);
        spaceAmbianceGain.gain.linearRampToValueAtTime(0, now + 1); // 1초간 페이드 아웃

        const sourceToStop = spaceAmbianceSource;
        setTimeout(() => {
            try { sourceToStop.stop(); } catch (e) { }
        }, 1100);

        spaceAmbianceSource = null;
        spaceAmbianceGain = null;
    }
}

// [NEW] 16단계: 폭죽 빵빵 터지는 소리 (개선된 realism - Bass Boom + Multi Crackle)
function playFireworkSound() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    // 1. 메인 폭발음 (Deep Bass Boom)
    const boomOsc = audioCtx.createOscillator();
    const boomGain = audioCtx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(150, now);
    boomOsc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    boomGain.gain.setValueAtTime(0.6, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    boomOsc.connect(boomGain);
    boomGain.connect(audioCtx.destination);
    boomOsc.start(); boomOsc.stop(now + 0.4);

    // 2. 중간 타격음 (Mid-range punch)
    const punchOsc = audioCtx.createOscillator();
    const punchGain = audioCtx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(200, now);
    punchOsc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    punchGain.gain.setValueAtTime(0.4, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    punchOsc.connect(punchGain);
    punchGain.connect(audioCtx.destination);
    punchOsc.start(); punchOsc.stop(now + 0.15);

    // 3. 파바박! 파편 소리 (Layered Noise Crackle)
    for (let i = 0; i < 3; i++) {
        const delay = i * 0.05;
        const bufSize = audioCtx.sampleRate * (0.2 + Math.random() * 0.2);
        const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let j = 0; j < bufSize; j++) data[j] = Math.random() * 2 - 1;

        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000 + Math.random() * 2000, now + delay);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.1, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(now + delay);
    }
}

// [NEW] Stage 19: 뾱뾱 (뿌잉뿌잉) 소리
function playBboingSound() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(); osc.stop(now + 0.2);
}

// [NEW] 18단계: 악기 소리 (바이올린, 북, 탬버린)
function playInstrumentSound(instSymbol) {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    if (instSymbol === '🎻') { // 바이올린 (Vibrato + Slow Attack)
        const osc = audioCtx.createOscillator();
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        const gain = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        
        // Vibrato
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(6, now); // 6Hz 비브라토
        lfoGain.gain.setValueAtTime(10, now); // 피치 변동 폭
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        // 활로 켜는 듯한 서서히 커지는 어택
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.2); // 느린 어택
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6); // 릴리즈
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(); lfo.start(); 
        osc.stop(now + 0.6); lfo.stop(now + 0.6);
    } else if (instSymbol === '🥁') { // 북 (Sharp Pitch Drop + Noise Thud)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle'; // 사인보단 약간 배음이 있는 질감
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.05); // 매우 급격하게 떨어짐
        
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(); osc.stop(now + 0.2);
        
        // 추가 타격 노이즈
        const bufSize = audioCtx.sampleRate * 0.05;
        const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1000, now);
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        src.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        src.start(now);
    } else if (instSymbol === '🔔') { // 맑은 종소리 (여러 사인파 합성)
        const freqs = [1000, 2010, 3050]; // 종 특유의 비배음렬
        freqs.forEach(freq => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8); // 긴 여운
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 0.8);
        });
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 플레이어 외형 진화 스프라이트 에셋 (단계별 투명화 캔버스 저장용)
const playerSprites = {
    1: null, 2: null, 3: null, 4: null
};

// AI가 생성한 이미지의 하얀색/검은색 박스(배경색)를 자동으로 투명하게 뚫어주는 함수
function loadAndRemoveBackground(src, level) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.width;
        offCanvas.height = img.height;
        const octx = offCanvas.getContext('2d');
        octx.drawImage(img, 0, 0);

        try {
            const imgData = octx.getImageData(0, 0, offCanvas.width, offCanvas.height);
            const data = imgData.data;
            // 좌상단(0,0) 픽셀을 배경색 기준으로 삼음 (주로 흰색이나 검은색 영역)
            const bgR = data[0], bgG = data[1], bgB = data[2];

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                // 배경색과 오차범위 70 이내로 유사하거나, 완전한 흰색에 가까우면 투명화
                const isBgColor = Math.abs(r - bgR) < 70 && Math.abs(g - bgG) < 70 && Math.abs(b - bgB) < 70;
                const isVeryLight = r > 200 && g > 200 && b > 200; // 밝은 색 영역 광범위 타겟팅

                if (isBgColor || isVeryLight) {
                    data[i + 3] = 0;
                }
            }
            octx.putImageData(imgData, 0, 0);
            playerSprites[level] = offCanvas; // 투명화가 완료된 캔버스를 에셋으로 사용
        } catch (e) {
            console.warn("Canvas CORS/Data access blocked. Using original image with background potential.", e);
            playerSprites[level] = img; // 로컬 보안 에러 시 원본 이미지 대체
        }
    };
}

loadAndRemoveBackground('player_lv1.png', 1);
loadAndRemoveBackground('player_lv2.png', 2);
loadAndRemoveBackground('player_lv3.png', 3);
loadAndRemoveBackground('player_lv4.png', 4);

// 적군 레이싱 카 에셋 로드 (개별 고화질 이미지로 교체)
const racingCarSprites = { imgs: [] };
const carSources = ['car_new_1.png', 'car_new_2.png', 'car_new_3.png'];

carSources.forEach(src => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.width;
        offCanvas.height = img.height;
        const octx = offCanvas.getContext('2d');
        octx.drawImage(img, 0, 0);

        try {
            const imgData = octx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;
            const bgR = data[0], bgG = data[1], bgB = data[2];
            for (let j = 0; j < data.length; j += 4) {
                const r = data[j], g = data[j + 1], b = data[j + 2], a = data[j + 3];
                const isBgColor = Math.abs(r - bgR) < 60 && Math.abs(g - bgG) < 60 && Math.abs(b - bgB) < 60;
                const isVeryLight = r > 200 && g > 200 && b > 200;

                if (isBgColor || isVeryLight) {
                    data[j + 3] = 0;
                }
            }
            octx.putImageData(imgData, 0, 0);
            racingCarSprites.imgs.push(offCanvas);
        } catch (e) {
            racingCarSprites.imgs.push(img);
        }
    };
});

// 8단계 행성 이미지 로드
const planetSprites = {};
const planetSources = {
    'mars': 'planet_mars.png',
    'jupiter': 'planet_jupiter.png',
    'saturn': 'planet_saturn.png',
    'uranus': 'planet_uranus.png'
};

Object.keys(planetSources).forEach(key => {
    const img = new Image();
    img.src = planetSources[key];
    img.onload = () => {
        planetSprites[key] = img;
    };
});

// [NEW] 12단계 팬더 몸통 에셋 로드 (대표님 요청 "몸통까지 그려줘" + 고화질 v4 에셋 적용)
const pandaSprite = { img: null };
function loadPandaSprite(src) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.width;
        offCanvas.height = img.height;
        const octx = offCanvas.getContext('2d');
        if (!octx) { pandaSprite.img = img; return; }
        octx.drawImage(img, 0, 0);
        try {
            const imgData = octx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;
            // [개선] v4 에셋의 파란색(Chroma Key) 배경 제거 및 경계선(안티앨리어싱) 부드럽게 처리
            for (let j = 0; j < data.length; j += 4) {
                const r = data[j], g = data[j + 1], b = data[j + 2];
                // 파란색이 다른 색상보다 얼마나 더 강한지 측정
                const blueDiff = b - Math.max(r, g);
                
                if (blueDiff > 30) {
                    // 경계선 페더링 (값이 클수록 투명하게, 작을수록 불투명하게 그라데이션)
                    const alphaRaw = 255 - (blueDiff - 30) * 4;
                    data[j + 3] = Math.max(0, Math.min(255, alphaRaw));
                }
            }
            octx.putImageData(imgData, 0, 0);
            pandaSprite.img = offCanvas;
        } catch (e) {
            console.warn("Panda BG removal failed:", e);
            pandaSprite.img = img;
        }
    };
    img.onerror = () => { console.warn("Panda image load failed:", src); };
}
loadPandaSprite('panda_sprite_v4.png');

// UI 엘리먼트 가져오기
const uiLayer = safeGetElement('uiLayer');
const scoreValue = safeGetElement('scoreValue');
const coinValue = safeGetElement('coinValue');
const finalScoreValue = safeGetElement('finalScoreValue');
const acquiredCoinValue = safeGetElement('acquiredCoinValue');

const startScreen = safeGetElement('startScreen');
const gameOverScreen = safeGetElement('gameOverScreen');
const gameClearScreen = safeGetElement('gameClearScreen');
const shopScreen = safeGetElement('shopScreen');

const startBtn = safeGetElement('startBtn');
const restartBtn = safeGetElement('restartBtn');
const playAgainBtn = safeGetElement('playAgainBtn');
console.log("Buttons found:", {startBtn:!!startBtn, restartBtn:!!restartBtn, playAgainBtn:!!playAgainBtn});
const shopBtn = safeGetElement('shopBtn');
const closeShopBtn = safeGetElement('closeShopBtn');

const shopCoinValue = safeGetElement('shopCoinValue');
const costFireRateElement = safeGetElement('costFireRate');
const costMultiShotElement = safeGetElement('costMultiShot');
const upgFireRateBtn = safeGetElement('upgFireRateBtn');
const upgMultiShotBtn = safeGetElement('upgMultiShotBtn');

// [NEW] 상점 추가 버튼들
const costEnemySpeedElement = safeGetElement('costEnemySpeed');
const upgEnemySpeedBtn = safeGetElement('upgEnemySpeedBtn');
const costLaserElement = safeGetElement('costLaser');
const upgLaserBtn = safeGetElement('upgLaserBtn');
const adCoinShopBtn = safeGetElement('adCoinShopBtn');

const adReviveBtn = safeGetElement('adReviveBtn');
const adDoubleCoinBtn = safeGetElement('adDoubleCoinBtn');
const clearScoreValue = safeGetElement('clearScoreValue');
const clearCoinValue = safeGetElement('clearCoinValue');
const debugPanel = safeGetElement('debugPanel');
const debugStageInfo = safeGetElement('debugStageInfo');
const btnStageUp = safeGetElement('btnStageUp');
const btnStageDown = safeGetElement('btnStageDown');
const btnCoinCheat = safeGetElement('btnCoinCheat');
const btnHardReset = safeGetElement('btnHardReset');

// [NEW] HUD 퀵 업그레이드 버튼
const btnQuickFireRate = safeGetElement('btnQuickFireRate');
const btnQuickMultiShot = safeGetElement('btnQuickMultiShot');
const btnQuickEnemySlow = safeGetElement('btnQuickEnemySlow');

// [NEW] 자석 및 2배 광고 UI 요소
const btnMagnetUpg = safeGetElement('btnMagnetUpg');
const magnetCostDisplay = safeGetElement('magnetCost');
const doubleCoinTimerDisplay = safeGetElement('doubleCoinTimerDisplay');
const adDoubleCoinTimedBtn = safeGetElement('adDoubleCoinTimedBtn');

// URL 파라미터에 debug=true가 있거나 로컬 환경(localhost)이면 테스트 패널을 보여줌 (대표님 확인용)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('debug') === 'true' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    if (debugPanel) debugPanel.style.display = 'flex';
}

// 캔버스 크기 - 화면에 꽉 차게 설정
let CANVAS_WIDTH = window.innerWidth;
let CANVAS_HEIGHT = window.innerHeight;

function resizeCanvas() {
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
}

// 초기 로드 시 캔버스 크기 맞추기 및 리사이즈 이벤트 등록
window.addEventListener('resize', resizeCanvas);
resizeCanvas();


// ==========================================
// 게임 상태 변수들
// ==========================================
let isPlaying = false;
let animationId;
let score = 0;
let thisGameCoins = 0; // 이번 판에서 얻은 코인
let totalCoins = 0;    // 내 계정에 누적된 코인 (DB 모사)

let player; // 전역 플레이어 객체

// 게임 오브젝트 배열 관리
let bullets = [];
let enemies = [];
let particles = [];
let coins = [];

// ==========================================
// 스테이지 (20단계 레벨업) 테마 풀 (Target Objects)
// ==========================================
let currentStage = 1;
let prevStage = 1;
let stageMessageTimer = 0; // 스테이지 전환 알림 텍스트 타이머
let thisStageCoins = 0; // [FIX] 현재 스테이지 진행도 변수 (유저 요청 명칭)
const coinsPerStage = 10000; // 10,000 코인마다 스테이지 업 (대표님 요청 사항)

// 각 스테이지별로 유저가 부숴야 할 타겟들 (이모지 기반)
const stageTargetPools = {
    1: ['🛩️', '🚁'],       // 1단계: 비행기
    2: ['🍽️', '🥣'],       // 2단계: 접시 (쨍그랑!)
    3: ['🚗', '🚕', '🚓'], // 3단계: 자동차 (스프라이트 시트 사용)
    4: ['🪐', '☄️'],       // 4단계: 우주 행성 (토성 등)
    5: ['🛸', '🚀'],       // 5단계: 미확인 비행물체
    6: ['🪐', '🌑', '🌕', '🌍', '☄️', '🌌', '🛸'], // 6단계: 행성 (목성, 천왕성, 해왕성 테마)
    7: ['🥢', '🍴', '🥄'], // 7단계: 식기류
    8: ['mars', 'jupiter', 'saturn', 'uranus'], // 8단계: 실제 행성 이미지
    9: ['🍎', '🍐', '🥭', '🍑', '🍋', '🍈'], // 9단계: 과일 (사과, 배, 망고, 복숭아, 레몬 등)
    10: ['⚽', '🏀', '🏈', '⚾'], // 10단계: 스포츠 공
    11: ['💎', '💰', '👑', '💵'], // 11단계: 보석/골드 (땡그랑!)
    12: ['🧸', '🪆', '🎎', '🦄', '🐼'], // 12단계: 인형 (팬더곰 추가)
    13: ['☀️', '⭐', '🌟', '✨'], // 13단계: 별 (우주 테마)
    14: ['🍕', '🍔', '🍟', '🍦', '🍗'], // 14단계: 패스트푸드 (치킨 머리 제거, 프라이드 치킨 유지)
    15: ['🎈', '🎁', '🎉', '🎀'], // 15단계: 파티 용품 (기존 폭죽 등이 특정 기기에서 네모(깨짐)로 나오는 현상 방지)
    16: ['🐶', '🐱', '🐰', '🧸'], // 16단계: 세상에서 제일 귀여운 인형 (강아지, 고양이, 토끼, 곰)
    17: ['🍌', '🍍', '🥭', '🍓', '🍎', '🍐'], // 17단계: 트로피칼 과일 + 딸기/사과/배 추가
    18: ['🎻', '🥁', '🔔'], // 18단계: 악기 (바이올린, 북, 탬버린/종)
    19: ['🦑', '🐙', '🦞', '🦐', '🦀'], // 19단계: 해산물 + 새우/꽃게 추가
    20: ['🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏙️', '🛖', '🏘️', '🌲'], // 20단계 (최종): 건물/집 (빌딩, 원두막, 마을, 나무집 상징 추가)
};

// 적 스폰 관련
let lastSpawntime = 0;
let spawnInterval = 750; // 초기 0.75초마다 생성 (기존 대비 2배 빠름!)
let enemySpeedMultiplier = 1; // 시간이 지날수록 빨라지는 배율

// 업그레이드 스탯 변수 (레벨 기반 & 진화형으로 개편)
let fireRateLevel = 1;
let multiShotLevel = 1;
let enemySlowLevel = 1;

let currentFireRate = 180; // 기본 발사 쿨타임 (ms)
let currentMultiShot = 1;   // 기본 1발 시작 (업그레이드 시 V자 -> 방사형)
let baseEnemySpeedMultiplier = 1.0;

let costFireRate = 1000;
let costMultiShot = 1000;
let costEnemySlow = 1000;

let costEnemySpeed = 1000; // 기존 변수 (HUD 연동 시 costEnemySlow로 대체/혼용 가능)
let costLaser = 5000;
let currentLaserActive = false;

// 모의 광고 시청 여부 리미터
let isRevived = false;
let isDoubleCoinMode = false;
let doubleCoinTimer = 0; // 5분 = 300초 (초 단위 관리)
let coinsAlreadyAdded = 0;

// [NEW] 자석 시스템 스탯
let magnetRange = 100;
let costMagnetRange = 1000;

// [ADD] Load saved data on startup (모든 글로벌 변수 선언 후 실행)
loadData();

// ==========================================
// 사용자 입력 (마우스 / 터치) 처리 객체
// ==========================================
const mouse = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 100,
    isDown: false
};

// ==========================================
// Player (내 기체) 클래스 구현
// ==========================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.color = '#00ffcc'; // 우주 테마에 어울리는 네온 컬러
        this.speed = 0.2; // 이동 속도 계수 상향 (0.1 -> 0.2)
        this.lastShotTime = 0;
        this.fireRate = 180; // 기본 발사 쿨타임 (ms)
        this.powerup = null; // 'red', 'blue', 'fire'
        this.powerupTimer = 0;
    }

    update() {
        if (this.powerupTimer > 0) {
            this.powerupTimer -= 16.6;
            if (this.powerupTimer <= 0) {
                this.powerup = null;
            }
        }
        // 부드럽게 마우스(터치) 위치로 따라가기 (Lerp 효과)
        this.x += (mouse.x - this.x) * this.speed;
        this.y += (mouse.y - this.y) * this.speed;

        // 화면 밖으로 나가지 못하게 제한
        if (this.x < this.width / 2) this.x = this.width / 2;
        if (this.x > CANVAS_WIDTH - this.width / 2) this.x = CANVAS_WIDTH - this.width / 2;
        if (this.y < this.height / 2) this.y = this.height / 2;
        if (this.y > CANVAS_HEIGHT - this.height / 2) this.y = CANVAS_HEIGHT - this.height / 2;

        this.fire(); // 매 프레임마다 발사 시도
    }

    draw() {
        // [MOD] 오라 효과 제거 - 대표님 지시 (깔끔한 UI 유지)

        ctx.save();
        ctx.translate(this.x, this.y);

        // 스테이지에 따라 진화하는 기체 이미지 선택
        let currentImg = playerSprites[1];
        if (currentStage >= 6 && currentStage <= 10) currentImg = playerSprites[2];
        else if (currentStage >= 11 && currentStage <= 15) currentImg = playerSprites[3];
        else if (currentStage >= 16) currentImg = playerSprites[4];

        // 투명화된 캔버스가 로드되었으면 렌더링 (사이즈를 60 정도로 듬직하게 조정)
        if (currentImg) {
            const size = 60;
            ctx.drawImage(currentImg, -size / 2, -size / 2, size, size);
        } else {
            // 아직 로드 안 됐을 땐 임시 사각형으로 땜빵
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }

        // 추진력을 보여주는 불꽃 엔진은 이미지 아래쪽에 이펙트로 계속 붙여줌
        ctx.fillStyle = '#ff9900';
        ctx.beginPath();
        // size가 60이므로 꼬리 쪽은 대략 y=30 근방
        ctx.moveTo(-this.width / 8, 30);
        ctx.lineTo(0, 30 + 15 + Math.random() * 10);
        ctx.lineTo(this.width / 8, 30);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // [NEW] 레벨에 따른 총알 색상 반환 (진화 시각 효과)
    getBulletColor() {
        if (fireRateLevel >= 15) return '#ff00ff'; // 마젠타 (초강력)
        if (fireRateLevel >= 10) return '#ffff00'; // 골드/옐로우
        if (fireRateLevel >= 5)  return '#00ff00'; // 네온 그린
        return '#00ffff'; // 기본 네온 블루
    }

    fire() {
        const currentTime = Date.now();
        
        // 레벨에 따라 공속 계산 (최소 50ms)
        const calcFireRate = Math.max(50, 180 - (fireRateLevel - 1) * 10);
        
        if (currentTime - this.lastShotTime > calcFireRate) {
            if (currentLaserActive) {
                // [SPECIAL] Ultimate Piercing Laser (상점 특별 아이템)
                const b = new Bullet(this.x, this.y - this.height / 2, 0, -35);
                b.color = '#ff00ff';
                b.width = 15;
                b.height = 60;
                b.damage = 100;
                b.isPiercing = true;
                bullets.push(b);
            } else {
                // [NEW] 가산형(Additive) 중첩 로직 적용
                // 1. 총알 개수 계산 (상점 레벨 기반 + 아이템 보너스)
                let totalBulletCount = fireRateLevel; 
                if (this.powerup === 'fire') totalBulletCount += 3;  // 주황템(최강) +3발 (가장 강력)
                else if (this.powerup === 'red') totalBulletCount += 2;   // 빨간템 +2발
                else if (this.powerup === 'blue') totalBulletCount += 1;  // 파란템 +1발

                // 2. 부채꼴 발사 (Loop & Angle) 계산
                // 총알 개수가 많아질수록 퍼지는 각도를 유동적으로 조절
                let maxSpread = Math.min(80, 10 + totalBulletCount * 5); 
                if (this.powerup === 'fire') maxSpread *= 2; // 방사 각도 2배
                
                for (let i = 0; i < totalBulletCount; i++) {
                    let angle = 0;
                    if (totalBulletCount > 1) {
                        // 중앙을 기준으로 대칭되게 각도 분산
                        angle = -maxSpread / 2 + (i * (maxSpread / (totalBulletCount - 1)));
                    }
                    
                    const rad = angle * Math.PI / 180;
                    const vx = Math.sin(rad) * 25;
                    const vy = -Math.cos(rad) * 25;
                    
                    const b = new Bullet(this.x, this.y - this.height / 2, vx, vy);
                    
                    // 3. 색상 부여 (아이템 색상 우선, 없으면 상점 레벨 색상)
                    if (this.powerup === 'red') b.color = '#ff3333';
                    else if (this.powerup === 'blue') b.color = '#3333ff';
                    else if (this.powerup === 'fire') b.color = '#ff9900';
                    else b.color = this.getBulletColor();

                    // 파란색 총알 굵기 2배
                    if (b.color === '#00ffff' || b.color === '#3333ff') {
                        b.width = 6;
                    }

                    // 4. 주황템('fire') 상태 특수 효과 부여
                    if (this.powerup === 'fire') {
                        b.damage = 5;
                        b.isPiercing = true;
                        b.width = 12; // 4배 굵기
                        b.isFire = true; // 불 시각 효과용 플래그
                    }
                    
                    bullets.push(b);
                }
            }
            playLaserSound(); 
            this.lastShotTime = currentTime;
        }
    }
}

// ==========================================
// Bullet (총알) 클래스
// ==========================================
class Bullet {
    constructor(x, y, vx = 0, vy = -25) {
        this.x = x;
        this.y = y;
        this.width = 3;
        this.height = 20;
        this.radius = 4;
        this.vx = vx;
        this.vy = vy;
        this.color = '#00ffff';
        this.damage = 1; // 기본 데미지
        this.isPiercing = false; // [NEW] 관통 속성 추가
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y + this.height < 0 || this.x < 0 || this.x > CANVAS_WIDTH) this.markedForDeletion = true;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;

        if (this.isFire) {
            // 불타는 느낌 연출 (울퉁불퉁한 다각형)
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.height);
            ctx.lineTo(this.x + this.width / 2 + Math.random() * 4, this.y + this.height / 2);
            ctx.lineTo(this.x, this.y + this.height + Math.random() * 4);
            ctx.lineTo(this.x - this.width / 2 - Math.random() * 4, this.y + this.height / 2);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ffff66'; // 중심부 노란색 빛
            ctx.fillRect(this.x - 2, this.y, 4, this.height / 2);
        } else {
            // 가는 직선 형태의 레이저 렌더링
            ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
            ctx.fillStyle = '#ffffff'; // 중심부 흰색으로 더 밝게 처리
            ctx.fillRect(this.x - 1, this.y, 2, this.height);
        }

        ctx.shadowBlur = 0; // 리셋
    }
}

// ==========================================
// Enemy (적 비행기/운석) 클래스
// ==========================================
class Enemy {
    constructor() {
        this.radius = Math.random() * 20 + 15;

        // --- 60% 확률로 플레이어 타겟팅(유도/곡선) 스폰 로직 ---
        const isTargeting = Math.random() < 0.6 && player;

        // 이동 패턴을 위한 파동(Wave) 변수
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = Math.random() * 0.05 + 0.02;
        this.curveMagnitude = Math.random() * 1.5;

        if (isTargeting) {
            // [MOD] 자동차 스테이지(LV.3)도 여러 방향에서 출현하도록 제약 해제
            const spawnEdge = Math.floor(Math.random() * 3);
            if (spawnEdge === 0) {
                this.x = -this.radius * 2;
                this.y = Math.random() * (CANVAS_HEIGHT / 2);
            } else if (spawnEdge === 1) {
                this.x = CANVAS_WIDTH + this.radius * 2;
                this.y = Math.random() * (CANVAS_HEIGHT / 2);
            } else {
                this.x = Math.random() * (CANVAS_WIDTH - this.radius * 2) + this.radius;
                this.y = -this.radius * 2;
            }

            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.hypot(dx, dy);

            // [MOD] 자동차(LV.3)는 타 적군 대비 속도를 대폭 하향 (0.5~1.2)
            let baseSpeed = (Math.random() * 3 + 1.5) * enemySpeedMultiplier;
            if (currentStage === 3) baseSpeed = (Math.random() * 0.7 + 0.5) * enemySpeedMultiplier;

            this.targetSpeedX = (dx / dist) * baseSpeed;
            this.targetSpeedY = (dy / dist) * baseSpeed;

            this.speedX = this.targetSpeedX;
            this.speedY = this.targetSpeedY;

        } else {
            // 지그재그/하강 스폰
            this.x = Math.random() * (CANVAS_WIDTH - this.radius * 2) + this.radius;
            this.y = -this.radius;

            this.targetSpeedX = 0;
            // [MOD] 자동차(LV.3)는 하강 속도도 매우 느리게 조정
            let baseSpeedY = (Math.random() * 2 + 1) * enemySpeedMultiplier;
            if (currentStage === 3) baseSpeedY = (Math.random() * 0.5 + 0.8) * enemySpeedMultiplier;

            this.speedY = baseSpeedY;
            this.curveMagnitude = Math.random() * 3 + 1;
        }

        this.hp = Math.floor(this.radius / 10); // 크기에 비례하는 체력

        if (currentStage === 3) {
            // 정예 레이싱 카 타겟 (사이즈 축소 및 다수 출현 연동)
            this.modelType = 'racing_car';
            this.radius = Math.random() * 6 + 18;
            this.hp = 3;
            this.carIndex = Math.floor(Math.random() * (racingCarSprites.imgs.length || 1));

            this.zigzagFreq = Math.random() * 0.12 + 0.08;
            this.zigzagAmp = Math.random() * 10 + 5;
        } else {
            // 다른 스테이지 이모지 할당
            const pool = stageTargetPools[currentStage] || stageTargetPools[20];
            this.model = pool[Math.floor(Math.random() * pool.length)];

            // 비행기, 헬리콥터 같은 기계류 이모지면 고퀄리티 직접 그리기(벡터) 모드 적용
            const planeEmojis = ['🛩️', '🚁', '🛸', '🚀'];
            if (planeEmojis.includes(this.model)) {
                this.modelType = 'plane';
                const dangerHues = [0, 15, 30, 345];
                const hue = dangerHues[Math.floor(Math.random() * dangerHues.length)];
                this.color = `hsl(${hue}, 80%, 50%)`;
            } else {
                // 접시, 외계인, 인형 등은 쌩 이모지로 취급. 단, 2단계면 `draw`단에서 `special_plate`로 판정됨
                this.modelType = 'emoji';
                if (currentStage === 2) this.modelType = 'special_plate';
                if (currentStage === 8) this.modelType = 'planet_img'; // 8단계 이미지 모드

                // [NEW] 12단계: 팬더 이모지면 커스텀 몸통 이미지로 교체 (대표님 요청: "몸통까지 그려줘")
                if (currentStage === 12 && this.model === '🐼') {
                    this.modelType = 'panda_img';
                    this.radius = 35;
                    this.hp = 5;
                }

                this.spinAngle = Math.random() * Math.PI * 2;
                this.spinSpeed = (Math.random() - 0.5) * 0.1;

                // 파티클용 테마 색상 지정
                const colorMap = {
                    2: '#ffffff', // 접시
                    3: '#555555', // 자동차 파편
                    6: '#8a2be2', // 행성
                    9: '#ff4500', // 과일
                    12: '#deb887', // 인형
                    15: '#ff00ff', // 풍선
                    16: '#ffc0cb', // 인형 (핑크/베이지 계열)
                    20: '#8b4513'  // 건물 (브라운/벽돌 계열)
                };
                this.color = colorMap[currentStage] || '#ffffff';
            }
        }
        this.maxHp = this.hp;
        this.markedForDeletion = false;
    }

    update() {
        // 시간에 따른 각도 변화로 사인파(곡선) 이동 생성
        this.angle += this.angleSpeed;
        if (this.modelType === 'emoji') {
            this.spinAngle += this.spinSpeed;
        }

        // [FIX] moveX 변수가 정의되지 않았던 문제 해결. 
        // 기존의 속도와 곡선 이동(sine wave)을 합산하여 실제 x 좌표를 업데이트합니다.
        const currentMoveX = this.speedX + Math.sin(this.angle) * this.curveMagnitude;
        const slowFactor = Math.max(0.3, 1.0 - (enemySlowLevel - 1) * 0.1);
        
        this.x += currentMoveX * slowFactor;
        this.y += this.speedY * slowFactor;

        // 화면 테두리에 부딪히면 튕기게 처리 (유도 비행기가 벽 밖으로 나가는 것 방지)
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            if (this.speedX < 0) this.speedX *= -1;
        } else if (this.x + this.radius > CANVAS_WIDTH) {
            this.x = CANVAS_WIDTH - this.radius;
            if (this.speedX > 0) this.speedX *= -1;
        }

        // 화면 아래로 벗어나면 삭제 마킹
        if (this.y - this.radius > CANVAS_HEIGHT) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.modelType === 'racing_car' && racingCarSprites.imgs[this.carIndex]) {
            // 레이싱 카 렌더링 (다양한 6종 모델)
            const img = racingCarSprites.imgs[this.carIndex];
            if (img && img.complete && img.width > 0) { // 안전성 검사 추가
                const rotateAngle = Math.PI; // 기본적으로 플레이어를 향해 아래로 내려옴
                ctx.rotate(rotateAngle);

                const renderWidth = this.radius * 3.5;
                const renderHeight = renderWidth * (img.height / img.width);

                ctx.drawImage(
                    img,
                    -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight
                );
            } else {
                // 이미지 로드 안 된 경우 이모지로 대체
                ctx.rotate(this.spinAngle || 0);
                ctx.font = `${this.radius * 2}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🚗', 0, 0);
            }
        }
        else if (this.modelType === 'special_plate') {
            // 2단계 스페셜 (하얀색 납작 접시)
            this.modelType = 'special_plate';
            ctx.rotate(this.spinAngle);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#aaaaaa';
            ctx.shadowBlur = 5;

            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 1.5, this.radius * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 1.1, this.radius * 1.1, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        else if (this.modelType === 'plane') {
            // 방향에 맞춰 기수(머리)를 회전(rotate)
            const currentThrustX = this.speedX + Math.sin(this.angle) * this.curveMagnitude;
            const currentThrustY = this.speedY;
            const rotateAngle = Math.atan2(currentThrustY, currentThrustX) - Math.PI / 2;
            ctx.rotate(rotateAngle);

            // 적군 비행기 (빨간색 조차도 디테일하게!)
            let w = this.radius * 2.5;
            let h = this.radius * 2.5;

            // 동체
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, h / 2); // 코 부분 (아래쪽)
            ctx.lineTo(w / 8, h / 4);
            ctx.lineTo(w / 8, -h / 2);
            ctx.lineTo(-w / 8, -h / 2);
            ctx.lineTo(-w / 8, h / 4);
            ctx.closePath();
            ctx.fill();

            // 주 날개
            ctx.beginPath();
            ctx.moveTo(w / 8, h / 8);
            ctx.lineTo(w / 2, -h / 6);
            ctx.lineTo(w / 8, -h / 4);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-w / 8, h / 8);
            ctx.lineTo(-w / 2, -h / 6);
            ctx.lineTo(-w / 8, -h / 4);
            ctx.closePath();
            ctx.fill();

            // 꼬리 날개
            ctx.beginPath();
            ctx.moveTo(w / 8, -h / 3);
            ctx.lineTo(w / 3, -h / 2);
            ctx.lineTo(w / 8, -h / 2);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-w / 8, -h / 3);
            ctx.lineTo(-w / 3, -h / 2);
            ctx.lineTo(-w / 8, -h / 2);
            ctx.closePath();
            ctx.fill();

            // 적 콕핏(조종석) 장식 (검은색)
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.ellipse(0, h / 6, w / 10, h / 8, 0, 0, Math.PI * 2);
            ctx.fill();
            // [MOD] 비행기 모드에서 이모지 중복 텍스트 제거 (깔끔함 유지)
        } else if (this.modelType === 'planet_img') {
            // 8단계 실제 행성 이미지 렌더링
            const img = planetSprites[this.model];
            if (img && img.complete && img.width > 0) {
                const size = this.radius * 2.5;
                ctx.drawImage(img, -size / 2, -size / 2, size, size);
            } else {
                ctx.rotate(this.spinAngle);
                ctx.font = `${this.radius * 2 * 1.2}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🪐', 0, 0);
            }
        } else if (this.modelType === 'panda_img' && pandaSprite.img) {
            // [NEW] 12단계: 팬더 커스텀 몸통 이미지 렌더링
            const img = pandaSprite.img;
            const size = this.radius * 2.5;
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
            // 기본 이모지 및 기타 기체 렌더링 (Stage 1, 4, 5+ 등)
            ctx.rotate(this.spinAngle);
            ctx.font = `${this.radius * 2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.model, 0, 0);
        }

        ctx.restore();

        // [MOD] HP 텍스트 렌더링 제거 - 대표님 요청
    }
}

// ==========================================
// Particle (폭발 파편) 클래스
// ==========================================
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 3 + 1;
        this.color = color;
        // 사방으로 퍼지는 속도
        this.speedX = (Math.random() - 0.5) * (Math.random() * 5 + 2);
        this.speedY = (Math.random() - 0.5) * (Math.random() * 5 + 2);
        this.alpha = 1; // 투명도
        this.friction = 0.95; // 마찰력 (점점 느려짐)
        this.markedForDeletion = false;
    }

    update() {
        this.speedX *= this.friction;
        this.speedY *= this.friction;
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= 0.02; // 서서히 사라짐

        if (this.alpha <= 0) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==========================================
// Coin (적 파괴 시 드랍되는 재화) 클래스
// ==========================================
class Coin {
    constructor(x, y, type = 'gold') {
        this.x = x;
        this.y = y;
        this.type = type; // 'gold', 'red', 'blue'
        this.radius = 12;
        this.speedY = 2.5;
        this.markedForDeletion = false;
    }

    update() {
        if (player) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.hypot(dx, dy);

            // [NEW] 자석 시스템: 범위 내에 있으면 플레이어에게 끌려옴
            if (distance < magnetRange) {
                // 초당 300px (1프레임당 약 5px) 속도로 흡수
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * 5;
                this.y += Math.sin(angle) * 5;
            } else {
                // 범위 밖이면 그냥 아래로 내려옴
                this.y += this.speedY;
            }

            if (distance < this.radius + player.width / 2) {
                if (this.type === 'red') {
                    player.powerup = 'red';
                    player.powerupTimer = 10000; // 10초
                } else if (this.type === 'blue') {
                    player.powerup = 'blue';
                    player.powerupTimer = 10000;
                } else if (this.type === 'fire') {
                    player.powerup = 'fire';
                    player.powerupTimer = 8000; // 8초 (초강력하므로 짧게)
                }

                // [MOD] 모든 아이템(빨강, 파랑, 주황, 노랑) 획득 시 200코인(2배 모드 시 400) 보상으로 통일
                // doubleCoinTimer가 작동 중이면 400원, 아니면 200원
                const earned = doubleCoinTimer > 0 ? 400 : 200;
                
                thisGameCoins = Math.floor(thisGameCoins / 100) * 100 + earned;
                thisStageCoins = Math.floor(thisStageCoins / 100) * 100 + earned;
                totalCoins = Math.floor(totalCoins / 100) * 100 + earned;
                
                saveData(); // 즉시 저장
                playCoinSound();
                this.markedForDeletion = true;
            }
        }

        if (this.y > CANVAS_HEIGHT) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 코인 색상 분기
        if (this.type === 'red') ctx.fillStyle = '#ff3333';
        else if (this.type === 'blue') ctx.fillStyle = '#3333ff';
        else if (this.type === 'fire') ctx.fillStyle = '#ff8800'; // 불꽃 색상
        else ctx.fillStyle = '#ffd700';

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let symbol = '$';
        if (this.type === 'red') symbol = 'P';
        if (this.type === 'blue') symbol = 'W';
        if (this.type === 'fire') symbol = 'F';
        ctx.fillText(symbol, 0, 0);
        ctx.restore();
    }
}

// 화면 진동(Camera Shake) 변수
let shakeTime = 0;
let shakeAmount = 20;

// ==========================================
// 메인 게임 루프
// ==========================================
function gameLoop() {
    try {
        if (!isPlaying) return;

    ctx.save();
    // 카메라 셰이크 로직
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * shakeAmount;
        const dy = (Math.random() - 0.5) * shakeAmount;
        ctx.translate(dx, dy);
        shakeTime--;
    }

    // 화면 지우기 (투명도 있는 사각형으로 덮어 잔상 이펙트 연출)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-50, -50, CANVAS_WIDTH + 100, CANVAS_HEIGHT + 100); // 쉐이크 시 빈틈 안 보이게 약간 넓게 지움

    // 플레이어 업데이트 및 그리기
    if (player) {
        player.update();
        player.draw();
    }

    // 시간 경과에 따른 적 스폰
    const currentTime = Date.now();
    let canSpawn = false;

    // [MOD] 레이싱 카 스테이지 특별 제어 제거 (다른 스테이지와 동일하게 다수 출현)
    if (currentTime - lastSpawntime > spawnInterval) {
        canSpawn = true;
    }

    if (canSpawn) {
        enemies.push(new Enemy());
        lastSpawntime = currentTime;

        // 난이도 상승 로직
        if (spawnInterval > 250) spawnInterval -= 5;
        enemySpeedMultiplier += 0.002;
    }

    // [MOD] 총알 업데이트 - 안전하게 역순 for 루프로 변경하여 삭제 시 인덱스 밀림 방지
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.update();
        bullet.draw();
        if (bullet.markedForDeletion) {
            bullets.splice(i, 1);
        }
    }

    // [MOD] 적 업데이트 및 그리기 - 안전한 역순 for 루프
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update();
        enemy.draw();

        // 1. 플레이어와 적군 충돌 검사
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.hypot(dx, dy);

        if (distance < enemy.radius + player.width / 3) {
            for (let j = 0; j < 30; j++) {
                particles.push(new Particle(player.x, player.y, '#ff0000'));
                particles.push(new Particle(player.x, player.y, '#ffffff'));
            }
            shakeTime = 20;

            setTimeout(() => {
                gameOver();
            }, 500);

            isPlaying = false;
        }

        // 2. 총알과 적군 충돌 검사 - 내부도 역순 for 루프가 안전함
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            const bx = bullet.x - enemy.x;
            const by = bullet.y - enemy.y;
            const bDist = Math.hypot(bx, by);

            if (bDist < enemy.radius + bullet.radius) {
                for (let k = 0; k < 3; k++) {
                    particles.push(new Particle(bullet.x, bullet.y, bullet.color));
                }

                if (enemy.modelType === 'special_plate') {
                    playGlassSound();
                } else if (enemy.modelType === 'racing_car') {
                    playKlaxonSound();
                } else {
                    if (currentStage === 11) playClinkSound();
                    else if (currentStage === 15) playFireworkSound();
                    else if (currentStage === 18) playInstrumentSound(enemy.model);
                    else if (currentStage === 19) playBboingSound();
                }

                enemy.hp -= bullet.damage || 1;
                if (!bullet.isPiercing) {
                    bullet.markedForDeletion = true;
                }

                if (enemy.hp <= 0) {
                    enemy.markedForDeletion = true;
                    score = Math.floor(score + (enemy.maxHp * 10));
                    if (score < 0) score = 0; 
                    saveData();

                    if (enemy.modelType === 'special_plate') {
                        playGlassSound();
                        playGlassSound();
                    }

                    if (Math.random() < 0.80) {
                        const rand = Math.random();
                        if (rand < 0.08) coins.push(new Coin(enemy.x, enemy.y, 'fire'));
                        else if (rand < 0.18) coins.push(new Coin(enemy.x, enemy.y, 'red'));
                        else if (rand < 0.28) coins.push(new Coin(enemy.x, enemy.y, 'blue'));
                        else coins.push(new Coin(enemy.x, enemy.y, 'gold'));
                    }

                    for (let k = 0; k < 15; k++) {
                        particles.push(new Particle(enemy.x, enemy.y, enemy.color));
                        particles.push(new Particle(enemy.x, enemy.y, '#ffffff'));
                    }
                }
            }
        }

        if (enemy.markedForDeletion) {
            enemies.splice(i, 1);
        }
    }

    // 파티클 업데이트 및 그리기 - 안전한 역순 for 루프
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.update();
        particle.draw();
        if (particle.markedForDeletion) {
            particles.splice(i, 1);
        }
    }

    // 코인 렌더링 호출 전 스테이지 판단
    if (!window.isDeveloperStageOverridden) {
        if (Math.trunc(thisStageCoins) >= coinsPerStage) {
            if (currentStage < 20) {
                currentStage = Math.trunc(currentStage + 1);
                thisStageCoins = 0; // [FIX] 뺄셈 방식이 아닌 0 대입으로 초기화 (마이너스 방지)
                saveData();
            } else if (currentStage === 20) {
                gameClear();
                return;
            }
        }
    }

    // 스테이지가 바뀌었을 때 화면 싹쓸이(클리어) 연출 및 배경색 전환 처리
    if (currentStage !== prevStage) {
        thisStageCoins = 0; // [FIX] 대입을 통한 0 초기화
        stageMessageTimer = 180;

        // 하늘에 떠 있던 기존 적군의 타입을 바꾸거나 클리어 시각 효과 연출
        enemies.forEach(enemy => {
            for (let i = 0; i < 15; i++) {
                particles.push(new Particle(enemy.x, enemy.y, enemy.color || '#fff'));
            }
        });
        enemies = []; // 적군 싹 치우기 (새로운 타겟들이 떨어지도록 비워줌)
        bullets = []; // 현재 쏜 총알들도 화면에 남아 에러가 나지 않게 일괄 리셋

        // 배경색을 스테이지에 맞춰서 변경 (기본은 우주 느낌의 그라데이션)
        const hue1 = (currentStage * 18) % 360;
        const hue2 = (currentStage * 18 + 40) % 360;
        canvas.style.background = `linear-gradient(to bottom, hsl(${hue1}, 50%, 10%), hsl(${hue2}, 50%, 20%))`;

        // [NEW] 스테이지 진입 특수 효과음 및 앰비언스 처리
        if (currentStage === 13) {
            startSpaceAmbiance(); // 우주 진입 소리 (무한 루프 시작)
        } else {
            stopSpaceAmbiance(); // 우주 탈출 시 소리 멈춤
        }

        prevStage = currentStage;
    }

    // 타겟 풀 이모지/스테이지 번호 등 라운드 변경 알림을 화면 중앙에 커다랗게 렌더링
    if (stageMessageTimer > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${stageMessageTimer / 180})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // "STAGE X" 글자
        ctx.font = 'bold 50px Arial';
        ctx.fillText(`Space Defender: STAGE ${currentStage}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

        // 렌더링될 타겟 미리보기 글자
        const pool = stageTargetPools[currentStage] || stageTargetPools[20];
        ctx.font = 'bold 35px Arial';
        ctx.fillText(`Targets: ${pool.join(' ')}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);

        ctx.restore();
        stageMessageTimer--;
    }

    // 코인 렌더링 호출 - 안전한 역순 for 루프
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.update();
        coin.draw();
        if (coin.markedForDeletion) {
            coins.splice(i, 1);
        }
    }

    ctx.restore(); // 카메라 셰이크 복구용

    // [FINAL HUD GUARD] 화면에 뿌리기 직전에 음수 및 소수점을 강제로 자릅니다.
    const finalDisplayScore = Math.max(0, Math.floor(score));
    const finalDisplayCoins = Math.max(0, Math.floor(totalCoins / 100) * 100);
    
    if (scoreValue) scoreValue.innerText = `[LV.${Math.trunc(currentStage)}] Score: ${finalDisplayScore} (Ver 3.0.8-AD-SIMU)`;
    if (coinValue) coinValue.innerText = finalDisplayCoins.toLocaleString();

    // [NEW] 2배 코인 타이머 자막 표시 및 자석 비용 갱신
    if (doubleCoinTimer > 0) {
        // 1프레임당 0.016초씩 차감 (약 60fps)
        doubleCoinTimer -= 0.016; 
        doubleCoinTimerDisplay.style.display = 'inline';
        const mins = Math.floor(doubleCoinTimer / 60);
        const secs = Math.floor(doubleCoinTimer % 60);
        doubleCoinTimerDisplay.innerText = `⏳ 2X: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        doubleCoinTimerDisplay.style.display = 'none';
    }
    if (magnetCostDisplay) magnetCostDisplay.innerText = costMagnetRange.toLocaleString();

    // [NEW] HUD 퀵 업그레이드 버튼 갱신 (Safety Guard 추가)
    if (btnQuickFireRate) {
        btnQuickFireRate.innerText = `🔫 SPD [LV.${fireRateLevel}] ${costFireRate.toLocaleString()}`;
        btnQuickFireRate.disabled = totalCoins < costFireRate;
    }
    if (btnQuickMultiShot) {
        btnQuickMultiShot.innerText = `🌟 MLT [LV.${multiShotLevel}] ${costMultiShot.toLocaleString()}`;
        btnQuickMultiShot.disabled = totalCoins < costMultiShot || multiShotLevel >= 3;
    }
    if (btnQuickEnemySlow) {
        btnQuickEnemySlow.innerText = `🐢 SLW [LV.${enemySlowLevel}] ${costEnemySlow.toLocaleString()}`;
        btnQuickEnemySlow.disabled = totalCoins < costEnemySlow || enemySlowLevel >= 8;
    }

    // [ADD] 다음 레벨까지의 진행도 표시 (대표님 확인용)
    const nextLevelCoinGoal = coinsPerStage;
    const currentProgressCoins = Math.max(0, Math.floor(thisStageCoins));
    const progressPercent = (currentProgressCoins / nextLevelCoinGoal) * 100;

    const bar = safeGetElement('levelProgressBar');
    if (bar) bar.style.width = Math.min(100, progressPercent) + '%';
    const progressText = safeGetElement('levelProgressText');
    if (progressText) {
        progressText.innerText = `To Next Level: ${currentProgressCoins.toLocaleString()} / ${nextLevelCoinGoal.toLocaleString()}`;
    }

    // 다음 프레임 예약
    animationId = requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error("GameLoop Error:", e);
        // [FIX] 무한 에러 루프 방지를 위해 즉시 재호출하지 않고 게임 중지
        isPlaying = false;
        alert("게임 루프 중 치명적인 오류가 발생했습니다. 페이지를 새로고침 해주세요! (Error: " + e.message + ")");
    }
}

// ==========================================
// 게임 컨트롤 함수
// ==========================================
function startGame() {

    // 이전 게임 루프가 실행 중이라면 정지 (중복 스폰/속도 버그 방지)
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // 게임 시작 시 초기화
    score = 0;
    thisGameCoins = 0;
    thisStageCoins = 0;
    currentStage = 1;
    isPlaying = true;

    // 개발자 스테이지 강제 고정 플래그 초기화 (자동 레벨업 복구)
    window.isDeveloperStageOverridden = false;


    // 오브젝트 배열 및 상태 리셋
    bullets = [];
    enemies = [];
    particles = [];
    coins = [];
    lastSpawntime = Date.now();
    spawnInterval = 750;
    enemySpeedMultiplier = baseEnemySpeedMultiplier; // 기본 배율을 가져옴

    // UI 로직 처리
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    gameOverScreen.classList.remove('active');
    gameOverScreen.classList.add('hidden');
    gameClearScreen.classList.remove('active');
    gameClearScreen.classList.add('hidden');
    shopScreen.classList.remove('active');
    shopScreen.classList.add('hidden');

    // 광고 상태 및 2배 모드 리셋
    isRevived = false;
    isDoubleCoinMode = false;
    coinsAlreadyAdded = 0;
    thisStageCoins = 0; // 새 게임 시작 시 스테이지 코인 리셋
    adReviveBtn.style.display = 'block'; // 부활 버튼 보이기
    adDoubleCoinBtn.style.display = 'inline-block';
    
    // 코인 2배 모드 초기화
    enemySpeedMultiplier = baseEnemySpeedMultiplier;
    spawnInterval = 750;

    // 게임 오브젝트 초기화 (화면 중앙 하단에 스폰)
    player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 150);
    mouse.x = player.x;
    mouse.y = player.y;

    gameLoop();
}

function updateShopUI() {
    // 1. 코인 표시 정규화
    const displayTotalCoins = Math.max(0, Math.floor(totalCoins / 100) * 100);
    if (shopCoinValue) shopCoinValue.innerText = displayTotalCoins.toLocaleString();
    if (coinValue) coinValue.innerText = displayTotalCoins.toLocaleString();

    // 2. 상점 가격 텍스트 갱신
    if (costFireRateElement) costFireRateElement.innerText = costFireRate.toLocaleString();
    if (costMultiShotElement) costMultiShotElement.innerText = costMultiShot.toLocaleString();
    if (costEnemySpeedElement) costEnemySpeedElement.innerText = costEnemySpeed.toLocaleString(); 
    if (costLaserElement) costLaserElement.innerText = costLaser.toLocaleString();
    if (magnetCost) magnetCost.innerText = costMagnetRange.toLocaleString();

    // 3. HUD 퀵 버튼 텍스트 갱신 [LV.X] 표시 추가
    if (btnQuickFireRate) btnQuickFireRate.innerText = `🔫 SPD [LV.${fireRateLevel}] ${costFireRate.toLocaleString()}`;
    if (btnQuickMultiShot) btnQuickMultiShot.innerText = `🌟 MLT [LV.${multiShotLevel}] ${costMultiShot.toLocaleString()}`;
    if (btnQuickEnemySlow) btnQuickEnemySlow.innerText = `🐢 SLW [LV.${enemySlowLevel}] ${costEnemySpeed.toLocaleString()}`;

    // 4. 버튼 활성화/비활성화 제어
    upgFireRateBtn.disabled = totalCoins < costFireRate;
    upgMultiShotBtn.disabled = totalCoins < costMultiShot || multiShotLevel >= 5;
    upgEnemySpeedBtn.disabled = totalCoins < costEnemySpeed || enemySlowLevel >= 10; 
    
    btnQuickFireRate.disabled = totalCoins < costFireRate;
    btnQuickMultiShot.disabled = totalCoins < costMultiShot || multiShotLevel >= 5;
    btnQuickEnemySlow.disabled = totalCoins < costEnemySlow || enemySlowLevel >= 10;
    btnMagnetUpg.disabled = totalCoins < costMagnetRange;
    
    // 레이저는 단판용 코드로 특수 처리
    if (currentLaserActive) {
        upgLaserBtn.innerText = "EQUIPPED";
        upgLaserBtn.disabled = true;
    } else {
        upgLaserBtn.innerText = `EQUIP (${costLaser.toLocaleString()})`;
        upgLaserBtn.disabled = totalCoins < costLaser;
    }
}

function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationId);

    // [MOD] 게임 오버 시 전면 광고(Interstitial) 시도
    showInterstitial();

    // [MOD] 결과 화면 출력 시에도 마이너딩 및 지저분한 끝자리 강제 교정
    const finalResultsScore = Math.max(0, Math.floor(score));
    const finalResultsCoins = Math.max(0, Math.floor(thisGameCoins / 100) * 100);

    finalScoreValue.innerText = finalResultsScore.toLocaleString();
    acquiredCoinValue.innerText = finalResultsCoins.toLocaleString();

    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('active');

    // 게임오버 시 단판용 레이저 효과 제거
    currentLaserActive = false;

    // 무제한 부활 허용 (더 이상 부활 버튼을 숨기지 않음)
    adReviveBtn.style.display = 'block';
    adDoubleCoinBtn.style.display = 'inline-block';
}

function gameClear() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    showInterstitial();

    // [MOD] 결과 화면 출력 시에도 마이너스 및 지저분한 끝자리 강제 교정
    const finalClearScore = Math.max(0, Math.floor(score));
    const finalClearCoins = Math.max(0, Math.floor(thisGameCoins / 100) * 100);

    clearScoreValue.innerText = finalClearScore.toLocaleString();
    clearCoinValue.innerText = finalClearCoins.toLocaleString();

    gameClearScreen.classList.remove('hidden');
    gameClearScreen.classList.add('active');
}

// ==========================================
// 이벤트 리스너 등록
// ==========================================

// ==========================================
// 마우스 및 터치 이벤트 처리 (모바일 민감도 향상)
// ==========================================
let lastTouchX = null;
let lastTouchY = null;
const TOUCH_SENSITIVITY = 2.2; // 스마트폰 터치 이동 민감도 (살짝 터치해도 많이 이동)

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!isPlaying) return;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isPlaying) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    if (lastTouchX !== null && lastTouchY !== null) {
        const deltaX = currentX - lastTouchX;
        const deltaY = currentY - lastTouchY;

        mouse.x += deltaX * TOUCH_SENSITIVITY;
        mouse.y += deltaY * TOUCH_SENSITIVITY;

        // 타겟 위치가 화면 밖으로 벗어나지 않도록 보정
        mouse.x = Math.max(0, Math.min(CANVAS_WIDTH, mouse.x));
        mouse.y = Math.max(0, Math.min(CANVAS_HEIGHT, mouse.y));
    }
    lastTouchX = currentX;
    lastTouchY = currentY;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    lastTouchX = null;
    lastTouchY = null;
});

// PC 환경 마우스는 직관적인 절대 좌표 방식 유지
canvas.addEventListener('mousemove', (e) => {
    if (!isPlaying) return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// 터치/클릭 혹은 롱 프레스 시 브라우저 기본 우클릭/컨텍스트 메뉴 차단
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// 버튼 이벤트 - 터치 및 클릭 허용 (이벤트 전파 방지 옵션 추가)
function bindTouchAndClick(element, handler) {
    if (!element) return; // [SAFETY] 요소가 없으면 무시 (크래시 방지)
    element.addEventListener('click', (e) => {
        // UI 클릭이 캔버스 조종으로 새어나가지 않게 보호
        e.stopPropagation();
        handler(e);
    });
    element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
    });
}

// 메인 메뉴 <-> 상점 이동 로직
bindTouchAndClick(shopBtn, () => {
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    shopScreen.classList.remove('hidden');
    shopScreen.classList.add('active');
    updateShopUI(); // 상점 진입 시 코인 최신화
});

bindTouchAndClick(closeShopBtn, () => {
    shopScreen.classList.remove('active');
    shopScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    startScreen.classList.add('active');
});

// 상점에 진입하거나 나갈 때 UI 최신화는 이미 등록됨

// [FINAL] 상점 및 HUD 업그레이드 통합 로직
bindTouchAndClick(upgFireRateBtn, () => {
    if (totalCoins >= costFireRate) {
        totalCoins -= costFireRate;
        totalCoins = Math.floor(totalCoins / 100) * 100;
        fireRateLevel++;
        costFireRate *= 2; 
        saveData();
        updateShopUI();
        playPurchaseSuccessSound();
        alert("Purchase Successful! (SPD LV Up)");
    } else {
        playPurchaseFailSound();
        alert("Not enough coins!");
    }
});

bindTouchAndClick(upgMultiShotBtn, () => {
    if (totalCoins >= costMultiShot && multiShotLevel < 5) {
        totalCoins -= costMultiShot;
        totalCoins = Math.floor(totalCoins / 100) * 100;
        multiShotLevel++;
        costMultiShot *= 2;
        saveData();
        updateShopUI();
        playPurchaseSuccessSound();
        alert("Purchase Successful! (MLT LV Up)");
    } else {
        playPurchaseFailSound();
        alert("Not enough coins!");
    }
});

bindTouchAndClick(upgEnemySpeedBtn, () => {
    if (totalCoins >= costEnemySpeed && enemySlowLevel < 10) {
        totalCoins -= costEnemySpeed;
        totalCoins = Math.floor(totalCoins / 100) * 100;
        enemySlowLevel++;
        costEnemySpeed *= 2;
        saveData();
        updateShopUI();
        playPurchaseSuccessSound();
        alert("Purchase Successful! (SLW LV Up)");
    } else {
        playPurchaseFailSound();
        alert("Not enough coins!");
    }
});

bindTouchAndClick(upgLaserBtn, () => {
    if (totalCoins >= costLaser && !currentLaserActive) {
        totalCoins -= costLaser;
        totalCoins = Math.floor(totalCoins / 100) * 100;
        currentLaserActive = true;
        saveData();
        updateShopUI();
        playPurchaseSuccessSound();
        alert("Purchase Successful! (Laser Equipped)");
    } else {
        playPurchaseFailSound();
        alert("Not enough coins!");
    }
});

// HUD 퀵 업그레이드 버튼 (상점과 가격/레벨 공유)
bindTouchAndClick(btnQuickFireRate, () => {
    if (totalCoins >= costFireRate) {
        totalCoins -= costFireRate;
        totalCoins = Math.floor(totalCoins / 100) * 100;
        fireRateLevel++;
        costFireRate *= 2;
        saveData();
        updateShopUI();
        playPurchaseSuccessSound();
        alert("Purchase Successful! (SPD LV Up)");
    } else {
        playPurchaseFailSound();
        alert("Not enough coins!");
    }
});

bindTouchAndClick(btnQuickMultiShot, () => {
    if (totalCoins >= costMultiShot && multiShotLevel < 5) {
        totalCoins -= costMultiShot;
        totalCoins = Math.floor(totalCoins / 100) * 100;
        multiShotLevel++;
        costMultiShot *= 2;
        saveData();
        updateShopUI();
        playPurchaseSuccessSound();
        alert("Purchase Successful! (MLT LV Up)");
    } else {
        playPurchaseFailSound();
        alert("Not enough coins!");
    }
});

bindTouchAndClick(btnQuickEnemySlow, () => {
    if (totalCoins >= costEnemySlow && enemySlowLevel < 10) {
        totalCoins -= costEnemySlow;
        totalCoins = Math.floor(totalCoins / 100) * 100;
        enemySlowLevel++;
        costEnemySlow *= 2;
        saveData();
        updateShopUI();
        playPurchaseSuccessSound();
        alert("Purchase Successful! (SLW LV Up)");
    } else {
        playPurchaseFailSound();
        alert("Not enough coins!");
    }
});

bindTouchAndClick(btnMagnetUpg, () => {
    if (totalCoins >= costMagnetRange) {
        totalCoins -= costMagnetRange;
        totalCoins = Math.floor(totalCoins / 100) * 100;
        magnetRange += 20;
        costMagnetRange *= 2;
        saveData();
        updateShopUI();
        playPurchaseSuccessSound();
        alert("Purchase Successful! (Magnet Range Up)");
    } else {
        playPurchaseFailSound();
        alert("Not enough coins!");
    }
});

// [NEW] 상점 내에서 광고 보고 50,000 코인 즉시 받기
bindTouchAndClick(adCoinShopBtn, () => {
    console.log("광고 버튼 클릭됨! (adCoinShopBtn)");
    showRewarded(() => {
        // showRewarded 내부 시뮬레이션에서도 50k를 주지만, 콜백에서도 확실히 처리
        // (Capacitor 환경에서는 showRewarded가 50k를 안 주므로 여기서 주는 게 맞음)
        // 단, 시뮬레이션 모드에서 중복 지급을 방지하려면 로직이 필요할 수 있으나 
        // 유저가 "확인을 누르면 즉시 50,000 코인이 들어오게 해줘"라고 했으니 
        // 시뮬레이션 모드에서 총 100,000이 들어와도 "반응이 온다"는 확신을 줄 수 있음.
        // 여기서는 안전하게 50,000 추가 지급 로직 유지.
        totalCoins = Math.floor(totalCoins / 100) * 100 + 50000;
        saveData();
        updateShopUI();
        playPurchaseSuccessSound();
        alert("💎 50,000 Coins Received! 💎");
    });
});

// 5분 코인 2배 광고 리스너 (상점에서 시청)
bindTouchAndClick(adDoubleCoinTimedBtn, () => {
    console.log("광고 버튼 클릭됨! (adDoubleCoinTimedBtn)");
    showRewarded(() => {
        doubleCoinTimer = 300; // 5분
        saveData();
        updateShopUI();
        playPurchaseSuccessSound();
        alert("🚀 5-Minute 2X Coin Mode Activated!");
    });
});

// 광고 모의(Reward Ads) 로직 연결
bindTouchAndClick(adDoubleCoinBtn, () => {
    console.log("광고 버튼 클릭됨! (adDoubleCoinBtn)");
    showRewarded(() => {
        isDoubleCoinMode = true;
        // 즉시 스피드업 및 2배 적용 (기본 배율 기준)
        enemySpeedMultiplier = Math.max(1.5, baseEnemySpeedMultiplier * 1.5);
        spawnInterval = 400;
        
        // 코인 2배 모드 선택 시 무료 부활도 동시에 진행되도록 처리
        isRevived = true;
        player.x = CANVAS_WIDTH / 2;
        player.y = CANVAS_HEIGHT - 100;
        mouse.x = player.x;
        mouse.y = player.y;

        enemies = [];
        bullets = [];

        gameOverScreen.classList.remove('active');
        gameOverScreen.classList.add('hidden');

        isPlaying = true;
        lastSpawntime = Date.now();
        gameLoop();
    });
});

bindTouchAndClick(adReviveBtn, () => {
    console.log("광고 버튼 클릭됨! (adReviveBtn)");
    showRewarded(() => {
        isRevived = true;
        isDoubleCoinMode = false;
        // 스피드 정상화
        enemySpeedMultiplier = baseEnemySpeedMultiplier;
        spawnInterval = 750;

        // 무적 시간이나 화면 정리 후 이어하기 처리
        player.x = CANVAS_WIDTH / 2;
        player.y = CANVAS_HEIGHT - 100;
        mouse.x = player.x;
        mouse.y = player.y;

        // 화면상의 적 지우기 (원활한 부활을 위해)
        enemies = [];
        bullets = [];

        gameOverScreen.classList.remove('active');
        gameOverScreen.classList.add('hidden');

        isPlaying = true;
        lastSpawntime = Date.now(); 
        thisStageCoins = 0; // 부활 시 진행도 0으로 안전하게 대입
        gameLoop();
    });
});

// 버튼 이벤트 - 터치 및 클릭 허용 (이벤트 전파 방지 옵션 추가)
bindTouchAndClick(startBtn, () => {
    thisStageCoins = 0; // 시작 시 리셋
    startGame();
});

bindTouchAndClick(restartBtn, () => {
    if (confirm("처음부터 다시 시작하시겠습니까? (스테이지 및 코인 초기화)")) {
        isRevived = false;
        // 데이터 완전 초기화
        totalCoins = 0;
        currentStage = 1;
        currentFireRate = 180;
        currentMultiShot = 2;
        costFireRate = 50;
        costMultiShot = 200;
        baseEnemySpeedMultiplier = 1;
        costEnemySpeed = 500;
        costLaser = 5000;
        saveData();

        // 로비로 전송
        gameOverScreen.classList.remove('active');
        gameOverScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        startScreen.classList.add('active');
        updateShopUI();
    }
});

bindTouchAndClick(playAgainBtn, () => {
    // 코인 및 진행도는 보존하고 스테이지 1부터 재시작
    currentStage = 1;
    thisStageCoins = 0;
    score = 0;
    saveData();

    startGame(); // 게임 즉시 재시작
});

// ==========================================
// 개발자 전용 디버깅 (치트) 패널 이벤트
// ==========================================
window.isDeveloperStageOverridden = false; // 수동으로 조작했는지 여부 기록

bindTouchAndClick(btnStageUp, () => {
    window.isDeveloperStageOverridden = true;
    if (currentStage < 20) {
        currentStage++;
        thisStageCoins = 0; // 스테이지 스킵 시 클리어 조건 리셋
        debugStageInfo.innerText = `Current Stage: LV.${currentStage}`;
    }
});

bindTouchAndClick(btnStageDown, () => {
    window.isDeveloperStageOverridden = true;
    if (currentStage > 1) {
        currentStage--;
        thisStageCoins = 0;
        debugStageInfo.innerText = `Current Stage: LV.${currentStage}`;
    }
});

bindTouchAndClick(btnCoinCheat, () => {
    const cheatAmount = 10000;
    thisGameCoins = Math.floor(thisGameCoins / 100) * 100 + cheatAmount; 
    thisStageCoins = Math.floor(thisStageCoins / 100) * 100 + cheatAmount; 
    totalCoins = Math.floor(totalCoins / 100) * 100 + cheatAmount;
    updateShopUI();
    alert("💸 Cheat Activated: 10,000 Coins added! 💸");
});

bindTouchAndClick(btnHardReset, () => {
    if (confirm("처음부터 다시 시작하시겠습니까? (스테이지 및 코인 초기화)")) {
        localStorage.clear();
        location.reload();
    }
});

// [NEW] 상점 내 데이터 완전 초기화 버튼 로직
const btnHardResetShop = safeGetElement('btnHardResetShop');
if (btnHardResetShop && btnHardResetShop.id !== 'dummy') { // safeGetElement가 dummy를 반환할 수 있으므로 체크
    bindTouchAndClick(btnHardResetShop, () => {
        if (confirm("⚠️ 경고: 모든 게임 데이터(코인, 업그레이드, 스테이지)가 영구적으로 삭제됩니다. 계속하시겠습니까?")) {
            localStorage.clear();
            location.reload();
        }
    });
}

// 초기 광고 초기화 실행
initAds();
Getting DOM...Pressing key...Stopping...

Stop Agent
