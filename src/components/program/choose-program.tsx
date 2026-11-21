"use client";

import { useEffect, useState } from "react";
import { mondayOf, orderDays, planFromWeek, weekFromSchedule, yourVersion } from "@/lib/program";
import { RELOAD_FAILED, chooseProgram, failureMessage, fetchTemplates } from "@/lib/program-api";
import { localIsoDate } from "@/lib/today";
import type { Template, Week } from "@/lib/types";
import { useOnline } from "@/lib/use-online";
import { useData } from "../data-provider";
import { BackButton, GhostButton, Loading, OfflineNotice, OutlineButton, PrimaryButton, ScreenTitle, eyebrow } from "../ui";
import { TemplatePicker } from "./template-picker";
import { WeekEditor } from "./week-editor";

/**
 * Step 1: pick a template. Step 2: set the week (pre-filled with the template's default), then save.
 * Used on first login and to switch programs. History is never touched; the block restarts at week 1.
 */
export function ChooseProgram({ switching, onDone, onCancel }: { switching: boolean; onDone: () => void; onCancel?: () => void }) {
  const { program, refresh } = useData();
  const online = useOnline();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Template | null>(null);
  const [week, setWeek] = useState<Week>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchTemplates().then(
      (t) => live && setTemplates(t),
      (e) => live && setLoadError(failureMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  function pick(template: Template) {
    setPicked(template);
    setWeek(weekFromSchedule(template.schedule, template.days));
    setSaveError(null);
  }

  async function save() {
    if (!picked) return;
    setSaving(true);
    setSaveError(null);
    try {
      await chooseProgram(picked.id, planFromWeek(week), mondayOf(localIsoDate(new Date())));
      // The server restarted the block: a week change still queued from before must not undo that.
      if (!(await refresh({ dropBlockStart: true }))) throw new Error(RELOAD_FAILED);
      onDone();
    } catch (e) {
      setSaveError(failureMessage(e));
      setSaving(false);
    }
  }

  if (!picked) {
    return (
      <>
        <div>
          <p className={eyebrow}>Step 1 of 2</p>
          <ScreenTitle>{switching ? "Change program" : "Pick your split"}</ScreenTitle>
          <p className="mt-2 text-fg-2">How many days can you train? Start there.</p>
        </div>
        {loadError ? (
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-fg-2">
              {loadError}
            </p>
            <OutlineButton
              onClick={() => {
                setLoadError(null);
                setAttempt((a) => a + 1);
              }}
            >
              Try again
            </OutlineButton>
          </div>
        ) : templates === null || program === null ? (
          <Loading />
        ) : (
          <TemplatePicker
            // Re-picking the current program would only reset the week and the block: edit those on the program page.
            templates={templates.filter((t) => t.id !== program.active?.template_id).map((t) => yourVersion(program, t))}
            usedBefore={program.programs.map((p) => p.template_id).filter((id) => id !== null)}
            onPick={pick}
          />
        )}
        {onCancel && <GhostButton onClick={onCancel}>Cancel</GhostButton>}
      </>
    );
  }

  const trainingDays = planFromWeek(week).length;
  return (
    <>
      <BackButton onClick={() => setPicked(null)} disabled={saving}>
        Programs
      </BackButton>
      <div>
        <p className={eyebrow}>Step 2 of 2 · {picked.name}</p>
        <ScreenTitle>Your week</ScreenTitle>
      </div>
      {!online && <OfflineNotice />}
      <WeekEditor days={orderDays(picked.days, picked.schedule)} week={week} onChange={setWeek} />
      {switching && <p className="text-[15px] text-fg-2">Your history and weights stay. The 6-week block restarts at week 1.</p>}
      {saveError && (
        <p role="alert" className="text-[15px] text-danger">
          {saveError}
        </p>
      )}
      <div className="mt-auto flex flex-col gap-2">
        <PrimaryButton onClick={save} disabled={saving || trainingDays === 0 || !online}>
          {saving ? "Saving…" : switching ? `Switch to ${picked.name}` : "Start training"}
        </PrimaryButton>
      </div>
    </>
  );
}
