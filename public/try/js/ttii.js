/**
 * لعبة عجلة الفواكه - نسخة آمنة
 * جميع الطلبات تمر عبر تطبيق Flutter (لا اتصال مباشر بـ Parse)
 */

var count = 4;
var rollCount = 1;
var countTime = 30; // زمن الجولة من السيرفر
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
var lastClickTime = 0;
var CLICK_DELAY = 500;
var serverStatus = 0; // حالة اللعبة من السيرفر
var canBet = true; // يمكن وضع الرهان
var isShowingResult = false; // هل يتم عرض النتيجة الآن؟

// معلومات اللاعب من تطبيق Flamingo
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
var isRequestInProgress = false;

console.log("Player Info:", info);

window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("Received player info:", info);
    init();
};

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
        app: true
    };
})();

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
    moment.tz.setDefault("Asia/Riyadh");
    changeLang(info.lang || 'en');
    showHand();
    bindEvent();
    getInfo();
    
    // بدء التحديث الدوري
    startAutoRefresh();
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
    // تحديث حالة العرض
    isShowingResult = true;
    
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
            isShowingResult = false;
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
        $(".coutDown")[0].innerHTML = countTime + "s";
        
        // تحديث حالة اللعبة بناءً على الوقت المتبقي
        if (countTime <= 0) {
            countTime = 0;
            // فقط قم بتحديث حالة السحب، لا تغير status
            clearInterval(countTimer);
            // سيقوم السيرفر بتحديث الحالة
            getInfo();
        }
    }, 1000);
}

function openDraw() {
    getInfo(round);
}

