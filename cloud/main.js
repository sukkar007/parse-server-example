
const OneSignal = require('@onesignal/node-onesignal');
import Parse from 'parse/node.js';

// OneSignal config
const app_id = "7dec5bab-5550-4977-af9d-563e58d64721";
const user_key_token = "os_v2_app_pxwfxk2vkbexpl45ky7frvsheejjt5vfgk2udcetlfdjqmpkgmuxzghyhf3dzqm5njoioddsruaoqezy6n7puoxdohswdeanxdc32qa";
const rest_api_key = "os_v2_app_pxwfxk2vkbexpl45ky7frvsheejjt5vfgk2udcetlfdjqmpkgmuxzghyhf3dzqm5njoioddsruaoqezy6n7puoxdohswdeanxdc32qa";

const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;

const configuration = OneSignal.createConfiguration({
  userAuthKey: user_key_token,
  restApiKey: rest_api_key,
});
const client = new OneSignal.DefaultApi(configuration);
export async function setFullPermissions() {
  const classes = ['Posts', 'Comments', 'Streaming', 'User', 'Installation']; // ضع كل الكلاسات هنا

  for (const className of classes) {
    const schema = new Parse.Schema(className);
    try {
      await schema.get(); // تحقق إذا الكلاس موجود
      await schema.update({
        classLevelPermissions: {
          find: { '*': true },
          get: { '*': true },
          create: { '*': true },
          update: { '*': true },
          delete: { '*': true },
          addField: { '*': true },
        },
      });
    } catch (e) {
      // إذا لم يكن موجود، إنشاء الكلاس مع الصلاحيات
      await schema.save({
        classLevelPermissions: {
          find: { '*': true },
          get: { '*': true },
          create: { '*': true },
          update: { '*': true },
          delete: { '*': true },
          addField: { '*': true },
        },
      });
    }
  }
}

// استدعاء الدالة في cloud/main.js عند تشغيل السيرفر
setFullPermissions().then(() => console.log('CLPs set for all classes'));
//////////////////////////////////////////////////////////
// Send Push Notification
//////////////////////////////////////////////////////////
Parse.Cloud.define('sendPush', async (request) => {

  var userQuery = new Parse.Query(Parse.User);

  if(request.params.type == "live"){

    userQuery.containedIn("objectId", request.params.followers);
  } else {

    userQuery.equalTo("objectId", request.params.receiverId);
  }

  var pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.matchesQuery('user', userQuery);

  const notification = new OneSignal.Notification();
  notification.app_id = app_id;
  notification.headings = { en: request.params.title};  
  notification.contents = { en: request.params.alert};
  notification.large_icon = request.params.avatar;
  notification.big_picture = request.params.big_picture;
  notification.target_channel = "Push";
  notification.include_aliases = {
    external_id: [request.params.receiverId]
  };  
  notification.data = {
    view: request.params.view,
    alert: request.params.alert,
    senderId: request.params.senderId,
    senderName: request.params.senderName,
    type: request.params.type,
    chat: request.params.chat,
    avatar: request.params.avatar,
    objectId: request.params.objectId,
  };  

  return client.createNotification(notification)
    .then(function () {
      // Push sent!
      console.log("Push successfully");
      return "sent";
    }, function (error) {
      // There was a problem :(
        console.log("Push Got an error " + error.code + " : " + error.message);
        return Promise.reject(error);
    });
});

//////////////////////////////////////////////////////////
// Update Password
//////////////////////////////////////////////////////////
Parse.Cloud.define("updatePassword", async (request) => {
  const { username, password } = request.params;

  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo("username", username);

  const user = await userQuery.first({ useMasterKey: true });
  if (!user) throw "User not found";

  user.set("password", password);
  user.set("secondary_password", password);
  await user.save(null, { useMasterKey: true });

  return "updated";
});

//////////////////////////////////////////////////////////
// Send Gift
//////////////////////////////////////////////////////////
Parse.Cloud.define("send_gift", async (request) => {
  const { objectId, credits } = request.params;

  const user = await new Parse.Query(Parse.User).get(objectId, { useMasterKey: true });

  user.increment("diamonds", credits);
  user.increment("diamondsTotal", credits);

  await user.save(null, { useMasterKey: true });
  return "updated";
});

//////////////////////////////////////////////////////////
// Send Agency Gift
//////////////////////////////////////////////////////////
Parse.Cloud.define("send_agency", async (request) => {
  const { objectId, credits } = request.params;

  const user = await new Parse.Query(Parse.User).get(objectId, { useMasterKey: true });

  user.increment("diamondsAgency", credits);
  user.increment("diamondsAgencyTotal", credits);

  await user.save(null, { useMasterKey: true });
  return "updated";
});

