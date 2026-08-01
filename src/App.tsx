import { useState } from "react";
import type { DayId } from "./lib/types";
import { AppContext, useAppDataRoot } from "./lib/useAppData";
import { blankData, save } from "./lib/storage";
import Onboarding from "./ui/Onboarding";
import Shell, { type Tab } from "./ui/Shell";
import Today from "./ui/screens/Today";
import Workout from "./ui/screens/Workout";
import Stunts from "./ui/screens/Stunts";
import Stats from "./ui/screens/Stats";
import PlanScreen from "./ui/screens/PlanScreen";

export default function App() {
  const store = useAppDataRoot(blankData);
  const [tab, setTab] = useState<Tab>("today");
  const [activeDay, setActiveDay] = useState<DayId | null>(null);

  if (store.data.athletes.length === 0) {
    return (
      <Onboarding
        onDone={(d) => {
          save(d);
          store.update(() => d);
        }}
      />
    );
  }

  return (
    <AppContext.Provider value={store}>
      <Shell tab={tab} onTab={setTab}>
        {tab === "today" && <Today onStart={setActiveDay} />}
        {tab === "stunts" && <Stunts />}
        {tab === "stats" && <Stats />}
        {tab === "plan" && <PlanScreen />}
      </Shell>
      {activeDay && (
        <Workout
          key={`${store.athlete.id}-${activeDay}`}
          dayId={activeDay}
          onExit={() => setActiveDay(null)}
        />
      )}
    </AppContext.Provider>
  );
}
