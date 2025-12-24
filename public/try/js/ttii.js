/**
 * لعبة عجلة الفواكه - الإصدار الكامل النهائي
 * يعمل مع: العدّاد الصحيح + الرهان الصحيح + حفظ القيمة
 */

// ==================== المتغيرات الأساسية ====================
var currentGold = 1;
var status = 0; // 0 يمكن النقر, 1 جاري السحب
var countTime = 0;
var round = 0;
var countTimer = null;
var selectArr = [];
var lastServerUpdate = 0;

// إعدادات اللعبة - يجب أن تتطابق مع Parse Server
var ROUND_DURATION = 30; // 30 ثانية لكل جولة

// الخرائط الصحيحة للفواكه
var fruitMaps = {
    // من فاكهة العرض إلى الاختيار
    displayToChoice: {
        1: { choice: "b", index: 3 },  // item1 على الشاشة = choice "b"
        2: { choice: "c", index: 4 },  // item2 على الشاشة = choice "c"
        3: { choice: "d", index: 5 },  // item3 على الشاشة = choice "d"
        4: { choice: "e", index: 6 },  // item4 على الشاشة = choice "e"
        5: { choice: "f", index: 7 },  // item5 على الشاشة = choice "f"
        6: { choice: "g", index: 0 },  // item6 على الشاشة = choice "g"
        7: { choice: "h", index: 1 },  // item7 على الشاشة = choice "h"
        8: { choice: "a", index: 2 }   // item8 على الشاشة = choice "a"
    },
    
    // من الاختيار إلى فاكهة العرض
    choiceToDisplay: {
        "g": 6, "h": 7, "a": 8,
        "b": 1, "c": 2, "d": 3, "e": 4, "f": 5
    }
};

var goldList = [1, 10, 100, 1000, 10000];

// معلومات اللاعب
var info = window.flamingoPlayerInfo || {
    uid: '',
    lang: 'en',
    credits: 0
};

// متغيرات التحكم بالوقت
var serverTimeOffset = 0;
var roundStartTime = 0;
var roundEndTime = 0;

console.log("=== GAME INITIALIZED ===");

// ==================== الاستقبال من التطبيق ====================
window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("✅ Player info loaded");
    initializeGame();
};

window.onFlamingoResponse = function(response) {
    console.log("📥 Received response from app:", response);
    
    var requestId = response.requestId;
    if (requestId && window.pendingRequests && window.pendingRequests[requestId]) {
        var callback = window.pendingRequests[requestId];
        delete window.pendingRequests[requestId];
        
        if (response.success) {
            callback.resolve(response.data);
        } else {
            callback.reject(response.error || 'Unknown error');
        }
    }
};

$(document).ready(function() {
    console.log("📄 Document ready");
    initializeGame();
});

// ==================== تهيئة اللعبة ====================
function initializeGame() {
    console.log("🎮 INITIALIZING GAME");
    
    // إعادة تعيين المتغيرات
    status = 0;
    currentGold = 1;
    countTime = 30;
    selectArr = [];
    serverTimeOffset = 0;
    
    // ربط الأحداث
    bindEvents();
    
    // تعيين الكوينز الافتراضي
    setTimeout(function() {
        $(".clickItem").removeClass("active");
        $(".clickItem[data-index='0']").addClass("active");
        currentGold = 1;
        console.log("💰 Default coin set to 1");
    }, 500);
    
    // تحميل بيانات اللعبة
    loadGameData();
    
    // إضافة أزرار المساعدة
    addHelperButtons();
    
    // إضافة CSS المخصص
    addCustomCSS();
}

