/**
 * لعبة عجلة الفواكه - نسخة مبسطة تعمل مباشرة
 */

var currentGold = 1;
var status = 0; // 0 يمكن النقر
var countTime = 30;
var round = 0;
var choiceList = ["g", "h", "a", "b", "c", "d", "e", "f"];
var goldList = [1, 10, 100, 1000, 10000];

// معلومات اللاعب
var info = window.flamingoPlayerInfo || {
    uid: '',
    lang: 'en',
    credits: 0
};

console.log("=== GAME LOADED ===");
console.log("Status:", status, "(0 = can click)");

// استلام معلومات اللاعب
window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("Player info received");
    startGame();
};

$(document).ready(function() {
    console.log("Document ready");
    
    // بدء اللعبة بعد 1 ثانية
    setTimeout(function() {
        startGame();
    }, 1000);
});

function startGame() {
    console.log("=== STARTING GAME ===");
    
    // إعادة تعيين
    status = 0;
    currentGold = 1;
    
    // ربط الأحداث
    bindSimpleEvents();
    
    // تحديث الرصيد
    updateBalance();
    
    // إضافة زر اختبار
    addTestButton();
    
    console.log("Game ready! Status:", status, "- You can click now!");
}

// دالة مبسطة لربط الأحداث
function bindSimpleEvents() {
    console.log("Binding events...");
    
    // إزالة الأحداث القديمة
    $(".item1, .item2, .item3, .item4, .item5, .item6, .item7, .item8").off('click');
    $(".clickItem").off('click');
    
    // ربط الكوينز
    $(".clickArea .clickItem").on('click', function() {
        var index = $(this).data("index") || 0;
        $(".clickItem").removeClass("active");
        $(this).addClass("active");
        currentGold = goldList[index] || 1;
        console.log("Selected gold:", currentGold);
    });
    
    // ربط الفواكه - أبسط طريقة ممكنة
    for (var i = 1; i <= 8; i++) {
        (function(fruitIndex) {
            var selector = ".item" + fruitIndex;
            
            $(selector).on('click', function(e) {
                e.stopPropagation();
                
                console.log("--- CLICK DETECTED ---");
                console.log("Fruit:", selector);
                console.log("Status:", status);
                console.log("Current gold:", currentGold);
                
                // تأكيد أنه يمكن النقر
                if (status === 0) {
                    // fruitIndex - 1 لأن المصفوفة تبدأ من 0
                    var choiceIndex = fruitIndex - 1;
                    if (choiceIndex >= 0 && choiceIndex < choiceList.length) {
                        var choice = choiceList[choiceIndex];
                        console.log("Will place bet on:", choice);
                        placeBet(choice, choiceIndex);
                    }
                } else {
                    console.log("Cannot click - status is:", status);
                    showMessage("Wait for next round");
                }
            });
            
            // إضافة مؤشر النقر
            $(selector).css('cursor', 'pointer');
            console.log("Bound click to:", selector);
        })(i);
    }
    
    console.log("All events bound successfully!");
}

// دالة مبسطة لوضع الرهان
function placeBet(choice, fruitIndex) {
    console.log("=== PLACING BET ===");
    console.log("Choice:", choice);
    console.log("Fruit index:", fruitIndex);
    console.log("Gold amount:", currentGold);
    
    // الحصول على الرصيد الحالي
    var currentBalance = parseFloat($('.balanceCount').text()) || 0;
    console.log("Current balance:", currentBalance);
    
    // التحقق من الرصيد
    if (currentBalance < currentGold) {
        showMessage("Insufficient balance");
        return;
    }
    
    // تحديث الرصيد مؤقتاً (محاكاة)
    var newBalance = currentBalance - currentGold;
    $('.balanceCount').text(newBalance.toFixed(2));
    
    // تحديث العرض على الفاكهة
    updateFruitDisplay(fruitIndex, currentGold);
    
    // إرسال الرهان للتطبيق
    sendBetToApp(choice, currentGold, currentBalance);
}

// تحديث عرض الفاكهة
function updateFruitDisplay(fruitIndex, goldAmount) {
    // تحويل الفهرس إلى ترتيب العرض
    var displayIndex = [6, 7, 8, 1, 2, 3, 4, 5][fruitIndex];
    var selector = `.item${displayIndex} .selected div:nth-child(2) div`;
    
    var element = $(selector);
    if (element.length > 0) {
        var currentBet = parseInt(element.text()) || 0;
        element.text(currentBet + goldAmount);
        $(`.item${displayIndex} .selected`).show();
        console.log("Updated display for fruit", displayIndex);
    }
}

// إرسال الرهان للتطبيق
function sendBetToApp(choice, gold, oldBalance) {
    console.log("Sending bet to app...");
    
    callFlamingoApp('game_choice', {
        choice: choice,
        gold: gold
    }).then(function(response) {
        console.log("Bet response:", response);
        
        if (response.code === 200) {
            // تحديث الرصيد من الاستجابة
            if (response.balance !== undefined) {
                $('.balanceCount').text(parseFloat(response.balance).toFixed(2));
            }
            
            showMessage("Bet successful!");
            console.log("Bet placed successfully!");
        } else {
            // إذا فشل، أعد الرصيد
            $('.balanceCount').text(oldBalance.toFixed(2));
            
            if (response.code === 10062) {
                showMessage("Insufficient credits");
            } else {
                showMessage(response.message || "Error");
            }
        }
    }).catch(function(error) {
        console.error("Bet error:", error);
        // أعد الرصيد في حالة الخطأ
        $('.balanceCount').text(oldBalance.toFixed(2));
        showMessage("System error");
    });
}

