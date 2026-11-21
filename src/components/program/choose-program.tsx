"use client";

import { useEffect, useState } from "react";
import { mondayOf, orderDays, planFromWeek, weekFromSchedule } from "@/lib/program";
import { chooseProgram, failureMessage, fetchTemplates } from "@/lib/program-api";
import { localIsoDate } from "@/lib/today";
import type { Template, Week } from "@/lib/types";
import { useData } from "../data-provider";
import { GhostButton, Loading, PrimaryButton, ScreenTitle } from "../ui";
import { TemplatePicker } from "./template-picker";
import { WeekEditor } from "./week-editor";

/**
 * Pick a template, then set the week (pre-filled with the template's default), then save.
 * Used on first login and to switch programs. History is never touched; the block restarts at week 1.
 */
export function ChooseProgram({ switching, onDone, onCancel }: { switching: boolean; onDone: () => void; onCancel?: () => void }) {
  const { program, refresh } = useData();
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
      await refresh();
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
          <ScreenTitle>{switching ? "Change program" : "Choose your program"}</ScreenTitle>
          <p className="mt-1 text-fg-2">You can change it, your week and its exercises later.</p>
        </div>
        {loadError ? (
          <div className="flex flex-col gap-2">
            <p className="text-fg-2">{loadError}</p>
            <GhostButton
              onClick={() => {
                setLoadError(null);
                setAttempt((a) => a + 1);
              }}
            >
              Try again
            </GhostButton>
          </div>
        ) : templates === null || program === null ? (
          <Loading />
        ) : (
          <TemplatePicker templates={templates} exercises={program.exercises} currentTemplateId={program.active?.template_id ?? null} onPick={pick} />
        )}
        {onCancel && <GhostButton onClick={onCancel}>Cancel</GhostButton>}
      </>
    );
  }

  const trainingDays = planFromWeek(week).length;
  return (
    <>
      <div>
        <ScreenTitle>Your week</ScreenTitle>
        <p className="mt-1 text-fg-2">
          {picked.name} · {trainingDays} session{trainingDays === 1 ? "" : "s"} a week
        </p>
      </div>
      <WeekEditor days={orderDays(picked.days, picked.schedule)} week={week} onChange={setWeek} />
      {switching && <p className="text-[15px] text-fg-2">Your history stays. The 6-week block restarts at week 1.</p>}
      {saveError && <p className="text-[15px] text-danger">{saveError}</p>}
      <div className="mt-auto flex flex-col gap-2">
        <PrimaryButton onClick={save} disabled={saving || trainingDays === 0}>
          {saving ? "Saving…" : switching ? `Switch to ${picked.name}` : "Start training"}
        </PrimaryButton>
        <GhostButton onClick={() => setPicked(null)} disabled={saving}>
          Back
        </GhostButton>
      </div>
    </>
  );
}
