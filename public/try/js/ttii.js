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

// تخزين callbacks للطلبات المعلقة
var pendingRequests = {};
var requestIdCounter = 0;

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
    $(".reword").show();
    if (winGold && winGold > 0) {
        $(".prize").show();
        $(".reword_word>div:first-child>div:last-child")[0].innerHTML = formatNumber(winGold);
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
            formatNumber(topList[i].total) +
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
    console.log("sureClick called - choice:", choice, "index:", index);
    
    // التحقق من الرصيد
    let currentBalance = parseFloat($('.balanceCount').text().replace(/,/g, ''));
    if (currentBalance < currentGold) {
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        return;
    }

    // تحديث الرصيد مؤقتاً
    $('.balanceCount').text(formatNumber((currentBalance - currentGold).toFixed(2)));

    // إرسال الطلب إلى Flutter
    callFlutterApp('game_choice', {
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
            var tempElement = $(`.item${list[index]} .selected div:nth-child(2) div`)[0];
            if (tempElement) {
                var temp = tempElement.innerHTML.replace(/,/g, '');
                tempElement.innerHTML = formatNumber(parseInt(temp) + parseInt(currentGold));
                $(`.item${list[index]} .selected`).show();
            }

            // تحديث الرصيد من الاستجابة
            if (res.balance !== undefined) {
                $('.balanceCount').text(formatNumber(parseFloat(res.balance).toFixed(2)));
                // تحديث معلومات اللاعب
                if (info.credits !== undefined) {
                    info.credits = res.balance;
                }
            }
        } else if (res.code == 10062) {
            showSuccess(info.lang == "ar" ? "يرجى الشحن" : "Please recharge");
            // إعادة الرصيد
            $('.balanceCount').text(formatNumber(currentBalance.toFixed(2)));
        } else {
            showSuccess(res.message || 'Error');
            $('.balanceCount').text(formatNumber(currentBalance.toFixed(2)));
        }
    }).catch(function(error) {
        console.error("Choice error:", error);
        showSuccess(info.lang == "ar" ? "خطأ في النظام" : "System Error");
        $('.balanceCount').text(formatNumber(currentBalance.toFixed(2)));
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
    
    // أحداث النقر على الفواكه - نفس طريقة ttii.js الأصلية
    $(".item").click(function() {
        console.log("Fruit item clicked, status:", status);
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
        
        console.log("Sending to Flutter:", message);
        
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
        
        // Timeout بعد 30 ثانية
        setTimeout(function() {
            if (pendingRequests[requestId]) {
                delete pendingRequests[requestId];
                reject('Request timeout');
            }
        }, 30000);
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
            if (res.data.countdown && res.data.countdown < 0) {
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
            if (res.data.result && res.data.result != "") {
                var fruitIndex = searchGift(res.data.result);
                $(".item" + fruitIndex).addClass("active");
                var noPrizeImg = $(".noPrize1>div img:last-child")[0];
                if (noPrizeImg) {
                    noPrizeImg.setAttribute(
                        "src",
                        "images/gift_" + fruitIndex + ".png"
                    );
                }
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
                    var fruitIndex = searchGift(ak[i]);
                    var amountElement = $(".item" + fruitIndex + " .selected div:nth-child(2) div")[0];
                    if (amountElement) {
                        amountElement.innerHTML = formatNumber(vk[i]);
                    }
                    $(".item" + fruitIndex + " .selected").show();
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

            // عرض النتيجة
            if (_round && res.data.top && res.data.top.length) {
                showResult(
                    res.data.result,
                    res.data.top,
                    res.data.winGold,
                    res.data.avatar
                );
            } else if (_round) {
                var roundWordElement = $(".rewordNo .roundWord")[0];
                if (roundWordElement) {
                    if (info.lang == "ar") {
                        roundWordElement.innerHTML = "جولة " + (round - 1) + " النتيجة";
                    } else {
                        roundWordElement.innerHTML = "The result of " + (round - 1) + " round:";
                    }
                }
                
                resultTimer = setInterval(function() {
                    resultCount--;
                    if (resultCount < 0) {
                        resultCount = 5;
                        clearInterval(resultTimer);
                        $(".rewordNo").hide();
                    }
                    var countDownElement = $(".rewordNo .reword_content .countDown")[0];
                    if (countDownElement) {
                        countDownElement.innerHTML = resultCount + "s";
                    }
                }, 1000);
                $(".rewordNo").show();
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
            var list = [6, 7, 8, 1, 2, 3, 4, 5];
            
            for (var i = 0; i < res.data.length; i++) {
                var tempItem = res.data[i];
                var isWin = tempItem.choice == tempItem.result;
                innerHTML +=
                    '<div class="records-list-item flex ac js"><div class="inner-item">' +
                    formatNumber(tempItem.gold) +
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

function getRank() {
    callFlutterApp('game_rank', {}).then(function(res) {
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
                        formatNumber(item.total) +
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
                        formatNumber(item.total) +
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
    return list[temp];
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
        
        if (recordsImg) recordsImg.setAttribute("src", "images/btn_records@2x.png");
        if (ruleImg) ruleImg.setAttribute("src", "images/btn_rule@2x.png");
        if (rankImg) rankImg.setAttribute("src", "images/btn_rank@2x.png");
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