function sureClick(choice, index) {
    // التحقق من الوقت المتبقي
    if (countTime <= 3) { // آخر 3 ثواني لا يمكن الرهان
        return;
    }

    // منع النقر أثناء عرض النتيجة
    if (isShowingResult) {
        return;
    }

    // منع النقر السريع
    var now = Date.now();
    if (now - lastClickTime < CLICK_DELAY) {
        return;
    }
    lastClickTime = now;
    
    if (isRequestInProgress) {
        return;
    }
    
    let currentBalance = parseFloat($('.balanceCount').text());
    if (currentBalance < currentGold) {
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        return;
    }

    var isHas = false;
    for (var i = 0; i < selectArr.length; i++) {
        if (selectArr[i] == choice) {
            isHas = true;
        }
    }
    if (selectArr.length >= 5 && !isHas) {
        return;
    }

    $('.balanceCount').text((currentBalance - currentGold).toFixed(2));
    
    isRequestInProgress = true;
    $(".item").css("pointer-events", "none");

    callFlamingoApp('game_choice', {
        choice: choice,
        gold: currentGold,
        round: round
    }).then(function(res) {
        console.log("Choice response:", res);
        isRequestInProgress = false;
        $(".item").css("pointer-events", "auto");
        
        if (res.code == 200) {
            selectCount += 1;
            if (!selectArr.includes(choice)) {
                selectArr.push(choice);
            }

            var list = [6, 7, 8, 1, 2, 3, 4, 5];
            var temp = $(`.item${list[index]} .selected div:nth-child(2) div`)[0].innerHTML;
            $(`.item${list[index]} .selected div:nth-child(2) div`)[0].innerHTML = 
                parseInt(temp || 0) + parseInt(currentGold);
            $(`.item${list[index]} .selected`).show();

            if (res.balance !== undefined) {
                $('.balanceCount').text(parseFloat(res.balance).toFixed(2));
            }
            
            sendToApp({ action: 'refreshBalance' });
            
            // لا تظهر رسالة نجاح
            
        } else if (res.code == 10062) {
            showSuccess(info.lang == "ar" ? "يرجى الشحن" : "Please recharge");
            $('.balanceCount').text(currentBalance.toFixed(2));
        } else {
            // فقط إذا كان هناك خطأ حقيقي، لا تظهر رسالة
            $('.balanceCount').text(currentBalance.toFixed(2));
        }
    }).catch(function(error) {
        console.error("Choice error:", error);
        isRequestInProgress = false;
        $(".item").css("pointer-events", "auto");
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
    $(".clickArea .clickItem").click(function() {
        for (var i = 0; i < $(".clickItem").length; i++) {
            $($(".clickItem")[i]).removeClass("active");
        }
        $(this).addClass("active");
        currentGold = goldList[$(this).data("index")];
        console.log("Selected gold:", currentGold);
    });
    
    $(".item").click(function() {
        console.log("Item clicked, countTime:", countTime, "isShowingResult:", isShowingResult);
        
        // التحقق من الوقت المتبقي أولاً
        if (countTime <= 3) {
            return;
        }
        
        // التحقق من عرض النتيجة
        if (isShowingResult) {
            return;
        }
        
        if (isRequestInProgress) {
            return;
        }
        
        var itemIndex = $(this).data("index");
        if (itemIndex === undefined || itemIndex < 0 || itemIndex > 7) {
            console.error("Invalid item index:", itemIndex);
            return;
        }
        
        console.log("Selected item index:", itemIndex);
        
        var isHas = false;
        for (var i = 0; i < selectArr.length; i++) {
            if (selectArr[i] == choiceList[itemIndex]) {
                isHas = true;
            }
        }
        if (selectArr.length >= 5 && !isHas) {
            return;
        }

        sureClick(choiceList[itemIndex], itemIndex);
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
    
    $(".close-btn").click(function() {
        closeGame();
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
}

function callFlamingoApp(action, params) {
    return new Promise(function(resolve, reject) {
        var requestId = 'req_' + (++requestIdCounter) + '_' + Date.now();
        
        pendingRequests[requestId] = {
            resolve: resolve,
            reject: reject
        };
        
        var message = {
            action: action,
            requestId: requestId,
            params: params || {}
        };
        
        console.log("Sending to app:", action, message);
        
        if (window.FlamingoApp) {
            window.FlamingoApp.postMessage(JSON.stringify(message));
        } 
        else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FlamingoApp) {
            window.webkit.messageHandlers.FlamingoApp.postMessage(message);
        }
        else if (window.prompt) {
            prompt(JSON.stringify(message));
        }
        else {
            console.log("App message:", message);
            setTimeout(function() {
                if (pendingRequests[requestId]) {
                    if (action === 'game_choice') {
                        var currentBalance = parseFloat($('.balanceCount').text()) || 1000;
                        var newBalance = currentBalance - (params.gold || 0);
                        resolve({
                            code: 200,
                            balance: newBalance,
                            message: "Success"
                        });
                    } else if (action === 'game_info') {
                        resolve({
                            code: 200,
                            data: {
                                gold: 1000,
                                profit: 50,
                                round: round + 1,
                                countdown: 30, // جولة 30 ثانية
                                result: null, // لا تظهر نتيجة أثناء الجولة النشطة
                                resultList: ["g", "h", "a", "b", "c", "d", "e", "f"],
                                select: {},
                                top: [],
                                winGold: 0,
                                avatar: info.avatar || "images/user_avatar.png"
                            }
                        });
                    }
                }
            }, 500);
        }
        
        setTimeout(function() {
            if (pendingRequests[requestId]) {
                delete pendingRequests[requestId];
                reject('Request timeout');
            }
        }, 10000);
    });
}

function sendToApp(data) {
    if (window.FlamingoApp) {
        window.FlamingoApp.postMessage(JSON.stringify(data));
    } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FlamingoApp) {
        window.webkit.messageHandlers.FlamingoApp.postMessage(data);
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

            // تحديث round فقط
            round = res.data.round;

            // تحديث countTime من السيرفر دائماً
            var newCountTime = res.data.countdown || 30;
            if (newCountTime !== countTime) {
                countTime = newCountTime;
                $(".coutDown")[0].innerHTML = countTime + "s";
                
                // إعادة تشغيل العداد فقط إذا تغير الوقت
                if (countTimer) {
                    clearInterval(countTimer);
                }
                countDown();
            }

            $(".title2").hide();
            $(".title1").show();

            // نتيجة الجولة السابقة - فقط إذا كنا في جولة جديدة
            if (_round && res.data.result && res.data.result != "") {
                // إظهار النتيجة فقط عند طلب نتيجة الجولة السابقة
                for (var i = 0; i < $(".item").length; i++) {
                    $(".item" + (i + 1)).removeClass("active");
                }
                
                $(".item" + searchGift(res.data.result)).addClass("active");
                $(".noPrize1>div img:last-child").attr(
                    "src",
                    "images/gift_" + searchGift(res.data.result) + ".png"
                );
            } else if (!_round) {
                // خلال الجولة الحالية، لا تظهر نتيجة
                for (var i = 0; i < $(".item").length; i++) {
                    $(".item" + (i + 1)).removeClass("active");
                }
            }

            // قائمة النتائج
            var giftListHtml = "";
            var resultList = res.data.resultList || [];
            
            for (var i = 0; i < resultList.length; i++) {
                var _index = searchGift(resultList[i]);
                if (i == resultList.length - 1) {
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

            // عرض النتيجة - فقط عند انتهاء الجولة
            if (_round && res.data.top && res.data.top.length) {
                showResult(
                    res.data.result,
                    res.data.top,
                    res.data.winGold,
                    res.data.avatar
                );
            }
        }
    }).catch(function(error) {
        console.error("Info error:", error);
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
    // فقط أظهر الرسالة إذا كانت مهمة (مثل خطأ في الرصيد)
    if (msg.includes("رصيد") || msg.includes("balance") || 
        msg.includes("يرجى") || msg.includes("Please")) {
        $(".pop-success div")[0].innerHTML = msg;
        $(".pop-success").show();
        setTimeout(function() {
            $(".pop-success div")[0].innerHTML = "";
            if (fn) fn();
            $(".pop-success").hide();
        }, 1500);
    }
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

function closeGame() {
    sendToApp({ action: 'close' });
}

function debugInfo() {
    console.log("Current game state:");
    console.log("Status:", status);
    console.log("Round:", round);
    console.log("Countdown time:", countTime);
    console.log("Selected items:", selectArr);
    console.log("Current gold:", currentGold);
    console.log("Is showing result:", isShowingResult);
}

function startAutoRefresh() {
    setInterval(function() {
        // تحديث المعلومات فقط إذا لم نكن نعرض نتيجة
        if (!isShowingResult && countTime > 3) {
            getInfo(round, false);
        }
    }, 5000); // تحديث كل 5 ثواني
}
