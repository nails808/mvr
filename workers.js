
const SESSION_IDLE_MS = 12 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 100000;

export default {
    async fetch(request, env) {

        const url = new URL(request.url);

        try {

            // HEALTH CHECK
            if (url.pathname === "/" && request.method === "GET") {
                return json({
                    success: true,
                    service: "Telegram User Manager",
                    status: "online"
                });
            }

            // TELEGRAM WEBHOOK
            if (url.pathname === "/telegram" && request.method === "POST") {

                const secret = request.headers.get(
                    "X-Telegram-Bot-Api-Secret-Token"
                );

                if (
                    !secret ||
                    !constantTimeEqual(secret, env.BOT_SECRET)
                ) {
                    return new Response("Unauthorized", {
                        status: 403
                    });
                }

                const update = await request.json();

                if (update.message) {
                    await handleTelegram(update.message, env);
                }

                return new Response("OK");
            }

            // ALL APPLICATION ENDPOINTS REQUIRE SERVER API KEY
            if (url.pathname.startsWith("/auth/")) {

                if (request.method !== "POST") {
                    return json({
                        success: false,
                        message: "POST required"
                    }, 405);
                }

                if (!authorizedApp(request, env)) {
                    return json({
                        success: false,
                        message: "Unauthorized"
                    }, 401);
                }

                if (url.pathname === "/auth/login") {
                    return await authenticateUser(request, env);
                }

                if (url.pathname === "/auth/validate") {
                    return await validateSession(request, env);
                }

                if (url.pathname === "/auth/logout") {
                    return await logoutUser(request, env);
                }
            }

            return json({
                success: false,
                message: "Endpoint not found"
            }, 404);

        } catch (error) {

            console.error("Worker error:", error.message);

            return json({
                success: false,
                message: "Internal server error"
            }, 500);
        }
    }
};


// ==================================================
// GENERAL UTILITIES
// ==================================================

function json(data, status = 200) {

    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
}


function constantTimeEqual(a, b) {

    if (typeof a !== "string" || typeof b !== "string") {
        return false;
    }

    let difference = a.length ^ b.length;

    const length = Math.max(a.length, b.length);

    for (let i = 0; i < length; i++) {
        difference |=
            (a.charCodeAt(i) || 0) ^
            (b.charCodeAt(i) || 0);
    }

    return difference === 0;
}


function validUsername(username) {

    return typeof username === "string" &&
        /^[a-zA-Z0-9_.-]{3,32}$/.test(username);
}


function validPassword(password) {

    return typeof password === "string" &&
        password.length >= 8 &&
        password.length <= 128;
}


