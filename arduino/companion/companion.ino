/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           X-NEU IHA — Arduino Companion Computer               ║
 * ║           MAVLink Telemetri Köprüsü + Payload Kontrolü         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  Hedef Board : Arduino Mega 2560 (önerilen) veya Arduino Nano
 *
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  BAĞLANTI TABLOSU (Arduino Mega 2560)                       │
 *  ├──────────────────┬──────────────────────────────────────────┤
 *  │ Arduino Pin      │ Bağlandığı Yer                           │
 *  ├──────────────────┼──────────────────────────────────────────┤
 *  │ TX1 (Pin 18)     │ Pixhawk TELEM2 RX  (57600 baud)         │
 *  │ RX1 (Pin 19)     │ Pixhawk TELEM2 TX  (57600 baud)         │
 *  │ TX2 (Pin 16)     │ SiK Telemetri Radio RX (57600 baud)     │
 *  │ RX2 (Pin 17)     │ SiK Telemetri Radio TX (57600 baud)     │
 *  │ USB              │ GCS Laptop (115200 baud — JSON çıkış)   │
 *  ├──────────────────┼──────────────────────────────────────────┤
 *  │ Pin  4           │ 220Ω → Yeşil LED → GND  (GPS Fix)       │
 *  │ Pin  5           │ 220Ω → Sarı  LED → GND  (Batarya)       │
 *  │ Pin  6           │ 220Ω → Kırmızı LED→ GND (ARM)           │
 *  │ Pin  7           │ Aktif Buzzer (+) → GND  (Uyarı)         │
 *  │ Pin  8           │ Servo sinyal (Payload bırakma)           │
 *  │ Pin  9           │ Kamera tetik sinyali                     │
 *  ├──────────────────┼──────────────────────────────────────────┤
 *  │ 5V               │ SiK VCC, LED anot (dirençten önce)       │
 *  │ GND              │ Tüm bileşenlerin ortak GND               │
 *  └──────────────────┴──────────────────────────────────────────┘
 *
 *  Gerekli Kütüphaneler (Arduino IDE Library Manager):
 *    - Servo (yerleşik)
 *
 *  NOT: SiK radyo ile Pixhawk arasındaki MAVLink trafiği bu Arduino
 *  üzerinden köprülenmeden de çalışır. Arduino burada:
 *    1. Telemetri LED/buzzer göstergelerini yönetir
 *    2. Payload servo kontrolü sağlar
 *    3. GCS laptop'a USB üzerinden JSON telemetri basar
 *    4. Pixhawk ↔ SiK radio arasında şeffaf köprü görevi yapar
 */

#include <Arduino.h>
#include <Servo.h>

// ── Pin Tanımları ──────────────────────────────────────────────────────────
#define PIN_LED_GPS    4    // Yeşil  — GPS fix durumu
#define PIN_LED_BAT    5    // Sarı   — Batarya uyarısı
#define PIN_LED_ARM    6    // Kırmızı — ARM durumu
#define PIN_BUZZER     7    // Aktif buzzer
#define PIN_PAYLOAD    8    // Payload servo
#define PIN_CAM_TRIG   9    // Kamera tetik

// ── Serial Port Ataması ────────────────────────────────────────────────────
// Mega 2560: Serial=USB, Serial1=TELEM2, Serial2=SiK Radio
#define FC_SERIAL      Serial1    // Pixhawk TELEM2
#define RADIO_SERIAL   Serial2    // SiK Telemetri Radyo
#define GCS_SERIAL     Serial     // USB → Laptop

#define FC_BAUD        57600
#define RADIO_BAUD     57600
#define GCS_BAUD       115200

// ── MAVLink Sabitleri ──────────────────────────────────────────────────────
#define MAV_STX_V1          0xFE
#define MAV_MAX_PAYLOAD     255

// Mesaj ID'leri
#define MSG_HEARTBEAT       0
#define MSG_SYS_STATUS      1
#define MSG_GPS_RAW_INT     24
#define MSG_ATTITUDE        30
#define MSG_GLOBAL_POS_INT  33
#define MSG_VFR_HUD         74

