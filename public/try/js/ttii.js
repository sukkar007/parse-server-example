/**
 * لعبة عجلة الفواكه - الإصدار النهائي
 * يعمل مع: العدّاد + الرهان الصحيح + النتائج
 */

// المتغيرات الأساسية
var currentGold = 1;
var status = 0; // 0 يمكن النقر, 1 جاري السحب
var countTime = 30;
var round = 0;
var choiceList = ["g", "h", "a", "b", "c", "d", "e", "f"];
var goldList = [1, 10, 100, 1000, 10000];
var countTimer = null;
var selectArr = [];

// معلومات اللاعب
var info = window.flamingoPlayerInfo || {
    uid: '',
    lang: 'en',
    credits: 0
};

console.log("=== GAME INITIALIZED ===");

// استقبال معلومات اللاعب
window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("Player info loaded");
    initializeGame();
};

$(document).ready(function() {
    console.log("Document ready");
    initializeGame();
});

function initializeGame() {
    console.log("=== INITIALIZING GAME ===");
    
    // إعادة تعيين
    status = 0;
    currentGold = 1;
    selectArr = [];
    
    // ربط الأحداث
    bindEvents();
    
    // بدء اللعبة
    startGame();
    
    // إضافة أزرار المساعدة
    addHelperButtons();
}

// ربط الأحداث بشكل صحيح
function bindEvents() {
    console.log("Binding events...");
    
    // إزالة الأحداث القديمة
    $(".clickItem").off('click');
    $(".item1, .item2, .item3, .item4, .item5, .item6, .item7, .item8").off('click');
    
    // ربط أحداث الكوينز
    $(".clickArea .clickItem").on('click', function() {
        var index = $(this).data("index") || 0;
        $(".clickItem").removeClass("active");
        $(this).addClass("active");
        currentGold = goldList[index];
        console.log("Selected gold:", currentGold);
    });
    
    // ربط أحداث الفواكه - بطريقة صحيحة
    // الفواكه مرتبة كالتالي: [6, 7, 8, 1, 2, 3, 4, 5] تظهر على الشاشة
    // لكن الاختيارات هي: ["g", "h", "a", "b", "c", "d", "e", "f"]
    
    // الخريطة الصحيحة: أي فاكهة على الشاشة → أي اختيار
    var fruitMap = [
        { display: 1, choice: "b", index: 3 },  // item1 = choice "b"
        { display: 2, choice: "c", index: 4 },  // item2 = choice "c"
        { display: 3, choice: "d", index: 5 },  // item3 = choice "d"
        { display: 4, choice: "e", index: 6 },  // item4 = choice "e"
        { display: 5, choice: "f", index: 7 },  // item5 = choice "f"
        { display: 6, choice: "g", index: 0 },  // item6 = choice "g"
        { display: 7, choice: "h", index: 1 },  // item7 = choice "h"
        { display: 8, choice: "a", index: 2 }   // item8 = choice "a"
    ];
    
    fruitMap.forEach(function(fruit) {
        var selector = ".item" + fruit.display;
        
        $(selector).on('click', function(e) {
            e.stopPropagation();
            
            console.log("=== FRUIT CLICK ===");
            console.log("Clicked: " + selector);
            console.log("Corresponds to choice: " + fruit.choice);
            console.log("Status:", status);
            console.log("CountTime:", countTime);
            
            if (status === 0 && countTime > 0) {
                placeBet(fruit.choice, fruit.index, fruit.display);
            } else {
                showMessage("Wait for next round");
            }
        });
        
        $(selector).css('cursor', 'pointer');
    });
    
    console.log("Events bound successfully");
}

// بدء اللعبة
function startGame() {
    console.log("Starting game...");
    
    // جلب معلومات الجولة
    getGameInfo();
    
    // بدء العدّاد
    startCountdown();
}

