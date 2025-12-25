/**
 * لعبة عجلة الفواكه - نسخة آمنة
 * جميع الطلبات تمر عبر تطبيق Flutter (لا اتصال مباشر بـ Parse)
 */

var count = 4;
var rollCount = 0; // تم التصحيح من 1 إلى 0
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

// متغيرات جديدة لإدارة الحالة
var gameState = {
    isRolling: false,
    isResultShowing: false,
    canSelect: true,
    serverCountdown: 0,
    lastServerUpdate: 0
};

// متغير لمنع النقرات المتعددة
var isProcessingClick = false;

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
    moment.tz.setDefault("Asia/Riyadh");
    changeLang(info.lang || 'en');
    showHand();
    bindEvent();
    
    // بدء تحديث دوري للحالة من السيرفر
    startServerSync();
    
    getInfo();
    getBill();
    getRank();
}

function startServerSync() {
    // تحديث من السيرفر كل 3 ثواني
    setInterval(function() {
        if (!gameState.isRolling && !gameState.isResultShowing) {
            getInfo(null, true); // تحديث صامت بدون إعادة تعيين
        }
    }, 3000);
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
    console.log("Showing result for round:", round - 1);
    
    // إعادة تعيين حالة العرض
    gameState.isResultShowing = true;
    gameState.canSelect = false;
    
    // إيقاف جميع المؤقتات
    if (handTimer) clearInterval(handTimer);
    if (countTimer) clearInterval(countTimer);
    if (rollTimer) clearInterval(rollTimer);
    
    $(".reword").show();
    if (winGold && winGold > 0) {
        $(".prize").show();
        $(".noPrize").hide();
        $(".reword_word>div:first-child>div:last-child")[0].innerHTML = winGold;
        $(".prize .self img").attr("src", avatar);
        $(".reword_word>div img:last-child").attr(
            "src",
            "images/gift_" + searchGift(result) + ".png"
        );
    } else {
        $(".noPrize").show();
        $(".prize").hide();
        $(".noPrize>div img:last-child").attr(
            "src",
            "images/gift_" + searchGift(result) + ".png"
        );
    }
    
    if (info.lang == "ar") {
        $(".reword .roundWord").html("جولة " + (round - 1) + " النتيجة");
        $(".noPrize .roundWord").html("جولة " + (round - 1) + " النتيجة");
    } else {
        $(".reword .roundWord").html("The result of " + (round - 1) + " round:");
        $(".noPrize .roundWord").html("The result of " + (round - 1) + " round:");
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
    
    // إعادة تعيين العد التنازلي للنتيجة
    resultCount = 5;
    $(".reword .reword_content .countDown")[0].innerHTML = resultCount + "s";
    $(".noPrize .reword_content .countDown")[0].innerHTML = resultCount + "s";
    
    if (resultTimer) clearInterval(resultTimer);
    resultTimer = setInterval(function() {
        resultCount--;
        if (resultCount <= 0) {
            resultCount = 5;
            clearInterval(resultTimer);
            $(".reword").hide();
            $(".prize").hide();
            $(".noPrize").hide();
            
            // إعادة تعيين الحالة للجولة الجديدة
            gameState.isResultShowing = false;
            gameState.canSelect = true;
            status = 0;
            
            // بدء جولة جديدة بعد إغلاق نافذة النتيجة
            showHand();
            getInfo();
        }
        $(".reword .reword_content .countDown")[0].innerHTML = resultCount + "s";
        $(".noPrize .reword_content .countDown")[0].innerHTML = resultCount + "s";
    }, 1000);
}

function countDown() {
    if (countTimer) {
        clearInterval(countTimer);
    }
    
    // استخدام العداد من السيرفر
    var serverCountdown = gameState.serverCountdown;
    if (serverCountdown > 0) {
        countTime = serverCountdown;
    }
    
    $(".coutDown")[0].innerHTML = countTime + "s";
    
    countTimer = setInterval(function() {
        countTime--;
        
        // تحديث من السيرفر كل 5 ثواني للتزامن
        if (countTime % 5 === 0) {
            getInfo(null, true);
        }
        
        if (countTime <= 0) {
            countTime = 0;
            status = 1;
            gameState.canSelect = false;
            
            clearInterval(countTimer);
            roll();
        }
        $(".coutDown")[0].innerHTML = countTime + "s";
    }, 1000);
}

function openDraw() {
    // الحصول على نتائج الجولة السابقة
    getInfo(round);
}

function sureClick(choice, index) {
    // منع النقرات المتعددة أثناء المعالجة
    if (isProcessingClick || !gameState.canSelect) {
        console.log("Click ignored - processing previous request or selection disabled");
        return;
    }
    
    // التحقق من حالة السحب
    if (status !== 0 || gameState.isRolling || gameState.isResultShowing) {
        showSuccess(info.lang == "ar" ? "غير مسموح بالتحديد الآن" : "Selection not allowed now");
        return;
    }
    
    // التحقق من الرصيد
    let currentBalance = parseFloat($('.balanceCount').text());
    if (currentBalance < currentGold) {
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        return;
    }

    // تفعيل حماية النقر المتعدد
    isProcessingClick = true;

    // تحديث الرصيد مؤقتاً
    $('.balanceCount').text((currentBalance - currentGold).toFixed(2));

    // إرسال الطلب عبر التطبيق (آمن)
    callFlamingoApp('game_choice', {
        choice: choice,
        gold: currentGold
    }).then(function(res) {
        console.log("Choice response:", res);
        // إلغاء حماية النقر المتعدد
        isProcessingClick = false;
        
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
            
            // تحديث معلومات الجولة
            getInfo(null, true);
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
        // إلغاء حماية النقر المتعدد
        isProcessingClick = false;
        showSuccess(info.lang == "ar" ? "خطأ في النظام" : "System Error");
        $('.balanceCount').text(currentBalance.toFixed(2));
    });
}

function roll() {
    console.log("Starting roll...");
    
    // التحقق من عدم وجود سحب سابق يعمل
    if (gameState.isRolling) {
        console.log("Roll already in progress");
        return;
    }
    
    gameState.isRolling = true;
    hideHand();
    
    // إعادة تعيين المتغيرات
    selectCount = 0;
    selectArr = [];
    rollCount = 0;
    
    $(".title1").hide();
    $(".title2").show();
    $(".coutDown")[0].innerHTML = "0s";
    
    // إخفاء جميع التحديدات
    for (var i = 1; i <= 8; i++) {
        $(`.item${i} .selected div:nth-child(2) div`)[0].innerHTML = "0";
        $(`.item${i} .selected`).hide();
        $(`.item${i}`).removeClass("active");
        $(`.item${i} .gray`).show();
    }
    
    // إخفاء أول عنصر
    $(`.item1 .gray`).hide();
    
    // بدء حركة السحب
    var rollDuration = 3000; // 3 ثواني
    var rollStartTime = Date.now();
    var rollSpeed = 100; // سرعة أولية
    var speedIncreaseTime = rollDuration / 2;
    
    if (rollTimer) clearInterval(rollTimer);
    
    rollTimer = setInterval(function() {
        var elapsed = Date.now() - rollStartTime;
        
        // زيادة السرعة مع مرور الوقت
        if (elapsed > speedIncreaseTime) {
            rollSpeed = 150; // إبطاء قليلاً في النهاية
        }
        
        // إظهار جميع العناصر
        for (var i = 1; i <= 8; i++) {
            $(`.item${i} .gray`).show();
        }
        
        // الانتقال للعنصر التالي
        rollCount = (rollCount + 1) % 8;
        
        // إخفاء العنصر الحالي
        $(`.item${rollCount + 1} .gray`).hide();
        
        // التوقف بعد المدة المحددة
        if (elapsed >= rollDuration) {
            clearInterval(rollTimer);
            gameState.isRolling = false;
            
            // الانتقال لعرض النتيجة بعد ثانية
            setTimeout(function() {
                console.log("Roll finished, opening draw...");
                openDraw();
            }, 1000);
        }
    }, rollSpeed);
}

function bindEvent() {
    $(".clickArea .clickItem").click(function() {
        if (gameState.isRolling || gameState.isResultShowing) {
            return;
        }
        
        for (var i = 0; i < $(".clickItem").length; i++) {
            $($(".clickItem")[i]).removeClass("active");
        }
        $(this).addClass("active");
        currentGold = goldList[$(this).data("index")];
        console.log("Selected gold:", currentGold);
    });
    
    try {
        document.addEventListener("visibilitychange", function() {
            if (document.hidden) {
                // إيقاف المؤقتات عند إخفاء الصفحة
                if (countTimer) clearInterval(countTimer);
                if (handTimer) clearInterval(handTimer);
                if (rollTimer) clearInterval(rollTimer);
                if (resultTimer) clearInterval(resultTimer);
            } else {
                // استئناف عند الظهور
                if (!gameState.isResultShowing && !gameState.isRolling) {
                    getInfo();
                    if (status === 0) {
                        showHand();
                    }
                }
            }
        });
    } catch (e) {
        console.error("Visibility change error:", e);
    }

    $("body").click(function() {
        sendToApp({ action: 'closeWin' });
    });

    $(".content").click(function(e) {
        e.stopPropagation();
    });

    // ربط أحداث النقر على الفواكه
    $(".item").click(function() {
        var index = $(this).data("index");
        console.log("Clicked item index:", index);
        
        if (status == 0 && !isProcessingClick && gameState.canSelect) {
            // إزالة التفعيل من جميع العناصر
            for (var i = 1; i <= 8; i++) {
                $(".item" + i).removeClass("active");
            }
            
            // التحقق من الحد الأقصى للتحديدات
            if (selectArr.length >= 6) {
                var isHas = false;
                for (var i = 0; i < selectArr.length; i++) {
                    if (selectArr[i] == choiceList[index]) {
                        isHas = true;
                        break;
                    }
                }
                
                if (!isHas) {
                    showSuccess(info.lang == "ar" ? "الحد الأقصى للتحديدات هو 6" : "Max 6 selections allowed");
                    return;
                }
            }

            sureClick(choiceList[index], index);
        }
    });
    
    $(".records").click(function() {
        getBill();
        $(".recordsBg").show();
    });
    $(".recordsBg .modalBack").click(function() {
        $(".recordsBg").hide();
    });

    $(".rule").click(function() {
        $(".ruleBg").show();
    });
    $(".ruleBg").click(function() {
        $(".ruleBg").hide();
    });

    $(".rank").click(function() {
        getRank();
        $(".rankBg").show();
    });
    $(".rankBg .modalBack").click(function() {
        $(".rankBg").hide();
    });
    $(".reword").click(function(e) {
        e.stopPropagation();
    });

    $(".rewardBg .modalBack").click(function() {
        $(".rewardBg").hide();
    });

    $(".rewordNo").click(function(e) {
        e.stopPropagation();
    });
    $(".pop-success").click(function(e) {
        e.stopPropagation();
    });
}

/**
 * دالة آمنة للاتصال بـ Parse عبر التطبيق
 * بدلاً من الاتصال المباشر بـ Parse Server
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

function getInfo(_round, isSilent) {
    console.log("Getting game info...", "_round:", _round, "isSilent:", isSilent);
    
    // منع الطلبات المتعددة أثناء عرض النتيجة
    if (gameState.isResultShowing && !_round) {
        return;
    }
    
    var params = {};
    if (_round) {
        params.round = _round;
    }
    
    callFlamingoApp('game_info', params).then(function(res) {
        console.log("Info response:", res);
        if (res.code === 200 && res.data) {
            // تحديث حالة اللعبة من السيرفر
            gameState.serverCountdown = res.data.countdown || 0;
            gameState.lastServerUpdate = Date.now();
            
            // التحقق من countdown سالب
            if (res.data.countdown < 0) {
                console.warn("Negative countdown detected:", res.data.countdown);
                res.data.countdown = 10; // قيمة افتراضية
            }

            // تحديث الرصيد والأرباح
            var currentBalance = parseFloat($('.balanceCount').text());
            var newBalance = parseFloat(res.data.gold || 0);
            
            if (!isNaN(newBalance) && newBalance !== currentBalance) {
                $(".balanceCount")[0].innerHTML = newBalance.toFixed(2);
            }
            
            $(".profitCount")[0].innerHTML = res.data.profit || 0;
            $(".round")[0].innerHTML = (info.lang == "ar" ? "جولة " : "Round ") + res.data.round;

            // تحديث رقم الجولة
            var previousRound = round;
            round = res.data.round || 0;

            // تحديث العداد من السيرفر إذا لم نكن في وضع صامت
            if (!isSilent) {
                countTime = Math.max(0, res.data.countdown || 10);
                $(".coutDown")[0].innerHTML = countTime + "s";
                
                // إعادة تعيين المؤقت فقط إذا كنا في حالة التحديد
                if (status === 0 && !gameState.isRolling && !gameState.isResultShowing) {
                    if (countTimer) clearInterval(countTimer);
                    countDown();
                }
            }

            // إدارة الحالة بناءً على العداد
            if (res.data.countdown <= 0 && status === 0) {
                status = 1;
                gameState.canSelect = false;
                if (!gameState.isRolling) {
                    roll();
                }
            } else if (res.data.countdown > 0) {
                status = 0;
                gameState.canSelect = true;
                $(".title2").hide();
                $(".title1").show();
            }

            // نتيجة الجولة السابقة
            if (res.data.result && res.data.result != "") {
                var giftIndex = searchGift(res.data.result);
                $(".item" + giftIndex).addClass("active");
                $(".noPrize1>div img:last-child").attr(
                    "src",
                    "images/gift_" + giftIndex + ".png"
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

            // عرض الرهانات الحالية للجولة
            if (res.data.select && Object.keys(res.data.select).length) {
                // إعادة تعيين selectArr من البيانات المستلمة
                selectArr = Object.keys(res.data.select);
                selectCount = selectArr.length;
                
                var ak = Object.keys(res.data.select);
                var vk = Object.values(res.data.select);
                
                // إعادة تعيين أولاً
                for (var i = 1; i <= 8; i++) {
                    $(`.item${i} .selected div:nth-child(2) div`)[0].innerHTML = "0";
                    $(`.item${i} .selected`).hide();
                }
                
                // تعيين القيم الجديدة
                for (var i = 0; i < ak.length; i++) {
                    var itemIndex = searchGift(ak[i]);
                    $(`.item${itemIndex} .selected div:nth-child(2) div`)[0].innerHTML = vk[i];
                    $(`.item${itemIndex} .selected`).show();
                }
            } else if (!isSilent) {
                // إعادة تعيين selectArr فقط إذا لم نكن في تحديث صامت
                selectArr = [];
                selectCount = 0;
                
                for (var i = 1; i <= 8; i++) {
                    $(`.item${i} .selected div:nth-child(2) div`)[0].innerHTML = "0";
                    $(`.item${i} .selected`).hide();
                }
            }

            // عرض النتيجة إذا كانت هذه استجابة لطلب نتيجة جولة
            if (_round && res.data.top) {
                showResult(
                    res.data.result,
                    res.data.top,
                    res.data.winGold,
                    res.data.avatar
                );
            }
        } else {
            console.error("Error in game info:", res);
            if (!isSilent) {
                showSuccess(info.lang == "ar" ? "خطأ في النظام" : "System Error");
            }
        }
    }).catch(function(error) {
        console.error("Info error:", error);
        if (!isSilent) {
            showSuccess(info.lang == "ar" ? "خطأ في الاتصال" : "Connection Error");
        }
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
    // إيقاف جميع المؤقتات قبل الإغلاق
    if (countTimer) clearInterval(countTimer);
    if (handTimer) clearInterval(handTimer);
    if (rollTimer) clearInterval(rollTimer);
    if (resultTimer) clearInterval(resultTimer);
    
    sendToApp({ action: 'close' });
}