// ── CRC-16/MCRF4XX Extra tablosu (wire format için) ───────────────────────
// İndeks = msg_id, değer = CRC extra byte
static const uint8_t CRC_EXTRA[75] PROGMEM = {
/*  0*/ 50,   // HEARTBEAT
/*  1*/ 124,  // SYS_STATUS
/*  2*/ 137,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,  // 2-22
/* 23*/ 0,
/* 24*/ 24,   // GPS_RAW_INT
/* 25*/ 0,0,0,0,0,
/* 30*/ 39,   // ATTITUDE
/* 31*/ 0,0,
/* 33*/ 104,  // GLOBAL_POSITION_INT
/* 34*/ 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
/* 74*/ 20    // VFR_HUD
};

// ── MAVLink Parser ─────────────────────────────────────────────────────────
struct MavParser {
  enum State : uint8_t { IDLE, LEN, SEQ, SID, CID, MID, PAYLOAD_B, CRC1, CRC2 };

  State    state    = IDLE;
  uint8_t  pktLen   = 0;
  uint8_t  msgId    = 0;
  uint8_t  buf[MAV_MAX_PAYLOAD];
  uint8_t  idx      = 0;
  uint16_t crc      = 0xFFFF;
  uint8_t  crc1Byte = 0;

  static uint16_t crc16Step(uint8_t d, uint16_t c) {
    uint8_t t = d ^ (uint8_t)(c & 0xFF);
    t ^= (t << 4);
    return ((uint16_t)(c >> 8)) ^ ((uint16_t)(t << 8)) ^ ((uint16_t)(t << 3)) ^ ((uint16_t)(t >> 4));
  }

  // true döndürdüğünde buf[0..pktLen-1] geçerli MAVLink payloadını içerir
  bool feed(uint8_t b) {
    switch (state) {
      case IDLE:
        if (b == MAV_STX_V1) { crc = 0xFFFF; state = LEN; }
        break;
      case LEN:
        pktLen = b; idx = 0; crc = crc16Step(b, crc); state = SEQ;
        break;
      case SEQ:
        crc = crc16Step(b, crc); state = SID;
        break;
      case SID:
        crc = crc16Step(b, crc); state = CID;
        break;
      case CID:
        crc = crc16Step(b, crc); state = MID;
        break;
      case MID:
        msgId = b; crc = crc16Step(b, crc);
        state = (pktLen == 0) ? CRC1 : PAYLOAD_B;
        break;
      case PAYLOAD_B:
        buf[idx++] = b; crc = crc16Step(b, crc);
        if (idx >= pktLen) state = CRC1;
        break;
      case CRC1:
        crc1Byte = b; state = CRC2;
        break;
      case CRC2: {
        state = IDLE;
        uint8_t extra = (msgId < sizeof(CRC_EXTRA)) ? pgm_read_byte(&CRC_EXTRA[msgId]) : 0;
        uint16_t expected = crc16Step(extra, crc);
        uint16_t received = ((uint16_t)b << 8) | crc1Byte;
        return (expected == received);
      }
    }
    return false;
  }
};

// ── Telemetri Veri Yapısı ──────────────────────────────────────────────────
struct Telemetry {
  bool     armed        = false;
  uint8_t  baseMode     = 0;
  uint8_t  gpsFixType   = 0;    // 0=NoGPS..6=RTK
  uint8_t  gpsSats      = 0;
  int32_t  lat          = 0;    // 1e-7 derece
  int32_t  lon          = 0;    // 1e-7 derece
  int32_t  altMSL_mm    = 0;    // mm (MSL)
  int32_t  altRel_mm    = 0;    // mm (AGL)
  uint16_t battVolt_mV  = 0;    // mV
  int8_t   battPct      = -1;   // % (-1 = bilinmiyor)
  float    airspeed     = 0;    // m/s
  float    groundspeed  = 0;    // m/s
  float    heading      = 0;    // derece
  float    roll_rad     = 0;
  float    pitch_rad    = 0;
  uint32_t lastHB_ms    = 0;    // Son heartbeat zamanı
};

