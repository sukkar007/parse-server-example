/**
 * لعبة عجلة الفواكه - نسخة آمنة
 * جميع الطلبات تمر عبر تطبيق Flutter (لا اتصال مباشر بـ Parse)
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
var status = 0; // 0 يمكن النقر, 1 جاري السحب, 2 تم السحب
var currentGold = 1;
var openDrawTimer = null;

// معلومات اللاعب من تطبيق Flamingo (بدون token للأمان)
var info = window.flamingoPlayerInfo || {
    uid: '',
    lang: 'en',
    nickname: '',
    avatar: '',
    credits: 0,
    diamonds: 0
};

// تخزين callbacks للطلبات المعلقة
var pendingRequests = {};
var requestIdCounter = 0;

console.log("=== GAME INITIALIZED ===");
console.log("Player Info:", info);

// استلام معلومات اللاعب من التطبيق
window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("=== Received player info ===");
    console.log("Info:", info);
    init();
};

// استلام الاستجابات من التطبيق
window.onFlamingoResponse = function(response) {
    console.log("=== onFlamingoResponse Called ===");
    console.log("Received response:", response);
    
    // إذا أرسل التطبيق سلسلة JSON كنص، حاول تحويلها لكائن
    if (typeof response === 'string') {
        try {
            response = JSON.parse(response);
            console.log("Parsed string response to object");
        } catch (e) {
            console.warn('onFlamingoResponse: response is string but JSON.parse failed', e);
        }
    }
    
    var requestId = response.requestId;
    console.log("Looking for requestId:", requestId);
    console.log("Pending requests:", Object.keys(pendingRequests));
    
    if (requestId && pendingRequests[requestId]) {
        console.log("Found pending request! Resolving...");
        var callback = pendingRequests[requestId];
        delete pendingRequests[requestId];
        
        if (response.success || response.code === 200) {
            console.log("Calling resolve with data");
            callback.resolve(response.data || response);
        } else {
            console.log("Calling reject with error");
            callback.reject(response.error || response.message || 'Unknown error');
        }
    } else {
        console.warn("No pending request found for requestId:", requestId);
    }
};

var env = (function() {
    var ua = navigator.userAgent;
    var testProd = ['127.0.0.1', 'localhost'];
    var isProd = !testProd.some(function(item) {
        return window.location.host.indexOf(item) > -1
    });
    return {
        isProd,
        ios: !!ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/),
        android: ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1,
        app: true // دائماً داخل التطبيق
    };
})();

$(document).ready(function() {
    console.log("=== Document ready ===");
    
    // إضافة زر التصحيح
    addDebugButton();
    
    // انتظار معلومات اللاعب من التطبيق
    if (window.flamingoPlayerInfo) {
        info = window.flamingoPlayerInfo;
        console.log("Got player info from window");
        init();
    } else {
        console.log("No player info yet, waiting...");
        // انتظار قصير ثم المحاولة
        setTimeout(function() {
            if (window.flamingoPlayerInfo) {
                info = window.flamingoPlayerInfo;
                console.log("Got player info after delay");
            } else {
                console.log("Still no player info, using defaults");
            }
            init();
        }, 500);
    }
});

// دالة لاختبار العناصر في الصفحة
function testElements() {
    console.log("=== Testing Elements ===");
    console.log("Total .item elements:", $(".item").length);
    
    for (var i = 0; i < 8; i++) {
        var selector = ".item" + (i + 1);
        var $element = $(selector);
        var dataIndex = $element.data("index");
        console.log(selector + ": exists=" + ($element.length > 0) + ", data-index=" + dataIndex);
        
        if ($element.length > 0) {
            // اختبار أن العنصر يمكن النقر عليه
            $element.css("cursor", "pointer");
        }
    }
    
    console.log("Total .clickItem elements:", $(".clickItem").length);
    $(".clickItem").each(function(i) {
        console.log("clickItem " + i + ": data-index=" + $(this).data("index") + ", gold=" + goldList[$(this).data("index")]);
    });
    
    console.log("Choice list:", choiceList);
    console.log("Current gold:", currentGold);
    console.log("Current status:", status);
}

// دالة للتحقق والتحديث المستمر للحالة
function updateGameStatus() {
    // تحديث الحالة بناءً على الوقت المتبقي
    if (countTime > 0) {
        // إذا كان هناك وقت متبقي، يجب أن يكون status = 0
        if (status !== 0) {
            console.log("🔄 Auto-fixing status: countTime > 0, setting status from", status, "to 0");
            status = 0;
            
            // تأكد من أن اليد تظهر
            if ($(".hand").is(":hidden")) {
                showHand();
            }
        }
    } else {
        // إذا انتهى الوقت، يجب أن يكون status = 1
        if (status === 0) {
            console.log("🔄 Auto-fixing status: countTime <= 0, setting status from 0 to 1");
            status = 1;
            hideHand();
        }
    }
    
    // تحديث عرض الوقت المتبقي
    if ($(".coutDown").length > 0) {
        $(".coutDown")[0].innerHTML = countTime + "s";
    }
}

// إضافة زر تصحيح إلى الصفحة
function addDebugButton() {
    if ($("#debug-button").length === 0) {
        var debugBtn = $('<button id="debug-button">DEBUG</button>');
        debugBtn.css({
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: '9999',
            background: '#f00',
            color: '#fff',
            padding: '10px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
        });
        
        debugBtn.click(function() {
            console.log("=== DEBUG INFO ===");
            console.log("status:", status);
            console.log("countTime:", countTime);
            console.log("currentGold:", currentGold);
            console.log("round:", round);
            console.log("choiceList:", choiceList);
            
            // عرض جميع العناصر مع data-index
            $(".item").each(function() {
                console.log($(this).attr('class'), "data-index:", $(this).data("index"));
            });
            
            // محاولة إعادة تعيين status إلى 0
            status = 0;
            console.log("✅ Reset status to 0 manually");
            showSuccess("Debug: Status reset to 0");
            
            // عرض اليد
            showHand();
            
            // إعادة تعيين countTime إذا كان صفراً
            if (countTime <= 0) {
                countTime = 10;
                console.log("✅ Reset countTime to 10");
            }
            
            // تحديث العرض
            updateGameStatus();
        });
        
        $("body").append(debugBtn);
    }
}

function init() {
    console.log("=== Initializing game ===");
    
    // اختبار العناصر أولاً
    testElements();
    
    moment.tz.setDefault("Asia/Riyadh");
    changeLang(info.lang || 'en');
    showHand();
    bindEvent();
    
    // تأكد من أن currentGold مُهيأ
    if (!currentGold || currentGold <= 0) {
        currentGold = goldList[0];
        $(".clickItem").first().addClass("active");
        console.log("Initialized currentGold to:", currentGold);
    }
    
    // تأكد من أن status = 0 في البداية
    status = 0;
    countTime = 10; // تعيين وقت افتراضي
    console.log("✅ Set initial status to 0, countTime to 10");
    
    // تحميل البيانات
    setTimeout(function() {
        getInfo();
        getBill();
        getRank();
    }, 1000);
    
    // بدء تحديث الحالة
    setInterval(updateGameStatus, 1000);
    
    // عرض رسالة ترحيب
    setTimeout(function() {
        showSuccess(info.lang == "ar" ? "مرحباً! اختر الفاكهة للرهان" : "Welcome! Select fruit to bet");
    }, 1500);
}

function showHand() {
    count = 4;
    $(".hand").attr("class", "hand hand3");
    $(".hand").show();
    if (handTimer) {
        clearInterval(handTimer);
    }
    handTimer = setInterval(function() {
        if (count == 1) {
            $(".hand").removeClass("hand8");
        } else {
            $(".hand").removeClass("hand" + (count - 1));
        }
        $(".hand").addClass("hand" + count);
        count++;
        if (count > 8) {
            count = 1;
        }
    }, 1000);
}

function hideHand() {
    $(".hand").hide();
}

function showResult(result, topList, winGold, avatar) {
    $(".reword").show();
    if (winGold && winGold > 0) {
        $(".prize").show();
        $(".reword_word>div:first-child>div:last-child")[0].innerHTML = winGold;
        $(".prize .self img").attr("src", avatar);
        $(".reword_word>div img:last-child").attr(
            "src",
            "images/gift_" + searchGift(result) + ".png"
        );
    } else {
        $(".noPrize").show();
        $(".noPrize>div img:last-child").attr(
            "src",
            "images/gift_" + searchGift(result) + ".png"
        );
    }
    if (info.lang == "ar") {
        $(".reword .roundWord").html("جولة " + (round - 1) + " النتيجة");
    } else {
        $(".reword .roundWord").html("The result of " + (round - 1) + " round:");
    }
    var innerHTML = "";
    for (var i = 0; i < topList.length; i++) {
        innerHTML +=
            '<div class="personItem"><div class="logoArea"><div class="logo"><img src="' +
            topList[i].avatar +
            '" alt=""></div> <img class="no' +
            (i + 1) +
            '" src="images/no' +
            (i + 1) +
            '.png" alt=""></div><div class="nick">' +
            topList[i].nick +
            '</div><div class="flex ac jc"><img src="images/gold.png" alt=""><div>' +
            topList[i].total +
            "</div></div></div>";
    }
    for (var i = 0; i < 3 - topList.length; i++) {
        innerHTML +=
            '<div class="personItem"><div class="logoArea"><div class="logo"><img src="" alt=""></div></div><div class="nick"></div><div class="flex ac jc"></div></div>';
    }
    $(".reword_person").html(innerHTML);
    resultTimer = setInterval(function() {
        resultCount--;
        if (resultCount < 0) {
            resultCount = 5;
            clearInterval(resultTimer);
            $(".reword").hide();
            $(".prize").hide();
            $(".noPrize").hide();
        }
        $(".reword .reword_content .countDown")[0].innerHTML = resultCount + "s";
    }, 1000);
}

function countDown() {
    console.log("Starting countDown, countTime:", countTime);
    
    if (countTimer) {
        clearInterval(countTimer);
    }
    
    // تأكد من أن status = 0 عند بدء العد التنازلي
    status = 0;
    console.log("✅ Set status to 0 for countDown");
    
    countTimer = setInterval(function() {
        countTime--;
        console.log("Countdown tick:", countTime);
        
        if (countTime <= 0) {
            countTime = 0;
            status = 1;
            console.log("⏰ Time's up! Setting status to 1");
            roll();
            clearInterval(countTimer);
        }
        
        // تحديث العرض
        if ($(".coutDown").length > 0) {
            $(".coutDown")[0].innerHTML = countTime + "s";
        }
        
        // تحديث الحالة بناءً على الوقت المتبقي
        updateGameStatus();
    }, 1000);
}

function openDraw() {
    getInfo(round);
}

function sureClick(choice, index) {
    console.log("=== sureClick START ===");
    console.log("choice:", choice, "index:", index, "currentGold:", currentGold);
    
    // التحقق من الرصيد
    let currentBalance = parseFloat($('.balanceCount').text());
    console.log("Current balance from UI:", currentBalance);
    
    if (isNaN(currentBalance)) {
        console.warn("Invalid balance, setting to 0");
        currentBalance = 0;
    }
    
    console.log("Balance check:", currentBalance, ">=", currentGold, "?", currentBalance >= currentGold);
    
    if (currentBalance < currentGold) {
        console.log("❌ Balance insufficient");
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        return;
    }

    // تحديث الرصيد مؤقتاً
    $('.balanceCount').text((currentBalance - currentGold).toFixed(2));

    // إرسال الطلب عبر التطبيق (آمن)
    console.log("📤 Sending bet request:", { choice: choice, gold: currentGold });
    
    callFlamingoApp('game_choice', {
        choice: choice,
        gold: currentGold
    }).then(function(res) {
        console.log("✅ Choice response received:", res);
        
        if (res.code == 200 || res.success) {
            selectCount += 1;
            if (!selectArr.includes(choice)) {
                selectArr.push(choice);
            }

            // تحويل index إلى رقم العنصر الصحيح للعرض
            // choiceList: [g(0), h(1), a(2), b(3), c(4), d(5), e(6), f(7)]
            // item numbers: [6, 7, 8, 1, 2, 3, 4, 5]
            var list = [6, 7, 8, 1, 2, 3, 4, 5];
            var itemNumber = list[index];
            
            console.log("Updating UI for item number:", itemNumber);
            console.log("Choice index:", index, "→ Item number:", itemNumber);
            
            var amountElement = $(".item" + itemNumber + " .selected div:nth-child(2) div");
            
            if (amountElement.length > 0) {
                var temp = amountElement.text().trim();
                console.log("Current amount text:", temp);
                
                var currentAmount = parseInt(temp) || 0;
                var newAmount = currentAmount + parseInt(currentGold);
                
                amountElement.text(newAmount);
                $(".item" + itemNumber + " .selected").show();
                
                console.log("✅ Bet updated: " + currentAmount + " + " + currentGold + " = " + newAmount);
            } else {
                console.error("❌ Amount element not found for .item" + itemNumber);
                // محاولة أخرى
                var selector = '[data-index="' + index + '"] .selected div:nth-child(2) div';
                var altElement = $(selector);
                if (altElement.length > 0) {
                    var temp = altElement.text().trim();
                    var currentAmount = parseInt(temp) || 0;
                    var newAmount = currentAmount + parseInt(currentGold);
                    altElement.text(newAmount);
                    $('[data-index="' + index + '"] .selected').show();
                    console.log("✅ Bet updated via data-index selector");
                }
            }

            // تحديث الرصيد
            if (res.balance !== undefined) {
                $('.balanceCount').text(parseFloat(res.balance).toFixed(2));
                console.log("✅ Balance updated to:", res.balance);
            }
            
            // إعلام التطبيق بتحديث الرصيد
            sendToApp({ action: 'refreshBalance' });
            
            showSuccess(info.lang == "ar" ? "تم وضع الرهان ✓" : "Bet placed ✓");
        } else if (res.code == 10062) {
            console.log("❌ Server: Insufficient balance");
            showSuccess(info.lang == "ar" ? "يرجى الشحن" : "Please recharge");
            // إعادة الرصيد
            $('.balanceCount').text(currentBalance.toFixed(2));
        } else {
            console.error("❌ Error response:", res);
            showSuccess(res.message || 'Error');
            $('.balanceCount').text(currentBalance.toFixed(2));
        }
    }).catch(function(error) {
        console.error("❌ Choice error:", error);
        showSuccess(info.lang == "ar" ? "خطأ في النظام" : "System Error");
        $('.balanceCount').text(currentBalance.toFixed(2));
    });
}

function roll(dir) {
    console.log("Starting roll function");
    hideHand();
    selectCount = 0;
    selectArr = [];
    $(".title1").hide();
    $(".title2").show();
    $(".coutDown")[0].innerHTML = countTime + "s";
    
    var countTimer = setInterval(function() {
        countTime--;
        if (countTime <= 0) {
            countTime = 0;
            status = 0; // إعادة status إلى 0 بعد انتهاء الجولة
            console.log("🎲 Roll finished, setting status to 0");
            clearInterval(countTimer);
            clearInterval(rollTimer);
            for (var i = 0; i < $(".item .gray").length; i++) {
                $($(".item .gray")[i]).hide();
            }
            openDraw();
        }
        $(".coutDown")[0].innerHTML = countTime + "s";
    }, 1000);
    
    for (var i = 0; i < $(".item .gray").length; i++) {
        $(".item" + (i + 1) + " .selected div:nth-child(2) div")[0].innerHTML = 0;
        $(".item" + (i + 1) + " .selected").hide();
        $(".item" + (i + 1)).removeClass("active");
        $($(".item .gray")[i]).show();
    }
    $($(".item .gray")[rollCount]).hide();
    
    rollTimer = setInterval(function() {
        for (var i = 0; i < $(".item .gray").length; i++) {
            $($(".item .gray")[i]).show();
        }
        rollCount++;
        if (rollCount > 7) {
            rollCount = 0;
        }
        $($(".item .gray")[rollCount]).hide();
    }, 100);
    
    countTime = 10;
}

var hideLock = false;

function bindEvent() {
    console.log("=== bindEvent START ===");
    
    $(".clickArea .clickItem").click(function() {
        console.log("clickItem clicked, index:", $(this).data("index"));
        for (var i = 0; i < $(".clickItem").length; i++) {
            $($(".clickItem")[i]).removeClass("active");
        }
        $(this).addClass("active");
        currentGold = goldList[$(this).data("index")];
        console.log("Selected gold:", currentGold);
        
        // عرض تأكيد
        showSuccess(info.lang == "ar" ? "تم اختيار المبلغ: " + currentGold : "Selected amount: " + currentGold);
    });
    
    try {
        document.addEventListener("visibilitychange", function() {
            if (document.hidden) {
                hideLock = true;
                sessionStorage.setItem("currentRound", round);
                if (countTimer) clearInterval(countTimer);
            } else {
                if (hideLock) {
                    hideLock = false;
                    getInfo();
                }
            }
        });
    } catch (e) {
        console.error("Visibility change error:", e);
    }

    // ربط أحداث النقر على الفواكه - الطريقة المحسنة
    console.log("Binding fruit click events...");
    
    // إزالة أي أحداث سابقة
    $(document).off('click', '.item');
    
    // استخدام event delegation مع التعامل الصحيح لـ data-index
    $(document).on('click', '.item', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var $item = $(this);
        var dataIndex = $item.data("index");
        var className = $item.attr('class') || '';
        
        console.log("=== FRUIT CLICKED ===");
        console.log("Element class:", className);
        console.log("data-index from HTML:", dataIndex);
        console.log("Current status:", status);
        console.log("Current gold:", currentGold);
        console.log("Choice list:", choiceList);
        console.log("Is status === 0?", status === 0);
        console.log("Type of status:", typeof status);
        
        // عرض جميع المتغيرات للتصحيح
        console.log("=== DEBUG INFO ===");
        console.log("countTime:", countTime);
        console.log("round:", round);
        console.log("selectCount:", selectCount);
        console.log("selectArr:", selectArr);
        
        // عرض حالة جميع المؤقتات
        console.log("Timers: countTimer=", !!countTimer, "handTimer=", !!handTimer, "rollTimer=", !!rollTimer);
        
        if (status === 0) {
            console.log("✅ Status is 0 - CAN place bet");
            
            if (dataIndex !== undefined && dataIndex >= 0 && dataIndex < choiceList.length) {
                var choice = choiceList[dataIndex];
                console.log("Choice selected from data-index:", dataIndex, "→", choice);
                
                // استخدام data-index مباشرة كـ index للدالة sureClick
                sureClick(choice, dataIndex);
            } else {
                console.error("Invalid data-index value:", dataIndex);
                console.log("Valid data-index range: 0 to", choiceList.length - 1);
                showSuccess("Invalid selection - data-index: " + dataIndex);
            }
        } else {
            console.warn("❌ Cannot place bet now. Status:", status);
            
            // شرح معنى status للمستخدم
            var statusMessages = {
                0: "يمكن النقر",
                1: "جاري السحب",
                2: "تم السحب"
            };
            
            var msg = info.lang == "ar" ? 
                "لا يمكن وضع رهان الآن (الحالة: " + status + " - " + (statusMessages[status] || "غير معروف") + ")" :
                "Cannot place bet now (Status: " + status + " - " + (statusMessages[status] || "Unknown") + ")";
            
            if (status == 1) msg += info.lang == "ar" ? " - انتظر حتى تنتهي الجولة" : " - Wait for round to finish";
            if (status == 2) msg += info.lang == "ar" ? " - انتظر الجولة القادمة" : " - Wait for next round";
            
            showSuccess(msg);
            
            // عرض رسالة إضافية في console
            console.log("Status details:", {
                status: status,
                countTime: countTime,
                canBet: countTime > 0 && status === 0
            });
        }
    });
    
    // ربط الأزرار الأخرى
    $(".btn.records").click(function() {
        $(".recordsBg").show();
    });
    
    $(".btn.rule").click(function() {
        $(".ruleBg").show();
    });
    
    $(".btn.rank").click(function() {
        $(".rankBg").show();
    });
    
    $(".modalBack").click(function() {
        $(".recordsBg, .ruleBg, .rankBg, .rewardBg").hide();
    });
    
    console.log("=== bindEvent END ===");
}

/**
 * دالة آمنة للاتصال بـ Parse عبر التطبيق
 * بدلاً من الاتصال المباشر بـ Parse Server
 */