//////////////////////////////////////////////////////////
// Check phone number
//////////////////////////////////////////////////////////
Parse.Cloud.define("check_phone_number", async (request) => {
  const phone = request.params.phone_number;

  const user = await new Parse.Query(Parse.User)
    .equalTo("phone_number_full", phone)
    .first({ useMasterKey: true });

  if (user) throw new Parse.Error(100, "Phone exists");
  return "ok";
});

//////////////////////////////////////////////////////////
// Restart PK Battle
//////////////////////////////////////////////////////////
Parse.Cloud.define("restartPkBattle", async (request) => {
  const { liveChannel, times } = request.params;

  const live = await new Parse.Query("Streaming")
    .equalTo("streaming_channel", liveChannel)
    .equalTo("streaming", true)
    .equalTo("battle_status", "battle_alive")
    .first();

  if (!live) throw "Streaming not found";

  live.set("his_points", 0);
  live.set("my_points", 0);
  live.set("repeat_battle_times", times);

  await live.save();
});

//////////////////////////////////////////////////////////
// Save his battle points
//////////////////////////////////////////////////////////
Parse.Cloud.define("save_hisBattle_points", async (request) => {
  const { points, liveChannel } = request.params;

  const live = await new Parse.Query("Streaming")
    .equalTo("streaming_channel", liveChannel)
    .equalTo("streaming", true)
    .equalTo("battle_status", "battle_alive")
    .first();

  if (!live) throw "Streaming not found";

  live.set("his_points", points);
  await live.save();
});

//////////////////////////////////////////////////////////
// Follow user
//////////////////////////////////////////////////////////
Parse.Cloud.define("follow_user", async (request) => {
  const { authorId, receiverId } = request.params;

  const author = await new Parse.Query(Parse.User).get(authorId, { useMasterKey: true });
  const receiver = await new Parse.Query(Parse.User).get(receiverId, { useMasterKey: true });

  author.addUnique("following", receiverId);
  receiver.addUnique("followers", authorId);

  await author.save(null, { useMasterKey: true });
  await receiver.save(null, { useMasterKey: true });

  return author;
});

//////////////////////////////////////////////////////////
// Unfollow user
//////////////////////////////////////////////////////////
Parse.Cloud.define("unfollow_user", async (request) => {
  const { authorId, receiverId } = request.params;

  const author = await new Parse.Query(Parse.User).get(authorId, { useMasterKey: true });
  const receiver = await new Parse.Query(Parse.User).get(receiverId, { useMasterKey: true });

  author.remove("following", receiverId);
  receiver.remove("followers", authorId);

  await author.save(null, { useMasterKey: true });
  await receiver.save(null, { useMasterKey: true });

  return author;
});

//////////////////////////////////////////////////////////
// RevenueCat verify + add coins
//////////////////////////////////////////////////////////
Parse.Cloud.define("verifyAndAddCoins", async (request) => {
  const { userId, productId, transactionId, purchaseDate } = request.params;

  const user = request.user;
  if (!user || user.id !== userId) {
    throw new Parse.Error(209, "Unauthorized");
  }

  const PaymentsModel = Parse.Object.extend("PaymentsModel");

  const exists = await new Parse.Query(PaymentsModel)
    .equalTo("transactionId", transactionId)
    .first({ useMasterKey: true });

  if (exists) throw new Parse.Error(141, "Duplicate transaction");

  const url = `https://api.revenuecat.com/v1/subscribers/${userId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${REVENUECAT_API_KEY}` }
  });

  if (!res.ok) throw new Parse.Error(141, "RevenueCat error");

  const data = await res.json();

  const transactions = data.subscriber?.non_subscriptions?.[productId] || [];
  const verifiedTx = transactions.find(tx => tx.id === transactionId);

  if (!verifiedTx) throw new Parse.Error(141, "Invalid transaction");

  const match = productId.match(/flamingo\.(\d+)\.credits/);
  if (!match) throw new Parse.Error(141, "Invalid product format");

  const coins = parseInt(match[1], 10);

  user.set("credit", (user.get("credit") || 0) + coins);
  await user.save(null, { useMasterKey: true });

  const payment = new PaymentsModel();
  payment.set("author", user);
  payment.set("authorId", userId);
  payment.set("transactionId", transactionId);
  payment.set("productId", productId);
  payment.set("coins", coins);
  payment.set("purchaseDate", purchaseDate);
  payment.set("paymentType", "coins");
  payment.set("status", "completed");

  await payment.save(null, { useMasterKey: true });

  return { success: true, coinsAdded: coins, userId };
});

