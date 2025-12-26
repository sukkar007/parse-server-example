/**
 * لعبة عجلة الفواكه - نسخة Parse Server
 * الاتصال الآمن مع Parse Cloud Functions
 */

// معلومات اللاعب
var info = {
    uid: '',
    token: '',
    lang: 'en',
    nickname: '',
    avatar: '',
    credits: 0,
    diamonds: 0
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

// تحقق من بيئة التطبيق
var env = (function() {
    var ua = navigator.userAgent;
    var testProd = ['127.0.0.1', 'localhost'];
    var isProd = !testProd.some(function(item) {
        return window.location.host.indexOf(item) > -1;
    });
    
    return {
        isProd,
        ios: !!ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/),
        android: ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1,
        app: window.Parse && window.Parse.User.current() ? true : false
    };
})();

// استلام معلومات اللاعب من Parse
function getParseUserInfo() {
    var currentUser = Parse.User.current();
    if (currentUser) {
        info.uid = currentUser.id;
        info.token = currentUser.getSessionToken();
        info.nickname = currentUser.get('name') || currentUser.get('username');
        info.avatar = currentUser.get('avatar') ? currentUser.get('avatar').url() : '';
        info.credits = currentUser.get('credit') || 0;
        info.diamonds = currentUser.get('diamonds') || 0;
        
        // إعادة تعيين اللغة
        var userLang = currentUser.get('language') || 'en';
        info.lang = ['en', 'ar', 'in', 'yn'].includes(userLang) ? userLang : 'en';
        
        console.log("Parse User Info:", info);
        return true;
    }
    return false;
}

// تهيئة التطبيق
$(document).ready(function() {
    console.log("Document ready - Parse Version");
    
    // تهيئة Parse
    if (window.Parse) {
        Parse.initialize("YOUR_APP_ID", "YOUR_JAVASCRIPT_KEY");
        Parse.serverURL = "YOUR_PARSE_SERVER_URL";
        
        // تحقق من حالة تسجيل الدخول
        if (getParseUserInfo()) {
            init();
        } else {
            // إذا لم يكن المستخدم مسجل الدخول
            console.error("User not logged in");
            showSuccess("Please login first");
            
            // إعادة التوجيه إلى صفحة تسجيل الدخول بعد 2 ثانية
            setTimeout(function() {
                window.location.href = "/login.html";
            }, 2000);
        }
    } else {
        console.error("Parse SDK not loaded");
    }
});

function init() {
    console.log("Initializing game with Parse...");
    moment.tz.setDefault("Asia/Riyadh");
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
    // التحقق من الرصيد
    let currentBalance = parseFloat($('.balanceCount').text());
    if (currentBalance < currentGold) {
        showSuccess(info.lang == "ar" ? "رصيد غير كافٍ!" : "Insufficient balance!");
        return;
    }

    // تحديث الرصيد مؤقتاً
    $('.balanceCount').text((currentBalance - currentGold).toFixed(2));

    // إرسال الطلب إلى Parse Cloud Function
    Parse.Cloud.run('game_choice', {
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

            // تحديث الرصيد من الاستجابة
            if (res.balance !== undefined) {
                $('.balanceCount').text(parseFloat(res.balance).toFixed(2));
                updateUserBalance(res.balance);
            }
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

// تحديث رصيد المستخدم في Parse
function updateUserBalance(newBalance) {
    var currentUser = Parse.User.current();
    if (currentUser) {
        currentUser.set('credit', newBalance);
        currentUser.save().then(function() {
            console.log("User balance updated to:", newBalance);
        }).catch(function(error) {
            console.error("Failed to update user balance:", error);
        });
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

function bindEvent() {
    // أحداث اختيار قيمة الذهب
    $(".clickArea .clickItem").click(function() {
        $(".clickItem").removeClass("active");
        $(this).addClass("active");
        currentGold = goldList[$(this).data("index")];
        console.log("Selected gold:", currentGold);
    });
    
    // أحداث النقر على الفواكه
    for (var i = 0; i < 8; i++) {
        (function(index) {
            $(".item" + (index + 1)).click(function() {
                if (status === 0) {
                    var choice = choiceList[index];
                    sureClick(choice, index);
                }
            });
        })(i);
    }
    
    // أحداث الأزرار الجانبية
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
}

function getInfo(_round, isChoice) {
    console.log("Getting game info from Parse...");
    
    var params = {};
    if (_round) {
        params.round = _round;
    }
    
    Parse.Cloud.run('game_info', params).then(function(res) {
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
            $(".balanceCount")[0].innerHTML = parseFloat(res.data.gold).toFixed(2);
            $(".profitCount")[0].innerHTML = res.data.profit || 0;
            $(".round")[0].innerHTML = (info.lang == "ar" ? "جولة " : "Round ") + res.data.round;

            if (status == 1 && isChoice) return;
            round = res.data.round;

            if (!isChoice) {
                countTime = res.data.countdown;
                $(".coutDown")[0].innerHTML = countTime + "s";
                
                if (countTimer) clearInterval(countTimer);
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
                    $(".item" + searchGift(ak[i]) + " .selected div:nth-child(2) div")[0].innerHTML = vk[i];
                    $(".item" + searchGift(ak[i]) + " .selected").show();
                }
            } else {
                for (var i = 0; i < $(".item .gray").length; i++) {
                    $(".item" + (i + 1) + " .selected div:nth-child(2) div")[0].innerHTML = 0;
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
                    $(".rewordNo .roundWord").html("جولة " + (round - 1) + " النتيجة");
                } else {
                    $(".rewordNo .roundWord").html("The result of " + (round - 1) + " round:");
                }
                
                resultTimer = setInterval(function() {
                    resultCount--;
                    if (resultCount < 0) {
                        resultCount = 5;
                        clearInterval(resultTimer);
                        $(".rewordNo").hide();
                    }
                    $(".rewordNo .reword_content .countDown")[0].innerHTML = resultCount + "s";
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
    Parse.Cloud.run('game_bill', {}).then(function(res) {
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

function getRank() {
    Parse.Cloud.run('game_rank', {}).then(function(res) {
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
