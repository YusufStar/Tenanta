### 📊 **Core Database Operations**
```
GET    /api/v1/tenants              # Tenant bilgilerini getir
GET    /api/v1/tenants/:id          # Tenant bilgilerini getir
POST   /api/v1/tenants              # Yeni tenant oluştur
PUT    /api/v1/tenants/:id          # Tenant güncelle
DELETE /api/v1/tenants/:id          # Tenant sil
```

### 🗄️ **Schema Management**
```
GET    /api/v1/schemas              # Mevcut şemaları listele
POST   /api/v1/schemas              # Yeni şema oluştur
PUT    /api/v1/schemas/:id          # Şema güncelle
DELETE /api/v1/schemas/:id          # Şema sil
```

### 📺 **Database Console**
```
POST   /api/v1/console/sql          # SQL sorgusu çalıştır
POST   /api/v1/console/redis        # Redis komutu çalıştır
GET    /api/v1/console/sql/history  # SQL geçmişi
GET    /api/v1/console/redis/history # Redis komut geçmişi
```

### 💾 **Data Operations**
```
GET    /api/v1/data/:schemaId/:tableName    # Tablo verilerini getir
POST   /api/v1/data/:schemaId/:tableName    # Yeni veri ekle
PUT    /api/v1/data/:schemaId/:tableName/:id # Veri güncelle
DELETE /api/v1/data/:schemaId/:tableName/:id # Veri sil
```

### 🔍 **Query & Analytics**
```
POST   /api/v1/query/execute        # Özel sorgu çalıştır
GET    /api/v1/query/saved          # Kaydedilmiş sorgular
POST   /api/v1/query/save           # Sorgu kaydet
DELETE /api/v1/query/:id            # Kaydedilmiş sorgu sil
```

### 📈 **Health & Status**
```
GET    /api/v1/health               # API sağlık durumu
GET    /api/v1/status               # Genel sistem durumu
```