//////////////////////////////////////////////////////////
// Before Login Hook
//////////////////////////////////////////////////////////
Parse.Cloud.beforeLogin(async (request) => {
  const user = request.object;

  if (user.get("accountDeleted")) {
    throw new Parse.Error(340, "Account Deleted");
  }

  if (user.get("activationStatus")) {
    throw new Parse.Error(341, "Access denied, you have been blocked.");
  }
});


//////////////////////////////////////////////////////////
// =================== GAMES API ===================
//////////////////////////////////////////////////////////

// إعدادات اللعبة
const ROUND_DURATION = 30; // مدة الجولة بالثواني
const FRUIT_MULTIPLIERS = {
  'g': 2,
  'h': 3,
  'a': 1.5,
  'b': 2.5,
  'c': 4,
  'd': 3.5,
  'e': 2,
  'f': 5,
};

const FRUIT_MAP = {
  6: 'g',
  7: 'h',
  8: 'a',
  1: 'b',
  2: 'c',
  3: 'd',
  4: 'e',
  5: 'f',
};

//////////////////////////////////////////////////////////
// جدولة إنشاء نتائج الجولة
//////////////////////////////////////////////////////////
async function createRoundResult(roundNumber) {
  const FerrisWheelResults = Parse.Object.extend("FerrisWheelResults");
  
  // التحقق إذا كانت النتيجة موجودة مسبقاً
  const existingQuery = new Parse.Query(FerrisWheelResults);
  existingQuery.equalTo("round", roundNumber);
  const existing = await existingQuery.first({ useMasterKey: true });
  
  if (!existing) {
    // اختيار فاكهة عشوائية
    const fruitKeys = Object.keys(FRUIT_MAP);
    const winningNumber = fruitKeys[Math.floor(Math.random() * fruitKeys.length)];
    const winningFruit = FRUIT_MAP[winningNumber];
    
    // تسجيل النتيجة
    const newResult = new FerrisWheelResults();
    newResult.set("round", roundNumber);
    newResult.set("result", winningFruit);
    newResult.set("createdAt", new Date());
    await newResult.save(null, { useMasterKey: true });
    
    console.log(`Created result for round ${roundNumber}: ${winningFruit}`);
    
    return winningFruit;
  }
  
  return existing.get("result");
}

//////////////////////////////////////////////////////////
// حساب أرباح الجولة
//////////////////////////////////////////////////////////
async function processRoundWinnings(roundNumber, winningFruit) {
  const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
  
  // جلب جميع الرهانات على الفاكهة الرابحة
  const winningBetsQuery = new Parse.Query(FerrisWheelChoices);
  winningBetsQuery.equalTo("round", roundNumber);
  winningBetsQuery.equalTo("choice", winningFruit);
  const winningBets = await winningBetsQuery.find({ useMasterKey: true });
  
  console.log(`Processing ${winningBets.length} winning bets for round ${roundNumber}, fruit: ${winningFruit}`);
  
  const topWinners = [];
  
  for (const bet of winningBets) {
    const userId = bet.get("userId");
    const betGold = bet.get("gold") || 0;
    
    if (betGold > 0) {
      const winAmount = Math.floor(betGold * FRUIT_MULTIPLIERS[winningFruit]);
      
      try {
        const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
        if (user) {
          user.increment("credit", winAmount);
          user.increment("gameProfit", winAmount);
          await user.save(null, { useMasterKey: true });
          
          // إضافة للقائمة العليا
          topWinners.push({
            userId: userId,
            avatar: user.get("avatar")?.url() || "",
            nick: user.get("name") || user.get("username") || "User",
            total: winAmount,
          });
          
          console.log(`User ${userId} won ${winAmount} credits`);
        }
      } catch (error) {
        console.error(`Error processing win for user ${userId}:`, error);
      }
    }
  }
  
  // ترتيب الفائزين حسب المبلغ
  topWinners.sort((a, b) => b.total - a.total);
  
  return topWinners.slice(0, 3); // أعلى 3 فائزين
}

