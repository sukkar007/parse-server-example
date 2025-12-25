const OneSignal = require('@onesignal/node-onesignal');

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

// =================== TIME & GAME SETTINGS ===================
const ROUND_DURATION = 30; // 30 ثانية لكل جولة
const GAME_START_TIMESTAMP = Math.floor(Date.now() / 1000); // وقت بدء اللعبة (اليوم)

//////////////////////////////////////////////////////////
// الحصول على وقت السيرفر (ثابت للجميع)
//////////////////////////////////////////////////////////
Parse.Cloud.define("get_server_time", async (request) => {
  return {
    code: 200,
    message: "Success",
    data: {
      serverTime: Math.floor(Date.now() / 1000),
      roundDuration: ROUND_DURATION,
      gameStartTime: GAME_START_TIMESTAMP
    }
  };
});

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

// إعدادات الفواكه
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
// جلب معلومات اللعبة والجولة الحالية (محدث)
//////////////////////////////////////////////////////////
Parse.Cloud.define("game_info", async (request) => {
  const user = request.user;
  if (!user) {
    throw new Parse.Error(209, "User not authenticated");
  }

  const { round } = request.params;
  const currentTime = Math.floor(Date.now() / 1000);
  
  // حساب الجولة الحالية والعداد (ثابت للجميع)
  const elapsedTime = currentTime - GAME_START_TIMESTAMP;
  const currentRound = Math.max(0, Math.floor(elapsedTime / ROUND_DURATION));
  const roundStartTime = GAME_START_TIMESTAMP + (currentRound * ROUND_DURATION);
  const roundEndTime = roundStartTime + ROUND_DURATION;
  const countdown = Math.max(0, roundEndTime - currentTime);
  
  // حالة الجولة
  let gameStatus = "playing";
  if (countdown <= 0) {
    gameStatus = "drawing";
  } else if (countdown <= 5) {
    gameStatus = "ending_soon";
  }

  console.log("Game Info:", {
    currentTime,
    currentRound,
    countdown,
    gameStatus,
    roundDuration: ROUND_DURATION,
    gameStartTime: GAME_START_TIMESTAMP
  });

  // جلب بيانات المستخدم
  await user.fetch({ useMasterKey: true });
  
  // إذا طلبنا نتيجة جولة محددة
  if (round !== undefined) {
    const FerrisWheelResults = Parse.Object.extend("FerrisWheelResults");
    const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
    
    // جلب نتيجة الجولة المطلوبة
    const resultQuery = new Parse.Query(FerrisWheelResults);
    resultQuery.equalTo("round", round);
    const resultObj = await resultQuery.first({ useMasterKey: true });
    
    let winningFruit = null;
    let topList = [];
    let userWinGold = 0;
    
    if (resultObj) {
      winningFruit = resultObj.get("result");
      
      // جلب قائمة الفائزين
      const winnersQuery = new Parse.Query(FerrisWheelChoices);
      winnersQuery.equalTo("round", round);
      winnersQuery.equalTo("choice", winningFruit);
      winnersQuery.descending("gold");
      winnersQuery.limit(10);
      const winningBets = await winnersQuery.find({ useMasterKey: true });
      
      for (const bet of winningBets) {
        const betUserId = bet.get("userId");
        const betGold = bet.get("gold") || 0;
        const winAmount = Math.floor(betGold * (FRUIT_MULTIPLIERS[winningFruit] || 2));
        
        const betUser = await new Parse.Query(Parse.User).get(betUserId, { useMasterKey: true });
        topList.push({
          avatar: betUser.get("avatar")?.url() || "",
          nick: betUser.get("name") || betUser.get("username"),
          total: winAmount,
        });
        
        // حساب أرباح المستخدم الحالي
        if (betUserId === user.id) {
          userWinGold = winAmount;
        }
      }
    }
    
    // جلب آخر 10 نتائج
    const recentResults = await getRecentResults(10);
    
    // جلب رهانات المستخدم الحالية
    const currentBets = await getUserCurrentBets(user.id, currentRound);
    
    return {
      code: 200,
      message: "Success",
      data: {
        countdown: countdown,
        round: currentRound,
        gold: user.get("credit") || 0,
        profit: user.get("gameProfit") || 0,
        result: winningFruit,
        resultList: recentResults,
        select: currentBets,
        top: topList.slice(0, 3),
        winGold: userWinGold,
        avatar: user.get("avatar")?.url() || "",
        gameStatus: "result_showing"
      }
    };
  }

  // جلب آخر 10 نتائج
  const recentResults = await getRecentResults(10);
  
  // جلب رهانات المستخدم الحالية
  const currentBets = await getUserCurrentBets(user.id, currentRound);
  
  // جلب نتيجة الجولة السابقة
  let previousResult = null;
  if (currentRound > 0) {
    const prevResultQuery = new Parse.Query("FerrisWheelResults");
    prevResultQuery.equalTo("round", currentRound - 1);
    const prevResult = await prevResultQuery.first({ useMasterKey: true });
    if (prevResult) {
      previousResult = prevResult.get("result");
    }
  }

  return {
    code: 200,
    message: "Success",
    data: {
      countdown: countdown,
      round: currentRound,
      gold: user.get("credit") || 0,
      profit: user.get("gameProfit") || 0,
      result: previousResult,
      resultList: recentResults,
      select: currentBets,
      top: [],
      winGold: 0,
      avatar: user.get("avatar")?.url() || "",
      gameStatus: gameStatus
    }
  };
});

