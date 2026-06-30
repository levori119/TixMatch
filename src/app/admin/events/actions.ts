"use server";

import { revalidatePath } from "next/cache";
import { createEvent, deleteEvent } from "@/db/catalog";
import { setEventGenres } from "@/db/genres";

export type FormState = { ok: boolean; message: string };

function parseGenreIds(formData: FormData): number[] {
  return formData.getAll("genreIds").map((v) => Number(v)).filter((n) => Number.isInteger(n));
}

export async function createEventAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "שם ההופעה חובה." };

  const artist = String(formData.get("artist") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;

  const ev = await createEvent({ name, artist, category });
  await setEventGenres(ev.id, parseGenreIds(formData));
  revalidatePath("/admin/events");
  return { ok: true, message: `ההופעה "${name}" נוספה ✓` };
}

export async function updateEventGenresAction(formData: FormData): Promise<void> {
  const eventId = Number(formData.get("eventId"));
  if (Number.isInteger(eventId)) {
    await setEventGenres(eventId, parseGenreIds(formData));
    revalidatePath("/admin/events");
  }
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await deleteEvent(id);
    revalidatePath("/admin/events");
  }
}
