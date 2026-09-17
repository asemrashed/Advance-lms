/**
 * Fix missing/broken course, instructor, and partner images in AdvanceLMS.
 * Usage: node scripts/seed-images.mjs
 */
import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";

function loadEnv() {
  const env = fs.readFileSync(".env", "utf8");
  const match = env.match(/^\s*MONGODB_URI=(.+)$/m);
  if (!match) throw new Error("MONGODB_URI missing in .env");
  return match[1].trim();
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p.split(path.sep).join("/"));
  }
  return out;
}

function publicUrlFromDisk(diskPath) {
  return "/" + diskPath.replace(/^public\//, "");
}

function filenameFromUrl(url) {
  try {
    const u = String(url || "");
    const clean = u.split("?")[0];
    return path.basename(clean);
  } catch {
    return "";
  }
}

function pickCourseImage(title, localCourseUrls, index) {
  const t = (title || "").toLowerCase();
  if (/statistic|stats|data/.test(t)) {
    return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80";
  }
  if (/mechanic|physics|force|motion/.test(t)) {
    return "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=1200&q=80";
  }
  if (/pure\s*math|calculus|algebra|add\s*math|o-?level|grade|math/.test(t)) {
    return "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80";
  }
  if (/test|new course|am2027/.test(t)) {
    return "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";
  }
  if (localCourseUrls.length) {
    return localCourseUrls[index % localCourseUrls.length];
  }
  return "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80";
}

function needsImageFix(url) {
  const u = String(url || "").trim();
  if (!u) return true;
  if (u.startsWith("data:")) return true;
  if (u.includes("nasmatics-lms.s3.")) return true;
  if (u.includes("encrypted-tbn0.gstatic.com")) return true;
  return false;
}

function uiAvatar(name) {
  const n = encodeURIComponent(name || "Instructor");
  return `https://ui-avatars.com/api/?name=${n}&background=0f4c81&color=fff&size=512&bold=true`;
}

const uri = loadEnv();
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });

const uploadFiles = walk("public/uploads");
const byBasename = new Map(
  uploadFiles.map((f) => [path.basename(f), publicUrlFromDisk(f)]),
);
const localCourseUrls = uploadFiles
  .filter((f) => f.includes("/courses/"))
  .map(publicUrlFromDisk);
const localAvatarUrls = uploadFiles
  .filter((f) => f.includes("/avatars/"))
  .map(publicUrlFromDisk);

function remapToLocal(url) {
  const base = filenameFromUrl(url);
  if (base && byBasename.has(base)) return byBasename.get(base);
  return null;
}

try {
  await client.connect();
  const db = client.db("AdvanceLMS");

  // --- Courses ---
  const courses = await db.collection("courses").find({}).toArray();
  let courseUpdated = 0;
  for (let i = 0; i < courses.length; i++) {
    const c = courses[i];
    const current = c.thumbnailUrl || "";
    let next = current;

    const localHit = remapToLocal(current);
    if (localHit) {
      next = localHit;
    } else if (needsImageFix(current)) {
      next = pickCourseImage(c.title, localCourseUrls, i);
    }

    if (next !== current) {
      await db.collection("courses").updateOne(
        { _id: c._id },
        { $set: { thumbnailUrl: next } },
      );
      courseUpdated++;
      console.log(`course: ${c.title} -> ${next.slice(0, 90)}`);
    }
  }

  // --- Instructors ---
  const instructors = await db
    .collection("users")
    .find({ role: "instructor" })
    .toArray();
  let instructorUpdated = 0;
  let avatarPoolIdx = 0;
  for (const u of instructors) {
    const current = u.avatar || "";
    let next = current;
    const localHit = remapToLocal(current);
    if (localHit) {
      next = localHit;
    } else if (!current || current.includes("nasmatics-lms.s3.")) {
      if (localAvatarUrls.length) {
        next = localAvatarUrls[avatarPoolIdx % localAvatarUrls.length];
        avatarPoolIdx++;
      } else {
        next = uiAvatar(u.name);
      }
    }
    if (next !== current) {
      await db.collection("users").updateOne(
        { _id: u._id },
        { $set: { avatar: next } },
      );
      instructorUpdated++;
      console.log(`instructor: ${u.name} -> ${next.slice(0, 90)}`);
    }
  }

  // --- Partners (CMS site-content) ---
  const site = await db.collection("site-content").findOne({});
  let partnerUpdated = 0;
  if (site?.content?.partners?.items?.length) {
    const items = site.content.partners.items.map((item) => {
      const current = item.imageUrl || "";
      const localHit = remapToLocal(current);
      if (localHit && localHit !== current) {
        partnerUpdated++;
        console.log(`partner: ${item.name} -> ${localHit}`);
        return { ...item, imageUrl: localHit };
      }
      if (!current) {
        // Fallback brand logos for common names
        const logoByName = {
          SSLCommerz: byBasename.get(
            "1779182263521-0f9d4b49-3424-440e-bb8d-f0a2cc568fba.png",
          ),
          Visa: byBasename.get(
            "1779182600328-2a700302-5b50-4868-bd49-70b4342c6cc8.png",
          ),
          Mastercard: byBasename.get(
            "1779182830052-2653a1cb-872e-4bb4-bf0f-fb41f86a9d95.png",
          ),
          HubSpot: "https://logo.clearbit.com/hubspot.com",
          Zoom: "https://logo.clearbit.com/zoom.us",
          Zendesk: "https://logo.clearbit.com/zendesk.com",
          Notion: "https://logo.clearbit.com/notion.so",
          Slack: "https://logo.clearbit.com/slack.com",
        };
        const fallback = logoByName[item.name];
        if (fallback) {
          partnerUpdated++;
          console.log(`partner: ${item.name} -> ${fallback}`);
          return { ...item, imageUrl: fallback };
        }
      }
      return item;
    });

    if (partnerUpdated > 0) {
      await db.collection("site-content").updateOne(
        { _id: site._id },
        {
          $set: {
            "content.partners.items": items,
            updatedAt: new Date(),
          },
        },
      );
    }
  }

  console.log("\nDone.");
  console.log({ courseUpdated, instructorUpdated, partnerUpdated });
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
