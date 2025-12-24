const OneSignal = require('@onesignal/node-onesignal');

const app_id = "7dec5bab-5550-4977-af9d-563e58d64721";
const user_key_token = "os_v2_app_pxwfxk2vkbexpl45ky7frvsheejjt5vfgk2udcetlfdjqmpkgmuxzghyhf3dzqm5njoioddsruaoqezy6n7puoxdohswdeanxdc32qa";
const rest_api_key = "os_v2_app_pxwfxk2vkbexpl45ky7frvsheejjt5vfgk2udcetlfdjqmpkgmuxzghyhf3dzqm5njoioddsruaoqezy6n7puoxdohswdeanxdc32qa";

const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;

const configuration = OneSignal.createConfiguration({
  userAuthKey: user_key_token,
  restApiKey: rest_api_key,
});
const client = new OneSignal.DefaultApi(configuration);

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
      console.log("Push sent");
      return "sent";
    }, function (error) {
      console.log("Push error: " + error.message);
      return Promise.reject(error);
    });
});

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

Parse.Cloud.define("send_gift", async (request) => {
  const { objectId, credits } = request.params;
  const user = await new Parse.Query(Parse.User).get(objectId, { useMasterKey: true });
  user.increment("diamonds", credits);
  user.increment("diamondsTotal", credits);
  await user.save(null, { useMasterKey: true });
  return "updated";
});

Parse.Cloud.define("send_agency", async (request) => {
  const { objectId, credits } = request.params;
  const user = await new Parse.Query(Parse.User).get(objectId, { useMasterKey: true });
  user.increment("diamondsAgency", credits);
  user.increment("diamondsAgencyTotal", credits);
  await user.save(null, { useMasterKey: true });
  return "updated";
});

Parse.Cloud.define("check_phone_number", async (request) => {
  const phone = request.params.phone_number;
  const user = await new Parse.Query(Parse.User)
    .equalTo("phone_number_full", phone)
    .first({ useMasterKey: true });
  if (user) throw new Parse.Error(100, "Phone exists");
  return "ok";
});

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

Parse.Cloud.beforeLogin(async (request) => {
  const user = request.object;
  if (user.get("accountDeleted")) {
    throw new Parse.Error(340, "Account Deleted");
  }
  if (user.get("activationStatus")) {
    throw new Parse.Error(341, "Access denied, you have been blocked.");
  }
});

// =================== GAMES API ===================

const ROUND_DURATION = 30;
const FRUIT_MULTIPLIERS = {
  'g': 2, 'h': 3, 'a': 1.5, 'b': 2.5, 'c': 4, 'd': 3.5, 'e': 2, 'f': 5,
};