function callFlamingoApp(action, params) {
    return new Promise(function(resolve, reject) {
        var requestId = 'req_' + (++requestIdCounter) + '_' + Date.now();
        
        console.log("=== callFlamingoApp START ===");
        console.log("Action:", action);
        console.log("RequestId:", requestId);
        console.log("Params:", params);
        
        // تخزين callback
        pendingRequests[requestId] = {
            resolve: resolve,
            reject: reject,
            timestamp: Date.now()
        };
        
        console.log("Pending requests count:", Object.keys(pendingRequests).length);
        
        // إرسال الطلب للتطبيق
        var message = JSON.stringify({
            action: action,
            requestId: requestId,
            params: params || {}
        });
        
        console.log("Message to send:", message);
        console.log("FlamingoApp available:", !!window.FlamingoApp);

        if (window.FlamingoApp) {
            try {
                console.log("Sending message to app...");
                window.FlamingoApp.postMessage(message);
                console.log("Message sent successfully");
            } catch (e) {
                console.error("Error sending message to app:", e);
                delete pendingRequests[requestId];
                reject('Failed to send message to app: ' + e.message);
            }
        } else {
            console.error("FlamingoApp not available - window.FlamingoApp is undefined");
            delete pendingRequests[requestId];
            reject('FlamingoApp not available');
        }
        
        // Timeout بعد 30 ثانية
        setTimeout(function() {
            if (pendingRequests[requestId]) {
                console.error("Request timeout for:", action, requestId);
                delete pendingRequests[requestId];
                reject('Request timeout for: ' + action);
            }
        }, 30000);
    });
}