//////////////////////////////////////////////////////////
// جلب معلومات اللعبة والجولة الحالية
//////////////////////////////////////////////////////////
Parse.Cloud.define("game_info", async (request) => {
  const user = request.user;
  if (!user) {
    throw new Parse.Error(209, "User not authenticated");
  }

  const userId = user.id;
  
  // حساب الجولة الحالية
  const currentTime = Math.floor(Date.now() / 1000);
  const currentRound = Math.floor(currentTime / ROUND_DURATION);
  const roundStartTime = currentRound * ROUND_DURATION;
  const roundEndTime = roundStartTime + ROUND_DURATION;
  const countdown = Math.max(0, roundEndTime - currentTime);
  
  console.log(`Current time: ${currentTime}, Round: ${currentRound}, Countdown: ${countdown}s`);

  // جلب بيانات المستخدم
  await user.fetch({ useMasterKey: true });
  const userCredits = user.get("credit") || 0;
  const userProfit = user.get("gameProfit") || 0;

  // إنشاء نتيجة للجولة السابقة إذا انتهت
  if (countdown === ROUND_DURATION) {
    // لقد بدأت جولة جديدة، معالجة الجولة السابقة
    const previousRound = currentRound - 1;
    
    // التحقق من وجود نتيجة الجولة السابقة
    const FerrisWheelResults = Parse.Object.extend("FerrisWheelResults");
    const previousResultQuery = new Parse.Query(FerrisWheelResults);
    previousResultQuery.equalTo("round", previousRound);
    let previousResult = await previousResultQuery.first({ useMasterKey: true });
    
    if (!previousResult) {
      // إنشاء نتيجة للجولة السابقة
      const winningFruit = await createRoundResult(previousRound);
      // معالجة الأرباح
      await processRoundWinnings(previousRound, winningFruit);
    }
  }

  // جلب نتيجة الجولة السابقة
  const FerrisWheelResults = Parse.Object.extend("FerrisWheelResults");
  const previousRound = currentRound - 1;
  const lastResultQuery = new Parse.Query(FerrisWheelResults);
  lastResultQuery.equalTo("round", previousRound);
  const lastResult = await lastResultQuery.first({ useMasterKey: true });
  
  let previousWinningFruit = lastResult ? lastResult.get("result") : null;
  let topList = [];

  // جلب قائمة الفائزين من الجولة السابقة
  if (previousWinningFruit) {
    const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
    const winningBetsQuery = new Parse.Query(FerrisWheelChoices);
    winningBetsQuery.equalTo("round", previousRound);
    winningBetsQuery.equalTo("choice", previousWinningFruit);
    winningBetsQuery.descending("gold");
    winningBetsQuery.limit(3);
    const winningBets = await winningBetsQuery.find({ useMasterKey: true });

    for (const bet of winningBets) {
      const betUserId = bet.get("userId");
      const betGold = bet.get("gold") || 0;
      const winAmount = Math.floor(betGold * FRUIT_MULTIPLIERS[previousWinningFruit]);

      try {
        const betUser = await new Parse.Query(Parse.User).get(betUserId, { useMasterKey: true });
        topList.push({
          avatar: betUser.get("avatar")?.url() || "",
          nick: betUser.get("name") || betUser.get("username") || "User",
          total: winAmount,
        });
      } catch (error) {
        console.error(`Error fetching user ${betUserId}:`, error);
      }
    }
  }

  // جلب آخر 10 نتائج
  const resultsQuery = new Parse.Query(FerrisWheelResults);
  resultsQuery.descending("round");
  resultsQuery.limit(10);
  const recentResults = await resultsQuery.find({ useMasterKey: true });
  const resultList = recentResults.map(r => r.get("result")).reverse();

  // جلب رهانات المستخدم الحالية
  const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
  const currentBetsQuery = new Parse.Query(FerrisWheelChoices);
  currentBetsQuery.equalTo("userId", userId);
  currentBetsQuery.equalTo("round", currentRound);
  const currentBets = await currentBetsQuery.find({ useMasterKey: true });

  const selectMap = {};
  for (const bet of currentBets) {
    selectMap[bet.get("choice")] = bet.get("gold");
  }

  // حساب أرباح المستخدم من الجولة السابقة
  let winGold = 0;
  let userAvatar = user.get("avatar")?.url() || "";
  
  if (previousWinningFruit) {
    const userWinQuery = new Parse.Query(FerrisWheelChoices);
    userWinQuery.equalTo("userId", userId);
    userWinQuery.equalTo("round", previousRound);
    userWinQuery.equalTo("choice", previousWinningFruit);
    const userWinBet = await userWinQuery.first({ useMasterKey: true });
    
    if (userWinBet) {
      winGold = Math.floor(userWinBet.get("gold") * FRUIT_MULTIPLIERS[previousWinningFruit]);
    }
  }

  return {
    code: 200,
    message: "Success",
    data: {
      countdown: countdown,
      round: currentRound,
      gold: userCredits,
      profit: userProfit,
      result: previousWinningFruit,
      resultList: resultList,
      select: selectMap,
      top: topList,
      winGold: winGold,
      avatar: userAvatar,
    }
  };
});

