/**
 * لعبة عجلة الفواكه
 */

var count = 4;
var rollCount = 1;
var countTime = 10;
var round = 0;

var selectCount = 0;
var selectArr = [];
var countTimer = null;
var handTimer = null;
var rollTimer = null;
var resultTimer = null;
var timesWord = [5, 5, 10, 15, 25, 45, 5, 5];
var goldList = [1, 10, 100, 1000, 10000];
var resultCount = 5;
var choiceList = ["g", "h", "a", "b", "c", "d", "e", "f"];
var status = 0;
var currentGold = 1;

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

console.log("Game loaded, player info:", info);

// استقبال معلومات اللاعب
window.onFlamingoPlayerInfo = function(playerInfo) {
    console.log("Player info received:", playerInfo);
    info = playerInfo;
    init();
};

// استقبال الردود من التطبيق
window.onFlamingoResponse = function(response) {
    console.log("Response from app:", response);
    
    var requestId = response.requestId;
    if (requestId && pendingRequests[requestId]) {
        var callback = pendingRequests[requestId];
        delete pendingRequests[requestId];
        
        if (response.success) {
            callback.resolve(response.data);
        } else {
            callback.reject(response.error);
        }
    }
};

$(document).ready(function() {
    console.log("Document ready");
    
    if (window.flamingoPlayerInfo) {
        info = window.flamingoPlayerInfo;
        init();
    } else {
        setTimeout(function() {
            if (window.flamingoPlayerInfo) {
                info = window.flamingoPlayerInfo;
            }
            init();
        }, 500);
    }
});

function init() {
    console.log("Initializing game...");
    
    // إعداد اللغة
    if (info.lang) {
        changeLang(info.lang);
    }
    
    // تهيئة الأحداث أولاً
    setupEvents();
    
    // ثم تحميل البيانات
    showHand();
    getInfo();
    getBill();
    getRank();
}

function setupEvents() {
    console.log("Setting up events...");
    
    // تنظيف الأحداث القديمة
    $(".item").off('click');
    $(".clickItem").off('click');
    
    // خريطة الترجمة من data-index إلى choice
    var indexToChoice = {
        0: "g", // item6
        1: "h", // item7  
        2: "a", // item8
        3: "b", // item1
        4: "c", // item2
        5: "d", // item3
        6: "e", // item4
        7: "f"  // item5
    };
    
    // ربط أحداث النقر على الفواكه
    $(".item").each(function() {
        var $item = $(this);
        var dataIndex = $item.data("index");
        
        if (dataIndex === undefined) return;
        
        $item.css('cursor', 'pointer');
        
        $item.on('click', function() {
            console.log("Item clicked, data-index:", dataIndex, "status:", status);
            
            if (status !== 0) {
                console.log("Can't bet now, status is:", status);
                return;
            }
            
            var choice = indexToChoice[dataIndex];
            if (!choice) {
                console.error("No choice for index:", dataIndex);
                return;
            }
            
            var choiceIndex = choiceList.indexOf(choice);
            if (choiceIndex === -1) {
                console.error("Choice not in list:", choice);
                return;
            }
            
            console.log("Placing bet on:", choice, "with gold:", currentGold);
            placeBet(choice, choiceIndex);
        });
    });
    
    // ربط أحداث النقر على مبالغ الذهب
    $(".clickItem").each(function() {
        var $item = $(this);
        var index = $item.data("index");
        
        $item.on('click', function() {
            $(".clickItem").removeClass("active");
            $item.addClass("active");
            currentGold = goldList[index];
            console.log("Selected gold amount:", currentGold);
        });
    });
    
    // أزرار القوائم
    $(".btn.records").click(function() {
        $(".recordsBg").show();
    });
    
    $(".btn.rule").click(function() {
        $(".ruleBg").show();
    });
    
    $(".btn.rank").click(function() {
        $(".rankBg").show();
    });
    
    // إغلاق القوائم
    $(".modalBack, .ruleContent>img").click(function() {
        $(".recordsBg, .ruleBg, .rankBg, .rewardBg").hide();
    });
    
    console.log("Events setup complete");
}

function placeBet(choice, choiceIndex) {
    console.log("=== Placing Bet ===");
    console.log("Choice:", choice, "Index:", choiceIndex, "Amount:", currentGold);
    
    // التحقق من الرصيد
    var balanceElem = $('.balanceCount');
    var currentBalance = parseFloat(balanceElem.text()) || 0;
    
    console.log("Current balance:", currentBalance);
    
    if (currentBalance < currentGold) {
        showMessage(info.lang == "ar" ? "رصيد غير كافٍ" : "Insufficient balance");
        return;
    }
    
    if (selectCount >= 6) {
        showMessage(info.lang == "ar" ? "وصلت للحد الأقصى" : "Maximum bets reached");
        return;
    }
    
    // إرسال الطلب
    callGameAPI('game_choice', {
        choice: choice,
        gold: currentGold
    }).then(function(response) {
        console.log("Bet response:", response);
        
        if (response.code === 200) {
            // نجاح
            selectCount++;
            if (!selectArr.includes(choice)) {
                selectArr.push(choice);
            }
            
            // تحديث الواجهة
            updateBetDisplay(choiceIndex, currentGold);
            
            // تحديث الرصيد
            if (response.balance !== undefined) {
                balanceElem.text(parseFloat(response.balance).toFixed(2));
            }
            
            // إشعار التطبيق
            sendToApp({ action: 'refreshBalance' });
            
        } else {
            // خطأ
            showMessage(response.message || "Error");
            // إعادة الرصيد
            balanceElem.text(currentBalance.toFixed(2));
        }
    }).catch(function(error) {
        console.error("Bet error:", error);
        showMessage(info.lang == "ar" ? "خطأ في النظام" : "System error");
        balanceElem.text(currentBalance.toFixed(2));
    });
}

