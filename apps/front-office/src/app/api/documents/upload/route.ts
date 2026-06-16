import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { uploadGuestDoc } from "@/lib/minio";
import busboy from "busboy";
import { Readable } from "node:stream";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    return new Promise<NextResponse>((resolve) => {
      const bb = busboy({ headers: { "content-type": contentType } });

      let fileBuffer: Buffer | null = null;
      let fileName = "upload";
      let guestId = "";

      bb.on("file", (_fieldname, stream, info) => {
        fileName = info.filename || "upload";
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => { fileBuffer = Buffer.concat(chunks); });
      });

      bb.on("field", (name, value) => {
        if (name === "guestId") guestId = value;
      });

      bb.on("finish", async () => {
        try {
          if (!fileBuffer) {
            return resolve(
              NextResponse.json({ error: "No file provided" }, { status: 400 })
            );
          }

          const uploaderId =
            guestId || (session.user as { id: string }).id || "unknown";
          const url = await uploadGuestDoc(uploaderId, fileName, fileBuffer);
          resolve(NextResponse.json({ url }));
        } catch (error) {
          console.error("[DOC_UPLOAD]", error);
          const message =
            error instanceof Error ? error.message : "Upload failed";
          resolve(NextResponse.json({ error: message }, { status: 500 }));
        }
      });

      bb.on("error", (error) => {
        console.error("[DOC_UPLOAD] busboy error:", error);
        resolve(
          NextResponse.json({ error: "Failed to parse upload" }, { status: 500 })
        );
      });

      // Pipe Web ReadableStream → Node.js Readable → busboy
      const body = request.body;
      if (!body) {
        return resolve(
          NextResponse.json({ error: "No request body" }, { status: 400 })
        );
      }

      const nodeStream = new Readable({ read() {} });
      nodeStream.pipe(bb);

      const reader = body.getReader();
      (async () => {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) {
              nodeStream.push(null);
              break;
            }
            nodeStream.push(Buffer.from(value));
          }
        } catch (e) {
          nodeStream.destroy(e instanceof Error ? e : new Error(String(e)));
        }
      })();
    });
  } catch (error) {
    console.error("[DOC_UPLOAD]", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
