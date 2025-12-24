/**
 * لعبة عجلة الفواكه - الإصدار النهائي 4.0
 * حل كامل لمشكلة حالة اللعبة
 */

// ========== إعدادات اللعبة ==========
var GAME_CONFIG = {
    TIMER_INTERVAL: 1000,
    ROLL_INTERVAL: 100,
    COUNTDOWN_TIME: 10,
    GOLD_CHIPS: [1, 10, 100, 1000, 10000],
    FRUITS: ["g", "h", "a", "b", "c", "d", "e", "f"]
};

// ========== حالة اللعبة ==========
var GAME_STATE = {
    // حالة اللعبة: 'betting' (رهان), 'drawing' (سحب), 'result' (نتيجة), 'waiting' (انتظار)
    current: 'waiting',
    
    // معلومات الجولة
    round: 0,
    countdown: 10,
    
    // الرهانات
    selectedChip: 1,
    currentBets: [],
    totalBets: 0,
    
    // المؤقتات
    timers: {
        countdown: null,
        roll: null,
        hand: null,
        result: null
    },
    
    // معلومات اللاعب
    player: {
        balance: 0,
        profit: 0
    },
    
    // التتبع
    lastAction: null,
    lastError: null
};

// ========== الوظائف الأساسية ==========
function initGame() {
    console.log("🎮 تهيئة اللعبة...");
    
    // إعادة تعيين الحالة
    resetGameState();
    
    // تهيئة الواجهة
    setupUI();
    
    // ربط الأحداث
    bindEvents();
    
    // تحميل معلومات اللعبة
    loadGameInfo();
    
    console.log("✅ اللعبة جاهزة. الحالة:", GAME_STATE.current);
}

function resetGameState() {
    GAME_STATE = {
        ...GAME_STATE,
        current: 'waiting',
        round: 0,
        countdown: 10,
        selectedChip: 1,
        currentBets: [],
        totalBets: 0,
        lastAction: 'init',
        lastError: null
    };
    
    console.log("🔄 تم إعادة تعيين حالة اللعبة");
}

function setGameState(newState) {
    const oldState = GAME_STATE.current;
    GAME_STATE.current = newState;
    GAME_STATE.lastAction = `state_change:${oldState}->${newState}`;
    
    console.log(`🔄 تغيير الحالة: ${oldState} → ${newState}`);
    updateUIForState();
}

function canBet() {
    const canBetNow = GAME_STATE.current === 'betting' && GAME_STATE.countdown > 0;
    console.log(`🔍 يمكن الرهان؟ ${canBetNow} (الحالة: ${GAME_STATE.current}, الوقت: ${GAME_STATE.countdown})`);
    return canBetNow;
}

// ========== إدارة الواجهة ==========
function setupUI() {
    // تعيين الرقاقة الأولى كمختارة
    $('.clickItem').first().addClass('active');
    
    // إخفاء عناصر النتيجة
    $('.reword, .prize, .noPrize').hide();
    
    // إظهار عنوان الرهان
    $('.title1').show();
    $('.title2').hide();
    
    console.log("🎨 تم إعداد الواجهة");
}

function updateUIForState() {
    switch(GAME_STATE.current) {
        case 'betting':
            $('.title1').show();
            $('.title2').hide();
            $('.hand').show();
            console.log("🎯 واجهة مرحلة الرهان معروضة");
            break;
            
        case 'drawing':
            $('.title1').hide();
            $('.title2').show();
            $('.hand').hide();
            console.log("🎡 واجهة مرحلة السحب معروضة");
            break;
            
        case 'result':
            console.log("🏆 واجهة مرحلة النتيجة معروضة");
            break;
            
        case 'waiting':
            console.log("⏳ واجهة مرحلة الانتظار معروضة");
            break;
    }
}

function updateCountdownDisplay() {
    $('.coutDown').text(GAME_STATE.countdown + 's');
    console.log(`⏱️ تحديث العداد: ${GAME_STATE.countdown} ثانية`);
}

function updateBalanceDisplay() {
    $('.balanceCount').text(GAME_STATE.player.balance.toFixed(2));
    $('.profitCount').text(GAME_STATE.player.profit.toFixed(2));
    $('.round').text((info.lang == "ar" ? "جولة " : "Round ") + GAME_STATE.round);
}

