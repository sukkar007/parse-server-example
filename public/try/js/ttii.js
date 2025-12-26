/**
 * لعبة عجلة الفواكه - نسخة Parse Server
 * الاتصال الآمن مع Parse Cloud Functions عبر Flutter WebView
 */

// معلومات اللاعب - سيتم حقنها من Flutter
var info = window.flamingoPlayerInfo || {
    uid: '',
    username: '',
    nickname: '',
    avatar: '',
    credits: 0,
    diamonds: 0,
    lang: 'en'
};

// إعدادات اللعبة
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
var hideLock = false;

// خريطة الفواكه
var fruitMap = {
    'g': 6,
    'h': 7,
    'a': 8,
    'b': 1,
    'c': 2,
    'd': 3,
    'e': 4,
    'f': 5
};

// تخزين callbacks للطلبات المعلقة
var pendingRequests = {};
var requestIdCounter = 0;

// قائمة الانتظار للرهانات
var betQueue = [];
var isProcessingBet = false;

// رابط URL الأساسي للصور
var BASE_IMAGE_URL = '';

console.log("Player Info received from Flutter:", info);

// استلام معلومات اللاعب من Flutter
if (window.flamingoPlayerInfo) {
    console.log("Player info received on load:", info);
    init();
}

// استقبال تحديثات معلومات اللاعب من Flutter
window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("Player info updated:", info);
    
    // تحديث الرصيد في الواجهة
    if ($('.balanceCount').length > 0) {
        $('.balanceCount').text(formatNumber(parseFloat(info.credits).toFixed(2)));
    }
};

