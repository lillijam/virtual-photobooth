"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../utils/supabase";
import html2canvas from "html2canvas-pro";


type Screen = "home" | "guest" | "template" | "camera" | "preview" | "strip" | "gallery" | "gallery-detail";
type PhotoAdjustment = {
  x: number;
  y: number;
  scale: number;
};

const photoAdjustments = new Map<string, PhotoAdjustment>();
function AdjustablePhoto({
  photo,
  isUploaded = false,
  interactive = true,
}: {
  photo: string;
  isUploaded?: boolean;
  interactive?: boolean;
}) {
const savedAdjustment = photoAdjustments.get(photo);

const [position, setPosition] = useState({
  x: savedAdjustment?.x ?? 0,
  y: savedAdjustment?.y ?? 0,
});

const [scale, setScale] = useState(
  savedAdjustment?.scale ?? 1
);
  const [imageRatio, setImageRatio] = useState(1);

  useEffect(() => {
  photoAdjustments.set(photo, {
    x: position.x,
    y: position.y,
    scale,
  });
}, [photo, position.x, position.y, scale]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const dragging = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0 });
  const activePointers = useRef(
  new Map<number, { x: number; y: number }>()
);

const pinchStartDistance = useRef(0);
const pinchStartScale = useRef(1);

  function getImageSize(currentScale: number) {
    const container = containerRef.current;

    if (!container) {
      return {
        width: 0,
        height: 0,
      };
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const containerRatio =
      containerWidth / containerHeight;

    let width: number;
    let height: number;

    if (imageRatio > containerRatio) {
      // Gambar lebih lebar → tinggi ikut frame
      height = containerHeight;
      width = height * imageRatio;
    } else {
      // Gambar lebih tinggi → lebar ikut frame
      width = containerWidth;
      height = width / imageRatio;
    }

    return {
      width: width * currentScale,
      height: height * currentScale,
    };
  }

  function clampPosition(
    x: number,
    y: number,
    currentScale: number
  ) {
    const container = containerRef.current;

    if (!container) {
      return { x, y };
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const imageSize = getImageSize(currentScale);

    const maxX = Math.max(
      0,
      (imageSize.width - containerWidth) / 2
    );

    const maxY = Math.max(
      0,
      (imageSize.height - containerHeight) / 2
    );

    return {
      x: Math.max(
        -maxX,
        Math.min(maxX, x)
      ),
      y: Math.max(
        -maxY,
        Math.min(maxY, y)
      ),
    };
  }

function handlePointerDown(
  e: React.PointerEvent<HTMLDivElement>
) {
  activePointers.current.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
  });

  e.currentTarget.setPointerCapture(
    e.pointerId
  );

  if (activePointers.current.size === 2) {
    dragging.current = false;

    const points = Array.from(
      activePointers.current.values()
    );

    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;

    pinchStartDistance.current =
      Math.hypot(dx, dy);

    pinchStartScale.current = scale;

    return;
  }

  if (activePointers.current.size === 1) {
    dragging.current = true;

    startPoint.current = {
      x: e.clientX,
      y: e.clientY,
    };

    startPosition.current = {
      x: position.x,
      y: position.y,
    };
  }
}

function handlePointerMove(
  e: React.PointerEvent<HTMLDivElement>
) {
  if (!activePointers.current.has(e.pointerId)) {
    return;
  }

  activePointers.current.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
  });

  // PINCH — dua jari
  if (activePointers.current.size === 2) {
    const points = Array.from(
      activePointers.current.values()
    );

    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;

    const distance = Math.hypot(dx, dy);

    if (pinchStartDistance.current > 0) {
      const nextScale = Math.min(
        3,
        Math.max(
          1,
          pinchStartScale.current *
            (distance /
              pinchStartDistance.current)
        )
      );

      setScale(nextScale);

      setPosition((currentPosition) =>
        clampPosition(
          currentPosition.x,
          currentPosition.y,
          nextScale
        )
      );
    }

    return;
  }

  // DRAG — satu jari
  if (!dragging.current) return;

  const newX =
    startPosition.current.x +
    (e.clientX - startPoint.current.x);

  const newY =
    startPosition.current.y +
    (e.clientY - startPoint.current.y);

  setPosition(
    clampPosition(
      newX,
      newY,
      scale
    )
  );
}

