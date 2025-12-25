// =================== إعدادات اللعبة ===================
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

// معلومات اللاعب من Flutter
var info = {
    uid: '',
    token: '',
    lang: 'en',
    username: '',
    nickname: '',
    avatar: '',
    credits: 0,
    diamonds: 0,
    liveId: '',
    roomId: ''
};

// خريطة الطلبات المعلقة
var pendingRequests = {};
var requestIdCounter = 0;

// =================== التواصل مع Flutter ===================

/**
 * إرسال طلب إلى Flutter وانتظار الاستجابة
 */
function sendToFlutter(action, params) {
    return new Promise(function(resolve, reject) {
        var requestId = 'req_' + (++requestIdCounter) + '_' + Date.now();
        
        pendingRequests[requestId] = {
            resolve: resolve,
            reject: reject,
            timeout: setTimeout(function() {
                delete pendingRequests[requestId];
                reject(new Error('Request timeout'));
            }, 30000) // 30 ثانية timeout
        };
        
        var message = JSON.stringify({
            action: action,
            requestId: requestId,
            params: params || {}
        });
        
        // إرسال الرسالة عبر FlamingoApp channel
        if (window.FlamingoApp && window.FlamingoApp.postMessage) {
            window.FlamingoApp.postMessage(message);
        } else {
            console.error('FlamingoApp channel not available');
            clearTimeout(pendingRequests[requestId].timeout);
            delete pendingRequests[requestId];
            reject(new Error('FlamingoApp channel not available'));
        }
    });
}

/**
 * استقبال الاستجابة من Flutter
 */
window.onFlamingoResponse = function(response) {
    console.log('Received response from Flutter:', response);
    
    var data = typeof response === 'string' ? JSON.parse(response) : response;
    var requestId = data.requestId;
    
    if (requestId && pendingRequests[requestId]) {
        clearTimeout(pendingRequests[requestId].timeout);
        
        if (data.success) {
            pendingRequests[requestId].resolve(data.data);
        } else {
            pendingRequests[requestId].reject(new Error(data.error || 'Unknown error'));
        }
        
        delete pendingRequests[requestId];
    }
};

/**
 * استقبال معلومات اللاعب من Flutter
 */
window.onFlamingoPlayerInfo = function(playerInfo) {
    console.log('Received player info from Flutter:', playerInfo);
    
    var data = typeof playerInfo === 'string' ? JSON.parse(playerInfo) : playerInfo;
    
    info.uid = data.uid || '';
    info.token = ''; // Token لا يُرسل للأمان
    info.lang = data.lang || 'en';
    info.username = data.username || '';
    info.nickname = data.nickname || '';
    info.avatar = data.avatar || '';
    info.credits = data.credits || 0;
    info.diamonds = data.diamonds || 0;
    info.liveId = data.liveId || '';
    info.roomId = data.roomId || '';
    
    // تحديث الرصيد في الواجهة إذا كانت موجودة
    if ($('.balanceCount').length) {
        $('.balanceCount').text(info.credits.toFixed(2));
    }
};

// =================== بيئة التشغيل ===================
var env = (function() {
    var ua = navigator.userAgent;
    return {
        isProd: true,
        ios: !!ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/),
        android: ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1,
        app: true // دائماً داخل التطبيق
    };
})();

// =================== التهيئة ===================
$(document).ready(function() {
    console.log("Document ready - Flamingo Game");
    
    // التحقق من وجود معلومات اللاعب المحقونة
    if (window.flamingoPlayerInfo) {
        window.onFlamingoPlayerInfo(window.flamingoPlayerInfo);
    }
    
    // بدء التهيئة
    init();
    
    // إخفاء تعليمات iOS إذا لم يكن الجهاز iOS
    if (!env.ios) {
        $('#iosDesc').hide();
    }
});

function init() {
    console.log("Initializing game...");
    moment.tz.setDefault("Asia/Riyadh");
    changeLang(info.lang);
    showHand();
    bindEvent();
    getInfo();
    getBill();
    getRank();
}

// =================== عرض اليد المتحركة ===================
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

