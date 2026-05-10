
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const pino = require("pino");
const fs = require("fs-extra");
const dotenv = require("dotenv");

dotenv.config();

const OWNER_PHONE = process.env.212616184294;
const API_KEY = process.env.AIzaSyAm9KoBh4jMKUKEQHkDXVr4V5JqeLJqKiw;

const dbFile = './abid_shop_db.json';

if (!fs.existsSync(dbFile)) {
    fs.writeJsonSync(dbFile, {
        settings: { autoReply: true },
        customers: {}
    });
}

let db = fs.readJsonSync(dbFile);

const saveDB = () => fs.writeJsonSync(dbFile, db);

const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `
أنت موظف محترف لمتجر ABID SHOP 😈🔥
كتجاوب بالدارجة المغربية بشكل طبيعي.
كتبيع:
- حسابات Free Fire
- جواهر
- خدمات AI
- تصاميم
- خدمات سوشيال ميديا

جاوب باحترافية وقصر الهضرة.
`
});

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("abid_session");

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        browser: ["ABID SHOP 😈", "Safari", "2.0"]
    });

    if (!sock.authState.creds.registered) {

        setTimeout(async () => {

            const code = await sock.requestPairingCode(OWNER_PHONE);

            console.log(`
😈🔥 ABID SHOP PAIRING CODE:

${code}
            `);

        }, 3000);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {

        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                startBot();
            }

        } else if (connection === "open") {

            console.log("✅ BOT ONLINE 😈🔥");
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {

        const m = messages[0];

        if (!m.message || m.key.fromMe) return;

        const jid = m.key.remoteJid;

        const text =
            m.message.conversation ||
            m.message.extendedTextMessage?.text ||
            "";

        if (!text) return;

        try {

            const result = await model.generateContent(text);

            const response = result.response.text();

            await sock.sendPresenceUpdate("composing", jid);

            await delay(1500);

            await sock.sendMessage(jid, {
                text: response
            });

        } catch (err) {

            console.log(err);

        }

    });

}

startBot();
