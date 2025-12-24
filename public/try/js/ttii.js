/**
 * لعبة عجلة الفواكه - مصممة خصيصاً لـ HTML الخاص بك
 */

// ==================== المتغيرات الأساسية ====================
var currentGold = 1;
var status = 0;
var countTime = 0;
var round = 0;
var countTimer = null;
var ROUND_DURATION = 30;

// بناء خرائط الفواكه بناءً على data-index في HTML الخاص بك
var fruitMaps = {
    // من data-index إلى الاختيار
    indexToChoice: {
        0: { choice: "g", display: 6 },  // data-index="0" → choice "g" → item6
        1: { choice: "h", display: 7 },  // data-index="1" → choice "h" → item7
        2: { choice: "a", display: 8 },  // data-index="2" → choice "a" → item8
        3: { choice: "b", display: 1 },  // data-index="3" → choice "b" → item1
        4: { choice: "c", display: 2 },  // data-index="4" → choice "c" → item2
        5: { choice: "d", display: 3 },  // data-index="5" → choice "d" → item3
        6: { choice: "e", display: 4 },  // data-index="6" → choice "e" → item4
        7: { choice: "f", display: 5 }   // data-index="7" → choice "f" → item5
    },
    
    // من الاختيار إلى data-index
    choiceToIndex: {
        "g": 0, "h": 1, "a": 2,
        "b": 3, "c": 4, "d": 5, "e": 6, "f": 7
    },
    
    // من الاختيار إلى رقم العرض
    choiceToDisplay: {
        "g": 6, "h": 7, "a": 8,
        "b": 1, "c": 2, "d": 3, "e": 4, "f": 5
    }
};

var goldList = [1, 10, 100, 1000, 10000];
var info = window.flamingoPlayerInfo || { uid: '', lang: 'en', credits: 0 };

console.log("🎮 GAME STARTED - CUSTOMIZED FOR YOUR HTML");

// ==================== التهيئة ====================
$(document).ready(function() {
    console.log("📄 Document ready");
    
    // التحقق من عناصر HTML
    checkHTMLElements();
    
    // تهيئة اللعبة بعد تأخير قصير
    setTimeout(initializeGame, 1000);
});

function checkHTMLElements() {
    console.log("🔍 Checking HTML elements...");
    
    // فحص الفواكه
    for (var i = 1; i <= 8; i++) {
        var element = $(".item" + i);
        if (element.length > 0) {
            var dataIndex = element.attr("data-index");
            console.log("✅ Found: .item" + i + " [data-index='" + dataIndex + "']");
        } else {
            console.log("❌ Missing: .item" + i);
        }
    }
    
    // فحص الكوينزات
    for (var i = 0; i <= 4; i++) {
        var coin = $(".clickItem[data-index='" + i + "']");
        console.log(coin.length > 0 ? 
            "✅ Coin " + i + ": " + goldList[i] : 
            "❌ Missing coin index: " + i);
    }
}

function initializeGame() {
    console.log("🎮 INITIALIZING GAME");
    
    // إعادة تعيين
    status = 0;
    currentGold = 1;
    
    // ربط الأحداث
    bindEvents();
    
    // تعيين الكوينز الافتراضي
    $(".clickItem").removeClass("active");
    $(".clickItem[data-index='0']").addClass("active");
    
    // تحميل البيانات
    loadGameData();
    
    console.log("✅ Game initialized");
}

// ==================== ربط الأحداث ====================
function bindEvents() {
    console.log("🔗 Binding events...");
    
    // إزالة الأحداث القديمة
    $(".clickItem").off('click');
    $(".item1, .item2, .item3, .item4, .item5, .item6, .item7, .item8").off('click');
    
    // 1. أحداث الكوينز
    $(".clickArea .clickItem").on('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        var index = $(this).data("index") || 0;
        
        // إزالة active من الجميع
        $(".clickItem").removeClass("active");
        
        // إضافة active للمحدد
        $(this).addClass("active");
        
        // تحديث القيمة الحالية
        currentGold = goldList[index];
        
        console.log("💰 Selected coin:", currentGold, "(Index:", index + ")");
    });
    
    // 2. أحداث الفواكه - بناءً على data-index
    for (var i = 1; i <= 8; i++) {
        (function(itemNumber) {
            var selector = ".item" + itemNumber;
            var element = $(selector);
            
            if (element.length === 0) {
                console.error("❌ Element not found:", selector);
                return;
            }
            
            var dataIndex = element.attr("data-index");
            if (dataIndex === undefined) {
                console.error("❌ No data-index for:", selector);
                return;
            }
            
            var fruitIndex = parseInt(dataIndex);
            var fruitInfo = fruitMaps.indexToChoice[fruitIndex];
            
            if (!fruitInfo) {
                console.error("❌ No mapping for data-index:", fruitIndex);
                return;
            }
            
            $(selector).on('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                console.log("=== 🍎 FRUIT CLICK ===");
                console.log("Clicked: " + selector);
                console.log("data-index: " + fruitIndex);
                console.log("Maps to: choice '" + fruitInfo.choice + "'");
                console.log("Display as: item" + fruitInfo.display);
                console.log("Current gold:", currentGold);
                console.log("Status:", status, "Time left:", countTime);
                
                if (status === 0 && countTime > 0) {
                    placeBet(fruitInfo.choice, fruitIndex, fruitInfo.display);
                } else if (countTime <= 0) {
                    showMessage("Round finished");
                } else {
                    showMessage("Wait for next round");
                }
            });
            
            $(selector).css('cursor', 'pointer');
            console.log("✅ Bound: " + selector + " → choice '" + fruitInfo.choice + "'");
            
        })(i);
    }
    
    console.log("✅ All events bound");
}

