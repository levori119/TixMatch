"use client";

import { useActionState } from "react";
import { updateCommissionAction, type ActionState } from "./actions";

const initial: ActionState = { ok: false, message: "" };

export function CommissionForm({
  defaultPercent,
  defaultFixedIls,
}: {
  defaultPercent: number;
  defaultFixedIls: number;
}) {
  const [state, formAction, pending] = useActionState(updateCommissionAction, initial);

  return (
    <form action={formAction}>
      <div className="row">
        <label className="label" htmlFor="commissionPercent">
          אחוז עמלה (%)
        </label>
        <input
          className="input"
          id="commissionPercent"
          name="commissionPercent"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={defaultPercent}
          required
        />
        <p className="hint">אחוז שנגבה מכל עסקה (כולל עמלת הסליקה).</p>
      </div>

      <div className="row">
        <label className="label" htmlFor="commissionFixedIls">
          עמלה קבועה (₪)
        </label>
        <input
          className="input"
          id="commissionFixedIls"
          name="commissionFixedIls"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultFixedIls}
        />
        <p className="hint">תוספת קבועה בשקלים לכל עסקה (אופציונלי, 0 = אין).</p>
      </div>

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "שומר…" : "שמירה"}
      </button>

      {state.message ? (
        <div
          className="notice"
          role="status"
          style={
            state.ok
              ? undefined
              : {
                  background: "rgba(255,46,147,0.12)",
                  borderColor: "rgba(255,46,147,0.4)",
                  color: "#ff7ab8",
                }
          }
        >
          {state.message}
        </div>
      ) : null}
    </form>
  );
}