// إرسال رسالة بسيطة للتطبيق (بدون انتظار رد)
function sendToApp(data) {
    if (window.FlamingoApp) {
        window.FlamingoApp.postMessage(JSON.stringify(data));
    }
}

function getRank() {
    callFlamingoApp('game_rank').then(function(res) {
        console.log("Rank response:", res);
        if (res.code == 200 && res.data) {
            var innerHTML = "";
            var topHTML = "";
            
            for (var i = 0; i < res.data.length; i++) {
                var item = res.data[i];
                if (i < 3) {
                    topHTML +=
                        '<div class="personItem"><div class="logoArea"><div class="logo"><img src="' +
                        item.avatar +
                        '" alt=""></div> <img class="no' +
                        (i + 1) +
                        '" src="images/no' +
                        (i + 1) +
                        '.png" alt=""></div><div class="nick">' +
                        item.nick +
                        '</div><div class="flex ac jc"><img src="images/gold.png" alt=""><div>' +
                        item.total +
                        "</div></div></div>";
                } else {
                    innerHTML +=
                        '<div class="rank-list-item flex ac js"><div class="inner-item">' +
                        (i + 1) +
                        '</div><div class="inner-item"><div class="logo"><img src="' +
                        item.avatar +
                        '" alt=""></div></div><div class="inner-item">' +
                        item.nick +
                        '</div><div class="inner-item"><img src="images/gold.png" alt=""><div>' +
                        item.total +
                        "</div></div></div>";
                }
            }
            $(".topThree").html(topHTML);
            $(".topList").html(innerHTML);
        }
    }).catch(function(error) {
        console.error("Rank error:", error);
    });
}