//////////////////////////////////////////////////////////
// وضع رهان في اللعبة (مع منع التكرار)
//////////////////////////////////////////////////////////
Parse.Cloud.define("game_choice", async (request) => {
  const user = request.user;
  if (!user) {
    throw new Parse.Error(209, "User not authenticated");
  }

  const { choice, gold } = request.params;
  const userId = user.id;

  console.log(`Bet request from user ${userId}: choice=${choice}, gold=${gold}`);

  // التحقق من صحة البيانات
  if (!choice || !FRUIT_MULTIPLIERS[choice]) {
    return { code: 400, message: "Invalid fruit choice" };
  }
  
  if (!gold || gold <= 0) {
    return { code: 400, message: "Invalid bet amount" };
  }

  // حساب الجولة الحالية
  const currentTime = Math.floor(Date.now() / 1000);
  const currentRound = Math.floor(currentTime / ROUND_DURATION);
  const roundEndTime = (currentRound * ROUND_DURATION) + ROUND_DURATION;
  const timeLeft = roundEndTime - currentTime;
  
  // منع الرهان إذا بقي أقل من 5 ثواني
  if (timeLeft < 5) {
    return { code: 400, message: "Betting period has ended. Please wait for next round." };
  }

  // التحقق من رصيد المستخدم
  await user.fetch({ useMasterKey: true });
  const userCredits = user.get("credit") || 0;

  if (userCredits < gold) {
    return { code: 10062, message: "Insufficient balance" };
  }

  // التحقق من الحد الأقصى للرهانات (5 فواكه مختلفة)
  const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
  const userBetsQuery = new Parse.Query(FerrisWheelChoices);
  userBetsQuery.equalTo("userId", userId);
  userBetsQuery.equalTo("round", currentRound);
  const existingBets = await userBetsQuery.find({ useMasterKey: true });
  
  // التحقق إذا كان المستخدم قد راهن بالفعل على هذه الفاكهة
  const existingChoiceBet = existingBets.find(bet => bet.get("choice") === choice);
  
  // التحقق من عدد الفواكه المختلفة
  const uniqueChoices = [...new Set(existingBets.map(bet => bet.get("choice")))];
  if (uniqueChoices.length >= 5 && !existingChoiceBet) {
    return { code: 400, message: "Maximum 5 different fruits allowed" };
  }

  // خصم الرصيد
  user.increment("credit", -gold);
  await user.save(null, { useMasterKey: true });

  if (existingChoiceBet) {
    // تحديث الرهان السابق
    existingChoiceBet.increment("gold", gold);
    await existingChoiceBet.save(null, { useMasterKey: true });
    console.log(`Updated existing bet for user ${userId}, fruit ${choice}, added ${gold}`);
  } else {
    // إضافة رهان جديد
    const newBet = new FerrisWheelChoices();
    newBet.set("userId", userId);
    newBet.set("round", currentRound);
    newBet.set("choice", choice);
    newBet.set("gold", gold);
    await newBet.save(null, { useMasterKey: true });
    console.log(`Created new bet for user ${userId}, fruit ${choice}, amount ${gold}`);
  }

  // إرجاع الرصيد المحدث
  await user.fetch({ useMasterKey: true });
  const newBalance = user.get("credit") || 0;

  return {
    code: 200,
    message: "Bet placed successfully",
    balance: newBalance
  };
});

//////////////////////////////////////////////////////////
// جلب سجل الرهانات
//////////////////////////////////////////////////////////
Parse.Cloud.define("game_bill", async (request) => {
  const user = request.user;
  if (!user) {
    throw new Parse.Error(209, "User not authenticated");
  }

  const userId = user.id;

  const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
  const FerrisWheelResults = Parse.Object.extend("FerrisWheelResults");

  const billsQuery = new Parse.Query(FerrisWheelChoices);
  billsQuery.equalTo("userId", userId);
  billsQuery.descending("createdAt");
  billsQuery.limit(10);
  const bills = await billsQuery.find({ useMasterKey: true });

  const billData = [];
  for (const bill of bills) {
    const round = bill.get("round");
    
    // جلب نتيجة الجولة
    const resultQuery = new Parse.Query(FerrisWheelResults);
    resultQuery.equalTo("round", round);
    const result = await resultQuery.first({ useMasterKey: true });

    billData.push({
      gold: bill.get("gold"),
      choice: bill.get("choice"),
      result: result ? result.get("result") : null,
      createTime: bill.createdAt,
    });
  }

  return {
    code: 200,
    message: "Success",
    data: billData
  };
});