// ==================== ربط الأحداث ====================
function bindEvents() {
    console.log("🔗 Binding events...");
    
    // إزالة الأحداث القديمة
    $(".clickItem").off('click');
    $(".item1, .item2, .item3, .item4, .item5, .item6, .item7, .item8").off('click');
    
    // ----- 1. أحداث الكوينز (حل المشكلة 3) -----
    $(".clickArea .clickItem").on('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        var index = $(this).data("index") || 0;
        
        // إزالة active من جميع الكوينزات
        $(".clickItem").removeClass("active");
        
        // إضافة active للكوينز المحدد
        $(this).addClass("active");
        
        // حفظ القيمة المحددة
        currentGold = goldList[index];
        
        console.log("✅ Selected coin:", currentGold, "(Index:", index + ")");
        
        // تأثير مرئي
        $(this).addClass('selected-coin');
        setTimeout(function() {
            $(".clickItem").removeClass('selected-coin');
        }, 300);
    });
    
    // ----- 2. أحداث الفواكه (حل المشكلة 2) -----
    for (var displayIndex = 1; displayIndex <= 8; displayIndex++) {
        (function(displayIndex) {
            var selector = ".item" + displayIndex;
            var fruitInfo = fruitMaps.displayToChoice[displayIndex];
            
            if (!fruitInfo) {
                console.error("❌ No mapping for display index:", displayIndex);
                return;
            }
            
            $(selector).on('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                console.log("=== 🍎 FRUIT CLICK ===");
                console.log("Clicked: " + selector);
                console.log("Display index: " + displayIndex);
                console.log("Maps to: choice '" + fruitInfo.choice + "'");
                console.log("Current gold:", currentGold);
                console.log("Status:", status, "(0=can click, 1=drawing)");
                console.log("Time left:", countTime, "seconds");
                
                if (status === 0 && countTime > 0) {
                    placeBet(fruitInfo.choice, fruitInfo.index, displayIndex);
                } else if (countTime <= 0) {
                    showMessage("Round finished");
                } else {
                    showMessage("Wait for next round");
                }
            });
            
            // إضافة مؤشر النقر
            $(selector).css('cursor', 'pointer');
            
        })(displayIndex);
    }
    
    console.log("✅ Events bound successfully");
}

// ==================== تحميل بيانات اللعبة ====================
function loadGameData() {
    console.log("⬇️ Loading game data from server...");
    
    callFlamingoApp('game_info', {}).then(function(response) {
        console.log("📊 Server response received");
        
        if (response.code === 200 && response.data) {
            updateFromServer(response.data);
        } else {
            console.error("❌ Error from server:", response);
            // إعادة المحاولة بعد 3 ثواني
            setTimeout(loadGameData, 3000);
        }
    }).catch(function(error) {
        console.error("❌ Failed to load game data:", error);
        setTimeout(loadGameData, 3000);
    });
}

// ==================== تحديث من السيرفر (حل المشكلة 1) ====================
function updateFromServer(data) {
    console.log("🔄 Updating from server data");
    
    // تسجيل وقت التحديث الأخير
    lastServerUpdate = Date.now();
    
    // 1. تحديث الرصيد والمعلومات الأساسية
    $(".balanceCount").text(parseFloat(data.gold).toFixed(2));
    $(".profitCount").text(data.profit || 0);
    $(".round").text((info.lang == "ar" ? "جولة " : "Round ") + data.round);
    
    round = data.round;
    
    // 2. حساب الوقت الصحيح (مع تعويض فارق التوقيت)
    if (data.serverTime && data.roundEndTime) {
        // حساب فارق التوقيت بين السيرفر والمتصفح
        var clientTime = Math.floor(Date.now() / 1000);
        serverTimeOffset = clientTime - data.serverTime;
        
        // حساب الوقت المتبقي بدقة
        var remainingTime = data.roundEndTime - (data.serverTime + serverTimeOffset);
        countTime = Math.max(0, Math.min(remainingTime, ROUND_DURATION));
        
        console.log("⏱️ Time calculation:");
        console.log("  Server time:", data.serverTime);
        console.log("  Client time:", clientTime);
        console.log("  Offset:", serverTimeOffset, "seconds");
        console.log("  Round ends at:", data.roundEndTime);
        console.log("  Calculated remaining:", remainingTime);
        console.log("  Final countdown:", countTime);
    } else {
        // استخدام القيمة الأساسية إذا لم تكن البيانات متوفرة
        countTime = data.countdown || 30;
        console.log("⏱️ Using basic countdown:", countTime);
    }
    
    // 3. تحديث عرض الوقت
    $(".coutDown").text(countTime + "s");
    
    // 4. تحديث الحالة بناءً على الوقت
    if (countTime > 0) {
        status = 0; // يمكن النقر
        console.log("✅ Status set to 0 (can click)");
    } else {
        status = 1; // جاري السحب
        console.log("⚠️ Status set to 1 (drawing)");
    }
    
    // 5. إدارة العدّاد
    if (countTimer) {
        clearInterval(countTimer);
        countTimer = null;
    }
    
    if (countTime > 0) {
        startCountdown();
    } else if (countTime === 0 && status === 0) {
        // إذا انتهى الوقت ولكن الحالة لا تزال 0
        getRoundResult();
    }
    
    // 6. تحديث النتائج والرهانات
    if (data.result) {
        showPreviousResult(data.result);
    }
    
    if (data.select && Object.keys(data.select).length > 0) {
        updateCurrentBets(data.select);
    }
    
    if (data.resultList) {
        updateResultList(data.resultList);
    }
    
    console.log("✅ Game updated successfully");
}