function getInfo(_round, isChoice) {
    console.log("Getting game info...");
    
    var params = {};
    if (_round) {
        params.round = _round;
    }
    
    callFlamingoApp('game_info', params).then(function(res) {
        console.log("Info response:", res);
        if (res.code === 200 && res.data) {
            if (res.data.countdown && res.data.countdown < 0) {
                showSuccess(info.lang == "ar" ? "خطأ في النظام، جاري إعادة الاتصال..." : "System Error, reconnecting...");
                
                if (countTimer) clearInterval(countTimer);
                if (handTimer) clearInterval(handTimer);
                if (rollTimer) clearInterval(rollTimer);
                if (resultTimer) clearInterval(resultTimer);
                
                setTimeout(function() {
                    getInfo();
                    showHand();
                }, 800);
                return;
            }

            $(".balanceCount")[0].innerHTML = parseFloat(res.data.gold).toFixed(2);
            $(".profitCount")[0].innerHTML = res.data.profit || 0;
            $(".round")[0].innerHTML = (info.lang == "ar" ? "جولة " : "Round ") + res.data.round;

            if (status == 1 && isChoice) return;
            round = res.data.round;

            if (!isChoice) {
                countTime = res.data.countdown;
                $(".coutDown")[0].innerHTML = countTime + "s";
                
                if (countTimer) clearInterval(countTimer);
                countDown();
            }

            $(".title2").hide();
            $(".title1").show();

            // نتيجة الجولة السابقة
            if (res.data.result && res.data.result != "") {
                $(".item" + searchGift(res.data.result)).addClass("active");
                $(".noPrize1>div img:last-child").attr(
                    "src",
                    "images/gift_" + searchGift(res.data.result) + ".png"
                );
            }

            // قائمة النتائج
            var giftListHtml = "";
            var resultList = (res.data.resultList || []).reverse();
            for (var i = 0; i < resultList.length; i++) {
                var _index = searchGift(resultList[i]);
                if (i == 0) {
                    giftListHtml +=
                        '<div class="giftItem"><img src="images/gift_' +
                        _index +
                        '.png" alt=""><img src="images/new.png" alt=""></div>';
                } else {
                    giftListHtml +=
                        '<div class="giftItem"><img src="images/gift_' +
                        _index +
                        '.png" alt=""></div>';
                }
            }
            $(".giftList").html(giftListHtml);

            if (_round) {
                clearInterval(handTimer);
                showHand();
            }

            // عرض الرهانات الحالية
            if (res.data.select && Object.keys(res.data.select).length) {
                var ak = Object.keys(res.data.select);
                var vk = Object.values(res.data.select);
                for (var i = 0; i < ak.length; i++) {
                    $(".item" + searchGift(ak[i]) + " .selected div:nth-child(2) div")[0].innerHTML = vk[i];
                    $(".item" + searchGift(ak[i]) + " .selected").show();
                }
            } else {
                for (var i = 0; i < $(".item .gray").length; i++) {
                    $(".item" + (i + 1) + " .selected div:nth-child(2) div")[0].innerHTML = 0;
                    $(".item" + (i + 1) + " .selected").hide();
                }
            }

            // عرض النتيجة
            if (_round && res.data.top && res.data.top.length) {
                showResult(
                    res.data.result,
                    res.data.top,
                    res.data.winGold,
                    res.data.avatar
                );
            } else if (_round) {
                if (info.lang == "ar") {
                    $(".rewordNo .roundWord").html("جولة " + (round - 1) + " النتيجة");
                } else {
                    $(".rewordNo .roundWord").html("The result of " + (round - 1) + " round:");
                }
                
                resultTimer = setInterval(function() {
                    resultCount--;
                    if (resultCount < 0) {
                        resultCount = 5;
                        clearInterval(resultTimer);
                        $(".rewordNo").hide();
                    }
                    $(".rewordNo .reword_content .countDown")[0].innerHTML = resultCount + "s";
                }, 1000);
                $(".rewordNo").show();
            }
        }
    }).catch(function(error) {
        console.error("Info error:", error);
        // محاولة إعادة الاتصال
        setTimeout(function() {
            getInfo();
        }, 2000);
    });
}

