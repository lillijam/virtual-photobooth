"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../utils/supabase";
import html2canvas from "html2canvas-pro";


type Screen = "home" | "guest" | "template" | "camera" | "preview" | "strip" | "gallery";
function AdjustablePhoto({ photo }: { photo: string }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0 });

  function clampPosition(x: number, y: number, currentScale: number) {
    const container = containerRef.current;

    if (!container) return { x, y };

    const width = container.clientWidth;
    const height = container.clientHeight;

    const maxX = (width * (currentScale - 1)) / 2;
    const maxY = (height * (currentScale - 1)) / 2;

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;

    startPoint.current = {
      x: e.clientX,
      y: e.clientY,
    };

    startPosition.current = {
      x: position.x,
      y: position.y,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;

    const newX =
      startPosition.current.x +
      (e.clientX - startPoint.current.x);

    const newY =
      startPosition.current.y +
      (e.clientY - startPoint.current.y);

    setPosition(clampPosition(newX, newY, scale));
  }

  function handlePointerUp() {
    dragging.current = false;
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();

    setScale((current) => {
      const next = Math.min(
        3,
        Math.max(1, current - e.deltaY * 0.001)
      );

      setPosition((currentPosition) =>
        clampPosition(
          currentPosition.x,
          currentPosition.y,
          next
        )
      );

      return next;
    });
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <img
        src={photo}
        alt="Photo"
        draggable={false}
        className="absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-cover"
        style={{
          transform: `
            translate(-50%, -50%)
            translate(${position.x}px, ${position.y}px)
            scale(${scale})
          `,
        }}
      />
    </div>
  );
}
function PolaroidFrame({ photo }: { photo: string }) {
  return (
    <div className="relative mx-auto aspect-[1080/1440] w-full max-w-sm overflow-hidden bg-[#eee5df]">
      <div
        className="absolute overflow-hidden"
        style={{
          left: "8.333%",
          top: "6.25%",
          width: "83.333%",
          height: "62.5%",
        }}
      >
<AdjustablePhoto photo={photo} />
      </div>

      <img
        src="/frames/polaroid-overlay.png"
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-fill"
      />
    </div>
  );
}

function FourRFrame({ photos }: { photos: string[] }) {
  return (
    <div className="relative mx-auto aspect-[1200/1800] w-full max-w-sm overflow-hidden bg-[#eee5df]">
      {/* Photo 1 */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: "5%",
          top: "5%",
          width: "90.3%",
          height: "36.1%",
        }}
      >
        {photos[0] && <AdjustablePhoto photo={photos[0]} />}
      </div>

      {/* Photo 2 */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: "5%",
          top: "43.67%",
          width: "90.3%",
          height: "36.1%",
        }}
      >
        {photos[1] && <AdjustablePhoto photo={photos[1]} />}
      </div>

      {/* 4R overlay */}
      <img
        src="/frames/4r-overlay.png"
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
      />
    </div>
  );
}
function TwoRFrame({ photos }: { photos: string[] }) {
  return (
    <div className="relative mx-auto aspect-[750/1350] w-full max-w-sm overflow-hidden bg-[#eee5df]">
      {/* Photo 1 */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: "6%",
          top: "2.96%",
          width: "88.05%",
          height: "26.67%",
        }}
      >
        {photos[0] && <AdjustablePhoto photo={photos[0]} />}
      </div>

      {/* Photo 2 */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: "6.03%",
          top: "31.11%",
          width: "88.05%",
          height: "26.67%",
        }}
      >
        {photos[1] && <AdjustablePhoto photo={photos[1]} />}
      </div>

      {/* Photo 3 */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: "6.03%",
          top: "59.19%",
          width: "88.05%",
          height: "26.67%",
        }}
      >
        {photos[2] && <AdjustablePhoto photo={photos[2]} />}
      </div>

      {/* 2R overlay */}
      <img
        src="/frames/2r-overlay-preview.png"
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
      />
    </div>
  );
}

export default function Home() {
const [screen, setScreen] = useState<Screen>("home");
const [isHydrated, setIsHydrated] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [timer, setTimer] = useState(3);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);

  type GalleryItem = {
  id: number;
  image_url: string;
  guest_name: string | null;
  likes: number;
  template_id: string | null;
  created_at: string;
};

const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
const [visitorId, setVisitorId] = useState("");
const [likedPhotoIds, setLikedPhotoIds] = useState<number[]>([]);
const [galleryFilter, setGalleryFilter] = useState("all");