// =================== عرض النتيجة ===================
function showResult(result, topList, winGold, avatar) {
    $(".reword").show();
    if (winGold && winGold > 0) {
        $(".prize").show();
        $(".reword_word>div:first-child>div:last-child")[0].innerHTML = winGold;
        console.log("Avatar:", avatar);
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
        $(".reword .roundWord").html("طلقة" + (round - 1) + " نتيجة");
    } else {
        $(".reword .roundWord").html("The result of " + (round - 1) + " round：");
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

// =================== العد التنازلي ===================
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

// =================== وضع الرهان ===================
function sureClick(choice, index) {
    // التحقق من الرصيد
    var currentBalance = parseFloat($('.balanceCount').text());
    if (currentBalance < currentGold) {
        showSuccess("Insufficient balance! Please recharge.");
        return;
    }

    // تحديث الرصيد مؤقتاً في الواجهة
    $('.balanceCount').text((currentBalance - currentGold).toFixed(2));

    // إرسال الطلب إلى Flutter -> Parse Cloud
    sendToFlutter('game_choice', {
        choice: choice,
        gold: currentGold
    }).then(function(res) {
        console.log('Choice response:', res);
        
        if (res.code == 200) {
            // تحديث البيانات بناءً على الاستجابة
            selectCount += 1;
            if (!selectArr.includes(choice)) {
                selectArr.push(choice);
            }

            // تحديث واجهة المستخدم
            var list = [6, 7, 8, 1, 2, 3, 4, 5];
            var temp = $(`.item${list[index]} .selected div:nth-child(2) div`)[0].innerHTML;

            $(`.item${list[index]} .selected div:nth-child(2) div`)[0].innerHTML = 
                parseInt(temp) + parseInt(currentGold);
            $(`.item${list[index]} .selected`).show();

            // تحديث الرصيد في الواجهة
            if (res.balance !== undefined) {
                $('.balanceCount').text(parseFloat(res.balance).toFixed(2));
            }
            
            // طلب تحديث الرصيد من Flutter
            refreshBalance();
        } else if (res.code == 10062) {
            // استعادة الرصيد في حالة الخطأ
            $('.balanceCount').text(currentBalance.toFixed(2));
            showSuccess("Please recharge");
        } else {
            // استعادة الرصيد في حالة الخطأ
            $('.balanceCount').text(currentBalance.toFixed(2));
            showSuccess(res.message || "Error placing bet");
        }
    }).catch(function(error) {
        console.error('Choice error:', error);
        // استعادة الرصيد في حالة الخطأ
        $('.balanceCount').text(currentBalance.toFixed(2));
        showSuccess("System Error");
    });
}

// =================== تحديث الرصيد ===================
function refreshBalance() {
    var message = JSON.stringify({
        action: 'refreshBalance'
    });
    
    if (window.FlamingoApp && window.FlamingoApp.postMessage) {
        window.FlamingoApp.postMessage(message);
    }
}

// =================== دوران العجلة ===================
function roll(dir) {
    hideHand();
    selectCount = 0;
    selectArr = [];
    $(".title1").hide();
    $(".title2").show();
    $(".coutDown")[0].innerHTML = countTime + "s";
    
    var rollCountTimer = setInterval(function() {
        countTime--;
        if (countTime <= 0) {
            countTime = 0;
            status = 0;
            clearInterval(rollCountTimer);
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

// =================== ربط الأحداث ===================
function bindEvent() {
    // اختيار قيمة الرهان
    $(".clickArea .clickItem").click(function() {
        for (var i = 0; i < $(".clickItem").length; i++) {
            $($(".clickItem").removeClass("active"));
        }
        $(this).addClass("active");
        currentGold = goldList[$(this).data("index")];
        console.log("Selected gold:", currentGold);
    });
    
    // معالجة إخفاء/إظهار الصفحة
    try {
        document.addEventListener("visibilitychange", function() {
            if (document.hidden) {
                hideLock = true;
                sessionStorage.setItem("currentRound", round);
                if (countTimer) {
                    clearInterval(countTimer);
                }
            } else {
                if (hideLock) {
                    hideLock = false;
                    getInfo();
                }
            }
        });
    } catch (error) {
        console.error('Visibility change error:', error);
    }

    // إغلاق النافذة
    $("body").click(function() {
        closeGame();
    });

    $(".content").click(function(e) {
        e.stopPropagation();
    });

    // النقر على العناصر
    $(".item").click(function() {
        console.log("Item clicked:", $(this).data("index"));
        if (status == 0) {
            for (var i = 0; i < $(".item").length; i++) {
                $(".item" + (i + 1)).removeClass("active");
            }
            console.log("selectCount:", selectCount);
            
            var isHas = false;
            for (var i = 0; i < selectArr.length; i++) {
                if (selectArr[i] == choiceList[$(this).data("index")]) {
                    isHas = true;
                }
            }
            if (selectArr.length > 5 && !isHas) {
                showSuccess("Max Selected");
                return;
            }

            sureClick(choiceList[$(this).data("index")], $(this).data("index"));
        }
    });
    
    // السجلات
    $(".records").click(function() {
        getBill();
        $(".recordsBg").show();
    });
    $(".recordsBg .modalBack").click(function() {
        $(".recordsBg").hide();
    });

    // القواعد
    $(".rule").click(function() {
        $(".ruleBg").show();
    });
    $(".ruleBg").click(function() {
        $(".ruleBg").hide();
    });

    // الترتيب
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

// =================== إغلاق اللعبة ===================
function closeGame() {
    var message = JSON.stringify({
        action: 'close'
    });
    
    if (window.FlamingoApp && window.FlamingoApp.postMessage) {
        window.FlamingoApp.postMessage(message);
    }
}

// =================== جلب ترتيب اللاعبين ===================
function getRank() {
    sendToFlutter('game_rank', {}).then(function(res) {
        console.log('Rank response:', res);
        
        if (res.code === 200 && res.data) {
            var innerHTML = "";
            var topHTML = "";

            if (res.data.length) {
                // عرض أفضل 3 مستخدمين
                for (var i = 0; i < Math.min(3, res.data.length); i++) {
                    var top = res.data[i];
                    topHTML +=
                        '<div class="top' +
                        (i + 1) +
                        '"><div class="topLogo"><div class="logo"><img src="' +
                        top.avatar +
                        '" alt=""></div><img src="images/top' +
                        (i + 1) +
                        '.png" alt=""></div><div class="nick">' +
                        top.nick +
                        '</div><div class="price flex ac jc"><img src="images/gold.png" alt=""><div>' +
                        top.total +
                        '</div></div></div>';
                }

                // عرض باقي المستخدمين (الترتيب من 4 فما فوق)
                for (var i = 3; i < res.data.length; i++) {
                    var tempItem = res.data[i];
                    innerHTML +=
                        '<div class="topItem flex ac"><div class="rankCount">' +
                        (i + 1) +
                        '</div><div class="head"><img src="' +
                        tempItem.avatar +
                        '" alt=""></div><div class="name">' +
                        tempItem.nick +
                        '</div><div class="score flex ac"><div class="scoreRank">' +
                        tempItem.total +
                        '</div><img src="images/gold.png" alt=""></div></div>';
                }
                
                $(".topThree").html(topHTML);
                $(".topList").html(innerHTML);
            }
        } else {
            console.error("Error in rank response:", res.message);
        }
    }).catch(function(error) {
        console.error("Error fetching rank:", error);
    });
}

// =================== جلب معلومات اللعبة ===================
function getInfo(_round, isChoice) {
    var params = {};
    if (_round) {
        params.round = _round;
    }
    
    console.log("Getting game info...");
    
    sendToFlutter('game_info', params).then(function(res) {
        console.log('Info response:', res);
        
        if (res.code === 200 && res.data) {
            if (res.data.countdown && res.data.countdown < 0) {
                showSuccess("System Error, connecting...");

                if (countTimer) {
                    clearInterval(countTimer);
                }
                if (handTimer) {
                    clearInterval(handTimer);
                }
                if (rollTimer) {
                    clearInterval(rollTimer);
                }
                if (resultTimer) {
                    clearInterval(resultTimer);
                }

                setTimeout(function() {
                    getInfo();
                    showHand();
                }, 800);
                return;
            }

            $(".balanceCount")[0].innerHTML = res.data.gold.toFixed(2);
            $(".profitCount")[0].innerHTML = res.data.profit;
            $(".round")[0].innerHTML = "Round " + res.data.round;

            // لا تغير القيم أثناء السحب
            if (status == 1 && isChoice) return;
            round = res.data.round;

            // لا تعيد تعيين العد التنازلي عند وضع الرهان
            if (!isChoice) {
                countTime = res.data.countdown;
                $(".coutDown")[0].innerHTML = countTime + "s";

                if (countTimer) {
                    clearInterval(countTimer);
                }
                countDown();
            }

            $(".title2").hide();
            $(".title1").show();

            // تعيين نتيجة الجولة الحالية
            if (res.data.result && res.data.result != "") {
                $(".item" + searchGift(res.data.result)).addClass("active");
                $(".noPrize1>div img:last-child").attr(
                    "src",
                    "images/gift_" + searchGift(res.data.result) + ".png"
                );
            }

            // قائمة النتائج
            var giftListHtml = "";
            res.data.resultList = res.data.resultList.reverse();
            for (var i = 0; i < res.data.resultList.length; i++) {
                var _index = searchGift(res.data.resultList[i]);
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

            // عرض اختيارات المستخدم
            if (res.data.select && Object.keys(res.data.select).length) {
                var ak = Object.keys(res.data.select);
                var vk = Object.values(res.data.select);
                for (var i = 0; i < ak.length; i++) {
                    var temp = $(
                        ".item" + searchGift(ak[i]) + " .selected div:nth-child(2) div"
                    )[0].innerHTML;

                    $(
                        ".item" + searchGift(ak[i]) + " .selected div:nth-child(2) div"
                    )[0].innerHTML = vk[i];
                    $(".item" + searchGift(ak[i]) + " .selected").show();
                }
            } else {
                for (var i = 0; i < $(".item .gray").length; i++) {
                    $(
                        ".item" + (i + 1) + " .selected div:nth-child(2) div"
                    )[0].innerHTML = 0;
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
                    $(".rewordNo .roundWord").html("طلقة" + (round - 1) + " نتيجة");
                } else {
                    $(".rewordNo .roundWord").html(
                        "The result of " + (round - 1) + " round："
                    );
                }

                resultTimer = setInterval(function() {
                    resultCount--;
                    if (resultCount < 0) {
                        resultCount = 5;
                        clearInterval(resultTimer);
                        $(".rewordNo").hide();
                    }
                    $(".rewordNo .reword_content .countDown")[0].innerHTML =
                        resultCount + "s";
                }, 1000);
                $(".rewordNo").show();
            }
        } else {
            console.error("Error in info response");
        }
    }).catch(function(error) {
        console.error("Error fetching info:", error);
        showSuccess("Connection Error");
    });
}

// =================== البحث عن الهدية ===================
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

// =================== جلب سجل الرهانات ===================
function getBill() {
    sendToFlutter('game_bill', {}).then(function(res) {
        console.log('Bill response:', res);
        
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
                    searchGift(tempItem.result) +
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
                    "</div></div></div>';
            }
            $(".records-list").html(innerHTML);
        }
    }).catch(function(error) {
        console.error("Error fetching bill:", error);
    });
}

// =================== دوال مساعدة ===================
function changeTimesWord() {
    if (info.lang == "ar") {
        return "مرات";
    } else {
        return "times";
    }
}

function changeWord(win) {
    if (info.lang == "ar") {
        if (win) {
            return "لا";
        } else {
            return "نعم";
        }
    } else {
        if (win) {
            return "Yes";
        } else {
            return "No";
        }
    }
}

function showSuccess(msg, fn) {
    $(".pop-success div")[0].innerHTML = msg;
    $(".pop-success").show();
    setTimeout(function() {
        $(".pop-success div")[0].innerHTML = "";
        if (fn) {
            fn();
        }
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

// =================== عرض رسالة للمستخدم عبر Flutter ===================
function showFlutterMessage(title, message, isError) {
    var msg = JSON.stringify({
        action: 'showMessage',
        title: title || '',
        message: message || '',
        isError: isError || false
    });
    
    if (window.FlamingoApp && window.FlamingoApp.postMessage) {
        window.FlamingoApp.postMessage(msg);
    }
}