// ==================== بدء العدّاد ====================
function startCountdown() {
    console.log("⏰ Starting countdown timer...");
    
    // إيقاف أي timer سابق
    if (countTimer) {
        clearInterval(countTimer);
    }
    
    countTimer = setInterval(function() {
        countTime--;
        
        // تحديث العرض
        $(".coutDown").text(countTime + "s");
        
        // تسجيل الوقت عند قيم معينة
        if (countTime === 10 || countTime === 5 || countTime <= 3) {
            console.log("⏱️ Countdown:", countTime, "seconds left");
        }
        
        // تحديث دوري من السيرفر (كل 10 ثواني)
        if (countTime % 10 === 0 && countTime > 0) {
            syncTimeWithServer();
        }
        
        // إذا وصل الوقت لصفر
        if (countTime <= 0) {
            countTime = 0;
            status = 1; // جاري السحب
            
            console.log("⏰ Time's up! Starting draw...");
            clearInterval(countTimer);
            countTimer = null;
            
            // جلب نتائج الجولة
            getRoundResult();
        }
    }, 1000);
}

// ==================== مزامنة الوقت مع السيرفر ====================
function syncTimeWithServer() {
    // تحديث صامت للوقت فقط
    callFlamingoApp('game_info', {}).then(function(response) {
        if (response.code === 200 && response.data) {
            var serverData = response.data;
            
            // حساب الوقت الجديد
            if (serverData.serverTime && serverData.roundEndTime) {
                var clientTime = Math.floor(Date.now() / 1000);
                var newOffset = clientTime - serverData.serverTime;
                
                // إذا كان الفرق كبيراً، نصحح الوقت
                if (Math.abs(newOffset - serverTimeOffset) > 2) {
                    console.log("🔄 Adjusting time offset:", serverTimeOffset, "->", newOffset);
                    serverTimeOffset = newOffset;
                    
                    var remainingTime = serverData.roundEndTime - (serverData.serverTime + serverTimeOffset);
                    var newCountTime = Math.max(0, Math.min(remainingTime, ROUND_DURATION));
                    
                    if (Math.abs(newCountTime - countTime) > 2) {
                        console.log("⏱️ Adjusting countdown:", countTime, "->", newCountTime);
                        countTime = newCountTime;
                        $(".coutDown").text(countTime + "s");
                    }
                }
            }
        }
    }).catch(function(error) {
        console.error("❌ Sync error:", error);
    });
}

// ==================== وضع الرهان ====================
function placeBet(choice, choiceIndex, displayIndex) {
    console.log("=== 💰 PLACING BET ===");
    console.log("Choice:", choice);
    console.log("Display fruit:", displayIndex);
    console.log("Gold amount:", currentGold);
    
    // 1. الحصول على الرصيد الحالي
    var currentBalance = parseFloat($('.balanceCount').text()) || 0;
    console.log("Current balance:", currentBalance);
    
    // 2. التحقق من الرصيد
    if (currentBalance < currentGold) {
        showMessage("Insufficient balance");
        return;
    }
    
    // 3. تأكيد القيمة المحددة (تأمين ضد التغيير)
    var activeCoin = $(".clickItem.active");
    if (activeCoin.length > 0) {
        var coinIndex = activeCoin.data("index") || 0;
        var confirmedGold = goldList[coinIndex];
        if (confirmedGold && confirmedGold !== currentGold) {
            console.log("🔄 Adjusting gold from", currentGold, "to", confirmedGold);
            currentGold = confirmedGold;
        }
    }
    
    // 4. تحديث الرصيد مؤقتاً
    var newBalance = currentBalance - currentGold;
    $('.balanceCount').text(newBalance.toFixed(2));
    
    // 5. تحديث عرض الفاكهة
    updateFruitBet(displayIndex, currentGold);
    
    // 6. إرسال الرهان
    sendBet(choice, currentGold, currentBalance, displayIndex);
}

