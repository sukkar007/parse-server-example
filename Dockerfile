# ========================
# Builder stage
# ========================
FROM node:18.20.1-alpine AS builder

WORKDIR /usr/src/parse

# نسخ package.json و package-lock.json
COPY package*.json ./

# تثبيت الاعتماديات
RUN npm install

# نسخ باقي الملفات
COPY . .

# بناء المشروع (اختياري، يمكن تشغيل TSX مباشرة)
RUN npm run build

# ========================
# Runtime stage
# ========================
FROM node:18.20.1-alpine

WORKDIR /usr/src/parse

# نسخ الاعتماديات
COPY --from=builder /usr/src/parse/node_modules ./node_modules

# نسخ الملفات المصدرية كاملة
COPY . .

# فتح البورت الافتراضي
EXPOSE 1337

# تشغيل المشروع مباشرة باستخدام tsx
CMD ["npx", "tsx", "index.ts"]