// جلب معلومات اللعبة
function getGameInfo() {
    callFlamingoApp('game_info', {}).then(function(response) {
        console.log("Game info:", response);
        
        if (response.code === 200 && response.data) {
            // تحديث المعلومات
            $(".balanceCount").text(parseFloat(response.data.gold).toFixed(2));
            $(".profitCount").text(response.data.profit || 0);
            $(".round").text((info.lang == "ar" ? "جولة " : "Round ") + response.data.round);
            
            round = response.data.round;
            countTime = response.data.countdown || 30;
            
            // تحديث عرض الوقت
            $(".coutDown").text(countTime + "s");
            
            // عرض نتيجة الجولة السابقة
            if (response.data.result) {
                showPreviousResult(response.data.result);
            }
            
            // عرض الرهانات الحالية
            if (response.data.select) {
                updateCurrentBets(response.data.select);
            }
            
            console.log("Round:", round, "Countdown:", countTime);
        }
    }).catch(function(error) {
        console.error("Error getting game info:", error);
    });
}

// بدء العدّاد
function startCountdown() {
    console.log("Starting countdown...");
    
    // إيقاف أي timer سابق
    if (countTimer) {
        clearInterval(countTimer);
    }
    
    // تأكيد أن status = 0 عندما countTime > 0
    if (countTime > 0) {
        status = 0;
        console.log("Status set to 0 (can click)");
    }
    
    countTimer = setInterval(function() {
        countTime--;
        
        // تحديث العرض
        $(".coutDown").text(countTime + "s");
        
        console.log("Countdown:", countTime, "seconds left");
        
        // إذا وصل الوقت لصفر
        if (countTime <= 0) {
            countTime = 0;
            status = 1; // جاري السحب
            
            console.log("Time's up! Starting draw...");
            clearInterval(countTimer);
            
            // جلب نتائج الجولة
            getRoundResult();
        }
    }, 1000);
}

// وضع الرهان
function placeBet(choice, choiceIndex, displayIndex) {
    console.log("=== PLACING BET ===");
    console.log("Choice:", choice);
    console.log("Choice index:", choiceIndex);
    console.log("Display index:", displayIndex);
    console.log("Gold amount:", currentGold);
    
    // الحصول على الرصيد
    var currentBalance = parseFloat($('.balanceCount').text()) || 0;
    console.log("Current balance:", currentBalance);
    
    // التحقق من الرصيد
    if (currentBalance < currentGold) {
        showMessage("Insufficient balance");
        return;
    }
    
    // تحديث الرصيد مؤقتاً
    var newBalance = currentBalance - currentGold;
    $('.balanceCount').text(newBalance.toFixed(2));
    
    // تحديث عرض الفاكهة
    updateFruitBet(displayIndex, currentGold);
    
    // إرسال الرهان
    sendBet(choice, currentGold, currentBalance);
}

// تحديث عرض الرهان على الفاكهة
function updateFruitBet(displayIndex, gold) {
    var selector = `.item${displayIndex} .selected div:nth-child(2) div`;
    var element = $(selector);
    
    if (element.length > 0) {
        var currentAmount = parseInt(element.text()) || 0;
        element.text(currentAmount + gold);
        $(`.item${displayIndex} .selected`).show();
        console.log("Updated bet on fruit", displayIndex);
    }
}

// إرسال الرهان للسيرفر
function sendBet(choice, gold, oldBalance) {
    console.log("Sending bet to server...");
    
    callFlamingoApp('game_choice', {
        choice: choice,
        gold: gold
    }).then(function(response) {
        console.log("Bet response:", response);
        
        if (response.code === 200) {
            // تحديث الرصيد النهائي
            if (response.balance !== undefined) {
                $('.balanceCount').text(parseFloat(response.balance).toFixed(2));
            }
            
            showMessage("Bet placed successfully!");
            console.log("Bet successful!");
        } else {
            // إذا فشل، أعد الرصيد
            $('.balanceCount').text(oldBalance.toFixed(2));
            
            if (response.code === 10062) {
                showMessage("Insufficient credits");
            } else {
                showMessage("Error: " + (response.message || "Unknown error"));
            }
        }
    }).catch(function(error) {
        console.error("Bet error:", error);
        $('.balanceCount').text(oldBalance.toFixed(2));
        showMessage("System error");
    });
}

