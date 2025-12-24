/**
 * لعبة عجلة الفواكه - نسخة آمنة
 * تتصل مباشرة بـ Parse Server
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

// معلومات اللاعب
var info = {
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

console.log("Game initialized");

// إنشاء لوحة تصحيح مرئية داخل الصفحة (لأنك لا تستطيع الوصول إلى Console من التطبيق)
function ensureDebugOverlay() {
    if (document.getElementById('flamingo-debug-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'flamingo-debug-overlay';
    overlay.style.position = 'fixed';
    overlay.style.right = '10px';
    overlay.style.bottom = '80px';
    overlay.style.maxWidth = '320px';
    overlay.style.maxHeight = '40vh';
    overlay.style.overflow = 'auto';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.color = '#0f0';
    overlay.style.fontSize = '11px';
    overlay.style.padding = '8px';
    overlay.style.borderRadius = '8px';
    overlay.style.zIndex = 99999;
    overlay.style.display = 'block';
    overlay.style.fontFamily = 'monospace';
    overlay.style.border = '1px solid #0f0';
    document.body.appendChild(overlay);

    // زر Logs للتبديل
    var btn = document.createElement('button');
    btn.innerText = 'Logs ▲';
    btn.id = 'flamingo-logs-btn';
    btn.style.position = 'fixed';
    btn.style.right = '10px';
    btn.style.bottom = '130px';
    btn.style.zIndex = 99999;
    btn.style.padding = '8px 10px';
    btn.style.borderRadius = '6px';
    btn.style.border = 'none';
    btn.style.background = '#0f0';
    btn.style.color = '#000';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.onclick = function() {
        var isVisible = overlay.style.display !== 'none';
        overlay.style.display = isVisible ? 'none' : 'block';
        btn.innerText = isVisible ? 'Logs ▼' : 'Logs ▲';
    };
    document.body.appendChild(btn);

    // زر Copy لنسخ السجلات
    var copyBtn = document.createElement('button');
    copyBtn.innerText = 'Copy';
    copyBtn.style.position = 'fixed';
    copyBtn.style.right = '70px';
    copyBtn.style.bottom = '130px';
    copyBtn.style.zIndex = 99999;
    copyBtn.style.padding = '8px 10px';
    copyBtn.style.borderRadius = '6px';
    copyBtn.style.border = 'none';
    copyBtn.style.background = '#0066ff';
    copyBtn.style.color = '#fff';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.fontWeight = 'bold';
    copyBtn.onclick = function() {
        var text = '';
        var lines = overlay.querySelectorAll('div');
        for (var i = lines.length - 1; i >= 0; i--) {
            text += lines[i].innerText + '\n';
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
                var oldText = copyBtn.innerText;
                copyBtn.innerText = 'Copied! ✓';
                setTimeout(function() {
                    copyBtn.innerText = oldText;
                }, 2000);
            });
        } else {
            // fallback للمتصفحات القديمة
            var textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            var oldText = copyBtn.innerText;
            copyBtn.innerText = 'Copied! ✓';
            setTimeout(function() {
                copyBtn.innerText = oldText;
            }, 2000);
        }
    };
    document.body.appendChild(copyBtn);

    // زر Clear لحذف السجلات
    var clearBtn = document.createElement('button');
    clearBtn.innerText = 'Clear';
    clearBtn.style.position = 'fixed';
    clearBtn.style.right = '130px';
    clearBtn.style.bottom = '130px';
    clearBtn.style.zIndex = 99999;
    clearBtn.style.padding = '8px 10px';
    clearBtn.style.borderRadius = '6px';
    clearBtn.style.border = 'none';
    clearBtn.style.background = '#ff6600';
    clearBtn.style.color = '#fff';
    clearBtn.style.cursor = 'pointer';
    clearBtn.style.fontWeight = 'bold';
    clearBtn.onclick = function() {
        overlay.innerHTML = '';
    };
    document.body.appendChild(clearBtn);
}

function addDebugLog(msg) {
    try {
        ensureDebugOverlay();
        var overlay = document.getElementById('flamingo-debug-overlay');
        if (!overlay) return;
        var line = document.createElement('div');
        var time = new Date().toLocaleTimeString();
        line.innerText = '[' + time + '] ' + msg;
        line.style.padding = '3px 0';
        line.style.borderBottom = '1px solid #333';
        overlay.insertBefore(line, overlay.firstChild);
        // الآن لا يختفي الـ overlay تلقائياً - يبقى مرئياً
    } catch (e) {
        console.error('addDebugLog error', e);
    }
}

// استلام معلومات اللاعب من التطبيق
window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("Received player info:", info);
    init();
};

// استلام الاستجابات من التطبيق
window.onFlamingoResponse = function(response) {
    console.log("=== onFlamingoResponse Called ===");
    console.log("Received response:", response);
    console.log("Response type:", typeof response);
    console.log("Pending requests:", Object.keys(pendingRequests));
    
    // إذا أرسل التطبيق سلسلة JSON كنص، حاول تحويلها لكائن
    if (typeof response === 'string') {
        try {
            response = JSON.parse(response);
            addDebugLog('Parsed response string to object: ' + (response.requestId || 'no-id'));
        } catch (e) {
            console.warn('onFlamingoResponse: response is string but JSON.parse failed', e);
            addDebugLog('Received non-JSON string response');
        }
    }

    if (!response) {
        console.error("Response is empty/null");
        return;
    }

    var requestId = response.requestId;
    console.log("Looking for requestId:", requestId);
    console.log("Request exists:", !!pendingRequests[requestId]);
    
    if (requestId && pendingRequests[requestId]) {
        console.log("Found pending request! Resolving...");
        var callback = pendingRequests[requestId];
        delete pendingRequests[requestId];
        
        console.log("Response success:", response.success);
        console.log("Response code:", response.code);
        console.log("Response data:", response.data);
        
        if (response.success || response.code === 200) {
            console.log("Calling resolve with data");
            callback.resolve(response.data || response);
        } else {
            console.log("Calling reject");
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
    console.log("Document ready");
    
    // تهيئة currentGold بالقيمة الافتراضية
    currentGold = goldList[0];
    
    // انتظار معلومات اللاعب من التطبيق
    if (window.flamingoPlayerInfo) {
        info = window.flamingoPlayerInfo;
        init();
    } else {
        // انتظار قصير ثم المحاولة
        setTimeout(function() {
            if (window.flamingoPlayerInfo) {
                info = window.flamingoPlayerInfo;
            }
            init();
        }, 500);
    }
});

// دالة اختبار العناصر
function testElements() {
    console.log("Testing elements...");
    for (var i = 1; i <= 8; i++) {
        var selector = ".item" + i;
        var exists = $(selector).length > 0;
        console.log(selector + ": " + (exists ? "Found" : "Not found"));
    }
    console.log("Total .item elements:", $(".item").length);
    console.log("Total .clickItem elements:", $(".clickItem").length);
}

function init() {
    console.log("Initializing game...");
    console.log("Info object:", info);
    
    testElements(); // اختبار العناصر
    
    moment.tz.setDefault("Asia/Riyadh");
    changeLang(info.lang || 'en');
    showHand();
    bindEvent();
    
    // تأكد من تحديد قيمة الرهان الافتراضية
    $(".clickItem").first().addClass("active");
    
    // انتظر قليلاً قبل جلب البيانات
    setTimeout(function() {
        getInfo();
        getBill();
        getRank();
    }, 500);
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
    if (countTimer) {
        clearInterval(countTimer);
    }
    status = 0; // تأكيد أن الحالة جاهزة للنقر
    countTimer = setInterval(function() {
        countTime--;
        if (countTime <= 0) {
            countTime = 0;
            status = 1;
            roll();
            clearInterval(countTimer);
        }
        $(".coutDown")[0].innerHTML = countTime + "s";
    }, 1000);
}

function openDraw() {
    getInfo(round);
}

function sureClick(choice, index) {
    console.log("=== sureClick START ===");
    console.log("choice:", choice, "index:", index, "currentGold:", currentGold);
    addDebugLog("sureClick: choice=" + choice + ", gold=" + currentGold);
    
    // التحقق من الرصيد
    var balanceText = $('.balanceCount').text().trim();
    var currentBalance = parseFloat(balanceText);
    
    console.log("Balance text:", balanceText, "Parsed:", currentBalance);
    
    if (isNaN(currentBalance)) {
        console.error("Invalid balance value:", balanceText);
        currentBalance = 0;
    }
    
    console.log("Current Balance:", currentBalance, "Current Gold:", currentGold);
    addDebugLog("Balance check: " + currentBalance + " >= " + currentGold + "?");
    
    // التحقق من كفاية الرصيد
    if (currentBalance < currentGold) {
        console.log("❌ Balance insufficient");
        addDebugLog("❌ INSUFFICIENT BALANCE");
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        return;
    }

    // التحقق من توفر التطبيق
    console.log("FlamingoApp available:", !!window.FlamingoApp);
    if (!window.FlamingoApp) {
        console.error("❌ FlamingoApp not available");
        addDebugLog("❌ FlamingoApp NOT available");
        showSuccess(info.lang == "ar" ? "خطأ: التطبيق غير متوفر" : "Error: App not available");
        return;
    }

    // تحديث الرصيد مؤقتاً في الواجهة
    var newBalance = (currentBalance - currentGold).toFixed(2);
    console.log("Updating UI balance to:", newBalance);
    $('.balanceCount').text(newBalance);
    addDebugLog("UI balance updated: " + newBalance);

    // إرسال الطلب عبر التطبيق
    console.log("Calling game_choice...");
    addDebugLog("📤 Calling game_choice: choice=" + choice + ", gold=" + currentGold);
    
    callFlamingoApp('game_choice', {
        choice: choice,
        gold: parseInt(currentGold)
    }).then(function(res) {
        console.log("=== Choice Response Received ===");
        console.log("Response:", JSON.stringify(res));
        addDebugLog("✅ Response received: " + JSON.stringify(res).substring(0, 50));
        
        if (!res) {
            console.error("❌ Empty response");
            addDebugLog("❌ Empty response from server");
            showSuccess(info.lang == "ar" ? "فشل الاتصال" : "Connection failed");
            $('.balanceCount').text(currentBalance.toFixed(2));
            return;
        }

        console.log("Response code:", res.code, "Response success:", res.success);
        
        if (res && (res.code == 200 || res.success)) {
            console.log("✅ Success! Updating UI...");
            addDebugLog("✅ SUCCESS: Bet placed");
            
            selectCount += 1;
            if (!selectArr.includes(choice)) {
                selectArr.push(choice);
            }

            var list = [6, 7, 8, 1, 2, 3, 4, 5];
            var itemNum = list[index];
            var itemSelector = ".item" + itemNum + " .selected div:nth-child(2) div";
            var $element = $(itemSelector);
            
            console.log("Item selector:", itemSelector, "Found:", $element.length > 0);
            
            if ($element.length > 0) {
                var temp = parseInt($element.html()) || 0;
                var newAmount = temp + parseInt(currentGold);
                $element.html(newAmount);
                $(".item" + itemNum + " .selected").show();
                console.log("Updated item amount to:", newAmount);
                addDebugLog("UI item updated: " + newAmount);
            } else {
                console.error("❌ Item element not found:", itemSelector);
                addDebugLog("❌ Item element not found");
            }

            // تحديث الرصيد من الاستجابة
            if (res.balance !== undefined) {
                console.log("Updating balance from response to:", res.balance);
                $('.balanceCount').text(parseFloat(res.balance).toFixed(2));
                addDebugLog("Balance updated: " + res.balance);
            }
            
            showSuccess(info.lang == "ar" ? "تم وضع الرهان بنجاح ✓" : "Bet placed successfully ✓");
        } else if (res && res.code == 10062) {
            console.log("❌ Insufficient balance on server");
            addDebugLog("❌ Server: Insufficient balance");
            showSuccess(info.lang == "ar" ? "يرجى الشحن" : "Please recharge");
            $('.balanceCount').text(currentBalance.toFixed(2));
        } else {
            console.error("❌ Error response:", res);
            addDebugLog("❌ Error: " + (res?.message || "Unknown error"));
            showSuccess((res && res.message) || (info.lang == "ar" ? "حدث خطأ" : "Error"));
            $('.balanceCount').text(currentBalance.toFixed(2));
        }
        console.log("=== sureClick END ===");
    }).catch(function(error) {
        console.error("=== Choice Error ===", error);
        addDebugLog("❌ CATCH ERROR: " + error);
        showSuccess(info.lang == "ar" ? "خطأ في وضع الرهان" : "Error placing bet");
        $('.balanceCount').text(currentBalance.toFixed(2));
    });
}

function roll(dir) {
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
            status = 2; // تم السحب/عرض النتيجة
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
    
    // ربط اختيار قيمة الرهان
    $(".clickArea .clickItem").click(function() {
        console.log("clickItem clicked");
        for (var i = 0; i < $(".clickItem").length; i++) {
            $($(".clickItem")[i]).removeClass("active");
        }
        $(this).addClass("active");
        currentGold = goldList[$(this).data("index")];
        console.log("Selected gold amount:", currentGold);
        addDebugLog("Gold selected: " + currentGold);
    });
    
    // معالجة تغيير رؤية الصفحة
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

    // ربط النقر على الفواكه - الطريقة المحسنة
    console.log("Binding fruit click events...");
    
    // إزالة أي أحداث سابقة لمنع التكرار
    $(document).off('click', '.item');
    
    // استخدام event delegation
    $(document).on('click', '.item', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // الحصول على index العنصر
        var $item = $(this);
        var itemClass = $item.attr('class');
        
        // البحث عن رقم العنصر (1-8)
        var match = itemClass.match(/item(\d)/);
        if (!match) return;
        
        var index = parseInt(match[1]) - 1; // تحويل من 1-8 إلى 0-7
        
        console.log("=== FRUIT CLICKED ===");
        console.log("Item class:", itemClass, "Index:", index, "Status:", status);
        addDebugLog("Fruit clicked: index=" + index + ", status=" + status);
        
        // التحقق من الحالة
        if (status !== 0) {
            console.warn("Cannot place bet now. Status:", status);
            addDebugLog("Cannot bet - status is " + status);
            showSuccess(info.lang == "ar" ? "لا يمكن وضع رهان الآن" : "Cannot place bet now");
            return;
        }
        
        // التحقق من أن currentGold صالح
        if (!currentGold || currentGold <= 0) {
            console.warn("Invalid currentGold:", currentGold);
            addDebugLog("Invalid gold amount: " + currentGold);
            showSuccess(info.lang == "ar" ? "الرجاء اختيار مبلغ الرهان أولاً" : "Please select a bet amount first");
            return;
        }
        
        var choice = choiceList[index];
        console.log("Making bet choice:", choice);
        addDebugLog("Processing bet: " + choice);
        sureClick(choice, index);
    });
    
    console.log("=== bindEvent END ===");
}

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
        console.log("FlamingoApp:", window.FlamingoApp);

        // عرض وارسال سجل التصحيح إلى التطبيق
        addDebugLog('Sending to app: ' + message);
        try { sendToApp({ action: 'debug_log', message: message, requestId: requestId }); } catch (e) {}

        if (window.FlamingoApp) {
            try {
                console.log("Sending message to app...");
                window.FlamingoApp.postMessage(message);
                console.log("Message sent successfully");
                addDebugLog('Message sent successfully: ' + action + ' (' + requestId + ')');
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
        var timeoutId = setTimeout(function() {
            if (pendingRequests[requestId]) {
                console.error("Request timeout for:", action, requestId);
                delete pendingRequests[requestId];
                reject('Request timeout for: ' + action);
            }
        }, 30000);
        
        console.log("=== callFlamingoApp END - Waiting for response ===");
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
                
                status = 0; // تعيين الحالة إلى "يمكن النقر"
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
        status = 0; // تأكيد أن الحالة جاهزة
        setTimeout(function() {
            getInfo();
        }, 2000);
    });
}

function searchGift(value) {
    var temp = 0;
    for (var i = 0; i < choiceList.length; i++) {
        if (value == choiceList[i]) {
            temp = i;
            break;
        }
    }
    var list = [6, 7, 8, 1, 2, 3, 4, 5];
    return list[temp];
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
