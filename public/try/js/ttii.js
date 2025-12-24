/**
 * لعبة عجلة الفواكه - نسخة آمنة - تصحيح كامل لمشكلة النقر
 * الإصدار: 2.0
 * تاريخ: 2024
 * وصف: إصلاح كامل لمشكلة status وتمكين النقر على الفواكه بشكل صحيح
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
var status = 0; // 0 يمكن النقر, 1 جاري السحب
var currentGold = 1;
var openDrawTimer = null;

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

console.log("🎮 بدء تحميل لعبة عجلة الفواكه");
console.log("👤 معلومات اللاعب:", info);

window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("📥 تم استقبال معلومات اللاعب:", info);
    init();
};

window.onFlamingoResponse = function(response) {
    console.log("📤 استجابة من التطبيق:", response);
    
    var requestId = response.requestId;
    if (requestId && pendingRequests[requestId]) {
        var callback = pendingRequests[requestId];
        delete pendingRequests[requestId];
        
        if (response.success) {
            callback.resolve(response.data);
        } else {
            callback.reject(response.error || 'خطأ غير معروف');
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
    console.log("✅ المستند جاهز");
    
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
    console.log("🚀 تهيئة اللعبة...");
    status = 0; // تأكد من أن status = 0 عند البداية
    moment.tz.setDefault("Asia/Riyadh");
    changeLang(info.lang || 'en');
    showHand();
    bindEvent();
    getInfo();
    getBill();
    getRank();
    
    console.log("✨ اللعبة جاهزة! status =", status);
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
            status = 1; // منع النقر أثناء السحب
            console.log("⏰ العد التنازلي انتهى، بدء السحب. status:", status);
            roll();
            clearInterval(countTimer);
        }
        $(".coutDown")[0].innerHTML = countTime + "s";
    }, 1000);
}

function openDraw() {
    console.log("🎮 فتح مرحلة الرهان");
    
    // ✅ تعيين status إلى 0 فوراً
    status = 0;
    console.log("✓ openDraw() - status = 0 (جاهز للرهان)");
    
    getInfo(round);
    
    // ✅ إظهار يد المؤشر بعد فترة قصيرة
    setTimeout(function() {
        showHand();
        console.log("👆 اليد معروضة، يمكن النقر الآن");
    }, 300);
}

function sureClick(choice, index) {
    console.log("🎯 معالجة النقر على:", choice, "بمبلغ:", currentGold);
    
    let currentBalance = parseFloat($('.balanceCount').text());
    if (currentBalance < currentGold) {
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        console.log("❌ رصيد غير كافي:", currentBalance, "<", currentGold);
        return;
    }

    $('.balanceCount').text((currentBalance - currentGold).toFixed(2));

    callFlamingoApp('game_choice', {
        choice: choice,
        gold: currentGold
    }).then(function(res) {
        console.log("✅ استجابة الرهان:", res);
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
            
            console.log("💰 رهان ناجح! الرهانات الحالية:", selectArr);
        } else if (res.code == 10062) {
            showSuccess(info.lang == "ar" ? "يرجى الشحن" : "Please recharge");
            $('.balanceCount').text(currentBalance.toFixed(2));
            console.log("💳 خطأ: رصيد غير كافي");
        } else {
            showSuccess(res.message || 'خطأ');
            $('.balanceCount').text(currentBalance.toFixed(2));
            console.log("❌ خطأ في الرهان:", res.message);
        }
    }).catch(function(error) {
        console.error("❌ خطأ في معالجة الرهان:", error);
        showSuccess(info.lang == "ar" ? "خطأ في النظام" : "System Error");
        $('.balanceCount').text(currentBalance.toFixed(2));
    });
}

function roll(dir) {
    console.log("🎡 بدء سحب الجولة", round);
    
    hideHand();
    selectCount = 0;
    selectArr = [];
    $(".title1").hide();
    $(".title2").show();
    $(".coutDown")[0].innerHTML = countTime + "s";
    
    // ✅ تعيين status إلى 1 لمنع النقر أثناء السحب
    status = 1;
    console.log("🔒 status = 1 (منع النقر أثناء السحب)");
    
    var rollCountdown = countTime;
    
    var rollCountTimer = setInterval(function() {
        rollCountdown--;
        $(".coutDown")[0].innerHTML = rollCountdown + "s";
        
        if (rollCountdown <= 0) {
            rollCountdown = 0;
            console.log("✅ انتهى السحب، الانتقال لمرحلة الرهان");
            
            // ✅ إيقاف جميع المؤقتات أولاً
            clearInterval(rollCountTimer);
            clearInterval(rollTimer);
            
            // ✅ إخفاء العناصر الرمادية
            for (var i = 0; i < $(".item .gray").length; i++) {
                $($(".item .gray")[i]).hide();
            }
            
            // ✅ إعادة تعيين status إلى 0 فوراً
            status = 0;
            console.log("🔓 status = 0 (يمكن النقر الآن)");
            
            // ✅ فتح مرحلة الرهان الجديدة
            openDraw();
            
            // ✅ إظهار رسالة للمستخدم
            if (info.lang == "ar") {
                showSuccess("يمكنك الرهان الآن!");
            } else {
                showSuccess("You can bet now!");
            }
        }
    }, 1000);
    
    // ✅ إعادة تعيين الرهانات السابقة
    for (var i = 0; i < $(".item .gray").length; i++) {
        $(".item" + (i + 1) + " .selected div:nth-child(2) div")[0].innerHTML = 0;
        $(".item" + (i + 1) + " .selected").hide();
        $(".item" + (i + 1)).removeClass("active");
        $($(".item .gray")[i]).show();
    }
    $($(".item .gray")[rollCount]).hide();
    
    // ✅ مؤقت للحركة الدورانية
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
    console.log("🔗 ربط الأحداث...");
    
    // معالج اختيار الرقاقة
    $(".clickArea .clickItem").click(function() {
        for (var i = 0; i < $(".clickItem").length; i++) {
            $($(".clickItem").removeClass("active"));
        }
        $(this).addClass("active");
        currentGold = goldList[$(this).data("index")];
        console.log("💰 تم اختيار المبلغ:", currentGold);
    });
    
    // معالج رؤية الصفحة
    try {
        document.addEventListener("visibilitychange", function() {
            if (document.hidden) {
                hideLock = true;
                sessionStorage.setItem("currentRound", round);
                if (countTimer) clearInterval(countTimer);
                console.log("📱 الصفحة مخفية");
            } else {
                if (hideLock) {
                    hideLock = false;
                    getInfo();
                    console.log("📱 الصفحة ظاهرة مرة أخرى");
                }
            }
        });
    } catch (e) {
        console.error("❌ خطأ في معالج visibilitychange:", e);
    }

    // معالج النقر على الفواكه - النسخة المحسنة
    console.log("🍎 ربط أحداث النقر على الفواكه...");
    for (var i = 0; i < 8; i++) {
        (function(index) {
            $(".item" + (index + 1)).on("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log("=== 🍎 نقر على فاكهة ===");
                console.log("📊 حالة النظام: status =", status, "(0=يمكن النقر, 1=جاري السحب)");
                console.log("🎯 فهرس الفاكهة:", index);
                console.log("🏷️ اسم الفاكهة:", choiceList[index]);
                console.log("⏱️ الوقت المتبقي:", countTime, "ثانية");
                console.log("💰 المبلغ المختار:", currentGold);
                
                if (status === 0) {
                    var choice = choiceList[index];
                    console.log("✅ بدء معالجة الرهان على:", choice);
                    sureClick(choice, index);
                } else {
                    console.log("⏳ لا يمكن الرهان الآن - status =", status);
                    
                    // ✅ رسالة أكثر وضوحاً للمستخدم
                    var message = "";
                    if (status === 1) {
                        message = info.lang == "ar" 
                            ? "جاري السحب، انتظر حتى النهاية (" + countTime + " ثانية)" 
                            : "Drawing in progress, wait until end (" + countTime + "s)";
                    } else {
                        message = info.lang == "ar" 
                            ? "اللعبة غير جاهزة، حاول لاحقاً" 
                            : "Game not ready, try later";
                    }
                    
                    showSuccess(message);
                }
            });
        })(i);
    }
    
    console.log("✅ تم ربط جميع الأحداث بنجاح");
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
        
        console.log("📤 إرسال إلى التطبيق:", message);
        
        if (window.FlamingoApp) {
            window.FlamingoApp.postMessage(message);
        } else {
            reject('FlamingoApp غير متوفر');
        }
        
        setTimeout(function() {
            if (pendingRequests[requestId]) {
                delete pendingRequests[requestId];
                reject('انتهت مهلة الطلب');
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
        console.log("🏆 استجابة الترتيب:", res);
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
            
            console.log("✅ تم تحديث الترتيب");
        }
    }).catch(function(error) {
        console.error("❌ خطأ في الحصول على الترتيب:", error);
    });
}

function getInfo(_round, isChoice) {
    console.log("🔄 الحصول على معلومات الجولة..., round:", _round, "isChoice:", isChoice);
    
    var params = {};
    if (_round) {
        params.round = _round;
    }
    
    callFlamingoApp('game_info', params).then(function(res) {
        console.log("📊 استجابة معلومات الجولة:", res);
        
        if (res.code === 200 && res.data) {
            // ✅ التحقق من وجود خطأ في العد التنازلي
            if (res.data.countdown && res.data.countdown < 0) {
                showSuccess(info.lang == "ar" ? "خطأ في النظام، جاري إعادة الاتصال..." : "System Error, reconnecting...");
                
                // ✅ إيقاف جميع المؤقتات
                if (countTimer) clearInterval(countTimer);
                if (handTimer) clearInterval(handTimer);
                if (rollTimer) clearInterval(rollTimer);
                if (resultTimer) clearInterval(resultTimer);
                
                // ✅ إعادة التعيين
                status = 0;
                console.log("🔄 إعادة التعيين بسبب خطأ");
                
                setTimeout(function() {
                    getInfo();
                    showHand();
                }, 800);
                return;
            }

            // ✅ تحديث واجهة المستخدم
            $(".balanceCount")[0].innerHTML = parseFloat(res.data.gold).toFixed(2);
            $(".profitCount")[0].innerHTML = res.data.profit || 0;
            $(".round")[0].innerHTML = (info.lang == "ar" ? "جولة " : "Round ") + res.data.round;

            // ✅ تحديث رقم الجولة
            if (status == 1 && isChoice) return;
            round = res.data.round;

            if (!isChoice) {
                countTime = res.data.countdown;
                $(".coutDown")[0].innerHTML = countTime + "s";
                
                // ✅ إيقاف المؤقت القديم
                if (countTimer) clearInterval(countTimer);
                
                // ✅ التأكد من أن status = 0 قبل بدء العد التنازلي للرهان
                if (countTime > 0) {
                    status = 0;
                    console.log("🎯 بدء مرحلة الرهان - status = 0 (يمكن النقر)");
                    console.log("⏱️ وقت الرهان:", countTime, "ثانية");
                    
                    // ✅ إظهار رسالة ترحيبية
                    if (countTime > 5) {
                        showSuccess(info.lang == "ar" ? "اختر فاكهتك واربح!" : "Choose your fruit and win!");
                    }
                    
                    // ✅ بدء العد التنازلي للرهان
                    countDown();
                }
            }

            // ✅ إظهار عناصر الواجهة المناسبة
            $(".title2").hide();
            $(".title1").show();

            // ✅ عرض نتيجة الجولة السابقة
            if (res.data.result && res.data.result != "") {
                $(".item" + searchGift(res.data.result)).addClass("active");
                $(".noPrize1>div img:last-child").attr(
                    "src",
                    "images/gift_" + searchGift(res.data.result) + ".png"
                );
            }
            
            console.log("✅ تم تحديث معلومات الجولة");
        } else {
            console.log("⚠️ استجابة غير متوقعة:", res);
        }
    }).catch(function(error) {
        console.error("❌ خطأ في getInfo:", error);
        // ✅ في حالة الخطأ، التأكد من إمكانية النقر
        status = 0;
        console.log("🔓 status = 0 (بسبب خطأ)");
    });
}

function getBill() {
    callFlamingoApp('game_bill').then(function(res) {
        console.log("📋 استجابة السجل:", res);
    }).catch(function(error) {
        console.error("❌ خطأ في الحصول على السجل:", error);
    });
}

function showSuccess(str) {
    console.log("💬 عرض رسالة:", str);
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
    if (window.$.i18n) {
        window.$.i18n.load(lang);
    }
}

// ✅ دالة مساعدة للتحقق من حالة النظام
function checkGameStatus() {
    console.log("=== 📋 تقرير حالة النظام ===");
    console.log("🎮 حالة اللعبة:", status === 0 ? "🟢 جاهز للرهان" : "🔴 جاري السحب");
    console.log("🔢 رقم الجولة:", round);
    console.log("⏱️ الوقت المتبقي:", countTime, "ثانية");
    console.log("💰 المبلغ المختار:", currentGold);
    console.log("🎯 عدد الرهانات:", selectCount);
    console.log("📋 الفواكه المختارة:", selectArr);
    console.log("========================");
}

// ✅ استدعاء دالة التحقق دورياً (للمساعدة في التصحيح)
setInterval(function() {
    if (countTime <= 3 && status === 0) {
        console.log("⏰ وقت الرهان ينفذ! فقط", countTime, "ثانية متبقية");
    }
}, 1000);

// ✅ إضافة أداة تصحيح للواجهة (اختياري)
if (!window.gameDebug) {
    window.gameDebug = {
        checkStatus: checkGameStatus,
        getGameState: function() {
            return {
                status: status,
                round: round,
                countTime: countTime,
                currentGold: currentGold,
                selectCount: selectCount,
                selectArr: selectArr
            };
        },
        forceBetMode: function() {
            status = 0;
            console.log("🔓 تم إجبار وضع الرهان - status = 0");
            showSuccess("وضع الرهان مفعل");
        }
    };
    
    console.log("🐛 أدوات التصحيح متاحة عبر window.gameDebug");
}

console.log("🎉 تم تحميل لعبة عجلة الفواكه بنجاح!");
