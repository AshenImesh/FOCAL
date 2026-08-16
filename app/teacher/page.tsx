import { redirect } from "next/navigation";
import { getTeacherFromCookie } from "@/lib/actions";
import TeacherLogin from "@/components/TeacherLogin";
import TeacherPanel from "@/components/TeacherPanel";

export default async function TeacherPage() {
  const teacher = await getTeacherFromCookie();
  if (!teacher) return <TeacherLogin />;
  return <TeacherPanel teacher={teacher} />;
}
