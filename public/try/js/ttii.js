/**
 * لعبة عجلة الفواكه - الإصدار المصحح
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

console.log("Game loaded");

window.onFlamingoPlayerInfo = function(playerInfo) {
    console.log("Player info received");
    info = playerInfo;
    init();
};

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
    
    if (info.lang) {
        changeLang(info.lang);
    }
    
    setupEvents();
    showHand();
    getInfo();
    getBill();
    getRank();
}

function setupEvents() {
    console.log("Setting up click events...");
    
    // إزالة الأحداث القديمة
    $(".item").off('click');
    $(".clickItem").off('click');
    
    // خريطة data-index إلى choice
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
    
    // ربط النقر على الفواكه
    $(".item").each(function() {
        var $item = $(this);
        var dataIndex = $item.data("index");
        
        if (dataIndex === undefined) return;
        
        $item.on('click', function() {
            console.log("Item clicked, index:", dataIndex);
            
            if (status !== 0) {
                console.log("Can't bet now");
                return;
            }
            
            var choice = indexToChoice[dataIndex];
            if (!choice) {
                console.error("Invalid choice for index:", dataIndex);
                return;
            }
            
            var choiceIndex = choiceList.indexOf(choice);
            if (choiceIndex === -1) {
                console.error("Choice not found:", choice);
                return;
            }
            
            console.log("Placing bet:", choice, "amount:", currentGold);
            placeBet(choice, choiceIndex);
        });
    });
    
    // ربط النقر على مبالغ الذهب
    $(".clickItem").each(function() {
        var $item = $(this);
        var index = $item.data("index");
        
        $item.on('click', function() {
            $(".clickItem").removeClass("active");
            $item.addClass("active");
            currentGold = goldList[index];
            console.log("Gold selected:", currentGold);
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
    console.log("Choice:", choice, "Amount:", currentGold);
    
    var balanceElem = $('.balanceCount');
    var currentBalance = parseFloat(balanceElem.text()) || 0;
    
    console.log("Current balance:", currentBalance);
    
    if (currentBalance < currentGold) {
        showMessage("Insufficient balance");
        return;
    }
    
    if (selectCount >= 6) {
        showMessage("Maximum bets reached");
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
            
            sendToApp({ action: 'refreshBalance' });
            
        } else {
            // خطأ
            showMessage(response.message || "Error");
            balanceElem.text(currentBalance.toFixed(2));
        }
    }).catch(function(error) {
        console.error("Bet error:", error);
        showMessage("System error");
        balanceElem.text(currentBalance.toFixed(2));
    });
}

function updateBetDisplay(choiceIndex, gold) {
    var indexToItem = [6, 7, 8, 1, 2, 3, 4, 5];
    var itemNumber = indexToItem[choiceIndex];
    
    var selectedDiv = $(".item" + itemNumber + " .selected");
    var amountDiv = selectedDiv.find("div:nth-child(2) div");
    
    if (amountDiv.length) {
        var currentAmount = parseInt(amountDiv.text()) || 0;
        var newAmount = currentAmount + gold;
        amountDiv.text(newAmount);
        selectedDiv.show();
        console.log("Item", itemNumber, "updated to:", newAmount);
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
            reject('App not available');
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
    $('.balanceCount').text(parseFloat(data.gold || 0).toFixed(2));
    $('.profitCount').text(data.profit || 0);
    $('.round').text((info.lang == "ar" ? "جولة " : "Round ") + (data.round || 0));
    
    if (data.countdown !== undefined) {
        countTime = data.countdown;
        $(".coutDown").text(countTime + "s");
        
        if (!countTimer) {
            startCountdown();
        }
    }
    
    if (data.resultList) {
        updateResultList(data.resultList);
    }
    
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
    $(".item .selected").hide();
    $(".item .selected div:nth-child(2) div").text("0");
    
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
    console.log("Language:", lang);
}

function hideHand() {
    $(".hand").hide();
}