// ==================== تحميل البيانات ====================
function loadGameData() {
    console.log("⬇️ Loading game data...");
    
    callFlamingoApp('game_info', {}).then(function(response) {
        if (response.code === 200 && response.data) {
            updateFromServer(response.data);
        } else {
            console.error("❌ Server error:", response);
            setTimeout(loadGameData, 3000);
        }
    }).catch(function(error) {
        console.error("❌ Load error:", error);
        setTimeout(loadGameData, 3000);
    });
}

function updateFromServer(data) {
    console.log("🔄 Updating from server");
    
    // تحديث المعلومات الأساسية
    $(".balanceCount").text(parseFloat(data.gold).toFixed(2));
    $(".profitCount").text(data.profit || 0);
    $(".round").text((info.lang == "ar" ? "جولة " : "Round ") + data.round);
    
    round = data.round;
    
    // تحديث الوقت
    countTime = data.countdown || 30;
    console.log("⏱️ Countdown from server:", countTime);
    $(".coutDown").text(countTime + "s");
    
    // تحديث الحالة
    if (countTime > 0) {
        status = 0;
        console.log("✅ Status: Can bet (time left:", countTime + ")");
    } else {
        status = 1;
        console.log("⚠️ Status: Drawing");
    }
    
    // إدارة العدّاد
    if (countTimer) {
        clearInterval(countTimer);
        countTimer = null;
    }
    
    if (countTime > 0) {
        startCountdown();
    }
    
    // تحديث النتائج
    if (data.result) {
        showPreviousResult(data.result);
    }
    
    if (data.select) {
        updateCurrentBets(data.select);
    }
    
    console.log("✅ Game updated");
}

// ==================== العدّاد ====================
function startCountdown() {
    console.log("⏰ Starting countdown...");
    
    if (countTimer) {
        clearInterval(countTimer);
    }
    
    countTimer = setInterval(function() {
        countTime--;
        $(".coutDown").text(countTime + "s");
        
        // تحديث كل 10 ثواني
        if (countTime % 10 === 0 && countTime > 0) {
            syncTime();
        }
        
        // نهاية الجولة
        if (countTime <= 0) {
            countTime = 0;
            status = 1;
            
            console.log("⏰ Time's up!");
            clearInterval(countTimer);
            countTimer = null;
            
            getRoundResult();
        }
    }, 1000);
}

function syncTime() {
    callFlamingoApp('game_info', {}).then(function(response) {
        if (response.code === 200 && response.data) {
            var serverTime = response.data.countdown;
            if (Math.abs(serverTime - countTime) > 2) {
                console.log("🔄 Syncing time:", countTime, "→", serverTime);
                countTime = serverTime;
                $(".coutDown").text(countTime + "s");
            }
        }
    });
}

// ==================== وضع الرهان ====================
function placeBet(choice, choiceIndex, displayIndex) {
    console.log("=== 💰 PLACING BET ===");
    console.log("Choice:", choice);
    console.log("Display fruit: item" + displayIndex);
    console.log("Gold:", currentGold);
    
    // التحقق من الرصيد
    var balance = parseFloat($('.balanceCount').text()) || 0;
    if (balance < currentGold) {
        showMessage("Insufficient balance");
        return;
    }
    
    // تحديث الرصيد مؤقتاً
    var newBalance = balance - currentGold;
    $('.balanceCount').text(newBalance.toFixed(2));
    
    // تحديث العرض
    updateFruitDisplay(displayIndex, currentGold);
    
    // إرسال الرهان
    sendBet(choice, currentGold, balance, displayIndex);
}

function updateFruitDisplay(displayIndex, gold) {
    var selector = `.item${displayIndex} .selected div:nth-child(2) div`;
    var element = $(selector);
    
    if (element.length > 0) {
        var current = parseInt(element.text()) || 0;
        element.text(current + gold);
        $(`.item${displayIndex} .selected`).show();
        console.log("✅ Display updated: item" + displayIndex + " = " + (current + gold));
    }
}