// جلب نتيجة الجولة
function getRoundResult() {
    console.log("Getting round result...");
    
    callFlamingoApp('game_info', { round: round }).then(function(response) {
        console.log("Round result:", response);
        
        if (response.code === 200 && response.data) {
            // عرض النتيجة
            showRoundResult(response.data);
            
            // بعد عرض النتيجة، ابدأ جولة جديدة
            setTimeout(function() {
                startNewRound();
            }, 5000);
        }
    }).catch(function(error) {
        console.error("Error getting round result:", error);
    });
}

// عرض نتيجة الجولة
function showRoundResult(data) {
    console.log("Showing round result:", data);
    
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
                        <div class="logo"><img src="${winner.avatar}" alt=""></div>
                        <img class="no${i+1}" src="images/no${i+1}.png" alt="">
                    </div>
                    <div class="nick">${winner.nick}</div>
                    <div class="flex ac jc">
                        <img src="images/gold.png" alt="">
                        <div>${winner.total}</div>
                    </div>
                </div>
            `;
        });
        
        $(".reword_person").html(winnerHtml);
        
        // إخفاء النتيجة بعد 5 ثواني
        setTimeout(function() {
            $(".reword, .prize, .noPrize").hide();
        }, 5000);
    }
}

// عرض نتيجة الجولة السابقة
function showPreviousResult(result) {
    console.log("Previous result:", result);
    
    // البحث عن index العرضي للفاكهة الفائزة
    var fruitMap = {
        'g': 6, 'h': 7, 'a': 8, 
        'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5
    };
    
    var displayIndex = fruitMap[result];
    if (displayIndex) {
        $(".item" + displayIndex).addClass("active");
    }
}

// تحديث الرهانات الحالية
function updateCurrentBets(selectMap) {
    console.log("Updating current bets:", selectMap);
    
    // خريطة الاختيارات إلى العرض
    var fruitMap = {
        'g': 6, 'h': 7, 'a': 8, 
        'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5
    };
    
    Object.keys(selectMap).forEach(function(choice) {
        var displayIndex = fruitMap[choice];
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

// بدء جولة جديدة
function startNewRound() {
    console.log("=== STARTING NEW ROUND ===");
    
    // إعادة تعيين
    status = 0;
    countTime = 30;
    selectArr = [];
    
    // إخفاء الرهانات القديمة
    for (var i = 1; i <= 8; i++) {
        $(`.item${i} .selected div:nth-child(2) div`).text("0");
        $(`.item${i} .selected`).hide();
        $(`.item${i}`).removeClass("active");
    }
    
    // جلب معلومات الجولة الجديدة
    getGameInfo();
    
    // بدء العدّاد
    startCountdown();
    
    showMessage("New round started!");
}

// الاتصال بالتطبيق
function callFlamingoApp(action, params) {
    return new Promise(function(resolve, reject) {
        var requestId = 'req_' + Date.now();
        
        var message = JSON.stringify({
            action: action,
            requestId: requestId,
            params: params || {}
        });
        
        console.log("Sending to app:", action, params);
        
        if (window.FlamingoApp) {
            // إرسال الرسالة
            window.FlamingoApp.postMessage(message);
            
            // انتظار الرد
            var timeout = setTimeout(function() {
                reject('Timeout');
            }, 10000);
            
            // معالج الردود
            var responseHandler = function(event) {
                try {
                    var data = JSON.parse(event.data);
                    if (data.requestId === requestId) {
                        clearTimeout(timeout);
                        window.removeEventListener('message', responseHandler);
                        resolve(data.data || data);
                    }
                } catch(e) {
                    // ليست رسالة JSON
                }
            };
            
            window.addEventListener('message', responseHandler);
        } else {
            reject('FlamingoApp not available');
        }
    });
}

// عرض رسالة
function showMessage(msg) {
    console.log("Message:", msg);
    
    var popup = $(".pop-success");
    if (popup.length === 0) {
        popup = $('<div class="pop-success" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:white; padding:20px; border-radius:10px; z-index:10000; display:none; font-size:16px; text-align:center;"></div>');
        $('body').append(popup);
    }
    
    popup.text(msg).show();
    
    setTimeout(function() {
        popup.hide();
    }, 2000);
}

// إضافة أزرار المساعدة
function addHelperButtons() {
    // زر إعادة التعيين
    if ($('#resetBtn').length === 0) {
        var resetBtn = $('<div id="resetBtn" style="position:fixed; top:10px; left:10px; z-index:9999; background:#2196F3; color:white; padding:8px 12px; border-radius:5px; cursor:pointer; font-size:12px;">Reset Game</div>');
        $('body').append(resetBtn);
        
        resetBtn.click(function() {
            console.log("Resetting game...");
            initializeGame();
            showMessage("Game reset");
        });
    }
    
    // زر اختبار الرهان
    if ($('#testBtn').length === 0) {
        var testBtn = $('<div id="testBtn" style="position:fixed; top:10px; left:120px; z-index:9999; background:#4CAF50; color:white; padding:8px 12px; border-radius:5px; cursor:pointer; font-size:12px;">Test Bet</div>');
        $('body').append(testBtn);
        
        testBtn.click(function() {
            console.log("Testing bet...");
            if (status === 0) {
                placeBet("g", 0, 6); // اختيار الفاكهة الأولى
            } else {
                showMessage("Cannot bet now");
            }
        });
    }
    
    // زر تخطي الجولة
    if ($('#skipBtn').length === 0) {
        var skipBtn = $('<div id="skipBtn" style="position:fixed; top:10px; left:220px; z-index:9999; background:#FF9800; color:white; padding:8px 12px; border-radius:5px; cursor:pointer; font-size:12px;">Skip Round</div>');
        $('body').append(skipBtn);
        
        skipBtn.click(function() {
            console.log("Skipping round...");
            countTime = 0;
            getRoundResult();
        });
    }
}

// فحص حالة اللعبة
function checkGameStatus() {
    console.log("=== GAME STATUS ===");
    console.log("Status:", status, "(0=can click, 1=drawing)");
    console.log("CountTime:", countTime);
    console.log("Round:", round);
    console.log("Current gold:", currentGold);
    
    // فحص العناصر
    var fruitsFound = 0;
    for (var i = 1; i <= 8; i++) {
        if ($(".item" + i).length > 0) fruitsFound++;
    }
    console.log("Fruits found:", fruitsFound + "/8");
}

// عند تحميل الصفحة بالكامل
$(window).on('load', function() {
    console.log("Page fully loaded");
    checkGameStatus();
});

// إضافة أمر للتحكم من ال console
window.game = {
    reset: function() { initializeGame(); },
    status: function() { checkGameStatus(); },
    bet: function(fruit) { 
        if (status === 0) {
            // fruit يمكن أن يكون رقم 1-8 أو حرف g-h
            var fruitMap = {
                '1': {choice: 'b', display: 1}, '2': {choice: 'c', display: 2},
                '3': {choice: 'd', display: 3}, '4': {choice: 'e', display: 4},
                '5': {choice: 'f', display: 5}, '6': {choice: 'g', display: 6},
                '7': {choice: 'h', display: 7}, '8': {choice: 'a', display: 8},
                'g': {choice: 'g', display: 6}, 'h': {choice: 'h', display: 7},
                'a': {choice: 'a', display: 8}, 'b': {choice: 'b', display: 1},
                'c': {choice: 'c', display: 2}, 'd': {choice: 'd', display: 3},
                'e': {choice: 'e', display: 4}, 'f': {choice: 'f', display: 5}
            };
            
            var target = fruitMap[fruit];
            if (target) {
                placeBet(target.choice, target.display-1, target.display);
            }
        }
    }
};

console.log("Type 'game.status()' in console to check game state");
console.log("Type 'game.bet(1)' to bet on fruit 1 (or any fruit 1-8)");