// تحديث عرض الرهان على الفاكهة
function updateFruitBet(displayIndex, gold) {
    var selector = `.item${displayIndex} .selected div:nth-child(2) div`;
    var element = $(selector);
    
    if (element.length > 0) {
        var currentAmount = parseInt(element.text()) || 0;
        var newAmount = currentAmount + gold;
        element.text(newAmount);
        $(`.item${displayIndex} .selected`).show();
        
        // تأثير مرئي
        $(`.item${displayIndex}`).addClass('bet-placed');
        setTimeout(function() {
            $(`.item${displayIndex}`).removeClass('bet-placed');
        }, 300);
        
        console.log("✅ Bet display updated: fruit", displayIndex, "=", newAmount);
    }
}

// إرسال الرهان للسيرفر
function sendBet(choice, gold, oldBalance, displayIndex) {
    console.log("📤 Sending bet to server...");
    
    callFlamingoApp('game_choice', {
        choice: choice,
        gold: gold
    }).then(function(response) {
        console.log("📥 Bet response:", response);
        
        if (response.code === 200) {
            // 1. تحديث الرصيد النهائي
            if (response.balance !== undefined) {
                $('.balanceCount').text(parseFloat(response.balance).toFixed(2));
            }
            
            // 2. الحفاظ على الكوينز المحدد (حل المشكلة 3)
            var activeCoin = $(".clickItem.active");
            if (activeCoin.length > 0) {
                var coinIndex = activeCoin.data("index") || 0;
                currentGold = goldList[coinIndex];
                console.log("✅ Keeping selected gold:", currentGold);
            }
            
            // 3. إظهار رسالة النجاح
            showMessage("Bet successful!");
            console.log("✅ Bet placed successfully!");
        } else {
            // إذا فشل، نعيد الرصيد ونخفي الرهان
            $('.balanceCount').text(oldBalance.toFixed(2));
            
            // إخفاء الرهان من العرض
            $(`.item${displayIndex} .selected div:nth-child(2) div`).text("0");
            $(`.item${displayIndex} .selected`).hide();
            
            if (response.code === 10062) {
                showMessage("Insufficient credits");
            } else {
                showMessage("Error: " + (response.message || "Unknown error"));
            }
        }
    }).catch(function(error) {
        console.error("❌ Bet error:", error);
        $('.balanceCount').text(oldBalance.toFixed(2));
        showMessage("System error");
    });
}

// ==================== إدارة النتائج ====================
function getRoundResult() {
    console.log("📊 Getting round result...");
    
    callFlamingoApp('game_info', { round: round }).then(function(response) {
        console.log("📊 Round result:", response);
        
        if (response.code === 200 && response.data) {
            showRoundResult(response.data);
            
            // بعد عرض النتيجة، نبدأ جولة جديدة
            setTimeout(function() {
                startNewRound();
            }, 5000);
        }
    }).catch(function(error) {
        console.error("❌ Error getting round result:", error);
    });
}

function showRoundResult(data) {
    console.log("🏆 Showing round result");
    
    if (data.result && data.top) {
        // إظهار popup النتيجة
        $(".reword").show();
        
        if (data.winGold > 0) {
            $(".prize").show();
            $(".reword_word>div:first-child>div:last-child").text(data.winGold);
        } else {
            $(".noPrize").show();
        }
        
        // عرض الفائزين
        var winnerHtml = '';
        data.top.forEach(function(winner, i) {
            winnerHtml += `
                <div class="personItem">
                    <div class="logoArea">
                        <div class="logo"><img src="${winner.avatar || ''}" alt=""></div>
                        <img class="no${i+1}" src="images/no${i+1}.png" alt="">
                    </div>
                    <div class="nick">${winner.nick || 'Player'}</div>
                    <div class="flex ac jc">
                        <img src="images/gold.png" alt="">
                        <div>${winner.total || 0}</div>
                    </div>
                </div>
            `;
        });
        
        $(".reword_person").html(winnerHtml);
        
        // إخفاء بعد 5 ثواني
        setTimeout(function() {
            $(".reword, .prize, .noPrize").hide();
        }, 5000);
    }
}

