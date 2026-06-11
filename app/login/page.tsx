import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-[#09090b]">
      {/* Radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(6,182,212,0.07) 0%, transparent 70%)",
        }}
      />
      <LoginForm />
    </div>
  );
}
