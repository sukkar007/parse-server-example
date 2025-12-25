# ========================
# Builder stage
# ========================
FROM node:18.20.1-alpine AS builder

WORKDIR /usr/src/parse

# نسخ ملفات package.json و package-lock.json
COPY package*.json ./

# تثبيت الاعتماديات
RUN npm install

# نسخ باقي الملفات
COPY . .

# بناء المشروع (TypeScript)
RUN npm run build

# ========================
# Runtime stage
# ========================
FROM node:18.20.1-alpine

WORKDIR /usr/src/parse

# نسخ node_modules من مرحلة البناء
COPY --from=builder /usr/src/parse/node_modules ./node_modules

# نسخ ملفات البناء
COPY --from=builder /usr/src/parse/dist ./dist
COPY --from=builder /usr/src/parse/public ./public
COPY --from=builder /usr/src/parse/cloud ./cloud

# إنشاء مجلدات لحفظ البيانات واللوجات
VOLUME ["/usr/src/parse/cloud", "/usr/src/parse/logs"]

# فتح البورت الافتراضي للـ Parse Server
EXPOSE 1337

# تشغيل السيرفر على ملف البناء
CMD ["node", "dist/index.js"]
