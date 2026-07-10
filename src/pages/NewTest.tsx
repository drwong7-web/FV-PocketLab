import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, TrendingUp } from "lucide-react";
import logoJump from "@/assets/logo-jump-green.png.asset.json";


export default function NewTest() {
  const [params] = useSearchParams();
  const athleteId = params.get("playerId") ?? params.get("athleteId") ?? "";
  const qs = athleteId ? `?athleteId=${athleteId}` : "";

  return (
    <div className="space-y-6">
      <Link to="/app" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-3 h-3 mr-1" /> Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Launch a test</h1>
        <p className="text-sm text-muted-foreground">Choose the test type to get started.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to={`/app/tests/new/jump${qs}`} className="glass-card overflow-hidden group hover:border-primary/40 transition-colors">
          <div className="p-4 flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center h-28 w-28">
              <img src={logoJump.url} alt="Vertical jump" className="engraved-logo h-full w-auto object-contain" />
            </div>

            <div className="flex-1 space-y-2">
              <h2 className="font-display text-lg font-bold uppercase">Vertical jump</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {"\n"}
              </p>
              <div className="text-xs text-primary group-hover:underline">Start →</div>
            </div>
          </div>
        </Link>

        <Link to={`/app/tests/new/sprint${qs}`} className="glass-card overflow-hidden group hover:border-primary/40 transition-colors">
          
          <div className="p-5 space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-glow">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold uppercase">&nbsp;LINEAR&nbsp;SPRINT</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {"\n"}
              </p>
            </div>
            <div className="text-xs text-primary group-hover:underline">Start →</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