//////////////////////////////////////////////////////////
// جلب ترتيب اللاعبين
//////////////////////////////////////////////////////////
Parse.Cloud.define("game_rank", async (request) => {
  const rankQuery = new Parse.Query(Parse.User);
  rankQuery.descending("credit");
  rankQuery.limit(10);
  rankQuery.select("name", "username", "avatar", "credit");
  const topUsers = await rankQuery.find({ useMasterKey: true });

  const rankList = topUsers.map(user => ({
    id: user.id,
    nick: user.get("name") || user.get("username"),
    avatar: user.get("avatar")?.url() || "",
    total: user.get("credit") || 0,
  }));

  return {
    code: 200,
    message: "Success",
    data: rankList
  };
});

//////////////////////////////////////////////////////////
// التحقق من صلاحية اللاعب للعبة
//////////////////////////////////////////////////////////
Parse.Cloud.define("game_validate_player", async (request) => {
  const user = request.user;
  if (!user) {
    throw new Parse.Error(209, "User not authenticated");
  }

  await user.fetch({ useMasterKey: true });

  return {
    code: 200,
    message: "Valid player",
    data: {
      userId: user.id,
      username: user.get("username"),
      nickname: user.get("name"),
      avatar: user.get("avatar")?.url() || "",
      credits: user.get("credit") || 0,
      diamonds: user.get("diamonds") || 0,
    }
  };
});

//////////////////////////////////////////////////////////
// وظيفة مجدولة لمعالجة الجولات تلقائياً
//////////////////////////////////////////////////////////
Parse.Cloud.job("processGameRounds", async (request) => {
  const currentTime = Math.floor(Date.now() / 1000);
  const currentRound = Math.floor(currentTime / ROUND_DURATION);
  const previousRound = currentRound - 1;
  
  console.log(`Processing game rounds: current=${currentRound}, previous=${previousRound}`);
  
  // التحقق من معالجة الجولة السابقة
  const FerrisWheelResults = Parse.Object.extend("FerrisWheelResults");
  const previousResultQuery = new Parse.Query(FerrisWheelResults);
  previousResultQuery.equalTo("round", previousRound);
  const previousResult = await previousResultQuery.first({ useMasterKey: true });
  
  if (!previousResult) {
    // إنشاء نتيجة الجولة السابقة
    const winningFruit = await createRoundResult(previousRound);
    
    // معالجة الأرباح
    const topWinners = await processRoundWinnings(previousRound, winningFruit);
    
    console.log(`Processed round ${previousRound}: winner=${winningFruit}, ${topWinners.length} winners`);
  } else {
    console.log(`Round ${previousRound} already processed`);
  }
  
  return { success: true };
});

//////////////////////////////////////////////////////////
// جلب الإحصائيات العامة
//////////////////////////////////////////////////////////
Parse.Cloud.define("game_stats", async (request) => {
  const user = request.user;
  if (!user) {
    throw new Parse.Error(209, "User not authenticated");
  }
  
  // جلب عدد المشاركين
  const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
  const participantsQuery = new Parse.Query(FerrisWheelChoices);
  participantsQuery.distinct("userId");
  const participantIds = await participantsQuery.find({ useMasterKey: true });
  
  // جلب عدد الرهانات
  const betsQuery = new Parse.Query(FerrisWheelChoices);
  const totalBets = await betsQuery.count({ useMasterKey: true });
  
  // جلب إجمالي الرهانات
  const aggregateQuery = new Parse.Query(FerrisWheelChoices);
  aggregateQuery.aggregate({
    sum: { field: "gold" }
  });
  const totalBetAmountResult = await aggregateQuery.find({ useMasterKey: true });
  const totalBetAmount = totalBetAmountResult[0]?.sum || 0;
  
  return {
    code: 200,
    message: "Success",
    data: {
      totalParticipants: participantIds.length,
      totalBets: totalBets,
      totalBetAmount: totalBetAmount,
      roundDuration: ROUND_DURATION,
      maxFruits: 5,
    }
  };
});