function showPreviousResult(result) {
    console.log("📈 Previous result:", result);
    
    var displayIndex = fruitMaps.choiceToDisplay[result];
    if (displayIndex) {
        $(".item" + displayIndex).addClass("active");
        console.log("🏆 Previous winning fruit: item" + displayIndex);
    }
}

function updateCurrentBets(selectMap) {
    console.log("💵 Updating current bets:", selectMap);
    
    Object.keys(selectMap).forEach(function(choice) {
        var displayIndex = fruitMaps.choiceToDisplay[choice];
        if (displayIndex) {
            var selector = `.item${displayIndex} .selected div:nth-child(2) div`;
            var element = $(selector);
            if (element.length > 0) {
                element.text(selectMap[choice]);
                $(`.item${displayIndex} .selected`).show();
            }
        }
    });
}

function updateResultList(resultList) {
    if (!resultList || resultList.length === 0) return;
    
    var giftListHtml = "";
    var reversedList = resultList.slice().reverse();
    
    for (var i = 0; i < reversedList.length; i++) {
        var result = reversedList[i];
        var displayIndex = fruitMaps.choiceToDisplay[result];
        
        if (displayIndex) {
            if (i === 0) {
                giftListHtml += '<div class="giftItem"><img src="images/gift_' + displayIndex + '.png" alt=""><img src="images/new.png" alt=""></div>';
            } else {
                giftListHtml += '<div class="giftItem"><img src="images/gift_' + displayIndex + '.png" alt=""></div>';
            }
        }
    }
    
    if ($(".giftList").length > 0) {
        $(".giftList").html(giftListHtml);
    }
}

// ==================== بدء جولة جديدة ====================
function startNewRound() {
    console.log("=== 🔄 STARTING NEW ROUND ===");
    
    // إعادة تعيين
    status = 0;
    
    // إخفاء الرهانات القديمة من العرض
    for (var i = 1; i <= 8; i++) {
        $(`.item${i} .selected div:nth-child(2) div`).text("0");
        $(`.item${i} .selected`).hide();
        $(`.item${i}`).removeClass("active");
    }
    
    // تحميل بيانات الجولة الجديدة
    loadGameData();
    
    showMessage("New round started!");
}

// ==================== أدوات المساعدة ====================
function callFlamingoApp(action, params) {
    return new Promise(function(resolve, reject) {
        if (!window.pendingRequests) {
            window.pendingRequests = {};
        }
        
        var requestId = 'req_' + Date.now();
        
        window.pendingRequests[requestId] = {
            resolve: resolve,
            reject: reject
        };
        
        var message = JSON.stringify({
            action: action,
            requestId: requestId,
            params: params || {}
        });
        
        console.log("📤 Sending to app:", action);
        
        if (window.FlamingoApp) {
            window.FlamingoApp.postMessage(message);
            
            // Timeout بعد 10 ثواني
            setTimeout(function() {
                if (window.pendingRequests[requestId]) {
                    delete window.pendingRequests[requestId];
                    reject('Timeout after 10s');
                }
            }, 10000);
        } else {
            reject('FlamingoApp not available');
        }
    });
}

function showMessage(msg) {
    console.log("💬 Message:", msg);
    
    var popup = $(".pop-success");
    if (popup.length === 0) {
        popup = $('<div class="pop-success" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:white; padding:15px 25px; border-radius:10px; z-index:10000; display:none; font-size:16px; text-align:center; min-width:200px;"></div>');
        $('body').append(popup);
    }
    
    popup.text(msg).show();
    
    setTimeout(function() {
        popup.hide();
    }, 2000);
}

// ==================== أزرار المساعدة ====================
function addHelperButtons() {
    // زر إعادة التعيين
    if ($('#resetBtn').length === 0) {
        var resetBtn = $('<div id="resetBtn" style="position:fixed; top:10px; left:10px; z-index:9999; background:#2196F3; color:white; padding:8px 12px; border-radius:5px; cursor:pointer; font-size:12px; font-weight:bold;">🔄 Reset Game</div>');
        $('body').append(resetBtn);
        
        resetBtn.click(function() {
            console.log("🔄 Resetting game...");
            initializeGame();
            showMessage("Game reset");
        });
    }
    
    // زر الحالة
    if ($('#statusBtn').length === 0) {
        var statusBtn = $('<div id="statusBtn" style="position:fixed; top:10px; left:100px; z-index:9999; background:#9C27B0; color:white; padding:8px 12px; border-radius:5px; cursor:pointer; font-size:12px; font-weight:bold;">📊 Game Status</div>');
        $('body').append(statusBtn);
        
        statusBtn.click(function() {
            checkGameStatus();
        });
    }
    
    // زر تعيين الكوينز
    if ($('#coinBtn').length === 0) {
        var coinBtn = $('<div id="coinBtn" style="position:fixed; top:10px; left:200px; z-index:9999; background:#FF9800; color:white; padding:8px 12px; border-radius:5px; cursor:pointer; font-size:12px; font-weight:bold;">💰 Set Coin 10000</div>');
        $('body').append(coinBtn);
        
        coinBtn.click(function() {
            setCoin(4); // 10000
        });
    }
}

