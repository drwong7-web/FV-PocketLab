import { Link } from "react-router-dom";
import { Activity, ArrowRight, BarChart3, Cpu, FileText, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const features = [
  { icon: Cpu, title: "Scientific Engine", text: "EMA + Kalman filtering, central-difference derivatives, mono-exponential model fitting." },
  { icon: Gauge, title: "F-V Profiling", text: "Computes F0, V0 and Pmax from horizontal force-velocity regression." },
  { icon: BarChart3, title: "Phase Detection", text: "Auto-detects acceleration, max velocity and deceleration phases." },
  { icon: FileText, title: "PDF Reports", text: "One-tap export of metrics, phases and individualised recommendations." },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="container max-w-5xl flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary shadow-glow flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-tight text-sm">SprintLab</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">FV Pro</div>
          </div>
        </div>
        <Link to={user ? "/app" : "/auth"}>
          <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold">
            {user ? "Open app" : "Sign in"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </header>

      <section className="container max-w-3xl text-center pt-12 pb-20">
        <span className="inline-block text-[10px] uppercase tracking-[0.3em] text-primary font-bold mb-4 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          Sport Science Platform
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
          Sprint analysis that
          <span className="block bg-gradient-primary bg-clip-text text-transparent">
            speaks the language of force.
          </span>
        </h1>
        <p className="mt-5 text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
          Run a sprint test from splits or position-time data. Get F0, V0, Pmax, phase
          breakdowns and training recommendations — all on your phone.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to={user ? "/app" : "/auth"}>
            <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-semibold px-7">
              {user ? "Go to dashboard" : "Get started"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="container max-w-5xl pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="glass-card p-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="container max-w-5xl py-10 text-center text-xs text-muted-foreground border-t border-border">
        SprintLab FV Pro · Built for sport scientists, coaches and athletes.
      </footer>
    </div>
  );
}