function handlePointerUp(
  e: React.PointerEvent<HTMLDivElement>
) {
  activePointers.current.delete(
    e.pointerId
  );

  if (activePointers.current.size < 2) {
    pinchStartDistance.current = 0;
  }

  dragging.current =
    activePointers.current.size === 1;

  try {
    e.currentTarget.releasePointerCapture(
      e.pointerId
    );
  } catch {}
}

  function handleWheel(
    e: React.WheelEvent<HTMLDivElement>
  ) {
    e.preventDefault();

    setScale((current) => {
      const next = Math.min(
        3,
        Math.max(
          1,
          current - e.deltaY * 0.001
        )
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
  className={`relative h-full w-full overflow-hidden ${
    interactive ? "touch-none" : ""
  }`}
  style={{
    touchAction: interactive ? "none" : "auto",
  }}
  onPointerDown={interactive ? handlePointerDown : undefined}
  onPointerMove={interactive ? handlePointerMove : undefined}
  onPointerUp={interactive ? handlePointerUp : undefined}
  onPointerCancel={interactive ? handlePointerUp : undefined}
  onWheel={interactive ? handleWheel : undefined}
>
      <img
        src={photo}
        alt="Photo"
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;

          if (
            img.naturalWidth > 0 &&
            img.naturalHeight > 0
          ) {
            setImageRatio(
              img.naturalWidth /
                img.naturalHeight
            );
          }
        }}
        className="absolute left-1/2 top-1/2 max-w-none select-none"
        style={{
          width:
            imageRatio >
            (containerRef.current
              ? containerRef.current.clientWidth /
                containerRef.current.clientHeight
              : 1)
              ? "auto"
              : "100%",

          height:
            imageRatio >
            (containerRef.current
              ? containerRef.current.clientWidth /
                containerRef.current.clientHeight
              : 1)
              ? "100%"
              : "auto",

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

function PolaroidFrame({
  photo,
  isUploaded = false,
  interactive = true,
}: {
  photo: string;
  isUploaded?: boolean;
  interactive?: boolean;
}) {
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
<AdjustablePhoto
  photo={photo}
  isUploaded={isUploaded}
  interactive={interactive}
/>
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

function FourRFrame({
  photos,
  uploadedPhotoIndexes = [],
  interactive = true,
}: {
  photos: string[];
  uploadedPhotoIndexes?: number[];
  interactive?: boolean;
}) {
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
<AdjustablePhoto
  photo={photos[0]}
  isUploaded={uploadedPhotoIndexes.includes(0)}
  interactive={interactive}
/>
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
<AdjustablePhoto
  photo={photos[1]}
  isUploaded={uploadedPhotoIndexes.includes(1)}
  interactive={interactive}
/>
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
function TwoRFrame({
  photos,
  interactive = true,
}: {
  photos: string[];
  interactive?: boolean;
}) {
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
<AdjustablePhoto
  photo={photos[0]}
  interactive={interactive}
/>
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
<AdjustablePhoto
  photo={photos[1]}
  interactive={interactive}
/>
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
<AdjustablePhoto
  photo={photos[2]}
  interactive={interactive}
/>
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
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
const [photos, setPhotos] = useState<string[]>([]);
const [finalFrameImage, setFinalFrameImage] = useState<string | null>(null);
const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
const [finalImage, setFinalImage] = useState<string | null>(null);
const [uploadedPhotoIndexes, setUploadedPhotoIndexes] = useState<number[]>([]);

type GalleryItem = {
  id: number;
  image_url: string;
  guest_name: string | null;
  likes: number;
  template_id: string | null;
  strip_id: string | null;
  created_at: string;
  stripPhotos?: GalleryItem[];
};

type GalleryDetail = GalleryItem & {
  stripPhotos: GalleryItem[];
};

const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
const [isGalleryLoading, setIsGalleryLoading] = useState(false);
const [galleryError, setGalleryError] = useState(false);
const [visitorId, setVisitorId] = useState("");
const [likedPhotoIds, setLikedPhotoIds] = useState<number[]>([]);

const shareFileCache = useRef<Record<string, File | null>>({});
const [galleryFilter, setGalleryFilter] = useState("all");

const [selectedGalleryPhoto, setSelectedGalleryPhoto] =
  useState<GalleryDetail | null>(null);

const [detailShareReady, setDetailShareReady] = useState(false);

useEffect(() => {
  let mounted = true;

  async function initAnonymousUser() {
    // Cuba guna session anonymous yang sedia ada
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Auth session failed:", sessionError);
    }

if (session?.user) {
  console.log("Existing anonymous user:", session.user.id);

  if (mounted) {
    setVisitorId(session.user.id);
  }

  return;
}

    // Tiada session → cipta anonymous user baru
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.error("Anonymous sign-in failed:", error);
      return;
    }

if (mounted && data.user) {
  console.log("Anonymous user created:", data.user.id);
  setVisitorId(data.user.id);
}
  }

  initAnonymousUser();

  return () => {
    mounted = false;
  };
}, []);

useEffect(() => {
  if (screen !== "gallery-detail" || !selectedGalleryPhoto) {
    setDetailShareReady(false);
    return;
  }

  setDetailShareReady(false);

  const timer = setTimeout(async () => {
    await prepareSharePhoto("gallery-detail-photo");
    setDetailShareReady(true);
  }, 300);

  return () => clearTimeout(timer);
}, [screen, selectedGalleryPhoto]);
  
useEffect(() => {
  const savedScreen = sessionStorage.getItem("memoria-screen");
  const savedTemplate = sessionStorage.getItem("memoria-template");
  const savedGuestName = sessionStorage.getItem("memoria-guest-name");

  if (savedScreen) {
    setScreen(savedScreen as Screen);
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
  if (screen !== "gallery" || !visitorId) return;

  setIsGalleryLoading(true);
  setGalleryError(false);

  loadGalleryFromSupabase()
    .then((items) => {
      setGalleryItems(items);
    })
    .catch((error) => {
      console.error("Gallery loading failed:", error);
      setGalleryError(true);
    })
    .finally(() => {
      setIsGalleryLoading(false);
    });

      // 2. Load gallery likes
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
}, [screen, visitorId]);

  const [cameraError, setCameraError] = useState("");
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

async function handleGalleryUpload(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const files = Array.from(event.target.files ?? []);

  if (files.length === 0) return;

  const remainingSlots = requiredPhotos - photos.length;
  const selectedFiles = files.slice(0, remainingSlots);

  const startIndex = photos.length;

  const imageUrls = await Promise.all(
    selectedFiles.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            resolve(reader.result as string);
          };

          reader.onerror = reject;

          reader.readAsDataURL(file);
        })
    )
  );

  setPhotos((current) => [
    ...current,
    ...imageUrls,
  ]);

  setUploadedPhotoIndexes((current) => [
    ...current,
    ...imageUrls.map(
      (_, index) => startIndex + index
    ),
  ]);

  event.target.value = "";
}

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
    width: {
      ideal: 1920,
    },
    height: {
      ideal: 1080,
    },
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
  try {
    const element = document.getElementById("final-frame-content");

    if (!element) {
      console.error("Final frame not found");
      return null;
    }

    // Jadikan seluruh frame + semua gambar sebagai SATU gambar
    const canvas = await html2canvas(element, {
      useCORS: true,
      backgroundColor: null,
      scale: 4,
    });

const pngBlob = await new Promise<Blob | null>((resolve) =>
  canvas.toBlob(resolve, "image/png")
);

if (!pngBlob) {
  console.error("Failed to create PNG blob");
  return null;
}

const compressedBlob = await new Promise<Blob | null>((resolve) =>
  canvas.toBlob(resolve, "image/webp", 0.88)
);

if (!compressedBlob) {
  console.error("Failed to create WebP blob");
  return null;
}

const finalDataUrl = await new Promise<string>((resolve, reject) => {
  const reader = new FileReader();

  reader.onloadend = () => {
    resolve(reader.result as string);
  };

  reader.onerror = reject;

  reader.readAsDataURL(pngBlob);
});

setFinalImage(finalDataUrl);

const fileName = `photo-${Date.now()}.webp`;

    // Upload SATU gambar sahaja
const { error } = await supabase.storage
  .from("memoria-gallery")
  .upload(fileName, compressedBlob, {
    contentType: "image/webp",
    upsert: false,
  });

    if (error) {
      console.error("Upload failed:", error);
      return null;
    }

    const { data } = supabase.storage
      .from("memoria-gallery")
      .getPublicUrl(fileName);

    const uploadedUrl = data.publicUrl;

    // Simpan SATU row sahaja ke database
    const galleryRow = {
      image_url: uploadedUrl,
      guest_name: guestName,
      likes: 0,
      template_id: selectedTemplate,
      strip_id: null,
    };

    const { error: databaseError } = await supabase
      .from("gallery_photos")
      .insert(galleryRow);

if (databaseError) {
  console.error("Database insert failed:", databaseError);

  await supabase.storage
    .from("memoria-gallery")
    .remove([fileName]);

  return null;
}

   return {
  uploadedUrl,
  finalDataUrl,
  blob: pngBlob,
};
  } catch (error) {
    console.error("Upload failed:", error);
    return null;
  }
}

async function loadGalleryFromSupabase(): Promise<GalleryItem[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select(
      "id, image_url, guest_name, likes, template_id, strip_id, created_at"
    )
    .order("created_at", { ascending: false });

if (error) {
  console.error("Gallery loading failed:", error);
  return [];
}

  const rows = data ?? [];

  const grouped = new Map<string, GalleryItem>();

  for (const item of rows) {
    // Gambar lama yang tiada strip_id
    // kekal sebagai gambar individu
    if (!item.strip_id) {
      grouped.set(`photo-${item.id}`, {
        ...item,
        stripPhotos: [item],
      });
      continue;
    }

    const existing = grouped.get(`strip-${item.strip_id}`);
if (existing) {
  existing.stripPhotos = [
    item,
    ...(existing.stripPhotos ?? []),
  ];
} else {
      grouped.set(`strip-${item.strip_id}`, {
        ...item,
        stripPhotos: [item],
      });
    }
  }

for (const item of grouped.values()) {
  if (item.stripPhotos && item.stripPhotos.length > 1) {
    item.stripPhotos.sort((a, b) => a.id - b.id);
  }
}

  return Array.from(grouped.values());
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

  const wasLiked = !!existingLike;

  // Database function akan:
  // LIKE / UNLIKE
  // kira jumlah Like sebenar
  // update gallery_photos.likes
  const { data: newLikes, error: toggleError } = await supabase.rpc(
    "toggle_gallery_like",
    {
      p_photo_id: photoId,
    }
  );

  if (toggleError) {
    console.error("Like toggle failed:", toggleError);
    return;
  }

  const totalLikes = Number(newLikes ?? 0);

  // Update status Like visitor ini
  setLikedPhotoIds((current) =>
    wasLiked
      ? current.filter((id) => id !== photoId)
      : [...current, photoId]
  );

  // Update jumlah Like di Gallery
  setGalleryItems((current) =>
    current.map((photo) =>
      photo.id === photoId
        ? { ...photo, likes: totalLikes }
        : photo
    )
  );

  // Update jumlah Like di Gallery Detail
  setSelectedGalleryPhoto((current) =>
    current && current.id === photoId
      ? { ...current, likes: totalLikes }
      : current
  );
}

async function downloadPhoto() {
  if (isDownloading) return;

  const element = document.getElementById("final-frame");

  if (!element) return;

  setIsDownloading(true);

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
    alert("Gambar tidak dapat dimuat turun. Sila cuba lagi.");
  } finally {
    setIsDownloading(false);
  }
}

