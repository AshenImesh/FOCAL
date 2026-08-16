"use client";

export default function TeacherPhoto() {
  return (
    // Replace /teacher.png with your photo (transparent background works best).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/teacher.png"
      alt="Your science teacher"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = "/teacher.svg";
      }}
    />
  );
}
