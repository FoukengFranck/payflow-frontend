// src/app/auth/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation"; // ← Ajout pour la redirection
import {
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  Check,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Hand,
} from "lucide-react";
import { login, register as apiRegister } from "@/lib/api"; // ← Import du client API

// ─── Schemas ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Adresse email invalide").min(1, "Email requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Nom complet requis (min. 2 caractères)"),
    email: z
      .string()
      .email("Adresse email invalide")
      .min(1, "Email requis"),
    password: z
      .string()
      .min(8, "Minimum 8 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

// ─── Password Strength ───────────────────────────────────────────────────────

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Très faible", color: "#EF4444" };
  if (score === 2) return { score, label: "Faible", color: "#F59E0B" };
  if (score === 3) return { score, label: "Moyen", color: "#0EA5E9" };
  if (score === 4) return { score, label: "Fort", color: "#10B981" };
  return { score, label: "Très fort", color: "#10B981" };
}

// ─── Floating Transaction Cards (Left Panel) ─────────────────────────────────

// ✅ MODIFICATION : Montants en FCFA (sans décimales) + noms authentiques
const transactions = [
  {
    id: 1,
    name: "Aïcha Ngono",
    amount: "+45 000 FCFA",
    type: "in",
    avatar: "AN",
    time: "Il y a 2 min",
    label: "Remboursement loyer",
  },
  {
    id: 2,
    name: "Canal+",
    amount: "-5 000 FCFA",
    type: "out",
    avatar: "C+",
    time: "Il y a 1h",
    label: "Abonnement mensuel",
  },
  {
    id: 3,
    name: "Bruno Talla",
    amount: "+120 000 FCFA",
    type: "in",
    avatar: "BT",
    time: "Hier",
    label: "Vente Marketplace",
  },
];

function TransactionCard({
  tx,
  delay,
}: {
  tx: (typeof transactions)[0];
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
        style={{ background: "rgba(16,185,129,0.2)", color: "#10B981" }}
      >
        {tx.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{tx.name}</p>
        <p className="text-xs truncate" style={{ color: "#64748B" }}>
          {tx.label}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p
          className="text-sm font-semibold"
          style={{ color: tx.type === "in" ? "#10B981" : "#F1F5F9" }}
        >
          {tx.amount}
        </p>
        <p className="text-xs" style={{ color: "#475569" }}>
          {tx.time}
        </p>
      </div>
      {tx.type === "in" ? (
        <ArrowDownLeft
          size={14}
          style={{ color: "#10B981" }}
          className="shrink-0"
        />
      ) : (
        <ArrowUpRight
          size={14}
          style={{ color: "#64748B" }}
          className="shrink-0"
        />
      )}
    </motion.div>
  );
}

// ─── Logo ────────────────────────────────────────────────────────────────────

function PayFlowLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? 28 : size === "lg" ? 40 : 34;
  const text =
    size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-xl flex items-center justify-center"
        style={{
          width: s,
          height: s,
          background: "linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)",
          boxShadow: "0 0 20px rgba(16,185,129,0.4)",
        }}
      >
        <Zap size={s * 0.52} color="white" strokeWidth={2.5} />
      </div>
      <span className={`font-bold tracking-tight text-white ${text}`}>
        Pay<span style={{ color: "#10B981" }}>Flow</span>
      </span>
    </div>
  );
}

// ─── Input Field ─────────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  placeholder: string;
  type?: string;
  error?: string;
  rightElement?: React.ReactNode;
  register: ReturnType<typeof useForm>["register"];
  name: string;
}

function InputField({
  label,
  placeholder,
  type = "text",
  error,
  rightElement,
  register,
  name,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium" style={{ color: "#94A3B8" }}>
        {label}
      </label>
      <div className="relative">
        <motion.div
          animate={{
            boxShadow: focused
              ? "0 0 0 2px rgba(16,185,129,0.4)"
              : error
                ? "0 0 0 2px rgba(239,68,68,0.4)"
                : "0 0 0 1px rgba(255,255,255,0.08)",
          }}
          transition={{ duration: 0.15 }}
          className="rounded-xl overflow-hidden"
        >
          <input
            {...(register as any)(name)}
            type={type}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
            style={{
              background: focused
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.04)",
              borderRadius: "0.75rem",
            }}
          />
        </motion.div>
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
          >
            <AlertCircle size={12} style={{ color: "#EF4444" }} />
            <p className="text-xs" style={{ color: "#EF4444" }}>
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Google Button ────────────────────────────────────────────────────────────

function GoogleButton({ label }: { label: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.08)" }}
      whileTap={{ scale: 0.99 }}
      type="button"
      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-colors"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#E2E8F0",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      {label}
    </motion.button>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 h-px"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
      <span className="text-xs" style={{ color: "#475569" }}>
        ou continuer avec
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
    </div>
  );
}