// استقبال الاستجابات من Flutter
window.onFlamingoResponse = function(response) {
    console.log("Received response from Flutter:", response);
    
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

// تهيئة التطبيق
$(document).ready(function() {
    console.log("Document ready - Flutter WebView Version");
    
    // الحصول على رابط الصور الأساسي
    BASE_IMAGE_URL = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    console.log("Base image URL:", BASE_IMAGE_URL);
    
    // انتظار معلومات اللاعب من Flutter
    if (window.flamingoPlayerInfo) {
        init();
    } else {
        // انتظار قصير ثم المحاولة
        setTimeout(function() {
            if (window.flamingoPlayerInfo) {
                init();
            } else {
                showMessage("Waiting for player info...");
            }
        }, 1000);
    }
});

function init() {
    console.log("Initializing game...");
    if (typeof moment !== 'undefined') {
        moment.tz.setDefault("Asia/Riyadh");
    }
    changeLang(info.lang);
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
    console.log("🎉 ===== عرض النتيجة ===== 🎉");
    console.log("الفاكهة الفائزة:", result);
    console.log("قائمة الفائزين (أول 3):", topList);
    console.log("مكسب المستخدم الحالي:", winGold);
    console.log("صورة المستخدم الحالي:", avatar);
    
    // إخفاء كل شيء أولاً
    $(".reword, .prize, .noPrize").hide();
    
    var fruitNumber = searchGift(result);
    console.log("رقم الفاكهة الفائزة:", fruitNumber);
    
    // إذا كان هناك فائزون (topList)
    if (topList && topList.length > 0) {
        console.log("👑 هناك فائزون، عرض قائمة الفائزين 👑");
        
        $(".reword").show();
        $(".prize").show();
        $(".noPrize").hide();
        
        // عرض صورة الفاكهة الفائزة
        var fruitImg = $(".reword_word>div img:last-child")[0];
        if (fruitImg) {
            var fruitImagePath = getGiftImagePath(fruitNumber);
            fruitImg.src = fruitImagePath;
            console.log("✅ صورة الفاكهة الفائزة:", fruitImagePath);
        }
        
        // عرض نص الجولة
        if (info.lang == "ar") {
            $(".reword .roundWord").html("جولة " + (round - 1) + " النتيجة");
        } else {
            $(".reword .roundWord").html("The result of " + (round - 1) + " round:");
        }
        
        // بناء HTML للفائزين الثلاثة الأوائل
        var topHTML = "";
        for (var i = 0; i < Math.min(topList.length, 3); i++) {
            var winner = topList[i];
            console.log(`الفائز ${i + 1}:`, winner);
            
            var winnerAvatar = getAbsoluteImageUrl(winner.avatar);
            var winnerName = winner.nick || winner.username || winner.nickname || `الفائز ${i + 1}`;
            var winnerPrize = winner.total || winner.winGold || 0;
            
            topHTML += `
                <div class="personItem">
                    <div class="logoArea">
                        <div class="logo">
                            <img src="${winnerAvatar}" alt="${winnerName}" 
                                 onerror="this.src='${getGiftImagePath(1)}'; this.onerror=null;">
                        </div>
                        <img class="no${i + 1}" src="${getAbsoluteImageUrl('images/no' + (i + 1) + '.png')}" alt="المركز ${i + 1}">
                    </div>
                    <div class="nick">${winnerName}</div>
                    <div class="flex ac jc">
                        <img src="${getAbsoluteImageUrl('images/gold.png')}" alt="ذهب">
                        <div>${formatNumber(winnerPrize)}</div>
                    </div>
                </div>
            `;
        }
        
        // إذا كان هناك أقل من 3 فائزين، أضف أماكن فارغة
        for (var i = topList.length; i < 3; i++) {
            topHTML += `
                <div class="personItem">
                    <div class="logoArea">
                        <div class="logo">
                            <img src="${getAbsoluteImageUrl('images/default_avatar.png')}" alt="لا يوجد">
                        </div>
                    </div>
                    <div class="nick">---</div>
                    <div class="flex ac jc">
                        <img src="${getAbsoluteImageUrl('images/gold.png')}" alt="ذهب">
                        <div>0</div>
                    </div>
                </div>
            `;
        }
        
        $(".reword_person").html(topHTML);
        console.log("✅ تم عرض الفائزين!");
        
        // إذا كان المستخدم الحالي من الفائزين، عرض مكسبه
        var currentUserWinAmount = 0;
        var currentUserIsWinner = false;
        
        for (var i = 0; i < topList.length; i++) {
            var winner = topList[i];
            if (winner.uid === info.uid || winner.userId === info.uid || winner.id === info.uid) {
                currentUserWinAmount = winner.total || winner.winGold || 0;
                currentUserIsWinner = true;
                break;
            }
        }
        
        if (currentUserIsWinner) {
            console.log("🎉 المستخدم الحالي فائز! المكسب:", currentUserWinAmount);
            $(".reword_word>div:first-child>div:last-child")[0].innerHTML = formatNumber(currentUserWinAmount);
            
            // عرض صورة المستخدم الفائز
            var selfImg = $(".prize .self img")[0];
            if (selfImg) {
                var userAvatar = getAbsoluteImageUrl(info.avatar || avatar || '');
                selfImg.src = userAvatar;
                selfImg.onerror = function() {
                    this.src = getAbsoluteImageUrl('images/default_avatar.png');
                };
                console.log("✅ صورة المستخدم الفائز:", userAvatar);
            }
        } else {
            console.log("😢 المستخدم الحالي ليس من الفائزين");
            $(".reword_word>div:first-child>div:last-child")[0].innerHTML = "0";
            
            var selfImg = $(".prize .self img")[0];
            if (selfImg) {
                selfImg.src = getAbsoluteImageUrl('images/default_avatar.png');
            }
        }
        
    } else {
        console.log("😢 لا يوجد فائزون، عرض noPrize");
        // لا يوجد فائزون
        $(".reword").show();
        $(".noPrize").show();
        $(".prize").hide();
        
        // عرض صورة الفاكهة الفائزة
        var noPrizeImg = $(".noPrize>div img:last-child")[0];
        if (noPrizeImg) {
            var fruitImagePath = getGiftImagePath(fruitNumber);
            noPrizeImg.src = fruitImagePath;
            noPrizeImg.onerror = function() {
                this.src = getAbsoluteImageUrl('images/gift_1.png');
            };
            console.log("✅ صورة الفاكهة في noPrize:", fruitImagePath);
        }
        
        // عرض نص الجولة
        if (info.lang == "ar") {
            $(".reword .roundWord").html("جولة " + (round - 1) + " النتيجة");
            $(".noPrize .roundWord").html("جولة " + (round - 1) + " النتيجة");
        } else {
            $(".reword .roundWord").html("The result of " + (round - 1) + " round:");
            $(".noPrize .roundWord").html("The result of " + (round - 1) + " round:");
        }
        
        // إخفاء منطقة الفائزين
        $(".reword_person").html("");
    }
    
    // بدء عد تنازلي للإغلاق
    if (resultTimer) clearInterval(resultTimer);
    resultCount = 5;
    
    resultTimer = setInterval(function() {
        resultCount--;
        if (resultCount <= 0) {
            clearInterval(resultTimer);
            $(".reword").hide();
            $(".prize").hide();
            $(".noPrize").hide();
            console.log("⏰ انتهى وقت عرض النتيجة");
        }
        var countDownElement = $(".reword .reword_content .countDown")[0];
        if (countDownElement) {
            countDownElement.innerHTML = resultCount + "s";
        }
    }, 1000);
    
    console.log("🎊 ===== انتهى عرض النتيجة ===== 🎊");
}

function countDown() {
    if (countTimer) {
        clearInterval(countTimer);
    }
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

function quickBet(choice, index) {
    console.log("⚡ الرهان السريع - choice:", choice, "index:", index);
    
    // التحقق من الرصيد بسرعة
    let currentBalance = parseFloat($('.balanceCount').text().replace(/,/g, ''));
    if (currentBalance < currentGold) {
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        return false;
    }
    
    // تحديث الواجهة فوراً (تجربة سريعة)
    var fruitNumber = searchGift(choice);
    console.log("رقم الفاكهة للرهان:", fruitNumber);
    
    var selectedElement = $(`.item${fruitNumber} .selected div:nth-child(2) div`)[0];
    if (selectedElement) {
        var currentAmount = parseFloat(selectedElement.innerHTML.replace(/,/g, '')) || 0;
        selectedElement.innerHTML = formatNumber(currentAmount + currentGold);
        $(`.item${fruitNumber} .selected`).show();
    }
    
    // تحديث الرصيد في الواجهة فوراً
    var newBalance = currentBalance - currentGold;
    $('.balanceCount').text(formatNumber(newBalance.toFixed(2)));
    
    selectCount += 1;
    if (!selectArr.includes(choice)) {
        selectArr.push(choice);
    }
    
    return true;
}

function processBetQueue() {
    if (isProcessingBet || betQueue.length === 0) {
        return;
    }
    
    isProcessingBet = true;
    var bet = betQueue.shift();
    
    console.log("🔄 معالجة الرهان في قائمة الانتظار:", bet);
    
    callFlutterApp('game_choice', {
        choice: bet.choice,
        gold: bet.gold
    }).then(function(res) {
        console.log("✅ استجابة الرهان:", res);
        
        if (res.code == 200) {
            // تحديث الرصيد من الاستجابة
            if (res.balance !== undefined) {
                $('.balanceCount').text(formatNumber(parseFloat(res.balance).toFixed(2)));
                info.credits = res.balance;
            }
        } else if (res.code == 10062) {
            console.warn("❌ رصيد غير كافٍ في الخادم");
            showSuccess(info.lang == "ar" ? "يرجى الشحن" : "Please recharge");
            
            // إعادة تعيين الرصيد
            getInfo(round, true);
        } else {
            console.error("❌ خطأ في الرهان:", res.message);
            showSuccess(res.message || 'Error');
            
            // إعادة تعيين الرصيد
            getInfo(round, true);
        }
        
        // معالجة الرهان التالي
        isProcessingBet = false;
        setTimeout(processBetQueue, 100);
        
    }).catch(function(error) {
        console.error("❌ خطأ في اتصال الرهان:", error);
        showSuccess(info.lang == "ar" ? "خطأ في الاتصال" : "Connection Error");
        
        // معالجة الرهان التالي
        isProcessingBet = false;
        setTimeout(processBetQueue, 100);
    });
}

function sureClick(choice, index) {
    console.log("🎯 sureClick called - choice:", choice, "index:", index);
    
    // التحقق من حالة اللعبة
    if (status !== 0) {
        console.log("❌ اللعبة ليست جاهزة للرهان، status:", status);
        return;
    }
    
    // التحقق من الرصيد بسرعة
    let currentBalance = parseFloat($('.balanceCount').text().replace(/,/g, ''));
    if (currentBalance < currentGold) {
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        return;
    }
    
    // تحديث الواجهة فوراً
    var uiSuccess = quickBet(choice, index);
    if (!uiSuccess) {
        return;
    }
    
    // إضافة الرهان إلى قائمة الانتظار
    betQueue.push({
        choice: choice,
        gold: currentGold,
        timestamp: Date.now()
    });
    
    console.log("📝 تمت إضافة الرهان إلى قائمة الانتظار، الطول:", betQueue.length);
    
    // بدء معالجة قائمة الانتظار إذا لم تكن قيد المعالجة
    if (!isProcessingBet) {
        processBetQueue();
    }
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
            status = 0;
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
        var selectedDiv = $(".item" + (i + 1) + " .selected div:nth-child(2) div")[0];
        if (selectedDiv) {
            selectedDiv.innerHTML = "0";
        }
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

function bindEvent() {
    console.log("Binding events...");
    
    // أحداث اختيار قيمة الذهب
    $(".clickArea .clickItem").click(function() {
        console.log("Gold item clicked");
        $(".clickItem").removeClass("active");
        $(this).addClass("active");
        var index = $(this).data("index");
        currentGold = goldList[index] || 1;
        console.log("Selected gold:", currentGold);
    });
    
    // أحداث النقر على الفواكه - مع تحسين الأداء
    var lastClickTime = 0;
    var clickCooldown = 300;
    
    $(".item").click(function() {
        var now = Date.now();
        if (now - lastClickTime < clickCooldown) {
            console.log("⏳ انتظر قليلاً بين النقرات");
            return;
        }
        lastClickTime = now;
        
        console.log("🍎 Fruit item clicked, status:", status);
        if (status == 0) {
            var index = $(this).data("index");
            console.log("Item index:", index);
            
            // إزالة active من جميع الفواكه
            for (var i = 0; i < $(".item").length; i++) {
                $(".item" + (i + 1)).removeClass("active");
            }
            
            // التحقق من الحد الأقصى للاختيارات
            console.log("selectCount:", selectCount, "selectArr:", selectArr);
            
            var isHas = false;
            for (var i = 0; i < selectArr.length; i++) {
                if (selectArr[i] == choiceList[index]) {
                    isHas = true;
                    break;
                }
            }
            
            if (selectArr.length > 5 && !isHas) {
                showSuccess("Max Selected");
                return;
            }

            sureClick(choiceList[index], index);
        }
    });
    
    // أحداث الأزرار الجانبية
    $(".records").click(function() {
        console.log("Records clicked");
        getBill();
        $(".recordsBg").show();
    });
    
    $(".recordsBg .modalBack").click(function() {
        $(".recordsBg").hide();
    });

    $(".rule").click(function() {
        console.log("Rule clicked");
        $(".ruleBg").show();
    });
    
    $(".ruleBg").click(function() {
        $(".ruleBg").hide();
    });

    $(".rank").click(function() {
        console.log("Rank clicked");
        getRank();
        $(".rankBg").show();
    });
    
    $(".rankBg .modalBack").click(function() {
        $(".rankBg").hide();
    });
    
    $(".reword, .rewordNo, .pop-success").click(function(e) {
        e.stopPropagation();
    });

    // التعامل مع إخفاء/إظهار الصفحة
    try {
        document.addEventListener("visibilitychange", function() {
            if (document.hidden) {
                hideLock = true;
                sessionStorage.setItem("currentRound", round);
                if (countTimer) clearInterval(countTimer);
                if (handTimer) clearInterval(handTimer);
            } else {
                if (hideLock) {
                    hideLock = false;
                    getInfo();
                    showHand();
                }
            }
        });
    } catch (e) {
        console.error("Visibility change error:", e);
    }
    
    console.log("Events bound successfully");
}

/**
 * الحصول على رابط صورة مطلق
 */
function getAbsoluteImageUrl(url) {
    console.log("🔗 getAbsoluteImageUrl input:", url);
    
    if (!url || url === '' || url === 'null' || url === 'undefined') {
        var defaultUrl = BASE_IMAGE_URL + 'images/default_avatar.png';
        console.log("🔗 Returning default URL:", defaultUrl);
        return defaultUrl;
    }
    
    // إذا كان الرابط يحتوي على http أو https، اتركه كما هو
    if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log("🔗 Already absolute URL:", url);
        return url;
    }
    
    // إذا كان الرابط يبدأ بـ /، أضف origin
    if (url.startsWith('/')) {
        var absoluteUrl = window.location.origin + url;
        console.log("🔗 Added origin to URL:", absoluteUrl);
        return absoluteUrl;
    }
    
    // إذا كان الرابط يبدأ بـ images/، أضف base URL
    if (url.startsWith('images/')) {
        var absoluteUrl = BASE_IMAGE_URL + url;
        console.log("🔗 Added base URL to images path:", absoluteUrl);
        return absoluteUrl;
    }
    
    // إذا كان الرابط مجرد اسم ملف، أضف images/ path
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.gif')) {
        var absoluteUrl = BASE_IMAGE_URL + 'images/' + url;
        console.log("🔗 Added images path to filename:", absoluteUrl);
        return absoluteUrl;
    }
    
    // افتراضياً، أضف images/ path
    var absoluteUrl = BASE_IMAGE_URL + 'images/' + url;
    console.log("🔗 Default conversion:", absoluteUrl);
    return absoluteUrl;
}

/**
 * الحصول على مسار صورة الفاكهة
 */
function getGiftImagePath(fruitNumber) {
    if (!fruitNumber || fruitNumber < 1 || fruitNumber > 8) {
        console.warn("Invalid fruit number:", fruitNumber);
        return getAbsoluteImageUrl('images/gift_1.png');
    }
    return getAbsoluteImageUrl('images/gift_' + fruitNumber + '.png');
}

/**
 * تنسيق الأرقام بفواصل
 */
function formatNumber(num) {
    if (num === null || num === undefined || num === '') return '0';
    var numStr = num.toString();
    // إزالة أي فواصل موجودة
    numStr = numStr.replace(/,/g, '');
    
    var parts = numStr.split('.');
    var integerPart = parts[0];
    var decimalPart = parts.length > 1 ? '.' + parts[1] : '';
    
    // إضافة فواصل كل 3 أرقام
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return integerPart + decimalPart;
}

/**
 * البحث عن رقم الفاكهة من الحرف
 */
function searchGift(value) {
    if (!value) {
        console.warn("searchGift: No value provided");
        return 1;
    }
    
    // تحقق في الخريطة مباشرة
    var result = fruitMap[value];
    
    if (!result) {
        console.warn("Invalid fruit value:", value, "valid values:", Object.keys(fruitMap));
        return 1;
    }
    
    return result;
}

/**
 * دالة للاتصال بـ Flutter
 */
function callFlutterApp(action, params) {
    return new Promise(function(resolve, reject) {
        var requestId = 'req_' + (++requestIdCounter) + '_' + Date.now();
        
        // تخزين callback
        pendingRequests[requestId] = {
            resolve: resolve,
            reject: reject
        };
        
        // إرسال الطلب إلى Flutter
        var message = {
            action: action,
            requestId: requestId,
            params: params || {}
        };
        
        console.log("📤 إرسال إلى Flutter:", message);
        
        // إرسال عبر JavaScript Channel
        if (window.FlamingoApp && typeof window.FlamingoApp.postMessage === 'function') {
            window.FlamingoApp.postMessage(JSON.stringify(message));
        } else if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            // دعم InAppWebView
            window.flutter_inappwebview.callHandler('FlamingoApp', JSON.stringify(message));
        } else {
            console.warn("FlamingoApp not available, trying direct call");
            // محاولة مباشرة
            try {
                if (window.flutterChannel && typeof window.flutterChannel.postMessage === 'function') {
                    window.flutterChannel.postMessage(JSON.stringify(message));
                } else {
                    reject('Cannot communicate with Flutter: No channel available');
                }
            } catch (e) {
                reject('Cannot communicate with Flutter: ' + e);
            }
        }
        
        // Timeout بعد 10 ثوانٍ فقط للرهانات
        var timeout = action === 'game_choice' ? 10000 : 30000;
        
        setTimeout(function() {
            if (pendingRequests[requestId]) {
                delete pendingRequests[requestId];
                reject('Request timeout');
            }
        }, timeout);
    });
}

