/**
 * Phase 13.4.9 — CMS public pages E2E (API + HTML verification).
 * Run: node scripts/e2e-cms-public-pages.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const BASE = (env.NEXTAUTH_URL || "http://localhost:3000").trim();
const ADMIN_PHONE = "01987654323";
const ADMIN_PASSWORD = "E2ETestAdmin!9";
const MARKER = `E2E-${Date.now()}`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function fetchText(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "text/html" } });
  assert(res.ok, `${path} HTTP ${res.status}`);
  return res.text();
}

async function loginAdmin() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  assert(csrfRes.ok, `csrf HTTP ${csrfRes.status}`);
  const { csrfToken } = await csrfRes.json();

  const jar = new Map();
  for (const c of csrfRes.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    jar.set(k.trim(), v);
  }

  const body = new URLSearchParams();
  body.set("csrfToken", csrfToken);
  body.set("phone", ADMIN_PHONE);
  body.set("password", ADMIN_PASSWORD);
  body.set("redirect", "false");
  body.set("json", "true");

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    body,
    redirect: "manual",
  });

  for (const c of loginRes.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    jar.set(k.trim(), v);
  }

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ") },
  });
  const session = await sessionRes.json();
  assert(session?.user?.role === "admin", "admin session not established");

  return {
    cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
  };
}

async function adminGet(cookie) {
  const res = await fetch(`${BASE}/api/admin/website-content`, {
    headers: { Cookie: cookie },
  });
  const json = await res.json();
  assert(res.ok && json.success, `admin GET failed: ${JSON.stringify(json)}`);
  return json.data;
}

async function adminPost(cookie, settings) {
  const res = await fetch(`${BASE}/api/admin/website-content`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
  });
  const json = await res.json();
  assert(res.ok && json.success, `admin POST failed: ${JSON.stringify(json)}`);
  return json.data;
}

async function adminReset(cookie) {
  const res = await fetch(`${BASE}/api/admin/website-content`, {
    method: "PUT",
    headers: { Cookie: cookie },
  });
  const json = await res.json();
  assert(res.ok && json.success, `admin PUT reset failed: ${JSON.stringify(json)}`);
  return json.data;
}

function checkNoHydrationWarnings(html, page) {
  const bad = [
    "Hydration failed",
    "Text content does not match",
    "There was an error while hydrating",
  ].filter((s) => html.includes(s));
  assert(bad.length === 0, `${page}: possible hydration error in HTML: ${bad.join(", ")}`);
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const users = mongoose.connection.collection("users");
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await users.updateOne({ role: "admin", phone: ADMIN_PHONE }, { $set: { password: hash } });

  console.log("Logging in as admin...");
  const { cookie } = await loginAdmin();

  let settings = await adminGet(cookie);
  const baseline = structuredClone(settings);

  // 1. Hero headline
  const heroMarker = `${MARKER}-HERO`;
  settings.hero ??= {};
  settings.hero.title ??= {};
  settings.hero.title.part1 = heroMarker;
  await adminPost(cookie, settings);
  let home = await fetchText("/");
  assert(home.includes(heroMarker), "home: hero headline not found after save");
  checkNoHydrationWarnings(home, "/");
  console.log("✓ 1. Hero headline");

  // 2. FAQ
  const faqMarker = `${MARKER}-FAQ-QUESTION`;
  settings = await adminGet(cookie);
  settings.faq ??= {};
  settings.faq.faqs = [
    { id: 1, question: faqMarker, answer: "E2E answer", order: 1 },
    ...(settings.faq.faqs ?? []).slice(1),
  ];
  await adminPost(cookie, settings);
  home = await fetchText("/");
  assert(home.includes(faqMarker), "home: FAQ question not found after save");
  checkNoHydrationWarnings(home, "/ (faq)");
  console.log("✓ 2. FAQ items");

  // 2b. Testimonials
  const testimonialMarker = `${MARKER}-TESTIMONIAL`;
  settings = await adminGet(cookie);
  settings.blog ??= {};
  settings.blog.posts = [
    {
      id: 1,
      image: settings.blog.posts?.[0]?.image ?? "",
      date: "",
      author: "E2E User",
      authorBengali: "E2E User",
      comments: "",
      commentsBengali: "",
      title: testimonialMarker,
      titleBengali: testimonialMarker,
      description: "E2E Role",
      descriptionBengali: "E2E Role",
    },
    ...(settings.blog.posts ?? []).slice(1),
  ];
  await adminPost(cookie, settings);
  home = await fetchText("/");
  assert(home.includes(testimonialMarker), "home: testimonial not found after save");
  console.log("✓ 2b. Testimonials");

  // 3. About body
  const aboutMarker = `${MARKER}-ABOUT-BODY`;
  settings = await adminGet(cookie);
  settings.aboutPage ??= {};
  settings.aboutPage.aboutContent = aboutMarker;
  await adminPost(cookie, settings);
  const aboutHtml = await fetchText("/about");
  assert(aboutHtml.includes(aboutMarker), "/about: body text not found after save");
  checkNoHydrationWarnings(aboutHtml, "/about");
  console.log("✓ 3. About body text");

  // 4. Contact email
  const emailMarker = `${MARKER}@eduplatform.test`;
  settings = await adminGet(cookie);
  settings.footer ??= {};
  settings.footer.contact ??= {};
  settings.footer.contact.email ??= {};
  settings.footer.contact.email.value = emailMarker;
  settings.contact ??= { registrationNumber: settings.contact?.registrationNumber ?? "" };
  await adminPost(cookie, settings);
  const contactHtml = await fetchText("/contact");
  assert(contactHtml.includes(emailMarker), "/contact: email not found after save");
  checkNoHydrationWarnings(contactHtml, "/contact");
  console.log("✓ 4. Contact email");

  // 5. Reset
  await adminReset(cookie);
  home = await fetchText("/");
  const aboutHtml2 = await fetchText("/about");
  const contactHtml2 = await fetchText("/contact");
  assert(!home.includes(heroMarker), "home: hero marker still present after reset");
  assert(!home.includes(faqMarker), "home: faq marker still present after reset");
  assert(!home.includes(testimonialMarker), "home: testimonial marker still present after reset");
  assert(!aboutHtml2.includes(aboutMarker), "/about: marker still present after reset");
  assert(!contactHtml2.includes(emailMarker), "/contact: email marker still present after reset");
  checkNoHydrationWarnings(home, "/ after reset");
  console.log("✓ 5. Reset to defaults");

  // Restore baseline if reset changed structure
  await adminPost(cookie, baseline);

  console.log("\nAll Phase 13.4.9 checks passed.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("E2E FAILED:", err.message);
  mongoose.disconnect().finally(() => process.exit(1));
});