async function prepareSharePhoto(elementId: string) {
  const element = document.getElementById(elementId);

  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      useCORS: true,
      backgroundColor: null,
      scale: 2,
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    if (!blob) return;

    shareFileCache.current[elementId] = new File(
      [blob],
      "memoria-photo.png",
      {
        type: "image/png",
      }
    );
  } catch (error) {
    console.error("Prepare share image failed:", error);
  }
}

async function sharePhoto(elementId: string) {
  const file = shareFileCache.current[elementId];

  if (!file) {
    alert("Gambar sedang disediakan. Cuba tekan Share sekali lagi.");
    return;
  }

  try {
    const isMobileDevice =
      /Android|iPhone|iPad|iPod|Windows Phone/i.test(
        navigator.userAgent
      );

    // PHONE / TABLET
    if (
      isMobileDevice &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: "Memoria",
        text: "A moment by Memoria",
        files: [file],
      });

      return;
    }

    // LAPTOP / DESKTOP
    const url = URL.createObjectURL(file);

    const link = document.createElement("a");
    link.href = url;
    link.download = "memoria-photo.png";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.log("Share cancelled:", error);
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
          <section className="relative z-10 flex h-[100dvh] flex-col items-center overflow-hidden px-5 pb-4 pt-5 text-center sm:px-6 sm:py-10">
            <button
              type="button"
              onClick={() => setScreen("guest")}
              className="absolute left-6 top-8 text-xs text-[#8d7770]"
            >
              ← Kembali
            </button>

            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-[#9a817b]">
              {guestName}
            </p>

            <h1 className="mt-3 text-3xl font-serif italic text-[#8d7770]">
              Your Frame
            </h1>

            <p className="mt-2 text-sm text-[#9a817b]">
              Pilih template kegemaran anda
            </p>

            <div className="mt-5 w-full space-y-3">
              {templates.map((template) => {
                const isSelected = selectedTemplate === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      isSelected
                        ? "border-[#8d7770] bg-white/70 shadow-md"
                        : "border-[#d8b7b3] bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    <div className="flex items-center gap-5">
<div className="relative h-24 w-[68px] shrink-0 overflow-hidden rounded-sm bg-white shadow-sm">
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
              className="mt-4 rounded-full bg-[#ead34f] px-10 py-3 text-sm font-medium text-[#6f6250] shadow-md transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
      <main className="h-[100dvh] overflow-hidden bg-[#f7cfd1] flex justify-center">
        <div
          className="relative min-h-[100dvh] w-full max-w-md overflow-hidden"
          style={{
            background:
              "repeating-linear-gradient(90deg, #f7cfd1 0px, #f7cfd1 18px, #fff1f1 18px, #fff1f1 24px, #f7cfd1 24px, #f7cfd1 38px)",
          }}
        >
          <section className="relative z-10 flex h-[100dvh] flex-col items-center overflow-hidden px-5 pt-4 text-center sm:px-6 sm:pt-8">
            <h1 className="mt-2 text-3xl font-serif italic text-[#8d7770]">
              Preview
            </h1>

            <p className="mt-2 text-sm text-[#9a817b]">
              {guestName}
            </p>

<div
  id="final-frame"
  className="mt-4 w-full max-w-md rounded-2xl bg-white/60 p-3 shadow-md sm:mt-8 sm:p-4"
>
  <div
    id="final-frame-content"
    className="space-y-3"
  >
{selectedTemplate === "polaroid" && photos[0] && (
  <PolaroidFrame photo={photos[0]} />
)}

{selectedTemplate === "4r" && photos.length >= 2 && (
  <FourRFrame
    photos={photos}
    uploadedPhotoIndexes={uploadedPhotoIndexes}
  />
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

            <p className="mt-3 text-xs text-[#8d7770]">
              Drag &amp; pinch to adjust the photo
            </p>

<button
  type="button"
  onClick={() => {
    setPhotos([]);
    setScreen("camera");
  }}
  className="mt-3 transition active:scale-95"
>
  <img
    src="/icons/Ambil%20Semula.svg"
    alt="Ambil semula"
    className="w-34"
  />
</button>

<button
  type="button"
  disabled={isSavingPhoto}
onClick={async () => {
  if (isSavingPhoto) return;

  setIsSavingPhoto(true);

  try {
    const result = await uploadPhotosToSupabase();

    if (!result) {
      alert("Gambar gagal disimpan. Sila cuba lagi.");
      return;
    }

    setFinalFrameImage(result.finalDataUrl);

    shareFileCache.current["final-frame"] = new File(
      [result.blob],
      "memoria-photo.png",
      {
        type: "image/png",
      }
    );

    setGalleryPhotos((current) => [
      ...current,
      result.uploadedUrl,
    ]);

    setScreen("strip");
  } catch (error) {
    console.error("Save photo failed:", error);
    alert("Gambar gagal disimpan. Sila cuba lagi.");
  } finally {
    setIsSavingPhoto(false);
  }
}}
  className={`mt-3 transition active:scale-95 ${
    isSavingPhoto ? "pointer-events-none opacity-60" : ""
  }`}
>
  {isSavingPhoto ? (
    <div className="flex w-40 items-center justify-center gap-2 rounded-full bg-white/70 px-5 py-3 text-sm text-[#8d7770]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d98aaa] border-t-transparent" />
      Menyimpan...
    </div>
  ) : (
    <img
      src="/icons/Gunakan%20Gambar.svg"
      alt="Gunakan gambar"
      className="w-40"
    />
  )}
</button>

          </section>
        </div>
      </main>
    );
  }

// YOUR STRIP
if (screen === "strip") {
  return (
    <main className="h-[100dvh] overflow-hidden bg-[#f7cfd1] flex justify-center">
      <div
        className="relative h-[100dvh] w-full max-w-md overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(90deg, #f7cfd1 0px, #f7cfd1 18px, #fff1f1 18px, #fff1f1 24px, #f7cfd1 24px, #f7cfd1 38px)",
        }}
      >
        <section className="relative z-10 flex min-h-screen flex-col items-center px-6 pb-10 pt-8 text-center">

          {/* TOP BAR */}
          <div className="flex w-full items-center justify-between">
            <button
              type="button"
              onClick={() => setScreen("home")}
              className="rounded-full px-3 py-2 text-xs text-[#8d7770] transition active:scale-90"
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => sharePhoto("final-frame")}
              className="rounded-full p-2 transition active:scale-90"
            >
              <img
                src="/icons/Share.svg"
                alt="Share"
                className="h-8 w-8"
              />
            </button>
          </div>

          {/* TITLE */}
          <h1 className="mt-5 text-3xl font-bold text-[#d96f9b]">
            Your Strip!
          </h1>

          {/* FINAL IMAGE */}
          <div
            id="final-frame"
            className="mt-6 w-full max-w-xs overflow-hidden rounded-lg shadow-md"
          >
            {finalFrameImage && (
              <img
                src={finalFrameImage}
                alt="Your Strip"
                className="block h-auto w-full"
                draggable={false}
              />
            )}
          </div>

          {/* MESSAGE */}
          <h2 className="mt-6 text-lg font-bold text-[#d96f9b]">
            Terima Kasih!
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-[#8d7770]">
            Gambar anda telah
            <br />
            berjaya disimpan ke galeri.
          </p>

          {/* GALLERY */}
          <button
            type="button"
            onClick={() => setScreen("gallery")}
            className="mt-5 transition active:scale-95"
          >
            <img
              src="/icons/Lihat%20Galeri.svg"
              alt="Lihat Galeri"
              className="w-40"
            />
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

{isGalleryLoading ? (
  <div className="mt-16 flex flex-col items-center justify-center text-center">
    <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#d98aaa] border-t-transparent" />

    <p className="mt-4 text-sm text-[#9a817b]">
      Memuatkan galeri...
    </p>
  </div>
) : galleryError ? (
  <div className="mt-16 flex flex-col items-center justify-center text-center">
    <p className="text-sm text-[#8d7770]">
      Galeri tidak dapat dimuatkan.
    </p>

    <button
      type="button"
      onClick={() => setScreen("gallery")}
      className="mt-4 rounded-full bg-[#d98aaa] px-5 py-2 text-xs text-white transition active:scale-95"
    >
      Cuba Lagi
    </button>
  </div>
) : galleryItems.length === 0 ? (
  <div className="mt-16 flex flex-col items-center text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/70 shadow-sm">
      <span className="text-2xl text-[#d98aaa]">♡</span>
    </div>

    <p className="mt-5 text-sm font-medium text-[#8d7770]">
      Belum ada gambar
    </p>

    <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-[#a78d88]">
      Momen anda akan muncul di sini selepas gambar pertama disimpan.
    </p>
  </div>
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
          onClick={() => {
            setSelectedGalleryPhoto({
              ...photo,
              stripPhotos: photo.stripPhotos ?? [photo],
            });
            setScreen("gallery-detail");
          }}
          className="cursor-pointer overflow-visible bg-transparent p-0 transition active:scale-[0.98]"
        >
          <img
            src={photo.image_url}
            alt={`Gallery photo ${photo.id}`}
            loading="lazy"
            className="h-auto w-full object-contain"
            draggable={false}
          />

<div className="mt-1 flex items-center justify-between rounded-b-lg bg-white/90 px-2.5 py-2">
  <div className="flex flex-col text-left leading-tight text-[#8d7770]">
    <span className="text-[10px] font-medium">
      {new Date(photo.created_at).toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>

    <span className="mt-0.5 text-[9px] text-[#b19a95]">
      {new Date(photo.created_at).toLocaleDateString("en-MY", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}
    </span>
  </div>

  <button
    type="button"
    aria-label={
      likedPhotoIds.includes(photo.id)
        ? "Unlike photo"
        : "Like photo"
    }
    onClick={(e) => {
      e.stopPropagation();
      likePhoto(photo.id, photo.likes);
    }}
    className={`flex min-w-[52px] items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition active:scale-90 ${
      likedPhotoIds.includes(photo.id)
        ? "bg-pink-400 text-white shadow-sm"
        : "bg-pink-100 text-[#8d7770]"
    }`}
  >
    <span className="text-sm leading-none">
      {likedPhotoIds.includes(photo.id) ? "♥" : "♡"}
    </span>

    <span>{photo.likes}</span>
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

// GALLERY DETAIL
if (screen === "gallery-detail" && selectedGalleryPhoto) {
  const photo = selectedGalleryPhoto;

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

          {/* TOP BAR */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setScreen("gallery")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#8d7770] bg-white/70 shadow-sm transition active:scale-90"
            >
              <img
                src="/icons/Back.svg"
                alt="Kembali"
                className="h-5 w-5"
              />
            </button>

<button
  type="button"
  disabled={!detailShareReady}
  onClick={() => sharePhoto("gallery-detail-photo")}
  className={`transition active:scale-90 ${
    !detailShareReady
      ? "pointer-events-none opacity-40"
      : ""
  }`}
>
  <img
    src="/icons/Share.svg"
    alt="Share"
    className="h-8 w-8"
  />
</button>
          </div>

{/* PHOTO */}
<div
  id="gallery-detail-photo"
  className="mt-8 overflow-hidden rounded-2xl bg-white/30 shadow-md"
>
  <img
    src={photo.image_url}
    alt="Gallery photo"
    loading="lazy"
    className="block h-auto w-full object-contain"
    draggable={false}
  />
</div>

{/* INFO */}
<div className="mt-4 flex items-center justify-between gap-4">
  <div className="min-w-0 text-left text-xs leading-relaxed text-[#8d7770]">
    <p>
      {new Date(photo.created_at).toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
      })}
      {" · "}
      {new Date(photo.created_at).toLocaleDateString("en-MY", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}
    </p>

    <p className="mt-1 truncate text-[#b19a95]">
      A moment by {photo.guest_name ?? "Guest"}
    </p>
  </div>

{/* LIKE */}
<button
  type="button"
  aria-label={
    likedPhotoIds.includes(photo.id)
      ? "Unlike photo"
      : "Like photo"
  }
  onClick={() => likePhoto(photo.id, photo.likes)}
  className={`flex min-w-[58px] items-center justify-center gap-1 rounded-full px-3 py-2 text-xs font-medium shadow-sm transition active:scale-90 ${
    likedPhotoIds.includes(photo.id)
      ? "bg-pink-400 text-white"
      : "bg-white/90 text-[#8d7770]"
  }`}
>
  <span className="text-sm leading-none">
    {likedPhotoIds.includes(photo.id) ? "♥" : "♡"}
  </span>

  <span>{photo.likes}</span>
</button>
          </div>
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
        <section className="relative z-10 flex min-h-screen flex-col items-center px-5 pb-6 pt-6 text-center sm:px-6 sm:py-10">
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

          <div className="relative mt-5 w-full max-w-sm overflow-hidden rounded-2xl bg-[#5d5145] shadow-lg sm:mt-8">
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

          <div className="mt-4 sm:mt-6">
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

<input
  ref={galleryInputRef}
  type="file"
  accept="image/*"
  multiple
  hidden
  onChange={handleGalleryUpload}
/>

{/* CAMERA CONTROLS */}
<div className="mt-8 flex w-full items-center justify-center gap-10">

  {/* ROTATE CAMERA */}
  <button
    type="button"
    onClick={toggleCamera}
    className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-md transition active:scale-90"
  >
    <img
      src="/icons/Rotate%20Camera.svg"
      alt="Tukar kamera"
      className="h-8 w-8"
    />
  </button>

  {/* TAKE PHOTO */}
  <button
    type="button"
    onClick={takePhoto}
    disabled={countdown !== null || currentPhoto > requiredPhotos}
    className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-transparent shadow-md transition active:scale-90 disabled:opacity-50"
  >
    <span className="h-14 w-14 rounded-full border border-[#8d7770] bg-[#f7cfd1]" />
  </button>

{/* UPLOAD */}
<button
  type="button"
  onClick={() => galleryInputRef.current?.click()}
  className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-md transition active:scale-90"
>
  <img
    src="/icons/Upload.svg"
    alt="Upload gambar"
    className="h-8 w-8"
  />
</button>

</div>

<p className="mt-4 text-xs text-[#9a817b]">
  {countdown !== null
    ? "Get ready..."
    : `Tap to take photo ${currentPhoto} of ${requiredPhotos}`}
</p>
        </section>
      </div>
    </main>
  );
}