useEffect(() => {
  let id = localStorage.getItem("memoria-visitor-id");

if (!id) {
  id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem("memoria-visitor-id", id);
}

  setVisitorId(id);
}, []);
  
  useEffect(() => {
  const savedScreen = sessionStorage.getItem("memoria-screen");
  const savedPhotos = localStorage.getItem("memoria-photos");
  const savedTemplate = sessionStorage.getItem("memoria-template");
  const savedGuestName = sessionStorage.getItem("memoria-guest-name");

  if (savedScreen) {
    setScreen(savedScreen as Screen);
  }

  if (savedPhotos) {
    setPhotos(JSON.parse(savedPhotos));
  }

  if (savedTemplate) {
    setSelectedTemplate(savedTemplate);
  }

  if (savedGuestName) {
    setGuestName(savedGuestName);
  }

  setIsHydrated(true);
}, []);

useEffect(() => {
  if (!isHydrated) return;

  sessionStorage.setItem("memoria-screen", screen);
  localStorage.setItem("memoria-photos", JSON.stringify(photos));
  sessionStorage.setItem("memoria-template", selectedTemplate);
  sessionStorage.setItem("memoria-guest-name", guestName);
}, [screen, photos, selectedTemplate, guestName, isHydrated]);

  useEffect(() => {
  const savedGallery = localStorage.getItem("memoria-gallery");

  if (savedGallery) {
    setGalleryPhotos(JSON.parse(savedGallery));
  }
}, []);

useEffect(() => {
  localStorage.setItem(
    "memoria-gallery",
    JSON.stringify(galleryPhotos)
  );
}, [galleryPhotos]);

useEffect(() => {
  if (screen === "gallery" && visitorId) {
    loadGalleryFromSupabase().then((items) => {
      setGalleryItems(items);
    });

    supabase
      .from("gallery_likes")
      .select("photo_id")
      .eq("visitor_id", visitorId)
      .then(({ data, error }) => {
        if (error) {
          console.error("Loading likes failed:", error);
          return;
        }

        setLikedPhotoIds(
          (data ?? []).map((item) => item.photo_id)
        );
      });
  }
}, [screen, visitorId]);

  const [cameraError, setCameraError] = useState("");
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const templates = [
{
  id: "polaroid",
  name: "Polaroid",
  description: "Classic & sweet",
  preview: "4R",
  photoCount: 1,
  canvasWidth: 1080,
  canvasHeight: 1440,
  overlayImage: "/frames/polaroid-overlay.png",
  photoSlots: [
    {
      x: 90,
      y: 90,
      width: 900,
      height: 900,
    },
  ],
},
{
  id: "4r",
  name: "4R",
  description: "Elegant portrait",
  preview: "4R",
  photoCount: 2,
  canvasWidth: 1200,
  canvasHeight: 1800,
  overlayImage: "/frames/4r-overlay.png",
  photoSlots: [
    {
      x: 60,
      y: 90,
      width: 1083.6,
      height: 650,
    },
    {
      x: 60,
      y: 786.1,
      width: 1083.6,
      height: 650,
    },
  ],
},
{
  id: "2r",
  name: "2R",
  description: "Cute photo strip",
  preview: "2R",
  photoCount: 3,
  canvasWidth: 750,
  canvasHeight: 1350,
  overlayImage: "/frames/2r-overlay-preview.png",
  photoSlots: [
    {
      x: 45,
      y: 40,
      width: 660.4,
      height: 360,
    },
    {
      x: 45.2,
      y: 420,
      width: 660.4,
      height: 360,
    },
    {
      x: 45.2,
      y: 799,
      width: 660.4,
      height: 360,
    },
  ],
},
  ];

  const selectedTemplateData = templates.find(
  (template) => template.id === selectedTemplate
);

