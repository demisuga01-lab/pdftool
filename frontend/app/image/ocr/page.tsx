import { redirect } from "next/navigation";

export default function ImageOcrRedirect() {
  redirect("/tools/ocr?input=image");
}
