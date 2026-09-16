import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { accountStatusToFlags } from "@/lib/accountStatus";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import {
  getBdPhoneLookupVariants,
  isValidBdPhone,
  toBdLocalPhone,
} from "@/lib/phone";

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      role = "student",
      experience,
      education,
      passOutInstitute,
      specialization,
    } = await request.json();

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Name, email, password and confirm password are required" },
        { status: 400 },
      );
    }

    const accountRole = role === "instructor" ? "instructor" : "student";
    const cleanEmail = normalizeEmail(String(email));

    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 },
      );
    }

    let cleanPhone: string | undefined;
    const phoneRaw = String(phone || "").trim();
    if (phoneRaw) {
      cleanPhone = toBdLocalPhone(phoneRaw);
      if (!isValidBdPhone(cleanPhone)) {
        return NextResponse.json(
          {
            error:
              "Enter a valid Bangladesh mobile number (01XXXXXXXXX or +8801XXXXXXXXX)",
          },
          { status: 400 },
        );
      }
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Password and confirm password do not match" },
        { status: 400 },
      );
    }

    const trimmedName = String(name).trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    if (accountRole === "instructor") {
      const institute = String(passOutInstitute || "").trim();
      if (!institute) {
        return NextResponse.json(
          { error: "Pass out institute is required for instructor registration" },
          { status: 400 },
        );
      }
    }

    await connectDB();

    const existingEmail = await User.findOne({ email: cleanEmail }).select("_id");
    if (existingEmail) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 409 },
      );
    }

    if (cleanPhone) {
      const existingPhone = await User.findOne({
        phone: { $in: getBdPhoneLookupVariants(cleanPhone) },
      }).select("_id");
      if (existingPhone) {
        return NextResponse.json(
          { error: "User already exists with this phone number" },
          { status: 409 },
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const statusFlags =
      accountRole === "instructor"
        ? accountStatusToFlags("pending")
        : accountStatusToFlags("active");

    const user = await User.create({
      name: trimmedName,
      email: cleanEmail,
      ...(cleanPhone ? { phone: cleanPhone } : {}),
      password: hashedPassword,
      role: accountRole,
      ...statusFlags,
      ...(accountRole === "instructor" && {
        passOutInstitute: String(passOutInstitute).trim(),
        experience: experience ? String(experience).trim() : undefined,
        education: education ? String(education).trim() : undefined,
        specialization: specialization
          ? String(specialization).trim()
          : undefined,
      }),
    });

    const message =
      accountRole === "instructor"
        ? "Instructor application submitted. An admin will review your request."
        : "User created successfully";

    return NextResponse.json(
      { message, user: user.toJSON(), role: accountRole },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