const requiredPhotos = selectedTemplateData?.photoCount ?? 3;

  // Start camera when entering camera screen
  useEffect(() => {
    if (screen !== "camera") return;

    let mounted = true;

    async function startCamera() {
      try {
        setCameraError("");

        const stream = await navigator.mediaDevices.getUserMedia({
video: {
  facingMode: cameraFacing,
},
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        console.error(error);
        setCameraError(
          "Camera tidak dapat digunakan. Sila benarkan camera pada browser."
        );
      }
    }

    startCamera();

    return () => {
      mounted = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
}, [screen, cameraFacing]);

function toggleCamera() {
  setCameraFacing((current) =>
    current === "user" ? "environment" : "user"
  );
}

async function uploadPhotosToSupabase() {
  const uploadedUrls: string[] = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];

    const response = await fetch(photo);
    const blob = await response.blob();

    const fileName = `photo-${Date.now()}-${i}.jpg`;

    const { error } = await supabase.storage
      .from("memoria-gallery")
      .upload(fileName, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Upload failed:", error);
      return null;
    }

    const { data } = supabase.storage
      .from("memoria-gallery")
      .getPublicUrl(fileName);

    uploadedUrls.push(data.publicUrl);
  }

  // Simpan gambar ke database
  if (uploadedUrls.length > 0) {
const galleryRows = uploadedUrls.map((url) => ({
  image_url: url,
  guest_name: guestName,
  likes: 0,
  template_id: selectedTemplate,
}));

    const { error: databaseError } = await supabase
      .from("gallery_photos")
      .insert(galleryRows);

    if (databaseError) {
      console.error("Database insert failed:", databaseError);
      return null;
    }
  }

  return uploadedUrls;
}

async function loadGalleryFromSupabase(): Promise<GalleryItem[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, image_url, guest_name, likes, template_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gallery loading failed:", error);
    return [];
  }

  return data ?? [];
}

async function likePhoto(photoId: number, currentLikes: number) {
  if (!visitorId) return;

  // Semak sama ada visitor ini sudah like
  const { data: existingLike, error: checkError } = await supabase
    .from("gallery_likes")
    .select("id")
    .eq("photo_id", photoId)
    .eq("visitor_id", visitorId)
    .maybeSingle();

  if (checkError) {
    console.error("Like check failed:", checkError);
    return;
  }

  // Kalau sudah like → UNLIKE
  if (existingLike) {
    const { error: deleteError } = await supabase
      .from("gallery_likes")
      .delete()
      .eq("id", existingLike.id);

    if (deleteError) {
      console.error("Unlike failed:", deleteError);
      return;
    }

    const newLikes = Math.max(currentLikes - 1, 0);
    
    setLikedPhotoIds((current) =>
  current.filter((id) => id !== photoId)
);

    const { error: updateError } = await supabase
      .from("gallery_photos")
      .update({ likes: newLikes })
      .eq("id", photoId);

    if (updateError) {
      console.error("Like count update failed:", updateError);
      return;
    }

    setGalleryItems((current) =>
      current.map((photo) =>
        photo.id === photoId
          ? { ...photo, likes: newLikes }
          : photo
      )
    );

    return;
  }

  // Kalau belum like → LIKE
  const { error: insertError } = await supabase
    .from("gallery_likes")
    .insert({
      photo_id: photoId,
      visitor_id: visitorId,
    });

  if (insertError) {
    console.error("Like failed:", insertError);
    return;
  }

  const newLikes = currentLikes + 1;

  setLikedPhotoIds((current) => [...current, photoId]);

  const { error: updateError } = await supabase
    .from("gallery_photos")
    .update({ likes: newLikes })
    .eq("id", photoId);

  if (updateError) {
    console.error("Like count update failed:", updateError);
    return;
  }

  setGalleryItems((current) =>
    current.map((photo) =>
      photo.id === photoId
        ? { ...photo, likes: newLikes }
        : photo
    )
  );
}