function searchGift(value) {
    if (!value) return 1;
    
    var temp = 0;
    for (var i = 0; i < choiceList.length; i++) {
        if (value == choiceList[i]) {
            temp = i;
            break;
        }
    }
    var list = [6, 7, 8, 1, 2, 3, 4, 5];
    return list[temp] || 1;
}

function getBill() {
    callFlamingoApp('game_bill').then(function(res) {
        console.log("Bill response:", res);
        if (res.code == 200 && res.data) {
            var innerHTML = "";
            var list = [6, 7, 8, 1, 2, 3, 4, 5];
            
            for (var i = 0; i < res.data.length; i++) {
                var tempItem = res.data[i];
                var isWin = tempItem.choice == tempItem.result;
                innerHTML +=
                    '<div class="records-list-item flex ac js"><div class="inner-item">' +
                    tempItem.gold +
                    ' gold</div><div class="inner-item"> <img src="images/gift_' +
                    searchGift(tempItem.choice) +
                    '.png" alt=""> </div><div class="inner-item"><img src="images/gift_' +
                    (tempItem.result ? searchGift(tempItem.result) : '1') +
                    '.png" alt=""></div><div class="inner-item"><div>' +
                    changeWord(isWin) +
                    "</div>" +
                    (isWin ?
                        "<div>(" +
                        timesWord[searchGift(tempItem.result) - 1] +
                        changeTimesWord() +
                        ")</div>" :
                        "") +
                    '</div><div class="inner-item"><div>' +
                    moment(tempItem.createTime).format("YYYY/MM/DD") +
                    "</div><div>" +
                    moment(tempItem.createTime).format("HH:mm:ss") +
                    "</div></div></div>";
            }
            $(".records-list").html(innerHTML);
        }
    }).catch(function(error) {
        console.error("Bill error:", error);
    });
}

