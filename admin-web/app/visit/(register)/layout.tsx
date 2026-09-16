"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RegistrationDraftProvider, useRegistrationDraft } from "@/lib/registrationDraft";

type BootstrapState =
  | { status: "loading" }
  | { status: "redirecting" }
  | { status: "error"; message: string }
  | { status: "ready" };

export default function VisitLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<BootstrapState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();

      let userId = session?.user.id;

      if (!userId) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (cancelled) return;
        if (error || !data.user) {
          setState({
            status: "error",
            message: "Unable to start a registration session. Please reload this page."
          });
          return;
        }
        userId = data.user.id;
      }

      // A visitor re-opening the gate QR link (or refreshing mid-flow) keeps
      // their anonymous session — guard against starting a second
      // registration while one is already Pending/Active, same as the old
      // mobile app's register.tsx focus-guard did.
      const { data: existing, error: queryError } = await supabase
        .from("visitor_registrations")
        .select("id")
        .eq("visitor_user_id", userId)
        .in("registration_status", ["Pending", "Active"])
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (queryError) {
        setState({
          status: "error",
          message: "Unable to check your registration status. Please reload this page."
        });
        return;
      }

      if (existing) {
        setState({ status: "redirecting" });
        router.replace("/visit/status");
        return;
      }

      setState({ status: "ready" });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading" || state.status === "redirecting") {
    return <CenteredMessage title="Starting your registration…" body="One moment." />;
  }

  if (state.status === "error") {
    return <CenteredMessage title="Something went wrong" body={state.message} />;
  }

  return (
    <RegistrationDraftProvider>
      <ConsentGuard>{children}</ConsentGuard>
    </RegistrationDraftProvider>
  );
}

// Consent must come first and actually be agreed to — without this, any
// step is directly URL-reachable regardless of whether a visitor ever saw
// or accepted the privacy consent screen at "/visit".
function ConsentGuard({ children }: { children: React.ReactNode }) {
  const { draft } = useRegistrationDraft();
  const pathname = usePathname();
  const router = useRouter();
  const blocked = !draft.consentAccepted && pathname !== "/visit";

  useEffect(() => {
    if (blocked) router.replace("/visit");
  }, [blocked, router]);

  if (blocked) {
    return (
      <CenteredMessage title="Please accept the privacy consent first" body="Redirecting…" />
    );
  }

  return <>{children}</>;
}

function CenteredMessage({ title, body }: { title: string; body: string }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-[#040f0a] px-6 text-center text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3, 15, 9, 0.82), rgba(3, 15, 9, 0.88)), url('/NEWERABG.jpg')",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="max-w-sm rounded-[22px] border border-emerald-500/25 bg-[#0a1f14]/85 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <h1 className="text-xl font-extrabold text-white">{title}</h1>
        <p className="mt-3 text-sm text-gray-400">{body}</p>
      </div>
    </main>
  );
}