// ── Global Nesneler ────────────────────────────────────────────────────────
MavParser  parser;
Telemetry  tel;
Servo      payloadServo;

bool     payloadDropped = false;
uint32_t lastBlink      = 0;
bool     blinkState     = false;

// ── Yardımcı: int32 → float (4 byte LE) ───────────────────────────────────
static inline int32_t readI32(const uint8_t* p) {
  return (int32_t)((uint32_t)p[0] | ((uint32_t)p[1] << 8) |
                   ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24));
}
static inline uint16_t readU16(const uint8_t* p) {
  return (uint16_t)p[0] | ((uint16_t)p[1] << 8);
}
static inline float readF32(const uint8_t* p) {
  float v; memcpy(&v, p, 4); return v;
}

// ── MAVLink Mesaj İşleyicisi ───────────────────────────────────────────────
void handlePacket() {
  const uint8_t* b = parser.buf;

  switch (parser.msgId) {

    case MSG_HEARTBEAT: {
      // Wire: custom_mode(u32@0), type(u8@4), autopilot(u8@5),
      //       base_mode(u8@6), system_status(u8@7), mavlink_version(u8@8)
      tel.baseMode = b[6];
      tel.armed    = (b[6] & 0x80) != 0;  // MAV_MODE_FLAG_SAFETY_ARMED
      tel.lastHB_ms = millis();
      break;
    }

    case MSG_SYS_STATUS: {
      // Wire: sensors_present(u32@0), sensors_enabled(u32@4),
      //       sensors_health(u32@8), load(u16@12),
      //       voltage_battery(u16@14), current_battery(i16@16),
      //       drop_rate(u16@18), errors_comm(u16@20),
      //       errors_count1-4(u16@22-28),
      //       battery_remaining(i8@30)
      tel.battVolt_mV = readU16(b + 14);
      tel.battPct     = (int8_t)b[30];
      break;
    }

    case MSG_GPS_RAW_INT: {
      // Wire: time_usec(u64@0), lat(i32@8), lon(i32@12), alt(i32@16),
      //       eph(u16@20), epv(u16@22), vel(u16@24), cog(u16@26),
      //       fix_type(u8@28), satellites_visible(u8@29)
      tel.lat        = readI32(b + 8);
      tel.lon        = readI32(b + 12);
      tel.altMSL_mm  = readI32(b + 16);
      tel.gpsFixType = b[28];
      tel.gpsSats    = b[29];
      break;
    }

    case MSG_ATTITUDE: {
      // Wire: time_boot(u32@0), roll(f@4), pitch(f@8), yaw(f@12),
      //       rollspeed(f@16), pitchspeed(f@20), yawspeed(f@24)
      tel.roll_rad  = readF32(b + 4);
      tel.pitch_rad = readF32(b + 8);
      break;
    }

    case MSG_GLOBAL_POS_INT: {
      // Wire: time_boot(u32@0), lat(i32@4), lon(i32@8),
      //       alt(i32@12), relative_alt(i32@16), ...
      tel.altMSL_mm = readI32(b + 12);
      tel.altRel_mm = readI32(b + 16);
      break;
    }

    case MSG_VFR_HUD: {
      // Wire: airspeed(f@0), groundspeed(f@4), alt(f@8),
      //       climb(f@12), heading(i16@16), throttle(u16@18)
      tel.airspeed    = readF32(b + 0);
      tel.groundspeed = readF32(b + 4);
      int16_t hdg; memcpy(&hdg, b + 16, 2);
      tel.heading = (float)hdg;
      break;
    }
  }
}

