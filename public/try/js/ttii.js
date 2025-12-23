/**
 * لعبة عجلة الفواكه - نسخة مبسطة جداً
 */

// متغيرات اللعبة
var countTime = 40;
var round = 0;
var status = 0; // 0 يمكن النقر, 1 لا يمكن النقر
var currentGold = 1;
var countTimer = null;
var handTimer = null;

// قائمة الذهب
var goldList = [1, 10, 100, 1000, 10000];

// قائمة الفواكه
var choiceList = ["g", "h", "a", "b", "c", "d", "e", "f"];

$(document).ready(function() {
    console.log("Game loaded");
    initGame();
});

function initGame() {
    console.log("Initializing game");
    
    // إعادة تعيين الحالة
    status = 0;
    
    // ربط الأحداث
    bindEvents();
    
    // بدء العد التنازلي التجريبي
    startCountdown();
    
    // عرض اليد
    showHand();
}

function bindEvents() {
    console.log("Binding events");
    
    // ربط النقر على مبالغ الذهب
    $('.clickItem').off('click').on('click', function() {
        console.log("Gold clicked:", $(this).data('index'));
        $('.clickItem').removeClass('active');
        $(this).addClass('active');
        var index = $(this).data('index');
        currentGold = goldList[index];
        console.log("Current gold:", currentGold);
    });
    
    // ربط النقر على الفواكه
    $('.item').off('click').on('click', function() {
        console.log("Fruit clicked");
        
        if (status !== 0) {
            console.log("Cannot click now, status:", status);
            showMessage("Betting time ended!");
            return;
        }
        
        // الحصول على رقم الفاكهة
        var className = $(this).attr('class');
        var match = className.match(/item(\d+)/);
        if (!match) return;
        
        var itemNumber = parseInt(match[1]);
        console.log("Item number:", itemNumber);
        
        // حساب index الفاكهة (0-7)
        var fruitIndex = itemNumber - 1;
        var choice = choiceList[fruitIndex];
        
        // وضع الرهان
        placeBet(choice, fruitIndex, itemNumber);
    });
    
    // ربط الأزرار الأخرى
    $('.btn.records').click(function() {
        showMessage("Records feature coming soon!");
    });
    
    $('.btn.rule').click(function() {
        showMessage("Game rules shown!");
        $('.ruleBg').show();
    });
    
    $('.btn.rank').click(function() {
        showMessage("Ranking feature coming soon!");
    });
    
    // إغلاق قواعد اللعبة
    $('.ruleContent img').click(function() {
        $('.ruleBg').hide();
    });
}

function placeBet(choice, fruitIndex, itemNumber) {
    console.log("Placing bet:", choice, "gold:", currentGold);
    
    // التحقق من الرصيد
    var balance = parseFloat($('.balanceCount').text());
    if (balance < currentGold) {
        showMessage("Insufficient balance!");
        return;
    }
    
    // تحديث الرصيد
    var newBalance = balance - currentGold;
    $('.balanceCount').text(newBalance.toFixed(2));
    
    // تحديث عرض الفاكهة
    var selectedDiv = $('.item' + itemNumber + ' .selected');
    var amountDiv = selectedDiv.find('div:nth-child(2) div');
    var currentAmount = parseInt(amountDiv.text()) || 0;
    var newAmount = currentAmount + currentGold;
    amountDiv.text(newAmount);
    selectedDiv.show();
    
    // إظهار رسالة النجاح
    showMessage("Bet placed successfully!");
    
    // في الواقع، هنا يجب إرسال الطلب إلى الخادم
    // ولكن لأغراض العرض، سنستخدم بيانات وهمية
    console.log("Bet placed on", choice, "with", currentGold, "gold");
}

