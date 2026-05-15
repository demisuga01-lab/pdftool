import { redirect } from "next/navigation";

export default function PdfCompressRedirect() {
  redirect("/compress?type=pdf");
}
