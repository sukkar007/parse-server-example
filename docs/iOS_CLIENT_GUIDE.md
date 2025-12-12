# دليل عميل Parse لـ iOS

## المتطلبات
- Xcode 12 أو أحدث
- Swift 5.3 أو أحدث
- CocoaPods أو SPM

## التثبيت

### باستخدام CocoaPods
```ruby
pod 'Parse'
```

### باستخدام Swift Package Manager
```swift
.package(url: "https://github.com/parse-community/Parse-Swift.git", from: "5.0.0")
```

## الإعدادات الأساسية

### 1. تكوين Parse في AppDelegate

```swift
import Parse

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        
        let parseConfig = ParseClientConfiguration {
            $0.applicationId = "myAppId"
            $0.clientKey = "myClientKey"
            $0.serverURL = URL(string: "https://your-render-app.onrender.com/parse")!
        }
        
        Parse.initialize(with: parseConfig)
        
        return true
    }
}
```

## أمثلة الاستخدام

### 1. تسجيل مستخدم جديد

```swift
import Parse

func signUp(username: String, password: String, email: String) {
    let user = PFUser()
    user.username = username
    user.password = password
    user.email = email
    
    user.signUpInBackground { (succeeded, error) in
        if let error = error {
            print("خطأ في التسجيل: \(error.localizedDescription)")
        } else {
            print("تم التسجيل بنجاح!")
        }
    }
}
```

### 2. تسجيل الدخول

```swift
func login(username: String, password: String) {
    PFUser.logInWithUsername(inBackground: username, password: password) { (user, error) in
        if let error = error {
            print("خطأ في الدخول: \(error.localizedDescription)")
        } else {
            print("تم الدخول بنجاح!")
        }
    }
}
```

### 3. تسجيل الخروج

```swift
func logout() {
    PFUser.logOutInBackground { (error) in
        if let error = error {
            print("خطأ: \(error.localizedDescription)")
        } else {
            print("تم تسجيل الخروج")
        }
    }
}
```

### 4. حفظ بيانات

```swift
func saveUserData(diamonds: Int, username: String) {
    if let user = PFUser.current() {
        user["diamonds"] = diamonds
        user["username"] = username
        
        user.saveInBackground { (succeeded, error) in
            if let error = error {
                print("خطأ: \(error.localizedDescription)")
            } else {
                print("تم الحفظ بنجاح")
            }
        }
    }
}
```

### 5. استدعاء دالة Cloud

```swift
func sendGift(objectId: String, credits: Int) {
    PFCloud.callFunction(inBackground: "send_gift", withParameters: [
        "objectId": objectId,
        "credits": credits
    ]) { (result, error) in
        if let error = error {
            print("خطأ: \(error.localizedDescription)")
        } else {
            print("تم إرسال الهدية: \(result ?? "")")
        }
    }
}
```

### 6. الاستعلام عن البيانات

```swift
func fetchUsers() {
    let query = PFUser.query()
    query?.whereKey("diamonds", greaterThan: 100)
    
    query?.findObjectsInBackground { (objects, error) in
        if let error = error {
            print("خطأ: \(error.localizedDescription)")
        } else if let users = objects as? [PFUser] {
            for user in users {
                print("المستخدم: \(user.username ?? ""), الماسات: \(user["diamonds"] ?? 0)")
            }
        }
    }
}
```

### 7. الاستماع للتحديثات الحية (Live Query)

```swift
import ParseLiveQuery

func subscribeToLiveUpdates() {
    let query = PFUser.query()
    query?.whereKey("streaming", equalTo: true)
    
    let subscription = query?.subscribe()
    
    subscription?.handleEvent { _, event, object in
        switch event {
        case .entered:
            print("دخل مستخدم جديد")
        case .left:
            print("غادر مستخدم")
        case .updated:
            print("تم تحديث البيانات")
        case .created:
            print("تم إنشاء بيانات جديدة")
        case .deleted:
            print("تم حذف البيانات")
        @unknown default:
            break
        }
    }
}
```

### 8. متابعة مستخدم

```swift
func followUser(userId: String) {
    if let currentUser = PFUser.current() {
        PFCloud.callFunction(inBackground: "follow_user", withParameters: [
            "authorId": currentUser.objectId ?? "",
            "receiverId": userId
        ]) { (result, error) in
            if let error = error {
                print("خطأ: \(error.localizedDescription)")
            } else {
                print("تم المتابعة بنجاح")
            }
        }
    }
}
```

## معالجة الأخطاء

```swift
func handleParseError(_ error: Error) {
    if let parseError = error as? NSError {
        switch parseError.code {
        case 100:
            print("رقم الهاتف موجود بالفعل")
        case 209:
            print("غير مصرح")
        case 340:
            print("تم حذف الحساب")
        case 341:
            print("تم حظر الحساب")
        default:
            print("خطأ: \(parseError.localizedDescription)")
        }
    }
}
```

## الأمان

- لا تخزن كلمات المرور بشكل واضح
- استخدم HTTPS دائماً
- احفظ مفتاح العميل بشكل آمن
- تحقق من صحة البيانات على الخادم

## الموارد الإضافية

- [وثائق Parse iOS](https://docs.parseplatform.org/ios/guide/)
- [GitHub Repository](https://github.com/parse-community/Parse-Swift)