// ── LED + Buzzer Göstergeleri ──────────────────────────────────────────────
void updateIndicators() {
  uint32_t now = millis();

  // GPS LED — 3D fix: sabit AÇIK | fix yok: 500ms yanıp sön
  if (tel.gpsFixType >= 3) {
    digitalWrite(PIN_LED_GPS, HIGH);
  } else {
    if (now - lastBlink >= 500) {
      lastBlink  = now;
      blinkState = !blinkState;
      digitalWrite(PIN_LED_GPS, blinkState ? HIGH : LOW);
    }
  }

  // Batarya LED
  if (tel.battPct >= 0) {
    if      (tel.battPct < 10) digitalWrite(PIN_LED_BAT, (now / 200) & 1);   // Hızlı yanıp sön
    else if (tel.battPct < 25) digitalWrite(PIN_LED_BAT, (now / 600) & 1);   // Yavaş yanıp sön
    else                       digitalWrite(PIN_LED_BAT, HIGH);               // Sabit açık
  }

  // ARM LED — kırmızı = silahlı
  digitalWrite(PIN_LED_ARM, tel.armed ? HIGH : LOW);

  // Bağlantı kesildi uyarısı (3 saniye HB yok)
  static uint32_t lastWarnMs = 0;
  if (tel.lastHB_ms > 0 && (now - tel.lastHB_ms > 3000)) {
    if (now - lastWarnMs > 2500) {
      lastWarnMs = now;
      // Çift bip: bağlantı kesildi
      digitalWrite(PIN_BUZZER, HIGH); delay(80);
      digitalWrite(PIN_BUZZER, LOW);  delay(80);
      digitalWrite(PIN_BUZZER, HIGH); delay(80);
      digitalWrite(PIN_BUZZER, LOW);
    }
  }

  // Düşük batarya bip (<%10)
  static uint32_t lastBatWarnMs = 0;
  if (tel.battPct >= 0 && tel.battPct < 10 && (now - lastBatWarnMs > 5000)) {
    lastBatWarnMs = now;
    // Uzun tek bip
    digitalWrite(PIN_BUZZER, HIGH); delay(500);
    digitalWrite(PIN_BUZZER, LOW);
  }
}

// ── USB → GCS JSON Telemetri Çıkışı ───────────────────────────────────────
void printTelemetry() {
  static uint32_t lastPrint = 0;
  if (millis() - lastPrint < 200) return;   // 5 Hz
  lastPrint = millis();

  GCS_SERIAL.print(F("{\"lat\":"));      GCS_SERIAL.print(tel.lat);
  GCS_SERIAL.print(F(",\"lon\":"));      GCS_SERIAL.print(tel.lon);
  GCS_SERIAL.print(F(",\"altMSL\":"));   GCS_SERIAL.print(tel.altMSL_mm / 1000.0f, 1);
  GCS_SERIAL.print(F(",\"altRel\":"));   GCS_SERIAL.print(tel.altRel_mm / 1000.0f, 1);
  GCS_SERIAL.print(F(",\"gs\":"));       GCS_SERIAL.print(tel.groundspeed, 1);
  GCS_SERIAL.print(F(",\"as\":"));       GCS_SERIAL.print(tel.airspeed, 1);
  GCS_SERIAL.print(F(",\"hdg\":"));      GCS_SERIAL.print(tel.heading, 0);
  GCS_SERIAL.print(F(",\"roll\":"));     GCS_SERIAL.print(degrees(tel.roll_rad), 1);
  GCS_SERIAL.print(F(",\"pitch\":"));    GCS_SERIAL.print(degrees(tel.pitch_rad), 1);
  GCS_SERIAL.print(F(",\"batV\":"));     GCS_SERIAL.print(tel.battVolt_mV / 1000.0f, 2);
  GCS_SERIAL.print(F(",\"bat%\":"));     GCS_SERIAL.print(tel.battPct);
  GCS_SERIAL.print(F(",\"gpsfix\":"));   GCS_SERIAL.print(tel.gpsFixType);
  GCS_SERIAL.print(F(",\"sats\":"));     GCS_SERIAL.print(tel.gpsSats);
  GCS_SERIAL.print(F(",\"armed\":"));    GCS_SERIAL.print(tel.armed ? 1 : 0);
  GCS_SERIAL.println(F("}"));
}