function changeTimesWord() {
    return info.lang == "ar" ? " مرات" : " times";
}

function changeWord(win) {
    if (info.lang == "ar") {
        return win ? "نعم" : "لا";
    } else {
        return win ? "Yes" : "No";
    }
}

function showSuccess(msg, fn) {
    console.log("Showing success message:", msg);
    $(".pop-success div")[0].innerHTML = msg;
    $(".pop-success").show();
    setTimeout(function() {
        $(".pop-success div")[0].innerHTML = "";
        if (fn) fn();
        $(".pop-success").hide();
    }, 1500);
}

function changeLang(defaultLang) {
    if ('en,ar,in,yn'.indexOf(defaultLang) === -1 || !defaultLang) {
        defaultLang = 'en';
    }

    function languageSelect(defaultLang) {
        $("[i18n]").i18n({
            defaultLang: defaultLang,
            filePath: "js/i18n/",
            filePrefix: "i18n_",
            fileSuffix: "",
            forever: true,
            callback: function(res) {},
        });
    }
    
    if (info.lang == "ar") {
        $(".records").attr("src", "images/btn_records@2x.png");
        $(".rule").attr("src", "images/btn_rule@2x.png");
        $(".rank").attr("src", "images/btn_rank@2x.png");
    }

    languageSelect(defaultLang);
}

// دالة لإغلاق اللعبة
function closeGame() {
    sendToApp({ action: 'close' });
}

// إضافة تصفح السجلات في وضع التطوير
if (window.location.href.indexOf('debug') > -1) {
    console.log("Debug mode enabled");
    $("body").append('<div id="debug-console" style="position:fixed; top:10px; left:10px; background:rgba(0,0,0,0.8); color:#0f0; padding:10px; z-index:9999; font-size:12px; max-height:200px; overflow:auto;"></div>');
    
    var originalLog = console.log;
    console.log = function() {
        originalLog.apply(console, arguments);
        var args = Array.prototype.slice.call(arguments);
        $("#debug-console").prepend('<div>' + args.join(' ') + '</div>');
    };
}