// دالة الاتصال بالتطبيق
function callFlamingoApp(action, params) {
    return new Promise(function(resolve, reject) {
        var requestId = 'req_' + Date.now();
        
        var message = JSON.stringify({
            action: action,
            requestId: requestId,
            params: params || {}
        });
        
        console.log("Sending:", message);
        
        // إرسال للتطبيق
        if (window.FlamingoApp) {
            // إعداد استقبال الرد
            var responseHandler = function(event) {
                try {
                    var response = JSON.parse(event.data);
                    if (response.requestId === requestId) {
                        window.removeEventListener('message', responseHandler);
                        resolve(response.data);
                    }
                } catch(e) {
                    // تجاهل الرسائل الأخرى
                }
            };
            
            window.addEventListener('message', responseHandler);
            window.FlamingoApp.postMessage(message);
            
            // Timeout
            setTimeout(function() {
                window.removeEventListener('message', responseHandler);
                reject('Timeout');
            }, 10000);
        } else {
            reject('FlamingoApp not available');
        }
    });
}

// تحديث الرصيد
function updateBalance() {
    console.log("Updating balance...");
    
    callFlamingoApp('game_info', {}).then(function(response) {
        if (response.code === 200 && response.data) {
            $('.balanceCount').text(parseFloat(response.data.gold).toFixed(2));
            $('.profitCount').text(response.data.profit || 0);
            round = response.data.round;
            
            // تحديث الوقت
            countTime = response.data.countdown || 30;
            $('.coutDown').text(countTime + 's');
            
            console.log("Balance updated:", response.data.gold);
            console.log("Round:", round);
            console.log("Countdown:", countTime);
        }
    }).catch(function(error) {
        console.error("Balance update error:", error);
    });
}

// إضافة زر اختبار
function addTestButton() {
    if ($('#testBet').length === 0) {
        var buttonHtml = '<div id="testBet" style="position:fixed; top:50px; left:10px; z-index:9999; background:#4CAF50; color:white; padding:10px; border-radius:5px; cursor:pointer; font-size:14px; box-shadow:0 2px 5px rgba(0,0,0,0.2);">Test Bet on Fruit 1</div>';
        $('body').append(buttonHtml);
        
        $('#testBet').click(function() {
            console.log("=== TEST BUTTON CLICKED ===");
            console.log("Status:", status);
            console.log("Current gold:", currentGold);
            
            if (status === 0) {
                // اختبار الرهان على الفاكهة الأولى
                placeBet("g", 0); // choice "g" هو الفاكهة الأولى
            } else {
                showMessage("Cannot bet now");
            }
        });
    }
}

// عرض رسالة
function showMessage(msg) {
    console.log("Message:", msg);
    
    // استخدام popup الموجود أو إنشاء واحد
    var popup = $(".pop-success");
    if (popup.length === 0) {
        // إنشاء popup إذا لم يكن موجوداً
        $('body').append('<div class="pop-success" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:white; padding:20px; border-radius:10px; z-index:10000; display:none;"><div style="font-size:16px;"></div></div>');
        popup = $(".pop-success");
    }
    
    popup.find('div').text(msg);
    popup.show();
    
    setTimeout(function() {
        popup.hide();
    }, 2000);
}

// فحص عناصر الفواكه
function checkFruits() {
    console.log("=== CHECKING FRUITS ===");
    
    var found = 0;
    for (var i = 1; i <= 8; i++) {
        if ($(".item" + i).length > 0) {
            found++;
            console.log("✓ Found: .item" + i);
        } else {
            console.log("✗ Missing: .item" + i);
        }
    }
    
    console.log("Found " + found + "/8 fruit elements");
    return found === 8;
}

// عندما ينتهي تحميل الصفحة بالكامل
$(window).on('load', function() {
    console.log("Page fully loaded");
    
    // فحص العناصر
    checkFruits();
    
    // تأكيد ربط الأحداث مرة أخرى
    setTimeout(function() {
        bindSimpleEvents();
    }, 500);
});

// إضافة زر إصلاح
setTimeout(function() {
    if ($('#fixAll').length === 0) {
        var fixButton = '<div id="fixAll" style="position:fixed; bottom:20px; right:20px; z-index:9999; background:#FF9800; color:white; padding:12px 15px; border-radius:50%; cursor:pointer; font-size:16px; box-shadow:0 3px 10px rgba(0,0,0,0.3);">Fix</div>';
        $('body').append(fixButton);
        
        $('#fixAll').click(function() {
            console.log("=== FIXING EVERYTHING ===");
            status = 0;
            bindSimpleEvents();
            updateBalance();
            showMessage("Game fixed - try clicking!");
        });
    }
}, 1500);