// ── USB'den Komut İşleme (GCS → Arduino) ──────────────────────────────────
// Komutlar: D=Drop payload, R=Reset payload, C=Kamera tetik
void processUSBCommands() {
  while (GCS_SERIAL.available()) {
    char cmd = (char)GCS_SERIAL.read();
    switch (cmd) {
      case 'D':   // Payload bırak
        if (!payloadDropped) {
          payloadServo.write(90);     // 90° → açık
          payloadDropped = true;
          digitalWrite(PIN_BUZZER, HIGH); delay(200); digitalWrite(PIN_BUZZER, LOW);
          GCS_SERIAL.println(F("{\"event\":\"payload_dropped\"}"));
        }
        break;
      case 'R':   // Payload sıfırla
        payloadServo.write(0);
        payloadDropped = false;
        GCS_SERIAL.println(F("{\"event\":\"payload_reset\"}"));
        break;
      case 'C':   // Kamera tetikle
        digitalWrite(PIN_CAM_TRIG, HIGH);
        delay(100);
        digitalWrite(PIN_CAM_TRIG, LOW);
        GCS_SERIAL.println(F("{\"event\":\"cam_trigger\"}"));
        break;
    }
  }
}

// ── Köprü: FC ↔ SiK Radio (şeffaf iletim) ────────────────────────────────
// Pixhawk ↔ SiK radio arasındaki GCS bağlantısı için köprü
// Bu blok, GCS'in Pixhawk ile SiK üzerinden doğrudan iletişim kurmasını sağlar
void bridgeSerials() {
  // FC → Radio
  while (FC_SERIAL.available()) {
    uint8_t b = FC_SERIAL.read();
    RADIO_SERIAL.write(b);
    // Aynı zamanda kendi parser'ımıza besle
    if (parser.feed(b)) handlePacket();
  }
  // Radio → FC
  while (RADIO_SERIAL.available()) {
    FC_SERIAL.write(RADIO_SERIAL.read());
  }
}

// ── Setup ──────────────────────────────────────────────────────────────────
void setup() {
  GCS_SERIAL.begin(GCS_BAUD);
  FC_SERIAL.begin(FC_BAUD);
  RADIO_SERIAL.begin(RADIO_BAUD);

  pinMode(PIN_LED_GPS,  OUTPUT);
  pinMode(PIN_LED_BAT,  OUTPUT);
  pinMode(PIN_LED_ARM,  OUTPUT);
  pinMode(PIN_BUZZER,   OUTPUT);
  pinMode(PIN_CAM_TRIG, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  payloadServo.attach(PIN_PAYLOAD);
  payloadServo.write(0);    // Kapalı konum

  // Başlangıç testi — tüm LED'ler + buzzer
  for (uint8_t i = 0; i < 3; i++) {
    digitalWrite(PIN_LED_GPS, HIGH);
    digitalWrite(PIN_LED_BAT, HIGH);
    digitalWrite(PIN_LED_ARM, HIGH);
    digitalWrite(PIN_BUZZER,  HIGH); delay(80);
    digitalWrite(PIN_LED_GPS, LOW);
    digitalWrite(PIN_LED_BAT, LOW);
    digitalWrite(PIN_LED_ARM, LOW);
    digitalWrite(PIN_BUZZER,  LOW);  delay(80);
  }

  GCS_SERIAL.println(F("{\"event\":\"boot\",\"fw\":\"X-NEU Companion v1.0\"}"));
}

// ── Loop ───────────────────────────────────────────────────────────────────
void loop() {
  bridgeSerials();      // FC ↔ Radio köprüsü (+ parser besleme)
  updateIndicators();   // LED + buzzer güncelle
  printTelemetry();     // USB üzerinden JSON gönder
  processUSBCommands(); // Laptop komutlarını işle
}
