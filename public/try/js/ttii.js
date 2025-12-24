/**
 * لعبة عجلة الفواكه - نسخة كاملة وآمنة
 * إدارة الرهان، السحب، والنتائج مع حماية status
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
var status = 0; // 0=يمكن النقر, 1=جاري السحب
var currentGold = 1;

// معلومات اللاعب
var info = window.flamingoPlayerInfo || {
    uid: '',
    lang: 'en',
    nickname: '',
    avatar: '',
    credits: 0,
    diamonds: 0
};

// callbacks للطلبات المعلقة
var pendingRequests = {};
var requestIdCounter = 0;

console.log("Player Info:", info);

window.onFlamingoPlayerInfo = function(playerInfo) {
    info = playerInfo;
    console.log("Received player info:", info);
    init();
};

window.onFlamingoResponse = function(response) {
    var requestId = response.requestId;
    if (requestId && pendingRequests[requestId]) {
        var callback = pendingRequests[requestId];
        delete pendingRequests[requestId];
        if (response.success) callback.resolve(response.data);
        else callback.reject(response.error || 'Unknown error');
    }
};

$(document).ready(function() {
    if (window.flamingoPlayerInfo) info = window.flamingoPlayerInfo;
    setTimeout(init, 500);
});

function init() {
    status = 0; // يمكن النقر عند البداية
    moment.tz.setDefault("Asia/Riyadh");
    changeLang(info.lang || 'en');
    showHand();
    bindEvent();
    getInfo();
    getBill();
    getRank();
}

// عرض اليد المتحركة
function showHand() {
    count = 4;
    $(".hand").attr("class", "hand hand3").show();
    if (handTimer) clearInterval(handTimer);
    handTimer = setInterval(function() {
        $(".hand").removeClass("hand" + (count == 1 ? 8 : count - 1)).addClass("hand" + count);
        count++; if (count > 8) count = 1;
    }, 1000);
}
function hideHand() { $(".hand").hide(); }

// العد التنازلي قبل السحب
function countDown() {
    if (countTimer) clearInterval(countTimer);
    countTimer = setInterval(function() {
        countTime--;
        if (countTime <= 0) {
            clearInterval(countTimer);
            status = 1; // منع النقر أثناء السحب
            roll();
        }
        $(".coutDown")[0].innerHTML = countTime + "s";
    }, 1000);
}

// بدء السحب
function roll() {
    hideHand();
    selectCount = 0; selectArr = [];
    $(".title1").hide(); $(".title2").show();
    $(".coutDown")[0].innerHTML = countTime + "s";

    // إعادة تعيين العناصر
    for (var i = 0; i < $(".item .gray").length; i++) {
        $(".item" + (i+1) + " .selected div:nth-child(2) div")[0].innerHTML = 0;
        $(".item" + (i+1) + " .selected").hide();
        $(".item" + (i+1)).removeClass("active");
        $($(".item .gray")[i]).show();
    }

    rollCount = 0;
    $($(".item .gray")[rollCount]).hide();

    var rollCountdown = 5;
    if (rollTimer) clearInterval(rollTimer);
    rollTimer = setInterval(function() {
        rollCountdown--;
        for (var i = 0; i < $(".item .gray").length; i++) $($(".item .gray")[i]).show();
        rollCount++; if (rollCount > 7) rollCount = 0;
        $($(".item .gray")[rollCount]).hide();

        if (rollCountdown <= 0) {
            clearInterval(rollTimer);
            openDraw();
        }
    }, 100);
}

// إعادة تفعيل الرهان بعد السحب
function openDraw() {
    status = 0;
    $(".item .gray").show();
    getInfo(round);
}

// النقر على الفواكه للرهان
function bindEvent() {
    $(".clickArea .clickItem").click(function() {
        $(".clickItem").removeClass("active");
        $(this).addClass("active");
        currentGold = goldList[$(this).data("index")];
    });

    for (var i = 0; i < 8; i++) {
        (function(index) {
            $(".item" + (index + 1)).on("click", function(e) {
                e.preventDefault(); e.stopPropagation();
                if (status === 0) sureClick(choiceList[index], index);
                else showSuccess(info.lang=="ar"?"انتظر حتى نهاية الجولة":"Wait until the round ends");
            });
        })(i);
    }
}

// تنفيذ الرهان
function sureClick(choice,index){
    let currentBalance = parseFloat($('.balanceCount').text());
    if(currentBalance<currentGold){ showSuccess(info.lang=="ar"?"رصيد غير كافٍ!":"Insufficient balance!"); return; }
    $('.balanceCount').text((currentBalance-currentGold).toFixed(2));

    callFlamingoApp('game_choice',{choice:choice,gold:currentGold}).then(res=>{
        if(res.code==200){
            selectCount++; if(!selectArr.includes(choice)) selectArr.push(choice);
            var list=[6,7,8,1,2,3,4,5];
            var temp=$(`.item${list[index]} .selected div:nth-child(2) div`)[0].innerHTML;
            $(`.item${list[index]} .selected div:nth-child(2) div`)[0].innerHTML=parseInt(temp)+parseInt(currentGold);
            $(`.item${list[index]} .selected`).show();
            if(res.balance!==undefined) $('.balanceCount').text(parseFloat(res.balance).toFixed(2));
            sendToApp({action:'refreshBalance'});
        }else{
            showSuccess(res.message||"Error");
            $('.balanceCount').text(currentBalance.toFixed(2));
        }
    }).catch(err=>{
        showSuccess(info.lang=="ar"?"خطأ في النظام":"System Error");
        $('.balanceCount').text(currentBalance.toFixed(2));
    });
}

// استدعاء التطبيق
function callFlamingoApp(action, params){
    return new Promise((resolve,reject)=>{
        var requestId='req_'+(++requestIdCounter)+'_'+Date.now();
        pendingRequests[requestId]={resolve,reject};
        var message=JSON.stringify({action,requestId,params:params||{}});
        if(window.FlamingoApp) window.FlamingoApp.postMessage(message);
        else reject('FlamingoApp not available');
        setTimeout(()=>{ if(pendingRequests[requestId]){ delete pendingRequests[requestId]; reject('Request timeout'); }},30000);
    });
}
function sendToApp(data){ if(window.FlamingoApp) window.FlamingoApp.postMessage(JSON.stringify(data)); }

// جلب الرتب
function getRank(){ callFlamingoApp('game_rank').then(res=>{ if(res.code==200&&res.data){ /* عرض الرتب */ } }).catch(err=>console.error(err)); }

// جلب المعلومات
function getInfo(_round,isChoice){
    callFlamingoApp('game_info',_round?{round:_round}:{})
    .then(res=>{
        if(res.code===200 && res.data){
            $(".balanceCount")[0].innerHTML=parseFloat(res.data.gold).toFixed(2);
            $(".round")[0].innerHTML=(info.lang=="ar"?"جولة ":"Round ")+res.data.round;
            round=res.data.round;
            if(!isChoice){ countTime=res.data.countdown; status=0; countDown(); }
        }
    }).catch(err=>console.error(err));
}

// جلب الحسابات الأخيرة
function getBill(){ callFlamingoApp('game_bill').then(res=>console.log(res)).catch(err=>console.error(err)); }
function showSuccess(str){ $(".pop-success div")[0].innerHTML=str; $(".pop-success").show(); setTimeout(()=>{$(".pop-success").hide();},2000);}
function searchGift(choice){ return choiceList.indexOf(choice)+1; }
function changeLang(lang){ if(window.$.i18n) window.$.i18n.load(lang); }
