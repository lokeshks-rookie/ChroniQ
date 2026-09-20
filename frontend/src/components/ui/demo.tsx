import DotCard from "@/components/ui/moving-dot-card";
import { TiltCard } from "@/components/ui/tilt-card";

export const DemoOne = () => {
  return (
    <div className="flex w-full h-screen justify-center items-center">
      <DotCard />
    </div>
  );
};

export function Demo() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-8">
      <TiltCard className="w-[340px] rounded-3xl border bg-card p-7 shadow-2xl">
        <div className="relative z-20">
          <div className="mb-16 flex items-center justify-between">
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
              Interactive
            </span>
            <span className="text-sm text-muted-foreground">3D hover</span>
          </div>
          <h3 className="text-3xl font-semibold tracking-tight">Tilt Card</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Move the cursor across the card to bend perspective and reveal the
            spotlight.
          </p>
        </div>
      </TiltCard>
    </div>
  );
}

export default { DemoOne, Demo };