/**
 * إرسال رسالة بسيطة إلى Flutter
 */
function sendToFlutter(data) {
    try {
        if (window.FlamingoApp && typeof window.FlamingoApp.postMessage === 'function') {
            window.FlamingoApp.postMessage(JSON.stringify(data));
        } else if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('FlamingoApp', JSON.stringify(data));
        } else if (window.flutterChannel && typeof window.flutterChannel.postMessage === 'function') {
            window.flutterChannel.postMessage(JSON.stringify(data));
        }
    } catch (e) {
        console.error("Failed to send to Flutter:", e);
    }
}

function getInfo(_round, isChoice) {
    console.log("Getting game info...");
    
    var params = {};
    if (_round) {
        params.round = _round;
    }
    
    callFlutterApp('game_info', params).then(function(res) {
        console.log("Info response:", res);
        if (res.code === 200 && res.data) {
            // التحقق من صحة الاستجابة
            if (res.data.countdown === undefined) {
                console.error("Invalid response data:", res.data);
                return;
            }
            
            if (res.data.countdown < 0) {
                showSuccess(info.lang == "ar" ? "خطأ في النظام، جاري إعادة الاتصال..." : "System Error, reconnecting...");
                
                clearAllTimers();
                
                setTimeout(function() {
                    getInfo();
                    showHand();
                }, 800);
                return;
            }

            // تحديث واجهة المستخدم
            var balanceCount = $(".balanceCount")[0];
            if (balanceCount) {
                balanceCount.innerHTML = formatNumber(parseFloat(res.data.gold).toFixed(2));
            }
            
            var profitCount = $(".profitCount")[0];
            if (profitCount) {
                profitCount.innerHTML = formatNumber(res.data.profit || 0);
            }
            
            var roundElement = $(".round")[0];
            if (roundElement) {
                roundElement.innerHTML = (info.lang == "ar" ? "جولة " : "Round ") + res.data.round;
            }

            if (status == 1 && isChoice) return;
            round = res.data.round;

            if (!isChoice) {
                countTime = res.data.countdown;
                var countDownElement = $(".coutDown")[0];
                if (countDownElement) {
                    countDownElement.innerHTML = countTime + "s";
                }
                
                if (countTimer) clearInterval(countTimer);
                countDown();
            }

            $(".title2").hide();
            $(".title1").show();

            // نتيجة الجولة السابقة
            if (res.data.result) {
                var fruitNumber = searchGift(res.data.result);
                console.log("Previous winning fruit:", res.data.result, "mapped to number:", fruitNumber);
                
                // إضافة active للفاكهة الفائزة
                $(".item" + fruitNumber).addClass("active");
                
                // تحديث صورة الفاكهة في noPrize1
                var noPrizeImg = $(".noPrize1>div img:last-child")[0];
                if (noPrizeImg) {
                    noPrizeImg.src = getGiftImagePath(fruitNumber);
                    console.log("Updated noPrize1 image to fruit", fruitNumber);
                }
            }

            // قائمة النتائج
            var giftListHtml = "";
            var resultList = res.data.resultList || [];
            console.log("Result list:", resultList);
            
            // عكس القائمة لعرض الأحدث أولاً
            var reversedList = resultList.slice().reverse();
            
            for (var i = 0; i < reversedList.length; i++) {
                var fruitNumber = searchGift(reversedList[i]);
                if (i == 0) {
                    giftListHtml +=
                        '<div class="giftItem"><img src="' +
                        getGiftImagePath(fruitNumber) +
                        '" alt=""><img src="' + getAbsoluteImageUrl('images/new.png') + '" alt=""></div>';
                } else {
                    giftListHtml +=
                        '<div class="giftItem"><img src="' +
                        getGiftImagePath(fruitNumber) +
                        '" alt=""></div>';
                }
            }
            $(".giftList").html(giftListHtml);

            if (_round) {
                clearInterval(handTimer);
                showHand();
            }

            // عرض الرهانات الحالية
            if (res.data.select && Object.keys(res.data.select).length > 0) {
                var ak = Object.keys(res.data.select);
                var vk = Object.values(res.data.select);
                console.log("Current bets:", res.data.select);
                
                for (var i = 0; i < ak.length; i++) {
                    var fruitNumber = searchGift(ak[i]);
                    console.log("Bet on fruit:", ak[i], "mapped to number:", fruitNumber, "amount:", vk[i]);
                    
                    var amountElement = $(".item" + fruitNumber + " .selected div:nth-child(2) div")[0];
                    if (amountElement) {
                        amountElement.innerHTML = formatNumber(vk[i]);
                    }
                    $(".item" + fruitNumber + " .selected").show();
                }
            } else {
                for (var i = 0; i < $(".item .gray").length; i++) {
                    var amountElement = $(".item" + (i + 1) + " .selected div:nth-child(2) div")[0];
                    if (amountElement) {
                        amountElement.innerHTML = "0";
                    }
                    $(".item" + (i + 1) + " .selected").hide();
                }
            }

            // عرض النتيجة إذا كانت هناك جولة سابقة
            if (_round) {
                console.log("🎯 ===== عرض نتيجة الجولة السابقة ===== 🎯");
                console.log("بيانات النتيجة من الخادم:", {
                    result: res.data.result,
                    top: res.data.top,
                    winGold: res.data.winGold,
                    avatar: res.data.avatar,
                    nickname: res.data.nickname
                });
                
                // عرض النتيجة مع الفائزين
                showResult(
                    res.data.result,
                    res.data.top || [],
                    res.data.winGold || 0,
                    res.data.avatar || ''
                );
            }
        }
    }).catch(function(error) {
        console.error("Info error:", error);
        showSuccess(info.lang == "ar" ? "خطأ في الاتصال" : "Connection error");
    });
}

