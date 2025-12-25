/**
 * لعبة عجلة الفواكه - النسخة النهائية المصححة
 */

var count = 4;
var rollCount = 0;
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

// متغيرات إدارة الحالة
var gameState = {
    isRolling: false,
    isResultShowing: false,
    lastUpdateTime: 0,
    serverTimeOffset: 0
};

// متغير لمنع النقرات المتعددة
var isProcessingClick = false;

// معلومات اللاعب
var info = window.flamingoPlayerInfo || {
    uid: '',
    lang: 'en',
    nickname: '',
    avatar: '',
    credits: 0,
    diamonds: 0
};

// تخزين callbacks
var pendingRequests = {};
var requestIdCounter = 0;

console.log("Player Info:", info);

// استلام معلومات اللاعب
window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("Received player info:", info);
    init();
};

// استلام الاستجابات
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
    
    // الحصول على وقت السيرفر أولاً
    getServerTime().then(() => {
        showHand();
        bindEvent();
        startGameLoop();
        getBill();
        getRank();
    }).catch(error => {
        console.error("Failed to get server time, using local time:", error);
        showHand();
        bindEvent();
        startGameLoop();
        getBill();
        getRank();
    });
}

// دالة للحصول على وقت السيرفر
function getServerTime() {
    return callFlamingoApp('get_server_time', {}).then(function(res) {
        if (res.code === 200 && res.data && res.data.serverTime) {
            var serverTime = res.data.serverTime;
            var localTime = Math.floor(Date.now() / 1000);
            gameState.serverTimeOffset = serverTime - localTime;
            console.log("Server time offset:", gameState.serverTimeOffset, "seconds");
        }
        return res;
    }).catch(function(error) {
        console.error("Failed to get server time:", error);
        // استخدم الوقت المحلي كبديل
        gameState.serverTimeOffset = 0;
        return { code: 200, data: { serverTime: Math.floor(Date.now() / 1000) } };
    });
}

// الحصول على الوقت الحالي متزامن مع السيرفر
function getCurrentServerTime() {
    return Math.floor(Date.now() / 1000) + gameState.serverTimeOffset;
}

// الحلقة الرئيسية للعبة
function startGameLoop() {
    console.log("Starting game loop...");
    
    // تحديث أولي
    updateGameState();
    
    // تحديث كل ثانية
    setInterval(function() {
        updateGameState();
    }, 1000);
}

// تحديث حالة اللعبة
function updateGameState() {
    if (gameState.isResultShowing || gameState.isRolling) {
        return;
    }
    
    var currentTime = getCurrentServerTime();
    
    // تحديث كل 3 ثواني فقط (لتجنب كثرة الطلبات)
    if (currentTime - gameState.lastUpdateTime >= 3) {
        gameState.lastUpdateTime = currentTime;
        getInfo(null, true); // تحديث صامت
    }
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
    
    gameState.isResultShowing = true;
    
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
    
    resultCount = 5;
    $(".reword .reword_content .countDown")[0].innerHTML = resultCount + "s";
    $(".noPrize .reword_content .countDown")[0].innerHTML = resultCount + "s";
    
    if (resultTimer) clearInterval(resultTimer);
    resultTimer = setInterval(function() {
        resultCount--;
        if (resultCount <= 0) {
            clearInterval(resultTimer);
            $(".reword").hide();
            $(".prize").hide();
            $(".noPrize").hide();
            
            gameState.isResultShowing = false;
            status = 0;
            
            setTimeout(function() {
                showHand();
                getInfo();
            }, 500);
        }
        $(".reword .reword_content .countDown")[0].innerHTML = resultCount + "s";
        $(".noPrize .reword_content .countDown")[0].innerHTML = resultCount + "s";
    }, 1000);
}

function startCountdown(seconds) {
    if (countTimer) clearInterval(countTimer);
    
    countTime = seconds;
    $(".coutDown")[0].innerHTML = countTime + "s";
    
    countTimer = setInterval(function() {
        countTime--;
        
        if (countTime <= 0) {
            countTime = 0;
            status = 1;
            clearInterval(countTimer);
            roll();
        }
        
        $(".coutDown")[0].innerHTML = countTime + "s";
    }, 1000);
}

function sureClick(choice, index) {
    if (isProcessingClick) {
        console.log("Click ignored - processing previous request");
        return;
    }
    
    // التحقق من حالة اللعبة فقط (بدون تحقق مزدوج)
    if (status !== 0) {
        console.log("Cannot click now, status:", status);
        return;
    }
    
    // التحقق من الرصيد
    let currentBalance = parseFloat($('.balanceCount').text());
    if (currentBalance < currentGold) {
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        return;
    }

    isProcessingClick = true;
    $('.balanceCount').text((currentBalance - currentGold).toFixed(2));

    callFlamingoApp('game_choice', {
        choice: choice,
        gold: currentGold
    }).then(function(res) {
        console.log("Choice response:", res);
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

            if (res.balance !== undefined) {
                $('.balanceCount').text(parseFloat(res.balance).toFixed(2));
            }
            
            sendToApp({ action: 'refreshBalance' });
            
            // تحديث سريع لمعلومات الجولة
            getInfo(null, true);
        } else if (res.code == 10062) {
            showSuccess(info.lang == "ar" ? "يرجى الشحن" : "Please recharge");
            $('.balanceCount').text(currentBalance.toFixed(2));
        } else {
            showSuccess(res.message || 'Error');
            $('.balanceCount').text(currentBalance.toFixed(2));
        }
    }).catch(function(error) {
        console.error("Choice error:", error);
        isProcessingClick = false;
        showSuccess(info.lang == "ar" ? "خطأ في النظام" : "System Error");
        $('.balanceCount').text(currentBalance.toFixed(2));
    });
}

