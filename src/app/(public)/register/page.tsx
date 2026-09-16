"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { AuthGuestOnly } from "@/components/auth/AuthGuestOnly";
import { PasswordField } from "@/components/auth/PasswordField";
import { sanitizePhoneInput } from "@/lib/sanitizePhone";

type RegisterRole = "student" | "instructor";

function RegisterForm() {
  const router = useRouter();
  const [role, setRole] = useState<RegisterRole>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passOutInstitute, setPassOutInstitute] = useState("");
  const [experience, setExperience] = useState("");
  const [education, setEducation] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isInstructor = role === "instructor";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        setError("Password and confirm password do not match.");
        return;
      }

      if (isInstructor && !passOutInstitute.trim()) {
        setError("Pass out institute is required for instructor registration.");
        return;
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
          confirmPassword,
          role,
          ...(isInstructor && {
            passOutInstitute: passOutInstitute.trim(),
            experience: experience.trim(),
            education: education.trim(),
            specialization: specialization.trim(),
          }),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "Registration failed.");
        return;
      }

      setSuccess(
        isInstructor
          ? "Application submitted. An admin will review your instructor request."
          : "Registration successful. Please sign in.",
      );
      setTimeout(() => {
        router.push("/login");
      }, isInstructor ? 1500 : 800);
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      sideTitle={isInstructor ? "Teach with AdvanceLMS" : "Join AdvanceLMS"}
      sideDescription={
        isInstructor
          ? "Apply to teach on the platform. Your application will be reviewed by our team."
          : "Create an account to track your progress, enroll in courses, and access your dashboard."
      }
    >
      <div className="rounded-2xl border border-border bg-card p-8 shadow-editorial">
        <h1 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-foreground">
          Create an account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isInstructor
            ? "Register as an instructor. You can sign in after admin approval."
            : "Register with your name, email, and password."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              role === "student"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => setRole("instructor")}
            className={`cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              role === "instructor"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Instructor
          </button>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-foreground">
            Name
            <input
              type="text"
              name="name"
              autoComplete="name"
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Phone{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
            <input
              type="tel"
              name="phone"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="01XXXXXXXXX or +8801XXXXXXXXX"
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
              value={phone}
              onChange={(event) =>
                setPhone(sanitizePhoneInput(event.target.value))
              }
            />
          </label>

          {isInstructor ? (
            <>
              <label className="block text-sm font-medium text-foreground">
                Pass out institute
                <input
                  type="text"
                  name="passOutInstitute"
                  placeholder="e.g. Dhaka College, BUET"
                  className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                  value={passOutInstitute}
                  onChange={(event) => setPassOutInstitute(event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Education (optional)
                <input
                  type="text"
                  name="education"
                  placeholder="e.g. BSc in Computer Science"
                  className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                  value={education}
                  onChange={(event) => setEducation(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Specialization (optional)
                <input
                  type="text"
                  name="specialization"
                  placeholder="e.g. Web Development, Physics"
                  className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                  value={specialization}
                  onChange={(event) => setSpecialization(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Teaching experience (optional)
                <input
                  type="text"
                  name="experience"
                  placeholder="e.g. 5+ years teaching HSC students"
                  className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                  value={experience}
                  onChange={(event) => setExperience(event.target.value)}
                />
              </label>
            </>
          ) : null}

          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            required
          />
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-green-700">{success}</p>
          ) : null}
          <button
            type="submit"
            className="w-full cursor-pointer rounded-xl bg-gradient-to-br from-primary to-primary-container py-3 font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            {loading
              ? isInstructor
                ? "Submitting application..."
                : "Creating account..."
              : isInstructor
                ? "Apply as instructor"
                : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="cursor-pointer font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}

export default function RegisterPage() {
  return (
    <AuthGuestOnly>
      <RegisterForm />
    </AuthGuestOnly>
  );
}
