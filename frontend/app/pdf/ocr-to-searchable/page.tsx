import { redirect } from "next/navigation";

export default function SearchableOcrRedirect() {
  redirect("/tools/ocr?input=pdf&output=searchable_pdf");
}