function roll() {
    console.log("Starting roll...");
    
    if (gameState.isRolling) {
        console.log("Roll already in progress");
        return;
    }
    
    gameState.isRolling = true;
    hideHand();
    
    selectCount = 0;
    selectArr = [];
    rollCount = 0;
    
    $(".title1").hide();
    $(".title2").show();
    $(".coutDown")[0].innerHTML = "0s";
    
    // إخفاء التحديدات
    for (var i = 1; i <= 8; i++) {
        $(`.item${i} .selected div:nth-child(2) div`)[0].innerHTML = "0";
        $(`.item${i} .selected`).hide();
        $(`.item${i}`).removeClass("active");
        $(`.item${i} .gray`).show();
    }
    
    $(`.item1 .gray`).hide();
    
    // حركة السحب
    var rollDuration = 3000;
    var rollStartTime = Date.now();
    var rollSpeed = 100;
    
    if (rollTimer) clearInterval(rollTimer);
    
    rollTimer = setInterval(function() {
        var elapsed = Date.now() - rollStartTime;
        
        // إظهار جميع العناصر
        for (var i = 1; i <= 8; i++) {
            $(`.item${i} .gray`).show();
        }
        
        // الانتقال للعنصر التالي
        rollCount = (rollCount + 1) % 8;
        $(`.item${rollCount + 1} .gray`).hide();
        
        // التوقف بعد المدة المحددة
        if (elapsed >= rollDuration) {
            clearInterval(rollTimer);
            gameState.isRolling = false;
            
            setTimeout(function() {
                console.log("Roll finished, getting results...");
                getInfo(round);
            }, 1000);
        }
    }, rollSpeed);
}

function bindEvent() {
    $(".clickArea .clickItem").click(function() {
        if (status !== 0) {
            return;
        }
        
        $(".clickItem").removeClass("active");
        $(this).addClass("active");
        currentGold = goldList[$(this).data("index")];
        console.log("Selected gold:", currentGold);
    });
    
    try {
        document.addEventListener("visibilitychange", function() {
            if (document.hidden) {
                if (countTimer) clearInterval(countTimer);
                if (handTimer) clearInterval(handTimer);
                if (rollTimer) clearInterval(rollTimer);
                if (resultTimer) clearInterval(resultTimer);
            } else {
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

    // حدث النقر على الفواكه - التصحيح النهائي
    $(".item").click(function() {
        var index = $(this).data("index");
        console.log("Clicked item index:", index, "Current status:", status);
        
        // الشرط البسيط والفعال
        if (status === 0 && !isProcessingClick) {
            console.log("Processing click...");
            
            // التحقق من الحد الأقصى
            if (selectArr.length >= 6) {
                var isHas = selectArr.includes(choiceList[index]);
                if (!isHas) {
                    showSuccess(info.lang == "ar" ? "الحد الأقصى للتحديدات هو 6" : "Max 6 selections allowed");
                    return;
                }
            }

            sureClick(choiceList[index], index);
        } else {
            console.log("Cannot click now. Status:", status, "Processing:", isProcessingClick);
        }
    });
    
    // باقي الأحداث...
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
    
    if (gameState.isResultShowing && !_round) {
        return;
    }
    
    var params = {};
    if (_round) {
        params.round = _round;
    }
    
    callFlamingoApp('game_info', params).then(function(res) {
        console.log("Info response:", res, "Current round:", round, "Response round:", res.data?.round);
        if (res.code === 200 && res.data) {
            // تحديث الرصيد
            var currentBalance = parseFloat($('.balanceCount').text());
            var newBalance = parseFloat(res.data.gold || 0);
            
            if (!isNaN(newBalance) && newBalance !== currentBalance) {
                $(".balanceCount")[0].innerHTML = newBalance.toFixed(2);
            }
            
            $(".profitCount")[0].innerHTML = res.data.profit || 0;
            
            // تحديث رقم الجولة
            var previousRound = round;
            round = res.data.round || 0;
            $(".round")[0].innerHTML = (info.lang == "ar" ? "جولة " : "Round ") + round;

            // تحديث العداد فقط إذا لم نكن في تحديث صامت
            if (!isSilent) {
                var serverCountdown = Math.max(0, res.data.countdown || 10);
                
                // تحديث واجهة المستخدم
                $(".coutDown")[0].innerHTML = serverCountdown + "s";
                
                // تحديث الحالة بناءً على العداد
                if (serverCountdown > 0) {
                    status = 0; // يمكن التحديد
                    $(".title2").hide();
                    $(".title1").show();
                    
                    // بدء العد التنازلي الجديد
                    startCountdown(serverCountdown);
                } else {
                    status = 1; // جاري السحب
                    $(".title1").hide();
                    $(".title2").show();
                    
                    // بدء السحب إذا لم يكن يعمل بالفعل
                    if (!gameState.isRolling) {
                        roll();
                    }
                }
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

            // تحديث التحديدات الحالية
            if (res.data.select && Object.keys(res.data.select).length) {
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
            } else if (!isSilent && !_round) {
                // إعادة تعيين فقط في جولة جديدة
                selectArr = [];
                selectCount = 0;
                
                for (var i = 1; i <= 8; i++) {
                    $(`.item${i} .selected div:nth-child(2) div`)[0].innerHTML = "0";
                    $(`.item${i} .selected`).hide();
                }
            }

            // عرض النتيجة إذا كانت نتيجة جولة سابقة
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

// تحتاج إلى إضافة هذه الدالة في Backend
function getServerTime() {
    return callFlamingoApp('get_server_time', {}).then(function(res) {
        return res;
    });
}

// باقي الدوال (searchGift, getBill, showSuccess, changeLang...) تبقى كما هي
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