// ========== إدارة المؤقتات ==========
function startBettingCountdown() {
    console.log("⏱️ بدء عد تنازلي الرهان");
    
    // تنظيف أي مؤقتات سابقة
    stopAllTimers();
    
    // تعيين حالة الرهان
    setGameState('betting');
    
    // بدء العد التنازلي
    GAME_STATE.timers.countdown = setInterval(function() {
        GAME_STATE.countdown--;
        updateCountdownDisplay();
        
        console.log(`⏰ الوقت المتبقي: ${GAME_STATE.countdown} ثانية`);
        
        if (GAME_STATE.countdown <= 0) {
            console.log("⏰ انتهى وقت الرهان، بدء السحب");
            GAME_STATE.countdown = 0;
            stopAllTimers();
            startDrawing();
        }
    }, 1000);
}

function startDrawing() {
    console.log("🎡 بدء عملية السحب");
    
    // تعيين حالة السحب
    setGameState('drawing');
    
    // إخفاء الرهانات السابقة
    hidePreviousBets();
    
    // بدء حركة العجلة
    startWheelAnimation();
    
    // محاكاة السحب لمدة 3 ثوان
    setTimeout(function() {
        finishDrawing();
    }, 3000);
}

function startWheelAnimation() {
    console.log("🌀 بدء حركة العجلة");
    
    let rollCount = 0;
    GAME_STATE.timers.roll = setInterval(function() {
        // تبديل العناصر الرمادية
        $('.item .gray').show();
        $('.item' + (rollCount % 8 + 1) + ' .gray').hide();
        rollCount++;
    }, 100);
}

function finishDrawing() {
    console.log("✅ انتهاء السحب");
    
    // إيقاف حركة العجلة
    if (GAME_STATE.timers.roll) {
        clearInterval(GAME_STATE.timers.roll);
        GAME_STATE.timers.roll = null;
    }
    
    // إخفاء جميع العناصر الرمادية
    $('.item .gray').hide();
    
    // الانتقال لمرحلة الرهان الجديدة
    setTimeout(function() {
        startNewRound();
    }, 1000);
}

function startNewRound() {
    console.log("🔄 بدء جولة جديدة");
    
    // إعادة تعيين الرهانات
    GAME_STATE.currentBets = [];
    GAME_STATE.totalBets = 0;
    
    // إعادة تعيين العداد
    GAME_STATE.countdown = GAME_CONFIG.COUNTDOWN_TIME;
    
    // تحميل معلومات الجولة الجديدة
    loadGameInfo();
    
    // بدء العد التنازلي الجديد
    startBettingCountdown();
}

function stopAllTimers() {
    console.log("🛑 إيقاف جميع المؤقتات");
    
    Object.keys(GAME_STATE.timers).forEach(function(timerKey) {
        if (GAME_STATE.timers[timerKey]) {
            clearInterval(GAME_STATE.timers[timerKey]);
            GAME_STATE.timers[timerKey] = null;
        }
    });
}

// ========== معالجة الرهانات ==========
function processBet(fruitIndex) {
    if (!canBet()) {
        showMessage(info.lang == "ar" ? "لا يمكن الرهان الآن" : "Cannot bet now");
        return false;
    }
    
    const fruit = GAME_CONFIG.FRUITS[fruitIndex];
    const betAmount = GAME_STATE.selectedChip;
    
    console.log(`🎯 محاولة الرهان: ${fruit} بمبلغ ${betAmount}`);
    
    // التحقق من الرصيد
    if (GAME_STATE.player.balance < betAmount) {
        showMessage(info.lang == "ar" ? "رصيد غير كافٍ" : "Insufficient balance");
        return false;
    }
    
    // إرسال الرهان إلى الخادم
    sendBetToServer(fruit, betAmount, fruitIndex);
    return true;
}