function updateBetDisplay(choiceIndex, gold) {
    // خريطة من choice index إلى item number
    var indexToItem = [6, 7, 8, 1, 2, 3, 4, 5];
    var itemNumber = indexToItem[choiceIndex];
    
    var selectedDiv = $(".item" + itemNumber + " .selected");
    var amountDiv = selectedDiv.find("div:nth-child(2) div");
    
    if (amountDiv.length) {
        var currentAmount = parseInt(amountDiv.text()) || 0;
        var newAmount = currentAmount + gold;
        amountDiv.text(newAmount);
        selectedDiv.show();
        console.log("Updated item", itemNumber, "to amount:", newAmount);
    }
}

function callGameAPI(action, params) {
    return new Promise(function(resolve, reject) {
        var requestId = 'req_' + (++requestIdCounter);
        
        pendingRequests[requestId] = {
            resolve: resolve,
            reject: reject
        };
        
        var message = {
            action: action,
            requestId: requestId,
            params: params || {}
        };
        
        console.log("Sending to app:", message);
        
        if (window.FlamingoApp) {
            window.FlamingoApp.postMessage(JSON.stringify(message));
        } else {
            reject('App channel not available');
        }
        
        setTimeout(function() {
            if (pendingRequests[requestId]) {
                delete pendingRequests[requestId];
                reject('Timeout');
            }
        }, 10000);
    });
}

function sendToApp(data) {
    if (window.FlamingoApp) {
        window.FlamingoApp.postMessage(JSON.stringify(data));
    }
}

function showHand() {
    count = 4;
    $(".hand").show().attr("class", "hand hand3");
    
    if (handTimer) clearInterval(handTimer);
    
    handTimer = setInterval(function() {
        $(".hand").removeClass("hand" + (count === 1 ? 8 : count - 1));
        $(".hand").addClass("hand" + count);
        count = count >= 8 ? 1 : count + 1;
    }, 1000);
}

function getInfo(_round) {
    var params = _round ? { round: _round } : {};
    
    callGameAPI('game_info', params).then(function(response) {
        console.log("Game info:", response);
        
        if (response.code === 200 && response.data) {
            updateGameUI(response.data);
        }
    }).catch(function(error) {
        console.error("Info error:", error);
    });
}

function updateGameUI(data) {
    // تحديث الرصيد
    $('.balanceCount').text(parseFloat(data.gold || 0).toFixed(2));
    $('.profitCount').text(data.profit || 0);
    $('.round').text((info.lang == "ar" ? "جولة " : "Round ") + (data.round || 0));
    
    // تحديث الوقت
    if (data.countdown !== undefined) {
        countTime = data.countdown;
        $(".coutDown").text(countTime + "s");
        
        if (!countTimer) {
            startCountdown();
        }
    }
    
    // تحديث النتائج السابقة
    if (data.resultList) {
        updateResultList(data.resultList);
    }
    
    // تحديث الرهانات الحالية
    if (data.select) {
        updateCurrentBets(data.select);
    }
}

function startCountdown() {
    if (countTimer) clearInterval(countTimer);
    
    countTimer = setInterval(function() {
        countTime--;
        $(".coutDown").text(countTime + "s");
        
        if (countTime <= 0) {
            clearInterval(countTimer);
            countTimer = null;
            status = 1;
            startRolling();
        }
    }, 1000);
}

function startRolling() {
    hideHand();
    $(".title1").hide();
    $(".title2").show();
    
    // إظهار جميع العناصر الرمادية
    $(".item .gray").show();
    
    rollTimer = setInterval(function() {
        $(".item .gray").show();
        $(".item" + (rollCount + 1) + " .gray").hide();
        rollCount = (rollCount + 1) % 8;
    }, 100);
    
    setTimeout(function() {
        clearInterval(rollTimer);
        status = 0;
        openDraw();
    }, 10000);
}

function openDraw() {
    getInfo(round);
}

function getBill() {
    callGameAPI('game_bill').then(function(response) {
        if (response.code === 200 && response.data) {
            updateBillList(response.data);
        }
    });
}

function getRank() {
    callGameAPI('game_rank').then(function(response) {
        if (response.code === 200 && response.data) {
            updateRankList(response.data);
        }
    });
}

function updateResultList(results) {
    var html = '';
    for (var i = results.length - 1; i >= 0; i--) {
        var index = searchGift(results[i]);
        html += '<div class="giftItem"><img src="images/gift_' + index + '.png" alt=""></div>';
    }
    $(".giftList").html(html);
}

function updateCurrentBets(bets) {
    // إخفاء جميع الرهانات أولاً
    $(".item .selected").hide();
    $(".item .selected div:nth-child(2) div").text("0");
    
    // إظهار الرهانات الحالية
    for (var choice in bets) {
        if (bets.hasOwnProperty(choice)) {
            var index = searchGift(choice);
            if (index) {
                $(".item" + index + " .selected div:nth-child(2) div").text(bets[choice]);
                $(".item" + index + " .selected").show();
            }
        }
    }
}

function searchGift(value) {
    var index = choiceList.indexOf(value);
    if (index === -1) return 1;
    
    var map = [6, 7, 8, 1, 2, 3, 4, 5];
    return map[index];
}

function showMessage(msg) {
    $(".pop-success div").text(msg);
    $(".pop-success").show();
    
    setTimeout(function() {
        $(".pop-success").hide();
    }, 2000);
}

function changeLang(lang) {
    if (!['en', 'ar'].includes(lang)) lang = 'en';
    
    // هنا يمكنك إضافة منطق تغيير اللغة إذا كان موجوداً
    console.log("Language set to:", lang);
}