// دالة مساعدة: جلب النتائج الحديثة
async function getRecentResults(limit = 10) {
  const FerrisWheelResults = Parse.Object.extend("FerrisWheelResults");
  const query = new Parse.Query(FerrisWheelResults);
  query.descending("round");
  query.limit(limit);
  const results = await query.find({ useMasterKey: true });
  return results.map(r => r.get("result"));
}

// دالة مساعدة: جلب رهانات المستخدم الحالية
async function getUserCurrentBets(userId, round) {
  const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
  const query = new Parse.Query(FerrisWheelChoices);
  query.equalTo("userId", userId);
  query.equalTo("round", round);
  const bets = await query.find({ useMasterKey: true });
  
  const betMap = {};
  for (const bet of bets) {
    betMap[bet.get("choice")] = bet.get("gold");
  }
  return betMap;
}

//////////////////////////////////////////////////////////
// إنشاء نتيجة الجولة (تعمل تلقائياً)
//////////////////////////////////////////////////////////
async function generateRoundResult(roundNumber) {
  try {
    const FerrisWheelResults = Parse.Object.extend("FerrisWheelResults");
    const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
    
    // التحقق من عدم وجود النتيجة بالفعل
    const existingResult = await new Parse.Query(FerrisWheelResults)
      .equalTo("round", roundNumber)
      .first({ useMasterKey: true });
      
    if (existingResult) {
      return existingResult.get("result");
    }
    
    // اختيار فاكهة فائزة عشوائياً
    const fruits = ['g', 'h', 'a', 'b', 'c', 'd', 'e', 'f'];
    const winningFruit = fruits[Math.floor(Math.random() * fruits.length)];
    
    // حفظ النتيجة
    const newResult = new FerrisWheelResults();
    newResult.set("round", roundNumber);
    newResult.set("result", winningFruit);
    newResult.set("createdAt", new Date());
    await newResult.save(null, { useMasterKey: true });
    
    console.log(`Generated result for round ${roundNumber}: ${winningFruit}`);
    
    // تحديث أرباح الفائزين
    const winningBets = await new Parse.Query(FerrisWheelChoices)
      .equalTo("round", roundNumber)
      .equalTo("choice", winningFruit)
      .find({ useMasterKey: true });
      
    for (const bet of winningBets) {
      const betUserId = bet.get("userId");
      const betGold = bet.get("gold") || 0;
      const winAmount = Math.floor(betGold * (FRUIT_MULTIPLIERS[winningFruit] || 2));
      
      try {
        const betUser = await new Parse.Query(Parse.User).get(betUserId, { useMasterKey: true });
        if (betUser) {
          betUser.increment("credit", winAmount);
          betUser.increment("gameProfit", winAmount);
          await betUser.save(null, { useMasterKey: true });
          console.log(`User ${betUserId} won ${winAmount} coins`);
        }
      } catch (userError) {
        console.error(`Error updating user ${betUserId}:`, userError);
      }
    }
    
    return winningFruit;
  } catch (error) {
    console.error(`Error generating result for round ${roundNumber}:`, error);
    return null;
  }
}