function sendBetToServer(fruit, amount, index) {
    console.log(`📤 إرسال رهان للخادم: ${fruit}, ${amount}`);
    
    callFlamingoApp('game_choice', {
        choice: fruit,
        gold: amount
    }).then(function(res) {
        console.log("✅ استجابة الرهان:", res);
        
        if (res.code === 200) {
            // تحديث الرصيد
            GAME_STATE.player.balance = parseFloat(res.balance) || (GAME_STATE.player.balance - amount);
            updateBalanceDisplay();
            
            // تحديث الرهان على الواجهة
            updateBetOnUI(index, amount);
            
            // تسجيل الرهان
            GAME_STATE.currentBets.push({fruit: fruit, amount: amount});
            GAME_STATE.totalBets += amount;
            
            console.log(`💰 رهان ناجح! الرصيد الجديد: ${GAME_STATE.player.balance}`);
        } else {
            showMessage(res.message || (info.lang == "ar" ? "خطأ في الرهان" : "Bet error"));
            console.error("❌ خطأ في الرهان:", res);
        }
    }).catch(function(error) {
        console.error("❌ خطأ في الاتصال:", error);
        showMessage(info.lang == "ar" ? "خطأ في الاتصال" : "Connection error");
    });
}

function updateBetOnUI(index, amount) {
    const list = [6, 7, 8, 1, 2, 3, 4, 5];
    const element = $(`.item${list[index]} .selected div:nth-child(2) div`);
    
    if (element.length > 0) {
        const current = parseInt(element.text()) || 0;
        element.text(current + amount);
        $(`.item${list[index]} .selected`).show();
        console.log(`📊 تحديث الرهان على الواجهة: الفهرس ${index}, المبلغ ${amount}`);
    }
}

function hidePreviousBets() {
    $('.item .selected').hide();
    $('.item .selected div:nth-child(2) div').text('0');
    console.log("🧹 تم إخفاء الرهانات السابقة");
}

// ========== الاتصال بالخادم ==========
function loadGameInfo() {
    console.log("🔄 تحميل معلومات الجولة");
    
    callFlamingoApp('game_info').then(function(res) {
        console.log("📊 معلومات الجولة:", res);
        
        if (res.code === 200 && res.data) {
            // تحديث معلومات الجولة
            GAME_STATE.round = res.data.round || GAME_STATE.round + 1;
            GAME_STATE.countdown = res.data.countdown || GAME_CONFIG.COUNTDOWN_TIME;
            GAME_STATE.player.balance = parseFloat(res.data.gold) || GAME_STATE.player.balance;
            GAME_STATE.player.profit = parseFloat(res.data.profit) || 0;
            
            // تحديث الواجهة
            updateBalanceDisplay();
            updateCountdownDisplay();
            
            // إذا كان هناك نتيجة سابقة، عرضها
            if (res.data.result) {
                showPreviousResult(res.data.result);
            }
            
            console.log(`✅ معلومات الجولة محملة: الجولة ${GAME_STATE.round}, الوقت ${GAME_STATE.countdown}`);
        } else {
            console.error("❌ خطأ في معلومات الجولة:", res);
            showMessage(info.lang == "ar" ? "خطأ في تحميل المعلومات" : "Error loading info");
        }
    }).catch(function(error) {
        console.error("❌ خطأ في الاتصال:", error);
        showMessage(info.lang == "ar" ? "خطأ في الاتصال" : "Connection error");
    });
}

// ========== إدارة الأحداث ==========
function bindEvents() {
    console.log("🔗 ربط أحداث اللعبة");
    
    // أحداث الرقاقات
    $('.clickItem').click(function() {
        $('.clickItem').removeClass('active');
        $(this).addClass('active');
        
        const index = $(this).data('index');
        GAME_STATE.selectedChip = GAME_CONFIG.GOLD_CHIPS[index];
        console.log(`💰 تم اختيار الرقاقة: ${GAME_STATE.selectedChip}`);
    });
    
    // أحداث الفواكه
    for (let i = 0; i < 8; i++) {
        $(`.item${i + 1}`).click(function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`🍎 نقر على فاكهة ${i} (${GAME_CONFIG.FRUITS[i]})`);
            console.log(`📊 الحالة الحالية: ${GAME_STATE.current}, الوقت: ${GAME_STATE.countdown}`);
            
            if (canBet()) {
                processBet(i);
            } else {
                console.log(`❌ لا يمكن الرهان - الحالة: ${GAME_STATE.current}`);
                showMessage(info.lang == "ar" ? "انتظر حتى بدء الجولة" : "Wait for round to start");
            }
        });
    }
    
    // حدث تغيير الصفحة
    document.addEventListener("visibilitychange", function() {
        if (!document.hidden) {
            console.log("📱 الصفحة ظاهرة، تحديث المعلومات");
            loadGameInfo();
        }
    });
    
    console.log("✅ تم ربط جميع الأحداث");
}

