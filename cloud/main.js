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

//////////////////////////////////////////////////////////
// Send Push Notification
//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////
// Send Push Notification (FIXED)
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
