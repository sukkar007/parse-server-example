/**
 * لعبة عجلة الفواكه - نسخة مبسطة
 */

var count = 4;
var rollCount = 1;
var countTime = 30; // تم تغييره من 10 إلى 30
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

console.log("=== GAME STARTED ===");

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

$(document).ready(function() {
    console.log("Document ready - Game starting");
    
    if (window.flamingoPlayerInfo) {
        info = window.flamingoPlayerInfo;
        init();
    } else {
        setTimeout(function() {
            console.log("Starting game without player info");
            init();
        }, 1000);
    }
});

function init() {
    console.log("=== INITIALIZING GAME ===");
    
    // إعادة تعيين جميع المتغيرات
    status = 0; // يمكن النقر
    currentGold = 1;
    countTime = 30; // إعادة تعيين الوقت
    
    console.log("Initial status:", status);
    console.log("Initial countTime:", countTime);
    
    // إعادة تعيين DOM
    $(".item1, .item2, .item3, .item4, .item5, .item6, .item7, .item8").removeClass("active");
    $(".clickItem").removeClass("active");
    if ($(".clickItem").length > 0) {
        $(".clickItem").first().addClass("active");
    }
    
    if (typeof moment !== 'undefined' && moment.tz) {
        moment.tz.setDefault("Asia/Riyadh");
    }
    
    changeLang(info.lang || 'en');
    bindEvent(); // ربط الأحداث أولاً
    getInfo(); // ثم جلب المعلومات
}

// دالة مبسطة لربط الأحداث
function bindEvent() {
    console.log("=== BINDING EVENTS ===");
    
    // إزالة جميع الأحداث القديمة
    $(".clickArea .clickItem").off('click');
    for (var i = 1; i <= 8; i++) {
        $(".item" + i).off('click');
    }
    
    // ربط أحداث الكوينز
    $(".clickArea .clickItem").on('click', function(e) {
        e.stopPropagation();
        $(".clickItem").removeClass("active");
        $(this).addClass("active");
        var index = $(this).data("index") || 0;
        currentGold = goldList[index] || 1;
        console.log("Selected gold:", currentGold);
    });
    
    // ربط أحداث الفواكه - نسخة مبسطة جداً
    for (var i = 1; i <= 8; i++) {
        (function(index) {
            var selector = ".item" + index;
            
            $(selector).on('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                console.log("=== FRUIT CLICKED ===");
                console.log("Fruit:", selector);
                console.log("Status:", status);
                console.log("CountTime:", countTime);
                
                // تحقق مبسط: إذا كان countTime > 0 يمكن النقر
                if (countTime > 0) {
                    console.log("Processing click...");
                    // index - 1 لأن الفواكه تبدأ من 1 و choiceList تبدأ من 0
                    var choiceIndex = index - 1;
                    if (choiceIndex >= 0 && choiceIndex < choiceList.length) {
                        var choice = choiceList[choiceIndex];
                        console.log("Choice:", choice);
                        sureClick(choice, choiceIndex);
                    }
                } else {
                    console.log("Cannot click - countTime is 0");
                    showSuccess(info.lang == "ar" ? "انتظر الجولة القادمة" : "Wait for next round");
                }
            });
            
            // إضافة مؤشر النقر
            $(selector).css('cursor', 'pointer');
        })(i);
    }
    
    console.log("Events bound successfully!");
    
    // إضافة زر إصلاح
    setTimeout(function() {
        if ($('#fixBtn').length === 0) {
            $('body').append('<div id="fixBtn" style="position:fixed; top:10px; left:10px; z-index:9999; background:#2196F3; color:white; padding:8px; border-radius:5px; cursor:pointer; font-size:12px;">Force Clickable</div>');
            
            $('#fixBtn').click(function() {
                status = 0;
                countTime = 30;
                console.log("Forced status = 0, countTime = 30");
                showSuccess("Game fixed - you can click now!");
            });
        }
    }, 1000);
}

function sureClick(choice, index) {
    console.log("=== PROCESSING BET ===");
    console.log("Choice:", choice);
    console.log("Index:", index);
    console.log("Current gold:", currentGold);
    
    // التحقق من الرصيد
    let currentBalance = parseFloat($('.balanceCount').text()) || 0;
    console.log("Current balance:", currentBalance);
    
    if (currentBalance < currentGold) {
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        return;
    }

    // تحديث الرصيد مؤقتاً
    $('.balanceCount').text((currentBalance - currentGold).toFixed(2));

    // إرسال الطلب
    callFlamingoApp('game_choice', {
        choice: choice,
        gold: currentGold
    }).then(function(res) {
        console.log("Bet response:", res);
        if (res.code == 200) {
            // تحديث العرض
            var list = [6, 7, 8, 1, 2, 3, 4, 5];
            var element = $(`.item${list[index]} .selected div:nth-child(2) div`);
            if (element.length > 0) {
                var currentBet = parseInt(element.text()) || 0;
                element.text(currentBet + currentGold);
                $(`.item${list[index]} .selected`).show();
            }
            
            // تحديث الرصيد
            if (res.balance !== undefined) {
                $('.balanceCount').text(parseFloat(res.balance).toFixed(2));
            }
            
            showSuccess(info.lang == "ar" ? "تم الرهان بنجاح!" : "Bet successful!");
        } else if (res.code == 10062) {
            showSuccess(info.lang == "ar" ? "يرجى الشحن" : "Please recharge");
            $('.balanceCount').text(currentBalance.toFixed(2));
        } else {
            showSuccess(res.message || 'Error');
            $('.balanceCount').text(currentBalance.toFixed(2));
        }
    }).catch(function(error) {
        console.error("Bet error:", error);
        showSuccess(info.lang == "ar" ? "خطأ في النظام" : "System Error");
        $('.balanceCount').text(currentBalance.toFixed(2));
    });
}

