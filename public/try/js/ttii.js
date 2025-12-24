/**
 * لعبة عجلة الفواكه - نسخة آمنة - مع تصحيح مشكلة النقر
 * تم إصلاح: المستخدم لا يمكنه النقر على الفواكه لوضع رهان
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

console.log("Player Info:", info);

// استلام معلومات اللاعب من التطبيق
window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("Received player info:", info);
    init();
};

// استلام الاستجابات من التطبيق
window.onFlamingoResponse = function(response) {
    console.log("Received response from app:", response);
    
    var requestId = response.requestId;
    if (requestId && pendingRequests[requestId]) {
        var callback = pendingRequests[requestId];
        delete pendingRequests[requestId];
        
        if (response.success) {
            callback.resolve(response.data);
        } else {
            callback.reject(response.error || 'Unknown error');
        }
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

function init() {
    console.log("Initializing game...");
    status = 0; // [FIX] تأكد من أن status = 0 للسماح بالنقر على الفواكه
    moment.tz.setDefault("Asia/Riyadh");
    changeLang(info.lang || 'en');
    showHand();
    bindEvent();
    getInfo();
    getBill();
    getRank();
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
    countTimer = setInterval(function() {
        countTime--;
        if (countTime <= 0) {
            countTime = 0;
            status = 1; // بدء السحب
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
    // التحقق من الرصيد
    let currentBalance = parseFloat($('.balanceCount').text());
    if (currentBalance < currentGold) {
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        return;
    }

    // تحديث الرصيد مؤقتاً
    $('.balanceCount').text((currentBalance - currentGold).toFixed(2));

    // إرسال الطلب عبر التطبيق (آمن)
    callFlamingoApp('game_choice', {
        choice: choice,
        gold: currentGold
    }).then(function(res) {
        console.log("Choice response:", res);
        if (res.code == 200) {
            selectCount += 1;
            if (!selectArr.includes(choice)) {
                selectArr.push(choice);
            }

            var list = [6, 7, 8, 1, 2, 3, 4, 5];
            var temp = $(`.item${list[index]} .selected div:nth-child(2) div`)[0].innerHTML;
            $(`.item${list[index]} .selected div:nth-child(2) div`)[0].innerHTML = 
                parseInt(temp) + parseInt(currentGold);
            $(`.item${list[index]} .selected`).show();

            // تحديث الرصيد
            if (res.balance !== undefined) {
                $('.balanceCount').text(parseFloat(res.balance).toFixed(2));
            }
            
            // إعلام التطبيق بتحديث الرصيد
            sendToApp({ action: 'refreshBalance' });
        } else if (res.code == 10062) {
            showSuccess(info.lang == "ar" ? "يرجى الشحن" : "Please recharge");
            // إعادة الرصيد
            $('.balanceCount').text(currentBalance.toFixed(2));
        } else {
            showSuccess(res.message || 'Error');
            $('.balanceCount').text(currentBalance.toFixed(2));
        }
    }).catch(function(error) {
        console.error("Choice error:", error);
        showSuccess(info.lang == "ar" ? "خطأ في النظام" : "System Error");
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
            status = 0; // [FIX] أعد status إلى 0 بعد انتهاء السحب
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
    // معالج اختيار الرقاقة (الرهان)
    $(".clickArea .clickItem").click(function() {
        for (var i = 0; i < $(".clickItem").length; i++) {
            $($(".clickItem").removeClass("active"));
        }
        $(this).addClass("active");
        currentGold = goldList[$(this).data("index")];
        console.log("Selected gold:", currentGold);
    });
    
    // معالج رؤية الصفحة
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

    // [FIX] تحسين معالج النقر على الفواكه
    for (var i = 0; i < 8; i++) {
        (function(index) {
            $(".item" + (index + 1)).on("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log("=== FRUIT CLICKED ===");
                console.log("Index:", index);
                console.log("Status:", status, "(0=can click, 1=rolling)");
                console.log("Choice:", choiceList[index]);
                console.log("Current Gold:", currentGold);
                
                if (status === 0) {
                    var choice = choiceList[index];
                    console.log("✓ Processing bet...");
                    sureClick(choice, index);
                } else {
                    console.log("✗ Cannot bet - status is not 0");
                    showSuccess(info.lang == "ar" ? "انتظر حتى نهاية الجولة" : "Wait until the round ends");
                }
            });
        })(i);
    }
}

/**
 * دالة آمنة للاتصال بـ Parse عبر التطبيق
 */
function callFlamingoApp(action, params) {
    return new Promise(function(resolve, reject) {
        var requestId = 'req_' + (++requestIdCounter) + '_' + Date.now();
        
        // تخزين callback
        pendingRequests[requestId] = {
            resolve: resolve,
            reject: reject
        };
        
        // إرسال الطلب للتطبيق
        var message = JSON.stringify({
            action: action,
            requestId: requestId,
            params: params || {}
        });
        
        console.log("Sending to app:", message);
        
        if (window.FlamingoApp) {
            window.FlamingoApp.postMessage(message);
        } else {
            reject('FlamingoApp not available');
        }
        
        // Timeout بعد 30 ثانية
        setTimeout(function() {
            if (pendingRequests[requestId]) {
                delete pendingRequests[requestId];
                reject('Request timeout');
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
                
                // [FIX] تأكد من أن status = 0 قبل بدء العد التنازلي
                status = 0;
                console.log("Betting phase started - status set to 0");
                
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
        }
    }).catch(function(error) {
        console.error("getInfo error:", error);
    });
}

function getBill() {
    callFlamingoApp('game_bill').then(function(res) {
        console.log("Bill response:", res);
    }).catch(function(error) {
        console.error("Bill error:", error);
    });
}

function showSuccess(str) {
    $(".pop-success div")[0].innerHTML = str;
    $(".pop-success").show();
    setTimeout(function() {
        $(".pop-success").hide();
    }, 2000);
}

function searchGift(choice) {
    return choiceList.indexOf(choice) + 1;
}

function changeLang(lang) {
    // تنفيذ تغيير اللغة
    if (window.$.i18n) {
        window.$.i18n.load(lang);
    }
}
