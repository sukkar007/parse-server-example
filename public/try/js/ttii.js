/**
 * لعبة عجلة الفواكه - الإصلاح النهائي لمشكلة "اللعبة غير جاهزة"
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

console.log("🎮 بدء تحميل لعبة عجلة الفواكه - الإصدار 3.0");

window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("📥 معلومات اللاعب:", info);
    init();
};

window.onFlamingoResponse = function(response) {
    console.log("📤 استجابة التطبيق:", response);
    
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
    
    // ✅ التأكد من أن status = 0 عند البداية
    status = 0;
    console.log("✨ status = 0 (جاهز للرهان)");
    
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
    console.log("⏱️ بدء العد التنازلي:", countTime, "ثانية");
    
    // ✅ إيقاف أي مؤقت سابق
    if (countTimer) {
        clearInterval(countTimer);
    }
    
    // ✅ التأكد من أن status = 0 أثناء العد التنازلي للرهان
    if (status !== 0) {
        console.log("⚠️ تصحيح: status كان", status, "سيتم تعيينه إلى 0");
        status = 0;
    }
    
    countTimer = setInterval(function() {
        countTime--;
        console.log("⏰ الوقت المتبقي:", countTime, "ثانية، status:", status);
        
        if (countTime <= 0) {
            countTime = 0;
            console.log("⏰ انتهى وقت الرهان، بدء السحب");
            
            // ✅ تعيين status = 1 فقط عند بدء السحب الفعلي
            status = 1;
            console.log("🔒 status = 1 (بدء السحب)");
            
            roll();
            clearInterval(countTimer);
        }
        $(".coutDown")[0].innerHTML = countTime + "s";
    }, 1000);
}

function openDraw() {
    console.log("🎮 فتح مرحلة الرهان الجديدة");
    
    // ✅ تعيين status إلى 0 فوراً
    status = 0;
    console.log("🔓 status = 0 (جاهز للرهان في الجولة الجديدة)");
    
    getInfo(round);
    
    // ✅ إظهار اليد بعد فترة قصيرة
    setTimeout(function() {
        showHand();
        console.log("👆 تم إظهار اليد - يمكن النقر الآن");
        
        // ✅ إظهار رسالة للمستخدم
        showSuccess(info.lang == "ar" ? "يمكنك الرهان الآن!" : "You can bet now!");
    }, 300);
}

function sureClick(choice, index) {
    console.log("🎯 محاولة الرهان على:", choice, "بمبلغ:", currentGold);
    console.log("📊 حالة النظام - status:", status, "countTime:", countTime);
    
    // ✅ التحقق من حالة النظام أولاً
    if (status !== 0) {
        console.log("❌ لا يمكن الرهان - status =", status);
        
        var message = "";
        if (status === 1) {
            message = info.lang == "ar" 
                ? "جاري السحب، انتظر حتى النهاية" 
                : "Drawing in progress, please wait";
        } else {
            message = info.lang == "ar" 
                ? "اللعبة غير جاهزة" 
                : "Game not ready";
        }
        
        showSuccess(message);
        return;
    }
    
    // ✅ التحقق من وقت الرهان
    if (countTime <= 0) {
        console.log("❌ انتهى وقت الرهان");
        showSuccess(info.lang == "ar" ? "انتهى وقت الرهان" : "Betting time ended");
        return;
    }
    
    let currentBalance = parseFloat($('.balanceCount').text());
    if (currentBalance < currentGold) {
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        console.log("❌ رصيد غير كافي:", currentBalance, "<", currentGold);
        return;
    }

    console.log("✅ جميع الشروط صحيحة، معالجة الرهان...");
    
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
            
            console.log("💰 رهان ناجح! الرهانات:", selectArr);
        } else if (res.code == 10062) {
            showSuccess(info.lang == "ar" ? "يرجى الشحن" : "Please recharge");
            $('.balanceCount').text(currentBalance.toFixed(2));
        } else {
            showSuccess(res.message || 'خطأ');
            $('.balanceCount').text(currentBalance.toFixed(2));
        }
    }).catch(function(error) {
        console.error("❌ خطأ في الرهان:", error);
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
    console.log("🔒 status = 1 (سحب قيد التنفيذ)");
    
    var rollCountdown = countTime;
    
    var rollCountTimer = setInterval(function() {
        rollCountdown--;
        $(".coutDown")[0].innerHTML = rollCountdown + "s";
        
        if (rollCountdown <= 0) {
            rollCountdown = 0;
            console.log("✅ انتهى السحب");
            
            // ✅ إيقاف جميع المؤقتات
            clearInterval(rollCountTimer);
            clearInterval(rollTimer);
            
            // ✅ إخفاء العناصر الرمادية
            for (var i = 0; i < $(".item .gray").length; i++) {
                $($(".item .gray")[i]).hide();
            }
            
            // ✅ الانتقال المباشر لمرحلة الرهان
            console.log("🔄 الانتقال لمرحلة الرهان...");
            
            // ✅ تعيين status = 0 مباشرة
            status = 0;
            console.log("🔓 status = 0 (جاهز للرهان)");
            
            // ✅ إعادة تعيين الوقت
            countTime = 10;
            
            // ✅ تحديث الواجهة مباشرة
            $(".title2").hide();
            $(".title1").show();
            $(".coutDown")[0].innerHTML = countTime + "s";
            
            // ✅ الحصول على معلومات الجولة الجديدة
            getInfo(round, false, true); // true يعني أن هذا بعد السحب
            
            // ✅ إظهار اليد مباشرة
            setTimeout(function() {
                showHand();
                console.log("👆 تم إظهار اليد بعد السحب");
            }, 500);
            
            return;
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
    
    // ✅ مؤتمر للحركة الدورانية
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
}

function bindEvent() {
    console.log("🔗 ربط أحداث اللعبة...");
    
    // معالج اختيار الرقاقة
    $(".clickArea .clickItem").click(function() {
        for (var i = 0; i < $(".clickItem").length; i++) {
            $($(".clickItem").removeClass("active"));
        }
        $(this).addClass("active");
        currentGold = goldList[$(this).data("index")];
        console.log("💰 تم اختيار المبلغ:", currentGold);
    });
    
    // معالج النقر على الفواكه
    for (var i = 0; i < 8; i++) {
        (function(index) {
            $(".item" + (index + 1)).on("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log("=== 🍎 نقر على فاكهة ===");
                console.log("📊 حالة النظام: status =", status);
                console.log("⏱️ الوقت المتبقي:", countTime);
                console.log("🔢 الفاكهة:", index);
                
                // ✅ فحص شامل للحالة
                if (status === 0 && countTime > 0) {
                    var choice = choiceList[index];
                    console.log("✅ بدء معالجة الرهان");
                    sureClick(choice, index);
                } else {
                    console.log("❌ لا يمكن الرهان الآن");
                    
                    var message = "";
                    if (status === 1) {
                        message = info.lang == "ar" 
                            ? "جاري السحب، انتظر قليلاً" 
                            : "Drawing in progress, please wait";
                    } else if (countTime <= 0) {
                        message = info.lang == "ar" 
                            ? "انتهى وقت الرهان" 
                            : "Betting time ended";
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
    
    console.log("✅ تم ربط الأحداث");
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
        
        console.log("📤 إرسال:", action);
        
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
        console.log("🏆 استجابة الترتيب:", res.code);
    }).catch(function(error) {
        console.error("❌ خطأ الترتيب:", error);
    });
}

function getInfo(_round, isChoice, afterRoll) {
    console.log("🔄 الحصول على معلومات، round:", _round, "afterRoll:", afterRoll);
    
    var params = {};
    if (_round) {
        params.round = _round;
    }
    
    callFlamingoApp('game_info', params).then(function(res) {
        console.log("📊 استجابة المعلومات:", res.code);
        
        if (res.code === 200 && res.data) {
            // ✅ تحديث المعلومات الأساسية
            $(".balanceCount")[0].innerHTML = parseFloat(res.data.gold).toFixed(2);
            $(".profitCount")[0].innerHTML = res.data.profit || 0;
            $(".round")[0].innerHTML = (info.lang == "ar" ? "جولة " : "Round ") + res.data.round;

            // ✅ تحديث رقم الجولة
            round = res.data.round;
            
            // ✅ إذا كان هذا بعد السحب مباشرة
            if (afterRoll) {
                console.log("🔄 تحديث بعد السحب");
                status = 0; // تأكيد أن status = 0
                countTime = res.data.countdown || 10;
                console.log("🔓 status = 0 بعد التحديث");
            }
            
            // ✅ إذا لم يكن اختياراً عادياً
            if (!isChoice) {
                countTime = res.data.countdown || 10;
                $(".coutDown")[0].innerHTML = countTime + "s";
                
                // ✅ إيقاف المؤقت السابق
                if (countTimer) {
                    clearInterval(countTimer);
                }
                
                // ✅ إذا كان وقت الرهان إيجابياً، بدء العد التنازلي
                if (countTime > 0) {
                    // ✅ التأكد من أن status = 0
                    status = 0;
                    console.log("🎯 بدء مرحلة الرهان - status = 0");
                    
                    // ✅ بدء العد التنازلي
                    countDown();
                } else {
                    console.log("⏰ لا وقت للرهان، الانتقال للسحب");
                    status = 1;
                    roll();
                }
            }

            // ✅ عرض النتيجة السابقة إن وجدت
            if (res.data.result && res.data.result != "") {
                $(".item" + searchGift(res.data.result)).addClass("active");
            }
            
            console.log("✅ تم التحديث، status:", status, "countTime:", countTime);
        } else {
            console.log("⚠️ استجابة غير متوقعة");
        }
    }).catch(function(error) {
        console.error("❌ خطأ في getInfo:", error);
        // ✅ في حالة الخطأ، التأكد من إمكانية النقر
        status = 0;
    });
}

function getBill() {
    callFlamingoApp('game_bill').then(function(res) {
        console.log("📋 استجابة السجل");
    }).catch(function(error) {
        console.error("❌ خطأ السجل:", error);
    });
}

function showSuccess(str) {
    console.log("💬 رسالة:", str);
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

// ✅ أداة تصحيح للتحقق من حالة النظام
function debugStatus() {
    console.log("=== 🔍 تصحيح حالة النظام ===");
    console.log("status:", status, "(", status === 0 ? "جاهز للرهان" : "جاري السحب", ")");
    console.log("countTime:", countTime, "ثانية");
    console.log("round:", round);
    console.log("selectCount:", selectCount);
    console.log("selectArr:", selectArr);
    console.log("currentGold:", currentGold);
    console.log("==========================");
}

// ✅ مؤقت للتحقق الدوري
setInterval(function() {
    if (countTime > 0 && status !== 0) {
        console.warn("⚠️ تحذير: countTime > 0 ولكن status ≠ 0");
        debugStatus();
    }
}, 2000);

console.log("🎉 تم تحميل اللعبة بنجاح! استخدم debugStatus() للتحقق من الحالة.");
