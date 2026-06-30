import { listEvents } from "@/db/catalog";
import { listGenres, genresForEventIds } from "@/db/genres";
import { deleteEventAction, updateEventGenresAction } from "./actions";
import { EventForm } from "./event-form";
import { GenreCheckboxes } from "./genre-checkboxes";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await listEvents();
  const genres = await listGenres();
  const genresByEvent = await genresForEventIds(events.map((e) => e.id));

  return (
    <main className="container narrow">
      <div className="page-head">
        <span className="crumb">ניהול / הופעות</span>
        <h1 className="page-title">הופעות 🎤</h1>
      </div>

      <div className="card">
        <EventForm genres={genres} />
      </div>

      <div className="card">
        <p className="section-title">הופעות קיימות ({events.length})</p>
        {events.length === 0 ? (
          <p className="empty">עדיין אין הופעות. הוסף את הראשונה ☝️</p>
        ) : (
          <div className="list">
            {events.map((e) => {
              const eg = genresByEvent.get(e.id) ?? [];
              return (
                <div key={e.id} className="list-item" style={{ alignItems: "stretch", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div className="meta">
                      <span className="title">{e.name}</span>
                      <span className="sub">
                        {eg.length > 0 ? eg.map((g) => `${g.emoji} ${g.nameHe}`).join(" · ") : "ללא סגנון"}
                      </span>
                    </div>
                    <form action={deleteEventAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="chip danger">מחיקה</button>
                    </form>
                  </div>
                  <details>
                    <summary className="muted" style={{ cursor: "pointer", fontSize: 13 }}>עריכת סגנונות</summary>
                    <form action={updateEventGenresAction} style={{ marginTop: 10 }}>
                      <input type="hidden" name="eventId" value={e.id} />
                      <GenreCheckboxes genres={genres} selected={eg.map((g) => g.id)} />
                      <button type="submit" className="chip" style={{ marginTop: 10 }}>שמירה</button>
                    </form>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