function formatDate(value) {

    if (!value) return "Never";

    return new Date(value).toLocaleString("en-AU", {
        timeZone: "Australia/Melbourne",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}


// ==================================================
// PASSWORD HASHING
// ==================================================

async function hashPassword(password) {

    const saltBytes = crypto.getRandomValues(
        new Uint8Array(16)
    );

    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const result = await crypto.subtle.deriveBits({
        name: "PBKDF2",
        salt: saltBytes,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256"
    }, key, 256);

    return {
        salt: toBase64(saltBytes),
        hash: toHex(new Uint8Array(result))
    };
}


async function verifyPassword(password, salt, expectedHash) {

    const saltBytes = fromBase64(salt);

    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const result = await crypto.subtle.deriveBits({
        name: "PBKDF2",
        salt: saltBytes,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256"
    }, key, 256);

    const calculated = toHex(new Uint8Array(result));

    return constantTimeEqual(calculated, expectedHash);
}


function toBase64(bytes) {

    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}


function fromBase64(value) {

    const binary = atob(value);

    return Uint8Array.from(
        binary,
        character => character.charCodeAt(0)
    );
}


function toHex(bytes) {

    return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}


// ==================================================
// SESSION TOKEN FUNCTIONS
// ==================================================

function generateSessionToken() {

    const bytes = crypto.getRandomValues(
        new Uint8Array(32)
    );

    return toHex(bytes);
}


async function hashSessionToken(token) {

    const bytes = new TextEncoder().encode(token);

    const result = await crypto.subtle.digest(
        "SHA-256",
        bytes
    );

    return toHex(new Uint8Array(result));
}


function getBearerToken(request) {

    const header = request.headers.get("Authorization") || "";

    if (!header.startsWith("Bearer ")) {
        return null;
    }

    const token = header.slice(7);

    return /^[a-f0-9]{64}$/.test(token) ? token : null;
}


// ==================================================
// APPLICATION API AUTHORIZATION
// ==================================================

function authorizedApp(request, env) {

    const key = request.headers.get("X-App-Key");

    return Boolean(
        key &&
        env.APP_API_KEY &&
        constantTimeEqual(key, env.APP_API_KEY)
    );
}


// ==================================================
// APPLICATION LOGIN
// ==================================================

async function authenticateUser(request, env) {

    const body = await request.json();

    const username = String(body.username || "").trim();
    const password = body.password;

    if (
        !validUsername(username) ||
        !validPassword(password)
    ) {
        return json({
            success: false,
            message: "Invalid username or password"
        }, 401);
    }

    // FIND USER

    const user = await env.DB.prepare(`
        SELECT id, username, password_hash,
               password_salt, status
        FROM users
        WHERE username = ? COLLATE NOCASE
    `).bind(username).first();

    if (!user || user.status !== "active") {
        return json({
            success: false,
            message: "Invalid username or password"
        }, 401);
    }

    // VERIFY PASSWORD

    const verified = await verifyPassword(
        password,
        user.password_salt,
        user.password_hash
    );

    if (!verified) {
        return json({
            success: false,
            message: "Invalid username or password"
        }, 401);
    }

    // GENERATE NEW SESSION

    const token = generateSessionToken();

    const tokenHash = await hashSessionToken(token);

    const now = new Date();

    const createdAt = now.toISOString();

    const expiresAt = new Date(
        now.getTime() + SESSION_IDLE_MS
    ).toISOString();

    // ATOMIC SINGLE SESSION ENFORCEMENT
    //
    // A currently active session cannot be replaced.
    // An expired session can be replaced.

    const result = await env.DB.prepare(`
        INSERT INTO sessions (
            user_id,
            session_token_hash,
            created_at,
            last_activity,
            expires_at
        )
        VALUES (?, ?, ?, ?, ?)

        ON CONFLICT(user_id) DO UPDATE SET
            session_token_hash = excluded.session_token_hash,
            created_at = excluded.created_at,
            last_activity = excluded.last_activity,
            expires_at = excluded.expires_at

        WHERE sessions.expires_at <= excluded.created_at
    `).bind(
        user.id,
        tokenHash,
        createdAt,
        createdAt,
        expiresAt
    ).run();

    if (result.meta.changes !== 1) {

        return json({
            success: false,
            code: "SESSION_ALREADY_ACTIVE",
            message: "Account already logged in on another device"
        }, 409);
    }

    // RECORD SUCCESSFUL LOGIN

    await env.DB.batch([

        env.DB.prepare(`
            UPDATE users
            SET last_logged_in = ?
            WHERE id = ?
        `).bind(createdAt, user.id),

        env.DB.prepare(`
            INSERT INTO login_history (user_id, login_at)
            VALUES (?, ?)
        `).bind(user.id, createdAt)

    ]);

    // RETURN RAW TOKEN ONCE
    // ONLY THE APPLICATION BACKEND SHOULD RECEIVE THIS.

    return json({
        success: true,
        username: user.username,
        session_token: token,
        expires_at: expiresAt
    });
}


// ==================================================
// VALIDATE AND EXTEND SESSION
// ==================================================

async function validateSession(request, env) {

    const token = getBearerToken(request);

    if (!token) {
        return json({
            success: false,
            message: "Invalid session"
        }, 401);
    }

    const tokenHash = await hashSessionToken(token);

    const now = new Date();

    const currentTime = now.toISOString();

    const newExpiry = new Date(
        now.getTime() + SESSION_IDLE_MS
    ).toISOString();

    // UPDATE ONLY IF SESSION IS STILL VALID

    const result = await env.DB.prepare(`
        UPDATE sessions

        SET last_activity = ?,
            expires_at = ?

        WHERE session_token_hash = ?
        AND expires_at > ?

        AND EXISTS (
            SELECT 1
            FROM users
            WHERE users.id = sessions.user_id
            AND users.status = 'active'
        )
    `).bind(
        currentTime,
        newExpiry,
        tokenHash,
        currentTime
    ).run();

    if (result.meta.changes !== 1) {

        return json({
            success: false,
            message: "Session expired or terminated"
        }, 401);
    }

    const user = await env.DB.prepare(`
        SELECT u.username
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.session_token_hash = ?
    `).bind(tokenHash).first();

    if (!user) {
        return json({
            success: false,
            message: "Session no longer exists"
        }, 401);
    }

    return json({
        success: true,
        username: user.username,
        expires_at: newExpiry
    });
}


// ==================================================
// LOGOUT
// ==================================================

async function logoutUser(request, env) {

    const token = getBearerToken(request);

    if (!token) {
        return json({
            success: false,
            message: "Invalid session"
        }, 401);
    }

    const tokenHash = await hashSessionToken(token);

    await env.DB.prepare(`
        DELETE FROM sessions
        WHERE session_token_hash = ?
    `).bind(tokenHash).run();

    return json({
        success: true,
        message: "Logged out successfully"
    });
}


// ==================================================
// TELEGRAM MESSAGE HANDLING
// ==================================================

async function handleTelegram(message, env) {

    if (!message.text || !message.chat) return;

    if (message.chat.type !== "private") return;

    const chatId = message.chat.id;

    const userId = String(message.from?.id || "");

    const admins = (env.ADMIN_IDS || "")
        .split(",")
        .map(value => value.trim());

    if (!admins.includes(userId)) {

        await sendTelegram(chatId, env, "⛔ Access denied.");

        return;
    }

    // COMMAND PARSING

    const match = message.text.trim().match(
        /^\/([a-z]+)(?:@\w+)?(?:\s+(\S+))?(?:\s+([\s\S]+))?$/i
    );

    if (!match) {
        await sendTelegram(chatId, env, "Use /help.");
        return;
    }

    const command = match[1].toLowerCase();

    const username = match[2] || "";

    const password = match[3] || "";


    // HELP

    if (command === "start" || command === "help") {

        await sendTelegram(chatId, env,
            "🤖 USER MANAGEMENT SYSTEM\n\n" +
            "/add username password\n" +
            "Create account\n\n" +
            "/del username\n" +
            "Delete account\n\n" +
            "/edit username password\n" +
            "Change password\n\n" +
            "/search username\n" +
            "Search account\n\n" +
            "/list\n" +
            "List accounts\n\n" +
            "/count\n" +
            "Count accounts\n\n" +
            "/recent\n" +
            "Recent logins\n\n" +
            "/kick username\n" +
            "Terminate active session\n\n" +
            "/help\n" +
            "Show help"
        );

        return;
    }


    // ADD ACCOUNT

    if (command === "add") {

        if (
            !validUsername(username) ||
            !validPassword(password)
        ) {
            await sendTelegram(chatId, env,
                "Usage: /add username password\n\n" +
                "Username: 3-32 characters\n" +
                "Password: 8-128 characters"
            );

            return;
        }

        const hashed = await hashPassword(password);

        try {

            await env.DB.prepare(`
                INSERT INTO users (
                    username,
                    password_hash,
                    password_salt,
                    created_at
                )
                VALUES (?, ?, ?, ?)
            `).bind(
                username,
                hashed.hash,
                hashed.salt,
                new Date().toISOString()
            ).run();

            await sendTelegram(chatId, env,
                "✅ ACCOUNT CREATED\n\n" +
                "Username: " + username
            );

        } catch (error) {

            await sendTelegram(chatId, env,
                "❌ Username already exists or database error."
            );
        }

        return;
    }


    // DELETE ACCOUNT

    if (command === "del") {

        if (!validUsername(username)) {
            await sendTelegram(chatId, env,
                "Usage: /del username"
            );

            return;
        }

        const user = await env.DB.prepare(`
            SELECT id, username
            FROM users
            WHERE username = ? COLLATE NOCASE
        `).bind(username).first();

        if (!user) {
            await sendTelegram(chatId, env,
                "❌ Username not found."
            );

            return;
        }

        await env.DB.batch([

            env.DB.prepare(
                "DELETE FROM sessions WHERE user_id = ?"
            ).bind(user.id),

            env.DB.prepare(
                "DELETE FROM login_history WHERE user_id = ?"
            ).bind(user.id),

            env.DB.prepare(
                "DELETE FROM users WHERE id = ?"
            ).bind(user.id)

        ]);

        await sendTelegram(chatId, env,
            "✅ ACCOUNT DELETED\n\nUsername: " + user.username
        );

        return;
    }


    // EDIT PASSWORD

    if (command === "edit") {

        if (
            !validUsername(username) ||
            !validPassword(password)
        ) {
            await sendTelegram(chatId, env,
                "Usage: /edit username newpassword"
            );

            return;
        }

        const user = await env.DB.prepare(`
            SELECT id
            FROM users
            WHERE username = ? COLLATE NOCASE
        `).bind(username).first();

        if (!user) {
            await sendTelegram(chatId, env,
                "❌ Username not found."
            );

            return;
        }

        const hashed = await hashPassword(password);

        await env.DB.batch([

            env.DB.prepare(`
                UPDATE users
                SET password_hash = ?,
                    password_salt = ?
                WHERE id = ?
            `).bind(
                hashed.hash,
                hashed.salt,
                user.id
            ),

            env.DB.prepare(`
                DELETE FROM sessions
                WHERE user_id = ?
            `).bind(user.id)

        ]);

        await sendTelegram(chatId, env,
            "✅ PASSWORD UPDATED\n\n" +
            "Username: " + username +
            "\nExisting session terminated."
        );

        return;
    }


    // SEARCH ACCOUNT

    if (command === "search") {

        if (!validUsername(username)) {
            await sendTelegram(chatId, env,
                "Usage: /search username"
            );

            return;
        }

        const user = await env.DB.prepare(`
            SELECT
                u.id,
                u.username,
                u.created_at,
                u.last_logged_in,
                u.status,

                CASE
                    WHEN s.user_id IS NOT NULL THEN 1
                    ELSE 0
                END AS logged_in

            FROM users u

            LEFT JOIN sessions s
                ON s.user_id = u.id
                AND s.expires_at > ?

            WHERE u.username = ? COLLATE NOCASE
        `).bind(
            new Date().toISOString(),
            username
        ).first();

        if (!user) {
            await sendTelegram(chatId, env,
                "❌ Username not found."
            );

            return;
        }

        await sendTelegram(chatId, env,
            "🔎 ACCOUNT DETAILS\n\n" +
            "Username: " + user.username + "\n" +
            "Created: " + formatDate(user.created_at) + "\n" +
            "Last login: " + formatDate(user.last_logged_in) + "\n" +
            "Session: " + (user.logged_in ? "Active" : "Inactive") + "\n" +
            "Status: " + user.status
        );

        return;
    }


    // COUNT ACCOUNTS

    if (command === "count") {

        const result = await env.DB.prepare(
            "SELECT COUNT(*) AS total FROM users"
        ).first();

        await sendTelegram(chatId, env,
            "📊 DATABASE STATISTICS\n\n" +
            "Total accounts: " + result.total
        );

        return;
    }


    // LIST ACCOUNTS

    if (command === "list") {

        const result = await env.DB.prepare(`
            SELECT
                u.username,
                u.last_logged_in,
                u.status,

                CASE
                    WHEN s.user_id IS NOT NULL THEN 'Active'
                    ELSE 'Inactive'
                END AS session_status

            FROM users u

            LEFT JOIN sessions s
                ON s.user_id = u.id
                AND s.expires_at > ?

            ORDER BY u.username COLLATE NOCASE
            LIMIT 100
        `).bind(
            new Date().toISOString()
        ).all();

        if (!result.results.length) {
            await sendTelegram(chatId, env,
                "No registered accounts."
            );

            return;
        }

        const total = await env.DB.prepare(
            "SELECT COUNT(*) AS total FROM users"
        ).first();

        const lines = result.results.map((user, index) =>
            (index + 1) + ". " + user.username +
            "\nSession: " + user.session_status +
            "\nLast login: " + formatDate(user.last_logged_in) +
            "\nStatus: " + user.status
        );

        await sendChunks(
            chatId,
            env,
            "👥 REGISTERED ACCOUNTS\n\n",
            lines,
            "\nTotal accounts: " + total.total +
            "\nShowing maximum 100 accounts."
        );

        return;
    }


    // RECENT LOGINS

    if (command === "recent") {

        const result = await env.DB.prepare(`
            SELECT u.username, h.login_at

            FROM login_history h

            JOIN users u ON u.id = h.user_id

            ORDER BY h.login_at DESC

            LIMIT 20
        `).all();

        if (!result.results.length) {
            await sendTelegram(chatId, env,
                "No successful logins recorded."
            );

            return;
        }

        let output = "🕒 RECENT LOGINS\n\n";

        result.results.forEach((record, index) => {

            output +=
                (index + 1) + ". " + record.username +
                "\n" + formatDate(record.login_at) +
                "\n\n";
        });

        await sendTelegram(chatId, env, output);

        return;
    }


    // FORCE LOGOUT

    if (command === "kick") {

        if (!validUsername(username)) {
            await sendTelegram(chatId, env,
                "Usage: /kick username"
            );

            return;
        }

        const user = await env.DB.prepare(`
            SELECT id, username
            FROM users
            WHERE username = ? COLLATE NOCASE
        `).bind(username).first();

        if (!user) {
            await sendTelegram(chatId, env,
                "❌ Username not found."
            );

            return;
        }

        const result = await env.DB.prepare(`
            DELETE FROM sessions
            WHERE user_id = ?
        `).bind(user.id).run();

        await sendTelegram(chatId, env,
            result.meta.changes
                ? "✅ SESSION TERMINATED\n\nUsername: " + user.username
                : "ℹ️ No active session for " + user.username
        );

        return;
    }


    await sendTelegram(chatId, env,
        "Unknown command. Use /help."
    );
}


// ==================================================
// TELEGRAM FUNCTIONS
// ==================================================

async function sendTelegram(chatId, env, text) {

    const response = await fetch(
        "https://api.telegram.org/bot" +
        env.BOT_TOKEN + "/sendMessage",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                chat_id: chatId,
                text
            })
        }
    );

    if (!response.ok) {
        console.error("Telegram message failed.");
    }
}


async function sendChunks(chatId, env, header, lines, footer) {

    let current = header;

    for (const line of lines) {

        if ((current + line + "\n\n" + footer).length > 3500) {

            await sendTelegram(chatId, env, current);

            current = "";
        }

        current += line + "\n\n";
    }

    if (current) {
        await sendTelegram(chatId, env, current + footer);
    }
}