async function downloadPhoto() {
  const element = document.getElementById("final-frame");

  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      useCORS: true,
      backgroundColor: null,
      scale: 2,
    });

    const link = document.createElement("a");
    link.download = `${selectedTemplate}-photo.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error("Download failed:", error);
  }
}

  function takePhoto() {
    if (!videoRef.current || countdown !== null) return;

    if (timer === 0) {
      capturePhoto();
      return;
    }

    let current = timer;
    setCountdown(current);

    const interval = setInterval(() => {
      current -= 1;

      if (current <= 0) {
        clearInterval(interval);
        setCountdown(null);
        capturePhoto();
      } else {
        setCountdown(current);
      }
    }, 1000);
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video) return;

  const sourceWidth = video.videoWidth;
const sourceHeight = video.videoHeight;

const sourceRatio = sourceWidth / sourceHeight;

const targetRatio =
  selectedTemplate === "polaroid"
    ? 1
    : selectedTemplate === "4r"
      ? 1083.6 / 650
      : 660.4 / 360;

let cropWidth = sourceWidth;
let cropHeight = sourceHeight;
let cropX = 0;
let cropY = 0;

if (sourceRatio > targetRatio) {
  cropWidth = sourceHeight * targetRatio;
  cropX = (sourceWidth - cropWidth) / 2;
} else {
  cropHeight = sourceWidth / targetRatio;
  cropY = (sourceHeight - cropHeight) / 2;
}

const canvas = document.createElement("canvas");

canvas.width = cropWidth;
canvas.height = cropHeight;

const context = canvas.getContext("2d");

if (!context) return;

context.drawImage(
  video,
  cropX,
  cropY,
  cropWidth,
  cropHeight,
  0,
  0,
  cropWidth,
  cropHeight
);

    const photo = canvas.toDataURL("image/jpeg", 0.9);

    setPhotos((currentPhotos) => {
      const newPhotos = [...currentPhotos, photo];

      if (newPhotos.length >= requiredPhotos) {
        return newPhotos;
      }

      return newPhotos;
    });
  }

useEffect(() => {
  if (!isHydrated) return;

  if (photos.length === requiredPhotos && screen === "camera") {
    setScreen("preview");
  }
}, [photos, isHydrated]);

  // HOME
  if (screen === "home") {
    return (
      <main className="min-h-screen bg-[#f7cfd1] flex justify-center">
        <div
          className="relative min-h-screen w-full max-w-md overflow-hidden"
          style={{
            background:
              "repeating-linear-gradient(90deg, #f7cfd1 0px, #f7cfd1 18px, #fff1f1 18px, #fff1f1 24px, #f7cfd1 24px, #f7cfd1 38px)",
          }}
        >
          <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-8 text-center">
            <p className="mb-6 text-[10px] uppercase tracking-[0.3em] text-[#8b7370]">
              SABTU
              <br />
              05 DISEMBER 2026
            </p>

            <h1 className="text-4xl font-serif italic text-[#8d7770]">
              Nadia
            </h1>

            <p className="my-1 text-sm text-[#9a817b]">&amp;</p>

            <h1 className="text-4xl font-serif italic text-[#8d7770]">
              Safiq
            </h1>

            <div className="my-10">
              <p className="text-xs uppercase tracking-[0.35em] text-[#9a817b]">
                LOVE, CAPTURED
              </p>

              <p className="mt-3 text-sm text-[#8d7770]">
                Setiap momen menjadi kenangan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setScreen("guest")}
              className="rounded-full bg-[#ead34f] px-10 py-3 text-sm font-medium text-[#6f6250] shadow-md transition hover:scale-105 active:scale-95"
            >
              START
            </button>
          </section>
        </div>
      </main>
    );
  }

  // GUEST NAME
  if (screen === "guest") {
    return (
      <main className="min-h-screen bg-[#f7cfd1] flex justify-center">
        <div
          className="relative min-h-screen w-full max-w-md overflow-hidden"
          style={{
            background:
              "repeating-linear-gradient(90deg, #f7cfd1 0px, #f7cfd1 18px, #fff1f1 18px, #fff1f1 24px, #f7cfd1 24px, #f7cfd1 38px)",
          }}
        >
          <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a817b]">
              NADIA X SAFIQ
            </p>

            <h1 className="mt-10 text-3xl font-serif italic text-[#8d7770]">
              Hi, guest!
            </h1>

            <p className="mt-4 text-sm text-[#8d7770]">
              Sebelum mula,
              <br />
              sila isi nama anda
            </p>

            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Nama anda"
              className="mt-8 w-full max-w-xs rounded-full border border-[#c8aaa5] bg-white/70 px-5 py-3 text-center text-sm text-[#6f6250] outline-none placeholder:text-[#b59b96] focus:border-[#9a817b]"
            />

            <button
              type="button"
              disabled={!guestName.trim()}
              onClick={() => setScreen("template")}
              className="mt-5 rounded-full bg-[#ead34f] px-10 py-3 text-sm font-medium text-[#6f6250] shadow-md transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              CONTINUE
            </button>

            <button
              type="button"
              onClick={() => setScreen("home")}
              className="mt-6 text-xs text-[#8d7770] underline underline-offset-4"
            >
              ← Kembali
            </button>
          </section>
        </div>
      </main>
    );
  }

  // TEMPLATE
  if (screen === "template") {
    return (
      <main className="min-h-screen bg-[#f7cfd1] flex justify-center">
        <div
          className="relative min-h-screen w-full max-w-md overflow-hidden"
          style={{
            background:
              "repeating-linear-gradient(90deg, #f7cfd1 0px, #f7cfd1 18px, #fff1f1 18px, #fff1f1 24px, #f7cfd1 24px, #f7cfd1 38px)",
          }}
        >
          <section className="relative z-10 min-h-screen px-6 py-12 text-center">
            <button
              type="button"
              onClick={() => setScreen("guest")}
              className="absolute left-6 top-8 text-xs text-[#8d7770]"
            >
              ← Kembali
            </button>

            <p className="mt-8 text-xs uppercase tracking-[0.3em] text-[#9a817b]">
              {guestName}
            </p>

            <h1 className="mt-5 text-3xl font-serif italic text-[#8d7770]">
              Your Frame
            </h1>

            <p className="mt-2 text-sm text-[#9a817b]">
              Pilih template kegemaran anda
            </p>

            <div className="mt-10 space-y-5">
              {templates.map((template) => {
                const isSelected = selectedTemplate === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-[#8d7770] bg-white/70 shadow-md"
                        : "border-[#d8b7b3] bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    <div className="flex items-center gap-5">
<div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-sm bg-white shadow-sm">
  <img
    src={`/frames/${template.id}-preview.png`}
    alt={`${template.name} preview`}
    className="h-full w-full object-contain"
  />
</div>

                      <div>
                        <h2 className="font-serif text-xl italic text-[#8d7770]">
                          {template.name}
                        </h2>

                        <p className="mt-1 text-xs text-[#9a817b]">
                          {template.description}
                        </p>

                        {isSelected && (
                          <p className="mt-3 text-[10px] font-medium uppercase tracking-widest text-[#8d7770]">
                            ✓ Selected
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!selectedTemplate}
              onClick={() => {
                setPhotos([]);
                setScreen("camera");
              }}
              className="mt-8 rounded-full bg-[#ead34f] px-10 py-3 text-sm font-medium text-[#6f6250] shadow-md transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              USE THIS TEMPLATE
            </button>
          </section>
        </div>
      </main>
    );
  }

  // PREVIEW
  if (screen === "preview") {
    return (
      <main className="min-h-screen bg-[#f7cfd1] flex justify-center">
        <div
          className="relative min-h-screen w-full max-w-md overflow-hidden"
          style={{
            background:
              "repeating-linear-gradient(90deg, #f7cfd1 0px, #f7cfd1 18px, #fff1f1 18px, #fff1f1 24px, #f7cfd1 24px, #f7cfd1 38px)",
          }}
        >
          <section className="relative z-10 min-h-screen px-6 py-12 text-center">
            <h1 className="mt-8 text-3xl font-serif italic text-[#8d7770]">
              Preview
            </h1>

            <p className="mt-2 text-sm text-[#9a817b]">
              {guestName}
            </p>

            <div
  id="final-frame"
  className="mt-8 rounded-2xl bg-white/60 p-4 shadow-md"
>
              <div className="space-y-3">
{selectedTemplate === "polaroid" && photos[0] && (
  <PolaroidFrame photo={photos[0]} />
)}

{selectedTemplate === "4r" && photos.length >= 2 && (
  <FourRFrame photos={photos} />
)}

{selectedTemplate === "2r" && photos.length >= 3 && (
  <TwoRFrame photos={photos} />
)}

{selectedTemplate !== "polaroid" &&
  selectedTemplate !== "4r" &&
  selectedTemplate !== "2r" &&
  photos.map((photo, index) => (
    <img
      key={index}
      src={photo}
      alt={`Photo ${index + 1}`}
      className="w-full rounded-lg"
    />
  ))}
              </div>
            </div>

            <p className="mt-5 text-xs text-[#8d7770]">
              Drag &amp; pinch to adjust the photo
            </p>

            <button
              type="button"
              onClick={() => {
                setPhotos([]);
                setScreen("camera");
              }}
              className="mt-6 rounded-full border border-[#9a817b] bg-white/50 px-6 py-3 text-xs text-[#6f6250]"
            >
              AMBIL SEMULA
            </button>

<button
  type="button"
  onClick={async () => {
  const uploadedUrls = await uploadPhotosToSupabase();

  if (!uploadedUrls) {
    alert("Gambar gagal disimpan. Sila cuba lagi.");
    return;
  }

  setGalleryPhotos((current) => [...current, ...uploadedUrls]);
  setScreen("strip");
}}
  className="mt-3 rounded-full bg-[#ead34f] px-6 py-3 text-xs font-medium text-[#6f6250] shadow-md"
>
  GUNAKAN GAMBAR
</button>

          </section>
        </div>
      </main>
    );
  }

  // YOUR STRIP
if (screen === "strip") {
  return (
    <main className="min-h-screen bg-[#f7cfd1] flex justify-center">
      <div
        className="relative min-h-screen w-full max-w-md overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(90deg, #f7cfd1 0px, #f7cfd1 18px, #fff1f1 18px, #fff1f1 24px, #f7cfd1 24px, #f7cfd1 38px)",
        }}
      >
        <section className="relative z-10 flex min-h-screen flex-col items-center px-6 py-10 text-center">

          <button
            type="button"
            onClick={() => setScreen("home")}
            className="absolute left-6 top-8 text-xs text-[#8d7770]"
          >
            Home
          </button>

          <h1 className="mt-8 text-3xl font-bold text-[#d96f9b]">
            Your Strip!
          </h1>

          <div className="mt-8 w-full max-w-xs">
            {selectedTemplate === "polaroid" && photos[0] && (
              <PolaroidFrame photo={photos[0]} />
            )}

            {selectedTemplate === "4r" && photos.length >= 2 && (
              <FourRFrame photos={photos} />
            )}

            {selectedTemplate === "2r" && photos.length >= 3 && (
              <TwoRFrame photos={photos} />
            )}
          </div>

          <h2 className="mt-6 text-lg font-bold text-[#d96f9b]">
            Terima Kasih!
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-[#8d7770]">
            Gambar anda telah
            <br />
            berjaya disimpan ke galeri.
          </p>

          <button
            type="button"
            onClick={() => setScreen("gallery")}
            className="mt-6 rounded-full bg-[#df9aaa] px-8 py-3 text-sm font-medium text-white shadow-md"
          >
            Lihat Galeri
          </button>

          <button
  type="button"
  onClick={downloadPhoto}
  className="mt-3 rounded-full border border-[#9a817b] bg-white/60 px-8 py-3 text-sm font-medium text-[#6f6250] shadow-md"
>
  Download Photo
</button>

        </section>
      </div>
    </main>
  );
}

// GALLERY
if (screen === "gallery") {
  return (
    <main className="min-h-screen bg-[#f7cfd1] flex justify-center">
      <div
        className="relative min-h-screen w-full max-w-md overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(90deg, #f7cfd1 0px, #f7cfd1 18px, #fff1f1 18px, #fff1f1 24px, #f7cfd1 24px, #f7cfd1 38px)",
        }}
      >
        <section className="relative z-10 min-h-screen px-6 py-10">

          <button
            type="button"
            onClick={() => setScreen("strip")}
            className="text-xs text-[#8d7770]"
          >
            ← Kembali
          </button>

          <div className="mt-8 text-center">
            <h1 className="text-3xl font-serif italic text-[#8d7770]">
              Guest Gallery
            </h1>

            <p className="mt-2 text-sm text-[#9a817b]">
              Semua momen, satu kenangan.
            </p>
            <div className="mt-6 flex justify-center gap-2">
  {[
    { id: "all", label: "Semua" },
    { id: "polaroid", label: "Polaroid" },
    { id: "4r", label: "4R" },
    { id: "2r", label: "2R" },
  ].map((filter) => (
    <button
      key={filter.id}
      type="button"
      onClick={() => setGalleryFilter(filter.id)}
      className={`rounded-full border px-4 py-2 text-xs transition ${
        galleryFilter === filter.id
          ? "border-[#d98aaa] bg-[#d98aaa] text-white"
          : "border-[#d8b7b3] bg-white/70 text-[#8d7770]"
      }`}
    >
      {filter.label}
    </button>
  ))}
</div>
          </div>

          {galleryItems.length === 0 ? (
            <p className="mt-12 text-center text-sm text-[#9a817b]">
              Belum ada gambar.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-3">

{galleryItems
  .filter(
    (photo) =>
      galleryFilter === "all" ||
      photo.template_id === galleryFilter
  )
  .map((photo) => (
<div
  key={photo.id}
  className="overflow-visible bg-transparent p-0"
>
{photo.template_id === "polaroid" && (
  <PolaroidFrame photo={photo.image_url} />
)}

{photo.template_id === "4r" && (
  <FourRFrame photos={[photo.image_url]} />
)}

{photo.template_id === "2r" && (
  <TwoRFrame photos={[photo.image_url]} />
)}

{!photo.template_id && (
  <img
    src={photo.image_url}
    alt={`Gallery photo ${photo.id}`}
    className="h-full w-full rounded-lg object-cover"
  />
)}

<div className="mt-1 flex items-center justify-between bg-white px-2 py-1">
  <div className="flex flex-col text-[9px] leading-tight text-[#8d7770]">
    <span>
      {new Date(photo.created_at).toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>

    <span>
      {new Date(photo.created_at).toLocaleDateString("en-MY", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}
    </span>
  </div>

  <button
    type="button"
    onClick={() => likePhoto(photo.id, photo.likes)}
    className={`rounded-full px-2.5 py-1 text-[10px] transition active:scale-90 ${
      likedPhotoIds.includes(photo.id)
        ? "bg-pink-400 text-white"
        : "bg-pink-200 text-black"
    }`}
  >
    {likedPhotoIds.includes(photo.id) ? "♥" : "♡"} {photo.likes}
  </button>
</div>
  </div>
))}

            </div>
          )}

        </section>
      </div>
    </main>
  );
}

  // CAMERA
  const currentPhoto = photos.length + 1;

  return (
    <main className="min-h-screen bg-[#f7cfd1] flex justify-center">
      <div
        className="relative min-h-screen w-full max-w-md overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(90deg, #f7cfd1 0px, #f7cfd1 18px, #fff1f1 18px, #fff1f1 24px, #f7cfd1 24px, #f7cfd1 38px)",
        }}
      >
        <section className="relative z-10 flex min-h-screen flex-col items-center px-6 py-10 text-center">
          <button
            type="button"
            onClick={() => setScreen("template")}
            className="absolute left-6 top-8 text-xs text-[#8d7770]"
          >
            ← Kembali
          </button>

          <p className="mt-12 text-xs uppercase tracking-[0.3em] text-[#9a817b]">
            {guestName}
          </p>

          <h1 className="mt-5 text-3xl font-serif italic text-[#8d7770]">
            Strike a Pose!
          </h1>

          <p className="mt-2 text-sm text-[#9a817b]">
            {currentPhoto} / {requiredPhotos}
          </p>

          <div className="relative mt-8 w-full max-w-sm overflow-hidden rounded-2xl bg-[#5d5145] shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-auto w-full object-cover"
style={{
  aspectRatio:
    selectedTemplate === "polaroid"
      ? "1 / 1"
      : selectedTemplate === "4r"
        ? "1083.6 / 650"
        : "660.4 / 360",
}}
 />

            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-7xl font-semibold text-white drop-shadow-lg">
                  {countdown}
                </span>
              </div>
            )}
          </div>

          {cameraError && (
            <p className="mt-4 max-w-xs text-xs text-red-700">
              {cameraError}
            </p>
          )}

          <div className="mt-6">
            <p className="mb-3 text-xs text-[#8d7770]">
              Timer
            </p>

            <div className="flex gap-2">
              {[
                { label: "Off", value: 0 },
                { label: "3s", value: 3 },
                { label: "5s", value: 5 },
                { label: "10s", value: 10 },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setTimer(option.value)}
                  className={`rounded-full border px-4 py-2 text-xs transition ${
                    timer === option.value
                      ? "border-[#8d7770] bg-[#ead34f]"
                      : "border-[#c8aaa5] bg-white/60 text-[#8d7770]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

         {/* TOMBOL ROTATE CAMERA */}
          <button
            type="button"
            onClick={toggleCamera}
            className="mt-5 rounded-full border border-[#c8aaa5] bg-white/70 px-5 py-2 text-xs text-[#8d7770] shadow-sm transition active:scale-95"
          >
            ↻ Tukar Kamera
          </button>

          <button
            type="button"
            onClick={takePhoto}
            disabled={countdown !== null || currentPhoto > requiredPhotos}
            className="mt-8 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-transparent shadow-md transition active:scale-90 disabled:opacity-50"
          >
            <span className="h-14 w-14 rounded-full border border-[#8d7770] bg-[#f7cfd1]" />
          </button>

          <p className="mt-4 text-xs text-[#9a817b]">
            {countdown !== null
              ? "Get ready..."
              : `Tap to take photo ${currentPhoto} of 3`}
          </p>
        </section>
      </div>
    </main>
  );
}