// ========== وظائف مساعدة ==========
function showMessage(text) {
    console.log(`💬 عرض رسالة: ${text}`);
    
    $('.pop-success div').text(text);
    $('.pop-success').show();
    
    setTimeout(function() {
        $('.pop-success').hide();
    }, 2000);
}

function showPreviousResult(result) {
    const fruitIndex = GAME_CONFIG.FRUITS.indexOf(result);
    if (fruitIndex !== -1) {
        $(`.item${fruitIndex + 1}`).addClass('active');
        console.log(`🏆 نتيجة سابقة: ${result}`);
    }
}

// ========== تكامل Flamingo ==========
var info = window.flamingoPlayerInfo || {
    uid: '',
    lang: 'en',
    nickname: '',
    avatar: '',
    credits: 0,
    diamonds: 0
};

var pendingRequests = {};
var requestIdCounter = 0;

window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("👤 معلومات اللاعب:", info);
    initGame();
};

window.onFlamingoResponse = function(response) {
    console.log("📤 استجابة التطبيق:", response);
    
    const requestId = response.requestId;
    if (requestId && pendingRequests[requestId]) {
        const callback = pendingRequests[requestId];
        delete pendingRequests[requestId];
        
        if (response.success) {
            callback.resolve(response.data);
        } else {
            callback.reject(response.error || 'خطأ غير معروف');
        }
    }
};

function callFlamingoApp(action, params) {
    return new Promise(function(resolve, reject) {
        const requestId = 'req_' + (++requestIdCounter) + '_' + Date.now();
        
        pendingRequests[requestId] = {
            resolve: resolve,
            reject: reject
        };
        
        const message = JSON.stringify({
            action: action,
            requestId: requestId,
            params: params || {}
        });
        
        console.log(`📤 إرسال ${action}`, params);
        
        if (window.FlamingoApp) {
            window.FlamingoApp.postMessage(message);
        } else {
            reject('FlamingoApp غير متوفر');
        }
        
        setTimeout(function() {
            if (pendingRequests[requestId]) {
                delete pendingRequests[requestId];
                reject('انتهت مهلة الطلب');
            }
        }, 30000);
    });
}

// ========== بدء اللعبة ==========
$(document).ready(function() {
    console.log("✅ المستند جاهز");
    
    if (window.flamingoPlayerInfo) {
        info = window.flamingoPlayerInfo;
        initGame();
    } else {
        setTimeout(function() {
            if (window.flamingoPlayerInfo) {
                info = window.flamingoPlayerInfo;
                initGame();
            } else {
                console.log("⚠️ لم يتم تحميل معلومات اللاعب، استخدام الإعدادات الافتراضية");
                initGame();
            }
        }, 500);
    }
});

// ========== أداة التصحيح ==========
window.debugGame = {
    getState: function() {
        return {
            ...GAME_STATE,
            canBet: canBet(),
            time: new Date().toLocaleTimeString()
        };
    },
    
    forceBetting: function() {
        setGameState('betting');
        GAME_STATE.countdown = 10;
        updateCountdownDisplay();
        console.log("🔓 تم إجبار وضع الرهان");
        showMessage("وضع الرهان مفعل");
    },
    
    resetRound: function() {
        startNewRound();
        console.log("🔄 إعادة تعيين الجولة");
    },
    
    logState: function() {
        console.log("=== 🔍 حالة اللعبة ===", this.getState());
    }
};

console.log("🎉 تم تحميل نظام اللعبة بنجاح!");
console.log("💡 استخدم debugGame.logState() لرؤية الحالة الحالية");
