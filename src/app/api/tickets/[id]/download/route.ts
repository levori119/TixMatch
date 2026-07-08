import { currentUser } from "@/lib/auth";
import { getTicketFileForDownload } from "@/db/tickets";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const fileId = Number(id);
  if (!Number.isInteger(fileId)) return Response.json({ error: "bad id" }, { status: 400 });

  const file = await getTicketFileForDownload(fileId, user.id);
  if (!file || !file.dataBase64) return Response.json({ error: "forbidden" }, { status: 403 });

  const bytes = Buffer.from(file.dataBase64, "base64");
  const name = encodeURIComponent(file.fileName || "ticket");
  return new Response(bytes, {
    headers: {
      "content-type": file.mime || "application/octet-stream",
      "content-disposition": `attachment; filename*=UTF-8''${name}`,
      "cache-control": "no-store",
    },
  });
}