// وظيفة تلقائية لتوليد النتائج (كل ثانية)
setInterval(async () => {
  try {
    const currentTime = Math.floor(Date.now() / 1000);
    const elapsedTime = currentTime - GAME_START_TIMESTAMP;
    const currentRound = Math.max(0, Math.floor(elapsedTime / ROUND_DURATION));
    const previousRound = currentRound - 1;
    
    // توليد نتيجة الجولة السابقة إذا لم تكن موجودة
    if (previousRound >= 0) {
      const existingResult = await new Parse.Query("FerrisWheelResults")
        .equalTo("round", previousRound)
        .first({ useMasterKey: true });
        
      if (!existingResult) {
        await generateRoundResult(previousRound);
      }
    }
  } catch (error) {
    console.error("Auto result generation error:", error);
  }
}, 1000); // كل ثانية

//////////////////////////////////////////////////////////
// وضع رهان في اللعبة
//////////////////////////////////////////////////////////
Parse.Cloud.define("game_choice", async (request) => {
  const user = request.user;
  if (!user) {
    throw new Parse.Error(209, "User not authenticated");
  }

  const { choice, gold } = request.params;
  const userId = user.id;

  // التحقق من صحة البيانات
  if (!choice || gold <= 0) {
    return { code: 400, message: "Invalid input data" };
  }

  // حساب الجولة الحالية (من السيرفر)
  const currentTime = Math.floor(Date.now() / 1000);
  const currentRound = Math.max(0, Math.floor((currentTime - GAME_START_TIMESTAMP) / ROUND_DURATION));
  
  // حساب الوقت المتبقي للجولة
  const roundStartTime = GAME_START_TIMESTAMP + (currentRound * ROUND_DURATION);
  const roundEndTime = roundStartTime + ROUND_DURATION;
  const countdown = roundEndTime - currentTime;
  
  // إذا انتهت الجولة، لا يمكن وضع رهان
  if (countdown <= 0) {
    return { code: 400, message: "Round has ended" };
  }

  // التحقق من رصيد المستخدم
  await user.fetch({ useMasterKey: true });
  const userCredits = user.get("credit") || 0;

  if (userCredits < gold) {
    return { code: 10062, message: "Insufficient balance" };
  }

  // خصم الرصيد
  user.increment("credit", -gold);
  await user.save(null, { useMasterKey: true });

  // التحقق من وجود رهان سابق على نفس الفاكهة
  const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
  const existingBetQuery = new Parse.Query(FerrisWheelChoices);
  existingBetQuery.equalTo("userId", userId);
  existingBetQuery.equalTo("round", currentRound);
  existingBetQuery.equalTo("choice", choice);
  const existingBet = await existingBetQuery.first({ useMasterKey: true });

  if (existingBet) {
    // تحديث الرهان السابق
    existingBet.increment("gold", gold);
    await existingBet.save(null, { useMasterKey: true });
  } else {
    // إضافة رهان جديد
    const newBet = new FerrisWheelChoices();
    newBet.set("userId", userId);
    newBet.set("round", currentRound);
    newBet.set("choice", choice);
    newBet.set("gold", gold);
    newBet.set("createdAt", new Date());
    await newBet.save(null, { useMasterKey: true });
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