// ─── Left Panel ──────────────────────────────────────────────────────────────

const features = [
  { icon: Shield, text: "Sécurité bancaire niveau militaire" },
  { icon: Zap, text: "Transferts instantanés en 2 secondes" },
  { icon: Globe, text: "150+ devises dans 90 pays" },
  { icon: TrendingUp, text: "Analyses intelligentes de vos dépenses" },
];

function LeftPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full p-12 relative overflow-hidden">
      {/* Mesh background blobs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(16,185,129,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 20%, rgba(14,165,233,0.10) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 60% 80%, rgba(99,102,241,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <PayFlowLogo size="lg" />
      </motion.div>

      <div className="space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <h2 className="text-3xl font-bold leading-tight text-white">
            La finance du futur,{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #10B981, #0EA5E9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              aujourd'hui
            </span>
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "#64748B" }}>
            Gérez, envoyez et recevez de l'argent avec une fluidité et une
            sécurité sans précédent.
          </p>
        </motion.div>

        <div className="space-y-3">
          {features.map((f, i) => (
            <motion.div
              key={f.text}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.35 + i * 0.08,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex items-center gap-3"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(16,185,129,0.15)",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <f.icon size={15} style={{ color: "#10B981" }} />
              </div>
              <span className="text-sm" style={{ color: "#94A3B8" }}>
                {f.text}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <p
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: "#334155" }}
          >
            Transactions récentes
          </p>
          {transactions.map((tx, i) => (
            <TransactionCard key={tx.id} tx={tx} delay={0.7 + i * 0.1} />
          ))}
        </div>
      </div>

      {/* ✅ MODIFICATION : FCFA au lieu de € */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-xs"
        style={{ color: "#1E293B" }}
      >
        © 2026 PayFlow · Régulé par la BEAC · Dépôts garantis jusqu'à 100 000
        000 FCFA
      </motion.div>
    </div>
  );
}

// ─── Login Form ──────────────────────────────────────────────────────────────

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter(); // ← Ajout pour la redirection
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null); // ← Ajout pour les erreurs serveur

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema) });

  // ✅ MODIFICATION : Connexion réelle au backend
    const onSubmit = async (data: LoginData) => {
        console.log("Données collectées:", data);
        setIsLoading(true);
        setServerError(null);
        try {
            const result = await login(data.email, data.password);
            localStorage.setItem("token", result.token); // Stockage du token
            setIsSuccess(true);
            setTimeout(() => {
                router.push("/dashboard"); // Redirection après 1s
            }, 1000);
        } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Erreur de connexion",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div
      key="login"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -30, transition: { duration: 0.25 } }}
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="space-y-1">
        {/* ✅ MODIFICATION : Icône Hand au lieu de 👋 */}
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          Bon retour <Hand size={20} />
        </h1>
        <p className="text-sm" style={{ color: "#64748B" }}>
          Connectez-vous à votre wallet PayFlow
        </p>
      </motion.div>

      {/* ✅ AJOUT : Affichage de l'erreur serveur */}
      <AnimatePresence>
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <AlertCircle size={16} style={{ color: "#EF4444" }} />
            <p className="text-sm" style={{ color: "#EF4444" }}>
              {serverError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <motion.div variants={itemVariants}>
          <InputField
            label="Adresse email"
            name="email"
            placeholder="vous@exemple.com"
            type="email"
            register={register}
            error={errors.email?.message}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                className="block text-sm font-medium"
                style={{ color: "#94A3B8" }}
              >
                Mot de passe
              </label>
              <button
                type="button"
                className="text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: "#10B981" }}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <motion.div
                animate={{
                  boxShadow: errors.password
                    ? "0 0 0 2px rgba(239,68,68,0.4)"
                    : "0 0 0 1px rgba(255,255,255,0.08)",
                }}
                transition={{ duration: 0.15 }}
                className="rounded-xl overflow-hidden"
              >
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  className="w-full px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "0.75rem",
                  }}
                />
              </motion.div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                style={{ color: "#475569" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <AnimatePresence>
              {errors.password && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5"
                >
                  <AlertCircle size={12} style={{ color: "#EF4444" }} />
                  <p className="text-xs" style={{ color: "#EF4444" }}>
                    {errors.password.message}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <motion.button
            whileHover={!isLoading && !isSuccess ? { scale: 1.01 } : {}}
            whileTap={!isLoading && !isSuccess ? { scale: 0.99 } : {}}
            type="submit"
            disabled={isLoading || isSuccess}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: isSuccess
                ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                : "linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)",
              color: "white",
              boxShadow: "0 4px 24px rgba(16,185,129,0.3)",
              opacity: isLoading ? 0.8 : 1,
            }}
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 size={16} className="animate-spin" />
                  Connexion en cours…
                </motion.div>
              ) : isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <Check size={16} />
                  Connecté !
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  Se connecter
                  <ArrowRight size={15} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </form>

      <motion.div variants={itemVariants}>
        <Divider />
      </motion.div>

      <motion.div variants={itemVariants}>
        <GoogleButton label="Continuer avec Google" />
      </motion.div>

      <motion.p
        variants={itemVariants}
        className="text-center text-sm"
        style={{ color: "#475569" }}
      >
        Pas encore de compte ?{" "}
        <button
          onClick={onSwitch}
          className="font-semibold transition-opacity hover:opacity-80"
          style={{ color: "#10B981" }}
        >
          Créer un compte
        </button>
      </motion.p>
    </motion.div>
  );
}