function setCoin(index) {
    if (index >= 0 && index < goldList.length) {
        $(".clickItem").removeClass("active");
        $(".clickItem[data-index='" + index + "']").addClass("active");
        currentGold = goldList[index];
        console.log("✅ Coin set to:", currentGold, "(Index:", index + ")");
        showMessage("Coin set to " + currentGold);
    }
}

function checkGameStatus() {
    console.log("=== 📊 GAME STATUS ===");
    console.log("Status:", status, "(0=can click, 1=drawing)");
    console.log("CountTime:", countTime, "seconds left");
    console.log("Round:", round);
    console.log("Current gold:", currentGold);
    console.log("Server time offset:", serverTimeOffset, "seconds");
    
    var activeCoin = $(".clickItem.active");
    if (activeCoin.length > 0) {
        var coinIndex = activeCoin.data("index") || 0;
        console.log("Selected coin: Index", coinIndex, "=", goldList[coinIndex]);
    }
    
    showMessage("Status: " + (status === 0 ? "Can bet" : "Drawing") + " | Time: " + countTime + "s");
}

// ==================== CSS إضافي ====================
function addCustomCSS() {
    var css = `
        .bet-placed {
            animation: pulse 0.3s ease-in-out;
            box-shadow: 0 0 15px gold;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .selected-coin {
            box-shadow: 0 0 10px #FFD700 !important;
            transform: scale(1.1);
            transition: all 0.2s;
        }
        
        .item1, .item2, .item3, .item4, .item5, .item6, .item7, .item8 {
            transition: all 0.2s;
        }
        
        .item1:hover, .item2:hover, .item3:hover, .item4:hover, 
        .item5:hover, .item6:hover, .item7:hover, .item8:hover {
            opacity: 0.9;
            transform: scale(1.02);
        }
        
        #resetBtn:hover, #statusBtn:hover, #coinBtn:hover {
            transform: scale(1.05);
            transition: all 0.2s;
        }
    `;
    
    $('<style>').text(css).appendTo('head');
}

// ==================== أوامر Console ====================
window.game = {
    reset: function() { initializeGame(); },
    status: function() { checkGameStatus(); },
    bet: function(fruitNum) {
        if (status === 0 && countTime > 0) {
            var fruitInfo = fruitMaps.displayToChoice[fruitNum];
            if (fruitInfo) {
                placeBet(fruitInfo.choice, fruitInfo.index, fruitNum);
            } else {
                console.error("❌ Invalid fruit number. Use 1-8");
            }
        } else {
            console.log("⚠️ Cannot bet now. Status:", status, "Time:", countTime);
        }
    },
    setCoin: function(index) { setCoin(index); },
    sync: function() { syncTimeWithServer(); }
};

console.log("🎮 Game commands available in console:");
console.log("game.status() - Check game state");
console.log("game.bet(1) - Bet on fruit 1 (1-8)");
console.log("game.setCoin(4) - Set coin to 10000 (0=1, 1=10, 2=100, 3=1000, 4=10000)");
console.log("game.reset() - Reset the game");
console.log("game.sync() - Sync time with server");

// ==================== عند تحميل الصفحة ====================
$(window).on('load', function() {
    console.log("✅ Page fully loaded");
    
    // فحص بعد التأخير
    setTimeout(function() {
        checkGameStatus();
        
        // تحديث دوري كل 30 ثانية
        setInterval(function() {
            if (Date.now() - lastServerUpdate > 30000) {
                console.log("🔄 Periodic update check");
                syncTimeWithServer();
            }
        }, 30000);
    }, 2000);
});