function getBill() {
    callFlutterApp('game_bill', {}).then(function(res) {
        console.log("Bill response:", res);
        if (res.code == 200 && res.data) {
            var innerHTML = "";
            
            for (var i = 0; i < res.data.length; i++) {
                var tempItem = res.data[i];
                var isWin = tempItem.choice == tempItem.result;
                var choiceNumber = searchGift(tempItem.choice);
                var resultNumber = searchGift(tempItem.result || 'b');
                
                innerHTML +=
                    '<div class="records-list-item flex ac js"><div class="inner-item">' +
                    formatNumber(tempItem.gold) +
                    ' gold</div><div class="inner-item"> <img src="' +
                    getGiftImagePath(choiceNumber) +
                    '" alt=""> </div><div class="inner-item"><img src="' +
                    getGiftImagePath(resultNumber) +
                    '" alt=""></div><div class="inner-item"><div>' +
                    changeWord(isWin) +
                    "</div>" +
                    (isWin ?
                        "<div>(" +
                        timesWord[resultNumber - 1] +
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

function getRank() {
    callFlutterApp('game_rank', {}).then(function(res) {
        console.log("Rank response:", res);
        if (res.code == 200 && res.data) {
            var innerHTML = "";
            var topHTML = "";
            
            for (var i = 0; i < res.data.length; i++) {
                var item = res.data[i];
                var avatarUrl = getAbsoluteImageUrl(item.avatar);
                
                if (i < 3) {
                    topHTML +=
                        '<div class="personItem"><div class="logoArea"><div class="logo"><img src="' +
                        avatarUrl +
                        '" alt=""></div> <img class="no' +
                        (i + 1) +
                        '" src="' + getAbsoluteImageUrl('images/no' + (i + 1) + '.png') + '" alt=""></div><div class="nick">' +
                        (item.nick || 'Unknown') +
                        '</div><div class="flex ac jc"><img src="' + getAbsoluteImageUrl('images/gold.png') + '" alt=""><div>' +
                        formatNumber(item.total || 0) +
                        "</div></div></div>";
                } else {
                    innerHTML +=
                        '<div class="rank-list-item flex ac js"><div class="inner-item">' +
                        (i + 1) +
                        '</div><div class="inner-item"><div class="logo"><img src="' +
                        avatarUrl +
                        '" alt=""></div></div><div class="inner-item">' +
                        (item.nick || 'Unknown') +
                        '</div><div class="inner-item"><img src="' + getAbsoluteImageUrl('images/gold.png') + '" alt=""><div>' +
                        formatNumber(item.total || 0) +
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

function clearAllTimers() {
    if (countTimer) clearInterval(countTimer);
    if (handTimer) clearInterval(handTimer);
    if (rollTimer) clearInterval(rollTimer);
    if (resultTimer) clearInterval(resultTimer);
}

function showSuccess(msg, fn) {
    showMessage(msg);
    setTimeout(function() {
        if (fn) fn();
    }, 1500);
}

function showMessage(msg) {
    console.log("Showing message:", msg);
    
    // إرسال الرسالة إلى Flutter لعرضها
    sendToFlutter({
        action: 'showMessage',
        message: msg,
        isError: false
    });
    
    // عرض محلي أيضاً إن أمكن
    if ($(".pop-success").length > 0) {
        var popSuccessDiv = $(".pop-success div")[0];
        if (popSuccessDiv) {
            popSuccessDiv.innerHTML = msg;
            $(".pop-success").show();
            setTimeout(function() {
                popSuccessDiv.innerHTML = "";
                $(".pop-success").hide();
            }, 1500);
        }
    }
}

function changeLang(defaultLang) {
    if ('en,ar,in,yn'.indexOf(defaultLang) === -1 || !defaultLang) {
        defaultLang = 'en';
    }

    function languageSelect(defaultLang) {
        if (typeof $ !== 'undefined' && $.fn.i18n) {
            $("[i18n]").i18n({
                defaultLang: defaultLang,
                filePath: "js/i18n/",
                filePrefix: "i18n_",
                fileSuffix: "",
                forever: true,
                callback: function(res) {},
            });
        }
    }
    
    if (info.lang == "ar") {
        var recordsImg = $(".records")[0];
        var ruleImg = $(".rule")[0];
        var rankImg = $(".rank")[0];
        
        if (recordsImg) recordsImg.setAttribute("src", getAbsoluteImageUrl("images/btn_records@2x.png"));
        if (ruleImg) ruleImg.setAttribute("src", getAbsoluteImageUrl("images/btn_rule@2x.png"));
        if (rankImg) rankImg.setAttribute("src", getAbsoluteImageUrl("images/btn_rank@2x.png"));
    }

    languageSelect(defaultLang);
}

// دالة لإغلاق اللعبة
function closeGame() {
    sendToFlutter({ action: 'close' });
}

// تحديث الرصيد من Flutter
window.updateBalance = function(newBalance) {
    console.log("Updating balance from Flutter:", newBalance);
    var balanceElement = $('.balanceCount')[0];
    if (balanceElement) {
        balanceElement.innerHTML = formatNumber(parseFloat(newBalance).toFixed(2));
    }
    info.credits = newBalance;
};

// دالة مساعدة للفحص
window.debugGame = function() {
    console.log("=== GAME DEBUG INFO ===");
    console.log("info:", info);
    console.log("BASE_IMAGE_URL:", BASE_IMAGE_URL);
    console.log("Current URL:", window.location.href);
    console.log("=== END DEBUG ===");
};

// دالة لاختبار عرض الصور
window.testImages = function() {
    console.log("=== TESTING IMAGES ===");
    console.log("Test default avatar:", getAbsoluteImageUrl('images/default_avatar.png'));
    console.log("Test gold image:", getAbsoluteImageUrl('images/gold.png'));
    console.log("Test gift_1 image:", getGiftImagePath(1));
    console.log("Test no1 image:", getAbsoluteImageUrl('images/no1.png'));
    
    // اختبار إذا كانت الصور موجودة
    var testImages = [
        'images/default_avatar.png',
        'images/gold.png',
        'images/gift_1.png',
        'images/no1.png',
        'images/no2.png',
        'images/no3.png',
        'images/new.png'
    ];
    
    testImages.forEach(function(img) {
        var imgUrl = getAbsoluteImageUrl(img);
        console.log("Testing", img, "->", imgUrl);
        
        // إنشاء صورة مخفية للتحقق
        var testImg = new Image();
        testImg.onload = function() {
            console.log("✅ " + img + " loaded successfully");
        };
        testImg.onerror = function() {
            console.log("❌ " + img + " failed to load");
        };
        testImg.src = imgUrl;
    });
};