// ─── Password Strength Bar ───────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-1.5 overflow-hidden"
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="h-1 flex-1 rounded-full"
            animate={{
              backgroundColor: i <= score ? color : "rgba(255,255,255,0.1)",
            }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color }}>
        {label}
      </p>
    </motion.div>
  );
}

// ─── Register Form ───────────────────────────────────────────────────────────

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter(); // ← Ajout pour la redirection
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [serverError, setServerError] = useState<string | null>(null); // ← Ajout pour les erreurs serveur

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterData>({ resolver: zodResolver(registerSchema) });

  const watchedPassword = watch("password", "");
  useEffect(() => {
    setPasswordValue(watchedPassword || "");
  }, [watchedPassword]);

  // ✅ MODIFICATION : Inscription réelle au backend
    const onSubmit = async (data: RegisterData) => {
      console.log("Données collectées:", data);
        setIsLoading(true);
        setServerError(null);
        try {
            // Mapping : fullName → name (ce que Laravel attend)
            const payload = {
                name: data.fullName,
                email: data.email,
                password: data.password,
                password_confirmation: data.confirmPassword,
            };
            console.log("Payload envoyé:", payload);
            const result = await apiRegister (payload);
            localStorage.setItem("token", result.token);
            setIsSuccess(true);
            setTimeout(() => {
                router.push("/dashboard");
            }, 1000);
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : "Erreur lors de l'inscription",
            );
        } finally {
            setIsLoading(false);
        }
    };

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div
      key="register"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: 30, transition: { duration: 0.25 } }}
      className="space-y-5"
    >
      <motion.div variants={itemVariants} className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Créez votre compte</h1>
        <p className="text-sm" style={{ color: "#64748B" }}>
          Rejoignez 2 millions d'utilisateurs PayFlow
        </p>
      </motion.div>

      {/* ✅ AJOUT : Affichage de l'erreur serveur */}
      <AnimatePresence>
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <AlertCircle size={16} style={{ color: "#EF4444" }} />
            <p className="text-sm" style={{ color: "#EF4444" }}>
              {serverError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <motion.div variants={itemVariants}>
          <InputField
            label="Nom complet"
            name="fullName"
            placeholder="Ngo Bruno" // ✅ MODIFICATION : Nom authentique
            register={register}
            error={errors.fullName?.message}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <InputField
            label="Adresse email"
            name="email"
            placeholder="vous@exemple.com"
            type="email"
            register={register}
            error={errors.email?.message}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium"
              style={{ color: "#94A3B8" }}
            >
              Mot de passe
            </label>
            <div className="relative">
              <motion.div
                animate={{
                  boxShadow: errors.password
                    ? "0 0 0 2px rgba(239,68,68,0.4)"
                    : "0 0 0 1px rgba(255,255,255,0.08)",
                }}
                transition={{ duration: 0.15 }}
                className="rounded-xl overflow-hidden"
              >
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 caractères"
                  className="w-full px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "0.75rem",
                  }}
                />
              </motion.div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                style={{ color: "#475569" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <AnimatePresence>
              {passwordValue && (
                <PasswordStrengthBar password={passwordValue} />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {errors.password && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5"
                >
                  <AlertCircle size={12} style={{ color: "#EF4444" }} />
                  <p className="text-xs" style={{ color: "#EF4444" }}>
                    {errors.password.message}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium"
              style={{ color: "#94A3B8" }}
            >
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <motion.div
                animate={{
                  boxShadow: errors.confirmPassword
                    ? "0 0 0 2px rgba(239,68,68,0.4)"
                    : "0 0 0 1px rgba(255,255,255,0.08)",
                }}
                transition={{ duration: 0.15 }}
                className="rounded-xl overflow-hidden"
              >
                <input
                  {...register("confirmPassword")}
                  type={showConfirm ? "text" : "password"}
                  placeholder="Répétez le mot de passe"
                  className="w-full px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "0.75rem",
                  }}
                />
              </motion.div>
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                style={{ color: "#475569" }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <AnimatePresence>
              {errors.confirmPassword && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5"
                >
                  <AlertCircle size={12} style={{ color: "#EF4444" }} />
                  <p className="text-xs" style={{ color: "#EF4444" }}>
                    {errors.confirmPassword.message}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <motion.button
            whileHover={!isLoading && !isSuccess ? { scale: 1.01 } : {}}
            whileTap={!isLoading && !isSuccess ? { scale: 0.99 } : {}}
            type="submit"
            disabled={isLoading || isSuccess}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: isSuccess
                ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                : "linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)",
              color: "white",
              boxShadow: "0 4px 24px rgba(16,185,129,0.3)",
              opacity: isLoading ? 0.8 : 1,
            }}
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 size={16} className="animate-spin" />
                  Création du compte…
                </motion.div>
              ) : isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <Check size={16} />
                  Compte créé !
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  Créer mon compte gratuit
                  <ArrowRight size={15} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </form>

      <motion.div variants={itemVariants}>
        <Divider />
      </motion.div>

      <motion.div variants={itemVariants}>
        <GoogleButton label="S'inscrire avec Google" />
      </motion.div>

      <motion.p
        variants={itemVariants}
        className="text-center text-xs leading-relaxed"
        style={{ color: "#334155" }}
      >
        En créant un compte, vous acceptez nos{" "}
        <span
          className="cursor-pointer hover:opacity-80 transition-opacity"
          style={{ color: "#10B981" }}
        >
          Conditions d'utilisation
        </span>{" "}
        et notre{" "}
        <span
          className="cursor-pointer hover:opacity-80 transition-opacity"
          style={{ color: "#10B981" }}
        >
          Politique de confidentialité
        </span>
        .
      </motion.p>

      <motion.p
        variants={itemVariants}
        className="text-center text-sm"
        style={{ color: "#475569" }}
      >
        Déjà un compte ?{" "}
        <button
          onClick={onSwitch}
          className="font-semibold transition-opacity hover:opacity-80"
          style={{ color: "#10B981" }}
        >
          Se connecter
        </button>
      </motion.p>
    </motion.div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const [view, setView] = useState<"login" | "register">("login");

  return (
    <div
      className="min-h-screen w-full flex"
      style={{
        background: "#0A0F1E",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Left — Brand Panel */}
      <div
        className="hidden lg:flex flex-col w-[480px] shrink-0 relative"
        style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <LeftPanel />
      </div>

      {/* Right — Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(16,185,129,0.04) 0%, transparent 70%)",
          }}
        />

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <PayFlowLogo size="md" />
        </div>

        <div className="w-full max-w-[400px] relative z-10">
          {/* Card */}
          <motion.div
            layout
            className="rounded-2xl p-8"
            style={{
              background: "rgba(17,24,39,0.8)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(24px)",
              boxShadow:
                "0 0 0 1px rgba(16,185,129,0.05), 0 24px 80px rgba(0,0,0,0.6), 0 8px 32px rgba(16,185,129,0.05)",
            }}
          >
            {/* Tab switcher */}
            <div
              className="flex gap-1 p-1 rounded-xl mb-6"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              {(["login", "register"] as const).map((tab) => (
                <motion.button
                  key={tab}
                  onClick={() => setView(tab)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors relative"
                  style={{
                    color: view === tab ? "white" : "#475569",
                  }}
                >
                  {view === tab && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.4,
                      }}
                    />
                  )}
                  <span className="relative z-10">
                    {tab === "login" ? "Connexion" : "Inscription"}
                  </span>
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {view === "login" ? (
                <LoginForm key="login" onSwitch={() => setView("register")} />
              ) : (
                <RegisterForm
                  key="register"
                  onSwitch={() => setView("login")}
                />
              )}
            </AnimatePresence>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center justify-center gap-6 mt-6"
          >
            {[
              { icon: Shield, label: "Chiffrement AES-256" },
              { icon: Globe, label: "90 pays" },
              { icon: TrendingUp, label: "2M+ utilisateurs" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-1.5">
                <badge.icon size={12} style={{ color: "#334155" }} />
                <span className="text-xs" style={{ color: "#334155" }}>
                  {badge.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