function getInfo(_round, isChoice) {
    console.log("=== GETTING GAME INFO ===");
    
    var params = {};
    if (_round) {
        params.round = _round;
    }
    
    callFlamingoApp('game_info', params).then(function(res) {
        console.log("Game info response:", res);
        
        if (res.code === 200 && res.data) {
            // تحديث المعلومات
            $(".balanceCount")[0].innerHTML = parseFloat(res.data.gold).toFixed(2);
            $(".profitCount")[0].innerHTML = res.data.profit || 0;
            $(".round")[0].innerHTML = (info.lang == "ar" ? "جولة " : "Round ") + res.data.round;
            
            round = res.data.round;
            
            // هذا هو الجزء المهم: تحديث countTime و status
            countTime = res.data.countdown || 30;
            console.log("Server countdown:", countTime);
            
            // تحديث عرض الوقت
            $(".coutDown")[0].innerHTML = countTime + "s";
            
            // إيقاف أي timer سابق
            if (countTimer) clearInterval(countTimer);
            
            // بدء countdown جديد
            countDown();
            
            // تحديث نتيجة الجولة السابقة
            if (res.data.result && res.data.result != "") {
                $(".item" + searchGift(res.data.result)).addClass("active");
            }
            
            // تحديث الرهانات الحالية
            if (res.data.select && Object.keys(res.data.select).length) {
                var ak = Object.keys(res.data.select);
                var vk = Object.values(res.data.select);
                for (var i = 0; i < ak.length; i++) {
                    $(".item" + searchGift(ak[i]) + " .selected div:nth-child(2) div")[0].innerHTML = vk[i];
                    $(".item" + searchGift(ak[i]) + " .selected").show();
                }
            }
        } else {
            console.error("Invalid response from server");
        }
    }).catch(function(error) {
        console.error("Error getting game info:", error);
    });
}

function countDown() {
    console.log("=== STARTING COUNTDOWN ===");
    console.log("Starting with countTime:", countTime);
    
    // إيقاف أي timer سابق
    if (countTimer) clearInterval(countTimer);
    
    // التأكد من أن status = 0 عندما countTime > 0
    if (countTime > 0) {
        status = 0;
        console.log("Status set to 0 (can click)");
    }
    
    countTimer = setInterval(function() {
        countTime--;
        console.log("Countdown:", countTime, "seconds left");
        
        // تحديث العرض
        $(".coutDown")[0].innerHTML = countTime + "s";
        
        // إذا وصل الوقت لصفر
        if (countTime <= 0) {
            countTime = 0;
            status = 1; // تغيير الحالة إلى "جاري السحب"
            console.log("Time's up! Status changed to 1");
            clearInterval(countTimer);
            
            // انتظر 5 ثواني ثم أظهر النتيجة
            setTimeout(function() {
                getInfo(round); // جلب النتائج
                // بعد عرض النتائج، أعد تعيين countTime
                setTimeout(function() {
                    countTime = 30;
                    status = 0;
                    console.log("Round reset - status:", status, "countTime:", countTime);
                    countDown(); // ابدأ جولة جديدة
                }, 5000);
            }, 2000);
        }
    }, 1000);
}

function callFlamingoApp(action, params) {
    return new Promise(function(resolve, reject) {
        var requestId = 'req_' + (++requestIdCounter) + '_' + Date.now();
        
        pendingRequests[requestId] = {
            resolve: resolve,
            reject: reject
        };
        
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
        
        setTimeout(function() {
            if (pendingRequests[requestId]) {
                delete pendingRequests[requestId];
                reject('Request timeout');
            }
        }, 30000);
    });
}

function showSuccess(msg) {
    console.log("Showing success:", msg);
    $(".pop-success div")[0].innerHTML = msg;
    $(".pop-success").show();
    setTimeout(function() {
        $(".pop-success").hide();
    }, 1500);
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

// إضافة هذا الكود للفحص
$(window).on('load', function() {
    console.log("=== WINDOW FULLY LOADED ===");
    
    // فحص عناصر الفواكه
    for (var i = 1; i <= 8; i++) {
        var selector = ".item" + i;
        if ($(selector).length > 0) {
            console.log("✓ Found:", selector);
        } else {
            console.log("✗ Missing:", selector);
        }
    }
    
    // فحص الوقت
    console.log("Initial countTime:", countTime);
    console.log("Initial status:", status);
});