function sendBet(choice, gold, oldBalance, displayIndex) {
    console.log("📤 Sending bet...");
    
    callFlamingoApp('game_choice', {
        choice: choice,
        gold: gold
    }).then(function(response) {
        console.log("📥 Response:", response);
        
        if (response.code === 200) {
            // تحديث الرصيد النهائي
            if (response.balance !== undefined) {
                $('.balanceCount').text(parseFloat(response.balance).toFixed(2));
            }
            
            // الحفاظ على الكوينز المحدد
            var activeCoin = $(".clickItem.active");
            if (activeCoin.length > 0) {
                var coinIndex = activeCoin.data("index") || 0;
                currentGold = goldList[coinIndex];
                console.log("💰 Keeping coin:", currentGold);
            }
            
            showMessage("Bet successful!");
        } else {
            // فشل - إعادة الرصيد
            $('.balanceCount').text(oldBalance.toFixed(2));
            
            // إخفاء الرهان من العرض
            $(`.item${displayIndex} .selected div:nth-child(2) div`).text("0");
            $(`.item${displayIndex} .selected`).hide();
            
            if (response.code === 10062) {
                showMessage("Insufficient credits");
            } else {
                showMessage("Error: " + (response.message || "Unknown"));
            }
        }
    }).catch(function(error) {
        console.error("❌ Bet error:", error);
        $('.balanceCount').text(oldBalance.toFixed(2));
        showMessage("System error");
    });
}

// ==================== النتائج ====================
function getRoundResult() {
    console.log("📊 Getting results...");
    
    callFlamingoApp('game_info', { round: round }).then(function(response) {
        if (response.code === 200 && response.data) {
            showRoundResult(response.data);
            
            setTimeout(function() {
                startNewRound();
            }, 5000);
        }
    });
}

function showRoundResult(data) {
    console.log("🏆 Showing results");
    
    if (data.result && data.top) {
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
        console.log("🏆 Winning fruit: item" + displayIndex);
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

// ==================== جولة جديدة ====================
function startNewRound() {
    console.log("=== 🔄 NEW ROUND ===");
    
    status = 0;
    
    // إخفاء الرهانات السابقة
    for (var i = 1; i <= 8; i++) {
        $(`.item${i} .selected div:nth-child(2) div`).text("0");
        $(`.item${i} .selected`).hide();
        $(`.item${i}`).removeClass("active");
    }
    
    loadGameData();
    showMessage("New round started!");
}

// ==================== أدوات مساعدة ====================
function callFlamingoApp(action, params) {
    return new Promise(function(resolve, reject) {
        if (!window.pendingRequests) window.pendingRequests = {};
        
        var requestId = 'req_' + Date.now();
        window.pendingRequests[requestId] = { resolve: resolve, reject: reject };
        
        var message = JSON.stringify({
            action: action,
            requestId: requestId,
            params: params || {}
        });
        
        console.log("📤 Sending:", action);
        
        if (window.FlamingoApp) {
            window.FlamingoApp.postMessage(message);
            
            setTimeout(function() {
                if (window.pendingRequests[requestId]) {
                    delete window.pendingRequests[requestId];
                    reject('Timeout');
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
        popup = $('<div class="pop-success" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:white; padding:15px 25px; border-radius:10px; z-index:10000; display:none; text-align:center;"></div>');
        $('body').append(popup);
    }
    
    popup.text(msg).show();
    setTimeout(function() { popup.hide(); }, 2000);
}

// ==================== أوامر Console ====================
window.game = {
    reset: function() { initializeGame(); },
    status: function() { 
        console.log("📊 Status:", status, "Time:", countTime, "Round:", round, "Gold:", currentGold);
    },
    bet: function(fruitNum) {
        if (status === 0 && countTime > 0) {
            var element = $(".item" + fruitNum);
            if (element.length > 0) {
                var dataIndex = element.attr("data-index");
                var fruitInfo = fruitMaps.indexToChoice[dataIndex];
                if (fruitInfo) {
                    placeBet(fruitInfo.choice, dataIndex, fruitInfo.display);
                }
            }
        }
    },
    setCoin: function(index) {
        if (index >= 0 && index <= 4) {
            $(".clickItem").removeClass("active");
            $(".clickItem[data-index='" + index + "']").addClass("active");
            currentGold = goldList[index];
            console.log("💰 Coin set to:", currentGold);
        }
    }
};

console.log("🎮 Commands: game.status(), game.bet(1-8), game.setCoin(0-4), game.reset()");

// ==================== استقبال معلومات اللاعب ====================
window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("✅ Player info received");
    initializeGame();
};

window.onFlamingoResponse = function(response) {
    var requestId = response.requestId;
    if (requestId && window.pendingRequests && window.pendingRequests[requestId]) {
        var callback = window.pendingRequests[requestId];
        delete window.pendingRequests[requestId];
        
        if (response.success) {
            callback.resolve(response.data);
        } else {
            callback.reject(response.error);
        }
    }
};