const FRUIT_MAP = { 6: 'g', 7: 'h', 8: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e', 5: 'f' };

Parse.Cloud.define("game_info", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(209, "User not authenticated");

  const userId = user.id;
  const currentTime = Math.floor(Date.now() / 1000);
  const currentRound = Math.floor(currentTime / ROUND_DURATION);
  const roundStartTime = currentRound * ROUND_DURATION;
  const roundEndTime = roundStartTime + ROUND_DURATION;
  const countdown = Math.max(0, roundEndTime - currentTime);

  await user.fetch({ useMasterKey: true });
  const userCredits = user.get("credit") || 0;
  const userProfit = user.get("gameProfit") || 0;

  const FerrisWheelResults = Parse.Object.extend("FerrisWheelResults");
  const lastResultQuery = new Parse.Query(FerrisWheelResults);
  lastResultQuery.equalTo("round", currentRound - 1);
  let lastResult = await lastResultQuery.first({ useMasterKey: true });

  let previousWinningFruit = null;
  let topList = [];

  if (!lastResult) {
    const fruitKeys = Object.keys(FRUIT_MAP);
    const winningNumber = fruitKeys[Math.floor(Math.random() * fruitKeys.length)];
    previousWinningFruit = FRUIT_MAP[winningNumber];

    const newResult = new FerrisWheelResults();
    newResult.set("round", currentRound - 1);
    newResult.set("result", previousWinningFruit);
    await newResult.save(null, { useMasterKey: true });

    const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
    const previousBetsQuery = new Parse.Query(FerrisWheelChoices);
    previousBetsQuery.equalTo("round", currentRound - 1);
    previousBetsQuery.equalTo("choice", previousWinningFruit);
    const winningBets = await previousBetsQuery.find({ useMasterKey: true });

    for (const bet of winningBets) {
      const betUserId = bet.get("userId");
      const betGold = bet.get("gold") || 0;
      const winAmount = Math.floor(betGold * FRUIT_MULTIPLIERS[previousWinningFruit]);

      const betUser = await new Parse.Query(Parse.User).get(betUserId, { useMasterKey: true });
      betUser.increment("credit", winAmount);
      betUser.increment("gameProfit", winAmount);
      await betUser.save(null, { useMasterKey: true });

      topList.push({
        avatar: betUser.get("avatar")?.url() || "",
        nick: betUser.get("name") || betUser.get("username"),
        total: winAmount,
      });
    }
  } else {
    previousWinningFruit = lastResult.get("result");

    const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
    const winningBetsQuery = new Parse.Query(FerrisWheelChoices);
    winningBetsQuery.equalTo("round", currentRound - 1);
    winningBetsQuery.equalTo("choice", previousWinningFruit);
    winningBetsQuery.limit(10);
    const winningBets = await winningBetsQuery.find({ useMasterKey: true });

    for (const bet of winningBets) {
      const betUserId = bet.get("userId");
      const betGold = bet.get("gold") || 0;
      const winAmount = Math.floor(betGold * FRUIT_MULTIPLIERS[previousWinningFruit]);

      const betUser = await new Parse.Query(Parse.User).get(betUserId, { useMasterKey: true });
      topList.push({
        avatar: betUser.get("avatar")?.url() || "",
        nick: betUser.get("name") || betUser.get("username"),
        total: winAmount,
      });
    }
  }

  const resultsQuery = new Parse.Query(FerrisWheelResults);
  resultsQuery.descending("round");
  resultsQuery.limit(10);
  const recentResults = await resultsQuery.find({ useMasterKey: true });
  const resultList = recentResults.map(r => r.get("result"));

  const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
  const currentBetsQuery = new Parse.Query(FerrisWheelChoices);
  currentBetsQuery.equalTo("userId", userId);
  currentBetsQuery.equalTo("round", currentRound);
  const currentBets = await currentBetsQuery.find({ useMasterKey: true });

  const selectMap = {};
  for (const bet of currentBets) {
    selectMap[bet.get("choice")] = bet.get("gold");
  }

  let winGold = 0;
  let userAvatar = user.get("avatar")?.url() || "";
  
  const userWinQuery = new Parse.Query(FerrisWheelChoices);
  userWinQuery.equalTo("userId", userId);
  userWinQuery.equalTo("round", currentRound - 1);
  userWinQuery.equalTo("choice", previousWinningFruit);
  const userWinBet = await userWinQuery.first({ useMasterKey: true });
  
  if (userWinBet) {
    winGold = Math.floor(userWinBet.get("gold") * FRUIT_MULTIPLIERS[previousWinningFruit]);
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
      top: topList.slice(0, 3),
      winGold: winGold,
      avatar: userAvatar,
    }
  };
});

Parse.Cloud.define("game_choice", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(209, "User not authenticated");

  const { choice, gold } = request.params;
  const userId = user.id;

  if (!choice || gold <= 0) {
    return { code: 400, message: "Invalid input data" };
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const currentRound = Math.floor(currentTime / ROUND_DURATION);

  await user.fetch({ useMasterKey: true });
  const userCredits = user.get("credit") || 0;

  if (userCredits < gold) {
    return { code: 10062, message: "Insufficient balance" };
  }

  user.increment("credit", -gold);
  await user.save(null, { useMasterKey: true });

  const FerrisWheelChoices = Parse.Object.extend("FerrisWheelChoices");
  const existingBetQuery = new Parse.Query(FerrisWheelChoices);
  existingBetQuery.equalTo("userId", userId);
  existingBetQuery.equalTo("round", currentRound);
  existingBetQuery.equalTo("choice", choice);
  const existingBet = await existingBetQuery.first({ useMasterKey: true });

  if (existingBet) {
    existingBet.increment("gold", gold);
    await existingBet.save(null, { useMasterKey: true });
  } else {
    const newBet = new FerrisWheelChoices();
    newBet.set("userId", userId);
    newBet.set("round", currentRound);
    newBet.set("choice", choice);
    newBet.set("gold", gold);
    await newBet.save(null, { useMasterKey: true });
  }

  await user.fetch({ useMasterKey: true });
  const newBalance = user.get("credit") || 0;

  return {
    code: 200,
    message: "Bet placed successfully",
    balance: newBalance
  };
});

Parse.Cloud.define("game_bill", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(209, "User not authenticated");

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

Parse.Cloud.define("game_validate_player", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(209, "User not authenticated");

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