function startCountdown() {
    console.log("Starting countdown");
    
    if (countTimer) {
        clearInterval(countTimer);
    }
    
    countTime = 40; // 40 ثانية كما في القواعد
    
    countTimer = setInterval(function() {
        countTime--;
        $('.coutDown').text(countTime + 's');
        
        // عند انتهاء الوقت
        if (countTime <= 0) {
            clearInterval(countTimer);
            status = 1; // منع النقر
            console.log("Betting time ended, status:", status);
            
            // عرض رسالة انتهاء الوقت
            showMessage("Betting time ended! Calculating results...");
            
            // محاكاة حساب النتائج
            setTimeout(function() {
                calculateResults();
            }, 2000);
        }
    }, 1000);
}

function calculateResults() {
    console.log("Calculating results");
    
    // اختيار فاكهة عشوائية كفائز
    var randomIndex = Math.floor(Math.random() * 8);
    var winningFruit = choiceList[randomIndex];
    var winningItem = [6, 7, 8, 1, 2, 3, 4, 5][randomIndex];
    
    console.log("Winning fruit:", winningFruit, "item:", winningItem);
    
    // إظهار الفائز
    $('.item').removeClass('active');
    $('.item' + winningItem).addClass('active');
    
    // تحديث قائمة النتائج
    updateResultList(winningItem);
    
    // إظهار نتيجة الجولة
    showRoundResult(winningItem);
    
    // إعادة تعيين الرهانات بعد 5 ثواني
    setTimeout(function() {
        resetBets();
        startNewRound();
    }, 5000);
}

function updateResultList(winningItem) {
    var giftList = $('.giftList');
    var newItem = $('<div class="giftItem"><img src="https://parse-server-example-o1ht.onrender.com/try/images/gift_' + winningItem + '.png" alt=""><img src="https://parse-server-example-o1ht.onrender.com/try/images/new.png" alt=""></div>');
    
    // إضافة النتيجة الجديدة في البداية
    giftList.prepend(newItem);
    
    // الحد من عدد النتائج المعروضة
    if (giftList.children().length > 10) {
        giftList.children().last().remove();
    }
}

function showRoundResult(winningItem) {
    // زيادة رقم الجولة
    round++;
    $('.round').text('Round ' + round);
    
    // إظهار رسالة النتيجة
    $('.rewordNo .roundWord').text('The result of ' + (round - 1) + ' round:');
    $('.rewordNo .noPrize1 img').attr('src', 'https://parse-server-example-o1ht.onrender.com/try/images/gift_' + winningItem + '.png');
    $('.rewordNo').show();
    
    // إخفاء الرسالة بعد 5 ثواني
    setTimeout(function() {
        $('.rewordNo').hide();
    }, 5000);
}

function resetBets() {
    console.log("Resetting bets");
    
    // إخفاء جميع الرهانات
    $('.item .selected').hide();
    $('.item .selected div:nth-child(2) div').text('0');
    $('.item').removeClass('active');
}

function startNewRound() {
    console.log("Starting new round");
    
    // إعادة تعيين الحالة للسماح بالنقر
    status = 0;
    
    // إعادة تعيين العد التنازلي
    startCountdown();
    
    // إظهار اليد
    showHand();
}

function showHand() {
    console.log("Showing hand");
    
    var count = 4;
    $(".hand").attr("class", "hand hand3").show();
    
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

function showMessage(msg) {
    console.log("Showing message:", msg);
    $(".pop-success div").text(msg);
    $(".pop-success").show();
    setTimeout(function() {
        $(".pop-success").hide();
    }, 2000);
}

// تهيئة البيانات الأولية
function initializeData() {
    // تعيين رصيد أولي
    $('.balanceCount').text('1000.00');
    $('.profitCount').text('0.00');
    $('.round').text('Round 0');
    
    // تعيين الذهب الافتراضي
    currentGold = 1;
    $('.clickItem').removeClass('active');
    $('.clickItem[data-index="0"]').addClass('active');
}

// بدء اللعبة عند تحميل الصفحة
setTimeout(function() {
    initializeData();
    initGame();
}, 1000);
