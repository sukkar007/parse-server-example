# دليل عميل Parse لـ Android

## المتطلبات
- Android Studio 4.0 أو أحدث
- Android SDK 21 أو أحدث
- Gradle 7.0 أو أحدث

## التثبيت

### إضافة Dependency في build.gradle

```gradle
dependencies {
    implementation 'com.parse:parse-android:1.26.0'
    implementation 'com.parse:parse-fcm:1.1.1'  // للإشعارات
}
```

## الإعدادات الأساسية

### 1. تكوين Parse في Application Class

```kotlin
import android.app.Application
import com.parse.Parse
import com.parse.ParseInstallation

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        Parse.initialize(Parse.Configuration.Builder(this)
            .applicationId("myAppId")
            .clientKey("myClientKey")
            .server("https://your-render-app.onrender.com/parse/")
            .build()
        )
        
        // تسجيل جهاز للإشعارات
        ParseInstallation.getCurrentInstallation().saveInBackground()
    }
}
```

### 2. تحديث AndroidManifest.xml

```xml
<application
    android:name=".MyApplication"
    ...>
    
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
</application>
```

## أمثلة الاستخدام

### 1. تسجيل مستخدم جديد

```kotlin
import com.parse.ParseUser

fun signUp(username: String, password: String, email: String) {
    val user = ParseUser()
    user.username = username
    user.setPassword(password)
    user.email = email
    
    user.signUpInBackground { e ->
        if (e == null) {
            println("تم التسجيل بنجاح!")
        } else {
            println("خطأ في التسجيل: ${e.message}")
        }
    }
}
```

### 2. تسجيل الدخول

```kotlin
fun login(username: String, password: String) {
    ParseUser.logInInBackground(username, password) { user, e ->
        if (e == null) {
            println("تم الدخول بنجاح!")
            println("المستخدم الحالي: ${user?.username}")
        } else {
            println("خطأ في الدخول: ${e.message}")
        }
    }
}
```

### 3. تسجيل الخروج

```kotlin
fun logout() {
    ParseUser.logOutInBackground {
        println("تم تسجيل الخروج")
    }
}
```

### 4. الحصول على المستخدم الحالي

```kotlin
fun getCurrentUser() {
    val user = ParseUser.getCurrentUser()
    if (user != null) {
        println("المستخدم: ${user.username}")
        println("البريد الإلكتروني: ${user.email}")
        println("الماسات: ${user.getInt("diamonds")}")
    }
}
```

### 5. حفظ بيانات المستخدم

```kotlin
fun updateUserData(diamonds: Int, username: String) {
    val user = ParseUser.getCurrentUser()
    if (user != null) {
        user.put("diamonds", diamonds)
        user.put("username", username)
        
        user.saveInBackground { e ->
            if (e == null) {
                println("تم الحفظ بنجاح")
            } else {
                println("خطأ: ${e.message}")
            }
        }
    }
}
```

### 6. استدعاء دالة Cloud

```kotlin
import com.parse.ParseCloud

fun sendGift(objectId: String, credits: Int) {
    val params = mapOf(
        "objectId" to objectId,
        "credits" to credits
    )
    
    ParseCloud.callFunctionInBackground("send_gift", params) { result ->
        println("النتيجة: $result")
    }
}
```

### 7. استدعاء دالة تحديث كلمة المرور

```kotlin
fun updatePassword(username: String, newPassword: String) {
    val params = mapOf(
        "username" to username,
        "password" to newPassword
    )
    
    ParseCloud.callFunctionInBackground("updatePassword", params) { result ->
        println("تم تحديث كلمة المرور: $result")
    }
}
```

### 8. الاستعلام عن البيانات

```kotlin
import com.parse.ParseQuery

fun fetchTopUsers() {
    val query = ParseQuery<ParseUser>("_User")
    query.whereGreaterThan("diamonds", 100)
    query.orderByDescending("diamonds")
    query.setLimit(10)
    
    query.findInBackground { objects, e ->
        if (e == null) {
            for (user in objects) {
                println("المستخدم: ${user.getString("username")}")
                println("الماسات: ${user.getInt("diamonds")}")
            }
        } else {
            println("خطأ: ${e.message}")
        }
    }
}
```

### 9. متابعة مستخدم

```kotlin
fun followUser(userId: String) {
    val currentUser = ParseUser.getCurrentUser()
    if (currentUser != null) {
        val params = mapOf(
            "authorId" to currentUser.objectId,
            "receiverId" to userId
        )
        
        ParseCloud.callFunctionInBackground("follow_user", params) { result ->
            println("تم المتابعة بنجاح: $result")
        }
    }
}
```

### 10. إلغاء متابعة مستخدم

```kotlin
fun unfollowUser(userId: String) {
    val currentUser = ParseUser.getCurrentUser()
    if (currentUser != null) {
        val params = mapOf(
            "authorId" to currentUser.objectId,
            "receiverId" to userId
        )
        
        ParseCloud.callFunctionInBackground("unfollow_user", params) { result ->
            println("تم إلغاء المتابعة: $result")
        }
    }
}
```

### 11. التحقق من رقم الهاتف

```kotlin
fun checkPhoneNumber(phoneNumber: String) {
    val params = mapOf("phone_number" to phoneNumber)
    
    ParseCloud.callFunctionInBackground("check_phone_number", params) { result ->
        println("النتيجة: $result")
    }
}
```

### 12. الاستماع للتحديثات الحية (Live Query)

```kotlin
import com.parse.livequery.ParseLiveQueryClient
import com.parse.ParseQuery

fun subscribeToLiveUpdates() {
    val query = ParseQuery<ParseUser>("_User")
    query.whereEqualTo("streaming", true)
    
    val liveQueryClient = ParseLiveQueryClient.Factory.getClient()
    val subscription = liveQueryClient.subscribe(query)
    
    subscription.addOnUpdateListener { query, obj ->
        println("تم تحديث البيانات: ${obj.objectId}")
    }
    
    subscription.addOnCreateListener { query, obj ->
        println("تم إنشاء بيانات جديدة: ${obj.objectId}")
    }
    
    subscription.addOnDeleteListener { query, obj ->
        println("تم حذف البيانات: ${obj.objectId}")
    }
    
    subscription.addOnEnterListener { query, obj ->
        println("دخل مستخدم جديد: ${obj.objectId}")
    }
    
    subscription.addOnLeaveListener { query, obj ->
        println("غادر مستخدم: ${obj.objectId}")
    }
}
```

## معالجة الأخطاء

```kotlin
fun handleParseError(e: ParseException) {
    when (e.code) {
        100 -> println("رقم الهاتف موجود بالفعل")
        209 -> println("غير مصرح")
        340 -> println("تم حذف الحساب")
        341 -> println("تم حظر الحساب")
        else -> println("خطأ: ${e.message}")
    }
}
```

## الأمان

- استخدم HTTPS دائماً
- لا تخزن كلمات المرور بشكل واضح
- احفظ مفتاح العميل بشكل آمن
- تحقق من صحة البيانات على الخادم
- استخدم ProGuard لتشفير الكود

## الموارد الإضافية

- [وثائق Parse Android](https://docs.parseplatform.org/android/guide/)
- [GitHub Repository](https://github.com/parse-community/Parse-SDK-Android)
